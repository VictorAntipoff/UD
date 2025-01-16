const getApiBaseUrl = () => {
  // Debug logging
  console.log('Environment:', {
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
    apiUrl: import.meta.env.VITE_API_URL
  });

  // Always use environment variable in production
  if (import.meta.env.PROD) {
    return 'https://ud-backend-production.up.railway.app';
  }

  // Development fallback
  return 'http://localhost:3010';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug log
console.log('API Base URL:', API_BASE_URL);

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  // Add other endpoints here
}; 