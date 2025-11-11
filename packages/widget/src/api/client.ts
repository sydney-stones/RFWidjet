/**
 * API Client
 * Handles communication with the Rendered Fits backend
 * Features: Retry logic, exponential backoff, analytics tracking
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export interface TryonResult {
  imageUrl: string
  tryonId: string
  recommendedSize?: string
  processingTimeMs: number
  metadata?: any
}

export interface UploadPhotoResponse {
  success: boolean
  photoUrl: string
  customerId?: string
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
}

export interface AnalyticsEvent {
  eventType: 'button_clicked' | 'upload_started' | 'tryon_generated' | 'add_to_cart_clicked' | 'error_occurred'
  productId?: string
  tryonId?: string
  errorMessage?: string
  metadata?: Record<string, any>
}

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

export class ApiClient {
  private baseUrl: string
  private apiKey: string
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }

  constructor(apiKey: string, baseUrl: string = 'http://localhost:3001') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  // ==========================================================================
  // MAIN API METHODS
  // ==========================================================================

  /**
   * Upload customer photo to backend
   * @param file - Image file to upload
   * @param apiKey - API key for authentication
   * @returns Photo URL from server
   */
  async uploadPhoto(file: File, apiKey?: string): Promise<string> {
    const key = apiKey || this.apiKey

    // For now, we convert to base64 and include in the tryon request
    // In production, you might want a separate upload endpoint
    const base64 = await ApiClient.fileToBase64(file)

    console.log('[ApiClient] Photo converted to base64, size:', base64.length)

    // Return the base64 string directly - it will be sent with the tryon request
    return base64
  }

  /**
   * Generate virtual try-on
   * @param photoUrl - Customer photo URL or base64
   * @param productId - Product ID to try on
   * @param apiKey - Optional API key override
   * @returns Try-on result with image URL and recommendations
   */
  async generateTryon(
    photoUrl: string,
    productId: string,
    apiKey?: string
  ): Promise<TryonResult> {
    const key = apiKey || this.apiKey

    const request: TryOnRequest = {
      apiKey: key,
      customerPhoto: photoUrl,
      productId,
      options: {
        quality: 'standard',
        saveToProfile: true
      }
    }

    console.log('[ApiClient] Generating try-on for product:', productId)

    const response = await this.fetchWithRetry<TryOnResponse>(
      '/api/v1/tryons/generate',
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    )

    console.log('[ApiClient] Try-on generated successfully:', response.tryonId)

    // Track success event
    this.trackEvent({
      eventType: 'tryon_generated',
      productId,
      tryonId: response.tryonId,
      metadata: {
        processingTimeMs: response.processingTimeMs,
        recommendedSize: response.recommendedSize
      }
    }).catch(() => {}) // Fire and forget

    return {
      imageUrl: response.imageUrl,
      tryonId: response.tryonId,
      recommendedSize: response.recommendedSize,
      processingTimeMs: response.processingTimeMs,
      metadata: response.metadata
    }
  }

  /**
   * Track analytics event (fire-and-forget)
   * @param event - Analytics event to track
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Fire-and-forget - don't wait for response
      const eventData = {
        ...event,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      console.log('[ApiClient] Tracking event:', event.eventType, eventData)

      // Send event to analytics endpoint (no retry)
      fetch(`${this.baseUrl}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData),
        // Don't wait for response
        keepalive: true
      }).catch(() => {
        // Silently fail for analytics
        console.warn('[ApiClient] Failed to track event:', event.eventType)
      })
    } catch (error) {
      // Never throw from analytics
      console.warn('[ApiClient] Analytics error:', error)
    }
  }

  /**
   * Get try-on details by ID
   */
  async getTryOn(tryonId: string): Promise<any> {
    return this.fetchWithRetry(`/api/v1/tryons/${tryonId}?apiKey=${this.apiKey}`, {
      method: 'GET'
    })
  }

  // ==========================================================================
  // FETCH WITH RETRY LOGIC
  // ==========================================================================

  /**
   * Fetch with exponential backoff retry logic
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt: number = 0
  ): Promise<T> {
    try {
      return await this.fetch<T>(endpoint, options)
    } catch (error) {
      const isRetryable = this.isRetryableError(error)
      const canRetry = attempt < this.retryConfig.maxRetries

      if (isRetryable && canRetry) {
        const delay = this.calculateBackoffDelay(attempt)
        console.warn(
          `[ApiClient] Request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries}), retrying in ${delay}ms...`,
          error
        )

        await this.sleep(delay)
        return this.fetchWithRetry<T>(endpoint, options, attempt + 1)
      }

      // Max retries reached or non-retryable error
      console.error('[ApiClient] Request failed:', error)
      throw error
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof ApiError) {
      // Retry on server errors (5xx) and network errors
      return error.status === 0 || error.status >= 500
    }

    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('network')) {
      return true
    }

    return false
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt + random jitter
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 1000 // 0-1000ms random jitter
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay)
    return Math.floor(delay)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==========================================================================
  // BASE FETCH METHOD
  // ==========================================================================

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
      let data: any
      try {
        data = await response.json()
      } catch {
        // If JSON parsing fails, throw a generic error
        throw new ApiError(
          `Invalid JSON response from server`,
          response.status,
          null
        )
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        )
      }

      // Handle API errors
      if (data.success === false) {
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

  // ==========================================================================
  // STATIC UTILITY METHODS
  // ==========================================================================

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
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type.toLowerCase())) {
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
        error: `File size exceeds 5MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
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
   * Get usage stats
   */
  async getUsageStats(): Promise<any> {
    try {
      return await this.fetch('/api/v1/analytics/overview', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
    } catch {
      // Return default if endpoint not available
      return {
        used: 0,
        limit: 0,
        remaining: 0
      }
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
