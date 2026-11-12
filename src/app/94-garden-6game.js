/* ============================================================
   GARDEN, the game layer (2.18.1): everything that makes the full-screen garden clear and alive.
     - "What to do next": one suggested step (gardenNextStep): an arrow in the world (94-garden-world-2hud.js), a line in the Goals panel
     - the income panel ("Today: 42 coins from 1h40 focused (cap 120)") and its small log
     - the Garden guide (Help)
     - feedback: floating "+2 XP", splashes, dark soil, harvest arcs into the basket, growth pops,
       visitor notes, the level-up card
     - the hover card with a growth ring
   Draws into the page built by 94-garden-4page.js (_gdp). Reduced motion and the Fun level are respected
   (gardenMotionOn): without motion nothing flies, the toasts still say what happened.
   ============================================================ */
const _gdg = { bound: false, stages: null, visitors: null, wlSeen: null, waterScope: '', waterStamps: null, waterMarks: new Map(), waterReplies: new Set(), waterCells: new Map(), noteT: 0, nextKey: '' };

/* ---------- geometry: a cell rectangle in the stage box's pixels ---------- */
function _gdgBox() { if (_grm.on && _grm.root) return _grm.root; return _gdp.root ? _gdp.root.querySelector('.gd-stagebox') : null; }
function _gdgRectPx(x, y, w, h) {
  const svg = _gdp.svg, box = _gdgBox();
  if (!svg || !box || !svg.getScreenCTM) return null;
  const ctm = svg.getScreenCTM(); if (!ctm) return null;
  const W = GARDEN_WORLD, pt = (ux, uy) => { const p = svg.createSVGPoint(); p.x = ux; p.y = uy; return p.matrixTransform(ctm); };
  const a = pt(x * W.cellW, W.sky + y * W.cellH), b = pt((x + w) * W.cellW, W.sky + (y + h) * W.cellH), r = box.getBoundingClientRect();
  return { l: a.x - r.left, t: a.y - r.top, w: b.x - a.x, h: b.y - a.y };
}
function _gdgOv() {
  const box = _gdgBox(); if (!box) return null;
  let ov = box.querySelector('.gd-ov');
  if (!ov) { ov = document.createElement('div'); ov.className = 'gd-ov'; ov.setAttribute('aria-hidden', 'true'); box.appendChild(ov); }
  return ov;
}
function _gdgNode(cls, html, r) {
  const ov = _gdgOv(); if (!ov || !r) return null;
  const n = document.createElement('div'); n.className = cls; if (html != null) n.innerHTML = html;
  n.style.left = r.l + 'px'; n.style.top = r.t + 'px'; n.style.width = r.w + 'px'; n.style.height = r.h + 'px';
  ov.appendChild(n);
  return n;
}
function _gdgGone(n, ms) { setTimeout(() => { if (n && n.parentNode) n.remove(); }, ms); }

