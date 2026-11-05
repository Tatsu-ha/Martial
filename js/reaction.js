/* Directional swipe + timing reaction challenge overlay. */

import { arrowFor, partLabel, DIRECTION_BY_PART } from './helpers.js';
import { sound } from './audio.js';

const DIRS = ['left', 'up', 'down', 'right'];

function qualityText(mode, q) {
  if (mode === 'attack') {
    if (q === 'perfect') return ['PERFECT', '142% DAMAGE · THE BODY OPENS'];
    if (q === 'good') return ['CLEAN', '100% DAMAGE · SOLID CONNECTION'];
    if (q === 'weak') return ['GLANCING', '66% DAMAGE · OFF BALANCE'];
    return ['OFF BALANCE', '34% DAMAGE · THE ANGLE IS LOST'];
  }
  if (q === 'perfect') return ['PERFECT READ', 'NO DAMAGE · COUNTER WINDOW OPEN'];
  if (q === 'good') return ['SOLID GUARD', '34% DAMAGE TAKEN'];
  if (q === 'weak') return ['GRAZED', '72% DAMAGE TAKEN'];
  return ['HIT CLEAN', '108% DAMAGE TAKEN'];
}

export function runReaction({ mode = 'attack', card, params, enemyName = '' }) {
  return new Promise(resolve => {
    const required = mode === 'attack'
      ? (DIRECTION_BY_PART[card.part] || 'left')
      : DIRS[Math.floor(Math.random() * DIRS.length)];
    const perfectW = Math.min(34, params.perfect * 200);
    const goodW = Math.min(64, params.good * 200);
    const overlay = document.createElement('div');
    overlay.className = `overlay reaction-overlay ${mode}`;
    overlay.innerHTML = `
      <div class="reaction-speedlines"></div>
      <div class="reaction-content">
        <div class="reaction-kicker">${mode === 'attack' ? 'STRIKE WINDOW' : 'INCOMING ATTACK'} · ${card.name.toUpperCase()}</div>
        <div class="reaction-title">${mode === 'attack' ? 'SWIPE & <em>STRIKE</em>' : 'READ & <em>DEFEND</em>'}</div>
        <div class="reaction-meta">${mode === 'attack' ? 'TARGET' : 'ATTACKER'} <b>${mode === 'attack' ? partLabel(card.part) : enemyName.toUpperCase()}</b> &nbsp;·&nbsp; ${mode === 'attack' ? `${card.dmg} BASE DAMAGE` : `${partLabel(card.part)} TARGETED`} &nbsp;·&nbsp; SPEED <b>${params.speed.toFixed(2)}×</b></div>
        <div class="reaction-dir-wrap">
          <div class="reaction-dir-label">REQUIRED DIRECTION</div>
          <div class="direction-pad">
            <button class="dir-arrow" data-dir="left" aria-label="Swipe left">←<small>LEFT</small></button>
            <button class="dir-arrow" data-dir="up" aria-label="Swipe up">↑<small>UP</small></button>
            <button class="dir-arrow" data-dir="down" aria-label="Swipe down">↓<small>DOWN</small></button>
            <button class="dir-arrow" data-dir="right" aria-label="Swipe right">→<small>RIGHT</small></button>
          </div>
        </div>
        <div class="timing-wrap">
          <div class="timing-track" id="timingTrack">
            <div class="timing-zone good" style="left:${50 - goodW / 2}%;width:${goodW}%"></div>
            <div class="timing-zone perfect" style="left:${50 - perfectW / 2}%;width:${perfectW}%"></div>
            <div class="timing-marker" id="timingMarker" style="left:0%"></div>
          </div>
          <div class="timing-scale"><span>TOO EARLY</span><span>PERFECT BAND</span><span>TOO LATE</span></div>
        </div>
        <div class="reaction-instruction">
          Swipe or press <span class="key">${arrowFor[required]}</span> in the <b>${arrowFor[required]} ${required.toUpperCase()}</b> direction, and release inside the band.<br>
          ${mode === 'attack' ? 'A clean read multiplies damage. Hesitation is punished.' : 'A clean read takes no damage. A perfect read with a counter stance answers automatically.'}
        </div>
        <button class="btn btn-primary reaction-tap" id="tapTime">TAP TO TIME</button>
        <div class="reaction-result hidden" id="reactionResult"><div class="rr-quality"></div><div class="rr-sub"></div></div>
      </div>`;

    document.getElementById('overlayRoot').appendChild(overlay);
    const marker = overlay.querySelector('#timingMarker');
    const result = overlay.querySelector('#reactionResult');
    const qualityEl = result.querySelector('.rr-quality');
    const subEl = result.querySelector('.rr-sub');
    overlay.querySelectorAll('.dir-arrow').forEach(btn => {
      if (btn.dataset.dir === required) btn.classList.add('required');
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        judge(btn.dataset.dir);
      });
      btn.addEventListener('pointerdown', ev => ev.stopPropagation());
    });
    overlay.querySelector('#tapTime').addEventListener('pointerdown', ev => ev.stopPropagation());
    overlay.querySelector('#tapTime').addEventListener('click', ev => {
      ev.stopPropagation();
      judge(required);
    });

    const start = performance.now();
    const sweep = 1080 / Math.max(0.6, params.speed);
    const timeout = start + sweep * 4.1;
    let raf = 0;
    let done = false;
    let dragStart = null;

    const markerPos = (now) => {
      const elapsed = now - start;
      const phase = (elapsed % (sweep * 2)) / sweep;
      return phase <= 1 ? phase : 2 - phase;
    };

    const frame = (now) => {
      if (done) return;
      if (now > timeout) { judge(required, true); return; }
      marker.style.left = `${(markerPos(now) * 100).toFixed(2)}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const dirFromDelta = (dx, dy) => {
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'down' : 'up';
    };

    overlay.addEventListener('pointerdown', ev => {
      if (done || ev.target.closest('button')) return;
      dragStart = { x: ev.clientX, y: ev.clientY };
    });
    overlay.addEventListener('pointerup', ev => {
      if (done || ev.target.closest('button') || !dragStart) return;
      const dx = ev.clientX - dragStart.x;
      const dy = ev.clientY - dragStart.y;
      dragStart = null;
      if (Math.hypot(dx, dy) < 22) judge(required);
      else judge(dirFromDelta(dx, dy));
    });

    const onKey = ev => {
      if (done) return;
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
      if (ev.key === ' ') { ev.preventDefault(); judge(required); return; }
      const d = map[ev.key];
      if (d) { ev.preventDefault(); judge(d); }
    };
    window.addEventListener('keydown', onKey, true);

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
    }

    function judge(dir, timedOut = false) {
      if (done) return;
      done = true;
      cleanup();
      const p = Math.min(1, Math.max(0, markerPos(performance.now())));
      marker.style.left = `${(p * 100).toFixed(2)}%`;
      const dist = Math.abs(p - 0.5);
      let q;
      if (timedOut || dist > 0.43) q = 'fail';
      else if (dir !== required) q = 'fail';
      else if (dist <= params.perfect) q = 'perfect';
      else if (dist <= params.good) q = 'good';
      else q = 'weak';
      const [title, sub] = qualityText(mode, q);
      qualityEl.textContent = title;
      subEl.textContent = timedOut ? 'TOO SLOW · THE WINDOW CLOSES' : dir !== required ? `WRONG DIRECTION · EXPECTED ${required.toUpperCase()}` : sub;
      result.classList.remove('hidden');
      result.classList.toggle('bad', q === 'weak' || q === 'fail');
      if (q === 'perfect') sound.perfect();
      else if (q === 'fail') sound.fail();
      else sound.click();
      setTimeout(() => {
        overlay.classList.add('closing');
        setTimeout(() => {
          overlay.remove();
          resolve(q);
        }, 170);
      }, 760);
    }
  });
}
