import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getPrisma } from '../database'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as nodemailer from 'nodemailer'

const DEFAULT_TEMPLATES = [
  {
    name: 'Modern Minimalist',
    description: 'Clean, contemporary design with subtle accent colors and generous whitespace.',
    isDefault: true,
    layoutStyle: 'modern',
    headerTitle: 'INVOICE',
    companyName: 'Acme Digital Solutions',
    companyAddress: '123 Business Parkway, Suite 400\nTech City, CA 94016',
    companyEmail: 'billing@acmedigital.com',
    companyPhone: '+1 (800) 555-0199',
    primaryColor: '#3b82f6',
    termsAndConditions: 'Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge.',
    notes: 'Thank you for choosing Acme Digital Solutions! We appreciate your business.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Company Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Name', type: 'text', alignment: 'left' },
      invoice_number: { label: 'Invoice #', type: 'text', alignment: 'right' },
      issue_date: { label: 'Issue Date', type: 'date', alignment: 'right' },
      due_date: { label: 'Due Date', type: 'date', alignment: 'right' },
      items_table: { label: 'Line Items Table', type: 'table', alignment: 'left' },
      subtotal: { label: 'Subtotal Amount', type: 'currency', alignment: 'right' },
      discount: { label: 'Discount', type: 'currency', alignment: 'right' },
      tax: { label: 'Tax Amount', type: 'currency', alignment: 'right' },
      total_amount: { label: 'Total Amount Due', type: 'currency', alignment: 'right' },
      currency_symbol: { label: 'Currency Symbol', type: 'text', alignment: 'left' },
      terms_and_conditions: { label: 'Terms & Conditions', type: 'multiline', alignment: 'left' }
    })
  },
  {
    name: 'Classic Corporate',
    description: 'Traditional corporate styling featuring strong header borders and structured sections.',
    isDefault: false,
    layoutStyle: 'classic',
    headerTitle: 'TAX INVOICE',
    companyName: 'Global Enterprise Corp',
    companyAddress: '500 Financial Plaza, Floor 18\nNew York, NY 10005',
    companyEmail: 'finance@globalcorp.com',
    companyPhone: '+1 (212) 555-0144',
    primaryColor: '#1e293b',
    termsAndConditions: 'Terms: Net 30 Days. Direct wire transfer preferred.',
    notes: 'Please remit payment to Global Enterprise Corp bank account referenced above.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Company Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Name', type: 'text', alignment: 'left' },
      invoice_number: { label: 'Invoice #', type: 'text', alignment: 'right' },
      issue_date: { label: 'Date of Issue', type: 'date', alignment: 'right' },
      due_date: { label: 'Payment Due', type: 'date', alignment: 'right' },
      items_table: { label: 'Items & Services', type: 'table', alignment: 'left' },
      total_amount: { label: 'Grand Total', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Creative Accent',
    description: 'Bold visual layout with vibrant header banner for creative studios and agency billing.',
    isDefault: false,
    layoutStyle: 'creative',
    headerTitle: 'INVOICE',
    companyName: 'Vibrant Creative Studio',
    companyAddress: '789 Design Alley, Loft 3\nAustin, TX 78701',
    companyEmail: 'hello@vibrantcreative.co',
    companyPhone: '+1 (512) 555-8833',
    primaryColor: '#8b5cf6',
    termsAndConditions: '50% balance upon milestone completion. Remaining net 15 days.',
    notes: 'We love working with you! Reach out anytime for project support.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Studio Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Name', type: 'text', alignment: 'left' },
      items_table: { label: 'Services Breakdown', type: 'table', alignment: 'left' },
      total_amount: { label: 'Total Due', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Emerald Agency',
    description: 'Fresh emerald green palette with sleek badges for marketing, SEO, and growth agencies.',
    isDefault: false,
    layoutStyle: 'modern',
    headerTitle: 'STATEMENT OF INVOICE',
    companyName: 'Emerald Growth Labs',
    companyAddress: '45 Green Market St, Floor 4\nSan Francisco, CA 94103',
    companyEmail: 'billing@emeraldgrowth.io',
    companyPhone: '+1 (415) 555-0211',
    primaryColor: '#10b981',
    termsAndConditions: 'Payment due on receipt or within 14 calendar days.',
    notes: 'Thank you for partnering with Emerald Growth Labs!',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Agency Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Name', type: 'text', alignment: 'left' },
      items_table: { label: 'Campaign Services', type: 'table', alignment: 'left' },
      total_amount: { label: 'Amount Payable', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Executive Dark',
    description: 'Sleek luxury charcoal tone accenting with gold highlights for C-level consulting & advising.',
    isDefault: false,
    layoutStyle: 'compact',
    headerTitle: 'FEE INVOICE',
    companyName: 'Apex Advisory Partners',
    companyAddress: '100 Financial Tower, Penthouse A\nChicago, IL 60601',
    companyEmail: 'advisory@apexpartners.com',
    companyPhone: '+1 (312) 555-9900',
    primaryColor: '#334155',
    termsAndConditions: 'Consulting retainers billed in advance. Net 15 days.',
    notes: 'Wire transfer instructions: Apex Advisory Partners Account #987654321.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Firm Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Organization', type: 'text', alignment: 'left' },
      items_table: { label: 'Advisory Deliverables', type: 'table', alignment: 'left' },
      total_amount: { label: 'Retainer Total', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Cyber Neon Tech',
    description: 'Electric cyan theme tailored for SaaS startups, cloud engineering, and software contracts.',
    isDefault: false,
    layoutStyle: 'modern',
    headerTitle: 'SERVICE INVOICE',
    companyName: 'NeonStack Systems',
    companyAddress: '600 Cyber Way, Suite 10\nSeattle, WA 98101',
    companyEmail: 'invoices@neonstack.dev',
    companyPhone: '+1 (206) 555-4040',
    primaryColor: '#06b6d4',
    termsAndConditions: 'SaaS subscription & cloud engineering billing. Net 30 days.',
    notes: 'Automated billing receipt from NeonStack Cloud Engine.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Tech Brand', type: 'text', alignment: 'left' },
      client_name: { label: 'Subscriber / Client', type: 'text', alignment: 'left' },
      items_table: { label: 'Cloud Resources & Dev Hours', type: 'table', alignment: 'left' },
      total_amount: { label: 'Total Charge', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Warm Amber Studio',
    description: 'Inviting golden amber layout designed for photography, architecture, and design boutiques.',
    isDefault: false,
    layoutStyle: 'creative',
    headerTitle: 'INVOICE',
    companyName: 'Amber Light Atelier',
    companyAddress: '42 Artisan Boulevard\nPortland, OR 97201',
    companyEmail: 'billing@amberatelier.com',
    companyPhone: '+1 (503) 555-7711',
    primaryColor: '#f59e0b',
    termsAndConditions: '50% deposit upon project start, 50% prior to final asset delivery.',
    notes: 'Thank you for creating beauty with Amber Light Atelier!',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Atelier Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Client Name', type: 'text', alignment: 'left' },
      items_table: { label: 'Creative Commissions', type: 'table', alignment: 'left' },
      total_amount: { label: 'Total Fee', type: 'currency', alignment: 'right' }
    })
  },
  {
    name: 'Monochrome Compact',
    description: 'High-density structured layout for hardware, physical deliverables, and line-item heavy billing.',
    isDefault: false,
    layoutStyle: 'compact',
    headerTitle: 'BILL OF SALE / INVOICE',
    companyName: 'Precision Hardware Co',
    companyAddress: '15 Warehouse Road, Dock 8\nDetroit, MI 48201',
    companyEmail: 'orders@precisionhw.com',
    companyPhone: '+1 (313) 555-1234',
    primaryColor: '#475569',
    termsAndConditions: 'FOB Destination. Net 30 days from shipment date.',
    notes: 'Inspect items upon arrival. Claims must be filed within 7 days.',
    placeholdersConfig: JSON.stringify({
      company_name: { label: 'Vendor Name', type: 'text', alignment: 'left' },
      client_name: { label: 'Purchaser Name', type: 'text', alignment: 'left' },
      items_table: { label: 'Supplies & Equipment', type: 'table', alignment: 'left' },
      total_amount: { label: 'Invoice Total', type: 'currency', alignment: 'right' }
    })
  }
]

