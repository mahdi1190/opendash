/* Scene engine v2, building style: PARISH CHURCH (docs/dev/WORLD_ENGINE.md 14.2). Pure data plus the crown presets. A plain old
   parish church of grey-cream stone: a long low nave under a shallow roof of grey slate or stone, tall round-headed windows with
   leaded lights, a small door at one end, and a SQUAT TOWER at the west end (a crown). The kind of church that sits on a headland or a
   hillside above a fishing town and is read from far away by its tower: no spire, a flat top with a parapet, a louvred belfry.
   A building's `crown` picks the tower:
     'squat-tower'    a square tower at the left end of the front edge (the west end), twice the height of the nave, a belfry, a parapet
     'tower-turret'   the same with a small stair turret on one corner
     'none'           no tower (a chapel)
   Generic: no names, no flags, no religious symbols, no clock or lettering. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const squat = (K, turret) => {
    const tw = clamp(Math.min(K.Dp, K.W * 0.3), 5.2, 8), h = clamp(K.E0 * 2.2, 11, 17);
    const stages = [
      { k: 'shaft', h: h * 0.64, rows: [0.2, 0.55], cols: [0.5], flood: false },
      { k: 'cornice', h: 0.5, out: 0.28 },
      { k: 'belfry', h: h * 0.24, inset: 0.18, bays: 2, flood: false },
      { k: 'cornice', h: 0.95, out: 0.5 },
    ];
    const out = [{ z0: 0, behind: true, at: [tw / 2, tw / 2], w: tw, d: tw, stages }];
    if (turret) out.push({ z0: 0, behind: true, at: [tw + 0.1, 1.0], w: 1.5, d: 1.5, stages: [{ k: 'shaft', h: h * 1.12, rows: [], cols: [], flood: false }, { k: 'pyramid', h: 1.6 }] });
    return out;
  };
  sceneBuildingStyleDefine('parish-church', {
    label: 'Parish church (stone, squat tower)', eras: [1100, 1850], regions: ['uk'], grouping: 'detached',
    storeys: [1, 1], storeyH: [6.2], frontage: [20, 28], depth: [9, 12], roof: 'pitched-side', pitch: 27, party: 'none', plinth: 0.5,
    wall: { cols: ['#c8c1ac', '#bdb6a1', '#c4bca4', '#b8b09a'], grime: '#4a443a', texture: 'stone', mortar: '#a69e88' },
    roofMat: { cols: ['#5c6068', '#60646c', '#565a62'], kind: 'slate' },
    dress: { cols: ['#d6cfbb', '#d0c9b4'] },
    win: { type: 'leaded', panes: [2, 4], w: 1.25, hk: 0.64, sill: 1.5, sill0: 1.5, head: 'round', recess: 0.28, lintelH: 0.3, frames: ['#cfc8b2', '#c8c0aa'], glass: ['#2c3640', '#323c46'] },
    door: { w: 1.5, h: 2.7, fan: false, recess: 0.35, panels: 0, planks: true, cols: ['#3a2c20', '#2a2a28', '#4a3a28'] },
    chimney: { where: 'none' },
    colW: 3.6, margin: 1.4, sideWindows: false, flippable: false,
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0.1, porch: 0 },
    night: { on: 0.12, curtain: 0, tv: 0 },
    civic: { copper: '#5c6068' },
    crowns: { 'squat-tower': (K) => squat(K, false), 'tower-turret': (K) => squat(K, true), none: () => [] },
  });
})();
