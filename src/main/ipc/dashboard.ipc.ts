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
}
