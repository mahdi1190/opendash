/* =====================================================   GARDEN, the new ground (2.22): the lake with its shore and pier, the Wild woods, the tackle shop, and the
   decorations that show your catches (the aquarium, the bug case, the trophy board, the fish weathervane, the bait bucket).
   Called by the renderer (94-garden-3render.js):

     gardenLakeGround(sc, o)     the shore, the shallows, the deep water and the foam, as part of the ground layer
     gardenWoodsGround(sc, o)    the woodland floor of the east side (or its overgrown sign while it is locked)
     gardenPierGround(sc, o)     the pier's planks, over the water
     gardenWorldProps(sc, o)     scenery that stands up: [{z, x, html}] for the tackle shop, the boat, the reeds, the forest edge

   Everything is drawn in the stage's own units (one cell is 48 x 30), explicit colours only, so the photo mode can paint it.
   ============================================================ */
function _gwN(v) { return Math.round(v * 10) / 10; }
const _GW_WATER = {
  day: { spring: ['#6fb4d8', '#3f86b4'], summer: ['#62aed6', '#2f7aa8'], autumn: ['#6a9fbc', '#3a7494'], winter: ['#b4d4e4', '#82aac4'] },
  dawn: ['#c8a0b8', '#6a7aa8'], dusk: ['#b08ab0', '#4a5a8a'], night: ['#1c3358', '#0c1a38'],
};
function _gwWater(sc) { return sc.tod === 'day' ? (_GW_WATER.day[sc.season] || _GW_WATER.day.summer) : (_GW_WATER[sc.tod] || _GW_WATER.day.summer); }

