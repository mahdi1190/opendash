/* Scene engine v2, building style: red-brick mill or warehouse (docs/dev/SCENE_ENGINE_V2.md 19.3; builder F). Pure data plus a hook.
   4 to 6 storeys of red brick, a regular grid of segmental-arched windows, a loading-door bay with a hoist beam, string
   courses at the floors, and (seeded) an engine-house chimney beside it. */
(function () {
  sceneBuildingStyleDefine('mill', {
    label: 'Red-brick mill or warehouse', eras: [1790, 1914], regions: ['uk', 'north'], grouping: 'block', layout: 'grid',
    storeys: [4, 6], storeyH: [3.8, 3.5], frontage: [24, 60], depth: [14, 20], roof: 'pitched-side', pitch: 22,
    wall: { cols: ['#8e3e2c', '#9a4630', '#7e3828', '#a04c34'], grime: '#2a2420', texture: 'brick', mortar: '#b8a890' },
    roofMat: { cols: ['#3e444c', '#464c54'], kind: 'slate' },
    dress: { cols: ['#c8bea8', '#bab09a'] },
    win: { type: 'metal', panes: [4, 4], w: 1.5, hk: 0.56, sill: 0.95, head: 'seg', recess: 0.2, lintelCol: 'wall', frames: ['#2e3236', '#3a3e42', '#5a3a2a'], glass: ['#2c3640', '#323c46', '#283038'] },
    door: { w: 1.4, h: 2.6, fan: false, panels: 0, recess: 0.25, cols: ['#3a2a1e', '#2a3a2e'] },
    grid: { col: 3.4, margin: 0.8, loading: true, doorCol: '#3a2a1e' },
    chimney: { where: 'none' },
    bands: [{ storey: 1, h: 0.2, col: '#6e3022' }, { storey: 2, h: 0.2, col: '#6e3022' }, { storey: 3, h: 0.2, col: '#6e3022' }, { storey: 4, h: 0.2, col: '#6e3022' }, { storey: 5, h: 0.2, col: '#6e3022' }],
    sideWindows: true,
    details: { downpipe: 0.8, alarm: 0, boxes: 0, ivy: 0.1 },
    night: { on: 0.35, curtain: 0, tv: 0 },
    extraBlocks(sp, m) {
      if (!m.quad || sp.extra >= 0.45) return [];
      // an engine-house chimney behind one end: square, tapering, about twice the mill's height
      const p = sp.extra < 0.22 ? m.Q(0.08, 1.35, 0) : m.Q(0.92, 1.35, 0);
      return [{ kind: 'tower', at: [p[0], p[2]], base: 2.6, top: 1.7, h: Math.min(60, m.E * 2.1), col: sp.wall }];
    },
  });
})();
