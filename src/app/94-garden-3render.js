/* ============================================================
   GARDEN, the renderer (2.18, agent 'garden-engine').
   One SVG per garden: the sky (time of day, season, weather), the distant hills,
   the ground of every area (locked ones overgrown with a sign), paths, then every
   plant and decoration in depth order, visitors, pets, rain or snow, and the
   night with its lights. Explicit colours throughout, so the photo mode can turn
   it into a PNG. The art comes through _gdArt (94-garden-2art.js).

     gardenSceneParts(scene, o)      -> the scene in parts (layers and keyed items; cached by its inputs)
     gardenSceneSvg(scene, o)        -> the SVG string (the parts joined)
     gardenSvgMount(holder, parts) / gardenSvgPatch(svg, parts)   draw it, then bring it up to date parsing
                                     only the layers and items that changed
         scene {plants: [{id, uid?, x, y, stage, variant, thirsty, overgrown, ripe, t, heart?}],
                decor: [{id, uid?, x, y, r, v}], areas: [open ids], season, tod, rain {now, snow},
                visitors: [{id, x, y, motion, t, lift?, sky?, water?}], pets: [...], lv}
         o {size 's'|'m'|'l', crop 'bed'|'wide'|'all', still (no motion), interactive (the page's
            layers), uid (a prefix for ids), label (aria), photo (no UI layers)}
     gardenSceneFromModel(m)         your own garden as a scene
     gardenRender(el, snapshot, o)   ANYONE's garden from a snapshot (docs/dev/GARDEN.md section 7):
                                     cleaned with gardenSnapshotClean, drawn read-only; o {readOnly,
                                     visitor: {name}, size, crop, tod, season, still, now}. Returns
                                     {svg, destroy()}. Names are set with textContent only.
     gardenCropBox(crop)             the viewBox of a crop
   ============================================================ */
const _GDR = { cache: new Map(), seq: 0 };
const GARDEN_CROPS = Object.freeze({
  all: Object.freeze({ x: 0, y: 0, w: GARDEN_WORLD.coreCols * GARDEN_WORLD.cellW, h: GARDEN_WORLD.sky + GARDEN_WORLD.coreRows * GARDEN_WORLD.cellH }),   // the garden as it has always been: 1344 x 690 (a card, a photo, a friend without bought land)
  world: Object.freeze({ x: 0, y: 0, w: GARDEN_WORLD.cols * GARDEN_WORLD.cellW, h: GARDEN_WORLD.sky + GARDEN_WORLD.rows * GARDEN_WORLD.cellH }),   // 2.23: everything, the land you can buy too
  wide: Object.freeze({ x: 120, y: 112, w: 720, h: 360 }),
  bed: Object.freeze({ x: 236, y: 168, w: 496, h: 252 }),
});
function gardenCropBox(crop) { return GARDEN_CROPS[crop] || GARDEN_CROPS.all; }
/** The crop that shows a whole garden: bought land widens it. */
function gardenCropFor(areas) { return (areas || []).some(id => { const a = gardenArea(id); return a && a.buy; }) ? 'world' : 'all'; }
/* Short strokes joined into one path: hundreds of tufts for the price of one node. */
function _gdrTuftsD(rnd, x0, y0, w, h, n, tall) { let d = ''; for (let i = 0; i < n; i++) { const tx = _gdrN(x0 + 8 + rnd() * (w - 16)), ty = _gdrN(y0 + 10 + rnd() * (h - 14)); d += tall ? `M${tx} ${ty}l-3 -8M${tx} ${ty}l0 -10M${tx} ${ty}l3 -7` : `M${tx} ${ty}l-2 -6M${tx} ${ty}l2 -6`; } return d; }
function _gdrDotsD(rnd, x0, y0, w, h, n) { let d = ''; for (let i = 0; i < n; i++) d += `M${_gdrN(x0 + 8 + rnd() * (w - 16))} ${_gdrN(y0 + 6 + rnd() * (h - 10))}h.01`; return d; }
function _gdrN(v) { return Math.round(v * 10) / 10; }