/* ---------- feedback ---------- */
function gardenFloat(text, x, y, w, h, cls) {
  if (!gardenMotionOn()) return;
  if (_grm.on) { gardenRoomFloat(text); return; }
  if (window.GardenNative && GardenNative.active()) { GardenNative.float(text, (x + (w || 1) / 2) * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + y * GARDEN_WORLD.cellH); return; }
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-float ' + (cls || ''), null, { l: r.l, t: r.t, w: r.w, h: r.h });
  if (!n) return;
  n.textContent = text;
  _gdgGone(n, 1700);
}
function gardenPop(x, y, w, h, cls) {
  if (!gardenMotionOn() || _grm.on) return;
  if (window.GardenNative && GardenNative.active()) {
    const kind = /is-gold/.test(cls || '') ? 'gold' : /is-plant/.test(cls || '') ? 'plant' : /is-grow/.test(cls || '') ? 'grow' : /is-feed/.test(cls || '') ? 'feed' : /is-trim/.test(cls || '') ? 'trim' : 'harvest';
    if (window.GardenNativeActions) GardenNativeActions.effect(kind, (x + (w || 1) / 2) * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + (y + (h || 1)) * GARDEN_WORLD.cellH - 3, { width: (w || 1) * GARDEN_WORLD.cellW * .7, height: (h || 1) * GARDEN_WORLD.cellH * .35 });
    return;
  }
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-pop ' + (cls || ''), '<i></i><i></i><i></i><i></i>', r);
  _gdgGone(n, 1100);
}
function _gdgSoil(x, y, w, h) {
  if (window.GardenNative && GardenNative.active()) { if (window.GardenNativeActions) GardenNativeActions.effect('soil', (x + (w || 1) / 2) * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + (y + (h || 1)) * GARDEN_WORLD.cellH - 3, { width: (w || 1) * GARDEN_WORLD.cellW * .78, height: (h || 1) * GARDEN_WORLD.cellH * .4 }); return; }
  if (!gardenMotionOn()) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-soil', null, { l: r.l + r.w * 0.08, t: r.t + r.h * 0.45, w: r.w * 0.84, h: r.h * 0.55 });
  _gdgGone(n, 30000);
}
/** A harvested item flies from the plant to the basket in the toolbar. */
function _gdgFly(plantId, x, y, w, h, delay) {
  if (!gardenMotionOn()) return;
  const box = _gdgBox(), ov = _gdgOv(); if (!box || !ov) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const br = box.getBoundingClientRect();
  // The basket lives inside the collapsed menu. Fly to a visible control,
  // normally the bag on the hotbar, rather than its hidden zero-sized box.
  const candidates = ['.gd-mbtn[data-menu="basket"]', '.gd-slot[data-slot="bag"]', '.gd-mbtn[data-menu="more"]'];
  let tgt = null, tr = null;
  for (const selector of candidates) { const node = _gdp.root.querySelector(selector); if (!node) continue; const rect = node.getBoundingClientRect(); if (rect.width > 4 && rect.height > 4 && rect.right > br.left && rect.left < br.right && rect.bottom > br.top && rect.top < br.bottom) { tgt = node; tr = rect; break; } }
  const n = document.createElement('div'); n.className = 'gd-fly';
  try { n.innerHTML = gardenIconSvg(plantId, { kind: 'crop', px: 30 }); } catch (e) { n.textContent = ''; }
  const sx = r.l + r.w / 2 - 15, sy = r.t + r.h / 2 - 15;
  n.style.left = sx + 'px'; n.style.top = sy + 'px';
  ov.appendChild(n);
  const dx = tr ? tr.left + tr.width / 2 - br.left - 15 - sx : 0, dy = tr ? tr.top + tr.height / 2 - br.top - 15 - sy : -32;
  try {
    const a = n.animate([
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: `translate(${dx * 0.15}px,${Math.min(dy * 0.15, 0) - 46}px) scale(1.15)`, opacity: 1, offset: 0.28 },
      { transform: `translate(${dx}px,${dy}px) scale(.55)`, opacity: 0.9 },
    ], { duration: 780, delay: delay || 0, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
    a.onfinish = () => { n.remove(); if (tgt) { tgt.classList.remove('is-bump'); void tgt.offsetWidth; tgt.classList.add('is-bump'); } };
  } catch (e) { n.remove(); }
}
function _gdgPlantsNow() { try { return gardenHere().plants; } catch (e) { return []; } }
/** Bulk rewards still include every plant. Only nearby visible transients need
 * to fly and sparkle; keep their delayed DOM animations small as well. */
function _gdgVisualCells(cells) {
  if (window.GardenNative && GardenNative.active() && GardenNative.inRoom()) return [];
  const selected = [], W = GARDEN_WORLD, walking = typeof _gw !== 'undefined' && _gw.on && _gw.cam && _gw.cam.w;
  for (const cell of cells) {
    const fp = cell[2] || 1;
    if (walking && !_gwInView(cell[0] + fp / 2, cell[1] + fp / 2, fp)) continue;
    const dx = walking ? (cell[0] + fp / 2 - _gw.px) * W.cellW : 0, dy = walking ? (cell[1] + fp / 2 - _gw.py) * W.cellH : 0, distance = dx * dx + dy * dy;
    let i = 0; while (i < selected.length && selected[i].distance <= distance) i++;
    if (i >= 16) continue;
    selected.splice(i, 0, { cell, distance }); if (selected.length > 16) selected.pop();
  }
  return selected.map(row => row.cell);
}
function _gdgVisualPlants(plants) { return _gdgVisualCells(plants.map(p => [p.x, p.y, p.fp, p])).map(cell => cell[3]); }
/** Plants whose watering is new since the last look (a sweep, "Water all" or one click). */
function _gdgWatered(m) {
  const g = _gdG(), now = new Set(Object.keys(g.wl[m.today] || {}));
  const prev = _gdg.wlSeen;
  _gdg.wlSeen = now;
  if (!prev) return [];
  return m.plants.filter(p => now.has(p.uid) && !prev.has(p.uid));
}
function _gdgWaterScope(m) { return m && m.visit ? 'visit:' + m.visit.fid : 'home'; }
function _gdgWaterReset(m) {
  _gdg.waterScope = m ? _gdgWaterScope(m) : ''; _gdg.waterStamps = null;
  _gdg.waterMarks.clear(); _gdg.waterReplies.clear(); _gdg.waterCells.clear();
}
/** An existing successful host reply is the guest's water marker. The compact
 * visit rows carry flags, not the owner's saved watering timestamp. */
function _gdgWaterVisualMark(fid, x, y, operation) {
  if (!_gdp.root || !_gdp.root.isConnected || _gdpTab(state.view) !== 'garden' || typeof _gdv === 'undefined' || !_gdv.on || _gdv.fid !== fid || _gdg.waterScope !== 'visit:' + fid || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const cell = x + ',' + y, key = operation ? String(operation) + '|' + cell : '', now = performance.now();
  if (key && _gdg.waterReplies.has(key) || !key && now - (_gdg.waterCells.get(cell) || -Infinity) < 1500) return;
  if (key) { _gdg.waterReplies.add(key); if (_gdg.waterReplies.size > 192) _gdg.waterReplies.delete(_gdg.waterReplies.values().next().value); }
  _gdg.waterCells.set(cell, now); if (_gdg.waterCells.size > 96) _gdg.waterCells.delete(_gdg.waterCells.keys().next().value);
  _gdg.waterMarks.set(cell, { x, y });
  if (typeof gardenRepaintSoon === 'function') gardenRepaintSoon();
}
/** Visual-only saved-water changes. Never use lastWater: it includes rain,
 * sprinklers and rills, which are not somebody tipping a watering can. */
function _gdgWaterChanges(m) {
  const scope = _gdgWaterScope(m); if (scope !== _gdg.waterScope) _gdgWaterReset(m);
  const previous = _gdg.waterStamps, now = new Map(), changed = [], seen = new Set(), saved = m.visit ? null : _gdG().plants;
  for (const p of m.plants) {
    const raw = saved && saved[p.uid]; if (!raw) continue;
    const stamp = Math.max(0, Number(raw.w) || 0), identity = String(raw.p) + '|' + String(raw.t), old = previous && previous.get(p.uid);
    now.set(p.uid, { stamp, identity });
    // New/replaced plants start watered. Mounts, re-entry, and undo seed a quiet
    // baseline; only an increase on the same existing plant shows this action.
    if (old && old.identity === identity && stamp > old.stamp) { changed.push(p); seen.add(p.uid); }
  }
  if (previous) for (const point of _gdg.waterMarks.values()) { const p = m.plants.find(p => p.x === point.x && p.y === point.y); if (p && !seen.has(p.uid)) { changed.push(p); seen.add(p.uid); } }
  _gdg.waterStamps = now; _gdg.waterMarks.clear(); return changed;
}
function _gdgOnEvent(ev) {
  const d = ev && ev.detail; if (!d || !_gdp.root || !_gdp.root.isConnected) return;
  const tab = _gdpTab(state.view); if (tab !== 'garden') return;
  try {
    if (d.kind === 'plant') {
      const def = gardenPlant(d.id), fp = def && def.fp || 1;
      gardenFloat('+2 XP', d.x, d.y, fp, fp, 'is-xp'); gardenPop(d.x, d.y, fp, fp, 'is-plant');
    } else if (d.kind === 'feed') { gardenFloat('+half a day', d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); }
    else if (d.kind === 'prune') { gardenFloat('Tidy', d.x, d.y, d.fp || 1, d.fp || 1); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, 'is-trim'); }
    else if (d.kind === 'move' && d.type === 'plant') _gdpPlacementFeedback('place', { x: d.tx, y: d.ty, fp: d.fp || 1, def: gardenPlant(d.id) }, 'plant');
    else if (d.kind === 'dig' || d.kind === 'take') { const plant = d.kind === 'dig', def = plant ? gardenPlant(d.id) : gardenDecor(d.id); if (def) _gdpPlacementFeedback('lift', { x: d.x, y: d.y, fp: d.fp || 1, def }, plant ? 'plant' : 'decor'); }
    else if (d.kind === 'harvest') {
      if (d.cells) _gdgVisualCells(d.cells).forEach((c, i) => { _gdgFly(c[3], c[0], c[1], c[2], c[2], i * 90); gardenPop(c[0], c[1], c[2], c[2], c[4] ? 'is-gold' : 'is-harvest'); });
      else if (d.x != null) { for (let i = 0; i < Math.min(3, d.n || 1); i++) _gdgFly(d.id, d.x, d.y, d.fp || 1, d.fp || 1, i * 110); gardenFloat((d.gold ? 'Golden! +' : '+') + d.n, d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-xp'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-harvest'); }
    } else if (d.kind === 'level') gardenLevelUpCard(d);
    else if (d.kind === 'area') gardenLevelUpCard(d);
    else if (d.kind === 'land') { gardenPop(d.x + d.w / 2 - 1, d.y + d.h / 2 - 1, 2, 2, 'is-gold'); if (typeof _gw !== 'undefined') _gw.reach = null; }
  } catch (e) { console.error('[garden fx]', e); }
}
/** After every paint of the stage: new waterings, stages that grew, new visitors. */
function gardenGamePainted(m) {
  const waterChanges = _gdgWaterChanges(m), personalWaterings = _gdgWatered(m);
  gardenHoverCardHide();   // a saved action can change the plant without a pointer move
  if (!gardenMotionOn() && gardenFun() === 'off') { _gdg.stages = null; return; }
  for (const p of _gdgVisualPlants(waterChanges)) { _gdpSplash(p); _gdgSoil(p.x, p.y, p.fp, p.fp); }
  for (const p of _gdgVisualPlants(personalWaterings)) gardenFloat('+1', p.x, p.y, p.fp, p.fp, 'is-water');
  const prev = _gdg.stages, now = new Map();
  for (const p of m.plants) now.set(p.uid, p.stage);
  _gdg.stages = now;
  if (prev) { const grown = m.plants.filter(p => prev.has(p.uid) && p.stage > prev.get(p.uid) && p.def.special !== 'heart'); for (const p of _gdgVisualPlants(grown)) gardenPop(p.x, p.y, p.fp, p.fp, 'is-grow'); }
  // visitors drifting in
  const ids = new Set(m.visitors.map(v => v.id)), pv = _gdg.visitors; _gdg.visitors = ids;
  // (one you have never met gets its "New visitor" moment instead of this as well)
  if (pv && gardenFun() !== 'off') for (const v of m.visitors) if (!pv.has(v.id) && _gdG().disc[v.id] && !(typeof gardenLifeOwns === 'function' && gardenLifeOwns(v.id))) { const nm = v.def.name; gardenMessage(/[’']s /.test(nm) ? `${nm} visited!` : `${/^[aeiou]/i.test(nm) ? 'An' : 'A'} ${nm.toLowerCase()} visited!`, { ambient: true, source: 'visitor:' + v.id, icon: 'paw-print' }); }
}
function _gdgNote(text) { gardenMessage(text); }
function gardenLevelUpCard(d) {
  if (gardenFun() === 'off' || !_gdp.root) return;
  let c = _gdp.root.querySelector('.gd-levelup');
  if (d.kind === 'level') {
    if (c) c.remove();
    c = document.createElement('div'); c.className = 'gd-levelup'; c.setAttribute('role', 'status');
    c.innerHTML = `<div class="gd-lu-ic">${icon('sparkles')}</div><b></b><p></p><ul></ul><button type="button" class="btn btn-primary btn-sm">Lovely</button>`;
    c.querySelector('b').textContent = 'Something new';   // (no level numbers: your title comes from the Field Journal's pages)
    if (typeof gardenSfx === 'function') gardenSfx('level');
    c.querySelector('p').textContent = 'More of the vale has opened up. Have a look around.';
    c.querySelector('button').onclick = () => c.remove();
    { const top = gardenMessageHost() || _gdp.root; top.insertBefore(c, top.querySelector(':scope > .gd-msg')); }   // (over the message line, never on top of it)
    // It closes itself after 9 s, but not under the pointer, and the next moment's world click is swallowed: a click
    // aimed at Lovely as it went used to land in the garden (with a seed in hand, it planted under you).
    const shut = () => { if (!c.parentNode) return; if (c.matches(':hover')) { setTimeout(shut, 1500); return; } c.remove(); _gdp.swallowUntil = performance.now() + 700; };   // clock-ok: a short input guard
    setTimeout(shut, 9000);
  } else if (c && d.kind === 'area') {
    const li = document.createElement('li'); li.textContent = d.text; c.querySelector('ul').appendChild(li);
  }
}

/* ---------- hover card with a growth ring ---------- */
function gardenHoverCard(ev, m, uid) {
  const box = _gdgBox(); if (!box) return;
  let c = box.querySelector('.gd-hovercard');
  const p = uid ? gardenPlantById(m, uid) : null;
  if (!p || p.def.special === 'heart') { if (c) c.hidden = true; return; }
  if (!c) { c = document.createElement('div'); c.className = 'gd-hovercard'; c.setAttribute('aria-hidden', 'true'); box.appendChild(c); }
  const def = p.def, st = p.stage;
  const a = gardenHoursFor(def, st), b = st >= 4 ? a : gardenHoursFor(def, st + 1);
  const pct = st >= 4 ? 100 : m.visit ? st * 25 : Math.max(0, Math.min(100, Math.round(100 * (p.hours - a) / Math.max(1, b - a))));
  const key = [uid, st, pct, p.thirsty ? 1 : 0, p.ripe ? 1 : 0].join('|');
  if (c.dataset.k !== key) {
    c.dataset.k = key;
    c.innerHTML = `<span class="gd-ringp" style="--p:${pct}"><b>${st >= 4 ? icon('check') : pct + '%'}</b></span><span class="gd-hc-t"><b></b><small></small></span>`;
    c.querySelector('.gd-hc-t b').textContent = def.name;
    c.querySelector('small').textContent = (p.ripe ? 'Ready to pick' : gardenStageName(def, st)) + (p.thirsty ? ' · thirsty' : '') + (p.by ? ' · ' + _gllByLine('p', p.by) : '');
  }
  c.hidden = false;
  const r = box.getBoundingClientRect();
  c.style.left = Math.min(r.width - 190, Math.max(6, ev.clientX - r.left + 14)) + 'px';
  c.style.top = Math.max(6, ev.clientY - r.top - 54) + 'px';
}
function gardenHoverCardHide() { const box = _gdgBox(), c = box && box.querySelector('.gd-hovercard'); if (c) c.hidden = true; }

/* ---------- what to do next ---------- */
function _gdgFreeSpot(m, def) {
  for (const [x, y] of [[9, 6], [10, 6], [11, 6], [9, 5], [10, 5], [11, 5], [8, 6], [12, 6], [8, 5], [12, 5], [10, 7], [9, 7], [11, 7], [13, 6], [7, 6], [8, 7], [12, 7], [13, 7], [13, 5], [7, 7]]) {
    if (m.occ.has(x + ',' + y)) continue;
    if (!_gdPlaceOk(m, def, x, y, 'plant')) return { x, y };
  }
  for (let y = 0; y < GARDEN_WORLD.rows; y++) for (let x = 0; x < GARDEN_WORLD.cols; x++) { if (m.occ.has(x + ',' + y)) continue; if (!_gdPlaceOk(m, def, x, y, 'plant')) return { x, y }; }
  return null;
}
function gardenNextStep(m) {
  const seeds = _gdpSeedList(), w = m.wallet;
  const go = (label, run) => ({ label, run });
  // 1. something is ready
  const ripe = m.plants.find(p => p.ripe && p.def.yield);
  if (ripe) return { icon: 'shopping-basket', title: m.ripe > 1 ? `${m.ripe} things are ready to pick` : `Your ${ripe.def.name.toLowerCase()} is ready`, text: 'Click it: it flies into your basket.', target: { x: ripe.x, y: ripe.y, w: ripe.fp, h: ripe.fp }, btn: go(m.ripe > 1 ? 'Harvest all' : 'Pick it', () => _gdpAct(m.ripe > 1 ? gardenHarvestAll() : gardenHarvest(ripe.uid))), key: 'ripe' + ripe.uid };
  // 2. an empty garden
  const nPlants = m.plants.filter(p => p.def.special !== 'heart').length;
  if (!seeds.length && !nPlants) {
    const cheap = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= 1).sort((a, b) => a.price - b.price)[0];
    return { icon: 'store', title: 'Your plot is empty', text: `Seeds start at ${cheap ? cheap.price : 6} coins in the shop. Coins come from time spent on tasks.`, target: null, btn: go('Walk to the shop', () => gardenGoToAct('shop')), key: 'empty' };
  }
  // (thirst is not a chore any more: a drooping plant says it. FUN_PLAN #11, 11 Nov 2026)
  // 4. a seed to plant
  if (seeds.length && nPlants < 4) {
    const s = seeds[0], spot = _gdgFreeSpot(m, s.def);
    if (spot) return { icon: 'sprout', title: nPlants ? 'Plant another seed' : 'Plant your first seed', text: `Click the soil and pick the ${s.def.name.toLowerCase()} seed.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; const r = gardenPlantAt(s.id, spot.x, spot.y); _gdpAct(r); _gdpPickTool('seed'); }), key: 'plant' + s.id };
  }
  // 5. money to spend
  const buy = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= m.level.level && !_gdG().disc[p.id] && p.price <= w.coins).sort((a, b) => a.price - b.price)[0];
  if (buy) return { icon: 'store', title: `You have ${_gdpNum(w.coins)} coins`, text: `The shop has a ${buy.name.toLowerCase()} seed for ${buy.price}: a plant you have not grown yet.`, target: null, btn: go('Walk to the shop', () => gardenGoToAct('shop')), key: 'buy' + buy.id };
  // 6. a seed to plant, any time
  if (seeds.length) { const s = seeds[0], spot = _gdgFreeSpot(m, s.def); if (spot) return { icon: 'sprout', title: 'Seeds in your bag', text: `${s.n} ${s.def.name.toLowerCase()} seed${s.n === 1 ? '' : 's'} waiting. Choose where you would like it to grow.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; _gdpAct(gardenPlantAt(s.id, spot.x, spot.y)); _gdpPickTool('seed'); }), key: 'plant2' + s.id }; }
  // 7. a rumour, not a chore: what someone has said about the next shut gate (FUN_PLAN #11). The garden never asks for work.
  const rumour = typeof gardenGateRumour === 'function' ? gardenGateRumour(m) : null;
  if (rumour) return rumour;
  return { icon: 'footprints', title: 'Have a wander', text: 'Walk, fish, or see who is about. Time on your real tasks quietly fills your purse.', target: null, btn: null, key: 'wander' };
}
/* ---------- today's income ---------- */
function gardenEconCard(m) {
  const w = m.wallet, e = w.econToday, g = _gdG();
  const c = _gdpEl('section', 'gd-econ card');
  const pct = Math.min(100, Math.round(100 * e.coins / e.cap));
  c.innerHTML = `<div class="gd-econ-h"><b>Coins today</b><span class="num"></span></div><div class="gd-capbar" role="progressbar" aria-valuemin="0" aria-valuemax="${e.cap}" aria-valuenow="${e.coins}"><i style="width:${pct}%"></i></div><p class="gd-econ-line"></p>`;
  c.querySelector('.num').textContent = `${e.coins} / ${e.cap}`;
  c.querySelector('.gd-econ-line').textContent = gardenEconLine(e);
  const rows = e.log.slice();
  for (const id of Object.keys(g.dt[m.today] || {})) { const def = GARDEN_DAILY.find(x => x.id === id); if (def) rows.push({ why: 'Garden goal: ' + def.label.replace('{n}', def.n), c: gardenDailyCoins(def, m.today) }); }
  let sold = 0, soldN = 0; for (const x of Object.values(g.led)) if (x && x.k === 's' && x.d === m.today) { sold += Number(x.c) || 0; soldN += Number(x.n) || 0; }
  if (sold) rows.push({ why: `Sold ${soldN} thing${soldN === 1 ? '' : 's'} at the market`, c: sold });
  const det = document.createElement('details'); det.className = 'gd-econ-log';
  det.innerHTML = '<summary>Where today’s coins came from</summary>';
  const ul = _gdpEl('ul');
  if (!rows.length) ul.appendChild(_gdpEl('li', 'muted', 'Nothing yet today. Start a focus timer on a task: 12 coins an hour.'));
  for (const r of rows) { const li = _gdpEl('li'); li.appendChild(_gdpEl('span', null, r.why)); li.appendChild(_gdpEl('b', r.c < 0 ? 'neg' : '', (r.c > 0 ? '+' : '') + r.c)); ul.appendChild(li); }
  det.appendChild(ul);
  det.appendChild(_gdpEl('p', 'muted gd-econ-how', 'Rules: 1 coin per 5 focused minutes (first 2 hours a day, half after, none past 4), a bonus for the time a finished task took, sessions under 5 minutes and quick or empty tasks pay nothing, each task pays once.'));
  det.open = !!_gdp.econOpen;
  det.addEventListener('toggle', () => { _gdp.econOpen = det.open; });
  c.appendChild(det);
  const tid = typeof gameFocusNextTask === 'function' ? gameFocusNextTask() : null;
  if (tid && typeof gameFocusStart === 'function' && typeof gameFocusRun === 'function' && !gameFocusRun()) c.appendChild(_gdpBtn('Start a focus timer', { icon: 'timer', run: () => { gameFocusStart(tid); gardenToast('Focus timer started. Coins arrive as the minutes add up.', { icon: 'timer' }); } }));
  return c;
}

/* ---------- first run: no tour (2.23): a bouncing arrow does it (94-garden-world-2hud.js). The free seed is still there. ---------- */
function _gdgFirstSeed() {
  const g = _gdG();
  if (g.seen.tourSeed || _gdpSeedList().length || gardenModel().plants.some(p => p.def.special !== 'heart')) return;
  g.seen.tourSeed = _gdToday();
  _gdLed('onb', { c: 0, i: { 'seed:daisy': 1 }, n: 0 });
  _gdSave();
}
function _gdgGoalDisclosure(key, label, content) {
  const d = document.createElement('details'); d.className = 'gd-curated-section'; d.dataset.gardenSection = key;
  const s = document.createElement('summary'); s.textContent = label; d.appendChild(s); if (content) d.appendChild(content); return d;
}
function _gdgGoalNext(m, atHome) {
  const n = gardenNextStep(m), row = _gdpEl('section', 'gd-curated-next'); row.dataset.gardenSection = 'goals-next-step';
  row.innerHTML = `<span class="gd-next-ic" aria-hidden="true">${icon(n.icon)}</span>`;
  const text = _gdpEl('div', 'gd-curated-next-text'); text.append(_gdpEl('small', 'gd-curated-next-label', atHome ? 'At home, in your garden' : 'In your garden'), _gdpEl('h3', '', n.title), _gdpEl('p', '', n.text)); row.appendChild(text);
  const b = _gdpBtn(atHome ? 'Go to your garden' : n.btn ? n.btn.label : 'Back to the garden', { kind: 'btn-primary', run: () => { gardenPopupClose(); if (atHome || typeof gardenVisitOn === 'function' && gardenVisitOn()) { setView('garden'); return; } if (n.btn) n.btn.run(); } }); b.dataset.gardenAction = atHome ? 'home:go' : 'next:' + n.key; row.appendChild(b); return row;
}
function _gdgGoalVisitLead() {
  const here = typeof gardenVisitModel === 'function' && gardenVisitModel(), name = here && here.visit && here.visit.name;
  const row = _gdpEl('section', 'gd-curated-next'); row.dataset.gardenSection = 'goals-visit';
  row.innerHTML = `<span class="gd-next-ic" aria-hidden="true">${icon('footprints')}</span>`;
  const text = _gdpEl('div', 'gd-curated-next-text'); text.append(_gdpEl('small', 'gd-curated-next-label', 'Visiting'), _gdpEl('h3', '', name ? name + '’s garden' : 'A friend’s garden'), _gdpEl('p', '', 'Enjoy this garden at your own pace. Your next step at home is below.')); row.appendChild(text);
  const b = _gdpBtn('Back to the garden', { kind: 'btn-primary', run: gardenPopupClose }); b.dataset.gardenAction = 'visit:back'; row.appendChild(b); return row;
}
/** One lead action; existing goal progress and income remain on demand. */
function gardenGoalsPanel(el, m) {
  el._gdGoalViewKey = typeof gardenLiveGoalSummaryKey === 'function' ? gardenLiveGoalSummaryKey() : '';
  el.classList.add('gd-goals-curated');
  const visiting = typeof gardenVisitOn === 'function' && gardenVisitOn(), next = _gdgGoalNext(m, visiting), shared = _gdpEl('div', 'gd-curated-shared');
  if (typeof gardenLiveGoalSummary === 'function') gardenLiveGoalSummary(shared);
  const view = typeof _glg !== 'undefined' && _glg.view, active = shared.firstElementChild && view && view.st === 0;
  if (active) {
    shared.dataset.gardenSection = 'goals-shared:' + view.g;
    const skip = shared.querySelector('button'); if (skip) { skip.dataset.gardenAction = 'shared:' + view.g + ':skip'; shared.appendChild(_gdgGoalDisclosure('goals-shared-options:' + view.g, 'Shared goal options', skip)); }
    const back = _gdpBtn('Back to the garden', { kind: 'btn-primary', run: gardenPopupClose }); back.dataset.gardenAction = 'shared:' + view.g + ':play'; shared.appendChild(back); el.appendChild(shared);
    el.appendChild(_gdgGoalDisclosure(visiting ? 'goals-home-next' : 'goals-next', visiting ? 'At home: your next step' : 'A step in your garden', next));
  } else {
    el.appendChild(visiting ? _gdgGoalVisitLead() : next);
    if (visiting) el.appendChild(_gdgGoalDisclosure('goals-home-next', 'At home: your next step', next));
    if (shared.firstElementChild) el.appendChild(_gdgGoalDisclosure('goals-shared-recent', 'Recent shared goal', shared));
  }
  // Reuse the existing rows and their handlers; this changes presentation only.
  const tasks = _gdpEl('div'); _gdpToday(tasks, m);
  const daily = tasks.querySelector(':scope > .gd-tasks'), weekly = tasks.querySelector(':scope > .gd-quests');
  if (daily) { daily.classList.add('gd-curated-goallist'); el.appendChild(_gdgGoalDisclosure('goals-daily', visiting ? 'Your goals today' : 'Today’s garden goals', daily)); }
  if (weekly) { weekly.classList.add('gd-curated-section'); weekly.dataset.gardenSection = 'goals-weekly'; weekly.open = false; weekly.querySelector('summary').textContent = visiting ? 'Your weekly quests' : 'This week’s quests'; el.appendChild(weekly); }
  el.appendChild(_gdgGoalDisclosure('goals-coins', visiting ? 'Your coins today' : 'Coins today', gardenEconCard(m)));
}

/* ---------- the guide ---------- */
function gardenGuideOpen() {
  const root = _gdp.root; if (!root) return;
  const existing = root.querySelector('.gd-guide'); if (existing) { if (existing._gdClose) existing._gdClose(); else existing.remove(); return; }
  if (typeof _gw !== 'undefined') {
    const moving = !!(_gw.path.length || _gw.keys.size || _gw.hold), native = window.GardenNative && GardenNative.world();
    if (typeof _gwFishBusy === 'function' && _gwFishBusy()) _gwFishCancel('');
    _gw.netting = null;
    if (native && native.stopMoving) native.stopMoving(); else { _gw.keys.clear(); _gw.path = []; _gw.then = null; _gw.hold = null; _gw.spd = 0; }
    if (moving && typeof _gllGoNow === 'function') _gllGoNow();
  }
  const origin = document.activeElement, sec = (key, title, html) => `<details class="gd-curated-section" data-garden-section="help-${key}"><summary>${esc(title)}</summary><div class="gd-help-section">${html}</div></details>`;
  const g = document.createElement('div'); g.className = 'gd-guide gd-guide-curated'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'gd-guide-title');
  const close = () => { g.remove(); const focus = origin && origin.isConnected && origin.getClientRects().length ? origin : root.querySelector('.gd-stagebox'); if (focus && focus.focus) focus.focus({ preventScroll: true }); }; g._gdClose = close;
  g.innerHTML = `<div class="gd-guide-card card"><div class="gd-guide-h"><h2 id="gd-guide-title">Garden help</h2><span class="gd-guide-b"></span></div><div class="gd-guide-body"><p class="gd-guide-intro">Click or tap to walk. Choose something in the garden to interact with it. Open a section when you need a hand.</p>`
    + sec('controls', 'Move around & use the camera', '<p>WASD and arrow keys also walk. Press <kbd>E</kbd> or <kbd>Space</kbd> to interact nearby.</p><p><b>Map</b> (<kbd>M</kbd>) shows the garden. <b>View</b> (<kbd>?</kbd>) holds camera buttons and controls. Wheel or pinch to zoom; <kbd>+ −</kbd> zoom, <kbd>F</kbd> fits the garden, and <kbd>C</kbd> follows you.</p>')
    + sec('plants', 'Plant, water or place something', '<p>Open <b>Bag</b> (<kbd>B</kbd>), choose an owned seed or decoration, then click or tap where it belongs. You can drag it there too. Visit the shop for more.</p><p>The Hand picks a ripe plant or waters a thirsty one. Right-click a plant for its other actions. Plants grow with real time; thirsty plants wait and grow slowly, but never die. <kbd>Esc</kbd> puts down a chosen tool or item.</p>')
    + sec('fishing', 'Fish or catch bugs', '<ol><li>Click the water near a visible fish to cast, just in front of it.</li><li>Wait through nibbles. Strike when the float plunges and the <b>!</b> appears: click, <kbd>Space</kbd> or <kbd>E</kbd>.</li><li>If a reel bar appears, <b>hold to lift it and release to lower it</b>. Keep the fish inside the bar to fill the meter.</li><li>Press <kbd>Esc</kbd>, move away or change tool to wind in.</li></ol><p>Hold Shift to creep along the bank. Click a bug to creep up and net it. The tackle shop has rods, bait and lake improvements.</p>')
    + sec('land-play', 'Explore land or choose an activity', '<p>Walk to an entrance or use Map. A closed gate shows its level or requirement; the <b>Land</b> panel lists plots and their access.</p><p>Open <b>Menu → Play</b> when you want an activity. In <b>In the garden</b>, choose one to put out; <b>Put it away</b> clears the space again. Available activities follow your garden level.</p>')
    + sec('friends', 'Play with friends', '<p><b>Menu → Friends</b> opens the post box. The host chooses Look, Help or Play access. <b>Moves</b> (<kbd>Q</kbd>) is in Menu; <b>Say something</b> and <b>Group photo</b> appear while people are live together.</p>')
    + sec('coins', 'Find goals or understand coins', '<p><b>Menu → Goals</b> offers one next step. Today’s goals, weekly quests and coin details are there when you open them.</p><p>Focus sessions and completed tasks earn garden coins. <b>Goals → Coins today</b> explains the limits and lists what paid. The status button shows your balance.</p>')
    + '</div></div>';
  const b = g.querySelector('.gd-guide-b');
  const dismiss = _gdpBtn('Close', { icon: 'x', aria: 'Close garden help', kind: 'btn-ghost', run: close }); dismiss.dataset.gardenAction = 'help-close'; b.appendChild(dismiss);
  g.addEventListener('click', (ev) => { if (ev.target === g) close(); });
  g.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') { ev.preventDefault(); close(); return; } if (ev.key === 'Tab') { const items = [...g.querySelectorAll('button,summary,a[href],[tabindex="0"]')].filter(n => !n.disabled && n.getClientRects().length), at = items.indexOf(document.activeElement); if (items.length && (ev.shiftKey && at <= 0 || !ev.shiftKey && at === items.length - 1)) { ev.preventDefault(); items[ev.shiftKey ? items.length - 1 : 0].focus(); } } }, true);
  root.appendChild(g);
  dismiss.focus({ preventScroll: true });
}

/* ---------- start and stop ---------- */
function gardenGameStart(root, m) {
  _gdg.stages = null; _gdg.visitors = null; _gdg.wlSeen = null; _gdg.next = null;
  _gdgWaterReset(m); _gdgWaterChanges(m);
  if (!_gdg.bound) { _gdg.bound = true; document.addEventListener('opendash:garden', _gdgOnEvent); }
  _gdgWatered(m);
  if (!m.visit) setTimeout(() => { if (_gdp.root === root && root.isConnected) _gdgFirstSeed(); }, 500);
  void root;
}
function gardenGameStop() { _gdgWaterReset(null); }
