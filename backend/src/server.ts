import app from './app';
import { env } from './config/env';
import { logger } from './shared/logger';
import { pool } from './config/database';
import { telegramService } from './modules/telegram/telegram.service';

const startServer = async () => {
    let server: any;
    try {
        const client = await pool.connect();
        logger.info('Connected to PostgreSQL successfully.');
        client.release();

        server = app.listen(env.PORT, () => {
            logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
        });

        // Initialize Telegram bots
        await telegramService.initializeBots();
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }

    const gracefulShutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Graceful shutdown initiated...`);
        if (server) {
            server.close(async () => {
                logger.info('HTTP server closed.');
                await pool.end();
                logger.info('PostgreSQL pool closed.');
                process.exit(0);
            });
            // Force shutdown if it takes longer than 10 seconds empty interval
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        } else {
            await pool.end();
            process.exit(0);
        }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
