/* Non-combat screens: modes, campaign ladder, deck builder, dojo, modals. */

import { CARDS, CARD_BY_ID, STYLES, STYLE_IDS, RARITY, ACHIEVEMENTS, PERKS, OPPONENTS, UNIVERSAL_UNLOCKS } from './data.js';
import { cardArtSVG, miniPortraitSVG } from './art.js';
import { cardMarkup, typeLabel, partLabel, styleName, clamp } from './helpers.js';
import { sound } from './audio.js';

const $ = id => document.getElementById(id);

export function resolveCard(id, save) {
  const base = CARD_BY_ID[id];
  if (!base) return null;
  const level = (save.cardLevels && save.cardLevels[id]) || 1;
  const mult = 1 + (level - 1) * 0.08;
  return { ...base, level, dmg: Math.round(base.dmg * mult) };
}

export function renderProfile(game) {
  const s = game.save;
  const need = game.xpNeeded();
  $('profileChip').innerHTML = `<span class="pc-level">LV ${s.level}</span><span class="pc-xp"><i style="width:${Math.min(100, (s.xp / need) * 100)}%"></i></span><span class="pc-essence">◆ ${s.essence}</span>`;
}

export function renderModes(game) {
  const save = game.save;
  $('modeProfile').innerHTML = `<span>LV ${save.level} · ${styleName(save.style)}</span><span style="color:var(--gold)">◆ ${save.essence}</span>`;
  const next = OPPONENTS[Math.min(save.campaign, OPPONENTS.length - 1)];
  const modes = [
    {
      key: 'campaign', icon: '武', num: '01', title: 'CAMPAIGN', cls: 'featured',
      desc: 'Walk the Iron Lotus Circuit. Six gatekeepers stand between you and the Hollow Palm. Your injuries heal, your lessons do not.',
      status: save.campaign >= OPPONENTS.length ? 'PATH COMPLETE' : `NEXT · ${next.name.toUpperCase()}`,
    },
    {
      key: 'tournament', icon: '極', num: '02', title: 'TOURNAMENT', cls: 'tournament',
      desc: 'Four rounds. Damaged bodies carry forward. One bracket, one champion, no second chances.',
      status: save.tournamentChampion ? 'TITLE CLAIMED' : 'ENTER THE BRACKET',
    },
    {
      key: 'survival', icon: '∞', num: '03', title: 'SURVIVAL', cls: 'survival',
      desc: 'The pit sends challenger after challenger. Every wave is stronger and faster than the last. How long can a body last?',
      status: `BEST WAVE · ${save.survivalBest || 0}`,
    },
    {
      key: 'training', icon: '禅', num: '04', title: 'TRAINING', cls: 'training',
      desc: 'A patient dummy that never hits back. Test new techniques, study the eight body zones, sharpen your timing.',
      status: 'NO RISK · NO REWARD',
    },
  ];
  $('modeGrid').innerHTML = modes.map(m => `
    <button class="mode-card ${m.cls}" data-mode="${m.key}">
      <span class="mode-num">${m.num}</span>
      <div class="mode-icon">${m.icon}</div>
      <h3>${m.title}</h3>
      <p>${m.desc}</p>
      <div class="mode-foot"><span class="mode-status">${m.status}</span><span class="mode-arrow">→</span></div>
    </button>`).join('');
  $('modeGrid').querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      game.soundClick();
      if (mode === 'campaign') game.startCampaign(Math.min(save.campaign, OPPONENTS.length - 1));
      if (mode === 'tournament') game.startTournament(0);
      if (mode === 'survival') game.startSurvival(1, null);
      if (mode === 'training') game.startTraining();
    });
  });

  $('campaignLadder').innerHTML = OPPONENTS.map((o, i) => {
    const locked = i > save.campaign;
    const done = i < save.campaign;
    const current = i === save.campaign;
    return `<button class="ladder-row ${locked ? 'locked' : ''} ${current ? 'current' : ''}" data-campaign-index="${i}" ${locked ? 'disabled' : ''}>
      <span class="ladder-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="ladder-avatar">${miniPortraitSVG(o.style, { ...o.look, seed: i })}</span>
      <span class="ladder-info"><span class="ladder-name">${o.name}</span><span class="ladder-title">${o.title} · ${STYLES[o.style].short}</span></span>
      <span class="ladder-status ${done ? 'done' : locked ? 'lock' : ''}">${done ? 'CLEARED' : locked ? 'LOCKED' : 'CHALLENGE'}</span>
    </button>`;
  }).join('');
  $('campaignLadder').querySelectorAll('[data-campaign-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const idx = Number(btn.dataset.campaignIndex);
      if (idx <= save.campaign) game.startCampaign(idx);
    });
  });
}

