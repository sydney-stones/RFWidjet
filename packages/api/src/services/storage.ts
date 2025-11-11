import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName)
  const hash = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${hash}${ext}`
}

/**
 * Save image to local storage
 * In production, this should upload to S3 or similar
 */
export async function saveImage(
  buffer: Buffer,
  originalName: string,
  folder: 'inputs' | 'outputs' | 'products' = 'inputs'
): Promise<string> {
  await ensureUploadDir()

  const folderPath = path.join(UPLOAD_DIR, folder)
  await fs.mkdir(folderPath, { recursive: true })

  const filename = generateFilename(originalName)
  const filePath = path.join(folderPath, filename)

  await fs.writeFile(filePath, buffer)

  // Return URL path
  return `${BASE_URL}/uploads/${folder}/${filename}`
}

/**
 * Save multiple images
 */
export async function saveImages(
  files: Array<{ buffer: Buffer; originalName: string }>,
  folder: 'inputs' | 'outputs' | 'products' = 'inputs'
): Promise<string[]> {
  return Promise.all(
    files.map(file => saveImage(file.buffer, file.originalName, folder))
  )
}

/**
 * Delete image from storage
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname
    const filePath = path.join(process.cwd(), urlPath)

    await fs.unlink(filePath)
  } catch (error) {
    console.error('Failed to delete image:', error)
    // Don't throw - deletion failures shouldn't break the application
  }
}

/**
 * Get image buffer from URL or file path
 */
export async function getImageBuffer(imageUrl: string): Promise<Buffer> {
  try {
    // Check if it's a local file
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const urlPath = new URL(imageUrl).pathname
      const filePath = path.join(process.cwd(), urlPath)
      return await fs.readFile(filePath)
    } else {
      return await fs.readFile(imageUrl)
    }
  } catch (error) {
    throw new Error(`Failed to read image: ${error}`)
  }
}

/**
 * Validate image dimensions (optional - requires sharp library)
 */
export async function validateImageDimensions(
  buffer: Buffer,
  minWidth: number = 512,
  minHeight: number = 512
): Promise<{ width: number; height: number }> {
  // TODO: Implement with sharp if needed
  // For now, just return dummy dimensions
  return { width: 1024, height: 1024 }
}

/**
 * Optimize image (resize, compress)
 * TODO: Implement with sharp library for production
 */
export async function optimizeImage(
  buffer: Buffer,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
  quality: number = 85
): Promise<Buffer> {
  // For now, just return original buffer
  // In production, use sharp to resize and compress
  return buffer
}

// ============================================================================
// AWS S3 Integration (for production)
// ============================================================================

/**
 * Upload to S3 (placeholder for production implementation)
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  folder: string
): Promise<string> {
  // TODO: Implement S3 upload
  // const s3 = new S3Client({ region: process.env.AWS_REGION })
  // const command = new PutObjectCommand({
  //   Bucket: process.env.AWS_S3_BUCKET,
  //   Key: `${folder}/${filename}`,
  //   Body: buffer,
  //   ContentType: 'image/jpeg'
  // })
  // await s3.send(command)
  // return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${folder}/${filename}`

  throw new Error('S3 upload not implemented yet')
}

/**
 * Delete from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  // TODO: Implement S3 deletion
  throw new Error('S3 deletion not implemented yet')
}
