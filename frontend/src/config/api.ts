const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3010';
  }
  return ''; // In production, use relative URLs
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  // Add other endpoints here
}; 