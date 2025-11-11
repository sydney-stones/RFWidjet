import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import crypto from 'crypto'

export const listApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Fetch from database
    const apiKeys = [
      {
        id: '1',
        name: 'Production Store',
        key: 'rfts_prod_xxxxxxxxxx',
        createdAt: new Date().toISOString()
      }
    ]

    res.json({ apiKeys })
  } catch (error) {
    console.error('List API keys error:', error)
    res.status(500).json({ error: 'Failed to fetch API keys' })
  }
}

export const createApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Generate API key
    const key = `rfts_${crypto.randomBytes(32).toString('hex')}`

    // TODO: Save to database
    const apiKey = {
      id: Date.now().toString(),
      name,
      key,
      userId: req.userId,
      createdAt: new Date().toISOString()
    }

    res.json({ success: true, apiKey })
  } catch (error) {
    console.error('Create API key error:', error)
    res.status(500).json({ error: 'Failed to create API key' })
  }
}

export const deleteApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // TODO: Delete from database

    res.json({ success: true, message: 'API key deleted' })
  } catch (error) {
    console.error('Delete API key error:', error)
    res.status(500).json({ error: 'Failed to delete API key' })
  }
}
