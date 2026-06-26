import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/useProjectStore'
import { useClientStore } from '@/stores/useClientStore'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, StatusBadge, PriorityBadge, PageLoader, ConfirmDialog, DatePicker } from '@/components/shared'
import { cn, formatDate, generateProjectCode } from '@/lib/utils'
import { PROJECT_STATUSES, PROJECT_PRIORITIES } from '@/lib/constants'
import { projectSchema, type ProjectFormData } from '@/lib/validators'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Fuse from 'fuse.js'
import {
  Plus,
  Search,
  FolderKanban,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Lock,
  Unlock,
  X,
  Calendar,
  Building2,
  Filter
} from 'lucide-react'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, loading, filters, setFilters, fetchProjects, createProject, deleteProject, archiveProject, unarchiveProject, closeProject, reopenProject } = useProjectStore()
  const { clients: allClients, fetchClients } = useClientStore()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  
  // Searchable client dropdown state
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [fetchProjects, fetchClients])

  // Fuse.js search
  const fuse = useMemo(() => new Fuse(projects, {
    keys: ['name', 'code', 'description', 'client.name', 'client.company', 'tags'],
    threshold: 0.3
  }), [projects])

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects
    return fuse.search(searchTerm).map(r => r.item)
  }, [fuse, searchTerm, projects])

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { priority: 'medium', status: 'draft', code: generateProjectCode() }
  })

  const onSubmit = async (data: ProjectFormData) => {
    const submitData = {
      ...data,
      clientId: selectedClientId || null
    }

    if (editingProject) {
      await useProjectStore.getState().updateProject(editingProject, submitData)
      setEditingProject(null)
    } else {
      await createProject(submitData)
    }
    setShowCreateForm(false)
    reset({ priority: 'medium', status: 'draft', code: generateProjectCode() })
    setSelectedClientId('')
    setClientSearchQuery('')
  }

  const startEdit = (project: (typeof projects)[0]) => {
    setEditingProject(project.id)
    setValue('name', project.name)
    setValue('code', project.code)
    setValue('description', project.description || '')
    setValue('priority', project.priority as ProjectFormData['priority'])
    setValue('status', project.status as ProjectFormData['status'])
    setValue('tags', project.tags || '')
    setValue('startDate', project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '')
    setValue('deadline', project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '')
    setSelectedClientId(project.clientId || '')
    setClientSearchQuery(project.client?.name || '')
    setShowCreateForm(true)
    setOpenMenu(null)
  }

  if (loading && projects.length === 0) return <PageLoader />

  return (
    <div className="p-6 h-full overflow-auto">
      <Breadcrumbs items={[{ label: 'Projects' }]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { reset({ priority: 'medium', status: 'draft', code: generateProjectCode() }); setEditingProject(null); setSelectedClientId(''); setClientSearchQuery(''); setShowCreateForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        <button
          onClick={() => setFilters({ ...filters, archived: false })}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition-all whitespace-nowrap',
            !filters.archived
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
          )}
        >
          <FolderKanban className="w-4 h-4" />
          Active Projects
        </button>
        <button
          onClick={() => setFilters({ ...filters, archived: true })}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition-all whitespace-nowrap',
            filters.archived
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
          )}
        >
          <Archive className="w-4 h-4" />
          Archived Projects
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center flex-1 gap-2 px-3 py-2 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
            showFilters ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl bg-muted/50 animate-fade-in">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="px-3 py-1.5 rounded-lg border bg-card text-sm outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {PROJECT_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
            className="px-3 py-1.5 rounded-lg border bg-card text-sm outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            {PROJECT_PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filters.clientId || ''}
            onChange={(e) => setFilters({ ...filters, clientId: e.target.value || undefined })}
            className="px-3 py-1.5 rounded-lg border bg-card text-sm outline-none cursor-pointer"
          >
            <option value="">All Clients</option>
            {allClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Date range filters */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground border bg-card px-3 py-1.5 rounded-lg">
            <span className="text-xs">Deadline:</span>
            <input
              type="date"
              value={filters.startDateRange || ''}
              onChange={(e) => setFilters({ ...filters, startDateRange: e.target.value || undefined })}
              className="bg-transparent outline-none text-foreground text-xs select-none cursor-pointer"
            />
            <span className="text-xs">to</span>
            <input
              type="date"
              value={filters.endDateRange || ''}
              onChange={(e) => setFilters({ ...filters, endDateRange: e.target.value || undefined })}
              className="bg-transparent outline-none text-foreground text-xs select-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => { setFilters({ archived: false }); setSearchTerm('') }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to get started with workspace management."
          action={
            <button
              onClick={() => { reset({ priority: 'medium', status: 'draft', code: generateProjectCode() }); setSelectedClientId(''); setClientSearchQuery(''); setShowCreateForm(true) }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create Project
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project, i) => (
            <div
              key={project.id}
              className="group relative rounded-xl border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
                    <PriorityBadge priority={project.priority} />
                  </div>
                  <h3 className="font-semibold truncate">{project.name}</h3>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id) }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {openMenu === project.id && (
                    <div className="absolute right-0 top-8 w-44 bg-card rounded-lg border shadow-xl z-10 py-1 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(project)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      {project.status !== 'closed' ? (
                        <button onClick={() => { closeProject(project.id); setOpenMenu(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <Lock className="w-3.5 h-3.5" /> Close
                        </button>
                      ) : (
                        <button onClick={() => { reopenProject(project.id); setOpenMenu(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <Unlock className="w-3.5 h-3.5" /> Reopen
                        </button>
                      )}
                      {project.archived ? (
                        <button onClick={() => { unarchiveProject(project.id); setOpenMenu(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                        </button>
                      ) : (
                        <button onClick={() => { archiveProject(project.id); setOpenMenu(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}
                      <hr className="my-1 border-border" />
                      <button onClick={() => { setDeleteConfirm(project.id); setOpenMenu(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
              )}

              <div className="flex items-center justify-between">
                <StatusBadge status={project.status} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {project.client && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{project.client.name}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase",
                        project.client.status === 'active'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {project.client.status}
                      </span>
                    </span>
                  )}
                  {project.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(project.deadline)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCreateForm(false); setEditingProject(null) }} />
          <div className="relative w-full max-w-2xl mx-4 max-h-[85vh] overflow-auto bg-card rounded-xl border shadow-2xl animate-scale-in">
            <div className="sticky top-0 flex items-center justify-between p-6 pb-4 bg-card border-b z-10">
              <h2 className="text-lg font-semibold">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => { setShowCreateForm(false); setEditingProject(null) }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Name *</label>
                  <input {...register('name')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="My Project" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Code *</label>
                  <input {...register('code')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono" />
                  {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea {...register('description')} rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder="Project description..." />
              </div>

              <hr className="border-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">Client Information</h3>

              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Select Client / Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value)
                      setSelectedClientId('') // Reset if they clear or change search
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-8"
                    placeholder="Search and select client..."
                  />
                  {clientSearchQuery && (
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

                {showClientDropdown && (
                  <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-card border rounded-lg shadow-xl z-50 divide-y divide-border animate-scale-in" onMouseLeave={() => setShowClientDropdown(false)}>
                    {(() => {
                      const matches = allClients.filter(c => {
                        const matchesSearch = c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                          c.company.toLowerCase().includes(clientSearchQuery.toLowerCase())
                        const isSelected = c.id === selectedClientId
                        const isActive = c.status === 'active'
                        return matchesSearch && (isActive || isSelected)
                      })

                      if (matches.length === 0) {
                        return (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            No active clients found. You can register them in the <span className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => { setShowCreateForm(false); navigate('/clients') }}>Clients</span> section.
                          </div>
                        )
                      }

                      return matches.map(c => {
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
                              "px-3 py-2 text-xs cursor-pointer hover:bg-muted transition-colors flex items-center justify-between",
                              isSelected && "bg-primary/5 text-primary font-medium"
                            )}
                          >
                            <div>
                              <div>{c.name}</div>
                              {c.company && <div className="text-[10px] text-muted-foreground">{c.company}</div>}
                            </div>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                              c.status === 'active' ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-600"
                            )}>
                              {c.status}
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>

              <hr className="border-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">Project Details</h3>

              <div className="grid grid-cols-2 gap-4">
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
                        position="top"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Priority</label>
                  <select {...register('priority')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {PROJECT_PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {PROJECT_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Tags</label>
                <input {...register('tags')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="design, web, branding (comma-separated)" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowCreateForm(false); setEditingProject(null) }} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  {editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteProject(deleteConfirm) }}
        title="Delete Project"
        description="This will permanently delete this project and all its data including todos, deliverables, files, and notes. This action cannot be undone."
        confirmLabel="Delete Project"
        variant="danger"
      />
    </div>
  )
}
