/**
 * Analytics response types
 */

export interface AnalyticsOverview {
  totalTryons: number
  conversionRate: number
  topProducts: TopProduct[]
  usageThisMonth: UsageStats
  revenue: RevenueStats
  timeRange: {
    start: string
    end: string
  }
}

export interface TopProduct {
  productId: string
  name: string
  imageUrl: string
  tryonCount: number
  conversionCount: number
  conversionRate: number
  revenue: number
  category: string
}

export interface UsageStats {
  used: number
  limit: number
  remaining: number
  percentage: number
  overageCount: number
  overageCharges: number
}

export interface RevenueStats {
  total: number
  average: number
  highest: number
  currency: string
}

export interface ProductPerformance {
  productId: string
  name: string
  imageUrl: string
  price: number
  category: string
  tryonCount: number
  conversionCount: number
  conversionRate: number
  revenue: number
  averageRating: number | null
  lastTryonAt: string | null
}

export interface TimelineDataPoint {
  date: string
  tryonCount: number
  conversions: number
  conversionRate: number
  revenue: number
}

export interface ConversionRecord {
  tryonId: string
  orderId: string
  orderValue: number
  convertedAt: string
  productId: string
  customerId: string
}

export type TimeRange = '7d' | '30d' | '90d' | 'all'

export interface TimeRangeDates {
  start: Date
  end: Date
  label: string
}
