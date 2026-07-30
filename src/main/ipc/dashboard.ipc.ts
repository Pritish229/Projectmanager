import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerDashboardHandlers(): void {
  const prisma = getPrisma()

  // Get dashboard stats
  ipcMain.handle('dashboard:getStats', async () => {
    const [
      totalProjects,
      activeProjects,
      waitingApproval,
      closedProjects,
      totalTodos,
      completedTodos,
      overdueTodos,
      rejectedDeliverables
    ] = await Promise.all([
      prisma.project.count({ where: { archived: false } }),
      prisma.project.count({ where: { status: 'active', archived: false } }),
      prisma.project.count({ where: { status: 'waiting_approval', archived: false } }),
      prisma.project.count({ where: { status: 'closed', archived: false } }),
      prisma.todo.count(),
      prisma.todo.count({ where: { status: 'completed' } }),
      prisma.todo.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['completed', 'cancelled'] }
        }
      }),
      prisma.deliverable.count({ where: { status: 'rejected' } })
    ])

    return {
      totalProjects,
      activeProjects,
      waitingApproval,
      closedProjects,
      totalTodos,
      completedTodos,
      overdueTodos,
      rejectedDeliverables
    }
  })

  // Get project status chart data
  ipcMain.handle('dashboard:projectStatusChart', async () => {
    const statuses = ['draft', 'active', 'waiting_approval', 'approved', 'rejected', 'closed']
    const data = []

    for (const status of statuses) {
      const count = await prisma.project.count({ where: { status, archived: false } })
      data.push({ status, count })
    }

    return data
  })

  // Get todo completion chart data
  ipcMain.handle('dashboard:todoCompletionChart', async () => {
    const statuses = ['pending', 'in_progress', 'waiting_approval', 'completed', 'blocked', 'cancelled']
    const data = []

    for (const status of statuses) {
      const count = await prisma.todo.count({ where: { status } })
      data.push({ status, count })
    }

    return data
  })

  // Get monthly project chart data
  ipcMain.handle('dashboard:monthlyProjectChart', async () => {
    const months = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

      const count = await prisma.project.count({
        where: {
          createdAt: { gte: date, lt: nextMonth }
        }
      })

      months.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count
      })
    }

    return months
  })

  // Get recent activity for dashboard
  ipcMain.handle('dashboard:recentActivity', async () => {
    return prisma.activityLog.findMany({
      include: { project: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  })

  // Get recent active projects with client info & todo progress
  ipcMain.handle('dashboard:recentProjects', async () => {
    const projects = await prisma.project.findMany({
      where: { archived: false },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        client: true,
        todos: { select: { id: true, status: true } }
      }
    })

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      priority: p.priority,
      clientName: p.client?.name || p.client?.company || null,
      totalTodos: p.todos.length,
      completedTodos: p.todos.filter((t) => t.status === 'completed').length,
      updatedAt: p.updatedAt
    }))
  })

  // Get urgent and overdue todos across projects
  ipcMain.handle('dashboard:urgentTodos', async () => {
    const todos = await prisma.todo.findMany({
      where: {
        status: { notIn: ['completed', 'cancelled'] },
        OR: [
          { priority: { in: ['high', 'urgent'] } },
          { dueDate: { lt: new Date() } }
        ]
      },
      include: {
        project: { select: { id: true, name: true, code: true } }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 6
    })
    return todos
  })

  // Get global invoice statistics for dashboard
  ipcMain.handle('dashboard:invoiceStats', async () => {
    const invoices = await prisma.invoice.findMany()
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const paidAmount = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const pendingAmount = invoices.filter((inv) => ['draft', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const overdueAmount = invoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

    const statusCounts = {
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => i.status === 'sent').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
      cancelled: invoices.filter((i) => i.status === 'cancelled').length
    }

    const defaultCurrencySymbol = invoices[0]?.currencySymbol || '₹'

    return {
      totalCount: invoices.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      statusCounts,
      currencySymbol: defaultCurrencySymbol
    }
  })
}

