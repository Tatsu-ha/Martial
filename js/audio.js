/* Tiny procedural sound engine — no audio files. */

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.32;
  }

  tone(freq, dur, type = 'sine', gain = 0.4, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.4, filterFreq = 900, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  click() { this.tone(480, 0.05, 'triangle', 0.12, -120); }
  whoosh() { this.noise(0.16, 0.25, 2400, 'bandpass'); }
  hit(power = 1) {
    this.tone(68, 0.16, 'sine', 0.55 * power, -26);
    this.noise(0.14, 0.5 * power, 520);
    this.tone(180, 0.05, 'square', 0.1 * power, -80);
  }
  heavyHit() {
    this.hit(1.25);
    this.tone(42, 0.3, 'sine', 0.7, -16);
    this.noise(0.3, 0.4, 260);
  }
  block() {
    this.tone(240, 0.09, 'square', 0.16, -80);
    this.noise(0.08, 0.24, 3400, 'highpass');
    this.tone(760, 0.06, 'triangle', 0.08, -260);
  }
  dodge() { this.noise(0.24, 0.2, 1400, 'bandpass'); this.tone(320, 0.12, 'sine', 0.08, 240); }
  chi() {
    this.tone(280, 0.5, 'sine', 0.16, 360);
    this.tone(420, 0.55, 'triangle', 0.09, 420);
  }
  perfect() {
    this.tone(880, 0.12, 'triangle', 0.18);
    setTimeout(() => this.tone(1320, 0.22, 'triangle', 0.16), 70);
  }
  fail() { this.tone(140, 0.2, 'sawtooth', 0.12, -60); }
  ko() {
    this.tone(46, 0.8, 'sine', 0.8, -18);
    this.noise(0.55, 0.5, 300);
    setTimeout(() => this.tone(28, 1.2, 'sine', 0.5, -8), 100);
  }
  levelUp() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 'triangle', 0.16), i * 90));
  }
  coin() { this.tone(980, 0.08, 'square', 0.1); setTimeout(() => this.tone(1380, 0.14, 'square', 0.08), 60); }
}

export const sound = new Sound();
