import axios from 'axios';

const BASE_URL = 'http://localhost:3010';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

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