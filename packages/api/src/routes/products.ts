import express, { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'
import { validateRequired, validatePrice, validatePagination } from '../utils/validation.js'
import { badRequest, notFound } from '../middleware/errorHandler.js'
import { ProductCategory } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { optimizeImage, bufferToDataUrl } from '../utils/imageOptimizer.js'

const router = express.Router()

/**
 * GET /api/products
 * List merchant's products
 */
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = validatePagination(req.query.page as string, req.query.limit as string)
    const { category, isActive, search } = req.query

    const skip = (page - 1) * limit

    const where: any = {
      merchantId: req.merchantId!,
      ...(category && { category: category as ProductCategory }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    }

    // Search by name or sku
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      externalId,
      name,
      description,
      imageUrl,
      price,
      currency = 'USD',
      category = 'OTHER',
      sku,
      metadata
    } = req.body

    // Validate required fields
    validateRequired({ externalId, name, imageUrl, price })
    validatePrice(price)

    // Check for duplicate externalId
    const existing = await prisma.product.findUnique({
      where: {
        merchantId_externalId: {
          merchantId: req.merchantId!,
          externalId
        }
      }
    })

    if (existing) {
      throw badRequest(`Product with externalId "${externalId}" already exists`)
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        merchantId: req.merchantId!,
        externalId,
        name,
        description,
        imageUrl,
        price,
        currency,
        category,
        sku,
        metadata
      }
    })

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: req.merchantId!,
        eventType: 'PRODUCT_ADDED',
        eventData: { productId: product.id, externalId }
      }
    })

    res.status(201).json({
      success: true,
      product
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/products/bulk
 * Bulk import products (e.g., from e-commerce platform)
 */
router.post('/bulk', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { products } = req.body

    if (!Array.isArray(products) || products.length === 0) {
      throw badRequest('Products array is required')
    }

    if (products.length > 100) {
      throw badRequest('Maximum 100 products per bulk import')
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as any[]
    }

    for (const productData of products) {
      try {
        const { externalId, name, imageUrl, price, ...rest } = productData

        validateRequired({ externalId, name, imageUrl, price })
        validatePrice(price)

        await prisma.product.upsert({
          where: {
            merchantId_externalId: {
              merchantId: req.merchantId!,
              externalId
            }
          },
          update: {
            name,
            imageUrl,
            price,
            ...rest
          },
          create: {
            merchantId: req.merchantId!,
            externalId,
            name,
            imageUrl,
            price,
            currency: rest.currency || 'USD',
            category: rest.category || 'OTHER',
            ...rest
          }
        })

        results.created++
      } catch (error) {
        results.errors.push({
          product: productData,
          error: (error as Error).message
        })
      }
    }

    res.json({
      success: true,
      results
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/products/:id
 * Get a specific product
 */
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findFirst({
      where: {
        id,
        merchantId: req.merchantId!
      },
      include: {
        _count: {
          select: { tryOns: true }
        }
      }
    })

    if (!product) {
      throw notFound('Product not found')
    }

    res.json({
      success: true,
      product
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, description, imageUrl, price, category, sku, metadata, isActive } = req.body

    // Check product exists and belongs to merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        merchantId: req.merchantId!
      }
    })

    if (!existingProduct) {
      throw notFound('Product not found')
    }

    // Validate price if provided
    if (price !== undefined) {
      validatePrice(price)
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl && { imageUrl }),
        ...(price !== undefined && { price }),
        ...(category && { category }),
        ...(sku !== undefined && { sku }),
        ...(metadata !== undefined && { metadata }),
        ...(isActive !== undefined && { isActive })
      }
    })

    res.json({
      success: true,
      product
    })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/products/:id
 * Delete a product (soft delete)
 */
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Soft delete by setting isActive to false
    const product = await prisma.product.updateMany({
      where: {
        id,
        merchantId: req.merchantId!
      },
      data: { isActive: false }
    })

    if (product.count === 0) {
      throw notFound('Product not found')
    }

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: req.merchantId!,
        eventType: 'PRODUCT_REMOVED',
        eventData: { productId: id }
      }
    })

    res.json({
      success: true,
      message: 'Product deactivated'
    })
  } catch (error) {
    next(error)
  }
})

// ============================================================================
// UNIVERSAL IMPORT SYSTEM (Non-Shopify merchants)
// ============================================================================

/**
 * POST /api/v1/products/import
 * Bulk import products via CSV or JSON
 */
