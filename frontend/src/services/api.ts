import axios from 'axios';
import type { AuthResponse } from '../types/auth';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const auth = {
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    try {
      console.log('Sending login request:', {
        url: `${api.defaults.baseURL}/auth/login`,
        credentials: { username: credentials.username }
      });

      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        // Store token in axios defaults
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Log successful login
        console.log('Login successful, token received');
      }

      return response.data;
    } catch (error) {
      console.error('API login error:', error);
      throw error;
    }
  }
};

// Add response interceptor for 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
    return Promise.reject(error);
  }
);

export default api; 