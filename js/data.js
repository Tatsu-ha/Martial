/* IRON LOTUS — game data
   Techniques, styles, opponents, progression rules. */

export const STYLES = {
  shaolin: {
    id: 'shaolin',
    name: 'Shaolin Kung Fu',
    short: 'Shaolin',
    kanji: '禅',
    color: '#d9a441',
    tagline: 'Iron body. Open palm. Still mind.',
    blurb: 'Balanced and enduring. Chi flows more freely, and the body withstands punishment.',
    perk: '+1 Chi regeneration every turn. +10% max Chi.',
    mods: { chiRegen: 1, chiMax: 1.1, partResist: 0.08 },
    look: { skin: '#c68a5e', hair: '#171310', hairstyle: 'bald', gi: '#b4562b', trim: '#e9c27b', band: '#d9a441', beard: false, scar: false },
  },
  wingchun: {
    id: 'wingchun',
    name: 'Wing Chun',
    short: 'Wing Chun',
    kanji: '咏',
    color: '#9fb9bd',
    tagline: 'The centerline is a river. Strike first.',
    blurb: 'Trapping hands and chain strikes. Cheap attacks and superior reaction speed.',
    perk: 'First strike each turn costs 1 less Stamina. +15% reaction precision.',
    mods: { reaction: 0.15, firstStrikeStamina: 1 },
    look: { skin: '#d6a077', hair: '#221a15', hairstyle: 'short', gi: '#4d6c6d', trim: '#cfdada', band: '#8aa9ad', beard: false, scar: true },
  },
  shotokan: {
    id: 'shotokan',
    name: 'Shotokan Karate',
    short: 'Shotokan',
    kanji: '空',
    color: '#d7d2c4',
    tagline: 'One strike. One breath. One chance.',
    blurb: 'Linear power and unbreakable structure. Strikes hit harder and guard holds longer.',
    perk: '+14% strike damage. +12% guard strength.',
    mods: { strike: 0.14, guard: 0.12 },
    look: { skin: '#c78b60', hair: '#16110e', hairstyle: 'short', gi: '#e5e1d4', trim: '#2b2b2b', band: '#9c2b2b', beard: false, scar: false },
  },
  taekwondo: {
    id: 'taekwondo',
    name: 'Taekwondo',
    short: 'Taekwondo',
    kanji: '跆',
    color: '#5c8fc7',
    tagline: 'The sky is the limit of the heel.',
    blurb: 'Explosive kicks and footwork. Kicks deal more damage and evasions are easier.',
    perk: '+22% kick damage. +18% dodge window.',
    mods: { kick: 0.22, dodge: 0.18 },
    look: { skin: '#d09a70', hair: '#1b1612', hairstyle: 'ponytail', gi: '#243d5c', trim: '#dce7f5', band: '#4b7fb8', beard: false, scar: false },
  },
  muaythai: {
    id: 'muaythai',
    name: 'Muay Thai',
    short: 'Muay Thai',
    kanji: '拳',
    color: '#c2543d',
    tagline: 'Eight limbs. No mercy.',
    blurb: 'Elbows and knees open wounds. Your strikes sap the opponent\'s stamina.',
    perk: 'Elbow & knee strikes cause bleeding. +18% stamina damage.',
    mods: { clinchBleed: 0.35, staminaDamage: 0.18 },
    look: { skin: '#b97a4f', hair: '#1a1410', hairstyle: 'topknot', gi: '#7e211b', trim: '#e2b45c', band: '#d7b24f', beard: false, scar: true },
  },
  bjj: {
    id: 'bjj',
    name: 'Brazilian Jiu-Jitsu',
    short: 'BJJ',
    kanji: '柔',
    color: '#7c9a66',
    tagline: 'The ground is an ocean. Drown them.',
    blurb: 'Throws and joint locks. Joint, neck and throwing damage is greatly increased.',
    perk: '+35% joint & neck damage. Throws may stun.',
    mods: { joint: 0.35, throwStun: 0.4 },
    look: { skin: '#8e5d3c', hair: '#15100c', hairstyle: 'short', gi: '#233028', trim: '#9db184', band: '#6e8a58', beard: true, scar: true },
  },
};

export const STYLE_IDS = Object.keys(STYLES);

