/* ============================================================
   ANIMATION PACK "moments" (v2.2 wave 4): moments across the app. PURE
   classic script, like every pack. One item per style; the page side
   (78-anim-moments.js) picks them through animPickFor (the gallery's pins,
   favourites, blocks, packs off and the intensity level all apply):
     task-done   the finishing touch on a completed task, one style per stream
     streak      the flame beside the streak; it grows over a week (.ap-gr, --ap-grow)
     boss        a long-overdue task finally done (ANIM_BOSS_DAYS)
     progress    how the progress rings fill (fx: liquid | glow | sheen)
     meeting     the pulse on an event about to start (fx: pulse | glow | beat)
     money       payday rain (tag payday), a month under budget (under-budget),
                 the vendor tiles at rest (vendor, fx: shimmer | glint)
     home        the living background (living, fx: sunarc | drift) and the
                 widgets at rest (idle, fx: nod | glow)
     focus       a scene that grows through a focus block (.ap-gr, --ap-grow)
     people      a birthday (birthday) and a wave for someone quiet a while (while)
     countdown   warms up as the date nears (.ap-gr, --ap-grow = the heat)
   Items with an fx are also a style the page applies by name
   (html[data-ap-*], 71-anim-moments.css); their drawing is the gallery preview.
   No user text in any drawing.
   ============================================================ */
