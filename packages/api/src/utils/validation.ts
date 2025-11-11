import { badRequest } from '../middleware/errorHandler.js'

/**
 * Validate email format
 */
export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw badRequest('Invalid email format')
  }
}

/**
 * Validate password strength
 */
export const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw badRequest('Password must be at least 8 characters long')
  }
  // Add more password requirements as needed
}

/**
 * Validate required fields
 */
export const validateRequired = (fields: Record<string, any>): void => {
  const missing = Object.entries(fields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key)

  if (missing.length > 0) {
    throw badRequest(`Missing required fields: ${missing.join(', ')}`)
  }
}

/**
 * Validate image file
 */
export const validateImageFile = (file: Express.Multer.File | undefined): void => {
  if (!file) {
    throw badRequest('Image file is required')
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw badRequest('Invalid image format. Allowed: JPEG, PNG, WebP')
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw badRequest('Image file too large. Maximum size: 10MB')
  }
}

/**
 * Validate product category
 */
export const validateProductCategory = (category: string): void => {
  const validCategories = [
    'TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'SHOES',
    'ACCESSORIES', 'ACTIVEWEAR', 'SWIMWEAR', 'FORMAL', 'CASUAL', 'OTHER'
  ]

  if (!validCategories.includes(category)) {
    throw badRequest(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
  }
}

/**
 * Validate price
 */
export const validatePrice = (price: number): void => {
  if (typeof price !== 'number' || price < 0) {
    throw badRequest('Price must be a positive number')
  }

  if (price > 1000000) {
    throw badRequest('Price exceeds maximum allowed value')
  }
}

/**
 * Validate URL format
 */
export const validateUrl = (url: string): void => {
  try {
    new URL(url)
  } catch {
    throw badRequest('Invalid URL format')
  }
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
}

/**
 * Validate pagination parameters
 */
export const validatePagination = (page?: string, limit?: string): { page: number; limit: number } => {
  const pageNum = page ? parseInt(page, 10) : 1
  const limitNum = limit ? parseInt(limit, 10) : 20

  if (isNaN(pageNum) || pageNum < 1) {
    throw badRequest('Page must be a positive integer')
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw badRequest('Limit must be between 1 and 100')
  }

  return { page: pageNum, limit: limitNum }
}

/**
 * Validate date range
 */
export const validateDateRange = (startDate?: string, endDate?: string): { start: Date; end: Date } => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate ? new Date(endDate) : new Date()

  if (isNaN(start.getTime())) {
    throw badRequest('Invalid start date format')
  }

  if (isNaN(end.getTime())) {
    throw badRequest('Invalid end date format')
  }

  if (start > end) {
    throw badRequest('Start date must be before end date')
  }

  return { start, end }
}
