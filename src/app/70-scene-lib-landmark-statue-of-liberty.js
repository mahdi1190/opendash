/* ============================================================
   SCENE LIBRARY: landmark.statue-of-liberty (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand (the box extraction of the hand-drawn ny-statue art was only a reference):
   the national monument on Liberty Island as seen from the New Jersey shore to the south-west,
   so the figure stands in near profile facing right (south-east, towards the Narrows), the
   raised right arm on the near side. Drawn respectfully as architecture and sculpture
   silhouette: no face detail, no flags, no text.
   - the island: the granite seawall, its lawns and trees, the low museum with its planted roof
   - Fort Wood: the eleven-pointed star of granite walls, its faces catching the light in turn
   - the stepped concrete foundation inside the fort, then Hunt's granite pedestal: the plinth
     course, the lower shaft with its quoins, the belt course, the loggia with its columns,
     the cornice, the attic and the parapet of the observation deck
   - the copper figure, green with verdigris: the robe and the cloak in folds, the raised arm
     with its falling sleeve, the torch with its gilded flame, the crown's seven rays (five
     show from this side), the tablet's edge in front of the chest
   - light from the left; night: the figure floodlit pale green, the pedestal washed warm, the
     gilded flame alight, lamps along the seawall
   Proportions after the monument's published heights (ground to torch 93 m: foundation 20 m,
   pedestal 27 m, figure 46 m), at about 5 units a metre; the island is shortened.
   Anchor: the waterline below the middle of the fort.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, blob, define } = sceneDraw;
  // levels: island ground, fort wall top, foundation top, pedestal top, the figure's hem, the torch tip
  const G = -12, FT = -44, FD = -111, PT = -248, HEM = -252;
  define({
    id: 'landmark.statue-of-liberty', category: 'landmark', size: [650, 484], box: [-362, -486, 292, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      verd: ['#7cc4ae', '#5aa892', '#3e8772', '#a8dcc8', '#2e6a5a'], gold: ['#f2c14e', '#c99a2e', '#ffe28a'],
      granite: ['#cdbca8', '#ad9c8a', '#8c7c6c', '#e2d6c4', '#4a4038'], conc: ['#c8c0b2', '#a8a092', '#8e8678'],
      fort: ['#b8af9f', '#918879', '#d6cdbc', '#6e675c'], lawn: ['#5f8240', '#4a6a32'], tree: ['#3c5a30', '#4f7038', '#2c4626'],
      wall: ['#9a958a', '#74706a', '#c2bdb2'], museum: ['#8a98a4', '#5e6c78', '#6f8a4a'],
      flood: '#a4ecd2', warm: '#ffd9a0', flame: '#ffd060', lamp: '#ffe2a0',
    } },
    night: { glow: { lamp: '#ffe2a0', window: '#ffe6b0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/state:NY', 'us', 'us-northeast', 'harbour', 'monument', 'statue', 'signature'],
    credit: 'native, drawn for the composed ny-statue scene (after the hand-drawn art and the monument\'s published dimensions)',
    build(v, r) {
      const body = [], lit = [];
      // ---------- the island: seawall, lawns, trees, the museum ----------
      body.push(['@wall.1', rect(-360, -9, 650, 9)], ['@wall.2', rect(-360, -10, 650, 2), 0.9]);
      body.push(['@lawn.0', `M-356 -9C-330 -15 -280 -15 -226 ${G}H226C258 -15 280 -14 288 -9Z`], ['@lawn.1', rect(-356, -10, 644, 2), 0.7]);
      // trees on the island beyond the fort (left) and by the south end (right), two tones each
      const trees = [[-338, 34], [-306, 44], [-276, 38], [-246, 46], [-226, 30], [232, 34], [258, 42], [282, 30]];
      let tD = '', tL = '';
      for (const [x, h] of trees) { tD += blob(r, x, G - h * 0.55, h * 0.42, h * 0.5, 7, 0.3); tL += blob(r, x - h * 0.12, G - h * 0.66, h * 0.24, h * 0.3, 6, 0.3); }
      body.push(['@tree.2', tD], ['@tree.1', tL, 0.85]);
      let trunks = ''; for (const [x, h] of trees) trunks += rect(x - 1, G - h * 0.18, 2, h * 0.18);
      body.push({ f: '@tree.2', d: trunks, detail: true });
      // the museum at the island's north end: a low glass front under a sloping planted roof
      body.push(['@museum.1', poly([[-322, G], [-322, -27], [-262, -33], [-258, G]])], ['@museum.2', poly([[-326, -26], [-262, -34], [-256, -31], [-322, -23]])]);
      body.push({ f: '@museum.0', d: rect(-318, -22, 54, 7), glow: 'window' }, { s: '@museum.0', w: 0.6, op: 0.6, d: 'M-308 -22v9M-296 -22v9M-284 -22v9M-272 -22v9', detail: true });
      // ---------- Fort Wood: the star's faces, lit and shaded in turn ----------
      // the star's points (even breaks) come towards the eye and sit a little lower than its re-entrant angles (odd)
      const xs = [-214, -184, -152, -116, -80, -42, -2, 38, 76, 112, 148, 182, 214], dp = i => (i % 2 ? 0 : 4);
      body.push(['@fort.1', rect(-214, FT, 428, G - FT)]);
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], da = dp(i), db = dp(i + 1);
        // a face from a point to the re-entrant on its right faces right (shade); the next faces left, into the light
        body.push([i % 2 ? '@fort.0' : '@fort.1', poly([[a, FT + da], [b, FT + db], [b, G + db], [a, G + da]]), i % 2 ? 0.95 - (i % 4 === 1 ? 0 : 0.1) : 0.9]);
      }
      let edges = '', cope = `M${xs[0]} ${FT + dp(0) - 3}`; xs.forEach((x, i) => { edges += `M${x} ${FT + dp(i)}V${G + dp(i)}`; if (i) cope += `L${x} ${FT + dp(i) - 3}`; });
      body.push({ s: '@fort.3', w: 0.8, op: 0.55, d: edges });
      let course = ''; for (let y = FT + 7; y < G; y += 7) course += `M-214 ${y}H214`;
      body.push({ s: '@fort.3', w: 0.5, op: 0.22, d: course, detail: true });
      body.push({ s: '@fort.2', w: 3, d: cope }, { s: '@fort.3', w: 2, op: 0.45, d: cope.replace(/ (-?\d+)(?=L|$)/g, (_, y) => ` ${+y + 32}`) });
      // ---------- the stepped concrete foundation inside the fort ----------
      const tiers = [[FT, -66, 74], [-66, -88, 66], [-88, FD, 58]];
      for (const [y0, y1, hw] of tiers) {
        body.push(['@conc.0', rect(-hw, y1, hw * 2, y0 - y1)], ['@conc.1', rect(hw - 10, y1, 10, y0 - y1), 0.9], ['@conc.2', rect(-hw - 2, y1, hw * 2 + 4, 2), 0.8]);
      }
      body.push({ s: '@conc.2', w: 0.5, op: 0.3, d: 'M-70 -55H70M-62 -77H62M-54 -99H54', detail: true });
      // ---------- the granite pedestal (the lit face, and the shaded face to the right) ----------
      const block = (y0, y1, hw, side, tone) => body.push([`@granite.${tone}`, rect(-hw, y1, hw * 2, y0 - y1)], ['@granite.2', rect(hw, y1, side, y0 - y1), 0.95]);
      block(FD, -122, 52, 12, 1);                                     // the plinth course
      block(-122, -172, 46, 11, 0);                                   // the lower shaft
      body.push(['@granite.1', rect(-46, -172, 8, 50), 0.55], ['@granite.3', rect(-20, -168, 40, 44), 0.5]);   // quoins, the raised central panel
      body.push({ s: '@granite.2', w: 0.5, op: 0.35, d: 'M-46 -130H46M-46 -138H46M-46 -146H46M-46 -154H46M-46 -162H46', detail: true });
      block(-172, -179, 49, 12, 3);                                   // the belt course
      block(-179, -214, 44, 11, 0);                                   // the upper shaft and its loggia
      body.push(['@granite.4', rect(-25, -210, 50, 28)], ['@granite.3', rect(-17, -210, 3, 28) + rect(-6, -210, 3, 28) + rect(5, -210, 3, 28) + rect(16, -210, 3, 28)]);
      body.push(['@granite.1', rect(-27, -212, 54, 3)], ['@granite.1', rect(-27, -183, 54, 2), 0.9]);
      block(-214, -221, 49, 12, 3);                                   // the cornice
      block(-221, -243, 40, 10, 0);                                   // the attic
      body.push({ f: '@granite.4', d: rect(-30, -235, 6, 6) + rect(-15, -235, 6, 6) + rect(0, -235, 6, 6) + rect(15, -235, 6, 6), op: 0.8, detail: true });
      block(-243, PT, 43, 10, 3);                                     // the parapet of the observation deck
      body.push(['@granite.2', rect(-36, HEM, 76, PT - HEM)]);        // the figure's base
      // ---------- the figure (near profile, facing right) ----------
      // the tablet's front edge, held on the far side, shows in front of the chest
      body.push(['@verd.2', poly([[17, -373], [26, -369], [24, -337], [16, -339]])], ['@verd.3', poly([[23, -370], [26, -369], [24, -337], [22, -338]]), 0.7]);
      const robe = `M-33 ${HEM}C-31 -300 -27 -345 -24 -376C-21 -382 -18 -385 -14 -386Q0 -389 12 -386C20 -378 23 -365 21 -350C19 -338 17 -330 19 -318C23 -295 31 -272 37 ${HEM}Z`;
      body.push(['@verd.1', robe]);
      body.push(['@verd.2', `M37 ${HEM}C31 -272 23 -295 19 -318C17 -330 19 -338 21 -350C23 -365 20 -378 12 -386L6 -385C11 -370 13 -350 11 -330C9 -300 15 -272 17 ${HEM}Z`, 0.75]);
      body.push(['@verd.3', `M-33 ${HEM}C-31 -300 -27 -345 -24 -376L-18 -381C-21 -345 -24 -300 -25 ${HEM}Z`, 0.65]);
      // the cloak falling from the left shoulder across to the right hip, and the folds of the robe
      body.push(['@verd.0', `M-18 -383C-8 -366 4 -350 18 -334L18 -326C2 -338 -10 -352 -21 -370Z`, 0.85]);
      body.push({ s: '@verd.2', w: 1.4, op: 0.7, d: `M-16 ${HEM - 2}C-16 -290 -14 -330 -10 -362M-4 ${HEM - 2}C-3 -290 -2 -315 1 -340M7 ${HEM - 2}C6 -280 8 -300 10 -318` });
      body.push({ s: '@verd.4', w: 0.8, op: 0.55, d: `M-22 ${HEM - 2}C-22 -280 -20 -320 -17 -350M1 ${HEM - 3}C2 -280 3 -300 5 -322M14 ${HEM - 3}C12 -272 14 -292 15 -306M24 ${HEM - 2}C21 -270 19 -285 18 -298`, detail: true });
      body.push({ s: '@verd.4', w: 1.2, op: 0.6, d: `M-33 ${HEM}H37` });
      // neck, head (a plain profile, no features), hair gathered at the back
      body.push(['@verd.2', rect(1, -395, 9, 11)]);
      body.push(['@verd.1', 'M-1 -398C-4 -408 -1 -418 7 -419C14 -419 17 -413 17 -407L19 -403L17 -401C17 -397 14 -394 9 -394C5 -394 1 -395 -1 -398Z']);
      body.push(['@verd.2', 'M9 -394C14 -394 17 -397 17 -401L19 -403L17 -404C15 -399 13 -397 9 -396Z', 0.8], ['@verd.4', 'M-1 -398C-5 -404 -4 -412 1 -416C-1 -408 0 -402 3 -398Z', 0.7]);
      // the crown: the diadem and its rays (five of the seven show from this side)
      body.push(['@verd.0', 'M-2 -410C3 -414 11 -415 17 -412L17 -408C11 -411 3 -410 -2 -406Z']);
      let rays = '', rayS = '';
      for (const [a, L] of [[-38, 15], [-8, 18], [24, 18], [54, 17], [82, 15]]) {
        const t = a * Math.PI / 180, ux = Math.sin(t), uy = -Math.cos(t), cx = 7 + ux * 7, cy = -411 + uy * 7, w = 2.6;
        rays += poly([[cx - uy * w, cy + ux * w], [7 + ux * (7 + L), -411 + uy * (7 + L)], [cx + uy * w, cy - ux * w]]);
        rayS += poly([[cx, cy], [7 + ux * (7 + L), -411 + uy * (7 + L)], [cx + uy * w, cy - ux * w]]);
      }
      body.push(['@verd.0', rays], ['@verd.2', rayS, 0.6]);
      // the raised right arm, its sleeve falling back from the elbow, the hand and the torch
      const arm = 'M-4 -378C-3 -398 0 -414 4 -424C6 -434 7 -441 8 -447L15 -447C15 -439 15 -430 14 -420C13 -404 13 -390 13 -380Z';
      body.push(['@verd.2', 'M2 -420C-4 -412 -10 -398 -12 -384L-4 -380C-3 -394 -1 -406 4 -414Z'], ['@verd.1', arm], ['@verd.3', 'M-4 -378C-3 -398 0 -414 4 -424C6 -434 7 -441 8 -447L10.5 -447C9.5 -439 8 -430 7 -421C3 -408 0 -394 -1 -378Z', 0.6], ['@verd.2', 'M15 -447C15 -439 15 -430 14 -420C13 -404 13 -390 13 -380L9 -380C10 -394 10 -408 11 -420C12 -430 12 -440 12.5 -447Z', 0.6]);
      body.push(['@verd.0', 'M8 -446C7 -452 16 -452 15 -446Z'], ['@verd.2', rect(10.5, -461, 3, 13)], ['@gold.1', poly([[8, -458], [16, -458], [18, -463], [6, -463]])], ['@gold.0', rect(4, -466, 16, 3)]);
      const flame = 'M12 -483C8 -477 6 -471 7 -466H17C18 -471 16 -477 12 -483Z';
      body.push(['@gold.0', flame], ['@gold.2', 'M12 -479C10 -474 9 -470 10 -466H14C15 -470 14 -474 12 -479Z', 0.9]);
      // ---------- lamps along the seawall walk (glow) ----------
      const lampD = ['', '', ''];
      for (let x = -340, i = 0; x <= 280; x += 31, i++) if (x < -218 || x > 218) lampD[i % 3] += ell(x, -15, 1.4, 1.4);
      lampD.forEach(d => body.push({ f: '@wall.2', d, glow: 'lamp' }));
      // ---------- night: the floodlit figure, the warm pedestal, the flame, the crown, the fort's lights ----------
      lit.push({ f: { lin: [[0, '@flood', 0.62], [1, '@flood', 0.3]], x1: 0, y1: HEM, x2: 0, y2: -420 }, d: robe + arm + 'M-1 -398C-4 -408 -1 -418 7 -419C14 -419 17 -413 17 -407L19 -403L17 -401C17 -397 14 -394 9 -394C5 -394 1 -395 -1 -398Z' });
      lit.push(['@flood', rays, 0.5]);
      lit.push({ f: { lin: [[0, '@warm', 0.12], [1, '@warm', 0.42]], x1: 0, y1: PT, x2: 0, y2: FD }, d: rect(-52, PT, 104, FD - PT) });
      lit.push({ f: { lin: [[0, '@warm', 0.05], [1, '@warm', 0.3]], x1: 0, y1: FD, x2: 0, y2: FT }, d: rect(-74, FD, 148, FT - FD) });
      lit.push({ f: { rad: [[0, '@flame', 0.55], [1, '@flame', 0]], cx: 12, cy: -472, r: 26 }, d: rect(-14, -498, 52, 52) }, ['@flame', flame, 0.95]);
      lit.push({ s: '@warm', w: 1.2, op: 0.75, d: 'M-1 -409C4 -412 11 -413 16 -410' }, { s: '@lamp', w: 1, op: 0.55, d: cope });
      return { body, lit };
    },
  });
})();
