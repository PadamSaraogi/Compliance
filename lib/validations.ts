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

export const userSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'ceo', 'accountant']),
  is_active: z.boolean().default(true)
});
