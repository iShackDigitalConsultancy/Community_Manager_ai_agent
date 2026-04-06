import { Response } from 'express';
import { unitsService } from './units.service';
import { csvService } from './csv.service';
import { AdminRequest } from '../auth/auth.types';

export const unitsController = {
    async list(req: AdminRequest, res: Response) {
        try {
            const units = await unitsService.list(req.params.id as string);
            res.json(units);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async get(req: AdminRequest, res: Response) {
        try {
            const unit = await unitsService.getById(req.params.id as string, req.params.unitId as string);
            if (!unit) return res.status(404).json({ error: 'Unit not found' });
            res.json(unit);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async create(req: AdminRequest, res: Response) {
        try {
            const unit = await unitsService.create(req.params.id as string, req.body);
            res.status(201).json(unit);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async update(req: AdminRequest, res: Response) {
        try {
            const unit = await unitsService.update(req.params.id as string, req.params.unitId as string, req.body);
            res.json(unit);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async delete(req: AdminRequest, res: Response) {
        try {
            const result = await unitsService.delete(req.params.id as string, req.params.unitId as string);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async importCsv(req: AdminRequest, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No CSV file uploaded' });
            }
            const result = await csvService.processUnitImport(req.params.id as string, req.file.path);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
