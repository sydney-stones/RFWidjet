import { prisma } from '../utils/prisma.js'
import { SubscriptionPlan } from '@prisma/client'

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.ATELIER]: 500,
  [SubscriptionPlan.MAISON]: 2000,
  [SubscriptionPlan.COUTURE]: 5000
}

const OVERAGE_RATE = 0.50 // $0.50 per try-on above limit

/**
 * Track a try-on usage for billing
 */
export async function trackUsage(merchantId: string): Promise<void> {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const year = now.getFullYear()
  const monthNumber = now.getMonth() + 1

  // Get merchant to determine plan limits
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { plan: true }
  })

  if (!merchant) {
    throw new Error('Merchant not found')
  }

  const includedTryons = PLAN_LIMITS[merchant.plan]

  // Upsert usage tracking
  const usage = await prisma.usageTracking.upsert({
    where: {
      merchantId_month: {
        merchantId,
        month
      }
    },
    update: {
      tryonCount: { increment: 1 }
    },
    create: {
      merchantId,
      month,
      year,
      monthNumber,
      tryonCount: 1,
      includedTryons
    }
  })

  // Calculate overages
  const overageTryons = Math.max(0, usage.tryonCount - includedTryons)
  const overageCharges = overageTryons * OVERAGE_RATE

  // Update overage charges
  await prisma.usageTracking.update({
    where: {
      merchantId_month: {
        merchantId,
        month
      }
    },
    data: {
      overageTryons,
      overageCharges
    }
  })
}

/**
 * Get current month's usage for a merchant
 */
export async function getCurrentUsage(merchantId: string) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { plan: true }
  })

  if (!merchant) {
    throw new Error('Merchant not found')
  }

  const usage = await prisma.usageTracking.findUnique({
    where: {
      merchantId_month: {
        merchantId,
        month
      }
    }
  })

  const limit = PLAN_LIMITS[merchant.plan]
  const used = usage?.tryonCount || 0
  const remaining = Math.max(0, limit - used)
  const overage = Math.max(0, used - limit)

  return {
    used,
    limit,
    remaining,
    overage,
    overageCharges: overage * OVERAGE_RATE,
    percentage: (used / limit) * 100
  }
}

/**
 * Get billing summary for a specific month
 */
export async function getMonthlyBilling(merchantId: string, month: string) {
  const usage = await prisma.usageTracking.findUnique({
    where: {
      merchantId_month: {
        merchantId,
        month
      }
    }
  })

  if (!usage) {
    return null
  }

  return {
    month: usage.month,
    tryonCount: usage.tryonCount,
    includedTryons: usage.includedTryons,
    overageTryons: usage.overageTryons,
    overageCharges: Number(usage.overageCharges),
    totalCharges: Number(usage.totalCharges)
  }
}

/**
 * Get billing history for a merchant
 */
export async function getBillingHistory(merchantId: string, limit: number = 12) {
  const history = await prisma.usageTracking.findMany({
    where: { merchantId },
    orderBy: [
      { year: 'desc' },
      { monthNumber: 'desc' }
    ],
    take: limit
  })

  return history.map(usage => ({
    month: usage.month,
    tryonCount: usage.tryonCount,
    includedTryons: usage.includedTryons,
    overageTryons: usage.overageTryons,
    overageCharges: Number(usage.overageCharges),
    totalCharges: Number(usage.totalCharges),
    billedAt: usage.billedAt
  }))
}

/**
 * Calculate estimated monthly bill
 */
export async function getEstimatedBill(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { plan: true }
  })

  if (!merchant) {
    throw new Error('Merchant not found')
  }

  const usage = await getCurrentUsage(merchantId)

  // Base plan prices
  const planPrices: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.ATELIER]: 99,
    [SubscriptionPlan.MAISON]: 299,
    [SubscriptionPlan.COUTURE]: 999
  }

  const baseFee = planPrices[merchant.plan]
  const overageFee = usage.overageCharges

  return {
    baseFee,
    overageFee,
    total: baseFee + overageFee,
    breakdown: {
      plan: merchant.plan,
      includedTryons: usage.limit,
      usedTryons: usage.used,
      overageTryons: usage.overage,
      overageRate: OVERAGE_RATE
    }
  }
}
