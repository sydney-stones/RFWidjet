/**
 * Rendered Fits Widget
 * Customer-facing virtual try-on widget
 *
 * Usage:
 * <script src="widget.min.js"></script>
 * <script>
 *   RenderedFits.init({
 *     apiKey: 'rfts_xxxxx',
 *     productId: 'product_123',
 *     baseUrl: 'https://api.renderedfits.com' // optional
 *   })
 * </script>
 */

import { TryOnButton, ButtonOptions } from './ui/button'
import { TryOnModal } from './ui/modal'
import { UploadComponent } from './ui/upload'
import { LoadingComponent } from './ui/loading'
import { ResultComponent } from './ui/result'
import { ApiClient, ApiError } from './api/client'
import { Storage } from './utils/storage'
import { Validator } from './utils/validation'

export interface WidgetConfig {
  apiKey: string
  productId: string
  baseUrl?: string
  buttonOptions?: ButtonOptions
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  onAddToCart?: () => void
}

/**
 * Main Widget Class
 */
class RenderedFitsWidget {
  private config: WidgetConfig | null = null
  private apiClient: ApiClient | null = null
  private button: TryOnButton | null = null
  private modal: TryOnModal | null = null
  private uploadComponent: UploadComponent | null = null
  private loadingComponent: LoadingComponent | null = null
  private resultComponent: ResultComponent | null = null
  private currentPhotoFile: File | null = null
  private currentPhotoDataUrl: string | null = null

  /**
   * Initialize the widget
   */
  init(config: WidgetConfig): void {
    console.log('[RenderedFits] Initializing widget...')

    // Validate configuration
    const validation = Validator.validateConfig(config)
    if (!validation.valid) {
      console.error('[RenderedFits] Configuration error:', validation.error)
      throw new Error(`RenderedFits configuration error: ${validation.error}`)
    }

    this.config = config

    // Initialize API client
    this.apiClient = new ApiClient(
      config.apiKey,
      config.baseUrl || 'http://localhost:3001'
    )

    // Check localStorage availability
    if (!Storage.isAvailable()) {
      console.warn('[RenderedFits] localStorage is not available. Photo saving disabled.')
    }

    // Render button
    this.renderButton()

    console.log('[RenderedFits] Widget initialized successfully')
  }

  /**
   * Render the try-on button
   */
  private renderButton(): void {
    this.button = new TryOnButton(
      () => this.openModal(),
      this.config?.buttonOptions
    )
    this.button.render()
  }

  /**
   * Open the try-on modal
   */
  private openModal(): void {
    if (!this.config || !this.apiClient) return

    // Track button click event
    this.apiClient.trackEvent({
      eventType: 'button_clicked',
      productId: this.config.productId
    }).catch(() => {})

    this.modal = new TryOnModal(() => this.closeModal(), {
      productName: this.config.productId
    })

    this.modal.open()
    this.showUploadView()
  }

  /**
   * Close the modal
   */
  private closeModal(): void {
    this.modal = null
    this.uploadComponent = null
    this.loadingComponent = null
    this.resultComponent = null
  }

  /**
   * Show upload view
   */
  private showUploadView(): void {
    if (!this.modal) return

    this.uploadComponent = new UploadComponent({
      onUpload: (file, dataUrl) => this.handlePhotoUpload(file, dataUrl),
      onError: (error) => this.showError(error)
    })

    const uploadElement = this.uploadComponent.render()
    this.modal.setContent(uploadElement)
    this.modal.switchView('upload')
  }

  /**
   * Handle photo upload
   */
  private async handlePhotoUpload(file: File, dataUrl: string): Promise<void> {
    if (!this.apiClient || !this.config) return

    // Track upload started event
    this.apiClient.trackEvent({
      eventType: 'upload_started',
      productId: this.config.productId,
      metadata: {
        fileSize: file.size,
        fileType: file.type
      }
    }).catch(() => {})

    // Validate file
    const fileValidation = Validator.validateImageFile(file)
    if (!fileValidation.valid) {
      this.showError(fileValidation.error || 'Invalid image file')
      return
    }

    // Validate data URL
    const dataUrlValidation = Validator.validateImageDataUrl(dataUrl)
    if (!dataUrlValidation.valid) {
      this.showError(dataUrlValidation.error || 'Invalid image data')
      return
    }

    // Validate dimensions
    const dimensionsValidation = await Validator.validateImageDimensions(dataUrl)
    if (!dimensionsValidation.valid) {
      this.showError(dimensionsValidation.error || 'Invalid image dimensions')
      return
    }

    this.currentPhotoFile = file
    this.currentPhotoDataUrl = dataUrl

    // Save to localStorage
    if (Storage.isAvailable()) {
      Storage.savePhoto(dataUrl)
    }

    // Show preview and generate button
    this.showPreviewAndGenerate(dataUrl)
  }

