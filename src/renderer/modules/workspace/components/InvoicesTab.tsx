import React, { useEffect, useState, useMemo } from 'react'
import { useInvoiceStore, type Invoice, type InvoiceItem, type InvoiceTemplate } from '@/stores/useInvoiceStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { toast } from '@/stores/useToastStore'
import { ConfirmDialog } from '@/components/shared'
import { cn, formatDate } from '@/lib/utils'
import {
  Receipt, Plus, Search, Filter, Download, Mail, Edit3, Trash2, CheckCircle2,
  Clock, AlertTriangle, FileText, Send, Sparkles, DollarSign, Eye, RefreshCw, X, ChevronDown
} from 'lucide-react'

interface Props {
  projectId: string
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)' }
]

const RupeeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13h5a4 4 0 0 0 0-8" />
    <path d="M6 13l7 8" />
  </svg>
)

export function InvoicesTab({ projectId }: Props) {
  const { currentProject } = useProjectStore()
  const {
    projectInvoices, templates, loadingInvoices,
    fetchProjectInvoices, fetchTemplates, createInvoice, updateInvoice,
    deleteInvoice, updateInvoiceStatus, generatePdf, sendEmail
  } = useInvoiceStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectCurrency, setProjectCurrency] = useState<{ code: string; symbol: string }>({ code: 'INR', symbol: '₹' })

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isSendMailOpen, setIsSendMailOpen] = useState(false)
  const [mailInvoice, setMailInvoice] = useState<Invoice | null>(null)

  // Confirm delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Send Email Form state
  const [smtpProfiles, setSmtpProfiles] = useState<any[]>([])
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingMail, setSendingMail] = useState(false)

  // Editor Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('draft')
  const [currency, setCurrency] = useState('INR')
  const [currencySymbol, setCurrencySymbol] = useState('₹')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: 'Initial Services / Deliverable', quantity: 1, unitPrice: 1000, amount: 1000 }
  ])
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [taxType, setTaxType] = useState<'percentage' | 'flat'>('percentage')
  const [taxValue, setTaxValue] = useState<number>(0)
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (projectId) {
      fetchProjectInvoices(projectId)
    }
    fetchTemplates()
    loadSmtpProfiles()

    // Fetch default currency from system settings
    window.api.settings.get('default_currency').then((savedCurrency) => {
      if (savedCurrency) {
        const found = CURRENCIES.find((c) => c.code === savedCurrency || c.symbol === savedCurrency)
        if (found) {
          setProjectCurrency({ code: found.code, symbol: found.symbol })
          setCurrency(found.code)
          setCurrencySymbol(found.symbol)
        }
      }
    }).catch(() => {})
  }, [projectId, fetchProjectInvoices, fetchTemplates])

  const loadSmtpProfiles = async () => {
    try {
      const profiles = await window.api.email.getProfiles()
      setSmtpProfiles(profiles || [])
      if (profiles && profiles.length > 0) {
        setSelectedSmtpId(profiles[0].id)
      }
    } catch {
      setSmtpProfiles([])
    }
  }

  // Handle Currency change: automatically reflects symbol!
  const handleCurrencyChange = (currCode: string) => {
    setCurrency(currCode)
    const found = CURRENCIES.find((c) => c.code === currCode)
    if (found) {
      setCurrencySymbol(found.symbol)
    }
  }

  // Handle Template change: populates default company info & terms
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId)
    const tmpl = templates.find((t) => t.id === tmplId)
    if (tmpl) {
      if (tmpl.companyName) setCompanyName(tmpl.companyName)
      if (tmpl.companyAddress) setCompanyAddress(tmpl.companyAddress)
      if (tmpl.companyEmail) setCompanyEmail(tmpl.companyEmail)
      if (tmpl.termsAndConditions) setTermsAndConditions(tmpl.termsAndConditions)
      if (tmpl.notes) setNotes(tmpl.notes)
    }
  }

  const openCreateModal = () => {
    setEditingInvoice(null)
    const nextInvNumber = `INV-${Date.now().toString().slice(-6)}`
    setInvoiceNumber(nextInvNumber)
    setIssueDate(new Date().toISOString().split('T')[0])
    
    // Set 30 days default due date
    const d30 = new Date()
    d30.setDate(d30.getDate() + 30)
    setDueDate(d30.toISOString().split('T')[0])

    setStatus('draft')
    setCurrency(projectCurrency.code)
    setCurrencySymbol(projectCurrency.symbol)

    // Pre-fill client from project if available
    const client = currentProject?.client
    setClientName(client?.name || client?.company || '')
    setClientEmail(client?.email || '')
    setClientAddress('')

    // Default template
    const defTmpl = templates.find((t) => t.isDefault) || templates[0]
    if (defTmpl) {
      setSelectedTemplateId(defTmpl.id)
      setCompanyName(defTmpl.companyName || '')
      setCompanyAddress(defTmpl.companyAddress || '')
      setCompanyEmail(defTmpl.companyEmail || '')
      setTermsAndConditions(defTmpl.termsAndConditions || '')
      setNotes(defTmpl.notes || '')
    } else {
      setSelectedTemplateId('')
      setCompanyName('My Company')
      setCompanyAddress('')
      setCompanyEmail('')
      setTermsAndConditions('Payment due within 30 days.')
      setNotes('Thank you for your business!')
    }

    setLineItems([
      { description: 'Professional Services', quantity: 1, unitPrice: 1500, amount: 1500 }
    ])
    setDiscountType('percentage')
    setDiscountValue(0)
    setTaxType('percentage')
    setTaxValue(0)

    setIsEditorOpen(true)
  }

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv)
    setSelectedTemplateId(inv.templateId || '')
    setInvoiceNumber(inv.invoiceNumber)
    setIssueDate(inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '')
    setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '')
    setStatus(inv.status)
    setCurrency(inv.currency)
    setCurrencySymbol(inv.currencySymbol)
    setClientName(inv.clientName)
    setClientEmail(inv.clientEmail)
    setClientAddress(inv.clientAddress)
    setCompanyName(inv.companyName)
    setCompanyAddress(inv.companyAddress)
    setCompanyEmail(inv.companyEmail)

    try {
      const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
      setLineItems(Array.isArray(items) && items.length > 0 ? items : [{ description: 'Item', quantity: 1, unitPrice: 0, amount: 0 }])
    } catch {
      setLineItems([{ description: 'Item', quantity: 1, unitPrice: 0, amount: 0 }])
    }

    setDiscountType(inv.discountType)
    setDiscountValue(inv.discountValue)
    setTaxType(inv.taxType)
    setTaxValue(inv.taxValue)
    setTermsAndConditions(inv.termsAndConditions)
    setNotes(inv.notes)

    setIsEditorOpen(true)
  }

  // Line item helpers
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: val }
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(val) : item.quantity
        const price = field === 'unitPrice' ? Number(val) : item.unitPrice
        item.amount = qty * price
      }
      updated[index] = item
      return updated
    })
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: 'New Service Item', quantity: 1, unitPrice: 100, amount: 100 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculations
  const calculatedSubtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
  }, [lineItems])

  const calculatedDiscountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (calculatedSubtotal * (Number(discountValue) || 0)) / 100
    }
    return Number(discountValue) || 0
  }, [calculatedSubtotal, discountType, discountValue])

  const calculatedAfterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscountAmount)

  const calculatedTaxAmount = useMemo(() => {
    if (taxType === 'percentage') {
      return (calculatedAfterDiscount * (Number(taxValue) || 0)) / 100
    }
    return Number(taxValue) || 0
  }, [calculatedAfterDiscount, taxType, taxValue])

  const calculatedTotal = Math.max(0, calculatedAfterDiscount + calculatedTaxAmount)

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceNumber.trim()) {
      toast.error('Validation Error', 'Invoice Number is required.')
      return
    }

    const payload = {
      projectId,
      templateId: selectedTemplateId || null,
      invoiceNumber,
      issueDate,
      dueDate: dueDate || null,
      status,
      currency,
      currencySymbol,
      clientName,
      clientEmail,
      clientAddress,
      companyName,
      companyAddress,
      companyEmail,
      items: lineItems,
      discountType,
      discountValue,
      taxType,
      taxValue,
      termsAndConditions,
      notes
    }

    try {
      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, payload)
        toast.success('Invoice Saved', `Invoice #${invoiceNumber} updated.`)
      } else {
        await createInvoice(payload)
        toast.success('Invoice Created', `Invoice #${invoiceNumber} created.`)
      }
      setIsEditorOpen(false)
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to save invoice')
    }
  }

  const handleDownloadPdf = async (inv: Invoice) => {
    toast.info('Generating PDF', 'Preparing invoice document...')
    const res = await generatePdf(inv.id)
    if (res.success) {
      toast.success('PDF Exported', `Saved to ${res.filePath}`)
    } else if (!res.canceled) {
      toast.error('PDF Generation Failed', res.error || 'Failed to export PDF')
    }
  }

  const openMailDialog = (inv: Invoice) => {
    setMailInvoice(inv)
    setRecipientEmail(inv.clientEmail || currentProject?.client?.email || '')
    setEmailSubject(`Invoice #${inv.invoiceNumber} for ${currentProject?.name || 'Project'}`)
    setEmailBody(
      `Hello ${inv.clientName || 'Valued Client'},\n\nPlease find attached invoice #${inv.invoiceNumber} for your review.\n\nTotal Amount Due: ${inv.currencySymbol}${inv.totalAmount.toFixed(2)}\nDue Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon Receipt'}\n\nThank you for working with us!`
    )
    setIsSendMailOpen(true)
  }

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mailInvoice) return
    if (!recipientEmail.trim()) {
      toast.error('Validation Error', 'Recipient email is required.')
      return
    }

    setSendingMail(true)
    try {
      const res = await sendEmail({
        invoiceId: mailInvoice.id,
        smtpProfileId: selectedSmtpId,
        recipientEmail,
        subject: emailSubject,
        bodyMessage: emailBody
      })

      if (res.success) {
        toast.success('Email Sent', `Invoice #${mailInvoice.invoiceNumber} emailed to ${recipientEmail}`)
        setIsSendMailOpen(false)
      } else {
        toast.error('Email Failed', res.error || 'Failed to send email')
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Email dispatch error')
    } finally {
      setSendingMail(false)
    }
  }

  // Filtered List & Metrics
  const filteredInvoices = useMemo(() => {
    return projectInvoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [projectInvoices, searchTerm, statusFilter])

  const metrics = useMemo(() => {
    const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const paidAmount = projectInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const pendingAmount = projectInvoices
      .filter((inv) => inv.status === 'draft' || inv.status === 'sent')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const overdueCount = projectInvoices.filter((inv) => inv.status === 'overdue').length

    const defaultSym = projectInvoices[0]?.currencySymbol || projectCurrency.symbol

    return { totalInvoiced, paidAmount, pendingAmount, overdueCount, defaultSym }
  }, [projectInvoices, projectCurrency])

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1"><Send className="w-3 h-3" /> Sent</span>
      case 'overdue':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</span>
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/10 text-gray-600 border border-gray-500/20">Cancelled</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Draft</span>
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 pb-12">

      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Invoiced Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {metrics.defaultSym === '₹' ? <RupeeIcon className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Invoiced</div>
            <div className="text-lg font-extrabold font-mono">
              {metrics.defaultSym}{metrics.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            {metrics.defaultSym === '₹' ? <RupeeIcon className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Paid</div>
            <div className="text-lg font-extrabold font-mono text-emerald-600">
              {metrics.defaultSym}{metrics.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Pending / Sent Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Pending / Sent</div>
            <div className="text-lg font-extrabold font-mono text-blue-600">
              {metrics.defaultSym}{metrics.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Overdue Invoices</div>
            <div className="text-lg font-extrabold font-mono text-red-600">
              {metrics.overdueCount}
            </div>
          </div>
        </div>

      </div>

      {/* Action Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice # or client..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="px-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Project Invoice
        </button>
      </div>

      {/* Invoices List / Cards */}
      {loadingInvoices ? (
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Loading project invoices...
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card/50 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-mono">
            {metrics.defaultSym === '₹' ? <RupeeIcon className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
          </div>
          <h3 className="text-base font-bold">No Invoices Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'No invoices match your current search and filter criteria.'
              : 'Generate invoices for this project, customize line items, apply discounts, export clean PDFs, and email clients.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Generate First Invoice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="border rounded-xl bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              {/* Primary Color Accent Header */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: inv.template?.primaryColor || '#3b82f6' }}
              />

              <div>
                <div className="flex items-start justify-between gap-2 pt-1 mb-2">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground font-mono block">
                      #{inv.invoiceNumber}
                    </span>
                    <h4 className="text-sm font-bold truncate max-w-[180px]">
                      {inv.clientName || 'Client Recipient'}
                    </h4>
                  </div>
                  {getStatusBadge(inv.status)}
                </div>

                <div className="bg-muted/40 p-3 rounded-lg border my-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase block">Total Amount</span>
                    <span className="text-base font-extrabold font-mono text-foreground">
                      {inv.currencySymbol}{inv.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase block">Currency</span>
                    <span className="text-xs font-bold font-mono text-primary">{inv.currency}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Issue Date:</span>
                    <span className="font-medium text-foreground">{inv.issueDate ? formatDate(inv.issueDate) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span className="font-medium text-foreground">{inv.dueDate ? formatDate(inv.dueDate) : 'Upon Receipt'}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownloadPdf(inv)}
                    className="p-2 rounded-lg border hover:bg-accent text-foreground transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openMailDialog(inv)}
                    className="p-2 rounded-lg border hover:bg-accent text-foreground transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openEditModal(inv)}
                    className="p-2 rounded-lg border hover:bg-accent text-foreground transition-colors"
                    title="Edit Invoice"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Status Selector */}
                <div className="flex items-center gap-1">
                  <select
                    className="text-[11px] font-medium border rounded-md px-2 py-1 bg-background"
                    value={inv.status}
                    onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <button
                    onClick={() => {
                      setDeletingId(inv.id)
                      setDeleteConfirmOpen(true)
                    }}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal: Create & Edit Invoice */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingInvoice ? `Edit Invoice #${editingInvoice.invoiceNumber}` : 'Generate New Invoice'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Customize line items, currency symbol, subtotal, discounts, taxes, and payment terms
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Row 1: Template & General Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border bg-muted/20">
                <div>
                  <label className="block text-xs font-semibold mb-1">Invoice Template</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="">Standard Default</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Invoice #</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background font-mono font-bold"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Currency & Recipient Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Currency selector */}
                <div className="space-y-3 p-4 rounded-xl border">
                  <h3 className="text-xs font-bold uppercase text-primary tracking-wider">Currency Configuration</h3>
                  <div>
                    <label className="block text-xs font-medium mb-1">Select Currency</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-md border bg-background font-medium"
                      value={currency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Reflected Symbol</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-md border bg-muted font-bold font-mono text-center text-primary"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                    />
                  </div>
                </div>

                {/* Client Recipient Details */}
                <div className="space-y-3 p-4 rounded-xl border">
                  <h3 className="text-xs font-bold uppercase text-primary tracking-wider">Client (Recipient)</h3>
                  <div>
                    <input
                      type="text"
                      placeholder="Client / Company Name"
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background mb-2 font-medium"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="Client Email Address"
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background mb-2"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                    <textarea
                      rows={2}
                      placeholder="Billing Address..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Company Sender Details */}
                <div className="space-y-3 p-4 rounded-xl border">
                  <h3 className="text-xs font-bold uppercase text-primary tracking-wider">Company (Sender)</h3>
                  <div>
                    <input
                      type="text"
                      placeholder="Sender Company Name"
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background mb-2 font-medium"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="Sender Email Address"
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background mb-2"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                    />
                    <textarea
                      rows={2}
                      placeholder="Company Address..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border bg-background"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Line Items Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Invoice Line Items & Services
                  </h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-3 py-1 text-xs font-semibold rounded-md border border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/60 px-4 py-2 text-xs font-bold text-muted-foreground border-b">
                    <div className="col-span-6">Description / Service</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price ({currencySymbol})</div>
                    <div className="col-span-2 text-right pr-4">Amount ({currencySymbol})</div>
                  </div>

                  <div className="divide-y bg-background">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 px-4 py-2.5 items-center gap-2">
                        <div className="col-span-6">
                          <input
                            type="text"
                            className="w-full px-2.5 py-1 text-xs rounded border bg-background"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder="Description of work..."
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            className="w-full px-2 py-1 text-xs rounded border bg-background text-center font-mono"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1 text-xs rounded border bg-background text-right font-mono"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {currencySymbol}{Number(item.amount).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            disabled={lineItems.length <= 1}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Totals & Calculations Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                
                {/* Terms and Notes */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Terms & Conditions</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Notes / Instructions</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Subtotal, Discounts, Taxes & Total Box */}
                <div className="bg-muted/30 p-5 rounded-xl border space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Subtotal:</span>
                    <span className="font-mono font-bold text-sm">
                      {currencySymbol}{calculatedSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Discount Config */}
                  <div className="flex items-center justify-between gap-2 text-xs border-t pt-2">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1">
                      Discount:
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-2 py-1 text-xs border rounded bg-background"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                      >
                        <option value="percentage">% Percentage</option>
                        <option value="flat">Flat ({currencySymbol})</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-2 py-1 text-xs border rounded bg-background font-mono text-right"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                      />
                      <span className="font-mono text-red-500 font-bold min-w-[70px] text-right">
                        -{currencySymbol}{calculatedDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Tax Config */}
                  <div className="flex items-center justify-between gap-2 text-xs border-t pt-2">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1">
                      Tax:
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-2 py-1 text-xs border rounded bg-background"
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value as any)}
                      >
                        <option value="percentage">% Percentage</option>
                        <option value="flat">Flat ({currencySymbol})</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-2 py-1 text-xs border rounded bg-background font-mono text-right"
                        value={taxValue}
                        onChange={(e) => setTaxValue(Number(e.target.value))}
                      />
                      <span className="font-mono font-bold min-w-[70px] text-right">
                        +{currencySymbol}{calculatedTaxAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Total Highlight Box */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow mt-3">
                    <span>Total Amount Due:</span>
                    <span className="font-mono text-lg">{currencySymbol}{calculatedTotal.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" /> Save Invoice
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Invoice via Email */}
      {isSendMailOpen && mailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="w-5 h-5" />
                <h3 className="text-base font-bold">Send Invoice #{mailInvoice.invoiceNumber}</h3>
              </div>
              <button onClick={() => setIsSendMailOpen(false)} className="p-1 rounded hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold mb-1">Select Email Account Profile (SMTP)</label>
                {smtpProfiles.length === 0 ? (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-md border border-amber-500/20">
                    No email profiles found. Please create an email profile in Settings first.
                  </div>
                ) : (
                  <select
                    className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                    value={selectedSmtpId}
                    onChange={(e) => setSelectedSmtpId(e.target.value)}
                  >
                    {smtpProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.user})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email Message</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span>Invoice PDF will be generated and automatically attached to this email.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsSendMailOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMail || smtpProfiles.length === 0}
                  className="px-5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> {sendingMail ? 'Sending...' : 'Send Invoice Email'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (deletingId) {
            setDeleteConfirmOpen(false)
            await deleteInvoice(deletingId)
            toast.success('Invoice Deleted', 'Invoice deleted successfully.')
          }
        }}
        title="Delete Invoice"
        description="Are you sure you want to permanently delete this invoice record?"
        confirmLabel="Delete"
        variant="danger"
      />

    </div>
  )
}
