/* Scene engine v2, building styles: COTSWOLD STONE (docs/dev/NEW_SCENE_GUIDE.md; 'engine work needed' of the 16 Oct fast-scene test).
   Two styles from one palette, the honey-coloured oolitic limestone of the Cotswolds:
     'cotswold-stone'   a village house, pub or barn-end: coursed honey limestone, a STEEP roof of stone slates (mossy, brown-grey, the
                        roof is the glory of the place), small mullioned windows with a drip-mould above, a stone-mullioned door, a tall
                        chimney stack at each gable. Terraced or detached, 1 to 3 storeys.
     'cotswold-church'  the parish church of a wool village: the same stone, a long low nave, and a PERPENDICULAR TOWER: a square tower
                        with a louvred belfry, a battlemented parapet and a small pinnacle on each corner (crown 'pinnacled-tower';
                        'squat-tower' and 'none' also work).
   Pure data (the church reuses the parish-church style's window and door data when it is loaded; nothing runs but the definitions). */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function') return;
  const HONEY = ['#cdb07a', '#c3a56c', '#d6bb86', '#bb9c64', '#c9ae7e', '#b99b66'], MORTAR = '#d6c7a2';
  const base = typeof sceneBuildingStyle === 'function' ? sceneBuildingStyle('stone-cottage') : null;
  sceneBuildingStyleDefine('cotswold-stone', Object.assign({}, base || {}, {
    label: 'Cotswold stone house (honey limestone, steep stone-slate roof)', eras: [1550, 1900], regions: ['uk', 'cotswolds'], grouping: 'terrace',
    storeys: [1, 2], storeyH: [2.7, 2.45], frontage: [5.2, 8], depth: [5.5, 7.5], roof: 'pitched-side', pitch: 49, party: 'both',
    wall: { cols: HONEY, grime: '#4a4232', texture: 'stone', mortar: MORTAR },
    roofMat: { cols: ['#7a6e5c', '#6c6454', '#857a64', '#5f5a4e'], kind: 'stone' },
    dress: { cols: ['#d8c496', '#cfba8a'] },
    plinth: 0.3,
    win: { type: 'mullion', panes: [3, 2], w: 1.25, hk: 0.46, sill: 0.8, head: 'flat', recess: 0.2, lintelH: 0.3, lintelCol: 'dress', frames: ['#eee8d6', '#f4f0e2', '#3e4a40'], glass: ['#2c3640', '#323c46'] },
    door: { w: 0.95, h: 2.0, fan: false, recess: 0.22, panels: 0, planks: true, cols: ['#2e4a3a', '#5a2f26', '#26364a', '#3c3a34', '#6a5a34'] },
    chimney: { where: 'end', pots: [1, 3] },
    colW: 2.4, sideWindows: true,
    details: { downpipe: 0.25, alarm: 0.04, boxes: 0.45, ivy: 0.22 },
    night: { on: 0.5, curtain: 0.5, tv: 0.08 },
  }));
  const parish = typeof sceneBuildingStyle === 'function' ? sceneBuildingStyle('parish-church') : null;
  if (!parish) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // the perpendicular tower: shaft, string course, louvred belfry, a battlemented parapet; then a pinnacle on each corner
  const pinnacled = (K) => {
    const tw = clamp(Math.min(K.Dp, K.W * 0.3), 5.6, 8.4), h = clamp(K.E0 * 3.4, 18, 25);
    const shaft = h * 0.62, belfry = h * 0.26, top = shaft + 0.5 + belfry + 0.95;
    const stages = [
      { k: 'shaft', h: shaft, rows: [0.16, 0.5], cols: [0.5], flood: false },
      { k: 'cornice', h: 0.5, out: 0.3 },
      { k: 'belfry', h: belfry, inset: 0.16, bays: 2, flood: false },
      { k: 'cornice', h: 0.95, out: 0.55 },
    ];
    const out = [{ z0: 0, behind: true, at: [tw / 2, tw / 2], w: tw, d: tw, stages }];
    const pin = (s, t) => ({ z0: top, behind: true, at: [s, t], w: 0.8, d: 0.8, stages: [{ k: 'shaft', h: 1.5, rows: [], cols: [], flood: false }, { k: 'pyramid', h: 1.1 }] });
    for (const s of [0.55, tw - 0.55]) for (const t of [0.55, tw - 0.55]) out.push(pin(s, t));
    return out;
  };
  sceneBuildingStyleDefine('cotswold-church', Object.assign({}, parish, {
    label: 'Cotswold parish church (honey limestone, pinnacled tower)', regions: ['uk', 'cotswolds'],
    wall: { cols: HONEY, grime: '#4a4232', texture: 'stone', mortar: MORTAR },
    roofMat: { cols: ['#6c6a64', '#76736a', '#62605a'], kind: 'stone' },
    dress: { cols: ['#d8c496', '#cfba8a'] },
    civic: { copper: '#6c6a64' },
    crowns: Object.assign({}, parish.crowns, { 'pinnacled-tower': pinnacled, 'squat-tower': pinnacled }),
  }));
})();
