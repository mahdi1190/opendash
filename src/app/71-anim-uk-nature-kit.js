/* ============================================================
   UK NATURE KIT: seeded generators for rich, intricate local scenes
   (the Yateley and Fleet places first; any full UK scene may use it).
   PURE classic script: no DOM, no globals touched at load. The South East
   base pack calls ukNatureKit(T) once with its toolkit (U, R, rnd, mv, linU,
   radU, puffs ...) and hands the result to every part file as T.K.

   Everything is drawn in the 1600 x 900 scene space (x -160..1760 for
   drift room). Generators return SVG markup strings. Counts are scaled by
   the level of detail: K.scene(o, draw) draws the full detail full screen
   and about 30% of it in small gallery tiles (one row of woods, sparser
   carpets and crowns), so the gallery stays light.

   Motion: transform and opacity only, through x-ukn* classes (keyframes
   ap-ukn* in K.css, appended to the pack css). Every loop is seamless; travel
   loops either pace there and back (turning round) or fade at both ends.
   Wind: K.wind() groups swaying plants into vertical strips whose delays
   grow with x, so a gust visibly travels across the scene. With reduced
   motion every element rests where it is drawn: the still frame is complete.

   Budget: a scene with item.rich = true may render up to
   ANIM_RICH_ITEM_MAX_BYTES (about 1 MB) full screen and
   ANIM_RICH_TILE_MAX_BYTES (150 KB) in small tiles (K.scene draws about 30%
   of the detail there). Keep animated groups to roughly 150-300 per scene
   and check with tools/perf-uk-scene.mjs (median frame under 20 ms).

   Live light: K.live(o, view) turns the registry's o.sky (almSceneLight of
   the clock, the location and the zone, plus the weather) into one light
   model; K.liveSky, K.liveClouds, K.lightPath, K.lamp, K.shadow, K.weather
   and K.grade draw with it, and trees take their shadows and lit side from
   it. See docs/dev/UK_PACK.md, "Rich local scenes".
   ============================================================ */
