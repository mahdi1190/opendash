/* ============================================================
   SCENE LIBRARY: area-winchester (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The objects of the Winchester area builder: Winchester, Chawton, the Test
   and the Itchen, the Watercress Line and the South Downs.
     landmark.winchester-cathedral   the long nave, the Perpendicular west front and the low Norman crossing tower
     landmark.winchester-city-mill   the brick mill astride the Itchen at the foot of the High Street
     landmark.jane-austens-house     the red-brick house at Chawton (respectful architecture only, no text)
     landmark.butser-hill            the great rounded down of the South Downs (natural)
     landmark.st-catherines-hill     the hillfort above the Itchen with its beech clump (natural)
     rail.steam-train                a preserved steam engine, tender and three coaches (generic heritage livery, no lettering)
     animal.trout                    a brown trout holding in a chalk stream
     plant.water-crowfoot            the white-flowered weed beds of a chalk stream
     plant.watercress                a clump of cress in a gravel-bottomed bed
   No text, no logos, no people.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = d => sceneObjDefine(Object.assign({}, d, { build: (v, r, ctx) => tidy(d.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  /** A pointed (Gothic) opening: x, y top-left of the jambs' spring line minus the arch, width w, height h to the sill. */
  const pointed = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .55)}Q${f1(x + w * .05)} ${f1(y)} ${f1(x + w / 2)} ${f1(y - w * .15)}Q${f1(x + w * .95)} ${f1(y)} ${f1(x + w)} ${f1(y + w * .55)}V${f1(y + h)}z`;
  /** A round-headed (Norman) opening. */
  const round = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w)} ${f1(y + w / 2)}V${f1(y + h)}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const GRASS = { spring: ['#5f9a3e', '#7fb24c', '#a8cc66', '#4c7e34'], summer: ['#6a9a3e', '#8ab452', '#b8c870', '#557a32'], autumn: ['#8a8a48', '#a8a05a', '#c4b070', '#6e6a3a'], winter: ['#7e8670', '#969c84', '#b4b8a2', '#666e5a'] };
  const LEAF = { spring: ['#6a9a3a', '#8cba4c', '#b4d870'], summer: ['#3a6a2e', '#4e8238', '#6c9a44'], autumn: ['#a0602a', '#c8843a', '#e0aa4a'], winter: ['#6a5a4a', '#7e6c5a', '#5a4c40'] };

  /* ---------- landmark.winchester-cathedral (seen from the north-west, the Outer Close; lit from the left) ---------- */
  def({
    id: 'landmark.winchester-cathedral', category: 'landmark', size: [820, 290], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#d6cbae', '#bcae8e', '#e8dfc6', '#a4967a'], shade: ['#9c8e72', '#857a62', '#b0a386'], lead: ['#7c8288', '#646a70', '#9aa0a6', '#555a60'],
      glass: ['#3a4454', '#7e8ea6'], tracery: ['#e6dcc2'], door: ['#3a2e26'], flood: ['#ffe2ae', '#fff0cc'],
    } },
    night: { glow: { window: '#f6c878', lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 400, ry: 18, h: 260 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/winchester', 'uk', 'winchester', 'cathedral', 'church', 'kit:temperate'],
    credit: 'drawn for the Winchester area scenes (from public views of the cathedral across the Close)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const win = (x, y, w, h, mull = 2) => {
        push(['@shade.1', pointed(x - 2, y - 2, w + 4, h + 3)], { f: '@glass.0', d: pointed(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y + h * .5)}V${f1(y + w * .55)}Q${f1(x + w * .1)} ${f1(y + w * .05)} ${f1(x + w * .45)} ${f1(y - w * .1)}z`, .35]);
        let m = ''; for (let i = 1; i <= mull; i++) m += `M${f1(x + i * w / (mull + 1))} ${f1(y + w * .2)}V${f1(y + h)}`;
        push({ s: '@tracery', w: .9, d: m + `M${f1(x)} ${f1(y + h * .55)}h${f1(w)}`, op: .85 });
      };
      // ---- the east end (furthest right): the Lady Chapel and the presbytery
      push(['@stone.1', rect(300, -112, 92, 112)], ['@lead.1', `M296 -112L314 -138H380L396 -112z`], ['@stone.3', rect(300, -112, 92, 6), .6]);
      for (let i = 0; i < 3; i++) win(310 + i * 28, -98, 14, 52);
      push(['@stone.0', rect(112, -96, 190, 96)], ['@stone.1', rect(112, -168, 190, 72)], ['@lead.0', 'M108 -168L130 -190H300L312 -168z'], ['@lead.2', 'M130 -190H300L302 -186H132z', .8]);
      push(['@lead.1', 'M112 -96L112 -112L302 -112V-96z']);
      for (let i = 0; i < 6; i++) { const x = 118 + i * 31; win(x + 6, -90, 15, 56); win(x + 6, -160, 15, 40); push(['@shade.0', rect(x + 26, -100, 6, 100)], ['@shade.0', `M${x + 25} -170h8l-4-12z`]); }
      // ---- the crossing tower: low, massive, Norman, with two tiers of blind arcading
      push(['@stone.1', rect(14, -272, 104, 120)], ['@stone.2', rect(14, -272, 26, 120), .5], ['@shade.0', rect(96, -272, 22, 120), .55]);
      for (let i = 0; i < 6; i++) { const x = 20 + i * 16.5; push(['@shade.1', round(x, -258, 11, 34)], ['@shade.2', round(x + 1.5, -234, 8, 22), .9]); }
      for (let i = 0; i < 4; i++) { const x = 24 + i * 23; push(['@shade.1', round(x, -214, 16, 40)], { f: '@glass.0', d: round(x + 4, -206, 8, 30), glow: 'window' }); }
      push(['@stone.2', rect(10, -280, 112, 9)], ['@shade.0', rect(10, -273, 112, 2)]);
      let crn = ''; for (let i = 0; i < 14; i++) crn += rect(12 + i * 8, -286, 4.5, 6);
      push(['@stone.0', crn], ['@stone.3', 'M8 -280v-14h7v14zM115 -280v-14h7v14z']);
      // ---- the nave: aisle, lean-to roof, clerestory and the long lead roof (twelve bays)
      push(['@stone.0', rect(-300, -100, 318, 100)], ['@lead.1', 'M-300 -100L-300 -118H18V-100z'], ['@stone.1', rect(-300, -176, 318, 60)]);
      push(['@lead.0', 'M-306 -176L-284 -204H14L22 -176z'], ['@lead.2', 'M-284 -204H14L16 -200H-282z', .8], ['@lead.3', 'M-306 -176H22v3H-306z', .7]);
      for (let i = 0; i < 12; i++) {
        const x = -296 + i * 26.4;
        win(x + 6, -92, 13, 60, 1); win(x + 6, -170, 13, 46, 1);
        push(['@shade.0', `M${f1(x + 21)} 0V-100h5V0z`], ['@stone.2', `M${f1(x + 21)} -100V-112l3 -6v118z`, .6]);
        push(['@stone.3', `M${f1(x + 22)} -176v-12l1.6-4 1.6 4v12z`]);
      }
      let cr = ''; for (let i = 0; i < 40; i++) cr += rect(-300 + i * 8, -181, 4.2, 5);
      push(['@stone.1', cr]);
      push(['@stone.3', rect(-300, -6, 318, 6), .55]);
      // ---- the north transept (nearest), Norman: gable, round-headed windows in three tiers, corner turrets
      push(['@stone.0', rect(20, -160, 96, 160)], ['@stone.2', rect(20, -160, 22, 160), .45], ['@shade.0', rect(100, -160, 16, 160), .5]);
      push(['@lead.0', 'M16 -160L68 -214L120 -160z'], ['@stone.1', 'M24 -160L68 -205L112 -160z']);
      push(['@stone.3', 'M14 -168v-32h9v32zM113 -168v-32h9v32z'], ['@stone.2', 'M14 -200l4.5-10 4.5 10zM113 -200l4.5-10 4.5 10z']);
      for (let t = 0; t < 3; t++) for (let i = 0; i < 3; i++) { const x = 32 + i * 26, y = -150 + t * 48; push(['@shade.1', round(x - 2, y - 2, 18, 38)], { f: '@glass.0', d: round(x, y, 14, 34), glow: 'window' }); }
      push({ f: '@glass.0', d: ell(68, -184, 7, 7), glow: 'window' }, ['@tracery', ell(68, -184, 2, 2)]);
      push({ s: '@shade.1', w: 1, d: 'M20 -112h96M20 -64h96', op: .7 });
      // ---- the west front (left end): the great Perpendicular window, aisle ends, pinnacles and the triple porch
      push(['@stone.2', rect(-420, -128, 30, 128)], ['@stone.2', rect(-330, -128, 30, 128)], ['@stone.0', rect(-392, -214, 64, 214)]);
      push(['@stone.2', 'M-394 -214L-360 -246L-326 -214z'], ['@stone.3', 'M-360 -246L-326 -214h-6L-360 -240z', .6]);
      push(['@stone.0', 'M-398 -224v-36h8v36zM-330 -224v-36h8v36z'], ['@stone.2', 'M-398 -260l4-14 4 14zM-330 -260l4-14 4 14z']);
      push(['@stone.0', 'M-424 -128v-30h9v30zM-305 -128v-30h9v30z'], ['@stone.2', 'M-424 -158l4.5-12 4.5 12zM-305 -158l4.5-12 4.5 12z']);
      push(['@shade.1', pointed(-386, -198, 52, 128)], { f: '@glass.0', d: pointed(-382, -194, 44, 122), glow: 'window' });
      let mul = ''; for (let i = 1; i < 7; i++) mul += `M${f1(-382 + i * 44 / 7)} -186V-72`;
      push({ s: '@tracery', w: 1.2, d: mul + 'M-382 -132h44M-382 -102h44' }, ['@glass.1', 'M-382 -132V-168Q-378 -192 -360 -200L-370 -132z', .3]);
      for (const x of [-414, -324]) win(x, -112, 16, 58, 1);
      for (const [x, w] of [[-410, 20], [-376, 32], [-320, 20]]) push(['@shade.1', pointed(x - 3, -54, w + 6, 54)], ['@door', pointed(x, -48, w, 48)]);
      push(['@stone.3', rect(-420, -6, 120, 6), .6]);
      // ---- the night look: floodlit west front and tower (not graded)
      lit.push(['@flood.0', rect(-424, -280, 124, 280), .16], ['@flood.0', rect(10, -290, 112, 290), .14], ['@flood.1', 'M-430 0L-360 -40L-290 0z', .18], ['@flood.1', 'M0 0L66 -50L132 0z', .16]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.winchester-city-mill (astride the Itchen; anchor: the waterline at the middle) ---------- */
  def({
    id: 'landmark.winchester-city-mill', category: 'landmark', size: [300, 180], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#a4553c', '#8a4430', '#c06e52', '#6e3626'], tile: ['#7a3e2c', '#5e2e20', '#985440'], frame: ['#f2ece0'], glass: ['#33404e', '#9ab0c4'],
      flint: ['#8a8a86', '#6a6a66', '#b0aea6'], timber: ['#4a3628'], water: ['#e8f2f2', '#a8c8cc'], flood: ['#ffe0a6'],
    } },
    night: { glow: { window: '#ffd88a', lamp: '#ffe6a8' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 150, ry: 10, h: 160 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/winchester', 'uk', 'winchester', 'mill', 'river itchen', 'kit:temperate'],
    credit: 'drawn for the Winchester area scenes (from public views of the City Mill from the river)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the flint and stone footings with the mill-race arches
      push(['@flint.0', rect(-140, -34, 280, 34)]);
      let fl = ''; for (let i = 0; i < 90; i++) fl += ell(rr(r, -136, 136), rr(r, -30, -4), rr(r, 1.4, 3), rr(r, 1, 2));
      push(['@flint.1', fl, .8]);
      for (let i = 0; i < 12; i++) push(['@flint.2', rect(-136 + i * 23, -36, 12, 4)]);
      for (let i = 0; i < 8; i++) push(['@brick.2', rect(-130, -120 + i * 11, i % 2 ? 7 : 11, 5)], ['@brick.3', rect(i % 2 ? 123 : 119, -120 + i * 11, i % 2 ? 7 : 11, 5)]);
      for (const x of [-96, -20, 56]) push(['@timber', round(x, -30, 40, 30)], ['@water.1', `M${x} 0V-10Q${x + 20} -2 ${x + 40} -10V0z`, .9], { s: '@water.0', w: 1.4, d: `M${x + 4} -6q8 4 16 0t16 0`, op: .8 });
      // the brick mill: two storeys and an attic, a steep clay-tile roof, a hoist gable
      push(['@brick.0', rect(-130, -122, 260, 88)], ['@brick.2', rect(-130, -122, 30, 88), .45], ['@brick.3', rect(110, -122, 20, 88), .4]);
      let bc = ''; for (let i = 0; i < 14; i++) bc += `M-130 ${-118 + i * 6}h260`;
      push({ s: '@brick.1', w: .6, d: bc, op: .45, detail: true });
      push(['@tile.0', 'M-140 -120L-96 -172H96L140 -120z'], ['@tile.2', 'M-96 -172H96l4 6H-100z', .8]);
      let tc = ''; for (let i = 1; i < 8; i++) { const y = -172 + i * 6.5, k = (y + 172) / 52; tc += `M${f1(-96 - 44 * k)} ${f1(y)}H${f1(96 + 44 * k)}`; }
      push({ s: '@tile.1', w: .8, d: tc, op: .55 });
      push(['@brick.0', 'M-20 -122V-160L4 -182L28 -160V-122z'], ['@tile.1', 'M-26 -158L4 -186L34 -158h-6L4 -180L-20 -158z'], ['@timber', rect(-6, -158, 20, 24)], { f: '@glass.0', d: rect(-3, -155, 14, 18), glow: 'window' });
      push(['@brick.3', rect(70, -196, 14, 34)], ['@brick.1', rect(68, -198, 18, 4)]);
      for (const row of [-112, -74]) for (let i = 0; i < 6; i++) {
        const x = -116 + i * 40; if (row === -74 && i === 3) continue;
        push(['@frame', rect(x - 2, row - 2, 20, 26)], { f: '@glass.0', d: rect(x, row, 16, 22), glow: 'window' }, { s: '@frame', w: 1, d: `M${x + 8} ${row}v22M${x} ${row + 11}h16` }, ['@brick.3', rect(x - 3, row - 5, 22, 3)]);
      }
      push(['@timber', rect(4, -76, 18, 42)], ['@frame', rect(2, -78, 22, 3)]);
      lit.push(['@flood', rect(-140, -200, 280, 200), .12], ['@flood', 'M-60 -34L0 -70L60 -34z', .16]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.jane-austens-house (Chawton; the house from the corner of the road; anchor: the ground at the middle) ---------- */
  def({
    id: 'landmark.jane-austens-house', category: 'landmark', size: [340, 210], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#b05a3e', '#8e452e', '#c87456', '#723624'], tile: ['#7e3e2c', '#5e2e20', '#9a5844'], frame: ['#f4f0e6'], glass: ['#33404e', '#a2b6c8'],
      door: ['#2e3a30', '#c8b070'], chimney: ['#9a4a34', '#6e3424'], stone: ['#d8d0bc'], flood: ['#ffe0a8'],
    } },
    night: { glow: { window: '#ffd690', lamp: '#ffe6a8' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 170, ry: 12, h: 190 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/chawton', 'uk', 'chawton', 'house', 'heritage', 'kit:temperate'],
    credit: 'drawn for the Winchester area scenes (from public views of the house at Chawton)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const sash = (x, y, w, h) => {
        push(['@frame', rect(x - 3, y - 3, w + 6, h + 6)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', `M${x} ${y}h${f1(w * .5)}l${f1(-w * .5)} ${f1(h * .45)}z`, .35]);
        push({ s: '@frame', w: 1.1, d: `M${x} ${f1(y + h / 2)}h${w}M${f1(x + w / 3)} ${y}v${h}M${f1(x + 2 * w / 3)} ${y}v${h}` }, ['@stone', rect(x - 5, y + h + 2, w + 10, 3)]);
      };
      // the side wing (left, lower), then the main block
      push(['@brick.1', rect(-170, -86, 110, 86)], ['@tile.1', 'M-176 -84L-150 -122H-64L-56 -84z'], ['@tile.2', 'M-150 -122H-64l2 4H-152z', .7]);
      sash(-150, -70, 22, 30); sash(-104, -70, 22, 30);
      push(['@brick.0', rect(-60, -128, 220, 128)], ['@brick.2', rect(-60, -128, 34, 128), .4], ['@brick.3', rect(136, -128, 24, 128), .4]);
      let bc = ''; for (let i = 0; i < 20; i++) bc += `M-60 ${-124 + i * 6.2}h220`;
      push({ s: '@brick.1', w: .55, d: bc, op: .4, detail: true });
      push(['@tile.0', 'M-70 -126L-30 -190H130L170 -126z'], ['@tile.2', 'M-30 -190H130l3 5H-33z', .8]);
      let tc = ''; for (let i = 1; i < 9; i++) { const y = -190 + i * 7, k = (y + 190) / 64; tc += `M${f1(-30 - 40 * k)} ${f1(y)}H${f1(130 + 40 * k)}`; }
      push({ s: '@tile.1', w: .8, d: tc, op: .5 });
      for (const x of [-40, 118]) push(['@chimney.0', rect(x, -212, 18, 40)], ['@chimney.1', rect(x - 2, -214, 22, 5)], ['@chimney.1', rect(x + 13, -212, 5, 40), .6]);
      push(['@tile.1', 'M34 -150L50 -170L66 -150z'], ['@frame', rect(40, -152, 20, 4)], { f: '@glass.0', d: rect(42, -164, 16, 12), glow: 'window' });
      // two storeys of sashes; one window on the end wall long blocked (a brick panel, as on the real house)
      for (const x of [-40, 8, 94, 132]) sash(x, -114, 22, 34);
      for (const x of [-40, 94, 132]) sash(x, -62, 22, 40);
      push(['@brick.3', rect(10, -60, 20, 38), .35]);
      push(['@door.0', rect(46, -54, 26, 54)], ['@frame', 'M42 -54v-6h34v6z'], ['@stone', rect(40, -2, 38, 4)], ['@door.1', ell(66, -28, 1.6, 1.6)]);
      push(['@stone', rect(-60, -6, 220, 6), .5]);
      for (let i = 0; i < 9; i++) push(['@brick.2', rect(-60, -124 + i * 13, i % 2 ? 6 : 10, 6)], ['@brick.3', rect(i % 2 ? 154 : 150, -124 + i * 13, i % 2 ? 6 : 10, 6)]);
      lit.push(['@flood', 'M30 0L59 -40L88 0z', .2], { f: '@flood', d: ell(78, -62, 3, 3), glow: 'lamp' });
      return { body: b, lit };
    },
  });

  /* ---------- the downs: big rounded natural landmarks (seasonal turf, chalk paths, scrub) ---------- */
  const TURF = bySeason({ turf: GRASS, scrub: { spring: ['#3e6a30', '#5a8a3c', '#f2eee6'], summer: ['#2e5a2a', '#46743a', '#46743a'], autumn: ['#6a5a2e', '#8a6a34', '#a8482a'], winter: ['#4e463c', '#5e5448', '#7a3e2c'] }, beech: LEAF });
  const downD = (r, w, h, k) => {   // a rounded down: a long smooth hump, steeper on one side
    let d = `M${-w / 2} 0`;
    for (let i = 0; i <= 24; i++) { const t = i / 24, x = -w / 2 + t * w, y = -h * Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 1.4); d += `L${f1(x)} ${f1(y)}`; }
    return d + 'z';
  };
  const downDetail = (b, r, w, h, k, o) => {
    const top = x => { const t = (x + w / 2) / w; return -h * Math.pow(Math.sin(Math.PI * Math.pow(Math.max(0, Math.min(1, t)), k)), 1.4); };
    // light on the left flank, shade on the right
    b.push(['@turf.2', downD(r, w * .62, h * .96, k * .9).replace(/^M[^L]+/, `M${-w / 2} 0`), .35]);
    // turf texture: strokes along the slope
    let tx = ''; for (let i = 0; i < 160; i++) { const x = rr(r, -w * .46, w * .46), t = top(x), y = rr(r, t * .92, -4); tx += `M${f1(x)} ${f1(y)}l${f1(rr(r, 4, 10))} ${f1(rr(r, -1, 1))}`; }
    b.push({ s: '@turf.3', w: 1.1, op: .35, d: tx, detail: true });
    // the chalk paths climbing the flank (white scars)
    for (const [x0, x1] of o.paths) { const y0 = top(x0) * .1, y1 = top(x1) * .9; b.push({ s: '#e8e4d4', w: 3.2, op: .85, d: `M${x0} ${f1(y0)}Q${f1((x0 + x1) / 2 + 30)} ${f1((y0 + y1) / 2)} ${x1} ${f1(y1)}` }); }
    // scrub and thorn bushes scattered on the flanks, in lobed clumps
    for (let i = 0; i < o.scrub; i++) { const x = rr(r, -w * .44, w * .44), t = top(x), y = rr(r, t * .7, t * .05), s = rr(r, 4, 11); b.push(['@scrub.' + (i % 2), sceneD.lobed(r, x, y - s * .5, s * 1.3, s * .8, 7, .3)]); }
    let bl = ''; for (let i = 0; i < 30; i++) { const x = rr(r, -w * .4, w * .4), t = top(x), y = rr(r, t * .6, t * .1); bl += ell(x, y, 1.6, 1.6); }
    b.push(['@scrub.2', bl, .9]);
    // round barrows on the crest (bronze-age tumuli: smooth bumps)
    for (const x of o.barrows) { const y = top(x); b.push(['@turf.1', `M${x - 16} ${f1(y + 2)}q16 -12 32 0z`]); }
  };
  def({
    id: 'landmark.butser-hill', category: 'landmark', size: [1300, 230], variants: 1, seasonal: true, flippable: false,
    palette: Object.assign({ base: {} }, TURF),
    tags: ['landmark', 'natural', 'signature', 'place:uk/butser-hill', 'uk', 'south downs', 'chalk', 'down', 'kit:temperate'],
    credit: 'drawn for the Winchester area scenes (Butser Hill, the highest point of the South Downs in Hampshire)',
    build(v, r) {
      const b = [], W = 1300, H = 220, k = .85;
      b.push(['@turf.0', downD(r, W, H, k)], ['@turf.3', `M${W * .08} 0L${f1(W * .2)} ${f1(-H * .55)}Q${W * .35} ${-H * .2} ${W / 2} 0z`, .35]);
      downDetail(b, r, W, H, k, { paths: [[-420, -150], [180, 40], [380, 240]], scrub: 70, barrows: [-90, -20, 60] });
      // a beech hanger on the far right flank
      for (let i = 0; i < 26; i++) { const x = rr(r, 330, 560), y = rr(r, -70, -8), s = rr(r, 10, 22); b.push(['@beech.' + (i % 3), sceneD.lobed(r, x, y - s, s, s * .9, 8, .25)]); }
      return { body: b };
    },
  });
  def({
    id: 'landmark.st-catherines-hill', category: 'landmark', size: [760, 220], variants: 1, seasonal: true, flippable: false,
    palette: Object.assign({ base: {} }, TURF),
    tags: ['landmark', 'natural', 'signature', 'place:uk/winchester', 'uk', 'winchester', 'hillfort', 'chalk', 'down', 'kit:temperate'],
    credit: 'drawn for the Winchester area scenes (St Catherine\'s Hill above the Itchen, its ramparts and the beech clump)',
    build(v, r) {
      const b = [], W = 740, H = 150, k = 1;
      b.push(['@turf.0', downD(r, W, H, k)]);
      downDetail(b, r, W, H, k, { paths: [[-300, -120], [200, 90]], scrub: 50, barrows: [] });
      // the Iron Age rampart: a terrace ring round the upper slopes (a darker band and a lit lip)
      b.push({ s: '@turf.3', w: 5, op: .55, d: 'M-250 -64Q-160 -128 0 -132Q160 -128 250 -64' }, { s: '@turf.2', w: 2, op: .7, d: 'M-250 -68Q-160 -132 0 -136Q160 -132 250 -68' });
      // the beech clump on the summit
      for (let i = 0; i < 46; i++) { const x = rr(r, -70, 70), y = -150 - rr(r, 0, 40) * (1 - Math.abs(x) / 90), s = rr(r, 10, 20); b.push(['@beech.' + (i % 3), sceneD.lobed(r, x, y, s, s * .85, 8, .25)]); }
      let tr = ''; for (let i = 0; i < 9; i++) { const x = -60 + i * 15; tr += `M${x} -146v-14`; }
      b.push({ s: '#4a3e34', w: 2.2, d: tr });
      return { body: b };
    },
  });

  /* ---------- rail.steam-train: tank-and-tender engine with three heritage coaches; FACES RIGHT ---------- */
  def({
    id: 'rail.steam-train', category: 'rail', size: [600, 78], variants: 2, seasonal: false, flippable: true,
    palette: { base: {
      loco: ['#2e5a3a', '#1e2224'], lined: ['#d8b048', '#c8c0b0'], black: '#1a1c1e', brass: '#d0a848', red: '#a8322a',
      coach: ['#7a2a2a', '#3a4a2a'], cream: ['#efe2c4', '#e8dcc0'], roof: ['#5a5650', '#6a6660'], glass: ['#33404e', '#8a9cb0'], wheel: ['#7a2a24', '#2a2a2a'],
      steam: ['#f4f4f0', '#dcdcd8', '#c8c8c4'], lamp: '#f8f0d8',
    } },
    night: { glow: { window: '#ffd88a', lamp: '#fff0c0' }, on: 0.95 },
    parts: ['body', 'steam'],
    anim: { bob: { part: 'body', dy: .5, period: .7 }, flicker: { part: 'steam', op: [0.55, 1], period: 1.4 } },
    shadow: { rx: 300, ry: 6, h: 60 },
    reflect: true,
    tags: ['uk', 'railway', 'steam', 'train', 'heritage', 'kit:vehicles', 'kit:temperate', 'role:vehicle'],
    credit: 'drawn for the Winchester area scenes (a preserved steam train in a generic heritage livery, no lettering)',
    build(v) {
      const b = [], st = [], push = (...s) => b.push(...s);
      const L = `@loco.${v}`, C = `@coach.${v}`;
      // three coaches (left of the engine), each with a window row
      for (let i = 0; i < 3; i++) {
        const x = -300 + i * 104;
        push(['@roof.0', `M${x} -50Q${x + 50} -58 ${x + 100} -50z`], [C, rect(x, -50, 100, 40)], ['@cream.' + v, rect(x, -46, 100, 14)]);
        for (let j = 0; j < 7; j++) push({ f: '@glass.0', d: rect(x + 6 + j * 13, -44, 9, 10), glow: 'window' });
        push(['@black', rect(x + 2, -10, 96, 4)], ['@wheel.1', ell(x + 18, -5, 5, 5) + ell(x + 30, -5, 5, 5) + ell(x + 70, -5, 5, 5) + ell(x + 82, -5, 5, 5)]);
        push(['@black', rect(x + 100, -40, 4, 26)]);
      }
      // the tender
      push([L, rect(14, -46, 56, 38)], ['@black', rect(14, -50, 56, 5)], ['@lined.0', rect(18, -40, 48, 1.4), .9], ['@black', rect(12, -10, 60, 4)]);
      push(['@wheel.1', ell(26, -6, 6, 6) + ell(42, -6, 6, 6) + ell(58, -6, 6, 6)]);
      // the engine: cab, boiler, smokebox, chimney, dome, driving wheels, rods
      push([L, rect(74, -62, 34, 52)], ['@black', 'M70 -62h42v-6q-21 -6 -42 0z'], { f: '@glass.0', d: rect(80, -56, 12, 12), glow: 'window' });
      push([L, rect(108, -50, 98, 30)], ['@lined.0', rect(108, -48, 98, 1.6), .8], ['@lined.0', rect(108, -24, 98, 1.4), .8]);
      for (const x of [130, 160, 186]) push(['@lined.0', rect(x, -50, 1.4, 30), .6]);
      push(['@black', rect(204, -54, 30, 38)], ['@black', rect(214, -72, 12, 20)], ['@black', rect(212, -74, 16, 4)], ['@brass', `M150 -50v-8q8 -8 16 0v8z`]);
      push(['@red', rect(204, -16, 36, 4)], ['@black', rect(72, -16, 136, 6)]);
      for (const x of [118, 146, 174]) push([`@wheel.${v ? 1 : 0}`, ell(x, -11, 11, 11)], ['@black', ell(x, -11, 3, 3)]);
      push(['@wheel.1', ell(206, -7, 6, 6) + ell(222, -7, 6, 6)], { s: '#b8b8b0', w: 2.2, d: 'M118 -8H174' });
      push({ f: '@lamp', d: rect(232, -44, 5, 6), glow: 'lamp' }, { f: '@lamp', d: rect(232, -28, 5, 6), glow: 'lamp' });
      // the steam and smoke plume trailing back over the train
      let pl = ['', '', '']; const pts = [[222, -82, 9], [206, -96, 13], [184, -106, 16], [156, -112, 19], [124, -114, 21], [90, -112, 22], [54, -108, 22], [16, -104, 21], [-24, -100, 18], [-62, -96, 14]];
      pts.forEach(([x, y, rad], i) => { pl[i % 3] += ell(x, y, rad * 1.25, rad * .9) + ell(x + rad * .6, y + rad * .3, rad * .8, rad * .6); });
      st.push(['@steam.2', pl[2], .7], ['@steam.1', pl[1], .8], ['@steam.0', pl[0], .9]);
      return { body: b, steam: st };
    },
  });

  /* ---------- animal.trout: a brown trout holding in the current (side view, faces right; anchor: its belly line) ---------- */
  def({
    id: 'animal.trout', category: 'animal', size: [64, 18], variants: 2, seasonal: false, flippable: true,
    palette: { base: { back: ['#5a5a32', '#4a4a3a'], flank: ['#a8904e', '#9a9070'], belly: '#e0d4a8', spot: ['#2a2a1e', '#b8402a'], fin: ['#6a5e3a'] } },
    parts: ['body', 'tail'],
    anim: { turn: { part: 'tail', pivot: [-20, -7], deg: 16, period: 1.6, hold: 0 }, bob: { part: 'body', dy: .8, period: 2.6 } },
    tags: ['uk', 'fish', 'trout', 'chalk stream', 'kit:water', 'kit:animals', 'role:animal'],
    credit: 'drawn for the Winchester area scenes (a brown trout in a chalk stream)',
    build(v) {
      const body = [
        [`@flank.${v}`, 'M-22 -7C-12 -16 14 -17 30 -9C34 -7 34 -5 30 -3C14 3 -12 2 -22 -7z', .9],
        [`@back.${v}`, 'M-22 -7C-12 -16 14 -17 30 -9C20 -12 -4 -12 -22 -7z', .9],
        ['@belly', 'M-14 -3C0 1 18 0 28 -3C16 -1 0 -1 -14 -3z', .8],
        ['@fin', 'M2 -14l6 -5 6 4zM6 -1l4 4 4 -3z', .8],
        ['@spot.0', ell(0, -10, 1.3, 1.3) + ell(8, -11, 1.2, 1.2) + ell(14, -9, 1.3, 1.3) + ell(-6, -8, 1.1, 1.1) + ell(20, -10, 1, 1), .8],
        ['@spot.1', ell(4, -7, 1, 1) + ell(16, -6, 1, 1), .8],
        ['@spot.0', ell(27, -8, 1, 1)],
      ];
      return { body, tail: [[`@back.${v}`, 'M-20 -7L-32 -14Q-29 -7 -32 0z', .85]] };
    },
  });

  /* ---------- plant.water-crowfoot: a trailing weed bed with white flowers, floating on the stream ---------- */
  def({
    id: 'plant.water-crowfoot', category: 'plant', size: [90, 14], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { flower: ['#fbfaf2', '#f4d84a'] } }, bySeason({ weed: { spring: ['#4a8a3a', '#6aa84a'], summer: ['#3a7a34', '#5a9a40'], autumn: ['#5a7a34', '#7a8a3a'], winter: ['#4a6a3a', '#5a7a44'] } })),
    reflect: false,
    tags: ['uk', 'chalk stream', 'weed', 'ranunculus', 'kit:water', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the Winchester area scenes (water crowfoot beds on the Test and the Itchen)',
    build(v, r, ctx) {
      const w = [70, 90, 56][v], b = [], tr = ['', ''];
      for (let i = 0; i < 9; i++) { const y = rr(r, -8, -1), x0 = rr(r, -w / 2, -w / 6); tr[i % 2] += `M${f1(x0)} ${f1(y)}q${f1(w * .3)} ${f1(rr(r, -3, 3))} ${f1(w * .6 + rr(r, 0, w * .3))} ${f1(rr(r, -2, 2))}`; }
      for (let i = 0; i < 5; i++) b.push(['@weed.' + (i % 2), ell(rr(r, -w * .4, w * .4), rr(r, -6, -2), rr(r, 5, 10), 2.2), .8]);
      b.push({ s: '@weed.0', w: 2.4, d: tr[0], op: .85 }, { s: '@weed.1', w: 1.6, d: tr[1], op: .85 });
      if (ctx.season === 'spring' || ctx.season === 'summer') {
        let fl = '', ey = ''; const n = ctx.season === 'summer' ? 12 : 7;
        for (let i = 0; i < n; i++) { const x = rr(r, -w * .45, w * .45), y = rr(r, -9, -2); fl += ell(x, y, 2.4, 1.4); ey += ell(x, y - .2, .6, .5); }
        b.push(['@flower.0', fl], ['@flower.1', ey]);
      }
      return { body: b };
    },
  });

  /* ---------- plant.watercress: a clump of cress in a bed (anchor: the water surface) ---------- */
  def({
    id: 'plant.watercress', category: 'plant', size: [44, 20], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: { flower: ['#f6f6ee'] } }, bySeason({ cress: { spring: ['#3e7a2e', '#5e9a3a', '#8cc050'], summer: ['#356e2a', '#4e8a34', '#7ab048'], autumn: ['#4a6e2c', '#6a8a3a', '#9aa850'], winter: ['#3a5e30', '#4e7238', '#6a8a48'] } })),
    reflect: true,
    tags: ['uk', 'watercress', 'alresford', 'crop', 'kit:water', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the Winchester area scenes (the watercress beds of the Alresford chalk springs)',
    build(v, r) {
      const w = [40, 44, 34][v], parts = ['', '', ''];
      for (let i = 0; i < 22; i++) { const x = rr(r, -w / 2, w / 2), y = -rr(r, 2, 16) * (1 - Math.abs(x) / w), s = rr(r, 2.4, 4.4); parts[i % 3] += ell(x, y, s, s * .8); }
      const b = [['@cress.0', `M${-w / 2} 0Q0 -22 ${w / 2} 0z`], ['@cress.0', parts[0]], ['@cress.1', parts[1]], ['@cress.2', parts[2]]];
      if (v === 2) { let f = ''; for (let i = 0; i < 6; i++) f += ell(rr(r, -w / 3, w / 3), -rr(r, 12, 18), 1.2, 1.2); b.push(['@flower.0', f]); }
      return { body: b };
    },
  });
})();
