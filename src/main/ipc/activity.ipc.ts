import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerActivityHandlers(): void {
  const prisma = getPrisma()

  // Get activity logs for a project
  ipcMain.handle('activity:getByProject', async (_, projectId: string, limit?: number) => {
    return prisma.activityLog.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit || 100
    })
  })

  // Get all activity logs
  ipcMain.handle('activity:getAll', async (_, limit?: number) => {
    return prisma.activityLog.findMany({
      include: { user: true, project: true },
      orderBy: { createdAt: 'desc' },
      take: limit || 100
    })
  })

  // Create activity log
  ipcMain.handle('activity:create', async (_, data: {
    projectId?: string
    action: string
    entity?: string
    entityId?: string
    message: string
  }) => {
    const user = await prisma.user.findFirst()
    return prisma.activityLog.create({
      data: {
        projectId: data.projectId,
        action: data.action,
        entity: data.entity || '',
        entityId: data.entityId || '',
        message: data.message,
        userId: user?.id
      }
    })
  })
}
