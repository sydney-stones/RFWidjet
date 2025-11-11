import express, { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'
import { validateDateRange } from '../utils/validation.js'
import { getCurrentUsage, getBillingHistory, getEstimatedBill } from '../services/billing.js'

const router = express.Router()

/**
 * GET /api/analytics/stats
 * Get dashboard statistics
 */
router.get('/stats', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchantId!
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get counts in parallel
    const [
      totalTryOns,
      todayTryOns,
      monthTryOns,
      activeProducts,
      conversionData,
      avgProcessingTime,
      planUsage
    ] = await Promise.all([
      // Total try-ons
      prisma.tryOn.count({
        where: { merchantId }
      }),

      // Today's try-ons
      prisma.tryOn.count({
        where: {
          merchantId,
          generatedAt: { gte: today }
        }
      }),

      // This month's try-ons
      prisma.tryOn.count({
        where: {
          merchantId,
          generatedAt: { gte: firstDayOfMonth }
        }
      }),

      // Active products
      prisma.product.count({
        where: {
          merchantId,
          isActive: true
        }
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

      // Average processing time
      prisma.tryOn.aggregate({
        where: { merchantId },
        _avg: { processingTimeMs: true }
      }),

      // Plan usage
      getCurrentUsage(merchantId)
    ])

    const conversionRate = conversionData._count.id > 0
      ? (conversionData._sum.converted || 0) / conversionData._count.id * 100
      : 0

    const totalRevenue = Number(conversionData._sum.purchaseAmount || 0)

    res.json({
      success: true,
      stats: {
        totalTryOns,
        todayTryOns,
        monthTryOns,
        activeProducts,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageProcessingTime: Math.round(avgProcessingTime._avg.processingTimeMs || 0),
        totalRevenue,
        planUsage: {
          used: planUsage.used,
          limit: planUsage.limit,
          remaining: planUsage.remaining,
          percentage: Math.round(planUsage.percentage * 100) / 100
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/timeline
 * Get try-on timeline data for charts
 */
router.get('/timeline', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    )

    const tryOns = await prisma.tryOn.groupBy({
      by: ['generatedAt'],
      where: {
        merchantId: req.merchantId!,
        generatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true },
      _sum: { converted: true }
    })

    // Group by date
    const timelineMap = new Map<string, { date: string; tryOns: number; conversions: number }>()

    tryOns.forEach(item => {
      const date = item.generatedAt.toISOString().split('T')[0]
      const existing = timelineMap.get(date) || { date, tryOns: 0, conversions: 0 }
      existing.tryOns += item._count.id
      existing.conversions += item._sum.converted || 0
      timelineMap.set(date, existing)
    })

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    res.json({
      success: true,
      timeline
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/products
 * Get product performance analytics
 */
router.get('/products', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const topProducts = await prisma.product.findMany({
      where: {
        merchantId: req.merchantId!,
        isActive: true
      },
      include: {
        _count: {
          select: {
            tryOns: true
          }
        },
        tryOns: {
          select: {
            converted: true,
            purchaseAmount: true
          }
        }
      },
      orderBy: {
        tryOns: {
          _count: 'desc'
        }
      },
      take: 10
    })

    const analytics = topProducts.map(product => {
      const conversions = product.tryOns.filter(t => t.converted).length
      const conversionRate = product._count.tryOns > 0
        ? (conversions / product._count.tryOns) * 100
        : 0
      const revenue = product.tryOns.reduce((sum, t) => sum + Number(t.purchaseAmount || 0), 0)

      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        category: product.category,
        tryOns: product._count.tryOns,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue
      }
    })

    res.json({
      success: true,
      products: analytics
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/usage
 * Get usage and billing information
 */
router.get('/usage', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [currentUsage, billingHistory, estimatedBill] = await Promise.all([
      getCurrentUsage(req.merchantId!),
      getBillingHistory(req.merchantId!),
      getEstimatedBill(req.merchantId!)
    ])

    res.json({
      success: true,
      currentUsage,
      billingHistory,
      estimatedBill
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/events
 * Get recent analytics events
 */
router.get('/events', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = '50', eventType } = req.query

    const events = await prisma.analyticsEvent.findMany({
      where: {
        merchantId: req.merchantId!,
        ...(eventType && { eventType: eventType as any })
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string, 10)
    })

    res.json({
      success: true,
      events
    })
  } catch (error) {
    next(error)
  }
})

export default router
