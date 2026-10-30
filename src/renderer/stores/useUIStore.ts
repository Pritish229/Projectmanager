import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  globalSearch: string
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setGlobalSearch: (search: string) => void
  applyTheme: (theme: 'light' | 'dark' | 'system') => void
}

const initialCollapsed = typeof window !== 'undefined' ? localStorage.getItem('pwm_sidebar_collapsed') === 'true' : false

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: initialCollapsed,
  theme: 'system',
  globalSearch: '',

  toggleSidebar: () => set((state) => {
    const next = !state.sidebarCollapsed
    try { localStorage.setItem('pwm_sidebar_collapsed', String(next)) } catch {}
    return { sidebarCollapsed: next }
  }),
  setSidebarCollapsed: (collapsed) => {
    try { localStorage.setItem('pwm_sidebar_collapsed', String(collapsed)) } catch {}
    set({ sidebarCollapsed: collapsed })
  },

  setTheme: (theme) => {
    set({ theme })
    applyThemeToDOM(theme)
    window.api.settings.set('theme', theme)
  },

  setGlobalSearch: (search) => set({ globalSearch: search }),

  applyTheme: (theme) => {
    set({ theme })
    applyThemeToDOM(theme)
  }
}))

function applyThemeToDOM(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}
