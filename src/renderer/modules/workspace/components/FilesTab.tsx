import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { EmptyState, ConfirmDialog } from '@/components/shared'
import { toast } from '@/stores/useToastStore'
import {
  Upload, Download, Trash2, Pencil, Search, LayoutGrid, List,
  File, Image, FileText, Video, Music, Archive, FileSpreadsheet,
  Eye, X, Check, Loader2, AlertCircle, FolderPlus, FolderOpen,
  ChevronRight, Home, Move, Info, MoreVertical, Folder
} from 'lucide-react'

interface ProjectFile {
  id: string
  projectId: string
  folderId: string | null
  name: string
  originalName: string
  path: string
  mimeType: string
  size: number
  category?: string
  createdAt: string
}
interface FileFolder {
  id: string; projectId: string; name: string; createdAt: string; updatedAt: string
  files: { id: string; size: number }[]
}
interface FilesTabProps { projectId: string; isReadOnly?: boolean }
interface ContextMenu { x: number; y: number; type: 'file' | 'folder' | 'multi'; targetId: string | null }
interface PropertiesTarget { type: 'file' | 'folder' | 'multi'; fileId?: string; folderId?: string }
interface DragRect { startX: number; startY: number; currentX: number; currentY: number; active: boolean }

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes','KB','MB','GB','TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
function getFileIcon(mimeType: string) {
  const mime = mimeType?.toLowerCase() || ''
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return Video
  if (mime.startsWith('audio/')) return Music
  if (mime === 'application/pdf') return FileText
  if (mime.includes('spreadsheet') || mime === 'text/csv' || mime.includes('excel')) return FileSpreadsheet
  if (mime.includes('word') || mime === 'text/plain') return FileText
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed') || mime.includes('7z')) return Archive
  return File
}
function getFileCategory(file: ProjectFile): string {
  if (file.category) return file.category
  const mime = file.mimeType?.toLowerCase() || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('spreadsheet') || mime === 'text/plain' || mime === 'text/csv') return 'document'
  return 'other'
}
function rectsOverlap(r1:{left:number;top:number;right:number;bottom:number},r2:{left:number;top:number;right:number;bottom:number}){
  return !(r1.right<r2.left||r1.left>r2.right||r1.bottom<r2.top||r1.top>r2.bottom)
}
export function FilesTab({ projectId, isReadOnly = false }: FilesTabProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all'|'image'|'document'|'other'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteFolderState, setDeleteFolderState] = useState<{ id: string; name: string } | null>(null)
  const [deleteFolderKeepFiles, setDeleteFolderKeepFiles] = useState(true)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [propertiesTarget, setPropertiesTarget] = useState<PropertiesTarget | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null | 'root'>('root')
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragRect, setDragRect] = useState<DragRect | null>(null)
  const [draggedFileIds, setDraggedFileIds] = useState<string[]>([])
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [filesData, foldersData] = await Promise.all([
        window.api.files.getByProject(projectId),
        window.api.files.getFolders(projectId)
      ])
      setFiles(filesData); setFolders(foldersData)
    } catch (err) { setError('Failed to load project files'); console.error(err) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => {
    loadData()
    const targetFolderId = sessionStorage.getItem('workspace:target-folder-id')
    if (targetFolderId) {
      setActiveFolderId(targetFolderId === 'root' ? null : targetFolderId)
      sessionStorage.removeItem('workspace:target-folder-id')
    } else {
      setActiveFolderId(null)
    }
  }, [projectId])
  useEffect(() => { setSelectedIds(new Set()) }, [projectId, activeFolderId])

  useEffect(() => {
    const close = () => setContextMenu(null)
    if (contextMenu) window.addEventListener('click', close, { once: true })
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const filteredFiles = useMemo(() => files.filter(file => {
    const inFolder = activeFolderId ? file.folderId === activeFolderId : !file.folderId
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || getFileCategory(file) === categoryFilter
    return inFolder && matchesSearch && matchesCategory
  }), [files, activeFolderId, searchTerm, categoryFilter])

  const filteredFolders = useMemo(() => {
    if (activeFolderId !== null) return []
    return folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [folders, activeFolderId, searchTerm])

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId) || null, [folders, activeFolderId])

  const allFilteredSelected = useMemo(() => {
    const allIds = [...filteredFiles.map(f => f.id), ...filteredFolders.map(f => f.id)]
    return allIds.length > 0 && allIds.every(id => selectedIds.has(id))
  }, [filteredFiles, filteredFolders, selectedIds])

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleSelectAll = () => {
    const allIds = [...filteredFiles.map(f => f.id), ...filteredFolders.map(f => f.id)]
    if (allFilteredSelected) {
      setSelectedIds(prev => { const next = new Set(prev); allIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); allIds.forEach(id => next.add(id)); return next })
    }
  }

  const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-item]')) return
    if (e.button !== 0) return
    const container = containerRef.current; if (!container) return
    const rect = container.getBoundingClientRect()
    setDragRect({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top, active: true })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container || !dragRect?.active) return
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      setDragRect(prev => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : prev)
    }
    const onMouseUp = () => {
      if (!dragRect) return
      const selRect = { left: Math.min(dragRect.startX, dragRect.currentX), top: Math.min(dragRect.startY, dragRect.currentY), right: Math.max(dragRect.startX, dragRect.currentX), bottom: Math.max(dragRect.startY, dragRect.currentY) }
      const containerRect = container.getBoundingClientRect()
      const newSelected = new Set<string>()
      itemRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect()
        const elRect = { left: r.left - containerRect.left, top: r.top - containerRect.top, right: r.right - containerRect.left, bottom: r.bottom - containerRect.top }
        if (rectsOverlap(selRect, elRect)) newSelected.add(id)
      })
      if (newSelected.size > 0) setSelectedIds(newSelected)
      setDragRect(null)
    }
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [dragRect])

  const openContextMenu = (e: React.MouseEvent, type: 'file' | 'folder' | 'multi', targetId: string | null) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type, targetId })
  }
  const handleUpload = async () => {
    setUploading(true); setError(null)
    try {
      const newFiles = await window.api.files.upload(projectId)
      if (newFiles?.length > 0) {
        if (activeFolderId) {
          await window.api.files.bulkMoveToFolder(newFiles.map((f: ProjectFile) => f.id), activeFolderId)
          await loadData()
        } else { setFiles(prev => [...newFiles, ...prev]) }
        toast.success(`${newFiles.length} file(s) uploaded successfully.`)
      }
    } catch (err) { setError('Error uploading file'); toast.error('Failed to upload files.'); console.error(err) }
    finally { setUploading(false) }
  }
  const handlePreview = async (id: string) => { try { await window.api.files.preview(id) } catch { toast.error('Could not open file preview.') } }
  const handleDownload = async (id: string) => { try { const res = await window.api.files.download(id); if (res?.success) toast.success('File downloaded.') } catch { toast.error('Failed to download.') } }
  const startRename = (file: ProjectFile) => { setRenamingId(file.id); setRenameValue(file.originalName); setContextMenu(null) }
  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    try { await window.api.files.rename(id, renameValue.trim()); setFiles(prev => prev.map(f => f.id === id ? { ...f, originalName: renameValue.trim() } : f)); setRenamingId(null); toast.success('File renamed.') }
    catch { toast.error('Failed to rename file.') }
  }
  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try { await window.api.files.delete(deleteConfirmId); setFiles(prev => prev.filter(f => f.id !== deleteConfirmId)); setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteConfirmId); return next }); setDeleteConfirmId(null); toast.success('File deleted.') }
    catch { toast.error('Failed to delete file.'); setDeleteConfirmId(null) }
  }
  const handleBulkDelete = async () => {
    const fileIds = [...selectedIds].filter(id => files.some(f => f.id === id))
    const folderIds = [...selectedIds].filter(id => folders.some(f => f.id === id))
    try {
      if (fileIds.length) await window.api.files.bulkDelete(fileIds)
      for (const fid of folderIds) await window.api.files.deleteFolder(fid, true)
      await loadData(); setSelectedIds(new Set()); setIsBulkDeleteConfirmOpen(false); toast.success('Selected items deleted.')
    } catch { toast.error('Failed to delete selected items.') }
  }
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const folder = await window.api.files.createFolder(projectId, newFolderName.trim())
      setFolders(prev => [...prev, { ...folder, files: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewFolderName(''); setCreateFolderOpen(false); toast.success(`Folder created.`)
    } catch { toast.error('Failed to create folder.') }
  }
  const startRenameFolder = (folder: FileFolder) => { setRenamingFolderId(folder.id); setRenameFolderValue(folder.name); setContextMenu(null) }
  const handleRenameFolder = async (id: string) => {
    if (!renameFolderValue.trim()) return
    try { await window.api.files.renameFolder(id, renameFolderValue.trim()); setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renameFolderValue.trim() } : f)); setRenamingFolderId(null); toast.success('Folder renamed.') }
    catch { toast.error('Failed to rename folder.') }
  }
  const handleDeleteFolder = async () => {
    if (!deleteFolderState) return
    try { await window.api.files.deleteFolder(deleteFolderState.id, !deleteFolderKeepFiles); await loadData(); setDeleteFolderState(null); toast.success('Folder deleted.') }
    catch { toast.error('Failed to delete folder.') }
  }
  const openMoveDialog = () => { setMoveTargetFolderId('root'); setMoveDialogOpen(true); setContextMenu(null) }
  const handleMoveSelected = async () => {
    const fileIds = [...selectedIds].filter(id => files.some(f => f.id === id))
    const target = moveTargetFolderId === 'root' ? null : moveTargetFolderId
    try { await window.api.files.bulkMoveToFolder(fileIds, target); await loadData(); setSelectedIds(new Set()); setMoveDialogOpen(false); toast.success('Files moved.') }
    catch { toast.error('Failed to move files.') }
  }

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    if (isReadOnly) return
    let filesToDrag = [fileId]
    if (selectedIds.has(fileId)) {
      filesToDrag = files.filter(f => selectedIds.has(f.id)).map(f => f.id)
    } else {
      setSelectedIds(new Set([fileId]))
      filesToDrag = [fileId]
    }
    setDraggedFileIds(filesToDrag)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(filesToDrag))
    e.dataTransfer.setData('text/plain', filesToDrag.join(','))
  }

  const handleDragEnd = () => {
    setDraggedFileIds([])
    setDragOverFolderId(null)
  }

  const handleDragOverFolder = (e: React.DragEvent, folderId: string | 'root') => {
    if (isReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    const types = Array.from(e.dataTransfer.types || [])
    if (types.includes('Files') || types.includes('files')) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'move'
    }
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId)
    }
  }

  const handleDragLeaveFolder = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverFolderId(null)
    }
  }

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string | null) => {
    if (isReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    setIsDragActive(false)

    const types = Array.from(e.dataTransfer.types || [])
    // Handle OS external files drag & drop directly to folder
    if (types.includes('Files') || types.includes('files')) {
      const filesList = Array.from(e.dataTransfer.files)
      if (!filesList.length) return
      
      const filePaths = filesList.map((f: File) => window.api.files.getPathForFile(f)).filter(Boolean)
      if (!filePaths.length) return
      
      setLoading(true)
      try {
        const newFiles = await window.api.files.uploadPaths(projectId, filePaths)
        if (newFiles?.length > 0) {
          await window.api.files.bulkMoveToFolder(newFiles.map((f: ProjectFile) => f.id), folderId)
          await loadData()
          toast.success(`${newFiles.length} file(s) uploaded to folder successfully.`)
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to upload files to folder.')
      } finally {
        setLoading(false)
      }
      return
    }

    let fileIds: string[] = []
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        fileIds = JSON.parse(data)
      } else {
        const text = e.dataTransfer.getData('text/plain')
        if (text) fileIds = text.split(',')
      }
    } catch (err) {
      console.error('Error parsing drag data:', err)
    }

    if (!fileIds || fileIds.length === 0) {
      fileIds = draggedFileIds
    }

    const fileIdsToMove = fileIds.filter(id => files.some(f => f.id === id))
    if (fileIdsToMove.length === 0) return

    if (folderId === activeFolderId) return

    setLoading(true)
    try {
      await window.api.files.bulkMoveToFolder(fileIdsToMove, folderId)
      await loadData()
      setSelectedIds(new Set())
      toast.success(`${fileIdsToMove.length} file(s) moved.`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to move files.')
    } finally {
      setLoading(false)
      setDraggedFileIds([])
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (isReadOnly) return
    const types = Array.from(e.dataTransfer.types || [])
    if (types.includes('Files') || types.includes('files')) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return
    const types = Array.from(e.dataTransfer.types || [])
    if (types.includes('Files') || types.includes('files')) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (isReadOnly) return
    const types = Array.from(e.dataTransfer.types || [])
    if (types.includes('Files') || types.includes('files')) {
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setIsDragActive(false)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    if (isReadOnly) return
    const types = Array.from(e.dataTransfer.types || [])
    if (types.includes('Files') || types.includes('files')) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      const filesList = Array.from(e.dataTransfer.files)
      if (!filesList.length) return

      const filePaths = filesList.map((f: File) => window.api.files.getPathForFile(f)).filter(Boolean)
      if (!filePaths.length) return

      setUploading(true)
      setError(null)
      try {
        const newFiles = await window.api.files.uploadPaths(projectId, filePaths)
        if (newFiles?.length > 0) {
          if (activeFolderId) {
            await window.api.files.bulkMoveToFolder(newFiles.map((f: ProjectFile) => f.id), activeFolderId)
          }
          await loadData()
          toast.success(`${newFiles.length} file(s) uploaded successfully.`)
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to upload files.')
      } finally {
        setUploading(false)
      }
    }
  }

  const openProperties = (target: PropertiesTarget) => { setPropertiesTarget(target); setContextMenu(null) }
  const getPropertiesContent = () => {
    if (!propertiesTarget) return null
    if (propertiesTarget.type === 'file' && propertiesTarget.fileId) { const file = files.find(f => f.id === propertiesTarget.fileId); if (!file) return null; return { kind: 'file' as const, file } }
    if (propertiesTarget.type === 'folder' && propertiesTarget.folderId) { const folder = folders.find(f => f.id === propertiesTarget.folderId); if (!folder) return null; return { kind: 'folder' as const, folder, files: files.filter(f => f.folderId === folder.id) } }
    if (propertiesTarget.type === 'multi') { const selFiles = files.filter(f => selectedIds.has(f.id)); const selFolders = folders.filter(f => selectedIds.has(f.id)); return { kind: 'multi' as const, files: selFiles, folders: selFolders, totalSize: selFiles.reduce((s,f) => s+f.size,0) } }
    return null
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const propertiesContent = getPropertiesContent()
  const selectionCount = selectedIds.size
  const hasFileSelection = [...selectedIds].some(id => files.some(f => f.id === id))
  return (
    <div className="p-6 h-full flex flex-col overflow-hidden" onContextMenu={e => e.preventDefault()}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center flex-1 max-w-md gap-2 px-3 py-2 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search files and folders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-muted text-xs font-semibold transition-all cursor-pointer bg-card text-muted-foreground hover:text-foreground select-none">
            <input type="checkbox" checked={allFilteredSelected} onChange={e => { e.stopPropagation(); toggleSelectAll() }} className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer accent-primary" />
            Select All
          </button>
          <div className="flex items-center rounded-lg border bg-card p-1">
            <button onClick={() => setViewMode('grid')} title="Grid View" className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} title="List View" className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
          </div>
          {!isReadOnly && <button onClick={() => setCreateFolderOpen(true)} className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:border-solid hover:bg-muted transition-all cursor-pointer"><FolderPlus className="w-4 h-4" /> New Folder</button>}
          {!isReadOnly && <button onClick={handleUpload} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50">{uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Files</>}</button>}
        </div>
      </div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-3 shrink-0 select-none">
        <button 
          onClick={() => setActiveFolderId(null)}
          onDragOver={e => handleDragOverFolder(e, 'root')}
          onDragLeave={handleDragLeaveFolder}
          onDrop={e => handleDropOnFolder(e, null)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
            dragOverFolderId === 'root'
              ? 'bg-primary/20 text-primary font-bold scale-105 border border-primary/40'
              : activeFolderId === null 
                ? 'text-foreground font-semibold' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Home className="w-3.5 h-3.5" /> All Files
        </button>
        {activeFolder && (<><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /><span className="flex items-center gap-1 px-2 py-1 text-foreground font-semibold"><FolderOpen className="w-3.5 h-3.5 text-amber-500" /> {activeFolder.name}</span></>)}
      </div>
      {/* Bulk action banner */}
      {selectionCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-in shrink-0">
          <span className="text-xs font-semibold text-primary">{selectionCount} item{selectionCount !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            {hasFileSelection && !isReadOnly && <button onClick={openMoveDialog} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted font-medium transition-colors cursor-pointer bg-card"><Move className="w-3 h-3" /> Move to Folder</button>}
            <button onClick={() => openProperties({ type: 'multi' })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted font-medium transition-colors cursor-pointer bg-card"><Info className="w-3 h-3" /> Properties</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted font-medium transition-colors cursor-pointer bg-card">Clear</button>
            {!isReadOnly && <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-lg hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Delete Selected</button>}
          </div>
        </div>
      )}
      {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2 shrink-0"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
      {activeFolderId !== null && (
        <div className="flex items-center gap-1.5 pb-4 mb-4 border-b overflow-x-auto shrink-0 select-none">
          {(['all', 'image', 'document', 'other'] as const).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${categoryFilter === cat ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'}`}>{cat}s</button>
          ))}
        </div>
      )}
      {/* Main content */}
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-auto min-h-0 relative select-none transition-colors duration-200 ${isDragActive ? 'bg-primary/5' : ''}`}
        onMouseDown={onContainerMouseDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragActive && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center gap-3 z-50 backdrop-blur-[2px] pointer-events-none animate-fade-in">
            <Upload className="w-12 h-12 text-primary animate-bounce" />
            <p className="text-sm font-semibold text-primary">Drop files here to upload to {activeFolder ? activeFolder.name : 'All Files'}</p>
          </div>
        )}
        {dragRect?.active && Math.abs(dragRect.currentX - dragRect.startX) > 5 && (
          <div className="absolute border border-primary bg-primary/10 pointer-events-none z-50 rounded" style={{ left: Math.min(dragRect.startX, dragRect.currentX), top: Math.min(dragRect.startY, dragRect.currentY), width: Math.abs(dragRect.currentX - dragRect.startX), height: Math.abs(dragRect.currentY - dragRect.startY) }} />
        )}
        {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <EmptyState icon={activeFolderId ? FolderOpen : File}
            title={searchTerm ? 'No items match your search' : activeFolderId ? 'This folder is empty' : 'No files uploaded yet'}
            description={searchTerm ? 'Try adjusting your search query.' : activeFolderId ? 'Upload files here or move files into this folder.' : 'Upload files or create folders to organise your project assets.'}
            action={!isReadOnly ? (<div className="flex gap-2"><button onClick={handleUpload} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">Upload Files</button>{!activeFolderId && <button onClick={() => setCreateFolderOpen(true)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer">Create Folder</button>}</div>) : undefined}
          />
        ) : viewMode === 'grid' ? (
          <GridView 
            files={filteredFiles} folders={filteredFolders} selectedIds={selectedIds} 
            renamingId={renamingId} renameValue={renameValue} renamingFolderId={renamingFolderId} renameFolderValue={renameFolderValue} 
            isReadOnly={isReadOnly} itemRefs={itemRefs} onToggleSelect={toggleSelect} 
            onOpenFolder={id => { setActiveFolderId(id); setCategoryFilter('all'); setSearchTerm('') }} 
            onContextMenu={openContextMenu} onPreview={handlePreview} onSetRenameValue={setRenameValue} 
            onRename={handleRename} onCancelRename={() => setRenamingId(null)} 
            onSetRenameFolderValue={setRenameFolderValue} onRenameFolder={handleRenameFolder} onCancelRenameFolder={() => setRenamingFolderId(null)}
            onDragStart={handleDragStart} onDragEnd={handleDragEnd} 
            onDragOverFolder={handleDragOverFolder} onDragLeaveFolder={handleDragLeaveFolder} 
            onDropOnFolder={handleDropOnFolder} dragOverFolderId={dragOverFolderId}
          />
        ) : (
          <ListView 
            files={filteredFiles} folders={filteredFolders} selectedIds={selectedIds} 
            renamingId={renamingId} renameValue={renameValue} renamingFolderId={renamingFolderId} renameFolderValue={renameFolderValue} 
            isReadOnly={isReadOnly} itemRefs={itemRefs} onToggleSelect={toggleSelect} 
            onOpenFolder={id => { setActiveFolderId(id); setCategoryFilter('all'); setSearchTerm('') }} 
            onContextMenu={openContextMenu} onPreview={handlePreview} onDownload={handleDownload} 
            onSetRenameValue={setRenameValue} onRename={handleRename} onCancelRename={() => setRenamingId(null)} 
            onSetRenameFolderValue={setRenameFolderValue} onRenameFolder={handleRenameFolder} onCancelRenameFolder={() => setRenamingFolderId(null)}
            onDragStart={handleDragStart} onDragEnd={handleDragEnd} 
            onDragOverFolder={handleDragOverFolder} onDragLeaveFolder={handleDragLeaveFolder} 
            onDropOnFolder={handleDropOnFolder} dragOverFolderId={dragOverFolderId}
          />
        )}
      </div>
      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 w-52 bg-card rounded-xl border shadow-2xl py-1.5 animate-scale-in" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
            {contextMenu.type === 'file' && contextMenu.targetId && (() => {
              const file = files.find(f => f.id === contextMenu.targetId)
              if (!file) return null
              return (<><CtxItem icon={Eye} label="Preview" onClick={() => { handlePreview(file.id); setContextMenu(null) }} /><CtxItem icon={Download} label="Download" onClick={() => { handleDownload(file.id); setContextMenu(null) }} />{!isReadOnly && (<><CtxItem icon={Pencil} label="Rename" onClick={() => startRename(file)} /><CtxItem icon={Move} label="Move to Folder..." onClick={() => { setSelectedIds(new Set([file.id])); openMoveDialog() }} /><div className="my-1 border-t border-border" /><CtxItem icon={Info} label="Properties" onClick={() => openProperties({ type: 'file', fileId: file.id })} /><div className="my-1 border-t border-border" /><CtxItem icon={Trash2} label="Delete" destructive onClick={() => { setDeleteConfirmId(file.id); setContextMenu(null) }} /></>)}{isReadOnly && <CtxItem icon={Info} label="Properties" onClick={() => openProperties({ type: 'file', fileId: file.id })} />}</>)
            })()}
            {contextMenu.type === 'folder' && contextMenu.targetId && (() => {
              const folder = folders.find(f => f.id === contextMenu.targetId)
              if (!folder) return null
              return (<><CtxItem icon={FolderOpen} label="Open Folder" onClick={() => { setActiveFolderId(folder.id); setContextMenu(null) }} />{!isReadOnly && <CtxItem icon={Pencil} label="Rename" onClick={() => startRenameFolder(folder)} />}<div className="my-1 border-t border-border" /><CtxItem icon={Info} label="Properties" onClick={() => openProperties({ type: 'folder', folderId: folder.id })} />{!isReadOnly && (<><div className="my-1 border-t border-border" /><CtxItem icon={Trash2} label="Delete Folder" destructive onClick={() => { setDeleteFolderState({ id: folder.id, name: folder.name }); setContextMenu(null) }} /></>)}</>)
            })()}
            {contextMenu.type === 'multi' && (<>{hasFileSelection && !isReadOnly && <CtxItem icon={Move} label={`Move ${selectionCount} items...`} onClick={openMoveDialog} />}<CtxItem icon={Info} label="Properties" onClick={() => openProperties({ type: 'multi' })} />{!isReadOnly && (<><div className="my-1 border-t border-border" /><CtxItem icon={Trash2} label={`Delete ${selectionCount} items`} destructive onClick={() => { setIsBulkDeleteConfirmOpen(true); setContextMenu(null) }} /></>)}</>)}
          </div>
        </>
      )}
      {/* Properties Panel */}
      {propertiesTarget && propertiesContent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setPropertiesTarget(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-card border-l shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Properties</h3>
              <button onClick={() => setPropertiesTarget(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
              {propertiesContent.kind === 'file' && (<><PropsRow label="Name" value={propertiesContent.file.originalName} /><PropsRow label="Size" value={formatBytes(propertiesContent.file.size)} /><PropsRow label="Type" value={propertiesContent.file.mimeType || 'Unknown'} /><PropsRow label="Category" value={getFileCategory(propertiesContent.file)} /><PropsRow label="Uploaded" value={new Date(propertiesContent.file.createdAt).toLocaleString()} /><PropsRow label="Storage name" value={propertiesContent.file.name} /><PropsRow label="Folder" value={folders.find(f => f.id === propertiesContent.file.folderId)?.name || '— Root'} /></>)}
              {propertiesContent.kind === 'folder' && (<><PropsRow label="Folder name" value={propertiesContent.folder.name} /><PropsRow label="Files inside" value={`${propertiesContent.files.length} file${propertiesContent.files.length !== 1 ? 's' : ''}`} /><PropsRow label="Total size" value={formatBytes(propertiesContent.files.reduce((s,f) => s+f.size,0))} /><PropsRow label="Created" value={new Date(propertiesContent.folder.createdAt).toLocaleString()} />{propertiesContent.files.length > 0 && (<div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Files</p><div className="space-y-1.5">{propertiesContent.files.map(f => (<div key={f.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/40"><span className="truncate flex-1 mr-2">{f.originalName}</span><span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span></div>))}</div></div>)}</>)}
              {propertiesContent.kind === 'multi' && (<><PropsRow label="Selected files" value={`${propertiesContent.files.length}`} /><PropsRow label="Selected folders" value={`${propertiesContent.folders.length}`} /><PropsRow label="Total size" value={formatBytes(propertiesContent.totalSize)} /><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By type</p>{(['image','document','other'] as const).map(cat => { const count = propertiesContent.files.filter(f => getFileCategory(f) === cat).length; if (!count) return null; return <PropsRow key={cat} label={cat.charAt(0).toUpperCase()+cat.slice(1)+'s'} value={`${count}`} /> })}</div></>)}
            </div>
          </div>
        </>
      )}
      {/* Create Folder Dialog */}
      {createFolderOpen && (<><div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setCreateFolderOpen(false)} /><div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-2xl w-80 p-6"><h3 className="font-bold text-base mb-1 flex items-center gap-2"><FolderPlus className="w-4 h-4 text-primary" /> New Folder</h3><p className="text-xs text-muted-foreground mb-4">Enter a name for the new folder.</p><input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setCreateFolderOpen(false) }} placeholder="Folder name..." autoFocus className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4" /><div className="flex gap-2"><button onClick={() => setCreateFolderOpen(false)} className="flex-1 py-2 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">Cancel</button><button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50">Create</button></div></div></>)}
      {/* Move to Folder Dialog */}
      {moveDialogOpen && (<><div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMoveDialogOpen(false)} /><div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-2xl w-80 p-6"><h3 className="font-bold text-base mb-1 flex items-center gap-2"><Move className="w-4 h-4 text-primary" /> Move to Folder</h3><p className="text-xs text-muted-foreground mb-4">Select a destination for the selected files.</p><div className="space-y-1.5 max-h-48 overflow-y-auto mb-4"><FolderChoice label="Root (All Files)" icon={Home} selected={moveTargetFolderId === 'root'} onClick={() => setMoveTargetFolderId('root')} />{folders.map(f => <FolderChoice key={f.id} label={f.name} icon={Folder} selected={moveTargetFolderId === f.id} onClick={() => setMoveTargetFolderId(f.id)} />)}</div><div className="flex gap-2"><button onClick={() => setMoveDialogOpen(false)} className="flex-1 py-2 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">Cancel</button><button onClick={handleMoveSelected} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">Move Here</button></div></div></>)}
      {/* Delete Folder Dialog */}
      {deleteFolderState && (<><div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteFolderState(null)} /><div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-2xl w-80 p-6"><h3 className="font-bold text-base mb-1 flex items-center gap-2 text-destructive"><Trash2 className="w-4 h-4" /> Delete Folder</h3><p className="text-sm text-muted-foreground mb-4">What happens to files inside <strong>"{deleteFolderState.name}"</strong>?</p><div className="space-y-2 mb-4"><label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"><input type="radio" name="folderDel" checked={deleteFolderKeepFiles} onChange={() => setDeleteFolderKeepFiles(true)} className="mt-0.5 accent-primary" /><div><p className="text-sm font-medium">Keep files (move to root)</p><p className="text-xs text-muted-foreground">Files stay in the project, moved back to All Files.</p></div></label><label className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"><input type="radio" name="folderDel" checked={!deleteFolderKeepFiles} onChange={() => setDeleteFolderKeepFiles(false)} className="mt-0.5 accent-destructive" /><div><p className="text-sm font-medium text-destructive">Delete all files inside</p><p className="text-xs text-muted-foreground">Permanently deletes the folder and all files within it.</p></div></label></div><div className="flex gap-2"><button onClick={() => setDeleteFolderState(null)} className="flex-1 py-2 border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">Cancel</button><button onClick={handleDeleteFolder} className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors cursor-pointer">Delete</button></div></div></>)}
      <ConfirmDialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} onConfirm={handleDelete} title="Delete File" description="Permanently delete this file? This action cannot be undone." confirmLabel="Delete File" variant="danger" />
      <ConfirmDialog open={isBulkDeleteConfirmOpen} onClose={() => setIsBulkDeleteConfirmOpen(false)} onConfirm={handleBulkDelete} title="Delete Selected Items" description={`Delete the ${selectionCount} selected item(s)? This permanently erases all selected files and folders.`} confirmLabel="Delete All" variant="danger" />
    </div>
  )
}
function CtxItem({ icon: Icon, label, onClick, destructive }: { icon: React.ElementType; label: string; onClick: () => void; destructive?: boolean }) {
  return <button onClick={onClick} className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors cursor-pointer ${destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'}`}><Icon className="w-3.5 h-3.5 shrink-0" />{label}</button>
}
function PropsRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-0.5"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span><span className="text-sm text-foreground break-all">{value}</span></div>
}
function FolderChoice({ label, icon: Icon, selected, onClick }: { label: string; icon: React.ElementType; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${selected ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}><Icon className={`w-4 h-4 ${selected ? 'text-primary' : 'text-amber-500'}`} />{label}</button>
}

interface ViewProps {
  files: ProjectFile[]; folders: FileFolder[]; selectedIds: Set<string>
  renamingId: string | null; renameValue: string; renamingFolderId: string | null; renameFolderValue: string
  isReadOnly: boolean; itemRefs: React.MutableRefObject<Map<string, HTMLElement>>
  onToggleSelect: (id: string) => void; onOpenFolder: (id: string) => void
  onContextMenu: (e: React.MouseEvent, type: 'file' | 'folder' | 'multi', targetId: string | null) => void
  onPreview: (id: string) => void; onDownload?: (id: string) => void
  onSetRenameValue: (v: string) => void; onRename: (id: string) => void; onCancelRename: () => void
  onSetRenameFolderValue: (v: string) => void; onRenameFolder: (id: string) => void; onCancelRenameFolder: () => void
  onDragStart: (e: React.DragEvent, fileId: string) => void
  onDragEnd: () => void
  onDragOverFolder: (e: React.DragEvent, folderId: string) => void
  onDragLeaveFolder: (e: React.DragEvent) => void
  onDropOnFolder: (e: React.DragEvent, folderId: string | null) => void
  dragOverFolderId: string | null
}

function GridView({ 
  files, folders, selectedIds, renamingId, renameValue, renamingFolderId, renameFolderValue, 
  isReadOnly, itemRefs, onToggleSelect, onOpenFolder, onContextMenu, onPreview, 
  onSetRenameValue, onRename, onCancelRename, onSetRenameFolderValue, onRenameFolder, onCancelRenameFolder,
  onDragStart, onDragEnd, onDragOverFolder, onDragLeaveFolder, onDropOnFolder, dragOverFolderId
}: ViewProps) {
  const setRef = (id: string) => (el: HTMLElement | null) => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id) }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-1 pb-6">
      {folders.map(folder => (
        <div key={folder.id} ref={setRef(folder.id)} data-item
          onContextMenu={e => { onContextMenu(e, selectedIds.size > 1 && selectedIds.has(folder.id) ? 'multi' : 'folder', folder.id) }}
          onDoubleClick={() => onOpenFolder(folder.id)}
          onMouseDown={e => { if (e.button === 1) e.preventDefault() }}
          onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onToggleSelect(folder.id) } }}
          onDragOver={e => onDragOverFolder(e, folder.id)}
          onDragLeave={onDragLeaveFolder}
          onDrop={e => onDropOnFolder(e, folder.id)}
          className={`group relative rounded-xl border p-4 cursor-pointer transition-all select-none flex flex-col items-center gap-2 h-32 justify-center ${
            dragOverFolderId === folder.id 
              ? 'border-primary bg-primary/20 scale-105 shadow-lg ring-2 ring-primary/40' 
              : selectedIds.has(folder.id) 
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary' 
                : 'bg-card hover:shadow-md hover:border-primary/40'
          }`}>
          <input type="checkbox" checked={selectedIds.has(folder.id)} onChange={() => onToggleSelect(folder.id)} onClick={e => e.stopPropagation()} className="absolute top-4 left-4 w-3.5 h-3.5 rounded accent-primary cursor-pointer" style={{ opacity: selectedIds.has(folder.id) ? 1 : 0 }} />
          {renamingFolderId === folder.id ? (
            <div className="flex flex-col items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
              <FolderOpen className="w-8 h-8 text-amber-400" />
              <input type="text" value={renameFolderValue} onChange={e => onSetRenameFolderValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onRenameFolder(folder.id); if (e.key === 'Escape') onCancelRenameFolder() }} className="w-full px-1.5 py-0.5 rounded border text-xs bg-background outline-none focus:ring-1 focus:ring-primary" autoFocus />
              <div className="flex gap-1">
                <button onClick={() => onRenameFolder(folder.id)} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"><Check className="w-3 h-3" /></button>
                <button onClick={onCancelRenameFolder} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ) : (<><FolderOpen className={`w-10 h-10 transition-colors ${selectedIds.has(folder.id) ? 'text-primary' : 'text-amber-400 group-hover:text-amber-500'}`} /><span className="text-xs font-semibold text-center truncate w-full text-foreground">{folder.name}</span><span className="text-[10px] text-muted-foreground">{(folder.files || []).length} item{(folder.files || []).length !== 1 ? 's' : ''}</span></>)}
        </div>
      ))}
      {files.map(file => {
        const IconComponent = getFileIcon(file.mimeType)
        const isEditing = renamingId === file.id
        return (
          <div key={file.id} ref={setRef(file.id)} data-item
            onContextMenu={e => { onContextMenu(e, selectedIds.size > 1 && selectedIds.has(file.id) ? 'multi' : 'file', file.id) }}
            draggable={!isReadOnly}
            onDragStart={e => onDragStart(e, file.id)}
            onDragEnd={onDragEnd}
            onMouseDown={e => { if (e.button === 1) e.preventDefault() }}
            onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onToggleSelect(file.id) } }}
            className={`group relative rounded-xl border p-4 cursor-pointer transition-all select-none flex flex-col h-36 justify-between ${selectedIds.has(file.id) ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary' : 'bg-card hover:shadow-md hover:border-primary/30'}`}>
            <div className="flex items-start justify-between">
              <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => onToggleSelect(file.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded accent-primary cursor-pointer" style={{ opacity: selectedIds.has(file.id) ? 1 : 0 }} />
              <div className={`p-2 rounded-lg transition-colors ${selectedIds.has(file.id) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}><IconComponent className="w-5 h-5" /></div>
            </div>
            <div className="mt-2 flex-1 flex flex-col justify-end min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input type="text" value={renameValue} onChange={e => onSetRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onRename(file.id); if (e.key === 'Escape') onCancelRename() }} className="flex-1 px-1.5 py-0.5 rounded border text-xs bg-background outline-none focus:ring-1 focus:ring-primary" autoFocus />
                  <button onClick={() => onRename(file.id)} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"><Check className="w-3 h-3" /></button>
                  <button onClick={onCancelRename} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (<><h4 onDoubleClick={e => { e.stopPropagation(); onPreview(file.id) }} className="text-xs font-semibold truncate text-foreground" title={file.originalName}>{file.originalName}</h4><div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground"><span>{formatBytes(file.size)}</span><span>{new Date(file.createdAt).toLocaleDateString()}</span></div></>)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ 
  files, folders, selectedIds, renamingId, renameValue, renamingFolderId, renameFolderValue, 
  isReadOnly, itemRefs, onToggleSelect, onOpenFolder, onContextMenu, onPreview, onDownload, 
  onSetRenameValue, onRename, onCancelRename, onSetRenameFolderValue, onRenameFolder, onCancelRenameFolder,
  onDragStart, onDragEnd, onDragOverFolder, onDragLeaveFolder, onDropOnFolder, dragOverFolderId
}: ViewProps) {
  const setRef = (id: string) => (el: HTMLElement | null) => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id) }
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none"><th className="w-10 px-4 py-3"></th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border text-sm">
            {folders.map(folder => (
              <tr key={folder.id} ref={setRef(folder.id) as any} data-item
                onContextMenu={e => { onContextMenu(e, selectedIds.size > 1 && selectedIds.has(folder.id) ? 'multi' : 'folder', folder.id) }}
                onDragOver={e => onDragOverFolder(e, folder.id)}
                onDragLeave={onDragLeaveFolder}
                onDrop={e => onDropOnFolder(e, folder.id)}
                onMouseDown={e => { if (e.button === 1) e.preventDefault() }}
                onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onToggleSelect(folder.id) } }}
                className={`group cursor-pointer transition-colors ${
                  dragOverFolderId === folder.id 
                    ? 'bg-primary/20 border-y border-primary font-semibold' 
                    : selectedIds.has(folder.id) 
                      ? 'bg-primary/10 border-y border-primary/40' 
                      : 'hover:bg-muted/30'
                }`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(folder.id)} onChange={() => onToggleSelect(folder.id)} className="w-3.5 h-3.5 rounded accent-primary cursor-pointer" /></td>
                <td className="px-4 py-3" onClick={() => onOpenFolder(folder.id)}><div className="flex items-center gap-2.5"><FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />{renamingFolderId === folder.id ? (<div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}><input type="text" value={renameFolderValue} onChange={e => onSetRenameFolderValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onRenameFolder(folder.id); if (e.key === 'Escape') onCancelRenameFolder() }} className="px-2 py-0.5 rounded border text-xs bg-background outline-none focus:ring-1 focus:ring-primary" autoFocus /><button onClick={() => onRenameFolder(folder.id)} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"><Check className="w-3 h-3" /></button><button onClick={onCancelRenameFolder} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3 h-3" /></button></div>) : <span className="font-medium hover:text-primary cursor-pointer">{folder.name}</span>}</div></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(folder.files || []).length} file{(folder.files || []).length !== 1 ? 's' : ''}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(folder.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right"><button onClick={e => onContextMenu(e, 'folder', folder.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"><MoreVertical className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {files.map(file => {
              const IconComponent = getFileIcon(file.mimeType); const isEditing = renamingId === file.id
              return (
                <tr key={file.id} ref={setRef(file.id) as any} data-item 
                  onContextMenu={e => { onContextMenu(e, selectedIds.size > 1 && selectedIds.has(file.id) ? 'multi' : 'file', file.id) }} 
                  draggable={!isReadOnly}
                  onDragStart={e => onDragStart(e, file.id)}
                  onDragEnd={onDragEnd}
                  onMouseDown={e => { if (e.button === 1) e.preventDefault() }}
                  onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onToggleSelect(file.id) } }}
                  className={`group cursor-pointer transition-colors ${selectedIds.has(file.id) ? 'bg-primary/10 border-y border-primary/40' : 'hover:bg-muted/10'}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => onToggleSelect(file.id)} className="w-3.5 h-3.5 rounded accent-primary cursor-pointer" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><IconComponent className="w-4 h-4 text-muted-foreground shrink-0" />{isEditing ? (<div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}><input type="text" value={renameValue} onChange={e => onSetRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onRename(file.id); if (e.key === 'Escape') onCancelRename() }} className="px-2 py-0.5 rounded border text-xs bg-background outline-none focus:ring-1 focus:ring-primary" autoFocus /><button onClick={() => onRename(file.id)} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"><Check className="w-3 h-3" /></button><button onClick={onCancelRename} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3 h-3" /></button></div>) : <span onDoubleClick={e => { e.stopPropagation(); onPreview(file.id) }} className="font-medium hover:text-primary cursor-pointer truncate max-w-xs" title={file.originalName}>{file.originalName}</span>}</div></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatBytes(file.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(file.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => onPreview(file.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Preview"><Eye className="w-4 h-4" /></button>{onDownload && <button onClick={() => onDownload(file.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Download"><Download className="w-4 h-4" /></button>}<button onClick={e => onContextMenu(e, selectedIds.size > 1 && selectedIds.has(file.id) ? 'multi' : 'file', file.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="More"><MoreVertical className="w-4 h-4" /></button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}