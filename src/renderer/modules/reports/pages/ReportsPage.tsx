import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, PageLoader } from '@/components/shared'
import { toast } from '@/stores/useToastStore'
import {
  FolderKanban,
  ListTodo,
  FileText,
  CheckSquare,
  Download,
  Calendar,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  BarChart2,
  ClipboardList,
  StickyNote,
  Paperclip,
  Mail,
  Send,
  X,
  CheckCircle2,
  Circle,
  Clock,
  Shield,
  RefreshCw,
  ChevronRight,
  Eye,
  EyeOff,
  Wifi,
  ChevronDown,
  Check,
  Search,
  Palette
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts'
import { cn, formatDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportTab = 'summary' | 'projects' | 'todos' | 'deliverables' | 'approvals'

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

interface SmtpProfile {
  id: string
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  from: string
}

interface EmailDialogState {
  open: boolean
  // Multi-recipient
  recipients: string[]
  recipientInput: string
  subject: string
  body: string
  smtpConfig: SmtpConfig
  pdfBase64: string | null
  pdfFilename: string
  sending: boolean
  testing: boolean
  testResult: { success: boolean; error?: string } | null
  showPass: boolean
  // SMTP Profiles
  profiles: SmtpProfile[]
  activeProfileId: string | null
  showSaveProfile: boolean
  profileNameInput: string
  savingProfile: boolean
  // Setup Guide
  showSetupGuide: boolean
  setupProvider: 'gmail' | 'outlook' | 'yahoo' | 'custom'
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const REPORT_TABS = [
  { id: 'summary' as ReportTab, label: 'Project Summary', icon: ClipboardList, color: 'text-indigo-500 bg-indigo-500/10' },
  { id: 'projects' as ReportTab, label: 'Projects', icon: FolderKanban, color: 'text-violet-500 bg-violet-500/10' },
  { id: 'todos' as ReportTab, label: 'Tasks', icon: ListTodo, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'deliverables' as ReportTab, label: 'Deliverables', icon: FileText, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'approvals' as ReportTab, label: 'Approvals', icon: CheckSquare, color: 'text-amber-500 bg-amber-500/10' }
]

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981', approved: '#10b981',
  in_progress: '#3b82f6', active: '#3b82f6', sent: '#3b82f6', ready: '#3b82f6',
  pending: '#f59e0b', draft: '#94a3b8', waiting_approval: '#f59e0b',
  blocked: '#ef4444', rejected: '#ef4444', cancelled: '#64748b', closed: '#64748b'
}

const PIE_PALETTE = ['#6366f1', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, warning = false }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; warning?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-3 animate-fade-in hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <span className={cn('text-3xl font-bold', warning ? 'text-rose-500' : 'text-foreground')}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#94a3b8'
  const label = status.replace(/_/g, ' ')
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{ borderColor: color + '44', backgroundColor: color + '18', color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = { urgent: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' }
  return <span className="w-2 h-2 rounded-full" style={{ backgroundColor: map[priority] || '#94a3b8' }} />
}

function ProgressRing({ percent, size = 80, strokeWidth = 8, color = '#6366f1', label }: {
  percent: number; size?: number; strokeWidth?: number; color?: string; label?: string
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.3em" fontSize={size / 5} fontWeight="bold" fill="currentColor">
          {percent}%
        </text>
      </svg>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

// ─── Setup Guide Data ─────────────────────────────────────────────────────────
const SETUP_PROVIDERS = {
  gmail: {
    label: 'Gmail',
    color: '#ea4335',
    smtpHint: { host: 'smtp.gmail.com', port: 587, secure: false },
    note: 'Gmail requires an App Password — your normal password will NOT work. You must enable 2-Step Verification first.',
    steps: [
      { text: 'Sign in and open Google Account Security', url: 'https://myaccount.google.com/security' },
      { text: 'Enable 2-Step Verification (required)', url: 'https://myaccount.google.com/signinoptions/two-step-verification' },
      { text: 'Open App Passwords page, choose App: Mail → Device: Other', url: 'https://myaccount.google.com/apppasswords' },
      { text: 'Generate → copy the 16-character password → paste it into Password field below', url: null },
      { text: 'Use host smtp.gmail.com  ·  port 587  ·  SSL off  (or port 465, SSL on)', url: null }
    ]
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    color: '#0078d4',
    smtpHint: { host: 'smtp.office365.com', port: 587, secure: false },
    note: 'Microsoft requires App Passwords when two-step verification is enabled on personal accounts.',
    steps: [
      { text: 'Open Microsoft Account Security settings', url: 'https://account.microsoft.com/security' },
      { text: 'Enable Two-step verification', url: 'https://account.microsoft.com/security' },
      { text: 'Under Advanced security → App passwords → create new', url: 'https://account.microsoft.com/security' },
      { text: 'Paste the generated password into the Password field below', url: null },
      { text: 'Use host smtp.office365.com  ·  port 587  ·  SSL off (STARTTLS)', url: null }
    ]
  },
  yahoo: {
    label: 'Yahoo Mail',
    color: '#6001d2',
    smtpHint: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    note: 'Yahoo requires an App Password. Enable two-step verification in your Yahoo account first.',
    steps: [
      { text: 'Open Yahoo Account Security', url: 'https://login.yahoo.com/account/security' },
      { text: 'Enable Two-step verification', url: 'https://login.yahoo.com/account/security' },
      { text: 'Go to App Passwords → Generate app password', url: 'https://login.yahoo.com/account/security/app-specific-passwords' },
      { text: 'Paste the generated password into the Password field below', url: null },
      { text: 'Use host smtp.mail.yahoo.com  ·  port 587', url: null }
    ]
  },
  custom: {
    label: 'Custom / Other',
    color: '#64748b',
    smtpHint: null,
    note: 'Contact your email provider or IT administrator for the correct SMTP host, port, and credentials.',
    steps: [
      { text: 'Ask your provider for the SMTP host, port number, and whether SSL/TLS is required', url: null },
      { text: 'Use your full email address as the Username', url: null },
      { text: 'If login fails, check whether your provider requires an App Password or specific authentication', url: null },
      { text: 'Common ports: 587 (STARTTLS/no SSL) or 465 (SSL/TLS)', url: null }
    ]
  }
} as const

type SetupProvider = keyof typeof SETUP_PROVIDERS

// ─── Email Dialog ──────────────────────────────────────────────────────────────
function EmailDialog({ state, onChange, onSend, onTest, onClose, onLoadProfiles, onSaveProfile, onDeleteProfile, onLoadProfilePass }: {
  state: EmailDialogState
  onChange: (patch: Partial<EmailDialogState>) => void
  onSend: () => void
  onTest: () => void
  onClose: () => void
  onLoadProfiles: () => void
  onSaveProfile: () => void
  onDeleteProfile: (id: string) => void
  onLoadProfilePass: (id: string) => void
}) {
  if (!state.open) return null

  const updateSmtp = (patch: Partial<SmtpConfig>) =>
    onChange({ smtpConfig: { ...state.smtpConfig, ...patch } })

  // Multi-recipient chip input handlers
  const addRecipient = (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return
    if (!state.recipients.includes(trimmed)) {
      onChange({ recipients: [...state.recipients, trimmed], recipientInput: '' })
    } else {
      onChange({ recipientInput: '' })
    }
  }

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addRecipient(state.recipientInput)
    } else if (e.key === 'Backspace' && !state.recipientInput && state.recipients.length > 0) {
      onChange({ recipients: state.recipients.slice(0, -1) })
    }
  }

  const removeRecipient = (email: string) =>
    onChange({ recipients: state.recipients.filter(r => r !== email) })

  const openLink = (url: string) => window.api.shell.openExternal(url)

  const activeProvider = SETUP_PROVIDERS[state.setupProvider]

  const applySmtpHint = () => {
    if (activeProvider.smtpHint) {
      updateSmtp(activeProvider.smtpHint)
    }
  }

  const canSend = !state.sending
    && state.recipients.length > 0
    && !!state.smtpConfig.host
    && !!state.smtpConfig.user
    && !!state.smtpConfig.pass
    && !!state.pdfBase64

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><Mail className="w-4 h-4" /></div>
            <div>
              <h2 className="font-semibold text-sm">Send Report via Email</h2>
              <p className="text-xs text-muted-foreground">PDF attached automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Attachment info */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">PDF Attached</p>
              <p className="text-xs text-muted-foreground truncate">{state.pdfFilename}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
          </div>

          {/* Email fields */}
          <div className="space-y-3">
            {/* Multi-recipient chip input */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                To <span className="normal-case font-normal">(press Enter or comma to add)</span>
              </label>
              <div className={cn(
                'min-h-[40px] flex flex-wrap gap-1.5 items-center px-2 py-1.5 rounded-lg border bg-background',
                'focus-within:ring-1 focus-within:ring-indigo-500'
              )}>
                {state.recipients.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {r}
                    <button type="button" onClick={() => removeRecipient(r)}
                      className="hover:text-rose-500 transition-colors cursor-pointer ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={state.recipientInput}
                  onChange={e => onChange({ recipientInput: e.target.value })}
                  onKeyDown={handleRecipientKeyDown}
                  onBlur={() => { if (state.recipientInput) addRecipient(state.recipientInput) }}
                  placeholder={state.recipients.length === 0 ? 'recipient@example.com' : ''}
                  className="flex-1 min-w-24 bg-transparent text-sm outline-none py-0.5 px-1"
                />
              </div>
              {state.recipients.length > 1 && (
                <p className="text-[10px] text-muted-foreground mt-1">{state.recipients.length} recipients — the PDF will be sent to all of them</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Subject</label>
              <input
                type="text"
                value={state.subject}
                onChange={e => onChange({ subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Message</label>
              <textarea
                rows={3}
                value={state.body}
                onChange={e => onChange({ body: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* ── SMTP Configuration Section ── */}
          <div className="space-y-3">
            {/* SMTP header row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SMTP Configuration</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Setup Guide toggle */}
                <button
                  onClick={() => onChange({ showSetupGuide: !state.showSetupGuide })}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer',
                    state.showSetupGuide ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'hover:bg-muted'
                  )}>
                  <ClipboardList className="w-3.5 h-3.5" />
                  How to set up SMTP?
                </button>
              </div>
            </div>

            {/* Setup Guide Panel */}
            {state.showSetupGuide && (
              <div className="rounded-xl border bg-muted/20 overflow-hidden">
                {/* Provider tabs */}
                <div className="flex border-b bg-muted/30">
                  {(Object.keys(SETUP_PROVIDERS) as SetupProvider[]).map(p => (
                    <button key={p}
                      onClick={() => onChange({ setupProvider: p })}
                      className={cn(
                        'flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer',
                        state.setupProvider === p
                          ? 'border-b-2 text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={state.setupProvider === p ? { borderColor: SETUP_PROVIDERS[p].color, color: SETUP_PROVIDERS[p].color } : {}}
                    >
                      {SETUP_PROVIDERS[p].label}
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-3">
                  {/* Provider note */}
                  <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{activeProvider.note}</p>
                  </div>

                  {/* Steps */}
                  <ol className="space-y-2">
                    {activeProvider.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs">
                        <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: activeProvider.color }}>
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5 text-foreground/80">
                          {step.url ? (
                            <button
                              onClick={() => openLink(step.url!)}
                              className="inline-flex items-center gap-0.5 text-indigo-500 hover:text-indigo-400 underline underline-offset-2 cursor-pointer font-medium text-left"
                            >
                              {step.text}
                              <ChevronRight className="w-3 h-3 shrink-0" />
                            </button>
                          ) : step.text}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {/* Apply SMTP hint button */}
                  {activeProvider.smtpHint && (
                    <button
                      onClick={applySmtpHint}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Auto-fill {activeProvider.label} SMTP settings
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Saved Profiles Dropdown Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select SMTP Profile
              </label>
              <select
                value={state.activeProfileId || ''}
                onChange={(e) => {
                  const profId = e.target.value
                  if (profId) {
                    onLoadProfilePass(profId)
                  } else {
                    onChange({ activeProfileId: null })
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="">Custom SMTP Credentials (No Profile)</option>
                {state.profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.user})
                  </option>
                ))}
              </select>
              {state.activeProfileId && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Profile auto-selected — ready to send!
                </p>
              )}
            </div>

            {/* SMTP fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-muted-foreground block mb-1">SMTP Host</label>
                <input value={state.smtpConfig.host} onChange={e => updateSmtp({ host: e.target.value })}
                  placeholder="smtp.gmail.com" className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Port</label>
                <input type="number" value={state.smtpConfig.port} onChange={e => updateSmtp({ port: parseInt(e.target.value) || 587 })}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Username / Email</label>
                <input value={state.smtpConfig.user} onChange={e => updateSmtp({ user: e.target.value })}
                  placeholder="you@gmail.com" className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Password / App Password</label>
                <div className="relative">
                  <input type={state.showPass ? 'text' : 'password'} value={state.smtpConfig.pass}
                    onChange={e => updateSmtp({ pass: e.target.value })}
                    placeholder={state.activeProfileId ? '(unchanged — leave blank to keep)' : '••••••••'}
                    className="w-full px-3 py-2 pr-9 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                  <button type="button" onClick={() => onChange({ showPass: !state.showPass })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {state.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">From Name / Email</label>
                <input value={state.smtpConfig.from} onChange={e => updateSmtp({ from: e.target.value })}
                  placeholder="Your Name <you@gmail.com>" className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={state.smtpConfig.secure} onChange={e => updateSmtp({ secure: e.target.checked })}
                    className="rounded accent-indigo-500" />
                  <span className="text-xs text-muted-foreground">Use SSL/TLS (port 465)</span>
                </label>
              </div>
            </div>

            {/* Save Profile row + test connection */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button onClick={onTest} disabled={state.testing || !state.smtpConfig.host}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                {state.testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                Test Connection
              </button>

              {!state.showSaveProfile ? (
                <button
                  onClick={() => onChange({ showSaveProfile: true, profileNameInput: state.activeProfileId ? (state.profiles.find(p => p.id === state.activeProfileId)?.name || '') : '' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {state.activeProfileId ? 'Update Profile' : 'Save as Profile'}
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={state.profileNameInput}
                    onChange={e => onChange({ profileNameInput: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') onSaveProfile(); if (e.key === 'Escape') onChange({ showSaveProfile: false }) }}
                    placeholder="Profile name (e.g. Gmail Work)"
                    className="px-2.5 py-1 rounded-lg border bg-background text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-44"
                  />
                  <button onClick={onSaveProfile} disabled={!state.profileNameInput.trim() || state.savingProfile}
                    className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50">
                    {state.savingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => onChange({ showSaveProfile: false })} className="px-2 py-1 rounded-lg border text-xs hover:bg-muted cursor-pointer">✕</button>
                </div>
              )}

              {state.testResult && (
                <span className={cn('text-xs font-medium flex items-center gap-1 ml-auto', state.testResult.success ? 'text-emerald-500' : 'text-rose-500')}>
                  {state.testResult.success
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Connected</>
                    : <><AlertTriangle className="w-3.5 h-3.5" /> {state.testResult.error}</>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
          <p className="text-[11px] text-muted-foreground">
            Need help? Click <button onClick={() => onChange({ showSetupGuide: true })} className="text-indigo-500 underline underline-offset-2 cursor-pointer">How to set up SMTP?</button>
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {state.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send{state.recipients.length > 1 ? ` to ${state.recipients.length}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Searchable Project Select Component ───────────────────────────────────────
function SearchableProjectSelect({
  projects,
  value,
  onChange,
  placeholder = 'All Projects'
}: {
  projects: Array<{ id: string; name: string; code: string; status?: string }>
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProject = projects.find(p => p.id === value)

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase().trim()
    return projects.filter(
      p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    )
  }, [projects, search])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selectedLabel = value === 'all'
    ? 'All Projects'
    : selectedProject
      ? `${selectedProject.code} — ${selectedProject.name}`
      : placeholder

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border bg-background text-xs font-medium transition-all cursor-pointer min-w-56 max-w-xs shadow-sm',
          open ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-80 rounded-xl border bg-card shadow-2xl z-50 overflow-hidden animate-scale-in flex flex-col max-h-80 border-border/80">
          <div className="p-2.5 border-b bg-muted/20 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search project code or name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange('all')
                setOpen(false)
                setSearch('')
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left',
                value === 'all'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                <span>All Projects</span>
              </div>
              {value === 'all' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>

            <div className="my-1 border-t border-border/40" />

            {filteredProjects.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center italic">
                No matching projects found
              </div>
            ) : (
              filteredProjects.map(proj => {
                const isSelected = value === proj.id
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onChange(proj.id)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left gap-2',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground shrink-0 uppercase border border-border/50">
                        {proj.code}
                      </span>
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          <div className="px-3 py-1.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex justify-between items-center shrink-0">
            <span>{projects.length} total projects</span>
            {search && <span>{filteredProjects.length} found</span>}
          </div>
        </div>
      )}
    </div>
  )
}

const PDF_THEME_LIST = [
  { id: 'indigo', name: 'Indigo Modern', desc: 'Sleek tech palette with indigo header', color: '#6366f1' },
  { id: 'emerald', name: 'Emerald Clean', desc: 'Fresh minimalist mint & green layout', color: '#10b981' },
  { id: 'navy', name: 'Corporate Navy', desc: 'Executive dark slate & steel theme', color: '#1e293b' },
  { id: 'amber', name: 'Sunset Amber', desc: 'Warm studio amber & ivory design', color: '#d97706' },
  { id: 'dark', name: 'Midnight Dark', desc: 'Obsidian charcoal with purple accent', color: '#0f172a' }
]

function PdfThemeSelector({
  value,
  onChange
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTheme = PDF_THEME_LIST.find(t => t.id === value) || PDF_THEME_LIST[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium transition-all cursor-pointer shadow-sm hover:border-primary/50',
          open && 'ring-2 ring-primary/20 border-primary'
        )}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: activeTheme.color }}
        />
        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider hidden sm:inline">Theme:</span>
        <span className="font-semibold text-foreground">{activeTheme.name}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ml-0.5', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl border bg-card shadow-2xl z-50 overflow-hidden animate-scale-in p-1.5 space-y-1 border-border/80">
          <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40 mb-1 flex items-center justify-between">
            <span>Select PDF Report Theme</span>
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          {PDF_THEME_LIST.map(theme => {
            const isSelected = value === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  onChange(theme.id)
                  setOpen(false)
                  toast.success(`PDF theme applied: ${theme.name}`)
                }}
                className={cn(
                  'w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer text-left gap-2.5',
                  isSelected
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: theme.color }}
                  />
                  <div className="min-w-0 flex flex-col">
                    <span className="font-medium text-xs truncate leading-snug">{theme.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{theme.desc}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Project Summary Tab ───────────────────────────────────────────────────────
function ProjectSummaryTab({ projectId, projects, onEmailOpen }: {
  projectId: string; projects: any[]; onEmailOpen: (pdfBase64: string, filename: string, projectName: string) => void
}) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfTheme, setPdfTheme] = useState<string>('indigo')

  const load = useCallback(async () => {
    if (!projectId || projectId === 'all') { setSummary(null); return }
    setLoading(true); setError(null)
    try {
      const data = await window.api.reports.getProjectFullSummary(projectId)
      setSummary(data)
    } catch {
      setError('Failed to load project summary')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleDownloadPdf = async () => {
    if (!summary) return
    setGeneratingPdf(true)
    try {
      const base64 = await window.api.reports.generateProjectSummaryPdf(summary, pdfTheme)
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `${summary.project.code}_summary_${pdfTheme}_${Date.now()}.pdf`
      link.click()
    } catch { alert('PDF generation failed') }
    finally { setGeneratingPdf(false) }
  }

  const handleOpenEmail = async () => {
    if (!summary) return
    setGeneratingPdf(true)
    try {
      const base64 = await window.api.reports.generateProjectSummaryPdf(summary, pdfTheme)
      const filename = `${summary.project.code}_summary.pdf`
      onEmailOpen(base64, filename, summary.project.name)
    } catch { alert('PDF generation failed') }
    finally { setGeneratingPdf(false) }
  }

  if (!projectId || projectId === 'all') {
    return (
      <EmptyState icon={ClipboardList} title="Select a Project"
        description="Choose a specific project from the dropdown above to view its full summary report." />
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  )

  if (error) return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
    </div>
  )

  if (!summary) return null

  const { project, client, todoStats, deliverableStats, notesCount, filesCount, totalFilesSize, todos, deliverables, recentActivity } = summary

  const todoChartData = [
    { name: 'Completed', value: todoStats.completed, fill: '#10b981' },
    { name: 'In Progress', value: todoStats.inProgress, fill: '#3b82f6' },
    { name: 'Pending', value: todoStats.pending, fill: '#f59e0b' },
    { name: 'Blocked', value: todoStats.blocked, fill: '#ef4444' },
    { name: 'Cancelled', value: todoStats.cancelled, fill: '#64748b' }
  ].filter(d => d.value > 0)

  const deliverableChartData = [
    { name: 'Approved', value: deliverableStats.approved, fill: '#10b981' },
    { name: 'Sent', value: deliverableStats.sent, fill: '#3b82f6' },
    { name: 'Ready', value: deliverableStats.ready, fill: '#6366f1' },
    { name: 'Draft', value: deliverableStats.draft, fill: '#94a3b8' },
    { name: 'Rejected', value: deliverableStats.rejected, fill: '#ef4444' }
  ].filter(d => d.value > 0)

  const radarData = [
    { subject: 'Completed', A: todoStats.completed },
    { subject: 'In Progress', A: todoStats.inProgress },
    { subject: 'Pending', A: todoStats.pending },
    { subject: 'Blocked', A: todoStats.blocked },
    { subject: 'Cancelled', A: todoStats.cancelled }
  ]

  const statusColors: Record<string, string> = { draft: '#94a3b8', active: '#3b82f6', waiting_approval: '#f59e0b', approved: '#10b981', rejected: '#ef4444', closed: '#64748b' }
  const projectStatusColor = statusColors[project.status] || '#6366f1'

  const activeTheme = PDF_THEME_LIST.find(t => t.id === pdfTheme) || PDF_THEME_LIST[0]

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: projectStatusColor }} />
          <span className="text-sm font-semibold text-foreground">{project.name}</span>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{project.code}</span>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom PDF Theme Selector */}
          <PdfThemeSelector value={pdfTheme} onChange={setPdfTheme} />

          <button onClick={handleDownloadPdf} disabled={generatingPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
          <button onClick={handleOpenEmail} disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50">
            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Share via Email
          </button>
        </div>
      </div>

      {/* Overdue warning */}
      {todoStats.overdue > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <strong>{todoStats.overdue} task{todoStats.overdue > 1 ? 's are' : ' is'} overdue</strong>
          <span className="text-xs text-muted-foreground">— requires immediate attention</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={todoStats.total} sub={`${todoStats.completionRate}% complete`} icon={ListTodo} color="bg-indigo-500/10 text-indigo-500" />
        <StatCard label="Completed Tasks" value={todoStats.completed} sub={`${todoStats.inProgress} in progress`} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="Deliverables" value={deliverableStats.total} sub={`${deliverableStats.approved} approved`} icon={FileText} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Notes & Files" value={`${notesCount} / ${filesCount}`} sub={formatBytes(totalFilesSize)} icon={StickyNote} color="bg-amber-500/10 text-amber-500" />
      </div>

      {/* Progress rings + project info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Todo completion ring */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Task Completion</h3>
          <div className="flex items-center justify-around">
            <ProgressRing percent={todoStats.completionRate} color="#10b981" label="Completed" size={90} />
            <div className="space-y-2 text-xs">
              {[
                { label: 'Completed', val: todoStats.completed, color: '#10b981' },
                { label: 'In Progress', val: todoStats.inProgress, color: '#3b82f6' },
                { label: 'Pending', val: todoStats.pending, color: '#f59e0b' },
                { label: 'Blocked', val: todoStats.blocked, color: '#ef4444' },
                { label: 'Cancelled', val: todoStats.cancelled, color: '#94a3b8' }
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold ml-auto">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deliverable ring */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Deliverable Approval</h3>
          <div className="flex items-center justify-around">
            <ProgressRing percent={deliverableStats.completionRate} color="#3b82f6" label="Approved" size={90} />
            <div className="space-y-2 text-xs">
              {[
                { label: 'Approved', val: deliverableStats.approved, color: '#10b981' },
                { label: 'Sent', val: deliverableStats.sent, color: '#3b82f6' },
                { label: 'Ready', val: deliverableStats.ready, color: '#6366f1' },
                { label: 'Draft', val: deliverableStats.draft, color: '#94a3b8' },
                { label: 'Rejected', val: deliverableStats.rejected, color: '#ef4444' }
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold ml-auto">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project details card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Project Info</h3>
          <div className="space-y-3 text-xs">
            {client && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Client</span>
                <span className="font-semibold">{client.name}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Priority</span>
              <div className="flex items-center gap-1.5">
                <PriorityDot priority={project.priority} />
                <span className="font-semibold capitalize">{project.priority}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Deadline</span>
              <span className="font-semibold">{project.deadline ? formatDate(project.deadline) : '—'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Created</span>
              <span className="font-semibold">{formatDate(project.createdAt)}</span>
            </div>
            {project.tags && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {project.tags.split(',').filter(Boolean).map((t: string) => (
                    <span key={t} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{t.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2 border-t grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-sm">{notesCount}</span>
                <span className="text-muted-foreground">notes</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold text-sm">{filesCount}</span>
                <span className="text-muted-foreground">files</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Todo Donut */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Task Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Breakdown of all todos by current status</p>
          {todoChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground italic">No tasks found</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={todoChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {todoChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deliverable Bar Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Deliverable Status Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Count of deliverables per status</p>
          {deliverableChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground italic">No deliverables found</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deliverableChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {deliverableChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Radar Chart for todos */}
        {radarData.some(r => r.A > 0) && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-1">Task Coverage Radar</h3>
            <p className="text-xs text-muted-foreground mb-4">Visual spread of task statuses</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar name="Tasks" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Notes & Files visual */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Workspace Assets</h3>
          <p className="text-xs text-muted-foreground mb-4">Notes and file usage overview</p>
          <div className="grid grid-cols-2 gap-4 h-48">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed gap-3"
              style={{ borderColor: '#f59e0b44', backgroundColor: '#f59e0b08' }}>
              <StickyNote className="w-10 h-10 text-amber-400" />
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">{notesCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Project Notes</div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed gap-3"
              style={{ borderColor: '#3b82f644', backgroundColor: '#3b82f608' }}>
              <Paperclip className="w-10 h-10 text-blue-400" />
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500">{filesCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Uploaded Files</div>
                <div className="text-[10px] text-muted-foreground">{formatBytes(totalFilesSize)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Todo list */}
      {todos.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Todos ({todos.length})</h3>
            {todoStats.overdue > 0 && (
              <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />{todoStats.overdue} overdue
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {todos.slice(0, 15).map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5"><PriorityDot priority={t.priority} /><span className="capitalize text-xs">{t.priority}</span></div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {t.dueDate ? (
                        <span className={cn(new Date(t.dueDate) < new Date() && t.status !== 'completed' ? 'text-rose-500 font-semibold' : '')}>
                          {formatDate(t.dueDate)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todos.length > 15 && (
              <p className="text-xs text-muted-foreground px-4 py-3 italic">+ {todos.length - 15} more tasks</p>
            )}
          </div>
        </div>
      )}

      {/* Deliverables list */}
      {deliverables.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold text-sm">Deliverables ({deliverables.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3 text-right">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliverables.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">v{d.version}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{d.fileName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Reports Page ─────────────────────────────────────────────────────────
const LEGACY_REPORT_TYPES = [
  { id: 'projects', label: 'Projects Overview', icon: FolderKanban },
  { id: 'todos', label: 'Tasks (Todos)', icon: ListTodo },
  { id: 'deliverables', label: 'Deliverables', icon: FileText },
  { id: 'approvals', label: 'Client Approvals', icon: CheckSquare }
] as const

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Email dialog state
  const [emailState, setEmailState] = useState<EmailDialogState>({
    open: false,
    recipients: [], recipientInput: '',
    subject: '', body: '',
    pdfBase64: null, pdfFilename: '',
    sending: false, testing: false, testResult: null, showPass: false,
    smtpConfig: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
    // Profiles
    profiles: [], activeProfileId: null,
    showSaveProfile: false, profileNameInput: '', savingProfile: false,
    // Setup Guide
    showSetupGuide: false, setupProvider: 'gmail'
  })

  const patchEmail = (patch: Partial<EmailDialogState>) => setEmailState(s => ({ ...s, ...patch }))

  // Fetch projects list
  useEffect(() => {
    window.api.projects.getAll({ archived: false })
      .then(setProjectsList)
      .catch(() => {})

    // Load saved SMTP config (legacy single-config)
    window.api.email.getSmtpConfig().then((cfg: any) => {
      patchEmail({ smtpConfig: { ...emailState.smtpConfig, ...cfg } })
    }).catch(() => {})

    // Load saved profiles
    window.api.email.getProfiles().then((profiles: SmtpProfile[]) => {
      patchEmail({ profiles })
    }).catch(() => {})
  }, [])

  // Fetch legacy report data for non-summary tabs
  useEffect(() => {
    if (activeTab === 'summary') return
    loadReportData()
  }, [activeTab, selectedProjectId])

  const loadReportData = async () => {
    setLoading(true); setError(null)
    const pid = selectedProjectId === 'all' ? undefined : selectedProjectId
    try {
      let data: any
      if (activeTab === 'projects') data = await window.api.reports.projectSummary(pid)
      else if (activeTab === 'todos') data = await window.api.reports.todoSummary(pid)
      else if (activeTab === 'deliverables') data = await window.api.reports.deliverableSummary(pid)
      else if (activeTab === 'approvals') data = await window.api.reports.approvalSummary(pid)
      setReportData(data)
    } catch { setError('Failed to fetch report data') }
    finally { setLoading(false) }
  }

  // Email handler — open dialog with generated PDF and auto-select default SMTP profile
  const openEmailDialog = async (pdfBase64: string, filename: string, projectName: string) => {
    // 1. Fetch saved profiles
    const profiles = await window.api.email.getProfiles().catch(() => [])

    // 2. Determine default profile ID (check project-specific first, then global default)
    let defaultId: string | null = null
    if (selectedProjectId && selectedProjectId !== 'all') {
      defaultId = await window.api.settings.get(`project_${selectedProjectId}_default_smtp_profile_id`).catch(() => null)
    }
    if (!defaultId) {
      defaultId = await window.api.settings.get('default_smtp_profile_id').catch(() => null)
    }

    // 3. Match profile
    let targetProfile = profiles.find((p: any) => p.id === defaultId)
    if (!targetProfile && profiles.length > 0) {
      targetProfile = profiles[0]
    }

    let loadedSmtpConfig: SmtpConfig = { host: '', port: 587, secure: false, user: '', pass: '', from: '' }
    let activeProfileId: string | null = null

    if (targetProfile) {
      activeProfileId = targetProfile.id
      const passRes: any = await window.api.email.getProfilePass(targetProfile.id).catch(() => ({ pass: '' }))
      loadedSmtpConfig = {
        host: targetProfile.host,
        port: targetProfile.port,
        secure: targetProfile.secure,
        user: targetProfile.user,
        pass: passRes.pass || '',
        from: targetProfile.from
      }
    } else {
      const cfg: any = await window.api.email.getSmtpConfig().catch(() => ({}))
      loadedSmtpConfig = {
        host: cfg.host || '',
        port: cfg.port || 587,
        secure: cfg.secure || false,
        user: cfg.user || '',
        pass: '',
        from: cfg.from || ''
      }
    }

    patchEmail({
      open: true,
      pdfBase64,
      pdfFilename: filename,
      recipients: [],
      recipientInput: '',
      subject: `Project Summary Report — ${projectName}`,
      body: `Hi,\n\nPlease find the attached project summary report for "${projectName}".\n\nThis report includes:\n• Task overview and completion metrics\n• Deliverable status breakdown\n• Notes and files summary\n\nBest regards`,
      testResult: null,
      showSaveProfile: false,
      showSetupGuide: false,
      profiles,
      activeProfileId,
      smtpConfig: loadedSmtpConfig
    })
  }

  const handleTestConnection = async () => {
    patchEmail({ testing: true, testResult: null })
    const result = await window.api.email.testConnection(emailState.smtpConfig)
    patchEmail({ testing: false, testResult: result })
  }

  const handleSendEmail = async () => {
    patchEmail({ sending: true })
    try {
      const result: any = await window.api.email.sendWithPdf({
        to: emailState.recipients,
        subject: emailState.subject,
        body: emailState.body,
        pdfBase64: emailState.pdfBase64,
        pdfFilename: emailState.pdfFilename,
        smtpConfig: emailState.smtpConfig
      })
      if (result.success) {
        patchEmail({ open: false, sending: false })
        alert(`✅ Email sent to ${emailState.recipients.join(', ')}!`)
      } else {
        patchEmail({ sending: false })
        alert(`Failed to send: ${result.error}`)
      }
    } catch {
      patchEmail({ sending: false })
      alert('Email sending failed. Please check your SMTP settings.')
    }
  }

  const handleLoadProfiles = async () => {
    const profiles = await window.api.email.getProfiles()
    patchEmail({ profiles })
  }

  const handleSaveProfile = async () => {
    const { profileNameInput, activeProfileId, smtpConfig } = emailState
    if (!profileNameInput.trim()) return
    patchEmail({ savingProfile: true })
    try {
      const result: any = await window.api.email.saveProfile({
        id: activeProfileId || undefined,
        name: profileNameInput.trim(),
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user,
        pass: smtpConfig.pass,
        from: smtpConfig.from
      })
      if (result.success) {
        const profiles = await window.api.email.getProfiles()
        patchEmail({
          profiles,
          activeProfileId: result.profile.id,
          showSaveProfile: false,
          savingProfile: false,
          profileNameInput: ''
        })
      } else {
        alert(`Failed to save profile: ${result.error}`)
        patchEmail({ savingProfile: false })
      }
    } catch {
      patchEmail({ savingProfile: false })
    }
  }

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Delete this SMTP profile?')) return
    await window.api.email.deleteProfile(id)
    const profiles = await window.api.email.getProfiles()
    patchEmail({ profiles, activeProfileId: emailState.activeProfileId === id ? null : emailState.activeProfileId })
  }

  const handleLoadProfilePass = async (id: string) => {
    const profile = emailState.profiles.find(p => p.id === id)
    if (!profile) return
    const passResult: any = await window.api.email.getProfilePass(id)
    patchEmail({
      activeProfileId: id,
      smtpConfig: {
        host: profile.host,
        port: profile.port,
        secure: profile.secure,
        user: profile.user,
        pass: passResult.pass || '',
        from: profile.from
      }
    })
  }

  // Legacy chart + stat helpers
  const chartData = useMemo(() => {
    if (!reportData || activeTab === 'summary') return []
    if (activeTab === 'projects') {
      if (selectedProjectId === 'all') {
        if (!Array.isArray(reportData)) return []
        const statuses = ['draft', 'active', 'waiting_approval', 'approved', 'rejected', 'closed']
        return statuses.map((s, i) => ({ name: s.replace('_', ' ').toUpperCase(), value: reportData.filter((p: any) => p.status === s).length, color: PIE_PALETTE[i] })).filter(d => d.value > 0)
      } else {
        if (Array.isArray(reportData) || !reportData.todos) return []
        const statuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled']
        return statuses.map((s, i) => ({ name: s.replace('_', ' ').toUpperCase(), value: reportData.todos.filter((t: any) => t.status === s).length, color: PIE_PALETTE[i] })).filter(d => d.value > 0)
      }
    }
    if (activeTab === 'todos') {
      if (!reportData.completed && !reportData.pending) return []
      return [
        { name: 'Completed', value: reportData.completed, color: '#10b981' },
        { name: 'In Progress', value: reportData.inProgress, color: '#3b82f6' },
        { name: 'Pending', value: reportData.pending, color: '#f59e0b' },
        { name: 'Blocked', value: reportData.blocked, color: '#ef4444' }
      ].filter(d => d.value > 0)
    }
    if (activeTab === 'deliverables') {
      return [
        { name: 'Approved', value: reportData.approved, color: '#10b981' },
        { name: 'Pending', value: reportData.pending, color: '#3b82f6' },
        { name: 'Rejected', value: reportData.rejected, color: '#ef4444' },
        { name: 'Other', value: Math.max(0, reportData.total - reportData.approved - reportData.pending - reportData.rejected), color: '#94a3b8' }
      ].filter(d => d.value > 0)
    }
    if (activeTab === 'approvals') {
      return [
        { name: 'Approved', value: reportData.approved, color: '#10b981' },
        { name: 'Changes Requested', value: reportData.rejected, color: '#ef4444' },
        { name: 'Pending', value: reportData.pending, color: '#f59e0b' }
      ].filter(d => d.value > 0)
    }
    return []
  }, [reportData, activeTab, selectedProjectId])

  const handleLegacyPdfExport = async () => {
    if (!reportData) return
    setExportingPdf(true)
    try {
      const base64 = await window.api.reports.generatePdf(activeTab, { data: 'see report' })
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `${activeTab}_report_${Date.now()}.pdf`
      link.click()
    } catch { alert('Failed to export PDF') }
    finally { setExportingPdf(false) }
  }

  const handleLegacyCsvExport = async () => {
    if (!reportData) return
    setExportingCsv(true)
    let headers: string[] = []
    let rows: string[][] = []
    if (activeTab === 'projects') {
      headers = ['Code', 'Name', 'Client', 'Status', 'Priority', 'Deadline']
      const list = Array.isArray(reportData) ? reportData : [reportData]
      rows = list.map((p: any) => [p.code, p.name, p.client?.name || '', p.status, p.priority, p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'])
    } else if (activeTab === 'todos') {
      headers = ['Title', 'Project', 'Status', 'Priority', 'Due Date']
      rows = (reportData.todos || []).map((t: any) => [t.title, t.project?.name || '', t.status, t.priority, t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'])
    } else if (activeTab === 'deliverables') {
      headers = ['Title', 'Project', 'Status', 'Version', 'File']
      rows = (reportData.deliverables || []).map((d: any) => [d.title, d.project?.name || '', d.status, `v${d.version}`, d.fileName || ''])
    } else if (activeTab === 'approvals') {
      headers = ['Deliverable', 'Project', 'Client', 'Status', 'Date', 'Comment']
      rows = (reportData.approvals || []).map((a: any) => [a.deliverable?.title || '', a.deliverable?.project?.name || '', a.client?.name || '', a.status, new Date(a.date).toLocaleDateString(), a.comment || ''])
    }
    try {
      const csv = await window.api.reports.generateCsv(headers, rows)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${activeTab}_report.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('CSV export failed') }
    finally { setExportingCsv(false) }
  }

  const isLegacyEmpty = useMemo(() => {
    if (!reportData) return true
    if (activeTab === 'projects') return Array.isArray(reportData) ? reportData.length === 0 : !reportData.id
    if (activeTab === 'todos') return !reportData.todos?.length
    if (activeTab === 'deliverables') return !reportData.deliverables?.length
    if (activeTab === 'approvals') return !reportData.approvals?.length
    return true
  }, [reportData, activeTab])

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }

  return (
    <>
      {/* Email Dialog */}
      <EmailDialog
        state={emailState}
        onChange={patchEmail}
        onSend={handleSendEmail}
        onTest={handleTestConnection}
        onClose={() => patchEmail({ open: false })}
        onLoadProfiles={handleLoadProfiles}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
        onLoadProfilePass={handleLoadProfilePass}
      />

      <div className="p-6 h-full flex flex-col overflow-hidden">
        <Breadcrumbs items={[{ label: 'Reports' }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Project insights, charts, PDF export and email sharing</p>
          </div>
          {activeTab !== 'summary' && (
            <div className="flex items-center gap-2">
              <button onClick={handleLegacyCsvExport} disabled={exportingCsv || isLegacyEmpty}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                CSV
              </button>
              <button onClick={handleLegacyPdfExport} disabled={exportingPdf || isLegacyEmpty}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50">
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Toolbar: tabs + project filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card mb-6 shrink-0 select-none">
          <div className="flex flex-wrap items-center gap-1.5">
            {REPORT_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setReportData(null) }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer',
                    isActive
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-transparent text-muted-foreground hover:text-foreground border-border hover:bg-muted/30'
                  )}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project:</span>
            <SearchableProjectSelect
              projects={projectsList}
              value={selectedProjectId}
              onChange={id => { setSelectedProjectId(id); setReportData(null) }}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto min-h-0 pb-6">
          {activeTab === 'summary' ? (
            <ProjectSummaryTab
              projectId={selectedProjectId}
              projects={projectsList}
              onEmailOpen={openEmailDialog}
            />
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          ) : isLegacyEmpty ? (
            <EmptyState icon={FolderKanban} title="No data available"
              description="Add projects, todos, or deliverables to start seeing analytics here." />
          ) : (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-5 h-80 shadow-sm flex flex-col">
                  <div>
                    <h3 className="font-semibold text-sm">Status Distribution</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Distribution of items by status</p>
                  </div>
                  <div className="flex-1 mt-4">
                    {chartData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                            {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 h-80 shadow-sm flex flex-col">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {activeTab === 'projects' && selectedProjectId === 'all' ? 'Projects by Priority' : 'Activity Metrics'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Quantitative breakdown</p>
                  </div>
                  <div className="flex-1 mt-4">
                    {activeTab === 'projects' && selectedProjectId === 'all' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={['low', 'medium', 'high', 'urgent'].map(pri => ({
                          name: pri.toUpperCase(),
                          count: Array.isArray(reportData) ? reportData.filter((p: any) => p.priority === pri).length : 0
                        }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col justify-center h-full space-y-3 px-2">
                        {chartData.map(stat => (
                          <div key={stat.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground font-medium">{stat.name}</span>
                              <span className="font-bold">{stat.value}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all duration-500"
                                style={{ backgroundColor: stat.color, width: `${chartData.reduce((a, b) => a + b.value, 0) > 0 ? (stat.value / chartData.reduce((a, b) => a + b.value, 0)) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-muted/20">
                  <h3 className="font-semibold text-sm">Detailed Data</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    {activeTab === 'projects' && (
                      <>
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                            <th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th>
                            <th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3 text-right">Deadline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(selectedProjectId === 'all' && Array.isArray(reportData) ? reportData : reportData && !Array.isArray(reportData) ? [reportData] : []).map((p: any) => (
                            <tr key={p.id} className="hover:bg-muted/10">
                              <td className="px-4 py-3"><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground font-mono">{p.code}</div></td>
                              <td className="px-4 py-3 text-muted-foreground">{p.client?.name || '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><PriorityDot priority={p.priority} /><span className="capitalize text-xs">{p.priority}</span></div></td>
                              <td className="px-4 py-3 text-right text-muted-foreground text-xs">{p.deadline ? formatDate(p.deadline) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {activeTab === 'todos' && (
                      <>
                        <thead><tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                          <th className="px-4 py-3">Title</th><th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3 text-right">Due Date</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                          {(reportData?.todos || []).map((t: any) => (
                            <tr key={t.id} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-medium">{t.title}</td>
                              <td className="px-4 py-3 text-muted-foreground">{t.project?.name || '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><PriorityDot priority={t.priority} /><span className="capitalize text-xs">{t.priority}</span></div></td>
                              <td className="px-4 py-3 text-right text-muted-foreground text-xs">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {activeTab === 'deliverables' && (
                      <>
                        <thead><tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                          <th className="px-4 py-3">Title</th><th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Status</th><th className="px-4 py-3">Version</th>
                          <th className="px-4 py-3 text-right">File</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                          {(reportData?.deliverables || []).map((d: any) => (
                            <tr key={d.id} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-medium">{d.title}</td>
                              <td className="px-4 py-3 text-muted-foreground">{d.project?.name || '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">v{d.version}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground text-xs">{d.fileName || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {activeTab === 'approvals' && (
                      <>
                        <thead><tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                          <th className="px-4 py-3">Deliverable</th><th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Date</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                          {(reportData?.approvals || []).map((a: any) => (
                            <tr key={a.id} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-medium">{a.deliverable?.title || '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{a.deliverable?.project?.name || '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{a.client?.name || '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                              <td className="px-4 py-3 text-right text-muted-foreground text-xs">{formatDate(a.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
