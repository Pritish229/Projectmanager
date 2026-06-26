import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerClientHandlers(): void {
  const prisma = getPrisma()

  // Get all clients
  ipcMain.handle('clients:getAll', async () => {
    return prisma.client.findMany({
      include: {
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  })

  // Create a client
  ipcMain.handle('clients:create', async (_, data: {
    name: string
    company?: string
    email?: string
    phone?: string
    status?: string
  }) => {
    return prisma.client.create({
      data: {
        name: data.name,
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        status: data.status || 'active'
      }
    })
  })

  // Update a client
  ipcMain.handle('clients:update', async (_, id: string, data: {
    name: string
    company?: string
    email?: string
    phone?: string
    status?: string
  }) => {
    return prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        company: data.company !== undefined ? data.company : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    })
  })

  // Delete a client
  ipcMain.handle('clients:delete', async (_, id: string) => {
    // Check if there are projects associated with this client
    const projectCount = await prisma.project.count({
      where: { clientId: id }
    })
    if (projectCount > 0) {
      throw new Error('Cannot delete client because they have assigned projects.')
    }

    return prisma.client.delete({
      where: { id }
    })
  })
}
