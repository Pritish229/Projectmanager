import React, { useEffect, useState } from 'react'
import { useInvoiceStore, type InvoiceTemplate } from '@/stores/useInvoiceStore'
import { toast } from '@/stores/useToastStore'
import {
  X, Save, Download, Upload, Sparkles, Check, HelpCircle, Layout, Palette,
  FileText, Edit3, Settings2, Code, Tag, ChevronRight, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  template?: InvoiceTemplate | null
}

const PLACEHOLDER_TYPES = [
  { id: 'text', label: 'Single Line Text' },
  { id: 'multiline', label: 'Multi-line Text / Paragraph' },
  { id: 'currency', label: 'Currency / Amount' },
  { id: 'date', label: 'Date Picker' },
  { id: 'table', label: 'Line Items Table' },
  { id: 'badge', label: 'Status Badge' }
]

const DEFAULT_PLACEHOLDERS: Record<string, { label: string; type: string; alignment: string; fallback: string }> = {
  company_name: { label: 'Company / Sender Name', type: 'text', alignment: 'left', fallback: 'Acme Digital Inc.' },
  client_name: { label: 'Client / Recipient Name', type: 'text', alignment: 'left', fallback: 'Valued Client Ltd.' },
  invoice_number: { label: 'Invoice Identifier', type: 'text', alignment: 'right', fallback: 'INV-2026-001' },
  issue_date: { label: 'Issue Date', type: 'date', alignment: 'right', fallback: 'Jul 29, 2026' },
  due_date: { label: 'Payment Due Date', type: 'date', alignment: 'right', fallback: 'Aug 29, 2026' },
  items_table: { label: 'Line Items & Breakdown', type: 'table', alignment: 'left', fallback: 'Description | Qty | Price | Amount' },
  subtotal: { label: 'Subtotal Amount', type: 'currency', alignment: 'right', fallback: '$1,200.00' },
  discount: { label: 'Discount Amount', type: 'currency', alignment: 'right', fallback: '-$100.00' },
  tax: { label: 'Tax Amount', type: 'currency', alignment: 'right', fallback: '+$110.00' },
  total_amount: { label: 'Total Amount Due', type: 'currency', alignment: 'right', fallback: '$1,210.00' },
  currency_symbol: { label: 'Currency Symbol', type: 'text', alignment: 'left', fallback: '$' },
  terms_and_conditions: { label: 'Terms & Conditions', type: 'multiline', alignment: 'left', fallback: 'Payment due within 30 days.' },
  notes: { label: 'Additional Notes', type: 'multiline', alignment: 'left', fallback: 'Thank you for your business!' }
}

const COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#1e293b', // Slate
  '#06b6d4', // Cyan
  '#ec4899'  // Pink
]

