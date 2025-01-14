import { User, UserRole } from '@prisma/client';

export interface AuthUser extends Omit<User, 'role'> {
  id: number;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
} 