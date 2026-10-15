/* Scene engine v2, building style: timber-framed (medieval and Tudor: York, Chester, Lavenham, Stratford). Pure data plus the hooks of
   70-scene-gen-1timber.js. Close-studded or box-frame oak with plaster infill, JETTIED upper storeys (each overhangs the one below),
   steep gables or ridges along the street, clay-tile roofs, leaded casements, shopfronts with a stall board, awning and hanging sign,
   a tall brick stack on a party wall. Varied storey heights and overhangs so a row never repeats. */
(function () {
  sceneBuildingStyleDefine('timber-framed', {
    label: 'Timber-framed (jettied)', eras: [1350, 1650], regions: ['uk'], grouping: 'terrace',
    storeys: [2, 4], storeyH: [3.0, 2.5, 2.4, 2.1], frontage: [3.8, 7.5], depth: [6, 10], roof: 'gable', roofs: ['gable', 'gable', 'gable', 'pitched-side', 'pitched-side'], pitch: 46, party: 'both',
    wall: { cols: ['#e8e1cd', '#e2d7b8', '#dccfae'], grime: '#4a4234', texture: 'render' },
    roofMat: { cols: ['#a5573a', '#9d4f36', '#b2603f', '#8f6a54', '#7a4a38', '#5a5e66'], kind: 'tile' },
    dress: { cols: ['#33261b'] },
    win: { type: 'leaded', panes: [3, 1], w: 1.1, hk: 0.4, sill: 0.8, head: 'flat', recess: 0.1, lintel: false, frames: ['#2d231a', '#33261b'], glass: ['#2f3d44', '#33434a', '#2c3a40'] },
    door: { w: 1.0, h: 2.05, fan: false, recess: 0.18, panels: 2, step: false, cols: ['#2a3a2e', '#3a2a22', '#1f2a3a', '#4a2a2a'] },
    chimney: { where: 'party', pots: [1, 3], h: 1.5, w: 0.5, d: 0.7 },
    shop: { always: false, allowed: true },
    plinth: false, quoins: false, sideWindows: false, flippable: false,
    details: { downpipe: 0, alarm: 0, boxes: 0.25, ivy: 0.04 },
    night: { on: 0.6, curtain: 0.3, tv: 0.04 },
    timber: { flush: 0.12 },
    resolve: _SCTF_HOOKS.resolve, build: _SCTF_HOOKS.build,
    // a footprint that is not a plain quad (the generator's plain model) takes the house layout
    front(sp, face, model, out) { _scbgLayouts.house(sp, face, model, out); },
  });
})();
