import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    active: 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30',
    waiting_approval: 'bg-amber-50 text-amber-950 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/30',
    approved: 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/30',
    rejected: 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30',
    closed: 'bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    pending: 'bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    in_progress: 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30',
    completed: 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/30',
    blocked: 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30',
    cancelled: 'bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    ready: 'bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/30',
    sent: 'bg-violet-50 text-violet-900 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-900/30',
    resubmitted: 'bg-amber-50 text-amber-950 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/30',
    changes_requested: 'bg-orange-50 text-orange-950 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/30'
  }
  return colors[status] || colors.draft
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    medium: 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30',
    high: 'bg-orange-50 text-orange-950 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/30',
    urgent: 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30'
  }
  return colors[priority] || colors.medium
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function generateProjectCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nums = '0123456789'
  let code = 'PRJ-'
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 3; i++) code += nums[Math.floor(Math.random() * nums.length)]
  return code
}

export function getFileList(fileNameStr?: string, filePathStr?: string): { name: string; path: string; index: number }[] {
  if (!fileNameStr) return []
  
  let names: string[] = []
  let paths: string[] = []
  
  try {
    names = JSON.parse(fileNameStr)
    if (!Array.isArray(names)) names = [fileNameStr]
  } catch {
    names = fileNameStr ? [fileNameStr] : []
  }
  
  try {
    paths = filePathStr ? JSON.parse(filePathStr) : []
    if (!Array.isArray(paths)) paths = filePathStr ? [filePathStr] : []
  } catch {
    paths = filePathStr ? [filePathStr] : []
  }
  
  return names.map((name, idx) => ({
    name,
    path: paths[idx] || '',
    index: idx
  }))
}

