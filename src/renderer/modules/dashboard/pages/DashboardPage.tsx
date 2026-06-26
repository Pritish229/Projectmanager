import { useEffect, useState } from 'react'
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
  XCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { cn, formatStatus } from '@/lib/utils'

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

const CHART_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#64748b']

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projectChart, setProjectChart] = useState<{ status: string; count: number }[]>([])
  const [todoChart, setTodoChart] = useState<{ status: string; count: number }[]>([])
  const [monthlyChart, setMonthlyChart] = useState<{ month: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsData, projectData, todoData, monthlyData] = await Promise.all([
        window.api.dashboard.getStats(),
        window.api.dashboard.projectStatusChart(),
        window.api.dashboard.todoCompletionChart(),
        window.api.dashboard.monthlyProjectChart()
      ])
      setStats(statsData)
      setProjectChart(projectData)
      setTodoChart(todoData)
      setMonthlyChart(monthlyData)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[5, 6, 7, 8].map(i => <CardSkeleton key={i} />)}
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

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      <div>
        <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your project workspace</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={cn('flex items-center justify-center w-11 h-11 rounded-xl', card.iconBg)}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Status Pie */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Project Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={projectChart.filter(d => d.count > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
            {projectChart.filter(d => d.count > 0).map((item, i) => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-muted-foreground">{formatStatus(item.status)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Todo Completion Bar */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Todo Completion</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={todoChart.filter(d => d.count > 0)} layout="vertical" margin={{ left: 20 }}>
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
                formatter={(value: number) => [value, 'Count']}
                labelFormatter={(label: string) => formatStatus(label)}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Projects</h3>
          <ResponsiveContainer width="100%" height={280}>
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
    </div>
  )
}
