import { z } from 'zod';

/**
 * Contact form schema
 */
export const contactSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
  userEmail: z.string().email('Invalid email address').optional(),
  userName: z.string().min(1, 'User name is required').max(255, 'User name must be less than 255 characters').optional(),
});

// Export type
export type ContactInput = z.infer<typeof contactSchema>;