/* Scene engine v2, building style: brutalist (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   Board-marked concrete, deep recessed window strips, a cantilevered upper block over a recessed glazed ground floor, a
   flat roof. */
(function () {
  sceneBuildingStyleDefine('brutalist', {
    label: 'Brutalist', eras: [1955, 1979], regions: ['uk'], grouping: 'block', layout: 'brutal', flippable: false,
    storeys: [3, 8], storeyH: [4.2, 3.2], frontage: [20, 45], depth: [14, 22], roof: 'flat', parapet: 1.2,
    wall: { cols: ['#a8a49a', '#9c988e', '#b2aea2', '#8e8a82'], grime: '#4a4844', texture: 'concrete' },
    roofMat: { cols: ['#5a5a58'], kind: 'felt' },
    dress: { cols: ['#b8b4aa'] },
    coping: '#9c988e',
    win: { type: 'metal', panes: [2, 1], frames: ['#2e3236'], glass: ['#2a3440', '#303a46', '#26303a'] },
    grid: { col: 2.4, cantilever: 1.5 },
    chimney: { where: 'none' }, plinth: false,
    details: { downpipe: 0, alarm: 0.1, boxes: 0, ivy: 0.05 },
    night: { on: 0.5, curtain: 0.2, tv: 0.1 },
  });
})();
