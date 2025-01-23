"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const projects = await app_1.prisma.project.findMany({
            where: {
                ownerId: req.user.id
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
        return res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, description, isPublic } = req.body;
        const project = await app_1.prisma.project.create({
            data: {
                name: String(name),
                description: description ? String(description) : null,
                isPublic: Boolean(isPublic),
                ownerId: req.user.id
            }
        });
        return res.status(201).json(project);
    }
    catch (error) {
        console.error('Error creating project:', error);
        return res.status(500).json({ error: 'Failed to create project' });
    }
});
exports.default = router;
//# sourceMappingURL=projects.js.map