import { useState } from 'react'
import { Copy, Check, Code } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function Settings() {
  const { merchant } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyApiKey = () => {
    navigator.clipboard.writeText(merchant?.apiKey || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const widgetCode = `<script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
<script>
  RenderedFits.init({
    apiKey: '${merchant?.apiKey}',
    productId: 'YOUR_PRODUCT_ID'
  })
</script>`

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and widget configuration</p>
      </div>

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
                onClick={copyApiKey}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Keep this key secret. Never share it publicly.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Code className="w-5 h-5" />
          Widget Integration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Installation Code</label>
            <div className="relative">
              <pre className="p-4 bg-background border border-border rounded-lg overflow-x-auto text-sm">
                <code>{widgetCode}</code>
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(widgetCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="absolute top-4 right-4 p-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Add this code to your product pages to enable virtual try-on.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={merchant?.businessName || ''}
              readOnly
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={merchant?.email || ''}
              readOnly
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Current Plan</label>
            <input
              type="text"
              value={merchant?.plan || ''}
              readOnly
              className="w-full px-4 py-2 bg-background border border-border rounded-lg capitalize"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
