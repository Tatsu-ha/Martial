/* Canvas arena renderer: procedural fighters, backgrounds, effects, camera. */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = d => (d * Math.PI) / 180;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function shade(hex, amt = 0, sat = 0) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  s = clamp(s + sat, 0, 1);
  const ll = clamp(l + amt, 0.03, 0.95);
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let rr, gg, bb;
  if (s === 0) { rr = gg = bb = ll; }
  else {
    const q = ll < 0.5 ? ll * (1 + s) : ll + s - ll * s;
    const p = 2 * ll - q;
    rr = hue2rgb(p, q, h + 1 / 3); gg = hue2rgb(p, q, h); bb = hue2rgb(p, q, h - 1 / 3);
  }
  return `rgb(${Math.round(rr * 255)},${Math.round(gg * 255)},${Math.round(bb * 255)})`;
}

const BASE = {
  lean: 8, crouch: 0, headTilt: -3, rot: 0,
  fSh: 38, fEl: 142, bSh: 62, bEl: 112,
  fHip: 20, fKnee: 3, fFoot: 98,
  bHip: -25, bKnee: -8, bFoot: 76,
  lungeX: 0, lungeY: 0,
};

const P = (o) => ({ ...BASE, ...o });

const POSES = {
  stance: P({}),
  guard: P({ lean: 16, crouch: 9, fSh: 56, fEl: 118, bSh: 70, bEl: 128, lungeX: -4 }),
  dodge: P({ lean: -14, crouch: 14, fSh: 30, fEl: 168, bSh: 44, bEl: 150, lungeX: -38, fHip: 28, fKnee: -18, bHip: -18, bKnee: 22 }),
  hurt: P({ lean: -20, headTilt: -16, crouch: 7, fSh: 20, fEl: 178, bSh: 12, bEl: 190, lungeX: -20, fHip: 18, fKnee: 10 }),
  hurtHeavy: P({ lean: -30, headTilt: -24, crouch: 18, fSh: 8, fEl: 200, bSh: 4, bEl: 205, lungeX: -32, fHip: 8, fKnee: 26, bHip: -30, bKnee: 16 }),
  stagger: P({ lean: 30, crouch: 26, headTilt: 12, fSh: 12, fEl: 175, bSh: 20, bEl: 170, fHip: 34, fKnee: 20, bHip: -34, bKnee: 4 }),
  victory: P({ lean: -4, fSh: 160, fEl: 178, bSh: 25, bEl: 120, fHip: 24, bHip: -24, headTilt: -10 }),
  cast: P({ lean: -4, crouch: 12, fSh: 118, fEl: 158, bSh: 108, bEl: 170, headTilt: -8, fHip: 26, fKnee: 6 }),
  down: P({ rot: -80, lean: -12, crouch: 16, fSh: 10, fEl: 170, bSh: 20, bEl: 160, fHip: 22, fKnee: 30, bHip: -18, bKnee: 18 }),

  windPunch: P({ lean: -2, fSh: 24, fEl: 170, bSh: 82, bEl: 106, lungeX: -8, crouch: 4 }),
  hitPunch: P({ lean: 17, fSh: 84, fEl: 88, bSh: 42, bEl: 140, lungeX: 46, fHip: 32, bHip: -30 }),
  windCross: P({ lean: 2, fSh: 34, fEl: 150, bSh: 40, bEl: 158, lungeX: -10 }),
  hitCross: P({ lean: 19, fSh: 30, fEl: 152, bSh: 85, bEl: 88, lungeX: 50, fHip: 35, bHip: -32 }),
  windHook: P({ lean: 2, fSh: 58, fEl: 30, bSh: 55, bEl: 140, lungeX: -6 }),
  hitHook: P({ lean: 16, fSh: 80, fEl: 24, bSh: 45, bEl: 150, lungeX: 38 }),
  windChain: P({ lean: 4, fSh: 30, fEl: 166, bSh: 50, bEl: 158, lungeX: 0 }),
  hitChain: P({ lean: 16, fSh: 84, fEl: 88, bSh: 80, bEl: 92, lungeX: 46 }),

  windKick: P({ lean: -4, crouch: 6, fHip: 44, fKnee: -36, fFoot: 30, bHip: -18, bKnee: -8, lungeX: -8 }),
  hitKick: P({ lean: -10, crouch: 4, fHip: 88, fKnee: 88, fFoot: 112, bHip: -6, bKnee: -4, lungeX: 30 }),
  windRound: P({ lean: -2, crouch: 8, fHip: 30, fKnee: -60, fFoot: 30, bHip: -14, lungeX: -6 }),
  hitRound: P({ lean: -14, crouch: 8, fHip: 100, fKnee: 108, fFoot: 120, bHip: -4, bKnee: 0, lungeX: 34 }),
  windAxe: P({ lean: -6, crouch: 10, fHip: 118, fKnee: 174, fFoot: 150, bHip: -12, lungeX: -4 }),
  hitAxe: P({ lean: 12, crouch: 14, fHip: 52, fKnee: 4, fFoot: 92, bHip: -28, bKnee: -4, lungeX: 40 }),
  windLow: P({ lean: 16, crouch: 32, fHip: 44, fKnee: 30, bHip: -32, bKnee: 8, lungeX: 0 }),
  hitLow: P({ lean: 26, crouch: 46, fHip: 78, fKnee: 94, fFoot: 112, bHip: -36, bKnee: 18, lungeX: 34 }),

  windKnee: P({ lean: 4, crouch: 8, fHip: 36, fKnee: -20, fSh: 70, fEl: 110, bSh: 78, bEl: 108, lungeX: 0 }),
  hitKnee: P({ lean: 20, crouch: 10, fHip: 56, fKnee: -92, fFoot: 20, fSh: 82, fEl: 120, bSh: 88, bEl: 116, lungeX: 36 }),
  windElbow: P({ lean: 4, fSh: 52, fEl: 120, bSh: 50, bEl: 140, lungeX: -6 }),
  hitElbow: P({ lean: 20, fSh: 78, fEl: 166, bSh: 64, bEl: 144, lungeX: 40 }),

  windPalm: P({ lean: 0, fSh: 40, fEl: 160, bSh: 58, bEl: 140, lungeX: -10 }),
  hitPalm: P({ lean: 21, fSh: 88, fEl: 90, bSh: 44, bEl: 150, lungeX: 48, fHip: 34 }),
  windPoint: P({ lean: 2, fSh: 30, fEl: 172, bSh: 58, bEl: 130, lungeX: -8 }),
  hitPoint: P({ lean: 16, fSh: 89, fEl: 90, bSh: 40, bEl: 145, lungeX: 52 }),

  windThrow: P({ lean: 6, crouch: 8, fSh: 54, fEl: 120, bSh: 62, bEl: 116, lungeX: -8 }),
  hitThrow: P({ lean: 34, crouch: 14, fSh: 76, fEl: 96, bSh: 82, bEl: 100, lungeX: 38, rot: 6 }),
  windSub: P({ lean: 10, crouch: 12, fSh: 66, fEl: 95, bSh: 74, bEl: 100, lungeX: -4 }),
  hitSub: P({ lean: 42, crouch: 34, fSh: 100, fEl: 118, bSh: 92, bEl: 124, lungeX: 36, fHip: 44, fKnee: 30, bHip: -20, bKnee: 34 }),
};

