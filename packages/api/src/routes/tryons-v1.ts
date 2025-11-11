import express, { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { badRequest, unauthorized, tooManyRequests, internalError } from '../middleware/errorHandler.js'
import { validateRequired } from '../utils/validation.js'
import { processImageInput, validateImageBuffer } from '../utils/imageUtils.js'
import { generateTryOn, extractSizeRecommendation, isGeminiConfigured } from '../services/gemini.js'
import { saveImage } from '../services/storage.js'
import { trackUsage, getCurrentUsage } from '../services/billing.js'
import { SubscriptionPlan } from '@prisma/client'

const router = express.Router()

// Plan limits per month
const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.ATELIER]: 500,
  [SubscriptionPlan.MAISON]: 2000,
  [SubscriptionPlan.COUTURE]: 5000
}

/**
 * POST /api/v1/tryons/generate
 * Core try-on generation endpoint
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  let merchantId: string | null = null

  try {
    const {
      apiKey,
      customerId,
      customerPhoto,
      productId,
      options = {}
    } = req.body

    // ========================================================================
    // 1. VERIFY MERCHANT API KEY AND CHECK USAGE LIMITS
    // ========================================================================

    validateRequired({ apiKey, customerPhoto, productId })

    // Validate API key format
    if (!apiKey.startsWith('rfts_')) {
      throw unauthorized('Invalid API key format')
    }

    // Fetch merchant by API key
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: {
        id: true,
        businessName: true,
        plan: true,
        subscriptionStatus: true,
        email: true
      }
    })

    if (!merchant) {
      throw unauthorized('Invalid API key')
    }

    merchantId = merchant.id

    // Check subscription status
    if (merchant.subscriptionStatus === 'SUSPENDED') {
      throw unauthorized('Account suspended - please contact support')
    }

    if (merchant.subscriptionStatus === 'CANCELED') {
      throw unauthorized('Subscription canceled - please reactivate your account')
    }

    if (merchant.subscriptionStatus === 'PAST_DUE') {
      throw unauthorized('Payment past due - please update your payment method')
    }

    // Check usage limits
    const monthlyLimit = PLAN_LIMITS[merchant.plan]
    const currentUsage = await getCurrentUsage(merchant.id)

    if (currentUsage.used >= monthlyLimit) {
      throw tooManyRequests(
        `Monthly try-on limit exceeded (${monthlyLimit} try-ons). Please upgrade your plan or wait until next month.`
      )
    }

    // ========================================================================
    // 2. VALIDATE INPUTS
    // ========================================================================

    // Process customer photo (base64 or URL)
    let customerPhotoBuffer: Buffer
    try {
      customerPhotoBuffer = await processImageInput(customerPhoto)
      validateImageBuffer(customerPhotoBuffer, 5) // 5MB limit
    } catch (error) {
      throw badRequest(`Invalid customer photo: ${(error as Error).message}`)
    }

    // ========================================================================
    // 3. FETCH PRODUCT DETAILS FROM DATABASE
    // ========================================================================

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id,
        isActive: true
      }
    })

    if (!product) {
      throw badRequest('Product not found or inactive')
    }

    // Download product image
    let productImageBuffer: Buffer
    try {
      productImageBuffer = await processImageInput(product.imageUrl)
      validateImageBuffer(productImageBuffer, 5)
    } catch (error) {
      throw badRequest(`Failed to load product image: ${(error as Error).message}`)
    }

    // ========================================================================
    // 4. CALL GEMINI AI FOR TRY-ON GENERATION
    // ========================================================================

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      throw internalError('AI service not configured. Please contact support.')
    }

    // Log try-on started event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: merchant.id,
        eventType: 'TRY_ON_STARTED',
        eventData: {
          productId: product.id,
          customerId,
          quality: options.quality || 'standard'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    })

    let tryOnResult
    try {
      tryOnResult = await generateTryOn(
        customerPhotoBuffer,
        productImageBuffer,
        {
          quality: options.quality || 'standard',
          background: 'studio'
        }
      )
    } catch (error) {
      // Log failure event
      await prisma.analyticsEvent.create({
        data: {
          merchantId: merchant.id,
          eventType: 'TRY_ON_FAILED',
          eventData: {
            productId: product.id,
            error: (error as Error).message
          }
        }
      })

      throw internalError(`AI generation failed: ${(error as Error).message}`)
    }

    // ========================================================================
    // 5. SAVE GENERATED IMAGE
    // ========================================================================

    const inputImageUrl = await saveImage(
      customerPhotoBuffer,
      `customer-${Date.now()}.jpg`,
      'inputs'
    )

    const outputImageUrl = await saveImage(
      tryOnResult.resultBuffer,
      `tryon-${Date.now()}.jpg`,
      'outputs'
    )

    // Extract size recommendation from AI analysis
    const recommendedSize = extractSizeRecommendation(tryOnResult.analysis)

    // ========================================================================
    // 6. FIND OR CREATE CUSTOMER
    // ========================================================================

    let customer
    if (customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (customer) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { lastSeen: new Date() }
        })
      }
    }

    if (!customer) {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          anonymousId: `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          ...(options.saveToProfile && { photoUrl: inputImageUrl })
        }
      })
    }

    // ========================================================================
    // 7. RECORD TRY-ON EVENT IN DATABASE
    // ========================================================================

    const tryOn = await prisma.tryOn.create({
      data: {
        customerId: customer.id,
        productId: product.id,
        merchantId: merchant.id,
        inputImageUrl,
        outputImageUrl,
        processingTimeMs: tryOnResult.processingTimeMs
      }
    })

    // ========================================================================
    // 8. UPDATE MERCHANT USAGE COUNTER
    // ========================================================================

    await trackUsage(merchant.id)

    // Get updated usage
    const updatedUsage = await getCurrentUsage(merchant.id)

    // Log success event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: merchant.id,
        eventType: 'TRY_ON_COMPLETED',
        eventData: {
          tryOnId: tryOn.id,
          productId: product.id,
          customerId: customer.id,
          processingTimeMs: tryOnResult.processingTimeMs,
          recommendedSize
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    })

    // ========================================================================
    // 9. RETURN RESPONSE
    // ========================================================================

    res.json({
      success: true,
      tryonId: tryOn.id,
      imageUrl: outputImageUrl,
      recommendedSize,
      usageRemaining: updatedUsage.remaining,
      processingTimeMs: tryOnResult.processingTimeMs,
      metadata: {
        customerId: customer.id,
        productId: product.id,
        productName: product.name,
        quality: options.quality || 'standard'
      }
    })
  } catch (error) {
    // Log error if we have merchantId
    if (merchantId) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            merchantId,
            eventType: 'TRY_ON_FAILED',
            eventData: {
              error: (error as Error).message,
              stack: (error as Error).stack
            }
          }
        })
      } catch (logError) {
        console.error('Failed to log error event:', logError)
      }
    }

    next(error)
  }
})

/**
 * GET /api/v1/tryons/:id
 * Get try-on details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { apiKey } = req.query

    if (!apiKey || typeof apiKey !== 'string') {
      throw unauthorized('API key required')
    }

    // Verify API key
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey }
    })

    if (!merchant) {
      throw unauthorized('Invalid API key')
    }

    // Fetch try-on
    const tryOn = await prisma.tryOn.findFirst({
      where: {
        id,
        merchantId: merchant.id
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            category: true
          }
        },
        customer: {
          select: {
            id: true,
            email: true
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

export default router
