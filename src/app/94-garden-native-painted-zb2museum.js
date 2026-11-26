/* The Vale Museum, painted (build2): any placed thing of the kind `museum` whose painter is 'vale-museum' (94-garden-zz-7act-0kinds.js)
 * is drawn by this, where its row of layout data puts it (assets/garden/vale-museum.json). In the opening scenes' house style: honey
 * limestone in ashlar courses lit from the upper left, a portico of four columns under a pediment with the museum's name cut in its
 * frieze, a lead-domed cupola with a fish for a weathervane, tall arched windows in the two wings, a flight of three steps, lamps,
 * stone urns, ivy up the west corner, moss and grass at its foot, a flagged forecourt worn in front of the door.
 * Sized against H, the player's height (GARDEN_SIZE): the door 1.25 H, the wings' cornice 2.3 H, the pediment 3.4 H, the cupola 4.6 H.
 * It grows with the collection (the drawing's signature): a banner for each wing that has opened (they sway), the River Hall's windows
 * lit teal and the Glasshouse's green once they have something in them, window boxes at 25 on show, gilded letters at 50, a gilded dome
 * at 100. At night the windows and the fanlight glow and the lamps are lit. Registered in GardenPaintedProps' paint table at load. */
(function () {
  const GP = window.GardenPaintedProps; if (!GP || !GP.paintTable || !GP.kit) return;
  const K = GP.kit, { rng, hash, leafOf } = K, { IRON, MOSS, OAK } = K.PALETTE;
  const D = () => sceneDraw;
  const LIME = ['#dbc59a', '#c0a879', '#eedfbb', '#9a8460'], DEEP = ['#b69d70', '#9c845c', '#cdb68a'], ROOF = ['#5d696f', '#48535a', '#7d898d', '#363f42'], LEAD = ['#8a9496', '#6c7678', '#b2bcbc'];
  const GOLD = ['#d8a83a', '#a87a1c', '#f4d67a'];
  const WINGS = Object.freeze([['f', -80], ['o', -28], ['c', 28], ['b', 80]]);   // where each wing's banner hangs
  const BANNER = Object.freeze({ f: ['#2f7a86', '#1f5a64', '#7cc4c8'], b: ['#c08a28', '#946418', '#f2d27a'], o: ['#a8503a', '#7a3424', '#e09a7a'], c: ['#6a4a86', '#4a3064', '#b89ad0'] });
  /** What the drawing shows of the collection: '|wings open|tier' (tier 0, 1 at 25 on show, 2 at 50, 3 at 100). */
  function sig() {
    try {
      const H = typeof gardenMuseumHere === 'function' ? gardenMuseumHere() : null; if (!H) return '||0';
      let w = ''; for (const [id] of WINGS) { for (const r of H.rows.values()) if (r.w === id) { w += id; break; } }
      const n = H.rows.size; return '|' + w + '|' + (n >= 100 ? 3 : n >= 50 ? 2 : n >= 25 ? 1 : 0);
    } catch (e) { return '||0'; }
  }
  const parse = (more) => { const p = String(more || '').split('|'); return { wings: p[1] || '', tier: Number(p[2]) || 0 }; };
  /* courses of dressed stone across a rectangle: bed joints, staggered perpends, a stone here and there a shade off */
  function ashlar(B, r, x, y, w, h, pal, course) {
    B.f(B.rect(x, y, w, h), pal[0]);
    let row = 0;
    for (let yy = y + h; yy > y + .5; yy -= course, row++) {
      const top = Math.max(y, yy - course);
      B.s(`M${x} ${top.toFixed(1)}h${w}`, pal[3], .5, .42);
      let xx = x + (row % 2 ? course * 1.1 : 0);
      while (xx < x + w - 1) { const bw = course * (1.7 + r() * 1.5), ww = Math.min(bw, x + w - xx); if (xx > x + .5) B.s(`M${xx.toFixed(1)} ${top.toFixed(1)}v${(yy - top).toFixed(1)}`, pal[3], .42, .32); if (r() < .3) B.f(B.rect(xx + .7, top + .7, Math.max(0, ww - 1.4), Math.max(0, yy - top - 1.4)), r() < .55 ? pal[2] : pal[1], .3); xx += bw; }
    }
    B.f(B.rect(x, y, w, h), B.lin(x, 0, x + w, 0, [[0, 'rgba(255,246,222,.16)'], [.55, 'rgba(255,246,222,0)'], [1, 'rgba(70,46,20,.14)']]));
    B.f(B.rect(x, y, w, h), B.lin(0, y, 0, y + h, [[0, 'rgba(255,240,210,.06)'], [.7, 'rgba(0,0,0,0)'], [1, 'rgba(52,36,18,.22)']]));   // (darker toward the foot, where the rain splashes)
  }
  /* a tall round-headed window in a dressed surround with a keystone and a sill; inside: night's glow, or what the wing holds */
  function archWin(B, r, cx, top, w, h, o, inside) {
    const x = cx - w / 2, rad = w / 2, bot = top + h, P = (dx, dr) => `M${x - dx} ${bot + dx * .6}V${top + rad}A${rad + dr} ${rad + dr} 0 0 1 ${x + w + dx} ${top + rad}V${bot + dx * .6}Z`;
    B.f(P(3.4, 3.4), LIME[2]).f(`M${x + w + .4} ${bot + 2}V${top + rad}A${rad + 3.4} ${rad + 3.4} 0 0 0 ${cx + 1} ${top - 3.4}V${top}A${rad} ${rad} 0 0 1 ${x + w} ${top + rad}V${bot}Z`, LIME[1], .55);
    const glass = o.night ? B.lin(0, top, 0, bot, [[0, '#ffd88a'], [1, '#e8a04a']]) : inside === 'f' ? B.lin(0, top, 0, bot, [[0, '#4f8c94'], [1, '#2c5c68']]) : inside === 'b' ? B.lin(0, top, 0, bot, [[0, '#5f8a56'], [1, '#3a5e36']]) : B.lin(0, top, 0, bot, [[0, '#4a5a66'], [1, '#2e3a44']]);
    B.f(P(0, 0), glass);
    if (!o.night && inside === 'f') { B.f(B.ell(cx, bot - h * .3, w * .32, h * .07), '#9ad4d0', .35); B.f(`M${cx - w * .26} ${bot - h * .42}q${w * .2} ${-h * .07} ${w * .42} 0q${-w * .2} ${h * .07} ${-w * .42} 0z`, '#1c3c44', .55); }   // a tank's glow, a fish passing it
    if (!o.night && inside === 'b') for (let i = 0; i < 5; i++) B.f(D().blob(r, cx + (r() - .5) * w * .7, bot - h * (.15 + r() * .45), w * .2, h * .06, 6, .4), i % 2 ? '#86b468' : '#5e8a44', .75);   // the glasshouse's leaves
    if (!o.night) B.f(`M${x + 1.2} ${bot - 1}V${top + rad}A${rad - 1.2} ${rad - 1.2} 0 0 1 ${cx} ${top + 1.2}V${bot - 1}Z`, 'rgba(255,255,255,.10)').s(`M${x + w * .26} ${top + rad + 2}l${w * .3} ${-h * .18}`, '#ffffff', 1, .28);   // the sky in the panes
    B.s(`M${cx} ${top + 1}V${bot}M${x} ${top + rad + 2}h${w}M${x} ${top + rad + (h - rad) * .55}h${w}`, LIME[3], 1.1, .85);   // glazing bars
    B.f(B.rr(x - 5, bot, w + 10, 3.4, 1), LIME[2]).f(B.rect(x - 5, bot + 3.4, w + 10, 1.4), 'rgba(40,26,10,.26)');   // the sill and its shadow
    B.f(`M${cx - 3.4} ${top - 4.4}h6.8l-1.6 6.4h-3.6z`, LIME[2]).f(`M${cx + 1.8} ${top - 4.4}h1.6l-1.6 6.4h-1.6z`, LIME[1], .7);   // the keystone
  }
  /* a column of the portico, its shaft a little narrower at the top, fluted, lit from the left; a moulded base, a plain cap */
  function column(B, x, top, bottom, w) {
    const tw = w * .86;
    B.f(`M${x - w / 2} ${bottom - 4}L${x - tw / 2} ${top + 4}L${x + tw / 2} ${top + 4}L${x + w / 2} ${bottom - 4}Z`, LIME[0]);
    B.f(`M${x - w / 2} ${bottom - 4}L${x - tw / 2} ${top + 4}L${x - tw * .12} ${top + 4}L${x - w * .12} ${bottom - 4}Z`, LIME[2], .62);
    B.f(`M${x + w * .2} ${bottom - 4}L${x + tw * .2} ${top + 4}L${x + tw / 2} ${top + 4}L${x + w / 2} ${bottom - 4}Z`, LIME[3], .42);
    for (let k = -2; k <= 2; k++) B.s(`M${(x + k * w * .17).toFixed(1)} ${bottom - 5}L${(x + k * tw * .17).toFixed(1)} ${top + 5}`, LIME[3], .45, .32);
    B.f(B.rr(x - w / 2 - 2.4, bottom - 4, w + 4.8, 4, 1.2), LIME[2]).f(B.rect(x - w / 2 - 2.4, bottom - 1.6, w + 4.8, 1.6), LIME[1], .8);   // the base
    B.f(B.rr(x - tw / 2 - 1.6, top + 2, tw + 3.2, 3, 1), LIME[2]).f(B.rect(x - w / 2 - 3, top - 1, w + 6, 3), LIME[0]).f(B.rect(x - w / 2 - 3, top - 1, w + 6, 1), LIME[2], .9);   // the cap and its abacus
  }
  /* a stone urn of flowers, the flowers by the season */
  function urn(B, r, x, y, season) {
    B.shadow(x + 1, y + 1, 9, 2.4, .26);
    B.f(B.rect(x - 4.6, y - 6, 9.2, 6), LIME[1]).f(B.rect(x - 4.6, y - 6, 3, 6), LIME[2], .6);
    B.f(`M${x - 8} ${y - 15}q0 9 8 9q8 0 8 -9z`, LIME[0]).f(`M${x - 8} ${y - 15}q0 9 4 9v-9z`, LIME[2], .55).f(B.rr(x - 9, y - 17, 18, 2.6, 1), LIME[2]);
    if (season === 'winter') { B.f(D().blob(r, x, y - 18, 8, 3, 7, .3), '#f2f6f8'); return; }
    const L = leafOf(season); B.f(D().blob(r, x, y - 19, 9, 5, 8, .35), L[1]).f(D().blob(r, x - 2, y - 21, 6, 3.4, 7, .35), L[2], .9);
    const cols = season === 'autumn' ? ['#d86a2a', '#e8b040', '#b8402a'] : season === 'spring' ? ['#f4e8f0', '#f2c84a', '#c890d8'] : ['#d8405a', '#f4f2ec', '#e88a4a'];
    for (let i = 0; i < 9; i++) { const px = x + (r() - .5) * 15, py = y - 19 - r() * 6; B.f(B.circ(px, py, 1.6), cols[i % 3]).f(B.circ(px - .5, py - .5, .7), '#ffffff', .5); }
    for (let i = 0; i < 3; i++) B.s(`M${x + (i - 1) * 6} ${y - 16}q${(i - 1) * 3} 5 ${(i - 1) * 5} 8`, L[0], 1.1, .85);   // trailing over the lip
  }
  /* a lamp post on the forecourt: iron, the lantern a glass box; lit at night */
  function lamp(B, x, foot, night) {
    const top = foot - 76;
    B.shadow(x + 2, foot + 1, 7, 2, .3);
    B.f(B.rr(x - 3.4, foot - 6, 6.8, 6, 1), IRON[1]).post(x, top + 6, foot - 5, 2.6, [IRON[1], IRON[0], IRON[2]]);
    B.s(`M${x} ${top + 9}q5 -1 6 -6`, IRON[0], 1.2).f(B.rr(x - 4.6, top - 6, 9.2, 13, 1.4), night ? '#ffe7a4' : '#cfd8d6').f(B.rr(x - 3.6, top - 5, 3, 11, 1), '#ffffff', night ? .55 : .3);
    B.f(B.poly([[x - 6, top - 6], [x, top - 11], [x + 6, top - 6]]), IRON[0]).f(B.circ(x, top - 12, 1.3), IRON[1]).f(B.rect(x - 5.4, top + 7, 10.8, 1.6), IRON[0]);
  }
  /* the banners each opened wing hangs out: a long pennant from an iron arm, its emblem on it (drawn alone so it can sway) */
  function banner(B, w) {
    const c = BANNER[w] || BANNER.f;
    B.s('M-7 0h14', IRON[0], 1.6).f(B.circ(-7, 0, 1.2), IRON[1]).f(B.circ(7, 0, 1.2), IRON[1]);
    B.f('M-6 1h12v28l-6 -4.6l-6 4.6z', c[0]).f('M-6 1h4v26.4l-2 1.5l-2 1.6z', c[2], .35).f('M2.6 1h3.4v28l-3.4 -2.6z', c[1], .55);
    B.s('M-6 4.4h12M-6 23h12', c[2], .7, .7);
    if (w === 'f') B.f('M-4 13q4 -4.6 8 0q-4 4.6 -8 0zM4 13l2.4 -2.4v4.8z', c[2]).f(B.circ(-1.6, 12.4, .55), c[1]);   // a fish
    else if (w === 'b') B.f('M0 13.4q-5 -6 -5 -1q0 4 5 1.4zM0 13.4q5 -6 5 -1q0 4 -5 1.4z', c[2]).s('M0 10v8', c[1], .9);   // a butterfly
    else if (w === 'o') B.s('M0 13.4m-4.2 0a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0M0 13.4m-2.4 0a2.4 2.4 0 1 1 4.8 0a1.2 1.2 0 1 1 -2.4 0', c[2], 1.1, .95);   // an ammonite
    else B.f(B.circ(0, 10.6, 2.6), c[2]).f(B.rect(-.9, 12.6, 1.8, 6.6), c[2]).f(B.rect(.9, 16.6, 2.4, 1.4), c[2]).f(B.circ(0, 10.6, 1), c[1]);   // a key
  }
  /* the weathervane: a fish on a spindle (it turns in the wind) */
  function vane(B, gold) {
    const c = gold ? GOLD : [IRON[0], IRON[1], '#7a8488'];
    B.s('M0 4V-6', IRON[0], 1.3);
    B.f('M-12 -7q6 -5 14 -1q4 2 6 0l-1 3l1 3q-2 -2 -6 0q-8 4 -14 -1z', c[0]).f('M-12 -7q6 -5 14 -1l-2 1q-6 -2 -12 0z', c[2], .55).f(B.circ(-8, -7.4, .9), c[1]);
  }
  GP.paintTable['sight:vale-museum'] = {
    box: [-156, -228, 156, 36],
    sig: () => sig(),
    draw(B, o) {
      const r = rng(hash('vale-museum')), s = o.season || 'summer', night = !!o.night, winter = s === 'winter', st = parse(o.more), L = leafOf(s);
      // the ground: the soft contact shadow of the whole building, a flagged forecourt worn in front of the door
      B.shadow(0, 2, 138, 14, .24);
      B.f(D().blob(r, 0, 16, 78, 16, 11, .22), '#8a7a5e', .28);
      for (let row = 0; row < 3; row++) for (let i = -4; i <= 4; i++) { const w0 = 15 + r() * 5, x = i * 16.5 + (row % 2 ? 8 : 0) + (r() - .5) * 2, y = 4 + row * 8.6 + (r() - .5) * 1.2, half = (70 - row * 8) ; if (Math.abs(x) > half) continue; B.f(B.rr(x - w0 / 2, y, w0, 7.4, 2.2), ['#c8bea6', '#b8ad94', '#d6cdb6'][(i + row + 9) % 3]).f(B.rr(x - w0 / 2, y, w0, 1.6, 1), '#e6dfcc', .65); }
      for (let i = 0; i < 16; i++) { const x = (r() - .5) * 130, y = 4 + r() * 22; if (Math.abs(x) > 62 - (y - 4) * .4) B.f(D().blob(r, x, y, 4 + r() * 4, 1.6, 6, .5), MOSS[r() < .5 ? 0 : 1], .55); }   // (grass and moss in the joints at the forecourt's edge)
      // the wings' roofs, seen going back from their cornice: slate in courses, hipped at the ends, lead along the ridge
      for (const sx of [-1, 1]) {
        const xa = sx < 0 ? -118 : 40, xb = sx < 0 ? -40 : 118, ex = sx < 0 ? xa : xb;
        B.f(B.poly([[xa - 4, -96], [xa + (sx < 0 ? 14 : 0), -120], [xb - (sx > 0 ? 14 : 0), -120], [xb + 4, -96]]), ROOF[0]);
        for (let y = -99; y > -119; y -= 3.6) { const k = (-96 - y) / 24, a = xa - 4 + (sx < 0 ? 18 : 4) * k, b = xb + 4 - (sx > 0 ? 18 : 4) * k; B.s(`M${a.toFixed(1)} ${y.toFixed(1)}H${b.toFixed(1)}`, ROOF[1], .7, .55); }
        B.f(B.poly([[xa - 4, -96], [xa + (sx < 0 ? 14 : 0), -120], [xa + (sx < 0 ? 26 : 12), -120], [xa + 10, -96]]), ROOF[2], .35);   // the light on the west slopes
        B.f(B.rect(xa + (sx < 0 ? 14 : 0), -122, xb - xa - 14, 2.6), LEAD[1]).f(B.rect(xa + (sx < 0 ? 14 : 0), -122, xb - xa - 14, .9), LEAD[2], .8);
        if (winter) B.f(`M${xa - 4} -96L${xa + (sx < 0 ? 14 : 0)} -120H${xb - (sx > 0 ? 14 : 0)}L${xb + 4} -96Z`, '#eef3f6', .55);
        void ex;
      }
      // the middle block's roof, behind the pediment, and the cupola on its ridge
      B.f(B.poly([[-50, -112], [-30, -150], [30, -150], [50, -112]]), ROOF[0]).f(B.poly([[-50, -112], [-30, -150], [-18, -150], [-36, -112]]), ROOF[2], .35);
      for (let y = -116; y > -149; y -= 3.6) { const k = (-112 - y) / 38, a = -50 + 20 * k, b = 50 - 20 * k; B.s(`M${a.toFixed(1)} ${y.toFixed(1)}H${b.toFixed(1)}`, ROOF[1], .7, .5); }
      if (winter) B.f('M-50 -112L-30 -150H30L50 -112Z', '#eef3f6', .5);
      {   // the cupola: a square base, a white drum with arched openings, a lead dome (gilded at a hundred), a ball, the spindle
        B.f(B.rect(-15, -162, 30, 12), LIME[0]).f(B.rect(-15, -162, 9, 12), LIME[2], .6).f(B.rect(6, -162, 9, 12), LIME[3], .35).f(B.rect(-17, -164, 34, 3), LIME[2]);
        B.f(B.rect(-11, -184, 22, 21), '#efe9dc').f(B.rect(-11, -184, 6, 21), '#ffffff', .5).f(B.rect(5, -184, 6, 21), '#c8c0ae', .7);
        for (const x of [-6, 0, 6]) B.f(`M${x - 2} -166V-178a2 2 0 0 1 4 0V-166Z`, night ? '#ffd890' : '#3a4650');
        B.f(B.rect(-13, -186, 26, 2.6), '#efe9dc');
        const dome = st.tier >= 3 ? GOLD : LEAD;
        B.f('M-12 -186Q-12 -202 0 -204Q12 -202 12 -186Z', dome[0]).f('M-12 -186Q-12 -202 0 -204Q-4 -198 -5 -186Z', dome[2], .55).f('M4 -186Q6 -198 0 -204Q12 -202 12 -186Z', dome[1], .6);
        for (const x of [-6, 0, 6]) B.s(`M${x} -186Q${x * .7} -198 0 -204`, dome[1], .6, .6);
        B.f(B.circ(0, -206, 2.4), dome[0]).f(B.circ(-.8, -206.8, .9), dome[2], .9);
        if (winter) B.f('M-12 -188Q-12 -200 0 -203Q-6 -196 -12 -188Z', '#f4f8fa', .85);
      }
      // the wings: honey limestone in courses, set back a little from the portico; their cornice, frieze and base course
      for (const [xa, xb] of [[-116, -42], [42, 116]]) {
        ashlar(B, r, xa, -94, xb - xa, 86, LIME, 9);
        B.f(B.rect(xa - 4, -100, xb - xa + 8, 6), LIME[2]).f(B.rect(xa - 4, -94, xb - xa + 8, 2.4), 'rgba(50,34,16,.25)').f(B.rect(xa - 2, -103, xb - xa + 4, 3), LIME[0]);   // the cornice and the shadow it casts
        B.f(B.rect(xa - 3, -10, xb - xa + 6, 10), DEEP[0]).f(B.rect(xa - 3, -10, xb - xa + 6, 2), DEEP[2], .85);   // the plinth course
        for (let x = xa + 6; x < xb - 4; x += 13) B.s(`M${x} -8v6`, DEEP[1], .6, .5);
      }
      // the windows: the River Hall in the west wing, the Glasshouse in the east (lit inside once they have something on show)
      for (const x of [-98, -62]) archWin(B, r, x, -80, 16, 50, o, st.wings.includes('f') ? 'f' : '');
      for (const x of [62, 98]) archWin(B, r, x, -80, 16, 50, o, st.wings.includes('b') ? 'b' : '');
      if (st.tier >= 1) for (const x of [-98, -62, 62, 98]) {   // window boxes, at twenty-five on show
        B.f(B.rr(x - 10, -27, 20, 5, 1), OAK[1]).f(B.rect(x - 10, -27, 20, 1.4), OAK[2], .8);
        if (!winter) for (let i = 0; i < 6; i++) { const px = x - 8 + i * 3.2; B.f(B.circ(px, -29 - (i % 2), 1.7), L[1]).f(B.circ(px, -30.4 - (i % 2), 1.1), ['#d8405a', '#f4f2ec', '#e8b040'][i % 3]); }
      }
      // the portico's back wall, in the shade of its ceiling, and the door: tall double doors in green paint under a fanlight
      B.f(B.rect(-46, -104, 92, 96), DEEP[1]).f(B.rect(-46, -104, 92, 12), 'rgba(30,20,10,.3)');
      ashlar(B, r, -46, -92, 92, 84, DEEP, 9); B.f(B.rect(-46, -92, 92, 84), 'rgba(40,28,14,.22)');
      {
        const dw = 26, dh = 52, top = -12 - dh;
        B.f(`M${-dw / 2 - 4} -12V${top + 9}A${dw / 2 + 4} ${dw / 2 + 4} 0 0 1 ${dw / 2 + 4} ${top + 9}V-12Z`, LIME[2]).f(`M${-dw / 2} -12V${top + 9}A${dw / 2} ${dw / 2} 0 0 1 ${dw / 2} ${top + 9}V-12Z`, '#2a1c12');
        B.f(`M${-dw / 2} ${top + 13}A${dw / 2} ${dw / 2} 0 0 1 ${dw / 2} ${top + 13}Z`, night ? '#ffd890' : '#56646c');   // the fanlight
        for (const a of [-50, -90, -130]) { const rr = dw / 2, ax = Math.cos(a * Math.PI / 180) * rr, ay = Math.sin(a * Math.PI / 180) * rr; B.s(`M0 ${top + 13}l${ax.toFixed(1)} ${ay.toFixed(1)}`, LIME[3], .8, .8); }
        B.f(B.rect(-dw / 2, top + 13, dw / 2 - .6, dh - 13), '#2f5a46').f(B.rect(-dw / 2, top + 13, 3, dh - 13), '#4a7a62', .7);   // the west leaf, shut
        B.f(B.rect(.6, top + 13, dw / 2 - .6, dh - 13), night ? '#ffcc78' : '#f0c878', .9).f(B.poly([[.6, top + 13], [8, top + 15], [8, -14], [.6, -12]]), '#2a5040');   // the east leaf open a little: warm light within
        for (const y of [top + 18, top + 33]) B.s(`M${-dw / 2 + 2.4} ${y}h${dw / 2 - 5}v11h${-(dw / 2 - 5)}z`, '#24483a', .8, .9);
        B.f(B.circ(-2.6, top + 31, 1.1), GOLD[0]).f(B.circ(6, top + 31, 1), GOLD[0]);
        B.f(B.rect(-dw / 2 - 5, -12, dw + 10, 2.4), LIME[1]);   // the threshold
        B.f(B.rr(-12, top - 12, 24, 7, 1.4), '#3a2a18').f(B.rr(-11, top - 11, 22, 5, 1.2), GOLD[st.tier >= 2 ? 0 : 1]);   // the brass plate over the door
        B.text('MUSEUM', 0, top - 8.4, 3.6, '#3a2a18', 'Georgia, serif', 'bold');
      }
      // four columns, the entablature with the museum's name cut in its frieze, and the pediment with a carved fish in a wreath
      for (const x of [-40, -16, 16, 40]) column(B, x, -100, -12, 10);
      B.f(B.rect(-52, -112, 104, 12), LIME[0]).f(B.rect(-52, -112, 104, 3), LIME[2]).f(B.rect(-52, -101, 104, 1.6), 'rgba(50,34,16,.3)');
      B.text('THE VALE MUSEUM', .5, -105.4, 6.2, 'rgba(255,248,226,.7)', 'Georgia, serif', 'bold');
      B.text('THE VALE MUSEUM', 0, -106, 6.2, st.tier >= 2 ? GOLD[1] : '#6a5434', 'Georgia, serif', 'bold');
      B.f(B.poly([[-56, -112], [0, -144], [56, -112]]), LIME[2]).f(B.poly([[-48, -114.4], [0, -139], [48, -114.4]]), LIME[1]);
      B.f(B.poly([[-48, -114.4], [0, -139], [0, -135], [-42, -114.4]]), 'rgba(40,28,14,.18)');   // the raking cornice's shadow in the tympanum
      {   // the roundel: a fish curled in a wreath of leaves
        const gc = st.tier >= 2 ? GOLD : [LIME[2], LIME[3], '#fff4dc'];
        B.f(B.circ(0, -124, 8), LIME[0]).f(B.circ(0, -124, 6.4), LIME[1]);
        B.f('M-4.6 -124q4.6 -5 9.2 0q-4.6 5 -9.2 0zM4.6 -124l2.6 -2.6v5.2z', gc[0]).f(B.circ(-2, -124.6, .6), gc[1]);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.f(B.ell(Math.cos(a) * 7.2, -124 + Math.sin(a) * 7.2, 1.6, .9), gc[0], .9); }
      }
      B.s('M-56 -112L0 -144L56 -112', LIME[2], 2.6).s('M-55 -111.4L0 -143L55 -111.4', '#fff4dc', .8, .6);
      if (winter) B.f('M-56 -112L0 -144L56 -112L50 -112L0 -141L-50 -112Z', '#f4f8fa', .9).f(B.rect(-118, -104, 76, 2.6), '#f4f8fa', .85).f(B.rect(42, -104, 76, 2.6), '#f4f8fa', .85);
      // the steps up to the door, each tread lit along its front edge
      for (let i = 0; i < 3; i++) { const w = 104 - i * 7, y = -4 - i * 4; B.f(B.rect(-w / 2, y, w, 4), i % 2 ? LIME[1] : DEEP[0]).f(B.rect(-w / 2, y, w, 1.2), LIME[2], .85); }
      B.f(B.rect(-52, -1, 104, 1.4), 'rgba(40,28,14,.25)');
      // ivy up the west corner, moss on the plinth, grass grown in at the foot
      if (!winter) { for (let i = 0; i < 26; i++) { const t = i / 26, x = -116 + Math.sin(t * 9) * 4 + r() * 8, y = -6 - t * 88 * (.6 + r() * .5); B.f(D().blob(r, x, y, 3.4 + r() * 2, 2.4 + r(), 6, .45), r() < .5 ? L[0] : L[1], .92); } B.s('M-114 -4q4 -30 -1 -56q-4 -20 2 -34', '#5a4630', .9, .6); }
      for (const [x, w] of [[-100, 18], [-70, 10], [84, 14], [108, 10]]) B.f(D().blob(r, x, -3, w, 2.4, 7, .5), MOSS[0], .6);
      B.tufts(r, -124, 0, 14, 9, s).tufts(r, 124, 0, 14, 9, s).tufts(r, -80, 2, 50, 10, s).tufts(r, 80, 2, 50, 10, s);
      if (s === 'spring' || s === 'summer') B.flowers(r, -96, 3, 36, 6, ['#f4f2ec', '#f2c84a', '#c8a0e0']).flowers(r, 98, 3, 30, 5, ['#f4f2ec', '#e86a8a']);
      // urns at the foot of the steps, lamps on the forecourt
      urn(B, r, -58, 6, s); urn(B, r, 58, 6, s);
      lamp(B, -76, 16, night); lamp(B, 76, 16, night);
      if (night) for (const x of [-98, -62, 62, 98]) B.f(B.ell(x, -2, 12, 4), 'rgba(255,214,140,.16)');   // (window light on the ground)
    },
    // what moves: each opened wing's banner sways from its arm, the fish on the cupola turns in the wind, the lamps glow at night
    extra(scene, h, fx, foot, o) {
      const st = parse(o.more), sc = o.scale || 1;
      for (const [id, bx] of WINGS) {
        if (!st.wings.includes(id)) continue;
        const key = K.bake(scene, 'vale-museum-banner|' + id, [-9, -2, 9, 32], B => banner(B, id)); if (!key) continue;
        const y = bx < -40 || bx > 40 ? -90 : -99, im = h.add(K.image(scene, key, fx + bx * sc, foot + y * sc)); if (!im) continue;
        if (sc !== 1) im.setScale(im.scaleX * sc);
        const ph = bx * .07; h.move(im, (node, t, motion) => { if (motion) node.setRotation(Math.sin(t * 1.25 + ph) * .055 + Math.sin(t * 2.9 + ph) * .015); });
      }
      const vk = K.bake(scene, 'vale-museum-vane|' + (st.tier >= 3 ? 'g' : 'i'), [-14, -12, 10, 6], B => vane(B, st.tier >= 3));
      if (vk) { const vim = h.add(K.image(scene, vk, fx, foot - 208 * sc)); if (vim) { const s0 = vim.scaleX * sc; vim.setScale(s0, vim.scaleY * sc); h.move(vim, (node, t, motion) => { if (motion) node.setScale(s0 * (Math.cos(t * .21) * .85 + Math.sign(Math.cos(t * .21)) * .15), node.scaleY); }); } }
      for (const x of [-76, 76]) { h.lights.push({ x: fx + x * sc, y: foot - 62 * sc, radius: 110, pool: true }); if (o.night && typeof GP.glowPool === 'function') GP.glowPool(scene, h, fx + x * sc, foot + 16 * sc, 90, foot - 64 * sc); }
    },
  };
})();
