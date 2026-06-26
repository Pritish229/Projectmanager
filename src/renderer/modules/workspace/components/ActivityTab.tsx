import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import {
  Plus, CheckCircle, Trash2, Edit, FileText, Lock, Unlock, HelpCircle, User, RefreshCw, Activity
} from 'lucide-react'

interface ActivityLog {
  id: string
  action: string
  message: string
  createdAt: string
  user?: {
    name: string
    avatar?: string
  } | null
}

interface ActivityTabProps {
  projectId: string
}

function getActivityMeta(action: string) {
  switch (action) {
    case 'project_created':
      return { icon: Plus, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
    case 'project_reopened':
      return { icon: Unlock, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' }
    case 'project_closed':
      return { icon: Lock, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    case 'project_updated':
      return { icon: Edit, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' }
    case 'todo_created':
      return { icon: Plus, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' }
    case 'todo_completed':
      return { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    case 'todo_deleted':
      return { icon: Trash2, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' }
    case 'note_created':
      return { icon: FileText, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
    case 'note_deleted':
      return { icon: Trash2, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' }
    default:
      return { icon: HelpCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  }
}

export function ActivityTab({ projectId }: ActivityTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const data = await window.api.activity.getByProject(projectId)
        setLogs(data)
      } catch (err) {
        console.error('Error fetching activity logs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 animate-fade-in">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No activities logged yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Actions like adding tasks or editing notes will show up here to create an audit trail.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto h-full overflow-y-auto select-none animate-fade-in">
      <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Project Activity Log
      </h2>

      {/* Timeline List */}
      <div className="relative border-l border-border pl-6 space-y-6">
        {logs.map((log) => {
          const meta = getActivityMeta(log.action)
          const IconComponent = meta.icon

          return (
            <div key={log.id} className="relative group animate-fade-in">
              {/* Timeline Connector Indicator Node */}
              <span className="absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${meta.color}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </span>
              </span>

              {/* Message Details */}
              <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      {log.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-[10px] tracking-wide text-muted-foreground/60 uppercase">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* User Profile Badge (if exists) */}
                  {log.user && (
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg border text-xs shrink-0 select-none max-w-[120px]">
                      {log.user.avatar ? (
                        <img
                          src={log.user.avatar}
                          alt={log.user.name}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <span className="font-medium truncate text-muted-foreground">
                        {log.user.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
