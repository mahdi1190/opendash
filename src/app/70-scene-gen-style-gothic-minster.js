/* Scene engine v2, building style: gothic-minster (a great medieval church: York, Lincoln, Lichfield, Salisbury, Canterbury). Pure data plus the
   hooks of 70-scene-gen-1cathedral.js. Pale magnesian limestone, grey lead roofs, glazed pointed windows that glow after dusk, a floodlit stone at
   night. A building's `crown` picks the plan: 'twin-towers' (the default: two west towers and a lantern over the crossing), 'central-spire',
   'west-tower'. The footprint's front edge is the west front, its depth the length of the church. No flags, no religious symbols. */
(function () {
  sceneBuildingStyleDefine('gothic-minster', {
    label: 'Gothic minster (twin west towers, nave, transepts, lantern tower)', eras: [1220, 1480], regions: ['uk'], grouping: 'detached',
    storeys: [4, 4], storeyH: [7, 7, 7, 7], frontage: [24, 36], depth: [110, 170], roof: 'gable', roofs: ['gable'], pitch: 52, party: 'none',
    wall: { cols: ['#d2c9b0', '#cdc4ab', '#d6cdb6'], grime: '#6a6559', texture: 'stone' },
    roofMat: { cols: ['#6c7278', '#656b72'], kind: 'lead' },
    dress: { cols: ['#ddd5bf'] },
    win: { type: 'leaded', panes: [4, 1], w: 1.6, hk: 0.5, sill: 1, head: 'round', recess: 0.2, lintel: false, frames: ['#ddd5bf'], glass: ['#3a4c61', '#34465a', '#41566b'] },
    door: { w: 3.5, h: 7, fan: false, recess: 0.4, panels: 0, step: false, cols: ['#3a2c22'] },
    chimney: { where: 'none' },
    shop: { always: false, allowed: false },
    plinth: false, quoins: false, sideWindows: false, flippable: false,
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0 },
    night: { on: 0.85, curtain: 0, tv: 0, flood: 0.75 },
    resolve: _SCCD_HOOKS.resolve, build: _SCCD_HOOKS.build,
  });
})();
