/**
 * Local Storage Utilities
 * Save customer photos and preferences to localStorage
 */

const STORAGE_PREFIX = 'rf_'
const PHOTO_KEY = `${STORAGE_PREFIX}customer_photo`
const CUSTOMER_ID_KEY = `${STORAGE_PREFIX}customer_id`
const PREFERENCES_KEY = `${STORAGE_PREFIX}preferences`

export interface CustomerPreferences {
  savedPhoto?: string
  customerId?: string
  lastUsed?: string
}

/**
 * Storage utility class
 */
export class Storage {
  /**
   * Save customer photo to localStorage
   */
  static savePhoto(dataUrl: string): void {
    try {
      localStorage.setItem(PHOTO_KEY, dataUrl)
      this.updateLastUsed()
    } catch (error) {
      console.warn('[RenderedFits] Failed to save photo to localStorage:', error)
    }
  }

  /**
   * Get saved customer photo
   */
  static getPhoto(): string | null {
    try {
      return localStorage.getItem(PHOTO_KEY)
    } catch (error) {
      console.warn('[RenderedFits] Failed to read photo from localStorage:', error)
      return null
    }
  }

  /**
   * Clear saved photo
   */
  static clearPhoto(): void {
    try {
      localStorage.removeItem(PHOTO_KEY)
    } catch (error) {
      console.warn('[RenderedFits] Failed to clear photo from localStorage:', error)
    }
  }

  /**
   * Save customer ID
   */
  static saveCustomerId(customerId: string): void {
    try {
      localStorage.setItem(CUSTOMER_ID_KEY, customerId)
    } catch (error) {
      console.warn('[RenderedFits] Failed to save customer ID:', error)
    }
  }

  /**
   * Get customer ID
   */
  static getCustomerId(): string | null {
    try {
      return localStorage.getItem(CUSTOMER_ID_KEY)
    } catch (error) {
      console.warn('[RenderedFits] Failed to read customer ID:', error)
      return null
    }
  }

  /**
   * Save preferences
   */
  static savePreferences(preferences: CustomerPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('[RenderedFits] Failed to save preferences:', error)
    }
  }

  /**
   * Get preferences
   */
  static getPreferences(): CustomerPreferences {
    try {
      const data = localStorage.getItem(PREFERENCES_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.warn('[RenderedFits] Failed to read preferences:', error)
      return {}
    }
  }

  /**
   * Update last used timestamp
   */
  private static updateLastUsed(): void {
    const prefs = this.getPreferences()
    prefs.lastUsed = new Date().toISOString()
    this.savePreferences(prefs)
  }

  /**
   * Clear all stored data
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(PHOTO_KEY)
      localStorage.removeItem(CUSTOMER_ID_KEY)
      localStorage.removeItem(PREFERENCES_KEY)
    } catch (error) {
      console.warn('[RenderedFits] Failed to clear localStorage:', error)
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = '__rf_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get storage size in KB
   */
  static getStorageSize(): number {
    try {
      let total = 0
      for (const key in localStorage) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key)
          if (value) {
            total += value.length
          }
        }
      }
      return Math.round(total / 1024) // Convert to KB
    } catch {
      return 0
    }
  }

  /**
   * Check if storage quota is exceeded
   */
  static isQuotaExceeded(): boolean {
    const sizeKB = this.getStorageSize()
    // Warn if over 2MB
    return sizeKB > 2048
  }
}
