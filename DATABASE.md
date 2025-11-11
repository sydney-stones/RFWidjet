# Database Schema Documentation

## Overview

Rendered Fits uses PostgreSQL with Prisma ORM for type-safe database access. The schema is designed to support:
- Multi-tenant merchant system
- Product catalog management
- Virtual try-on tracking
- Usage-based billing
- Analytics and reporting

## Entity Relationship Diagram

```
┌──────────────┐
│   Merchant   │
└──────┬───────┘
       │
       ├──────────┬────────────┬──────────────┬───────────────┐
       │          │            │              │               │
   ┌───▼────┐ ┌──▼──────┐ ┌───▼────────┐ ┌──▼──────────┐ ┌─▼─────────┐
   │Product │ │  TryOn  │ │UsageTracking│ │AnalyticsEvent│ │  Webhook  │
   └───┬────┘ └──┬──────┘ └─────────────┘ └──────────────┘ └───────────┘
       │         │
       │    ┌────▼────┐
       └────┤Customer │
            └─────────┘
```

## Core Entities

### Merchant
Represents businesses that install the Rendered Fits widget on their e-commerce sites.

**Key Fields:**
- `apiKey` (unique): Used to authenticate widget requests
- `plan`: Subscription tier (ATELIER/MAISON/COUTURE)
- `subscriptionStatus`: Current subscription state
- `allowedDomains`: CORS whitelist for widget embedding

**Subscription Plans:**
| Plan    | Price | Try-ons/Month | Features |
|---------|-------|---------------|----------|
| ATELIER | $99   | 500           | Basic analytics, Email support |
| MAISON  | $299  | 2,000         | Advanced analytics, Priority support, Webhooks |
| COUTURE | $999  | Unlimited     | Premium analytics, Dedicated support, White-label |

**Indexes:**
- `apiKey` - Fast lookup for API authentication
- `email` - Fast lookup for login
- `subscriptionStatus` - Filter active merchants
- `createdAt` - Sort by registration date

### Product
Items from merchant e-commerce catalogs that customers can try on virtually.

**Key Fields:**
- `externalId`: Original product ID from merchant's platform
- `category`: Product type (TOPS, BOTTOMS, DRESSES, etc.)
- `metadata`: Flexible JSON for platform-specific data (sizes, colors, etc.)
- `isActive`: Soft delete flag

**Unique Constraint:**
- `(merchantId, externalId)` - Prevents duplicate product imports

**Indexes:**
- `merchantId` - List merchant's products
- `merchantId, isActive` - List active products
- `category` - Filter by category
- `createdAt` - Sort by import date

### Customer
End-users who use the virtual try-on feature. Can be anonymous or identified.

**Key Fields:**
- `email`: Optional for registered users
- `anonymousId`: Unique ID for tracking without email
- `bodyProfile`: JSON with measurements (height, weight, sizes)
- `preferences`: JSON with style preferences

**Privacy Note:** Email is optional to support anonymous try-ons while still tracking usage.

**Indexes:**
- `email` - Look up by email
- `anonymousId` - Look up anonymous users
- `lastSeen` - Find recent users

### TryOn
Records of virtual try-on events. Core entity for analytics and billing.

**Key Fields:**
- `inputImageUrl`: Customer's uploaded photo
- `outputImageUrl`: AI-generated result
- `processingTimeMs`: Performance tracking
- `converted`: Did the customer purchase?
- `returnedFlag`: Did they return the item?
- `purchaseAmount`: Revenue attributed to this try-on

**Business Metrics:**
- Conversion tracking for ROI calculation
- Return rate analysis
- Processing time for SLA monitoring

**Indexes:**
- `customerId` - Customer history
- `productId` - Product performance
- `merchantId` - Merchant usage
- `merchantId, generatedAt` - Date-range queries for billing
- `merchantId, converted` - Conversion analytics
- `generatedAt` - Global time-series queries

### UsageTracking
Monthly usage summaries for billing. One record per merchant per month.

**Key Fields:**
- `month`: Format "2024-01" for January 2024
- `tryonCount`: Total try-ons this month
- `includedTryons`: Plan allowance
- `overageTryons`: Usage beyond plan limit
- `overageCharges`: Billing for overages

**Calculation:**
```typescript
overageTryons = max(0, tryonCount - includedTryons)
overageCharges = overageTryons * OVERAGE_RATE
totalCharges = planPrice + overageCharges
```

**Unique Constraint:**
- `(merchantId, month)` - One record per merchant per month

**Indexes:**
- `merchantId` - Merchant billing history
- `merchantId, year, monthNumber` - Date-range queries
- `month` - Global monthly reports

### AnalyticsEvent
Event stream for merchant dashboard analytics and business intelligence.

**Event Types:**
- `TRY_ON_STARTED`: User initiated try-on
- `TRY_ON_COMPLETED`: AI processing finished
- `TRY_ON_FAILED`: Processing error
- `PRODUCT_ADDED`: Product synced from e-commerce
- `CONVERSION`: Customer purchased
- `REFUND`: Customer returned item
- `WIDGET_LOADED`: Widget initialized on merchant site
- `API_KEY_CREATED`: New API key generated
- `API_KEY_REVOKED`: API key disabled

**Key Fields:**
- `eventData`: Flexible JSON for event-specific data
- `ipAddress`: For fraud detection
- `userAgent`: Browser/device tracking
- `sessionId`: Group related events

**Indexes:**
- `merchantId` - All events for merchant
- `merchantId, eventType` - Filter by event type
- `merchantId, timestamp` - Time-series analytics
- `timestamp` - Global event stream

