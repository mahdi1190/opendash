/* Scene engine v2, building style: Edwardian (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   Bright red brick with render or tile-hanging above, wide square bays over two floors with a gable over them, leaded
   upper lights, a porch canopy over the door. */
(function () {
  sceneBuildingStyleDefine('edwardian', {
    label: 'Edwardian', eras: [1901, 1918], regions: ['uk'], grouping: 'terrace',
    storeys: [2, 2], storeyH: [3.0, 2.8], frontage: [5.4, 7], depth: [9, 12], roof: 'pitched-side', pitch: 38, party: 'both',
    wall: { cols: ['#a84a32', '#b4553a', '#9c4430', '#ae5038'], grime: '#3a2a24', texture: 'brick', mortar: '#d8cdb8',
      upper: [{ from: 1, cols: ['#ece4d4', '#e8dfcc', '#f0e8d8'], texture: 'render' }, { from: 1, cols: ['#b4583e', '#a8503a', '#9e4a36'], texture: 'tile' }] },
    roofMat: { cols: ['#8a4a36', '#7e4432', '#4a5058'], kind: 'tile' },
    dress: { cols: ['#e8e2d4', '#dcd4c2'] },
    win: { type: 'leaded', panes: [2, 1], w: 1.1, hk: 0.6, sill: 0.9, head: 'flat', recess: 0.1, frames: ['#f2efe6', '#ffffff', '#2f4a3a'], bayType: 'leaded', bayPanes: [2, 1] },
    door: { w: 0.95, h: 2.15, fan: false, recess: 0.25, panels: 4, canopy: true, cols: ['#2f4a3a', '#1f3a5a', '#5a1f24', '#6a5a3a', '#2a2a2a'] },
    bay: { kind: 'square', floors: 2, chance: 0.9, w: 2.8, depth: 0.6, lid: 'gable' },
    chimney: { where: 'party', pots: [2, 4] },
    colW: 2.7, overDoor: 0.8, sideWindows: false,
    details: { downpipe: 0.7, alarm: 0.4, boxes: 0.45, ivy: 0.12, porch: 0.5 },
    night: { on: 0.6, curtain: 0.4, tv: 0.14 },
  });
})();
