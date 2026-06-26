import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  code: z.string().min(1, 'Project code is required').max(20),
  description: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['draft', 'active', 'waiting_approval', 'approved', 'rejected', 'closed']).default('draft'),
  tags: z.string().optional()
})

export type ProjectFormData = z.infer<typeof projectSchema>

export const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'waiting_approval', 'completed', 'blocked', 'cancelled']).default('pending'),
  startDate: z.string().optional(),
  dueDate: z.string().optional()
})

export type TodoFormData = z.infer<typeof todoSchema>

export const deliverableSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  deliverableNumber: z.string().optional()
})

export type DeliverableFormData = z.infer<typeof deliverableSchema>

export const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional()
})

export type NoteFormData = z.infer<typeof noteSchema>

export const approvalSchema = z.object({
  comment: z.string().optional()
})

export type ApprovalFormData = z.infer<typeof approvalSchema>