const ANIM_MAP = {
  jab: ['windPunch', 'hitPunch'], cross: ['windCross', 'hitCross'], hook: ['windHook', 'hitHook'],
  chain: ['windChain', 'hitChain'], punch: ['windPunch', 'hitPunch'], hammer: ['windCross', 'hitHook'],
  kick: ['windKick', 'hitKick'], roundhouse: ['windRound', 'hitRound'], axe: ['windAxe', 'hitAxe'],
  sweep: ['windLow', 'hitLow'], knee: ['windKnee', 'hitKnee'], elbow: ['windElbow', 'hitElbow'],
  palm: ['windPalm', 'hitPalm'], point: ['windPoint', 'hitPoint'], throw: ['windThrow', 'hitThrow'],
  submission: ['windSub', 'hitSub'], choke: ['windSub', 'hitSub'], chi: ['cast', 'hitPalm'],
};

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = 1440; this.h = 900;
    this.time = 0;
    this.last = 0;
    this.particles = [];
    this.floats = [];
    this.decals = [];
    this.shakeAmt = 0;
    this.shakeT = 0;
    this.flashColor = null;
    this.flashA = 0;
    this.cam = { x: 720, y: 500, zoom: 1, tx: 720, ty: 500, tz: 1 };
    this.ambient = 0;
    this.sides = {
      player: this.makeSide(0, 1),
      enemy: this.makeSide(0, -1),
    };
    this.visible = true;
    this.menuMode = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  makeSide(x, facing) {
    return {
      x, facing,
      look: null, style: 'shaolin',
      pose: { ...BASE }, tween: null, tweenName: 'stance',
      phase: Math.random() * TAU,
      scale: 1,
      condition: null,
      down: false,
      visible: true,
      flash: 0,
    };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.layout();
  }

  layout() {
    const w = this.w, h = this.h;
    const mobile = w < 720;
    this.ground = h * (mobile ? 0.60 : 0.665);
    this.worldScale = mobile ? clamp(w / 520, 0.62, 0.86) : clamp(h / 820, 0.78, 1.16);
    this.sides.player.x = w * (mobile ? 0.255 : 0.345);
    this.sides.enemy.x = w * (mobile ? 0.745 : 0.655);
    this.cam.x = w / 2; this.cam.y = this.ground - 135;
    this.cam.tx = this.cam.x; this.cam.ty = this.cam.y;
  }

  configure({ player, enemy, menu = false }) {
    this.menuMode = menu;
    if (player) {
      this.sides.player.look = { ...(player.look || {}) };
      this.sides.player.style = player.style;
      this.sides.player.visible = true;
    }
    if (enemy) {
      this.sides.enemy.look = { ...(enemy.look || {}) };
      this.sides.enemy.style = enemy.style;
      this.sides.enemy.visible = true;
    }
    this.reset();
  }

  reset() {
    for (const key of ['player', 'enemy']) {
      const s = this.sides[key];
      s.pose = { ...BASE };
      s.tween = null;
      s.tweenName = 'stance';
      s.down = false;
      s.rotation = 0;
      s.visible = true;
      s.flash = 0;
    }
    this.particles = [];
    this.floats = [];
    this.decals = [];
    this.cam.zoom = 1; this.cam.tz = 1;
    this.cam.tx = this.w / 2; this.cam.ty = this.ground - 135;
    this.shakeAmt = 0;
    this.flashA = 0;
    this.layout();
  }

  setCondition(side, condition) {
    if (this.sides[side]) this.sides[side].condition = condition;
  }

  setPose(side, name, duration = 220, easing = 'out') {
    const s = this.sides[side];
    if (!s) return;
    const target = POSES[name] || POSES.stance;
    const now = performance.now();
    s.tween = {
      from: { ...s.pose }, to: { ...target }, start: now, dur: duration,
      ease: easing === 'in' ? easeIn : easing === 'inout' ? easeInOut : easeOut,
    };
    s.tweenName = name;
  }

  async hold(ms) { await sleep(ms); }

  async attack(side, anim, quality = 'good', onImpact) {
    const s = this.sides[side];
    if (!s) return;
    const [wind, hit] = ANIM_MAP[anim] || ANIM_MAP.punch;
    const q = quality === 'perfect' ? 1.15 : quality === 'good' ? 1 : 0.82;
    s.tween = null;
    this.setPose(side, wind, 130, 'out');
    await sleep(135);
    this.setPose(side, hit, 110 * (1.05 - q * 0.08), 'out');
    await sleep(105);
    onImpact?.();
    await sleep(190);
    this.setPose(side, 'stance', 260, 'inout');
    await sleep(170);
  }

  async cast(side, onImpact) {
    this.setPose(side, 'cast', 380, 'inout');
    await sleep(330);
    onImpact?.();
    await sleep(180);
    this.setPose(side, 'stance', 300);
    await sleep(150);
  }

  async defend(side, kind) {
    if (kind === 'dodge' || kind === 'perfectDodge') {
      this.setPose(side, 'dodge', 160, 'out');
      await sleep(260);
      this.setPose(side, 'stance', 220, 'inout');
      await sleep(100);
    } else if (kind === 'block' || kind === 'perfectBlock') {
      this.setPose(side, 'guard', 130, 'out');
      await sleep(300);
      this.setPose(side, 'stance', 220, 'inout');
      await sleep(80);
    }
  }

  async reactHit(side, heavy = false) {
    this.setPose(side, heavy ? 'hurtHeavy' : 'hurt', 90, 'out');
    await sleep(170);
    this.setPose(side, 'stance', 280, 'inout');
    await sleep(120);
  }

  async counter(side, onImpact) {
    this.setPose(side, 'windCross', 100, 'out');
    await sleep(95);
    this.setPose(side, 'hitCross', 95, 'out');
    await sleep(95);
    onImpact?.();
    await sleep(220);
    this.setPose(side, 'stance', 250);
    await sleep(140);
  }

  async knockdown(side) {
    const s = this.sides[side];
    this.setPose(side, 'down', 650, 'in');
    await sleep(620);
    s.down = true;
  }

  async ko(loser, winner, cause = '') {
    const l = this.sides[loser];
    const w = this.sides[winner];
    this.cam.tz = 1.42;
    this.cam.tx = l.x;
    this.cam.ty = this.ground - 150;
    this.setPose(winner, 'victory', 500, 'inout');
    this.setPose(loser, 'hurtHeavy', 100, 'out');
    this.flash('#e7d9c2', 0.5);
    this.shake(18, 500);
    await sleep(280);
    this.setPose(loser, 'down', 900, 'in');
    await sleep(700);
    this.emitBlood(l.x + (loser === 'player' ? 40 : -40), this.ground - 180, 26, l.facing);
    this.decals.push({ x: l.x + (loser === 'player' ? 50 : -50), y: this.ground + 10, r: 38 + Math.random() * 30, a: 0.32 });
    this.shake(10, 300);
    await sleep(700);
  }

  celebrate() {
    this.cam.tz = 1.08;
    this.cam.tx = this.w / 2;
    this.cam.ty = this.ground - 160;
    this.setPose('player', 'victory', 500, 'inout');
  }

  resetCamera() {
    this.cam.tz = 1; this.cam.tx = this.w / 2; this.cam.ty = this.ground - 135;
  }

  shake(amount = 8, dur = 260) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    this.shakeT = Math.max(this.shakeT, performance.now() + dur);
  }

  flash(color = '#fff', a = 0.4) {
    this.flashColor = color; this.flashA = a;
  }

  impactPoint(side) {
    const s = this.sides[side];
    return { x: s.x + (side === 'player' ? 18 : -18), y: this.ground - 165 * (this.worldScale / 1.1) };
  }

  hitEffect(side, { blood = 0, chi = false, heavy = false, text = '', color = '#d9a441', ring = true, part = '' } = {}) {
    const p = this.impactPoint(side);
    const dir = side === 'player' ? 1 : -1;
    const count = blood ? Math.min(26, 5 + blood) : 0;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'blood', x: p.x + (Math.random() - 0.5) * 22, y: p.y + (Math.random() - 0.5) * 20,
        vx: dir * (0.5 + Math.random() * 4.2), vy: -1.5 + Math.random() * 4,
        g: 0.09, life: 30 + Math.random() * 35, max: 65, size: 1.2 + Math.random() * 3.2,
        color: `hsl(${2 + Math.random() * 12} 72% ${24 + Math.random() * 20}%)`,
      });
    }
    if (chi) {
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * TAU;
        this.particles.push({
          type: 'chi', x: p.x, y: p.y, vx: Math.cos(a) * (1 + Math.random() * 3.5), vy: Math.sin(a) * (1 + Math.random() * 3.5) - 0.5,
          g: -0.01, life: 25 + Math.random() * 30, max: 55, size: 1 + Math.random() * 2.4, color,
        });
      }
    }
    if (ring) {
      this.particles.push({ type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 22, max: 22, size: heavy ? 74 : 46, color });
    }
    if (text) this.floats.push({ text, x: p.x + (side === 'player' ? 30 : -30), y: p.y - 40, vy: -0.9, life: 60, max: 60, color, size: heavy ? 46 : 32 });
    if (heavy) this.shake(14, 260);
  }

  stanceEffect(side, color = '#d9a441') {
    const s = this.sides[side];
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * TAU;
      this.particles.push({
        type: 'chi', x: s.x + (Math.random() - 0.5) * 60, y: this.ground - 40 - Math.random() * 210,
        vx: Math.cos(a) * 0.8, vy: -0.6 - Math.random() * 1.8, g: -0.01,
        life: 30 + Math.random() * 35, max: 65, size: 1 + Math.random() * 2.4, color,
      });
    }
  }

  emitBlood(x, y, n, dir) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'blood', x, y, vx: dir * (0.5 + Math.random() * 3), vy: -2 + Math.random() * 5,
        g: 0.1, life: 25 + Math.random() * 30, max: 55, size: 1 + Math.random() * 2.6, color: '#6d1410',
      });
    }
  }

  addFloat(text, x, y, color = '#f0e6d2', size = 28) {
    this.floats.push({ text, x, y, vy: -1.1, life: 62, max: 62, color, size });
  }

  loop(now) {
    const dt = Math.min(40, now - (this.last || now));
    this.last = now;
    this.time = now;
    this.update(now, dt);
    this.draw(now);
    requestAnimationFrame(this.loop);
  }

  update(now, dt) {
    for (const key of ['player', 'enemy']) {
      const s = this.sides[key];
      if (s.tween) {
        const t = clamp((now - s.tween.start) / s.tween.dur, 0, 1);
        const e = s.tween.ease(t);
        const from = s.tween.from, to = s.tween.to;
        for (const k of Object.keys(to)) s.pose[k] = lerp(from[k] ?? to[k], to[k], e);
        if (t >= 1) { s.pose = { ...to }; s.tween = null; }
      }
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt / 220);
    }
    // camera
    this.cam.x = lerp(this.cam.x, this.cam.tx, 0.07);
    this.cam.y = lerp(this.cam.y, this.cam.ty, 0.07);
    this.cam.zoom = lerp(this.cam.zoom, this.cam.tz, 0.06);

    if (this.shakeAmt > 0) {
      if (now > this.shakeT) this.shakeAmt *= 0.86;
      if (this.shakeAmt < 0.1) this.shakeAmt = 0;
    }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt / 520);

    for (const p of this.particles) {
      p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16);
      p.vy += (p.g || 0) * (dt / 16);
      p.vx *= 0.995;
      p.life -= dt / 16;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floats) { f.y += f.vy * (dt / 16); f.life -= dt / 16; }
    this.floats = this.floats.filter(f => f.life > 0);

    // ambient dust
    this.ambient -= dt;
    if (this.ambient <= 0 && this.particles.length < 260) {
      this.ambient = 110;
      this.particles.push({
        type: 'dust', x: Math.random() * this.w, y: this.ground - 100 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.25, vy: -0.08 - Math.random() * 0.18, g: 0,
        life: 240, max: 240, size: 0.6 + Math.random() * 1.6,
        color: 'rgba(220,190,140,0.35)',
      });
    }
    for (const p of this.particles) if (p.type === 'dust') p.x += 0.04;
  }

  draw(now) {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const shakeX = this.shakeAmt ? (Math.random() - 0.5) * this.shakeAmt : 0;
    const shakeY = this.shakeAmt ? (Math.random() - 0.5) * this.shakeAmt : 0;
    ctx.save();
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawBackground(now);
    this.drawDecals();
    this.drawGroundShadows();

    const order = ['enemy', 'player'];
    for (const key of order) if (this.sides[key].visible) this.drawFighter(key, now);

    this.drawParticles();
    this.drawFloats();
    ctx.restore();

    // screen-space vignette glow
    this.drawScreenFx();
  }

  drawBackground(now) {
    const { ctx, w, h, ground } = this;
    const spanW = w + 900, spanH = h + 900;
    const g = ctx.createLinearGradient(0, -300, 0, h);
    g.addColorStop(0, '#080605');
    g.addColorStop(0.45, '#140f0c');
    g.addColorStop(1, '#1c1410');
    ctx.fillStyle = g;
    ctx.fillRect(-450, -450, spanW, spanH);

    // back wall planks
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 14; i++) {
      const x = -450 + i * (spanW / 14);
      ctx.fillStyle = i % 2 ? '#1a1310' : '#17110e';
      ctx.fillRect(x, -300, spanW / 14 + 1, ground + 300);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, ground); ctx.stroke();
    }
    ctx.restore();

    // shoji windows with warm light
    const windows = [[0.16, 0.34], [0.5, 0.24], [0.84, 0.34]];
    for (const [wx, ww] of windows) {
      const x = wx * w, y = ground - 420, wd = ww * w, ht = 290;
      const wg = ctx.createLinearGradient(x, y, x, y + ht);
      wg.addColorStop(0, 'rgba(214,160,88,0.16)');
      wg.addColorStop(1, 'rgba(80,55,34,0.05)');
      ctx.fillStyle = wg;
      ctx.fillRect(x, y, wd, ht);
      ctx.strokeStyle = 'rgba(179,143,94,0.22)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(x + (wd / 4) * i, y); ctx.lineTo(x + (wd / 4) * i, y + ht); ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        ctx.beginPath(); ctx.moveTo(x, y + (ht / 6) * i); ctx.lineTo(x + wd, y + (ht / 6) * i); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(30,20,14,0.9)'; ctx.lineWidth = 8;
      ctx.strokeRect(x, y, wd, ht);
    }

    // hanging banners
    this.drawBanner(w * 0.265, ground - 500, 78, 230, '武', '#8f2a22');
    this.drawBanner(w * 0.735, ground - 500, 78, 230, '魂', '#2e3a4b');

    // beams
    ctx.fillStyle = '#241812';
    ctx.fillRect(-450, ground - 500, spanW, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let i = 0; i < 40; i++) ctx.fillRect(-450 + i * 90, ground - 500, 3, 26);

    // lanterns
    this.drawLantern(w * 0.1, ground - 430, 1);
    this.drawLantern(w * 0.9, ground - 430, 1.1);

    // floor
    const fg = ctx.createLinearGradient(0, ground - 90, 0, h + 200);
    fg.addColorStop(0, '#2a1c13');
    fg.addColorStop(0.4, '#1d130d');
    fg.addColorStop(1, '#110b08');
    ctx.fillStyle = fg;
    ctx.fillRect(-450, ground - 70, spanW, spanH);
    // floor boards with perspective
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    for (let i = -12; i <= 12; i++) {
      const x = w / 2 + i * 120;
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 58, ground - 70);
      ctx.lineTo(w / 2 + i * 240, h + 300);
      ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const y = ground - 70 + Math.pow(i / 8, 1.8) * 420;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(-450, y); ctx.lineTo(w + 450, y); ctx.stroke();
    }
    ctx.restore();

    // light pool
    const lg = ctx.createRadialGradient(w / 2, ground - 30, 30, w / 2, ground - 30, w * 0.55);
    lg.addColorStop(0, 'rgba(214,164,96,0.12)');
    lg.addColorStop(0.5, 'rgba(150,100,50,0.05)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-450, ground - 300, spanW, 500);

    // ring rope / boundary
    ctx.strokeStyle = 'rgba(162,123,71,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, ground + 6, w * 0.31, 58, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(w / 2, ground + 6, w * 0.31, 58, 0, 0, TAU);
    ctx.stroke();

    // far crowd hints
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 18; i++) {
      const x = w * 0.03 + (i / 17) * w * 0.94;
      const y = ground - 160 + Math.sin(i * 2.1) * 18;
      ctx.fillStyle = i % 3 === 0 ? '#0d0a08' : '#0a0807';
      ctx.beginPath();
      ctx.ellipse(x, y, 20, 44, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 44, 13, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // drifting smoke
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const x = w * (0.18 + i * 0.22) + Math.sin(now / 5400 + i) * 40;
      const y = ground - 210 + Math.cos(now / 6100 + i * 2) * 28;
      const rg = ctx.createRadialGradient(x, y, 4, x, y, 180);
      rg.addColorStop(0, 'rgba(200,175,140,0.022)');
      rg.addColorStop(1, 'rgba(200,175,140,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - 180, y - 180, 360, 360);
    }
    ctx.restore();
  }

  drawBanner(x, y, w, h, text, color) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, color); g.addColorStop(1, shade(color, -0.12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h - 18);
    ctx.lineTo(w / 2, h); ctx.lineTo(0, h - 18); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(240,224,188,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, h - 32);
    ctx.fillStyle = 'rgba(239,225,194,0.82)';
    ctx.font = `700 ${w * 0.56}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h * 0.43);
    ctx.restore();
  }

  drawLantern(x, y, s = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(80,54,32,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -140); ctx.lineTo(0, -48); ctx.stroke();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
    g.addColorStop(0, 'rgba(255,178,92,0.8)');
    g.addColorStop(0.35, 'rgba(210,86,44,0.45)');
    g.addColorStop(1, 'rgba(120,30,20,0.05)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 48, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,16,10,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 48, 0, 0, TAU); ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(i) * 9 + 4, 47, 0, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#2a1810'; ctx.fillRect(-20, -52, 40, 8); ctx.fillRect(-16, 46, 32, 7);
    ctx.restore();
  }

  drawGroundShadows() {
    const { ctx, ground, worldScale } = this;
    for (const key of ['player', 'enemy']) {
      const s = this.sides[key];
      if (!s.visible || !s.look) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(s.x, ground + 8, 72 * worldScale + s.scale * 10, 16 * worldScale, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawDecals() {
    const { ctx } = this;
    for (const d of this.decals) {
      ctx.save();
      ctx.fillStyle = `rgba(92,14,12,${d.a})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.28, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(60,8,8,${d.a * 0.8})`;
      for (let i = 0; i < 5; i++) {
        const a = i * 2.1;
        ctx.beginPath();
        ctx.ellipse(d.x + Math.cos(a) * d.r * 0.7, d.y + Math.sin(a) * d.r * 0.2, d.r * 0.16, d.r * 0.06, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'ring') {
        const t = 1 - p.life / p.max;
        ctx.save();
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.2 + t * 1.4), 0, TAU); ctx.stroke();
        ctx.restore();
      } else if (p.type === 'chi') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (p.type === 'dust') {
        ctx.save();
        ctx.globalAlpha = a * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.65, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawFloats() {
    const { ctx } = this;
    for (const f of this.floats) {
      const a = clamp(f.life / f.max * 1.8, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `900 ${f.size}px Impact, "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  drawScreenFx() {
    const { ctx, w, h } = this;
    if (this.flashA > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor || '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    // bottom fade
    const bg = ctx.createLinearGradient(0, h * 0.78, 0, h);
    bg.addColorStop(0, 'rgba(5,4,3,0)');
    bg.addColorStop(1, 'rgba(5,4,3,0.75)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  }

  drawFighter(key, now) {
    const s = this.sides[key];
    if (!s.look) return;
    const { ctx, ground, worldScale } = this;
    const look = s.look;
    const pose = s.pose;
    const time = now / 1000 + s.phase;
    const idle = s.tween ? 0 : 1;
    const lean = pose.lean + Math.sin(time * 1.65) * 1.3 * idle;
    const crouch = pose.crouch + Math.sin(time * 1.65 + 0.8) * 1.1 * idle;
    const headTilt = pose.headTilt + Math.sin(time * 1.3) * 1.5 * idle;
    const fSh = pose.fSh + Math.sin(time * 1.5) * 1.8 * idle;
    const bSh = pose.bSh + Math.sin(time * 1.55 + 1) * 1.8 * idle;
    const S = worldScale * s.scale * 1.16;
    const facing = s.facing;
    const rot = pose.rot;

    // geometry in local units with pelvis at 0,0
    const torso = 68, neckLen = 17, headOff = 27, headR = 19;
    const upA = 180 - lean;
    const chest = this.add(0, 0, upA, torso);
    const neck = this.add(chest.x, chest.y, upA + headTilt * 0.22, neckLen);
    const head = this.add(neck.x, neck.y, 180 + headTilt, headOff);
    const shF = { x: chest.x + 3, y: chest.y - 4 };
    const shB = { x: chest.x - 5, y: chest.y - 3 };
    const elF = this.add(shF.x, shF.y, fSh, 35);
    const wrF = this.add(elF.x, elF.y, pose.fEl, 32);
    const fistF = this.add(wrF.x, wrF.y, pose.fEl, 10);
    const elB = this.add(shB.x, shB.y, bSh, 35);
    const wrB = this.add(elB.x, elB.y, pose.bEl, 32);
    const fistB = this.add(wrB.x, wrB.y, pose.bEl, 10);
    const kneeF = this.add(0, 0, pose.fHip, 59);
    const ankleF = this.add(kneeF.x, kneeF.y, pose.fKnee, 55);
    const toeF = this.add(ankleF.x, ankleF.y, pose.fFoot, 19);
    const kneeB = this.add(0, 0, pose.bHip, 59);
    const ankleB = this.add(kneeB.x, kneeB.y, pose.bKnee, 55);
    const toeB = this.add(ankleB.x, ankleB.y, pose.bFoot, 19);
    const footMax = Math.max(toeF.y, toeB.y, ankleF.y, ankleB.y);

    const lift = rot ? 34 : footMax;
    const rootY = ground + pose.lungeY * S - (lift + crouch) * S * 0.96;
    const rootX = s.x + pose.lungeX * S;

    ctx.save();
    ctx.translate(rootX, rootY);
    ctx.scale(S * facing, S);
    if (rot) ctx.rotate(rad(rot));

    const skin = look.skin || '#c68a5e';
    const skinD = shade(skin, -0.11);
    const skinL = shade(skin, 0.07);
    const gi = look.gi || '#5a2c25';
    const giD = shade(gi, -0.1);
    const giL = shade(gi, 0.06);
    const trim = look.trim || '#d9b47a';
    const band = look.band || '#a33a2c';
    const hair = look.hair || '#171310';

    // back leg
    this.drawLimb(ctx, 0, 0, kneeB.x, kneeB.y, 22, giD, gi, 0.6);
    this.drawLimb(ctx, kneeB.x, kneeB.y, ankleB.x, ankleB.y, 15, shade(skin, -0.14), skinD, 0.5);
    this.drawFoot(ctx, ankleB, toeB, look, 0.75);

    // back arm
    this.drawLimb(ctx, shB.x, shB.y, elB.x, elB.y, 14, shade(gi, -0.12), giD, 0.7);
    this.drawLimb(ctx, elB.x, elB.y, wrB.x, wrB.y, 11, shade(skin, -0.13), skinD, 0.6);
    this.drawFist(ctx, fistB.x, fistB.y, 9.5, shade(skin, -0.12), band, 0.8);

    // torso
    this.drawTorso(ctx, chest, { x: 0, y: 0 }, lean, gi, giD, giL, trim);
    // belt
    this.drawBelt(ctx, 0, -2, lean, band, trim);

    // front leg
    this.drawLimb(ctx, 0, 0, kneeF.x, kneeF.y, 23, gi, giL, 0.9);
    this.drawLimb(ctx, kneeF.x, kneeF.y, ankleF.x, ankleF.y, 15.5, skin, skinL, 0.9);
    this.drawFoot(ctx, ankleF, toeF, look, 1);

    // neck
    ctx.strokeStyle = skin; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(chest.x, chest.y - 2); ctx.lineTo(neck.x, neck.y + 4); ctx.stroke();

    // head
    this.drawHead(ctx, head, headTilt, look, { skin, skinD, skinL, hair, band, trim }, time, key);

    // front arm
    this.drawLimb(ctx, shF.x, shF.y, elF.x, elF.y, 15, gi, giL, 1);
    this.drawLimb(ctx, elF.x, elF.y, wrF.x, wrF.y, 11.5, skin, skinL, 1);
    this.drawFist(ctx, fistF.x, fistF.y, 10, skin, band, 1);

    // condition wounds
    this.drawWounds(ctx, chest, head, look);

    // chi aura when casting
    if (s.tweenName === 'cast') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#e3b95a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(head.x, head.y + 40, 56, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // health flash
    if (s.flash > 0) {
      ctx.save();
      ctx.globalAlpha = s.flash * 0.4;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(rootX, ground - 100 * S, 70 * S, 120 * S, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  add(x, y, angle, len) {
    return { x: x + Math.sin(rad(angle)) * len, y: y + Math.cos(rad(angle)) * len };
  }

  drawLimb(ctx, x1, y1, x2, y2, width, color, light, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    // outer contour
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = width + 3.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // body
    const g = ctx.createLinearGradient(x1, y1 - width, x2, y2 + width);
    g.addColorStop(0, light);
    g.addColorStop(0.55, color);
    g.addColorStop(1, shade(color, -0.08));
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // highlight
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(1.4, width * 0.18);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * width * 0.2, ny = dx / len * width * 0.2;
    ctx.beginPath();
    ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny);
    ctx.stroke();
    ctx.restore();
  }

  drawFist(ctx, x, y, r, skin, band, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(x + 1.2, y + 1.5, r + 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = band; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, Math.PI * 0.1, Math.PI * 1.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,24,16,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.52, 0.2, 2.4); ctx.stroke();
    ctx.restore();
  }

  drawFoot(ctx, ankle, toe, look, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ankle.x, ankle.y); ctx.lineTo(toe.x, toe.y); ctx.stroke();
    ctx.strokeStyle = look.skin || '#c68a5e'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(ankle.x, ankle.y); ctx.lineTo(toe.x, toe.y); ctx.stroke();
    ctx.strokeStyle = look.band || '#a33a2c'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(ankle.x - 2, ankle.y); ctx.lineTo(ankle.x + 2, ankle.y + 8);
    ctx.stroke();
    ctx.strokeStyle = shade(look.skin || '#c68a5e', -0.12); ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(toe.x, toe.y); ctx.lineTo(toe.x + 4, toe.y + 4); ctx.stroke();
    ctx.restore();
  }

  drawTorso(ctx, chest, pelvis, lean, gi, giD, giL, trim) {
    const ang = rad(lean);
    const dx = Math.sin(ang), dy = -Math.cos(ang);
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const waist = 10, chestW = 17;
    const pts = [
      { x: pelvis.x - nx * waist, y: pelvis.y - ny * waist + 2 },
      { x: pelvis.x + nx * waist, y: pelvis.y + ny * waist - 2 },
      { x: chest.x + nx * chestW, y: chest.y + ny * chestW },
      { x: chest.x + nx * chestW * 0.9 + 2, y: chest.y - 3 },
      { x: chest.x - nx * chestW * 0.9 + 2, y: chest.y - 3 },
      { x: chest.x - nx * chestW, y: chest.y + ny * chestW },
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.quadraticCurveTo(pts[1].x - 4, pts[1].y + 8, pts[1].x, pts[1].y);
    ctx.quadraticCurveTo(chest.x + 22, chest.y + 20, pts[2].x, pts[2].y);
    ctx.quadraticCurveTo(chest.x + 10, chest.y - 12, pts[3].x, pts[3].y);
    ctx.quadraticCurveTo(chest.x - 8, chest.y - 14, pts[4].x, pts[4].y);
    ctx.quadraticCurveTo(chest.x - 22, chest.y + 18, pts[5].x, pts[5].y);
    ctx.closePath();
    const gg = ctx.createLinearGradient(chest.x, chest.y - 20, pelvis.x, pelvis.y + 20);
    gg.addColorStop(0, giL); gg.addColorStop(0.5, gi); gg.addColorStop(1, giD);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();

    // lapel / gi opening
    ctx.strokeStyle = trim; ctx.lineWidth = 3.2; ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(chest.x - 3, chest.y - 4);
    ctx.quadraticCurveTo(chest.x + 8, chest.y + 26, pelvis.x + 3, pelvis.y - 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(chest.x + 4, chest.y + 10);
    ctx.quadraticCurveTo(chest.x + 2, chest.y + 30, pelvis.x + 6, pelvis.y + 6);
    ctx.stroke();
    // folds
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const y = pelvis.y - 8 - i * 15;
      ctx.beginPath();
      ctx.moveTo(pelvis.x - 8 + i * 2, y);
      ctx.quadraticCurveTo(pelvis.x + 4, y + 4, pelvis.x + 14 - i, y - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBelt(ctx, x, y, lean, band, trim) {
    ctx.save();
    ctx.translate(x, y - 4);
    ctx.rotate(rad(lean * 0.1));
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade(band, 0.08);
    ctx.fillRect(-3, -2, 6, 9);
    ctx.strokeStyle = trim; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(9, -2); ctx.stroke();
    // tails
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = band; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 4); ctx.quadraticCurveTo(-14, 16, -10, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(10, 15, 7, 23); ctx.stroke();
    ctx.restore();
  }

  drawHead(ctx, head, tilt, look, colors, time, key) {
    const { skin, skinD, skinL, hair, band, trim } = colors;
    const hs = look.hairstyle || 'short';
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(rad(tilt * 0.35));
    // neck shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 16, 9, 5, 0, 0, TAU); ctx.fill();
    // skull
    const hg = ctx.createRadialGradient(-5, -5, 3, 0, 0, 23);
    hg.addColorStop(0, skinL); hg.addColorStop(0.6, skin); hg.addColorStop(1, skinD);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, 0, 19.5, 21, 0, 0, TAU); ctx.fill();
    // jaw
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-8, 19, 4, 21);
    ctx.quadraticCurveTo(14, 18, 17, 5); ctx.closePath(); ctx.fill();
    // ear
    ctx.fillStyle = skinD;
    ctx.beginPath(); ctx.ellipse(-15, 2, 4.4, 6, -0.2, 0, TAU); ctx.fill();
    // brow, eye, nose, mouth
    ctx.strokeStyle = 'rgba(38,24,18,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(14, -4); ctx.stroke();
    ctx.fillStyle = '#16100c';
    ctx.beginPath(); ctx.ellipse(10, -1, 2.1, 1.5, -0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(80,48,34,0.65)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(15, 3); ctx.lineTo(20, 8); ctx.lineTo(16, 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,38,30,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 13); ctx.quadraticCurveTo(11, 15, 15, 12); ctx.stroke();
    // cheek shadow
    ctx.strokeStyle = 'rgba(60,30,20,0.18)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, 10); ctx.quadraticCurveTo(8, 12, 12, 8); ctx.stroke();

    // hair
    ctx.fillStyle = hair;
    if (hs === 'bald') {
      ctx.strokeStyle = 'rgba(255,235,200,0.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-3, -6, 15, 3.6, 5.2); ctx.stroke();
      ctx.fillStyle = 'rgba(60,38,20,0.35)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(-10 + i * 6, -14 + (i % 2) * 3, 1, 0, TAU); ctx.fill();
      }
    } else if (hs === 'topknot') {
      ctx.beginPath(); ctx.ellipse(0, -10, 17, 13, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-2, -23, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = band; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(10, -15); ctx.stroke();
    } else if (hs === 'ponytail') {
      ctx.beginPath(); ctx.ellipse(0, -8, 17, 14, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = hair; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const sway = Math.sin(time * 2.3) * 4;
      ctx.beginPath(); ctx.moveTo(-12, -3);
      ctx.quadraticCurveTo(-27, 5 + sway, -24, 22 + sway); ctx.stroke();
      ctx.strokeStyle = shade(hair, 0.12); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, 1); ctx.quadraticCurveTo(-24, 8, -22, 19); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, -8, 18, 14, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-15, 2); ctx.lineTo(-10, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(14, 3); ctx.lineTo(10, -6); ctx.fill();
    }

    // headband
    if (hs !== 'bald' || look.band) {
      ctx.save();
      ctx.rotate(-0.08);
      ctx.fillStyle = band;
      ctx.fillRect(-17, -8, 34, 5.5);
      ctx.fillStyle = shade(band, 0.12);
      ctx.fillRect(-17, -8, 34, 1.6);
      // tails
      const sway = Math.sin(time * 2.6) * 3;
      ctx.strokeStyle = band; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, -5);
      ctx.quadraticCurveTo(-28, -2 + sway, -30, 8 + sway); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-16, -3);
      ctx.quadraticCurveTo(-25, 3 + sway, -26, 12 + sway); ctx.stroke();
      ctx.restore();
    }
    // beard
    if (look.beard) {
      ctx.fillStyle = hair;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-12, 8); ctx.quadraticCurveTo(-8, 26, 6, 22);
      ctx.quadraticCurveTo(17, 18, 16, 9);
      ctx.quadraticCurveTo(10, 16, 2, 15); ctx.quadraticCurveTo(-6, 15, -12, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // scar
    if (look.scar) {
      ctx.strokeStyle = 'rgba(214,142,120,0.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(18, 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,30,20,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(12 + i * 2, -8 + i * 3); ctx.lineTo(17 + i * 1.2, -6 + i * 3); ctx.stroke();
      }
    }
    // sweat / blood
    if (look.sweat) {
      ctx.fillStyle = 'rgba(200,225,235,0.4)';
      for (let i = 0; i < 3; i++) {
        const x = -10 + i * 8, y = -12 + (i % 2) * 6;
        ctx.beginPath(); ctx.ellipse(x, y, 1.3, 2.4, 0, 0, TAU); ctx.fill();
      }
    }
    if (look.blood) {
      ctx.strokeStyle = 'rgba(150,30,24,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(7, -12); ctx.quadraticCurveTo(10, -4, 8, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(120,20,16,0.7)';
      ctx.beginPath(); ctx.arc(8, 6, 2.1, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawWounds(ctx, chest, head, look) {
    // static wounds based on condition
    const c = this.sides[look.__side]?.condition;
    // (kept light; dynamic condition is painted through look.__headBlood)
  }
}
