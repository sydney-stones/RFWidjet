/**
 * API Client
 * Handles communication with the Rendered Fits backend
 */

export interface TryOnRequest {
  apiKey: string
  customerId?: string
  customerPhoto: string // base64 or URL
  productId: string
  options?: {
    quality?: 'standard' | 'hd'
    saveToProfile?: boolean
  }
}

export interface TryOnResponse {
  success: boolean
  tryonId: string
  imageUrl: string
  recommendedSize?: string
  usageRemaining: number
  processingTimeMs: number
  metadata: {
    customerId: string
    productId: string
    productName: string
    quality: string
  }
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
}

export class ApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(apiKey: string, baseUrl: string = 'http://localhost:3001') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  /**
   * Generate virtual try-on
   */
  async generateTryOn(request: Omit<TryOnRequest, 'apiKey'>): Promise<TryOnResponse> {
    const response = await this.fetch<TryOnResponse>('/api/v1/tryons/generate', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        apiKey: this.apiKey
      })
    })

    return response
  }

  /**
   * Get try-on details
   */
  async getTryOn(tryonId: string): Promise<any> {
    return this.fetch(`/api/v1/tryons/${tryonId}?apiKey=${this.apiKey}`, {
      method: 'GET'
    })
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)

      // Parse JSON response
      const data = await response.json()

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        )
      }

      // Handle API errors
      if (!data.success) {
        throw new ApiError(
          data.error || 'API request failed',
          response.status,
          data
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // Network or parsing errors
      if (error instanceof TypeError) {
        throw new ApiError(
          'Network error. Please check your internet connection.',
          0,
          null
        )
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0,
        null
      )
    }
  }

  /**
   * Convert file to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPEG, PNG, or WebP.'
      }
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit.'
      }
    }

    return { valid: true }
  }

  /**
   * Get usage stats
   */
  async getUsageStats(): Promise<any> {
    // This would call a usage endpoint if available
    // For now, this is a placeholder
    return {
      used: 0,
      limit: 0,
      remaining: 0
    }
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public status: number
  public data: any

  constructor(message: string, status: number, data: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimitError(): boolean {
    return this.status === 429
  }

  /**
   * Check if error is due to authentication
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.isRateLimitError()) {
      return 'You\'ve reached your monthly try-on limit. Please upgrade your plan or try again next month.'
    }

    if (this.isAuthError()) {
      return 'Invalid API key. Please check your configuration.'
    }

    if (this.isValidationError()) {
      return this.message
    }

    if (this.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }

    if (this.status >= 500) {
      return 'Server error. Please try again later.'
    }

    return this.message || 'An unexpected error occurred.'
  }
}
