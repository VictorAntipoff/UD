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
(0, dotenv_1.config)();
const app = (0, express_1.default)();
app.options('*', (0, cors_1.default)());
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
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