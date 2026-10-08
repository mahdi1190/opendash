/* ============================================================
   SCENE LIBRARY + ARCHETYPES: the Fleet and Farnborough area
   (docs/dev/SCENE_ENGINE.md sections 2 and 8). PURE: sceneObjDefine and
   sceneArchetypeDefine calls inside IIFEs and nothing else; every build
   runs lazily (objects once per variant and season, scenes once when shown).

   The area: Fleet Pond (Hart District Council Local Nature Reserve, SSSI),
   the Basingstoke Canal through Fleet, Fleet town (Fleet Road, All Saints'
   Church) and its station on the South Western main line, Southwood Country
   Park and Southwood Woodland (Rushmoor), and the restored portable airship
   hangar at Farnborough (an open, listed steel frame).
     https://www.hart.gov.uk/fleet-pond
     https://www.basingstoke-canal.org.uk/
     https://www.rushmoor.gov.uk/southwoodcountrypark
     https://airsciences.org.uk/

   Objects (this area's own; the airship hangar and Fleet station come from the
   shared Hampshire library, 70-scene-lib-hampshire.js):
     landmark.fleet-canal-bridge          a brick road bridge over the cut, the towpath under the arch
     landmark.all-saints-fleet            All Saints' Church, Fleet: red brick, steep roof, west rose window
     landmark.southwood-oak               a veteran open-grown oak (natural landmark), bare in winter
   Archetypes (one per repeated scene type; the scenes are data rows in
   71-scene-uk-fleet-*.js):
     fleet-water   a pond, canal or brook view (form: lake | channel | band)
     fleet-green   a park, meadow, wood or lawn view round a signature
     fleet-town    a town, church or station view (urban setting)
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = v => Math.round(v * 10) / 10;
  const P = (x, y) => R(x) + ' ' + R(y);
  const lerp = (a, b, t) => a + (b - a) * t;
  const toward = (p, vp, s) => [vp[0] + (p[0] - vp[0]) * s, vp[1] + (p[1] - vp[1]) * s];
  /** A lattice member between a and b: two chords w apart (perpendicular) and a zigzag web. */
  const lattice = (a, b, w, n, paint, sw) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
    const c1 = `M${P(a[0] + nx, a[1] + ny)}L${P(b[0] + nx, b[1] + ny)}M${P(a[0] - nx, a[1] - ny)}L${P(b[0] - nx, b[1] - ny)}`;
    let z = '';
    for (let i = 0; i <= n; i++) { const t = i / n, sgn = i % 2 ? 1 : -1; z += (i ? 'L' : 'M') + P(a[0] + dx * t + nx * sgn, a[1] + dy * t + ny * sgn); }
    return [{ s: paint, w: sw, d: c1 }, { s: paint, w: sw * 0.55, d: z, op: 0.9 }];
  };
  const line = (a, b) => `M${P(a[0], a[1])}L${P(b[0], b[1])}`;

  /* ---------- the canal bridge ---------- */
  sceneObjDefine({
    id: 'landmark.fleet-canal-bridge',
    category: 'landmark',
    size: [820, 240],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { brick: ['#9a4e36', '#7a3a28', '#b4644a'], cope: ['#c2bcae', '#9a9488', '#dcd6c8'], dark: ['#1e2420', '#2c3430'], ivy: ['#3e5a2e', '#4e6e36'], lamp: ['#d8d0b8', '#2a2c2e'], flood: ['#ffd890'], path: ['#8a7e66'] },
      spring: { ivy: ['#4e6e34', '#6a8a40'] }, summer: { ivy: ['#3e5a2e', '#4e6e36'] },
      autumn: { ivy: ['#7a4a26', '#9a6a2e'] }, winter: { ivy: ['#4a5440', '#5a6450'], cope: ['#d8dce0', '#a8acb0', '#eef0f2'] },
    },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 300, ry: 12, h: 120 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/fleet-canal', 'uk', 'fleet', 'canal', 'bridge', 'brick', 'kit:temperate'],
    credit: 'drawn for the Fleet area pack: a Basingstoke Canal road bridge in Fleet',
    build() {
      const b = [], lit = [];
      const span = 150, spring = -46, crown = -150, deck = -186, top = -214;
      const ry = spring - crown;   // the arch's rise
      const archPts = (r) => Array.from({ length: 25 }, (_, i) => { const a = Math.PI - Math.PI * i / 24; return [Math.cos(a) * r, spring - Math.sin(a) * ry * (r / span)]; });   // left to right
      const rightToLeft = archPts(span).reverse().map(q => 'L' + P(q[0], q[1])).join('');
      // the body: abutments, spandrels and the deck, wing walls sloping down to the banks
      b.push({ f: '@brick.0', d: `M-410 0L-410 -40L-330 ${top + 8}H330L410 -40V0H${span}V${spring}${rightToLeft}L-${span} 0z` });
      b.push({ f: '@brick.1', d: `M330 ${top + 8}L410 -40V0H300V${top + 8}z`, op: 0.6 });
      // the dark arch and the towpath under it, the water's line
      b.push({ f: '@dark.0', d: `M${span} 0V${spring}${rightToLeft}L-${span} 0z` });
      b.push({ f: '@path', d: `M-${span} -2V-14H-70L-60 -2z`, op: 0.9 }, { f: '@dark.1', d: `M-${span} -30H${span}V0H-${span}z`, op: 0.5 });
      // the voussoir ring: alternating headers round the arch
      for (let i = 0; i < 26; i++) {
        const a0 = Math.PI - Math.PI * i / 26, a1 = Math.PI - Math.PI * (i + 1) / 26, r0 = span, r1 = span + 22;
        const p = (a, r) => [Math.cos(a) * r, spring - Math.sin(a) * ry * (r / span)];
        b.push({ f: i % 2 ? '@brick.2' : '@brick.1', d: sceneD.poly([p(a0, r0), p(a0, r1), p(a1, r1), p(a1, r0)]) });
      }
      // brick courses across the spandrels (detail)
      for (let y = top + 16; y < -4; y += 9) b.push({ s: '@brick.1', w: 0.8, op: 0.45, detail: true, d: `M${y < spring ? -320 : -400} ${y}H${y < spring ? 320 : 400}` });
      // the string course and the parapet with its coping stones
      b.push({ f: '@cope.1', d: sceneD.rect(-334, deck, 668, 7) }, { f: '@brick.0', d: sceneD.rect(-330, top + 8, 660, deck - top - 8) }, { f: '@brick.1', d: sceneD.rect(-330, deck - 6, 660, 6), op: 0.5 });
      for (let i = 0; i < 22; i++) b.push({ f: i % 3 ? '@cope.0' : '@cope.2', d: sceneD.rect(-336 + i * 30.5, top, 30, 9) }, { f: '@cope.1', d: sceneD.rect(-336 + i * 30.5, top + 7, 30, 2), op: 0.8 });
      // piers at the parapet ends, ivy down the left wing wall
      for (const x of [-344, 318]) b.push({ f: '@brick.2', d: sceneD.rect(x, top - 14, 26, 56) }, { f: '@cope.2', d: sceneD.rect(x - 3, top - 20, 32, 8) });
      for (let i = 0; i < 9; i++) b.push({ f: i % 2 ? '@ivy.0' : '@ivy.1', d: sceneD.ell(-380 + i * 9, -40 - (i % 3) * 22 - i * 8, 18, 12), op: 0.9 });
      // two lamps on the parapet piers (glow at dusk), their light pools
      for (const x of [-331, 331]) {
        b.push({ s: '@lamp.1', w: 3, d: `M${x} ${top - 20}V${top - 70}` }, { f: '@lamp.1', d: sceneD.rect(x - 8, top - 86, 16, 16) }, { f: '@lamp.0', d: sceneD.rect(x - 6, top - 84, 12, 12), glow: 'lamp' }, { f: '@lamp.1', d: `M${x - 10} ${top - 86}L${x} ${top - 94}L${x + 10} ${top - 86}z` });
        lit.push({ f: { rad: [[0, '@flood', 0.4], [1, '@flood', 0]], cx: x, cy: top - 78, r: 90 }, d: sceneD.circ(x, top - 78, 90) });
      }
      return { body: b, lit };
    },
  });

  /* ---------- All Saints' Church, Fleet ---------- */
  sceneObjDefine({
    id: 'landmark.all-saints-fleet',
    category: 'landmark',
    size: [560, 300],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: { base: { brick: ['#a24a32', '#7e3624', '#bc6248'], band: ['#3e2c26'], roof: ['#55504e', '#3e3a38', '#6e6864'], dress: ['#d8ccb0'], glass: ['#3a4656', '#9fb2c4'], door: ['#3a2a22'], flood: ['#ffe2a8'] } },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 260, ry: 14, h: 260 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/fleet-all-saints', 'uk', 'fleet', 'church', 'brick', 'kit:temperate'],
    credit: "drawn for the Fleet area pack: All Saints' Church, Fleet",
    build() {
      const b = [], lit = [];
      const lancet = (x, y, w, h) => [
        { f: '@dress', d: `M${x - 2} ${y + h + 1}V${y + w * 0.5}Q${x + w / 2} ${y - w} ${x + w + 2} ${y + w * 0.5}V${y + h + 1}z` },
        { f: '@glass.0', d: `M${x} ${y + h}V${y + w * 0.5}Q${x + w / 2} ${y - w * 0.7} ${x + w} ${y + w * 0.5}V${y + h}z`, glow: 'window' },
      ];
      // the apse (east, right), lower and rounded
      b.push({ f: '@brick.1', d: 'M200 0V-96Q250-100 262-60V0z' }, { f: '@roof.1', d: 'M196-94Q232-150 268-70L262-60Q250-100 200-96z' });
      b.push(...lancet(222, -78, 10, 34));
      // the nave: long red-brick wall, black brick bands, buttresses, lancets
      b.push({ f: '@brick.0', d: 'M-150 0V-110H200V0z' }, { f: '@brick.1', d: 'M-150-18H200V0H-150z', op: 0.5 });
      for (const y of [-34, -70, -100]) b.push({ f: '@band', d: sceneD.rect(-150, y, 350, 4), op: 0.75 });
      for (let x = -140; x < 200; x += 7) b.push({ s: '@brick.1', w: 0.6, op: 0.25, detail: true, d: `M${x} -110V0` });
      for (let i = 0; i < 6; i++) { const x = -124 + i * 56; b.push(...lancet(x + 14, -88, 12, 46)); b.push({ f: '@brick.2', d: `M${x} 0V-58l5-8h7V0z` }, { f: '@brick.1', d: `M${x + 7} 0V-66h5V0z`, op: 0.9 }); }
      // the steep slate roof with its courses and a ridge cresting
      b.push({ f: '@roof.0', d: 'M-160-108L-110-236H190L212-108z' }, { f: '@roof.1', d: 'M150-236H190L212-108H186z', op: 0.6 }, { f: '@roof.2', d: 'M-110-236H190V-231H-108z' });
      for (let i = 1; i < 10; i++) b.push({ s: '@roof.1', w: 0.8, op: 0.45, detail: true, d: `M${R(-160 + i * 5)} ${-108 - i * 12.8}H${R(212 - i * 2.2)}` });
      for (let i = 0; i < 14; i++) b.push({ f: '@roof.1', d: `M${-104 + i * 21} -236l4-8l4 8z` });
      // the south porch, its door and lamp
      b.push({ f: '@brick.2', d: 'M-40 0V-62H10V0z' }, { f: '@roof.0', d: 'M-48-60L-15-104L18-60z' }, { f: '@door', d: 'M-26 0V-34Q-15-48-4-34V0z' }, { f: '@dress', d: 'M-28-34Q-15-52-2-34', op: 0.9 });
      b.push({ f: '@glass.1', d: sceneD.rect(-18, -58, 6, 7), glow: 'lamp' });
      // the west end (left): a tall gable facing the viewer, the rose window, paired lancets and the bellcote
      b.push({ f: '@brick.0', d: 'M-270 0V-120L-210-250L-150-120V0z' }, { f: '@brick.1', d: 'M-210-250L-150-120V0H-180V-120z', op: 0.35 });
      for (const y of [-34, -70, -110]) b.push({ f: '@band', d: sceneD.rect(-270, y, 120, 4), op: 0.75 });
      b.push({ f: '@roof.2', d: 'M-276-118L-210-258L-144-118L-150-114L-210-246L-270-114z' });
      b.push({ f: '@dress', d: sceneD.circ(-210, -158, 26) }, { f: '@glass.0', d: sceneD.circ(-210, -158, 22), glow: 'window' });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.push({ s: '@dress', w: 1.6, d: `M-210 -158L${R(-210 + Math.cos(a) * 22)} ${R(-158 + Math.sin(a) * 22)}` }); }
      b.push(...lancet(-236, -110, 16, 70), ...lancet(-200, -110, 16, 70));
      b.push({ f: '@door', d: 'M-222 0V-30Q-210-44-198-30V0z' });
      b.push({ f: '@brick.2', d: 'M-222-248V-284H-198V-248z' }, { f: '@roof.0', d: 'M-226-282L-210-300L-194-282z' }, { f: '@door', d: 'M-216-252V-272Q-210-278-204-272V-252z' });
      for (const x of [-270, -158]) b.push({ f: '@brick.2', d: `M${x} 0V-80h12V0z` });
      lit.push({ f: { rad: [[0, '@flood', 0.3], [1, '@flood', 0]], cx: -210, cy: -120, r: 150 }, d: 'M-280 0V-130L-210-262L-140-130V0z' });
      lit.push({ f: { rad: [[0, '@flood', 0.14], [1, '@flood', 0]], cx: 20, cy: -60, r: 160 }, d: 'M-150 0V-110H200V0z' });
      return { body: b, lit };
    },
  });

  /* ---------- the Southwood veteran oak ---------- */
  sceneObjDefine({
    id: 'landmark.southwood-oak',
    category: 'landmark',
    size: [720, 560],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base: { bark: ['#4e3f30', '#36291e', '#6e5a44'], leaf: ['#2e5226', '#46702e', '#6e9a40'] },
      spring: { leaf: ['#4e7a2e', '#6e9a3a', '#a2c454'] },
      autumn: { leaf: ['#8a5222', '#b8762e', '#dca042'] },
      winter: { leaf: ['#5a5046', '#6a6052', '#7a7060'], bark: ['#4a4038', '#322a24', '#6a6058'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -240], deg: 0.8 } },
    shadow: { rx: 300, ry: 26, h: 520 },
    reflect: true,
    tags: ['landmark', 'signature', 'natural', 'place:uk/southwood-country-park', 'uk', 'farnborough', 'oak', 'veteran tree', 'kit:temperate'],
    credit: 'drawn for the Fleet area pack: an open-grown veteran oak of the Southwood meadows',
    build(v, rnd, ctx) {
      const trunk = [], crown = [], bare = ctx.season === 'winter';
      // the trunk: a broad buttressed bole, lit on the left, bark furrows
      trunk.push({ f: '@bark.0', d: 'M-62 0C-52-20-40-60-38-150C-36-200-30-230-24-250H26C30-220 36-190 38-150C42-60 54-20 70 0z' });
      trunk.push({ f: '@bark.1', d: 'M10 0C20-40 26-100 24-160C24-200 22-230 26-250L26 0z', op: 0.55 });
      for (let i = 0; i < 9; i++) trunk.push({ s: '@bark.1', w: 1.2, op: 0.5, detail: true, d: `M${-34 + i * 8} -6C${-30 + i * 7} -80 ${-28 + i * 6} -160 ${-20 + i * 5} -240` });
      trunk.push({ f: '@bark.2', d: 'M-40-150C-38-100-46-40-56 0H-46C-40-40-32-100-34-150z', op: 0.6 });
      // the great limbs, spreading low and wide
      const limbs = [[-24, -230, -250, -330, 22], [-10, -250, -140, -440, 18], [10, -250, 120, -450, 18], [24, -230, 260, -320, 22], [0, -250, 0, -480, 16], [-30, -200, -320, -250, 14], [30, -200, 330, -240, 14]];
      for (const [x0, y0, x1, y1, w] of limbs) {
        const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 30;
        trunk.push({ s: '@bark.0', w, cap: 'round', d: `M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}` });
        trunk.push({ s: '@bark.1', w: w * 0.3, cap: 'round', op: 0.5, d: `M${x0 + 4} ${y0}Q${mx + 4} ${my + 6} ${x1} ${y1 + 4}` });
        // twigs at the limb's end
        for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2; trunk.push({ s: '@bark.0', w: w * 0.25, cap: 'round', d: `M${x1} ${y1}l${R(Math.cos(a) * 60)} ${R(Math.sin(a) * 60)}` }); }
      }
      // the crown: clumps of foliage in three tones (bare in winter: a few dead leaves and the twig mass)
      const clumps = [];
      for (let i = 0; i < 30; i++) { const a = Math.PI + Math.PI * (i / 29), r = 0.55 + rnd() * 0.45; clumps.push([Math.cos(a) * 330 * r, -300 + Math.sin(a) * 210 * r - 40, 70 + rnd() * 40, 50 + rnd() * 26]); }
      if (bare) {
        for (const [x, y] of clumps) crown.push({ s: '@leaf.0', w: 1.4, op: 0.55, d: `M${R(x)} ${R(y)}l${R(-20 + rnd() * 40)} ${R(-30 - rnd() * 20)}m${R(-10)} 10l${R(-14)} -16` });
        crown.push({ f: '@leaf.1', d: sceneD.lobed(rnd, 0, -330, 330, 170, 22, 0.3), op: 0.18 });
      } else {
        for (const [x, y, rx, ry] of clumps) crown.push({ f: '@leaf.0', d: sceneD.lobed(rnd, x + 6, y + 8, rx, ry, 9, 0.25) });
        for (const [x, y, rx, ry] of clumps) crown.push({ f: '@leaf.1', d: sceneD.lobed(rnd, x - 6, y - 6, rx * 0.8, ry * 0.75, 8, 0.25) });
        for (const [x, y, rx, ry] of clumps.filter((_, i) => i % 2 === 0)) crown.push({ f: '@leaf.2', d: sceneD.lobed(rnd, x - 16, y - 16, rx * 0.45, ry * 0.4, 7, 0.25), op: 0.9 });
      }
      return { trunk, crown };
    },
  });
})();

