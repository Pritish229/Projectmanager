import { useToastStore, type Toast } from '@/stores/useToastStore'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const TOAST_COLORS = {
  success: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  error: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  info: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <style>{`
        @keyframes toast-in {
          0% { transform: translateY(12px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-toast-in {
          animation: toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.type] || Info
        const colorClass = TOAST_COLORS[t.type] || 'text-muted-foreground bg-muted border-border'

        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-card/95 backdrop-blur-md text-foreground transition-all animate-toast-in',
              t.type === 'success' && 'border-emerald-500/10 dark:border-emerald-500/20',
              t.type === 'error' && 'border-rose-500/10 dark:border-rose-500/20',
              t.type === 'warning' && 'border-amber-500/10 dark:border-amber-500/20',
              t.type === 'info' && 'border-indigo-500/10 dark:border-indigo-500/20'
            )}
          >
            {/* Type Icon */}
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 border', colorClass)}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-sm font-semibold tracking-tight">{t.title}</h4>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
