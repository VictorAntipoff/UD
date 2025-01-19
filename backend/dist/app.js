"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const morgan_1 = __importDefault(require("morgan"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const allowedOrigins = [
    'http://localhost:3020',
    'http://localhost:3010',
    'https://ud-frontend-chi.vercel.app',
    'https://ud-frontend-staging.vercel.app',
    'https://ud-backend-production.up.railway.app'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express_1.default.json());
app.use((0, morgan_1.default)(':method :url :status :response-time ms'));
app.use((req, _res, next) => {
    console.log('Request:', {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers
    });
    next();
});
const prisma = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        },
    },
});
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV
    });
});
app.use('/api/auth', auth_1.default);
app.get('/api/test-db', async (_req, res) => {
    try {
        const userCount = await prisma.user.count();
        const adminUser = await prisma.user.findFirst({
            where: {
                email: 'admin@udesign.com'
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                isActive: true
            }
        });
        const settings = await prisma.setting.findMany();
        res.json({
            status: 'ok',
            data: {
                userCount,
                adminUser,
                settingsCount: settings.length
            }
        });
    }
    catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown database error',
            error: error
        });
    }
});
exports.default = app;
//# sourceMappingURL=app.js.map