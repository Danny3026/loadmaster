import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import db from './config/database';

const startServer = async () => {
  try {
    // Run migrations before starting
    logger.info('Running database migrations...');
    await db.migrate.latest();
    logger.info('Database migrations completed.');

    app.listen(env.PORT, () => {
      logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
