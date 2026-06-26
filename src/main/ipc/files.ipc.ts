import { ipcMain, dialog, app, shell } from 'electron'
import { getPrisma } from '../database'
import { copyFileSync, existsSync, mkdirSync, unlinkSync, renameSync, readFileSync } from 'fs'
import { join, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { statSync } from 'fs'

function getStoragePath(projectId: string): string {
  const isDev = !app.isPackaged
  const base = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')
  const projectPath = join(base, 'files', projectId)
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true })
  }
  return projectPath
}

export function registerFileHandlers(): void {
  const prisma = getPrisma()

  // Get files for a project
  ipcMain.handle('files:getByProject', async (_, projectId: string) => {
    return prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Upload files
  ipcMain.handle('files:upload', async (_, projectId: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'csv'] }
      ]
    })

    if (result.canceled || !result.filePaths.length) return []

    const storagePath = getStoragePath(projectId)
    const uploadedFiles = []

    for (const sourcePath of result.filePaths) {
      const originalName = basename(sourcePath)
      const ext = extname(originalName)
      const uniqueName = `${uuidv4()}${ext}`
      const destPath = join(storagePath, uniqueName)

      copyFileSync(sourcePath, destPath)
      const stats = statSync(destPath)

      const mimeType = getMimeType(ext)

      const file = await prisma.projectFile.create({
        data: {
          projectId,
          name: uniqueName,
          originalName,
          path: destPath,
          mimeType,
          size: stats.size
        }
      })

      uploadedFiles.push(file)
    }

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId,
        action: 'files_uploaded',
        entity: 'file',
        entityId: '',
        message: `${uploadedFiles.length} file(s) uploaded`,
        userId: user?.id
      }
    })

    return uploadedFiles
  })

  // Upload specific file paths (drag & drop from PC)
  ipcMain.handle('files:uploadPaths', async (_, projectId: string, filePaths: string[]) => {
    if (!filePaths || !filePaths.length) return []

    const storagePath = getStoragePath(projectId)
    const uploadedFiles = []

    for (const sourcePath of filePaths) {
      try {
        if (!existsSync(sourcePath) || statSync(sourcePath).isDirectory()) continue

        const originalName = basename(sourcePath)
        const ext = extname(originalName)
        const uniqueName = `${uuidv4()}${ext}`
        const destPath = join(storagePath, uniqueName)

        copyFileSync(sourcePath, destPath)
        const stats = statSync(destPath)

        const mimeType = getMimeType(ext)

        const file = await prisma.projectFile.create({
          data: {
            projectId,
            name: uniqueName,
            originalName,
            path: destPath,
            mimeType,
            size: stats.size
          }
        })

        uploadedFiles.push(file)
      } catch (err) {
        console.error(`Failed to upload path ${sourcePath}:`, err)
      }
    }

    if (uploadedFiles.length > 0) {
      const user = await prisma.user.findFirst()
      await prisma.activityLog.create({
        data: {
          projectId,
          action: 'files_uploaded',
          entity: 'file',
          entityId: '',
          message: `${uploadedFiles.length} file(s) uploaded via drag and drop`,
          userId: user?.id
        }
      })
    }

    return uploadedFiles
  })

  // Download file
  ipcMain.handle('files:download', async (_, id: string) => {
    const file = await prisma.projectFile.findUnique({ where: { id } })
    if (!file) return null

    const result = await dialog.showSaveDialog({
      defaultPath: file.originalName
    })

    if (result.canceled || !result.filePath) return null

    copyFileSync(file.path, result.filePath)
    return { success: true }
  })

  // Preview file (open in system viewer)
  ipcMain.handle('files:preview', async (_, id: string) => {
    const file = await prisma.projectFile.findUnique({ where: { id } })
    if (!file) return null

    shell.openPath(file.path)
    return { success: true }
  })

  // Get file buffer for in-app preview
  ipcMain.handle('files:getBuffer', async (_, id: string) => {
    const file = await prisma.projectFile.findUnique({ where: { id } })
    if (!file || !existsSync(file.path)) return null

    const buffer = readFileSync(file.path)
    return {
      data: buffer.toString('base64'),
      mimeType: file.mimeType,
      name: file.originalName
    }
  })

  // Rename file
  ipcMain.handle('files:rename', async (_, id: string, newName: string) => {
    return prisma.projectFile.update({
      where: { id },
      data: { originalName: newName }
    })
  })

  // Delete file
  ipcMain.handle('files:delete', async (_, id: string) => {
    const file = await prisma.projectFile.findUnique({ where: { id } })
    if (file && existsSync(file.path)) {
      unlinkSync(file.path)
    }
    await prisma.projectFile.delete({ where: { id } })
    return { success: true }
  })

  // Update file category
  ipcMain.handle('files:updateCategory', async (_, id: string, category: string) => {
    return prisma.projectFile.update({
      where: { id },
      data: { category }
    })
  })

  // Bulk delete files
  ipcMain.handle('files:bulkDelete', async (_, ids: string[]) => {
    const files = await prisma.projectFile.findMany({
      where: { id: { in: ids } }
    })

    for (const file of files) {
      try {
        if (file.path && existsSync(file.path)) {
          unlinkSync(file.path)
        }
      } catch (err) {
        console.error(`Failed to delete file on disk ${file.path}:`, err)
      }
    }

    await prisma.projectFile.deleteMany({
      where: { id: { in: ids } }
    })

    return { success: true }
  })

  // ── Folder handlers ───────────────────────────────────────────────────────

  // Get all folders for a project
  ipcMain.handle('files:getFolders', async (_, projectId: string) => {
    return prisma.fileFolder.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        files: { select: { id: true, size: true } }
      }
    })
  })

  // Create folder
  ipcMain.handle('files:createFolder', async (_, projectId: string, name: string) => {
    return prisma.fileFolder.create({
      data: { projectId, name }
    })
  })

  // Rename folder
  ipcMain.handle('files:renameFolder', async (_, id: string, name: string) => {
    return prisma.fileFolder.update({ where: { id }, data: { name } })
  })

  // Delete folder — with option to keep or delete contained files
  ipcMain.handle('files:deleteFolder', async (_, id: string, deleteFiles: boolean) => {
    if (deleteFiles) {
      // Delete physical files from disk then DB records
      const files = await prisma.projectFile.findMany({ where: { folderId: id } })
      for (const file of files) {
        try {
          if (file.path && existsSync(file.path)) unlinkSync(file.path)
        } catch (err) {
          console.error(`Failed to delete file ${file.path}:`, err)
        }
      }
      await prisma.projectFile.deleteMany({ where: { folderId: id } })
    } else {
      // Move files back to root (unset folderId)
      await prisma.projectFile.updateMany({ where: { folderId: id }, data: { folderId: null } })
    }
    await prisma.fileFolder.delete({ where: { id } })
    return { success: true }
  })

  // Move a single file to a folder (or null = root)
  ipcMain.handle('files:moveToFolder', async (_, fileId: string, folderId: string | null) => {
    return prisma.projectFile.update({
      where: { id: fileId },
      data: { folderId: folderId ?? null }
    })
  })

  // Bulk move files to a folder (or null = root)
  ipcMain.handle('files:bulkMoveToFolder', async (_, fileIds: string[], folderId: string | null) => {
    await prisma.projectFile.updateMany({
      where: { id: { in: fileIds } },
      data: { folderId: folderId ?? null }
    })
    return { success: true }
  })
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed'
  }
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}
