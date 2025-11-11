import { Router } from 'express'
import { prisma } from '../utils/prisma.js'
import { verifyApiKey, AuthRequest } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

// GET /api/settings - Get widget settings
router.get('/', verifyApiKey, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.id

    let settings = await prisma.widgetSettings.findUnique({
      where: { merchantId },
    })

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.widgetSettings.create({
        data: { merchantId },
      })
    }

    res.json({ settings })
  } catch (error) {
    console.error('Error fetching widget settings:', error)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/settings - Update widget settings
router.put('/', verifyApiKey, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.id
    const {
      buttonText,
      buttonColor,
      buttonPosition,
      customCssSelector,
      requireEmail,
      showCompleteLook,
      enableSizeRecommendations,
    } = req.body

    const settings = await prisma.widgetSettings.upsert({
      where: { merchantId },
      update: {
        buttonText,
        buttonColor,
        buttonPosition,
        customCssSelector,
        requireEmail,
        showCompleteLook,
        enableSizeRecommendations,
      },
      create: {
        merchantId,
        buttonText,
        buttonColor,
        buttonPosition,
        customCssSelector,
        requireEmail,
        showCompleteLook,
        enableSizeRecommendations,
      },
    })

    res.json({ settings })
  } catch (error) {
    console.error('Error updating widget settings:', error)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// POST /api/settings/regenerate-api-key - Regenerate API key
router.post('/regenerate-api-key', verifyApiKey, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.id

    // Generate new API key
    const newApiKey = `rf_${crypto.randomBytes(32).toString('hex')}`

    const merchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKey: newApiKey },
      select: { id: true, email: true, businessName: true, apiKey: true, plan: true },
    })

    res.json({ merchant })
  } catch (error) {
    console.error('Error regenerating API key:', error)
    res.status(500).json({ error: 'Failed to regenerate API key' })
  }
})

export default router
