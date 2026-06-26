import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Sidebar, Navbar } from '@/components/layout'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { SecurityScreen, PageLoader, Toaster } from '@/components/shared'

// Pages
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { ProjectsPage } from '@/modules/projects/pages/ProjectsPage'
import { WorkspacePage } from '@/modules/workspace/pages/WorkspacePage'
import { ClientsPage } from '@/modules/clients/pages/ClientsPage'
import { ReportsPage } from '@/modules/reports/pages/ReportsPage'
import { NotificationsPage } from '@/modules/notifications/pages/NotificationsPage'
import { BackupPage } from '@/modules/backup/pages/BackupPage'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { SearchPage } from '@/modules/search/pages/SearchPage'

export function App() {
  if (typeof window.api === 'undefined') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Desktop Client Required</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Project Workspace Manager (PWM) is a secure, offline-first desktop application. It cannot be run directly inside a standard web browser.
            </p>
          </div>
          <div className="text-xs bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl text-left space-y-2 text-zinc-400 font-mono">
            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Close this web browser tab.</p>
            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Use the Electron window that opened automatically when you ran <code className="text-indigo-300">npm run dev</code>.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

function AppContent() {
  const { applyTheme } = useUIStore()
  const { fetchSettings, settings } = useSettingsStore()
  const { checkDeadlines } = useNotificationStore()
  const { isAuthenticated, isPinSet, checkSecurityStatus } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await fetchSettings()
      const savedTheme = await window.api.settings.get('theme')
      if (savedTheme) {
        applyTheme(savedTheme as 'light' | 'dark' | 'system')
      }

      // Check PIN status
      await checkSecurityStatus()

      // Check for overdue items on startup
      await checkDeadlines()
    }

    init()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const currentTheme = useUIStore.getState().theme
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handler)

    // Periodic deadline check (every 30 min)
    const interval = setInterval(checkDeadlines, 30 * 60 * 1000)

    return () => {
      mediaQuery.removeEventListener('change', handler)
      clearInterval(interval)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement instanceof HTMLInputElement || 
                      document.activeElement instanceof HTMLTextAreaElement || 
                      document.activeElement?.getAttribute('contenteditable') === 'true'

      // Escape: Close modals, clear focus, clear active search
      if (e.key === 'Escape') {
        if (isInput) {
          (document.activeElement as HTMLElement).blur()
        }
        // Click modal/dialog close buttons
        const closeBtn = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Close"], button.modal-close, button [class*="lucide-x"], button [class*="LucideX"]'
        )
        closeBtn?.click()
        return
      }

      // If user is editing/typing inside an input field, do not trigger navigation/action shortcuts
      if (isInput) return

      // Ctrl+K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('header input[type="text"], input[placeholder*="Search"]')
        searchInput?.focus()
      }

      // Ctrl+B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        useUIStore.getState().toggleSidebar()
      }

      // Ctrl+, : Go to Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        navigate('/settings')
      }

      // Ctrl+H : Go to Dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        navigate('/')
      }

      // Ctrl+N: Create new item (Dynamic selector clicker)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        const primaryButtons = [
          'New Project',
          'Add Task',
          'Add Deliverable',
          'New Note',
          'Add Note',
          'Upload Files',
          'Add Client',
          'New Client',
          'Create Backup',
          'Export Backup'
        ]
        const buttons = Array.from(document.querySelectorAll('button'))
        const targetButton = buttons.find(btn => {
          const text = btn.textContent?.trim() || ''
          const matchesText = primaryButtons.some(pb => text.toLowerCase().includes(pb.toLowerCase()))
          const rect = btn.getBoundingClientRect()
          const isVisible = rect.width > 0 && rect.height > 0
          return matchesText && isVisible
        })
        targetButton?.click()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  if (isPinSet === null) {
    return <PageLoader label="Loading security parameters..." />
  }

  if (isPinSet === false) {
    return <SecurityScreen mode="setup" />
  }

  if (!isAuthenticated) {
    return <SecurityScreen mode="lock" />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<WorkspacePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