/* ---------- the lake ---------- */
function gardenLakeGround(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, a = gardenArea('lake'), season = sc.season, u = o.uid;
  const x0 = 0, y0 = base + a.y * ch, w = a.w * cw;   /* 2.23: the lake keeps its own width: new land starts east of it */
  const wa = a.water, wy = base + wa.y * ch, wh = wa.h * ch;
  const sand = _gdrTileCol('sand', season), [wTop, wBot] = _gwWater(sc);
  const frozen = season === 'winter' && sc.rain && sc.rain.snow;
  let s = `<defs><linearGradient id="${u}-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${frozen ? '#c8e0ee' : wTop}"/><stop offset="1" stop-color="${frozen ? '#9ec2d8' : wBot}"/></linearGradient></defs>`;
  // the sand: two rows with a lighter wet band at the water's edge
  s += `<rect x="${x0}" y="${y0}" width="${w}" height="${(wa.y - a.y) * ch + 2}" fill="${sand}"/>`;
  s += `<rect x="${x0}" y="${wy - ch * 0.55}" width="${w}" height="${ch * 0.6}" fill="${_gdaShade(sand, -0.1)}" fill-opacity="0.55"/>`;
  const rnd = gardenRand('lake-sand');
  for (let i = 0; i < 70; i++) { const px = rnd() * w, py = y0 + 3 + rnd() * ((wa.y - a.y) * ch - 8); s += `<ellipse cx="${_gwN(px)}" cy="${_gwN(py)}" rx="${_gwN(1.4 + rnd() * 2.4)}" ry="${_gwN(0.9 + rnd() * 1.2)}" fill="${['#cbbd92', '#e8dcb4', '#b4a67e', '#d8ccaa'][i % 4]}" fill-opacity="0.8"/>`; }
  // the water, in bands: shallows, middle, deep
  s += `<rect x="${x0}" y="${wy}" width="${w}" height="${wh}" fill="url(#${u}-lake)"/>`;
  const zones = [[0, 2, 0.0], [2, 4, 0.1], [4, wa.h, 0.2]];
  for (const [from, to, dark] of zones) if (dark) s += `<rect x="${x0}" y="${wy + from * ch}" width="${w}" height="${(to - from) * ch}" fill="#08243f" fill-opacity="${dark}"/>`;
  // a wavy foam line along the shore and gentle rows of waves
  const wave = (y, amp, ph) => { let d = `M0 ${y}`; for (let x = 0; x <= w; x += 48) d += `Q${x + 12} ${_gwN(y - amp)} ${x + 24} ${y}T${x + 48} ${y}`; return d; };
  s += `<path d="${wave(wy + 1, 3, 0)}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-opacity="${frozen ? 0.9 : 0.6}" ${o.still ? '' : 'class="gd-foam"'}/>`;
  for (let r = 0; r < Math.min(wa.h, 11); r += 2) { const y = wy + (r + 0.55) * ch; s += `<g class="${o.still ? '' : 'gd-waves'}" style="--dl:-${r * 1.7}s"><path d="${wave(y, 2.4, r)}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="${frozen ? 0.5 : 0.24}"/></g>`; }
  const rr = gardenRand('lake-ripples');
  for (let i = 0; i < 9; i++) { const cx = rr() * w, cy = wy + 12 + rr() * (wh - 20); s += `<ellipse class="${o.still ? '' : 'gda-ripple'}" cx="${_gwN(cx)}" cy="${_gwN(cy)}" rx="${_gwN(8 + rr() * 14)}" ry="2" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.1" style="animation-delay:-${_gwN(rr() * 4)}s"/>`; }
  if (sc.tod === 'day' || sc.tod === 'dusk') for (let i = 0; i < 12; i++) { const cx = rr() * w, cy = wy + 8 + rr() * (wh - 12); s += `<path class="${o.still ? '' : 'gd-glint'}" d="M${_gwN(cx - 3)} ${_gwN(cy)}h6M${_gwN(cx)} ${_gwN(cy - 1.4)}v2.8" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.8" stroke-linecap="round" style="animation-delay:-${_gwN(rr() * 5)}s"/>`; }
  // (no fish are drawn here: every shadow in the water is a real fish, 94-garden-fish-6school.js)
  if (sc.tod === 'night') { const mx = w * 0.78; s += `<ellipse cx="${_gwN(mx)}" cy="${_gwN(wy + wh * 0.4)}" rx="70" ry="${_gwN(wh * 0.36)}" fill="#dfe8ff" fill-opacity="0.10"/>`; for (let i = 0; i < 9; i++) s += `<path d="M${_gwN(mx - 26 + i * 6)} ${_gwN(wy + 8 + i * 9)}h${_gwN(18 - i)}" stroke="#f4f1e0" stroke-width="1.6" stroke-opacity="0.5" stroke-linecap="round"/>`; }
  // lily pads and reeds at the far edges (flat scenery in the water, never in the way)
  for (const px of [34, 70, w - 50, w - 96]) s += `<ellipse cx="${px}" cy="${_gwN(wy + 14 + (px % 7))}" rx="9" ry="3.4" fill="#5a9a4a" fill-opacity="0.9"/><ellipse cx="${px + 5}" cy="${_gwN(wy + 14 + (px % 7))}" rx="2" ry="1.2" fill="${frozen ? '#e8f0f4' : '#f2c4d8'}"/>`;
  return s;
}
function gardenPierGround(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'pier');
  const x0 = p.x * cw, x1 = (p.x + p.w) * cw, y0 = base + p.y * ch, y1 = base + (p.y + p.h + gardenPierMore()) * ch, night = sc.tod === 'night' || sc.tod === 'dusk';
  const pal = sc.season === 'winter' ? ['#c4b49a', '#b0a088', '#d0c2aa'] : ['#c49a64', '#b28650', '#d2ac78'], dark = '#6e4c2a', deep = '#4c3218';
  const rnd = gardenRand('pier');
  // its shadow on the water, thrown down and to the right, and the posts' reflections
  let s = `<path d="M${x0 + 3} ${_gwN(y0 + ch * 1.4)}H${x1 + 8}V${y1 + 9}H${x0 + 3}z" fill="#08263e" fill-opacity="0.24"/>`;
  // boards, each its own length of timber: three tones, a line of shade below each, a lit edge above, a nail at each end, grain
  const tones = ['', '', ''];
  let shade = '', lit = '', nails = '', grain = '';
  for (let y = y0, i = 0; y < y1; y += 7.5, i++) {
    const h = Math.min(7, y1 - y), jx = (rnd() - 0.5) * 1.6;
    tones[Math.floor(rnd() * 3)] += `M${_gwN(x0 + jx)} ${_gwN(y)}H${_gwN(x1 + jx)}v${_gwN(h)}H${_gwN(x0 + jx)}z`;
    shade += `M${_gwN(x0 + jx)} ${_gwN(y + h)}H${_gwN(x1 + jx)}`;
    lit += `M${_gwN(x0 + jx + 1)} ${_gwN(y + 0.8)}H${_gwN(x1 + jx - 1)}`;
    nails += `M${_gwN(x0 + 4 + jx)} ${_gwN(y + 3.4)}h0.1M${_gwN(x1 - 4 + jx)} ${_gwN(y + 3.4)}h0.1`;
    for (let k = 0; k < 2; k++) grain += `M${_gwN(x0 + 8 + rnd() * (x1 - x0 - 26))} ${_gwN(y + 2 + rnd() * 3.4)}h${_gwN(6 + rnd() * 14)}`;
  }
  tones.forEach((d, i) => { s += `<path d="${d}" fill="${pal[i]}"/>`; });
  s += `<path d="${shade}" stroke="${deep}" stroke-width="1.1" stroke-opacity="0.62" fill="none"/><path d="${lit}" stroke="#ffeec8" stroke-width="0.8" stroke-opacity="0.4" fill="none"/><path d="${grain}" stroke="${dark}" stroke-width="0.6" stroke-opacity="0.42" fill="none" stroke-linecap="round"/><path d="${nails}" stroke="${deep}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  s += `<path d="M${x0} ${y0}V${y1}H${x1}V${y0}" fill="none" stroke="${deep}" stroke-width="1.5" stroke-linejoin="round"/>`;
  // posts down both sides with their caps, and a rope swagged between them
  let rope = '', posts = '', glow = '';
  for (let y = y0 + 6; y <= y1 - 2; y += ch * 1.5) for (const px of [x0 - 2, x1 + 2]) {
    posts += `<path d="M${_gwN(px - 2.8)} ${_gwN(y + 6)}V${_gwN(y - 5)}q2.8 -2.4 5.6 0V${_gwN(y + 6)}z" fill="${dark}" stroke="${deep}" stroke-width="0.8"/><path d="M${_gwN(px - 1.8)} ${_gwN(y + 5)}V${_gwN(y - 4)}h1.4V${_gwN(y + 5)}z" fill="#c49a64" fill-opacity="0.55"/>`;
    if (y + ch * 1.5 <= y1 - 2) rope += `M${px} ${_gwN(y - 2)}Q${_gwN(px + (px < x0 ? -3.4 : 3.4))} ${_gwN(y + ch * 0.75)} ${px} ${_gwN(y + ch * 1.5 - 2)}`;
    if (night) glow += `<circle cx="${px}" cy="${_gwN(y - 9)}" r="2.2" fill="#ffe9a8"/><circle cx="${px}" cy="${_gwN(y - 9)}" r="11" fill="#ffd98a" fill-opacity="0.24"/>`;
  }
  s += `<path d="${rope}" stroke="#e0d0a8" stroke-width="1.5" fill="none" stroke-linecap="round"/>${posts}${glow}`;
  // a coil of rope at the end
  s += `<ellipse cx="${x1 - 10}" cy="${y1 - 11}" rx="6.4" ry="3.4" fill="#d8c8a0" stroke="#8a7a54" stroke-width="0.9"/><ellipse cx="${x1 - 10}" cy="${y1 - 11}" rx="3.8" ry="1.9" fill="none" stroke="#8a7a54" stroke-width="0.7"/><ellipse cx="${x1 - 10}" cy="${y1 - 11}" rx="1.7" ry="0.8" fill="${deep}"/>`;
  return s;
}

/* ---------- the woods ---------- */
function gardenWoodsGround(sc, o, open) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, a = gardenArea('woods'), season = sc.season;
  const x0 = a.x * cw, y0 = base + a.y * ch, w = a.w * cw, h = a.h * ch;
  if (!open) return '';   // the locked sign is drawn with the other areas
  const floor = _gdrTileCol('forest', season);
  let s = `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="10" fill="${floor}"/>`;
  const rnd = gardenRand('woods-floor');
  // dappled light and shade, leaf litter, ferns, mushrooms and a fallen log
  for (let i = 0; i < 16; i++) s += `<ellipse cx="${_gwN(x0 + 10 + rnd() * (w - 20))}" cy="${_gwN(y0 + 10 + rnd() * (h - 20))}" rx="${_gwN(14 + rnd() * 22)}" ry="${_gwN(6 + rnd() * 9)}" fill="${i % 3 ? '#2f5a2a' : '#ffffe0'}" fill-opacity="${i % 3 ? 0.14 : 0.1}"/>`;
  const lit = season === 'autumn' ? ['#c8702a', '#e0a040', '#a8501c'] : season === 'winter' ? ['#d8d4c4', '#b4b0a0'] : ['#8aaa4a', '#6a9038', '#a8c460'];
  for (let i = 0; i < 90; i++) s += `<ellipse cx="${_gwN(x0 + 6 + rnd() * (w - 12))}" cy="${_gwN(y0 + 6 + rnd() * (h - 12))}" rx="${_gwN(1.6 + rnd() * 2)}" ry="${_gwN(0.8 + rnd())}" fill="${lit[i % lit.length]}" fill-opacity="0.8" transform="rotate(${Math.round(rnd() * 180)} ${_gwN(x0 + 6 + rnd() * 0)} 0)"/>`;
  for (let i = 0; i < 18; i++) { const fx = x0 + 10 + rnd() * (w - 20), fy = y0 + 10 + rnd() * (h - 16); s += `<path d="M${_gwN(fx)} ${_gwN(fy)}q-5 -7 -9 -3M${_gwN(fx)} ${_gwN(fy)}q0 -10 -2 -12M${_gwN(fx)} ${_gwN(fy)}q5 -7 9 -3" stroke="${season === 'winter' ? '#8a9a7a' : '#3f7a3a'}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`; }
  for (let i = 0; i < 6; i++) { const mx = x0 + 14 + rnd() * (w - 28), my = y0 + 14 + rnd() * (h - 24); s += `<path d="M${_gwN(mx - 4)} ${_gwN(my)}q4 -7 8 0z" fill="${['#d8452a', '#f4ecd8', '#c88a3a'][i % 3]}"/><rect x="${_gwN(mx - 1)}" y="${_gwN(my)}" width="2" height="3.4" fill="#f4ecd8"/>`; }
  // a fallen log
  const lx = x0 + w * 0.42, ly = y0 + h * 0.62;
  s += `<rect x="${_gwN(lx)}" y="${_gwN(ly)}" width="38" height="9" rx="4.5" fill="#6a4a2e" stroke="#4a3220" stroke-width="1"/><ellipse cx="${_gwN(lx + 2)}" cy="${_gwN(ly + 4.5)}" rx="3.4" ry="4.4" fill="#c8a06a"/><path d="M${_gwN(lx + 8)} ${_gwN(ly + 3)}h24M${_gwN(lx + 10)} ${_gwN(ly + 6)}h20" stroke="#4a3220" stroke-width="0.8" stroke-opacity="0.6"/><path d="M${_gwN(lx + 14)} ${_gwN(ly)}q3 -4 6 0q3 -3 6 0z" fill="#5a9a3a"/>`;
  return s;
}

