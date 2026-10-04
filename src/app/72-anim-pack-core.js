/* ============================================================
   ANIMATION PACK "core" (v2.2 wave 1). PURE classic script, like every pack:
   it only calls animRegisterPack (71-anim-registry.js) with a manifest.
   It wires the animations already in the app into the registry:
     event-scene   every ANIM_SCENES scene (71-anim-library.js) and the
                   arrival versions (Delight DL_ARRIVE, 71-delight-library.js)
     celebration   every Delight celebration (DL_ART)
     symbol        the travel motifs (DL_MOTIFS) and two small marks
   and adds small originals for the slots that had no art of their own:
   openings, story and page transitions, the sky, empty/loading and the
   light/dark switch (theme-switch items carry vt: {kind}, read by
   Motion.themeSwap in src/motion.js).
   Art vocabulary (64x64): fills k c s w m, strokes lk lc lm (+ t thick),
   motion x-* from 71-anim-library.css, ap-* from 71-anim-registry.css.
   The core pack cannot be switched off (it is every slot's fallback).
   ============================================================ */
(function () {
  const MOOD_BY_CAT = { work: 'focused', social: 'cheerful', celebrate: 'cheerful', travel: 'dreamy', sport: 'energetic', health: 'calm', life: 'cosy', home: 'cosy', learning: 'focused', admin: 'neutral', generic: 'neutral' };
  const items = [];
  const add = (o) => items.push(Object.assign({ tags: [], mood: 'neutral', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static' }, o));
  const star = (x, y, r, d, cls) => `<path class="${cls || 'c'} x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - r}l${+(r * 0.3).toFixed(2)} ${+(r * 0.7).toFixed(2)} ${+(r * 0.7).toFixed(2)} ${+(r * 0.3).toFixed(2)}-${+(r * 0.7).toFixed(2)} ${+(r * 0.3).toFixed(2)}-${+(r * 0.3).toFixed(2)} ${+(r * 0.7).toFixed(2)}-${+(r * 0.3).toFixed(2)}-${+(r * 0.7).toFixed(2)}-${+(r * 0.7).toFixed(2)}-${+(r * 0.3).toFixed(2)} ${+(r * 0.7).toFixed(2)}-${+(r * 0.3).toFixed(2)}z"/>`;
  const cloud = (x, y, s, cls, d) => `<g class="x-float" style="--d:${d || 0}s"><path class="${cls || 'w lm'}" d="M${x} ${y}h${18 * s}a${5 * s} ${5 * s} 0 0 0 0-${10 * s}a${7 * s} ${7 * s} 0 0 0-${13 * s}-${2 * s}a${5 * s} ${5 * s} 0 0 0-${5 * s} ${12 * s}z"/></g>`;

  /* ---------- the scene library ---------- */
  if (typeof ANIM_SCENES !== 'undefined') {
    for (const s of ANIM_SCENES) {
      add({ id: 'scene-' + s.type, slot: 'event-scene', label: s.label, colour: s.colour, tags: [s.cat, ...s.keywords.filter(k => /^[a-z][a-z -]*$/.test(k)).slice(0, 6)],
        mood: MOOD_BY_CAT[s.cat] || 'neutral', intensity: s.loop === 'once' ? 'standard' : 'subtle', svg: () => s.svg() });
    }
  }
  if (typeof Delight !== 'undefined') {
    const levelOf = {};
    for (const m of Delight.DL_MOMENTS) for (const v of m.variants) levelOf[v] = m.level;
    for (const [key, a] of Object.entries(Delight.DL_ART)) {
      add({ id: 'cel-' + key, slot: 'celebration', label: a.label || key, colour: a.colour, tags: ['celebration', key],
        mood: levelOf[key] === 3 ? 'proud' : 'cheerful', intensity: levelOf[key] === 1 ? 'subtle' : 'standard', svg: () => a.svg() });
    }
    for (const a of Delight.DL_ARRIVE) {
      add({ id: 'arrive-' + a.type, slot: 'event-scene', label: (a.label || a.type.replace(/-/g, ' ')) + ' (arrival)', colour: a.colour, tags: ['arrival', a.type],
        mood: 'cheerful', intensity: 'standard', svg: () => a.svg() });
    }
    for (const [key, a] of Object.entries(Delight.DL_MOTIFS)) {
      add({ id: 'sym-' + key, slot: 'symbol', label: a.label || key, colour: a.colour, tags: ['travel', 'motif', key], mood: 'dreamy', svg: () => a.svg() });
    }
  }

  /* ---------- symbols ---------- */
  add({ id: 'sym-star', slot: 'symbol', label: 'Twinkling star', colour: 'amber', tags: ['star', 'mark'], mood: 'cheerful',
    svg: () => `<g class="x-pulse">${star(32, 32, 18, 0, 'c')}</g>${star(50, 14, 5, 0.6, 's')}${star(14, 50, 4, 1.2, 's')}` });
  add({ id: 'sym-heart', slot: 'symbol', label: 'Beating heart', colour: 'pink', tags: ['heart', 'mark'], mood: 'cosy',
    svg: () => `<path class="c x-beat" d="M32 52c-2-1.5-18-11-18-23a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 12-16 21.5-18 23z"/>` });

  /* ---------- openings ---------- */
  add({ id: 'open-sunrise', slot: 'opening', label: 'Sunrise', colour: 'amber', tags: ['morning', 'sun'], mood: 'calm',
    svg: () => `<circle class="c x-rise" cx="32" cy="40" r="11"/>${[0, 1, 2, 3, 4].map(i => `<path class="lc x-twinkle" style="--d:${i * 0.2}s" d="M${32 + 17 * Math.cos(Math.PI * (1 + i / 4))} ${40 + 17 * Math.sin(Math.PI * (1 + i / 4))}l${(4 * Math.cos(Math.PI * (1 + i / 4))).toFixed(2)} ${(4 * Math.sin(Math.PI * (1 + i / 4))).toFixed(2)}"/>`).join('')}<rect class="w" x="4" y="40" width="56" height="20"/><path class="lk" d="M4 40h56"/>${cloud(8, 22, 0.8, 'w lm', 0.4)}` });
  add({ id: 'open-moonrise', slot: 'opening', label: 'Moonrise', colour: 'indigo', tags: ['evening', 'moon', 'stars'], mood: 'dreamy',
    svg: () => `<g class="x-moonrise"><path class="c" d="M38 18a15 15 0 1 0 10 26 12 12 0 0 1-10-26z"/></g>${star(14, 14, 3.5, 0.2)}${star(52, 12, 2.5, 0.9)}${star(22, 30, 2, 1.4)}<path class="lm" d="M4 54h56"/>` });
  add({ id: 'open-plane', slot: 'opening', label: 'Paper plane', colour: 'blue', tags: ['start', 'plane'], mood: 'energetic', intensity: 'standard',
    svg: () => `<g class="x-float"><path class="c" d="M8 34l46-18-14 38-8-14z"/><path class="s" d="M32 40l22-24-28 20z"/></g><path class="lm dash" d="M4 50c8-2 12-6 16-10"/>` });

  /* ---------- story transitions (the art previews the move) ---------- */
  const twoCards = (anim) => `<rect class="w lm" x="8" y="14" width="30" height="36" rx="4"/><g class="${anim}"><rect class="s lc" x="26" y="14" width="30" height="36" rx="4"/><path class="lc" d="M32 26h18M32 33h12"/></g>`;
  add({ id: 'st-fade', slot: 'story-transition', label: 'Soft fade', colour: 'slate', tags: ['fade'], mood: 'calm', tx: { kind: 'fade' }, svg: () => twoCards('x-breathe') });
  add({ id: 'st-slide', slot: 'story-transition', label: 'Slide along', colour: 'blue', tags: ['slide'], mood: 'focused', tx: { kind: 'slide' }, svg: () => twoCards('x-slidel') });
  add({ id: 'st-iris', slot: 'story-transition', label: 'Iris', colour: 'violet', tags: ['circle', 'reveal'], mood: 'dreamy', intensity: 'standard', tx: { kind: 'iris' },
    svg: () => `<rect class="w lm" x="8" y="14" width="48" height="36" rx="4"/><circle class="s lc x-pulse" cx="32" cy="32" r="12"/>${star(32, 32, 4, 0.3)}` });

  /* ---------- page transitions ---------- */
  const page = (anim) => `<rect class="w lm" x="10" y="10" width="44" height="44" rx="5"/><path class="lm" d="M10 20h44"/><g class="${anim}"><rect class="s" x="16" y="26" width="32" height="6" rx="3"/><rect class="m" x="16" y="36" width="22" height="6" rx="3"/></g>`;
  add({ id: 'page-slide', slot: 'page-transition', label: 'Slide', colour: 'blue', tags: ['slide'], mood: 'focused', tx: { kind: 'slide' }, svg: () => page('x-slidel') });
  add({ id: 'page-fade', slot: 'page-transition', label: 'Fade', colour: 'slate', tags: ['fade'], mood: 'calm', tx: { kind: 'fade' }, svg: () => page('x-breathe') });
  add({ id: 'page-rise', slot: 'page-transition', label: 'Rise', colour: 'teal', tags: ['rise'], mood: 'cheerful', tx: { kind: 'rise' }, svg: () => page('x-bob') });

  /* ---------- weather and sky ---------- */
  add({ id: 'sky-clear', slot: 'sky', label: 'Clear day', colour: 'amber', tags: ['sun', 'clear'], mood: 'cheerful',
    svg: () => `<g class="x-spin-slow o-v" style="transform-origin:24px 24px">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path class="lc" d="M${24 + 13 * Math.cos(i * Math.PI / 4)} ${24 + 13 * Math.sin(i * Math.PI / 4)}l${(4 * Math.cos(i * Math.PI / 4)).toFixed(2)} ${(4 * Math.sin(i * Math.PI / 4)).toFixed(2)}"/>`).join('')}</g><circle class="c" cx="24" cy="24" r="9"/>${cloud(30, 46, 1, 'w lm', 0.5)}` });
  add({ id: 'sky-night', slot: 'sky', label: 'Starry night', colour: 'indigo', tags: ['night', 'stars', 'moon'], mood: 'dreamy',
    svg: () => `<path class="c" d="M30 12a14 14 0 1 0 14 22 11 11 0 0 1-14-22z"/>${star(46, 14, 3.5, 0)}${star(54, 30, 2.5, 0.7)}${star(12, 46, 3, 1.3)}${star(40, 50, 2, 1.8)}` });
  add({ id: 'sky-rain', slot: 'sky', label: 'Rain', colour: 'blue', tags: ['rain', 'weather'], mood: 'cosy',
    svg: () => `${cloud(14, 30, 1.6, 'w lk')}${[18, 28, 38, 48].map((x, i) => `<path class="lc x-drop" style="--d:${i * 0.3}s" d="M${x} 38l-2 6"/>`).join('')}` });
  add({ id: 'sky-snow', slot: 'sky', label: 'Snowfall', colour: 'slate', tags: ['snow', 'winter'], mood: 'cosy', season: ['winter'],
    svg: () => `${cloud(14, 26, 1.6, 'w lk')}${[[16, 0], [26, 0.8], [36, 0.3], [46, 1.2], [21, 1.6], [41, 2]].map(([x, d]) => `<circle class="s lm x-fall" style="--d:${d}s" cx="${x}" cy="34" r="2"/>`).join('')}` });
  add({ id: 'sky-blossom', slot: 'sky', label: 'Blossom breeze', colour: 'pink', tags: ['spring', 'blossom'], mood: 'cheerful', season: ['spring'],
    svg: () => `${cloud(10, 22, 1.1, 'w lm')}${[[14, 0], [28, 0.7], [42, 0.2], [52, 1.3], [22, 1.8]].map(([x, d]) => `<ellipse class="c x-fall" style="--d:${d}s" cx="${x}" cy="30" rx="2.4" ry="1.6"/>`).join('')}<path class="lm" d="M6 56h52"/>` });

  /* ---------- empty and loading ---------- */
  add({ id: 'load-dots', slot: 'empty-loading', label: 'Three dots', colour: 'slate', tags: ['loading'], mood: 'neutral',
    svg: () => [20, 32, 44].map((x, i) => `<circle class="c x-bounce" style="--d:${i * 0.18}s" cx="${x}" cy="34" r="4"/>`).join('') });
  add({ id: 'load-orbit', slot: 'empty-loading', label: 'Orbit', colour: 'violet', tags: ['loading', 'space'], mood: 'dreamy',
    svg: () => `<circle class="lm dash" cx="32" cy="32" r="18"/><circle class="s lc" cx="32" cy="32" r="7"/><g class="x-spin o-v" style="transform-origin:32px 32px"><circle class="c" cx="50" cy="32" r="4"/></g>` });
  add({ id: 'empty-plant', slot: 'empty-loading', label: 'Growing plant', colour: 'green', tags: ['empty', 'calm'], mood: 'calm',
    svg: () => `<path class="s lk" d="M22 44h20l-3 12H25z"/><g class="x-grow o-v" style="transform-origin:32px 44px"><path class="lc t" d="M32 44V26"/><path class="c" d="M32 32c-8 0-12-5-12-10 7 0 12 4 12 10zM32 28c0-7 5-11 12-11 0 6-5 11-12 11z"/></g>` });

  /* ---------- the light/dark switch (Motion.themeSwap reads vt) ---------- */
  // sun -> moon with stars (the reduced variant is the end state, still)
  const morph = (still, cue) => `<g class="ap-tt${still ? ' is-night' : ''}">${cue || ''}<g class="ap-tt-rays">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path class="lc" d="M${32 + 15 * Math.cos(i * Math.PI / 4)} ${32 + 15 * Math.sin(i * Math.PI / 4)}l${(4 * Math.cos(i * Math.PI / 4)).toFixed(2)} ${(4 * Math.sin(i * Math.PI / 4)).toFixed(2)}"/>`).join('')}</g><circle class="c" cx="32" cy="32" r="11"/><circle class="ap-tt-bite" cx="44" cy="22" r="10"/><g class="ap-tt-stars">${star(48, 40, 3, 0)}${star(16, 18, 2.4, 0.4)}${star(46, 12, 2, 0.8)}</g></g>`;
  const IRIS = '<circle class="lm dash" cx="32" cy="32" r="25"/>', DUSK = '<path class="lm" d="M4 56h56"/>';
  add({ id: 'theme-iris', slot: 'theme-switch', label: 'Circle reveal', colour: 'indigo', tags: ['circle', 'reveal'], mood: 'dreamy', intensity: 'subtle', vt: { kind: 'circle', ms: 520 }, svg: () => morph(false, IRIS), reduced: () => morph(true, IRIS) });
  add({ id: 'theme-dusk', slot: 'theme-switch', label: 'Dusk falls', colour: 'violet', tags: ['wipe', 'evening'], mood: 'calm', intensity: 'subtle', vt: { kind: 'wipe', ms: 560 }, svg: () => morph(false, DUSK), reduced: () => morph(true, DUSK) });
  add({ id: 'theme-fade', slot: 'theme-switch', label: 'Crossfade', colour: 'slate', tags: ['fade'], mood: 'neutral', intensity: 'subtle', vt: { kind: 'fade', ms: 320 }, svg: () => morph(false), reduced: () => morph(true) });

  animRegisterPack({ id: 'core', name: 'Core', core: true, version: '2.2.0', description: 'The animations built into OpenDash.', items });
})();
