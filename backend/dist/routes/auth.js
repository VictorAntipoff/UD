"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = require("bcrypt");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
console.log('Registering auth routes...');
router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log('Route registered:', r.route.method, r.route.path);
    }
});
router.use((req, _res, next) => {
    console.log(`Auth Route: ${req.method} ${req.path}`);
    next();
});
router.use((req, _res, next) => {
    console.log('Auth request:', {
        path: req.path,
        method: req.method,
        body: req.body,
        headers: req.headers
    });
    next();
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        const user = await app_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isValidPassword = await (0, bcrypt_1.compare)(password, user.password);
        if (!isValidPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const user = await app_1.prisma.user.findUnique({
            where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                isActive: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({ user });
    }
    catch (error) {
        console.error('Error in /me endpoint:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/test', (_req, res) => {
    res.json({ message: 'Auth routes working' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map