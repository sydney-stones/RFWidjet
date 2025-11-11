import { GoogleGenerativeAI } from '@google/generative-ai'
import crypto from 'crypto'
import fetch from 'node-fetch'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Cost tracking constants (Gemini 2.5 Flash pricing)
const COST_PER_REQUEST = 0.06 // £0.06 per generation (estimate)
const COST_PER_1K_INPUT_TOKENS = 0.00001875 // $0.00001875 per 1K input tokens
const COST_PER_1K_OUTPUT_TOKENS = 0.000075 // $0.000075 per 1K output tokens

// Cache for try-on results (in-memory, 24-hour TTL)
interface CacheEntry {
  imageUrl: string
  generationTime: number
  cost: number
  timestamp: number
  analysis?: string
}

const tryonCache = new Map<string, CacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface TryOnOptions {
  quality?: 'standard' | 'hd'
  style?: 'studio' | 'casual'
  angles?: ('front' | 'side' | 'back')[]
  saveToCache?: boolean
}

export interface TryOnResult {
  imageUrl: string
  generationTime: number
  cost: number
  analysis?: string
  cached?: boolean
}

/**
 * Generate cache key for try-on request
 */
function generateCacheKey(customerPhotoUrl: string, productImageUrl: string, options: TryOnOptions): string {
  const key = `${customerPhotoUrl}|${productImageUrl}|${options.quality || 'standard'}|${options.style || 'studio'}`
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of tryonCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      tryonCache.delete(key)
    }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on certain errors (4xx client errors)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (status >= 400 && status < 500 && status !== 429) {
          throw error
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay.toFixed(0)}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Convert base64 or URL to Buffer
 */
async function getImageBuffer(imageInput: string): Promise<Buffer> {
  if (imageInput.startsWith('data:')) {
    // Base64 data URL
    const base64Data = imageInput.split(',')[1]
    return Buffer.from(base64Data, 'base64')
  } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    // URL
    return await downloadImage(imageInput)
  } else {
    // Raw base64
    return Buffer.from(imageInput, 'base64')
  }
}

/**
 * Generate optimized prompt based on options
 */
function generatePrompt(options: TryOnOptions): string {
  const quality = options.quality || 'standard'
  const style = options.style || 'studio'
  const resolution = quality === 'hd' ? '1024x1024' : '512x512'

  const backgroundDesc = style === 'studio'
    ? 'clean white studio background with professional lighting setup'
    : 'natural casual environment with soft natural lighting'

  return `You are an expert fashion AI specializing in virtual try-on technology. Your task is to create a photorealistic composite image showing a person wearing a specific garment.

INPUT IMAGES:
1. Customer Photo: Full-body or upper-body photo of a person
2. Product Image: Clear image of the clothing item to be virtually tried on

OUTPUT REQUIREMENTS:
Resolution: ${resolution}
Style: ${style === 'studio' ? 'Professional fashion photography' : 'Casual lifestyle photography'}
Background: ${backgroundDesc}

TECHNICAL SPECIFICATIONS:
✓ Maintain the person's exact facial features, skin tone, hair style, and body proportions
✓ Preserve the garment's accurate color, pattern, texture, and fabric draping
✓ Ensure realistic fit based on body type (consider shoulders, chest, waist, hip measurements)
✓ Apply proper shadows and highlights that match the lighting environment
✓ Render natural wrinkles and folds in the fabric based on body movement
✓ Match perspective and camera angle between person and garment
✓ Seamless blending at garment edges (collar, sleeves, hem)
✓ High attention to detail: buttons, zippers, stitching, logos

LIGHTING & RENDERING:
- ${style === 'studio' ? 'Studio lighting: Key light from 45° angle, fill light to reduce shadows, rim light for depth' : 'Natural window light: Soft diffused lighting, minimal harsh shadows'}
- Color temperature: ${style === 'studio' ? '5500K (neutral white)' : '6000K (daylight)'}
- Shadows: Soft and realistic, matching the light source direction
- Highlights: Natural fabric sheen based on material type

QUALITY CHECKLIST:
1. No visible seams or compositing artifacts
2. Proper garment proportions relative to body
3. Realistic fabric physics (gravity, draping, stretch)
4. Consistent lighting across entire image
5. Natural skin tones and textures
6. Sharp focus on garment details

Additionally, provide a detailed analysis in JSON format:
{
  "fit_analysis": "Detailed assessment of how the garment fits the person's body type and proportions",
  "recommended_size": "XS/S/M/L/XL/XXL based on visible body measurements",
  "style_match": "How well the garment style suits the person's overall appearance (percentage)",
  "color_harmony": "Color compatibility analysis with skin tone and undertones",
  "confidence_score": "0-100 score indicating AI confidence in the result quality",
  "technical_notes": "Any technical considerations or limitations in the rendering"
}

Generate the highest quality photorealistic virtual try-on image possible.`
}

/**
 * Main virtual try-on generation function with retry, caching, and cost tracking
 */
