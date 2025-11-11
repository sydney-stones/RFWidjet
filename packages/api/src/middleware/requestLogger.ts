import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)

  // Capture response
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime

    // Log to console
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusColor}${res.statusCode}\x1b[0m - ${responseTime}ms`
    )

    // Log to database (async, don't block response)
    try {
      const merchantId = (req as any).merchantId || null
      const apiKey = req.headers['x-api-key'] as string | undefined

      await prisma.apiLog.create({
        data: {
          merchantId,
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          responseTimeMs: responseTime,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          apiKey: apiKey?.substring(0, 10), // Store only prefix for security
          errorMessage: res.statusCode >= 400 ? (res as any).errorMessage : null
        }
      })
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log API request:', error)
    }
  })

  next()
}