export const RARITY = {
  common: { label: 'Common', color: '#a8a49a', order: 0 },
  uncommon: { label: 'Uncommon', color: '#69a86f', order: 1 },
  rare: { label: 'Rare', color: '#5c91cf', order: 2 },
  epic: { label: 'Epic', color: '#a86cc9', order: 3 },
  legendary: { label: 'Legendary', color: '#e0a33e', order: 4 },
  forbidden: { label: 'Forbidden', color: '#cf3f3f', order: 5 },
};

const card = (id, name, style, type, rarity, cost, stamina, dmg, part, o = {}) => ({
  id, name, style, type, rarity, cost, stamina, dmg, part,
  partDmg: o.partDmg ?? 1.15,
  hits: o.hits ?? 1,
  anim: o.anim ?? 'punch',
  tags: o.tags ?? ['strike'],
  desc: o.desc ?? '',
  effect: o.effect ?? null,
  unlock: o.unlock ?? 0,
  art: o.art ?? 'punch',
  rune: o.rune ?? '武',
  speed: o.speed ?? 1,
  flavor: o.flavor ?? '',
});

export const CARDS = [
  // ---------- UNIVERSAL / FUNDAMENTALS ----------
  card('lead_jab', 'Lead Jab', 'universal', 'strike', 'common', 1, 6, 6, 'head', {
    desc: 'A snapping lead hand. Fast, safe, and sets the rhythm.',
    anim: 'jab', tags: ['punch', 'fast'], art: 'punch', rune: '刺', flavor: 'Touch first. Think second.',
    effect: { speed: 1.15 },
  }),
  card('low_kick', 'Low Kick', 'universal', 'kick', 'common', 1, 7, 7, 'legs', {
    desc: 'Chop the base. Slow the legs, steal their escape.',
    anim: 'kick', tags: ['kick'], art: 'kick', rune: '脚',
    effect: { slow: 1 },
  }),
  card('body_hook', 'Body Hook', 'universal', 'strike', 'common', 1, 8, 8, 'abdomen', {
    desc: 'A short hook under the ribs. Empty their lungs.',
    anim: 'hook', tags: ['punch'], art: 'punch', rune: '腹',
    effect: { staminaDamage: 8 },
  }),
  card('iron_guard', 'Iron Guard', 'universal', 'stance', 'common', 1, 0, 0, null, {
    desc: 'Set the forearms and absorb the coming storm. Reduces next incoming damage by 48%.',
    tags: ['guard'], art: 'block', rune: '守',
    effect: { guard: 0.48 },
  }),
  card('sidestep', 'Sidestep', 'universal', 'stance', 'common', 1, 4, 0, null, {
    desc: 'Cut an angle. +35% dodge timing window this enemy phase.',
    tags: ['dodge'], art: 'block', rune: '避',
    effect: { dodgeBuff: 0.35 },
  }),
  card('breath_control', 'Breath Control', 'universal', 'chi', 'common', 0, 0, 0, null, {
    desc: 'Breathe into the hurt. Restore 16 Stamina and 1 Chi.',
    tags: ['chi'], art: 'chi', rune: '息',
    effect: { stamina: 16, chi: 1 },
  }),
  card('straight_cross', 'Straight Cross', 'universal', 'strike', 'common', 2, 10, 11, 'head', {
    desc: 'The rear hand travels through the centerline. Heavy and true.',
    anim: 'cross', tags: ['punch'], art: 'punch', rune: '直',
  }),
  card('front_kick', 'Front Kick', 'universal', 'kick', 'common', 1, 8, 8, 'chest', {
    desc: 'A piston teep to the sternum. Pushes them off balance.',
    anim: 'kick', tags: ['kick'], art: 'kick', rune: '前',
    effect: { stagger: 1 },
  }),
  card('knee_strike', 'Knee Strike', 'universal', 'strike', 'uncommon', 2, 10, 11, 'abdomen', {
    desc: 'A driving knee into the solar plexus. Every breath costs them.',
    anim: 'knee', tags: ['knee', 'clinch'], art: 'knee', rune: '膝',
    effect: { staminaDamage: 10 },
  }),
  card('elbow_slash', 'Elbow Slash', 'universal', 'strike', 'uncommon', 2, 10, 10, 'head', {
    desc: 'The elbow opens skin. Bleeding drains Stamina each turn.',
    anim: 'elbow', tags: ['elbow', 'clinch'], art: 'elbow', rune: '肘',
    effect: { bleed: 2 },
  }),
  card('leg_sweep', 'Leg Sweep', 'universal', 'kick', 'uncommon', 2, 12, 8, 'legs', {
    desc: 'Take the standing leg. On a perfect strike, they hit the floor.',
    anim: 'sweep', tags: ['kick', 'sweep'], art: 'kick', rune: '扫',
    effect: { knockdown: 0.55 },
  }),

  // ---------- SHAOLIN ----------
  card('iron_palm', 'Iron Palm', 'shaolin', 'strike', 'uncommon', 2, 12, 12, 'chest', {
    desc: 'A conditioned palm drives through the sternum. Ignores half of guard.',
    anim: 'palm', tags: ['palm', 'chi'], art: 'palm', rune: '掌',
    effect: { pierce: 0.5, staminaDamage: 6 },
  }),
  card('dragon_sweep', 'Dragon Tail Sweep', 'shaolin', 'kick', 'rare', 2, 14, 10, 'legs', {
    desc: 'A low spinning sweep that folds the knee and drops the body.',
    anim: 'sweep', tags: ['kick', 'sweep'], art: 'kick', rune: '龙',
    effect: { knockdown: 0.7, stun: 0.5 },
  }),
  card('buddha_palm', 'Buddha Palm', 'shaolin', 'chi', 'epic', 4, 18, 22, 'chest', {
    desc: 'All weight, all breath, one open hand. Crushes the chest and heart.',
    anim: 'palm', tags: ['palm', 'chi'], art: 'palm', rune: '佛',
    effect: { pierce: 0.6, heart: 0.5, chi: 1 },
  }),
  card('crane_block', 'Crane Guard', 'shaolin', 'counter', 'rare', 1, 0, 0, null, {
    desc: 'Counter stance: a perfect defense answers with a 12-damage crane beak strike.',
    tags: ['counter', 'guard'], art: 'block', rune: '鹤',
    effect: { guard: 0.35, counter: 12, counterPart: 'head' },
  }),
  card('flow_state', 'Flow State', 'shaolin', 'stance', 'rare', 2, 0, 0, null, {
    desc: 'The world slows. +30% reaction precision and +2 Chi next turn.',
    tags: ['chi', 'focus'], art: 'chi', rune: '流',
    effect: { focus: 0.3, chi: 2 },
  }),

  // ---------- WING CHUN ----------
  card('chain_punch', 'Chain Punch', 'wingchun', 'strike', 'uncommon', 2, 11, 4, 'head', {
    desc: 'Three linked centerline punches. Each one finds the same wound.',
    anim: 'chain', tags: ['punch', 'fast'], art: 'punch', rune: '连', hits: 3, partDmg: 0.65,
  }),
  card('pak_sao', 'Pak Sao', 'wingchun', 'counter', 'common', 1, 0, 0, null, {
    desc: 'Slap the guard aside and load a counter. +25% guard, counters for 10.',
    tags: ['counter', 'guard'], art: 'block', rune: '拍',
    effect: { guard: 0.25, counter: 10, counterPart: 'head' },
  }),
  card('centerline', 'Centerline Strike', 'wingchun', 'strike', 'rare', 2, 10, 10, 'neck', {
    desc: 'The shortest path is the throat. Ignores guard and bruises the neck.',
    anim: 'palm', tags: ['palm', 'fast'], art: 'palm', rune: '中',
    effect: { pierce: 0.75, staminaDamage: 8 },
  }),
  card('biu_jee', 'Biu Jee', 'wingchun', 'strike', 'epic', 3, 15, 15, 'joints', {
    desc: 'The thrusting fingers find tendon and socket. Severely damages joints.',
    anim: 'point', tags: ['point'], art: 'point', rune: '镖',
    effect: { partBonus: 0.55, bleed: 1 },
  }),
  card('trapping_hands', 'Trapping Hands', 'wingchun', 'stance', 'rare', 1, 4, 0, null, {
    desc: 'Tie up their arms. Enemy attacks deal 20% less damage next phase.',
    tags: ['control'], art: 'block', rune: '缠',
    effect: { weaken: 2, chi: 1 },
  }),

  // ---------- SHOTOKAN ----------
  card('gyaku_zuki', 'Gyaku Zuki', 'shotokan', 'strike', 'uncommon', 2, 11, 13, 'chest', {
    desc: 'Reverse punch from the back hip. Classic, clean, concussive.',
    anim: 'cross', tags: ['punch', 'power'], art: 'punch', rune: '逆',
  }),
  card('mae_geri', 'Mae Geri', 'shotokan', 'kick', 'common', 1, 8, 8, 'abdomen', {
    desc: 'Snap kick to the abdomen. Drives the air from the body.',
    anim: 'kick', tags: ['kick'], art: 'kick', rune: '前',
    effect: { staminaDamage: 7 },
  }),
  card('age_uke', 'Age Uke', 'shotokan', 'stance', 'common', 1, 0, 0, null, {
    desc: 'Rising block. 55% guard and restores 1 Chi on a perfect read.',
    tags: ['guard'], art: 'block', rune: '上',
    effect: { guard: 0.55, chiOnPerfect: 1 },
  }),
  card('tetsui', 'Tetsui Hammer', 'shotokan', 'strike', 'rare', 2, 14, 13, 'head', {
    desc: 'A hammer fist crashes down on the temple. Chance to stun.',
    anim: 'hammer', tags: ['punch', 'power'], art: 'punch', rune: '鉄',
    effect: { stun: 0.45 },
  }),
  card('heian_kata', 'Heian Kata', 'shotokan', 'stance', 'rare', 2, 0, 0, null, {
    desc: 'Perfect form. +1 Chi, +2 max guard, and +20% precision this turn.',
    tags: ['focus', 'guard'], art: 'chi', rune: '型',
    effect: { chi: 1, guard: 0.3, focus: 0.2 },
  }),

  // ---------- TAEKWONDO ----------
  card('roundhouse', 'Roundhouse Kick', 'taekwondo', 'kick', 'uncommon', 2, 12, 13, 'head', {
    desc: 'The shin whips across the jaw. High risk, high reward.',
    anim: 'roundhouse', tags: ['kick', 'power'], art: 'kick', rune: '回',
    effect: { stun: 0.25 },
  }),
  card('axe_kick', 'Axe Kick', 'taekwondo', 'kick', 'rare', 3, 15, 16, 'head', {
    desc: 'The heel falls like an executioner\'s blade. Heavy head damage.',
    anim: 'axe', tags: ['kick', 'power'], art: 'kick', rune: '斧', partDmg: 1.4,
  }),
  card('spin_hook', 'Spin Hook Kick', 'taekwondo', 'kick', 'rare', 3, 16, 15, 'head', {
    desc: 'A blind spin that arrives from nowhere. Hard to block, harder to see.',
    anim: 'roundhouse', tags: ['kick', 'power'], art: 'kick', rune: '旋',
    effect: { pierce: 0.3, stun: 0.35 },
  }),
  card('tornado_kick', 'Tornado Kick', 'taekwondo', 'kick', 'epic', 4, 20, 20, 'head', {
    desc: 'Both feet leave the earth. The chamber, the spin, the ruin.',
    anim: 'roundhouse', tags: ['kick', 'power'], art: 'kick', rune: '岚',
    effect: { stun: 0.5, knockdown: 0.5 },
  }),
  card('taekwondo_step', 'Phantom Step', 'taekwondo', 'stance', 'uncommon', 1, 3, 0, null, {
    desc: 'Blur the distance. +40% dodge window and 1 Chi.',
    tags: ['dodge'], art: 'block', rune: '影',
    effect: { dodgeBuff: 0.4, chi: 1 },
  }),

  // ---------- MUAY THAI ----------
  card('teep', 'Teep', 'muaythai', 'kick', 'common', 1, 8, 7, 'abdomen', {
    desc: 'The push kick. Interrupts rhythm and steals their breath.',
    anim: 'kick', tags: ['kick'], art: 'kick', rune: '踢',
    effect: { stagger: 1, staminaDamage: 6 },
  }),
  card('flying_knee', 'Flying Knee', 'muaythai', 'strike', 'rare', 3, 16, 17, 'head', {
    desc: 'A leap into the jaw with the point of the knee. Concussive.',
    anim: 'knee', tags: ['knee', 'clinch', 'power'], art: 'knee', rune: '飞',
    effect: { stun: 0.35, knockdown: 0.35 },
  }),
  card('clinch_control', 'Clinch Control', 'muaythai', 'stance', 'uncommon', 1, 5, 0, null, {
    desc: 'Wrap the neck. Enemy strikes lose 25% power next phase.',
    tags: ['control'], art: 'clinch', rune: '缠',
    effect: { weaken: 2, chi: 1 },
  }),
  card('elbow_hell', 'Elbow Hell', 'muaythai', 'strike', 'epic', 3, 15, 14, 'head', {
    desc: 'A downward elbow opens the brow. Heavy bleeding follows.',
    anim: 'elbow', tags: ['elbow', 'clinch'], art: 'elbow', rune: '狱',
    effect: { bleed: 4, stun: 0.2 },
  }),
  card('shin_kick', 'Shin Breaker', 'muaythai', 'kick', 'rare', 2, 12, 11, 'legs', {
    desc: 'Repeated shin kicks deaden the peroneal nerve. Mobility suffers.',
    anim: 'kick', tags: ['kick'], art: 'kick', rune: '胫',
    effect: { slow: 2, staminaDamage: 8 },
  }),

  // ---------- BJJ ----------
  card('hip_throw', 'Hip Throw', 'bjj', 'throw', 'uncommon', 2, 13, 10, 'joints', {
    desc: 'Turn the hips, drop the sky. Throws deal joint damage and may stun.',
    anim: 'throw', tags: ['throw'], art: 'throw', rune: '投',
    effect: { knockdown: 0.65, stun: 0.3, partBonus: 0.2 },
  }),
  card('guard_pull', 'Guard Pull', 'bjj', 'counter', 'common', 1, 3, 0, null, {
    desc: 'Accept the fall, own the ground. Guard 20%, counter for 11 at the joints.',
    tags: ['counter', 'guard'], art: 'throw', rune: '引',
    effect: { guard: 0.2, counter: 11, counterPart: 'joints' },
  }),
  card('armbar', 'Armbar', 'bjj', 'submission', 'rare', 3, 14, 14, 'joints', {
    desc: 'Isolate the arm, hips high, elbow against the sky. Joint damage.',
    anim: 'submission', tags: ['submission', 'joint'], art: 'submission', rune: '腕',
    effect: { partBonus: 0.5, stun: 0.4 },
  }),
  card('triangle', 'Triangle Choke', 'bjj', 'submission', 'rare', 3, 15, 12, 'neck', {
    desc: 'Legs lock the neck. Cuts blood, drains Stamina, blurs the world.',
    anim: 'submission', tags: ['submission', 'choke'], art: 'submission', rune: '三角',
    effect: { staminaDamage: 18, stun: 0.45, partBonus: 0.4 },
  }),
  card('mounted_elbows', 'Mounted Elbows', 'bjj', 'strike', 'epic', 3, 16, 6, 'head', {
    desc: 'Pin them down and rain elbows. Four brutal impacts.',
    anim: 'elbow', tags: ['elbow', 'ground'], art: 'elbow', rune: '骑', hits: 4, partDmg: 0.7,
    effect: { bleed: 2 },
  }),

  // ---------- CHI / PRESSURE POINTS ----------
  card('pressure_point', 'Pressure Point Strike', 'universal', 'strike', 'rare', 2, 10, 9, 'neck', {
    desc: 'Two fingers into the carotid sinus. Stuns and exposes the target.',
    anim: 'point', tags: ['point', 'chi'], art: 'point', rune: '穴',
    effect: { stun: 0.6, expose: 2, partBonus: 0.3 },
  }),
  card('chi_burst', 'Chi Burst', 'universal', 'chi', 'rare', 2, 8, 12, 'chest', {
    desc: 'Release the coiled breath. A concussive wave that ignores guard.',
    anim: 'palm', tags: ['chi'], art: 'chi', rune: '气',
    effect: { pierce: 0.9, heart: 0.35 },
  }),
  card('thousand_fists', 'Thousand Fists', 'universal', 'strike', 'legendary', 4, 20, 5, 'head', {
    desc: 'The hand becomes a storm. Five strikes, one breath, no escape.',
    anim: 'chain', tags: ['punch', 'legendary'], art: 'punch', rune: '千', hits: 5, partDmg: 0.6,
    effect: { stun: 0.3 },
  }),
  card('iron_body', 'Iron Body', 'universal', 'stance', 'legendary', 3, 0, 0, null, {
    desc: 'Breathe into the bone. 78% guard, and recover 14 health.',
    tags: ['guard'], art: 'chi', rune: '刚',
    effect: { guard: 0.78, heal: 14 },
  }),
  card('silent_death', 'Silent Death', 'universal', 'submission', 'epic', 4, 18, 18, 'neck', {
    desc: 'A blood choke from nowhere. Devastates the neck and stamina.',
    anim: 'choke', tags: ['submission', 'choke'], art: 'submission', rune: '黙',
    effect: { staminaDamage: 22, partBonus: 0.7, stun: 0.3 },
  }),

  // ---------- FORBIDDEN ----------
  card('blood_palm', 'Blood Palm', 'universal', 'forbidden', 'forbidden', 3, 14, 15, 'abdomen', {
    desc: 'Cut your own palm and drive it deep. Bleeds them; heals you.',
    anim: 'palm', tags: ['forbidden', 'chi'], art: 'blood', rune: '血',
    effect: { bleed: 4, lifesteal: 0.35, selfDamage: 5 },
  }),
  card('heart_seeker', 'Heart Seeker', 'universal', 'forbidden', 'forbidden', 4, 18, 19, 'heart', {
    desc: 'A spear hand behind the sternum. Targets the heart directly.',
    anim: 'point', tags: ['forbidden', 'point'], art: 'point', rune: '心',
    effect: { partBonus: 0.8, heart: 0.55, selfStamina: 8 },
  }),
  card('dim_mak', 'Dim Mak', 'universal', 'forbidden', 'forbidden', 5, 20, 8, 'neck', {
    desc: 'The delayed death touch. Little damage now; a curse that keeps bleeding.',
    anim: 'point', tags: ['forbidden', 'point', 'chi'], art: 'point', rune: '死',
    effect: { poison: 4, expose: 3, partBonus: 0.6, selfDamage: 8 },
  }),
  card('five_point_palm', 'Five Point Palm', 'universal', 'forbidden', 'forbidden', 6, 26, 32, 'heart', {
    desc: 'Five fingers, five meridians, one stopped heart. Costs 12 health.',
    anim: 'palm', tags: ['forbidden', 'chi'], art: 'blood', rune: '五',
    effect: { heart: 0.9, pierce: 0.7, selfDamage: 12, partBonus: 0.5 },
  }),
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

export const BASE_CARD_IDS = [
  'lead_jab', 'low_kick', 'body_hook', 'iron_guard', 'sidestep', 'breath_control',
  'straight_cross', 'front_kick', 'knee_strike', 'elbow_slash', 'leg_sweep',
];

export const STYLE_CARD_IDS = {
  shaolin: ['iron_palm', 'dragon_sweep', 'buddha_palm', 'crane_block', 'flow_state'],
  wingchun: ['chain_punch', 'pak_sao', 'centerline', 'biu_jee', 'trapping_hands'],
  shotokan: ['gyaku_zuki', 'mae_geri', 'age_uke', 'tetsui', 'heian_kata'],
  taekwondo: ['roundhouse', 'axe_kick', 'spin_hook', 'tornado_kick', 'taekwondo_step'],
  muaythai: ['teep', 'flying_knee', 'clinch_control', 'elbow_hell', 'shin_kick'],
  bjj: ['hip_throw', 'guard_pull', 'armbar', 'triangle', 'mounted_elbows'],
};

export const UNIVERSAL_UNLOCKS = [
  { level: 3, ids: ['pressure_point', 'chi_burst'] },
  { level: 5, ids: ['thousand_fists'] },
  { level: 6, ids: ['iron_body'] },
  { level: 7, ids: ['silent_death'] },
  { level: 8, ids: ['blood_palm'] },
  { level: 10, ids: ['heart_seeker'] },
  { level: 12, ids: ['dim_mak', 'five_point_palm'] },
];

export const BODY_PARTS = {
  head: { label: 'Head', x: 50, y: 8, effects: 'Concussion, blurred timing. 0 = KO.' },
  neck: { label: 'Neck', x: 50, y: 19, effects: 'Stamina drain. 0 = TKO.' },
  chest: { label: 'Chest', x: 50, y: 31, effects: 'Breath capacity. 0 = respiratory KO.' },
  heart: { label: 'Heart', x: 56, y: 34, effects: 'Chi flow and health. 0 = cardiac KO.' },
  abdomen: { label: 'Abdomen', x: 50, y: 43, effects: 'Stamina costs. 0 = internal TKO.' },
  arms: { label: 'Arms', x: 28, y: 34, effects: 'Strike power and guard.' },
  legs: { label: 'Legs', x: 42, y: 68, effects: 'Dodge and mobility.' },
  joints: { label: 'Joints', x: 68, y: 56, effects: 'Reaction speed and counters.' },
};

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Win your first fight.', reward: 20 },
  { id: 'perfect', name: 'Perfect Read', desc: 'Land 5 perfect reactions in one fight.', reward: 15 },
  { id: 'headhunter', name: 'Headhunter', desc: 'Win by head trauma.', reward: 25 },
  { id: 'iron_will', name: 'Iron Will', desc: 'Win a fight without losing more than 15 health.', reward: 30 },
  { id: 'survivor', name: 'Survivor', desc: 'Reach survival round 5.', reward: 40 },
  { id: 'champion', name: 'Iron Lotus Champion', desc: 'Win the tournament.', reward: 60 },
  { id: 'forbidden', name: 'Forbidden Knowledge', desc: 'Play a forbidden technique.', reward: 20 },
  { id: 'collector', name: 'Collector', desc: 'Own 30 techniques.', reward: 50 },
];

