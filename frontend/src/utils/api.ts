const API_URL = import.meta.env.VITE_API_URL || process.env.VITE_API_URL;

const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    console.log('Checking API health at:', `${API_URL}/api/health`);

    const response = await fetchWithTimeout(`${API_URL}/api/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      console.error('Health check returned non-ok status:', response.status);
      const text = await response.text();
      console.error('Response body:', text);
      return false;
    }

    const data = await response.json();
    console.log('Health check response:', data);
    return data.status === 'ok' && data.database === 'connected';
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
};

/**
 * Makes an authenticated API request by automatically adding the auth token from localStorage
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authentication token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper function for GET requests
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'GET' });
}

/**
 * Helper function for POST requests
 */
export async function apiPost(endpoint: string, data?: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for PUT requests
 */
export async function apiPut(endpoint: string, data?: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for DELETE requests
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'DELETE' });
} 