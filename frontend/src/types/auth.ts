export interface User {
  id: string;
  username: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
} 