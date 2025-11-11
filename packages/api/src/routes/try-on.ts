import express from 'express'
import multer from 'multer'
import { validateApiKey } from '../middleware/auth.js'
import { handleTryOn } from '../controllers/try-on.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

router.post(
  '/',
  validateApiKey,
  upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'garmentImage', maxCount: 1 }
  ]),
  handleTryOn
)

export default router
