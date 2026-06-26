import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, mkdirSync, readdirSync } from 'fs'

let prisma: PrismaClient

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return prisma
}

export async function initDatabase(): Promise<void> {
  const isDev = !app.isPackaged

  let dbPath: string

  if (isDev) {
    // In development, use project root
    dbPath = join(process.cwd(), 'prisma', 'dev.db')
  } else {
    // In production, use userData directory
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'data')

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    dbPath = join(dbDir, 'pwm.db')

    // If db doesn't exist in userData, copy from resources
    if (!existsSync(dbPath)) {
      let resourceDbPath = join(process.resourcesPath, 'prisma', 'prod-template.db')
      if (!existsSync(resourceDbPath)) {
        resourceDbPath = join(process.resourcesPath, 'prisma', 'dev.db')
      }

      if (existsSync(resourceDbPath)) {
        copyFileSync(resourceDbPath, dbPath)
        console.log('[Database] Copied initial database from resources to:', dbPath)
      } else {
        console.error('[Database] Initial database not found in resources:', resourceDbPath)
      }
    }
  }

  // Resolve Prisma engine path for packaged application
  if (!isDev) {
    let clientDir = join(
      process.resourcesPath,
      'node_modules',
      '.prisma',
      'client'
    )

    // Fallback to unpacked ASAR if needed
    if (!existsSync(clientDir)) {
      clientDir = join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        '.prisma',
        'client'
      )
    }

    if (existsSync(clientDir)) {
      try {
        const files = readdirSync(clientDir)
        const engineFile = files.find(
          (file) =>
            file.startsWith('query_engine-') &&
            (file.endsWith('.node') ||
              file.endsWith('.dll.node') ||
              file.endsWith('.dylib.node') ||
              file.endsWith('.so.node'))
        )

        if (engineFile) {
          const enginePath = join(clientDir, engineFile)
          process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
          console.log('[Database] Set PRISMA_QUERY_ENGINE_LIBRARY to:', enginePath)
        } else {
          console.error('[Database] No query engine file found in:', clientDir)
        }
      } catch (err) {
        console.error('[Database] Failed to read client directory:', err)
      }
    } else {
      console.error('[Database] Prisma client directory not found:', clientDir)
    }
  }

  const dbUrl = `file:${dbPath}`

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  })

  try {
    await prisma.$connect()
    console.log('[Database] Connected successfully to:', dbPath)

    // Seed default user if none exists
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@pwm.local'
        }
      })
      console.log('[Database] Default user created')
    }

    // Seed default settings if none exist
    const settingsCount = await prisma.setting.count()
    if (settingsCount === 0) {
      const defaults = [
        { key: 'theme', value: 'system' },
        { key: 'autoBackup', value: 'false' },
        { key: 'backupInterval', value: '24' },
        { key: 'backupLocation', value: app.getPath('documents') },
        { key: 'defaultPdfFolder', value: app.getPath('documents') }
      ]
      for (const setting of defaults) {
        await prisma.setting.create({ data: setting })
      }
      console.log('[Database] Default settings created')
    }
  } catch (error) {
    console.error('[Database] Connection failed:', error)
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
  }
}
