import { Router } from 'express';

export interface AppRouter extends Router {
  [key: string]: any;
} 