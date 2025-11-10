import { createServer } from 'http';

import { config } from './config.js';
import { createApp } from './app.js';

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  console.log(`[api] docs available at http://localhost:${config.port}/docs`);
});

