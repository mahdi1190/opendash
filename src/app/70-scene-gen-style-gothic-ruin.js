/* Scene engine v2, building style: GOTHIC RUIN (docs/dev/WORLD_ENGINE.md 14.2). Pure data plus the plan presets; the machinery is
   70-scene-gen-3ruin.js. A roofless church of honey-grey sandstone with pointed lancet windows: what is left of an abbey or a priory after
   the roof, the vaults and most of the south side have fallen. A building's `crown` picks a preset (the plan laid on its footprint:
   s along the front edge, t inward from it; the front edge is the SOUTH side, so the tall north wall's inner face is what the eye sees
   through the broken south wall, the way the famous ruins are seen):
     'abbey'        a long choir with a tall north wall of three tiers of lancets and a lower nave arcade running west, a great east end
                    of three tiers with its two corner turrets, a low broken south wall, a west front with the stump of a tower and a tall
                    pointed doorway, and free-standing crossing piers
     'chapel'       a small roofless chapel: one gable end with a triple lancet, two low side walls
   Generic: no names, no flags, no religious symbols. Heights follow the building's `h` (default 24 m: the tallest wall). */
(function () {
  const abbey = (K) => {
    const { W, D } = K, r = K.rnd, k = K.H / 24, m = v => v * k;
    // the three tiers of the choir: lower lancets, the triforium arches, the clerestory lancets
    const T = [{ z0: m(1.6), h: m(5.8), w: 0.95, kind: 'lancet' }, { z0: m(8.8), h: m(4.2), w: 0.9, kind: 'lancet' }, { z0: m(14.6), h: m(6.4), w: 1.05, kind: 'lancet' }];
    const TE = [{ z0: m(2.0), h: m(5.8), w: 1.5, kind: 'lancet' }, { z0: m(9.6), h: m(5.4), w: 1.4, kind: 'lancet' }, { z0: m(16.6), h: m(6.8), w: 1.5, kind: 'lancet' }];
    const runs = [], blocks = [], nz = D - 2.4, nS = 0.1 * W, nE = W - 2.2;
    // the north wall: the nave arcade low and broken in the west, the choir tall in the east
    runs.push({ a: [nS, nz], b: [nE, nz], th: 1.7, cols: _scruBays({ len: nE - nS, pier: 1.5, pitch: 5.4, lights: 2, rnd: r,
      top: (u) => m(7 + 14.5 * _scruSmooth((u - 0.34) / 0.55)) + (r() - 0.5) * m(3.0),
      tiers: (top) => _scruFitTiers(top, T, r, 0.5) }) });
    // the east end: three tiers of lancets, the top broken
    const eT = [m(24.2), m(25.6), m(22.4)];
    runs.push({ a: [W - 1.6, 1.4], b: [W - 1.6, D - 1.4], th: 2.0, cols: _scruBays({ len: D - 2.8, pier: 2.1, pitch: 6.6, lights: 1, rnd: r,
      top: (u, i) => eT[i % 3] + (r() - 0.5) * m(1.2), tiers: (top) => _scruFitTiers(top, TE, r, 1) }) });
    // the south wall: low, broken, with a few lancets in its eastern bays
    const sS = 0.26 * W, sE = W - 2.2;
    runs.push({ a: [sS, 1.0], b: [sE, 1.0], th: 1.6, cols: _scruBays({ len: sE - sS, pier: 1.5, pitch: 5.4, lights: 1, rnd: r,
      top: (u) => m(2.2 + 7.0 * _scruSmooth((u - 0.45) / 0.55)) + (r() - 0.5) * m(1.6),
      tiers: (top, u) => u < 0.45 ? [] : _scruFitTiers(top, T.slice(0, 1), r, 0.6) }) });
    // the west front: a tall pointed doorway under a window, the stump of a tower beside it
    runs.push({ a: [1.2, 1.6], b: [1.2, D - 1.6], th: 1.8, cols: [{ w: 2.6, top: m(15.5) }, { w: 5.4, top: m(17.8), tiers: [{ z0: 0, h: m(8.6), w: 3.4, kind: 'lancet' }, { z0: m(10.6), h: m(5.4), w: 1.3, kind: 'lancet' }] },
      { w: 2.6, top: m(11.4) }, { w: 3.6, top: m(8.6), tiers: [{ z0: m(2.2), h: m(4.6), w: 1.1, kind: 'lancet', gap: true }] }, { w: 2.6, top: m(13.2) }] });
    // piers: the tower stumps, the east turrets with their pinnacles, the crossing
    const stump = [{ z0: m(2.6), h: m(5.4), w: 1.0, kind: 'lancet' }, { z0: m(9.6), h: m(5.0), w: 1.1, kind: 'lancet' }];
    blocks.push({ c: [2.6, D - 2.6], w: 4.6, d: 4.6, h: m(17.5), cap: 'broken', tiers: stump, th: 1.5, gapAt: 0 }, { c: [2.6, 2.6], w: 5.2, d: 5.2, h: m(9.5), cap: 'broken', tiers: stump.slice(0, 1), th: 1.5, gapAt: 0 });
    blocks.push({ c: [W - 1.6, 1.9], w: 4.0, d: 3.4, h: m(23.2), cap: 'pinnacle', pin: m(1.2) }, { c: [W - 1.6, D - 1.9], w: 4.0, d: 3.4, h: m(22.6), cap: 'pinnacle', pin: m(1.2) });
    // the crossing: a great pointed arch standing across the church (the part of the tower's four arches that stayed), a lesser one beyond it
    const cx = 0.47 * W, cl = D - 3.4;
    runs.push({ a: [cx, 2.0], b: [cx, cl], th: 1.9, cols: [{ w: 2.6, top: m(16.5) }, { w: cl - 2.0 - 5.6, top: m(18.5), tiers: [{ z0: 0, h: m(12.5), w: Math.min(7.6, cl - 2.0 - 6.4), kind: 'lancet' }] }, { w: 3.0, top: m(13) }] });
    // buttresses against the north wall's outer face
    const nLen = nE - nS, nb = Math.max(3, Math.round(nLen / 6));
    for (let i = 0; i < nb; i++) {
      const u = (i + 0.5) / nb, s = nS + nLen * u, top = m(7 + 14.5 * _scruSmooth((u - 0.34) / 0.55)) - m(2.8);
      if (top > 2.5) blocks.push({ c: [s, nz + 1.55], w: 1.3, d: 1.7, h: top, cap: 'broken' });
    }
    return { runs, blocks, height: m(25.6) };
  };
  const chapel = (K) => {
    const { W, D } = K, r = K.rnd, k = K.H / 24, m = v => v * k, runs = [];
    runs.push({ a: [W - 0.9, 0.6], b: [W - 0.9, D - 0.6], th: 1.4, cols: [{ w: 2.4, top: m(9.5) }, { w: 4.4, top: m(13), tiers: [{ z0: m(2.2), h: m(8.2), w: 1.0, kind: 'lancet', n: 1 }] }, { w: 2.4, top: m(8.2) }] });
    runs.push({ a: [0.4, D - 1.0], b: [W - 1.6, D - 1.0], th: 1.3, cols: _scruBays({ len: W - 2.0, pier: 1.2, pitch: 4.8, lights: 1, rnd: r, top: (u) => m(4.5 + 4.5 * u) + (r() - 0.5) * m(1.6),
      tiers: (top) => _scruFitTiers(top, [{ z0: m(1.8), h: m(4.6), w: 0.9, kind: 'lancet' }], r, 0.8) }) });
    runs.push({ a: [0.4, 1.0], b: [W * 0.6, 1.0], th: 1.3, cols: [{ w: 3, top: m(3.2) }, { w: 5, top: m(1.4) }, { w: 3, top: m(4.4) }] });
    return { runs, blocks: [{ c: [W - 0.9, 0.9], w: 1.6, h: m(10.5), cap: 'pinnacle', pin: m(2.2) }], height: m(13) };
  };
  sceneBuildingStyleDefine('gothic-ruin', {
    label: 'Gothic ruin (roofless abbey)', eras: [1100, 1540], regions: ['uk'], grouping: 'detached',
    storeys: [1, 1], storeyH: [24], frontage: [56, 72], depth: [22, 30], roof: 'flat', party: 'none', plinth: false,
    wall: { cols: ['#a99f86', '#9c9279', '#b0a68c', '#948a74'], grime: '#3a352c', texture: 'stone', mortar: '#8a806a' },
    roofMat: { cols: ['#5a5a58'], kind: 'lead' },
    dress: { cols: ['#c4baa0'] },
    win: { type: 'sash', panes: [1, 1], w: 1.0, hk: 0.5, sill: 1.0, head: 'flat', recess: 0.2 },
    door: { w: 2.0, h: 3.0, fan: false, recess: 0.3, panels: 0, cols: ['#2a2a28'] },
    chimney: { where: 'none' },
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0, porch: 0 },
    night: { on: 0, curtain: 0, tv: 0, flood: 0.4 },   // floodlit after dark, as the famous ruins are
    flippable: false, sideWindows: false,
    ruin: { default: 'abbey', presets: { abbey, chapel } },
    resolve: _SCRU_HOOKS.resolve, build: _SCRU_HOOKS.build,
  });
})();