/* ---------- things that stand up: sorted with plants and decorations by depth ---------- */
function _gwTree(cx, base, k, pal, season, r) {
  // a big old tree: a tapering trunk with a lit side, a mass of leaves in three tones, shade underneath, light on the upper left
  const A = GART, f = _gwN, trunk = '#54392a', lit = '#7e5a3e', ink = '#33221a';
  const [deep, mid, li] = [pal[0], pal[1], pal[2]];
  let s = A.P('#1a2a14', A.ell(cx + 5 * k, base + 1, 20 * k, 4.6 * k), 0.14) + A.P('#1a2a14', A.ell(cx + 2 * k, base + 0.6, 13 * k, 3 * k), 0.2);
  const tr = `M${f(cx - 6.4 * k)} ${f(base)}Q${f(cx - 3 * k)} ${f(base - 6 * k)} ${f(cx - 3.6 * k)} ${f(base - 36 * k)}H${f(cx + 3.6 * k)}Q${f(cx + 3 * k)} ${f(base - 6 * k)} ${f(cx + 6.8 * k)} ${f(base)}Q${f(cx)} ${f(base + 1.6 * k)} ${f(cx - 6.4 * k)} ${f(base)}z`;
  s += `<path fill="${trunk}" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round" d="${tr}"/>` + A.P(lit, `M${f(cx - 5 * k)} ${f(base - 1)}Q${f(cx - 2 * k)} ${f(base - 8 * k)} ${f(cx - 2.8 * k)} ${f(base - 34 * k)}H${f(cx - 0.6 * k)}Q${f(cx - 0.6 * k)} ${f(base - 10 * k)} ${f(cx - 1.6 * k)} ${f(base - 0.6)}z`, 0.85);
  s += A.S(ink, 0.7, `M${f(cx + 1.6 * k)} ${f(base - 8 * k)}q-0.6 ${f(-6 * k)} 0.3 ${f(-13 * k)}M${f(cx - 0.6 * k)} ${f(base - 14 * k)}v${f(-8 * k)}`, 0.5);
  if (season === 'winter') {
    s += A.S(ink, 3 * k, `M${f(cx)} ${f(base - 30 * k)}l${f(-13 * k)} ${f(-22 * k)}M${f(cx)} ${f(base - 30 * k)}l${f(13 * k)} ${f(-24 * k)}M${f(cx)} ${f(base - 32 * k)}v${f(-32 * k)}`) + A.S(trunk, 1.8 * k, `M${f(cx)} ${f(base - 30 * k)}l${f(-13 * k)} ${f(-22 * k)}M${f(cx)} ${f(base - 30 * k)}l${f(13 * k)} ${f(-24 * k)}M${f(cx)} ${f(base - 32 * k)}v${f(-32 * k)}M${f(cx - 7 * k)} ${f(base - 42 * k)}l${f(-9 * k)} ${f(-5 * k)}M${f(cx + 7 * k)} ${f(base - 44 * k)}l${f(9 * k)} ${f(-7 * k)}M${f(cx)} ${f(base - 52 * k)}l${f(-7 * k)} ${f(-8 * k)}M${f(cx)} ${f(base - 54 * k)}l${f(7 * k)} ${f(-8 * k)}`);
    return s + A.P('#f6f8fb', A.ell(cx - 12 * k, base - 52 * k, 6 * k, 1.8 * k) + A.ell(cx + 12 * k, base - 54 * k, 6 * k, 1.8 * k) + A.ell(cx, base - 64 * k, 4 * k, 1.5 * k));
  }
  const lump = (dx, dy, rx, ry) => A.blob(r, cx + dx * k, base + dy * k, rx * k, ry * k, 9, 0.22);
  const back = lump(-11, -40, 15, 13) + lump(12, -41, 16, 14) + lump(0, -56, 19, 16) + lump(-15, -52, 11, 10) + lump(15, -54, 12, 10);
  s += `<path fill="${deep}" stroke="${A.dk(deep, 0.42)}" stroke-width="1.1" stroke-linejoin="round" d="${back}"/>`;
  s += A.P(mid, lump(-8, -44, 12, 10) + lump(9, -50, 13, 11) + lump(-3, -60, 13, 10));
  s += A.P(li, lump(-12, -50, 7, 5.6) + lump(-4, -64, 8, 5) + lump(5, -55, 5, 3.6), 0.92);
  let lf = ''; for (let i = 0; i < 12; i++) lf += A.leaf(cx + (r() - 0.5) * 36 * k, base - (38 + r() * 30) * k, r() * 6.2, 3.4, 1);
  s += A.P(li, lf, 0.55);
  if (r() < 0.4 && season !== 'autumn') { let fr = ''; for (let i = 0; i < 4; i++) fr += A.circ(cx + (r() - 0.5) * 26 * k, base - (42 + r() * 18) * k, 1.8 * k); s += A.P('#f4d03a', fr); }
  return s;
}
/* a little sign hung over a door: a picture of what is inside (no words: the art may not have any) */
function _gwSignIcon(kind, o) {
  switch (kind) {
    case 'fish': return `<g transform="translate(-9 0) scale(0.2)">${gardenFishArt('perch', { uid: o.uid + 'sg' })}</g>`;
    case 'seed': return '<rect x="-6" y="-5" width="12" height="11" rx="1.4" fill="#f4ecd0" stroke="#8a6a3a" stroke-width="0.8"/><path d="M0 4V-1" stroke="#3f8a3a" stroke-width="1.2"/><path d="M0 -1q-4 -1 -4 -4q4 0 4 4zM0 -1q4 -1 4 -4q-4 0 -4 4z" fill="#5aa84a"/>';
    case 'basket': return '<path d="M-7 -1h14l-2 7h-10z" fill="#c8924a" stroke="#8a5a2a" stroke-width="0.8"/><path d="M-5 -1q5 -9 10 0" fill="none" stroke="#8a5a2a" stroke-width="1.2"/><circle cx="-2" cy="-1" r="2" fill="#d8452a"/><circle cx="2" cy="-1.4" r="2" fill="#7ac24a"/>';
    default: return '';
  }
}
/* one little shop: plank walls, a shingled roof with a chimney, a striped awning, a door with its step, a shuttered window with a window box, a hanging sign; th says how it looks */
function _gwHouse(p, sc, o, th) {
  const A = GART, f = _gwN, W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2, night = sc.tod === 'night' || sc.tod === 'dusk', r = gardenRand('house|' + p.id);
  const wall = sc.season === 'winter' ? _gdaShade(th.wall, 0.08) : th.wall, plank = th.plank, roof = th.roof, roofD = _gdaShade(roof, -0.22), roofL = _gdaShade(roof, 0.14), wallD = _gdaShade(wall, -0.14), wallL = _gdaShade(wall, 0.12), inkW = _gdaShade(plank, -0.3);
  const L = cx - half + 4, R = cx + half - 4, wTop = by - 58, ridge = by - 96;
  let s = A.P('#1a2a14', A.ell(cx + 8, by + 1.6, half + 14, 7), 0.14) + A.P('#1a2a14', A.ell(cx + 3, by + 1, half + 6, 4), 0.2);
  // the walls: planks of three tones, the corner boards, shade under the eaves and down the right
  s += `<path fill="${wall}" stroke="${inkW}" stroke-width="1.2" d="M${f(L)} ${f(by)}V${f(wTop)}H${f(R)}V${f(by)}z"/>`;
  let pa = '', pb = '', lines = '';
  for (let y = wTop + 3, i = 0; y < by - 2; y += 7.6, i++) { const seg = (R - L) / 3, off = (i % 2) * seg / 2; for (let k = -1; k < 3; k++) { const x0 = Math.max(L, L + k * seg + off), x1 = Math.min(R, L + (k + 1) * seg + off); if (x1 - x0 < 2) continue; const d = `M${f(x0)} ${f(y)}H${f(x1)}v7H${f(x0)}z`; if ((k + i * 2 + Math.floor(r() * 3)) % 3 === 0) pa += d; else if ((k + i) % 3 === 1) pb += d; } lines += `M${f(L)} ${f(y)}H${f(R)}`; }
  s += A.P(wallD, pa, 0.5) + A.P(wallL, pb, 0.45) + A.S(inkW, 0.7, lines, 0.42);
  s += A.P(inkW, `M${f(R - 16)} ${f(wTop)}H${f(R)}V${f(by)}H${f(R - 8)}z`, 0.16) + A.P(inkW, A.rect(L, wTop, R - L, 7), 0.26);
  s += `<path fill="${_gdaShade(plank, 0.05)}" stroke="${inkW}" stroke-width="0.8" d="M${f(L - 1)} ${f(by)}V${f(wTop)}h4V${f(by)}zM${f(R - 3)} ${f(by)}V${f(wTop)}h4V${f(by)}z"/>`;
  // a stone footing
  let st = ''; for (let x = L; x < R - 2; x += 8 + r() * 4) st += A.rrect(x, by - 4.6 + r(), 7 + r() * 3, 4.4, 1.4);
  s += `<path fill="#a8a294" stroke="#6c675c" stroke-width="0.6" d="${st}"/>`;
  // the chimney, behind the roof
  const chx = cx + half * 0.44;
  s += `<path fill="#a8644a" stroke="#5e3324" stroke-width="1.1" d="M${f(chx - 5.4)} ${f(by - 66)}V${f(by - 100)}h10.8V${f(by - 66)}z"/><path fill="#c47c5e" d="M${f(chx - 4.4)} ${f(by - 99)}h3.2V${f(by - 70)}h-3.2z"/><path fill="#5e3324" d="M${f(chx - 6.6)} ${f(by - 103)}h13.2v3.2h-13.2z"/>`;
  // the roof: rows of shingles getting shorter toward the ridge, a lit left slope, an overhang with a shadow
  const eL = cx - half - 7, eR = cx + half + 7;
  s += `<path fill="${roofD}" stroke="${_gdaShade(roof, -0.45)}" stroke-width="1.4" stroke-linejoin="round" d="M${f(eL)} ${f(wTop + 3)}L${f(cx)} ${f(ridge)}L${f(eR)} ${f(wTop + 3)}Z"/>`;
  s += A.P(roof, `M${f(eL + 2)} ${f(wTop + 2)}L${f(cx)} ${f(ridge + 2)}L${f(cx + (eR - cx) * 0.52)} ${f(wTop + 2)}Z`);
  s += A.P(roofL, `M${f(eL + 2)} ${f(wTop + 2)}L${f(cx - 4)} ${f(ridge + 6)}L${f(cx - (cx - eL) * 0.32)} ${f(wTop + 2)}Z`, 0.55);
  let sh = '';
  for (let i = 1; i < 7; i++) {
    const t = i / 7, y = wTop + 3 + (ridge - wTop - 3) * t, x0 = eL + (cx - eL) * t, x1 = eR - (eR - cx) * t, step = 11;
    for (let x = x0 + (i % 2 ? step / 2 : 0); x < x1 - 2; x += step) sh += `M${f(x)} ${f(y)}q${f(step / 2)} 4.4 ${f(step)} 0`;
  }
  s += A.S(_gdaShade(roof, -0.42), 0.9, sh, 0.7);
  s += A.S(_gdaShade(roof, -0.45), 2.2, `M${f(eL)} ${f(wTop + 3)}L${f(cx)} ${f(ridge)}L${f(eR)} ${f(wTop + 3)}`) + A.S(roofL, 1, `M${f(eL + 1)} ${f(wTop + 2)}L${f(cx)} ${f(ridge + 0.6)}`, 0.8);
  if (sc.season === 'winter') s += A.P('#f6f8fb', `M${f(eL + 4)} ${f(wTop - 1)}L${f(cx)} ${f(ridge - 2)}L${f(eR - 4)} ${f(wTop - 1)}Q${f(cx + half * 0.5)} ${f(wTop - 12)} ${f(cx)} ${f(ridge + 12)}Q${f(cx - half * 0.5)} ${f(wTop - 12)} ${f(eL + 4)} ${f(wTop - 1)}z`, 0.95);
  // the door, its frame and step
  const d = p.door || { x: Math.floor(p.x + p.w / 2), y: p.y + p.h }, dx = (d.x + 0.5) * cw, dT = by - 37;
  s += `<path fill="${_gdaShade(plank, 0.08)}" stroke="${inkW}" stroke-width="1" d="M${f(dx - 11.5)} ${f(by)}V${f(dT + 5)}Q${f(dx)} ${f(dT - 5)} ${f(dx + 11.5)} ${f(dT + 5)}V${f(by)}z"/>`;
  s += `<path fill="${_gdaShade(th.awn[0], -0.2)}" stroke="${_gdaShade(th.awn[0], -0.5)}" stroke-width="0.9" d="M${f(dx - 9)} ${f(by)}V${f(dT + 6)}Q${f(dx)} ${f(dT - 2)} ${f(dx + 9)} ${f(dT + 6)}V${f(by)}z"/>`;
  s += A.S(_gdaShade(th.awn[0], -0.42), 0.8, `M${f(dx - 3)} ${f(dT + 2.6)}V${f(by)}M${f(dx + 3)} ${f(dT + 2.6)}V${f(by)}`, 0.7) + A.P('#ffffff', `M${f(dx - 8)} ${f(by)}V${f(dT + 6.4)}l2 -1.2V${f(by)}z`, 0.16);
  s += `<circle cx="${f(dx + 5.4)}" cy="${f(by - 16)}" r="1.5" fill="#f0c84e" stroke="#8a6a1a" stroke-width="0.5"/>`;
  s += `<path fill="#b4ae9e" stroke="#6c675c" stroke-width="0.7" d="${A.rrect(dx - 13, by - 2, 26, 4, 1.2)}"/>`;
  // the window, its shutters and a box of flowers
  const ww = Math.max(22, half - 26), wx = dx > cx ? L + 8 : R - 8 - ww, wy = by - 37, gl = night ? '#ffdf8e' : '#bfe2ee', gl2 = night ? '#fff2c0' : '#e8f6fa';
  s += `<path fill="${gl}" stroke="${inkW}" stroke-width="1.3" d="M${f(wx)} ${f(wy)}h${f(ww)}v18h${f(-ww)}z"/><path fill="${gl2}" fill-opacity="0.7" d="M${f(wx + 2)} ${f(wy + 16)}L${f(wx + ww * 0.42)} ${f(wy + 2)}H${f(wx + ww * 0.62)}L${f(wx + ww * 0.22)} ${f(wy + 16)}z"/>`;
  s += A.S(inkW, 1.1, `M${f(wx + ww / 2)} ${f(wy)}v18M${f(wx)} ${f(wy + 9)}h${f(ww)}`);
  const shut = _gdaShade(th.roof, 0.02);
  s += `<path fill="${shut}" stroke="${inkW}" stroke-width="0.8" d="M${f(wx - 6.6)} ${f(wy)}h6v18h-6zM${f(wx + ww + 0.6)} ${f(wy)}h6v18h-6z"/>` + A.S(inkW, 0.5, `M${f(wx - 6)} ${f(wy + 4)}h5M${f(wx - 6)} ${f(wy + 8)}h5M${f(wx - 6)} ${f(wy + 12)}h5M${f(wx + ww + 1)} ${f(wy + 4)}h5M${f(wx + ww + 1)} ${f(wy + 8)}h5M${f(wx + ww + 1)} ${f(wy + 12)}h5`, 0.6);
  s += `<path fill="${_gdaShade(plank, 0.02)}" stroke="${inkW}" stroke-width="0.9" d="M${f(wx - 3)} ${f(wy + 18)}h${f(ww + 6)}l-2 6h${f(-ww - 2)}z"/>`;
  let lv = '', fl = ['', '', ''];
  for (let i = 0; i < ww / 3; i++) { const fx = wx - 1 + (i + 0.5) * (ww + 2) / (ww / 3); lv += A.leaf(fx, wy + 19, (r() - 0.5) * 1.2, 5, 1.6); fl[i % 3] += A.circ(fx + (r() - 0.5) * 1.6, wy + 15 + r() * 2, 1.5); }
  s += A.P('#4f8a3a', lv) + A.P('#e8607a', fl[0]) + A.P('#f2c432', fl[1]) + A.P('#f6f2ea', fl[2]);
  // the awning: stripes with a scalloped edge, darker where it turns under
  const ax0 = L + 4, aw = R - L - 8, ay = by - 52, n = 6;
  for (let i = 0; i < n; i++) { const c = i % 2 ? th.awn[1] : th.awn[0]; s += `<path fill="${c}" stroke="${_gdaShade(th.awn[0], -0.34)}" stroke-width="0.7" d="M${f(ax0 + i * aw / n)} ${f(ay)}h${f(aw / n)}l${f((i + 1 - n / 2) * 0.5)} 11q${f(-aw / (2 * n))} 5 ${f(-aw / n - 0.5)} 0z"/>`; }
  s += A.P('#3a2a18', A.rect(ax0, ay, aw, 2), 0.3) + A.P('#ffffff', A.rect(ax0, ay + 2, aw, 1.6), 0.26) + A.P('#1a1208', `M${f(ax0 + 2)} ${f(ay + 15)}h${f(aw - 4)}v3.6h${f(-aw + 4)}z`, 0.14);
  // the hanging sign
  const sx = dx > cx ? L + 20 : R - 20;
  s += `<g transform="translate(${f(sx)} ${f(by - 66)})"><path d="M-8 -7v-5M8 -7v-5" stroke="${inkW}" stroke-width="1.1"/><rect x="-14" y="-8" width="28" height="17" rx="3" fill="${_gdaShade(plank, -0.1)}"/><rect x="-13" y="-9" width="26" height="16" rx="3" fill="#efe4c8" stroke="${inkW}" stroke-width="1.1"/>${_gwSignIcon(th.icon, o)}</g>`;
  s += th.extra ? th.extra(cx, by, half, plank, o) : '';
  if (night) {
    s += `<circle cx="${f(wx + ww / 2)}" cy="${f(by - 26)}" r="44" fill="#ffe7a8" fill-opacity="0.12"/><circle cx="${f(wx + ww / 2)}" cy="${f(by - 26)}" r="22" fill="#ffe7a8" fill-opacity="0.14"/>`;
    s += `<path fill="#3a2a18" d="M${f(dx - 14)} ${f(by - 42)}h3v4h-3z"/><circle cx="${f(dx - 12.5)}" cy="${f(by - 35)}" r="2.6" fill="#ffe9a8"/><circle cx="${f(dx - 12.5)}" cy="${f(by - 35)}" r="11" fill="#ffd98a" fill-opacity="0.26"/>`;
  }
  return s;
}
const _GW_HOUSES = {
  tackle: { wall: '#c89a64', plank: '#8a6238', roof: '#3f6f8a', awn: ['#d8452a', '#fbf5e6'], icon: 'fish', extra: (cx, by, half, plank, o) => `<path d="M${_gwN(cx - half + 2)} ${_gwN(by - 4)}l-4 -44M${_gwN(cx - half + 8)} ${_gwN(by - 2)}l-2 -48" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><circle cx="${_gwN(cx - half - 2)}" cy="${_gwN(by - 49)}" r="1.6" fill="#d8301a"/><path d="M${_gwN(cx + half - 22)} ${_gwN(by - 14)}l3 14h14l3 -14z" fill="#8a8e92" stroke="#5a5e62" stroke-width="1"/><ellipse cx="${_gwN(cx + half - 12)}" cy="${_gwN(by - 14)}" rx="8" ry="2.4" fill="#cfe0e8"/>${o ? '' : ''}` },
  shop: { wall: '#d8c49a', plank: '#8a6a3a', roof: '#4f8a4a', awn: ['#3f8a4a', '#fbf5e6'], icon: 'seed', extra: (cx, by, half) => `<g><rect x="${_gwN(cx + half - 30)}" y="${_gwN(by - 16)}" width="12" height="16" rx="3" fill="#cdb98c" stroke="#8a6a3a" stroke-width="1"/><path d="M${_gwN(cx + half - 30)} ${_gwN(by - 12)}h12" stroke="#8a6a3a" stroke-width="0.8"/><rect x="${_gwN(cx + half - 17)}" y="${_gwN(by - 12)}" width="11" height="12" rx="3" fill="#d6c496" stroke="#8a6a3a" stroke-width="1"/></g><g transform="translate(${_gwN(cx - half + 14)} ${_gwN(by - 2)})"><path d="M-9 -9h16l-3 9h-10z" fill="#9a8a6a" stroke="#6a5a3a" stroke-width="1"/><circle cx="-4" cy="-11" r="3.4" fill="#e8607a"/><circle cx="2" cy="-12" r="3.4" fill="#f2c432"/><circle cx="6" cy="-10" r="2.8" fill="#b48ae6"/><circle cx="-5" cy="1" r="2.4" fill="#4a4a4a"/><circle cx="5" cy="1" r="2.4" fill="#4a4a4a"/></g>` },
};
/* ---------- the small shore props (2.23): chunky, soft, three tones, the same coloured line as everything else ---------- */
/** Local drawing at (cx, by), the ground at y = 0: the shared line is added, so draw solid shapes in plain fills. */
function _gwInked(cx, by, inner) { return `<g transform="translate(${_gwN(cx)} ${_gwN(by)})" stroke-width="1" stroke-linejoin="round" paint-order="stroke">${_gartInk(inner)}</g>`; }
function _gwWoodPost(x, h, w, snow) { const A = GART, W = GART_PAL.wood; return A.P(W[1], A.rrect(x - w / 2, -h, w, h, 1.6)) + A.P(W[3], A.rect(x - w / 2 + 0.8, -h + 1.2, w * 0.28, h - 2.4), 0.65) + A.P(W[0], A.rect(x + w * 0.16, -h + 1.2, w * 0.28, h - 2.4), 0.4) + (snow ? gartSnowCap(A, x, -h, w * 1.6, 0.8) : ''); }
function _gwStall(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART, Wd = GART_PAL.wood, snow = sc.season === 'winter';
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2;
  let s = `<ellipse cx="${_gwN(cx + 2)}" cy="${_gwN(by + 1)}" rx="${_gwN(half + 8)}" ry="5" fill="#1a2a14" fill-opacity="0.22"/>`;
  let b = _gwWoodPost(-half + 6, 66, 5.4) + _gwWoodPost(half - 6, 66, 5.4);
  // the back wall in the awning's shade, then the counter: planks, a lit top edge
  b += A.P('#d8c490', A.rect(-half + 8, -60, half * 2 - 16, 34)) + A.P('#a88c58', A.rect(-half + 8, -60, half * 2 - 16, 7), 0.55);
  b += A.P(Wd[1], A.rrect(-half + 3, -26, half * 2 - 6, 26, 2.4)) + A.S(Wd[0], 1.4, `M${_gwN(-half + 5)} -18H${_gwN(half - 5)}M${_gwN(-half + 5)} -10H${_gwN(half - 5)}`, 0.55) + A.P(Wd[3], A.rrect(-half + 1, -29, half * 2 - 2, 5, 1.8)) + A.P('#fff4d8', A.rect(-half + 4, -28.2, half * 1.2, 1.3), 0.6);
  // three crates of fruit: round, glossy, too many to count
  const cols = [['#c8352a', '#f06a4a'], ['#5aa83a', '#a2d860'], ['#e8901e', '#ffc04a'], ['#a8408a', '#d880c0'], ['#e8c82a', '#fff08a']];
  const n = Math.max(2, Math.round(half / 15));
  for (let i = 0; i < n; i++) {
    const x = -half + 13 + i * (half * 2 - 26) / (n - 1), T = cols[i % 5];
    b += A.P(Wd[0], A.rrect(x - 9, -39, 18, 11, 1.6)) + A.P(Wd[2], A.rect(x - 8, -37.4, 16, 1.5), 0.7);
    let f = '', g = '';
    for (const [dx, dy] of [[-5, -40], [0, -41.6], [5, -40], [-2.4, -45], [2.8, -45]]) { f += A.circ(x + dx, dy, 3.8); g += A.ell(x + dx - 1.2, dy - 1.3, 1.1, 0.8); }
    b += A.P(T[0], f) + A.P('#ffffff', g, 0.8);
  }
  // the striped awning: fat scallops hanging over a sloped top
  const aw = half * 2 + 10, nS = 7, sw = aw / nS, ax = -aw / 2;
  b += A.P('#b8901e', `M${_gwN(ax + 3)} -76H${_gwN(ax + aw - 3)}L${_gwN(ax + aw)} -60H${_gwN(ax)}z`);
  for (let i = 0; i < nS; i++) {
    const x = ax + i * sw, c = i % 2 ? '#fbf3de' : '#f0b92e', top = ax + 3 + (aw - 6) * (i / nS), top2 = ax + 3 + (aw - 6) * ((i + 1) / nS);
    b += A.P(c, `M${_gwN(top)} -76H${_gwN(top2)}L${_gwN(x + sw)} -60Q${_gwN(x + sw)} -52 ${_gwN(x + sw / 2)} -52Q${_gwN(x)} -52 ${_gwN(x)} -60z`);
  }
  b += A.P('#ffffff', `M${_gwN(ax + 8)} -74H${_gwN(ax + aw * 0.5)}L${_gwN(ax + aw * 0.48)} -71H${_gwN(ax + 7)}z`, 0.4);
  if (snow) b += A.P(GART_PAL.snow, `M${_gwN(ax + 3)} -76.6Q${_gwN(ax + aw / 2)} -82 ${_gwN(ax + aw - 3)} -76.6L${_gwN(ax + aw - 1)} -69Q${_gwN(ax + aw / 2)} -73 ${_gwN(ax + 1)} -69z`);
  // the sign
  b += `<g transform="translate(0 -86)">${A.P('#efe4c8', A.rrect(-15, -9, 30, 18, 3.6))}${_gwSignIcon('basket', o)}</g>`;
  return s + _gwInked(cx, by, b);
}
function _gwBoard(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART, Wd = GART_PAL.wood, snow = sc.season === 'winter';
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2 - 6;
  let s = `<ellipse cx="${_gwN(cx + 2)}" cy="${_gwN(by + 1)}" rx="${_gwN(half + 6)}" ry="4" fill="#1a2a14" fill-opacity="0.22"/>`;
  let b = _gwWoodPost(-half + 5, 50, 6) + _gwWoodPost(half - 5, 50, 6);
  b += A.P(Wd[1], A.rrect(-half, -64, half * 2, 42, 3.4)) + A.P(Wd[3], A.rect(-half + 2, -63, half * 2 - 4, 1.8), 0.6) + A.P('#d8b888', A.rrect(-half + 4.4, -59.4, half * 2 - 8.8, 33, 1.8));
  // the gabled roof: shingled, with a lit left slope
  b += A.P('#8a4a30', `M${_gwN(-half - 6)} -62L0 -78L${_gwN(half + 6)} -62Q0 -59 ${_gwN(-half - 6)} -62z`) + A.P('#c47a52', `M${_gwN(-half - 2)} -62.6L-1 -75.4L${_gwN(-half * 0.2)} -62z`, 0.75) + A.S('#5a2e1c', 1.1, `M${_gwN(-half * 0.6)} -66L${_gwN(-half * 0.3)} -64.4M${_gwN(half * 0.3)} -66.4L${_gwN(half * 0.6)} -64.4`, 0.6);
  if (snow) b += A.P(GART_PAL.snow, `M${_gwN(-half - 5)} -62.6L0 -79.4L${_gwN(half + 5)} -62.6Q${_gwN(half * 0.5)} -67.4 0 -72.6Q${_gwN(-half * 0.5)} -67.4 ${_gwN(-half - 5)} -62.6z`);
  // three notes pinned up, each with a little picture, and a gold star
  const notes = [['#fbf7ee', -0.58, -56, 16, 20, -4, '#e8607a'], ['#fff0b0', -0.02, -57, 17, 16, 3, '#4a8fd8'], ['#cfe8f4', 0.54, -55, 15, 21, -2, '#5aa83a']];
  for (const [c, fx, y, w, h, rot, pin] of notes) {
    const x = fx * half;
    b += `<g transform="rotate(${rot} ${_gwN(x)} ${y})">${A.P(c, A.rrect(x - w / 2, y, w, h, 1))}${A.S('#a8884a', 1.3, `M${_gwN(x - w / 2 + 2.6)} ${y + h * 0.5}h${w - 5.2}M${_gwN(x - w / 2 + 2.6)} ${y + h * 0.72}h${w - 7.6}`, 0.8)}${A.P(pin, A.circ(x, y + 1.8, 2))}</g>`;
  }
  b += `<g transform="translate(${_gwN(half - 11)} -28)">${A.P('#f2c432', 'M0 -8l2.5 5.2 5.7 .7-4.2 3.9 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z')}</g>`;
  return s + _gwInked(cx, by, b);
}
function _gwLectern(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART, Wd = GART_PAL.wood;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx + 1)}" cy="${_gwN(by + 1)}" rx="16" ry="3.6" fill="#1a2a14" fill-opacity="0.22"/>`;
  let b = A.P(Wd[0], A.rrect(-11, -3.6, 22, 3.8, 1.4)) + _gwWoodPost(0, 30, 7);
  b += A.P(Wd[1], 'M-21 -28L-14 -43H14L21 -28Q0 -25 -21 -28z') + A.P('#fbf7ee', 'M-18 -30L-12 -41.4H-0.6L-0.6 -29.4Q-9 -31 -18 -30z') + A.P('#f2ebda', 'M18 -30L12 -41.4H0.6L0.6 -29.4Q9 -31 18 -30z');
  b += A.S('#9a8a68', 1.4, 'M-13 -33h8M-11.4 -36.4h7') + `<g transform="translate(8 -36) scale(0.2)">${gardenFishArt('carp', { uid: o.uid + 'jn' })}</g>`;
  b += A.P('#f4f0e6', 'M16 -41Q19 -52 27 -56Q26 -46 18 -39z') + A.S('#c8c0a8', 1, 'M17 -40Q20 -47 25 -53', 0.9);
  return s + _gwInked(cx, by, b);
}
function _gwTripod(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx + 1)}" cy="${_gwN(by + 1)}" rx="16" ry="3.4" fill="#1a2a14" fill-opacity="0.2"/>`;
  let b = A.S('#5a3e24', 3.6, 'M0 -30L-13 0M0 -30L13 0M0 -30L1 -2') + A.S('#a88056', 1.3, 'M-0.6 -30L-13.4 -1M-0.4 -28L0.6 -3', 0.85);
  b += A.P('#5a6068', A.rrect(-14, -50, 28, 21, 4.4)) + A.P('#8a929a', A.rrect(-12, -48.4, 24, 3.4, 1.4), 0.75) + A.P('#2a2e34', A.rect(-14, -36, 28, 2), 0.35) + A.P('#4a5056', A.rrect(-10, -54, 11, 5, 1.4)) + A.P('#e8c84a', A.rrect(6, -53, 5, 3.6, 1));
  b += A.P('#2f3438', A.circ(2, -39.4, 9)) + A.P('#2f5a8a', A.circ(2, -39.4, 5.6)) + A.P('#7ab4e4', A.ell(0.2, -41.2, 2.4, 1.7), 0.9) + A.P('#ffffff', A.circ(4.6, -36.8, 0.9), 0.7);
  return s + _gwInked(cx, by, b);
}
function _gwPostbox(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART, snow = sc.season === 'winter';
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx + 1)}" cy="${_gwN(by + 1)}" rx="12" ry="3.2" fill="#1a2a14" fill-opacity="0.2"/>`;
  let b = _gwWoodPost(0, 26, 6);
  b += A.P('#c8302a', 'M-13 -24V-36Q-13 -46 -3 -46H3Q13 -46 13 -36V-24z') + A.P('#ee6a5a', 'M-10.4 -28V-36Q-10.4 -43.4 -3.4 -43.6H-1.4Q-7 -41 -7 -28z', 0.75) + A.P('#7a1a14', A.rrect(-7, -34.6, 14, 2.8, 1.4)) + A.P('#7a1a14', A.rect(-13, -24, 26, 1.4), 0.5);
  b += `<g transform="rotate(-16 13 -34)">${A.P('#7a1a14', A.rect(13, -46, 2.6, 14))}${A.P('#f2c432', A.rrect(15, -46, 9, 6, 1))}</g>`;
  if (snow) b += gartSnowCap(A, 0, -46, 20, 1);
  b += `<g transform="translate(-14 -5.6) rotate(-8)">${A.P('#fbf7ee', A.rrect(0, 0, 11, 7.4, 1))}${A.S('#a8884a', 1, 'M0.8 1L5.5 4.6L10.2 1')}</g>`;
  return s + _gwInked(cx, by, b);
}
function _gwSundial(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, A = GART, St = GART_PAL.stone;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx + 1)}" cy="${_gwN(by + 1)}" rx="16" ry="4" fill="#1a2a14" fill-opacity="0.22"/>`;
  let b = A.P(St[1], A.rrect(-12, -4, 24, 4.4, 1.4)) + A.P(St[2], 'M-8 -4L-6 -19H6L8 -4z') + A.P(St[3], 'M-6 -4L-4.4 -18H-1.4L-3 -4z', 0.7) + A.P(St[0], 'M4 -4L3.6 -18H6L8 -4z', 0.35);
  b += A.P('#a8841a', A.ell(0, -21, 16.4, 7)) + A.P('#e0bc5a', A.ell(0, -22, 15, 6)) + A.P('#f2d88a', A.ell(-4, -23.4, 7, 2.2), 0.8);
  let d = '';
  for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; d += `M${_gwN(Math.cos(a) * 9.4)} ${_gwN(-22 + Math.sin(a) * 3.8)}l${_gwN(Math.cos(a) * 2.8)} ${_gwN(Math.sin(a) * 1.1)}`; }
  b += A.S('#6a4a0a', 1.1, d) + A.P('#8a6a14', 'M-1.4 -22L6.4 -22L-0.6 -33z') + A.P('#c8a02e', 'M-1.2 -23L-0.8 -31L3 -23z', 0.8);
  if (sc.season !== 'winter') { for (const [dx, c] of [[-15, '#e8607a'], [13, '#f2c432'], [18, '#b48ae6']]) b += A.S('#3f8a3a', 1.5, `M${dx} 0.5v-4`) + A.P(c, gartScallop(dx, -5, 2.6, 5, 1.5)) + A.P('#fff4c8', A.circ(dx, -5, 0.9)); }
  return s + _gwInked(cx, by, b);
}
function _gwBoat(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'jetty-post'), A = GART, Wd = GART_PAL.wood;
  const px = (p.x + 0.5) * cw, py = base + (p.y + 1) * ch - 4, bx = 38, by = 14;
  const post = _gwWoodPost(0, 28, 6.4) + A.P(Wd[3], A.ell(0, -28, 3.2, 1.3));
  let s = `<g transform="translate(${_gwN(px)} ${_gwN(py)})"><path d="M0 -20q14 6 24 20" stroke="#d8c8a0" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>` + _gwInked(px, py, post);
  let boat = A.P('#7a4a2a', `M${bx - 31} ${by - 8}Q${bx} ${by + 9} ${bx + 31} ${by - 8}L${bx + 25} ${by + 3}Q${bx} ${by + 14} ${bx - 25} ${by + 3}z`);
  boat += A.P('#b4784a', `M${bx - 31} ${by - 8}Q${bx} ${by + 2} ${bx + 31} ${by - 8}L${bx + 29} ${by - 3}Q${bx} ${by + 8} ${bx - 29} ${by - 3}z`) + A.P('#e8d0a0', `M${bx - 31} ${by - 9}Q${bx} ${by} ${bx + 31} ${by - 9}Q${bx} ${by - 4} ${bx - 31} ${by - 9}z`) + A.P('#6a4426', A.rrect(bx - 10, by - 6, 20, 3, 1.2), 0.9);
  boat += A.S('#5a3a20', 2.2, `M${bx + 5} ${by - 8}L${bx + 24} ${by + 9}`) + A.P('#c89a60', A.ell(bx + 25, by + 10, 3.4, 1.8));
  const water = `<ellipse cx="${_gwN(px + bx + 1)}" cy="${_gwN(py + by + 10)}" rx="31" ry="4.8" fill="#0a2a46" fill-opacity="0.22"/><path d="M${_gwN(px + bx - 26)} ${_gwN(py + by + 12)}q8 2 16 0M${_gwN(px + bx + 8)} ${_gwN(py + by + 13)}q7 1.6 15 0" stroke="#ffffff" stroke-width="1.3" fill="none" stroke-opacity="0.65" stroke-linecap="round"/>`;
  return s + `<g class="${o.still ? '' : 'gda-bob'}">${water}${_gwInked(px, py, boat)}</g>`;
}
function _gwReeds(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'reed-bank');
  const rnd = gardenRand('reeds'), by = base + (p.y + 1) * ch - 3, pal = sc.season === 'winter' ? ['#a8a078', '#8a8260'] : sc.season === 'autumn' ? ['#b89a4a', '#8a7a3a'] : ['#7aaa42', '#4f8430'];
  const stems = ['', ''];
  let heads = '', glint = '';
  for (let i = 0; i < 15; i++) {
    const x = (p.x + rnd() * p.w) * cw, h = 28 + rnd() * 24, lean = (rnd() - 0.5) * 10, tx = x + lean, ty = by - h;
    stems[i % 2] += `M${_gwN(x)} ${_gwN(by)}q${_gwN(lean * 0.4)} ${_gwN(-h * 0.5)} ${_gwN(lean)} ${_gwN(-h)}`;
    if (i % 3 === 0) { heads += `<rect x="${_gwN(tx - 2.6)}" y="${_gwN(ty - 7)}" width="5.2" height="14" rx="2.6"/>`; glint += `<rect x="${_gwN(tx - 1.6)}" y="${_gwN(ty - 5)}" width="1.4" height="6" rx="0.7"/>`; }
  }
  return `<g class="${o.still ? '' : 'gda-sway'}"><path d="${stems[1]}" stroke="${pal[1]}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${stems[0]}" stroke="${pal[0]}" stroke-width="2.6" fill="none" stroke-linecap="round"/><g fill="#7a4a2a" stroke="#4a2c18" stroke-width="0.9">${heads}</g><g fill="#b4845a">${glint}</g></g>`;
}
/** The standing scenery: [{z, x, html}] sorted in with plants and decorations. */
function gardenWorldProps(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, out = [], open = new Set(sc.areas || []);
  const wrap = (cls, z, x, inner, key) => ({ z, x, html: `<g class="gd-it gd-prop ${cls}" data-sig="${gardenHash(key + inner.length + sc.tod + sc.season).toString(36)}" data-prop="${key}" data-z="${z}" data-x="${x}">${inner}</g>` });
  // a row of GARDEN_PROPS is drawn by its `kind`, from this table: a new building is one row there and one function here
  const art = { tackle: (p) => _gwHouse(p, sc, o, _GW_HOUSES.tackle), shop: (p) => _gwHouse(p, sc, o, _GW_HOUSES.shop), stall: (p) => _gwStall(p, sc, o), board: (p) => _gwBoard(p, sc, o), lectern: (p) => _gwLectern(p, sc, o), tripod: (p) => _gwTripod(p, sc, o), postbox: (p) => _gwPostbox(p, sc, o), sundial: (p) => _gwSundial(p, sc, o), bench: (p) => (typeof gardenCraftBenchArt === 'function' ? gardenCraftBenchArt(p, sc, o) : ''), boat: () => _gwBoat(sc, o), reeds: () => _gwReeds(sc, o) };
  for (const p of GARDEN_PROPS) {
    const draw = p.kind && art[p.kind]; if (!draw) continue;
    const inner = draw(p);
    if (inner) out.push(wrap('gd-prop-' + p.kind + (p.act ? ' gd-prop-click' : ''), Math.ceil(p.y + p.h), p.x, inner, p.id));
  }
  if (typeof gardenLandWorldProps === 'function') for (const r of gardenLandWorldProps(sc, o)) out.push(wrap(r.cls, r.z, r.x, r.inner, r.key));   // the land office and what has been built on the land
  // what has been built for the lake stands where it is (94-garden-fish-7gear.js). pointer-events: a click there is still a click on the water
  if (typeof gardenWorksArt === 'function') for (const r of gardenWorksArt(sc)) out.push(wrap('gd-prop-work', r.y, r.x, `<g pointer-events="none" transform="translate(${_gwN(r.x * cw)} ${_gwN(base + r.y * ch)})">${r.svg}</g>`, 'work-' + r.key));
  // the forest edge: big trees all down the east side, so the woods have a back wall
  const pal = (GART_PAL.leaf[sc.season] || GART_PAL.leaf.summer);
  const rnd = gardenRand('forest-edge');
  for (let y = 0; y < 11; y++) {
    const cx = (27 + 0.5 + (rnd() - 0.5) * 1.3) * cw, by = base + (y + 1) * ch - 4, k = 0.95 + rnd() * 0.5;
    out.push(wrap('gd-prop-tree', y + 1, 27, _gwTree(cx, by, k, pal, sc.season, rnd), 'fe' + y));
  }
  // a few trees on the north-east skyline behind the woods
  void ch; void open; void o;
  return out;
}

