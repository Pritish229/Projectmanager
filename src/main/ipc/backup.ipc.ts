import { ipcMain, dialog, app } from 'electron'
import { getPrisma } from '../database'
import { createWriteStream, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, statSync, unlinkSync } from 'fs'
import { join, basename, dirname } from 'path'
import archiver from 'archiver'
import unzipper from 'unzipper'

async function getBackupDir(prisma: any): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: 'backupLocation' } })
  let base = setting?.value
  if (!base || !existsSync(base)) {
    const isDev = !app.isPackaged
    base = isDev ? join(process.cwd(), 'backups') : join(app.getPath('userData'), 'backups')
  }
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  return base
}

async function resolveBackupFilename(
  prisma: any,
  type: 'manual' | 'automatic',
  options?: { scope?: 'system' | 'projects'; projectIds?: string[] }
): Promise<string> {
  const scope = options?.scope || 'system'
  const projectIds = options?.projectIds || []
  
  // Format clean local date/time timestamp for readable file names
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`

  let prefix = 'system'

  if (type === 'automatic') {
    prefix = 'autoback'
  } else {
    if (scope === 'projects' && projectIds.length > 0) {
      if (projectIds.length === 1) {
        const project = await prisma.project.findUnique({
          where: { id: projectIds[0] },
          select: { code: true }
        })
        const codeClean = project?.code ? project.code.replace(/[^a-zA-Z0-9]/g, '-') : projectIds[0]
        prefix = `project-${codeClean}`
      } else {
        prefix = 'project-multi'
      }
    } else {
      prefix = 'system'
    }
  }

  return `${prefix}_${timestamp}.zip`
}

export function registerBackupHandlers(): void {
  const prisma = getPrisma()

  // Get backup history
  ipcMain.handle('backup:getHistory', async () => {
    return prisma.backup.findMany({
      orderBy: { createdAt: 'desc' }
    })
  })

  // Delete backup
  ipcMain.handle('backup:delete', async (_, id: string) => {
    const backup = await prisma.backup.findUnique({ where: { id } })
    if (backup) {
      try {
        if (existsSync(backup.filePath)) {
          unlinkSync(backup.filePath)
        }
      } catch (err) {
        console.error('Failed to delete backup file:', err)
      }
      await prisma.backup.delete({ where: { id } })
      return { success: true }
    }
    return { success: false, error: 'Backup not found' }
  })

  // Export backup
  ipcMain.handle('backup:export', async (_, type: 'manual' | 'automatic' = 'manual', options: { scope?: 'system' | 'projects'; projectIds?: string[] } = {}) => {
    const fileName = await resolveBackupFilename(prisma, type, options)
    if (type === 'manual') {
      const result = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
      })
      if (result.canceled || !result.filePath) return null
      return performBackup('manual', result.filePath, options)
    } else {
      return performBackup('automatic', undefined, options)
    }
  })

  // Import backup
  ipcMain.handle('backup:import', async (_, forceScope?: 'system' | 'projects') => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePaths[0]) return null

    const zipPath = result.filePaths[0]
    return performRestore(zipPath, forceScope)
  })

  // Get backup folder path
  ipcMain.handle('backup:getFolder', async () => {
    return getBackupDir(prisma)
  })

  // Restore backup from specific path
  ipcMain.handle('backup:restoreFromFile', async (_, filePath: string, forceScope?: 'system' | 'projects') => {
    return performRestore(filePath, forceScope)
  })
}

export async function performRestore(zipPath: string, forceScope?: 'system' | 'projects'): Promise<any> {
  const prisma = getPrisma()
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged
    const tempDir = join(isDev ? process.cwd() : app.getPath('userData'), 'temp-restore')
    if (existsSync(tempDir)) {
      try {
        const { rmSync } = require('fs')
        rmSync(tempDir, { recursive: true, force: true })
      } catch (e) {
        console.error('Failed to clean tempDir:', e)
      }
    }
    unzipper.Open.file(zipPath)
      .then(async (directory) => {
        try {
          for (const entry of directory.files) {
            const destPath = join(tempDir, entry.path)
            if (entry.type === 'Directory') {
              mkdirSync(destPath, { recursive: true })
            } else {
              mkdirSync(dirname(destPath), { recursive: true })
              const buffer = await entry.buffer()
              writeFileSync(destPath, buffer)
            }
          }

          const dataPath = join(tempDir, 'data.json')
          if (!existsSync(dataPath)) {
            reject(new Error('Invalid backup: data.json not found'))
            return
          }

          const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
          const destStorage = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')

          // Rewrite file path prefixes for ProjectFiles & Deliverables to the current destination storage path
          if (data.files?.length) {
            for (const file of data.files) {
              file.path = join(destStorage, 'files', file.projectId, file.name)
            }
          }
          if (data.deliverables?.length) {
            for (const del of data.deliverables) {
              if (del.filePath) {
                try {
                  let paths = JSON.parse(del.filePath)
                  if (Array.isArray(paths)) {
                    const newPaths = paths.map(p => join(destStorage, 'deliverables', basename(p)))
                    del.filePath = JSON.stringify(newPaths)
                  } else if (paths) {
                    del.filePath = join(destStorage, 'deliverables', basename(paths))
                  }
                } catch {
                  del.filePath = join(destStorage, 'deliverables', basename(del.filePath))
                }
              }
            }
          }

          // Check if this is a project-specific backup or legacy/system backup
          const activeScope = forceScope || data.exportScope || 'system'
          if (activeScope === 'projects') {
            const projectIds = data.projectIds || []

            // Restore clients (upsert)
            if (data.clients?.length) {
              for (const item of data.clients) {
                await prisma.client.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }

            // Restore projects (upsert)
            if (data.projects?.length) {
              for (const item of data.projects) {
                await prisma.project.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }

            // Clear sub-records for these projects to prevent conflicts
            await prisma.deliverableTodo.deleteMany({
              where: { deliverable: { projectId: { in: projectIds } } }
            })
            await prisma.approval.deleteMany({
              where: { deliverable: { projectId: { in: projectIds } } }
            })
            await prisma.activityLog.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.notification.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.projectFile.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.fileFolder.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.note.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.todo.deleteMany({
              where: { projectId: { in: projectIds } }
            })
            await prisma.deliverable.deleteMany({
              where: { projectId: { in: projectIds } }
            })

            // Restore sub-records
            if (data.todos?.length) {
              for (const item of data.todos) {
                await prisma.todo.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.deliverables?.length) {
              for (const item of data.deliverables) {
                await prisma.deliverable.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.deliverableTodos?.length) {
              for (const item of data.deliverableTodos) {
                await prisma.deliverableTodo.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.approvals?.length) {
              for (const item of data.approvals) {
                await prisma.approval.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.notes?.length) {
              for (const item of data.notes) {
                await prisma.note.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.fileFolders?.length) {
              for (const item of data.fileFolders) {
                await prisma.fileFolder.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.files?.length) {
              for (const item of data.files) {
                await prisma.projectFile.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.activityLogs?.length) {
              for (const item of data.activityLogs) {
                await prisma.activityLog.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.notifications?.length) {
              for (const item of data.notifications) {
                await prisma.notification.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
          } else {
            // Entire system backup
            await prisma.deliverableTodo.deleteMany()
            await prisma.approval.deleteMany()
            await prisma.activityLog.deleteMany()
            await prisma.notification.deleteMany()
            await prisma.projectFile.deleteMany()
            await prisma.fileFolder.deleteMany()
            await prisma.note.deleteMany()
            await prisma.todo.deleteMany()
            await prisma.deliverable.deleteMany()
            await prisma.project.deleteMany()
            await prisma.client.deleteMany()
            await prisma.setting.deleteMany()
            await prisma.backup.deleteMany()

            // Restore all tables
            if (data.users?.length) {
              for (const item of data.users) {
                await prisma.user.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.clients?.length) {
              for (const item of data.clients) {
                await prisma.client.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.projects?.length) {
              for (const item of data.projects) {
                await prisma.project.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.todos?.length) {
              for (const item of data.todos) {
                await prisma.todo.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.deliverables?.length) {
              for (const item of data.deliverables) {
                await prisma.deliverable.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.deliverableTodos?.length) {
              for (const item of data.deliverableTodos) {
                await prisma.deliverableTodo.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.approvals?.length) {
              for (const item of data.approvals) {
                await prisma.approval.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.notes?.length) {
              for (const item of data.notes) {
                await prisma.note.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.fileFolders?.length) {
              for (const item of data.fileFolders) {
                await prisma.fileFolder.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.files?.length) {
              for (const item of data.files) {
                await prisma.projectFile.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.activityLogs?.length) {
              for (const item of data.activityLogs) {
                await prisma.activityLog.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.notifications?.length) {
              for (const item of data.notifications) {
                await prisma.notification.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
            if (data.settings?.length) {
              for (const item of data.settings) {
                await prisma.setting.upsert({
                  where: { id: item.id },
                  update: item,
                  create: item
                })
              }
            }
          }

          // Restore storage files
          const storageDir = join(tempDir, 'storage')
          if (existsSync(storageDir)) {
            copyDirSync(storageDir, destStorage)
          }

          // Clean up tempDir
          try {
            const { rmSync } = require('fs')
            rmSync(tempDir, { recursive: true, force: true })
          } catch (e) {
            console.error('Failed to clean tempDir post-restore:', e)
          }

          resolve({ success: true, message: 'Backup restored successfully' })
        } catch (err) {
          reject(err)
        }
      })
      .catch(reject)
  })
}

export async function performBackup(
  type: 'manual' | 'automatic' = 'manual',
  manualDestPath?: string,
  options: { scope?: 'system' | 'projects'; projectIds?: string[] } = {}
): Promise<any> {
  const prisma = getPrisma()
  let fileName: string
  if (type === 'manual' && manualDestPath) {
    fileName = basename(manualDestPath)
  } else {
    fileName = await resolveBackupFilename(prisma, type, options)
  }

  let destPath: string

  if (type === 'manual') {
    if (!manualDestPath) return null
    destPath = manualDestPath
  } else {
    const backupDir = await getBackupDir(prisma)
    destPath = join(backupDir, fileName)
  }

  const scope = options?.scope || 'system'
  const projectIds = options?.projectIds || []

  // Define data to export
  let data: any

  if (scope === 'projects' && projectIds.length > 0) {
    const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } })
    const clientIds = projects.map(p => p.clientId).filter(Boolean) as string[]

    data = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      exportScope: 'projects',
      projectIds,
      users: await prisma.user.findMany(),
      clients: await prisma.client.findMany({ where: { id: { in: clientIds } } }),
      projects,
      todos: await prisma.todo.findMany({ where: { projectId: { in: projectIds } } }),
      deliverables: await prisma.deliverable.findMany({ where: { projectId: { in: projectIds } } }),
      deliverableTodos: await prisma.deliverableTodo.findMany({
        where: { deliverable: { projectId: { in: projectIds } } }
      }),
      approvals: await prisma.approval.findMany({
        where: { deliverable: { projectId: { in: projectIds } } }
      }),
      notes: await prisma.note.findMany({ where: { projectId: { in: projectIds } } }),
      files: await prisma.projectFile.findMany({ where: { projectId: { in: projectIds } } }),
      fileFolders: await prisma.fileFolder.findMany({ where: { projectId: { in: projectIds } } }),
      activityLogs: await prisma.activityLog.findMany({ where: { projectId: { in: projectIds } } }),
      notifications: await prisma.notification.findMany({ where: { projectId: { in: projectIds } } }),
      settings: await prisma.setting.findMany()
    }
  } else {
    data = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      exportScope: 'system',
      users: await prisma.user.findMany(),
      clients: await prisma.client.findMany(),
      projects: await prisma.project.findMany(),
      todos: await prisma.todo.findMany(),
      deliverables: await prisma.deliverable.findMany(),
      deliverableTodos: await prisma.deliverableTodo.findMany(),
      approvals: await prisma.approval.findMany(),
      notes: await prisma.note.findMany(),
      files: await prisma.projectFile.findMany(),
      fileFolders: await prisma.fileFolder.findMany(),
      activityLogs: await prisma.activityLog.findMany(),
      notifications: await prisma.notification.findMany(),
      settings: await prisma.setting.findMany()
    }
  }

  return new Promise((resolve, reject) => {
    const output = createWriteStream(destPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', async () => {
      try {
        const stats = statSync(destPath)
        const backup = await prisma.backup.create({
          data: {
            fileName,
            filePath: destPath,
            size: stats.size,
            type
          }
        })
        resolve(backup)
      } catch (err) {
        reject(err)
      }
    })

    archive.on('error', (err: Error) => reject(err))
    archive.pipe(output)

    // Add JSON data
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' })

    // Add files to archive
    const isDev = !app.isPackaged
    const storageBase = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')

    if (existsSync(storageBase)) {
      if (scope === 'projects' && projectIds.length > 0) {
        // Zip only files for selected projects
        for (const pid of projectIds) {
          const projectFilesDir = join(storageBase, 'files', pid)
          if (existsSync(projectFilesDir)) {
            archive.directory(projectFilesDir, `storage/files/${pid}`)
          }
        }

        // Zip only deliverables files for selected projects
        const deliverables = data.deliverables
        const deliverableDir = join(storageBase, 'deliverables')
        if (existsSync(deliverableDir)) {
          for (const del of deliverables) {
            if (del.filePath) {
              try {
                let paths = JSON.parse(del.filePath)
                if (!Array.isArray(paths)) paths = [del.filePath]
                for (const p of paths) {
                  const fileBasename = basename(p)
                  const physicalPath = join(deliverableDir, fileBasename)
                  if (existsSync(physicalPath)) {
                    archive.file(physicalPath, { name: `storage/deliverables/${fileBasename}` })
                  }
                }
              } catch {
                const fileBasename = basename(del.filePath)
                const physicalPath = join(deliverableDir, fileBasename)
                if (existsSync(physicalPath)) {
                  archive.file(physicalPath, { name: `storage/deliverables/${fileBasename}` })
                }
              }
            }
          }
        }
      } else {
        // Entire system backup
        archive.directory(storageBase, 'storage')
      }
    }

    archive.finalize()
  })
}

export function startAutoBackupScheduler(): void {
  const checkAndRunBackup = async () => {
    try {
      const prisma = getPrisma()
      const autoBackupSetting = await prisma.setting.findUnique({ where: { key: 'autoBackup' } })
      if (autoBackupSetting?.value !== 'true') return

      const intervalSetting = await prisma.setting.findUnique({ where: { key: 'backupInterval' } })
      const intervalHours = parseInt(intervalSetting?.value || '24', 10)

      // Get last automatic backup
      const lastBackup = await prisma.backup.findFirst({
        where: { type: 'automatic' },
        orderBy: { createdAt: 'desc' }
      })

      const now = new Date()
      if (lastBackup) {
        const lastBackupTime = new Date(lastBackup.createdAt)
        const diffMs = now.getTime() - lastBackupTime.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)

        if (diffHours < intervalHours) {
          // Not time yet
          return
        }
      }

      console.log('[AutoBackup] Triggering scheduled automatic backup...')
      await performBackup('automatic')
      console.log('[AutoBackup] Scheduled automatic backup completed successfully.')
    } catch (err) {
      console.error('[AutoBackup] Error in scheduled backup check:', err)
    }
  }

  // Run on startup (with 10 seconds delay to let app initialize smoothly)
  setTimeout(checkAndRunBackup, 10000)

  // Run every hour
  setInterval(checkAndRunBackup, 60 * 60 * 1000)
}

function copyDirSync(src: string, dest: string): void {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })

  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}
