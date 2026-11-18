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
  const RANK = { hedge: 6, wall: 5, 'hedge-road': 4, stile: 4, drystone: 3, bracken: 2, reeds: 2, 'long-grass': 1, meadow: 1, kerb: 0 };
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
  const SOFT = new Set(['long-grass', 'meadow', 'reeds', 'bracken', 'hedge-road', 'stile']);
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
    // the Mere bank: reeds and reedmace
    reeds: (B, run, C) => {
      const col = C.season === 'winter' ? ['#a89a6a', '#c0b282'] : C.season === 'autumn' ? ['#8a8a40', '#b4a050'] : ['#557a3a', '#7aa04a'], s = run.slice().sort((a, b) => a.y - b.y);
      for (const q of s) B.f(B.ell(q.x + 1, q.y + .6, 5, 1.7), '#22301a', .2);
      for (const q of s) { const r = rngAt(q, 23); for (let k = 0; k < 4; k++) { const x = q.x + (r() - .5) * 7, h = 13 + r() * 10, lean = (r() - .5) * 4; B.s(`M${x} ${q.y}q${lean * .3} ${-h * .6} ${lean} ${-h}`, col[k % 2], 1.2, .95); if (r() < .3) B.f(B.rr(x + lean - 1.1, q.y - h - 4, 2.2, 5.5, 1.1), '#6e4a2c', .95); } }
    },
    kerb: () => {},
  };
  // What grows inside a field that is not yours yet (clipped to the field): the same country as its edge, a little wilder.
  // Laid tile by tile (60 px tiles on one grid, each with its own seed), only the tiles this chunk touches.
  function fill(B, C, f, bb, cb, has, loops) {
    const P = C.P, season = C.season, cw = C.L.cw, ch = C.L.ch, sky = C.W.sky, st = strawTones(season), lt = leafTones(season), edge = f.edge;
    const box = [Math.max(bb[0], cb[0] - 4), Math.max(bb[1], cb[1] - 4), Math.min(bb[2], cb[2] + 4), Math.min(bb[3], cb[3] + 4)]; if (box[2] <= box[0] || box[3] <= box[1]) return;
    const inCell = (x, y) => has.has(Math.floor(x / cw) + ',' + Math.floor((y - sky) / ch)), inF = loops ? (x, y) => { if (!inCell(x, y) && !inCell(x + 14, y) && !inCell(x - 14, y) && !inCell(x, y + 10) && !inCell(x, y - 10)) return false; for (const l of loops) if (inPoly(x, y, l)) return true; return false; } : inCell;
    const wash = edge === 'bracken' ? [P.floor, .78] : edge === 'reeds' ? ['#7e8a52', .7] : edge === 'meadow' ? [st[1], .6] : edge === 'long-grass' || edge === 'hedge-road' ? [st[0], .5] : [P.lawnLo, .5];
    B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), P.lawn).f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), wash[0], wash[1]);
    const T = 60, tall = edge === 'meadow' || edge === 'long-grass' || edge === 'hedge-road', salt = KIT().hashStr('fill|' + f.id) & 0xffff;
    // light and shade in soft drifts, so no field is one flat colour (from the tiles round about too: a drift is wide)
    KIT().tiles(box, T, 46, salt + 1, (tx, ty, r) => { for (let k = 0; k < 2; k++) { const x = tx + r() * T, y = ty + r() * T, rx = 26 + r() * 30, ry = 9 + r() * 10, lift = r() < .5, a = .12 + r() * .08; if (inF(x, y)) B.f(B.blob(r, x, y, rx, ry, 8, .5), lift ? P.lawnHi : '#3e5a2a', a); } });
    if (edge === 'long-grass') {
      // the slope's strips: long beds lying along the contour, gone back to grass, still showing in the sward
      const x0 = Math.floor((box[0] - 30) / 24) * 24;
      for (let k = 0, y = bb[1] - 8; y < bb[3] + 8; y += 15, k++) { if (y < box[1] - 12 || y > box[3] + 12) continue; const pts = []; for (let x = x0; x <= box[2] + 30; x += 24) pts.push({ x, y: y + Math.sin(x * .011 + y * .004) * 6 }); V.strokePts(B, pts, k % 2 ? '#5a6e30' : st[2], 7, .16); }
    }
    KIT().tiles(box, T, 14, salt + 2, (tx, ty, r) => {
      const at = () => [tx + r() * T, ty + r() * T];
      if (edge !== 'bracken') for (let k = 0, n = tall ? 62 : 32; k < n; k++) { const [x, y] = at(), hh = 4 + r() * (tall ? 8 : 5), lean = (r() - .5) * 4, t = r(), t2 = r(); if (inF(x, y)) B.s(`M${x} ${y}q${lean * .3} ${-hh * .6} ${lean} ${-hh}`, t < .4 ? P.lawnLo : t < .7 ? '#566e30' : st[Math.floor(t2 * 3)], 1, .8); }
      if (edge === 'meadow' && season !== 'winter') { const fl = season === 'autumn' ? ['#e8dcc0', '#d8a040', '#c85a3a'] : ['#d8402e', '#e8553a', '#f4f0e0', '#f0d24a', '#8ab0e0']; for (let k = 0; k < 24; k++) { const [x, y] = at(), up = 3 + r() * 5, s = 1.3 + r() * .8, c = fl[Math.floor(r() * fl.length)]; if (inF(x, y)) B.f(B.circ(x, y - up, s), c, .95); } }
      if (edge === 'bracken') {
        const leaf = season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c', '#e0b050'] : season === 'winter' ? ['#8a7a5a', '#a0906a', '#6e6450'] : ['#7d8f4e', '#6a7c40', '#94a058', '#8a7a4a'];
        for (let k = 0; k < 50; k++) { const [x, y] = at(), a = 1.6 + r() * 1.6, b = 1 + r() * .8, c = leaf[Math.floor(r() * leaf.length)]; if (inF(x, y)) B.f(B.ell(x, y, a, b), c, .8); }
        // deep bracken all through it (a thicket you cannot see into, not a ring round an empty middle), a foxglove here and there
        const pts = []; for (let k = 0; k < 19; k++) { const [x, y] = at(), big = 1.05 + r() * .55; if (inF(x, y) && inF(x, y - 9)) pts.push({ x, y, big }); } STYLE.bracken(B, pts, C);
        if (season !== 'winter') for (let k = 0; k < 2; k++) { const [x, y] = at(), h = 15 + r() * 7, bell = season === 'autumn' ? '#b98a6a' : '#c66a9a', go = r() < .45; if (!go || !inF(x, y) || !inF(x, y - 22)) continue; B.s(`M${x} ${y}q1 ${-h * .5} 0 ${-h}`, '#5a6e3a', 1.3, .9); for (let j = 0; j < 5; j++) B.f(B.ell(x + (j % 2 ? 1.5 : -1.5), y - h + j * 2.6, 1.5, 1.9), bell, .92); }
      }
      if (edge === 'reeds') { const pts = []; for (let k = 0; k < 5; k++) { const [x, y] = at(); if (inF(x, y) && inF(x, y - 12)) pts.push({ x, y }); } STYLE.reeds(B, pts, C); for (let k = 0; k < 2; k++) { const [x, y] = at(), w = 8 + r() * 8; if (inF(x, y)) B.f(B.blob(r, x, y, w, 2.4, 7, .5), '#5e7a6a', .35); } }
      if (edge === 'wall') {
        // rough grass all through it, nettles in clumps, the lines of the old beds still showing, a cold frame's bones
        for (let k = 0; k < 34; k++) { const [x, y] = at(), hh = 4 + r() * 7, lean = (r() - .5) * 4, t = r(); if (inF(x, y)) B.s(`M${x} ${y}q${lean * .3} ${-hh * .6} ${lean} ${-hh}`, t < .45 ? '#566e30' : t < .8 ? P.lawnLo : st[Math.floor(t * 3) % 3], 1.1, .8); }
        for (let k = 0; k < 2; k++) { const [x, y] = at(), w = 16 + r() * 14; if (inF(x - w / 2, y) && inF(x + w / 2, y)) B.f(B.rr(x - w / 2, y - 2.6, w, 5.2, 2.4), '#6a5034', .28).f(B.rr(x - w / 2 + 1, y - 1.8, w - 2, 2.2, 1), '#8a6c4a', .22); }
        for (let k = 0; k < 3; k++) { const [x, y] = at(), rx = 8 + r() * 7; if (!inF(x, y) || !inF(x, y - 12)) continue; B.f(B.ell(x + 1, y + 1, rx, 2.6), '#22301a', .2); for (let j = 0; j < 6; j++) { const dx = (r() - .5) * rx * 1.6, hh = 8 + r() * 7; B.s(`M${x + dx} ${y}q${(r() - .5) * 2} ${-hh * .5} ${(r() - .5) * 3} ${-hh}`, lt[1], 1.3, .9); B.f(B.blob(r, x + dx, y - hh * .7, 2.6, 1.6, 5, .4), lt[r() < .5 ? 0 : 2], .9); } }
        for (let k = 0; k < 2; k++) { const [x, y] = at(); if (!inF(x, y) || !inF(x, y - 10)) continue; B.tufts(r, x, y, 12, 6, [lt[1], lt[2], P.lawnLo], 9); if (season !== 'winter') for (let j = 0; j < 3; j++) B.f(B.circ(x + (r() - .5) * 10, y - 6 - r() * 4, 1.2), '#c79ac0', .9); }   // willowherb come up through the old beds
        { const [x, y] = at(); if (inF(x, y) && r() < .7) B.f(B.rr(x, y, 5.4, 3, 1), '#8a5642', .8).f(B.rr(x + 4, y + 2, 4.6, 2.6, 1), '#96604a', .8); }
      }
      if (edge === 'hedge-road') for (let k = 0; k < 3; k++) {   // young trees: whips on stakes
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
        { const [x, y] = at(), go = r(); if (go < .45 && inF(x, y) && inF(x, y - 14)) { for (let j = 0; j < 3; j++) { const dx = (j - 1) * 2.4 + (r() - .5), hh = 10 + r() * 6; B.s(`M${x + dx} ${y}q${dx * .3} ${-hh * .5} ${dx * .8} ${-hh}`, '#5a6e3a', 1.3, .9); B.f(B.ell(x + dx * 1.8, y - hh - 1.5, 1.3, 3), season === 'winter' ? '#7a6a52' : '#8a5a3a', .9); } B.f(B.blob(r, x, y, 7, 2.6, 7, .4), lt[1], .8); } }   // a clump of dock gone to seed
      }
    });
  }
  // the sign at a field's gate: a small board on a post saying what the next piece of it needs, its level or its price
  function sign(B, x, y, row, lv) {
    const lvNeed = row.lv || 0, coin = lv >= lvNeed && !!row.buy, txt = lv < lvNeed ? 'Lv ' + lvNeed : row.buy ? String(row.buy) : ''; if (!txt) return;
    B.f(B.ell(x + 1, y + 1, 7, 2), 'rgba(40,40,24,.25)');
    B.f(B.rect(x - 1.2, y - 17, 2.4, 17), '#5e4c36').f(B.rect(x - 1.2, y - 17, 1, 17), '#8a7454', .7);
    const cx = B.cx; cx.save(); cx.font = '700 7.5px system-ui, sans-serif';
    const w = Math.max(16, cx.measureText(txt).width + (coin ? 7 : 0) + 6), x0 = x - w / 2, y0 = y - 29;
    B.f(B.rr(x0 + .8, y0 + 1, w, 12, 2), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 12, 2), '#c9a876').f(B.rr(x0, y0, w, 3.5, 1.5), '#dcc092', .8).s(B.rr(x0, y0, w, 12, 2), '#6e5434', .8, .9);
    let tx = x0 + 3;
    if (coin) { B.f(B.circ(tx + 2.5, y0 + 6, 2.8), '#e8b830').f(B.circ(tx + 2.5, y0 + 6, 1.5), '#f6d870'); tx += 7; }
    cx.fillStyle = '#3e2c1a'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 6.4); cx.restore();
  }
  // the one gate: across a cell's edge (g.horiz: seen from the front) or along it (seen from the side)
  function gate(B, g, kind) {
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

  /** What a field is now: its locked cells, their rounded outline, the runs of edge that face ground you can walk on, its gate. */
  function shape(f, C, lv) {
    const W = C.W, cw = C.L.cw, ch = C.L.ch, cells = [], lockedSecs = [];
    for (const s of f.sections) { const cs = cellsOf(s); if (cs.length && lockedAt(cs[0][0], cs[0][1], lv)) { lockedSecs.push(s); for (const c of cs) cells.push(c); } }
    if (!cells.length) return null;
    const key = f.id + '|' + lv + '|' + lockedSecs.join(','), hit = memo.get(key); if (hit) return hit;
    const mine = new Set(cells.map(c => c[0] + ',' + c[1]));
    const soft = SOFT.has(f.edge), loops = outline(cells).map(l => { const q = soften(l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })), soft ? 30 : 20, soft ? .5 : .42); return soft ? wander(q, 5) : q; });
    const walk = (x, y) => { const cx = Math.floor(x / cw), cy = Math.floor((y - W.sky) / ch); if (mine.has(cx + ',' + cy)) return false; const b = gardenIslandBaseCell(cx, cy), row = gardenLandCell(cx, cy); return !!b && b.land && !b.freshwater && !b.solid && !(row && row.solid) && !lockedAt(cx, cy, lv); };
    const roadAt = (x, y) => { const b = gardenIslandBaseCell(Math.floor(x / cw), Math.floor((y - W.sky) / ch)); return !!(b && b.route); };
    // where this field meets another field that is also shut, the firmer of the two edges stands on the line between them
    // (so Wren's hedge runs all the way round, and the old wall of the glasshouse garden is built up against it)
    const mineRank = RANK[f.edge] || 0, shutNeighbour = (x, y) => { if (mineRank < 3) return false; const cx = Math.floor(x / cw), cy = Math.floor((y - W.sky) / ch), o = fieldOfCell().get(cx + ',' + cy); return !!o && o !== f && mineRank > (RANK[o.edge] || 0) && lockedAt(cx, cy, lv); };
    // the edge stands just inside the outline (so its top never reaches over ground you stand on behind it)
    const runs = [], all = []; let n = 0;
    for (const l of loops) {
      const pts = V.walk(l.concat([l[0]]), f.edge === 'long-grass' || f.edge === 'meadow' || f.edge === 'reeds' ? 3.6 : f.edge === 'bracken' ? 9 : 4.4); let run = [];
      for (const q of pts) {
        const open = walk(q.x + q.ty * 12, q.y - q.tx * 9) || shutNeighbour(q.x + q.ty * 12, q.y - q.tx * 9), inset = Math.abs(q.tx) > Math.abs(q.ty) ? (q.tx > 0 ? 8.5 : 2.5) : 4.5;   // (the north side stands further in: the piece is drawn upward from its foot)
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
    // back to front: pieces of edge with the gate's gap cut out of them
    const gap = q => g && Math.abs(q.x - g.x) < (g.horiz ? g.len / 2 + 1 : 7) && Math.abs(q.y - g.y) < (g.horiz ? 8 : g.len / 2 + 1);
    const pieces = []; for (const run of runs) { let cur = []; for (const q of run) { if (gap(q)) { if (cur.length) pieces.push(cur); cur = []; } else cur.push(q); } if (cur.length) pieces.push(cur); }
    const rows = lockedSecs.map(rowOf).filter(Boolean).sort((a, b) => (a.lv || 0) - (b.lv || 0) || (a.buy || 0) - (b.buy || 0));
    const out = { has: mine, loops, path: pathOf(loops), pieces, gate: g, next: rows[0] || null };
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
    if (!pts) { pts = []; for (const raw of outline(cells)) { const loop = soften(raw.map(q => ({ x: q[0] * cw, y: W.sky + q[1] * ch })), 22); for (const q of V.walk(loop.concat([loop[0]]), 4.2)) pts.push(q); } if (memo.size > 60) memo.clear(); memo.set(key, pts); }
    const P = C.P, season = C.season, lv = level();
    // Turf right up to the dug edge, all the way round. (The ground under the painting is cut square to the bed's cells,
    // and a road beside it is cut away too: between a rounded bed and a road that left a ruled strip of plain ground.)
    // Not where the next cell out is more soil, or a field that is still shut: its own edge stands there.
    { const turf = new Path2D(); let any = false;
      for (const q of pts) { if (!inBox(q, cb, 20)) continue; const ox = q.ty, oy = -q.tx, cx = Math.floor((q.x + ox * 9) / cw), cy = Math.floor((q.y + oy * 7 - W.sky) / ch);
        if (soilAt(cx, cy) || lockedAt(cx, cy, lv)) continue; const x = q.x + ox * 5.5, y = q.y + oy * 5.5; turf.moveTo(x + 8.5, y); turf.arc(x, y, 8.5, 0, Math.PI * 2); any = true; }
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
      // (a grown field has no line round it: its colour runs out a little way into the lawn and thins there)
      if (grown) { B.cx.save(); B.cx.filter = 'blur(5px)'; B.s(S.path, f.edge === 'bracken' ? C.P.floor : f.edge === 'reeds' ? '#7e8a52' : strawTones(C.season)[0], 9, .3); B.cx.restore(); }
      B.cx.save(); B.cx.clip(S.path, 'nonzero'); fill(B, C, f, bb, cb, S.has, S.loops);
      // a soft shade just inside the edge, so the field sits in the ground
      B.cx.filter = 'blur(2.5px)'; B.s(S.path, '#2a3a1c', 6, grown ? .1 : .22); B.cx.filter = 'none'; B.cx.restore();
      const g = S.gate, edge = STYLE[f.edge] || STYLE.hedge, kind = f.edge === 'hedge' ? 'wicket' : 'field';
      // the orchard keeps its hedge to the road side; away from the road the long grass is its edge
      const paint = part => { if (!part.length) return; if (f.edge === 'hedge-road') { const road = part.filter(q => q.road), off = part.filter(q => !q.road); if (off.length) STYLE['long-grass'](B, off, C, { tall: 1.1 }); if (road.length) edge(B, road, C); } else edge(B, part, C); };
      // back to front: the far edges, then the gate and its sign, then the near edges over them
      const gy = g ? g.y : Infinity, near = S.pieces.map(p => p.filter(q => inBox(q, cb)));
      for (const p of near) paint(p.filter(q => q.y <= gy));
      if (g && g.x > cb[0] - 60 && g.x < cb[2] + 60 && g.y > cb[1] - 20 && g.y < cb[3] + 50) {
        gate(B, g, kind);
      }
      for (const p of near) paint(p.filter(q => q.y > gy));
      // (the sign last: reeds, long grass or a hedge end right beside the gate never stand across its board)
      if (g && S.next && g.x > cb[0] - 60 && g.x < cb[2] + 60 && g.y > cb[1] - 20 && g.y < cb[3] + 50) { const sx = g.horiz ? g.x + g.len / 2 + 5 : g.x + (g.east ? 8 : -8), sy = g.horiz ? g.y + 1 : g.y + g.len / 2 + 3; sign(B, sx, sy, S.next, lv); }
      if (f.edge === 'meadow') { B.cx.save(); const out = new Path2D(); out.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120); out.addPath(S.path); B.cx.clip(out, 'evenodd'); B.s(S.path, C.P.lawnHi, 9, .3); B.cx.restore(); }   // the mown edge round the uncut meadow
    }
    // land of this field that is yours and not yet dug: pegged out with string, so you can see what is yours
    for (const id of f.sections) {
      const row = rowOf(id), cs = cellsOf(id); if (!row || row.kind === 'green' || !cs.length || lockedAt(cs[0][0], cs[0][1], lv) || SOIL.has(C.L.mat(cs[0][0], cs[0][1]))) continue;
      const W = C.W, cw = C.L.cw, ch = C.L.ch, raw = outline(cs).map(l => l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })));
      const loops = raw.map(l => soften(l.map((p, i, a) => { const mx = a.reduce((t, q) => t + q.x, 0) / a.length, my = a.reduce((t, q) => t + q.y, 0) / a.length, dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy) || 1; return { x: p.x + dx / d * 4, y: p.y + dy / d * 3 }; }), 9)), path = pathOf(loops);
      B.cx.save(); B.cx.clip(path, 'nonzero'); B.f(path, '#c8d08a', .1); B.cx.filter = 'blur(2px)'; B.s(path, '#4a3e26', 5, .2); B.cx.filter = 'none'; B.cx.restore();
      B.s(path, '#5a4a30', 2, .3).s(path, '#efe6c8', .9, .85);   // the spade cut and the string along it
      for (const l of loops) for (const q of V.walk(l.concat([l[0]]), 46)) { B.f(B.ell(q.x + 1, q.y + .8, 2.6, 1), '#22301a', .25); B.post(q.x, q.y - 7, q.y + .5, 2.2, ['#b89a6a', '#8a6c46', '#e0c898']); }   // pegs
    }
    bedEdges(B, C, f, cb);
  }

  /* ---------- the planters: land that is yours from the start, kerbed on the lawn ---------- */
  function drawPlanter(B, r, C, id, lawn) {
    const lv = level(), cs = cellsOf(id); if (!cs.length || lockedAt(cs[0][0], cs[0][1], lv)) return;
    const W = C.W, cw = C.L.cw, ch = C.L.ch, loops = outline(cs).map(l => soften(l.map(p => ({ x: p[0] * cw, y: W.sky + p[1] * ch })).map((p, i, a) => { const mx = a.reduce((s, q) => s + q.x, 0) / a.length, my = a.reduce((s, q) => s + q.y, 0) / a.length, dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy) || 1; return { x: p.x + dx / d * 4, y: p.y + dy / d * 3 }; }), 13));
    const path = pathOf(loops), season = C.season, lt = leafTones(season);
    const flowers = season === 'winter' ? ['#f4f6f2', '#e8ecef'] : season === 'autumn' ? ['#e8dcc0', '#d8a040', '#c85a3a', '#e0c070', '#9a7ac8'] : season === 'spring' ? ['#f2efe2', '#e8c84a', '#d88aa8', '#9ab0e0'] : ['#f4f0e0', '#f0d24a', '#c79ac0', '#e88a8a', '#8ab0e0'];
    B.cx.save(); if (lawn) B.cx.clip(lawn, 'nonzero');
    // the panel: a finer, lighter lawn than the green round it
    B.f(path, season === 'winter' ? '#c2ccb4' : season === 'autumn' ? '#b4bc6c' : '#a8c86a', .26);
    // its border: a narrow bed of flowers all the way round, inside a low stone edging (a curved flower border, not a string of stones)
    B.cx.save(); B.cx.clip(path, 'nonzero');
    B.cx.filter = 'blur(1.5px)'; B.s(path, '#33281a', 21, .26); B.cx.filter = 'none';
    B.s(path, season === 'winter' ? '#6e5c4a' : '#6b4f38', 15, .92);
    B.cx.restore();
    for (const l of loops) for (const q of V.walk(l.concat([l[0]]), 4.4)) {
      const o = 2 + r() * 4.2, x = q.x - q.ty * o, y = q.y + q.tx * o, t = r(), bloom = r(), dx = (r() - .5) * 4, up = 1.2 + r() * 1.8, sz = 1.3 + r() * .7, col = flowers[Math.floor(r() * flowers.length)];
      B.f(B.blob(r, x, y, 3.8 + t * 1.8, 2.5 + t, 6, .4), lt[t < .45 ? 1 : t < .85 ? 2 : 3], .94);
      if (season === 'winter' ? bloom < .1 : bloom < .78) B.f(B.circ(x + dx, y - up, sz), col, .96);
    }
    // drifts of low planting across the middle: cushions of leaf with the same flowers, thinner than at the edge, so the
    // border reads as a bed and what you plant in it still stands clear
    { const xs = loops.flatMap(l => l.map(q => q.x)), ys = loops.flatMap(l => l.map(q => q.y)), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), n = Math.round((x1 - x0) * (y1 - y0) / 150);
      B.cx.save(); B.cx.clip(path, 'nonzero'); B.f(path, season === 'winter' ? '#6e6450' : '#5e5236', .2);
      for (let k = 0; k < n; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), t = r(), w = 4.5 + r() * 4.5, bloom = r(), col = flowers[Math.floor(r() * flowers.length)], dx = (r() - .5) * 5, up = 1 + r() * 2, go = r(); if (go < .28) continue;
        B.f(B.blob(r, x, y, w, 2.4 + t * 1.2, 6, .4), lt[t < .4 ? 0 : t < .8 ? 1 : 2], t < .4 ? .55 : .88);
        if (season === 'winter' ? bloom < .08 : bloom < .5) B.f(B.circ(x + dx, y - up, 1.2 + bloom), col, .95); }
      B.cx.restore(); }
    // the edging: one low line of honey stone with its joints, lit along the top
    B.s(path, '#4e4230', 4.2, .3).s(path, '#c9b68e', 2.8, 1);
    B.cx.save(); B.cx.translate(-.3, -.7); B.s(path, '#efe2be', 1, .55); B.cx.restore();
    for (const l of loops) for (const q of V.walk(l.concat([l[0]]), 6.4)) B.s(`M${q.x - q.ty * 1.5} ${q.y + q.tx * 1.5}L${q.x + q.ty * 1.5} ${q.y - q.tx * 1.5}`, '#8a7858', .8, .65);
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
      for (const s of f.sections) { const row = rowOf(s); if (!row || row.kind !== 'green') continue; const cs = (D.sectionCells || {})[s] || []; if (!cs.length) continue;
        const sx = cs.map(c => c[0]), sy = cs.map(c => c[1]), pb = [Math.min(...sx) * cw - 12, W.sky + Math.min(...sy) * ch - 14, (Math.max(...sx) + 1) * cw + 12, W.sky + (Math.max(...sy) + 1) * ch + 12];
        const onLawn = !!lawnPts && cs.filter(c => inPoly((c[0] + .5) * cw, W.sky + (c[1] + .5) * ch, lawnPts)).length * 2 > cs.length;
        add(pb, kit.hashStr('planter|' + s), (B, r) => drawPlanter(B, r, C, s, onLawn ? lawn : null));
      }
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
        B.f(B.ell(1, 4, 25, 7), '#22301a', .28);
        for (const x of [-17, -6, 6, 17]) B.f(B.rect(x - 1.2, -3, 2.4, 7), '#5e4c36');
        B.cx.save(); const front = new Path2D(); front.rect(-40, -2.5, 80, 30); B.cx.clip(front);
        B.f(B.ell(0, -2, 23, 6.4), '#8a6c46').f(B.ell(0, -3.4, 23, 6.4), '#b8976a').s(B.ell(0, -3.4, 16.5, 4.2), '#8a6c46', 1, .7).f(B.ell(-6, -5.2, 12, 2), '#d8bc8e', .5);
        B.cx.restore();
      } });
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
