import '@shopify/shopify-api/adapters/node'
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api'
import crypto from 'crypto'
import { prisma } from '../utils/prisma.js'

// Shopify App Configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ''
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ''
const SHOPIFY_SCOPES = ['read_products', 'write_products', 'read_orders', 'write_script_tags', 'write_webhooks']
const APP_URL = process.env.APP_URL || 'http://localhost:3001'
const WIDGET_CDN_URL = process.env.WIDGET_CDN_URL || 'https://cdn.renderedfits.com/widget.min.js'

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  scopes: SHOPIFY_SCOPES,
  hostName: APP_URL.replace(/^https?:\/\//, ''),
  apiVersion: ApiVersion.October23,
  isEmbeddedApp: false,
})

/**
 * Encrypt access token for storage
 */
function encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(SHOPIFY_API_SECRET, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypt access token from storage
 */
function decryptToken(encryptedToken: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(SHOPIFY_API_SECRET, 'salt', 32)
  const [ivHex, encrypted] = encryptedToken.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Generate OAuth authorization URL
 */
export async function getAuthorizationUrl(shop: string, merchantId: string): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${APP_URL}/api/integrations/shopify/callback`

  // Store state temporarily (in production, use Redis or database)
  // For now, we'll encode merchantId in the state
  const stateData = Buffer.from(JSON.stringify({ merchantId, nonce: state })).toString('base64')

  const authRoute = await shopify.auth.begin({
    shop: shopify.utils.sanitizeShop(shop, true) || '',
    callbackPath: redirectUri,
    isOnline: false, // Offline access for long-term token
    rawRequest: {} as any,
    rawResponse: {} as any,
  })

  return `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${stateData}`
}

/**
 * Handle OAuth callback and exchange code for access token
 */
export async function handleCallback(
  shop: string,
  code: string,
  state: string
): Promise<{ merchantId: string; accessToken: string; scope: string }> {
  // Decode state to get merchantId
  const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'))
  const { merchantId } = stateData

  // Exchange code for access token
  const session = await shopify.auth.callback({
    rawRequest: {
      url: `${APP_URL}/api/integrations/shopify/callback?shop=${shop}&code=${code}&state=${state}`,
    } as any,
    rawResponse: {} as any,
  })

  return {
    merchantId,
    accessToken: session.accessToken || '',
    scope: session.scope || '',
  }
}

/**
 * Install Shopify integration for a merchant
 */
export async function installIntegration(
  merchantId: string,
  shop: string,
  accessToken: string,
  scope: string
): Promise<void> {
  console.log(`📦 Installing Shopify integration for ${shop}`)

  const encryptedToken = encryptToken(accessToken)

  // Save integration to database
  const integration = await prisma.merchantIntegration.upsert({
    where: {
      merchantId_platform: {
        merchantId,
        platform: 'shopify',
      },
    },
    update: {
      shopDomain: shop,
      accessToken: encryptedToken,
      scope,
      isActive: true,
    },
    create: {
      merchantId,
      platform: 'shopify',
      shopDomain: shop,
      accessToken: encryptedToken,
      scope,
    },
  })

  console.log(`✓ Integration saved (ID: ${integration.id})`)

  // Register webhooks
  await registerWebhooks(merchantId, shop, accessToken)

  // Inject script tag
  await injectScriptTag(merchantId, shop, accessToken)

  // Initial product sync
  await syncProducts(merchantId, shop, accessToken)

  console.log(`✓ Shopify integration complete for ${shop}`)
}

/**
 * Register Shopify webhooks
 */
async function registerWebhooks(merchantId: string, shop: string, accessToken: string): Promise<void> {
  console.log('📡 Registering webhooks...')

  const webhooks = [
    { topic: 'products/create', address: `${APP_URL}/api/webhooks/shopify/products-create` },
    { topic: 'products/update', address: `${APP_URL}/api/webhooks/shopify/products-update` },
    { topic: 'orders/create', address: `${APP_URL}/api/webhooks/shopify/orders-create` },
  ]

  const client = new shopify.clients.Rest({ session: createSession(shop, accessToken) })
  const webhookIds: string[] = []

  for (const webhook of webhooks) {
    try {
      const response = await client.post({
        path: 'webhooks',
        data: {
          webhook: {
            topic: webhook.topic,
            address: webhook.address,
            format: 'json',
          },
        },
      })

      const webhookId = (response.body as any).webhook?.id
      if (webhookId) {
        webhookIds.push(webhookId)
        console.log(`✓ Registered webhook: ${webhook.topic} (ID: ${webhookId})`)
      }
    } catch (error) {
      console.error(`❌ Failed to register webhook ${webhook.topic}:`, error)
    }
  }

  // Update integration with webhook IDs
  await prisma.merchantIntegration.update({
    where: {
      merchantId_platform: {
        merchantId,
        platform: 'shopify',
      },
    },
    data: {
      webhookIds: webhookIds,
    },
  })
}

/**
 * Inject widget script tag into Shopify theme
 */
async function injectScriptTag(merchantId: string, shop: string, accessToken: string): Promise<void> {
  console.log('💉 Injecting script tag...')

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { apiKey: true },
  })

  if (!merchant) {
    throw new Error('Merchant not found')
  }

  const client = new shopify.clients.Rest({ session: createSession(shop, accessToken) })

  try {
    const response = await client.post({
      path: 'script_tags',
      data: {
        script_tag: {
          event: 'onload',
          src: `${WIDGET_CDN_URL}?api_key=${merchant.apiKey}`,
        },
      },
    })

    const scriptTagId = (response.body as any).script_tag?.id
    if (scriptTagId) {
      // Update integration with script tag ID
      await prisma.merchantIntegration.update({
        where: {
          merchantId_platform: {
            merchantId,
            platform: 'shopify',
          },
        },
        data: {
          scriptTagId: scriptTagId.toString(),
        },
      })

      console.log(`✓ Script tag injected (ID: ${scriptTagId})`)
    }
  } catch (error) {
    console.error('❌ Failed to inject script tag:', error)
    throw error
  }
}

/**
 * Sync products from Shopify to our database
 */
export async function syncProducts(merchantId: string, shop: string, accessToken: string): Promise<number> {
  console.log(`🔄 Syncing products from ${shop}...`)

  const client = new shopify.clients.Rest({ session: createSession(shop, accessToken) })
  let syncedCount = 0

  try {
    const response = await client.get({
      path: 'products',
      query: { limit: '250' },
    })

    const products = (response.body as any).products || []

    for (const shopifyProduct of products) {
      try {
        await prisma.product.upsert({
          where: {
            merchantId_externalId: {
              merchantId,
              externalId: shopifyProduct.id.toString(),
            },
          },
          update: {
            name: shopifyProduct.title,
            description: shopifyProduct.body_html,
            imageUrl: shopifyProduct.image?.src || shopifyProduct.images?.[0]?.src || '',
            price: parseFloat(shopifyProduct.variants?.[0]?.price || '0'),
            isActive: shopifyProduct.status === 'active',
            metadata: {
              shopifyData: {
                vendor: shopifyProduct.vendor,
                product_type: shopifyProduct.product_type,
                tags: shopifyProduct.tags,
              },
            },
          },
          create: {
            merchantId,
            externalId: shopifyProduct.id.toString(),
            name: shopifyProduct.title,
            description: shopifyProduct.body_html,
            imageUrl: shopifyProduct.image?.src || shopifyProduct.images?.[0]?.src || '',
            price: parseFloat(shopifyProduct.variants?.[0]?.price || '0'),
            sku: shopifyProduct.variants?.[0]?.sku,
            isActive: shopifyProduct.status === 'active',
            metadata: {
              shopifyData: {
                vendor: shopifyProduct.vendor,
                product_type: shopifyProduct.product_type,
                tags: shopifyProduct.tags,
              },
            },
          },
        })

        syncedCount++
      } catch (error) {
        console.error(`❌ Failed to sync product ${shopifyProduct.id}:`, error)
      }
    }

    // Update last sync timestamp
    await prisma.merchantIntegration.update({
      where: {
        merchantId_platform: {
          merchantId,
          platform: 'shopify',
        },
      },
      data: {
        lastSyncAt: new Date(),
      },
    })

    console.log(`✓ Synced ${syncedCount} products`)
    return syncedCount
  } catch (error) {
    console.error('❌ Product sync failed:', error)
    throw error
  }
}

/**
 * Handle products/create webhook
 */
export async function handleProductCreate(merchantId: string, productData: any): Promise<void> {
  console.log(`📦 Creating product: ${productData.title}`)

  await prisma.product.create({
    data: {
      merchantId,
      externalId: productData.id.toString(),
      name: productData.title,
      description: productData.body_html,
      imageUrl: productData.image?.src || productData.images?.[0]?.src || '',
      price: parseFloat(productData.variants?.[0]?.price || '0'),
      sku: productData.variants?.[0]?.sku,
      isActive: productData.status === 'active',
      metadata: {
        shopifyData: {
          vendor: productData.vendor,
          product_type: productData.product_type,
          tags: productData.tags,
        },
      },
    },
  })

  console.log(`✓ Product created`)
}

/**
 * Handle products/update webhook
 */
export async function handleProductUpdate(merchantId: string, productData: any): Promise<void> {
  console.log(`📝 Updating product: ${productData.title}`)

  await prisma.product.update({
    where: {
      merchantId_externalId: {
        merchantId,
        externalId: productData.id.toString(),
      },
    },
    data: {
      name: productData.title,
      description: productData.body_html,
      imageUrl: productData.image?.src || productData.images?.[0]?.src || '',
      price: parseFloat(productData.variants?.[0]?.price || '0'),
      isActive: productData.status === 'active',
      metadata: {
        shopifyData: {
          vendor: productData.vendor,
          product_type: productData.product_type,
          tags: productData.tags,
        },
      },
    },
  })

  console.log(`✓ Product updated`)
}

/**
 * Handle orders/create webhook - Track conversions
 */
export async function handleOrderCreate(merchantId: string, orderData: any): Promise<void> {
  console.log(`💰 Processing order: ${orderData.order_number}`)

  const customerEmail = orderData.customer?.email

  if (!customerEmail) {
    console.log('⚠ No customer email in order')
    return
  }

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { email: customerEmail },
  })

  if (!customer) {
    console.log(`⚠ Customer not found: ${customerEmail}`)
    return
  }

  // Get line items and match to try-ons
  const lineItems = orderData.line_items || []

  for (const item of lineItems) {
    const productId = item.product_id.toString()

    // Find product in our database
    const product = await prisma.product.findFirst({
      where: {
        merchantId,
        externalId: productId,
      },
    })

    if (!product) {
      continue
    }

    // Find recent try-ons for this customer + product
    const tryOn = await prisma.tryOn.findFirst({
      where: {
        customerId: customer.id,
        productId: product.id,
        merchantId,
        converted: false,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    })

    if (tryOn) {
      // Mark try-on as converted
      await prisma.tryOn.update({
        where: { id: tryOn.id },
        data: {
          converted: true,
          convertedAt: new Date(),
          purchaseAmount: parseFloat(item.price),
        },
      })

      console.log(`✓ Conversion tracked: Try-on ${tryOn.id} → Order ${orderData.order_number}`)

      // Track analytics event
      await prisma.analyticsEvent.create({
        data: {
          merchantId,
          eventType: 'CONVERSION',
          eventData: {
            tryOnId: tryOn.id,
            orderId: orderData.id.toString(),
            orderNumber: orderData.order_number,
            productId: product.id,
            amount: parseFloat(item.price),
          },
        },
      })
    }
  }
}

/**
 * Verify Shopify webhook HMAC
 */
export function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))
}

/**
 * Create Shopify session object
 */
function createSession(shop: string, accessToken: string): Session {
  return {
    id: `offline_${shop}`,
    shop,
    state: 'offline',
    isOnline: false,
    accessToken,
    scope: SHOPIFY_SCOPES.join(','),
  } as Session
}

/**
 * Get integration for merchant
 */
export async function getIntegration(merchantId: string): Promise<any> {
  const integration = await prisma.merchantIntegration.findUnique({
    where: {
      merchantId_platform: {
        merchantId,
        platform: 'shopify',
      },
    },
  })

  if (!integration) {
    return null
  }

  return {
    ...integration,
    accessToken: decryptToken(integration.accessToken),
  }
}

/**
 * Check if Shopify integration is configured
 */
export function isShopifyConfigured(): boolean {
  return !!SHOPIFY_API_KEY && !!SHOPIFY_API_SECRET && SHOPIFY_API_KEY !== '' && SHOPIFY_API_SECRET !== ''
}
