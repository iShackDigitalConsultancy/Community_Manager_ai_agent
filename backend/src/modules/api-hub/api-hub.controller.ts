import { Request, Response } from 'express';
import { apiHubService } from './api-hub.service';
import { logger } from '../../shared/logger';

// Query param helpers — Express query values are string | string[] | ParsedQs
const qStr = (v: any, fallback = ''): string => (Array.isArray(v) ? String(v[0]) : String(v ?? fallback));
const qNum = (v: any, fallback = 1): number => {
    const n = Number(qStr(v, String(fallback)));
    return isNaN(n) ? fallback : n;
};

function handleError(res: Response, e: any) {
    const status = e.status || 500;
    logger.error('[ApiHub]', e);
    res.status(status).json({ error: e.message || 'Internal server error' });
}

export const apiHubController = {

    // ── CRUD ────────────────────────────────────────────────────────────────

    async list(req: Request, res: Response) {
        try { res.json(await apiHubService.listIntegrations()); }
        catch (e: any) { handleError(res, e); }
    },

    async create(req: Request, res: Response) {
        try {
            const { companyId, provider, brandId, clientId, clientSecret, communityId, dbIdentifier } = req.body;
            console.log('API_HUB POST payload:', req.body);
            if (!companyId || !brandId || !clientId || !clientSecret) {
                return res.status(400).json({ error: 'companyId, brandId, clientId and clientSecret are required' });
            }
            res.status(201).json(await apiHubService.createIntegration(
                { companyId, provider, brandId, clientId, clientSecret, communityId, dbIdentifier }
            ));
        } catch (e: any) { handleError(res, e); }
    },

    async update(req: Request, res: Response) {
        try { res.json(await apiHubService.updateIntegration((req.params.id as string), req.body)); }
        catch (e: any) { handleError(res, e); }
    },

    async remove(req: Request, res: Response) {
        try { await apiHubService.deleteIntegration((req.params.id as string)); res.status(204).send(); }
        catch (e: any) { handleError(res, e); }
    },

    // ── Connection & Sync ──────────────────────────────────────────────────

    async testConnection(req: Request, res: Response) {
        try { res.json(await apiHubService.testConnection((req.params.id as string))); }
        catch (e: any) { handleError(res, e); }
    },

    async triggerSync(req: Request, res: Response) {
        try { res.json(await apiHubService.triggerSync((req.params.id as string))); }
        catch (e: any) { handleError(res, e); }
    },

    async getSyncSummary(req: Request, res: Response) {
        try { res.json(await apiHubService.getSyncSummary((req.params.id as string))); }
        catch (e: any) { handleError(res, e); }
    },

    // ── Live Data Proxies ──────────────────────────────────────────────────

    async getBuildings(req: Request, res: Response) {
        try { res.json(await apiHubService.getBuildings((req.params.id as string))); }
        catch (e: any) { handleError(res, e); }
    },

    async getProperties(req: Request, res: Response) {
        try { res.json(await apiHubService.getProperties((req.params.id as string), qNum(req.query.page), qNum(req.query.pageSize, 25))); }
        catch (e: any) { handleError(res, e); }
    },

    async getPropertyUnits(req: Request, res: Response) {
        try { res.json(await apiHubService.getPropertyUnits((req.params.id as string), qNum(req.query.page), qNum(req.query.pageSize, 25))); }
        catch (e: any) { handleError(res, e); }
    },

    async getTenants(req: Request, res: Response) {
        try {
            res.json(await apiHubService.getTenants(
                (req.params.id as string), qNum(req.query.page), qNum(req.query.pageSize, 25), qStr(req.query.search)
            ));
        } catch (e: any) { handleError(res, e); }
    },

    async getOwners(req: Request, res: Response) {
        try { res.json(await apiHubService.getOwners((req.params.id as string), qNum(req.query.page), qNum(req.query.pageSize, 25))); }
        catch (e: any) { handleError(res, e); }
    },

    async getTenantAccountStatus(req: Request, res: Response) {
        try {
            const tenantId = qNum(req.query.tenantId, 0);
            const period = qNum(req.query.period, 0);
            if (!tenantId || !period) return res.status(400).json({ error: 'tenantId and period (YYYYMM) are required' });
            res.json(await apiHubService.getTenantAccountStatus((req.params.id as string), tenantId, period));
        } catch (e: any) { handleError(res, e); }
    },

    async getTenantActiveLeases(req: Request, res: Response) {
        try {
            const tenantId = qNum(req.query.tenantId, 0);
            if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
            res.json(await apiHubService.getTenantActiveLeases((req.params.id as string), tenantId));
        } catch (e: any) { handleError(res, e); }
    },

    async reportIncident(req: Request, res: Response) {
        try {
            const { category, message, longitude, latitude } = req.body;
            if (!category || !message) return res.status(400).json({ error: 'category and message are required' });
            res.json(await apiHubService.reportIncidentProxy((req.params.id as string), { category, message, longitude, latitude }));
        } catch (e: any) { handleError(res, e); }
    },

    async getReportTypes(req: Request, res: Response) {
        try { res.json(await apiHubService.getReportTypesProxy((req.params.id as string))); }
        catch (e: any) { handleError(res, e); }
    },
};
