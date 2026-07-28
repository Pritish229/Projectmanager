import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from '@/stores/useToastStore'
import { Breadcrumbs } from '@/components/layout'
import { ConfirmDialog } from '@/components/shared'
import { cn } from '@/lib/utils'
import {
  Sun,
  Moon,
  Monitor,
  Save,
  Download,
  RefreshCw,
  FileDown,
  Mail,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Wifi,
  Loader2,
  Server,
  Folder,
  Lock,
  Sparkles,
  Info,
  Sliders,
  HardDrive,
  Check,
  User
} from 'lucide-react'

type SettingsTab = 'profile' | 'email' | 'appearance' | 'backup' | 'storage' | 'security' | 'updates'

interface SmtpProfile {
  id?: string
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  pass?: string
  from: string
  isDefault?: boolean
}

// Common SMTP presets for quick filling
const SMTP_PRESETS = [
  {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    guideKey: 'gmail',
    color: 'text-red-500 bg-red-500/10'
  },
  {
    name: 'Outlook / Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    guideKey: 'outlook',
    color: 'text-blue-500 bg-blue-500/10'
  },
  {
    name: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    guideKey: 'yahoo',
    color: 'text-purple-500 bg-purple-500/10'
  },
  {
    name: 'Custom / Webmail',
    host: '',
    port: 587,
    secure: false,
    guideKey: 'custom',
    color: 'text-amber-500 bg-amber-500/10'
  }
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const { theme, setTheme } = useUIStore()
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const { changePin, changeSecurityPassword } = useAuthStore()

  // User Profile Information State
  const [profileInfo, setProfileInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: ''
  })
  const [savingProfileInfo, setSavingProfileInfo] = useState(false)

  const loadProfileInfo = async () => {
    try {
      const [name, email, phone, company, role] = await Promise.all([
        window.api.settings.get('user_profile_name').catch(() => ''),
        window.api.settings.get('user_profile_email').catch(() => ''),
        window.api.settings.get('user_profile_phone').catch(() => ''),
        window.api.settings.get('user_profile_company').catch(() => ''),
        window.api.settings.get('user_profile_role').catch(() => '')
      ])
      setProfileInfo({
        name: name || '',
        email: email || '',
        phone: phone || '',
        company: company || '',
        role: role || ''
      })
    } catch (err) {
      console.error('Failed to load profile info:', err)
    }
  }

  const handleSaveProfileInfo = async () => {
    setSavingProfileInfo(true)
    try {
      await Promise.all([
        window.api.settings.set('user_profile_name', profileInfo.name),
        window.api.settings.set('user_profile_email', profileInfo.email),
        window.api.settings.set('user_profile_phone', profileInfo.phone),
        window.api.settings.set('user_profile_company', profileInfo.company),
        window.api.settings.set('user_profile_role', profileInfo.role)
      ])
      toast.success('Profile information saved successfully!')
    } catch (err: any) {
      toast.error('Failed to save profile information')
    } finally {
      setSavingProfileInfo(false)
    }
  }

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

  // ─── SMTP Profiles State ───────────────────────────────────────────────────
  const [smtpProfiles, setSmtpProfiles] = useState<SmtpProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Setup Guide Toggle
  const [showGuide, setShowGuide] = useState(true)
  const [activeGuideTab, setActiveGuideTab] = useState<'gmail' | 'outlook' | 'yahoo' | 'custom'>('gmail')

  // Profile Form State
  const [formProfile, setFormProfile] = useState<SmtpProfile>({
    name: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: ''
  })

  // Load profiles on mount
  const loadSmtpProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const profiles = await window.api.email.getProfiles()
      setSmtpProfiles(profiles || [])
    } catch (err) {
      console.error('Failed to load SMTP profiles:', err)
    } finally {
      setLoadingProfiles(false)
    }
  }

  useEffect(() => {
    loadSmtpProfiles()
    loadProfileInfo()
  }, [])

  const handleOpenAddForm = () => {
    setEditingProfileId(null)
    setFormProfile({
      name: '',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: ''
    })
    setTestResult(null)
    setShowPassword(false)
    setIsFormOpen(true)
  }

  const handleOpenEditForm = async (profile: SmtpProfile) => {
    setEditingProfileId(profile.id || null)
    setTestResult(null)
    setShowPassword(false)

    let existingPass = ''
    if (profile.id) {
      try {
        const res = await window.api.email.getProfilePass(profile.id)
        if (res.success) existingPass = res.pass
      } catch (err) {
        console.error(err)
      }
    }

    setFormProfile({
      id: profile.id,
      name: profile.name,
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      user: profile.user,
      pass: existingPass,
      from: profile.from
    })
    setIsFormOpen(true)
  }

  const handleApplyPreset = (preset: typeof SMTP_PRESETS[0]) => {
    setFormProfile(prev => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      name: prev.name || `${preset.name} Account`
    }))
    setActiveGuideTab(preset.guideKey as any)
  }

  const handleTestSmtpConnection = async () => {
    if (!formProfile.host || !formProfile.user || !formProfile.pass) {
      toast.error('Host, Username, and Password are required to test connection.')
      return
    }
    setTestingConnection(true)
    setTestResult(null)
    try {
      const res = await window.api.email.testConnection({
        host: formProfile.host,
        port: formProfile.port,
        secure: formProfile.secure,
        user: formProfile.user,
        pass: formProfile.pass,
        from: formProfile.from || formProfile.user
      })
      setTestResult(res)
      if (res.success) {
        toast.success('SMTP connection test succeeded!')
      } else {
        toast.error(`SMTP Test Failed: ${res.error}`)
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message })
      toast.error(err.message || 'Connection test failed.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveSmtpProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProfile.name.trim() || !formProfile.host.trim() || !formProfile.user.trim()) {
      toast.error('Account Name, Host, and Username are required.')
      return
    }

    setSavingProfile(true)
    try {
      const res = await window.api.email.saveProfile(formProfile)
      if (res.success) {
        toast.success(editingProfileId ? 'Email profile updated!' : 'Email profile created successfully!')
        setIsFormOpen(false)
        await loadSmtpProfiles()
      } else {
        toast.error(res.error || 'Failed to save profile.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save email profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteSmtpProfile = (id: string, name: string) => {
    setConfirmTitle('Delete Email Account Profile')
    setConfirmDescription(`Are you sure you want to remove the email account profile "${name}"?`)
    setConfirmAction(() => async () => {
      setConfirmOpen(false)
      try {
        const res = await window.api.email.deleteProfile(id)
        if (res.success) {
          toast.success(`Profile "${name}" deleted.`)
          await loadSmtpProfiles()
        } else {
          toast.error(res.error || 'Failed to delete profile.')
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete profile.')
      }
    })
    setConfirmOpen(true)
  }

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
          setConfirmTitle('Download & Install Update')
          setConfirmDescription(`Are you sure you want to download and install version v${res.latestVersion}?`)
          setConfirmAction(() => () => triggerRemoteUpdate(res.url))
          setConfirmOpen(true)
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
    setConfirmDescription('Please select a downloaded installer executable (.exe) from your computer.')
    setConfirmAction(() => triggerLocalUpdate)
    setConfirmOpen(true)
  }

  const triggerRemoteUpdate = async (url: string) => {
    setConfirmOpen(false)
    setDownloadProgress(0)

    const unsubscribe = window.api.update.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    try {
      const res = await window.api.update.installRemote(url)
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
    setConfirmDescription(`Are you sure you want to download and install version v${updateInfo.latestVersion}?`)
    setConfirmAction(() => () => triggerRemoteUpdate(updateInfo.url))
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

  const navTabs = [
    { id: 'profile' as SettingsTab, label: 'Profile Info', icon: User },
    { id: 'email' as SettingsTab, label: 'Email Accounts', icon: Mail, badge: smtpProfiles.length },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Sun },
    { id: 'backup' as SettingsTab, label: 'Auto Backup', icon: RefreshCw },
    { id: 'storage' as SettingsTab, label: 'File Storage', icon: HardDrive },
    { id: 'security' as SettingsTab, label: 'Security & PIN', icon: Lock },
    { id: 'updates' as SettingsTab, label: 'Updates & About', icon: RefreshCw }
  ]

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <Breadcrumbs items={[{ label: 'Settings' }]} />

      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure your application preferences, profile details, email profiles, security, and storage</p>
      </div>

      {/* TABS NAVIGATION HEADER */}
      <div className="flex items-center gap-1.5 p-1 bg-card border rounded-xl mb-6 overflow-x-auto shrink-0 select-none">
        {navTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
              {typeof tab.badge !== 'undefined' && tab.badge > 0 && (
                <span className={cn(
                  'px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                  isActive ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT AREA (No outer page scroll, content is scrollable per tab) */}
      <div className="flex-1 overflow-auto max-w-4xl min-h-0">
        {/* ─── TAB 0: PROFILE INFORMATION ─── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">User Profile Information</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your contact details will automatically be included in generated project PDF summary reports.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={profileInfo.name}
                    onChange={(e) => setProfileInfo({ ...profileInfo, name: e.target.value })}
                    placeholder="e.g. Chirag Patel"
                    className="w-full px-3.5 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Email</label>
                  <input
                    type="email"
                    value={profileInfo.email}
                    onChange={(e) => setProfileInfo({ ...profileInfo, email: e.target.value })}
                    placeholder="e.g. chirag@example.com"
                    className="w-full px-3.5 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Phone / Mobile</label>
                  <input
                    type="text"
                    value={profileInfo.phone}
                    onChange={(e) => setProfileInfo({ ...profileInfo, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Company / Organization</label>
                  <input
                    type="text"
                    value={profileInfo.company}
                    onChange={(e) => setProfileInfo({ ...profileInfo, company: e.target.value })}
                    placeholder="e.g. Acme Studio Inc."
                    className="w-full px-3.5 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Job Title / Role</label>
                  <input
                    type="text"
                    value={profileInfo.role}
                    onChange={(e) => setProfileInfo({ ...profileInfo, role: e.target.value })}
                    placeholder="e.g. Senior Project Manager & Lead Developer"
                    className="w-full px-3.5 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={handleSaveProfileInfo}
                  disabled={savingProfileInfo}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingProfileInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Information
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 1: EMAIL ACCOUNTS ─── */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold">Email Accounts & Multiple SMTP Setup</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Save multiple email profiles (Gmail, Outlook, Yahoo, Custom) so you don't need to configure credentials every time you send a report.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddForm}
                  className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Email Profile
                </button>
              </div>

              {/* List of Saved SMTP Profiles */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Email Accounts ({smtpProfiles.length})
                </h3>

                {loadingProfiles ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : smtpProfiles.length === 0 ? (
                  <div className="text-center p-6 border border-dashed rounded-xl bg-muted/20 space-y-2">
                    <Mail className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No email profiles saved yet</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Add your email account (e.g. Gmail App Password, Outlook, or Custom Webmail) to send project PDFs directly from the app with one click.
                    </p>
                    <button
                      onClick={handleOpenAddForm}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Profile
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {smtpProfiles.map(prof => {
                      const isDefault = settings.default_smtp_profile_id === prof.id
                      return (
                        <div
                          key={prof.id}
                          className={cn(
                            'p-4 rounded-xl border bg-background shadow-sm transition-all flex flex-col justify-between space-y-3',
                            isDefault ? 'border-indigo-500/60 ring-1 ring-indigo-500/20' : 'hover:border-indigo-500/40'
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <Server className="w-4 h-4 text-indigo-500 shrink-0" />
                                {prof.name}
                                {isDefault && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    ★ Default
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                Port {prof.port}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              <p><strong className="text-foreground">User:</strong> {prof.user}</p>
                              <p><strong className="text-foreground">Host:</strong> {prof.host}</p>
                              {prof.from && <p><strong className="text-foreground">From:</strong> {prof.from}</p>}
                              <p className="text-[11px] text-muted-foreground/80">
                                Security: {prof.secure ? 'SSL/TLS (Encrypted)' : 'STARTTLS (Standard)'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs">
                            <div>
                              {!isDefault && prof.id && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateSetting('default_smtp_profile_id', prof.id!)
                                    toast.success(`"${prof.name}" set as default email profile!`)
                                  }}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                                >
                                  Set as Default
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditForm(prof)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded border hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSmtpProfile(prof.id!, prof.name)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded border hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Profile Form */}
              {isFormOpen && (
                <form onSubmit={handleSaveSmtpProfile} className="p-5 rounded-xl border bg-muted/20 space-y-4 animate-fade-in border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-500" />
                      {editingProfileId ? 'Edit Email Profile' : 'Add New Email Profile'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                      Quick Fill Preset:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SMTP_PRESETS.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                            formProfile.host === preset.host
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                              : 'hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Profile Name / Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={formProfile.name}
                        onChange={e => setFormProfile({ ...formProfile, name: e.target.value })}
                        placeholder="e.g. Work Gmail, Personal Mail"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        SMTP Host *
                      </label>
                      <input
                        type="text"
                        required
                        value={formProfile.host}
                        onChange={e => setFormProfile({ ...formProfile, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Username / Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formProfile.user}
                        onChange={e => setFormProfile({ ...formProfile, user: e.target.value })}
                        placeholder="your-name@gmail.com"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Password / App Password {editingProfileId && '(Leave blank to keep existing)'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formProfile.pass || ''}
                          onChange={e => setFormProfile({ ...formProfile, pass: e.target.value })}
                          placeholder="••••••••••••••••"
                          className="w-full px-3 py-1.5 pr-9 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        value={formProfile.port}
                        onChange={e => setFormProfile({ ...formProfile, port: parseInt(e.target.value) || 587 })}
                        placeholder="587"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Sender Name & Email (From)
                      </label>
                      <input
                        type="text"
                        value={formProfile.from}
                        onChange={e => setFormProfile({ ...formProfile, from: e.target.value })}
                        placeholder="Your Name <your-email@domain.com>"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formProfile.secure}
                        onChange={e => setFormProfile({ ...formProfile, secure: e.target.checked })}
                        className="rounded accent-indigo-500"
                      />
                      <span className="text-xs text-muted-foreground font-medium">Use SSL/TLS (port 465)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSmtpConnection}
                        disabled={testingConnection || !formProfile.host || !formProfile.user}
                        className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                        Test Connection
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Profile
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={cn(
                      'p-3 rounded-lg border text-xs flex items-center gap-2',
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    )}>
                      {testResult.success ? (
                        <><CheckCircle2 className="w-4 h-4 shrink-0" /> SMTP connection verified successfully!</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 shrink-0" /> Connection failed: {testResult.error}</>
                      )}
                    </div>
                  )}
                </form>
              )}

              {/* Step-by-Step Guide Accordion */}
              <div className="rounded-xl border bg-muted/20 overflow-hidden">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-foreground">
                      Step-by-Step Configuration Guide (Gmail, Outlook, Yahoo, Custom)
                    </span>
                  </div>
                  {showGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showGuide && (
                  <div className="p-5 border-t space-y-4 bg-background">
                    <div className="flex flex-wrap gap-2 border-b pb-3">
                      {[
                        { id: 'gmail', label: 'Gmail (App Password)' },
                        { id: 'outlook', label: 'Outlook / Office 365' },
                        { id: 'yahoo', label: 'Yahoo Mail' },
                        { id: 'custom', label: 'Custom / Webmail (cPanel)' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveGuideTab(tab.id as any)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer',
                            activeGuideTab === tab.id
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {activeGuideTab === 'gmail' && (
                      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-foreground font-medium">
                          📌 Gmail requires an <strong>App Password</strong> instead of your standard Gmail password.
                        </div>
                        <ol className="space-y-2 list-decimal list-inside pl-1 text-foreground/90">
                          <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-1 font-semibold">Google Account Security <ExternalLink className="w-3 h-3" /></a> page.</li>
                          <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
                          <li>Search for <strong>"App Passwords"</strong> in Google Account.</li>
                          <li>Create App Name (e.g. <code className="bg-muted px-1 rounded text-indigo-500 font-mono">PWM App</code>) and click <strong>Create</strong>.</li>
                          <li>Use the <strong>16-character password</strong> generated by Google into Password field.</li>
                        </ol>
                      </div>
                    )}

                    {activeGuideTab === 'outlook' && (
                      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-foreground font-medium">
                          📌 Microsoft Outlook / Office 365 setup details:
                        </div>
                        <ol className="space-y-2 list-decimal list-inside pl-1 text-foreground/90">
                          <li>Use SMTP Host: <strong className="text-foreground">smtp.office365.com</strong></li>
                          <li>Port: <strong className="text-foreground">587</strong> (STARTTLS)</li>
                          <li>Username: <strong className="text-foreground">yourname@outlook.com</strong></li>
                        </ol>
                      </div>
                    )}

                    {activeGuideTab === 'yahoo' && (
                      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-foreground font-medium">
                          📌 Yahoo Mail requires an App Password from Yahoo Account Security.
                        </div>
                        <ol className="space-y-2 list-decimal list-inside pl-1 text-foreground/90">
                          <li>Go to <strong>Yahoo Account Info &gt; Account Security</strong>.</li>
                          <li>Click <strong>Generate App Password</strong>.</li>
                          <li>Host: <strong className="text-foreground">smtp.mail.yahoo.com</strong>, Port: <strong className="text-foreground">465</strong> or <strong className="text-foreground">587</strong>.</li>
                        </ol>
                      </div>
                    )}

                    {activeGuideTab === 'custom' && (
                      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-foreground font-medium">
                          📌 Custom Webmail / cPanel / Server details:
                        </div>
                        <ol className="space-y-2 list-decimal list-inside pl-1 text-foreground/90">
                          <li>Use Host: <strong className="text-foreground">mail.yourdomain.com</strong> or <strong className="text-foreground">smtp.yourdomain.com</strong></li>
                          <li>Port: <strong className="text-foreground">465</strong> (SSL) or <strong className="text-foreground">587</strong> (TLS).</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 2: APPEARANCE ─── */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-1">Appearance</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose your preferred application theme</p>

              <div className="grid grid-cols-3 gap-4">
                {themes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value)
                      toast.success(`Theme updated to ${t.label}.`)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer',
                      theme === t.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted'
                    )}
                  >
                    <t.icon className={cn(
                      'w-8 h-8',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 3: AUTO BACKUP ─── */}
        {activeTab === 'backup' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-1">Automatic Backup</h2>
              <p className="text-sm text-muted-foreground mb-4">Configure background database & file backup automation</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                  <div>
                    <p className="text-sm font-semibold">Enable Automatic Backups</p>
                    <p className="text-xs text-muted-foreground">Automatically package your SQLite database and attachments into ZIP backups</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = settings.autoBackup === 'true' ? 'false' : 'true'
                      await updateSetting('autoBackup', newVal)
                      toast.success(newVal === 'true' ? 'Automatic backup enabled.' : 'Automatic backup disabled.')
                    }}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                      settings.autoBackup === 'true' ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                      settings.autoBackup === 'true' && 'translate-x-5'
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div>
                    <p className="text-sm font-semibold">Backup Frequency</p>
                    <p className="text-xs text-muted-foreground">Specify the interval in hours between automated backups</p>
                  </div>
                  <select
                    value={settings.backupInterval || '24'}
                    onChange={async (e) => {
                      await updateSetting('backupInterval', e.target.value)
                      toast.success(`Backup interval updated to ${e.target.value} hours.`)
                    }}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm outline-none cursor-pointer font-medium"
                  >
                    <option value="6">Every 6 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours (Daily)</option>
                    <option value="48">Every 48 hours</option>
                    <option value="168">Weekly</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 4: FILE STORAGE ─── */}
        {activeTab === 'storage' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">File Storage Locations</h2>
                <p className="text-sm text-muted-foreground">Specify custom directories for backup archives and exported PDF reports</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1 text-foreground">Custom Backup Export Directory</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings.backupLocation || ''}
                      placeholder="Default documents directory"
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm outline-none truncate"
                    />
                    <button
                      onClick={async () => {
                        const path = await window.api.settings.selectFolder()
                        if (path) {
                          await updateSetting('backupLocation', path)
                          toast.success('Backup folder updated.')
                        }
                      }}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Browse...
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1 text-foreground">Custom PDF Export Directory</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings.defaultPdfFolder || ''}
                      placeholder="Default documents directory"
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm outline-none truncate"
                    />
                    <button
                      onClick={async () => {
                        const path = await window.api.settings.selectFolder()
                        if (path) {
                          await updateSetting('defaultPdfFolder', path)
                          toast.success('PDF reports folder updated.')
                        }
                      }}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Browse...
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 5: SECURITY & PIN ─── */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-1">Security & Access Control</h2>
              <p className="text-sm text-muted-foreground mb-6">Manage your 6-digit access PIN and password recovery parameters</p>

              <div className="space-y-6">
                {/* Change PIN Section */}
                <div className="border-b pb-6">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-500" /> Change 6-Digit Lock PIN
                  </h3>
                  {pinSuccess && <p className="text-xs text-emerald-500 mb-2 font-medium">{pinSuccess}</p>}
                  {pinError && <p className="text-xs text-rose-500 mb-2 font-medium">{pinError}</p>}
                  <form onSubmit={handlePinChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="password"
                      placeholder="Current PIN"
                      maxLength={6}
                      value={currentPin}
                      onChange={e => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                      required
                    />
                    <input
                      type="password"
                      placeholder="New PIN (6 digits)"
                      maxLength={6}
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Update PIN
                    </button>
                  </form>
                </div>

                {/* Change Password Section */}
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" /> Change Security Recovery Password
                  </h3>
                  {pwdSuccess && <p className="text-xs text-emerald-500 mb-2 font-medium">{pwdSuccess}</p>}
                  {pwdError && <p className="text-xs text-rose-500 mb-2 font-medium">{pwdError}</p>}
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="password"
                        placeholder="Current Security Password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                        required
                      />
                      <input
                        type="password"
                        placeholder="New Password (min. 8 chars)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 6: UPDATES & ABOUT ─── */}
        {activeTab === 'updates' && (
          <div className="space-y-6 animate-fade-in">
            <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Application Updates</h2>
                <p className="text-sm text-muted-foreground">Check for online updates or perform manual local upgrades</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border text-sm">
                  <span className="font-semibold text-foreground">Installed Version</span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    v{currentVersion}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1 text-foreground">Update Manifest URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manifestUrl}
                      onChange={(e) => setManifestUrl(e.target.value)}
                      placeholder="https://raw.githubusercontent.com/Pritish229/MY-CRM/main/update.json"
                      className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await updateSetting('updateUrl', manifestUrl)
                        toast.success('Update URL saved.')
                      }}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 border text-secondary-foreground rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Save URL
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isChecking || downloadProgress !== null}
                    onClick={handleCheckForUpdates}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
                    {isChecking ? 'Checking for updates...' : 'Check Online Update'}
                  </button>
                  <button
                    type="button"
                    disabled={isChecking || downloadProgress !== null}
                    onClick={handleLocalUpdate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 border text-secondary-foreground text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    <FileDown className="w-4 h-4" />
                    Install Local Executable (.exe)
                  </button>
                </div>

                {updateError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {updateError}
                  </div>
                )}

                {updateInfo && (
                  <div className="p-4 rounded-lg border bg-muted/25 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {updateInfo.hasUpdate ? '🎉 New Version Available!' : '✨ Application is up to date'}
                      </span>
                      <span className="font-bold text-primary">v{updateInfo.latestVersion}</span>
                    </div>

                    {updateInfo.releaseNotes && (
                      <div className="text-xs text-muted-foreground bg-background p-3 rounded border max-h-24 overflow-y-auto whitespace-pre-line leading-relaxed">
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
                        Download & Install Update
                      </button>
                    )}

                    {downloadProgress !== null && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Downloading Update...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" /> About Application
              </h2>
              <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <p><strong className="text-foreground">App Name:</strong> Project Workspace Manager (PWM)</p>
                <p><strong className="text-foreground">Version:</strong> v{currentVersion}</p>
                <p><strong className="text-foreground">Architecture:</strong> Offline-first SQLite + Electron + React 19 + Vite</p>
                <p><strong className="text-foreground">License:</strong> MIT</p>
              </div>
            </section>
          </div>
        )}
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
