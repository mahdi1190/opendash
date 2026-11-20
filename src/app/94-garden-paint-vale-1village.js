/* Painted vale: Fleetwater village's fields (the hand-authored layout, 2.74; see 94-garden-paint-vale-0kit.js).
 * The village's 31 sections are grouped into ten fields (presentation.fields in the layout). Land that is not yours
 * yet is never ringed with a fence here: each field wears its own edge where it meets ground you can walk on
 *   Wren's garden: a clipped box hedge and a wicket gate      the allotment slope: long grass in strips and a field gate
 *   the orchard: a hawthorn hedge by the road, long grass and young trees      the poppy meadow: uncut meadow, a mown edge
 *   the shore wood: bracken under the trees      the Mere bank: reeds      the glasshouse garden: an old brick wall
 *   the bridge plot: a hedge and a stile      the lighthouse garden: a dry-stone wall
 * with one gate per field, and the sign with what it needs (its level, or its price once you have the level) at that
 * gate. The edge follows the locked cells (rounded: a run of steps becomes one easy line), because that is where the
 * feet stop; it follows the garden too: land you open loses its edge and is pegged out with string instead. The green's
 * own borders and the well green are yours from the start: kerbed planters on the lawn. The great lime stands on the green.
 * Ground paint only (and one standing tree): cells, walking and saved rows are untouched.
 * Speed: every piece is placed by where it is (a seeded generator per sample or per tile), so a ground chunk paints
 * only what lies in it and the chunks still meet without a seam. A field's outline is worked out once per state. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const data = () => (typeof gardenIslandData === 'function' ? gardenIslandData() : null);
  const fields = () => { try { return (data().presentation || {}).fields || []; } catch (e) { return []; } };
  let secSet = null, cellField = null; const memo = new Map();
  const RANK = { hedge: 6, wall: 5, 'hedge-road': 4, stile: 4, hurdle: 3, drystone: 3, bracken: 2, heather: 2, reeds: 2, 'long-grass': 1, meadow: 1, kerb: 0 };
  const fieldOfCell = () => { if (!cellField) { cellField = new Map(); for (const f of fields()) for (const s of f.sections) for (const c of cellsOf(s)) cellField.set(c[0] + ',' + c[1], f); } return cellField; };
  /** A section of a village field: it wears its field's edge, so the valley's fences leave it alone. */
  V.villageSection = id => { if (!secSet) secSet = new Set(fields().flatMap(f => f.sections)); return secSet.has(id); };
  const level = () => { try { return gardenModel().level.level; } catch (e) { return 1; } };
  const lockedAt = (x, y, lv) => { try { return String(gardenAreaAt(x, y, lv)).startsWith('locked:'); } catch (e) { return false; } };
  const cellsOf = id => { try { return data().sectionCells[id] || []; } catch (e) { return []; } };
  const rowOf = id => (typeof gardenLandRow === 'function' ? gardenLandRow(id) : null);
  const SOIL = new Set(['bed', 'patch', 'veg', 'rich', 'herb', 'berry']);
  // the ground re-bakes when a field section opens, or when you reach its level (the sign turns from level to price)
  V.groundSigs.push(() => { if (typeof gardenAreaAt !== 'function') return ''; const lv = level(); let h = 7; for (const f of fields()) for (const s of f.sections) { const c = cellsOf(s)[0]; if (!c) continue; const row = rowOf(s); h = (Math.imul(h, 31) + (lockedAt(c[0], c[1], lv) ? 3 : 1) + (row && lv >= (row.lv || 0) ? 7 : 0)) >>> 0; } return '|vl' + h; });
  const rngAt = (q, salt) => KIT().rng(KIT().hash(Math.round(q.x * 4), Math.round(q.y * 4), salt) | 1);
  const inBox = (q, cb, up) => q.x > cb[0] - 18 && q.x < cb[2] + 18 && q.y > cb[1] - 6 && q.y < cb[3] + (up || 30);

  /** The outline of a set of cells: closed loops of cell corners, clockwise round the cells (so the cells are on the right). */
  function outline(cells) {
    const has = new Set(cells.map(c => c[0] + ',' + c[1])), next = new Map();
    const edge = (x0, y0, x1, y1) => { const k = x0 + ',' + y0; let a = next.get(k); if (!a) next.set(k, a = []); a.push([x1, y1]); };
    for (const [x, y] of cells) {
      if (!has.has(x + ',' + (y - 1))) edge(x, y, x + 1, y);
      if (!has.has((x + 1) + ',' + y)) edge(x + 1, y, x + 1, y + 1);
      if (!has.has(x + ',' + (y + 1))) edge(x + 1, y + 1, x, y + 1);
      if (!has.has((x - 1) + ',' + y)) edge(x, y + 1, x, y);
    }
    const loops = [];
    for (const [k0, outs] of next) while (outs.length) {
      const start = k0.split(',').map(Number), loop = [start]; let cur = start, to = outs.pop(), dir = [to[0] - cur[0], to[1] - cur[1]];
      for (let guard = 0; guard < 6000; guard++) {
        cur = to; if (cur[0] === start[0] && cur[1] === start[1]) break; loop.push(cur);
        const o = next.get(cur[0] + ',' + cur[1]); if (!o || !o.length) break;
        // where two pieces touch at a corner keep to the right, so they stay two loops
        let pick = 0; if (o.length > 1) pick = Math.max(0, o.findIndex(q => q[0] - cur[0] === -dir[1] && q[1] - cur[1] === dir[0]));
        to = o.splice(pick, 1)[0]; dir = [to[0] - cur[0], to[1] - cur[1]];
      }
      if (loop.length > 3) loops.push(loop);
    }
    return loops.map(l => l.filter((p, i) => { const a = l[(i - 1 + l.length) % l.length], b = l[(i + 1) % l.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); }));
  }
  /** Corners cut three times: a rounded outline that stays within a third of a cell of the cells' own edge, and a run of
   * one-cell steps becomes one easy slanting line (no staircase, no ruled rectangle). */
  function soften(loop, cut, first) { let p = loop; for (let k = 0; k < 3; k++) { const o = [], c = cut / (k * 1.2 + 1); for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = Math.min(c, L * (k ? .3 : first || .42)) / L; o.push({ x: a.x + (b.x - a.x) * d, y: a.y + (b.y - a.y) * d }, { x: b.x - (b.x - a.x) * d, y: b.y - (b.y - a.y) * d }); } p = o; } return p; }
  /** The same loop with a point every few px, each moved a little across the line by where it is: grown, not ruled. */
  function wander(loop, amp) { const out = []; for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < .01) continue; const n = Math.max(1, Math.round(L / 9)), nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; for (let j = 0; j < n; j++) { const t = j / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, w = (Math.sin(x * .071 + y * .043) + Math.sin(x * .029 - y * .083 + 1.7) * .8 + Math.sin(x * .19 + y * .13 + .6) * .35) * amp * .5; out.push({ x: x + nx * w, y: y + ny * w * .7 }); } } return out; }
  const SOFT = new Set(['long-grass', 'meadow', 'reeds', 'bracken', 'heather', 'hedge-road', 'stile']);
  const ROPED = new Set(['long-grass', 'meadow', 'hedge-road', 'stile', 'reeds', 'heather']);   // (growth too low or too thin to read as where walking stops)
  const pathOf = loops => { const p = new Path2D(); for (const l of loops) { p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };
  const inPoly = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; };

  /* ---------- how each field's edge and ground are drawn ---------- */
  const leafTones = season => season === 'autumn' ? ['#4e5a2a', '#66702e', '#8a8438', '#a8763a'] : season === 'winter' ? ['#46503a', '#58624a', '#6e785c', '#7c7460'] : season === 'spring' ? ['#3a6630', '#4e823a', '#6ea24c', '#8cba60'] : ['#345c2c', '#467436', '#5e9044', '#7aa858'];
  const strawTones = season => season === 'winter' ? ['#8e8a6a', '#a8a480', '#c2be9c'] : season === 'autumn' ? ['#94843e', '#b8a24e', '#d6c06a'] : season === 'spring' ? ['#7c9a48', '#96b25a', '#b8cc78'] : ['#8a9a44', '#a8b454', '#cdc878'];
  // A hedge, a wall: a row of short upright pieces, far ones first, each with a shaded foot, a body and a lit top, so
  // the whole reads as one raised edge that follows any line. o: { w, h, body:[cols], top:[cols], rag, jit, round, dab }
  function raised(B, run, o) {
    const s = run.slice().sort((a, b) => a.y - b.y);
    for (const q of s) B.f(B.ell(q.x + 1.6, q.y + 1.2, o.w * .62, 2.3), '#22301a', .2);
    for (const q of s) {
      const r = rngAt(q, 11), w = o.w * (1 + (r() - .5) * (o.rag || 0)), h = o.h * (1 + (r() - .5) * (o.rag || 0)), x = q.x + (r() - .5) * (o.jit || 0), y = q.y;
      B.f(B.rr(x - w / 2, y - h, w, h + 1, Math.min(o.round == null ? 3 : o.round, w / 2)), o.body[Math.floor(r() * o.body.length)]);
      B.f(B.rr(x - w / 2, y - h, w * .34, h + 1, 1.5), o.lit || o.top[0], .28);
      B.f(B.ell(x - .5, y - h + 1.6, w * .5, 2.4), o.top[Math.floor(r() * o.top.length)], .95);
      if (o.dab) o.dab(B, r, x, y - h, w);
    }
  }
  const STYLE = {
    // Wren's garden: clipped box, evergreen, neat and square-topped
    hedge: (B, run, C) => { const t = C.season === 'winter' ? ['#2e4a2c', '#3c5c36', '#527448', '#6a8a5c'] : ['#2a4c26', '#386030', '#4e7c3c', '#6c9a4e']; raised(B, run, { w: 9.5, h: 11, body: [t[0], t[0], t[1]], top: [t[2], t[2], t[3]], lit: t[3], round: 3.2, dab: (B2, r2, x, y, w) => { if (r2() < .5) B2.f(B2.circ(x + (r2() - .5) * w * .7, y + 1.5 + r2() * 2, .9), t[3], .7); } }); },
    // the orchard's roadside and the bridge plot: hawthorn, shaggier, haws in autumn and may in spring
    'hedge-road': (B, run, C) => { const t = leafTones(C.season), berry = C.season === 'autumn' ? '#b03a2a' : C.season === 'spring' ? '#f4f0e4' : null; raised(B, run, { w: 11, h: 12.5, rag: .34, jit: 1.6, body: [t[0], t[1], t[0]], top: [t[2], t[3], t[1]], lit: t[3], round: 4.6, dab: (B2, r2, x, y, w) => { B2.f(B2.blob(r2, x + (r2() - .5) * 3, y + 1, w * .46, 2.6, 6, .5), t[2 + (r2() < .4 ? 1 : 0)], .85); if (berry && r2() < .45) B2.f(B2.circ(x + (r2() - .5) * w * .7, y + 3 + r2() * 4, 1), berry, .9); } }); },
    stile: (B, run, C) => STYLE['hedge-road'](B, run, C),
    // the lighthouse garden: a low dry-stone wall, grey and lichened
    drystone: (B, run) => { raised(B, run, { w: 8.4, h: 8.5, rag: .3, jit: .8, body: ['#8e8678', '#a8a090', '#7a7366', '#9a9282'], top: ['#bdb5a3', '#cfc8b6', '#b0a896'], lit: '#d8d2c2', round: 2.6, dab: (B2, r2, x, y, w) => { if (r2() < .16) B2.f(B2.blob(r2, x, y + 2, 2.6, 1.3, 6, .5), '#a8b06a', .75); B2.s(`M${x - w / 2} ${y + 4.4}h${w}`, '#5e584c', .7, .4); } }); },
    // the glasshouse garden: an old brick wall, tumbled in a place or two
    wall: (B, run) => {
      const stands = q => Math.sin(q.i * .09 + q.x * .011 + q.y * .017) > -.9, keep = run.filter(stands);
      raised(B, keep, { w: 8.8, h: 11.5, rag: .08, body: ['#8a5642', '#7c4c3a', '#96604a', '#845040'], top: ['#a8806a', '#9c7460', '#b08c74'], lit: '#b89078', round: 1.2, dab: (B2, r2, x, y, w) => { B2.s(`M${x - w / 2} ${y + 4}h${w}M${x - w / 2} ${y + 7.6}h${w}`, '#cdb8a0', .55, .4); if (r2() < .2) B2.f(B2.blob(r2, x, y + 1 + r2() * 5, 3.4, 2, 6, .5), r2() < .5 ? '#5e7a3e' : '#7d8f4e', .85); } });
      for (const q of run) if (!stands(q)) { const r = rngAt(q, 13); if (r() < .4) B.f(B.rr(q.x - 3 + (r() - .5) * 6, q.y - 2.5 + (r() - .5) * 4, 5.4, 3, 1), r() < .5 ? '#8a5642' : '#7c4c3a', .9); }   // fallen bricks in the gaps
    },
    // long grass: tall blades and seed heads standing thick at the edge
    'long-grass': (B, run, C, o) => {
      const st = strawTones(C.season), lo = C.P.lawnLo, s = run.slice().sort((a, b) => a.y - b.y), tall = (o && o.tall) || 1;
      for (const q of s) B.f(B.ell(q.x + 1, q.y + .6, 5.5, 1.9), '#2a3a1c', .22);
      for (const q of s) { const r = rngAt(q, 17);
        for (let k = 0; k < 4; k++) {
          const x = q.x + (r() - .5) * 7, y = q.y + (r() - .5) * 2.6, h = (9 + r() * 8) * tall, lean = (r() - .5) * 5;
          B.s(`M${x} ${y}q${lean * .3} ${-h * .6} ${lean} ${-h}`, k === 0 ? '#566e30' : k === 1 ? lo : st[Math.floor(r() * st.length)], 1.15, .92);
          if (r() < .3) B.f(B.ell(x + lean, y - h - 1, 1, 2.1), st[2], .95);
        }
        if (o && o.flowers && r() < .5) B.f(B.circ(q.x + (r() - .5) * 8, q.y - 5 - r() * 9, 1.5 + r() * .6), o.flowers[Math.floor(r() * o.flowers.length)], .95);
      }
    },
    meadow: (B, run, C) => STYLE['long-grass'](B, run, C, { flowers: C.season === 'winter' ? null : C.season === 'autumn' ? ['#e8dcc0', '#d8a040', '#c85a3a'] : ['#d8402e', '#e8553a', '#f4f0e0', '#f0d24a', '#d8402e'] }),
    // the shore wood: bracken, waist high
    bracken: (B, run, C) => {
      const col = C.season === 'autumn' ? ['#a8703a', '#c8904a', '#8a5a30'] : C.season === 'winter' ? ['#8a6a4a', '#a08260', '#6e5440'] : ['#3f6a32', '#5a8a42', '#7aa255'], s = run.slice().sort((a, b) => a.y - b.y);
      for (const q of s) B.f(B.ell(q.x + 1, q.y + .8, 7, 2.2), '#22301a', .22);
      const alt = C.season === 'autumn' ? ['#7e8440', '#9a9a4a', '#66703a'] : C.season === 'winter' ? ['#7a705c', '#8e8468', '#5e5648'] : ['#557a34', '#86a84e', '#a2b860'];
      for (const q of s) { const r = rngAt(q, 19), big = (q.big || 1) * (.8 + r() * .55), x0 = q.x + (r() - .5) * 5, y0 = q.y + (r() - .5) * 3, pal = r() < .32 ? alt : col; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .5 + (r() - .5) * .3, l = (8 + r() * 7) * big, ex = x0 + Math.cos(a) * l * 1.25, ey = y0 + Math.sin(a) * l; B.s(`M${x0} ${y0}Q${(x0 + ex) / 2} ${ey - 3} ${ex} ${ey}`, pal[k % pal.length], 2.1, .92); B.s(`M${(x0 + ex) / 2} ${(y0 + ey) / 2 - 2}l${(ex - x0) * .25} ${-2.4}`, pal[(k + 1) % pal.length], 1, .7); } }
    },
    // (fix round 1) the High orchard's thyme terrace: low cushions of heather and wild thyme, purple in summer, rust in
    // autumn, with a sprig of gorse here and there (green bracken there read as any other field)
    heather: (B, run, C) => {
      const sea = C.season, bloom = sea === 'summer' ? ['#a86aa8', '#c48ac0', '#8a4f8e'] : sea === 'autumn' ? ['#8a5a62', '#a8705a', '#6e4a52'] : sea === 'winter' ? ['#6e5a5e', '#7e6a6a', '#5a4a50'] : ['#7a5a7e', '#946e94', '#5f4a62'];
      const leaf = sea === 'winter' ? ['#5e5a48', '#6e6a54'] : ['#4f5e3a', '#62724a'], s = run.slice().sort((a, b) => a.y - b.y);
      for (const q of s) B.f(B.ell(q.x + 1, q.y + 1, 8, 2.6), '#22301a', .2);
      for (const q of s) { const r = rngAt(q, 29), big = (q.big || 1) * (.8 + r() * .5), x0 = q.x + (r() - .5) * 6, y0 = q.y + (r() - .5) * 3;
        B.f(B.ell(x0, y0 - 3 * big, 8 * big, 4.4 * big), leaf[r() < .5 ? 0 : 1], .95);
        for (let k = 0; k < 9; k++) { const a = r() * Math.PI, d = r(); B.f(B.circ(x0 + Math.cos(a) * 7 * big * d, y0 - 3 * big - Math.sin(a) * 4.4 * big * d - 1, (1.3 + r() * 1.1) * big), bloom[k % 3], .95); }
        if (r() < .14 && sea !== 'winter') { for (let k = 0; k < 5; k++) B.s(`M${x0 + 6} ${y0}l${(k - 2) * 1.6} ${-8 - r() * 5}`, '#4a5e2a', 1.1, .9); if (sea === 'spring' || sea === 'summer') for (let k = 0; k < 4; k++) B.f(B.circ(x0 + 6 + (r() - .5) * 7, y0 - 7 - r() * 6, 1.4), '#f0c832', .95); } }
    },
    // the Mere bank: reeds and reedmace
    reeds: (B, run, C) => {
      const col = C.season === 'winter' ? ['#a89a6a', '#c0b282'] : C.season === 'autumn' ? ['#8a8a40', '#b4a050'] : ['#557a3a', '#7aa04a'], s = run.slice().sort((a, b) => a.y - b.y);
      for (const q of s) B.f(B.ell(q.x + 1, q.y + .6, 5, 1.7), '#22301a', .2);
      for (const q of s) { const r = rngAt(q, 23); for (let k = 0; k < 4; k++) { const x = q.x + (r() - .5) * 7, h = 13 + r() * 10, lean = (r() - .5) * 4; B.s(`M${x} ${q.y}q${lean * .3} ${-h * .6} ${lean} ${-h}`, col[k % 2], 1.2, .95); if (r() < .3) B.f(B.rr(x + lean - 1.1, q.y - h - 4, 2.2, 5.5, 1.1), '#6e4a2c', .95); } }
    },
    kerb: () => {},
    // (final review, round 3) where a field of soft growth stops the feet, a line of stakes with a rope slung between them, knee
    // high: the long grass alone read as lawn and the walk stopped at a wall you could not see (rule 15). A stake every eleventh
    // point of the edge (by its place along the whole edge, so the chunks meet), the rope sagging between them
    rope: (B, run, C) => {
      const N = 11, H = 10.5, wood = C.season === 'winter' ? ['#6a5a48', '#8a7862'] : ['#6e5638', '#94784e'], rope = C.season === 'winter' ? '#b8ab90' : '#c8b48a';
      const at = q => { const t = (((q.i % N) + N) % N) / N; return q.y - H + 2.6 * 4 * t * (1 - t); };
      for (let k = 1; k < run.length; k++) { const a = run[k - 1], b = run[k]; if (b.i !== a.i + 1) continue; B.s(`M${a.x} ${at(a) + .9}L${b.x} ${at(b) + .9}`, '#2a2418', 1.5, .18).s(`M${a.x} ${at(a)}L${b.x} ${at(b)}`, rope, 1.15, .95); }
      for (const q of run) if (q.i % N === 0) { B.f(B.ell(q.x + 1.2, q.y + .8, 3.2, 1.2), '#22301a', .28).f(B.rr(q.x - 1.3, q.y - H - 3, 2.6, H + 3.6, 1), wood[0]).f(B.rect(q.x - 1.3, q.y - H - 2.5, 1, H + 2.6), wood[1], .8).f(B.ell(q.x, q.y - H - 3, 1.3, .6), wood[1]); B.s(`M${q.x - 1.4} ${q.y - H + .3}h2.8`, rope, 1.2, .95); }
    },
    // (village fix round 3) the rough edge of a field away from its front: its own growth thinning out into the lawn in
    // clumps and drifts (long grass, seed heads, a bramble or a shrub here and there, a stone by the wall), never one even
    // band, so the line where the feet stop is the edge of the rough ground and not a drawn ring
    // (round 3, Millwater valley) a hazel hurdle: woven panels on stakes a little over knee high, standing all along a shut
    // field's side where you walk, so the stop is plain to see (rule 15); its foot grown in with grass and a poppy or two
    hurdle: (B, run, C) => {
      const s = run.slice().sort((a, b) => a.y - b.y), wood = C.season === 'winter' ? ['#6a5a48', '#84725a', '#9c8a6e', '#4e4236'] : ['#6e5638', '#8a6c46', '#a8875a', '#4a3a26'];
      for (const q of s) B.f(B.ell(q.x + 1.4, q.y + 1, 4.2, 1.8), '#22301a', .2);
      for (const q of s) {
        const steep = Math.abs(q.ty) > Math.abs(q.tx) * 1.3, h = steep ? 13 : 19, r = rngAt(q, 41), w = steep ? 5.4 : 5.6;
        B.f(B.rect(q.x - w / 2, q.y - h, w, h + .5), wood[0]);
        for (let y = q.y - h + 1.5, k = 0; y < q.y - 1; y += 3, k++) B.f(B.rr(q.x - w / 2 - .3, y + ((q.i + k) & 1) * .7, w + .6, 1.9, .9), wood[1 + ((q.i + k) & 1)], .95);
        if (q.i % 6 === 0) B.f(B.rr(q.x - 1.2, q.y - h - 3, 2.4, h + 3.5, .8), wood[3]).f(B.rect(q.x - 1.2, q.y - h - 3, .9, h + 3), wood[2], .6);
        if (r() < .55) for (let j = 0; j < 3; j++) B.s(`M${q.x + (r() - .5) * 5} ${q.y + .8}q${(r() - .5) * 2} -3 ${(r() - .5) * 3} -${3 + r() * 4}`, C.season === 'winter' ? '#8a9070' : '#5e8a3e', 1, .9);
        if (C.season === 'summer' && r() < .08) B.f(B.circ(q.x + (r() - .5) * 4, q.y - 3 - r() * 3, 1.3), '#d8402e', .95);
      }
    },
    margin: (B, run, C, kind) => {
      const st = strawTones(C.season), lt = leafTones(C.season), lo = C.P.lawnLo, s = run.slice().sort((a, b) => a.y - b.y);
      const thick = q => { const x = q.ox || q.x, y = q.oy || q.y; return .5 + .5 * (Math.sin(x * .037 + y * .051) * .6 + Math.sin(x * .013 - y * .029 + 2.1) * .4); };
      const berry = C.season === 'autumn' ? '#7a2a4a' : C.season === 'summer' ? '#3a2a4a' : null, bloom = C.season === 'winter' ? null : C.season === 'autumn' ? ['#e8dcc0', '#d8a040', '#b86a8a'] : ['#f4f0e0', '#f0d24a', '#d88aa8', '#9a7ac8'];
      for (const q of s) { const k = thick(q); if (k > .25) B.f(B.ell(q.x + 1, q.y + .6, 3 + k * 4, 1.6), '#2a3a1c', .1 + k * .1); }
      for (const q of s) {
        const r = rngAt(q, 31), k = thick(q);
        if (k < .22) { if (r() < .5) B.s(`M${q.x} ${q.y}q.4 -2.4 .8 -4`, lo, 1, .7); continue; }   // a gap: the grass just shorter here
        const n = k > .6 ? 4 : k > .4 ? 3 : 2;
        for (let j = 0; j < n; j++) { const x = q.x + (r() - .5) * 8, y = q.y + (r() - .5) * 3.4, h = (4 + r() * 7) * (.55 + k * .75), lean = (r() - .5) * 5;
          B.s(`M${x} ${y}q${lean * .3} ${-h * .6} ${lean} ${-h}`, j === 0 ? '#566e30' : j === 1 ? lo : st[Math.floor(r() * st.length)], 1.1, .9);
          if (r() < .22 * k) B.f(B.ell(x + lean, y - h - 1, .9, 1.9), st[2], .95); }
        if (bloom && r() < .1) B.f(B.circ(q.x + (r() - .5) * 8, q.y - 3 - r() * 6, 1.3), bloom[Math.floor(r() * bloom.length)], .95);
        if (k > .78 && r() < .022) {   // a bramble or a shrub where the growth is thickest (now and then: a run of them read as hedge)
          const w = 7 + r() * 6, h = 7 + r() * 5, x = q.x + (r() - .5) * 4, y = q.y + 1;
          B.f(B.ell(x + 2, y + .6, w * 1.1, 2.4), '#22301a', .2).f(B.blob(r, x, y - h * .45, w, h * .55, 8, .45), lt[0], .95).f(B.blob(r, x - 1.2, y - h * .62, w * .72, h * .4, 7, .45), lt[1], .95).f(B.blob(r, x - 2.2, y - h * .78, w * .42, h * .22, 6, .4), lt[2], .8);
          if (berry) for (let j = 0; j < 4; j++) B.f(B.circ(x + (r() - .5) * w * 1.2, y - h * .5 + (r() - .5) * h * .5, .9), berry, .9);
        }
        if ((kind === 'wall' || kind === 'drystone') && k > .55 && r() < .05) { const x = q.x + (r() - .5) * 6, y = q.y; B.f(B.ell(x + 1, y + .8, 4.6, 1.5), '#22301a', .22).f(B.blob(r, x, y - 2, 4.2, 2.6, 7, .4), kind === 'wall' ? '#8a5642' : '#9a9282', .95).f(B.blob(r, x - .8, y - 3, 2.4, 1.2, 6, .4), kind === 'wall' ? '#a8806a' : '#bdb5a3', .9); }   // a fallen stone of the old wall
      }
    },
  };
  // What grows inside a field that is not yours yet (clipped to the field): the same country as its edge, a little wilder.
  // Laid tile by tile (60 px tiles on one grid, each with its own seed), only the tiles this chunk touches.
  // (village fix round 2) tame: land of the field that is yours now. It keeps its field's character, tended: the orchard its
  // young fruit trees, the meadow its flowers, the allotment its canes and old bed lines, the wood its bracken, the walled
  // garden its old beds, all on grass cut short (it went to plain striped lawn, and the orchard lost its trees)
  function fill(B, C, f, bb, cb, has, loops, tame) {
    const P = C.P, season = C.season, cw = C.L.cw, ch = C.L.ch, sky = C.W.sky, st = strawTones(season), lt = leafTones(season), edge = f.edge;
    const box = [Math.max(bb[0], cb[0] - 4), Math.max(bb[1], cb[1] - 4), Math.min(bb[2], cb[2] + 4), Math.min(bb[3], cb[3] + 4)]; if (box[2] <= box[0] || box[3] <= box[1]) return;
    const inCell = (x, y) => has.has(Math.floor(x / cw) + ',' + Math.floor((y - sky) / ch)), inF = loops ? (x, y) => { if (!inCell(x, y) && !inCell(x + 14, y) && !inCell(x - 14, y) && !inCell(x, y + 10) && !inCell(x, y - 10)) return false; for (const l of loops) if (inPoly(x, y, l)) return true; return false; } : inCell;
    const wash = tame ? (edge === 'bracken' ? [P.floor, .4] : edge === 'reeds' ? ['#7e8a52', .3] : edge === 'meadow' ? [st[1], .3] : [P.lawnHi, .3])
      : edge === 'heather' ? ['#6e5e58', .5] : edge === 'bracken' ? [P.floor, .78] : edge === 'reeds' ? ['#7e8a52', .7] : edge === 'meadow' ? [st[1], .6] : edge === 'long-grass' || edge === 'hedge-road' ? [st[0], .5] : [P.lawnLo, .5];
    B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), P.lawn).f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), wash[0], wash[1]);
    const T = 60, tall = !tame && (edge === 'meadow' || edge === 'long-grass' || edge === 'hedge-road'), salt = KIT().hashStr('fill|' + f.id) & 0xffff;
    // (Cloudbreak's shut fields, vale-mountains.json kind: the rock gardens are slabs and wind-cut stones in thin turf, the
    // mist meadow is bog, peat pools and cotton grass; not the lush meadow every other field has)
    if (!tame && f.kind === 'rock') { B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), '#a8a47c', .45);
      KIT().tiles(box, 54, 30, salt + 9, (tx, ty, r) => { for (let k = 0; k < 4; k++) { const x = tx + r() * 54, y = ty + r() * 54; if (!inF(x, y)) continue; const w = 12 + r() * 20, h = w * (.36 + r() * .14), upright = r() < .18;
        if (upright) { B.f(B.ell(x + 3, y + 1, w * .45, 3), '#3e3a32', .3).f(B.poly([[x - w * .22, y], [x - w * .16, y - w * .9], [x + w * .05, y - w * 1.05], [x + w * .2, y - w * .7], [x + w * .24, y]]), '#a59e8c').f(B.poly([[x - w * .16, y - w * .9], [x + w * .05, y - w * 1.05], [x, y]]), '#c8c1ae', .6); continue; }
        B.f(B.blob(r, x + 1.5, y + 2, w, h, 7, .3), '#3e3a32', .35).f(B.blob(r, x, y, w, h, 7, .3), ['#b4ad9c', '#a59e8c', '#c2bba8', '#9a9484'][Math.floor(r() * 4)]).f(B.blob(r, x - w * .2, y - h * .3, w * .5, h * .35, 6, .4), '#e4e0d0', .35);
        if (r() < .35) B.f(B.ell(x + (r() - .5) * w * .6, y + (r() - .5) * h * .4, 2.6, 1.4), '#c9c48a', .75); } }); }
    if (!tame && f.kind === 'bog') { B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), '#6e7046', .5);
      KIT().tiles(box, 60, 30, salt + 11, (tx, ty, r) => { for (let k = 0; k < 2; k++) { const x = tx + r() * 60, y = ty + r() * 60; if (!inF(x, y)) continue; const w = 12 + r() * 16;
        B.f(B.blob(r, x, y + 1, w + 3, w * .36 + 2, 8, .4), '#4a4434', .7).f(B.blob(r, x, y, w, w * .32, 8, .4), season === 'winter' ? '#c8d4d8' : '#5e7a7c').f(B.ell(x - w * .3, y - w * .08, w * .3, 1.2), '#b8d0d0', .5); }
        for (let k = 0; k < 6; k++) { const x = tx + r() * 60, y = ty + r() * 60; if (!inF(x, y)) continue; B.f(B.blob(r, x, y, 5 + r() * 5, 2, 6, .5), ['#9a8a3a', '#b0703a', '#8a9a3e'][Math.floor(r() * 3)], .7); if (season !== 'winter' && r() < .6) { B.s(`M${x} ${y}v-7`, '#7d8f4e', .8, .9); B.f(B.circ(x, y - 8, 1.7), '#f6f4ec', .95); } } }); }
    // light and shade in soft drifts, so no field is one flat colour (from the tiles round about too: a drift is wide)
    KIT().tiles(box, T, 46, salt + 1, (tx, ty, r) => { for (let k = 0; k < 2; k++) { const x = tx + r() * T, y = ty + r() * T, rx = 26 + r() * 30, ry = 9 + r() * 10, lift = r() < .5, a = .12 + r() * .08; if (inF(x, y)) B.f(B.blob(r, x, y, rx, ry, 8, .5), lift ? P.lawnHi : '#3e5a2a', a); } });
    // (fix round 1) the thyme terrace: heather and thyme cushions all through it, close set, with bare stony turf between
    if (edge === 'heather') KIT().tiles(box, 22, 52, salt + 3, (tx, ty, r) => { for (let k = 0; k < 2; k++) { const x = tx + r() * 22, y = ty + r() * 22; if (inF(x, y) && r() < (tame ? .45 : .9)) STYLE.heather(B, [{ x, y, big: .7 + r() * .6 }], C); } });
    if (edge === 'long-grass') {
      // the slope's strips: long beds lying along the contour, gone back to grass, still showing in the sward
      const x0 = Math.floor((box[0] - 30) / 24) * 24;
      // (round 3: the old bed lines further apart, fainter and broken where the grass has closed over them, so the field
      // reads as an allotment gone back to grass and not as a striped block)
      for (let k = 0, y = bb[1] - 4; y < bb[3] + 8; y += 27, k++) { if (y < box[1] - 12 || y > box[3] + 12) continue; let pts = []; const flush = () => { if (pts.length > 2) V.strokePts(B, pts, k % 2 ? '#5a6e30' : st[2], 6, .1); pts = []; };
        for (let x = x0; x <= box[2] + 30; x += 24) { if (((Math.imul(x * 31 + y * 17 + salt, 2654435761) >>> 0) % 7) === 0) { flush(); continue; } pts.push({ x, y: y + Math.sin(x * .011 + y * .004) * 6 }); } flush(); }
    }
    // (round 3) the shut allotment is somebody's old plot gone to grass, not an empty block: bean-cane wigwams still
    // standing, a rhubarb clump (a forcing pot over it in winter), a pail left upside down; each seated in the grass
    // (round 3) the shut orchard reads as an orchard from across the village: young fruit trees on stakes in loose rows,
    // knee to shoulder high beside you, fruit on them in summer and autumn, bare in winter; each wholly inside the field's
    // outline (painted into the ground, so nothing of it may stand where you can walk behind it)
    const orchard = () => { if (edge === 'hedge-road') KIT().tiles(box, 50, 60, salt + 7, (tx, ty, r) => {
      const x = tx + 8 + r() * 34, y = ty + 10 + r() * 32, h = 32 + r() * 10, cr = h * .3, cy = y - h * .7; if (r() < .1 || !inF(x, y) || !inF(x, y - h) || !inF(x - cr, cy) || !inF(x + cr, cy)) return;
      B.f(B.ell(x + 7, y + 2, cr * 1.15, 3.6), '#22301a', .16).f(B.ell(x + 1, y + .8, 5, 1.6), '#22301a', .24);
      const lean = (r() - .5) * 3; B.s('M' + x + ' ' + y + 'q' + (lean * .4) + ' ' + (-h * .3) + ' ' + lean + ' ' + (-h * .62), '#5e4c36', 2.2, .98).s('M' + (x - .6) + ' ' + y + 'q' + (lean * .4) + ' ' + (-h * .3) + ' ' + lean + ' ' + (-h * .6), '#8a7058', .8, .7);
      B.f(B.rect(x + 3.4, y - h * .5, 1.5, h * .5), '#9a8462').s('M' + (x + 3.4) + ' ' + (y - h * .36) + 'L' + (x + lean * .5) + ' ' + (y - h * .38), '#cbb88a', .9, .9);
      if (season === 'winter') { for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * .42, L = cr * (.7 + r() * .4); B.s('M' + (x + lean) + ' ' + (y - h * .6) + 'l' + (Math.cos(a) * L) + ' ' + (Math.sin(a) * L * .9), '#6a5640', 1.1, .9); } }
      else { const tones = [lt[0], lt[1], lt[2], lt[3] || lt[2]];
        for (let j = 0; j < 9; j++) { const a = r() * Math.PI * 2, d = r() * .55; B.f(B.blob(r, x + lean + Math.cos(a) * cr * d, cy + Math.sin(a) * cr * .7 * d, cr * (.42 + r() * .2), cr * (.32 + r() * .14), 7, .45), tones[j < 3 ? 0 : j < 7 ? 1 : 2], .95); }
        for (let j = 0; j < 3; j++) B.f(B.blob(r, x + lean - cr * .25 + (r() - .5) * cr * .5, cy - cr * .35 + (r() - .5) * 3, cr * .26, cr * .16, 6, .4), tones[3], .7);
        const fruit = r() < .55 ? '#c8402e' : '#d8b040'; if (season !== 'spring') for (let j = 0; j < 6; j++) B.f(B.circ(x + lean + (r() - .5) * cr * 1.3, cy + (r() - .3) * cr * .8, 1.5), fruit, .95);
        else for (let j = 0; j < 7; j++) B.f(B.circ(x + lean + (r() - .5) * cr * 1.4, cy + (r() - .5) * cr * .9, 1.3), '#f6e8ee', .95); }
      B.tufts(r, x, y + 1, 12, 5, [P.lawnLo, '#566e30', st[1]], 8);
    }); };    const remnants = () => { if (edge === 'long-grass') KIT().tiles(box, 92, 36, salt + 5, (tx, ty, r) => {
      const at = () => [tx + 10 + r() * 72, ty + 10 + r() * 72];
      { const [x, y] = at(); if (r() < .7 && inF(x, y) && inF(x - 9, y) && inF(x + 9, y) && inF(x, y - 30)) {
        const top = [x + (r() - .5) * 2, y - 25 - r() * 4], cane = '#a8875a', dk = '#6a5236';
        B.f(B.ell(x + 2, y + 1, 11, 3), '#22301a', .22);
        for (const [bx, by] of [[-7, -1], [-2.5, 1.6], [3, 1.6], [7.5, -1]]) { const ex = top[0] + (top[0] - (x + bx)) * .12, ey = top[1] - 3; B.s(`M${x + bx} ${y + by}L${ex} ${ey}`, by > 0 ? cane : dk, 1.4, .95); }
        B.f(B.circ(top[0], top[1], 1.4), '#5a4a30', .9);
        const vine = season === 'winter' ? null : season === 'autumn' ? ['#6e5a2a', '#8a7034', '#a8823a'] : [lt[1], lt[2], '#4e6a2e'];
        if (vine) for (let j = 0; j < 14; j++) { const t = .15 + r() * .75, side = [-7, -2.5, 3, 7.5][j % 4], vx = x + side + (top[0] - x - side) * t, vy = y + (top[1] - y) * t; B.f(B.blob(r, vx + (r() - .5) * 2.4, vy, 2 + r() * 1.2, 1.5 + r(), 5, .4), vine[j % 3], .9); }
        if (season === 'summer') for (let j = 0; j < 3; j++) { const t = .3 + r() * .5; B.f(B.circ(x - 3 + r() * 7, y + (top[1] - y) * t, 1.1), '#d8402e', .9); }
        B.tufts(r, x, y + 1, 14, 6, [P.lawnLo, '#566e30', st[1]], 8);
      } }
      { const [x, y] = at(); if (r() < .45 && inF(x, y) && inF(x - 8, y) && inF(x + 8, y) && inF(x, y - 14)) {
        B.f(B.ell(x + 1.5, y + 1, 10, 2.8), '#22301a', .22);
        if (season === 'winter') { B.f(`M${x - 6} ${y}L${x - 5} ${y - 11}Q${x} ${y - 13} ${x + 5} ${y - 11}L${x + 6} ${y}Z`, '#a8583a').f(B.ell(x, y - 11.5, 5.2, 1.6), '#c2704a').f(B.rect(x - 1, y - 14.5, 2, 3), '#8a4a32').f(`M${x - 6} ${y}L${x - 5} ${y - 11}L${x - 3} ${y - 11}L${x - 3.4} ${y}Z`, '#c8784e', .6); }
        else { const leaf = season === 'autumn' ? ['#5e6a2a', '#7a7a32', '#4e5a26'] : ['#3e5a26', '#4e6a2e', '#5e7a34'];
          for (let j = 0; j < 5; j++) { const a = -2.4 + j * .55 + (r() - .5) * .3, lx = x + Math.cos(a) * 6.5, ly = y - 4 + Math.sin(a) * 6; B.s(`M${x + (r() - .5) * 2} ${y}Q${(x + lx) / 2} ${ly + 2} ${lx} ${ly}`, '#a8443a', 1.2, .95); B.f(B.blob(r, lx, ly - 1, 5 + r() * 2, 3.4 + r(), 7, .45), leaf[j % 3], .96).f(B.blob(r, lx - 1, ly - 2, 2.4, 1.4, 5, .4), leaf[2], .5); } }
        B.tufts(r, x, y + 1, 12, 5, [P.lawnLo, '#566e30', st[1]], 7);
      } }
      { const [x, y] = at(); if (r() < .14 && inF(x, y) && inF(x, y - 8)) { B.f(B.ell(x + 1, y + .8, 5, 1.6), '#22301a', .22).f(`M${x - 4} ${y}L${x - 3} ${y - 6}L${x + 3} ${y - 6}L${x + 4} ${y}Z`, '#7a8a90').f(B.ell(x, y - 6, 3, .9), '#9aa8ae').f(`M${x - 4} ${y}L${x - 3} ${y - 6}L${x - 1.6} ${y - 6}L${x - 2.4} ${y}Z`, '#aab8be', .55); B.tufts(r, x, y + 1, 9, 4, [P.lawnLo, st[1]], 6); } }
    }); };
    KIT().tiles(box, T, 14, salt + 2, (tx, ty, r) => {
      const at = () => [tx + r() * T, ty + r() * T];
      if (edge !== 'bracken') for (let k = 0, n = tame ? 14 : tall ? 62 : 32; k < n; k++) { const [x, y] = at(), hh = (tame ? 2.4 : 4) + r() * (tall ? 8 : tame ? 3 : 5), lean = (r() - .5) * 4, t = r(), t2 = r(); if (inF(x, y)) B.s(`M${x} ${y}q${lean * .3} ${-hh * .6} ${lean} ${-hh}`, t < .4 ? P.lawnLo : t < .7 ? '#566e30' : st[Math.floor(t2 * 3)], 1, .8); }
      if (edge === 'meadow' && season !== 'winter') { const fl = season === 'autumn' ? ['#e8dcc0', '#d8a040', '#c85a3a'] : ['#d8402e', '#e8553a', '#f4f0e0', '#f0d24a', '#8ab0e0']; for (let k = 0; k < 24; k++) { const [x, y] = at(), up = 3 + r() * 5, s = 1.3 + r() * .8, c = fl[Math.floor(r() * fl.length)]; if (inF(x, y)) B.f(B.circ(x, y - up, s), c, .95); } }
      if (edge === 'bracken') {
        const leaf = season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c', '#e0b050'] : season === 'winter' ? ['#8a7a5a', '#a0906a', '#6e6450'] : ['#7d8f4e', '#6a7c40', '#94a058', '#8a7a4a'];
        for (let k = 0; k < 50; k++) { const [x, y] = at(), a = 1.6 + r() * 1.6, b = 1 + r() * .8, c = leaf[Math.floor(r() * leaf.length)]; if (inF(x, y)) B.f(B.ell(x, y, a, b), c, .8); }
        // deep bracken all through it (a thicket you cannot see into, not a ring round an empty middle), a foxglove here and there
        // (village fix round 3: in drifts with clearings between them, waist high and no more, a holly or a hazel standing in
        // it here and there: an even block of tall stalks read as a maize field set down in the village)
        const drift = (x, y) => .5 + .5 * Math.sin(x * .021 + y * .034 + 1.3) * Math.cos(x * .013 - y * .027);
        const pts = []; for (let k = 0, n = tame ? 5 : 11; k < n; k++) { const [x, y] = at(), big = (tame ? .55 : .8) + r() * .35; if (drift(x, y) > .38 && inF(x, y) && inF(x, y - 9)) pts.push({ x, y, big }); } STYLE.bracken(B, pts, C);
        if (!tame && r() < .35) { const [x, y] = at(); if (inF(x, y) && inF(x, y - 18) && inF(x - 9, y) && inF(x + 9, y)) { const ev = ['#2e4a2a', '#3c5c34', '#527a40']; B.f(B.ell(x + 3, y + 1, 11, 3), '#22301a', .22).f(B.blob(r, x, y - 9, 10, 9, 8, .4), ev[0]).f(B.blob(r, x - 1.5, y - 12, 7.5, 6.5, 7, .4), ev[1]).f(B.blob(r, x - 3, y - 15, 4, 3, 6, .4), ev[2], .9); if (C.season === 'winter' || C.season === 'autumn') for (let j = 0; j < 4; j++) B.f(B.circ(x + (r() - .5) * 12, y - 6 - r() * 10, 1), '#c8302a', .95); } }
        if (season !== 'winter') for (let k = 0; k < 2; k++) { const [x, y] = at(), h = 15 + r() * 7, bell = season === 'autumn' ? '#b98a6a' : '#c66a9a', go = r() < .45; if (!go || !inF(x, y) || !inF(x, y - 22)) continue; B.s(`M${x} ${y}q1 ${-h * .5} 0 ${-h}`, '#5a6e3a', 1.3, .9); for (let j = 0; j < 5; j++) B.f(B.ell(x + (j % 2 ? 1.5 : -1.5), y - h + j * 2.6, 1.5, 1.9), bell, .92); }
      }
      if (edge === 'reeds') { const pts = []; for (let k = 0; k < 5; k++) { const [x, y] = at(); if (inF(x, y) && inF(x, y - 12)) pts.push({ x, y }); } STYLE.reeds(B, pts, C); for (let k = 0; k < 2; k++) { const [x, y] = at(), w = 8 + r() * 8; if (inF(x, y)) B.f(B.blob(r, x, y, w, 2.4, 7, .5), '#5e7a6a', .35); } }
      if (edge === 'wall') {
        // rough grass all through it, nettles in clumps, the lines of the old beds still showing, a cold frame's bones
        for (let k = 0; k < 34; k++) { const [x, y] = at(), hh = 4 + r() * 7, lean = (r() - .5) * 4, t = r(); if (inF(x, y)) B.s(`M${x} ${y}q${lean * .3} ${-hh * .6} ${lean} ${-hh}`, t < .45 ? '#566e30' : t < .8 ? P.lawnLo : st[Math.floor(t * 3) % 3], 1.1, .8); }
        for (let k = 0; k < 2; k++) { const [x, y] = at(), w = 16 + r() * 14; if (inF(x - w / 2, y) && inF(x + w / 2, y)) B.f(B.rr(x - w / 2, y - 2.6, w, 5.2, 2.4), '#6a5034', .28).f(B.rr(x - w / 2 + 1, y - 1.8, w - 2, 2.2, 1), '#8a6c4a', .22); }
        for (let k = 0; k < (tame ? 0 : 3); k++) { const [x, y] = at(), rx = 8 + r() * 7; if (!inF(x, y) || !inF(x, y - 12)) continue; B.f(B.ell(x + 1, y + 1, rx, 2.6), '#22301a', .2); for (let j = 0; j < 6; j++) { const dx = (r() - .5) * rx * 1.6, hh = 8 + r() * 7; B.s(`M${x + dx} ${y}q${(r() - .5) * 2} ${-hh * .5} ${(r() - .5) * 3} ${-hh}`, lt[1], 1.3, .9); B.f(B.blob(r, x + dx, y - hh * .7, 2.6, 1.6, 5, .4), lt[r() < .5 ? 0 : 2], .9); } }
        for (let k = 0; k < 2; k++) { const [x, y] = at(); if (!inF(x, y) || !inF(x, y - 10)) continue; B.tufts(r, x, y, 12, 6, [lt[1], lt[2], P.lawnLo], 9); if (season !== 'winter') for (let j = 0; j < 3; j++) B.f(B.circ(x + (r() - .5) * 10, y - 6 - r() * 4, 1.2), '#c79ac0', .9); }   // willowherb come up through the old beds
        { const [x, y] = at(); if (inF(x, y) && r() < .7) B.f(B.rr(x, y, 5.4, 3, 1), '#8a5642', .8).f(B.rr(x + 4, y + 2, 4.6, 2.6, 1), '#96604a', .8); }
      }
      if (edge === 'hedge-road') for (let k = 0; k < 1; k++) {   // young trees: whips on stakes (one here and there between the young fruit trees, round 3)
        const [x, y] = at(); if (r() < .25 || !inF(x, y) || !inF(x, y - 14)) continue;
        B.f(B.ell(x + 2, y + 1, 5, 1.6), '#22301a', .22).f(B.rect(x + 2.4, y - 11, 1.3, 11), '#8a7454').s(`M${x} ${y}q${-.6} ${-9} ${.4} ${-17}`, '#5e4c36', 1.3, .95);
        for (let j = 0; j < 5; j++) B.f(B.blob(r, x + (r() - .5) * 8, y - 12 - r() * 8, 2.6, 1.8, 6, .4), lt[1 + Math.floor(r() * 3)], .9);
      }
      if (edge === 'drystone' && season !== 'winter') for (let k = 0; k < 14; k++) { const [x, y] = at(), c = r() < .6 ? '#e0a0b8' : '#f4f0e4'; if (inF(x, y)) B.f(B.circ(x, y, 1.2), c, .9); }   // thrift
      if (edge === 'hedge' || edge === 'stile') {
        const wild = season === 'winter' ? ['#d8d2c4'] : season === 'autumn' ? ['#e8dcc0', '#d8a040', '#b86a8a', '#9a7ac8'] : ['#f4f0e0', '#f0d24a', '#d88aa8', '#9a7ac8', '#e8553a'];
        for (let k = 0; k < 20; k++) { const [x, y] = at(), hh = 5 + r() * 7, lean = (r() - .5) * 4, t = r(); if (inF(x, y)) B.s(`M${x} ${y}q${lean * .3} ${-hh * .6} ${lean} ${-hh}`, t < .5 ? '#566e30' : st[Math.floor(t * 3) % 3], 1.1, .8); }
        for (let k = 0; k < 3; k++) { const [x, y] = at(), n = 5 + Math.floor(r() * 5), rx = 9 + r() * 9, c = wild[Math.floor(r() * wild.length)]; if (!inF(x, y) || !inF(x, y - 8)) continue;
          B.f(B.blob(r, x, y, rx, 4.2, 8, .45), lt[0], .5).f(B.blob(r, x - 1, y - 1.5, rx * .8, 3.2, 7, .45), lt[1], .75).f(B.blob(r, x - 2, y - 2.6, rx * .5, 2, 6, .45), lt[2], .7);
          if (season !== 'winter') for (let j = 0; j < n; j++) B.f(B.circ(x + (r() - .5) * rx * 1.7, y - 2.5 - r() * 4, 1.2 + r() * .6), c, .95); }
        { const [x, y] = at(), go = r() + (tame ? 1 : 0); if (go < .45 && inF(x, y) && inF(x, y - 14)) { for (let j = 0; j < 3; j++) { const dx = (j - 1) * 2.4 + (r() - .5), hh = 10 + r() * 6; B.s(`M${x + dx} ${y}q${dx * .3} ${-hh * .5} ${dx * .8} ${-hh}`, '#5a6e3a', 1.3, .9); B.f(B.ell(x + dx * 1.8, y - hh - 1.5, 1.3, 3), season === 'winter' ? '#7a6a52' : '#8a5a3a', .9); } B.f(B.blob(r, x, y, 7, 2.6, 7, .4), lt[1], .8); } }   // a clump of dock gone to seed
      }
    });
    remnants(); orchard();   // (after the long grass, so they stand up out of it)
  }
  // the sign at a field's gate: a small board on a post saying what the next piece of it needs, its level or its price
  function sign(B, x, y, row, lv) {
    // (layfix east) a small tag on a short stake at the gate, dark weathered wood with the price cut in pale letters: the big
    // yellow boards stood out in the scenery like stickers, five to a view
    const lvNeed = row.lv || 0, coin = lv >= lvNeed && !!row.buy, txt = lv < lvNeed ? 'Lv ' + lvNeed : row.buy ? String(row.buy) : ''; if (!txt) return;
    B.f(B.ell(x + 1, y + .8, 4.5, 1.4), 'rgba(40,40,24,.25)');
    B.f(B.rect(x - .9, y - 11, 1.8, 11), '#5e4c36').f(B.rect(x - .9, y - 11, .7, 11), '#8a7454', .7);
    const cx = B.cx; cx.save(); cx.font = '700 5.6px system-ui, sans-serif';
    const w = Math.max(11, cx.measureText(txt).width + (coin ? 5 : 0) + 4), x0 = x - w / 2, y0 = y - 18;
    B.f(B.rr(x0 + .6, y0 + .8, w, 8, 1.4), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 8, 1.4), '#6e5638').f(B.rr(x0, y0, w, 2, 1), '#8a6e4a', .8).s(B.rr(x0, y0, w, 8, 1.4), '#3e2e1e', .6, .9);
    B.f(B.circ(x0 + 1.6, y0 + 4, .5), '#2e2418').f(B.circ(x0 + w - 1.6, y0 + 4, .5), '#2e2418');
    let tx = x0 + 2.4;
    if (coin) { B.f(B.circ(tx + 1.6, y0 + 4.1, 1.7), '#d8a830').f(B.circ(tx + 1.6, y0 + 4.1, .8), '#f0d070'); tx += 4.4; }
    cx.fillStyle = '#f2e8d0'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 4.3); cx.restore();
  }

  // the one gate: across a cell's edge (g.horiz: seen from the front) or along it (seen from the side)
  function gate(B, g, kind) {
    // (round 3) a woodland field's way in: two sawn log posts and an old mossy log lying across the gap between them
    if (kind === 'log') {
      const moss = ['#6f8a42', '#86a052'], bark = ['#7a6248', '#5e4a34', '#9a8262'], grain = '#d2bc90';
      const ends = g.horiz ? [[g.x - g.len / 2 + 3, g.y], [g.x + g.len / 2 - 3, g.y]] : [[g.x, g.y - g.len / 2 + 2], [g.x, g.y + g.len / 2 - 1]];
      B.f(B.ell(g.x + 2, g.y + 1.6, (g.horiz ? g.len : 8) * .5, 2.6), '#22301a', .24);
      const post = ([x, y]) => { B.f(B.rr(x - 3.4, y - 10, 6.8, 10.5, 2), bark[0]).f(B.rect(x - 3.4, y - 9, 2, 9), bark[2], .6).f(B.ell(x, y - 10, 3.4, 1.5), grain).f(B.ell(x + 1, y - 6, 1.8, 2.4), moss[0], .8); };
      post(ends[0]);
      if (g.horiz) { const x0 = ends[0][0] + 1, x1 = ends[1][0] - 1, y = g.y - 3.2;
        B.f(B.rr(x0, y - 3.4, x1 - x0, 6.8, 3.4), bark[1]).f(B.rr(x0, y - 3.4, x1 - x0, 3, 1.6), bark[0]).f(B.ell(x1, y, 1.6, 3.2), grain);
        for (let x = x0 + 2; x < x1 - 2; x += 3.5) B.f(B.ell(x + 1, y - 3.2, 2.2, 1.2), x % 2 < 1 ? moss[0] : moss[1], .9);
      } else { const y0 = ends[0][1], y1 = ends[1][1], x = g.x;
        B.f(B.rr(x - 3.2, y0 - 6, 6.4, y1 - y0, 3.2), bark[1]).f(B.rr(x - 3.2, y0 - 6, 2.6, y1 - y0, 1.4), bark[0]);
        for (let y = y0; y < y1 - 6; y += 3.2) B.f(B.ell(x + .6, y - 4, 1.8, 1.6), moss[(y | 0) % 2], .9);
      }
      for (const [x, y] of ends) for (let k = 0; k < 3; k++) { const a = -2.3 + k * .5; B.s(`M${x} ${y}q${Math.cos(a) * 3} ${Math.sin(a) * 4} ${Math.cos(a) * 6} ${Math.sin(a) * 8}`, '#5e8a44', 1.1, .85); }
      post(ends[1]);
      return;
    }
    // (High orchard fix round 2) the orchard's fields each shut in their own way, so the same field gate is not stamped by every
    // one: a woven hurdle in the rows, a stile into the meadows, a rope between two posts on the heather, a weathered board gate at the pond
    if (kind === 'hurdle' || kind === 'stile' || kind === 'rope') {
      const P2 = ['#6e5a40', '#4e3e2c', '#927a58'], h = 12;
      const ends = g.horiz ? [[g.x - g.len / 2 + 3, g.y], [g.x + g.len / 2 - 3, g.y]] : [[g.x, g.y - g.len / 2 + 2], [g.x, g.y + g.len / 2 - 1]];
      const [[ax, ay], [bx, by]] = ends;
      B.f(B.ell((ax + bx) / 2 + 2, (ay + by) / 2 + 1.6, Math.abs(bx - ax) / 2 + 3, Math.abs(by - ay) / 2 + 2.4), '#22301a', .2);
      if (kind === 'hurdle') { B.f(B.poly([[ax, ay], [bx, by], [bx, by - h], [ax, ay - h]]), '#7a5a34'); for (let k = 0; k < 5; k++) { const o = 2 + k * (h - 3) / 4; B.s(`M${ax} ${ay - o}L${bx} ${by - o}`, k % 2 ? '#c49a62' : '#a07a4a', 2.2, 1); } for (let k = 1; k < 5; k++) { const t = k / 5, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; B.s(`M${x} ${y + .5}V${y - h - 1.5}`, '#4e3620', 1.2, 1); } }
      else if (kind === 'stile') { B.s(`M${ax} ${ay - 5}L${bx} ${by - 5}M${ax} ${ay - 11}L${bx} ${by - 11}`, '#8a7454', 1.8, 1); if (g.horiz) { const mx = (ax + bx) / 2; B.f(B.rect(mx - 7, ay - 4.5, 14, 2.6), '#a88e66').f(B.rect(mx - 7, ay - 4.5, 14, .9), '#c8b08a').f(B.rect(mx - 5.5, ay - 2, 1.6, 2.4), '#5e4c36').f(B.rect(mx + 4, ay - 2, 1.6, 2.4), '#5e4c36'); } }
      else { const sag = (x0, y0, x1, y1, d) => `M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + d} ${x1} ${y1}`; B.s(sag(ax, ay - 10, bx, by - 10, 4), '#c9b07a', 1.6, 1).s(sag(ax, ay - 10.6, bx, by - 10.6, 4), '#e8d6a6', .6, .8); B.s(`M${bx - 1} ${by - 10}q2 3 0 6`, '#c9b07a', 1.2, .9); }
      for (const [x, y] of ends) B.post(x, y - h - 2.5, y + .5, 3.2, P2).f(B.ell(x, y - h - 2.5, 1.9, 1.1), P2[2]);
      return;
    }
    const wood = kind === 'wicket' ? ['#e4dcc8', '#f4eee0', '#b8ae96'] : ['#8a7454', '#a88e66', '#5e4c36'], post = kind === 'wicket' ? ['#cfc6b0', '#b0a68e', '#f0eada'] : ['#6e5a40', '#4e3e2c', '#927a58'];
    if (g.horiz) {
      const x0 = g.x - g.len / 2 + 3, x1 = g.x + g.len / 2 - 3, y = g.y, h = kind === 'wicket' ? 13 : 12;
      B.f(B.ell(g.x + 2, y + 1.6, g.len * .5, 2.4), '#22301a', .22);
      if (kind === 'wicket') { for (let x = x0 + 2.5; x < x1 - 1; x += 4.2) { const t = Math.abs((x - g.x) / (g.len / 2)), hh = h - 3 * t * t; B.f(B.rr(x - 1.3, y - hh, 2.6, hh, 1.2), wood[0]).f(B.rect(x - 1.3, y - hh + 1, .9, hh - 1), wood[1], .8); } B.s(`M${x0} ${y - 3.4}H${x1}M${x0} ${y - 8.2}H${x1}`, wood[2], 1.5, .95); }
      else { for (const k of [2.4, 5.2, 8, 10.6]) B.s(`M${x0} ${y - k}H${x1}`, k === 10.6 ? wood[1] : wood[0], 1.6, .98); B.s(`M${x0 + 1} ${y - 2.4}L${x1 - 1} ${y - 10.6}`, wood[2], 1.5, .9).s(`M${g.x} ${y - 2}V${y - 11}`, wood[2], 1.4, .8); }
      for (const x of [x0, x1]) B.post(x, y - h - 2.5, y + .5, 3.2, post).f(B.ell(x, y - h - 2.5, 1.9, 1.1), post[2]);
    } else {
      const y0 = g.y - g.len / 2 + 2, y1 = g.y + g.len / 2 - 1, x = g.x, h = 12;
      B.s(`M${x + 1.6} ${y0}V${y1}`, '#22301a', 3.4, .16);
      for (const k of [3, 6.6, 10]) B.s(`M${x} ${y0 - k}V${y1 - k}`, wood[k === 10 ? 1 : 0], 1.5, .98);
      B.s(`M${x} ${y0 - 10}L${x} ${y1 - 3}`, wood[2], 1.2, .6);
      for (const y of [y0, y1]) B.post(x, y - h - 2.5, y + .5, 3.2, post).f(B.ell(x, y - h - 2.5, 1.9, 1.1), post[2]);
    }
  }

  /** A shut field's drawn outline (px): its cells' outline with the corners rounded, and for a grown edge the line wandering. */
  const fieldLoops = (f, cells, W, cw, ch) => { const soft = SOFT.has(f.edge); return outline(cells).map(l => { const q = soften(l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })), soft ? 30 : 20, soft ? .5 : .42); return soft ? wander(q, 5) : q; }); };
  const lockedCells = (f, lv) => { const cells = [], secs = []; for (const s of f.sections) { const cs = cellsOf(s); if (cs.length && lockedAt(cs[0][0], cs[0][1], lv)) { secs.push(s); for (const c of cs) cells.push(c); } } return { cells, secs }; };
  /** For walking (94-garden-world-0walk.js): each shut field's outline in cells, the same line its ground is drawn to, so the feet
   * stop where the hedge, the long grass or the reeds are painted and not at the square cells under them. [{ poly, cells, src }] */
  let formsKey = '', formsNow = [];
  V.fieldForms = () => {
    if (!V.wanted || !V.wanted()) return [];
    const W = GARDEN_WORLD, lv = level(), shut = fields().map(f => [f, lockedCells(f, lv)]).filter(e => e[1].cells.length);
    const key = lv + '|' + shut.map(e => e[0].id + ':' + e[1].secs.join(',')).join('/'); if (key === formsKey) return formsNow;
    formsKey = key; formsNow = [];
    for (const [f, s] of shut) for (const l of fieldLoops(f, s.cells, W, W.cellW, W.cellH)) formsNow.push({ poly: l.map(q => [q.x / W.cellW, (q.y - W.sky) / W.cellH]), cells: s.cells, src: 'shut field: ' + (f.name || f.id) });
    return formsNow;
  };
  /** What a field is now: its locked cells, their rounded outline, the runs of edge that face ground you can walk on, its gate. */
  function shape(f, C, lv) {
    const W = C.W, cw = C.L.cw, ch = C.L.ch, { cells, secs: lockedSecs } = lockedCells(f, lv);
    if (!cells.length) return null;
    const key = f.id + '|' + lv + '|' + lockedSecs.join(','), hit = memo.get(key); if (hit) return hit;
    const mine = new Set(cells.map(c => c[0] + ',' + c[1]));
    const loops = fieldLoops(f, cells, W, cw, ch);
    const walk = (x, y) => { const cx = Math.floor(x / cw), cy = Math.floor((y - W.sky) / ch); if (mine.has(cx + ',' + cy)) return false; const b = gardenIslandBaseCell(cx, cy), row = gardenLandCell(cx, cy); return !!b && b.land && !b.freshwater && !b.solid && !(row && row.solid) && !lockedAt(cx, cy, lv); };
    const roadAt = (x, y) => { const b = gardenIslandBaseCell(Math.floor(x / cw), Math.floor((y - W.sky) / ch)); return !!(b && b.route); };
    // where this field meets another field that is also shut, the firmer of the two edges stands on the line between them
    // (so Wren's hedge runs all the way round, and the old wall of the glasshouse garden is built up against it)
    const mineRank = RANK[f.edge] || 0, shutNeighbour = (x, y) => { if (mineRank < 3) return false; const cx = Math.floor(x / cw), cy = Math.floor((y - W.sky) / ch), o = fieldOfCell().get(cx + ',' + cy); return !!o && o !== f && mineRank > (RANK[o.edge] || 0) && lockedAt(cx, cy, lv); };
    // (round 3) a valley field's hurdle leaves a gap where a bench, a lamp or a sight stands at its edge (it ran through the
    // ditch bench's back and under the frog stone)
    const near = (((data() || {}).static) || []).filter(p => p.district === 'east-mill' || /^ld-(frog|vseat|vlamp|churn|boles|hide)/.test(p.id)), byStatic = (x, y) => { const cx = x / cw, cy = (y - W.sky) / ch; return near.some(p => cx > p.x - .45 && cx < p.x + (p.w || 1) + .45 && cy > p.y - .6 && cy < p.y + (p.h || 1) + .35); };
    // the edge stands just inside the outline (so its top never reaches over ground you stand on behind it)
    const runs = [], all = []; let n = 0;
    for (const l of loops) {
      const pts = V.walk(l.concat([l[0]]), f.edge === 'long-grass' || f.edge === 'meadow' || f.edge === 'reeds' ? 3.6 : f.edge === 'bracken' ? 9 : 4.4); let run = [];
      for (const q of pts) {
        const open = (walk(q.x + q.ty * 12, q.y - q.tx * 9) || shutNeighbour(q.x + q.ty * 12, q.y - q.tx * 9)) && !(f.edgeAll && byStatic(q.x, q.y)), inset = Math.abs(q.tx) > Math.abs(q.ty) ? (q.tx > 0 ? 8.5 : 2.5) : 4.5;   // (the north side stands further in: the piece is drawn upward from its foot)
        const s = { x: q.x - q.ty * inset, y: q.y + q.tx * inset, tx: q.tx, ty: q.ty, ox: q.x, oy: q.y, i: n++, road: roadAt(q.x + q.ty * 30, q.y - q.tx * 20) };
        if (open) { run.push(s); all.push(s); } else if (run.length) { runs.push(run); run = []; }
      }
      if (run.length) runs.push(run);
    }
    // the gate: on the authored gate cell while that is still locked, else on the nearest edge left
    let g = null; const G = f.gate;
    if (G && all.length) {
      const horizAuthored = G.out.y !== G.y, gx = horizAuthored ? (G.x + .5) * cw : Math.max(G.x, G.out.x) * cw, gy = horizAuthored ? W.sky + Math.max(G.y, G.out.y) * ch : W.sky + (G.y + .5) * ch;
      if (mine.has(G.x + ',' + G.y)) {
        // seen from the front where the gate's cell has open ground to its south (or north): a gate side-on is a thin thing
        const openS = walk((G.x + .5) * cw, W.sky + (G.y + 1.5) * ch), openN = walk((G.x + .5) * cw, W.sky + (G.y - .5) * ch);
        if (openS || openN && !horizAuthored) g = { x: (G.x + .5) * cw, y: W.sky + (openS ? G.y + 1 : G.y) * ch + (openS ? -2.5 : 8.5), horiz: true, len: cw - 4, south: openS, east: false };
        else g = { x: gx, y: gy + (horizAuthored ? (G.out.y > G.y ? -2.5 : 8.5) : 0), horiz: horizAuthored, len: horizAuthored ? cw - 4 : ch, south: G.out.y > G.y, east: G.out.x > G.x };
      } else {
        // (the authored cell is yours already: the gate moves to the nearest edge that is left, one that faces you if it can)
        let best = null; for (const s of all) { const hz = Math.abs(s.tx) > .92, d = Math.hypot(s.ox - gx, s.oy - gy) + (hz ? (s.tx < 0 ? 0 : 14) : 70); if (!best || d < best.d) best = { d, s }; }
        const s = best.s, hz = Math.abs(s.tx) > .92; g = { x: hz ? (Math.floor(s.ox / cw) + .5) * cw : s.x, y: s.y, horiz: hz, len: hz ? cw - 4 : ch, south: s.tx < 0, east: s.ty > 0 };
      }
    }
    // (village fix round 3) the field's front: a stretch either side of its gate (the gate stands where the field meets
    // its lane). Only there does it wear its built edge (the hedge, the wall, the dry-stone wall); everywhere else its own
    // rough growth runs out into the grass in clumps, so no field is a pen with a ring of hedge or wall round it
    // (only the side the gate is on: a small field is all within a couple of cells of its gate)
    { const gn = g ? (g.horiz ? [0, g.south ? 1 : -1] : [g.east ? 1 : -1, 0]) : null; for (const s of all) s.front = !!f.edgeAll || !!g && Math.hypot(s.x - g.x, s.y - g.y) < cw * 2.2 && s.ty * gn[0] - s.tx * gn[1] > .45; }   // (round 3: a valley field with edgeAll wears its edge all along where you walk, so no stop is invisible)
    // back to front: pieces of edge with the gate's gap cut out of them
    const gap = q => g && Math.abs(q.x - g.x) < (g.horiz ? g.len / 2 + 1 : 7) && Math.abs(q.y - g.y) < (g.horiz ? 8 : g.len / 2 + 1);
    const pieces = []; for (const run of runs) { let cur = []; for (const q of run) { if (gap(q)) { if (cur.length) pieces.push(cur); cur = []; } else cur.push(q); } if (cur.length) pieces.push(cur); }
    const rows = lockedSecs.map(rowOf).filter(Boolean).sort((a, b) => (a.lv || 0) - (b.lv || 0) || (a.buy || 0) - (b.buy || 0));
    const out = { has: mine, loops, path: pathOf(loops), pieces, gate: g, next: rows[0] || null };
    (V._fieldShapes || (V._fieldShapes = {}))[f.id] = { gate: g, next: out.next && out.next.id, pieces: pieces.length, points: all.length };   // (dev: what each shut field is now)
    if (memo.size > 60) memo.clear(); memo.set(key, out); return out;
  }
  /** Dug beds in a field: a spade's edge is never ruled. Crumbs of soil lie out on the grass, turf creeps back in over
   * the edge, tufts lean across it and a daisy stands here and there, so no bed is a hard-edged slab. Follows the garden:
   * worked out from the soil that is there now (once per state), painted piece by piece where the chunk is. */
  function bedEdges(B, C, f, cb) {
    const W = C.W, cw = C.L.cw, ch = C.L.ch, soilAt = (x, y) => SOIL.has(C.L.mat(x, y)), cells = [];
    for (const id of f.sections) for (const c of cellsOf(id)) if (soilAt(c[0], c[1])) cells.push(c);
    if (!cells.length) return;
    const key = f.id + '|soil|' + cells.length + '|' + cells.reduce((h, c) => (Math.imul(h, 31) + c[0] * 97 + c[1]) | 0, 7); let pts = memo.get(key);
    // (fix round 1: rounder corners and a spade line that wanders a little, so a bed of whole cells is not a ruled block)
    if (!pts) { pts = []; for (const raw of outline(cells)) { const loop = wander(soften(raw.map(q => ({ x: q[0] * cw, y: W.sky + q[1] * ch })), 34, .45), 3); for (const q of V.walk(loop.concat([loop[0]]), 4.2)) pts.push(q); } if (memo.size > 60) memo.clear(); memo.set(key, pts); }
    const P = C.P, season = C.season, lv = level();
    // Turf right up to the dug edge, all the way round. (The ground under the painting is cut square to the bed's cells,
    // and a road beside it is cut away too: between a rounded bed and a road that left a ruled strip of plain ground.)
    // Not where the next cell out is more soil, or a field that is still shut: its own edge stands there.
    { const turf = new Path2D(); let any = false;
      for (const q of pts) { if (!inBox(q, cb, 20)) continue; const ox = q.ty, oy = -q.tx, cx = Math.floor((q.x + ox * 9) / cw), cy = Math.floor((q.y + oy * 7 - W.sky) / ch);
        if (soilAt(cx, cy) || lockedAt(cx, cy, lv)) continue; const x = q.x + ox * 7.5, y = q.y + oy * 7.5; turf.moveTo(x + 11, y); turf.arc(x, y, 11, 0, Math.PI * 2); any = true; }
      if (any) { B.cx.save(); B.cx.filter = 'blur(1.6px)'; B.f(turf, P.lawn, 1); B.cx.restore(); } }
    for (const q of pts) { if (!inBox(q, cb, 20)) continue; const rr = rngAt(q, 29), ox = q.ty, oy = -q.tx;   // (ox, oy): out of the bed
      if (soilAt(Math.floor((q.x + ox * 9) / cw), Math.floor((q.y + oy * 7 - W.sky) / ch))) continue;   // (the next field's bed carries on from here: no edge between them)
      if (rr() < .6) { const d = .5 + rr() * 4.5, w = 2.6 + rr() * 3, h = 1.6 + rr() * 1.6, dark = rr() < .4; B.f(B.blob(rr, q.x + ox * d, q.y + oy * d, w, h, 6, .5), dark ? '#6a4e36' : '#7d5d40', .96); }
      if (rr() < .5) { const d = .5 + rr() * 4, w = 3 + rr() * 3.4, h = 1.8 + rr() * 1.8, lo = rr() < .5; B.f(B.blob(rr, q.x - ox * d, q.y - oy * d, w, h, 6, .5), lo ? P.lawnLo : P.lawn, .96); }
      if (rr() < .55) { const n = 2 + Math.floor(rr() * 3), bx = q.x + ox * (1 + rr() * 3), by = q.y + oy * (1 + rr() * 3); for (let k = 0; k < n; k++) { const hh = 3.5 + rr() * 5, lean = -ox * (1.5 + rr() * 2.5) + (rr() - .5) * 2.5, tone = rr(); B.s(`M${bx + k * 1.1} ${by + 1}q${lean * .4} ${-hh * .55} ${lean} ${-hh}`, tone < .45 ? P.lawnLo : tone < .8 ? '#6f8a40' : P.lawnHi, 1, .85); } }
      if (season !== 'winter' && rr() < .05) { const dx = q.x + ox * (5 + rr() * 4), dy = q.y + oy * (4 + rr() * 3); B.f(B.circ(dx, dy, 1.7), '#f6f2e4', .95).f(B.circ(dx, dy, .7), '#f0d24a', .95); }
    }
  }
  function drawField(B, C, f, bb, cb) {
    const lv = level(), S = shape(f, C, lv);
    if (S) {
      // its ground, over whatever the road's soft edge left on it
      const grown = SOFT.has(f.edge);
      // (a field has no line round it: its colour runs out a little way into the lawn and thins there; round 3: every
      // field, since away from its front none of them is walled or hedged in)
      { B.cx.save(); B.cx.filter = 'blur(6px)'; B.s(S.path, f.edge === 'bracken' ? C.P.floor : f.edge === 'reeds' ? '#7e8a52' : grown ? strawTones(C.season)[0] : C.P.lawnLo, 12, grown ? .3 : .26); B.cx.restore(); }
      B.cx.save(); B.cx.clip(S.path, 'nonzero'); fill(B, C, f, bb, cb, S.has, S.loops);
      // a soft shade just inside the edge, so the field sits in the ground
      B.cx.filter = 'blur(2.5px)'; B.s(S.path, '#2a3a1c', 6, .1); B.cx.filter = 'none'; B.cx.restore();
      const g = S.gate, edge = STYLE[f.edge] || STYLE.hedge, kind = f.edge === 'hedge' ? 'wicket' : /^w-/.test(f.id || '') ? 'log' : /^high-/.test(f.id || '') ? ({ 'long-grass': 'hurdle', meadow: 'stile', heather: 'rope' }[f.edge] || 'field') : 'field';   // (round 3: the Whispering woodland's fields, w-*, a mossy log across the way in; the High orchard's, high-*, each shut its own way)
      // (round 3) the built edge (or the kind's own thick growth) only along the front; the rest is the rough margin, with
      // the kind's own reeds, bracken or long grass standing in it here and there where it grows thickest
      const thickAt = q => .5 + .5 * (Math.sin(q.ox * .037 + q.oy * .051) * .6 + Math.sin(q.ox * .013 - q.oy * .029 + 2.1) * .4);
      const paint = part => { if (!part.length) return; const front = part.filter(q => q.front), back = part.filter(q => !q.front);
        if (back.length) { STYLE.margin(B, back, C, f.edge); if (grown) { const tuft = back.filter(q => thickAt(q) > .62); if (tuft.length) (f.edge === 'bracken' || f.edge === 'reeds' ? edge : (B2, r2, C2) => STYLE['long-grass'](B2, r2, C2, { tall: .8 }))(B, tuft, C);   /* (the orchard's and the bridge plot's hawthorn only at the front: tufts of it here read as a ring of hedge again) */ } }
        if (front.length) edge(B, front, C);
        if (ROPED.has(f.edge)) STYLE.rope(B, part, C); };
      // back to front: the far edges, then the gate and its sign, then the near edges over them
      const gy = g ? g.y : Infinity, near = S.pieces.map(p => p.filter(q => inBox(q, cb)));
      for (const p of near) paint(p.filter(q => q.y <= gy));
      if (g && g.x > cb[0] - 60 && g.x < cb[2] + 60 && g.y > cb[1] - 20 && g.y < cb[3] + 50) {
        gate(B, g, kind);
      }
      for (const p of near) paint(p.filter(q => q.y > gy));
      // (the sign last: reeds, long grass or a hedge end right beside the gate never stand across its board; round 3, critic
      // round 2: a woodland field shows its board only once it can be bought, not 'Lv 3/6/10/18' on every screen of the wood)
      if (g && S.next && !(/^w-/.test(f.id) && lv < (S.next.lv || 0)) && g.x > cb[0] - 60 && g.x < cb[2] + 60 && g.y > cb[1] - 20 && g.y < cb[3] + 50) { const sx = g.horiz ? g.x + g.len / 2 + 5 : g.x + (g.east ? 8 : -8), sy = g.horiz ? g.y + 1 : g.y + g.len / 2 + 3; sign(B, sx, sy, S.next, lv); }
      if (f.edge === 'meadow') { B.cx.save(); const out = new Path2D(); out.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120); out.addPath(S.path); B.cx.clip(out, 'evenodd'); B.cx.filter = 'blur(4px)'; B.s(S.path, C.P.lawnHi, 10, .22); B.cx.filter = 'none'; B.cx.restore(); }   // the mown edge round the uncut meadow
    }
    // Land of this field that is yours. (Village fix round 2: it went to a plain striped lawn, the orchard lost its trees and
    // the hedge went with the price sign, so you could not see what you owned.) It keeps its field's character, tended
    // (fill's tame look: the orchard's young trees, the meadow's flowers, the allotment's canes, cut grass), and a low
    // edging of the field's own kind runs round it where it meets ground that is not the field's (box edging for Wren's,
    // a low laid hawthorn by the road, a stone kerb for a walled plot, a fringe of grass for the strips and the meadow),
    // knee high or less, so it reads as yours and you can see it is a thing you step over; its gate stands open.
    const ownedLow = { hedge: { w: 8.6, h: 5.6, round: 2.6, tone: 'box' }, 'hedge-road': { w: 9, h: 6.4, round: 3, tone: 'leaf' }, stile: { w: 9, h: 6.4, round: 3, tone: 'leaf' },
      wall: { w: 8, h: 4.2, round: 1, tone: 'brick' }, drystone: { w: 7.6, h: 4.4, round: 2, tone: 'stone' }, hurdle: { w: 7.6, h: 4.6, round: 2, tone: 'leaf' } };
    const fieldCells = fieldOfCell();
    for (const id of f.sections) {
      const row = rowOf(id), cs = cellsOf(id); if (!row || row.kind === 'green' || !cs.length || lockedAt(cs[0][0], cs[0][1], lv)) continue;
      const dug = SOIL.has(C.L.mat(cs[0][0], cs[0][1]));
      const W = C.W, cw = C.L.cw, ch = C.L.ch, loops = outline(cs).map(l => wander(soften(l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })), 28, .5), 4)), path = pathOf(loops);
      const xs = loops.flatMap(l => l.map(q => q.x)), ys = loops.flatMap(l => l.map(q => q.y)), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (x1 < cb[0] - 40 || x0 > cb[2] + 40 || y1 < cb[1] - 40 || y0 > cb[3] + 40) continue;
      const lt = strawTones(C.season), P = C.P, rr = KIT().rng(KIT().hash(Math.round(x0), Math.round(y0), 71) | 1), has = new Set(cs.map(c => c[0] + ',' + c[1]));
      if (!dug) {
        // the field's own ground, tended, its colour running out softly into the grass round it (no line round it)
        B.cx.save(); B.cx.filter = 'blur(6px)'; B.f(path, P.lawnHi, .22); B.cx.filter = 'none';
        B.cx.clip(path, 'nonzero'); fill(B, C, f, [x0 - 4, y0 - 4, x1 + 4, y1 + 4], cb, has, loops, true);
        // the allotment, yours: its strips dug over and raked, ready, along the slope's contour, with grass walks between them
        // (what grows there is still yours to plant; a strip you plant in is dug as a bed like any other)
        if (f.edge === 'long-grass') { const salt = KIT().hashStr('strip|' + id) & 0xffff, xa = Math.floor((Math.max(x0, cb[0] - 30)) / 24) * 24, xb = Math.min(x1, cb[2] + 30);
          for (let k = 0, y = y0 + 10; y < y1 - 4; y += 27, k++) { if (y < cb[1] - 20 || y > cb[3] + 20) continue; let top = [], bot = [];
            // (each strip dug by hand: its edges wander, its ends are rounded, the turf leans over it, crumbs lie out on the grass)
            const flush = () => { const n = top.length; if (n > 2) { for (let i = 0; i < n; i++) { const e = Math.min(i, n - 1 - i), t = e === 0 ? .35 : e === 1 ? .8 : 1, mid = (top[i].y + bot[i].y) / 2; top[i].y = mid + (top[i].y - mid) * t; bot[i].y = mid + (bot[i].y - mid) * t; }
              const poly = top.concat(bot.slice().reverse()), P2 = new Path2D(); P2.moveTo(poly[0].x, poly[0].y); for (const q of poly) P2.lineTo(q.x, q.y); P2.closePath();
              B.f(P2, '#6e5038', .55).f(P2, '#7d5d40', .9); B.cx.save(); B.cx.clip(P2); for (const d of [2.6, 5.4, 8.2, 11]) V.strokePts(B, top.map(q => ({ x: q.x, y: q.y + d })), d % 2 ? '#5e4430' : '#93714e', .9, .45); B.cx.restore();
              V.strokePts(B, top, '#a8865e', 1.6, .55);
              const rr = KIT().rng(KIT().hash(Math.round(top[0].x), Math.round(top[0].y), 97) | 1);
              for (const q of top.concat(bot)) { if (rr() < .5) B.f(B.blob(rr, q.x + (rr() - .5) * 8, q.y + (rr() - .5) * 3, 1.8 + rr() * 2, 1 + rr(), 5, .5), rr() < .5 ? '#6a4e36' : '#8a6a48', .85); if (rr() < .6) { const hh = 3 + rr() * 4, lean = (rr() - .5) * 4; B.s(`M${q.x + (rr() - .5) * 6} ${q.y + 1}q${lean * .4} ${-hh * .5} ${lean} ${-hh}`, rr() < .5 ? C.P.lawnLo : '#6f8a40', 1, .85); } } }
              top = []; bot = []; };
            for (let x = xa; x <= xb; x += 9) { if (((Math.imul(Math.round(x / 72) * 31 + k * 17 + salt, 2654435761) >>> 0) % 5) === 0 && x % 72 < 9) { flush(); continue; } const yy = y + Math.sin(x * .016 + y * .004 + k) * 8, w1 = Math.sin(x * .07 + k * 3) * 1.4 + Math.sin(x * .19 + k) * .7, w2 = Math.sin(x * .061 + k * 5 + 1) * 1.4 + Math.sin(x * .23 + k * 2) * .7; top.push({ x, y: yy - 7.2 + w1 }); bot.push({ x, y: yy + 7.2 + w2 }); } flush(); } }
        // where the field is grass, the mower's stripes, wide and faint, slanting the same way across every piece
        if (f.edge !== 'meadow' && f.edge !== 'bracken' && f.edge !== 'reeds') { const band = 26; B.cx.filter = 'blur(2px)'; for (let k = 0, x = x0 - (y1 - y0) * .5 - band; x < x1 + band; x += band, k++) B.f(B.poly([[x, y1 + 6], [x + band, y1 + 6], [x + band + (y1 - y0 + 12) * .5, y0 - 6], [x + (y1 - y0 + 12) * .5, y0 - 6]]), k % 2 ? '#f2f4d2' : P.lawnLo, k % 2 ? .1 : .06); B.cx.filter = 'none'; }
        B.cx.filter = 'blur(3px)'; B.s(path, '#3a4a24', 7, .12); B.cx.filter = 'none';
        B.cx.restore();
      }
      // the low edging, back to front, where the piece meets ground that is not this field's; the gate's gap stands open
      const G = f.gate, gateHere = G && has.has(G.x + ',' + G.y), gx = G ? (G.x + .5) * cw : 0, gy = G ? W.sky + (G.y + .5) * ch : 0;
      const run = [];
      for (const l of loops) for (const q of V.walk(l.concat([l[0]]), f.edge === 'long-grass' || f.edge === 'meadow' || f.edge === 'reeds' ? 3.6 : 4.2)) {
        const ox = q.x + q.ty * 12, oy = q.y - q.tx * 9, ocx = Math.floor(ox / cw), ocy = Math.floor((oy - W.sky) / ch);
        if (fieldCells.get(ocx + ',' + ocy) === f) continue;   // (the next piece of this field: its own edge, or none, stands there)
        const b = gardenIslandBaseCell(ocx, ocy); if (!b || !b.land) continue;
        // (a raised edging only along a lane or a path, and (round 3) for a stretch either side of the gate, so the gateway
        // stands in a run of hedge or wall and not alone on the grass: never a ring round the plot)
        if (ownedLow[f.edge] && !b.route && !(gateHere && Math.hypot(q.x - gx, q.y - gy) < cw * 1.9)) continue;
        if (gateHere && Math.hypot(q.x - gx, q.y - gy) < cw * .75) continue;   // the gateway, open
        const inset = Math.abs(q.tx) > Math.abs(q.ty) ? (q.tx > 0 ? 6 : 2) : 3.5; run.push({ x: q.x - q.ty * inset, y: q.y + q.tx * inset, tx: q.tx, ty: q.ty, i: run.length, big: .55 });
      }
      const near = run.filter(q => inBox(q, cb)), lo = ownedLow[f.edge];
      if (near.length) {
        if (lo) { const t = lo.tone === 'box' ? (C.season === 'winter' ? ['#2e4a2c', '#3c5c36', '#527448', '#6a8a5c'] : ['#2a4c26', '#386030', '#4e7c3c', '#6c9a4e']) : lo.tone === 'leaf' ? leafTones(C.season) : lo.tone === 'brick' ? ['#8a5642', '#7c4c3a', '#a8806a', '#b89078'] : ['#8e8678', '#a8a090', '#bdb5a3', '#d8d2c2'];
          raised(B, near, { w: lo.w, h: lo.h, rag: lo.tone === 'leaf' ? .3 : lo.tone === 'stone' ? .25 : .06, jit: lo.tone === 'leaf' ? 1.2 : .5, body: [t[0], t[0], t[1]], top: [t[2], t[2], t[3]], lit: t[3], round: lo.round }); }
        else if (f.edge === 'long-grass') STYLE['long-grass'](B, near, C, { tall: .55 });
        else if (f.edge === 'meadow') STYLE['long-grass'](B, near, C, { tall: .6, flowers: C.season === 'winter' ? null : ['#d8402e', '#f4f0e0', '#f0d24a'] });
        else if (f.edge === 'bracken') STYLE.bracken(B, near, C);
        else if (f.edge === 'reeds') STYLE.reeds(B, near, C);
      }
      if (gateHere && lo && gx > cb[0] - 30 && gx < cb[2] + 30 && gy > cb[1] - 30 && gy < cb[3] + 40) {
        // the gateway: two posts, the gate swung open against one of them (yours: it stands open)
        const horiz = G.out.y !== G.y, post = lo.tone === 'box' ? ['#cfc6b0', '#b0a68e', '#f0eada'] : ['#6e5a40', '#4e3e2c', '#927a58'], leaf = lo.tone === 'box' ? '#e4dcc8' : '#8a7454';
        if (horiz) { const y = W.sky + Math.max(G.y, G.out.y) * ch + (G.out.y > G.y ? -2.5 : 6), xa = gx - cw / 2 + 3, xb = gx + cw / 2 - 3;
          B.f(B.ell(gx + 2, y + 1.6, cw * .5, 2.2), '#22301a', .2);
          B.f(B.poly([[xa + 1, y - 1], [xa + 1, y - 10], [xa + 7, y - 13], [xa + 7, y - 4]]), leaf, .95).s('M' + (xa + 1) + ' ' + (y - 4) + 'L' + (xa + 7) + ' ' + (y - 7) + 'M' + (xa + 1) + ' ' + (y - 8) + 'L' + (xa + 7) + ' ' + (y - 11), post[1], 1, .9);
          for (const x of [xa, xb]) B.post(x, y - 15, y + .5, 3.2, post).f(B.ell(x, y - 15, 1.9, 1.1), post[2]); }
        else { const x = Math.max(G.x, G.out.x) * cw + (G.out.x > G.x ? -2.5 : 2.5), ya = gy - ch / 2 + 3, yb = gy + ch / 2 - 1;
          B.f(B.poly([[x, ya + 1], [x + (G.out.x > G.x ? -8 : 8), ya + 4], [x + (G.out.x > G.x ? -8 : 8), ya - 6], [x, ya - 10]]), leaf, .95);
          for (const y of [ya, yb]) B.post(x, y - 15, y + .5, 3.2, post).f(B.ell(x, y - 15, 1.9, 1.1), post[2]); }
      }
    }
    bedEdges(B, C, f, cb);
  }

  /* ---------- the planters: land that is yours from the start, kerbed on the lawn ---------- */
  // (fix round 1: neighbouring planters are one bed, drawn round all their cells together: each drawn round its own cells,
  // two side by side made two kerbs a hand apart that wound round each other like hosepipes)
  function drawPlanter(B, r, C, cs, lawn) {
    if (!cs.length) return;
    const W = C.W, cw = C.L.cw, ch = C.L.ch, loops = outline(cs).map(l => soften(l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })).map((p, i, a) => { const mx = a.reduce((s, q) => s + q.x, 0) / a.length, my = a.reduce((s, q) => s + q.y, 0) / a.length, dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy) || 1; return { x: p.x + dx / d * 4, y: p.y + dy / d * 3 }; }), 22, .45)).map(l => wander(l, 3.5));
    const path = pathOf(loops), season = C.season, lt = leafTones(season);
    const flowers = season === 'winter' ? ['#f4f6f2', '#e8ecef'] : season === 'autumn' ? ['#e8dcc0', '#d8a040', '#c85a3a', '#e0c070', '#9a7ac8'] : season === 'spring' ? ['#f2efe2', '#e8c84a', '#d88aa8', '#9ab0e0'] : ['#f4f0e0', '#f0d24a', '#c79ac0', '#e88a8a', '#8ab0e0'];
    B.cx.save(); if (lawn) B.cx.clip(lawn, 'nonzero');
    // the panel: a finer, lighter lawn than the green round it
    B.f(path, season === 'winter' ? '#c2ccb4' : season === 'autumn' ? '#b4bc6c' : '#a8c86a', .26);
    // its border: a narrow bed of flowers all the way round, inside a low stone edging (a curved flower border, not a string of stones)
    B.cx.save(); B.cx.clip(path, 'nonzero');
    B.cx.filter = 'blur(1.5px)'; B.s(path, '#33281a', 21, .26); B.cx.filter = 'none';
    B.s(path, season === 'winter' ? '#6e5c4a' : '#6b4f38', 10, .85);
    B.cx.restore();
    for (const l of loops) for (const q of V.walk(l.concat([l[0]]), 3.6)) {
      const o = 2 + r() * 4.2, x = q.x - q.ty * o, y = q.y + q.tx * o, t = r(), bloom = r(), dx = (r() - .5) * 4, up = 1.2 + r() * 1.8, sz = 1.3 + r() * .7, col = flowers[Math.floor(r() * flowers.length)];
      B.f(B.blob(r, x, y, 3.8 + t * 1.8, 2.5 + t, 6, .4), lt[t < .45 ? 1 : t < .85 ? 2 : 3], .94);
      if (season === 'winter' ? bloom < .1 : bloom < .78) B.f(B.circ(x + dx, y - up, sz), col, .96);
    }
    // drifts of low planting across the middle: cushions of leaf with the same flowers, thinner than at the edge, so the
    // border reads as a bed and what you plant in it still stands clear
    { const xs = loops.flatMap(l => l.map(q => q.x)), ys = loops.flatMap(l => l.map(q => q.y)), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), n = Math.round((x1 - x0) * (y1 - y0) / 90);
      // (fix round 1: fuller and brighter, a cottage border in flower: mounds of leaf lit on top, flowers in loose
      // drifts of one colour rather than confetti, and taller spires here and there, so a bed reads at the default camera)
      B.cx.save(); B.cx.clip(path, 'nonzero');
      const drift = (x, y) => flowers[Math.abs(Math.floor(Math.sin(x * .05 + y * .09) * 2.2 + Math.sin(x * .021 - y * .04) * 2.2)) % flowers.length];
      for (let k = 0; k < n * 1.6; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), t = r(), w = 4.5 + r() * 4.5, bloom = r(), col = r() < .75 ? drift(x, y) : flowers[Math.floor(r() * flowers.length)], dx = (r() - .5) * 5, up = 1 + r() * 2, go = r(); if (go < .06) continue;
        B.f(B.blob(r, x, y, w, 2.4 + t * 1.2, 6, .4), lt[t < .3 ? 1 : t < .8 ? 2 : 3], .92); B.f(B.blob(r, x - w * .2, y - 1.4, w * .5, 1.2, 6, .4), lt[3], .5);
        if (season === 'winter' ? bloom < .08 : bloom < .72) { B.f(B.circ(x + dx, y - up, 1.3 + bloom * .9), col, .97); if (bloom < .3) B.f(B.circ(x + dx + 2.2, y - up + .6, 1.1 + bloom), col, .95); }
        if (season !== 'winter' && bloom > .93) { const sx = x + dx * .5, c2 = drift(x + 40, y); for (let j = 0; j < 4; j++) B.f(B.ell(sx, y - 3 - j * 2.6, 1.6 - j * .25, 1.4), c2, .95); B.s(`M${sx} ${y}v-${10}`, lt[1], .9, .8); } }
      B.cx.restore(); }
    // the edging: one low line of honey stone with its joints, lit along the top
    // (round 3: weathered and half sunk in the turf, a quieter line than the bright ring it was, with the border's planting
    // spilling over it and the lawn creeping onto it here and there, so the green reads as planted beds, not outlines)
    // (fix round 1: no stone kerb at all now: a spade-cut turf edge, a dark line of soil just inside the lawn's lip, so a
    // bed reads as a bed cut in the green and not as a ring laid on it)
    B.cx.save(); B.cx.filter = 'blur(1.2px)'; B.s(path, '#3a2e1e', 3.4, .42); B.cx.filter = 'none'; B.cx.restore();
    B.cx.save(); B.cx.translate(0, 1.4); B.s(path, C.P.lawnHi, 1.5, .5); B.cx.restore();
    for (const l of loops) for (const q of V.walk(l.concat([l[0]]), 8.5)) { const u = r(), t = r();
      if (u < .34) { const w = 3.6 + t * 3.4; B.f(B.blob(r, q.x - q.ty * .6, q.y + q.tx * .6 - .6, w, 2.2 + t, 6, .45), lt[t < .5 ? 1 : 2], .95); if (season !== 'winter' && r() < .7) B.f(B.circ(q.x + (r() - .5) * w, q.y - 1.6 - r() * 1.4, 1.2 + r() * .5), flowers[Math.floor(r() * flowers.length)], .96); }
      else if (u < .52) { const ox = q.ty, oy = -q.tx; B.f(B.blob(r, q.x + ox * 1.6, q.y + oy * 1.4, 3 + t * 2.6, 1.6 + t * .8, 6, .5), t < .5 ? C.P.lawn : C.P.lawnLo, .9); for (let k = 0; k < 3; k++) B.s(`M${q.x + ox * 1.2 + (k - 1) * 1.4} ${q.y + oy * 1.2}q${(r() - .5) * 2} ${-2} ${(r() - .5) * 3} ${-3.6 - r() * 2}`, k % 2 ? C.P.lawnLo : '#6f8a40', .9, .85); } }
    B.cx.restore();
  }

  function compose(C) {
    const { L, add, kit, thing, W } = C, cw = L.cw, ch = L.ch, D = L.D, pres = L.pres || {}, list = pres.fields || []; if (!list.length) return;
    secSet = null; cellField = null; memo.clear();
    const green = (pres.plazas || []).find(p => p.id === 'the-green'), lawnPts = green && Array.isArray(green.lawn) ? V.shapeLoop(L, green.lawn, 3) : null, lawn = lawnPts ? pathOf([lawnPts]) : null;
    // The cottage lane's last stretch, down to the postern, lies beyond the village's painted ground (which stops at row
    // 72): the same gravel carries on, soft at both edges, narrows to the gap between the two old piers and goes on
    // through it as a worn way that dies out under the trees. It starts a little way back up the lane and comes in
    // gradually there, so the two stretches meet without a line across the lane.
    { const lane = L.routes.get('cottage-lane'), rc = L.routes.get('ruins-circuit'), start = D.anchors.start, edgeY = start.y + 18;
      if (lane && Array.isArray(lane.widths) && lane.points && lane.points.length > 1) {
        const lp = gardenIslandRoutePath(lane).points.filter(q => q.y >= edgeY - 2.4).map(q => ({ x: q.x, y: q.y, w: gardenIslandRouteWidthAt(lane, q.x, q.y) }));
        const end = lp[lp.length - 1], on = [];
        // (on along the old wood's circuit: its next two points, set a quarter of a cell south so the worn way lies along the
        // middle of the plain strip the ground under the painting lays there, and one cell further towards the third)
        if (end && rc && rc.points) { const near = rc.points.map(q => ({ x: q[0], y: q[1] })).filter(q => Math.hypot(q.x - end.x, q.y - end.y) > .5).sort((a, b) => Math.hypot(a.x - end.x, a.y - end.y) - Math.hypot(b.x - end.x, b.y - end.y)).slice(0, 3);
          near.forEach((q, i) => { if (i < 2) return on.push({ x: q.x, y: q.y + .23, w: 1.5 }); const p = near[1], d = Math.hypot(q.x - p.x, q.y - p.y) || 1; on.push({ x: p.x + (q.x - p.x) / d, y: p.y + .23 + (q.y - p.y) / d, w: 1.5 }); }); }
        const all = lp.concat(on);
        if (lp.length > 2) {
          // (rounded where the lane turns west through the gap)
          const raw = all.map(q => L.cpt(q.x, q.y)), px = []; raw.forEach((q, i) => { if (i < lp.length - 2 || i === raw.length - 1 || i === 0) return px.push(q); const a = raw[i - 1], b = raw[i + 1]; px.push({ x: a.x * .22 + q.x * .56 + b.x * .22, y: a.y * .22 + q.y * .56 + b.y * .22 }); });
          const qs = V.walk(px, 5), n = qs.length, laneLen = (() => { let t = 0; for (let i = 1; i < lp.length; i++) t += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y); return t; })(), nLane = Math.max(2, Math.min(n - 1, Math.round(laneLen / 5)));
          const wAt = q => { const cx = q.x / cw, cy = (q.y - W.sky) / ch; let best = all[0], bd = 1e9; for (const a of all) { const d = Math.hypot(a.x - cx, a.y - cy); if (d < bd) { bd = d; best = a; } } return best.w; };
          // full width down the lane, easing to the width of the gap over its last stretch, then dying away beyond the piers
          const ease = t => t * t * (3 - 2 * t), taper = i => i <= nLane - 16 ? 1 : i <= nLane ? 1 - .42 * ease((i - (nLane - 16)) / 16) : (u => u < .62 ? .58 : .58 * (1 - ease((u - .62) / .38)))((i - nLane) / Math.max(1, n - 1 - nLane));
          const half = (q, i) => Math.max(i > nLane ? 0 : 6, (i > nLane ? 33 : wAt(q) * .37 * Math.hypot(q.ty * cw, q.tx * ch)) * taper(i));
          const ribbon = (k, grow, full) => { const l = [], rr = []; qs.forEach((q, i) => { const h = full ? (i > nLane ? 24 * Math.min(1, (n - 1 - i) / 8) + 2 : wAt(q) * .37 * Math.hypot(q.ty * cw, q.tx * ch) * k + grow) : Math.max(.5, half(q, i) * k + grow * Math.min(1, (n - 1 - i) / 6)); l.push([q.x - q.ty * h, q.y + q.tx * h]); rr.push([q.x + q.ty * h, q.y - q.tx * h]); }); const pth = new Path2D(), pts = l.concat(rr.reverse()); pth.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) pth.lineTo(pts[j][0], pts[j][1]); pth.closePath(); return pth; };
          const yA = W.sky + (edgeY - 2.4) * ch, yB = W.sky + (edgeY - .5) * ch, hexA = (h, al) => { const v = parseInt(String(h).slice(1), 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + al + ')'; };
          add(kit.bboxOf(px, 60), kit.hashStr('lane-tail'), (B, r) => {
            const P = C.P, cx = B.cx, lay = (pth, col, al, blur, dx, dy) => { const g = cx.createLinearGradient(0, yA, 0, yB); g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, al)); cx.save(); cx.filter = blur ? 'blur(' + blur + 'px)' : 'none'; if (dx || dy) cx.translate(dx, dy); cx.fillStyle = g; cx.fill(pth); cx.restore(); };
            // (turf first, over the whole width of the plain strip the ground under the painting lays along the route here)
            lay(ribbon(1.2, 12, true), P.lawn, 1, 5);
            lay(ribbon(1, 9), '#8a7a4a', .3, 4, 1.5, 2.5); lay(ribbon(1, 4.5), '#bca878', .9, 3);
            lay(ribbon(1, 0), P.path, 1, 1.4); lay(ribbon(.45, 0), P.pathWear, .5, 2);
            qs.forEach((q, i) => { const h = half(q, i), vis = Math.max(0, Math.min(1, (q.y - yA) / (yB - yA))); if (h < 2.5 || vis < .5) return;
              // the wheel lines, grit in two tones, and grass leaning in over both edges
              for (const sd of [-1, 1]) { const o = h * .44 * sd; cx.globalAlpha = .28; cx.fillStyle = P.pathEdge; cx.fillRect(q.x - q.ty * o - .8, q.y + q.tx * o - .8, 1.6, 1.6); } cx.globalAlpha = 1;
              for (let k = 0; k < 7; k++) { const o = (r() - .5) * 1.8 * h, x = q.x - q.ty * o + (r() - .5) * 5, y = q.y + q.tx * o + (r() - .5) * 5; B.f(B.rect(x, y, .9 + r() * 1.3, .7 + r() * .9), r() < .5 ? P.pathEdge : r() < .5 ? P.pathWear : '#a89068', .5); }
              for (const sd of [-1, 1]) { if (r() < .3) continue; const o = (h + 1.5 - r() * 4.5) * sd, x = q.x - q.ty * o, y = q.y + q.tx * o, m = 2 + Math.floor(r() * 3); for (let k = 0; k < m; k++) { const hh = 2.5 + r() * 4, lx = (r() - .5) * 3; B.s(`M${x + k * .8} ${y + 1}q${lx * .4} ${-hh * .5} ${lx} ${-hh}`, r() < .5 ? P.lawnLo : '#6f8a40', 1, .7); } if (r() < .1) B.f(B.blob(r, x, y, 3 + r() * 3, 1.6 + r(), 6, .5), r() < .5 ? P.lawnLo : '#7d9448', .55); }
            });
          });
        }
      }
    }
    for (const f of list) {
      const cells = f.sections.flatMap(s => (D.sectionCells || {})[s] || []); if (!cells.length) continue;
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), bb = [Math.min(...xs) * cw - 30, W.sky + Math.min(...ys) * ch - 44, (Math.max(...xs) + 1) * cw + 30, W.sky + (Math.max(...ys) + 1) * ch + 16], seed = kit.hashStr('field|' + f.id);
      add(bb, seed, (B, r, cb) => drawField(B, C, f, bb, cb || bb));
    }
    // the planters (land that is yours from the start), neighbours joined into one bed
    { const lv = level(), open = [];
      for (const f of list) for (const s of f.sections) { const row = rowOf(s); if (!row || row.kind !== 'green') continue; const cs = (D.sectionCells || {})[s] || []; if (cs.length && !lockedAt(cs[0][0], cs[0][1], lv)) open.push({ s, cs }); }
      const key = c => c[0] + ',' + c[1], groups = [];
      for (const p of open) { const mine = new Set(p.cs.map(key)), touch = groups.filter(g => p.cs.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g.has.has(key([x + a, y + b])))));
        const g = touch.length ? touch[0] : { ids: [], cells: [], has: new Set() }; if (!touch.length) groups.push(g);
        for (const o of touch.slice(1)) { g.ids.push(...o.ids); g.cells.push(...o.cells); for (const k of o.has) g.has.add(k); groups.splice(groups.indexOf(o), 1); }
        g.ids.push(p.s); g.cells.push(...p.cs); for (const k of mine) g.has.add(k); }
      for (const g of groups) { const cs = g.cells, sx = cs.map(c => c[0]), sy = cs.map(c => c[1]), pb = [Math.min(...sx) * cw - 12, W.sky + Math.min(...sy) * ch - 14, (Math.max(...sx) + 1) * cw + 12, W.sky + (Math.max(...sy) + 1) * ch + 12];
        const onLawn = !!lawnPts && cs.filter(c => inPoly((c[0] + .5) * cw, W.sky + (c[1] + .5) * ch, lawnPts)).length * 2 > cs.length;
        add(pb, kit.hashStr('planter|' + g.ids.sort().join('+')), (B, r) => drawPlanter(B, r, C, cs, onLawn ? lawn : null)); }
    }
    // The square and the walk round the green are one big floor of setts: light and wear across it, the lines feet take,
    // moss and weeds in the joints where nobody walks, and in autumn the lime's leaves drifting over setts and lawn.
    if (green && Array.isArray(green.square) && green.square.length > 2) {
      const orient = poly => { let a = 0; for (let i = 0; i < poly.length; i++) { const u = poly[i], v = poly[(i + 1) % poly.length]; a += u.x * v.y - v.x * u.y; } return a < 0 ? poly.slice().reverse() : poly; };
      const loopRt = L.routes.get('plaza-loop'), sq = orient(V.shapeLoop(L, green.square)), rib = loopRt && loopRt.points ? orient(V.routeRibbon(L, loopRt, false)) : [];
      const paved = (x, y) => (inPoly(x, y, sq) || (rib.length > 2 && inPoly(x, y, rib))) && !(lawnPts && inPoly(x, y, lawnPts));
      const floor = pathOf(rib.length > 2 ? [sq, rib] : [sq]), bb = kit.bboxOf(sq.concat(rib), 12), salt = kit.hashStr('square-floor') & 0xffff;
      const rose = green.rose ? L.cpt(green.rose.x, green.rose.y) : null, lime = green.lime ? L.cpt(green.lime.x, green.lime.y - 1.2) : null, loopPts = L.routePts('plaza-loop');
      const way = pts => pts.map(q => L.cpt(q[0], q[1])), ways = [way([[48.4, 60.6], [48.3, 58.9], [47.2, 57], [47.6, 55.4]]), way([[42.4, 53.2], [43.6, 56.2], [46.8, 57.4], [50.4, 57.2], [54.6, 56.2], [55.9, 53.2]])];
      add(bb, salt, (B, r, cb) => {
        const season = C.season, box = [Math.max(bb[0], cb[0] - 4), Math.max(bb[1], cb[1] - 4), Math.min(bb[2], cb[2] + 4), Math.min(bb[3], cb[3] + 4)]; if (box[2] <= box[0] || box[3] <= box[1]) return;
        if (lime && (season === 'autumn' || season === 'winter')) kit.tiles(box, 60, 4, salt + 9, (tx, ty, rr) => { const leaf = season === 'autumn' ? ['#c8742a', '#e09a3a', '#a85a26', '#e8b84e', '#b8502a'] : ['#8a7a5a', '#a0906a']; for (let k = 0; k < 16; k++) { const x = tx + rr() * 60, y = ty + rr() * 60, w = Math.max(0, 1 - Math.hypot((x - lime.x) / 250, (y - lime.y) / 150)), go = rr(), a = 1.5 + rr() * 1.5, b = .9 + rr() * .8, c = leaf[Math.floor(rr() * leaf.length)]; if (go < w * (season === 'autumn' ? .9 : .25)) B.f(B.ell(x, y, a, b), c, .85); } });
        B.cx.save(); B.cx.clip(floor, 'nonzero');
        { const off = new Path2D(); off.rect(bb[0] - 20, bb[1] - 20, bb[2] - bb[0] + 40, bb[3] - bb[1] + 40); if (lawnPts) off.addPath(pathOf([lawnPts])); if (rose) off.ellipse(rose.x, rose.y, 48, 27, 0, 0, Math.PI * 2); B.cx.clip(off, 'evenodd'); }
        // sun and shade in broad soft patches (drawn from the tiles round about too: a patch is wide)
        kit.tiles(box, 90, 60, salt + 1, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 90, y = ty + rr() * 90, rx = 26 + rr() * 34, ry = 9 + rr() * 9, light = rr() < .55, a = .1 + rr() * .09; B.f(B.blob(rr, x, y, rx, ry, 8, .5), light ? '#f4e6c0' : '#8e7a56', a); } });
        // where feet go: round the green, up from the high street, across the square
        B.cx.filter = 'blur(5px)'; V.strokePts(B, loopPts.concat(loopPts.slice(0, 2)), '#f6ead0', 15, .2); for (const w of ways) V.strokePts(B, w, '#f6ead0', 20, .2); B.cx.filter = 'none';
        // moss and small weeds in the joints, thick at the edges where nobody walks
        kit.tiles(box, 60, 6, salt + 2, (tx, ty, rr) => { for (let k = 0; k < 26; k++) { const x = tx + rr() * 60, y = ty + rr() * 60, w = 2.6 + rr() * 3.4, h = 1 + rr() * 1.1, t = rr(), keep = rr(); if (!paved(x, y)) continue; const rim = !paved(x + 13, y) || !paved(x - 13, y) || !paved(x, y + 9) || !paved(x, y - 9); if (!rim && keep > .07) continue; B.f(B.blob(rr, x, y, w, h, 5, .5), t < .5 ? '#7d8a44' : t < .8 ? '#96a052' : '#6a7a3a', rim ? .62 : .45); } });
        B.cx.restore();
      });
    }
    // the great lime on the green: the village's tree, a seat round its foot
    if (green && green.lime && window.GardenPaintTrees) {
      const p = L.cpt(green.lime.x, green.lime.y), H = 196, species = 'chestnut', season = C.season;
      add([p.x - 150, p.y - 60, p.x + 190, p.y + 90], kit.hashStr('lime-shade'), B => { V.ok(() => GardenPaintTrees.groundShadow(B.cx, p.x, p.y, H, { species, season })); });
      // (the tree is painted once, at the scale its sprite is kept at: a sharper lime than before for half the paint)
      const LK = 1.8;
      thing({ key: 'village-lime|' + season, x: p.x, y: p.y, K: LK, box: [-104, -214, 104, 22], foot: [-17, 17, 9], crown: { x: 0, y: -H * .6, rx: H * .4, ry: H * .38 }, draw: B => {
        const t = GardenPaintTrees.canvas({ species, season, v: 1, h: H, K: LK }); if (t) B.cx.drawImage(t.c, -t.ox / t.k, -t.oy / t.k, t.c.width / t.k, t.c.height / t.k);
        // the seat round the trunk: a ring of boards on short legs (the back half is behind the trunk)
        // (fix round 1: an open ring of slats on legs, the roots and the grass showing inside it, so it reads as a bench and
        // not as a flat disc the tree stands on)
        B.cx.save(); B.cx.filter = 'blur(2px)'; B.f(B.ell(3, 6, 27, 7.5), '#22301a', .3); B.cx.restore();
        for (const x of [-20, -8, 8, 20]) B.f(B.rect(x - 1.3, -6, 2.6, 11), '#4e3e2a').f(B.rect(x - 1.3, -6, 1, 11), '#7a6446', .7);
        B.cx.save(); const front = new Path2D(); front.rect(-40, -7, 80, 30); B.cx.clip(front);
        const ringAt = dy => new Path2D(B.ell(0, dy, 24, 6.8) + B.ell(0, dy, 15.5, 4.1));
        B.cx.fillStyle = '#6e5436'; B.cx.fill(ringAt(-4.6), 'evenodd'); B.cx.fillStyle = '#b8976a'; B.cx.fill(ringAt(-6.4), 'evenodd');
        for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12, c = Math.cos(a), si = Math.sin(a); B.s(`M${(c * 15.5).toFixed(1)} ${(-6.4 + si * 4.1).toFixed(1)}L${(c * 24).toFixed(1)} ${(-6.4 + si * 6.8).toFixed(1)}`, '#7a5c3a', .7, .75); }
        B.s(B.ell(0, -6.4, 24, 6.8), '#5e4630', .8, .6).f(B.ell(-9, -10.6, 9, 1.4), '#e0c698', .45);
        B.cx.restore();
      } });
    }
    // The village's trees (fix round 1): the plan's planting, which the village had almost none of, so wide stretches read as
    // a flat map. Each belt is a line the trees keep to, loosely, with a reason: birches by the terrace, alders along the
    // west shore and the river, a copse framing the east road, shelter belts above the harbour and the strand, the wood's
    // edge by the forest arch. A tree stands only on open grass (never on a path, a plot, a doorway, water, sand, or behind
    // a building where its picture would cross the house), a good stride from its neighbours. Each is a standing sprite
    // with its trunk's foot shared with walking and a crown that fades when you stand under it; a few textures are shared
    // (species and two shapes), so the whole planting costs a handful of tree pictures.
    if (window.GardenPaintTrees) {
      const BELTS = [
        { pts: [[39.4, 40.2], [41.4, 40.8], [44.2, 40.4]], n: 5, sp: ['birch', 'birch', 'alder'], h: [150, 178] },     // lake birches by the terrace
        { pts: [[34.6, 30.6], [34.8, 34.6], [34.4, 38.6]], n: 4, sp: ['alder', 'birch'], h: [165, 195] },             // the west shore alders
        // (fix round 2: the river belts mixed, uneven and set back from the bridge; six birches in a ruled column down the bank,
        // one of them standing over the bridge's mouth and hiding your legs, read as stickers)
        { pts: [[59.4, 44.6], [60.8, 47.6], [61.2, 50.2]], n: 4, sp: ['alder', 'oak', 'alder', 'hawthorn'], h: [150, 215] },     // by the river, east of the green
        { pts: [[57.4, 46.4], [59.0, 48.4], [58.6, 51.4]], n: 4, sp: ['oak', 'chestnut', 'hawthorn'], h: [185, 225] }, // the copse that frames the east road
        { pts: [[62.0, 60.6], [63.4, 63.4], [61.8, 67.2], [63.0, 71.0]], n: 4, sp: ['alder', 'hawthorn', 'oak', 'alder'], h: [135, 215], jit: 2.2 }, // down the river bank
        { pts: [[56.6, 73.4], [58.4, 74.2], [60.2, 76.2]], n: 4, sp: ['hawthorn', 'oak', 'hawthorn'], h: [140, 190] },  // shelter belt above the harbour
        { pts: [[38.0, 75.2], [40.2, 75.6], [42.6, 75.2]], n: 4, sp: ['hawthorn', 'oak'], h: [140, 185] },            // shelter belt above the strand
        { pts: [[31.0, 54.8], [32.4, 55.8], [31.4, 58.6]], n: 4, sp: ['oak', 'birch', 'chestnut'], h: [180, 220] },    // the wood's edge by the forest arch
      ];
      const routeNear = (x, y) => { for (const [dx, dy] of [[0, 0], [.6, 0], [-.6, 0], [0, .5], [0, -.5]]) { const k = L.kind(x + dx, y + dy); if (k !== 'grass') return true; } return false; };
      const behind = (x, y) => (D.static || []).some(p => p.rearEnvelope && x > p.rearEnvelope.x - .8 && x < p.rearEnvelope.x + p.rearEnvelope.w + .8 && y > p.rearEnvelope.y - .5 && y < p.rearEnvelope.y + p.rearEnvelope.h + 1.2);
      const fieldNear = (x, y) => { for (const [dx, dy] of [[0, 0], [.7, 0], [-.7, 0], [0, .6]]) if (L.plot(x + dx, y + dy) || fieldOfCell().has(Math.floor(x + dx) + ',' + Math.floor(y + dy))) return true; return false; };
      const placed = [], season = C.season, lime = green && green.lime;
      if (lime) placed.push([lime.x, lime.y]);
      BELTS.forEach((b, bi) => {
        const rr = kit.rng(kit.hashStr('vtree|' + bi)), segs = []; let tot = 0; for (let i = 1; i < b.pts.length; i++) { const a = b.pts[i - 1], c = b.pts[i], l = Math.hypot(c[0] - a[0], c[1] - a[1]); segs.push([a, c, l]); tot += l; }
        let made = 0;
        for (let tries = 0; tries < b.n * 6 && made < b.n; tries++) {
          let s = rr() * tot, q = null; for (const [a, c, l] of segs) { if (s <= l) { const t = s / l; q = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]; break; } s -= l; } if (!q) continue;
          const x = q[0] + (rr() - .5) * (b.jit || 1.6), y = q[1] + (rr() - .5) * 1.2, sp = b.sp[Math.floor(rr() * b.sp.length)], v = Math.floor(rr() * 3), h = Math.round((b.h[0] + rr() * (b.h[1] - b.h[0])) / 15) * 15;
          if (!L.free(x, y) || routeNear(x, y) || fieldNear(x, y) || behind(x, y) || placed.some(([px, py]) => Math.hypot((px - x) * 1, (py - y) * 1.5) < 2)) continue;
          placed.push([x, y]); made++;
          const p = L.cpt(x, y), key = 'vtree-' + sp + '-' + v + '-' + h + '|' + season, F = { birch: [.24, .38, .6], alder: [.27, .4, .58], oak: [.46, .33, .6], chestnut: [.38, .37, .6], hawthorn: [.4, .3, .52] }[sp] || [.4, .35, .6], TK = 1.3;
          add([p.x - h * .7, p.y - h * .3, p.x + h * .9, p.y + h * .35], kit.hashStr('vtree-shade|' + bi + '|' + made), B2 => { V.ok(() => GardenPaintTrees.groundShadow(B2.cx, p.x, p.y, h, { species: sp, season })); });
          thing({ key, x: p.x, y: p.y, K: TK, box: [-Math.round(h * (F[0] + .15) + 12), -Math.round(h * 1.1 + 10), Math.round(h * (F[0] + .15) + 12), 18], foot: [-Math.max(7, Math.round(h * .058)), Math.max(7, Math.round(h * .058)), 8], crown: { x: 0, y: -h * F[2], rx: h * F[0], ry: h * F[1] }, draw: B2 => {
            const t = GardenPaintTrees.canvas({ species: sp, season, v, h, K: TK }); if (t) B2.cx.drawImage(t.c, -t.ox / t.k, -t.oy / t.k, t.c.width / t.k, t.c.height / t.k);
          } });
        }
      });
    }
    // planting at the foot of the village's houses: shrubs at the corners, a skirt of leaves and flowers along the wall,
    // never across the door. Ground paint in front of the wall line, so the house stands in a garden, not on a lawn.
    const homes = ['ld-cottage-1', 'ld-cottage-2', 'ld-cottage-3', 'ld-cottage-4', 'land-office', 'garden-shop', 'lake-hall', 'tackle-shop'];
    for (const id of homes) {
      const s = L.stat(id); if (!s) continue; const x0 = s.x * cw, x1 = (s.x + s.w) * cw, y = W.sky + (s.y + s.h) * ch, door = s.door ? (s.door.x + .5) * cw : (x0 + x1) / 2, seed = kit.hashStr('feet|' + id);
      add([x0 - 34, y - 26, x1 + 34, y + 22], seed, (B, r) => {
        const season = C.season, lt = leafTones(season), fl = season === 'winter' ? ['#e8ecef'] : season === 'autumn' ? ['#d8a040', '#c85a3a', '#e0c070', '#9a7ac8'] : ['#d86a7a', '#f2efe2', '#e8a040', '#9a7ac8', '#f0d24a'];
        const free = (x, yy) => { const cx = Math.floor(x / cw), cy = Math.floor((yy - W.sky) / ch), b = gardenIslandBaseCell(cx, cy); return !!b && b.land && !b.freshwater && !b.route && !L.plot(cx, cy); };
        // the skirt
        for (let x = x0 - 6; x <= x1 + 6; x += 6.5) { const yy = y + 2.5 + r() * 2.5, f1 = r(), f2 = r(), f3 = r(), f4 = r(), f5 = r(); if (Math.abs(x - door) < 15 || !free(x, y + 4)) continue; B.f(B.blob(r, x, yy, 6.4, 3.4, 7, .45), lt[1], .9).f(B.blob(r, x - 1, yy - 1.4, 4.2, 2, 6, .45), lt[2], .75); if (season !== 'winter' || f1 < .3) for (const [a, b] of [[f2, f3], [f4, f5]]) B.f(B.circ(x + (a - .5) * 7, yy - 1.5 - b * 2, 1.5), fl[Math.floor(a * fl.length)], .95); }
        // a shrub at each corner
        for (const [x, side] of [[x0 - 9, -1], [x1 + 9, 1]]) { if (!free(x, y + 2)) continue; const yy = y + 1; B.f(B.ell(x + 2, yy + 3, 13, 3.4), '#22301a', .22).f(B.blob(r, x, yy - 4, 12, 8.5, 9, .3), lt[0]).f(B.blob(r, x - 2 * side - 1.5, yy - 6.5, 8.5, 5.4, 8, .3), lt[1]).f(B.blob(r, x - 3, yy - 8.6, 5, 2.8, 7, .3), lt[3], .8); if (season !== 'winter') for (let j = 0; j < 5; j++) B.f(B.circ(x + (r() - .5) * 18, yy - 3 - r() * 8, 1.4), fl[Math.floor(r() * fl.length)], .95); }
      });
    }
  }
  V.parts.push({ id: 'village', compose });
})();
