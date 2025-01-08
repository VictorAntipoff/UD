import { ReactNode } from 'react';

export interface LayoutProps {
  children?: ReactNode;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserType | null;
  login: (token: string, user: UserType) => void;
  logout: () => void;
}

export interface UserType {
  id: number;
  email: string;
  role: string;
} 