import { Request as ExpressRequest } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export {}; 