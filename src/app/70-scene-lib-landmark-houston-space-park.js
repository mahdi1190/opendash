/* Houston's space heritage, shown as a museum rocket and exhibit hall.
   Native geometry; no launch claim, lettering, insignia or brands. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { rect, ell } = sceneDraw;
  sceneObjDefine({
    id: 'landmark.houston-space-park', category: 'landmark', size: [1050, 475], variants: 1,
    seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: { shell: ['#eee9da', '#d0d6d2', '#a7b6b9'], steel: ['#324654', '#607780', '#a3b6ba'], glass: '#527982', dark: '#253746', warm: '#c58f64' } },
    night: { glow: { window: '#8db8c2', lamp: '#ffe1a7' }, on: .96 },
    shadow: { rx: 62, ry: 8, h: 150 },
    tags: ['landmark', 'signature', 'place:texas/place:houston', 'houston', 'texas', 'museum', 'rocket', 'kit:urban'],
    credit: 'native: Houston space museum display and exhibit architecture',
    build() {
      const body = [], lit = [];
      const f = (col, d, extra) => body.push(Object.assign({ f: col, d }, extra));
      const st = (col, w, d, op) => body.push({ s: col, w, d, op: op == null ? 1 : op, cap: 'round', detail: w < 1.5 });
      // Low exhibit hall: saw-tooth metal roof, a glazed entrance and service bays.
      f('@shell.2', 'M-495 0V-132l52-24 58 24 53-24 58 24 54-24 60 24V0z');
      f('@shell.1', 'M-495-132l52-24 58 24H-495zM-385-132l53-24 58 24zM-274-132l54-24 60 24z');
      f('@steel.0', 'M-495-132h335v9h-335z');
      f('@shell.0', rect(-483, -120, 311, 120));
      for (let i = 0; i < 31; i++) st('@steel.1', 1.1, `M${-479 + i * 10}-119V-10`, .3);
      f('@steel.0', rect(-450, -96, 184, 96));
      for (let i = 0; i < 8; i++) {
        const x = -445 + i * 22;
        f('@glass', rect(x, -90, 17, 80));
        f('@glass', rect(x + 1, -89, 15, 41) + rect(x + 1, -44, 15, 33), { glow: 'window' });
        st('@steel.2', 1.2, `M${x}-46h17`, .9);
      }
      f('@steel.2', 'M-463-100h211l16 13h-243z');
      f('@steel.0', 'M-479-86h240v7h-240z');
      f('@warm', rect(-220, -59, 28, 59));
      for (let i = 0; i < 5; i++) st('@steel.0', 1, `M-216 ${-50 + i * 9}h20`, .5);
      f('@shell.2', 'M-510 0h366l-12 12h-342z');
      // Rocket plinth and four visibly different radial support fins.
      f('@steel.0', 'M-84 0l14-17H70L84 0z');
      f('@steel.1', 'M-69-17h138v6H-69z');
      f('@shell.1', 'M-35-106L-76-19h41zM35-106l41 87H35z');
      f('@shell.0', 'M-35-106L-65-19h12l18-38z');
      f('@steel.0', 'M-35-58l-11 38h11zM35-58l11 38H35z');
      f('@shell.0', 'M-35-20V-363l14-27H21l14 27V-20z');
      f('@shell.1', 'M12-389h9l14 26V-20H12z');
      f('@shell.2', rect(26, -362, 9, 342));
      // Capsule, adapter ring and the open emergency tower silhouette.
      f('@dark', 'M-29-363l9-49h40l9 49z');
      f('@steel.1', 'M7-411h13l9 48H14z');
      f('@steel.2', 'M-30-365h60v6h-60z');
      f('@warm', 'M-6-412v-34h12v34zM-11-446h22l-3-8H-8z');
      st('@warm', 2.4, 'M-7-414L0-469 7-414M-5-432H5M-3-448h6M-7-414l11-25M7-414l-11-25', 1);
      f('@steel.0', ell(0, -404, 5, 4));
      f('@glass', ell(0, -404, 3, 2), { glow: 'window' });
      // Structural tank rings, asymmetric service-panel seams and recessed fittings.
      for (const y of [-341, -302, -214, -137, -58]) {
        f('@steel.0', rect(-35, y, 70, 9));
        f('@shell.2', rect(-35, y + 9, 70, 2));
        f('@steel.2', rect(-35, y + 1, 17, 1));
      }
      for (let row = 0; row < 15; row++) {
        const y = -350 + row * 21;
        st('@steel.1', .9, `M-33 ${y}h66`, .4);
        for (const x of [-25, 23]) f('@steel.1', ell(x, y + 3, .9, .9), { detail: true });
      }
      st('@steel.1', .9, 'M-19-350V-24M4-350V-24', .32);
      for (const [x, y, w, h] of [[-25, -273, 14, 22], [8, -194, 12, 18], [-23, -114, 11, 16]]) {
        f('@shell.2', rect(x, y, w, h));
        f('@shell.1', rect(x + 1.5, y + 1.5, w - 3, h - 3));
        f('@steel.1', ell(x + w - 3, y + h - 4, 1, 1));
      }
      // Low perimeter rails and eight discreet display lights.
      st('@steel.0', 2.5, 'M-132 4v-29M-90 4v-29M90 4v-29M132 4v-29M-132-24h74M58-24h74', .9);
      for (const x of [-116, -88, -60, -33, 33, 60, 88, 116]) {
        f('@steel.0', `M${x - 4} 1l1-9h6l1 9z`);
        f('#e4c792', rect(x - 2, -7, 4, 2), { glow: 'lamp' });
      }
      // Night illumination follows the actual shell, preserving the tank seams.
      lit.push({ f: { lin: [[0, '#fff0ce', .32], [.5, '#fff0ce', .54], [1, '#fff0ce', .74]], x1: 0, y1: -412, x2: 0, y2: -18 }, d: 'M-34-20V-362l14-49H20l14 49V-20z' });
      for (const y of [-341, -302, -214, -137, -58]) lit.push({ f: '#687476', op: .42, d: rect(-34, y, 68, 9) });
      lit.push({ f: '#ddf5ef', op: .32, d: 'M-33-23V-362l14-47h3l-14 48V-23z' });
      return { body, lit };
    },
  });
  sceneObjDefine({
    id: 'street.houston-tracking-dish', category: 'street', size: [190, 130], variants: 1,
    seasonal: false, flippable: true, parts: ['body', 'dish', 'lit'],
    palette: { base: { metal: ['#b5c7c7', '#6e8b91', '#334f5b'], glass: '#a7d7d4' } },
    night: { glow: { lamp: '#c0eced' }, on: 1 },
    anim: { turn: { part: 'dish', pivot: [0, -56], deg: 8, period: 24, hold: .2 } },
    shadow: { rx: 48, ry: 5, h: 70 },
    tags: ['houston', 'space', 'museum', 'kit:urban', 'role:street'],
    credit: 'native: gently scanning museum tracking-dish exhibit',
    build() {
      const body = [['@metal.2', 'M-29 0l19-57h20L29 0z'], ['@metal.1', 'M-16-12l10-40h6L6-12z'], ['@metal.0', rect(-35, -5, 70, 5)]];
      const dish = [['@metal.1', 'M-78-96Q0 9 78-96Q0-35-78-96z'], ['@metal.0', 'M-78-96Q0-52 78-96Q0-22-78-96z']];
      for (let i = -2; i <= 2; i++) dish.push({ s: '@metal.1', w: 1.2, d: `M${i * 28}-94Q${i * 12}-55 0-47`, op: .8 });
      dish.push({ s: '@metal.2', w: 2, d: 'M-71-92L0-116 71-92M0-116V-72' }, ['@metal.2', ell(0, -116, 4, 4)], { f: '@glass', d: rect(-2, -121, 4, 3), glow: 'lamp' });
      return { body, dish, lit: [] };
    },
  });
})();
