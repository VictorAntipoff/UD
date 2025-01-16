"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: req.user.userId },
                    { isPublic: true }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const project = await prisma.project.create({
            data: {
                name,
                description,
                isPublic: isPublic || false,
                ownerId: req.user.userId
            }
        });
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});
exports.default = router;
//# sourceMappingURL=projects.js.map