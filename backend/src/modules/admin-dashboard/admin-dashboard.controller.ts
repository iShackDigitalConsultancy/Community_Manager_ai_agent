import { Response } from 'express';
import { adminDashboardService } from './admin-dashboard.service';
import { AdminRequest } from '../auth/auth.types';

export const adminDashboardController = {
    async getStats(req: AdminRequest, res: Response) {
        try {
            const stats = await adminDashboardService.getGlobalStats();
            res.json(stats);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async triggerSync(req: AdminRequest, res: Response) {
        try {
            const result = await adminDashboardService.triggerGlobalSync();
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
