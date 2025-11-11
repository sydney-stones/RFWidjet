import express, { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../utils/prisma.js'
import { validateEmail, validatePassword, validateRequired } from '../utils/validation.ts'
import { badRequest, conflict, unauthorized } from '../middleware/errorHandler.js'
import { verifyToken, AuthRequest } from '../middleware/auth.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * POST /api/auth/register
 * Register a new merchant account
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, businessName, contactName, website } = req.body

    // Validate required fields
    validateRequired({ email, password, businessName })
    validateEmail(email)
    validatePassword(password)

    // Check if email already exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingMerchant) {
      throw conflict('Email already registered')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate unique API key
    const apiKey = `rfts_${crypto.randomBytes(32).toString('hex')}`

    // Create merchant with trial subscription
    const merchant = await prisma.merchant.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        businessName,
        contactName,
        website,
        apiKey,
        plan: 'ATELIER',
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        allowedDomains: website ? [website] : []
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        apiKey: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true
      }
    })

    // Generate JWT token
    const token = jwt.sign({ merchantId: merchant.id }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      success: true,
      token,
      merchant
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/login
 * Login merchant
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body

    validateRequired({ email, password })
    validateEmail(email)

    // Find merchant
    const merchant = await prisma.merchant.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!merchant) {
      throw unauthorized('Invalid email or password')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, merchant.password)

    if (!isValidPassword) {
      throw unauthorized('Invalid email or password')
    }

    // Update last login
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { lastLoginAt: new Date() }
    })

    // Generate JWT token
    const token = jwt.sign({ merchantId: merchant.id }, JWT_SECRET, { expiresIn: '7d' })

    // Return merchant data (excluding password)
    const { password: _, ...merchantData } = merchant

    res.json({
      success: true,
      token,
      merchant: merchantData
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/me
 * Get current merchant info
 */
router.get('/me', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        contactName: true,
        phone: true,
        website: true,
        logoUrl: true,
        apiKey: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        allowedDomains: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    })

    if (!merchant) {
      throw unauthorized('Merchant not found')
    }

    res.json({
      success: true,
      merchant
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/auth/profile
 * Update merchant profile
 */
router.put('/profile', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { businessName, contactName, phone, website, logoUrl } = req.body

    const merchant = await prisma.merchant.update({
      where: { id: req.merchantId },
      data: {
        ...(businessName && { businessName }),
        ...(contactName && { contactName }),
        ...(phone && { phone }),
        ...(website && { website }),
        ...(logoUrl && { logoUrl })
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        contactName: true,
        phone: true,
        website: true,
        logoUrl: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      merchant
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/regenerate-api-key
 * Regenerate API key
 */
router.post('/regenerate-api-key', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const newApiKey = `rfts_${crypto.randomBytes(32).toString('hex')}`

    const merchant = await prisma.merchant.update({
      where: { id: req.merchantId },
      data: { apiKey: newApiKey },
      select: { apiKey: true }
    })

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        merchantId: req.merchantId!,
        eventType: 'API_KEY_CREATED',
        eventData: { reason: 'regenerated' }
      }
    })

    res.json({
      success: true,
      apiKey: merchant.apiKey
    })
  } catch (error) {
    next(error)
  }
})

export default router
