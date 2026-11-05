/* Procedural, deterministic card artwork — no external assets. */

import { STYLES, RARITY } from './data.js';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function hsl(hex, hShift = 0, sMul = 1, lShift = 0) {
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
  h = (h + hShift / 360 + 1) % 1;
  s = Math.min(1, Math.max(0, s * sMul));
  const ll = Math.min(0.9, Math.max(0.05, l + lShift));
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(ll * 100)}%)`;
}

const POSE = {
  punch: `
    <line x1="150" y1="118" x2="178" y2="170" stroke-width="21"/>
    <line x1="150" y1="118" x2="122" y2="171" stroke-width="20"/>
    <path d="M132 92 Q150 74 172 96 L168 132 Q148 146 128 128 Z" fill="var(--body)"/>
    <circle cx="153" cy="68" r="21" fill="var(--body)"/>
    <line x1="164" y1="98" x2="208" y2="95" stroke-width="17"/>
    <line x1="208" y1="95" x2="252" y2="91" stroke-width="14"/>
    <circle cx="259" cy="90" r="14" fill="var(--accent)"/>
    <line x1="136" y1="99" x2="116" y2="125" stroke-width="15"/>
    <line x1="116" y1="125" x2="104" y2="148" stroke-width="12"/>
    <circle cx="101" cy="153" r="10" fill="var(--body)"/>
  `,
  kick: `
    <line x1="158" y1="122" x2="148" y2="178" stroke-width="21"/>
    <line x1="148" y1="178" x2="160" y2="216" stroke-width="14"/>
    <path d="M134 92 Q154 76 174 96 L170 130 Q150 144 130 126 Z" fill="var(--body)"/>
    <circle cx="156" cy="68" r="21" fill="var(--body)"/>
    <line x1="168" y1="112" x2="208" y2="86" stroke-width="18"/>
    <line x1="208" y1="86" x2="242" y2="58" stroke-width="15"/>
    <circle cx="250" cy="51" r="13" fill="var(--accent)"/>
    <line x1="136" y1="100" x2="110" y2="117" stroke-width="14"/>
    <line x1="110" y1="117" x2="98" y2="140" stroke-width="11"/>
    <line x1="158" y1="122" x2="190" y2="102" stroke-width="20"/>
    <line x1="190" y1="102" x2="226" y2="72" stroke-width="17"/>
    <circle cx="235" cy="64" r="12" fill="var(--accent)"/>
  `,
  palm: `
    <line x1="150" y1="118" x2="178" y2="170" stroke-width="21"/>
    <line x1="150" y1="118" x2="122" y2="171" stroke-width="20"/>
    <path d="M132 92 Q150 74 172 96 L168 132 Q148 146 128 128 Z" fill="var(--body)"/>
    <circle cx="153" cy="68" r="21" fill="var(--body)"/>
    <line x1="164" y1="97" x2="206" y2="92" stroke-width="16"/>
    <line x1="206" y1="92" x2="238" y2="88" stroke-width="14"/>
    <path d="M238 88 l12 -14 l7 6 l-10 14 M250 80 l10 -16 l8 5 l-9 17 M262 82 l7 -18 l8 4 l-7 19 M271 90 l2 -16 l8 3 l-2 17 M232 100 l9 10 l-6 7 l-10 -9z" fill="var(--accent)"/>
    <line x1="136" y1="99" x2="116" y2="125" stroke-width="15"/>
    <line x1="116" y1="125" x2="108" y2="146" stroke-width="12"/>
  `,
  elbow: `
    <line x1="152" y1="120" x2="180" y2="172" stroke-width="21"/>
    <line x1="152" y1="120" x2="124" y2="173" stroke-width="20"/>
    <path d="M134 92 Q152 74 174 96 L170 132 Q150 146 130 128 Z" fill="var(--body)"/>
    <circle cx="156" cy="68" r="21" fill="var(--body)"/>
    <line x1="168" y1="96" x2="214" y2="78" stroke-width="19"/>
    <line x1="214" y1="78" x2="238" y2="126" stroke-width="16"/>
    <circle cx="241" cy="132" r="12" fill="var(--accent)"/>
    <path d="M206 64 l22 9 l-6 13" fill="var(--accent)" opacity=".85"/>
    <line x1="138" y1="100" x2="112" y2="118" stroke-width="14"/>
  `,
  knee: `
    <line x1="150" y1="124" x2="144" y2="180" stroke-width="21"/>
    <line x1="144" y1="180" x2="158" y2="218" stroke-width="14"/>
    <path d="M132 94 Q152 78 172 98 L168 132 Q148 146 128 128 Z" fill="var(--body)"/>
    <circle cx="154" cy="70" r="21" fill="var(--body)"/>
    <line x1="166" y1="100" x2="198" y2="84" stroke-width="15"/>
    <line x1="198" y1="84" x2="218" y2="62" stroke-width="12"/>
    <line x1="152" y1="124" x2="202" y2="110" stroke-width="22"/>
    <line x1="202" y1="110" x2="224" y2="70" stroke-width="18"/>
    <circle cx="228" cy="63" r="13" fill="var(--accent)"/>
    <line x1="154" y1="124" x2="124" y2="174" stroke-width="20"/>
  `,
  block: `
    <line x1="150" y1="122" x2="180" y2="172" stroke-width="21"/>
    <line x1="150" y1="122" x2="122" y2="172" stroke-width="20"/>
    <path d="M132 94 Q152 76 172 98 L168 132 Q148 146 128 128 Z" fill="var(--body)"/>
    <circle cx="154" cy="70" r="21" fill="var(--body)"/>
    <line x1="166" y1="98" x2="200" y2="126" stroke-width="17"/>
    <line x1="200" y1="126" x2="224" y2="96" stroke-width="14"/>
    <line x1="138" y1="98" x2="172" y2="128" stroke-width="15"/>
    <line x1="172" y1="128" x2="198" y2="150" stroke-width="12"/>
    <path d="M202 74 l28 0 M202 82 l24 0 M200 90 l20 0" stroke="var(--accent)" stroke-width="3" opacity=".65"/>
  `,
  throw: `
    <path d="M112 206 Q176 84 264 62" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="7 8" opacity=".65"/>
    <line x1="150" y1="120" x2="182" y2="168" stroke-width="21"/>
    <line x1="150" y1="120" x2="122" y2="170" stroke-width="19"/>
    <path d="M133 93 Q152 76 173 97 L169 130 Q149 144 129 127 Z" fill="var(--body)"/>
    <circle cx="155" cy="69" r="20" fill="var(--body)"/>
    <line x1="166" y1="95" x2="206" y2="72" stroke-width="16"/>
    <line x1="206" y1="72" x2="240" y2="44" stroke-width="13"/>
    <g transform="rotate(-42 248 48)">
      <line x1="248" y1="50" x2="262" y2="82" stroke-width="15"/>
      <line x1="262" y1="82" x2="256" y2="110" stroke-width="12"/>
      <circle cx="254" cy="38" r="14" fill="var(--body)"/>
      <line x1="262" y1="52" x2="284" y2="46" stroke-width="9"/>
      <line x1="258" y1="54" x2="276" y2="28" stroke-width="8"/>
    </g>
  `,
  submission: `
    <path d="M102 190 L262 190" stroke="var(--accent)" stroke-width="3" opacity=".4"/>
    <line x1="154" y1="122" x2="142" y2="184" stroke-width="22"/>
    <line x1="154" y1="122" x2="186" y2="178" stroke-width="20"/>
    <path d="M136 94 Q156 78 176 100 L170 134 Q150 148 130 130 Z" fill="var(--body)"/>
    <circle cx="158" cy="70" r="21" fill="var(--body)"/>
    <line x1="170" y1="98" x2="216" y2="114" stroke-width="17"/>
    <line x1="216" y1="114" x2="246" y2="94" stroke-width="14"/>
    <line x1="140" y1="100" x2="112" y2="126" stroke-width="14"/>
    <line x1="112" y1="126" x2="132" y2="152" stroke-width="12"/>
    <line x1="216" y1="114" x2="238" y2="146" stroke-width="14"/>
    <path d="M238 146 l18 -10 l12 16 l-18 10z" fill="var(--accent)"/>
  `,
  choke: `
    <circle cx="234" cy="60" r="19" fill="var(--body)"/>
    <path d="M216 82 Q236 74 254 84 L250 112 Q232 120 216 108 Z" fill="var(--body)"/>
    <line x1="192" y1="130" x2="224" y2="94" stroke-width="17"/>
    <line x1="224" y1="94" x2="242" y2="72" stroke-width="14"/>
    <line x1="160" y1="178" x2="192" y2="130" stroke-width="20"/>
    <path d="M218 72 Q252 62 264 92" fill="none" stroke="var(--accent)" stroke-width="9"/>
    <path d="M206 86 Q240 78 248 108" fill="none" stroke="var(--accent)" stroke-width="6" opacity=".7"/>
  `,
  point: `
    <line x1="150" y1="118" x2="178" y2="170" stroke-width="21"/>
    <line x1="150" y1="118" x2="122" y2="171" stroke-width="20"/>
    <path d="M132 92 Q150 74 172 96 L168 132 Q148 146 128 128 Z" fill="var(--body)"/>
    <circle cx="153" cy="68" r="21" fill="var(--body)"/>
    <line x1="164" y1="98" x2="216" y2="100" stroke-width="16"/>
    <line x1="216" y1="100" x2="252" y2="98" stroke-width="8"/>
    <circle cx="262" cy="97" r="7" fill="var(--accent)"/>
    <g stroke="var(--accent)" stroke-width="3" opacity=".8">
      <line x1="262" y1="72" x2="262" y2="56"/><line x1="284" y1="97" x2="298" y2="97"/>
      <line x1="278" y1="81" x2="288" y2="71"/><line x1="278" y1="113" x2="288" y2="123"/>
    </g>
    <line x1="136" y1="99" x2="114" y2="126" stroke-width="15"/>
  `,
  clinch: `
    <circle cx="126" cy="62" r="19" fill="var(--body)"/><circle cx="220" cy="56" r="19" fill="var(--body)"/>
    <path d="M106 86 Q126 74 146 86 L142 118 Q122 128 104 114 Z" fill="var(--body)"/>
    <path d="M202 80 Q222 68 240 80 L238 112 Q220 122 202 110 Z" fill="var(--body)"/>
    <path d="M146 88 Q182 54 210 82" fill="none" stroke="var(--accent)" stroke-width="12"/>
    <path d="M136 108 Q180 132 224 100" fill="none" stroke="var(--accent)" stroke-width="8" opacity=".7"/>
    <line x1="122" y1="122" x2="112" y2="182" stroke-width="17"/>
    <line x1="224" y1="118" x2="238" y2="178" stroke-width="17"/>
  `,
  chi: `
    <circle cx="198" cy="96" r="42" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".7"/>
    <circle cx="198" cy="96" r="28" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".5"/>
    <circle cx="198" cy="96" r="9" fill="var(--accent)"/>
    <circle cx="150" cy="86" r="19" fill="var(--body)"/>
    <path d="M132 104 Q150 90 170 104 L166 142 Q146 154 128 138 Z" fill="var(--body)"/>
    <line x1="136" y1="138" x2="116" y2="188" stroke-width="19"/>
    <line x1="164" y1="140" x2="180" y2="188" stroke-width="19"/>
    <line x1="162" y1="106" x2="190" y2="94" stroke-width="13"/>
    <line x1="134" y1="110" x2="116" y2="98" stroke-width="12"/>
    <line x1="196" y1="54" x2="196" y2="34" stroke="var(--accent)" stroke-width="3"/>
    <line x1="196" y1="138" x2="196" y2="158" stroke="var(--accent)" stroke-width="3"/>
    <line x1="156" y1="96" x2="136" y2="96" stroke="var(--accent)" stroke-width="3"/>
    <line x1="240" y1="96" x2="260" y2="96" stroke="var(--accent)" stroke-width="3"/>
  `,
  blood: `
    <path d="M160 74 q34 -20 56 8 q20 30 -10 42 l-6 44 l-14 -40 l-14 32 l-8 -36 q-36 -12 -4 -50z" fill="var(--accent)" opacity=".82"/>
    <path d="M168 92 q22 -12 36 4" fill="none" stroke="var(--body)" stroke-width="3" opacity=".7"/>
    <circle cx="228" cy="154" r="5" fill="var(--accent)"/><circle cx="206" cy="176" r="3.5" fill="var(--accent)"/>
    <circle cx="244" cy="130" r="3" fill="var(--accent)"/><circle cx="150" cy="166" r="4" fill="var(--accent)"/>
  `,
};

export function cardArtSVG(card, opts = {}) {
  const seed = hash(card.id + card.name);
  const r = rng(seed);
  const style = STYLES[card.style] || { color: '#b8a06a' };
  const rar = RARITY[card.rarity] || RARITY.common;
  const base = card.rarity === 'forbidden' ? '#c8332f' : card.rarity === 'legendary' ? '#d9a441' : style.color;
  const accent = hsl(base, (r() - 0.5) * 40, 1.05, 0.08);
  const deep = hsl(base, 0, 0.75, -0.34);
  const bg1 = hsl(base, (r() - 0.5) * 28, 0.5, -0.42);
  const bg2 = '#090807';
  const rot = -18 + r() * 36;
  const rune = card.rune || '武';
  const dots = Array.from({ length: 15 }, () => {
    const x = 20 + r() * 260, y = 18 + r() * 154, rad = 0.6 + r() * 3.4;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${accent}" opacity="${(0.06 + r() * 0.16).toFixed(2)}"/>`;
  }).join('');
  const lines = Array.from({ length: 6 }, (_, i) => {
    const y = 26 + i * 27 + r() * 10;
    return `<line x1="${(r() * 60).toFixed(0)}" y1="${y.toFixed(0)}" x2="${(240 + r() * 80).toFixed(0)}" y2="${(y + 14).toFixed(0)}" stroke="${accent}" stroke-width="${(0.5 + r()).toFixed(1)}" opacity="${(0.05 + r() * 0.09).toFixed(2)}"/>`;
  }).join('');
  const splat = Array.from({ length: 7 }, () => {
    const x = 100 + r() * 150, y = 40 + r() * 130, rad = 2 + r() * 9;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(0)}" fill="${accent}" opacity="${(0.08 + r() * 0.15).toFixed(2)}"/>`;
  }).join('');
  const ensoX = 210 + r() * 30, ensoY = 64 + r() * 50, ensoR = 42 + r() * 14;
  const pose = POSE[card.art] || POSE.punch;

  return `<svg class="card-art-svg" viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${card.name} artwork">
    <defs>
      <linearGradient id="bg-${seed}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/><stop offset=".58" stop-color="#100d0b"/><stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="glow-${seed}" cx=".68" cy=".42" r=".62">
        <stop offset="0" stop-color="${accent}" stop-opacity=".34"/><stop offset=".6" stop-color="${deep}" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ink-${seed}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#050403"/><stop offset="1" stop-color="#211a15"/>
      </linearGradient>
    </defs>
    <rect width="300" height="190" fill="url(#bg-${seed})"/>
    <rect width="300" height="190" fill="url(#glow-${seed})"/>
    ${lines}
    <g transform="rotate(${rot.toFixed(1)} 150 95)" opacity=".5">
      <circle cx="${ensoX.toFixed(0)}" cy="${ensoY.toFixed(0)}" r="${ensoR.toFixed(0)}" fill="none" stroke="${accent}" stroke-width="${(5 + r() * 7).toFixed(1)}" stroke-linecap="round" stroke-dasharray="${(180 + r() * 160).toFixed(0)} ${(40 + r() * 80).toFixed(0)}" opacity=".42"/>
    </g>
    <text x="267" y="171" font-family="Georgia, 'Times New Roman', serif" font-size="88" fill="${accent}" opacity=".09" text-anchor="middle">${rune}</text>
    ${splat}
    <g style="--body:#18120e;--accent:${accent}" transform="translate(${18 + r() * 8} ${(r() * 6).toFixed(1)}) scale(0.94)" stroke="${accent}" stroke-opacity=".72" stroke-linecap="round" filter="drop-shadow(0 0 7px ${accent}55)">
      ${pose.split('fill="var(--body)"').join('fill="#18120e"').split('fill="var(--accent)"').join(`fill="${accent}"`)}
    </g>
    <rect x="10" y="10" width="280" height="170" fill="none" stroke="${accent}" stroke-opacity=".18"/>
    <rect x="8" y="8" width="284" height="174" fill="none" stroke="#000" stroke-opacity=".45"/>
    <g transform="translate(257 16)">
      <rect width="27" height="27" fill="${rar.color}" opacity=".92"/>
      <rect x="2" y="2" width="23" height="23" fill="none" stroke="#0b0908" stroke-width="1.5"/>
      <text x="13.5" y="19" font-family="Georgia, serif" font-size="14" fill="#0b0908" text-anchor="middle" font-weight="bold">${rune}</text>
    </g>
    <path d="M0 168 Q76 158 150 172 T300 164 L300 190 L0 190Z" fill="#050403" opacity=".55"/>
    ${dots}
  </svg>`;
}

