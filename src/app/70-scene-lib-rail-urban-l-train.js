/* ============================================================
   SCENE LIBRARY: rail.l-train (one object per file; docs/dev/SCENE_ENGINE.md section 2).
   PURE: one sceneObjDefine call, built lazily.

   A four-car elevated rapid-transit train of the American kind (after the L train in the
   hand-drawn chicago-l-train art): plain brushed stainless-steel cars with a dark window band,
   two pairs of sliding doors a side, roof-mounted air-conditioning housings, black trucks and
   the gangway bellows between cars; the lead car's flat cab end with its dark windscreen and
   headlamps. The sides stay BLANK: no operator's colours, logos, numbers, line colours or
   destination text. FACES RIGHT; flippable for trains going the other way. Its windows light at
   real dusk (glow 'window'). Light: the fine pieces (door seams, roof ribs, skirt lines) are
   detail. Anchor: the rail head at the middle of the train (48 ft cars at 2 units a foot).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const CW = 96, GAP = 2, N = 4, L = N * CW + (N - 1) * GAP, X0 = -L / 2;
  const TOP = -25, WB0 = -19, WB1 = -11, SK = -3.6;   // the roof line, the window band's top and bottom, the skirt
  define({
    id: 'rail.l-train', category: 'rail', size: [L + 2, 29], box: [-L / 2 - 1, -28, L / 2 + 1, 1], variants: 1, seasonal: false, flippable: true,
    palette: { base: {
      steel: ['#e4e8ec', '#c4cad0', '#9aa2aa'], band: '#20262e', glass: ['#3a4654', '#5a6a7a'], door: ['#b4bcc4', '#8a929a'],
      roof: ['#a8b0b8', '#7a828a'], under: '#1c2024', truck: '#2a2e32', lamp: '#fff6dc', marker: '#ff5a3a',
    } },
    night: { glow: { window: '#fff0c8' }, on: 0.95 },
    anim: { bob: { part: 'body', dy: 0.4, period: 0.8 } },
    tags: ['us', 'railway', 'train', 'elevated', 'rapid-transit', 'kit:urban', 'kit:vehicles', 'role:vehicle'],
    credit: 'native (scene engine upgrade), after the hand-drawn chicago-l-train art (its train on the L)',
    build() {
      const body = [];
      for (let i = 0; i < N; i++) {
        const cx = X0 + i * (CW + GAP), lead = i === N - 1;
        // the shell: brushed steel, lighter above (the sky in it), a rounded roof line; the lead car's flat cab end
        const shell = lead ? poly([[cx, SK], [cx, TOP + 2], [cx + 2, TOP], [cx + CW - 3, TOP], [cx + CW, TOP + 4], [cx + CW, SK]]) : poly([[cx, SK], [cx, TOP + 2], [cx + 2, TOP], [cx + CW - 2, TOP], [cx + CW, TOP + 2], [cx + CW, SK]]);
        body.push({ f: { lin: [[0, '@steel.0'], [0.6, '@steel.1'], [1, '@steel.2']], x1: 0, y1: TOP, x2: 0, y2: SK }, d: shell });
        body.push(['@roof.0', rect(cx + 2, TOP - 1.4, CW - 4, 1.6)], ['@roof.1', rect(cx + 30, TOP - 3.2, 14, 2) + rect(cx + 54, TOP - 3.2, 14, 2)]);
        body.push({ s: '@roof.1', w: 0.3, op: 0.6, d: `M${cx + 4} ${TOP + 1}H${cx + CW - 4}M${cx + 32} ${TOP - 2.2}h10M${cx + 56} ${TOP - 2.2}h10`, detail: true });
        // the dark window band and its windows (glow), the two pairs of doors with their tall windows
        body.push(['@band', rect(cx + 3, WB0, CW - 6, WB1 - WB0)]);
        const doors = [cx + 20, cx + CW - 30], win = [], dw = [];
        for (const dx of doors) { dw.push(rect(dx + 1, WB0 + 0.6, 3.6, 7.6) + rect(dx + 5.4, WB0 + 0.6, 3.6, 7.6)); }
        for (const [a, b] of [[cx + 4, doors[0] - 1], [doors[0] + 11, doors[1] - 1], [doors[1] + 11, cx + CW - (lead ? 10 : 4)]]) {
          for (let x = a + 1; x + 8 <= b; x += 9.4) win.push(rect(x, WB0 + 1.2, 8, WB1 - WB0 - 2.4));
        }
        body.push({ f: '@glass.0', d: win.join(''), glow: 'window' });
        body.push({ f: '@glass.1', d: win.map((w, k) => (k % 2 ? '' : w)).join(''), op: 0.3, detail: true });
        for (const dx of doors) body.push(['@door.0', rect(dx, WB0 - 1, 10, SK - WB0 + 1)], { s: '@door.1', w: 0.4, d: `M${dx + 5} ${WB0 - 1}V${SK}M${dx} ${WB0 - 1}h10`, detail: true });
        // re-draw the door windows over the door leaves
        body.push({ f: '@glass.0', d: dw.join(''), glow: 'window' });
        // the skirt, the underframe, the two trucks with their wheels, the gangway bellows to the next car
        body.push(['@steel.2', rect(cx, SK, CW, 1.2)], ['@under', rect(cx + 4, SK + 1.2, CW - 8, 1.2)]);
        body.push(['@truck', rect(cx + 8, -2.6, 16, 2.4) + rect(cx + CW - 24, -2.6, 16, 2.4)], ['@under', ell(cx + 12, -1.2, 1.6, 1.2) + ell(cx + 20, -1.2, 1.6, 1.2) + ell(cx + CW - 20, -1.2, 1.6, 1.2) + ell(cx + CW - 12, -1.2, 1.6, 1.2)]);
        if (i < N - 1) body.push(['@under', rect(cx + CW, TOP + 3, GAP, SK - TOP - 4)]);
      }
      // the lead car's cab: the dark windscreen over the flat end, the blank destination panel, the headlamps and markers
      const fx = X0 + L;
      body.push(['@band', poly([[fx - 9, WB0 - 3], [fx - 1, WB0 - 3], [fx, WB0 + 1], [fx, WB1 + 1], [fx - 9, WB1 + 1]])], { f: '@glass.1', d: rect(fx - 8, WB0 - 2, 6, 3), op: 0.6 });
      body.push(['@lamp', rect(fx - 2.4, SK - 4, 2.4, 1.6)], ['@marker', rect(fx - 2.4, SK - 6.4, 2.4, 1.2)], { f: '@lamp', d: rect(fx - 7, WB0 + 2, 4, 5), op: 0.25, glow: 'window' });
      return { body };
    },
  });
})();
