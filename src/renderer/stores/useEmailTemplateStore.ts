import { create } from 'zustand'

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  isPrebuilt?: boolean
}

export interface ProfileStatus {
  isConnected: boolean
  lastError?: string
  checkedAt?: string
}

interface EmailTemplateState {
  templates: EmailTemplate[]
  profileMappings: Record<string, string> // profileId -> templateId
  profileStatuses: Record<string, ProfileStatus> // profileId -> ProfileStatus
  loading: boolean

  fetchTemplates: () => Promise<void>
  saveTemplate: (template: Partial<EmailTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
  resetDefaultTemplates: () => Promise<void>

  fetchMappings: () => Promise<void>
  setMapping: (profileId: string, templateId: string) => Promise<void>

  fetchStatuses: () => Promise<void>
  setStatus: (profileId: string, isConnected: boolean, lastError?: string) => Promise<void>

  processTemplateText: (text: string, variables: Record<string, string>) => string
}

export const useEmailTemplateStore = create<EmailTemplateState>((set, get) => ({
  templates: [],
  profileMappings: {},
  profileStatuses: {},
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true })
    try {
      if (window.api?.email?.getTemplates) {
        const templates = await window.api.email.getTemplates()
        set({ templates: templates || [], loading: false })
      } else {
        set({ loading: false })
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error fetching templates:', err)
      set({ loading: false })
    }
  },

  saveTemplate: async (template) => {
    try {
      if (window.api?.email?.saveTemplate) {
        const res = await window.api.email.saveTemplate(template)
        if (res?.success) {
          await get().fetchTemplates()
          return true
        }
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error saving template:', err)
    }
    return false
  },

  deleteTemplate: async (id) => {
    try {
      if (window.api?.email?.deleteTemplate) {
        const res = await window.api.email.deleteTemplate(id)
        if (res?.success) {
          await get().fetchTemplates()
          return true
        }
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error deleting template:', err)
    }
    return false
  },

  resetDefaultTemplates: async () => {
    try {
      if (window.api?.email?.resetDefaultTemplates) {
        const res = await window.api.email.resetDefaultTemplates()
        if (res?.success) {
          set({ templates: res.templates || [] })
        }
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error resetting templates:', err)
    }
  },

  fetchMappings: async () => {
    try {
      if (window.api?.email?.getProfileTemplateMappings) {
        const mappings = await window.api.email.getProfileTemplateMappings()
        set({ profileMappings: mappings || {} })
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error fetching mappings:', err)
    }
  },

  setMapping: async (profileId, templateId) => {
    try {
      if (window.api?.email?.setProfileTemplateMapping) {
        const res = await window.api.email.setProfileTemplateMapping({ profileId, templateId })
        if (res?.success) {
          set({ profileMappings: res.mappings || {} })
        }
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error setting mapping:', err)
    }
  },

  fetchStatuses: async () => {
    try {
      if (window.api?.email?.getProfileStatuses) {
        const statuses = await window.api.email.getProfileStatuses()
        set({ profileStatuses: statuses || {} })
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error fetching statuses:', err)
    }
  },

  setStatus: async (profileId, isConnected, lastError) => {
    try {
      if (window.api?.email?.setProfileStatus) {
        const res = await window.api.email.setProfileStatus({ profileId, isConnected, lastError })
        if (res?.success) {
          set({ profileStatuses: res.statuses || {} })
        }
      }
    } catch (err) {
      console.error('[EmailTemplateStore] Error setting status:', err)
    }
  },

  processTemplateText: (text, variables) => {
    if (!text) return ''
    let result = text
    Object.entries(variables).forEach(([key, val]) => {
      const reg = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi')
      result = result.replace(reg, val || '')
    })
    return result
  }
}))
