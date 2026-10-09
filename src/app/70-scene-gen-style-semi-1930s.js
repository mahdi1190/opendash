/* Scene engine v2, building style: 1930s semi (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data plus a hook.
   Pebbledash or render over brick, a two-storey curved or square bay, a hipped tiled roof, metal windows with horizontal
   bars, a porch hood, a low front wall with a sunrise gate. Built in pairs (the party wall in the middle). */
(function () {
  sceneBuildingStyleDefine('1930s-semi', {
    label: '1930s semi', eras: [1919, 1939], regions: ['uk'], grouping: 'semi',
    storeys: [2, 2], storeyH: [2.8, 2.7], frontage: [6.5, 8], depth: [8, 10], roof: 'hip', pitch: 40,
    wall: { cols: ['#8a4a36', '#9a5a40', '#7e4634'], grime: '#3a3028', texture: 'brick', mortar: '#cdc2ae',
      upper: [{ from: 1, cols: ['#e6dfcf', '#d9cfba', '#ece6da'], texture: 'pebbledash' }, { from: 1, cols: ['#f0ece2', '#e8e4d6'], texture: 'render' }, { from: 0, cols: ['#ece8dc', '#f2eee4'], texture: 'render' }] },
    roofMat: { cols: ['#8a4a36', '#7a4232', '#94503a', '#6a4a3e'], kind: 'tile' },
    dress: { cols: ['#dcd6c8', '#e8e2d4'] },
    win: { type: 'metal', panes: [3, 2], w: 1.4, hk: 0.55, sill: 0.9, head: 'flat', recess: 0.08, frames: ['#f2f2ee', '#3a5a3a', '#f4f0e6'], bayType: 'metal', bayPanes: [1, 2] },
    door: { w: 0.9, h: 2.05, fan: false, recess: 0.6, panels: 2, canopy: true, cols: ['#2a4a2a', '#6a2a2a', '#2a3a5a', '#e8e4d8', '#8a6a2a'] },
    bay: { kind: 'curved', floors: 2, chance: 0.9, w: 2.6, depth: 0.75, lid: 'hip' },
    chimney: { where: 'party', pots: [1, 3] },
    colW: 2.9, margin: 0.4, overDoor: 0.6,
    details: { downpipe: 0.6, alarm: 0.45, boxes: 0.3, ivy: 0.1, porch: 1 },
    night: { on: 0.6, curtain: 0.45, tv: 0.15 },
    frontBlocks(sp, wall) {
      const len = wall.plane.len, g = sp.doorSide === 'left' ? 0.3 : len - 1.3;
      return [{ kind: 'fence', s0: -0.2, s1: len + 0.2, out: 5, h: 0.75, type: 'sunrise', gate: [g, 1], col: sp.seed % 2 ? '#8a4a36' : '#e6dfcf' }];
    },
  });
})();
