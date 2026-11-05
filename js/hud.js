/* Combat HUD: bars, anatomy, status, hand, log, banners. */

import { STYLES } from './data.js';
import { miniPortraitSVG } from './art.js';
import { BODY_SVG, bodyPartList, cardMarkup, paintBody, pipsMarkup, tooltipMarkup, partLabel } from './helpers.js';

const $ = id => document.getElementById(id);

export class CombatHUD {
  constructor(renderer) {
    this.renderer = renderer;
    this.names = { player: 'KAI', enemy: 'OPPONENT' };
    this.logs = [];
    this.onPlay = null;
    this.onEndTurn = null;
    this.onCardHover = null;
    this.combat = null;
    this.handSig = '';
    this.bodyInit = false;
    this.bind();
  }

  bind() {
    this.handEl = $('hand');
    this.handEl.addEventListener('click', ev => {
      const el = ev.target.closest('.tcard');
      if (!el || !this.combat || el.classList.contains('disabled')) return;
      const card = this.combat.hand.find(c => c.uid === el.dataset.uid);
      if (card && this.onPlay) this.onPlay(card);
    });
    this.handEl.addEventListener('mouseover', ev => {
      const el = ev.target.closest('.tcard');
      if (!el || !this.combat) return;
      const card = this.combat.hand.find(c => c.uid === el.dataset.uid);
      if (card) this.showTooltip(card, el.getBoundingClientRect());
    });
    this.handEl.addEventListener('mouseout', ev => {
      if (ev.target.closest('.tcard')) this.hideTooltip();
    });
    $('endTurnBtn').addEventListener('click', () => this.onEndTurn?.());
    $('logToggle').parentElement.addEventListener('click', () => {
      $('combatLog').classList.toggle('collapsed');
      $('logToggle').textContent = $('combatLog').classList.contains('collapsed') ? '+' : '−';
    });
  }

  reset(names) {
    this.names = names || this.names;
    this.logs = [];
    $('logEntries').innerHTML = '';
    this.bodyInit = false;
    $('playerBody').innerHTML = '';
    $('enemyBody').innerHTML = '';
    $('playerPortrait').innerHTML = '';
    $('enemyPortrait').innerHTML = '';
    this.hideIncoming();
    $('combatLog').classList.remove('collapsed');
  }

  configure(meta) {
    this.names = meta.names || this.names;
    const pStyle = STYLES[meta.player?.style] || STYLES.shaolin;
    const eStyle = STYLES[meta.enemy?.style] || STYLES.shaolin;
    $('playerPortrait').innerHTML = miniPortraitSVG(meta.player?.style || 'shaolin', meta.player?.look || pStyle.look);
    $('enemyPortrait').innerHTML = miniPortraitSVG(meta.enemy?.style || 'shaolin', meta.enemy?.look || eStyle.look);
    $('playerBody').innerHTML = '';
    $('enemyBody').innerHTML = '';
    this.bodyInit = false;
    $('playerHud').style.setProperty('--accent', pStyle.color);
    $('enemyHud').style.setProperty('--accent', eStyle.color);
  }

  update(combat) {
    if (!combat) return;
    this.combat = combat;
    const p = combat.player, e = combat.enemy;
    const pStyle = STYLES[p.style] || STYLES.shaolin;
    const eStyle = STYLES[e.style] || STYLES.shaolin;

    $('playerName').textContent = this.names.player.toUpperCase();
    $('enemyName').textContent = this.names.enemy.toUpperCase();
    $('playerStyle').textContent = `${pStyle.name.toUpperCase()} · LV ${p.level}`;
    $('enemyStyle').textContent = `${eStyle.name.toUpperCase()} · LV ${e.level}`;

    this.setBar('playerHp', p.hp, p.maxHp);
    this.setBar('playerSta', p.stamina, p.maxStamina);
    this.setBar('enemyHp', e.hp, e.maxHp);
    this.setBar('enemySta', e.stamina, e.maxStamina);
    $('playerHpNum').textContent = `${Math.max(0, Math.round(p.hp))}`;
    $('playerStaNum').textContent = `${Math.max(0, Math.round(p.stamina))}`;
    $('enemyHpNum').textContent = `${Math.max(0, Math.round(e.hp))}`;
    $('enemyStaNum').textContent = `${Math.max(0, Math.round(e.stamina))}`;

    $('playerChi').innerHTML = pipsMarkup(p.chi, p.maxChi);
    $('enemyChi').innerHTML = pipsMarkup(e.chi, e.maxChi);
    $('playerFocus').textContent = p.statuses.focus > 0 ? `FOCUS +${Math.round(p.statuses.focus * 100)}%` : '';
    $('enemyFocus').textContent = e.statuses.guard > 0 ? `GUARD ${Math.round(e.statuses.guard * 100)}%` : '';

    if (!this.bodyInit) {
      $('playerBody').innerHTML = BODY_SVG;
      $('enemyBody').innerHTML = BODY_SVG;
      this.bodyInit = true;
    }
    paintBody($('playerBody'), p.body);
    paintBody($('enemyBody'), e.body);
    $('playerParts').innerHTML = bodyPartList(p.body);
    $('enemyParts').innerHTML = bodyPartList(e.body);
    $('playerStatus').innerHTML = combat.statusList('player').map(s => `<span class="status-chip" style="color:${s.color}">${s.label}</span>`).join('');
    $('enemyStatus').innerHTML = combat.statusList('enemy').map(s => `<span class="status-chip" style="color:${s.color}">${s.label}</span>`).join('');

    const pStance = p.statuses.counter ? 'COUNTER READY' : p.statuses.guard > 0 ? 'GUARD SET' : p.statuses.focus > 0 ? 'FOCUSED' : 'STANCE';
    const pStanceEl = $('playerStance');
    pStanceEl.textContent = pStance;
    pStanceEl.className = `stance-pill ${p.statuses.counter ? 'counter' : p.statuses.guard > 0 ? 'guard' : ''}`;
    const eStanceEl = $('enemyStance');
    eStanceEl.textContent = e.statuses.counter ? 'COUNTER STANCE' : e.statuses.guard > 0 ? `GUARD ${Math.round(e.statuses.guard * 100)}%` : 'OPPONENT';
    eStanceEl.className = `stance-pill ${e.statuses.counter ? 'counter' : e.statuses.guard > 0 ? 'guard' : ''}`;

    $('roundNum').textContent = combat.turn;
    const phaseEl = $('phaseText');
    if (combat.over) { phaseEl.textContent = 'FINISHED'; phaseEl.className = 'tb-phase'; }
    else if (combat.phase === 'enemy') { phaseEl.textContent = 'ENEMY TURN'; phaseEl.className = 'tb-phase enemy'; }
    else { phaseEl.textContent = combat.busy ? 'RESOLVING' : 'YOUR MOVE'; phaseEl.className = 'tb-phase'; }

    $('energyNum').textContent = `${p.chi} / ${p.maxChi}`;
    $('deckCount').textContent = `DECK ${combat.drawPile.length}`;
    $('discardCount').textContent = `DISCARD ${combat.discard.length}`;
    $('handHint').textContent = combat.over ? 'FIGHT OVER' : combat.phase === 'enemy' ? 'READ THE ATTACK' : combat.busy ? '...' : 'SELECT A TECHNIQUE';
    $('endTurnBtn').disabled = combat.busy || combat.phase !== 'player' || combat.over;

    this.renderHand(combat);
    this.updateLooks(combat);
  }

