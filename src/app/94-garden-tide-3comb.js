/* ============================================================
   BEACHCOMBING (the tide, phase 2). At low water the sand the tide has just left shows a fresh scatter of glints: shells in a
   few colours, sea glass, driftwood, stones, and after a storm the storm's set. Walk up and press E (or click the prompt):
   you crouch, pick it up and hold it up. Each low water has its own scatter (94-garden-tide-0rules.js gardenTideScatter),
   the same on every screen; what you take is yours, so a friend picking the same glint never empties your strand.
   Missed low waters make the next one a little richer (up to three). The first of each find writes a card on the Keepsakes
   shelf ("From the shore") and gives a little XP; a full row (all the sea glass, all the driftwood...) gives coins and a
   decoration for the garden. Shore finds go into crafts at the bench (94-garden-craft-0rules.js) and to the museum.

   The tide card: on every shore, the nearest signpost, notice board, milestone, lamp or post to the open sand offers "Read the
   tide table" (by kind, so new shores get one with no code): today's low and high water, what the tide is doing, a big or
   small tide, a storm on its way.

   Saved (in maps that already sync entry by entry): g.led['td.<w>.<i>'] a glint taken at your own low water w;
   g.led['tdv.<friend>.<w>.<i>'] one taken on a friend's strand; g.led['tdrow.<row>'] a full row's reward; g.disc['td.<find>']
   the day of each first find; g.wd.tdw the last low water you combed; g.wd.tdk [w, rich] the richness fixed for that low water.
   ============================================================ */
const GT_REACH = 1.7;   // cells: how near a glint must be for its prompt
const GT_ROWS = Object.freeze([
  Object.freeze({ id: 'glass', name: 'sea glass', what: 'glass', coins: 40, decor: 'lantern', words: 'Every colour of sea glass' }),
  Object.freeze({ id: 'wood', name: 'driftwood', what: 'wood', coins: 30, decor: 'driftwood-seat', words: 'All four kinds of driftwood' }),
  Object.freeze({ id: 'stone', name: 'shore stones', what: 'stone', coins: 30, decor: 'play-sv-hills', words: 'All the shore stones' }),
  Object.freeze({ id: 'storm', name: 'the storm’s things', what: 'storm', coins: 60, decor: 'play-sv-harbour', words: 'Everything a storm brings in' }),
  Object.freeze({ id: 'shell', name: 'shells', what: 'shell', coins: 60, decor: 'play-sv-sea', words: 'Every shell on the shore' }),
]);
const _gtc = { taken: null, takenKey: '', imgs: [], atlas: false, atlasBusy: false, list: [], listT: 0, near: [], tok: 0, boards: null, boardsKey: '', hop: new Map() };

