"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
exports.adminRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const checkAdmin = async (req, res, next) => {
    var _a;
    try {
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        return next();
    }
    catch (error) {
        return res.status(500).json({ error: 'Error checking admin status' });
    }
};
exports.adminRouter.get('/users', auth_1.authenticateToken, checkAdmin, async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                isActive: true
            }
        });
        return res.json(users);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error fetching users' });
    }
});
//# sourceMappingURL=admin.js.map