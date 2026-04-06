import { z } from 'zod';

export const requestOtpSchema = z.object({
  body: z.object({
    contactInfo: z.string().min(3, "Contact info is required")
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    contactInfo: z.string().min(3),
    otp: z.string().length(6, "OTP must be exactly 6 characters")
  }),
});

export const selectUnitSchema = z.object({
  body: z.object({
    intermediateToken: z.string().min(10),
    unitId: z.string().uuid("Invalid unit ID")
  })
});

export const adminLoginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password required")
    })
});