/* ---------- the sky ---------- */
const _GDR_SKY = {
  day: { spring: ['#9fd3f2', '#e8f6fc'], summer: ['#8ccaf0', '#e4f4fb'], autumn: ['#a9cbe2', '#f4ecdc'], winter: ['#bfd2e0', '#eef2f6'] },
  dawn: ['#f2b8a4', '#fbe7cf'], dusk: ['#b98ab4', '#f4b98a'], night: ['#101c38', '#2a3a62'],
};
const _GDR_HILLS = { spring: ['#a8cf7a', '#8fbf62'], summer: ['#9cc86a', '#80b456'], autumn: ['#c4b46a', '#a8a052'], winter: ['#c4ccc0', '#aab4a8'] };
function _gdrSky(sc, o, W, base) {
  if (typeof gartSkyLayers === 'function') { try { return gartSkyLayers(sc, o, W, base); } catch (e) { /* the engine's own below */ } }   // agent 'garden-art'
  const u = o.uid;
  let top, bot;
  if (sc.tod === 'day') [top, bot] = _GDR_SKY.day[sc.season] || _GDR_SKY.day.summer;
  else [top, bot] = _GDR_SKY[sc.tod] || _GDR_SKY.day.summer;
  if (sc.rain && (sc.rain.now || sc.rain.snow) && sc.tod !== 'night') { top = _gdaMix(top, '#8f9aa6', 0.45); bot = _gdaMix(bot, '#c4cad0', 0.45); }
  const defs = `<defs><linearGradient id="${u}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
    + `<radialGradient id="${u}-glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>`;
  let s = '<g class="gd-sky">';
  s += `<rect x="0" y="0" width="${W}" height="${base + 10}" fill="url(#${u}-sky)"/>`;
  // sun or moon, by the hour
  const hr = typeof sc.hour === 'number' ? sc.hour : 12;
  if (sc.tod === 'night') {
    const rnd = gardenRand('stars|' + (sc.day || ''));
    for (let i = 0; i < 40; i++) s += `<circle cx="${_gdrN(rnd() * W)}" cy="${_gdrN(rnd() * base * 0.8)}" r="${_gdrN(0.5 + rnd() * 1.1)}" fill="#ffffff" fill-opacity="${_gdrN(0.4 + rnd() * 0.6)}"${i % 5 === 0 && !o.still ? ' class="gda-blink"' : ''}/>`;
    s += `<circle cx="${_gdrN(W * 0.78)}" cy="46" r="18" fill="#f4f1e0"/><circle cx="${_gdrN(W * 0.78 + 7)}" cy="41" r="16" fill="${top}" fill-opacity="0.9"/>`;
  } else if (!(sc.rain && sc.rain.now)) {
    const f = Math.max(0, Math.min(1, (hr - 5) / 16)), sx = W * (0.12 + f * 0.76), sy = 30 + Math.abs(f - 0.5) * 2 * 70;
    const sun = sc.tod === 'day' ? '#ffd45a' : '#ffb26a';
    s += `<circle cx="${_gdrN(sx)}" cy="${_gdrN(sy)}" r="34" fill="${sun}" fill-opacity="0.22"/><circle cx="${_gdrN(sx)}" cy="${_gdrN(sy)}" r="17" fill="${sun}"/>`;
  }
  // clouds (more of them, and greyer, in rain): their own layer, so the sun moving does not restart them
  const sky = s + '</g>';
  s = '<g class="gd-clouds">';
  const nc = sc.rain && (sc.rain.now || sc.rain.snow) ? 6 : sc.season === 'summer' ? 2 : 3;
  const cc = sc.tod === 'night' ? '#3a4a6e' : sc.rain && sc.rain.now ? '#d6dade' : '#ffffff';
  for (let i = 0; i < nc; i++) {
    const rnd = gardenRand('cloud|' + i), cx = rnd() * W, cy = 18 + rnd() * 60, k = 0.7 + rnd() * 0.8;
    s += `<g class="${o.still ? '' : 'gd-cloud'}" style="--d:${_gdrN(90 + rnd() * 80)}s;--dl:-${_gdrN(rnd() * 90)}s"><g transform="translate(${_gdrN(cx)} ${_gdrN(cy)}) scale(${_gdrN(k)})" fill="${cc}" fill-opacity="${sc.tod === 'night' ? 0.6 : 0.88}"><ellipse cx="0" cy="0" rx="34" ry="11"/><ellipse cx="-14" cy="-7" rx="15" ry="11"/><ellipse cx="10" cy="-10" rx="18" ry="13"/></g></g>`;
  }
  const clouds = s + '</g>';
  s = '<g class="gd-far">';
  // distant hills, a tree line and the hedge behind the garden
  const hl = _GDR_HILLS[sc.season] || _GDR_HILLS.summer, dim = sc.tod === 'night' ? 0.55 : sc.tod === 'dusk' ? 0.25 : 0;
  const h1 = dim ? _gdaMix(hl[0], '#1a2440', dim) : hl[0], h2 = dim ? _gdaMix(hl[1], '#1a2440', dim) : hl[1];
  s += `<path d="M0 ${base - 38}Q${W * 0.18} ${base - 78} ${W * 0.38} ${base - 46}T${W * 0.72} ${base - 52}T${W} ${base - 40}V${base + 2}H0Z" fill="${h1}"/>`;
  const tl = sc.season === 'winter' ? '#8a9488' : sc.season === 'autumn' ? '#a8763a' : '#5f8f4a', tlc = dim ? _gdaMix(tl, '#1a2440', dim) : tl;
  let trees = '';
  const rnd = gardenRand('treeline');
  for (let x = -10; x < W + 20; x += 26 + rnd() * 30) trees += `<ellipse cx="${_gdrN(x)}" cy="${_gdrN(base - 30 - rnd() * 8)}" rx="${_gdrN(14 + rnd() * 10)}" ry="${_gdrN(12 + rnd() * 8)}"/>`;
  s += `<g fill="${tlc}">${trees}</g>`;
  s += `<path d="M0 ${base - 24}Q${W * 0.3} ${base - 36} ${W * 0.55} ${base - 22}T${W} ${base - 26}V${base + 2}H0Z" fill="${h2}"/>`;
  const hedge = dim ? _gdaMix('#4f7a3e', '#1a2440', dim) : sc.season === 'winter' ? '#6a7f62' : '#4f7a3e';
  s += `<rect x="0" y="${base - 14}" width="${W}" height="16" rx="6" fill="${hedge}"/>`;
  for (let x = 6; x < W; x += 18) s += `<circle cx="${x}" cy="${base - 13}" r="7" fill="${hedge}"/>`;
  return { defs, sky, clouds, far: s + '</g>' };
}

