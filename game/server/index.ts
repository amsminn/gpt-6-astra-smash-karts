import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GameRoom,
  MAX_PLAYERS,
  TICK_RATE,
  NEUTRAL,
} from '../game/simulation.ts';

for (const path of ['.env', '../.env']) {
  try {
    process.loadEnvFile(path);
  } catch {}
}
const PORT = Number(process.env.PORT) || 3001;
const root = resolve(fileURLToPath(new URL('../dist-client', import.meta.url)));
const rooms = new Map<
  string,
  {
    game: GameRoom;
    public: boolean;
    bots: boolean;
    activity?: string;
    emptySince: number;
  }
>();
const clients = new Map<
  WebSocket,
  {
    id: string;
    token: string;
    room: string | null;
    lastMessage: number;
    count: number;
    alive: boolean;
    expires: number;
  }
>();
const sessions = new Map<
  string,
  { id: string; room: string; expires: number }
>();
const ipConnections = new Map<string, number>();
const allowed = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (process.env.VITE_DISCORD_CLIENT_ID) {
  allowed.push(
    `https://${process.env.VITE_DISCORD_CLIENT_ID}.discordsays.com`,
    `https://${process.env.VITE_DISCORD_CLIENT_ID}.discordsez.com`,
  );
}
const mime: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(
      JSON.stringify({
        ok: true,
        multiplayer: true,
        rooms: rooms.size,
        players: clients.size,
      }),
    );
    return;
  }
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = path;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(root, 'index.html');
    } catch {
      file = resolve(root, 'index.html');
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Cache-Control':
        extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      '게임 화면: http://localhost:3000 — production: npm run build:standalone',
    );
  }
});
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 4096,
  perMessageDeflate: false,
});
server.on('upgrade', (req, socket, head) => {
  const path = req.url?.split('?')[0];
  if (path !== '/ws' && path !== '/.proxy/ws') {
    socket.destroy();
    return;
  }
  const origin = req.headers.origin;
  if (origin) {
    let valid = false;
    try {
      const o = new URL(origin);
      const h = req.headers.host?.split(':')[0];
      valid =
        o.hostname === h ||
        (process.env.NODE_ENV !== 'production' &&
          ['localhost', '127.0.0.1', h].includes(o.hostname)) ||
        allowed.includes(o.origin);
    } catch {}
    if (!valid) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }
  const ip = req.socket.remoteAddress ?? 'unknown';
  const count = ipConnections.get(ip) ?? 0;
  if (count >= 24 || clients.size >= 400) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }
  ipConnections.set(ip, count + 1);
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.once('close', () => {
      const n = (ipConnections.get(ip) ?? 1) - 1;
      if (n <= 0) ipConnections.delete(ip);
      else ipConnections.set(ip, n);
    });
    wss.emit('connection', ws, req);
  });
});
function send(ws: WebSocket, value: unknown) {
  if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 512_000)
    ws.send(JSON.stringify(value));
}
function code() {
  let s = '';
  do {
    s = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  } while (rooms.has(s));
  return s;
}
function leave(ws: WebSocket, retain = false) {
  const c = clients.get(ws);
  if (!c?.room) return;
  const room = rooms.get(c.room);
  const p = room?.game.players.get(c.id);
  if (p) p.input = { ...NEUTRAL };
  if (retain) {
    sessions.set(c.token, {
      id: c.id,
      room: c.room,
      expires: Date.now() + 20_000,
    });
  } else {
    room?.game.players.delete(c.id);
    sessions.delete(c.token);
  }
  c.room = null;
}
function fail(ws: WebSocket, message: string) {
  send(ws, { type: 'error', message });
}
wss.on('connection', (ws) => {
  const c = {
    id: randomBytes(8).toString('hex'),
    token: randomBytes(24).toString('hex'),
    room: null as string | null,
    lastMessage: Date.now(),
    count: 0,
    alive: true,
    expires: Date.now() + 15_000,
  };
  clients.set(ws, c);
  ws.on('pong', () => (c.alive = true));
  send(ws, { type: 'hello' });
  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - c.lastMessage > 1000) {
      c.count = 0;
      c.lastMessage = now;
    }
    if (++c.count > 70) {
      ws.close(1008, 'Too many messages');
      return;
    }
    let m;
    try {
      m = JSON.parse(
        (Buffer.isBuffer(raw)
          ? raw
          : Array.isArray(raw)
            ? Buffer.concat(raw)
            : Buffer.from(raw)
        ).toString('utf8'),
      );
    } catch {
      fail(ws, '메시지 형식이 올바르지 않습니다.');
      return;
    }
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ping') {
      send(ws, { type: 'pong', at: m.at });
      return;
    }
    if (m.type === 'input') {
      if (c.room) rooms.get(c.room)?.game.setInput(c.id, m.input);
      return;
    }
    if (m.type === 'leave') {
      leave(ws);
      return;
    }
    if (m.type === 'resume') {
      const s = typeof m.token === 'string' ? sessions.get(m.token) : undefined;
      if (!s || s.expires < now || !rooms.get(s.room)?.game.players.has(s.id)) {
        fail(ws, '재접속 시간이 지났습니다. 방 코드로 다시 입장해 주세요.');
        return;
      }
      if (c.room) {
        fail(ws, '이미 경기에 연결되어 있습니다.');
        return;
      }
      c.id = s.id;
      c.room = s.room;
      c.token = m.token;
      sessions.delete(m.token);
      send(ws, { type: 'joined', id: c.id, code: c.room, token: c.token });
      return;
    }
    if (m.type !== 'join') return;
    if (c.room) {
      fail(ws, '이미 경기에 참가 중입니다.');
      return;
    }
    if (typeof m.name !== 'string' || m.name.length > 64 || !m.name.trim()) {
      fail(ws, '드라이버 이름을 입력해 주세요.');
      return;
    }
    if (!['create', 'join', 'quick', 'activity'].includes(m.action)) {
      fail(ws, '입장 방식이 올바르지 않습니다.');
      return;
    }
    let key =
      typeof m.code === 'string'
        ? m.code
            .toUpperCase()
            .replace(/[^A-F0-9]/g, '')
            .slice(0, 6)
        : '';
    if (m.action === 'activity') {
      if (
        typeof m.activity !== 'string' ||
        m.activity.length > 128 ||
        !m.activity
      ) {
        fail(ws, 'Discord 활동 정보를 확인할 수 없습니다.');
        return;
      }
      key =
        [...rooms.entries()].find(([, r]) => r.activity === m.activity)?.[0] ??
        '';
    }
    if (m.action === 'quick')
      key =
        [...rooms.entries()].find(
          ([, r]) =>
            r.public &&
            [...r.game.players.values()].filter((p) => !p.bot).length <
              MAX_PLAYERS,
        )?.[0] ?? '';
    if (
      m.action === 'create' ||
      ((m.action === 'quick' || m.action === 'activity') && !key)
    ) {
      if (rooms.size >= 80) {
        fail(ws, '현재 모든 방이 사용 중입니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      key = code();
      rooms.set(key, {
        game: new GameRoom(key),
        public: m.action === 'quick',
        bots: m.bots === true,
        activity: m.action === 'activity' ? m.activity : undefined,
        emptySince: 0,
      });
    }
    const room = rooms.get(key);
    if (!room) {
      fail(ws, '방을 찾을 수 없습니다. 6자리 코드를 확인해 주세요.');
      return;
    }
    if (room.game.players.size >= MAX_PLAYERS) {
      const bot = [...room.game.players.values()].find((p) => p.bot);
      if (bot) room.game.players.delete(bot.id);
      else {
        fail(ws, '방이 가득 찼습니다. 최대 8명이 참가할 수 있습니다.');
        return;
      }
    }
    room.game.addPlayer(
      c.id,
      m.name,
      typeof m.color === 'number' ? m.color : 0,
    );
    if (room.bots) room.game.addBots(4);
    c.room = key;
    room.emptySince = 0;
    send(ws, { type: 'joined', id: c.id, code: key, token: c.token });
  });
  ws.on('close', () => {
    leave(ws, true);
    clients.delete(ws);
  });
  ws.on('error', () => ws.close());
});
let last = performance.now(),
  accumulator = 0,
  tick = 0;
