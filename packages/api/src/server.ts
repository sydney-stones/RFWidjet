import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/errorHandler.js'

// Routes
import authRoutes from './routes/auth.js'
import tryonRoutes from './routes/tryons.js'
import tryonV1Routes from './routes/tryons-v1.js'
import productRoutes from './routes/products.js'
import analyticsRoutes from './routes/analytics.js'
import webhookRoutes from './routes/webhooks.js'

// Load environment variables
dotenv.config()

const app: Application = express()
const PORT = process.env.PORT || 3001

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}))

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  })
})

app.get('/', (req, res) => {
  res.json({
    name: 'Rendered Fits API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  })
})

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes)
app.use('/api/tryons', tryonRoutes)
app.use('/api/v1/tryons', tryonV1Routes)
app.use('/api/products', productRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/webhooks', webhookRoutes)

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// ============================================================================
// SERVER START
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('='.repeat(60))
  console.log(`🚀 Rendered Fits API Server`)
  console.log('='.repeat(60))
  console.log(`📍 URL: http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⏰ Started: ${new Date().toLocaleString()}`)
  console.log('='.repeat(60))
  console.log('\n✅ API endpoints:')
  console.log(`   GET  /health - Health check`)
  console.log(`   POST /api/auth/register - Register merchant`)
  console.log(`   POST /api/auth/login - Login merchant`)
  console.log(`   POST /api/v1/tryons/generate - Create virtual try-on (v1)`)
  console.log(`   POST /api/tryons - Create try-on`)
  console.log(`   GET  /api/products - List products`)
  console.log(`   GET  /api/analytics/stats - Dashboard stats`)
  console.log('\n')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

export default app
