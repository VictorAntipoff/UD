import { Router } from 'express';
import authRoutes from './auth';
import projectRoutes from './projects';
import jobsRoutes from './jobs';
import settingsRoutes from './settings';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/projects', authenticateToken, projectRoutes);
router.use('/jobs', authenticateToken, jobsRoutes);
router.use('/settings', authenticateToken, settingsRoutes);

export default router; 