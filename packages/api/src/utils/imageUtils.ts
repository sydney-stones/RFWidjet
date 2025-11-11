import { badRequest } from '../middleware/errorHandler.js'
import fetch from 'node-fetch'

/**
 * Convert base64 string to Buffer
 */
export function base64ToBuffer(base64String: string): Buffer {
  try {
    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
    return Buffer.from(base64Data, 'base64')
  } catch (error) {
    throw badRequest('Invalid base64 image data')
  }
}

/**
 * Fetch image from URL and return Buffer
 */
export async function urlToBuffer(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    throw badRequest(`Failed to download image from URL: ${error}`)
  }
}

/**
 * Process image input (base64 or URL) and return Buffer
 */
export async function processImageInput(input: string): Promise<Buffer> {
  if (!input) {
    throw badRequest('Image input is required')
  }

  // Check if it's a base64 string
  if (input.startsWith('data:image/') || !input.startsWith('http')) {
    return base64ToBuffer(input)
  }

  // Otherwise, treat as URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return urlToBuffer(input)
  }

  throw badRequest('Image must be a base64 string or HTTP(S) URL')
}

/**
 * Validate image buffer size and format
 */
export function validateImageBuffer(buffer: Buffer, maxSizeMB: number = 5): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Check size
  if (buffer.length > maxSizeBytes) {
    throw badRequest(`Image size exceeds ${maxSizeMB}MB limit`)
  }

  // Check if it's a valid image (check magic numbers)
  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50

  if (!isJPEG && !isPNG && !isWEBP) {
    throw badRequest('Invalid image format. Supported formats: JPEG, PNG, WebP')
  }
}

/**
 * Get image MIME type from buffer
 */
export function getImageMimeType(buffer: Buffer): string {
  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50
  const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45

  if (isJPEG) return 'image/jpeg'
  if (isPNG) return 'image/png'
  if (isWEBP) return 'image/webp'

  return 'image/jpeg' // default
}
