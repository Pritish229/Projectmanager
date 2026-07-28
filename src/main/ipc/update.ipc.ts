import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'

// Configure autoUpdater settings
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Logging configuration
autoUpdater.logger = console

export interface UpdateStatusState {
  status:
    | 'idle'
    | 'checking-for-update'
    | 'update-available'
    | 'update-not-available'
    | 'downloading'
    | 'update-downloaded'
    | 'error'
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
  progress?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  error?: string
}

let currentState: UpdateStatusState = {
  status: 'idle',
  currentVersion: app.getVersion()
}

function broadcastUpdateStatus(stateUpdate: Partial<UpdateStatusState>): void {
  currentState = { ...currentState, ...stateUpdate, currentVersion: app.getVersion() }
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('update:status-changed', currentState)
    }
  }
}

export function registerUpdateHandlers(): void {
  // Attach event listeners to electron-updater's autoUpdater
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...')
    broadcastUpdateStatus({
      status: 'checking-for-update',
      error: undefined
    })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[AutoUpdater] Update available:', info.version)
    let releaseNotesStr = ''
    if (typeof info.releaseNotes === 'string') {
      releaseNotesStr = info.releaseNotes
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotesStr = info.releaseNotes
        .map((n) => (typeof n === 'string' ? n : n.note))
        .join('\n')
    }

    broadcastUpdateStatus({
      status: 'update-available',
      latestVersion: info.version,
      releaseNotes: releaseNotesStr,
      error: undefined
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('[AutoUpdater] Update not available. Current version is latest:', info.version)
    broadcastUpdateStatus({
      status: 'update-not-available',
      latestVersion: info.version || app.getVersion(),
      error: undefined
    })
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('[AutoUpdater] Error:', err)
    broadcastUpdateStatus({
      status: 'error',
      error: err.message || 'An error occurred while handling updates.'
    })
  })

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    const percent = Math.round(progressObj.percent)
    console.log(`[AutoUpdater] Download progress: ${percent}%`)
    broadcastUpdateStatus({
      status: 'downloading',
      progress: percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    let releaseNotesStr = ''
    if (typeof info.releaseNotes === 'string') {
      releaseNotesStr = info.releaseNotes
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotesStr = info.releaseNotes
        .map((n) => (typeof n === 'string' ? n : n.note))
        .join('\n')
    }

    broadcastUpdateStatus({
      status: 'update-downloaded',
      latestVersion: info.version,
      releaseNotes: releaseNotesStr,
      progress: 100
    })
  })

  // IPC Handlers exposed to Renderer
  ipcMain.handle('update:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('update:getStatus', () => {
    return { ...currentState, currentVersion: app.getVersion() }
  })

  ipcMain.handle('update:checkForUpdates', async () => {
    try {
      console.log('[AutoUpdater] Manually checking for updates...')
      broadcastUpdateStatus({ status: 'checking-for-update', error: undefined })
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo }
    } catch (err: any) {
      console.error('[AutoUpdater] Manual check error:', err)
      broadcastUpdateStatus({
        status: 'error',
        error: err.message || 'Failed to check for updates'
      })
      return { success: false, error: err.message || 'Failed to check for updates' }
    }
  })

  ipcMain.handle('update:downloadUpdate', async () => {
    try {
      console.log('[AutoUpdater] Starting update download...')
      broadcastUpdateStatus({ status: 'downloading', progress: 0 })
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      console.error('[AutoUpdater] Download error:', err)
      broadcastUpdateStatus({
        status: 'error',
        error: err.message || 'Failed to download update'
      })
      return { success: false, error: err.message || 'Failed to download update' }
    }
  })

  ipcMain.handle('update:restartAndInstall', () => {
    console.log('[AutoUpdater] Quitting and installing update...')
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true)
    })
    return { success: true }
  })

  // Trigger silent check on startup after 5s delay if app is packaged
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Silent initial check error:', err.message)
      })
    }
  }, 5000)
}
