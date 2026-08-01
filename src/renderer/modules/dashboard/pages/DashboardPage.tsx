import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout'
import { CardSkeleton } from '@/components/shared'
import {
  FolderKanban,
  Zap,
  Clock,
  CheckCircle2,
  ListTodo,
  CircleCheck,
  AlertTriangle,
  XCircle,
  Receipt,
  DollarSign,
  ArrowRight,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  UserCheck,
  CheckSquare
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { cn, formatStatus, formatDate } from '@/lib/utils'
import { toast } from '@/stores/useToastStore'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  waitingApproval: number
  closedProjects: number
  totalTodos: number
  completedTodos: number
  overdueTodos: number
  rejectedDeliverables: number
}

interface RecentProject {
  id: string
  name: string
  code: string
  status: string
  priority: string
  clientName: string | null
  totalTodos: number
  completedTodos: number
  updatedAt: string
}

interface UrgentTodo {
  id: string
  title: string
  priority: string
  status: string
  dueDate: string | null
  project: {
    id: string
    name: string
    code: string
  }
}

interface InvoiceStats {
  totalCount: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  statusCounts: {
    draft: number
    sent: number
    paid: number
    overdue: number
    cancelled: number
  }
  currencySymbol: string
}

interface ActivityLog {
  id: string
  action: string
  message: string
  createdAt: string
  project?: {
    name: string
    code: string
  }
  user?: {
    name: string
  }
}

const CHART_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#64748b']

const RupeeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13h5a4 4 0 0 0 0-8" />
    <path d="M6 13l7 8" />
  </svg>
)

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projectChart, setProjectChart] = useState<{ status: string; count: number }[]>([])
  const [todoChart, setTodoChart] = useState<{ status: string; count: number }[]>([])
  const [monthlyChart, setMonthlyChart] = useState<{ month: string; count: number }[]>([])

  // New Dashboard Data States
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [urgentTodos, setUrgentTodos] = useState<UrgentTodo[]>([])
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [
        statsData,
        projectData,
        todoData,
        monthlyData,
        projectsData,
        todosData,
        invoicesData,
        activitiesData
      ] = await Promise.all([
        window.api.dashboard.getStats(),
        window.api.dashboard.projectStatusChart(),
        window.api.dashboard.todoCompletionChart(),
        window.api.dashboard.monthlyProjectChart(),
        window.api.dashboard.recentProjects(),
        window.api.dashboard.urgentTodos(),
        window.api.dashboard.invoiceStats(),
        window.api.dashboard.recentActivity()
      ])

      setStats(statsData)
      setProjectChart(projectData)
      setTodoChart(todoData)
      setMonthlyChart(monthlyData)
      setRecentProjects(projectsData || [])
      setUrgentTodos(todosData || [])
      setInvoiceStats(invoicesData || null)
      setActivities(activitiesData || [])
    } catch (err) {
      console.error('[Dashboard] Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTodo = async (todoId: string) => {
    try {
      await window.api.todos.updateStatus(todoId, 'completed')
      toast.success('Task Completed', 'Todo updated successfully.')
      setUrgentTodos((prev) => prev.filter((t) => t.id !== todoId))
    } catch {
      toast.error('Error', 'Failed to update todo status.')
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[5, 6, 7, 8].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-500/10 text-indigo-500' },
    { label: 'Active Projects', value: stats?.activeProjects || 0, icon: Zap, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-500/10 text-blue-500' },
    { label: 'Waiting Approval', value: stats?.waitingApproval || 0, icon: Clock, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-500/10 text-amber-500' },
    { label: 'Closed Projects', value: stats?.closedProjects || 0, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Total Todos', value: stats?.totalTodos || 0, icon: ListTodo, color: 'from-violet-500 to-violet-600', iconBg: 'bg-violet-500/10 text-violet-500' },
    { label: 'Completed Todos', value: stats?.completedTodos || 0, icon: CircleCheck, color: 'from-teal-500 to-teal-600', iconBg: 'bg-teal-500/10 text-teal-500' },
    { label: 'Overdue Todos', value: stats?.overdueTodos || 0, icon: AlertTriangle, color: 'from-orange-500 to-orange-600', iconBg: 'bg-orange-500/10 text-orange-500' },
    { label: 'Rejected Deliverables', value: stats?.rejectedDeliverables || 0, icon: XCircle, color: 'from-red-500 to-red-600', iconBg: 'bg-red-500/10 text-red-500' }
  ]

  const currSym = invoiceStats?.currencySymbol || '₹'

  return (
    <div className="p-6 space-y-8 overflow-auto h-full pb-16">
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your workspace, financials, projects, and tasks</p>
        </div>
      </div>

      {/* 1. Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-extrabold mt-1 font-mono">{card.value}</p>
              </div>
              <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', card.iconBg)}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className={cn(
              'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity',
              card.color
            )} />
          </div>
        ))}
      </div>

      {/* 2. NEW SECTION: Financial & Invoicing Overview */}
      {invoiceStats && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                {currSym === '₹' ? <RupeeIcon className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold">Financial & Invoicing Overview</h3>
                <p className="text-xs text-muted-foreground">Revenue collection, pending invoices, and status distribution</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {invoiceStats.totalCount} Invoices Recorded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="p-4 rounded-xl border bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium block">Total Invoiced</span>
              <span className="text-xl font-extrabold font-mono text-foreground mt-1 block">
                {currSym}{invoiceStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Collected / Paid */}
            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <span className="text-xs text-emerald-600 font-medium block">Total Paid / Collected</span>
              <span className="text-xl font-extrabold font-mono text-emerald-600 mt-1 block">
                {currSym}{invoiceStats.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Pending / Sent */}
            <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20">
              <span className="text-xs text-blue-600 font-medium block">Pending / Sent Amount</span>
              <span className="text-xl font-extrabold font-mono text-blue-600 mt-1 block">
                {currSym}{invoiceStats.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-xl border bg-red-500/5 border-red-500/20">
              <span className="text-xs text-red-600 font-medium block">Overdue Revenue</span>
              <span className="text-xl font-extrabold font-mono text-red-600 mt-1 block">
                {currSym}{invoiceStats.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-semibold text-muted-foreground">Status Breakdown:</span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
              Draft: {invoiceStats.statusCounts.draft}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 font-medium">
              Sent: {invoiceStats.statusCounts.sent}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium">
              Paid: {invoiceStats.statusCounts.paid}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 border border-red-500/20 font-medium">
              Overdue: {invoiceStats.statusCounts.overdue}
            </span>
            {invoiceStats.statusCounts.cancelled > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-600 border border-gray-500/20 font-medium">
                Cancelled: {invoiceStats.statusCounts.cancelled}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Status Pie */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={projectChart.filter((d) => d.count > 0)}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="count"
                nameKey="status"
              >
                {projectChart.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => [value, formatStatus(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {projectChart.filter((d) => d.count > 0).map((item, i) => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-muted-foreground">{formatStatus(item.status)} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Todo Completion Bar */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Task Completion Breakdown</h3>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={todoChart.filter((d) => d.count > 0)} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                type="category"
                dataKey="status"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v: string) => formatStatus(v)}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value, 'Tasks']}
                labelFormatter={(label: string) => formatStatus(label)}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Projects Trend</h3>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={monthlyChart}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. NEW SECTION: Recent Active Projects Quick Access */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Active & Recent Projects</h3>
              <p className="text-xs text-muted-foreground">Jump directly into recently modified project workspaces</p>
            </div>
          </div>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 text-center border rounded-xl border-dashed text-muted-foreground text-xs">
            No active projects available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => {
              const pct = project.totalTodos > 0 ? Math.round((project.completedTodos / project.totalTodos) * 100) : 0

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="border rounded-xl p-4 bg-muted/10 hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground block">
                        #{project.code}
                      </span>
                      <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h4>
                      {project.clientName && (
                        <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                      {formatStatus(project.status)}
                    </span>
                  </div>

                  {/* Todo Completion Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tasks Progress</span>
                      <span className="font-mono font-bold text-foreground">
                        {project.completedTodos}/{project.totalTodos} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Open Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. NEW DUAL GRID: Urgent Tasks + Recent Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Urgent & Overdue Tasks */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Urgent & Overdue Tasks</h3>
                <p className="text-xs text-muted-foreground">High priority or past due items requiring action</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
              {urgentTodos.length} Items
            </span>
          </div>

          {urgentTodos.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed text-muted-foreground text-xs">
              No urgent or overdue tasks! Great job.
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentTodos.map((todo) => {
                const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date()

                return (
                  <div
                    key={todo.id}
                    onClick={() => navigate(`/projects/${todo.projectId}?tab=todos`)}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteTodo(todo.id)
                        }}
                        className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
                        title="Mark Complete"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate text-foreground">{todo.title}</span>
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            #{todo.project?.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {todo.dueDate && (
                            <span className={cn('flex items-center gap-1', isOverdue ? 'text-red-500 font-bold' : '')}>
                              <Calendar className="w-3 h-3" /> Due {formatDate(todo.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        todo.priority === 'urgent' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                      )}>
                        {todo.priority}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Workspace Activity Stream */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Recent Activity Feed</h3>
                <p className="text-xs text-muted-foreground">Timeline of recent actions across workspace</p>
              </div>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed text-muted-foreground text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  onClick={() => log.projectId && navigate(`/projects/${log.projectId}`)}
                  className={cn(
                    "flex items-start gap-3 text-xs border-b pb-2.5 last:border-none",
                    log.projectId ? "cursor-pointer hover:bg-muted/30 p-1.5 rounded-lg transition-colors" : ""
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{log.message}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {log.project && (
                        <span className="font-mono text-primary font-semibold">#{log.project.code}</span>
                      )}
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
