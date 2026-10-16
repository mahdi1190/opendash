/* Scene engine v2, building style: PANTILE COTTAGE (docs/dev/SCENE_ENGINE_V2.md 19.3; docs/dev/WORLD_ENGINE.md 14.2). Pure data.
   The fishing-town house of the north-east coast of England (Whitby, Staithes, Robin Hood's Bay, Scarborough, Filey): a small two- or
   three-storey house of local stone or colour-washed render with a steep-ish roof of RED PANTILES (the S-section clay tile), the ridge
   along the lane or a gable end to it (so a hillside row reads as stepped gables), a brick or stone stack on the gable, plain sashes
   and small casements, a plank or four-panel door straight off the lane. No fan-lights, no bays: these are working houses, packed
   together and stacked up the slope. Generic: no names, no signs. */
(function () {
  sceneBuildingStyleDefine('pantile-cottage', {
    label: 'Pantile cottage (north-east coast)', eras: [1650, 1900], regions: ['uk', 'north-yorkshire', 'north-east'], grouping: 'terrace',
    storeys: [2, 3], storeyH: [2.7, 2.5, 2.25], frontage: [4.2, 6.8], depth: [5.5, 8.5], roof: 'pitched-side', pitch: 37, party: 'both',
    roofs: ['pitched-side', 'gable', 'pitched-side', 'gable', 'pitched-side'],
    wall: {
      cols: ['#a39274', '#9a8a6c', '#b3a07c', '#8d806a', '#a85f42', '#9c5538', '#b8a888'], grime: '#3a342b', texture: 'stone', mortar: '#bfb49c',
      // colour-washed render (cream, white, pale blue, pale pink, ochre): the bright houses of the harbour front
      alt: { chance: 0.42, cols: ['#ece4cf', '#e6dcc0', '#f1ece0', '#c7d3d6', '#e2c9bd', '#dcc28e', '#d9d3c0'], texture: 'render' },
    },
    roofMat: { cols: ['#93402a', '#883a26', '#9d4a32', '#7e3624', '#a2503a', '#6f3222', '#8a4232', '#5e4a44'], kind: 'tile' },
    dress: { cols: ['#d8d0bc', '#cfc6b0', '#e4dec9'] },
    plinth: 0.28,
    win: { type: 'sash', panes: [2, 2], w: 0.92, hk: 0.5, sill: 0.85, head: 'flat', recess: 0.14, lintelH: 0.2, frames: ['#f4f1e8', '#eee9dc', '#e4ded0', '#2f3a44'] },
    door: { w: 0.92, h: 2.0, fan: false, recess: 0.18, panels: 4, cols: ['#1f3a5a', '#5a1f24', '#24462e', '#1d1f22', '#3d4f6a', '#6a2a3a', '#2f4a4a', '#e8e2d0'] },
    chimney: { where: 'end', pots: [1, 3], h: 1.1, w: 0.55, d: 0.62 },
    colW: 2.3, margin: 0.3, sideWindows: false, quoins: false,
    details: { downpipe: 0.45, alarm: 0.1, boxes: 0.5, ivy: 0.1 },
    night: { on: 0.6, curtain: 0.5, tv: 0.1 },
  });
})();
