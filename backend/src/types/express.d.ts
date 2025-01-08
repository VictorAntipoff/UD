import { User } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
} 