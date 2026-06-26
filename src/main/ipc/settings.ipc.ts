import { ipcMain, dialog } from 'electron'
import { getPrisma } from '../database'

export function registerSettingsHandlers(): void {
  const prisma = getPrisma()

  // Select folder directory dialog
  ipcMain.handle('settings:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    const settings = await prisma.setting.findMany()
    const result: Record<string, string> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }
    return result
  })

  // Get single setting
  ipcMain.handle('settings:get', async (_, key: string) => {
    const setting = await prisma.setting.findUnique({ where: { key } })
    return setting?.value ?? null
  })

  // Update setting
  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    return prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
  })

  // Update multiple settings
  ipcMain.handle('settings:setMany', async (_, settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    }
    return { success: true }
  })
}
