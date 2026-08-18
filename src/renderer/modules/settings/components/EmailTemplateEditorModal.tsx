import { useState, useEffect } from 'react'
import { X, Sparkles, FileText, Check, Layers } from 'lucide-react'
import { EmailTemplate, useEmailTemplateStore } from '@/stores/useEmailTemplateStore'
import { toast } from '@/stores/useToastStore'

interface EmailTemplateEditorModalProps {
  open: boolean
  onClose: () => void
  template?: EmailTemplate | null
}

const TEMPLATE_VARIABLES = [
  { varName: '{{client_name}}', label: 'Client Name' },
  { varName: '{{invoice_number}}', label: 'Invoice #' },
  { varName: '{{amount}}', label: 'Amount' },
  { varName: '{{due_date}}', label: 'Due Date' },
  { varName: '{{company_name}}', label: 'Company Name' },
  { varName: '{{project_name}}', label: 'Project Name' }
]

export function EmailTemplateEditorModal({ open, onClose, template }: EmailTemplateEditorModalProps) {
  const { saveTemplate } = useEmailTemplateStore()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Custom')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (template) {
      setName(template.name || '')
      setCategory(template.category || 'Custom')
      setSubject(template.subject || '')
      setBody(template.body || '')
    } else {
      setName('')
      setCategory('Custom')
      setSubject('')
      setBody('')
    }
  }, [template, open])

  if (!open) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please provide a template name')
      return
    }
    if (!subject.trim()) {
      toast.error('Please provide a subject line')
      return
    }
    if (!body.trim()) {
      toast.error('Please provide template body content')
      return
    }

    setSaving(true)
    try {
      const ok = await saveTemplate({
        id: template?.id,
        name: name.trim(),
        category: category.trim() || 'Custom',
        subject: subject.trim(),
        body: body.trim(),
        isPrebuilt: template?.isPrebuilt || false
      })
      if (ok) {
        toast.success(template?.id ? 'Email template updated!' : 'New email template created!')
        onClose()
      } else {
        toast.error('Failed to save email template')
      }
    } catch (err: any) {
      toast.error('Error saving template')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (varName: string, field: 'subject' | 'body') => {
    if (field === 'subject') {
      setSubject(prev => prev + ' ' + varName)
    } else {
      setBody(prev => prev + ' ' + varName)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">
                {template ? (template.isPrebuilt ? 'Edit Prebuilt Email Template' : 'Edit Email Template') : 'Create Email Template'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure subject line and message body with dynamic placeholders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Standard Billing Notice"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Billing, Reminders, Progress"
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Variables helper */}
          <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Available Dynamic Placeholders (Click to insert):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map(v => (
                <div key={v.varName} className="inline-flex items-center gap-1 bg-background border px-2 py-1 rounded-lg text-xs font-mono">
                  <span className="text-foreground font-semibold">{v.varName}</span>
                  <div className="flex gap-1 border-l pl-1.5 ml-1">
                    <button
                      type="button"
                      onClick={() => insertVariable(v.varName, 'subject')}
                      className="text-[10px] text-indigo-400 hover:underline"
                    >
                      +Subject
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable(v.varName, 'body')}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      +Body
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Email Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Invoice {{invoice_number}} from {{company_name}}"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Email Body Message *
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder="Write template message body here..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Template</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
