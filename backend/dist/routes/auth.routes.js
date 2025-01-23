"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const router = express_1.default.Router();
console.log('Supabase Config:', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    url: process.env.SUPABASE_URL
});
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
router.get('/test', (_req, res) => {
    return res.json({ message: 'Auth routes working' });
});
router.post('/login', async (req, res) => {
    var _a;
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', {
            username,
            hasPassword: !!password,
            body: req.body
        });
        const { data: user, error } = await supabase
            .from('users')
            .select(`
        id,
        username,
        password,
        role,
        isActive,
        firstName,
        lastName,
        email
      `)
            .eq('username', username)
            .eq('isActive', true)
            .single();
        console.log('Full Supabase Response:', {
            data: user,
            error: error,
            supabaseUrl: process.env.SUPABASE_URL,
            hasServiceKey: !!((_a = process.env.SUPABASE_SERVICE_ROLE_KEY) === null || _a === void 0 ? void 0 : _a.length)
        });
        if (error) {
            console.error('Database error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return res.status(500).json({
                error: 'Database error',
                details: error.message,
                code: error.code
            });
        }
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'User not found'
            });
        }
        console.log('Password check:', {
            hasStoredPassword: !!user.password,
            providedPasswordLength: password === null || password === void 0 ? void 0 : password.length,
            passwordMatch: await bcrypt_1.default.compare(password, user.password)
        });
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Invalid password'
            });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            details: error.details
        });
        return res.status(500).json({
            error: 'Login failed',
            details: error.message,
            code: error === null || error === void 0 ? void 0 : error.code
        });
    }
});
router.get('/test-db', async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        return res.json({
            success: !error,
            hasData: !!(data === null || data === void 0 ? void 0 : data.length),
            error: error === null || error === void 0 ? void 0 : error.message
        });
    }
    catch (err) {
        return res.json({
            success: false,
            error: err.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map