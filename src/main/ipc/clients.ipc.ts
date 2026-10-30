import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerClientHandlers(): void {
  const prisma = getPrisma()

  // Get all clients
  ipcMain.handle('clients:getAll', async () => {
    return prisma.client.findMany({
      include: {
        _count: {
          select: { projects: true, collaborations: true }
        },
        collaborations: {
          include: {
            project: { select: { id: true, name: true, code: true, status: true } }
          }
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
    gstNo?: string
    panNo?: string
    website?: string
    notes?: string
    currency?: string
    addresses?: string
    contacts?: string
  }) => {
    return prisma.client.create({
      data: {
        name: data.name,
        company: data.company || '',
        email: data.email || '',
        phone: data.phone || '',
        status: data.status || 'active',
        gstNo: data.gstNo || '',
        panNo: data.panNo || '',
        website: data.website || '',
        notes: data.notes || '',
        currency: data.currency || '',
        addresses: typeof data.addresses === 'string' ? data.addresses : JSON.stringify(data.addresses || []),
        contacts: typeof data.contacts === 'string' ? data.contacts : JSON.stringify(data.contacts || [])
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
    gstNo?: string
    panNo?: string
    website?: string
    notes?: string
    currency?: string
    addresses?: string
    contacts?: string
  }) => {
    return prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        company: data.company !== undefined ? data.company : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        status: data.status !== undefined ? data.status : undefined,
        gstNo: data.gstNo !== undefined ? data.gstNo : undefined,
        panNo: data.panNo !== undefined ? data.panNo : undefined,
        website: data.website !== undefined ? data.website : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
        addresses: data.addresses !== undefined ? (typeof data.addresses === 'string' ? data.addresses : JSON.stringify(data.addresses)) : undefined,
        contacts: data.contacts !== undefined ? (typeof data.contacts === 'string' ? data.contacts : JSON.stringify(data.contacts)) : undefined
      }
    })
  })

  // Delete a client
  ipcMain.handle('clients:delete', async (_, id: string) => {
    // Check if there are projects associated with this client
    const projectCount = await prisma.project.count({
      where: { clientId: id }
    })
    const collabCount = await prisma.projectCollaborator.count({
      where: { clientId: id }
    })
    if (projectCount > 0 || collabCount > 0) {
      throw new Error('Cannot delete client because they have assigned or collaborating projects.')
    }

    return prisma.client.delete({
      where: { id }
    })
  })
}
