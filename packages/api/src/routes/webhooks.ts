import express, { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'
import { badRequest } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * POST /api/webhooks/shopify
 * Handle Shopify webhook events
 */
router.post('/shopify', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topic = req.headers['x-shopify-topic'] as string
    const shopDomain = req.headers['x-shopify-shop-domain'] as string
    const data = req.body

    console.log(`Received Shopify webhook: ${topic} from ${shopDomain}`)

    // Find merchant by shop domain
    const merchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { website: { contains: shopDomain } },
          { webhookSecret: shopDomain } // Store shop domain in webhookSecret for Shopify
        ]
      }
    })

    if (!merchant) {
      return res.status(200).json({ message: 'Merchant not found, ignoring webhook' })
    }

    // Handle different webhook topics
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductSync(merchant.id, data)
        break

      case 'products/delete':
        await handleProductDelete(merchant.id, data.id.toString())
        break

      case 'orders/create':
        await handleOrderCreated(merchant.id, data)
        break

      default:
        console.log(`Unhandled webhook topic: ${topic}`)
    }

    res.status(200).json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Always return 200 to prevent webhook retries
    res.status(200).json({ message: 'Error processing webhook' })
  }
})

/**
 * POST /api/webhooks/woocommerce
 * Handle WooCommerce webhook events
 */
router.post('/woocommerce', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.headers['x-wc-webhook-event'] as string
    const signature = req.headers['x-wc-webhook-signature'] as string
    const data = req.body

    console.log(`Received WooCommerce webhook: ${event}`)

    // TODO: Verify webhook signature

    // Find merchant by API key or webhook URL
    const merchantId = req.query.merchant_id as string

    if (!merchantId) {
      return res.status(200).json({ message: 'Merchant ID required' })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    })

    if (!merchant) {
      return res.status(200).json({ message: 'Merchant not found' })
    }

    // Handle different events
    if (event.startsWith('product.')) {
      if (event === 'product.created' || event === 'product.updated') {
        await handleProductSync(merchant.id, data)
      } else if (event === 'product.deleted') {
        await handleProductDelete(merchant.id, data.id.toString())
      }
    } else if (event === 'order.created') {
      await handleOrderCreated(merchant.id, data)
    }

    res.status(200).json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(200).json({ message: 'Error processing webhook' })
  }
})

/**
 * GET /api/webhooks/config
 * Get webhook configuration for merchant
 */
router.get('/config', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001'

    const config = {
      shopifyWebhookUrl: `${baseUrl}/api/webhooks/shopify`,
      woocommerceWebhookUrl: `${baseUrl}/api/webhooks/woocommerce?merchant_id=${req.merchantId}`,
      webhookEvents: [
        'products/create',
        'products/update',
        'products/delete',
        'orders/create'
      ]
    }

    res.json({
      success: true,
      config
    })
  } catch (error) {
    next(error)
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sync product from e-commerce platform
 */
async function handleProductSync(merchantId: string, productData: any) {
  try {
    const externalId = productData.id?.toString() || productData.external_id

    if (!externalId) {
      console.error('Product sync failed: no external ID')
      return
    }

    // Map e-commerce product to our schema
    const mappedProduct = {
      externalId,
      name: productData.title || productData.name,
      description: productData.description || productData.body_html,
      imageUrl: productData.image?.src || productData.images?.[0]?.src || productData.image_url,
      price: parseFloat(productData.price || productData.variants?.[0]?.price || '0'),
      currency: productData.currency || 'USD',
      sku: productData.sku || productData.variants?.[0]?.sku,
      metadata: {
        platform: productData.platform || 'unknown',
        variants: productData.variants,
        tags: productData.tags,
        vendor: productData.vendor
      }
    }

    // Upsert product
    await prisma.product.upsert({
      where: {
        merchantId_externalId: {
          merchantId,
          externalId
        }
      },
      update: mappedProduct,
      create: {
        merchantId,
        ...mappedProduct,
        category: 'OTHER' // TODO: Auto-categorize with AI
      }
    })

    console.log(`Product synced: ${mappedProduct.name}`)
  } catch (error) {
    console.error('Product sync error:', error)
  }
}

/**
 * Handle product deletion
 */
async function handleProductDelete(merchantId: string, externalId: string) {
  try {
    await prisma.product.updateMany({
      where: {
        merchantId,
        externalId
      },
      data: { isActive: false }
    })

    console.log(`Product deactivated: ${externalId}`)
  } catch (error) {
    console.error('Product deletion error:', error)
  }
}

/**
 * Handle order created - check for try-on conversions
 */
async function handleOrderCreated(merchantId: string, orderData: any) {
  try {
    const customerEmail = orderData.customer?.email || orderData.billing?.email

    if (!customerEmail) {
      return
    }

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: { email: customerEmail }
    })

    if (!customer) {
      return
    }

    // Find recent try-ons by this customer
    const recentTryOns = await prisma.tryOn.findMany({
      where: {
        merchantId,
        customerId: customer.id,
        converted: false,
        generatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })

    // Match products in order to try-ons
    const lineItems = orderData.line_items || orderData.items || []

    for (const tryOn of recentTryOns) {
      if (!tryOn.productId) continue

      const product = await prisma.product.findUnique({
        where: { id: tryOn.productId }
      })

      if (!product) continue

      // Check if this product is in the order
      const matchingItem = lineItems.find((item: any) => {
        const itemExternalId = item.product_id?.toString() || item.external_id
        return itemExternalId === product.externalId
      })

      if (matchingItem) {
        // Mark try-on as converted
        await prisma.tryOn.update({
          where: { id: tryOn.id },
          data: {
            converted: true,
            convertedAt: new Date(),
            purchaseAmount: parseFloat(matchingItem.price || matchingItem.total || '0')
          }
        })

        // Log conversion event
        await prisma.analyticsEvent.create({
          data: {
            merchantId,
            eventType: 'CONVERSION',
            eventData: {
              tryOnId: tryOn.id,
              orderId: orderData.id,
              productId: product.id
            }
          }
        })

        console.log(`Try-on converted: ${tryOn.id}`)
      }
    }
  } catch (error) {
    console.error('Order processing error:', error)
  }
}

export default router
