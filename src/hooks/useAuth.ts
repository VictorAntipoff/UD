import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  login: () => Promise.reject('Not implemented'),
  logout: () => Promise.reject('Not implemented')
});

export const useAuth = () => useContext(AuthContext); 