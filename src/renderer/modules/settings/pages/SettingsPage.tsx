import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from '@/stores/useToastStore'
import { Breadcrumbs } from '@/components/layout'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, Save } from 'lucide-react'

export function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const { changePin, changeSecurityPassword } = useAuthStore()

  // PIN states
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState<string | null>(null)

  // Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setPinSuccess(null)

    if (currentPin.length !== 6 || newPin.length !== 6) {
      setPinError('PIN must be exactly 6 digits.')
      return
    }

    if (currentPin === newPin) {
      setPinError('New PIN must be different from current PIN.')
      return
    }

    const success = await changePin(currentPin, newPin)
    if (success) {
      setPinSuccess('PIN updated successfully!')
      toast.success('PIN updated successfully!')
      setCurrentPin('')
      setNewPin('')
    } else {
      setPinError('Incorrect current PIN.')
      toast.error('Incorrect current PIN.')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(null)

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.')
      return
    }

    if (currentPassword === newPassword) {
      setPwdError('New password must be different from current password.')
      return
    }

    const success = await changeSecurityPassword(currentPassword, newPassword)
    if (success) {
      setPwdSuccess('Recovery password updated successfully!')
      toast.success('Recovery password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
    } else {
      setPwdError('Incorrect current password.')
      toast.error('Incorrect current password.')
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor }
  ]

  return (
    <div className="p-6 h-full overflow-auto">
      <Breadcrumbs items={[{ label: 'Settings' }]} />

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Theme */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Appearance</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose your preferred theme</p>

          <div className="grid grid-cols-3 gap-3">
            {themes.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value)
                  toast.success(`Theme updated to ${t.label}.`)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  theme === t.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted'
                )}
              >
                <t.icon className={cn(
                  'w-6 h-6',
                  theme === t.value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Auto Backup */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Backup</h2>
          <p className="text-sm text-muted-foreground mb-4">Configure automatic backups</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto Backup</p>
                <p className="text-xs text-muted-foreground">Automatically backup your data</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = settings.autoBackup === 'true' ? 'false' : 'true'
                  await updateSetting('autoBackup', newVal)
                  toast.success(newVal === 'true' ? 'Automatic backup enabled.' : 'Automatic backup disabled.')
                }}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  settings.autoBackup === 'true' ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                  settings.autoBackup === 'true' && 'translate-x-5'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Backup Interval</p>
                <p className="text-xs text-muted-foreground">Hours between automatic backups</p>
              </div>
              <select
                value={settings.backupInterval || '24'}
                onChange={async (e) => {
                  await updateSetting('backupInterval', e.target.value)
                  toast.success(`Backup interval updated to ${e.target.value} hours.`)
                }}
                className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
              >
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="168">Weekly</option>
              </select>
            </div>
          </div>
        </section>

        {/* File Storage */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">File Storage</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose custom directories for report exports and backups</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1 text-foreground">Custom Backup Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings.backupLocation || ''}
                  placeholder="Default documents folder"
                  className="flex-1 px-3 py-1.5 rounded-lg border bg-muted text-sm outline-none truncate"
                />
                <button
                  onClick={async () => {
                    const path = await window.api.settings.selectFolder()
                    if (path) {
                      await updateSetting('backupLocation', path)
                      toast.success('Backup folder updated.')
                    }
                  }}
                  className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Browse...
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1 text-foreground">Custom PDF Reports Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings.defaultPdfFolder || ''}
                  placeholder="Default documents folder"
                  className="flex-1 px-3 py-1.5 rounded-lg border bg-muted text-sm outline-none truncate"
                />
                <button
                  onClick={async () => {
                    const path = await window.api.settings.selectFolder()
                    if (path) {
                      await updateSetting('defaultPdfFolder', path)
                      toast.success('PDF reports folder updated.')
                    }
                  }}
                  className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Browse...
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Security Settings */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Security Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">Manage your 6-digit access PIN and recovery password</p>

          <div className="space-y-6">
            {/* Change PIN Section */}
            <div className="border-b pb-6">
              <h3 className="text-sm font-semibold mb-2">Change 6-Digit PIN</h3>
              {pinSuccess && <p className="text-xs text-emerald-500 mb-2">{pinSuccess}</p>}
              {pinError && <p className="text-xs text-rose-500 mb-2">{pinError}</p>}
              <form onSubmit={handlePinChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="password"
                  placeholder="Current PIN"
                  maxLength={6}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="New PIN (6 digits)"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Update PIN
                </button>
              </form>
            </div>

            {/* Change Password Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Change Recovery Password</h3>
              {pwdSuccess && <p className="text-xs text-emerald-500 mb-2">{pwdSuccess}</p>}
              {pwdError && <p className="text-xs text-rose-500 mb-2">{pwdError}</p>}
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    placeholder="Current Security Password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Security Password (min. 8 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Project Workspace Manager v1.0.0</p>
            <p>A fully offline project management system</p>
            <p>Built with Electron, React, TypeScript, and SQLite</p>
          </div>
        </section>
      </div>
    </div>
  )
}
