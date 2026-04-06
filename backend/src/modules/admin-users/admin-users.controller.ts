import { Response } from 'express';
import { adminUsersService } from './admin-users.service';
import { AdminRequest } from '../auth/auth.types';

export const adminUsersController = {
    async list(req: AdminRequest, res: Response) {
        try {
            const users = await adminUsersService.listUsers();
            res.json(users);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    
    async invite(req: AdminRequest, res: Response) {
        try {
            const user = await adminUsersService.inviteUser(req.body);
            res.json(user);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    
    async update(req: AdminRequest, res: Response) {
        try {
            const user = await adminUsersService.updateUser(req.params.id as string, req.body);
            res.json(user);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    
    async deactivate(req: AdminRequest, res: Response) {
        try {
            const user = await adminUsersService.updateUser(req.params.id as string, { is_active: false });
            res.json(user);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },
    
    async assignSchemes(req: AdminRequest, res: Response) {
        try {
            const result = await adminUsersService.assignSchemes(req.params.id as string, req.body.schemeIds, req.admin!.userId);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
