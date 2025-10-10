import { Router } from 'express';
import { prisma } from '../lib/prisma';
const router = Router();
router.get('/', async (_req, res) => {
    try {
        const users = await prisma.user.findMany();
        return res.json(users);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
});
export default router;
