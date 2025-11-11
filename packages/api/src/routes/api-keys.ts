import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { createApiKey, listApiKeys, deleteApiKey } from '../controllers/api-keys.js'

const router = express.Router()

router.get('/', authenticate, listApiKeys)
router.post('/', authenticate, createApiKey)
router.delete('/:id', authenticate, deleteApiKey)

export default router
