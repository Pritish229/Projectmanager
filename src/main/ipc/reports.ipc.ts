import { ipcMain } from 'electron'
import { getPrisma } from '../database'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export function registerReportHandlers(): void {
  const prisma = getPrisma()

  // Project summary report data
  ipcMain.handle('reports:projectSummary', async (_, projectId?: string) => {
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: true,
          todos: true,
          deliverables: true,
          activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 }
        }
      })
      return project
    }

    // All projects summary
    const projects = await prisma.project.findMany({
      include: { client: true, todos: true, deliverables: true }
    })
    return projects
  })

  // Todo summary report
  ipcMain.handle('reports:todoSummary', async (_, projectId?: string) => {
    const where = projectId ? { projectId } : {}
    const todos = await prisma.todo.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    })

    const total = todos.length
    const completed = todos.filter(t => t.status === 'completed').length
    const pending = todos.filter(t => t.status === 'pending').length
    const inProgress = todos.filter(t => t.status === 'in_progress').length
    const blocked = todos.filter(t => t.status === 'blocked').length
    const overdue = todos.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length

    return { todos, total, completed, pending, inProgress, blocked, overdue }
  })

  // Deliverable summary report
  ipcMain.handle('reports:deliverableSummary', async (_, projectId?: string) => {
    const where = projectId ? { projectId } : {}
    const deliverables = await prisma.deliverable.findMany({
      where,
      include: { project: true, approvals: true },
      orderBy: { createdAt: 'desc' }
    })

    const total = deliverables.length
    const approved = deliverables.filter(d => d.status === 'approved').length
    const rejected = deliverables.filter(d => d.status === 'rejected').length
    const pending = deliverables.filter(d => d.status === 'sent').length

    return { deliverables, total, approved, rejected, pending }
  })

  // Approval summary report
  ipcMain.handle('reports:approvalSummary', async (_, projectId?: string) => {
    const where = projectId
      ? { deliverable: { projectId } }
      : {}

    const approvals = await prisma.approval.findMany({
      where,
      include: { deliverable: { include: { project: true } }, client: true },
      orderBy: { createdAt: 'desc' }
    })

    const total = approvals.length
    const approved = approvals.filter(a => a.status === 'approved').length
    const rejected = approvals.filter(a => a.status === 'rejected').length
    const pending = approvals.filter(a => a.status === 'pending').length

    return { approvals, total, approved, rejected, pending }
  })

  // Generate PDF report
  ipcMain.handle('reports:generatePdf', async (_, type: string, data: unknown) => {
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage([595, 842]) // A4
    const { height } = page.getSize()
    let y = height - 50

    const drawText = (text: string, x: number, yPos: number, size: number, fontType = font) => {
      page.drawText(text, { x, y: yPos, size, font: fontType, color: rgb(0.1, 0.1, 0.1) })
    }

    // Title
    drawText(`${type} Report`, 50, y, 24, boldFont)
    y -= 15
    drawText(`Generated: ${new Date().toLocaleDateString()}`, 50, y, 10)
    y -= 30

    // Draw a line
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
    y -= 20

    // Content depends on type
    const reportData = data as Record<string, unknown>
    if (reportData && typeof reportData === 'object') {
      const entries = Object.entries(reportData)
      for (const [key, value] of entries) {
        if (y < 60) {
          page = pdfDoc.addPage([595, 842])
          y = height - 50
        }

        if (typeof value === 'string' || typeof value === 'number') {
          drawText(`${key}: ${value}`, 50, y, 11)
          y -= 18
        }
      }
    }

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes).toString('base64')
  })

  // Generate CSV
  ipcMain.handle('reports:generateCsv', async (_, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csvContent
  })
}
