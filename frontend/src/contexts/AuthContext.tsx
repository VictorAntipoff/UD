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

interface AuthError {
  status?: number;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add this at the top of the file to debug
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_USER_PASSWORD = import.meta.env.VITE_SUPABASE_USER_PASSWORD;

// Add validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_USER_PASSWORD) {
  console.error('Missing Supabase environment variables:', {
    url: !!SUPABASE_URL,
    key: !!SUPABASE_ANON_KEY,
    password: !!SUPABASE_USER_PASSWORD
  });
}

const ADMIN_EMAIL = 'admin@example.com';

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

          // Try to get existing Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('No Supabase session, attempting to sign in...');
            // If no session, sign in with admin credentials
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: ADMIN_EMAIL,
              password: SUPABASE_USER_PASSWORD || 'Admin123'
            });
            
            if (signInError) {
              console.error('Supabase auth error:', signInError);
              // Try to sign up if login fails
              const { error: signUpError } = await supabase.auth.signUp({
                email: ADMIN_EMAIL,
                password: SUPABASE_USER_PASSWORD || 'Admin123'
              });
              if (signUpError) {
                console.error('Supabase signup error:', signUpError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        const authError = error as AuthError;
        if (authError.response?.status === 401 || authError.response?.status === 403) {
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

      // First login to backend
      const response = await api.post('/api/auth/login', { 
        email, 
        password,
        username: email
      });
      
      const { token, user } = response.data;
      
      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      // Then sign in to Supabase with admin credentials
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: SUPABASE_USER_PASSWORD || 'Admin123'
      });

      if (supabaseError) {
        console.error('Supabase auth error:', supabaseError);
      }

      // Set local auth
      localStorage.setItem('token', token);
      localStorage.setItem('auth', 'true');
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsAuthenticated(true);
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