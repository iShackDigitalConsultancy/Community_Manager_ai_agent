import { pool } from '../../config/database';

export class KnowledgeTemplatesService {
    async list() {
        const res = await pool.query('SELECT id, name, description, scheme_type, is_active, created_at FROM knowledge_templates ORDER BY name');
        return res.rows;
    }

    async getById(id: string) {
        const res = await pool.query('SELECT * FROM knowledge_templates WHERE id = $1', [id]);
        return res.rows[0];
    }

    async create(data: { name: string, description: string, scheme_type: string, template_documents: any, checklist: any }, createdBy: string) {
        const res = await pool.query(
            `INSERT INTO knowledge_templates (name, description, scheme_type, template_documents, checklist, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [data.name, data.description, data.scheme_type, JSON.stringify(data.template_documents || []), JSON.stringify(data.checklist || {}), createdBy]
        );
        return res.rows[0];
    }

    async update(id: string, updates: Partial<{ name: string, description: string, is_active: boolean, template_documents: any, checklist: any }>) {
        const fields = [];
        const values: any[] = [];
        let i = 1;

        if (updates.name) { fields.push(`name = $${i++}`); values.push(updates.name); }
        if (updates.description) { fields.push(`description = $${i++}`); values.push(updates.description); }
        if (updates.is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(updates.is_active); }
        if (updates.template_documents) { fields.push(`template_documents = $${i++}`); values.push(JSON.stringify(updates.template_documents)); }
        if (updates.checklist) { fields.push(`checklist = $${i++}`); values.push(JSON.stringify(updates.checklist)); }

        if (fields.length === 0) return null;

        values.push(id);
        const res = await pool.query(
            `UPDATE knowledge_templates SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
            values
        );
        return res.rows[0];
    }
}

export const knowledgeTemplatesService = new KnowledgeTemplatesService();
