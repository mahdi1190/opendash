/* ============================================================
   SCENE LIBRARY: landmark.ararat (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   A NATURAL landmark (tag 'natural': no lit part needed). Started from `scene upgrade
   asia-west/am-signature --box 515,180,1580,625` (the old art's two peaks), then REDRAWN:
   - the real form, as seen from the Ararat plain at Khor Virap looking south-west: Greater
     Ararat (Masis) on the right, a broad massif whose ice cap rounds into a wide summit with
     the lower west summit beside it, the deep Ahora Gorge cut into the north-east face under
     the summit, a long gentle west flank; Little Ararat (Sis) on the left, a steeper, regular
     cone, joined to Masis by the high saddle with its small cinder cones. (The old art had
     the two peaks the other way round.)
   - lit from the left: the right-hand flanks in shade, the gullies and lava ridges as streaks
   - seasons (shapeBySeason): Masis keeps its ice cap all year (in summer only the cap and old
     snow in the gullies), the snow reaches far down in winter and spring; Sis is bare in
     summer and white in winter; the dry piedmont at the foot green in spring, straw in summer
   No text. Anchor: the ground at the middle of the foot (placed in the horizon layer, where the
   haze softens it).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, poly, define, seasons } = sceneDraw;
  // the skyline, left foot to right foot, through Sis (-412, -292), the saddle and Masis (222, -420)
  const KEY = [[-850, 0], [-760, -14], [-660, -44], [-570, -96], [-500, -170], [-455, -250], [-430, -286], [-412, -292], [-392, -284], [-350, -246], [-300, -206], [-250, -180], [-205, -168], [-180, -172],
    [-162, -181], [-146, -174], [-120, -178], [-60, -210], [0, -262], [60, -318], [110, -370], [150, -404], [185, -419], [222, -420], [252, -413], [270, -416], [292, -404], [340, -362], [400, -300], [470, -236], [560, -160], [660, -90], [760, -36], [850, 0]];
  const LINE = (() => {   // Catmull-Rom through KEY, 6 samples a segment
    const out = [];
    for (let i = 0; i < KEY.length - 1; i++) {
      const p0 = KEY[Math.max(0, i - 1)], p1 = KEY[i], p2 = KEY[i + 1], p3 = KEY[Math.min(KEY.length - 1, i + 2)];
      for (let k = 0; k < 6; k++) { const t = k / 6, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    out.push(KEY[KEY.length - 1]);
    return out;
  })();
  const yAt = x => { for (let i = 1; i < LINE.length; i++) if (LINE[i][0] >= x) { const a = LINE[i - 1], b = LINE[i], t = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } return 0; };
  const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
  // the snow cap of the peak between x0 and x1 down to height capY: the skyline above it, a ragged lower edge (tongues down the gullies)
  function cap(r, x0, x1, capY, tongue) {
    const top = LINE.filter(p => p[0] >= x0 && p[0] <= x1 && p[1] <= capY);
    if (top.length < 3) return '';
    const a = top[0][0], b = top[top.length - 1][0], n = 18;
    let d = P(top);
    for (let i = 1; i < n; i++) { const x = b - (b - a) * i / n, sky = yAt(x), dip = i % 2 ? -tongue * 0.25 * r() : tongue * (0.2 + Math.pow(r(), 1.6) * 0.8); d += `L${f1(x)} ${f1(Math.max(sky + 2, capY + dip))}`; }
    return d + 'z';
  }
  define({
    id: 'landmark.ararat', category: 'landmark', size: [1700, 420], box: [-854, -426, 854, 4], variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body'],
    palette: Object.assign({ base: {
      rock: ['#7c7290', '#5a5270', '#9a92ae'], gully: ['#463e5c', '#5a5272'], snow: ['#f6f8fc', '#d6dcec', '#b4bed6'],
    } }, seasons({
      flank: { spring: ['#7a7290', '#5c5472'], summer: ['#86788a', '#62566c'], autumn: ['#887284', '#645264'], winter: ['#8a8eaa', '#686e8e'] },
      foot: { spring: ['#7e8a5c', '#6a7650'], summer: ['#a49870', '#8a7e5c'], autumn: ['#9a7c5c', '#806650'], winter: ['#c8ccd8', '#a8aec0'] },
    })),
    shadow: false,
    reflect: true,
    tags: ['landmark', 'natural', 'place:asia/country:AM', 'asia', 'asia-west', 'mountain', 'volcano'],
    credit: 'native (scene engine upgrade), after the hand-drawn am-signature art',
    build(v, r, ctx) {
      const s = ctx.season, body = [];
      body.push(['@flank.0', P(LINE) + 'z']);
      // the shaded right-hand flanks of Masis and of Sis
      body.push(['@flank.1', P(LINE.filter(p => p[0] >= 230)) + `L330 0Q300 -200 230 ${f1(yAt(230) + 3)}z`, 0.85]);
      body.push(['@flank.1', P(LINE.filter(p => p[0] >= -410 && p[0] <= -300)) + `Q-292 -110 -318 0H-372Q-384 -150 -410 ${f1(yAt(-410) + 3)}z`, 0.75]);
      // the Ahora Gorge in the north-east face: an amphitheatre wide under the summit ridge, narrowing down to its mouth
      body.push(['@gully.0', `M198 -386Q250 -370 306 -378Q290 -300 258 -196Q238 -300 198 -386z`, 0.5], ['@gully.1', `M250 -374Q276 -372 306 -378Q290 -300 258 -196Q262 -290 250 -374z`, 0.55]);
      // the lit left shoulders
      body.push(['@rock.2', `M185 -416Q90 -330 0 -258Q-40 -236 -70 -206Q10 -248 80 -330Q130 -390 190 -414z`, 0.35], ['@rock.2', `M-414 -290Q-470 -200 -560 -100Q-500 -150 -452 -230z`, 0.35]);
      // gullies from under the summits, each its own streak, heavier on the shaded side
      for (let k = 0; k < 16; k++) {
        const right = k % 2 === 1, x0 = right ? 230 + r() * 50 : 150 + r() * 70, y0 = yAt(x0) + 6, x1 = right ? x0 + 60 + r() * 220 : x0 - 50 - r() * 200, y1 = yAt(x1) * (0.5 + r() * 0.35);
        body.push({ s: right ? '@gully.0' : '@gully.1', w: right ? 2 : 1.3, op: 0.42, d: `M${f1(x0)} ${f1(y0)}Q${f1(x0 + (x1 - x0) * 0.3)} ${f1(y0 + (y1 - y0) * 0.6)} ${f1(x1)} ${f1(y1)}` });
      }
      for (let k = 0; k < 8; k++) {
        const right = k % 2 === 1, x0 = -412 + (right ? 6 + r() * 14 : -6 - r() * 14), y0 = yAt(x0) + 5, x1 = x0 + (right ? 40 + r() * 120 : -40 - r() * 150), y1 = yAt(x1) * (0.35 + r() * 0.4);
        body.push({ s: right ? '@gully.0' : '@gully.1', w: right ? 1.6 : 1.1, op: 0.4, d: `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}` });
      }
      // lava ridges and old flows on the lower flanks
      for (let k = 0; k < 10; k++) { const x = k < 5 ? -40 + k * 34 + r() * 10 : 360 + (k - 5) * 70 + r() * 20, y = yAt(x); body.push({ s: k < 5 ? '@rock.2' : '@gully.0', w: 1.2, op: 0.32, d: `M${f1(x)} ${f1(y + 4)}Q${f1(x + (k < 5 ? -30 : 30))} ${f1(y * 0.55)} ${f1(x + (k < 5 ? -60 : 70))} ${f1(y * 0.2)}` }); }
      for (let k = 0; k < 8; k++) { const x = -120 + k * 70 + r() * 30, y = Math.min(-30, yAt(x) * 0.4); body.push({ f: '@gully.1', d: `M${f1(x)} ${f1(y)}q${f1(14 + r() * 10)} ${f1(10 + r() * 8)} ${f1(10 + r() * 20)} ${f1(26 + r() * 10)}q${f1(-12)} ${f1(-4)} ${f1(-18 - r() * 8)} ${f1(-30 - r() * 8)}z`, op: 0.3, detail: true }); }
      // the small cinder cones on the saddle
      for (const [x, w, h] of [[-178, 22, 10], [-238, 16, 7], [-128, 18, 8]]) body.push(['@flank.1', poly([[x - w, yAt(x) + 6], [x - 3, yAt(x) - h + 4], [x + 3, yAt(x) - h + 4], [x + w, yAt(x) + 6]]), 0.8]);
      // scree under the summit dome
      for (let k = 0; k < 6; k++) { const x = 160 + k * 22, y = yAt(x); body.push({ s: '@rock.0', w: 1, op: 0.3, d: `M${f1(x)} ${f1(y + 8)}l${f1((x - 220) * 0.2)} ${f1(16 + (k % 3) * 6)}`, detail: true }); }
      // the snow by season (how far down from each summit, as a share of its height)
      const mReach = { winter: 0.64, spring: 0.5, autumn: 0.27, summer: 0.19 }[s], sReach = { winter: 0.58, spring: 0.32, autumn: 0.1, summer: 0 }[s];
      const mc = cap(r, -150, 850, -420 + 420 * mReach, 420 * mReach * 0.35);
      body.push(['@snow.0', mc], ['@snow.2', `M230 -418L${f1(230 + 420 * mReach * 0.9)} ${f1(-420 + 420 * mReach)}L${f1(230 + 420 * mReach * 0.25)} ${f1(-420 + 420 * mReach + 8)}z`, 0.55]);
      if (sReach > 0) body.push(['@snow.1', cap(r, -850, -206, -292 + 292 * sReach, 292 * sReach * 0.3)]);
      // old snow in the gullies below the cap (summer, autumn) or the snow's blue shadow on the shaded flank (winter, spring)
      const streaks = [];
      for (let k = 0; k < 12; k++) { const x = 140 + k * 14 + (r() - 0.5) * 8, y = -420 + 420 * mReach - 4 + r() * 6; streaks.push(`M${f1(x)} ${f1(Math.max(yAt(x) + 3, y))}l${f1((x - 220) * 0.12)} ${f1(14 + r() * 30)}`); }
      for (const d of streaks) body.push({ s: '@snow.0', w: 2.2, op: 0.8, d });
      body.push({ s: '@snow.2', w: 1.2, op: 0.5, d: streaks.join(''), detail: true });
      // the dry piedmont at the foot: a band (what a tile shows), then its folds
      body.push(['@foot.0', `M-850 0Q-400 -34 0 -26Q400 -38 850 0z`]);
      for (let k = 0; k < 8; k++) { const x = -760 + k * 210 + r() * 40; body.push({ f: k % 2 ? '@foot.1' : '@foot.0', d: sceneDraw.blob(r, x, -6, 60 + r() * 30, 9 + r() * 5, 8, 0.4), detail: true }); }
      return { body };
    },
  });
})();
