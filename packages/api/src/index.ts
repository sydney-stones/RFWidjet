import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import tryOnRoutes from './routes/try-on.js'
import authRoutes from './routes/auth.js'
import apiKeyRoutes from './routes/api-keys.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/try-on', tryOnRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/api-keys', apiKeyRoutes)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
})
