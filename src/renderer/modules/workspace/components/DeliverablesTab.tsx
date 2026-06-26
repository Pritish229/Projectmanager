import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDeliverableStore, type Deliverable } from '@/stores/useDeliverableStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useApprovalStore } from '@/stores/useApprovalStore'
import { StatusBadge, ConfirmDialog, EmptyState } from '@/components/shared'
import { cn, formatDate, getFileList } from '@/lib/utils'
import {
  Plus, FileText, Upload, Download, Link2, Pencil, Trash2, Copy,
  MoreVertical, X, CheckSquare, Square, RefreshCw, AlertCircle,
  FileSpreadsheet, Image, File, Eye, Folder, Loader2, Search
} from 'lucide-react'

interface DeliverablesTabProps {
  projectId: string
  isReadOnly: boolean
}

const deliverableSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  deliverableNumber: z.string().optional()
})

type DeliverableFormData = z.infer<typeof deliverableSchema>

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
      return <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="w-3.5 h-3.5 text-violet-500 shrink-0" />
    default:
      return <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
  }
}


export function DeliverablesTab({ projectId, isReadOnly }: DeliverablesTabProps) {
  const {
    deliverables, loading, fetchDeliverables, createDeliverable,
    updateDeliverable, deleteDeliverable, uploadFile, downloadFile,
    removeFile, getFileBuffer, linkTodos, duplicateDeliverable,
    attachProjectFiles
  } = useDeliverableStore()

  const { todos, fetchTodos } = useTodoStore()
  const { currentProject } = useProjectStore()
  const { requestApproval } = useApprovalStore()

  // State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Link Todos Modal State
  const [linkingDeliverable, setLinkingDeliverable] = useState<Deliverable | null>(null)
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([])

  // Request Approval Modal State
  const [approvalDeliverable, setApprovalDeliverable] = useState<Deliverable | null>(null)
  const [approvalComment, setApprovalComment] = useState('')

  // File Preview Modal State
  const [activeFileManagerDel, setActiveFileManagerDel] = useState<Deliverable | null>(null)
  const [activePreviewIdx, setActivePreviewIdx] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<{ data: string; mimeType: string; name: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Project Files Selector State
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showProjectFilesModal, setShowProjectFilesModal] = useState(false)
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [selectedProjectFileIds, setSelectedProjectFileIds] = useState<string[]>([])
  const [attachingFiles, setAttachingFiles] = useState(false)
  const [fileSearchTerm, setFileSearchTerm] = useState('')

  // Derived fresh deliverable for files count and list
  const fileManagerDel = useMemo(() => {
    if (!activeFileManagerDel) return null
    return deliverables.find(d => d.id === activeFileManagerDel.id) || null
  }, [deliverables, activeFileManagerDel])

  const files = useMemo(() => {
    if (!fileManagerDel) return []
    return getFileList(fileManagerDel.fileName, fileManagerDel.filePath)
  }, [fileManagerDel])

  // Derived deliverable for deletion files count
  const deliverableToDelete = useMemo(() => {
    if (!deleteConfirmId) return null
    return deliverables.find(d => d.id === deleteConfirmId) || null
  }, [deliverables, deleteConfirmId])

  const filesToDelete = useMemo(() => {
    if (!deliverableToDelete) return []
    return getFileList(deliverableToDelete.fileName, deliverableToDelete.filePath)
  }, [deliverableToDelete])

  // Adjust preview index if files change
  useEffect(() => {
    if (files.length === 0) {
      setActivePreviewIdx(null)
    } else if (activePreviewIdx !== null && activePreviewIdx >= files.length) {
      setActivePreviewIdx(files.length - 1)
    }
  }, [files, activePreviewIdx])

  const loadPreview = async (delId: string, idx: number) => {
    setLoadingPreview(true)
    setPreviewData(null)
    try {
      const data = await getFileBuffer(delId, idx)
      setPreviewData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Reload preview on index/file change
  useEffect(() => {
    if (fileManagerDel && activePreviewIdx !== null) {
      loadPreview(fileManagerDel.id, activePreviewIdx)
    } else {
      setPreviewData(null)
    }
  }, [fileManagerDel, activePreviewIdx])

  // Load data
  useEffect(() => {
    fetchDeliverables(projectId)
    fetchTodos(projectId)
  }, [projectId, fetchDeliverables, fetchTodos])

  // Load project files when the project files selection modal is opened
  useEffect(() => {
    if (showProjectFilesModal) {
      setLoadingProjectFiles(true)
      window.api.files.getByProject(projectId)
        .then(files => {
          setProjectFiles(files)
          setSelectedProjectFileIds([])
          setFileSearchTerm('')
        })
        .catch(err => {
          console.error('Failed to load project files:', err)
        })
        .finally(() => {
          setLoadingProjectFiles(false)
        })
    }
  }, [showProjectFilesModal, projectId])

  // Form setup
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableSchema)
  })

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDeliverableId(null)
    reset({
      title: '',
      description: '',
      deliverableNumber: ''
    })
    setShowCreateModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (del: Deliverable) => {
    setEditingDeliverableId(del.id)
    setValue('title', del.title)
    setValue('description', del.description || '')
    setValue('deliverableNumber', del.deliverableNumber)
    setShowCreateModal(true)
    setOpenMenuId(null)
  }

  // Form Submit
  const onSubmit = async (data: DeliverableFormData) => {
    if (editingDeliverableId) {
      await updateDeliverable(editingDeliverableId, data)
    } else {
      await createDeliverable({ ...data, projectId })
    }
    setShowCreateModal(false)
    reset()
  }

  // Handle Delete
  const handleDelete = async (fileAction?: 'delete' | 'move') => {
    if (deleteConfirmId) {
      await deleteDeliverable(deleteConfirmId, fileAction)
      setDeleteConfirmId(null)
    }
  }

  // Open Link Todos Dialog
  const handleOpenLinkTodos = (del: Deliverable) => {
    setLinkingDeliverable(del)
    const currentLinks = del.deliverableTodos?.map(lt => lt.todoId) || []
    setSelectedTodoIds(currentLinks)
    setOpenMenuId(null)
  }

  // Toggle todo selection
  const handleToggleTodo = (todoId: string) => {
    setSelectedTodoIds(prev =>
      prev.includes(todoId) ? prev.filter(id => id !== todoId) : [...prev, todoId]
    )
  }

  // Save Links
  const handleSaveLinks = async () => {
    if (linkingDeliverable) {
      await linkTodos(linkingDeliverable.id, selectedTodoIds)
      setLinkingDeliverable(null)
    }
  }

  // Open Request Approval Dialog
  const handleOpenRequestApproval = (del: Deliverable) => {
    setApprovalDeliverable(del)
    setApprovalComment('')
    setOpenMenuId(null)
  }

  // Submit Approval Request
  const handleSubmitApprovalRequest = async () => {
    if (approvalDeliverable && currentProject?.clientId) {
      await requestApproval({
        deliverableId: approvalDeliverable.id,
        clientId: currentProject.clientId,
        comment: approvalComment
      })
      setApprovalDeliverable(null)
      fetchDeliverables(projectId) // reload to get new status
    }
  }

  // File action handlers
  const handleUpload = async (id: string) => {
    await uploadFile(id)
  }

  const handleDownload = async (id: string, fileIdx: number) => {
    await downloadFile(id, fileIdx)
  }

  const handleRemoveFile = async (id: string, fileIdx: number) => {
    await removeFile(id, fileIdx)
  }

  const handleOpenFileManager = (del: Deliverable) => {
    setActiveFileManagerDel(del)
    const items = getFileList(del.fileName, del.filePath)
    if (items.length > 0) {
      setActivePreviewIdx(0)
    } else {
      setActivePreviewIdx(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    await duplicateDeliverable(id)
    setOpenMenuId(null)
  }

  const handleToggleProjectFile = (fileId: string) => {
    setSelectedProjectFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    )
  }

  const handleAttachProjectFiles = async () => {
    if (!fileManagerDel || selectedProjectFileIds.length === 0) return
    setAttachingFiles(true)
    try {
      await attachProjectFiles(fileManagerDel.id, selectedProjectFileIds)
      setShowProjectFilesModal(false)
      
      const updatedDel = deliverables.find(d => d.id === fileManagerDel.id)
      const currentDelFiles = updatedDel ? getFileList(updatedDel.fileName, updatedDel.filePath) : []
      if (currentDelFiles.length === 0 || activePreviewIdx === null) {
        setActivePreviewIdx(0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAttachingFiles(false)
    }
  }

  const filteredProjectFiles = useMemo(() => {
    return projectFiles.filter(file =>
      file.originalName.toLowerCase().includes(fileSearchTerm.toLowerCase())
    )
  }, [projectFiles, fileSearchTerm])

  const getFileIconComponent = (mimeType: string) => {
    const mime = mimeType?.toLowerCase() || ''
    if (mime.startsWith('image/')) return Image
    if (mime === 'application/pdf') return FileText
    if (mime.includes('spreadsheet') || mime === 'text/csv' || mime.includes('excel')) return FileSpreadsheet
    return File
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes','KB','MB','GB','TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      {/* Top Filter Bar */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground">Project Deliverables</h2>
          <p className="text-xs text-muted-foreground">Manage and track documents, designs, and files for client sign-off.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Deliverable
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto border rounded-xl bg-card">
        {loading && deliverables.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : deliverables.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No deliverables yet"
            description="Create project deliverables like PDFs, designs, and assets to send for client approvals."
            action={!isReadOnly ? (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Create Deliverable
              </button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y">
            {/* Header */}
            <div className="flex items-center px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground select-none">
              <div className="w-28 shrink-0">ID</div>
              <div className="flex-1 min-w-0 pr-4">Title / Description</div>
              <div className="w-24 shrink-0 text-center">Version</div>
              <div className="w-36 shrink-0 text-center">Attached Files</div>
              <div className="w-28 shrink-0 text-center">Status</div>
              <div className="w-24 shrink-0 text-center">Linked Tasks</div>
              <div className="w-12 shrink-0"></div>
            </div>

            {/* Body */}
            <div className="divide-y">
              {deliverables.map(del => (
                <div key={del.id} className="flex items-center px-6 py-4 hover:bg-muted/30 transition-colors">
                  {/* ID */}
                  <div className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    {del.deliverableNumber}
                  </div>

                  {/* Title / Description */}
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="text-sm font-semibold text-foreground block truncate">
                      {del.title}
                    </span>
                    {del.description && (
                      <span className="text-xs text-muted-foreground block line-clamp-1 mt-0.5">
                        {del.description}
                      </span>
                    )}
                  </div>

                  {/* Version */}
                  <div className="w-24 shrink-0 text-center text-xs font-semibold text-foreground">
                    v{del.version}
                  </div>

                  {/* File Link/Upload */}
                  <div className="w-36 shrink-0 flex items-center justify-center px-3">
                    {(() => {
                      const delFiles = getFileList(del.fileName, del.filePath)
                      if (delFiles.length > 0) {
                        return (
                          <button
                            onClick={() => handleOpenFileManager(del)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-100/50 cursor-pointer shadow-sm w-full transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {delFiles.length} File{delFiles.length !== 1 ? 's' : ''}
                          </button>
                        )
                      } else {
                        return !isReadOnly ? (
                          <button
                            onClick={() => handleOpenFileManager(del)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-primary/20 hover:border-primary/50 text-primary rounded-md font-semibold bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer w-full"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Files
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 text-center w-full block">—</span>
                        )
                      }
                    })()}
                  </div>

                  {/* Status */}
                  <div className="w-28 shrink-0 text-center">
                    <StatusBadge status={del.status} />
                  </div>

                  {/* Linked Tasks count */}
                  <div className="w-24 shrink-0 text-center">
                    <button
                      onClick={() => !isReadOnly && handleOpenLinkTodos(del)}
                      disabled={isReadOnly}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-colors",
                        del.deliverableTodos && del.deliverableTodos.length > 0
                          ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-300"
                          : "bg-muted text-muted-foreground border-border",
                        !isReadOnly && "hover:bg-indigo-100/50 cursor-pointer"
                      )}
                    >
                      <Link2 className="w-3 h-3" />
                      {del.deliverableTodos?.length || 0} Task{del.deliverableTodos?.length !== 1 ? 's' : ''}
                    </button>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="w-12 shrink-0 flex items-center justify-end relative">
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === del.id ? null : del.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === del.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-popover text-popover-foreground shadow-xl p-1 z-20 animate-scale-in">
                              <button
                                onClick={() => handleOpenEdit(del)}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Details
                              </button>
                              <button
                                onClick={() => handleDuplicate(del.id)}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleOpenLinkTodos(del)}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors cursor-pointer"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                Link Todos ({del.deliverableTodos?.length || 0})
                              </button>
                              {currentProject?.clientId && del.status !== 'approved' && (
                                <button
                                  onClick={() => handleOpenRequestApproval(del)}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted text-primary rounded-md transition-colors cursor-pointer font-semibold"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  Send for Approval
                                </button>
                              )}
                              <div className="h-px bg-muted my-1" />
                              <button
                                onClick={() => { setDeleteConfirmId(del.id); setOpenMenuId(null) }}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-destructive/10 text-destructive rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deliverable Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingDeliverableId ? 'Edit Deliverable' : 'Add New Deliverable'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Deliverable Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Logo Design V1, Database Schema PDF..."
                  {...register('title')}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all",
                    errors.title && "border-destructive focus:border-destructive"
                  )}
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of the deliverable context..."
                  {...register('description')}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Deliverable Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEL-001 (auto-generated if empty)"
                  {...register('deliverableNumber')}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
                >
                  {editingDeliverableId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Todos Modal */}
      {linkingDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLinkingDeliverable(null)} />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">Link Project Tasks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Link todos that must be complete for this deliverable.</p>
              </div>
              <button
                onClick={() => setLinkingDeliverable(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2 select-none">
              {todos.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No tasks found in this project.
                </div>
              ) : (
                todos.map(todo => {
                  const isChecked = selectedTodoIds.includes(todo.id)
                  return (
                    <div
                      key={todo.id}
                      onClick={() => handleToggleTodo(todo.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                        isChecked ? "border-primary/30 bg-primary/5" : "border-border"
                      )}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">
                          {todo.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase">{todo.priority}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{todo.status}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t shrink-0">
              <button
                type="button"
                onClick={() => setLinkingDeliverable(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinks}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
              >
                Save Links
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send for Approval Modal */}
      {approvalDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setApprovalDeliverable(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Request Client Approval</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Send deliverable "{approvalDeliverable.title}" for review.</p>
              </div>
              <button
                onClick={() => setApprovalDeliverable(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Client reviewer
                </label>
                <input
                  type="text"
                  disabled
                  value={currentProject?.client?.name || 'No client linked'}
                  className="w-full px-3 py-2 rounded-lg border bg-muted text-sm outline-none text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Feedback comment/message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="e.g. Please review the logo designs and let us know if any changes are required..."
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setApprovalDeliverable(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApprovalRequest}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {/* File Manager & Preview Modal */}
      {fileManagerDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveFileManagerDel(null)} />
          <div className="relative w-full max-w-5xl h-[85vh] mx-4 bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b bg-muted/20 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">Attachments Manager</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage and live preview files for "{fileManagerDel.title}"</p>
              </div>
              <button
                onClick={() => setActiveFileManagerDel(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body: Split into Left Sidebar and Right Preview Panel */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Sidebar: File List */}
              <div className="w-80 border-r bg-muted/10 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-muted/20 flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attached Files ({files.length})</span>
                  {!isReadOnly && (
                    <div className="relative">
                      <button
                        onClick={() => setShowAddMenu(prev => !prev)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add File
                      </button>
                      
                      {showAddMenu && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} />
                          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border bg-popover text-popover-foreground shadow-xl p-1 z-40 animate-scale-in">
                            <button
                              onClick={async () => {
                                setShowAddMenu(false)
                                const countBefore = files.length;
                                await handleUpload(fileManagerDel.id);
                                if (countBefore === 0) {
                                  setActivePreviewIdx(0);
                                }
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors cursor-pointer text-foreground"
                            >
                              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                              Upload from PC
                            </button>
                            <button
                              onClick={() => {
                                setShowAddMenu(false)
                                setShowProjectFilesModal(true)
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors cursor-pointer text-foreground"
                            >
                              <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                              Select Project Files
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none">
                  {files.length === 0 ? (
                    <div className="text-center py-16 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      No files attached yet.
                    </div>
                  ) : (
                    files.map((file) => {
                      const isActive = file.index === activePreviewIdx
                      return (
                        <div
                          key={file.index}
                          onClick={() => setActivePreviewIdx(file.index)}
                          className={cn(
                            "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group/file",
                            isActive
                              ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                              : "bg-card border-border hover:bg-muted/40 hover:border-muted-foreground/15 text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2.5 min-w-0 flex-1">
                            {getFileIcon(file.name)}
                            <span className="text-xs font-semibold truncate">{file.name}</span>
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(fileManagerDel.id, file.index);
                              }}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title={`Download ${file.name}`}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isReadOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(fileManagerDel.id, file.index);
                                }}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title={`Remove ${file.name}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Preview Area */}
              <div className="flex-1 bg-muted/5 flex flex-col justify-center items-center p-6 overflow-hidden relative">
                {activePreviewIdx === null ? (
                  <div className="text-center text-muted-foreground max-w-sm">
                    <FileText className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-foreground">No File Selected</p>
                    <p className="text-xs text-muted-foreground/75 mt-1.5">Select a file from the list to preview its contents.</p>
                  </div>
                ) : loadingPreview ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading live preview...</span>
                  </div>
                ) : previewData ? (
                  <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
                    {/* Render Image Previews */}
                    {previewData.mimeType.startsWith('image/') && (
                      <div className="w-full h-full flex items-center justify-center p-2 bg-slate-900/5 rounded-2xl border">
                        <img
                          src={`data:${previewData.mimeType};base64,${previewData.data}`}
                          alt={previewData.name}
                          className="max-w-full max-h-full object-contain rounded-lg bg-white shadow-lg animate-fade-in"
                        />
                      </div>
                    )}

                    {/* Render PDF Previews */}
                    {previewData.mimeType === 'application/pdf' && (
                      <iframe
                        src={`data:${previewData.mimeType};base64,${previewData.data}`}
                        title={previewData.name}
                        className="w-full h-full rounded-2xl border border-border shadow-lg bg-white animate-fade-in"
                      />
                    )}

                    {/* Fallback for other file types */}
                    {!previewData.mimeType.startsWith('image/') && previewData.mimeType !== 'application/pdf' && (
                      <div className="text-center p-8 border border-dashed rounded-2xl bg-card max-w-md shadow-lg animate-scale-in">
                        <div className="mx-auto w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
                          {getFileIcon(previewData.name)}
                        </div>
                        <h4 className="text-sm font-bold text-foreground truncate max-w-xs mx-auto mb-1" title={previewData.name}>
                          {previewData.name}
                        </h4>
                        <p className="text-xs text-muted-foreground uppercase mb-4 tracking-wider">{previewData.mimeType.split('/').pop()} file</p>
                        <p className="text-xs text-muted-foreground/80 mb-6">Live preview is not supported for this file type. Download to view.</p>
                        <button
                          onClick={() => handleDownload(fileManagerDel.id, activePreviewIdx)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          Download File
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground max-w-sm animate-scale-in">
                    <AlertCircle className="w-14 h-14 text-destructive/40 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-foreground">Preview Failed</p>
                    <p className="text-xs text-muted-foreground/75 mt-1.5">We couldn't load a preview for this file. It may be missing on disk or corrupt.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          
          {filesToDelete.length === 0 ? (
            <ConfirmDialog
              open={!!deleteConfirmId}
              onClose={() => setDeleteConfirmId(null)}
              onConfirm={() => handleDelete()}
              title="Delete Deliverable"
              description="Are you sure you want to delete this deliverable? This will also remove any approval history and task links associated with it."
              variant="danger"
              confirmLabel="Delete"
            />
          ) : (
            <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-destructive/10 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground">Delete Deliverable</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This deliverable has <span className="font-semibold text-foreground">{filesToDelete.length} attached file(s)</span>.
                    How would you like to handle them before deletion?
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selection Options */}
              <div className="space-y-3 my-5">
                {/* Move option */}
                <button
                  onClick={() => handleDelete('move')}
                  className="flex items-start gap-3.5 w-full text-left p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Folder className="w-5 h-5 group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground block">
                      Move Files to Project Files & Delete Deliverable
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                      Keep the files by saving them to your project's Files tab. The deliverable metadata will be deleted.
                    </span>
                  </div>
                </button>

                {/* Delete option */}
                <button
                  onClick={() => handleDelete('delete')}
                  className="flex items-start gap-3.5 w-full text-left p-4 rounded-xl border border-destructive/20 hover:border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                    <Trash2 className="w-5 h-5 group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-destructive block">
                      Permanently Delete Everything
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                      Permanently delete the deliverable record and all of its attached files from the storage disk. This cannot be undone.
                    </span>
                  </div>
                </button>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Select Project Files Modal */}
      {showProjectFilesModal && fileManagerDel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-xs" onClick={() => setShowProjectFilesModal(false)} />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl p-6 animate-scale-in max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">Select Project Files</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Choose files from this project to attach to "{fileManagerDel.title}".</p>
              </div>
              <button
                onClick={() => setShowProjectFilesModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter for project files */}
            <div className="my-3 shrink-0 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search project files..."
                value={fileSearchTerm}
                onChange={(e) => setFileSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-xs outline-none focus:border-primary transition-all text-foreground"
              />
            </div>

            {/* Scrollable list of project files */}
            <div className="flex-1 overflow-y-auto py-2 space-y-2 select-none min-h-[200px]">
              {loadingProjectFiles ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading files...</span>
                </div>
              ) : filteredProjectFiles.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No files found in project. Upload files in the "Files" tab first.
                </div>
              ) : (
                filteredProjectFiles.map(file => {
                  const isChecked = selectedProjectFileIds.includes(file.id)
                  const FileIcon = getFileIconComponent(file.mimeType)
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleToggleProjectFile(file.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                        isChecked ? "border-primary/30 bg-primary/5" : "border-border"
                      )}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <FileIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {file.originalName}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t shrink-0">
              <button
                type="button"
                onClick={() => setShowProjectFilesModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedProjectFileIds.length === 0}
                onClick={handleAttachProjectFiles}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm cursor-pointer"
              >
                {attachingFiles ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Attaching...
                  </>
                ) : (
                  <>
                    Attach Selected ({selectedProjectFileIds.length})
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
