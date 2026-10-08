/* Scene engine v2, building style: stone cottage (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data plus a hook.
   Coursed stone (gritstone or limestone), a stone-slate roof, small two- or three-light mullioned windows, a low boarded
   door, a stack at each gable end. */
(function () {
  sceneBuildingStyleDefine('stone-cottage', {
    label: 'Stone cottage', eras: [1600, 1900], regions: ['uk', 'pennines', 'cotswolds'], grouping: 'terrace',
    storeys: [1, 2], storeyH: [2.6, 2.4], frontage: [4.2, 6], depth: [5.5, 7], roof: 'pitched-side', pitch: 38, party: 'both',
    wall: { cols: ['#8a7e66', '#7a705c', '#9a8e74', '#c8bea4', '#bdb294'], grime: '#3a362c', texture: 'stone', mortar: '#b8ae98' },
    roofMat: { cols: ['#5e5a52', '#6a655a', '#57534c'], kind: 'stone' },
    dress: { cols: ['#a89e86', '#b8ae96'] },
    plinth: 0.25,
    win: { type: 'mullion', panes: [2, 1], w: 1.15, hk: 0.45, sill: 0.85, head: 'flat', recess: 0.18, lintelH: 0.26, frames: ['#e8e2d2', '#f2efe6'] },
    door: { w: 0.85, h: 1.95, fan: false, recess: 0.2, panels: 0, cols: ['#3a4a3a', '#5a3a2a', '#2a3a4a', '#6a6a5a'] },
    chimney: { where: 'end', pots: [1, 2] },
    colW: 2.3, sideWindows: false,
    details: { downpipe: 0.4, alarm: 0.05, boxes: 0.35, ivy: 0.15 },
    night: { on: 0.55, curtain: 0.5, tv: 0.1 },
    front(sp, face, model, out) {
      _scbgLayouts.house(sp, face, model, out);
      for (const e of out.elems) if (e.k === 'door') { e.boards = true; e.panels = 0; }
    },
  });
})();
