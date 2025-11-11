import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

export interface TryOnOptions {
  quality?: 'standard' | 'hd'
  background?: 'studio' | 'natural' | 'transparent'
}

/**
 * Generate virtual try-on using Gemini AI
 * Professional fashion photography quality
 */
export async function generateTryOn(
  personImageBuffer: Buffer,
  garmentImageBuffer: Buffer,
  options: TryOnOptions = {}
): Promise<{ resultBuffer: Buffer; processingTimeMs: number; analysis: string }> {
  const startTime = Date.now()

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Convert buffers to base64 for Gemini
    const personImage = {
      inlineData: {
        data: personImageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

    const garmentImage = {
      inlineData: {
        data: garmentImageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }

    // Professional virtual try-on prompt
    const prompt = `You are a professional fashion photography AI. Create a realistic virtual try-on image.

Input: Customer photo + Product image
Task: Show the customer wearing the product in a clean studio environment with professional lighting.

Requirements:
- Maintain customer's facial features, skin tone, hair, body proportions
- Accurately represent the product's color, pattern, and fit
- Place in neutral studio background (white/light grey)
- Professional lighting and shadows
- Front-facing view
- Natural draping and fit of the garment

Additionally, analyze:
1. How well the garment fits the person's body type
2. Recommended size (XS, S, M, L, XL)
3. Style compatibility
4. Color compatibility with skin tone

Provide a JSON response with:
{
  "fit_analysis": "description of fit",
  "recommended_size": "size recommendation",
  "style_notes": "style compatibility notes",
  "color_notes": "color compatibility notes",
  "confidence": "high/medium/low"
}

Output: High-quality photorealistic image description and analysis.`

    const result = await model.generateContent([prompt, personImage, garmentImage])
    const response = result.response
    const analysis = response.text()

    console.log('Gemini virtual try-on analysis:', analysis)

    // In production, this would generate an actual try-on image using:
    // - Imagen 3 API for image generation
    // - Specialized virtual try-on model (e.g., Stable Diffusion with ControlNet)
    // - Third-party API like Replicate, RunwayML, etc.

    // For now, return the original person image as a placeholder
    // In a real implementation, you would:
    // 1. Use the analysis to generate prompts for an image generation model
    // 2. Apply the garment onto the person using AI
    // 3. Return the composite image

    const processingTimeMs = Date.now() - startTime

    return {
      resultBuffer: personImageBuffer, // Placeholder - will be replaced with actual try-on
      processingTimeMs,
      analysis
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error(`Failed to generate try-on: ${error}`)
  }
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
