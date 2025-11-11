# Analytics API Guide

Comprehensive analytics endpoints for the merchant dashboard with caching and Prisma aggregations.

## Authentication

All analytics endpoints require JWT authentication:

```
Authorization: Bearer {jwt_token}
```

Get JWT token from `/api/auth/login` endpoint.

## Caching

- All GET endpoints are cached for **5 minutes**
- Cache is automatically invalidated when conversions are recorded
- Response includes `cached: true/false` field

## Endpoints

### 1. Analytics Overview

Get comprehensive analytics overview for merchant dashboard.

```
GET /api/v1/analytics/overview
```

#### Response

```json
{
  "success": true,
  "data": {
    "totalTryons": 1234,
    "conversionRate": 12.5,
    "topProducts": [
      {
        "productId": "clx123",
        "name": "Elegant Silk Evening Dress",
        "imageUrl": "https://...",
        "tryonCount": 156,
        "conversionCount": 23,
        "conversionRate": 14.74,
        "revenue": 6897.77,
        "category": "FORMAL"
      }
    ],
    "usageThisMonth": {
      "used": 450,
      "limit": 2000,
      "remaining": 1550,
      "percentage": 22.5,
      "overageCount": 0,
      "overageCharges": 0
    },
    "revenue": {
      "total": 45678.90,
      "average": 299.99,
      "highest": 899.99,
      "currency": "USD"
    },
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  },
  "cached": false
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalTryons` | number | Total try-ons all time |
| `conversionRate` | number | Overall conversion rate (%) |
| `topProducts` | array | Top 5 products by try-on count |
| `usageThisMonth` | object | Current billing period usage |
| `revenue` | object | Revenue statistics |

#### cURL Example

```bash
curl -X GET http://localhost:3001/api/v1/analytics/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. Product Performance

Get detailed performance metrics for all products.

```
GET /api/v1/analytics/products?limit=20&sortBy=tryonCount
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of products to return |
| `sortBy` | string | tryonCount | Sort by: `tryonCount`, `conversionRate`, or `revenue` |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "productId": "clx123",
      "name": "Elegant Silk Evening Dress",
      "imageUrl": "https://...",
      "price": 299.99,
      "category": "FORMAL",
      "tryonCount": 156,
      "conversionCount": 23,
      "conversionRate": 14.74,
      "revenue": 6897.77,
      "averageRating": 4.5,
      "lastTryonAt": "2024-01-15T14:30:00.000Z"
    }
  ],
  "cached": false
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | Product ID |
| `name` | string | Product name |
| `imageUrl` | string | Product image URL |
| `price` | number | Product price |
| `category` | string | Product category |
| `tryonCount` | number | Total try-ons for this product |
| `conversionCount` | number | Number of conversions |
| `conversionRate` | number | Conversion rate (%) |
| `revenue` | number | Total revenue from conversions |
| `averageRating` | number \| null | Average user rating (1-5) |
| `lastTryonAt` | string \| null | ISO timestamp of last try-on |

#### cURL Example

