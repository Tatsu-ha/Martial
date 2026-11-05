/* Game shell: save state, progression, navigation, mode setup. */

import {
  STYLES, STYLE_IDS, OPPONENTS, TOURNAMENT_ROUNDS, SURVIVAL_NAMES, SURVIVAL_STYLES,
  xpForLevel, starterCollection, defaultDeck, UNIVERSAL_UNLOCKS, ACHIEVEMENTS,
  CARD_BY_ID, CARDS, STYLE_CARD_IDS, BASE_CARD_IDS,
} from './data.js';
import { ArenaRenderer } from './render.js';
import { CombatUI } from './combat-ui.js';
import { sound } from './audio.js';
import {
  renderModes, renderDeck, renderDojo, openCardDetail, openStyleSelect, openHowTo,
  renderProfile, resolveCard,
} from './screens.js';

const SAVE_KEY = 'iron-lotus-save-v1';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function defaultSave() {
  const style = 'shaolin';
  return {
    initialized: false,
    version: 1,
    name: 'Kai',
    style,
    level: 1,
    xp: 0,
    essence: 40,
    attrPoints: 1,
    skillPoints: 1,
    attributes: { power: 0, guard: 0, agility: 0, spirit: 0 },
    perks: [],
    collection: starterCollection(style),
    cardLevels: {},
    deck: defaultDeck(style),
    campaign: 0,
    wins: 0,
    losses: 0,
    survivalBest: 0,
    tournamentChampion: false,
    achievements: [],
    totalDamage: 0,
    muted: false,
    look: { ...STYLES[style].look },
  };
}

export class GameUI {
  constructor() {
    this.save = this.loadSave();
    this.renderer = new ArenaRenderer($('arena'));
    this.combatUI = new CombatUI(this, this.renderer);
    this.currentScreen = 'menu';
    this.deckFilter = 'all';
    this.lastResult = null;
    this.bind();
    this.applyAudio();
    this.refreshProfile();
    this.configureMenuScene();
    this.showScreen('menu');
  }

