import { ipcMain, dialog, app } from 'electron'
import { getPrisma } from '../database'
import { copyFileSync, existsSync, mkdirSync, unlinkSync, readFileSync, statSync } from 'fs'
import { join, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'

function getStoragePath(): string {
  const isDev = !app.isPackaged
  const base = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')
  const deliverablePath = join(base, 'deliverables')
  if (!existsSync(deliverablePath)) {
    mkdirSync(deliverablePath, { recursive: true })
  }
  return deliverablePath
}

function getProjectStoragePath(projectId: string): string {
  const isDev = !app.isPackaged
  const base = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')
  const projectPath = join(base, 'files', projectId)
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true })
  }
  return projectPath
}

export function registerDeliverableHandlers(): void {
  const prisma = getPrisma()

  // Get deliverables for a project
  ipcMain.handle('deliverables:getByProject', async (_, projectId: string) => {
    return prisma.deliverable.findMany({
      where: { projectId },
      include: {
        deliverableTodos: { include: { todo: true } },
        approvals: { include: { client: true }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Get single deliverable
  ipcMain.handle('deliverables:getById', async (_, id: string) => {
    return prisma.deliverable.findUnique({
      where: { id },
      include: {
        deliverableTodos: { include: { todo: true } },
        approvals: { include: { client: true }, orderBy: { createdAt: 'desc' } },
        project: true
      }
    })
  })

  // Create deliverable
  ipcMain.handle('deliverables:create', async (_, data: {
    projectId: string
    title: string
    description?: string
    deliverableNumber?: string
  }) => {
    const count = await prisma.deliverable.count({ where: { projectId: data.projectId } })

    const deliverable = await prisma.deliverable.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description || '',
        deliverableNumber: data.deliverableNumber || `DEL-${String(count + 1).padStart(3, '0')}`,
        version: 1
      }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: data.projectId,
        action: 'deliverable_created',
        entity: 'deliverable',
        entityId: deliverable.id,
        message: `Deliverable "${deliverable.title}" was created`,
        userId: user?.id
      }
    })

    return deliverable
  })

  // Update deliverable
  ipcMain.handle('deliverables:update', async (_, id: string, data: Record<string, unknown>) => {
    return prisma.deliverable.update({
      where: { id },
      data: data as Record<string, unknown>
    })
  })

  // Upload File
  ipcMain.handle('deliverables:uploadFile', async (_, id: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null

    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) return null

    let currentPaths: string[] = []
    let currentNames: string[] = []

    try {
      if (deliverable.filePath) {
        currentPaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(currentPaths)) currentPaths = [deliverable.filePath]
      }
    } catch {
      currentPaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        currentNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(currentNames)) currentNames = [deliverable.fileName]
      }
    } catch {
      currentNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    for (const sourcePath of result.filePaths) {
      const fileName = `${uuidv4()}_${basename(sourcePath)}`
      const destPath = join(getStoragePath(), fileName)
      copyFileSync(sourcePath, destPath)
      currentPaths.push(destPath)
      currentNames.push(basename(sourcePath))

      // Auto-save to Files module (project's files tab)
      try {
        const projectFilesDir = getProjectStoragePath(deliverable.projectId)
        const originalName = basename(sourcePath)
        const ext = extname(originalName)
        const projectFileUniqueName = `${uuidv4()}${ext}`
        const projectFileDestPath = join(projectFilesDir, projectFileUniqueName)
        
        copyFileSync(sourcePath, projectFileDestPath)
        const stats = statSync(projectFileDestPath)
        const mimeType = getMimeType(ext)
        
        await prisma.projectFile.create({
          data: {
            projectId: deliverable.projectId,
            name: projectFileUniqueName,
            originalName,
            path: projectFileDestPath,
            mimeType,
            size: stats.size
          }
        })
      } catch (err) {
        console.error('Failed to auto-save deliverable file to project files:', err)
      }
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        filePath: JSON.stringify(currentPaths),
        fileName: JSON.stringify(currentNames)
      }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: updated.projectId,
        action: 'deliverable_uploaded',
        entity: 'deliverable',
        entityId: id,
        message: `File(s) uploaded for deliverable "${updated.title}"`,
        userId: user?.id
      }
    })

    return updated
  })

  // Download File
  ipcMain.handle('deliverables:downloadFile', async (_, id: string, fileIdx: number) => {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) return null

    let currentPaths: string[] = []
    let currentNames: string[] = []

    try {
      if (deliverable.filePath) {
        currentPaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(currentPaths)) currentPaths = [deliverable.filePath]
      }
    } catch {
      currentPaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        currentNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(currentNames)) currentNames = [deliverable.fileName]
      }
    } catch {
      currentNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    const filePath = currentPaths[fileIdx]
    const fileName = currentNames[fileIdx]

    if (!filePath || !fileName || !existsSync(filePath)) return null

    const ext = fileName.split('.').pop() || '*'
    const result = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [{ name: `${ext.toUpperCase()} File`, extensions: [ext] }]
    })

    if (result.canceled || !result.filePath) return null

    copyFileSync(filePath, result.filePath)
    return { success: true, path: result.filePath }
  })

  // Remove File
  ipcMain.handle('deliverables:removeFile', async (_, id: string, fileIdx: number) => {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) return null

    let currentPaths: string[] = []
    let currentNames: string[] = []

    try {
      if (deliverable.filePath) {
        currentPaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(currentPaths)) currentPaths = [deliverable.filePath]
      }
    } catch {
      currentPaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        currentNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(currentNames)) currentNames = [deliverable.fileName]
      }
    } catch {
      currentNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    if (fileIdx >= 0 && fileIdx < currentPaths.length) {
      const pathToDelete = currentPaths[fileIdx]
      try {
        if (existsSync(pathToDelete)) {
          unlinkSync(pathToDelete)
        }
      } catch (e) {
        console.error(e)
      }
      currentPaths.splice(fileIdx, 1)
      currentNames.splice(fileIdx, 1)
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        filePath: currentPaths.length > 0 ? JSON.stringify(currentPaths) : '',
        fileName: currentNames.length > 0 ? JSON.stringify(currentNames) : ''
      }
    })

    return updated
  })

  // Link todos to deliverable
  ipcMain.handle('deliverables:linkTodos', async (_, deliverableId: string, todoIds: string[]) => {
    // Remove existing links
    await prisma.deliverableTodo.deleteMany({ where: { deliverableId } })

    // Create new links
    for (const todoId of todoIds) {
      await prisma.deliverableTodo.create({
        data: { deliverableId, todoId }
      })
    }

    return { success: true }
  })

  // Duplicate deliverable
  ipcMain.handle('deliverables:duplicate', async (_, id: string) => {
    const original = await prisma.deliverable.findUnique({
      where: { id },
      include: { deliverableTodos: true }
    })
    if (!original) throw new Error('Deliverable not found')

    const count = await prisma.deliverable.count({ where: { projectId: original.projectId } })

    return prisma.deliverable.create({
      data: {
        projectId: original.projectId,
        title: `${original.title} (copy)`,
        description: original.description,
        deliverableNumber: `DEL-${String(count + 1).padStart(3, '0')}`,
        version: 1,
        status: 'draft'
      }
    })
  })

  // Delete deliverable
  ipcMain.handle('deliverables:delete', async (_, id: string, fileAction?: 'delete' | 'move') => {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id }
    })

    if (!deliverable) {
      throw new Error('Deliverable not found')
    }

    let filePaths: string[] = []
    let fileNames: string[] = []
    try {
      if (deliverable.filePath) {
        filePaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(filePaths)) filePaths = [deliverable.filePath]
      }
    } catch {
      filePaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        fileNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(fileNames)) fileNames = [deliverable.fileName]
      }
    } catch {
      fileNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    if (filePaths.length > 0) {
      if (fileAction === 'move') {
        // Move files to project files
        const isDev = !app.isPackaged
        const base = isDev ? join(process.cwd(), 'storage') : join(app.getPath('userData'), 'storage')
        const projectFilesDir = join(base, 'files', deliverable.projectId)
        if (!existsSync(projectFilesDir)) {
          mkdirSync(projectFilesDir, { recursive: true })
        }

        for (let i = 0; i < filePaths.length; i++) {
          const sourcePath = filePaths[i]
          const originalName = fileNames[i] || basename(sourcePath)

          if (existsSync(sourcePath)) {
            const ext = extname(originalName)
            const uniqueName = `${uuidv4()}${ext}`
            const destPath = join(projectFilesDir, uniqueName)

            try {
              // Copy file to project files directory
              copyFileSync(sourcePath, destPath)
              // Delete original deliverable file
              unlinkSync(sourcePath)

              // Get file size
              const stats = statSync(destPath)
              const mimeType = getMimeType(ext)

              // Create project file record in database
              await prisma.projectFile.create({
                data: {
                  projectId: deliverable.projectId,
                  name: uniqueName,
                  originalName,
                  path: destPath,
                  mimeType,
                  size: stats.size
                }
              })
            } catch (err) {
              console.error(`Failed to move file ${sourcePath}:`, err)
            }
          }
        }

        // Add activity log
        const user = await prisma.user.findFirst()
        await prisma.activityLog.create({
          data: {
            projectId: deliverable.projectId,
            action: 'files_uploaded',
            entity: 'file',
            entityId: '',
            message: `${filePaths.length} file(s) moved from deliverable "${deliverable.title}" to project files`,
            userId: user?.id
          }
        })
      } else {
        // Default to 'delete' - completely remove files from storage
        for (const sourcePath of filePaths) {
          try {
            if (existsSync(sourcePath)) {
              unlinkSync(sourcePath)
            }
          } catch (err) {
            console.error(`Failed to delete file ${sourcePath}:`, err)
          }
        }
      }
    }

    await prisma.deliverable.delete({ where: { id } })
    return { success: true }
  })

  // Get File Buffer for Preview
  ipcMain.handle('deliverables:getFileBuffer', async (_, id: string, fileIdx: number) => {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } })
    if (!deliverable) return null

    let currentPaths: string[] = []
    let currentNames: string[] = []

    try {
      if (deliverable.filePath) {
        currentPaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(currentPaths)) currentPaths = [deliverable.filePath]
      }
    } catch {
      currentPaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        currentNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(currentNames)) currentNames = [deliverable.fileName]
      }
    } catch {
      currentNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    const filePath = currentPaths[fileIdx]
    const fileName = currentNames[fileIdx]

    if (!filePath || !fileName || !existsSync(filePath)) return null

    const ext = extname(fileName).toLowerCase()
    const mimeType = getMimeType(ext)
    const buffer = readFileSync(filePath)

    return {
      data: buffer.toString('base64'),
      mimeType,
      name: fileName
    }
  })

  // Attach Project Files
  ipcMain.handle('deliverables:attachProjectFiles', async (_, deliverableId: string, projectFileIds: string[]) => {
    const deliverable = await prisma.deliverable.findUnique({ where: { id: deliverableId } })
    if (!deliverable) return null

    let currentPaths: string[] = []
    let currentNames: string[] = []

    try {
      if (deliverable.filePath) {
        currentPaths = JSON.parse(deliverable.filePath)
        if (!Array.isArray(currentPaths)) currentPaths = [deliverable.filePath]
      }
    } catch {
      currentPaths = deliverable.filePath ? [deliverable.filePath] : []
    }

    try {
      if (deliverable.fileName) {
        currentNames = JSON.parse(deliverable.fileName)
        if (!Array.isArray(currentNames)) currentNames = [deliverable.fileName]
      }
    } catch {
      currentNames = deliverable.fileName ? [deliverable.fileName] : []
    }

    const projectFiles = await prisma.projectFile.findMany({
      where: {
        id: { in: projectFileIds }
      }
    })

    for (const file of projectFiles) {
      if (!existsSync(file.path)) continue
      
      const fileName = `${uuidv4()}_${file.originalName}`
      const destPath = join(getStoragePath(), fileName)
      
      copyFileSync(file.path, destPath)
      
      currentPaths.push(destPath)
      currentNames.push(file.originalName)
    }

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        filePath: JSON.stringify(currentPaths),
        fileName: JSON.stringify(currentNames)
      }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: updated.projectId,
        action: 'deliverable_files_attached',
        entity: 'deliverable',
        entityId: deliverableId,
        message: `Attached ${projectFiles.length} project file(s) to deliverable "${updated.title}"`,
        userId: user?.id
      }
    })

    return updated
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
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
