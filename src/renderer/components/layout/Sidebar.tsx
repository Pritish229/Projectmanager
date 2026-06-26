import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/useUIStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bell,
  FileBarChart,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  Zap,
  Lock
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/backup', label: 'Backup & Restore', icon: Database },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { logout } = useAuthStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'h-screen flex flex-col transition-all duration-300 ease-in-out relative z-20',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold text-white tracking-tight">PWM</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-none">Workspace Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-white/8 hover:text-white',
                isActive
                  ? 'bg-primary/20 text-white shadow-sm'
                  : 'text-sidebar-foreground/70',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-primary')} />
              {!sidebarCollapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Lock Application and Collapse */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all cursor-pointer',
            'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300',
            sidebarCollapsed && 'justify-center px-2'
          )}
          title="Lock App"
        >
          <Lock className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && (
            <span className="animate-fade-in truncate">Lock Workspace</span>
          )}
        </button>

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all cursor-pointer',
            'text-sidebar-foreground/50 hover:text-white hover:bg-white/8',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="animate-fade-in">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