/* ---------- the ground ---------- */
function _gdrTileCol(id, season) { const t = gardenTile(id) || GARDEN_TILES[0]; return season === 'winter' ? t.winter : season === 'autumn' ? t.autumn : t.c; }
function _gdrGround(sc, o) {
  if (typeof gartGroundLayer === 'function') { try { return gartGroundLayer(sc, o); } catch (e) { /* the engine's own below */ } }   // agent 'garden-art'
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, season = sc.season;
  const open = new Set(sc.areas || []);
  let s = '';
  // the lawn under everything, mown in stripes
  const lawn = _gdrTileCol('grass', season);
  s += `<rect x="0" y="${base}" width="${W.cols * cw}" height="${W.rows * ch}" fill="${lawn}"/>`;
  for (let x = 0; x < W.cols; x += 2) s += `<rect x="${x * cw}" y="${base}" width="${cw}" height="${W.rows * ch}" fill="${_gdaShade(lawn, 0.06)}"/>`;
  for (const a of GARDEN_AREAS) {
    const x0 = a.x * cw, y0 = base + a.y * ch, w = a.w * cw, h = a.h * ch;
    if (!open.has(a.id)) {
      // not open yet: overgrown wild ground, a little fence and a sign
      const wild = _gdrTileCol('wild-ground', season);
      s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="8" fill="${wild}"/>`;
      const rnd = gardenRand('wild|' + a.id);
      s += `<path d="${_gdrTuftsD(rnd, x0, y0, w, h, a.w * a.h * (a.buy ? 0.7 : 1.2), true)}" stroke="${_gdaShade(wild, -0.22)}" stroke-width="1.4" fill="none"/>`;
      // a rope fence round it: this is not yours yet
      s += `<rect x="${x0 + 5}" y="${y0 + 5}" width="${w - 10}" height="${h - 10}" rx="10" fill="#000000" fill-opacity="0.07" stroke="#8a6a44" stroke-width="2.6" stroke-dasharray="3 11" stroke-linecap="round"/>`;
      if (!o.photo) {
        // land for sale has its sign on the lane, where you can see it; land that opens with your level has it in the middle
        const nearLane = a.buy && a.y < 11, sx = x0 + w / 2, sy = a.buy ? (nearLane ? y0 + h - 22 : y0 + 34) : y0 + h / 2 + 6;
        const txt = a.buy ? String(a.buy) : `Level ${a.lv}`;
        s += `<g class="gd-locksign" data-land="${a.id}"><rect x="${sx - 1.6}" y="${sy - 10}" width="3.2" height="20" fill="#7a5636"/><rect x="${sx - 40}" y="${sy - 28}" width="80" height="22" rx="4" fill="#efe4c8" stroke="#a87c4f" stroke-width="1.6"/>`
          + `<text x="${sx + 6}" y="${sy - 13}" font-size="10.5" font-family="Inter, Arial, sans-serif" font-weight="600" text-anchor="middle" fill="#5a4630">${txt}</text>`
          + (a.buy ? `<circle cx="${sx - 28}" cy="${sy - 17}" r="5.4" fill="#f2b01e" stroke="#a87412" stroke-width="1.2"/>` : `<rect x="${sx - 33}" y="${sy - 22}" width="9" height="8" rx="1.5" fill="#8a7a5a"/><path d="M${sx - 31.5} ${sy - 22}v-3a3 3 0 0 1 6 0v3" stroke="#8a7a5a" stroke-width="1.6" fill="none"/>`) + '</g>';
      }
      continue;
    }
    const col = _gdrTileCol(a.tile, season);
    const look = a.look || a.id;   // how its ground is drawn is the catalogue's word, never its id
    if (look === 'lake') { s += gardenLakeGround(sc, o); continue; }   // 2.22
    if (look === 'woods') { s += gardenWoodsGround(sc, o, true); continue; }
    if (look === 'pond') {
      s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="14" fill="${col}"/>`;
      const wa = a.water, wx = wa.x * cw, wy = base + wa.y * ch, ww = wa.w * cw, wh = wa.h * ch;
      const water = sc.season === 'winter' && sc.rain && sc.rain.snow ? '#b8d4e4' : _gdrTileCol('pond-water', season);
      s += `<rect x="${wx - 6}" y="${wy - 5}" width="${ww + 12}" height="${wh + 10}" rx="22" fill="${_gdaShade(water, -0.25)}"/><rect x="${wx - 2}" y="${wy - 1}" width="${ww + 4}" height="${wh + 2}" rx="18" fill="${water}"/>`;
      for (let i = 0; i < 5; i++) { const rnd = gardenRand('ripple' + i); s += `<ellipse class="${o.still ? '' : 'gda-ripple'}" cx="${_gdrN(wx + 20 + rnd() * (ww - 40))}" cy="${_gdrN(wy + 10 + rnd() * (wh - 20))}" rx="${_gdrN(10 + rnd() * 12)}" ry="2.2" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.2"/>`; }
      const rnd = gardenRand('pondstones');
      for (let i = 0; i < 22; i++) { const t = i / 22, ang = t * Math.PI * 2, rx = ww / 2 + 8, ry = wh / 2 + 7; s += `<ellipse cx="${_gdrN(wx + ww / 2 + Math.cos(ang) * rx)}" cy="${_gdrN(wy + wh / 2 + Math.sin(ang) * ry)}" rx="${_gdrN(6 + rnd() * 4)}" ry="${_gdrN(4 + rnd() * 2)}" fill="${['#b8b2a6', '#a49e92', '#c8c2b6'][i % 3]}"/>`; }
      continue;
    }
    s += `<rect x="${x0 + 3}" y="${y0 + 3}" width="${w - 6}" height="${h - 6}" rx="${look === 'meadow' || look === 'orchard' ? 10 : 4}" fill="${col}"/>`;
    if (look === 'bed') s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="4" fill="none" stroke="#b5573a" stroke-width="4" stroke-dasharray="10 2"/>`;
    if (look === 'veg') { s += `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="2" fill="none" stroke="#9a7448" stroke-width="5"/>`; for (let r = 0; r < a.h; r++) s += `<path d="M${x0 + 8} ${y0 + r * ch + ch * 0.62}H${x0 + w - 8}" stroke="${_gdaShade(col, -0.18)}" stroke-width="3" stroke-linecap="round"/>`; }
    if (look === 'orchard' || look === 'meadow') {
      const rnd = gardenRand('tufts|' + a.id), n = a.w * a.h;
      s += `<path d="${_gdrTuftsD(rnd, x0, y0, w, h, n * 1.2, false)}" stroke="${_gdaShade(col, -0.16)}" stroke-width="1.2" fill="none"/>`;
      if (look === 'meadow' && season !== 'winter') ['#f7d417', '#fbfbf6', '#e05a8a', '#8aa0e8'].forEach(c => { s += `<path d="${_gdrDotsD(rnd, x0, y0, w, h, n * 0.12)}" stroke="${c}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`; });
      if (look === 'orchard' && season === 'autumn') ['#d9671c', '#e8a23a', '#c0392b'].forEach(c => { s += `<path d="${_gdrDotsD(rnd, x0, y0, w, h, n * 0.1)}" stroke="${c}" stroke-width="3" stroke-linecap="round" fill="none"/>`; });
    }
    if (look === 'greenhouse') { for (let gx = 0; gx < a.w; gx++) for (let gy = 0; gy < a.h; gy++) if ((gx + gy) % 2) s += `<rect x="${x0 + gx * cw + 3}" y="${y0 + gy * ch + 3}" width="${cw - 6}" height="${ch - 6}" fill="${_gdaShade(col, -0.06)}"/>`; s += `<path d="M${x0} ${y0 + 2}V${y0 - 30}L${x0 + w / 2} ${y0 - 50}L${x0 + w} ${y0 - 30}V${y0 + 2}Z" fill="#dff0f6" fill-opacity="0.28" stroke="#f4f8f6" stroke-width="2.4" stroke-linejoin="round"/>`; for (let gx = 1; gx < a.w; gx++) { const lx = x0 + gx * cw, top = y0 - 30 - 20 * (1 - Math.abs(gx / a.w - 0.5) * 2); s += `<path d="M${lx} ${_gdrN(top)}V${y0 + 2}" stroke="#f4f8f6" stroke-opacity="0.8" stroke-width="1.4"/>`; } s += `<path d="M${x0} ${y0 - 30}H${x0 + w}" stroke="#f4f8f6" stroke-opacity="0.8" stroke-width="1.4"/>`; }
  }
  // 2.23: the lane east along the shore: it is always open, and all the land you can buy lies either side of it
  { const lane = _gdrTileCol('sand', season), ly = base + 11 * ch, lx = W.coreCols * cw, lw = (W.cols - W.coreCols) * cw, rnd = gardenRand('lane');
    s += `<rect x="${lx}" y="${ly + 3}" width="${lw}" height="${2 * ch - 6}" fill="${lane}"/><path d="${_gdrDotsD(rnd, lx, ly, lw, 2 * ch, 80)}" stroke="${_gdaShade(lane, -0.14)}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`; }
  s += gardenPierGround(sc, o);   // 2.22: the pier, over the lake
  if (season === 'winter' && sc.rain && sc.rain.snow) { const rnd = gardenRand('snowground'); for (let i = 0; i < 60; i++) s += `<ellipse cx="${_gdrN(rnd() * W.cols * cw)}" cy="${_gdrN(base + rnd() * W.rows * ch)}" rx="${_gdrN(10 + rnd() * 24)}" ry="${_gdrN(3 + rnd() * 5)}" fill="#ffffff" fill-opacity="0.8"/>`; }
  return s;
}

