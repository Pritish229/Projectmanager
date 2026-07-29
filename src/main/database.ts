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

  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`

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

    // Ensure all tables exist on existing production SQLite databases
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "smtp_profiles" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "host" TEXT NOT NULL,
        "port" INTEGER NOT NULL DEFAULT 587,
        "secure" BOOLEAN NOT NULL DEFAULT false,
        "user" TEXT NOT NULL,
        "pass" TEXT NOT NULL,
        "from" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "invoice_templates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "layoutStyle" TEXT NOT NULL DEFAULT 'modern',
        "headerTitle" TEXT NOT NULL DEFAULT 'INVOICE',
        "companyName" TEXT NOT NULL DEFAULT '',
        "companyAddress" TEXT NOT NULL DEFAULT '',
        "companyEmail" TEXT NOT NULL DEFAULT '',
        "companyPhone" TEXT NOT NULL DEFAULT '',
        "logoUrl" TEXT NOT NULL DEFAULT '',
        "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
        "termsAndConditions" TEXT NOT NULL DEFAULT 'Payment due within 30 days of invoice date.',
        "notes" TEXT NOT NULL DEFAULT 'Thank you for your business!',
        "placeholdersConfig" TEXT NOT NULL DEFAULT '{}',
        "contentTemplate" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dueDate" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "currencySymbol" TEXT NOT NULL DEFAULT '$',
        "clientName" TEXT NOT NULL DEFAULT '',
        "clientEmail" TEXT NOT NULL DEFAULT '',
        "clientAddress" TEXT NOT NULL DEFAULT '',
        "companyName" TEXT NOT NULL DEFAULT '',
        "companyAddress" TEXT NOT NULL DEFAULT '',
        "companyEmail" TEXT NOT NULL DEFAULT '',
        "subtotal" REAL NOT NULL DEFAULT 0,
        "discountType" TEXT NOT NULL DEFAULT 'percentage',
        "discountValue" REAL NOT NULL DEFAULT 0,
        "discountAmount" REAL NOT NULL DEFAULT 0,
        "taxType" TEXT NOT NULL DEFAULT 'percentage',
        "taxValue" REAL NOT NULL DEFAULT 0,
        "taxAmount" REAL NOT NULL DEFAULT 0,
        "totalAmount" REAL NOT NULL DEFAULT 0,
        "termsAndConditions" TEXT NOT NULL DEFAULT '',
        "notes" TEXT NOT NULL DEFAULT '',
        "templateId" TEXT,
        "items" TEXT NOT NULL DEFAULT '[]',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

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
