import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerSearchHandlers(): void {
  const prisma = getPrisma()

  ipcMain.handle('search:global', async (_, query: string) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return {
        projects: [],
        todos: [],
        notes: [],
        clients: []
      }
    }

    const cleanQuery = query.trim()

    // Query across core models in parallel using Prisma
    const [projects, todos, notes, clients] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { code: { contains: cleanQuery } },
            { description: { contains: cleanQuery } }
          ]
        },
        include: { client: true },
        orderBy: { updatedAt: 'desc' },
        take: 30
      }),
      prisma.todo.findMany({
        where: {
          OR: [
            { title: { contains: cleanQuery } },
            { description: { contains: cleanQuery } }
          ]
        },
        include: { project: true },
        orderBy: { updatedAt: 'desc' },
        take: 50
      }),
      prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: cleanQuery } },
            { content: { contains: cleanQuery } }
          ]
        },
        include: { project: true },
        orderBy: { updatedAt: 'desc' },
        take: 50
      }),
      prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { company: { contains: cleanQuery } },
            { email: { contains: cleanQuery } }
          ]
        },
        orderBy: { name: 'asc' },
        take: 30
      })
    ])

    return {
      projects,
      todos,
      notes,
      clients
    }
  })
}