  /**
   * Show photo preview with generate button
   */
  private showPreviewAndGenerate(dataUrl: string): void {
    if (!this.modal) return

    const container = document.createElement('div')
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '24px'
    container.style.alignItems = 'center'

    // Preview image
    const preview = document.createElement('img')
    preview.src = dataUrl
    preview.alt = 'Your photo'
    Object.assign(preview.style, {
      width: '100%',
      maxWidth: '400px',
      height: 'auto',
      maxHeight: '400px',
      objectFit: 'contain',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    })

    // Generate button
    const generateButton = document.createElement('button')
    generateButton.type = 'button'
    generateButton.innerHTML = `
      <span style="margin-right: 8px;">✨</span>
      <span>Generate Try-On</span>
    `
    Object.assign(generateButton.style, {
      width: '100%',
      maxWidth: '400px',
      padding: '16px 24px',
      backgroundColor: '#7c3aed',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    })

    generateButton.addEventListener('mouseenter', () => {
      generateButton.style.backgroundColor = '#6d28d9'
      generateButton.style.transform = 'translateY(-2px)'
      generateButton.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)'
    })

    generateButton.addEventListener('mouseleave', () => {
      generateButton.style.backgroundColor = '#7c3aed'
      generateButton.style.transform = 'translateY(0)'
      generateButton.style.boxShadow = '0 4px 14px rgba(124, 58, 237, 0.4)'
    })

    generateButton.addEventListener('click', () => this.generateTryOn())

    // Try different photo button
    const changeButton = document.createElement('button')
    changeButton.type = 'button'
    changeButton.textContent = 'Use Different Photo'
    Object.assign(changeButton.style, {
      padding: '12px 24px',
      backgroundColor: '#f3f4f6',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit'
    })

    changeButton.addEventListener('mouseenter', () => {
      changeButton.style.backgroundColor = '#e5e7eb'
      changeButton.style.color = '#111827'
    })

    changeButton.addEventListener('mouseleave', () => {
      changeButton.style.backgroundColor = '#f3f4f6'
      changeButton.style.color = '#6b7280'
    })

    changeButton.addEventListener('click', () => this.showUploadView())

    container.appendChild(preview)
    container.appendChild(generateButton)
    container.appendChild(changeButton)