/* ---------- items ---------- */
function _gdrItem(kind, it, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky;
  let fw = 1, fh = 1, def;
  if (kind === 'plant') { def = gardenPlant(it.id); if (!def) return ''; fw = fh = def.fp || 1; }
  else { def = gardenDecor(it.id); if (!def) return ''; fw = def.w || 1; fh = def.h || 1; }
  const ground = kind === 'decor' && def.layer === 'ground';
  const ax = (it.x + fw / 2) * cw, ay = base + (it.y + fh) * ch - (ground ? 0 : 4);
  const showy = kind === 'decor' && def.effect && def.effect.kind === 'show';   // 2.22: the aquarium, the case and the board draw what you caught
  const frag = _gdArt(it.id, kind === 'plant'
    ? { kind, stage: it.stage, season: sc.season, variant: it.variant, size: o.size, t: it.t || 0, tod: sc.tod, thirsty: it.thirsty, overgrown: it.overgrown, ripe: it.ripe, glow: !!def.glow, heart: it.heart }
    : { kind, season: sc.season, variant: it.v || 0, v: it.v || 0, size: o.size, t: it.t || 0, tod: sc.tod, r: it.r || 0, show: showy ? sc.show || null : null, shw: showy ? sc.showSig || '' : '' });
  if (!frag) return '';
  const tr = ground ? `translate(${_gdrN(ax)} ${_gdrN(ay)}) scale(${_gdrN(cw / 64 * fw / fw)} ${_gdrN(ch / 40)})` : `translate(${_gdrN(ax)} ${_gdrN(ay)}) scale(0.75)`;
  const uid = it.uid ? ` data-uid="${escAttr(it.uid)}"` : '';
  const cls = 'gd-it gd-' + kind + (it.thirsty ? ' is-thirsty' : '') + (it.ripe ? ' is-ripe' : '') + (it.overgrown ? ' is-wild' : '');
  const sig = gardenHash(cls + tr + frag).toString(36);
  return `<g class="${cls}"${uid} data-sig="${sig}" data-x="${it.x}" data-y="${it.y}" data-z="${it.y + fh}"${kind === 'plant' ? ` data-st="${it.stage}" data-f="${def.fp || 1}"` : ''} transform="${tr}">${frag}</g>`;
}
function _gdrVisitor(v, sc, o) {
  const W = GARDEN_WORLD, def = gardenVisitor(v.id); if (!def) return '';
  const px = v.x * W.cellW, py = W.sky + v.y * W.cellH - (v.lift ? v.lift * 64 * 0.75 * 0.85 : 0);
  const insect = def.kind === 'insect';
  const k = insect ? 0.4 : def.kind === 'bird' ? 0.85 : 0.9;   // a butterfly is smaller than the gardener's head (the same as the ones you catch), a robin about the size of it
  const frag = _gdArt(v.id, { kind: 'visitor', size: o.size, t: v.t || 0, tod: sc.tod, season: sc.season });
  const mot = o.still ? '' : ' gdv-' + (v.motion || 'sit');
  return `<g class="gd-vis${mot}" data-vid="${escAttr(v.id)}" data-x="${_gdrN(v.x - 0.5)}" data-y="${_gdrN(v.y)}" data-z="${_gdrN(v.y)}" data-sig="${gardenHash(v.id + px + ',' + py + mot).toString(36)}" transform="translate(${_gdrN(px)} ${_gdrN(py)})"><g class="gdv-in" style="--dl:-${_gdrN((v.t || 0) * 9)}s;--d:${_gdrN(6 + (v.t || 0) * 6)}s"><g transform="scale(${k}) ${v.flip ? 'scale(-1 1)' : ''}">${frag}</g></g></g>`;
}
function _gdrPets(sc, o) {
  if (typeof window === 'undefined' || typeof window.petGardenSprite !== 'function') return [];
  if (o.interactive && !o.photo && !o.friend) return [];   // 2.22: on your own page your pet walks with you (94-garden-world-0walk.js)
  let list = null;
  // integrate 2.18: o.friend (a friend view, gardenRender's option) brings THEIR pet into their garden (agent pets)
  const ctx = { season: sc.season, tod: sc.tod, size: o.size, readOnly: !!o.readOnly, rain: !!(sc.rain && sc.rain.now) };
  if (o.friend && typeof o.friend === 'object') ctx.friend = o.friend;
  try { list = window.petGardenSprite(ctx); } catch (e) { list = null; }
  if (!list) return [];
  if (!Array.isArray(list)) list = [list];
  const W = GARDEN_WORLD, occ = new Set(), out = [];
  for (const p of sc.plants || []) occ.add(p.x + ',' + p.y);
  for (const d of sc.decor || []) { const dd = gardenDecor(d.id); if (dd && dd.layer !== 'ground') occ.add(d.x + ',' + d.y); }
  list.slice(0, 3).forEach((p, i) => {
    if (!p || typeof p.svg !== 'string' || p.svg.length > 40000) return;
    const rnd = gardenRand('pet|' + (p.id || i) + '|' + (sc.day || ''));
    let x = 10, y = 9;
    const CB = gardenCropBox(o.crop), c0 = Math.max(1, Math.ceil(CB.x / W.cellW)), c1 = Math.min(W.cols - 1, Math.floor((CB.x + CB.w) / W.cellW) - 1);   // in the part you can see: the world grew, a plain garden's view did not
    for (let k = 0; k < 20; k++) { const cx = c0 + Math.floor(rnd() * Math.max(1, c1 - c0)), cy = 8 + Math.floor(rnd() * 3); if (!occ.has(cx + ',' + cy)) { x = cx; y = cy; break; } }
    const px = (x + 0.5) * W.cellW, py = W.sky + (y + 0.85) * W.cellH;
    // integrate 2.18: only a walking pet wanders (one asleep or sitting in the rain stays put: p.walk false or a sleepy
    // mood), and it turns round to walk back (.gdp-face flips on the return half of the alternating walk, 94-garden.css)
    const walks = !o.still && p.walk !== false && p.mood !== 'sleepy' && !occ.has((x - 1) + ',' + y) && !occ.has((x + 1) + ',' + y);   // it paces about a cell each way: only where there is room
    out.push({ z: y + 0.85, x, html: `<g class="gd-it gd-pet${walks ? ' gdv-walk' : ''}" data-sig="pet${i}${gardenHash(p.svg.length + '|' + x + ',' + y).toString(36)}" data-z="${y + 0.85}" transform="translate(${_gdrN(px)} ${_gdrN(py)})"><g class="gdv-in" style="--dl:-${_gdrN(rnd() * 20)}s;--d:${_gdrN(18 + rnd() * 10)}s"><g class="gdp-face"><g transform="scale(0.75)">${p.svg}</g></g></g></g>` });
  });
  return out;
}
function _gdrWeather(sc, o) {
  // agent 'garden-art' (guarded): its rain and snow loops, and the season's air when it is dry (94-garden-art-e-sky.js)
  if (typeof gartWeather === 'function') { try { const W0 = GARDEN_WORLD, wx = gartWeather('auto', { w: W0.cols * W0.cellW, h: W0.sky + W0.rows * W0.cellH, top: W0.sky, size: o.size, seed: sc.day || '', season: sc.season, tod: sc.tod, rain: sc.rain || {}, plants: sc.plants, areas: sc.areas }); if (wx) return `<g class="gd-weather">${wx}</g>`; } catch (e) { /* the engine's own below */ } }
  if (!sc.rain || !(sc.rain.now || sc.rain.snow)) return '<g class="gd-weather"></g>';
  const W = GARDEN_WORLD, ww = W.cols * W.cellW, hh = W.sky + W.rows * W.cellH, rnd = gardenRand('wx|' + (sc.day || ''));
  let s = `<g class="gd-weather${o.still ? '' : (sc.rain.snow ? ' is-snow' : ' is-rain')}">`;
  const n = o.size === 's' ? 40 : 90;
  for (let i = 0; i < n; i++) {
    const x = rnd() * ww, y = rnd() * hh;
    s += sc.rain.snow ? `<circle cx="${_gdrN(x)}" cy="${_gdrN(y)}" r="${_gdrN(1.2 + rnd() * 1.6)}" fill="#ffffff" fill-opacity="0.9" style="--dl:-${_gdrN(rnd() * 6)}s"/>`
      : `<line x1="${_gdrN(x)}" y1="${_gdrN(y)}" x2="${_gdrN(x - 3)}" y2="${_gdrN(y + 11)}" stroke="#d8e8f4" stroke-opacity="0.75" stroke-width="1.1" style="--dl:-${_gdrN(rnd() * 1.2)}s"/>`;
  }
  return s + '</g>';
}
function _gdrNight(sc, o, lights) {
  if (typeof gartNight === 'function') { try { return gartNight(sc, o, lights); } catch (e) { /* the engine's own below */ } }   // agent 'garden-art'
  const W = GARDEN_WORLD, ww = W.cols * W.cellW, hh = W.sky + W.rows * W.cellH;
  const a = sc.tod === 'night' ? 0.42 : sc.tod === 'dusk' ? 0.16 : sc.tod === 'dawn' ? 0.1 : 0;
  if (!a) return '';
  let s = `<rect x="0" y="${W.sky - 16}" width="${ww}" height="${hh - W.sky + 16}" fill="${sc.tod === 'dawn' ? '#5a3a6a' : '#0b1630'}" fill-opacity="${a}"/>`;
  // agent 'garden-art' (guarded): the light of the hour (a rosy dawn, a golden dusk, moonlight)
  if (typeof gartLighting === 'function') { try { s += gartLighting(sc.tod, { w: ww, h: hh, top: W.sky, season: sc.season }); } catch (e) { /* none */ } }
  if (sc.tod !== 'dawn') for (const L of lights) s += `<circle class="${o.still ? '' : 'gd-halo'}" cx="${_gdrN(L.x)}" cy="${_gdrN(L.y)}" r="${_gdrN(L.r)}" fill="url(#${o.uid}-glow)"/>`;
  return s;
}

