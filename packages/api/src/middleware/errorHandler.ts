import { Request, Response, NextFunction } from 'express'

// Custom error class
export class ApiError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.path}`)
  next(error)
}

// Global error handler
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'
  let isOperational = false

  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
    isOperational = err.isOperational
  }

  // Log error
  console.error('='.repeat(60))
  console.error('❌ Error:', err.message)
  console.error('Path:', req.method, req.path)
  console.error('Stack:', err.stack)
  console.error('='.repeat(60))

  // Store error message for logging
  (res as any).errorMessage = message

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  })
}

// Error factory functions
export const badRequest = (message: string) => new ApiError(400, message)
export const unauthorized = (message: string) => new ApiError(401, message)
export const forbidden = (message: string) => new ApiError(403, message)
export const notFound = (message: string) => new ApiError(404, message)
export const conflict = (message: string) => new ApiError(409, message)
export const tooManyRequests = (message: string) => new ApiError(429, message)
export const internalError = (message: string) => new ApiError(500, message)
