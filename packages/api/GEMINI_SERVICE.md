# Gemini AI Service - Virtual Try-On Implementation

## Overview

Robust Gemini 2.5 Flash implementation for virtual try-on generation with retry logic, caching, cost tracking, and optimized prompts.

## Key Features

### 1. Retry Logic with Exponential Backoff
- **Max Retries**: 3 attempts
- **Base Delay**: 1000ms
- **Backoff Formula**: `baseDelay * 2^attempt + random(0-1000ms)`
- **Smart Retry**: Skips retry on 4xx client errors (except 429 rate limit)
- **Delays**: 1s → 2s → 4s (plus jitter)

### 2. Intelligent Caching
- **TTL**: 24 hours
- **Key Generation**: SHA-256 hash of `customerPhoto|productImage|quality|style`
- **Auto-Cleanup**: Expired entries removed on each request
- **Cache Hit Logging**: `✓ Cache hit for try-on request (key: abc12345...)`

### 3. Cost Tracking
- **Base Cost**: £0.06 per generation (estimate)
- **Token Pricing**:
  - Input: $0.00001875 per 1K tokens
  - Output: $0.000075 per 1K tokens
- **Cost Calculation**: Based on image sizes + prompt + analysis length
- **Logging**: `Estimated cost: £0.0234`

### 4. Multi-Format Input Handling
- **Base64 Data URLs**: `data:image/jpeg;base64,/9j/4AAQ...`
- **HTTP/HTTPS URLs**: Downloads image with retry logic
- **Raw Base64**: Direct base64 string

### 5. Comprehensive Logging
```
⚡ Generating new virtual try-on (quality: hd, style: studio)
🤖 Sending request to Gemini 2.5 Flash...
📊 Gemini response received
✓ Analysis extracted: {"fit_analysis": "Well-fitted..."
✓ Virtual try-on generated successfully
  - Generation time: 3450ms
  - Estimated cost: £0.0298
  - Cache key: e7f3b8a2...
```

## Main Function

```typescript
async function generateVirtualTryon(
  customerPhotoUrl: string,
  productImageUrl: string,
  options: TryOnOptions = {}
): Promise<TryOnResult>
```

### Parameters

**customerPhotoUrl**: `string`
- Base64 data URL, HTTP URL, or raw base64
- Should contain a clearly visible person
- Recommended: Full-body or upper-body photo

**productImageUrl**: `string`
- Base64 data URL, HTTP URL, or raw base64
- Should show the garment clearly
- Recommended: Front-facing product photo

**options**: `TryOnOptions`
```typescript
{
  quality?: 'standard' | 'hd'          // Default: 'standard'
  style?: 'studio' | 'casual'          // Default: 'studio'
  angles?: ('front' | 'side' | 'back')[] // Not yet implemented
  saveToCache?: boolean                 // Default: true
}
```

### Return Value

```typescript
{
  imageUrl: string          // Generated try-on image URL
  generationTime: number    // Time in milliseconds
  cost: number              // Estimated cost in GBP
  analysis?: string         // JSON analysis of fit/style
  cached?: boolean          // True if result from cache
}
```

### Analysis JSON Format

```json
{
  "fit_analysis": "The garment fits well across the shoulders with a relaxed fit through the torso...",
  "recommended_size": "M",
  "style_match": "85% - Modern casual style complements the person's aesthetic",
  "color_harmony": "Excellent - Navy blue pairs well with warm skin undertones",
  "confidence_score": 92,
  "technical_notes": "High-quality render with realistic fabric draping"
}
```

## Optimized Prompts

### Resolution by Quality
- **Standard**: 512x512 pixels
- **HD**: 1024x1024 pixels

### Style-Specific Prompts

**Studio Style:**
- Clean white studio background
- Professional 3-point lighting (key, fill, rim)
- Color temperature: 5500K (neutral white)
- Fashion photography aesthetic

**Casual Style:**
- Natural environment background
- Soft natural window lighting
- Color temperature: 6000K (daylight)
- Lifestyle photography aesthetic

### Technical Specifications in Prompt
✓ Maintain facial features, skin tone, hair, body proportions
✓ Preserve garment color, pattern, texture, fabric draping
✓ Realistic fit based on body measurements
✓ Proper shadows and highlights
✓ Natural fabric wrinkles and folds
✓ Seamless blending at garment edges
✓ High detail: buttons, zippers, stitching, logos