export const PERKS = [
  { id: 'iron_skin', name: 'Iron Skin', desc: 'Take 8% less damage.', cost: 1, req: 2, icon: '盾', branch: 0 },
  { id: 'deep_breath', name: 'Deep Breath', desc: '+1 Chi at the start of each turn.', cost: 1, req: 3, icon: '息', branch: 0 },
  { id: 'bone_breaker', name: 'Bone Breaker', desc: '+15% body-part damage.', cost: 1, req: 4, icon: '骨', branch: 0 },
  { id: 'eagle_eye', name: 'Eagle Eye', desc: '+18% perfect timing zone.', cost: 1, req: 2, icon: '眼', branch: 1 },
  { id: 'flow', name: 'Flow', desc: 'Perfect reactions restore 1 Chi.', cost: 1, req: 3, icon: '流', branch: 1 },
  { id: 'counter_master', name: 'Counter Master', desc: '+45% counterattack damage.', cost: 1, req: 4, icon: '反', branch: 1 },
  { id: 'marathon', name: 'Marathon Lung', desc: '+25 max Stamina.', cost: 1, req: 2, icon: '肺', branch: 2 },
  { id: 'killer', name: 'Killer Instinct', desc: '+12% damage to enemies below 35% health.', cost: 1, req: 3, icon: '杀', branch: 2 },
  { id: 'last_stand', name: 'Last Stand', desc: 'Once per fight, survive a KO at 1 health.', cost: 1, req: 5, icon: '立', branch: 2 },
];

