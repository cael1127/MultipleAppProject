import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/error-handler.js';
import { attachUser } from './middleware/jwt-middleware.js';
import { prisma } from './prisma.js';
import { authRouter } from './routes/auth.js';
import { financeRouter } from './routes/finance.js';
import { novaRouter } from './routes/nova.js';
import { securityRouter } from './routes/security.js';
import { studyRouter } from './routes/study.js';
import { wellnessRouter } from './routes/wellness.js';
import { specs } from './swagger.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: '*',
    }),
  );
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(attachUser);

  app.get('/health', async (_, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
  app.use('/auth', authRouter);
  app.use('/security', securityRouter);
  app.use('/nova', novaRouter);
  app.use('/wellness', wellnessRouter);
  app.use('/finance', financeRouter);
  app.use('/study', studyRouter);

  app.use(errorHandler);

  return app;
};

