/* Combat orchestration: hooks, animation, reactions, result flow. */

import { Combat } from './engine.js';
import { CombatHUD } from './hud.js';
import { runReaction } from './reaction.js';
import { sound } from './audio.js';
import { STYLES, OPPONENTS, TOURNAMENT_ROUNDS, SURVIVAL_NAMES, SURVIVAL_STYLES, xpForLevel } from './data.js';
import { clamp } from './helpers.js';

const BOSS_UNLOCKS = {
  0: ['pressure_point'],
  1: ['chi_burst'],
  2: ['iron_body'],
  3: ['silent_death'],
  4: ['blood_palm', 'heart_seeker'],
  5: ['thousand_fists', 'dim_mak', 'five_point_palm'],
};

const ACH_INFO = {
  first_blood: 'Win your first fight',
  perfect: 'Land 5 perfect reactions in one fight',
  headhunter: 'Win by cranial trauma',
  iron_will: 'Win with more than 85% health',
  survivor: 'Reach survival wave 5',
  champion: 'Win the Iron Lotus tournament',
  forbidden: 'Use a forbidden technique',
  collector: 'Own 30 techniques',
};

export class CombatUI {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.hud = new CombatHUD(renderer);
    this.combat = null;
    this.context = null;
    this.resultOverlay = null;
    this.rewardsSnapshot = null;
    this.hud.onPlay = card => this.play(card);
    this.hud.onEndTurn = () => this.endTurn();
    this.hooks = this.makeHooks();
  }

  async start(def, mode, opts = {}) {
    this.cleanup(true);
    this.context = { mode, def, ...opts };
    this.game.enterCombat();
    this.combat = new Combat({
      mode,
      save: this.game.save,
      enemyDef: def,
      hooks: this.hooks,
      training: mode === 'training',
      difficulty: opts.difficulty || 1,
    });
    if (opts.carry) {
      const c = opts.carry;
      const p = this.combat.player;
      p.hp = clamp(c.hp, 1, p.maxHp);
      p.stamina = clamp(c.stamina, 0, p.maxStamina);
      if (c.body) p.body = { ...c.body };
      p.chi = 3;
    }
    this.hud.reset({ player: def.playerName || this.game.save.name, enemy: def.name });
    this.hud.update(this.combat);
    await this.combat.start();
  }

  cleanup(full = true) {
    this.hud.hideTooltip();
    this.hud.hideIncoming();
    if (full) {
      if (this.resultOverlay) { this.resultOverlay.remove(); this.resultOverlay = null; }
      this.renderer.resetCamera();
    }
  }

  play(card) {
    if (!this.combat) return;
    sound.click();
    this.hud.hideTooltip();
    this.combat.play(card);
  }

  endTurn() {
    if (!this.combat || this.combat.busy || this.combat.phase !== 'player' || this.combat.over) return;
    sound.click();
    this.combat.endTurn();
  }

  makeHooks() {
    return {
      configure: (meta) => {
        this.hud.configure(meta);
        this.renderer.configure({
          player: { ...meta.player, look: { ...meta.player.look } },
          enemy: { ...meta.enemy, look: { ...meta.enemy.look } },
          menu: false,
        });
        this.hud.update(this.combat);
      },
      state: () => this.hud.update(this.combat),
      banner: (title, sub, kind) => this.hud.banner(title, sub, kind),
      log: (msg, kind) => this.hud.log(msg, kind),
      attackChallenge: (card, params) => {
        this.hud.hideTooltip();
        return runReaction({ mode: 'attack', card, params, enemyName: this.combat.enemy.name });
      },
      defenseChallenge: async (card, params, enemy) => {
        this.hud.showIncoming(card, enemy.name);
        const q = await runReaction({ mode: 'defense', card, params, enemyName: enemy.name });
        this.hud.hideIncoming();
        return q;
      },
      animateAttack: async (side, anim, quality, onImpact) => {
        sound.whoosh();
        await this.renderer.attack(side, anim, quality, onImpact);
      },
      animateCast: async (side, onImpact) => {
        sound.chi();
        await this.renderer.cast(side, onImpact);
      },
      animateCounter: async (side, onImpact) => {
        sound.whoosh();
        await this.renderer.counter(side, onImpact);
      },
      hit: (side, info) => this.onHit(side, info),
      playerDefense: (kind) => {
        const k = kind === 'perfectDodge' ? 'dodge' : kind === 'perfectBlock' || kind === 'block' ? 'block' : 'hit';
        if (k !== 'hit') this.renderer.setPose('player', k === 'dodge' ? 'dodge' : 'guard', 120);
      },
      enemyReact: (kind) => {
        this.renderer.setPose('enemy', kind === 'dodge' ? 'dodge' : 'guard', 120);
        this.renderer.addFloat(kind === 'dodge' ? 'EVADED' : 'GUARDED', this.renderer.sides.enemy.x, this.renderer.ground - 220, kind === 'dodge' ? '#8ac9a8' : '#6f9fc9', 24);
      },
      stanceFx: (side, color) => {
        this.renderer.stanceEffect(side, color);
        sound.chi();
      },
      ko: async (winner, loser, cause) => {
        sound.ko();
        this.renderer.flash('#e7d9c2', 0.4);
        await this.renderer.ko(winner, loser, cause);
      },
      onEnd: (result) => this.handleResult(result),
      achievement: (id) => {
        if (id === 'perfect' && this.combat.stats.perfects < 5) return;
        this.game.unlockAchievement(id, true);
      },
      tip: (text) => this.game.toast(text, 'good', 'TRAINING'),
      denied: (reason) => this.game.toast(reason, 'bad', 'CANNOT PLAY'),
      resetForTurn: () => { this.hud.hideIncoming(); this.renderer.resetCamera(); },
      enemyIntent: () => {},
    };
  }

  onHit(side, info) {
    if (!info) return;
    const heavy = !!info.heavy;
    if (info.outcome === 'dodged' || info.outcome === 'perfectDodge') {
      this.renderer.setPose(side, 'dodge', 110);
    } else if (info.outcome === 'guarded' || info.outcome === 'perfectBlock' || info.outcome === 'block') {
      this.renderer.setPose(side, 'guard', 110);
    } else {
      this.renderer.reactHit(side, heavy);
    }
    if (info.damage > 0) {
      this.renderer.hitEffect(side, {
        blood: info.blood || 0,
        chi: info.chi,
        heavy,
        text: `-${info.damage}`,
        color: info.quality === 'perfect' ? '#f1c66d' : info.chi ? '#e6b455' : '#e7d9c2',
        ring: true,
      });
      if (heavy) sound.heavyHit(); else sound.hit(1);
      this.renderer.shake(heavy ? 13 : 6, 220);
    } else {
      this.renderer.hitEffect(side, {
        blood: 0,
        heavy: false,
        text: info.label || 'BLOCKED',
        color: info.outcome === 'dodged' ? '#8ac9a8' : '#8fb6d9',
        ring: true,
      });
      sound.block();
    }
    if (info.status) {
      const s = this.renderer.sides[side];
      this.renderer.addFloat(info.status, s.x, this.renderer.ground - 250, '#d9a441', 13);
    }
    this.hud.update(this.combat);
  }

  // ---------------- RESULT FLOW ----------------
  handleResult(result) {
    if (!this.combat) return;
    const won = result.winner === 'player';
    const mode = this.context.mode;
    const def = this.context.def;
    const save = this.game.save;

    if (mode !== 'training') {
      if (won) save.wins = (save.wins || 0) + 1;
      else save.losses = (save.losses || 0) + 1;
      save.totalDamage = (save.totalDamage || 0) + (result.stats.damage || 0);
    }

    let xp = 0, essence = 0;
    const baseReward = def.reward || { xp: 60, essence: 14 };
    if (mode === 'training') {
      xp = won ? 8 : 0;
      essence = 0;
    } else if (won) {
      xp = baseReward.xp;
      essence = baseReward.essence;
      if (mode === 'survival') {
        xp = 40 + this.context.wave * 22;
        essence = 10 + this.context.wave * 6;
      }
      if (mode === 'tournament') {
        xp = Math.round(xp * (1 + this.context.round * 0.15));
        essence = Math.round(essence * (1 + this.context.round * 0.2));
      }
    } else {
      xp = Math.round(baseReward.xp * 0.25);
      essence = Math.round(baseReward.essence * 0.15);
    }

    const levelBefore = save.level;
    const levelInfo = xp > 0 ? this.game.addXp(xp) : { levels: 0, unlocked: [] };
    const levelsUp = save.level - levelBefore;
    save.essence = (save.essence || 0) + essence;

    const unlocked = [...(levelInfo.unlocked || [])];
    if (mode === 'campaign' && won) {
      const idx = this.context.index;
      save.campaign = Math.max(save.campaign || 0, idx + 1);
      const extra = BOSS_UNLOCKS[idx] || [];
      const names = this.game.unlockCardIds(extra);
      unlocked.push(...names);
    }
    if (mode === 'survival' && won) {
      save.survivalBest = Math.max(save.survivalBest || 0, this.context.wave);
    }
    if (mode === 'tournament' && won && this.context.round >= TOURNAMENT_ROUNDS.length - 1) {
      save.tournamentChampion = true;
    }

    const ach = [];
    if (mode !== 'training') {
      if (won) {
        ach.push('first_blood');
        if (result.cause.includes('CRANIAL')) ach.push('headhunter');
        if (result.playerHp >= result.playerMaxHp - 15) ach.push('iron_will');
      }
      if (mode === 'survival' && won && this.context.wave >= 5) ach.push('survivor');
      if (mode === 'tournament' && won && this.context.round >= TOURNAMENT_ROUNDS.length - 1) ach.push('champion');
    }
    if (save.collection.length >= 30) ach.push('collector');
    const newAchievements = [];
    for (const id of ach) {
      const a = this.game.unlockAchievement(id, true);
      if (a) newAchievements.push(a);
    }

    const carry = {
      hp: result.playerHp,
      stamina: result.player.stamina,
      body: { ...result.player.body },
    };
    if (mode === 'tournament' || mode === 'survival') {
      const healPct = mode === 'tournament' ? 0.22 : 0.16;
      carry.hp = Math.round(Math.min(result.playerMaxHp, result.playerHp + result.playerMaxHp * healPct));
      carry.stamina = Math.round(Math.min(result.player.maxStamina, result.player.stamina + result.player.maxStamina * 0.25));
    }

    this.game.saveData();
    this.renderResult({ result, won, mode, xp, essence, levelsUp, unlocked, newAchievements, carry });
  }

  renderResult({ result, won, mode, xp, essence, levelsUp, unlocked, newAchievements, carry }) {
    this.cleanup(true);
    const def = this.context.def;
    const overlay = document.createElement('div');
    overlay.className = 'overlay result-overlay';
    const title = won ? 'VICTORY' : (mode === 'training' ? 'DRILL OVER' : 'DEFEAT');
    const kicker = won ? (mode === 'training' ? 'DRILL COMPLETE' : 'THE LOTUS OPENS') : 'THE FLOOR REMEMBERS';
    const quote = won ? '“A fight ends when the will ends. Yours did not.”' : '“Fall. Learn the shape of the floor. Rise.”';
    const actions = this.resultActions(won, mode, carry);
    const rewardRows = [];
    if (xp) rewardRows.push(`<div class="reward-row"><span>EXPERIENCE</span><b>+${xp} XP</b></div>`);
    if (essence) rewardRows.push(`<div class="reward-row"><span>ESSENCE</span><b>+${essence} ◆</b></div>`);
    if (levelsUp) rewardRows.push(`<div class="reward-row unlock"><span>LEVEL UP</span><b>LEVEL ${this.game.save.level} · +1 ATTR · +1 SKILL</b></div>`);
    for (const name of unlocked) rewardRows.push(`<div class="reward-row unlock"><span>TECHNIQUE UNLOCKED</span><b>${name.toUpperCase()}</b></div>`);
    for (const a of newAchievements) rewardRows.push(`<div class="reward-row unlock"><span>ACHIEVEMENT</span><b>${a.name.toUpperCase()} · +${a.reward} ◆</b></div>`);
    if (mode === 'survival' && won) rewardRows.push(`<div class="reward-row"><span>WAVE CLEARED</span><b>${this.context.wave} · BEST ${this.game.save.survivalBest}</b></div>`);
    if (!rewardRows.length) rewardRows.push('<div class="reward-row"><span>NO REWARDS</span><b>—</b></div>');

    overlay.innerHTML = `<div class="result-panel">
      <div class="result-kicker">${kicker}</div>
      <div class="result-title ${won ? '' : 'loss'}">${title}</div>
      <div class="result-cause">${def.name.toUpperCase()} · <b>${result.cause}</b> · ROUND ${result.turn}</div>
      <div class="result-stats">
        <div class="result-stat"><b>${result.stats.damage}</b><span>DAMAGE DEALT</span></div>
        <div class="result-stat"><b>${result.stats.perfects}</b><span>PERFECT READS</span></div>
        <div class="result-stat"><b>${result.stats.counters || 0}</b><span>COUNTERS</span></div>
        <div class="result-stat"><b>${result.turn}</b><span>ROUNDS</span></div>
      </div>
      <div class="result-rewards">${rewardRows.join('')}</div>
      <div class="result-actions">${actions}</div>
      <div class="result-quote">${quote}</div>
    </div>`;
    document.getElementById('overlayRoot').appendChild(overlay);
    this.resultOverlay = overlay;
    overlay.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'primary') this.primaryAction(won, mode, carry);
      else this.exitToModes();
    });
    sound[wornOrWon(won)]?.();
  }

  resultActions(won, mode, carry) {
    const back = `<button class="btn btn-ghost" data-act="back">RETURN TO PATH</button>`;
    if (mode === 'campaign') {
      const idx = this.context.index;
      if (won && idx + 1 < OPPONENTS.length) return `<button class="btn btn-primary" data-act="primary">NEXT OPPONENT →</button>${back}`;
      if (!won) return `<button class="btn btn-primary" data-act="primary">RETRY FIGHT →</button>${back}`;
      return `<button class="btn btn-primary" data-act="back">RETURN TO PATH</button>`;
    }
    if (mode === 'tournament') {
      const final = this.context.round >= TOURNAMENT_ROUNDS.length - 1;
      if (won && !final) return `<button class="btn btn-primary" data-act="primary">NEXT ROUND →</button>${back}`;
      if (!won) return `<button class="btn btn-primary" data-act="primary">RETRY BRACKET →</button>${back}`;
      return `<button class="btn btn-primary" data-act="back">CLAIM THE TITLE</button>`;
    }
    if (mode === 'survival') {
      if (won) return `<button class="btn btn-primary" data-act="primary">NEXT WAVE →</button>${back}`;
      return `<button class="btn btn-primary" data-act="primary">FIGHT AGAIN →</button>${back}`;
    }
    if (mode === 'training') {
      return `<button class="btn btn-primary" data-act="primary">RESET DRILL →</button>${back}`;
    }
    return back;
  }

  primaryAction(won, mode, carry) {
    const g = this.game;
    if (mode === 'campaign') {
      if (won) g.startCampaign(this.context.index + 1);
      else g.startCampaign(this.context.index);
      return;
    }
    if (mode === 'tournament') {
      if (!won) { g.startTournament(0); return; }
      g.startTournament(this.context.round + 1, carry);
      return;
    }
    if (mode === 'survival') {
      g.startSurvival(won ? this.context.wave + 1 : 1, won ? carry : null);
      return;
    }
    if (mode === 'training') { g.startTraining(); return; }
    this.exitToModes();
  }

  exitToModes() {
    this.cleanup(true);
    this.game.leaveCombat();
    this.game.renderModes();
    this.game.showScreen('modes');
  }
}

function wornOrWon(won) { return won ? 'levelUp' : 'fail'; }
