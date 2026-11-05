/* Combat engine: turns, cards, damage, body damage, AI. */

import { CARD_BY_ID, STYLES, cardLevelStats } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const BODY_LABEL = {
  head: 'Head', neck: 'Neck', chest: 'Chest', heart: 'Heart',
  abdomen: 'Abdomen', arms: 'Arms', legs: 'Legs', joints: 'Joints',
};

const KO_CAUSE = {
  head: 'CRANIAL TRAUMA',
  neck: 'CERVICAL FRACTURE',
  chest: 'RESPIRATORY COLLAPSE',
  heart: 'CARDIAC ARREST',
  abdomen: 'INTERNAL HEMORRHAGE',
  legs: 'LEG FRACTURE — CANNOT STAND',
};

const QUALITY_LABEL = { perfect: 'PERFECT', good: 'CLEAN', weak: 'GLANCING', fail: 'MISSED' };

export function conditionMods(f) {
  const b = f.body;
  const m = {
    damage: 1, part: 1, guard: 1, dodge: 1, reaction: 1,
    chiRegen: 0, staminaRegen: 1, staminaMax: 1, notes: [],
  };
  if (b.arms < 60) { m.damage *= 0.9; m.guard *= 0.92; }
  if (b.arms < 35) { m.damage *= 0.8; m.guard *= 0.84; }
  if (b.arms < 15) { m.damage *= 0.65; m.guard *= 0.7; m.notes.push('ARMS BROKEN'); }
  if (b.head < 60) { m.reaction *= 0.9; }
  if (b.head < 35) { m.reaction *= 0.82; m.chiRegen -= 1; m.notes.push('CONCUSSED'); }
  if (b.head < 15) { m.reaction *= 0.7; m.chiRegen -= 1; m.notes.push('BLURRED VISION'); }
  if (b.joints < 55) m.reaction *= 0.9;
  if (b.joints < 25) { m.reaction *= 0.72; m.notes.push('JOINTS WRECKED'); }
  if (b.legs < 55) m.dodge *= 0.85;
  if (b.legs < 25) { m.dodge *= 0.55; m.notes.push('LEGS FAILING'); }
  if (b.chest < 55) { m.staminaMax *= 0.9; m.staminaRegen *= 0.8; }
  if (b.chest < 25) { m.staminaRegen *= 0.55; m.notes.push('CANNOT BREATHE'); }
  if (b.neck < 50) { m.staminaRegen *= 0.8; }
  if (b.neck < 20) m.notes.push('NECK TRAUMA');
  if (b.heart < 55) m.chiRegen -= 1;
  if (b.heart < 25) { m.chiRegen -= 1; m.notes.push('HEART STRAIN'); }
  if (b.abdomen < 45) m.guard *= 0.88;
  if (b.abdomen < 20) { m.staminaRegen *= 0.7; m.notes.push('RUPTURED CORE'); }
  return m;
}

function makePlayerFighter(save) {
  const style = STYLES[save.style] || STYLES.shaolin;
  const attrs = save.attributes || { power: 0, guard: 0, agility: 0, spirit: 0 };
  const perks = new Set(save.perks || []);
  const chiMax = Math.round(5 + attrs.spirit * 0.34 + (save.style === 'shaolin' ? 1 : 0));
  const staminaMax = 100 + (perks.has('marathon') ? 25 : 0);
  return {
    side: 'player', name: save.name || 'Kai', style: save.style,
    title: `Level ${save.level} ${style.short}`,
    look: { ...style.look },
    level: save.level, attrs, perks,
    hp: 110 + (save.level - 1) * 3, maxHp: 110 + (save.level - 1) * 3,
    stamina: staminaMax, maxStamina: staminaMax,
    chi: 3, maxChi: chiMax,
    body: { head: 100, neck: 100, chest: 100, heart: 100, abdomen: 100, arms: 100, legs: 100, joints: 100 },
    statuses: { bleed: 0, poison: 0, stun: 0, expose: 0, weaken: 0, focus: 0, slow: 0, guard: 0, counter: null, dodgeBuff: 0 },
    lastStandUsed: false,
    dealt: 0, taken: 0,
  };
}

export function makeEnemyFighter(def, difficulty = 1, opts = {}) {
  const style = STYLES[def.style] || STYLES.shaolin;
  const scale = opts.scale || 1;
  const hp = Math.round((def.hp || 100) * difficulty * scale);
  return {
    side: 'enemy', name: def.name, style: def.style, title: def.title,
    look: def.look || style.look,
    level: def.level || 1,
    attrs: { power: 0, guard: 0, agility: 0, spirit: 0 },
    perks: new Set(),
    hp, maxHp: hp,
    stamina: def.stamina || 100, maxStamina: def.stamina || 100,
    chi: 3, maxChi: 6,
    body: { head: 100, neck: 100, chest: 100, heart: 100, abdomen: 100, arms: 100, legs: 100, joints: 100 },
    statuses: { bleed: 0, poison: 0, stun: 0, expose: 0, weaken: 0, focus: 0, slow: 0, guard: 0, counter: null, dodgeBuff: 0 },
    ai: def.ai || { aggro: 0.75, guard: 0.18, dodge: 0.08, counter: 0.06, stance: 0.22, targetSmart: 0.4 },
    deck: def.deck || [],
    difficulty,
    dealt: 0, taken: 0,
  };
}