## Utility Models

### ApiLog
Request/response logging for debugging and monitoring.

**Use Cases:**
- Error tracking
- Performance monitoring
- Security auditing
- Rate limit enforcement

**Retention:** Typically 30-90 days

### Webhook
Outbound webhook delivery tracking.

**Use Cases:**
- Notify merchants of try-on completions
- Send conversion events to analytics platforms
- Trigger workflows in merchant systems

**Retry Logic:** Exponential backoff for failed deliveries

## Performance Optimization

### Index Strategy
All foreign keys are indexed for fast joins:
- `TryOn.customerId`
- `TryOn.productId`
- `TryOn.merchantId`
- `Product.merchantId`
- `UsageTracking.merchantId`
- `AnalyticsEvent.merchantId`

Composite indexes for common query patterns:
- `(merchantId, generatedAt)` - Billing queries
- `(merchantId, converted)` - Analytics dashboards
- `(merchantId, isActive)` - Active product listings

### Query Patterns

**Merchant Dashboard Stats:**
```sql
-- Today's try-ons
SELECT COUNT(*) FROM try_ons
WHERE merchantId = ?
AND generatedAt >= CURRENT_DATE;

-- Conversion rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions
FROM try_ons
WHERE merchantId = ?;
```

**Billing Calculation:**
```sql
-- Monthly usage
SELECT
  COUNT(*) as tryonCount,
  merchant.plan
FROM try_ons
JOIN merchants ON try_ons.merchantId = merchants.id
WHERE merchantId = ?
AND generatedAt >= '2024-01-01'
AND generatedAt < '2024-02-01'
GROUP BY merchantId;
```

## Migrations

### Setup
```bash
# Generate Prisma client
npm run db:generate

# Create and apply migration
npm run db:migrate

# Seed database with test data
npm run db:seed
```

### Migration Files
Stored in `packages/api/prisma/migrations/`

### Seed Data
- 2 test merchants (different plans)
- 10 test products (5 per merchant)
- 2 test customers
- 5 try-on events with conversions
- Usage tracking records
- Analytics events

### Test Credentials
```
Merchant 1 (Luxe Fashion):
  Email: john@luxefashion.com
  Password: password123
  Plan: MAISON

Merchant 2 (Urban Style):
  Email: sarah@urbanstyle.io
  Password: password123
  Plan: ATELIER (Trial)
```

## Data Integrity

### Foreign Key Constraints
- `onDelete: Cascade` for merchant relationships
  - When merchant deleted, all products/try-ons/events are deleted
- Prevents orphaned records
- Maintains referential integrity

### Unique Constraints
- `Merchant.email` - One account per email
- `Merchant.apiKey` - Unique API keys
- `Customer.anonymousId` - Unique anonymous tracking
- `(Product.merchantId, Product.externalId)` - No duplicate imports
- `(UsageTracking.merchantId, UsageTracking.month)` - One record per period

### Soft Deletes
- `Product.isActive` - Products can be deactivated without data loss
- Maintains historical try-on data even after product removal

## Scaling Considerations

### Partitioning (Future)
- Partition `TryOn` table by `generatedAt` (monthly)
- Partition `AnalyticsEvent` by `timestamp` (weekly)
- Improves query performance on large datasets

### Archival (Future)
- Archive try-ons older than 1 year to cold storage
- Archive analytics events older than 90 days
- Keep aggregated metrics for historical reporting

### Read Replicas
- Use read replicas for analytics queries
- Primary for writes, replica for dashboards
- Reduces load on primary database

## Backup Strategy

**Recommended:**
- Automated daily backups
- Point-in-time recovery enabled
- 30-day retention for production
- Test restore process quarterly

**Critical Tables:**
- `merchants` - Business continuity
- `products` - Catalog data
- `try_ons` - Revenue data
- `usage_tracking` - Billing records

## Security

### Sensitive Data
- Merchant passwords: Hashed with bcrypt (10 rounds)
- API keys: Generated with crypto.randomBytes(32)
- Customer emails: Optional, encrypted at rest (recommended)

### Access Control
- Row-level security via application logic
- Merchants can only access their own data
- API validates merchant ownership on all queries

### Compliance
- GDPR: Customer data can be anonymized/deleted
- PCI: No credit card data stored (use Stripe)
- SOC 2: Audit logs via `ApiLog` table

## Troubleshooting

### Common Issues

**"Unique constraint violation"**
- Duplicate email registration
- Duplicate API key generation (retry with new key)
- Duplicate product import (check externalId)

**"Foreign key constraint violation"**
- Referenced record doesn't exist
- Orphaned record after deletion
- Check cascade rules

**"Slow queries"**
- Missing indexes - check query plan
- Large table scans - add WHERE clauses
- Join optimization - use covering indexes

### Monitoring Queries

```sql
-- Find slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass))
FROM information_schema.tables
WHERE table_schema = 'public';
```

## Schema Updates

When modifying the schema:

1. **Update Prisma schema** (`schema.prisma`)
2. **Create migration**: `npm run db:migrate`
3. **Update TypeScript types** (`shared/src/types.ts`)
4. **Update seed data** if needed (`prisma/seed.ts`)
5. **Update API controllers** to use new fields
6. **Test thoroughly** before deploying

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Schema file: [packages/api/prisma/schema.prisma](packages/api/prisma/schema.prisma)
- Seed script: [packages/api/prisma/seed.ts](packages/api/prisma/seed.ts)
