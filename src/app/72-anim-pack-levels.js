/* ============================================================
   ANIMATION PACK "levels" (2.16): the animations levelling up unlocks (the
   game, 92-game-*.js). PURE classic script, like every pack. Each item carries
   `unlock: 'level-N'` (71-achievements.js ACH_DEFS): until that level is reached
   it never comes up in a pick, and the gallery shows it locked with the level
   it needs. Cosmetic only. Same drawing kit as the "rewards" pack. No user text.
   ============================================================ */
(function () {
  const items = [];
  const add = (o) => items.push(Object.assign({ tags: ['reward', 'level'], mood: 'proud', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static' }, o));
  const r2 = (n) => +n.toFixed(2);
  const star = (x, y, r, d, cls) => `<path class="${cls || 'c'} x-twinkle" style="--d:${d}s" d="M${x} ${r2(y - r)}l${r2(r * 0.3)} ${r2(r * 0.7)} ${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}-${r2(r * 0.7)}-${r2(r * 0.7)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}z"/>`;

  add({ id: 'lv-star', slot: 'symbol', label: 'Star badge', colour: 'amber', unlock: 'level-5', tags: ['reward', 'level', 'badge', 'star'],
    svg: () => `<path class="m lk" d="M24 38l-6 18 7-3 4 6 4-17z"/><path class="m lk" d="M40 38l6 18-7-3-4 6-4-17z"/><g class="x-float"><circle class="c lk" cx="32" cy="27" r="15"/><circle class="w" cx="32" cy="27" r="11" opacity=".35"/>${star(32, 27, 8, 0.2, 's')}</g>${star(53, 11, 3, 0.6, 's')}${star(11, 15, 2.5, 1.1, 's')}` });
  add({ id: 'lv-comet', slot: 'celebration', label: 'Comet', colour: 'blue', unlock: 'level-10', tags: ['reward', 'level', 'comet', 'sky'], intensity: 'standard', mood: 'energetic',
    svg: () => `<g class="x-rise"><path class="lc" d="M8 52L38 24"/><path class="lm" d="M14 57L41 31M5 45L33 20"/><circle class="c lk" cx="43" cy="20" r="7"/><circle class="s" cx="45" cy="18" r="2.5"/></g>${star(54, 40, 3, 0.4, 's')}${star(22, 12, 2.5, 0.9, 's')}${star(50, 55, 2, 1.3, 's')}${star(10, 30, 2, 1.7, 's')}` });
  add({ id: 'lv-firefly', slot: 'streak', label: 'Firefly jar', colour: 'green', unlock: 'level-15', tags: ['reward', 'level', 'streak', 'fireflies'], mood: 'cosy',
    svg: () => `<rect class="m lk" x="22" y="9" width="20" height="6" rx="2"/><path class="w lk" d="M20 17h24v30c0 6-5 9-12 9s-12-3-12-9z"/><path class="lw" d="M25 22v24"/><g class="x-flicker o-b"><circle class="s" cx="29" cy="37" r="2.6"/></g><g class="x-flicker o-b" style="--d:.5s"><circle class="c" cx="37" cy="29" r="2.6"/></g><g class="x-flicker o-b" style="--d:1s"><circle class="s" cx="35" cy="45" r="2.2"/></g><g class="x-float"><circle class="c" cx="51" cy="13" r="2"/></g><g class="x-float" style="--d:.8s"><circle class="s" cx="12" cy="24" r="1.6"/></g>` });
  add({ id: 'lv-balloon', slot: 'opening', label: 'Hot-air balloon', colour: 'red', unlock: 'level-20', tags: ['reward', 'level', 'balloon', 'sky'], mood: 'cheerful',
    svg: () => `<g class="x-wave"><path class="w" d="M4 52a5 5 0 0 1 9-3 4 4 0 0 1 6 4H4z"/><path class="w" d="M45 31a4 4 0 0 1 7-2 3 3 0 0 1 5 3H45z"/></g><g class="x-float"><path class="c lk" d="M32 5c-11 0-18 8-18 17 0 8 7 14 12 19h12c5-5 12-11 12-19 0-9-7-17-18-17z"/><path class="lw" d="M32 5c-5 4-7 10-7 17s4 13 7 19M32 5c5 4 7 10 7 17s-4 13-7 19"/><path class="lk" d="M27 41l1 6M37 41l-1 6"/><rect class="m lk" x="27" y="47" width="10" height="7" rx="1.5"/></g>` });
  add({ id: 'lv-lighthouse', slot: 'symbol', label: 'Lighthouse', colour: 'teal', unlock: 'level-30', tags: ['reward', 'level', 'lighthouse', 'sea'], mood: 'calm',
    svg: () => `<g class="x-flicker o-b"><path class="s" opacity=".5" d="M37 15l22-7v14z"/></g><g class="x-flicker o-b" style="--d:1s"><path class="s" opacity=".5" d="M27 15L5 8v14z"/></g><path class="w lk" d="M27 50l2-30h6l2 30z"/><path class="c" d="M28.3 40h7.4l.4 5h-8.2zM29 28h6l.3 5h-6.6z"/><rect class="m lk" x="27" y="14" width="10" height="6" rx="1"/><path class="k" d="M26 14l6-6 6 6z"/><g class="x-wave"><path class="lc" d="M2 56q7-4 14 0t14 0 14 0 14 0"/></g>` });
  add({ id: 'lv-summit', slot: 'boss', label: 'Summit flag', colour: 'slate', unlock: 'level-40', tags: ['reward', 'level', 'summit', 'mountain'], intensity: 'standard',
    svg: () => `<path class="m lk" d="M3 57l18-25 8 9 11-18 21 34z"/><path class="w" d="M40 23l-5 8 5-2 4 3z"/><path class="lk" d="M40 23V7"/><g class="x-wave o-v" style="transform-origin:40px 7px"><path class="c lk" d="M40 7h14l-4 4 4 4H40z"/></g>${star(13, 14, 3, 0.3, 's')}${star(25, 7, 2, 0.8, 's')}${star(55, 26, 2, 1.2, 's')}` });
  add({ id: 'lv-crown', slot: 'celebration', label: 'Crown', colour: 'amber', unlock: 'level-50', tags: ['reward', 'level', 'crown', 'fifty'], intensity: 'standard', mood: 'energetic',
    svg: () => `<g class="x-pop"><path class="c lk" d="M12 46l-2-24 12 10 10-16 10 16 12-10-2 24z"/><rect class="m lk" x="12" y="46" width="40" height="6" rx="2"/><circle class="s" cx="22" cy="40" r="2.5"/><circle class="w" cx="32" cy="38" r="3"/><circle class="s" cx="42" cy="40" r="2.5"/></g>${star(9, 12, 3, 0.2, 's')}${star(55, 10, 3.5, 0.7, 's')}${star(32, 6, 2.5, 1.1, 's')}` });

  animRegisterPack({
    id: 'levels', name: 'Levels', version: '1.0.0',
    description: 'Animations you unlock by levelling up (the Game page).',
    css: '', items,
  });
})();