const PRESET_THEMES = [
  {
    name: 'Modern Minimalist',
    description: 'Clean, contemporary design with subtle accent colors and generous whitespace.',
    layoutStyle: 'modern',
    headerTitle: 'INVOICE',
    companyName: 'Acme Digital Solutions',
    companyAddress: '123 Business Parkway, Suite 400\nTech City, CA 94016',
    companyEmail: 'billing@acmedigital.com',
    companyPhone: '+1 (800) 555-0199',
    primaryColor: '#3b82f6',
    termsAndConditions: 'Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge.',
    notes: 'Thank you for choosing Acme Digital Solutions! We appreciate your business.'
  },
  {
    name: 'Classic Corporate',
    description: 'Traditional corporate styling featuring strong header borders and structured sections.',
    layoutStyle: 'classic',
    headerTitle: 'TAX INVOICE',
    companyName: 'Global Enterprise Corp',
    companyAddress: '500 Financial Plaza, Floor 18\nNew York, NY 10005',
    companyEmail: 'finance@globalcorp.com',
    companyPhone: '+1 (212) 555-0144',
    primaryColor: '#1e293b',
    termsAndConditions: 'Terms: Net 30 Days. Direct wire transfer preferred.',
    notes: 'Please remit payment to Global Enterprise Corp bank account referenced above.'
  },
  {
    name: 'Creative Accent',
    description: 'Bold visual layout with vibrant header banner for creative studios and agency billing.',
    layoutStyle: 'creative',
    headerTitle: 'INVOICE',
    companyName: 'Vibrant Creative Studio',
    companyAddress: '789 Design Alley, Loft 3\nAustin, TX 78701',
    companyEmail: 'hello@vibrantcreative.co',
    companyPhone: '+1 (512) 555-8833',
    primaryColor: '#8b5cf6',
    termsAndConditions: '50% balance upon milestone completion. Remaining net 15 days.',
    notes: 'We love working with you! Reach out anytime for project support.'
  },
  {
    name: 'Emerald Agency',
    description: 'Fresh emerald green palette with sleek badges for marketing, SEO, and growth agencies.',
    layoutStyle: 'modern',
    headerTitle: 'STATEMENT OF INVOICE',
    companyName: 'Emerald Growth Labs',
    companyAddress: '45 Green Market St, Floor 4\nSan Francisco, CA 94103',
    companyEmail: 'billing@emeraldgrowth.io',
    companyPhone: '+1 (415) 555-0211',
    primaryColor: '#10b981',
    termsAndConditions: 'Payment due on receipt or within 14 calendar days.',
    notes: 'Thank you for partnering with Emerald Growth Labs!'
  },
  {
    name: 'Executive Dark',
    description: 'Sleek luxury charcoal tone accenting with gold highlights for C-level consulting & advising.',
    layoutStyle: 'compact',
    headerTitle: 'FEE INVOICE',
    companyName: 'Apex Advisory Partners',
    companyAddress: '100 Financial Tower, Penthouse A\nChicago, IL 60601',
    companyEmail: 'advisory@apexpartners.com',
    companyPhone: '+1 (312) 555-9900',
    primaryColor: '#334155',
    termsAndConditions: 'Consulting retainers billed in advance. Net 15 days.',
    notes: 'Wire transfer instructions: Apex Advisory Partners Account #987654321.'
  },
  {
    name: 'Cyber Neon Tech',
    description: 'Electric cyan theme tailored for SaaS startups, cloud engineering, and software contracts.',
    layoutStyle: 'modern',
    headerTitle: 'SERVICE INVOICE',
    companyName: 'NeonStack Systems',
    companyAddress: '600 Cyber Way, Suite 10\nSeattle, WA 98101',
    companyEmail: 'invoices@neonstack.dev',
    companyPhone: '+1 (206) 555-4040',
    primaryColor: '#06b6d4',
    termsAndConditions: 'SaaS subscription & cloud engineering billing. Net 30 days.',
    notes: 'Automated billing receipt from NeonStack Cloud Engine.'
  },
  {
    name: 'Warm Amber Studio',
    description: 'Inviting golden amber layout designed for photography, architecture, and design boutiques.',
    layoutStyle: 'creative',
    headerTitle: 'INVOICE',
    companyName: 'Amber Light Atelier',
    companyAddress: '42 Artisan Boulevard\nPortland, OR 97201',
    companyEmail: 'billing@amberatelier.com',
    companyPhone: '+1 (503) 555-7711',
    primaryColor: '#f59e0b',
    termsAndConditions: '50% deposit upon project start, 50% prior to final asset delivery.',
    notes: 'Thank you for creating beauty with Amber Light Atelier!'
  },
  {
    name: 'Monochrome Compact',
    description: 'High-density structured layout for hardware, physical deliverables, and line-item heavy billing.',
    layoutStyle: 'compact',
    headerTitle: 'BILL OF SALE / INVOICE',
    companyName: 'Precision Hardware Co',
    companyAddress: '15 Warehouse Road, Dock 8\nDetroit, MI 48201',
    companyEmail: 'orders@precisionhw.com',
    companyPhone: '+1 (313) 555-1234',
    primaryColor: '#475569',
    termsAndConditions: 'FOB Destination. Net 30 days from shipment date.',
    notes: 'Inspect items upon arrival. Claims must be filed within 7 days.'
  }
]