export function renderDeck(game) {
  const save = game.save;
  game.deckFilter = game.deckFilter || 'all';
  const filters = [['all', 'ALL'], ['universal', 'UNIVERSAL'], ...STYLE_IDS.map(id => [id, STYLES[id].short.toUpperCase()])];
  $('deckFilters').innerHTML = filters.map(([id, label]) => `<button class="filter-btn ${game.deckFilter === id ? 'active' : ''}" data-filter="${id}">${label}</button>`).join('');
  $('deckFilters').querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      game.deckFilter = btn.dataset.filter;
      renderDeck(game);
    });
  });
  $('deckSize').textContent = save.deck.length;
  $('deckCountLabel').textContent = `${save.deck.length} / 30`;
  $('deckStyleNote').textContent = `${styleName(save.style)} path · ${save.collection.length} techniques owned · Deck must contain 15–30 cards.`;

  const owned = save.collection.map(id => resolveCard(id, save)).filter(Boolean);
  const visible = owned
    .filter(c => game.deckFilter === 'all' || c.style === game.deckFilter)
    .sort((a, b) => (RARITY[a.rarity].order - RARITY[b.rarity].order) || a.name.localeCompare(b.name));
  $('collectionGrid').innerHTML = visible.length
    ? visible.map(c => cardMarkup(c, { inDeck: save.deck.includes(c.id) })).join('')
    : '<div class="collection-empty">NO TECHNIQUES IN THIS PATH</div>';
  $('collectionGrid').querySelectorAll('[data-card]').forEach(el => {
    el.addEventListener('click', () => openCardDetail(game, el.dataset.card));
  });

  $('deckList').innerHTML = save.deck.map((id, i) => {
    const c = resolveCard(id, save);
    if (!c) return '';
    return `<div class="deck-row">
      <span class="dr-cost">${c.cost}</span>
      <span class="dr-rarity" style="background:${RARITY[c.rarity].color}"></span>
      <span class="dr-name">${c.name}${c.level > 1 ? ` · LV${c.level}` : ''}</span>
      <button class="dr-remove" data-remove="${c.id}" title="Remove from deck">✕</button>
    </div>`;
  }).join('');
  $('deckList').querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (save.deck.length <= 15) { game.toast('A deck needs at least 15 techniques.', 'bad', 'DECK LOCKED'); return; }
      save.deck = save.deck.filter(id => id !== btn.dataset.remove);
      game.saveData();
      renderDeck(game);
    });
  });

  $('autoDeck').onclick = () => {
    const byStyle = owned.filter(c => c.style === save.style);
    const universal = owned.filter(c => c.style === 'universal');
    const rest = owned.filter(c => c.style !== save.style && c.style !== 'universal');
    const chosen = [...byStyle, ...universal, ...rest];
    const seen = new Set();
    const deck = [];
    const order = [...chosen].sort((a, b) => RARITY[b.rarity].order - RARITY[a.rarity].order);
    for (const c of order) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      deck.push(c.id);
      if (deck.length >= 22) break;
    }
    // guarantee enough cheap cards
    for (const c of [...universal, ...byStyle]) {
      if (deck.length >= 20) break;
      if (!deck.includes(c.id)) deck.push(c.id);
    }
    save.deck = deck.slice(0, 22);
    game.saveData();
    game.toast('Deck rebuilt around your strongest techniques.', 'good', 'AUTO-BUILD');
    renderDeck(game);
  };
}

