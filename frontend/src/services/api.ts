import axios from 'axios';

// Read backend URL from build-time env (Vite). Falls back to localhost for dev.
// In production, set VITE_API_URL=https://ud-production.up.railway.app in
// frontend/.env.production (already configured) so the bundle calls the
// correct host. Hardcoding 'http://localhost:3010' would break prod with
// CORS / mixed-content errors.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3010';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (credentials: { username: string; password: string }) => {
    try {
      console.log('Sending login request:', {
        url: `${BASE_URL}/api/auth/login`,
        credentials: { username: credentials.username }
      });

      const response = await api.post('/api/auth/login', credentials);
      console.log('Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login request failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }
};

export default api;