import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './shared/logger';
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

const app = express();

app.use(helmet());
app.use(cors({ origin: [env.ADMIN_PORTAL_URL, env.CHAT_WIDGET_URL, 'http://127.0.0.1:4200', 'http://localhost:4200'] }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

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

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error: ${err.message}`, { stack: env.NODE_ENV === 'development' ? err.stack : undefined });
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
