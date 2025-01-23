"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/jobs', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const job = await app_1.prisma.job.create({
            data: Object.assign(Object.assign({}, req.body), { userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '' })
        });
        return res.json(job);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error creating job' });
    }
});
router.get('/calculations', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const calculations = await app_1.prisma.woodCalculation.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                woodType: true
            }
        });
        return res.json(calculations);
    }
    catch (error) {
        console.error('Error fetching calculations:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=factory.js.map