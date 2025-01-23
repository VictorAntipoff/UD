"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const port = process.env.PORT || 3010;
if (process.env.NODE_ENV !== 'production') {
    const server = app_1.default.listen(port, () => {
        var _a;
        console.log(`Server running at http://localhost:${port}`);
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Start time:', new Date().toISOString());
        console.log('Database URL:', ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
    });
    process.on('SIGTERM', () => {
        console.log('SIGTERM received. Shutting down...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
exports.default = app_1.default;
//# sourceMappingURL=index.js.map