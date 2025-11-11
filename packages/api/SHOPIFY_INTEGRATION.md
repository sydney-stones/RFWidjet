# Shopify Integration - Setup Guide

## Overview

Complete Shopify integration with OAuth, webhooks, product sync, and automatic widget injection.

## Features

### 1. OAuth Flow
- **Authorization URL**: Redirects merchant to Shopify for permission
- **Callback Handling**: Exchanges code for permanent access token
- **Token Encryption**: AES-256-CBC encryption for stored tokens
- **Automatic Installation**: Sets up webhooks, script tags, and syncs products

### 2. Webhook Handlers
- **products/create**: Automatically imports new products
- **products/update**: Syncs product changes (name, price, images)
- **orders/create**: Tracks conversions by matching orders to try-ons
- **HMAC Verification**: Cryptographic verification of webhook authenticity

### 3. Script Tag Injection
- Automatically injects widget into Shopify theme
- Includes merchant's API key in script URL
- Loads on all product pages via Shopify ScriptTag API

### 4. Product Sync
- Initial bulk sync during installation
- Real-time updates via webhooks
- Stores Shopify metadata (vendor, product_type, tags)

### 5. Conversion Tracking
- Matches orders to recent try-ons via customer email
- Tracks purchase amount and product
- Creates analytics events for reporting

## Setup Instructions

### Step 1: Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click **Apps** → **Create app**
3. Choose **Public app**
4. Fill in app details:
   - **App name**: Rendered Fits Virtual Try-On
   - **App URL**: `https://yourdomain.com/api/integrations/shopify/auth`
   - **Allowed redirection URL(s)**:
     ```
     https://yourdomain.com/api/integrations/shopify/callback
     ```

5. Click **Create app**

### Step 2: Configure Scopes

In your app settings, request these OAuth scopes:
- ✓ `read_products` - Read product data
- ✓ `write_products` - Update product metadata
- ✓ `read_orders` - Track conversions
- ✓ `write_script_tags` - Inject widget automatically
- ✓ `write_webhooks` - Register webhook subscriptions

### Step 3: Get API Credentials

1. In your app dashboard, find:
   - **API key**
   - **API secret key**

2. Add to your `.env` file:
```bash
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
APP_URL=https://yourdomain.com
WIDGET_CDN_URL=https://cdn.renderedfits.com/widget.min.js
```

### Step 4: Set Up Webhooks

Webhook endpoints (automatically registered during installation):
```
POST https://yourdomain.com/api/webhooks/shopify/products-create
POST https://yourdomain.com/api/webhooks/shopify/products-update
POST https://yourdomain.com/api/webhooks/shopify/orders-create
```

Webhooks are verified via HMAC SHA-256 signature.

### Step 5: Database Migration

Run Prisma migration to create `MerchantIntegration` table:
```bash
cd packages/api
npx prisma migrate dev --name add_shopify_integration
npx prisma generate
```

### Step 6: Install Dependencies

```bash
npm install @shopify/shopify-api
```

## API Endpoints

### OAuth Flow

**Start OAuth**
```http
GET /api/integrations/shopify/auth?shop=mystore.myshopify.com&merchantId=merchant_id
```
Redirects merchant to Shopify authorization page.

**OAuth Callback**
```http
GET /api/integrations/shopify/callback?shop=mystore.myshopify.com&code=auth_code&state=state_token
```
Handles authorization callback, installs integration.

### Integration Management

**Check Integration Status**
```http
GET /api/integrations/shopify/status
Authorization: Bearer {api_key}

Response:
{
  "connected": true,
  "shopDomain": "mystore.myshopify.com",
  "isActive": true,
  "lastSyncAt": "2025-01-15T10:30:00Z",
  "scriptTagId": "12345678",
  "webhookIds": ["987654321", "987654322"],
  "createdAt": "2025-01-01T00:00:00Z"
}
```

**Manual Product Sync**
```http
POST /api/integrations/shopify/sync
Authorization: Bearer {api_key}

Response:
{
  "success": true,
  "syncedCount": 42
}
```

### Webhooks

**Products Create**
```http
POST /api/webhooks/shopify/products-create
Headers:
  X-Shopify-Hmac-SHA256: {hmac_signature}
  X-Shopify-Shop-Domain: mystore.myshopify.com

Body: {Shopify product JSON}
```

**Products Update**
```http
POST /api/webhooks/shopify/products-update
Headers:
  X-Shopify-Hmac-SHA256: {hmac_signature}
  X-Shopify-Shop-Domain: mystore.myshopify.com

Body: {Shopify product JSON}
```

**Orders Create**
```http
POST /api/webhooks/shopify/orders-create
Headers:
  X-Shopify-Hmac-SHA256: {hmac_signature}
  X-Shopify-Shop-Domain: mystore.myshopify.com

Body: {Shopify order JSON}
```

## Installation Flow

### Merchant Installation Process

1. **Merchant clicks "Install"** on your app listing
2. **Redirected to OAuth** → `GET /api/integrations/shopify/auth`
3. **Shopify permission page** → Merchant grants access
4. **OAuth callback** → `GET /api/integrations/shopify/callback`
5. **Automatic setup**:
   - ✓ Save encrypted access token
   - ✓ Register 3 webhooks (products, orders)
   - ✓ Inject script tag into theme
   - ✓ Initial product sync (up to 250 products)
