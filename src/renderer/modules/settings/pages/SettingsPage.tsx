import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from '@/stores/useToastStore'
import { Breadcrumbs } from '@/components/layout'
import { ConfirmDialog } from '@/components/shared'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, Save, Download, RefreshCw, FileDown } from 'lucide-react'

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

  // App Update states
  const [currentVersion, setCurrentVersion] = useState('1.0.0')
  const [manifestUrl, setManifestUrl] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  
  // Confirm dialog state
  const [updateConfirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmDescription, setConfirmDescription] = useState('')
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

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

  // App Update Handlers
  useEffect(() => {
    window.api.update.getVersion().then((v) => setCurrentVersion(v))
  }, [])

  useEffect(() => {
    if (settings.updateUrl) {
      setManifestUrl(settings.updateUrl)
    } else {
      setManifestUrl('https://raw.githubusercontent.com/Pritish229/MY-CRM/main/update.json')
    }
  }, [settings.updateUrl])

  const handleCheckForUpdates = async () => {
    setIsChecking(true)
    setUpdateError(null)
    setUpdateInfo(null)
    try {
      const urlToCheck = manifestUrl.trim() || 'https://raw.githubusercontent.com/Pritish229/MY-CRM/main/update.json'
      const res = await window.api.update.checkForUpdates(urlToCheck)
      if (res.success) {
        setUpdateInfo(res)
        if (!res.hasUpdate) {
          toast.success('Your application is up to date!')
        } else {
          toast.success(`New version v${res.latestVersion} is available!`)
        }
      } else {
        setUpdateError(res.error || 'Failed to check for updates.')
        toast.error(res.error || 'Failed to check for updates.')
      }
    } catch (err: any) {
      setUpdateError(err.message || 'An error occurred.')
      toast.error(err.message || 'An error occurred.')
    } finally {
      setIsChecking(false)
    }
  }

  const triggerLocalUpdate = async () => {
    setConfirmOpen(false)
    try {
      const res = await window.api.update.installLocal()
      if (res && !res.success && res.error !== 'Cancelled') {
        toast.error(res.error || 'Failed to run local update installer.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger local update.')
    }
  }

  const handleLocalUpdate = () => {
    setConfirmTitle('Install Local Update')
    setConfirmDescription('Please select a downloaded installer executable (.exe) from your computer. Once selected, the application will exit and run the installer to upgrade PWM. Do you want to proceed?')
    setConfirmAction(() => triggerLocalUpdate)
    setConfirmOpen(true)
  }

  const triggerRemoteUpdate = async () => {
    setConfirmOpen(false)
    setDownloadProgress(0)
    
    // Subscribe to download progress
    const unsubscribe = window.api.update.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    try {
      const res = await window.api.update.installRemote(updateInfo.url)
      if (!res.success) {
        toast.error(res.error || 'Failed to install update.')
        setDownloadProgress(null)
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during update.')
      setDownloadProgress(null)
    } finally {
      unsubscribe()
    }
  }

  const handleInstallRemoteUpdate = () => {
    if (!updateInfo || !updateInfo.url) return
    setConfirmTitle('Download & Install Update')
    setConfirmDescription(`Are you sure you want to download and install version v${updateInfo.latestVersion}? The application will close to execute the update installer once the download is complete.`)
    setConfirmAction(() => triggerRemoteUpdate)
    setConfirmOpen(true)
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

        {/* Application Update */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Application Update</h2>
          <p className="text-sm text-muted-foreground mb-4 font-normal">Check for remote updates or perform manual local updates</p>

          <div className="space-y-4">
            {/* Version Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-sm">
              <span className="font-medium text-foreground">Current Installed Version</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                v{currentVersion}
              </span>
            </div>

            {/* Remote Update URL Config */}
            <div>
              <label className="text-sm font-medium block mb-1 text-foreground">Update Manifest URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manifestUrl}
                  onChange={(e) => setManifestUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/Pritish229/MY-CRM/main/update.json"
                  className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await updateSetting('updateUrl', manifestUrl)
                    toast.success('Update URL saved.')
                  }}
                  className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isChecking || downloadProgress !== null}
                onClick={handleCheckForUpdates}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isChecking && "animate-spin")} />
                {isChecking ? 'Checking...' : 'Check for Updates'}
              </button>
              <button
                type="button"
                disabled={isChecking || downloadProgress !== null}
                onClick={handleLocalUpdate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 border text-secondary-foreground text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                <FileDown className="w-3.5 h-3.5" />
                Install Local Update (.exe)
              </button>
            </div>

            {/* Feedback & Manifest Info */}
            {updateError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-scale-in">
                {updateError}
              </div>
            )}

            {updateInfo && (
              <div className="p-4 rounded-lg border bg-muted/25 space-y-3 animate-scale-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {updateInfo.hasUpdate ? '💰 New Version Available!' : '✨ You are up to date'}
                  </span>
                  <span className="font-bold text-primary">v{updateInfo.latestVersion}</span>
                </div>
                
                {updateInfo.releaseNotes && (
                  <div className="text-xs text-muted-foreground bg-background p-2.5 rounded border max-h-24 overflow-y-auto font-sans whitespace-pre-line leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                )}

                {updateInfo.hasUpdate && downloadProgress === null && (
                  <button
                    type="button"
                    onClick={handleInstallRemoteUpdate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download and Install Update
                  </button>
                )}

                {downloadProgress !== null && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Downloading Update Package...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      The application will restart and complete installation once the download finishes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Project Workspace Manager v{currentVersion}</p>
            <p>A fully offline project management system</p>
            <p>Built with Electron, React, TypeScript, and SQLite</p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={updateConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmAction || (() => {})}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Proceed"
        variant="info"
      />
    </div>
  )
}
