import { pool } from '../../config/database';
import fs from 'fs';
import { parse } from 'csv-parse';

export class SchemesService {
    async create(data: { name: string, code: string, type: string, managingAgent?: string, companyId?: string, address?: string, facilitiesManager?: string, managerEmail?: string, unitsCount?: number }) {
        const res = await pool.query(
            `INSERT INTO schemes (
                scheme_name, scheme_code, scheme_type, managing_agent_name, company_id, status,
                address, facilities_manager, manager_email, mapped_units_count
             ) 
             VALUES ($1, $2, $3, $4, $5, 'setup', $6, $7, $8, $9) RETURNING id, scheme_name, scheme_code, company_id`,
            [data.name, data.code, data.type, data.managingAgent, data.companyId || null, data.address || null, data.facilitiesManager || null, data.managerEmail || null, data.unitsCount || null]
        );
        return res.rows[0];
    }

    async getById(id: string) {
        const res = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);
        return res.rows[0];
    }

    async update(id: string, updates: Partial<{ scheme_name: string, status: string, address: string, facilities_manager: string, manager_email: string, mapped_units_count: number }>) {
        const fields = [];
        const values: any[] = [];
        let i = 1;

        if (updates.scheme_name !== undefined) { fields.push(`scheme_name = $${i++}`); values.push(updates.scheme_name); }
        if (updates.status !== undefined) { fields.push(`status = $${i++}`); values.push(updates.status); }
        if (updates.address !== undefined) { fields.push(`address = $${i++}`); values.push(updates.address); }
        if (updates.facilities_manager !== undefined) { fields.push(`facilities_manager = $${i++}`); values.push(updates.facilities_manager); }
        if (updates.manager_email !== undefined) { fields.push(`manager_email = $${i++}`); values.push(updates.manager_email); }
        if (updates.mapped_units_count !== undefined) { fields.push(`mapped_units_count = $${i++}`); values.push(updates.mapped_units_count); }

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

    async list(assignedSchemeIds?: string[], companyId?: string, page = 1, limit = 15, search?: string) {
        const offset = (page - 1) * limit;
        let query = `SELECT s.id, s.scheme_name, s.scheme_code, s.scheme_type, s.status, s.company_id, s.is_active, s.address, s.facilities_manager, s.manager_email, s.mapped_units_count, c.name as company_name 
                     FROM schemes s 
                     LEFT JOIN companies c ON s.company_id = c.id 
                     WHERE s.is_active = true`;
        let countQuery = `SELECT COUNT(*) FROM schemes WHERE is_active = true`;
        let params: any[] = [];
        let countParams: any[] = [];
        
        let paramIndex = 1;

        if (assignedSchemeIds && companyId) {
            query += ` AND s.company_id = $${paramIndex}`;
            countQuery += ` AND company_id = $${paramIndex}`;
            params.push(companyId);
            countParams.push(companyId);
            paramIndex++;
        } else if (assignedSchemeIds) {
            if (assignedSchemeIds.length === 0) return { data: [], totalItems: 0, totalPages: 0, currentPage: page };
            query += ` AND s.id = ANY($${paramIndex}::uuid[])`;
            countQuery += ` AND id = ANY($${paramIndex}::uuid[])`;
            params.push(assignedSchemeIds);
            countParams.push(assignedSchemeIds);
            paramIndex++;
        }

        if (search) {
            query += ` AND (s.scheme_name ILIKE $${paramIndex} OR s.scheme_code ILIKE $${paramIndex} OR s.address ILIKE $${paramIndex})`;
            countQuery += ` AND (scheme_name ILIKE $${paramIndex} OR scheme_code ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const [res, countRes] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        const totalItems = parseInt(countRes.rows[0].count, 10);
        return {
            data: res.rows,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page
        };
    }

    async processCsvImport(companyId: string, filePath: string) {
        const parser = fs.createReadStream(filePath).pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        }));

        let successCount = 0;
        let errorCount = 0;

        for await (const row of parser) {
            try {
                const buildingName = row['Building Name'];
                if (!buildingName) {
                    errorCount++;
                    continue;
                }

                const address = row['Address'];
                const manager = row['Facilities Manager'];
                const email = row['Manager email'];
                const unitsStr = row['Number Units'];

                let mappedUnits: number | undefined = undefined;
                if (unitsStr) {
                    const unitMatch = String(unitsStr).match(/(\d+)/);
                    mappedUnits = unitMatch ? parseInt(unitMatch[1], 10) : undefined;
                }

                let codeSafe = buildingName.replace(/[^A-Za-z0-9]/g, '').substring(0, 7).toUpperCase();
                codeSafe += Math.floor(100 + Math.random() * 900);

                await this.create({
                    name: buildingName,
                    code: codeSafe,
                    type: 'sectional_title',
                    companyId: companyId,
                    address: address,
                    facilitiesManager: manager,
                    managerEmail: email,
                    unitsCount: mappedUnits
                });
                successCount++;
            } catch (e) {
                console.error('Import error for row:', e);
                errorCount++;
            }
        }
        
        fs.unlinkSync(filePath); // Cleanup
        
        return { successCount, errorCount };
    }
}

export const schemesService = new SchemesService();
