import { pool } from '../../config/database';
import { logger } from '../../shared/logger';
import {
    getToken, getMe, getBuildings, getMdaSyncSummary,
    getMdaTenantsSummary, getMdaOwners, getMdaProperties,
    getMdaPropertyUnits, getMdaTenantAccountStatus,
    getMdaActiveLeases, reportIncident, getReportTypes,
    SBACredentials
} from './smartbuilding.client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateIntegrationDto {
    companyName: string;
    provider?: string;
    brandId: string;
    clientId: string;
    clientSecret: string;
    communityId?: number;
    dbIdentifier?: string;
}

export interface UpdateIntegrationDto extends Partial<CreateIntegrationDto> {
    isActive?: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build SBACredentials from a DB row, including cached token if still valid */
function rowToCredentials(row: any): SBACredentials {
    return {
        brandId: row.brand_id,
        clientId: row.client_id,
        clientSecret: row.client_secret,
        cachedToken: row.token_cache || null,
        tokenExpires: row.token_expires ? new Date(row.token_expires) : null,
    };
}

/** Strip sensitive fields before returning to the client */
function sanitizeRow(row: any) {
    const { client_secret, token_cache, ...safe } = row;
    return {
        ...safe,
        client_secret: client_secret ? '***configured***' : null,
    };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ApiHubService {

    // ── CRUD ─────────────────────────────────────────────────────────────────

    async listIntegrations() {
        const res = await pool.query(
            `SELECT id, company_name, provider, brand_id, client_id, community_id, db_identifier,
                    is_active, last_synced_at, sync_status, sync_error, created_at, updated_at
             FROM api_integrations ORDER BY company_name`
        );
        return res.rows;
    }

    async getIntegration(id: string) {
        const res = await pool.query('SELECT * FROM api_integrations WHERE id = $1', [id]);
        if (res.rows.length === 0) throw Object.assign(new Error('Integration not found'), { status: 404 });
        return res.rows[0];
    }

    async createIntegration(dto: CreateIntegrationDto) {
        const res = await pool.query(
            `INSERT INTO api_integrations (company_name, provider, brand_id, client_id, client_secret, community_id, db_identifier)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [dto.companyName, dto.provider || 'smartbuildingapp', dto.brandId, dto.clientId,
             dto.clientSecret, dto.communityId || null, dto.dbIdentifier || null]
        );
        return sanitizeRow(res.rows[0]);
    }

    async updateIntegration(id: string, dto: UpdateIntegrationDto) {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (dto.companyName !== undefined)  { fields.push(`company_name = $${i++}`);   values.push(dto.companyName); }
        if (dto.brandId !== undefined)       { fields.push(`brand_id = $${i++}`);       values.push(dto.brandId); }
        if (dto.clientId !== undefined)      { fields.push(`client_id = $${i++}`);      values.push(dto.clientId); }
        if (dto.clientSecret !== undefined)  { fields.push(`client_secret = $${i++}`);  values.push(dto.clientSecret); }
        if (dto.communityId !== undefined)   { fields.push(`community_id = $${i++}`);   values.push(dto.communityId); }
        if (dto.dbIdentifier !== undefined)  { fields.push(`db_identifier = $${i++}`);  values.push(dto.dbIdentifier); }
        if (dto.isActive !== undefined)      { fields.push(`is_active = $${i++}`);      values.push(dto.isActive); }

        if (fields.length === 0) throw new Error('No fields to update');

        values.push(id);
        const res = await pool.query(
            `UPDATE api_integrations SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            values
        );
        if (res.rows.length === 0) throw Object.assign(new Error('Integration not found'), { status: 404 });
        return sanitizeRow(res.rows[0]);
    }

    async deleteIntegration(id: string) {
        const res = await pool.query('DELETE FROM api_integrations WHERE id = $1 RETURNING id', [id]);
        if (res.rows.length === 0) throw Object.assign(new Error('Integration not found'), { status: 404 });
        return { deleted: true };
    }

    // ── Token management ─────────────────────────────────────────────────────

    /** Gets a fresh/cached token and persists it back to DB so next request is fast */
    private async getAndCacheToken(id: string) {
        const row = await this.getIntegration(id);
        const creds = rowToCredentials(row);
        const tokenResult = await getToken(creds);

        // Persist token if it's new
        if (!tokenResult.fromCache) {
            await pool.query(
                `UPDATE api_integrations SET token_cache = $1, token_expires = $2 WHERE id = $3`,
                [tokenResult.token, tokenResult.expiresAt.toISOString(), id]
            );
        }

        return { row, creds: { ...creds, cachedToken: tokenResult.token, tokenExpires: tokenResult.expiresAt } };
    }

    // ── Connection Test ───────────────────────────────────────────────────────

    async testConnection(id: string) {
        try {
            const { creds } = await this.getAndCacheToken(id);
            const { data } = await getMe(creds);
            await pool.query(
                `UPDATE api_integrations SET sync_status = 'connected', sync_error = NULL WHERE id = $1`, [id]
            );
            return { success: true, user: data };
        } catch (e: any) {
            await pool.query(
                `UPDATE api_integrations SET sync_status = 'error', sync_error = $1 WHERE id = $2`,
                [e.message, id]
            );
            throw e;
        }
    }

    // ── Full Data Sync ───────────────────────────────────────────────────────

    /**
     * Syncs MDA tenants + units into the scheme_units table.
     * Maps SmartBuilding tenants to scheme_units rows so the AI agent can query them.
     */
    async triggerSync(id: string) {
        const { row, creds } = await this.getAndCacheToken(id);

        if (!row.community_id || !row.db_identifier) {
            throw new Error('Integration must have community_id and db_identifier configured before syncing.');
        }

        await pool.query(`UPDATE api_integrations SET sync_status = 'running' WHERE id = $1`, [id]);

        let syncedProperties = 0, syncedUnits = 0, syncedTenants = 0;
        const errors: string[] = [];

        try {
            // 1. Fetch tenants summary from MDA (paginated)
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                const { data } = await getMdaTenantsSummary(creds, row.community_id, row.db_identifier, page, 50);
                const result = data as any;
                totalPages = result.totalPages || 1;

                for (const tenant of (result.data || [])) {
                    try {
                        // Upsert into scheme_units keyed on property_code + unit_no
                        const schemeRes = await pool.query(
                            `SELECT id FROM schemes WHERE id = (
                                SELECT scheme_id FROM api_integrations WHERE id = $1
                             ) LIMIT 1`,
                            [id]
                        ).catch(() => ({ rows: [] }));

                        // Find the scheme linked to this integration (may need mapping)
                        // For now: upsert into scheme_units using unit_no + property_name as identifier
                        await pool.query(
                            `INSERT INTO scheme_units (scheme_id, unit_number, tenant_name, owner_name)
                             SELECT s.id, $1, $2, $3
                             FROM schemes s
                             INNER JOIN api_integrations ai ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
                             WHERE ai.id = $4
                             LIMIT 1
                             ON CONFLICT DO NOTHING`,
                            [tenant.unit_no, tenant.tenant_name, tenant.owner_name, id]
                        ).catch(() => {
                            // Non-blocking — log and continue
                        });

                        syncedTenants++;
                    } catch (e: any) {
                        errors.push(`Tenant ${tenant.tenant_id}: ${e.message}`);
                    }
                }
                page++;
            }

            // 2. Count synced properties
            const propsRes = await getMdaProperties(creds, row.community_id, row.db_identifier).catch(() => ({ data: { total: 0 } }));
            syncedProperties = (propsRes.data as any).total || 0;

            const unitsRes = await getMdaPropertyUnits(creds, row.community_id, row.db_identifier).catch(() => ({ data: { total: 0 } }));
            syncedUnits = (unitsRes.data as any).total || 0;

            await pool.query(
                `UPDATE api_integrations SET sync_status = 'success', sync_error = NULL, last_synced_at = NOW() WHERE id = $1`, [id]
            );

            return { success: true, syncedProperties, syncedUnits, syncedTenants, errors };

        } catch (e: any) {
            logger.error('[ApiHub] Sync failed', e);
            await pool.query(
                `UPDATE api_integrations SET sync_status = 'error', sync_error = $1 WHERE id = $2`,
                [e.message, id]
            );
            throw e;
        }
    }

    // ── Sync Summary ─────────────────────────────────────────────────────────

    async getSyncSummary(id: string) {
        const { row, creds } = await this.getAndCacheToken(id);
        if (!row.community_id || !row.db_identifier) {
            return { local: null, remote: null, lastSync: null, note: 'community_id and db_identifier required' };
        }
        const { data } = await getMdaSyncSummary(creds, row.community_id, row.db_identifier);
        return data;
    }

    // ── Live Proxy Endpoints ─────────────────────────────────────────────────

    async getProperties(id: string, page = 1, pageSize = 25) {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaProperties(creds, row.community_id, row.db_identifier, page, pageSize);
        return data;
    }

    async getPropertyUnits(id: string, page = 1, pageSize = 25) {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaPropertyUnits(creds, row.community_id, row.db_identifier, page, pageSize);
        return data;
    }

    async getTenants(id: string, page = 1, pageSize = 25, search = '') {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaTenantsSummary(creds, row.community_id, row.db_identifier, page, pageSize, search);
        return data;
    }

    async getOwners(id: string, page = 1, pageSize = 25) {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaOwners(creds, row.community_id, row.db_identifier, page, pageSize);
        return data;
    }

    async getTenantAccountStatus(id: string, tenantId: number, period: number) {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaTenantAccountStatus(creds, row.community_id, row.db_identifier, tenantId, period);
        return data;
    }

    async getTenantActiveLeases(id: string, tenantId: number) {
        const { row, creds } = await this.getAndCacheToken(id);
        this.assertConfigured(row);
        const { data } = await getMdaActiveLeases(creds, row.community_id, row.db_identifier, tenantId);
        return data;
    }

    async getBuildings(id: string) {
        const { creds } = await this.getAndCacheToken(id);
        const { data } = await getBuildings(creds);
        return data;
    }

    async getMatchedBuildingId(id: string, schemeName: string): Promise<number | null> {
        const buildingsRes: any = await this.getBuildings(id);
        // SmartBuilding returns data inside data or buildings depending on response
        const buildingsArray = Array.isArray(buildingsRes) ? buildingsRes : 
                              (Array.isArray(buildingsRes.data) ? buildingsRes.data : []);
        
        if (!buildingsArray || buildingsArray.length === 0) return null;

        const nameLower = schemeName.toLowerCase();

        // 1. Exact match
        const exactMatch = buildingsArray.find((b: any) => 
            b.building_name?.toLowerCase() === nameLower
        );
        if (exactMatch) return exactMatch.building_id;

        // 2. Substring match
        const substringMatch = buildingsArray.find((b: any) => {
            const bName = b.building_name?.toLowerCase() || '';
            return bName.includes(nameLower) || nameLower.includes(bName);
        });

        return substringMatch ? substringMatch.building_id : null;
    }

    async reportIncidentProxy(id: string, payload: { category: number; message: string; comID?: number; longitude?: number; latitude?: number }) {
        const { row, creds } = await this.getAndCacheToken(id);
        const resolvedComID = payload.comID || row.community_id;
        if (!resolvedComID) throw new Error('comID is required to report an incident (either via payload or api_integrations)');
        const { data } = await reportIncident(creds, { ...payload, comID: resolvedComID });
        return data;
    }

    async getReportTypesProxy(id: string, comID?: number) {
        const { row, creds } = await this.getAndCacheToken(id);
        const resolvedComID = comID || row.community_id;
        if (!resolvedComID) throw new Error('comID is required to get report types');
        const { data } = await getReportTypes(creds, resolvedComID);
        return data;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private assertConfigured(row: any) {
        if (!row.community_id || !row.db_identifier) {
            throw Object.assign(
                new Error('Integration is missing community_id and/or db_identifier.'),
                { status: 422 }
            );
        }
    }
}

export const apiHubService = new ApiHubService();
