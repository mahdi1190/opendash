/* Large scenery keeps its ground anchor while its roof, crown and moving
 * parts rise above it. Animation shares the outdoor engine clock. */
window.GardenNativeScenery = (function () {
  'use strict';
  const n = value => String(Math.round(value * 100) / 100);
  const path = (d, fill, stroke, width = 1) => `<path d="${d}" fill="${fill || 'none'}"${stroke ? ` stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`;
  const rect = (x, y, w, h, fill, r = 0, stroke) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ''}/>`;
  const windowPane = (x, y, w, h, fill, r = 0) => rect(x, y, w, h, fill, r).replace('<rect ', '<rect data-scenery-window="true" ');
  const ellipse = (x, y, rx, ry, fill, opacity = 1) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}"/>`;
  function create(scene, spec) {
    const A = GardenNativeArt, rootNode = A.element(scene, 'g', { class: (spec.kind === 'tree' ? '' : 'gd-it gd-prop ') + 'gd-native-landmark gd-native-' + spec.kind, 'data-prop': spec.id }), root = rootNode.target;
    const body = A.element(scene, 'g'), moving = [], cacheNodes = [], x = spec.x, y = spec.y, kind = spec.kind;
    rootNode.appendChild(body); cacheNodes.push(body);
    let dead = false, paused = false, clock = 0, last = null, motionWasOn = null;
    const stone = '#b9b69a', light = '#e4dcc0', shade = '#7c8d7e', ink = '#485848', wood = '#98734e', woodDark = '#634e3b', cream = '#f3e9ca', green = spec.season === 'autumn' ? '#9ba269' : '#769364';
    const addMoving = (source, px, py, animate, options) => {
      const node = A.element(scene, 'g'); node.innerHTML = source;
      const shapes = (source.match(/<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/g) || []).length;
      if (options && options.cache || shapes >= 4) {
        // Cache the complete part in its own coordinates. Its outer numeric
        // transform/alpha stays live, including sails turning through 360°.
        node.nativeBounds = node.getBBox(); cacheNodes.push(node);
      }
      node.setAttribute('transform', `translate(${n(px)} ${n(py)})`); rootNode.appendChild(node);
      // A retained part with a fixed authored pose needs no frame callback.
      // In particular, a closed district gate's leaves never change until
      // the normal model update replaces its handle with the open facade.
      if (options && options.static) animate(node, clock, {}, false);
      else moving.push({ node, x: px, y: py, animate });
      return node;
    };
    let geometry = '', b, canopyOcclusion = null;
    if (kind === 'tree') {
      const h = spec.height || 178, rx = spec.width || 81, seed = spec.seed || 0, cy = y - h * .68;
      const crowns = [], crown = (cx, yy, w, tall, phase) => {
        let d = ''; const points = [];
        for (let i = 0; i < 40; i++) { const a = i * Math.PI / 20, r = 1 + Math.sin(a * 5 + phase) * .075 + Math.cos(a * 8 - phase) * .045, px = cx + Math.cos(a) * w * r + Math.sin(a) * w * .08, py = yy + Math.sin(a) * tall * r; points.push({ x: px, y: py }); d += (i ? 'L' : 'M') + n(px) + ' ' + n(py); }
        crowns.push(points);
        return d + 'Z';
      };
      geometry = ellipse(4, 3, rx * .53, 10, '#315740', .13)
        + path(`M-9 0Q-4 ${n(-h * .3)} -8 ${n(-h * .6)}L4 ${n(-h * .66)}Q1 ${n(-h * .28)} 8 0Z`, '#7b7552', '#62704e', 1.1)
        + path(`M-2 ${n(-h * .28)}L-26 ${n(-h * .56)}M-1 ${n(-h * .4)}L22 ${n(-h * .65)}`, 'none', '#7b7552', 4)
        + path(`M-4 -4Q-1 ${n(-h * .25)} -3 ${n(-h * .47)}`, 'none', '#b3a27b', 1.5);
      const color = spec.season === 'autumn' && seed % 5 === 0 ? '#a68d50' : spec.season === 'winter' ? '#759b82' : seed % 3 ? '#547b50' : '#678858';
      const canopy = addMoving(path(crown(x, cy, rx, h * .36, seed), color, '#456449', 1.2)
        + path(crown(x - rx * .21, cy - h * .11, rx * .68, h * .23, seed + 2), spec.season === 'autumn' && seed % 5 === 0 ? '#bda967' : '#92ab70')
        + path(crown(x + rx * .28, cy + h * .13, rx * .52, h * .19, seed + 4), '#3c654b')
        + path(crown(x + rx * .26, cy + h * .08, rx * .47, h * .16, seed + 4), color), 0, 0,
      (node, t, env) => { const turn = Math.sin(t * .62 + seed) * (.18 + Math.min(.36, Math.abs(env.windX || 0) * .08)); node.setAttribute('transform', `translate(${n(x)} ${n(y)}) rotate(${n(turn)}) translate(${n(-x)} ${n(-y)})`); });
      b = { x: x - rx * 1.2, y: y - h * 1.1, width: rx * 2.4, height: h * 1.1 + 14 }; canopy.nativeBounds = { ...b };
      canopyOcclusion = { node: canopy, polygons: crowns };
    } else if (kind === 'windmill') {
      const h = 220, hub = y - 166;
      geometry = ellipse(3, 3, 66, 13, '#254d3c', .15)
        + path('M-43 0L-29 -157Q0 -177 29 -157L43 0Z', stone, ink, 1.7)
        + path('M-40 -3L-27 -155Q-16 -162 -10 -160L-21 -3Z', shade)
        + path('M-17 -3L-10 -159Q-1 -162 7 -159L12 -3Z', '#d6cdb0')
        + path('M-35 -157Q-31 -192 0 -200Q31 -192 35 -157Z', '#885c47', woodDark, 1.8)
        + path('M-34 -159Q-22 -184 0 -194Q19 -185 29 -161Z', '#b17b54')
        + rect(-51, -8, 102, 9, '#8e967b', 2)
        + path('M-12 0V-36Q0 -51 12 -36V0Z', woodDark, ink)
        + rect(-8, -32, 16, 31, wood, 3)
        + path('M0 -29V-3M-6 -26V-3M6 -26V-3', 'none', '#bf9d6f', .8)
        + ellipse(5, -17, 1.4, 1.4, '#ddc279');
      for (const yy of [-70, -118]) geometry += rect(-9, yy, 18, 23, woodDark, 4) + windowPane(-6, yy + 3, 12, 16, '#6b958d', 2) + path(`M0 ${yy + 3}V${yy + 19}M-6 ${yy + 11}H6`, 'none', cream, 1.4);
      for (let i = 0; i < 7; i++) { const yy = -19 - i * 20, w = 39 - i * 1.7; geometry += path(`M${-w} ${yy}Q0 ${yy + 3} ${w} ${yy}`, 'none', '#8d9279', .8); }
      let sails = '';
      for (let i = 0; i < 4; i++) sails += `<g transform="rotate(${i * 90 + 18})">${rect(-2, -90, 4, 92, woodDark, 1)}${path('M3 -87H22L18 -23H3Z', cream, '#8b7a55', 1.1)}${path('M4 -72H20M4 -57H19M4 -42H18M11 -86V-24', 'none', '#b9a980', .9)}</g>`;
      let turn = 0, spinAt = 0;
      addMoving(sails + ellipse(0, 0, 8, 8, woodDark) + ellipse(-1, -1, 4.5, 4.5, '#d0b583'), x, hub, (node, t, env) => { turn += Math.max(0, t - spinAt) * (8 + Math.min(12, Math.abs(env.windX || 0) * 2)); spinAt = t; node.setAttribute('transform', `translate(${n(x)} ${n(hub)}) rotate(${n(turn % 360)})`); });
      b = { x: x - 98, y: y - h - 40, width: 196, height: h + 56 };
    } else if (kind === 'falls') {
      const h = 210;
      geometry = `<g opacity=".34">${path('M-77 9Q-65 -4 -39 -5Q-13 -12 15 -7Q47 -10 76 7Q65 23 32 24Q-5 29 -38 23Q-68 23 -77 9Z', '#568d87')}</g>`
        + path('M-103 9L-94 -52L-79 -94L-61 -145L-30 -190L9 -210L47 -196L70 -157L88 -110L106 -50L112 10Z', '#8c9a88', ink, 1.5)
        + path('M-102 6L-81 -93L-58 -142L-31 -186L-9 -192L-27 -143L-44 -96L-55 -4Z', '#6f8478')
        + path('M25 -201L49 -190L66 -151L80 -108L95 -20L61 -1L49 -96Z', '#b3b59a')
        + path('M-90 -48L-60 -69L-43 -59L-53 -27L-71 -16Z', '#a1ad94')
        + path('M-39 -145L-17 -164L10 -160L30 -133L17 -121L-21 -125Z', '#c4c4a5')
        + path('M-90 -45L-64 -85L-54 -114M-78 -92L-55 -96M47 -183L53 -157L69 -129M74 -85L84 -49L69 -30', 'none', '#647e73', 1.1)
        + path('M-52 -125L-43 -105L-53 -82M62 -134L68 -110L79 -94', 'none', '#c1c5a7', 1.5)
        + path('M-27 -190Q3 -201 32 -190L37 -136Q20 -118 -3 -124L4 -83Q25 -70 37 -78L49 -8Q9 13 -43 0L-40 -74L-48 -132Z', '#517f7b')
        + path('M-21 -188Q4 -196 28 -187L33 -137Q16 -121 -8 -129L-2 -80Q19 -65 32 -72L44 -7Q6 10 -37 -3L-35 -73L-42 -130Z', '#67b3ad', '#4f918a', .8)
        + path('M-9 -187Q2 -190 11 -185L14 -138L-7 -125L2 -76L19 -65L25 -8L-5 -3L-16 -73L-26 -129Z', '#b5dfcf')
        + path('M19 -185L22 -141L11 -128L21 -77L30 -69L36 -9', 'none', '#e8f2dc', 1.6)
        + path('M-18 -188Q4 -193 25 -187M-20 -130Q-3 -127 11 -134M1 -74Q15 -67 28 -72', 'none', '#e1efda', 1.5)
        + `<g opacity=".44">${path('M-45 6Q-34 -1 -19 1Q-8 -6 5 -2Q17 -5 29 0Q42 -1 48 7Q34 13 18 12Q3 17 -14 11Q-32 13 -45 6Z', '#c8e3d1')}</g>`;
      for (const [xx, yy, ww] of [[-64, -133, 27], [53, -151, 24], [-49, -53, 23], [66, -26, 28], [-17, -202, 25]]) geometry += ellipse(xx, yy, ww, 8, green) + ellipse(xx - 4, yy - 3, ww * .65, 5, '#a9b981', .8);
      const channel = [[0, 0], [.25, -2.5], [.34, -6.5], [.6, -3], [.69, 4], [1, 7]], channelX = progress => {
        let i = 0; while (i < channel.length - 2 && progress > channel[i + 1][0]) i++;
        const a = channel[i], b = channel[i + 1], t = Math.max(0, Math.min(1, (progress - a[0]) / (b[0] - a[0]))), smooth = t * t * (3 - 2 * t); return a[1] + (b[1] - a[1]) * smooth;
      };
      // Three broad highlights read as a continuous falling sheet even at
      // map scale. They replace three of the tiny streak nodes: retained
      // geometry changes only its alpha on the same scenery clock.
      const curtains = [
        'M-10 -185Q0 -190 10 -185L13 -144Q5 -137 -9 -135L-17 -144Z',
        'M-12 -124L-2 -129L3 -87Q10 -77 21 -74L12 -65L-2 -76Z',
        'M10 -64L24 -69L34 -12Q19 -6 -1 -7L-5 -20L14 -23Z',
      ];
      for (let i = 0; i < curtains.length; i++) addMoving(`<g transform="scale(.62 1)">${path(curtains[i], '#e2f0dc')}</g>`, x, y,
        (node, t, env, motion) => { const glint = motion ? .5 + .5 * Math.sin(t * 2.1 - i * 1.25) : .5; node.target.setAlpha(.13 + glint * .2); }, { cache: true });
      for (let i = 0; i < 4; i++) {
        const source = path('M0 -5Q-1.5 0 .5 7', 'none', i % 2 ? '#f2f5e2' : '#b3dfd0', i % 3 ? 1.2 : 2) + (i % 3 === 0 ? path('M3 -2L3.7 3', 'none', '#e8f0dc', .65) : '');
        addMoving(source, x, y - 184, (node, t, env, motion) => {
          node.target.setVisible(motion); if (!motion) return;
          const phase = (t * .54 + i / 4) % 1, progress = phase * .46 + phase * phase * .54, py = y - 184 + progress * 178, px = x + channelX(progress) + (i % 3 - 1) * 3.7, slope = channelX(Math.min(1, progress + .015)) - channelX(Math.max(0, progress - .015)), angle = -Math.atan2(slope, 178 * .03) * 180 / Math.PI;
          node.setAttribute('transform', `translate(${n(px)} ${n(py)}) rotate(${n(angle)}) scale(1 ${n(.65 + progress * .6)})`); node.target.setAlpha(Math.sin(phase * Math.PI) * .68);
        });
      }
      for (let i = 0; i < 2; i++) {
        const foam = path('M-22 3Q-19 -2 -12 -1Q-7 -6 -1 -2Q4 -5 10 -1Q17 -3 22 3Q14 7 8 5Q0 10 -7 5Q-16 8 -22 3Z', '#e1efda') + path('M-15 3Q-9 0 -4 3M2 2Q9 -1 15 2', 'none', '#f7f5e4', 1);
        addMoving(foam, x + 3, y + 1, (node, t, env, motion) => { const swell = motion ? Math.sin(t * 2.2 + i * Math.PI) : 0; node.setAttribute('transform', `translate(${n(x + 3 + (i ? 4 : -3))} ${n(y + 1 + i * 2 + swell * .5)}) scale(${n(.9 + i * .13 + swell * .04)} ${n(.8 + swell * .08)})`); node.target.setAlpha(i ? .27 : .45); });
        addMoving(path('M-22 -1Q-16 -5 -8 -4M4 -4Q16 -5 23 0M-17 3Q-7 7 2 5M10 5Q17 5 21 3', 'none', '#d4e7d4', .9), x, y + 8, (node, t, env, motion) => { node.target.setVisible(motion); if (!motion) return; const f = (t * .38 + i * .5) % 1; node.setAttribute('transform', `translate(${n(x + 4)} ${n(y + 5 + f * 9)}) scale(${n(.65 + f * 1.4)} ${n(.65 + f * .6)})`); node.target.setAlpha(Math.sin(f * Math.PI) * (1 - f) * .4); });
      }
      for (let i = 0; i < 6; i++) addMoving(ellipse(0, 0, .9 + i % 2 * .25, 1.7 + i % 3 * .25, '#edf3df'), x, y, (node, t, env, motion) => {
        node.target.setVisible(motion); if (!motion) return;
        const f = (t * .5 + i / 6) % 1, side = i % 2 ? 1 : -1, wind = Math.max(-6, Math.min(6, env.windX || 0)), px = x + 4 + side * (3 + f * (9 + i % 3 * 3)) + wind * f * .3, py = y - 3 - Math.sin(f * Math.PI) * (7 + i % 3 * 2) + f * 5;
        node.setAttribute('transform', `translate(${n(px)} ${n(py)}) rotate(${n(side * (f * 38 - 16))}) scale(${n(1 - f * .35)})`); node.target.setAlpha(Math.sin(f * Math.PI) * .48);
      });
      for (let i = 0; i < 3; i++) addMoving(ellipse(-5, 1, 14, 5, '#e2edde', .45) + ellipse(7, -1, 10, 4, '#eef2df', .3), x, y, (node, t, env, motion) => {
        node.target.setVisible(motion); if (!motion) return;
        const f = (t * .19 + i / 3) % 1, wind = Math.max(-6, Math.min(6, (env.windX || 0) + (env.gust || 0) * .5)), px = x + 3 + (i - 1) * 10 + f * (wind * 1.7 + (i - 1) * 4), py = y + 2 - f * 24;
        node.setAttribute('transform', `translate(${n(px)} ${n(py)}) scale(${n(.7 + f * 1.05)} ${n(.8 + f * .4)})`); node.target.setAlpha(Math.sin(f * Math.PI) * .24);
      });
      geometry = `<g transform="scale(.62 1)">${geometry}</g>`;
      b = { x: x - 76, y: y - h - 9, width: 154, height: h + 44 };
    } else if (kind === 'shepherd') {
      geometry = ellipse(2, 3, 43, 8, '#315640', .15)
        + ellipse(-24, -5, 10, 10, '#485348') + ellipse(24, -5, 10, 10, '#485348') + ellipse(-24, -5, 5, 5, '#a6ad8d') + ellipse(24, -5, 5, 5, '#a6ad8d')
        + rect(-38, -68, 76, 55, '#7c9b82', 4, ink) + rect(-36, -65, 7, 49, '#9fb59b', 1)
        + path('M-42 -67Q-39 -91 0 -95Q39 -91 42 -67Z', '#596e67', ink, 1.4)
        + path('M-37 -72Q0 -94 36 -72', 'none', '#9aaf96', 1.4)
        + rect(-29, -56, 22, 43, woodDark, 3) + rect(-25, -53, 15, 37, wood, 2) + ellipse(-13, -31, 1.3, 1.3, '#d5be80')
        + rect(6, -56, 23, 23, woodDark, 3) + windowPane(9, -53, 17, 17, '#bfd2b6', 1) + path('M17.5 -52V-36M9 -44H26', 'none', cream, 1.3)
        + rect(22, -105, 7, 19, '#616c5f', 1) + rect(19, -108, 13, 4, '#acb59a', 1);
      for (let i = 0; i < 4; i++) geometry += path(`M-34 ${-23 - i * 10}H-31M-4 ${-23 - i * 10}H34`, 'none', '#547a66', .9);
      b = { x: x - 46, y: y - 111, width: 92, height: 127 };
    } else if (kind === 'chapel') {
      geometry = ellipse(2, 4, 83, 13, '#315640', .14)
        + path('M-74 0V-72L-61 -89V-58H-43V-112L-18 -153L7 -115V-61H26V-83L37 -74L48 -88L61 -66L76 -53V0Z', stone, ink, 1.5)
        + path('M-72 -2V-70L-61 -81V-4Z', '#81927f')
        + path('M-24 0V-51Q-11 -79 2 -51V0Z', '#3d594b', ink, 1.1)
        + path('M-62 -14V-41Q-53 -60 -44 -41V-14ZM31 -13V-42Q40 -60 49 -42V-13Z', '#557462', '#869b80', 1.1)
        + path('M-27 -98V-119Q-17 -140 -7 -119V-98Z', '#466350', ink, 1)
        + path('M-18 -127V-104', 'none', woodDark, 1.5) + path('M-25 -111Q-18 -124 -11 -111Z', '#b69d53')
        + path('M-68 -18H-29M8 -18H68M-39 -35H-28M9 -36H26M-40 -82H5M-39 -104H-28', 'none', '#8d9b80', 1.1)
        + path('M-43 -113L-18 -153L7 -115M-70 -72L-61 -85M26 -82L37 -74L48 -88L61 -66', 'none', '#ded4b4', 2);
      for (const [xx, yy] of [[-54, -54], [53, -61], [-5, -93], [65, -11]]) geometry += ellipse(xx, yy, 14, 7, '#82996e') + ellipse(xx - 4, yy - 3, 9, 5, '#abb87d');
      b = { x: x - 86, y: y - 158, width: 172, height: 174 };
    } else if (kind === 'mill') {
      geometry = ellipse(3, 4, 94, 13, '#315640', .14)
        + rect(-74, -91, 111, 88, stone, 3, ink) + rect(-70, -87, 12, 80, '#8d9c83', 2)
        + path('M-84 -89L-23 -139L46 -91Z', '#936c51', woodDark, 1.7) + path('M-76 -91L-23 -132L-12 -123L-65 -91Z', '#bc9370')
        + rect(-20, -54, 28, 52, woodDark, 4) + rect(-16, -49, 20, 46, wood, 2)
        + rect(-59, -70, 24, 29, woodDark, 2) + windowPane(-56, -67, 18, 22, '#91b5a4', 1) + path('M-47 -67V-45M-56 -56H-38', 'none', cream, 1.3)
        + ellipse(53, -32, 34, 34, '#69563e') + ellipse(53, -32, 28, 28, '#9a8054') + ellipse(53, -32, 22, 22, '#465d4d');
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; geometry += path(`M53 -32L${n(53 + Math.cos(a) * 30)} ${n(-32 + Math.sin(a) * 30)}`, 'none', '#b39768', 3); }
      geometry += ellipse(53, -32, 7, 7, woodDark) + ellipse(52, -33, 3, 3, '#c7b083');
      b = { x: x - 88, y: y - 143, width: 181, height: 159 };
    } else if (kind === 'gate' && spec.major === false && spec.gate && spec.gate.crossSpan) {
      const frame = _gldIslandGateFrame(spec.gate), leaf = _gldIslandGateLeaf(frame.span, spec), px = frame.span * frame.ux, py = frame.span * frame.uy;
      geometry = _gldIslandGateBody(frame, spec);
      if (!spec.open) geometry += rect(-4, -47, 8, 12, '#dbc897', 1.5) + path('M-3 -47V-52Q0 -58 3 -52V-47', 'none', '#dbc897', 2);
      for (const side of [-1, 1]) addMoving(leaf, x + side * px, y + side * py, (node, t) => {
        const opened = spec.open ? .14 + Math.sin(t * .65 + side) * .008 : 1;
        node.setAttribute('transform', `matrix(${n(-side * frame.ux * opened)} ${n(-side * frame.uy * opened)} 0 1 ${n(x + side * px)} ${n(y + side * py)})`);
      }, { static: !spec.open, cache: true });
      // Tall posts keep their own upright width even on a vertical crossing;
      // only the leaf's ground axis follows the physical cross-span.
      b = { x: x - Math.abs(px) - 23, y: y - Math.abs(py) - frame.rise - 64, width: Math.abs(px) * 2 + 46, height: Math.abs(py) * 2 + frame.rise + 77 };
    } else if (kind === 'gate' && spec.major === false) {
      const side = !!(spec.gate && spec.gate.dx), span = spec.gate && spec.gate.h > 1 ? 31 : 25, px = xx => side ? xx * .55 : xx, py = xx => side ? xx * .42 : 0;
      const islandGate = typeof gardenIslandActive === 'function' && gardenIslandActive(), postTop = islandGate ? -55 : -42;
      geometry = ellipse(0, 2, span + 9, 5, '#315640', .12);
      for (const sgn of [-1, 1]) geometry += rect(sgn * span - 5, postTop, 10, 2 - postTop, stone, 2, ink) + rect(sgn * span - 7, postTop - 3, 14, 5, light, 1, shade) + path(`M${sgn * span - 3} -25H${sgn * span + 3}M${sgn * span - 3} -10H${sgn * span + 3}`, 'none', '#89967c', .8);
      if (islandGate) {
        // Rise above the same gate feet; the narrow public route and its
        // canonical collision stay untouched. The complete arch is retained
        // in the existing body capture, with the two original moving leaves.
        const arch = `M${-span} -56Q0 -82 ${span} -56`;
        geometry += path(arch, 'none', ink, 8.5) + path(arch, 'none', stone, 6.4) + path(`M${-span} -58Q0 -84 ${span} -58`, 'none', light, 1.2)
          + path('M-3 -69L-2 -64H2L3 -69Z', light, shade, .6);
        for (const sgn of [-1, 1]) geometry += path(`M${sgn * span - 3} -47V-31M${sgn * span - 3} -40H${sgn * span + 3}`, 'none', '#89967c', .8) + ellipse(sgn * (span - 2), -54, 4.5, 2.3, green, .9);
        if (!spec.open) geometry += rect(-4, -29, 8, 10, woodDark, 1.2) + path('M-2 -29V-32Q0 -36 2 -32V-29', 'none', '#cdbb86', 1.3) + rect(-2.5, -28, 5, 6, '#cdbb86', .7);
      }
      if (!spec.open && spec.showRequirement !== false) geometry += rect(-19, islandGate ? -55 : -53, 38, 12, cream, 3, wood) + `<text x="0" y="${islandGate ? -46 : -44}" font-family="Inter, sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="${woodDark}">${esc(spec.level ? 'Level ' + spec.level : 'Closed')}</text>`;
      for (const sgn of [-1, 1]) {
        let source = '';
        if (islandGate) {
          source = rect(0, -40, span - 4, 33, woodDark, 1.6);
          const width = (span - 6) / 3;
          for (let i = 0; i < 3; i++) source += rect(1.2 + i * width, -39, width - .8, 31, wood, .8) + path(`M${2 + i * width} -37V-10`, 'none', '#bea16d', .65);
          source += path(`M1 -34H${span - 5}M1 -14H${span - 5}M2 -32L${span - 6} -16`, 'none', woodDark, 2.5) + path(`M2 -35H${span - 6}`, 'none', '#d2bc87', .85);
        } else {
          source = rect(0, -31, span - 4, 4, wood, 1, woodDark) + rect(0, -14, span - 4, 4, wood, 1, woodDark) + path(`M2 -29L${span - 5} -12`, 'none', '#b99c6b', 2.2);
          for (let i = 0; i < 3; i++) source += rect(3 + i * (span - 10) / 3, -35, 3, 27, '#a3895f', 1);
        }
        if (side) source = `<g transform="matrix(.55 .42 0 1 0 0)">${source}</g>`;
        addMoving(source, x + px(-sgn * span), y + py(-sgn * span), (node, t) => { const opened = spec.open ? .18 + Math.sin(t * .7) * .012 : 1; node.setAttribute('transform', `translate(${n(x + px(-sgn * span))} ${n(y + py(-sgn * span))}) scale(${n(sgn * opened)} 1) skewY(${spec.open ? sgn * -17 : 0})`); }, { static: !spec.open });
      }
      if (side) geometry = `<g transform="matrix(.55 .42 0 1 0 0)">${geometry}</g>`;
      const rise = islandGate ? 80 : 58;
      b = { x: x - px(span) - 10, y: y - rise - py(span), width: px(span) * 2 + 20, height: rise + 9 + py(span) * 2 };
    } else if (kind === 'gate') {
      const side = !!(spec.gate && spec.gate.dx), span = Math.max(side ? 48 : 55, Math.min(84, spec.width || 66)), top = -116, projectX = xx => side ? xx * .45 : xx, projectY = xx => side ? xx * .32 : 0;
      const stonePost = (xx, yy) => rect(xx - 8, yy - 77, 16, 78, stone, 3, ink) + rect(xx - 11, yy - 81, 22, 8, light, 2, shade) + path(`M${xx - 4} ${yy - 70}V${yy - 8}M${xx - 7} ${yy - 48}H${xx + 7}M${xx - 7} ${yy - 24}H${xx + 7}`, 'none', '#89967c', 1) + ellipse(xx, yy - 87, 6, 7, '#a6b28c');
      geometry = ellipse(0, 3, span + 19, 10, '#294d3a', .1) + stonePost(-span, side ? -14 : 0) + stonePost(span, 0)
        + path(`M${-span} -78Q0 ${top - 40} ${span} -78`, 'none', '#657b5a', 9)
        + path(`M${-span} -81Q0 ${top - 43} ${span} -81`, 'none', '#c7cda8', 1.6);
      for (let i = 0; i < 7; i++) { const xx = -span + 13 + i * (span * 2 - 26) / 6, yy = -81 - Math.sin((i + .6) / 7 * Math.PI) * 39; geometry += ellipse(xx, yy, 13, 7, i % 3 ? green : '#a6b57b'); }
      const name = String(spec.name || 'Garden walk'), label = name.length > 23 ? name.slice(0, 21) + '…' : name;
      geometry += rect(-44, -106, 88, 18, woodDark, 3) + rect(-42, -104, 84, 14, cream, 2) + `<text x="0" y="-94" font-family="Georgia, serif" font-size="8" text-anchor="middle" fill="${ink}">${esc(label)}</text>`;
      if (!spec.open && spec.showRequirement !== false) geometry += rect(-19, -47, 38, 16, cream, 4, wood) + `<text x="0" y="-36" font-family="Inter, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="${woodDark}">${esc(spec.level ? 'Level ' + spec.level : 'Closed')}</text>`;
      const leaf = (sgn) => {
        const d = `M0 -58H${n(span - 3)}V-9H0ZM2 -53L${n(span - 7)} -15M2 -15L${n(span - 7)} -53`;
        const source = path(d, '#b39a69', woodDark, 2) + path(`M5 -48H${n(span - 6)}M5 -23H${n(span - 6)}`, 'none', '#dec797', 1.3);
        return addMoving(side ? `<g transform="matrix(.45 .32 0 1 0 0)">${source}</g>` : source, x + projectX(sgn * -span), y + projectY(sgn * -span), (node, t) => { const opened = spec.open ? .19 + Math.sin(t * .7) * .012 : 1, sway = spec.open ? Math.sin(t * .8) * 2 : Math.sin(t * 1.1) * .35; node.setAttribute('transform', `translate(${n(x + projectX(sgn * -span))} ${n(y + projectY(sgn * -span))}) scale(${n(sgn * opened)} 1) skewY(${n(sgn * (spec.open ? -22 : 0) + sway)})`); }, { cache: true });
      };
      leaf(1); leaf(-1);
      for (const sgn of [-1, 1]) addMoving(path('M0 0V22L10 17L20 22V0Z', spec.season === 'autumn' ? '#be9259' : '#6b9480', '#506b55', .8), x + projectX(sgn * (span + 4)), y - 77 + projectY(sgn * (span + 4)), (node, t, env) => node.setAttribute('transform', `translate(${n(x + projectX(sgn * (span + 4)))} ${n(y - 77 + projectY(sgn * (span + 4)))}) skewX(${n(Math.sin(t * 2 + sgn) * (3 + Math.min(5, Math.abs(env.windX || 0))))})`));
      if (side) geometry = `<g transform="matrix(.45 .32 0 1 0 0)">${geometry}</g>`;
      b = { x: x - projectX(span) - 18, y: y - 139 - projectY(span), width: projectX(span) * 2 + 56, height: 154 + projectY(span) * 2 };
    } else { rootNode.remove(); return null; }
    body.innerHTML = `<g transform="translate(${n(x)} ${n(y)})">${geometry}</g>`;
    body.nativeBounds = body.getBBox(); rootNode.nativeBounds = { ...b };
    const windowPanes = ['windmill', 'shepherd', 'mill'].includes(kind) ? body.querySelectorAll('[data-scenery-window]').map(node => ({ node, dayFill: node.getAttribute('fill') })) : [];
    let litWindows = false;
    const handle = { root, rootNode, body: body.target, bounds: b, cacheNodes, kind, canopyOcclusion, dynamic: moving.length > 0,
      update(time, environment) {
        if (dead) return; const delta = last == null ? 0 : Math.min(.08, Math.max(0, (time - last) / 1000)); last = time;
        const motion = !paused && gardenMotionOn(); if (motion) clock += delta;
        if (!root.visible || !root.active || !motion && motionWasOn === false) return;
        motionWasOn = motion; for (const part of moving) part.animate(part.node, clock, environment || {}, motion);
      },
      setLitWindows(value) {
        const lit = !!value; if (dead || !windowPanes.length || lit === litWindows) return;
        litWindows = lit;
        // Native paint invalidation refreshes the body cache without recreating
        // this handle or touching the moving parts' shared clock and phase.
        for (const pane of windowPanes) pane.node.setAttribute('fill', lit ? '#ffd28a' : pane.dayFill);
      },
      pauseAmbient(state) { paused = !!(state && (state.hush || state.frozen)); },
      destroy() { if (dead) return; dead = true; rootNode.remove(); },
    };
    handle.update(0, {}); return handle;
  }
  return Object.freeze({ create });
})();