  setBar(prefix, cur, max) {
    const pct = Math.max(0, Math.min(100, (cur / max) * 100));
    const bar = $(`${prefix}Bar`);
    const ghost = $(`${prefix}Ghost`);
    if (bar) bar.style.width = `${pct}%`;
    if (ghost) ghost.style.width = `${pct}%`;
  }

  updateLooks(combat) {
    const apply = (side, f) => {
      const s = this.renderer.sides[side];
      if (!s.look) return;
      s.look.blood = f.body.head < 68 || f.body.chest < 45;
      s.look.sweat = f.stamina / f.maxStamina < 0.5 || f.hp / f.maxHp < 0.5;
    };
    apply('player', combat.player);
    apply('enemy', combat.enemy);
    this.renderer.setCondition('player', combat.player.body);
    this.renderer.setCondition('enemy', combat.enemy.body);
  }

  renderHand(combat) {
    const sig = `${combat.hand.map(c => c.uid).join(',')}|${combat.player.chi}|${combat.player.stamina}|${combat.phase}|${combat.busy}|${combat.over}`;
    if (sig === this.handSig) return;
    this.handSig = sig;
    const scroll = this.handEl.scrollLeft;
    if (!combat.hand.length) {
      this.handEl.innerHTML = '';
      $('handEmpty').classList.remove('hidden');
    } else {
      $('handEmpty').classList.add('hidden');
      this.handEl.innerHTML = combat.hand.map(card => {
        const ok = combat.canPlay(card).ok;
        return cardMarkup(card, { uid: card.uid, disabled: !ok });
      }).join('');
    }
    this.handEl.scrollLeft = scroll;
  }

  showTooltip(card, rect) {
    if (window.innerWidth < 760) return;
    const tt = $('tooltip');
    tt.innerHTML = tooltipMarkup(card);
    tt.classList.remove('hidden');
    const w = 286, h = tt.offsetHeight || 200;
    let x = rect.right + 12;
    if (x + w > window.innerWidth - 10) x = rect.left - w - 12;
    let y = Math.min(window.innerHeight - h - 12, Math.max(70, rect.top - 10));
    tt.style.left = `${Math.max(8, x)}px`;
    tt.style.top = `${y}px`;
  }

  hideTooltip() {
    $('tooltip').classList.add('hidden');
  }

  log(msg, kind = '') {
    if (!msg) return;
    this.logs.push({ msg, kind });
    if (this.logs.length > 30) this.logs.shift();
    const entries = this.logs.slice(-7).reverse().map(l => `<div class="log-entry ${l.kind}">${l.msg}</div>`).join('');
    $('logEntries').innerHTML = entries;
  }

  banner(title, sub = '', kind = '') {
    const host = $('screen-combat');
    host.querySelectorAll('.arena-banner').forEach(n => n.remove());
    const el = document.createElement('div');
    el.className = `arena-banner ${kind}`;
    const kicker = kind === 'bad' ? 'THE TIDE TURNS' : kind === 'enemy' ? 'OPPONENT PHASE' : kind === 'perfect' ? 'FLAWLESS' : kind === 'turn' ? 'COMBAT' : 'IRON LOTUS';
    el.innerHTML = `<div class="ab-kicker">${kicker}</div><div class="ab-title">${title}</div><div class="ab-sub">${sub}</div>`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 1650);
  }

  showIncoming(card, enemyName) {
    const b = $('incomingBanner');
    b.classList.remove('hidden');
    $('incomingName').textContent = card.name.toUpperCase();
    $('incomingPart').textContent = `${partLabel(card.part)} · ${enemyName.toUpperCase()}`;
  }

  hideIncoming() {
    $('incomingBanner')?.classList.add('hidden');
  }

  showTurnPhase(phase, round) {
    $('roundNum').textContent = round;
    const el = $('phaseText');
    el.textContent = phase === 'enemy' ? 'ENEMY TURN' : 'YOUR MOVE';
    el.className = `tb-phase ${phase === 'enemy' ? 'enemy' : ''}`;
  }
}
