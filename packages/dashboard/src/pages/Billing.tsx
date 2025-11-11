import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'

const PLANS = {
  ATELIER: { name: 'Atelier', price: 99, limit: 500 },
  MAISON: { name: 'Maison', price: 299, limit: 2000 },
  COUTURE: { name: 'Couture', price: 999, limit: 5000 },
}

export function Billing() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/overview')
      return data.data
    },
  })

  const usage = analytics?.usageThisMonth || { used: 0, limit: 0, remaining: 0, percentage: 0 }
  const plan = PLANS[analytics?.plan as keyof typeof PLANS] || PLANS.ATELIER

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and monitor usage</p>
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Current Plan</h2>
            <p className="text-muted-foreground text-sm mt-1">{plan.name} - ${plan.price}/month</p>
          </div>
          <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
            Upgrade Plan
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Usage</span>
              <span className="text-sm text-muted-foreground">
                {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} try-ons
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {usage.remaining.toLocaleString()} try-ons remaining this month
            </p>
          </div>

          {usage.percentage > 80 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              You're approaching your monthly limit. Consider upgrading your plan.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, p]) => (
          <div
            key={key}
            className={`bg-muted border rounded-lg p-6 ${
              p.name === plan.name ? 'border-primary' : 'border-border'
            }`}
          >
            <h3 className="text-lg font-semibold mb-2">{p.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">${p.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>{p.limit.toLocaleString()} try-ons/month</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Analytics dashboard</span>
              </div>
            </div>
            {p.name === plan.name ? (
              <div className="w-full py-2 px-4 bg-primary/20 text-primary text-center font-medium rounded-lg">
                Current Plan
              </div>
            ) : (
              <button className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
                {p.price > plan.price ? 'Upgrade' : 'Downgrade'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
