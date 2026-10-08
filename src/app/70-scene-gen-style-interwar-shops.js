/* Scene engine v2, building style: interwar shopping parade (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   Shopfronts with pilasters, a fascia (a board for a sign: words only through sceneSignText and only with signage: true)
   and a stall riser; flats over with metal windows; a flat roof behind a brick parapet. Rows of 3 to 8. */
(function () {
  sceneBuildingStyleDefine('interwar-shops', {
    label: 'Interwar shops', eras: [1919, 1939], regions: ['uk'], grouping: 'row', layout: 'shops', flippable: false,
    storeys: [2, 3], storeyH: [3.8, 2.9, 2.7], frontage: [5, 7], depth: [10, 14], roof: 'flat', parapet: 0.9, party: 'both',
    wall: { cols: ['#a0583c', '#8e4e36', '#b06a48', '#9a5e44'], grime: '#3a3028', texture: 'brick', mortar: '#d0c4ac' },
    roofMat: { cols: ['#3a3c40'], kind: 'felt' },
    dress: { cols: ['#e0d8c4', '#d4ccb6'] },
    coping: '#d8d0bc',
    win: { type: 'metal', panes: [3, 2], w: 1.5, hk: 0.55, sill: 0.95, head: 'flat', recess: 0.08, frames: ['#f2f2ee', '#2e3236'] },
    door: { w: 0.95, h: 2.1, fan: true, panels: 2, recess: 0.12, cols: ['#2a2a2a', '#1f3a5a', '#3a2a1e'] },
    shop: { always: true, fascia: 0.65, riser: 0.5, pilaster: 0.32, awning: true, top: 3.5, cols: ['#1f3a34', '#5a1f24', '#1d2a44', '#3a2a1e', '#2a2a2a', '#4a5a2a', '#6a2a3a', '#2a4a5a'] },
    chimney: { where: 'none' },
    bands: [{ storey: 2, dz: 0.05, h: 0.18, col: 'dress' }],
    colW: 2.6, sideWindows: false,
    details: { downpipe: 0.5, alarm: 0.5, boxes: 0.15, ivy: 0 },
    night: { on: 0.5, curtain: 0.4, tv: 0.15 },
  });
})();
