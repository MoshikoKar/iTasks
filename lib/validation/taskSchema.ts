import { z } from 'zod';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';

/**
 * Task context (IT assets) schema
 */
export const taskContextSchema = z.object({
  serverName: z.string().optional(),
  application: z.string().optional(),
  workstationId: z.string().optional(),
  adUser: z.string().optional(),
  environment: z.string().optional(),
  ipAddress: z.string().optional(),
  manufacturer: z.string().optional(),
  version: z.string().optional(),
}).optional();

/**
 * Create task schema
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.Medium),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.Open),
  type: z.nativeEnum(TaskType).default(TaskType.Standard),
  branch: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  slaDeadline: z.coerce.date().optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  creatorId: z.string().uuid('Invalid creator ID'), // Required for validation, but set from authenticated user
  tags: z.array(z.string()).optional(),
  context: taskContextSchema,
});

/**
 * Update task schema (all fields optional except ID)
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  branch: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  slaDeadline: z.coerce.date().nullable().optional(),
  assigneeId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Comment schema
 */
export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
  taskId: z.string().uuid('Invalid task ID'),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

/**
 * Task filter schema
 */
export const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  branch: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  search: z.string().optional(),
});

// Export types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
export type TaskContextInput = z.infer<typeof taskContextSchema>;
