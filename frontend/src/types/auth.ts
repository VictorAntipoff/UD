export interface User {
  id: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  message?: string;
}

export interface ErrorResponse {
  message: string;
  status?: number;
} 