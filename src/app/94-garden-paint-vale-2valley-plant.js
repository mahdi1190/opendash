/* Painted vale: Millwater valley's trees and planting (see 94-garden-paint-vale-0kit.js and docs/dev/PAINT_KIT.md).
 * The valley is open farm country after the wood: its trees stand where farm trees stand, each group for a reason.
 *  - Along the river and the mill race: weeping willows and alders on the banks, in loose groups at the bends,
 *    leaning out over the water; old pollard willows in a line along the water meadows' edge.
 *  - Along the field edges (the lanes, the field track, the edges of the plots): hedgerow standards, an oak now and
 *    then with hawthorns between, and bushes of hawthorn and elder at their feet.
 *  - Out in the open fields: one old field oak where the ground rises, never more.
 *  - Under all of them: meadowsweet and rushes at the water's edge, cow parsley and nettles along the hedge foot.
 * Every place comes from the layout (the valley region, its fresh water, its routes, plots, statics, gates and
 * crossings): no cell is named here, so the planting follows the layout when it is redesigned.
 * Sizes from the size standard (gardenSizePx). Trees are standing things of the vale kit: a sprite each with its own
 * shadow along the one light, a crown that fades when you stand under it, and a trunk foot that walking stops at
 * (GardenPaintVale.feet, 94-garden-world-0walk.js). Low planting is painted into the vale's ground layer (no frame cost).
 * Only rendering and the trunk feet: cells, plots and saved rows are untouched. Nothing runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const REGION = 'east-mill';
  // The valley's trees are all planted here now (round 2). The woods painter (94-garden-paint-wood-0core.js, loaded after
  // this file) used to plant a few library willows and birches on the valley's banks as a 'meadow' wood; they did not match
  // the tree kit and one stood in a field's hedge. Its entry is taken out once the whole script has loaded, before any
  // painting, so it neither paints nor blocks walking there (its trunks() and thickets follow its own table).
  setTimeout(() => { const G = window.GardenPaintWood; if (G && G.WOODS && G.WOODS[REGION] && G.WOODS[REGION].mood === 'meadow') delete G.WOODS[REGION]; }, 0);
  const inRegion = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x, y) : null; return !!(r && (r.id === REGION || r.theme === 'valley')); };

  /* ---------- the valley's own willows (the shared tree kit has none) ---------- */
  const WILLOW = {
    summer: ['#26402e', '#3c5c40', '#587a52', '#7e9c6c', '#a8c092'], spring: ['#30522e', '#4c7442', '#6c9a5a', '#94bc7a', '#c2dca2'],
    autumn: ['#46462a', '#686630', '#928a40', '#bcae5e', '#dcd08e'], winter: ['#5a4426', '#80602e', '#a8843c', '#cca456', '#e6c47a'],
  };
  const WBARK = ['#2e2620', '#4a3e32', '#6a5a48', '#8e7c64'];
  const mixC = (a, b, t) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), c = (x, y) => Math.max(0, Math.min(255, Math.round(x + (y - x) * t))); return '#' + ((1 << 24) + (c(p >> 16, q >> 16) << 16) + (c((p >> 8) & 255, (q >> 8) & 255) << 8) + c(p & 255, q & 255)).toString(16).slice(1); };
  /** A weeping willow, foot at (0, 0), H tall: a short leaning bole that forks, limbs arching up into a dome, and the
   *  curtain of hanging strands falling from them nearly to the grass, the sky showing between the strands. Lit from the
   *  upper left: the strands on the sunny side are pale silver-green, the far side and the inside deep. */
  function weeping(cx, r, H, season, v) {
    const C = WILLOW[season] || WILLOW.summer, bare = season === 'winter', lean = ((v % 3) - 1) * .05 + (r() - .5) * .03;
    const tw = H * .05, fork = -H * .3, fx = lean * H * .3, ccx = fx + lean * H * .25, ccy = -H * .66, rx = H * .4, ry = H * .27;
    // the back of the curtain: strands on the far side, in shade
    const strand = (ax, ay, len, w, col, a) => {
      const out = (ax - ccx) / rx, ex = ax + out * H * .07 + (r() - .5) * H * .025, ey = Math.min(-H * .05 - r() * H * .05, ay + len);
      cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(ax, ay);
      cx.bezierCurveTo(ax + out * H * .06, ay - H * .03, ex - out * H * .01, ay + (ey - ay) * .45, ex, ey); cx.stroke();
      if (a > .8) { cx.globalAlpha = a * .55; cx.strokeStyle = mixC(col, '#e8eed8', .3); cx.lineWidth = w * .55; cx.setLineDash([H * .012, H * .02]); cx.beginPath(); cx.moveTo(ax - w * .3, ay); cx.bezierCurveTo(ax + out * H * .06 - w * .3, ay - H * .03, ex - out * H * .01 - w * .3, ay + (ey - ay) * .45, ex - w * .3, ey); cx.stroke(); cx.setLineDash([]); }
      return { ex, ey };
    };
    cx.lineCap = 'round';
    if (!bare) { // a soft body behind the strands, broken so the sky shows through
      cx.globalAlpha = .55; cx.fillStyle = C[0];
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i / 6 * .9), x = ccx + Math.cos(a) * rx * .55, y = ccy + Math.sin(a) * ry * .45 + H * .06; cx.beginPath(); cx.ellipse(x, y, rx * (.32 + r() * .1), H * (.22 + r() * .08), 0, 0, Math.PI * 2); cx.fill(); }
    }
    const N = Math.round(70 + H * .4);
    for (let i = 0; i < N; i++) { const u = r(), a = Math.PI * (1.04 + u * .92), k = .5 + r() * .45, ax = ccx + Math.cos(a) * rx * k, ay = ccy + Math.sin(a) * ry * k + H * .04; strand(ax, ay, H * (.38 + r() * .26), H * (.013 + r() * .006), bare ? C[1] : C[1 + (r() < .4 ? 1 : 0)], bare ? .7 : .9); }
    // the bole: thick, short, fissured, flaring into roots, lit on its left
    const g = cx.createLinearGradient(-tw * 2, 0, tw * 2, 0); g.addColorStop(0, WBARK[3]); g.addColorStop(.35, WBARK[2]); g.addColorStop(.75, WBARK[1]); g.addColorStop(1, WBARK[0]);
    cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.moveTo(-tw * 2.3, 1.5);
    cx.quadraticCurveTo(-tw * 1.1, -tw * .6, -tw * 1.05 + fx * .4, fork * .55); cx.quadraticCurveTo(-tw * .9 + fx * .8, fork * .9, fx - tw * 1.4, fork - tw * .8);
    cx.lineTo(fx + tw * 1.3, fork - tw * .6); cx.quadraticCurveTo(tw * 1 + fx * .8, fork * .85, tw * 1.1 + fx * .4, fork * .5);
    cx.quadraticCurveTo(tw * 1.2, -tw * .5, tw * 2.5, 1.5); cx.quadraticCurveTo(0, 3.2, -tw * 2.3, 1.5); cx.fill();
    cx.strokeStyle = WBARK[0]; cx.lineWidth = Math.max(.6, tw * .12); cx.globalAlpha = .55;
    for (let i = 0; i < 5; i++) { const x0 = (r() - .5) * tw * 1.4; cx.beginPath(); cx.moveTo(x0, -1); cx.quadraticCurveTo(x0 + fx * .3 + (r() - .5) * tw * .5, fork * .5, x0 * .7 + fx * .9, fork * (.8 + r() * .15)); cx.stroke(); }
    // the limbs, arching up and out into the crown (seen through the strands)
    cx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { const t = i / 3 - .5, ex = ccx + t * rx * 1.5, ey = ccy - ry * (.75 - Math.abs(t) * .7); cx.strokeStyle = WBARK[i < 2 ? 2 : 1]; cx.lineWidth = tw * (.9 - Math.abs(t) * .5); cx.beginPath(); cx.moveTo(fx + t * tw, fork); cx.quadraticCurveTo(fx + t * rx * .5, fork - H * .2, ex, ey); cx.stroke(); }
    // the front of the curtain, the sunny side paler; then a fringe of leaf flecks on the lit edge
    for (let i = 0; i < N * 1.5; i++) {
      const u = r(), a = Math.PI * (1.02 + u * .96), k = .7 + r() * .38, ax = ccx + Math.cos(a) * rx * k, ay = ccy + Math.sin(a) * ry * k + H * .02;
      const lit = -(ax - ccx) / rx * .55 - (ay - ccy) / ry * .6 + (r() - .5) * .5, col = bare ? C[lit > .2 ? 4 : lit > -.2 ? 3 : 2] : C[lit > .45 ? 4 : lit > .05 ? 3 : lit > -.35 ? 2 : 1];
      const e = strand(ax, ay, H * (.3 + r() * .32) * (1 - Math.abs(u - .5) * .4), H * (.008 + r() * .006), col, bare ? .85 : .95);
      if (!bare && r() < .55) { cx.globalAlpha = .9; cx.fillStyle = C[Math.min(4, (lit > .2 ? 4 : 3))]; cx.beginPath(); cx.ellipse(e.ex, e.ey - H * .01, H * .009, H * .022, 0, 0, Math.PI * 2); cx.fill(); }
    }
    // the crown's top, catching the sun
    if (!bare) { cx.globalAlpha = .8; cx.strokeStyle = C[4]; cx.lineWidth = H * .012; for (let i = 0; i < 18; i++) { const a = Math.PI * (1.08 + r() * .5), ax = ccx + Math.cos(a) * rx * (.55 + r() * .4), ay = ccy + Math.sin(a) * ry * (.7 + r() * .3); cx.beginPath(); cx.moveTo(ax, ay); cx.quadraticCurveTo(ax - H * .03, ay - H * .02, ax - H * .05, ay + H * .07); cx.stroke(); } }
    cx.globalAlpha = 1;
  }
  /** An old pollard willow, foot at (0, 0), H tall: a squat gnarled trunk cut at head height long ago, a knuckled head,
   *  and from it a round mop of slender wands, their narrow silver-green leaves in soft clumps, the outer wands bowing out
   *  (bare golden-orange wands in winter). Lit from the upper left. */
  function pollard(cx, r, H, season) {
    // (round 2: the first pollard was a fan of separate wands on a thin stem and read as a palm. A pollard is a stout, squat
    //  bole with a swollen knuckled head at about head height, and on it one dense rounded crown of straight young poles,
    //  upright in the middle and bowing out at the sides, in narrow silver-green leaves: a big soft ball on a fat post.)
    const C = WILLOW[season] || WILLOW.summer, bare = season === 'winter', th = H * .36, tw = H * .068, hy = -th - tw * .5;
    const mx = (r() - .5) * H * .04, my = -H * .63, mrx = H * .48, mry = H * .33;   // (round 3: its lower edge comes down over the head; it sat on it like a lid)
    cx.lineCap = 'round';
    // one leaf mass: a lumpy union of small rounds (its leafy edge), filled once
    const mass = (x, y, rx, ry, col, a) => { cx.globalAlpha = a; cx.fillStyle = col; cx.beginPath(); cx.ellipse(x, y, rx * .78, ry * .78, 0, 0, Math.PI * 2); const n = 9 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2 + r() * .3, px = x + Math.cos(t) * rx * .62, py = y + Math.sin(t) * ry * .62, q = Math.min(rx, ry) * (.34 + r() * .14); cx.moveTo(px + q, py); cx.arc(px, py, q, 0, Math.PI * 2); } cx.fill(); };
    const leaf = (x, y, ang, len, col, a) => { cx.globalAlpha = a; cx.fillStyle = col; cx.beginPath(); cx.ellipse(x, y, len, len * .26, ang, 0, Math.PI * 2); cx.fill(); };
    // the poles: from the head, straight and upright in the middle, leaning out at the sides
    const poles = [];
    for (let i = 0; i < 46; i++) { const u = (r() - .5) * 2, x0 = u * tw * 1.3 + (r() - .5) * tw * .4, lean = u * .95 + (r() - .5) * .25, len = H * (.42 + r() * .2) * (1 - Math.abs(u) * .3); poles.push({ x0, y0: hy - r() * tw * .3, ex: x0 + Math.sin(lean) * len, ey: hy - Math.cos(lean) * len * .92, u }); }
    if (bare) {
      // winter: the bare poles themselves, golden at the tips and red-brown at the foot, a broom of them
      for (const p of poles.sort((a, b) => b.u - a.u)) { const g = cx.createLinearGradient(p.x0, p.y0, p.ex, p.ey); g.addColorStop(0, '#6e3e22'); g.addColorStop(.5, p.u < 0 ? '#c27a34' : '#9a5a2c'); g.addColorStop(1, p.u < 0 ? '#e8b25a' : '#c8883e'); cx.globalAlpha = .95; cx.strokeStyle = g; cx.lineWidth = Math.max(.8, H * .012); cx.beginPath(); cx.moveTo(p.x0, p.y0); cx.quadraticCurveTo(p.x0 + (p.ex - p.x0) * .35, p.y0 + (p.ey - p.y0) * .6, p.ex, p.ey); cx.stroke(); }
    } else {
      // the crown: a deep core, shaded masses low and right, the body, then lit caps up and left (one light)
      mass(mx + mrx * .08, my + mry * .12, mrx * .92, mry * .9, C[0], 1);
      for (let i = 0; i < 8; i++) { const a = Math.PI * (-.1 + i / 7 * 1.2), x = mx + Math.cos(a) * mrx * (.4 + r() * .2), y = my + Math.sin(a) * mry * (.3 + r() * .15) + mry * .1; mass(x, y, mrx * (.38 + r() * .14), mry * (.38 + r() * .14), C[1], 1); }
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1 + i / 8) + (r() - .5) * .3, k = .35 + r() * .3, x = mx + Math.cos(a) * mrx * k - mrx * .06, y = my + Math.sin(a) * mry * k * .9; mass(x, y, mrx * (.36 + r() * .1), mry * (.36 + r() * .1), C[2], 1); }
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + i / 6 * .55) + (r() - .5) * .25, k = .5 + r() * .25, x = mx + Math.cos(a) * mrx * k - mrx * .08, y = my + Math.sin(a) * mry * k - mry * .05; mass(x, y, mrx * (.22 + r() * .06), mry * (.2 + r() * .06), C[3], .95); if (r() < .7) mass(x - mrx * .05, y - mry * .06, mrx * .12, mry * .1, C[4], .9); }
      // the poles show through the crown's lower edge and stand out of its top as wisps
      for (const p of poles) { if (r() < .55) continue; cx.globalAlpha = .55; cx.strokeStyle = '#4e4a2e'; cx.lineWidth = Math.max(.6, H * .008); cx.beginPath(); cx.moveTo(p.x0, p.y0); cx.lineTo(p.x0 + (p.ex - p.x0) * .45, p.y0 + (p.ey - p.y0) * .45); cx.stroke(); }
      // narrow willow leaves all over its face, silver on the sunny side, and in wisps past its edge
      for (let i = 0; i < 260; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = mx + Math.cos(a) * mrx * d * 1.02, y = my + Math.sin(a) * mry * d * 1.02, lit = -(x - mx) / mrx * .6 - (y - my) / mry * .7 + (r() - .5) * .5;
        const ang = Math.atan2(y - hy, x) + Math.PI / 2 + (r() - .5) * .7; leaf(x, y, ang, H * (.022 + r() * .012), C[lit > .55 ? 4 : lit > .15 ? 3 : lit > -.3 ? 2 : 1], .92);
      }
      for (const p of poles) if (p.ey < my - mry * .55 || Math.abs(p.ex) > mrx * .85) { const tip = { x: p.ex, y: p.ey }; cx.globalAlpha = .85; cx.strokeStyle = '#5e5a36'; cx.lineWidth = Math.max(.6, H * .007); cx.beginPath(); cx.moveTo(p.x0 + (p.ex - p.x0) * .7, p.y0 + (p.ey - p.y0) * .7); cx.lineTo(tip.x, tip.y); cx.stroke(); for (let k = 0; k < 4; k++) { const t = .74 + k * .07, px = p.x0 + (p.ex - p.x0) * t, py = p.y0 + (p.ey - p.y0) * t, lit = -p.ex / mrx * .5 + .3; leaf(px + (k % 2 ? 1 : -1) * H * .012, py, Math.atan2(p.ey - p.y0, p.ex - p.x0) + (k % 2 ? .5 : -.5), H * .022, C[lit > .3 ? 4 : 3], .9); } }
    }
    // the bole: squat and fat, wider at the head than the waist, fissured, a dark hollow on its shaded side, roots in the grass
    const g = cx.createLinearGradient(-tw * 1.8, 0, tw * 1.8, 0); g.addColorStop(0, WBARK[3]); g.addColorStop(.38, WBARK[2]); g.addColorStop(.78, WBARK[1]); g.addColorStop(1, WBARK[0]);
    cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.moveTo(-tw * 2.1, 1.5); cx.quadraticCurveTo(-tw * 1.1, -tw * .5, -tw * 1.15, -th * .45); cx.quadraticCurveTo(-tw * 1.25, -th * .8, -tw * 1.75, -th - tw * .2); cx.quadraticCurveTo(-tw * 1.2, -th - tw * 1.1, 0, -th - tw * 1.05);
    cx.quadraticCurveTo(tw * 1.3, -th - tw * 1.1, tw * 1.8, -th - tw * .1); cx.quadraticCurveTo(tw * 1.3, -th * .8, tw * 1.2, -th * .45); cx.quadraticCurveTo(tw * 1.2, -tw * .5, tw * 2.3, 1.5); cx.quadraticCurveTo(0, 3.4, -tw * 2.1, 1.5); cx.fill();
    cx.globalAlpha = .65; cx.fillStyle = WBARK[0]; cx.beginPath(); cx.ellipse(tw * .5, -th * .55, tw * .34, th * .17, .08, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = WBARK[0]; cx.lineWidth = Math.max(.6, tw * .13); cx.globalAlpha = .55; for (let i = 0; i < 6; i++) { const x0 = (r() - .55) * tw * 1.8; cx.beginPath(); cx.moveTo(x0, 0); cx.quadraticCurveTo(x0 + (r() - .5) * tw * .8, -th * .5, x0 * .8, -th * (.8 + r() * .15)); cx.stroke(); }
    cx.globalAlpha = .5; cx.strokeStyle = WBARK[3]; cx.lineWidth = Math.max(.5, tw * .1); for (let i = 0; i < 3; i++) { const x0 = -tw * (.9 + r() * .3); cx.beginPath(); cx.moveTo(x0, -th * (.1 + i * .25)); cx.lineTo(x0 + tw * .1, -th * (.25 + i * .25)); cx.stroke(); }
    // the knuckled head where it has been cut for a hundred years, lit on top, the poles springing from it
    for (let i = 0; i < 9; i++) { const x = (i / 8 - .5) * tw * 3.4 + (r() - .5) * tw * .4, y = -th - tw * (.35 + r() * .6) + Math.abs(i / 8 - .5) * tw * .8; cx.globalAlpha = 1; cx.fillStyle = WBARK[i < 4 ? 2 : 1]; cx.beginPath(); cx.ellipse(x, y, tw * (.5 + r() * .25), tw * (.38 + r() * .2), (r() - .5) * .6, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = .6; cx.fillStyle = WBARK[3]; cx.beginPath(); cx.ellipse(x - tw * .14, y - tw * .15, tw * .24, tw * .13, 0, 0, Math.PI * 2); cx.fill(); }
    // the cut stubs of old poles, and young poles springing from the head into the crown (so it grows from the head)
    for (let i = 0; i < 7; i++) { const x = (r() - .5) * tw * 3, l = tw * (.6 + r() * .8); cx.globalAlpha = 1; cx.strokeStyle = WBARK[r() < .5 ? 1 : 2]; cx.lineWidth = Math.max(.8, tw * .28); cx.beginPath(); cx.moveTo(x, -th - tw * .5); cx.lineTo(x + (r() - .5) * tw * .6, -th - tw * .5 - l); cx.stroke(); }
    if (!bare) for (let i = 0; i < 12; i++) { const x = (r() - .5) * tw * 2.8, lean = x / tw * .12; cx.globalAlpha = .9; cx.strokeStyle = '#5e5a36'; cx.lineWidth = Math.max(.6, H * .009); cx.beginPath(); cx.moveTo(x, -th - tw * .7); cx.lineTo(x + lean * H * .3, -th - H * .2); cx.stroke(); }
    // a skirt of leafy poles low over the head, so the crown sits on the bole and does not float
    if (!bare) for (let i = 0; i < 16; i++) { const u = (r() - .5) * 2, x = u * tw * 2.2, y = hy - tw * (.6 + r() * 1.4); leaf(x, y, Math.PI / 2 + u * .6 + (r() - .5) * .5, H * (.026 + r() * .01), C[u < 0 ? 3 : 1], .95); }
    cx.globalAlpha = 1;
  }

  /* ---------- gentle motion: swallows and mist ---------- */
  // Textures made once a scene, small: a swallow in three wing beats (24 x 14 px, drawn at 3x and shown at a third), and one
  // soft mist wisp (256 x 80). Each frame only moves a few images (16 wisps at most, 9 swallows), and only while they show.
  function lifeTextures(scene) {
    const T = scene.textures, mk = (key, w, h, draw) => { if (T.exists(key)) return; const t = T.createCanvas(key, w, h); if (!t) return; draw(t.context, w, h); t.refresh(); };
    for (let f = 0; f < 3; f++) mk('gpv-swallow-' + f, 72, 42, (c) => {
      c.translate(36, 21); c.scale(3, 3); c.lineCap = 'round'; c.lineJoin = 'round';
      const wing = [[-9, -6], [-10, 4], [-8, 1.5]][f];   // up, down, swept (a glide)
      c.fillStyle = '#26304a';
      for (const sy of [1, -1]) { if (f !== 2 && sy < 0) continue; c.beginPath(); c.moveTo(1.5, 0); c.quadraticCurveTo(-1, wing[1] * .35 * sy - (f === 0 ? 2 : 0), wing[0], wing[1] * sy); c.quadraticCurveTo(-1.5, wing[1] * .2 * sy + 1, -2.5, .4 * sy); c.closePath(); c.fill(); }
      if (f !== 2) { c.beginPath(); c.moveTo(1, 0); c.quadraticCurveTo(-2, -wing[1] * .3 + (f === 0 ? -1 : 1), wing[0] * .7, -wing[1] * .45 + (f === 0 ? -2 : 2)); c.quadraticCurveTo(-2, .5, -2, .5); c.closePath(); c.globalAlpha = .75; c.fill(); c.globalAlpha = 1; }
      c.beginPath(); c.ellipse(.5, 0, 3.4, 1.3, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#26304a'; c.lineWidth = .7; c.beginPath(); c.moveTo(-2.5, 0); c.lineTo(-7, -1.6); c.moveTo(-2.5, 0); c.lineTo(-7, 1.6); c.stroke();
      c.fillStyle = '#a8442e'; c.beginPath(); c.arc(3.4, .2, .7, 0, Math.PI * 2); c.fill();   // the red throat
      c.fillStyle = '#e8e2d4'; c.beginPath(); c.ellipse(.2, .6, 1.6, .5, 0, 0, Math.PI * 2); c.fill();   // the pale belly
    });
    mk('gpv-glow', 24, 24, c => { const g = c.createRadialGradient(12, 12, 0, 12, 12, 12); g.addColorStop(0, 'rgba(240,255,170,1)'); g.addColorStop(.18, 'rgba(210,250,110,.9)'); g.addColorStop(.5, 'rgba(160,230,80,.28)'); g.addColorStop(1, 'rgba(140,220,60,0)'); c.fillStyle = g; c.fillRect(0, 0, 24, 24); });
    // (round 3: the wisp's puffs once ran off the texture's sides, so each wisp was a band with hard ends, a searchlight
    //  beam over the river. Every puff now fades out well inside the picture, and the wisp is a loose row of small puffs.)
    mk('gpv-mist', 384, 128, (c, w, h) => {
      const r = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(9157);
      for (let i = 0; i < 14; i++) { const u = i / 13, x = 92 + u * 200 + (r() - .5) * 30, y = 58 + Math.sin(u * 5.2) * 10 + (r() - .5) * 12, rx = (30 + r() * 34) * (1 - Math.abs(u - .5) * .8), ry = rx * (.36 + r() * .2), g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, 'rgba(236,240,246,.34)'); g.addColorStop(.5, 'rgba(230,236,244,.16)'); g.addColorStop(1, 'rgba(228,234,242,0)'); c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, Math.PI * 2); c.fill(); c.restore(); }
    });
  }
  function life(scene, o) {
    if (!scene || !scene.add || !scene.textures || !scene.events) return null;
    V.ok(() => lifeTextures(scene));
    const box = scene.add.container(0, 0), cam = scene.cameras && scene.cameras.main;
    const calm = (() => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } })();
    const birds = [], wisps = [], glows = [];
    for (const q of o.glowAt || []) { const im = scene.add.image(q.x, q.y, 'gpv-glow').setVisible(false).setScale(.75).setBlendMode(1); box.add(im); glows.push({ im, p: (q.seed % 1000) / 160, sp: .25 + (q.seed % 7) / 30 }); }
    for (const [gi, g] of (o.flyAt || []).entries()) for (let i = 0; i < (gi ? 4 : 5); i++) {
      const im = scene.add.image(g.x, g.y, 'gpv-swallow-0').setScale(.26).setVisible(false); box.add(im);
      const k = gi * 7 + i; birds.push({ im, cx: g.x + (i - 2) * 30, cy: g.y + ((k * 37) % 5 - 2) * 14, ax: 150 + (k * 53) % 90, ay: 52 + (k * 29) % 34, w: .42 + ((k * 17) % 10) / 40, p: k * 1.7, p2: k * 2.9, lift: 34 + (k * 23) % 40 });
    }
    for (const m of o.mistAt || []) { const im = scene.add.image(m.x, m.y, 'gpv-mist').setVisible(false).setAlpha(0); const k = m.seed % 1000; im.setScale(1.1 + (k % 7) / 9, 1 + (k % 5) / 8); box.add(im); wisps.push({ im, x: m.x, y: m.y, p: (k % 97) / 15, sp: 5 + k % 6, span: 46 + k % 40 }); }
    let light = 1, lastLight = -1e9, t0 = null;
    const upd = (time) => {
      if (!box.active) return;
      if (t0 == null) t0 = time;
      const t = (time - t0) / 1000;
      if (time - lastLight > 500) { lastLight = time; const env = window.GardenNativeArt && GardenNativeArt.environment ? V.ok(() => GardenNativeArt.environment()) : null; light = env && typeof env.daylight === 'number' ? env.daylight : 1; }
      const v = cam ? cam.worldView : null, inView = (x, y, m) => !v || (x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m);
      // swallows: out in good daylight only; a wandering loop each, low over the ground, wings beating, gliding on the turns
      const fly = light > .55 && !calm;
      for (const b of birds) {
        const x = b.cx + Math.sin(t * b.w + b.p) * b.ax + Math.sin(t * b.w * 2.3 + b.p2) * b.ax * .25, y = b.cy + Math.sin(t * b.w * 1.7 + b.p2) * b.ay;
        const show = fly && inView(x, y, 80); if (b.im.visible !== show) b.im.setVisible(show); if (!show) continue;
        const vx = Math.cos(t * b.w + b.p) * b.w * b.ax + Math.cos(t * b.w * 2.3 + b.p2) * b.w * 2.3 * b.ax * .25, vy = Math.cos(t * b.w * 1.7 + b.p2) * b.w * 1.7 * b.ay;
        const lift = b.lift + Math.sin(t * .9 + b.p) * 16, f = Math.abs(vy) > Math.abs(vx) * .9 ? 2 : Math.floor(t * 11 + b.p * 3) % 3 === 2 ? 2 : Math.floor(t * 11 + b.p * 3) % 2;
        b.im.setPosition(x, y - lift).setTexture('gpv-swallow-' + f).setFlipX(vx < 0).setRotation(Math.atan2(vy, Math.abs(vx)) * (vx < 0 ? -.5 : .5));
      }
      // mist: from the turning hour to the morning, thickest in the small hours, drifting slowly downwind and breathing
      const mist = Math.max(0, Math.min(1, (.44 - light) / .34));
      for (const w of wisps) {
        const a = mist * (.62 + .2 * Math.sin(t * .11 + w.p)), x = w.x + Math.sin(t * w.sp / 60 + w.p) * w.span, show = a > .01 && inView(x, w.y, 200);
        if (w.im.visible !== show) w.im.setVisible(show); if (!show) continue;
        w.im.setPosition(x, w.y + Math.sin(t * .07 + w.p) * 4).setAlpha(a);
      }
      // glow-worms in the hedge foot and the bank grass on summer nights, each glowing and fading on its own slow breath
      const dark = Math.max(0, Math.min(1, (.25 - light) / .2));
      for (const g of glows) { const a = dark * Math.max(0, Math.sin(t * g.sp + g.p) * .6 + .5), show = a > .02 && inView(g.im.x, g.im.y, 20); if (g.im.visible !== show) g.im.setVisible(show); if (show) g.im.setAlpha(Math.min(1, a)); }
    };
    scene.events.on('update', upd);
    box.once('destroy', () => scene.events.off('update', upd));
    return box;
  }

  /* ---------- where things stand ---------- */
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function' || !window.GardenPaintTrees || typeof gardenSizePx !== 'function') return;
    const { L, W, kit, season, thing, add } = C, cw = W.cellW, ch = W.cellH, D = L.D;
    const region = (D.regions || []).find(r => r.id === REGION); if (!region) return;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const p of region.polygons) for (const [x, y] of p) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
    bx0 = Math.max(0, Math.floor(bx0)); by0 = Math.max(0, Math.floor(by0)); bx1 = Math.min(W.cols - 1, Math.ceil(bx1)); by1 = Math.min(W.rows - 1, Math.ceil(by1));
    const base = (x, y) => gardenIslandBaseCell(x, y), row = (x, y) => gardenLandCell(x, y);
    const wet = (x, y) => { const b = base(x, y); return !b || !b.land || !!b.freshwater || L.kind(x + .5, y + .5) === 'water'; };
    const fresh = (x, y) => { const b = base(x, y); return !!(b && b.freshwater) || L.kind(x + .5, y + .5) === 'water'; };
    const plotAt = (x, y) => { const rw = row(x, y); return !!(rw && rw.plot); };
    const pathAt = (x, y) => { const rw = row(x, y); return !!(rw && (rw.trail || rw.lane)) || L.mat(x, y) === 'path'; };
    // every route's painted ribbon, in world px: nothing stands on a path's width
    const ribbons = [];
    for (const rt of D.routes || []) {
      if (!rt.points || rt.points.length < 2 || typeof gardenIslandRoutePath !== 'function') continue;
      const kind = window.GardenPaintGround ? GardenPaintGround.routeKind(rt) : 'earth', w = rt.tier === 'plaza' ? (Number(rt.widthCells) || 3) * cw : Number(rt.paintWidth) || (window.GardenPaintGround && GardenPaintGround.ROUTE_WIDTH[kind]) || 26;
      ribbons.push({ half: w / 2, marsh: /marsh|reed|boardwalk/.test(String(rt.id || '')), pts: gardenIslandRoutePath(rt).points.map(p => ({ x: p.x * cw, y: W.sky + p.y * ch })) });
    }
    const pathGap = (X, Y) => { let best = Infinity; for (const rb of ribbons) for (let i = 1; i < rb.pts.length; i++) { const a = rb.pts[i - 1], b = rb.pts[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / l)), d = Math.hypot(X - a.x - dx * t, Y - a.y - dy * t) - rb.half; if (d < best) best = d; } return best; };
    // statics with their aprons (and the four rows in front of them, where a crown would hide them), gates, crossings
    const statics = D.static || [], held = new Set(), screened = new Set();
    for (const s of statics) for (const b of [s, s.apron].filter(Boolean)) {
      for (let y = Math.floor(b.y) - 1; y <= b.y + (b.h || 1); y++) for (let x = Math.floor(b.x) - 1; x <= b.x + (b.w || 1); x++) held.add(x + ',' + y);
      for (let y = Math.floor(b.y + (b.h || 1)); y <= b.y + (b.h || 1) + 4; y++) for (let x = Math.floor(b.x) - 2; x <= b.x + (b.w || 1) + 1; x++) screened.add(x + ',' + y);
    }
    const gates = D.gates || [], byGate = (x, y) => gates.some(g => Math.abs(x - g.x) <= 3.5 && y - g.y >= -2.5 && y - g.y <= 5.5);
    const crossings = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [], crossPts = [];
    for (const c of crossings) for (const p of c.points || []) crossPts.push(p);
    for (const c of (D.presentation || {}).crossings || []) crossPts.push({ x: c.x, y: c.y });
    const byCrossing = (x, y) => crossPts.some(p => Math.abs(x - p.x) < 2.6 && y - p.y > -2 && y - p.y < 4.5);
    const finds = typeof GARDEN_GATE_FINDS !== 'undefined' && typeof gardenGateFindPoint === 'function' ? GARDEN_GATE_FINDS.map(f => gardenGateFindPoint(f)).filter(Boolean) : [], byFind = (x, y) => finds.some(q => Math.abs(x - q.x) <= 2.5 && y - q.y >= -1 && y - q.y <= 3.5);
    // the trees the woods painter already plants on the valley's banks (94-garden-paint-wood-0core.js): keep clear of them
    const woodFeet = []; { const t = window.GardenPaintWood && GardenPaintWood.trunks ? V.ok(() => GardenPaintWood.trunks()) : null; if (t && t.list) for (const b of t.list) woodFeet.push({ x: (b.x0 + b.x1) / 2, y: b.y1 }); }
    const near = (x, y, rad, test) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (test(x + dx, y + dy)) return true; return false; };
    const distTo = (x, y, rad, test) => { let best = 99; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (test(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy)); return best; };
    const N = (x, y, s, k) => kit.noise(x / s, y / s, k);

    // 1. what each free cell of the valley is: a bank, a field edge, or open field
    const cand = [], why = {};
    const map = {}, no = (k, x, y) => { why[k] = (why[k] || 0) + 1; };
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!inRegion(x + .5, y + .5)) continue;
      const b = base(x, y), rw = row(x, y);
      if (!b || !b.land || b.beach || b.freshwater || b.solid || b.reserved || b.ocean || L.kind(x + .5, y + .5) !== 'grass') { no('ground'); continue; }
      if (rw && (rw.plot || rw.trail || rw.lane || rw.solid)) { no('row'); continue; }
      const k = x + ',' + y; if (held.has(k) || screened.has(k) || byGate(x, y) || byCrossing(x, y) || byFind(x, y)) { no('kept'); continue; }
      const shore = near(x, y, 1, (a, c) => { const bb = base(a, c); return !!(bb && (bb.beach || bb.ocean || !bb.land && !bb.freshwater)); });   // (at the beach's top only a low wind-cut thorn)
      // a crown rises about four rows up the screen: nothing just in front of (south of) a plot, so a plot and its sign stay in view
      // (a small tree, a hawthorn or a pollard, may stand at a plot's side; a big one keeps a column clear and three rows)
      const overPlot = plotAt(x, y - 1), bigOver = overPlot || shore || plotAt(x - 1, y - 1) || plotAt(x + 1, y - 1) || near(x, y - 2, 1, plotAt) || plotAt(x, y - 3) || plotAt(x - 1, y) || plotAt(x + 1, y);
      if (overPlot) { no('plot'); continue; }
      const dw = distTo(x, y, 3, fresh), dp = distTo(x, y, 2, (a, c) => pathAt(a, c) || plotAt(a, c));
      const kind = dw <= 2.3 ? 'bank' : dp <= 1.5 ? 'edge' : 'field';
      // a wall's face hangs below its line: no trunk at its foot, no crown standing up over it (the terrace wall, the scarp; a willow
      // at the river, where the wall ends, leans clear of it)
      if (kind !== 'bank' && (near(x, y - 1, 1, (a, c) => { const bb = base(a, c); return !!(bb && bb.solid); }) || near(x, y - 2, 1, (a, c) => { const bb = base(a, c); return !!(bb && bb.solid); })) ) { no('wall'); continue; }
      // (round 3: beside a wet wood's field, the alder carr and the otter run, every free cell may carry an alder, close set, so the wood stands round its field)
      const carr = near(x, y, 1, (a, c) => { const q = row(a, c); return !!(q && q.plot && /carr|alder|otter/.test(String(q.id || ''))); });
      cand.push({ x, y, kind, dw, small: shore, carr, score: (carr ? -1 : 0) + kit.hash(x, y, 811) / 4294967296 });
    }
    // 2. choose, best first, keeping each kind's own spacing and clear of paths, other trees and the woods' trees
    const trees = [];
    // a crown's box over its foot, in world px, by species (the willow's curtain hangs nearly to the grass)
    // (its solid middle: the thin leafy rim may lean over a hedge's far edge, as a hedgerow tree's does, but never its body)
    const crownBox = (sp, H) => { if (sp === 'willow') return [-.42 * H, -.95 * H, .42 * H, -.3 * H]; if (sp === 'pollard') return [-.36 * H, -.95 * H, .36 * H, -.42 * H]; const f = GardenPaintTrees.form(sp); return [-f.rx * .75 * H, -(f.cy + f.ry * .8) * H, f.rx * .75 * H, -(f.cy - f.ry * .5) * H]; };
    // (round 3: an alder beside a wet wood's field may hold its crown over that wood: the carr is meant to stand in its shade)
    const woodPlot = (a, c) => { const q = row(a, c); return !!(q && q.plot && /carr|alder|otter/.test(String(q.id || ''))); };
    const crownHits = (sp, H, X, Y, carr) => { const b = crownBox(sp, H), x0 = Math.floor((X + b[0]) / cw), x1 = Math.floor((X + b[2]) / cw), y0 = Math.floor((Y + b[1] - W.sky) / ch), y1 = Math.floor((Y + b[3] - W.sky) / ch); for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (plotAt(xx, yy) && !(carr && woodPlot(xx, yy))) return true; return false; };
    const spacing = { bank: 1.75, edge: 2.7, field: 9 }, F = sp => GardenPaintTrees.form(sp);
    cand.sort((a, b) => a.score - b.score);
    for (const c of cand) {
      const { x, y, kind } = c;
      // groups, not a scatter: the clustering field decides where a group stands (banks at the bends, hedgerows by stretches)
      const group = N(x, y, kind === 'bank' ? 4.5 : 6, kind === 'bank' ? 3 : 5), roll = kit.hash(x, y, 812) / 4294967296;
      // (round 2: banks are planted most of their length, in groups with a gap now and then; the hedgerows carry a tree in most stretches)
      const want = kind === 'bank' ? (group > .42 ? .97 : group > .28 ? .75 : .35) : kind === 'edge' ? (group > .46 ? .85 : group > .3 ? .55 : .2) : (group > .7 ? .25 : 0);
      if (roll > want && !c.carr) { no('want-' + kind); continue; }
      // the species: what grows there
      const pick = kit.hash(x, y, 813) / 4294967296, meadowSide = N(x, y, 9, 21) > .5;
      let sp, h;
      // (round 2: a tree is chosen for its place first; whether its crown clears the fields round it is tested below, and a
      //  tree that would not is painted narrower or smaller. Only at the top of a beach is it always a small wind-cut thorn.)
      if (c.small) sp = kind === 'bank' ? 'pollard' : pick < .7 ? 'hawthorn' : 'plum';
      else if (kind === 'bank') { sp = c.dw <= 1.5 ? (pick < .55 ? 'willow' : pick < .85 ? 'alder' : meadowSide ? 'pollard' : 'alder') : (pick < .4 ? 'pollard' : pick < .75 ? 'alder' : 'willow'); }
      else if (kind === 'edge') sp = pick < .3 ? 'oak' : pick < .55 ? 'hawthorn' : pick < .68 ? 'cherry' : pick < .8 ? 'alder' : pick < .9 ? 'plum' : 'chestnut';
      else sp = pick < .7 ? 'oak' : 'chestnut';
      // a field named for its trees has them round it (the layout's own names: Far willows, the Alder carr, Walnut shade...)
      { let named = ''; for (let dy = -2; dy <= 2 && !named; dy++) for (let dx = -2; dx <= 2 && !named; dx++) { const rw = row(x + dx, y + dy); if (rw && rw.plot && rw.id) named = String(rw.id); }
        const pick2 = kit.hash(x, y, 829) / 4294967296;
        if (/willow|osier|withy/.test(named)) sp = pick2 < .55 ? 'pollard' : 'willow'; else if (/alder|carr/.test(named)) sp = 'alder'; else if (/cherry/.test(named)) sp = 'cherry'; else if (/apple|orchard/.test(named)) sp = 'apple'; else if (/plum|damson|sloe/.test(named)) sp = 'plum'; else if (/oak/.test(named)) sp = 'oak'; else if (/birch/.test(named)) sp = 'birch'; else if (/thorn|may/.test(named)) sp = 'hawthorn'; }
      const t = kit.hash(x, y, 814) / 4294967296;
      h = sp === 'pollard' ? gardenSizePx('young', .5 + t * .5) : sp === 'hawthorn' || sp === 'cherry' ? gardenSizePx('young', .4 + t * .6) : sp === 'willow' ? gardenSizePx('tree', .15 + t * .5) : sp === 'alder' ? gardenSizePx('tree', .1 + t * .4) : gardenSizePx('tree', kind === 'field' ? .6 + t * .4 : .3 + t * .5);
      h = Math.round(h / 12) * 12;   // (a few heights per species, so trees share pictures)
      const jx = (kit.hash(x, y, 815) / 4294967296 - .5) * .5, jy = (kit.hash(x, y, 816) / 4294967296 - .5) * .3, tx = x + .5 + jx, ty = y + .85 + jy;
      const X = tx * cw, Y = W.sky + ty * ch;
      if (pathGap(X, Y) < (sp === 'pollard' || sp === 'willow' ? 20 : 12)) { no('pathgap'); continue; }   // (round 3: a pollard's fat bole stood on a path's edge)
      // (round 2) nothing overlaps: a crown never stands over a field, its hedge or its sign. A tree whose crown would is
      // painted smaller (a hawthorn by a hedge, a pollard on a bank) if that clears it, and is left out if nothing does.
      if (crownHits(sp, h, X, Y, c.carr)) {
        // first a tall narrow tree (an alder, now and then a birch), then a small one of the hedgerow's mix
        const q = kit.hash(x, y, 828) / 4294967296, R = v => Math.round(v / 12) * 12;
        const chain = kind === 'bank' ? [['alder', R(gardenSizePx('tree', .05 + t * .3))], ['pollard', R(gardenSizePx('young', .5))], ['alder', R(gardenSizePx('young', .9))]]
          : [[q < .8 ? 'alder' : 'birch', R(gardenSizePx('tree', t * .3))], [q < .4 ? 'hawthorn' : q < .6 ? 'cherry' : q < .8 ? 'plum' : 'apple', R(gardenSizePx('young', .2 + t * .4))], ['hawthorn', R(gardenSizePx('young', 0))]];
        const fit = chain.find(([s3, h3]) => !crownHits(s3, h3, X, Y, c.carr)); if (!fit) { no('crown'); continue; } sp = fit[0]; h = fit[1];
      }
      if (wet(Math.floor(tx), Math.floor(ty)) || wet(Math.floor(tx + .3), Math.floor(ty)) || wet(Math.floor(tx - .3), Math.floor(ty))) continue;
      const gap = c.carr ? 1.3 : Math.max(spacing[kind], sp === 'pollard' ? 1.8 : 0);
      if (trees.some(o => Math.hypot(o.x - tx, (o.y - ty) * 1.3) < (c.carr && o.carr ? gap : Math.max(gap, spacing[o.kind] * .8)))) { no('spacing'); continue; }
      if (woodFeet.some(o => Math.hypot(o.x - tx, o.y - ty) < 2.8)) { no('wood'); continue; }
      trees.push({ x: tx, y: ty, kind, sp, h, carr: !!c.carr, v: kit.hash(x, y, 817) % 3, flip: kit.hash(x, y, 818) % 2 === 1, seed: kit.hash(x, y, 819) % 99991 });
    }
    // the open meadows each keep one old field oak, where the most open ground is round it (a field tree, not a scatter)
    const opens = cand.filter(c => c.kind === 'field' && !c.small).map(c => Object.assign({ room: distTo(c.x, c.y, 3, (a, b) => pathAt(a, b) || plotAt(a, b) || held.has(a + ',' + b) || fresh(a, b)) }, c)).filter(c => c.room >= 2).sort((a, b) => b.room - a.room || a.score - b.score);
    for (const c of opens) {
      if (trees.filter(t => t.kind === 'field').length >= 4) break;
      const tx = c.x + .5, ty = c.y + .85;
      if (pathGap(tx * cw, W.sky + ty * ch) < 24 || trees.some(o => Math.hypot(o.x - tx, (o.y - ty) * 1.3) < (o.kind === 'field' ? 9 : 3.6)) || woodFeet.some(o => Math.hypot(o.x - tx, o.y - ty) < 3)) continue;
      const t = kit.hash(c.x, c.y, 824) / 4294967296;
      const fsp = t < .75 ? 'oak' : 'chestnut', fh = Math.round(gardenSizePx('tree', .55 + t * .45) / 12) * 12; if (crownHits(fsp, fh, tx * cw, W.sky + ty * ch)) continue;
      trees.push({ x: tx, y: ty, kind: 'field', sp: fsp, h: fh, v: kit.hash(c.x, c.y, 825) % 3, flip: kit.hash(c.x, c.y, 826) % 2 === 1, seed: kit.hash(c.x, c.y, 827) % 99991 });
    }
    // 3. stand them: a sprite each (shared by species, height and variant), its shadow along the light, its crown fading
    for (const t of trees) {
      const p = { x: t.x * cw, y: W.sky + t.y * ch }, H = t.h, own = t.sp === 'willow' || t.sp === 'pollard';
      let box, crown, half;
      if (t.sp === 'willow') { box = [-H * .62, -H * 1.02, H * .62, 8]; crown = { x: 0, y: -H * .62, rx: H * .42, ry: H * .3 }; half = Math.max(6, H * .06); }
      else if (t.sp === 'pollard') { box = [-H * .62, -H * 1.12, H * .62, 8]; crown = { x: 0, y: -H * .66, rx: H * .48, ry: H * .32 }; half = Math.max(5, H * .1); }
      else { const f = F(t.sp), hw = H * Math.max(f.rx * 1.35, .3) + 6; box = [-hw, -(H * (f.cy + f.ry * 1.25) + 6), hw, 8]; crown = { x: 0, y: -H * f.cy, rx: H * f.rx, ry: H * f.ry }; half = Math.max(4, Math.min(11, H * f.girth * 1.4)); }
      box = box.map(Math.round);
      const key = t.sp + '|' + season + '|' + t.v + '|' + H + '|' + t.seed + (t.flip ? '|f' : '');   // (each tree its own picture: they are few and small, and no two hawthorns stand alike)
      thing({ key, x: p.x, y: p.y, box, K: 1.25, crown: crown && { x: crown.x, y: crown.y, rx: crown.rx, ry: crown.ry }, foot: [-half, half, 7], shade: { a: own ? .3 : .34 }, draw: B => {
        const cx = B.cx, m = cx.getTransform(), sc = Math.hypot(m.a, m.b) || 1, r = kit.rng(kit.hash(t.v + 3, H, t.seed + 31));
        cx.save(); if (t.flip) cx.scale(-1, 1);
        if (t.sp === 'willow') weeping(cx, r, H, season, t.v);
        else if (t.sp === 'pollard') pollard(cx, r, H, season);
        else { const c = GardenPaintTrees.canvas({ species: t.sp, season, v: t.v, h: H, K: Math.min(4, sc), seed: t.seed }); if (c) cx.drawImage(c.c, -c.ox / c.k, -c.oy / c.k, c.c.width / c.k, c.c.height / c.k); }
        cx.restore();
      } });
    }
    V._valleyTrees = { list: trees.map(t => t.sp + '@' + t.x.toFixed(1) + ',' + t.y.toFixed(1) + ':' + t.h).join(' '), trees: trees.length, cand: cand.length, why, kinds: cand.reduce((a, c) => (a[c.kind] = (a[c.kind] || 0) + 1, a), {}) };

    // 4. the low planting at their feet and along the water and the hedge lines, painted into the ground (walked over)
    const lows = [];
    // a low plant stands on open ground only: never on a plot or its fence, a path's cells, a doorway or the water
    const lowOk = (x, y, h) => { const hw = h * .6 / cw; for (const dx of [-hw, 0, hw]) for (const dy of [0, -.45]) { const cx = Math.floor(x + dx), cy = Math.floor(y + dy), b = base(cx, cy); if (!b || !b.land || b.freshwater || b.beach || b.reserved || plotAt(cx, cy) || held.has(cx + ',' + cy)) return false; } return pathGap(x * cw, W.sky + y * ch) > 6; };
    for (const t of trees) {
      const n = t.kind === 'edge' ? 3 : t.kind === 'bank' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = (kit.hash(Math.round(t.x * 10), Math.round(t.y * 10), 820 + i) / 4294967296) * Math.PI * 2, d = .55 + (kit.hash(Math.round(t.x * 10), i, 821) / 4294967296) * .7;
        const x = t.x + Math.cos(a) * d, y = t.y + Math.abs(Math.sin(a)) * d * .4 + .05; if (!lowOk(x, y, 34)) continue;
        const pick = kit.hash(Math.round(x * 10), Math.round(y * 10), 822) % 6;
        const id = t.kind === 'bank' ? ['plant.canal-view-meadowsweet', 'plant.reed', 'plant.canal-view-meadowsweet', 'plant.grass', 'plant.reed', 'plant.wildflowers'][pick] : ['plant.hedge', 'plant.wildflowers', 'plant.hedge', 'plant.bracken', 'plant.grass', 'plant.hedge'][pick];
        lows.push({ id, v: pick % 3, h: id === 'plant.hedge' ? 30 + pick * 3 : id === 'plant.reed' ? 34 + pick * 2 : 20 + pick * 3, x: x * cw, y: W.sky + y * ch });
      }
    }
    // rushes and meadowsweet along the open water's edge between the trees
    for (const c of cand) if (c.kind === 'bank' && c.dw <= 1.5 && kit.hash(c.x, c.y, 830) % 4 === 0) {
      const x = c.x + .5 + (kit.hash(c.x, c.y, 831) / 4294967296 - .5) * .6, y = c.y + .9; if (!lowOk(x, y, 30)) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.y - y) < .9)) continue;
      const pick = kit.hash(c.x, c.y, 832) % 4; lows.push({ id: ['plant.reed', 'plant.canal-view-meadowsweet', 'plant.reed', 'plant.bulrush'][pick], v: pick % 3, h: 30 + pick * 4, x: x * cw, y: W.sky + y * ch });
    }
    // round 3: planting round the valley's sights, from their layout rows, so none stands on bare ground: reeds round the
    // hide and the smokehouse, heather-purple and borage-blue drifts at the bee boles, rushes in the frog stone's hollow,
    // cow parsley at the milk stand, nettles, bracken and bramble along the barn's sides (low, at the foot of each)
    for (const s of statics) {
      const sw = s.w || 1, sh = s.h || 1; if (!inRegion(s.x + sw / 2, s.y + sh / 2)) continue;
      const id = String(s.id || ''), set = /hide|smoke/.test(id) ? ['plant.reed', 'plant.yg-reedbed', 'plant.bulrush', 'plant.reed'] : /boles/.test(id) ? ['plant.heather', 'plant.wildflowers', 'plant.mqn-buddleia', 'plant.daisies'] : /frog/.test(id) ? ['plant.proof-fleet-rush', 'plant.reed', 'plant.bulrush'] : /churn/.test(id) ? ['plant.yg-meadow', 'plant.wildflowers', 'plant.grass-long'] : /barn/.test(id) ? ['plant.bracken', 'plant.hedgerow-blackberry', 'plant.grass-long', 'plant.fern'] : null;
      if (!set) continue;
      const n = 4 + sw * 3;
      for (let i = 0; i < n; i++) {
        const u = (i + .5) / n, around = i % 3 === 2, x = around ? (i % 2 ? s.x - .3 : s.x + sw + .3) : s.x - .4 + u * (sw + .8), y = around ? s.y + .2 + ((kit.hash(i, s.x, 881) % 100) / 100) * (sh + .5) : s.y + sh + .12 + ((kit.hash(i, s.x, 881) % 100) / 100) * .35;
        { const cx0 = Math.floor(x), cy0 = Math.floor(y), b = base(cx0, cy0), dr = s.door; if (!b || !b.land || b.freshwater || b.solid || plotAt(cx0, cy0) || (dr && cx0 === dr.x && cy0 === dr.y) || pathGap(x * cw, W.sky + y * ch) < 3) continue; }
        const pick = kit.hash(i, s.y, 882) % set.length; lows.push({ id: set[pick], v: pick % 3, h: (/reed|rush/.test(set[pick]) ? 30 : 20) + (kit.hash(i, 3, 883) % 9), x: x * cw, y: W.sky + y * ch });
      }
    }
    if (lows.length && window.GardenNativePainted && GardenNativePainted.objectCanvas) {
      const cans = new Map(), canOf = (i, m) => { const k = i.id + ':' + i.v + ':' + i.h + ':' + m; let o = cans.get(k); if (o === undefined) { o = V.ok(() => GardenNativePainted.objectCanvas(i.id, i.v, season, { h: i.h * m })); cans.set(k, o); } return o; };
      const tone = season === 'winter' ? ['#8a9878', '#a4ae90'] : season === 'autumn' ? ['#7e9446', '#9aaa58'] : ['#5e8a3e', '#7aa24c'];
      const bb = kit.bboxOf(lows.map(i => ({ x: i.x, y: i.y })), 60);
      add(bb, 8401, (B, r0, cb) => {
        const gx = B.cx, m = gx.getTransform(), lvl = Math.max(1, Math.min(2, Math.hypot(m.a, m.b) / 2));
        for (const i of lows) {
          if (cb && (i.x < cb[0] - 60 || i.x > cb[2] + 60 || i.y < cb[1] - 10 || i.y > cb[3] + 70)) continue;
          const o = canOf(i, lvl); if (!o) continue;
          // (the library canvas holds two px a world px at the height it was asked for, here lvl times the planting's own)
          const dw = o.c.width / 2 / lvl, dh = o.c.height / 2 / lvl, ox = o.ox / 2 / lvl, oy = o.oy / 2 / lvl;
          gx.globalAlpha = .2; gx.fillStyle = '#2e3e22'; gx.beginPath(); gx.ellipse(i.x + 2, i.y - .5, Math.min(dw * .46, i.h * .9), 2.8, 0, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = 1;
          gx.drawImage(o.c, i.x - ox, i.y - oy, dw, dh);
          const blades = Math.max(3, Math.round(Math.min(dw, i.h * 1.6) / 2.8)), seed = Math.abs(Math.round(i.x * 7 + i.y * 13)); gx.lineCap = 'round';
          for (let b = 0; b < blades; b++) { const tt = blades > 1 ? b / (blades - 1) : .5, hh = ((seed + b * 37) % 7) / 7, px = i.x - dw * .4 + tt * dw * .8, len = (3 + hh * 4.5) * (1 - Math.abs(tt - .5) * .6); gx.strokeStyle = tone[(seed + b) % 2]; gx.globalAlpha = .9; gx.lineWidth = 1.1; gx.beginPath(); gx.moveTo(px, i.y + .6); gx.quadraticCurveTo(px + (hh - .5) * 2, i.y - len * .5, px + (hh - .5) * 4, i.y - len); gx.stroke(); }
          gx.globalAlpha = 1;
        }
      });
    }

    // round 3: the ground the sights stand in, from their layout rows: the frog stone in a wet hollow (damp dark earth, a
    // little pool on its sunny side with frogbit, rushes round its rim), the bee boles in a drift of lavender and borage
    // with the bees' path worn in the grass; the stones' and walls' own art is the sights painter's
    for (const s of statics) {
      const sw = s.w || 1, sh = s.h || 1; if (!inRegion(s.x + sw / 2, s.y + sh / 2)) continue;
      const id = String(s.id || ''), X = (s.x + sw / 2) * cw, Y = W.sky + (s.y + sh) * ch - 3, wint = season === 'winter';
      // (nothing of it on a path, a field or the water: a mark is laid only on open grass)
      const open = (px, py) => { const cx0 = Math.floor(px / cw), cy0 = Math.floor((py - W.sky) / ch), b = base(cx0, cy0); return !!(b && b.land && !b.freshwater && !b.beach && !plotAt(cx0, cy0)) && pathGap(px, py) > 7; };
      if (/frog/.test(id)) add([X - 80, Y - 40, X + 80, Y + 40], 8491, (B, r) => {
        B.f(B.blob(r, X + 4, Y + 2, 56, 20, 9, .35), wint ? '#6a6a52' : '#3e5a2e', .5).f(B.blob(r, X + 2, Y + 1, 40, 13, 8, .35), '#4a4632', .35);
        const px = X - 34, py = Y + 9; if (open(px - 16, py) && open(px + 16, py) && open(px, py)) B.f(B.blob(r, px, py + 1, 19, 7.5, 8, .3), '#2a3424', .75).f(B.blob(r, px, py, 16, 6, 8, .3), wint ? '#a8b8be' : '#668892').f(B.ell(px - 5, py - 1.6, 6.5, 1.6), wint ? '#e8eef0' : '#b8d0d4', .6);
        if (!wint && open(px, py)) for (let i = 0; i < 6; i++) { const lx = px + (r() - .5) * 22, ly = py + (r() - .5) * 7; B.f(B.ell(lx, ly, 2.2, 1.2), '#4e8a3a', .95).f(B.ell(lx - .6, ly - .3, .9, .4), '#8ab86a', .8); }
        for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rx = X + Math.cos(a) * (44 + r() * 14), ry = Y + 2 + Math.sin(a) * (15 + r() * 6), l = 6 + r() * 8; if (!open(rx, ry)) continue; for (let b = -1; b <= 1; b++) B.s(`M${rx + b} ${ry}q${b * .5} ${-l * .5} ${b * 1.6} ${-l}`, wint ? '#8a8660' : r() < .5 ? '#2c4e26' : '#4a7a34', .9, .95); }
      });
      if (/boles/.test(id)) add([X - 80, Y - 30, X + 80, Y + 40], 8492, (B, r) => {
        if (wint) { B.f(B.blob(r, X, Y + 6, 46, 9, 8, .4), '#7a7458', .3); return; }
        B.f(B.blob(r, X, Y + 4, 50, 10, 8, .45), '#5e6a3a', .3);
        for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = .45 + r() * .55, px = X + Math.cos(a) * 60 * d, py = Y + Math.sin(a) * 18 * d; if (Math.abs(px - X) < 24 && py < Y + 3 || !open(px, py)) continue;
          if (r() < .62) { B.f(B.blob(r, px, py - 2, 4, 2.4, 6, .4), '#7a8a6e', .95); if (season !== 'spring') for (let k2 = 0; k2 < 4; k2++) { const sx = px + (k2 - 1.5) * 1.5; B.s(`M${sx} ${py - 3}l${(k2 - 1.5) * .5} -5.5`, '#7a8a6e', .5, .9).f(B.ell(sx + (k2 - 1.5) * .5, py - 8.5, .8, 1.8), '#8a6ab8', .95); } }
          else { B.s(`M${px} ${py}v-5`, '#5e7a3e', .7, .9); if (season === 'summer' || season === 'autumn') for (let k2 = 0; k2 < 5; k2++) { const t2 = k2 / 5 * Math.PI * 2; B.f(B.ell(px + Math.cos(t2) * 1.2, py - 5.5 + Math.sin(t2) * 1.2, .9, .9), '#5a7ad8', .95); } } }
      });
    }
    const dwMemo = new Map(), dwAt = (x, y) => { const k = x + ',' + y; let v = dwMemo.get(k); if (v === undefined) { v = distTo(x, y, 5, fresh); dwMemo.set(k, v); } return v; };

    // 6. what grows in the grass (round 2): every free cell of the valley floor gets the plants its place has, painted into
    //    the ground (walked over, no frame cost). By the water rushes, purple loosestrife, meadowsweet and yellow flag; at a
    //    hedge's foot cow parsley, nettles, red campion and foxgloves; in the open, tussocks of long grass with the meadow's
    //    flowers in drifts, each drift its own flower (buttercups here, ox-eye daisies there, knapweed, clover). Each cell has
    //    its own random stream, so nothing is stamped twice, and nothing stands on a path's width, a doorway or a field.
    const SEAS = {
      summer: { blade: ['#4e7a32', '#6a9440', '#8eac52', '#b0b864'], seed: '#d8cc8a', flowers: { open: ['buttercup', 'daisy', 'knapweed', 'clover', 'daisy'], edge: ['cowparsley', 'campion', 'nettle', 'foxglove'], bank: ['rush', 'loosestrife', 'meadowsweet', 'rush', 'flag'] } },
      spring: { blade: ['#4a7e30', '#64a03e', '#86b852', '#a8c86a'], seed: '#c8d48a', flowers: { open: ['buttercup', 'cuckoo', 'buttercup', 'daisy'], edge: ['cowparsley', 'cowparsley', 'campion', 'nettle'], bank: ['rush', 'kingcup', 'rush', 'flag'] } },
      autumn: { blade: ['#5e7032', '#7e8a40', '#a49a52', '#c4ae66'], seed: '#d2b070', flowers: { open: ['seedhead', 'knapweed', 'seedhead'], edge: ['nettle', 'seedhead', 'campion'], bank: ['rush', 'rush', 'seedhead'] } },
      winter: { blade: ['#6e7258', '#8a8a6a', '#a8a07e', '#c2b894'], seed: '#cfc2a0', flowers: { open: ['seedhead'], edge: ['seedhead', 'nettle'], bank: ['rush', 'seedhead'] } },
    }[season] || null;
    const S = SEAS || { blade: ['#4e7a32', '#6a9440', '#8eac52', '#b0b864'], seed: '#d8cc8a', flowers: { open: ['daisy'], edge: ['nettle'], bank: ['rush'] } };
    const freeOk = (x, y) => { if (!inRegion(x + .5, y + .5)) return false; const b = base(x, y), rw = row(x, y); return !(!b || !b.land || b.beach || b.freshwater || b.solid || b.reserved || b.ocean || L.kind(x + .5, y + .5) !== 'grass' || rw && (rw.plot || rw.trail || rw.lane || rw.solid) || held.has(x + ',' + y) || byCrossing(x, y)); };
    // the water meadows' ditches (valley.md, secret 4): carriers cut from the river's bank out across the meadow, each let in
    // by a wooden hatch at the water. The three longest runs of open meadow that leave the bank square to the water, kept
    // apart; dry and grown with rushes while the race is silted. From the layout: the fresh water, the free cells, the paths.
    const ditches = [];
    // (round 3: the ditches ran into the fields' hedges and the hatches stood on their corners, wedged between two fields. A ditch now
    //  keeps a third of a cell off any field, and a hatch is never put between a field above and one below: on today's layout that
    //  leaves no bank cell for one, so there are none until the water meadows' layout gives them room)
    const nearPlot = (fx, fy, d) => { for (const dy of [-d, 0, d]) for (const dx of [-d, 0, d]) if (plotAt(Math.floor(fx + dx), Math.floor(fy + dy))) return true; return false; };
    { const cs = [];
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
        if (!freeOk(x, y) || dwAt(x, y) > 1.01 || plotAt(x - 1, y) || plotAt(x + 1, y) || (plotAt(x, y - 1) || plotAt(x - 1, y - 1) || plotAt(x + 1, y - 1)) && (plotAt(x, y + 1) || plotAt(x - 1, y + 1) || plotAt(x + 1, y + 1))) continue;
        let vx = 0, vy = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && fresh(x + dx, y + dy)) { const d = Math.hypot(dx, dy); vx -= dx / d; vy -= dy / d; }
        const l = Math.hypot(vx, vy); if (l < .5) continue; vx /= l; vy /= l;
        // (the hatch stands at the foot of its cell, so its posts rise clear of a field's front hedge in the row above)
        const y0 = plotAt(x, y - 1) || plotAt(x - 1, y - 1) || plotAt(x + 1, y - 1) ? .92 : plotAt(x, y + 1) || plotAt(x - 1, y + 1) || plotAt(x + 1, y + 1) ? .42 : .6,   /* (round 3: and high in its cell when a field lies below, so it never stands on the field's corner) */ pts = [{ x: x + .5 - vx * .4, y: y + y0 }]; let px = x + .5, py = y + .55, ok = 0;
        for (let k = 0; k < 16; k++) {
          const bend = (kit.noise(px / 2.5, py / 2.5, 871) - .5) * .5, ax = vx * Math.cos(bend) - vy * Math.sin(bend), ay = vx * Math.sin(bend) + vy * Math.cos(bend);
          const nx = px + ax * .5, ny = py + ay * .5; if (!freeOk(Math.floor(nx), Math.floor(ny)) || nearPlot(nx, ny, .3) || pathGap(nx * cw, W.sky + ny * ch) < 9 || trees.some(t => Math.hypot(t.x - nx, (t.y - ny) * 1.4) < 1)) break;
          px = nx; py = ny; ok++; pts.push({ x: px, y: py });
        }
        if (ok >= 2 && pts.length >= 3) cs.push({ x, y, len: ok * .5, pts });
        
      }
      cs.sort((a, b) => b.len - a.len || kit.hash(a.x, a.y, 872) - kit.hash(b.x, b.y, 872));
      for (const c of cs) { if (ditches.length >= 3) break; if (ditches.some(d => Math.hypot(d.x - c.x, d.y - c.y) < 3)) continue; ditches.push(c); }
      ditches.sort((a, b) => a.y - b.y);   // (numbered from the top, as the drowner's notebook has them)
    }
    const ditchPx = ditches.map(d => d.pts.map(q => ({ x: q.x * cw, y: W.sky + q.y * ch })));
    const onDitch = (X, Y) => ditchPx.some(pts => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / l)); if (Math.hypot(X - a.x - dx * t, Y - a.y - dy * t) < 9) return true; } return false; });
    // (a route's cells are wider than its painted way: their verges beyond the painting are grass, and get the verge's plants)
    const freeLow = (x, y) => { if (!inRegion(x + .5, y + .5)) return false; const b = base(x, y), rw = row(x, y); return !(!b || !b.land || b.beach || b.freshwater || b.solid || b.ocean || L.kind(x + .5, y + .5) === 'water' || L.kind(x + .5, y + .5) === 'beach' || rw && (rw.plot || rw.solid) || held.has(x + ',' + y) || byCrossing(x, y)); };
    const glowAt = [];
    // the reed marsh: free ground within a few strides of a route the layout calls a marsh (or a boardwalk through reeds)
    const marshRibs = ribbons.filter(rb => rb.marsh), marshAt = (X, Y) => { for (const rb of marshRibs) for (let i = 1; i < rb.pts.length; i++) { const a = rb.pts[i - 1], b = rb.pts[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / l)); if (Math.hypot(X - a.x - dx * t, (Y - a.y - dy * t) * 1.4) < cw * 2.6) return true; } return false; };
    const blocks = new Map(), push = (it) => { const k = Math.floor(it.x / (cw * 4)) + ',' + Math.floor((it.y - W.sky) / (ch * 4)); let l = blocks.get(k); if (!l) blocks.set(k, l = []); l.push(it); };
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      const onWay = !freeOk(x, y); if (onWay && !freeLow(x, y)) continue;
      const rr = kit.rng(kit.hash(x, y, 851)), dwc = dwAt(x, y), reedy = marshRibs.length && marshAt((x + .5) * cw, W.sky + (y + .5) * ch), ctx = reedy ? 'marsh' : dwc <= 1.6 ? 'bank' : near(x, y, 1, plotAt) ? 'edge' : 'open';
      if (ctx !== 'open' && kit.hash(x, y, 857) % 3 === 0) glowAt.push({ x: (x + .2 + rr() * .6) * cw, y: W.sky + (y + .6 + rr() * .3) * ch, seed: kit.hash(x, y, 858) });
      const drift = kit.noise(x / 3.2, y / 2.6, 852), list = S.flowers[ctx] || S.flowers.bank, flower = list[Math.floor(kit.noise(x / 4.5, y / 3.5, 853) * list.length * .999)];
      const n = onWay ? 3 + Math.floor(rr() * 3) : ctx === 'open' ? 4 + Math.floor(rr() * 4) : ctx === 'marsh' ? 6 + Math.floor(rr() * 3) : 3 + Math.floor(rr() * 3);
      for (let i = 0; i < n; i++) {
        const fx = x + .1 + rr() * .8, fy = y + .25 + rr() * .7, X = fx * cw, Y = W.sky + fy * ch;
        if (pathGap(X, Y) < (onWay ? 9 : 5) || onDitch(X, Y)) continue;
        if (plotAt(Math.floor(fx), Math.floor(fy - .4)) || plotAt(Math.floor(fx - .22), Math.floor(fy)) || plotAt(Math.floor(fx + .22), Math.floor(fy))) continue;   // (nothing standing up into a field's front hedge or leaning on its side)
        if (ctx === 'marsh') { push({ x: X, y: Y, kind: rr() < .86 ? 'reedbed' : season === 'summer' ? 'loosestrife' : 'rush', s: .85 + rr() * .4, seed: kit.hash(x * 7 + i, y, 854), ctx }); continue; }
        const isFlower = ctx === 'bank' ? rr() < .55 : ctx === 'edge' ? rr() < .6 : drift > .5 && rr() < .7;
        push({ x: X, y: Y, kind: isFlower ? (ctx === 'open' ? flower : list[Math.floor(rr() * list.length)]) : 'tussock', s: .8 + rr() * .5, seed: kit.hash(x * 7 + i, y, 854), ctx });
      }
    }
    const tuft = (gx, it) => {
      const r = kit.rng(it.seed), s = it.s, x = it.x, y = it.y, bl = S.blade;
      const blades = (n, len, spread, cols, w) => { for (let b = 0; b < n; b++) { const t = n > 1 ? b / (n - 1) - .5 : 0, l = len * (.6 + r() * .55) * (1 - Math.abs(t) * .5), px = x + t * spread + (r() - .5) * 1.4, lean = t * spread * .5 + (r() - .5) * 3; gx.strokeStyle = cols[Math.floor(r() * cols.length)]; gx.lineWidth = w || 1; gx.beginPath(); gx.moveTo(px, y + .5); gx.quadraticCurveTo(px + lean * .25, y - l * .55, px + lean, y - l); gx.stroke(); } };
      const stem = (px, h, col) => { gx.strokeStyle = col || bl[0]; gx.lineWidth = .8; gx.beginPath(); gx.moveTo(px, y); gx.quadraticCurveTo(px + (r() - .5) * 2, y - h * .5, px + (r() - .5) * 2.4, y - h); gx.stroke(); return { x: px + (r() - .5) * 2.4, y: y - h }; };
      const dot = (px, py, rad, col, a) => { gx.globalAlpha = a == null ? .95 : a; gx.fillStyle = col; gx.beginPath(); gx.arc(px, py, rad, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = .92; };
      gx.globalAlpha = .16; gx.fillStyle = '#26381c'; gx.beginPath(); gx.ellipse(x + 1.5, y, 5.5 * s, 1.6, 0, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = .92; gx.lineCap = 'round';
      switch (it.kind) {
        case 'tussock': blades(7 + Math.floor(r() * 6), 9 * s, 7 * s, [bl[0], bl[1], bl[1], bl[2]]); if (r() < .55) for (let k = 0; k < 2 + Math.floor(r() * 2); k++) { const p = stem(x + (r() - .5) * 6 * s, 12 * s * (.8 + r() * .4), bl[2]); for (let q = 0; q < 4; q++) dot(p.x + (r() - .5) * 1.6, p.y + q * 1.3, .7, S.seed, .9); } break;
        case 'buttercup': blades(4, 6 * s, 5, [bl[1], bl[2]]); for (let k = 0; k < 4 + Math.floor(r() * 4); k++) { const p = stem(x + (r() - .5) * 8 * s, (6 + r() * 6) * s, bl[1]); dot(p.x, p.y, 1.3, '#f2d026'); dot(p.x - .4, p.y - .4, .5, '#fff4a0'); } break;
        case 'daisy': blades(4, 6 * s, 5, [bl[1], bl[2]]); for (let k = 0; k < 3 + Math.floor(r() * 4); k++) { const p = stem(x + (r() - .5) * 8 * s, (7 + r() * 6) * s, bl[1]); dot(p.x, p.y, 1.8, '#fbfaf2'); dot(p.x, p.y, .7, '#e8b828'); } break;
        case 'knapweed': blades(4, 7 * s, 5, [bl[0], bl[1]]); for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const p = stem(x + (r() - .5) * 7 * s, (9 + r() * 6) * s, bl[0]); dot(p.x, p.y, 1.5, season === 'autumn' ? '#6e5038' : '#9a4e9a'); dot(p.x - .4, p.y - .5, .6, '#c482c4', .8); } break;
        case 'clover': blades(3, 5 * s, 4, [bl[1], bl[2]]); for (let k = 0; k < 4; k++) { const px = x + (r() - .5) * 8 * s, py = y - 1 - r() * 3; dot(px, py, 1.6, '#3f6e30', .85); if (r() < .6) dot(px, py - 1.6, 1.2, r() < .5 ? '#e48aa8' : '#f4f0f2'); } break;
        case 'cuckoo': blades(3, 6 * s, 4, [bl[1], bl[2]]); for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const p = stem(x + (r() - .5) * 7 * s, (8 + r() * 5) * s, bl[1]); for (let q = 0; q < 3; q++) dot(p.x + (q - 1) * 1.3, p.y + Math.abs(q - 1) * .6, .9, '#e4c8e8'); } break;
        case 'cowparsley': blades(5, 7 * s, 6, [bl[0], bl[1]]); for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const p = stem(x + (r() - .5) * 8 * s, (13 + r() * 7) * s, bl[1]); for (let q = 0; q < 7; q++) { const a = Math.PI * (1.1 + q / 6 * .8); dot(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 1.6 + 1, .85, '#f6f4ea'); } dot(p.x, p.y - .4, 1, '#fbfaf4'); } break;
        case 'meadowsweet': blades(5, 8 * s, 6, [bl[0], bl[1]]); for (let k = 0; k < 2 + Math.floor(r() * 2); k++) { const p = stem(x + (r() - .5) * 8 * s, (14 + r() * 6) * s, bl[0]); for (let q = 0; q < 6; q++) dot(p.x + (r() - .5) * 4, p.y + (r() - .5) * 2.4, 1.1, q % 2 ? '#f2ead0' : '#e6dcb4'); } break;
        case 'campion': blades(4, 7 * s, 5, [bl[0], bl[1]]); for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const p = stem(x + (r() - .5) * 7 * s, (9 + r() * 6) * s, bl[0]); dot(p.x, p.y, 1.4, '#d84a7a'); dot(p.x - .3, p.y - .3, .5, '#f4a0c0'); } break;
        case 'foxglove': blades(5, 6 * s, 6, [bl[0], bl[1]]); { const p = stem(x, (18 + r() * 6) * s, bl[0]); for (let q = 0; q < 6; q++) dot(p.x + (q % 2 ? 1.1 : -.3), p.y + q * 2.2, 1.3 - q * .06, q < 2 ? '#c87ab8' : '#a8508e'); } break;
        case 'nettle': for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const p = stem(x + (r() - .5) * 7 * s, (9 + r() * 7) * s, '#3e5a2a'); for (let q = 0; q < 3; q++) { const yy = y - (p.y < y ? (y - p.y) * (.3 + q * .25) : 0); gx.fillStyle = q === 2 ? '#4e7232' : '#38542a'; gx.beginPath(); gx.ellipse(p.x - 2, yy, 2, .9, .5, 0, Math.PI * 2); gx.ellipse(p.x + 2, yy, 2, .9, -.5, 0, Math.PI * 2); gx.fill(); } } break;
        case 'reedbed': { const st = season === 'winter' ? ['#a89a70', '#c2b488', '#8a7e5a'] : season === 'autumn' ? ['#8e8a48', '#aaa05a', '#6e7036'] : ['#4e7a38', '#6a9444', '#3e6630'], pl = season === 'winter' ? '#d8ccb0' : season === 'autumn' ? '#c8b07a' : season === 'spring' ? null : '#8a5a5a', n = 14 + Math.floor(r() * 10), hgt = 22 * s;
          gx.globalAlpha = .2; gx.fillStyle = '#26381c'; gx.beginPath(); gx.ellipse(x + 2, y, 12 * s, 2.4, 0, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = .95;
          for (let b = 0; b < n; b++) { const u = (b / (n - 1) - .5), px = x + u * 20 * s + (r() - .5) * 3, l = hgt * (.65 + r() * .45) * (1 - Math.abs(u) * .45), lean = u * 3 + (r() - .5) * 2.5; gx.strokeStyle = st[b % 3]; gx.lineWidth = .9; gx.beginPath(); gx.moveTo(px, y + .5); gx.quadraticCurveTo(px + lean * .3, y - l * .5, px + lean, y - l); gx.stroke();
            if (r() < .5) { gx.strokeStyle = st[(b + 1) % 3]; gx.lineWidth = .8; gx.beginPath(); gx.moveTo(px + lean * .15, y - l * .35); gx.quadraticCurveTo(px + lean * .3 + (r() < .5 ? 4 : -4), y - l * .45, px + lean * .3 + (r() < .5 ? 6 : -6), y - l * .3); gx.stroke(); }
            if (pl && r() < .55) { gx.fillStyle = pl; gx.globalAlpha = .85; gx.beginPath(); gx.ellipse(px + lean + .6, y - l - 1.8, 1.3, 3, lean * .08 + .2, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = .95; } }
          break; }
        case 'rush': blades(9 + Math.floor(r() * 6), 13 * s, 5 * s, ['#2e5228', '#3e6a30', '#4e7a36'], 1.1); if (r() < .5) dot(x + 2, y - 10 * s, 1, '#7a5a30'); break;
        case 'loosestrife': blades(5, 8 * s, 6, [bl[0], bl[1]]); for (let k = 0; k < 2 + Math.floor(r() * 2); k++) { const p = stem(x + (r() - .5) * 7 * s, (16 + r() * 6) * s, bl[0]); for (let q = 0; q < 5; q++) dot(p.x + (r() - .5) * .8, p.y + q * 1.8, 1.25 - q * .08, q < 2 ? '#c860b0' : '#a8429a'); } break;
        case 'flag': blades(7, 13 * s, 6, ['#3e6a34', '#4e7e3c', '#62904a'], 1.6); if (r() < .7) { dot(x + 1, y - 12 * s, 1.8, '#f2d02a'); dot(x + 2.2, y - 11 * s, 1.1, '#e8b81a'); } break;
        case 'kingcup': blades(4, 5 * s, 5, ['#3e6a30', '#4e7a36']); for (let k = 0; k < 4; k++) { const px = x + (r() - .5) * 8, py = y - 2 - r() * 3; dot(px, py + 1, 2, '#3e6a30', .9); dot(px, py - .6, 1.6, '#f6c818'); } break;
        default: blades(6 + Math.floor(r() * 4), 9 * s, 6 * s, [bl[2], bl[3], bl[3]]); for (let k = 0; k < 2; k++) { const p = stem(x + (r() - .5) * 6, 11 * s, bl[3]); dot(p.x, p.y, 1.2, S.seed, .9); }
      }
      gx.globalAlpha = 1;
    };
    // the ditches first, under the planting: a narrow cut with a shaded far side, a silted bottom with old weed, a lit near lip,
    // rushes and meadowsweet along both sides; and at the water end the hatch, a board between two posts with its rack on top
    const G0 = window.GardenPaintGround;
    const ditch = (gx, pts, seed, n) => {
      const r = kit.rng(seed), path = new Path2D(); path.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; path.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2); } path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      const at = (dx, dy, col, w, a) => { gx.save(); gx.translate(dx, dy); gx.globalAlpha = a; gx.strokeStyle = col; gx.lineWidth = w; gx.stroke(path); gx.restore(); };
      gx.lineCap = 'round'; gx.lineJoin = 'round';
      const wint = season === 'winter';
      // seen from the south: the damp dip in the grass, the far bank's lit lip and its shaded face below it, the silted bed with a
      // last thread of damp, and the near side hidden under the grass that leans over it
      at(0, .5, wint ? '#7e8a6a' : '#55802f', 19, .32); at(0, 0, wint ? '#7a7458' : '#6a6436', 11, 1);
      at(0, -3.6, wint ? '#c2c4a8' : '#a8bc5e', 2.2, .75); at(0, -2, wint ? '#4e4a3a' : '#3c3a1e', 3.4, .9); at(0, 1.2, wint ? '#8e8a6e' : '#7e7646', 4, .8); at(0, 1.1, wint ? '#c4d2d6' : '#8eaab0', 2, .6); at(-.6, .6, '#d8e6e8', .8, .45);   // (a last thread of damp in the bed, catching the sky)
      for (const q of V.walk(pts, 2.6)) { const lean = (r() - .5) * 2.4; gx.globalAlpha = .9; gx.strokeStyle = S.blade[Math.floor(r() * 3)]; gx.lineWidth = 1; gx.beginPath(); gx.moveTo(q.x + lean, q.y + 6.5); gx.quadraticCurveTo(q.x + lean * .6, q.y + 3.5, q.x + lean * 1.4 + (r() - .5) * 2, q.y + 1.2 - r() * 2); gx.stroke(); if (r() < .5) { gx.beginPath(); gx.moveTo(q.x, q.y - 4.5); gx.quadraticCurveTo(q.x + lean, q.y - 6, q.x + lean * 1.6, q.y - 8 - r() * 3); gx.stroke(); } }
      for (const q of V.walk(pts, 8.5)) for (const side of [-1, 1]) { if (r() < .35) continue; const d = (6.5 + r() * 2) * side; tuft(gx, { x: q.x - q.ty * d, y: q.y + q.tx * d + (side > 0 ? 3 : -1), kind: r() < .2 && season === 'summer' ? 'meadowsweet' : wint ? 'seedhead' : 'rush', s: .6 + r() * .35, seed: kit.hash(Math.round(q.x), Math.round(q.y), 873 + side) }); }
      // the hatch
      const h = pts[0], wd = ['#5a4632', '#7e6646', '#a48a62', '#3a2e22'], H = gardenSizePx('fence', 1), bw = 15;
      if (G0 && G0.castShadow) G0.castShadow(gx, h.x, h.y + 3, bw + 6, H, { a: .22 });
      // (round 3: it read as a crate. Now the cut runs on through it: stone cheeks either side, the board let down into the slot
      //  between them so the ditch shows round its foot, the rack standing up through the beam with a hand wheel to wind it)
      gx.globalAlpha = 1; gx.fillStyle = '#2e2a1c'; gx.fillRect(h.x - bw / 2 - 1, h.y - 2, bw + 2, 6);
      for (const sx of [-1, 1]) { gx.fillStyle = '#8a8676'; gx.beginPath(); gx.ellipse(h.x + sx * (bw / 2 + 4.5), h.y + 1.5, 4.5, 3, 0, 0, Math.PI * 2); gx.fill(); gx.fillStyle = '#b4ae9a'; gx.beginPath(); gx.ellipse(h.x + sx * (bw / 2 + 4.5) - 1, h.y + .5, 2.6, 1.4, 0, 0, Math.PI * 2); gx.fill(); }
      { const bh = H * .42, y0 = h.y + 1 - bh; gx.fillStyle = wd[0]; gx.fillRect(h.x - bw / 2 + 1.5, y0, bw - 3, bh); gx.fillStyle = wd[1]; gx.fillRect(h.x - bw / 2 + 1.5, y0, (bw - 3) / 2 - .4, bh); gx.fillStyle = wd[2]; gx.globalAlpha = .6; gx.fillRect(h.x - bw / 2 + 1.5, y0, bw - 3, .9); gx.globalAlpha = .5; gx.fillStyle = '#2e3a30'; gx.fillRect(h.x - bw / 2 + 1.5, h.y - 1.2, bw - 3, 2.2); gx.globalAlpha = 1; }
      for (const sx of [-1, 1]) { const px = h.x + sx * (bw / 2 + 1); gx.fillStyle = wd[3]; gx.fillRect(px - 1.8, h.y - H, 3.6, H + 3); gx.fillStyle = wd[1]; gx.globalAlpha = .75; gx.fillRect(px - 1.8, h.y - H, 1.3, H + 3); gx.globalAlpha = 1; gx.fillStyle = wd[2]; gx.beginPath(); gx.ellipse(px, h.y - H, 1.8, .8, 0, 0, Math.PI * 2); gx.fill(); }
      gx.fillStyle = wd[3]; gx.fillRect(h.x - bw / 2 - 3, h.y - H - 1, bw + 6, 2.6); gx.fillStyle = wd[2]; gx.globalAlpha = .6; gx.fillRect(h.x - bw / 2 - 3, h.y - H - 1, bw + 6, .9); gx.globalAlpha = 1;   // the cross beam
      gx.strokeStyle = '#3a3c3e'; gx.lineWidth = 1.2; gx.beginPath(); gx.moveTo(h.x, h.y - H * .55); gx.lineTo(h.x, h.y - H - 5); gx.stroke();   // the iron rack that lifts the board
      for (let k = 0; k < 4; k++) { gx.beginPath(); gx.moveTo(h.x - 1.2, h.y - H * .6 - k * 2.6); gx.lineTo(h.x + 1.2, h.y - H * .6 - k * 2.6 - .8); gx.stroke(); }   // the rack's teeth
      gx.lineWidth = .9; gx.beginPath(); gx.arc(h.x + bw / 2 + 2.5, h.y - H - 1, 3.4, 0, Math.PI * 2); gx.stroke(); gx.beginPath(); gx.moveTo(h.x + bw / 2 + 2.5 - 3.4, h.y - H - 1); gx.lineTo(h.x + bw / 2 + 2.5 + 3.4, h.y - H - 1); gx.moveTo(h.x + bw / 2 + 2.5, h.y - H - 4.4); gx.lineTo(h.x + bw / 2 + 2.5, h.y - H + 2.4); gx.stroke();   // the hand wheel
      // its number cut in the beam (1 at the top), as on Bramble's map
      gx.fillStyle = '#e2d6b8'; gx.globalAlpha = .8; for (let i = 0; i < n; i++) gx.fillRect(h.x - bw / 2 + 2 + i * 2.2, h.y - H - .4, .9, 1.6); gx.globalAlpha = 1;
    };
    ditchPx.forEach((pts, i) => { const dbb = kit.bboxOf(pts, 16); dbb[1] -= 30; dbb[3] += 14; add(dbb, 8470 + i, B => ditch(B.cx, pts, kit.hash(i, 7, 874), i + 1)); });
    V._valleyTrees.ditches = ditches.map(d => d.x + ',' + d.y + ':' + d.len).join(' ');
    for (const [k, items] of blocks) {
      const ibb = kit.bboxOf(items.map(i => ({ x: i.x, y: i.y })), 4); ibb[0] -= 16; ibb[2] += 16; ibb[1] -= 38; ibb[3] += 4;
      add(ibb, 8500 + blocks.size, (B, r0, cb) => { const gx = B.cx; for (const it of items) { if (cb && (it.x < cb[0] - 18 || it.x > cb[2] + 18 || it.y < cb[1] - 4 || it.y > cb[3] + 38)) continue; tuft(gx, it); } });
    }
    V._valleyTrees.lowCells = blocks.size; V._valleyTrees.lowItems = [...blocks.values()].reduce((a, l) => a + l.length, 0);

    // 7. gentle motion (round 2): swallows hawking low over the race and the fields round the mill and the barn by day in
    //    spring and summer, and mist lying in the water meadows from dusk to dawn, drifting with the wind. Where from the
    //    layout: the valley's mill and barn statics (or its middle), and the meadow cells a little way off the water.
    const flyAt = statics.filter(s => /mill|barn/.test(String(s.id || '')) && inRegion(s.x + (s.w || 1) / 2, s.y + (s.h || 1) / 2)).map(s => ({ x: (s.x + (s.w || 1) / 2) * cw, y: W.sky + (s.y + (s.h || 1) + 1.5) * ch }));
    if (!flyAt.length) flyAt.push({ x: (bx0 + bx1) / 2 * cw, y: W.sky + (by0 + by1) / 2 * ch });
    const mistAt = [];
    { const c = [];
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) { if (!inRegion(x + .5, y + .5)) continue; const b = base(x, y); if (!b || !b.land || b.beach || b.freshwater || b.solid) continue; const d = dwAt(x, y); if (d >= 1 && d <= 3.2) c.push({ x, y, s: kit.hash(x, y, 861) }); }
      c.sort((a, b) => a.s - b.s);
      for (const q of c) { if (mistAt.length >= 16) break; if (mistAt.some(m => Math.hypot(m.cx - q.x, (m.cy - q.y) * 1.6) < 4.2)) continue; mistAt.push({ cx: q.x, cy: q.y, x: (q.x + .5) * cw, y: W.sky + (q.y + .7) * ch, seed: q.s }); }
    }
    const swallows = season === 'spring' || season === 'summer';
    // (two things: the mist lies under everything that stands, the swallows fly over it all)
    if (mistAt.length) thing({ key: 'valley-mist', x: (bx0 + bx1) / 2 * cw, y: -9300, make: scene => life(scene, { mistAt, glowAt: season === 'summer' ? glowAt.slice(0, 40) : [], season }) });
    if (swallows && flyAt.length) thing({ key: 'valley-swallows', x: (bx0 + bx1) / 2 * cw, y: 1e6, make: scene => life(scene, { flyAt, season }) });
    V._valleyTrees.mist = mistAt.length; V._valleyTrees.swallowGroups = swallows ? flyAt.length : 0;
  }
  /* ---------- the valley floor, under everything the vale paints ---------- */
  function floor(C) {
    // 5. the valley floor (round 2). The kit's meadow is one even sunny green here; a water-meadow valley is not. Lusher and
    //    deeper by the water, long grass gone to seed in broad pale drifts where the ground rises, cooler in the hollows.
    //    Laid soft: a low-resolution picture of the light and shade per chunk, sampled on one world grid so two chunks agree,
    //    stretched smooth, then cut to the meadow by the vale's own ground clip (off the roads, the water and the sand).
    const { L, W, kit, season, add } = C, cw = W.cellW, ch = W.cellH, D = L.D;
    const region = (D.regions || []).find(r => r.id === REGION); if (!region || typeof gardenIslandBaseCell !== 'function') return;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const p of region.polygons) for (const [x, y] of p) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
    bx0 = Math.max(0, Math.floor(bx0)); by0 = Math.max(0, Math.floor(by0)); bx1 = Math.min(W.cols - 1, Math.ceil(bx1)); by1 = Math.min(W.rows - 1, Math.ceil(by1));
    const base = (x, y) => gardenIslandBaseCell(x, y), fresh = (x, y) => { const b = base(x, y); return !!(b && b.freshwater) || L.kind(x + .5, y + .5) === 'water'; };
    const distTo = (x, y, rad, test) => { let best = 99; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (test(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy)); return best; };
    const WS = 16, dwMemo = new Map(), dwAt = (x, y) => { const k = x + ',' + y; let v = dwMemo.get(k); if (v === undefined) { v = distTo(x, y, 5, fresh); dwMemo.set(k, v); } return v; };
    const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const TONE = {
      summer: { lush: '#3f7a32', seed: '#d2c886', cool: '#36602e' }, spring: { lush: '#3e7e30', seed: '#c6d07c', cool: '#3a6630' },
      autumn: { lush: '#5a7434', seed: '#c8a85e', cool: '#4a5a2c' }, winter: { lush: '#6a7a5a', seed: '#c4b894', cool: '#5a6650' },
    }[season] || { lush: '#3f7a32', seed: '#d2c886', cool: '#36602e' };
    const lushC = hexRGB(TONE.lush), seedC = hexRGB(TONE.seed), coolC = hexRGB(TONE.cool);
    const vbb = [bx0 * cw - 48, W.sky + by0 * ch - 48, (bx1 + 1) * cw + 48, W.sky + (by1 + 1) * ch + 48];
    if (typeof document !== 'undefined') add(vbb, 8390, (B, r0, cb) => {
      if (!cb) return;
      const gx0 = Math.floor(cb[0] / WS) * WS - WS, gy0 = Math.floor(cb[1] / WS) * WS - WS, nx = Math.ceil((cb[2] - gx0) / WS) + 2, ny = Math.ceil((cb[3] - gy0) / WS) + 2;
      const c = document.createElement('canvas'); c.width = nx; c.height = ny; const g = c.getContext('2d'), img = g.createImageData(nx, ny), d = img.data;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const X = gx0 + (i + .5) * WS, Y = gy0 + (j + .5) * WS, fx = X / cw, fy = (Y - W.sky) / ch, x = Math.floor(fx), y = Math.floor(fy);
        if (!inRegion(fx, fy)) continue;
        const b = base(x, y); if (!b || !b.land || b.beach) continue;
        const wetK = Math.max(0, Math.min(1, 1 - (dwAt(x, y) - 1.2) / 3.6)), n1 = kit.fbm(X / 340, Y / 240, 71), n2 = kit.fbm(X / 110, Y / 80, 72);
        // accumulate over a clear pixel: the lush wet green, then the seed drifts (off the wet ground), then the hollows
        let R = 0, G = 0, Bl = 0, A = 0; const over = (col, a) => { if (a <= 0) return; const na = a + A * (1 - a); R = (col[0] * a + R * A * (1 - a)) / na; G = (col[1] * a + G * A * (1 - a)) / na; Bl = (col[2] * a + Bl * A * (1 - a)) / na; A = na; };
        over(lushC, wetK * (.2 + n2 * .14));
        over(seedC, Math.max(0, Math.min(.34, (n1 - .5) * 1.5 + (n2 - .5) * .3)) * (1 - wetK * .8));
        over(coolC, Math.max(0, Math.min(.24, (.45 - n1) * 1.2 + (.5 - n2) * .1)));
        const o = (j * nx + i) * 4; d[o] = R; d[o + 1] = G; d[o + 2] = Bl; d[o + 3] = Math.round(A * 255);
      }
      g.putImageData(img, 0, 0);
      const cx = B.cx; cx.save(); V.clipGround(B, L, cb, true); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(c, gx0, gy0, nx * WS, ny * WS); cx.restore();
    });
  }
  V.parts.unshift({ id: 'valley-floor', compose: C => floor(C) });
  V.parts.push({ id: 'valley-planting', compose });
})();
