import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 