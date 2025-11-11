import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // TODO: Check if user exists in database
    // TODO: Create user in database

    const hashedPassword = await bcrypt.hash(password, 10)

    // Mock user creation
    const userId = Date.now().toString()
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      success: true,
      token,
      user: { id: userId, email, name }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // TODO: Find user in database
    // TODO: Verify password

    // Mock login
    const userId = Date.now().toString()
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      success: true,
      token,
      user: { id: userId, email, name: 'Test User' }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
}
