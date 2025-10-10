import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://localhost:3010/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't show toast for 404 errors on optional endpoints
    const optionalEndpoints = [
      '/factory/operations',
      '/factory/receipts',
      '/factory/drying-processes',
      '/management/wood-receipts',
      '/management/approvals/pending-count',
      '/users/profile/',
      '/users/profiles'
    ];

    const is404 = error.response?.status === 404;
    const isOptionalEndpoint = optionalEndpoints.some(endpoint =>
      error.config?.url?.includes(endpoint)
    );

    // Show toast notification for errors except optional 404s
    if (!is404 || !isOptionalEndpoint) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'An error occurred';

      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api; 