export function miniPortraitSVG(styleId, look = {}) {
  const st = STYLES[styleId] || STYLES.shaolin;
  const skin = look.skin || st.look.skin;
  const hair = look.hair || st.look.hair;
  const gi = look.gi || st.look.gi;
  const band = look.band || st.look.band;
  const hairType = look.hairstyle || st.look.hairstyle;
  let hairSvg = '';
  if (hairType === 'bald') hairSvg = `<path d="M18 34 Q22 12 42 12 Q62 12 66 34" fill="none" stroke="${skin}" stroke-width="3" opacity=".6"/>`;
  else if (hairType === 'topknot') hairSvg = `<path d="M18 34 Q20 10 42 10 Q64 10 66 34 Q58 20 42 20 Q26 20 18 34Z" fill="${hair}"/><circle cx="42" cy="8" r="7" fill="${hair}"/><path d="M31 17 l22 0" stroke="${band}" stroke-width="4"/>`;
  else if (hairType === 'ponytail') hairSvg = `<path d="M16 36 Q18 10 42 10 Q66 10 68 36 Q60 18 42 18 Q24 18 16 36Z" fill="${hair}"/><path d="M63 22 Q76 34 70 62" fill="none" stroke="${hair}" stroke-width="7" stroke-linecap="round"/>`;
  else hairSvg = `<path d="M18 34 Q20 8 42 8 Q64 8 66 34 Q58 18 42 18 Q26 18 18 34Z" fill="${hair}"/>`;
  return `<svg viewBox="0 0 84 84" class="mini-portrait-svg" aria-hidden="true">
    <defs><radialGradient id="pg-${styleId}-${look.seed || 0}" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="${st.color}" stop-opacity=".28"/><stop offset="1" stop-color="#0a0908"/></radialGradient></defs>
    <rect width="84" height="84" fill="url(#pg-${styleId}-${look.seed || 0})"/>
    <path d="M8 84 Q13 57 42 55 Q71 57 76 84Z" fill="${gi}"/>
    <path d="M30 58 l12 12 l12 -12" fill="none" stroke="${st.color}" stroke-opacity=".5" stroke-width="1.6"/>
    <rect x="26" y="49" width="32" height="10" rx="3" fill="${band}" opacity=".9"/>
    <rect x="37" y="41" width="10" height="12" fill="${skin}"/>
    <ellipse cx="42" cy="32" rx="17" ry="19" fill="${skin}"/>
    <path d="M25 31 Q27 10 42 10 Q57 10 59 31 Q52 22 42 20 Q32 22 25 31Z" fill="${hair}"/>
    ${hairSvg}
    <path d="M29 36 l8 2 M47 38 l8 -2" stroke="#1a1210" stroke-width="2" stroke-linecap="round"/>
    <circle cx="35" cy="38" r="1.6" fill="#100b08"/><circle cx="50" cy="38" r="1.6" fill="#100b08"/>
    <path d="M42 39 l-3 5 l5 0" fill="none" stroke="#8f5c42" stroke-width="1.4"/>
    <path d="M36 49 Q42 52 49 48" fill="none" stroke="#5b2c25" stroke-width="1.6"/>
    ${look.beard ? `<path d="M30 44 Q34 56 42 57 Q50 56 54 44 Q50 52 42 52 Q34 52 30 44Z" fill="${hair}" opacity=".85"/>` : ''}
    ${look.scar ? `<path d="M53 26 l5 10" stroke="#d9a08a" stroke-width="1.4" opacity=".8"/>` : ''}
  </svg>`;
}

export function moveGlyph(type) {
  const g = {
    strike: '拳', kick: '脚', throw: '投', submission: '锁', stance: '守', counter: '反', chi: '气', forbidden: '禁',
  };
  return g[type] || '武';
}

export function rarityGem(card) {
  const r = RARITY[card.rarity] || RARITY.common;
  return `<span class="rarity-gem" style="--gem:${r.color}" title="${r.label}"></span>`;
}
