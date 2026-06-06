// src/server.js
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

import { createSocketIOServer } from './sockets/socketio.js';
import { createDevkitWSServer } from './sockets/devkit.ws.js';
import { createIngestWSServer } from './sockets/ingest.ws.js';

function getPathname(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.pathname;
  } catch {
    return '';
  }
}

async function bootstrap() {
  try {
    await connectDB();

    const server = http.createServer(app);

    createSocketIOServer(server, env);

    const devkitWss = createDevkitWSServer();
    const ingestWss = createIngestWSServer();

    server.on('upgrade', (req, socket, head) => {
      const pathname = getPathname(req);

      if (pathname === '/devkit') {
        devkitWss.handleUpgrade(req, socket, head, (ws) => {
          devkitWss.emit('connection', ws, req);
        });
        return;
      }

      if (pathname === '/ingest') {
        ingestWss.handleUpgrade(req, socket, head, (ws) => {
          ingestWss.emit('connection', ws, req);
        });
        return;
      }

      // سيب socket.io يتعامل مع /socket.io
      if (pathname.startsWith('/socket.io')) {
        return;
      }

      socket.destroy();
    });

    server.listen(env.port, '0.0.0.0', () => {
      console.log('='.repeat(70));
      console.log(`🚀 DPRIMS Backend running`);
      console.log(`🌐 HTTP API       : http://localhost:${env.port}`);
      console.log(`🖥️ Dashboard SIO  : http://localhost:${env.port}`);
      console.log(`⚡ DevKit WS      : ws://0.0.0.0:${env.port}/devkit`);
      console.log(`🧠 Python Ingest  : ws://0.0.0.0:${env.port}/ingest`);
      console.log('='.repeat(70));
    });
  } catch (err) {
    console.error('❌ Backend bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();