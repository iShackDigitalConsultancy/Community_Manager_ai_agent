import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AdminRequest } from '../modules/auth/auth.types';
import { pool } from '../config/database';

export const requireAuth = async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string, type: string };

        if (decoded.type !== 'access') {
            return res.status(401).json({ error: 'Invalid token type', code: 'INVALID_TOKEN' });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT u.id, u.email, u.role, u.is_active, u.company_id,
                       COALESCE(
                           json_agg(sa.scheme_id) FILTER (WHERE sa.scheme_id IS NOT NULL), 
                           '[]'
                       ) as assigned_schemes
                FROM admin_users u
                LEFT JOIN admin_scheme_assignments sa ON u.id = sa.admin_user_id
                WHERE u.id = $1
                GROUP BY u.id
            `, [decoded.sub]);

            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
            }

            if (!user.is_active) {
                return res.status(403).json({ error: 'Account inactive', code: 'ACCOUNT_INACTIVE' });
            }

            req.admin = {
                userId: user.id,
                email: user.email,
                role: user.role,
                assignedSchemeIds: user.assigned_schemes,
                companyId: user.company_id
            };
            
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
};