export class Combat {
  constructor({ mode, save, enemyDef, hooks, training = false, difficulty = 1 }) {
    this.mode = mode || 'campaign';
    this.save = save;
    this.hooks = hooks;
    this.training = training;
    this.difficulty = difficulty;
    this.player = makePlayerFighter(save);
    this.enemy = makeEnemyFighter(enemyDef, difficulty, { scale: mode === 'survival' ? 1 : 1 });
    this.enemyDef = enemyDef;
    this.turn = 1;
    this.phase = 'player';
    this.busy = false;
    this.over = false;
    this.hand = [];
    this.discard = [];
    this.drawPile = [];
    this.stats = { damage: 0, taken: 0, perfects: 0, misses: 0, turns: 0, forbidden: 0, counters: 0 };
    this.turnStart = performance.now();
    this.buildDeck();
  }

  get fx() { return this.hooks; }

  buildDeck() {
    const ids = (this.save.deck && this.save.deck.length >= 12 ? this.save.deck : this.save.collection.slice(0, 20));
    const pile = ids.map(id => {
      const base = CARD_BY_ID[id];
      if (!base) return null;
      const lvl = (this.save.cardLevels && this.save.cardLevels[id]) || 1;
      return cardLevelStats(base, lvl);
    }).filter(Boolean);
    this.drawPile = this.shuffle(pile);
  }

  buildEnemyDeck() {
    const out = [];
    const ids = this.enemy.deck && this.enemy.deck.length ? this.enemy.deck : ['lead_jab', 'low_kick', 'body_hook', 'front_kick'];
    for (const id of ids) {
      const base = CARD_BY_ID[id];
      if (!base) continue;
      const lvl = 1 + Math.floor((this.enemy.level - 1) / 2);
      const c = cardLevelStats(base, lvl);
      out.push({ ...c, dmg: Math.round(c.dmg * (1 + (this.enemy.level - 1) * 0.04) * (this.mode === 'survival' ? 1 + (this.difficulty - 1) * 0.5 : 1)) });
    }
    // AI uses a virtual shuffle bag
    this.enemyDeckSource = out.length ? out : [CARD_BY_ID.lead_jab];
    this.enemyBag = this.shuffle(this.enemyDeckSource);
    this.enemyHand = [];
    this.drawEnemy(3);
  }

