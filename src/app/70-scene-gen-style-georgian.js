/* Scene engine v2, building style: Georgian town house (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data plus a hook.
   Flemish-bond stock brick or stucco, 6-over-6 sashes graded smaller upward (the first floor tallest), a fanlight door in a
   doorcase, a parapet hiding a low roof, area railings in front. */
(function () {
  sceneBuildingStyleDefine('georgian', {
    label: 'Georgian town house', eras: [1714, 1840], regions: ['uk'], grouping: 'terrace',
    storeys: [3, 4], storeyH: [3.2, 3.6, 2.9, 2.5], frontage: [6, 8.5], depth: [9, 12], roof: 'pitched-side', pitch: 28, parapet: 0.9, party: 'both',
    wall: { cols: ['#b89a6a', '#a88a5c', '#c4a878', '#9a7a52'], grime: '#3a3428', texture: 'brick', mortar: '#d8ccb0', alt: { chance: 0.35, cols: ['#ece6d8', '#e4dccb', '#f0ead8'], texture: 'stucco' } },
    roofMat: { cols: ['#4a5058', '#505660'], kind: 'slate' },
    dress: { cols: ['#e8e2d0', '#f0ead8'] },
    coping: '#e4dccb',
    win: { type: 'sash', panes: [3, 2], w: 1.0, hk: 0.62, sill: 0.8, sill0: 0.75, head: 'flat', recess: 0.16, grade: [0.88, 1.12, 0.86, 0.62], lintelH: 0.22, lintelCol: 'wall', frames: ['#f4f2ea', '#f0ece2'] },
    door: { w: 1.05, h: 2.35, fan: true, case: true, recess: 0.16, panels: 6, step: true, cols: ['#1d1f22', '#1f3a2a', '#3a1f22', '#2a3a5a', '#24282c'] },
    chimney: { where: 'party', pots: [2, 4] },
    bands: [{ storey: 1, dz: -0.05, h: 0.14, col: 'dress' }],
    colW: 2.2, margin: 0.3, sideWindows: false,
    details: { downpipe: 0.5, alarm: 0.25, boxes: 0.3, ivy: 0.06 },
    night: { on: 0.55, curtain: 0.5, tv: 0.08 },
    frontBlocks(sp, wall) {
      const len = wall.plane.len;
      return [{ kind: 'fence', s0: 0, s1: len, out: 1.6, h: 1.05, type: 'railing', gate: [sp.doorSide === 'left' ? 0.2 : len - 1.3, 1.1], col: '#9a968e' }];
    },
  });
})();
