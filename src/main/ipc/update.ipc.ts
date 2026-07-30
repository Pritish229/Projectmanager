import { app, ipcMain, BrowserWindow, Notification as ElectronNotification } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { getPrisma } from '../database'

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

function formatUpdateError(err: any): string {
  const raw = err?.message || String(err || '')
  if (raw.includes('Cannot find latest.yml')) {
    return 'Update manifest (latest.yml) is missing from the GitHub Release. Please re-publish the release using `npm run release` or GitHub Actions.'
  }
  if (raw.includes('404')) {
    return 'Release update file (latest.yml) was not found on GitHub Releases (404 Not Found).'
  }
  return raw || 'An error occurred while handling updates.'
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

  autoUpdater.on('update-available', async (info: UpdateInfo) => {
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

    // Create in-app and desktop notification for the new release
    try {
      const prisma = getPrisma()
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'update',
          title: { contains: info.version }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            type: 'update',
            title: `New App Version v${info.version} Released!`,
            message: `A new version v${info.version} is now available. ${releaseNotesStr ? `Release Notes: ${releaseNotesStr.slice(0, 180)}` : 'Click to view details and update.'}`
          }
        })

        if (ElectronNotification.isSupported()) {
          const desktopNotif = new ElectronNotification({
            title: `🚀 PWM Version v${info.version} Released!`,
            body: `A new app version is available. Click to open and install.`
          })
          desktopNotif.show()
        }

        // Notify renderer windows
        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('notifications:updated')
          }
        }
      }
    } catch (err) {
      console.error('[AutoUpdater] Notification creation error:', err)
    }
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
      error: formatUpdateError(err)
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

  autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
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

    // Create notification for downloaded update ready to install
    try {
      const prisma = getPrisma()
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'update',
          title: { contains: `v${info.version} Ready` }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            type: 'update',
            title: `Update v${info.version} Ready to Install`,
            message: `Version v${info.version} has finished downloading. Click here or go to Settings to restart and apply the new version.`
          }
        })

        if (ElectronNotification.isSupported()) {
          const desktopNotif = new ElectronNotification({
            title: `🎉 Update v${info.version} Downloaded!`,
            body: `Restart PWM now to complete the update installation.`
          })
          desktopNotif.show()
        }

        // Notify renderer windows
        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('notifications:updated')
          }
        }
      }
    } catch (err) {
      console.error('[AutoUpdater] Downloaded notification error:', err)
    }
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
      const formattedErr = formatUpdateError(err)
      broadcastUpdateStatus({
        status: 'error',
        error: formattedErr
      })
      return { success: false, error: formattedErr }
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
