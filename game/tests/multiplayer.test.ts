import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { WebSocket } from 'ws';
import type { Snapshot } from '../game/simulation.ts';
import { setTimeout as delay } from 'node:timers/promises';
const port = 3197;
type Message = {
  type: string;
  id: string;
  code: string;
  token: string;
  state: Snapshot;
  message: string;
};
class Client {
  ws: WebSocket;
  messages: Message[] = [];
  constructor() {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
      origin: `http://127.0.0.1:${port}`,
    });
    this.ws.on('message', (s) =>
      this.messages.push(
        JSON.parse(
          (Buffer.isBuffer(s)
            ? s
            : Array.isArray(s)
              ? Buffer.concat(s)
              : Buffer.from(s)
          ).toString('utf8'),
        ),
      ),
    );
  }
  async wait(type: string, predicate: (m: Message) => boolean = () => true) {
    const start = Date.now();
    while (Date.now() - start < 7000) {
      const i = this.messages.findIndex((m) => m.type === type && predicate(m));
      if (i >= 0) return this.messages.splice(i, 1)[0];
      await delay(10);
    }
    throw Error(`Timed out waiting for ${type}`);
  }
  send(m: unknown) {
    this.ws.send(JSON.stringify(m));
  }
  async hello() {
    await this.wait('hello');
  }
  close() {
    this.ws.close();
  }
}
void test('real WebSocket clients share rooms, movement and resumption; isolated rooms stay private', async () => {
  let child: ChildProcess | undefined;
  const all: Client[] = [];
  try {
    child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout?.on('data', (d) => (output += d));
    child.stderr?.on('data', (d) => (output += d));
    for (let i = 0; i < 100 && !output.includes('listening'); i++) {
      if (child.exitCode !== null) throw Error(output);
      await delay(30);
    }
    assert.match(output, /listening/);
    const a = new Client(),
      b = new Client(),
      c = new Client();
    all.push(a, b, c);
    await Promise.all([a.hello(), b.hello(), c.hello()]);
    a.send({
      type: 'join',
      action: 'create',
      name: 'Alpha',
      color: 0,
      bots: false,
    });
    const aj = await a.wait('joined');
    assert.match(aj.code, /^[A-F0-9]{6}$/);
    b.send({
      type: 'join',
      action: 'join',
      name: 'Bravo',
      color: 1,
      code: aj.code,
    });
    const bj = await b.wait('joined');
    assert.equal(bj.code, aj.code);
    c.send({
      type: 'join',
      action: 'create',
      name: 'Isolated',
      color: 2,
      bots: false,
    });
    const cj = await c.wait('joined');
    assert.notEqual(cj.code, aj.code);
    const shared = await b.wait('state', (m) => m.state.players.length === 2);
    assert.ok(shared.state.players.some((p) => p.id === aj.id));
    const isolated = await c.wait('state');
    assert.equal(isolated.state.players.length, 1);
    const playing = await a.wait('state', (m) => m.state.phase === 'playing');
    const before = playing.state.players.find((p) => p.id === aj.id);
    assert.ok(before);
    a.messages = [];
    b.messages = [];
    for (let i = 0; i < 12; i++) {
      a.send({
        type: 'input',
        input: { throttle: 1, steer: 0, fire: false, hp: 999, kills: 100 },
      });
      await delay(33);
    }
    const moved = await b.wait('state', (m) => {
      const p = m.state.players.find((q) => q.id === aj.id);
      return !!p && Math.hypot(p.x - before.x, p.z - before.z) > 0.5;
    });
    const ap = moved.state.players.find((p) => p.id === aj.id);
    assert.ok(ap);
    assert.equal(ap.hp, 100);
    assert.equal(ap.kills, 0);
    a.ws.terminate();
    await delay(100);
    const resumed = new Client();
    all.push(resumed);
    await resumed.hello();
    resumed.send({ type: 'resume', token: aj.token });
    const rj = await resumed.wait('joined');
    assert.equal(rj.id, aj.id);
    assert.equal(rj.code, aj.code);
    const bad = new Client();
    all.push(bad);
    await bad.hello();
    bad.send({ type: 'join', action: 'join', name: 'Missing', code: '000000' });
    assert.match((await bad.wait('error')).message, /방을 찾을/);
    resumed.send({ type: 'leave' });
    const left = await b.wait(
      'state',
      (m) => !m.state.players.some((p) => p.id === aj.id),
    );
    assert.equal(left.state.players.length, 1);
  } finally {
    all.forEach((c) => c.close());
    child?.kill('SIGTERM');
    if (child)
      await new Promise<void>((resolve) => {
        if (child!.exitCode !== null) resolve();
        else child!.once('exit', () => resolve());
      });
  }
});
