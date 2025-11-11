/**
 * Photo Upload Component
 * Supports camera capture and gallery selection with drag & drop
 */

export interface UploadOptions {
  onUpload: (file: File, dataUrl: string) => void
  onError: (error: string) => void
}

export class UploadComponent {
  private container: HTMLDivElement | null = null
  private fileInput: HTMLInputElement | null = null
  private options: UploadOptions

  constructor(options: UploadOptions) {
    this.options = options
  }

  /**
   * Render the upload UI
   */
  render(): HTMLElement {
    this.container = document.createElement('div')
    this.container.className = 'rf-upload-container'

    Object.assign(this.container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px'
    })

    // Add components
    this.container.appendChild(this.createInstructions())
    this.container.appendChild(this.createDropZone())
    this.container.appendChild(this.createDivider())
    this.container.appendChild(this.createCameraButton())

    return this.container
  }

  /**
   * Create instructions text
   */
  private createInstructions(): HTMLElement {
    const instructions = document.createElement('div')
    instructions.className = 'rf-upload-instructions'

    Object.assign(instructions.style, {
      textAlign: 'center',
      maxWidth: '400px'
    })

    const title = document.createElement('h3')
    title.textContent = 'Upload Your Photo'
    Object.assign(title.style, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827'
    })

    const description = document.createElement('p')
    description.textContent = 'Take a photo or upload from your gallery to see how this looks on you!'
    Object.assign(description.style, {
      margin: '0',
      fontSize: '14px',
      color: '#6b7280',
      lineHeight: '1.6'
    })

    const tips = document.createElement('div')
    tips.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 16px; font-size: 13px; color: #9ca3af; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #10b981;">✓</span>
          <span>Face the camera directly</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #10b981;">✓</span>
          <span>Good lighting works best</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #10b981;">✓</span>
          <span>Stand against a plain background</span>
        </div>
      </div>
    `

    instructions.appendChild(title)
    instructions.appendChild(description)
    instructions.appendChild(tips)

    return instructions
  }

  /**
   * Create drag & drop zone
   */
  private createDropZone(): HTMLElement {
    const dropZone = document.createElement('div')
    dropZone.className = 'rf-drop-zone'

    Object.assign(dropZone.style, {
      width: '100%',
      maxWidth: '400px',
      padding: '40px 24px',
      border: '2px dashed #d1d5db',
      borderRadius: '16px',
      backgroundColor: '#f9fafb',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center'
    })

    dropZone.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div>
          <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">
            Click to upload or drag & drop
          </div>
          <div style="font-size: 13px; color: #9ca3af;">
            PNG, JPG, WebP up to 5MB
          </div>
        </div>
      </div>
    `

    // Create hidden file input
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = 'image/jpeg,image/png,image/webp'
    this.fileInput.style.display = 'none'
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e))

    // Click to open file picker
    dropZone.addEventListener('click', () => {
      this.fileInput?.click()
    })

    // Drag & drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.style.borderColor = '#7c3aed'
      dropZone.style.backgroundColor = '#f3e8ff'
    })

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#d1d5db'
      dropZone.style.backgroundColor = '#f9fafb'
    })

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.style.borderColor = '#d1d5db'
      dropZone.style.backgroundColor = '#f9fafb'

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        this.processFile(files[0])
      }
    })

    // Hover effect
    dropZone.addEventListener('mouseenter', () => {
      if (dropZone.style.borderColor !== 'rgb(124, 58, 237)') {
        dropZone.style.borderColor = '#a78bfa'
        dropZone.style.backgroundColor = '#faf5ff'
      }
    })

    dropZone.addEventListener('mouseleave', () => {
      if (dropZone.style.borderColor !== 'rgb(124, 58, 237)') {
        dropZone.style.borderColor = '#d1d5db'
        dropZone.style.backgroundColor = '#f9fafb'
      }
    })

    dropZone.appendChild(this.fileInput)

    return dropZone
  }

  /**
   * Create divider
   */
  private createDivider(): HTMLElement {
    const divider = document.createElement('div')
    divider.className = 'rf-divider'

    Object.assign(divider.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      maxWidth: '400px',
      color: '#9ca3af',
      fontSize: '13px',
      fontWeight: '500'
    })

    divider.innerHTML = `
      <div style="flex: 1; height: 1px; background: #e5e7eb;"></div>
      <span>OR</span>
      <div style="flex: 1; height: 1px; background: #e5e7eb;"></div>
    `

    return divider
  }

  /**
   * Create camera button (mobile-friendly)
   */
  private createCameraButton(): HTMLElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'rf-camera-button'

    Object.assign(button.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      width: '100%',
      maxWidth: '400px',
      padding: '16px 24px',
      backgroundColor: '#ffffff',
      border: '2px solid #7c3aed',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#7c3aed',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit'
    })

    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      <span>Take a Photo</span>
    `

    // Create camera input
    const cameraInput = document.createElement('input')
    cameraInput.type = 'file'
    cameraInput.accept = 'image/*'
    cameraInput.capture = 'user' // Use front camera on mobile
    cameraInput.style.display = 'none'
    cameraInput.addEventListener('change', (e) => this.handleFileSelect(e))

    button.addEventListener('click', () => {
      cameraInput.click()
    })

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#7c3aed'
      button.style.color = '#ffffff'
    })

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#ffffff'
      button.style.color = '#7c3aed'
    })

    button.appendChild(cameraInput)

    return button
  }

  /**
   * Handle file select from input
   */
  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      this.processFile(file)
    }
  }

  /**
   * Process selected file
   */
  private processFile(file: File): void {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      this.options.onError('Please upload a valid image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      this.options.onError('Image size must be less than 5MB')
      return
    }

    // Read file as data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) {
        this.options.onUpload(file, dataUrl)
      }
    }
    reader.onerror = () => {
      this.options.onError('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  /**
   * Show preview of uploaded image
   */
  showPreview(dataUrl: string): void {
    if (!this.container) return

    this.container.innerHTML = ''

    const preview = document.createElement('div')
    preview.className = 'rf-upload-preview'

    Object.assign(preview.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      width: '100%'
    })

    const img = document.createElement('img')
    img.src = dataUrl
    img.alt = 'Preview'
    Object.assign(img.style, {
      width: '100%',
      maxWidth: '400px',
      height: 'auto',
      maxHeight: '400px',
      objectFit: 'contain',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    })

    const changeButton = document.createElement('button')
    changeButton.type = 'button'
    changeButton.textContent = 'Change Photo'
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

    changeButton.addEventListener('click', () => {
      this.container!.innerHTML = ''
      this.container!.appendChild(this.createInstructions())
      this.container!.appendChild(this.createDropZone())
      this.container!.appendChild(this.createDivider())
      this.container!.appendChild(this.createCameraButton())
    })

    preview.appendChild(img)
    preview.appendChild(changeButton)

    this.container.appendChild(preview)
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container = null
    this.fileInput = null
  }
}