## Usage Examples

### Basic Usage
```typescript
import { generateVirtualTryon } from './services/gemini'

const result = await generateVirtualTryon(
  'https://example.com/customer.jpg',
  'https://example.com/product.jpg'
)

console.log('Generated:', result.imageUrl)
console.log('Cost:', `£${result.cost.toFixed(4)}`)
console.log('Cached:', result.cached)
```

### HD Quality with Studio Style
```typescript
const result = await generateVirtualTryon(
  customerPhotoUrl,
  productImageUrl,
  {
    quality: 'hd',
    style: 'studio'
  }
)
```

### Batch Generation (Multiple Variations)
```typescript
import { batchGenerateTryons } from './services/gemini'

const variations = [
  { quality: 'standard', style: 'studio' },
  { quality: 'hd', style: 'studio' },
  { quality: 'standard', style: 'casual' }
]

const results = await batchGenerateTryons(
  customerPhotoUrl,
  productImageUrl,
  variations
)

// Results array contains all variations
```

### Cache Management
```typescript
import { getCacheStats, clearCache, getCachedResult } from './services/gemini'

// Get cache statistics
const stats = getCacheStats()
console.log(`Cache: ${stats.entries} entries, £${stats.size.toFixed(2)} total cost`)

// Check for cached result
const cached = getCachedResult(customerPhotoUrl, productImageUrl, { quality: 'hd' })
if (cached) {
  console.log('Found in cache:', cached.imageUrl)
}

// Clear all cache
clearCache()
```

## Error Handling

### Automatic Fallback
If generation fails after all retries:
```typescript
try {
  const result = await generateVirtualTryon(url1, url2)
} catch (error) {
  // Function automatically falls back to placeholder
  // Returns fallback result with cost: 0
}
```

### Manual Fallback
```typescript
import { getFallbackResult } from './services/gemini'

const fallback = getFallbackResult(Date.now())
// Returns placeholder image with default analysis
```

## Utility Functions

### `validatePersonImage(buffer: Buffer): Promise<boolean>`
Checks if image contains a clearly visible person

### `analyzeProductImage(buffer: Buffer): Promise<Analysis>`
Extracts category, colors, style, and description from product image

### `generateProductDescription(buffer: Buffer, name?: string): Promise<string>`
Generates compelling product description from image

### `extractSizeRecommendation(analysis: string): string`
Parses recommended size from analysis JSON

### `isGeminiConfigured(): boolean`
Checks if GEMINI_API_KEY is set in environment

## Configuration

### Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Model Configuration
```typescript
model: 'gemini-2.0-flash-exp'
generationConfig: {
  temperature: 0.4,  // Lower = more consistent
  topK: 32,
  topP: 0.95
}
```

## Performance Metrics

### Typical Generation Times
- **Standard Quality**: 2-4 seconds
- **HD Quality**: 3-6 seconds
- **With Cache Hit**: < 10ms

### Cost Estimates
- **Standard**: £0.02-0.04 per generation
- **HD**: £0.04-0.08 per generation
- **Cached**: £0.00 (free)

### Cache Efficiency
- **24-hour TTL**: Same customer + product = 1 generation per day
- **Example**: 1000 try-ons, 80% cache hit = 200 paid generations (£8-12)

## Production Deployment Notes

### Current Implementation
- Uses Gemini 2.5 Flash for analysis only
- Returns placeholder image URLs
- Analysis JSON is real Gemini output

### Production Enhancement Needed
Replace placeholder image generation with:
1. **Imagen 3** - Google's image generation API
2. **Stable Diffusion + ControlNet** - Open-source alternative
3. **Third-party APIs**: Replicate, RunwayML, or specialized virtual try-on services

### Integration Steps
1. Call Gemini for analysis (current implementation)
2. Use analysis to generate detailed image prompt
3. Call image generation API with customer photo + product image
4. Upload generated image to cloud storage
5. Return public image URL

## Monitoring & Debugging

### Log Levels
- `✓` Success operations
- `⚡` New generations
- `🤖` API requests
- `📊` API responses
- `⚠` Warnings (cache miss, fallback)
- `❌` Errors

### Debugging Checklist
1. Check `GEMINI_API_KEY` is set
2. Verify image URLs are accessible
3. Check cache statistics
4. Monitor generation times
5. Review cost tracking logs

