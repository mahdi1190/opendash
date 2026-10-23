/* Scene engine v2, building style: 'mcr-terracotta-hotel', the Midland Hotel in Manchester (Charles Trubshaw, 1903) and its kind: an
   Edwardian railway hotel in red brick and buff-brown terracotta, six storeys over a terracotta ground storey, banded at every floor, a
   deep cornice, and ROUND corner turrets with domed caps on the corners of the front (crown 'corner-turrets'). Pure data on the baroque
   civic facade (70-scene-gen-style-baroque.js, 70-scene-gen-2civic-facade.js) and the civic crown stacks (70-scene-gen-1civic.js).
   No names, no lettering, no emblems: a finial is a ball. Written for the v3 Peter Street view (79-world-zscene-greater-manchester-
   manchester-centre-3.js), where the hand-drawn v2 landmark (drawn for one camera, pinned at its nearest corner) cannot stand: the world
   centres a footprint on its anchor, so the people on its own pavement were drawn behind it. */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function' || typeof sceneBuildingStyle !== 'function') return;
  const baroque = sceneBuildingStyle('baroque-civic');
  if (!baroque) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // a round turret proud of each front corner: a banded shaft (drum), a cornice, a short drum with windows, a domed cap, a ball
  const turret = (K, s, w) => ({ at: [s, w / 2 + 0.4], w, d: w, z0: K.E, stages: [
    { k: 'drum', h: w * 0.9, r: w * 0.46, wins: 8, seg: 18 },
    { k: 'cornice', h: 0.7, out: 0.45 },
    { k: 'dome', r: w * 0.48, h: w * 0.55, shape: 'ogee', ribs: 8, seg: 22 },
    { k: 'lantern', r: w * 0.05, h: w * 0.16 },
    { k: 'finial', kind: 'ball', h: 1.8 },
  ] });
  const crowns = Object.assign({}, baroque.crowns || {}, {
    'corner-turrets': (K) => { const w = clamp(K.W * 0.09, 5.5, 7.5); return [turret(K, w / 2 + 0.4, w), turret(K, K.W - w / 2 - 0.4, w)]; },
  });
  sceneBuildingStyleDefine('mcr-terracotta-hotel', Object.assign({}, baroque, {
    label: 'Edwardian railway hotel in red brick and terracotta (round domed corner turrets)', eras: [1895, 1910], regions: ['uk', 'north'],
    storeys: [6, 6], storeyH: [5.6, 4.4, 4.2, 4.0], parapet: 1.4,
    wall: { cols: ['#9a3e2c', '#a2442f', '#943a29'], grime: '#3a2018', texture: 'brick', mortar: '#c8a68a' },
    roofMat: { cols: ['#4e6058', '#4a5a52'], kind: 'slate' },
    dress: { cols: ['#b07a52', '#b8825a'] },
    win: Object.assign({}, baroque.win, { w: 1.6, hk: 0.62, frames: ['#e8dcc8'], glass: ['#2c3640', '#323c46', '#283038'] }),
    night: { on: 0.6, curtain: 0.2, tv: 0, flood: 0 },
    civic: Object.assign({}, baroque.civic, { bay: 3.8, order: 'pilaster', entab: 1.8, course: 1.2, pil: 0.8, copper: '#5e7468' }),
    crowns,
  }));
})();
