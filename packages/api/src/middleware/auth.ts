import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma.js'
import { unauthorized, forbidden } from './errorHandler.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Extend Request type to include merchant data
export interface AuthRequest extends Request {
  merchantId?: string
  merchant?: any
}

/**
 * Verify JWT token for merchant dashboard authentication
 */
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      throw unauthorized('Authentication token required')
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { merchantId: string }

    // Fetch merchant from database
    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        plan: true,
        subscriptionStatus: true,
        apiKey: true
      }
    })

    if (!merchant) {
      throw unauthorized('Invalid token - merchant not found')
    }

    // Check subscription status
    if (merchant.subscriptionStatus === 'SUSPENDED' || merchant.subscriptionStatus === 'CANCELED') {
      throw forbidden('Account suspended or canceled')
    }

    // Attach merchant to request
    req.merchantId = merchant.id
    req.merchant = merchant

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(unauthorized('Invalid token'))
    } else if (error instanceof jwt.TokenExpiredError) {
      next(unauthorized('Token expired'))
    } else {
      next(error)
    }
  }
}

/**
 * Verify API key for widget authentication
 */
export const verifyApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      throw unauthorized('API key required')
    }

    // Validate format
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
        allowedDomains: true,
        email: true
      }
    })

    if (!merchant) {
      throw unauthorized('Invalid API key')
    }

    // Check subscription status
    if (merchant.subscriptionStatus === 'SUSPENDED') {
      throw forbidden('Account suspended - please contact support')
    }

    if (merchant.subscriptionStatus === 'CANCELED') {
      throw forbidden('Subscription canceled - please reactivate your account')
    }

    if (merchant.subscriptionStatus === 'PAST_DUE') {
      throw forbidden('Payment past due - please update your payment method')
    }

    // Verify CORS origin if configured
    const origin = req.headers.origin
    if (origin && merchant.allowedDomains.length > 0) {
      const isAllowed = merchant.allowedDomains.some(domain =>
        origin.includes(domain.replace(/^https?:\/\//, ''))
      )

      if (!isAllowed) {
        throw forbidden(`Origin ${origin} not allowed for this API key`)
      }
    }

    // Attach merchant to request
    req.merchantId = merchant.id
    req.merchant = merchant

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Optional auth - doesn't fail if no token/key provided
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const apiKey = req.headers['x-api-key'] as string

    if (authHeader) {
      await verifyToken(req, res, next)
    } else if (apiKey) {
      await verifyApiKey(req, res, next)
    } else {
      next()
    }
  } catch (error) {
    // Ignore auth errors in optional mode
    next()
  }
}
