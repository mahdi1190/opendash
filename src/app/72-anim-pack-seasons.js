/* ============================================================
   ANIMATION PACK "seasons" (v2.2 wave 2): seasons and festivals. PURE classic
   script: it only calls animRegisterPack. Every item carries a when(day, ctx)
   rule from the almanac (71-anim-almanac.js), so it plays only on its day and
   then wins its slot (animSpecialPick): openings, skies and celebrations for
   Christmas, New Year, Lunar New Year, Diwali, Eid, Easter, Halloween, Bonfire
   Night, Pancake Day, Valentine's Day, the solstices, the first snow, the
   clocks changing and the user's birthday (config.birthday, 'MM-DD').
   Moving dates: a compact table for 2025-2031 (ALM_MOVING); Easter computed.
   ============================================================ */
(function () {
  const items = [];
  const on = (id) => (day, ctx) => almIsFestival(id, day, ctx);
  const add = (o) => items.push(Object.assign({ tags: [], mood: 'cheerful', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static', priority: 2 }, o));
  const f = (n) => +n.toFixed(2);
  const star = (x, y, r, d, cls) => `<path class="${cls || 'c'} x-twinkle" style="--d:${d || 0}s" d="M${x} ${f(y - r)}L${f(x + r * 0.3)} ${f(y - r * 0.3)} ${f(x + r)} ${y} ${f(x + r * 0.3)} ${f(y + r * 0.3)} ${x} ${f(y + r)} ${f(x - r * 0.3)} ${f(y + r * 0.3)} ${f(x - r)} ${y} ${f(x - r * 0.3)} ${f(y - r * 0.3)}z"/>`;
  const burst = (x, y, r, n, d, cls) => `<g class="x-burst o-v" style="--d:${d}s;transform-origin:${x}px ${y}px">${Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<path class="${cls || 'lc'}" d="M${f(x + Math.cos(a) * r * 0.35)} ${f(y + Math.sin(a) * r * 0.35)}L${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}"/>`; }).join('')}</g>`;
  const flakes = (pts) => pts.map(([x, y, d]) => `<circle class="w lm x-fall" style="--d:${d}s" cx="${x}" cy="${y}" r="1.8"/>`).join('');
  const crescent = (x, y, r, cls) => `<path class="${cls || 'c'}" d="M${x} ${y - r}a${r} ${r} 0 1 0 ${f(r * 0.9)} ${f(r * 1.6)}a${f(r * 0.8)} ${f(r * 0.8)} 0 1 1 -${f(r * 0.9)} -${f(r * 1.6)}z"/>`;
  const clock = (arrow) => `<circle class="w lk t" cx="32" cy="32" r="18"/>${[0, 1, 2, 3].map(i => `<path class="lm" d="M${f(32 + 15 * Math.cos(i * Math.PI / 2))} ${f(32 + 15 * Math.sin(i * Math.PI / 2))}L${f(32 + 17 * Math.cos(i * Math.PI / 2))} ${f(32 + 17 * Math.sin(i * Math.PI / 2))}"/>`).join('')}<path class="lk t" d="M32 32V22"/><g class="x-hand o-v" style="transform-origin:32px 32px"><path class="lc t" d="M32 32l8 5"/></g>${arrow}`;

  /* ---------- Christmas ---------- */
  add({ id: 'open-christmas-tree', slot: 'opening', label: 'Christmas tree', colour: 'green', tags: ['christmas', 'december', 'tree'], mood: 'cosy', when: on('christmas'),
    svg: () => `<path class="c lk" d="M32 12l-12 16h6l-10 13h7L14 52h36l-9-11h7L38 28h6z"/><rect class="m" x="29" y="52" width="6" height="6"/>${star(32, 10, 5, 0)}${[[26, 34, 0.2], [38, 40, 0.6], [24, 47, 1], [40, 49, 1.4], [32, 25, 0.8]].map(([x, y, d]) => `<circle class="s x-pulse" style="--d:${d}s" cx="${x}" cy="${y}" r="2"/>`).join('')}` });
  add({ id: 'sky-christmas-eve', slot: 'sky', label: 'Christmas Eve sky', colour: 'indigo', tags: ['christmas', 'night', 'snow'], mood: 'dreamy', when: on('christmas'),
    svg: () => `${star(48, 14, 6, 0, 's')}${star(18, 18, 3, 0.8)}${flakes([[12, 26, 0], [24, 30, 1], [36, 24, 0.5], [50, 30, 1.5]])}<path class="w lk" d="M8 56V44l10-8 10 8v12zM30 56V46l8-6 8 6v10z"/><rect class="s" x="15" y="47" width="5" height="5"/><rect class="s" x="36" y="49" width="4" height="4"/>` });
  add({ id: 'cel-christmas-cracker', slot: 'celebration', label: 'Christmas cracker', colour: 'red', tags: ['christmas', 'cracker'], mood: 'cheerful', intensity: 'standard', when: on('christmas'),
    svg: () => `<g class="x-slidel"><path class="c lk" d="M6 26l6 6-6 6h20V26z"/></g><path class="s lk" d="M38 26h20l-6 6 6 6H38z"/>${burst(32, 32, 12, 8, 0.4)}${star(32, 14, 3, 0.6)}` });

  /* ---------- New Year ---------- */
  add({ id: 'open-new-year', slot: 'opening', label: 'New Year fireworks', colour: 'violet', tags: ['new year', 'fireworks', 'midnight'], mood: 'energetic', when: on('new-year'),
    svg: () => `${burst(22, 22, 13, 10, 0)}${burst(44, 18, 10, 8, 0.7, 'lm')}${burst(40, 40, 9, 8, 1.3)}<path class="lm dash" d="M22 58V36M44 58V30"/>` });
  add({ id: 'sky-new-year', slot: 'sky', label: 'New Year sky', colour: 'indigo', tags: ['new year', 'night', 'fireworks'], mood: 'dreamy', when: on('new-year'),
    svg: () => `${crescent(14, 16, 6)}${star(30, 12, 2.5, 0.3)}${star(56, 26, 2, 1.1)}${burst(44, 22, 10, 12, 0.2)}<path class="m" d="M4 58h56v-6l-6-4-6 4-8-8-8 8-6-3-8 5-8-2z"/>` });

  /* ---------- Lunar New Year ---------- */
  add({ id: 'open-lunar-lantern', slot: 'opening', label: 'Lunar New Year lanterns', colour: 'red', tags: ['lunar new year', 'lantern'], mood: 'cheerful', when: on('lunar-new-year'),
    svg: () => `<path class="lm" d="M4 10h56"/>${[[18, 0], [44, 0.6]].map(([x, d]) => `<g class="x-swing o-v" style="--d:${d}s;transform-origin:${x}px 10px"><path class="lk" d="M${x} 10v6"/><ellipse class="c lk" cx="${x}" cy="28" rx="10" ry="12"/><path class="lk" d="M${x - 10} 28h20M${x} 16v24"/><rect class="s" x="${x - 4}" y="40" width="8" height="3"/><path class="lc" d="M${x} 43v8"/></g>`).join('')}` });
  add({ id: 'cel-lunar-firecrackers', slot: 'celebration', label: 'Firecrackers', colour: 'red', tags: ['lunar new year', 'firecrackers'], mood: 'energetic', intensity: 'standard', when: on('lunar-new-year'),
    svg: () => `<path class="lk" d="M20 6v46"/>${[12, 22, 32, 42].map((y, i) => `<g class="x-bounce" style="--d:${i * 0.15}s"><rect class="c lk" x="${i % 2 ? 21 : 11}" y="${y}" width="8" height="10" rx="2"/></g>`).join('')}${burst(42, 50, 10, 8, 0.5)}${star(46, 20, 3, 0.9, 's')}` });

  /* ---------- Diwali ---------- */
  add({ id: 'open-diwali-diya', slot: 'opening', label: 'Diwali diya', colour: 'amber', tags: ['diwali', 'lamp', 'light'], mood: 'calm', when: on('diwali'),
    svg: () => `<circle class="s x-glow" cx="32" cy="26" r="14"/><g class="x-flicker o-v" style="transform-origin:32px 36px"><path class="c" d="M32 16c5 7 6 12 0 20-6-8-5-13 0-20z"/></g><path class="w lk" d="M12 38h40c-2 10-10 16-20 16S14 48 12 38z"/><path class="lc" d="M18 44h28"/>` });
  add({ id: 'sky-diwali-lights', slot: 'sky', label: 'Diwali lights', colour: 'amber', tags: ['diwali', 'lights', 'night'], mood: 'dreamy', when: on('diwali'),
    svg: () => `<path class="lm" d="M4 14q14 10 28 0t28 0"/>${[8, 16, 24, 40, 48, 56].map((x, i) => `<circle class="c x-twinkle" style="--d:${f(i * 0.3)}s" cx="${x}" cy="${f(14 + 6 * Math.sin((x - 4) / 28 * Math.PI))}" r="2"/>`).join('')}${burst(32, 38, 11, 10, 0.4)}<path class="m" d="M4 58h56v-4H4z"/>` });

  /* ---------- Eid ---------- */
  add({ id: 'open-eid-crescent', slot: 'opening', label: 'Eid crescent', colour: 'teal', tags: ['eid', 'moon', 'star'], mood: 'calm', when: on('eid'),
    svg: () => `<g class="x-breathe o-v" style="transform-origin:28px 30px">${crescent(26, 16, 15)}</g>${star(46, 22, 6, 0.4, 's')}${star(16, 50, 2.5, 1.2)}${star(52, 46, 2, 0.8)}` });
  add({ id: 'sky-eid-lanterns', slot: 'sky', label: 'Eid lanterns', colour: 'teal', tags: ['eid', 'lantern', 'night'], mood: 'dreamy', when: on('eid'),
    svg: () => `${crescent(46, 8, 7)}${[[14, 18, 0], [30, 26, 0.5]].map(([x, len, d]) => `<g class="x-swing o-v" style="--d:${d}s;transform-origin:${x}px 4px"><path class="lk" d="M${x} 4v${len}"/><path class="c lk" d="M${x - 5} ${len + 8}l5-4 5 4v10l-5 4-5-4z"/><path class="s" d="M${x - 2} ${len + 10}h4v6h-4z"/></g>`).join('')}<path class="m" d="M4 58h56v-8h-8v-6l-4-4-4 4v6H20l-6-6-6 6H4z"/>` });

  /* ---------- Easter ---------- */
  add({ id: 'open-easter-egg', slot: 'opening', label: 'Easter egg', colour: 'pink', tags: ['easter', 'egg', 'spring'], mood: 'cheerful', when: on('easter'),
    svg: () => `<g class="x-wobble o-v" style="transform-origin:32px 54px"><path class="c lk" d="M32 10c10 0 18 16 18 27s-8 17-18 17-18-6-18-17S22 10 32 10z"/><path class="w" d="M15 32q4-4 8 0t9 0 9 0 8 0v5q-4-4-8 0t-9 0-9 0-8 0z"/><circle class="s" cx="26" cy="44" r="2"/><circle class="s" cx="38" cy="44" r="2"/></g><path class="lm" d="M8 56h48"/>` });
  add({ id: 'cel-easter-chick', slot: 'celebration', label: 'Hatching chick', colour: 'amber', tags: ['easter', 'chick'], mood: 'cheerful', intensity: 'standard', when: on('easter'),
    svg: () => `<g class="x-pop"><circle class="c lk" cx="32" cy="28" r="10"/><circle class="k" cx="29" cy="26" r="1.4"/><path class="s" d="M34 28l5 1-5 2z"/></g><path class="w lk" d="M18 36l4 4 4-4 4 4 4-4 4 4 4-4 4 4c0 10-6 16-14 16s-14-6-14-16z"/>` });

  /* ---------- Halloween ---------- */
  add({ id: 'open-halloween-pumpkin', slot: 'opening', label: 'Jack-o\'-lantern', colour: 'orange', tags: ['halloween', 'pumpkin'], mood: 'cheerful', when: on('halloween'),
    svg: () => `<path class="lk t" d="M32 18c0-4 2-7 6-8"/><ellipse class="c lk" cx="32" cy="38" rx="20" ry="16"/><path class="lk" d="M24 24c-3 8-3 20 0 28M40 24c3 8 3 20 0 28"/><g class="x-flicker o-v" style="transform-origin:32px 40px"><path class="s" d="M22 34l5-4 2 6zM42 34l-5-4-2 6zM22 44q10 8 20 0l-4 1-2 3-3-3-3 3-2-3z"/></g>` });
  add({ id: 'sky-halloween-bats', slot: 'sky', label: 'Halloween bats', colour: 'violet', tags: ['halloween', 'bats', 'moon'], mood: 'dreamy', when: on('halloween'),
    svg: () => `<circle class="s" cx="40" cy="24" r="14"/>${[[22, 20, 0], [46, 34, 0.7], [14, 40, 1.3]].map(([x, y, d]) => `<g class="x-float" style="--d:${d}s"><path class="k" d="M${x} ${y}q-4-5-9-2 3 1 3 4 3-2 6 0q3-2 6 0 0-3 3-4-5-3-9 2z"/></g>`).join('')}<path class="m" d="M4 58h56v-4q-6-6-12 0-8-8-16 0-8-6-16 0-6-4-12 0z"/>` });

  /* ---------- Bonfire Night ---------- */
  add({ id: 'open-bonfire', slot: 'opening', label: 'Bonfire', colour: 'orange', tags: ['bonfire night', 'fire', 'november'], mood: 'cosy', region: 'any', when: on('bonfire-night'),
    svg: () => `<g class="x-flicker o-v" style="transform-origin:32px 50px"><path class="c" d="M32 14c8 10 14 16 14 26a14 14 0 0 1-28 0c0-6 4-10 6-14 1 5 3 7 5 7-1-8 0-13 3-19z"/><path class="s" d="M32 30c4 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/></g><path class="m lk" d="M12 54l40-6M12 48l40 6"/>${star(10, 14, 2, 0.4, 's')}${star(54, 20, 2.5, 1)}` });
  add({ id: 'sky-bonfire-rockets', slot: 'sky', label: 'Bonfire Night rockets', colour: 'orange', tags: ['bonfire night', 'fireworks', 'night'], mood: 'energetic', when: on('bonfire-night'),
    svg: () => `<g class="x-rise"><path class="c lk" d="M14 52l3-10 3 10z"/><path class="lm dash" d="M17 56v6"/></g>${burst(40, 20, 12, 12, 0.3)}${burst(18, 18, 8, 8, 1.1, 'lm')}${star(54, 44, 2, 0.6)}` });

  /* ---------- Pancake Day ---------- */
  add({ id: 'open-pancake-flip', slot: 'opening', label: 'Pancake flip', colour: 'amber', tags: ['pancake day', 'shrove tuesday', 'food'], mood: 'cheerful', when: on('pancake-day'),
    svg: () => `<g class="x-lift"><g class="x-turn o-v" style="transform-origin:32px 24px"><ellipse class="c lk" cx="32" cy="24" rx="12" ry="4"/></g></g><path class="k" d="M14 44h28a2 2 0 0 1 0 4H14a2 2 0 0 1 0-4z"/><path class="lk t" d="M42 46h16"/><path class="s" d="M18 44c6-3 14-3 20 0"/>` });

  /* ---------- Valentine's Day ---------- */
  add({ id: 'open-valentine-hearts', slot: 'opening', label: 'Valentine hearts', colour: 'pink', tags: ['valentines', 'love', 'hearts'], mood: 'cosy', when: on('valentines'),
    svg: () => `<g class="x-beat o-v" style="transform-origin:26px 34px"><path class="c lk" d="M26 48c-2-1.4-14-9-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 9-12 16.6-14 18z"/></g><g class="x-beat o-v" style="--d:0.4s;transform-origin:44px 26px"><path class="s lk" d="M44 36c-1.2-.8-9-6-9-12a4.6 4.6 0 0 1 9-2 4.6 4.6 0 0 1 9 2c0 6-7.8 11.2-9 12z"/></g>` });
  add({ id: 'cel-valentine-letter', slot: 'celebration', label: 'Love letter', colour: 'pink', tags: ['valentines', 'letter'], mood: 'cosy', intensity: 'standard', when: on('valentines'),
    svg: () => `<rect class="w lk" x="10" y="22" width="44" height="30" rx="3"/><path class="lk" d="M10 24l22 16 22-16"/><g class="x-pop"><path class="c" d="M32 22c-1-.7-7-4.5-7-9a3.5 3.5 0 0 1 7-1.5 3.5 3.5 0 0 1 7 1.5c0 4.5-6 8.3-7 9z"/></g>` });

  /* ---------- the solstices ---------- */
  add({ id: 'open-midsummer', slot: 'opening', label: 'Midsummer sun', colour: 'amber', tags: ['summer solstice', 'longest day', 'sun'], mood: 'energetic', when: on('summer-solstice'),
    svg: () => `<g class="x-spin o-v" style="transform-origin:32px 30px;--ad:24s">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path class="lc t" d="M${f(32 + 16 * Math.cos(a))} ${f(30 + 16 * Math.sin(a))}L${f(32 + 22 * Math.cos(a))} ${f(30 + 22 * Math.sin(a))}"/>`; }).join('')}</g><circle class="c" cx="32" cy="30" r="12"/><path class="m" d="M4 58h56v-4H4z"/>` });
  add({ id: 'sky-midsummer-stones', slot: 'sky', label: 'Midsummer at the stones', colour: 'orange', tags: ['summer solstice', 'sunrise', 'stones'], mood: 'calm', when: on('summer-solstice'),
    svg: () => `<g class="x-sunset"><circle class="c" cx="32" cy="40" r="9"/></g><path class="k" d="M8 56V36h6v20zM20 56V32h6v20zM38 56V32h6v24zM50 56V36h6v20zM18 32h28v-4H18z"/><path class="lm" d="M4 56h56"/>` });
  add({ id: 'open-midwinter', slot: 'opening', label: 'Midwinter', colour: 'indigo', tags: ['winter solstice', 'longest night'], mood: 'calm', when: on('winter-solstice'),
    svg: () => `<g class="x-rise"><circle class="s" cx="32" cy="46" r="8"/></g><path class="w lm" d="M4 58V48l12-8 10 6 10-10 14 10 10-4v16z"/>${star(14, 14, 3, 0)}${star(30, 10, 2, 0.6)}${star(50, 18, 3.5, 1.2)}${star(42, 30, 1.6, 1.8)}` });
  add({ id: 'sky-longest-night', slot: 'sky', label: 'The longest night', colour: 'indigo', tags: ['winter solstice', 'night', 'stars'], mood: 'dreamy', when: on('winter-solstice'),
    svg: () => `${[[8, 10], [20, 22], [34, 8], [46, 18], [58, 10], [14, 36], [52, 34]].map(([x, y], i) => star(x, y, 1.5 + (i % 3), f(i * 0.35))).join('')}<path class="lm dash" d="M10 44q22-14 44 0"/><path class="m" d="M4 58h56v-6H4z"/>` });

  /* ---------- the first snow ---------- */
  add({ id: 'open-first-snow', slot: 'opening', label: 'First snow', colour: 'slate', tags: ['first snow', 'winter', 'snowflake'], mood: 'dreamy', priority: 3, when: on('first-snow'),
    svg: () => `<g class="x-spin o-v" style="transform-origin:32px 26px;--ad:16s">${[0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3; return `<path class="lc t" d="M32 26L${f(32 + 14 * Math.cos(a))} ${f(26 + 14 * Math.sin(a))}"/><path class="lc" d="M${f(32 + 9 * Math.cos(a))} ${f(26 + 9 * Math.sin(a))}l${f(4 * Math.cos(a + 0.8))} ${f(4 * Math.sin(a + 0.8))}"/>`; }).join('')}</g>${flakes([[12, 44, 0.3], [52, 46, 1.1], [24, 50, 1.8]])}` });
  add({ id: 'sky-first-snow', slot: 'sky', label: 'First snow settling', colour: 'slate', tags: ['first snow', 'snow', 'winter'], mood: 'cosy', priority: 3, when: on('first-snow'),
    svg: () => `${flakes([[10, 8, 0], [22, 12, 0.6], [34, 6, 1.2], [46, 10, 0.3], [56, 14, 1.6], [16, 20, 2.1], [40, 18, 0.9]])}<path class="w lm" d="M4 58v-6q14-6 28 0t28 0v6z"/><circle class="w lk" cx="46" cy="46" r="5"/><circle class="w lk" cx="46" cy="38" r="3.5"/>` });

  /* ---------- the clocks change ---------- */
  add({ id: 'open-clocks-forward', slot: 'opening', label: 'The clocks go forward', colour: 'green', tags: ['clocks', 'spring forward', 'time'], mood: 'focused', when: on('clocks-forward'),
    svg: () => clock(`<g class="x-bob"><path class="c" d="M46 50h8l-4-5zM50 50v6"/></g>`) });
  add({ id: 'open-clocks-back', slot: 'opening', label: 'The clocks go back', colour: 'orange', tags: ['clocks', 'fall back', 'time', 'extra hour'], mood: 'cosy', when: on('clocks-back'),
    svg: () => clock(`<g class="x-bob"><path class="c" d="M14 8h8l-4 5zM18 8V2"/></g><path class="lm dash" d="M10 52a26 26 0 0 0 10 6"/>`) });

  /* ---------- the user's birthday (config.birthday) ---------- */
  add({ id: 'open-birthday-cake', slot: 'opening', label: 'Birthday cake', colour: 'pink', tags: ['birthday', 'cake', 'candles'], mood: 'proud', priority: 4, when: on('birthday'),
    svg: () => `<rect class="c lk" x="14" y="36" width="36" height="18" rx="3"/><path class="w" d="M14 42q4 4 9 0t9 0 9 0 9 0v-4H14z"/>${[22, 32, 42].map((x, i) => `<rect class="s lk" x="${x - 1.5}" y="26" width="3" height="10"/><g class="x-flicker o-v" style="--d:${f(i * 0.2)}s;transform-origin:${x}px 24px"><path class="c" d="M${x} 18c2 3 2 5 0 7-2-2-2-4 0-7z"/></g>`).join('')}<path class="lm" d="M8 56h48"/>` });
  add({ id: 'cel-birthday-balloons', slot: 'celebration', label: 'Birthday balloons', colour: 'violet', tags: ['birthday', 'balloons'], mood: 'proud', intensity: 'standard', priority: 4, when: on('birthday'),
    svg: () => `${[[20, 22, 0, 'c'], [34, 16, 0.5, 's'], [46, 26, 1, 'c']].map(([x, y, d, c]) => `<g class="x-float" style="--d:${d}s"><ellipse class="${c} lk" cx="${x}" cy="${y}" rx="7" ry="9"/><path class="lm" d="M${x} ${y + 9}q-3 10 ${32 - x > 0 ? 4 : -4} 24"/></g>`).join('')}` });
  add({ id: 'sky-birthday-bunting', slot: 'sky', label: 'Birthday bunting', colour: 'pink', tags: ['birthday', 'bunting'], mood: 'cheerful', priority: 4, when: on('birthday'),
    svg: () => `<path class="lk" d="M2 10q30 14 60 0"/>${[8, 18, 28, 38, 48, 58].map((x, i) => { const y = f(10 + 7 * Math.sin((x - 2) / 60 * Math.PI)); return `<g class="x-swing o-v" style="--d:${f(i * 0.2)}s;transform-origin:${x}px ${y}px"><path class="${i % 2 ? 's' : 'c'}" d="M${x - 4} ${y}h8l-4 9z"/></g>`; }).join('')}${burst(32, 40, 10, 10, 0.5)}` });

  animRegisterPack({ id: 'seasons', name: 'Seasons and festivals', version: '2.2.0',
    description: 'Openings, skies and celebrations for the festivals, the solstices, the first snow, the clocks changing and your birthday. Each plays only on its day.', items });
})();
