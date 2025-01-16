export interface User {
  id: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
} 