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

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStaticFile(filePath: string, res: any, cacheControl?: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    }
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return true;
  } catch {
    return false;
  }
}

const publicDirCandidates = [
  path.join(dir, 'public'),
  path.join(dir, '..', '..', 'public'),
  path.join(process.cwd(), 'public'),
];

const staticDirCandidates = [
  path.join(dir, '.next', 'static'),
  path.join(dir, '..', 'static'),
  path.join(process.cwd(), '.next', 'static'),
];

const resolvedPublicDir = publicDirCandidates.find((p) => fs.existsSync(p)) || path.join(dir, 'public');
const resolvedStaticDir = staticDirCandidates.find((p) => fs.existsSync(p)) || path.join(dir, '.next', 'static');

const httpServer = createServer(async (req, res) => {
  try {
    const rawUrl = req.url || '/';
    const questionIdx = rawUrl.indexOf('?');
    const pathname = decodeURIComponent(questionIdx === -1 ? rawUrl : rawUrl.slice(0, questionIdx));

    // 1. Explicitly serve Next.js static assets (_next/static/*)
    if (pathname.startsWith('/_next/static/')) {
      const relPath = pathname.slice('/_next/static/'.length);
      const staticFilePath = path.join(resolvedStaticDir, relPath);
      if (serveStaticFile(staticFilePath, res, 'public, max-age=31536000, immutable')) {
        return;
      }
    }

    // 2. Explicitly serve public files (manifest.json, icons, sw.js, etc.)
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
      const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      if (cleanPath) {
        const publicFilePath = path.join(resolvedPublicDir, cleanPath);
        if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
          const isSw = pathname === '/sw.js';
          const cacheControl = isSw ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400';
          if (serveStaticFile(publicFilePath, res, cacheControl)) {
            return;
          }
        }
      }
    }

    // 3. Next.js App Router, SSR, and API handling
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