(function () {
  const items = [];
  const add = (o) => items.push(Object.assign({ tags: [], mood: 'cheerful', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static' }, o));
  const r2 = (n) => +n.toFixed(2);
  const spark = (x, y, r, d, cls) => `<path class="${cls || 'c'} x-twinkle" style="--d:${d}s" d="M${x} ${y - r}l${r2(r * 0.3)} ${r2(r * 0.7)} ${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}-${r2(r * 0.7)}-${r2(r * 0.7)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}z"/>`;
  const coin = (x, y, r, d) => `<g class="x-fall" style="--d:${d}s"><circle class="c" cx="${x}" cy="${y}" r="${r}"/><circle class="lw" cx="${x}" cy="${y}" r="${r2(r * 0.55)}"/></g>`;
  const flame = (cls) => `<path class="${cls}" d="M32 58c-10 0-15-7-15-15 0-9 8-14 9-24 6 5 6 10 6 14 2-3 3-6 3-9 6 5 12 11 12 19 0 8-5 15-15 15z"/>`;
  const conf = (n, seed) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + seed, rr = 18 + (i % 3) * 5;
    return `<rect class="${['c', 's', 'm'][i % 3]} x-pop" style="--d:${r2(i * 0.08)}s" x="${r2(32 + Math.cos(a) * rr - 1.5)}" y="${r2(30 + Math.sin(a) * rr - 1.5)}" width="3" height="3" rx="1"/>`;
  }).join('');

  /* ---------- task completion (per stream) ---------- */
  add({ id: 'done-sparkle', slot: 'task-done', label: 'Sparkle ring', colour: 'amber', tags: ['done', 'sparkle'],
    svg: () => `<path class="lc t x-pop" d="M22 33l7 7 14-15"/>${[0, 1, 2, 3, 4, 5].map(i => spark(r2(32 + 22 * Math.cos(i * 1.047)), r2(32 + 22 * Math.sin(i * 1.047)), 4, r2(i * 0.15))).join('')}` });
  add({ id: 'done-stamp', slot: 'task-done', label: 'Ink stamp', colour: 'red', tags: ['done', 'stamp'], mood: 'proud',
    svg: () => `<g class="x-stamp"><circle class="lc t" cx="32" cy="32" r="20"/><circle class="lc" cx="32" cy="32" r="15" opacity=".6"/><path class="lc t" d="M24 32l6 6 11-12"/></g>` });
  add({ id: 'done-leaves', slot: 'task-done', label: 'Falling leaves', colour: 'green', tags: ['done', 'leaf'], mood: 'calm',
    svg: () => [[18, 10, 0], [34, 6, 0.5], [48, 14, 1], [26, 22, 1.4]].map(([x, y, d]) => `<g class="x-fall" style="--d:${d}s"><path class="c" d="M${x} ${y}c6 0 9 4 9 9-6 0-9-4-9-9z"/><path class="lw" d="M${x} ${y}l9 9"/></g>`).join('') + '<path class="lm" d="M8 56h48"/>' });
  add({ id: 'done-rocket', slot: 'task-done', label: 'Lift-off', colour: 'indigo', tags: ['done', 'rocket'], mood: 'energetic', intensity: 'standard',
    svg: () => `<g class="x-rise"><path class="c" d="M32 8c7 6 9 16 7 26H25c-2-10 0-20 7-26z"/><circle class="w" cx="32" cy="22" r="3.5"/><path class="s" d="M25 34l-6 7 7-1zM39 34l6 7-7-1z"/><path class="lc x-flicker" d="M29 38q3 9 6 0"/></g><path class="lm dash" d="M14 58h36"/>` });
  add({ id: 'done-rosette', slot: 'task-done', label: 'Rosette', colour: 'violet', tags: ['done', 'ribbon'], mood: 'proud',
    svg: () => `<g class="x-swing o-t"><path class="s" d="M24 36l-6 22 8-5 4 8 4-25zM40 36l6 22-8-5-4 8-4-25z"/><circle class="c" cx="32" cy="26" r="15"/><circle class="w" cx="32" cy="26" r="9"/><path class="lc" d="M28 26l3 3 5-6"/></g>` });
  add({ id: 'done-ripple', slot: 'task-done', label: 'Ripple', colour: 'teal', tags: ['done', 'water'], mood: 'calm',
    svg: () => `${[10, 18, 26].map((r, i) => `<circle class="lc x-pulse" style="--d:${i * 0.3}s" cx="32" cy="32" r="${r}" opacity="${r2(1 - i * 0.28)}"/>`).join('')}<circle class="c" cx="32" cy="32" r="5"/>` });

  /* ---------- streak flames (grow with --ap-grow) ---------- */
  add({ id: 'streak-flame', slot: 'streak', label: 'Growing flame', colour: 'orange', tags: ['streak', 'fire'], mood: 'energetic',
    svg: () => `<g class="ap-gr"><g class="x-flicker o-b">${flame('c')}<path class="s" d="M32 56c-5 0-7-4-7-8 0-5 4-7 5-12 4 4 9 7 9 12 0 4-2 8-7 8z"/></g></g>` });
  add({ id: 'streak-candle', slot: 'streak', label: 'Candle', colour: 'amber', tags: ['streak', 'candle'], mood: 'cosy',
    svg: () => `<rect class="m" x="25" y="34" width="14" height="24" rx="2"/><path class="lw" d="M28 40v12"/><g class="ap-gr"><g class="x-flicker o-b"><path class="c" d="M32 33c-5 0-7-4-6-8 1-4 5-6 6-12 3 5 7 8 6 12 0 4-2 8-6 8z"/></g></g>` });
  add({ id: 'streak-campfire', slot: 'streak', label: 'Campfire', colour: 'red', tags: ['streak', 'campfire'], mood: 'cosy', intensity: 'standard',
    svg: () => `<path class="lk t" d="M14 56l36-8M50 56l-36-8"/><g class="ap-gr"><g class="x-flicker o-b"><path class="c" d="M32 50c-9 0-12-6-11-12 1-6 7-9 8-18 5 5 13 10 13 18 0 7-4 12-10 12z"/></g>${spark(22, 18, 2.5, 0.3, 's')}${spark(44, 12, 2, 0.9, 's')}</g>` });

  /* ---------- boss battles ---------- */
  add({ id: 'boss-dragon', slot: 'boss', label: 'Dragon defeated', colour: 'green', tags: ['boss', 'dragon'], mood: 'proud', intensity: 'standard',
    svg: () => `<g class="x-wobble"><path class="c" d="M10 50c4-14 14-20 26-18l8-8 3 8 7 2-6 5c2 8-2 14-10 16-9 2-20 0-28-5z"/><circle class="w" cx="47" cy="33" r="1.8"/><path class="s" d="M24 36l-6-12 12 8z"/></g><g class="x-swing o-b"><path class="lk t" d="M52 8L38 30"/><path class="lc t" d="M36 26l6 6"/></g>${spark(14, 16, 4, 0.4)}` });
  add({ id: 'boss-castle', slot: 'boss', label: 'Castle taken', colour: 'indigo', tags: ['boss', 'castle'], mood: 'proud', intensity: 'standard',
    svg: () => `<path class="c" d="M10 58V30h6v5h5v-5h6v5h5v-5h6v5h5v-5h6v28z"/><rect class="w" x="28" y="44" width="8" height="14" rx="4"/><path class="lk" d="M32 30V8"/><g class="x-flag o-l"><path class="s" d="M32 8h14l-4 5 4 5H32z"/></g>${spark(50, 26, 3, 0.6)}` });
  add({ id: 'boss-summit', slot: 'boss', label: 'Summit at last', colour: 'teal', tags: ['boss', 'mountain'], mood: 'proud', intensity: 'standard',
    svg: () => `<path class="c" d="M2 58l22-34 9 12 7-8 22 30z"/><path class="w" d="M24 24l-6 9 4-2 3 3 3-4z"/><path class="lk" d="M24 24V8"/><g class="x-flag o-l"><path class="s" d="M24 8h12l-3 4 3 4H24z"/></g>${spark(50, 14, 3.5, 0.2)}${spark(8, 20, 2.5, 0.8)}` });

  /* ---------- progress fills (fx) ---------- */
  const ring = (inner) => `<circle class="m" cx="32" cy="32" r="22" opacity=".35"/><path class="lc t" d="M32 10a22 22 0 1 1-21 28"/>${inner}`;
  add({ id: 'ring-liquid', slot: 'progress', label: 'Liquid fill', colour: 'blue', tags: ['ring', 'liquid'], fx: 'liquid', mood: 'calm',
    svg: () => ring(`<g class="x-wave"><path class="s" d="M12 36q5-4 10 0t10 0 10 0 10 0v8a20 20 0 0 1-40 0z"/></g>`) });
  add({ id: 'ring-glow', slot: 'progress', label: 'Glowing tip', colour: 'violet', tags: ['ring', 'glow'], fx: 'glow', mood: 'dreamy',
    svg: () => ring(`<circle class="c x-pulse" cx="11" cy="38" r="5"/>`) });
  add({ id: 'ring-sheen', slot: 'progress', label: 'Turning sheen', colour: 'teal', tags: ['ring', 'sheen'], fx: 'sheen', mood: 'focused',
    svg: () => ring(`<g class="x-spin-slow o-v"><path class="lw t" d="M32 10a22 22 0 0 1 12 4"/></g>`) });

  /* ---------- meeting countdown (fx) ---------- */
  add({ id: 'soon-pulse', slot: 'meeting', label: 'Pulse', colour: 'blue', tags: ['meeting', 'pulse'], fx: 'pulse', mood: 'focused',
    svg: () => `<rect class="c" x="12" y="22" width="40" height="20" rx="5"/><rect class="lc x-pulse" x="7" y="17" width="50" height="30" rx="8"/>` });
  add({ id: 'soon-bell', slot: 'meeting', label: 'Little bell', colour: 'amber', tags: ['meeting', 'bell'], fx: 'beat', mood: 'cheerful',
    svg: () => `<g class="x-ring o-t"><path class="c" d="M20 44c3-3 3-8 3-14a9 9 0 0 1 18 0c0 6 0 11 3 14z"/><circle class="s" cx="32" cy="48" r="3.5"/></g><path class="lm" d="M14 20q-3 6 0 12M50 20q3 6 0 12"/>` });
  add({ id: 'soon-glow', slot: 'meeting', label: 'Soft glow', colour: 'pink', tags: ['meeting', 'glow'], fx: 'glow', mood: 'calm',
    svg: () => `<circle class="s x-breathe" cx="32" cy="32" r="22"/><circle class="w lc" cx="32" cy="32" r="13"/><path class="lc" d="M32 25v8l5 3"/>` });

  /* ---------- money ---------- */
  add({ id: 'pay-coins', slot: 'money', label: 'Coin rain', colour: 'amber', tags: ['payday', 'coins'], mood: 'cheerful', intensity: 'standard',
    svg: () => [[14, 10, 5, 0], [30, 4, 6, 0.6], [46, 12, 5, 0.3], [22, 26, 4, 1], [40, 28, 4.5, 1.3]].map(([x, y, r, d]) => coin(x, y, r, d)).join('') + '<path class="lm" d="M6 58h52"/>' });
  add({ id: 'pay-notes', slot: 'money', label: 'Notes fluttering', colour: 'green', tags: ['payday', 'notes'], mood: 'cheerful', intensity: 'standard',
    svg: () => [[10, 8, 0], [34, 4, 0.7], [22, 24, 1.2], [42, 26, 0.4]].map(([x, y, d]) => `<g class="x-fall" style="--d:${d}s"><rect class="c" x="${x}" y="${y}" width="16" height="9" rx="1.5"/><circle class="lw" cx="${x + 8}" cy="${y + 4.5}" r="2.5"/></g>`).join('') });
  add({ id: 'under-jar', slot: 'money', label: 'Jar to spare', colour: 'teal', tags: ['under-budget', 'jar'], mood: 'proud', intensity: 'standard',
    svg: () => `<g class="x-bounce o-b"><path class="w lc t" d="M20 22h24v4c4 3 6 8 6 14v10a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V40c0-6 2-11 6-14z"/><path class="c" d="M15 42h34v8a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5z"/><rect class="k" x="18" y="16" width="28" height="6" rx="2"/></g>${conf(8, 0.3)}` });
  add({ id: 'under-piggy', slot: 'money', label: 'Happy piggy', colour: 'pink', tags: ['under-budget', 'piggy'], mood: 'cheerful', intensity: 'standard',
    svg: () => `<g class="x-bob"><ellipse class="c" cx="32" cy="38" rx="19" ry="14"/><circle class="c" cx="49" cy="36" r="6"/><circle class="k" cx="43" cy="32" r="1.6"/><path class="s" d="M24 26l3-6 4 5z"/><rect class="k" x="27" y="25" width="10" height="2.4" rx="1.2"/><path class="c" d="M20 50v6h5v-5M38 50v6h5v-5"/></g>${conf(6, 1.1)}` });
  add({ id: 'vendor-shimmer', slot: 'money', label: 'Tile shimmer', colour: 'slate', tags: ['vendor', 'shimmer'], fx: 'shimmer', mood: 'calm',
    svg: () => `<rect class="c" x="14" y="14" width="36" height="36" rx="10"/><g class="x-slidel"><path class="w" d="M30 10l8 0-14 44h-8z" opacity=".5"/></g>` });
  add({ id: 'vendor-glint', slot: 'money', label: 'Tile glint', colour: 'indigo', tags: ['vendor', 'glint'], fx: 'glint', mood: 'cheerful',
    svg: () => `<rect class="c" x="14" y="14" width="36" height="36" rx="10"/>${spark(46, 18, 6, 0, 'w')}${spark(20, 44, 3, 0.8, 's')}` });

  /* ---------- home ---------- */
  add({ id: 'living-sunarc', slot: 'home', label: 'Sun across the day', colour: 'amber', tags: ['living', 'sun'], fx: 'sunarc', mood: 'calm',
    svg: () => `<path class="lm dash" d="M6 50q26-44 52 0"/><g class="x-float"><circle class="c" cx="22" cy="26" r="7"/></g><path class="lm" d="M4 54h56"/>` });
  add({ id: 'living-drift', slot: 'home', label: 'Drifting light', colour: 'violet', tags: ['living', 'drift'], fx: 'drift', mood: 'dreamy',
    svg: () => `<circle class="s x-float" cx="22" cy="26" r="14" opacity=".8"/><circle class="c x-float2" cx="42" cy="38" r="11" opacity=".55"/><circle class="m x-float" style="--d:1s" cx="40" cy="16" r="6" opacity=".5"/>` });
  add({ id: 'idle-nod', slot: 'home', label: 'Nodding icons', colour: 'blue', tags: ['idle', 'nod'], fx: 'nod', mood: 'cheerful', intensity: 'standard',
    svg: () => `<rect class="s" x="8" y="12" width="48" height="40" rx="7"/><g class="x-wobble"><circle class="c" cx="18" cy="22" r="4.5"/></g><path class="lm" d="M27 22h20M14 34h36M14 42h26"/>` });
  add({ id: 'idle-glow', slot: 'home', label: 'Breathing headers', colour: 'teal', tags: ['idle', 'glow'], fx: 'glow', mood: 'calm', intensity: 'standard',
    svg: () => `<rect class="s" x="8" y="12" width="48" height="40" rx="7"/><rect class="c x-breathe" x="8" y="12" width="48" height="10" rx="5" opacity=".7"/><path class="lm" d="M14 32h36M14 40h28"/>` });

  /* ---------- focus sessions (grow with --ap-grow) ---------- */
  add({ id: 'focus-plant', slot: 'focus', label: 'Growing plant', colour: 'green', tags: ['focus', 'plant'], mood: 'calm',
    svg: () => `<path class="m" d="M20 48h24l-3 12H23z"/><g class="ap-gr"><path class="lc t" d="M32 48V20"/><g class="x-swing o-b"><path class="c" d="M32 36c-10 0-14-6-14-12 8 0 14 4 14 12zM32 28c8 0 12-5 12-10-7 0-12 3-12 10z"/></g><circle class="s x-pop" style="--d:.4s" cx="32" cy="16" r="4"/></g>` });
  add({ id: 'focus-city', slot: 'focus', label: 'City lighting up', colour: 'indigo', tags: ['focus', 'city'], mood: 'focused',
    svg: () => `<path class="k" d="M4 60V34h10v-8h10v34h4V22h12v38h4V30h8v-6h8v36z" opacity=".85"/><g class="ap-gr">${[[8, 40], [18, 32], [18, 44], [32, 28], [32, 40], [36, 50], [48, 36], [54, 30], [54, 46]].map(([x, y], i) => `<rect class="c x-blink" style="--d:${r2(i * 0.35)}s" x="${x}" y="${y}" width="3" height="3"/>`).join('')}</g>` });
  add({ id: 'focus-tree', slot: 'focus', label: 'Tree in leaf', colour: 'teal', tags: ['focus', 'tree'], mood: 'calm', season: 'any',
    svg: () => `<path class="m" d="M8 58h48"/><path class="k" d="M30 58V38h4v20z"/><g class="ap-gr"><g class="x-breathe"><circle class="c" cx="32" cy="28" r="14"/><circle class="s" cx="22" cy="34" r="8"/><circle class="s" cx="42" cy="34" r="8"/></g></g>` });

  /* ---------- people ---------- */
  add({ id: 'bday-cake', slot: 'people', label: 'Birthday cake', colour: 'pink', tags: ['birthday', 'cake'], mood: 'cheerful',
    svg: () => `<rect class="c" x="14" y="34" width="36" height="20" rx="3"/><path class="w" d="M14 40q4 4 9 0t9 0 9 0 9 0v-3H14z"/>${[22, 32, 42].map((x, i) => `<rect class="s" x="${x - 1.5}" y="24" width="3" height="10"/><path class="c x-flicker o-b" style="--d:${i * 0.2}s" d="M${x} 16c-2 3-2 5 0 7 2-2 2-4 0-7z"/>`).join('')}` });
  add({ id: 'bday-balloons', slot: 'people', label: 'Balloons', colour: 'red', tags: ['birthday', 'balloons'], mood: 'cheerful', intensity: 'standard',
    svg: () => [[22, 22, 'c', 0], [40, 18, 's', 0.5], [32, 30, 'm', 1]].map(([x, y, c, d]) => `<g class="x-float" style="--d:${d}s"><ellipse class="${c}" cx="${x}" cy="${y}" rx="8" ry="10"/><path class="lm" d="M${x} ${y + 10}q-3 8 2 18"/></g>`).join('') });
  add({ id: 'while-wave', slot: 'people', label: 'A friendly wave', colour: 'amber', tags: ['while', 'wave'], mood: 'cosy',
    svg: () => `<g class="x-wave-hand o-b"><path class="c" d="M24 54c-6-4-10-12-10-18l2-14a3 3 0 0 1 6 0v10V14a3 3 0 0 1 6 0v16V12a3 3 0 0 1 6 0v18V16a3 3 0 0 1 6 0v22c0 10-6 18-16 16z"/></g><path class="lm" d="M48 18q4 4 0 8M52 14q7 8 0 16"/>` });
  add({ id: 'while-letter', slot: 'people', label: 'A note on its way', colour: 'blue', tags: ['while', 'letter'], mood: 'calm',
    svg: () => `<g class="x-float"><path class="c" d="M10 32l44-18-12 38-9-13z"/><path class="s" d="M33 39l21-25-26 21z"/></g><path class="lm dash" d="M4 54c8-2 12-6 18-12"/>` });

  /* ---------- countdowns (warm with --ap-grow = the heat) ---------- */
  add({ id: 'cd-hourglass', slot: 'countdown', label: 'Hourglass', colour: 'amber', tags: ['countdown', 'hourglass'], mood: 'focused',
    svg: () => `<path class="k" d="M16 8h32v4H16zM16 52h32v4H16z"/><path class="w lc" d="M20 12h24c0 10-8 14-8 20s8 10 8 20H20c0-10 8-14 8-20s-8-10-8-20z"/><path class="c x-sandtop" d="M24 16h16c-1 6-6 9-8 12-2-3-7-6-8-12z"/><path class="c x-sandbot" d="M24 50h16c-2-5-5-7-8-8-3 1-6 3-8 8z"/><g class="ap-gr">${spark(52, 30, 3, 0.3)}</g>` });
  add({ id: 'cd-rocket', slot: 'countdown', label: 'Rocket on the pad', colour: 'indigo', tags: ['countdown', 'rocket'], mood: 'energetic',
    svg: () => `<path class="m" d="M10 58h44"/><path class="lm" d="M18 58V30M46 58V30"/><g class="x-pulse"><path class="c" d="M32 8c6 6 8 16 6 30H26c-2-14 0-24 6-30z"/><circle class="w" cx="32" cy="22" r="3.5"/></g><g class="ap-gr"><g class="x-flicker o-t"><path class="s" d="M27 40q5 14 10 0z"/></g></g>` });
  add({ id: 'cd-fuse', slot: 'countdown', label: 'Lit fuse', colour: 'red', tags: ['countdown', 'fuse'], mood: 'energetic', intensity: 'standard',
    svg: () => `<path class="lm" d="M8 52q14-2 20-14t20-12"/><circle class="c" cx="14" cy="50" r="9"/><g class="ap-gr"><g class="x-flicker">${spark(48, 26, 5, 0, 'c')}${spark(54, 20, 2.5, 0.3, 's')}</g></g>` });

  animRegisterPack({
    id: 'moments', name: 'Moments', version: '1.0.0',
    description: 'Moments across the app: task completions, streaks, boss battles, payday, birthdays, focus sessions and countdowns.',
    items,
  });
})();
