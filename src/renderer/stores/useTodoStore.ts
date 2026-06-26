import { create } from 'zustand'

interface Todo {
  id: string
  projectId: string
  title: string
  description: string
  priority: string
  status: string
  startDate: string | null
  dueDate: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface TodoState {
  todos: Todo[]
  loading: boolean
  error: string | null
  fetchTodos: (projectId: string, filters?: Record<string, unknown>) => Promise<void>
  createTodo: (data: Record<string, unknown>) => Promise<Todo>
  updateTodo: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  completeTodo: (id: string) => Promise<void>
  bulkComplete: (ids: string[]) => Promise<void>
  duplicateTodo: (id: string) => Promise<void>
  reorderTodos: (items: { id: string; sortOrder: number }[]) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  fetchTodos: async (projectId, filters) => {
    set({ loading: true, error: null })
    try {
      const todos = await window.api.todos.getByProject(projectId, filters)
      set({ todos, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createTodo: async (data) => {
    const todo = await window.api.todos.create(data)
    if (data.projectId) {
      await get().fetchTodos(data.projectId as string)
    }
    return todo
  },

  updateTodo: async (id, data) => {
    await window.api.todos.update(id, data)
    const todo = get().todos.find(t => t.id === id)
    if (todo) await get().fetchTodos(todo.projectId)
  },

  deleteTodo: async (id) => {
    const todo = get().todos.find(t => t.id === id)
    await window.api.todos.delete(id)
    if (todo) await get().fetchTodos(todo.projectId)
  },

  completeTodo: async (id) => {
    const todo = get().todos.find(t => t.id === id)
    await window.api.todos.complete(id)
    if (todo) await get().fetchTodos(todo.projectId)
  },

  bulkComplete: async (ids) => {
    await window.api.todos.bulkComplete(ids)
    const todo = get().todos.find(t => ids.includes(t.id))
    if (todo) await get().fetchTodos(todo.projectId)
  },

  duplicateTodo: async (id) => {
    const todo = get().todos.find(t => t.id === id)
    await window.api.todos.duplicate(id)
    if (todo) await get().fetchTodos(todo.projectId)
  },

  reorderTodos: async (items) => {
    await window.api.todos.reorder(items)
  }
}))
