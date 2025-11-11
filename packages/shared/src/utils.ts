// API endpoint helpers
export const API_ENDPOINTS = {
  TRY_ON: '/api/try-on',
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register'
  },
  API_KEYS: {
    LIST: '/api/api-keys',
    CREATE: '/api/api-keys',
    DELETE: (id: string) => `/api/api-keys/${id}`
  }
} as const

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidApiKey = (key: string): boolean => {
  return key.startsWith('rfts_') && key.length > 10
}

// Image validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export const isValidImageType = (mimeType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType)
}

export const isValidImageSize = (size: number): boolean => {
  return size <= MAX_IMAGE_SIZE
}

// Date formatting
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
