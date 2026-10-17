/* ---------- a churchyard headstone as a real 3D model (17 Oct, the Cotswold green: "no headstones") ----------
   structure.headstone: the upright slab of an English churchyard in one of five heads (round, pointed, square, shouldered, ogee scroll),
   or (a few in ten) a chest tomb with its cap slab; a stone a little out of true (it leans by seed), set on a low plinth, weathered
   (lichen and moss, a sunk base, a chipped edge), with faint rows where an inscription would be (never readable). 0.6 m wide, 0.9 m high,
   0.1 m thick at size 1 (a chest tomb 1.9 x 0.9 x 0.8). The broad face looks along `facing`. opts: shape ('round' | 'pointed' | 'square' |
   'shoulder' | 'ogee' | 'chest'), lean (degrees, default seeded -4..5). Livery: slate, limestone, sandstone, granite, marble. */
const _WMD_HS_LIVERIES = Object.freeze([
  { name: 'limestone', stone: '#bdb59d', lichen: '#9fa457' },
  { name: 'slate', stone: '#767b7f', lichen: '#a7a85c' },
  { name: 'sandstone', stone: '#a98c68', lichen: '#9ea35a' },
  { name: 'granite', stone: '#55585e', lichen: '#8e9660' },
  { name: 'marble', stone: '#d6d3c8', lichen: '#a6a96a' },
]);
const _WMD_HS_SHAPES = Object.freeze(['round', 'pointed', 'square', 'shoulder', 'ogee']);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.headstone'))) sceneObjDefine({
  id: 'structure.headstone', category: 'structure', size: [48, 66], variants: 1, seasonal: false, flippable: true, real: { h: 0.9, l: 0.62, w: 0.12 },
  palette: { base: { stone: '#bdb59d', dark: '#7b8179' } }, parts: ['body'],
  tags: ['uk', 'village', 'churchyard', 'unlit', 'kit:temperate', 'role:street', 'class:street'],
  credit: 'a churchyard headstone (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@stone', 'M-22 0V-44Q0 -70 22 -44V0Z'], ['@dark', 'M-26 0V-6H26V0Z']] }; },
});
/** The head's outline [[u, v]...] (u across from -hw to hw, v up from 0 to hh), from the bottom left round the top to the bottom right. */
function _wmdHsProfile(shape, hw, hh) {
  const L = [[-hw, 0]];
  if (shape === 'round') { L.push([-hw, 0.62 * hh]); for (let i = 1; i <= 6; i++) { const t = i / 6 * Math.PI / 2; L.push([-hw * Math.cos(t), 0.62 * hh + 0.38 * hh * Math.sin(t)]); } }
  else if (shape === 'pointed') { L.push([-hw, 0.6 * hh]); for (let i = 1; i <= 6; i++) { const t = i / 6; L.push([-hw * (1 - t), 0.6 * hh + 0.4 * hh * Math.pow(t, 0.75)]); } }
  else if (shape === 'shoulder') { L.push([-hw, 0.76 * hh], [-0.72 * hw, 0.84 * hh]); for (let i = 1; i <= 5; i++) { const t = i / 5 * Math.PI / 2; L.push([-0.72 * hw * Math.cos(t), 0.84 * hh + 0.16 * hh * Math.sin(t)]); } }
  else if (shape === 'ogee') { L.push([-hw, 0.7 * hh]); for (let i = 1; i <= 8; i++) { const t = i / 8; L.push([-hw * (1 - t), 0.7 * hh + 0.3 * hh * t * t * (3 - 2 * t)]); } }
  else L.push([-hw, 0.94 * hh], [-0.92 * hw, hh], [0, hh]);
  return [...L, ...L.slice(1, -1).reverse().map(([x, y]) => [-x, y]), [hw, 0]];
}
worldModelDefine('headstone', {
  name: 'Churchyard headstone', ids: ['structure.headstone'], sampleObj: 'structure.headstone', solidity: 'passable', faceCap: 160,
  dims() { return { L: 0.14, B: 0.62, H: 0.9 }; },
  liveries: () => _WMD_HS_LIVERIES,
  samples: [{ livery: 'limestone', seed: 3 }, { livery: 'slate', seed: 9, age: 0.8 }, { livery: 'sandstone', seed: 14 }, { livery: 'marble', seed: 22, age: 0.2 }],
  params(ent, o, p) {
    const op = p.opts || {}, u = (key) => (typeof _wmdU === 'function' ? _wmdU(p.seed, key) : 0.5);
    const shape = [..._WMD_HS_SHAPES, 'chest'].includes(op.shape) ? op.shape : u('shape') < 0.08 ? 'chest' : _WMD_HS_SHAPES[Math.floor(u('shape2') * 5) % 5];
    const r = { shape, lean: Number.isFinite(op.lean) ? op.lean : -4 + 9 * u('lean'), wv: 0.85 + 0.35 * u('w'), hv: 0.78 + 0.4 * u('h') };
    if (shape === 'chest') r.L = 0.9 * p.size;   // a chest tomb is long: its length lies along `facing` turned a quarter
    if (p.liveryKey == null) r.liveryKey = Math.floor(u('livery') * _WMD_HS_LIVERIES.length);
    return r;
  },
  footprint(p) { const k = p.size; return p.shape === 'chest' ? [[-0.95 * k, -0.5 * k], [0.95 * k, -0.5 * k], [0.95 * k, 0.5 * k], [-0.95 * k, 0.5 * k]] : [[-0.08 * k, -0.34 * k * p.wv], [0.08 * k, -0.34 * k * p.wv], [0.08 * k, 0.34 * k * p.wv], [-0.08 * k, 0.34 * k * p.wv]]; },
  build(p, h) {
    const k = p.size, liv = p.livery, stone = h.aged(liv.stone, 'stone', 0.9), lichen = liv.lichen, rn = (() => { let a = (p.seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    if (p.shape === 'chest') {
      // a chest tomb: a plinth, a panelled chest and an overhanging cap slab, the long side along the facing's cross axis
      h.contactShadow(-1.1 * k, 1.1 * k, -0.7 * k, 0.7 * k, 0.3);
      h.box(-0.95 * k, 0.95 * k, -0.5 * k, 0.5 * k, 0, 0.12 * k, h.shade(stone, 0.85), h.shade(stone, 0.9), 'stone', 'plinth');
      h.box(-0.85 * k, 0.85 * k, -0.42 * k, 0.42 * k, 0.12 * k, 0.72 * k, stone, stone, 'stone', 'chest');
      h.box(-0.95 * k, 0.95 * k, -0.5 * k, 0.5 * k, 0.72 * k, 0.82 * k, h.shade(stone, 1.06), h.shade(stone, 1.12), 'stone', 'cap');
      for (const sg of [-1, 1]) {
        const S = h.surface((u, v, off) => h.P(u, sg * (0.42 * k + off), v), { normal: [0, sg, 0] });
        if (h.sees([0, sg, 0], [0, sg * 0.42 * k, 0.4 * k])) { S.rect(-0.7 * k, 0.7 * k, 0.22 * k, 0.62 * k, h.shade(stone, 0.9), 'stone', 'panel', 0.01); S.rect(-0.64 * k, 0.64 * k, 0.28 * k, 0.56 * k, h.shade(stone, 1.02), 'stone', 'panel', 0.014); }
      }
      return { height: 0.82 * k };
    }
    const hw = 0.3 * k * p.wv, hh = 0.9 * k * p.hv, t = 0.055 * k, lean = Math.tan(p.lean * Math.PI / 180), lean2 = Math.tan((rn() - 0.5) * 0.06);
    const prof = _wmdHsProfile(p.shape, hw, hh), y0 = 0.07 * k;
    // a stone leans: every point is sheared across the facing by its height
    const Q = (a, u, v) => h.P(a + v * lean2, u + v * lean, v + y0);
    h.contactShadow(-0.3 * k, 0.3 * k, -hw - 0.15 * k, hw + 0.15 * k, 0.32);
    h.part('plinth', { layer: 1 });
    h.box(-0.1 * k, 0.1 * k, -hw - 0.06 * k, hw + 0.06 * k, 0, y0, h.shade(stone, 0.8), h.shade(stone, 0.86), 'stone', 'plinth');
    h.part('slab', { layer: 2 });
    const ins = Q(0, 0, hh * 0.4);
    for (let i = 0; i < prof.length; i++) {
      const [u1, v1] = prof[i], [u2, v2] = prof[(i + 1) % prof.length];
      h.face([Q(-t, u1, v1), Q(t, u1, v1), Q(t, u2, v2), Q(-t, u2, v2)], h.shade(stone, 0.92), 'stone', 'edge', ins);
    }
    h.face(prof.map(([u, v]) => Q(t, u, v)), stone, 'stone', 'face', ins);
    h.face(prof.map(([u, v]) => Q(-t, u, v)), stone, 'stone', 'face', ins);
    // decals on whichever broad face the eye sees: lichen, moss at the foot, a sunk base, rows where text would be
    for (const sg of [-1, 1]) {
      if (!h.sees([sg, 0, 0], [sg * t, 0, y0 + hh * 0.5])) continue;
      const D = (u, v) => Q(sg * (t + 0.004 * k), u, v), pushD = (pts, hex, mat, role, alpha) => h.face(pts, hex, mat, role, null, { alpha });
      if (h.px(0.1 * k) >= 1.4) {
        for (let i = 0; i < 3; i++) { const u = (rn() - 0.5) * hw * 1.4, v = hh * (0.3 + 0.6 * rn()), r = (0.05 + 0.1 * rn()) * k; pushD([D(u - r, v), D(u, v - r * 0.7), D(u + r, v + r * 0.2), D(u + r * 0.3, v + r * 0.8)], lichen, 'stone', 'lichen', 0.34); }
        pushD([D(-hw, 0), D(hw, 0), D(hw * 0.95, 0.16 * k), D(-hw * 0.9, 0.2 * k)], '#6f7f4c', 'stone', 'moss', 0.3);
        pushD([D(-hw, 0), D(hw, 0), D(hw, 0.2 * k), D(-hw, 0.2 * k)], '#2c2a22', 'stone', 'sunk', 0.12);
      }
      if (h.fine) for (let i = 0; i < 4; i++) { const v = hh * (0.62 - i * 0.1); h.line([D(-hw * (0.55 - i * 0.05), v), D(hw * (0.55 - i * 0.05), v)], 0.018 * k, h.shade(stone, 0.68), 'stone', 'text-row', { alpha: 0.35 }); }
    }
    return { height: hh + y0 };
  },
});
