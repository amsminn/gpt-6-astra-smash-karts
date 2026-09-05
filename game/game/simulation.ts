/** Shared deterministic rules. The network server is the sole authority in online matches. */
export const TICK_RATE = 30;
export const ROUND_SECONDS = 180;
export const MAX_PLAYERS = 8;
export const ARENA = { x: 46, z: 38 };
export const COLORS = [
  '#d7fa52',
  '#ff7161',
  '#6bcdff',
  '#d695ff',
  '#ffa944',
  '#ff91c4',
  '#6ce7be',
  '#f6f1dc',
];
export const WEAPONS = {
  rockets: {
    name: '로켓',
    en: 'ROCKETS',
    icon: 'rocket',
    ammo: 3,
    color: '#ff8655',
    description: '전방으로 직진하는 로켓 3발. 직격 50 피해와 작은 범위 폭발.',
  },
  bullets: {
    name: '삼연발 탄환',
    en: 'BULLETS',
    icon: 'crosshair',
    ammo: 9,
    color: '#ffe36c',
    description: '3발씩 9회 발사하는 직진 탄환. 총 27발, 발당 7 피해.',
  },
  machinegun: {
    name: '기관총',
    en: 'MACHINE GUN',
    icon: 'scan',
    ammo: 166,
    color: '#d7fa52',
    description:
      '가까운 상대를 자동 추적하며 6.5초 연속 사격. 한번 시작하면 멈출 수 없고, 멀어질수록 피해가 줄어듭니다.',
  },
  cannon: {
    name: '곡사포',
    en: 'CANNONBALLS',
    icon: 'circle',
    ammo: 4,
    color: '#ffc494',
    description:
      '포물선을 그리는 포탄 4발. 직격 시 즉시 처치. Space를 길게 누르면 다음 탄의 사거리가 늘어납니다.',
  },
  mines: {
    name: '지뢰',
    en: 'MINES',
    icon: 'triangle',
    ammo: 3,
    color: '#ff7979',
    description: '카트 뒤에 지뢰 3개를 설치. 상대가 밟으면 폭발하며 즉시 처치.',
  },
  nuke: {
    name: '핵탄두',
    en: 'NUKE',
    icon: 'radiation',
    ammo: 1,
    color: '#ffb74a',
    description:
      '전방으로 거대한 탄두를 발사. 직격과 넓은 폭발 범위로 다수의 상대를 공격.',
  },
  lobgrenuke: {
    name: '폭탄',
    en: 'LOB-GRENUKE',
    icon: 'bomb',
    ammo: 1,
    color: '#fa907a',
    description:
      '앞으로 던지는 근접 감지 폭탄. 상대가 접근하거나 4초가 지나면 폭발.',
  },
  spiky: {
    name: '회전 철퇴',
    en: 'SPIKY-GO-ROUND',
    icon: 'orbit',
    ammo: 1,
    color: '#b9a5ff',
    description:
      '6초 동안 철퇴 5개가 카트 주위를 회전. 닿은 상대를 즉시 처치하지만 공격을 막지는 못합니다.',
  },
  star: {
    name: '무적',
    en: 'INVINCIBILITY',
    icon: 'star',
    ammo: 1,
    color: '#d7fa52',
    description: '5초 동안 모든 피해를 막으며, 부딪힌 상대를 즉시 처치.',
  },
  snow: {
    name: '눈덩이',
    en: 'SNOWBALL BLASTER',
    icon: 'snow',
    ammo: 3,
    color: '#91e9ff',
    description:
      '눈덩이 3발. 맞은 상대를 3초 동안 얼리고, 얼어붙은 카트에 부딪히면 처치.',
  },
  fake: {
    name: '가짜 상자',
    en: 'FAKE LOOT BOX',
    icon: 'box',
    ammo: 1,
    color: '#f58eff',
    description: '아이템 상자처럼 보이는 함정. 상대가 접촉하면 즉시 처치.',
  },
} as const;
export type Weapon = keyof typeof WEAPONS;
export type Input = { throttle: number; steer: number; fire: boolean };
export const NEUTRAL: Input = { throttle: 0, steer: 0, fire: false };
export type Obstacle = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
};
export const OBSTACLES: Obstacle[] = [
  { x: -21, z: -16, w: 10, d: 6, h: 3.6 },
  { x: 21, z: 16, w: 10, d: 6, h: 3.6 },
  { x: 23, z: -16, w: 7, d: 9, h: 3.3 },
  { x: -23, z: 16, w: 7, d: 9, h: 3.3 },
  { x: -37, z: 0, w: 4, d: 10, h: 2.5 },
  { x: 37, z: 0, w: 4, d: 10, h: 2.5 },
];
export const BOX_POSITIONS = [
  [-34, -26],
  [-10, -27],
  [13, -28],
  [35, -26],
  [-33, 27],
  [-12, 27],
  [12, 27],
  [34, 27],
  [-27, -4],
  [27, 4],
  [-13, 7],
  [13, -7],
  [0, 0],
  [0, 14],
  [0, -14],
  [33, 13],
  [-33, -13],
];
const SPAWNS = [
  [-36, -30, 0.7],
  [36, 30, 3.8],
  [36, -30, -0.7],
  [-36, 30, 2.4],
  [-15, -30, 0],
  [15, 30, Math.PI],
  [-31, 8, Math.PI / 2],
  [31, -8, -Math.PI / 2],
];
const LOOT: Weapon[] = [
  'rockets',
  'rockets',
  'rockets',
  'bullets',
  'bullets',
  'machinegun',
  'machinegun',
  'cannon',
  'cannon',
  'mines',
  'mines',
  'nuke',
  'lobgrenuke',
  'snow',
  'spiky',
  'star',
  'fake',
];
export function groundHeight(x: number, z: number) {
  if (Math.abs(x) > 7.5 || Math.abs(z) > 19) return 0;
  return Math.abs(z) <= 6 ? 3 : (3 * (19 - Math.abs(z))) / 13;
}
export function angleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export type Player = {
  id: string;
  name: string;
  color: number;
  bot: boolean;
  x: number;
  y: number;
  z: number;
  angle: number;
  speed: number;
  vy: number;
  hp: number;
  kills: number;
  deaths: number;
  weapon: Weapon | null;
  ammo: number;
  cooldown: number;
  active: number;
  shield: number;
  frozen: number;
  respawn: number;
  input: Input;
  fireHeld: number;
  machineClock: number;
  lastInput: number;
};
export type Projectile = {
  id: number;
  owner: string;
  kind: Weapon;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  age: number;
  armed: boolean;
};
export type GameEvent = {
  id: number;
  t: number;
  kind: 'shot' | 'explosion' | 'hit' | 'smash' | 'pickup' | 'freeze' | 'shield';
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  owner?: string;
  target?: string;
  weapon?: Weapon;
  tx?: number;
  ty?: number;
  tz?: number;
  name?: string;
  victim?: string;
};
export type Snapshot = {
  code: string;
  t: number;
  remaining: number;
  phase: 'countdown' | 'playing' | 'results';
  round: number;
  players: Player[];
  projectiles: Projectile[];
  boxes: { id: number; x: number; z: number; ready: number }[];
  events: GameEvent[];
};
export function sanitizeInput(value: unknown): Input {
  const v = value && typeof value === 'object' ? (value as Partial<Input>) : {};
  return {
    throttle:
      typeof v.throttle === 'number' && Number.isFinite(v.throttle)
        ? clamp(v.throttle, -1, 1)
        : 0,
    steer:
      typeof v.steer === 'number' && Number.isFinite(v.steer)
        ? clamp(v.steer, -1, 1)
        : 0,
    fire: v.fire === true,
  };
}
export class GameRoom {
  code: string;
  players = new Map<string, Player>();
  projectiles: Projectile[] = [];
  events: GameEvent[] = [];
  boxes = BOX_POSITIONS.map(([x, z], id) => ({ id, x, z, ready: 0 }));
  t = 0;
  elapsed = -3;
  round = 1;
  serial = 0;
  random: () => number;
  constructor(code = 'PRACTICE', random: () => number = Math.random) {
    this.code = code;
    this.random = random;
  }
  get phase(): Snapshot['phase'] {
    return this.elapsed < 0
      ? 'countdown'
      : this.elapsed >= ROUND_SECONDS
        ? 'results'
        : 'playing';
  }
  addPlayer(id: string, name: string, color = 0, bot = false) {
    if (this.players.size >= MAX_PLAYERS) return null;
    const p: Player = {
      id,
      name: name.trim().slice(0, 16) || 'Driver',
      color: clamp(Math.floor(color) || 0, 0, 7),
      bot,
      x: 0,
      y: 0,
      z: 0,
      angle: 0,
      speed: 0,
      vy: 0,
      hp: 100,
      kills: 0,
      deaths: 0,
      weapon: null,
      ammo: 0,
      cooldown: 0,
      active: 0,
      shield: 2,
      frozen: 0,
      respawn: 0,
      input: { ...NEUTRAL },
      fireHeld: 0,
      machineClock: 0,
      lastInput: this.t,
    };
    this.players.set(id, p);
    this.spawn(p);
    return p;
  }
  spawn(p: Player) {
    const choices = SPAWNS.map((s) => ({
      s,
      clear: Math.min(
        999,
        ...[...this.players.values()]
          .filter((q) => q.id !== p.id && q.respawn <= 0)
          .map((q) => Math.hypot(q.x - s[0], q.z - s[1])),
      ),
    }));
    choices.sort((a, b) => b.clear - a.clear);
    const s =
      choices[Math.floor(this.random() * Math.min(3, choices.length))].s;
    Object.assign(p, {
      x: s[0],
      z: s[1],
      y: 0,
      angle: s[2],
      speed: 0,
      vy: 0,
      hp: 100,
      weapon: null,
      ammo: 0,
      active: 0,
      shield: 2,
      frozen: 0,
      respawn: 0,
      cooldown: 0,
      fireHeld: 0,
      machineClock: 0,
    });
  }
  addBots(total = 4) {
    const names = [
      'Bolt',
      'Miso',
      'Turbo',
      'Mochi',
      'Blaze',
      'Pixel',
      'Rocket',
    ];
    for (let i = 0; this.players.size < Math.min(total, 8); i++) {
      const id = `bot-${++this.serial}`;
      this.addPlayer(id, names[i % names.length], (i + 1) % 8, true);
    }
  }
  setInput(id: string, input: unknown) {
    const p = this.players.get(id);
    if (p && !p.bot) {
      p.input = sanitizeInput(input);
      p.lastInput = this.t;
    }
  }
  emit(e: Omit<GameEvent, 'id' | 't'>) {
    this.events.push({ ...e, id: ++this.serial, t: this.t });
  }
  giveWeapon(p: Player, w: Weapon) {
    p.weapon = w;
    p.ammo = WEAPONS[w].ammo;
    p.cooldown = 0.25;
    p.active = 0;
    p.machineClock = 0;
  }
  damage(target: Player, amount: number, owner: string, weapon: Weapon) {
    if (
      target.respawn > 0 ||
      target.shield > 0 ||
      (target.weapon === 'star' && target.active > 0) ||
      target.id === owner
    )
      return;
    target.hp = Math.max(0, target.hp - amount);
    this.emit({
      kind: 'hit',
      x: target.x,
      y: target.y + 1,
      z: target.z,
      color: WEAPONS[weapon].color,
      size: amount / 35,
      owner,
      target: target.id,
      weapon,
    });
    if (target.hp <= 0) {
      const killer = this.players.get(owner);
      if (killer) killer.kills++;
      target.deaths++;
      target.respawn = 2.5;
      target.speed = 0;
      target.active = 0;
      target.frozen = 0;
      target.weapon = null;
      target.ammo = 0;
      this.emit({
        kind: 'smash',
        x: target.x,
        y: target.y + 1,
        z: target.z,
        color: COLORS[target.color],
        size: 5,
        owner,
        target: target.id,
        weapon,
        name: killer?.name ?? 'Arena',
        victim: target.name,
      });
    }
  }
  blocked(x: number, y: number, z: number, r = 0) {
    return (
      Math.abs(x) > ARENA.x - r ||
      Math.abs(z) > ARENA.z - r ||
      OBSTACLES.some(
        (o) =>
          y < o.h &&
          Math.abs(x - o.x) < o.w / 2 + r &&
          Math.abs(z - o.z) < o.d / 2 + r,
      )
    );
  }
  lineClear(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (
        this.blocked(
          a.x + (b.x - a.x) * t,
          a.y + (b.y - a.y) * t + 0.8,
          a.z + (b.z - a.z) * t,
        )
      )
        return false;
    }
    return true;
  }
  explode(q: Projectile, direct?: Player) {
    const radius =
      q.kind === 'nuke'
        ? 10
        : q.kind === 'lobgrenuke'
          ? 7
          : q.kind === 'cannon'
            ? 5
            : 3.5;
    this.emit({
      kind: 'explosion',
      x: q.x,
      y: q.y,
      z: q.z,
      color: WEAPONS[q.kind].color,
      size: radius,
      owner: q.owner,
      weapon: q.kind,
    });
    for (const p of this.players.values()) {
      const dist = Math.hypot(p.x - q.x, p.z - q.z, p.y + 0.7 - q.y);
      if (p === direct) {
        this.damage(p, q.kind === 'rockets' ? 50 : 150, q.owner, q.kind);
        continue;
      }
      if (dist < radius && this.lineClear(q, p)) {
        const max =
          q.kind === 'nuke'
            ? 150
            : q.kind === 'lobgrenuke'
              ? 120
              : q.kind === 'cannon'
                ? 45
                : 25;
        this.damage(p, max * (1 - dist / radius), q.owner, q.kind);
      }
    }
  }
  shoot(p: Player) {
    const w = p.weapon;
    if (!w || p.cooldown > 0 || p.ammo <= 0 || p.frozen > 0) return;
    if (w === 'star' || w === 'spiky') {
      if (p.active <= 0) {
        p.active = w === 'star' ? 5 : 6;
        p.ammo = 0;
        this.emit({
          kind: 'shield',
          x: p.x,
          y: p.y + 1,
          z: p.z,
          color: WEAPONS[w].color,
          size: 4,
          owner: p.id,
          weapon: w,
        });
      }
      return;
    }
    if (w === 'machinegun') {
      if (p.active <= 0) {
        p.active = 6.5;
        p.machineClock = 0;
      }
      return;
    }
    p.ammo--;
    p.cooldown =
      w === 'bullets'
        ? 0.22
        : w === 'snow'
          ? 0.3
          : w === 'cannon'
            ? 0.42
            : 0.35;
    const count = w === 'bullets' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const a = p.angle + (w === 'bullets' ? (i - 1) * 0.035 : 0),
        dx = Math.sin(a),
        dz = Math.cos(a);
      let speed =
        w === 'bullets'
          ? 70
          : w === 'rockets'
            ? 43
            : w === 'nuke'
              ? 30
              : w === 'snow'
                ? 40
                : 22;
      if (w === 'cannon') speed = 17 + Math.min(p.fireHeld, 1.7) * 9;
      const dropped = w === 'mines' || w === 'fake';
      if (dropped) speed = 0;
      const distance = dropped ? -2.5 : 2.3;
      const q: Projectile = {
        id: ++this.serial,
        owner: p.id,
        kind: w,
        x: p.x + dx * distance,
        y: p.y + 1,
        z: p.z + dz * distance,
        vx: dx * speed,
        vy: w === 'cannon' ? 12 : w === 'lobgrenuke' ? 9 : 0,
        vz: dz * speed,
        life: dropped ? 30 : w === 'lobgrenuke' ? 4.8 : w === 'snow' ? 1.5 : 3,
        age: 0,
        armed: false,
      };
      if (dropped) q.y = groundHeight(q.x, q.z) + 0.25;
      this.projectiles.push(q);
      this.emit({
        kind: 'shot',
        x: q.x,
        y: q.y,
        z: q.z,
        color: WEAPONS[w].color,
        size: w === 'bullets' ? 0.6 : 1.3,
        owner: p.id,
        weapon: w,
      });
    }
    if (p.ammo <= 0) p.weapon = null;
  }
  botInput(p: Player): Input {
    const enemies = [...this.players.values()].filter(
      (q) => q.id !== p.id && q.respawn <= 0,
    );
    let target: { x: number; z: number } | undefined;
    if (!p.weapon)
      target = this.boxes
        .filter((b) => b.ready <= this.t)
        .sort(
          (a, b) =>
            Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z),
        )[0];
    else
      target = enemies.sort(
        (a, b) =>
          Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z),
      )[0];
    target ??= { x: 0, z: 25 };
    let desired = Math.atan2(target.x - p.x, target.z - p.z);
    const look = 6;
    if (
      this.blocked(
        p.x + Math.sin(p.angle) * look,
        p.y,
        p.z + Math.cos(p.angle) * look,
        1.5,
      )
    )
      desired = p.angle + 1.6;
    const delta = angleDiff(desired, p.angle),
      dist = Math.hypot(p.x - target.x, p.z - target.z);
    return {
      throttle: 1,
      steer: clamp(delta * 1.5, -1, 1),
      fire:
        !!p.weapon &&
        (p.weapon === 'mines' ||
          p.weapon === 'fake' ||
          (dist < 27 && Math.abs(delta) < 0.45) ||
          (p.weapon === 'machinegun' && dist < 16) ||
          (p.weapon === 'star' && dist < 13) ||
          (p.weapon === 'spiky' && dist < 13)),
    };
  }
  step(dt = 1 / TICK_RATE) {
    dt = clamp(dt, 0, 0.1);
    this.t += dt;
    this.elapsed += dt;
    this.events = this.events.filter((e) => this.t - e.t < 1.1);
    if (this.elapsed > ROUND_SECONDS + 10) {
      this.elapsed = -3;
      this.round++;
      this.projectiles = [];
      this.events = [];
      this.boxes.forEach((b) => (b.ready = 0));
      for (const p of this.players.values()) {
        p.kills = 0;
        p.deaths = 0;
        this.spawn(p);
      }
    }
    if (this.phase !== 'playing') return;
    for (const p of this.players.values()) {
      if (p.respawn > 0) {
        p.respawn -= dt;
        if (p.respawn <= 0) this.spawn(p);
        continue;
      }
      p.shield = Math.max(0, p.shield - dt);
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.frozen = Math.max(0, p.frozen - dt);
      const input = p.bot
        ? this.botInput(p)
        : this.t - p.lastInput > 0.5
          ? NEUTRAL
          : p.input;
      p.fireHeld = input.fire ? p.fireHeld + dt : 0;
      if (p.frozen <= 0) {
        const target = input.throttle * (input.throttle >= 0 ? 23 : 11);
        p.speed +=
          (target - p.speed) * Math.min(1, dt * (input.throttle ? 2.8 : 4));
        p.angle +=
          input.steer *
          2.5 *
          clamp(Math.abs(p.speed) / 7, 0, 1) *
          Math.sign(p.speed || 1) *
          dt;
        const dx = Math.sin(p.angle) * p.speed * dt,
          dz = Math.cos(p.angle) * p.speed * dt;
        if (!this.blocked(p.x + dx, p.y, p.z, 1.1)) p.x += dx;
        else p.speed *= 0.5;
        if (!this.blocked(p.x, p.y, p.z + dz, 1.1)) p.z += dz;
        else p.speed *= 0.5;
        const ground = groundHeight(p.x, p.z);
        p.vy -= 24 * dt;
        p.y += p.vy * dt;
        if (p.y <= ground) {
          p.y = ground;
          p.vy = 0;
        }
      } else p.speed = 0;
      if (p.active > 0) {
        p.active = Math.max(0, p.active - dt);
        if (p.weapon === 'machinegun') {
          p.machineClock -= dt;
          while (p.machineClock <= 0 && p.ammo > 0) {
            p.machineClock += 6.5 / 166;
            p.ammo--;
            const targets = [...this.players.values()]
              .filter(
                (q) =>
                  q.id !== p.id &&
                  q.respawn <= 0 &&
                  Math.hypot(q.x - p.x, q.z - p.z) < 17 &&
                  this.lineClear(p, q),
              )
              .sort(
                (a, b) =>
                  Math.hypot(a.x - p.x, a.z - p.z) -
                  Math.hypot(b.x - p.x, b.z - p.z),
              );
            const target = targets[0];
            const dx = Math.sin(p.angle),
              dz = Math.cos(p.angle);
            this.emit({
              kind: 'shot',
              x: p.x + dx * 1.8,
              y: p.y + 1.3,
              z: p.z + dz * 1.8,
              color: '#edff86',
              size: 0.4,
              owner: p.id,
              weapon: 'machinegun',
              tx: target?.x ?? p.x + dx * 15,
              ty: (target?.y ?? p.y) + 1,
              tz: target?.z ?? p.z + dz * 15,
            });
            if (target)
              this.damage(
                target,
                1.25 *
                  clamp(
                    1 - Math.hypot(target.x - p.x, target.z - p.z) / 22,
                    0.2,
                    1,
                  ),
                p.id,
                'machinegun',
              );
          }
        }
        if (p.active === 0 || (p.weapon === 'machinegun' && p.ammo === 0)) {
          p.active = 0;
          p.weapon = null;
          p.ammo = 0;
        }
      }
      if (input.fire) this.shoot(p);
      if (!p.weapon) {
        const b = this.boxes.find(
          (b) =>
            b.ready <= this.t &&
            Math.hypot(b.x - p.x, b.z - p.z) < 2 &&
            Math.abs(groundHeight(b.x, b.z) - p.y) < 1.5,
        );
        if (b) {
          b.ready = this.t + 5;
          const w = LOOT[Math.floor(this.random() * LOOT.length)];
          this.giveWeapon(p, w);
          this.emit({
            kind: 'pickup',
            x: p.x,
            y: p.y + 1,
            z: p.z,
            color: WEAPONS[w].color,
            size: 1,
            owner: p.id,
            weapon: w,
          });
        }
      }
    }
    const alive = [...this.players.values()].filter((p) => p.respawn <= 0);
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i],
          b = alive[j];
        if (a.respawn > 0 || b.respawn > 0) continue;
        const dist = Math.hypot(a.x - b.x, a.z - b.z);
        if (Math.abs(a.y - b.y) > 2) continue;
        if (dist < 4.4) {
          if (a.weapon === 'spiky' && a.active > 0)
            this.damage(b, 150, a.id, 'spiky');
          if (b.weapon === 'spiky' && b.active > 0)
            this.damage(a, 150, b.id, 'spiky');
        }
        if (dist < 2.4) {
          if (a.weapon === 'star' && a.active > 0)
            this.damage(b, 150, a.id, 'star');
          if (b.weapon === 'star' && b.active > 0)
            this.damage(a, 150, b.id, 'star');
          if (a.frozen > 0) this.damage(a, 150, b.id, 'snow');
          if (b.frozen > 0) this.damage(b, 150, a.id, 'snow');
          const angle = Math.atan2(a.x - b.x, a.z - b.z),
            push = (2.4 - dist) / 2;
          for (const [p, dir] of [
            [a, 1],
            [b, -1],
          ] as const) {
            const x = p.x + Math.sin(angle) * push * dir,
              z = p.z + Math.cos(angle) * push * dir;
            if (!this.blocked(x, p.y, z, 1.1)) {
              p.x = x;
              p.z = z;
            }
          }
        }
      }
    this.stepProjectiles(dt);
  }
  stepProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter((q) => {
      q.life -= dt;
      q.age += dt;
      const lob = q.kind === 'cannon' || q.kind === 'lobgrenuke',
        drop = q.kind === 'mines' || q.kind === 'fake';
      if (q.life <= 0) {
        if (
          q.kind === 'lobgrenuke' ||
          q.kind === 'nuke' ||
          q.kind === 'rockets'
        )
          this.explode(q);
        return false;
      }
      if (lob && !q.armed) q.vy -= 18 * dt;
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(q.vx * dt, q.vz * dt) / 0.6),
      );
      for (let i = 0; i < steps; i++) {
        q.x += (q.vx * dt) / steps;
        q.z += (q.vz * dt) / steps;
        q.y += (q.vy * dt) / steps;
        const ground = groundHeight(q.x, q.z);
        if (
          q.kind === 'lobgrenuke' &&
          (q.y <= ground + 0.35 || this.blocked(q.x, q.y, q.z))
        ) {
          q.y = Math.max(ground + 0.35, q.y);
          q.vx = q.vy = q.vz = 0;
          q.armed = true;
        }
        if (
          !drop &&
          q.kind !== 'lobgrenuke' &&
          (this.blocked(q.x, q.y, q.z) || q.y < ground + 0.1)
        ) {
          if (['rockets', 'nuke', 'cannon'].includes(q.kind)) this.explode(q);
          else
            this.emit({
              kind: 'hit',
              x: q.x,
              y: q.y,
              z: q.z,
              color: WEAPONS[q.kind].color,
              size: 0.5,
              weapon: q.kind,
            });
          return false;
        }
        for (const p of this.players.values()) {
          if (p.id === q.owner || p.respawn > 0) continue;
          const distance = Math.hypot(p.x - q.x, p.z - q.z, p.y + 0.75 - q.y);
          const radius =
            q.kind === 'lobgrenuke' && q.armed ? 3 : drop ? 1.6 : 1.4;
          if (distance > radius || (drop && q.age < 0.5)) continue;
          if (q.kind === 'snow') {
            if (p.shield <= 0 && !(p.weapon === 'star' && p.active > 0)) {
              p.frozen = 3;
              if (p.weapon === 'spiky') {
                p.active = 0;
                p.weapon = null;
                p.ammo = 0;
              }
              this.damage(p, 7, q.owner, 'snow');
              this.emit({
                kind: 'freeze',
                x: p.x,
                y: p.y + 1,
                z: p.z,
                color: '#a9f4ff',
                size: 2,
                owner: q.owner,
                target: p.id,
                weapon: 'snow',
              });
            }
            return false;
          }
          if (q.kind === 'bullets') {
            this.damage(p, 7, q.owner, q.kind);
            return false;
          }
          if (drop) {
            this.damage(p, 150, q.owner, q.kind);
            this.emit({
              kind: 'explosion',
              x: q.x,
              y: q.y,
              z: q.z,
              color: WEAPONS[q.kind].color,
              size: 3,
              owner: q.owner,
              weapon: q.kind,
            });
            return false;
          }
          this.explode(q, p);
          return false;
        }
      }
      return Math.abs(q.x) < ARENA.x + 3 && Math.abs(q.z) < ARENA.z + 3;
    });
  }
  snapshot(): Snapshot {
    return {
      code: this.code,
      t: this.t,
      remaining:
        this.phase === 'countdown'
          ? -this.elapsed
          : this.phase === 'results'
            ? ROUND_SECONDS + 10 - this.elapsed
            : ROUND_SECONDS - this.elapsed,
      phase: this.phase,
      round: this.round,
      players: [...this.players.values()].map((p) => ({
        ...p,
        input: { ...p.input },
      })),
      projectiles: this.projectiles.map((q) => ({ ...q })),
      boxes: this.boxes.map((b) => ({ ...b })),
      events: this.events.map((e) => ({ ...e })),
    };
  }
}
