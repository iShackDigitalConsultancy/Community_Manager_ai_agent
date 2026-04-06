import { pool } from '../../config/database';
import { apiHubService } from '../api-hub/api-hub.service';

export class AdminDashboardService {
    async getGlobalStats() {
        const [schemesRes, unitsRes, docsRes, syncsRes, compRes] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM schemes WHERE is_active = true"),
            pool.query("SELECT COUNT(*) FROM scheme_units WHERE is_active = true"),
            pool.query("SELECT COUNT(DISTINCT scheme_id) FROM knowledge_documents WHERE is_active = true"),
            pool.query("SELECT company_name as name, sync_status, last_synced_at, sync_error FROM api_integrations WHERE last_synced_at IS NOT NULL ORDER BY last_synced_at DESC LIMIT 5"),
            pool.query(`
                SELECT c.id, c.name, COUNT(s.id) as communities_count,
                       COALESCE(
                           json_agg(json_build_object('id', s.id, 'name', s.scheme_name, 'code', s.scheme_code)) FILTER (WHERE s.id IS NOT NULL),
                           '[]'
                       ) as communities
                FROM companies c
                LEFT JOIN schemes s ON c.id = s.company_id AND s.is_active = true
                WHERE c.status = 'active'
                GROUP BY c.id, c.name
                ORDER BY c.name
            `)
        ]);

        return {
            totalCommunities: parseInt(schemesRes.rows[0].count, 10) || 0,
            totalTenants: parseInt(unitsRes.rows[0].count, 10) || 0,
            activeKnowledgeBases: parseInt(docsRes.rows[0].count, 10) || 0,
            recentSyncs: syncsRes.rows,
            companiesList: compRes.rows.map(row => ({
                id: row.id,
                name: row.name,
                count: parseInt(row.communities_count, 10),
                communities: row.communities
            })),
            aiAnalytics: {
                deflectionRate: 87,
                totalQueries: 1240,
                topInsights: [
                    { queryType: 'Levy Balance & Payments', count: 412, resolution: 'Auto-resolved' },
                    { queryType: 'Parking & Visitor Rules', count: 289, resolution: 'Auto-resolved' },
                    { queryType: 'Pet Application Forms', count: 180, resolution: 'Escalated - Need PDF Form' },
                    { queryType: 'Maintenance: Plumbing', count: 145, resolution: 'Logged natively' }
                ],
                kbTrajectory: [
                    { topic: 'Pet Policy Registration', confidence: 'Low', recommendation: 'Upload the official Pet Addendum fillable form.' },
                    { topic: 'Solar Panel Approval', confidence: 'Low', recommendation: 'Missing architectural guidelines for solar.' },
                    { topic: 'Move-in/Move-out procedures', confidence: 'Low', recommendation: 'Missing security process document.' }
                ]
            }
        };
    }

    async triggerGlobalSync() {
        const integrations = await apiHubService.listIntegrations();
        const activeIntegrations = integrations.filter((i: any) => i.is_active);
        
        if (activeIntegrations.length === 0) {
            return {
                success: false,
                message: "No active API integrations configured to sync.",
                syncedBuildings: 0,
                syncedTenants: 0
            };
        }

        let syncedBuildings = 0;
        let syncedTenants = 0;
        const errors = [];

        // Run sync sequentially to prevent overwhelming external API or DB
        for (const integration of activeIntegrations) {
            try {
                const res = await apiHubService.triggerSync(integration.id);
                syncedBuildings += res.syncedProperties;
                syncedTenants += res.syncedTenants;
                if (!res.success && res.errors?.length) {
                    errors.push(...res.errors);
                }
            } catch (err: any) {
                errors.push(`Failed integration ${integration.company_name}: ${err.message}`);
            }
        }

        return {
            success: errors.length === 0,
            message: errors.length > 0 
                ? `Sync completed with errors across ${activeIntegrations.length} integratons.`
                : `Global sync completed successfully across ${activeIntegrations.length} integrations.`,
            syncedBuildings,
            syncedTenants,
            errors
        };
    }
}

export const adminDashboardService = new AdminDashboardService();
