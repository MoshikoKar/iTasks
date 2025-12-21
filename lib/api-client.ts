/**
 * API client with CSRF protection and authentication
 */

interface RequestOptions extends RequestInit {
  csrfToken?: string;
}

/**
 * Make authenticated API request with CSRF protection
 */
export async function apiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { csrfToken, headers = {}, ...restOptions } = options;

  // Add CSRF token to headers if provided
  const requestHeaders = new Headers(headers);
  if (csrfToken) {
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }

  // Add credentials for cookie-based auth
  const requestOptions: RequestInit = {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'same-origin',
  };

  const response = await fetch(url, requestOptions);

  // Handle common error cases
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error?.includes('CSRF')) {
      throw new Error('CSRF token validation failed. Please refresh the page.');
    }
  }

  return response;
}

/**
 * POST request with CSRF protection
 */
export async function apiPost(
  url: string,
  data: any,
  csrfToken?: string
): Promise<Response> {
  return apiRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    csrfToken,
  });
}

/**
 * PUT request with CSRF protection
 */
export async function apiPut(
  url: string,
  data: any,
  csrfToken?: string
): Promise<Response> {
  return apiRequest(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    csrfToken,
  });
}

/**
 * PATCH request with CSRF protection
 */
export async function apiPatch(
  url: string,
  data: any,
  csrfToken?: string
): Promise<Response> {
  return apiRequest(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    csrfToken,
  });
}

/**
 * DELETE request with CSRF protection
 */
export async function apiDelete(
  url: string,
  csrfToken?: string
): Promise<Response> {
  return apiRequest(url, {
    method: 'DELETE',
    csrfToken,
  });
}