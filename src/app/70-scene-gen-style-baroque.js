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
  sceneBuildingStyleDefine('baroque-civic', {
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
  });
})();
