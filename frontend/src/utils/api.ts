const API_URL = import.meta.env.VITE_API_URL;

const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Health check failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
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