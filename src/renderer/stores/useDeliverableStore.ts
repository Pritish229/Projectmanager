import { create } from 'zustand'

export interface Deliverable {
  id: string
  projectId: string
  title: string
  description: string
  version: number
  deliverableNumber: string
  filePath: string
  fileName: string
  status: string
  createdAt: string
  updatedAt: string
  deliverableTodos?: { id: string; deliverableId: string; todoId: string; todo: any }[]
  approvals?: any[]
}

interface DeliverableState {
  deliverables: Deliverable[]
  loading: boolean
  error: string | null
  fetchDeliverables: (projectId: string) => Promise<void>
  createDeliverable: (data: { projectId: string; title: string; description?: string; deliverableNumber?: string }) => Promise<Deliverable>
  updateDeliverable: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteDeliverable: (id: string, fileAction?: 'delete' | 'move') => Promise<void>
  uploadFile: (id: string) => Promise<void>
  downloadFile: (id: string, fileIdx: number) => Promise<{ success: boolean; path: string } | null>
  removeFile: (id: string, fileIdx: number) => Promise<void>
  getFileBuffer: (id: string, fileIdx: number) => Promise<{ data: string; mimeType: string; name: string } | null>
  linkTodos: (deliverableId: string, todoIds: string[]) => Promise<void>
  duplicateDeliverable: (id: string) => Promise<void>
  attachProjectFiles: (id: string, fileIds: string[]) => Promise<void>
}

export const useDeliverableStore = create<DeliverableState>((set, get) => ({
  deliverables: [],
  loading: false,
  error: null,

  fetchDeliverables: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const deliverables = await window.api.deliverables.getByProject(projectId)
      set({ deliverables, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createDeliverable: async (data) => {
    const deliverable = await window.api.deliverables.create(data)
    await get().fetchDeliverables(data.projectId)
    return deliverable
  },

  updateDeliverable: async (id, data) => {
    await window.api.deliverables.update(id, data)
    const deliverable = get().deliverables.find(d => d.id === id)
    if (deliverable) await get().fetchDeliverables(deliverable.projectId)
  },

  deleteDeliverable: async (id, fileAction) => {
    const deliverable = get().deliverables.find(d => d.id === id)
    await window.api.deliverables.delete(id, fileAction)
    if (deliverable) await get().fetchDeliverables(deliverable.projectId)
  },

  uploadFile: async (id) => {
    const deliverable = await window.api.deliverables.uploadFile(id)
    if (deliverable) {
      await get().fetchDeliverables(deliverable.projectId)
    }
  },

  downloadFile: async (id, fileIdx) => {
    return window.api.deliverables.downloadFile(id, fileIdx)
  },

  removeFile: async (id, fileIdx) => {
    const deliverable = await window.api.deliverables.removeFile(id, fileIdx)
    if (deliverable) {
      await get().fetchDeliverables(deliverable.projectId)
    }
  },

  getFileBuffer: async (id, fileIdx) => {
    return window.api.deliverables.getFileBuffer(id, fileIdx)
  },

  linkTodos: async (deliverableId, todoIds) => {
    await window.api.deliverables.linkTodos(deliverableId, todoIds)
    const deliverable = get().deliverables.find(d => d.id === deliverableId)
    if (deliverable) await get().fetchDeliverables(deliverable.projectId)
  },

  duplicateDeliverable: async (id) => {
    const deliverable = get().deliverables.find(d => d.id === id)
    await window.api.deliverables.duplicate(id)
    if (deliverable) await get().fetchDeliverables(deliverable.projectId)
  },

  attachProjectFiles: async (id, fileIds) => {
    const deliverable = await window.api.deliverables.attachProjectFiles(id, fileIds)
    if (deliverable) {
      await get().fetchDeliverables(deliverable.projectId)
    }
  }
}))
