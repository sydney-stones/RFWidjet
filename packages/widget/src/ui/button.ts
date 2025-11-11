/**
 * "Try On Me" Button Component
 * Renders a beautiful, animated button that opens the try-on modal
 */

export interface ButtonOptions {
  label?: string
  icon?: string
  position?: 'before-add-to-cart' | 'after-add-to-cart' | 'custom'
  customSelector?: string
  style?: 'primary' | 'secondary' | 'outline'
}

const DEFAULT_OPTIONS: ButtonOptions = {
  label: 'Try On Me',
  icon: '👗',
  position: 'before-add-to-cart',
  style: 'primary'
}

export class TryOnButton {
  private button: HTMLButtonElement | null = null
  private options: ButtonOptions
  private onClick: () => void

  constructor(onClick: () => void, options: ButtonOptions = {}) {
    this.onClick = onClick
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Render the button and inject it into the page
   */
  render(): void {
    this.button = this.createButton()
    this.injectButton()
  }

  /**
   * Create the button element with styles
   */
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button')
    button.id = 'rf-tryon-button'
    button.type = 'button'
    button.innerHTML = `
      <span class="rf-button-icon">${this.options.icon}</span>
      <span class="rf-button-text">${this.options.label}</span>
      <span class="rf-button-shimmer"></span>
    `

    // Apply inline styles for isolation
    this.applyButtonStyles(button)

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault()
      this.addClickAnimation()
      this.onClick()
    })

    // Add hover effects
    button.addEventListener('mouseenter', () => this.addHoverAnimation())
    button.addEventListener('mouseleave', () => this.removeHoverAnimation())

    return button
  }

  /**
   * Apply comprehensive inline styles
   */
  private applyButtonStyles(button: HTMLButtonElement): void {
    const isPrimary = this.options.style === 'primary'
    const isOutline = this.options.style === 'outline'

    // Base button styles
    Object.assign(button.style, {
      // Layout
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      position: 'relative',
      overflow: 'hidden',

      // Sizing
      padding: '14px 28px',
      minWidth: '180px',
      height: '48px',

      // Typography
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: '16px',
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.02em',
      textAlign: 'center',

      // Colors
      color: isPrimary ? '#ffffff' : isOutline ? '#7c3aed' : '#7c3aed',
      backgroundColor: isPrimary ? '#7c3aed' : isOutline ? 'transparent' : '#f3e8ff',
      border: isOutline ? '2px solid #7c3aed' : 'none',

      // Border & Shadow
      borderRadius: '12px',
      boxShadow: isPrimary
        ? '0 4px 14px 0 rgba(124, 58, 237, 0.4)'
        : isOutline
        ? '0 2px 8px 0 rgba(124, 58, 237, 0.15)'
        : '0 2px 8px 0 rgba(124, 58, 237, 0.15)',

      // Cursor & Interaction
      cursor: 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',

      // Transitions
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

      // Z-index
      zIndex: '999'
    })

    // Inject keyframe animations into document head
    this.injectKeyframes()
  }

  /**
   * Inject CSS keyframes for animations
   */
  private injectKeyframes(): void {
    if (document.getElementById('rf-button-keyframes')) return

    const style = document.createElement('style')
    style.id = 'rf-button-keyframes'
    style.textContent = `
      @keyframes rf-shimmer {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }

      @keyframes rf-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes rf-click {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }

      #rf-tryon-button .rf-button-shimmer {
        position: absolute !important;
        top: -50% !important;
        left: -50% !important;
        width: 200% !important;
        height: 200% !important;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        ) !important;
        pointer-events: none !important;
        animation: rf-shimmer 3s infinite !important;
      }

      #rf-tryon-button .rf-button-icon {
        font-size: 20px !important;
        line-height: 1 !important;
        display: inline-block !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      #rf-tryon-button:hover .rf-button-icon {
        transform: scale(1.2) rotate(10deg) !important;
      }

      #rf-tryon-button .rf-button-text {
        position: relative !important;
        z-index: 1 !important;
      }

      #rf-tryon-button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px 0 rgba(124, 58, 237, 0.5) !important;
      }

      #rf-tryon-button:active {
        transform: translateY(0) scale(0.98) !important;
      }

      #rf-tryon-button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
        transform: none !important;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Inject button into the page at the specified position
   */
  private injectButton(): void {
    if (!this.button) return

    // Custom selector position
    if (this.options.position === 'custom' && this.options.customSelector) {
      const target = document.querySelector(this.options.customSelector)
      if (target) {
        target.appendChild(this.button)
        return
      }
    }

    // Find add to cart button
    const addToCartButton = this.findAddToCartButton()

    if (addToCartButton && addToCartButton.parentElement) {
      if (this.options.position === 'after-add-to-cart') {
        // Insert after add to cart
        addToCartButton.parentElement.insertBefore(
          this.button,
          addToCartButton.nextSibling
        )
      } else {
        // Insert before add to cart (default)
        addToCartButton.parentElement.insertBefore(
          this.button,
          addToCartButton
        )
      }

      // Add spacing
      if (this.options.position === 'after-add-to-cart') {
        this.button.style.marginTop = '12px'
      } else {
        this.button.style.marginBottom = '12px'
      }
    } else {
      // Fallback: append to body
      console.warn('[RenderedFits] Add to cart button not found, appending to body')
      document.body.appendChild(this.button)
    }
  }

  /**
   * Find the add to cart button on the page
   */
  private findAddToCartButton(): HTMLElement | null {
    // Common selectors for add to cart buttons
    const selectors = [
      'button[name="add"]',
      'button[type="submit"][name="add"]',
      '[data-add-to-cart]',
      '.add-to-cart',
      '#add-to-cart',
      'button:contains("Add to Cart")',
      'button:contains("Add to Bag")',
      '.product-form__submit',
      '.btn-add-to-cart',
      '[aria-label*="Add to cart"]'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) return element
    }

    // Fallback: find button with "add" in text
    const buttons = Array.from(document.querySelectorAll('button'))
    const addButton = buttons.find(btn =>
      btn.textContent?.toLowerCase().includes('add to cart') ||
      btn.textContent?.toLowerCase().includes('add to bag')
    )

    return addButton || null
  }

  /**
   * Add hover animation
   */
  private addHoverAnimation(): void {
    if (!this.button) return
    this.button.style.animation = 'rf-pulse 0.6s ease-in-out'
  }

  /**
   * Remove hover animation
   */
  private removeHoverAnimation(): void {
    if (!this.button) return
    this.button.style.animation = ''
  }

  /**
   * Add click animation
   */
  private addClickAnimation(): void {
    if (!this.button) return
    this.button.style.animation = 'rf-click 0.3s ease-in-out'
    setTimeout(() => {
      if (this.button) this.button.style.animation = ''
    }, 300)
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    if (!this.button) return
    this.button.disabled = true
    const textSpan = this.button.querySelector('.rf-button-text')
    if (textSpan) {
      textSpan.textContent = 'Loading...'
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(): void {
    if (!this.button) return
    this.button.disabled = false
    const textSpan = this.button.querySelector('.rf-button-text')
    if (textSpan) {
      textSpan.textContent = this.options.label || 'Try On Me'
    }
  }

  /**
   * Destroy the button
   */
  destroy(): void {
    if (this.button && this.button.parentElement) {
      this.button.parentElement.removeChild(this.button)
    }
    this.button = null
  }
}
