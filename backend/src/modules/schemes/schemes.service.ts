import { pool } from '../../config/database';

export class SchemesService {
    async create(data: { name: string, code: string, type: string, managingAgent?: string, companyId?: string }) {
        const res = await pool.query(
            `INSERT INTO schemes (scheme_name, scheme_code, scheme_type, managing_agent_name, company_id, status) 
             VALUES ($1, $2, $3, $4, $5, 'setup') RETURNING id, scheme_name, scheme_code, company_id`,
            [data.name, data.code, data.type, data.managingAgent, data.companyId || null]
        );
        return res.rows[0];
    }

    async getById(id: string) {
        const res = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);
        return res.rows[0];
    }

    async update(id: string, updates: Partial<{ scheme_name: string, status: string }>) {
        const fields = [];
        const values: any[] = [];
        let i = 1;

        if (updates.scheme_name) { fields.push(`scheme_name = $${i++}`); values.push(updates.scheme_name); }
        if (updates.status) { fields.push(`status = $${i++}`); values.push(updates.status); }

        if (fields.length === 0) return null;

        values.push(id);
        const res = await pool.query(
            `UPDATE schemes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
            values
        );
        return res.rows[0];
    }

    async delete(id: string) {
        await pool.query('UPDATE schemes SET is_active = false, status = $1, updated_at = NOW() WHERE id = $2', ['archived', id]);
        return { success: true };
    }

    async list(assignedSchemeIds?: string[], companyId?: string) {
        if (assignedSchemeIds) {
            // Filter mode for scheme_admin or viewer
            // If they belong to a company, they should see all schemes for that company.
            if (companyId) {
                const res = await pool.query(
                    `SELECT s.id, s.scheme_name, s.scheme_code, s.scheme_type, s.status, s.company_id, s.is_active, c.name as company_name 
                     FROM schemes s 
                     LEFT JOIN companies c ON s.company_id = c.id 
                     WHERE s.is_active = true AND s.company_id = $1`,
                    [companyId]
                );
                return res.rows;
            }

            if (assignedSchemeIds.length === 0) return [];
            
            const res = await pool.query(
                `SELECT s.id, s.scheme_name, s.scheme_code, s.scheme_type, s.status, s.company_id, s.is_active, c.name as company_name 
                 FROM schemes s 
                 LEFT JOIN companies c ON s.company_id = c.id 
                 WHERE s.is_active = true AND s.id = ANY($1::uuid[])`,
                [assignedSchemeIds]
            );
            return res.rows;
        } else {
            // Super Admin gets all
            const res = await pool.query(
                `SELECT s.id, s.scheme_name, s.scheme_code, s.scheme_type, s.status, s.company_id, s.is_active, c.name as company_name 
                 FROM schemes s 
                 LEFT JOIN companies c ON s.company_id = c.id 
                 WHERE s.is_active = true`
            );
            return res.rows;
        }
    }
}

export const schemesService = new SchemesService();
