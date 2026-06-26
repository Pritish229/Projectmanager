import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  updateSettings: (settings: Record<string, string>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = await window.api.settings.getAll()
      set({ settings, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateSetting: async (key, value) => {
    await window.api.settings.set(key, value)
    set((state) => ({
      settings: { ...state.settings, [key]: value }
    }))
  },

  updateSettings: async (settings) => {
    await window.api.settings.setMany(settings)
    set((state) => ({
      settings: { ...state.settings, ...settings }
    }))
  }
}))
