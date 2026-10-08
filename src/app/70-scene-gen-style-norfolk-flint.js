/* Scene engine v2, building style: Norfolk flint (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   Knapped or cobble flint panels with brick quoins and window dressings, a pantile roof, the gable end to the street on
   some, with a Dutch gable (seeded). Cottages in short rows. */
(function () {
  sceneBuildingStyleDefine('norfolk-flint', {
    label: 'Norfolk flint', eras: [1650, 1880], regions: ['uk', 'east-anglia'], grouping: 'terrace',
    storeys: [2, 2], storeyH: [2.7, 2.5], frontage: [4.5, 7], depth: [6, 8], roof: 'pitched-side', roofs: { 'pitched-side': 6, gable: 4 }, pitch: 46, party: 'both', dutch: 0.55,
    wall: { cols: ['#5a5c60', '#6a6a66', '#4e5258', '#625e58'], grime: '#2e2c2a', texture: 'flint', mortar: '#c8c2b4' },
    roofMat: { cols: ['#a8553a', '#b4603e', '#9a4a34', '#8a4430'], kind: 'pantile' },
    dress: { cols: ['#9a4e36', '#a85a3c', '#8e4a34'] },
    quoins: true, surround: true,
    win: { type: 'casement', panes: [2, 2], w: 0.9, hk: 0.5, sill: 0.85, head: 'seg', recess: 0.12, lintelCol: 'dress', frames: ['#f2efe6', '#e8e2d2'] },
    door: { w: 0.85, h: 1.95, fan: false, recess: 0.15, panels: 0, cols: ['#2f4a3a', '#5a3a2a', '#2a3a4a', '#6a2a2a'] },
    chimney: { where: 'end', pots: [1, 2] },
    colW: 2.3, sideWindows: false,
    details: { downpipe: 0.5, alarm: 0.1, boxes: 0.4, ivy: 0.18 },
    night: { on: 0.55, curtain: 0.45, tv: 0.1 },
  });
})();
