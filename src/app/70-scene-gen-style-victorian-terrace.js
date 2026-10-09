/* Scene engine v2, building style: Victorian terrace (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data.
   Red or yellow stock brick, a canted bay on the ground floor, 2-over-2 sashes, a slate roof, a stack on each party wall,
   a recessed door with a fanlight. Rows of 4 to 10 along a street. */
(function () {
  sceneBuildingStyleDefine('victorian-terrace', {
    label: 'Victorian terrace', eras: [1840, 1900], regions: ['uk'], grouping: 'terrace',
    storeys: [2, 3], storeyH: [3.0, 2.8, 2.6], frontage: [4.6, 6.2], depth: [8, 11], roof: 'pitched-side', pitch: 32, party: 'both',
    wall: { cols: ['#9a4e36', '#a85a3c', '#8e4a34', '#a4563a', '#c2a46a', '#b8995e'], grime: '#3a3028', texture: 'brick', mortar: '#cfc4b0' },
    roofMat: { cols: ['#4a5058', '#50565e', '#454b52', '#545a60'], kind: 'slate' },
    dress: { cols: ['#d8d0bc', '#cfc6b0', '#e2dccb'] },
    win: { type: 'sash', panes: [2, 1], w: 0.95, hk: 0.6, sill: 0.9, head: 'flat', recess: 0.14, frames: ['#f2efe6', '#ece8dc', '#e8e2d2'], bayType: 'sash', bayPanes: [1, 1] },
    door: { w: 0.95, h: 2.2, fan: true, recess: 0.3, panels: 4, cols: ['#1f3a5a', '#5a1f24', '#24462e', '#1d1f22', '#3d4f6a', '#6a2a3a', '#2f4a4a'] },
    bay: { kind: 'canted', floors: 1, chance: 0.8, w: 2.4, depth: 0.7, lid: 'hip' },
    chimney: { where: 'party', pots: [1, 4] },
    bands: [{ storey: 1, dz: -0.08, h: 0.12, col: 'dress' }],
    colW: 2.5, overDoor: 0.7, sideWindows: false,
    details: { downpipe: 0.7, alarm: 0.35, boxes: 0.4, ivy: 0.08 },
    night: { on: 0.6, curtain: 0.4, tv: 0.12 },
  });
})();
