import { create } from 'zustand'
import { toast } from './useToastStore'

export interface Project {
  id: string
  name: string
  code: string
  description: string
  clientId: string | null
  userId: string | null
  startDate: string | null
  deadline: string | null
  priority: string
  status: string
  tags: string
  archived: boolean
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
    company: string
    email: string
    phone: string
    status?: string
  } | null
  todos?: unknown[]
  deliverables?: unknown[]
  notes?: unknown[]
  files?: unknown[]
  activityLogs?: unknown[]
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  filters: {
    status?: string
    priority?: string
    search?: string
    archived?: boolean
    clientId?: string
    startDateRange?: string
    endDateRange?: string
  }
  setFilters: (filters: ProjectState['filters']) => void
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: Record<string, unknown>) => Promise<Project>
  updateProject: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  unarchiveProject: (id: string) => Promise<void>
  closeProject: (id: string) => Promise<void>
  reopenProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  filters: { archived: false },

  setFilters: (filters) => {
    set({ filters })
    get().fetchProjects()
  },

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await window.api.projects.getAll(get().filters)
      set({ projects, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchProject: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const project = await window.api.projects.getById(id)
      set({ currentProject: project, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createProject: async (data) => {
    try {
      const project = await window.api.projects.create(data)
      await get().fetchProjects()
      toast.success('Project created successfully.')
      return project
    } catch (err) {
      toast.error('Failed to create project', (err as Error).message)
      throw err
    }
  },

  updateProject: async (id, data) => {
    try {
      await window.api.projects.update(id, data)
      await get().fetchProjects()
      if (get().currentProject?.id === id) {
        await get().fetchProject(id)
      }
      toast.success('Project updated successfully.')
    } catch (err) {
      toast.error('Failed to update project', (err as Error).message)
      throw err
    }
  },

  deleteProject: async (id) => {
    try {
      await window.api.projects.delete(id)
      set({ currentProject: null })
      await get().fetchProjects()
      toast.success('Project deleted successfully.')
    } catch (err) {
      toast.error('Failed to delete project', (err as Error).message)
      throw err
    }
  },

  archiveProject: async (id) => {
    try {
      await window.api.projects.archive(id)
      await get().fetchProjects()
      toast.success('Project archived successfully.')
    } catch (err) {
      toast.error('Failed to archive project', (err as Error).message)
      throw err
    }
  },

  unarchiveProject: async (id) => {
    try {
      await window.api.projects.update(id, { archived: false })
      await get().fetchProjects()
      toast.success('Project restored successfully.')
    } catch (err) {
      toast.error('Failed to restore project', (err as Error).message)
      throw err
    }
  },

  closeProject: async (id) => {
    try {
      await window.api.projects.close(id)
      await get().fetchProjects()
      if (get().currentProject?.id === id) {
        await get().fetchProject(id)
      }
      toast.success('Project closed successfully.')
    } catch (err) {
      toast.error('Failed to close project', (err as Error).message)
      throw err
    }
  },

  reopenProject: async (id) => {
    try {
      await window.api.projects.reopen(id)
      await get().fetchProjects()
      if (get().currentProject?.id === id) {
        await get().fetchProject(id)
      }
      toast.success('Project reopened successfully.')
    } catch (err) {
      toast.error('Failed to reopen project', (err as Error).message)
      throw err
    }
  }
}))