function ukNatureKit(T) {
  const { U, R, rnd, mv, linU, radU } = T;
  const K = {};
  let LOD = 1;
  /** A count scaled by the level of detail (full screen 1, gallery tiles .3). */
  const N = n => n > 0 ? Math.max(1, Math.round(n * LOD)) : 0;
  /** Detail inside a shared symbol: all of it full screen, about a third in tiles. */
  const ND = n => LOD < 1 ? Math.max(1, Math.round(n * .35)) : n;
  const rr = (r, a, b) => a + r() * (b - a);
  const pick = (r, a) => a[Math.min(a.length - 1, Math.floor(r() * a.length))];
  const D = Math.PI / 180;
  const f2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- colour ---------- */
  const hx = c => { let s = String(c).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  /** Mix two #hex colours (t 0..1). Atmospheric perspective: mix(colour, sky, distance). */
  const mix = (a, b, t) => { if (!t || !b) return a; const A = hx(a), B = hx(b), k = clamp(t, 0, 1); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  K.mix = mix;
  const hz = o => c => mix(c, o.hazeCol || (LV ? LV.haze : '#c9dbe0'), o.haze || 0);

  /* ---------- small path helpers (integers keep the markup compact) ---------- */
  const circ = (x, y, r) => { r = Math.max(1, R(r)); return `M${R(x) - r} ${R(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; };
  const ell = (x, y, rx, ry) => { rx = Math.max(1, R(rx)); ry = Math.max(1, R(ry)); return `M${R(x) - rx} ${R(y)}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`; };
  /** An almond leaf from (x, y), pointing at angle a (radians, 0 = up), length l. */
  const leafD = (x, y, a, l, w) => { const s = Math.sin(a), c = -Math.cos(a), tx = x + s * l, ty = y + c * l, mx = x + s * l * .5, my = y + c * l * .5, nx = -c * (w || l * .32), ny = s * (w || l * .32);
    return `M${R(x)} ${R(y)}Q${R(mx + nx)} ${R(my + ny)} ${R(tx)} ${R(ty)}Q${R(mx - nx)} ${R(my - ny)} ${R(x)} ${R(y)}z`; };
  const P = (fill, d, extra) => d ? `<path fill="${fill}"${extra || ''} d="${d}"/>` : '';
  const S = (stroke, w, d, extra) => d ? `<path fill="none" stroke="${stroke}" stroke-width="${f2(w)}" stroke-linecap="round"${extra || ''} d="${d}"/>` : '';
  /** Place local art: translate, scale (flip mirrors it). */
  const at = (x, y, s, inner, flip) => `<g transform="translate(${R(x)} ${R(y)})${s !== 1 || flip ? ` scale(${f2(flip ? -s : s)} ${f2(s)})` : ''}">${inner}</g>`;
  const M = (cls, o, inner) => mv('ukn' + cls, o, inner);
  const sec = v => f2(v) + 's';
  K.circ = circ; K.ell = ell; K.leafD = leafD; K.at = at; K.P = P; K.S = S;

  /* ---------- palettes: four seasons ---------- */
  const PAL = {
    spring: { grass: ['#4c7a37', '#6f9f40', '#a6c95e', '#cfe28a'], dry: ['#9aa660', '#c2c48a'], ground: ['#8a7553', '#a99069', '#cbb48a'],
      leaf: { oak: ['#3f7032', '#79aa45', '#c5df7c'], birch: ['#4f8a3a', '#8fc157', '#d8ee95'], pine: ['#1f4536', '#33634a', '#6d9a63'], willow: ['#5f9440', '#9cc65e', '#ddf0a0'], alder: ['#356634', '#56904a', '#97c06a'], hawthorn: ['#3d6e34', '#6b9f46', '#b3d474'] },
      heather: ['#3d4f30', '#5f7340', '#93a65c'], bloomHeather: ['#8a9a55', '#a3b26a'], gorse: ['#28452b', '#3f6338', '#6b8d4a'], gorseFlower: ['#f7c51e', '#ffe15a', '#e8a514'], gorseBloom: 1,
      bracken: ['#5f8d3a', '#94bb55', '#c3dc7e'], reed: ['#4f7a3a', '#7ea24c', '#a9c26a'], reedHead: ['#6e5236', '#8e6a44'], plume: ['#8a7a5a', '#a89a78'],
      blossom: ['#fff4f6', '#f6c9d7', '#ffffff'] },
    summer: { grass: ['#3f6b31', '#5f8f3a', '#8db352', '#c3d77e'], dry: ['#b9ad6a', '#d9cb8e'], ground: ['#8c7651', '#ad936a', '#d2ba8e'],
      leaf: { oak: ['#2f5a2c', '#4f8538', '#94bd5a'], birch: ['#3f7536', '#6fa448', '#b6d773'], pine: ['#1d4033', '#2f5b44', '#5f8c58'], willow: ['#4f8338', '#84b452', '#c3e08a'], alder: ['#2c5530', '#447a3e', '#7aa95a'], hawthorn: ['#2f5a2e', '#4d8040', '#8cb85c'] },
      heather: ['#3b4a2e', '#55663a', '#7c8d52'], bloomHeather: ['#a8509c', '#c875b8', '#e3a3d4', '#8a4590'], gorse: ['#28452b', '#3f6338', '#6b8d4a'], gorseFlower: ['#f3c21c', '#ffde55', '#e39d12'], gorseBloom: .55,
      bracken: ['#3f7032', '#6a9c44', '#a5c96a'], reed: ['#46713a', '#6f9a48', '#a3c066'], reedHead: ['#5e4430', '#7d5c3c'], plume: ['#7a5f6e', '#a08494'],
      blossom: ['#fffaf0', '#f2e2c8', '#ffffff'] },
    autumn: { grass: ['#5f6a35', '#8a8a45', '#b5a65c', '#d6c58a'], dry: ['#c2a467', '#dcc396'], ground: ['#7d6247', '#9e7f5a', '#c4a57c'],
      leaf: { oak: ['#7a4f22', '#bd7a2c', '#e9b24c'], birch: ['#a37a22', '#dcae35', '#f6d968'], pine: ['#1f4334', '#30604a', '#61905c'], willow: ['#8f8a33', '#c4b448', '#e8d877'], alder: ['#4d5a2c', '#6f7534', '#9c9446'], hawthorn: ['#7a2f22', '#b04a2c', '#d97a3c'] },
      heather: ['#4a3f30', '#6a5040', '#8a6a55'], bloomHeather: ['#8a5a6a', '#a87a84', '#6e4a52'], gorse: ['#2a432a', '#3f5e36', '#66844a'], gorseFlower: ['#e9b81c', '#f7d450'], gorseBloom: .3,
      bracken: ['#8a3f1c', '#bb6428', '#e39a4a'], reed: ['#7a7038', '#a39248', '#c8b46a'], reedHead: ['#5a3e2a', '#7a5434'], plume: ['#a08a6a', '#c4b090'],
      blossom: ['#d9583a', '#b8322a', '#f08a4a'] },
    winter: { grass: ['#6b735a', '#8d9277', '#b3b59c', '#dcdccb'], dry: ['#b9ac86', '#d6cdb0'], ground: ['#7a6a58', '#9a8a76', '#c4b8a6'],
      leaf: { pine: ['#1f3f36', '#2e5547', '#5a8070'] }, bare: '#5a4f4a', twig: '#7a6a72', frost: '#f4f8fa', snow: '#fbfdff',
      heather: ['#3e3a30', '#5a4a3c', '#7a6550'], bloomHeather: ['#6a4f45', '#80665a'], gorse: ['#2a4030', '#3d5a40', '#62806a'], gorseFlower: ['#e8c040', '#f6d870'], gorseBloom: .12,
      bracken: ['#7a4a2a', '#9a6438', '#bb8a5a'], reed: ['#8a8058', '#aa9e74', '#cfc49c'], reedHead: ['#5a4632', '#6e5840'], plume: ['#b0a48a', '#d4cab0'],
      blossom: ['#ffffff', '#eef4f8', '#ffffff'] },
  };
  /** The palette for a season: grass, dry, ground, leaf[species], heather, gorse, bracken, reed ... */
  K.pal = season => PAL[season] || PAL.summer;
  K.PAL = PAL;

  /* ---------- symbols: detail drawn once per render, placed many times ---------- */
  let SC = null, orphan = null;
  const f1 = v => Math.round(v * 10) / 10;
  /** A shared drawing for this render (in defs), built once per key: returns its id. */
  const sym = (key, build) => {
    const ctx = SC || (orphan = orphan || { defs: new Map(), out: '' });
    let id = ctx.defs.get(key);
    if (!id) { id = U(); ctx.defs.set(key, id); const inner = build(); ctx.out += `<g id="${id}">${inner}</g>`; }
    return id;
  };
  /** Outside K.scene, put the defs made so far in front of the markup (inside a scene they go in its defs). */
  const flush = s => { if (SC || !orphan) return s; const d = orphan.out; orphan = null; return `<defs>${d}</defs>` + s; };
  K.sym = sym;
  /** A shared definition (a gradient, a pattern) for this render, built once per key: build(id) returns its markup. */
  const defOnce = (key, build) => {
    const ctx = SC || (orphan = orphan || { defs: new Map(), out: '' });
    let id = ctx.defs.get(key);
    if (!id) { id = U(); ctx.defs.set(key, id); ctx.out += build(id); }
    return id;
  };
  K.defOnce = defOnce;
  /** One placed symbol: <use> at (x, y), scaled (negative k mirrors it). */
  const use = (id, x, y, k) => `<use href="#${id}" transform="translate(${R(x)} ${R(y)})${k !== 1 ? `scale(${f2(k)}${k < 0 ? ' ' + f2(-k) : ''})` : ''}"/>`;
  K.use = use;
  /** A scalloped, leafy-edged blob: n lobes round an ellipse (the base shape of foliage and clouds). */
  const blob = (r, cx, cy, rx, ry, n) => {
    const pts = []; for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = rr(r, .86, 1.04); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    const F = Math.max(rx, ry) > 14 ? R : f1;
    let d = `M${F(pts[0][0])} ${F(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, F(Math.hypot(p[0] - q[0], p[1] - q[1]) * rr(r, .56, .7))); d += `A${lr} ${lr} 0 0 1 ${F(p[0])} ${F(p[1])}`; }
    return d + 'z';
  };
  K.blob = blob;
  /**
   * An irregular leaf mass: the radius wanders with low-frequency noise (no two alike, never a
   * circle), the underside is flattened, and the rim is broken into small leafy scallops of
   * mixed size. ragged 0..1 (how far the outline wanders, .3 default).
   */
  const lobed = (r, cx, cy, rx, ry, n, ragged = .3) => {
    if (LOD < 1) n = Math.max(5, Math.round(n * .45));   // small tiles: coarser outlines
    const ph = [rr(r, 0, 6.3), rr(r, 0, 6.3), rr(r, 0, 6.3)], am = [rr(r, .5, 1) * ragged, rr(r, .3, .7) * ragged, rr(r, .1, .35) * ragged], pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i + rr(r, -.3, .3)) / n * Math.PI * 2, k = 1 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]) + am[2] * Math.sin(5 * a + ph[2]) + rr(r, -.06, .06);
      const s = Math.sin(a), y = s > 0 ? s * (.62 + rr(r, 0, .12)) : s;   // flatter underneath
      pts.push([cx + Math.cos(a) * rx * k, cy + y * ry * k]);
    }
    const F = Math.max(rx, ry) > 14 ? R : f1;
    let d = `M${F(pts[0][0])} ${F(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, F(Math.hypot(p[0] - q[0], p[1] - q[1]) * rr(r, .52, .8))); d += `A${lr} ${lr} 0 0 1 ${F(p[0])} ${F(p[1])}`; }
    return d + 'z';
  };
  K.lobed = lobed;
  /** Place a symbol with a free transform: (x, y), scale sx, sy (negative sx mirrors), rotation deg. */
  const useT = (id, x, y, sx, sy, deg) => `<use href="#${id}" transform="translate(${R(x)} ${R(y)})${deg ? `rotate(${R(deg)})` : ''}scale(${f2(sx)} ${f2(sy)})"/>`;
  K.useT = useT;

  /* ---------- wind: swaying plants in strips, a gust travels left to right ---------- */
  const GUST = 7;   // seconds per gust cycle; the wave crosses the scene in about 2.8 s
  /** The animation delay for something at x, so it moves with the gust passing there. */
  const gustD = x => (-GUST + clamp((x + 160) / 1920, 0, 1) * 2.8).toFixed(2) + 's';
  K.gustDelay = gustD;
  /** Sway any markup with the gust at x ('strong' grass, 'soft' heather and reeds, 'tree' crowns). */
  K.sway = (x, inner, amp) => M(amp === 'soft' ? 'gust2' : amp === 'tree' ? 'gust3' : 'gust', { ad: GUST + 's', d: gustD(x) }, inner);
  /**
   * Group "bits" into gust strips. A bit is a path piece {x, z, fill | stroke, w, dash, op, d},
   * a placed symbol {x, y, z, use: id, k, fill, color} or raw markup {x, y, z, svg}. Paths of
   * one colour merge into one element; symbols of one scale and colour share a group, in
   * painter's order (back rows first). o: {strips (8), x0, x1, amp: 'strong' | 'soft' | 'tree' | 'none'}.
   */
  K.wind = (bits, o = {}) => {
    const n = o.strips || 8, x0 = o.x0 != null ? o.x0 : -160, x1 = o.x1 != null ? o.x1 : 1760;
    const strips = Array.from({ length: n }, () => []);
    for (const b of bits) strips[clamp(Math.floor((b.x - x0) / (x1 - x0) * n), 0, n - 1)].push(b);
    let out = '';
    strips.forEach((list, i) => {
      if (!list.length) return;
      // paths first within a layer (merged by colour), then symbols and markup by row (20 units), colour and depth
      const row = b => b.d ? -1 : Math.floor((b.y || 0) / 20);
      list.sort((a, b) => (a.z || 0) - (b.z || 0) || row(a) - row(b) || (a.d ? 0 : String(a.fill) + a.color < String(b.fill) + b.color ? -1 : String(a.fill) + a.color > String(b.fill) + b.color ? 1 : (a.y || 0) - (b.y || 0)));
      let inner = '', pathKeys = new Map(), z = null, run = null, buf = '';
      const flushPaths = () => { for (const [, { b, d }] of pathKeys) { const op = b.op && b.op !== 1 ? ` opacity="${b.op}"` : ''; inner += b.fill ? P(b.fill, d, op) : S(b.stroke, b.w || 2, d, (b.dash ? ` stroke-dasharray="${b.dash}"` : '') + op); } pathKeys = new Map(); };
      const flushRun = () => { if (run && buf) inner += run === 'svg' ? buf : `<g${run}>${buf}</g>`; run = null; buf = ''; };
      for (const b of list) {
        if ((b.z || 0) !== z) { flushRun(); flushPaths(); z = b.z || 0; }
        if (b.d) { const key = b.fill ? 'f' + b.fill + '|' + (b.op || 1) : 's' + b.stroke + '|' + f2(b.w || 2) + '|' + (b.dash || '') + '|' + (b.op || 1); if (!pathKeys.has(key)) pathKeys.set(key, { b, d: '' }); pathKeys.get(key).d += b.d; continue; }
        const key = b.svg ? 'svg' : `${b.fill ? ` fill="${b.fill}"` : ''}${b.color ? ` color="${b.color}"` : ''}${b.stroke ? ` stroke="${b.stroke}"` : ''}`;
        if (key !== run) { flushRun(); run = key; }
        buf += b.svg || use(b.use, b.x, b.y, b.k || 1);
      }
      flushRun(); flushPaths();
      const cx = x0 + (i + .5) * (x1 - x0) / n;
      out += o.amp === 'none' ? inner : K.sway(cx, inner, o.amp);
    });
    return flush(out);
  };

  /* ---------- plant symbols ---------- */
  // Grass tuft (about 40 tall): back blades take the fill, front blades currentColor.
  const tuftSym = (v, heads) => sym(`tuft|${v}|${heads || ''}`, () => {
    const r = rnd(700 + v * 13); let back = '', front = '', hd = '';
    const n = 9 + (v % 3) * 2;
    for (let i = 0; i < n; i++) {
      const a = rr(r, -40, 40) * D, h = rr(r, 20, 44) * (1 - Math.abs(a) * .45), bx = rr(r, -7, 7), tx = bx + Math.sin(a) * h, ty = -Math.cos(a) * h, w = rr(r, 1.1, 2.1), qx = bx + Math.sin(a) * h * .2, qy = -h * .6;
      const d = `M${f1(bx - w)} 0Q${f1(qx)} ${f1(qy)} ${f1(tx)} ${f1(ty)}Q${f1(qx + w)} ${f1(qy)} ${f1(bx + w)} 0z`;
      if (i % 2) front += d; else back += d;
      if (heads && i % 3 === 0) hd += `M${f1(tx)} ${f1(ty)}l${f1(Math.sin(a) * 5)} -7`;
    }
    return `<path d="${back}"/><path fill="currentColor" d="${front}"/>` + (hd ? `<path fill="none" stroke="${heads}" stroke-width="2.6" stroke-dasharray="1.6 1.4" stroke-linecap="round" d="${hd}"/>` : '');
  });
  // Heather cushion (about 60 wide): the mound takes the fill, flower spikes currentColor.
  const heatherSym = (v, season) => sym(`heather|${v}|${season}`, () => {
    const r = rnd(500 + v * 29), p = K.pal(season), w = rr(r, 26, 34), h = rr(r, 10, 14);
    let stems = '', fl = '', hi = '';
    for (let j = 0; j < 16; j++) {
      const sx = rr(r, -w * .9, w * .9), sy = -h * (1 - (sx / w) ** 2) * rr(r, .5, 1), sh = rr(r, 9, 21), a = rr(r, -.35, .35) + sx / w * .35, ex = sx + Math.sin(a) * sh, ey = sy - Math.cos(a) * sh;
      stems += `M${f1(sx)} ${f1(sy)}L${f1(ex)} ${f1(ey)}`; fl += `M${f1(sx + (ex - sx) * .3)} ${f1(sy + (ey - sy) * .3)}L${f1(ex)} ${f1(ey)}`;
      if (j % 3 === 0) hi += `M${f1(ex)} ${f1(ey + 1)}l${f1(Math.sin(a) * -2)} 4`;
    }
    const mound = `M${-w} 1Q${f1(-w * .95)} ${f1(-h * 1.2)} ${f1(-w * .35)} ${f1(-h * 1.15)}Q0 ${f1(-h * 1.7)} ${f1(w * .4)} ${f1(-h * 1.2)}Q${f1(w * 1.05)} ${f1(-h * .9)} ${w} 1z`;
    return `<path d="${mound}"/><path fill="${p.heather[1]}" d="${blob(r, -w * .2, -h * .95, w * .55, h * .4, 7)}"/><path fill="none" stroke="${p.heather[2]}" stroke-width=".9" d="${stems}"/><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-dasharray="1 2" stroke-linecap="round" d="${fl}"/><path fill="none" stroke="#fff" stroke-width="1.4" opacity=".3" stroke-linecap="round" d="${hi}"/>`;
  });
  // Bracken frond (about 70 tall): stalk and pinnae take the fill, the lit pinnae currentColor.
  const frondSym = (v, season) => sym(`frond|${v}|${season}`, () => {
    const r = rnd(300 + v * 41), dir = v % 2 ? -1 : 1;
    if (season === 'spring' && v === 3) return `<path fill="none" stroke="currentColor" stroke-width="2.4" d="M0 0q3-26-1-34a6 6 0 1 1 8 4"/><path fill="none" stroke="currentColor" stroke-width="2" d="M6 0q-2-20 6-26a5 5 0 1 0-6-3"/>`;
    const h = rr(r, 58, 76), L = rr(r, 42, 60), ex = dir * L, ey = -h * .72;
    let a = '', b = '';
    for (let j = 1; j < 10; j++) {
      const t = j / 10, px = dir * L * (t * t * .85 + t * .15), py = -h * (1 - (1 - t) ** 2) * .95 + (t > .6 ? (t - .6) * h * .6 : 0), len = (1 - t * .75) * 17;
      const ang = Math.atan2(dir * L * (2 * t * .85 + .15), h * 2 * (1 - t) * .95);
      a += leafD(px, py, ang - 1.25 * dir, len, len * .2); b += leafD(px, py, ang + 1.25 * dir, len * .9, len * .2);
    }
    return `<path fill="none" stroke="${K.pal(season).bracken[0]}" stroke-width="1.8" d="M0 0Q${f1(dir * L * .1)} ${f1(-h)} ${f1(ex)} ${f1(ey)}"/><path d="${a}"/><path fill="currentColor" d="${b}"/>`;
  });
  // A reed clump (about 120 tall): strap leaves (fill), lit leaves (currentColor), bulrush heads or plumes.
  const reedSym = (v, season, kind) => sym(`reed|${v}|${season}|${kind}`, () => {
    const r = rnd(200 + v * 53), p = K.pal(season); let a = '', b = '', heads = '', stalks = '', plumes = '';
    for (let j = 0; j < 9; j++) {
      const h = rr(r, 60, 125), ang = rr(r, -.25, .25), bx = rr(r, -9, 9), tx = bx + Math.sin(ang) * h, ty = -Math.cos(ang) * h, bend = rr(r, -1, 1) * h * .22, w = rr(r, 1.6, 2.6);
      const d = `M${f1(bx - w)} 0Q${f1(bx + bend * .2)} ${f1(-h * .6)} ${f1(tx + bend)} ${f1(ty + h * .1)}Q${f1(bx + bend * .2 + w)} ${f1(-h * .6)} ${f1(bx + w)} 0z`;
      if (j % 2) b += d; else a += d;
      if (j < 3) {
        const sh = h * 1.12, sx = bx + Math.sin(ang * .5) * sh, sy = -Math.cos(ang * .5) * sh;
        stalks += `M${f1(bx)} 0L${f1(sx)} ${f1(sy)}`;
        if (kind === 'bulrush') heads += `M${f1(bx + (sx - bx) * .82)} ${f1(sy * .82)}L${f1(bx + (sx - bx) * .95)} ${f1(sy * .95)}`;
        else for (let q = 0; q < 5; q++) plumes += `M${f1(sx)} ${f1(sy)}q${f1((q - 2) * 3)} 4 ${f1((q - 2) * 4 + 7)} ${f1(14 + q * 2)}`;
      }
    }
    return `<path d="${a}"/><path fill="currentColor" d="${b}"/><path fill="none" stroke="${p.reed[1]}" stroke-width="1.4" d="${stalks}"/>` + (heads ? `<path fill="none" stroke="${p.reedHead[0]}" stroke-width="7" stroke-linecap="round" d="${heads}"/>` : '') + (plumes ? `<path fill="none" stroke="${p.plume[0]}" stroke-width="2" stroke-linecap="round" d="${plumes}"/>` : '');
  });
  // Wild flower kinds on stems (about 34 tall at k 1).
  const FL = {
    daisy: ['#fbfaf2', '#f2c53a', 3.4], buttercup: ['#f6cf22', '#fff09a', 3], campion: ['#e0679a', '#f7a8c8', 3.3], poppy: ['#d93a2a', '#2a1f22', 4.4],
    knapweed: ['#9b5aa8', '#c58ad0', 3], clover: ['#e8b3c7', '#fbe3ec', 2.8], dandelion: ['#f7c01e', '#ffe27a', 3.4], ragwort: ['#f2c21a', '#ffe070', 2.2],
    harebell: ['#8aa2e0'], bluebell: ['#5f6fd0'], foxglove: ['#c9559a'], cowparsley: ['#fbfbf2'], celandine: ['#f6d21e', '#fff1a0', 3], anemone: ['#fbf6f2', '#f0d060', 3],
  };
  const flowerSym = (kind, v) => sym(`flower|${kind}|${v}`, () => {
    const r = rnd(100 + v * 7 + kind.length * 31), c = FL[kind] || FL.daisy, stem = '#4f7a35';
    const tall = kind === 'foxglove' || kind === 'cowparsley' ? 1.9 : kind === 'bluebell' ? .6 : 1;
    let out = '';
    for (let i = 0; i < 3; i++) {
      const h = rr(r, 22, 36) * tall, lean = rr(r, -.25, .25), bx = rr(r, -6, 6), tx = bx + lean * h, ty = -h;
      if (kind === 'bluebell') { let bells = ''; for (let j = 0; j < 4; j++) bells += leafD(bx + h * .3 + j * 1.4, -h * .9 + j * 4, Math.PI * .92, 5.4, 2.4); out += `<path fill="none" stroke="${stem}" stroke-width="1.2" d="M${f1(bx)} 0q${f1(lean * h)} ${f1(-h * 1.2)} ${f1(h * .35)} ${f1(-h * .9)}"/><path fill="${c[0]}" d="${bells}"/>`; continue; }
      out += `<path fill="none" stroke="${stem}" stroke-width="1.2" d="M${f1(bx)} 0q${f1(lean * h * .2)} ${f1(-h * .5)} ${f1(tx - bx)} ${f1(ty)}"/>`;
      if (kind === 'harebell') out += `<path fill="${c[0]}" d="${leafD(tx, ty, Math.PI * .9, 7, 3)}"/>`;
      else if (kind === 'foxglove') { let d = ''; for (let j = 0; j < 7; j++) d += leafD(tx + 2, ty + j * 5, 2.2, 6.4 * (1 - j * .06), 2.6); out += `<path fill="${c[0]}" d="${d}"/>`; }
      else if (kind === 'cowparsley') { let d = ''; for (let j = 0; j < 7; j++) d += circ(tx + (j - 3) * 2.6, ty + Math.abs(j - 3) * 1.4, 1.4); out += `<path fill="${c[0]}" d="${d}"/>`; }
      else if (kind === 'ragwort') out += `<path fill="${c[0]}" d="${circ(tx - 3, ty, 2.2) + circ(tx + 3, ty - 1, 2.2) + circ(tx, ty - 3, 2.2)}"/>`;
      else { let pet = ''; for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; pet += leafD(tx, ty, a, c[2] * 1.3, c[2] * .55); } out += `<path fill="${c[0]}" d="${pet}"/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="${f1(c[2] * .38)}" fill="${c[1]}"/>`; }
    }
    return out;
  });

  /* ---------- grass, flowers, heather, bracken, reeds (bits for K.wind) ---------- */
  /** Band placement helper: n positions in a band, nearer (lower) ones larger (k0 at the back, k1 at the front). */
  const band = (o, n, fn) => { const r = rnd(o.seed || 1), span = Math.max(1, o.y1 - o.y0), k0 = o.k0 != null ? o.k0 : .4, k1 = o.k1 != null ? o.k1 : 1; for (let i = 0; i < N(n); i++) { const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1); fn(x, y, (k0 + (y - o.y0) / span * (k1 - k0)) * (o.s || 1), r, i); } };
  /**
   * Grass tufts across a band (symbols, cheap). o: {seed, x0, x1, y0, y1, n, k0, k1, s, season,
   * cols: [back, front], heads (seed heads in summer/autumn), z, haze, hazeCol}.
   */
  K.tufts = o => {
    const p = K.pal(o.season), c = (o.cols || [p.grass[1], p.grass[2]]).map(hz(o)), heads = o.heads === false ? '' : (o.heads || (o.season === 'summer' || o.season === 'autumn' ? p.dry[0] : '')), out = [];
    const ids = [0, 1, 2, 3].map(v => tuftSym(v, v % 2 ? heads : ''));
    band(o, o.n || 120, (x, y, k, r, i) => out.push({ x, y, z: o.z || 0, use: ids[i % 4], k: f2(k * rr(r, .8, 1.15)), fill: i % 3 ? c[0] : mix(c[0], '#0a1a10', .15), color: c[1] }));
    return out;
  };
  /**
   * Grass blades drawn one by one (for the very front, where each blade shows).
   * o: {seed, x0, x1, y0, y1, n (clumps), h, cols, clump, lean, k0, k1, heads, z, haze, hazeCol}.
   */
  K.blades = o => {
    const r = rnd(o.seed || 1), n = N(o.n || 40), out = [], cols = (o.cols || K.pal(o.season).grass).map(hz(o)), h = o.h || 60;
    const k0 = o.k0 != null ? o.k0 : .8, k1 = o.k1 != null ? o.k1 : 1.4, z = o.z || 0, span = Math.max(1, o.y1 - o.y0);
    for (let i = 0; i < n; i++) {
      const cx = rr(r, o.x0, o.x1), cy = rr(r, o.y0, o.y1), k = k0 + (cy - o.y0) / span * (k1 - k0), m0 = 3 + Math.floor(r() * (o.clump || 6)), m = LOD < 1 ? Math.ceil(m0 * .6) : m0;   // tiles: thinner clumps
      for (let j = 0; j < m; j++) {
        const hh = h * k * rr(r, .5, 1.15), a = (rr(r, -34, 34) + (o.lean || 0)) * D, bx = cx + rr(r, -7, 7) * k, w = 1.7 * k;
        const tx = bx + Math.sin(a) * hh, ty = cy - Math.cos(a) * hh, qx = bx + Math.sin(a) * hh * .15, qy = cy - hh * .62;
        out.push({ x: bx, z, fill: cols[Math.min(cols.length - 1, j % cols.length)], d: `M${R(bx - w)} ${R(cy)}Q${R(qx - w * .4)} ${R(qy)} ${R(tx)} ${R(ty)}Q${R(qx + w * .5)} ${R(qy)} ${R(bx + w)} ${R(cy)}z` });
        if (o.heads && r() < o.heads) out.push({ x: bx, z: z + .1, stroke: hz(o)(o.headCol || K.pal(o.season).dry[0]), w: f2(2.4 * k), dash: '2 2', d: `M${R(tx)} ${R(ty)}l${R(Math.sin(a) * 9 * k)} ${-R(9 * k)}` });
      }
    }
    return out;
  };
  /**
   * Wild flowers. o: {seed, x0, x1, y0, y1, n, kinds: daisy | buttercup | campion | poppy | knapweed |
   * clover | dandelion | ragwort | harebell | bluebell | foxglove | cowparsley | celandine | anemone, k0, k1, z}.
   */
  K.blooms = o => {
    const out = [], kinds = o.kinds || ['daisy', 'buttercup'];
    band(Object.assign({ k0: .35, k1: .9 }, o), o.n || 40, (x, y, k, r, i) => { const kind = kinds[i % kinds.length]; out.push({ x, y, z: o.z != null ? o.z : .5, use: flowerSym(kind, i % 3), k: f2(k * rr(r, .8, 1.2)) }); });
    return out;
  };
  /** Heather cushions: purple spikes in late summer, russet in autumn and winter, green tips in spring. o: band + {season}. */
  K.heatherBits = o => {
    const p = K.pal(o.season), base = p.heather.map(hz(o)), fl = p.bloomHeather.map(hz(o)), out = [];
    const ids = [0, 1, 2, 3].map(v => heatherSym(v, o.season || 'summer'));
    band(Object.assign({ k0: .35, k1: 1 }, o), o.n || 60, (x, y, k, r, i) => out.push({ x, y, z: o.z || 0, use: ids[i % 4], k: f2(k * rr(r, .8, 1.2)), fill: i % 4 ? base[0] : mix(base[0], '#000', .15), color: fl[i % 2] }));
    return out;
  };
  /** Bracken fronds (fiddleheads in spring, copper in autumn). o: band + {season}. */
  K.brackenBits = o => {
    const c = K.pal(o.season).bracken.map(hz(o)), out = [], ids = [0, 1, 2, 3].map(v => frondSym(v, o.season || 'summer'));
    band(Object.assign({ k0: .5, k1: 1.2 }, o), o.n || 20, (x, y, k, r, i) => out.push({ x, y, z: o.z || 0, use: ids[Math.floor(r() * 4)], k: f2(k * rr(r, .85, 1.2)), fill: c[0], color: c[i % 2 ? 1 : 2] }));
    return out;
  };
  /** Reeds at a water margin: strap leaves, bulrushes and reed plumes. o: band + {season, kinds: ['bulrush', 'plume']}. */
  K.reedBits = o => {
    const c = K.pal(o.season).reed.map(hz(o)), out = [], kinds = o.kinds || ['bulrush', 'plume'], ids = [0, 1, 2].map(v => reedSym(v, o.season || 'summer', kinds[v % kinds.length]));
    band(Object.assign({ k0: .55, k1: 1.1 }, o), o.n || 16, (x, y, k, r, i) => out.push({ x, y, z: o.z || 0, use: ids[i % 3], k: f2(k * rr(r, .85, 1.2)), fill: c[0], color: c[1 + (i % 2)] }));
    return out;
  };
  /** Ready-made swaying bands: grass, meadow (grass and flowers), heath, bracken, reeds. */
  K.grass = o => K.wind(K.tufts(o), o);
  K.meadow = o => K.wind(K.tufts(o).concat(K.blooms(Object.assign({}, o, { seed: (o.seed || 1) + 7, n: o.flowers || 30, z: .5 }))), o);
  K.heath = o => K.wind(K.heatherBits(o).concat(o.grass === 0 ? [] : K.tufts(Object.assign({}, o, { seed: (o.seed || 1) + 3, n: o.grass || Math.round((o.n || 60) * .4), z: 0 }))), Object.assign({ amp: 'soft' }, o));
  K.bracken = o => K.wind(K.brackenBits(o), Object.assign({ amp: 'soft' }, o));
  K.reeds = o => K.wind(K.reedBits(o), Object.assign({ amp: 'soft', strips: 6 }, o));
  /**
   * A carpet of low growth running back to the horizon: rows of overlapping cushions, small and
   * flat far away, large in front, each with a lit cap and a texture of flower spikes (heather),
   * grass blades or nothing. Static and dense: lay it first, then swaying plants over it.
   * o: {seed, x0, x1, y0 (back row), y1 (front row), rows (12), lobe: [far, near] cushion width,
   * hump (height / width, .34), cols (row fills, cycled: shade to light), lit (cap colour), dots
   * (texture colours; none: plain), texture: 'beads' (heather, ling) | 'blades' (grass) | 'tufts'
   * (rush, sedge), density (texture marks per cushion, 6), base (a fill under it all), haze}.
   * Heather: K.carpet({cols: K.pal(s).heather, dots: K.pal(s).bloomHeather, lit: K.pal(s).heather[2]}).
   */
  // One cushion (100 wide): the body takes the fill, a soft lit cap, texture marks in currentColor
  // and the inherited stroke (two texture colours). far: bolder, fewer marks (they are drawn small).
  // The body is two or three overlapping irregular lobes (never a regular dome); texture marks are
  // scattered over the whole upper body at mixed heights and leans (not along the rim, which read
  // as a dotted scallop), with a few lighter sprigs standing proud of the outline.
  const cushSym = (tex, dens, v, hump, far) => sym(`cush|${tex}|${dens}|${v}|${hump}|${far ? 1 : 0}`, () => {
    const r = rnd(300 + v * 31 + dens * 7 + (far ? 5 : 0)), w = 100, h = hump * 100, m = ['', ''], n = ND(far ? Math.ceil(dens * .8) : dens * 2);
    const lobes = 2 + (v % 2), lb = [];
    for (let i = 0; i < lobes; i++) { const cx = (i / Math.max(1, lobes - 1) - .5) * w * rr(r, .35, .6), lw = w * rr(r, .3, .48), lh = h * rr(r, .45, .7) * (i === 1 ? 1.15 : 1); lb.push([cx, -lh * .7, lw, lh]); }
    const body = lb.map(([cx, cy, lw, lh]) => lobed(r, cx, cy, lw, lh, 9, .22)).join('');
    const top = x => { let t = 0; for (const [cx, cy, lw, lh] of lb) { const u = (x - cx) / lw; if (Math.abs(u) < 1) t = Math.min(t, cy - Math.sqrt(1 - u * u) * lh); } return t; };
    for (let j = 0; j < n; j++) {
      const a = rr(r, -.92, .92), mx = a * w * .5, t0 = top(mx), my = t0 + rr(r, 1, Math.max(3, -t0 * .8)), k = (far ? 1.5 : 1) * rr(r, .6, 1.3), lean = rr(r, -.5, .5) + a * .4;
      m[r() < .45 ? 0 : 1] += tex === 'beads' ? `M${R(mx)} ${R(my)}l${R(lean * 6 * k)} ${-R(rr(r, 6, 15) * k)}` : tex === 'blades' ? `M${R(mx)} ${R(my + h * .15)}q${R(lean * 6)} ${-R(10 * k)} ${R(lean * 14 + rr(r, -3, 3))} ${-R(rr(r, 14, 26) * k)}` : `M${R(mx)} ${R(my + h * .1)}l${R(lean * 12)} ${-R(rr(r, 12, 22) * k)}`;
    }
    const sw = tex === 'beads' ? (far ? 5 : 3.2) : far ? 3 : 1.8, dash = tex === 'beads' ? ` stroke-dasharray="${f2(sw * .6)} ${f2(sw * .7)}"` : '';
    const [hx0, hy0, hw, hh] = lb[Math.floor(r() * lb.length)];
    return `<path stroke="none" d="${body}"/><path fill="#000" stroke="none" opacity=".12" d="${lobed(r, 0, -h * .08, w * .5, h * .18, 8, .2)}"/><path fill="#fff" stroke="none" opacity=".12" d="${lobed(r, hx0 - hw * .2, hy0 - hh * .45, hw * .55, hh * .35, 7, .3)}"/>` +
      `<path fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round"${dash} d="${m[0]}"/><path fill="none" stroke-width="${sw}" stroke-linecap="round"${dash} d="${m[1]}"/>`;
  });
  K.carpet = o => {
    const r = rnd(o.seed || 31), rows = N(o.rows || 12), x0 = o.x0 != null ? o.x0 : -160, x1 = o.x1 != null ? o.x1 : 1760, cols = (o.cols || K.pal(o.season).grass).map(hz(o)), dots = (o.dots || []).map(hz(o)), [l0, l1] = o.lobe || [20, 90];
    const tex = dots.length ? o.texture || 'beads' : 'none', dens = o.density || 6, hump = o.hump || .34;
    let out = o.base ? P(hz(o)(o.base), `M${x0} ${R(o.y1 + l1 * .3)}V${R(o.y0)}H${x1}V${R(o.y1 + l1 * .3)}z`) : '';
    // seeded irregular scatter: each row band is filled with cushions of very mixed size and height,
    // jittered across the band (overlapping the rows either side), with clumps, tight overlaps and
    // the odd gap, so no row of identical scallops reads across the ground
    const yAt = t => o.y0 + (o.y1 - o.y0) * Math.pow(clamp(t, 0, 1), 1.3);
    for (let i = 0; i < rows; i++) {
      const t = rows < 2 ? 1 : i / (rows - 1), y = yAt(t), lw = l0 + (l1 - l0) * t, far = lw < 34, uses = ['', ''], items = [];
      const band = rows < 2 ? 0 : (yAt(t + 1 / (rows - 1)) - yAt(t - 1 / (rows - 1))) * .38;
      const ids = (LOD < 1 ? [0, 1, 2] : [0, 1, 2, 3, 4, 5]).map(v => cushSym(tex, dens, v, hump, far));
      for (let x = x0 + rr(r, -lw, 0); x < x1 + lw;) {
        const big = r() < .14, w = lw * (big ? rr(r, 1.3, 2) : rr(r, .45, 1.2)), k = w / 100, ky = k * rr(r, .7, 1.35) * (big ? .9 : 1), side = r() < .5 ? 0 : 1;
        items.push([y + rr(r, -band, band), side, ids[Math.floor(r() * ids.length)], x, r() < .5 ? -k : k, ky]);
        const gap = r() < .07 ? rr(r, .7, 1.4) : r() < .3 ? rr(r, .12, .3) : rr(r, .3, .7);
        x += w * gap * (LOD < 1 ? 2.2 : 1);
      }
      items.sort((a, b) => a[0] - b[0]);
      for (const [yy, side, id, xx, sx, sy] of items) uses[side] += useT(id, xx, yy, sx, sy);
      const dc = dots.length ? [dots[i % dots.length], dots[(i + 1) % dots.length]] : ['none', 'none'];
      uses.forEach((u, j) => { if (u) out += `<g fill="${cols[(i * 2 + j) % cols.length]}" color="${dc[0]}" stroke="${dc[1]}">${u}</g>`; });
    }
    return flush(out);
  };
  /** A dense grass sward (a carpet of cushions textured with blades): K.carpet with grass defaults. */
  K.turf = o => K.carpet(Object.assign({ texture: 'blades', hump: .22, density: 7, cols: K.pal(o.season).grass.slice(0, 3), dots: K.pal(o.season).grass.slice(1), lit: K.pal(o.season).grass[3] }, o));
  /** Heather heath as a carpet (purple spikes in late summer, russet in autumn and winter, green in spring). */
  K.heathCarpet = o => { const p = K.pal(o.season); return K.carpet(Object.assign({ texture: 'beads', cols: p.heather, dots: p.bloomHeather, lit: p.heather[2], density: o.season === 'summer' ? 9 : 5 }, o)); };

  /* ---------- gorse, fern, bluebell carpets, lilies, logs, stones ---------- */
  /** A gorse bush: spiny mound with yellow flowers (most in spring, few in winter). */
  K.gorse = (x, y, s, o = {}) => {
    const r = rnd(o.seed || R(x * 3 + y)), p = K.pal(o.season), c = p.gorse.map(hz(o)), fc = p.gorseFlower.map(hz(o));
    const w = 110, h = 80; let edge = `M${-w} 0`;
    for (let i = 0; i <= 26; i++) { const t = i / 26, a = Math.PI * (1 - t), rad = 1 + Math.sin(t * Math.PI * 3 + r()) * .08, bx = Math.cos(a) * w * rad, by = -Math.sin(a) * h * rad * (1 + .25 * Math.sin(t * 7)); edge += `L${R(bx + rr(r, -5, 5))} ${R(by - rr(r, 4, 12))}L${R(bx * .97)} ${R(by * .95)}`; }
    edge += 'z';
    let spines = '', light = '', fl = '';
    // flower sprays: drawn once per scene and season, placed over the bush
    const spray = sym(`gorseFl|${o.season || 'summer'}|${o.haze || 0}`, () => { const q = rnd(77), d = ['', '', '']; for (let i = 0; i < 9; i++) d[i % 3] += circ(rr(q, -11, 11), rr(q, -8, 8), rr(q, 2.6, 4.2)); return d.map((x, i) => P(fc[i % fc.length], x)).join(''); });
    for (let i = 0; i < N(40); i++) { const a = rr(r, .1, Math.PI - .1), d = rr(r, .3, .95), sx = Math.cos(a) * w * d, sy = -Math.sin(a) * h * d; spines += `M${R(sx)} ${R(sy)}l${R(Math.cos(a) * 9)} ${R(-Math.sin(a) * 9 - 3)}`; if (sy < -h * .4) light += circ(sx - 6, sy - 4, rr(r, 8, 15)); }
    const nf = N(Math.round(24 * (o.bloom != null ? o.bloom : p.gorseBloom)));
    for (let i = 0; i < nf; i++) { const a = rr(r, .1, Math.PI - .1), d = Math.sqrt(r()) * .9, fx = Math.cos(a) * w * d, fy = -Math.sin(a) * h * d - 3; fl += use(spray, fx, fy, f2(rr(r, .8, 1.25))); }
    const body = P(c[0], edge) + P(c[1], light) + S(c[2], 1.6, spines) + fl + (o.season === 'winter' && o.frost !== false ? S('#f2f6f4', 3, `M${-w * .7} ${-h * .8}Q0 ${-h * 1.25} ${w * .7} ${-h * .8}`, ' opacity=".55"') : '');
    return flush(at(x, y, s, `<ellipse cy="4" rx="${w}" ry="10" fill="#1f2d22" opacity=".2"/>` + (o.still ? body : K.sway(x, body, 'tree')), o.flip));
  };
  /** A fern rosette: arching fronds of paired pinnae (bronze in autumn). */
  K.fern = (x, y, s, o = {}) => {
    const r = rnd(o.seed || R(x + y * 7)), c = (o.season === 'autumn' ? ['#8a5a2a', '#b07a3a'] : o.season === 'winter' ? ['#6a5a40', '#857250'] : o.season === 'spring' ? ['#5f9a3a', '#9cc860'] : ['#3d7a3a', '#6aa850']).map(hz(o));
    let d0 = '', d1 = '', st = '';
    const fr = LOD < 1 ? Math.min(5, o.fronds || 7) : o.fronds || 7;
    for (let i = 0; i < fr; i++) {
      const a = (-70 + i * 140 / (fr - 1) + rr(r, -8, 8)) * D, L = rr(r, 70, 110), ex = Math.sin(a) * L, ey = -Math.cos(a) * L * .9, cx = Math.sin(a) * L * .3, cy = -L * .95;
      st += `M0 0Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}`;
      for (let j = 1; j < 11; j += LOD < 1 ? 2 : 1) { const t = j / 11, bx = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * cx + t * t * ex, by = 2 * (1 - t) * t * cy + t * t * ey, len = (1 - t) * 18 + 3, ang = Math.atan2(ex - cx, -(ey - cy));
        const pd = leafD(bx, by, ang - 1.1, len, len * .28) + leafD(bx, by, ang + 1.1, len, len * .28); if (j % 2) d0 += pd; else d1 += pd; }
    }
    const body = S(c[0], 2, st) + P(c[0], d0) + P(c[1], d1);
    return at(x, y, s, o.still ? body : K.sway(x, body, 'soft'), o.flip);
  };
  /** A carpet of bluebells under trees (spring): a violet haze and nodding stems. */
  K.bluebells = o => {
    const r = rnd(o.seed || 6); let haze = '';
    for (let i = 0; i < N(o.patches || 12); i++) haze += ell(rr(r, o.x0, o.x1), rr(r, o.y0, o.y1), rr(r, 60, 160), rr(r, 8, 22));
    return P(hz(o)('#7a78c8'), haze, ' opacity=".45"') + K.wind(K.blooms(Object.assign({ kinds: ['bluebell'], stem: '#4f7a45', h: 30 }, o, { seed: (o.seed || 6) + 1 })), Object.assign({ amp: 'soft' }, o));
  };
  /** Water lily pads (and flowers in summer), bobbing gently. o: {seed, x0, x1, y0, y1, n, flowers 0..1, season}. */
  K.lilies = o => {
    const r = rnd(o.seed || 7), n = N(o.n || 12), span = Math.max(1, o.y1 - o.y0), cols = (o.season === 'autumn' ? ['#6a6a2a', '#8a7a3a'] : o.season === 'winter' ? ['#5a5a3a', '#6a6a48'] : ['#2f6a44', '#4f8a50']).map(hz(o));
    const g = ['', ''];
    for (let i = 0; i < n; i++) {
      const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1), k = .5 + (y - o.y0) / span * .7, rx = rr(r, 14, 24) * k, ry = rx * .36, a = rr(r, -.5, .5);
      let s = `<path fill="${cols[i % 2]}" d="M${R(x)} ${R(y)}l${R(Math.cos(a) * rx)} ${R(Math.sin(a) * ry)}A${R(rx)} ${R(ry)} 0 1 1 ${R(x + Math.cos(a + .5) * rx)} ${R(y + Math.sin(a + .5) * ry)}z"/><path fill="none" stroke="#9cc88a" stroke-width="1" opacity=".5" d="M${R(x - rx * .6)} ${R(y - ry * .2)}q${R(rx * .6)} ${-R(ry * .4)} ${R(rx * 1.2)} 0"/>`;
      if (o.season === 'summer' && r() < (o.flowers != null ? o.flowers : .35)) s += `<path fill="${r() < .7 ? '#fbf8f0' : '#f4c2d2'}" d="M${R(x - 7 * k)} ${R(y - 2 * k)}l${R(2 * k)} ${-R(9 * k)} ${R(3 * k)} ${R(5 * k)} ${R(2 * k)} ${-R(8 * k)} ${R(2 * k)} ${R(8 * k)} ${R(3 * k)} ${-R(5 * k)} ${R(2 * k)} ${R(9 * k)}z"/><circle cx="${R(x)}" cy="${R(y - 3 * k)}" r="${f2(1.8 * k)}" fill="#f2c94a"/>`;
      g[i % 2] += s;
    }
    return g.map((s, i) => s ? M('bob', { ad: sec(5 + i * 1.3), d: sec(-i * 2), dy: '1.5px' }, s) : '').join('');
  };
  /** A fallen log with moss, fungi in autumn and frost in winter. */
  K.log = (x, y, s, o = {}) => {
    // a fallen trunk lying slightly askew: tapering, rounded by light (pale top, dark underside),
    // furrowed bark along its length, a sawn end with growth rings, a splintered far end, branch
    // stubs, moss along the top, bracket fungi and grass tucked against it
    const h = hz(o), win = o.season === 'winter', aut = o.season === 'autumn';
    const bark = h('#62504a'), dark = h('#2e2420'), lit = h('#a08a76'), wood = h('#c8a878'), ring = h('#9a7a54');
    const moss = h(win ? '#6e7a5e' : aut ? '#5e6e30' : '#4e7a30'), mossLit = h(win ? '#9aa88a' : aut ? '#7e8e3e' : '#6e9a3e');
    const body = 'M-138-6Q-142-30-124-36L-60-42 40-46 118-44Q136-40 136-14 134 4 116 6L-40 6-128 4Q-138 2-138-6z';
    let g = `<ellipse cx="-4" cy="5" rx="150" ry="9" fill="#1f241c" opacity=".3"/>` + P(bark, body);
    g += P(lit, 'M-124-36L-60-42 40-46 118-44Q130-41 133-30L40-34-60-30-128-24Q-132-32-124-36z', ' opacity=".55"');
    g += P(dark, 'M-136 0L-40-2 116 0Q130-2 135-10L134-4Q130 6 116 6L-40 6-128 4Q-137 3-136 0z', ' opacity=".7"');
    g += S(dark, 1.6, 'M-110-28Q-40-34 30-36T110-34M-118-16Q-30-22 60-22T120-20M-100-6Q0-10 100-8M-70-34q40-4 90-6', ' opacity=".55"');
    g += S(lit, 1, 'M-90-22q60-6 120-6M-50-12q70-4 140-2', ' opacity=".5"');
    // sawn end with rings, splintered far end
    g += `<ellipse cx="124" cy="-19" rx="11" ry="25" fill="${bark}"/><ellipse cx="125" cy="-19" rx="9" ry="22" fill="${wood}"/>` + S(ring, 1, 'M125-35a5 16 0 1 0 1 0M125-27a2.6 8 0 1 0 1 0', ' opacity=".8"') + S(dark, 1, 'M125-19l5-14M125-19l-4 15', ' opacity=".4"');
    g += P(h('#7a6248'), 'M-128-30l-14 4 8 3-12 6 12 1-8 8 14-2z');
    // branch stubs
    g += P(bark, 'M-40-40l-10-22 8-2 10 22z') + `<ellipse cx="-46" cy="-62" rx="4.4" ry="2.4" fill="${wood}" transform="rotate(-20 -46 -62)"/>` + P(bark, 'M66-12l26 16-4 6-26-14z');
    // moss over the top and down the near side
    { let m = '', ml = ''; for (const [cx, w] of [[-96, 26], [-52, 34], [6, 22], [58, 30], [100, 16]]) { const cy = -38 - (cx + 140) * .03; m += ell(cx, cy + 2, w, 5); ml += ell(cx - w * .2, cy, w * .5, 2.4); } g += P(moss, m, ' opacity=".9"') + P(mossLit, ml, ' opacity=".8"'); }
    // bracket fungi on the side; autumn: toadstools at the foot
    g += P(h('#c9a77a'), 'M-20-16q10-6 18 0l-2 3q-8-3-14 0zM-8-8q9-5 16 0l-2 3q-7-3-12 0z') + S(h('#8a6a48'), .8, 'M-20-16q10-5 18 0M-8-8q9-4 16 0', ' opacity=".7"');
    if (aut) g += `<path fill="#c96a3a" d="M-74-2q8-12 17 0zM-58-1q6-9 12 0zM30 2q8-12 17 0z"/><path stroke="#efe0c8" stroke-width="3" d="M-65-2v7M-52-1v6M39 2v7"/>`;
    if (win) g += S('#f4f8f8', 4, 'M-124-35Q-40-44 40-47T120-44', ' opacity=".85"');
    // grass tucked against the near side so it sits in the ground
    g += S(h(win ? '#8a8a6a' : aut ? '#a49a5a' : '#6a9a3a'), 1.6, 'M-126 6l-4-12M-118 6l2-14M-104 6l-6-10M-60 6l-3-13M-52 6l4-11M10 6l-2-12M18 6l5-10M76 6l-4-13M84 6l3-9M108 6l-2-11');
    return at(x, y, s, g, o.flip);
  };
  /** Pebbles and rocks scattered in a band (static). o: {seed, x0, x1, y0, y1, n, cols}. */
  K.stones = o => {
    const r = rnd(o.seed || 8), n = N(o.n || 20), cols = (o.cols || ['#8a8478', '#aaa294', '#cfc8b8']).map(hz(o)), span = Math.max(1, o.y1 - o.y0); const d = ['', '', ''];
    for (let i = 0; i < n; i++) { const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1), k = (.4 + (y - o.y0) / span * .8) * (o.s || 1), w = rr(r, 4, 13) * k, h = w * rr(r, .45, .7); d[0] += ell(x, y, w, h); d[1] += ell(x - w * .15, y - h * .25, w * .75, h * .55); d[2] += ell(x - w * .35, y - h * .45, w * .3, h * .2); }
    return d.map((x, i) => P(cols[i], x)).join('');
  };
  /** Ground texture: dots and short strokes, larger at the front. o: {seed, x0, x1, y0, y1, n, cols}. */
  K.speckle = o => {
    const r = rnd(o.seed || 9), n = N(o.n || 120), cols = (o.cols || ['#6f5c42', '#c8b48a']).map(hz(o)), span = Math.max(1, o.y1 - o.y0), d = cols.map(() => '');
    for (let i = 0; i < n; i++) { const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1), k = .4 + (y - o.y0) / span, c = i % cols.length; d[c] += r() < .5 ? `M${R(x)} ${R(y)}h${R(rr(r, 3, 9) * k)}` : `M${R(x)} ${R(y)}l${R(2 * k)} ${-R(2 * k)}`; }
    return d.map((x, i) => S(cols[i], f2((o.w || 2)), x, o.op ? ` opacity="${o.op}"` : '')).join('');
  };
  /**
   * A worn path or track through the scene from a centre line of points [[x, y, width], ...]
   * (far end first). Adds ruts, pebbles, crossing roots and sky puddles.
   * o: {pts, seed, cols: [edge, base, light], stones, roots, puddles, sky, season}.
   */
  K.track = o => {
    const r = rnd(o.seed || 10), pts = o.pts, c = (o.cols || K.pal(o.season).ground).map(hz(o));
    const side = (sgn, k) => pts.map(([x, y, w], i) => { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [x + sgn * (-dy / L) * w * k / 2, y + sgn * (dx / L) * w * k / 2]; });
    const smooth = a => { let d = `M${R(a[0][0])} ${R(a[0][1])}`; for (let i = 1; i < a.length; i++) { const p0 = a[Math.max(0, i - 2)], p1 = a[i - 1], p2 = a[i], p3 = a[Math.min(a.length - 1, i + 1)]; d += `C${R(p1[0] + (p2[0] - p0[0]) / 6)} ${R(p1[1] + (p2[1] - p0[1]) / 6)} ${R(p2[0] - (p3[0] - p1[0]) / 6)} ${R(p2[1] - (p3[1] - p1[1]) / 6)} ${R(p2[0])} ${R(p2[1])}`; } return d; };
    const outline = (k) => { const L = side(-1, k), Rr = side(1, k).reverse(); return smooth(L) + 'L' + smooth(Rr).slice(1) + 'z'; };
    let out = P(c[0], outline(1.12)) + P(c[1], outline(1)) + P(c[2], outline(.55), ' opacity=".55"');
    out += S(mix(c[0], '#000', .15), 2, smooth(side(-1, .32)) + smooth(side(1, .32)), ' opacity=".35"');
    let st = ['', ''];
    const along = (t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
    for (let i = 0; i < N(o.stones != null ? o.stones : 40); i++) { const [x, y, w] = along(r()), k = w / 160, sx = x + rr(r, -.5, .5) * w * .95, sw = rr(r, 3, 8) * k * 1.6; st[0] += ell(sx, y, sw, sw * .55); st[1] += ell(sx - sw * .2, y - sw * .2, sw * .5, sw * .25); }
    out += P(hz(o)('#8c8072'), st[0]) + P(hz(o)('#d8cdb8'), st[1]);
    let roots = '';
    for (let i = 0; i < (o.roots || 0); i++) { const [x, y, w] = along(rr(r, .45, 1)), sgn = r() < .5 ? -1 : 1; roots += `M${R(x + sgn * w * .7)} ${R(y + 4)}q${R(-sgn * w * .3)} ${R(-6 * w / 160)} ${R(-sgn * w * .55)} ${R(w * .04)}t${R(-sgn * w * .3)} ${R(-w * .03)}`; }
    out += S(hz(o)('#5a4232'), 5, roots) + S(hz(o)('#8a6a4a'), 2, roots);
    for (let i = 0; i < (o.puddles || 0); i++) { const [x, y, w] = along(rr(r, .5, .95)), k = w / 160, px = x + rr(r, -.25, .25) * w; out += `<ellipse cx="${R(px)}" cy="${R(y)}" rx="${R(w * .22)}" ry="${R(8 * k)}" fill="${mix(c[0], '#2a3a40', .4)}"/><ellipse cx="${R(px)}" cy="${R(y - k)}" rx="${R(w * .2)}" ry="${R(6.5 * k)}" fill="${o.sky || '#a9cde0'}" opacity=".85"/>` + S('#ffffff', f2(1.5 * k), `M${R(px - w * .12)} ${R(y - 2 * k)}h${R(w * .1)}`, ' opacity=".7"') + K.ripples(px + w * .05, y, { rx: w * .06, ry: 2.5 * k, n: 2, dur: 5, d: i * 2.2 }); }
    return out;
  };
  /** Land with a gradient and speckled texture. o: {d, top, bottom, y0, y1, seed, speckle, cols}. */
  K.land = o => {
    const g = U(), clip = U();
    return `<defs>${linU(g, [[0, o.top], [1, o.bottom || o.top]], 0, o.y0, 0, o.y1)}<clipPath id="${clip}"><path d="${o.d}"/></clipPath></defs><path fill="url(#${g})" d="${o.d}"/>` +
      (o.speckle ? `<g clip-path="url(#${clip})">${K.speckle({ seed: o.seed, x0: -160, x1: 1760, y0: o.y0, y1: o.y1, n: o.speckle, cols: o.cols || [mix(o.bottom || o.top, '#000', .2), mix(o.top, '#fff', .25)] })}</g>` : '');
  };

  /* ---------- trees ---------- */
  // Species: trunk height th and base width tw (local units, about 400 tall at s = 1), limbs
  // ([angle, length, where on the trunk]) or `along` ([from, to, count, minAngle, maxAngle]),
  // the branching (depth, kids, spread, length and width factors, droop) and the leaf clusters.
  const SPEC = {
    oak: { th: 120, tw: 34, L: 150, limbs: [[-64, .82, 1], [-32, 1, 1], [2, 1.05, 1], [34, .98, 1], [66, .84, 1], [-84, .55, .72], [84, .5, .66]], depth: 3, kids: [2, 3], spread: 30, lk: .66, wk: .6, droop: 5, clump: [34, 50], unit: 40, gaps: .3, bark: ['#5d4c3c', '#3b2f26', '#8c7862'] },
    birch: { th: 430, tw: 16, L: 84, along: [.3, .97, 16, 22, 48], depth: 2, kids: [2, 3], spread: 20, lk: .6, wk: .5, droop: 30, clump: [20, 28], unit: 30, fill: [.35, .7], taper: true, bark: ['#ece9df', '#8f8d86', '#ffffff'], white: true },
    pine: { th: 410, tw: 20, L: 96, along: [.6, .98, 10, 66, 98], depth: 2, kids: [2, 3], spread: 24, lk: .55, wk: .55, droop: -4, clump: [30, 40], unit: 34, plate: true, ever: true, bark: ['#a65a3a', '#6a3a2c', '#d79060'] },
    willow: { th: 140, tw: 38, L: 140, limbs: [[-56, .9, 1], [-26, 1, 1], [4, 1.05, 1], [30, 1, 1], [58, .9, 1]], depth: 2, kids: [2, 3], spread: 30, lk: .72, wk: .6, droop: 6, clump: [32, 44], unit: 40, weep: true, bark: ['#6c5f4a', '#463c2e', '#92836a'] },
    alder: { th: 320, tw: 19, L: 100, along: [.25, .98, 12, 34, 54], depth: 2, kids: [2, 3], spread: 26, lk: .6, wk: .55, droop: 3, clump: [24, 32], unit: 40, fill: [.5], cone: true, bark: ['#4f4a44', '#33302c', '#7a736b'] },
    hawthorn: { th: 80, tw: 22, L: 85, limbs: [[-62, .9, 1], [-28, 1, 1], [8, 1, 1], [40, .95, 1], [70, .7, 1]], depth: 3, kids: [2, 3], spread: 34, lk: .66, wk: .6, droop: 8, clump: [22, 30], unit: 40, blossom: true, bark: ['#5a4a3e', '#3a2f28', '#7f6c5c'] },
  };
  K.SPECIES = Object.keys(SPEC);
  // Foliage clusters, about 80 units across (unit radius 40). The shape takes the fill (its tone in
  // the crown); a rim-lit crescent on the upper left and a few lit leaves take currentColor (the next
  // tone up); a few shadowed leaves sit low on the right. Mirror a tree (negative scale) for light
  // from the right. The crown, not the cluster, does the big shading: K.tree picks each cluster's
  // tone from where it sits against the light, so the crown reads as one lit mass.
  const clumpSym = (kind, v0, snow) => { const v = LOD < 1 ? v0 % 2 : v0; return clumpSym1(kind, v, snow); };   // tiles: two cluster shapes a kind, not three
  const clumpSym1 = (kind, v, snow) => sym(`clump|${kind}|${v}|${snow ? 1 : 0}`, () => {
    const r = rnd(900 + v * 17 + kind.length * 131);
    const edgeLeaves = (n, rx, ry, L0, L1, from, to, out) => { let d = ''; for (let i = 0; i < n; i++) { const a = rr(r, from, to), L = rr(r, L0, L1), k = rr(r, .82, 1); d += leafD(Math.sin(a) * rx * k, -Math.cos(a) * ry * k, a + rr(r, -.45, .45) + (out ? 0 : Math.PI), L, L * .36); } return d; };
    if (kind === 'pine') {
      // a Scots pine plate: a broad, flat-topped mass of needle tufts, dark beneath
      let top = '', tuft = '', under = '';
      for (let i = 0; i < 5; i++) top += ell(-36 + i * 18 + rr(r, -4, 4), -4 - Math.sin((i + .5) / 5 * Math.PI) * 9 + rr(r, -2, 2), rr(r, 16, 22), rr(r, 9, 13));
      for (let i = 0; i < 18; i += LOD < 1 ? 2 : 1) { const x = -54 + i * 6.3 + rr(r, -2, 2), y = -2 - Math.sqrt(Math.max(0, 1 - (x / 58) ** 2)) * 18 + rr(r, -2, 3); tuft += `M${f1(x)} ${f1(y)}l${f1(rr(r, -6, -2))} ${f1(rr(r, -8, -4))}M${f1(x)} ${f1(y)}l${f1(rr(r, -1, 1))} ${f1(rr(r, -9, -5))}M${f1(x)} ${f1(y)}l${f1(rr(r, 2, 6))} ${f1(rr(r, -8, -4))}`; }
      for (let i = 0; i < 12; i++) { const x = -50 + i * 9 + rr(r, -3, 3); under += `M${f1(x)} ${f1(8 + rr(r, 0, 4))}l${f1(rr(r, -3, 3))} ${f1(rr(r, 5, 9))}`; }
      return `<path d="${blob(r, 0, 2, 60, 17, 16)}"/><path d="${top}"/><path fill="none" stroke-width="2" stroke="#000" opacity=".22" d="${under}"/><path fill="currentColor" d="${blob(r, -10, -9, 40, 9, 11)}"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="${tuft}"/>` + (snow ? `<path fill="#fbfdff" opacity=".9" d="${blob(r, -6, -15, 36, 4, 10)}"/>` : '');
    }
    if (kind === 'birch') {
      // airy: a loose spray of small leaves round a thin core, lit leaves on the upper left
      let a = '', b = '', c = '';
      for (let i = 0; i < ND(30); i++) { const ang = rr(r, 0, 6.28), d = Math.sqrt(r()) * 36, x = Math.cos(ang) * d, y = Math.sin(ang) * d * .8 + 6, L = rr(r, 7, 11); const lf = leafD(x, y, rr(r, 2.4, 3.9), L, L * .45); if (x + y < -6 && r() < .8) b += lf; else if (x + y > 14 && r() < .4) c += lf; else a += lf; }
      return `<path d="${blob(r, 2, 8, 22, 17, 9)}"/><path d="${a}"/><path fill="currentColor" d="${b}"/><path fill="#000" opacity=".16" d="${c}"/>` + (snow ? `<path fill="#fbfdff" d="${blob(r, -6, -10, 18, 5, 8)}"/>` : '');
    }
    const n = kind === 'willow' ? 10 : 12, sq = kind === 'willow' ? 1.12 : .9;
    // irregular, flat-bottomed masses (oak and hawthorn the most ragged), never a round ball
    const rg = kind === 'oak' || kind === 'hawthorn' ? .34 : .2;
    const body = lobed(r, 2, 3, 37, 37 * sq, n + 4, rg), bodyL = edgeLeaves(ND(16), 37, 37 * sq, 9, 13, -3.1, 3.1, true);
    const rim = lobed(r, -6, -7, 34, 33 * sq, n + 2, rg), rimL = edgeLeaves(ND(7), 36, 36 * sq, 9, 12, -2.6, -.3, true);
    const lit = edgeLeaves(ND(6), 24, 22 * sq, 7, 10, -2.4, -.5, true), dark = LOD < 1 ? '' : edgeLeaves(6, 22, 20 * sq, 7, 10, .5, 2.6, false);
    // the crescent: the lit shape first, the body over it shifted down-right, so a lit rim shows top-left
    return `<path fill="currentColor" d="${rim}"/><path fill="currentColor" d="${rimL}"/><path d="${body}"/><path d="${bodyL}"/><path fill="currentColor" opacity=".8" d="${lit}"/><path fill="#000" opacity=".14" d="${dark}"/>` + (snow ? `<path fill="#fbfdff" opacity=".92" d="${blob(r, -6, -27, 27, 8, 9)}"/>` : '');
  });
  K.clumpSym = clumpSym;
  const skeleton = (sp, r, winter) => {
    const segs = [], tips = [], lean = rr(r, -14, 14), th = sp.th * rr(r, .9, 1.1);
    const grow = (x, y, ang, len, w, depth) => {
      const a = ang * D, x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len, bend = rr(r, -.14, .14) * len;
      segs.push([x, y, (x + x2) / 2 + Math.cos(a) * bend, (y + y2) / 2 + Math.sin(a) * bend, x2, y2, w, depth]);
      const maxDepth = LOD < 1 ? (winter ? sp.depth : Math.min(sp.depth, 2)) : sp.depth + (winter ? 2 : 0);   // tiles: one level less (fewer, larger clusters)
      if (depth >= 2 && depth <= sp.depth) tips.push([(x + x2) / 2, (y + y2) / 2, depth, .8]);
      else if (depth === 1 && !sp.along) tips.push([x + (x2 - x) * .72, y + (y2 - y) * .72, depth, .95]);
      else if (depth === 1 && sp.fill) for (const t of sp.fill) tips.push([x + (x2 - x) * t, y + (y2 - y) * t + 4, depth, .85]);   // slender crowns: leaves all along the main branches
      if (depth >= maxDepth || len < 8) { tips.push([x2, y2, depth, 1]); return; }
      const kids = sp.kids[0] + Math.floor(r() * (sp.kids[1] - sp.kids[0] + 1));
      for (let i = 0; i < kids; i++) {
        const t = kids === 1 ? 0 : i / (kids - 1) - .5, na = ang + t * sp.spread * 2 + rr(r, -8, 8);
        grow(x2, y2, na + sp.droop * (ang > 0 ? 1 : -1) * (depth + 1) * .5, len * sp.lk * rr(r, .85, 1.15), Math.max(.8, w * sp.wk), depth + 1);
      }
    };
    if (sp.plate) {
      // a Scots pine: a long bare trunk carrying a few irregular masses of needle plates on crooked
      // limbs, the top one broad and flat (an umbrella), the lower ones reaching out to the sides
      const masses = 4 + Math.floor(r() * 3);
      for (let i = 0; i < masses; i++) {
        const t = i === 0 ? .99 : rr(r, .68, .94), side = i === 0 ? (r() < .5 ? -1 : 1) * .2 : (i % 2 ? 1 : -1), y = -th * t, x0 = lean * t * t;
        const reach = side * (i === 0 ? rr(r, 0, 30) : rr(r, 45, 120) * (1.25 - t * .45)), mx = x0 + reach, my = y - (i === 0 ? rr(r, 34, 50) : rr(r, 8, 36));
        segs.push([x0, y, x0 + reach * .45, my + rr(r, 4, 22), mx, my, Math.max(2, sp.tw * .42 * (1.15 - t * .5)), 1]);
        const nP = 6 + Math.floor(r() * 4), Rm = rr(r, 50, 72) * (i === 0 ? 1.35 : .85);
        for (let j = 0; j < nP; j++) { const px = mx + rr(r, -1, 1) * Rm, py = my + rr(r, -.55, .2) * Rm * .55 - (1 - Math.abs(px - mx) / Rm) * 10; tips.push([px, py, 1, rr(r, .5, .85)]); segs.push([mx, my, (mx + px) / 2, (my + py) / 2 - 4, px, py, 1.6, 2]); }
      }
      return { segs, tips, lean, th };
    }
    if (sp.along) {
      const [t0, t1, n0, a0, a1] = sp.along, n = LOD < 1 ? Math.ceil(n0 * .55) : n0;   // tiles: about half the branches
      for (let i = 0; i < n; i++) {
        const t = t0 + (t1 - t0) * (i + rr(r, -.3, .3)) / Math.max(1, n - 1), side = i % 2 ? 1 : -1, x = lean * t * t, y = -th * t;
        const lf = sp.cone ? 1.15 - t * .8 : sp.plate ? .55 + (1 - Math.abs(t - .8) * 2.4) * .45 : sp.taper ? .4 + Math.sin(Math.PI * Math.min(1, (t - t0) / (t1 - t0) * 1.35)) * .75 * (1.1 - t * .5) : .45 + Math.sin(Math.PI * (t - t0) / (t1 - t0 + .1)) * .6;
        grow(x, y, side * rr(r, a0, a1), sp.L * lf * rr(r, .8, 1.15), sp.tw * .45 * (1.15 - t), 1);
      }
      tips.push([lean, -th - 8, 1, 1]);
    } else for (const [ang, lf, t] of sp.limbs) grow(lean * t * t, -th * t, ang + rr(r, -6, 6), sp.L * lf * rr(r, .88, 1.12), sp.tw * .55, 1);
    return { segs, tips, lean, th };
  };
  /**
   * One tree, drawn as a tree: tapered trunk and bark, limbs and twigs, and a crown of many lit
   * leaf clusters with leafy edges. kind: oak | birch | pine | willow | alder | hawthorn. (x, y)
   * is the foot of the trunk; s 1 is about 400 units tall.
   * o: {season, seed, light: -1 (sun on the left) | 1, haze, hazeCol, flutter (n single leaves
   * that flutter), fall (n leaves falling), ground (scene y where falling leaves land), snow,
   * blossom, still, shadow: false}.
   */
  K.tree = (kind, x, y, s, o = {}) => {
    const sp = SPEC[kind] || SPEC.oak, r = rnd(o.seed || R(x * 13 + y * 7 + 1)), season = o.season || 'summer', p = K.pal(season), col = hz(o);
    const winter = season === 'winter', bare = winter && !sp.ever, lx = o.light || (LV ? LV.side : -1);
    const { segs, tips, lean, th } = skeleton(sp, r, bare);
    const leaf = ((p.leaf && p.leaf[kind]) || (sp.ever ? PAL.winter.leaf.pine : PAL.summer.leaf[kind]) || PAL.summer.leaf.oak).map(col);
    const bark = sp.bark.map(col), tw = sp.tw;
    // the ground shadow: along the live light when there is one (long at low sun, faint at night)
    let out = o.shadow === false ? '' : LV && LV.shadow.op ? K.shadow(LV, 0, 4, tw * 3 + 90, th * 1.4) : `<ellipse cx="${R(-lx * 30)}" cy="4" rx="${R(tw * 4.5 + 50)}" ry="${R(tw * .7 + 8)}" fill="#14261e" opacity="${LV ? f2(.22 * (1 - LV.dark * .7)) : '.22'}"/>`;
    // trunk: tapered, slightly curved, root flare, shaded away from the light, bark marks
    const top = tw * .32;
    out += P(bark[0], `M${R(-tw * 1.05)} 3Q${R(-tw * .5)} ${R(-tw * .2)} ${R(-tw * .5)} ${R(-tw * .9)}Q${R(lean * .3 - tw * .45)} ${R(-th * .5)} ${R(lean - top)} ${R(-th)}L${R(lean + top)} ${R(-th)}Q${R(lean * .3 + tw * .45)} ${R(-th * .5)} ${R(tw * .5)} ${R(-tw * .9)}Q${R(tw * .5)} ${R(-tw * .2)} ${R(tw * 1.1)} 3z`);
    out += S(bark[1], tw * .34, `M${R(-lx * tw * .3)} 0Q${R(lean * .3 - lx * tw * .28)} ${R(-th * .5)} ${R(lean - lx * top * .5)} ${R(-th)}`, ' opacity=".55"');
    out += S(bark[2], tw * .12, `M${R(lx * tw * .3)} -6Q${R(lean * .3 + lx * tw * .3)} ${R(-th * .5)} ${R(lean + lx * top * .5)} ${R(-th + 4)}`, ' opacity=".6"');
    let marks = '';
    if (sp.white) { for (let i = 0; i < (LOD < 1 ? 8 : 18); i++) { const t = rr(r, .04, .95), w = (tw * (1 - t * .6)) * rr(r, .3, .7), mx = lean * t * t + rr(r, -.3, .3) * tw * (1 - t * .6); marks += `M${R(mx - w / 2)} ${R(-th * t)}h${R(w)}`; } out += S(col('#2c2a28'), 2.4, marks) + P(col('#3a3632'), `M${R(-tw * .95)} 2q${R(tw)} -${R(tw * 1.8)} ${R(tw * 2)} 0z`); }
    else if (kind === 'pine') { for (let i = 0; i < (LOD < 1 ? 6 : 14); i++) { const t = rr(r, .05, .55), mx = lean * t * t + rr(r, -.35, .35) * tw; marks += `M${R(mx)} ${R(-th * t)}l${R(rr(r, -3, 3))} ${-R(rr(r, 6, 14))}`; } out += S(col('#5a4036'), 2, marks) + S(col('#d08450'), tw * .45, `M${R(lean * .36)} ${R(-th * .6)}L${R(lean)} ${R(-th)}`, ' opacity=".5"'); }
    else { for (let i = 0; i < (LOD < 1 ? 5 : 12); i++) { const t = rr(r, .05, .9), mx = lean * t * t + rr(r, -.35, .35) * tw * (1 - t * .5); marks += `M${R(mx)} ${R(-th * t)}q${R(rr(r, -3, 3))} ${-R(rr(r, 8, 18))} 0 ${-R(rr(r, 16, 30))}`; } out += S(bark[1], 1.6, marks, ' opacity=".6"'); }
    // limbs by width class: thick ones stay with the trunk, thin ones sway with the crown
    const byW = (min, max) => { const m = new Map(); for (const [a, b, c, d, e, f, w] of segs) { if (w < min || w >= max) continue; const k = w > 6 ? R(w) : w > 2.5 ? f2(Math.round(w * 2) / 2) : w > 1.4 ? 1.6 : 1; m.set(k, (m.get(k) || '') + `M${R(a)} ${R(b)}Q${R(c)} ${R(d)} ${R(e)} ${R(f)}`); } return m; };
    const limbs = (min, max, c) => [...byW(min, max)].map(([w, d]) => S(c, w, d)).join('');
    const thick = limbs(4, 99, sp.white ? mix(bark[0], '#4a403a', .55) : bark[0]), topLimbs = !sp.along && !bare;   // limbs from the trunk top sway with the crown
    if (!topLimbs) out += thick;
    let crown = LOD < 1 && o.still && !bare ? '' : limbs(0, 4, bare ? col(p.bare || '#5a4f4a') : sp.white ? col('#4a403a') : bark[1]);
    const swayTo = `${R(lean)}px ${R(-th)}px`;
    if (bare) {
      // winter: the full twig lattice, frost on the upper edges (or snow), catkins
      if (LOD === 1 || o.snow) crown += [...byW(0, 99)].map(([w, d]) => S(col(o.snow ? '#ffffff' : (p.frost || '#f4f8fa')), Math.max(.8, w * .35), d, ` opacity="${o.snow ? .85 : .45}" transform="translate(0 -1)"`)).join('');
      if (kind === 'birch' || kind === 'willow') crown += S(col(kind === 'willow' ? '#c9a84a' : '#6a4a5a'), 1, tips.filter(t => t[2] >= 2).map(([tx, ty]) => `M${R(tx)} ${R(ty)}q${R(rr(r, -4, 4))} ${R(rr(r, 10, 30))} ${R(rr(r, -6, 6))} ${R(rr(r, 26, kind === 'willow' ? 160 : 50))}`).join(''), ' opacity=".7"');
      if (kind === 'alder') { let cat = ''; for (const [tx, ty] of tips.filter((t, i) => i % 3 === 0)) cat += `M${R(tx)} ${R(ty)}l${R(rr(r, -2, 2))} 9`; crown += S(col('#6a3a3a'), 3.2, cat); }
      out += o.still ? crown : M('tree', { ad: GUST + 's', d: gustD(x), to: swayTo }, crown);
      return flush(at(x, y, s, out, o.flip));
    }
    // the crown: leaf clusters top first (lower ones overlap the lit tops above), in two colour sets
    const spring = season === 'spring', autumn = season === 'autumn', cl = [], [c0, c1] = sp.clump;
    for (const [tx, ty, depth, wgt] of tips) {
      if (autumn && !sp.ever && r() < .2) continue;
      if (sp.gaps && depth >= 2 && r() < sp.gaps) continue;   // holes in the crown: limbs and sky show through
      const big = sp.gaps && r() < .18 ? rr(r, 1.25, 1.6) : 1;
      cl.push([tx + rr(r, -6, 6), ty + rr(r, -6, 4), rr(r, sp.gaps ? c0 * .6 : c0, c1) * big * (spring && !sp.ever ? .85 : 1) * wgt, Math.floor(r() * 3), sp.gaps ? rr(r, .85, 1.45) : 1, sp.gaps ? rr(r, -25, 25) : 0]);
    }
    if (!cl.length) cl.push([lean, -th, c1, 0]);
    // small tiles: about half the clusters (most of the small ones), so the dark heart thins with them
    if (LOD < 1 && cl.length > 3) { const keep = cl.filter(c => c[2] < (c0 + c1) / 2 ? r() >= .65 : r() >= .3); if (keep.length) cl.splice(0, cl.length, ...keep); }
    cl.sort((a, b) => a[1] - b[1]);
    let minY = 0, maxY = -1e9; for (const c of cl) { minY = Math.min(minY, c[1] - c[2]); maxY = Math.max(maxY, c[1] + c[2]); }
    const cy0 = (minY + maxY) / 2, mir = lx > 0 ? -1 : 1;
    // five tones from shade to light; each cluster takes a tone from where it sits in the crown
    // (lit side and top lighter, underside and the side away darker) and the next tone up for its rim
    const base = autumn && !sp.ever ? [leaf[0], leaf[1], leaf[2]] : leaf, alt2 = autumn && !sp.ever ? [mix(leaf[0], '#5a3a1a', .3), leaf[0], leaf[1]] : null;
    const tonesOf = c => [mix(c[0], autumn ? '#2a1e14' : '#06120c', autumn ? .28 : .36), c[0], mix(c[0], c[1], .55), c[1], mix(c[1], c[2], .65), c[2]];
    const tones = tonesOf(base), tonesAlt = alt2 && tonesOf(alt2);
    let bx0 = 1e9, bx1 = -1e9; for (const c of cl) { bx0 = Math.min(bx0, c[0] - c[2]); bx1 = Math.max(bx1, c[0] + c[2]); }
    const mx = (bx0 + bx1) / 2, W = Math.max(40, bx1 - bx0), H = Math.max(40, maxY - minY);
    const groups = [[], [], [], [], []], groupsAlt = [[], [], [], [], []];
    for (const [cx, cy, rad, v, wide, turn] of cl) {
      const u = (cx - mx) / W * (-lx), w2 = (cy0 - cy) / H, t = clamp(.42 + u * .9 + w2 * .95 + rr(r, -.14, .14), 0, .999), k = rad / sp.unit;
      (alt2 && r() < .35 ? groupsAlt : groups)[Math.floor(t * 5)].push(wide && wide !== 1 ? useT(clumpSym(kind, v, o.snow && sp.ever), cx, cy, mir * k * wide, k, turn) : use(clumpSym(kind, v, o.snow && sp.ever), cx, cy, f2(mir * k)));
    }
    // the dark heart of the crown behind its limbs: gaps between clusters read as depth, not sky
    if (topLimbs) crown = P(tones[0], cl.map(([cx, cy, rad]) => sp.gaps && LOD === 1 ? lobed(r, cx, cy + rad * .2, rad * .62, rad * .5, 7, .3) : circ(cx, cy + rad * .1, rad * .8)).join('')) + thick + crown;
    else if (!sp.ever) crown = P(tones[0], cl.filter((c, i) => i % 2).map(([cx, cy, rad]) => circ(cx, cy + rad * .15, rad * .6)).join(''), ' opacity=".7"') + crown;
    else crown = P(tones[0], cl.map(([cx, cy, rad]) => ell(cx * .85 + lean * .15, cy + rad * .2, rad * 1.1, rad * .5)).join('')) + crown;   // a pine's plates join into one dark crown
    for (let i = 0; i < 5; i++) { if (groups[i].length) crown += `<g fill="${tones[i]}" color="${tones[i + 1]}">${groups[i].join('')}</g>`; if (groupsAlt[i].length) crown += `<g fill="${tonesAlt[i]}" color="${tonesAlt[i + 1]}">${groupsAlt[i].join('')}</g>`; }
    // loose single leaves round the edge of the crown, catching the light
    let loose = ['', ''];
    for (let i = 0; i < (LOD < 1 || kind === 'pine' ? 0 : 26); i++) { const [cx, cy, rad] = cl[Math.floor(r() * cl.length)], a = rr(r, -2.9, 2.9), d = rad * rr(r, .9, 1.15), L = rr(r, 7, 11) * (sp.unit / 40); loose[a * -lx > 0 ? 1 : 0] += leafD(cx + Math.sin(a) * d, cy - Math.cos(a) * d, a + rr(r, -.6, .6), L, L * .4); }
    crown += P(tones[2], loose[0]) + P(tones[4], loose[1]);
    if (spring && (o.blossom != null ? o.blossom : sp.blossom)) { let bl = ['', '']; for (const [cx, cy, rad] of cl) for (let i = 0; i < (LOD < 1 ? 3 : 8); i++) { const a = rr(r, 0, Math.PI * 2), d = Math.sqrt(r()) * rad; bl[i % 2] += circ(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(r, 2.4, 4)); } crown += P(col(PAL.spring.blossom[0]), bl[0]) + P(col(PAL.spring.blossom[1]), bl[1]); }
    if (spring && kind === 'birch') { let cat = ''; for (const [tx, ty] of tips.filter((t, i) => i % 4 === 0)) cat += `M${R(tx)} ${R(ty)}l${R(rr(r, -2, 2))} 10`; crown += S(col('#c8b85a'), 2.6, cat); }
    if (sp.weep) {
      // weeping willow: curtains of hanging strands in three swaying groups
      const st = ['', '', ''], lf = ['', '', ''];
      for (const [cx, cy, rad] of cl) {
        if (cy < cy0 - rad && r() < .5) continue;
        for (let i = 0; i < 3; i++) { const sx = cx + rr(r, -rad, rad), sy = cy + rad * rr(r, -.2, .6), L = rr(r, 80, 200), g = i % 3, cur = rr(r, -10, 10); st[g] += `M${R(sx)} ${R(sy)}q${R(cur)} ${R(L * .5)} ${R(cur * .4)} ${R(L)}`; lf[g] += `M${R(sx + cur * .2)} ${R(sy + 10)}q${R(cur)} ${R(L * .5)} ${R(cur * .4)} ${R(L - 10)}`; }
      }
      crown += st.map((d, i) => M('weep', { ad: sec(5 + i * .9), d: gustD(x + i * 40), to: `0px ${R(cy0)}px` }, S(leaf[1], 2, d) + S(leaf[2], 3.4, lf[i], ' stroke-dasharray="4 5"'))).join('');
    }
    // single leaves that flutter on the edge of the crown
    for (let i = 0; i < N(o.flutter || 0); i++) {
      const [cx, cy, rad] = cl[Math.floor(r() * cl.length)], a = rr(r, -2.4, 2.4), ex = cx + Math.sin(a) * rad * 1.05, ey = cy - Math.cos(a) * rad * 1.05;
      crown += M('flutter', { ad: sec(rr(r, 1.4, 2.6)), d: sec(-rr(r, 0, 3)), to: `${R(ex)}px ${R(ey)}px` }, P(pick(r, leaf.slice(1)), leafD(ex, ey, a, 14)));
    }
    out += o.still ? crown : M('tree', { ad: GUST + 's', d: gustD(x), to: swayTo }, crown);
    if (o.fall) out += K.falling({ seed: (o.seed || 1) + 5, n: o.fall, x0: minX(cl), x1: maxX(cl), y0: minY + 20, y1: cy0, dy: R((o.ground != null ? o.ground - y : 0) / s - cy0 + 10), dx: 80 / s, cols: leaf.slice(1).concat(autumn ? [leaf[0]] : []), size: 13 });
    return flush(at(x, y, s, out, o.flip));
  };
  const minX = cl => Math.min(...cl.map(c => c[0])), maxX = cl => Math.max(...cl.map(c => c[0]));
  // A bare winter tree for tree lines (unit height 100), drawn once per scene and reused.
  const bareSym = (kind, v, snow) => sym(`bare|${kind}|${v}|${snow ? 1 : 0}`, () => {
    const r = rnd(400 + v * 37 + kind.length * 11); let d = '', t = '';
    const twig = (x, y, a, L, dep) => { const x2 = x + Math.sin(a) * L, y2 = y - Math.cos(a) * L; (dep < 2 ? (d += `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`) : (t += `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`)); if (dep < (LOD < 1 ? 3 : 4)) for (let i = 0; i < 2; i++) twig(x2, y2, a + (i ? 1 : -1) * rr(r, .25, .55), L * rr(r, .6, .75), dep + 1); };
    const birch = kind === 'birch';
    for (let i = 0; i < (birch ? 5 : 4); i++) twig(rr(r, -2, 2), birch ? -30 - i * 13 : -32, (i - (birch ? 2 : 1.5)) * (birch ? .5 : .42), birch ? 26 : 34, 0);
    return `<path fill="currentColor" opacity=".28" d="${blob(r, 0, -62, birch ? 26 : 40, birch ? 36 : 32, 9)}"/><path fill="none" stroke="${birch ? '#e6e2d8' : 'currentColor'}" stroke-width="${birch ? 2.6 : 3.2}" d="M0 0V-${birch ? 92 : 34}"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="${d}"/><path fill="none" stroke="currentColor" stroke-width=".8" d="${t}"/>` + (snow ? `<path fill="none" stroke="#fff" stroke-width="1.4" opacity=".8" transform="translate(0 -1)" d="${d}"/>` : '');
  });
  // A whole small tree for tree lines (unit height about 100), drawn once per scene and reused:
  // the trunk takes the stroke, the leaf clusters the fill and currentColor (set on the <use>).
  const treeSym = (kind, v, snow) => sym(`tree|${kind}|${v}|${snow ? 1 : 0}`, () => {
    const r = rnd(600 + v * 23 + kind.length * 7), id = clumpSym(kind, v % 3, snow && kind === 'pine');
    let u = '', trunk = '';
    if (kind === 'pine') { trunk = `M0 0l${R(rr(r, -4, 4))}-102`; const n = 3 + v % 2; for (let i = 0; i < n; i++) u += use(id, rr(r, -14, 14), -70 - i * 36 / n + rr(r, -3, 3), f2(rr(r, .42, .62) * (1 - i * .1))); }
    else if (kind === 'birch') { trunk = `M0 0l${R(rr(r, -4, 4))}-98`; for (let i = 0; i < 6; i++) u += use(id, rr(r, -15, 15), -36 - i * 11, f2(rr(r, .55, .8))); }
    else {
      trunk = `M0 0l${R(rr(r, -3, 3))}-44`;
      const n = 7 + v % 3, cw = kind === 'alder' ? 22 : 36, pts = [];
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 2.7 + rr(r, -.2, .2), d = i % 2 ? cw : cw * .55; pts.push([Math.sin(a) * d * (kind === 'alder' ? .8 : 1), -58 - Math.cos(a) * d * (kind === 'alder' ? 1.4 : .75) + (kind === 'alder' ? -6 : 0)]); }
      pts.push([rr(r, -6, 6), kind === 'alder' ? -96 : -86]);
      pts.sort((a, b) => a[1] - b[1]);
      for (const [px, py] of pts) u += use(id, px, py, f2(rr(r, .44, .6)));
    }
    return `<path fill="none" stroke-width="${kind === 'birch' ? 2.6 : kind === 'pine' ? 3.4 : 4.4}" d="${trunk}"/>` + (kind === 'birch' ? '<path fill="none" stroke="#2c2a28" stroke-width="2.6" opacity=".55" d="M-1-12h3M0-26h2M-1-42h3"/>' : '') + `<g stroke="none">${u}</g>`;
  });
  /**
   * A tree line: individual trees (oak, birch, pine, alder, willow, hawthorn) side by side, each a
   * crown of leaf clusters on a trunk, in front of a dark canopy mass, with low shrubs at the foot,
   * lit from one side and fading with distance. o: {seed, y (foot line), h: [min, max], mix: {oak,
   * birch, pine, ...}, season, haze (0 near .. 1 lost in the sky), hazeCol, light (-1 | 1), x0, x1,
   * ground (fill colour below the foot), foot (its depth), sway (strips; 0 = still), gap (spacing),
   * snow, mass (false: none), shrubs (false: none)}.
   */
  K.woods = o => {
    const r = rnd(o.seed || 11), season = o.season || 'summer', p = K.pal(season), col = hz(o), x0 = o.x0 != null ? o.x0 : -160, x1 = o.x1 != null ? o.x1 : 1760;
    const [h0, h1] = o.h || [90, 160], mixw = o.mix || { oak: .5, birch: .25, pine: .25 }, total = Object.values(mixw).reduce((a, b) => a + b, 0), mir = (o.light || (LV ? LV.side : -1)) > 0 ? -1 : 1;
    const bits = [], trunkCol = { birch: '#e6e2d8', pine: '#9a5034' };
    // two staggered rows: the back one smaller and darker (deeper in the wood), the front one lit;
    // heights vary widely so the skyline is broken, and a few tall trees stand clear
    for (const back of o.rows === 1 || LOD < 1 ? [false] : [true, false]) for (let x = x0 + (back ? rr(r, 0, h0 * .3) : 0); x < x1;) {
      let t = r() * total, kind = 'oak'; for (const [k, w] of Object.entries(mixw)) { if ((t -= w) <= 0) { kind = k; break; } }
      const sp = SPEC[kind] || SPEC.oak, tall = r() < .12 ? rr(r, 1.15, 1.35) : 1, h = rr(r, h0, h1) * tall * (back ? .82 : 1) * (kind === 'pine' ? 1.12 : kind === 'birch' ? 1.05 : 1), k = h / 100, yy = o.y + (back ? -h0 * .06 : rr(r, -2, 6));
      const lv = (p.leaf && p.leaf[kind]) || (sp.ever ? PAL.winter.leaf.pine : null), v = Math.floor(r() * 4), dk = c => col(back ? mix(c, '#0a1a12', .22) : c);
      if (!lv) bits.push({ x, y: yy, z: back ? 0 : 1, use: bareSym(kind, v % 3, o.snow), k: f2((r() < .5 ? -1 : 1) * k), color: dk(p.bare || '#5a4f4a') });
      else bits.push({ x, y: yy, z: back ? 0 : 1, use: treeSym(kind, v, o.snow), k: f2(mir * k), fill: dk(back ? lv[0] : lv[0]), color: dk(back ? mix(lv[0], lv[1], .5) : lv[1]), stroke: dk(trunkCol[kind] || '#4a3e34') });
      x += h * rr(r, .32, .7) * (kind === 'birch' || kind === 'pine' ? .7 : 1) * (o.gap || 1) * (back ? 1.2 : 1) * (LOD < 1 ? 1.8 : 1) + (LOD < 1 ? 14 : 0);   // tiles: far fewer of the tiny far trees (the canopy mass fills between)
    }
    // the wood behind: a dark canopy mass, so the row reads as woodland rather than a fence of trees
    const lvm = (p.leaf && p.leaf.oak) || null, mass = col(lvm ? mix(lvm[0], '#0a1a12', .3) : mix(p.twig || '#7a6a72', '#2a2a30', .3));
    let md = `M${x0} ${R(o.y + 2)}`;
    const step = Math.max(70, h0) * (LOD < 1 ? 1.6 : 1);   // the mass and shrub detail does not need to follow tiny far trees
    for (let x = x0; x < x1;) { const w = rr(r, .3, .55) * step, hh = rr(r, .5, .85) * h0; md += `Q${R(x + w * .1)} ${R(o.y - hh)} ${R(x + w * .5)} ${R(o.y - hh)}Q${R(x + w * .9)} ${R(o.y - hh)} ${R(x + w)} ${R(o.y - hh * rr(r, .7, .9))}`; x += w; }
    const back = o.mass === false ? '' : P(mass, md + `L${x1 + 60} ${R(o.y + 2)}z`, lvm ? '' : ' opacity=".5"');
    // low shrubs along the foot hide the trunks' feet
    let shrub = '';
    // (an understorey of mixed sizes: low scrub, the odd tall holly or hawthorn bush, clumps and
    // gaps, three tones and a lit cap on the bigger ones, so it never reads as a row of bumps)
    if (o.shrubs !== false && lvm) {
      const sd = ['', '', ''], cap = ['', ''], u = h0 / 90, tn = [mix(lvm[0], '#0a1a12', .25), mix(lvm[0], '#0a1a12', .08), mix(lvm[0], lvm[1], .35)];
      for (let x = x0 + rr(r, 0, 30); x < x1;) {
        const q = r(), big = q < .12, mid = q < .4, w = (big ? rr(r, 34, 52) : mid ? rr(r, 20, 32) : rr(r, 8, 18)) * u, hh = w * rr(r, .45, big ? 1.1 : .8), y0 = o.y + rr(r, -2, 5) * u, ti = big ? 1 + (r() < .5 ? 1 : 0) : Math.floor(r() * 3);
        const tiny = LOD < 1 && w < 5;   // tiles: sub-pixel scrub is not drawn (the canopy mass is there)
        if (!tiny) sd[ti] += lobed(r, x, y0 - hh * .55, w, hh, big ? 11 : 7, big ? .3 : .22);
        if (!tiny && (big || (mid && r() < .5))) cap[r() < .5 ? 0 : 1] += lobed(r, x - mir * w * .25, y0 - hh * .95, w * .5, hh * .35, 6, .3);
        x += Math.max(LOD < 1 ? 16 : 0, w * (r() < .1 ? rr(r, 1.8, 3.2) : rr(r, .5, 1.3)) * (step / 90) * (LOD < 1 ? 2.5 : 1));   // tiles: no swarm of tiny shrubs under a low far wood
      }
      shrub = sd.map((d, i) => P(col(tn[i]), d)).join('') + P(col(mix(lvm[1], lvm[2], .2)), cap[0], ' opacity=".55"') + P(col(lvm[1]), cap[1], ' opacity=".45"');
    }
    const ground = o.ground ? `<path fill="${col(o.ground)}" d="M${x0} ${R(o.y + (o.foot || 60))}V${R(o.y - 1)}H${x1}V${R(o.y + (o.foot || 60))}z"/>` : '';
    return flush(back + K.wind(bits, { strips: o.sway != null ? Math.max(1, o.sway) : 5, x0, x1, amp: o.sway === 0 ? 'none' : 'tree' }) + shrub + ground);
  };

  /* ---------- sky, light and air ---------- */
  /** The sky: a vertical gradient (stops [[offset, colour], ...]) to y1, and a glow round the sun. */
  K.sky = o => {
    const g = U(); let out = `<defs>${linU(g, o.stops || [[0, '#3f8fc4'], [.6, '#a9d8e4'], [1, '#f6edc8']], 0, 0, 0, o.y1 || 700)}</defs><rect x="-160" y="-60" width="1920" height="${(o.y1 || 700) + 260}" fill="url(#${g})"/>`;
    if (o.sun) out += K.glow(o.sun[0], o.sun[1], o.glow || 520, o.glowCol || '#fff3cf', o.glowOp != null ? o.glowOp : .55);
    return out;
  };
  /** A soft radial glow. */
  K.glow = (x, y, rad, c, op) => { const g = U(); return `<defs>${radU(g, [[0, c, op != null ? op : .6], [.4, c, (op != null ? op : .6) * .35], [1, c, 0]], R(x), R(y), R(rad))}</defs><circle cx="${R(x)}" cy="${R(y)}" r="${R(rad)}" fill="url(#${g})"/>`; };
  /** The sun disc with a halo that breathes. */
  K.sun = (x, y, rad, o = {}) => K.glow(x, y, rad * 5, o.halo || '#fff0c0', .7) + M('glow', { ad: '7s' }, `<circle cx="${R(x)}" cy="${R(y)}" r="${R(rad * 1.35)}" fill="${o.halo || '#fff0c0'}" opacity=".45"/><circle cx="${R(x)}" cy="${R(y)}" r="${R(rad)}" fill="${o.core || '#fffbe6'}"/>`);
  /** The moon (phase frac 0..1 when the almanac is loaded) with a soft halo. */
  K.moon = (x, y, rad, o = {}) => {
    const disc = typeof almMoonDiscPath === 'function' && o.frac != null ? `<path fill="#f1ecd2" d="${almMoonDiscPath(o.frac, R(rad))}"/>` : `<path fill="#f1ecd2" d="M0 ${-R(rad)}a${R(rad)} ${R(rad)} 0 1 0 ${R(rad * .6)} ${R(rad * 1.8)}a${R(rad * .8)} ${R(rad * .8)} 0 1 1 ${-R(rad * .6)} ${-R(rad * 1.8)}z"/>`;
    return K.glow(x, y, rad * 4, '#cfe0f0', .35) + `<g transform="translate(${R(x)} ${R(y)})">${disc}<circle cx="${R(rad * .25)}" cy="${-R(rad * .2)}" r="${R(rad * .15)}" fill="#8f9eaa" opacity=".18"/></g>`;
  };
  /** Twinkling stars in three groups. o.always: shown in daylight too (otherwise only in the evening grade). */
  K.stars = o => {
    const r = rnd(o.seed || 12), g = ['', '', ''];
    for (let i = 0; i < N(o.n || 60); i++) { const x = rr(r, 0, 1600), y = rr(r, 0, o.y1 || 380), big = r() < .12; g[i % 3] += big ? `M${R(x)} ${R(y - 4)}l1 3 3 1-3 1-1 3-1-3-3-1 3-1z` : circ(x, y, rr(r, .8, 1.8)); }
    return `<g${o.always ? '' : ' class="hx-star"'} fill="#fffaf0">${g.map((d, i) => M('twinkle', { ad: sec(2.6 + i * 1.1), d: sec(-i * .9) }, `<path d="${d}"/>`)).join('')}</g>`;
  };
  /**
   * Soft natural clouds drifting (no outlines): each one a seeded mix of shapes and sizes, a
   * cumulus heap (irregular towers on a flat base), a flat stratocumulus strip or a small
   * fair-weather puff. Built as a soft halo, a body shaded from a lit top to a cool base, lit
   * caps on the light side and shade on the far side, cut flat underneath with a ragged soft
   * underside. Call it once per depth layer (far: small and slow; near: larger and faster).
   * o: {seed, n, x0, x1, y0, y1, s: [min, max], cols: [shade, body, light], op, dur: [min, max],
   * light (-1 | 1), kinds: {heap, strip, puff} (weights)}.
   */
  K.clouds = o => {
    const r = rnd(o.seed || 13), n = Math.max(1, Math.round((o.n || 4) * Math.max(.5, LOD))), [sh, bd, li] = o.cols || ['#c4d3e3', '#f2f5f8', '#ffffff'], lx = o.light || -1, [s0, s1] = o.s || [.6, 1.1], [d0, d1] = o.dur || [70, 110];
    const kw = Object.assign({ heap: .5, strip: .3, puff: .2 }, o.kinds || {}), kt = kw.heap + kw.strip + kw.puff;
    let out = '';
    for (let i = 0; i < n; i++) {
      const x = rr(r, o.x0 != null ? o.x0 : -100, o.x1 != null ? o.x1 : 1700), y = rr(r, o.y0 || 80, o.y1 || 260), u = r() * kt;
      const kind = u < kw.heap ? 'heap' : u < kw.heap + kw.strip ? 'strip' : 'puff';
      const s = rr(r, s0, s1) * (kind === 'puff' ? .5 : 1), W = 260 * s * (kind === 'strip' ? rr(r, 1.5, 2.2) : rr(r, .8, 1.25));
      const k = kind === 'strip' ? 8 + Math.floor(r() * 5) : kind === 'puff' ? 3 + Math.floor(r() * 3) : 5 + Math.floor(r() * 4);
      const tall = kind === 'strip' ? .45 : kind === 'puff' ? .8 : rr(r, .9, 1.35), skew = rr(r, -.25, .25), puffs = [];
      for (let j = 0; j < k; j++) {
        const t = (j + rr(r, -.35, .35)) / Math.max(1, k - 1) - .5, bell = Math.max(.15, 1 - Math.abs(t - skew * .5) * 1.8) ** .7;
        const pr = W * (kind === 'strip' ? .05 + .05 * bell : .055 + .13 * bell) * rr(r, .7, 1.3), px = x + t * W * .9;
        puffs.push([px, y - pr * rr(r, .3, .7) * tall, pr, 1]);
        if (kind !== 'strip' && bell > .5 && r() < .75) { const qr = pr * rr(r, .45, .7); puffs.push([px + rr(r, -.6, .6) * pr, y - pr * (1 + rr(r, .1, .5) * tall) - qr * .2, qr, 2]); }
      }
      const top = Math.min(...puffs.map(p => p[1] - p[2])), H = y - top, cut = U(), inn = U(), grad = U(), soft = LOD === 1 && kind !== 'puff';
      // each puff is shaded round its own body (lit toward the sun and up, cooler at its rim), so
      // where puffs overlap the crevices read without any outline; towers behind, lower heads in front
      const pg = defOnce('cloudpuff|' + sh + bd + li + lx, id => `<radialGradient id="${id}" cx=".5" cy=".5" r=".55" fx="${f2(.5 + lx * .16)}" fy=".3"><stop offset="0" stop-color="${li}"/><stop offset=".45" stop-color="${mix(li, bd, .6)}"/><stop offset=".9" stop-color="${bd}"/><stop offset="1" stop-color="${mix(bd, sh, .22)}"/></radialGradient>`);
      puffs.sort((a, b) => (a[1] + a[2] * .3) - (b[1] + b[2] * .3));
      const sq = kind === 'strip' ? .62 : .92;   // strips: flatter, wider puffs
      const els = puffs.map(([px, py, pr]) => `<ellipse cx="${R(px)}" cy="${R(py)}" rx="${R(pr * (2 - sq))}" ry="${R(pr * sq)}" fill="url(#${pg})"/>`).join('');
      const shape = puffs.map(([px, py, pr]) => ell(px, py, pr * (2 - sq), pr * sq)).join('');
      let body = `<defs><clipPath id="${cut}"><rect x="${R(x - W * 1.2)}" y="${R(top - 30)}" width="${R(W * 2.4)}" height="${R(H + 30)}"/></clipPath>${soft ? `<clipPath id="${inn}"><path d="${shape}"/></clipPath>${linU(grad, [[0, sh, 0], [.55, sh, 0], [1, sh, .55]], 0, R(top), 0, R(y))}` : ''}</defs>`;
      body += `<g clip-path="url(#${cut})">${soft ? `<path fill="${bd}" opacity=".12" transform="translate(${R(x)} ${R(y)}) scale(1.06) translate(${R(-x)} ${R(-y)})" d="${shape}"/>` : ''}${els}`;
      // the shaded flat base, darker underneath (only inside the cloud)
      if (soft) body += `<rect clip-path="url(#${inn})" x="${R(x - W * 1.2)}" y="${R(top)}" width="${R(W * 2.4)}" height="${R(H)}" fill="url(#${grad})"/>`;
      body += '</g>';
      // a soft ragged underside instead of a knife edge
      if (kind !== 'puff') { let d = ''; for (let j = 0; j < 4; j++) d += ell(x + rr(r, -.38, .38) * W, y + rr(r, -2, 1), W * rr(r, .1, .2), Math.max(2, W * rr(r, .01, .02))); body += `<path fill="${mix(bd, sh, .6)}" opacity=".5" d="${d}"/>`; }
      out += M('drift', { ad: sec(rr(r, d0, d1)), d: sec(-rr(r, 0, 60)), dx: R(rr(r, 50, 120) * s) + 'px' }, `<g opacity="${f2((o.op != null ? o.op : .96) * (kind === 'puff' ? .9 : 1))}">${body}</g>`);
    }
    return out;
  };
  /**
   * High cloud: wispy cirrus (mare's tails, fine fibres with a hooked end) or, with o.sheet, a
   * thin altostratus veil. o: {seed, n, y0, y1, col, op, sheet (0..1, how much of a veil)}.
   */
  K.cirrus = o => {
    const r = rnd(o.seed || 14), col = o.col || '#ffffff', op = o.op || .5, vg = U();
    // a soft veil per streak (fading out at both ends) with a few fine fibres combed through it
    let out = `<defs>${linU(vg, [[0, col, 0], [.4, col, f2(op * .5)], [.7, col, f2(op * .35)], [1, col, 0]], 0, 0, 1, 0).replace('gradientUnits="userSpaceOnUse" ', 'gradientUnits="objectBoundingBox" ')}</defs>`;
    for (let i = 0; i < N(o.n || 4); i++) {
      const x = rr(r, 0, 1600), y = rr(r, o.y0 || 60, o.y1 || 200), w = rr(r, 180, 460), a = rr(r, -12, 6), hook = rr(r, -1, 1) * 16, fib = 2 + Math.floor(r() * 3);
      let v = '', d = '';
      for (let j = 0; j < 3; j++) v += ell(x + rr(r, -.2, .2) * w, y + rr(r, -4, 8), w * rr(r, .25, .5), rr(r, 3, 9));
      for (let j = 0; j < fib; j++) {
        const len = w * rr(r, .35, .8), x0 = x + rr(r, -.3, .1) * w, y0 = y + rr(r, -4, 8);
        d += `M${R(x0)} ${R(y0)}c${R(len * .3)} ${R(rr(r, -3, 3))} ${R(len * .7)} ${R(rr(r, -3, 3))} ${R(len)} ${R(hook * rr(r, .3, 1))}`;
      }
      out += M('drift', { ad: sec(rr(r, 160, 260)), d: sec(-rr(r, 0, 120)), dx: R(rr(r, 40, 90)) + 'px' }, `<g transform="rotate(${f2(a)} ${R(x)} ${R(y)})"><path fill="url(#${vg})" d="${v}"/>${LOD < 1 ? '' : `<path fill="none" stroke="${col}" stroke-linecap="round" stroke-width="${f2(rr(r, 1.2, 2.2))}" opacity="${f2(op * .45)}" d="${d}"/>`}</g>`);
    }
    if (o.sheet > 0) {
      // altostratus: a thin veil of long, very soft bands
      const g = U(); let d = '';
      for (let j = 0; j < N(5); j++) d += ell(rr(r, 100, 1500), rr(r, o.y0 || 60, (o.y1 || 200) + 60), rr(r, 300, 700), rr(r, 10, 26));
      out = `<defs>${linU(g, [[0, col, 0], [.5, col, f2(o.sheet * op)], [1, col, 0]], 0, 0, 1, 0).replace('gradientUnits="userSpaceOnUse" ', 'gradientUnits="objectBoundingBox" ')}</defs>` +
        M('drift', { ad: sec(240), dx: '50px' }, `<path fill="url(#${g})" d="${d}"/>`) + out;
    }
    return out;
  };
  /** Long sun rays fanning down from the sun, breathing in three groups. o: {x, y, n, len, col, op, a0, a1 (deg, 0 = straight down)}. */
  K.sunrays = o => {
    const r = rnd(o.seed || 15), g = U(), n = o.n || 12, a0 = o.a0 != null ? o.a0 : -75, a1 = o.a1 != null ? o.a1 : 75, len = o.len || 1100, parts = ['', '', ''];
    for (let i = 0; i < n; i++) { const a = (a0 + (a1 - a0) * (i + rr(r, -.3, .3)) / Math.max(1, n - 1)) * D, w = rr(r, .015, .045); parts[i % 3] += `M${R(o.x)} ${R(o.y)}L${R(o.x + Math.sin(a - w) * len)} ${R(o.y + Math.cos(a - w) * len)}L${R(o.x + Math.sin(a + w) * len)} ${R(o.y + Math.cos(a + w) * len)}z`; }
    return `<defs>${radU(g, [[0, o.col || '#fff4d0', o.op || .38], [1, o.col || '#fff4d0', 0]], R(o.x), R(o.y), len)}</defs>` + parts.map((d, i) => M('shaft', { ad: sec(6 + i * 1.7), d: sec(-i * 2.3) }, P(`url(#${g})`, d))).join('');
  };
  /** Slanting light shafts between trees. o: {seed, x0, x1, n, slant (deg), w: [min, max], y0, y1, col, op}. */
  K.shafts = o => {
    const r = rnd(o.seed || 16), g = U(), y0 = o.y0 || 0, y1 = o.y1 || 900, sl = Math.tan((o.slant != null ? o.slant : 18) * D), parts = ['', ''];
    for (let i = 0; i < N(o.n || 5); i++) { const x = rr(r, o.x0 || 0, o.x1 || 1600), w = rr(r, ...(o.w || [30, 90])), dx = (y1 - y0) * sl; parts[i % 2] += `M${R(x)} ${y0}h${R(w)}L${R(x + w * 1.8 + dx)} ${y1}H${R(x + dx)}z`; }
    return `<defs>${linU(g, [[0, o.col || '#fff6d8', o.op || .32], [1, o.col || '#fff6d8', 0]], 0, y0, 0, y1)}</defs>` + parts.map((d, i) => M('shaft', { ad: sec(7 + i * 2), d: sec(-i * 3) }, P(`url(#${g})`, d))).join('');
  };
  /** Dappled light on the ground, slowly shifting. o: {seed, x0, x1, y0, y1, n, col, op}. */
  K.dapple = o => {
    const r = rnd(o.seed || 17), parts = ['', ''], span = Math.max(1, o.y1 - o.y0);
    for (let i = 0; i < N(o.n || 24); i++) { const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1), k = .5 + (y - o.y0) / span; parts[i % 2] += ell(x, y, rr(r, 10, 34) * k, rr(r, 3, 8) * k); }
    return parts.map((d, i) => M('shaft', { ad: sec(5 + i * 2.2), d: sec(-i * 1.7) }, P(o.col || '#fff3c4', d, ` opacity="${o.op || .35}"`))).join('');
  };
  /** Banks of mist drifting low over land or water. o: {seed, y, h, n, col, op, x0, x1}. */
  K.mist = o => {
    const r = rnd(o.seed || 18), g = U(); let out = `<defs>${radU(g, [[0, o.col || '#f2f6f4', o.op || .55], [1, o.col || '#f2f6f4', 0]], .5, .5, .5).replace('gradientUnits="userSpaceOnUse" ', 'gradientUnits="objectBoundingBox" ')}</defs>`;
    for (let i = 0; i < N(o.n || 5); i++) out += M('drift', { ad: sec(rr(r, 40, 70)), d: sec(-rr(r, 0, 40)), dx: R(rr(r, 60, 140)) + 'px' }, `<ellipse cx="${R(rr(r, o.x0 != null ? o.x0 : -100, o.x1 != null ? o.x1 : 1700))}" cy="${R(o.y + rr(r, -o.h * .3, o.h * .3))}" rx="${R(rr(r, 220, 420))}" ry="${R(o.h * rr(r, .4, .7))}" fill="url(#${g})"/>`);
    return out;
  };

  /* ---------- water ---------- */
  /**
   * Water: a gradient body clipped to its shape, the mirrored scene above it (reflect:
   * [{id, y, op}] of drawn groups), drawn ripple lines, a moving shimmer and sparkles.
   * o: {d, y0 (the far shore), y1, cols: [far, mid, near], seed, reflect, lines, shimmer,
   * glints, clip (an id from T.U() to reuse the clip for fish or rings), sky}.
   */
  K.water = o => {
    const g = U(), clip = o.clip || U(), r = rnd(o.seed || 19), y0 = o.y0, y1 = o.y1 || 900, [c0, c1, c2] = o.cols || ['#a9d6d8', '#4f9bb0', '#1f5c78'];
    const sky = `<defs>${linU(g, [[0, c0], [.35, c1], [1, c2]], 0, y0, 0, y1)}<clipPath id="${clip}"><path d="${o.d}"/></clipPath></defs><path fill="url(#${g})" d="${o.d}"/>`;
    let out = (o.keepSky ? K.keep(sky) : sky) + `<g clip-path="url(#${clip})">`;
    for (const m of o.reflect || []) out += M('wobble', { ad: '6s' }, `<use href="#${m.id}" transform="matrix(1 0 0 -1 0 ${R(m.y * 2)})" opacity="${m.op || .35}"/>`);
    let ln = ['', ''];
    for (let i = 0; i < N(o.lines != null ? o.lines : 50); i++) { const y = y0 + Math.pow(r(), 1.4) * (y1 - y0), k = .3 + (y - y0) / (y1 - y0) * 1.4, x = rr(r, -160, 1760); ln[i % 2] += `M${R(x)} ${R(y)}h${R(rr(r, 20, 90) * k)}`; }
    out += S(o.sky || '#e8f6f4', 1.6, ln[0], ' opacity=".35"') + S(mix(c2, '#000', .2), 1.6, ln[1], ' opacity=".25"');
    const sh = ['', '', ''];
    for (let i = 0; i < N(o.shimmer != null ? o.shimmer : 36); i++) { const y = y0 + Math.pow(r(), 1.2) * (y1 - y0), k = .3 + (y - y0) / (y1 - y0) * 1.5; sh[i % 3] += `M${R(rr(r, -100, 1700))} ${R(y)}h${R(rr(r, 10, 40) * k)}`; }
    out += sh.map((d, i) => M('shim', { ad: sec(3 + i * .8), d: sec(-i * 1.1) }, S(o.sky || '#f4fbf8', 2.2, d, ' opacity=".75"'))).join('');
    const gl = ['', ''];
    for (let i = 0; i < N(o.glints || 0); i++) { const x = rr(r, o.gx0 != null ? o.gx0 : 0, o.gx1 != null ? o.gx1 : 1600), y = rr(r, y0 + 4, y0 + (y1 - y0) * .6), k = .6 + (y - y0) / (y1 - y0) * 1.5; gl[i % 2] += `M${R(x)} ${R(y - 5 * k)}l${f2(1.2 * k)} ${f2(3.8 * k)} ${f2(3.8 * k)} ${f2(1.2 * k)}-${f2(3.8 * k)} ${f2(1.2 * k)}-${f2(1.2 * k)} ${f2(3.8 * k)}-${f2(1.2 * k)}-${f2(3.8 * k)}-${f2(3.8 * k)}-${f2(1.2 * k)} ${f2(3.8 * k)}-${f2(1.2 * k)}z`; }
    out += gl.map((d, i) => d ? M('twinkle', { ad: sec(1.8 + i * .9), d: sec(-i * .7) }, P('#ffffff', d)) : '').join('');
    return out + '</g>';
  };
  /** Expanding ripple rings at a point. o: {n, rx, ry, dur, d (delay), col}. */
  K.ripples = (x, y, o = {}) => {
    let out = ''; const n = o.n || 3, dur = o.dur || 4;
    for (let i = 0; i < n; i++) out += M('ring', { ad: sec(dur), d: sec(-(o.d || 0) - i * dur / n) }, `<ellipse cx="${R(x)}" cy="${R(y)}" rx="${R(o.rx || 40)}" ry="${R(o.ry || 8)}" fill="none" stroke="${o.col || '#e8fbf4'}" stroke-width="${o.w || 1.6}"/>`);
    return out;
  };
  /** A fish rising: a leap now and then, rings where it lands. */
  K.fish = (x, y, s, o = {}) => {
    const dur = o.dur || 9, d = o.d || 0, col = o.col || '#8a8a6a';
    return at(x, y, s, M('leap', { ad: sec(dur), d: sec(-d), dx: '46px', dy: '-38px' }, `<path fill="${col}" d="M-18 0q14-12 30-2l9-6-2 8 2 8-9-6q-16 10-30-2z"/><circle cx="-12" cy="-1" r="1.4" fill="#1f2a2a"/><path fill="#c9d6c0" d="M-14 2q12 4 24-1" opacity=".6"/>`) +
      [0, 1, 2].map(i => M('splash', { ad: sec(dur), d: sec(-d + i * .35) }, `<ellipse cx="46" cy="2" rx="${18 + i * 8}" ry="${4 + i * 2}" fill="none" stroke="#eefcf6" stroke-width="1.6"/>`)).join(''), o.flip);
  };

  /* ---------- birds and animals (local art faces right; flip: true faces left) ---------- */
  /** Flying birds, wings flapping. o: {seed, n, x, y, spread, s, col, dx, dy, dur, v (V formation, geese)}. */
  K.flock = o => {
    const r = rnd(o.seed || 20), n = o.n || 5, s0 = o.s || 1, col = o.col || '#2f3d48';
    let inner = '';
    for (let i = 0; i < n; i++) {
      const bx = o.v ? (i % 2 ? -1 : 1) * Math.ceil(i / 2) * -26 * s0 : rr(r, -1, 1) * (o.spread || 120), by = o.v ? Math.ceil(i / 2) * 14 * s0 : rr(r, -.4, .4) * (o.spread || 120), s = s0 * rr(r, .8, 1.1);
      const wing = o.v ? `M${R(-16 * s)} 0Q${R(-8 * s)} ${R(-7 * s)} 0 0Q${R(8 * s)} ${R(-7 * s)} ${R(16 * s)} 0` : `M${R(-14 * s)} ${R(-2 * s)}Q${R(-7 * s)} ${R(-9 * s)} 0 0Q${R(7 * s)} ${R(-9 * s)} ${R(14 * s)} ${R(-2 * s)}`;
      inner += `<g transform="translate(${R(bx)} ${R(by)})">${M('bob', { ad: sec(rr(r, 1.8, 3)), d: sec(-r() * 2), dy: '3px' }, `<ellipse rx="${f2(4 * s)}" ry="${f2(1.8 * s)}" fill="${col}"/>${M('flap', { ad: sec(rr(r, .45, .7)), d: sec(-r()) }, S(col, f2(2.4 * s), wing, ' stroke-linejoin="round"'))}`)}</g>`;
    }
    return `<g transform="translate(${R(o.x)} ${R(o.y)})">${M('glide', { ad: sec(o.dur || 30), d: sec(-(o.d || 0)), dx: (o.dx || 900) + 'px', dy: (o.dy || -60) + 'px' }, inner)}</g>`;
  };
  // Water birds: local art, waterline y 0, about 60 units long.
  const BIRDS = {
    mallard: `<path fill="#cfc7b4" d="M-30 0c-4-11 4-19 18-19l25 2c11 0 17 8 15 17z"/><path fill="#6b4632" d="M14-17c8 2 14 8 14 17h-16z"/><path fill="#3a3a3c" d="M-30 0c-8-4-10-12-4-16l6 6z"/><path fill="#f4f0e4" d="M-33-14q-3-6 3-8l2 6z"/><path fill="#5a6fa0" d="M-12-12h14l-3 5h-12z"/><path fill="#8b8270" d="M-22-14q16-9 34-2-15 8-34 2z"/><g class="hd"><path fill="#1f5a3e" d="M12-15q-2-20 10-22 10 0 8 12l-6 12z"/><path fill="#f6f2e6" d="M13-16h12" stroke="#f6f2e6" stroke-width="2.4"/><path fill="#e8c24a" d="M29-28l11 3-11 3z"/><circle cx="25" cy="-29" r="1.6" fill="#101414"/></g>`,
    female: `<path fill="#a3825c" d="M-30 0c-4-11 4-19 18-19l25 2c11 0 17 8 15 17z"/><path fill="none" stroke="#6e5232" stroke-width="2" stroke-dasharray="3 4" d="M-24-8h38M-20-13h30"/><path fill="#5a6fa0" d="M-12-12h14l-3 5h-12z"/><g class="hd"><path fill="#9a7a54" d="M12-15q-2-20 10-22 10 0 8 12l-6 12z"/><path stroke="#5a4028" stroke-width="2" d="M17-30l11 0"/><path fill="#d9883a" d="M29-28l11 3-11 3z"/><circle cx="25" cy="-30" r="1.6" fill="#101414"/></g>`,
    coot: `<path fill="#2b2e33" d="M-26 0c-4-13 5-20 18-20l20 2c10 1 14 9 12 18z"/><g class="hd"><path fill="#2b2e33" d="M10-14q-2-18 9-19 10 0 9 11l-6 9z"/><path fill="#f4f2ec" d="M26-28l10 4-10 3q-3-4 0-7z"/><circle cx="22" cy="-26" r="1.6" fill="#b02a2a"/></g>`,
    moorhen: `<path fill="#3a3f4a" d="M-24 0c-4-12 4-18 16-18l18 2c9 1 13 8 11 16z"/><path fill="#f4f2ec" d="M-28-10l7 2-7 3zM-14-8h20" stroke="#f4f2ec" stroke-width="1.6"/><g class="hd"><path fill="#3a3f4a" d="M9-13q-2-17 8-18 9 0 8 10l-5 8z"/><path fill="#d0302a" d="M23-26l8 3-8 3q-2-3 0-6z"/><path fill="#f0c23a" d="M30-23.6l4 1-4 1z"/><circle cx="20" cy="-24" r="1.4" fill="#f0e0d0"/></g>`,
    swan: `<path fill="#fbfbf6" d="M-44 0c-8-12-2-26 16-28 10-12 30-8 40 2 12 6 18 16 14 26z"/><path fill="#e8eae2" d="M-34-6q20-16 46-12-14 14-46 12z"/><path fill="none" stroke="#fbfbf6" stroke-width="9" stroke-linecap="round" d="M20-8q14-10 6-30-6-14 6-22"/><g class="hd"><path fill="#fbfbf6" d="M26-62q8-6 14 0l-2 6h-12z"/><path fill="#e07a2a" d="M38-60l12 7-12 1z"/><path fill="#1f1f22" d="M36-61l4-1v6h-4z"/></g>`,
    goose: `<path fill="#8a7a66" d="M-34 0c-6-12 2-22 18-22l26 2c12 1 18 10 16 20z"/><path fill="#f2efe6" d="M-38-6l9 2-9 4z"/><path fill="none" stroke="#6a5a48" stroke-width="2" d="M-26-10h34M-22-15h26"/><path fill="none" stroke="#1f1f22" stroke-width="7" stroke-linecap="round" d="M18-14q8-16 6-30"/><g class="hd"><path fill="#1f1f22" d="M18-46q4-8 12-4l8 5-12 3z"/><path fill="#f2efe6" d="M21-46q3 5 8 3l-3-6z"/></g>`,
  };
  /**
   * A water bird paddling to and fro with a wake (it turns round at each end), bobbing,
   * now and then dipping its head. kind: mallard | female | coot | moorhen | swan | goose.
   * o: {dx (how far it paddles), dur, d (delay), flip, still}.
   */
  K.duck = (kind, x, y, s, o = {}) => {
    const art = BIRDS[kind] || BIRDS.mallard, r = rnd(R(x * 7 + y)), dur = o.dur || rr(r, 26, 40), big = kind === 'swan' || kind === 'goose';
    const wake = `<path fill="none" stroke="#f2fbf6" stroke-width="1.6" opacity=".7" d="M-30 2q-26 4-${big ? 70 : 52} 10M-30 3q-24 0-${big ? 64 : 48} -4"/><ellipse cx="0" cy="2" rx="${big ? 46 : 34}" ry="4" fill="#0d3040" opacity=".22"/>`;
    const body = art.replace('<g class="hd">', `<g class="x-uknpeck" style="--ad:${f2(rr(r, 6, 11))}s;--d:-${f2(rr(r, 0, 6))}s;transform-box:view-box;transform-origin:14px -14px">`);
    const bird = M('wake', { ad: '2.4s' }, wake) + M('bob', { ad: sec(rr(r, 2.4, 3.6)), dy: '1.5px' }, body) + `<path fill="none" stroke="#ffffff" stroke-width="1" opacity=".4" d="M-28 3h50"/>`;
    return at(x, y, s, o.still || !o.dx ? bird : M('pace', { ad: sec(dur), d: sec(-(o.d != null ? o.d : rr(r, 0, dur))), dx: R(o.dx) + 'px' }, bird), o.flip);
  };
  /** A grey heron standing in the shallows, neck slowly turning, now and then a strike. */
  K.heron = (x, y, s, o = {}) => at(x, y, s, `<ellipse cy="2" rx="30" ry="4" fill="#0d3040" opacity=".25"/><path stroke="#c9b06a" stroke-width="3" d="M-4 0v-52M6 0l-2-52"/><path fill="#9aa4ac" d="M-26-58q4-30 30-34 22 0 20 22l-6 18q-20 10-44-6z"/><path fill="#5d6870" d="M-30-62q6-18 22-22-4 22-22 22z"/><path fill="#3a4048" d="M-32-58l-12 8 14-2z"/>` +
    M('look', { ad: sec(o.dur || 12), to: '10px -84px' }, `<path fill="none" stroke="#dfe4e6" stroke-width="7" stroke-linecap="round" d="M12-84q10-20-2-36q-8-12 6-24"/><path fill="#e8ecee" d="M10-150q8-8 16 0l-2 8h-12z"/><path fill="#e6b84a" d="M24-148l26 4-26 4z"/><path stroke="#20262c" stroke-width="2.4" d="M14-150l-14 6"/><circle cx="19" cy="-148" r="1.6" fill="#101414"/>`) + K.ripples(0, 2, { rx: 26, ry: 4, n: 2, dur: 6 }), o.flip);
  /** A roe deer: grazes, lifts its head, flicks an ear. o: {season, flip, still}. */
  K.deer = (x, y, s, o = {}) => {
    s = depthS(y, s, 90, .8);
    const coat = o.season === 'winter' ? '#7d6a58' : '#a8643a', dark = o.season === 'winter' ? '#5a4a3c' : '#7a4428';
    return at(x, y, s, `<ellipse cy="2" rx="46" ry="6" fill="#1f2a1e" opacity=".22"/>` +
      `<path stroke="${dark}" stroke-width="4" stroke-linecap="round" d="M-26-30l-3 30M-18-30l2 30M18-30l-3 30M26-30l3 30"/><path fill="${coat}" d="M-34-38q2-18 28-18h26q16 2 16 18-4 14-18 14h-34q-20-2-18-14z"/><path fill="#f2ead8" d="M-36-40q-6 6-2 14l6-4z"/><path fill="${dark}" d="M-30-50q20-8 50-2-10 4-50 2z" opacity=".5"/>` +
      M('graze', { ad: sec(o.dur || 9), d: sec(-(o.d || 0)), to: '28px -46px' }, `<path fill="${coat}" d="M22-50q8-22 16-34l10 4-6 32z"/><g transform="translate(40 -86)"><path fill="${coat}" d="M-6 0q4-10 14-8l16 8q2 6-6 8l-18-2z"/><circle cx="24" cy="2" r="2.4" fill="#1f1a18"/><circle cx="8" cy="-2" r="1.6" fill="#101010"/>${M('ear', { ad: '3.4s', d: sec(-(o.d || 0)), to: '0px -6px' }, `<path fill="${dark}" d="M-2-6l-6-12 10 8zM4-8l2-13 6 11z"/>`)}</g>`), o.flip);
  };
  /** A rabbit: hops a little way, stops to nibble, hops back; ears twitch. o: {dx, dur, flip, still, col}. */
  K.rabbit = (x, y, s, o = {}) => {
    [s, o] = deep(y, s, 22, .22, o);
    const c = o.col || '#8a7660', d2 = mix(c, '#000', .25);
    const art = `<ellipse cy="1" rx="18" ry="3" fill="#1f2a1e" opacity=".22"/><path fill="${c}" d="M-16 0q-6-20 10-22 14-2 18 12l-2 10z"/><circle cx="-16" cy="-8" r="5" fill="#f4f0e6"/><path fill="${c}" d="M6-16q2-12 12-10 8 4 4 14l-10 4z"/><circle cx="16" cy="-17" r="1.4" fill="#1a1410"/>` +
      M('ear', { ad: sec(2.6 + (x % 3) * .4), to: '10px -24px' }, `<path fill="${d2}" d="M8-24q-4-16 2-18 4 2 2 18zM12-24q2-15 8-15 2 4-4 16z"/>`) + `<path fill="${d2}" d="M0-2h10l2 2H-2z"/>`;
    return at(x, y, s, o.still || !o.dx ? art : M('hop', { ad: sec(o.dur || 14), d: sec(-(o.d || 0)), dx: R(o.dx) + 'px' }, art), o.flip);
  };
  /** A grey squirrel sitting up, nibbling, tail flicking. */
  K.squirrel = (x, y, s, o = {}) => at(x, y, s, `<ellipse cy="1" rx="16" ry="3" fill="#1f2a1e" opacity=".22"/>` + M('tail', { ad: '2.8s', to: '-8px -4px' }, `<path fill="#9a948c" d="M-8-4q-24-4-22-26 2-18 16-14 8 4 2 12-8-6-8 4 0 12 14 18z"/><path fill="none" stroke="#c9c2b6" stroke-width="2" d="M-26-26q2-12 12-10"/>`) +
    `<path fill="#8a847c" d="M-8 0q-4-22 8-26 12 0 10 18l-4 8z"/><path fill="#ece6da" d="M2-20q6 6 2 18h-4z"/>` + M('nibble', { ad: '1.6s', to: '6px -24px' }, `<path fill="#8a847c" d="M2-24q0-12 10-10 6 4 2 12z"/><path fill="#8a847c" d="M4-33l2-5 3 5z"/><circle cx="10" cy="-29" r="1.3" fill="#141010"/><circle cx="14" cy="-22" r="2.6" fill="#7a5a34"/>`), o.flip);
  /** A robin on a post or branch: bobs, tilts its head. */
  K.robin = (x, y, s, o = {}) => at(x, y, s, M('peck', { ad: sec(o.dur || 5), to: '0px 0px' }, `<path fill="#8a6a4e" d="M-12-2q-6-16 8-20 14-2 16 12l-4 10z"/><path fill="#e2643a" d="M2-18q10 2 8 14-8 4-12-6z"/><path fill="#efe6d4" d="M-4-2q8 2 12-4"/><path fill="#6a4e38" d="M-12-6l-10 4 10 2z"/><circle cx="6" cy="-18" r="1.3" fill="#141010"/><path fill="#3a2e24" d="M12-17l5 1-5 2z"/>`) + `<path stroke="#5a4a3a" stroke-width="1.4" d="M-3 0v4M3 0v4"/>`, o.flip);
  /** A butterfly wandering, wings flapping. kind: brimstone | admiral | peacock | blue | orangetip | tortoiseshell. o: {dx, dy, dur}. */
  K.butterfly = (x, y, s, o = {}) => {
    const C = { brimstone: ['#f1e45a', '#d9c63a'], admiral: ['#24242a', '#d8402a'], peacock: ['#9a2a24', '#3a5aa8'], blue: ['#7a9fe6', '#c9d8f6'], orangetip: ['#f6f4ee', '#ef8a2a'], tortoiseshell: ['#e2742a', '#2a2a2e'] }[o.kind || 'brimstone'] || ['#f1e45a', '#d9c63a'];
    const r = rnd(R(x + y * 3));
    return at(x, y, s, M('flit', { ad: sec(o.dur || rr(r, 10, 16)), d: sec(-rr(r, 0, 10)), dx: R(o.dx || 160) + 'px', dy: R(o.dy || 50) + 'px' }, M('wing', { ad: sec(rr(r, .28, .4)) }, `<path fill="${C[0]}" d="M0 0q-16-20-20-6 0 8 20 6zM0 0q16-20 20-6 0 8-20 6zM0 1q-12 12-14 4 0-6 14-4zM0 1q12 12 14 4 0-6-14-4z"/><path fill="${C[1]}" d="M-14-9a3 3 0 1 0 1 0zM14-9a3 3 0 1 0 1 0z"/>`) + `<path stroke="#2a2422" stroke-width="1.6" stroke-linecap="round" d="M0-5v10M0-5l-3-5M0-5l3-5"/>`), o.flip);
  };
  /** A dragonfly darting between hover points over water or reeds. o: {col, dx, dy, dur}. */
  K.dragonfly = (x, y, s, o = {}) => {
    const c = o.col || '#2f8ac6', r = rnd(R(x * 3 + y));
    return at(x, y, s, M('dart', { ad: sec(o.dur || rr(r, 7, 11)), d: sec(-rr(r, 0, 8)), dx: R(o.dx || 120) + 'px', dy: R(o.dy || 40) + 'px' }, M('buzz', { ad: '.12s' }, `<path fill="#e6f6fa" opacity=".7" d="M-2-2q-10-14-24-12 4 8 24 12zM2-2q10-14 24-12-4 8-24 12zM-2 1q-12-2-22 8 10 2 22-8zM2 1q12-2 22 8-10 2-22-8z"/>`) + `<path stroke="${c}" stroke-width="3" stroke-linecap="round" d="M0-4v30"/><circle cy="-6" r="3.4" fill="${mix(c, '#000', .3)}"/>`), o.flip);
  };
  /** A bumblebee buzzing about flowers. */
  K.bee = (x, y, s, o = {}) => {
    const r = rnd(R(x + y * 5));
    return at(x, y, s, M('dart', { ad: sec(o.dur || rr(r, 6, 9)), d: sec(-rr(r, 0, 6)), dx: R(o.dx || 60) + 'px', dy: R(o.dy || -24) + 'px' }, M('buzz', { ad: '.1s' }, `<ellipse cx="-3" cy="-7" rx="6" ry="3.4" fill="#eef8fa" opacity=".8"/><ellipse cx="3" cy="-7" rx="6" ry="3.4" fill="#eef8fa" opacity=".8"/>`) + `<ellipse rx="7.5" ry="5.5" fill="#2a2420"/><path stroke="#f2c23a" stroke-width="2.6" d="M-2-5v10M3-5v10"/><path fill="#f6f2ea" d="M-7.5 0q-2-3 1-5l1 5z"/>`), o.flip);
  };

  /** Pipistrelle bats flitting at dusk and after dark (they fly erratically in a loop). o: {seed, n, x, y, spread, s}. */
  K.bats = o => {
    const r = rnd(o.seed || 24); let out = '';
    // a centre and spread ({x, y, spread}) or a box ({x0, x1, y0, y1}); n: 0 draws none
    const box = o.x == null && o.x0 != null, cx = box ? (o.x0 + o.x1) / 2 : o.x == null ? 800 : o.x, cy = box ? (o.y0 + (o.y1 == null ? o.y0 : o.y1)) / 2 : o.y == null ? 360 : o.y;
    const sx = box ? (o.x1 - o.x0) / 2 : o.spread || 200, sy = box ? (o.y1 == null ? 0 : o.y1 - o.y0) / 2 : .4 * (o.spread || 200);
    for (let i = 0; i < (o.n == null ? 3 : o.n); i++) {
      const s = (o.s || 1) * rr(r, .8, 1.2), x = cx + rr(r, -1, 1) * sx, y = cy + rr(r, -1, 1) * sy;
      const wing = S(o.col || '#1c1a22', f2(2.2 * s), `M${R(-11 * s)} ${R(-3 * s)}q${R(5 * s)} ${R(-6 * s)} ${R(11 * s)} ${R(3 * s)}q${R(6 * s)} ${R(-9 * s)} ${R(11 * s)} ${R(-3 * s)}`, ' stroke-linejoin="round"');
      out += at(x, y, 1, M('flit', { ad: sec(rr(r, 5, 8)), d: sec(-rr(r, 0, 6)), dx: R(rr(r, 120, 260)) + 'px', dy: R(rr(r, 40, 90)) + 'px' }, M('flap', { ad: sec(rr(r, .16, .24)) }, wing) + `<ellipse rx="${f2(2.6 * s)}" ry="${f2(1.8 * s)}" fill="${o.col || '#1c1a22'}"/>`));
    }
    return out;
  };
  /** A tawny owl on a branch: turns its head now and then. */
  K.owl = (x, y, s, o = {}) => at(x, y, s, `<path fill="#7a5a3a" d="M-12 0q-6-24 4-34 8-6 16 0 10 10 4 34z"/><path fill="none" stroke="#5a4028" stroke-width="2" d="M-6-12q6 4 12 0M-6-20q6 4 12 0"/>` + M('look', { ad: sec(o.dur || 9), to: '0px -34px' }, `<circle cy="-38" r="11" fill="#8a6a46"/><circle cx="-4.5" cy="-39" r="3.4" fill="#f0e4c8"/><circle cx="4.5" cy="-39" r="3.4" fill="#f0e4c8"/><circle cx="-4.5" cy="-39" r="1.6" fill="#141010"/><circle cx="4.5" cy="-39" r="1.6" fill="#141010"/><path fill="#e0b050" d="M-1.4-35h2.8l-1.4 3z"/>`), o.flip);
  /** Moths circling a lamp (after dark). */
  K.moths = (x, y, o = {}) => { const r = rnd(R(x + y)); let out = ''; for (let i = 0; i < (o.n == null ? 4 : o.n); i++) out += M('flit', { ad: sec(rr(r, 2.5, 4)), d: sec(-rr(r, 0, 3)), dx: R(rr(r, -30, 30)) + 'px', dy: R(rr(r, -20, 20)) + 'px' }, `<circle cx="${R(x + rr(r, -16, 16))}" cy="${R(y + rr(r, -12, 12))}" r="1.8" fill="#f2ead8"/>`); return K.keep(out); };

  /* ---------- people (walking-leg animation; plain figures, no faces) ---------- */
  const SKIN = ['#e8bfa0', '#c98e6a', '#9a6444', '#6e4630', '#f0cdb0'];
  /**
   * Depth scale: figures and animals stand on the ground plane, so their height follows their
   * foot y below the horizon of the scene's light (K.live). size0: the art's height at s 1;
   * k: the creature's height as a share of an adult's. Returns the larger of the authored s and
   * the perspective one (a person about 14 units tall at the horizon, ~110 at the bottom edge).
   */
  const depthS = (y, s, size0, k = 1) => {
    const hz = LV && Number.isFinite(LV.horizon) ? LV.horizon : 500, t = clamp((y - hz) / Math.max(120, 900 - hz), 0, 1);
    return Math.max(s, (14 + 100 * Math.pow(t, 1.05)) * k / size0);
  };
  K.depth = depthS;
  /** Rescale a figure for depth, keeping its walk (dx, dy, in scene units) the same length. */
  const deep = (y, s, size0, k, o) => { const s2 = depthS(y, s, size0, k), f = s / s2; return [s2, f === 1 ? o : Object.assign({}, o, { dx: o.dx != null ? o.dx * f : o.dx, dy: o.dy != null ? o.dy * f : o.dy })]; };
  /** One swinging limb from (0, y0): legs and arms swing in opposite phases; end: a shoe or hand colour. */
  const limb = (cls, y0, len, col, dur, w, phase, bent, end) => M(cls, { ad: sec(dur), d: sec(-phase * dur), to: `0px ${R(y0)}px` },
    S(col, w, bent ? `M0 ${R(y0)}l${R(len * .3)} ${R(len * .55)}l${R(len * .45)} ${-R(len * .3)}` : `M0 ${R(y0)}l1 ${R(len)}`, ' stroke-linecap="round"') +
    (!end ? '' : cls === 'leg' ? S(end, f2(w * .9), `M${f1(-w * .2)} ${R(y0 + len - w * .3)}h${f1(w * 1.1)}`, ' stroke-linecap="round"') : bent ? '' : `<circle cx="1" cy="${R(y0 + len + w * .2)}" r="${f2(w * .5)}" fill="${end}"/>`));
  const figure = (r, o, kid) => {
    const coat = o.coat || pick(r, ['#c0583a', '#3a6a8a', '#5a7a4a', '#8a4a6a', '#d0a040', '#4a4a5a', '#2f5a5a', '#b8b0a0', '#6a3a3a']), trou = o.trousers || pick(r, ['#2f3640', '#4a5a6a', '#5a4a3a', '#3a4a6a', '#6a6458']);
    const skin = o.skin || pick(r, SKIN), dur = o.step || (kid ? .55 : .8), k = kid ? .62 : 1, shoe = pick(r, ['#2a2422', '#5a3a26', '#e8e4dc', '#3a3a44']);
    const h = 64 * k, hip = -h * .45, sh = -h * .8, hair = pick(r, ['#3a2a20', '#6a4a2a', '#c9a060', '#1f1a18', '#8a8a8a', '#a0522d']), bent = !!o.bent, long = r() < .4, pack = !kid && r() < .3;
    const scarf = r() < .45 ? pick(r, ['#d8b040', '#b03a3a', '#e8e0d0', '#3a6aa0', '#7a9a4a']) : null, dk = mix(coat, '#000', .3), lit = mix(coat, '#fff', .18);
    const torso = `M${R(-7 * k)} ${R(hip + 4)}q${R(-1 * k)} ${R(-h * .3)} ${R(3 * k)} ${R(-h * .38)}h${R(9 * k)}q${R(4 * k)} ${R(h * .1)} ${R(3 * k)} ${R(h * .38)}z`;
    const body = (pack ? `<rect x="${R(-11 * k)}" y="${R(sh + 2)}" width="${R(6 * k)}" height="${R(h * .26)}" rx="${R(2 * k)}" fill="${pick(r, ['#3a3a44', '#6a5a3a', '#2a4a6a'])}"/>` : '') +
      (long ? `<path fill="${hair}" d="M${R(-5.6 * k)} ${R(sh - 8 * k)}q${R(-2 * k)} ${R(8 * k)} ${R(-1 * k)} ${R(13 * k)}h${R(5 * k)}z"/>` : '') +
      limb('arm', sh + 3, h * .34, dk, dur, 4.4 * k, 0, bent, mix(skin, '#000', .15)) + limb('leg', hip, -hip, mix(trou, '#000', .25), dur, 5.2 * k, .5, false, shoe) +
      `<path fill="${coat}" d="${torso}"/><path fill="${dk}" opacity=".45" d="M${R(2 * k)} ${R(hip + 4)}q${R(3 * k)} ${R(-h * .2)} ${R(2 * k)} ${R(-h * .37)}h${R(1.6 * k)}q${R(4 * k)} ${R(h * .1)} ${R(3 * k)} ${R(h * .37)}z"/>` +
      S(lit, f2(1.1 * k), `M${R(-5 * k)} ${R(sh + 4)}v${R(h * .26)}`, ' opacity=".5"') +
      limb('leg', hip, -hip, trou, dur, 5.2 * k, 0, false, shoe) + limb('arm', sh + 3, h * .34, coat, dur, 4.4 * k, .5, bent, skin) +
      (scarf ? `<path fill="${scarf}" d="M${R(-4.5 * k)} ${R(sh + 1)}h${R(10 * k)}l${R(-1 * k)} ${R(3.4 * k)}h${R(-8 * k)}z"/>` : '') +
      `<path fill="${mix(skin, '#000', .12)}" d="M${R(-1.6 * k)} ${R(sh - 2 * k)}h${R(3.4 * k)}v${R(3 * k)}h${R(-3.4 * k)}z"/><circle cy="${R(sh - 7 * k)}" r="${f2(5.6 * k)}" fill="${skin}"/>` +
      (o.hat ? `<path fill="${o.hat}" d="M${R(-6 * k)} ${R(sh - 9 * k)}q${R(6 * k)} ${R(-9 * k)} ${R(12 * k)} 0z"/>` : `<path fill="${hair}" d="M${R(-5.8 * k)} ${R(sh - 6 * k)}q${R(1 * k)} ${R(-8 * k)} ${R(7 * k)} ${R(-7 * k)}q${R(5 * k)} ${R(1 * k)} ${R(4.6 * k)} ${R(5 * k)}z"/>`);
    return `<ellipse cy="1" rx="${R(12 * k)}" ry="2.4" fill="#1f2a1e" opacity=".25"/>` + (o.lean ? `<g transform="rotate(${o.lean})">${body}</g>` : body);
  };
  const dog = (r, o) => {
    const c = o.dogCol || pick(r, ['#c9a46a', '#2a2420', '#8a5a34', '#e8e0d0', '#1a1a1a']), d = mix(c, '#000', .3), dur = .42, patch = r() < .5 ? `<path fill="${pick(r, ['#f2ece0', '#2a2420'])}" opacity=".85" d="M2-19q6-2 8 4l-2 5h-6z"/>` : '';
    return `<g transform="translate(26 0)"><ellipse cy="1" rx="14" ry="2" fill="#1f2a1e" opacity=".25"/>` + M('leg', { ad: sec(dur), to: '-9px -10px' }, S(d, 3, 'M-9-10v10M9-10v10', ' stroke-linecap="round"')) + M('leg', { ad: sec(dur), d: sec(-dur / 2), to: '-6px -10px' }, S(c, 3, 'M-6-10v10M12-10v10', ' stroke-linecap="round"')) +
      `<path fill="${c}" d="M-12-10q-2-10 8-10h12q6 0 6 8l-4 4h-20z"/>${patch}<path fill="${c}" d="M12-16q2-10 10-8l5 4-1 4-9 2z"/><path fill="#1a1414" d="M26-20l2 2-2 1z"/><path fill="${d}" d="M15-22q-1 6 3 9l3-8z"/><circle cx="21" cy="-18" r="1.2" fill="#101010"/><path stroke="#b03030" stroke-width="1.6" d="M13-17l3 5"/>` + M('wag', { ad: '.35s', to: '-12px -14px' }, S(c, 3, 'M-12-14q-6-4-8-12', ' stroke-linecap="round"')) + `</g>`;
  };
  /**
   * A walker (with a dog on a lead: o.dog), striding there and back along a path. Scaled up for
   * depth (K.depth) so people near the viewer read clearly.
   * o: {dx, dy, dur, d, coat, trousers, skin, hat, dog, dogCol, flip, still, seed}.
   */
  K.walker = (x, y, s, o = {}) => {
    [s, o] = deep(y, s, 64, 1, o);
    const r = rnd(o.seed || R(x * 5 + y));
    let art = figure(r, o) + (o.dog ? dog(r, o) + `<path fill="none" stroke="#3a2e28" stroke-width="1" d="M8-22q14 8 30 4"/>` : '');
    art = M('step', { ad: sec((o.step || .8) / 2), dy: '-1.5px' }, art);
    return at(x, y, s, o.still || !o.dx ? art : M('pace', { ad: sec(o.dur || 40), d: sec(-(o.d || rr(r, 0, 30))), dx: R(o.dx) + 'px', dy: R(o.dy || 0) + 'px' }, art), o.flip);
  };
  /** A jogger: quicker stride, bent arms, a bounce. Same options as walker. */
  K.jogger = (x, y, s, o = {}) => K.walker(x, y, s, Object.assign({ step: .5, dur: (o.dur || 24), bent: true, lean: 7 }, o, { dog: false }));
  /** A family walking together: two adults and a child. */
  K.family = (x, y, s, o = {}) => {
    [s, o] = deep(y, s, 64, 1, o);
    const r = rnd(o.seed || R(x * 3 + y * 11));
    const art = `<g transform="translate(-30 0)">${figure(r, {})}</g>` + `<g transform="translate(-4 2)">${figure(r, {}, true)}</g>` + `<g transform="translate(18 0)">${figure(r, { hat: o.hat })}</g>` + (o.dog ? `<g transform="translate(14 0)">${dog(r, o)}</g>` : '');
    const body = M('step', { ad: '.4s', dy: '-1px' }, art);
    return at(x, y, s, o.still || !o.dx ? body : M('pace', { ad: sec(o.dur || 60), d: sec(-(o.d || 0)), dx: R(o.dx) + 'px', dy: R(o.dy || 0) + 'px' }, body), o.flip);
  };
  /** A cyclist: wheels and pedals turning, riding there and back. */
  K.cyclist = (x, y, s, o = {}) => {
    [s, o] = deep(y, s, 66, 1, o);
    const r = rnd(o.seed || R(x + y * 9)), coat = o.coat || pick(r, ['#d0402a', '#2a6aa0', '#f0c030', '#3a8a5a']), skin = o.skin || pick(r, SKIN);
    const wheel = cx => M('spin', { ad: '.9s', to: `${cx}px -14px` }, `<circle cx="${cx}" cy="-14" r="14" fill="none" stroke="#2a2a2e" stroke-width="2.6"/><path stroke="#9a9aa0" stroke-width="1" d="M${cx - 13} -14h26M${cx} -27v26M${cx - 9} -23l18 18M${cx - 9} -5l18-18"/>`);
    const art = `<ellipse cy="1" rx="34" ry="3" fill="#1f2a1e" opacity=".25"/>` + wheel(-20) + wheel(22) + S('#3a5a7a', 2.6, 'M-20-14l14-2 10-18M-6-16l28 2-8-20M-12-36h12M14-36h8', ' stroke-linejoin="round"') +
      M('spin', { ad: '.9s', to: '-6px -16px' }, S('#2f3640', 4.4, 'M-6-16l0 10M-6-16l0-10')) + S('#2f3640', 5, 'M-2-42l-4 26') + `<path fill="${coat}" d="M-6-40q6-18 22-16l4 4-14 16z"/>` + S(coat, 4, 'M10-52l10 14') + `<circle cx="18" cy="-60" r="5.4" fill="${skin}"/><path fill="#2a2a2e" d="M12-62q6-10 13-2z"/>`;
    return at(x, y, s, o.still || !o.dx ? art : M('pace', { ad: sec(o.dur || 22), d: sec(-(o.d || rr(r, 0, 20))), dx: R(o.dx) + 'px', dy: R(o.dy || 0) + 'px' }, art), o.flip);
  };

  /* ---------- the canal ---------- */
  /**
   * A narrowboat (no lettering): long hull, painted cabin with coachlines, portholes, roof
   * with plant pots, chimney smoke. o: {col (cabin), trim, move: 'moored' | 'cruise', dx, dur, lit, smoke}.
   */
  K.narrowboat = (x, y, s, o = {}) => {
    const c = o.col || '#2f5a46', trim = o.trim || '#e9c86a', r = rnd(R(x + y));
    let ports = ''; for (let i = 0; i < 9; i++) ports += `<circle cx="${-150 + i * 34}" cy="-34" r="6.5" fill="#cfe0e0" stroke="${trim}" stroke-width="2.4"/>`;
    const lit = o.lit ? Array.from({ length: 9 }, (_, i) => `<circle class="hx-lit" cx="${-150 + i * 34}" cy="-34" r="5.5"/>`).join('') : '';
    const boat = `<path fill="#0f1a1c" opacity=".3" d="M-230 6h470l-20 10h-430z"/><path fill="#1f2628" d="M-236-14h470q10 0 4 10l-14 18h-436q-12-6-24-28z"/><path fill="#3a2a22" d="M-236-14h470v5h-470z"/><path fill="${c}" d="M-190-14v-44h330l14 10v34z"/><path fill="${mix(c, '#000', .25)}" d="M-190-24h344v10h-344z"/><path fill="none" stroke="${trim}" stroke-width="2" d="M-186-52h322M-186-20h336"/><path fill="${mix(c, '#fff', .15)}" d="M-196-58h340l8 4h-356z"/>${ports}${lit}<path fill="#b0402a" d="M154-58h40v44h-40z"/><path fill="none" stroke="${trim}" stroke-width="2" d="M158-54h32v36h-32z"/>` +
      `<path fill="#3a2e28" d="M-140-64h12v-6h-12zM-40-62h40v4h-40z"/><path fill="#4a8a3a" d="M-142-70q6-12 16 0zM-38-62q10-16 20-4 10-12 18 4z"/><circle cx="-34" cy="-68" r="3" fill="#e05a6a"/><circle cx="-22" cy="-70" r="3" fill="#f0c040"/><circle cx="-10" cy="-66" r="3" fill="#e05a6a"/>` +
      `<path fill="#2a2a2e" d="M100-58h10v-26h-10z"/><path fill="none" stroke="${trim}" stroke-width="2" d="M100-78h10M100-70h10"/><path fill="none" stroke="#3a2e28" stroke-width="3" d="M226-14q16-16 8-30"/><path fill="none" stroke="#d8cdb8" stroke-width="2.4" d="M-224-14q-8-12 4-18"/>`;
    const smoke = o.smoke === false ? '' : `<g transform="translate(105 -86)">${T.puffs ? T.puffs(0, 0, 5, '#e8e4e0', 8, -60, 6, -160, 3.4) : ''}</g>`;
    const wake = M('wake', { ad: '3s' }, `<path fill="none" stroke="#eefaf6" stroke-width="2" opacity=".6" d="M-240 4q-40 4-90 14M-240 6q-30 0-70-6"/>`);
    const art = M('bob', { ad: '5s', dy: '1.2px' }, boat + smoke) + (o.move === 'cruise' ? wake : '');
    return at(x, y, s, o.move === 'cruise' && o.dx ? M('glide', { ad: sec(o.dur || 120), d: sec(-(o.d || rr(r, 0, 100))), dx: R(o.dx) + 'px', dy: '0px' }, art) : art, o.flip);
  };

  /* ---------- seasonal particles ---------- */
  /**
   * Falling leaves, petals or seeds that tumble and fade. o: {seed, n, x0, x1, y0, y1, dy (fall),
   * dx (drift), cols, size, kind: 'leaf' | 'petal' | 'seed', dur: [min, max]}.
   */
  K.falling = o => {
    const r = rnd(o.seed || 21); let out = ''; const [d0, d1] = o.dur || [9, 15];
    for (let i = 0; i < N(o.n || 8); i++) {
      const x = rr(r, o.x0, o.x1), y = rr(r, o.y0, o.y1), sz = (o.size || 12) * rr(r, .7, 1.2), c = pick(r, o.cols || ['#d9902a', '#c0602a', '#e8b84a']);
      const shape = o.kind === 'petal' ? `<ellipse cx="${R(x)}" cy="${R(y)}" rx="${f2(sz * .4)}" ry="${f2(sz * .25)}" fill="${c}"/>` : o.kind === 'seed' ? `<circle cx="${R(x)}" cy="${R(y)}" r="${f2(sz * .18)}" fill="${c}" opacity=".8"/>` : P(c, leafD(x, y, rr(r, 0, 6.3), sz));
      out += M('fall', { ad: sec(rr(r, d0, d1)), d: sec(-rr(r, 0, d1)), dx: R((o.dx || 80) * rr(r, .4, 1.3) * (r() < .3 ? -1 : 1)) + 'px', dy: R((o.dy || 400) * rr(r, .8, 1.1)) + 'px' }, shape);
    }
    return out;
  };
  /** Petals on the breeze (spring), drifting across. */
  K.petals = o => K.falling(Object.assign({ kind: 'petal', cols: PAL.spring.blossom, dx: 260, dy: 260, size: 11 }, o));
  /** Floating pollen, seeds or midges in the light. */
  K.motes = o => K.falling(Object.assign({ kind: 'seed', cols: ['#fff8e0', '#fff2c8'], dx: 120, dy: -120, size: 14, dur: [10, 18] }, o));
  /**
   * Snow falling without a seam: each layer is a tile repeated one screen up, falling one
   * screen per loop, swaying a little. o: {seed, n (per layer), layers, col, dur}.
   */
  K.snow = o => {
    const r = rnd(o.seed || 22); let out = ''; const L = o.layers || 3;
    for (let l = 0; l < L; l++) {
      let d = ''; const sz = 1.4 + l * 1.3;
      for (let i = 0; i < N(o.n || 40); i++) { const x = rr(r, -160, 1760), y = rr(r, 0, 900); d += circ(x, y, sz * rr(r, .7, 1.2)) + circ(x, y - 900, sz * rr(r, .7, 1.2)); }
      out += M('sway', { ad: sec(5 + l * 1.5), d: sec(-l), dx: (8 + l * 6) + 'px' }, M('snow', { ad: sec((o.dur || 26) - l * 6), d: sec(-l * 4) }, P(o.col || '#ffffff', d, ` opacity="${(.55 + l * .15).toFixed(2)}"`)));
    }
    return out;
  };
  /** Rain without a seam, slanting. o: {seed, n, layers, slant (deg), col, op}. */
  K.rain = o => {
    const r = rnd(o.seed || 23); let out = ''; const L = o.layers || 2;
    for (let l = 0; l < L; l++) {
      let d = ''; const len = 18 + l * 10;
      for (let i = 0; i < N(o.n || 70); i++) { const x = rr(r, -360, 1760), y = rr(r, 0, 900); d += `M${R(x)} ${R(y)}v${len}M${R(x)} ${R(y - 900)}v${len}`; }
      out += `<g transform="skewX(${-(o.slant != null ? o.slant : 12)})">${M('snow', { ad: sec(1.1 - l * .3), d: sec(-l * .4) }, S(o.col || '#dfeaf2', 1 + l * .5, d, ` opacity="${o.op || .45}"`))}</g>`;
    }
    return out;
  };

  /* ---------- live sky and light: one model every rich scene draws with ---------- */
  // The registry hands a live scene o.sky = almSceneLight(clock, location, zone) (+ o.sky.wx, the
  // weather now, when the page has it). K.live turns that into everything the art needs: where the
  // sun and moon stand IN THIS VIEW (azimuth mapped across the view's heading and field of view,
  // altitude to height above its horizon), the sky, light, shade and cloud colours for the real
  // solar altitude, shadow direction and length, the moon's real phase and tilt, star density by
  // darkness, lamps and windows at real dusk, water colours that reflect the sky, wind strength.
  // Without a sky (gallery QA, tests, no location) it draws the view's authored moment (v.at) on
  // a fixed date in the scene's season at the place's own coordinates: deterministic.
  let LV = null;   // the light of the scene being drawn (set by K.live inside K.scene)
  const SEASON_DAY = { spring: '2027-04-22', summer: '2026-07-08', autumn: '2026-10-14', winter: '2027-01-20' };
  /** Sky and light by the sun's altitude (degrees): interpolated between these keys. */
  const SKY_KEYS = [
    // alt, top, mid, low (sun side), low (away), shade (multiply), shadeOp, light, haze, cloud [shade, body, lit]
    [-90, '#050a17', '#0a1226', '#121b33', '#121b33', '#121a3c', .8, '#7f93c8', '#1c2440', ['#0e1426', '#182036', '#222c48']],
    [-15, '#070e20', '#0e1830', '#1c2744', '#18223e', '#151d44', .78, '#8296cc', '#232c4a', ['#121a30', '#1d263f', '#2a3452']],
    [-9, '#0f1d40', '#22356a', '#4a4f7e', '#2c3a66', '#232c5a', .7, '#8a92c8', '#3a4672', ['#1d2648', '#2c3760', '#46507a']],
    [-4.5, '#213a72', '#4f6aa6', '#d6886e', '#8a7aa6', '#4a4a86', .52, '#c08aa0', '#8a7f9e', ['#3a3f6a', '#8a7090', '#e09a8a']],
    [-1, '#2d4c8a', '#7f8fbf', '#ff9e5e', '#d39aac', '#9a6a80', .34, '#ff9a5a', '#d6a0a0', ['#6a5a7a', '#d0909a', '#ffb07a']],
    [2.5, '#3a64a4', '#a2b2d2', '#ffbe72', '#e6b8bc', '#d8946a', .22, '#ffb066', '#efc2a4', ['#9a8090', '#f2c0aa', '#ffd8a0']],
    [8, '#3c74b6', '#a6c4e0', '#ffdca4', '#e2dcdc', '#ffc890', .1, '#ffd49a', '#ecdcc8', ['#b0b0c0', '#f6e4d6', '#fff2dc']],
    [18, '#3a80c4', '#98c4e4', '#eaeee6', '#dce9ef', '#fff0dc', .03, '#fff0d4', '#d6e2e6', ['#c0cfe0', '#f2f5f8', '#ffffff']],
    [90, '#2c74bf', '#88bde4', '#dcebf2', '#d6e7f0', '#ffffff', 0, '#fffaf0', '#cfdfe6', ['#c4d3e3', '#f4f7fa', '#ffffff']],
  ];
  const skyAt = alt => {
    let i = 0; while (i < SKY_KEYS.length - 2 && alt > SKY_KEYS[i + 1][0]) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1), m = (j) => mix(a[j], b[j], t);
    return { top: m(1), mid: m(2), lowSun: m(3), lowAway: m(4), shade: m(5), shadeOp: a[6] + (b[6] - a[6]) * t, light: m(7), haze: m(8), cloud: a[9].map((c, j) => mix(c, b[9][j], t)) };
  };
  const WX = { clear: [.08], partly: [.45], cloudy: [.92], fog: [.85, 'fog'], drizzle: [.88, 'rain'], rain: [.92, 'rain'], showers: [.62, 'rain'], snow: [.9, 'snow'], thunder: [.95, 'rain'] };
  const wrap = a => ((a + 540) % 360) - 180;
  /**
   * The light model for one view. o: the svg options (o.sky from the registry); v: the view
   * {heading (compass degrees the view looks toward; default 180), fov (horizontal degrees across
   * 1600 units; default 80), horizon (y of the true horizon; default 560), lift (vertical degrees
   * scale, default 1), lat, lon (the place; default Yateley), season, at (the authored moment
   * without a live sky: dawn | morning | day | afternoon | golden | sunset | dusk | night)}.
   * Returns L: {live, ms, alt (sun), az, tod, phase, morning, dark (0 day .. 1 night), sun: {x, y,
   * show, rel}, moon: {x, y, show, illum, frac, waxing, limb}, top, mid, low, light, shade,
   * shadeOp, haze, cloud [shade, body, lit], cover (cloud 0..1), rain, snow, fog, wind (0.4..1.8),
   * stars (0..1), lamps, windows, side (-1 light from the left | 1 right), backlit (0..1),
   * shadow {dx, dy, op} per unit height, water [far, mid, near], px(az, alt)}.
   */
  K.live = (o = {}, v = {}) => {
    const lat = v.lat != null ? v.lat : 51.34, lon = v.lon != null ? v.lon : -0.83, heading = v.heading != null ? v.heading : 180, fov = v.fov || 80, hor = v.horizon != null ? v.horizon : 560, ppd = 1600 / fov * (v.lift || 1);
    const sk = o.sky && Number.isFinite(o.sky.ms) ? o.sky : null;
    let ms, plat = lat, plon = lon;
    if (sk) { ms = sk.ms; if (Number.isFinite(sk.lat)) { plat = sk.lat; plon = sk.lon; } }
    else {
      const day = SEASON_DAY[v.season] || SEASON_DAY.summer, st = typeof almSunTimes === 'function' ? almSunTimes(day, lat, lon) : null;
      const rise = st && st.rise != null ? st.rise : Date.parse(day + 'T06:00Z'), set = st && st.set != null ? st.set : Date.parse(day + 'T18:00Z'), span = set - rise, m = 60000;
      ms = { dawn: rise + 6 * m, morning: rise + span * .2, day: rise + span * .4, noon: rise + span * .5, afternoon: rise + span * .66, golden: set - 50 * m, sunset: set - 6 * m, dusk: set + 28 * m, night: set + (86400000 - span) / 2 }[v.at || 'day'] || rise + span * .4;
    }
    const sp = typeof almSunPosition === 'function' ? almSunPosition(ms, plat, plon) : { alt: 30, az: 180 };
    const mp = sk && sk.moonPos ? sk.moonPos : typeof almMoonPosition === 'function' ? almMoonPosition(ms, plat, plon) : null;
    const wx = sk && sk.wx && typeof sk.wx === 'object' ? sk.wx : null, w = (wx && WX[wx.cond]) || [o.cloud != null ? o.cloud : .3];
    const cover = clamp(wx && Number.isFinite(wx.cloud) ? wx.cloud : w[0], 0, 1), alt = sp.alt, c = skyAt(alt);
    const px = (az, al) => { const rel = wrap(az - heading); return { rel, x: R(800 + rel / (fov / 2) * 800), y: R(hor - al * ppd) }; };
    const L = { live: !!sk, ms, lat: plat, lon: plon, heading, fov, horizon: hor, alt, az: sp.az, morning: wrap(sp.az - 180) < 0, cover, px,
      rain: w[1] === 'rain', snow: w[1] === 'snow', fog: w[1] === 'fog', wind: clamp(wx && Number.isFinite(wx.wind) ? .4 + wx.wind / 28 : 1, .4, 1.8) };
    L.tod = sk && sk.tod ? sk.tod : alt < -6 ? 'night' : alt < 7 ? (L.morning ? 'dawn' : 'dusk') : 'day';
    L.phase = alt >= 8 ? 'day' : alt >= 0 ? 'golden' : alt >= -6 ? 'civil' : alt >= -12 ? 'nautical' : alt >= -18 ? 'astro' : 'night';
    L.dark = clamp((2 - alt) / 16, 0, 1);
    const s = px(sp.az, alt), towards = Math.cos(s.rel * D);   // 1 facing the sun, -1 with the sun behind
    L.sun = Object.assign(s, { show: alt > -1.2 && Math.abs(s.rel) < fov / 2 + 6 && cover < .85 });
    L.side = Math.sin(s.rel * D) > 0 ? 1 : -1;
    L.backlit = clamp(towards, 0, 1) * clamp(1 - Math.abs(alt) / 25, 0, 1) * (1 - cover);
    // overcast: greyer, flatter light; moonlight lifts the night a little
    const grey = mix('#8e98a2', '#1a2030', L.dark), gk = cover * .75;
    const moonUp = mp && mp.alt > 0 ? mp.illum * clamp(mp.alt / 20, 0, 1) * (1 - cover) : 0;
    L.top = mix(mix(c.top, grey, gk), '#2a3a62', moonUp * .35 * L.dark);
    L.mid = mix(mix(c.mid, grey, gk), '#34486e', moonUp * .3 * L.dark);
    const lowSide = (1 + towards) / 2;
    L.low = mix(mix(c.lowAway, c.lowSun, lowSide), grey, gk);
    L.lowSun = mix(c.lowSun, grey, gk); L.lowAway = mix(c.lowAway, grey, gk);
    L.light = mix(c.light, '#d8dde2', gk); L.haze = mix(c.haze, grey, gk * .7);
    L.shade = mix(c.shade, '#6a7480', gk * (1 - L.dark)); L.shadeOp = clamp(c.shadeOp + gk * .12 * (1 - L.dark) - moonUp * .1, 0, .85);
    L.cloud = c.cloud.map(x => mix(x, grey, gk * .6));
    if (mp) { const m = px(mp.az, mp.alt); L.moon = Object.assign(m, { alt: mp.alt, az: mp.az, illum: mp.illum, frac: mp.frac, waxing: mp.waxing, limb: mp.limb, show: mp.alt > -.5 && Math.abs(m.rel) < fov / 2 + 6 && cover < .8 && mp.illum > .02 }); }
    else L.moon = { show: false, illum: 0 };
    L.stars = clamp((-alt - 4) / 10, 0, 1) * (1 - cover) * (1 - .55 * moonUp);
    L.lamps = alt < -1 || (cover > .85 && alt < 3);
    L.windows = alt < 3;
    // shadows fall away from the sun: per unit of height, on the ground plane (forward = up the screen, foreshortened)
    const len = alt > .5 ? clamp(1 / Math.tan(alt * D), .25, 7) : 0, away = (s.rel + 180) * D;
    L.shadow = { dx: f2(Math.sin(away) * len), dy: f2(-Math.cos(away) * len * .3), len: f2(len), gx: f2(Math.sin(away)), gy: f2(-Math.cos(away)), op: f2(.3 * (1 - cover) * clamp(alt / 4, 0, 1)) };
    // the water mirrors the sky: far (the sky low down) to near (the sky high up), mixed into the water's own colour
    L.water = (base = ['#7fb0c0', '#3f7e96', '#1d4c64']) => [mix(base[0], L.low, .55), mix(base[1], L.mid, .45), mix(base[2], L.top, .4)];
    LV = L;
    return L;
  };
  /**
   * Grade markup for the live light at render time (no runtime cost): every fill, stroke, stop and
   * color in it is multiplied toward the shade colour for the sun's height, desaturated toward
   * blue at night and warmed at golden hour. Use it on the land layers (not the sky, which K.liveSky
   * already draws in its real colours). Pieces wrapped in K.keep() are left as they are (lamps,
   * the water's sky reflection, the sun's road). Symbols in the scene's defs are graded once the
   * scene is drawn (K.scene), so placed trees and plants match.
   */
  K.tone = (L, markup) => {
    if (!L) return markup;
    L.toned = true;
    return String(markup).split(/(\u0001[^\u0002]*\u0002)/).map(part => part.charCodeAt(0) === 1 ? part : toneStr(L, part)).join('');
  };
  /** Mark markup that K.tone must not grade (lamps, sky reflections). */
  K.keep = markup => '\u0001' + markup + '\u0002';
  const toneStr = (L, str) => {
    const cache = L._tc || (L._tc = new Map()), op = L.shadeOp, sh = hx(L.shade), warm = clamp(1 - Math.abs(L.alt - 3) / 10, 0, 1) * (1 - L.cover) * .16, li = hx(L.light), night = L.dark * .55;
    if (op < .01 && warm < .01) return str;
    const f = c => {
      let v = cache.get(c); if (v) return v;
      let [r0, g0, b0] = hx(c).map(x => x / 255);
      const lum = r0 * .3 + g0 * .59 + b0 * .11;
      if (night) { r0 += (lum * .75 - r0) * night; g0 += (lum * .85 - g0) * night; b0 += (lum * 1.15 - b0) * night; }
      const m = (x, k) => x * (1 - op * (1 - k / 255));
      let out = [m(r0, sh[0]), m(g0, sh[1]), m(b0, sh[2])];
      if (warm) out = out.map((x, i) => x + (li[i] / 255 - x) * warm);
      v = '#' + out.map(x => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
      cache.set(c, v); return v;
    };
    return str.replace(/((?:fill|stroke|stop-color|color)=")(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})"/g, (_, a, c) => a + f(c) + '"');
  };
  K.toneStr = toneStr;
  /** The light being drawn with (inside K.scene after K.live), or null. */
  K.light = () => LV;
  /**
   * The live sky: gradient to the horizon, the sun's glow (also from just below the horizon or
   * beside the view), the sun disc, the moon with its real phase and tilt, and stars by darkness.
   * Draw it first; clouds (K.liveClouds) next, then the land in front hides anything below the horizon.
   * o: {y1 (the sky's foot, default the horizon + 120), sunR (26), moonR (20), stars (max count 180), seed}.
   */
  K.liveSky = (L, o = {}) => {
    const g = U(), hor = L.horizon, y1 = o.y1 || hor + 120;
    let out = `<defs>${linU(g, [[0, L.top], [.58, L.mid], [hor / y1, L.low], [1, L.low]], 0, 0, 0, y1)}</defs><rect x="-160" y="-80" width="1920" height="${R(y1 + 80)}" fill="url(#${g})"/>`;
    // the glow round the sun: strongest at low sun, still there for a while after sunset
    const gx = clamp(L.sun.x, -500, 2100), gy = Math.min(L.sun.y, hor + 40), gk = clamp(1 - Math.abs(L.sun.rel) / (L.fov / 2 + 70), 0, 1) * (1 - L.cover * .7);
    const lowSun = clamp(1 - Math.abs(L.alt - 2) / 16, 0, 1);
    if (gk > 0 && L.alt > -9) out += K.glow(gx, gy, 380 + 520 * lowSun, mix(L.lowSun, '#fff6dc', clamp(L.alt / 30, 0, .8)), (.25 + .5 * lowSun) * gk);
    // stars: density by darkness, fewer under a bright moon or cloud
    const ns = Math.round((o.stars || 180) * L.stars);
    if (ns > 0) {
      const r = rnd(o.seed || 41), gs = ['', '', ''];
      for (let i = 0; i < N(ns); i++) { const x = rr(r, -100, 1700), y = Math.pow(r(), 1.4) * (hor - 30), big = r() < .07; gs[i % 3] += big ? `M${R(x)} ${R(y - 4)}l1 3 3 1-3 1-1 3-1-3-3-1 3-1z` : circ(x, y, rr(r, .7, 1.7)); }
      out += `<g fill="#fffaf0" opacity="${f2(.35 + .65 * L.stars)}">` + gs.map((d, i) => M('twinkle', { ad: sec(2.4 + i * 1.3), d: sec(-i * .8) }, `<path d="${d}"/>`)).join('') + '</g>';
    }
    if (L.moon.show) {
      const m = L.moon, mr = o.moonR || 20, f = Math.acos(clamp(1 - 2 * m.illum, -1, 1)) / (2 * Math.PI);   // the lit shape as a waxing phase, turned to the real limb
      const disc = typeof almMoonDiscPath === 'function' ? almMoonDiscPath(clamp(f, .001, .4995), mr) : circ(0, 0, mr);
      out += K.glow(m.x, m.y, mr * (3 + 4 * m.illum), '#cfdcf0', .18 + .32 * m.illum) + `<g transform="translate(${m.x} ${m.y})"><circle r="${mr}" fill="#3a4660" opacity="${f2(.25 * L.dark)}"/><path fill="#f3eedc" transform="rotate(${f2(m.limb - 90)})" d="${disc}"/><path fill="#b8b4a0" opacity=".25" d="${circ(-mr * .3, -mr * .2, mr * .22)}${circ(mr * .2, mr * .25, mr * .16)}"/></g>`;
    }
    if (L.sun.show) {
      const sr = o.sunR || 26, core = mix('#fff9e8', L.lowSun, clamp(1 - L.alt / 12, 0, .85));
      out += M('glow', { ad: '7s' }, `<circle cx="${L.sun.x}" cy="${L.sun.y}" r="${R(sr * 1.8)}" fill="${core}" opacity=".35"/><circle cx="${L.sun.x}" cy="${L.sun.y}" r="${sr}" fill="${core}"/>`);
    }
    return out;
  };
  /** Cloud layers lit by the live light, more of them under cloud cover. Same options as K.clouds. */
  K.liveClouds = (L, o = {}) => K.clouds(Object.assign({ kinds: L.cover > .6 ? { heap: .3, strip: .6, puff: .1 } : L.cover < .2 ? { heap: .45, strip: .15, puff: .4 } : null }, o, { n: Math.max(1, Math.round((o.n || 4) * (.45 + L.cover * 1.6))), cols: L.cloud, light: L.side, op: (o.op || .95) * (L.dark > .9 ? .7 : 1) }));
  /** A glittering path on water under the sun or moon (the low sun's road, the moon's road). o: {y0, y1 (water band), w, seed, clip}. */
  K.lightPath = (L, o) => {
    const src = L.sun.show && L.alt < 35 ? L.sun : L.moon.show && L.moon.alt < 45 ? L.moon : null;
    if (!src) return '';
    const r = rnd(o.seed || 43), col = src === L.sun ? mix('#fff4d8', L.lowSun, .4) : '#e8eef6', parts = ['', '', ''], n = N(o.n || 60), k = src === L.sun ? 1 : .6 * L.moon.illum + .2;
    for (let i = 0; i < n; i++) { const t = Math.pow(r(), .8), y = o.y0 + t * (o.y1 - o.y0), hw = (o.w || 60) * (.3 + t * 1.6), x = src.x + rr(r, -hw, hw); parts[i % 3] += `M${R(x)} ${R(y)}h${R(rr(r, 6, 22) * (.4 + t))}`; }
    return K.keep(`<g opacity="${f2(.8 * k)}"${o.clip ? ` clip-path="url(#${o.clip})"` : ''}>` + parts.map((d, i) => M('shim', { ad: sec(1.6 + i * .7), d: sec(-i * .5) }, S(col, f2(2.2 + i * .4), d))).join('') + '</g>');
  };
  /** A lamp or lit window glow that comes on at real dusk (L.lamps). Unlit by day: just the fitting. */
  K.lamp = (L, x, y, r = 8, o = {}) => {
    const on = o.window ? L.windows : L.lamps;
    return on ? K.keep(K.glow(x, y, r * 6, '#ffd890', .55) + M('glow', { ad: sec(5 + (x % 3)) }, `<circle cx="${R(x)}" cy="${R(y)}" r="${r}" fill="#ffe2a0"/>`)) : `<circle cx="${R(x)}" cy="${R(y)}" r="${r}" fill="${o.off || '#c8ccc8'}" opacity=".7"/>`;
  };
  /**
   * A window (w x h, top-left at x, y) on the live light: by day dark glass that mirrors the sky
   * (a pale streak on the sun side); from real dusk (L.windows) a warm lit pane with a soft glow,
   * some left dark (o.on: the chance it is lit, .7; seeded by position so it does not flicker
   * between renders). o: {on, frame (colour, '#e8e4da'), bars (true: glazing bars), curtain}.
   */
  K.window = (L, x, y, w, h, o = {}) => {
    const fr = o.frame || '#e8e4da', on = L.windows && rnd(R(x * 7 + y * 13))() < (o.on != null ? o.on : .7);
    const bars = o.bars === false ? '' : S(fr, Math.max(1, w * .08), `M${R(x + w / 2)} ${R(y)}v${R(h)}M${R(x)} ${R(y + h * .45)}h${R(w)}`);
    const box = `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}"`;
    if (on) return K.keep(K.glow(x + w / 2, y + h / 2, Math.max(w, h) * 1.6, '#ffc870', .35 * L.dark + .1) + `${box} fill="${o.curtain ? '#f0b060' : '#ffd890'}"/>` + bars + `${box} fill="none" stroke="${fr}" stroke-width="${f2(Math.max(1, w * .1))}"/>`);
    const glass = mix(L.low, '#1c2630', .55), streak = mix(L.light, glass, .4);
    return `${box} fill="${glass}"/><path fill="${streak}" opacity=".45" d="M${R(x + w * (L.side > 0 ? .55 : .1))} ${R(y + h)}l${R(w * .3)} ${-R(h)}h${R(w * .15)}l${-R(w * .3)} ${R(h)}z"/>` + bars + `${box} fill="none" stroke="${fr}" stroke-width="${f2(Math.max(1, w * .1))}"/>`;
  };
  /**
   * St Peter's, Church End, Yateley (one drawing for every Yateley Green view, after photographs):
   * a long nave of pale ochre render (over flint) under a steep dark clay-tile roof with lancet
   * windows and a timber gabled porch; at the west end the 15th-century timber tower: a lean-to
   * tiled skirt over red-painted vertical boarding, a dark boarded upper stage with a clock and
   * louvred belfry, and a short shingled pyramid spire with a weathervane. Base y 0; the tower
   * stands at local x 0 with the nave to its left (o.flip: to its right); about 150 units tall.
   */
  K.stPeters = (L, x, y, s, o = {}) => {
    const wall = '#d6c79c', wallSh = '#b8a77c', roof = '#6a4636', roofSh = '#553628', red = '#a8432e', board = '#5a4a40';
    let g = K.shadow(L, -70, 0, 200, 70);
    // nave and its roof (the ridge runs along the view; the far end shows a hipped slope)
    g += P(wall, 'M-172 0V-30H-14V0z') + P(wallSh, 'M-172-8H-14V0H-172z', ' opacity=".6"');
    g += P(roof, 'M-178-28L-150-62H-20L-8-28z') + P(roofSh, 'M-178-28L-150-62L-140-28z', ' opacity=".6"') + S('#3e281e', 1, 'M-170-36H-12M-162-46H-16M-154-55H-19', ' opacity=".35"');
    for (let i = 0; i < 3; i++) { const wx = -150 + i * 36 + (i > 0 ? 18 : 0); g += K.window(L, wx, -24, 7, 15, { on: .6, frame: '#efe9dc', bars: false }) + P('#efe9dc', `M${wx} -24q3.5-6 7 0z`); }
    // the timber porch: a small gable, dark framing, a dark doorway
    g += P('#efe6d4', 'M-112 0V-18H-90V0z') + P('#3a2c24', 'M-105 0V-12q4-5 8 0V0z') + P(roof, 'M-116-16L-101-32-86-16z') + S('#4a3a2e', 1.2, 'M-112-18L-101-28-90-18');
    // the tower: the tiled skirt over red boarding
    g += P(red, 'M-28 0V-30H28V0z') + S('#7a2c1e', 1, 'M-22 0V-28M-14 0V-28M-6 0V-28M2 0V-28M10 0V-28M18 0V-28', ' opacity=".55"') + P('#3a241c', 'M-6 0V-14h10V0z');
    g += P(board, 'M-19-40V-100H19V-40z') + P('#000', 'M4-40V-100H19V-40z', ' opacity=".2"') + S('#7a6a5c', .8, 'M-19-50H19M-19-58H19M-19-66H19M-19-74H19', ' opacity=".5"');
    g += P(roof, 'M-34-26L-19-44H19L34-26z') + P(roofSh, 'M19-44L34-26H20z', ' opacity=".7"');
    // belfry louvres, the clock (a dark face on a diamond board, gilt hands)
    g += P('#c8bca8', 'M-16-98H16V-84H-16z') + S('#5a4a40', 1, 'M-12-98V-84M-6-98V-84M0-98V-84M6-98V-84M12-98V-84');
    g += P('#2c3448', 'M0-74L8-66 0-58-8-66z') + S('#d8b84a', 1.1, 'M0-66V-71M0-66h3.5');
    // the shingled pyramid spire and the vane
    g += P('#4c423c', 'M-23-99L0-140 23-99z') + P('#3a322e', 'M0-140L23-99H5z') + S('#6a5e54', .8, 'M-15-110H15M-9-121H9', ' opacity=".5"');
    g += S('#3a322e', 1.2, 'M0-140V-152') + P('#3a322e', 'M-6-150h10l2-2-2-2h-10z');
    return at(x, y, s, g, o.flip);
  };
  /** A mirrored copy of a group (id) about the waterline y, wobbling; put it inside the water's clip. */
  K.mirror = (id, y, op = .35) => M('wobble', { ad: '6s' }, `<use href="#${id}" transform="matrix(1 0 0 -1 0 ${R(y * 2)})" opacity="${op}"/>`);
  /**
   * The whole live sky in one call: K.liveSky (gradient, sun glow and disc, moon in its real phase,
   * stars by darkness) + high cirrus + two drifting cloud layers lit by L. o: {stars, seed,
   * cloudY: [y0, y1] (the cloud band, default 40 .. horizon - 160), clouds (n per layer, 3), cirrus (n, 4)}.
   */
  K.liveBackdrop = (L, o = {}) => {
    const s0 = (o.seed || 3) + Math.round(L.heading || 0) % 97, [cy0, cy1] = o.cloudY || [40, Math.max(200, L.horizon - 160)], mid = (cy0 + cy1) / 2;
    return K.liveSky(L, { stars: o.stars || 200, seed: s0 + 38 }) +
      (o.cirrus === 0 ? '' : K.cirrus({ seed: s0, n: o.cirrus || 4, y0: cy0, y1: cy0 + (cy1 - cy0) * .45, col: L.cloud[2], op: .5 * (1 - L.dark * .5), sheet: clamp((L.cover - .3) * 1.4, 0, .8) || (s0 % 3 === 0 ? .35 : 0) })) +
      K.liveClouds(L, { seed: s0 + 2, n: o.clouds || 3, y0: cy0 + 60, y1: mid + 20, s: [.4, .8], dur: [170, 260], op: .85 }) +
      K.liveClouds(L, { seed: s0 + 6, n: o.clouds || 3, y0: mid, y1: cy1, s: [.8, 1.5], dur: [90, 140] });
  };
  /** A ground shadow cast by something h tall at (x, y), w wide, along the live light (static). */
  K.shadow = (L, x, y, w, h, op) => {
    const sh = L.shadow, foot = `<ellipse cx="${R(x)}" cy="${R(y)}" rx="${R(w * .5)}" ry="${R(Math.max(2, w * .08))}" fill="#14261e" opacity="${f2(.2 * (1 - L.dark * .6))}"/>`;
    if (!sh || !sh.op) return foot;
    // a strip along the ground away from the sun: as long as the light makes it (capped), as wide as
    // the thing, foreshortened (ground depth shows at about .3 on the screen)
    const Lg = Math.min(h * sh.len, h * 2.2), ax = sh.gx * Lg, ay = sh.gy * Lg * .3, px = -sh.gy * w * .5, py = sh.gx * w * .5 * .3;
    const rx = Math.max(w * .3, Math.hypot(ax, ay) / 2), ry = Math.max(2, Math.hypot(px, py)), deg = Math.atan2(ay, ax) / D;
    const fade = defOnce('shadowFade', id => `<linearGradient id="${id}"><stop offset="0" stop-color="#142030"/><stop offset=".55" stop-color="#142030" stop-opacity=".7"/><stop offset="1" stop-color="#142030" stop-opacity="0"/></linearGradient>`);   // fades away from the foot
    return foot + `<ellipse cx="${R(x + ax / 2)}" cy="${R(y + ay / 2)}" rx="${R(rx)}" ry="${R(ry)}" transform="rotate(${R(deg)} ${R(x + ax / 2)} ${R(y + ay / 2)})" fill="url(#${fade})" opacity="${f2(op != null ? op : sh.op)}"/>`;
  };
  /** Weather over the scene: rain, snow or fog banks when the live weather says so ('' otherwise). o: {mistY, rainN, snowN}. */
  K.weather = (L, o = {}) => (L.rain ? K.rain({ n: o.rainN || 90, layers: 2, op: .35 + L.dark * .1 }) : '') + (L.snow ? K.snow({ n: o.snowN || 50 }) : '') + (L.fog ? `<rect x="-160" y="-60" width="1920" height="1020" fill="${mix('#dfe4e6', '#2a3040', L.dark)}" opacity=".32"/>` + K.mist({ y: o.mistY || L.horizon + 40, h: 160, n: 6, col: mix('#f0f2f2', '#3a4256', L.dark), op: .7 }) : '');
  /**
   * The light over the drawing, laid last: a warm glow from the low sun's side and the vignette
   * (the colours themselves are graded by K.tone). Without a live sky the classic
   * .hx-tint is added too, so the dark theme still grades the authored scene.
   */
  K.grade = (L, o = {}) => {
    const g = U(), v = U();
    let out = '';
    const warm = clamp(1 - Math.abs(L.alt - 3) / 12, 0, 1) * (1 - L.cover) * clamp(1 - Math.abs(L.sun.rel) / 140, 0, 1);
    if (warm > .02) out += `<defs>${radU(g, [[0, L.light, .22 * warm], [1, L.light, 0]], clamp(L.sun.x, -300, 1900), Math.min(L.sun.y, L.horizon), 1200)}</defs><rect x="-160" y="-60" width="1920" height="1020" fill="url(#${g})" pointer-events="none"/>`;
    out += `<defs>${radU(v, [[.55, '#0b0d22', 0], [1, '#0b0d22', o.vignette != null ? o.vignette : .34]], 800, 420, 980)}</defs><rect x="-160" y="-60" width="1920" height="1020" fill="url(#${v})" pointer-events="none"/>`;
    return out + (L.live ? '' : `<rect class="hx-tint" width="1600" height="900"/>`);
  };

  /* ---------- the scene wrapper ---------- */
  /**
   * Draw a rich scene: sets the level of detail from o.size (full detail full screen and
   * in the hero stage; about 40% in small tiles), runs draw(), trims long decimals and wraps
   * it (class ukn-rich). Use: svg: (o = {}) => K.scene(o, () => ...).
   */
  K.scene = (o, draw) => {
    const prevL = LOD, prevS = SC, prevV = LV, size = o && o.size;
    LOD = !size || size === 'fill' || size === 'hero' ? 1 : .2;
    SC = { defs: new Map(), out: '' }; LV = null;
    try {
      const body = String(draw()).replace(/[\u0001\u0002]/g, ''), wk = LV ? LV.wind : 1;   // --wk: the wind strength scales every sway (K.live: the weather's wind)
      const defs = LV && LV.toned ? toneStr(LV, SC.out) : SC.out;   // symbols are only placed in graded layers
      const out = `<g class="ukn-rich"${wk !== 1 ? ` style="--wk:${f2(wk)}"` : ''}><defs>${defs}</defs>${body}</g>`.replace(/-?\d+\.\d{3,}/g, n => String(Math.round(Number(n) * 100) / 100));
      // small tiles: whole-unit path coordinates (invisible at tile size, about 10% lighter) and
      // compact separators (no spaces round commands or before a minus sign: the same path)
      return LOD < 1 ? out.replace(/ d="[^"]*"/g, m => ' d="' + m.slice(4, -1).replace(/-?\d*\.\d+/g, n => (n[0] === '.' || n[1] === '.' ? ' ' : '') + Math.round(Number(n)))
        .replace(/[\s,]+/g, ' ').replace(/ ?([A-Za-z]) ?/g, '$1').replace(/ -/g, '-').trim() + '"') : out;
    }
    finally { LOD = prevL; SC = prevS; LV = prevV; }
  };
  /** The current level of detail (1 full screen, .3 in tiles). */
  K.lod = () => LOD;

  /* ---------- motion: x-ukn* (transform and opacity only) ---------- */
  K.css = [
    '.anim-scene .x-ukngust { --an: ap-ukngust; --ad: 7s; transform-origin: 50% 100%; }',
    '.anim-scene .x-ukngust2 { --an: ap-ukngust2; --ad: 7s; transform-origin: 50% 100%; }',
    '.anim-scene .x-ukngust3 { --an: ap-ukngust3; --ad: 7s; transform-origin: 50% 100%; }',
    '.anim-scene .x-ukntree { --an: ap-ukntree; --ad: 7s; }',
    '.anim-scene .x-uknweep { --an: ap-uknweep; --ad: 6s; }',
    '.anim-scene .x-uknflutter { --an: ap-uknflutter; --ad: 2s; }',
    '.anim-scene .x-uknfall { --an: ap-uknfall; --ad: 12s; --ae: linear; }',
    '.anim-scene .x-ukndrift { --an: ap-ukndrift; --ad: 80s; }',
    '.anim-scene .x-uknglide { --an: ap-uknglide; --ad: 30s; --ae: linear; }',
    '.anim-scene .x-uknflap { --an: ap-uknflap; --ad: .55s; }',
    '.anim-scene .x-uknbob { --an: ap-uknbob; --ad: 3s; }',
    '.anim-scene .x-uknpace { --an: ap-uknpace; --ad: 30s; --ae: linear; }',
    '.anim-scene .x-uknwake { --an: ap-uknwake; --ad: 2.4s; }',
    '.anim-scene .x-uknpeck { --an: ap-uknpeck; --ad: 8s; }',
    '.anim-scene .x-uknring { --an: ap-uknring; --ad: 4s; --ae: ease-out; }',
    '.anim-scene .x-uknleap { --an: ap-uknleap; --ad: 9s; }',
    '.anim-scene .x-uknsplash { --an: ap-uknsplash; --ad: 9s; --ae: ease-out; }',
    '.anim-scene .x-uknshim { --an: ap-uknshim; --ad: 3s; }',
    '.anim-scene .x-uknwobble { --an: ap-uknwobble; --ad: 6s; }',
    '.anim-scene .x-ukntwinkle { --an: ap-ukntwinkle; --ad: 3s; }',
    '.anim-scene .x-uknshaft { --an: ap-uknshaft; --ad: 7s; }',
    '.anim-scene .x-uknglow { --an: ap-uknglow; --ad: 7s; }',
    '.anim-scene .x-uknlook { --an: ap-uknlook; --ad: 12s; }',
    '.anim-scene .x-ukngraze { --an: ap-ukngraze; --ad: 9s; }',
    '.anim-scene .x-uknear { --an: ap-uknear; --ad: 3s; }',
    '.anim-scene .x-uknhop { --an: ap-uknhop; --ad: 14s; }',
    '.anim-scene .x-ukntail { --an: ap-ukntail; --ad: 2.8s; }',
    '.anim-scene .x-uknnibble { --an: ap-uknnibble; --ad: 1.6s; }',
    '.anim-scene .x-uknflit { --an: ap-uknflit; --ad: 12s; }',
    '.anim-scene .x-uknwing { --an: ap-uknwing; --ad: .35s; }',
    '.anim-scene .x-ukndart { --an: ap-ukndart; --ad: 8s; }',
    '.anim-scene .x-uknbuzz { --an: ap-uknbuzz; --ad: .12s; }',
    '.anim-scene .x-uknleg { --an: ap-uknleg; --ad: .8s; }',
    '.anim-scene .x-uknarm { --an: ap-uknarm; --ad: .8s; }',
    '.anim-scene .x-uknstep { --an: ap-uknstep; --ad: .4s; }',
    '.anim-scene .x-uknwag { --an: ap-uknwag; --ad: .35s; }',
    '.anim-scene .x-uknspin { --an: ap-uknspin; --ad: .9s; --ae: linear; }',
    '.anim-scene .x-uknsnow { --an: ap-uknsnow; --ad: 26s; --ae: linear; }',
    '.anim-scene .x-uknsway { --an: ap-uknsway; --ad: 6s; }',
    // --wk (set on .ukn-rich by K.scene from the live wind) scales every sway; 1 is a light breeze
    '@keyframes ap-ukngust { 0%,100% { transform: skewX(0); } 28% { transform: skewX(calc(var(--wk, 1) * -2deg)); } 46% { transform: skewX(calc(var(--wk, 1) * 7deg)); } 62% { transform: skewX(calc(var(--wk, 1) * 1deg)); } 78% { transform: skewX(calc(var(--wk, 1) * 3.5deg)); } }',
    '@keyframes ap-ukngust2 { 0%,100% { transform: skewX(0); } 28% { transform: skewX(calc(var(--wk, 1) * -1deg)); } 46% { transform: skewX(calc(var(--wk, 1) * 3.2deg)); } 62% { transform: skewX(calc(var(--wk, 1) * .5deg)); } 78% { transform: skewX(calc(var(--wk, 1) * 1.6deg)); } }',
    '@keyframes ap-ukngust3 { 0%,100% { transform: skewX(0); } 28% { transform: skewX(calc(var(--wk, 1) * -.3deg)); } 46% { transform: skewX(calc(var(--wk, 1) * 1deg)); } 62% { transform: skewX(calc(var(--wk, 1) * .2deg)); } 78% { transform: skewX(calc(var(--wk, 1) * .5deg)); } }',
    '@keyframes ap-ukntree { 0%,100% { transform: rotate(0); } 28% { transform: rotate(calc(var(--wk, 1) * -.5deg)); } 46% { transform: rotate(calc(var(--wk, 1) * 1.3deg)); } 62% { transform: rotate(calc(var(--wk, 1) * .2deg)); } 78% { transform: rotate(calc(var(--wk, 1) * .7deg)); } }',
    '@keyframes ap-uknweep { 0%,100% { transform: skewX(-1.5deg); } 50% { transform: skewX(3deg); } }',
    '@keyframes ap-uknflutter { 0%,100% { transform: rotate(0) scale(1); } 25% { transform: rotate(22deg) scale(.8); } 50% { transform: rotate(-8deg) scale(1); } 75% { transform: rotate(14deg) scale(.9); } }',
    '@keyframes ap-uknfall { 0% { transform: translate(0,0) rotate(0); opacity: 0; } 8% { opacity: 1; } 30% { transform: translate(calc(var(--dx) * .5), calc(var(--dy) * .3)) rotate(140deg); } 55% { transform: translate(calc(var(--dx) * .1), calc(var(--dy) * .55)) rotate(220deg); } 80% { transform: translate(calc(var(--dx) * .8), calc(var(--dy) * .8)) rotate(330deg); } 92% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) rotate(420deg); opacity: 0; } }',
    '@keyframes ap-ukndrift { 0%,100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-uknglide { 0% { transform: translate(0,0); opacity: 0; } 6%,94% { opacity: 1; } 100% { transform: translate(var(--dx, 900px), var(--dy, 0px)); opacity: 0; } }',
    '@keyframes ap-uknflap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(-.55); } }',
    '@keyframes ap-uknbob { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(var(--dy, 2px)) rotate(.8deg); } }',
    '@keyframes ap-uknpace { 0% { transform: translate(0,0) scaleX(1); } 47% { transform: translate(var(--dx), var(--dy, 0px)) scaleX(1); } 50% { transform: translate(var(--dx), var(--dy, 0px)) scaleX(-1); } 97% { transform: translate(0,0) scaleX(-1); } 100% { transform: translate(0,0) scaleX(1); } }',
    '@keyframes ap-uknwake { 0%,100% { opacity: .35; transform: scaleX(.9); } 50% { opacity: 1; transform: scaleX(1.08); } }',
    '@keyframes ap-uknpeck { 0%,70%,100% { transform: rotate(0); } 76%,86% { transform: rotate(38deg); } 92% { transform: rotate(-6deg); } }',
    '@keyframes ap-uknring { 0% { transform: scale(.2); opacity: 0; } 12% { opacity: .9; } 100% { transform: scale(1.6); opacity: 0; } }',
    '@keyframes ap-uknleap { 0%,72% { transform: translate(0,10px) rotate(-50deg); opacity: 0; } 74% { opacity: 1; } 80% { transform: translate(calc(var(--dx) * .5), var(--dy)) rotate(0); } 86% { transform: translate(var(--dx), 10px) rotate(55deg); opacity: 1; } 87%,100% { transform: translate(var(--dx), 10px) rotate(55deg); opacity: 0; } }',
    '@keyframes ap-uknsplash { 0%,85% { transform: scale(.2); opacity: 0; } 87% { opacity: .9; } 100% { transform: scale(1.8); opacity: 0; } }',
    '@keyframes ap-uknshim { 0%,100% { opacity: .15; transform: translateX(-10px); } 50% { opacity: 1; transform: translateX(10px); } }',
    '@keyframes ap-uknwobble { 0%,100% { transform: translateX(-3px) scaleY(1); } 50% { transform: translateX(3px) scaleY(.985); } }',
    '@keyframes ap-ukntwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }',
    '@keyframes ap-uknshaft { 0%,100% { opacity: .45; } 50% { opacity: 1; } }',
    '@keyframes ap-uknglow { 0%,100% { opacity: .85; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.03); } }',
    '@keyframes ap-uknlook { 0%,30%,100% { transform: rotate(0); } 40%,55% { transform: rotate(-9deg); } 62% { transform: rotate(4deg); } 80%,84% { transform: rotate(22deg); } 88% { transform: rotate(0); } }',
    '@keyframes ap-ukngraze { 0%,32%,100% { transform: rotate(0); } 42%,78% { transform: rotate(48deg); } 86% { transform: rotate(-4deg); } }',
    '@keyframes ap-uknear { 0%,80%,100% { transform: rotate(0); } 86% { transform: rotate(-14deg); } 92% { transform: rotate(6deg); } }',
    '@keyframes ap-uknhop { 0% { transform: translate(0,0) scaleX(1); } 5% { transform: translate(calc(var(--dx) * .12), -14px) scaleX(1); } 10% { transform: translate(calc(var(--dx) * .25), 0) scaleX(1); } 15% { transform: translate(calc(var(--dx) * .37), -14px) scaleX(1); } 20%,46% { transform: translate(calc(var(--dx) * .5), 0) scaleX(1); } 48% { transform: translate(calc(var(--dx) * .5), 0) scaleX(-1); } 53% { transform: translate(calc(var(--dx) * .37), -14px) scaleX(-1); } 58% { transform: translate(calc(var(--dx) * .25), 0) scaleX(-1); } 63% { transform: translate(calc(var(--dx) * .12), -14px) scaleX(-1); } 68%,96% { transform: translate(0,0) scaleX(-1); } 98%,100% { transform: translate(0,0) scaleX(1); } }',
    '@keyframes ap-ukntail { 0%,100% { transform: rotate(-6deg); } 40% { transform: rotate(10deg); } 55% { transform: rotate(2deg); } }',
    '@keyframes ap-uknnibble { 0%,100% { transform: rotate(0); } 50% { transform: rotate(8deg); } }',
    '@keyframes ap-uknflit { 0%,100% { transform: translate(0,0) rotate(-6deg); } 20% { transform: translate(calc(var(--dx) * .3), calc(var(--dy) * -1)) rotate(8deg); } 40% { transform: translate(calc(var(--dx) * .6), calc(var(--dy) * .3)) rotate(-4deg); } 60% { transform: translate(var(--dx), calc(var(--dy) * -.6)) rotate(10deg); } 80% { transform: translate(calc(var(--dx) * .4), calc(var(--dy) * .6)) rotate(-8deg); } }',
    '@keyframes ap-uknwing { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.15); } }',
    '@keyframes ap-ukndart { 0%,18%,100% { transform: translate(0,0); } 24%,42% { transform: translate(calc(var(--dx) * .6), var(--dy)); } 48%,66% { transform: translate(var(--dx), calc(var(--dy) * .2)); } 72%,92% { transform: translate(calc(var(--dx) * .25), calc(var(--dy) * -.5)); } }',
    '@keyframes ap-uknbuzz { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.3); } }',
    '@keyframes ap-uknleg { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }',
    '@keyframes ap-uknarm { 0%,100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }',
    '@keyframes ap-uknstep { 0%,100% { transform: translateY(0); } 50% { transform: translateY(var(--dy, -1.5px)); } }',
    '@keyframes ap-uknwag { 0%,100% { transform: rotate(-16deg); } 50% { transform: rotate(16deg); } }',
    '@keyframes ap-uknspin { to { transform: rotate(1turn); } }',
    '@keyframes ap-uknsnow { from { transform: translateY(0); } to { transform: translateY(900px); } }',
    '@keyframes ap-uknsway { 0%,100% { transform: translateX(calc(var(--dx, 10px) * -1)); } 50% { transform: translateX(var(--dx, 10px)); } }',
  ].join('\n');
  return K;
}
