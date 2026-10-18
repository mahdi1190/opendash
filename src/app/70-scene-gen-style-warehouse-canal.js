/* Scene engine v2, building style: CANAL WAREHOUSE (17 Oct, detail/castlefield: "red-brick warehouses on the quay"). Reusable for any canal city
   (Manchester, Birmingham, Leeds, Nottingham, the Lancaster and Leeds-Liverpool basins). Pure data plus a facade layout and one block kind.
     'canal-warehouse'  4 to 5 storeys of dark red brick, the storeys stepping down toward the roof: a tall ground floor of round-headed
                        loading arches (cart doors, steel shutters, a few dark open bays), a stone string course over it, tall arched cast-iron
                        windows on the first two floors, segment heads above, flat heads under the eaves; a taking-in bay (stacked loading
                        doors) under a LUCAM: the timber hoist hood with its gable and a beam, standing out of the roof over it (a second one on
                        a long frontage). No lettering, no signs, no flags. */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function' || typeof sceneBuildingStyle !== 'function') return;
  const base = sceneBuildingStyle('mill');
  if (!base) return;
  const COLS = ['#7d3b2d', '#88412f', '#73372a', '#8e4634', '#7a3a2e'];
  sceneBuildingStyleDefine('canal-warehouse', Object.assign({}, base, {
    label: 'Canal warehouse (dark red brick, loading arches, lucam)', eras: [1790, 1900], regions: ['uk', 'north', 'midlands'], grouping: 'block',
    storeys: [4, 5], storeyH: [5.0, 4.0], frontage: [34, 72], depth: [14, 18], roof: 'pitched-side', pitch: 17,
    wall: { cols: COLS, grime: '#201b18', texture: 'brick', mortar: '#b1a38a', patches: true },
    roofMat: { cols: ['#3a3f46', '#41464d'], kind: 'slate' },
    dress: { cols: ['#bfb6a0', '#b3aa94'] },
    plinth: 1.0,
    win: { clipBars: true, type: 'metal', panes: [3, 4], w: 1.5, hk: 0.66, sill: 1.0, head: 'round', recess: 0.3, grade: [1, 1, 0.94, 0.88, 0.82], lintelCol: 'wall', frames: ['#2c3034', '#363a3e', '#3a2c26'], glass: ['#2a343d', '#303a44', '#262e36'] },
    door: { w: 1.4, h: 2.6, fan: false, panels: 0, recess: 0.3, cols: ['#3a2a1e', '#2a3a2e', '#30363a'] },
    bands: [{ storey: 1, h: 0.42, col: 'dress' }, { storey: 3, h: 0.2, col: '#68301f' }],
    details: { downpipe: 0.9, alarm: 0, boxes: 0, ivy: 0.12 },
    night: { on: 0.3, curtain: 0, tv: 0 },
    sideWindows: true,
    party: 'none',
    // the gable ends and the rear: the same arched windows in the same bays, the ground floor a row of loading arches too
    side(sp, face, model, out) {
      const len = face.plane.len, nS = sp.storeys, zs = sp.zs, n = Math.max(1, Math.round(len / 4.7)), { c, w: colW } = _scbgCols(len, n, 0.9);
      for (let f = 0; f < nS; f++) for (let i = 0; i < n; i++) {
        if (f === 0) { if (i === Math.floor(n / 2) || n < 3) out.elems.push({ k: 'door', s: c[i] - 1.5, z: 0.02, w: 3.0, h: Math.min(zs[1] - 1.25, 3.9), head: 'round', col: '#3a2a1e', panels: 0, planks: true, recess: 0.4 }); continue; }
        out.elems.push(_scbgWin(sp, f, c[i], colW, { head: f <= 2 ? 'round' : f >= nS - 1 ? 'flat' : 'seg', w: Math.min(1.5 - 0.04 * f, colW * 0.62) }));
      }
    },
    front(sp, face, model, out) {
      const len = face.plane.len, nS = sp.storeys, zs = sp.zs, rr = sceneRnd(sceneHash('cwh|' + sp.seed + '|' + len.toFixed(1)));
      const n = Math.max(2, Math.round(len / 4.7)), { c, w: colW } = _scbgCols(len, n, 0.9);
      const load = n >= 4 ? Math.max(1, Math.min(n - 2, Math.floor(n * (0.3 + 0.4 * rr())))) : -1;
      const load2 = n >= 9 ? (load + Math.floor(n / 2)) % n : -1;
      const doorCols = ['#3a2a1e', '#40301f', '#2c3a2e', '#30363a', '#46301f'], hG = Math.min(zs[1] - 1.25, 3.9);
      for (let i = 0; i < n; i++) {
        // the ground floor: round-headed loading arches, mostly cart doors, some steel shutters, a few open dark bays
        const k = rr(), w = Math.min(3.1, colW * 0.72);
        if (k < 0.2) out.elems.push({ k: 'door', s: c[i] - w / 2, z: 0.02, w, h: hG, head: 'round', col: '#14100e', panels: 0, recess: 0.45 });
        else out.elems.push({ k: 'door', s: c[i] - w / 2, z: 0.02, w, h: hG, head: 'round', col: k < 0.35 ? '#2f4a3a' : doorCols[Math.floor(rr() * doorCols.length)], panels: 0, planks: k >= 0.35, recess: 0.4 });
      }
      for (let f = 1; f < nS; f++) for (let i = 0; i < n; i++) {
        if ((i === load || i === load2) && f === nS - 1) continue;   // the lucam's own doors stand here
        if (i === load || i === load2) {
          out.elems.push({ k: 'door', s: c[i] - 0.8, z: zs[f] + 0.05, w: 1.6, h: Math.min(2.5, zs[f + 1] - zs[f] - 0.55), head: 'seg', col: doorCols[(i + f) % doorCols.length], panels: 0, planks: true, recess: 0.22, loading: true });
          continue;
        }
        out.elems.push(_scbgWin(sp, f, c[i], colW, { head: f <= 2 ? 'round' : f >= nS - 1 ? 'flat' : 'seg', w: Math.min(1.5 - 0.04 * f, colW * 0.62) }));
      }
      for (const L of [load, load2]) if (L >= 0) {
        // the hoist beam over the taking-in doors and the lucam, the hood in the roof over them
        out.blocks.push({ kind: 'lucam', s0: c[L] - 1.15, s1: c[L] + 1.15, z0: zs[nS] - 2.7, z1: model.E0 + 0.9, d: 1.05 });
      }
    },
  }));
  if (typeof _scbgBlockKinds !== 'object') return;
  /** The lucam: a timber hoist hood standing out of the roof over the taking-in doors: a box with double doors, a gable, a hoist beam. */
  _scbgBlockKinds.lucam = function (bk, wall, sp) {
    const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = [], d = bk.d, a = bk.s0, b = bk.s1, z0 = bk.z0, z1 = bk.z1, m = (a + b) / 2, zr = z1 + (b - a) * 0.42;
    const timber = '#5b4634', roof = sp.roofCol || '#3a3f46', frontPlane = Object.assign({}, pl, { O: [pl.O[0] + pl.N[0] * d, pl.O[1], pl.O[2] + pl.N[2] * d] });
    const mk = (poly, col, extra) => Object.assign({ poly, n: _scbgNormal(poly, true), part: 'body', role: 'block', col, elems: [], flat: true }, extra || {});
    const front = { poly: [X(a, d, z0), X(b, d, z0), X(b, d, z1), X(a, d, z1)], n: pl.N, part: 'wall', role: 'lucam', col: timber, plane: frontPlane, flat: true, elems: [], edge: wall.edge };
    front.elems.push({ k: 'door', s: a + 0.18, z: z0 + 0.12, w: b - a - 0.36, h: Math.max(0.8, z1 - z0 - 0.3), head: 'flat', col: '#2c2118', panels: 0, planks: true, recess: 0.06, loading: true });
    faces.push(front);
    faces.push({ poly: [X(a, d, z1), X(b, d, z1), X(m, d, zr)], n: pl.N, part: 'wall', role: 'gable', col: _scbgLight(timber, 0.05), plane: frontPlane, flat: true, elems: [], edge: wall.edge });
    for (const [s, sd] of [[a, -1], [b, 1]]) {
      const poly = sd < 0 ? [X(s, 0, z0), X(s, d, z0), X(s, d, z1), X(s, 0, z1)] : [X(s, d, z0), X(s, 0, z0), X(s, 0, z1), X(s, d, z1)];
      faces.push(mk(poly, _scbgDark(timber, 0.18), { n: [pl.U[0] * sd, 0, pl.U[2] * sd], part: 'wall', role: 'lucam-side' }));
    }
    // the two slopes of the little gabled roof
    faces.push(mk([X(a - 0.12, 0, z1 - 0.05), X(a - 0.12, d + 0.12, z1 - 0.05), X(m, d + 0.12, zr), X(m, 0, zr)], roof, { part: 'roof', role: 'roof' }));
    faces.push(mk([X(m, 0, zr), X(m, d + 0.12, zr), X(b + 0.12, d + 0.12, z1 - 0.05), X(b + 0.12, 0, z1 - 0.05)], roof, { part: 'roof', role: 'roof' }));
    // the hoist beam standing out of the gable's apex, and its post
    faces.push(mk([X(m - 0.07, d, zr - 0.05), X(m + 0.07, d, zr - 0.05), X(m + 0.07, d + 1.0, zr - 0.2), X(m - 0.07, d + 1.0, zr - 0.2)], '#1f1a15', { part: 'roof', role: 'beam' }));
    return faces;
  };
})();
