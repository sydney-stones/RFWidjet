import sharp from 'sharp'
import axios from 'axios'

const MAX_IMAGE_SIZE_KB = 500
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024

/**
 * Optimize image by URL or buffer
 * Compresses to JPEG format with quality adjustment to meet size target
 */
export async function optimizeImage(input: string | Buffer): Promise<Buffer> {
  try {
    let imageBuffer: Buffer

    // Download image if URL provided
    if (typeof input === 'string') {
      console.log(`📥 Downloading image: ${input.substring(0, 60)}...`)
      const response = await axios.get(input, {
        responseType: 'arraybuffer',
        timeout: 10000,
      })
      imageBuffer = Buffer.from(response.data)
    } else {
      imageBuffer = input
    }

    const originalSize = imageBuffer.length
    console.log(`📊 Original image size: ${(originalSize / 1024).toFixed(2)} KB`)

    // If already under size limit, return as-is
    if (originalSize <= MAX_IMAGE_SIZE_BYTES) {
      console.log(`✓ Image already optimized (${(originalSize / 1024).toFixed(2)} KB)`)
      return imageBuffer
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    console.log(`📐 Image dimensions: ${metadata.width}x${metadata.height}`)

    // Try different quality levels to meet size target
    let quality = 85
    let optimizedBuffer: Buffer

    while (quality >= 60) {
      optimizedBuffer = await sharp(imageBuffer)
        .resize({
          width: Math.min(metadata.width || 1200, 1200),
          height: Math.min(metadata.height || 1200, 1200),
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer()

      const optimizedSize = optimizedBuffer.length
      console.log(`🔄 Quality ${quality}: ${(optimizedSize / 1024).toFixed(2)} KB`)

      if (optimizedSize <= MAX_IMAGE_SIZE_BYTES) {
        const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)
        console.log(`✓ Image optimized: ${(optimizedSize / 1024).toFixed(2)} KB (saved ${savings}%)`)
        return optimizedBuffer
      }

      quality -= 5
    }

    // If still too large, resize more aggressively
    optimizedBuffer = await sharp(imageBuffer)
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 60, mozjpeg: true })
      .toBuffer()

    const finalSize = optimizedBuffer.length
    console.log(`✓ Image optimized (aggressive): ${(finalSize / 1024).toFixed(2)} KB`)
    return optimizedBuffer

  } catch (error) {
    console.error('❌ Image optimization failed:', error)
    throw new Error('Failed to optimize image')
  }
}

/**
 * Convert optimized buffer to data URL
 */
export function bufferToDataUrl(buffer: Buffer): string {
  const base64 = buffer.toString('base64')
  return `data:image/jpeg;base64,${base64}`
}

/**
 * Optimize image and return as data URL
 */
export async function optimizeImageToDataUrl(input: string | Buffer): Promise<string> {
  const optimizedBuffer = await optimizeImage(input)
  return bufferToDataUrl(optimizedBuffer)
}
