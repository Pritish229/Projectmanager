import { useEffect, useState } from 'react'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, PageLoader, ConfirmDialog } from '@/components/shared'
import { cn, formatDateTime, formatFileSize } from '@/lib/utils'
import { useProjectStore } from '@/stores/useProjectStore'
import { toast } from '@/stores/useToastStore'
import {
  Database, Download, Upload, Trash2, Clock, HardDrive,
  RefreshCw, CheckSquare, Square, Loader2, X
} from 'lucide-react'

interface BackupItem {
  id: string
  fileName: string
  filePath: string
  size: number
  type: string
  createdAt: string
}

function getBackupDetails(fileName: string) {
  const lowerName = fileName.toLowerCase()
  if (lowerName.startsWith('autoback')) {
    return {
      title: 'Auto Backup',
      badgeText: 'Auto',
      isSystem: true
    }
  } else if (lowerName.startsWith('system') || lowerName.includes('system-backup')) {
    return {
      title: 'System Backup',
      badgeText: 'System',
      isSystem: true
    }
  } else if (
    lowerName.includes('projects-multi-backup') ||
    lowerName.includes('multi-project') ||
    lowerName.startsWith('project-multi')
  ) {
    return {
      title: 'Multi-Project Backup',
      badgeText: 'Multi-Project',
      isSystem: false
    }
  } else if (lowerName.startsWith('project-') || lowerName.includes('project-')) {
    // Try to extract project code e.g. project-CODE_timestamp.zip or pwm-project-CODE-backup_...
    const match = fileName.match(/project-([^-_\.]+)/i)
    const code = match ? match[1].toUpperCase() : ''
    return {
      title: code ? `Project Backup (${code})` : 'Project Backup',
      badgeText: code ? `Project: ${code}` : 'Project',
      isSystem: false
    }
  } else {
    // Fallback for legacy or manually named files
    return {
      title: fileName,
      badgeText: 'System',
      isSystem: true
    }
  }
}