/* ---------- decorations that show your catches ---------- */
/** The showcase handed to the art: {f: [[id, q, cm]], b: [id]}. gardenArt receives it as o.show. */
(function () {
  if (typeof gartDefine !== 'function') return;
  const A = GART, P = A.P, S = A.S, f1 = A.f1;
  const wood = GART_PAL.wood, glass = '#cfe8f2';
  const fishAt = (id, uid, x, y, k, flip, cls, style) => {
    const art = gardenFishArt(id, { uid });
    return `<g class="${cls || ''}" style="${style || ''}"><g transform="translate(${f1(x)} ${f1(y)}) scale(${flip ? -k : k} ${k})">${art}</g></g>`;
  };
  gartDefine('decor:aquarium', {
    box: [128, 70], fit: 'none',
    draw(o, r) {
      const show = (o.show && o.show.f) || [], night = o.night;
      let s = P('#1a1410', A.ell(0, 1, 56, 5), 0.18);
      // a wooden stand, then the glass tank
      s += P(wood[1], A.rect(-54, -22, 108, 22)) + P(wood[0], A.rect(-54, -22, 108, 3)) + P(wood[2], A.rect(-54, -22, 4, 22), 0.5);
      s += P(wood[0], A.rect(-48, -2, 6, 2)) + P(wood[0], A.rect(42, -2, 6, 2));
      const tw = 100, th = 44, tx = -tw / 2, ty = -22 - th;
      s += `<defs><linearGradient id="${o.uid}-aq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#2a5a8a' : '#9ad4ee'}"/><stop offset="1" stop-color="${night ? '#10305a' : '#3f8ab8'}"/></linearGradient></defs>`;
      s += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="3" fill="url(#${o.uid}-aq)"/>`;
      s += P('#e0cf9a', A.rect(tx + 1, ty + th - 8, tw - 2, 7)) + P('#b8a678', A.rect(tx + 1, ty + th - 8, tw - 2, 1.4), 0.6);
      // pebbles, weed and bubbles
      for (let i = 0; i < 9; i++) s += P(['#9a8e7a', '#c8bca0', '#7a6e5c'][i % 3], A.ell(tx + 8 + i * 11 + r() * 4, ty + th - 5, 3 + r() * 2, 1.6));
      for (const [wx, hh, c] of [[-38, 22, '#3f8a4a'], [-34, 16, '#5aa85a'], [34, 20, '#3f8a4a'], [38, 14, '#5aa85a']]) s += `<g class="gda-sway" style="${A.T(r, 0, 4)}">${S(c, 2.4, `M${wx} ${ty + th - 6}q-4 ${-hh * 0.5} 1 ${-hh}M${wx + 3} ${ty + th - 6}q4 ${-hh * 0.4} -1 ${-hh * 0.8}`)}</g>`;
      for (let i = 0; i < 4; i++) s += `<g class="gda-bob" style="${A.T(r, 0, 3)}">${P('#ffffff', A.circ(-6 + i * 5, ty + th - 14 - i * 8, 1.4 + (i % 2) * 0.7), 0.6)}</g>`;
      // the fish: your showcase, or a couple of goldfish until you have some
      const list = show.length ? show : [['goldfish', 0, 14], ['bitterling', 0, 6]];
      list.slice(0, 6).forEach((e, i) => {
        const row = i % 3, col = Math.floor(i / 3);
        const x = tx + 18 + col * 34 + (i % 2) * 8, y = ty + 9 + row * 11;
        const k = show.length ? 0.2 + Math.min(0.14, (Number(e[2]) || 20) / 700) : 0.22;
        s += fishAt(e[0], o.uid + 'q' + i, x, y, k, i % 2, 'gfa-swim', `--sx:${f1(5 + r() * 10)}px;animation-delay:-${f1(r() * 6)}s;animation-duration:${f1(6 + r() * 6)}s`);
      });
      // the glass: a frame, a lid light, a shine
      s += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="3" fill="none" stroke="#e8f4f8" stroke-width="2.2" stroke-opacity="0.9"/>` + P('#ffffff', A.rect(tx + 4, ty + 4, 6, th - 14), 0.22) + P('#ffffff', A.rect(tx + 14, ty + 4, 2, th - 14), 0.16);
      s += P(wood[0], A.rect(tx - 2, ty - 5, tw + 4, 5)) + P(night ? '#d8f0ff' : '#fff6d8', A.rect(tx + 6, ty - 3, tw - 12, 1.6), night ? 0.95 : 0.6);
      if (night) s += `<g class="gda-glow">${P('#8ad0ff', A.ell(0, ty + th / 2, 62, 34), 0.12)}</g>`;
      return s;
    },
  });
  gartDefine('decor:bug-case', {
    box: [64, 70], fit: 'none',
    draw(o, r) {
      const show = (o.show && o.show.b) || [];
      let s = P('#1a1410', A.ell(0, 1, 26, 3.2), 0.18);
      s += P(wood[0], A.rect(-6, -10, 12, 10)) + P(wood[1], A.rect(-22, -12, 44, 5));   // a small stand
      s += P(wood[1], A.rrect(-27, -64, 54, 54, 3)) + P(wood[0], A.rrect(-27, -64, 54, 4, 2));
      s += P('#efe3c4', A.rect(-23, -58, 46, 44));   // cork-paper back
      for (let i = 0; i < 12; i++) s += P('#d8c8a0', A.circ(-20 + (i % 4) * 13 + r() * 2, -54 + Math.floor(i / 4) * 14, 0.9), 0.8);
      const bugs = show.length ? show.slice(0, 9) : [];
      bugs.forEach((id, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = -15 + col * 15, y = -48 + row * 14;
        s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(0.5) rotate(${(i * 37) % 50 - 25})">${gardenBugArt(id, { uid: o.uid + 'b' + i, glow: false })}</g>${P('#3a3a3a', A.circ(x, y, 0.8))}`;
      });
      if (!bugs.length) s += S('#b8a678', 1, `M-16 -30h32M-16 -44h32`, 0.5);
      s += `<rect x="-23" y="-58" width="46" height="44" fill="${glass}" fill-opacity="0.2"/>` + P('#ffffff', 'M-21 -56l14 0 -10 40 -4 0z', 0.35);
      s += `<rect x="-27" y="-64" width="54" height="54" rx="3" fill="none" stroke="${wood[0]}" stroke-width="2"/>`;
      return s;
    },
  });
  gartDefine('decor:trophy-board', {
    box: [128, 70], fit: 'none',
    draw(o, r) {
      const show = ((o.show && o.show.f) || []).slice().sort((a, b) => b[2] - a[2]).slice(0, 3);
      let s = P('#1a1410', A.ell(0, 1, 50, 4.4), 0.18);
      s += P(wood[0], A.rect(-48, -42, 6, 42)) + P(wood[0], A.rect(42, -42, 6, 42));
      s += P(wood[1], A.rrect(-56, -66, 112, 40, 4)) + P(wood[2], A.rrect(-56, -66, 112, 5, 3), 0.7) + P(wood[0], A.rrect(-56, -30, 112, 4, 2));
      s += P('#6a4a2e', A.rrect(-50, -60, 100, 28, 2));
      const picks = show.length ? show : [['carp', 2, 60], ['perch', 1, 30], ['pike', 3, 90]];
      picks.forEach((e, i) => {
        const x = -32 + i * 32, y = -46;
        s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(0.34 + Math.min(0.1, (Number(e[2]) || 30) / 800))}) rotate(${(i - 1) * 6})">${gardenFishArt(e[0], { uid: o.uid + 't' + i })}</g>`;
        s += P('#e8c24a', A.rrect(x - 7, -36, 14, 3.4, 1)) + P('#8a6a1a', A.rect(x - 5, -35.4, 10, 0.8), 0.5);
      });
      s += P('#ffffff', A.rect(-48, -62, 30, 1.6), 0.18);
      return s;
    },
  });
  gartDefine('decor:bait-bucket', {
    box: [40, 40], fit: 'none',
    draw(o, r) {
      let s = P('#1a1410', A.ell(0, 1, 13, 2.6), 0.2);
      s += P('#7a8288', 'M-11 -24l3 24h16l3 -24z') + P('#a8b0b6', 'M-11 -24l3 24h6l-2 -24z', 0.7) + P('#4a5056', A.ell(0, -24, 11, 3)) + P('#2f6a98', A.ell(0, -24, 9, 2.2), 0.9);
      s += S('#7a8288', 1.4, 'M-10 -24Q0 -42 10 -24');
      s += `<g class="gda-sway" style="transform-origin:4px -24px;${A.T(r, 0, 3)}"><g transform="translate(5 -29) rotate(-70) scale(0.16)">${gardenFishArt('minnow', { uid: o.uid + 'k' })}</g></g>`;
      s += S('#d88a8a', 1.4, 'M-14 -2q3 -4 6 0t6 0', 0.9);
      void o;
      return s;
    },
  });
})();
