/**
 * Try-On Result Display Component
 * Shows the generated try-on image with size recommendation and actions
 */

export interface ResultData {
  imageUrl: string
  recommendedSize?: string
  processingTimeMs?: number
  productName?: string
  productUrl?: string
}

export interface ResultOptions {
  onAddToCart?: () => void
  onTryAgain?: () => void
  onDownload?: () => void
}

export class ResultComponent {
  private container: HTMLDivElement | null = null
  private data: ResultData
  private options: ResultOptions

  constructor(data: ResultData, options: ResultOptions = {}) {
    this.data = data
    this.options = options
  }

  /**
   * Render the result UI
   */
  render(): HTMLElement {
    this.container = document.createElement('div')
    this.container.className = 'rf-result-container'

    Object.assign(this.container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      alignItems: 'center',
      minHeight: '400px',
      padding: '0'
    })

    // Add components
    this.container.appendChild(this.createSuccessMessage())
    this.container.appendChild(this.createImageDisplay())

    if (this.data.recommendedSize) {
      this.container.appendChild(this.createSizeRecommendation())
    }

    this.container.appendChild(this.createActions())

    return this.container
  }

  /**
   * Create success message
   */
  private createSuccessMessage(): HTMLElement {
    const message = document.createElement('div')
    message.className = 'rf-success-message'

    Object.assign(message.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: '#ecfdf5',
      border: '1px solid #a7f3d0',
      borderRadius: '12px',
      width: '100%'
    })

    message.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <div style="flex: 1;">
        <div style="font-size: 15px; font-weight: 600; color: #065f46; margin-bottom: 2px;">
          Try-On Complete!
        </div>
        <div style="font-size: 13px; color: #047857;">
          Here's how it looks on you
          ${this.data.processingTimeMs ? ` (${(this.data.processingTimeMs / 1000).toFixed(1)}s)` : ''}
        </div>
      </div>
    `

    return message
  }

  /**
   * Create image display
   */
  private createImageDisplay(): HTMLElement {
    const imageContainer = document.createElement('div')
    imageContainer.className = 'rf-result-image-container'

    Object.assign(imageContainer.style, {
      position: 'relative',
      width: '100%',
      maxWidth: '450px',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      backgroundColor: '#f9fafb'
    })

    const img = document.createElement('img')
    img.src = this.data.imageUrl
    img.alt = 'Virtual Try-On Result'

    Object.assign(img.style, {
      width: '100%',
      height: 'auto',
      display: 'block',
      objectFit: 'contain',
      maxHeight: '500px'
    })

    // Add loading state
    img.style.opacity = '0'
    img.style.transition = 'opacity 0.3s ease'

    img.onload = () => {
      img.style.opacity = '1'
    }

    // Add download button overlay
    const downloadOverlay = document.createElement('button')
    downloadOverlay.type = 'button'
    downloadOverlay.title = 'Download Image'
    downloadOverlay.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `

    Object.assign(downloadOverlay.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: 'none',
      borderRadius: '10px',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      opacity: '0.8'
    })

    downloadOverlay.addEventListener('mouseenter', () => {
      downloadOverlay.style.opacity = '1'
      downloadOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'
    })

    downloadOverlay.addEventListener('mouseleave', () => {
      downloadOverlay.style.opacity = '0.8'
      downloadOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    })

    downloadOverlay.addEventListener('click', () => {
      this.downloadImage()
    })

    imageContainer.appendChild(img)
    imageContainer.appendChild(downloadOverlay)

    return imageContainer
  }

  /**
   * Create size recommendation badge
   */
  private createSizeRecommendation(): HTMLElement {
    const badge = document.createElement('div')
    badge.className = 'rf-size-recommendation'

    Object.assign(badge.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '12px',
      width: '100%'
    })

    badge.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
      <div>
        <div style="font-size: 13px; color: #1e40af; font-weight: 500; margin-bottom: 2px;">
          Recommended Size
        </div>
        <div style="font-size: 18px; color: #1e3a8a; font-weight: 700;">
          ${this.data.recommendedSize}
        </div>
      </div>
    `

    return badge
  }

  /**
   * Create action buttons
   */
  private createActions(): HTMLElement {
    const actions = document.createElement('div')
    actions.className = 'rf-result-actions'

    Object.assign(actions.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%'
    })

    // Add to Cart button (primary)
    if (this.options.onAddToCart) {
      const addToCartBtn = this.createButton(
        'Add to Cart',
        'primary',
        () => this.options.onAddToCart?.()
      )
      actions.appendChild(addToCartBtn)
    }

    // Secondary actions row
    const secondaryActions = document.createElement('div')
    Object.assign(secondaryActions.style, {
      display: 'flex',
      gap: '12px'
    })

    // Try Again button
    if (this.options.onTryAgain) {
      const tryAgainBtn = this.createButton(
        'Try Different Photo',
        'secondary',
        () => this.options.onTryAgain?.()
      )
      secondaryActions.appendChild(tryAgainBtn)
    }

    actions.appendChild(secondaryActions)

    return actions
  }

  /**
   * Create a styled button
   */
  private createButton(
    text: string,
    style: 'primary' | 'secondary',
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text

    const isPrimary = style === 'primary'

    Object.assign(button.style, {
      flex: style === 'secondary' ? '1' : 'none',
      padding: '14px 24px',
      backgroundColor: isPrimary ? '#7c3aed' : '#f3f4f6',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      color: isPrimary ? '#ffffff' : '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      boxShadow: isPrimary ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
    })

    button.addEventListener('mouseenter', () => {
      if (isPrimary) {
        button.style.backgroundColor = '#6d28d9'
        button.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.4)'
        button.style.transform = 'translateY(-2px)'
      } else {
        button.style.backgroundColor = '#e5e7eb'
        button.style.color = '#111827'
      }
    })

    button.addEventListener('mouseleave', () => {
      if (isPrimary) {
        button.style.backgroundColor = '#7c3aed'
        button.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)'
        button.style.transform = 'translateY(0)'
      } else {
        button.style.backgroundColor = '#f3f4f6'
        button.style.color = '#6b7280'
      }
    })

    button.addEventListener('click', onClick)

    return button
  }

  /**
   * Download the try-on image
   */
  private downloadImage(): void {
    const link = document.createElement('a')
    link.href = this.data.imageUrl
    link.download = `virtual-tryon-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    if (this.options.onDownload) {
      this.options.onDownload()
    }
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container = null
  }
}
