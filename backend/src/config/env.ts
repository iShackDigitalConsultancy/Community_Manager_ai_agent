import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DATABASE_URL: z.string(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'local']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  
  LLAMAPARSE_API_KEY: z.string().optional(),
  
  BREVO_API_KEY: z.string().startsWith('xkeysib-'),
  BREVO_WHATSAPP_SENDER_ID: z.string().optional(),
  BREVO_OTP_TEMPLATE_ID: z.coerce.number().default(0),
  BREVO_TRANSCRIPT_TEMPLATE_ID: z.coerce.number().default(0),
  BREVO_ESCALATION_TEMPLATE_ID: z.coerce.number().default(0),
  BREVO_INVITE_TEMPLATE_ID: z.coerce.number().default(0),
  
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  
  SMARTBUILDING_API_URL: z.string().url().default('https://api.smartbuildingapp.com/v1'),
  SMARTBUILDING_DEVELOPER_KEY: z.string().optional(),
  SMARTBUILDING_JWT_SECRET: z.string().optional(),
  
  MDA_API_URL: z.string().optional(),
  MDA_API_KEY: z.string().optional(),
  
  AWS_S3_BUCKET: z.string().default('ishack-schemeassist-docs'),
  AWS_REGION: z.string().default('af-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  AGENT_RATE_LIMIT_PER_HOUR: z.coerce.number().default(60),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(30),
  RETURNING_USER_WINDOW_HOURS: z.coerce.number().default(24),
  
  ADMIN_PORTAL_URL: z.string().url().default('http://localhost:4200'),
  CHAT_WIDGET_URL: z.string().url().default('http://localhost:4200/chat'),
});

export const env = envSchema.parse(process.env);
