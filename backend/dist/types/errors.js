"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const createErrorResponse = (res, statusCode, message, code) => {
    return res.status(statusCode).json({
        message,
        code
    });
};
exports.createErrorResponse = createErrorResponse;
//# sourceMappingURL=errors.js.map