import React from 'react'
import { type Invoice, type InvoiceItem } from '@/stores/useInvoiceStore'
import { formatDate } from '@/lib/utils'
import {
  X, Download, Mail, Printer, CheckCircle2, Send, AlertTriangle, Clock, Receipt, Building2, User, FileText
} from 'lucide-react'
import { toast } from '@/stores/useToastStore'

interface Props {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
  onDownloadPdf?: (invoice: Invoice) => void
  onSendEmail?: (invoice: Invoice) => void
}

export function InvoicePreviewModal({
  invoice,
  isOpen,
  onClose,
  onDownloadPdf,
  onSendEmail
}: Props) {
  if (!isOpen || !invoice) return null

  // Parse items safely if stored as string JSON
  let items: InvoiceItem[] = []
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || [])
  } catch {
    items = []
  }

  // Calculate Subtotal if missing or for accuracy
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  // Calculate discount amount
  let discountAmount = 0
  if (invoice.discountValue) {
    if (invoice.discountType === 'percentage') {
      discountAmount = (subtotal * invoice.discountValue) / 100
    } else {
      discountAmount = invoice.discountValue
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount)

  // Calculate tax amount
  let taxAmount = 0
  if (invoice.taxValue) {
    if (invoice.taxType === 'percentage') {
      taxAmount = (afterDiscount * invoice.taxValue) / 100
    } else {
      taxAmount = invoice.taxValue
    }
  }

  const calculatedTotal = invoice.totalAmount || (afterDiscount + taxAmount)

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'paid':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        )
      case 'sent':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Sent
          </span>
        )
      case 'overdue':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Overdue
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-600 border border-gray-500/20">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        )
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Invoice Preview</h2>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  #{invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">View and inspect full project invoice breakdown</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.status)}

            {onDownloadPdf && (
              <button
                onClick={() => onDownloadPdf(invoice)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-accent flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            )}

            {onSendEmail && (
              <button
                onClick={() => onSendEmail(invoice)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-accent flex items-center gap-1.5 transition-all cursor-pointer"
                title="Send Email"
              >
                <Mail className="w-3.5 h-3.5" /> Send Email
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-accent flex items-center gap-1.5 transition-all cursor-pointer hidden sm:flex"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Printable Invoice Document */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 bg-background">
          
          {/* Invoice Visual Sheet Container */}
          <div className="border rounded-xl p-6 md:p-8 bg-card shadow-sm space-y-8 print:border-none print:shadow-none">

            {/* Top Branding & Invoice Identifier */}
            <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b">
              {/* Company / Issuer Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {invoice.companyName ? invoice.companyName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{invoice.companyName || 'My Company'}</h3>
                </div>
                {invoice.companyEmail && (
                  <p className="text-xs text-muted-foreground">{invoice.companyEmail}</p>
                )}
                {invoice.companyAddress && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line max-w-xs">{invoice.companyAddress}</p>
                )}
              </div>

              {/* Invoice Meta Summary */}
              <div className="text-left md:text-right space-y-1.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-primary font-mono">INVOICE</h1>
                <div className="text-xs font-bold text-muted-foreground">
                  Invoice No: <span className="text-foreground font-mono">#{invoice.invoiceNumber}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Issue Date: <span className="text-foreground font-medium">{invoice.issueDate ? formatDate(invoice.issueDate) : 'N/A'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Due Date: <span className="text-foreground font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : 'Upon Receipt'}</span>
                </div>
              </div>
            </div>

            {/* Billed To / Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <User className="w-3.5 h-3.5 text-primary" /> Billed To
                </div>
                <div className="text-sm font-bold text-foreground">
                  {invoice.clientName || 'Client Recipient'}
                </div>
                {invoice.clientEmail && (
                  <div className="text-xs text-muted-foreground mt-0.5">{invoice.clientEmail}</div>
                )}
                {invoice.clientAddress && (
                  <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{invoice.clientAddress}</div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Payment Terms & Status
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Invoice Status:</span>
                    <span className="font-semibold text-foreground capitalize">{invoice.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span className="font-semibold text-foreground font-mono">{invoice.currency} ({invoice.currencySymbol})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                <FileText className="w-3.5 h-3.5 text-primary" /> Itemized Charges
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-muted-foreground w-12 text-center">#</th>
                      <th className="py-3 px-4 font-semibold text-muted-foreground">Description</th>
                      <th className="py-3 px-4 font-semibold text-muted-foreground text-center w-20">Qty</th>
                      <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-28">Unit Price</th>
                      <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground italic">
                          No line items specified.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-foreground">{item.description}</td>
                          <td className="py-3 px-4 text-center font-mono">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-mono">
                            {invoice.currencySymbol}{(Number(item.unitPrice) || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            {invoice.currencySymbol}{(Number(item.amount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Totals Summary Box */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              <div className="space-y-4 max-w-md w-full">
                {invoice.notes && (
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Notes</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.termsAndConditions && (
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Terms & Conditions</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{invoice.termsAndConditions}</p>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-72 bg-muted/30 border rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium text-foreground">
                    {invoice.currencySymbol}{subtotal.toFixed(2)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Discount {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}:</span>
                    <span className="font-mono font-medium">
                      -{invoice.currencySymbol}{discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tax {invoice.taxType === 'percentage' ? `(${invoice.taxValue}%)` : ''}:</span>
                    <span className="font-mono font-medium text-foreground">
                      +{invoice.currencySymbol}{taxAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Total Amount Due</span>
                  <span className="text-lg font-extrabold font-mono text-primary">
                    {invoice.currencySymbol}{calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
