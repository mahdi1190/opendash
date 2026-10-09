/* ============================================================
   SCENE LIBRARY: landmark.fort-worth-stockyards.
   The iron entrance arch, its Lone Star, and the red-brick storefronts along
   Exchange Avenue. Native paths preserve the authored Fort Worth opening art:
   double steel arch with triangulated bracing, bolted columns, stepped parapets,
   arched upper windows, shaded shopfronts, festoon lights and four street lamps.
   No text or logos. Anchor is the scene's (800, 720); place at that point, s: 1.
   Sky, road, cattle and the foreground fences belong to the composition.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { define, ell, rect } = sceneDraw, R = Math.round, OFFSET = [1, 0, 0, 1, -800, -720];
  const star = (cx, cy, outer, inner) => {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = (-90 + 36 * i) * Math.PI / 180, q = i % 2 ? inner : outer; p.push(`${R(cx + q * Math.cos(a))} ${R(cy + q * Math.sin(a))}`); }
    return 'M' + p.join('L') + 'z';
  };
  const seeded = seed => { let n = seed >>> 0 || 1; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };
  // Equal-distance points reproduce the round dash bulbs from the source art,
  // using real circles so SVG and Canvas carry the same lights and silhouettes.
  const bulbPoints = (a, c, b, gap) => {
    const out = [], steps = 180;
    let prev = a, walked = 0, next = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t, p = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
      const len = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      while (next <= walked + len) {
        const k = len ? (next - walked) / len : 0;
        out.push([prev[0] + (p[0] - prev[0]) * k, prev[1] + (p[1] - prev[1]) * k]);
        next += gap;
      }
      walked += len; prev = p;
    }
    return out;
  };
  define({
    id: 'landmark.fort-worth-stockyards', category: 'landmark', size: [1640, 530], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: { window: '#253647', lamp: '#e7ae75', glow: '#ffe3a3' } },
    night: { glow: { window: '#ffcf91', lamp: '#ffe3a3' }, on: 0.96 },
    shadow: { rx: 110, ry: 8, h: 100 },
    tags: ['landmark', 'place:texas/place:fort-worth', 'texas', 'fort-worth', 'stockyards', 'ironwork', 'brick-storefronts'],
    credit: 'native scene engine upgrade, after the hand-drawn Fort Worth Stockyards opening art',
    build() {
      const body = [], lit = [];
      const fill = (f, d, extra, part) => (part || body).push(Object.assign({ f, d, m: OFFSET }, extra));
      const line = (s, w, d, extra) => body.push(Object.assign({ s, w, d, m: OFFSET }, extra));
      const bulbs = (points, col, radius, part) => points.forEach(([x, y]) => fill(col, ell(x, y, radius, radius), null, part));
      const facade = (x, y, w, h, tone, seed, step) => {
        const top = y - h, cols = Math.max(2, R(w / 68));
        fill(tone, `M${x} ${y}V${top}h${w}V${y}z`);
        fill('#54363c', `M${x + w - 18} ${top}h18v${h}h-18z`, { op: .5 });
        // Four staggered masonry courses keep the brick facades from reading flat.
        for (let row = 0; row < 4; row++) {
          const yy = R(top + 22 + row * (h - 36) / 4);
          let course = `M${x + 4} ${yy}h${w - 8}`;
          for (let c = 0; c < cols - 1; c++) { const xx = x + 8 + (c + (row % 2) * .5) * w / cols; if (xx < x + w - 8) course += `M${R(xx)} ${yy}v${R((h - 36) / 4)}`; }
          line('#edb48a', 1.4, course, { op: .19, detail: true });
        }
        const bays = [];
        for (let i = 0; i < cols; i++) {
          const xx = R(x + 17 + i * (w - 20) / cols), wy = R(top + 47), ww = R((w - 30) / cols - 17), wh = R(h * .27);
          bays.push({ xx, wy, ww, wh });
          fill('#d49c7a', `M${xx - 4} ${wy + wh + 4}v-${wh}q${R(ww / 2) + 4} -22 ${ww + 8} 0v${wh}z`);
        }
        for (const { xx, wy, ww, wh } of bays) fill('@window', `M${xx} ${wy + wh}v-${wh}q${R(ww / 2)} -15 ${ww} 0v${wh}z`);
        for (const { xx, wy, ww, wh } of bays) {
          const left = xx + 2, right = xx + ww - 2, top = wy + 3, bottom = wy + wh - 3;
          const mx = xx + R(ww / 2), my = wy + R(wh * .48);
          // Glow is painted over the body: leave the three-pixel mullions visible.
          const panes = rect(left, top, mx - 1.5 - left, my - 1.5 - top)
            + rect(mx + 1.5, top, right - mx - 1.5, my - 1.5 - top)
            + rect(left, my + 1.5, mx - 1.5 - left, bottom - my - 1.5)
            + rect(mx + 1.5, my + 1.5, right - mx - 1.5, bottom - my - 1.5);
          fill('@window', panes, { glow: 'window' });
        }
        for (const { xx, wy, ww, wh } of bays) line('#aa755c', 3, `M${xx + R(ww / 2)} ${wy - 3}v${wh + 3}M${xx} ${wy + R(wh * .48)}h${ww}`);
        const crown = step ? `M${x - 5} ${top + 4}v-12h${R(w * .23)}v-17h${R(w * .54)}v17h${R(w * .23) + 10}v12z` : `M${x - 5} ${top + 4}v-18h${w + 10}v18z`;
        fill('#c69372', crown);
        fill('#e3b48b', `M${x - 7} ${top - 2}h${w + 14}v5H${x - 7}z`);
        for (const { xx, ww } of bays) fill('#332c32', `M${xx - 5} ${y}v-${R(h * .3)}h${ww + 12}V${y}z`);
        for (const { xx } of bays) fill('#c38d62', `M${xx - 3} ${y}v-${R(h * .3)}h4V${y}z`);
        fill('#624c45', `M${x - 9} ${y - R(h * .32)}h${w + 18}l12 16H${x - 21}z`);
        fill('#c0956d', `M${x - 21} ${y - R(h * .32) + 16}h${w + 42}v5H${x - 21}z`);
        line('#382e32', 4, `M${x + 5} ${y}v-${R(h * .32) - 20}M${x + w - 5} ${y}v-${R(h * .32) - 20}`);
        const gap = 21 + R(seeded(seed)() * 5), yy = y - R(h * .32) + 21;
        for (let bx = x - 12; bx <= x + w + 12; bx += gap) fill('#ffd394', ell(bx, yy, 2, 2), null, lit);
      };
      // Smaller buildings at the far end of the street remain behind the gate.
      fill('#a77b6b', 'M500 649V548h134v101zM966 649V527h142v122z');
      fill('#d5ab88', 'M496 547h142v7H496zM962 526h150v8H962z');
      fill('#554954', 'M516 644v-58q15-16 30 0v58zM560 644v-58q15-16 30 0v58zM992 644v-81q16-20 32 0v81zM1046 644v-81q16-20 32 0v81z');
      for (const [x, y, w, h] of [[519, 590, 24, 45], [563, 590, 24, 45], [995, 568, 26, 63], [1049, 568, 26, 63]]) fill('#554954', `M${x} ${y}h${w}v${h}h-${w}z`, { glow: 'window' });
      facade(45, 708, 244, 254, '#9c5b4e', 48233, true);
      facade(300, 685, 196, 212, '#aa6c50', 48287, false);
      facade(1121, 686, 194, 228, '#a16b59', 48673, true);
      facade(1328, 720, 235, 261, '#815049', 48781, false);
      // The double arch and its triangulated lacing, edge light and rivets.
      line('#31333e', 18, 'M548 654V426Q800 206 1052 426V654');
      line('#31333e', 7, 'M548 452Q800 232 1052 452');
      const qy = x => R(318 + 108 * Math.pow((x - 800) / 258, 2));
      for (let x = 558; x < 1050; x += 26) line('#31333e', 3, `M${x} ${qy(x)}V${qy(x) + 25}l26 ${qy(x + 26) - qy(x) - 25}`);
      line('#ca9c7e', 2, 'M552 426Q800 210 1048 426', { op: .58 });
      fill('#323440', 'M535 651V421h26v230zM1039 651V421h26v230z');
      fill('#ac806a', 'M540 429h4v216h-4zM1044 429h4v216h-4z', { op: .65 });
      fill('#222e3b', 'M527 652h42v10h-42zM1031 652h42v10h-42z');
      bulbs(bulbPoints([558, 424], [800, 211], [1042, 424], 26), '#b28770', 1.5);
      line('#a57467', 3, 'M558 429Q800 216 1042 429');
      bulbs(bulbPoints([558, 429], [800, 216], [1042, 429], 19), '#ffdba0', 2.25, lit);
      fill('#8d503d', star(800, 322, 38, 17), { s: '#e5ac76', w: 2 });
      fill('#e3b478', star(800, 322, 26, 12));
      fill('#ffe4af', star(800, 322, 26, 12), null, lit);
      // Festoon cables meet the gate columns; the individual bulbs light at dusk.
      line('#3d3942', 2, 'M-20 508Q250 614 537 500M1065 500Q1360 623 1620 528');
      for (const [a, c, b] of [[[-20, 508], [250, 614], [537, 500]], [[1065, 500], [1360, 623], [1620, 528]]]) {
        const pts = bulbPoints(a, c, b, 34);
        bulbs(pts, '#eac293', 2.5);
        bulbs(pts, '#ffe3a3', 3, lit);
      }
      const lamp = (x, y, s) => {
        const m = [s, 0, 0, s, x - 800, y - 720];
        body.push({ f: '#202b35', d: 'M-7 0h14l-3-154h-8zM-18 -153l5-30h26l5 30zM-20 -184l20-12 20 12z', m });
        body.push({ f: '@lamp', d: 'M-12 -159l3-18H9l3 18z', glow: 'lamp', m });
        body.push({ s: '#33404a', w: 4, d: 'M0 -159v-20M-12 -151h24M-13 -5h26', m });
        lit.push({ f: '#ffce85', d: ell(0, -169, 30, 32), op: .12, m });
      };
      lamp(475, 699, .6); lamp(1128, 711, .66); lamp(198, 791, .97); lamp(1437, 810, 1.05);
      return { body, lit };
    },
  });
})();
