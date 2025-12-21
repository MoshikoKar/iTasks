import { useState, useEffect } from 'react';

export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch CSRF token on mount
    fetch('/api/csrf', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(data => {
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
      })
      .catch(error => {
        console.error('Failed to fetch CSRF token:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getHeaders = () => {
    if (!csrfToken) return {};
    return {
      'X-CSRF-Token': csrfToken,
    };
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/csrf', {
        credentials: 'same-origin',
      });
      const data = await response.json();
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
        return data.csrf_token;
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
    return null;
  };

  return {
    csrfToken,
    loading,
    getHeaders,
    refreshToken,
  };
}