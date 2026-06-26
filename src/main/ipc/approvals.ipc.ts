import { ipcMain } from 'electron'
import { getPrisma } from '../database'

export function registerApprovalHandlers(): void {
  const prisma = getPrisma()

  // Get approvals for a deliverable
  ipcMain.handle('approvals:getByDeliverable', async (_, deliverableId: string) => {
    return prisma.approval.findMany({
      where: { deliverableId },
      include: { client: true, deliverable: true },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Get all pending approvals
  ipcMain.handle('approvals:getPending', async () => {
    return prisma.approval.findMany({
      where: { status: 'pending' },
      include: { client: true, deliverable: { include: { project: true } } },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Create approval request
  ipcMain.handle('approvals:create', async (_, data: {
    deliverableId: string
    clientId?: string
    comment?: string
  }) => {
    const approval = await prisma.approval.create({
      data: {
        deliverableId: data.deliverableId,
        clientId: data.clientId,
        status: 'pending',
        comment: data.comment || ''
      },
      include: { deliverable: true }
    })

    // Update deliverable status to sent
    await prisma.deliverable.update({
      where: { id: data.deliverableId },
      data: { status: 'sent' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: approval.deliverable.projectId,
        action: 'approval_requested',
        entity: 'approval',
        entityId: approval.id,
        message: `Approval requested for "${approval.deliverable.title}"`,
        userId: user?.id
      }
    })

    return approval
  })

  // Approve
  ipcMain.handle('approvals:approve', async (_, id: string, comment?: string) => {
    const approval = await prisma.approval.update({
      where: { id },
      data: { status: 'approved', comment: comment || '', date: new Date() },
      include: { deliverable: true }
    })

    await prisma.deliverable.update({
      where: { id: approval.deliverableId },
      data: { status: 'approved' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: approval.deliverable.projectId,
        action: 'deliverable_approved',
        entity: 'approval',
        entityId: id,
        message: `Deliverable "${approval.deliverable.title}" was approved`,
        userId: user?.id
      }
    })

    return approval
  })

  // Reject
  ipcMain.handle('approvals:reject', async (_, id: string, comment?: string) => {
    const approval = await prisma.approval.update({
      where: { id },
      data: { status: 'rejected', comment: comment || '', date: new Date() },
      include: { deliverable: true }
    })

    await prisma.deliverable.update({
      where: { id: approval.deliverableId },
      data: { status: 'rejected' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: approval.deliverable.projectId,
        action: 'deliverable_rejected',
        entity: 'approval',
        entityId: id,
        message: `Deliverable "${approval.deliverable.title}" was rejected`,
        userId: user?.id
      }
    })

    return approval
  })

  // Request changes
  ipcMain.handle('approvals:requestChanges', async (_, id: string, comment: string) => {
    const approval = await prisma.approval.update({
      where: { id },
      data: { status: 'changes_requested', comment, date: new Date() },
      include: { deliverable: true }
    })

    await prisma.deliverable.update({
      where: { id: approval.deliverableId },
      data: { status: 'changes_requested' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: approval.deliverable.projectId,
        action: 'deliverable_changes_requested',
        entity: 'approval',
        entityId: id,
        message: `Changes were requested for deliverable "${approval.deliverable.title}"`,
        userId: user?.id
      }
    })

    return approval
  })

  // Mark pending
  ipcMain.handle('approvals:markPending', async (_, id: string, comment?: string) => {
    const approval = await prisma.approval.update({
      where: { id },
      data: { status: 'pending', comment: comment || '', date: new Date() },
      include: { deliverable: true }
    })

    await prisma.deliverable.update({
      where: { id: approval.deliverableId },
      data: { status: 'sent' }
    })

    const user = await prisma.user.findFirst()
    await prisma.activityLog.create({
      data: {
        projectId: approval.deliverable.projectId,
        action: 'deliverable_marked_pending',
        entity: 'approval',
        entityId: id,
        message: `Deliverable "${approval.deliverable.title}" review was marked pending`,
        userId: user?.id
      }
    })

    return approval
  })

  // Resubmit
  ipcMain.handle('approvals:resubmit', async (_, deliverableId: string, comment?: string) => {
    // Update deliverable
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: 'resubmitted', version: { increment: 1 } }
    })

    // Create new approval entry
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { project: { include: { client: true } } }
    })

    const approval = await prisma.approval.create({
      data: {
        deliverableId,
        clientId: deliverable?.project?.client?.id,
        status: 'pending',
        comment: comment || 'Resubmitted for approval'
      }
    })

    return approval
  })

  // Update approval comment
  ipcMain.handle('approvals:updateComment', async (_, id: string, comment: string) => {
    return prisma.approval.update({
      where: { id },
      data: { comment }
    })
  })
}
