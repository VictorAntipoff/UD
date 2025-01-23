import { Response } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ErrorResponse {
  message: string;
  code: string;
}

export const createErrorResponse = (
  res: Response, 
  statusCode: number, 
  message: string, 
  code: string
): Response => {
  return res.status(statusCode).json({
    message,
    code
  });
}; 