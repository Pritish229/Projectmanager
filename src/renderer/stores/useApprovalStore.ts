import { create } from 'zustand'

export interface Approval {
  id: string
  deliverableId: string
  clientId: string | null
  status: string
  comment: string
  date: string
  createdAt: string
  client?: any
  deliverable?: any
}

interface ApprovalState {
  approvals: Approval[]
  pendingApprovals: Approval[]
  loading: boolean
  error: string | null
  fetchApprovals: (deliverableId: string) => Promise<void>
  fetchPendingApprovals: () => Promise<void>
  requestApproval: (data: { deliverableId: string; clientId?: string; comment?: string }) => Promise<Approval>
  approveDeliverable: (id: string, comment?: string) => Promise<void>
  rejectDeliverable: (id: string, comment?: string) => Promise<void>
  requestChanges: (id: string, comment: string) => Promise<void>
  resubmitDeliverable: (deliverableId: string, comment?: string) => Promise<void>
  updateApprovalComment: (id: string, comment: string) => Promise<void>
  markPendingDeliverable: (id: string, comment?: string) => Promise<void>
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  pendingApprovals: [],
  loading: false,
  error: null,

  fetchApprovals: async (deliverableId) => {
    set({ loading: true, error: null })
    try {
      const approvals = await window.api.approvals.getByDeliverable(deliverableId)
      set({ approvals, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchPendingApprovals: async () => {
    set({ loading: true, error: null })
    try {
      const pendingApprovals = await window.api.approvals.getPending()
      set({ pendingApprovals, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  requestApproval: async (data) => {
    const approval = await window.api.approvals.create(data)
    await get().fetchApprovals(data.deliverableId)
    await get().fetchPendingApprovals()
    return approval
  },

  approveDeliverable: async (id, comment) => {
    const approval = await window.api.approvals.approve(id, comment)
    await get().fetchApprovals(approval.deliverableId)
    await get().fetchPendingApprovals()
  },

  rejectDeliverable: async (id, comment) => {
    const approval = await window.api.approvals.reject(id, comment)
    await get().fetchApprovals(approval.deliverableId)
    await get().fetchPendingApprovals()
  },

  requestChanges: async (id, comment) => {
    const approval = await window.api.approvals.requestChanges(id, comment)
    await get().fetchApprovals(approval.deliverableId)
    await get().fetchPendingApprovals()
  },

  resubmitDeliverable: async (deliverableId, comment) => {
    const approval = await window.api.approvals.resubmit(deliverableId, comment)
    await get().fetchApprovals(deliverableId)
    await get().fetchPendingApprovals()
  },

  updateApprovalComment: async (id, comment) => {
    const approval = await window.api.approvals.updateComment(id, comment)
    await get().fetchApprovals(approval.deliverableId)
    await get().fetchPendingApprovals()
  },

  markPendingDeliverable: async (id, comment) => {
    const approval = await window.api.approvals.markPending(id, comment)
    await get().fetchApprovals(approval.deliverableId)
    await get().fetchPendingApprovals()
  }
}))
