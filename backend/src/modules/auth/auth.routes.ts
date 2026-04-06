import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { requestOtpSchema, verifyOtpSchema, selectUnitSchema, adminLoginSchema } from './auth.schema';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limit for OTP to prevent spam and Brevo billing exhaustion
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Mins
    max: 5, // 5 requests per IP
    message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: { error: 'Too many login attempts, please try again later' }
});

router.post('/login', loginLimiter, validateRequest(adminLoginSchema), authController.login);
router.post('/tenant-login', authController.tenantLogin);
router.post('/tenant-request-otp', otpLimiter, validateRequest(requestOtpSchema), authController.requestTenantOtp);
router.post('/tenant-verify-otp', validateRequest(verifyOtpSchema), authController.verifyTenantOtp);
router.post('/tenant-select-unit', validateRequest(selectUnitSchema), authController.selectTenantUnit);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export const authRoutes = router;
