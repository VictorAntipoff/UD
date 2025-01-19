const API_URL = import.meta.env.VITE_API_URL;

export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}; 