export function openCardDetail(game, cardId) {
  const save = game.save;
  const card = resolveCard(cardId, save);
  if (!card) return;
  game.clearModals();
  const inDeck = save.deck.includes(card.id);
  const r = RARITY[card.rarity];
  const upgradeCost = card.level >= 5 ? null : 25 + (card.level - 1) * 35;
  const eff = card.effect || {};
  const effLines = [];
  if (eff.bleed) effLines.push(`Bleed ${eff.bleed}`);
  if (eff.poison) effLines.push(`Venom ${eff.poison}`);
  if (eff.stun) effLines.push(`Stun ${Math.round(eff.stun * 100)}%`);
  if (eff.knockdown) effLines.push(`Knockdown ${Math.round(eff.knockdown * 100)}%`);
  if (eff.expose) effLines.push(`Expose ${eff.expose}`);
  if (eff.slow) effLines.push(`Slow ${eff.slow}`);
  if (eff.staminaDamage) effLines.push(`Stamina damage ${eff.staminaDamage}`);
  if (eff.pierce) effLines.push(`Pierce guard ${Math.round(eff.pierce * 100)}%`);
  if (eff.guard) effLines.push(`Guard ${Math.round(eff.guard * 100)}%`);
  if (eff.counter) effLines.push(`Counter ${eff.counter}`);
  if (eff.heal) effLines.push(`Heal ${eff.heal}`);
  if (eff.chi) effLines.push(`Chi +${eff.chi}`);
  if (eff.focus) effLines.push(`Focus +${Math.round(eff.focus * 100)}%`);
  if (eff.dodgeBuff) effLines.push(`Evasion +${Math.round(eff.dodgeBuff * 100)}%`);
  if (eff.selfDamage) effLines.push(`Self damage ${eff.selfDamage}`);
  if (eff.heart) effLines.push('Targets the heart');
  if (eff.partBonus) effLines.push(`Part damage +${Math.round(eff.partBonus * 100)}%`);

  const overlay = document.createElement('div');
  overlay.className = 'overlay modal detail-modal';
  overlay.innerHTML = `<div class="overlay-panel detail-panel">
    <div class="detail-layout">
      <div class="detail-art" style="border-color:${r.color}">${cardArtSVG(card)}</div>
      <div class="detail-info">
        <div class="detail-rarity" style="color:${r.color}">${r.label.toUpperCase()} · ${typeLabel(card.type)} · ${styleName(card.style)}</div>
        <h3 class="ov-title">${card.name}</h3>
        <div class="ov-sub">${card.level > 1 ? `LEVEL ${card.level} · ` : ''}${partLabel(card.part)} TARGET</div>
        <p class="ov-body">${card.desc}</p>
        <div class="detail-stats">
          <div><span>CHI</span><b>${card.cost}</b></div>
          <div><span>STAMINA</span><b>${card.stamina || 0}</b></div>
          <div><span>DAMAGE</span><b>${card.dmg || 0}${card.hits > 1 ? `×${card.hits}` : ''}</b></div>
          <div><span>PART DMG</span><b>${Math.round((card.partDmg || 1.15) * 100)}%</b></div>
        </div>
        ${effLines.length ? `<div class="detail-effects">${effLines.map(l => `<span>${l}</span>`).join('')}</div>` : ''}
        ${card.flavor ? `<div class="detail-flavor">“${card.flavor}”</div>` : ''}
      </div>
    </div>
    <div class="ov-actions detail-actions">
      <button class="btn ${inDeck ? 'btn-danger' : 'btn-primary'}" data-act="deck">${inDeck ? 'REMOVE FROM DECK' : 'ADD TO DECK'}</button>
      <button class="btn btn-ghost" data-act="upgrade" ${upgradeCost === null || save.essence < upgradeCost ? 'disabled' : ''}>${upgradeCost === null ? 'MAX LEVEL' : `UPGRADE · ${upgradeCost} ◆`}</button>
      <button class="btn btn-ghost" data-act="close">CLOSE</button>
    </div>
    <div class="detail-foot">Essence: <b>${save.essence} ◆</b> · Upgrading raises damage by 8% per level.</div>
  </div>`;
  document.getElementById('overlayRoot').appendChild(overlay);

  overlay.addEventListener('click', ev => {
    if (ev.target === overlay) { overlay.remove(); return; }
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'close') { overlay.remove(); return; }
    if (act === 'deck') {
      if (inDeck) {
        if (save.deck.length <= 15) { game.toast('A deck needs at least 15 techniques.', 'bad', 'DECK LOCKED'); return; }
        save.deck = save.deck.filter(id => id !== card.id);
        game.toast(`${card.name} removed from deck.`, '', 'DECK');
      } else {
        if (save.deck.length >= 30) { game.toast('A deck holds at most 30 techniques.', 'bad', 'DECK FULL'); return; }
        save.deck.push(card.id);
        game.toast(`${card.name} added to deck.`, 'good', 'DECK');
      }
      game.saveData();
      overlay.remove();
      renderDeck(game);
      return;
    }
    if (act === 'upgrade') {
      if (upgradeCost === null || save.essence < upgradeCost) return;
      save.essence -= upgradeCost;
      save.cardLevels = save.cardLevels || {};
      save.cardLevels[card.id] = (save.cardLevels[card.id] || 1) + 1;
      game.saveData();
      game.toast(`${card.name} upgraded to level ${save.cardLevels[card.id]}.`, 'good', 'TECHNIQUE REFINED');
      overlay.remove();
      openCardDetail(game, cardId);
      renderDeck(game);
      game.renderProfile?.();
    }
  });
}

