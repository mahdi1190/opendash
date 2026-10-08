/* ============================================================
   SCENE LIBRARY: landmark.canton-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the hyperboloid lattice tower in the hand-drawn guangzhou-skyline art
   (`scene upgrade asia-east/guangzhou-skyline --box 690,10,910,665`):
   - the real structure: the 600 m Canton Tower on the south bank of the Pearl River, a 454 m
     hyperboloid of 24 straight, inclined steel columns (each joins the base circle to the top
     circle, turned round the axis, so the lattice pinches to its slender waist about 280 m up)
     tied by horizontal rings, round a slim concrete core; the floors sit in four glazed zones
     inside the lattice (none in the open waist); the open deck at the top and the 146 m
     antenna mast above it
   - the white steel lattice: the columns in front of the core bright, the ones behind it seen
     through, fainter; the core lit on the left, shaded on the right
   - night: the lattice traced in LED light, teal at the foot through blue and violet to pink at
     the top, the rings in pink (the 'lit' part); the zone windows (glow); the beacon
   No text, no logos. Anchor: the ground at the middle of the base.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const H = 454, A0 = 40, A1 = 27, TW = 130 * Math.PI / 180, N = 24;
  // the radius at height h: every column is a straight line from the base circle (A0) to the top circle (A1), turned TW
  const rad = h => { const t = h / H; return Math.sqrt((1 - t) * (1 - t) * A0 * A0 + t * t * A1 * A1 + 2 * t * (1 - t) * A0 * A1 * Math.cos(TW)); };
  // column i at the share t of its height: [x, y, depth] (depth > 0: in front of the axis)
  const colAt = (i, t) => { const a = 2 * Math.PI * i / N + 0.13; return [(1 - t) * A0 * Math.cos(a) + t * A1 * Math.cos(a + TW), -t * H, (1 - t) * A0 * Math.sin(a) + t * A1 * Math.sin(a + TW)]; };
  // the floor zones inside the lattice: [from, to]
  const ZONES = [[30, 108], [116, 160], [168, 204], [334, 438]];
  const LED = { lin: [[0, '@led.0'], [0.35, '@led.1'], [0.7, '@led.2'], [1, '@led.3']], x1: 0, y1: 0, x2: 0, y2: -H };
  define({
    id: 'landmark.canton-tower', category: 'landmark', size: [92, 600], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#f4f8f8', '#c6d0d4', '#8f9ca2'], core: ['#c9cecd', '#959c9f', '#6f777b'], glass: ['#6c8a94', '#46606c', '#2f4652'],
      deck: ['#e8ecec', '#9ca4a8'], led: ['#4eeccf', '#5aa6ff', '#a87cff', '#ff6cc6'], ring: '#ff86d2', lightW: '#f4fbff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#fff0c8' }, on: 0.8 },
    shadow: { rx: 46, ry: 5, h: 80 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:guangzhou', 'asia', 'asia-east', 'tower', 'lattice'],
    credit: 'native (scene engine upgrade), after the hand-drawn guangzhou-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const hs = (a, b, step) => { const n = Math.max(2, Math.ceil((b - a) / step)), o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; };
      const side = (a, b, k, inset) => hs(a, b, 12).map(h => [k * (rad(h) - inset), -h]);
      // the skin of the lattice (what shows of it at a glance): a faint veil inside the silhouette
      body.push({ f: { lin: [[0, '@steel.1', 0.3], [1, '@steel.2', 0.24]], x1: -A0, y1: 0, x2: A0, y2: 0 }, d: poly(side(0, H, -1, 0).concat(side(0, H, 1, 0).reverse())) });
      // the core: a slim concrete shaft, lit on the left
      body.push(['@core.0', rect(-7, -H, 7, H)], ['@core.1', rect(0, -H, 7, H)], { s: '@core.2', w: 0.8, op: 0.6, d: 'M0 0V-454', detail: true });
      // the floor zones: glazed blocks inside the lattice, lit on the left; their slabs and window bands
      const cells = [];
      ZONES.forEach(([a, b], zi) => {
        const L = side(a, b, -1, 2.5), R = side(a, b, 1, 2.5);
        body.push({ f: { lin: [[0, '@glass.0'], [0.55, '@glass.1'], [1, '@glass.2']], x1: -rad(a), y1: 0, x2: rad(a), y2: 0 }, d: poly(L.concat(R.slice().reverse())), op: 0.92 });
        body.push(['@deck.0', poly([[-rad(b) + 3.5, -b], [rad(b) - 3.5, -b], [rad(b) - 3.5, -b + 2.2], [-rad(b) + 3.5, -b + 2.2]])], ['@deck.1', poly([[-rad(a) + 3.5, -a], [rad(a) - 3.5, -a], [rad(a) - 3.5, -a - 1.8], [-rad(a) + 3.5, -a - 1.8]]), 0.9]);
        let fl = '';
        for (let h = a + 4.5; h < b - 2; h += 4.5) fl += `M${f1(-rad(h) + 4)} ${f1(-h)}H${f1(rad(h) - 4)}`;
        body.push({ s: '@glass.2', w: 0.7, op: 0.6, d: fl, detail: true });
        for (let h = a + 8; h < b - 4; h += 14) for (let x = -rad(h) + 6; x < rad(h) - 14; x += 13) cells.push([x, -h - 2.6, 10, 2.6]);
        if (zi === 3) body.push({ f: '@glass.2', d: rect(-rad(b) + 6, -b + 4, 2 * rad(b) - 12, 6), op: 0.5 });
      });
      sceneDraw.winGroups(r, cells, 8).forEach(d => body.push({ f: '@glass.2', d, op: 0.35, glow: 'window', detail: true }));
      // the columns: each a straight line; the part behind the axis drawn faint (seen through the lattice), the front part bright
      let backAll = '', frontAll = '';
      for (let i = 0; i < N; i++) {
        const p = colAt(i, 0), q = colAt(i, 1), z0 = p[2], z1 = q[2];
        const at = t => colAt(i, t), seg = (t0, t1) => { const a = at(t0), b = at(t1); return `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; };
        let front = '', back = '';
        if (z0 >= 0 && z1 >= 0) front = seg(0, 1);
        else if (z0 < 0 && z1 < 0) back = seg(0, 1);
        else { const tc = z0 / (z0 - z1); if (z0 >= 0) { front = seg(0, tc); back = seg(tc, 1); } else { back = seg(0, tc); front = seg(tc, 1); } }
        if (back) { body.push({ s: '@steel.2', w: 1.3, op: 0.7, d: back, detail: true }); backAll += back; }
        if (front) {
          // lit on the left of the tower, turning into shade on the right
          const mx = (at(0)[0] + at(1)[0]) / 2;
          body.push({ s: mx < 6 ? '@steel.0' : '@steel.1', w: 2.1, d: front });
          frontAll += front;
        }
      }
      // what a small still keeps of the columns behind: one faint path
      body.push({ s: '@steel.2', w: 1.2, op: 0.4, d: backAll });
      // the rings, every 15 m: the front half bows a little up (seen from below), the back half down
      for (let g = 0; g < 6; g++) {
        let fr = '', bk = '';
        for (let h = 15 + g * 15; h < H - 4; h += 90) {
          const w = rad(h), b = w * 0.1;
          fr += `M${f1(-w)} ${f1(-h)}Q0 ${f1(-h - 2 * b)} ${f1(w)} ${f1(-h)}`;
          bk += `M${f1(-w)} ${f1(-h)}Q0 ${f1(-h + 2 * b)} ${f1(w)} ${f1(-h)}`;
        }
        body.push({ s: '@steel.1', w: 1.6, op: 0.9, d: fr }, { s: '@steel.2', w: 1, op: 0.45, d: bk, detail: true });
        lit.push({ s: '@ring', w: 1.5, op: 0.85, d: fr }, { s: '@ring', w: 1, op: 0.4, d: bk, detail: true });
      }
      // the edges of the silhouette: the sunlit left, the shaded right
      const edge = k => side(0, H, k, 0).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
      body.push({ s: '@steel.0', w: 1.4, op: 0.75, d: edge(-1) }, { s: '@steel.2', w: 1.4, op: 0.75, d: edge(1) });
      // the foot: the plinth ring and the entrance hall round the core
      body.push(['@deck.1', rect(-46, -4, 92, 4)], ['@deck.0', rect(-46, -5.5, 92, 1.6)], ['@glass.1', rect(-16, -14, 32, 10), 0.95], ['@deck.0', rect(-18, -16, 36, 2.2)]);
      // the top: the open deck ring at 454 m with the round cabins on its rim (detail), the roof over the core
      const wt = rad(H);
      body.push(['@deck.0', rect(-wt - 1.5, -H - 4, 2 * wt + 3, 4)], ['@deck.1', rect(-wt - 1.5, -H, 2 * wt + 3, 1.6)], ['@core.1', rect(-11, -H - 9, 22, 5)], ['@deck.0', rect(-12.5, -H - 10.5, 25, 1.6)]);
      let cab = '';
      for (let k = 0; k < 8; k++) { const x = -wt + 3 + k * (2 * wt - 6) / 7; cab += ell(x, -H - 6.4, 1.6, 1.6); }
      body.push({ f: '@glass.0', d: cab, detail: true });
      // the antenna mast: a tapering frustum, then the banded mast in steps, the beacon at the tip
      body.push(['@deck.0', poly([[-8, -H - 10], [-0.5, -H - 10], [-0.5, -500], [-4.6, -500]])], ['@deck.1', poly([[-0.5, -H - 10], [8, -H - 10], [4.6, -500], [-0.5, -500]])]);
      let tr = '';
      for (let h = H + 16; h < 500; h += 8) { const w = 8 - (h - H - 10) / 36 * 3.4; tr += `M${f1(-w)} ${-h}H${f1(w)}`; }
      body.push({ s: '@steel.2', w: 0.7, op: 0.8, d: tr, detail: true });
      const MS = [[500, 530, 3.4], [530, 560, 2.5], [560, 586, 1.7], [586, 600, 0.9]];
      MS.forEach(([a, b, w]) => body.push(['@steel.0', rect(-w, -b, w, b - a)], ['@steel.1', rect(0, -b, w, b - a)], ['@deck.1', rect(-w - 0.6, -a - 1.4, 2 * w + 1.2, 1.4)]));
      body.push(['@beacon', ell(0, -600.5, 1.1, 1.1)], ['@beacon', ell(0, -501.5, 0.9, 0.9), 0.9]);
      // night: the LED lattice (the columns in front bright, behind faint), the deck ring, the mast and beacons
      lit.push({ s: LED, w: 1.9, op: 0.95, d: frontAll }, { s: LED, w: 1.2, op: 0.42, d: backAll, detail: true });
      lit.push({ s: LED, w: 1.2, op: 0.7, d: edge(-1) + edge(1) });
      lit.push({ f: { lin: [[0, '@led.1', 0.12], [0.5, '@led.2', 0.18], [1, '@led.3', 0.1]], x1: 0, y1: 0, x2: 0, y2: -H }, d: poly(side(0, H, -1, 0).concat(side(0, H, 1, 0).reverse())) });
      lit.push({ f: '@ring', d: rect(-wt - 1.5, -H - 4, 2 * wt + 3, 2.6), op: 0.9 }, { s: '@lightW', w: 1.2, op: 0.8, d: 'M0 -464V-598' });
      lit.push({ f: { rad: [[0, '@beacon', 0.75], [1, '@beacon', 0]], cx: 0, cy: -600.5, r: 6 }, d: ell(0, -600.5, 6, 6) }, ['@beacon', ell(0, -600.5, 1.6, 1.6)]);
      return { body, lit };
    },
  });
})();
