"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.post('/jobs', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const job = await prisma.job.create({
            data: Object.assign(Object.assign({}, req.body), { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId })
        });
        return res.json(job);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error creating job' });
    }
});
//# sourceMappingURL=factory.js.map