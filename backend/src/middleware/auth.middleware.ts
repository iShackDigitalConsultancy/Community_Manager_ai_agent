import { Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../config/env';
import { AdminRequest } from '../modules/auth/auth.types';
import { pool } from '../config/database';

const client = env.OIDC_JWKS_URI ? jwksClient({
  jwksUri: env.OIDC_JWKS_URI,
  cache: true,
  rateLimit: true
}) : null;

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (client) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  } else {
    // Fallback to legacy symmetric checking if no external SSO is configured
    callback(null, env.JWT_SECRET);
  }
}

export const requireAuth = async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        }

        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, getKey, { algorithms: ['RS256', 'HS256'] }, async (err, decodedRaw) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
            }

            const decoded = decodedRaw as any;
            
            // Allow bypassing local DB lookup if token inherently carries Role claims from an IdP
            if (decoded.sso_verified) {
                req.admin = {
                    userId: decoded.sub,
                    email: decoded.email,
                    role: decoded.role,
                    assignedSchemeIds: decoded.assigned_schemes || [],
                    companyId: decoded.company_id
                };
                return next();
            }

            const pgClient = await pool.connect();
        try {
            const result = await pgClient.query(`
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
            }
            
            next();
        } finally {
            pgClient.release();
        }
      });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
};
