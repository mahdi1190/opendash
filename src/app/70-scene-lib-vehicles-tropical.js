/* ============================================================
   SCENE LIBRARY: vehicles, the tropical kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   variant.

   vehicle.tuk-tuk   an auto-rickshaw: a three-wheeled cab with a canopy
                     roof and fringe, an open passenger bench, the driver
                     at the handlebars behind a small windscreen. 3 plain
                     colour schemes (no liveries, plates or lettering).
   vehicle.scooter   a step-through scooter with its rider in a helmet:
                     v0 red, v1 cream, v2 blue with a delivery box.

   Both FACE RIGHT and idle with a little engine shake (bob). Head, tail
   and indicator lamps light at real dusk (glow 'lamp'); the headlight
   beam is the 'lit' part. Anchor: the ground under the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const wheel = (x, y, rad) => [['@tyre', circ(x, y, rad)], ['@rim.0', circ(x, y, rad * .55)], ['@rim.1', circ(x, y, rad * .2)], { s: '@rim.1', w: .6, op: .6, d: `M${f1(x - rad * .5)} ${f1(y)}h${f1(rad)}M${f1(x)} ${f1(y - rad * .5)}v${f1(rad)}` }];
  const beam = (x, y, len) => ({ f: { lin: [[0, '@beam', .4], [1, '@beam', 0]], x1: x, y1: y, x2: x + len, y2: y }, d: `M${f1(x)} ${f1(y - 2)}L${f1(x + len)} ${f1(y - 14)}L${f1(x + len)} ${f1(y + 22)}L${f1(x)} ${f1(y + 3)}z` });
  const SKIN = ['#c98e6a', '#9a6444', '#e0b090'];

  /* ---------- vehicle.tuk-tuk ---------- */
  defineObj({
    id: 'vehicle.tuk-tuk', category: 'vehicle', size: [104, 76], variants: 3, seasonal: false, flippable: true, parts: ['body', 'lit'],
    palette: { base: {
      paint: ['#2f8a4a', '#2a68b0', '#e0a820'], paintD: ['#1f6034', '#1c4a80', '#b07c10'], paintL: ['#5aaa6a', '#5a90d0', '#f4c850'],
      roof: ['#1e2a22', '#202a38', '#2e2416'], fringe: ['#e8c040', '#e8e4dc', '#c03a2a'], seat: ['#7a2a24', '#3a3a44', '#2a3a5a'],
      chrome: ['#c8ccd0', '#8a9098'], tyre: '#1e1e20', rim: ['#a8acb0', '#4a4e54'], chassis: '#2a2a2c', glass: ['#9ab8c8', '#5a7a8a'],
      lampF: '#f4f0d8', lampR: '#c02a1e', amber: '#e89a2a', dome: '#e8e0c8', beam: '#fff2c8',
      skin: SKIN, shirt: ['#e8e4dc', '#3a6a9a', '#c84a3a'], trou: '#2f3640', hair: '#1f1a18',
    } },
    night: { glow: { lamp: '#fff0c0', window: '#ffd690' }, on: 1 },
    anim: { bob: { part: 'body', dy: .6, period: .45 } },
    shadow: { rx: 50, ry: 5, h: 70 },
    tags: ['asia', 'southeast-asia', 'south-asia', 'tuk-tuk', 'rickshaw', 'street', 'taxi', 'kit:vehicles', 'kit:tropical', 'kit:urban', 'role:vehicle'],
    credit: 'drawn for the tropical vehicles kit',
    build(v) {
      const p = `@paint.${v}`, pd = `@paintD.${v}`, pl = `@paintL.${v}`, body = [], lit = [];
      body.push(['@chassis', rect(-48, -20, 80, 6)], ['@chassis', `M-42 -16a12 10 0 0 1 24 0zM27 -15a10 9 0 0 1 19 0z`]);
      // the canopy posts behind the bodywork
      body.push({ s: '@chrome.1', w: 2, d: 'M-50 -63V-34M-10 -63V-40M30 -63V-44' });
      // the passenger bench: backrest and cushion, then the tub around it
      body.push([`@seat.${v}`, rect(-49, -60, 7, 26)], [`@seat.${v}`, rect(-46, -42, 34, 7)], ['#000000', rect(-46, -36, 34, 1.4), .25]);
      body.push([p, 'M-52 -14V-30Q-52 -37 -45 -37H-38V-30H-8V-14z'], [pd, 'M-52 -18H-8V-14H-52z'], [pl, rect(-52, -31, 44, 2)], ['@fringe.' + v, rect(-52, -26, 44, 2), .9]);
      // the driver: seated, hands on the bar, legs down to the floor
      const sk = `@skin.${v}`;
      body.push([`@seat.${v}`, rect(-6, -40, 16, 5)], [`@seat.${v}`, rect(-8, -54, 4, 18)]);
      body.push({ s: '@trou', w: 6, d: 'M0 -39H12L14 -22' }, { s: `@shirt.${v}`, w: 9, d: 'M1 -40L3 -54' }, { s: `@shirt.${v}`, w: 3.6, d: 'M4 -52L12 -46' }, { s: sk, w: 3, d: 'M12 -46L18 -47' }, [sk, circ(4, -60, 4.4)], ['@hair', 'M-.6 -61a4.6 4.6 0 0 1 9 -1q-4 -2 -9 1z'], ['@chassis', ell(15, -15, 3.4, 1.8)]);
      // the front: the cowl over the front wheel, windscreen, handlebar, lamps
      body.push(['@chassis', rect(-8, -22, 28, 8)], [p, 'M16 -14V-40Q30 -46 41 -38L49 -22Q51 -14 45 -14H44a9.5 9 0 0 0 -16 0z'], [pd, 'M38 -36L49 -22Q51 -14 45 -14H44a9.5 9 0 0 0 -10 -7z', .6], [pl, 'M17 -38Q30 -44 40 -37l-1 2Q30 -41 18 -36z', .8]);
      body.push(['@glass.0', 'M24 -42L28 -63H35L33 -41z', .75], ['@glass.1', 'M30 -63H35L33 -41H31z', .5], { s: '@chrome.1', w: 1.2, d: 'M24 -42L28 -63H35L33 -41' }, { s: '@chassis', w: 2, d: 'M12 -45L22 -48' });
      body.push({ f: '@lampF', d: ell(47.5, -29, 2.4, 3.4), glow: 'lamp' }, ['@chrome.0', ell(47.5, -29, 2.4, 3.4) + 'M45 -33.4h4v1h-4z', .35], { f: '@amber', d: ell(46, -21, 1.6, 1.4), glow: 'lamp' }, { f: '@lampR', d: rect(-53.5, -28, 2.4, 6), glow: 'lamp' }, { f: '@amber', d: rect(-53.5, -20, 2.4, 2.4), glow: 'lamp' });
      // the roof, its fringe, the cabin lamp
      body.push(['@roof.' + v, 'M-56 -63V-67Q-56 -73 -49 -73H31Q38 -73 38 -67V-63z'], ['#ffffff', 'M-50 -72.4H30v1.4H-50z', .18], [`@fringe.${v}`, rect(-56, -63, 94, 3.2)]);
      let fr = ''; for (let i = 0; i < 23; i++) fr += `M${-55 + i * 4} -59.8q2 3 4 0`;
      body.push({ s: `@fringe.${v}`, w: 1.2, d: fr }, { f: '@dome', d: ell(-20, -61, 3, 1.3), glow: 'window' });
      body.push(...wheel(-30, -8, 8.4), ...wheel(36, -8, 7.8));
      lit.push(beam(49, -28, 70), { f: { rad: [[0, '@dome', .35], [1, '@dome', 0]], cx: -20, cy: -50, r: 30 }, d: rect(-50, -62, 60, 48) });
      return { body, lit };
    },
  });

  /* ---------- vehicle.scooter ---------- */
  defineObj({
    id: 'vehicle.scooter', category: 'vehicle', size: [74, 74], variants: 3, seasonal: false, flippable: true, parts: ['body', 'lit'],
    palette: { base: {
      paint: ['#c83a34', '#e8e0cc', '#2f6aa8'], paintD: ['#8e2622', '#bcb29c', '#1f4a7a'], paintL: ['#e86a5e', '#fbf6e8', '#5a92cc'],
      helmet: ['#f0f0ec', '#2a2a2e', '#e8c030'], visor: '#2a3a4a', shirt: ['#3a6a8a', '#c86a3a', '#4a7a4a'], shirtD: ['#2a4a64', '#9a4a26', '#345a34'],
      trou: ['#2f3640', '#4a4a5a', '#3a3428'], shoe: '#1e1a18', skin: SKIN, box: ['#c84a2a', '#8a2a18'],
      seat: '#1e1e22', chassis: '#2a2a2c', tyre: '#1e1e20', rim: ['#a8acb0', '#4a4e54'], chrome: ['#c8ccd0', '#6a7078'], floor: '#3a3a3e',
      lampF: '#f4f0d8', lampR: '#c02a1e', amber: '#e89a2a', beam: '#fff2c8',
    } },
    night: { glow: { lamp: '#fff0c0' }, on: 1 },
    anim: { bob: { part: 'body', dy: .5, period: .4 } },
    shadow: { rx: 30, ry: 3.4, h: 64 },
    tags: ['asia', 'southeast-asia', 'scooter', 'moped', 'motorbike', 'rider', 'street', 'kit:vehicles', 'kit:tropical', 'kit:urban', 'role:vehicle'],
    credit: 'drawn for the tropical vehicles kit',
    build(v) {
      const p = `@paint.${v}`, pd = `@paintD.${v}`, pl = `@paintL.${v}`, body = [], lit = [];
      if (v === 2) body.push(['@box.0', rect(-36, -50, 17, 15)], ['@box.1', rect(-24, -50, 5, 15), .7], ['#ffffff', rect(-36, -50, 17, 1.6), .25], { s: '@chrome.1', w: 1.2, d: 'M-34 -35V-31M-21 -35V-31' });
      // the far foot, the frame and fork, the rear body, the floorboard, the leg shield
      body.push({ s: '@chrome.1', w: 2.2, d: 'M19 -42L22 -8' }, ['@floor', rect(-4, -15, 20, 3.6)]);
      body.push([p, 'M-34 -15Q-36 -29 -24 -32H-2Q4 -26 0 -15z'], [pd, 'M-33 -19H0Q1 -17 0 -15H-34z', .8], [pl, 'M-30 -30Q-26 -31.5 -18 -31.5L-18 -30Q-26 -29.6 -30 -28z', .8], ['@chassis', 'M-28 -15a8 7 0 0 1 16 0z']);
      body.push([p, 'M12 -12L17 -12Q24 -30 21 -46H15Q17 -30 10 -14z'], [pd, 'M17 -12Q24 -30 21 -46H19Q21 -30 15 -12z', .7], [p, 'M14 -9a8 7.5 0 0 1 16 0h-3a5 5 0 0 0 -10 0z']);
      body.push(['@seat', 'M-29 -32Q-16 -36.5 -3 -33V-31H-29z']);
      // the rider: legs to the floorboard, the torso upright, arms to the bar, a helmet with a visor
      const sk = `@skin.${v}`;
      body.push({ s: `@trou.${v}`, w: 7, d: 'M-12 -36L6 -36' }, { s: `@trou.${v}`, w: 6, d: 'M6 -36L9 -18' }, ['@shoe', ell(11, -15.6, 4.4, 2.2)]);
      body.push({ s: `@shirt.${v}`, w: 11, d: 'M-12 -39L-7 -56' }, { s: `@shirtD.${v}`, w: 4, op: .8, d: 'M-8 -40L-4 -55' }, { s: `@shirt.${v}`, w: 4, d: 'M-6 -54L5 -47' }, { s: sk, w: 3, d: 'M5 -47L13 -48' }, { s: sk, w: 3, d: 'M-5 -58V-61' });
      body.push([`@helmet.${v}`, 'M-11 -64a7 7.4 0 0 1 14 0v2h-14z'], ['@visor', 'M-1 -66h4.4v4.4q-2 1 -4.4 0z'], ['#ffffff', 'M-8.4 -68q3 -3.4 7 -2.6q-4 .6 -6 3z', .35], [sk, rect(-3, -62, 5, 4)]);
      // handlebar, lamps, wheels
      body.push({ s: '@chassis', w: 2, d: 'M11 -48L21 -47' }, ['@chrome.0', ell(21.5, -45, 3, 3.4)], { f: '@lampF', d: ell(22.5, -45, 2, 2.6), glow: 'lamp' }, { f: '@amber', d: ell(18, -49, 1.4, 1.2), glow: 'lamp' }, { f: '@lampR', d: rect(-36, -27, 2.6, 4), glow: 'lamp' }, { f: '@amber', d: ell(-34.6, -30.6, 1.3, 1.1), glow: 'lamp' });
      body.push(...wheel(-20, -7.6, 7.6), ...wheel(22, -7.6, 7.6));
      lit.push(beam(24, -44, 60));
      return { body, lit };
    },
  });
})();
