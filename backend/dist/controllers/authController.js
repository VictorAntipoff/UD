"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.register = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error during login' });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username: email.split('@')[0],
                firstName: 'DefaultFirstName',
                lastName: 'DefaultLastName',
                role: 'USER'
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error during registration' });
    }
};
exports.register = register;
const getMe = async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({
            id: user.id,
            email: user.email,
            role: user.role
        });
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=authController.js.map