export function registerInvoiceHandlers(): void {
  const prisma = getPrisma()

  // Seed default templates if database has no templates
  const ensureDefaultTemplates = async () => {
    const count = await prisma.invoiceTemplate.count()
    if (count === 0) {
      for (const tmpl of DEFAULT_TEMPLATES) {
        await prisma.invoiceTemplate.create({ data: tmpl })
      }
    }
  }

  // Explicit re-seed all 8 pre-built default templates
  ipcMain.handle('invoices:seedDefaultTemplates', async () => {
    for (const tmpl of DEFAULT_TEMPLATES) {
      const existing = await prisma.invoiceTemplate.findFirst({
        where: { name: tmpl.name }
      })
      if (!existing) {
        await prisma.invoiceTemplate.create({ data: tmpl })
      }
    }
    return await prisma.invoiceTemplate.findMany({ orderBy: { createdAt: 'asc' } })
  })

  // ─────────────────────────────────────────────────────────────
  // Invoice Templates IPC
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle('invoices:getAllTemplates', async () => {
    await ensureDefaultTemplates()
    return await prisma.invoiceTemplate.findMany({
      orderBy: { createdAt: 'asc' }
    })
  })

  ipcMain.handle('invoices:getTemplateById', async (_, id: string) => {
    return await prisma.invoiceTemplate.findUnique({ where: { id } })
  })

  ipcMain.handle('invoices:createTemplate', async (_, data: any) => {
    if (data.isDefault) {
      await prisma.invoiceTemplate.updateMany({ data: { isDefault: false } })
    }
    return await prisma.invoiceTemplate.create({
      data: {
        name: data.name || 'Untitled Template',
        description: data.description || '',
        isDefault: !!data.isDefault,
        layoutStyle: data.layoutStyle || 'modern',
        headerTitle: data.headerTitle || 'INVOICE',
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        companyEmail: data.companyEmail || '',
        companyPhone: data.companyPhone || '',
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || '#3b82f6',
        termsAndConditions: data.termsAndConditions || '',
        notes: data.notes || '',
        placeholdersConfig: typeof data.placeholdersConfig === 'string'
          ? data.placeholdersConfig
          : JSON.stringify(data.placeholdersConfig || {}),
        contentTemplate: data.contentTemplate || ''
      }
    })
  })

  ipcMain.handle('invoices:updateTemplate', async (_, id: string, data: any) => {
    if (data.isDefault) {
      await prisma.invoiceTemplate.updateMany({ data: { isDefault: false } })
    }
    return await prisma.invoiceTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.layoutStyle !== undefined && { layoutStyle: data.layoutStyle }),
        ...(data.headerTitle !== undefined && { headerTitle: data.headerTitle }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companyAddress !== undefined && { companyAddress: data.companyAddress }),
        ...(data.companyEmail !== undefined && { companyEmail: data.companyEmail }),
        ...(data.companyPhone !== undefined && { companyPhone: data.companyPhone }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.termsAndConditions !== undefined && { termsAndConditions: data.termsAndConditions }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.placeholdersConfig !== undefined && {
          placeholdersConfig: typeof data.placeholdersConfig === 'string'
            ? data.placeholdersConfig
            : JSON.stringify(data.placeholdersConfig)
        }),
        ...(data.contentTemplate !== undefined && { contentTemplate: data.contentTemplate })
      }
    })
  })

  ipcMain.handle('invoices:deleteTemplate', async (_, id: string) => {
    const tmpl = await prisma.invoiceTemplate.findUnique({ where: { id } })
    if (!tmpl) return { success: false, error: 'Template not found' }
    await prisma.invoiceTemplate.delete({ where: { id } })
    return { success: true }
  })

  ipcMain.handle('invoices:importTemplate', async (_, templateJsonString: string) => {
    try {
      const parsed = JSON.parse(templateJsonString)
      const created = await prisma.invoiceTemplate.create({
        data: {
          name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Template',
          description: parsed.description || '',
          isDefault: false,
          layoutStyle: parsed.layoutStyle || 'modern',
          headerTitle: parsed.headerTitle || 'INVOICE',
          companyName: parsed.companyName || '',
          companyAddress: parsed.companyAddress || '',
          companyEmail: parsed.companyEmail || '',
          companyPhone: parsed.companyPhone || '',
          logoUrl: parsed.logoUrl || '',
          primaryColor: parsed.primaryColor || '#3b82f6',
          termsAndConditions: parsed.termsAndConditions || '',
          notes: parsed.notes || '',
          placeholdersConfig: typeof parsed.placeholdersConfig === 'string'
            ? parsed.placeholdersConfig
            : JSON.stringify(parsed.placeholdersConfig || {}),
          contentTemplate: parsed.contentTemplate || ''
        }
      })
      return { success: true, template: created }
    } catch (err: any) {
      return { success: false, error: `Invalid JSON template: ${err.message}` }
    }
  })

  ipcMain.handle('invoices:exportTemplate', async (_, id: string) => {
    const tmpl = await prisma.invoiceTemplate.findUnique({ where: { id } })
    if (!tmpl) return null
    return JSON.stringify(tmpl, null, 2)
  })

  // ─────────────────────────────────────────────────────────────
  // Project Invoices IPC
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle('invoices:getByProject', async (_, projectId: string) => {
    return await prisma.invoice.findMany({
      where: { projectId },
      include: { template: true, project: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    })
  })

  ipcMain.handle('invoices:getById', async (_, id: string) => {
    return await prisma.invoice.findUnique({
      where: { id },
      include: { template: true, project: { include: { client: true } } }
    })
  })

  ipcMain.handle('invoices:create', async (_, data: any) => {
    const items = Array.isArray(data.items) ? data.items : []
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)

    let discountAmount = 0
    if (data.discountType === 'percentage') {
      discountAmount = (subtotal * (Number(data.discountValue) || 0)) / 100
    } else {
      discountAmount = Number(data.discountValue) || 0
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount)

    let taxAmount = 0
    if (data.taxType === 'percentage') {
      taxAmount = (afterDiscount * (Number(data.taxValue) || 0)) / 100
    } else {
      taxAmount = Number(data.taxValue) || 0
    }

    const totalAmount = Math.max(0, afterDiscount + taxAmount)

    return await prisma.invoice.create({
      data: {
        projectId: data.projectId,
        invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || 'draft',
        currency: data.currency || 'USD',
        currencySymbol: data.currencySymbol || '$',
        clientName: data.clientName || '',
        clientEmail: data.clientEmail || '',
        clientAddress: data.clientAddress || '',
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        companyEmail: data.companyEmail || '',
        subtotal,
        discountType: data.discountType || 'percentage',
        discountValue: Number(data.discountValue) || 0,
        discountAmount,
        taxType: data.taxType || 'percentage',
        taxValue: Number(data.taxValue) || 0,
        taxAmount,
        totalAmount,
        termsAndConditions: data.termsAndConditions || '',
        notes: data.notes || '',
        templateId: data.templateId || null,
        items: JSON.stringify(items)
      },
      include: { template: true }
    })
  })

  ipcMain.handle('invoices:update', async (_, id: string, data: any) => {
    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) throw new Error('Invoice not found')

    const items = data.items !== undefined
      ? (Array.isArray(data.items) ? data.items : JSON.parse(data.items || '[]'))
      : JSON.parse(existing.items || '[]')

    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)

    const discountType = data.discountType || existing.discountType
    const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : existing.discountValue
    let discountAmount = 0
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount)

    const taxType = data.taxType || existing.taxType
    const taxValue = data.taxValue !== undefined ? Number(data.taxValue) : existing.taxValue
    let taxAmount = 0
    if (taxType === 'percentage') {
      taxAmount = (afterDiscount * taxValue) / 100
    } else {
      taxAmount = taxValue
    }

    const totalAmount = Math.max(0, afterDiscount + taxAmount)

    return await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
        ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.currencySymbol !== undefined && { currencySymbol: data.currencySymbol }),
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
        ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companyAddress !== undefined && { companyAddress: data.companyAddress }),
        ...(data.companyEmail !== undefined && { companyEmail: data.companyEmail }),
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxType,
        taxValue,
        taxAmount,
        totalAmount,
        ...(data.termsAndConditions !== undefined && { termsAndConditions: data.termsAndConditions }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.templateId !== undefined && { templateId: data.templateId }),
        items: JSON.stringify(items)
      },
      include: { template: true }
    })
  })

  ipcMain.handle('invoices:updateStatus', async (_, id: string, status: string) => {
    return await prisma.invoice.update({
      where: { id },
      data: { status }
    })
  })

  ipcMain.handle('invoices:delete', async (_, id: string) => {
    await prisma.invoice.delete({ where: { id } })
    return { success: true }
  })

  // Helper to construct PDF buffer using pdf-lib
  async function generateInvoicePdfBuffer(invoiceData: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size in points
    const { width, height } = page.getSize()

    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const sym = invoiceData.currencySymbol || '$'
    const primaryColorHex = invoiceData.template?.primaryColor || '#3b82f6'

    // Convert hex color to rgb
    const hexToRgb = (hex: string) => {
      const cleaned = (hex || '#3b82f6').replace('#', '')
      const num = parseInt(cleaned, 16)
      return rgb(
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      )
    }

    const primaryRgb = hexToRgb(primaryColorHex)

    // Top Header Banner / Accent Line
    page.drawRectangle({
      x: 0,
      y: height - 12,
      width: width,
      height: 12,
      color: primaryRgb
    })

    let currentY = height - 50

    // Header Title & Invoice Number
    const headerTitle = invoiceData.template?.headerTitle || 'INVOICE'
    page.drawText(headerTitle, {
      x: 40,
      y: currentY,
      size: 24,
      font: fontBold,
      color: primaryRgb
    })

    page.drawText(`#${invoiceData.invoiceNumber}`, {
      x: width - 200,
      y: currentY + 4,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    })

    currentY -= 30

    // Divider
    page.drawLine({
      start: { x: 40, y: currentY },
      end: { x: width - 40, y: currentY },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85)
    })

    currentY -= 25

    // Company (Sender) and Client (Recipient) details
    const compName = invoiceData.companyName || invoiceData.template?.companyName || 'Sender Company'
    const compAddr = invoiceData.companyAddress || invoiceData.template?.companyAddress || ''
    const compEmail = invoiceData.companyEmail || invoiceData.template?.companyEmail || ''

    // Left Box: FROM
    page.drawText('FROM:', { x: 40, y: currentY, size: 10, font: fontBold, color: primaryRgb })
    page.drawText(compName, { x: 40, y: currentY - 14, size: 11, font: fontBold })
    let compY = currentY - 28
    if (compAddr) {
      const lines = compAddr.split('\n')
      lines.forEach((l: string) => {
        page.drawText(l, { x: 40, y: compY, size: 9, font: fontNormal, color: rgb(0.3, 0.3, 0.3) })
        compY -= 12
      })
    }
    if (compEmail) {
      page.drawText(compEmail, { x: 40, y: compY, size: 9, font: fontNormal, color: rgb(0.3, 0.3, 0.3) })
    }

    // Middle Box: BILL TO
    const clientName = invoiceData.clientName || 'Valued Client'
    const clientAddr = invoiceData.clientAddress || ''
    const clientEmail = invoiceData.clientEmail || ''

    page.drawText('BILL TO:', { x: 230, y: currentY, size: 10, font: fontBold, color: primaryRgb })
    page.drawText(clientName, { x: 230, y: currentY - 14, size: 11, font: fontBold })
    let clientY = currentY - 28
    if (clientAddr) {
      const lines = clientAddr.split('\n')
      lines.forEach((l: string) => {
        page.drawText(l, { x: 230, y: clientY, size: 9, font: fontNormal, color: rgb(0.3, 0.3, 0.3) })
        clientY -= 12
      })
    }
    if (clientEmail) {
      page.drawText(clientEmail, { x: 230, y: clientY, size: 9, font: fontNormal, color: rgb(0.3, 0.3, 0.3) })
    }

    // Right Box: Dates & Details
    const issueStr = invoiceData.issueDate ? new Date(invoiceData.issueDate).toLocaleDateString() : 'N/A'
    const dueStr = invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'Upon Receipt'
    const statusStr = (invoiceData.status || 'DRAFT').toUpperCase()

    page.drawText('DETAILS:', { x: 420, y: currentY, size: 10, font: fontBold, color: primaryRgb })
    page.drawText(`Issue Date: ${issueStr}`, { x: 420, y: currentY - 14, size: 9, font: fontNormal })
    page.drawText(`Due Date: ${dueStr}`, { x: 420, y: currentY - 28, size: 9, font: fontNormal })
    page.drawText(`Status: ${statusStr}`, { x: 420, y: currentY - 42, size: 9, font: fontBold, color: primaryRgb })

    currentY = Math.min(compY, clientY, currentY - 55) - 20

    // Table Header
    page.drawRectangle({
      x: 40,
      y: currentY - 16,
      width: width - 80,
      height: 22,
      color: primaryRgb
    })

    page.drawText('Description', { x: 50, y: currentY - 10, size: 9, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Qty', { x: 330, y: currentY - 10, size: 9, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Unit Price', { x: 400, y: currentY - 10, size: 9, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Amount', { x: 490, y: currentY - 10, size: 9, font: fontBold, color: rgb(1, 1, 1) })

    currentY -= 26

    // Items list
    const items = typeof invoiceData.items === 'string'
      ? JSON.parse(invoiceData.items || '[]')
      : (invoiceData.items || [])

    items.forEach((item: any, index: number) => {
      const bg = index % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1)
      page.drawRectangle({
        x: 40,
        y: currentY - 16,
        width: width - 80,
        height: 20,
        color: bg
      })

      const desc = (item.description || 'Item').slice(0, 45)
      const qty = (item.quantity || 1).toString()
      const price = `${sym}${Number(item.unitPrice || 0).toFixed(2)}`
      const amt = `${sym}${Number(item.amount || 0).toFixed(2)}`

      page.drawText(desc, { x: 50, y: currentY - 10, size: 9, font: fontNormal })
      page.drawText(qty, { x: 335, y: currentY - 10, size: 9, font: fontNormal })
      page.drawText(price, { x: 400, y: currentY - 10, size: 9, font: fontNormal })
      page.drawText(amt, { x: 490, y: currentY - 10, size: 9, font: fontNormal })

      currentY -= 22
    })

    currentY -= 15

    // Totals Box (Right aligned)
    const totalBoxX = 350
    page.drawText('Subtotal:', { x: totalBoxX, y: currentY, size: 10, font: fontNormal })
    page.drawText(`${sym}${Number(invoiceData.subtotal || 0).toFixed(2)}`, { x: width - 110, y: currentY, size: 10, font: fontNormal })
    currentY -= 16

    if (invoiceData.discountAmount > 0) {
      const discLabel = invoiceData.discountType === 'percentage'
        ? `Discount (${invoiceData.discountValue}%):`
        : 'Discount:'
      page.drawText(discLabel, { x: totalBoxX, y: currentY, size: 10, font: fontNormal, color: rgb(0.8, 0.2, 0.2) })
      page.drawText(`-${sym}${Number(invoiceData.discountAmount || 0).toFixed(2)}`, { x: width - 110, y: currentY, size: 10, font: fontNormal, color: rgb(0.8, 0.2, 0.2) })
      currentY -= 16
    }

    if (invoiceData.taxAmount > 0) {
      const taxLabel = invoiceData.taxType === 'percentage'
        ? `Tax (${invoiceData.taxValue}%):`
        : 'Tax:'
      page.drawText(taxLabel, { x: totalBoxX, y: currentY, size: 10, font: fontNormal })
      page.drawText(`+${sym}${Number(invoiceData.taxAmount || 0).toFixed(2)}`, { x: width - 110, y: currentY, size: 10, font: fontNormal })
      currentY -= 16
    }

    // Grand Total Highlight
    page.drawRectangle({
      x: totalBoxX - 10,
      y: currentY - 8,
      width: width - totalBoxX - 30,
      height: 24,
      color: primaryRgb
    })

    page.drawText('Total Due:', { x: totalBoxX, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText(`${sym}${Number(invoiceData.totalAmount || 0).toFixed(2)}`, { x: width - 110, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) })

    currentY -= 45

    // Terms and Conditions
    if (invoiceData.termsAndConditions) {
      page.drawText('Terms & Conditions:', { x: 40, y: currentY, size: 10, font: fontBold, color: primaryRgb })
      currentY -= 14
      const termLines = invoiceData.termsAndConditions.split('\n')
      termLines.forEach((t: string) => {
        page.drawText(t, { x: 40, y: currentY, size: 8, font: fontNormal, color: rgb(0.4, 0.4, 0.4) })
        currentY -= 11
      })
      currentY -= 10
    }

    // Notes
    if (invoiceData.notes) {
      page.drawText('Notes / Payment Instructions:', { x: 40, y: currentY, size: 10, font: fontBold, color: primaryRgb })
      currentY -= 14
      const noteLines = invoiceData.notes.split('\n')
      noteLines.forEach((n: string) => {
        page.drawText(n, { x: 40, y: currentY, size: 8, font: fontNormal, color: rgb(0.4, 0.4, 0.4) })
        currentY -= 11
      })
    }

    // Footer
    page.drawText('Generated by Project Workspace Manager', {
      x: width / 2 - 90,
      y: 20,
      size: 8,
      font: fontNormal,
      color: rgb(0.6, 0.6, 0.6)
    })

    return await pdfDoc.save()
  }

  // Generate & Save PDF file to disk
  ipcMain.handle('invoices:generatePdf', async (_, invoiceId: string) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { template: true }
    })
    if (!invoice) return { success: false, error: 'Invoice not found' }

    const pdfBytes = await generateInvoicePdfBuffer(invoice)

    const win = BrowserWindow.getFocusedWindow()
    const { filePath } = await dialog.showSaveDialog(win || ({} as any), {
      title: 'Save Invoice PDF',
      defaultPath: `Invoice_${invoice.invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    })

    if (!filePath) return { success: false, canceled: true }

    const fs = require('fs')
    fs.writeFileSync(filePath, Buffer.from(pdfBytes))
    return { success: true, filePath }
  })

  // Send Invoice PDF via Email using SMTP Profile
  ipcMain.handle('invoices:sendEmail', async (_, { invoiceId, smtpProfileId, recipientEmail, subject, bodyMessage }: any) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { template: true }
      })
      if (!invoice) return { success: false, error: 'Invoice not found' }

      let smtpConfig: any = null
      if (smtpProfileId) {
        const profile = await prisma.smtpProfile.findUnique({ where: { id: smtpProfileId } })
        if (profile) {
          smtpConfig = {
            host: profile.host,
            port: profile.port,
            secure: profile.secure,
            user: profile.user,
            pass: profile.pass,
            from: profile.from || profile.user
          }
        }
      }

      if (!smtpConfig) {
        // Fallback to first available SMTP profile if any
        const profiles = await prisma.smtpProfile.findMany({ take: 1 })
        if (profiles.length > 0) {
          const p = profiles[0]
          smtpConfig = {
            host: p.host,
            port: p.port,
            secure: p.secure,
            user: p.user,
            pass: p.pass,
            from: p.from || p.user
          }
        }
      }

      if (!smtpConfig) {
        return { success: false, error: 'No SMTP profile configured. Please add an SMTP profile in Settings.' }
      }

      const targetEmail = recipientEmail || invoice.clientEmail
      if (!targetEmail) {
        return { success: false, error: 'No recipient email address specified.' }
      }

      const pdfBytes = await generateInvoicePdfBuffer(invoice)

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        },
        tls: { rejectUnauthorized: false }
      })

      const mailSubject = subject || `Invoice ${invoice.invoiceNumber} from ${invoice.companyName || 'our company'}`
      const mailBody = bodyMessage || `Hello ${invoice.clientName || 'Valued Client'},\n\nPlease find attached invoice ${invoice.invoiceNumber} for your review.\n\nTotal Amount: ${invoice.currencySymbol}${invoice.totalAmount.toFixed(2)}\nDue Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}\n\nThank you for your business!`

      await transporter.sendMail({
        from: smtpConfig.from || smtpConfig.user,
        to: targetEmail,
        subject: mailSubject,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: ${invoice.template?.primaryColor || '#3b82f6'}; font-size: 20px; margin-bottom: 12px;">
            Invoice ${invoice.invoiceNumber}
          </h2>
          <p style="white-space: pre-line; margin-bottom: 20px; color: #374151;">
            ${mailBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Total Due:</strong> <span style="font-weight: bold; color: ${invoice.template?.primaryColor || '#3b82f6'};">${invoice.currencySymbol}${invoice.totalAmount.toFixed(2)}</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 24px;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent via Project Workspace Manager
          </p>
        </div>`,
        attachments: [
          {
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            content: Buffer.from(pdfBytes),
            contentType: 'application/pdf'
          }
        ]
      })

      // Auto update status to sent if draft
      if (invoice.status === 'draft') {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'sent' }
        })
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send email' }
    }
  })
}
