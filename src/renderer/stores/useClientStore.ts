import { create } from 'zustand'

export interface ClientAddress {
  id: string
  label: string
  street?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  isPrimary?: boolean
}

export interface ClientContact {
  id: string
  name: string
  role?: string
  email?: string
  phone?: string
  isPrimary?: boolean
}

export interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: string // active, inactive
  gstNo?: string
  panNo?: string
  website?: string
  notes?: string
  currency?: string
  addresses?: string
  contacts?: string
  createdAt: string
  _count?: {
    projects: number
    collaborations?: number
  }
  collaborations?: {
    id: string
    role: string
    project: {
      id: string
      name: string
      code: string
      status: string
    }
  }[]
}

interface ClientState {
  clients: Client[]
  loading: boolean
  error: string | null
  fetchClients: () => Promise<void>
  createClient: (data: Record<string, unknown>) => Promise<Client>
  updateClient: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null })
    try {
      const clients = await window.api.clients.getAll()
      set({ clients, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createClient: async (data) => {
    const client = await window.api.clients.create(data)
    await get().fetchClients()
    return client
  },

  updateClient: async (id, data) => {
    await window.api.clients.update(id, data)
    await get().fetchClients()
  },

  deleteClient: async (id) => {
    await window.api.clients.delete(id)
    await get().fetchClients()
  }
}))
