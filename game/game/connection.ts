import { GameRoom, TICK_RATE, type Input, type Snapshot } from './simulation';
export type JoinOptions = {
  action: 'quick' | 'create' | 'join' | 'practice' | 'activity';
  name: string;
  color: number;
  code?: string;
  bots: boolean;
  endpoint?: string;
  activity?: string;
};
export type Connection = { input: (input: Input) => void; close: () => void };
export type ConnectionHooks = {
  onState: (s: Snapshot) => void;
  onJoined: (id: string, code: string) => void;
  onStatus: (s: string) => void;
  onError: (s: string) => void;
  onPing: (n: number) => void;
};
export function connect(
  options: JoinOptions,
  hooks: ConnectionHooks,
): Connection {
  if (options.action === 'practice') {
    const room = new GameRoom();
    room.addPlayer('you', options.name, options.color);
    room.addBots(5);
    hooks.onJoined('you', room.code);
    hooks.onStatus('연습 모드');
    let last = performance.now(),
      acc = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      acc += Math.min((now - last) / 1000, 0.2);
      last = now;
      while (acc >= 1 / TICK_RATE) {
        room.step();
        acc -= 1 / TICK_RATE;
      }
      hooks.onState(room.snapshot());
    }, 1000 / TICK_RATE);
    return {
      input: (i) => room.setInput('you', i),
      close: () => clearInterval(timer),
    };
  }
  let socket: WebSocket | null = null,
    closed = false,
    token = '',
    attempts = 0,
    retry: ReturnType<typeof setTimeout> | undefined,
    deadline: ReturnType<typeof setTimeout> | undefined;
  let currentInput: Input = { throttle: 0, steer: 0, fire: false };
  const isDiscord =
    location.hostname.endsWith('.discordsays.com') ||
    location.hostname.endsWith('.discordsez.com');
  const defaultUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${isDiscord ? '/.proxy' : ''}/ws`;
  let endpoint =
    options.endpoint?.trim() ||
    import.meta.env.VITE_GAME_SERVER_URL ||
    defaultUrl;
  try {
    const u = new URL(endpoint);
    if (!['ws:', 'wss:'].includes(u.protocol)) throw Error();
    if (location.protocol === 'https:' && u.protocol === 'ws:') throw Error();
    endpoint = u.href;
  } catch {
    hooks.onError(
      '서버 주소는 ws:// 또는 wss:// 형식이어야 하며 HTTPS에서는 wss://를 사용해야 합니다.',
    );
    return { input: () => {}, close: () => {} };
  }
  function dial() {
    if (closed) return;
    hooks.onStatus(token ? '재접속 중…' : '서버 연결 중…');
    socket = new WebSocket(endpoint);
    deadline = setTimeout(() => {
      socket?.close();
      if (!token) {
        closed = true;
        hooks.onError(
          '서버에 연결할 수 없습니다. 서버 실행 상태와 주소를 확인해 주세요.',
        );
      }
    }, 7000);
    socket.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.type === 'hello') {
        socket?.send(
          JSON.stringify(
            token ? { type: 'resume', token } : { ...options, type: 'join' },
          ),
        );
      }
      if (m.type === 'joined') {
        clearTimeout(deadline);
        token = m.token;
        attempts = 0;
        hooks.onJoined(m.id, m.code);
        hooks.onStatus('온라인');
      }
      if (m.type === 'state') hooks.onState(m.state);
      if (m.type === 'pong') hooks.onPing(Math.round(performance.now() - m.at));
      if (m.type === 'error') {
        clearTimeout(deadline);
        closed = true;
        socket?.close();
        hooks.onError(m.message);
      }
    };
    socket.onclose = () => {
      clearTimeout(deadline);
      if (closed) return;
      if (token && attempts++ < 6) {
        hooks.onStatus('연결 끊김 · 재접속 중…');
        retry = setTimeout(dial, Math.min(2000, 400 * attempts));
      } else {
        closed = true;
        hooks.onError(
          token
            ? '연결이 끊겼습니다. 방 코드로 다시 입장할 수 있습니다.'
            : '게임 서버에 연결하지 못했습니다. 서버 주소를 확인하거나 봇 연습을 시작하세요.',
        );
      }
    };
    socket.onerror = () => {};
  }
  dial();
  const inputTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN && token)
      socket.send(JSON.stringify({ type: 'input', input: currentInput }));
  }, 1000 / 30);
  const pingTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: 'ping', at: performance.now() }));
  }, 1500);
  return {
    input: (i) => {
      currentInput = i;
    },
    close: () => {
      closed = true;
      clearInterval(inputTimer);
      clearInterval(pingTimer);
      clearTimeout(retry);
      clearTimeout(deadline);
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: 'leave' }));
      socket?.close();
    },
  };
}