/**
 * The scene in parts: {open (the <svg> tag without its label), label, layers: [[name, html]] in order, where the
 * 'objects' layer's items are items: [[sig, html]]}. gardenSceneSvg joins them; gardenSvgPatch compares them
 * with what is on screen and parses only what changed.
 */
function gardenSceneParts(sc, o) {
  o = Object.assign({ size: 'm', crop: 'all', uid: 'gd' }, o || {});
  const key = o.cacheKey ? o.cacheKey + '|' + [o.size, o.crop, o.still ? 1 : 0, o.photo ? 1 : 0, o.interactive ? 1 : 0, o.uid, o.fit || ''].join('|') : '';
  if (key && _GDR.cache.has(key)) return _GDR.cache.get(key);
  const W = GARDEN_WORLD, ww = W.cols * W.cellW;
  const box = gardenCropBox(o.crop);
  const open = `<svg xmlns="http://www.w3.org/2000/svg" class="gd-svg gd-tod-${sc.tod} gd-season-${sc.season}${o.still ? ' is-still' : ''}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" preserveAspectRatio="${o.fit || 'xMidYMid slice'}" role="img"`;
  const sky = _gdrSky(sc, o, ww, W.sky);
  const layers = [['defs', sky.defs], ['sky', sky.sky], ['clouds', sky.clouds], ['far', sky.far], ['ground', `<g class="gd-ground">${_gdrGround(sc, o)}</g>`]];
  layers.push(['grid', o.interactive && !o.photo ? `<g class="gd-gridlines" aria-hidden="true">${_gdrGridLines()}</g>` : '<g class="gd-gridlines"></g>']);
  const ground = [], objs = [], lights = [];
  for (const d of sc.decor || []) { const def = gardenDecor(d.id); if (!def) continue; (def.layer === 'ground' ? ground : objs).push({ kind: 'decor', it: d, def, z: d.y + (def.h || 1), x: d.x }); }
  for (const p of sc.plants || []) { const def = gardenPlant(p.id); if (!def) continue; objs.push({ kind: 'plant', it: p, def, z: p.y + (def.fp || 1), x: p.x }); }
  if (!o.noProps && typeof gardenWorldProps === 'function') for (const pr of gardenWorldProps(sc, o)) objs.push({ kind: 'prop', html: pr.html, z: pr.z, x: pr.x });   // 2.22: the tackle shop, the boat, the reeds, the forest
  for (const pet of _gdrPets(sc, o)) objs.push({ kind: 'prop', html: pet.html, z: pet.z, x: pet.x });   // friends' pets stand in their row too, not on top of everything
  objs.sort((a, b) => a.z - b.z || a.x - b.x || (a.kind === 'decor') - (b.kind === 'decor'));
  layers.push(['paths', '<g class="gd-paths">' + ground.map(g => _gdrItem('decor', g.it, sc, o)).join('') + '</g>']);
  // visitors go with the row they stand in, so whatever is in front of them is drawn after them
  // (in your garden and a friend's, the creatures the life engine draws are live: 94-garden-life-*.js; their still drawings stay for the photos and the Home card)
  const vis = (sc.visitors || []).filter(v => !((o.interactive || o.friend) && !o.photo && !o.still && typeof gardenLifeOwns === 'function' && gardenLifeOwns(v.id))).sort((a, b) => a.y - b.y);
  const items = [];
  const push = (html) => { if (!html) return; const m = /data-sig="([^"]+)"/.exec(html); items.push([m ? m[1] : String(gardenHash(html)), html]); };
  let vi = 0;
  for (const ob of objs) {
    while (vi < vis.length && vis[vi].y <= ob.z - 0.05) push(_gdrVisitor(vis[vi++], sc, o));
    push(ob.kind === 'prop' ? ob.html : _gdrItem(ob.kind, ob.it, sc, o));
    if (ob.kind === 'decor' && ob.def.effect && ob.def.effect.kind === 'light') lights.push({ x: (ob.it.x + (ob.def.w || 1) / 2) * W.cellW, y: W.sky + (ob.it.y + (ob.def.h || 1)) * W.cellH - 64 * (ob.def.look.h || 0.6) * 0.6, r: 70 * Math.max(1, ob.def.w || 1) });
    if (ob.kind === 'plant' && ob.def.glow && ob.it.stage >= 3) lights.push({ x: (ob.it.x + (ob.def.fp || 1) / 2) * W.cellW, y: W.sky + (ob.it.y + (ob.def.fp || 1)) * W.cellH - 64 * (ob.def.look.h || 0.6) * 0.5, r: 48 });
  }
  while (vi < vis.length) push(_gdrVisitor(vis[vi++], sc, o));
  layers.push(['objects', null]);
  layers.push(['actors', '<g class="gd-actors"></g>']);   // 2.22: bugs, the line and the bobber, drawn by the page's own loop
  layers.push(['pets', '<g class="gd-pets"></g>']);
  layers.push(['weather', _gdrWeather(sc, o)]);
  layers.push(['night', `<g class="gd-nightlayer">${_gdrNight(sc, o, lights)}</g>`]);
  if (o.interactive && !o.photo) layers.push(['ui', '<g class="gd-ui"><rect class="gd-hover" x="0" y="0" width="0" height="0" rx="4"/><rect class="gd-sel" x="0" y="0" width="0" height="0" rx="5"/><g class="gd-ghost"></g><g class="gd-fx"></g></g>']);
  const parts = { open, label: o.label || 'A garden', layers, items };
  if (key) { if (_GDR.cache.size > 24) _GDR.cache.clear(); _GDR.cache.set(key, parts); }
  return parts;
}
/** The SVG string of a garden scene (cached by every input through its parts). */
function gardenSceneSvg(sc, o) { return _gdrJoin(gardenSceneParts(sc, o)); }
function _gdrJoin(parts) {
  let s = parts.open + ` aria-label="${escAttr(parts.label)}">`;
  for (const [name, html] of parts.layers) s += name === 'objects' ? '<g class="gd-objects">' + parts.items.map(x => x[1]).join('') + '</g>' : html;
  return s + '</svg>';
}
function _gdrGridLines() {
  const W = GARDEN_WORLD;
  let d = '';
  for (let x = 0; x <= W.cols; x++) d += `M${x * W.cellW} ${W.sky}V${W.sky + W.rows * W.cellH}`;
  for (let y = 0; y <= W.rows; y++) d += `M0 ${W.sky + y * W.cellH}H${W.cols * W.cellW}`;
  return `<path d="${d}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1" fill="none"/>`;
}