    this.modal.setContent(container)
  }

  /**
   * Generate try-on
   */
  private async generateTryOn(): Promise<void> {
    if (!this.config || !this.apiClient || !this.modal || !this.currentPhotoDataUrl) {
      return
    }

    // Show loading state
    this.showLoadingView()

    try {
      console.log('[RenderedFits] Starting try-on generation...')

      // Get customer ID from storage
      const customerId = Storage.getCustomerId()

      // Call the new generateTryon method (with correct signature)
      const result = await this.apiClient.generateTryon(
        this.currentPhotoDataUrl,
        this.config.productId
      )

      console.log('[RenderedFits] Try-on generated successfully:', result)

      // Save customer ID if new
      if (result.metadata?.customerId && !customerId) {
        Storage.saveCustomerId(result.metadata.customerId)
      }

      // Show result
      this.showResultView({
        imageUrl: result.imageUrl,
        recommendedSize: result.recommendedSize,
        processingTimeMs: result.processingTimeMs,
        productName: result.metadata?.productName
      })

      // Call success callback
      if (this.config.onSuccess) {
        this.config.onSuccess(result)
      }
    } catch (error) {
      console.error('[RenderedFits] Try-on generation failed:', error)

      let errorMessage = 'Failed to generate try-on. Please try again.'

      if (error instanceof ApiError) {
        errorMessage = error.getUserMessage()

        // Track error event
        this.apiClient?.trackEvent({
          eventType: 'error_occurred',
          productId: this.config.productId,
          errorMessage: errorMessage,
          metadata: {
            status: error.status,
            isRateLimit: error.isRateLimitError(),
            isAuth: error.isAuthError()
          }
        }).catch(() => {})
      } else if (error instanceof Error) {
        errorMessage = error.message

        // Track generic error
        this.apiClient?.trackEvent({
          eventType: 'error_occurred',
          productId: this.config.productId,
          errorMessage: errorMessage
        }).catch(() => {})
      }

      this.showError(errorMessage)

      // Call error callback
      if (this.config.onError) {
        this.config.onError(errorMessage)
      }
    }
  }

  /**
   * Show loading view
   */
  private showLoadingView(): void {
    if (!this.modal) return

    this.loadingComponent = new LoadingComponent({
      message: 'Creating Your Virtual Try-On'
    })

    const loadingElement = this.loadingComponent.render()
    this.modal.setContent(loadingElement)
    this.modal.switchView('loading')
  }

  /**
   * Show result view
   */
  private showResultView(data: any): void {
    if (!this.modal || !this.apiClient || !this.config) return

    this.resultComponent = new ResultComponent(data, {
      onAddToCart: () => {
        // Track add to cart event
        this.apiClient?.trackEvent({
          eventType: 'add_to_cart_clicked',
          productId: this.config?.productId,
          metadata: {
            recommendedSize: data.recommendedSize
          }
        }).catch(() => {})

        if (this.config?.onAddToCart) {
          this.config.onAddToCart()
        } else {
          // Find and click the actual add to cart button
          this.clickAddToCartButton()
        }
        this.modal?.close()
      },
      onTryAgain: () => {
        this.showUploadView()
      }
    })

    const resultElement = this.resultComponent.render()
    this.modal.setContent(resultElement)
    this.modal.switchView('result')
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (!this.modal) {
      alert(message)
      return
    }

    const errorContainer = document.createElement('div')
    Object.assign(errorContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      minHeight: '400px',
      padding: '40px 20px',
      textAlign: 'center'
    })

    errorContainer.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div>
        <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #111827;">
          Oops! Something went wrong
        </h3>
        <p style="margin: 0; font-size: 14px; color: #6b7280; max-width: 400px;">
          ${Validator.sanitizeString(message)}
        </p>
      </div>
    `

    const tryAgainButton = document.createElement('button')
    tryAgainButton.type = 'button'
    tryAgainButton.textContent = 'Try Again'
    Object.assign(tryAgainButton.style, {
      padding: '14px 28px',
      backgroundColor: '#7c3aed',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      marginTop: '12px'
    })

    tryAgainButton.addEventListener('click', () => this.showUploadView())

    errorContainer.appendChild(tryAgainButton)

    this.modal.setContent(errorContainer)
    this.modal.switchView('error')
  }

  /**
   * Click the real add to cart button on the page
   */
  private clickAddToCartButton(): void {
    const selectors = [
      'button[name="add"]',
      'button[type="submit"][name="add"]',
      '[data-add-to-cart]',
      '.add-to-cart',
      '#add-to-cart',
      '.product-form__submit',
      '.btn-add-to-cart'
    ]

    for (const selector of selectors) {
      const button = document.querySelector(selector) as HTMLElement
      if (button) {
        button.click()
        return
      }
    }

    console.warn('[RenderedFits] Could not find add to cart button')
  }

  /**
   * Destroy the widget
   */
  destroy(): void {
    if (this.button) {
      this.button.destroy()
      this.button = null
    }

    if (this.modal) {
      this.modal.close()
      this.modal = null
    }

    this.config = null
    this.apiClient = null
    this.uploadComponent = null
    this.loadingComponent = null
    this.resultComponent = null
    this.currentPhotoFile = null
    this.currentPhotoDataUrl = null

    console.log('[RenderedFits] Widget destroyed')
  }
}

// Create global instance
const widgetInstance = new RenderedFitsWidget()

// Export as global object
declare global {
  interface Window {
    RenderedFits: {
      init: (config: WidgetConfig) => void
      destroy: () => void
      version: string
    }
  }
}

window.RenderedFits = {
  init: (config: WidgetConfig) => widgetInstance.init(config),
  destroy: () => widgetInstance.destroy(),
  version: '1.0.0'
}

// Export for module usage
export default window.RenderedFits
export { WidgetConfig }