  shuffle(a) {
    const arr = [...a];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  drawEnemy(n) {
    for (let i = 0; i < n; i++) {
      if (!this.enemyBag.length) this.enemyBag = this.shuffle(this.enemyDeckSource || []);
      if (!this.enemyBag.length) break;
      this.enemyHand.push(this.enemyBag.pop());
    }
  }

  drawCards(n) {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 6) break;
      if (!this.drawPile.length) {
        this.drawPile = this.shuffle(this.discard);
        this.discard = [];
        if (!this.drawPile.length) break;
        this.fx.log('Technique deck reshuffled.', 'muted');
      }
      const c = this.drawPile.pop();
      c.uid = c.uid || `c${Math.random().toString(36).slice(2, 9)}`;
      this.hand.push(c);
      drawn++;
    }
    return drawn;
  }

  async start() {
    this.buildEnemyDeck();
    this.fx.configure({
      player: { look: this.player.look, style: this.player.style },
      enemy: { look: this.enemy.look, style: this.enemy.style },
      names: { player: this.player.name, enemy: this.enemy.name },
    });
    this.fx.state();
    this.fx.banner('FIGHT', `${this.player.name.toUpperCase()}  vs  ${this.enemy.name.toUpperCase()}`, 'fight');
    this.fx.log(`${this.enemy.name} — ${this.enemy.title}. ${this.enemyDef.desc || ''}`, 'intro');
    await sleep(900);
    this.drawCards(5);
    await this.startPlayerTurn(true);
  }

  regen(f) {
    const mods = conditionMods(f);
    f.chi = clamp(f.chi + 2 + (f.style === 'shaolin' ? 1 : 0) + mods.chiRegen + (f.perks?.has('deep_breath') ? 1 : 0) + (this.mode === 'training' && f.side === 'player' ? 2 : 0), 0, f.maxChi);
    f.stamina = clamp(f.stamina + Math.round(9 * mods.staminaRegen) + (f.style === 'shaolin' ? 2 : 0), 0, f.maxStamina);
  }

  tickStatuses(f) {
    const st = f.statuses;
    const msgs = [];
    if (st.bleed > 0) {
      const d = 2 + st.bleed;
      f.hp -= d;
      f.stamina = Math.max(0, f.stamina - st.bleed);
      msgs.push(`Bleeding: ${d} damage.`);
      st.bleed = Math.max(0, st.bleed - 1);
    }
    if (st.poison > 0) {
      const d = 3 + st.poison;
      f.hp -= d;
      if (Math.random() < 0.5) f.body.heart = Math.max(0, f.body.heart - st.poison);
      msgs.push(`Venom: ${d} damage.`);
      st.poison = Math.max(0, st.poison - 1);
    }
    if (st.expose > 0) st.expose--;
    if (st.weaken > 0) st.weaken--;
    if (st.slow > 0) st.slow--;
    if (msgs.length) this.fx.log(msgs.join(' '), 'status');
    return msgs;
  }

  async startPlayerTurn(first = false) {
    if (this.over) return;
    this.phase = 'player';
    this.busy = false;
    this.turnStart = performance.now();
    const p = this.player;
    p.statuses.guard = 0;
    p.statuses.counter = null;
    p.statuses.dodgeBuff = 0;
    this.regen(p);
    const tick = this.tickStatuses(p);
    if (p.statuses.stun > 0) {
      p.statuses.stun--;
      this.fx.banner('STUNNED', `${p.name} cannot act`, 'bad');
      this.fx.log(`${p.name} is stunned and loses the turn.`, 'bad');
      await sleep(1250);
      if (this.checkKO(p, 'player')) return;
      await this.endTurn(true);
      return;
    }
    if (!first) {
      this.drawCards(2);
      this.fx.banner('YOUR MOVE', `Round ${this.turn} — choose your technique`, 'turn');
    }
    this.fx.state();
    this.fx.log(`Round ${this.turn}. Your turn.`, 'turn');
    this.checkTrainingTip();
  }

  checkTrainingTip() {
    if (!this.training) return;
    const tips = [
      'Tip: aim for injured body parts. A broken leg shuts down evasion.',
      'Tip: perfect timing is worth 40% more damage. Watch the gold band.',
      'Tip: guard cards protect you during the enemy phase, even if you also attack.',
      'Tip: a counter stance turns a perfect defense into automatic damage.',
      'Tip: Stamina runs out before health. End a combo before you are gasping.',
    ];
    this.fx.tip?.(pick(tips));
  }

  canPlay(card) {
    if (this.over) return { ok: false, reason: 'Fight over' };
    if (this.phase !== 'player' || this.busy) return { ok: false, reason: 'Wait' };
    if (this.hand.indexOf(card) < 0) return { ok: false, reason: 'Not in hand' };
    if (card.cost > this.player.chi) return { ok: false, reason: `Need ${card.cost} Chi` };
    if (card.stamina > this.player.stamina) return { ok: false, reason: `Need ${card.stamina} Stamina` };
    return { ok: true };
  }

  async play(card) {
    const check = this.canPlay(card);
    if (!check.ok) {
      this.fx.log(check.reason, 'bad');
      this.fx.denied?.(check.reason);
      return;
    }
    this.busy = true;
    const p = this.player;
    p.chi = Math.max(0, p.chi - card.cost);
    let stam = card.stamina;
    if (p.style === 'wingchun' && !this.firstStrikeUsed && card.type !== 'stance' && card.type !== 'counter') {
      stam = Math.max(0, stam - 1);
      this.firstStrikeUsed = true;
    }
    p.stamina = Math.max(0, p.stamina - stam);
    this.removeFromHand(card);
    this.discard.push(card);
    if (card.rarity === 'forbidden') {
      this.stats.forbidden++;
      this.fx.achievement?.('forbidden');
    }
    if (card.effect?.selfDamage) {
      p.hp -= card.effect.selfDamage;
      this.fx.log(`${card.name} exacts a price: ${card.effect.selfDamage} health.`, 'bad');
    }
    this.fx.state();

    if (card.type === 'stance' || card.type === 'counter' || card.type === 'chi' && card.dmg === 0) {
      await this.resolveStance(card);
      this.busy = false;
      this.fx.state();
      return;
    }

    if (card.type === 'chi' && card.dmg > 0) {
      // offensive chi strike — still a challenge
    }

    const params = this.attackParams(card);
    const quality = await this.fx.attackChallenge(card, params);
    if (quality === 'perfect') { this.stats.perfects++; this.fx.achievement?.('perfect'); }
    if (quality === 'fail') this.stats.misses++;
    const outcome = this.rollEnemyDefense(card, quality);
    const calc = this.calcDamage(p, this.enemy, card, quality, outcome);
    const label = `${QUALITY_LABEL[quality] || ''} ${card.name}`.trim();
    this.fx.log(`You execute ${card.name} — ${QUALITY_LABEL[quality]}.${outcome === 'dodged' ? ` ${this.enemy.name} slips it.` : outcome === 'guarded' ? ` ${this.enemy.name} blocks.` : ''}`, quality === 'perfect' ? 'perfect' : 'player');
    let ko = null;
    let counterDmg = 0;
    await this.fx.animateAttack('player', card.anim, quality, () => {
      if (outcome === 'dodged') {
        this.fx.enemyReact('dodge', label);
        this.fx.log(`${this.enemy.name} evades completely.`, 'enemy');
        return;
      }
      if (calc.total > 0) {
        this.applyDamage(p, this.enemy, card, calc, quality, outcome);
        this.fx.hit('enemy', {
          damage: calc.total, part: calc.part, partDamage: calc.partDmg, quality, outcome, label,
          heavy: calc.total >= 20, blood: card.type === 'forbidden' || card.effect?.bleed ? 12 : card.anim === 'punch' ? 2 : 0,
          chi: card.type === 'chi' || card.type === 'forbidden', status: this.statusSummary(card),
        });
        this.stats.damage += calc.total;
        p.dealt += calc.total;
        ko = this.checkKO(this.enemy, 'enemy');
      } else {
        this.fx.hit('enemy', { damage: 0, part: calc.part, quality, outcome: 'guarded', label, status: 'BLOCKED' });
      }
    });

    if (outcome === 'countered' && !ko) {
      counterDmg = Math.round(6 + this.enemy.level * 1.5 + rand(0, 4));
      await sleep(160);
      this.fx.log(`${this.enemy.name} counters the opening!`, 'enemy');
      await this.fx.animateCounter('enemy', () => {
        this.damageSimple(this.enemy, this.player, counterDmg, pick(['head', 'chest', 'abdomen']), 1.1);
        this.fx.hit('player', { damage: counterDmg, part: 'head', quality: 'good', outcome: 'hit', label: 'COUNTER', heavy: false, blood: 4 });
        ko = this.checkKO(this.player, 'player');
      });
    }
    this.fx.state();
    if (ko) { await this.finish(ko.winner, ko.cause); return; }
    this.busy = false;
    this.fx.state();
  }

  removeFromHand(card) {
    const i = this.hand.indexOf(card);
    if (i >= 0) this.hand.splice(i, 1);
  }

  async resolveStance(card) {
    const p = this.player;
    const eff = card.effect || {};
    const st = p.statuses;
    if (eff.guard) {
      st.guard = clamp(st.guard + eff.guard, 0, 0.86);
      p.statuses.guardTurns = 1;
    }
    if (eff.counter) {
      st.counter = { dmg: eff.counter, part: eff.counterPart || 'head', name: card.name };
      st.guard = clamp(st.guard + 0.1, 0, 0.9);
    }
    if (eff.heal) { p.hp = Math.min(p.maxHp, p.hp + eff.heal); }
    if (eff.stamina) p.stamina = Math.min(p.maxStamina, p.stamina + eff.stamina);
    if (eff.chi) p.chi = Math.min(p.maxChi, p.chi + eff.chi);
    if (eff.focus) st.focus = clamp(st.focus + eff.focus, 0, 0.6);
    if (eff.dodgeBuff) st.dodgeBuff = clamp(st.dodgeBuff + eff.dodgeBuff, 0, 0.8);
    if (eff.weaken) this.enemy.statuses.weaken += eff.weaken;
    if (eff.expose) this.enemy.statuses.expose += eff.expose;
    if (eff.chiOnPerfect) st.chiOnPerfect = (st.chiOnPerfect || 0) + eff.chiOnPerfect;
    this.fx.log(`You set ${card.name}. ${this.stanceSummary(card)}`, 'stance');
    await this.fx.animateCast('player', () => {
      this.fx.stanceFx('player', STYLES[p.style]?.color || '#d9a441');
    });
    this.fx.state();
  }

  stanceSummary(card) {
    const e = card.effect || {};
    const parts = [];
    if (e.guard) parts.push(`Guard ${Math.round(e.guard * 100)}%`);
    if (e.counter) parts.push(`Counter ${e.counter}`);
    if (e.heal) parts.push(`+${e.heal} Health`);
    if (e.stamina) parts.push(`+${e.stamina} Stamina`);
    if (e.chi) parts.push(`+${e.chi} Chi`);
    if (e.expose) parts.push('Exposes enemy');
    if (e.weaken) parts.push('Weakens enemy');
    if (e.focus) parts.push('Focus up');
    return parts.join(' · ');
  }

  statusSummary(card) {
    const e = card.effect || {};
    const parts = [];
    if (e.bleed) parts.push(`BLEED ${e.bleed}`);
    if (e.poison) parts.push(`VENOM ${e.poison}`);
    if (e.expose) parts.push(`EXPOSED ${e.expose}`);
    if (e.slow) parts.push(`SLOWED ${e.slow}`);
    if (e.heart) parts.push('HEART HIT');
    return parts.join(' · ');
  }

  attackParams(card) {
    const mods = conditionMods(this.player);
    const st = this.player.statuses;
    const style = STYLES[this.player.style];
    let perfect = 0.075 * mods.reaction * (1 + (this.player.attrs.agility || 0) * 0.028) * (1 + st.focus) * (1 + (style.mods?.reaction || 0));
    if (this.player.perks.has('eagle_eye')) perfect *= 1.18;
    if (this.training) perfect *= 1.25;
    const good = 0.185 * (-0.2 + mods.reaction * 1.2) + perfect;
    let speed = (card.speed || 1) * (0.94 + (1 - this.player.stamina / this.player.maxStamina) * 0.35) * (1 + st.slow * 0.06);
    return {
      perfect: clamp(perfect, 0.035, 0.16),
      good: clamp(good, 0.12, 0.32),
      speed: clamp(speed, 0.8, 1.8),
      focus: st.focus,
      kind: 'attack',
    };
  }

  defenseParams(card) {
    const mods = conditionMods(this.player);
    const st = this.player.statuses;
    const style = STYLES[this.player.style];
    let perfect = 0.09 * mods.dodge * (1 + (this.player.attrs.agility || 0) * 0.03) * (1 + st.dodgeBuff) * (1 + (style.mods?.dodge || 0));
    if (this.player.perks.has('eagle_eye')) perfect *= 1.18;
    if (this.training) perfect *= 1.25;
    const good = 0.2 * mods.dodge * (1 + st.dodgeBuff * 0.5) + perfect;
    let speed = 0.98 * (1 + st.slow * 0.05) * (1 + (this.enemy.level - 1) * 0.025);
    return {
      perfect: clamp(perfect, 0.04, 0.18),
      good: clamp(good, 0.13, 0.34),
      speed: clamp(speed, 0.8, 1.6),
      kind: 'defense',
    };
  }

  rollEnemyDefense(card, quality) {
    const e = this.enemy;
    const ai = e.ai;
    const mods = conditionMods(e);
    let dodge = ai.dodge + (this.difficulty - 1) * 0.03 + (e.statuses.slow || 0) * 0.02;
    let guard = ai.guard + (this.difficulty - 1) * 0.03 + e.statuses.guard;
    let counter = ai.counter + (this.difficulty - 1) * 0.01;
    if (quality === 'perfect') { dodge *= 0.55; guard *= 0.65; counter *= 0.4; }
    if (quality === 'weak' || quality === 'fail') { dodge *= 0.6; guard *= 0.8; }
    if (card.effect?.pierce) guard *= 1 - card.effect.pierce * 0.7;
    dodge *= mods.dodge;
    guard *= mods.guard;
    const roll = Math.random();
    if (roll < dodge * 0.5) return 'dodged';
    if (roll < dodge * 0.5 + guard * 0.8) return 'guarded';
    if (roll > 1 - counter) return 'countered';
    return 'hit';
  }

  calcDamage(attacker, defender, card, quality, outcome) {
    const am = conditionMods(attacker);
    const dm = conditionMods(defender);
    const style = STYLES[attacker.style];
    let base = card.dmg * (card.hits || 1);
    base += (attacker.attrs.power || 0) * 2.2;
    base += (attacker.level - 1) * (attacker.side === 'enemy' ? 1.2 : 0.6);
    if (style.mods?.strike && card.tags.includes('strike')) base *= 1 + style.mods.strike;
    if (style.mods?.kick && card.tags.includes('kick')) base *= 1 + style.mods.kick;
    if (attacker.statuses.weaken > 0) base *= 0.8;
    if (attacker.statuses.focus > 0) base *= 1.05;
    if (defender.statuses.expose > 0) base *= 1.22;
    base *= am.damage;
    if (attacker.perks?.has('killer') && defender.hp / defender.maxHp < 0.35) base *= 1.12;
    base *= 0.86 + 0.22 * (attacker.stamina / attacker.maxStamina);
    const q = { perfect: 1.42, good: 1, weak: 0.66, fail: 0.34 }[quality] || 1;
    base *= q;
    if (outcome === 'dodged') base = 0;
    if (outcome === 'guarded') base *= 0.56;
    if (outcome === 'countered') base *= 1.02;
    // guard stance and passive guard
    let guard = defender.statuses.guard || 0;
    guard *= 1 - (card.effect?.pierce || 0);
    guard += (defender.attrs.guard || 0) * 0.015;
    if (defender.style === 'shotokan') guard += 0.05;
    guard *= dm.guard;
    if (card.effect?.pierce) guard *= 1 - card.effect.pierce * 0.5;
    guard = clamp(guard, 0, 0.82);
    base *= 1 - guard;
    if (quality === 'perfect' && Math.random() < 0.18) base *= 1.25;
    const total = Math.max(0, Math.round(base));
    let partDmg = total * (card.partDmg || 1.15) * (1 + (card.effect?.partBonus || 0));
    if (attacker.perks?.has('bone_breaker')) partDmg *= 1.15;
    if (style.mods?.joint && (card.part === 'joints' || card.part === 'neck')) partDmg *= 1 + style.mods.joint;
    partDmg = Math.round(partDmg);
    return { total, partDmg, part: card.part, guard };
  }

  applyDamage(attacker, defender, card, calc, quality, outcome) {
    const def = defender;
    const eff = card.effect || {};
    def.hp = Math.max(0, def.hp - calc.total);
    def.taken += calc.total;
    if (calc.part && def.body[calc.part] != null) {
      def.body[calc.part] = Math.max(0, def.body[calc.part] - calc.partDmg);
      const part = calc.part;
      this.fx.log(`${BODY_LABEL[part]} damage: ${calc.partDmg} (${def.body[part]}% integrity).`, 'damage');
    }
    if (eff.heart && def.body.heart != null) {
      const hd = Math.round(calc.partDmg * eff.heart * 0.7);
      def.body.heart = Math.max(0, def.body.heart - hd);
      this.fx.log(`The heart is struck for ${hd} integrity.`, 'damage');
    }
    // stamina damage
    const style = STYLES[attacker.style];
    let stamDmg = eff.staminaDamage || 0;
    if (style.mods?.staminaDamage) stamDmg = Math.round(stamDmg * (1 + style.mods.staminaDamage));
    if (attacker.style === 'muaythai' && (card.tags.includes('elbow') || card.tags.includes('knee'))) stamDmg += 4;
    if (stamDmg) {
      def.stamina = Math.max(0, def.stamina - stamDmg);
      this.fx.log(`${def.name} loses ${stamDmg} Stamina.`, 'status');
    }
    if (eff.bleed) {
      let stacks = eff.bleed;
      if (attacker.style === 'muaythai' && (card.tags.includes('elbow') || card.tags.includes('knee'))) stacks += 1;
      def.statuses.bleed += stacks;
      this.fx.log(`${def.name} is bleeding (${def.statuses.bleed}).`, 'bad');
    }
    if (eff.poison) {
      def.statuses.poison += eff.poison;
      this.fx.log(`${def.name} is poisoned (${def.statuses.poison}).`, 'bad');
    }
    if (eff.expose) def.statuses.expose += eff.expose;
    if (eff.slow) def.statuses.slow += eff.slow;
    if (eff.weaken) def.statuses.weaken += eff.weaken;
    if (eff.stun && Math.random() < eff.stun) {
      def.statuses.stun = Math.max(def.statuses.stun, 1);
      this.fx.log(`${def.name} is stunned!`, 'perfect');
    }
    if (eff.knockdown && Math.random() < eff.knockdown) {
      def.statuses.stun = Math.max(def.statuses.stun, 1);
      this.fx.log(`${def.name} is knocked down!`, 'perfect');
    }
    if (eff.stagger) def.stamina = Math.max(0, def.stamina - 5);
    if (eff.lifesteal) {
      const heal = Math.round(calc.total * eff.lifesteal);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      this.fx.log(`${attacker.name} drains ${heal} health.`, 'status');
    }
    if (eff.chi) attacker.chi = Math.min(attacker.maxChi, attacker.chi + eff.chi);
    if (eff.selfStamina) attacker.stamina = Math.max(0, attacker.stamina - eff.selfStamina);
    if (def.statuses.stun > 0 && defender.body.head < 20) def.statuses.stun = Math.max(def.statuses.stun, 1);
  }

  damageSimple(attacker, defender, total, part, partMultiplier = 1) {
    defender.hp = Math.max(0, defender.hp - total);
    defender.taken += total;
    if (part && defender.body[part] != null) defender.body[part] = Math.max(0, defender.body[part] - Math.round(total * partMultiplier));
    attacker.dealt += total;
  }

  async endTurn(fromStun = false) {
    if (this.over) return;
    this.busy = true;
    this.phase = 'enemy';
    this.fx.state();
    this.fx.banner('ENEMY TURN', `${this.enemy.name} is moving`, 'enemy');
    this.fx.log(`${this.enemy.name}'s turn.`, 'enemy');
    await sleep(800);
    await this.enemyTurn();
  }

  async enemyTurn() {
    if (this.over) return;
    const e = this.enemy;
    const p = this.player;
    const mods = conditionMods(e);
    e.statuses.guard = 0;
    e.statuses.counter = null;
    e.statuses.dodgeBuff = 0;
    this.regen(e);
    this.tickStatuses(e);
    this.fx.state();
    if (this.checkKO(e, 'enemy')) { await this.finish('player', this.lastKO?.cause || 'EXHAUSTION'); return; }
    if (e.statuses.stun > 0) {
      e.statuses.stun--;
      this.fx.banner('STUNNED', `${e.name} loses the turn`, 'perfect');
      this.fx.log(`${e.name} is stunned and cannot attack.`, 'perfect');
      this.fx.state();
      await sleep(1200);
      await this.nextRound();
      return;
    }
    if (this.training) {
      await sleep(500);
      this.fx.log('The training dummy does not retaliate.', 'muted');
      await this.nextRound();
      return;
    }

    this.drawEnemy(2);
    // defensive stance
    if (Math.random() < e.ai.stance && e.chi >= 1) {
      e.chi = Math.max(0, e.chi - 1);
      const kind = Math.random();
      if (kind < 0.6) {
        e.statuses.guard = clamp(e.statuses.guard + 0.38 + Math.random() * 0.14, 0, 0.72);
        this.fx.log(`${e.name} settles into a tight guard.`, 'enemy');
      } else if (kind < 0.85) {
        e.statuses.counter = { dmg: 6 + Math.round(e.level * 1.6), part: pick(['head', 'joints', 'abdomen']) };
        e.statuses.guard = clamp(e.statuses.guard + 0.18, 0, 0.6);
        this.fx.log(`${e.name} baits you into a counter stance.`, 'enemy');
      } else {
        e.chi = Math.min(e.maxChi, e.chi + 1);
        e.stamina = Math.min(e.maxStamina, e.stamina + 12);
        this.fx.log(`${e.name} breathes and recovers.`, 'enemy');
      }
      this.fx.stanceFx('enemy', STYLES[e.style]?.color || '#a33a2c');
      this.fx.state();
      await sleep(620);
    }

    let attacks = 0;
    const maxAttacks = e.chi >= 3 ? 2 : 1;
    while (attacks < maxAttacks && !this.over) {
      const affordable = this.enemyHand.filter(c => c.cost <= e.chi && c.stamina <= e.stamina);
      if (!affordable.length) break;
      const card = this.chooseEnemyCard(affordable);
      e.chi = Math.max(0, e.chi - card.cost);
      e.stamina = Math.max(0, e.stamina - card.stamina);
      const idx = this.enemyHand.indexOf(card);
      if (idx >= 0) this.enemyHand.splice(idx, 1);
      this.fx.log(`${e.name} attacks with ${card.name}.`, 'enemy');
      this.fx.enemyIntent?.(card);
      const params = this.defenseParams(card);
      const quality = await this.fx.defenseChallenge(card, params, e);
      if (quality === 'perfect') { this.stats.perfects++; this.fx.achievement?.('perfect'); }
      const result = quality === 'perfect' ? (p.statuses.guard > 0 ? 'perfectBlock' : (p.statuses.dodgeBuff > 0 || Math.random() < 0.5 ? 'perfectDodge' : 'perfectBlock')) : quality === 'good' ? 'block' : quality === 'weak' ? 'graze' : 'hit';
      const counter = p.statuses.counter;
      const isCounter = quality === 'perfect' && counter;
      const dmgMult = result === 'perfectBlock' || result === 'perfectDodge' ? 0 : result === 'block' ? 0.34 : result === 'graze' ? 0.72 : 1.08;
      const calc = this.calcDamage(e, p, card, quality, 'hit');
      calc.total = Math.round(calc.total * dmgMult);
      calc.partDmg = Math.round(calc.partDmg * (result === 'hit' ? 1.1 : dmgMult || 0.25));
      this.fx.log(`${e.name}'s ${card.name} — you read it ${QUALITY_LABEL[quality]}.`, quality === 'perfect' ? 'perfect' : 'enemy');

      let ko = null;
      await this.fx.animateAttack('enemy', card.anim, quality, () => {
        if (isCounter) {
          this.fx.playerDefense('perfectDodge');
          this.fx.hit('player', { damage: 0, part: card.part, quality, outcome: 'dodged', label: 'PERFECT EVASION', status: 'COUNTER READY' });
          return;
        }
        if (calc.total <= 0) {
          this.fx.playerDefense(result);
          this.fx.hit('player', { damage: 0, part: card.part, quality, outcome: result, label: result === 'perfectBlock' ? 'PERFECT GUARD' : 'PERFECT EVASION', status: result === 'perfectBlock' ? 'GUARDED' : 'EVADED' });
          if (p.statuses.chiOnPerfect) {
            p.chi = Math.min(p.maxChi, p.chi + p.statuses.chiOnPerfect);
            p.statuses.chiOnPerfect = 0;
          }
        } else {
          this.fx.playerDefense(result === 'block' ? 'block' : 'hit');
          this.damageSimple(e, p, calc.total, calc.part, 1.1);
          // enemy card status effects apply to player
          const eff = card.effect || {};
          if (eff.bleed) p.statuses.bleed += eff.bleed;
          if (eff.staminaDamage) p.stamina = Math.max(0, p.stamina - Math.round(eff.staminaDamage * 0.7));
          if (eff.slow) p.statuses.slow += eff.slow;
          if (eff.expose) p.statuses.expose += eff.expose;
          if (eff.stun && Math.random() < eff.stun * 0.5) p.statuses.stun = Math.max(p.statuses.stun, 1);
          if (eff.heart) p.body.heart = Math.max(0, p.body.heart - Math.round(calc.partDmg * eff.heart * 0.5));
          this.stats.taken += calc.total;
          this.fx.hit('player', {
            damage: calc.total, part: calc.part, partDamage: calc.partDmg, quality, outcome: result,
            label: result === 'block' ? 'BLOCKED' : result === 'graze' ? 'GRAZED' : 'HIT',
            heavy: calc.total >= 18, blood: card.effect?.bleed ? 10 : 2, chi: card.type === 'forbidden',
            status: this.statusSummary(card),
          });
          ko = this.checkKO(p, 'player');
        }
      });
      if (ko) { await this.finish(ko.winner, ko.cause); return; }
      if (isCounter) {
        const cdmg = Math.round(counter.dmg * (this.player.perks.has('counter_master') ? 1.45 : 1));
        await sleep(220);
        this.fx.log(`COUNTER! ${this.player.name} answers with ${counter.name}.`, 'perfect');
        await this.fx.animateCounter('player', () => {
          this.damageSimple(p, e, cdmg, counter.part, 1.25);
          this.fx.hit('enemy', { damage: cdmg, part: counter.part, quality: 'perfect', outcome: 'hit', label: 'COUNTER', heavy: true, blood: 8, chi: true });
          this.stats.damage += cdmg;
          this.stats.counters++;
          p.statuses.counter = null;
          this.fx.state();
          ko = this.checkKO(e, 'enemy');
        });
        if (ko) { await this.finish(ko.winner, ko.cause); return; }
      }
      if (result === 'perfectBlock' || result === 'perfectDodge') {
        p.chi = Math.min(p.maxChi, p.chi + (this.player.perks.has('flow') ? 2 : 1));
      }
      this.fx.state();
      await sleep(300);
      attacks++;
    }
    if (this.over) return;
    await this.nextRound();
  }

  chooseEnemyCard(affordable) {
    const e = this.enemy;
    const p = this.player;
    if (!affordable.length) return null;
    const smart = e.ai.targetSmart || 0.4;
    if (Math.random() < smart) {
      // target the most damaged part
      let worstPart = 'head', worst = 101;
      for (const [part, val] of Object.entries(p.body)) if (val < worst) { worst = val; worstPart = part; }
      const matching = affordable.filter(c => c.part === worstPart);
      if (matching.length) return pick(matching);
      const near = affordable.filter(c => c.effect?.heart || c.part === 'chest' || c.part === 'neck');
      if (near.length) return pick(near);
    }
    const weighted = [];
    for (const c of affordable) {
      let w = 1 + c.dmg * 0.12;
      if (c.type === 'forbidden') w *= 0.55;
      if (c.part === 'head' || c.part === 'heart') w *= 1.2;
      for (let i = 0; i < Math.max(1, Math.round(w)); i++) weighted.push(c);
    }
    return pick(weighted);
  }

  async nextRound() {
    if (this.over) return;
    this.turn++;
    this.stats.turns = this.turn;
    this.firstStrikeUsed = false;
    this.fx.resetForTurn?.();
    await sleep(450);
    await this.startPlayerTurn();
  }

  checkKO(fighter, side) {
    if (this.over) return null;
    let cause = null;
    const b = fighter.body;
    // part-based knockout first
    const order = ['head', 'heart', 'neck', 'chest', 'abdomen', 'legs'];
    for (const part of order) {
      if (b[part] <= 0) { cause = KO_CAUSE[part]; break; }
    }
    if (!cause && fighter.hp <= 0) cause = 'LOSS OF CONSCIOUSNESS';
    if (!cause && fighter.stamina <= 0) cause = 'EXHAUSTION';
    if (!cause) return null;
    // Last Stand perk
    if (side === 'player' && fighter.perks?.has('last_stand') && !fighter.lastStandUsed && (fighter.hp <= 0 || fighter.stamina <= 0) && b.head > 0 && b.heart > 0 && b.neck > 0 && b.chest > 0) {
      fighter.lastStandUsed = true;
      fighter.hp = Math.min(fighter.maxHp, 1);
      fighter.stamina = Math.max(12, fighter.stamina);
      fighter.body.head = Math.max(4, b.head);
      fighter.body.heart = Math.max(4, b.heart);
      fighter.body.chest = Math.max(4, b.chest);
      fighter.statuses.stun = 0;
      this.fx.log('LAST STAND — the body refuses to fall.', 'perfect');
      this.fx.banner('LAST STAND', 'One more breath. One more strike.', 'perfect');
      this.fx.state();
      return null;
    }
    this.lastKO = { winner: side === 'player' ? 'enemy' : 'player', loser: side, cause };
    fighter.hp = Math.max(0, fighter.hp);
    return this.lastKO;
  }

  async finish(winner, cause) {
    if (this.finished) return;
    this.finished = true;
    this.over = true;
    this.busy = true;
    this.phase = 'over';
    const loserSide = winner === 'player' ? 'enemy' : 'player';
    this.fx.log(`${winner === 'player' ? this.enemy.name + ' is finished' : this.player.name + ' is finished'}. ${cause}.`, winner === 'player' ? 'perfect' : 'bad');
    this.fx.state();
    await this.fx.ko(winner, loserSide, cause);
    const result = {
      winner, cause, mode: this.mode, turn: this.turn,
      stats: { ...this.stats, turns: this.turn },
      playerHp: this.player.hp, playerMaxHp: this.player.maxHp,
      enemyHp: this.enemy.hp, enemyMaxHp: this.enemy.maxHp,
      player: this.player, enemy: this.enemy,
      enemyDef: this.enemyDef,
    };
    this.fx.onEnd(result);
  }

  // ---------- UI helpers ----------
  chiPips() {
    return { cur: this.player.chi, max: this.player.maxChi };
  }

  statusList(side) {
    const f = side === 'player' ? this.player : this.enemy;
    const st = f.statuses;
    const list = [];
    if (st.guard > 0) list.push({ key: 'guard', label: `GUARD ${Math.round(st.guard * 100)}%`, color: '#6f9fc9' });
    if (st.counter) list.push({ key: 'counter', label: 'COUNTER READY', color: '#e0a33e' });
    if (st.stun > 0) list.push({ key: 'stun', label: 'STUNNED', color: '#e0c33e' });
    if (st.bleed > 0) list.push({ key: 'bleed', label: `BLEED ${st.bleed}`, color: '#cf3f3f' });
    if (st.poison > 0) list.push({ key: 'poison', label: `VENOM ${st.poison}`, color: '#8bc34a' });
    if (st.expose > 0) list.push({ key: 'expose', label: `EXPOSED ${st.expose}`, color: '#cf7a3f' });
    if (st.weaken > 0) list.push({ key: 'weaken', label: `WEAKENED ${st.weaken}`, color: '#a89a7a' });
    if (st.slow > 0) list.push({ key: 'slow', label: `SLOWED ${st.slow}`, color: '#7a9ab0' });
    if (st.focus > 0) list.push({ key: 'focus', label: 'FOCUS', color: '#d9a441' });
    if (st.dodgeBuff > 0) list.push({ key: 'dodge', label: 'EVASION', color: '#8ac9a8' });
    return list;
  }
}
