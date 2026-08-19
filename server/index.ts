// Custom server: Next.js standalone + Socket.IO on the same HTTP port
// This file is compiled by esbuild and replaces the standalone server.js

import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Server as SocketIOServer } from 'socket.io';
import { registerPartyHandlers } from './party/handlers';

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const dir = path.resolve(__dirname);

(process.env as Record<string, string | undefined>).NODE_ENV = 'production';
process.chdir(dir);

// Load Next.js standalone server
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NextServer = require('next/dist/server/next-server').default;

// Load config from standalone build output
const requiredServerFilesPath = path.join(dir, '.next', 'required-server-files.json');
let conf = {};
if (fs.existsSync(requiredServerFilesPath)) {
  try {
    const requiredServerFiles = JSON.parse(
      fs.readFileSync(requiredServerFilesPath, 'utf-8'),
    );
    conf = requiredServerFiles.config || {};
  } catch (e) {
    console.warn('Could not parse required-server-files.json, using defaults:', e);
  }
}

const nextApp = new NextServer({
  hostname,
  port,
  dir,
  dev: false,
  customServer: false,
  conf,
});

const nextHandler = nextApp.getRequestHandler();

const httpServer = createServer(async (req, res) => {
  try {
    await nextHandler(req, res);
  } catch (err) {
    console.error('Error handling request:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Attach Socket.IO to the same HTTP server — same port, zero extra infra
const io = new SocketIOServer(httpServer, {
  path: '/api/party/socket',
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6, // 1MB max payload
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

registerPartyHandlers(io);

httpServer.listen(port, hostname, () => {
  console.log(`> NobarFilm ready on http://${hostname}:${port}`);
  console.log('> Watch Party (Socket.IO) active on /api/party/socket');
});
