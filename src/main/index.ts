import { app, BrowserWindow, shell, Menu, MenuItem } from 'electron'
import { join, delimiter } from 'path'
import { Module } from 'module'

// Patch module resolution paths for packaged Prisma client
if (app.isPackaged) {
  const unpackedNodeModules = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
  process.env.NODE_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + delimiter : '') + unpackedNodeModules
  // @ts-ignore
  Module._initPaths()
}

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './database'
import { registerAllIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Project Workspace Manager',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Set up spellcheck spelling fixes & standard editing context menu
  mainWindow.webContents.on('context-menu', (_, params) => {
    const menu = new Menu()

    // Spelling suggestions
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => mainWindow?.webContents.replaceMisspelling(suggestion)
          })
        )
      }
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Add misspelled word to dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: `Add "${params.misspelledWord}" to Dictionary`,
          click: () => {
            mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          }
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Editing standard actions (Cut, Copy, Paste, etc.)
    if (params.isEditable) {
      menu.append(
        new MenuItem({
          label: 'Undo',
          role: 'undo',
          enabled: params.editFlags.canUndo
        })
      )
      menu.append(
        new MenuItem({
          label: 'Redo',
          role: 'redo',
          enabled: params.editFlags.canRedo
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(
        new MenuItem({
          label: 'Cut',
          role: 'cut',
          enabled: params.editFlags.canCut
        })
      )
      menu.append(
        new MenuItem({
          label: 'Copy',
          role: 'copy',
          enabled: params.editFlags.canCopy
        })
      )
      menu.append(
        new MenuItem({
          label: 'Paste',
          role: 'paste',
          enabled: params.editFlags.canPaste
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(
        new MenuItem({
          label: 'Select All',
          role: 'selectAll',
          enabled: params.editFlags.canSelectAll
        })
      )
    } else if (params.selectionText) {
      menu.append(
        new MenuItem({
          label: 'Copy',
          role: 'copy',
          enabled: params.editFlags.canCopy
        })
      )
    }

    if (menu.items.length > 0) {
      menu.popup()
    }
  })

  // Dev server or production build
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.pwm.app')

  // Initialize database
  await initDatabase()

  // Register all IPC handlers
  registerAllIpcHandlers()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
