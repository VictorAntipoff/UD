import { ZodError } from 'zod';
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            return next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ errors: error.errors });
            }
            return res.status(500).json({ error: 'Internal validation error' });
        }
    };
};
