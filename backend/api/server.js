"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("./swagger.json"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3010;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3020',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV
    });
});
app.use('/api/auth', auth_routes_1.default);
app.use((err, _req, res, _next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
app.listen(PORT, () => {
    console.log(`
🚀 Server is running!
📝 API Documentation: http://localhost:${PORT}/api-docs
🏠 Homepage: http://localhost:${PORT}
🔥 API Endpoint: http://localhost:${PORT}/api
  `);
});
//# sourceMappingURL=server.js.map