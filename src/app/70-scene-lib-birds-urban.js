/* ============================================================
   SCENE LIBRARY: urban birds (docs/dev/SCENE_ENGINE.md 2.3, 2.7 kits urban / birds).
   PURE: sceneObjDefine calls only. Anchor: the feet. Faces RIGHT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;

  /* ---------- bird.pigeon: a feral pigeon on the pavement, pecking (turn on the head) ---------- */
  sceneObjDefine({
    id: 'bird.pigeon', category: 'bird', size: [30, 26], variants: 3, seasonal: false, flippable: true, parts: ['body', 'head'],
    palette: { base: { plume: ['#7a8290', '#5e6674', '#9aa2ae'], dark: '#3a404a', neck: ['#5a8a7a', '#8a6a9a'], leg: '#c86a5a', eye: '#e8a040' } },
    anim: { turn: { part: 'head', pivot: [6, -14], deg: 22, period: 2.4, hold: 0.5 } },
    tags: ['city', 'pigeon', 'kit:urban', 'kit:birds', 'role:bird'],
    credit: 'native: a feral pigeon',
    build(v) {
      const p = `@plume.${v}`;
      const body = [{ s: '@leg', w: 1.2, cap: 'round', d: 'M-2 -4l-1 4M3 -4l1 4' }, [p, 'M-14 -10Q-8 -20 4 -18Q12 -16 12 -10Q10 -4 0 -4Q-10 -4 -14 -10z'], ['@dark', 'M-14 -10L-20 -8L-14 -7z'],
        ['@plume.1', 'M-8 -14Q0 -18 6 -14Q0 -10 -8 -12z', 0.8], { s: '@dark', w: 1, op: 0.5, d: 'M-6 -13h6M-4 -11h6' }];
      const head = [[`@neck.${v % 2}`, 'M4 -18Q8 -24 12 -20Q12 -15 8 -14z', 0.9], [p, ell(11, -22, 4.5, 4)], ['@dark', 'M15 -22l3 1-3 1z'], ['@eye', ell(12, -23, 0.9, 0.9)]];
      return { body, head };
    },
  });
})();
