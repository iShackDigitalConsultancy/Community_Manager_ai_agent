import { Request, Response } from 'express';
import { authService } from './auth.service';

export const authController = {
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }
            const result = await authService.login(email, password);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async tenantLogin(req: Request, res: Response) {
        try {
            const { schemeId, unitNumber, idNumber } = req.body;
            if (!schemeId || !unitNumber || !idNumber) {
                return res.status(400).json({ error: 'Building, Unit number, and ID are required' });
            }
            const result = await authService.tenantLogin(schemeId, unitNumber, idNumber);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async requestTenantOtp(req: Request, res: Response) {
        try {
            const { contactInfo } = req.body;
            if (!contactInfo) {
                return res.status(400).json({ error: 'Email or Mobile Number is required' });
            }
            const result = await authService.requestTenantOTP(contactInfo);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async verifyTenantOtp(req: Request, res: Response) {
        try {
            const { contactInfo, otp } = req.body;
            if (!contactInfo || !otp) {
                return res.status(400).json({ error: 'Contact info and OTP are required' });
            }
            const result = await authService.verifyTenantOTP(contactInfo, otp);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async selectTenantUnit(req: Request, res: Response) {
        try {
            const { intermediateToken, unitId } = req.body;
            if (!intermediateToken || !unitId) {
                return res.status(400).json({ error: 'Token and unit ID are required' });
            }
            const result = await authService.selectTenantUnit(intermediateToken, unitId);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }
            const tokens = await authService.refresh(refreshToken);
            res.json(tokens);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async logout(req: Request, res: Response) {
        res.json({ success: true });
    },

    async forgotPassword(req: Request, res: Response) {
        res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    },

    async resetPassword(req: Request, res: Response) {
        res.json({ success: true });
    }
};
