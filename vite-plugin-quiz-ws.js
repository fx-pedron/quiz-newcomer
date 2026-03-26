import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';

export default function quizWsPlugin() {
  const rooms = new Map(); // code → { host: ws, players: Map<name, ws> }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? genCode() : code;
  }

  function send(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  function getLanIPs() {
    const nets = networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
    return ips;
  }

  return {
    name: 'quiz-ws',
    configureServer(server) {
      // REST endpoint for LAN IP discovery
      server.middlewares.use('/api/network', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ips: getLanIPs() }));
      });

      const wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url === '/ws') {
          wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
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
              // Notify host
              send(room.host, { type: 'player-joined', name, players: [...room.players.keys()] });
              // Notify other players
              for (const [n, sock] of room.players) {
                if (n !== name) send(sock, { type: 'player-list', players: [...room.players.keys()] });
              }
              break;
            }

            case 'to-players': {
              // Host broadcasts to all players
              const room = rooms.get(ws._room);
              if (!room || ws._role !== 'host') break;
              for (const [, sock] of room.players) {
                send(sock, msg.data);
              }
              break;
            }

            case 'to-player': {
              // Host sends to specific player
              const room = rooms.get(ws._room);
              if (!room || ws._role !== 'host') break;
              const sock = room.players.get(msg.name);
              if (sock) send(sock, msg.data);
              break;
            }

            case 'to-host': {
              // Player sends to host
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
            // Notify all players, destroy room
            for (const [, sock] of room.players) {
              send(sock, { type: 'host-left' });
            }
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
    },
  };
}
