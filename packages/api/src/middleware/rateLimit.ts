import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.js'
import { prisma } from '../utils/prisma.js'
import { tooManyRequests } from './errorHandler.js'
import { SubscriptionPlan } from '@prisma/client'

// Plan limits per month
const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.ATELIER]: 500,
  [SubscriptionPlan.MAISON]: 2000,
  [SubscriptionPlan.COUTURE]: 5000
}

/**
 * Check if merchant has exceeded their monthly try-on limit
 */
export const checkRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.merchant || !req.merchantId) {
      return next()
    }

    const merchant = req.merchant
    const plan = merchant.plan as SubscriptionPlan

    // COUTURE plan has special handling - very high limit
    const monthlyLimit = PLAN_LIMITS[plan]

    // Get current month
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Get or create usage tracking for current month
    const usage = await prisma.usageTracking.findUnique({
      where: {
        merchantId_month: {
          merchantId: req.merchantId,
          month
        }
      }
    })

    const currentUsage = usage?.tryonCount || 0

    // Check if limit exceeded
    if (currentUsage >= monthlyLimit) {
      throw tooManyRequests(
        `Monthly try-on limit exceeded (${monthlyLimit} try-ons). Please upgrade your plan.`
      )
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', monthlyLimit.toString())
    res.setHeader('X-RateLimit-Remaining', (monthlyLimit - currentUsage).toString())
    res.setHeader('X-RateLimit-Reset', getEndOfMonth(now).toISOString())

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Simple in-memory rate limiter for requests per minute
 * Prevents abuse on endpoints that don't consume try-on quota
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const requestRateLimit = (requestsPerMinute: number = 60) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.merchantId || req.ip || 'anonymous'
    const now = Date.now()

    const record = requestCounts.get(key)

    if (!record || now > record.resetTime) {
      // Reset counter
      requestCounts.set(key, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      })
      next()
    } else if (record.count < requestsPerMinute) {
      // Increment counter
      record.count++
      next()
    } else {
      // Limit exceeded
      const error = tooManyRequests(
        `Too many requests. Please try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`
      )
      next(error)
    }
  }
}

/**
 * Clean up old rate limit records every hour
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 3600000) // 1 hour

/**
 * Get end of current month
 */
function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}
