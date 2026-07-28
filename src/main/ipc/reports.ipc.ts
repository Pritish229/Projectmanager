import { ipcMain } from 'electron'
import { getPrisma } from '../database'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

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

  // ─────────────────────────────────────────────────────────────
  // NEW: Full project summary for a single project (for summary card + PDF)
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle('reports:getProjectFullSummary', async (_, projectId: string) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        user: true,
        todos: { orderBy: { sortOrder: 'asc' } },
        deliverables: { include: { approvals: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        notes: true,
        files: true,
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })

    if (!project) return null

    const todos = project.todos
    const deliverables = project.deliverables
    const notes = project.notes
    const files = project.files

    // Todo stats
    const todoStats = {
      total: todos.length,
      completed: todos.filter(t => t.status === 'completed').length,
      inProgress: todos.filter(t => t.status === 'in_progress').length,
      pending: todos.filter(t => t.status === 'pending').length,
      blocked: todos.filter(t => t.status === 'blocked').length,
      cancelled: todos.filter(t => t.status === 'cancelled').length,
      overdue: todos.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'cancelled').length,
      completionRate: todos.length > 0 ? Math.round((todos.filter(t => t.status === 'completed').length / todos.length) * 100) : 0
    }

    // Deliverable stats
    const deliverableStats = {
      total: deliverables.length,
      approved: deliverables.filter(d => d.status === 'approved').length,
      rejected: deliverables.filter(d => d.status === 'rejected').length,
      sent: deliverables.filter(d => d.status === 'sent').length,
      draft: deliverables.filter(d => d.status === 'draft').length,
      ready: deliverables.filter(d => d.status === 'ready').length,
      completionRate: deliverables.length > 0 ? Math.round((deliverables.filter(d => d.status === 'approved').length / deliverables.length) * 100) : 0
    }

    // Files stats (size in bytes)
    const totalFilesSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        description: project.description,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        deadline: project.deadline,
        tags: project.tags,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        archived: project.archived
      },
      client: project.client,
      user: project.user,
      todoStats,
      todos: todos.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })),
      deliverableStats,
      deliverables: deliverables.map(d => ({ id: d.id, title: d.title, status: d.status, version: d.version, fileName: d.fileName })),
      notesCount: notes.length,
      filesCount: files.length,
      totalFilesSize,
      recentActivity: project.activityLogs.map(a => ({ action: a.action, message: a.message, createdAt: a.createdAt }))
    }
  })

  // ─── PDF Color Themes (Professional & Minimalist) ──────────────────────────────
  const PDF_THEMES: Record<string, {
    primary: any; accent: any; bgCard: any; border: any; trackBg: any; altRowBg: any; headerText: any; darkText: any; mutedText: any
  }> = {
    indigo: {
      primary: rgb(0.388, 0.4, 0.945),
      accent: rgb(0.235, 0.51, 0.96),
      bgCard: rgb(0.965, 0.97, 0.99),
      border: rgb(0.85, 0.87, 0.93),
      trackBg: rgb(0.91, 0.93, 0.97),
      altRowBg: rgb(0.965, 0.97, 0.99),
      headerText: rgb(1, 1, 1),
      darkText: rgb(0.12, 0.14, 0.18),
      mutedText: rgb(0.38, 0.41, 0.47)
    },
    emerald: {
      primary: rgb(0.04, 0.55, 0.38),
      accent: rgb(0.08, 0.65, 0.55),
      bgCard: rgb(0.94, 0.98, 0.96),
      border: rgb(0.81, 0.91, 0.86),
      trackBg: rgb(0.88, 0.95, 0.91),
      altRowBg: rgb(0.95, 0.98, 0.96),
      headerText: rgb(1, 1, 1),
      darkText: rgb(0.12, 0.14, 0.18),
      mutedText: rgb(0.38, 0.41, 0.47)
    },
    navy: {
      primary: rgb(0.09, 0.15, 0.28),
      accent: rgb(0.25, 0.42, 0.68),
      bgCard: rgb(0.95, 0.96, 0.98),
      border: rgb(0.82, 0.86, 0.91),
      trackBg: rgb(0.89, 0.92, 0.96),
      altRowBg: rgb(0.95, 0.96, 0.98),
      headerText: rgb(1, 1, 1),
      darkText: rgb(0.12, 0.14, 0.18),
      mutedText: rgb(0.38, 0.41, 0.47)
    },
    amber: {
      primary: rgb(0.82, 0.42, 0.05),
      accent: rgb(0.88, 0.22, 0.28),
      bgCard: rgb(0.99, 0.97, 0.93),
      border: rgb(0.93, 0.87, 0.77),
      trackBg: rgb(0.95, 0.91, 0.85),
      altRowBg: rgb(0.98, 0.95, 0.91),
      headerText: rgb(1, 1, 1),
      darkText: rgb(0.12, 0.14, 0.18),
      mutedText: rgb(0.38, 0.41, 0.47)
    },
    dark: {
      primary: rgb(0.1, 0.1, 0.14),
      accent: rgb(0.48, 0.35, 0.9),
      bgCard: rgb(0.94, 0.94, 0.96),
      border: rgb(0.82, 0.82, 0.86),
      trackBg: rgb(0.88, 0.88, 0.92),
      altRowBg: rgb(0.94, 0.94, 0.96),
      headerText: rgb(1, 1, 1),
      darkText: rgb(0.12, 0.14, 0.18),
      mutedText: rgb(0.38, 0.41, 0.47)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Generate rich project summary PDF with Themes, User Profile & Clean Layout
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle('reports:generateProjectSummaryPdf', async (_, summaryData: any, themeId: string = 'indigo') => {
    const pdfDoc = await PDFDocument.create()
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Fetch user profile info from settings
    const [userProfileName, userProfileEmail, userProfilePhone, userProfileCompany, userProfileRole] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'user_profile_name' } }).then(s => s?.value || ''),
      prisma.setting.findUnique({ where: { key: 'user_profile_email' } }).then(s => s?.value || ''),
      prisma.setting.findUnique({ where: { key: 'user_profile_phone' } }).then(s => s?.value || ''),
      prisma.setting.findUnique({ where: { key: 'user_profile_company' } }).then(s => s?.value || ''),
      prisma.setting.findUnique({ where: { key: 'user_profile_role' } }).then(s => s?.value || '')
    ])

    const W = 595
    const H = 842
    const MARGIN_LEFT = 30
    const MARGIN_RIGHT = 30
    const CONTENT_W = W - MARGIN_LEFT - MARGIN_RIGHT // 535
    const RIGHT_X = W - MARGIN_RIGHT // 565

    let page = pdfDoc.addPage([W, H])
    let y = H

    const themeColors = PDF_THEMES[themeId] || PDF_THEMES.indigo

    const INDIGO = themeColors.primary
    const DARK = themeColors.darkText
    const MUTED = themeColors.mutedText
    const LIGHT_BORDER = themeColors.border
    const EMERALD = rgb(0.06, 0.65, 0.43)
    const AMBER = rgb(0.92, 0.55, 0.05)
    const ROSE = rgb(0.88, 0.22, 0.32)
    const BLUE = themeColors.accent
    const WHITE = rgb(1, 1, 1)
    const BG_CARD = themeColors.bgCard
    const TRACK_BG = themeColors.trackBg
    const ALT_ROW_BG = themeColors.altRowBg
    const MUTED_BADGE = rgb(0.5, 0.52, 0.58)

    const { project, client, todoStats, deliverableStats, notesCount, filesCount, totalFilesSize, todos, deliverables } = summaryData

    const ensurePage = (neededHeight: number) => {
      if (y - neededHeight < 45) {
        page = pdfDoc.addPage([W, H])
        y = H - 40
      }
    }

    const textWidth = (str: string, size: number, font: PDFFont = regularFont) => {
      try {
        return font.widthOfTextAtSize(str || '', size)
      } catch {
        return (str || '').length * size * 0.5
      }
    }

    const truncateToWidth = (str: string, maxWidth: number, size: number, font: PDFFont = regularFont) => {
      if (!str) return ''
      if (textWidth(str, size, font) <= maxWidth) return str
      let end = str.length
      while (end > 0 && textWidth(str.substring(0, end) + '...', size, font) > maxWidth) {
        end--
      }
      return str.substring(0, end) + '...'
    }

    const drawText = (str: string, x: number, yPos: number, size: number, font: PDFFont = regularFont, color = DARK) => {
      page.drawText(str, { x, y: yPos, size, font, color })
    }

    const drawLine = (x1: number, y1: number, x2: number, y2: number, color = LIGHT_BORDER, thickness = 0.5) => {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })
    }

    const drawRect = (x: number, yPos: number, w: number, h: number, color: any, borderColor?: any, borderWidth: number = 0.5) => {
      page.drawRectangle({ x, y: yPos, width: w, height: h, color, borderColor, borderWidth: borderColor ? borderWidth : 0 })
    }

    const drawBadge = (
      label: string,
      x: number,
      yPos: number,
      bgColor: any,
      textColor: any = WHITE,
      font: PDFFont = boldFont,
      fontSize: number = 7,
      badgeHeight: number = 13
    ) => {
      const txt = (label || '').toUpperCase()
      const tw = textWidth(txt, fontSize, font)
      const bw = tw + 10
      drawRect(x, yPos, bw, badgeHeight, bgColor)
      drawText(txt, x + 5, yPos + (badgeHeight - fontSize) / 2 + 0.5, fontSize, font, textColor)
      return bw
    }

    const drawCheckIcon = (cx: number, cy: number, size: number = 9) => {
      page.drawCircle({ x: cx, y: cy, size: size / 2, color: EMERALD })
      page.drawLine({ start: { x: cx - 2.2, y: cy - 0.2 }, end: { x: cx - 0.7, y: cy - 2 }, thickness: 1, color: WHITE })
      page.drawLine({ start: { x: cx - 0.7, y: cy - 2 }, end: { x: cx + 2.2, y: cy + 1.8 }, thickness: 1, color: WHITE })
    }

    const drawStatusDot = (cx: number, cy: number, color: any, radius: number = 2.5) => {
      page.drawCircle({ x: cx, y: cy, size: radius, color })
    }

    const drawSectionHeader = (title: string, accentColor: any = INDIGO) => {
      ensurePage(35)
      y -= 14
      drawRect(MARGIN_LEFT, y - 2, 3, 11, accentColor)
      drawText(title.toUpperCase(), MARGIN_LEFT + 9, y, 10, boldFont, DARK)
      const titleW = textWidth(title.toUpperCase(), 10, boldFont)
      drawLine(MARGIN_LEFT + 16 + titleW, y + 4, RIGHT_X, y + 4, LIGHT_BORDER, 0.5)
      y -= 16
    }

    // ── 1. HEADER BANNER ──
    const headerHeight = 70
    drawRect(0, H - headerHeight, W, headerHeight, INDIGO)
    drawText('PROJECT SUMMARY REPORT', MARGIN_LEFT, H - 32, 17, boldFont, WHITE)
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    drawText(`Generated: ${dateStr}`, MARGIN_LEFT, H - 50, 8.5, regularFont, rgb(0.92, 0.93, 0.98))

    const headerRightLabel = userProfileName ? `PREPARED BY: ${userProfileName.toUpperCase()}` : 'PROJECT WORKSPACE MANAGER'
    const headerSubLabel = userProfileCompany ? userProfileCompany : (userProfileEmail || 'Workspace Manager')

    const r1 = truncateToWidth(headerRightLabel, 210, 8, boldFont)
    const r2 = truncateToWidth(headerSubLabel, 210, 8, regularFont)
    drawText(r1, RIGHT_X - textWidth(r1, 8, boldFont), H - 32, 8, boldFont, WHITE)
    drawText(r2, RIGHT_X - textWidth(r2, 8, regularFont), H - 50, 8, regularFont, rgb(0.92, 0.93, 0.98))

    y = H - headerHeight - 16

    // ── 2. PROJECT INFORMATION CARD ──
    const hasClient = !!client
    const hasDesc = !!project.description
    const cardContentHeight = 65 + (hasClient ? 18 : 0) + (hasDesc ? 18 : 0)
    const cardHeight = Math.max(72, cardContentHeight)

    drawRect(MARGIN_LEFT, y - cardHeight, CONTENT_W, cardHeight, BG_CARD, LIGHT_BORDER)

    // Left Column Content
    const leftColX = MARGIN_LEFT + 15
    let currentY = y - 20

    // Row 1: Project Name
    const projName = truncateToWidth(project.name, 340, 13, boldFont)
    drawText(projName, leftColX, currentY, 13, boldFont, DARK)

    // Right Column Content: Deadline Box
    const deadlineStr = project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'
    const deadlineBoxW = 110
    const deadlineBoxH = 42
    const deadlineBoxX = RIGHT_X - 15 - deadlineBoxW
    drawRect(deadlineBoxX, y - 14 - deadlineBoxH, deadlineBoxW, deadlineBoxH, WHITE, LIGHT_BORDER)
    drawText('DEADLINE', deadlineBoxX + 10, y - 28, 7, boldFont, MUTED)
    drawText(deadlineStr, deadlineBoxX + 10, y - 44, 9.5, boldFont, project.deadline ? DARK : MUTED)

    // Row 2: Code & Badges
    currentY -= 18
    const codeStr = `CODE: ${project.code}`
    drawText(codeStr, leftColX, currentY, 8.5, boldFont, INDIGO)
    const codeW = textWidth(codeStr, 8.5, boldFont)

    let badgeX = leftColX + codeW + 12
    const statusLabel = (project.status || 'draft').replace(/_/g, ' ').toUpperCase()
    const statusBg = project.status === 'active' || project.status === 'approved' ? EMERALD : project.status === 'waiting_approval' ? AMBER : project.status === 'closed' ? MUTED_BADGE : INDIGO
    const badge1W = drawBadge(statusLabel, badgeX, currentY - 2, statusBg, WHITE, boldFont, 6.5, 12)
    badgeX += badge1W + 6

    const priorityLabel = (project.priority || 'medium').toUpperCase()
    const priColor = project.priority === 'urgent' || project.priority === 'high' ? ROSE : project.priority === 'medium' ? AMBER : EMERALD
    drawBadge(priorityLabel, badgeX, currentY - 2, priColor, WHITE, boldFont, 6.5, 12)

    // Row 3: Client Name & Email (if present)
    if (client) {
      currentY -= 18
      const clientStr = `CLIENT: ${truncateToWidth(client.name, 35, 8.5, boldFont)}`
      drawText(clientStr, leftColX, currentY, 8.5, boldFont, DARK)
      if (client.email) {
        const clientEmailStr = `EMAIL: ${truncateToWidth(client.email, 35, 8, regularFont)}`
        drawText(clientEmailStr, leftColX + 180, currentY, 8, regularFont, MUTED)
      }
    }

    // Row 4: Project Description (if present)
    if (project.description) {
      currentY -= 18
      const descStr = `DESCRIPTION: ${truncateToWidth(project.description, 90, 8, italicFont)}`
      drawText(descStr, leftColX, currentY, 8, italicFont, MUTED)
    }

    y -= cardHeight + 20

    // ── 3. OVERVIEW METRICS ──
    const cardGap = 10
    const mCardW = (CONTENT_W - 3 * cardGap) / 4
    const mCardH = 62
    const metrics = [
      { label: 'TOTAL TODOS', value: String(todoStats.total), sub: `${todoStats.completionRate}% complete`, color: INDIGO },
      { label: 'COMPLETED', value: String(todoStats.completed), sub: `${todoStats.blocked} blocked`, color: EMERALD },
      { label: 'DELIVERABLES', value: String(deliverableStats.total), sub: `${deliverableStats.approved} approved`, color: BLUE },
      { label: 'NOTES & FILES', value: `${notesCount}N / ${filesCount}F`, sub: formatBytes(totalFilesSize), color: AMBER }
    ]

    metrics.forEach((m, i) => {
      const mx = MARGIN_LEFT + i * (mCardW + cardGap)
      drawRect(mx, y - mCardH, mCardW, mCardH, WHITE, LIGHT_BORDER)
      drawRect(mx, y - 3, mCardW, 3, m.color)
      drawText(m.label, mx + 10, y - 16, 7.5, boldFont, MUTED)
      drawText(m.value, mx + 10, y - 36, 16, boldFont, DARK)
      drawText(m.sub, mx + 10, y - 50, 7.5, regularFont, MUTED)
    })

    y -= mCardH + 20

    // ── 4. TASK BREAKDOWN (TODOS) ──
    drawSectionHeader('TASK BREAKDOWN (TODOS)', INDIGO)

    // Progress Bar
    const barW = 425
    const barH = 12
    const completedW = todoStats.total > 0 ? Math.min(barW, Math.round((todoStats.completed / todoStats.total) * barW)) : 0
    drawRect(MARGIN_LEFT, y - barH, barW, barH, TRACK_BG, LIGHT_BORDER)
    if (completedW > 0) drawRect(MARGIN_LEFT, y - barH, completedW, barH, EMERALD)
    drawText(`${todoStats.completionRate}% Done`, MARGIN_LEFT + barW + 12, y - 9, 9, boldFont, EMERALD)
    y -= 22

    // Todo Summary Pills Row
    ensurePage(20)
    let pillX = MARGIN_LEFT
    const summaryPills = [
      { label: 'Completed', val: todoStats.completed, color: EMERALD },
      { label: 'In Progress', val: todoStats.inProgress, color: BLUE },
      { label: 'Pending', val: todoStats.pending, color: AMBER },
      { label: 'Blocked', val: todoStats.blocked, color: ROSE },
      { label: 'Cancelled', val: todoStats.cancelled, color: MUTED_BADGE }
    ]

    summaryPills.forEach(p => {
      drawStatusDot(pillX + 4, y - 4, p.color, 2.5)
      const txt = `${p.label}: ${p.val}`
      drawText(txt, pillX + 10, y - 7, 8, regularFont, DARK)
      pillX += textWidth(txt, 8, regularFont) + 18
    })

    if (todoStats.overdue > 0) {
      drawText(`⚠ ${todoStats.overdue} overdue`, pillX, y - 7, 8, boldFont, ROSE)
    }
    y -= 18

    // Todo Items Table Preview
    if (todos && todos.length > 0) {
      ensurePage(35)
      drawText('TODO ITEMS PREVIEW', MARGIN_LEFT, y, 7.5, boldFont, MUTED)
      y -= 12

      // Header Row
      drawRect(MARGIN_LEFT, y - 14, CONTENT_W, 14, TRACK_BG)
      drawText('TASK TITLE', MARGIN_LEFT + 28, y - 11, 7, boldFont, MUTED)
      drawText('STATUS', MARGIN_LEFT + 320, y - 11, 7, boldFont, MUTED)
      drawText('PRIORITY', MARGIN_LEFT + 430, y - 11, 7, boldFont, MUTED)
      y -= 14

      const displayTodos = todos.slice(0, 12)
      displayTodos.forEach((todo: any, idx: number) => {
        ensurePage(22)
        const rowBg = idx % 2 === 0 ? ALT_ROW_BG : WHITE
        drawRect(MARGIN_LEFT, y - 18, CONTENT_W, 18, rowBg, LIGHT_BORDER, 0.2)

        const isCompleted = todo.status === 'completed'
        const statusColor = isCompleted ? EMERALD : todo.status === 'in_progress' ? BLUE : todo.status === 'blocked' ? ROSE : todo.status === 'cancelled' ? MUTED_BADGE : AMBER
        const priorityColor = todo.priority === 'urgent' || todo.priority === 'high' ? ROSE : todo.priority === 'medium' ? AMBER : EMERALD

        if (isCompleted) {
          drawCheckIcon(MARGIN_LEFT + 14, y - 9, 9)
        } else {
          drawStatusDot(MARGIN_LEFT + 14, y - 9, statusColor, 3)
        }

        const titleStr = truncateToWidth(todo.title, 270, 8.5, regularFont)
        drawText(titleStr, MARGIN_LEFT + 28, y - 13, 8.5, regularFont, DARK)

        const tStatusLabel = todo.status.replace(/_/g, ' ').toUpperCase()
        drawBadge(tStatusLabel, MARGIN_LEFT + 320, y - 15, statusColor, WHITE, boldFont, 6.5, 12)

        const tPriorityLabel = todo.priority.toUpperCase()
        drawBadge(tPriorityLabel, MARGIN_LEFT + 430, y - 15, priorityColor, WHITE, boldFont, 6.5, 12)

        y -= 19
      })

      if (todos.length > 12) {
        ensurePage(20)
        const remainingCount = todos.length - 12
        drawRect(MARGIN_LEFT, y - 16, CONTENT_W, 16, TRACK_BG, LIGHT_BORDER, 0.4)
        const moreStr = `+ ${remainingCount} More Tasks Remaining`
        const moreW = textWidth(moreStr, 7.5, boldFont)
        drawText(moreStr, MARGIN_LEFT + (CONTENT_W - moreW) / 2, y - 12, 7.5, boldFont, INDIGO)
        y -= 18
      }
    }

    y -= 10

    // ── 5. DELIVERABLES SUMMARY ──
    drawSectionHeader('DELIVERABLES SUMMARY', BLUE)

    // Progress Bar
    const dBarW = 425
    const dBarH = 12
    const approvedW = deliverableStats.total > 0 ? Math.min(dBarW, Math.round((deliverableStats.approved / deliverableStats.total) * dBarW)) : 0
    drawRect(MARGIN_LEFT, y - dBarH, dBarW, dBarH, TRACK_BG, LIGHT_BORDER)
    if (approvedW > 0) drawRect(MARGIN_LEFT, y - dBarH, approvedW, dBarH, BLUE)
    drawText(`${deliverableStats.completionRate}% Approved`, MARGIN_LEFT + dBarW + 12, y - 9, 9, boldFont, BLUE)
    y -= 22

    // Deliverable Summary Pills
    ensurePage(20)
    let dPillX = MARGIN_LEFT
    const dPills = [
      { label: 'Approved', val: deliverableStats.approved, color: EMERALD },
      { label: 'Sent for Review', val: deliverableStats.sent, color: BLUE },
      { label: 'Ready', val: deliverableStats.ready, color: AMBER },
      { label: 'Draft', val: deliverableStats.draft, color: MUTED_BADGE },
      { label: 'Rejected', val: deliverableStats.rejected, color: ROSE }
    ]

    dPills.forEach(p => {
      drawStatusDot(dPillX + 4, y - 4, p.color, 2.5)
      const txt = `${p.label}: ${p.val}`
      drawText(txt, dPillX + 10, y - 7, 8, regularFont, DARK)
      dPillX += textWidth(txt, 8, regularFont) + 16
    })
    y -= 18

    // Deliverables Items Table
    if (deliverables && deliverables.length > 0) {
      ensurePage(35)
      drawText('DELIVERABLE ITEMS PREVIEW', MARGIN_LEFT, y, 7.5, boldFont, MUTED)
      y -= 12

      // Header Row
      drawRect(MARGIN_LEFT, y - 14, CONTENT_W, 14, TRACK_BG)
      drawText('DELIVERABLE TITLE', MARGIN_LEFT + 28, y - 11, 7, boldFont, MUTED)
      drawText('VERSION', MARGIN_LEFT + 320, y - 11, 7, boldFont, MUTED)
      drawText('STATUS', MARGIN_LEFT + 400, y - 11, 7, boldFont, MUTED)
      y -= 14

      const displayDeliverables = deliverables.slice(0, 8)
      displayDeliverables.forEach((d: any, idx: number) => {
        ensurePage(22)
        const rowBg = idx % 2 === 0 ? ALT_ROW_BG : WHITE
        drawRect(MARGIN_LEFT, y - 18, CONTENT_W, 18, rowBg, LIGHT_BORDER, 0.2)

        const statusColor = d.status === 'approved' ? EMERALD : d.status === 'sent' ? BLUE : d.status === 'ready' ? AMBER : d.status === 'rejected' ? ROSE : MUTED_BADGE

        drawStatusDot(MARGIN_LEFT + 14, y - 9, statusColor, 3)

        const titleStr = truncateToWidth(d.title, 270, 8.5, regularFont)
        drawText(titleStr, MARGIN_LEFT + 28, y - 13, 8.5, regularFont, DARK)

        const versionStr = `V${d.version || '1.0'}`
        drawBadge(versionStr, MARGIN_LEFT + 320, y - 15, TRACK_BG, MUTED, boldFont, 6.5, 12)

        const dStatusLabel = d.status === 'sent' ? 'SENT FOR REVIEW' : d.status.toUpperCase()
        drawBadge(dStatusLabel, MARGIN_LEFT + 400, y - 15, statusColor, WHITE, boldFont, 6.5, 12)

        y -= 19
      })

      if (deliverables.length > 8) {
        ensurePage(20)
        const remainingCount = deliverables.length - 8
        drawRect(MARGIN_LEFT, y - 16, CONTENT_W, 16, TRACK_BG, LIGHT_BORDER, 0.4)
        const moreStr = `+ ${remainingCount} More Deliverables Remaining`
        const moreW = textWidth(moreStr, 7.5, boldFont)
        drawText(moreStr, MARGIN_LEFT + (CONTENT_W - moreW) / 2, y - 12, 7.5, boldFont, BLUE)
        y -= 18
      }
    }

    y -= 10

    // ── 6. WORKSPACE ASSETS ──
    drawSectionHeader('WORKSPACE ASSETS', AMBER)

    const assetCardGap = 15
    const assetCardW = (CONTENT_W - assetCardGap) / 2
    const assetCardH = 58

    // Card 1: Notes
    const c1X = MARGIN_LEFT
    drawRect(c1X, y - assetCardH, assetCardW, assetCardH, WHITE, LIGHT_BORDER)
    drawRect(c1X, y - 3, assetCardW, 3, INDIGO)
    drawText('PROJECT NOTES', c1X + 12, y - 16, 7.5, boldFont, MUTED)
    drawText(String(notesCount), c1X + 12, y - 38, 18, boldFont, DARK)
    drawText('Notes documented in workspace', c1X + 12, y - 50, 7.5, regularFont, MUTED)

    // Card 2: Files
    const c2X = MARGIN_LEFT + assetCardW + assetCardGap
    drawRect(c2X, y - assetCardH, assetCardW, assetCardH, WHITE, LIGHT_BORDER)
    drawRect(c2X, y - 3, assetCardW, 3, AMBER)
    drawText('PROJECT FILES', c2X + 12, y - 16, 7.5, boldFont, MUTED)
    drawText(String(filesCount), c2X + 12, y - 38, 18, boldFont, DARK)
    drawText(`Total Size: ${formatBytes(totalFilesSize)}`, c2X + 12, y - 50, 7.5, regularFont, MUTED)

    y -= assetCardH + 20

    // ── 7. FOOTER ──
    const totalPages = pdfDoc.getPageCount()
    const footerLeftStr = userProfileName
      ? `Prepared by ${userProfileName}${userProfileEmail ? ` • ${userProfileEmail}` : ''}`
      : 'Project Workspace Manager — Confidential'

    pdfDoc.getPages().forEach((p, i) => {
      p.drawLine({ start: { x: MARGIN_LEFT, y: 38 }, end: { x: RIGHT_X, y: 38 }, thickness: 0.5, color: LIGHT_BORDER })

      p.drawText(footerLeftStr, {
        x: MARGIN_LEFT, y: 24, size: 7.5, font: regularFont, color: MUTED
      })

      const pageNumStr = `Page ${i + 1} of ${totalPages}`
      const pageNumW = textWidth(pageNumStr, 8, regularFont)
      p.drawText(pageNumStr, {
        x: RIGHT_X - pageNumW, y: 24, size: 8, font: regularFont, color: MUTED
      })
    })

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes).toString('base64')
  })

  // Generate PDF report (existing)
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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
