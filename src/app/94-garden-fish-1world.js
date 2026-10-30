/* ============================================================
   GARDEN, the new ground (2.22): the lake with its shore and pier, the Wild woods, the tackle shop, and the
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
  const x0 = 0, y0 = base + a.y * ch, w = W.cols * cw;
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
  const zones = [[0, 2, 0.0], [2, 4, 0.1], [4, 5, 0.2]];
  for (const [from, to, dark] of zones) if (dark) s += `<rect x="${x0}" y="${wy + from * ch}" width="${w}" height="${(to - from) * ch}" fill="#08243f" fill-opacity="${dark}"/>`;
  // a wavy foam line along the shore and gentle rows of waves
  const wave = (y, amp, ph) => { let d = `M0 ${y}`; for (let x = 0; x <= w; x += 48) d += `Q${x + 12} ${_gwN(y - amp)} ${x + 24} ${y}T${x + 48} ${y}`; return d; };
  s += `<path d="${wave(wy + 1, 3, 0)}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-opacity="${frozen ? 0.9 : 0.6}" ${o.still ? '' : 'class="gd-foam"'}/>`;
  for (let r = 0; r < 5; r += 2) { const y = wy + (r + 0.55) * ch; s += `<g class="${o.still ? '' : 'gd-waves'}" style="--dl:-${r * 1.7}s"><path d="${wave(y, 2.4, r)}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="${frozen ? 0.5 : 0.24}"/></g>`; }
  const rr = gardenRand('lake-ripples');
  for (let i = 0; i < 9; i++) { const cx = rr() * w, cy = wy + 12 + rr() * (wh - 20); s += `<ellipse class="${o.still ? '' : 'gda-ripple'}" cx="${_gwN(cx)}" cy="${_gwN(cy)}" rx="${_gwN(8 + rr() * 14)}" ry="2" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.1" style="animation-delay:-${_gwN(rr() * 4)}s"/>`; }
  if (sc.tod === 'day' || sc.tod === 'dusk') for (let i = 0; i < 12; i++) { const cx = rr() * w, cy = wy + 8 + rr() * (wh - 12); s += `<path class="${o.still ? '' : 'gd-glint'}" d="M${_gwN(cx - 3)} ${_gwN(cy)}h6M${_gwN(cx)} ${_gwN(cy - 1.4)}v2.8" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.8" stroke-linecap="round" style="animation-delay:-${_gwN(rr() * 5)}s"/>`; }
  // the shadows of fish, slowly going about their day
  if (!o.still && sc.tod !== 'night') { const rs = gardenRand('lake-shadows'); for (let i = 0; i < 6; i++) { const cy = wy + (1.2 + rs() * 3.4) * ch, cx = rs() * w, k = 0.8 + (cy - wy) / wh * 0.9; s += `<g class="gd-shadowfish" style="--dx:${Math.round(90 + rs() * 160)}px;animation-duration:${Math.round(34 + rs() * 40)}s;animation-delay:-${Math.round(rs() * 40)}s"><ellipse cx="${_gwN(cx)}" cy="${_gwN(cy)}" rx="${_gwN(10 * k)}" ry="${_gwN(3.2 * k)}" fill="#06223c" fill-opacity="0.16"/><path d="M${_gwN(cx - 9 * k)} ${_gwN(cy)}l${_gwN(-6 * k)} ${_gwN(-3 * k)}v${_gwN(6 * k)}z" fill="#06223c" fill-opacity="0.16"/></g>`; } }
  if (sc.tod === 'night') { const mx = w * 0.78; s += `<ellipse cx="${_gwN(mx)}" cy="${_gwN(wy + wh * 0.4)}" rx="70" ry="${_gwN(wh * 0.36)}" fill="#dfe8ff" fill-opacity="0.10"/>`; for (let i = 0; i < 9; i++) s += `<path d="M${_gwN(mx - 26 + i * 6)} ${_gwN(wy + 8 + i * 9)}h${_gwN(18 - i)}" stroke="#f4f1e0" stroke-width="1.6" stroke-opacity="0.5" stroke-linecap="round"/>`; }
  // lily pads and reeds at the far edges (flat scenery in the water, never in the way)
  for (const px of [34, 70, w - 50, w - 96]) s += `<ellipse cx="${px}" cy="${_gwN(wy + 14 + (px % 7))}" rx="9" ry="3.4" fill="#5a9a4a" fill-opacity="0.9"/><ellipse cx="${px + 5}" cy="${_gwN(wy + 14 + (px % 7))}" rx="2" ry="1.2" fill="${frozen ? '#e8f0f4' : '#f2c4d8'}"/>`;
  return s;
}
function gardenPierGround(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'pier');
  const x0 = p.x * cw, x1 = (p.x + p.w) * cw, y0 = base + p.y * ch, y1 = base + (p.y + p.h) * ch;
  const wood = sc.season === 'winter' ? '#b6a48a' : '#b98d58', dark = '#7a5530', night = sc.tod === 'night' ? 0.35 : 0;
  let s = '';
  s += `<rect x="${x0 - 2}" y="${y0 + ch * 1.1}" width="${x1 - x0 + 4}" height="${y1 - y0 - ch * 1.1 + 5}" rx="3" fill="#0a2a46" fill-opacity="0.22"/>`;   // shadow on the water
  s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${wood}" stroke="${dark}" stroke-width="2"/>`;
  for (let y = y0 + 6; y < y1; y += 7.5) s += `<path d="M${x0} ${_gwN(y)}H${x1}" stroke="${dark}" stroke-width="1" stroke-opacity="0.5"/>`;
  const rnd = gardenRand('pier');
  for (let i = 0; i < 26; i++) s += `<path d="M${_gwN(x0 + 3 + rnd() * (x1 - x0 - 8))} ${_gwN(y0 + 2 + rnd() * (y1 - y0 - 4))}h${_gwN(3 + rnd() * 6)}" stroke="${dark}" stroke-width="0.7" stroke-opacity="0.4"/>`;
  s += `<rect x="${x0}" y="${y0}" width="2.6" height="${y1 - y0}" fill="#ffffff" fill-opacity="0.16"/>`;
  // posts and a rope along both sides
  for (let y = y0 + 6; y <= y1 - 2; y += ch * 1.5) for (const px of [x0 - 2, x1 + 2]) s += `<rect x="${px - 2.6}" y="${_gwN(y - 3)}" width="5.2" height="7" rx="1.4" fill="${dark}"/><rect x="${px - 2.6}" y="${_gwN(y - 3)}" width="2" height="7" rx="1" fill="#ffffff" fill-opacity="0.16"/>`;
  s += `<path d="M${x0 - 2} ${y0 + 3}Q${x0 - 6} ${_gwN((y0 + y1) / 2)} ${x0 - 2} ${y1 - 3}M${x1 + 2} ${y0 + 3}Q${x1 + 6} ${_gwN((y0 + y1) / 2)} ${x1 + 2} ${y1 - 3}" stroke="#d8c8a0" stroke-width="1.4" fill="none"/>`;
  // a coil of rope and a lantern at the end
  s += `<ellipse cx="${x1 - 10}" cy="${y1 - 11}" rx="6" ry="3" fill="#d8c8a0" stroke="#a89870" stroke-width="1"/><ellipse cx="${x1 - 10}" cy="${y1 - 11}" rx="2.6" ry="1.2" fill="${dark}"/>`;
  if (night) for (let y = y0 + 6; y <= y1 - 2; y += ch * 1.5) for (const px of [x0 - 2, x1 + 2]) s += `<circle class="${o.still ? '' : 'gd-halo'}" cx="${px}" cy="${_gwN(y - 8)}" r="15" fill="#ffd98a" fill-opacity="0.22"/><circle cx="${px}" cy="${_gwN(y - 8)}" r="2.2" fill="#ffe9a8"/>`;
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
  // a big tree seen from the front: a trunk and three lumps of canopy
  const trunk = '#5a3c26', tr2 = '#7a5436';
  const [deep, mid, lit] = [pal[0], pal[1], pal[2]];
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(base + 1)}" rx="${_gwN(14 * k)}" ry="${_gwN(3.6 * k)}" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<path d="M${_gwN(cx - 4 * k)} ${_gwN(base)}q1 ${_gwN(-18 * k)} ${_gwN(-1 * k)} ${_gwN(-34 * k)}h${_gwN(9 * k)}q${_gwN(-2 * k)} ${_gwN(16 * k)} ${_gwN(1 * k)} ${_gwN(34 * k)}z" fill="${trunk}"/><path d="M${_gwN(cx - 4 * k)} ${_gwN(base)}q1 ${_gwN(-18 * k)} ${_gwN(-1 * k)} ${_gwN(-34 * k)}h${_gwN(3 * k)}q-1 ${_gwN(16 * k)} ${_gwN(1 * k)} ${_gwN(34 * k)}z" fill="${tr2}"/>`;
  if (season === 'winter') {
    s += `<path d="M${_gwN(cx)} ${_gwN(base - 28 * k)}l${_gwN(-12 * k)} ${_gwN(-22 * k)}M${_gwN(cx)} ${_gwN(base - 28 * k)}l${_gwN(12 * k)} ${_gwN(-24 * k)}M${_gwN(cx)} ${_gwN(base - 30 * k)}v${_gwN(-34 * k)}M${_gwN(cx - 7 * k)} ${_gwN(base - 46 * k)}l${_gwN(-8 * k)} ${_gwN(-8 * k)}M${_gwN(cx + 7 * k)} ${_gwN(base - 48 * k)}l${_gwN(8 * k)} ${_gwN(-9 * k)}" stroke="${trunk}" stroke-width="${_gwN(2.4 * k)}" stroke-linecap="round" fill="none"/><path d="M${_gwN(cx - 13 * k)} ${_gwN(base - 47 * k)}q${_gwN(13 * k)} ${_gwN(-8 * k)} ${_gwN(26 * k)} 0" stroke="#ffffff" stroke-width="${_gwN(2 * k)}" stroke-linecap="round" fill="none"/>`;
    return s;
  }
  s += `<ellipse cx="${_gwN(cx - 9 * k)}" cy="${_gwN(base - 40 * k)}" rx="${_gwN(15 * k)}" ry="${_gwN(13 * k)}" fill="${deep}"/><ellipse cx="${_gwN(cx + 9 * k)}" cy="${_gwN(base - 42 * k)}" rx="${_gwN(15 * k)}" ry="${_gwN(14 * k)}" fill="${deep}"/><ellipse cx="${_gwN(cx)}" cy="${_gwN(base - 54 * k)}" rx="${_gwN(17 * k)}" ry="${_gwN(15 * k)}" fill="${mid}"/>`;
  s += `<ellipse cx="${_gwN(cx - 5 * k)}" cy="${_gwN(base - 58 * k)}" rx="${_gwN(10 * k)}" ry="${_gwN(8 * k)}" fill="${lit}" fill-opacity="0.85"/><ellipse cx="${_gwN(cx - 13 * k)}" cy="${_gwN(base - 44 * k)}" rx="${_gwN(6 * k)}" ry="${_gwN(5 * k)}" fill="${lit}" fill-opacity="0.6"/>`;
  if (r() < 0.4 && season !== 'autumn') s += `<circle cx="${_gwN(cx + 6 * k)}" cy="${_gwN(base - 50 * k)}" r="${_gwN(1.8 * k)}" fill="#f4d03a"/>`;
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
/* one little shop: walls, a roof, an awning, a door you knock at, a window and a sign; th says how it looks */
function _gwHouse(p, sc, o, th) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2, night = sc.tod === 'night' || sc.tod === 'dusk';
  const wall = sc.season === 'winter' ? _gdaShade(th.wall, 0.12) : th.wall, plank = th.plank, roof = th.roof, roof2 = _gdaShade(th.roof, -0.2);
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="${_gwN(half + 8)}" ry="5" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<rect x="${_gwN(cx - half + 4)}" y="${_gwN(by - 62)}" width="${_gwN(half * 2 - 8)}" height="62" fill="${wall}" stroke="${plank}" stroke-width="1.6"/>`;
  for (let y = by - 56; y < by - 4; y += 9) s += `<path d="M${_gwN(cx - half + 4)} ${_gwN(y)}H${_gwN(cx + half - 4)}" stroke="${plank}" stroke-width="0.9" stroke-opacity="0.55"/>`;
  s += `<path d="M${_gwN(cx - half - 4)} ${_gwN(by - 60)}L${_gwN(cx)} ${_gwN(by - 92)}L${_gwN(cx + half + 4)} ${_gwN(by - 60)}Z" fill="${roof}" stroke="${roof2}" stroke-width="2" stroke-linejoin="round"/>`;
  for (let i = 1; i < 5; i++) s += `<path d="M${_gwN(cx - half - 4 + i * (half * 2 + 8) / 10)} ${_gwN(by - 60 - i * 6)}h${_gwN((half * 2 + 8) - i * (half * 2 + 8) / 5)}" stroke="${roof2}" stroke-width="1.2" stroke-opacity="0.6"/>`;
  const ax0 = cx - half + 10, aw = half * 2 - 20, ay = by - 46;
  for (let i = 0; i < 6; i++) s += `<path d="M${_gwN(ax0 + i * aw / 6)} ${_gwN(ay)}h${_gwN(aw / 6)}l${_gwN(1.5)} ${_gwN(12)}q${_gwN(-aw / 12)} 5 ${_gwN(-aw / 6 - 1.5)} 0z" fill="${i % 2 ? th.awn[1] : th.awn[0]}" stroke="${_gdaShade(th.awn[0], -0.3)}" stroke-width="0.6"/>`;
  const d = p.door || { x: Math.floor(p.x + p.w / 2), y: p.y + p.h }, dx = (d.x + 0.5) * cw;
  s += `<rect x="${_gwN(dx - 9)}" y="${_gwN(by - 34)}" width="18" height="34" rx="2" fill="${_gdaShade(plank, -0.1)}" stroke="${plank}" stroke-width="1.4"/><circle cx="${_gwN(dx + 5)}" cy="${_gwN(by - 17)}" r="1.4" fill="#e8c24a"/>`;
  const wx = dx > cx ? cx - half + 12 : cx + half - 12 - (half - 28);
  s += `<rect x="${_gwN(wx)}" y="${_gwN(by - 34)}" width="${_gwN(half - 28)}" height="18" fill="${night ? '#ffe9a0' : '#cfe6ee'}" stroke="${plank}" stroke-width="1.4"/><path d="M${_gwN(wx + (half - 28) / 2)} ${_gwN(by - 34)}v18" stroke="${plank}" stroke-width="1"/>`;
  const sx = dx > cx ? cx - half + 22 : cx + half - 22;
  s += `<g transform="translate(${_gwN(sx)} ${_gwN(by - 54)})"><path d="M-8 -9v-3M8 -9v-3" stroke="${plank}" stroke-width="1"/><rect x="-13" y="-9" width="26" height="16" rx="3" fill="#efe4c8" stroke="${plank}" stroke-width="1.2"/>${_gwSignIcon(th.icon, o)}</g>`;
  s += th.extra ? th.extra(cx, by, half, plank, o) : '';
  if (night) s += `<circle cx="${_gwN(wx + (half - 28) / 2)}" cy="${_gwN(by - 25)}" r="46" fill="#ffe7a8" fill-opacity="0.14"/>`;
  return s;
}
const _GW_HOUSES = {
  tackle: { wall: '#c89a64', plank: '#8a6238', roof: '#3f6f8a', awn: ['#d8452a', '#fbf5e6'], icon: 'fish', extra: (cx, by, half, plank, o) => `<path d="M${_gwN(cx - half + 2)} ${_gwN(by - 4)}l-4 -44M${_gwN(cx - half + 8)} ${_gwN(by - 2)}l-2 -48" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><circle cx="${_gwN(cx - half - 2)}" cy="${_gwN(by - 49)}" r="1.6" fill="#d8301a"/><path d="M${_gwN(cx + half - 22)} ${_gwN(by - 14)}l3 14h14l3 -14z" fill="#8a8e92" stroke="#5a5e62" stroke-width="1"/><ellipse cx="${_gwN(cx + half - 12)}" cy="${_gwN(by - 14)}" rx="8" ry="2.4" fill="#cfe0e8"/>${o ? '' : ''}` },
  shop: { wall: '#d8c49a', plank: '#8a6a3a', roof: '#4f8a4a', awn: ['#3f8a4a', '#fbf5e6'], icon: 'seed', extra: (cx, by, half) => `<g><rect x="${_gwN(cx + half - 30)}" y="${_gwN(by - 16)}" width="12" height="16" rx="3" fill="#cdb98c" stroke="#8a6a3a" stroke-width="1"/><path d="M${_gwN(cx + half - 30)} ${_gwN(by - 12)}h12" stroke="#8a6a3a" stroke-width="0.8"/><rect x="${_gwN(cx + half - 17)}" y="${_gwN(by - 12)}" width="11" height="12" rx="3" fill="#d6c496" stroke="#8a6a3a" stroke-width="1"/></g><g transform="translate(${_gwN(cx - half + 14)} ${_gwN(by - 2)})"><path d="M-9 -9h16l-3 9h-10z" fill="#9a8a6a" stroke="#6a5a3a" stroke-width="1"/><circle cx="-4" cy="-11" r="3.4" fill="#e8607a"/><circle cx="2" cy="-12" r="3.4" fill="#f2c432"/><circle cx="6" cy="-10" r="2.8" fill="#b48ae6"/><circle cx="-5" cy="1" r="2.4" fill="#4a4a4a"/><circle cx="5" cy="1" r="2.4" fill="#4a4a4a"/></g>` },
};
function _gwStall(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="${_gwN(half + 6)}" ry="4.6" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<rect x="${_gwN(cx - half + 3)}" y="${_gwN(by - 56)}" width="3.4" height="56" fill="#7a5636"/><rect x="${_gwN(cx + half - 6.4)}" y="${_gwN(by - 56)}" width="3.4" height="56" fill="#7a5636"/>`;
  s += `<rect x="${_gwN(cx - half + 6)}" y="${_gwN(by - 50)}" width="${_gwN(half * 2 - 12)}" height="22" fill="#e2cd9a" stroke="#a8884a" stroke-width="1"/>`;
  const aw = half * 2 + 6, ax = cx - aw / 2;
  for (let i = 0; i < 8; i++) s += `<path d="M${_gwN(ax + i * aw / 8)} ${_gwN(by - 56)}h${_gwN(aw / 8)}l${_gwN(1.6)} ${_gwN(13)}q${_gwN(-aw / 16)} 5 ${_gwN(-aw / 8 - 1.6)} 0z" fill="${i % 2 ? '#fbf5e6' : '#e8b42a'}" stroke="#a87a1a" stroke-width="0.6"/>`;
  s += `<rect x="${_gwN(cx - half + 4)}" y="${_gwN(by - 22)}" width="${_gwN(half * 2 - 8)}" height="22" rx="2" fill="#a8764a" stroke="#6a4426" stroke-width="1.2"/>`;
  const col = ['#d8452a', '#7ac24a', '#f2a832', '#b84a8a', '#e8d84a'];
  for (let i = 0; i < 7; i++) s += `<circle cx="${_gwN(cx - half + 12 + i * (half * 2 - 24) / 6)}" cy="${_gwN(by - 26 - (i % 2) * 3)}" r="5" fill="${col[i % 5]}" stroke="#00000022" stroke-width="0.6"/>`;
  s += `<g transform="translate(${_gwN(cx)} ${_gwN(by - 66)})"><rect x="-13" y="-8" width="26" height="16" rx="3" fill="#efe4c8" stroke="#a8884a" stroke-width="1.2"/>${_gwSignIcon('basket', o)}</g>`;
  return s;
}
function _gwBoard(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, half = p.w * cw / 2 - 6;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="${_gwN(half + 6)}" ry="3.6" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<rect x="${_gwN(cx - half + 2)}" y="${_gwN(by - 42)}" width="4" height="42" fill="#7a5636"/><rect x="${_gwN(cx + half - 6)}" y="${_gwN(by - 42)}" width="4" height="42" fill="#7a5636"/>`;
  s += `<rect x="${_gwN(cx - half)}" y="${_gwN(by - 58)}" width="${_gwN(half * 2)}" height="36" rx="3" fill="#b88a58" stroke="#6a4426" stroke-width="1.6"/><rect x="${_gwN(cx - half + 4)}" y="${_gwN(by - 54)}" width="${_gwN(half * 2 - 8)}" height="28" fill="#d8bd8a" stroke="#a8884a" stroke-width="0.8"/>`;
  s += `<path d="M${_gwN(cx - half - 3)} ${_gwN(by - 58)}L${_gwN(cx)} ${_gwN(by - 68)}L${_gwN(cx + half + 3)} ${_gwN(by - 58)}Z" fill="#7a5636" stroke="#4a3220" stroke-width="1.2"/>`;
  const paper = [['#fbf7ee', -0.62, -50, 14, 17, -4], ['#fff0b0', -0.1, -52, 15, 14, 3], ['#cfe8f4', 0.45, -48, 13, 18, -2]];
  for (const [c, fx, y, w, h, rot] of paper) s += `<g transform="rotate(${rot} ${_gwN(cx + fx * half)} ${_gwN(by + y)})"><rect x="${_gwN(cx + fx * half - w / 2)}" y="${_gwN(by + y)}" width="${w}" height="${h}" fill="${c}" stroke="#a8884a" stroke-width="0.6"/><path d="M${_gwN(cx + fx * half - w / 2 + 2)} ${_gwN(by + y + 4)}h${w - 4}M${_gwN(cx + fx * half - w / 2 + 2)} ${_gwN(by + y + 8)}h${w - 6}M${_gwN(cx + fx * half - w / 2 + 2)} ${_gwN(by + y + 12)}h${w - 8}" stroke="#8a7a5a" stroke-width="0.6"/><circle cx="${_gwN(cx + fx * half)}" cy="${_gwN(by + y + 2)}" r="1.4" fill="#d8301a"/></g>`;
  s += `<g transform="translate(${_gwN(cx + half - 12)} ${_gwN(by - 24)}) scale(0.9)"><path d="M0 -7l2 4.6 5 .6-3.6 3.4 1 5-4.4-2.4-4.4 2.4 1-5-3.6-3.4 5-.6z" fill="#f2c432" stroke="#a87a1a" stroke-width="0.6"/></g>`;
  return s;
}
function _gwLectern(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="15" ry="3.4" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<rect x="${_gwN(cx - 2.6)}" y="${_gwN(by - 26)}" width="5.2" height="26" fill="#7a5636"/><rect x="${_gwN(cx - 8)}" y="${_gwN(by - 3)}" width="16" height="3" rx="1" fill="#6a4426"/>`;
  s += `<path d="M${_gwN(cx - 17)} ${_gwN(by - 26)}L${_gwN(cx - 11)} ${_gwN(by - 40)}H${_gwN(cx + 11)}L${_gwN(cx + 17)} ${_gwN(by - 26)}Z" fill="#a8764a" stroke="#6a4426" stroke-width="1.2" stroke-linejoin="round"/>`;
  s += `<path d="M${_gwN(cx - 14)} ${_gwN(by - 28)}L${_gwN(cx - 9)} ${_gwN(by - 38)}H${_gwN(cx)}V${_gwN(by - 28)}Z" fill="#fbf7ee" stroke="#a8884a" stroke-width="0.7"/><path d="M${_gwN(cx + 14)} ${_gwN(by - 28)}L${_gwN(cx + 9)} ${_gwN(by - 38)}H${_gwN(cx)}V${_gwN(by - 28)}Z" fill="#f6f1e4" stroke="#a8884a" stroke-width="0.7"/>`;
  s += `<path d="M${_gwN(cx - 11)} ${_gwN(by - 32)}h8M${_gwN(cx - 10)} ${_gwN(by - 35)}h6M${_gwN(cx + 3)} ${_gwN(by - 32)}h8M${_gwN(cx + 4)} ${_gwN(by - 35)}h6" stroke="#8a7a5a" stroke-width="0.7"/><g transform="translate(${_gwN(cx + 6)} ${_gwN(by - 33)}) scale(0.16)">${gardenFishArt('carp', { uid: o.uid + 'jn' })}</g><path d="M${_gwN(cx + 14)} ${_gwN(by - 40)}q4 -8 9 -12" stroke="#f4f0e6" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  return s;
}
function _gwTripod(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="15" ry="3.2" fill="#1a2a14" fill-opacity="0.2"/>`;
  s += `<path d="M${_gwN(cx)} ${_gwN(by - 30)}L${_gwN(cx - 13)} ${_gwN(by)}M${_gwN(cx)} ${_gwN(by - 30)}L${_gwN(cx + 13)} ${_gwN(by)}M${_gwN(cx)} ${_gwN(by - 30)}L${_gwN(cx + 1)} ${_gwN(by - 4)}" stroke="#4a5056" stroke-width="2.2" stroke-linecap="round"/>`;
  s += `<rect x="${_gwN(cx - 11)}" y="${_gwN(by - 46)}" width="22" height="17" rx="3" fill="#3a4046" stroke="#1a1e22" stroke-width="1.2"/><rect x="${_gwN(cx - 8)}" y="${_gwN(by - 49)}" width="9" height="4" rx="1" fill="#4a5056"/><circle cx="${_gwN(cx + 2)}" cy="${_gwN(by - 37)}" r="6" fill="#1a2430" stroke="#6a7a8a" stroke-width="1.4"/><circle cx="${_gwN(cx + 2)}" cy="${_gwN(by - 37)}" r="3" fill="#2f5a8a"/><circle cx="${_gwN(cx + 0.6)}" cy="${_gwN(by - 38.4)}" r="1" fill="#ffffff" fill-opacity="0.8"/><circle cx="${_gwN(cx - 7)}" cy="${_gwN(by - 42)}" r="1.6" fill="#d8452a"/>`;
  return s;
}
function _gwPostbox(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="11" ry="3" fill="#1a2a14" fill-opacity="0.2"/>`;
  s += `<rect x="${_gwN(cx - 2.4)}" y="${_gwN(by - 24)}" width="4.8" height="24" fill="#7a5636"/><rect x="${_gwN(cx - 11)}" y="${_gwN(by - 40)}" width="22" height="17" rx="3" fill="#c8302a" stroke="#7a1a14" stroke-width="1.2"/><path d="M${_gwN(cx - 11)} ${_gwN(by - 34)}q11 -10 22 0" fill="#d8453a" stroke="#7a1a14" stroke-width="1"/><rect x="${_gwN(cx - 6)}" y="${_gwN(by - 33)}" width="12" height="2.4" rx="1.2" fill="#3a0e0a"/>`;
  s += `<g transform="rotate(-20 ${_gwN(cx + 11)} ${_gwN(by - 32)})"><rect x="${_gwN(cx + 11)}" y="${_gwN(by - 44)}" width="2.4" height="13" fill="#7a1a14"/><rect x="${_gwN(cx + 13)}" y="${_gwN(by - 44)}" width="8" height="5.6" fill="#f2c432" stroke="#a87a1a" stroke-width="0.6"/></g>`;
  s += `<g transform="translate(${_gwN(cx - 12)} ${_gwN(by - 4)}) rotate(-8)"><rect width="9" height="6" rx="1" fill="#fbf7ee" stroke="#a8884a" stroke-width="0.6"/><path d="M0.6 0.8L4.5 3.8 8.4 0.8" fill="none" stroke="#a8884a" stroke-width="0.6"/></g>`;
  return s;
}
function _gwSundial(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  const cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3;
  let s = `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by + 1)}" rx="14" ry="3.6" fill="#1a2a14" fill-opacity="0.22"/>`;
  s += `<path d="M${_gwN(cx - 9)} ${_gwN(by)}L${_gwN(cx - 6)} ${_gwN(by - 18)}H${_gwN(cx + 6)}L${_gwN(cx + 9)} ${_gwN(by)}Z" fill="#b9b2a4" stroke="#7a756a" stroke-width="1.2"/><path d="M${_gwN(cx - 6)} ${_gwN(by - 18)}H${_gwN(cx - 2)}L${_gwN(cx - 4)} ${_gwN(by)}H${_gwN(cx - 9)}Z" fill="#d2ccc0" fill-opacity="0.7"/>`;
  s += `<ellipse cx="${_gwN(cx)}" cy="${_gwN(by - 20)}" rx="15" ry="6" fill="#c8a24a" stroke="#8a6a1a" stroke-width="1.2"/><ellipse cx="${_gwN(cx)}" cy="${_gwN(by - 20)}" rx="11" ry="4.2" fill="#d8b85a" stroke="#8a6a1a" stroke-width="0.7"/>`;
  for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; s += `<path d="M${_gwN(cx + Math.cos(a) * 8.6)} ${_gwN(by - 20 + Math.sin(a) * 3.1)}l${_gwN(Math.cos(a) * 2.4)} ${_gwN(Math.sin(a) * 0.9)}" stroke="#6a4a0a" stroke-width="0.8"/>`; }
  s += `<path d="M${_gwN(cx - 1)} ${_gwN(by - 20)}L${_gwN(cx + 5)} ${_gwN(by - 20)}L${_gwN(cx)} ${_gwN(by - 30)}Z" fill="#a8841a" stroke="#6a4a0a" stroke-width="0.8" stroke-linejoin="round"/>`;
  for (const [dx, c] of [[-14, '#e8607a'], [12, '#f2c432'], [16, '#b48ae6']]) s += `<circle cx="${_gwN(cx + dx)}" cy="${_gwN(by - 1)}" r="2.2" fill="${c}"/><path d="M${_gwN(cx + dx)} ${_gwN(by + 1)}v2" stroke="#3f8a3a" stroke-width="1"/>`;
  return s;
}
function _gwBoat(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'jetty-post');
  const px = (p.x + 0.5) * cw, py = base + (p.y + 1) * ch - 4;
  let s = `<rect x="${_gwN(px - 2.6)}" y="${_gwN(py - 26)}" width="5.2" height="28" rx="2" fill="#6a4a2e"/><rect x="${_gwN(px - 2.6)}" y="${_gwN(py - 26)}" width="2" height="28" rx="1" fill="#ffffff" fill-opacity="0.16"/><path d="M${_gwN(px)} ${_gwN(py - 20)}q14 6 24 20" stroke="#d8c8a0" stroke-width="1.4" fill="none"/>`;
  const bx = px + 38, by = py + 14;
  s += `<g class="${o.still ? '' : 'gda-bob'}"><ellipse cx="${_gwN(bx)}" cy="${_gwN(by + 6)}" rx="30" ry="4.6" fill="#0a2a46" fill-opacity="0.22"/><path d="M${_gwN(bx - 28)} ${_gwN(by - 5)}Q${_gwN(bx)} ${_gwN(by + 8)} ${_gwN(bx + 28)} ${_gwN(by - 5)}L${_gwN(bx + 22)} ${_gwN(by + 4)}Q${_gwN(bx)} ${_gwN(by + 12)} ${_gwN(bx - 22)} ${_gwN(by + 4)}Z" fill="#a8764a" stroke="#6a4426" stroke-width="1.4" stroke-linejoin="round"/><path d="M${_gwN(bx - 25)} ${_gwN(by - 2)}Q${_gwN(bx)} ${_gwN(by + 9)} ${_gwN(bx + 25)} ${_gwN(by - 2)}" stroke="#d8483a" stroke-width="2.4" fill="none"/><rect x="${_gwN(bx - 6)}" y="${_gwN(by - 5)}" width="12" height="3" rx="1" fill="#6a4426"/><path d="M${_gwN(bx + 4)} ${_gwN(by - 5)}l16 -14" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/></g>`;
  return s;
}
function _gwReeds(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, p = GARDEN_PROPS.find(x => x.id === 'reed-bank');
  const rnd = gardenRand('reeds'), by = base + (p.y + 1) * ch - 3, pal = sc.season === 'winter' ? ['#a8a078', '#8a8260'] : sc.season === 'autumn' ? ['#b89a4a', '#8a7a3a'] : ['#6a9a3a', '#4a7a2a'];
  let stems = '', heads = '';
  for (let i = 0; i < 17; i++) {
    const x = (p.x + rnd() * p.w) * cw, h = 26 + rnd() * 22, lean = (rnd() - 0.5) * 9;
    stems += `<path d="M${_gwN(x)} ${_gwN(by)}q${_gwN(lean * 0.4)} ${_gwN(-h * 0.5)} ${_gwN(lean)} ${_gwN(-h)}" stroke="${pal[i % 2]}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (i % 3 === 0) heads += `<rect x="${_gwN(x + lean - 1.6)}" y="${_gwN(by - h - 5)}" width="3.2" height="10" rx="1.6" fill="#7a4a2a"/>`;
  }
  return `<g class="${o.still ? '' : 'gda-sway'}">${stems}${heads}</g>`;
}
/** The standing scenery: [{z, x, html}] sorted in with plants and decorations. */
function gardenWorldProps(sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, out = [], open = new Set(sc.areas || []);
  const wrap = (cls, z, x, inner, key) => ({ z, x, html: `<g class="gd-it gd-prop ${cls}" data-sig="${gardenHash(key + inner.length + sc.tod + sc.season).toString(36)}" data-prop="${key}" data-z="${z}" data-x="${x}">${inner}</g>` });
  for (const p of GARDEN_PROPS) {
    if (!p.kind) continue;
    let inner = '';
    if (p.kind === 'tackle' || p.kind === 'shop') inner = _gwHouse(p, sc, o, _GW_HOUSES[p.kind]);
    else if (p.kind === 'stall') inner = _gwStall(p, sc, o);
    else if (p.kind === 'board') inner = _gwBoard(p, sc, o);
    else if (p.kind === 'lectern') inner = _gwLectern(p, sc, o);
    else if (p.kind === 'tripod') inner = _gwTripod(p, sc, o);
    else if (p.kind === 'postbox') inner = _gwPostbox(p, sc, o);
    else if (p.kind === 'sundial') inner = _gwSundial(p, sc, o);
    if (inner) out.push(wrap('gd-prop-' + p.kind + ' gd-prop-click', p.y + p.h, p.x, inner, p.id));
  }
  const post = GARDEN_PROPS.find(p => p.id === 'jetty-post');
  out.push(wrap('gd-prop-boat', post.y + 1, post.x, _gwBoat(sc, o), 'boat'));
  const reeds = GARDEN_PROPS.find(p => p.id === 'reed-bank');
  out.push(wrap('gd-prop-reeds', reeds.y + 1, reeds.x, _gwReeds(sc, o), 'reeds'));
  // the forest edge: big trees all down the east side, so the woods have a back wall
  const pal = (GART_PAL.leaf[sc.season] || GART_PAL.leaf.summer);
  const rnd = gardenRand('forest-edge');
  for (let y = 0; y < 11; y++) {
    const cx = (27 + 0.5 + (rnd() - 0.5) * 0.5) * cw, by = base + (y + 1) * ch - 4, k = 1.1 + rnd() * 0.45;
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
  gartDefine('decor:fish-weathervane', {
    box: [40, 90], fit: 'none',
    draw(o, r) {
      let s = P('#1a1410', A.ell(0, 1, 11, 2.4), 0.18);
      s += P(GART_PAL.metal[1], A.rect(-1.6, -78, 3.2, 78)) + P(GART_PAL.metal[1], A.rect(-9, -46, 18, 2.4)) + P(GART_PAL.metal[2], A.rect(-1.2, -78, 1.2, 78), 0.5);
      s += `<g class="gda-sway" style="transform-origin:0 -78px;${A.T(r, 0, 4)}"><g transform="translate(0 -84) scale(0.34)">${gardenFishArt('golden-orfe', { uid: o.uid + 'w' })}</g></g>`;
      s += P('#d8452a', A.circ(0, -78, 2.4));
      void r;
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
