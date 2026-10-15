/* Scene engine v2, building style: STEEL SWING BRIDGE (docs/dev/WORLD_ENGINE.md 14.2). Pure data; the machinery is
   70-scene-gen-4bridge.js. A road bridge of two steel lattice trusses with a camel-back top chord rising to a central pivot pier, a
   stone pier and abutments, a small control cabin on the deck: the swing bridges of the north of England's harbours and rivers
   (Whitby, Goole, Selby). Put its footprint across the water: the front edge along the bridge. Generic: no names, no signs. */
(function () {
  sceneBuildingStyleDefine('swing-bridge', {
    label: 'Steel swing bridge', eras: [1880, 1950], regions: ['uk'], grouping: 'detached',
    storeys: [1, 1], storeyH: [7], frontage: [40, 60], depth: [7, 10], roof: 'flat', party: 'none', plinth: false,
    wall: { cols: ['#8d8a80'], grime: '#3a352c', texture: 'stone', mortar: '#7a766c' },
    roofMat: { cols: ['#5a5f66'], kind: 'lead' },
    dress: { cols: ['#c4baa0'] },
    win: { type: 'sash', panes: [1, 1], w: 1.0, hk: 0.5, sill: 1.0, head: 'flat', recess: 0.2 },
    door: { w: 1.0, h: 2.0, fan: false, recess: 0.2, panels: 0, cols: ['#2a2a28'] },
    chimney: { where: 'none' },
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0, porch: 0 },
    night: { on: 0, curtain: 0, tv: 0 },
    flippable: false, sideWindows: false,
    bridge: { deck: 0.6, depth: 3.5, rise: 1.8, panel: 3.0, steel: '#5b6870', stone: '#8d8a80', road: '#4a4c50', roof: '#5a5f66', water: -3.2 },
    resolve: _SCBR_HOOKS.resolve, build: _SCBR_HOOKS.build,
  });
})();