export function InvoiceTemplateEditorModal({ isOpen, onClose, template }: Props) {
  const { createTemplate, updateTemplate, importTemplate, exportTemplate } = useInvoiceStore()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    layoutStyle: 'modern',
    headerTitle: 'INVOICE',
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    primaryColor: '#3b82f6',
    termsAndConditions: 'Payment is due within 30 days of invoice date.',
    notes: 'Thank you for choosing us!',
    isDefault: false
  })

  const [placeholders, setPlaceholders] = useState<Record<string, any>>(DEFAULT_PLACEHOLDERS)
  const [selectedPlaceholderKey, setSelectedPlaceholderKey] = useState<string | null>(null)
  const [editingPlaceholder, setEditingPlaceholder] = useState<{ label: string; type: string; alignment: string; fallback: string }>({
    label: '', type: 'text', alignment: 'left', fallback: ''
  })
  const [importJsonText, setImportJsonText] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        layoutStyle: template.layoutStyle || 'modern',
        headerTitle: template.headerTitle || 'INVOICE',
        companyName: template.companyName || '',
        companyAddress: template.companyAddress || '',
        companyEmail: template.companyEmail || '',
        companyPhone: template.companyPhone || '',
        primaryColor: template.primaryColor || '#3b82f6',
        termsAndConditions: template.termsAndConditions || '',
        notes: template.notes || '',
        isDefault: !!template.isDefault
      })

      try {
        const parsed = JSON.parse(template.placeholdersConfig || '{}')
        setPlaceholders(Object.keys(parsed).length > 0 ? { ...DEFAULT_PLACEHOLDERS, ...parsed } : DEFAULT_PLACEHOLDERS)
      } catch {
        setPlaceholders(DEFAULT_PLACEHOLDERS)
      }
    } else {
      setFormData({
        name: 'New Custom Template',
        description: 'Custom invoice layout with personalized placeholders.',
        layoutStyle: 'modern',
        headerTitle: 'INVOICE',
        companyName: 'My Business Corp',
        companyAddress: '100 Innovation Way\nSuite 200',
        companyEmail: 'billing@mybusiness.com',
        companyPhone: '+1 555-0100',
        primaryColor: '#3b82f6',
        termsAndConditions: 'Payment due within 30 days.',
        notes: 'Thank you for your business!',
        isDefault: false
      })
      setPlaceholders(DEFAULT_PLACEHOLDERS)
    }
  }, [template, isOpen])

  if (!isOpen) return null

  const handleOpenPlaceholderEditor = (key: string) => {
    setSelectedPlaceholderKey(key)
    const existing = placeholders[key] || { label: key, type: 'text', alignment: 'left', fallback: '' }
    setEditingPlaceholder({
      label: existing.label || key,
      type: existing.type || 'text',
      alignment: existing.alignment || 'left',
      fallback: existing.fallback || ''
    })
  }

  const handleSavePlaceholder = () => {
    if (!selectedPlaceholderKey) return
    setPlaceholders((prev) => ({
      ...prev,
      [selectedPlaceholderKey]: { ...editingPlaceholder }
    }))
    setSelectedPlaceholderKey(null)
    toast.info('Placeholder updated', `Saved settings for {{${selectedPlaceholderKey}}}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Template name is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        placeholdersConfig: JSON.stringify(placeholders)
      }

      if (template?.id) {
        await updateTemplate(template.id, payload)
        toast.success('Template Updated', 'Invoice template changes saved successfully.')
      } else {
        await createTemplate(payload)
        toast.success('Template Created', 'New invoice template created successfully.')
      }
      onClose()
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to save template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImportSubmit = async () => {
    if (!importJsonText.trim()) return
    const res = await importTemplate(importJsonText)
    if (res.success) {
      toast.success('Imported', 'Template imported successfully.')
      setShowImportDialog(false)
      onClose()
    } else {
      toast.error('Import Failed', res.error || 'Invalid JSON format')
    }
  }

  const handleExportClick = async () => {
    if (template?.id) {
      const json = await exportTemplate(template.id)
      if (json) {
        navigator.clipboard.writeText(json)
        toast.success('Exported to Clipboard', 'Template JSON copied to clipboard.')
      }
    } else {
      const draftObj = { ...formData, placeholdersConfig: placeholders }
      navigator.clipboard.writeText(JSON.stringify(draftObj, null, 2))
      toast.success('Exported Draft', 'Template draft JSON copied to clipboard.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {template ? 'Edit Invoice Template' : 'Create Custom Invoice Template'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Customize template styling, company info, terms, and interactive placeholders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent flex items-center gap-1.5 transition-colors"
              title="Import template JSON"
            >
              <Upload className="w-3.5 h-3.5" /> Import Template
            </button>
            <button
              onClick={handleExportClick}
              className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent flex items-center gap-1.5 transition-colors"
              title="Export template JSON"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Grid: Left Controls (Form), Right Live Preview with Placeholders */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x border-b">
          
          {/* Left Panel: Form Settings */}
          <div className="lg:col-span-5 p-6 space-y-6 overflow-y-auto max-h-[75vh]">
            
            {/* Quick Pre-built Theme Presets Selector */}
            <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Apply Pre-built Theme Preset
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">1-Click Load</span>
              </div>
              <select
                className="w-full px-3 py-1.5 text-xs rounded-md border bg-background font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                defaultValue=""
                onChange={(e) => {
                  const selected = PRESET_THEMES.find((t) => t.name === e.target.value)
                  if (selected) {
                    setFormData((prev) => ({
                      ...prev,
                      name: prev.name && prev.name !== 'New Custom Template' ? prev.name : selected.name,
                      description: selected.description,
                      layoutStyle: selected.layoutStyle,
                      headerTitle: selected.headerTitle,
                      companyName: selected.companyName,
                      companyAddress: selected.companyAddress,
                      companyEmail: selected.companyEmail,
                      companyPhone: selected.companyPhone,
                      primaryColor: selected.primaryColor,
                      termsAndConditions: selected.termsAndConditions,
                      notes: selected.notes
                    }))
                    toast.success('Theme Preset Applied', `Loaded "${selected.name}" styling into template editor.`)
                  }
                }}
              >
                <option value="" disabled>-- Select a Pre-built Theme Preset --</option>
                {PRESET_THEMES.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.layoutStyle})
                  </option>
                ))}
              </select>
            </div>

            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <FileText className="w-4 h-4" /> Template Details
              </h3>
              
              <div>
                <label className="block text-xs font-medium mb-1">Template Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="e.g. Modern Minimalist, Tech Studio Invoice"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Brief description of layout..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Header Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-semibold"
                    placeholder="INVOICE"
                    value={formData.headerTitle}
                    onChange={(e) => setFormData({ ...formData, headerTitle: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Layout Style</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    value={formData.layoutStyle}
                    onChange={(e) => setFormData({ ...formData, layoutStyle: e.target.value })}
                  >
                    <option value="modern">Modern Minimalist</option>
                    <option value="classic">Classic Corporate</option>
                    <option value="creative">Creative Accent</option>
                    <option value="compact">Executive Compact</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" /> Primary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: col })}
                      className={cn(
                        'w-7 h-7 rounded-full transition-transform border-2',
                        formData.primaryColor === col ? 'scale-110 border-foreground shadow-md' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    className="w-8 h-8 rounded border p-0 cursor-pointer bg-transparent"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sender / Company Info */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Settings2 className="w-4 h-4" /> Company Details (Sender)
              </h3>

              <div>
                <label className="block text-xs font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Address</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Street, Suite, City, Country"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                    placeholder="billing@acme.com"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                    placeholder="+1 800-555-0199"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Default Terms & Conditions */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <FileText className="w-4 h-4" /> Default Terms & Notes
              </h3>

              <div>
                <label className="block text-xs font-medium mb-1">Terms & Conditions</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Default terms for invoices created with this template..."
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes / Payment Instructions</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Bank details or thank you notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span className="text-xs font-medium">Set as system default template</span>
              </label>
            </div>

          </div>

          {/* Right Panel: Interactive Visual Template Preview with Clickable Placeholders */}
          <div className="lg:col-span-7 p-6 bg-muted/20 flex flex-col space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Interactive Template Customizer</h3>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Click any placeholder block to configure type & label
              </span>
            </div>

            {/* Template Sheet Preview Container */}
            <div className="bg-card text-card-foreground border rounded-xl shadow-lg p-6 sm:p-8 space-y-6 relative overflow-hidden transition-all">
              
              {/* Header Banner Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-2.5"
                style={{ backgroundColor: formData.primaryColor }}
              />

              {/* Top Row: Company Info & Title */}
              <div className="flex items-start justify-between gap-4 pt-2">
                <div className="space-y-1">
                  <div className="text-xl font-bold tracking-tight" style={{ color: formData.primaryColor }}>
                    {formData.headerTitle || 'INVOICE'}
                  </div>
                  
                  {/* Clickable Company Name Placeholder */}
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('company_name')}
                    className="group relative border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 px-2 py-1 rounded text-left transition-all"
                  >
                    <span className="text-xs font-semibold block">{formData.companyName || placeholders.company_name?.fallback || 'Company Name'}</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      &#123;&#123;company_name&#125;&#125;
                    </span>
                    <span className="absolute -top-2 -right-2 hidden group-hover:flex bg-primary text-primary-foreground text-[9px] px-1 rounded shadow">
                      Edit
                    </span>
                  </button>
                </div>

                <div className="text-right space-y-1">
                  {/* Clickable Invoice Number Placeholder */}
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('invoice_number')}
                    className="group relative border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 px-2 py-1 rounded text-right transition-all inline-block"
                  >
                    <span className="text-sm font-mono font-bold block">#INV-2026-001</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      &#123;&#123;invoice_number&#125;&#125;
                    </span>
                  </button>

                  <div className="flex flex-col text-xs text-muted-foreground gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPlaceholderEditor('issue_date')}
                      className="border border-dashed border-muted-foreground/30 hover:border-primary px-1.5 py-0.5 rounded text-right"
                    >
                      Issue Date: &#123;&#123;issue_date&#125;&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPlaceholderEditor('due_date')}
                      className="border border-dashed border-muted-foreground/30 hover:border-primary px-1.5 py-0.5 rounded text-right"
                    >
                      Due Date: &#123;&#123;due_date&#125;&#125;
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipient Details Row */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/30">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Billed To</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('client_name')}
                    className="group border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 px-2 py-1 rounded text-left w-full transition-all"
                  >
                    <span className="text-xs font-semibold block">Client Name / Business</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      &#123;&#123;client_name&#125;&#125;
                    </span>
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Currency & Payment</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('currency_symbol')}
                    className="border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 px-2 py-1 rounded text-left w-full transition-all"
                  >
                    <span className="text-xs font-semibold block">Symbol: &#123;&#123;currency_symbol&#125;&#125; ($ / € / £ / ₹ / etc)</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">Auto-adapts to selected currency</span>
                  </button>
                </div>
              </div>

              {/* Line Items Placeholder Table */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Items & Services</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('items_table')}
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    Configure &#123;&#123;items_table&#125;&#125;
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div
                    className="grid grid-cols-12 px-3 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>

                  <div className="divide-y text-xs">
                    <div className="grid grid-cols-12 px-3 py-2 text-muted-foreground">
                      <div className="col-span-6 font-medium text-foreground">Web Application Design & Development</div>
                      <div className="col-span-2 text-center">1</div>
                      <div className="col-span-2 text-right">$1,200.00</div>
                      <div className="col-span-2 text-right font-semibold text-foreground">$1,200.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtotal / Discount / Tax / Total Box */}
              <div className="flex flex-col items-end space-y-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenPlaceholderEditor('subtotal')}
                  className="text-xs text-muted-foreground hover:text-primary font-mono border border-dashed border-transparent hover:border-primary px-2 py-0.5 rounded"
                >
                  Subtotal: &#123;&#123;subtotal&#125;&#125; ($1,200.00)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPlaceholderEditor('discount')}
                  className="text-xs text-muted-foreground hover:text-primary font-mono border border-dashed border-transparent hover:border-primary px-2 py-0.5 rounded"
                >
                  Discount: &#123;&#123;discount&#125;&#125; (-$100.00)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPlaceholderEditor('tax')}
                  className="text-xs text-muted-foreground hover:text-primary font-mono border border-dashed border-transparent hover:border-primary px-2 py-0.5 rounded"
                >
                  Tax: &#123;&#123;tax&#125;&#125; (+$110.00)
                </button>

                {/* Total Accent Box */}
                <button
                  type="button"
                  onClick={() => handleOpenPlaceholderEditor('total_amount')}
                  className="flex items-center justify-between gap-6 px-4 py-2 rounded-lg text-white font-bold text-sm transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-base">&#123;&#123;total_amount&#125;&#125; ($1,210.00)</span>
                </button>
              </div>

              {/* Terms & Notes Placeholders */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs">
                <div>
                  <span className="font-bold text-muted-foreground block mb-1">Terms & Conditions</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('terms_and_conditions')}
                    className="border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 p-2 rounded text-left w-full transition-all"
                  >
                    <p className="text-muted-foreground line-clamp-2">{formData.termsAndConditions || 'Payment due within 30 days.'}</p>
                    <span className="text-[10px] text-primary font-mono block mt-1">&#123;&#123;terms_and_conditions&#125;&#125;</span>
                  </button>
                </div>

                <div>
                  <span className="font-bold text-muted-foreground block mb-1">Notes / Instructions</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholderEditor('notes')}
                    className="border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 p-2 rounded text-left w-full transition-all"
                  >
                    <p className="text-muted-foreground line-clamp-2">{formData.notes || 'Thank you for your business!'}</p>
                    <span className="text-[10px] text-primary font-mono block mt-1">&#123;&#123;notes&#125;&#125;</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="text-xs text-muted-foreground">
            {Object.keys(placeholders).length} active placeholders configured
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Template
            </button>
          </div>
        </div>

      </div>

      {/* Sub-modal: Placeholder Config Editor */}
      {selectedPlaceholderKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card text-card-foreground border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> Configure Placeholder:
                <span className="font-mono text-primary">&#123;&#123;{selectedPlaceholderKey}&#125;&#125;</span>
              </h3>
              <button
                onClick={() => setSelectedPlaceholderKey(null)}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Display Label</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  value={editingPlaceholder.label}
                  onChange={(e) => setEditingPlaceholder({ ...editingPlaceholder, label: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Placeholder Type</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  value={editingPlaceholder.type}
                  onChange={(e) => setEditingPlaceholder({ ...editingPlaceholder, type: e.target.value })}
                >
                  {PLACEHOLDER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Alignment</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  value={editingPlaceholder.alignment}
                  onChange={(e) => setEditingPlaceholder({ ...editingPlaceholder, alignment: e.target.value })}
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Center Aligned</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Default Fallback Text</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background font-mono text-xs"
                  value={editingPlaceholder.fallback}
                  onChange={(e) => setEditingPlaceholder({ ...editingPlaceholder, fallback: e.target.value })}
                  placeholder="Fallback value..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedPlaceholderKey(null)}
                className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlaceholder}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Save Placeholder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Import JSON */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card text-card-foreground border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Import Template JSON
              </h3>
              <button onClick={() => setShowImportDialog(false)} className="p-1 rounded hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Paste Template JSON</label>
              <textarea
                rows={8}
                className="w-full p-3 font-mono text-xs rounded-md border bg-background focus:outline-none"
                placeholder='{"name": "Custom Invoice", "headerTitle": "INVOICE", ...}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Import & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
