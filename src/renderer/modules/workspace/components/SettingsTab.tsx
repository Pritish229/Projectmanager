import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, type ProjectFormData } from '@/lib/validators'
import { useProjectStore } from '@/stores/useProjectStore'
import { useClientStore } from '@/stores/useClientStore'
import { PROJECT_STATUSES, PROJECT_PRIORITIES } from '@/lib/constants'
import { DatePicker, ConfirmDialog } from '@/components/shared'
import { cn } from '@/lib/utils'
import {
  Save,
  Trash2,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  X,
  AlertTriangle
} from 'lucide-react'

interface SettingsTabProps {
  project: {
    id: string
    name: string
    code: string
    description: string
    clientId: string | null
    startDate: string | null
    deadline: string | null
    priority: string
    status: string
    tags: string
    archived: boolean
    client?: {
      id: string
      name: string
      company: string
      email: string
      phone: string
    } | null
  }
}

export function SettingsTab({ project }: SettingsTabProps) {
  const navigate = useNavigate()
  const { updateProject, deleteProject, archiveProject, unarchiveProject, closeProject, reopenProject } = useProjectStore()
  const { clients: allClients, fetchClients } = useClientStore()

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Searchable client dropdown state
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const isReadOnly = project.status === 'closed'

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty }
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      code: project.code,
      description: project.description || '',
      priority: project.priority as ProjectFormData['priority'],
      status: project.status as ProjectFormData['status'],
      tags: project.tags || '',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
    }
  })

  // Load clients on mount
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Sync form values when the project updates
  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        code: project.code,
        description: project.description || '',
        priority: project.priority as ProjectFormData['priority'],
        status: project.status as ProjectFormData['status'],
        tags: project.tags || '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
      })
      setSelectedClientId(project.clientId || '')
      setClientSearchQuery(project.client?.name || '')
    }
  }, [project, reset])

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const submitData = {
        ...data,
        clientId: selectedClientId || null
      }
      await updateProject(project.id, submitData)
      setSuccessMessage('Project settings saved successfully.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to save changes.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseProject = async () => {
    try {
      await closeProject(project.id)
      setSuccessMessage('Project has been closed.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to close project.')
    }
  }

  const handleReopenProject = async () => {
    try {
      await reopenProject(project.id)
      setSuccessMessage('Project has been reopened.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to reopen project.')
    }
  }

  const handleArchiveProject = async () => {
    try {
      await archiveProject(project.id)
      setSuccessMessage('Project has been archived.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to archive project.')
    }
  }

  const handleRestoreProject = async () => {
    try {
      await unarchiveProject(project.id)
      setSuccessMessage('Project has been restored.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to restore project.')
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteProject(project.id)
      navigate('/projects')
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to delete project.')
      setDeleteConfirmOpen(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Alert Banners */}
      {isReadOnly && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Project is Closed (Read-Only)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              This project is currently closed. Form modifications are locked. You can reopen the project from the Actions panel on the right.
            </p>
          </div>
        </div>
      )}

      {project.archived && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Project is Archived</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              This project is archived. It is hidden from active project views but all data is saved. You can restore it to the active list from the Actions panel on the right.
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-scale-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">Project Information</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Name *</label>
                  <input
                    {...register('name')}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="My Project"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Code *</label>
                  <input
                    {...register('code')}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  {...register('description')}
                  disabled={isReadOnly}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Project description..."
                />
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Client / Customer</label>
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value)
                        setSelectedClientId('')
                        setShowClientDropdown(true)
                      }}
                      onFocus={() => !isReadOnly && setShowClientDropdown(true)}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-8 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Search and select client..."
                    />
                    {clientSearchQuery && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchQuery('')
                          setSelectedClientId('')
                        }}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {showClientDropdown && !isReadOnly && (
                    <div
                      className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-card border rounded-lg shadow-xl z-50 divide-y divide-border animate-scale-in"
                      onMouseLeave={() => setShowClientDropdown(false)}
                    >
                      {(() => {
                        const matches = allClients.filter((c) => {
                          const matchesSearch =
                            c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                            c.company.toLowerCase().includes(clientSearchQuery.toLowerCase())
                          const isSelected = c.id === selectedClientId
                          const isActive = c.status === 'active'
                          return matchesSearch && (isActive || isSelected)
                        })

                        if (matches.length === 0) {
                          return (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              No active clients found.
                            </div>
                          )
                        }

                        return matches.map((c) => {
                          const isSelected = c.id === selectedClientId
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedClientId(c.id)
                                setClientSearchQuery(c.name)
                                setShowClientDropdown(false)
                              }}
                              className={cn(
                                'px-3 py-2 text-xs cursor-pointer hover:bg-muted transition-colors flex items-center justify-between',
                                isSelected && 'bg-primary/5 text-primary font-medium'
                              )}
                            >
                              <div>
                                <div>{c.name}</div>
                                {c.company && <div className="text-[10px] text-muted-foreground">{c.company}</div>}
                              </div>
                              <span
                                className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold',
                                  c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/10 text-zinc-600'
                                )}
                              >
                                {c.status}
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Date</label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick start date"
                        disabled={isReadOnly}
                        position="top"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Deadline</label>
                  <Controller
                    control={control}
                    name="deadline"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick deadline"
                        disabled={isReadOnly}
                        position="top"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Priority</label>
                  <select
                    {...register('priority')}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {PROJECT_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select
                    {...register('status')}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Tags</label>
                <input
                  {...register('tags')}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="design, web, branding (comma-separated)"
                />
              </div>

              {!isReadOnly && (
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!isDirty && selectedClientId === project.clientId)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm',
                      (isSubmitting || (!isDirty && selectedClientId === project.clientId)) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Actions / Lifecycle & Danger Zone */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">Project Actions</h3>
            <div className="space-y-4">
              {/* Close/Reopen Project */}
              <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm">
                    {isReadOnly ? 'Reopen Project' : 'Close Project'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isReadOnly
                      ? 'Reopening will reactivate the project workspace, making it writable.'
                      : 'Closing sets status to Closed and locks changes on workspace tabs.'}
                  </p>
                </div>
                <button
                  onClick={isReadOnly ? handleReopenProject : handleCloseProject}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-sm',
                    isReadOnly
                      ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                      : 'bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500/10 dark:text-amber-400'
                  )}
                >
                  {isReadOnly ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {isReadOnly ? 'Reopen Project' : 'Close Project'}
                </button>
              </div>

              {/* Archive/Restore Project */}
              <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm">
                    {project.archived ? 'Restore Project' : 'Archive Project'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.archived
                      ? 'Restoring will place it back in the list of active projects.'
                      : 'Archiving hides the project from the active dashboard.'}
                  </p>
                </div>
                <button
                  onClick={project.archived ? handleRestoreProject : handleArchiveProject}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/5 text-indigo-600 border border-indigo-500/20 rounded-lg text-xs font-semibold hover:bg-indigo-500/10 dark:text-indigo-400 transition-all cursor-pointer shadow-sm"
                >
                  {project.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  {project.archived ? 'Restore Project' : 'Archive Project'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
            <h3 className="text-base font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Once you delete a project, there is no going back. All related tasks, deliverables, client feedback approvals, files, and logs will be permanently removed.
            </p>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-semibold hover:bg-destructive/90 transition-all cursor-pointer shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        description="Are you absolutely sure you want to delete this project? This will permanently remove all associated tasks, deliverables, approvals, files, notes, and activity history. This action is irreversible."
        confirmLabel="Yes, Delete Project"
        variant="danger"
      />
    </div>
  )
}
