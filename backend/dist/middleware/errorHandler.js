"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, _req, res, _next) => {
    console.error('Error:', error);
    res.status(500).json({
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map