import { ipcMain, Notification } from 'electron'
import { getPrisma } from '../database'

export function registerNotificationHandlers(): void {
  const prisma = getPrisma()

  // Get all notifications
  ipcMain.handle('notifications:getAll', async (_, unreadOnly?: boolean) => {
    const where = unreadOnly ? { read: false } : {}
    return prisma.notification.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  })

  // Get unread count
  ipcMain.handle('notifications:getUnreadCount', async () => {
    return prisma.notification.count({ where: { read: false } })
  })

  // Mark as read
  ipcMain.handle('notifications:markRead', async (_, id: string) => {
    return prisma.notification.update({
      where: { id },
      data: { read: true }
    })
  })

  // Mark all as read
  ipcMain.handle('notifications:markAllRead', async () => {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true }
    })
    return { success: true }
  })

  // Create notification (internal + desktop)
  ipcMain.handle('notifications:create', async (_, data: {
    type: string
    title: string
    message: string
    projectId?: string
    showDesktop?: boolean
  }) => {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        projectId: data.projectId
      }
    })

    // Show desktop notification if requested
    if (data.showDesktop !== false && Notification.isSupported()) {
      const desktopNotif = new Notification({
        title: data.title,
        body: data.message
      })
      desktopNotif.show()
    }

    return notification
  })

  // Check for overdue todos and upcoming deadlines
  ipcMain.handle('notifications:checkDeadlines', async () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Check overdue todos
    const overdueTodos = await prisma.todo.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['completed', 'cancelled'] }
      },
      include: { project: true }
    })

    for (const todo of overdueTodos) {
      // Check if we already notified
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'overdue',
          message: { contains: todo.id },
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            type: 'overdue',
            title: 'Overdue Todo',
            message: `"${todo.title}" in project "${todo.project.name}" is overdue`,
            projectId: todo.projectId
          }
        })
      }
    }

    // Check upcoming deadlines (within 24 hours)
    const upcomingTodos = await prisma.todo.findMany({
      where: {
        dueDate: { gte: now, lte: tomorrow },
        status: { notIn: ['completed', 'cancelled'] }
      },
      include: { project: true }
    })

    for (const todo of upcomingTodos) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'deadline',
          message: { contains: todo.id },
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            type: 'deadline',
            title: 'Upcoming Deadline',
            message: `"${todo.title}" in project "${todo.project.name}" is due soon`,
            projectId: todo.projectId
          }
        })
      }
    }

    return { overdue: overdueTodos.length, upcoming: upcomingTodos.length }
  })

  // Delete notification
  ipcMain.handle('notifications:delete', async (_, id: string) => {
    await prisma.notification.delete({ where: { id } })
    return { success: true }
  })
}
