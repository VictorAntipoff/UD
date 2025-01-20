import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import api from '../config/api';
import { supabase } from '../config/supabase';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('auth');
    return auth ? JSON.parse(auth) : false;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/api/auth/me');
        
        if (response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          localStorage.setItem('auth', 'true');

          // Sign in to Supabase with custom token
          await supabase.auth.signInWithPassword({
            email: response.data.user.email,
            password: token // Use your token as password or implement proper token exchange
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('auth');
          api.defaults.headers.common['Authorization'] = '';
          setIsAuthenticated(false);
          setUser(null);
          await supabase.auth.signOut();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Login to your backend
      const response = await api.post('/api/auth/login', { 
        email, 
        password,
        username: email
      });
      
      const { token, user } = response.data;
      
      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('auth', 'true');
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsAuthenticated(true);

      // Also sign in to Supabase
      await supabase.auth.signInWithPassword({
        email: user.email,
        password: token // Use your token as password or implement proper token exchange
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local auth
      localStorage.removeItem('token');
      localStorage.removeItem('auth');
      api.defaults.headers.common['Authorization'] = '';
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 