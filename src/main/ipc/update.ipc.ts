import { app, ipcMain, dialog } from 'electron'
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import { join } from 'path'
import { parse as parseUrl } from 'url'
import { spawn } from 'child_process'

function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, '').split('.').map(Number)
  const latestParts = latest.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const cur = currentParts[i] || 0
    const lat = latestParts[i] || 0
    if (lat > cur) return true
    if (cur > lat) return false
  }
  return false
}

function fetchManifest(urlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = parseUrl(urlStr)
      const protocol = parsed.protocol === 'https:' ? https : http
      
      const req = protocol.get(urlStr, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(fetchManifest(res.headers.location))
          return
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`Server returned status code ${res.statusCode}`))
          return
        }
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error('Failed to parse manifest JSON'))
          }
        })
      })
      
      req.on('error', (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function downloadWithRedirects(
  urlStr: string,
  destPath: string,
  onProgress: (progress: number) => void,
  onSuccess: () => void,
  onError: (err: any) => void
) {
  try {
    const parsed = parseUrl(urlStr)
    const protocol = parsed.protocol === 'https:' ? https : http
    
    const req = protocol.get(urlStr, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadWithRedirects(res.headers.location, destPath, onProgress, onSuccess, onError)
        return
      }
      
      if (res.statusCode !== 200) {
        onError(new Error(`Server returned status code ${res.statusCode}`))
        return
      }
      
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
      let receivedBytes = 0
      
      const fileStream = fs.createWriteStream(destPath)
      res.pipe(fileStream)
      
      res.on('data', (chunk) => {
        receivedBytes += chunk.length
        if (totalBytes > 0) {
          const percent = Math.round((receivedBytes / totalBytes) * 100)
          onProgress(percent)
        }
      })
      
      fileStream.on('finish', () => {
        fileStream.close()
        onSuccess()
      })
      
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {})
        onError(err)
      })
    })
    
    req.on('error', (err) => {
      onError(err)
    })
  } catch (err) {
    onError(err)
  }
}

export function registerUpdateHandlers(): void {
  // Get version of packaged app
  ipcMain.handle('update:getVersion', () => {
    return app.getVersion()
  })

  // Check for updates by fetching manifest
  ipcMain.handle('update:checkForUpdates', async (_, url: string) => {
    try {
      const manifest = await fetchManifest(url)
      const currentVersion = app.getVersion()
      const hasUpdate = isNewerVersion(currentVersion, manifest.version)
      
      return {
        hasUpdate,
        currentVersion,
        latestVersion: manifest.version,
        releaseNotes: manifest.releaseNotes || '',
        url: manifest.url || '',
        success: true
      }
    } catch (err: any) {
      console.error('[Update Check Error]', err)
      return {
        hasUpdate: false,
        success: false,
        error: err.message || 'Failed to retrieve update manifest'
      }
    }
  })

  // Download remote update and run installer
  ipcMain.handle('update:installRemote', async (event, url: string) => {
    const tempDir = app.getPath('temp')
    const tempPath = join(tempDir, 'pwm-setup-update.exe')

    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch (err) {
        console.error('Failed to clear old update temp file:', err)
      }
    }

    return new Promise((resolve) => {
      downloadWithRedirects(
        url,
        tempPath,
        (percent) => {
          event.sender.send('update:download-progress', percent)
        },
        () => {
          // Launch the update installer in background and exit
          try {
            const child = spawn(tempPath, [], {
              detached: true,
              stdio: 'ignore'
            })
            child.unref()
            
            setTimeout(() => {
              app.quit()
            }, 500)
            
            resolve({ success: true })
          } catch (err: any) {
            resolve({ success: false, error: `Failed to execute installer: ${err.message}` })
          }
        },
        (err) => {
          resolve({ success: false, error: err.message })
        }
      )
    })
  })

  // Install update from a local file selector dialog
  ipcMain.handle('update:installLocal', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Update Installer Executable',
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe'] }
      ]
    })
    
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: 'Cancelled' }
    }

    const filePath = result.filePaths[0]

    try {
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()

      setTimeout(() => {
        app.quit()
      }, 500)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: `Failed to execute local installer: ${err.message}` }
    }
  })
}
