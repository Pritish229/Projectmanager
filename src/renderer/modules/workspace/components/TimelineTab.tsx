import { useEffect, useMemo } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { useDeliverableStore } from '@/stores/useDeliverableStore'
import { formatDate, cn } from '@/lib/utils'
import {
  Calendar, Flag, Play, CheckCircle2, AlertTriangle, FileText,
  Clock, CheckCircle, HelpCircle, ArrowRight
} from 'lucide-react'

interface TimelineTabProps {
  projectId: string
}

interface TimelineEvent {
  id: string
  date: Date
  type: 'project_start' | 'project_deadline' | 'task_start' | 'task_due' | 'deliverable_created' | 'deliverable_approved' | 'deliverable_rejected'
  title: string
  description?: string
  status?: string
  meta?: any
}

export function TimelineTab({ projectId }: TimelineTabProps) {
  const { currentProject } = useProjectStore()
  const { todos, fetchTodos } = useTodoStore()
  const { deliverables, fetchDeliverables } = useDeliverableStore()

  // Load data
  useEffect(() => {
    fetchTodos(projectId)
    fetchDeliverables(projectId)
  }, [projectId, fetchTodos, fetchDeliverables])

  // Build sorted list of timeline events
  const events = useMemo(() => {
    const list: TimelineEvent[] = []
    if (!currentProject) return list

    // 1. Project Start Date
    if (currentProject.startDate) {
      list.push({
        id: `proj-start-${currentProject.id}`,
        date: new Date(currentProject.startDate),
        type: 'project_start',
        title: 'Project Kickoff',
        description: `Project "${currentProject.name}" officially starts.`
      })
    }

    // 2. Project Deadline
    if (currentProject.deadline) {
      list.push({
        id: `proj-deadline-${currentProject.id}`,
        date: new Date(currentProject.deadline),
        type: 'project_deadline',
        title: 'Project Target Deadline',
        description: `Target completion date for "${currentProject.name}".`
      })
    }

    // 3. Todos Start & Due dates
    todos.forEach(todo => {
      if (todo.startDate) {
        list.push({
          id: `todo-start-${todo.id}`,
          date: new Date(todo.startDate),
          type: 'task_start',
          title: `Task Starts: ${todo.title}`,
          description: todo.description || 'No description provided.',
          status: todo.status
        })
      }
      if (todo.dueDate) {
        list.push({
          id: `todo-due-${todo.id}`,
          date: new Date(todo.dueDate),
          type: 'task_due',
          title: `Task Deadline: ${todo.title}`,
          description: todo.description || 'No description provided.',
          status: todo.status
        })
      }
    })

    // 4. Deliverables & Approvals
    deliverables.forEach(del => {
      // Deliverable creation date
      list.push({
        id: `del-create-${del.id}`,
        date: new Date(del.createdAt),
        type: 'deliverable_created',
        title: `Deliverable Created: ${del.title}`,
        description: `Version v${del.version} metadata created. (${del.deliverableNumber})`,
        status: del.status
      })

      // Deliverable approval records
      if (del.approvals && del.approvals.length > 0) {
        del.approvals.forEach(appr => {
          if (appr.status === 'approved') {
            list.push({
              id: `del-approve-${appr.id}`,
              date: new Date(appr.date || appr.createdAt),
              type: 'deliverable_approved',
              title: `Deliverable Approved: ${del.title}`,
              description: appr.comment ? `Client approved: "${appr.comment}"` : `Version v${del.version} approved by client.`,
              meta: appr
            })
          } else if (appr.status === 'rejected' || appr.status === 'changes_requested') {
            list.push({
              id: `del-reject-${appr.id}`,
              date: new Date(appr.date || appr.createdAt),
              type: 'deliverable_rejected',
              title: `Feedback: Changes Requested on ${del.title}`,
              description: appr.comment ? `Client feedback: "${appr.comment}"` : `Feedback changes requested.`,
              meta: appr
            })
          }
        })
      }
    })

    // Sort events by date (oldest first or newest first? Let's do chronological: oldest first so it reads forward in time, or newest first for activity log. A project timeline usually reads chronological: oldest to newest).
    return list.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [currentProject, todos, deliverables])

  // Get icons and background colors for each type
  const getEventStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'project_start':
        return {
          icon: <Flag className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
        }
      case 'project_deadline':
        return {
          icon: <Flag className="w-4 h-4 text-red-600" />,
          bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30'
        }
      case 'task_start':
        return {
          icon: <Play className="w-4 h-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30'
        }
      case 'task_due':
        return {
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30'
        }
      case 'deliverable_created':
        return {
          icon: <FileText className="w-4 h-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/30'
        }
      case 'deliverable_approved':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
        }
      case 'deliverable_rejected':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
          bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30'
        }
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-muted-foreground" />,
          bg: 'bg-muted border-border'
        }
    }
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      <div className="mb-6 shrink-0">
        <h2 className="text-lg font-bold text-foreground">Project Timeline</h2>
        <p className="text-xs text-muted-foreground">Chronological summary of key milestones, schedules, tasks, and client review feedback.</p>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-xl bg-card p-6">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No timeline events scheduled. Add project dates, tasks, or deliverables.</p>
          </div>
        ) : (
          <div className="relative border-l border-border pl-8 ml-4 space-y-8 select-none py-2">
            {events.map(event => {
              const style = getEventStyle(event.type)
              return (
                <div key={event.id} className="relative">
                  {/* Point Indicator */}
                  <div className={cn(
                    "absolute -left-[45px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-card shadow-sm z-10",
                    style.bg
                  )}>
                    {style.icon}
                  </div>

                  {/* Body */}
                  <div className="space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-foreground">{event.title}</h3>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(event.date)}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                        {event.description}
                      </p>
                    )}

                    {event.status && (
                      <div className="pt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>Status:</span>
                        <span className="font-semibold px-1.5 py-0.5 rounded bg-muted border text-foreground uppercase tracking-wider font-mono">
                          {event.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
