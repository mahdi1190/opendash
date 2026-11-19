/* Painted trees for the village and the orchard (Painted village style): real crowns built from clustered leaf
 * masses, each mass lit from the upper left (a warm sunlit cap, a cool shaded underside, a deep core where the
 * masses overlap), sky gaps with limbs showing through, a bole that flares into roots sinking into the grass, and,
 * in autumn and summer, fruit and haws tucked into the leaves rather than dotted on top. Species differ in
 * silhouette, leaf size, bark and colour: oak, sweet chestnut, birch, hawthorn, alder, wild cherry, and the orchard's
 * apple, pear, plum and cherry. Variants (v 0..2) and age (the caller's height) change the shape.
 *
 * GardenPaintTrees.canvas(o)          a baked tree: { c, ox, oy, k, crown } with (ox, oy) its foot in canvas px
 * GardenPaintTrees.image(scene, o)    a Phaser image, foot at (o.x, o.y); textures are shared by species, season,
 *                                     variant and a 16 px height step, then scaled to the exact height
 * GardenPaintTrees.groundShadow(cx, x, y, h, o)   paints the tree's dappled cast shadow and the dark contact under
 *                                     its roots into a ground canvas already in world units (no frame cost)
 * GardenPaintTrees.stats()            textures baked, their bytes and the slowest bake
 * Sun: upper left, so shadows fall to the lower right. Nothing runs at load. */
