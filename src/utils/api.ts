const fetchWithTimeout = async (
  url: string, 
  init: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  // Merge signals if one already exists in init
  const signal = init.signal 
    ? new AbortSignal() // Create composite signal if needed
    : controller.signal;

  try {
    const response = await fetch(url, {
      ...init,
      signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        ...init.headers
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

export const api = {
  get: async <T>(url: string, init: RequestInit = {}) => {
    const response = await fetchWithTimeout(url, {
      ...init,
      method: 'GET'
    });
    return response.json() as Promise<T>;
  },

  post: async <T>(url: string, data: unknown, init: RequestInit = {}) => {
    const response = await fetchWithTimeout(url, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<T>;
  }
}; 