export function BackupPage() {
  const { projects, fetchProjects } = useProjectStore()

  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Custom states
  const [backupFolder, setBackupFolder] = useState<string>('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportScope, setExportScope] = useState<'system' | 'projects'>('system')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [restoreConfirmPath, setRestoreConfirmPath] = useState<string | null>(null)

  // Scope selection states for import & restore
  const [showImportScopeModal, setShowImportScopeModal] = useState(false)
  const [selectedImportScope, setSelectedImportScope] = useState<'system' | 'projects'>('system')
  const [selectedRestoreScope, setSelectedRestoreScope] = useState<'system' | 'projects'>('system')

  useEffect(() => {
    loadBackups()
    loadBackupFolder()
    fetchProjects()
  }, [])

  const loadBackups = async () => {
    try {
      const data = await window.api.backup.getHistory()
      setBackups(data)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await window.api.backup.delete(deleteConfirmId)
      toast.success('Backup deleted successfully.')
      await loadBackups()
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete backup.')
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const loadBackupFolder = async () => {
    try {
      const folder = await window.api.backup.getFolder()
      setBackupFolder(folder)
    } catch (e) {
      console.error('Failed to load backup folder:', e)
    }
  }

  const handleToggleProject = (id: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAllProjects = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([])
    } else {
      setSelectedProjectIds(projects.map(p => p.id))
    }
  }

  const handleExportClick = () => {
    setExportScope('system')
    setSelectedProjectIds([])
    setShowExportModal(true)
  }

  const triggerExport = async () => {
    setExporting(true)
    try {
      const options = {
        scope: exportScope,
        projectIds: exportScope === 'projects' ? selectedProjectIds : []
      }
      const result = await window.api.backup.export('manual', options)
      if (result) {
        toast.success('Backup exported successfully.')
        await loadBackups()
      }
      setShowExportModal(false)
    } catch (e) {
      console.error(e)
      toast.error('Failed to export backup.')
    } finally {
      setExporting(false)
    }
  }

  const handleRestoreFromFile = async () => {
    if (!restoreConfirmPath) return
    setImporting(true)
    try {
      const result = await window.api.backup.restoreFromFile(restoreConfirmPath, selectedRestoreScope)
      if (result?.success) {
        toast.success(result.message || 'Backup restored successfully.')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error('Restore failed.')
      }
    } catch (e) {
      console.error(e)
      toast.error((e as Error).message || 'Failed to restore backup.')
    } finally {
      setImporting(false)
      setRestoreConfirmPath(null)
    }
  }

  const triggerImport = async (scope: 'system' | 'projects') => {
    setShowImportScopeModal(false)
    setImporting(true)
    try {
      const result = await window.api.backup.import(scope)
      if (result?.success) {
        toast.success(result.message || 'Backup imported successfully.')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error('Import cancelled or failed.')
      }
    } catch (e) {
      console.error(e)
      toast.error((e as Error).message || 'Failed to import backup.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 h-full overflow-auto">
      <Breadcrumbs items={[{ label: 'Backup & Restore' }]} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground mt-0.5 mb-2.5">Protect your data with backups</p>
          {backupFolder && (
            <div className="text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border px-3 py-1.5 rounded-lg inline-flex items-center gap-2 select-none shadow-sm">
              <HardDrive className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Backup Location: <span className="font-mono text-foreground select-all">{backupFolder}</span></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedImportScope('system')
              setShowImportScopeModal(true)
            }}
            disabled={importing || exporting}
            className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import Backup'}
          </button>
          <button
            onClick={handleExportClick}
            disabled={importing || exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Backup'}
          </button>
        </div>
      </div>

      {backups.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No backups yet"
          description="Create your first backup to protect your project data."
          action={
            <button
              onClick={handleExportClick}
              disabled={importing || exporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-sm"
            >
              Create Backup
            </button>
          }
        />
      ) : (
        <div className="space-y-3 max-w-2xl">
          {backups.map((backup, i) => {
            const details = getBackupDetails(backup.fileName)
            return (
              <div
                key={backup.id}
                className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-all animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-xl shrink-0",
                  details.isSystem 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                )}>
                  {details.isSystem ? <HardDrive className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate">{details.title}</span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0",
                      details.isSystem
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                    )}>
                      {details.badgeText}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5" title={backup.fileName}>
                    {backup.fileName}
                  </p>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {formatDateTime(backup.createdAt)}
                    </span>
                    <span>•</span>
                    <span className="font-medium">{formatFileSize(backup.size)}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wider font-bold">{backup.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setSelectedRestoreScope(details.isSystem ? 'system' : 'projects')
                      setRestoreConfirmPath(backup.filePath)
                    }}
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    title="Restore from this backup"
                    disabled={importing || exporting}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(backup.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    title="Delete backup"
                    disabled={importing || exporting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Backup File"
        description="Are you sure you want to delete this backup? This will permanently delete the zip file and erase its record from the history. This action cannot be undone."
        confirmLabel="Delete Backup"
        variant="danger"
      />

      {/* Restore Confirmation Dialog (Modal Selector) */}
      {restoreConfirmPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => !importing && !exporting && setRestoreConfirmPath(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl p-6 animate-scale-in flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-amber-500/10 text-amber-600">
                <RefreshCw className={cn("w-5 h-5", importing && "animate-spin")} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Restore Backup</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select how you want to restore this backup.</p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Restore Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={importing || exporting}
                  onClick={() => setSelectedRestoreScope('system')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                    selectedRestoreScope === 'system'
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <HardDrive className="w-4 h-4 mb-1" />
                  <span className="text-xs font-bold block">Replace System</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Wipes current data and restores system</span>
                </button>
                <button
                  type="button"
                  disabled={importing || exporting}
                  onClick={() => setSelectedRestoreScope('projects')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                    selectedRestoreScope === 'projects'
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <Database className="w-4 h-4 mb-1" />
                  <span className="text-xs font-bold block">Merge Projects</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Imports projects, leaving others intact</span>
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 p-3.5 rounded-xl border border-amber-500/20 text-xs leading-normal mb-5">
              {selectedRestoreScope === 'system' ? (
                <strong>WARNING: This will permanently delete all current projects, files, and settings, and replace them with this backup. This cannot be undone.</strong>
              ) : (
                <strong>NOTE: This will import/merge the projects inside the backup file. Any conflicting projects will be updated, but unrelated projects will be preserved.</strong>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t">
              <button
                type="button"
                disabled={importing || exporting}
                onClick={() => setRestoreConfirmPath(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || exporting}
                onClick={handleRestoreFromFile}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Scope Selector Modal */}
      {showImportScopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => !importing && !exporting && setShowImportScopeModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl p-6 animate-scale-in flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-primary/10 text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Import Backup</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select how you want to import the backup file.</p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Import Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={importing || exporting}
                  onClick={() => setSelectedImportScope('system')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                    selectedImportScope === 'system'
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <HardDrive className="w-4 h-4 mb-1" />
                  <span className="text-xs font-bold block">Replace System</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Wipes current data and restores system</span>
                </button>
                <button
                  type="button"
                  disabled={importing || exporting}
                  onClick={() => setSelectedImportScope('projects')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                    selectedImportScope === 'projects'
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <Database className="w-4 h-4 mb-1" />
                  <span className="text-xs font-bold block">Merge Projects</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Imports projects, leaving others intact</span>
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 p-3.5 rounded-xl border border-amber-500/20 text-xs leading-normal mb-5">
              {selectedImportScope === 'system' ? (
                <strong>WARNING: This will permanently delete all current projects, files, and settings on this machine before restoring. This cannot be undone.</strong>
              ) : (
                <strong>NOTE: This will merge the projects inside the backup file. Any conflicting projects will be updated, but unrelated projects will be preserved.</strong>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t">
              <button
                type="button"
                disabled={importing || exporting}
                onClick={() => setShowImportScopeModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || exporting}
                onClick={() => triggerImport(selectedImportScope)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm cursor-pointer"
              >
                Choose File & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !importing && !exporting && setShowExportModal(false)} />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl p-6 animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">Export Backup</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select what you would like to include in this backup.</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={importing || exporting}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 my-4 shrink-0">
              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider select-none">
                  Backup Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={importing || exporting}
                    onClick={() => setExportScope('system')}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                      exportScope === 'system'
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:bg-muted/40 hover:border-muted-foreground/15 text-foreground"
                    )}
                  >
                    <HardDrive className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold block">Entire System</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Backup all projects, files, logs, and settings</span>
                  </button>
                  <button
                    type="button"
                    disabled={importing || exporting}
                    onClick={() => setExportScope('projects')}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                      exportScope === 'projects'
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:bg-muted/40 hover:border-muted-foreground/15 text-foreground"
                    )}
                  >
                    <Database className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold block">Selected Projects</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Backup specific projects, client info, and files</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Project List Selection */}
            {exportScope === 'projects' && (
              <div className="flex-1 min-h-[180px] overflow-hidden flex flex-col border rounded-xl bg-muted/10 p-3 mb-4">
                <div className="flex justify-between items-center mb-2 shrink-0 select-none">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Projects ({selectedProjectIds.length} selected)</span>
                  <button
                    type="button"
                    disabled={importing || exporting}
                    onClick={handleToggleSelectAllProjects}
                    className="text-[10px] text-primary font-bold hover:underline disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {selectedProjectIds.length === projects.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 select-none pr-1">
                  {projects.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      No projects found.
                    </div>
                  ) : (
                    projects.map(project => {
                      const isChecked = selectedProjectIds.includes(project.id)
                      return (
                        <div
                          key={project.id}
                          onClick={() => {
                            if (!importing && !exporting) {
                              handleToggleProject(project.id)
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer hover:bg-card/50 transition-colors text-xs font-semibold",
                            isChecked ? "border-primary/20 bg-primary/5 text-foreground" : "border-border bg-card text-foreground",
                            (importing || exporting) && "opacity-50 pointer-events-none cursor-not-allowed"
                          )}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold block text-foreground truncate">{project.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono leading-none">{project.code}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t shrink-0">
              <button
                type="button"
                disabled={importing || exporting}
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={(exportScope === 'projects' && selectedProjectIds.length === 0) || exporting || importing}
                onClick={triggerExport}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm cursor-pointer"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    Export Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
