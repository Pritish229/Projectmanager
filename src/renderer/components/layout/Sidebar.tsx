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
  Lock,
  PanelLeftClose,
  PanelLeft
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
        'h-screen flex flex-col transition-all duration-300 ease-in-out relative z-20 select-none',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xs',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Header & Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      )}>
        <div
          onClick={sidebarCollapsed ? toggleSidebar : undefined}
          className={cn(
            'flex items-center gap-3 min-w-0',
            sidebarCollapsed && 'cursor-pointer'
          )}
          title={sidebarCollapsed ? 'Click to expand sidebar' : undefined}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0 transition-colors hover:bg-primary/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-tight">PWM</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Workspace Manager</p>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
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
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px] shrink-0 transition-colors',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              {!sidebarCollapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Lock Application and Collapse Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all cursor-pointer font-medium',
            'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300',
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
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            sidebarCollapsed && 'justify-center px-2'
          )}
          title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="animate-fade-in">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
