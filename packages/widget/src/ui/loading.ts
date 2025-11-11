/**
 * Loading State Component
 * Beautiful animated loading indicator while AI generates the try-on
 */

export interface LoadingOptions {
  message?: string
}

export class LoadingComponent {
  private container: HTMLDivElement | null = null
  private options: LoadingOptions

  constructor(options: LoadingOptions = {}) {
    this.options = options
  }

  /**
   * Render the loading UI
   */
  render(): HTMLElement {
    this.container = document.createElement('div')
    this.container.className = 'rf-loading-container'

    Object.assign(this.container.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      minHeight: '400px',
      padding: '40px 20px'
    })

    this.container.appendChild(this.createSpinner())
    this.container.appendChild(this.createMessage())
    this.container.appendChild(this.createProgress())

    return this.container
  }

  /**
   * Create animated spinner
   */
  private createSpinner(): HTMLElement {
    const spinner = document.createElement('div')
    spinner.className = 'rf-spinner'

    Object.assign(spinner.style, {
      width: '80px',
      height: '80px',
      position: 'relative'
    })

    // Create three rotating circles
    for (let i = 0; i < 3; i++) {
      const circle = document.createElement('div')
      Object.assign(circle.style, {
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '4px solid transparent',
        borderTopColor: i === 0 ? '#7c3aed' : i === 1 ? '#a78bfa' : '#ddd6fe',
        borderRadius: '50%',
        animation: `rf-spin ${1.5 + i * 0.3}s linear infinite`,
        opacity: String(1 - i * 0.2)
      })
      spinner.appendChild(circle)
    }

    // Inject spinner animation
    this.injectSpinnerAnimation()

    return spinner
  }

  /**
   * Create loading message
   */
  private createMessage(): HTMLElement {
    const message = document.createElement('div')
    message.className = 'rf-loading-message'

    Object.assign(message.style, {
      textAlign: 'center',
      maxWidth: '400px'
    })

    const title = document.createElement('h3')
    title.textContent = this.options.message || 'Creating Your Virtual Try-On'
    Object.assign(title.style, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827'
    })

    const subtitle = document.createElement('p')
    subtitle.textContent = 'Our AI is working its magic...'
    Object.assign(subtitle.style, {
      margin: '0',
      fontSize: '14px',
      color: '#6b7280',
      lineHeight: '1.6'
    })

    message.appendChild(title)
    message.appendChild(subtitle)

    return message
  }

  /**
   * Create progress steps
   */
  private createProgress(): HTMLElement {
    const progress = document.createElement('div')
    progress.className = 'rf-loading-progress'

    Object.assign(progress.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      maxWidth: '400px',
      marginTop: '16px'
    })

    const steps = [
      { label: 'Analyzing your photo', delay: 0 },
      { label: 'Fitting the garment', delay: 800 },
      { label: 'Applying realistic shadows', delay: 1600 },
      { label: 'Finalizing details', delay: 2400 }
    ]

    steps.forEach((step, index) => {
      const stepEl = this.createProgressStep(step.label, index, step.delay)
      progress.appendChild(stepEl)
    })

    return progress
  }

  /**
   * Create individual progress step
   */
  private createProgressStep(label: string, index: number, delay: number): HTMLElement {
    const step = document.createElement('div')
    step.className = 'rf-progress-step'

    Object.assign(step.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      borderRadius: '10px',
      opacity: '0.3',
      transform: 'translateX(-10px)',
      transition: 'all 0.4s ease'
    })

    // Animated icon
    const icon = document.createElement('div')
    Object.assign(icon.style, {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: '2px solid #d1d5db',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    })

    icon.innerHTML = `
      <div style="width: 8px; height: 8px; background: #d1d5db; border-radius: 50%; transition: all 0.3s ease;"></div>
    `

    // Label
    const labelEl = document.createElement('span')
    labelEl.textContent = label
    Object.assign(labelEl.style, {
      fontSize: '14px',
      color: '#9ca3af',
      fontWeight: '500',
      transition: 'color 0.3s ease'
    })

    step.appendChild(icon)
    step.appendChild(labelEl)

    // Animate step activation
    setTimeout(() => {
      step.style.opacity = '1'
      step.style.transform = 'translateX(0)'

      setTimeout(() => {
        icon.style.borderColor = '#7c3aed'
        icon.querySelector('div')!.style.background = '#7c3aed'
        labelEl.style.color = '#111827'

        // Check mark after completion
        setTimeout(() => {
          icon.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `
          icon.style.backgroundColor = '#10b981'
          icon.style.borderColor = '#10b981'
          labelEl.style.color = '#6b7280'
        }, 600)
      }, 200)
    }, delay)

    return step
  }

  /**
   * Inject spinner animation
   */
  private injectSpinnerAnimation(): void {
    if (document.getElementById('rf-spinner-animation')) return

    const style = document.createElement('style')
    style.id = 'rf-spinner-animation'
    style.textContent = `
      @keyframes rf-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Update message
   */
  updateMessage(message: string): void {
    if (!this.container) return
    const messageEl = this.container.querySelector('.rf-loading-message h3')
    if (messageEl) {
      messageEl.textContent = message
    }
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container = null
  }
}
