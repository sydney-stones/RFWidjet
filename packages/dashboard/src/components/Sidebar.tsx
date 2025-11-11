import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Settings, CreditCard, Sparkles } from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="w-64 bg-muted border-r border-border flex flex-col">
      <div className="p-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        <span className="text-lg font-semibold">Rendered Fits</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
