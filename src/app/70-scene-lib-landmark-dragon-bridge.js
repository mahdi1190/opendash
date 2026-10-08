/* ============================================================
   SCENE LIBRARY: landmark.dragon-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the bridge in the hand-drawn da-nang-skyline art
   (`scene upgrade asia-southeast/da-nang-skyline --box=-200,330,1500,700`; its wave of a yellow body
   over a deck on piers, the head at the right), redrawn by hand:
   - the real structure: the Dragon Bridge over the Han River, a six-lane road bridge whose middle
     is a steel box arch in three equal spans, painted yellow and shaped as a dragon's body. The
     arch runs down the median: it rises in three humps over the deck and dives through it onto
     the piers between them; vertical hangers carry the deck from each hump. At the west end the
     tail rises out of the deck, at the east end the neck climbs to the head, which faces east to
     the sea. Concrete approach spans on twin columns either side
   - the dragon is a STRUCTURAL shape: a steel box section with joint lines, plate fins and a
     sculpted steel head; no figure, no ornament beyond the steelwork
   - lit from the left (the west, at dusk): the body's sunlit upper edge, its shaded belly; the
     piers' lit faces; the deck's fascia, rail and lamp posts
   - night: the body traced in golden LED light, the head and fins outlined, the deck's lamps
     (glow and the 'lit' line), the piers washed from below
   No text, no flags. Anchor: the waterline at the middle of the main span (the bridge runs from
   x -960 to 960, the deck top at y -42).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const DT = -42, DB = -30, YS = -38, YA = -142, L = 366, X0 = -549, END = 960;   // deck top / bottom, the springing and apex of the humps, a span, the first springing
  const C = (YA - 0.25 * YS) / 0.75;   // the control height that puts a hump's apex at YA
  // one hump as a cubic from springing to springing
  const hump = k => { const a = X0 + k * L, b = a + L; return [[a, YS], [a + 0.11 * L, C], [b - 0.11 * L, C], [b, YS]]; };
  const bz = (P, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]); };
  const yAt = (P, x) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (bz(P, m)[0] < x) lo = m; else hi = m; } return bz(P, (lo + hi) / 2)[1]; };
  const cub = (P, dy) => `M${f1(P[0][0])} ${f1(P[0][1] + dy)}C${f1(P[1][0])} ${f1(P[1][1] + dy)} ${f1(P[2][0])} ${f1(P[2][1] + dy)} ${f1(P[3][0])} ${f1(P[3][1] + dy)}`;
  // the tail (west) and the neck (east): cubics rising out of the deck, as tapered tubes
  const TAIL = [[X0, YS], [X0 - 44, YS - 4], [X0 - 70, -96], [X0 - 128, -122]];
  const NECK = [[-X0, YS], [-X0 + 40, YS - 6], [-X0 + 52, -128], [-X0 + 98, -150]];
  const tube = (P, w0, w1) => {
    const a = [], b = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, p = bz(P, t), q = bz(P, Math.min(1, t + 0.01)), o = bz(P, Math.max(0, t - 0.01));
      const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
      a.push([p[0] - dy / l * w, p[1] + dx / l * w]); b.push([p[0] + dy / l * w, p[1] - dx / l * w]);
    }
    return poly(a.concat(b.reverse()));
  };
  define({
    id: 'landmark.dragon-bridge', category: 'landmark', size: [1920, 220], box: [-962, -218, 962, 4], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      gold: ['#ffd660', '#eeae2c', '#c27c14', '#8a5410'], steel: ['#9a8e7c', '#6a6256'],
      deck: ['#dcd6ca', '#aaa398', '#76706a', '#4c4844'], pier: ['#b8b2a6', '#8a847a', '#625e56'],
      led: '#ffd25a', ledHot: '#fff0b0', lamp: '#ffe6b0', wash: '#ffcf8a',
    } },
    night: { glow: { lamp: '#ffe6b0' }, on: 0.88 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:da-nang', 'asia', 'asia-southeast', 'bridge', 'arch-bridge', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn da-nang-skyline art (its wave of a body over the deck)',
    build() {
      const body = [], lit = [];
      const H = [0, 1, 2].map(hump);
      // the whole body's centre line: tail, three humps, neck
      const spine = (dy) => `M${f1(TAIL[3][0])} ${f1(TAIL[3][1] + dy)}C${f1(TAIL[2][0])} ${f1(TAIL[2][1] + dy)} ${f1(TAIL[1][0])} ${f1(TAIL[1][1] + dy)} ${X0} ${YS + dy}` + H.map(P => cub(P, dy)).join('') + cub(NECK, dy);   // one subpath per piece: no join spikes where they meet under the deck
      const humps = (dy) => H.map(P => cub(P, dy)).join('');
      // the far parapet and its lamp posts, seen over the deck behind the median
      body.push({ s: '@deck.2', w: 1.2, op: 0.8, d: `M${-END} ${DT - 3}H${END}` });
      let farPosts = ''; for (let x = -END + 20; x < END; x += 60) farPosts += `M${x} ${DT - 3}v-10`;
      body.push({ s: '@deck.3', w: 0.7, op: 0.7, d: farPosts, detail: true });
      // the approach spans' twin columns and the main piers (the humps land on them under the deck)
      for (const x of [-900, -786, -672, 672, 786, 900]) {
        body.push(['@pier.1', rect(x - 9, DB, 7, -DB) + rect(x + 2, DB, 7, -DB)], ['@pier.0', rect(x - 9, DB, 2.6, -DB) + rect(x + 2, DB, 2.6, -DB), 0.8], ['@pier.2', rect(x - 11, DB, 22, 3.4)]);
      }
      for (const x of [X0, X0 + L, X0 + 2 * L, X0 + 3 * L]) {
        body.push(['@pier.1', poly([[x - 17, 0], [x - 14, DB], [x + 14, DB], [x + 17, 0]])], ['@pier.0', poly([[x - 17, 0], [x - 14, DB], [x - 6, DB], [x - 8, 0]]), 0.85]);
        body.push(['@pier.2', poly([[x + 6, 0], [x + 7, DB], [x + 14, DB], [x + 17, 0]]), 0.7], ['@pier.2', rect(x - 19, -4, 38, 4)]);
        body.push({ s: '@deck.0', w: 1.1, op: 0.45, d: `M${x - 24} -0.5Q${x} 2.5 ${x + 24} -0.5` });
      }
      // the hangers: vertical steel from each hump down to the deck, at even steps
      let hang = '';
      for (const P of H) for (let x = P[0][0] + 22; x < P[3][0] - 18; x += 15) { const y = yAt(P, x); if (y < DT - 12) hang += `M${f1(x)} ${f1(y + 8)}V${DT}`; }
      body.push({ s: '@steel.0', w: 1.3, op: 0.9, d: hang });
      // the body: the steel box in its shade, the sunlit flank, the belly, the top edge in the light
      body.push({ s: '@gold.3', w: 18, d: humps(0) });
      body.push({ s: '@gold.1', w: 13.6, d: humps(-1.8) });
      body.push({ s: '@gold.2', w: 3.8, op: 0.85, d: humps(6.2) });
      body.push({ s: '@gold.0', w: 2.8, op: 0.95, d: humps(-6.8) });
      // the box section's joints and the scale plates along the flank (fine detail)
      let joints = '', plates = '';
      for (const P of H) for (let i = 1; i < 26; i++) {
        const t = i / 26, p = bz(P, t), q = bz(P, t + 0.01), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        joints += `M${f1(p[0] - nx * 9)} ${f1(p[1] - ny * 9)}L${f1(p[0] + nx * 9)} ${f1(p[1] + ny * 9)}`;
        if (i % 2) plates += `M${f1(p[0] - nx * 4 - dx / l * 3.6)} ${f1(p[1] - ny * 4 - dy / l * 3.6)}Q${f1(p[0] - nx * 7.6)} ${f1(p[1] - ny * 7.6)} ${f1(p[0] - nx * 4 + dx / l * 3.6)} ${f1(p[1] - ny * 4 + dy / l * 3.6)}`;
      }
      body.push({ s: '@gold.3', w: 0.7, op: 0.6, d: joints, detail: true }, { s: '@gold.0', w: 0.8, op: 0.7, d: plates, detail: true });
      // the low plate fins along the back of each hump (the steel crest)
      let fins = '';
      for (const P of H) for (let i = 3; i < 24; i += 3) {
        const t = i / 26, p = bz(P, t), q = bz(P, t + 0.02), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l;
        fins += poly([[p[0] - dx / l * 4 + nx * 8, p[1] - dy / l * 4 + ny * 8], [p[0] - dx / l * 7 + nx * 16, p[1] - dy / l * 7 + ny * 16], [p[0] + dx / l * 4 + nx * 8, p[1] + dy / l * 4 + ny * 8]]);
      }
      body.push({ f: '@gold.2', d: fins }, { f: '@gold.0', d: fins, op: 0.35, m: [1, 0, 0, 1, -0.8, -0.6], detail: true });
      // the tail: a tapering tube rising out of the deck, its tip a pair of steel fins
      body.push(['@gold.2', tube(TAIL, 18, 6)], ['@gold.1', tube(TAIL, 12.6, 3.6), 1], { s: '@gold.0', w: 2, op: 0.9, d: `M${X0} ${YS - 6}C${f1(TAIL[1][0])} ${f1(TAIL[1][1] - 6)} ${f1(TAIL[2][0] - 4)} ${f1(TAIL[2][1] - 4)} ${f1(TAIL[3][0] - 2)} ${f1(TAIL[3][1] - 3)}` });
      const tx = TAIL[3][0], ty = TAIL[3][1];
      body.push(['@gold.2', poly([[tx + 4, ty + 2], [tx - 30, ty - 30], [tx - 12, ty - 4], [tx - 34, ty + 2], [tx - 6, ty + 6]])], ['@gold.0', poly([[tx + 2, ty], [tx - 30, ty - 30], [tx - 10, ty - 6]]), 0.8]);
      // the neck: a tapering tube from the deck up to the head
      body.push(['@gold.2', tube(NECK, 18, 21)], ['@gold.1', tube(NECK, 12.6, 15)], { s: '@gold.0', w: 2.4, op: 0.9, d: `M${-X0} ${YS - 6}C${-X0 + 40} ${YS - 12} ${-X0 + 46} -134 ${-X0 + 96} -158` });
      let nj = ''; for (let i = 2; i < 16; i += 2) { const p = bz(NECK, i / 16), q = bz(NECK, i / 16 + 0.01), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; nj += `M${f1(p[0] + dy / l * 9)} ${f1(p[1] - dx / l * 9)}L${f1(p[0] - dy / l * 9)} ${f1(p[1] + dx / l * 9)}`; }
      body.push({ s: '@gold.3', w: 0.8, op: 0.6, d: nj, detail: true });
      // the head (sculpted steel plate), facing east: the skull and snout, the open jaws, the brow ridge,
      // horns and the crest of plate fins sweeping back, the chin plates
      const hx = -X0 + 98, hy = -150;   // where the neck meets the head
      const skull = poly([[hx - 12, hy - 18], [hx + 14, hy - 26], [hx + 46, hy - 24], [hx + 74, hy - 14], [hx + 92, hy - 9], [hx + 96, hy - 3], [hx + 60, hy - 2], [hx + 34, hy + 2], [hx + 20, hy + 10], [hx - 2, hy + 14], [hx - 14, hy + 4]]);
      const jaw = poly([[hx + 30, hy + 4], [hx + 58, hy + 9], [hx + 86, hy + 13], [hx + 84, hy + 18], [hx + 52, hy + 20], [hx + 20, hy + 18], [hx + 12, hy + 12]]);
      body.push(['@gold.2', skull], ['@gold.1', poly([[hx - 8, hy - 18], [hx + 14, hy - 24], [hx + 46, hy - 22], [hx + 74, hy - 12], [hx + 90, hy - 7], [hx + 60, hy - 6], [hx + 30, hy - 4], [hx + 6, hy + 4]])]);
      body.push(['@gold.2', jaw], ['@gold.1', poly([[hx + 30, hy + 6], [hx + 58, hy + 10], [hx + 84, hy + 14], [hx + 52, hy + 15], [hx + 22, hy + 13]]), 0.9]);
      body.push(['@gold.3', poly([[hx + 36, hy + 1], [hx + 60, hy - 1], [hx + 94, hy - 2], [hx + 84, hy + 12], [hx + 58, hy + 8]]), 0.9]);   // the open mouth (dark)
      body.push({ s: '@gold.0', w: 2, op: 0.9, d: `M${hx - 10} ${hy - 19}L${hx + 14} ${hy - 26}L${hx + 46} ${hy - 24}L${hx + 74} ${hy - 14}L${hx + 92} ${hy - 9}` });
      body.push(['@gold.3', poly([[hx + 38, hy - 16], [hx + 52, hy - 19], [hx + 56, hy - 14], [hx + 44, hy - 12]]), 0.85], ['@gold.0', poly([[hx + 26, hy - 21], [hx + 58, hy - 22], [hx + 52, hy - 19], [hx + 34, hy - 18]]), 0.9]);   // the brow ridge and its recess
      body.push(['@gold.2', poly([[hx + 86, hy - 12], [hx + 96, hy - 20], [hx + 98, hy - 8]])], ['@gold.2', poly([[hx + 64, hy + 18], [hx + 58, hy + 30], [hx + 72, hy + 18]]) + poly([[hx + 40, hy + 19], [hx + 30, hy + 32], [hx + 50, hy + 20]])]);
      body.push(['@gold.2', poly([[hx + 6, hy - 22], [hx - 30, hy - 52], [hx - 6, hy - 30]])], ['@gold.1', poly([[hx + 18, hy - 25], [hx - 16, hy - 58], [hx + 8, hy - 30]])], ['@gold.0', poly([[hx + 16, hy - 25], [hx - 16, hy - 58], [hx + 6, hy - 28]]), 0.7]);   // two horns
      const crest = [[-14, -10, -58, -38], [-14, -2, -64, -18], [-16, 6, -62, 2], [-12, 12, -50, 22]];
      crest.forEach(([ax, ay, bx, by], i) => body.push([i % 2 ? '@gold.1' : '@gold.2', poly([[hx + ax + 6, hy + ay - 6], [hx + bx, hy + by], [hx + ax + 2, hy + ay + 6]])]));
      body.push({ s: '@gold.3', w: 0.8, op: 0.6, d: `M${hx + 4} ${hy - 14}Q${hx + 20} ${hy - 6} ${hx + 30} ${hy + 4}M${hx + 60} ${hy - 6}Q${hx + 74} ${hy - 6} ${hx + 90} ${hy - 4}`, detail: true });
      // the deck: the girder's fascia in the light, its lower edge in shade, the near parapet, its posts, the joints
      body.push(['@deck.1', rect(-END, DT, 2 * END, DB - DT)], ['@deck.0', rect(-END, DT, 2 * END, 4.4)], ['@deck.2', rect(-END, DB - 3.4, 2 * END, 3.4), 0.9]);
      body.push(['@deck.3', rect(-END, DB, 2 * END, 1.6), 0.6], { s: '@deck.3', w: 1.4, op: 0.85, d: `M${-END} ${DT - 4.4}H${END}` });
      let posts = '', joints2 = ''; for (let x = -END + 6; x < END; x += 12) posts += `M${x} ${DT}v-4.4`;
      for (let x = -END + 114; x < END; x += 114) joints2 += `M${x} ${DT + 4.4}V${DB}`;
      body.push({ s: '@deck.3', w: 0.6, op: 0.6, d: posts, detail: true }, { s: '@deck.2', w: 0.7, op: 0.6, d: joints2, detail: true });
      // the lamp posts on both edges of the deck, their arms and the lamp heads (glow, in five groups)
      let poles = ''; const heads = ['', '', '', '', ''];
      for (let x = -END + 30, i = 0; x < END; x += 52, i++) { poles += `M${x} ${DT - 4}V${DT - 22}h4`; heads[(i * 3) % 5] += ell(x + 5, DT - 22, 2, 1.3); }
      body.push({ s: '@steel.1', w: 1, op: 0.9, d: poles });
      heads.forEach(d => body.push({ f: '@deck.3', d, glow: 'lamp' }));
      // night: the body traced in golden LED light (a soft halo, a bright core), the hangers faintly, the head outlined
      lit.push({ s: '@led', w: 24, op: 0.22, d: spine(0) }, { s: '@led', w: 7, op: 0.85, d: spine(-2) }, { s: '@ledHot', w: 1.8, op: 0.9, d: spine(-5) });
      lit.push({ s: '@led', w: 1, op: 0.35, d: hang });
      lit.push({ s: '@ledHot', w: 1.6, op: 0.9, d: `M${hx - 12} ${hy - 18}L${hx + 14} ${hy - 26}L${hx + 46} ${hy - 24}L${hx + 74} ${hy - 14}L${hx + 92} ${hy - 9}L${hx + 96} ${hy - 3}` }, { f: '@led', d: skull, op: 0.35 }, { f: '@led', d: jaw, op: 0.3 });
      lit.push({ f: '@ledHot', d: fins, op: 0.55 });
      // night: the deck's lamps as a line along both edges, the piers washed from below
      lit.push({ s: '@lamp', w: 1.4, op: 0.5, d: `M${-END} ${DT - 2}H${END}` });
      for (const x of [X0, X0 + L, X0 + 2 * L, X0 + 3 * L]) lit.push({ f: { lin: [[0, '@wash', 0.55], [1, '@wash', 0]], x1: 0, y1: 0, x2: 0, y2: DB }, d: poly([[x - 17, 0], [x - 14, DB], [x + 14, DB], [x + 17, 0]]) });
      return { body, lit };
    },
  });
})();