function mkOpponent(id, name, title, style, level, hp, stamina, deck, ai, look, opts = {}) {
  return { id, name, title, style, level, hp, stamina, deck, ai, look, ...opts };
}

export const OPPONENTS = [
  mkOpponent('rook', 'Rook', 'The Alley Bruiser', 'shotokan', 1, 92, 100,
    ['lead_jab', 'body_hook', 'straight_cross', 'low_kick', 'front_kick', 'iron_guard', 'knee_strike', 'tetsui'],
    { aggro: 0.78, guard: 0.14, dodge: 0.05, counter: 0.04, stance: 0.18, targetSmart: 0.2 },
    { skin: '#a86f4d', hair: '#171310', hairstyle: 'short', gi: '#4b3d32', trim: '#8d7a63', band: '#7a3028', beard: true, scar: true, tattoo: true },
    { desc: 'A barroom brawler with heavy hands and no patience. Hits hard, guards late.', reward: { xp: 80, essence: 25 } }),

  mkOpponent('meilin', 'Mei Lin', 'The Silk Viper', 'wingchun', 2, 106, 112,
    ['chain_punch', 'lead_jab', 'pak_sao', 'centerline', 'low_kick', 'pressure_point', 'sidestep', 'straight_cross'],
    { aggro: 0.85, guard: 0.2, dodge: 0.16, counter: 0.1, stance: 0.25, targetSmart: 0.45 },
    { skin: '#d8a37a', hair: '#14100d', hairstyle: 'ponytail', gi: '#384f50', trim: '#b9cccd', band: '#96b6ba', beard: false, scar: false, tattoo: false },
    { desc: 'Fast hands, faster reads. She punishes hesitation with the centerline.', reward: { xp: 120, essence: 35 } }),

  mkOpponent('tetsuo', 'Tetsuo', 'The Iron Line', 'shotokan', 3, 124, 118,
    ['gyaku_zuki', 'mae_geri', 'age_uke', 'tetsui', 'straight_cross', 'heian_kata', 'iron_palm', 'front_kick'],
    { aggro: 0.6, guard: 0.34, dodge: 0.09, counter: 0.12, stance: 0.34, targetSmart: 0.5 },
    { skin: '#c58a5e', hair: '#16110e', hairstyle: 'short', gi: '#ded9ca', trim: '#2b2b2b', band: '#8e2626', beard: false, scar: true, tattoo: false },
    { desc: 'A karateka who treats defense as a weapon. Walk into his line once and learn.', reward: { xp: 170, essence: 50 } }),

  mkOpponent('kwan', 'Kwan', 'The Eight-Limbed', 'muaythai', 4, 140, 128,
    ['teep', 'elbow_slash', 'knee_strike', 'flying_knee', 'elbow_hell', 'clinch_control', 'shin_kick', 'body_hook'],
    { aggro: 0.9, guard: 0.2, dodge: 0.08, counter: 0.08, stance: 0.22, targetSmart: 0.62 },
    { skin: '#b97a4f', hair: '#1a1410', hairstyle: 'topknot', gi: '#6d1e18', trim: '#d8ad55', band: '#d7b24f', beard: false, scar: true, tattoo: true },
    { desc: 'Elbows like knives, knees like pistons. He opens wounds and lets them work.', reward: { xp: 220, essence: 65 } }),

  mkOpponent('silva', 'Silva', 'The Anaconda', 'bjj', 5, 156, 132,
    ['hip_throw', 'guard_pull', 'armbar', 'triangle', 'mounted_elbows', 'pressure_point', 'body_hook', 'iron_guard'],
    { aggro: 0.68, guard: 0.3, dodge: 0.18, counter: 0.17, stance: 0.36, targetSmart: 0.7 },
    { skin: '#8e5d3c', hair: '#15100c', hairstyle: 'short', gi: '#1e2a22', trim: '#9db184', band: '#6e8a58', beard: true, scar: true, tattoo: false },
    { desc: 'A grappler who turns every exchange into a submission. Stay off the floor.', reward: { xp: 280, essence: 85 } }),

  mkOpponent('shen', 'Master Shen', 'The Hollow Palm', 'shaolin', 7, 176, 150,
    ['iron_palm', 'dragon_sweep', 'buddha_palm', 'flow_state', 'crane_block', 'pressure_point', 'dim_mak', 'heart_seeker', 'thousand_fists'],
    { aggro: 0.78, guard: 0.34, dodge: 0.2, counter: 0.16, stance: 0.38, targetSmart: 0.82 },
    { skin: '#b8855c', hair: '#d9d4c8', hairstyle: 'bald', gi: '#3a2a2a', trim: '#d9a441', band: '#d9a441', beard: true, scar: true, tattoo: true },
    { desc: 'Your teacher. He knows every weakness you have, because he put them there.', reward: { xp: 400, essence: 130 } }),
];

