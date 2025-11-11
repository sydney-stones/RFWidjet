import express, { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'
import { getCurrentUsage } from '../services/billing.js'
import { badRequest } from '../middleware/errorHandler.js'
import { validateRequired } from '../utils/validation.js'
import { getCache, setCache, getCacheKey, invalidateMerchantCache } from '../utils/cache.js'
import type {
  AnalyticsOverview,
  ProductPerformance,
  TimelineDataPoint,
  TimeRange,
  TimeRangeDates
} from '../types/analytics.js'

const router = express.Router()

/**
 * Parse time range parameter
 */
function getTimeRangeDates(range: TimeRange = '30d'): TimeRangeDates {
  const end = new Date()
  let start = new Date()
  let label = ''

  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7)
      label = 'Last 7 days'
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      label = 'Last 30 days'
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      label = 'Last 90 days'
      break
    case 'all':
      start = new Date(2020, 0, 1) // Far past date
      label = 'All time'
      break
    default:
      start.setDate(end.getDate() - 30)
      label = 'Last 30 days'
  }

  return { start, end, label }
}

/**
 * GET /api/v1/analytics/overview
 * Merchant's overall analytics overview
 */
router.get('/overview', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchantId!
    const cacheKey = getCacheKey(merchantId, 'overview')

    // Check cache
    const cached = getCache<AnalyticsOverview>(cacheKey)
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel
    const [
      totalTryons,
      conversionData,
      topProductsData,
      usageThisMonth,
      revenueData
    ] = await Promise.all([
      // Total try-ons
      prisma.tryOn.count({
        where: { merchantId }
      }),

      // Conversion stats
      prisma.tryOn.aggregate({
        where: { merchantId },
        _count: { id: true },
        _sum: {
          converted: true,
          purchaseAmount: true
        }
      }),

      // Top 5 products by try-on count
      prisma.product.findMany({
        where: {
          merchantId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          category: true,
          _count: {
            select: { tryOns: true }
          },
          tryOns: {
            select: {
              converted: true,
              purchaseAmount: true
            }
          }
        },
        orderBy: {
          tryOns: { _count: 'desc' }
        },
        take: 5
      }),

      // Usage this month
      getCurrentUsage(merchantId),

      // Revenue stats
      prisma.tryOn.aggregate({
        where: {
          merchantId,
          converted: true,
          purchaseAmount: { not: null }
        },
        _sum: { purchaseAmount: true },
        _avg: { purchaseAmount: true },
        _max: { purchaseAmount: true }
      })
    ])

    // Calculate conversion rate
    const conversionRate = conversionData._count.id > 0
      ? ((conversionData._sum.converted || 0) / conversionData._count.id) * 100
      : 0

    // Process top products
    const topProducts = topProductsData.map(product => {
      const conversions = product.tryOns.filter(t => t.converted).length
      const revenue = product.tryOns.reduce((sum, t) => sum + Number(t.purchaseAmount || 0), 0)
      const productConversionRate = product._count.tryOns > 0
        ? (conversions / product._count.tryOns) * 100
        : 0

      return {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        tryonCount: product._count.tryOns,
        conversionCount: conversions,
        conversionRate: Math.round(productConversionRate * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        category: product.category
      }
    })

    const overview: AnalyticsOverview = {
      totalTryons,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topProducts,
      usageThisMonth: {
        used: usageThisMonth.used,
        limit: usageThisMonth.limit,
        remaining: usageThisMonth.remaining,
        percentage: Math.round(usageThisMonth.percentage * 100) / 100,
        overageCount: usageThisMonth.overage,
        overageCharges: usageThisMonth.overageCharges
      },
      revenue: {
        total: Math.round(Number(revenueData._sum.purchaseAmount || 0) * 100) / 100,
        average: Math.round(Number(revenueData._avg.purchaseAmount || 0) * 100) / 100,
        highest: Math.round(Number(revenueData._max.purchaseAmount || 0) * 100) / 100,
        currency: 'USD'
      },
      timeRange: {
        start: firstDayOfMonth.toISOString(),
        end: now.toISOString()
      }
    }

    // Cache for 5 minutes
    setCache(cacheKey, overview, 300)

    res.json({
      success: true,
      data: overview,
      cached: false
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/analytics/products
 * Per-product performance analytics
 */
router.get('/products', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchantId!
    const { limit = '20', sortBy = 'tryonCount' } = req.query

    const cacheKey = getCacheKey(merchantId, 'products', { limit, sortBy })
    const cached = getCache<ProductPerformance[]>(cacheKey)

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    // Fetch products with try-on data
    const products = await prisma.product.findMany({
      where: {
        merchantId,
        isActive: true
      },
      include: {
        _count: {
          select: { tryOns: true }
        },
        tryOns: {
          select: {
            converted: true,
            purchaseAmount: true,
            userRating: true,
            generatedAt: true
          },
          orderBy: { generatedAt: 'desc' },
          take: 1
        }
      },
      take: parseInt(limit as string, 10)
    })

    // Process and format data
    const performance: ProductPerformance[] = products.map(product => {
      const tryOns = product.tryOns
      const conversions = tryOns.filter(t => t.converted).length
      const revenue = tryOns.reduce((sum, t) => sum + Number(t.purchaseAmount || 0), 0)
      const ratings = tryOns.filter(t => t.userRating !== null).map(t => t.userRating!)
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null

      return {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: Number(product.price),
        category: product.category,
        tryonCount: product._count.tryOns,
        conversionCount: conversions,
        conversionRate: product._count.tryOns > 0
          ? Math.round((conversions / product._count.tryOns) * 10000) / 100
          : 0,
        revenue: Math.round(revenue * 100) / 100,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        lastTryonAt: tryOns.length > 0 ? tryOns[0].generatedAt.toISOString() : null
      }
    })

    // Sort based on parameter
    const sorted = performance.sort((a, b) => {
      switch (sortBy) {
        case 'conversionRate':
          return b.conversionRate - a.conversionRate
        case 'revenue':
          return b.revenue - a.revenue
        case 'tryonCount':
        default:
          return b.tryonCount - a.tryonCount
      }
    })

    setCache(cacheKey, sorted, 300)

    res.json({
      success: true,
      data: sorted,
      cached: false
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/analytics/timeline
 * Try-ons over time with daily breakdown
 */
router.get('/timeline', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchantId!
    const range = (req.query.range as TimeRange) || '30d'

    const cacheKey = getCacheKey(merchantId, 'timeline', { range })
    const cached = getCache<TimelineDataPoint[]>(cacheKey)

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        range,
        cached: true
      })
    }

    const { start, end } = getTimeRangeDates(range)

    // Fetch try-ons in date range
    const tryOns = await prisma.tryOn.findMany({
      where: {
        merchantId,
        generatedAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        generatedAt: true,
        converted: true,
        purchaseAmount: true
      },
      orderBy: { generatedAt: 'asc' }
    })

    // Group by date
    const timelineMap = new Map<string, TimelineDataPoint>()

    tryOns.forEach(tryOn => {
      const date = tryOn.generatedAt.toISOString().split('T')[0]

      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          tryonCount: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: 0
        })
      }

      const point = timelineMap.get(date)!
      point.tryonCount++

      if (tryOn.converted) {
        point.conversions++
        point.revenue += Number(tryOn.purchaseAmount || 0)
      }
    })

    // Calculate conversion rates and format
    const timeline: TimelineDataPoint[] = Array.from(timelineMap.values()).map(point => ({
      ...point,
      conversionRate: point.tryonCount > 0
        ? Math.round((point.conversions / point.tryonCount) * 10000) / 100
        : 0,
      revenue: Math.round(point.revenue * 100) / 100
    }))

    // Fill in missing dates with zeros
    const filledTimeline: TimelineDataPoint[] = []
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const existing = timeline.find(t => t.date === dateStr)

      filledTimeline.push(existing || {
        date: dateStr,
        tryonCount: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    setCache(cacheKey, filledTimeline, 300)

    res.json({
      success: true,
      data: filledTimeline,
      range,
      cached: false
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/analytics/conversion
 * Record when a try-on leads to a purchase
 */
router.post('/conversion', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchantId!
    const { tryonId, orderId, orderValue } = req.body

    // Validate required fields
    validateRequired({ tryonId, orderId, orderValue })

    // Verify try-on belongs to merchant
    const tryOn = await prisma.tryOn.findFirst({
      where: {
        id: tryonId,
        merchantId
      }
    })

    if (!tryOn) {
      throw badRequest('Try-on not found')
    }

    // Update try-on record
    const updated = await prisma.tryOn.update({
      where: { id: tryonId },
      data: {
        converted: true,
        convertedAt: new Date(),
        purchaseAmount: parseFloat(orderValue)
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })

    // Log conversion event
    await prisma.analyticsEvent.create({
      data: {
        merchantId,
        eventType: 'CONVERSION',
        eventData: {
          tryonId,
          orderId,
          orderValue,
          productId: updated.productId,
          customerId: updated.customerId
        }
      }
    })

    // Invalidate merchant's cache
    invalidateMerchantCache(merchantId)

    res.json({
      success: true,
      data: {
        tryonId: updated.id,
        orderId,
        orderValue: Number(updated.purchaseAmount),
        convertedAt: updated.convertedAt?.toISOString(),
        productId: updated.product?.id,
        customerId: updated.customer?.id
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