```bash
curl -X GET "http://localhost:3001/api/v1/analytics/products?limit=10&sortBy=conversionRate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript Example

```javascript
const response = await fetch('/api/v1/analytics/products?sortBy=revenue', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const { data } = await response.json()

// Display top revenue products
data.forEach(product => {
  console.log(`${product.name}: $${product.revenue}`)
})
```

---

### 3. Timeline Data

Get try-on activity over time with daily breakdown.

```
GET /api/v1/analytics/timeline?range=7d|30d|90d|all
```

#### Query Parameters

| Parameter | Type | Default | Options | Description |
|-----------|------|---------|---------|-------------|
| `range` | string | 30d | `7d`, `30d`, `90d`, `all` | Time range |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "tryonCount": 45,
      "conversions": 6,
      "conversionRate": 13.33,
      "revenue": 1799.94
    },
    {
      "date": "2024-01-02",
      "tryonCount": 52,
      "conversions": 8,
      "conversionRate": 15.38,
      "revenue": 2399.92
    }
  ],
  "range": "30d",
  "cached": false
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date in YYYY-MM-DD format |
| `tryonCount` | number | Try-ons on this date |
| `conversions` | number | Conversions on this date |
| `conversionRate` | number | Conversion rate (%) |
| `revenue` | number | Revenue for this date |

#### Notes

- Missing dates are filled with zeros
- All dates in range are included
- Perfect for charting libraries (Chart.js, Recharts, etc.)

#### cURL Example

```bash
curl -X GET "http://localhost:3001/api/v1/analytics/timeline?range=7d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Chart.js Example

```javascript
const { data } = await fetch('/api/v1/analytics/timeline?range=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json())

new Chart(ctx, {
  type: 'line',
  data: {
    labels: data.map(d => d.date),
    datasets: [{
      label: 'Try-ons',
      data: data.map(d => d.tryonCount)
    }, {
      label: 'Conversions',
      data: data.map(d => d.conversions)
    }]
  }
})
```

---

### 4. Record Conversion

Track when a try-on leads to a purchase.

```
POST /api/v1/analytics/conversion
```

#### Request Body

```json
{
  "tryonId": "clx123456789",
  "orderId": "ORD-2024-001",
  "orderValue": 299.99
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tryonId` | string | ✅ Yes | Try-on event ID |
| `orderId` | string | ✅ Yes | Order ID from e-commerce platform |
| `orderValue` | number | ✅ Yes | Total order value |

#### Response

```json
{
  "success": true,
  "data": {
    "tryonId": "clx123456789",
    "orderId": "ORD-2024-001",
    "orderValue": 299.99,
    "convertedAt": "2024-01-15T14:30:00.000Z",
    "productId": "clxprod123",
    "customerId": "clxcust456"
  }
}
```

#### Side Effects

- Updates try-on record with conversion data
- Creates `CONVERSION` analytics event
- **Invalidates all cached analytics** for the merchant
- Triggers webhook if configured

#### Error Responses

**400 Bad Request** - Try-on not found
```json
{
  "success": false,
  "error": "Try-on not found"
}
```

**400 Bad Request** - Missing fields
```json
{
  "success": false,
  "error": "Missing required fields: orderId"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:3001/api/v1/analytics/conversion \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tryonId": "clx123456789",
    "orderId": "ORD-2024-001",
    "orderValue": 299.99
  }'
```

#### Webhook Integration Example

```javascript
// In your e-commerce order creation handler
async function onOrderCreated(order) {
  // Find try-on ID (stored in session, cookie, or localStorage)
  const tryonId = getStoredTryonId(order.customerId, order.productId)

  if (tryonId) {
    await fetch('/api/v1/analytics/conversion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${merchantToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tryonId,
        orderId: order.id,
        orderValue: order.total
      })
    })
  }
}
```

---

## Performance Optimizations

### Caching Strategy

All GET endpoints use in-memory caching (node-cache):

- **TTL**: 5 minutes (300 seconds)
- **Invalidation**: On conversion records
- **Storage**: In-memory (no external dependencies)

### Database Optimizations

- **Prisma Aggregations**: Used for all statistics
- **Parallel Queries**: All data fetched concurrently
- **Indexes**: On all foreign keys and date fields
- **Selective Fields**: Only required fields fetched

### Example Query Performance

| Endpoint | Queries | Avg Response Time | Cached |
|----------|---------|-------------------|--------|
| `/overview` | 5 parallel | ~150ms | ~5ms |
| `/products` | 1 query | ~80ms | ~3ms |
| `/timeline` | 1 query | ~120ms | ~4ms |
| `/conversion` | 3 sequential | ~60ms | N/A |

---

## TypeScript Interfaces

```typescript
interface AnalyticsOverview {
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

interface TopProduct {
  productId: string
  name: string
  imageUrl: string
  tryonCount: number
  conversionCount: number
  conversionRate: number
  revenue: number
  category: string
}

interface ProductPerformance {
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

interface TimelineDataPoint {
  date: string
  tryonCount: number
  conversions: number
  conversionRate: number
  revenue: number
}
```

---

## Dashboard Integration Example

### React Dashboard Component

```tsx
import { useEffect, useState } from 'react'

function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    async function loadData() {
      const [overviewRes, timelineRes] = await Promise.all([
        fetch('/api/v1/analytics/overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v1/analytics/timeline?range=30d', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      setOverview(await overviewRes.json())
      setTimeline(await timelineRes.json())
    }

    loadData()
  }, [])

  return (
    <div>
      <h1>Analytics Dashboard</h1>

      <div className="stats">
        <StatCard
          title="Total Try-ons"
          value={overview?.data.totalTryons}
        />
        <StatCard
          title="Conversion Rate"
          value={`${overview?.data.conversionRate}%`}
        />
        <StatCard
          title="Total Revenue"
          value={`$${overview?.data.revenue.total}`}
        />
      </div>

      <TimelineChart data={timeline.data} />

      <TopProductsTable products={overview?.data.topProducts} />
    </div>
  )
}
```

---

## Best Practices

### 1. Polling Intervals

Don't poll too frequently:
```javascript
// Good: Poll every 5 minutes (matches cache TTL)
setInterval(fetchAnalytics, 5 * 60 * 1000)

// Bad: Poll every second (wastes resources)
setInterval(fetchAnalytics, 1000)
```

### 2. Use Appropriate Time Ranges

```javascript
// Dashboard overview: 30 days
fetch('/api/v1/analytics/timeline?range=30d')

// Quick stats widget: 7 days
fetch('/api/v1/analytics/timeline?range=7d')

// Historical report: all time
fetch('/api/v1/analytics/timeline?range=all')
```

### 3. Handle Cache Status

```javascript
const { data, cached } = await response.json()

if (cached) {
  console.log('Using cached data')
  // Maybe show "Last updated 3 min ago"
}
```

### 4. Record Conversions Promptly

```javascript
// Record conversion as soon as order is created
async function onCheckoutComplete(order) {
  // Don't wait for user confirmation
  recordConversion(order)

  // Then redirect or show success
  showOrderConfirmation()
}
```

---

## Troubleshooting

### Cache Issues

Clear merchant cache manually:
```javascript
// In cache.ts utility
invalidateMerchantCache(merchantId)
```

### Slow Queries

Check database indexes:
```sql
-- Should have indexes on:
SELECT * FROM try_ons WHERE merchant_id = ? AND generated_at >= ?
SELECT * FROM products WHERE merchant_id = ? AND is_active = true
```

### Missing Conversions

Verify try-on ownership:
```javascript
// Try-on must belong to merchant
const tryOn = await prisma.tryOn.findFirst({
  where: {
    id: tryonId,
    merchantId: merchantId  // Important!
  }
})
```

---

## Future Enhancements

- [ ] Real-time analytics with WebSockets
- [ ] Export to CSV/PDF
- [ ] Custom date range support
- [ ] Cohort analysis
- [ ] A/B testing metrics
- [ ] Customer lifetime value
- [ ] Funnel visualization
- [ ] Comparison vs previous period

---

For issues or questions, contact support with your merchant ID and endpoint URL.
