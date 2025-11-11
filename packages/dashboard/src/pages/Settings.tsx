import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Code, RefreshCw, Save, Eye } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'

type WidgetSettings = {
  buttonText: string
  buttonColor: string
  buttonPosition: 'below-add-to-cart' | 'floating' | 'custom'
  customCssSelector: string
  requireEmail: boolean
  showCompleteLook: boolean
  enableSizeRecommendations: boolean
}

export function Settings() {
  const { merchant } = useAuth()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState<'api' | 'code' | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  const [settings, setSettings] = useState<WidgetSettings>({
    buttonText: '👗 Try On Me',
    buttonColor: '#00C896',
    buttonPosition: 'below-add-to-cart',
    customCssSelector: '',
    requireEmail: false,
    showCompleteLook: true,
    enableSizeRecommendations: true,
  })

  const { data: fetchedSettings } = useQuery({
    queryKey: ['widget-settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings')
      return data.settings
    },
  })

  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        buttonText: fetchedSettings.buttonText,
        buttonColor: fetchedSettings.buttonColor,
        buttonPosition: fetchedSettings.buttonPosition,
        customCssSelector: fetchedSettings.customCssSelector || '',
        requireEmail: fetchedSettings.requireEmail,
        showCompleteLook: fetchedSettings.showCompleteLook,
        enableSizeRecommendations: fetchedSettings.enableSizeRecommendations,
      })
    }
  }, [fetchedSettings])

  const saveMutation = useMutation({
    mutationFn: async (newSettings: WidgetSettings) => {
      const { data } = await api.put('/api/settings', newSettings)
      return data.settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-settings'] })
    },
  })

  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/settings/regenerate-api-key')
      return data.merchant
    },
    onSuccess: (newMerchant) => {
      // Update merchant in localStorage
      localStorage.setItem('rf_merchant', JSON.stringify(newMerchant))
      window.location.reload()
    },
  })

  const copyToClipboard = (text: string, type: 'api' | 'code') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const handleRegenerateKey = () => {
    if (confirm('Are you sure? Your current API key will stop working immediately.')) {
      regenerateKeyMutation.mutate()
    }
  }

  const widgetCode = `<script src="https://cdn.renderedfits.com/widget.min.js"></script>
<script>
  RenderedFits.init({
    apiKey: '${merchant?.apiKey}',
    buttonText: '${settings.buttonText}',
    buttonColor: '${settings.buttonColor}',
    position: '${settings.buttonPosition}'${settings.buttonPosition === 'custom' ? `,\n    customSelector: '${settings.customCssSelector}'` : ''}
  });
</script>`

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Widget Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your virtual try-on widget</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Button Customization */}
          <div className="bg-muted border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Button Customization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Button Text</label>
                <input
                  type="text"
                  value={settings.buttonText}
                  onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="👗 Try On Me"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Button Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={settings.buttonColor}
                    onChange={(e) => setSettings({ ...settings, buttonColor: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.buttonColor}
                    onChange={(e) => setSettings({ ...settings, buttonColor: e.target.value })}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Button Position</label>
                <select
                  value={settings.buttonPosition}
                  onChange={(e) => setSettings({ ...settings, buttonPosition: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="below-add-to-cart">Below Add to Cart</option>
                  <option value="floating">Floating Button</option>
                  <option value="custom">Custom CSS Selector</option>
                </select>
              </div>

              {settings.buttonPosition === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom CSS Selector</label>
                  <input
                    type="text"
                    value={settings.customCssSelector}
                    onChange={(e) => setSettings({ ...settings, customCssSelector: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder=".product-actions"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., .product-actions or #add-to-cart-container
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="bg-muted border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Features</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer hover:bg-background/80 transition-colors">
                <div>
                  <div className="font-medium">Require Email</div>
                  <div className="text-sm text-muted-foreground">Ask customers for email before try-on</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireEmail}
                  onChange={(e) => setSettings({ ...settings, requireEmail: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer hover:bg-background/80 transition-colors">
                <div>
                  <div className="font-medium">Show "Complete the Look"</div>
                  <div className="text-sm text-muted-foreground">Suggest matching items after try-on</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showCompleteLook}
                  onChange={(e) => setSettings({ ...settings, showCompleteLook: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer hover:bg-background/80 transition-colors">
                <div>
                  <div className="font-medium">Enable Size Recommendations</div>
                  <div className="text-sm text-muted-foreground">AI-powered size suggestions based on body measurements</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSizeRecommendations}
                  onChange={(e) => setSettings({ ...settings, enableSizeRecommendations: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          {/* Integration Code */}
          <div className="bg-muted border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5" />
              Integration Code
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Installation Code</label>
                <div className="relative">
                  <pre className="p-4 bg-background border border-border rounded-lg overflow-x-auto text-sm">
                    <code>{widgetCode}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(widgetCode, 'code')}
                    className="absolute top-4 right-4 p-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                  >
                    {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Add this code to your product pages to enable virtual try-on.
                </p>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="bg-muted border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={merchant?.apiKey || ''}
                    readOnly
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(merchant?.apiKey || '', 'api')}
                    className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {copied === 'api' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Keep this key secret. Never share it publicly.
                </p>
              </div>

              <button
                onClick={handleRegenerateKey}
                disabled={regenerateKeyMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate API Key
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-6 py-3 bg-muted border border-border hover:bg-background font-medium rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-muted border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
              <div className="space-y-4">
                <div className="bg-background rounded-lg p-6 border border-border">
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center text-muted-foreground">
                    Product Image
                  </div>
                  <h3 className="font-semibold mb-2">Classic Cotton T-Shirt</h3>
                  <p className="text-2xl font-bold mb-4">$29.99</p>

                  <button className="w-full py-3 bg-foreground text-background font-medium rounded-lg mb-3">
                    Add to Cart
                  </button>

                  {settings.buttonPosition === 'below-add-to-cart' && (
                    <button
                      className="w-full py-3 font-medium rounded-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: settings.buttonColor, color: '#fff' }}
                    >
                      {settings.buttonText}
                    </button>
                  )}
                </div>

                {settings.buttonPosition === 'floating' && (
                  <div className="relative bg-background rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground mb-2">Floating button preview:</p>
                    <button
                      className="px-6 py-3 font-medium rounded-full shadow-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: settings.buttonColor, color: '#fff' }}
                    >
                      {settings.buttonText}
                    </button>
                  </div>
                )}

                {settings.buttonPosition === 'custom' && (
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      Button will be inserted at:<br />
                      <code className="text-primary">{settings.customCssSelector || '(not set)'}</code>
                    </p>
                  </div>
                )}

                <div className="bg-background rounded-lg p-4 border border-border space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Require Email:</span>
                    <span className={settings.requireEmail ? 'text-green-500' : 'text-muted-foreground'}>
                      {settings.requireEmail ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Complete the Look:</span>
                    <span className={settings.showCompleteLook ? 'text-green-500' : 'text-muted-foreground'}>
                      {settings.showCompleteLook ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size Recommendations:</span>
                    <span className={settings.enableSizeRecommendations ? 'text-green-500' : 'text-muted-foreground'}>
                      {settings.enableSizeRecommendations ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