/* ============================================================
   ARCHETYPES (8.1): the area's three repeated scene types. Each build is
   pure and seeded from the row's id; the rows live in 71-scene-uk-fleet-*.js.
   ============================================================ */
const _fleetArch = (function () {
  const R = v => Math.round(v);
  const has = (p, f) => (p.features || []).includes(f);
  const band = (y, amp, ph, foot = 905) => `M-160 ${R(foot)}V${R(y)}Q${R(300 + ph)} ${R(y - amp)} ${R(800 + ph / 2)} ${R(y + amp * 0.4)}T1760 ${R(y - amp * 0.3)}V${R(foot)}Z`;
  const pal = {
    base: { wood: ['#4e6844', '#3c5436'], far: ['#7c94a0', '#98aeb6'], ground: ['#6a8a44', '#557236', '#42602c'], bank: ['#5d6a3a', '#4a5530'], reedbed: ['#6a7a3c', '#55632f'], path: ['#b49c76', '#9a8462'], road: ['#5e6062', '#7a7c7c'], pave: ['#b0aaa0', '#948e84'], gravel: ['#a8a090', '#8a8476'], lawn: ['#6e9246', '#5a7c3a', '#486832'] },
    spring: { wood: ['#5f7e48', '#486640'], ground: ['#74983e', '#5a7a30', '#466228'], reedbed: ['#6f8240', '#59692f'], lawn: ['#78a048', '#628a3c', '#4e7432'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], ground: ['#8a7e40', '#6e6232', '#54502a'], bank: ['#7a6c3a', '#5f5428'], reedbed: ['#9a8448', '#7a6634'], path: ['#a88a5e', '#8a7050'], lawn: ['#7e8a44', '#687236', '#545c2c'] },
    winter: { wood: ['#5a5a50', '#47483f'], ground: ['#8a9080', '#6e766a', '#586058'], bank: ['#7c7e70', '#62645a'], reedbed: ['#a39a78', '#857c5c'], path: ['#a49882', '#8a806e'], far: ['#9aa8b4', '#b8c4cc'], lawn: ['#8a9480', '#727c6a', '#5e6858'] },
  };
  const layers = () => [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
  const base = (p, setting) => ({
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 200, fov: 78, horizon: p.horizon || 480, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette: JSON.parse(JSON.stringify(pal)),
    layers: layers(), sky: { stars: 200, clouds: { n: 4, y: [40, Math.max(200, (p.horizon || 480) - 140)], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  });
  const ppl = (d, id, y) => scenePersonScale((sceneObj(id) || { size: [30, 64] }).size[1], y, d.view);
  /** The far wood on the horizon: a hazed mass and its crowns (static), optional distant pines. */
  const farWood = (d, H, seed, o = {}) => {
    d.ground.push({ layer: 'horizon', d: band(H - 8, 10, seed * 7 % 200, H + 40), fill: '@wood.0' });
    if (o.pines) for (const v of [0, 1]) d.scatter.push({ obj: 'tree.far-pine', layer: 'horizon', seed: seed + 300 + v, area: { rect: [-150 + v * 900, H - 2, 850 + v * 900, H + 16] }, n: 3, minGap: 20, s: [0.2, 0.6], flip: 0.5, variant: v, tint: { col: '#7a8a9a', k: [0, 0.1] }, anim: false });
    d.scatter.push({ obj: 'tree.pond-wood', layer: 'horizon', seed: seed, area: { rect: [-150, H - 2, 1750, H + 16] }, n: o.n || 22, minGap: 24, s: [0.2, 0.58], flip: 0.5, variant: 'random', tint: { col: '#7a8a9a', k: [0, 0.1] }, mask: { noise: { scale: 200, cut: 0.25 } }, anim: false });
  };
  const flocks = (d, H, seed, kind) => {
    d.flocks.push({ obj: kind === 'water' ? 'bird.goose-flight' : 'bird.small-flight', n: 6, area: [100, 120, 1500, Math.max(220, H - 140)], speed: 32, s: kind === 'water' ? 0.32 : 0.5, seed: seed, layer: 'horizon' });
    d.flocks.push({ obj: 'bird.small-flight', n: 5, area: [500, 180, 1500, Math.max(260, H - 60)], speed: 44, s: 0.42, seed: seed + 1, layer: 'horizon' });
  };
  const sOf = (id, h) => { const o = sceneObj(id); return o && o.size ? Math.round(h / o.size[1] * 100) / 100 : 1; };
  const landmark = (d, p, y, layer) => {
    if (!p.landmark || !sceneObj(p.landmark)) return;
    d.place.push({ obj: p.landmark, x: Number.isFinite(p.lmx) ? p.lmx : 800, y, s: Number.isFinite(p.lms) ? p.lms : 1, variant: Number.isFinite(p.lmv) ? p.lmv : 0, layer: layer || 'mid', seed: 3, reflect: true, anim: false });
  };
  /** Every scatter rule without its own tint gets a gentle one (breaks up the stamp, 10.2 variety). */
  const finish = (d) => {
    // a gentle tint on the dense rules (two tint buckets: 0 and 0.08), at most two variants a rule (fewer distinct sprites)
    // a dense rule becomes two half rules: variant 0 untinted and variant 1 tinted (two sprites an object, not four)
    const out = [];
    d.scatter.forEach((r, i) => {
      if (r.variant === 'random') r.variant = [0, 1];
      if (r.n >= 30 && !r.tint && Array.isArray(r.variant) && r.variant[0] === 0 && r.variant[1] === 1) {
        const h = Math.round(r.n / 2);
        out.push(Object.assign({}, r, { n: h, variant: 0 }), Object.assign({}, r, { n: r.n - h, variant: 1, seed: r.seed + 500, tint: { col: i % 2 ? '#8a7a40' : '#6a7a3a', k: [0.08, 0.08] } }));
      } else { if (!r.tint && r.n >= 20) r.tint = { col: '#7a8a6a', k: [0, 0.1] }; out.push(r); }
    });
    d.scatter = out;
    // with water: everything from the horizon to the mid layer may stand at an edge, so it mirrors
    if (d.water.length) for (const e of d.scatter.concat(d.place)) if (['horizon', 'far', 'mid'].includes(e.layer) && e.reflect == null) e.reflect = true;
    delete d.pathAvoid;
    return d;
  };
  const AT = ['afternoon', 'dawn', 'morning', 'day', 'noon', 'golden', 'sunset', 'dusk', 'night'];
  const common = { id: 'id', name: 'sign', lat: 'number', lon: 'number', heading: 'number', horizon: 'number', at: AT, lmx: 'number', lms: 'number', lmv: 'number', features: 'list' };

  /* ---------- fleet-water: pond (lake), canal (channel), or a water band across ---------- */
  function water(p, u) {
    const d = base(p, 'natural'), H = d.view.horizon, form = p.form || 'lake', SH = H + 34;
    farWood(d, H, 11, { pines: true });
    const blue = ['#8ab6c4', '#4f8ca0', '#2c5f74'];
    if (form === 'lake') {
      // the far shore and its trees mirrored in the open water; a near bank (reeds / grass) along the foot
      const nb = Number.isFinite(p.nearbank) ? p.nearbank : 800;
      d.ground.push({ layer: 'far', d: band(SH - 4, 3, 40, SH + 6), fill: '@bank.1' });
      d.water.push({ layer: 'far', d: `M-160 ${SH}H1760V905H-160Z`, y0: SH, y1: 905, base: blue, reflect: true, shimmer: 34, lightPath: true });
      d.scatter.push({ obj: { 'tree.pond-alder': 2, 'tree.pond-oak': 2, 'tree.pond-birch': 1, 'tree.pond-pine': has(p, 'pines') ? 1 : 0.2 }, layer: 'far', seed: 12, area: { rect: [-150, SH - 6, 1750, SH + 2] }, n: 34, minGap: 24, s: [0.16, 0.46], flip: 0.5, variant: 'random', anim: false, reflect: true });
      if (has(p, 'houses')) d.scatter.push({ obj: 'building.cottage', layer: 'far', seed: 18, area: { rect: p.side === 'left' ? [900, SH - 8, 1700, SH - 2] : [-100, SH - 8, 700, SH - 2] }, n: 6, minGap: 70, s: [0.11, 0.22], flip: 0.5, variant: 'random', reflect: true, mask: { noise: { scale: 90, cut: 0.4 } } });
      d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'far', seed: 13, area: { rect: [-150, SH - 2, 1750, SH + 4] }, n: 110, minGap: 16, s: [0.12, 0.26], flip: 0.5, variant: 'random', anim: false, reflect: true });
      // the near bank: a reed margin and grass, swaying in wind strips
      d.ground.push({ layer: 'fore', d: band(nb, 14, 120), fill: { lin: [[0, '@reedbed.0'], [1, '@bank.1']], y1: nb - 10, y2: 900 } });
      d.scatter.push({ obj: { 'plant.reed': 5, 'plant.bulrush': 2, 'plant.grass': 2 }, layer: 'fore', seed: 14, area: { rect: [-150, nb - 6, 1750, 905] }, n: 320, minGap: 12, s: [0.9, 1.4], sByY: [[nb, 0.8], [900, 1.3]], flip: 0.5, variant: 'random', anim: 'strip', reflect: true, mask: { avoid: p.gap ? [{ rect: p.gap }] : [] } });
      // a wooded side bank on the left or right (near layer), mirrored in the water
      const side = p.side || 'right', xs = side === 'left' ? [-160, 380] : [1220, 1760];
      const bankY = H + 110;
      d.ground.push({ layer: 'near', d: side === 'left' ? `M-160 905V${bankY}Q160 ${bankY + 10} 380 ${bankY + 60}Q420 ${bankY + 200} 300 905Z` : `M1760 905V${bankY}Q1440 ${bankY + 10} 1220 ${bankY + 60}Q1180 ${bankY + 200} 1300 905Z`, fill: { lin: [[0, '@bank.0'], [1, '@reedbed.1']], y1: bankY, y2: 900 } });
      d.scatter.push({ obj: { 'tree.bank-willow': 2, 'tree.bank-alder': 2, 'tree.bank-oak': 2, 'tree.bank-birch': 1 }, layer: 'near', seed: 15, area: { rect: [xs[0] + 40, bankY + 6, xs[1] - 40, bankY + 40] }, n: 6, minGap: 90, s: [0.6, 0.95], flip: 0.5, variant: 'random', anim: false, reflect: true });
      d.scatter.push({ obj: { 'plant.reed': 4, 'plant.bulrush': 2 }, layer: 'near', seed: 16, area: { rect: [xs[0] + 20, bankY + 40, xs[1] - 20, nb] }, n: 190, minGap: 13, s: [0.6, 0.95], sByY: [[bankY, 0.7], [nb, 1.2]], flip: 0.5, variant: 'random', anim: false, reflect: true });
      // birds on the water, lilies, fish rising
      const swim = [['bird.swan', 0.22], ['bird.goose', 0.17], ['bird.coot', 0.24], ['bird.grebe', 0.22], ['bird.mallard', 0.3]];
      for (let i = 0; i < 8; i++) { const [id, s] = swim[i % swim.length], y = SH + 30 + (i * 37) % (nb - SH - 60); d.place.push({ obj: id, x: 180 + (i * 173) % 1100, y, s: s * (0.8 + (y - SH) / 300), flip: i % 2 === 1, variant: i % 2, layer: 'mid', seed: 20 + i, reflect: true }); }
      if (has(p, 'lilies')) d.place.push({ obj: 'water.edge', x: 540, y: nb - 120, s: 0.34, layer: 'near', seed: 33 }, { obj: 'water.edge', x: 980, y: nb - 60, s: 0.5, flip: true, variant: 1, layer: 'near', seed: 34 }, { obj: 'water.edge', x: 760, y: nb - 24, s: 0.62, layer: 'near', seed: 35 });
      if (has(p, 'lilies')) d.scatter.push({ obj: 'water.lily', layer: 'near', seed: 17, area: { rect: [500, nb - 160, 1100, nb - 20] }, n: 14, minGap: 30, s: [0.2, 0.64], sByY: [[nb - 160, 0.7], [nb - 20, 1.35]], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 70, cut: 0.35 } }, anim: false });
      d.place.push({ obj: 'water.fish-ring', x: 820, y: SH + 120, s: 0.5, layer: 'mid', seed: 30 }, { obj: 'water.fish-ring', x: 520, y: SH + 70, s: 0.36, variant: 1, layer: 'mid', seed: 31 }, { obj: 'water.fish-ring', x: 1060, y: SH + 200, s: 0.44, layer: 'mid', seed: 32 });
      d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[1180, SH + 70], [380, SH + 84]], speed: 5, loop: 'pingpong', s: 0.25, seed: 40, offset: 0.15 });
      d.actors.push({ obj: 'bird.grebe', layer: 'mid', path: [[860, SH + 150], [1080, SH + 110]], speed: 4, loop: 'pingpong', s: 0.27, seed: 41, offset: 0.6 });
      d.actors.push({ obj: 'bird.coot', layer: 'mid', path: [[420, SH + 130], [600, SH + 180]], speed: 6, loop: 'pingpong', s: 0.27, seed: 42, offset: 0.3 });
      d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[900, SH + 40], [620, SH + 30]], speed: 5, loop: 'pingpong', s: 0.22, seed: 43, offset: 0.8 });
      d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'near', path: [[1700, nb - 60], [960, nb - 50], [600, nb - 70]], speed: 160, loop: 'loop', s: 0.9, seed: 44, offset: 0.1 });
      d.actors.push({ obj: 'animal.dragonfly', layer: 'near', path: [[640, nb - 30], [760, nb - 60], [700, nb - 10], [820, nb - 40]], speed: 40, loop: 'pingpong', s: 0.6, seed: 45 });
      if (has(p, 'train')) {
        d.place.push(...[0, 1, 2, 3].map(i => ({ obj: 'rail.embankment', x: (p.trainx || 0) + i * 155, y: SH - 6, s: 0.34, variant: 1, layer: 'horizon', seed: 50 + i })));
        d.actors.push({ obj: 'rail.train', layer: 'horizon', path: [[-700, SH - 30], [2300, SH - 30]], speed: 70, loop: 'loop', s: 0.3, seed: 54, offset: 0.4, variant: 1 });
      }
      if (has(p, 'heron')) d.place.push({ obj: 'bird.heron', x: p.side === 'left' ? 1300 : 300, y: nb + 4, s: 0.7, layer: 'fore', seed: 55 });
      landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : 905, p.lmlayer || 'fore');
      if (has(p, 'walkers')) {
        const wy = Number.isFinite(p.walky) ? p.walky : nb + 40;
        d.actors.push({ obj: 'person.dog-walker', layer: 'fore', path: [[p.walkx0 || 280, wy], [p.walkx1 || 520, wy]], speed: 9, loop: 'pingpong', s: ppl(d, 'person.dog-walker', wy), seed: 56, offset: 0.4, variant: 2 });
        d.place.push({ obj: 'person.walker', x: (p.walkx0 || 280) + 60, y: wy, s: ppl(d, 'person.walker', wy), variant: 1, layer: 'fore', seed: 57, anim: false });
      }
      flocks(d, H, 60, 'water');
      return finish(d);
    }
    if (form === 'channel') {
      // the canal receding to the vanishing point; the towpath on one side, wooded banks both sides
      const vx = Number.isFinite(p.vx) ? p.vx : 820, tow = p.side || 'left', y0 = H + 22;
      const wl = (y) => { const t = (y - y0) / (905 - y0); return [vx - 18 - t * 700, vx + 18 + t * 700]; };
      const [a1, b1] = wl(905);
      d.water.push({ layer: 'far', d: `M${vx - 18} ${y0}H${vx + 18}L${R(b1)} 905H${R(a1)}Z`, y0, y1: 905, base: ['#7aa49c', '#4a7a70', '#2a5048'], reflect: true, shimmer: 26, lightPath: true });
      // the banks: towpath on one side (gravel ribbon), a grass and hedge bank on the other
      const L = `M-160 905V${y0 - 2}H${vx - 18}L${R(a1)} 905Z`, Rr = `M1760 905V${y0 - 2}H${vx + 18}L${R(b1)} 905Z`;
      d.ground.push({ layer: 'far', d: L, fill: { lin: [[0, '@bank.0'], [1, '@ground.2']], y1: y0, y2: 900 } }, { layer: 'far', d: Rr, fill: { lin: [[0, '@bank.0'], [1, '@ground.2']], y1: y0, y2: 900 } });
      const towD = tow === 'left' ? `M${vx - 22} ${y0}L${vx - 40} ${y0}L${R(a1 - 420)} 905H${R(a1 - 10)}Z` : `M${vx + 22} ${y0}L${vx + 40} ${y0}L${R(b1 + 420)} 905H${R(b1 + 10)}Z`;
      d.ground.push({ layer: 'mid', d: towD, fill: { lin: [[0, '@path.1'], [1, '@path.0']], y1: y0, y2: 900 } });
      // trees lining both banks, getting larger toward the viewer (near layer), the canopy closing over far
      for (const [sgn, seed] of [[-1, 70], [1, 71]]) {
        for (let i = 0; i < 9; i++) {
          const t = Math.pow(i / 8, 1.6), y = R(y0 + 4 + t * 330), xs = wl(y), off = (sgn < 0 ? (tow === 'left' ? 240 : 40) : (tow === 'right' ? 240 : 40)) * (0.2 + t);
          const x = sgn < 0 ? xs[0] - off : xs[1] + off;
          const id = ['tree.bank-oak', 'tree.bank-alder', 'tree.bank-birch'][(i + seed) % 3];
          d.place.push({ obj: id, x: R(x), y, s: Math.round((0.14 + t * 1.0) * (id.startsWith('tree.bank') ? 1 : id.startsWith('tree.pond') ? 1.3 : 0.8) * 100) / 100, flip: sgn > 0, variant: t < 0.45 ? 0 : 1, layer: t < 0.45 ? 'mid' : 'near', seed: seed * 10 + i, anim: false, reflect: true });
        }
      }
      // the hedge and reed fringe along both water edges, cover on the banks
      d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.towpath-hedge': 0.6 }, layer: 'mid', seed: 72, area: { poly: [[vx - 20, y0], [vx - 60, y0], [R(a1 - 160), 905], [R(a1), 905]] }, n: 160, minGap: 10, s: [0.2, 1.1], sByY: [[y0, 0.3], [900, 1.3]], flip: 0.5, variant: 'random', anim: false, reflect: true });
      d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.towpath-hedge': 0.6 }, layer: 'mid', seed: 73, area: { poly: [[vx + 20, y0], [vx + 60, y0], [R(b1 + 160), 905], [R(b1), 905]] }, n: 160, minGap: 10, s: [0.2, 1.1], sByY: [[y0, 0.3], [900, 1.3]], flip: 0.5, variant: 'random', anim: false, reflect: true });
      const chAvoid = { avoid: [{ poly: [[vx - 30, y0], [vx + 30, y0], [R(b1 + 20), 905], [R(a1 - 20), 905]] }, { poly: tow === 'left' ? [[vx - 40, y0], [vx - 20, y0], [R(a1), 905], [R(a1 - 440), 905]] : [[vx + 20, y0], [vx + 40, y0], [R(b1 + 440), 905], [R(b1), 905]] }] };
      d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bracken': 1 }, layer: 'near', seed: 174, area: { rect: [-160, H + 160, 1760, H + 300] }, n: 160, minGap: 14, s: [0.5, 0.9], flip: 0.5, variant: 'random', anim: false, mask: chAvoid });
      d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bracken': 1 }, layer: 'fore', seed: 74, area: { rect: [-160, H + 300, 1760, 905] }, n: 200, minGap: 18, s: [0.9, 1.4], sByY: [[H + 300, 0.85], [900, 1.2]], flip: 0.5, variant: 'random', anim: 'strip', mask: { avoid: [{ poly: [[vx - 30, y0], [vx + 30, y0], [R(b1 + 20), 905], [R(a1 - 20), 905]] }, { poly: tow === 'left' ? [[vx - 40, y0], [vx - 20, y0], [R(a1), 905], [R(a1 - 440), 905]] : [[vx + 20, y0], [vx + 40, y0], [R(b1 + 440), 905], [R(b1), 905]] }] } });
      d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'far', seed: 75, area: { rect: [-160, y0 - 2, 1760, H + 160] }, n: 150, minGap: 15, s: [0.2, 0.6], sByY: [[y0, 0.4], [H + 160, 1]], flip: 0.5, variant: 'random', anim: false, mask: { avoid: [{ poly: [[vx - 60, y0 - 4], [vx + 60, y0 - 4], [R(wl(H + 160)[1] + 60), H + 160], [R(wl(H + 160)[0] - 60), H + 160]] }] } });
      // narrowboats: one moored on the off side, one under way
      const ny = R(H + 130), nx = wl(ny);
      if (has(p, 'moored')) d.place.push({ obj: 'boat.narrowboat-receding', x: R(tow === 'left' ? nx[1] - 30 : nx[0] + 30), y: ny + 60, s: 0.55, variant: 2, flip: tow !== 'left', layer: 'mid', seed: 76, reflect: true });
      d.actors.push({ obj: 'boat.narrowboat-receding', layer: 'mid', path: [[vx + 4, y0 + 18], [R((nx[0] + nx[1]) / 2), ny + 120]], speed: 3, loop: 'pingpong', s: 0.5, seed: 77, offset: 0.3, variant: 0 });
      d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[vx - 6, y0 + 40], [vx + 40, H + 240]], speed: 3, loop: 'pingpong', s: 0.3, seed: 78, offset: 0.6 });
      d.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[R(a1 + 300), 860], [R(b1 - 300), 830]], speed: 6, loop: 'pingpong', s: 0.45, seed: 79 });
      d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'near', path: [[R(b1), 700], [vx, y0 + 60]], speed: 150, loop: 'loop', s: 0.8, seed: 80 });
      // the towpath's walkers, a cyclist and an angler on the bank
      const tp = (t) => { const y = y0 + t * (905 - y0), xs = wl(y); return [R(tow === 'left' ? xs[0] - 30 - t * 160 : xs[1] + 30 + t * 160), R(y)]; };
      const walkPath = [tp(0.08), tp(0.95)];
      d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: walkPath, speed: 10, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 760), sByY: true, seed: 81, offset: 0.2 });
      d.actors.push({ obj: 'person.cyclist', layer: 'near', path: walkPath.slice().reverse(), speed: 30, loop: 'loop', s: ppl(d, 'person.cyclist', 700), sByY: true, seed: 82, offset: 0.7 });
      d.actors.push({ obj: 'person.walker', layer: 'near', path: walkPath, speed: 8, loop: 'pingpong', s: ppl(d, 'person.walker', 700), sByY: true, seed: 83, offset: 0.65, variant: 3 });
      if (has(p, 'angler')) { const [ax, ay] = tp(0.55); d.place.push({ obj: 'person.angler', x: tow === 'left' ? ax + 90 : ax - 90, y: ay, s: ppl(d, 'person.angler', ay) * 0.75 * 64 / 83, flip: tow !== 'left', layer: 'near', seed: 84 }); }
      d.place.push({ obj: 'bird.coot', x: vx + 30, y: H + 150, s: 0.3, layer: 'mid', seed: 85, reflect: true }, { obj: 'bird.moorhen', x: vx - 60, y: H + 230, s: 0.34, layer: 'mid', seed: 86, flip: true, reflect: true });
      landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : y0 + 6, p.lmlayer || 'far');
      flocks(d, H, 87, 'land');
      return finish(d);
    }
    // band: water across the scene (a side-on canal or brook) between a far bank and a near bank
    const wy0 = Number.isFinite(p.wy0) ? p.wy0 : H + 150, wy1 = Number.isFinite(p.wy1) ? p.wy1 : H + 270;
    d.ground.push({ layer: 'far', d: band(H + 4, 6, 60), fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: H, y2: wy0 } });
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 2, 'tree.bank-birch': 1, 'tree.bank-distant': 2 }, layer: 'far', seed: 90, area: { rect: [-150, H + 10, 1750, H + 40] }, n: 18, minGap: 40, s: [0.24, 0.56], flip: 0.5, variant: 'random', anim: false, mask: { noise: { scale: 220, cut: 0.3 } } });
    d.ground.push({ layer: 'mid', d: band(wy0 - 34, 4, 30, wy0 + 6), fill: '@bank.0' });
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 2, 'tree.bank-willow': 1, 'tree.bank-birch': 1 }, layer: 'mid', seed: 91, area: { rect: [-150, wy0 - 30, 1750, wy0 - 8] }, n: 11, minGap: 70, s: [0.34, 0.92], flip: 0.5, variant: 'random', anim: false, reflect: true, mask: { avoid: p.lmx != null ? [{ rect: [p.lmx - 380, wy0 - 60, p.lmx + 380, wy0] }] : [] } });
    d.scatter.push({ obj: { 'plant.towpath-hedge': 1, 'plant.reed': 2, 'plant.grass': 3 }, layer: 'mid', seed: 92, area: { rect: [-150, wy0 - 30, 1750, wy0 + 2] }, n: 170, minGap: 12, s: [0.3, 0.85], sByY: [[wy0 - 30, 0.75], [wy0 + 2, 1.25]], flip: 0.5, variant: 'random', anim: false, reflect: true, mask: { avoid: p.lmx != null ? [{ rect: [p.lmx - 340, wy0 - 60, p.lmx + 340, wy0 + 4] }] : [] } });
    d.water.push({ layer: 'mid', d: `M-160 ${wy0}H1760V${wy1}H-160Z`, y0: wy0, y1: wy1, base: ['#7aa49c', '#4a7a70', '#2a5048'], reflect: true, shimmer: 26, lightPath: true });
    // the near towpath bank and its cover
    d.ground.push({ layer: 'near', d: band(wy1 - 2, 3, 80), fill: { lin: [[0, '@path.1'], [0.25, '@path.0'], [0.4, '@ground.1'], [1, '@ground.2']], y1: wy1, y2: 905 } });
    d.scatter.push({ obj: { 'plant.reed': 2, 'plant.grass': 3, 'plant.bulrush': 1 }, layer: 'near', seed: 93, area: { rect: [-150, wy1 - 2, 1750, wy1 + 10] }, n: 70, minGap: 22, s: [0.25, 1.0], flip: 0.5, variant: 'random', anim: false, reflect: true, mask: { noise: { scale: 200, cut: 0.4 } } });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.fern': 1, 'plant.bracken': 1 }, layer: 'fore', seed: 94, area: { rect: [-150, wy1 + 60, 1750, 905] }, n: 300, minGap: 16, s: [0.8, 1.4], sByY: [[wy1 + 60, 0.8], [900, 1.3]], flip: 0.5, variant: 'random', anim: 'strip' });
    d.place.push({ obj: 'tree.bank-oak', x: -40, y: 905, s: 1.6, variant: 1, layer: 'front', seed: 95, anim: false }, { obj: 'tree.bank-alder', x: 1690, y: 905, s: 1.7, flip: true, variant: 2, layer: 'front', seed: 96, anim: false });
    // boats and birds on the water; walkers and a cyclist along the towpath
    if (has(p, 'moored')) d.place.push({ obj: 'boat.narrowboat', x: Number.isFinite(p.boatx) ? p.boatx : 1180, y: R(wy0 + (wy1 - wy0) * 0.35), s: 0.6, variant: 1, layer: 'mid', seed: 97, reflect: true });
    d.actors.push({ obj: 'boat.narrowboat', layer: 'mid', path: [[-400, R(wy0 + (wy1 - wy0) * 0.62)], [2000, R(wy0 + (wy1 - wy0) * 0.62)]], speed: 6, loop: 'loop', s: 0.72, seed: 98, offset: 0.3, variant: 0 });
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[300, R(wy0 + 40)], [900, R(wy0 + 30)]], speed: 4, loop: 'pingpong', s: 0.3, seed: 99, offset: 0.5 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1300, R(wy1 - 20)], [800, R(wy1 - 26)]], speed: 5, loop: 'pingpong', s: 0.36, seed: 100, offset: 0.2 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[1800, R(wy0 + 20)], [-200, R(wy0 + 30)]], speed: 170, loop: 'loop', s: 0.7, seed: 101 });
    const ty = R(wy1 + 30);
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: [[-80, ty], [1680, ty]], speed: 12, loop: 'loop', s: ppl(d, 'person.dog-walker', ty), seed: 102, offset: 0.1 });
    d.actors.push({ obj: 'person.cyclist', layer: 'near', path: [[1700, ty + 8], [-100, ty + 8]], speed: 34, loop: 'loop', s: ppl(d, 'person.cyclist', ty + 8), seed: 103, offset: 0.55, flip: true });
    d.actors.push({ obj: 'person.jogger', layer: 'near', path: [[-100, ty + 4], [1700, ty + 4]], speed: 24, loop: 'loop', s: ppl(d, 'person.jogger', ty + 4), seed: 104, offset: 0.8 });
    if (has(p, 'angler')) d.place.push({ obj: 'person.angler', x: 360, y: ty - 6, s: ppl(d, 'person.angler', ty) * 0.75 * 64 / 83, layer: 'near', seed: 105 });
    if (has(p, 'heron')) d.place.push({ obj: 'bird.heron', x: 1380, y: wy1 + 2, s: 0.55, layer: 'near', seed: 106, reflect: true });
    if (has(p, 'bench')) d.place.push({ obj: 'street.bench', x: 1240, y: ty + 40, s: 0.9, layer: 'near', seed: 107 });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'near', path: [[500, wy1 - 20], [700, wy1 - 50], [620, wy1 + 10]], speed: 40, loop: 'pingpong', s: 0.6, seed: 108 });
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : R(wy0 + (wy1 - wy0) * 0.5), p.lmlayer || 'mid');
    flocks(d, H, 109, 'land');
    return finish(d);
  }

  /* ---------- fleet-green: meadow, wood, wetland or lawn round a signature ---------- */
  function green(p, u) {
    const d = base(p, 'natural'), H = d.view.horizon, kind = p.form || 'meadow';
    const wood = kind === 'wood';
    farWood(d, H, 21, { n: wood ? 30 : 20 });
    d.ground.push({ layer: 'far', d: band(H + 6, 6, 20), fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: H, y2: H + 120 } });
    d.ground.push({ layer: 'mid', d: band(H + 70, 8, 180), fill: { lin: [[0, kind === 'lawn' ? '@lawn.0' : '@ground.0'], [1, kind === 'lawn' ? '@lawn.1' : '@ground.1']], y1: H + 60, y2: 905 } });
    d.ground.push({ layer: 'near', d: band(H + 190, 10, 60), fill: { lin: [[0, kind === 'lawn' ? '@lawn.1' : '@ground.1'], [1, kind === 'lawn' ? '@lawn.2' : '@ground.2']], y1: H + 180, y2: 905 } });
    // a path winding toward the signature
    if (kind !== 'lawn' && !has(p, 'nopath')) {
      const px = Number.isFinite(p.pathx) ? p.pathx : 700;
      d.ground.push({ layer: 'mid', d: `M${px - 8} ${H + 70}C${px - 60} ${H + 160} ${px + 140} ${H + 240} ${px - 120} 905H${px + 140}C${px + 300} ${H + 240} ${px + 20} ${H + 160} ${px + 8} ${H + 70}Z`, fill: { lin: [[0, '@path.1'], [1, '@path.0']], y1: H + 70, y2: 905 } });
      d.pathAvoid = { poly: [[px - 30, H + 64], [px + 30, H + 64], [px + 180, 905], [px - 160, 905]] };
    }
    const avoid = d.pathAvoid ? [d.pathAvoid] : [];
    if (p.lmx != null) avoid.push({ rect: [p.lmx - 120, H + 40, p.lmx + 120, (p.lmy || H + 160) + 4] });
    // trees: a wood stands thick in far and mid; a meadow has scattered oaks and birch on its edges
    d.scatter.push({ obj: { 'tree.far-broad': 2, 'tree.bank-distant': 1, 'tree.far-birch': 1 }, layer: 'far', seed: 122, area: { rect: [-150, H + 4, 1750, H + 30] }, n: wood ? 26 : 14, minGap: 20, s: [0.25, 0.85], flip: 0.5, variant: 'random', anim: false, mask: { noise: { scale: 140, cut: 0.4 }, avoid: p.lmx != null && !wood ? [{ rect: [p.lmx - 260, H - 20, p.lmx + 260, H + 40] }] : [] } });
    const treeMix = wood ? { 'tree.bank-birch': 3, 'tree.bank-oak': 2 } : { 'tree.bank-oak': 2, 'tree.pond-oak': 1, 'tree.bank-birch': 1, 'tree.pond-alder': 1 };
    d.scatter.push({ obj: treeMix, layer: 'mid', seed: 23, area: { rect: [-150, H + 70, 1750, H + 120] }, n: wood ? 16 : 7, minGap: wood ? 60 : 90, s: [0.4, 0.75], flip: 0.5, variant: 'random', anim: false, mask: { avoid } });
    if (wood) d.scatter.push({ obj: treeMix, layer: 'near', seed: 24, area: { rect: [-150, H + 200, 1750, H + 260] }, n: 7, minGap: 70, s: [1.0, 1.4], flip: 0.5, variant: 'random', anim: false, mask: { noise: { scale: 260, cut: 0.35 }, avoid: avoid.concat([{ rect: [500, H, 1100, 905] }]) } });
    d.place.push({ obj: wood ? 'tree.bank-birch' : 'tree.bank-oak', x: -40, y: 910, s: 1.9, variant: 1, layer: 'front', seed: 25, anim: false });
    d.place.push({ obj: wood ? 'tree.bank-oak' : 'tree.bank-alder', x: 1680, y: 910, s: 1.8, flip: true, variant: 0, layer: 'front', seed: 26, anim: false });
    // cover: meadow grasses and flowers, or bracken, ferns and bluebells under the wood
    const cover = wood ? { 'plant.fern': 2, 'plant.bracken': 3, 'plant.grass': 2, 'plant.bluebells': has(p, 'bluebells') ? 3 : 0.5 } :
      kind === 'wetland' ? { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.grass': 3, 'plant.wildflowers': 1 } :
      kind === 'lawn' ? { 'plant.grass': 3, 'plant.wildflowers': 1 } : { 'plant.grass': 4, 'plant.wildflowers': 3, 'plant.bracken': 0.5 };
    const midCover = wood ? { 'plant.grass': 3, 'plant.bluebells': has(p, 'bluebells') ? 2 : 0.4 } : cover;
    d.scatter.push({ obj: midCover, layer: 'mid', seed: 27, area: { rect: [-150, H + 76, 1750, H + 200] }, n: 260, minGap: 12, s: [0.3, 0.6], sByY: [[H + 76, 0.7], [H + 200, 1.2]], flip: 0.5, variant: 'random', anim: false, mask: { avoid } });
    d.scatter.push({ obj: cover, layer: 'near', seed: 28, area: { rect: [-150, H + 196, 1750, H + 300] }, n: 200, minGap: 19, s: [0.6, 0.95], flip: 0.5, variant: 'random', anim: false, mask: { avoid } });
    d.scatter.push({ obj: cover, layer: 'fore', seed: 29, area: { rect: [-150, H + 296, 1750, 905] }, n: 190, minGap: 24, s: [1.0, 1.5], flip: 0.5, variant: 'random', anim: 'strip', mask: { avoid } });
    if (has(p, 'brook')) {
      const by = Number.isFinite(p.brooky) ? p.brooky : H + 160;
      d.water.push({ layer: 'mid', d: `M-160 ${by}Q400 ${by - 14} 800 ${by + 6}T1760 ${by - 4}V${by + 26}Q1200 ${by + 36} 800 ${by + 24}T-160 ${by + 22}Z`, y0: by - 14, y1: by + 36, base: ['#86b0b8', '#4e8290', '#2c5664'], reflect: true, shimmer: 18, lightPath: false });
      d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'mid', seed: 30, area: { rect: [-150, by - 20, 1750, by - 4] }, n: 80, minGap: 16, s: [0.34, 0.66], flip: 0.5, variant: 'random', anim: false, reflect: true });
      d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[200, by + 14], [700, by + 18]], speed: 4, loop: 'pingpong', s: 0.3, seed: 31 }, { obj: 'bird.moorhen', layer: 'mid', path: [[1300, by + 16], [1000, by + 12]], speed: 3, loop: 'pingpong', s: 0.3, seed: 32 });
      if (has(p, 'boardwalk')) d.place.push({ obj: 'structure.boardwalk', x: p.bwx || 1000, y: by + 40, s: 1.1, layer: 'mid', seed: 33 });
    }
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : H + 120, p.lmlayer || 'mid');
    // life: walkers and a dog on the path, deer at the wood's edge, rabbits, squirrels, butterflies, birds
    const px = Number.isFinite(p.pathx) ? p.pathx : 700;
    const wpath = kind === 'lawn' ? [[-80, H + 230], [1680, H + 250]] : [[px, H + 90], [px + 60, H + 200], [px - 40, 860]];
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: wpath, speed: 9, loop: 'pingpong', s: ppl(d, 'person.dog-walker', H + 200), sByY: true, seed: 34, offset: 0.25 });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: wpath.slice().reverse(), speed: 8, loop: 'pingpong', s: ppl(d, 'person.walker', H + 200), sByY: true, seed: 35, offset: 0.7, variant: 4 });
    if (has(p, 'family')) d.actors.push({ obj: 'person.walker', layer: 'near', path: [[1700, H + 260], [900, H + 270]], speed: 6, loop: 'pingpong', s: ppl(d, 'person.walker', H + 260), seed: 36, offset: 0.4, variant: 6 });
    if (has(p, 'jogger')) d.actors.push({ obj: 'person.jogger', layer: 'near', path: [[-100, H + 280], [1700, H + 290]], speed: 22, loop: 'loop', s: ppl(d, 'person.jogger', H + 280), seed: 37, offset: 0.1 });
    if (has(p, 'deer')) d.place.push({ obj: 'animal.deer', x: 1240, y: H + 96, s: 0.42, layer: 'mid', seed: 38 }, { obj: 'animal.deer', x: 1300, y: H + 100, s: 0.38, flip: true, variant: 1, layer: 'mid', seed: 39 });
    d.place.push({ obj: 'animal.rabbit', x: 380, y: H + 230, s: 0.5, layer: 'near', seed: 40 }, { obj: 'animal.squirrel', x: 1120, y: H + 250, s: 0.6, layer: 'near', seed: 41, flip: true }, { obj: 'bird.robin', x: 260, y: H + 320, s: 0.7, layer: 'fore', seed: 42 });
    d.actors.push({ obj: 'animal.butterfly', layer: 'fore', path: [[200, 760], [360, 720], [300, 820]], speed: 30, loop: 'pingpong', s: 0.7, seed: 43, variant: 2 });
    d.actors.push({ obj: 'animal.butterfly', layer: 'near', path: [[1100, 700], [1260, 660], [1200, 740]], speed: 26, loop: 'pingpong', s: 0.6, seed: 44, variant: 0 });
    if (has(p, 'aircraft')) d.actors.push({ obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 160], [1800, 120]], speed: 40, loop: 'loop', s: 0.5, seed: 45, offset: 0.3 });
    if (has(p, 'bench')) d.place.push({ obj: 'street.bench', x: p.benchx || 1000, y: H + 260, s: 1.1, layer: 'near', seed: 46 });
    if (has(p, 'log')) d.place.push({ obj: 'ground.log', x: p.logx || 1100, y: H + 330, s: 1.1, layer: 'fore', seed: 47 });
    flocks(d, H, 48, 'land');
    return finish(d);
  }

  /* ---------- fleet-town: a street, church or station view (urban) ---------- */
  function town(p, u) {
    const d = base(p, 'urban'), H = d.view.horizon, kind = p.form || 'street';
    farWood(d, H, 51, { n: 16 });
    const fy = Number.isFinite(p.fronty) ? p.fronty : H + 150;   // the frontage line (the signature stands here)
    d.ground.push({ layer: 'far', d: band(H + 4, 4, 20), fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: H, y2: fy } });
    // the frontage: terraces and houses along the far side, trees between
    d.scatter.push({ obj: { 'building.terrace': 3, 'building.cottage': 1 }, layer: 'far', seed: 52, area: { rect: [-150, H + 20, 1750, H + 40] }, n: 12, minGap: 120, s: [0.4, 0.6], flip: 0.5, variant: 'random', tint: { col: '#9aa8b4', k: [0, 0.12] }, mask: { avoid: [{ rect: [(p.lmx || 800) - 330, H - 20, (p.lmx || 800) + 330, H + 60] }] } });
    d.scatter.push({ obj: { 'tree.plane': 2, 'tree.bank-oak': 1, 'tree.bank-distant': 1, 'tree.bank-birch': 1 }, layer: 'far', seed: 53, area: { rect: [-150, H + 30, 1750, H + 50] }, n: 10, minGap: 140, s: [0.28, 0.42], flip: 0.5, variant: 'random', anim: false, mask: { avoid: [{ rect: [(p.lmx || 800) - 300, H - 20, (p.lmx || 800) + 300, H + 60] }] } });
    if (kind === 'station') {
      // the tracks in front of the station: ballast, four rails; the far platform; trains both ways
      const ty = fy + 30;
      d.ground.push({ layer: 'mid', d: `M-160 ${fy}H1760V${ty + 110}H-160Z`, fill: { lin: [[0, '@gravel.1'], [1, '@gravel.0']], y1: fy, y2: ty + 110 } });
      for (const y of [ty, ty + 22, ty + 64, ty + 88]) d.ground.push({ layer: 'mid', d: `M-160 ${y}H1760V${y + 3}H-160Z`, fill: '#5a5450' }, { layer: 'mid', d: `M-160 ${y + 9}H1760V${y + 12}H-160Z`, fill: '#5a5450' });
      d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 54, area: { rect: [-150, fy + 2, 1750, ty + 106] }, n: 160, minGap: 14, s: [0.24, 0.5], flip: 0.5, variant: 'random', tint: { col: '#6a6460', k: [0, 0.1] }, anim: false });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[-900, ty + 20], [2500, ty + 20]], speed: 90, loop: 'loop', s: 1.0, seed: 55, offset: 0.2, variant: 3 });
      d.ground.push({ layer: 'near', d: `M-160 ${ty + 56}H1760V${ty + 112}H-160Z`, fill: { lin: [[0, '@gravel.1'], [1, '@gravel.0']], y1: ty + 56, y2: ty + 112 } });
      for (const y of [ty + 64, ty + 88]) d.ground.push({ layer: 'near', d: `M-160 ${y}H1760V${y + 3}H-160Z`, fill: '#5a5450' }, { layer: 'near', d: `M-160 ${y + 9}H1760V${y + 12}H-160Z`, fill: '#5a5450' });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'near', path: [[2500, ty + 100], [-900, ty + 100]], speed: 60, loop: 'loop', s: 1.1, seed: 56, offset: 0.7, variant: 5, flip: true });
      // the near platform (fore), its edge and people waiting
      const py = ty + 130;
      d.ground.push({ layer: 'fore', d: `M-160 905V${py}H1760V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: py, y2: 905 } }, { layer: 'fore', d: `M-160 ${py}H1760V${py + 10}H-160Z`, fill: '#e6d36a' });
      d.scatter.push({ obj: { 'plant.planter': 3, 'plant.grass': 2, 'plant.shrub': 1, 'street.bollard': 1, 'street.bench': 1 }, layer: 'fore', seed: 57, area: { rect: [-150, py + 40, 1750, 905] }, n: 150, minGap: 22, s: [0.6, 1.0], sByY: [[py + 40, 0.8], [900, 1.2]], flip: 0.5, variant: 'random', anim: false, mask: { noise: { scale: 160, cut: 0.35 } } });
      for (let i = 0; i < 4; i++) { const y = py + 50 + (i % 2) * 40, id = i % 2 ? 'person.dog-walker' : 'person.walker'; d.place.push({ obj: id, x: 150 + i * 360, y, s: ppl(d, id, y), variant: i, layer: 'fore', seed: 58 + i, anim: false }); }
      d.actors.push({ obj: 'person.walker', layer: 'fore', path: [[-80, py + 120], [1680, py + 130]], speed: 16, loop: 'loop', s: ppl(d, 'person.walker', py + 120), seed: 62, offset: 0.3, variant: 5 });
      d.actors.push({ obj: 'person.cyclist', layer: 'fore', path: [[1700, py + 160], [-100, py + 160]], speed: 26, loop: 'loop', s: ppl(d, 'person.cyclist', py + 160), seed: 66, offset: 0.6, flip: true });
      d.place.push({ obj: 'bird.pigeon', x: 980, y: py + 90, s: 0.9, layer: 'fore', seed: 67 }, { obj: 'bird.pigeon', x: 1040, y: py + 96, s: 0.85, flip: true, variant: 1, layer: 'fore', seed: 68 });
      d.place.push({ obj: 'street.lamppost', x: 420, y: py + 30, s: 0.9, layer: 'fore', seed: 63 }, { obj: 'street.lamppost', x: 1180, y: py + 30, s: 0.9, layer: 'fore', seed: 64 }, { obj: 'street.station-clock', x: 800, y: py + 24, s: 0.8, layer: 'fore', seed: 65 });
    } else {
      // a street: pavements, the road with cars and a bus, lamps, planters and verges
      const ry = fy + 70;
      d.ground.push({ layer: 'mid', d: band(fy - 4, 3, 40, ry), fill: kind === 'church' ? '@lawn.0' : '@pave.0' });
      if (kind === 'church') {
        d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'mid', seed: 66, area: { rect: [-150, fy - 2, 1750, ry] }, n: 200, minGap: 12, s: [0.4, 0.6], flip: 0.5, variant: 'random', anim: false, mask: { avoid: [{ rect: [(p.lmx || 800) - 300, fy - 10, (p.lmx || 800) + 300, fy + 4] }] } });
        d.place.push({ obj: 'tree.pond-pine', x: (p.lmx || 800) + 420, y: fy + 20, s: 0.75, layer: 'mid', seed: 67, anim: false }, { obj: 'tree.bank-oak', x: (p.lmx || 800) - 480, y: fy + 30, s: 0.7, layer: 'mid', seed: 68, anim: false });
      }
      d.ground.push({ layer: 'near', d: `M-160 ${ry}H1760V${ry + 90}H-160Z`, fill: { lin: [[0, '@road.0'], [1, '@road.1']], y1: ry, y2: ry + 90 } });
      d.ground.push({ layer: 'near', d: `M-160 ${ry + 43}H1760V${ry + 46}H-160Z`, fill: '#d8d4c8' }, { layer: 'near', d: `M-160 ${ry - 8}H1760V${ry}H-160Z`, fill: '#8a867e' });
      d.ground.push({ layer: 'fore', d: `M-160 905V${ry + 90}H1760V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: ry + 90, y2: 905 } });
      d.actors.push({ obj: 'vehicle.car', layer: 'near', path: [[-260, ry + 30], [1860, ry + 30]], speed: 50, loop: 'loop', s: 1.1, seed: 69, offset: 0.1 });
      d.actors.push({ obj: 'vehicle.car', layer: 'near', path: [[1860, ry + 72], [-260, ry + 72]], speed: 44, loop: 'loop', s: 1.2, seed: 70, offset: 0.6, flip: true, variant: 2 });
      d.actors.push({ obj: 'vehicle.bus', layer: 'near', path: [[-300, ry + 34], [1900, ry + 34]], speed: 36, loop: 'loop', s: 1.2, seed: 71, offset: 0.45 });
      d.actors.push({ obj: 'person.cyclist', layer: 'near', path: [[1800, ry + 82], [-200, ry + 82]], speed: 26, loop: 'loop', s: ppl(d, 'person.cyclist', ry + 82), seed: 72, offset: 0.25, flip: true });
      if (kind === 'street') d.scatter.push({ obj: { 'building.shopfront': 1 }, layer: 'mid', seed: 73, area: { rect: [-150, fy - 4, 1750, fy] }, n: 9, minGap: 150, s: [0.36, 0.54], flip: 0.5, variant: 'random', mask: { avoid: [{ rect: [(p.lmx || 800) - 320, fy - 10, (p.lmx || 800) + 320, fy + 4] }] } });
      for (let i = 0; i < 6; i++) d.place.push({ obj: i % 2 ? 'tree.plane' : 'street.lamppost', x: -60 + i * 340, y: ry + 140, s: i % 2 ? 0.75 : 1.0, flip: i % 3 === 0, variant: i % 3, layer: 'fore', seed: 74 + i, anim: false });
      const wy = ry + 120;
      d.actors.push({ obj: 'person.walker', layer: 'fore', path: [[-80, wy + 30], [1680, wy + 30]], speed: 10, loop: 'loop', s: ppl(d, 'person.walker', wy + 30), seed: 80, offset: 0.2 });
      d.actors.push({ obj: 'person.dog-walker', layer: 'fore', path: [[1680, wy + 50], [-80, wy + 50]], speed: 9, loop: 'loop', s: ppl(d, 'person.dog-walker', wy + 50), seed: 81, offset: 0.65, flip: true });
      d.actors.push({ obj: 'person.walker', layer: 'mid', path: [[-80, fy + 30], [1680, fy + 34]], speed: 6, loop: 'loop', s: ppl(d, 'person.walker', fy + 30), seed: 82, offset: 0.4, variant: 6 });
      d.scatter.push({ obj: { 'plant.grass': 3, 'plant.planter': 1, 'street.bollard': 1, 'street.bench': 0.8 }, layer: 'fore', seed: 83, area: { rect: [-150, ry + 100, 1750, 905] }, n: 160, minGap: 22, s: [0.6, 1.05], sByY: [[ry + 100, 0.8], [900, 1.2]], flip: 0.5, variant: 'random', anim: false });
      d.place.push({ obj: 'bird.pigeon', x: 540, y: wy + 60, s: 0.9, layer: 'fore', seed: 84 }, { obj: 'bird.pigeon', x: 590, y: wy + 66, s: 0.85, flip: true, variant: 1, layer: 'fore', seed: 85 });
    }
    // the frontage verge and its cover (the grass round the signature)
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.hedge': 0.6, 'plant.shrub': 0.4 }, layer: 'far', seed: 86, area: { rect: [-150, H + 40, 1750, fy] }, n: 200, minGap: 12, s: [0.22, 0.6], sByY: [[H + 40, 0.8], [fy, 1.2]], flip: 0.5, variant: 'random', anim: false, mask: { avoid: [{ rect: [(p.lmx || 800) - 300, H, (p.lmx || 800) + 300, fy + 4] }] } });
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : fy, p.lmlayer || 'mid');
    flocks(d, H, 87, 'land');
    return finish(d);
  }

  return { water, green, town, common };
})();
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  const c = _fleetArch.common;
  const extra = { form: ['lake', 'channel', 'band', 'meadow', 'wood', 'wetland', 'lawn', 'street', 'church', 'station'], side: ['right', 'left'] };
  const num = ['nearbank', 'vx', 'wy0', 'wy1', 'lmy', 'walky', 'walkx0', 'walkx1', 'trainx', 'boatx', 'pathx', 'brooky', 'bwx', 'benchx', 'logx', 'fronty'];
  const params = Object.assign({}, c, extra, Object.fromEntries(num.map(k => [k, 'number'])), { lmlayer: ['mid', 'far', 'near', 'fore', 'horizon'] });
  const meta = () => null;
  sceneArchetypeDefine('fleet-water', { params, kits: ['temperate', 'water', 'birds', 'boats', 'people'], meta, build: (p, u) => _fleetArch.water(p, u) });
  sceneArchetypeDefine('fleet-green', { params, kits: ['temperate', 'animals', 'birds', 'people'], meta, build: (p, u) => _fleetArch.green(p, u) });
  sceneArchetypeDefine('fleet-town', { params, kits: ['temperate', 'urban', 'vehicles', 'people'], meta, build: (p, u) => _fleetArch.town(p, u) });
})();
