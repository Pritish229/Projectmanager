import { contextBridge, ipcRenderer, webUtils } from 'electron'

// Type-safe API exposed to renderer
const api = {
  // Projects
  projects: {
    getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('projects:getAll', filters),
    getById: (id: string) => ipcRenderer.invoke('projects:getById', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('projects:create', data),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    archive: (id: string) => ipcRenderer.invoke('projects:archive', id),
    close: (id: string) => ipcRenderer.invoke('projects:close', id),
    reopen: (id: string) => ipcRenderer.invoke('projects:reopen', id)
  },

  // Clients
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('clients:create', data),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('clients:delete', id)
  },

  // Todos
  todos: {
    getByProject: (projectId: string, filters?: Record<string, unknown>) => ipcRenderer.invoke('todos:getByProject', projectId, filters),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('todos:create', data),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('todos:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('todos:delete', id),
    complete: (id: string) => ipcRenderer.invoke('todos:complete', id),
    bulkComplete: (ids: string[]) => ipcRenderer.invoke('todos:bulkComplete', ids),
    duplicate: (id: string) => ipcRenderer.invoke('todos:duplicate', id),
    reorder: (items: { id: string; sortOrder: number }[]) => ipcRenderer.invoke('todos:reorder', items)
  },

  // Deliverables
  deliverables: {
    getByProject: (projectId: string) => ipcRenderer.invoke('deliverables:getByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('deliverables:getById', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('deliverables:create', data),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('deliverables:update', id, data),
    delete: (id: string, fileAction?: 'delete' | 'move') => ipcRenderer.invoke('deliverables:delete', id, fileAction),
    uploadFile: (id: string) => ipcRenderer.invoke('deliverables:uploadFile', id),
    downloadFile: (id: string, fileIdx: number) => ipcRenderer.invoke('deliverables:downloadFile', id, fileIdx),
    removeFile: (id: string, fileIdx: number) => ipcRenderer.invoke('deliverables:removeFile', id, fileIdx),
    getFileBuffer: (id: string, fileIdx: number) => ipcRenderer.invoke('deliverables:getFileBuffer', id, fileIdx),
    linkTodos: (deliverableId: string, todoIds: string[]) => ipcRenderer.invoke('deliverables:linkTodos', deliverableId, todoIds),
    duplicate: (id: string) => ipcRenderer.invoke('deliverables:duplicate', id),
    attachProjectFiles: (id: string, fileIds: string[]) => ipcRenderer.invoke('deliverables:attachProjectFiles', id, fileIds)
  },

  // Approvals
  approvals: {
    getByDeliverable: (deliverableId: string) => ipcRenderer.invoke('approvals:getByDeliverable', deliverableId),
    getPending: () => ipcRenderer.invoke('approvals:getPending'),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('approvals:create', data),
    approve: (id: string, comment?: string) => ipcRenderer.invoke('approvals:approve', id, comment),
    reject: (id: string, comment?: string) => ipcRenderer.invoke('approvals:reject', id, comment),
    requestChanges: (id: string, comment: string) => ipcRenderer.invoke('approvals:requestChanges', id, comment),
    resubmit: (deliverableId: string, comment?: string) => ipcRenderer.invoke('approvals:resubmit', deliverableId, comment),
    updateComment: (id: string, comment: string) => ipcRenderer.invoke('approvals:updateComment', id, comment),
    markPending: (id: string, comment?: string) => ipcRenderer.invoke('approvals:markPending', id, comment)
  },

  // Files
  files: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
    getByProject: (projectId: string) => ipcRenderer.invoke('files:getByProject', projectId),
    upload: (projectId: string) => ipcRenderer.invoke('files:upload', projectId),
    uploadPaths: (projectId: string, filePaths: string[]) => ipcRenderer.invoke('files:uploadPaths', projectId, filePaths),
    download: (id: string) => ipcRenderer.invoke('files:download', id),
    preview: (id: string) => ipcRenderer.invoke('files:preview', id),
    getBuffer: (id: string) => ipcRenderer.invoke('files:getBuffer', id),
    rename: (id: string, newName: string) => ipcRenderer.invoke('files:rename', id, newName),
    delete: (id: string) => ipcRenderer.invoke('files:delete', id),
    updateCategory: (id: string, category: string) => ipcRenderer.invoke('files:updateCategory', id, category),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('files:bulkDelete', ids),
    // Folder operations
    getFolders: (projectId: string) => ipcRenderer.invoke('files:getFolders', projectId),
    createFolder: (projectId: string, name: string) => ipcRenderer.invoke('files:createFolder', projectId, name),
    renameFolder: (id: string, name: string) => ipcRenderer.invoke('files:renameFolder', id, name),
    deleteFolder: (id: string, deleteFiles: boolean) => ipcRenderer.invoke('files:deleteFolder', id, deleteFiles),
    moveToFolder: (fileId: string, folderId: string | null) => ipcRenderer.invoke('files:moveToFolder', fileId, folderId),
    bulkMoveToFolder: (fileIds: string[], folderId: string | null) => ipcRenderer.invoke('files:bulkMoveToFolder', fileIds, folderId)
  },

  // Notes
  notes: {
    getByProject: (projectId: string) => ipcRenderer.invoke('notes:getByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('notes:getById', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id)
  },

  // Activity
  activity: {
    getByProject: (projectId: string, limit?: number) => ipcRenderer.invoke('activity:getByProject', projectId, limit),
    getAll: (limit?: number) => ipcRenderer.invoke('activity:getAll', limit),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('activity:create', data)
  },

  // Notifications
  notifications: {
    getAll: (unreadOnly?: boolean) => ipcRenderer.invoke('notifications:getAll', unreadOnly),
    getUnreadCount: () => ipcRenderer.invoke('notifications:getUnreadCount'),
    markRead: (id: string) => ipcRenderer.invoke('notifications:markRead', id),
    markAllRead: () => ipcRenderer.invoke('notifications:markAllRead'),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('notifications:create', data),
    checkDeadlines: () => ipcRenderer.invoke('notifications:checkDeadlines'),
    delete: (id: string) => ipcRenderer.invoke('notifications:delete', id)
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMany: (settings: Record<string, string>) => ipcRenderer.invoke('settings:setMany', settings),
    selectFolder: () => ipcRenderer.invoke('settings:selectFolder')
  },

  // Backup
  backup: {
    getHistory: () => ipcRenderer.invoke('backup:getHistory'),
    export: (type?: string, options?: Record<string, any>) => ipcRenderer.invoke('backup:export', type, options),
    import: (forceScope?: string) => ipcRenderer.invoke('backup:import', forceScope),
    delete: (id: string) => ipcRenderer.invoke('backup:delete', id),
    getFolder: () => ipcRenderer.invoke('backup:getFolder'),
    restoreFromFile: (filePath: string, forceScope?: string) => ipcRenderer.invoke('backup:restoreFromFile', filePath, forceScope)
  },

  // Reports
  reports: {
    projectSummary: (projectId?: string) => ipcRenderer.invoke('reports:projectSummary', projectId),
    todoSummary: (projectId?: string) => ipcRenderer.invoke('reports:todoSummary', projectId),
    deliverableSummary: (projectId?: string) => ipcRenderer.invoke('reports:deliverableSummary', projectId),
    approvalSummary: (projectId?: string) => ipcRenderer.invoke('reports:approvalSummary', projectId),
    generatePdf: (type: string, data: unknown) => ipcRenderer.invoke('reports:generatePdf', type, data),
    generateCsv: (headers: string[], rows: string[][]) => ipcRenderer.invoke('reports:generateCsv', headers, rows)
  },

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    projectStatusChart: () => ipcRenderer.invoke('dashboard:projectStatusChart'),
    todoCompletionChart: () => ipcRenderer.invoke('dashboard:todoCompletionChart'),
    monthlyProjectChart: () => ipcRenderer.invoke('dashboard:monthlyProjectChart'),
    recentActivity: () => ipcRenderer.invoke('dashboard:recentActivity')
  },

  // App Update
  update: {
    getVersion: () => ipcRenderer.invoke('update:getVersion'),
    checkForUpdates: (url: string) => ipcRenderer.invoke('update:checkForUpdates', url),
    installRemote: (url: string) => ipcRenderer.invoke('update:installRemote', url),
    installLocal: () => ipcRenderer.invoke('update:installLocal'),
    onDownloadProgress: (callback: (progress: number) => void) => {
      const listener = (_event: any, value: number) => callback(value)
      ipcRenderer.on('update:download-progress', listener)
      return () => {
        ipcRenderer.removeListener('update:download-progress', listener)
      }
    }
  }
}

// Expose API to renderer
contextBridge.exposeInMainWorld('api', api)

// Type declaration for renderer
export type ElectronAPI = typeof api
