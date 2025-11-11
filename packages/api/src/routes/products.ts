import express, { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'
import { validateRequired, validatePrice, validatePagination } from '../utils/validation.js'
import { badRequest, notFound } from '../middleware/errorHandler.js'
import { ProductCategory } from '@prisma/client'

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

export default router