/* ---------- scenes from your garden or a snapshot ---------- */
function _gdrShowOf() { try { return typeof gardenShowEntries === 'function' ? gardenShowEntries() : null; } catch (e) { return null; } }
function _gdrShowSig() { try { return typeof gardenShowSig === 'function' ? gardenShowSig(_gdrShowOf()) : ''; } catch (e) { return ''; } }
function gardenSceneFromModel(m) {
  const p = Clock.parts(m.now);
  return {
    plants: m.plants.map(x => ({ id: x.def.id, uid: x.uid, x: x.x, y: x.y, stage: x.stage, variant: x.variant, thirsty: x.thirsty, overgrown: x.overgrown, ripe: x.ripe, t: x.t, heart: x.heart })),
    decor: m.decor.map(d => ({ id: d.def.id, uid: d.uid, x: d.x, y: d.y, r: d.r, v: d.v, t: (gardenHash(d.uid) % 100) / 100 })),
    areas: m.areas, season: m.season, tod: m.tod, rain: m.rain, visitors: m.visitors, lv: m.level.level, hour: Math.round((p.h + p.mi / 60) * 4) / 4, day: m.today,
    show: _gdrShowOf(), showSig: _gdrShowSig(),
  };
}
/** A friend's (or anyone's) snapshot as a scene: their garden, your sky (your clock, their season). */
function _gdrSceneFromSnapshot(snap, o) {
  const now = o.now || _gdNow(), p = Clock.parts(now), day = p.iso;
  const season = o.season || snap.season;
  const tod = o.tod || _gdTod(now, season);
  const plants = snap.plants.map(([id, x, y, stage, variant, flags]) => ({ id, x, y, stage, variant, thirsty: !!(flags & 1), overgrown: !!(flags & 2), ripe: !!(flags & 4), t: (gardenHash(id + x + ',' + y) % 1000) / 1000, heart: id === 'heart-oak' ? snap.heart : undefined }));
  const decor = snap.decor.map(([id, x, y, r, v]) => ({ id, x, y, r, v, t: (gardenHash(id + x + ',' + y) % 100) / 100 }));
  // a few visitors from what grows there (the same for 20 minutes)
  const visitors = [];
  if (!o.still && gardenFun() !== 'off') {
    const rnd = gardenRand('fv|' + Math.floor(now / 1200000) + '|' + snap.at);
    const blooms = plants.filter(q => q.stage >= 4 && ['flower', 'wild', 'exotic'].includes((gardenPlant(q.id) || {}).cat));
    if (tod === 'day' && blooms.length >= 2 && season !== 'winter') for (const id of ['honeybee', 'cabbage-white']) { const b = blooms[Math.floor(rnd() * blooms.length)]; const d = gardenPlant(b.id); visitors.push({ id, x: b.x + 0.5, y: b.y + 0.9, lift: (d.look.h || 0.7), motion: id === 'honeybee' ? 'buzz' : 'flutter', t: rnd() }); }
    if (snap.areas.includes('pond')) { const w = gardenArea('pond').water; visitors.push({ id: tod === 'night' ? 'newt' : 'frog', x: w.x + 0.5 + rnd() * (w.w - 1), y: w.y + 1, motion: 'hop', t: rnd() }); }
    if (snap.decor.some(d => ['bird-bath', 'bird-feeder', 'bird-box'].includes(d[0]))) { const d = snap.decor.find(q => ['bird-bath', 'bird-feeder', 'bird-box'].includes(q[0])); visitors.push({ id: 'robin', x: d[1] + 0.5, y: d[2] + 0.8, lift: 0.7, motion: 'hop', t: rnd() }); }
  }
  // 2.22: a friend on an older version has no lake or woods in their areas: the lake is always there, the woods from level 4
  const areas = snap.areas.slice(); if (!areas.includes('lake')) areas.push('lake'); if (snap.lv >= 4 && !areas.includes('woods')) areas.push('woods');
  return { plants, decor, areas, season, tod, rain: { now: false, snow: false }, visitors, lv: snap.lv, hour: p.h + p.mi / 60, day, show: snap.sh || null, showSig: typeof gardenShowSig === 'function' ? gardenShowSig(snap.sh) : '' };
}
/**
 * Draw anyone's garden into el, read-only. snapshot: from gardenSnapshot() or a friend (cleaned here).
 * Returns {svg, destroy()} or null when there is nothing valid to draw.
 */
