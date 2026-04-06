import { Request, Response } from 'express';
import { companiesService } from './companies.service';
import { AdminRequest } from '../auth/auth.types';

export const companiesController = {
    async create(req: AdminRequest, res: Response) {
        try {
            const company = await companiesService.create(req.body);
            res.status(201).json(company);
        } catch (e: any) {
            if (e.message === 'A company with this name already exists.') {
                return res.status(400).json({ error: e.message });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async get(req: AdminRequest, res: Response) {
        try {
            const company = await companiesService.getById(req.params.id as string);
            if (!company) return res.status(404).json({ error: 'Company not found' });
            res.json(company);
        } catch (e: any) {
            if (e.message === 'A company with this name already exists.') {
                return res.status(400).json({ error: e.message });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async update(req: AdminRequest, res: Response) {
        try {
            const company = await companiesService.update(req.params.id as string, req.body);
            res.json(company);
        } catch (e: any) {
            if (e.message === 'A company with this name already exists.') {
                return res.status(400).json({ error: e.message });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async list(req: AdminRequest, res: Response) {
        try {
            const status = req.query.status as string;
            const companies = await companiesService.list(status);
            res.json(companies);
        } catch (e: any) {
            if (e.message === 'A company with this name already exists.') {
                return res.status(400).json({ error: e.message });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async delete(req: AdminRequest, res: Response) {
        try {
            const result = await companiesService.deleteCompany(req.params.id as string);
            res.json(result);
        } catch (e: any) {
            if (e.message === 'A company with this name already exists.') {
                return res.status(400).json({ error: e.message });
            }
            res.status(500).json({ error: e.message });
        }
    }
};
