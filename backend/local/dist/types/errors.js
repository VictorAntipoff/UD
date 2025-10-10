export class AppError extends Error {
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
export const createErrorResponse = (res, statusCode, message, code) => {
    return res.status(statusCode).json({
        message,
        code
    });
};