export function renderDojo(game) {
  const save = game.save;
  const st = STYLES[save.style];
  const need = game.xpNeeded();
  const achievementsDone = save.achievements || [];
  $('dojoResources').innerHTML = `
    <div class="dojo-res"><strong>◆ ${save.essence}</strong><span>ESSENCE</span></div>
    <div class="dojo-res"><strong>${save.attrPoints}</strong><span>ATTRIBUTE PTS</span></div>
    <div class="dojo-res"><strong>${save.skillPoints}</strong><span>SKILL PTS</span></div>`;

  $('characterCard').innerHTML = `
    <div class="char-portrait">${miniPortraitSVG(save.style, save.look || st.look)}</div>
    <div class="char-name">${save.name.toUpperCase()}</div>
    <div class="char-style">${st.name.toUpperCase()} · LEVEL ${save.level}</div>
    <div class="char-xp">${save.xp} / ${need} XP TO NEXT LEVEL<div class="xp-track"><i style="width:${clamp((save.xp / need) * 100, 0, 100)}%"></i></div></div>
    <div class="char-record">
      <div><b>${save.wins || 0}</b><span>VICTORIES</span></div>
      <div><b>${save.losses || 0}</b><span>DEFEATS</span></div>
      <div><b>${save.survivalBest || 0}</b><span>BEST WAVE</span></div>
      <div><b>${achievementsDone.length}</b><span>HONORS</span></div>
    </div>
    <div class="char-path">${st.tagline}</div>`;

  const attrs = [
    ['power', '力', 'POWER', 'Attack damage', '+2.2 damage per point'],
    ['guard', '盾', 'GUARD', 'Damage reduction', '+1.5% per point'],
    ['agility', '速', 'AGILITY', 'Timing windows', '+3% per point'],
    ['spirit', '气', 'SPIRIT', 'Chi capacity', '+0.34 Chi per point'],
  ];
  $('attributePanel').innerHTML = `<div class="panel-label">ATTRIBUTES <span>${save.attrPoints} POINTS</span></div>` +
    attrs.map(([key, icon, name, desc, detail]) => `
      <div class="attr-row">
        <span class="attr-icon">${icon}</span>
        <span class="attr-info"><span class="attr-name">${name}</span><span class="attr-desc">${desc} · ${detail}</span></span>
        <span class="attr-val">${save.attributes[key] || 0}</span>
        <button class="attr-plus" data-attr="${key}" ${save.attrPoints <= 0 ? 'disabled' : ''}>+</button>
      </div>`).join('');
  $('attributePanel').querySelectorAll('[data-attr]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (save.attrPoints <= 0) return;
      save.attrPoints--;
      save.attributes[btn.dataset.attr] = (save.attributes[btn.dataset.attr] || 0) + 1;
      game.saveData();
      game.soundClick();
      renderDojo(game);
      game.refreshProfile();
      game.toast(`${btn.dataset.attr.toUpperCase()} increased.`, 'good', 'DISCIPLINE');
    });
  });

  $('skillPointsLabel').textContent = `${save.skillPoints} POINT${save.skillPoints === 1 ? '' : 'S'}`;
  const branchNames = ['BODY', 'MIND', 'WILL'];
  const branches = [0, 1, 2].map(b => PERKS.filter(p => p.branch === b));
  $('skillTree').innerHTML = branches.map((list, b) => `<div class="skill-branch">
    <div class="skill-branch-title">${branchNames[b]}</div>
    ${list.map(p => {
      const owned = (save.perks || []).includes(p.id);
      const canBuy = !owned && save.level >= p.req && save.skillPoints >= p.cost;
      return `<button class="skill-node ${owned ? 'owned' : canBuy ? 'available' : 'locked'}" data-perk="${p.id}" ${owned || !canBuy ? 'disabled' : ''}>
        <div class="sn-icon">${p.icon}</div>
        <div class="sn-name">${p.name}</div>
        <div class="sn-desc">${p.desc}</div>
        <div class="sn-req">${owned ? 'MASTERED' : `LV ${p.req} · ${p.cost} PT`}</div>
      </button>`;
    }).join('')}
  </div>`).join('');
  $('skillTree').querySelectorAll('[data-perk]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PERKS.find(x => x.id === btn.dataset.perk);
      if (!p || (save.perks || []).includes(p.id)) return;
      if (save.level < p.req) { game.toast(`Requires level ${p.req}.`, 'bad', 'LOCKED'); return; }
      if (save.skillPoints < p.cost) { game.toast('No skill points available.', 'bad', 'LOCKED'); return; }
      save.skillPoints -= p.cost;
      save.perks = [...(save.perks || []), p.id];
      game.saveData();
      game.soundClick();
      renderDojo(game);
      game.toast(`${p.name} mastered.`, 'good', 'SKILL LEARNED');
    });
  });

  $('achCount').textContent = `${achievementsDone.length} / ${ACHIEVEMENTS.length}`;
  $('achievementList').innerHTML = ACHIEVEMENTS.map(a => {
    const done = achievementsDone.includes(a.id);
    return `<div class="ach-row ${done ? 'done' : ''}">
      <div class="ach-icon">${done ? '✓' : '·'}</div>
      <div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
      <div class="ach-reward">+${a.reward} ◆</div>
    </div>`;
  }).join('');
}

