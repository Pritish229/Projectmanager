import { useEffect, useState, useMemo, useRef } from 'react'
import { useDeliverableStore } from '@/stores/useDeliverableStore'
import { useApprovalStore } from '@/stores/useApprovalStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { StatusBadge, EmptyState } from '@/components/shared'
import { cn, formatDateTime, getFileList } from '@/lib/utils'
import {
  CheckSquare, X, RefreshCw, Send, AlertTriangle, CheckCircle2,
  XCircle, MessageSquare, Clock, ArrowRight, CornerDownRight, History,
  Download, FileText, FileSpreadsheet, Image, File, Pencil, Plus,
  Paperclip, ExternalLink, Eye, StickyNote, Trash2, Pin
} from 'lucide-react'

interface ApprovalsTabProps {
  projectId: string
  isReadOnly: boolean
}

interface PinnedResource {
  id: string
  type: 'file' | 'note'
  refId: string
  name: string
}

// ─── Component for Comment Input with File & Note Pinging ────────────────────────
function CommentInputWithPings({
  value,
  onChange,
  placeholder,
  projectFiles,
  projectNotes,
  minRows = 3,
  disabled = false
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  projectFiles: any[]
  projectNotes: any[]
  minRows?: number
  disabled?: boolean
}) {
  const [showPicker, setShowPicker] = useState<'file' | 'note' | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [autocomplete, setAutocomplete] = useState<{
    visible: boolean
    query: string
    cursor: number
  }>({ visible: false, query: '', cursor: 0 })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart || 0
    onChange(val)

    // Check if user just typed @ or [
    const textBefore = val.slice(0, pos)
    const match = textBefore.match(/(?:@|\[)([^@\[\s]*)$/)
    if (match) {
      setAutocomplete({
        visible: true,
        query: match[1].toLowerCase(),
        cursor: pos
      })
    } else {
      setAutocomplete({ visible: false, query: '', cursor: 0 })
    }
  }

  const insertPing = (type: 'file' | 'note', id: string, name: string) => {
    const cleanName = name.replace(/[\[\]@:]/g, '').trim()
    const tag = `@[${type}:${id}:${cleanName}] `

    if (autocomplete.visible) {
      const textBefore = value.slice(0, autocomplete.cursor)
      const triggerIdx = Math.max(textBefore.lastIndexOf('@'), textBefore.lastIndexOf('['))
      const after = value.slice(autocomplete.cursor)
      const start = triggerIdx !== -1 ? textBefore.slice(0, triggerIdx) : textBefore
      onChange(`${start}${tag}${after}`)
      setAutocomplete({ visible: false, query: '', cursor: 0 })
    } else {
      const textarea = textareaRef.current
      const pos = textarea ? textarea.selectionStart : value.length
      const before = value.slice(0, pos)
      const after = value.slice(pos)
      onChange(`${before}${tag}${after}`)
    }
    setShowPicker(null)
    setPickerSearch('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // Filtered lists for picker & autocomplete
  const filteredFiles = useMemo(() => {
    const q = (showPicker ? pickerSearch : autocomplete.query).toLowerCase()
    return projectFiles.filter(f => (f.originalName || f.name || '').toLowerCase().includes(q))
  }, [projectFiles, showPicker, pickerSearch, autocomplete.query])

  const filteredNotes = useMemo(() => {
    const q = (showPicker ? pickerSearch : autocomplete.query).toLowerCase()
    return projectNotes.filter(n => (n.title || '').toLowerCase().includes(q))
  }, [projectNotes, showPicker, pickerSearch, autocomplete.query])

  return (
    <div className="relative flex flex-col space-y-1.5">
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={minRows}
          value={value}
          disabled={disabled}
          onChange={handleTextChange}
          placeholder={placeholder || 'Enter comment... Use @ or [ to ping files & notes'}
          className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none focus:border-primary transition-all resize-none shadow-xs text-foreground placeholder:text-muted-foreground/60"
        />

        {/* Floating Autocomplete Dropdown */}
        {autocomplete.visible && (filteredFiles.length > 0 || filteredNotes.length > 0) && (
          <div className="absolute left-2 bottom-full mb-1 w-64 max-h-48 overflow-y-auto bg-card rounded-xl border shadow-xl z-50 p-1 animate-scale-in text-xs">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
              Ping File or Note (Type to filter)
            </div>
            {filteredFiles.length > 0 && (
              <div className="py-1">
                <div className="px-2 py-0.5 text-[9px] font-bold text-primary uppercase">Files</div>
                {filteredFiles.slice(0, 5).map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => insertPing('file', f.id, f.originalName || f.name)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-left transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate flex-1 text-foreground">{f.originalName || f.name}</span>
                  </button>
                ))}
              </div>
            )}
            {filteredNotes.length > 0 && (
              <div className="py-1 border-t">
                <div className="px-2 py-0.5 text-[9px] font-bold text-amber-500 uppercase">Notes</div>
                {filteredNotes.slice(0, 5).map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => insertPing('note', n.id, n.title)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-left transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate flex-1 text-foreground">{n.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Toolbar: Quick Ping Buttons */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || projectFiles.length === 0}
            onClick={() => { setShowPicker(showPicker === 'file' ? null : 'file'); setPickerSearch('') }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer border border-border/50 disabled:opacity-40"
            title="Ping a Project File in this comment"
          >
            <Paperclip className="w-3 h-3 text-primary" />
            <span>Ping File</span>
          </button>
          <button
            type="button"
            disabled={disabled || projectNotes.length === 0}
            onClick={() => { setShowPicker(showPicker === 'note' ? null : 'note'); setPickerSearch('') }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer border border-border/50 disabled:opacity-40"
            title="Ping a Project Note in this comment"
          >
            <FileText className="w-3 h-3 text-amber-500" />
            <span>Ping Note</span>
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
          Tip: type <strong className="text-foreground">@</strong> or <strong className="text-foreground">[</strong> to ping
        </span>
      </div>

      {/* Modal / Popover Picker */}
      {showPicker && (
        <div className="p-3 bg-card border rounded-xl shadow-lg mt-1 space-y-2 animate-scale-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Select {showPicker === 'file' ? 'File' : 'Note'} to Ping:
            </span>
            <button type="button" onClick={() => setShowPicker(null)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={`Search ${showPicker === 'file' ? 'files' : 'notes'}...`}
            className="w-full px-2.5 py-1 text-xs rounded border bg-background outline-none focus:border-primary text-foreground"
          />
          <div className="max-h-40 overflow-y-auto divide-y divide-border">
            {showPicker === 'file' ? (
              filteredFiles.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">No matching files found.</div>
              ) : (
                filteredFiles.map(f => (
                  <div
                    key={f.id}
                    onClick={() => insertPing('file', f.id, f.originalName || f.name)}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs text-foreground font-medium truncate">{f.originalName || f.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Insert</span>
                  </div>
                ))
              )
            ) : (
              filteredNotes.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">No matching notes found.</div>
              ) : (
                filteredNotes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => insertPing('note', n.id, n.title)}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs text-foreground font-medium truncate">{n.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Insert</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component to Render Comment with Interactive Ping Pills ──────────────────────
function RenderComment({
  text,
  onOpenFile,
  onOpenNote
}: {
  text: string
  onOpenFile: (id: string, name: string) => void
  onOpenNote: (id: string, title: string) => void
}) {
  if (!text) return null
  const regex = /@\[(file|note):([^:]+):([^\]]+)\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const type = match[1]
    const id = match[2]
    const label = match[3]

    if (type === 'file') {
      parts.push(
        <button
          key={`${match.index}-${id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenFile(id, label)
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer select-none align-middle not-italic shadow-xs"
          title={`Click to preview or download file "${label}"`}
        >
          <Paperclip className="w-3 h-3 text-primary shrink-0" />
          <span className="truncate max-w-[170px]">{label}</span>
        </button>
      )
    } else {
      parts.push(
        <button
          key={`${match.index}-${id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenNote(id, label)
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer select-none align-middle not-italic shadow-xs"
          title={`Click to view note "${label}"`}
        >
          <FileText className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate max-w-[170px]">{label}</span>
        </button>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return <span>{parts}</span>
}

export function ApprovalsTab({ projectId, isReadOnly }: ApprovalsTabProps) {
  const { deliverables, fetchDeliverables, downloadFile, getFileBuffer, removeFile } = useDeliverableStore()
  const {
    approvals, fetchApprovals, approveDeliverable, rejectDeliverable,
    requestChanges, resubmitDeliverable, updateApprovalComment, loading,
    markPendingDeliverable, requestApproval
  } = useApprovalStore()
  const { currentProject } = useProjectStore()

  // State
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)
  const selectedDeliverable = useMemo(() => {
    return deliverables.find(d => d.id === selectedDeliverableId) || null
  }, [deliverables, selectedDeliverableId])
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes' | 'resubmit' | 'pending' | 'request_approval' | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Project Files & Notes for Pinging
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [projectNotes, setProjectNotes] = useState<any[]>([])

  // Pinned Resources per Deliverable State
  const [pinnedResources, setPinnedResources] = useState<PinnedResource[]>([])
  const [showAddPinnedModal, setShowAddPinnedModal] = useState(false)
  const [pinnedModalTab, setPinnedModalTab] = useState<'file' | 'note'>('file')
  const [pinnedSearch, setPinnedSearch] = useState('')

  // Modals for Note & File Preview
  const [previewingNote, setPreviewingNote] = useState<any | null>(null)
  const [previewingFile, setPreviewingFile] = useState<{ id: string; name: string; mimeType: string; data?: string } | null>(null)

  // Load project files and notes
  useEffect(() => {
    Promise.all([
      window.api.files.getByProject(projectId),
      window.api.notes.getByProject(projectId)
    ]).then(([filesData, notesData]) => {
      setProjectFiles(filesData || [])
      setProjectNotes(notesData || [])
    }).catch(() => {})
  }, [projectId])

  // Load pinned resources from localStorage
  useEffect(() => {
    if (!selectedDeliverableId) {
      setPinnedResources([])
      return
    }
    try {
      const saved = localStorage.getItem(`pwm_approval_pinned_${selectedDeliverableId}`)
      if (saved) {
        setPinnedResources(JSON.parse(saved))
      } else {
        setPinnedResources([])
      }
    } catch {
      setPinnedResources([])
    }
  }, [selectedDeliverableId])

  const savePinnedResources = (newList: PinnedResource[]) => {
    setPinnedResources(newList)
    if (selectedDeliverableId) {
      try {
        localStorage.setItem(`pwm_approval_pinned_${selectedDeliverableId}`, JSON.stringify(newList))
      } catch {}
    }
  }

  const handleAddPinned = (type: 'file' | 'note', refId: string, name: string) => {
    if (pinnedResources.some(r => r.refId === refId)) return
    const updated = [...pinnedResources, { id: `pin_${Date.now()}`, type, refId, name }]
    savePinnedResources(updated)
    setShowAddPinnedModal(false)
    setPinnedSearch('')
  }

  const handleRemovePinned = (id: string) => {
    const updated = pinnedResources.filter(r => r.id !== id)
    savePinnedResources(updated)
  }

  // Open / Preview Handlers
  const handleOpenFile = async (fileId: string, fileName: string) => {
    try {
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
        try {
          const buf = await window.api.files.getBuffer(fileId)
          if (buf && buf.data) {
            setPreviewingFile({ id: fileId, name: fileName, mimeType: buf.mimeType || 'image/png', data: buf.data })
            return
          }
        } catch {}
      }
      await window.api.files.download(fileId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenNote = (noteId: string, noteTitle: string) => {
    const note = projectNotes.find(n => n.id === noteId || n.title.toLowerCase() === noteTitle.toLowerCase())
    if (note) {
      setPreviewingNote(note)
    } else {
      setPreviewingNote({ id: noteId, title: noteTitle, content: 'Note content unavailable or deleted.', createdAt: '' })
    }
  }

  // Feedback comment editing state
  const [editingApprovalId, setEditingApprovalId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const handleUpdateComment = async (id: string) => {
    try {
      await updateApprovalComment(id, editingCommentText)
      setEditingApprovalId(null)
      setEditingCommentText('')
    } catch (err) {
      console.error(err)
    }
  }

  // File Preview State in Approvals
  const [activePreviewIdx, setActivePreviewIdx] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<{ data: string; mimeType: string; name: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

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

  const files = useMemo(() => {
    return selectedDeliverable ? getFileList(selectedDeliverable.fileName, selectedDeliverable.filePath) : []
  }, [selectedDeliverable])

  // Reset preview index when selected deliverable changes
  useEffect(() => {
    if (files.length > 0) {
      setActivePreviewIdx(0)
    } else {
      setActivePreviewIdx(null)
    }
  }, [selectedDeliverableId])

  // Adjust preview index if files change
  useEffect(() => {
    if (files.length === 0) {
      setActivePreviewIdx(null)
    } else if (activePreviewIdx !== null && activePreviewIdx >= files.length) {
      setActivePreviewIdx(files.length - 1)
    }
  }, [files, activePreviewIdx])

  // Load preview when active index or deliverable changes
  useEffect(() => {
    if (selectedDeliverable && activePreviewIdx !== null) {
      loadPreview(selectedDeliverable.id, activePreviewIdx)
    } else {
      setPreviewData(null)
    }
  }, [selectedDeliverableId, activePreviewIdx])

  // Fetch deliverables on mount
  useEffect(() => {
    fetchDeliverables(projectId)
  }, [projectId, fetchDeliverables])

  // Select first deliverable on load if none selected
  useEffect(() => {
    if (deliverables.length > 0 && !selectedDeliverableId) {
      setSelectedDeliverableId(deliverables[0].id)
    }
  }, [deliverables, selectedDeliverableId])

  // Fetch approvals when selected deliverable changes
  useEffect(() => {
    if (selectedDeliverableId) {
      fetchApprovals(selectedDeliverableId)
    }
  }, [selectedDeliverableId, fetchApprovals])

  // Get the latest approval record
  const latestApproval = useMemo(() => {
    if (!approvals || approvals.length === 0) return null
    return approvals[0]
  }, [approvals])

  // Action submission handler
  const handleActionSubmit = async () => {
    if (!selectedDeliverable || !actionType) return
    setIsSubmittingAction(true)

    try {
      if (actionType === 'resubmit') {
        await resubmitDeliverable(selectedDeliverable.id, commentText)
      } else if (actionType === 'request_approval') {
        await requestApproval({
          deliverableId: selectedDeliverable.id,
          clientId: currentProject?.clientId || undefined,
          comment: commentText
        })
      } else if (latestApproval) {
        if (actionType === 'approve') {
          await approveDeliverable(latestApproval.id, commentText)
        } else if (actionType === 'reject') {
          await rejectDeliverable(latestApproval.id, commentText)
        } else if (actionType === 'changes') {
          await requestChanges(latestApproval.id, commentText)
        } else if (actionType === 'pending') {
          await markPendingDeliverable(latestApproval.id, commentText)
        }
      }
      setActionType(null)
      setCommentText('')
      await fetchDeliverables(projectId)
      if (selectedDeliverableId) await fetchApprovals(selectedDeliverableId)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Get status color helper for feedback list
  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      case 'changes_requested':
        return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
      case 'resubmitted':
        return <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
      default:
        return <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
    }
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-bold text-foreground">Client Feedback & Approvals</h2>
        <p className="text-xs text-muted-foreground">Manage approvals, document revisions, and view feedback comments from the client.</p>
      </div>

      {deliverables.length === 0 ? (
        <div className="flex-1 overflow-auto border rounded-xl bg-card">
          <EmptyState
            icon={CheckSquare}
            title="No deliverables to approve"
            description="Create deliverables and send them for approval first."
          />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          {/* Left panel: Deliverables list */}
          <div className="md:col-span-1 border rounded-xl bg-card flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-muted/20 select-none">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deliverables</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {deliverables.map(del => {
                const isSelected = del.id === selectedDeliverableId
                return (
                  <div
                    key={del.id}
                    onClick={() => setSelectedDeliverableId(del.id)}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none",
                      isSelected && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{del.deliverableNumber}</span>
                      <StatusBadge status={del.status} />
                    </div>
                    <span className="text-sm font-semibold text-foreground block truncate">
                      {del.title}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      Version v{del.version}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right panel: Approval log and actions */}
          <div className="md:col-span-2 border rounded-xl bg-card flex flex-col overflow-hidden">
            {selectedDeliverable ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{selectedDeliverable.deliverableNumber}</span>
                      <StatusBadge status={selectedDeliverable.status} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{selectedDeliverable.title}</h3>
                  </div>

                  {/* Actions Bar */}
                  {!isReadOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      {latestApproval ? (
                        <>
                          {latestApproval.status !== 'approved' && (
                            <button
                              onClick={() => { setActionType('approve'); setCommentText('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          {latestApproval.status !== 'changes_requested' && (
                            <button
                              onClick={() => { setActionType('changes'); setCommentText('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Request Changes
                            </button>
                          )}
                          {latestApproval.status !== 'rejected' && (
                            <button
                              onClick={() => { setActionType('reject'); setCommentText('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                          {latestApproval.status !== 'pending' && (
                            <button
                              onClick={() => { setActionType('pending'); setCommentText('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Mark Pending
                            </button>
                          )}
                          {(selectedDeliverable.status === 'rejected' || selectedDeliverable.status === 'changes_requested') && (
                            <button
                              onClick={() => { setActionType('resubmit'); setCommentText('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Resubmit (New Version)
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => { setActionType('request_approval'); setCommentText('') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Request Approval
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Body / History list */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Attached Files List in Approvals */}
                  {(() => {
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

                    if (files.length === 0) return null
                    return (
                      <div className="p-4 bg-muted/20 rounded-xl border border-border flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                          <MessageSquare className="w-4 h-4" />
                          <span>Attached Files for Review ({files.length})</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* File list */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {files.map((file) => {
                              const isActive = file.index === activePreviewIdx
                              return (
                                <div
                                  key={file.index}
                                  onClick={() => setActivePreviewIdx(file.index)}
                                  className={cn(
                                    "flex items-center justify-between gap-3 px-3 py-2 bg-card rounded-lg border transition-all cursor-pointer group/file select-none",
                                    isActive
                                      ? "border-primary/50 bg-primary/5 text-primary shadow-sm"
                                      : "border-border hover:bg-muted/40 text-foreground"
                                  )}
                                >
                                  <span className="flex items-center gap-2 min-w-0 flex-1" title={file.name}>
                                    {getFileIcon(file.name)}
                                    <span className="text-xs font-semibold truncate">{file.name}</span>
                                  </span>
                                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadFile(selectedDeliverable.id, file.index);
                                      }}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                                      title={`Download ${file.name}`}
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    {!isReadOnly && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await removeFile(selectedDeliverable.id, file.index);
                                        }}
                                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer"
                                        title={`Remove ${file.name}`}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Preview Panel */}
                          <div className="border border-border rounded-lg bg-card flex flex-col justify-center items-center p-3 overflow-hidden min-h-[180px] max-h-60 relative">
                            {activePreviewIdx === null ? (
                              <span className="text-xs text-muted-foreground">Select a file to preview</span>
                            ) : loadingPreview ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                                <span>Loading preview...</span>
                              </div>
                            ) : previewData ? (
                              <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
                                {previewData.mimeType.startsWith('image/') ? (
                                  <img
                                    src={`data:${previewData.mimeType};base64,${previewData.data}`}
                                    alt={previewData.name}
                                    className="max-w-full max-h-full object-contain rounded border bg-white shadow-sm"
                                  />
                                ) : previewData.mimeType === 'application/pdf' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                    <FileText className="w-8 h-8 text-red-500 mb-2" />
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{previewData.name}</span>
                                    <span className="text-[10px] text-muted-foreground mb-3">PDF Document</span>
                                    <button
                                      onClick={() => {
                                        downloadFile(selectedDeliverable.id, activePreviewIdx);
                                      }}
                                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/95 cursor-pointer shadow-sm"
                                    >
                                      Download to Read
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center p-3">
                                    <div className="mx-auto w-8 h-8 rounded bg-muted flex items-center justify-center mb-1.5">
                                      {getFileIcon(previewData.name)}
                                    </div>
                                    <span className="text-xs font-semibold text-foreground block truncate max-w-[150px]">{previewData.name}</span>
                                    <span className="text-[10px] text-muted-foreground block mb-2">{previewData.mimeType.split('/').pop()} file</span>
                                    <button
                                      onClick={() => downloadFile(selectedDeliverable.id, activePreviewIdx)}
                                      className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded hover:bg-primary/95 cursor-pointer"
                                    >
                                      Download
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-destructive">Preview failed to load</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* ─── Pinned / Linked Resources (Files & Notes) Section ──────── */}
                  <div className="p-4 bg-muted/15 rounded-xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                        <Pin className="w-3.5 h-3.5 text-primary rotate-45" />
                        <span>Pinged / Linked Resources ({pinnedResources.length})</span>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setShowAddPinnedModal(true)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Pin File or Note
                        </button>
                      )}
                    </div>

                    {pinnedResources.length === 0 ? (
                      <div className="text-xs text-muted-foreground/70 py-2 italic flex items-center justify-between">
                        <span>No project files or notes linked to this approval yet.</span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => setShowAddPinnedModal(true)}
                            className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            + Add Link
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {pinnedResources.map(res => (
                          <div
                            key={res.id}
                            onClick={() => {
                              if (res.type === 'file') handleOpenFile(res.refId, res.name)
                              else handleOpenNote(res.refId, res.name)
                            }}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg border bg-card hover:shadow-xs transition-all cursor-pointer group select-none",
                              res.type === 'file' ? "border-primary/20 hover:border-primary/50" : "border-amber-500/20 hover:border-amber-500/50"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {res.type === 'file' ? (
                                <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-foreground truncate" title={res.name}>
                                {res.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <span className="text-[10px] text-muted-foreground opacity-60 group-hover:opacity-100">
                                {res.type === 'file' ? 'View/DL' : 'Read'}
                              </span>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemovePinned(res.id)
                                  }}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Unpin"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ─── Approval Audit Log ──────────────────────────────────── */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Approval Audit Log
                    </h4>

                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : approvals.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-xl">
                        No approvals requested yet. Send this deliverable for approval from the Deliverables tab.
                      </div>
                    ) : (
                      <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                        {approvals.map((appr) => (
                          <div key={appr.id} className="relative">
                            {/* Point Icon */}
                            <div className="absolute -left-[33px] top-0.5 w-6 h-6 rounded-full bg-card border flex items-center justify-center shadow-sm">
                              {getApprovalStatusIcon(appr.status)}
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 select-none">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {appr.status === 'pending'
                                      ? 'Approval Requested'
                                      : appr.status === 'approved'
                                        ? 'Approved by Client'
                                        : appr.status === 'changes_requested'
                                          ? 'Changes Requested'
                                          : 'Rejected by Client'}
                                  </span>
                                  <StatusBadge status={appr.status} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground">{formatDateTime(appr.createdAt)}</span>
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => {
                                        setEditingApprovalId(appr.id)
                                        setEditingCommentText(appr.comment || '')
                                      }}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors cursor-pointer"
                                      title="Edit comment"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {appr.client && (
                                <p className="text-xs text-muted-foreground font-semibold">
                                  Client Reviewer: {appr.client.name} {appr.client.company && `(${appr.client.company})`}
                                </p>
                              )}

                              {editingApprovalId === appr.id ? (
                                <div className="mt-2 space-y-2 select-text">
                                  <CommentInputWithPings
                                    value={editingCommentText}
                                    onChange={setEditingCommentText}
                                    placeholder="Enter feedback comment... Use @ or [ to ping files & notes"
                                    projectFiles={projectFiles}
                                    projectNotes={projectNotes}
                                    minRows={3}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setEditingApprovalId(null)}
                                      className="px-2.5 py-1 text-[10px] font-medium rounded border hover:bg-muted transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleUpdateComment(appr.id)}
                                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-primary rounded hover:bg-primary/95 transition-colors cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                appr.comment ? (
                                  <div className="p-3 bg-muted/40 rounded-lg border text-xs text-foreground italic flex gap-1.5 items-start">
                                    <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                      <RenderComment
                                        text={appr.comment}
                                        onOpenFile={handleOpenFile}
                                        onOpenNote={handleOpenNote}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  !isReadOnly && (
                                    <button
                                      onClick={() => {
                                        setEditingApprovalId(appr.id)
                                        setEditingCommentText('')
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-transparent border-none cursor-pointer mt-1.5"
                                    >
                                      <Plus className="w-3 h-3" /> Add Feedback Comment (Ping Files & Notes)
                                    </button>
                                  )
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Select a deliverable from the list to view approval feedback history.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add Pinned Resource Modal ────────────────────────────────────────── */}
      {showAddPinnedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddPinnedModal(false)} />
          <div className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl p-5 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-sm font-bold text-foreground">Pin / Link File or Note to Review</h3>
              <button onClick={() => setShowAddPinnedModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 my-3 border-b pb-2">
              <button
                type="button"
                onClick={() => { setPinnedModalTab('file'); setPinnedSearch('') }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                  pinnedModalTab === 'file' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Paperclip className="w-3.5 h-3.5" /> Files ({projectFiles.length})
              </button>
              <button
                type="button"
                onClick={() => { setPinnedModalTab('note'); setPinnedSearch('') }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
                  pinnedModalTab === 'note' ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <FileText className="w-3.5 h-3.5" /> Notes ({projectNotes.length})
              </button>
            </div>

            <input
              type="text"
              autoFocus
              value={pinnedSearch}
              onChange={(e) => setPinnedSearch(e.target.value)}
              placeholder={`Search ${pinnedModalTab === 'file' ? 'files' : 'notes'}...`}
              className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none focus:border-primary text-foreground mb-3"
            />

            <div className="max-h-60 overflow-y-auto space-y-1">
              {pinnedModalTab === 'file' ? (
                projectFiles.filter(f => (f.originalName || f.name || '').toLowerCase().includes(pinnedSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No files found in this workspace.</div>
                ) : (
                  projectFiles
                    .filter(f => (f.originalName || f.name || '').toLowerCase().includes(pinnedSearch.toLowerCase()))
                    .map(f => {
                      const isPinned = pinnedResources.some(r => r.refId === f.id)
                      return (
                        <div
                          key={f.id}
                          onClick={() => !isPinned && handleAddPinned('file', f.id, f.originalName || f.name)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors select-none",
                            isPinned ? "opacity-50 bg-muted/20 cursor-default" : "hover:bg-muted/60 cursor-pointer text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium">{f.originalName || f.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {isPinned ? 'Already Pinned' : '+ Pin'}
                          </span>
                        </div>
                      )
                    })
                )
              ) : (
                projectNotes.filter(n => (n.title || '').toLowerCase().includes(pinnedSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No notes found in this workspace.</div>
                ) : (
                  projectNotes
                    .filter(n => (n.title || '').toLowerCase().includes(pinnedSearch.toLowerCase()))
                    .map(n => {
                      const isPinned = pinnedResources.some(r => r.refId === n.id)
                      return (
                        <div
                          key={n.id}
                          onClick={() => !isPinned && handleAddPinned('note', n.id, n.title)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors select-none",
                            isPinned ? "opacity-50 bg-muted/20 cursor-default" : "hover:bg-muted/60 cursor-pointer text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate font-medium">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {isPinned ? 'Already Pinned' : '+ Pin'}
                          </span>
                        </div>
                      )
                    })
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Note Modal ─────────────────────────────────────────────────── */}
      {previewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewingNote(null)} />
          <div className="relative w-full max-w-xl bg-card rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
            <div className="p-5 border-b bg-muted/20 flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{previewingNote.title}</h3>
                  {previewingNote.createdAt && (
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(previewingNote.createdAt)}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setPreviewingNote(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm text-foreground space-y-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewingNote.content || '<em>(Empty note content)</em>' }}
              />
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('workspace:target-note-id', previewingNote.id)
                  window.dispatchEvent(new CustomEvent('workspace:switch-tab', { detail: { tabId: 'notes' } }))
                  setPreviewingNote(null)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Notes Tab
              </button>
              <button
                type="button"
                onClick={() => setPreviewingNote(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Image File Modal ────────────────────────────────────────── */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewingFile(null)} />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">{previewingFile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.api.files.download(previewingFile.id)}
                  className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => setPreviewingFile(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 flex items-center justify-center overflow-auto bg-muted/10 min-h-[300px]">
              {previewingFile.data ? (
                <img
                  src={`data:${previewingFile.mimeType};base64,${previewingFile.data}`}
                  alt={previewingFile.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border bg-white shadow-sm"
                />
              ) : (
                <div className="text-center text-xs text-muted-foreground">Preview not available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Dialog Modal (Approve / Reject / Changes / Resubmit / Pending / Request Approval) ─── */}
      {actionType && selectedDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActionType(null)} />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl border shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {actionType === 'approve'
                    ? 'Approve Deliverable'
                    : actionType === 'reject'
                      ? 'Reject Deliverable'
                      : actionType === 'changes'
                        ? 'Request Changes'
                        : actionType === 'pending'
                          ? 'Mark as Pending'
                          : actionType === 'request_approval'
                            ? 'Request Approval'
                            : 'Resubmit Deliverable'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {actionType === 'resubmit'
                    ? `This will create version v${selectedDeliverable.version + 1} of "${selectedDeliverable.title}".`
                    : actionType === 'request_approval'
                      ? `Request client sign-off for version v${selectedDeliverable.version} of "${selectedDeliverable.title}".`
                      : `Provide feedback on version v${selectedDeliverable.version} of "${selectedDeliverable.title}".`}
                </p>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Feedback Comment / Message {actionType === 'changes' && <span className="text-destructive">*</span>}
                </label>
                <CommentInputWithPings
                  value={commentText}
                  onChange={setCommentText}
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g. Deliverable looks great and approved!'
                      : actionType === 'changes'
                        ? 'e.g. Please check the pinged file and note revisions...'
                        : actionType === 'reject'
                          ? 'e.g. This layout does not meet the guidelines. Need total rework...'
                          : actionType === 'pending'
                            ? 'e.g. Resetting status back to pending for review...'
                            : actionType === 'request_approval'
                              ? 'e.g. Please review the design changes for this deliverable...'
                              : 'e.g. New revisions implemented to address feedback...'
                  }
                  projectFiles={projectFiles}
                  projectNotes={projectNotes}
                  minRows={4}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction || (actionType === 'changes' && !commentText.trim())}
                  onClick={handleActionSubmit}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    actionType === 'approve'
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : actionType === 'changes'
                        ? "bg-orange-600 hover:bg-orange-700"
                        : actionType === 'reject'
                          ? "bg-red-600 hover:bg-red-700"
                          : actionType === 'pending'
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-primary text-primary-foreground hover:bg-primary/95"
                  )}
                >
                  {isSubmittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {actionType === 'request_approval' ? 'Request Approval' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
