export class GameAudio {
  ctx: AudioContext | null = null;
  gain: GainNode | null = null;
  engine: OscillatorNode | null = null;
  engineGain: GainNode | null = null;
  muted = false;
  lastShot = 0;
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.22;
      this.gain.connect(this.ctx.destination);
      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.018;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      this.engine.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.gain);
      this.engine.start();
    } catch {}
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gain && this.ctx)
      this.gain.gain.setTargetAtTime(
        muted ? 0 : 0.22,
        this.ctx.currentTime,
        0.1,
      );
  }
  speed(value: number) {
    if (this.engine && this.ctx)
      this.engine.frequency.setTargetAtTime(
        42 + Math.abs(value) * 4,
        this.ctx.currentTime,
        0.08,
      );
  }
  tone(
    freq: number,
    end: number,
    duration: number,
    volume = 0.18,
    type: OscillatorType = 'sine',
  ) {
    if (!this.ctx || !this.gain || this.muted) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, end), t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  shot(heavy = false) {
    if (!this.ctx) return;
    if (this.ctx.currentTime - this.lastShot < 0.055) return;
    this.lastShot = this.ctx.currentTime;
    this.tone(
      heavy ? 170 : 850,
      70,
      heavy ? 0.2 : 0.065,
      heavy ? 0.23 : 0.1,
      'sawtooth',
    );
  }
  explosion(volume = 1) {
    if (!this.ctx || !this.gain || this.muted) return;
    const duration = 0.48,
      t = this.ctx.currentTime,
      buffer = this.ctx.createBuffer(
        1,
        Math.floor(this.ctx.sampleRate * duration),
        this.ctx.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource(),
      filter = this.ctx.createBiquadFilter(),
      g = this.ctx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + duration);
    g.gain.setValueAtTime(0.5 * volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.gain);
    src.start();
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
    this.tone(110, 25, 0.3, 0.3 * volume);
  }
  pickup() {
    this.tone(620, 1240, 0.18, 0.15, 'triangle');
  }
  dispose() {
    this.engine?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
