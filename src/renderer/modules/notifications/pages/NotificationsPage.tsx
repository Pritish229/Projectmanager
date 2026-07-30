import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore, type NotificationItem } from '@/stores/useNotificationStore'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, PageLoader, ConfirmDialog } from '@/components/shared'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderKanban,
  Search,
  ExternalLink,
  RefreshCw,
  Inbox,
  ListTodo,
  ArrowRight,
  Filter,
  Sparkles
} from 'lucide-react'

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  overdue: AlertTriangle,
  deadline: Clock,
  approval: CheckCircle2,
  completion: FolderKanban,
  update: Sparkles
}

const NOTIFICATION_COLORS: Record<string, { icon: string; border: string; bg: string; badge: string }> = {
  overdue: {
    icon: 'text-red-500',
    border: 'border-red-500/20 hover:border-red-500/40',
    bg: 'bg-red-500/10',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
  deadline: {
    icon: 'text-amber-500',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  approval: {
    icon: 'text-blue-500',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  completion: {
    icon: 'text-emerald-500',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  update: {
    icon: 'text-indigo-500',
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
    bg: 'bg-indigo-500/10',
    badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  }
}

type TabFilter = 'all' | 'unread' | 'read'
type TypeFilter = 'all' | 'overdue' | 'deadline' | 'approval' | 'completion' | 'update'

export function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    checkDeadlines
  } = useNotificationStore()

  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [selectedType, setSelectedType] = useState<TypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)

  useEffect(() => {
    checkDeadlines().then(() => fetchNotifications())
  }, [checkDeadlines, fetchNotifications])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await checkDeadlines()
      await fetchNotifications()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Tab filter
      if (activeTab === 'unread' && notif.read) return false
      if (activeTab === 'read' && !notif.read) return false

      // Type filter
      if (selectedType !== 'all' && notif.type !== selectedType) return false

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = notif.title.toLowerCase().includes(query)
        const matchesMessage = notif.message.toLowerCase().includes(query)
        const matchesProject = notif.project?.name.toLowerCase().includes(query)
        if (!matchesTitle && !matchesMessage && !matchesProject) return false
      }

      return true
    })
  }, [notifications, activeTab, selectedType, searchQuery])

  // Summary counts
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])
  const readCount = useMemo(() => notifications.filter(n => n.read).length, [notifications])
  const overdueCount = useMemo(() => notifications.filter(n => n.type === 'overdue').length, [notifications])

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markRead(notif.id)
    }
    if (notif.type === 'update') {
      navigate('/settings')
    } else if (notif.projectId) {
      navigate(`/projects/${notif.projectId}?tab=todos`)
    }
  }

  if (loading && notifications.length === 0) return <PageLoader label="Loading notifications..." />

  return (
    <div className="p-6 h-full overflow-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Notifications' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with todo deadlines, project overdues, and task progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border bg-card hover:bg-muted transition-colors cursor-pointer"
            title="Refresh deadlines"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-card border border-muted hover:bg-muted transition-colors shadow-xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-primary" />
              Mark all read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Inbox</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Messages</p>
            <p className="text-xl font-bold">{notifications.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Unread</p>
            <p className="text-xl font-bold">{unreadCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Overdue Tasks</p>
            <p className="text-xl font-bold">{overdueCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Read</p>
            <p className="text-xl font-bold">{readCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Tab Filters */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border self-start">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
              activeTab === 'all'
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
              activeTab === 'unread'
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
              activeTab === 'read'
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Secondary filters & search */}
        <div className="flex items-center gap-2">
          {/* Type dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as TypeFilter)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="overdue">Overdue Todos</option>
              <option value="deadline">Upcoming Deadlines</option>
              <option value="approval">Approvals</option>
              <option value="completion">Completion</option>
              <option value="update">App Releases</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </div>

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="py-12 bg-card/40 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center p-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
            {notifications.length === 0 ? (
              <Sparkles className="w-8 h-8" />
            ) : (
              <BellOff className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <h3 className="text-lg font-semibold tracking-tight">
            {notifications.length === 0
              ? 'Your Inbox is Completely Clear!'
              : 'No matching notifications'}
          </h3>

          <p className="text-sm text-muted-foreground max-w-md mt-1.5">
            {notifications.length === 0
              ? "You're all caught up! Notifications for overdue todos and upcoming project deadlines will automatically show here."
              : 'Try adjusting your search query or switching your active filter tabs.'}
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Check Deadlines
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <span>Explore Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif, i) => {
            const Icon = NOTIFICATION_ICONS[notif.type] || Bell
            const styleTheme = NOTIFICATION_COLORS[notif.type] || {
              icon: 'text-muted-foreground',
              border: 'border-border',
              bg: 'bg-muted',
              badge: 'bg-muted text-muted-foreground'
            }

            return (
              <div
                key={notif.id}
                className={cn(
                  'group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md animate-fade-in',
                  styleTheme.border,
                  notif.read
                    ? 'bg-card/50 opacity-75 hover:opacity-100'
                    : 'bg-card shadow-xs ring-1 ring-primary/5'
                )}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                {/* Left section: Icon + Message */}
                <div
                  className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 transition-transform group-hover:scale-105',
                      styleTheme.bg
                    )}
                  >
                    <Icon className={cn('w-5 h-5', styleTheme.icon)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("text-sm font-semibold", !notif.read && "text-foreground font-bold")}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Unread" />
                      )}
                      {notif.project && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md border bg-muted/50 text-muted-foreground">
                          {notif.project.name}
                        </span>
                      )}
                      <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border capitalize', styleTheme.badge)}>
                        {notif.type}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right section: Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                  {notif.type === 'update' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!notif.read) await markRead(notif.id)
                        if (notif.title.includes('Ready to Install')) {
                          await window.api.update.restartAndInstall()
                        } else {
                          navigate('/settings')
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-xs cursor-pointer"
                      title={notif.title.includes('Ready to Install') ? "Restart and install update" : "Go to Settings and update"}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{notif.title.includes('Ready to Install') ? 'Restart & Install' : 'View Update'}</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  )}

                  {notif.projectId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNotificationClick(notif)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all shadow-2xs cursor-pointer"
                      title="Navigate to Todo tab"
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>View Todo</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markRead(notif.id)
                    }}
                    className={cn(
                      'p-2 rounded-xl border transition-colors cursor-pointer',
                      notif.read
                        ? 'hover:bg-muted text-muted-foreground/60 hover:text-foreground'
                        : 'hover:bg-primary/10 text-muted-foreground hover:text-primary border-primary/20'
                    )}
                    title={notif.read ? 'Marked as read' : 'Mark as read'}
                  >
                    <Check className={cn('w-4 h-4', notif.read && 'text-emerald-500')} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notif.id)
                    }}
                    className="p-2 rounded-xl border hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:border-destructive/20 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={deleteAllNotifications}
        title="Empty Notification Inbox?"
        description="Are you sure you want to permanently delete all notifications? This action cannot be undone."
        confirmLabel="Clear Inbox"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  )
}
