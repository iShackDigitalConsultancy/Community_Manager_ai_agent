import { Response, NextFunction } from 'express';
import { AdminRequest } from '../modules/auth/auth.types';

import { pool } from '../config/database';

export const requireSchemeAccess = async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
        return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const schemeId = req.params.id as string;
    if (!schemeId) {
        return res.status(400).json({ error: 'Scheme ID required', code: 'MISSING_SCHEME_ID' });
    }

    if (req.admin.role === 'super_admin') {
        return next();
    }

    if (req.admin.assignedSchemeIds.includes(schemeId)) {
        return next();
    }

    if (req.admin.companyId) {
        try {
            const result = await pool.query('SELECT company_id FROM schemes WHERE id = $1', [schemeId]);
            if (result.rows[0]?.company_id === req.admin.companyId) {
                return next();
            }
        } catch (e) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    return res.status(403).json({ error: 'Forbidden', code: 'SCHEME_ACCESS_DENIED' });
};
