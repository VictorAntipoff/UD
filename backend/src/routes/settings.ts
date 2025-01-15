import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

export default router; 