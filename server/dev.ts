// Development server: Runs Next.js dev server with Socket.IO on the same port (3000)

import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { registerPartyHandlers } from './party/handlers';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || 'localhost';

const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(server, {
    path: '/api/party/socket',
    transports: ['websocket', 'polling'],
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  registerPartyHandlers(io);

  server.listen(port, () => {
    console.log(`> NobarFilm Dev ready on http://${hostname}:${port}`);
    console.log('> Watch Party (Socket.IO) active on /api/party/socket');
  });
});
