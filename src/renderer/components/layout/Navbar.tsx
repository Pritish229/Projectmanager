import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/useUIStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'

export function Navbar() {
  const { theme, setTheme, globalSearch, setGlobalSearch } = useUIStore()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    fetchUnreadCount()
    // Check every 5 minutes
    const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const cycleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }, [theme, setTheme])

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Global Search */}
      <div className="flex items-center flex-1 max-w-xl">
        <div className={cn(
          'flex items-center w-full gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
          searchFocused
            ? 'border-primary bg-background shadow-sm shadow-primary/10'
            : 'border-transparent bg-muted hover:bg-muted/80'
        )}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search projects, todos, notes... (Ctrl+K)"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {!searchFocused && (
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 ml-4">
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-scale-in">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
