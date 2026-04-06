import { pool } from '../../config/database';

export class UnitsService {
    async list(schemeId: string) {
        const res = await pool.query('SELECT * FROM scheme_units WHERE scheme_id = $1 AND is_active = true ORDER BY unit_number', [schemeId]);
        return res.rows;
    }

    async getById(schemeId: string, unitId: string) {
        const res = await pool.query('SELECT * FROM scheme_units WHERE scheme_id = $1 AND id = $2 AND is_active = true', [schemeId, unitId]);
        return res.rows[0];
    }

    async create(schemeId: string, data: { unit_number: string, unit_type?: string, owner_name?: string, owner_email?: string, owner_phone?: string, tenant_name?: string, tenant_email?: string, tenant_phone?: string }) {
        const res = await pool.query(
            `INSERT INTO scheme_units 
            (scheme_id, unit_number, unit_type, owner_name, owner_email, owner_phone, tenant_name, tenant_email, tenant_phone) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [schemeId, data.unit_number, data.unit_type || 'residential', data.owner_name, data.owner_email, data.owner_phone, data.tenant_name, data.tenant_email, data.tenant_phone]
        );
        return res.rows[0];
    }

    async update(schemeId: string, unitId: string, updates: any) {
        const fields = [];
        const values: any[] = [];
        let i = 1;

        const allowed = ['unit_type', 'owner_name', 'owner_email', 'owner_phone', 'tenant_name', 'tenant_email', 'tenant_phone', 'is_active'];
        for (const key of allowed) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = $${i++}`);
                values.push(updates[key]);
            }
        }

        if (fields.length === 0) return null;

        // i is now (fieldCount + 1) — push schemeId and unitId next
        values.push(schemeId, unitId);
        const res = await pool.query(
            `UPDATE scheme_units SET ${fields.join(', ')}, updated_at = NOW() WHERE scheme_id = $${i} AND id = $${i + 1} RETURNING *`,
            values
        );
        return res.rows[0];
    }

    async delete(schemeId: string, unitId: string) {
        await pool.query('UPDATE scheme_units SET is_active = false, updated_at = NOW() WHERE scheme_id = $1 AND id = $2', [schemeId, unitId]);
        return { success: true };
    }
}

export const unitsService = new UnitsService();
