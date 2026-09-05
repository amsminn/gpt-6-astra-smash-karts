'use client';
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Flag,
  ArrowUpRight,
  Users,
  Zap,
  Volume2,
  VolumeX,
  Maximize,
  HelpCircle,
  X,
  Copy,
  Trophy,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Rocket,
  Crosshair,
  ScanLine,
  Circle,
  Triangle,
  Radiation,
  Bomb,
  Orbit,
  Star,
  Snowflake,
  Package,
  Settings2,
  Wifi,
  Gamepad2,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  GameRoom,
  COLORS,
  WEAPONS,
  OBSTACLES,
  ARENA,
  type Snapshot,
  type Input as DriveInput,
  type Weapon,
} from '@/game/simulation';
import { connect, type Connection, type JoinOptions } from '@/game/connection';
import type { ArenaRenderer } from '@/game/renderer';
const ICONS: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  rocket: Rocket,
  crosshair: Crosshair,
  scan: ScanLine,
  circle: Circle,
  triangle: Triangle,
  radiation: Radiation,
  bomb: Bomb,
  orbit: Orbit,
  star: Star,
  snow: Snowflake,
  box: Package,
};
function WeaponIcon({
  weapon,
  size = 30,
}: {
  weapon: Weapon | null;
  size?: number;
}) {
  const Icon = weapon ? ICONS[WEAPONS[weapon].icon] : Package;
  return <Icon size={size} />;
}
function time(s: number) {
  return `${Math.floor(Math.max(0, s) / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, s) % 60)
    .toString()
    .padStart(2, '0')}`;
}
function MiniMap({ state, myId }: { state: Snapshot; myId: string }) {
  return (
    <svg viewBox="-49 -41 98 82" aria-label="아레나 미니맵">
      <rect
        x={-ARENA.x}
        y={-ARENA.z}
        width={ARENA.x * 2}
        height={ARENA.z * 2}
        fill="#66707a"
        rx="3"
      />
      <rect x="-7.5" y="-19" width="15" height="38" fill="#8f979e" />
      {OBSTACLES.map((o, i) => (
        <rect
          key={i}
          x={o.x - o.w / 2}
          y={o.z - o.d / 2}
          width={o.w}
          height={o.d}
          fill="#303b47"
        />
      ))}
      {state.boxes
        .filter((b) => b.ready <= state.t)
        .map((b) => (
          <rect
            key={b.id}
            x={b.x - 0.7}
            y={b.z - 0.7}
            width="1.4"
            height="1.4"
            fill="#e8fa9f"
          />
        ))}
      {state.players
        .filter((p) => p.respawn <= 0)
        .map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.x} ${p.z}) rotate(${(-p.angle * 180) / Math.PI})`}
          >
            <circle
              r={p.id === myId ? 3 : 2.2}
              fill={COLORS[p.color]}
              stroke={p.id === myId ? '#fff' : '#18232e'}
              strokeWidth=".8"
            />
            {p.id === myId && <path d="M-2 2L0 5L2 2" fill="#fff" />}
          </g>
        ))}
    </svg>
  );
}
export default function Home() {
  const sceneElement = useRef<HTMLDivElement>(null),
    renderer = useRef<ArenaRenderer | null>(null),
    connection = useRef<Connection | null>(null),
    stateRef = useRef<Snapshot | null>(null),
    idRef = useRef(''),
    hudAt = useRef(0),
    keys = useRef(new Set<string>()),
    touch = useRef(new Set<string>());
  const [online, setOnline] = useState(false),
    [myId, setMyId] = useState(''),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<'lobby' | 'playing'>('lobby'),
    [busy, setBusy] = useState(false),
    [name, setName] = useState('Player'),
    [color, setColor] = useState(0),
    [bots, setBots] = useState(true),
    [code, setCode] = useState(''),
    [joinOpen, setJoinOpen] = useState(false),
    [error, setError] = useState(''),
    [graphicError, setGraphicError] = useState(''),
    [help, setHelp] = useState(false),
    [settings, setSettings] = useState(false),
    [endpoint, setEndpoint] = useState(''),
    [muted, setMuted] = useState(false),
    [status, setStatus] = useState(''),
    [ping, setPing] = useState(0),
    [hud, setHud] = useState<Snapshot | null>(null),
    [menu, setMenu] = useState(false),
    [scoreboard, setScoreboard] = useState(false),
    [copied, setCopied] = useState(false),
    [activity, setActivity] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    const healthController = new AbortController();
    const healthTimeout = setTimeout(() => healthController.abort(), 3000);
    fetch('/health', { signal: healthController.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOnline(!!data && typeof data === 'object' && 'multiplayer' in data && data.multiplayer === true);
      })
      .catch(() => {})
      .finally(() => clearTimeout(healthTimeout));
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const prefs = JSON.parse(
          localStorage.getItem('kart-preferences') ?? '{}',
        );
        if (typeof prefs.name === 'string') setName(prefs.name);
        if (typeof prefs.color === 'number')
          setColor(Math.max(0, Math.min(7, prefs.color)));
        if (typeof prefs.endpoint === 'string') setEndpoint(prefs.endpoint);
        if (prefs.muted) setMuted(true);
      } catch {}
      const params = new URLSearchParams(location.search),
        room = params.get('room');
      if (room) {
        setCode(room.toUpperCase().slice(0, 6));
        setJoinOpen(true);
      }
      const server = params.get('server');
      if (server && /^wss?:\/\//.test(server)) setEndpoint(server);
    });
    import('@/game/renderer')
      .then(({ ArenaRenderer }) => {
        if (cancelled || !sceneElement.current) return;
        try {
          renderer.current = new ArenaRenderer(
            sceneElement.current,
            setGraphicError,
          );
          setReady(true);
        } catch {
          setGraphicError(
            'WebGL을 시작할 수 없습니다. 브라우저의 하드웨어 가속을 켜고 새로고침해 주세요.',
          );
        }
      })
      .catch(() =>
        setGraphicError('3D 엔진을 불러오지 못했습니다. 새로고침해 주세요.'),
      );
    if (
      (location.hostname.endsWith('.discordsays.com') ||
        location.hostname.endsWith('.discordsez.com')) &&
      import.meta.env.VITE_DISCORD_CLIENT_ID
    ) {
      import('@discord/embedded-app-sdk')
        .then(async ({ DiscordSDK }) => {
          const sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID!);
          await Promise.race([
            sdk.ready(),
            new Promise((_, reject) =>
              setTimeout(() => reject(Error('timeout')), 8000),
            ),
          ]);
          if (!cancelled) setActivity(sdk.instanceId);
        })
        .catch(() => {
          if (!cancelled)
            setNotice(
              'Discord 연결을 확인하지 못했습니다. 방 코드로 입장할 수 있습니다.',
            );
        });
    }
    return () => {
      cancelled = true;
      healthController.abort();
      clearTimeout(healthTimeout);
      connection.current?.close();
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || screen !== 'lobby') return;
    const demo = new GameRoom('DEMO');
    demo.elapsed = 0;
    demo.addBots(6);
    const timer = setInterval(() => {
      demo.step();
      renderer.current?.setState(demo.snapshot(), '', true);
    }, 1000 / 30);
    return () => clearInterval(timer);
  }, [ready, screen]);
  useEffect(() => {
    renderer.current?.audio.setMuted(muted);
  }, [muted, ready]);
  useEffect(() => {
    if (screen !== 'playing') return;
    function down(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'Tab',
        ].includes(e.code)
      )
        e.preventDefault();
      if (e.code === 'Escape' && !e.repeat) setMenu((v) => !v);
      if (e.code === 'Tab') setScoreboard(true);
      keys.current.add(e.code);
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.code);
      if (e.code === 'Tab') {
        e.preventDefault();
        setScoreboard(false);
      }
    }
    function clear() {
      keys.current.clear();
      touch.current.clear();
      connection.current?.input({ throttle: 0, steer: 0, fire: false });
      setScoreboard(false);
    }
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    const timer = setInterval(() => {
      const k = keys.current,
        t = touch.current,
        has = (...list: string[]) => list.some((v) => k.has(v) || t.has(v));
      const input: DriveInput =
        menu || help
          ? { throttle: 0, steer: 0, fire: false }
          : {
              throttle:
                Number(has('KeyW', 'ArrowUp')) -
                Number(has('KeyS', 'ArrowDown')),
              steer:
                Number(has('KeyA', 'ArrowLeft')) -
                Number(has('KeyD', 'ArrowRight')),
              fire: has('Space'),
            };
      connection.current?.input(input);
    }, 1000 / 30);
    return () => {
      clear();
      clearInterval(timer);
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [screen, menu, help]);
  function start(action: JoinOptions['action']) {
    if (!name.trim()) {
      setError('드라이버 이름을 입력해 주세요.');
      return;
    }
    if (action === 'join' && !/^[A-F0-9]{6}$/.test(code)) {
      setError('6자리 방 코드를 입력해 주세요.');
      return;
    }
    setError('');
    setBusy(true);
    setNotice('');
    renderer.current?.audio.start();
    renderer.current?.audio.setMuted(muted);
    connection.current?.close();
    try {
      localStorage.setItem(
        'kart-preferences',
        JSON.stringify({ name: name.trim(), color, muted, endpoint }),
      );
    } catch {}
    connection.current = connect(
      { action, name: name.trim(), color, bots, code, endpoint, activity },
      {
        onJoined: (id, room) => {
          idRef.current = id;
          setMyId(id);
          setCode(room);
          setScreen('playing');
          setBusy(false);
          setMenu(false);
          keys.current.clear();
          touch.current.clear();
        },
        onState: (s) => {
          stateRef.current = s;
          renderer.current?.setState(s, idRef.current, false);
          if (performance.now() - hudAt.current > 85) {
            hudAt.current = performance.now();
            setHud(s);
          }
        },
        onStatus: setStatus,
        onPing: setPing,
        onError: (message) => {
          setError(message);
          setBusy(false);
          setScreen('lobby');
          setHud(null);
          connection.current?.close();
          connection.current = null;
        },
      },
    );
  }
  function leave() {
    connection.current?.close();
    connection.current = null;
    keys.current.clear();
    touch.current.clear();
    setScreen('lobby');
    setHud(null);
    setMenu(false);
    setScoreboard(false);
    setError('');
    renderer.current?.audio.speed(0);
  }
  async function share() {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('room', code);
    if (endpoint) url.searchParams.set('server', endpoint);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice(`방 코드: ${code} · 이 페이지 주소를 친구에게 공유하세요.`);
    }
  }
  function touchKey(
    key: string,
    pressed: boolean,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
    if (pressed) {
      e.currentTarget.setPointerCapture(e.pointerId);
      touch.current.add(key);
    } else touch.current.delete(key);
  }

  const canOnline =
    online || !!endpoint.trim() || !!import.meta.env.VITE_GAME_SERVER_URL;
  const me = hud?.players.find((p) => p.id === myId),
    ranked = [...(hud?.players ?? [])].sort(
      (a, b) =>
        b.kills - a.kills ||
        a.deaths - b.deaths ||
        a.name.localeCompare(b.name),
    ),
    rank =
      ranked.findIndex(
        (p) => p.kills === hud?.players.find((q) => q.id === myId)?.kills,
      ) + 1;
  const weapon = me?.weapon ?? null,
    weaponInfo = weapon ? WEAPONS[weapon] : null;
  const feed = hud?.events.filter((e) => e.kind === 'smash').slice(-3) ?? [];
  const hit = !!hud?.events.some(
    (e) => e.kind === 'hit' && e.target === myId && hud.t - e.t < 0.16,
  );
  return (
    <main className={screen === 'lobby' ? 'lobby' : 'game-shell'}>
      <div
        ref={sceneElement}
        className={`arena-canvas ${screen === 'lobby' ? 'lobby-scene' : ''}`}
      />
      {screen === 'lobby' ? (
        <>
          <div className="lobby-shade" />
          <header className="topbar">
            <div className="brand">
              <Flag size={23} /> SMASH<span>KARTS</span>
              <sup>ARENA</sup>
            </div>
            <div className="header-actions">
              <span className="status">
                <i />
                {activity ? 'DISCORD ACTIVITY' : '3D MULTIPLAYER BATTLE'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="게임 설정"
                onClick={() => setSettings(true)}
              >
                <Settings2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="게임 방법"
                onClick={() => setHelp(true)}
              >
                <HelpCircle size={18} />
              </Button>
            </div>
          </header>
          <section className="intro">
            <span className="eyebrow">ALL GAS. TOTAL CHAOS.</span>
            <h1>
              작은 카트.
              <br />
              <em>거대한 한 방.</em>
            </h1>
            <p>
              무기를 줍고, 조준하고, 날려버리세요.
              <br />
              3분 동안 펼쳐지는 카트 배틀 아레나.
            </p>
            <div className="specs">
              <span>
                <Users size={15} /> 최대 8인
              </span>
              <span>
                <Zap size={15} /> 11가지 무기
              </span>
              <span>03:00 데스매치</span>
            </div>
            <div className="play-panel">
              <label htmlFor="nickname">DRIVER NAME</label>
              <Input
                id="nickname"
                placeholder="드라이버 이름"
                maxLength={16}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ready && !busy)
                    start(canOnline ? 'quick' : 'practice');
                }}
              />
              <div className="kart-colors">
                <span>KART COLOR</span>
                <div>
                  {COLORS.slice(0, 6).map((c, i) => (
                    <button
                      key={c}
                      className={color === i ? 'swatch selected' : 'swatch'}
                      style={{ '--swatch': c } as CSSProperties}
                      onClick={() => setColor(i)}
                      aria-label={`${['라임', '코랄', '블루', '퍼플', '오렌지', '핑크'][i]} 카트`}
                      aria-pressed={color === i}
                    >
                      {color === i && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="play-button"
                disabled={!ready || busy || !!graphicError}
                onClick={() =>
                  start(
                    activity ? 'activity' : canOnline ? 'quick' : 'practice',
                  )
                }
              >
                {busy
                  ? '연결 중…'
                  : activity
                    ? 'Discord 배틀 시작'
                    : canOnline
                      ? '빠른 배틀'
                      : '봇 배틀 시작'}
                <ArrowUpRight size={20} />
              </Button>
              <div className="room-actions">
                <Button
                  variant="ghost"
                  disabled={!ready || busy || !!graphicError || !canOnline}
                  onClick={() => start('create')}
                >
                  <Users size={14} /> 방 만들기
                </Button>
                <span />
                <Button variant="ghost" onClick={() => setJoinOpen(!joinOpen)}>
                  코드로 입장 <ChevronRight size={14} />
                </Button>
              </div>
              {joinOpen && (
                <div className="join-form">
                  <Input
                    aria-label="방 코드"
                    placeholder="6자리 방 코드"
                    value={code === 'PRACTICE' ? '' : code}
                    maxLength={6}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') start('join');
                    }}
                  />
                  <Button
                    disabled={!ready || busy || !!graphicError}
                    onClick={() => start('join')}
                  >
                    입장
                  </Button>
                </div>
              )}
              <div className="practice-row">
                <Button
                  variant="ghost"
                  disabled={!ready || busy || !!graphicError}
                  onClick={() => start('practice')}
                >
                  <Gamepad2 size={14} /> 혼자 연습하기
                </Button>
                <label>
                  <input
                    type="checkbox"
                    checked={bots}
                    onChange={(e) => setBots(e.target.checked)}
                  />{' '}
                  빈자리 봇
                </label>
              </div>
              <p>WASD / 방향키로 주행 · SPACE로 발사</p>
              {!canOnline && (
                <p className="server-hint">
                  온라인 배틀은 설정에서 게임 서버를 연결하세요.
                </p>
              )}
              {(error || graphicError) && (
                <div className="error" role="alert">
                  {graphicError || error}
                </div>
              )}
              {notice && <output className="notice">{notice}</output>}
            </div>
          </section>
          <aside className="arena-caption">
            <span className="map-number">01</span>
            <div>
              <span className="eyebrow">THE BATTLEFIELD</span>
              <h2>SUNSET CIRCUIT</h2>
              <p>질주하고, 한 방을 노리세요.</p>
            </div>
            <span className="live-tag">
              <i /> LIVE ARENA
            </span>
          </aside>
          <footer className="lobby-footer">
            <span>독립 제작 카트 배틀 · SMASH KARTS에서 영감을 받은 게임</span>
            <button onClick={() => setHelp(true)}>
              HOW TO PLAY <ArrowUpRight size={12} />
            </button>
          </footer>
        </>
      ) : (
        <>
          <div className={`hit-vignette ${hit ? 'visible' : ''}`} />
          <header className="hud-top">
            <div className="match-info">
              <Flag size={18} />
              <div>
                <strong>SUNSET CIRCUIT</strong>
                <span>개인전 · ROUND {hud?.round ?? 1}</span>
              </div>
            </div>
            <div
              className={`match-clock ${(hud?.remaining ?? 180) < 30 ? 'urgent' : ''}`}
            >
              <span>
                {hud?.phase === 'results'
                  ? 'NEXT ROUND'
                  : hud?.phase === 'countdown'
                    ? 'GET READY'
                    : 'TIME LEFT'}
              </span>
              <strong>{hud ? time(hud.remaining) : '03:00'}</strong>
            </div>
            <div className="hud-actions">
              <Button
                variant="ghost"
                size="icon"
                aria-label={muted ? '소리 켜기' : '소리 끄기'}
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX /> : <Volume2 />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="전체 화면"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else
                    void document.documentElement
                      .requestFullscreen()
                      .catch(() =>
                        setNotice(
                          '전체 화면은 이 브라우저에서 지원되지 않습니다.',
                        ),
                      );
                }}
              >
                <Maximize />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="게임 메뉴"
                onClick={() => setMenu(true)}
              >
                <Settings2 />
              </Button>
            </div>
          </header>
          <aside className="leaderboard-mini">
            <div className="panel-label">
              <Trophy size={12} /> LEADERBOARD <span>TAB</span>
            </div>
            {ranked.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className={`leader-row ${p.id === myId ? 'is-you' : ''}`}
              >
                <span>{i + 1}</span>
                <i style={{ background: COLORS[p.color] }} />
                <b>
                  {p.name}
                  {p.bot && <small>BOT</small>}
                </b>
                <strong>{p.kills}</strong>
              </div>
            ))}
            <button
              className="room-code"
              onClick={share}
              disabled={code === 'PRACTICE'}
            >
              <span>
                {code === 'PRACTICE' ? 'BOT PRACTICE' : `ROOM ${code}`}
              </span>
              {code !== 'PRACTICE' &&
                (copied ? <Check size={12} /> : <Copy size={12} />)}
            </button>
            <div className="connection-status">
              <Wifi size={10} />
              {status}
              {status === '온라인' && ` · ${ping} ms`}
            </div>
          </aside>
          <aside className="kill-feed">
            {feed.map((e) => (
              <div key={e.id} className={e.owner === myId ? 'own-kill' : ''}>
                <b>{e.name}</b>
                <WeaponIcon weapon={e.weapon ?? null} size={13} />
                <span>{e.victim}</span>
              </div>
            ))}
          </aside>
          <div className="aim-reticle">
            <span />
            <i />
            <span />
          </div>
          <div className="hud-bottom">
            <div className="driver-status">
              <div className="driver-rank">
                <span>#{rank || 1}</span>
                <div>
                  <b>{me?.name ?? name}</b>
                  <small>
                    {me?.kills ?? 0} SMASHES{' '}
                    <span> / {me?.deaths ?? 0} DEATHS</span>
                  </small>
                </div>
              </div>
              <div className="hp-label">
                <span>ARMOR</span>
                <b>
                  {Math.ceil(me?.hp ?? 100)} <small>/ 100</small>
                </b>
              </div>
              <div className="health-track">
                <div
                  style={{
                    width: `${me?.hp ?? 100}%`,
                    background: (me?.hp ?? 100) < 35 ? '#ff7269' : '#d7fa52',
                  }}
                />
              </div>
              <div className="speed">
                <strong>{Math.round(Math.abs(me?.speed ?? 0) * 3.6)}</strong>
                <span>KM/H</span>
                <div className="speed-bars">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i
                      key={i}
                      className={Math.abs(me?.speed ?? 0) > i * 2 ? 'on' : ''}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="driving-tip">
              <kbd>W A S D</kbd>
              <span>주행</span>
              <kbd>SPACE</kbd>
              <span>무기 사용</span>
            </div>
            <div
              className="weapon-hud"
              style={
                {
                  '--weapon-color': weaponInfo?.color ?? '#8195a4',
                } as CSSProperties
              }
            >
              <div className={`weapon-orb ${weapon ? 'loaded' : ''}`}>
                <WeaponIcon weapon={weapon} size={42} />
                {weapon && (
                  <span>
                    {me?.active ? `${Math.ceil(me.active)}s` : me?.ammo}
                  </span>
                )}
              </div>
              <div>
                <span className="panel-label">
                  {weapon ? 'WEAPON READY' : 'FIND A WEAPON'}
                </span>
                <h3>{weaponInfo?.name ?? '아이템 상자를 찾으세요'}</h3>
                <p>
                  {weapon
                    ? me?.active
                      ? '효과 발동 중'
                      : 'SPACE를 눌러 사용'
                    : '? 상자에 닿으면 무기 획득'}
                </p>
              </div>
            </div>
          </div>
          {hud && (
            <div className="minimap">
              <span>ARENA MAP</span>
              <MiniMap state={hud} myId={myId} />
            </div>
          )}
          <div className="touch-controls">
            <div className="touch-steer">
              <button
                aria-label="좌회전"
                onPointerDown={(e) => touchKey('ArrowLeft', true, e)}
                onPointerUp={(e) => touchKey('ArrowLeft', false, e)}
                onPointerCancel={() => {
                  touch.current.delete('ArrowLeft');
                }}
                onLostPointerCapture={() => {
                  touch.current.delete('ArrowLeft');
                }}
              >
                <ArrowLeft />
              </button>
              <button
                aria-label="우회전"
                onPointerDown={(e) => touchKey('ArrowRight', true, e)}
                onPointerUp={(e) => touchKey('ArrowRight', false, e)}
                onPointerCancel={() => {
                  touch.current.delete('ArrowRight');
                }}
                onLostPointerCapture={() => {
                  touch.current.delete('ArrowRight');
                }}
              >
                <ArrowRight />
              </button>
            </div>
            <div className="touch-throttle">
              <button
                aria-label="가속"
                onPointerDown={(e) => touchKey('ArrowUp', true, e)}
                onPointerUp={(e) => touchKey('ArrowUp', false, e)}
                onPointerCancel={() => {
                  touch.current.delete('ArrowUp');
                }}
                onLostPointerCapture={() => {
                  touch.current.delete('ArrowUp');
                }}
              >
                <ArrowUp />
              </button>
              <button
                aria-label="후진"
                onPointerDown={(e) => touchKey('ArrowDown', true, e)}
                onPointerUp={(e) => touchKey('ArrowDown', false, e)}
                onPointerCancel={() => {
                  touch.current.delete('ArrowDown');
                }}
                onLostPointerCapture={() => {
                  touch.current.delete('ArrowDown');
                }}
              >
                <ArrowDown />
              </button>
            </div>
            <button
              className="touch-fire"
              aria-label="무기 사용"
              onPointerDown={(e) => touchKey('Space', true, e)}
              onPointerUp={(e) => touchKey('Space', false, e)}
              onPointerCancel={() => {
                touch.current.delete('Space');
              }}
              onLostPointerCapture={() => {
                touch.current.delete('Space');
              }}
            >
              <Crosshair size={30} />
              FIRE
            </button>
          </div>
          {hud?.phase === 'countdown' && (
            <div className="center-announcement">
              <span>READY TO SMASH?</span>
              <strong>{Math.ceil(hud.remaining)}</strong>
              <p>아이템을 줍고 가장 많은 상대를 처치하세요.</p>
            </div>
          )}
          {me && me.respawn > 0 && hud?.phase === 'playing' && (
            <div className="center-announcement smashed">
              <span>YOU GOT</span>
              <strong>SMASHED!</strong>
              <p>{Math.ceil(me.respawn)}초 후 다시 출발합니다</p>
            </div>
          )}
          {me && me.frozen > 0 && me.respawn <= 0 && (
            <div className="frozen-label">
              <Snowflake size={18} /> 빙결 · {me.frozen.toFixed(1)}s
            </div>
          )}
          {me && me.shield > 0 && hud?.phase === 'playing' && (
            <div className="shield-label">
              리스폰 보호 · {Math.ceil(me.shield)}s
            </div>
          )}
          {notice && (
            <output className="game-notice">
              {notice}
              <button aria-label="안내 닫기" onClick={() => setNotice('')}>
                <X size={12} />
              </button>
            </output>
          )}
        </>
      )}
      {(scoreboard || hud?.phase === 'results') && screen === 'playing' && (
        <div className="overlay scoreboard-overlay">
          <section className="score-panel">
            <span className="eyebrow">
              {hud?.phase === 'results' ? 'ROUND COMPLETE' : 'LIVE STANDINGS'}
            </span>
            <Trophy className="trophy-icon" size={44} />
            <h2>
              {hud?.phase === 'results'
                ? ranked.filter((p) => p.kills === ranked[0]?.kills).length > 1
                  ? '공동 우승!'
                  : `${ranked[0]?.name ?? 'Driver'} 우승!`
                : '현재 순위'}
            </h2>
            <p>
              {hud?.phase === 'results'
                ? `${Math.ceil(hud.remaining)}초 후 다음 경기 시작`
                : '최다 처치 순위 · 동점은 공동 순위로 표시'}
            </p>
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>드라이버</th>
                  <th>처치</th>
                  <th>데스</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
                  <tr key={p.id} className={p.id === myId ? 'is-you' : ''}>
                    <td>
                      {i > 0 && p.kills === ranked[i - 1].kills ? '=' : i + 1}
                    </td>
                    <td>
                      <i style={{ background: COLORS[p.color] }} />
                      {p.name} {p.id === myId && <small>YOU</small>}
                      {p.bot && <small>BOT</small>}
                    </td>
                    <td>{p.kills}</td>
                    <td>{p.deaths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hud?.phase === 'results' && (
              <Button variant="secondary" onClick={leave}>
                <ArrowLeft size={16} /> 로비로
              </Button>
            )}
          </section>
        </div>
      )}
      {menu && screen === 'playing' && (
        <div className="overlay">
          <section className="modal game-menu">
            <button
              className="close-modal"
              aria-label="메뉴 닫기"
              onClick={() => setMenu(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">PIT STOP</span>
            <h2>잠깐, 정비 시간.</h2>
            <p>경기는 계속 진행 중입니다.</p>
            <Button className="play-button" onClick={() => setMenu(false)}>
              계속 플레이 <ArrowUpRight />
            </Button>
            <Button
              variant="secondary"
              onClick={share}
              disabled={code === 'PRACTICE'}
            >
              <Copy size={15} /> 친구 초대 · {code}
            </Button>
            <Button variant="secondary" onClick={() => setHelp(true)}>
              <HelpCircle size={15} /> 조작과 아이템
            </Button>
            <Button variant="ghost" onClick={leave}>
              <ArrowLeft size={15} /> 경기 나가기
            </Button>
          </section>
        </div>
      )}
      {help && (
        <div className="overlay">
          <section className="modal help-modal">
            <button
              className="close-modal"
              aria-label="게임 방법 닫기"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">THE DRIVER’S HANDBOOK</span>
            <h2>줍고. 쏘고. 살아남으세요.</h2>
            <p>
              3분 동안 가장 많은 상대를 처치하면 승리합니다. 파괴되어도 다시
              출발할 수 있습니다.
            </p>
            <div className="key-guide">
              <div>
                <kbd>W / ↑</kbd>전진
              </div>
              <div>
                <kbd>S / ↓</kbd>후진
              </div>
              <div>
                <kbd>A D / ← →</kbd>좌우 조향
              </div>
              <div>
                <kbd>SPACE</kbd>무기 사용
              </div>
              <div>
                <kbd>TAB</kbd>순위표
              </div>
              <div>
                <kbd>ESC</kbd>메뉴
              </div>
            </div>
            <div className="weapons-guide">
              {(Object.keys(WEAPONS) as Weapon[]).map((w) => (
                <article key={w}>
                  <div style={{ color: WEAPONS[w].color }}>
                    <WeaponIcon weapon={w} size={25} />
                  </div>
                  <section>
                    <h3>
                      {WEAPONS[w].name}
                      <span>{WEAPONS[w].en}</span>
                    </h3>
                    <p>{WEAPONS[w].description}</p>
                  </section>
                </article>
              ))}
            </div>
            <p className="source-note">
              공개된 원본 게임 설명과 커뮤니티 자료를 참고한 독립 구현입니다.
              물리·피해량·사거리 일부는 재현을 위한 추정치입니다.{' '}
              <a
                href="https://www.crazygames.com/game/smash-karts"
                target="_blank"
                rel="noreferrer"
              >
                게임 안내 ↗
              </a>
            </p>
          </section>
        </div>
      )}
      {settings && (
        <div className="overlay">
          <section className="modal settings-modal">
            <button
              className="close-modal"
              aria-label="설정 닫기"
              onClick={() => setSettings(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">SETUP</span>
            <h2>게임 설정</h2>
            <label htmlFor="server-address">멀티플레이 서버</label>
            <Input
              id="server-address"
              placeholder="자동 연결 (현재 웹사이트)"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <p>
              서버를 따로 운영하는 경우에만 wss://서버주소/ws를 입력하세요. 같은
              네트워크에서는 실행 중인 게임 주소를 공유하면 됩니다.
            </p>
            <label className="sound-setting">
              <span>게임 사운드</span>
              <Button variant="secondary" onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{' '}
                {muted ? '꺼짐' : '켜짐'}
              </Button>
            </label>
            <Button
              className="play-button"
              onClick={() => {
                try {
                  localStorage.setItem(
                    'kart-preferences',
                    JSON.stringify({ name, color, muted, endpoint }),
                  );
                } catch {}
                setSettings(false);
              }}
            >
              설정 저장 <Check size={17} />
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}
