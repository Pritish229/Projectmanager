import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, PageLoader } from '@/components/shared'
import { cn, formatDateTime } from '@/lib/utils'
import { Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, Clock, CheckCircle2, FolderKanban } from 'lucide-react'

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  overdue: AlertTriangle,
  deadline: Clock,
  approval: CheckCircle2,
  completion: FolderKanban
}

const NOTIFICATION_COLORS: Record<string, string> = {
  overdue: 'text-red-500 bg-red-500/10',
  deadline: 'text-amber-500 bg-amber-500/10',
  approval: 'text-blue-500 bg-blue-500/10',
  completion: 'text-emerald-500 bg-emerald-500/10'
}

export function NotificationsPage() {
  const { notifications, loading, fetchNotifications, markRead, markAllRead, deleteNotification, checkDeadlines } = useNotificationStore()

  useEffect(() => {
    checkDeadlines().then(() => fetchNotifications())
  }, [checkDeadlines, fetchNotifications])

  if (loading && notifications.length === 0) return <PageLoader />

  return (
    <div className="p-6 h-full overflow-auto">
      <Breadcrumbs items={[{ label: 'Notifications' }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notifications.filter(n => !n.read).length} unread
          </p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="You're all caught up! Notifications for overdue todos and upcoming deadlines will appear here."
        />
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifications.map((notif, i) => {
            const Icon = NOTIFICATION_ICONS[notif.type] || Bell
            const colorClass = NOTIFICATION_COLORS[notif.type] || 'text-muted-foreground bg-muted'

            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 animate-fade-in',
                  notif.read ? 'bg-card opacity-60' : 'bg-card shadow-sm'
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{formatDateTime(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
