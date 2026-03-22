import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const filingUpdateSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Done', 'Overdue', 'NA']).optional(),
  notes: z.string().max(1000, 'Note is too long').optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  completed_at: z.string().optional(),
  completed_by: z.string().uuid().optional()
});

export const noteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000, 'Note is too long')
});

export const complianceCreateSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  categoryId: z.string().uuid('Invalid category'),
  companyId: z.string(), // can be a UUID or 'all'
  type: z.enum(['one-time', 'recurring']),
  frequency: z.enum(['Monthly', 'Quarterly', 'Annual', 'Once']).optional(),
  dueDate: z.string().optional(), // YYYY-MM-DD for one-time
  dueDateRule: z.string().optional(), // rule text for recurring
  notes: z.string().optional()
});
