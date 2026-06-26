import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTodoStore } from '@/stores/useTodoStore'
import { todoSchema, type TodoFormData } from '@/lib/validators'
import { TODO_STATUSES, PROJECT_PRIORITIES } from '@/lib/constants'
import { ConfirmDialog, StatusBadge, PriorityBadge, EmptyState, DatePicker } from '@/components/shared'
import { toast } from '@/stores/useToastStore'
import { cn, formatDate } from '@/lib/utils'
import {
  Plus, Search, Filter, Trash2, Pencil, Copy, GripVertical, MoreVertical,
  Calendar, X, CheckSquare, Square, RefreshCw, AlertCircle
} from 'lucide-react'

interface TodosTabProps {
  projectId: string
  isReadOnly: boolean
}

export function TodosTab({ projectId, isReadOnly }: TodosTabProps) {
  const {
    todos, loading, error, fetchTodos, createTodo, updateTodo,
    deleteTodo, completeTodo, bulkComplete, duplicateTodo, reorderTodos
  } = useTodoStore()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Fetch todos on mount / projectId change
  useEffect(() => {
    fetchTodos(projectId)
  }, [projectId, fetchTodos])

  // Filters active check (reordering disabled if filters are active)
  const isFilterActive = useMemo(() => {
    return searchTerm.trim() !== '' || statusFilter !== '' || priorityFilter !== ''
  }, [searchTerm, statusFilter, priorityFilter])

  // Filtered & searched todos
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      const matchesSearch =
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (todo.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === '' || todo.status === statusFilter
      const matchesPriority = priorityFilter === '' || todo.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [todos, searchTerm, statusFilter, priorityFilter])

  // Form setup
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: { priority: 'medium', status: 'pending' }
  })

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTodoId(null)
    reset({
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      startDate: '',
      dueDate: ''
    })
    setShowCreateModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (todo: typeof todos[0]) => {
    setEditingTodoId(todo.id)
    setValue('title', todo.title)
    setValue('description', todo.description || '')
    setValue('priority', todo.priority as any)
    setValue('status', todo.status as any)
    setValue('startDate', todo.startDate ? new Date(todo.startDate).toISOString().split('T')[0] : '')
    setValue('dueDate', todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '')
    setShowCreateModal(true)
    setOpenMenuId(null)
  }

  // Handle Form Submit
  const onSubmit = async (data: TodoFormData) => {
    const formattedData = {
      ...data,
      projectId,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null
    }

    try {
      if (editingTodoId) {
        await updateTodo(editingTodoId, formattedData)
        toast.success('Task updated successfully.')
      } else {
        await createTodo(formattedData)
        toast.success('Task created successfully.')
      }
      setShowCreateModal(false)
      reset()
    } catch {
      toast.error('Failed to save task.')
    }
  }

  // Handle Toggle Complete Checkbox
  const handleToggleComplete = async (todo: typeof todos[0]) => {
    if (isReadOnly) return
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    try {
      await updateTodo(todo.id, { status: newStatus })
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task marked as pending.')
    } catch {
      toast.error('Failed to update task status.')
    }
  }

  // Handle Duplicate
  const handleDuplicate = async (id: string) => {
    if (isReadOnly) return
    try {
      await duplicateTodo(id)
      setOpenMenuId(null)
      toast.success('Task duplicated.')
    } catch {
      toast.error('Failed to duplicate task.')
    }
  }

  // Handle Delete Confirm
  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteTodo(deleteConfirmId)
        setDeleteConfirmId(null)
        toast.success('Task deleted successfully.')
      } catch {
        toast.error('Failed to delete task.')
      }
    }
  }

  // Selection Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTodoIds(filteredTodos.map(t => t.id))
    } else {
      setSelectedTodoIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTodoIds(prev => [...prev, id])
    } else {
      setSelectedTodoIds(prev => prev.filter(item => item !== id))
    }
  }

  const handleBulkComplete = async () => {
    if (isReadOnly || selectedTodoIds.length === 0) return
    try {
      await bulkComplete(selectedTodoIds)
      toast.success(`${selectedTodoIds.length} tasks completed.`)
      setSelectedTodoIds([])
    } catch {
      toast.error('Failed to complete tasks.')
    }
  }

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    if (isReadOnly || isFilterActive) return
    setDraggedIndex(index)
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setIsDragging(false)
    if (draggedIndex === null || draggedIndex === targetIndex || isReadOnly || isFilterActive) return

    const reordered = [...filteredTodos]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)
    setDraggedIndex(null)

    // Save orders to db
    const items = reordered.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1
    }))

    await reorderTodos(items)
    // Local refresh to apply sort order in store
    await fetchTodos(projectId)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedIndex(null)
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4 shrink-0">
        <div className="flex flex-1 flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-card text-xs outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {TODO_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-card text-xs outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              {PROJECT_PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {isFilterActive && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter(''); setPriorityFilter('') }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Reordering warning message if filters active */}
      {isFilterActive && todos.length > 1 && (
        <div className="mb-3 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Manual task drag-and-drop reordering is disabled while search filters are active.</span>
        </div>
      )}

      {/* Bulk actions banner */}
      {selectedTodoIds.length > 0 && !isReadOnly && (
        <div className="mb-4 shrink-0 flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-xl animate-slide-in">
          <span className="text-sm font-medium text-primary">
            {selectedTodoIds.length} task{selectedTodoIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
            >
              Mark Completed
            </button>
            <button
              onClick={() => setSelectedTodoIds([])}
              className="px-3 py-1.5 border border-primary/20 text-xs font-medium rounded-lg hover:bg-primary/5 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Todos Content */}
      <div className="flex-1 overflow-auto border rounded-xl bg-card">
        {loading && todos.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={isFilterActive ? "No matching tasks" : "No tasks in this project"}
            description={isFilterActive ? "Try clearing your filters or search terms." : "Add task items to coordinate deliverables."}
            action={!isReadOnly && !isFilterActive ? (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Task
              </button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y">
            {/* List Header */}
            <div className="flex items-center px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground select-none">
              <div className="w-10 flex justify-center shrink-0">
                {!isReadOnly && (
                  <input
                    type="checkbox"
                    checked={filteredTodos.length > 0 && selectedTodoIds.length === filteredTodos.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                )}
              </div>
              <div className="w-8 shrink-0"></div> {/* drag grip placeholder */}
              <div className="flex-1 min-w-0 font-semibold pl-2">Task Details</div>
              <div className="w-24 shrink-0 text-center font-semibold">Priority</div>
              <div className="w-32 shrink-0 text-center font-semibold">Due Date</div>
              <div className="w-28 shrink-0 text-center font-semibold font-mono">Status</div>
              <div className="w-12 shrink-0"></div>
            </div>

            {/* List Body */}
            <div className={cn("divide-y select-none", isDragging && "bg-muted/10")}>
              {filteredTodos.map((todo, idx) => {
                const isSelected = selectedTodoIds.includes(todo.id)
                const isCurrentlyDragged = draggedIndex === idx

                return (
                  <div
                    key={todo.id}
                    draggable={!isReadOnly && !isFilterActive}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center px-4 py-3 hover:bg-muted/30 transition-colors group relative",
                      isCurrentlyDragged && "opacity-40 bg-muted/50 border-primary/20 border-dashed border-2",
                      todo.status === 'completed' && "bg-card/40 opacity-70"
                    )}
                  >
                    {/* Checkbox select */}
                    <div className="w-10 flex justify-center shrink-0">
                      {!isReadOnly && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(todo.id, e.target.checked)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Drag Handle */}
                    <div className="w-8 shrink-0 flex items-center justify-center">
                      {!isReadOnly && !isFilterActive ? (
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/80 cursor-grab active:cursor-grabbing transition-colors" />
                      ) : (
                        <div className="w-4 h-4"></div>
                      )}
                    </div>

                    {/* Checkbox toggle status & details */}
                    <div className="flex-1 min-w-0 flex items-start gap-3 pl-2">
                      <button
                        onClick={() => handleToggleComplete(todo)}
                        disabled={isReadOnly}
                        className={cn(
                          "mt-1 p-0 rounded-md focus:ring-0 border-none shrink-0 text-muted-foreground/60 hover:text-primary transition-colors disabled:pointer-events-none",
                          todo.status === 'completed' && "text-emerald-500 hover:text-emerald-600"
                        )}
                      >
                        {todo.status === 'completed' ? (
                          <CheckSquare className="w-4 h-4 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 pr-4">
                        <span className={cn(
                          "text-sm font-medium text-foreground block truncate",
                          todo.status === 'completed' && "line-through text-muted-foreground"
                        )}>
                          {todo.title}
                        </span>
                        {todo.description && (
                          <span className="text-xs text-muted-foreground block line-clamp-1 mt-0.5">
                            {todo.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="w-24 shrink-0 text-center">
                      <PriorityBadge priority={todo.priority} />
                    </div>

                    {/* Due Date */}
                    <div className="w-32 shrink-0 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      <span>{formatDate(todo.dueDate)}</span>
                    </div>

                    {/* Status */}
                    <div className="w-28 shrink-0 text-center">
                      <StatusBadge status={todo.status} />
                    </div>

                    {/* Actions Menu */}
                    <div className="w-12 shrink-0 flex items-center justify-end relative">
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === todo.id ? null : todo.id)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === todo.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border bg-popover text-popover-foreground shadow-xl p-1 z-20 animate-scale-in">
                                <button
                                  onClick={() => handleOpenEdit(todo)}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit Task
                                </button>
                                <button
                                  onClick={() => handleDuplicate(todo.id)}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-muted rounded-md transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate
                                </button>
                                <div className="h-px bg-muted my-1" />
                                <button
                                  onClick={() => { setDeleteConfirmId(todo.id); setOpenMenuId(null) }}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-destructive/10 text-destructive rounded-md transition-colors"
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
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Task Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingTodoId ? 'Edit Task Details' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Task Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Review schema definitions..."
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
                  placeholder="Outline context of deliverables or checklist tasks..."
                  {...register('description')}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    {TODO_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Start Date
                  </label>
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Due Date
                  </label>
                  <Controller
                    control={control}
                    name="dueDate"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick due date"
                        position="top"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm"
                >
                  {editingTodoId ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        variant="danger"
        confirmLabel="Delete Task"
      />
    </div>
  )
}