/* ---------- whose strand, and what is left on it ---------- */
function _gtcVisit() { try { return typeof gardenVisitOn === 'function' && gardenVisitOn(); } catch (e) { return false; } }
function _gtcSnap() { try { const m = gardenHere(); return m && m.visit ? m.visit.snap : null; } catch (e) { return null; } }
function _gtcFriendTag() { const f = typeof _gdv !== 'undefined' ? _gdv.fid : ''; return (gardenHash('tide-friend|' + f) % 2176782336).toString(36); }
/** How rich your own next low water is: low waters you missed since you last combed, fixed for the low water once you are there. */
function gardenTideRich() {
  try {
    const g = _gdG(), w = gardenTideNow({ own: true }).w, k = g.wd.tdk;
    if (Array.isArray(k) && k[0] === w) return Math.max(0, Math.min(GARDEN_TIDE.rich, k[1] | 0));
    const last = Number(g.wd.tdw); return Number.isFinite(last) && last > 0 ? Math.max(0, Math.min(GARDEN_TIDE.rich, w - last - 1)) : 0;
  } catch (e) { return 0; }
}
/** The strand's glints for the low water now: own garden or a friend's (their number, richness and storm from the snapshot). */
function gardenTideGlints() {
  const T = gardenTideNow(); if (!GardenTide.ready()) return [];
  const snap = _gtcSnap(), visit = !!snap;
  const rich = visit ? (snap.ti && snap.ti.r) || 0 : gardenTideRich();
  return gardenTideScatter(T.w, { rich, storm: typeof gardenTideStormBefore === 'function' ? gardenTideStormBefore(T.w) : -1 });
}
/** The glints you have taken at low water w (yours, or on this friend's strand), as a set of their numbers. */
function _gtcTakenSet(w) {
  const g = _gdG(), pre = _gtcVisit() ? 'tdv.' + _gtcFriendTag() + '.' + w + '.' : 'td.' + w + '.', key = pre + '|' + Object.keys(g.led).length + '|' + (typeof _gd !== 'undefined' ? _gd.rev : 0);
  if (_gtc.taken && _gtc.takenKey === key) return _gtc.taken;
  const set = new Set(); for (const k of Object.keys(g.led)) if (k.startsWith(pre)) set.add(Number(k.slice(pre.length)));
  _gtc.taken = set; _gtc.takenKey = key; return set;
}
function _gtcOpenZone(z) { try { const m = gardenHere(); return !z || (m.areas || []).includes('zn-' + z); } catch (e) { return !z; } }
/** What shows now: glints of this low water on open ground, not taken by you, with the water below them. */
function gardenTideGlintsShown() {
  const T = gardenTideNow(), list = gardenTideGlints(); if (!list.length) return [];
  const taken = _gtcTakenSet(T.w), out = []; let areas = []; try { areas = gardenHere().areas || []; } catch (e) { areas = []; }
  const pools = typeof gardenTideOnPool === 'function' && gardenTidePools().length > 0;   // (a find never lies on a rock pool's shelf: 94-garden-tide-2rocks.js)
  for (const g of list) if (!taken.has(g.i) && g.h > T.line + 2 && (!g.zone || areas.includes('zn-' + g.zone)) && !(pools && gardenTideOnPool(g.x, g.y, 8))) out.push(g);
  return out;
}

/* ---------- taking one ---------- */
function _gtcRowDone(row, g) { const ids = GARDEN_SHORE_FINDS.filter(f => f.what === row.what && !f.chest).map(f => f.id); return ids.every(id => g.disc['td.' + id]); }
/** A glint is yours: into the bag, the journal, a full row's reward; held up for you and everyone in the garden. keyAs: the ledger key
 *  when it is not a glint (a shell from a rock pool, a storm's find). */
function gardenTideTake(gl, w, keyAs) {
  if (!gl || !gl.find) return _gdNo('The tide has taken it back');
  const g = _gdG(), m = gardenModel(), visit = _gtcVisit(), key = keyAs || (visit ? 'tdv.' + _gtcFriendTag() + '.' : 'td.') + w + '.' + gl.i;
  if (g.led[key]) return _gdNo('You have that one already');
  const id = gl.find.id, first = !g.disc['td.' + id], rare = gl.find.rar === 'r';
  g.led[key] = { d: m.today, k: 'td', i: { ['sh:' + id]: 1 }, x: (first ? 2 : 0) + (rare ? 1 : 0), n: 1 };
  if (id === 'rope-tangle') g.led[key].i['mat:timber'] = 1;   // (good rope counts as timber)
  if (first) g.disc['td.' + id] = m.today;
  if (!visit) { if (!(Array.isArray(g.wd.tdk) && g.wd.tdk[0] === w)) g.wd.tdk = [w, gardenTideRich()]; g.wd.tdw = Math.max(Number(g.wd.tdw) || 0, w); }   // (the richness first, from the low water you last combed, so this low water's glints stay where they are)
  // a full row: coins and a decoration for the garden, once (journal-page style, through the ledger)
  let row = null;
  for (const R of GT_ROWS) if (R.what === gl.find.what && !g.led['tdrow.' + R.id] && _gtcRowDone(R, g)) { row = R; g.led['tdrow.' + R.id] = { d: m.today, k: 'td', c: R.coins, i: { ['decor:' + R.decor]: 1 }, x: 5, n: 1 }; }
  // the first driftwood teaches the driftwood seat; the first whelk, the shell chimes (94-garden-craft-0rules.js)
  if (first && (id === 'driftwood' || id === 'whelk') && typeof gardenRecipe === 'function') { const rid = id === 'driftwood' ? 'drift-seat' : 'shell-chimes'; if (gardenRecipe(rid) && !g.led['tdrc.' + rid]) g.led['tdrc.' + rid] = { d: m.today, k: 'rc', i: { ['recipe:' + rid]: 1 }, n: 1 }; }
  _gdSave();
  _gtc.taken = null;
  _gdEmit('tide', { find: id, first, row: row ? row.id : '' });
  try { gardenCatchMoment('shore', id, { isNew: first }); } catch (e) { /* the moment is only a picture */ }
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('tide', 'got', { i: id, n: gl.i % 1000, x: Math.max(0, Math.min(GARDEN_WORLD.cols - 1, Math.floor(gl.x))), y: Math.max(0, Math.min(GARDEN_WORLD.rows - 1, Math.floor(gl.y))) }); } catch (e) { /* alone */ }
  if (row) setTimeout(() => { try { gardenToast(`${row.words}! ${row.coins} coins, and a ${gardenDecor(row.decor) ? gardenDecor(row.decor).name.toLowerCase() : 'present'} for your garden.`, { icon: 'gift', timeout: 6000 }); } catch (e) { /* fine */ } }, 2900);
  else if (first) setTimeout(() => { try { gardenToast('New in your journal: ' + gl.find.name + '. It is on the Keepsakes shelf.', { icon: 'book-open' }); } catch (e) { /* fine */ } }, 2900);
  return { ok: true, id, first, row };
}

