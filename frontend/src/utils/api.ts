const API_URL = import.meta.env.VITE_API_URL;

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