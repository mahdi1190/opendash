/* ============================================================
   ANIMATION PACK "rewards" (v2.2 wave 5): the animations achievements unlock.
   PURE classic script, like every pack. Each item carries `unlock: '<achievement
   id>'` (71-achievements.js ACH_DEFS): until that achievement is earned it never
   comes up in a pick, and the gallery shows it locked with how to earn it. Once
   unlocked it joins its slot like any other item (pin, favourite, block apply).
   No user text in any drawing.
   ============================================================ */
(function () {
  const items = [];
  const add = (o) => items.push(Object.assign({ tags: ['reward'], mood: 'proud', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static' }, o));
  const r2 = (n) => +n.toFixed(2);
  const star = (x, y, r, d, cls) => `<path class="${cls || 'c'} x-twinkle" style="--d:${d}s" d="M${x} ${r2(y - r)}l${r2(r * 0.3)} ${r2(r * 0.7)} ${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.7)} ${r2(r * 0.3)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}-${r2(r * 0.7)}-${r2(r * 0.7)}-${r2(r * 0.3)} ${r2(r * 0.7)}-${r2(r * 0.3)}z"/>`;
  const leaf = (x, y, a, d) => `<g class="x-pop" style="--d:${d}s"><ellipse class="c" cx="${x}" cy="${y}" rx="3" ry="6" transform="rotate(${a} ${x} ${y})"/></g>`;

  add({ id: 'cel-laurel', slot: 'celebration', label: 'Laurel wreath', colour: 'green', unlock: 'done-100', tags: ['reward', 'laurel', 'hundred'],
    svg: () => `${[0, 1, 2, 3, 4].map(i => leaf(r2(20 - i * 1.2), r2(46 - i * 7), -30 + i * 8, r2(i * 0.1))).join('')}${[0, 1, 2, 3, 4].map(i => leaf(r2(44 + i * 1.2), r2(46 - i * 7), 30 - i * 8, r2(0.05 + i * 0.1))).join('')}<path class="lm" d="M22 52q10 6 20 0"/>${star(32, 28, 7, 0.6, 's')}` });
  add({ id: 'open-fanfare', slot: 'opening', label: 'Fanfare', colour: 'amber', unlock: 'done-500', tags: ['reward', 'fanfare', 'banner'], intensity: 'standard',
    svg: () => `<g class="x-wave o-v" style="transform-origin:14px 40px"><path class="c lk" d="M10 44l26-14v24z"/><path class="lk t" d="M36 30c6 0 10 5 10 12s-4 12-10 12"/></g><g class="x-float"><path class="s lk" d="M18 10h30l-5 6 5 6H18z"/></g>${star(54, 34, 4, 0.3, 's')}${star(52, 50, 3, 0.9, 's')}` });
  add({ id: 'sym-constellation', slot: 'symbol', label: 'Thousand-star constellation', colour: 'indigo', unlock: 'done-1000', tags: ['reward', 'stars', 'thousand'], mood: 'dreamy',
    svg: () => `<path class="lm dash" d="M10 44L22 20 36 30 50 12M36 30l8 22"/>${[[10, 44, 0], [22, 20, 0.4], [36, 30, 0.8], [50, 12, 1.2], [44, 52, 1.6]].map(([x, y, d]) => star(x, y, 5, d, 'c')).join('')}` });
  add({ id: 'streak-lantern', slot: 'streak', label: 'Paper lantern', colour: 'red', unlock: 'streak-7', tags: ['reward', 'streak', 'lantern'], mood: 'cosy',
    svg: () => `<path class="lk" d="M32 4v8"/><rect class="m" x="26" y="12" width="12" height="4" rx="1"/><ellipse class="c lk" cx="32" cy="34" rx="14" ry="17"/><path class="lw" d="M24 22q-3 12 0 24M40 22q3 12 0 24"/><g class="ap-gr"><g class="x-flicker o-b"><path class="s" d="M32 44c-4 0-5-3-5-6 0-4 4-6 5-10 3 3 5 6 5 10 0 3-2 6-5 6z"/></g></g><rect class="m" x="26" y="51" width="12" height="4" rx="1"/>` });
  add({ id: 'sky-crown', slot: 'sky', label: 'Crown of light', colour: 'violet', unlock: 'streak-100', tags: ['reward', 'aurora', 'hundred'], mood: 'dreamy',
    svg: () => `${[0, 1, 2].map(i => `<g class="x-wave" style="--d:${r2(i * 0.5)}s"><path class="${['c', 's', 'm'][i]}" opacity=".7" d="M4 ${30 + i * 6}q14-${14 - i * 3} 28 0t28 0v6q-14-${10 - i * 3}-28 0T4 ${36 + i * 6}z"/></g>`).join('')}<path class="k" d="M4 58l12-10 10 6 12-12 12 8 10-4v12z"/>${star(48, 12, 3, 0.7, 's')}` });
  add({ id: 'money-jar', slot: 'money', label: 'Golden jar', colour: 'amber', unlock: 'under-budget', tags: ['reward', 'under-budget', 'jar'],
    svg: () => `<rect class="m" x="22" y="14" width="20" height="6" rx="2"/><path class="w lk" d="M20 22h24c3 4 4 9 4 16 0 12-6 18-16 18s-16-6-16-18c0-7 1-12 4-16z"/><g class="x-rise"><circle class="c" cx="28" cy="44" r="5"/><circle class="c" cx="38" cy="40" r="5"/><circle class="s" cx="33" cy="32" r="4"/></g>${star(50, 14, 3, 0.5, 's')}` });
  add({ id: 'empty-boat', slot: 'empty-loading', label: 'Paper boat', colour: 'teal', unlock: 'inbox-zero', tags: ['reward', 'inbox-zero', 'calm'], mood: 'calm',
    svg: () => `<g class="x-float"><path class="w lk" d="M14 40h36l-6 8H20z"/><path class="c lk" d="M32 14v26H18z"/><path class="s lk" d="M34 20l12 20H34z"/></g><g class="x-wave"><path class="lc" d="M4 54q7-4 14 0t14 0 14 0 14 0"/></g>` });
  add({ id: 'focus-bonsai', slot: 'focus', label: 'Bonsai', colour: 'green', unlock: 'first-focus', tags: ['reward', 'focus', 'bonsai'], mood: 'calm',
    svg: () => `<path class="m" d="M16 50h32l-4 8H20z"/><g class="ap-gr"><path class="lk t" d="M32 50c0-8-6-10-6-18s8-8 8-14"/><g class="x-breathe o-b"><ellipse class="c" cx="22" cy="30" rx="10" ry="6"/><ellipse class="c" cx="40" cy="22" rx="11" ry="6"/><ellipse class="s" cx="32" cy="14" rx="8" ry="5"/></g></g>` });
  add({ id: 'boss-phoenix', slot: 'boss', label: 'Phoenix', colour: 'orange', unlock: 'boss', tags: ['reward', 'boss', 'phoenix'], intensity: 'standard', mood: 'energetic',
    svg: () => `<g class="x-rise"><path class="c lk" d="M32 22c-6-10-18-12-26-8 8 2 12 8 14 14-6-2-10 0-12 4 8-2 14 2 18 8l6 10 6-10c4-6 10-10 18-8-2-4-6-6-12-4 2-6 6-12 14-14-8-4-20-2-26 8z"/><circle class="s" cx="32" cy="22" r="3"/></g><g class="x-flicker o-b"><path class="s" d="M28 50l4 10 4-10z"/></g>` });

  animRegisterPack({
    id: 'rewards', name: 'Rewards', version: '1.0.0',
    description: 'Animations you unlock with achievements (Settings > Animations > Achievements).',
    css: '', items,
  });
})();
