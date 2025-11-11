import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Widget initialization function for embedding in e-commerce sites
export function initRenderedFitsWidget(config: {
  apiKey: string
  containerId: string
  apiUrl?: string
}) {
  const container = document.getElementById(config.containerId)
  if (!container) {
    console.error(`Container with id "${config.containerId}" not found`)
    return
  }

  const root = ReactDOM.createRoot(container)
  root.render(
    <React.StrictMode>
      <App apiKey={config.apiKey} apiUrl={config.apiUrl} />
    </React.StrictMode>
  )
}

// For development mode
if (import.meta.env.DEV) {
  const root = document.getElementById('root')
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App apiKey="dev-api-key" />
      </React.StrictMode>
    )
  }
}
