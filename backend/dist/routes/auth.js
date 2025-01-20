"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = require("bcrypt");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Auth route - Login request received:', {
            username,
            passwordLength: password === null || password === void 0 ? void 0 : password.length,
            headers: req.headers,
            body: req.body
        });
        const user = await prisma.user.findFirst({
            where: { username }
        });
        if (!user) {
            console.log(`Auth route - User not found: ${username}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log(`Auth route - User found: ${user.id}, verifying password...`);
        const isValid = await (0, bcrypt_1.compare)(password, user.password);
        console.log('Password verification result:', { isValid });
        if (!isValid) {
            console.log('Invalid password');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'default-secret', { expiresIn: '24h' });
        console.log('Login successful, sending response');
        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map