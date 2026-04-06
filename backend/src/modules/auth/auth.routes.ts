import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/login', authController.login);
router.post('/tenant-login', authController.tenantLogin);
router.post('/tenant-request-otp', authController.requestTenantOtp);
router.post('/tenant-verify-otp', authController.verifyTenantOtp);
router.post('/tenant-select-unit', authController.selectTenantUnit);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export const authRoutes = router;
