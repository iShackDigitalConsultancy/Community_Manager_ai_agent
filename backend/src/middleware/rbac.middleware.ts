import { Response, NextFunction } from 'express';
import { AdminRequest } from '../modules/auth/auth.types';

export const requireRole = (...roles: string[]) => {
    return (req: AdminRequest, res: Response, next: NextFunction) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
        }

        next();
    };
};
