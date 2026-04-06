import { Response } from 'express';
import { knowledgeTemplatesService } from './knowledge-templates.service';
import { AdminRequest } from '../auth/auth.types';

export const knowledgeTemplatesController = {
    async list(req: AdminRequest, res: Response) {
        try {
            const templates = await knowledgeTemplatesService.list();
            res.json(templates);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async get(req: AdminRequest, res: Response) {
        try {
            const template = await knowledgeTemplatesService.getById(req.params.id as string);
            if (!template) return res.status(404).json({ error: 'Template not found' });
            res.json(template);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async create(req: AdminRequest, res: Response) {
        try {
            const template = await knowledgeTemplatesService.create(req.body, req.admin!.userId);
            res.status(201).json(template);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    async update(req: AdminRequest, res: Response) {
        try {
            const template = await knowledgeTemplatesService.update(req.params.id as string, req.body);
            res.json(template);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
