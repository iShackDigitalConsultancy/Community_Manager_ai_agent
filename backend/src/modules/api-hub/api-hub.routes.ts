import { Router } from 'express';
import { apiHubController } from './api-hub.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// All API Hub routes are super-admin only
router.use(requireAuth, requireRole('super_admin'));


// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',     apiHubController.list);
router.post('/',    apiHubController.create);
router.patch('/:id',  apiHubController.update);
router.delete('/:id', apiHubController.remove);

// ── Connection & Sync ─────────────────────────────────────────────────────────
router.post('/:id/test',     apiHubController.testConnection);
router.post('/:id/sync',     apiHubController.triggerSync);
router.get('/:id/summary',   apiHubController.getSyncSummary);

// ── Live Data Proxies ─────────────────────────────────────────────────────────
router.get('/:id/buildings',          apiHubController.getBuildings);
router.get('/:id/properties',         apiHubController.getProperties);
router.get('/:id/property-units',     apiHubController.getPropertyUnits);
router.get('/:id/tenants',            apiHubController.getTenants);
router.get('/:id/owners',             apiHubController.getOwners);
router.get('/:id/tenant-account',     apiHubController.getTenantAccountStatus);
router.get('/:id/tenant-leases',      apiHubController.getTenantActiveLeases);
router.post('/:id/incident',          apiHubController.reportIncident);
router.get('/:id/report-types',       apiHubController.getReportTypes);

export const apiHubRoutes = router;
