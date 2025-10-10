import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
// Ensure environment variables are loaded
config();
const router = express.Router();
// Debug environment variables
console.log('Supabase Config:', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    url: process.env.SUPABASE_URL
});
// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
router.get('/test', (_req, res) => {
    return res.json({ message: 'Auth routes working' });
});
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', {
            username,
            hasPassword: !!password,
            body: req.body
        });
        // Get user from Supabase database
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
            .eq('isActive', true) // Only get active users
            .single();
        // Debug logging
        console.log('Full Supabase Response:', {
            data: user,
            error: error,
            supabaseUrl: process.env.SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.length
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
        // Debug password check
        console.log('Password check:', {
            hasStoredPassword: !!user.password,
            providedPasswordLength: password?.length,
            passwordMatch: await bcrypt.compare(password, user.password)
        });
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Invalid password'
            });
        }
        const token = jwt.sign({
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
        // Enhanced error logging
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
            code: error?.code
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
            hasData: !!data?.length,
            error: error?.message
        });
    }
    catch (err) {
        return res.json({
            success: false,
            error: err.message
        });
    }
});
export default router;
