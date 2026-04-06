import { pool } from '../../config/database';
import { env } from '../../config/env';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
    async login(email: string, passwordString: string) {
        const result = await pool.query(
            `SELECT id, email, password_hash, full_name, role, is_active, company_id FROM admin_users WHERE email = $1`,
            [email]
        );
        
        const user = result.rows[0];
        if (!user || !user.is_active) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(passwordString, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        return {
            ...this.generateTokens(user.id, user.role, undefined, user.company_id),
            user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, companyId: user.company_id }
        };
    }

    async tenantLogin(schemeId: string, unitNumber: string, idNumber: string) {
        const result = await pool.query(
            `SELECT su.id as unit_id, su.scheme_id, su.tenant_name, s.scheme_name 
             FROM scheme_units su
             JOIN schemes s ON su.scheme_id = s.id
             WHERE su.scheme_id = $1 AND su.unit_number = $2 AND su.tenant_id_number = $3 AND su.is_active = true`,
            [schemeId, unitNumber, idNumber]
        );
        
        const tenant = result.rows[0];
        if (!tenant) {
            throw new Error('Invalid community, unit number, or ID combination.');
        }

        return {
            ...this.generateTokens(tenant.unit_id, 'tenant', tenant.scheme_id),
            user: { 
                id: tenant.unit_id, 
                role: 'tenant', 
                fullName: tenant.tenant_name,
                schemeId: tenant.scheme_id,
                schemeName: tenant.scheme_name
            }
        };
    }

    async requestTenantOTP(contactInfo: string) {
        const result = await pool.query(
            `SELECT id, scheme_id, tenant_name 
             FROM scheme_units 
             WHERE (tenant_email = $1 OR tenant_phone = $1) AND is_active = true
             LIMIT 1`,
            [contactInfo]
        );
        const tenant = result.rows[0];
        if (!tenant) {
            throw new Error('No active tenant found with that contact information.');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(otp, 10);
        
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await pool.query(
            `INSERT INTO tenant_login_otp (contact_info, code_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [contactInfo, codeHash, expiresAt.toISOString()]
        );

        if (contactInfo.includes('@')) {
            try {
                await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': env.BREVO_API_KEY,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { email: 'noreply@realestatemeta.ai', name: 'Community Manager Portal' },
                        to: [{ email: contactInfo }],
                        subject: 'Your Community Login OTP Verification Code',
                        htmlContent: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 8px;">
                            <h2 style="color: #38A3C8;">Community Portal Access</h2>
                            <p>You requested a one-time password to access the portal.</p>
                            <p>Here is your security code:</p>
                            <h1 style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 6px; letter-spacing: 5px; color: #1e293b;">${otp}</h1>
                            <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
                        </div>
                        `
                    })
                });
                console.log(`[Email Sent] OTP via Brevo to ${contactInfo}`);
            } catch (err) {
                console.error('[Brevo Error] Failed to send OTP email:', err);
                throw new Error('Failed to dispatch mail server. Please try again later.');
            }
        } else {
            // SMS fallback/log
            console.log(`\n\n=== [SMS MOCK] OTP for phone ${contactInfo} is: ${otp} ===\n\n`);
        }

        return { success: true, message: 'OTP sent successfully.' };
    }

    async verifyTenantOTP(contactInfo: string, otp: string) {
        const otpResult = await pool.query(
            `SELECT id, code_hash 
             FROM tenant_login_otp 
             WHERE contact_info = $1 AND expires_at > NOW() AND verified = false
             ORDER BY created_at DESC LIMIT 1`,
            [contactInfo]
        );

        const otpRecord = otpResult.rows[0];
        if (!otpRecord) {
            throw new Error('Invalid or expired OTP.');
        }

        const isValid = await bcrypt.compare(otp, otpRecord.code_hash);
        if (!isValid) {
            throw new Error('Invalid OTP.');
        }

        await pool.query('UPDATE tenant_login_otp SET verified = true WHERE id = $1', [otpRecord.id]);

        const result = await pool.query(
            `SELECT su.id as unit_id, su.scheme_id, su.tenant_name, s.scheme_name 
             FROM scheme_units su
             JOIN schemes s ON su.scheme_id = s.id
             WHERE (su.tenant_email = $1 OR su.tenant_phone = $1) AND su.is_active = true
             LIMIT 1`,
            [contactInfo]
        );
        
        const tenant = result.rows[0];
        if (!tenant) {
            throw new Error('Tenant record not found.');
        }

        return {
            ...this.generateTokens(tenant.unit_id, 'tenant', tenant.scheme_id),
            user: { 
                id: tenant.unit_id, 
                role: 'tenant', 
                fullName: tenant.tenant_name,
                schemeId: tenant.scheme_id,
                schemeName: tenant.scheme_name
            }
        };
    }

    async refresh(refreshToken: string) {
        try {
            const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as { sub: string, type: string, role?: string, schemeId?: string };
            if (decoded.type !== 'refresh') throw new Error();

            if (decoded.role === 'tenant') {
                const result = await pool.query('SELECT is_active FROM scheme_units WHERE id = $1', [decoded.sub]);
                if (!result.rows[0]?.is_active) throw new Error();
                return this.generateTokens(decoded.sub, 'tenant', decoded.schemeId);
            } else {
                const result = await pool.query('SELECT is_active, company_id FROM admin_users WHERE id = $1', [decoded.sub]);
                if (!result.rows[0]?.is_active) throw new Error();
                return this.generateTokens(decoded.sub, decoded.role || 'admin', undefined, result.rows[0].company_id);
            }
        } catch {
            throw new Error('Invalid refresh token');
        }
    }

    private generateTokens(userId: string, role: string, schemeId?: string, companyId?: string) {
        const accessPayload: any = { sub: userId, type: 'access', role };
        const refreshPayload: any = { sub: userId, type: 'refresh', role };
        if (schemeId) {
            accessPayload.schemeId = schemeId;
            refreshPayload.schemeId = schemeId;
        }
        if (companyId) {
            accessPayload.companyId = companyId;
            refreshPayload.companyId = companyId;
        }

        const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY as any });
        const refreshToken = jwt.sign(refreshPayload, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any });
        return { accessToken, refreshToken };
    }
}

export const authService = new AuthService();
