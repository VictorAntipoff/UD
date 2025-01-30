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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      mode: 'cors'
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