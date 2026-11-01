/* ============================================================
   GARDENS WITH FRIENDS: THE CO-OP BED (2.18, agent 'garden-social'; docs/dev/GARDEN.md section 11).
   A Together space's 'Shared bed' tab (99-together-1space.js calls gardenSocialSpaceBed when this file is
   there): a raised bed of 8 x 3 cells that everyone in the space plants in and tends.

     plant      a seed from YOUR garden's bag into a free cell (the space's part 'bed', lib/friends/spaces.mjs:
                {id, by, at, plant, x, y, v}); a line goes in the space's feed; Undo takes it out again and
                gives the seed back. Only the planter can dig their plant up
     water      anyone in the space, every few hours (their own entry in the plant's map 'water'): each member
                who has ever watered a plant adds GSOC_BED.bonusH hours to its growth (at most maxWaterers), so
                it blooms sooner the more of you tend it; dry soil only slows it (nothing dies)
     growth     worked out on every member's computer from the space's data (gsocBedState, 94-garden-social-0rules.js)
   Merged like the rest of the space (one register per field, last writer wins; each member's watering is their
   own map entry). Plant ids are checked against this computer's catalogue before anything is drawn; a plant it
   does not know is shown as a seedling with a note. Names come from Together (textContent only).
   ============================================================ */
