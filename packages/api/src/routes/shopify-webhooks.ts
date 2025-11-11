import { Router, Request, Response } from 'express'
import { prisma } from '../utils/prisma.js'
import {
  verifyWebhookHmac,
  handleProductCreate,
  handleProductUpdate,
  handleOrderCreate,
} from '../integrations/shopify.js'

const router = Router()

/**
 * Middleware to verify Shopify webhook HMAC
 */
async function verifyShopifyWebhook(req: Request, res: Response, next: Function) {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string
  const shop = req.headers['x-shopify-shop-domain'] as string

  if (!hmac || !shop) {
    return res.status(401).json({ error: 'Missing webhook headers' })
  }

  // Get raw body for HMAC verification
  const rawBody = JSON.stringify(req.body)

  if (!verifyWebhookHmac(rawBody, hmac)) {
    console.error(`❌ Invalid webhook HMAC from ${shop}`)
    return res.status(401).json({ error: 'Invalid HMAC' })
  }

  // Find merchant by shop domain
  const integration = await prisma.merchantIntegration.findFirst({
    where: {
      shopDomain: shop,
      platform: 'shopify',
    },
  })

  if (!integration) {
    console.error(`❌ No integration found for shop: ${shop}`)
    return res.status(404).json({ error: 'Integration not found' })
  }

  // Attach merchantId to request
  (req as any).merchantId = integration.merchantId
  next()
}

/**
 * POST /api/webhooks/shopify/products-create
 * Handle products/create webhook
 */
router.post('/products-create', verifyShopifyWebhook, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId
    const productData = req.body

    console.log(`📦 Webhook: products/create - ${productData.title}`)

    await handleProductCreate(merchantId, productData)

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('products/create webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * POST /api/webhooks/shopify/products-update
 * Handle products/update webhook
 */
router.post('/products-update', verifyShopifyWebhook, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId
    const productData = req.body

    console.log(`📝 Webhook: products/update - ${productData.title}`)

    await handleProductUpdate(merchantId, productData)

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('products/update webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * POST /api/webhooks/shopify/orders-create
 * Handle orders/create webhook - Track conversions
 */
router.post('/orders-create', verifyShopifyWebhook, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId
    const orderData = req.body

    console.log(`💰 Webhook: orders/create - Order #${orderData.order_number}`)

    await handleOrderCreate(merchantId, orderData)

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('orders/create webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
