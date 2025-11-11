// Enums matching Prisma schema
export enum SubscriptionPlan {
  ATELIER = 'ATELIER',  // Starter: $99/mo, 500 try-ons
  MAISON = 'MAISON',    // Professional: $299/mo, 2000 try-ons
  COUTURE = 'COUTURE'   // Enterprise: $999/mo, unlimited
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  SUSPENDED = 'SUSPENDED'
}

export enum ProductCategory {
  TOPS = 'TOPS',
  BOTTOMS = 'BOTTOMS',
  DRESSES = 'DRESSES',
  OUTERWEAR = 'OUTERWEAR',
  SHOES = 'SHOES',
  ACCESSORIES = 'ACCESSORIES',
  ACTIVEWEAR = 'ACTIVEWEAR',
  SWIMWEAR = 'SWIMWEAR',
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  OTHER = 'OTHER'
}

export enum AnalyticsEventType {
  TRY_ON_STARTED = 'TRY_ON_STARTED',
  TRY_ON_COMPLETED = 'TRY_ON_COMPLETED',
  TRY_ON_FAILED = 'TRY_ON_FAILED',
  PRODUCT_ADDED = 'PRODUCT_ADDED',
  PRODUCT_REMOVED = 'PRODUCT_REMOVED',
  CONVERSION = 'CONVERSION',
  REFUND = 'REFUND',
  WIDGET_LOADED = 'WIDGET_LOADED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED'
}

// Core Entity Types
export interface Merchant {
  id: string
  email: string
  businessName: string
  apiKey: string
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  trialEndsAt?: string
  subscriptionEndsAt?: string
  website?: string
  logoUrl?: string
  contactName?: string
  phone?: string
  stripeCustomerId?: string
  billingEmail?: string
  webhookUrl?: string
  webhookSecret?: string
  allowedDomains: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface Product {
  id: string
  merchantId: string
  externalId: string
  name: string
  description?: string
  imageUrl: string
  price: number
  currency: string
  category: ProductCategory
  sku?: string
  metadata?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  email?: string
  anonymousId?: string
  photoUrl?: string
  bodyProfile?: {
    height?: number
    weight?: number
    chestSize?: number
    waistSize?: number
    hipSize?: number
    shoeSize?: number
  }
  preferences?: {
    styles?: string[]
    colors?: string[]
    brands?: string[]
  }
  lastSeen: string
  createdAt: string
  updatedAt: string
}

export interface TryOn {
  id: string
  customerId: string
  productId: string
  merchantId: string
  inputImageUrl: string
  outputImageUrl: string
  processingTimeMs: number
  geminiModelUsed: string
  converted: boolean
  returnedFlag: boolean
  purchaseAmount?: number
  userRating?: number
  userFeedback?: string
  generatedAt: string
  convertedAt?: string
}

export interface UsageTracking {
  id: string
  merchantId: string
  month: string
  year: number
  monthNumber: number
  tryonCount: number
  includedTryons: number
  overageTryons: number
  overageCharges: number
  totalCharges: number
  billedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AnalyticsEvent {
  id: string
  merchantId: string
  eventType: AnalyticsEventType
  eventData: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  timestamp: string
}

// API Request/Response Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  businessName: string
  contactName?: string
  website?: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  merchant?: Omit<Merchant, 'password'>
  error?: string
}

export interface TryOnRequest {
  customerId?: string
  productId: string
  personImage: File | Blob
  garmentImage?: File | Blob
}

export interface TryOnResponse {
  success: boolean
  tryOnId?: string
  outputImageUrl?: string
  processingTimeMs?: number
  error?: string
}

export interface ProductSyncRequest {
  products: Array<{
    externalId: string
    name: string
    description?: string
    imageUrl: string
    price: number
    category?: ProductCategory
    sku?: string
    metadata?: Record<string, any>
  }>
}

export interface DashboardStats {
  totalTryOns: number
  todayTryOns: number
  monthTryOns: number
  conversionRate: number
  averageProcessingTime: number
  activeProducts: number
  totalRevenue: number
  planUsage: {
    used: number
    limit: number
    percentage: number
  }
}

// Plan Configuration
export interface PlanConfig {
  name: string
  price: number
  includedTryons: number
  features: string[]
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  [SubscriptionPlan.ATELIER]: {
    name: 'Atelier',
    price: 99,
    includedTryons: 500,
    features: [
      '500 try-ons per month',
      'Basic analytics',
      'Email support',
      'Widget customization'
    ]
  },
  [SubscriptionPlan.MAISON]: {
    name: 'Maison',
    price: 299,
    includedTryons: 2000,
    features: [
      '2,000 try-ons per month',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'Webhook integration'
    ]
  },
  [SubscriptionPlan.COUTURE]: {
    name: 'Couture',
    price: 999,
    includedTryons: -1, // unlimited
    features: [
      'Unlimited try-ons',
      'Premium analytics',
      'Dedicated support',
      'White-label solution',
      'API access',
      'Custom integrations'
    ]
  }
}
