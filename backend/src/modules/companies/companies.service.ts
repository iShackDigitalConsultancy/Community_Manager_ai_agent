import { pool } from '../../config/database';

export class CompaniesService {
    async create(data: { name: string, status?: string, metadata?: any, address?: string, email?: string, contact_number?: string, main_contact_person?: string }) {
        const existing = await pool.query('SELECT id FROM companies WHERE name = $1', [data.name]);
        if (existing.rows.length > 0) {
            throw new Error('A company with this name already exists.');
        }

        const res = await pool.query(
            `INSERT INTO companies (name, status, metadata, address, email, contact_number, main_contact_person) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [data.name, data.status || 'active', data.metadata || {}, data.address || null, data.email || null, data.contact_number || null, data.main_contact_person || null]
        );
        return res.rows[0];
    }

    async getById(id: string) {
        const res = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
        return res.rows[0];
    }

    async update(id: string, updates: Partial<{ name: string, status: string, metadata: any, address: string, email: string, contact_number: string, main_contact_person: string }>) {
        if (updates.name) {
            const existing = await pool.query('SELECT id FROM companies WHERE name = $1 AND id != $2', [updates.name, id]);
            if (existing.rows.length > 0) {
                throw new Error('A company with this name already exists.');
            }
        }

        const fields = [];
        const values: any[] = [];
        let i = 1;

        if (updates.name) { fields.push(`name = $${i++}`); values.push(updates.name); }
        if (updates.status) { fields.push(`status = $${i++}`); values.push(updates.status); }
        if (updates.metadata !== undefined) { fields.push(`metadata = $${i++}`); values.push(updates.metadata); }
        if (updates.address !== undefined) { fields.push(`address = $${i++}`); values.push(updates.address); }
        if (updates.email !== undefined) { fields.push(`email = $${i++}`); values.push(updates.email); }
        if (updates.contact_number !== undefined) { fields.push(`contact_number = $${i++}`); values.push(updates.contact_number); }
        if (updates.main_contact_person !== undefined) { fields.push(`main_contact_person = $${i++}`); values.push(updates.main_contact_person); }

        if (fields.length === 0) return null;

        values.push(id);
        const res = await pool.query(
            `UPDATE companies SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
            values
        );
        return res.rows[0];
    }

    async list(status?: string, search?: string) {
        let query = 'SELECT id, name, status, metadata, address, email, contact_number, main_contact_person, created_at FROM companies WHERE 1=1';
        const params: any[] = [];
        let index = 1;
        
        if (status) {
            query += ` AND status = $${index++}`;
            params.push(status);
        }

        if (search) {
            query += ` AND (name ILIKE $${index} OR email ILIKE $${index} OR address ILIKE $${index})`;
            params.push(`%${search}%`);
            index++;
        }
        
        query += ' ORDER BY name ASC';
        
        const res = await pool.query(query, params);
        return res.rows;
    }

    async deleteCompany(id: string) {
        await pool.query('DELETE FROM companies WHERE id = $1', [id]);
        return { success: true };
    }
}

export const companiesService = new CompaniesService();
