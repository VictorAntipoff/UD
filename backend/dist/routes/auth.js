// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';
const prisma = new PrismaClient();
async function authRoutes(fastify) {
    // Debug logging
    fastify.addHook('onRequest', async (request) => {
        console.log('Auth request:', {
            url: request.url,
            method: request.method,
            body: request.body,
            headers: request.headers
        });
    });
    // Login route
    fastify.post('/login', async (request, reply) => {
        try {
            const { email, password } = request.body;
            // Validate input
            if (!email || !password) {
                return reply.status(400).send({
                    error: 'Email and password are required'
                });
            }
            // Find user
            const user = await prisma.user.findUnique({
                where: { email }
            });
            if (!user) {
                return reply.status(401).send({
                    error: 'Invalid credentials'
                });
            }
            // Verify password
            const validPassword = await compare(password, user.password);
            if (!validPassword) {
                return reply.status(401).send({
                    error: 'Invalid credentials'
                });
            }
            // Generate token
            const token = jwt.sign({
                userId: user.id,
                role: user.role
            }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
            // Return success
            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            };
        }
        catch (error) {
            console.error('Login error:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });
    // Me route - with JWT verification
    fastify.get('/me', async (request, reply) => {
        try {
            // Get token from Authorization header
            const authHeader = request.headers.authorization;
            const token = authHeader?.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ error: 'Not authenticated' });
            }
            // Verify and decode token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            }
            catch (err) {
                return reply.status(401).send({ error: 'Invalid token' });
            }
            const userId = decoded.userId;
            const user = await prisma.user.findUnique({
                where: { id: userId },
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
                return reply.status(404).send({ error: 'User not found' });
            }
            return { user };
        }
        catch (error) {
            console.error('Error in /me endpoint:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // Test endpoint
    fastify.get('/test', async () => {
        return { message: 'Auth routes working' };
    });
    // Ping endpoint
    fastify.get('/ping', async () => {
        return {
            message: 'Auth API is working',
            timestamp: new Date().toISOString()
        };
    });
}
export default authRoutes;