  // ---------------- SAVE ----------------
  loadSave() {
    const base = defaultSave();
    let loaded = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) { loaded = null; }
    if (!loaded || typeof loaded !== 'object') return base;
    const save = { ...base, ...loaded };
    save.attributes = { ...base.attributes, ...(loaded.attributes || {}) };
    save.perks = Array.isArray(loaded.perks) ? loaded.perks : [];
    save.achievements = Array.isArray(loaded.achievements) ? loaded.achievements : [];
    save.cardLevels = loaded.cardLevels || {};
    save.collection = Array.isArray(loaded.collection) && loaded.collection.length ? loaded.collection : base.collection;
    // always keep the core curriculum and chosen path available
    for (const id of starterCollection(save.style)) {
      if (!save.collection.includes(id)) save.collection.push(id);
    }
    save.collection = [...new Set(save.collection.filter(id => CARD_BY_ID[id]))];
    save.deck = Array.isArray(loaded.deck) ? loaded.deck.filter(id => CARD_BY_ID[id] && save.collection.includes(id)) : [];
    save.deck = [...new Set(save.deck)];
    if (save.deck.length < 15) save.deck = defaultDeck(save.style);
    save.look = { ...(STYLES[save.style] || STYLES.shaolin).look };
    return save;
  }

  saveData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (e) { /* storage may be unavailable */ }
    this.refreshProfile();
  }

  refreshProfile() {
    renderProfile(this);
  }

  xpNeeded() { return xpForLevel(this.save.level); }

  applyAudio() {
    sound.setMuted(!!this.save.muted);
    $('soundBtn').textContent = this.save.muted ? '∅' : '♪';
    $('soundBtn').title = this.save.muted ? 'Enable sound' : 'Mute sound';
  }

  // ---------------- PROGRESSION ----------------
  initCharacter(style, name) {
    const s = this.save;
    s.initialized = true;
    s.name = name || 'Kai';
    s.style = style;
    s.collection = starterCollection(style);
    s.deck = defaultDeck(style);
    s.look = { ...STYLES[style].look };
    s.level = 1;
    s.xp = 0;
    s.essence = 40;
    s.attrPoints = 1;
    s.skillPoints = 1;
    s.attributes = { power: 0, guard: 0, agility: 0, spirit: 0 };
    s.perks = [];
    s.cardLevels = {};
    s.campaign = 0;
    s.wins = 0;
    s.losses = 0;
    s.survivalBest = 0;
    s.tournamentChampion = false;
    s.achievements = [];
    s.totalDamage = 0;
    this.saveData();
    this.configureMenuScene();
    this.toast(`${s.name} enters the Iron Lotus path.`, 'good', 'A NEW FIGHTER');
  }

  addXp(amount) {
    const s = this.save;
    s.xp += amount;
    let levels = 0;
    while (s.xp >= xpForLevel(s.level)) {
      s.xp -= xpForLevel(s.level);
      s.level++;
      s.attrPoints = (s.attrPoints || 0) + 1;
      s.skillPoints = (s.skillPoints || 0) + 1;
      levels++;
    }
    let unlocked = [];
    if (levels) {
      unlocked = this.unlockCardsForLevel();
      sound.levelUp();
      this.toast(`${s.level} levels of the path. +${levels} attribute and skill point${levels > 1 ? 's' : ''}.`, 'good', 'LEVEL UP');
    }
    this.saveData();
    return { levels, unlocked };
  }

  unlockCardsForLevel() {
    const s = this.save;
    const out = [];
    for (const u of UNIVERSAL_UNLOCKS) {
      if (s.level >= u.level) {
        for (const id of u.ids) {
          if (!s.collection.includes(id) && CARD_BY_ID[id]) {
            s.collection.push(id);
            out.push(CARD_BY_ID[id].name);
          }
        }
      }
    }
    if (s.collection.length >= 30) this.unlockAchievement('collector', true);
    return out;
  }

  unlockCardIds(ids = []) {
    const s = this.save;
    const out = [];
    for (const id of ids) {
      if (!s.collection.includes(id) && CARD_BY_ID[id]) {
        s.collection.push(id);
        out.push(CARD_BY_ID[id].name);
      }
    }
    if (out.length) sound.coin();
    if (s.collection.length >= 30) this.unlockAchievement('collector', true);
    return out;
  }

  unlockAchievement(id, silent = false) {
    const s = this.save;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach || s.achievements.includes(id)) return null;
    s.achievements.push(id);
    s.essence = (s.essence || 0) + ach.reward;
    if (!silent) this.toast(`Achievement: ${ach.name}. +${ach.reward} essence.`, 'good', 'HONOR');
    this.saveData();
    return ach;
  }

  // ---------------- NAV ----------------
  bind() {
    $('menuStart').addEventListener('click', () => {
      sound.init();
      sound.click();
      if (!this.save.initialized) openStyleSelect(this);
      else { this.renderModes(); this.showScreen('modes'); }
    });
    $('menuHow').addEventListener('click', () => { this.reactSound(); openHowTo(this); });
    $('brandBtn').addEventListener('click', () => {
      if (this.currentScreen === 'combat') return;
      this.showScreen('menu');
    });
    $('soundBtn').addEventListener('click', () => {
      this.save.muted = !this.save.muted;
      this.applyAudio();
      this.saveData();
      sound.init();
      sound.click();
    });
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentScreen === 'combat') return;
        sound.click();
        const nav = btn.dataset.nav;
        if (nav === 'campaign') { this.renderModes(); this.showScreen('modes'); }
        if (nav === 'deck') { this.renderDeck(); this.showScreen('deck'); }
        if (nav === 'dojo') { this.renderDojo(); this.showScreen('dojo'); }
      });
    });
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentScreen === 'modes') this.showScreen('menu');
        else { this.renderModes(); this.showScreen('modes'); }
      });
    });
    $('retreatBtn').addEventListener('click', () => this.confirmRetreat());
    window.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') {
        const modals = document.querySelectorAll('#overlayRoot .overlay.modal');
        if (modals.length) { modals[modals.length - 1].remove(); ev.preventDefault(); return; }
        if (document.querySelector('#overlayRoot .overlay.result-overlay')) return;
      }
      if (ev.key === 'Enter' && this.currentScreen === 'menu' && !document.querySelector('#overlayRoot .overlay')) {
        $('menuStart').click();
        return;
      }
      if (ev.key === 'Enter' && this.currentScreen === 'combat' && !document.querySelector('#overlayRoot .overlay')) {
        const endBtn = $('endTurnBtn');
        if (endBtn && !endBtn.disabled) { ev.preventDefault(); endBtn.click(); }
      }
    });
    window.addEventListener('pointerdown', () => sound.init(), { once: true });
  }

  reactSound() { sound.init(); sound.click(); }

  soundClick() { this.reactSound(); }

  toast(msg, kind = '', title = '') {
    const host = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${title ? `<b>${title}</b>` : ''}${msg}`;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3200);
  }

  clearModals() {
    document.querySelectorAll('#overlayRoot .overlay.modal').forEach(n => n.remove());
  }

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = $(`screen-${name}`);
    if (el) el.classList.remove('hidden');
    this.currentScreen = name;
    document.body.classList.toggle('in-combat', name === 'combat');
    if (name === 'menu') {
      this.refreshProfile();
      this.configureMenuScene();
    }
    this.combatUI.hud.hideTooltip();
  }

  configureMenuScene() {
    const style = STYLES[this.save.style] || STYLES.shaolin;
    const boss = OPPONENTS[OPPONENTS.length - 1];
    this.renderer.configure({
      player: { look: { ...style.look }, style: this.save.style },
      enemy: { look: { ...boss.look }, style: boss.style },
      menu: true,
    });
    this.renderer.sides.player.scale = 1;
    this.renderer.sides.enemy.scale = 1;
  }

  renderModes() { renderModes(this); }
  renderDeck() { renderDeck(this); }
  renderDojo() { renderDojo(this); }
  openCardDetail(id) { openCardDetail(this, id); }

  enterCombat() {
    this.clearModals();
    this.showScreen('combat');
    this.combatUI.hud.hideTooltip();
  }

  leaveCombat() {
    this.combatUI.cleanup(true);
    this.combatUI.combat = null;
    this.showScreen('modes');
    this.configureMenuScene();
  }

  confirmRetreat() {
    if (!this.combatUI.combat || this.combatUI.combat.over) return;
    this.clearModals();
    const overlay = document.createElement('div');
    overlay.className = 'overlay modal';
    overlay.innerHTML = `<div class="overlay-panel" style="width:min(430px,calc(100vw - 28px))">
      <div class="eyebrow"><span></span> LEAVE THE FLOOR</div>
      <h3 class="ov-title" style="margin-top:10px">ABANDON FIGHT?</h3>
      <p class="ov-body">Retreating forfeits all rewards and counts as a defeat. The body keeps its scars.</p>
      <div class="ov-actions"><button class="btn btn-danger" id="confirmQuit">RETREAT</button><button class="btn btn-ghost" id="cancelQuit">KEEP FIGHTING</button></div>
    </div>`;
    $('overlayRoot').appendChild(overlay);
    overlay.querySelector('#cancelQuit').onclick = () => overlay.remove();
    overlay.querySelector('#confirmQuit').onclick = () => {
      const mode = this.combatUI.context?.mode;
      if (mode && mode !== 'training') this.save.losses = (this.save.losses || 0) + 1;
      this.saveData();
      overlay.remove();
      this.combatUI.cleanup(true);
      this.leaveCombat();
      this.renderModes();
      this.showScreen('modes');
    };
  }

  // ---------------- MODE SETUP ----------------
  startCampaign(index) {
    const s = this.save;
    if (!s.initialized) { openStyleSelect(this); return; }
    if (index > s.campaign || index >= OPPONENTS.length) {
      this.toast('That gatekeeper is still locked.', 'bad', 'LOCKED');
      return;
    }
    const def = OPPONENTS[index];
    const difficulty = 1 + Math.max(0, s.level - def.level) * 0.03;
    this.startFight(def, 'campaign', { index, difficulty });
  }

  startTournament(round = 0, carry = null) {
    if (round >= TOURNAMENT_ROUNDS.length) {
      this.toast('The bracket is complete.', 'good', 'CHAMPION');
      this.renderModes(); this.showScreen('modes');
      return;
    }
    const info = TOURNAMENT_ROUNDS[round];
    const base = OPPONENTS.find(o => o.id === info.opponent) || OPPONENTS[0];
    const def = { ...base, title: `${info.name} · ${base.title}` };
    const difficulty = 1 + round * 0.07;
    this.startFight(def, 'tournament', { round, difficulty, carry });
  }

  makeSurvivalDef(wave) {
    const style = SURVIVAL_STYLES[(wave - 1) % SURVIVAL_STYLES.length];
    const st = STYLES[style];
    const name = SURVIVAL_NAMES[(wave - 1) % SURVIVAL_NAMES.length];
    const deck = [...BASE_CARD_IDS, ...(STYLE_CARD_IDS[style] || [])];
    if (wave >= 3) deck.push('pressure_point', 'chi_burst');
    if (wave >= 5) deck.push('silent_death', 'thousand_fists');
    if (wave >= 7) deck.push('blood_palm', 'heart_seeker');
    if (wave >= 9) deck.push('dim_mak', 'five_point_palm');
    const hp = Math.round(82 + wave * 17 + this.save.level * 2);
    return {
      id: `survival_${wave}`,
      name,
      title: `The Pit · Wave ${wave}`,
      style,
      level: wave,
      hp,
      stamina: 100 + wave * 3,
      deck,
      ai: {
        aggro: 0.7 + Math.min(0.25, wave * 0.02),
        guard: 0.12 + Math.min(0.28, wave * 0.022),
        dodge: 0.05 + Math.min(0.18, wave * 0.015),
        counter: 0.03 + Math.min(0.16, wave * 0.012),
        stance: 0.18 + Math.min(0.24, wave * 0.018),
        targetSmart: 0.3 + Math.min(0.55, wave * 0.04),
      },
      look: { ...st.look, seed: wave, scar: true, blood: wave > 4 },
      desc: `The pit sends another body. Wave ${wave} does not care about your injuries.`,
      reward: { xp: 40 + wave * 22, essence: 10 + wave * 6 },
    };
  }

  startSurvival(wave = 1, carry = null) {
    const def = this.makeSurvivalDef(wave);
    const difficulty = 1 + (wave - 1) * 0.07;
    this.startFight(def, 'survival', { wave, difficulty, carry });
  }

  startTraining() {
    const def = {
      id: 'dummy',
      name: 'Training Dummy',
      title: 'Straw, Wood & Patience',
      style: 'shaolin',
      level: 1,
      hp: 280 + this.save.level * 10,
      stamina: 200,
      deck: ['lead_jab'],
      ai: { aggro: 0, guard: 0, dodge: 0, counter: 0, stance: 0, targetSmart: 0 },
      look: { skin: '#8b6a3f', hair: '#3b2a17', hairstyle: 'bald', gi: '#6d5732', trim: '#b39a5c', band: '#8f2a22', beard: false, scar: false, dummy: true },
      desc: 'A dummy of straw and hardwood. It does not hit back. For now.',
      reward: { xp: 0, essence: 0 },
    };
    this.startFight(def, 'training', {});
  }

  async startFight(def, mode, opts = {}) {
    sound.init();
    this.clearModals();
    this.lastResult = null;
    try {
      await this.combatUI.start(def, mode, opts);
    } catch (err) {
      console.error(err);
      this.toast('The fight could not begin. Check the console.', 'bad', 'ERROR');
      this.leaveCombat();
      this.renderModes();
      this.showScreen('modes');
    }
  }
}
