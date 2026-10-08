/* Scene engine v2, building style: modern glass and steel (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   A curtain wall on a mullion and transom grid, spandrel panels at the floors, a podium storey under a canopy slab, a lit
   core at night. */
(function () {
  sceneBuildingStyleDefine('modern-glass', {
    label: 'Modern glass and steel', eras: [1990, 2030], regions: ['uk'], grouping: 'block', layout: 'curtain', flippable: false,
    storeys: [5, 12], storeyH: [4.5, 3.5], frontage: [18, 40], depth: [16, 24], roof: 'flat', parapet: 1.0,
    wall: { cols: ['#9aa4ac', '#8c969e', '#b4bcc2', '#7e8a94'], grime: '#4a5058', texture: 'glass' },
    roofMat: { cols: ['#5a6066'], kind: 'metal' },
    dress: { cols: ['#c8ccd0'] },
    coping: '#c8ccd0',
    win: { glass: ['#3a5468', '#34506a', '#46627a', '#2e4a60'], frames: ['#a8b0b6'] },
    grid: { col: 1.5, spandrel: 0.9, mullion: '#a8b0b6', slab: '#dcdfe2', canopy: 2.0 },
    chimney: { where: 'none' }, plinth: false,
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0 },
    night: { on: 0.45, curtain: 0, tv: 0 },
  });
})();