function gardenRender(el, snapshot, o) {
  o = Object.assign({ readOnly: true, size: 'm', crop: 'all' }, o || {});
  if (!el) return null;
  const snap = gardenSnapshotClean(snapshot);
  el.textContent = '';
  if (!snap) {
    const p = document.createElement('p'); p.className = 'gd-empty muted'; p.textContent = 'This garden could not be shown.';
    el.appendChild(p);
    return null;
  }
  const still = o.still || !gardenMotionOn();
  const sc = _gdrSceneFromSnapshot(snap, Object.assign({}, o, { still }));
  const who = o.visitor && o.visitor.name ? String(o.visitor.name).slice(0, 60) : '';
  const wrap = document.createElement('figure'); wrap.className = 'gd-view gd-sz-' + o.size + (o.readOnly ? ' is-readonly' : '');
  const holder = document.createElement('div'); holder.className = 'gd-stage';
  const uid = 'gdr' + (++_GDR.seq);
  holder.innerHTML = gardenSceneSvg(sc, { size: o.size, crop: o.crop, still, uid, label: who ? `${who}'s garden` : 'A garden', fit: o.fit, readOnly: true, friend: o.friend || null });
  wrap.appendChild(holder);
  if (who) { const cap = document.createElement('figcaption'); cap.className = 'gd-cap'; cap.textContent = `${who}’s garden · level ${snap.lv}`; wrap.appendChild(cap); }
  el.appendChild(wrap);
  return { svg: holder.firstElementChild, destroy() { wrap.remove(); } };
}
/** The scene as a PNG blob (photo mode): the SVG drawn on a canvas. */
function gardenScenePng(svgString, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const sized = svgString.replace(/class="[^"]*"/g, '').replace('<svg ', `<svg width="${w}" height="${h}" `);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png');
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('The picture could not be drawn'));
    img.src = url;
  });
}