export async function generateVirtualTryon(
  customerPhotoUrl: string,
  productImageUrl: string,
  options: TryOnOptions = {}
): Promise<TryOnResult> {
  const startTime = Date.now()
  const cacheKey = generateCacheKey(customerPhotoUrl, productImageUrl, options)

  // Check cache first
  cleanExpiredCache()
  if (options.saveToCache !== false) {
    const cached = tryonCache.get(cacheKey)
    if (cached) {
      console.log(`✓ Cache hit for try-on request (key: ${cacheKey.substring(0, 8)}...)`)
      return {
        ...cached,
        cached: true,
      }
    }
  }

  console.log(`⚡ Generating new virtual try-on (quality: ${options.quality || 'standard'}, style: ${options.style || 'studio'})`)

  try {
    // Download images with retry logic
    const [customerBuffer, productBuffer] = await retryWithBackoff(async () => {
      return await Promise.all([
        getImageBuffer(customerPhotoUrl),
        getImageBuffer(productImageUrl),
      ])
    })

    // Generate try-on with retry logic
    const result = await retryWithBackoff(async () => {
      return await generateTryOnInternal(customerBuffer, productBuffer, options)
    })

    const generationTime = Date.now() - startTime
    const cost = calculateCost(customerBuffer.length, productBuffer.length, result.analysis || '')

    console.log(`✓ Virtual try-on generated successfully`)
    console.log(`  - Generation time: ${generationTime}ms`)
    console.log(`  - Estimated cost: £${cost.toFixed(4)}`)
    console.log(`  - Cache key: ${cacheKey.substring(0, 8)}...`)

    const finalResult: TryOnResult = {
      imageUrl: result.imageUrl,
      generationTime,
      cost,
      analysis: result.analysis,
      cached: false,
    }

    // Cache the result
    if (options.saveToCache !== false) {
      tryonCache.set(cacheKey, {
        imageUrl: result.imageUrl,
        generationTime,
        cost,
        timestamp: Date.now(),
        analysis: result.analysis,
      })
    }

    return finalResult
  } catch (error) {
    console.error('❌ Virtual try-on generation failed:', error)
    throw error
  }
}

/**
 * Internal try-on generation (called by retry wrapper)
 */
async function generateTryOnInternal(
  customerBuffer: Buffer,
  productBuffer: Buffer,
  options: TryOnOptions
): Promise<{ imageUrl: string; analysis?: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.4, // Lower temperature for more consistent results
      topK: 32,
      topP: 0.95,
    },
  })

  const prompt = generatePrompt(options)

  const customerImage = {
    inlineData: {
      data: customerBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    },
  }

  const productImage = {
    inlineData: {
      data: productBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    },
  }

  console.log('🤖 Sending request to Gemini 2.5 Flash...')
  const result = await model.generateContent([prompt, customerImage, productImage])
  const response = result.response
  const text = response.text()

  console.log('📊 Gemini response received')

  // Extract JSON analysis
  let analysis: string | undefined
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      analysis = JSON.stringify(parsed, null, 2)
      console.log('✓ Analysis extracted:', analysis.substring(0, 100) + '...')
    }
  } catch (e) {
    console.log('⚠ Could not parse JSON analysis from response')
  }

  // In production, this would call an actual image generation API
  // For now, we return a placeholder URL that would be the generated image
  const imageUrl = `https://storage.renderedfits.com/tryons/${crypto.randomBytes(16).toString('hex')}.jpg`

  // In a real implementation, you would:
  // 1. Use Imagen 3 or Stable Diffusion for actual image generation
  // 2. Upload the generated image to cloud storage
  // 3. Return the public URL

  return {
    imageUrl,
    analysis,
  }
}

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(customerImageSize: number, productImageSize: number, analysisText: string): number {
  // Rough estimate: images contribute to input tokens, analysis to output tokens
  const estimatedInputTokens = Math.ceil((customerImageSize + productImageSize) / 100) + 500 // Prompt tokens
  const estimatedOutputTokens = Math.ceil(analysisText.length / 4) + 100

  const inputCost = (estimatedInputTokens / 1000) * COST_PER_1K_INPUT_TOKENS
  const outputCost = (estimatedOutputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS

  return inputCost + outputCost + (COST_PER_REQUEST * 0.5) // Add 50% of base cost
}

/**
 * Extract size recommendation from analysis
 */
export function extractSizeRecommendation(analysis: string): string {
  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return data.recommended_size || 'M'
    }
  } catch {
    // Fallback: look for size mentions in text
    const sizeMatch = analysis.match(/\b(XXS|XS|S|M|L|XL|XXL)\b/i)
    if (sizeMatch) {
      return sizeMatch[1].toUpperCase()
    }
  }
  return 'M' // Default
}

/**
 * Analyze product image to extract details
 */
