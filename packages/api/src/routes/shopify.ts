import { Router, Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import {
  getAuthorizationUrl,
  handleCallback,
  installIntegration,
  syncProducts,
  getIntegration,
  handleProductCreate,
  handleProductUpdate,
  handleOrderCreate,
  verifyWebhookHmac,
  isShopifyConfigured,
} from '../integrations/shopify.js'
import { prisma } from '../utils/prisma.js'

const router = Router()

/**
 * GET /api/integrations/shopify/auth
 * Start Shopify OAuth flow
 */
router.get('/auth', async (req: Request, res: Response) => {
  try {
    const { shop, merchantId } = req.query

    if (!shop || !merchantId) {
      return res.status(400).json({ error: 'shop and merchantId are required' })
    }

    if (!isShopifyConfigured()) {
      return res.status(500).json({ error: 'Shopify integration not configured' })
    }

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId as string },
    })

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' })
    }

    const authUrl = await getAuthorizationUrl(shop as string, merchantId as string)
    res.redirect(authUrl)
  } catch (error) {
    console.error('Shopify OAuth initiation error:', error)
    res.status(500).json({ error: 'Failed to initiate OAuth' })
  }
})

/**
 * GET /api/integrations/shopify/callback
 * Handle Shopify OAuth callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { shop, code, state } = req.query

    if (!shop || !code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Exchange code for access token
    const { merchantId, accessToken, scope } = await handleCallback(
      shop as string,
      code as string,
      state as string
    )

    // Install integration
    await installIntegration(merchantId, shop as string, accessToken, scope)

    // Redirect to success page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopify Integration Complete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #333; margin: 0 0 1rem 0; }
            p { color: #666; line-height: 1.6; }
            .success { color: #10b981; font-size: 4rem; margin-bottom: 1rem; }
            .button {
              display: inline-block;
              margin-top: 2rem;
              padding: 0.75rem 2rem;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 0.5rem;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Integration Complete!</h1>
            <p>Your Shopify store has been successfully connected to Rendered Fits. The widget is now active on your store.</p>
            <a href="https://${shop}/admin" class="button">Return to Shopify</a>
          </div>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Integration Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #dc2626; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Integration Failed</h1>
            <p>Something went wrong during the integration. Please try again or contact support.</p>
          </div>
        </body>
      </html>
    `)
  }
})

/**
 * POST /api/integrations/shopify/sync
 * Manually trigger product sync
 */
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant?.id

    if (!merchantId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const integration = await getIntegration(merchantId)

    if (!integration) {
      return res.status(404).json({ error: 'Shopify integration not found' })
    }

    const count = await syncProducts(merchantId, integration.shopDomain, integration.accessToken)

    res.json({
      success: true,
      syncedCount: count,
    })
  } catch (error) {
    console.error('Product sync error:', error)
    res.status(500).json({ error: 'Failed to sync products' })
  }
})

/**
 * GET /api/integrations/shopify/status
 * Get integration status
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant?.id

    if (!merchantId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const integration = await prisma.merchantIntegration.findUnique({
      where: {
        merchantId_platform: {
          merchantId,
          platform: 'shopify',
        },
      },
      select: {
        shopDomain: true,
        isActive: true,
        lastSyncAt: true,
        scriptTagId: true,
        webhookIds: true,
        createdAt: true,
      },
    })

    if (!integration) {
      return res.json({ connected: false })
    }

    res.json({
      connected: true,
      ...integration,
    })
  } catch (error) {
    console.error('Integration status error:', error)
    res.status(500).json({ error: 'Failed to get integration status' })
  }
})

export default router
