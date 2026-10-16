/* Scene engine v2, building style: BAROQUE CIVIC (docs/dev/SCENE_ENGINE_V2.md 19.3; docs/dev/WORLD_ENGINE.md 14.2). Pure data plus the crown
   presets. Edwardian baroque in pale Portland stone: the great waterfront offices, town halls, banks and insurance houses of about 1895 to
   1920. A rusticated base with arched openings, a giant order of pilasters over the middle storeys, a deep cornice, an attic storey, a
   balustraded parapet, and a CROWN of its own: a building's `crown` picks one of the presets below, each a list of stacks (towers and
   domes) built stage by stage by 70-scene-gen-1civic.js. The facade is 70-scene-gen-2civic-facade.js. Generic: no names, no flags, no
   emblems; a bird, an urn or a ball on top, never a religious symbol.
     crown 'twin-towers'  two square clock towers at the ends of the front, each with a louvred belfry, a colonnaded cupola, a copper dome,
                          a lantern and a bird: the great office block with two clock towers
     crown 'great-dome'   a drum with windows and a great ribbed dome over the middle of the block, a lantern and a ball
     crown 'corner-dome'  a square tower and an ogee dome on a corner of the block
     crown 'clock-tower'  one central clock tower with a belfry and a copper pyramid (a town hall)
     crown 'pediment'     a triangular pediment over the central bays (no tower)
   A style with no `crown` on its building draws no crown. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // a square clock tower on the roof edge: shaft with a clock, belfry, cupola, dome, lantern, finial (heights follow the block's height)
  const clockTower = (K, s, o) => {
    const tw = o.w, h = o.h;
    return { at: [s, tw / 2], w: tw, d: tw, z0: K.E, stages: [
      { k: 'shaft', h: h * 0.5, rows: [0.12, 0.36], cols: [0.5], clock: { r: tw * 0.19, at: 0.8 } },
      { k: 'cornice', h: 1.1, out: 0.6 },
      { k: 'belfry', h: h * 0.15, inset: 1.3, bays: 3 },
      { k: 'cornice', h: 0.8, out: 0.5 },
      { k: 'cupola', h: h * 0.15, r: tw * 0.27, cols: 8 },
      { k: 'dome', r: tw * 0.31, h: tw * 0.27, shape: 'hemi', ribs: 8 },
      { k: 'lantern', r: tw * 0.05, h: h * 0.05 },
      { k: 'finial', kind: o.finial || 'bird', h: o.fh || 4.6 },
    ] };
  };
  const crowns = {
    'twin-towers': (K) => {
      const tw = clamp(K.W * 0.3, 12, 22), h = clamp(K.E * 0.62, 22, 44);
      return [clockTower(K, tw * 0.5 + 1.2, { w: tw, h, finial: 'bird', fh: 4.6 }), clockTower(K, K.W - tw * 0.5 - 1.2, { w: tw, h, finial: 'bird', fh: 4.6 })];
    },
    'clock-tower': (K) => {
      const tw = clamp(K.W * 0.16, 7, 12), h = clamp(K.E * 1.1, 24, 50);
      return [{ at: [K.W / 2, tw / 2 + 1], w: tw, d: tw, z0: K.E, stages: [
        { k: 'shaft', h: h * 0.55, rows: [0.1, 0.3], cols: [0.5], clock: { r: tw * 0.22, at: 0.82 } },
        { k: 'cornice', h: 0.9, out: 0.5 },
        { k: 'belfry', h: h * 0.18, inset: 0.8, bays: 3 },
        { k: 'cornice', h: 0.7, out: 0.4 },
        { k: 'pyramid', h: h * 0.2, col: '#6c9a86' },
        { k: 'finial', kind: 'ball', h: 2.2 },
      ] }];
    },
    'great-dome': (K) => {
      const r = clamp(Math.min(K.W, K.Dp) * 0.17, 6, 11);
      return [{ at: [K.W / 2, clamp(K.Dp * 0.42, r + 1, K.Dp - r - 1)], w: r * 2.5, d: r * 2.5, z0: K.E, stages: [
        { k: 'drum', h: r * 1.2, r, wins: 12, seg: 24 },
        { k: 'dome', r: r * 1.02, h: r * 0.95, shape: 'hemi', ribs: 12, seg: 36 },
        { k: 'lantern', r: r * 0.17, h: r * 0.34 },
        { k: 'finial', kind: 'ball', h: 2.6 },
      ] }];
    },
    'corner-dome': (K) => {
      const w = clamp(K.W * 0.18, 9, 13);
      return [{ at: [K.W - w / 2 - 0.8, w / 2 + 0.8], w, d: w, z0: K.E, stages: [
        { k: 'shaft', h: w * 0.8, rows: [0.2, 0.55], cols: [0.5] },
        { k: 'cornice', h: 0.9, out: 0.5 },
        { k: 'drum', h: w * 0.5, r: w * 0.4, wins: 8, seg: 16 },
        { k: 'dome', r: w * 0.42, h: w * 0.42, shape: 'ogee', ribs: 8, seg: 24 },
        { k: 'lantern', r: w * 0.05, h: w * 0.14 },
        { k: 'finial', kind: 'ball', h: 2 },
      ] }];
    },
    pediment: () => [],
  };

  /* ---------- the three great waterfront offices, each its own silhouette (SCENE_LESSONS M, the Three Graces) ----------
     'liver-towers'  a tall block with a clock tower at each river corner (a louvred belfry, a colonnaded cupola, a copper dome, a lantern and a bird) and a
                     lower domed lantern tower between them, set back: two towers, three domes, birds on the outer two
     'palazzo'       a heavy Italian palazzo: NO tower; a deep cornice, a balustrade, two low end pavilions and an urn on each (a flat, massive roofline)
     'port-dome'     one great ribbed dome on a colonnaded drum over the middle of the block and four small domed turrets at the corners of the roof */
  const turret = (K, s, t, w, h, fin) => ({ at: [s, t], w, d: w, z0: K.E, stages: [
    { k: 'shaft', h, rows: [0.3, 0.64], cols: [0.5] },
    { k: 'cornice', h: 0.8, out: 0.5 },
    { k: 'drum', h: w * 0.4, r: w * 0.34, wins: 8, seg: 16 },
    { k: 'dome', r: w * 0.37, h: w * 0.32, shape: 'hemi', ribs: 8, seg: 20 },
    { k: 'lantern', r: w * 0.055, h: w * 0.12 },
    { k: 'finial', kind: fin || 'urn', h: 2.2 },
  ] });
  crowns['liver-towers'] = (K) => {
    const tw = clamp(K.W * 0.2, 11, 17), h = clamp(K.E * 0.8, 26, 50), cw = tw * 0.62;
    return [
      { at: [K.W / 2, K.Dp * 0.46], w: cw, d: cw, z0: K.E, stages: [
        { k: 'shaft', h: h * 0.24, rows: [0.3, 0.66], cols: [0.5] },
        { k: 'cornice', h: 0.8, out: 0.45 },
        { k: 'cupola', h: h * 0.12, r: cw * 0.3, cols: 8 },
        { k: 'dome', r: cw * 0.34, h: cw * 0.3, shape: 'hemi', ribs: 8 },
        { k: 'lantern', r: cw * 0.05, h: h * 0.04 },
        { k: 'finial', kind: 'ball', h: 2.4 },
      ] },
      clockTower(K, tw * 0.5 + 1.0, { w: tw, h, finial: 'bird', fh: 5.2 }), clockTower(K, K.W - tw * 0.5 - 1.0, { w: tw, h, finial: 'bird', fh: 5.2 }),
    ];
  };
  crowns.palazzo = (K) => {
    const w = clamp(K.W * 0.17, 8, 12), h = 3.4;
    const end = (s) => ({ at: [s, w * 0.5 + 1.5], w, d: w, z0: K.E, stages: [
      { k: 'shaft', h, rows: [0.5], cols: [0.5], flood: false },
      { k: 'cornice', h: 0.9, out: 0.55 },
      { k: 'finial', kind: 'urn', h: 3.0 },
    ] });
    return [end(w * 0.5 + 0.6), end(K.W - w * 0.5 - 0.6)];
  };
  crowns['port-dome'] = (K) => {
    const r = clamp(Math.min(K.W, K.Dp) * 0.19, 7, 12), tw = clamp(K.W * 0.085, 6, 9), m = tw * 0.5 + 1.0, hh = clamp(K.E * 0.28, 7, 11);
    return [
      { at: [K.W / 2, clamp(K.Dp * 0.46, r + 1, K.Dp - r - 1)], w: r * 2.5, d: r * 2.5, z0: K.E, stages: [
        { k: 'shaft', h: r * 0.5, rows: [0.4], cols: [0.5], flood: false },
        { k: 'cornice', h: 0.9, out: 0.6 },
        { k: 'drum', h: r * 1.3, r, wins: 16, seg: 32 },
        { k: 'dome', r: r * 1.02, h: r * 0.9, shape: 'hemi', ribs: 16, seg: 40 },
        { k: 'lantern', r: r * 0.17, h: r * 0.38 },
        { k: 'finial', kind: 'ball', h: 3.0 },
      ] },
      turret(K, m, m, tw, hh), turret(K, K.W - m, m, tw, hh), turret(K, m, K.Dp - m, tw, hh), turret(K, K.W - m, K.Dp - m, tw, hh),
    ];
  };
  const baseStyle = {
    label: 'Baroque civic (Portland stone)', eras: [1895, 1925], regions: ['uk'], grouping: 'block',
    storeys: [7, 7], storeyH: [5.8, 5.0, 4.6, 4.4], frontage: [58, 70], depth: [38, 50], roof: 'flat', parapet: 1.3, party: 'none', plinth: false,
    wall: { cols: ['#d9d2c0', '#dcd5c4', '#d5cebb'], grime: '#5b5548', texture: 'stone', mortar: '#c6bea9' },
    roofMat: { cols: ['#6d7880'], kind: 'lead' },
    dress: { cols: ['#e7e0cf', '#eae3d3'] },
    win: { type: 'sash', panes: [2, 3], w: 1.9, hk: 0.64, sill: 0.9, head: 'flat', recess: 0.22, frames: ['#f2efe5'], surround: true, lintelH: 0.3, reflQ: 2, glass: ['#34414e', '#3a4654', '#2f3b47'] },
    door: { w: 2.6, h: 4.4, fan: true, recess: 0.3, panels: 0, canopy: false, step: false, cols: ['#3a3834'] },
    chimney: { where: 'none' },
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0, porch: 0 },
    night: { on: 0.55, curtain: 0, tv: 0, flood: 0.14 },
    civic: { bay: 4.6, order: 'pilaster', entab: 2.2, course: 1.0, pil: 0.9, copper: '#6c9a86' },
    front: (sp, face, model, out) => _scbcFacade(sp, face, model, out, 'front'),
    side: (sp, face, model, out) => _scbcFacade(sp, face, model, out, 'side'),
    frontBlocks: (sp, face, model) => _scbcFrontBlocks(sp, face, model),
    crowns,
  };
  sceneBuildingStyleDefine('baroque-civic', baseStyle);
  // the three Graces: the same facade generator, three different faces (stone tone, bay, order, cornice), so they never read as one block
  const variant = (id, label, over) => sceneBuildingStyleDefine(id, Object.assign({}, baseStyle, over, { label, civic: Object.assign({}, baseStyle.civic, over.civic || {}) }));
  variant('baroque-civic-liver', 'Baroque civic: a tall granite-grey office block (twin clock towers)', {
    storeys: [11, 11], storeyH: [5.4, 4.6, 4.2, 4.0], parapet: 1.0,
    wall: { cols: ['#b3b8b7', '#b9bdbc', '#acb1b1'], grime: '#444a4c', texture: 'stone', mortar: '#a9aeae' },
    dress: { cols: ['#cfd3d1', '#d3d6d4'] },
    civic: { bay: 3.9, order: 'pilaster', entab: 1.5, course: 1.1, pil: 0.7, copper: '#6c9a86' },
  });
  variant('baroque-civic-palazzo', 'Baroque civic: a heavy Italian palazzo (deep cornice, columns, no tower)', {
    storeys: [8, 8], storeyH: [6.2, 5.4, 4.8, 4.5], parapet: 1.8,
    wall: { cols: ['#dccfa9', '#e0d3ae', '#d8caa4'], grime: '#5e5444', texture: 'stone', mortar: '#c9bc96' },
    dress: { cols: ['#ece3c8', '#efe6cd'] },
    win: Object.assign({}, baseStyle.win, { w: 2.2, hk: 0.7, recess: 0.3 }),
    civic: { bay: 6.0, order: 'column', entab: 3.6, course: 1.6, pil: 1.15 },
  });
  variant('baroque-civic-port', 'Baroque civic: a great domed office with corner turrets (Portland stone)', {
    storeys: [7, 7], storeyH: [5.8, 5.0, 4.6, 4.4], parapet: 1.3,
    wall: { cols: ['#e0dccd', '#e4e0d1', '#dbd7c8'], grime: '#5a574c', texture: 'stone', mortar: '#cdc9ba' },
    dress: { cols: ['#efebde', '#f2eee2'] },
    civic: { bay: 5.0, order: 'pilaster', entab: 2.8, course: 1.2, pil: 1.0, copper: '#74908a' },
  });
})();