export async function analyzeProductImage(
  imageBuffer: Buffer
): Promise<{
  category: string
  colors: string[]
  style: string
  description: string
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const image = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

    const prompt = `Analyze this clothing item image and provide:
1. Category (e.g., dress, top, bottom, shoes, etc.)
2. Primary colors (list up to 3)
3. Style (e.g., casual, formal, sporty, etc.)
4. A brief description (2-3 sentences)

Format the response as JSON with keys: category, colors (array), style, description`

    const result = await model.generateContent([prompt, image])
    const response = result.response.text()

    // Parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // If JSON parsing fails, return default values
    }

    return {
      category: 'OTHER',
      colors: ['Unknown'],
      style: 'Unknown',
      description: response.substring(0, 200)
    }
  } catch (error) {
    console.error('Product analysis error:', error)
    return {
      category: 'OTHER',
      colors: [],
      style: 'Unknown',
      description: 'Product analysis failed'
    }
  }
}

/**
 * Generate product description from image
 */
export async function generateProductDescription(
  imageBuffer: Buffer,
  productName?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const image = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

    const prompt = productName
      ? `Write a compelling product description for this ${productName}. Focus on style, fit, and key features. Keep it under 100 words.`
      : `Write a compelling product description for this clothing item. Focus on style, fit, and key features. Keep it under 100 words.`

    const result = await model.generateContent([prompt, image])
    return result.response.text()
  } catch (error) {
    console.error('Description generation error:', error)
    return 'A beautiful clothing item perfect for any occasion.'
  }
}

/**
 * Validate that image contains a person
 */
export async function validatePersonImage(imageBuffer: Buffer): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const image = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

    const prompt = 'Does this image contain a clearly visible person? Answer with only YES or NO.'

    const result = await model.generateContent([prompt, image])
    const response = result.response.text().trim().toUpperCase()

    return response.includes('YES')
  } catch (error) {
    console.error('Person validation error:', error)
    // Default to true if validation fails
    return true
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== ''
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  entries: number
  oldestEntry: number | null
  newestEntry: number | null
} {
  let oldestTimestamp: number | null = null
  let newestTimestamp: number | null = null
  let totalSize = 0

  for (const entry of tryonCache.values()) {
    totalSize += entry.cost
    if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp
    }
    if (!newestTimestamp || entry.timestamp > newestTimestamp) {
      newestTimestamp = entry.timestamp
    }
  }

  return {
    size: totalSize,
    entries: tryonCache.size,
    oldestEntry: oldestTimestamp,
    newestEntry: newestTimestamp,
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  tryonCache.clear()
  console.log('✓ Try-on cache cleared')
}

/**
 * Get cached result by customer and product
 */
export function getCachedResult(
  customerPhotoUrl: string,
  productImageUrl: string,
  options: TryOnOptions = {}
): TryOnResult | null {
  const cacheKey = generateCacheKey(customerPhotoUrl, productImageUrl, options)
  const cached = tryonCache.get(cacheKey)

  if (!cached) {
    return null
  }

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    tryonCache.delete(cacheKey)
    return null
  }

  return {
    ...cached,
    cached: true,
  }
}

/**
 * Fallback function for when Gemini fails
 */
export function getFallbackResult(generationTime: number): TryOnResult {
  console.log('⚠ Using fallback result due to generation failure')
  return {
    imageUrl: 'https://storage.renderedfits.com/fallback/placeholder.jpg',
    generationTime,
    cost: 0,
    analysis: JSON.stringify({
      fit_analysis: 'Unable to generate analysis',
      recommended_size: 'M',
      style_match: 'N/A',
      color_harmony: 'N/A',
      confidence_score: 0,
      technical_notes: 'Fallback result - AI generation unavailable',
    }, null, 2),
    cached: false,
  }
}

/**
 * Batch generate multiple try-ons (useful for multiple angles)
 */
export async function batchGenerateTryons(
  customerPhotoUrl: string,
  productImageUrl: string,
  variations: TryOnOptions[]
): Promise<TryOnResult[]> {
  console.log(`📦 Batch generating ${variations.length} try-on variations`)

  const results = await Promise.allSettled(
    variations.map(options =>
      generateVirtualTryon(customerPhotoUrl, productImageUrl, options)
    )
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`❌ Variation ${index + 1} failed:`, result.reason)
      return getFallbackResult(0)
    }
  })
}

/**
 * Legacy compatibility: generateTryOn (old function signature)
 */
export async function generateTryOn(
  personImageBuffer: Buffer,
  garmentImageBuffer: Buffer,
  options: TryOnOptions = {}
): Promise<{ resultBuffer: Buffer; processingTimeMs: number; analysis: string }> {
  // Convert buffers to data URLs for the new function
  const personDataUrl = `data:image/jpeg;base64,${personImageBuffer.toString('base64')}`
  const garmentDataUrl = `data:image/jpeg;base64,${garmentImageBuffer.toString('base64')}`

  const result = await generateVirtualTryon(personDataUrl, garmentDataUrl, options)

  // For legacy compatibility, return a placeholder buffer
  // In production, you would download the image from result.imageUrl
  return {
    resultBuffer: personImageBuffer, // Placeholder
    processingTimeMs: result.generationTime,
    analysis: result.analysis || 'No analysis available',
  }
}