export function openStyleSelect(game) {
  game.clearModals();
  const selected = { style: game.save.style || 'shaolin' };
  const overlay = document.createElement('div');
  overlay.className = 'overlay modal style-modal';
  overlay.innerHTML = `<div class="overlay-panel" style="width:min(720px,calc(100vw - 28px))">
    <div class="eyebrow"><span></span> FORGE YOUR FIGHTER</div>
    <h2 class="ov-title" style="margin-top:10px">CHOOSE YOUR <em style="font-style:normal;color:var(--gold)">PATH</em></h2>
    <div class="ov-sub">SIX STYLES · SIX WAYS TO BREAK A BODY</div>
    <p class="ov-body">Your style shapes your starting techniques, passive bonuses and fighting stance. Choose the body you want to train.</p>
    <div class="style-grid" id="styleGrid">
      ${STYLE_IDS.map(id => {
        const s = STYLES[id];
        return `<button class="style-card ${id === selected.style ? 'selected' : ''}" data-style="${id}" style="--sc:${s.color}">
          <span class="style-check">${id === selected.style ? '◆' : ''}</span>
          <div class="style-kanji">${s.kanji}</div>
          <div class="style-name">${s.short.toUpperCase()}</div>
          <div class="style-perk">${s.perk}</div>
        </button>`;
      }).join('')}
    </div>
    <div class="field-label">FIGHTER NAME</div>
    <input class="name-input" id="fighterName" maxlength="14" value="${(game.save.name || 'Kai').toUpperCase()}" spellcheck="false">
    <div class="style-blurb" id="styleBlurb">${STYLES[selected.style].blurb}</div>
    <div class="ov-actions"><button class="btn btn-primary" id="confirmStyle">BEGIN THE PATH →</button><button class="btn btn-ghost" id="cancelStyle">CANCEL</button></div>
  </div>`;
  document.getElementById('overlayRoot').appendChild(overlay);
  overlay.querySelectorAll('[data-style]').forEach(btn => {
    btn.addEventListener('click', () => {
      selected.style = btn.dataset.style;
      overlay.querySelectorAll('[data-style]').forEach(b => {
        b.classList.toggle('selected', b.dataset.style === selected.style);
        b.querySelector('.style-check').textContent = b.dataset.style === selected.style ? '◆' : '';
      });
      const s = STYLES[selected.style];
      overlay.querySelector('#styleBlurb').innerHTML = `<b style="color:${s.color}">${s.name.toUpperCase()}</b> — ${s.blurb}<br><span style="color:var(--gold)">${s.perk}</span>`;
      sound.click();
    });
  });
  overlay.querySelector('#confirmStyle').addEventListener('click', () => {
    const name = (overlay.querySelector('#fighterName').value || 'Kai').trim().slice(0, 14) || 'Kai';
    game.initCharacter(selected.style, name);
    overlay.remove();
    game.renderModes();
    game.showScreen('modes');
  });
  overlay.querySelector('#cancelStyle').addEventListener('click', () => overlay.remove());
}

