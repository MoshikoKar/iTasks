import { z } from 'zod';
import { TaskPriority, TaskType } from '@prisma/client';

/**
 * Cron expression validation
 */
const cronExpressionSchema = z.string().regex(
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
  'Invalid cron expression'
);

/**
 * Create recurring task configuration schema
 */
export const createRecurringTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().min(1, 'Description is required'),
  cron: cronExpressionSchema,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.Medium),
  type: z.nativeEnum(TaskType).default(TaskType.Standard),
  branch: z.string().optional(),
  assigneeId: z.string().uuid('Invalid assignee ID'),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

/**
 * Update recurring task configuration schema
 */
export const updateRecurringTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  cron: cronExpressionSchema.optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  branch: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

// Export types
export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>;
export type UpdateRecurringTaskInput = z.infer<typeof updateRecurringTaskSchema>;
