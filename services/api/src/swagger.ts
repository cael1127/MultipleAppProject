import pkg from '../package.json' with { type: 'json' };

const { version } = pkg as { version: string };

const swaggerDefinition = {
  openapi: '3.0.1',
  info: {
    title: 'MultiApps Platform API',
    version,
    description:
      'REST API powering SecureGuard, Nova, Bloom, LedgerLoop, and StudyForge MVPs. Authentication via Bearer JWT.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const specs = swaggerDefinition;