6. **Success page** → Merchant sees confirmation

### What Happens Automatically

**Script Tag Injection**
```javascript
<script src="https://cdn.renderedfits.com/widget.min.js?api_key=merchant_api_key"></script>
```
Loaded on all pages via Shopify's ScriptTag API.

**Webhook Registration**
```javascript
{
  topic: "products/create",
  address: "https://yourdomain.com/api/webhooks/shopify/products-create",
  format: "json"
}
```

**Database Record**
```javascript
{
  merchantId: "merchant_123",
  platform: "shopify",
  shopDomain: "mystore.myshopify.com",
  accessToken: "encrypted_token...",
  scope: "read_products,write_products,read_orders,write_script_tags,write_webhooks",
  scriptTagId: "12345678",
  webhookIds: ["987654321", "987654322", "987654323"]
}
```

## Implementation Details

### Token Encryption

Access tokens are encrypted before storage using AES-256-CBC:

```typescript
function encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(SHOPIFY_API_SECRET, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}
```

### HMAC Verification

All webhooks verify authenticity via HMAC SHA-256:

```typescript
function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64')
  
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))
}
```

### Product Sync Logic

**Initial Sync (Installation)**
```typescript
// Fetch up to 250 products from Shopify
GET /admin/api/2023-10/products.json?limit=250

// Upsert each product to database
for each product:
  - externalId: Shopify product ID
  - name: product.title
  - imageUrl: product.images[0].src
  - price: product.variants[0].price
  - metadata: { shopifyData: { vendor, product_type, tags } }
```

**Real-time Sync (Webhooks)**
- `products/create` → Insert new product
- `products/update` → Update existing product
- Handles price changes, image updates, status changes

### Conversion Tracking

**Order Processing Logic**
```typescript
1. Receive orders/create webhook
2. Extract customer email from order
3. Find Customer by email in database
4. For each line_item in order:
   a. Find Product by external_id (Shopify product_id)
   b. Find most recent TryOn for (customer + product)
   c. If TryOn exists and not yet converted:
      - Mark TryOn.converted = true
      - Set TryOn.convertedAt = now
      - Set TryOn.purchaseAmount = item.price
      - Create CONVERSION analytics event
```

**Conversion Window**: Matches try-ons within last 30 days (configurable)

## Testing

### Test OAuth Flow

```bash
# Replace with your values
SHOP=test-store.myshopify.com
MERCHANT_ID=your_merchant_id

# Open in browser
https://yourdomain.com/api/integrations/shopify/auth?shop=${SHOP}&merchantId=${MERCHANT_ID}
```

### Test Webhooks Locally

Use Shopify CLI to forward webhooks to localhost:

```bash
npm install -g @shopify/cli

shopify webhook trigger products/create
shopify webhook trigger orders/create
```

### Verify HMAC

```bash
# Calculate HMAC for test payload
echo -n '{"id":123,"title":"Test Product"}' | \
  openssl dgst -sha256 -hmac "your_shopify_secret" -binary | \
  base64
```

## Troubleshooting

### Common Issues

**OAuth fails with "redirect_uri mismatch"**
- Ensure callback URL in Shopify app settings matches exactly
- Check `APP_URL` environment variable

**Webhooks not firing**
- Check webhook status in Shopify admin
- Verify `X-Shopify-Hmac-SHA256` header is present
- Check server logs for HMAC verification errors

**Script tag not appearing**
- Check Shopify admin → Online Store → Themes → Actions → Edit code
- Look for script tags in `theme.liquid`
- Verify `scriptTagId` is stored in database

**Products not syncing**
- Check `lastSyncAt` timestamp
- Manually trigger sync: `POST /api/integrations/shopify/sync`
- Check API logs for errors

### Debug Commands

```bash
# Check integration status
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://yourdomain.com/api/integrations/shopify/status

# Manual product sync
curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \
  https://yourdomain.com/api/integrations/shopify/sync

# Check database
psql -d rendered_fits -c "SELECT * FROM merchant_integrations WHERE platform = 'shopify';"
```

## Security Best Practices

1. **Token Storage**: Never log or expose access tokens
2. **HMAC Verification**: Always verify webhook HMAC before processing
3. **HTTPS Only**: All OAuth and webhook endpoints must use HTTPS
4. **Token Encryption**: Encrypt tokens at rest in database
5. **Rate Limiting**: Respect Shopify API rate limits (2 req/s)

## Rate Limits

Shopify API rate limits:
- **REST API**: 2 requests per second
- **GraphQL**: 50 points per second
- **Webhooks**: No limit on receiving

Our implementation includes:
- Exponential backoff on rate limit errors
- Queue for bulk operations
- Batch processing for product sync

## Production Checklist

- [ ] Shopify app approved and public
- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] HTTPS enabled on all endpoints
- [ ] Webhook URLs publicly accessible
- [ ] Script tag CDN URL configured
- [ ] Error monitoring enabled
- [ ] Rate limiting configured
- [ ] Token encryption working
- [ ] HMAC verification tested

## Support

For issues or questions:
- Check Shopify Partner documentation
- Review server logs for webhook errors
- Test with Shopify development store
- Contact Shopify Partner support
