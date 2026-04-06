import { pool } from '../../config/database';

export class AdminUsersService {
    async listUsers() {
        const res = await pool.query('SELECT id, email, full_name, role, is_active, company_id, last_login_at, created_at FROM admin_users');
        return res.rows;
    }

    async inviteUser(data: { email: string, fullName: string, role: string, companyId?: string }) {
        const res = await pool.query(
            `INSERT INTO admin_users (email, full_name, role, company_id, password_hash) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, company_id`,
            [data.email, data.fullName, data.role, data.companyId || null, 'mockhash']
        );
        return res.rows[0];
    }
    
    async updateUser(id: string, updates: Partial<{ full_name: string, role: string, is_active: boolean, company_id: string }>) {
        const fields = [];
        const values: any[] = [];
        let i = 1;
        
        if (updates.full_name) { fields.push(`full_name = $${i++}`); values.push(updates.full_name); }
        if (updates.role) { fields.push(`role = $${i++}`); values.push(updates.role); }
        if (updates.is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(updates.is_active); }
        if (updates.company_id !== undefined) { fields.push(`company_id = $${i++}`); values.push(updates.company_id); }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const res = await pool.query(
            `UPDATE admin_users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING id, email, full_name, role, is_active`,
            values
        );
        return res.rows[0];
    }

    async assignSchemes(adminId: string, schemeIds: string[], assignedBy: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM admin_scheme_assignments WHERE admin_user_id = $1', [adminId]);
            
            for (const schemeId of schemeIds) {
                await client.query(
                    'INSERT INTO admin_scheme_assignments (admin_user_id, scheme_id, assigned_by) VALUES ($1, $2, $3)',
                    [adminId, schemeId, assignedBy]
                );
            }
            
            await client.query('COMMIT');
            return { success: true };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

export const adminUsersService = new AdminUsersService();
