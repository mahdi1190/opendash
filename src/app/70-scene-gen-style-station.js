/* Scene engine v2, building style: station building (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data plus a hook.
   A Victorian or interwar station range: tall round-headed booking-hall windows, a central pediment (clock-free, no
   lettering), a canopy with a valance and posts along the front, stacks on the ridge. Signs only through sceneSignText (8.3). */
(function () {
  sceneBuildingStyleDefine('station', {
    label: 'Station building', eras: [1840, 1939], regions: ['uk'], grouping: 'block', layout: 'station', flippable: false,
    storeys: [1, 2], storeyH: [5.2, 3.2], frontage: [24, 48], depth: [10, 14], roof: 'hip', pitch: 30,
    wall: { cols: ['#9a4e36', '#a8613e', '#c2a46a', '#b8995e'], grime: '#3a3028', texture: 'brick', mortar: '#d0c4ac' },
    roofMat: { cols: ['#4a5058', '#50565e'], kind: 'slate' },
    dress: { cols: ['#e0d8c4', '#d8d0bc'] },
    quoins: true,
    win: { type: 'sash', panes: [2, 2], w: 1.2, hk: 0.7, sill: 1.0, head: 'round', recess: 0.18, frames: ['#f2efe6', '#e8e2d2'] },
    door: { w: 1.7, h: 3.0, fan: true, panels: 0, recess: 0.3, cols: ['#2f4a3a', '#5a1f24'] },
    chimney: { where: 'ridge', pots: [2, 3] },
    canopyCol: '#4a5a52', canopyOut: 3.2, colW: 3.2,
    bands: [{ storey: 1, dz: -0.3, h: 0.25, col: 'dress' }],
    details: { downpipe: 0.6, alarm: 0, boxes: 0.25, ivy: 0.05 },
    night: { on: 0.85, curtain: 0, tv: 0 },
    frontBlocks(sp, wall, model) {
      const len = wall.plane.len, w = Math.min(9, len * 0.3);
      return [{ kind: 'pediment', s0: len / 2 - w / 2, s1: len / 2 + w / 2, z: model.E0, k: 0.32, col: sp.wall }];
    },
  });
})();
