import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerProjectHandlers(): void {
  const prisma = getPrisma()

  // Get all projects
  ipcMain.handle('projects:getAll', async (_, filters?: {
    status?: string
    priority?: string
    search?: string
    archived?: boolean
    clientId?: string
    startDateRange?: string
    endDateRange?: string
  }) => {
    const where: Record<string, unknown> = {}

    if (filters?.status) where.status = filters.status
    if (filters?.priority) where.priority = filters.priority
    if (filters?.archived !== undefined) where.archived = filters.archived
    else where.archived = false

    if (filters?.clientId) {
      where.clientId = filters.clientId
    }

    if (filters?.startDateRange || filters?.endDateRange) {
      where.deadline = {}
      if (filters.startDateRange) {
        (where.deadline as any).gte = new Date(filters.startDateRange)
      }
      if (filters.endDateRange) {
        const end = new Date(filters.endDateRange)
        ;(end as any).setHours(23, 59, 59, 999)
        ;(where.deadline as any).lte = end
      }
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { code: { contains: filters.search } },
        { description: { contains: filters.search } }
      ]
    }

    return prisma.project.findMany({
      where,
      include: { client: true },
      orderBy: { updatedAt: 'desc' }
    })
  })

  // Get single project with relations
  ipcMain.handle('projects:getById', async (_, id: string) => {
    return prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        todos: { orderBy: { sortOrder: 'asc' } },
        deliverables: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { updatedAt: 'desc' } },
        files: { orderBy: { createdAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 50 }
      }
    })
  })

  // Create project
  ipcMain.handle('projects:create', async (_, data: {
    name: string
    code: string
    description?: string
    clientId?: string
    startDate?: string
    deadline?: string
    priority?: string
    status?: string
    tags?: string
  }) => {
    // Get default user
    const user = await prisma.user.findFirst()

    const project = await prisma.project.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description || '',
        clientId: data.clientId || null,
        userId: user?.id,
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        priority: data.priority || 'medium',
        status: data.status || 'draft',
        tags: data.tags || ''
      },
      include: { client: true }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: 'project_created',
        entity: 'project',
        entityId: project.id,
        message: `Project "${project.name}" was created`,
        userId: user?.id
      }
    })

    return project
  })

  // Update project
  ipcMain.handle('projects:update', async (_, id: string, data: Record<string, unknown>) => {
    // Handle date conversions
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate as string)
    }
    if (data.deadline && typeof data.deadline === 'string') {
      data.deadline = new Date(data.deadline as string)
    }

    const updated = await prisma.project.update({
      where: { id },
      data: data as Record<string, unknown>,
      include: { client: true }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: 'project_updated',
        entity: 'project',
        entityId: id,
        message: `Project "${updated.name}" was updated`,
        userId: user?.id
      }
    })

    return updated
  })

  // Delete project
  ipcMain.handle('projects:delete', async (_, id: string) => {
    const project = await prisma.project.findUnique({ where: { id } })
    await prisma.project.delete({ where: { id } })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        action: 'project_deleted',
        entity: 'project',
        entityId: id,
        message: `Project "${project?.name}" was deleted`,
        userId: user?.id
      }
    })

    return { success: true }
  })

  // Archive project
  ipcMain.handle('projects:archive', async (_, id: string) => {
    return prisma.project.update({
      where: { id },
      data: { archived: true },
      include: { client: true }
    })
  })

  // Close project
  ipcMain.handle('projects:close', async (_, id: string) => {
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'closed' },
      include: { client: true }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: 'project_closed',
        entity: 'project',
        entityId: id,
        message: `Project "${project.name}" was closed`,
        userId: user?.id
      }
    })

    return project
  })

  // Reopen project
  ipcMain.handle('projects:reopen', async (_, id: string) => {
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'active' },
      include: { client: true }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: 'project_reopened',
        entity: 'project',
        entityId: id,
        message: `Project "${project.name}" was reopened`,
        userId: user?.id
      }
    })

    return project
  })
}
