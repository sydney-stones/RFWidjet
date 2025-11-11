import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, Package, DollarSign, ArrowUpDown, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'

type SortField = 'name' | 'tryonCount' | 'conversionRate'
type SortDirection = 'asc' | 'desc'

export function Overview() {
  const [sortField, setSortField] = useState<SortField>('tryonCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/overview')
      return data.data
    },
    refetchInterval: 30000,
  })

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics-timeline'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/timeline?range=30d')
      return data.data
    },
    refetchInterval: 30000,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['analytics-products'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/analytics/products')
      return data.data
    },
    refetchInterval: 30000,
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedProducts = products ? [...products].sort((a: any, b: any) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    const multiplier = sortDirection === 'asc' ? 1 : -1
    if (typeof aVal === 'string') return aVal.localeCompare(bVal) * multiplier
    return (aVal - bVal) * multiplier
  }) : []

  const recentActivity = analytics?.recentTryons || []

  const usage = analytics?.usageThisMonth || { used: 0, limit: 0, remaining: 0, percentage: 0 }
  const stats = [
    {
      name: 'Total Try-Ons',
      value: analytics?.totalTryons || 0,
      icon: Users,
      change: analytics?.changes?.tryons,
    },
    {
      name: 'Conversion Rate',
      value: `${analytics?.conversionRate || 0}%`,
      icon: TrendingUp,
      change: analytics?.changes?.conversionRate,
    },
    {
      name: 'Revenue Attributed',
      value: `$${analytics?.revenue?.total?.toLocaleString() || 0}`,
      icon: DollarSign,
      change: analytics?.changes?.revenue,
    },
    {
      name: 'Usage This Month',
      value: `${usage.used.toLocaleString()}`,
      subtitle: `of ${usage.limit.toLocaleString()}`,
      icon: Package,
      progress: usage.percentage,
    },
  ]

  const StatSkeleton = () => (
    <div className="bg-muted border border-border rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-5 h-5 bg-background rounded"></div>
        <div className="w-12 h-4 bg-background rounded"></div>
      </div>
      <div className="w-20 h-8 bg-background rounded mb-2"></div>
      <div className="w-24 h-4 bg-background rounded"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">Your virtual try-on performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          stats.map((stat) => (
            <div key={stat.name} className="bg-muted border border-border rounded-lg p-6 transition-all hover:border-primary/50">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-5 h-5 text-primary" />
                {stat.change && (
                  <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.name}
                {stat.subtitle && <span className="ml-1">{stat.subtitle}</span>}
              </div>
              {stat.progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-muted border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Try-On Activity (Last 30 Days)</h2>
        {timelineLoading ? (
          <div className="animate-pulse h-[300px] bg-background rounded"></div>
        ) : (
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-muted border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Top Products</h2>
          </div>
          {productsLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-background rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded"></div>
                  <div className="flex-1">
                    <div className="w-32 h-4 bg-muted rounded mb-2"></div>
                    <div className="w-20 h-3 bg-muted rounded"></div>
                  </div>
                  <div className="w-16 h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                    >
                      Product
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('tryonCount')}
                      className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                    >
                      Try-Ons
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('conversionRate')}
                      className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                    >
                      Conversion
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedProducts.map((product: any) => (
                  <tr key={product.productId} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        <div className="font-medium">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{product.tryonCount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {product.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-muted border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-24 h-3 bg-background rounded mb-2"></div>
                    <div className="w-full h-4 bg-background rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 10).map((activity: any, idx: number) => (
                  <div key={idx} className="pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      Try-on for <span className="font-medium text-primary">{activity.productName}</span>
                    </div>
                    {activity.converted && (
                      <div className="text-xs text-green-500 mt-1">✓ Converted to purchase</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
