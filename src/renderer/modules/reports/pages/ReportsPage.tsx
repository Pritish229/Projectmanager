import { useEffect, useState, useMemo } from 'react'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, PageLoader } from '@/components/shared'
import {
  FolderKanban,
  ListTodo,
  FileText,
  CheckSquare,
  Download,
  Calendar,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  X,
  Plus
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { cn, formatDate } from '@/lib/utils'

const REPORT_TYPES = [
  { id: 'projects', label: 'Projects Overview', icon: FolderKanban, color: 'text-indigo-500 bg-indigo-500/10' },
  { id: 'todos', label: 'Tasks (Todos)', icon: ListTodo, color: 'text-violet-500 bg-violet-500/10' },
  { id: 'deliverables', label: 'Deliverables', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'approvals', label: 'Client Approvals', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-500/10' }
] as const

const CHART_COLORS = ['#6366f1', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

export function ReportsPage() {
  const [activeReportType, setActiveReportType] = useState<'projects' | 'todos' | 'deliverables' | 'approvals'>('projects')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects list on mount to populate filter dropdown
  useEffect(() => {
    window.api.projects.getAll({ archived: false })
      .then(setProjectsList)
      .catch(err => console.error('Error fetching projects list:', err))
  }, [])

  // Refetch report data whenever report type or project selection changes
  useEffect(() => {
    loadReportData()
  }, [activeReportType, selectedProjectId])

  const loadReportData = async () => {
    setLoading(true)
    setError(null)
    const pid = selectedProjectId === 'all' ? undefined : selectedProjectId
    try {
      let data
      if (activeReportType === 'projects') {
        data = await window.api.reports.projectSummary(pid)
      } else if (activeReportType === 'todos') {
        data = await window.api.reports.todoSummary(pid)
      } else if (activeReportType === 'deliverables') {
        data = await window.api.reports.deliverableSummary(pid)
      } else if (activeReportType === 'approvals') {
        data = await window.api.reports.approvalSummary(pid)
      }
      setReportData(data)
    } catch (err) {
      setError('Failed to fetch report data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // PDF Export Trigger
  const handlePdfExport = async () => {
    if (!reportData) return
    setExportingPdf(true)
    let typeLabel = ''
    let pdfData: Record<string, any> = {}

    if (activeReportType === 'projects') {
      typeLabel = selectedProjectId === 'all' ? 'All Projects Overview' : `Project Overview (${reportData.name})`
      if (selectedProjectId === 'all') {
        pdfData = {
          'Total Projects': reportData.length,
          'Active Projects': reportData.filter((p: any) => p.status === 'active').length,
          'Waiting Approval': reportData.filter((p: any) => p.status === 'waiting_approval').length,
          'Closed Projects': reportData.filter((p: any) => p.status === 'closed').length
        }
      } else {
        pdfData = {
          'Project Name': reportData.name,
          'Code': reportData.code,
          'Status': reportData.status.toUpperCase(),
          'Priority': reportData.priority.toUpperCase(),
          'Total Tasks': reportData.todos?.length || 0,
          'Total Deliverables': reportData.deliverables?.length || 0,
          'Client': reportData.client?.name || 'None'
        }
      }
    } else if (activeReportType === 'todos') {
      typeLabel = 'Tasks (Todo) Report'
      pdfData = {
        'Total Tasks': reportData.total,
        'Completed Tasks': reportData.completed,
        'Pending Tasks': reportData.pending,
        'In Progress': reportData.inProgress,
        'Blocked': reportData.blocked,
        'Overdue Tasks': reportData.overdue
      }
    } else if (activeReportType === 'deliverables') {
      typeLabel = 'Deliverables Report'
      pdfData = {
        'Total Deliverables': reportData.total,
        'Approved': reportData.approved,
        'Pending Review': reportData.pending,
        'Rejected': reportData.rejected
      }
    } else if (activeReportType === 'approvals') {
      typeLabel = 'Client Approvals Report'
      pdfData = {
        'Total Approvals Requested': reportData.total,
        'Approved': reportData.approved,
        'Rejected': reportData.rejected,
        'Pending Decision': reportData.pending
      }
    }

    try {
      const base64 = await window.api.reports.generatePdf(typeLabel, pdfData)
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `${activeReportType}_report_${Date.now()}.pdf`
      link.click()
    } catch (err) {
      alert('Failed to export PDF')
      console.error(err)
    } finally {
      setExportingPdf(false)
    }
  }

  // CSV Export Trigger
  const handleCsvExport = async () => {
    if (!reportData) return
    setExportingCsv(true)
    let headers: string[] = []
    let rows: string[][] = []

    if (activeReportType === 'projects') {
      headers = ['Project Code', 'Project Name', 'Client', 'Status', 'Priority', 'Deadline']
      if (selectedProjectId === 'all') {
        rows = reportData.map((p: any) => [
          p.code,
          p.name,
          p.client?.name || 'None',
          p.status,
          p.priority,
          p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'
        ])
      } else {
        rows = [[
          reportData.code,
          reportData.name,
          reportData.client?.name || 'None',
          reportData.status,
          reportData.priority,
          reportData.deadline ? new Date(reportData.deadline).toLocaleDateString() : 'N/A'
        ]]
      }
    } else if (activeReportType === 'todos') {
      headers = ['Task Title', 'Project', 'Status', 'Priority', 'Due Date']
      rows = reportData.todos.map((t: any) => [
        t.title,
        t.project?.name || 'N/A',
        t.status,
        t.priority,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'
      ])
    } else if (activeReportType === 'deliverables') {
      headers = ['Deliverable Name', 'Project', 'Status', 'Version', 'File Name']
      rows = reportData.deliverables.map((d: any) => [
        d.title,
        d.project?.name || 'N/A',
        d.status,
        `v${d.version}`,
        d.fileName || 'N/A'
      ])
    } else if (activeReportType === 'approvals') {
      headers = ['Deliverable', 'Project', 'Client', 'Status', 'Decision Date', 'Comment']
      rows = reportData.approvals.map((a: any) => [
        a.deliverable?.title || 'N/A',
        a.deliverable?.project?.name || 'N/A',
        a.client?.name || 'N/A',
        a.status,
        new Date(a.date).toLocaleDateString(),
        a.comment || ''
      ])
    }

    try {
      const csvContent = await window.api.reports.generateCsv(headers, rows)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${activeReportType}_report_${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export CSV')
      console.error(err)
    } finally {
      setExportingCsv(false)
    }
  }

  // Disable exports if no report data or report data is empty
  const isReportDataEmpty = useMemo(() => {
    if (!reportData) return true
    if (activeReportType === 'projects') {
      if (selectedProjectId === 'all') {
        return !Array.isArray(reportData) || reportData.length === 0
      } else {
        return Array.isArray(reportData) || !reportData.id
      }
    }
    if (activeReportType === 'todos') {
      return !reportData.todos || reportData.todos.length === 0
    }
    if (activeReportType === 'deliverables') {
      return !reportData.deliverables || reportData.deliverables.length === 0
    }
    if (activeReportType === 'approvals') {
      return !reportData.approvals || reportData.approvals.length === 0
    }
    return true
  }, [reportData, activeReportType, selectedProjectId])

  // Compute stats card content based on report type
  const statCards = useMemo(() => {
    if (!reportData) return []

    if (activeReportType === 'projects') {
      if (selectedProjectId === 'all') {
        if (!Array.isArray(reportData)) return []
        const total = reportData.length
        const active = reportData.filter((p: any) => p.status === 'active').length
        const waiting = reportData.filter((p: any) => p.status === 'waiting_approval').length
        const closed = reportData.filter((p: any) => p.status === 'closed').length
        return [
          { label: 'Total Projects', value: total, color: 'text-indigo-500 bg-indigo-500/10' },
          { label: 'Active Projects', value: active, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Waiting Approval', value: waiting, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Closed Projects', value: closed, color: 'text-emerald-500 bg-emerald-500/10' }
        ]
      } else {
        if (Array.isArray(reportData) || !reportData.status || !reportData.priority) return []
        return [
          { label: 'Project Status', value: reportData.status.replace('_', ' ').toUpperCase(), color: 'text-indigo-500 bg-indigo-500/10' },
          { label: 'Priority Level', value: reportData.priority.toUpperCase(), color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Total Workspace Tasks', value: reportData.todos?.length || 0, color: 'text-violet-500 bg-violet-500/10' },
          { label: 'Deliverables Generated', value: reportData.deliverables?.length || 0, color: 'text-blue-500 bg-blue-500/10' }
        ]
      }
    }

    if (activeReportType === 'todos') {
      if (Array.isArray(reportData) || typeof reportData.total === 'undefined') return []
      return [
        { label: 'Total Tasks', value: reportData.total, color: 'text-violet-500 bg-violet-500/10' },
        { label: 'Completed Tasks', value: reportData.completed, color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'In Progress', value: reportData.inProgress, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Overdue Tasks', value: reportData.overdue, color: 'text-rose-500 bg-rose-500/10', warning: reportData.overdue > 0 }
      ]
    }

    if (activeReportType === 'deliverables') {
      if (Array.isArray(reportData) || typeof reportData.total === 'undefined') return []
      return [
        { label: 'Total Deliverables', value: reportData.total, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Approved Deliverables', value: reportData.approved, color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Pending Feedback', value: reportData.pending, color: 'text-amber-500 bg-amber-500/10' },
        { label: 'Rejected / Revisions', value: reportData.rejected, color: 'text-rose-500 bg-rose-500/10' }
      ]
    }

    if (activeReportType === 'approvals') {
      if (Array.isArray(reportData) || typeof reportData.total === 'undefined') return []
      return [
        { label: 'Total Decisions Logged', value: reportData.total, color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Client Approvals', value: reportData.approved, color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Changes Requested', value: reportData.rejected, color: 'text-rose-500 bg-rose-500/10' },
        { label: 'Pending Action', value: reportData.pending, color: 'text-amber-500 bg-amber-500/10' }
      ]
    }

    return []
  }, [reportData, activeReportType, selectedProjectId])

  // Process Recharts data based on type
  const chartData = useMemo(() => {
    if (!reportData) return []

    if (activeReportType === 'projects') {
      if (selectedProjectId === 'all') {
        if (!Array.isArray(reportData)) return []
        const statuses = ['draft', 'active', 'waiting_approval', 'approved', 'rejected', 'closed']
        return statuses.map((status, index) => ({
          name: status.replace('_', ' ').toUpperCase(),
          value: reportData.filter((p: any) => p.status === status).length,
          color: CHART_COLORS[index % CHART_COLORS.length]
        })).filter(d => d.value > 0)
      } else {
        if (Array.isArray(reportData) || !reportData.todos) return []
        const statuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled']
        return statuses.map((status, index) => ({
          name: status.replace('_', ' ').toUpperCase(),
          value: reportData.todos.filter((t: any) => t.status === status).length,
          color: CHART_COLORS[index % CHART_COLORS.length]
        })).filter(d => d.value > 0)
      }
    }

    if (activeReportType === 'todos') {
      if (Array.isArray(reportData) || typeof reportData.completed === 'undefined') return []
      return [
        { name: 'Completed', value: reportData.completed, color: '#10b981' },
        { name: 'In Progress', value: reportData.inProgress, color: '#3b82f6' },
        { name: 'Pending', value: reportData.pending, color: '#f59e0b' },
        { name: 'Blocked', value: reportData.blocked, color: '#ef4444' }
      ].filter(d => d.value > 0)
    }

    if (activeReportType === 'deliverables') {
      if (Array.isArray(reportData) || typeof reportData.approved === 'undefined') return []
      const approvedVal = reportData.approved
      const pendingVal = reportData.pending
      const rejectedVal = reportData.rejected
      const others = Math.max(0, reportData.total - approvedVal - pendingVal - rejectedVal)
      return [
        { name: 'Approved', value: approvedVal, color: '#10b981' },
        { name: 'Pending Review', value: pendingVal, color: '#3b82f6' },
        { name: 'Rejected', value: rejectedVal, color: '#ef4444' },
        { name: 'Draft / Other', value: others, color: '#64748b' }
      ].filter(d => d.value > 0)
    }

    if (activeReportType === 'approvals') {
      if (Array.isArray(reportData) || typeof reportData.approved === 'undefined') return []
      return [
        { name: 'Approved', value: reportData.approved, color: '#10b981' },
        { name: 'Changes Requested', value: reportData.rejected, color: '#ef4444' },
        { name: 'Pending Approval', value: reportData.pending, color: '#f59e0b' }
      ].filter(d => d.value > 0)
    }

    return []
  }, [reportData, activeReportType, selectedProjectId])

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Reports' }]} />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Reports Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize workspace activity and download PDF summaries or CSV logs
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={exportingCsv || isReportDataEmpty}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export CSV
          </button>
          <button
            onClick={handlePdfExport}
            disabled={exportingPdf || isReportDataEmpty}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card mb-6 shrink-0 select-none">
        {/* Switchers */}
        <div className="flex flex-wrap items-center gap-1.5">
          {REPORT_TYPES.map(type => {
            const Icon = type.icon
            const isActive = activeReportType === type.id
            return (
              <button
                key={type.id}
                onClick={() => {
                  setActiveReportType(type.id)
                  setReportData(null)
                  setLoading(true)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                    : 'bg-transparent text-muted-foreground hover:text-foreground border-border hover:bg-muted/30'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {type.label}
              </button>
            )
          })}
        </div>

        {/* Project Select Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project:</span>
          <select
            value={selectedProjectId}
            onChange={e => {
              setSelectedProjectId(e.target.value)
              setReportData(null)
              setLoading(true)
            }}
            className="px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-xs font-medium"
          >
            <option value="all">All Projects</option>
            {projectsList.map(proj => (
              <option key={proj.id} value={proj.id}>
                {proj.code} — {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-auto min-h-0 space-y-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !reportData || (Array.isArray(reportData) && reportData.length === 0) ? (
          <EmptyState
            icon={FolderKanban}
            title="No report data available"
            description="Create projects, add todos, or upload deliverables to generate reports and track dashboard statistics."
          />
        ) : (
          <>
            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, i) => (
                <div
                  key={card.label}
                  className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between h-28 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className={cn('text-2xl font-bold', card.warning ? 'text-rose-500' : 'text-foreground')}>
                      {card.value}
                    </span>
                    <div className={cn('p-1.5 rounded-lg shrink-0', card.color)}>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1: Status Distribution */}
              <div className="rounded-xl border bg-card p-5 flex flex-col justify-between h-80 shadow-sm">
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    Status Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Distribution of items by their current status</p>
                </div>

                <div className="flex-1 mt-4">
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
                      No status data to visualize
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Priority or Comparison Breakdown */}
              <div className="rounded-xl border bg-card p-5 flex flex-col justify-between h-80 shadow-sm">
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {activeReportType === 'projects' && selectedProjectId === 'all'
                      ? 'Projects by Priority'
                      : activeReportType === 'projects'
                      ? 'Workspace Deliverables Breakdown'
                      : 'Activity Metrics'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Quantitative summary of current metrics</p>
                </div>

                <div className="flex-1 mt-4">
                  {activeReportType === 'projects' && selectedProjectId === 'all' ? (
                    /* Priority Bar Chart for All Projects */
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={['low', 'medium', 'high', 'urgent'].map(pri => ({
                          name: pri.toUpperCase(),
                          count: Array.isArray(reportData) ? reportData.filter((p: any) => p.priority === pri).length : 0
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : activeReportType === 'projects' ? (
                    /* Deliverables breakdown for single project */
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={['draft', 'ready', 'sent', 'approved', 'rejected'].map(status => ({
                          name: status.toUpperCase(),
                          count: (reportData && !Array.isArray(reportData) && Array.isArray(reportData.deliverables))
                            ? reportData.deliverables.filter((d: any) => d.status === status).length
                            : 0
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    /* Numeric list overview */
                    <div className="flex flex-col justify-center h-full space-y-4 px-4 select-none">
                      {statCards.map(stat => (
                        <div key={stat.label} className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {stat.label}
                          </span>
                          <span className="text-sm font-bold text-foreground">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Data Table */}
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/20">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  Report Detailed Data
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {/* Table Headers */}
                  {activeReportType === 'projects' && (
                    <>
                      <thead>
                        <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                          <th className="px-6 py-4">Project Name & Code</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4 text-right">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {selectedProjectId === 'all' && Array.isArray(reportData) ? (
                          reportData.map((p: any) => (
                            <tr key={p.id} className="hover:bg-muted/10">
                              <td className="px-6 py-4">
                                <div className="font-semibold">{p.name}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.code}</div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{p.client?.name || '-'}</td>
                              <td className="px-6 py-4 uppercase text-xs font-semibold">{p.status}</td>
                              <td className="px-6 py-4 uppercase text-xs font-semibold">{p.priority}</td>
                              <td className="px-6 py-4 text-right text-muted-foreground">
                                {p.deadline ? formatDate(p.deadline) : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          reportData && !Array.isArray(reportData) && (
                            <tr className="hover:bg-muted/10">
                              <td className="px-6 py-4">
                                <div className="font-semibold">{reportData.name}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-0.5">{reportData.code}</div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{reportData.client?.name || '-'}</td>
                              <td className="px-6 py-4 uppercase text-xs font-semibold">{reportData.status}</td>
                              <td className="px-6 py-4 uppercase text-xs font-semibold">{reportData.priority}</td>
                              <td className="px-6 py-4 text-right text-muted-foreground">
                                {reportData.deadline ? formatDate(reportData.deadline) : '-'}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </>
                  )}

                  {activeReportType === 'todos' && (
                    <>
                      <thead>
                        <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                          <th className="px-6 py-4">Task Title</th>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4 text-right">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {reportData?.todos && Array.isArray(reportData.todos) && reportData.todos.map((t: any) => (
                          <tr key={t.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-semibold">{t.title}</td>
                            <td className="px-6 py-4 text-muted-foreground">{t.project?.name || '-'}</td>
                            <td className="px-6 py-4 uppercase text-xs font-semibold">{t.status.replace('_', ' ')}</td>
                            <td className="px-6 py-4 uppercase text-xs font-semibold">{t.priority}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground">
                              {t.dueDate ? formatDate(t.dueDate) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {activeReportType === 'deliverables' && (
                    <>
                      <thead>
                        <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                          <th className="px-6 py-4">Deliverable Title</th>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Version</th>
                          <th className="px-6 py-4 text-right">File Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {reportData?.deliverables && Array.isArray(reportData.deliverables) && reportData.deliverables.map((d: any) => (
                          <tr key={d.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-semibold">{d.title}</td>
                            <td className="px-6 py-4 text-muted-foreground">{d.project?.name || '-'}</td>
                            <td className="px-6 py-4 uppercase text-xs font-semibold">{d.status}</td>
                            <td className="px-6 py-4 text-muted-foreground font-semibold">v{d.version}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground">{d.fileName || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {activeReportType === 'approvals' && (
                    <>
                      <thead>
                        <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                          <th className="px-6 py-4">Deliverable Name</th>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Status Decision</th>
                          <th className="px-6 py-4 text-right">Date Logged</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {reportData?.approvals && Array.isArray(reportData.approvals) && reportData.approvals.map((a: any) => (
                          <tr key={a.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-semibold">{a.deliverable?.title || '-'}</td>
                            <td className="px-6 py-4 text-muted-foreground">{a.deliverable?.project?.name || '-'}</td>
                            <td className="px-6 py-4 text-muted-foreground">{a.client?.name || '-'}</td>
                            <td className="px-6 py-4 uppercase text-xs font-semibold">{a.status}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground">{formatDate(a.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
