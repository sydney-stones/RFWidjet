import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { api } from '../lib/api'

interface Merchant {
  id: string
  businessName: string
  email: string
  apiKey: string
  plan: string
}

interface AuthContextType {
  merchant: Merchant | null
  isAuthenticated: boolean
  login: (apiKey: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('rf_merchant')
    if (stored) {
      setMerchant(JSON.parse(stored))
    }
  }, [])

  const login = async (apiKey: string) => {
    const response = await api.get('/api/auth/me', {
      headers: { 'X-API-Key': apiKey }
    })
    const merchantData = { ...response.data.merchant, apiKey }
    setMerchant(merchantData)
    localStorage.setItem('rf_merchant', JSON.stringify(merchantData))
  }

  const logout = () => {
    setMerchant(null)
    localStorage.removeItem('rf_merchant')
  }

  return (
    <AuthContext.Provider value={{ merchant, isAuthenticated: !!merchant, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
