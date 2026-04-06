import app from './app';
import { env } from './config/env';
import { logger } from './shared/logger';
import { pool } from './config/database';

const startServer = async () => {
    try {
        const client = await pool.connect();
        logger.info('Connected to PostgreSQL successfully.');
        client.release();

        app.listen(env.PORT, () => {
            logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
