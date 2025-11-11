/**
 * Validation Utilities
 * Validate images, configuration, and inputs
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validation utility class
 */
export class Validator {
  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): ValidationResult {
    if (!apiKey) {
      return { valid: false, error: 'API key is required' }
    }

    if (typeof apiKey !== 'string') {
      return { valid: false, error: 'API key must be a string' }
    }

    if (!apiKey.startsWith('rfts_')) {
      return { valid: false, error: 'Invalid API key format. Must start with "rfts_"' }
    }

    if (apiKey.length < 20) {
      return { valid: false, error: 'Invalid API key length' }
    }

    return { valid: true }
  }

  /**
   * Validate product ID
   */
  static validateProductId(productId: string): ValidationResult {
    if (!productId) {
      return { valid: false, error: 'Product ID is required' }
    }

    if (typeof productId !== 'string') {
      return { valid: false, error: 'Product ID must be a string' }
    }

    if (productId.length === 0) {
      return { valid: false, error: 'Product ID cannot be empty' }
    }

    return { valid: true }
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): ValidationResult {
    // Check if file exists
    if (!file) {
      return { valid: false, error: 'No file provided' }
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.'
      }
    }

    // Check file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds 5MB limit.`
      }
    }

    // Check minimum size (10KB)
    const minSize = 10 * 1024
    if (file.size < minSize) {
      return {
        valid: false,
        error: 'File is too small. Please upload a larger image.'
      }
    }

    return { valid: true }
  }

  /**
   * Validate image data URL
   */
  static validateImageDataUrl(dataUrl: string): ValidationResult {
    if (!dataUrl) {
      return { valid: false, error: 'No image data provided' }
    }

    if (typeof dataUrl !== 'string') {
      return { valid: false, error: 'Image data must be a string' }
    }

    // Check if it's a data URL
    if (!dataUrl.startsWith('data:image/')) {
      return { valid: false, error: 'Invalid image data URL format' }
    }

    // Check if it contains base64 data
    if (!dataUrl.includes('base64,')) {
      return { valid: false, error: 'Image must be base64 encoded' }
    }

    // Check size (rough estimate: base64 is ~1.37x original)
    const estimatedSize = (dataUrl.length * 0.75) / 1024 / 1024 // Convert to MB
    if (estimatedSize > 5) {
      return {
        valid: false,
        error: `Image size (~${estimatedSize.toFixed(1)}MB) exceeds 5MB limit.`
      }
    }

    return { valid: true }
  }

  /**
   * Validate image URL
   */
  static validateImageUrl(url: string): ValidationResult {
    if (!url) {
      return { valid: false, error: 'No URL provided' }
    }

    if (typeof url !== 'string') {
      return { valid: false, error: 'URL must be a string' }
    }

    // Check if it's a valid URL
    try {
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' }
      }
    } catch {
      return { valid: false, error: 'Invalid URL format' }
    }

    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    const hasValidExtension = validExtensions.some(ext =>
      url.toLowerCase().endsWith(ext)
    )

    // Note: Some URLs might not have extensions (e.g., CDN URLs)
    // So we only warn, not reject
    if (!hasValidExtension) {
      console.warn('[RenderedFits] URL does not have a standard image extension:', url)
    }

    return { valid: true }
  }

  /**
   * Validate widget configuration
   */
  static validateConfig(config: any): ValidationResult {
    if (!config || typeof config !== 'object') {
      return { valid: false, error: 'Configuration must be an object' }
    }

    // Validate API key
    const apiKeyResult = this.validateApiKey(config.apiKey)
    if (!apiKeyResult.valid) {
      return apiKeyResult
    }

    // Validate product ID
    const productIdResult = this.validateProductId(config.productId)
    if (!productIdResult.valid) {
      return productIdResult
    }

    // Optional: validate base URL if provided
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl)
      } catch {
        return { valid: false, error: 'Invalid base URL' }
      }
    }

    return { valid: true }
  }

  /**
   * Check if image dimensions are acceptable
   */
  static async validateImageDimensions(
    dataUrl: string
  ): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        const minWidth = 200
        const minHeight = 200
        const maxWidth = 4096
        const maxHeight = 4096

        if (img.width < minWidth || img.height < minHeight) {
          resolve({
            valid: false,
            error: `Image is too small. Minimum dimensions: ${minWidth}x${minHeight}px`
          })
          return
        }

        if (img.width > maxWidth || img.height > maxHeight) {
          resolve({
            valid: false,
            error: `Image is too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`
          })
          return
        }

        // Check aspect ratio (should be roughly portrait or square)
        const aspectRatio = img.width / img.height
        if (aspectRatio > 2 || aspectRatio < 0.5) {
          console.warn(
            '[RenderedFits] Image has unusual aspect ratio:',
            aspectRatio
          )
        }

        resolve({ valid: true })
      }

      img.onerror = () => {
        resolve({ valid: false, error: 'Failed to load image' })
      }

      img.src = dataUrl
    })
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Sanitize string for safe display
   */
  static sanitizeString(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
}
