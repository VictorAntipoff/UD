import axios from 'axios';

const API_URL = 'http://localhost:3010/api'; // Make sure this matches your backend port

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('API login error:', error);
    throw error;
  }
};