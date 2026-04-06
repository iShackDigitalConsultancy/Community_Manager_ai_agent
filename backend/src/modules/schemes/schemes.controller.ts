import { Request, Response } from 'express';
import { schemesService } from './schemes.service';
import { AdminRequest } from '../auth/auth.types';

export const schemesController = {
    async create(req: AdminRequest, res: Response) {
        try {
            const data = { ...req.body };
            if (req.admin?.role !== 'super_admin' && req.admin?.companyId) {
                data.companyId = req.admin.companyId;
            }
            const scheme = await schemesService.create(data);
            res.status(201).json(scheme);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async get(req: AdminRequest, res: Response) {
        try {
            const scheme = await schemesService.getById(req.params.id as string);
            if (!scheme) return res.status(404).json({ error: 'Scheme not found' });
            res.json(scheme);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async update(req: AdminRequest, res: Response) {
        try {
            const scheme = await schemesService.update(req.params.id as string, req.body);
            res.json(scheme);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async list(req: AdminRequest, res: Response) {
        try {
            const limitToIds = req.admin?.role !== 'super_admin' ? req.admin?.assignedSchemeIds : undefined;
            const companyId = req.admin?.role !== 'super_admin' ? req.admin?.companyId : undefined;
            const schemes = await schemesService.list(limitToIds, companyId);
            res.json(schemes);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async archive(req: AdminRequest, res: Response) {
        try {
            const result = await schemesService.delete(req.params.id as string);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
