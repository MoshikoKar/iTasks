import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for authentication check
 * Fetches current user and redirects to login if not authenticated
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/user');
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          console.error('Failed to get user');
          if (res.status === 401) {
            router.replace('/login');
          }
          setError('Authentication failed');
        }
      } catch (err) {
        console.error('Failed to get user:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  return { user, loading, error };
}
