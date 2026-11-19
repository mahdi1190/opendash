/* Sights, round 2: the big ones the first round only seated, repainted to the size standard (rule: the mill, lighthouse,
 * folly and windmill stand 5 to 8 times the player; docs/dev/PAINT_KIT.md section 5) in the same brush as the rest
 * (94-garden-paint-terrain-5sights.js): the little lighthouse, the ruined chapel, the windmill a player builds, the
 * watermill (its wheel its own picture, turning once the cog is in), the hilltop folly and Hollin's hut among the yews.
 * Each keeps its footprint, door and collision; each draws its own way in, so no second door is stood in front of it.
 * GardenPaintedMarks.ART rows win over the older drawings of the same things. Nothing runs at load. */
(function () {
  'use strict';
  const M = window.GardenPaintedMarks; if (!M || !M.ART || !M.SIGHT_KIT) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const { ashlar, mossOn, ivy, windowLit, leaf, grass, sz, STONE, MOSSY, OAK, WOOD, IRON } = M.SIGHT_KIT;
  const A = M.ART;
  const turning = () => { try { return typeof gardenGateHas === 'function' && !!gardenGateHas('mill'); } catch (e) { return false; } };
  /** Rubble courses between a bottom line and a top profile: every stone its own size and weather, dark mortar between,
   *  lit on the west and shading to the east. top(x) is the wall's top at x (a ruin breaks it). */
  function rubble(B, r, x0, x1, y0, top, tones, o) {
    o = o || {}; const pts = [[x0, y0]]; for (let x = x0; x <= x1 + .01; x += 3) pts.push([x, top(Math.min(x, x1))]); pts.push([x1, y0]);
    B.f(B.poly(pts), o.mortar || '#55534a');
    const lo = Math.min(...pts.map(p => p[1])), cw = o.course || 5;
    for (let y = y0 - .6, row = 0; y > lo; row++) {
      const big = o.quoin && row % 6 === 5, ch = big ? cw * 1.5 : cw * (.85 + r() * .5);
      for (let x = x0 - r() * 6; x < x1;) {
        const sw = (big ? 2.2 : 1.2) * cw + r() * cw * (big ? 1.4 : 1.8), cx = x + sw / 2, cy = y - ch / 2; x += sw + .8;
        if (cx < x0 + 1 || cx > x1 - 1 || cy - ch * .5 < top(cx) + .6) continue;
        const k = (cx - x0) / (x1 - x0), lit = Math.max(0, .7 - k), shade = Math.max(0, k - .55);
        const tone = tones[Math.floor(r() * tones.length)], w = Math.min(sw, (x1 - x0)) * .5;
        B.f(B.blob(r, cx, cy, w, ch * .47, 7, .14), tone).f(B.blob(r, cx - w * .2, cy - ch * .2, w * .62, ch * .2, 6, .3), '#f2ecd8', .12 + lit * .38).f(B.blob(r, cx + w * .2, cy + ch * .22, w * .8, ch * .16, 6, .3), '#2e2c24', .14 + shade * .5);
        if (o.moss && r() < o.moss) B.f(B.blob(r, cx - w * .3, cy + ch * .2, w * .5, ch * .18, 6, .5), '#6f8446', .55);
      }
      y -= ch + .8;
    }
    if (o.edge !== false) { B.f(B.poly(pts.slice(0, Math.ceil(pts.length * .22)).concat([[x0 + (x1 - x0) * .2, y0]])), '#ffffff', .05); }
  }
  // a pointed arch (a lancet or a doorway), from its sill at y up to its point
  const lancet = (x, y, w, h) => `M${x - w / 2} ${y}V${y - h + w * .62}Q${x - w / 2} ${y - h + w * .1} ${x} ${y - h}Q${x + w / 2} ${y - h + w * .1} ${x + w / 2} ${y - h + w * .62}V${y}Z`;
  const arch = (x, y, w, h) => `M${x - w / 2} ${y}V${y - h + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y - h + w / 2}V${y}Z`;
  function ferns(B, r, x, y, w, n, s) { if (s === 'winter') return; const L = leaf(s); for (let i = 0; i < n; i++) { const px = x + (r() - .5) * w, d = r() < .5 ? -1 : 1, l = 8 + r() * 8; B.s(`M${px} ${y}q${d * l * .3} ${-l * .7} ${d * l} ${-l * .9}`, i % 2 ? L[1] : L[0], 1.3, .95); for (let k = 1; k < 4; k++) B.s(`M${px + d * l * k * .24} ${y - l * k * .22}l${d * 2.6} ${-2.4}`, L[2], .8, .85); } }

  /* ---------- the little lighthouse: a whitewashed round tower on its rock, two red bands, a gallery and a glazed lantern
     under a verdigris cap; its door at the foot is the way up to the lamp room ---------- */
  A['ld-lighthouse'] = { box: [-46, -274, 48, 10], door: { dx: 0, dy: -1 }, seat: { kind: 'moss', w: 46, front: 14, back: 8, stones: 0 }, lit: true, lights: [[0, -224, 150]], draw(B, o) {
    const r = KIT().rng(301), s = o.season, gal = -sz('tower', 0), R0 = 21, R1 = 14.5, wAt = y => R0 + (R1 - R0) * Math.min(1, Math.max(0, (y + 14) / (gal + 14)));
    // the granite foot: big rough blocks flaring out onto the rock, weed-dark at the bottom
    for (let i = 0; i < 7; i++) { const x = -24 + i * 8 + (r() - .5) * 2; B.stone(r, x, -4 + (i % 2), 6 + r() * 2, 5.4, { rock: '#9a948a', rockLo: '#6e6a62', rockHi: '#c6c0b4', rockDk: '#3a3832' }, null); }
    B.f(`M${-R0 - 3} -6L${-R0} -16H${R0}L${R0 + 3} -6Q0 -2 ${-R0 - 3} -6Z`, '#8a847a').f(`M${-R0 - 3} -6L${-R0} -16H-8L-10 -5Z`, '#b4aea2', .8);
    // the tower: whitewash over stone, round, lit to the west, faint courses showing through, salt streaks down the east
    const tower = `M${-R0} -14L${-R1} ${gal}L${R1} ${gal}L${R0} -14Q0 -10 ${-R0} -14Z`;
    B.f(tower, B.lin(-R0, 0, R0, 0, [[0, '#fffaf0'], [.28, '#f2ecdc'], [.66, '#d6cfbf'], [1, '#9e9890']]));
    for (let y = -20; y > gal + 3; y -= 6.6) { const w = wAt(y); B.s(`M${-w + 1} ${y}Q0 ${y + 3} ${w - 1} ${y}`, '#a8a090', .55, .32); }
    for (let i = 0; i < 6; i++) { const x = 6 + r() * 12, y0 = gal * (.15 + r() * .7); B.s(`M${x} ${y0}l${(r() - .5)} ${14 + r() * 26}`, '#8e887c', 1.4, .18); }
    // two red bands, curving round the drum
    for (const [a, b] of [[.3, .43], [.66, .79]]) { const ya = -14 + (gal + 14) * a, yb = -14 + (gal + 14) * b, wa = wAt(ya), wb = wAt(yb);
      B.f(`M${-wa} ${ya}L${-wb} ${yb}Q0 ${yb + 3.4} ${wb} ${yb}L${wa} ${ya}Q0 ${ya + 3.6} ${-wa} ${ya}Z`, B.lin(-wa, 0, wa, 0, [[0, '#e0644a'], [.35, '#c8402e'], [.75, '#9e2e22'], [1, '#6e1e18']])); }
    // three small windows up the stair, staggered, deep in the wall; lit at night
    for (const [x, t] of [[-5, .2], [4, .52], [-3, .88]]) { const y = -14 + (gal + 14) * t; B.f(arch(x, y + 6, 7, 13), '#6e6a60').f(arch(x, y + 5, 5, 11), o.night ? '#ffd88a' : '#2e3a3e'); if (!o.night) B.f(B.rect(x - 1.6, y - 4, 1.4, 4), '#9ab4b8', .5); }
    // the door at the foot: a round-headed opening in a dressed surround, a green door, two stone steps up from the rock
    const dh = sz('door', .5) * .92;
    B.f(arch(0, -10, 19, dh + 4), '#c8c0ae').f(arch(0, -10, 15, dh), '#24302c').f(arch(0, -10, 13, dh - 2), B.lin(-6, 0, 6, 0, [[0, '#3e6a56'], [1, '#284838']]));
    B.s(`M-6.5 ${-10 - dh * .45}h13M-6.5 ${-10 - dh * .2}h13`, '#1e3428', .7, .7).f(B.circ(4, -10 - dh * .35, .9), '#d8b84a');
    B.f(B.rect(-11, -10, 22, 4), '#a8a294').f(B.rect(-11, -10, 22, 1.2), '#d0cabc').f(B.rect(-13, -6, 26, 4.4), '#8e887c').f(B.rect(-13, -6, 26, 1.2), '#bcb6a8');
    // the gallery: a corbelled ring on brackets, an iron railing round it
    const gw = R1 + 8;
    for (let x = -R1 + 2; x <= R1 - 2; x += 5.5) B.f(B.poly([[x - 2, gal + 1], [x + 2, gal + 1], [x + .6, gal + 9], [x - .6, gal + 9]]), x < 0 ? '#c8c2b4' : '#8e887c');
    B.f(`M${-gw} ${gal - 2}Q0 ${gal + 4} ${gw} ${gal - 2}L${gw} ${gal + 2}Q0 ${gal + 8} ${-gw} ${gal + 2}Z`, '#4a4e50').f(`M${-gw} ${gal - 2}Q0 ${gal + 4} ${gw} ${gal - 2}Q0 ${gal - 1} ${-gw} ${gal - 2}Z`, '#8a9092');
    // the lantern: glazing in iron astragals, the lamp inside (lit at night), a verdigris cap, a ball vent, a vane
    const lw = 10.5, l0 = gal - 3, l1 = gal - 29;
    B.f(B.rect(-lw - 1.4, l1, lw * 2 + 2.8, l0 - l1), '#2a2e30');
    B.f(B.rect(-lw, l1 + 1, lw * 2, l0 - l1 - 2), o.night ? B.rad(0, (l0 + l1) / 2, lw * 1.6, [[0, '#fffbe6'], [.45, '#ffe08a'], [1, '#e8a44a']]) : B.lin(-lw, 0, lw, 0, [[0, '#9cc0c8'], [.4, '#4e6e78'], [1, '#2e4048']]));
    if (!o.night) B.f(B.rect(-lw + 1, l1 + 2, 3.4, l0 - l1 - 5), '#e8f4f4', .45).f(B.ell(1, (l0 + l1) / 2 + 2, 3, 5), '#e8c46a', .5);
    for (const x of [-lw * .5, 0, lw * .5]) B.s(`M${x} ${l1 + 1}V${l0 - 1}`, '#1e2224', 1.1);
    B.s(`M${-lw} ${(l0 + l1) / 2}H${lw}`, '#1e2224', .9, .8);
    for (let x = -gw + 1; x <= gw - 1; x += 3.6) B.s(`M${x} ${gal - 2 + Math.cos(x / gw * 1.4) * 2.6}v-9`, '#2a2e30', .8, .9);
    B.s(`M${-gw} ${gal - 11}Q0 ${gal - 6} ${gw} ${gal - 11}`, '#2a2e30', 1.3);
    B.f(`M${-lw - 3} ${l1}Q${-lw - 2} ${l1 - 13} 0 ${l1 - 15}Q${lw + 2} ${l1 - 13} ${lw + 3} ${l1}Z`, B.lin(-lw, 0, lw, 0, [[0, '#7aa898'], [.45, '#4e7e70'], [1, '#2e4e46']]));
    B.f(`M${-lw - 3} ${l1}Q0 ${l1 + 3} ${lw + 3} ${l1}`, '#2a3a36').f(B.circ(0, l1 - 17, 3.2), '#3e5e54').f(B.circ(-1, l1 - 18, 1.2), '#9ac4b4', .8);
    B.s(`M0 ${l1 - 20}V${l1 - 32}`, '#2a2e30', 1).s(`M-5 ${l1 - 29}H6`, '#2a2e30', .9).f(`M6 ${l1 - 29}l-3 -2v4z`, '#2a2e30');
    // thrift and sea campion in the cracks of the foot, a coil of rope and a lobster pot by the steps
    if (s !== 'winter') for (let i = 0; i < 9; i++) { const x = -26 + r() * 52, y = -1 + r() * 4; B.f(B.blob(r, x, y, 3.4, 1.8, 6, .4), '#6f8a4a'); for (let k = 0; k < 3; k++) B.f(B.circ(x + (r() - .5) * 4, y - 2 - r() * 2, 1), s === 'autumn' ? '#c8a8a0' : '#e89ab4', .95); }
    for (let k = 0; k < 3; k++) B.s(B.ell(-20, 2, 5 - k * 1.2, 2.2 - k * .5), k % 2 ? '#c8a874' : '#a88a54', 1.3);
    B.f(B.rr(14, -6, 12, 9, 4), '#8a6a3e').s('M16 -4h8M16 -1h8M20 -6v9', '#5a4024', .7);
  } };

  /* ---------- the ruined chapel among the old trees: the west gable still standing with its bellcote and its bell, the
     south wall broken down to the east, no roof, an apple tree grown up in the aisle; the south door is the way in ---------- */
  A['ld-chapel'] = { box: [-84, -204, 84, 10], door: { dx: 0, dy: -2 }, seat: { kind: 'moss', w: 140, front: 18, back: 10 }, draw(B, o) {
    const r = KIT().rng(311), s = o.season, L = leaf(s), G = grass(s);
    const tones = ['#a8a48c', '#9a9680', '#8c8874', '#b6b29a', '#807c68', '#a29c80'], far = ['#7e7a66', '#74705e', '#6a6656', '#86826c'];
    const eaves = sz('eaves', 1) * 1.15, apex = sz('hall', .35), bell = apex + 34;
    // the north wall, far side of the nave: its inner face in shade, broken lower than the south, two empty lancets
    const farTop = x => x < -36 ? -eaves - 34 : -eaves - 34 + Math.max(0, x + 36) * .38 + Math.sin(x * .3) * 3;
    rubble(B, r, -36, 66, -26, farTop, far, { mortar: '#4a4840', course: 4.6, edge: false });
    for (const x of [-8, 30]) B.f(lancet(x, -50, 10, 34), '#c8d8b8').f(lancet(x, -50, 10, 34), B.lin(0, -84, 0, -50, [[0, '#d4e4c4'], [1, '#8aa070']]), .9);
    B.f(B.rect(-36, -40, 102, 14), '#2a2a20', .25);
    // the apple tree in the aisle: an old leaning trunk between the walls, its crown over the broken south wall
    B.s('M22 -16Q18 -50 30 -86', '#5a4632', 7).s('M21 -16Q17 -50 28 -84', '#7a6046', 2, .7).s('M28 -80Q12 -96 -4 -104M30 -86Q44 -100 54 -110', '#5a4632', 3.4);
    if (s !== 'winter') { const lobes = []; for (let i = 0; i < 11; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); lobes.push([26 + Math.cos(a) * 34 * d, -110 + Math.sin(a) * 20 * d, 16 + r() * 8, 12 + r() * 5]); }
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x + 3, y + 4, rx, ry, 9, .35), L[0]);
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x, y, rx * .84, ry * .8, 9, .35), L[1]);
      for (const [x, y, rx, ry] of lobes) if (x < 30 || y < -116) B.f(B.blob(r, x - rx * .3, y - ry * .3, rx * .44, ry * .4, 8, .4), L[2], .9);
      for (let i = 0; i < 6; i++) B.f(B.blob(r, 6 + r() * 36, -132 + r() * 16, 5, 3.6, 6, .5), L[3], .85);
      if (s === 'spring') for (let i = 0; i < 22; i++) B.f(B.circ(-2 + r() * 58, -128 + r() * 34, 1.5), '#fbeef2', .95);
      else for (let i = 0; i < 9; i++) B.f(B.circ(4 + r() * 46, -122 + r() * 26, 2), s === 'autumn' ? '#d8a030' : '#c8442e', .95); }
    else for (let i = 0; i < 12; i++) { const a = -Math.PI * (.12 + r() * .76), l = 18 + r() * 26; B.s(`M28 -84l${Math.cos(a) * l} ${Math.sin(a) * l * .8}`, '#6a5444', 1.4, .85); }
    // the west gable, lit, rising to its apex and the bellcote; its bell still hangs, green with age
    const gable = x => x < -76 ? -eaves : x > -32 ? -eaves : -eaves - (apex - eaves) * (1 - Math.abs(x + 54) / 22);
    rubble(B, r, -76, -32, -6, gable, tones, { course: 5, quoin: true, moss: .08 });
    B.f(B.poly([[-76, -6], [-76, -eaves], [-54, -apex], [-60, -apex + 4], [-72, -eaves + 2], [-72, -6]]), '#ffffff', .08);
    B.f(B.poly([[-62, -apex + 6], [-62, -bell + 8], [-54, -bell], [-46, -bell + 8], [-46, -apex + 6]]), '#9e9a84').f(B.poly([[-62, -apex + 6], [-62, -bell + 8], [-54, -bell], [-55, -apex + 6]]), '#c2bea6', .9);
    B.f(arch(-54, -apex - 4, 9, 18), '#1c1e18').s(`M-54 ${-apex - 20}v4`, '#2a2a22', 1.1);
    B.f(`M-57.4 ${-apex - 6}Q-57 ${-apex - 15} -54 ${-apex - 15.6}Q-51 ${-apex - 15} -50.6 ${-apex - 6}Z`, '#5e7e62').f(`M-57.4 ${-apex - 6}Q-57 ${-apex - 15} -54 ${-apex - 15.6}L-54.6 ${-apex - 6}Z`, '#8eae8a', .8).f(B.circ(-54, -apex - 5, 1.1), '#3e4e3e');
    B.f(B.poly([[-64, -bell + 9], [-54, -bell - 2], [-44, -bell + 9], [-46, -bell + 9], [-54, -bell + 1], [-62, -bell + 9]]), '#d8d2ba', .8);
    // its tall west window, the tracery gone, showing the green light of the nave behind
    B.f(lancet(-54, -40, 16, 52), '#5e5a4a').f(lancet(-54, -41, 12, 48), B.lin(0, -90, 0, -41, [[0, '#cfe0bc'], [1, '#6e8a5a']])).s('M-54 -88V-41', '#8a866e', 1.4, .8);
    ivy(B, r, -74, -4, -eaves - 30, s); ivy(B, r, -70, -4, -eaves + 10, s); ivy(B, r, -36, -4, -eaves * .6, s);
    // the south wall: tall at the west, broken down to the east in a ragged line; the doorway, two lancets
    const south = x => { const t = (x + 32) / 98; return -eaves + Math.max(0, t - .1) * eaves * .74 + Math.sin(x * .41) * 3.4 + Math.sin(x * 1.3) * 1.6; };
    rubble(B, r, -32, 66, -6, south, tones, { course: 4.8, moss: .1 });
    B.f(B.poly([[-32, -6], [-32, -eaves], [-28, -eaves], [-28, -6]]), '#2a2a22', .3);   // (the inner corner where it meets the gable, in shade)
    const dh = sz('door', .5) * 1.05;
    B.f(lancet(0, -6, 26, dh + 6), '#c4bea6').f(lancet(0, -6, 20, dh), B.lin(0, -6 - dh, 0, -6, [[0, '#a8c094'], [.6, '#7e9a62'], [1, '#5e7444']]));
    B.f(B.poly([[-10, -6], [-6, -18], [4, -20], [10, -6]]), '#6e8a4a', .9).f(B.blob(r, 4, -9, 4, 2.4, 6, .4), '#a8a48c');
    B.f(B.poly([[6, -6], [10, -6 - dh * .92], [11, -6 - dh * .86], [9.4, -6]]), '#5a4630');   // (the door, fallen back on its last hinge)
    B.f(B.rect(-15, -6, 30, 3.4), '#b8b29a').f(B.rect(-15, -6, 30, 1), '#d8d2ba');
    for (const [x, y, h] of [[-20, -26, 30], [40, -24, 24]]) { const top = south(x); if (y - h < top + 4) continue; B.f(lancet(x, y, 10, h), '#5e5a4a').f(lancet(x, y - 1, 7, h - 2), '#7e9a62'); }
    // the east end's stub, with the springing of its great window
    B.f(B.poly([[62, -6], [62, -64], [66, -70], [70, -60], [70, -6]]), '#8c8874').f(B.poly([[62, -6], [62, -64], [65, -68], [65, -6]]), '#a8a48c').s('M62 -58Q56 -66 52 -60', '#9a9680', 3);
    // moss and grass along the broken tops, a few fallen stones and ferns at the foot
    for (let x = -30; x < 64; x += 5 + r() * 4) B.f(B.blob(r, x, south(x) + .6, 3 + r() * 2.4, 1.4, 6, .5), s === 'winter' ? '#e8eeea' : r() < .5 ? '#7d8f4e' : '#93a660', .85);
    mossOn(B, r, -76, -eaves + 2, 18, 4, s);
    for (const [x, y, w] of [[44, 4, 7], [56, 2, 5], [-80, 3, 5], [30, 6, 4]]) B.stone(r, x, y, w, w * .6, MOSSY, s === 'winter' ? null : '#8a9a52');
    ferns(B, r, -60, 2, 26, 7, s); ferns(B, r, 52, 2, 24, 6, s); B.tufts(r, -24, 3, 14, 6, G, 7).tufts(r, 28, 3, 20, 8, G, 7);
  } };

  /* ---------- the windmill a player puts up: a tower of warm brick, a reefing stage half way up, a white boat cap with its
     fantail, and four sails (their own picture, turning in the wind); its door at the foot leads up to the cap floor ---------- */
  const SAIL_R = 104;
  A['lf-windmill'] = { box: [-56, -250, 58, 10], door: { dx: 0, dy: -1 }, seat: { kind: 'earth', w: 84, front: 18 }, lit: true, lights: [[-8, -58, 80]],
    parts: [{ id: 'sails', box: [-SAIL_R - 6, -SAIL_R - 6, SAIL_R + 6, SAIL_R + 6], at: [0, -sz('tower', 0) + 4], phase: .32, spin: (o, env) => .22 + Math.min(.5, Math.abs(env.windX || 0) * .06), draw(B) {
      // four sails on two stocks: a whip each, a lattice of bars on the trailing side, the canvas half spread
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), px = -sn, py = c, at = (d, side) => [c * d + px * side, sn * d + py * side];
        B.s(B.line([at(6, 0), at(SAIL_R, 0)]), '#5a4632', 3.4).s(B.line([at(6, -1), at(SAIL_R, -1)]), '#8a6e4e', 1, .8);
        const w0 = 3, w1 = 22; B.s(B.line([at(18, w0), at(SAIL_R - 2, w0)]), '#e8e0cc', 1.4).s(B.line([at(18, w1), at(SAIL_R - 2, w1)]), '#e8e0cc', 1.6);
        B.f(B.poly([at(22, w0 + 1), at(SAIL_R - 4, w0 + 1), at(SAIL_R - 4, w1 - 1), at(56, w1 - 1)]), '#f2ead6', .92).f(B.poly([at(22, w0 + 1), at(SAIL_R - 4, w0 + 1), at(SAIL_R - 4, w0 + 6), at(30, w0 + 6)]), '#ffffff', .4);
        for (let d = 18; d <= SAIL_R - 2; d += 8.6) B.s(B.line([at(d, w0), at(d, w1)]), '#d4cab2', 1.1, .95);
        B.s(B.line([at(SAIL_R - 2, w0), at(SAIL_R - 2, w1)]), '#5a4632', 1.2, .9); }
      B.f(B.circ(0, 0, 9), '#4a3a2a').f(B.circ(0, 0, 6.4), '#6e5a44').f(B.circ(-1.4, -1.4, 2.6), '#c8b490').f(B.circ(0, 0, 1.4), '#2a2018');
    } }],
    draw(B, o) {
      const r = KIT().rng(321), s = o.season, top = -sz('tower', 0) + 18, R0 = 38, R1 = 25, wAt = y => R0 + (R1 - R0) * Math.min(1, Math.max(0, y / top)), BR = ['#a65a3e', '#8e4a33', '#c07656', '#6e3a28'];
      // the stone plinth ring, then the tower: brick courses round a tapering drum, lit to the west
      B.f(`M${-R0 - 4} 0L${-R0 - 3} -9H${R0 + 3}L${R0 + 4} 0Q0 5 ${-R0 - 4} 0Z`, '#9a927c').f(`M${-R0 - 4} 0L${-R0 - 3} -9H-14L-16 2Z`, '#c4bca4', .7);
      B.f(`M${-R0} -8L${-R1} ${top}L${R1} ${top}L${R0} -8Q0 -4 ${-R0} -8Z`, B.lin(-R0, 0, R0, 0, [[0, BR[2]], [.3, BR[0]], [.72, BR[1]], [1, BR[3]]]));
      for (let y = -12, row = 0; y > top + 2; y -= 4.2, row++) { const w = wAt(y); B.s(`M${-w + .5} ${y}Q0 ${y + 3} ${w - .5} ${y}`, BR[3], .5, .45); for (let x = -w + 2 + (row & 1) * 3.6; x < w - 2; x += 7.2) { B.s(`M${x} ${y + 2 * (1 - (x / w) ** 2)}v-4`, BR[3], .4, .35); if (r() < .1) B.f(B.rect(x + .5, y - 3.6 + 2 * (1 - (x / w) ** 2), 6, 3.2), r() < .5 ? BR[2] : BR[1], .5); } }
      B.f(`M${-R0} -8L${-R1} ${top}L${-R1 + 9} ${top}L${-R0 + 12} -8Z`, '#ffffff', .07);
      // windows up the tower, white-framed, lit at night; the door at the foot under a brick arch, a worn step
      for (const [x, t] of [[-12, .62], [10, .36], [-4, .86]]) { const y = top * t; B.f(arch(x, y + 7, 11, 16), '#efe8d6').f(arch(x, y + 6, 8, 13), o.night ? '#ffd88a' : '#2e3a3c').s(`M${x} ${y - 6}v12M${x - 4} ${y + 1}h8`, '#efe8d6', .9); }
      const dh = sz('door', .5);
      B.f(arch(0, -6, 24, dh + 5), BR[3]).f(arch(0, -6, 19, dh), '#2a2418').f(arch(0, -6, 17, dh - 2), B.lin(-8, 0, 8, 0, [[0, '#4e7a5a'], [1, '#2e5038']]));
      B.s(`M0 ${-6 - dh + 10}V-7M-8 ${-6 - dh * .5}h16`, '#24402c', .8, .7).f(B.circ(5, -6 - dh * .42, 1), '#d8b84a');
      B.f(B.rect(-14, -6, 28, 5), '#b0a890').f(B.rect(-14, -6, 28, 1.4), '#d8d0b8');
      // the reefing stage: a ring of planks on brackets, a rail round it
      const st = top * .42, sw = wAt(st) + 13;
      for (let x = -sw + 6; x <= sw - 6; x += 9) B.s(`M${x} ${st + 2}L${x * .8} ${st + 14}`, '#5a4632', 2);
      B.f(`M${-sw} ${st - 2}Q0 ${st + 5} ${sw} ${st - 2}L${sw} ${st + 3}Q0 ${st + 10} ${-sw} ${st + 3}Z`, '#7a5e40').f(`M${-sw} ${st - 2}Q0 ${st + 5} ${sw} ${st - 2}Q0 ${st} ${-sw} ${st - 2}Z`, '#b08c5e');
      for (let x = -sw + 2; x <= sw - 2; x += 7) B.s(`M${x} ${st - 1 + 3.4 * (1 - (x / sw) ** 2)}v-11`, '#5a4632', 1.3);
      B.s(`M${-sw} ${st - 12}Q0 ${st - 6} ${sw} ${st - 12}`, '#6e5438', 1.8).s(`M${-sw} ${st - 13}Q0 ${st - 7} ${sw} ${st - 13}`, '#b08c5e', .7, .8);
      // the cap: a white boat-shaped cap, its curb, the fantail on its frame behind, the windshaft's nose to the front
      const c0 = top - 2;
      B.f(B.rect(-R1 - 4, c0 - 2, R1 * 2 + 8, 6), '#6e5a44').f(B.rect(-R1 - 4, c0 - 2, R1 * 2 + 8, 1.6), '#a88a64');
      B.s(`M${R1 - 4} ${c0 - 10}L${R1 + 18} ${c0 - 26}M${R1 + 2} ${c0 - 4}L${R1 + 18} ${c0 - 26}`, '#e8e0cc', 1.6);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .3; B.s(`M${R1 + 18} ${c0 - 26}l${Math.cos(a) * 9} ${Math.sin(a) * 9}`, '#efe8d6', 2.4); }
      B.f(B.circ(R1 + 18, c0 - 26, 2), '#5a4632');
      B.f(`M${-R1 - 6} ${c0 - 1}Q${-R1 - 8} ${c0 - 22} ${-10} ${c0 - 34}Q0 ${c0 - 38} ${10} ${c0 - 34}Q${R1 + 8} ${c0 - 22} ${R1 + 6} ${c0 - 1}Z`, B.lin(-R1, 0, R1, 0, [[0, '#ffffff'], [.4, '#efe9dc'], [1, '#b8b2a4']]));
      B.s(`M${-R1 - 6} ${c0 - 1}Q${-R1 - 8} ${c0 - 22} ${-10} ${c0 - 34}`, '#ffffff', 1.4, .9);
      for (let k = 1; k < 4; k++) B.s(`M${-R1 - 6 + k * 4} ${c0 - 2}Q${-R1 - 4 + k * 4} ${c0 - 20 - k * 2} ${-8 + k * 2} ${c0 - 32 + k}`, '#c8c2b4', .6, .6);
      B.f(B.circ(0, c0 - 38, 2.4), '#5a4632').f(B.ell(0, c0 - 14, 6, 6), '#6e5a44');
      // sacks by the door, a barrow, nettles and long grass round the plinth
      for (const [x, y] of [[24, 0], [31, -1], [27, -8]]) B.f(B.rr(x - 5, y - 9, 10, 10, 4), '#d9caa0').f(B.rr(x - 5, y - 9, 4, 10, 3), '#efe4c6', .7);
      B.f(B.poly([[-38, -2], [-22, -2], [-24, -10], [-36, -10]]), WOOD[1]).s('M-38 -6h-8', WOOD[0], 2).f(B.circ(-24, -1, 3), '#4a3a2a');
      B.tufts(r, -44, 3, 12, 7, grass(s), 8).tufts(r, 44, 3, 12, 7, grass(s), 8);
    } };

  /* ---------- the watermill: three storeys of old brick on a stone plinth, a slate roof with the lucam over the stacked sack
     doors, the undershot wheel in its stone pit against the west gable (its own picture: still, two paddles gone, until the
     cog is fitted; then it turns and the windows light at night) ---------- */
  const brick = (B, r, x, y, w, h, pal) => {
    B.f(B.rect(x, y, w, h), pal[0]);
    for (let row = 0, yy = y + h - 4; yy > y; yy -= 4, row++) { B.s(`M${x} ${yy}h${w}`, pal[3], .45, .5); for (let xx = x + (row & 1) * 4; xx < x + w; xx += 8) { B.s(`M${xx} ${yy}v-4`, pal[3], .4, .4); if (r() < .14) B.f(B.rect(xx + .5, yy - 3.6, 7, 3.2), r() < .5 ? pal[2] : pal[1], .55); } }
    B.f(B.rect(x, y, w * .12, h), pal[2], .22).f(B.rect(x + w * .86, y, w * .14, h), pal[3], .26);
  };
  const MILL_WHEEL = { x: -90, y: -40, R: 40 };
  A['ld-mill'] = { box: [-134, -224, 92, 18], door: { dx: 0, dy: 0 }, seat: { kind: 'earth', w: 132, front: 20, stones: 0 }, lit: true, lights: [[-38, -40, 80], [32, -80, 80], [-38, -122, 70]],
    state: () => turning() ? 'turn' : 'still',
    parts: [
      { id: 'wheel', box: [-MILL_WHEEL.R - 10, -MILL_WHEEL.R - 10, MILL_WHEEL.R + 10, MILL_WHEEL.R + 10], at: [MILL_WHEEL.x, MILL_WHEEL.y], spin: o => o.state === 'turn' ? -.55 : 0, draw(B, o) {
        const R = MILL_WHEEL.R, n = 18, gap = o.state !== 'turn';
        B.s(B.circ(0, 0, R), OAK[1], 4.6).s(B.circ(0, 0, R - 7), OAK[0], 2.4).s(B.circ(0, 0, R + .8), OAK[3], .8, .7);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .2; B.s(`M0 0L${(Math.cos(a) * (R - 3)).toFixed(1)} ${(Math.sin(a) * (R - 3)).toFixed(1)}`, OAK[1], 2.8).s(`M0 0L${(Math.cos(a) * (R - 3)).toFixed(1)} ${(Math.sin(a) * (R - 3)).toFixed(1)}`, OAK[2], .8, .6); }
        for (let i = 0; i < n; i++) { if (gap && (i === 5 || i === 6)) continue; const a = i * Math.PI * 2 / n, c = Math.cos(a), sn = Math.sin(a), x0 = c * (R - 1), y0 = sn * (R - 1), x1 = c * (R + 8), y1 = sn * (R + 8), tx = -sn * 3.4, ty = c * 3.4;
          B.f(B.poly([[x0 - tx, y0 - ty], [x1 - tx, y1 - ty], [x1 + tx, y1 + ty], [x0 + tx, y0 + ty]]), i % 2 ? WOOD[0] : WOOD[2]).s(`M${x0 - tx} ${y0 - ty}L${x1 - tx} ${y1 - ty}`, OAK[3], .6, .6); }
        B.f(B.circ(0, 0, 7), IRON[1]).f(B.circ(0, 0, 3.4), '#7a7468').f(B.circ(-1, -1, 1.4), '#c8c0aa');
        for (let i = 0; i < 5; i++) B.f(B.blob(KIT().rng(331 + i), Math.cos(i * 1.3) * (R - 4), Math.sin(i * 1.3) * (R - 4), 3, 1.6, 6, .5), '#5e7a46', .6);
      } },
      { id: 'lap', box: [-44, -8, 44, 14], at: [MILL_WHEEL.x, 0], draw(B) {
        // the water in the pit laps over the wheel's foot, the near pit wall in front of it
        B.f(B.rr(-38, -3, 76, 10, 3), '#3e6064', .94).f(B.rect(-38, -3, 76, 2), '#a8cace', .75);
        for (let x = -40; x < 38; x += 7) B.f(B.rr(x, 6, 6.6, 4, 1), x % 2 ? STONE.rock : STONE.rockLo).f(B.rect(x + .5, 6, 5.6, 1), STONE.rockHi, .7);
      } },
    ],
    draw(B, o) {
      const r = KIT().rng(341), s = o.season, lit = o.night && o.state === 'turn', SLATE = ['#5d666c', '#4a5258', '#7d878c', '#363e44'], BR = ['#a65a3e', '#8e4a33', '#c07656', '#6e3a28'];
      const f1 = -54, f2 = -100, eaves = -146, ridge = -sz('tower', 0) + 8, x0 = -58, x1 = 74;
      // the wheel pit: dark water between stone walls, open to the river on the west, the wet stain on the gable
      B.f(B.poly([[-134, -16], [x0, -18], [x0, 10], [-130, 10]]), '#2e4a4e').f(B.poly([[-134, -16], [x0, -18], [x0, -12], [-133, -10]]), '#1e3236', .85);
      for (let x = -132; x < x0 - 2; x += 7) B.f(B.rr(x, -21, 6.6, 4.4, 1), r() < .5 ? STONE.rock : STONE.rockLo).f(B.rect(x + .5, -21, 5.6, 1), STONE.rockHi, .7);
      // the plinth and three storeys of brick, stone quoins, string courses between the floors
      ashlar(B, r, x0, -10, x1 - x0, 10, STONE, 5);
      brick(B, r, x0, eaves, x1 - x0, eaves * -1 - 10, BR);
      for (let y = eaves; y < -10; y += 9) for (const x of [x0, x1 - 7]) B.f(B.rect(x, y, 7, 4.6), (y / 9) & 1 ? STONE.rock : STONE.rockHi).f(B.rect(x, y + 4.6, 7, .6), STONE.rockDk, .6);
      for (const y of [f1, f2]) B.f(B.rect(x0, y - 2, x1 - x0, 3.4), STONE.rockLo).f(B.rect(x0, y - 2, x1 - x0, 1.1), STONE.rockHi);
      B.f(B.rect(x0 - 2, -48, 6, 16), STONE.rockHi).f(B.rect(x0, -40, 5, 30), '#4a3a2a', .35);   // (the axle box, and the wet below it)
      // the roof: old slates in courses, a little mossed, a ridge of tiles; a chimney at the east end
      B.f(B.poly([[x0 - 7, eaves + 2], [x0 + 12, ridge], [x1 - 12, ridge], [x1 + 7, eaves + 2]]), SLATE[0]);
      for (let y = eaves - 2; y > ridge + 1; y -= 4.2) { const k = (eaves + 2 - y) / (eaves + 2 - ridge), a = x0 - 7 + 19 * k, b = x1 + 7 - 19 * k; B.s(`M${a} ${y}H${b}`, SLATE[1], .7, .6); for (let x = a + r() * 5; x < b; x += 5 + r() * 3) B.s(`M${x} ${y}v-4.2`, SLATE[1], .45, .35); }
      B.f(B.poly([[x0 - 7, eaves + 2], [x0 + 12, ridge], [x0 + 22, ridge], [x0 + 4, eaves + 2]]), SLATE[2], .4).s(`M${x0 + 12} ${ridge}H${x1 - 12}`, SLATE[3], 2.6).s(`M${x0 - 7} ${eaves + 2}H${x1 + 7}`, SLATE[3], 1.4, .8);
      for (let i = 0; i < 7; i++) B.f(B.blob(r, x0 + 10 + r() * (x1 - x0 - 20), eaves - 6 - r() * (eaves - ridge - 14), 5 + r() * 5, 1.8, 7, .5), s === 'winter' ? '#eef2ee' : '#7d8f4e', .6);
      B.f(B.rect(x1 - 26, ridge - 18, 12, 22), BR[1]).f(B.rect(x1 - 26, ridge - 18, 3.6, 22), BR[2], .6).f(B.rect(x1 - 28, ridge - 21, 16, 4), STONE.rockLo);
      // the lucam: a weatherboarded hoist housing out over the sack doors, its own small gable, the chain and hook
      const lx = -15, lw = 30;
      B.f(B.rect(lx, eaves - 40, lw, 46), WOOD[1]); for (let y = eaves - 36; y < eaves + 6; y += 4) B.s(`M${lx} ${y}h${lw}`, OAK[1], .6, .75);
      B.f(B.rect(lx, eaves - 40, 6, 46), WOOD[2], .4).f(B.poly([[lx - 4, eaves - 38], [lx + lw / 2, eaves - 56], [lx + lw + 4, eaves - 38]]), SLATE[1]).f(B.poly([[lx - 4, eaves - 38], [lx + lw / 2, eaves - 56], [lx + lw / 2, eaves - 50], [lx + 2, eaves - 38]]), SLATE[2], .5);
      B.f(B.rect(lx + 8, eaves - 30, 14, 20), '#24180f').s(`M${lx + 15} ${eaves - 10}V${f2 + 6}`, IRON[0], 1).s(`M${lx + 13} ${f2 + 6}q2 4 4 0`, IRON[0], 1.2);
      // the stacked doors under it, the big doors at the yard, windows on every floor (lit when the mill works at night)
      for (const [y, h] of [[f2 - 4, 30], [f1 - 4, 32]]) B.f(B.rect(lx + 4, y - h, 22, h), OAK[1]).f(B.rect(lx + 6, y - h + 2, 18, h - 2), OAK[0]).s(`M${lx + 15} ${y - h + 2}V${y}`, OAK[3], .8).f(B.rect(lx + 2, y - h - 3, 26, 3), STONE.rockHi);
      const dh = sz('door', 1) * 1.2;
      B.f(B.rect(lx, -10 - dh, lw, dh), OAK[1]).f(B.rect(lx + 2, -10 - dh + 2, 12, dh - 2), OAK[0]).f(B.rect(lx + 16, -10 - dh + 2, 12, dh - 2), '#2a1c12').s(`M${lx + 2} ${-10 - dh + 2}L${lx + 14} -12`, OAK[2], 1, .6).f(B.rect(lx - 2, -13 - dh, lw + 4, 3), STONE.rockHi);
      if (lit) B.f(B.rect(lx + 16, -10 - dh + 2, 12, dh - 2), 'rgba(255,200,110,.4)');
      const win = (x, y, w, h) => { B.f(B.rect(x - 1.6, y - 3, w + 3.2, 3), STONE.rockHi).f(B.rect(x - 1, y + h, w + 2, 2.2), STONE.rock); windowLit(B, x, y, w, h, lit, '#e8dcc0'); };
      for (const x of [-50, -32, 26, 50]) { win(x, f1 + 12, 12, 18); win(x, f2 + 12, 12, 16); win(x, eaves + 12, 12, 14); }
      // sacks of meal and a barrow by the doors, a wheelbarrow of sacks, nettles along the foot
      for (const [x, y] of [[44, -1], [52, -2], [48, -10], [60, -1]]) B.f(B.rr(x - 5, y - 10, 10, 11, 4), '#d9caa0').f(B.rr(x - 5, y - 10, 4, 11, 3), '#efe4c6', .7).s(`M${x - 2} ${y - 9}q2 -2 4 0`, '#a8986e', .8);
      for (let i = 0; i < 9; i++) { const x = x0 + 4 + r() * 30; B.s(`M${x} 0q${(r() - .5) * 3} -7 ${(r() - .5) * 4} -${9 + r() * 6}`, leaf(s)[1], 1.2, .85); }
      B.tufts(r, x1 + 6, 4, 14, 7, grass(s), 7);
    } };

  /* ---------- the hilltop folly: a round tower of pale stone on the ridge with no stair, put up to look nice from the
     village; a string course, the camera's high window under a slate cone and a vane, a studded door kept locked ---------- */
  const PALE = { rock: '#c8c0aa', rockLo: '#a0987f', rockHi: '#e6dfca', rockDk: '#6e6858', lichen: '#d8cf8a' };
  A['ld-folly'] = { box: [-52, -272, 54, 12], seat: { kind: 'turf', w: 66, front: 16 }, lit: true, lights: [[0, -186, 80]], ownLights: true, draw(B, o) {
    const r = KIT().rng(351), s = o.season, R = 30, top = -sz('tower', .05) + 10;
    // the drum in coursed pale stone, round, lit from the upper left
    rubble(B, r, -R, R, 0, () => top, ['#d2cab4', '#c4bca4', '#b8b098', '#dcd4be', '#aca48c'], { course: 6.4, quoin: true, mortar: '#8a846e' });
    B.f(`M${-R} 0L${-R} ${top}L${R} ${top}L${R} 0Z`, B.lin(-R, 0, R, 0, [[0, 'rgba(255,255,255,.16)'], [.4, 'rgba(255,255,255,0)'], [.7, 'rgba(40,36,28,.08)'], [1, 'rgba(40,36,28,.34)']]));
    for (let y = -6; y > top + 4; y -= 7) B.s(`M${-R} ${y}Q0 ${y + 4} ${R} ${y}`, PALE.rockDk, .7, .16);
    // a string course half way, a corbelled lip under the cap
    for (const y of [top * .48, top + 2]) B.f(`M${-R - 2} ${y}Q0 ${y + 5} ${R + 2} ${y}L${R + 2} ${y + 4}Q0 ${y + 9} ${-R - 2} ${y + 4}Z`, PALE.rockLo).f(`M${-R - 2} ${y}Q0 ${y + 5} ${R + 2} ${y}Q0 ${y + 2} ${-R - 2} ${y}Z`, PALE.rockHi);
    for (let x = -R + 2; x < R - 2; x += 6.4) B.f(B.rect(x, top + 7 + 3.4 * (1 - (x / R) ** 2), 4, 4), PALE.rockDk, .45);
    // the slate cone: banded courses, a lead hip, the vane
    const ct = top - 52;
    B.f(`M${-R - 7} ${top}L0 ${ct}L${R + 7} ${top}Q0 ${top + 7} ${-R - 7} ${top}Z`, '#5f6670');
    B.f(`M${-R - 7} ${top}L0 ${ct}L-5 ${top + 2}Z`, '#7c848e', .7).f(`M${R * .4} ${top + 3}L0 ${ct}L${R + 7} ${top}Z`, '#3e444c', .5);
    for (let k = 1; k < 7; k++) { const y = top - k * 7.4, w = (R + 7) * (1 - k / 7.1); B.s(`M${-w} ${y}Q0 ${y + 2.6} ${w} ${y}`, '#454b54', .9, .7); }
    B.s(`M0 ${ct}V${ct - 12}`, '#2f3336', 1.4).s(`M-7 ${ct - 9}H9`, '#2f3336', 1.2).f(`M9 ${ct - 9}l-4 -2.6v5.2z`, '#2f3336').f(B.circ(0, ct - 1, 2), '#2f3336');
    if (s === 'winter') B.f(`M${-R - 5} ${top - 2}L0 ${ct + 2}L-7 ${top - 2}Z`, '#f4f6f2', .85);
    // the camera's high window (a warm light in it at night), two slits up the stair that is not there, the locked door
    const hw = top + 18;
    B.f(arch(0, hw + 22, 14, 22), '#a0987f').f(arch(0, hw + 21, 10, 19), o.night ? '#ffd88a' : '#3a3a44').s(`M0 ${hw + 3}V${hw + 21}`, PALE.rockDk, 1, .8);
    for (const [x, y] of [[-8, top * .72], [7, top * .3]]) B.f(B.rr(x - 2, y, 4, 14, 2), '#3a3a44').f(B.rr(x - 3.4, y - 1.4, 6.8, 2, 1), PALE.rockHi);
    const dh = sz('door', .5);
    B.f(arch(0, -3, 26, dh + 4), PALE.rockLo).f(arch(0, -3, 20, dh), '#6a4e30').f(`M-10 -3V${-3 - dh + 10}A10 10 0 0 1 0 ${-3 - dh}V-3Z`, '#8a6a44', .6);
    for (let y = -10; y > -3 - dh + 8; y -= 9) for (const x of [-6, 6]) B.f(B.circ(x, y, 1.1), '#2f3336');
    B.s(`M-10 ${-3 - dh * .55}H10`, '#3a2a1a', 1.4).f(B.rect(-15, -3, 30, 4), PALE.rockLo).f(B.rect(-15, -3, 30, 1.3), PALE.rockHi);
    // lichen up the drum, and long ridge grass and harebells round its foot
    for (let k = 0; k < 10; k++) B.f(B.blob(r, -R + 4 + r() * (R * 2 - 8), -16 - r() * (-top - 30), 3 + r() * 3, 1.6, 6, .5), s === 'winter' ? '#dfe2da' : PALE.lichen, .5);
    B.tufts(r, -R, 3, 22, 10, ['#8a9a52', '#a8a860', '#7a8a48'], 10).tufts(r, R, 3, 22, 10, ['#8a9a52', '#a8a860', '#7a8a48'], 10);
    if (s === 'summer') for (let i = 0; i < 6; i++) B.f(B.circ(-R - 6 + r() * 12 + (i % 2) * (R * 2), -4 - r() * 6, 1.4), '#8a7ad0', .9);
  } };

  /* ---------- Hollin's hut among the yews: a low hut of split oak boards on a stone footing, a turf roof grown over with
     moss and ferns, the stack of split logs under the eaves, a chopping block with the axe in it, smoke from a stone
     chimney; the step is swept ---------- */
  A['ld-woodhut'] = { box: [-74, -180, 76, 10], door: { dx: 8, dy: 0 }, seat: { kind: 'earth', w: 96, front: 20 }, lit: true, lights: [[-26, -58, 70]], draw(B, o) {
    const r = KIT().rng(361), s = o.season, L = leaf(s), eaves = sz('eaves', .5), ridge = sz('ridge', 0) * .92, oak = ['#6e5a42', '#4e3e2c', '#8e785a', '#2e2418'];
    // the stone chimney up the west end, behind the roof's edge
    rubble(B, r, -54, -38, -eaves + 6, () => -ridge - 20, ['#8c8874', '#7e7a66', '#9a9680'], { course: 4.4, edge: false });
    B.f(B.rect(-56, -ridge - 23, 20, 4), '#6e6a5a');
    for (let k = 0; k < 4; k++) B.f(B.blob(r, -44 + k * 7, -ridge - 30 - k * 8, 6 + k * 2.4, 4 + k * 1.4, 8, .5), '#e8e6e0', .2 - k * .04);   // (a thread of smoke)
    // the footing and the walls: split boards, grey with weather, lit to the west
    ashlar(B, r, -50, -8, 100, 8, MOSSY, 4.4);
    B.f(B.rect(-48, -eaves, 96, eaves - 8), oak[0]);
    for (let x = -48; x < 48; x += 5.4) { B.s(`M${x} ${-eaves}v${eaves - 8}`, oak[3], .7, .55); if (r() < .45) B.f(B.rect(x + .6, -eaves + r() * eaves * .4, 4.2, eaves * (.2 + r() * .4)), r() < .5 ? oak[2] : oak[1], .4); }
    B.f(B.rect(-48, -eaves, 20, eaves - 8), '#ffffff', .07).f(B.rect(30, -eaves, 18, eaves - 8), '#000000', .18);
    // the turf roof: a heavy overhanging thatch of turf, moss and ferns, its edge ragged with grass
    const ry = -ridge, roof = `M-60 ${-eaves + 4}Q-52 ${ry + 6} -30 ${ry}H34Q54 ${ry + 6} 62 ${-eaves + 4}Q0 ${-eaves + 10} -60 ${-eaves + 4}Z`;
    B.f(roof, s === 'winter' ? '#9aa894' : s === 'autumn' ? '#7e7a44' : '#5e7a3a');
    for (let i = 0; i < 26; i++) { const x = -54 + r() * 110, y = ry + 6 + r() * (ridge - eaves - 4); B.f(B.blob(r, x, y, 6 + r() * 7, 3 + r() * 2, 7, .5), s === 'winter' ? '#e8eeea' : [L[0], L[1], L[2], '#7d8f4e'][i % 4], .8); }
    B.f(`M-60 ${-eaves + 4}Q-52 ${ry + 6} -30 ${ry}H-16Q-36 ${ry + 10} -44 ${-eaves + 2}Z`, '#ffffff', .1);
    for (let x = -58; x < 60; x += 3) B.s(`M${x} ${-eaves + 4 + Math.abs(x) * .05}q${(r() - .5) * 3} ${4 + r() * 5} ${(r() - .5) * 4} ${6 + r() * 6}`, s === 'winter' ? '#c8d0c4' : L[r() < .5 ? 0 : 2], 1, .9);
    ferns(B, r, 0, ry + 8, 50, 5, s);
    // the door: low, plank, a wooden latch, the swept step; a small window with a lamp in it at night
    const dh = sz('door', .5) * .95;
    B.f(B.rect(-2, -8 - dh, 20, dh), oak[3]).f(B.rect(0, -6 - dh, 16, dh - 2), B.lin(0, 0, 16, 0, [[0, '#7a6046'], [1, '#5a4632']])).s(`M5 ${-6 - dh}v${dh - 2}M10 ${-6 - dh}v${dh - 2}`, oak[3], .7, .8).s(`M3 ${-8 - dh * .5}h7`, '#8a6a46', 1.6);
    B.f(B.rect(-4, -8, 24, 3), '#a8a28c').f(B.rect(-4, -8, 24, 1), '#cfc9b2');
    windowLit(B, -32, -eaves + 10, 12, 10, o.night, '#8a785a');
    // the stack of split logs under the east eave, the chopping block with the axe, chips on the ground
    for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) { const x = 26 + k * 6 + (row & 1) * 3, y = -12 - row * 5.6; B.f(B.circ(x, y, 3), '#8a6440').f(B.circ(x - .4, y - .4, 2), '#d4aa74').f(B.circ(x, y, .5), '#8a6440'); }
    B.f(B.rr(-52, -12, 14, 12, 2), oak[1]).f(B.ell(-45, -12, 7, 2.4), '#b49470').s('M-46 -13L-40 -24', '#6a5034', 1.6).f(B.poly([[-41, -26], [-36, -24], [-38, -20], [-42, -22]]), '#8a9294');
    for (let i = 0; i < 10; i++) B.f(B.ell(-58 + r() * 30, 2 + r() * 5, 1.6, .8), '#c8a474', .9);
    // yew needles and ivy at the corners, long grass along the footing
    ivy(B, r, -48, -8, -eaves + 4, s); ivy(B, r, 46, -8, -eaves * .6, s);
    B.tufts(r, -62, 4, 12, 7, grass(s), 7).tufts(r, 62, 4, 12, 7, grass(s), 7);
  } };

  // A light of its own wins over one an older file gave the same thing (94-garden-paint-terrain-3orchard.js lit the folly
  // where its old high window was).
  const landmark = M.landmark;
  M.landmark = function (scene, prop, sc) {
    const h = landmark.apply(this, arguments), art = h && prop && A[prop.id];
    if (art && art.ownLights) { const night = !!art.lit && (sc.tod === 'dusk' || sc.tod === 'night'); h.lights = night ? art.lights.map(([dx, dy, rad]) => ({ x: h.foot.x + dx, y: h.foot.y + dy, radius: rad || 110, pool: true })) : []; }
    return h;
  };
})();
