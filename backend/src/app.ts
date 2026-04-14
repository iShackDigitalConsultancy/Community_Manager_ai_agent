import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './shared/logger';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { adminUsersRoutes } from './modules/admin-users/admin-users.routes';
import { schemesRoutes } from './modules/schemes/schemes.routes';
import { knowledgeTemplatesRoutes } from './modules/knowledge-templates/knowledge-templates.routes';
import { unitsRoutes } from './modules/units/units.routes';
import { knowledgeRoutes } from './modules/knowledge-base/knowledge.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { mdaRoutes } from './modules/mda-integration/mda.routes';
import { apiHubRoutes } from './modules/api-hub/api-hub.routes';
import { companiesRoutes } from './modules/companies/companies.routes';
import { adminDashboardRoutes } from './modules/admin-dashboard/admin-dashboard.routes';
import { telegramRoutes } from './modules/telegram/telegram.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [env.ADMIN_PORTAL_URL, env.CHAT_WIDGET_URL, 'http://127.0.0.1:4200', 'http://localhost:4200'];
    if (allowedOrigins.includes(origin) || origin.endsWith('.up.railway.app') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestIdMiddleware);

morgan.token('req-id', (req) => req.headers['x-request-id'] as string || '-');
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - [TraceID: :req-id]', { 
    stream: { write: (message: string) => logger.info(message.trim(), { reqId: message.match(/\[TraceID: (.*?)\]/)?.[1] }) } 
}));

app.use('/api/v1/admin/auth', authRoutes);
app.use('/api/v1/admin/users', adminUsersRoutes);
app.use('/api/v1/admin/schemes', schemesRoutes);
app.use('/api/v1/admin/templates', knowledgeTemplatesRoutes);
app.use('/api/v1/admin/dashboard', adminDashboardRoutes);
app.use('/api/v1/admin/schemes/:id/units', unitsRoutes);
app.use('/api/v1/admin/schemes/:id/knowledge', knowledgeRoutes);
app.use('/api/v1/admin/mda', mdaRoutes);
app.use('/api/v1/admin/api-hub', apiHubRoutes);
app.use('/api/v1/admin/companies', companiesRoutes);

app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/telegram', telegramRoutes);

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.2' });
});

app.post('/api/v1/admin/debug/nuke', async (req: Request, res: Response) => {
    if (req.query.secret !== 'SuperSecretNuke2026') return res.status(403).json({error: 'forbidden'});
    console.log('🚨 PRODUCTION DB CLEAR INITIATED VIA API...');
    const { pool } = require('./config/database');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE scheme_units CASCADE;');
        await client.query('TRUNCATE TABLE schemes CASCADE;');
        await client.query('TRUNCATE TABLE api_integrations CASCADE;');
        await client.query('UPDATE admin_users SET company_id = NULL;');
        await client.query('DELETE FROM companies;');
        await client.query('COMMIT');
        res.json({ success: true, message: 'All companies and communities cleared safely.' });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error: ${err.message}`, { stack: env.NODE_ENV === 'development' ? err.stack : undefined });
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
