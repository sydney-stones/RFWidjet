# Prisma Schema Quick Reference

## Setup Commands

```bash
# Install dependencies
npm install

# Generate Prisma client (after schema changes)
npm run db:generate

# Create migration
npm run db:migrate

# Apply migrations (production)
npx prisma migrate deploy

# Seed database with test data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Test Data

After running `npm run db:seed`:

### Merchants
```
Merchant 1: Luxe Fashion Boutique
  Email: john@luxefashion.com
  Password: password123
  Plan: MAISON ($299/mo, 2000 try-ons)
  API Key: (printed in seed output)

Merchant 2: Urban Style Co.
  Email: sarah@urbanstyle.io
  Password: password123
  Plan: ATELIER ($99/mo, 500 try-ons) - TRIAL
  API Key: (printed in seed output)
```

### Products
- 5 products per merchant
- Categories: FORMAL, OUTERWEAR, TOPS, BOTTOMS, SHOES, CASUAL, ACTIVEWEAR
- Prices: $79.99 - $449.99

## Common Queries

### Using Prisma Client

```typescript
import { prisma } from './utils/prisma'

// Find merchant by API key
const merchant = await prisma.merchant.findUnique({
  where: { apiKey: 'rfts_...' }
})

// Get merchant's products
const products = await prisma.product.findMany({
  where: {
    merchantId: merchant.id,
    isActive: true
  },
  orderBy: { createdAt: 'desc' }
})

// Create try-on event
const tryOn = await prisma.tryOn.create({
  data: {
    customerId: customer.id,
    productId: product.id,
    merchantId: merchant.id,
    inputImageUrl: 'https://...',
    outputImageUrl: 'https://...',
    processingTimeMs: 3456
  }
})

// Get merchant stats
const stats = await prisma.tryOn.groupBy({
  by: ['merchantId'],
  where: {
    merchantId: merchant.id,
    generatedAt: {
      gte: new Date('2024-01-01'),
      lt: new Date('2024-02-01')
    }
  },
  _count: { id: true },
  _sum: { purchaseAmount: true }
})

// Update usage tracking
const usage = await prisma.usageTracking.upsert({
  where: {
    merchantId_month: {
      merchantId: merchant.id,
      month: '2024-01'
    }
  },
  update: {
    tryonCount: { increment: 1 }
  },
  create: {
    merchantId: merchant.id,
    month: '2024-01',
    year: 2024,
    monthNumber: 1,
    tryonCount: 1,
    includedTryons: 500
  }
})

// Log analytics event
await prisma.analyticsEvent.create({
  data: {
    merchantId: merchant.id,
    eventType: 'TRY_ON_COMPLETED',
    eventData: {
      productId: product.id,
      processingTime: 3456,
      converted: false
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  }
})

// Find or create customer (anonymous)
const customer = await prisma.customer.upsert({
  where: { anonymousId: sessionId },
  update: { lastSeen: new Date() },
  create: {
    anonymousId: sessionId,
    lastSeen: new Date()
  }
})

// Get conversion rate
const conversionStats = await prisma.tryOn.aggregate({
  where: { merchantId: merchant.id },
  _count: { id: true },
  _sum: {
    converted: true // counts true values
  }
})
const conversionRate = (conversionStats._sum.converted / conversionStats._count.id) * 100
```

## Enums

### SubscriptionPlan
```typescript
'ATELIER'  // $99/mo, 500 try-ons
'MAISON'   // $299/mo, 2000 try-ons
'COUTURE'  // $999/mo, unlimited
```

### SubscriptionStatus
```typescript
'ACTIVE'     // Paying customer
'TRIAL'      // Trial period
'PAST_DUE'   // Payment failed
'CANCELED'   // Canceled subscription
'SUSPENDED'  // Suspended by admin
```

### ProductCategory
```typescript
'TOPS' | 'BOTTOMS' | 'DRESSES' | 'OUTERWEAR' | 'SHOES'
'ACCESSORIES' | 'ACTIVEWEAR' | 'SWIMWEAR' | 'FORMAL' | 'CASUAL' | 'OTHER'
```

### AnalyticsEventType
```typescript
'TRY_ON_STARTED' | 'TRY_ON_COMPLETED' | 'TRY_ON_FAILED'
'PRODUCT_ADDED' | 'PRODUCT_REMOVED'
'CONVERSION' | 'REFUND'
'WIDGET_LOADED' | 'API_KEY_CREATED' | 'API_KEY_REVOKED'
```

## Relationships

```
Merchant
  ├── products[]          (one-to-many)
  ├── tryOns[]           (one-to-many)
  ├── usageTracking[]    (one-to-many)
  └── analyticsEvents[]  (one-to-many)

Product
  ├── merchant           (many-to-one)
  └── tryOns[]           (one-to-many)

Customer
  └── tryOns[]           (one-to-many)

TryOn
  ├── customer           (many-to-one)
  ├── product            (many-to-one)
  └── merchant           (many-to-one)
```

## Key Indexes

Optimized for these query patterns:
- Find merchant by API key: `Merchant.apiKey`
- List merchant's active products: `(Product.merchantId, Product.isActive)`
- Find customer try-ons: `TryOn.customerId`
- Merchant billing queries: `(TryOn.merchantId, TryOn.generatedAt)`
- Analytics: `(AnalyticsEvent.merchantId, AnalyticsEvent.timestamp)`

## JSON Fields

### Product.metadata
```json
{
  "sizes": ["XS", "S", "M", "L", "XL"],
  "colors": ["Black", "Navy", "White"],
  "material": "Cotton",
  "brand": "Brand Name",
  "weight": 500,
  "shopifyId": "gid://shopify/Product/123"
}
```

### Customer.bodyProfile
```json
{
  "height": 170,
  "weight": 65,
  "chestSize": 36,
  "waistSize": 28,
  "hipSize": 38,
  "shoeSize": 9
}
```

### Customer.preferences
```json
{
  "styles": ["casual", "elegant"],
  "colors": ["black", "navy", "white"],
  "brands": ["Brand A", "Brand B"],
  "priceRange": [50, 200]
}
```

### AnalyticsEvent.eventData
```json
// TRY_ON_COMPLETED
{
  "productId": "clx...",
  "processingTime": 3456,
  "modelUsed": "gemini-2.5-flash"
}

// CONVERSION
{
  "productId": "clx...",
  "tryOnId": "clx...",
  "amount": 299.99,
  "orderId": "ORD-123"
}
```

## Migrations Best Practices

1. **Always backup production** before migrations
2. **Test migrations** on staging first
3. **Use `prisma migrate dev`** in development
4. **Use `prisma migrate deploy`** in production
5. **Never edit migration files** after they're created
6. **Write rollback procedures** for risky migrations

## Troubleshooting

### Reset database (development only)
```bash
npx prisma migrate reset
npm run db:seed
```

### Check migration status
```bash
npx prisma migrate status
```

### Resolve migration conflicts
```bash
npx prisma migrate resolve --applied <migration_name>
```

### Generate types after schema changes
```bash
npm run db:generate
```

### View SQL for next migration
```bash
npx prisma migrate dev --create-only
# Edit SQL before applying if needed
npx prisma migrate dev
```
