"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({ errors: error.errors });
            }
            return res.status(500).json({ error: 'Internal validation error' });
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map