/**
 * Bring a garden SVG on screen up to date with a scene, touching only what changed. Give it the scene's parts
 * (gardenSceneParts): each layer is compared with what was drawn last time (strings, nothing serialised) and
 * only the layers and items that differ are parsed; inside the objects layer every unchanged item (keyed by its
 * data-sig) keeps its node, so swaying plants and flying visitors carry on instead of restarting. A plain string
 * works too (parsed whole). Returns the element now on screen (a new one when the frame itself changed: the crop,
 * the time of day, the season or stillness).
 */
function gardenSvgPatch(oldSvg, partsOrHtml) {
  const parts = typeof partsOrHtml === 'string' ? null : partsOrHtml;
  const full = () => {
    const t = document.createElement('template'); t.innerHTML = parts ? _gdrJoin(parts) : partsOrHtml;
    const nu = t.content.firstElementChild;
    if (oldSvg && oldSvg.parentNode && nu) oldSvg.parentNode.replaceChild(nu, oldSvg);
    if (nu && parts) _gdrRemember(nu, parts);
    return nu || oldSvg;
  };
  if (!oldSvg || !oldSvg.parentNode || !parts || !oldSvg._gdParts || oldSvg._gdParts.open !== parts.open || oldSvg._gdParts.names !== parts.layers.map(l => l[0]).join(',')) return full();
  const was = oldSvg._gdParts, kids = [...oldSvg.children];
  if (kids.length !== parts.layers.length) return full();
  parts.layers.forEach(([name, h], i) => {
    if (name === 'objects') { _gdrPatchItems(kids[i], parts.items); return; }
    if (name === 'ui' || was.layers[name] === h) return;
    const nu = _gdrParse(h)[0];
    if (nu) oldSvg.replaceChild(nu, kids[i]);
  });
  oldSvg.setAttribute('aria-label', parts.label);
  _gdrRemember(oldSvg, parts);
  return oldSvg;
}
/** Draw a scene's parts into a holder from scratch, remembering them for the next patch. */
function gardenSvgMount(holder, parts) {
  holder.innerHTML = _gdrJoin(parts);
  const svg = holder.firstElementChild;
  if (svg) _gdrRemember(svg, parts);
  return svg;
}
function _gdrRemember(svg, parts) {
  const layers = {};
  for (const [n, h] of parts.layers) if (h != null) layers[n] = h;
  svg._gdParts = { open: parts.open, names: parts.layers.map(l => l[0]).join(','), layers };
}
/** SVG markup to nodes in the SVG namespace. */
function _gdrParse(html) {
  const t = document.createElement('template');
  t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + html + '</svg>';
  return [...t.content.firstElementChild.children];
}
function _gdrPatchItems(layer, items) {
  const pool = new Map();
  for (const el of [...layer.children]) { const k = el.getAttribute('data-sig'); if (!k) continue; const list = pool.get(k); if (list) list.push(el); else pool.set(k, [el]); }
  // parse every new item in one go
  const fresh = [];
  const avail = new Map([...pool].map(([k, l]) => [k, l.length]));
  for (const it of items) { const a = avail.get(it[0]) || 0; if (a > 0) avail.set(it[0], a - 1); else fresh.push(it); }
  const parsed = fresh.length ? _gdrParse(fresh.map(x => x[1]).join('')) : [];
  let pi = 0;
  const next = items.map(([sig]) => { const l = pool.get(sig); if (l && l.length) return l.shift(); return parsed[pi++]; }).filter(Boolean);
  let ref = layer.firstChild;
  for (const el of next) { if (el === ref) { ref = ref.nextSibling; continue; } layer.insertBefore(el, ref); }
  // what the world's loop drew (you, your pet, bugs, anything from gardenWorldAdd: data-live) is not the scene's to remove: it goes back in its row
  const live = [];
  while (ref) { const n = ref.nextSibling; if (ref.hasAttribute('data-live')) live.push(ref); else ref.remove(); ref = n; }
  for (const el of live) {
    const z = Number(el.getAttribute('data-z')); let at = null;
    for (const c of layer.children) { if (c === el) continue; const cz = Number(c.getAttribute('data-z')); if (Number.isFinite(cz) && cz > z) { at = c; break; } }
    if (el.nextSibling !== at) layer.insertBefore(el, at);
  }
}
