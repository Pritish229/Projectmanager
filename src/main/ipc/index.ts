import { registerProjectHandlers } from './projects.ipc'
import { registerTodoHandlers } from './todos.ipc'
import { registerDeliverableHandlers } from './deliverables.ipc'
import { registerApprovalHandlers } from './approvals.ipc'
import { registerFileHandlers } from './files.ipc'
import { registerNoteHandlers } from './notes.ipc'
import { registerActivityHandlers } from './activity.ipc'
import { registerNotificationHandlers } from './notifications.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerBackupHandlers, startAutoBackupScheduler } from './backup.ipc'
import { registerReportHandlers } from './reports.ipc'
import { registerDashboardHandlers } from './dashboard.ipc'
import { registerClientHandlers } from './clients.ipc'

export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerClientHandlers()
  registerTodoHandlers()
  registerDeliverableHandlers()
  registerApprovalHandlers()
  registerFileHandlers()
  registerNoteHandlers()
  registerActivityHandlers()
  registerNotificationHandlers()
  registerSettingsHandlers()
  registerBackupHandlers()
  registerReportHandlers()
  registerDashboardHandlers()
  
  // Start the background automatic backup scheduler
  startAutoBackupScheduler()
  
  console.log('[IPC] All handlers registered')
}
