/* Shared DOM helpers for IRON LOTUS. */

import { BODY_PARTS, RARITY, STYLES } from './data.js';
import { cardArtSVG, rarityGem } from './art.js';

export const arrowFor = { up: '↑', down: '↓', left: '←', right: '→' };
export const partLabel = p => (BODY_PARTS[p]?.label || p || '').toUpperCase();
export const styleName = id => (STYLES[id]?.name || id || '').toUpperCase();
export const typeLabel = t => ({
  strike: 'STRIKE', kick: 'KICK', throw: 'THROW', submission: 'SUBMISSION',
  stance: 'STANCE', counter: 'COUNTER', chi: 'CHI', forbidden: 'FORBIDDEN',
}[t] || t || '').toUpperCase();
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const DIRECTION_BY_PART = {
  head: 'up', neck: 'up', chest: 'left', heart: 'left',
  abdomen: 'down', legs: 'down', arms: 'right', joints: 'right',
};

export function cardMarkup(card, opts = {}) {
  const inDeck = opts.inDeck;
  const disabled = opts.disabled;
  const level = card.level || 1;
  const hits = card.hits && card.hits > 1 ? `×${card.hits}` : '';
  const tagline = (card.tags || []).slice(0, 3).join(' · ').toUpperCase();
  return `<button class="tcard rarity-${card.rarity} ${disabled ? 'disabled' : ''} ${inDeck ? 'in-deck' : ''}" data-card="${card.id}" ${opts.uid ? `data-uid="${opts.uid}"` : ''} aria-label="${card.name}, cost ${card.cost} Chi, ${card.dmg} damage">
    <div class="tcard-art">${cardArtSVG(card)}</div>
    <div class="tcard-rarity">${rarityGem(card)}</div>
    ${inDeck === true ? '<span class="remove-mark">−</span>' : inDeck === false ? '<span class="add-mark">+</span>' : ''}
    ${level > 1 ? `<span class="tcard-level">LV ${level}</span>` : ''}
    <div class="tcard-cost">${card.cost}</div>
    <div class="tcard-info">
      <div class="tcard-name">${card.name}</div>
      <div class="tcard-meta"><span class="tcard-type">${typeLabel(card.type)}</span><span class="tcard-dmg ${card.dmg >= 15 ? 'high' : ''}">${card.dmg || '—'}${hits}</span></div>
      <div class="tcard-stam"><span>${card.stamina ? `STA ${card.stamina}` : card.type === 'stance' || card.type === 'counter' ? 'NO COST' : 'SUPPORT'}</span><span>${(RARITY[card.rarity]?.label || '').toUpperCase()}</span></div>
      <div class="tcard-tags">${tagline}</div>
    </div>
  </button>`;
}

export function tooltipMarkup(card) {
  const r = RARITY[card.rarity] || RARITY.common;
  const hits = card.hits && card.hits > 1 ? ` ×${card.hits}` : '';
  return `<div class="tt-name">${card.name}</div>
    <div class="tt-sub" style="color:${r.color}">${r.label.toUpperCase()} · ${typeLabel(card.type)} · ${styleName(card.style)}</div>
    <div class="tt-desc">${card.desc || ''}</div>
    <div class="tt-stats">
      <div class="tt-stat">CHI<b>${card.cost}</b></div>
      <div class="tt-stat">STAMINA<b>${card.stamina || 0}</b></div>
      <div class="tt-stat">DAMAGE<b>${card.dmg || 0}${hits}</b></div>
      <div class="tt-stat">TARGET<b>${card.part ? partLabel(card.part) : 'SELF'}</b></div>
    </div>
    ${card.flavor ? `<div class="tt-flavor">“${card.flavor}”</div>` : ''}`;
}

export const BODY_SVG = `
<svg viewBox="0 0 100 160" aria-hidden="true">
  <circle cx="50" cy="79" r="47" fill="none" stroke="rgba(217,180,120,.1)" stroke-dasharray="2 5"/>
  <g data-part="legs">
    <path d="M43 88 L39 122 L36 150 L44 150 L48 122 L51 98 Z" fill="#5d4a35"/>
    <path d="M57 88 L61 122 L64 150 L56 150 L52 122 L49 98 Z" fill="#5d4a35"/>
  </g>
  <g data-part="arms">
    <path d="M36 42 L25 60 L14 86 L21 89 L32 64 L40 53 Z" fill="#5d4a35"/>
    <path d="M64 42 L75 60 L86 86 L79 89 L68 64 L60 53 Z" fill="#5d4a35"/>
  </g>
  <g data-part="chest">
    <path d="M34 34 Q50 27 66 34 L64 66 Q50 74 36 66 Z" fill="#5d4a35"/>
  </g>
  <g data-part="abdomen">
    <path d="M37 67 Q50 74 63 67 L60 91 Q50 97 40 91 Z" fill="#5d4a35"/>
  </g>
  <g data-part="neck">
    <rect x="45" y="24" width="10" height="12" fill="#5d4a35"/>
  </g>
  <g data-part="heart">
    <path d="M53 42 Q58 38 61 43 Q64 49 58 54 L53 58 L48 53 Q43 47 47 42 Q50 39 53 42 Z" fill="#7a2631" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>
  </g>
  <g data-part="head">
    <ellipse cx="50" cy="15" rx="13" ry="16" fill="#5d4a35"/>
  </g>
  <g data-part="joints">
    <circle cx="37" cy="54" r="3.2" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
    <circle cx="63" cy="54" r="3.2" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
    <circle cx="39" cy="111" r="3.2" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
    <circle cx="61" cy="111" r="3.2" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
    <circle cx="18" cy="83" r="2.6" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
    <circle cx="82" cy="83" r="2.6" fill="#8a6a4a" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>
  </g>
</svg>`;

export function integrityColor(v) {
  if (v >= 75) return '#6b573e';
  if (v >= 50) return '#8a6a35';
  if (v >= 25) return '#a8632e';
  return '#b3352b';
}

export function paintBody(container, body) {
  if (!container) return;
  for (const [part, val] of Object.entries(body)) {
    const els = container.querySelectorAll(`[data-part="${part}"]`);
    const color = integrityColor(val);
    els.forEach(el => {
      el.style.fill = color;
      el.style.filter = val < 22 ? 'drop-shadow(0 0 4px rgba(220,50,40,.65))' : '';
    });
  }
}

export function bodyPartList(body) {
  const order = ['head', 'neck', 'chest', 'heart', 'abdomen', 'arms', 'legs', 'joints'];
  return order.map(p => {
    const v = Math.round(body[p]);
    const cls = v < 25 ? 'crit' : v < 55 ? 'injured' : '';
    return `<div class="part-item ${cls}" title="${BODY_PARTS[p]?.effects || ''}"><span>${BODY_PARTS[p]?.label || p}</span><b>${v}</b></div>`;
  }).join('');
}

export function pipsMarkup(cur, max) {
  let out = '';
  for (let i = 0; i < max; i++) out += `<span class="pip ${i < cur ? 'on' : ''}"></span>`;
  return out;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
