import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerTodoHandlers(): void {
  const prisma = getPrisma()

  // Get todos for a project
  ipcMain.handle('todos:getByProject', async (_, projectId: string, filters?: {
    status?: string
    priority?: string
  }) => {
    const where: Record<string, unknown> = { projectId }
    if (filters?.status) where.status = filters.status
    if (filters?.priority) where.priority = filters.priority

    return prisma.todo.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    })
  })

  // Create todo
  ipcMain.handle('todos:create', async (_, data: {
    projectId: string
    title: string
    description?: string
    priority?: string
    status?: string
    startDate?: string
    dueDate?: string
  }) => {
    // Get max sort order
    const maxOrder = await prisma.todo.findFirst({
      where: { projectId: data.projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    const todo = await prisma.todo.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description || '',
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        sortOrder: (maxOrder?.sortOrder || 0) + 1
      }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: data.projectId,
        action: 'todo_created',
        entity: 'todo',
        entityId: todo.id,
        message: `Todo "${todo.title}" was added`,
        userId: user?.id
      }
    })

    return todo
  })

  // Update todo
  ipcMain.handle('todos:update', async (_, id: string, data: Record<string, unknown>) => {
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate as string)
    }
    if (data.dueDate && typeof data.dueDate === 'string') {
      data.dueDate = new Date(data.dueDate as string)
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: data as Record<string, unknown>
    })

    return todo
  })

  // Delete todo
  ipcMain.handle('todos:delete', async (_, id: string) => {
    const todo = await prisma.todo.findUnique({ where: { id } })
    await prisma.todo.delete({ where: { id } })

    if (todo) {
      const user = await prisma.user.findFirst()
      await prisma.activityLog.create({
        data: {
          projectId: todo.projectId,
          action: 'todo_deleted',
          entity: 'todo',
          entityId: id,
          message: `Todo "${todo.title}" was deleted`,
          userId: user?.id
        }
      })
    }

    return { success: true }
  })

  // Mark complete
  ipcMain.handle('todos:complete', async (_, id: string) => {
    const todo = await prisma.todo.update({
      where: { id },
      data: { status: 'completed' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: todo.projectId,
        action: 'todo_completed',
        entity: 'todo',
        entityId: id,
        message: `Todo "${todo.title}" was completed`,
        userId: user?.id
      }
    })

    return todo
  })

  // Bulk complete
  ipcMain.handle('todos:bulkComplete', async (_, ids: string[]) => {
    await prisma.todo.updateMany({
      where: { id: { in: ids } },
      data: { status: 'completed' }
    })
    return { success: true }
  })

  // Duplicate todo
  ipcMain.handle('todos:duplicate', async (_, id: string) => {
    const original = await prisma.todo.findUnique({ where: { id } })
    if (!original) throw new Error('Todo not found')

    const maxOrder = await prisma.todo.findFirst({
      where: { projectId: original.projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    return prisma.todo.create({
      data: {
        projectId: original.projectId,
        title: `${original.title} (copy)`,
        description: original.description,
        priority: original.priority,
        status: 'pending',
        startDate: original.startDate,
        dueDate: original.dueDate,
        sortOrder: (maxOrder?.sortOrder || 0) + 1
      }
    })
  })

  // Reorder todos
  ipcMain.handle('todos:reorder', async (_, items: { id: string; sortOrder: number }[]) => {
    for (const item of items) {
      await prisma.todo.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder }
      })
    }
    return { success: true }
  })
}