export function openHowTo(game) {
  game.clearModals();
  const overlay = document.createElement('div');
  overlay.className = 'overlay modal';
  overlay.innerHTML = `<div class="overlay-panel" style="width:min(720px,calc(100vw - 28px))">
    <div class="eyebrow"><span></span> THE EMPTY HAND</div>
    <h2 class="ov-title" style="margin-top:10px">HOW TO <em style="font-style:normal;color:var(--gold)">FIGHT</em></h2>
    <p class="ov-body">Combat alternates between your attack phase and the opponent's. Break the body and the mind follows. There are many ways to end a fight.</p>
    <div class="how-grid">
      <div class="how-item"><strong>1 · PLAY TECHNIQUES</strong><span>Select cards from your hand. Each costs <b>Chi</b> (gold) and <b>Stamina</b> (green). Stance cards set guard, counters and healing without attacking.</span></div>
      <div class="how-item"><strong>2 · WIN THE WINDOW</strong><span>Swipe in the shown direction (or press the arrow key) and release inside the band. <b>Perfect</b> timing deals 142% damage. Wrong direction fails.</span></div>
      <div class="how-item"><strong>3 · READ THE ATTACK</strong><span>On the enemy turn, matching the direction and timing prevents damage. A perfect read with a counter stance answers automatically.</span></div>
      <div class="how-item"><strong>4 · BREAK THE BODY</strong><span>Eight zones. Broken arms reduce damage. Damaged legs kill evasion. Head trauma blurs timing. Zero integrity is a knockout.</span></div>
      <div class="how-item"><strong>5 · MANAGE THE COST</strong><span>Attacks drain Stamina. Bleeding drains it faster. If Stamina reaches zero, you collapse from exhaustion. End turns with breath to spare.</span></div>
      <div class="how-item"><strong>6 · BUILD & GROW</strong><span>Earn XP, Essence and techniques. Upgrade cards, raise attributes, buy permanent perks, and rebuild your deck between fights.</span></div>
    </div>
    <div class="how-keys">Keyboard: <span class="key">←</span><span class="key">↑</span><span class="key">↓</span><span class="key">→</span> reactions · <span class="key">Space</span> timing · <span class="key">Enter</span> end turn · <span class="key">Esc</span> close</div>
    <div class="ov-actions"><button class="btn btn-primary" id="howClose">UNDERSTOOD</button></div>
  </div>`;
  document.getElementById('overlayRoot').appendChild(overlay);
  overlay.querySelector('#howClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.remove(); });
}

export function openDeckFromMenu(game) { renderDeck(game); game.showScreen('deck'); }
