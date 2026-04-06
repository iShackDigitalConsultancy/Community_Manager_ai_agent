import { Request, Response } from 'express';
import { mdaSyncService } from './mda.service';

export const mdaController = {
    async triggerSync(req: Request, res: Response) {
        try {
            const result = await mdaSyncService.syncTenantsAndBuildings();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
