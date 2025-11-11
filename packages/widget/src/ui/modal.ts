/**
 * Try-On Modal Component
 * Full-screen overlay modal with smooth animations and mobile-first design
 */

export type ModalView = 'upload' | 'loading' | 'result' | 'error'

export interface ModalOptions {
  productName?: string
  productImage?: string
}

export class TryOnModal {
  private overlay: HTMLDivElement | null = null
  private modal: HTMLDivElement | null = null
  private contentContainer: HTMLDivElement | null = null
  private currentView: ModalView = 'upload'
  private onClose: () => void

  constructor(onClose: () => void, options: ModalOptions = {}) {
    this.onClose = onClose
  }

  /**
   * Open the modal
   */
  open(): void {
    this.render()
    this.show()
  }

  /**
   * Close the modal
   */
  close(): void {
    this.hide()
    setTimeout(() => {
      this.destroy()
      this.onClose()
    }, 300)
  }

  /**
   * Render the modal structure
   */
  private render(): void {
    this.injectStyles()
    this.overlay = this.createOverlay()
    this.modal = this.createModal()
    this.contentContainer = this.createContentContainer()

    this.modal.appendChild(this.createHeader())
    this.modal.appendChild(this.contentContainer)

    this.overlay.appendChild(this.modal)
    document.body.appendChild(this.overlay)

    // Prevent body scroll
    document.body.style.overflow = 'hidden'
  }

  /**
   * Create overlay backdrop
   */
  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.id = 'rf-modal-overlay'
    overlay.className = 'rf-modal-overlay'

    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      opacity: '0',
      transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    })

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close()
      }
    })

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)

    return overlay
  }

  /**
   * Create modal container
   */
  private createModal(): HTMLDivElement {
    const modal = document.createElement('div')
    modal.id = 'rf-modal'
    modal.className = 'rf-modal'

    Object.assign(modal.style, {
      position: 'relative',
      width: '100%',
      maxWidth: '600px',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      transform: 'scale(0.9) translateY(20px)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    })

    // Mobile responsive
    const mobileStyles = `
      @media (max-width: 640px) {
        #rf-modal {
          max-width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
          max-height: 100vh !important;
        }
      }
    `
    this.addStyleSheet('rf-modal-responsive', mobileStyles)

    return modal
  }

  /**
   * Create modal header with close button
   */
  private createHeader(): HTMLDivElement {
    const header = document.createElement('div')
    header.className = 'rf-modal-header'

    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px 24px 16px 24px',
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: '0',
      backgroundColor: '#ffffff',
      zIndex: '10'
    })

    // Title
    const title = document.createElement('h2')
    title.textContent = 'Virtual Try-On'
    Object.assign(title.style, {
      margin: '0',
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
      letterSpacing: '-0.02em'
    })

    // Close button
    const closeButton = document.createElement('button')
    closeButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `
    Object.assign(closeButton.style, {
      background: 'transparent',
      border: 'none',
      padding: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      color: '#6b7280',
      transition: 'all 0.2s ease',
      marginRight: '-8px'
    })

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#f3f4f6'
      closeButton.style.color = '#111827'
    })

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent'
      closeButton.style.color = '#6b7280'
    })

    closeButton.addEventListener('click', () => this.close())

    header.appendChild(title)
    header.appendChild(closeButton)

    return header
  }

  /**
   * Create content container
   */
  private createContentContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'rf-modal-content'
    container.className = 'rf-modal-content'

    Object.assign(container.style, {
      padding: '24px',
      minHeight: '400px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    })

    return container
  }

  /**
   * Show modal with animation
   */
  private show(): void {
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.opacity = '1'
      }
      if (this.modal) {
        this.modal.style.transform = 'scale(1) translateY(0)'
      }
    })
  }

  /**
   * Hide modal with animation
   */
  private hide(): void {
    if (this.overlay) {
      this.overlay.style.opacity = '0'
    }
    if (this.modal) {
      this.modal.style.transform = 'scale(0.9) translateY(20px)'
    }
  }

  /**
   * Set modal content
   */
  setContent(element: HTMLElement): void {
    if (!this.contentContainer) return
    this.contentContainer.innerHTML = ''
    this.contentContainer.appendChild(element)
  }

  /**
   * Switch to a different view
   */
  switchView(view: ModalView): void {
    this.currentView = view
  }

  /**
   * Get current view
   */
  getCurrentView(): ModalView {
    return this.currentView
  }

  /**
   * Inject global styles
   */
  private injectStyles(): void {
    if (document.getElementById('rf-modal-styles')) return

    const styles = `
      /* Smooth scrollbar */
      #rf-modal-content::-webkit-scrollbar {
        width: 8px;
      }

      #rf-modal-content::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }

      #rf-modal-content::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      #rf-modal-content::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      /* Prevent text selection during drag */
      .rf-modal-overlay * {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      .rf-modal-overlay input,
      .rf-modal-overlay textarea {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `

    this.addStyleSheet('rf-modal-styles', styles)
  }

  /**
   * Add stylesheet to document
   */
  private addStyleSheet(id: string, css: string): void {
    if (document.getElementById(id)) return

    const style = document.createElement('style')
    style.id = id
    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * Destroy modal and cleanup
   */
  private destroy(): void {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay)
    }

    // Restore body scroll
    document.body.style.overflow = ''

    this.overlay = null
    this.modal = null
    this.contentContainer = null
  }
}
