/* Scene engine v2, building styles: the SEAFRONT (17 Oct, detail/pier). Pure data plus a hook each. Two styles that make a terrace of a seaside
   town read as a terrace of many houses instead of one repeated gable:
   'seafront-regency': tall stucco houses of a Regency crescent painted in pale seaside colours (cream, powder blue, pink, mint, butter, white),
     a hidden flat roof behind a parapet (so the end of a taller house is a rectangle, not a gable), a first-floor iron balcony on most
     houses, a curved bow over three floors on many, tall sashes graded smaller upward, a fanlight door with a step.
   'seafront-parade': three storeys of brighter painted render over a SHOPFRONT with a deep striped canopy (a scalloped valance, lamps lit at
     night): cafes, gift shops, ice-cream parlours. Words appear only through sceneSignText (never here).
   Each house of a run has its own seed, so colour, bow, balcony, door and canopy colour change house to house (`worldFrontageHouses`). */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function' || typeof sceneBuildingStyle !== 'function') return;
  const base = sceneBuildingStyle('georgian');
  const pick = (sp, list, k) => list[((sp.seed >>> (k || 0)) + (k || 0) * 7) % list.length];
  sceneBuildingStyleDefine('seafront-regency', Object.assign({}, base, {
    label: 'Seafront Regency terrace', eras: [1800, 1850], regions: ['uk'], grouping: 'terrace',
    storeys: [4, 4], storeyH: [3.6, 3.4, 3.0, 2.6], frontage: [6.5, 8.5], depth: [11, 14], roof: 'flat', pitch: 0, parapet: 1.1, party: 'both',
    wall: { cols: ['#efe6cf', '#dfe8ea', '#ecd6d4', '#d7e6d6', '#f1e3b0', '#f4f1ea', '#cfdde6'], grime: '#4a463a', texture: 'stucco', mortar: '#e8e0cc' },
    roofMat: { cols: ['#4a5058'], kind: 'felt' },
    dress: { cols: ['#faf8f1'] },
    coping: '#f4f1ea',
    bay: { kind: 'curved', floors: 3, chance: 0.5, w: 3.2, depth: 0.95, lid: 'hip' },
    win: { type: 'sash', panes: [3, 2], w: 1.0, hk: 0.66, sill: 0.8, sill0: 0.75, head: 'flat', recess: 0.14, grade: [0.9, 1.15, 0.85, 0.6], lintelH: 0.2, lintelCol: 'wall', frames: ['#fbf9f2', '#f4f1e8'] },
    door: { w: 1.1, h: 2.4, fan: true, case: true, recess: 0.16, panels: 6, step: true, cols: ['#1d3a52', '#223f34', '#4a1f26', '#d9d2bf', '#1f2124', '#3c4a68'] },
    chimney: { where: 'party', pots: [2, 5] },
    bands: [{ storey: 1, dz: -0.05, h: 0.16, col: 'dress' }, { storey: 3, dz: 0.0, h: 0.14, col: 'dress' }],
    colW: 2.2, margin: 0.3, sideWindows: true,
    details: { downpipe: 0.45, alarm: 0.2, boxes: 0.4, ivy: 0 },
    night: { on: 0.6, curtain: 0.5, tv: 0.1 },
    frontBlocks(sp, wall) {
      const len = wall.plane.len, out = [];
      // a first-floor balcony on most houses: a slab on brackets, its colour the ironwork
      if ((sp.seed % 10) < 7) out.push({ kind: 'slab', s0: 0.25, s1: len - 0.25, z: sp.zs[1] + 0.04, out: 1.0, th: 0.1, col: pick(sp, ['#26292d', '#2f4f46', '#33384a'], 3) });
      out.push({ kind: 'fence', s0: 0, s1: len, out: 1.8, h: 1.0, type: 'railing', gate: [sp.doorSide === 'left' ? 0.2 : len - 1.3, 1.1], col: '#2b2e31' });
      return out;
    },
  }));
  sceneBuildingStyleDefine('seafront-parade', Object.assign({}, base, {
    label: 'Seafront parade of shops', eras: [1850, 1930], regions: ['uk'], grouping: 'row', layout: 'shops',
    storeys: [3, 3], storeyH: [4.0, 3.1, 2.8], frontage: [5, 7.5], depth: [10, 13], roof: 'flat', pitch: 0, parapet: 0.9, party: 'both',
    wall: { cols: ['#e9a89a', '#9fcfc6', '#f0d27a', '#b9a6d8', '#8fbfe0', '#f3e8d0', '#e8b27c', '#a9c98a'], grime: '#4a463a', texture: 'stucco', mortar: '#e8e0cc' },
    roofMat: { cols: ['#3a3c40'], kind: 'felt' },
    dress: { cols: ['#fbf8ef'] },
    coping: '#fbf8ef',
    bay: { kind: 'square', floors: 2, chance: 0.25, w: 2.6, depth: 0.7, lid: 'hip' },
    win: { type: 'sash', panes: [2, 2], w: 1.15, hk: 0.6, sill: 0.9, sill0: 0.9, head: 'flat', recess: 0.1, grade: [1, 0.95, 0.9], lintelH: 0.18, lintelCol: 'wall', frames: ['#fbf9f2', '#2c4f6a'] },
    door: { w: 1.0, h: 2.2, fan: false, panels: 4, recess: 0.12, step: false, cols: ['#2c4f6a', '#c9423a', '#1f2124', '#2f7a6a'] },
    shop: { always: true, fascia: 0.7, riser: 0.45, pilaster: 0.3, awning: false, top: 3.6, cols: ['#2c4f6a', '#c9423a', '#2f7a6a', '#e0a030', '#6a3f78', '#1f2124', '#2f5a3c', '#d9708f'] },
    chimney: { where: 'party', pots: [1, 3] },
    bands: [{ storey: 1, dz: 0.0, h: 0.16, col: 'dress' }],
    colW: 2.4, sideWindows: true,
    details: { downpipe: 0.5, alarm: 0.3, boxes: 0.5, ivy: 0 },
    night: { on: 0.55, curtain: 0.4, tv: 0.12 },
    frontBlocks(sp, wall) {
      const len = wall.plane.len, cols = ['#c9423a', '#2c4f86', '#2f7a6a', '#e0a030', '#d9708f', '#4a6a3c'];
      // the shop's deep canopy: a coloured lean-to with a scalloped valance, two posts, lamps lit at night
      return [{ kind: 'canopy', s0: 0.15, s1: len - 0.15, z: sp.zs[1] - 0.45, out: 1.7, col: pick(sp, cols, 2), valance: true, posts: 2 }];
    },
  }));
})();