const timer = setInterval(() => {
  const now = performance.now();
  accumulator += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (accumulator >= 1 / TICK_RATE) {
    for (const r of rooms.values()) r.game.step();
    accumulator -= 1 / TICK_RATE;
    tick++;
    if (tick % 2 === 0) {
      const messages = new Map<string, unknown>();
      for (const [ws, c] of clients) {
        if (!c.room) continue;
        if (!messages.has(c.room)) {
          const r = rooms.get(c.room);
          if (r)
            messages.set(c.room, { type: 'state', state: r.game.snapshot() });
        }
        const m = messages.get(c.room);
        if (m) send(ws, m);
      }
    }
  }
}, 8);
const housekeeping = setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions)
    if (s.expires < now) {
      rooms.get(s.room)?.game.players.delete(s.id);
      sessions.delete(token);
    }
  for (const [key, r] of rooms) {
    if (![...r.game.players.values()].some((p) => !p.bot)) {
      if (!r.emptySince) r.emptySince = now;
      else if (now - r.emptySince > 30_000) rooms.delete(key);
    } else r.emptySince = 0;
  }
  for (const [ws, c] of clients) {
    if (!c.alive || (!c.room && now > c.expires)) {
      ws.terminate();
      continue;
    }
    c.alive = false;
    ws.ping();
  }
}, 10_000);
server.listen(PORT, '0.0.0.0', () =>
  console.log(
    `Kart server listening at http://0.0.0.0:${PORT} (WebSocket /ws)`,
  ),
);
function shutdown() {
  clearInterval(timer);
  clearInterval(housekeeping);
  for (const ws of clients.keys()) ws.close(1001, 'Server shutting down');
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
