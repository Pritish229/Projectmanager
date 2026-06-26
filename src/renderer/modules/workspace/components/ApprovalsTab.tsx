import { useEffect, useState, useMemo } from 'react'
import { useDeliverableStore, type Deliverable } from '@/stores/useDeliverableStore'
import { useApprovalStore } from '@/stores/useApprovalStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { StatusBadge, ConfirmDialog, EmptyState } from '@/components/shared'
import { cn, formatDateTime, getFileList } from '@/lib/utils'
import {
  CheckSquare, X, RefreshCw, Send, AlertTriangle, CheckCircle2,
  XCircle, MessageSquare, Clock, ArrowRight, CornerDownRight, History,
  Download, FileText, FileSpreadsheet, Image, File, Pencil, Plus
} from 'lucide-react'

interface ApprovalsTabProps {
  projectId: string
  isReadOnly: boolean
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

  // Adjust preview index if files change (e.g. when a file is removed)
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



  // Get the latest approval record (if any)
  const latestApproval = useMemo(() => {
    if (!approvals || approvals.length === 0) return null
    return approvals[0]
  }, [approvals])

  // Check if there is a pending approval for the selected deliverable
  const activePendingApproval = useMemo(() => {
    if (!approvals || approvals.length === 0) return null
    const latest = approvals[0]
    return latest.status === 'pending' ? latest : null
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
      // Reset state and reload
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
                        {approvals.map((appr, idx) => (
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
                                  <textarea
                                    rows={2}
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary transition-all resize-none animate-fade-in"
                                    placeholder="Enter feedback comment..."
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
                                    <span>"{appr.comment}"</span>
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
                                      <Plus className="w-3 h-3" /> Add Feedback Comment
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

      {/* Action Dialog Modal (Approve / Reject / Changes / Resubmit / Pending / Request Approval) */}
      {actionType && selectedDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActionType(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in">
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
                  Comment / Message {actionType === 'changes' && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g. Deliverable looks great and approved!'
                      : actionType === 'changes'
                        ? 'e.g. Please increase the font size and make the header logo wider...'
                        : actionType === 'reject'
                          ? 'e.g. This layout does not meet the guidelines. Need total rework...'
                          : actionType === 'pending'
                            ? 'e.g. Resetting status back to pending for review...'
                            : actionType === 'request_approval'
                              ? 'e.g. Please review the design changes for this deliverable...'
                              : 'e.g. New design revisions implemented to address feedback...'
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all resize-none"
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