export const TOURNAMENT_ROUNDS = [
  { name: 'Quarterfinal', opponent: 'meilin' },
  { name: 'Semifinal', opponent: 'tetsuo' },
  { name: 'Final', opponent: 'kwan' },
  { name: 'Championship', opponent: 'shen' },
];

export const SURVIVAL_NAMES = ['The Cutter', 'Black Crane', 'Iron Monger', 'The Pale Hand', 'Nine Fangs', 'The Debt Collector', 'Red Lotus', 'The Quiet Monk', 'Last Door'];
export const SURVIVAL_STYLES = ['wingchun', 'shotokan', 'muaythai', 'bjj', 'taekwondo', 'shaolin'];

export function xpForLevel(level) {
  return 120 + (level - 1) * 85;
}

export function starterCollection(styleId) {
  return [...BASE_CARD_IDS, ...(STYLE_CARD_IDS[styleId] || [])];
}

export function defaultDeck(styleId) {
  const styleCards = (STYLE_CARD_IDS[styleId] || []).slice(0, 4);
  return [...BASE_CARD_IDS, ...styleCards].slice(0, 20);
}

export function cardLevelStats(base, level = 1) {
  const mult = 1 + (level - 1) * 0.08;
  return {
    ...base,
    dmg: Math.round(base.dmg * mult),
    level,
  };
}