window.GardenPaintTrees = (function () {
  'use strict';
  const K = 2.5, TEX = 'gptree', STEP = 24;
  let bytes = 0, made = 0, worstMs = 0;
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  // (a hex colour out, so a mixed colour can be mixed again: spring's leaves are mixed twice, and an rgb() string mixed
  //  again came out as no colour at all, so every spring crown in the village was painted black)
  const mix = (a, b, t) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), c = (x, y) => Math.max(0, Math.min(255, Math.round(x + (y - x) * t))); return '#' + ((1 << 24) + (c(p >> 16, q >> 16) << 16) + (c((p >> 8) & 255, (q >> 8) & 255) << 8) + c(p & 255, q & 255)).toString(16).slice(1); };
  // leaf ramps: deep core, shade, body, lit, sunlit cap
  const LEAF = {
    oak: { summer: ['#24391f', '#3a5a2c', '#55783a', '#7a9c4a', '#a9c26a'], autumn: ['#3e2c18', '#6a4a22', '#9a6a2c', '#c4903e', '#e6be6a'] },
    chestnut: { summer: ['#203a22', '#34582f', '#4e7a3c', '#72a04e', '#a2c470'], autumn: ['#432414', '#78401c', '#b0622a', '#d68e3c', '#f0bc62'] },
    birch: { summer: ['#2e4a26', '#4a7034', '#6c9a44', '#94bc5c', '#c4dc84'], autumn: ['#4a3e18', '#806a22', '#b89a30', '#e0c44a', '#f6e486'] },
    hawthorn: { summer: ['#1e3420', '#30502c', '#48703a', '#6a9248', '#94b464'], autumn: ['#3a2216', '#5e3420', '#874a2a', '#a8683a', '#c89a5a'] },
    alder: { summer: ['#1c321e', '#2c4c2a', '#426a36', '#628c46', '#8cb05e'], autumn: ['#2c3418', '#4a5222', '#6e722e', '#94903e', '#b8b05a'] },
    cherry: { summer: ['#2a3a22', '#44602e', '#628440', '#86a856', '#b2c878'], autumn: ['#3e1614', '#6e2018', '#a83222', '#d0582e', '#ee9a52'] },
    apple: { summer: ['#22381e', '#38582c', '#527a3c', '#76a050', '#a6c674'], autumn: ['#34301a', '#5a5424', '#86782e', '#b0983c', '#d8c066'] },
    pear: { summer: ['#203a1e', '#36582c', '#4e7838', '#709c4a', '#9ec06a'], autumn: ['#3a2e16', '#64461e', '#946428', '#c28a36', '#e4b85a'] },
    plum: { summer: ['#1e321e', '#324c2c', '#4a6a3a', '#6a8c4a', '#94ae68'], autumn: ['#3a2418', '#623c22', '#8c5a2c', '#b47c3a', '#d4a85a'] },
    // the woods: beech (fresh green, copper in autumn), yew (deep blue-green all year), holly (glossy, nearly black-green)
    beech: { summer: ['#1a3218', '#2c5024', '#447432', '#66983e', '#94ba5a'], autumn: ['#3e1e0e', '#743816', '#a85a24', '#d08434', '#eeb056'] },
    yew: { summer: ['#0e1c12', '#1a2c1c', '#27402c', '#3a583e', '#5c7c54'] },
    holly: { summer: ['#0c1e12', '#16301c', '#24462a', '#386038', '#5e8a50'] },
  };
  LEAF.greatoak = LEAF.oak;
  LEAF.spring = null;
  const BARK = { oak: ['#3a2c20', '#5a4532', '#7e6448', '#a48862'], chestnut: ['#3a2a20', '#5c4230', '#80624a', '#a08466'], birch: ['#5a5650', '#c8c4b8', '#e8e4da', '#fbf8f0'], hawthorn: ['#2e2620', '#4c3e32', '#6e5a48', '#8e7660'], alder: ['#2e2a26', '#4a443c', '#6a6256', '#8a8274'], cherry: ['#3a2220', '#5e3a32', '#80564a', '#a07a6a'], apple: ['#3a2c20', '#5a4634', '#7a644c', '#9a8266'], pear: ['#322820', '#504032', '#705c4a', '#907a64'], plum: ['#30221e', '#4c3830', '#6a5246', '#8a705e'], beech: ['#4a4a44', '#76766c', '#9c9a8e', '#c6c4b8'], yew: ['#2a1810', '#48281a', '#663a26', '#865838'], holly: ['#3a3a34', '#5e5e56', '#80807a', '#a2a29a'], greatoak: ['#33261c', '#54412f', '#7a6046', '#a08460'] };
  // silhouette per species, in units of the tree's height: crown centre height, half width, half height, trunk height,
  // mass size, mass count, mass elongation (birch hangs), leaf dab size
  const FORM = {
    oak: { cy: .6, rx: .46, ry: .33, tr: .44, m: .16, n: 22, el: .9, dab: .028, girth: .07 },
    chestnut: { cy: .6, rx: .38, ry: .37, tr: .4, m: .15, n: 24, el: .95, dab: .026, girth: .065 },
    birch: { cy: .6, rx: .24, ry: .38, tr: .5, m: .085, n: 30, el: 1.35, dab: .018, girth: .03 },
    hawthorn: { cy: .52, rx: .4, ry: .3, tr: .34, m: .12, n: 24, el: .85, dab: .02, girth: .05 },
    alder: { cy: .58, rx: .27, ry: .4, tr: .4, m: .11, n: 24, el: 1.1, dab: .022, girth: .045, cone: true },
    cherry: { cy: .6, rx: .45, ry: .28, tr: .44, m: .13, n: 22, el: .8, dab: .024, girth: .05 },
    apple: { cy: .55, rx: .42, ry: .3, tr: .34, m: .13, n: 22, el: .85, dab: .024, girth: .055 },
    pear: { cy: .6, rx: .3, ry: .38, tr: .36, m: .12, n: 22, el: 1.05, dab: .022, girth: .05 },
    plum: { cy: .56, rx: .38, ry: .3, tr: .34, m: .12, n: 22, el: .9, dab: .022, girth: .05 },
    // (the woods: a beech is a broad layered dome on a smooth grey bole; a yew a low dark mound skirted almost to the ground
    //  on a short fluted red trunk; a holly a narrow dark cone; the Great Oak a crown far wider than it is tall on a vast bole)
    beech: { cy: .6, rx: .45, ry: .35, tr: .44, m: .14, n: 28, el: .82, dab: .022, girth: .06, smooth: true },
    yew: { cy: .47, rx: .46, ry: .42, tr: .2, m: .15, n: 34, el: .78, dab: .018, girth: .09, evergreen: true },
    holly: { cy: .5, rx: .27, ry: .42, tr: .16, m: .1, n: 30, el: 1, dab: .016, girth: .04, evergreen: true, cone: true, smooth: true },
    greatoak: { cy: .56, rx: .64, ry: .34, tr: .36, m: .12, n: 54, el: .85, dab: .016, girth: .1 },
  };
  const FRUIT = { apple: { summer: ['#7e9a38', '#a8c050', '#d6e08a'], autumn: ['#8e1e18', '#c8382a', '#f08a6a'] }, pear: { summer: ['#8aa040', '#b4c862', '#e2ea9a'], autumn: ['#a88a2a', '#d8b84a', '#f4e08e'] }, plum: { summer: ['#56602e', '#7a8a4a', '#aab47a'], autumn: ['#2e1438', '#5a2e5e', '#9a6aa0'] }, cherry: { summer: ['#6e1410', '#b42a22', '#ee7a6a'], autumn: ['#6e1410', '#b42a22', '#ee7a6a'] }, hawthorn: { autumn: ['#5a1010', '#9a2218', '#d0503a'] }, holly: { autumn: ['#5a0c0c', '#a8161a', '#e85a4a'], winter: ['#5a0c0c', '#a8161a', '#e85a4a'] } };
  const LIGHT = { x: -.6, y: -.8 };

  function ramp(species, season) {
    const L = LEAF[species] || LEAF.oak;
    if (FORM[species] && FORM[species].evergreen) return L.summer;   // (yew and holly are the same dark green all year)
    if (season === 'spring') return L.summer.map((c, i) => mix(c, ['#3a5a2c', '#5a8a3a', '#7cb050', '#a6d06a', '#d4ec98'][i], .45));
    return L[season] || L.summer;
  }
  /** One leaf mass: a lumpy union of small rounds (its leafy edge), filled once. */
  function mass(cx, r, x, y, rx, ry, lumps) {
    cx.beginPath();
    cx.ellipse(x, y, rx * .72, ry * .72, 0, 0, Math.PI * 2);
    for (let i = 0; i < lumps; i++) { const a = i / lumps * Math.PI * 2 + r() * .5, d = .58 + r() * .18, s = .3 + r() * .16; cx.moveTo(x + Math.cos(a) * rx * d + rx * s, y + Math.sin(a) * ry * d); cx.ellipse(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, rx * s, ry * s, 0, 0, Math.PI * 2); }
  }
  function trunk(cx, r, sp, H, lean, season) {
    const F = FORM[sp], B = BARK[sp] || BARK.oak, tw = Math.max(2.4, H * F.girth * 1.25), th = H * F.tr + H * F.ry * .5, top = -th, birch = sp === 'birch';
    // limbs into the crown (seen through its gaps), drawn under it
    const limbs = [];
    const n = sp === 'birch' ? 3 : sp === 'greatoak' ? 7 : 4 + (r() < .5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - .5) * (sp === 'alder' || sp === 'birch' ? 1.1 : 2.1) + (r() - .5) * .25, len = H * F.ry * (.55 + r() * .35);
      const y0 = -H * F.tr * (.82 + r() * .2), x0 = lean * (y0 / top);
      limbs.push([x0, y0, x0 + Math.cos(a) * len * (F.rx / F.ry) * .75, y0 + Math.sin(a) * len * .9, tw * (.5 + r() * .2)]);
    }
    cx.lineCap = 'round';
    for (const [x0, y0, x1, y1, w] of limbs) {
      const mx = (x0 + x1) / 2 + (r() - .5) * H * .05, my = (y0 + y1) / 2 + H * .03;
      cx.strokeStyle = birch ? B[0] : B[1]; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x0, y0); cx.quadraticCurveTo(mx, my, x1, y1); cx.stroke();
      cx.strokeStyle = birch ? B[2] : B[2]; cx.globalAlpha = .55; cx.lineWidth = w * .35; cx.beginPath(); cx.moveTo(x0 - w * .2, y0); cx.quadraticCurveTo(mx - w * .2, my, x1 - w * .1, y1); cx.stroke(); cx.globalAlpha = 1;
      // twigs off each limb
      for (let k = 0; k < 3; k++) { const t = .45 + k * .2, bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t; cx.strokeStyle = B[1]; cx.lineWidth = w * .3; cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx + (r() - .5) * H * .14, by - H * (.03 + r() * .06)); cx.stroke(); }
    }
    // the bole with its root flare: the base spreads and the roots run out and sink into the grass
    // (the woods' own species, yew, beech and holly, sit on a tighter flare with shorter roots: at the old spread a yew stood
    //  on a brown tent of roots twice as wide as its bole; the village's species keep theirs)
    const great = sp === 'greatoak', tight = sp === 'yew' || sp === 'beech' || sp === 'holly', flare = tw * (birch ? 1.5 : great ? 1.4 : tight ? 1.55 : 2.1), g = cx.createLinearGradient(-flare, 0, flare, 0);
    if (birch) { g.addColorStop(0, B[3]); g.addColorStop(.45, B[2]); g.addColorStop(1, B[0]); } else { g.addColorStop(0, B[3]); g.addColorStop(.3, B[2]); g.addColorStop(.75, B[1]); g.addColorStop(1, B[0]); }
    cx.fillStyle = g; cx.beginPath();
    cx.moveTo(-flare, 1.5);
    cx.bezierCurveTo(-tw * 1.05, -tw * .2, -tw * .6, -tw * 1.2, -tw * .55 + lean * .3, -th * .45);
    cx.quadraticCurveTo(-tw * .45 + lean * .8, -th * .8, -tw * .4 + lean, top);
    cx.lineTo(tw * .4 + lean, top);
    cx.quadraticCurveTo(tw * .45 + lean * .8, -th * .8, tw * .55 + lean * .3, -th * .45);
    cx.bezierCurveTo(tw * .6, -tw * 1.2, tw * 1.05, -tw * .2, flare * 1.1, 1.5);
    cx.quadraticCurveTo(0, 3, -flare, 1.5); cx.fill();
    // root fingers, each with a dark crease where it leaves the bole
    if (great) {
      // (19 Nov 2026, the woods chain: the Great Oak's roots are gnarled buttresses, each its own length and swell, a knuckle
      //  where it bends into the ground and a dark crease each side; its long straight root wedges read as a tent's skirt)
      for (const [dir, len, lift] of [[-1, .62, .5], [1, .74, .55], [-.62, .42, .8], [.66, .5, .75], [-.18, .26, 1], [.3, .32, .95]]) {
        const x0 = dir * tw * .42, x1 = dir * (flare + tw * len * .55) + (r() - .5) * tw * .1, kx = x0 + (x1 - x0) * .62, ky = -tw * .16 * lift, w0 = tw * (.2 + .1 * lift);
        cx.fillStyle = dir < 0 ? B[2] : B[1]; cx.beginPath(); cx.moveTo(x0 - w0, -tw * .75 * lift); cx.bezierCurveTo(x0 + (kx - x0) * .4, -tw * .55 * lift, kx - dir * w0 * .4, ky - w0 * .7, kx, ky - w0 * .45);
        cx.quadraticCurveTo(x1 - dir * w0 * .2, ky * .4, x1, 1.8); cx.quadraticCurveTo(kx, 3, x0 + w0, .5); cx.closePath(); cx.fill();
        cx.globalAlpha = .5; cx.fillStyle = dir < 0 ? B[3] : B[2]; cx.beginPath(); cx.ellipse(kx - dir * w0 * .15, ky - w0 * .4, w0 * .5, w0 * .28, -dir * .3, Math.PI, Math.PI * 2); cx.fill();   // (the lit top of the knuckle)
        cx.globalAlpha = .55; cx.strokeStyle = B[0]; cx.lineWidth = Math.max(.7, tw * .025); cx.beginPath(); cx.moveTo(x0 + dir * w0 * .2, -tw * .6 * lift); cx.quadraticCurveTo(kx + dir * w0 * .3, ky + w0 * .1, x1 * .97, 1.6); cx.stroke(); cx.globalAlpha = 1;
      }
    } else for (const [dir, len] of [[-1, 1.0], [1, 1.2], [-.35, .6], [.45, .7]]) {
      const x0 = dir * tw * .5, x1 = dir * (flare + tw * len * (tight ? .4 : .9));
      cx.fillStyle = dir < 0 ? B[2] : B[1]; cx.beginPath(); cx.moveTo(x0 - tw * .3, -tw * .6); cx.quadraticCurveTo(x1 * .7, -tw * .25, x1, 1.6); cx.quadraticCurveTo(x1 * .6, 2.2, x0 + tw * .3, 0); cx.closePath(); cx.fill();
      cx.strokeStyle = B[0]; cx.globalAlpha = .45; cx.lineWidth = .7; cx.beginPath(); cx.moveTo(x0, -tw * .5); cx.quadraticCurveTo(x1 * .6, -tw * .1, x1 * .9, 1.4); cx.stroke(); cx.globalAlpha = 1;
    }
    // bark: furrows (oak, chestnut, hawthorn), or the birch's white with black lenticels and dark base
    if (birch) {
      for (let k = 0; k < 9; k++) { const y = -tw - r() * (th - tw * 2), x = lean * (y / top) + (r() - .5) * tw * .7; cx.fillStyle = B[0]; cx.globalAlpha = .85; cx.beginPath(); cx.ellipse(x, y, tw * (.25 + r() * .25), .6 + r() * .6, 0, 0, Math.PI * 2); cx.fill(); }
      cx.globalAlpha = .45; cx.fillStyle = '#3a3630'; cx.beginPath(); cx.moveTo(-flare, 1.5); cx.quadraticCurveTo(-tw * .9, -tw * 1.2, -tw * .3, -tw * 1.6); cx.quadraticCurveTo(tw * .6, -tw * 1.1, flare, 1.5); cx.fill(); cx.globalAlpha = 1;
    } else if (F.smooth) {
      // beech and holly: smooth grey bark, a lit stripe up the sunny side, faint rings and a few dark eyes where limbs fell
      cx.globalAlpha = .3; cx.fillStyle = B[3]; cx.beginPath(); cx.ellipse(-tw * .22 + lean * .5, -th * .45, tw * .13, th * .34, 0, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = B[0]; cx.lineWidth = .6; for (let k = 0; k < 5; k++) { const y = -tw * 1.2 - r() * (th - tw * 2), x = lean * (y / top); cx.globalAlpha = .25 + r() * .2; cx.beginPath(); cx.moveTo(x - tw * .45, y); cx.quadraticCurveTo(x, y + 1.2, x + tw * .45, y - .4); cx.stroke(); }
      for (let k = 0; k < 2; k++) { const y = -th * (.35 + r() * .4), x = lean * (y / top) + (r() - .5) * tw * .4; cx.globalAlpha = .55; cx.fillStyle = B[0]; cx.beginPath(); cx.ellipse(x, y, tw * .1, tw * .07, 0, 0, Math.PI * 2); cx.fill(); }
      cx.globalAlpha = 1;
    } else {
      cx.strokeStyle = B[0]; cx.lineWidth = great ? Math.max(.8, tw * .035) : .8;
      for (let k = 0, nf = great ? Math.max(7, Math.round(tw * .45)) : 7; k < nf; k++) {   /* (the Great Oak's vast bole gets furrows to its own width; every other tree keeps its seven, and so its shape) */ const x = (k / (nf - 1) - .5) * tw * .9, sway = (r() - .5) * (great ? tw * .1 : 2); cx.globalAlpha = .35 + r() * .25; cx.beginPath(); cx.moveTo(x * 1.4, -1); cx.bezierCurveTo(x + sway, -th * .3, x + lean * .4 - sway, -th * .6, x * .8 + lean, top + 2); cx.stroke(); }
      cx.globalAlpha = .25; cx.fillStyle = B[3]; cx.beginPath(); cx.ellipse(-tw * .3, -th * .35, tw * .16, th * .25, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
      if (sp === 'oak' && r() < .7) { cx.fillStyle = B[0]; cx.globalAlpha = .7; cx.beginPath(); cx.ellipse(tw * .1, -th * .5, tw * .16, tw * .28, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; }
    }
    if (great) {
      // the Great Oak's character (woodland.md: huge, low limbs, the letters carved low on the trunk): two great limbs leave
      // the bole low and sag out sideways under the crown's rim before they rise into it; burrs on the bole; W, a small t and
      // a third letter scratched out, cut pale into the bark at about knee height
      // (each limb a tapered bough, thick at the bole and thin where it goes into the leaves, lit along its top and shaded
      //  under; drawn as strokes of one width they read as garden hoses)
      for (const dir of [-1, 1]) {
        const x0 = dir * tw * .3 + lean * .4, y0 = -th * (dir < 0 ? .36 : .32), x1 = dir * H * (dir < 0 ? .37 : .4), y1 = -H * (dir < 0 ? .37 : .35), mx = dir * H * .19, my = y0 + H * .014;
        const P = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1];
        const top = [], bot = [], N = 14;
        for (let i = 0; i <= N; i++) { const t = i / N, [x, y] = P(t), [xa, ya] = P(Math.min(1, t + .02)), [xb, yb] = P(Math.max(0, t - .02)), dx = xa - xb, dy = ya - yb, L = Math.hypot(dx, dy) || 1, w = tw * (.3 - .22 * t) * (1 + .18 * Math.sin(t * 9 + dir)); top.push([x + dy / L * w * dir, y - dx / L * w * dir]); bot.push([x - dy / L * w * dir, y + dx / L * w * dir]); }
        const [hi, lo] = top[3][1] < bot[3][1] ? [top, bot] : [bot, top];
        cx.globalAlpha = 1; cx.fillStyle = B[1]; cx.beginPath(); cx.moveTo(hi[0][0], hi[0][1]); for (const p of hi) cx.lineTo(p[0], p[1]); for (let i = lo.length - 1; i >= 0; i--) cx.lineTo(lo[i][0], lo[i][1]); cx.closePath(); cx.fill();
        cx.globalAlpha = .55; cx.fillStyle = B[0]; cx.beginPath(); cx.moveTo(lo[0][0], lo[0][1]); for (let i = 0; i < lo.length; i++) cx.lineTo(lo[i][0], lo[i][1]); for (let i = lo.length - 1; i >= 0; i--) cx.lineTo((lo[i][0] * 2 + hi[i][0]) / 3, (lo[i][1] * 2 + hi[i][1]) / 3); cx.closePath(); cx.fill();
        cx.globalAlpha = .5; cx.strokeStyle = B[3]; cx.lineWidth = Math.max(.7, tw * .035); cx.beginPath(); for (let i = 1; i < hi.length - 2; i++) { const p = hi[i], q = lo[i]; cx[i === 1 ? 'moveTo' : 'lineTo'](p[0] + (q[0] - p[0]) * .18, p[1] + (q[1] - p[1]) * .18); } cx.stroke();
        // bark furrows along the bough, so it reads as wood and not as a smooth tube
        cx.strokeStyle = B[0]; cx.lineWidth = Math.max(.6, tw * .022);
        for (const f of [.42, .62, .78]) { cx.globalAlpha = .3; cx.beginPath(); for (let i = 0; i < hi.length - 1; i++) { const p = hi[i], q = lo[i], w = f + Math.sin(i * 1.7 + f * 9) * .05; cx[i ? 'lineTo' : 'moveTo'](p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w); } cx.stroke(); }
        cx.globalAlpha = 1;
        // in winter the bough forks on from its tip into branches (bare, it otherwise ended in the air like a hammock's rope)
        limbs.push([x1, y1, x1 + dir * H * .1, y1 - H * .2, tw * .16], [x1 * .8, y1 + H * .02, x1 * .8 + dir * H * .02, y1 - H * .18, tw * .12]);
      }
      for (const [bx, by, s] of [[-.26, .3, 1], [.2, .55, .8], [-.05, .72, .7]]) {
        const x = tw * bx + lean * by, y = -th * by, rx = tw * .13 * s, ry = tw * .1 * s;
        cx.fillStyle = B[0]; cx.globalAlpha = .75; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); cx.fill();
        cx.strokeStyle = B[3]; cx.globalAlpha = .5; cx.lineWidth = Math.max(.6, tw * .02); cx.beginPath(); cx.ellipse(x, y, rx * 1.15, ry * 1.15, 0, Math.PI * 1.05, Math.PI * 1.75); cx.stroke();
      }
      const L = tw * .15, lx = tw * .04, ly = -tw * .5;
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      for (const [col, dx, dy, a] of [[B[0], .5, .6, .8], ['#c8a878', 0, 0, .9]]) {
        cx.strokeStyle = col; cx.globalAlpha = a; cx.lineWidth = Math.max(.7, tw * .028); cx.beginPath();
        cx.moveTo(lx - L * 1.1 + dx, ly - L + dy); cx.lineTo(lx - L * .8 + dx, ly + dy); cx.lineTo(lx - L * .55 + dx, ly - L * .55 + dy); cx.lineTo(lx - L * .3 + dx, ly + dy); cx.lineTo(lx + dx, ly - L + dy);   // W
        cx.moveTo(lx + L * .45 + dx, ly - L * .75 + dy); cx.lineTo(lx + L * .45 + dx, ly + dy); cx.moveTo(lx + L * .25 + dx, ly - L * .5 + dy); cx.lineTo(lx + L * .65 + dx, ly - L * .5 + dy);   // t
        for (let k = 0; k < 4; k++) { cx.moveTo(lx + L * (.9 + k * .12) + dx, ly - L * .85 + dy); cx.lineTo(lx + L * (.85 + k * .12) + dx, ly - L * .05 + dy); }   // the third, scratched out
        cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    // moss on the shaded north foot
    if (!birch) { cx.fillStyle = '#5e7a34'; cx.globalAlpha = .22; cx.beginPath(); cx.ellipse(tw * .5, -tw * .5, tw * .5, tw * .7, .3, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; }
    return { top, tw, flare, limbs };
  }
  function crown(cx, r, sp, season, H, lean, v) {
    const F = FORM[sp], C = ramp(sp, season), ccx = lean * 1.2, ccy = -H * F.cy, RX = H * F.rx * (.92 + v * .06), RY = H * F.ry * (.94 + (2 - v) * .04);
    // masses: scattered over the crown's volume, nearer the rim than the middle, the cone narrowing for alder
    const ms = [];
    for (let i = 0; i < F.n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), .55) * .78;
      let x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (F.cone) x *= .5 + (y + 1) * .45;
      const s = H * F.m * (.7 + r() * .55) * (1 - d * .25);
      ms.push({ x: ccx + x * RX, y: ccy + y * RY, rx: s, ry: s * .8 * F.el, nx: x, ny: y });
    }
    // a few masses hang below the outline (lower boughs), for a ragged, alive edge
    for (let i = 0; i < 4; i++) { const x = (r() - .5) * 1.6; ms.push({ x: ccx + x * RX, y: ccy + RY * (.55 + r() * .2), rx: H * F.m * .7, ry: H * F.m * .55 * F.el, nx: x, ny: .7 }); }
    ms.sort((p, q) => p.y - q.y);   // back (top) first: front masses overlap them
    const lit = m => Math.max(0, Math.min(1, .52 - (m.nx * LIGHT.x + m.ny * LIGHT.y) * .5));
    // 1. the deep core: one dark body under everything, so overlaps read as depth, not seams
    cx.fillStyle = mix(C[0], C[1], .35); for (const m of ms) { mass(cx, r, m.x + m.rx * .1, m.y + m.ry * .13, m.rx * .96, m.ry * .94, 7); cx.fill(); }
    // 2. each mass: a shaded underside, the lit body set up-left on it, then a sunlit cap of leaf dabs
    const dab = H * F.dab, fruitAt = [];
    for (const m of ms) {
      const l = lit(m);
      cx.fillStyle = mix(C[1], C[2], l * .6); mass(cx, r, m.x + m.rx * .05, m.y + m.ry * .08, m.rx * .95, m.ry * .92, 7); cx.fill();
      cx.fillStyle = mix(C[1], C[3], .25 + l * .7); mass(cx, r, m.x - m.rx * .12, m.y - m.ry * .16, m.rx * .76, m.ry * .7, 6); cx.fill();
      // leaf dabs: small leaves on the lit upper-left of the mass, brighter towards the sun
      const nd = Math.round(10 + m.rx / dab * 1.2);
      for (let k = 0; k < nd; k++) {
        const a = Math.PI * (1.05 + r() * .9) + (r() - .5) * .6, d = .35 + r() * .55, x = m.x + Math.cos(a) * m.rx * d * .8 - m.rx * .1, y = m.y + Math.sin(a) * m.ry * d * .8 - m.ry * .12;
        const t = l * .6 + (1 - d) * .2 + r() * .3; cx.fillStyle = t > .7 ? mix(C[3], C[4], .6) : mix(C[2], C[3], .45 + t * .5); cx.globalAlpha = .55 + r() * .3;
        const s = dab * (.8 + r() * .7); cx.beginPath(); cx.arc(x, y, s, 0, Math.PI * 2); cx.arc(x + s * .9, y + s * .3, s * .7, 0, Math.PI * 2); cx.fill();
      }
      // a few dark leaf dabs breaking the lower edge
      cx.fillStyle = C[1]; cx.globalAlpha = .35;
      for (let k = 0; k < 3; k++) { const a = Math.PI * (.1 + r() * .8), x = m.x + Math.cos(a) * m.rx * .7, y = m.y + Math.sin(a) * m.ry * .72; cx.beginPath(); cx.ellipse(x, y, dab * .9, dab * .55, a, 0, Math.PI * 2); cx.fill(); }
      cx.globalAlpha = 1;
      if (m.ny > -.35 && r() < .8) fruitAt.push(m);
    }
    // 3. sky gaps: shaded pockets with a limb across them, so the crown has air in it
    const gaps = 0;   // (sky pockets read as stray marks at garden scale)
    for (let i = 0; i < gaps; i++) {
      const x = ccx + (r() - .3) * RX * .9, y = ccy + (r() * .5) * RY, w = H * (.022 + r() * .018);
      cx.fillStyle = C[0]; cx.globalAlpha = .8; mass(cx, r, x, y, w * 1.4, w, 5); cx.fill(); cx.globalAlpha = 1;
      cx.strokeStyle = (BARK[sp] || BARK.oak)[sp === 'birch' ? 1 : 0]; cx.globalAlpha = .9; cx.lineWidth = Math.max(.8, H * .01); cx.beginPath(); cx.moveTo(x - w * 1.4, y + w * .6); cx.quadraticCurveTo(x, y - w * .2, x + w * 1.3, y - w * .7); cx.stroke(); cx.globalAlpha = 1;
    }
    return { ms, fruitAt, C, ccx, ccy, RX, RY };
  }
  function fruit(cx, r, sp, season, H, info) {
    const cols = (FRUIT[sp] || {})[season]; if (!cols) return;
    const n = sp === 'hawthorn' ? 14 : sp === 'pear' ? 6 : season === 'autumn' ? 10 : 7, s0 = sp === 'hawthorn' ? H * .008 : H * (season === 'autumn' ? .017 : .014);
    let placed = 0;
    for (const m of info.fruitAt) {
      if (placed >= n) break; if (r() < .35) continue;
      // in twos and threes, half hidden in the lower, shaded part of a mass
      const k = 1 + Math.floor(r() * (sp === 'hawthorn' ? 4 : 3));
      const bx = m.x + (r() - .3) * m.rx * .9, by = m.y + m.ry * (.15 + r() * .35);
      for (let j = 0; j < k && placed < n; j++, placed++) {
        const x = bx + (j - k / 2) * s0 * 1.9 + (r() - .5) * s0, y = by + (r() - .5) * s0 * 1.2, s = s0 * (.8 + r() * .4);
        cx.fillStyle = info.C[0]; cx.globalAlpha = .45; cx.beginPath(); cx.ellipse(x + s * .35, y + s * .55, s * 1.05, s * .6, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;   // its shade in the leaves
        const g = cx.createRadialGradient(x - s * .35, y - s * .4, s * .1, x, y, s * 1.1); g.addColorStop(0, cols[2]); g.addColorStop(.45, cols[1]); g.addColorStop(1, cols[0]);
        cx.fillStyle = g; cx.beginPath(); if (sp === 'pear') { cx.ellipse(x, y + s * .15, s * .8, s * 1.1, 0, 0, Math.PI * 2); } else cx.arc(x, y, s, 0, Math.PI * 2); cx.fill();
        if (s > 1.2) { cx.fillStyle = 'rgba(255,250,235,.45)'; cx.beginPath(); cx.arc(x - s * .35, y - s * .4, s * .22, 0, Math.PI * 2); cx.fill(); }
        // a leaf over it, so it sits inside the crown

      }
    }
  }
  function blossom(cx, r, sp, H, info) {
    const cols = sp === 'cherry' ? ['#f4b8cc', '#fbd8e4', '#fff0f4'] : ['#f2dde0', '#fbeef0', '#ffffff'];
    for (const m of info.ms) for (let k = 0; k < 9; k++) { const a = Math.PI * (1 + r() * 1.1), d = r() * .8, x = m.x + Math.cos(a) * m.rx * d, y = m.y + Math.sin(a) * m.ry * d, s = H * .011 * (.7 + r() * .6); cx.fillStyle = cols[Math.floor(r() * 3)]; cx.globalAlpha = .9; cx.beginPath(); cx.arc(x, y, s, 0, Math.PI * 2); cx.fill(); }
    cx.globalAlpha = 1;
  }
  function bare(cx, r, sp, H, base) {
    // winter: the limbs forking on into twigs, a fine haze where the twigs mass
    const B = BARK[sp] || BARK.oak;
    const fork = (x, y, a, len, w, depth) => {
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      cx.strokeStyle = sp === 'birch' && depth < 2 ? B[2] : B[1]; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo((x + x1) / 2 + (r() - .5) * len * .3, (y + y1) / 2, x1, y1); cx.stroke();
      if (depth >= 4 || w < .5) return;
      const n = 2 + (r() < .4 ? 1 : 0); for (let i = 0; i < n; i++) fork(x1, y1, a + (i - (n - 1) / 2) * .55 + (r() - .5) * .3, len * (.62 + r() * .12), w * .62, depth + 1);
    };
    cx.lineCap = 'round';
    for (const [x0, y0, x1, y1, w] of base.limbs) fork(x0, y0, Math.atan2(y1 - y0, x1 - x0), Math.hypot(x1 - x0, y1 - y0) * .6, w, 1);
    // (the haze fades out from the middle: a flat ellipse at a sixth read as a grey balloon behind every bare tree on snow;
    //  19 Nov 2026, the woods chain)
    const F = FORM[sp], hz = sp === 'birch' ? '138,106,90' : '110,98,82', hx = H * F.rx * .85, hy = H * F.ry * .75;
    cx.save(); cx.translate(0, -H * F.cy); cx.scale(1, hy / hx); const hg = cx.createRadialGradient(0, 0, 0, 0, 0, hx); hg.addColorStop(0, 'rgba(' + hz + ',.2)'); hg.addColorStop(.55, 'rgba(' + hz + ',.12)'); hg.addColorStop(1, 'rgba(' + hz + ',0)'); cx.fillStyle = hg; cx.globalAlpha = 1; cx.beginPath(); cx.arc(0, 0, hx, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  /** Grass grown up round the foot, so the tree stands in the lawn rather than on it. */
  function footGrass(cx, r, H, flare, season) {
    const tone = season === 'winter' ? ['#7e8a6e', '#9aa486'] : season === 'autumn' ? ['#6e8040', '#93a050'] : ['#4e7a34', '#7aa24c'];
    cx.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const x = (r() - .5) * flare * 4.2, h = H * (.025 + r() * .035), lean = (r() - .5) * h * .8; cx.strokeStyle = tone[i % 2]; cx.globalAlpha = .9; cx.lineWidth = .9; cx.beginPath(); cx.moveTo(x, 2.4); cx.quadraticCurveTo(x + lean * .3, 2.4 - h * .6, x + lean, 2.4 - h); cx.stroke(); }
    cx.globalAlpha = 1;
  }
  function draw(cx, sp, season, v, H, seed) {
    const r = rng(seed), lean = (v - 1) * H * .03 + (r() - .5) * H * .02;
    const base = trunk(cx, r, sp, H, lean, season);
    let info = null;
    if (season === 'winter' && sp !== 'alder' && !FORM[sp].evergreen) bare(cx, r, sp, H, base);
    else {
      // the crown on its own layer, so light and shade can be laid over the leaves only
      const F = FORM[sp], c = cx.canvas, off = document.createElement('canvas'); off.width = c.width; off.height = c.height;
      const ox = off.getContext('2d'); ox.setTransform(cx.getTransform());
      info = crown(ox, r, sp, season, H, lean, v);
      if (season === 'spring' && (sp === 'cherry' || sp === 'apple' || sp === 'pear' || sp === 'plum' || sp === 'hawthorn')) blossom(ox, r, sp, H, info);
      if (season === 'autumn' || season === 'summer' || season === 'winter') fruit(ox, r, sp, season, H, info);
      // shade wraps the lower right of the crown; warm sun on its upper left (on the leaves only)
      ox.globalCompositeOperation = 'source-atop';
      let g = ox.createRadialGradient(info.ccx - info.RX * .45, info.ccy - info.RY * .55, 0, info.ccx - info.RX * .45, info.ccy - info.RY * .55, Math.max(info.RX, info.RY) * 2.1);
      g.addColorStop(0, 'rgba(255,232,160,.34)'); g.addColorStop(.3, 'rgba(255,232,160,.08)'); g.addColorStop(.55, 'rgba(20,30,40,0)'); g.addColorStop(.85, 'rgba(16,26,40,.4)'); g.addColorStop(1, 'rgba(12,20,34,.55)');
      ox.fillStyle = g; ox.fillRect(info.ccx - info.RX * 2, info.ccy - info.RY * 2.2, info.RX * 4, info.RY * 4.4);
      ox.globalCompositeOperation = 'source-over';
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(off, 0, 0); cx.restore();
      void F;
    }
    footGrass(cx, r, H, base.flare, season);
    return info;
  }
  function canvas(o) {
    const sp = FORM[o.species] ? o.species : 'oak', season = o.season || 'summer', v = Math.max(0, Math.min(2, o.v | 0)), H = Math.max(30, o.h || 100), k = o.K || K, F = FORM[sp];
    const t0 = performance.now();
    const halfW = H * Math.max(F.rx * 1.35, .3, o.shadow ? .3 + F.rx * 1.2 : 0) + 6, up = H * (F.cy + F.ry * 1.25) + 6, down = o.shadow ? 10 + H * (.1 + F.rx * .5) : 8, w = Math.ceil(halfW * 2 * k), h = Math.ceil((up + down) * k);
    if (w > 4096 || h > 4096) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
    cx.setTransform(k, 0, 0, k, halfW * k, up * k);
    if (o.shadow) groundShadow(cx, 0, 0, H, { species: sp, season });
    draw(cx, sp, season, v, H, (o.seed || 0) + v * 7919 + sp.length * 131 + Math.round(H));
    const ms = performance.now() - t0; worstMs = Math.max(worstMs, ms); made++; bytes += w * h * 4;
    return { c, ox: halfW * k, oy: up * k, k, ms, crown: { x: 0, y: -H * F.cy, rx: H * F.rx, ry: H * F.ry } };
  }
  function image(scene, o) {
    const sp = FORM[o.species] ? o.species : 'oak', season = o.season || 'summer', v = Math.max(0, Math.min(2, o.v | 0)), want = Math.max(30, o.h || 100), step = want > 130 ? STEP * 2 : STEP, H = Math.max(STEP * 2, Math.round(want / step) * step);   /* (a mature tree is 3.5 to 5 times the player now: tall trees share a texture every 48 px of height, or their pictures alone held 35 MB) */
    const key = TEX + '|' + sp + '|' + season + '|' + v + '|' + H + (o.shadow ? '|s' : '');
    if (!scene.textures.exists(key)) {
      const m = canvas({ species: sp, season, v, h: H, shadow: !!o.shadow }); if (!m) return null;
      scene.textures.addCanvas(key, m.c); scene.textures.get(key).customData = { gptree: { ox: m.ox / m.c.width, oy: m.oy / m.c.height } };
    }
    const meta = scene.textures.get(key).customData.gptree, s = want / H / K;
    return scene.add.image(o.x || 0, o.y || 0, key).setOrigin(meta.ox, meta.oy).setScale((o.flip ? -1 : 1) * s, s);
  }
  /** The tree's shadow on the ground (world units): the crown's shade thrown to the lower right with sun flecks in it,
   * and a tight dark contact where the roots meet the grass. */
  function groundShadow(cx, x, y, H, o) {
    const sp = FORM[o && o.species] ? o.species : 'oak', F = FORM[sp], r = rng(Math.round(x * 13 + y * 7)), bare = o && o.season === 'winter' && sp !== 'alder';
    const sx = x + H * .22, sy = y + H * .05, rx = H * F.rx * 1.05, ry = H * F.rx * .42;
    cx.save();
    const m = cx.getTransform(), sc = Math.max(1, Math.hypot(m.a, m.b)), pad = H * .08, bw = rx * 2.4 + pad * 2, bh = ry * 2.4 + pad * 2, sh = document.createElement('canvas');
    sh.width = Math.ceil(bw * sc); sh.height = Math.ceil(bh * sc); const s = sh.getContext('2d'); s.setTransform(sc, 0, 0, sc, (bw / 2 - sx) * sc, (bh / 2 - sy) * sc);
    s.filter = 'blur(' + (Math.max(1.5, H * .025) * sc).toFixed(1) + 'px)'; s.fillStyle = '#26341c';
    s.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + r(), px = sx + Math.cos(a) * rx * .55, py = sy + Math.sin(a) * ry * .5; s.moveTo(px + rx * .5, py); s.ellipse(px, py, rx * .5, ry * .55, 0, 0, Math.PI * 2); } s.fill();
    // flecks of sun through the leaves
    if (!bare) { s.globalCompositeOperation = 'destination-out'; s.globalAlpha = .55; for (let i = 0; i < 9; i++) { s.beginPath(); s.ellipse(sx + (r() - .5) * rx * 1.3, sy + (r() - .5) * ry * 1.1, H * .02 + r() * H * .02, H * .012 + r() * H * .008, 0, 0, Math.PI * 2); s.fill(); } }
    cx.globalAlpha = bare ? .1 : .3; cx.drawImage(sh, sx - bw / 2, sy - bh / 2, bw, bh); cx.globalAlpha = 1;
    // the contact: dark and tight round the roots (ambient occlusion)
    cx.filter = 'blur(' + Math.max(1, H * .012).toFixed(1) + 'px)';
    cx.globalAlpha = .45; cx.fillStyle = '#1c2614'; cx.beginPath(); cx.ellipse(x + H * .01, y + 1, H * F.girth * 2.6, H * F.girth * .9, 0, 0, Math.PI * 2); cx.fill();
    cx.restore();
  }
  function stats() { return { made, MB: +(bytes / 1048576).toFixed(1), worstMs: Math.round(worstMs), K }; }
  return { canvas, image, groundShadow, stats, species: Object.keys(FORM), K, form: sp => FORM[sp] || FORM.oak };
})();
