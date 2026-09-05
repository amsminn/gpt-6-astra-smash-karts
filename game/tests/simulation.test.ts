import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GameRoom,
  WEAPONS,
  MAX_PLAYERS,
  sanitizeInput,
  groundHeight,
  type Player,
  type Weapon,
} from '../game/simulation.ts';
function fixture() {
  const r = new GameRoom('TEST', () => 0.4);
  r.elapsed = 0;
  r.boxes.forEach((b) => (b.ready = Infinity));
  const a = r.addPlayer('a', 'Alpha')!,
    b = r.addPlayer('b', 'Bravo')!;
  Object.assign(a, { x: 10, z: -10, y: 0, angle: 0, shield: 0 });
  Object.assign(b, { x: 10, z: 0, y: 0, angle: Math.PI, shield: 0 });
  return { r, a, b };
}
function advance(r: GameRoom, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 30); i++) r.step();
}
function equip(r: GameRoom, p: Player, w: Weapon) {
  r.giveWeapon(p, w);
  p.cooldown = 0;
}
void test('untrusted input accepts bounded finite controls only', () => {
  assert.deepEqual(
    sanitizeInput({ throttle: Infinity, steer: -999, fire: 'yes', hp: 999 }),
    { throttle: 0, steer: -1, fire: false },
  );
  assert.deepEqual(sanitizeInput(null), { throttle: 0, steer: 0, fire: false });
});
void test('server drives, reverses, and brakes after stale input', () => {
  const { r, a } = fixture();
  r.setInput(a.id, { throttle: 1, steer: 0, fire: false });
  advance(r, 0.4);
  assert.ok(a.z > -10);
  const s = a.speed;
  advance(r, 1);
  assert.ok(a.speed < s / 3);
  r.setInput(a.id, { throttle: -1, steer: 0, fire: false });
  advance(r, 0.4);
  assert.ok(a.speed < 0);
});
void test('boundaries and cover prevent driving through walls', () => {
  const { r, a } = fixture();
  Object.assign(a, { x: 45, z: -10, angle: Math.PI / 2, speed: 23 });
  r.setInput(a.id, { throttle: 1 });
  advance(r, 0.4);
  assert.ok(a.x < 46);
  assert.equal(r.blocked(-21, 0, -16), true);
  assert.equal(r.blocked(-21, 5, -16), false);
});
void test('ramps have matching elevated surface', () => {
  assert.equal(groundHeight(0, 0), 3);
  assert.equal(groundHeight(0, 19), 0);
  assert.ok(groundHeight(0, 12) > 1 && groundHeight(0, 12) < 2);
  assert.equal(groundHeight(10, 0), 0);
});
void test('a room caps capacity at eight and names at sixteen characters', () => {
  const r = new GameRoom();
  for (let i = 0; i < MAX_PLAYERS; i++)
    assert.ok(r.addPlayer(String(i), 'abcdefghijklmnopEXTRA'));
  assert.equal(r.addPlayer('extra', 'Extra'), null);
  assert.equal(r.players.get('0')!.name.length, 16);
});
void test('two direct rockets kill, award one smash, and respawn without losing score', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'rockets');
  r.shoot(a);
  advance(r, 0.3);
  assert.equal(b.hp, 50);
  a.cooldown = 0;
  r.shoot(a);
  advance(r, 0.3);
  assert.equal(b.hp, 0);
  assert.equal(a.kills, 1);
  assert.equal(b.deaths, 1);
  assert.ok(b.respawn > 0);
  advance(r, 2.6);
  assert.equal(b.hp, 100);
  assert.ok(b.shield > 0);
  assert.equal(b.deaths, 1);
});
void test('bullet burst uses three swept projectiles and 7 damage each', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'bullets');
  r.shoot(a);
  assert.equal(r.projectiles.length, 3);
  assert.equal(a.ammo, 8);
  advance(r, 0.2);
  assert.equal(b.hp, 79);
});
void test('fast projectiles cannot tunnel through a kart between ticks', () => {
  const { r, a, b } = fixture();
  Object.assign(b, { z: -6 });
  equip(r, a, 'bullets');
  r.shoot(a);
  r.step(0.1);
  assert.ok(b.hp < 100);
});
void test('spike contact is lethal but does not grant invincibility', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'spiky');
  r.shoot(a);
  assert.equal(a.active, 6);
  Object.assign(b, { z: -7 });
  r.step();
  assert.equal(b.hp, 0);
  r.damage(a, 50, b.id, 'rockets');
  assert.equal(a.hp, 50);
});
void test('star and spawn protection reject all damage and star expires', () => {
  const { r, a, b } = fixture();
  a.shield = 1;
  r.damage(a, 150, b.id, 'nuke');
  assert.equal(a.hp, 100);
  a.shield = 0;
  equip(r, a, 'star');
  r.shoot(a);
  r.damage(a, 150, b.id, 'nuke');
  assert.equal(a.hp, 100);
  advance(r, 5.1);
  assert.equal(a.weapon, null);
  r.damage(a, 50, b.id, 'rockets');
  assert.equal(a.hp, 50);
});
void test('snow freezes for three seconds and collision shatters a frozen kart', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'snow');
  r.shoot(a);
  advance(r, 0.25);
  assert.ok(b.frozen > 2.8);
  assert.equal(b.hp, 93);
  Object.assign(a, { z: b.z - 2, shield: 0 });
  r.step();
  assert.equal(b.hp, 0);
  assert.equal(a.kills, 1);
});
void test('ice disables spikes, and stars resist ice', () => {
  let { r, a, b } = fixture();
  equip(r, b, 'spiky');
  r.shoot(b);
  equip(r, a, 'snow');
  r.shoot(a);
  advance(r, 0.25);
  assert.equal(b.weapon, null);
  assert.ok(b.frozen > 0);
  ({ r, a, b } = fixture());
  equip(r, b, 'star');
  r.shoot(b);
  equip(r, a, 'snow');
  r.shoot(a);
  advance(r, 0.25);
  assert.equal(b.frozen, 0);
  assert.equal(b.hp, 100);
});
void test('machinegun runs continuously for 6.5 seconds with range attenuation', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'machinegun');
  r.shoot(a);
  advance(r, 1);
  assert.ok(a.ammo < 150 && a.ammo > 130);
  assert.ok(b.hp < 100);
  assert.ok(a.active > 5);
  advance(r, 5.6);
  assert.equal(a.weapon, null);
  assert.equal(a.ammo, 0);
});
void test('cover blocks machinegun target acquisition', () => {
  const { r, a, b } = fixture();
  Object.assign(a, { x: -21, z: -23 });
  Object.assign(b, { x: -21, z: -9 });
  equip(r, a, 'machinegun');
  r.shoot(a);
  advance(r, 0.5);
  assert.equal(b.hp, 100);
});
void test('cannon fires four arcing shots and holding extends subsequent range', () => {
  const { r, a } = fixture();
  equip(r, a, 'cannon');
  r.shoot(a);
  const first = r.projectiles[0];
  assert.ok(first.vy > 0);
  a.fireHeld = 1.5;
  a.cooldown = 0;
  r.shoot(a);
  assert.ok(r.projectiles[1].vz > first.vz);
  a.cooldown = 0;
  r.shoot(a);
  a.cooldown = 0;
  r.shoot(a);
  assert.equal(r.projectiles.length, 4);
  assert.equal(a.weapon, null);
});
void test('mines arm behind the kart, cannot kill their owner, and kill enemies', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'mines');
  r.shoot(a);
  const q = r.projectiles[0];
  assert.ok(q.z < a.z);
  Object.assign(b, { x: q.x, z: q.z });
  r.step();
  assert.equal(b.hp, 100);
  advance(r, 0.6);
  assert.equal(b.hp, 0);
  assert.equal(a.hp, 100);
});
void test('fake loot box traps are lethal and single use', () => {
  const { r, a, b } = fixture();
  equip(r, a, 'fake');
  r.shoot(a);
  assert.equal(a.weapon, null);
  const q = r.projectiles[0];
  Object.assign(b, { x: q.x, z: q.z });
  advance(r, 0.6);
  assert.equal(b.hp, 0);
  assert.equal(r.projectiles.length, 0);
});
void test('nuke deals area damage to multiple opponents', () => {
  const { r, a, b } = fixture();
  const c = r.addPlayer('c', 'Charlie')!;
  Object.assign(c, { x: 13, z: 0, y: 0, shield: 0 });
  r.explode(
    {
      id: 99,
      owner: a.id,
      kind: 'nuke',
      x: 10,
      y: 1,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
      age: 0,
      armed: false,
    },
    b,
  );
  assert.equal(b.hp, 0);
  assert.ok(c.hp < 100);
  assert.equal(a.hp, 100);
});
void test('lobgrenuke falls, arms and explodes after its fuse', () => {
  const { r, a } = fixture();
  equip(r, a, 'lobgrenuke');
  r.shoot(a);
  advance(r, 1.4);
  assert.ok(r.projectiles[0]?.armed);
  advance(r, 3.5);
  assert.equal(r.projectiles.length, 0);
  assert.ok(r.events.some((e) => e.kind === 'explosion'));
});
void test('a pickup grants only one weapon and respawns after five seconds', () => {
  const { r, a } = fixture();
  const box = r.boxes[0];
  box.ready = 0;
  Object.assign(a, { x: box.x, z: box.z, y: groundHeight(box.x, box.z) });
  r.step();
  assert.ok(a.weapon);
  assert.ok(box.ready > r.t + 4.9);
  const w = a.weapon;
  r.step();
  assert.equal(a.weapon, w);
});
void test('three minute round freezes score during results and resets cleanly', () => {
  const { r, a } = fixture();
  a.kills = 3;
  r.elapsed = 179.99;
  r.step();
  assert.equal(r.phase, 'results');
  const x = a.x;
  r.setInput(a.id, { throttle: 1, fire: true });
  advance(r, 1);
  assert.equal(a.x, x);
  assert.equal(a.kills, 3);
  advance(r, 9.1);
  assert.equal(r.round, 2);
  assert.equal(r.phase, 'countdown');
  assert.equal(a.kills, 0);
});
void test('bot battles use the same rules and keep bounded finite state', () => {
  const r = new GameRoom();
  r.addBots(8);
  advance(r, 60);
  assert.ok([...r.players.values()].some((p) => p.kills > 0));
  for (const p of r.players.values()) {
    assert.ok(
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
    );
    assert.ok(Math.abs(p.x) < 46 && Math.abs(p.z) < 38);
    assert.ok(p.hp >= 0 && p.hp <= 100);
  }
  assert.ok(r.projectiles.length < 200);
  assert.ok(Object.keys(WEAPONS).length === 11);
});
