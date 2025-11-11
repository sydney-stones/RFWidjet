import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'

export function Overview() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/overview')
      return data.data
    },
  })

  const { data: timeline } = useQuery({
    queryKey: ['analytics-timeline'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/timeline?range=30d')
      return data.data
    },
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  const stats = [
    {
      name: 'Total Try-Ons',
      value: analytics?.totalTryons || 0,
      icon: Users,
      change: '+12%',
    },
    {
      name: 'Conversion Rate',
      value: `${analytics?.conversionRate || 0}%`,
      icon: TrendingUp,
      change: '+2.5%',
    },
    {
      name: 'Top Products',
      value: analytics?.topProducts?.length || 0,
      icon: Package,
      change: null,
    },
    {
      name: 'Total Revenue',
      value: `$${analytics?.revenue?.total?.toLocaleString() || 0}`,
      icon: DollarSign,
      change: '+18%',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">Your virtual try-on performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-muted border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-5 h-5 text-primary" />
              {stat.change && (
                <span className="text-xs text-green-500">{stat.change}</span>
              )}
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.name}</div>
          </div>
        ))}
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Try-On Activity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
            <XAxis dataKey="date" stroke="hsl(240 5% 64.9%)" />
            <YAxis stroke="hsl(240 5% 64.9%)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(240 10% 3.9%)',
                border: '1px solid hsl(240 3.7% 15.9%)',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="tryonCount" stroke="hsl(263 70% 50%)" strokeWidth={2} />
            <Line type="monotone" dataKey="conversions" stroke="hsl(142 76% 36%)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Top Products</h2>
        <div className="space-y-3">
          {analytics?.topProducts?.map((product: any) => (
            <div key={product.productId} className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded object-cover" />
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.tryonCount} try-ons</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{product.conversionRate}%</div>
                <div className="text-xs text-muted-foreground">conversion</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