const _gsb = { celebrated: new Set() };
const _GSB = Object.freeze({ W: 640, H: 300, top: 132, front: 236, base: 268, bx0: 96, bx1: 544, fx0: 40, fx1: 600 });
const _GSB_HUES = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c', '#5f3dc4'];
function _gsbHue(fid) { return _GSB_HUES[gardenHash(String(fid || '')) % _GSB_HUES.length]; }
function _gsbN(v) { return Math.round(v * 10) / 10; }
/** The centre of cell (x, y) on the bed's soil, and the art's scale there (the back row is further away). */
function _gsbCell(x, y) {
  const G = _GSB, rows = GSOC_BED.rows, cols = GSOC_BED.cols;
  const k = (y + 0.72) / rows;                                    // 0 at the back edge, 1 at the front
  const cy = G.top + k * (G.front - G.top);
  const l = G.bx0 + (G.fx0 - G.bx0) * k, r = G.bx1 + (G.fx1 - G.bx1) * k;
  const w = (r - l) / cols;
  return { cx: l + (x + 0.5) * w, cy, w, s: (w / 64) * 0.82 };
}
function _gsbSeason() { try { return gardenSeasonOf(_gscToday(), gardenSouthern(typeof Clock !== 'undefined' ? Clock.zone() : '')); } catch (e) { return 'summer'; } }
function _gsbTod(season) {
  if (typeof _gdTod === 'function') { try { return _gdTod(_gscNow(), season); } catch (e) { /* below */ } }
  const h = new Date(_gscNow()).getHours();   // clock-ok: a rough sky only
  return h < 6 || h >= 21 ? 'night' : h < 8 ? 'dawn' : h >= 19 ? 'dusk' : 'day';
}
function _gsbArt(id, o) {
  if (typeof _gdArt === 'function') { try { return _gdArt(id, o); } catch (e) { /* below */ } }
  if (typeof gardenArtPlaceholder === 'function') { try { return gardenArtPlaceholder(id, o); } catch (e) { /* none */ } }
  return '';
}
/** The bed's plants with their state; later plantings that landed on a taken cell move to the next free one. */
function _gsbPlants(v, now, season) {
  const raw = Array.isArray(v && v.bed) ? v.bed : [];
  const els = raw.filter(e => e && typeof e === 'object' && typeof e.id === 'string').slice().sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0) || (a.id < b.id ? -1 : 1));
  const taken = new Set(), out = [];
  const free = () => { for (let y = GSOC_BED.rows - 1; y >= 0; y--) for (let x = 0; x < GSOC_BED.cols; x++) if (!taken.has(x + ',' + y)) return [x, y]; return null; };
  for (const e of els) {
    let x = Number.isInteger(e.x) && e.x >= 0 && e.x < GSOC_BED.cols ? e.x : 0, y = Number.isInteger(e.y) && e.y >= 0 && e.y < GSOC_BED.rows ? e.y : 0;
    if (taken.has(x + ',' + y)) { const f = free(); if (!f) continue; [x, y] = f; }
    taken.add(x + ',' + y);
    const def = gardenPlant(e.plant);
    const known = !!def && gsocBedPlantOk(def);
    const st = known ? gsocBedState(e, def, now, season) : { stage: 1, thirsty: false, waterers: 0, lastWater: Number(e.at) || now, nextIn: null };
    out.push({ el: e, def: known ? def : null, x, y, ...st, variant: Math.max(0, Math.min(7, Number(e.v) || 0)), mine: e.by === tgMe() });
  }
  return { plants: out, taken };
}
function _gsbSky(tod, season) {
  const sky = { day: { spring: ['#a6d8f4', '#eaf7fc'], summer: ['#8fcbf0', '#e6f5fb'], autumn: ['#b0cde2', '#f4ecdc'], winter: ['#c4d4e0', '#eef2f6'] }[season] || ['#9fd3f2', '#e8f6fc'],
    dawn: ['#f2b8a4', '#fbe7cf'], dusk: ['#b98ab4', '#f4b98a'], night: ['#16244a', '#2f416c'] }[tod] || ['#9fd3f2', '#e8f6fc'];
  return sky;
}
/** The whole bed as one SVG (explicit colours; the art's own animation classes run under .gd-svg). */
function _gsbSvg(sp, list, o) {
  const G = _GSB, season = o.season, tod = o.tod, uid = 'gsb' + gardenHash(sp.id).toString(36);
  const [top, bot] = _gsbSky(tod, season);
  const night = tod === 'night', dim = night ? 0.45 : tod === 'dusk' ? 0.18 : 0;
  const shade = (c, k) => (typeof _gdaShade === 'function' ? _gdaShade(c, k) : c);
  const mix = (a, b, k) => (typeof _gdaMix === 'function' ? _gdaMix(a, b, k) : a);
  const dimmed = (c) => (dim ? mix(c, '#1a2440', dim) : c);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" class="gd-svg gsb-svg${o.still ? ' is-still' : ''}" viewBox="0 0 ${G.W} ${G.H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="The shared bed">`;
  s += `<defs><linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
    + `<linearGradient id="${uid}-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dimmed('#6b4a32')}"/><stop offset="1" stop-color="${dimmed('#7d5838')}"/></linearGradient></defs>`;
  s += `<rect width="${G.W}" height="${G.H}" fill="url(#${uid}-sky)"/>`;
  if (night) { const rnd = gardenRand('gsb-stars|' + sp.id); for (let i = 0; i < 26; i++) s += `<circle cx="${_gsbN(rnd() * G.W)}" cy="${_gsbN(rnd() * 90)}" r="${_gsbN(0.6 + rnd())}" fill="#ffffff" fill-opacity="${_gsbN(0.4 + rnd() * 0.5)}"/>`; s += '<circle cx="540" cy="40" r="15" fill="#f4f1e0"/>'; }
  else s += `<circle cx="${tod === 'dawn' ? 90 : tod === 'dusk' ? 560 : 520}" cy="${tod === 'day' ? 42 : 70}" r="30" fill="#ffd45a" fill-opacity="0.22"/><circle cx="${tod === 'dawn' ? 90 : tod === 'dusk' ? 560 : 520}" cy="${tod === 'day' ? 42 : 70}" r="15" fill="${tod === 'day' ? '#ffd45a' : '#ffb26a'}"/>`;
  // hills, a hedge and the fence behind the bed
  const hills = { spring: ['#a8cf7a', '#8fbf62'], summer: ['#9cc86a', '#80b456'], autumn: ['#c4b46a', '#a8a052'], winter: ['#c4ccc0', '#aab4a8'] }[season] || ['#9cc86a', '#80b456'];
  s += `<path d="M0 96Q120 58 260 88T520 80T640 92V140H0Z" fill="${dimmed(hills[0])}"/><path d="M0 112Q180 92 360 110T640 104V140H0Z" fill="${dimmed(hills[1])}"/>`;
  const hedge = dimmed(season === 'winter' ? '#6a7f62' : '#4f7a3e');
  s += `<rect x="0" y="108" width="${G.W}" height="22" rx="8" fill="${hedge}"/>`;
  for (let x = 8; x < G.W; x += 22) s += `<circle cx="${x}" cy="110" r="9" fill="${hedge}"/>`;
  const fence = dimmed('#efe6d2'), fenceS = dimmed('#c8b896');
  let pick = '';
  for (let x = 6; x < G.W; x += 18) pick += `<path d="M${x} 136V104l5-6 5 6v32z"/>`;
  s += `<g fill="${fence}" stroke="${fenceS}" stroke-width="1">${pick}<rect x="0" y="110" width="${G.W}" height="4" rx="1"/><rect x="0" y="124" width="${G.W}" height="4" rx="1"/></g>`;
  // the lawn
  const lawn = dimmed({ spring: '#8cc46a', summer: '#86bf5e', autumn: '#a9b35e', winter: '#b9c4ae' }[season] || '#86bf5e');
  s += `<rect x="0" y="134" width="${G.W}" height="${G.H - 134}" fill="${lawn}"/>`;
  for (let x = 0; x < G.W; x += 64) s += `<rect x="${x}" y="134" width="32" height="${G.H - 134}" fill="${shade(lawn, 0.05)}"/>`;
  // the raised bed: soil, furrows, the frame
  const wood = dimmed('#a8754a'), woodD = dimmed('#8a5c38'), woodL = dimmed('#c08d5e');
  s += `<path d="M${G.bx0 - 10} ${G.top - 6}H${G.bx1 + 10}L${G.fx1 + 14} ${G.front + 4}H${G.fx0 - 14}Z" fill="${woodD}"/>`;
  s += `<path d="M${G.bx0} ${G.top}H${G.bx1}L${G.fx1} ${G.front}H${G.fx0}Z" fill="url(#${uid}-soil)"/>`;
  for (let r = 0; r < GSOC_BED.rows; r++) {
    const a = _gsbCell(0, r), b = _gsbCell(GSOC_BED.cols - 1, r);
    s += `<path d="M${_gsbN(a.cx - a.w * 0.45)} ${_gsbN(a.cy + 3)}H${_gsbN(b.cx + b.w * 0.45)}" stroke="${dimmed('#5a3c28')}" stroke-width="${_gsbN(2 + r)}" stroke-linecap="round" opacity="0.6"/>`;
  }
  const rnd = gardenRand('gsb-soil|' + sp.id);
  for (let i = 0; i < 70; i++) { const k = rnd(), cy = G.top + 4 + k * (G.front - G.top - 8), l = G.bx0 + (G.fx0 - G.bx0) * ((cy - G.top) / (G.front - G.top)), r2 = G.bx1 + (G.fx1 - G.bx1) * ((cy - G.top) / (G.front - G.top)); s += `<circle cx="${_gsbN(l + 8 + rnd() * (r2 - l - 16))}" cy="${_gsbN(cy)}" r="${_gsbN(0.8 + rnd() * 1.4)}" fill="${dimmed(rnd() < 0.5 ? '#8a6446' : '#4e3422')}"/>`; }
  // the planks in front, with their grain, and the corner posts
  s += `<path d="M${G.fx0 - 14} ${G.front + 4}H${G.fx1 + 14}V${G.base + 8}H${G.fx0 - 14}Z" fill="${wood}"/>`;
  for (let i = 1; i < 3; i++) s += `<path d="M${G.fx0 - 14} ${_gsbN(G.front + 4 + i * ((G.base + 4 - G.front) / 3))}H${G.fx1 + 14}" stroke="${woodD}" stroke-width="1.6"/>`;
  for (let i = 0; i < 9; i++) { const x = G.fx0 + rnd() * (G.fx1 - G.fx0), y = G.front + 8 + rnd() * 26; s += `<path d="M${_gsbN(x)} ${_gsbN(y)}q14 -2 30 0" stroke="${woodL}" stroke-width="1" fill="none" opacity="0.7"/>`; }
  for (const x of [G.fx0 - 18, (G.fx0 + G.fx1) / 2 - 4, G.fx1 + 10]) s += `<rect x="${_gsbN(x)}" y="${G.front - 2}" width="10" height="${G.base - G.front + 14}" rx="2" fill="${woodD}"/><rect x="${_gsbN(x)}" y="${G.front - 4}" width="10" height="4" rx="1.5" fill="${woodL}"/>`;
  // a few flowers in the lawn and a watering can by the bed (it is a garden, not a chart)
  for (let i = 0; i < 14; i++) { const x = 8 + rnd() * (G.W - 16), y = G.base + 14 + rnd() * 14; s += `<path d="M${_gsbN(x)} ${_gsbN(y)}l-2 -6M${_gsbN(x)} ${_gsbN(y)}l2 -7" stroke="${shade(lawn, -0.2)}" stroke-width="1.2"/>`; if (season !== 'winter' && i % 3 === 0) s += `<circle cx="${_gsbN(x + 2)}" cy="${_gsbN(y - 8)}" r="2" fill="${['#f7d417', '#fbfbf6', '#e05a8a', '#8aa0e8'][i % 4]}"/>`; }
  s += `<g transform="translate(600 284)"><ellipse cx="0" cy="2" rx="18" ry="3" fill="#000000" fill-opacity="0.12"/><path d="M-12 0V-14a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4V0z" fill="${dimmed('#5f9fc4')}"/><path d="M8 -12l14 -10 2 3-12 11z" fill="${dimmed('#4f8fb4')}"/><path d="M-12 -12c-8 0-8 8 0 8" stroke="${dimmed('#4f8fb4')}" stroke-width="2.4" fill="none"/></g>`;
  // the cells: empty ones are little mounds to plant in; plants back to front
  let cells = '', plants = '';
  if (!o.ro) for (let y = 0; y < GSOC_BED.rows; y++) for (let x = 0; x < GSOC_BED.cols; x++) {
    if (o.taken.has(x + ',' + y)) continue;
    const c = _gsbCell(x, y);
    cells += `<g class="gsb-cell" data-x="${x}" data-y="${y}" tabindex="0" role="button" aria-label="Plant here (row ${y + 1}, spot ${x + 1})"><ellipse cx="${_gsbN(c.cx)}" cy="${_gsbN(c.cy)}" rx="${_gsbN(c.w * 0.38)}" ry="${_gsbN(c.w * 0.13)}" fill="${dimmed('#5a3c28')}" opacity="0.55"/><path class="gsb-plus" d="M${_gsbN(c.cx - 5)} ${_gsbN(c.cy - 6)}h10M${_gsbN(c.cx)} ${_gsbN(c.cy - 11)}v10" stroke="#fff6dc" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  for (const p of list.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
    const c = _gsbCell(p.x, p.y);
    const frag = _gsbArt(p.def ? p.def.id : 'meadow-grass', { kind: 'plant', stage: p.def ? p.stage : 1, season, variant: p.variant, size: 'm', t: (gardenHash(p.el.id) % 1000) / 1000, tod, thirsty: p.thirsty, overgrown: false, ripe: false, glow: !!(p.def && p.def.glow) });
    const label = p.def ? `${p.def.name}, ${gardenStageName(p.def, p.stage).toLowerCase()}, planted by ${tgFirst(p.el.by)}` : 'A plant from a newer Freeflo';
    let marks = '';
    if (p.thirsty) marks += `<g class="gda-bob" transform="translate(0 ${_gsbN(-Math.max(18, 64 * c.s * (p.def ? p.def.look.h || 0.8 : 0.6) * (Math.max(1, p.stage) / 5) + 8))})"><path d="M0 -10c-4 5-6 8-6 10a6 6 0 0 0 12 0c0-2-2-5-6-10z" fill="#5fb3f0" stroke="#2f7fc0" stroke-width="1"/></g>`;
    const waterers = Object.keys((p.el.water && typeof p.el.water === 'object') ? p.el.water : {}).filter(k => Number(p.el.water[k]) > (Number(p.el.at) || 0)).slice(0, 5);
    waterers.forEach((k, i) => { marks += `<circle cx="${_gsbN((i - (waterers.length - 1) / 2) * 9)}" cy="10" r="3.6" fill="${_gsbHue(k)}" stroke="#ffffff" stroke-width="1.2"/>`; });
    plants += `<g class="gd-it gsb-plant${p.thirsty ? ' is-thirsty' : ''}${p.mine ? ' is-mine' : ''}" data-id="${escAttr(p.el.id)}" tabindex="0" role="button" aria-label="${escAttr(label)}" transform="translate(${_gsbN(c.cx)} ${_gsbN(c.cy)})"><ellipse cx="0" cy="3" rx="${_gsbN(c.w * 0.32)}" ry="${_gsbN(c.w * 0.1)}" fill="#000000" fill-opacity="0.18"/><g transform="scale(${_gsbN(c.s)})">${frag}</g>${marks}</g>`;
  }
  s += `<g class="gsb-cells">${cells}</g><g class="gsb-plants">${plants}</g>`;
  if (dim) s += `<rect width="${G.W}" height="${G.H}" fill="#0b1630" fill-opacity="${night ? 0.22 : 0.08}" pointer-events="none"/>`;
  return s + '</svg>';
}

/* ---------- the tab ---------- */
function gardenSocialSpaceBed(body, sp, ro) {
  const v = sp.value || {};
  const now = _gscNow(), season = _gsbSeason(), tod = _gsbTod(season);
  const { plants, taken } = _gsbPlants(v, now, season);
  const me = tgMe();
  const wrap = tgEl('div', 'gsb');
  // the line at the top: what it is, who has watered lately
  const head = tgEl('div', 'gsb-head');
  const t = tgEl('div', 'gsb-head-t');
  t.appendChild(tgEl('b', '', 'The shared bed'));
  t.appendChild(tgEl('span', 'muted', plants.length ? `${plants.length} of ${GSOC_BED.max} spots growing. The more of you water a plant, the sooner it blooms.` : 'Plant something from your garden bag: everyone here can water it, and it blooms sooner the more of you tend it.'));
  head.appendChild(t);
  const people = tgEl('div', 'gsb-people');
  const day = 24 * 3600000;
  for (const fid of tgMembers(v).slice(0, 10)) {
    const a = tgEl('span', 'gsb-person');
    a.appendChild(tgAvatarEl(fid, 'sm', v));
    const watered = plants.some(p => p.el.water && Number(p.el.water[fid]) > now - day);
    if (watered) { const d = tgEl('i', 'gsb-drop'); d.title = `${tgFirst(fid, v)} watered today`; a.appendChild(d); }
    a.title = tgName(fid, v) + (watered ? ': watered in the last day' : '');
    a.style.setProperty('--hue', _gsbHue(fid));
    people.appendChild(a);
  }
  head.appendChild(people);
  wrap.appendChild(head);
  // the bed
  const still = !(typeof gardenMotionOn === 'function' ? gardenMotionOn() : !_gscReduced());
  const stage = tgEl('div', 'gsb-stage');
  stage.innerHTML = _gsbSvg(sp, plants, { season, tod, ro, taken, still });   // built from the catalogue, the art and numbers; names only in escaped aria labels
  wrap.appendChild(stage);
  const status = tgEl('div', 'gsb-status muted', '');
  wrap.appendChild(status);
  // the actions
  if (!ro) {
    const bar = tgEl('div', 'gsb-bar');
    const canWater = plants.filter(p => p.def && p.def.thirst && _gsbCanWater(p, me, now));
    bar.appendChild(tgBtn(canWater.length ? `Water ${canWater.length === 1 ? 'the thirsty one' : `${canWater.length} plants`}` : 'Everything has had a drink', { icon: 'droplets', primary: canWater.some(p => p.thirsty), disabled: !canWater.length, run: () => _gsbWater(sp, canWater) }));
    const firstFree = (() => { for (let y = GSOC_BED.rows - 1; y >= 0; y--) for (let x = 0; x < GSOC_BED.cols; x++) if (!taken.has(x + ',' + y)) return [x, y]; return null; })();
    bar.appendChild(tgBtn('Plant something', { icon: 'sprout', disabled: !firstFree, run: (e, b) => { if (firstFree) _gsbSeedMenu(b, sp, firstFree[0], firstFree[1]); } }));
    if (!firstFree) bar.appendChild(tgEl('span', 'muted tg-sm', 'The bed is full: let something bloom, then its planter can make room.'));
    wrap.appendChild(bar);
  }
  body.appendChild(wrap);
  _gsbBind(stage, status, sp, plants, ro);
  _gsbCelebrate(sp, plants);
}
function _gsbCanWater(p, me, now) {
  const mine = p.el.water && Number(p.el.water[me]);
  return !mine || now - mine >= GSOC_BED.waterGapH * 3600000;
}
function _gsbBind(stage, status, sp, plants, ro) {
  const byId = new Map(plants.map(p => [p.el.id, p]));
  const hit = (t) => (t && t.closest ? t.closest('.gsb-plant, .gsb-cell') : null);
  const say = (g) => {
    if (!g) { status.textContent = ''; return; }
    if (g.classList.contains('gsb-cell')) { status.textContent = 'An empty spot: plant a seed from your bag'; return; }
    const p = byId.get(g.getAttribute('data-id'));
    if (!p) return;
    status.textContent = _gsbLine(p);
  };
  stage.addEventListener('pointermove', (e) => say(hit(e.target)));
  stage.addEventListener('pointerleave', () => say(null));
  stage.addEventListener('focusin', (e) => say(hit(e.target)));
  const use = (g) => {
    if (!g) return;
    if (g.classList.contains('gsb-cell')) { if (!ro) _gsbSeedMenu(g, sp, +g.getAttribute('data-x'), +g.getAttribute('data-y')); return; }
    const p = byId.get(g.getAttribute('data-id'));
    if (p) _gsbPlantMenu(g, sp, p, ro);
  };
  stage.addEventListener('click', (e) => use(hit(e.target)));
  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const g = hit(e.target); if (g) { e.preventDefault(); use(g); } } });
}
function _gsbLine(p) {
  if (!p.def) return 'A plant from a newer Freeflo: update to see it grow';
  const bits = [p.def.name, gardenStageName(p.def, p.stage).toLowerCase(), `planted by ${tgFirst(p.el.by)}`];
  if (p.thirsty) bits.push('a little thirsty');
  if (p.waterers) bits.push(`${p.waterers} ${p.waterers === 1 ? 'person has' : 'people have'} watered it`);
  return bits.join(' · ');
}
function _gsbPlantMenu(anchor, sp, p, ro) {
  const me = tgMe(), now = _gscNow();
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop');
    const top = tgEl('div', 'gsv-pop-h');
    const ic = tgEl('span', 'gsv-pop-ic');
    ic.innerHTML = p.def ? gardenIconSvg(p.def.id, { kind: 'plant', stage: Math.max(1, p.stage), variant: p.variant, px: 44 }) : icon('sprout', 'i-lg');
    top.appendChild(ic);
    const t = tgEl('div');
    t.appendChild(tgEl('b', '', p.def ? p.def.name : 'A new plant'));
    t.appendChild(tgEl('span', 'muted gsv-small', p.def ? `${gardenStageName(p.def, p.stage)} · planted by ${tgFirst(p.el.by)} ${tgAgo(p.el.at)}` : 'From a newer Freeflo'));
    top.appendChild(t);
    el.appendChild(top);
    if (p.def) {
      const lines = [];
      if (p.stage < 4 && p.nextIn) lines.push(`Next stage in about ${p.nextIn < 20 ? Math.max(1, Math.round(p.nextIn)) + ' hours' : Math.round(p.nextIn / 24) + ' days'}.`);
      else if (p.stage >= 4) lines.push('In full bloom: well tended, all of you.');
      lines.push(p.waterers ? `${p.waterers} of you ${p.waterers === 1 ? 'has' : 'have'} watered it: ${GSOC_BED.bonusH * Math.min(GSOC_BED.maxWaterers, p.waterers)} hours ahead.` : 'Nobody has watered it yet: the first drink gives it a head start.');
      el.appendChild(tgEl('p', 'gsv-pop-p', lines.join(' ')));
    }
    if (!ro) {
      const row = tgEl('div', 'gsv-row');
      if (p.def && p.def.thirst) {
        const can = _gsbCanWater(p, me, now);
        row.appendChild(tgBtn(can ? 'Water it' : 'Watered recently', { icon: 'droplet', primary: can, disabled: !can, run: () => { close(); _gsbWater(sp, [p]); } }));
      }
      if (p.el.by === me) row.appendChild(tgBtn('Dig up', { icon: 'shovel', ghost: true, run: () => { close(); _gsbDig(sp, p); } }));
      el.appendChild(row);
    }
  }, { align: 'center' });
}
/** Your seeds that grow in a bed (one cell, not trees or pond plants). */
function _gsbSeeds() {
  let w = null;
  try { w = typeof gardenReady === 'function' && gardenReady() && gardenEnsure() ? gardenWallet() : null; } catch (e) { w = null; }
  if (!w) return null;
  const out = [];
  for (const [k, n] of Object.entries(w.items || {})) {
    if (!(n > 0) || !k.startsWith('seed:')) continue;
    const def = gardenPlant(k.slice(5));
    if (def && gsocBedPlantOk(def)) out.push({ def, n: Math.floor(n) });
  }
  return out.sort((a, b) => a.def.name.localeCompare(b.def.name));
}
function _gsbSeedMenu(anchor, sp, x, y) {
  const seeds = _gsbSeeds();
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(tgEl('div', 'pop-label', 'Plant from your bag'));
    if (!seeds) { el.appendChild(tgEl('p', 'gsv-pop-p muted', 'Your garden is still waking up: try again in a moment.')); return; }
    if (!seeds.length) {
      el.appendChild(tgEl('p', 'gsv-pop-p muted', 'No seeds for a bed in your bag just now. The garden shop has plenty, and every three tasks you finish in a day bring a free packet.'));
      el.appendChild(tgBtn('Open the shop', { icon: 'store', run: () => { close(); setView('garden:shop'); } }));
      return;
    }
    const list = tgEl('div', 'gsv-gift-list');
    for (const s of seeds.slice(0, 50)) {
      const b = tgEl('button', 'gsv-gift'); b.type = 'button';
      const ic = tgEl('span', 'gsv-gift-ic'); ic.innerHTML = gardenIconSvg(s.def.id, { kind: 'plant', stage: 4, px: 34 }); b.appendChild(ic);
      const t = tgEl('span', 'gsv-gift-t'); t.appendChild(tgEl('b', '', s.def.name)); t.appendChild(tgEl('span', 'muted', `${String((GARDEN_CATS[s.def.cat] || {}).one || s.def.cat)} · ${s.def.rarity}`)); b.appendChild(t);
      b.appendChild(tgEl('span', 'gsv-gift-n', '×' + s.n));
      b.onclick = () => { close(); _gsbPlant(sp, x, y, s.def.id); };
      list.appendChild(b);
    }
    el.appendChild(list);
  }, { align: 'center', width: 320 });
}
async function _gsbPlant(sp, x, y, plantId) {
  const def = gardenPlant(plantId);
  if (!def || !gsocBedPlantOk(def)) return;
  if (typeof gardenHas !== 'function' || gardenHas('seed:' + plantId) < 1) { toast(`No ${def.name} seeds left: the garden shop has more.`, { icon: 'sprout' }); return; }
  const me = tgMe(), id = tgNewId('b'), today = _gscToday();
  const variants = (def.look && Array.isArray(def.look.v) ? def.look.v.length : 0) || 1;
  // the seed (and the usual planting XP) come from your own garden: a ledger entry Undo takes back
  const g = typeof _gdG === 'function' ? _gdG() : state.garden;
  const lk = 'cb.' + today + '.' + id;
  g.led[lk] = { d: today, k: 'cb', i: { ['seed:' + plantId]: -1 }, x: 2, n: 1 };
  _gscSaveGarden();
  const ops = [{ op: 'set', path: ['bed', id], value: { by: me, at: Date.now(), plant: plantId, x, y, v: Math.min(7, gardenHash(id) % variants) } }];
  if (typeof tgFeedOps === 'function') ops.push(...tgFeedOps(sp.id, 'note', `planted ${_gscA(def.name.toLowerCase().replace(/^the /, ''))} in the shared bed`, null));
  const ok = await tgEdit(sp.id, ops, { undo: false });
  const giveBack = () => { const gg = typeof _gdG === 'function' ? _gdG() : state.garden; if (gg.led[lk]) { delete gg.led[lk]; _gscSaveGarden(); } };
  if (!ok) { giveBack(); return; }
  toast(`Planted ${_gscA(def.name.toLowerCase().replace(/^the /, ''))} in the shared bed`, { icon: 'sprout', timeout: 6000, action: { label: 'Undo', run: () => { giveBack(); tgEdit(sp.id, [{ op: 'del', path: ['bed', id] }, ...ops.slice(1).map(o => ({ op: 'del', path: o.path }))], { undo: false, toast: 'Undone: the seed is back in your bag', icon: 'undo-2' }); } } });
}
async function _gsbWater(sp, list) {
  const me = tgMe(), now = Date.now(), today = _gscToday();   // clock-ok: a register's time, like every space edit
  const ps = list.filter(p => p.def && p.def.thirst && _gsbCanWater(p, me, now));
  if (!ps.length) return;
  const ops = ps.map(p => ({ op: 'set', path: ['bed', p.el.id, 'water', me], value: now }));
  const ok = await tgEdit(sp.id, ops, { toast: ps.length === 1 ? `Watered the ${ps[0].def.name.toLowerCase().replace(/^the /, '')}` : `Watered ${ps.length} plants in the shared bed`, icon: 'droplets' });
  if (!ok) return;
  // a little garden XP for tending together: one a plant a day, five a day
  try {
    const g = typeof _gdG === 'function' ? _gdG() : state.garden;
    if (g && g.since) {
      let n = Object.values(g.led).filter(e => e && e.k === 'cw' && e.d === today).length, changed = false;
      for (const p of ps) { const k = 'cw.' + today + '.' + sp.id.slice(0, 24) + '.' + p.el.id.slice(0, 24); if (n >= 5 || g.led[k]) continue; g.led[k] = { d: today, k: 'cw', x: 1, n: 1 }; n++; changed = true; }
      if (changed) _gscSaveGarden();
    }
  } catch (e) { /* XP is a bonus */ }
}
function _gsbDig(sp, p) {
  if (p.el.by !== tgMe()) return;
  tgEdit(sp.id, [{ op: 'del', path: ['bed', p.el.id] }], { toast: `Dug up the ${p.def ? p.def.name.toLowerCase().replace(/^the /, '') : 'plant'}`, icon: 'shovel' });
}
/** A plant in the shared bed reaches full bloom: a calm word, once per plant on each computer (the Fun level decides). */
function _gsbCelebrate(sp, plants) {
  if (_gscFun() === 'off' || typeof tgSeen !== 'function') return;
  for (const p of plants) {
    if (!p.def || p.stage < 4) continue;
    const key = 'bedbloom|' + sp.id + '|' + p.el.id;
    if (_gsb.celebrated.has(key) || tgSeen(key)) continue;
    _gsb.celebrated.add(key);
    tgMarkSeen(key);
    setTimeout(() => toast(`The shared ${p.def.name.toLowerCase().replace(/^the /, '')} is in bloom. Well tended, all of you.`, { icon: 'flower', kind: 'ok' }), 300);
    break;
  }
}
