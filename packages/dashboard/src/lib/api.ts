import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const merchant = localStorage.getItem('rf_merchant')
  if (merchant) {
    const { apiKey } = JSON.parse(merchant)
    config.headers['X-API-Key'] = apiKey
  }
  return config
})
