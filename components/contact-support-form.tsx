'use client';

import { useState } from 'react';
import { Button } from './button';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ContactSupportFormProps {
  userEmail: string;
  userName: string;
}

export function ContactSupportForm({ userEmail, userName }: ContactSupportFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setSuccess(true);
      setSubject('');
      setMessage('');
      
      setTimeout(() => {
        setSuccess(false);
        router.refresh();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-green-800 dark:text-green-300">
            Your message has been sent successfully. We'll get back to you soon.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Subject <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="Brief description of your issue or suggestion"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Message <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all resize-none"
            placeholder="Please provide details about the problem, improvement idea, or your request..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={success}>
          <Send size={16} className="mr-2" />
          Send Message
        </Button>
      </div>
    </form>
  );
}
