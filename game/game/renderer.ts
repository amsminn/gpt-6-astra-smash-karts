import * as THREE from 'three';
import {
  COLORS,
  OBSTACLES,
  BOX_POSITIONS,
  WEAPONS,
  groundHeight,
  angleDiff,
  type Snapshot,
  type Player,
  type Projectile,
  type GameEvent,
} from './simulation';
import { GameAudio } from './audio';
type Kart = {
  group: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Mesh[];
  shield: THREE.Mesh;
  ice: THREE.Mesh;
  spikes: THREE.Group;
  label: THREE.Sprite;
  weapon: THREE.Group;
  lastWeapon: string | null;
};
type Particle = {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  ring?: boolean;
};
export class ArenaRenderer {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(57, 1, 0.1, 350);
  renderer: THREE.WebGLRenderer;
  karts = new Map<string, Kart>();
  shots = new Map<number, THREE.Object3D>();
  boxes: THREE.Group[] = [];
  particles: Particle[] = [];
  state: Snapshot | null = null;
  myId = '';
  demo = true;
  selectedColor = 0;
  audio = new GameAudio();
  seen = new Set<number>();
  lastRound = 0;
  lastStateAt = 0;
  shake = 0;
  frame = 0;
  last = 0;
  clock = 0;
  resizeObserver: ResizeObserver;
  disposed = false;
  materials = new Map<string, THREE.MeshStandardMaterial>();
  textures: THREE.Texture[] = [];
  particleGeometry = new THREE.IcosahedronGeometry(1, 0);
  ringGeometry = new THREE.TorusGeometry(1, 0.025, 4, 48);
  glowTexture: THREE.CanvasTexture;
  constructor(
    public element: HTMLElement,
    public onError: (message: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '실시간 3D 카트 배틀 아레나',
    );
    this.element.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.contextLost,
    );
    this.glowTexture = this.glow();
    this.makeWorld();
    this.camera.position.set(54, 42, 62);
    this.camera.lookAt(0, 0, 0);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(element);
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }
  contextLost = (e: Event) => {
    e.preventDefault();
    this.onError('3D 그래픽 연결이 끊겼습니다. 페이지를 새로고침해 주세요.');
  };
  resize = () => {
    const w = this.element.clientWidth,
      h = this.element.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
  mat(color: string, metalness = 0.05, emissive = false) {
    const key = color + metalness + emissive;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.65,
          metalness,
          emissive: emissive ? color : '#000000',
          emissiveIntensity: emissive ? 1.4 : 0,
        }),
      );
    return this.materials.get(key)!;
  }
  box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
  ) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  sphere(
    parent: THREE.Object3D,
    r: number,
    x: number,
    y: number,
    z: number,
    color: string,
  ) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 12),
      this.mat(color),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  cylinder(
    parent: THREE.Object3D,
    r1: number,
    r2: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color: string,
    segments = 12,
  ) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r2, h, segments),
      this.mat(color),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  label(text: string, color = '#ffffff', width = 512, height = 128) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#111a26e8';
    ctx.beginPath();
    ctx.roundRect(4, 4, width - 8, height - 8, 24);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = `900 ${height * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height * 0.52, width - 35);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(t);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: t, depthTest: false }),
    );
    s.scale.set(5, (5 * height) / width, 1);
    return s;
  }
  glow() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!,
      g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.15, '#ffffffd0');
    g.addColorStop(0.4, '#ffffff40');
    g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    this.textures.push(t);
    return t;
  }
  glowSprite(color: string, size: number) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    s.scale.setScalar(size);
    return s;
  }
  makeWorld() {
    this.scene.background = new THREE.Color('#dcaf89');
    this.scene.fog = new THREE.Fog('#d5ae91', 100, 225);
    this.scene.add(new THREE.HemisphereLight('#c8e5ff', '#735543', 2.3));
    const sun = new THREE.DirectionalLight('#ffdfae', 3.4);
    sun.position.set(-30, 60, -25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -65,
      right: 65,
      top: 55,
      bottom: -55,
      near: 1,
      far: 170,
    });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    this.box(this.scene, 400, 0.7, 400, 0, -1.1, 0, '#b88762');
    this.box(this.scene, 98, 1, 82, 0, -0.45, 0, '#37404a');
    this.box(this.scene, 92, 0.14, 76, 0, 0.02, 0, '#5e6770');
    // Tarmac lanes and a broad raised central crossing with driveable slopes.
    for (const z of [-31, 31])
      for (let x = -42; x < 44; x += 7)
        this.box(this.scene, 3.5, 0.02, 0.24, x, 0.11, z, '#c4c1a7');
    for (const x of [-40, 40])
      for (let z = -26; z < 29; z += 7)
        this.box(this.scene, 0.24, 0.02, 3.5, x, 0.11, z, '#c4c1a7');
    this.box(this.scene, 15, 3, 12, 0, 1.5, 0, '#444f5a');
    this.box(this.scene, 15, 0.05, 12, 0, 3.02, 0, '#6c7680');
    for (const side of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -7.5,
        0,
        19 * side,
        7.5,
        0,
        19 * side,
        -7.5,
        3,
        6 * side,
        7.5,
        0,
        19 * side,
        7.5,
        3,
        6 * side,
        -7.5,
        3,
        6 * side,
      ]);
      g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      g.computeVertexNormals();
      const ramp = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
          color: '#737c85',
          side: THREE.DoubleSide,
          roughness: 0.85,
        }),
      );
      ramp.receiveShadow = true;
      this.scene.add(ramp);
      for (let z = 8; z <= 17; z += 2.5)
        for (const x of [-6.8, 6.8])
          this.box(
            this.scene,
            0.3,
            0.05,
            1.25,
            x,
            groundHeight(x, z * side) + 0.07,
            z * side,
            '#d7fa52',
          );
    }
    for (let x = -46; x <= 46; x += 4) {
      for (const z of [-39, 39]) {
        this.box(
          this.scene,
          3.85,
          1.4,
          1,
          x,
          0.7,
          z,
          Math.round(x / 4) % 2 === 0 ? '#e8ca64' : '#343c45',
        );
      }
    }
    for (let z = -35; z <= 35; z += 4) {
      for (const x of [-47, 47])
        this.box(
          this.scene,
          1,
          1.4,
          3.85,
          x,
          0.7,
          z,
          Math.round(z / 4) % 2 === 0 ? '#e8ca64' : '#343c45',
        );
    }
    for (const o of OBSTACLES) {
      const col = o.x * o.z > 0 ? '#b7674a' : '#5f8e91';
      this.box(this.scene, o.w, o.h, o.d, o.x, o.h / 2, o.z, col);
      this.box(
        this.scene,
        o.w + 0.2,
        0.18,
        o.d + 0.2,
        o.x,
        o.h,
        o.z,
        '#263c46',
      );
      for (let i = -o.w / 2 + 0.5; i < o.w / 2; i += 1)
        this.box(
          this.scene,
          0.06,
          o.h - 0.4,
          o.d + 0.06,
          o.x + i,
          o.h / 2,
          o.z,
          '#ffffff',
        );
      const sign = this.label(
        o.x * o.z > 0 ? 'ARENA 01' : 'SMASH',
        o.x * o.z > 0 ? '#ffe6b3' : '#b9fcfc',
      );
      sign.position.set(o.x, o.h + 0.75, o.z);
      sign.scale.set(4, 1, 1);
      this.scene.add(sign);
    }
    for (const [x, z] of [
      [-48, -40],
      [48, 40],
      [48, -40],
      [-48, 40],
    ]) {
      this.cylinder(this.scene, 0.22, 0.4, 14, x, 7, z, '#33434f');
      const lamp = this.box(this.scene, 4, 1, 1, x, 14, z, '#e9e4bb');
      lamp.material = this.mat('#fff8d4', 0, true);
    }
    const board = this.label('SUNSET CIRCUIT', '#d7fa52', 1024, 180);
    board.position.set(0, 12, -45);
    board.scale.set(29, 5, 1);
    this.scene.add(board);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2,
        r = 90 + (i % 3) * 8,
        h = 12 + (i % 5) * 6;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(13 + (i % 4) * 3, h, 5),
        this.mat(i % 2 ? '#aa7c61' : '#c0926f'),
      );
      m.position.set(Math.sin(a) * r, h / 2 - 1, Math.cos(a) * r);
      m.rotation.y = i;
      this.scene.add(m);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        x = Math.sin(a) * 62,
        z = Math.cos(a) * 54;
      const trunk = this.cylinder(this.scene, 0.4, 0.7, 5, x, 2, z, '#6f5945');
      trunk.rotation.z = 0.12;
      for (let j = 0; j < 4; j++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(1.8, 5, 4),
          this.mat('#687757'),
        );
        leaf.position.set(
          x + Math.sin(j * 1.57) * 1.7,
          4.7,
          z + Math.cos(j * 1.57) * 1.7,
        );
        leaf.rotation.z = 0.9;
        leaf.rotation.y = j * 1.57;
        this.scene.add(leaf);
      }
    }
    BOX_POSITIONS.forEach(([x, z]) => {
      const g = this.lootBox();
      g.position.set(x, groundHeight(x, z) + 1.35, z);
      this.scene.add(g);
      this.boxes.push(g);
    });
  }
  lootBox() {
    const g = new THREE.Group();
    const cube = this.box(g, 1.65, 1.65, 1.65, 0, 0, 0, '#d7fa52');
    cube.material = this.mat('#bacf46', 0.2);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cube.geometry),
      new THREE.LineBasicMaterial({ color: '#f7ffc1' }),
    );
    cube.add(edges);
    const label = this.label('?', '#fffaca', 128, 128);
    label.material.depthTest = true;
    label.scale.set(1.35, 1.35, 1);
    label.position.y = 0.05;
    g.add(label);
    const halo = this.glowSprite('#dafc74', 3);
    g.add(halo);
    return g;
  }
  makeKart(p: Player) {
    const group = new THREE.Group(),
      body = new THREE.Group();
    group.add(body);
    const col = COLORS[p.color];
    this.box(body, 2.0, 0.32, 3.1, 0, 0.56, 0, '#212a35');
    this.box(body, 1.8, 0.46, 2.6, 0, 0.83, 0.2, col);
    this.box(body, 1.35, 0.3, 1, 0, 1.08, 1, col);
    this.box(body, 0.25, 0.035, 1.3, 0, 1.25, 1, '#f5f6df');
    this.box(body, 2.25, 0.17, 0.35, 0, 0.5, 1.7, '#c6cdd1');
    this.box(body, 1.9, 0.2, 0.27, 0, 0.55, -1.5, '#323d48');
    this.box(body, 0.15, 0.68, 0.15, -0.75, 1.15, -1.25, '#333b46');
    this.box(body, 0.15, 0.68, 0.15, 0.75, 1.15, -1.25, '#333b46');
    this.box(body, 2.3, 0.17, 0.55, 0, 1.5, -1.25, col);
    this.box(body, 1.1, 0.85, 0.42, 0, 1.12, -0.4, '#253240');
    const torso = this.sphere(body, 0.48, 0, 1.45, -0.25, '#f8e6d2');
    torso.scale.set(0.9, 1.1, 0.8);
    const helmet = this.sphere(body, 0.65, 0, 2.15, -0.2, col);
    helmet.scale.set(1, 0.96, 0.98);
    const visor = this.sphere(body, 0.53, 0, 2.16, 0.11, '#142933');
    visor.scale.set(0.96, 0.57, 0.75);
    const shine = this.box(
      body,
      0.48,
      0.065,
      0.03,
      -0.13,
      2.29,
      0.52,
      '#99d2da',
    );
    shine.rotation.z = 0.07;
    for (const side of [-1, 1]) {
      const arm = this.sphere(body, 0.19, side * 0.48, 1.52, 0.28, '#f6e6c9');
      arm.scale.set(1, 1, 1.9);
      this.box(body, 0.19, 0.21, 0.2, side * 0.45, 1.5, 0.63, '#263642');
      this.box(body, 0.38, 0.16, 0.07, side * 0.59, 0.95, 1.52, '#fffad6');
    }
    const steering = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.045, 6, 16),
      this.mat('#29303a'),
    );
    steering.position.set(0, 1.48, 0.65);
    steering.rotation.x = -0.6;
    body.add(steering);
    const wheels: THREE.Mesh[] = [];
    for (const x of [-1.05, 1.05])
      for (const z of [-0.95, 1.06]) {
        const wheel = this.cylinder(
          group,
          0.46,
          0.46,
          0.4,
          x,
          0.48,
          z,
          '#17212b',
          16,
        );
        wheel.rotation.z = Math.PI / 2;
        const hub = this.cylinder(wheel, 0.23, 0.23, 0.42, 0, 0, 0, '#c8d0cf');
        hub.castShadow = false;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.31, 0.026, 4, 16),
          this.mat(col),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = x < 0 ? -0.215 : 0.215;
        wheel.add(ring);
        wheels.push(wheel);
      }
    for (const x of [-0.65, 0.65]) {
      const exhaust = this.cylinder(
        body,
        0.13,
        0.13,
        0.55,
        x,
        0.8,
        -1.5,
        '#6a7b85',
      );
      exhaust.rotation.x = Math.PI / 2;
    }
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 16),
      new THREE.MeshBasicMaterial({
        color: '#d7fa52',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    shield.position.y = 1;
    shield.visible = false;
    group.add(shield);
    const ice = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 3.1, 3.9),
      new THREE.MeshPhysicalMaterial({
        color: '#97e8ff',
        transparent: true,
        opacity: 0.5,
        roughness: 0.15,
        metalness: 0.1,
      }),
    );
    ice.position.y = 1.3;
    ice.visible = false;
    group.add(ice);
    const spikes = new THREE.Group();
    spikes.position.y = 0.9;
    spikes.visible = false;
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.035, 5, 50),
      this.mat('#d6c4ff', 0.5, true),
    );
    hoop.rotation.x = Math.PI / 2;
    spikes.add(hoop);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2,
        s = this.sphere(
          spikes,
          0.45,
          Math.sin(a) * 3.2,
          0,
          Math.cos(a) * 3.2,
          '#ae90ed',
        );
      for (let j = 0; j < 6; j++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.5, 4),
          this.mat('#e3ddff'),
        );
        spike.position.set(
          Math.sin((j / 6) * Math.PI * 2) * 0.5,
          0,
          Math.cos((j / 6) * Math.PI * 2) * 0.5,
        );
        spike.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          spike.position.clone().normalize(),
        );
        s.add(spike);
      }
    }
    group.add(spikes);
    const label = this.label(
      p.name + (p.bot ? ' · BOT' : ''),
      p.id === this.myId ? '#d7fa52' : '#f2f5f6',
    );
    label.position.set(0, 3.4, 0);
    label.scale.set(4.6, 1.15, 1);
    group.add(label);
    const weapon = new THREE.Group();
    weapon.position.set(0, 1.25, 1.15);
    body.add(weapon);
    this.scene.add(group);
    const kart = {
      group,
      body,
      wheels,
      shield,
      ice,
      spikes,
      label,
      weapon,
      lastWeapon: null,
    };
    this.karts.set(p.id, kart);
    group.position.set(p.x, p.y, p.z);
    group.rotation.y = p.angle;
    return kart;
  }
  setState(state: Snapshot, myId: string, demo = false) {
    this.state = state;
    this.myId = myId;
    this.demo = demo;
    this.lastStateAt = performance.now();
    if (this.lastRound !== state.round) {
      this.seen.clear();
      this.lastRound = state.round;
    }
    for (const event of state.events)
      if (!this.seen.has(event.id)) {
        this.seen.add(event.id);
        this.effect(event);
      }
    if (this.seen.size > 4000) {
      const ids = new Set(state.events.map((e) => e.id));
      this.seen = ids;
    }
  }
  particle(
    x: number,
    y: number,
    z: number,
    color: string,
    size: number,
    life: number,
    vx = 0,
    vy = 0,
    vz = 0,
    ring = false,
  ) {
    if (this.particles.length > 650) return;
    const mesh = new THREE.Mesh(
      ring ? this.ringGeometry : this.particleGeometry,
      this.mat(color, 0, true),
    );
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(size);
    if (ring) mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    this.particles.push({ mesh, vx, vy, vz, life, max: life, size, ring });
  }
  effect(e: GameEvent) {
    const mine = e.owner === this.myId || e.target === this.myId;
    const me = this.state?.players.find((p) => p.id === this.myId);
    const dist = me ? Math.hypot(me.x - e.x, me.z - e.z) : 100;
    if (e.kind === 'shot') {
      if (mine && !this.demo)
        this.audio.shot(e.weapon === 'nuke' || e.weapon === 'rockets');
      this.particle(e.x, e.y, e.z, e.color, e.size * 0.7, 0.09);
      if (e.tx !== undefined) {
        const end = new THREE.Vector3(e.tx, e.ty ?? 1, e.tz ?? 0),
          start = new THREE.Vector3(e.x, e.y, e.z),
          d = end.clone().sub(start);
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.07, d.length(), 5),
          this.mat('#f3ffad', 0, true),
        );
        mesh.position.copy(start.add(end).multiplyScalar(0.5));
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          d.normalize(),
        );
        this.scene.add(mesh);
        this.particles.push({
          mesh,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0.065,
          max: 0.065,
          size: 1,
        });
      }
    }
    if (e.kind === 'explosion' || e.kind === 'smash') {
      if (!this.demo && dist < 50)
        this.audio.explosion(Math.max(0.08, 1 - dist / 55));
      this.particle(
        e.x,
        Math.max(0.25, e.y),
        e.z,
        e.color,
        0.3,
        0.48,
        0,
        0,
        0,
        true,
      );
      const ring = this.particles[this.particles.length - 1];
      if (ring) ring.size = e.size * 1.5;
      const flash = this.glowSprite(
        e.kind === 'smash' ? '#fff3a0' : e.color,
        e.size * 3,
      );
      flash.position.set(e.x, e.y + 1, e.z);
      this.scene.add(flash);
      this.particles.push({
        mesh: flash,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.23,
        max: 0.23,
        size: e.size * 3,
      });
      for (let i = 0; i < (e.kind === 'smash' ? 38 : 22); i++) {
        const a = Math.random() * Math.PI * 2,
          v = 3 + Math.random() * e.size * 2;
        this.particle(
          e.x,
          e.y + 0.5,
          e.z,
          i % 3 === 0 ? '#fff6a5' : e.color,
          0.12 + Math.random() * 0.35,
          0.35 + Math.random() * 0.6,
          Math.cos(a) * v,
          2 + Math.random() * 7,
          Math.sin(a) * v,
        );
      }
      if (dist < 14 && !this.demo)
        this.shake = Math.min(0.65, this.shake + (0.65 - dist / 25));
    }
    if (e.kind === 'hit') {
      for (let i = 0; i < 3; i++)
        this.particle(
          e.x,
          e.y,
          e.z,
          e.color,
          0.11,
          0.2,
          Math.random() * 8 - 4,
          3 + Math.random() * 3,
          Math.random() * 8 - 4,
        );
      if (e.target === this.myId && !this.demo) {
        this.shake = Math.max(this.shake, 0.15);
        this.audio.tone(130, 50, 0.07, 0.06);
      }
    }
    if (e.kind === 'pickup') {
      if (mine && !this.demo) this.audio.pickup();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.particle(
          e.x,
          e.y,
          e.z,
          e.color,
          0.12,
          0.5,
          Math.sin(a) * 3,
          3,
          Math.cos(a) * 3,
        );
      }
    }
    if (e.kind === 'freeze' || e.kind === 'shield')
      for (let i = 0; i < 20; i++)
        this.particle(
          e.x,
          e.y,
          e.z,
          e.color,
          0.15,
          0.5,
          Math.random() * 10 - 5,
          Math.random() * 8,
          Math.random() * 10 - 5,
        );
  }
  projectile(q: Projectile) {
    const g = new THREE.Group(),
      color = WEAPONS[q.kind].color;
    if (q.kind === 'fake') {
      const b = this.lootBox();
      b.scale.setScalar(0.95);
      g.add(b);
    } else if (q.kind === 'mines') {
      this.cylinder(g, 0.65, 0.8, 0.27, 0, 0, 0, '#35404a');
      const led = this.sphere(g, 0.18, 0, 0.23, 0, '#ff5252');
      led.material = this.mat('#ff5252', 0, true);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.045, 5, 28),
        this.mat('#ff635b', 0, true),
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    } else if (q.kind === 'cannon' || q.kind === 'lobgrenuke') {
      this.sphere(g, q.kind === 'cannon' ? 0.48 : 0.65, 0, 0, 0, '#293440');
      g.add(this.glowSprite(color, 2.2));
    } else if (q.kind === 'snow') {
      const m = this.sphere(g, 0.45, 0, 0, 0, '#dbffff');
      m.material = this.mat('#b5ffff', 0, true);
      g.add(this.glowSprite('#a4eaff', 2.3));
    } else if (q.kind === 'bullets') {
      const m = this.cylinder(g, 0.09, 0.14, 1.3, 0, 0, 0, color);
      m.rotation.x = Math.PI / 2;
      m.material = this.mat(color, 0, true);
      g.add(this.glowSprite(color, 1.6));
    } else {
      const size = q.kind === 'nuke' ? 1.7 : 1;
      const hull = this.cylinder(
        g,
        0.2 * size,
        0.2 * size,
        1.3 * size,
        0,
        0,
        0,
        '#f3ebdc',
      );
      hull.rotation.x = Math.PI / 2;
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.21 * size, 0.55 * size, 10),
        this.mat(color, 0, true),
      );
      nose.rotation.x = Math.PI / 2;
      nose.position.z = 0.8 * size;
      g.add(nose);
      for (const a of [0, Math.PI / 2]) {
        const fin = this.box(
          g,
          0.9 * size,
          0.06 * size,
          0.4 * size,
          0,
          0,
          -0.5 * size,
          color,
        );
        fin.rotation.z = a;
      }
      const glow = this.glowSprite('#ff9d43', 2.7 * size);
      glow.position.z = -size;
      g.add(glow);
    }
    this.scene.add(g);
    this.shots.set(q.id, g);
    return g;
  }
  animate = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
    this.last = now;
    this.clock += dt;
    const state = this.state;
    if (state) {
      const ids = new Set(state.players.map((p) => p.id));
      for (const [id, k] of this.karts)
        if (!ids.has(id)) {
          this.removeObject(k.group);
          this.karts.delete(id);
        }
      for (const p of state.players) {
        const k = this.karts.get(p.id) ?? this.makeKart(p);
        k.group.visible = p.respawn <= 0;
        if (!k.group.visible) continue;
        const delay = this.demo
            ? 0
            : Math.min((now - this.lastStateAt) / 1000, 0.09),
          extra = p.speed * delay;
        const target = new THREE.Vector3(
          p.x + Math.sin(p.angle) * extra,
          p.y,
          p.z + Math.cos(p.angle) * extra,
        );
        if (k.group.position.distanceTo(target) > 12)
          k.group.position.copy(target);
        else k.group.position.lerp(target, 1 - Math.exp(-dt * 20));
        k.group.rotation.y +=
          angleDiff(p.angle, k.group.rotation.y) * (1 - Math.exp(-dt * 22));
        k.body.rotation.z = -p.input.steer * p.speed * 0.0019;
        k.body.position.y =
          Math.abs(p.speed) > 0.5 ? Math.sin(this.clock * 30) * 0.02 : 0;
        for (const wheel of k.wheels) wheel.rotation.x += p.speed * dt * 1.7;
        k.shield.visible =
          p.shield > 0 || (p.weapon === 'star' && p.active > 0);
        k.shield.scale.setScalar(1 + Math.sin(this.clock * 7) * 0.03);
        (k.shield.material as THREE.MeshBasicMaterial).color.set(
          p.shield > 0 ? '#77ceff' : '#d7fa52',
        );
        k.ice.visible = p.frozen > 0;
        k.spikes.visible = p.weapon === 'spiky' && p.active > 0;
        k.spikes.rotation.y = this.clock * 4;
        k.label.visible = !this.demo && p.id !== this.myId;
        if (k.lastWeapon !== p.weapon) {
          while (k.weapon.children.length)
            this.removeObject(k.weapon.children[0]);
          k.lastWeapon = p.weapon;
          if (
            p.weapon &&
            [
              'rockets',
              'nuke',
              'machinegun',
              'bullets',
              'cannon',
              'snow',
            ].includes(p.weapon)
          ) {
            const w = WEAPONS[p.weapon];
            const barrel = this.cylinder(
              k.weapon,
              p.weapon === 'cannon' ? 0.28 : 0.12,
              p.weapon === 'cannon' ? 0.3 : 0.12,
              0.9,
              0,
              0.2,
              0.1,
              '#26323c',
            );
            barrel.rotation.x = Math.PI / 2;
            this.box(k.weapon, 0.5, 0.4, 0.6, 0, 0, -0.3, w.color);
          }
        }
        if (p.id === this.myId && !this.demo) this.audio.speed(p.speed);
        if (Math.abs(p.speed) > 8 && Math.random() < 0.5)
          this.particle(
            p.x - Math.sin(p.angle) * 1.8,
            p.y + 0.2,
            p.z - Math.cos(p.angle) * 1.8,
            '#ac9d83',
            0.09,
            0.28,
            0,
            0.5,
            0,
          );
      }
      this.boxes.forEach((b, i) => {
        const active = state.boxes[i]?.ready <= state.t;
        b.visible = active;
        b.rotation.y = this.clock * 0.9 + i;
        b.position.y =
          groundHeight(BOX_POSITIONS[i][0], BOX_POSITIONS[i][1]) +
          1.35 +
          Math.sin(this.clock * 2 + i) * 0.2;
      });
      const qids = new Set(state.projectiles.map((q) => q.id));
      for (const [id, m] of this.shots)
        if (!qids.has(id)) {
          this.removeObject(m);
          this.shots.delete(id);
        }
      for (const q of state.projectiles) {
        const m = this.shots.get(q.id) ?? this.projectile(q),
          extra = Math.min((now - this.lastStateAt) / 1000, 0.07);
        m.position.set(
          q.x + q.vx * extra,
          q.y + q.vy * extra,
          q.z + q.vz * extra,
        );
        if (Math.hypot(q.vx, q.vz) > 0.1)
          m.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(q.vx, q.vy, q.vz).normalize(),
          );
        if (!['mines', 'fake'].includes(q.kind)) {
          for (let j = 0; j < 2; j++)
            this.particle(
              m.position.x - q.vx * 0.01 * j,
              m.position.y - q.vy * 0.01 * j,
              m.position.z - q.vz * 0.01 * j,
              WEAPONS[q.kind].color,
              q.kind === 'bullets' ? 0.065 : 0.13,
              0.18,
              0,
              0.1,
              0,
            );
        }
      }
      const me = state.players.find((p) => p.id === this.myId);
      if (this.demo) {
        const a = this.clock * 0.035;
        const v = new THREE.Vector3(
          54 * Math.cos(a),
          43,
          58 * Math.sin(a) + 50,
        );
        this.camera.position.lerp(v, 0.03);
        this.camera.lookAt(4, 0, 0);
        this.camera.fov = 51;
        this.camera.updateProjectionMatrix();
      } else if (me) {
        const k = this.karts.get(me.id);
        if (k) {
          const a = k.group.rotation.y,
            focus = k.group.position;
          const cameraPos = new THREE.Vector3(
            focus.x - Math.sin(a) * 11.7,
            focus.y + 7.5,
            focus.z - Math.cos(a) * 11.7,
          );
          cameraPos.x = Math.max(-49, Math.min(49, cameraPos.x));
          cameraPos.z = Math.max(-41, Math.min(41, cameraPos.z));
          this.camera.position.lerp(cameraPos, 1 - Math.exp(-dt * 6));
          this.shake = Math.max(0, this.shake - dt * 2);
          this.camera.position.x += (Math.random() - 0.5) * this.shake;
          this.camera.position.y += (Math.random() - 0.5) * this.shake;
          this.camera.lookAt(
            focus.x + Math.sin(a) * 6,
            focus.y + 1.3,
            focus.z + Math.cos(a) * 6,
          );
          this.camera.fov = 57 + Math.abs(me.speed) * 0.15;
          this.camera.updateProjectionMatrix();
        }
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.removeObject(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (!p.ring) p.vy -= dt * 12;
      p.mesh.scale.setScalar(
        p.ring ? (1 - p.life / p.max) * p.size : (p.size * p.life) / p.max,
      );
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };
  removeObject(obj: THREE.Object3D) {
    obj.removeFromParent();
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (
          child.geometry !== this.particleGeometry &&
          child.geometry !== this.ringGeometry
        )
          child.geometry.dispose();
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const mat of mats)
          if (![...this.materials.values()].includes(mat)) mat.dispose();
      } else if (child instanceof THREE.Sprite) {
        child.material.dispose();
      } else if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.audio.dispose();
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.contextLost,
    );
    this.removeObject(this.scene);
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.particleGeometry.dispose();
    this.ringGeometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
