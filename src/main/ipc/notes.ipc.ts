import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerNoteHandlers(): void {
  const prisma = getPrisma()

  // Get notes for a project
  ipcMain.handle('notes:getByProject', async (_, projectId: string) => {
    return prisma.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    })
  })

  // Get single note
  ipcMain.handle('notes:getById', async (_, id: string) => {
    return prisma.note.findUnique({ where: { id } })
  })

  // Create note
  ipcMain.handle('notes:create', async (_, data: {
    projectId: string
    title: string
    content?: string
  }) => {
    const note = await prisma.note.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        content: data.content || ''
      }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: data.projectId,
        action: 'note_created',
        entity: 'note',
        entityId: note.id,
        message: `Note "${note.title}" was created`,
        userId: user?.id
      }
    })

    return note
  })

  // Update note
  ipcMain.handle('notes:update', async (_, id: string, data: { title?: string; content?: string }) => {
    return prisma.note.update({
      where: { id },
      data
    })
  })

  // Delete note
  ipcMain.handle('notes:delete', async (_, id: string) => {
    const note = await prisma.note.findUnique({ where: { id } })
    await prisma.note.delete({ where: { id } })

    if (note) {
      const user = await prisma.user.findFirst()
      await prisma.activityLog.create({
        data: {
          projectId: note.projectId,
          action: 'note_deleted',
          entity: 'note',
          entityId: id,
          message: `Note "${note.title}" was deleted`,
          userId: user?.id
        }
      })
    }

    return { success: true }
  })
}
