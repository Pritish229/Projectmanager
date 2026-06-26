import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore, type Project } from '@/stores/useProjectStore'
import { Breadcrumbs } from '@/components/layout'
import { StatusBadge, PriorityBadge, PageLoader } from '@/components/shared'
import { cn, formatDate } from '@/lib/utils'
import {
  LayoutDashboard, ListTodo, FileText, CheckSquare, FolderOpen,
  StickyNote, Clock, Activity, Settings, Lock,
  Building2, Calendar, Mail, Phone, ArrowLeft
} from 'lucide-react'
import { TodosTab } from '../components/TodosTab'
import { NotesTab } from '../components/NotesTab'
import { ActivityTab } from '../components/ActivityTab'
import { DeliverablesTab } from '../components/DeliverablesTab'
import { ApprovalsTab } from '../components/ApprovalsTab'
import { TimelineTab } from '../components/TimelineTab'
import { FilesTab } from '../components/FilesTab'
import { SettingsTab } from '../components/SettingsTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'todos', label: 'Todos', icon: ListTodo },
  { id: 'deliverables', label: 'Deliverables', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'activity', label: 'Activity Log', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, loading, fetchProject } = useProjectStore()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id, fetchProject])

  useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tabId: string }>
      if (customEvent.detail?.tabId) {
        setActiveTab(customEvent.detail.tabId)
      }
    }
    window.addEventListener('workspace:switch-tab', handleSwitchTab)
    return () => window.removeEventListener('workspace:switch-tab', handleSwitchTab)
  }, [])

  if (loading || !currentProject) return <PageLoader />

  const isReadOnly = currentProject.status === 'closed'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b bg-card/50 px-6 pt-4 pb-0">
        <div className="flex items-start gap-4 mb-4">
          <button
            onClick={() => navigate('/projects')}
            className="mt-1 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <Breadcrumbs items={[
              { label: 'Projects', path: '/projects' },
              { label: currentProject.name }
            ]} />

            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold truncate">{currentProject.name}</h1>
              <StatusBadge status={currentProject.status} />
              <PriorityBadge priority={currentProject.priority} />
              {isReadOnly && (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono">{currentProject.code}</span>
              {currentProject.client && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {currentProject.client.name}
                  {currentProject.client.company && ` · ${currentProject.client.company}`}
                </span>
              )}
              {currentProject.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due {formatDate(currentProject.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <OverviewTab project={currentProject} />}
        {activeTab === 'todos' && <TodosTab projectId={currentProject.id} isReadOnly={isReadOnly} />}
        {activeTab === 'deliverables' && <DeliverablesTab projectId={currentProject.id} isReadOnly={isReadOnly} />}
        {activeTab === 'approvals' && <ApprovalsTab projectId={currentProject.id} isReadOnly={isReadOnly} />}
        {activeTab === 'files' && <FilesTab projectId={currentProject.id} isReadOnly={isReadOnly} />}
        {activeTab === 'notes' && <NotesTab projectId={currentProject.id} isReadOnly={isReadOnly} />}
        {activeTab === 'timeline' && <TimelineTab projectId={currentProject.id} />}
        {activeTab === 'activity' && <ActivityTab projectId={currentProject.id} />}
        {activeTab === 'settings' && <SettingsTab project={currentProject} />}
      </div>
    </div>
  )
}

function OverviewTab({ project }: { project: Project }) {
  const p = project

  const todoCount = (p.todos as unknown[])?.length || 0
  const completedTodos = (p.todos as { status: string }[])?.filter(t => t.status === 'completed').length || 0
  const progress = todoCount > 0 ? Math.round((completedTodos / todoCount) * 100) : 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{p.description || 'No description provided.'}</p>
          </div>

          {/* Progress */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Progress</h3>
              <span className="text-2xl font-bold">{progress}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedTodos} of {todoCount} todos completed
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Todos', value: todoCount, icon: ListTodo },
              { label: 'Deliverables', value: (p.deliverables as unknown[])?.length || 0, icon: FileText },
              { label: 'Notes', value: (p.notes as unknown[])?.length || 0, icon: StickyNote },
              { label: 'Files', value: (p.files as unknown[])?.length || 0, icon: FolderOpen }
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border bg-card p-4 text-center">
                <stat.icon className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Start Date</dt>
                <dd>{formatDate(p.startDate)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Deadline</dt>
                <dd>{formatDate(p.deadline)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Priority</dt>
                <dd><PriorityBadge priority={p.priority} /></dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd><StatusBadge status={p.status} /></dd>
              </div>
              {p.tags && (
                <div className="pt-2">
                  <dt className="text-xs text-muted-foreground mb-2">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {p.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/30">{tag}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Client */}
          {p.client && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Client</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{p.client.name}</span>
                </div>
                {p.client.company && (
                  <p className="text-muted-foreground pl-6">{p.client.company}</p>
                )}
                {p.client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{p.client.email}</span>
                  </div>
                )}
                {p.client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{p.client.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlaceholderTab({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
