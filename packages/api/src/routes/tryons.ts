import express, { Response, NextFunction } from 'express'
import multer from 'multer'
import { prisma } from '../utils/prisma.js'
import { verifyApiKey, AuthRequest } from '../middleware/auth.js'
import { checkRateLimit } from '../middleware/rateLimit.js'
import { validateImageFile, validateRequired } from '../utils/validation.js'
import { badRequest } from '../middleware/errorHandler.js'
import { generateTryOn } from '../services/gemini.js'
import { saveImage } from '../services/storage.js'
import { trackUsage } from '../services/billing.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2
  }
})

/**
 * POST /api/tryons
 * Create a new virtual try-on
 */
router.post(
  '/',
  verifyApiKey,
  checkRateLimit,
  upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'garmentImage', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const { productId, customerId, customerEmail } = req.body

      // Validate required files
      if (!files.personImage || !files.personImage[0]) {
        throw badRequest('Person image is required')
      }

      if (!files.garmentImage || !files.garmentImage[0]) {
        throw badRequest('Garment image is required')
      }

      const personFile = files.personImage[0]
      const garmentFile = files.garmentImage[0]

      // Validate image files
      validateImageFile(personFile)
      validateImageFile(garmentFile)

      // Save input images
      const personImageUrl = await saveImage(personFile.buffer, personFile.originalname, 'inputs')
      const garmentImageUrl = await saveImage(garmentFile.buffer, garmentFile.originalname, 'inputs')

      // Generate try-on with Gemini AI
      const { resultBuffer, processingTimeMs } = await generateTryOn(
        personFile.buffer,
        garmentFile.buffer
      )

      // Save output image
      const outputImageUrl = await saveImage(resultBuffer, 'result.jpg', 'outputs')

      // Find or create customer
      let customer
      if (customerId) {
        customer = await prisma.customer.findUnique({
          where: { id: customerId }
        })
      } else if (customerEmail) {
        customer = await prisma.customer.upsert({
          where: { email: customerEmail },
          update: { lastSeen: new Date() },
          create: { email: customerEmail }
        })
      } else {
        // Create anonymous customer
        customer = await prisma.customer.create({
          data: {
            anonymousId: `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`
          }
        })
      }

      // Create try-on record
      const tryOn = await prisma.tryOn.create({
        data: {
          customerId: customer.id,
          productId: productId || null,
          merchantId: req.merchantId!,
          inputImageUrl: personImageUrl,
          outputImageUrl,
          processingTimeMs
        }
      })

      // Track usage for billing
      await trackUsage(req.merchantId!)

      // Log analytics event
      await prisma.analyticsEvent.create({
        data: {
          merchantId: req.merchantId!,
          eventType: 'TRY_ON_COMPLETED',
          eventData: {
            tryOnId: tryOn.id,
            productId,
            processingTimeMs
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      })

      res.json({
        success: true,
        tryOn: {
          id: tryOn.id,
          outputImageUrl: tryOn.outputImageUrl,
          processingTimeMs: tryOn.processingTimeMs
        }
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/tryons
 * List try-ons for merchant
 */
router.get('/', verifyApiKey, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', productId } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    const where = {
      merchantId: req.merchantId!,
      ...(productId && { productId: productId as string })
    }

    const [tryOns, total] = await Promise.all([
      prisma.tryOn.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          },
          customer: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.tryOn.count({ where })
    ])

    res.json({
      success: true,
      tryOns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/tryons/:id
 * Get a specific try-on
 */
router.get('/:id', verifyApiKey, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const tryOn = await prisma.tryOn.findFirst({
      where: {
        id,
        merchantId: req.merchantId!
      },
      include: {
        product: true,
        customer: {
          select: {
            id: true,
            email: true,
            bodyProfile: true
          }
        }
      }
    })

    if (!tryOn) {
      throw badRequest('Try-on not found')
    }

    res.json({
      success: true,
      tryOn
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/tryons/:id/conversion
 * Mark try-on as converted (customer purchased)
 */
router.patch('/:id/conversion', verifyApiKey, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { purchaseAmount } = req.body

    const tryOn = await prisma.tryOn.update({
      where: { id },
      data: {
        converted: true,
        convertedAt: new Date(),
        purchaseAmount: purchaseAmount ? parseFloat(purchaseAmount) : null
      }
    })

    // Log conversion event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: req.merchantId!,
        eventType: 'CONVERSION',
        eventData: {
          tryOnId: id,
          purchaseAmount
        }
      }
    })

    res.json({
      success: true,
      tryOn
    })
  } catch (error) {
    next(error)
  }
})

export default router
