import { LogOut, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function TopBar() {
  const { merchant, logout } = useAuth()

  return (
    <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-muted">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{merchant?.businessName || 'Merchant'}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
