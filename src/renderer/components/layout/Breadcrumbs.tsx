import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const location = useLocation()

  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbs: BreadcrumbItem[] = items || generateBreadcrumbs(location.pathname)

  if (breadcrumbs.length <= 1 && location.pathname === '/') return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4 animate-fade-in">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          {crumb.path && index < breadcrumbs.length - 1 ? (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={cn(
              index === breadcrumbs.length - 1 && 'text-foreground font-medium'
            )}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = []

  const labels: Record<string, string> = {
    projects: 'Projects',
    workspace: 'Workspace',
    reports: 'Reports',
    notifications: 'Notifications',
    backup: 'Backup & Restore',
    settings: 'Settings'
  }

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    crumbs.push({
      label: labels[segment] || segment,
      path: currentPath
    })
  }

  return crumbs
}