router.post('/v1/import', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { format, data } = req.body

    if (!format || !data) {
      throw badRequest('format and data are required')
    }

    let products: any[] = []

    // Parse CSV or JSON
    if (format === 'csv') {
      try {
        const records = parse(data, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
        products = records
      } catch (error) {
        throw badRequest('Invalid CSV format')
      }
    } else if (format === 'json') {
      try {
        products = typeof data === 'string' ? JSON.parse(data) : data
      } catch (error) {
        throw badRequest('Invalid JSON format')
      }
    } else {
      throw badRequest('format must be "csv" or "json"')
    }

    if (!Array.isArray(products) || products.length === 0) {
      throw badRequest('No products to import')
    }

    console.log(`📦 Importing ${products.length} products for merchant ${req.merchantId}`)

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    }

    for (const productData of products) {
      try {
        const { externalId, name, imageUrl, price, category, description, sku } = productData

        // Validate required fields
        if (!externalId || !name || !imageUrl || !price) {
          results.errors.push({
            product: productData,
            error: 'Missing required fields: externalId, name, imageUrl, price',
          })
          results.skipped++
          continue
        }

        validatePrice(parseFloat(price))

        // Optimize image if needed
        let optimizedImageUrl = imageUrl
        if (imageUrl.startsWith('http')) {
          try {
            const optimizedBuffer = await optimizeImage(imageUrl)
            optimizedImageUrl = bufferToDataUrl(optimizedBuffer)
            console.log(`✓ Optimized image for ${name}`)
          } catch (error) {
            console.warn(`⚠ Failed to optimize image for ${name}, using original`)
          }
        }

        // Upsert product
        const existing = await prisma.product.findUnique({
          where: {
            merchantId_externalId: {
              merchantId: req.merchantId!,
              externalId,
            },
          },
        })

        await prisma.product.upsert({
          where: {
            merchantId_externalId: {
              merchantId: req.merchantId!,
              externalId,
            },
          },
          update: {
            name,
            imageUrl: optimizedImageUrl,
            price: parseFloat(price),
            ...(description && { description }),
            ...(category && { category: category as ProductCategory }),
            ...(sku && { sku }),
          },
          create: {
            merchantId: req.merchantId!,
            externalId,
            name,
            imageUrl: optimizedImageUrl,
            price: parseFloat(price),
            currency: 'USD',
            category: (category as ProductCategory) || 'OTHER',
            description,
            sku,
          },
        })

        if (existing) {
          results.updated++
        } else {
          results.created++
        }
      } catch (error) {
        results.errors.push({
          product: productData,
          error: (error as Error).message,
        })
        results.skipped++
      }
    }

    console.log(`✓ Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`)

    res.json({
      success: true,
      results,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/products/sync-url
 * Sync products from external feed URL (JSON or XML)
 */
router.post('/v1/sync-url', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { url, format } = req.body

    if (!url) {
      throw badRequest('url is required')
    }

    console.log(`🔄 Fetching product feed from: ${url}`)

    // Fetch feed
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'RenderedFits-ProductSync/1.0',
      },
    })

    let products: any[] = []

    // Parse based on format or content type
    const contentType = response.headers['content-type'] || ''
    const detectedFormat = format || (contentType.includes('xml') ? 'xml' : 'json')

    if (detectedFormat === 'xml') {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      })
      const parsed = parser.parse(response.data)

      // Try to find products array in common feed structures
      products = parsed.products?.product || parsed.feed?.entry || parsed.rss?.channel?.item || []
      if (!Array.isArray(products)) {
        products = [products]
      }
    } else {
      // JSON
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
      products = data.products || data.items || data
      if (!Array.isArray(products)) {
        products = [products]
      }
    }

    if (products.length === 0) {
      throw badRequest('No products found in feed')
    }

    console.log(`📦 Found ${products.length} products in feed`)

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    }

    for (const item of products) {
      try {
        // Map common feed formats to our schema
        const productData = {
          externalId: item.id || item.product_id || item.sku || item.gtin,
          name: item.name || item.title || item.product_name,
          imageUrl: item.image_url || item.image || item.imageUrl || item.img,
          price: item.price || item.sale_price || item.cost,
          description: item.description || item.desc,
          category: item.category || item.product_type,
          sku: item.sku,
        }

        if (!productData.externalId || !productData.name || !productData.imageUrl || !productData.price) {
          results.errors.push({
            product: item,
            error: 'Missing required fields in feed item',
          })
          results.skipped++
          continue
        }

        validatePrice(parseFloat(productData.price))

        // Optimize image
        let optimizedImageUrl = productData.imageUrl
        if (productData.imageUrl.startsWith('http')) {
          try {
            const optimizedBuffer = await optimizeImage(productData.imageUrl)
            optimizedImageUrl = bufferToDataUrl(optimizedBuffer)
          } catch (error) {
            console.warn(`⚠ Failed to optimize image for ${productData.name}`)
          }
        }

        const existing = await prisma.product.findUnique({
          where: {
            merchantId_externalId: {
              merchantId: req.merchantId!,
              externalId: productData.externalId,
            },
          },
        })

        await prisma.product.upsert({
          where: {
            merchantId_externalId: {
              merchantId: req.merchantId!,
              externalId: productData.externalId,
            },
          },
          update: {
            name: productData.name,
            imageUrl: optimizedImageUrl,
            price: parseFloat(productData.price),
            ...(productData.description && { description: productData.description }),
            ...(productData.category && { category: productData.category as ProductCategory }),
            ...(productData.sku && { sku: productData.sku }),
          },
          create: {
            merchantId: req.merchantId!,
            externalId: productData.externalId,
            name: productData.name,
            imageUrl: optimizedImageUrl,
            price: parseFloat(productData.price),
            currency: 'USD',
            category: (productData.category as ProductCategory) || 'OTHER',
            description: productData.description,
            sku: productData.sku,
          },
        })

        if (existing) {
          results.updated++
        } else {
          results.created++
        }
      } catch (error) {
        results.errors.push({
          product: item,
          error: (error as Error).message,
        })
        results.skipped++
      }
    }

    console.log(`✓ Sync complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`)

    res.json({
      success: true,
      results,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/products/webhook
 * Generic webhook receiver for WooCommerce, Magento, etc.
 */
router.post('/v1/webhook', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const webhookData = req.body
    const platform = (req.headers['x-platform'] || req.body.platform || 'generic') as string

    console.log(`📡 Webhook received from ${platform}`)

    let productData: any = {}

    // Parse different platform formats
    if (platform.toLowerCase().includes('woocommerce')) {
      // WooCommerce format
      productData = {
        externalId: webhookData.id?.toString(),
        name: webhookData.name,
        imageUrl: webhookData.images?.[0]?.src,
        price: webhookData.price || webhookData.regular_price,
        description: webhookData.description || webhookData.short_description,
        category: webhookData.categories?.[0]?.name,
        sku: webhookData.sku,
      }
    } else if (platform.toLowerCase().includes('magento')) {
      // Magento format
      productData = {
        externalId: webhookData.id?.toString() || webhookData.entity_id?.toString(),
        name: webhookData.name,
        imageUrl: webhookData.image || webhookData.small_image,
        price: webhookData.price,
        description: webhookData.description,
        sku: webhookData.sku,
      }
    } else if (platform.toLowerCase().includes('bigcommerce')) {
      // BigCommerce format
      productData = {
        externalId: webhookData.id?.toString(),
        name: webhookData.name,
        imageUrl: webhookData.images?.[0]?.url_standard,
        price: webhookData.price,
        description: webhookData.description,
        sku: webhookData.sku,
      }
    } else {
      // Generic format - expect standard fields
      productData = {
        externalId: webhookData.externalId || webhookData.id?.toString() || webhookData.product_id?.toString(),
        name: webhookData.name || webhookData.title,
        imageUrl: webhookData.imageUrl || webhookData.image,
        price: webhookData.price,
        description: webhookData.description,
        category: webhookData.category,
        sku: webhookData.sku,
      }
    }

    // Validate required fields
    if (!productData.externalId || !productData.name || !productData.price) {
      throw badRequest('Missing required fields: externalId, name, price')
    }

    validatePrice(parseFloat(productData.price))

    // Optimize image if URL provided
    let optimizedImageUrl = productData.imageUrl
    if (productData.imageUrl && productData.imageUrl.startsWith('http')) {
      try {
        const optimizedBuffer = await optimizeImage(productData.imageUrl)
        optimizedImageUrl = bufferToDataUrl(optimizedBuffer)
        console.log(`✓ Optimized image for ${productData.name}`)
      } catch (error) {
        console.warn(`⚠ Failed to optimize image for ${productData.name}`)
      }
    }

    // Upsert product
    const product = await prisma.product.upsert({
      where: {
        merchantId_externalId: {
          merchantId: req.merchantId!,
          externalId: productData.externalId,
        },
      },
      update: {
        name: productData.name,
        ...(optimizedImageUrl && { imageUrl: optimizedImageUrl }),
        price: parseFloat(productData.price),
        ...(productData.description && { description: productData.description }),
        ...(productData.category && { category: productData.category as ProductCategory }),
        ...(productData.sku && { sku: productData.sku }),
      },
      create: {
        merchantId: req.merchantId!,
        externalId: productData.externalId,
        name: productData.name,
        imageUrl: optimizedImageUrl || '',
        price: parseFloat(productData.price),
        currency: 'USD',
        category: (productData.category as ProductCategory) || 'OTHER',
        description: productData.description,
        sku: productData.sku,
      },
    })

    console.log(`✓ Product ${product.id} synced via webhook (${platform})`)

    res.json({
      success: true,
      product: {
        id: product.id,
        externalId: product.externalId,
        name: product.name,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