/* ---------- the glints, drawn: one atlas, a few pooled images near the camera ---------- */
const GT_ATLAS = 'gt-finds', GT_CELL = 48, GT_COLS = 8;
function _gtcAtlas(scene) {
  if (_gtc.atlas && scene.textures.exists(GT_ATLAS)) return true;
  if (_gtc.atlasBusy) return false; _gtc.atlasBusy = true;
  const finds = GARDEN_SHORE_FINDS, rows = Math.ceil((finds.length + 2) / GT_COLS), tex = scene.textures.exists(GT_ATLAS) ? scene.textures.get(GT_ATLAS) : scene.textures.createCanvas(GT_ATLAS, GT_COLS * GT_CELL, rows * GT_CELL);
  const cx = tex.context; let left = finds.length;
  const frame = (name, i) => { const x = (i % GT_COLS) * GT_CELL, y = Math.floor(i / GT_COLS) * GT_CELL; if (!tex.has(name)) tex.add(name, 0, x, y, GT_CELL, GT_CELL); return [x, y]; };
  // the twinkle: a soft four-point star
  { const [x, y] = frame('twinkle', finds.length); const g = cx.createRadialGradient(x + 24, y + 24, 0, x + 24, y + 24, 22); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(.25, 'rgba(255,255,240,0.45)'); g.addColorStop(1, 'rgba(255,255,240,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(x + 24, y + 2); cx.quadraticCurveTo(x + 26.5, y + 21.5, x + 46, y + 24); cx.quadraticCurveTo(x + 26.5, y + 26.5, x + 24, y + 46); cx.quadraticCurveTo(x + 21.5, y + 26.5, x + 2, y + 24); cx.quadraticCurveTo(x + 21.5, y + 21.5, x + 24, y + 2); cx.fill(); }
  // the wet ring a half-buried find sits in
  { const [x, y] = frame('wetring', finds.length + 1); const g = cx.createRadialGradient(x + 24, y + 26, 2, x + 24, y + 26, 20); g.addColorStop(0, 'rgba(120,100,62,0.42)'); g.addColorStop(.6, 'rgba(120,100,62,0.16)'); g.addColorStop(1, 'rgba(120,100,62,0)'); cx.fillStyle = g; cx.save(); cx.translate(x + 24, y + 26); cx.scale(1, .45); cx.beginPath(); cx.arc(0, 0, 20, 0, Math.PI * 2); cx.fill(); cx.restore(); }
  finds.forEach((f, i) => {
    const [x, y] = frame('f-' + f.id, i), img = new Image();
    img.onload = () => { try { cx.drawImage(img, x + 2, y + 2, GT_CELL - 4, GT_CELL - 4); } catch (e) { /* skip */ } if (--left <= 0) { tex.refresh(); _gtc.atlas = true; _gtc.atlasBusy = false; } };
    img.onerror = () => { if (--left <= 0) { tex.refresh(); _gtc.atlas = true; _gtc.atlasBusy = false; } };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 32 32" width="44" height="44">${gardenTideFindArt(f)}</svg>`);
  });
  return false;
}
const GT_GLINT_MAX = 40;
function _gtcSize(f) { return f.what === 'storm' ? (f.chest ? 30 : 22) : f.what === 'wood' ? 20 : f.what === 'glass' ? 11 : f.what === 'stone' ? 12 : 13; }
const GardenTideGlints = {
  id: 'glints',
  paint(scene, root) { this.scene = scene; this.root = root; _gtc.imgs = []; this.t = 0; _gtcAtlas(scene); },
  clear() { for (const o of _gtc.imgs) { try { o.find.destroy(); o.tw.destroy(); o.ring.destroy(); } catch (e) { /* gone */ } } _gtc.imgs = []; this.scene = null; },
  tick(time, view, T, vis) {
    const scene = this.scene; if (!scene || !_gtcAtlas(scene)) return;
    const W = GARDEN_WORLD;
    // which glints are near the view: looked again every half second
    if (time - _gtc.listT > 500) {
      _gtc.listT = time;
      const shown = vis ? gardenTideGlintsShown() : [], m = 120, near = [];
      for (const g of shown) { const x = g.x * W.cellW, y = W.sky + g.y * W.cellH; if (x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m) near.push(g); if (near.length >= GT_GLINT_MAX) break; }
      _gtc.list = near;
      while (_gtc.imgs.length < near.length) { const ring = scene.add.image(0, 0, GT_ATLAS, 'wetring').setDepth(-9345.25), find = scene.add.image(0, 0, GT_ATLAS, 'twinkle').setDepth(-9345.2), tw = scene.add.image(0, 0, GT_ATLAS, 'twinkle').setDepth(-9345.15).setBlendMode(1); this.root.add(ring); this.root.add(find); this.root.add(tw); _gtc.imgs.push({ ring, find, tw, id: '' }); if (this.root.sort) this.root.sort('depth'); }
      _gtc.imgs.forEach((o, k) => {
        const g = near[k], on = !!g; o.ring.setVisible(on); o.find.setVisible(on); o.tw.setVisible(on); o.g = g || null; if (!on) return;
        const x = g.x * W.cellW, y = W.sky + g.y * W.cellH, s = _gtcSize(g.find) / (GT_CELL - 4);
        if (o.id !== g.find.id) { o.find.setFrame('f-' + g.find.id); o.id = g.find.id; }
        o.find.setPosition(x, y - _gtcSize(g.find) * .18).setScale(s).setRotation((g.ph - .5) * 1.4);
        o.ring.setPosition(x, y).setScale(_gtcSize(g.find) / 30);
        o.tw.setPosition(x + (g.ph - .5) * 4, y - _gtcSize(g.find) * .45);
      });
    }
    // twinkle: each now and then, on its own beat (only the ones near the view)
    const t = time / 1000, motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), night = GardenPaintTide.tod() === 'night';
    for (const o of _gtc.imgs) {
      const g = o.g; if (!g) continue;
      const u = ((t * .45 + g.ph * 7) % 2.6) / 2.6, a = motion ? Math.max(0, Math.sin(Math.min(1, u * 5) * Math.PI)) : .5, hop = _gtc.hop.get(g.i);
      o.tw.setAlpha(a * (night ? .55 : .9)).setScale((.18 + a * .22) * (g.find.rar === 'r' ? 1.4 : 1));
      if (hop) { const k = (time - hop) / 600; if (k > 1) _gtc.hop.delete(g.i); else o.find.y = W.sky + g.y * W.cellH - _gtcSize(g.find) * .18 - Math.sin(k * Math.PI) * 7; }
      // the wet shine fades as the sand dries: brighter just after the water has left
      o.ring.setAlpha(Math.max(.35, Math.min(1, 1 - (g.h - T.line) / 60)));
    }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideGlints);

/* ---------- the tide card, on the nearest board, sign, milestone, lamp or post to each open stretch of shore ---------- */
const GT_CARD_KINDS = new Set(['notice-board', 'signpost', 'milestone', 'lamp', 'post']);
function gardenTideBoards() {
  let list = []; try { list = gardenAffordThings(); } catch (e) { return []; }
  const S = gardenTideShore(), key = S.lay + '|' + list.length;
  if (_gtc.boards && _gtc.boardsKey === key) return _gtc.boards;
  const W = GARDEN_WORLD, out = [], cards = list.filter(t => GT_CARD_KINDS.has(t.kind) && t.src !== 'decor');   // (the vale's own signs and lamps, not a lantern you put down)
  // one card for each region's part of each stretch of shore: the nearest board, sign, milestone, lamp or post within five cells
  for (const st of S.stretches) {
    const byZone = new Map(); for (const i of st.cells) { const c = gardenIslandBaseCell(i % W.cols, (i - i % W.cols) / W.cols), z = c ? c.regionZone || 0 : 0; let l = byZone.get(z); if (!l) byZone.set(z, l = []); l.push(i); }
    for (const [z, cells] of byZone) {
      if (cells.length < 6) continue;
      let best = null, bd = 5.2;
      for (const t of cards) for (let k = 0; k < cells.length; k += 2) { const i = cells[k], x = i % W.cols + .5, y = (i - i % W.cols) / W.cols + .5, d = Math.hypot(t.x - x, (t.y - y) * 1.3); if (d < bd) { bd = d; best = t; } }
      if (best && !out.some(q => q.t === best)) out.push({ t: best, stretch: st.id, zone: z, x: best.x, y: best.y });
    }
  }
  _gtc.boards = out; _gtc.boardsKey = key; return out;
}
/** The tide table, in a bubble over the card. */
function gardenTideTableOpen(at) {
  const tab = gardenTideTable(), T = tab.tide, low = tab.list.filter(r => r.t === 'low').map(r => r.at).join(' and '), high = tab.list.filter(r => r.t === 'high').map(r => r.at).join(' and ');
  const moon = T.kind === 'big' ? T.moon.words + ': the water goes further out and comes further in, and rarer things wash up.' : T.kind === 'small' ? T.moon.words + ': the water does not go far either way.' : '';
  let storm = ''; try { const day = Math.floor(T.lm / 1440), s = _gtcVisit() ? -1 : (typeof gardenTideLastStorm === 'function' ? gardenTideLastStorm() : -1); if (s === day - 1 || s === day) storm = 'After last night’s storm, look along the strand at low water.'; else if (!_gtcVisit() && gardenTideStormy(day, gardenTideSeed())) storm = 'A storm is coming tonight. Tomorrow’s low water will be full of things.'; } catch (e) { /* no storm word */ }
  const el = gardenBubbleOpen(at, { title: 'The tide today', sub: tab.doing, hint: `Low water ${low}. High water ${high}.`, foot: [moon, storm].filter(Boolean).join(' ') || 'Low water is the time to look along the sand and in the rock pools.', items: [], cls: 'gt-table' });
  if (el) { const svg = gardenTideCurveSvg(tab); const d = document.createElement('div'); d.className = 'gt-curve'; d.style.cssText = 'margin:4px 0 2px;'; d.innerHTML = svg; const foot = el.querySelector('.gd-bub-foot'); el.insertBefore(d, foot || null); }
  try { const g = _gdG(); if (!g.disc['td.table']) { g.disc['td.table'] = _gdToday(); _gdSave(); gardenToast('New in your journal: Read the tide table. Low water twice a day.', { icon: 'book-open' }); } } catch (e) { /* fine */ }
  return el;
}
/** A small drawn day of tide: the water's height through the day, now marked, low and high labelled. */
function gardenTideCurveSvg(tab) {
  const T = tab.tide, W = 220, H = 54, day0 = Math.floor(T.lm / 1440) * 1440, pts = [];
  for (let k = 0; k <= 48; k++) { const m = k * 30, lv = gardenTideLevel(day0 + m); pts.push((m / 1440 * W).toFixed(1) + ',' + (H - 10 - lv * (H - 20)).toFixed(1)); }
  const nowX = ((T.lm - day0) / 1440 * W).toFixed(1), nowY = (H - 10 - T.level * (H - 20)).toFixed(1);
  const labels = tab.list.map(r => `<text x="${(r.min / 1440 * W).toFixed(1)}" y="${r.t === 'low' ? H - 1 : 8}" font-size="7.5" text-anchor="middle" fill="#5a6a70">${r.at}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="The water's height through today"><path d="M0,${H - 10} L${pts.join(' L')} L${W},${H - 10} Z" fill="#9ccfc4" opacity="0.55"/><polyline points="${pts.join(' ')}" fill="none" stroke="#4a8a94" stroke-width="1.4"/><line x1="${nowX}" y1="6" x2="${nowX}" y2="${H - 8}" stroke="#c86a3a" stroke-width="1" stroke-dasharray="2 2"/><circle cx="${nowX}" cy="${nowY}" r="3" fill="#c86a3a"/>${labels}</svg>`;
}

/* ---------- what is in reach: the act system asks (94-garden-zz-7act-1core.js gartActNearby) ---------- */
/* Other tide modules add what they offer here, with no edit to this file: GT_ROW_SOURCES.push((px, py, T) => [rows]) and
 * GT_RUN[kind] = (spot) => true when started (each row's tide: { kind, ... } says which). The pools and the storm do so below. */
const GT_ROW_SOURCES = [];
const GT_RUN = {};
/** Rows for the prompt: glints within reach, the tide card on a board, and what the pools and the storm add. */
function gardenTideActRows(px, py) {
  const out = []; if (typeof GardenTide === 'undefined' || !GardenTide.ready()) return out;
  const T = gardenTideNow();
  try {
    for (const g of gardenTideGlintsShown()) { const d = Math.hypot(g.x - px, (g.y - py) * 1.3); if (d > GT_REACH) continue; out.push({ key: 'tide:g:' + T.w + '.' + g.i, act: 'scoop', tide: { kind: 'glint', w: T.w, i: g.i }, words: 'Pick up the ' + g.find.name.replace(/^(.)/, c => c.toLowerCase()), name: g.find.name, x: g.x, y: g.y, stand: { x: g.x, y: g.y + 0.12 }, pri: 0.55 }); }
    for (const b of gardenTideBoards()) { const d = Math.hypot(b.x - px, (b.y - py) * 1.3); if (d > 2) continue; out.push({ key: 'tide:board:' + b.t.id, act: 'read', tide: { kind: 'board' }, words: 'Read the tide table', name: 'the tide table', x: b.x, y: b.y, stand: gardenTideStandFree([{ x: b.x - .35, y: b.y + .55 }, { x: b.x + .4, y: b.y + .55 }], px, py), pri: 0.2, src: 'tide-board:' + b.t.id }); }
    for (const f of GT_ROW_SOURCES) { try { out.push(...f(px, py, T)); } catch (e) { /* that one has nothing now */ } }
  } catch (e) { /* nothing here now */ }
  return out;
}
/** A tide row was chosen (E, a click on the prompt): walk there, do it, and give what it gives. */
function gardenTideRun(spot) {
  const t = spot && spot.tide; if (!t) return false;
  if (t.kind === 'board') return _gtcDo('read', spot, () => gardenTideTableOpen({ x: spot.x, y: spot.y - 1.2 }), .5) || !!gardenTideTableOpen({ x: spot.x, y: spot.y - 1.2 });   // (walk up and read it, as at any notice board)
  if (t.kind === 'glint') {
    const g = gardenTideGlints().find(q => q.i === t.i); if (!g) return false;
    return _gtcDo('scoop', spot, () => { const r = gardenTideTake(g, t.w); if (r && !r.ok) try { gardenToast(r.msg || 'Gone with the tide.'); } catch (e) { /* fine */ } }, 0.62);
  }
  const run = GT_RUN[t.kind]; return typeof run === 'function' ? !!run(spot) : false;
}
/** Do a move from the act table at a spot (walking there first), then call then() at that share (at) of the move if you are still
 *  doing it: walking off, or doing something else, gives nothing. */
function _gtcDo(act, spot, then, at) {
  const tok = ++_gtc.tok, pseudo = { key: spot.key, act, name: spot.name, x: spot.x, y: spot.y, stand: spot.stand || null, noProp: true, tideTok: tok };
  if (typeof gartActRun !== 'function' || !gartActRun(act, pseudo)) return false;
  const row = typeof GARDEN_ACTS !== 'undefined' ? GARDEN_ACTS[act] : null, ms = ((typeof _gaMotion === 'function' && !_gaMotion()) ? 600 : (row && row.ms) || 900) * (at == null ? .6 : at), t0 = performance.now();
  const poll = () => {
    const cur = typeof _ga !== 'undefined' ? _ga.cur : null;
    if (!(cur && cur.spot && cur.spot.tideTok === tok) || performance.now() - t0 > 20000) return;
    if (cur.doing && performance.now() - cur.t0 >= ms) { try { then(); } catch (e) { console.error('[garden tide]', e); } return; }
    setTimeout(poll, 90);
  };
  setTimeout(poll, 60);
  return true;
}

/** Of a few places to stand round a thing (several people can kneel at one pool or haul one chest together), the nearest to (px, py)
 *  that no friend in the garden is standing on. */
function gardenTideStandFree(spots, px, py) {
  const who = []; try { if (typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) { if (!A || A.me || A.rm || A.away) continue; const at = A.actAt || A; if (Number.isFinite(at.x)) who.push(at); } } catch (e) { /* alone */ }
  let best = null, bd = Infinity;
  for (const q of spots) { if (who.some(a => Math.hypot(a.x - q.x, (a.y - q.y) * 1.3) < .45)) continue; const d = Math.hypot(q.x - px, (q.y - py) * 1.3); if (d < bd) { bd = d; best = q; } }
  return best || spots[0];
}

/* ---------- the journal: "From the shore" on the Keepsakes page ---------- */
function gardenTideShelf(left) {
  try {
    const g = _gdG(), h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = '<h3>From the shore</h3><i class="gj-hand">what the tide leaves</i>';
    const shelf = left.appendChild(_gjEl('div', 'gj-grid gj-shelf'));
    const clue = (f) => f.storm ? 'Only after a stormy night.' : f.big ? 'Further down the sand at a big tide.' : f.shores === 'r' ? 'On rocky shores at low water.' : f.shores === 'e' ? 'In the mud where a river meets the sea.' : 'Along the sand at low water.';
    for (const f of GARDEN_SHORE_FINDS) {
      if (f.chest) continue;
      const day = g.disc['td.' + f.id], c = shelf.appendChild(_gjEl('div', 'gj-card' + (day ? ' is-caught' : ' is-unheard')));
      c.innerHTML = `<span class="gj-cart${day ? '' : ' gj-sil'}">${gardenTideFindSvg(f.id, 48)}</span>${day ? `<b>${esc(f.name)}</b><small>${esc(typeof _gjDay === 'function' ? _gjDay(day) : day)}</small>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">“${esc(clue(f))}”</small>`}`;
      if (day) c.title = f.line;
    }
    if (typeof _glbFit === 'function') _glbFit(shelf);
  } catch (e) { /* the shelf is only a page */ }
  try { if (typeof gardenTideBottleShelf === 'function') gardenTideBottleShelf(left); if (typeof gardenShoreGamesShelf === 'function') gardenShoreGamesShelf(left); } catch (e) { /* only pages */ }   // the bottle shelf, and the shore's games (94-garden-tide-9bottle.js, -d-spot.js)
}

/* ---------- the module's second: the window turns, the richness is fixed, a word when the tide turns ---------- */
setTimeout(() => {
  if (typeof wdMod !== 'function') return;
  wdMod({ id: 'tide', visit: true, fun: false,
    begin() { this.lastLow = null; this.lastTurn = null; this.said = 0; },
    tick(m) {
      if (!window.GardenTide || !GardenTide.ready() || typeof _gw === 'undefined' || !_gw.on) return;
      const T = gardenTideNow(), low = T.level < .25 && !T.rising;
      // a quiet line when the water goes out (once per low water, only when you are near the shore)
      if (low && this.lastLow !== T.w && !m.visit) {
        this.lastLow = T.w;
        const k = gardenTideKindAt(_gw.px, _gw.py) || gardenTideKindAt(_gw.px, _gw.py + 2) || gardenTideKindAt(_gw.px, _gw.py - 2);
        if (k && Date.now() - this.said > 60000) { this.said = Date.now(); try { gardenMessage('The tide is going out. Things glint on the wet sand.', { icon: 'waves', ms: 5000 }); } catch (e) { /* fine */ } }   // clock-ok: spacing
      }
      // and when it turns after low water (once per low water, near the shore)
      if (T.rising && T.level > .04 && T.level < .2 && this.lastTurn !== T.w && !m.visit) {
        this.lastTurn = T.w;
        const k = gardenTideKindAt(_gw.px, _gw.py) || gardenTideKindAt(_gw.px, _gw.py + 2) || gardenTideKindAt(_gw.px, _gw.py - 2);
        if (k && Date.now() - this.said > 60000) { this.said = Date.now(); try { gardenMessage('The tide has turned. It comes in slowly.', { icon: 'waves', ms: 5000 }); } catch (e) { /* fine */ } }   // clock-ok: spacing
      }
    },
  });
}, 0);
