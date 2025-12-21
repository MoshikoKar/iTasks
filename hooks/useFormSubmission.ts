import { useState } from 'react';

interface UseFormSubmissionReturn<T> {
  isLoading: boolean;
  error: string | null;
  submitForm: (data: T) => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for form submission with loading and error handling
 * @param onSubmit - Async function to handle form submission
 * @param onSuccess - Optional callback on successful submission
 * @param csrfToken - Optional CSRF token for secure requests
 */
export function useFormSubmission<T>(
  onSubmit: (data: T) => Promise<void>,
  onSuccess?: () => void,
  csrfToken?: string
): UseFormSubmissionReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitForm = async (data: T) => {
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(data);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err; // Re-throw to allow caller to handle if needed
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    isLoading,
    error,
    submitForm,
    clearError,
  };
}
