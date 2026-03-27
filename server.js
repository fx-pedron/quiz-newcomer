import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// ── MIME types ──
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// ── Static file server ──
const server = createServer((req, res) => {
  let pathname = req.url.split('?')[0];

  // Remove base path prefix
  if (pathname.startsWith('/quiz-newcomer')) {
    pathname = pathname.slice('/quiz-newcomer'.length) || '/';
  }

  // Serve index.html for SPA routes
  let filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  if (!existsSync(filePath)) filePath = join(DIST, 'index.html');

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ── WebSocket server (same protocol as vite-plugin-quiz-ws) ──
const rooms = new Map(); // code → { host, players: Map<name, ws> }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? genCode() : code;
}

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  ws._room = null;
  ws._role = null;
  ws._name = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create-room': {
        const code = genCode();
        rooms.set(code, { host: ws, players: new Map() });
        ws._room = code;
        ws._role = 'host';
        send(ws, { type: 'room-created', code });
        break;
      }

      case 'join-room': {
        const { code, name } = msg;
        const room = rooms.get(code?.toUpperCase());
        if (!room) { send(ws, { type: 'error', message: 'Salon introuvable' }); break; }
        if (room.players.has(name)) { send(ws, { type: 'error', message: 'Ce nom est déjà pris' }); break; }
        if (room.players.size >= 20) { send(ws, { type: 'error', message: 'Salon plein (max 20)' }); break; }
        room.players.set(name, ws);
        ws._room = code.toUpperCase();
        ws._role = 'player';
        ws._name = name;
        send(ws, { type: 'joined', code: ws._room, name });
        send(room.host, { type: 'player-joined', name, players: [...room.players.keys()] });
        for (const [n, sock] of room.players) {
          if (n !== name) send(sock, { type: 'player-list', players: [...room.players.keys()] });
        }
        break;
      }

      case 'to-players': {
        const room = rooms.get(ws._room);
        if (!room || ws._role !== 'host') break;
        for (const [, sock] of room.players) send(sock, msg.data);
        break;
      }

      case 'to-player': {
        const room = rooms.get(ws._room);
        if (!room || ws._role !== 'host') break;
        const sock = room.players.get(msg.name);
        if (sock) send(sock, msg.data);
        break;
      }

      case 'to-host': {
        const room = rooms.get(ws._room);
        if (!room || ws._role !== 'player') break;
        send(room.host, { type: 'from-player', name: ws._name, data: msg.data });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws._room) return;
    const room = rooms.get(ws._room);
    if (!room) return;

    if (ws._role === 'host') {
      for (const [, sock] of room.players) send(sock, { type: 'host-left' });
      rooms.delete(ws._room);
    } else if (ws._role === 'player') {
      room.players.delete(ws._name);
      send(room.host, { type: 'player-left', name: ws._name, players: [...room.players.keys()] });
      for (const [, sock] of room.players) {
        send(sock, { type: 'player-list', players: [...room.players.keys()] });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Quiz server running on http://localhost:${PORT}`);
});
