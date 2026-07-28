import { create } from 'zustand'

export interface InvoiceTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
  layoutStyle: string
  headerTitle: string
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  logoUrl: string
  primaryColor: string
  termsAndConditions: string
  notes: string
  placeholdersConfig: string
  contentTemplate: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  id: string
  projectId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  currency: string
  currencySymbol: string
  clientName: string
  clientEmail: string
  clientAddress: string
  companyName: string
  companyAddress: string
  companyEmail: string
  subtotal: number
  discountType: 'percentage' | 'flat'
  discountValue: number
  discountAmount: number
  taxType: 'percentage' | 'flat'
  taxValue: number
  taxAmount: number
  totalAmount: number
  termsAndConditions: string
  notes: string
  templateId: string | null
  items: string // JSON array string
  createdAt: string
  updatedAt: string
  template?: InvoiceTemplate
  project?: any
}

interface InvoiceState {
  templates: InvoiceTemplate[]
  projectInvoices: Invoice[]
  loadingTemplates: boolean
  loadingInvoices: boolean

  fetchTemplates: () => Promise<void>
  seedDefaultTemplates: () => Promise<void>
  createTemplate: (data: Partial<InvoiceTemplate>) => Promise<InvoiceTemplate>
  updateTemplate: (id: string, data: Partial<InvoiceTemplate>) => Promise<InvoiceTemplate>
  deleteTemplate: (id: string) => Promise<boolean>
  importTemplate: (jsonStr: string) => Promise<{ success: boolean; error?: string }>
  exportTemplate: (id: string) => Promise<string | null>

  fetchProjectInvoices: (projectId: string) => Promise<void>
  createInvoice: (data: any) => Promise<Invoice>
  updateInvoice: (id: string, data: any) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<boolean>
  updateInvoiceStatus: (id: string, status: string) => Promise<void>
  generatePdf: (id: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  sendEmail: (options: { invoiceId: string; smtpProfileId?: string; recipientEmail?: string; subject?: string; bodyMessage?: string }) => Promise<{ success: boolean; error?: string }>
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  templates: [],
  projectInvoices: [],
  loadingTemplates: false,
  loadingInvoices: false,

  fetchTemplates: async () => {
    set({ loadingTemplates: true })
    try {
      const templates = await window.api.invoices.getAllTemplates()
      set({ templates, loadingTemplates: false })
    } catch (err) {
      console.error('[InvoiceStore] Error fetching templates:', err)
      set({ loadingTemplates: false })
    }
  },

  seedDefaultTemplates: async () => {
    set({ loadingTemplates: true })
    try {
      const templates = await window.api.invoices.seedDefaultTemplates()
      set({ templates, loadingTemplates: false })
    } catch (err) {
      console.error('[InvoiceStore] Error seeding templates:', err)
      set({ loadingTemplates: false })
    }
  },

  createTemplate: async (data) => {
    const created = await window.api.invoices.createTemplate(data as Record<string, unknown>)
    await get().fetchTemplates()
    return created
  },

  updateTemplate: async (id, data) => {
    const updated = await window.api.invoices.updateTemplate(id, data as Record<string, unknown>)
    await get().fetchTemplates()
    return updated
  },

  deleteTemplate: async (id) => {
    const res = await window.api.invoices.deleteTemplate(id)
    if (res.success) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      }))
      return true
    }
    return false
  },

  importTemplate: async (jsonStr) => {
    const res = await window.api.invoices.importTemplate(jsonStr)
    if (res.success) {
      await get().fetchTemplates()
    }
    return res
  },

  exportTemplate: async (id) => {
    return await window.api.invoices.exportTemplate(id)
  },

  fetchProjectInvoices: async (projectId) => {
    set({ loadingInvoices: true })
    try {
      const projectInvoices = await window.api.invoices.getByProject(projectId)
      set({ projectInvoices, loadingInvoices: false })
    } catch (err) {
      console.error('[InvoiceStore] Error fetching project invoices:', err)
      set({ loadingInvoices: false })
    }
  },

  createInvoice: async (data) => {
    const created = await window.api.invoices.create(data)
    if (data.projectId) {
      await get().fetchProjectInvoices(data.projectId)
    }
    return created
  },

  updateInvoice: async (id, data) => {
    const updated = await window.api.invoices.update(id, data)
    if (updated.projectId) {
      await get().fetchProjectInvoices(updated.projectId)
    }
    return updated
  },

  deleteInvoice: async (id) => {
    const res = await window.api.invoices.delete(id)
    if (res.success) {
      set((state) => ({
        projectInvoices: state.projectInvoices.filter((inv) => inv.id !== id)
      }))
      return true
    }
    return false
  },

  updateInvoiceStatus: async (id, status) => {
    const updated = await window.api.invoices.updateStatus(id, status)
    set((state) => ({
      projectInvoices: state.projectInvoices.map((inv) =>
        inv.id === id ? { ...inv, status: updated.status } : inv
      )
    }))
  },

  generatePdf: async (id) => {
    return await window.api.invoices.generatePdf(id)
  },

  sendEmail: async (options) => {
    const res = await window.api.invoices.sendEmail(options)
    if (res.success) {
      // Find invoice and update local status to sent if draft
      set((state) => ({
        projectInvoices: state.projectInvoices.map((inv) =>
          inv.id === options.invoiceId && inv.status === 'draft'
            ? { ...inv, status: 'sent' }
            : inv
        )
      }))
    }
    return res
  }
}))
