/* ============================================================
   GARDEN, what lies over the world (2.23). Owner, 30 Oct 2026: "the side buttons must go ... all of it happens inside the game ... the garden fills the
   page: only overlays on top of the world". There is no page round the garden any more: the app's top bar steps aside and the sidebar stays (html.gd-immersive)
   and everything below floats on the stage (.gd-stagebox).

     HUD (top left)       level bar, coins, treats, water, casts, the season and the hour
     menu (top right)     Shop, Basket, Almanac, Catch, Friends, Goals, Help, Leave: each opens a panel over the world (94-garden-world-1popup.js)
     hotbar (bottom)      hand, can, feed, shears, spade, your first seeds, the bag; number keys; one clear selected slot
     bag                  everything you can plant or place: pick one and drop it in the world (a ghost shows where; red if it can't go there)
     bubble               a little bubble by the thing itself: seeds beside an empty bed, what you can do to a plant or a decoration, the price of land
     needs                the day's "what needs me": a drop over a thirsty plant, a sparkle over a ripe one, and a soft ring under it
     arrow                the first-time guide: a bouncing arrow on the next thing to touch, never a paragraph
     minimap, camera      bottom right

     gardenHudPaint(m)        everything above, brought up to date; each block is only touched when what it shows has changed
     gardenHudFrame()         once a frame from the world's loop: whatever is pinned to a spot in the world follows the camera
     gardenBubbleOpen(at, o)  at {x, y} in cells; o {title, sub, items: [{ic | svg, label, run, n, cls, keep}]}
     gardenBubbleClose()
     gardenBubbleFor(thing)   the bubble of a plant, a decoration, an empty spot or a piece of land
   ============================================================ */
const _gh = { hud: '', menu: '', bar: '', quick: '', mini: '', needs: '', bubble: null, bag: false, menuOpen: false, arrow: null, hint: false, dot: '' };

const _GH_GLYPH = Object.freeze({
  hand: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 15V7.5a2 2 0 0 1 4 0V14h.6V5.6a2 2 0 0 1 4 0V14h.6V7a2 2 0 0 1 4 0v9h.5v-4.4a2 2 0 0 1 4 0V20c0 5.4-3.6 9-9 9-3.8 0-6-1.5-8-4.4L5.300 18.800c-1.300-1.900 1.500-3.800 3-2z" fill="#f2c9a0" stroke="#7a4e2c" stroke-width="1.500" stroke-linejoin="round"/></svg>',
  water: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M23 13c7-1 8 10 0 11" fill="none" stroke="#2c5e86" stroke-width="2.600"/><path d="M11 10c0-6 10-6 10 0" fill="none" stroke="#2c5e86" stroke-width="2.600"/><path d="M9 15L2.500 7.500" stroke="#3f86b8" stroke-width="4.500" stroke-linecap="round"/><path d="M.8 10.500L5.800 4.500" stroke="#2c5e86" stroke-width="2.800" stroke-linecap="round"/><path d="M8 10h16v16a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#5fa8d8" stroke="#2c5e86" stroke-width="1.800"/><path d="M11 14v11" stroke="#a8d4f0" stroke-width="2.400" stroke-linecap="round"/></svg>',
  feed: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 11c-2 5-3 9-3 13a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4c0-4-1-8-3-13z" fill="#b48a54" stroke="#6a4a24" stroke-width="1.500"/><path d="M9 11c3-2 11-2 14 0l-2-6H11z" fill="#d6b078" stroke="#6a4a24" stroke-width="1.500" stroke-linejoin="round"/><path d="M16 25c-4-3-4-7 0-10 4 3 4 7 0 10z" fill="#7fbf5a" stroke="#3e7a2c" stroke-width="1.200"/></svg>',
  trim: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M14 16L25 4M18 16L7 4" stroke="#9aa6ae" stroke-width="3" stroke-linecap="round"/><circle cx="10.500" cy="23" r="4.300" fill="none" stroke="#c0453a" stroke-width="3"/><circle cx="21.500" cy="23" r="4.300" fill="none" stroke="#c0453a" stroke-width="3"/><path d="M13 19l6 0" stroke="#5a646c" stroke-width="2"/></svg>',
  dig: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M21 3l8 8-3 1-2 2-6-6 2-2z" fill="#a8743e" stroke="#6a4a24" stroke-width="1.300" stroke-linejoin="round"/><path d="M20 12L10 22" stroke="#a8743e" stroke-width="3.400" stroke-linecap="round"/><path d="M12 17l3 3c0 4-3 7-10 8 1-7 3-10 7-11z" fill="#aab4ba" stroke="#5a646c" stroke-width="1.500" stroke-linejoin="round"/></svg>',
  bag: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 13c-2 5-3 8-3 11a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4c0-3-1-6-3-11z" fill="#c08a4e" stroke="#6a4a24" stroke-width="1.500"/><path d="M10 13c-1-3 0-6 2-7 3-1 5-1 8 0 2 1 3 4 2 7z" fill="#d6a468" stroke="#6a4a24" stroke-width="1.500"/><path d="M8 13h16" stroke="#6a4a24" stroke-width="2.400" stroke-linecap="round"/><circle cx="16" cy="20" r="3" fill="#f2d090" stroke="#6a4a24" stroke-width="1.200"/></svg>',
  coin: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.500" fill="#f2b01e" stroke="#a06c0c" stroke-width="1.400"/><circle cx="10" cy="10" r="5.400" fill="none" stroke="#ffe08a" stroke-width="1.400"/></svg>',
});
const _GH_TOOLS = Object.freeze([
  ['hand', 'Hand: does what a plant needs'], ['water', 'Watering can'], ['feed', 'Fertiliser: half a day of growth'], ['trim', 'Shears'], ['dig', 'Spade: dig up'],
]);
function _ghBox() { return _gdp.root ? _gdp.root.querySelector('.gd-stagebox') : null; }
function _ghHost(box, cls, tag) { let n = box.querySelector(':scope > .' + cls.split(' ')[0]); if (!n) { n = document.createElement(tag || 'div'); n.className = cls; box.appendChild(n); } return n; }
function _ghProject(wx, wy) {
  const c = _gw.cam, s = _gwSize(), W = GARDEN_WORLD; if (!c.w || !s.w) return null;
  const k = Math.min(s.w / c.w, s.h / c.h);
  return { x: (wx * W.cellW - c.x) * k + (s.w - c.w * k) / 2, y: (W.sky + wy * W.cellH - c.y) * k + (s.h - c.h * k) / 2, k };
}

/* ---------- the HUD ---------- */
function _ghTreats() {
  try { if (typeof petTreats === 'function' && typeof petGet === 'function' && petGet()) { const t = petTreats(); if (t && Number.isFinite(t.have)) return t.have; } } catch (e) { /* no pets here */ }
  return null;
}
function _ghHud(box, m) {
  const w = m.wallet, lv = w.level, wi = m.water, sky = _gdpSkyChip(m), treats = _ghTreats();
  const pct = Math.round(lv.pct * 100);
  const stat = (cls, ic, val, tip) => `<span class="gd-stat ${cls}" data-tip="${escAttr(tip)}">${ic}<b>${esc(String(val))}</b></span>`;
  const html = `<div class="gd-hud-lv" data-tip="${escAttr(`Garden level ${lv.level}, ${lv.title}: ${_gdpNum(lv.into)} of ${_gdpNum(lv.need)} XP`)}"><span class="gd-hud-n">${lv.level}</span><span class="gd-hud-bar" role="progressbar" aria-label="Garden level progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span></div>`
    + '<div class="gd-hud-stats">'
    + stat('is-coins', _GH_GLYPH.coin, _gdpNum(w.coins), 'Coins: earned by focusing on tasks and finishing them')
    + (treats != null ? stat('is-treats', icon('cookie'), treats, 'Treats for your pet') : '')
    + stat('is-water', icon('droplet'), wi.raining ? '∞' : wi.left, wi.raining ? 'The rain is watering everything' : 'Water left in the can today')
    + '</div>'
    + `<div class="gd-hud-sky" data-tip="${escAttr(_gdpWeatherNote(m) || sky.text)}">${icon(sky.ic)}<span>${esc(sky.text)}</span></div>`;
  if (_gh.hud === html && box.querySelector(':scope > .gd-hud')) return;
  _gh.hud = html;
  const el = _ghHost(box, 'gd-hud'); el.setAttribute('aria-label', 'Your garden so far'); el.innerHTML = html;
}
const _GH_MENU = Object.freeze([
  ['shop', 'Shop', 'store'], ['basket', 'Basket', 'shopping-basket'], ['craft', 'Crafting', 'hammer'], ['tricks', 'Tricks', 'wand-sparkles'], ['almanac', 'Almanac', 'book-open'], ['nature', 'Nature', 'leaf'], ['catch', 'Catch', 'fish'], ['friends', 'Friends', 'users'], ['goals', 'Goals', 'target'], ['help', 'Help', 'circle-help'],
]);
function _ghMenu(box, m) {
  const badge = { basket: _gdpBasketCount(m) };
  try { if (typeof gardenCraftFresh === 'function') badge.craft = gardenCraftFresh(m); } catch (e) { /* later */ }
  try { if (typeof gardenCatchBag === 'function') { const n = gardenCatchBag(); badge.catch = n.nFish + n.nBugs; } } catch (e) { /* later */ }
  try { if (typeof gardenSocialBadge === 'function') badge.friends = gardenSocialBadge(); } catch (e) { /* later */ }
  badge.goals = gardenDailyTasks(gardenModel()).filter(t => !t.done).length;   // (your goals, wherever you stand)
  const btn = ([id, label, ic]) => `<button type="button" class="gd-mbtn" data-menu="${id}" aria-label="${escAttr(label)}">${icon(ic)}<span>${esc(label)}</span>${badge[id] ? `<i class="gd-mbadge">${badge[id] > 99 ? '99+' : badge[id]}</i>` : ''}</button>`;
  const html = `<button type="button" class="gd-mbtn gd-mleave gd-mnav" data-menu="nav" aria-label="Show sidebar" title="Show sidebar">${icon('panel-left')}</button><button type="button" class="gd-mbtn gd-mmore" data-menu="more" aria-label="Menu" aria-expanded="${_gh.menuOpen ? 'true' : 'false'}">${icon('menu')}</button><div class="gd-mlist">${m.visit ? btn(['visit', 'Guestbook', 'feather']) : ''}${_GH_MENU.map(btn).join('')}</div><button type="button" class="gd-mbtn gd-mleave" data-menu="leave" aria-label="${m.visit ? 'Back to your garden' : 'Leave the garden'}" data-tip="${m.visit ? 'Back to your garden' : 'Leave the garden'}">${icon('x')}</button>`;
  const el = _ghHost(box, 'gd-menu', 'nav');
  el.classList.toggle('is-open', !!_gh.menuOpen);
  if (_gh.menu === html && el.firstChild) return;
  _gh.menu = html; el.setAttribute('aria-label', 'Garden menu'); el.innerHTML = html;
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-menu]'); if (!b) return;
      const id = b.dataset.menu;
      if (id === 'nav') { const t = document.getElementById('drawer-btn'); if (t) t.click(); return; }   // on a phone, or with the sidebar folded away
      if (id === 'more') { _gh.menuOpen = !_gh.menuOpen; _gh.menu = ''; _ghMenu(box, gardenHere()); return; }
      _gh.menuOpen = false; _gh.menu = '';
      if (id === 'leave') { setView(typeof gardenVisitOn === 'function' && gardenVisitOn() ? 'garden' : 'home'); return; }
      if (id === 'help') { gardenGuideOpen(); return; }
      gardenPopupOpen(id);
    });
  }
}

/* ---------- the hotbar ---------- */
function _gdpSlots(m) {
  const out = _GH_TOOLS.map(([k, tip]) => ({ k, tip, tool: k }));
  const seeds = _gdpSeedList();
  const cur = _gdp.seed && seeds.find(x => x.id === _gdp.seed);
  const list = (cur ? [cur, ...seeds.filter(x => x !== cur)] : seeds).slice(0, 4);
  for (const x of list) out.push({ k: 'seed:' + x.id, seed: x.id, tip: x.def.name, n: x.n, def: x.def });
  void m;
  return out;
}
function _ghSlotArt(s) {
  if (s.seed) { try { return gardenIconSvg(s.seed, { kind: 'seed', px: 34 }); } catch (e) { return ''; } }
  return _GH_GLYPH[s.k] || '';
}
function _ghBar(box, m) {
  const tool = _gdpTool(), slots = _gdpSlots(m);
  const fert = gardenHas('fertiliser');
  const on = (s) => (s.seed ? tool === 'seed' && _gdp.seed === s.seed : s.tool === tool);
  const parts = slots.map((s, i) => {
    const count = s.seed ? s.n : s.k === 'feed' ? fert : s.k === 'water' ? (m.water.raining ? '' : m.water.left) : '';
    const empty = s.k === 'feed' && !fert;
    return `<button type="button" class="gd-slot${s.seed ? ' is-seed' : ''}${empty ? ' is-empty' : ''}" data-slot="${escAttr(s.k)}"${s.tool ? ` data-tool="${s.tool}"` : ''} aria-pressed="${on(s) ? 'true' : 'false'}" aria-label="${escAttr(s.tip)}" data-tip="${escAttr(s.tip)}"><kbd>${i + 1}</kbd>${_ghSlotArt(s)}${count !== '' ? `<i class="gd-slotn">${count}</i>` : ''}</button>${i === 4 ? '<span class="gd-slotgap"></span>' : ''}`;
  });
  let carry = '';
  if (tool === 'decorate' && _gdp.decor) { const d = gardenDecor(_gdp.decor); if (d) carry = `<button type="button" class="gd-slot is-carry" data-slot="carry" aria-pressed="true" aria-label="Put it back in the bag" data-tip="${escAttr(d.name)}: click the world to place it. Esc puts it back">${gardenIconSvg(d.id, { kind: 'decor', px: 34 })}<i class="gd-slotn">${gardenHas('decor:' + d.id)}</i></button>`; }
  if (_gdp.moving) carry = `<button type="button" class="gd-slot is-carry" data-slot="carry" aria-pressed="true" aria-label="Stop moving it" data-tip="Click where it should go. Esc to stop">${icon('move')}</button>`;
  const nBag = _gdpSeedList().reduce((a, x) => a + x.n, 0) + _gdpDecorList().reduce((a, x) => a + x.n, 0);
  const html = parts.join('') + carry + `<button type="button" class="gd-slot gd-slot-bag" data-slot="bag" aria-pressed="${_gh.bag ? 'true' : 'false'}" aria-label="Your bag: seeds and decorations" data-tip="Your bag: seeds and decorations"><kbd>B</kbd>${_GH_GLYPH.bag}${nBag ? `<i class="gd-slotn">${nBag}</i>` : ''}</button>`;
  const el = _ghHost(box, 'gd-toolbar gd-hotbar');
  if (_gh.bar !== html || !el.firstChild) {
    _gh.bar = html; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Tools and seeds'); el.innerHTML = html;
  }
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-slot]'); if (b) gardenSlotPick(b.dataset.slot); });
    el.addEventListener('pointerdown', (ev) => { const b = ev.target.closest('[data-slot^="seed:"]'); if (b && ev.button === 0) _gdpCarryStart('seed', b.dataset.slot.slice(5), ev); });
  }
}
/** A slot was clicked (or its number pressed). */
function gardenSlotPick(k) {
  if (Date.now() - (_gdp.carriedAt || 0) < 400) return;   // clock-ok: that was the end of a drag
  if (k === 'bag') { _gh.bag = !_gh.bag; gardenBubbleClose(); _ghBag(); _gh.bar = ''; _ghBar(_ghBox(), gardenHere()); return; }
  if (k === 'carry') { _gdp.moving = null; _gdp.decor = ''; _gdpPickTool('hand'); return; }
  _gh.bag = false; _ghBag();
  if (k.startsWith('seed:')) { const id = k.slice(5); if (_gdpTool() === 'seed' && _gdp.seed === id) { _gdpPickTool('hand'); return; } _gdp.seed = id; _gdpPickTool('seed'); return; }
  _gdpPickTool(_gdpTool() === k ? 'hand' : k);
}
/** Number keys: the hotbar in order. */
function gardenSlotKey(n) { const s = _gdpSlots(gardenHere())[n - 1]; if (s) { gardenSlotPick(s.k); return true; } return false; }

/* ---------- the bag: pick one and drop it in the world ---------- */
function _ghBag() {
  const box = _ghBox(); if (!box) return;
  let el = box.querySelector(':scope > .gd-bagpop');
  if (!_gh.bag) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'gd-bagpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Your bag'); box.appendChild(el); }
  el.textContent = '';
  const seeds = _gdpSeedList(), decor = _gdpDecorList();
  const tile = (kind, x) => {
    const b = _gdpEl('button', 'gd-bagit'); b.type = 'button'; b.setAttribute('data-tip', x.def.name); b.setAttribute('aria-label', x.def.name);
    b.innerHTML = gardenIconSvg(x.id, { kind: kind === 'decor' ? 'decor' : 'seed', px: 48 }) + `<i class="gd-slotn">${x.n}</i>`;
    b.addEventListener('pointerdown', (ev) => { if (ev.button === 0) _gdpCarryStart(kind, x.id, ev); });
    b.onclick = () => {
      if (Date.now() - (_gdp.carriedAt || 0) < 400) return;   // clock-ok: that was the end of a drag
      _gh.bag = false; _ghBag();
      if (kind === 'decor') { _gdp.decor = x.id; _gdpPickTool('decorate'); } else { _gdp.seed = x.id; _gdpPickTool('seed'); }
    };
    return b;
  };
  if (!seeds.length && !decor.length) {
    // nothing yet: no paragraph, just the way to the shop
    const go = _gdpEl('button', 'gd-bagshop'); go.type = 'button'; go.innerHTML = icon('store') + '<span>Shop</span>'; go.onclick = () => { _gh.bag = false; _ghBag(); gardenPopupOpen('shop'); };
    el.appendChild(go); el.appendChild(_gdpEl('i', 'gd-arrow-inline'));
    return;
  }
  if (seeds.length) { const g = _gdpEl('div', 'gd-baggrid'); g.setAttribute('aria-label', 'Seeds'); for (const x of seeds) g.appendChild(tile('seed', x)); el.appendChild(g); }
  if (seeds.length && decor.length) el.appendChild(_gdpEl('hr', 'gd-baghr'));
  if (decor.length) { const g = _gdpEl('div', 'gd-baggrid'); g.setAttribute('aria-label', 'Decorations'); for (const x of decor) g.appendChild(tile('decor', x)); el.appendChild(g); }
}

/* ---------- the quick pills: pick all, water all, undo ---------- */
function _ghQuick(box, m) {
  const thirsty = m.visit ? gardenVisitCount(m, 'water') : m.rain.now ? 0 : m.plants.filter(p => p.thirsty && p.def.thirst && p.def.special !== 'heart').length;
  const ripeN = m.visit ? gardenVisitCount(m, 'harvest') : m.ripe;
  const undo = gardenCanUndo() ? _gd.undo[_gd.undo.length - 1] : null;
  const html = `<button type="button" class="gd-pill is-emote" data-quick="emote" data-tip="Moves (Q)" aria-label="Moves">${icon('smile')}</button>` + (typeof gardenLiveCanSay === 'function' && gardenLiveCanSay(m) ? `<button type="button" class="gd-pill is-say" data-quick="say" data-tip="Say something" aria-label="Say something">${icon('message-circle')}</button>` : '') + (typeof gardenSnapCan === 'function' && gardenSnapCan() ? `<button type="button" class="gd-pill is-snap" data-quick="snap" data-tip="Group photo" aria-label="Group photo">${icon('camera')}</button>` : '') + (ripeN > 1 ? `<button type="button" class="gd-pill is-pick" data-quick="pick" data-tip="Pick everything that is ready (H)" aria-label="Pick all ${ripeN}">${icon('shopping-basket')}<b>${ripeN}</b></button>` : '')
    + (thirsty > 1 ? `<button type="button" class="gd-pill is-water" data-quick="water" data-tip="Water every thirsty plant (Shift+W)" aria-label="Water all ${thirsty}">${icon('droplets')}<b>${thirsty}</b></button>` : '')
    + (undo ? `<button type="button" class="gd-pill is-undo" data-quick="undo" data-tip="${escAttr('Undo ' + undo.label)}" aria-label="${escAttr('Undo ' + undo.label)}">${icon('undo-2')}</button>` : '');
  const el = _ghHost(box, 'gd-quick');
  if (_gh.quick === html && (el.firstChild || !html)) return;
  _gh.quick = html; el.innerHTML = html;
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-quick]'); if (!b) return;
      const q = b.dataset.quick, at = b;
      if (q === 'undo') { if (gardenUndo()) gameCheer(at, { quiet: true }); return; }
      if (q === 'emote') { if (typeof gartEmoteWheel === 'function') gartEmoteWheel(); return; }
      if (q === 'say') { if (typeof gardenLivePhrases === 'function') gardenLivePhrases(at); return; }
      if (q === 'snap') { if (typeof gardenSnapAsk === 'function') gardenSnapAsk(); return; }
      const r = q === 'pick' ? gardenHarvestAll() : gardenWaterAll();
      if (r && !r.ok) gameDenyOf(r, at);
    });
  }
}

/* ---------- the minimap ---------- */
function _ghMini(box, m) {
  const W = GARDEN_WORLD, marks = m.plants.filter(p => p.ripe || (p.thirsty && p.def.thirst)).slice(0, 60).map(p => `<circle cx="${p.x + 0.5}" cy="${p.y + 0.5}" r="0.8" fill="${p.ripe ? '#ffc93c' : '#62c2ff'}"/>`).join('');
  const open = new Set(m.areas);
  const area = GARDEN_AREAS.map((a) => {
    const isOpen = open.has(a.id), wa = a.water;
    const col = !isOpen ? 'rgba(40,40,30,.55)' : _gdrTileCol(a.tile, m.season);
    return `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${col}"/>` + (wa ? `<rect x="${wa.x}" y="${wa.y}" width="${wa.w}" height="${wa.h}" fill="#4f93c8"/>` : '');
  }).join('');
  const html = `<svg viewBox="0 0 ${W.cols} ${W.rows}" preserveAspectRatio="none" aria-hidden="true"><rect width="${W.cols}" height="${W.rows}" fill="#7ea85a"/>${area}${marks}<rect class="gd-mini-view" fill="none" stroke="#fff" stroke-width=".35"/><circle class="gd-mini-me" r="1.100" fill="#fff" stroke="#2a2a2a" stroke-width=".3"/></svg>`;
  const el = _ghHost(box, 'gd-mini');
  if (_gh.mini !== html || !el.firstChild) {
    _gh.mini = html; el.innerHTML = html; _gh.dot = '';
    el.setAttribute('data-tip', m.visit ? 'The whole garden: click to walk there' : 'Your whole garden: click to walk there');
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', m.visit ? 'Map of this garden' : 'Map of your garden');
  }
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => {
      const r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W.cols, y = (ev.clientY - r.top) / r.height * W.rows;
      const a = gardenAreaAt(Math.floor(x), Math.floor(y), gardenHere().level.level);
      if (a.startsWith('locked:')) { gardenLandClick(a.slice(7), { clientX: ev.clientX, clientY: ev.clientY }); return; }
      if (!gardenWalkToPoint({ x, y }, null, { radius: 4 })) gameDeny(el, { at: { x: ev.clientX, y: ev.clientY } });
    });
  }
}

/* ---------- what needs me today ---------- */
const GH_NEED_MARKS = 6;
function _ghNeeds(m) {
  if (!_gdp.svg) return;
  const layer = _gdp.svg.querySelector('.gd-actors'); if (!layer) return;
  let g = layer.querySelector(':scope > .gd-needs');
  const W = GARDEN_WORLD, list = m.plants.filter(p => p.def.special !== 'heart' && (p.ripe || (p.thirsty && p.def.thirst && !m.rain.now)) && (!m.visit || gardenVisitWants(p))).slice(0, 60);
  // a full bed must not disappear under marks: every plant that wants you gets a soft ring on the ground, and only the few nearest you get a mark above it
  const far = (p) => Math.hypot((p.x + p.fp / 2) - _gw.px, ((p.y + p.fp) - _gw.py) * 0.8);
  const near = new Set(list.slice().sort((a, b) => far(a) - far(b)).slice(0, GH_NEED_MARKS).map(p => p.uid));
  const key = list.map(p => p.uid + (p.ripe ? 'r' : 't') + (near.has(p.uid) ? '!' : '')).join(',');
  _gh.needsAt = { x: _gw.px, y: _gw.py };
  if (g && _gh.needs === key) return;
  _gh.needs = key;
  if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'gd-needs'); layer.insertBefore(g, layer.firstChild); }
  g.innerHTML = list.map((p, i) => {
    const x = (p.x + p.fp / 2) * W.cellW, foot = W.sky + (p.y + p.fp) * W.cellH - 3, h = Math.max(22, Math.min(92, 64 * ((p.def.look && p.def.look.h) || 0.7) * 0.75 * (0.45 + p.stage * 0.14)));
    const ripe = p.ripe, ring = `<ellipse class="gd-need-ring" rx="${(12 + p.fp * 7)}" ry="${(4 + p.fp * 2.4)}" fill="${ripe ? '#ffd24a' : '#62c2ff'}"/>`;
    if (!near.has(p.uid)) return `<g transform="translate(${x.toFixed(1)} ${foot.toFixed(1)})">${ring}</g>`;
    let top = -h - 9;
    try { const n = _ghNodeOf(p.uid), b = n && n.getBBox ? n.getBBox() : null; if (b && b.height > 1) top = Math.max(-118, b.y * 0.75 - 9); } catch (e) { /* the estimate will do */ }
    return `<g transform="translate(${x.toFixed(1)} ${foot.toFixed(1)})">${ring}<g transform="translate(0 ${top.toFixed(1)})"><g class="gd-need-b" style="--i:${i % 5}"><circle r="6" fill="#fff" stroke="${ripe ? '#c88a08' : '#2c7ab0'}" stroke-width="1.200"/>${ripe ? '<path transform="scale(.74)" d="M0 -5.200l1.500 3.700 3.700 1.500-3.700 1.500L0 5.200l-1.500-3.700-3.700-1.500 3.700-1.500z" fill="#f2a60c"/>' : '<path transform="scale(.74)" d="M0 -5.400c2.500 3.300 3.800 5 3.800 6.800a3.800 3.800 0 0 1-7.600 0c0-1.800 1.300-3.500 3.800-6.800z" fill="#3b9ad8"/>'}</g></g></g>`;
  }).join('');
}

/* ---------- the bubble ---------- */
function gardenBubbleClose() {
  const B = _gh.bubble; _gh.bubble = null;
  if (B && B.el) B.el.remove();
}
function gardenBubbleOpen(at, o) {
  gardenBubbleClose();
  if (typeof gardenHoverCardHide === 'function') gardenHoverCardHide();   // the bubble says what it is: two labels on one plant is a muddle
  const box = _ghBox(); if (!box) return null;
  const el = document.createElement('div'); el.className = 'gd-bubble' + (o.cls ? ' ' + o.cls : ''); el.setAttribute('role', 'menu'); el.setAttribute('aria-label', o.title || 'What you can do here');
  if (o.title) { const h = _gdpEl('div', 'gd-bub-h'); h.appendChild(_gdpEl('b', null, o.title)); if (o.sub) h.appendChild(_gdpEl('small', null, o.sub)); el.appendChild(h); }
  const row = _gdpEl('div', 'gd-bub-row'); el.appendChild(row);
  for (const it of o.items || []) {
    const b = _gdpEl('button', 'gd-bub-btn' + (it.cls ? ' ' + it.cls : '')); b.type = 'button'; b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', it.label); b.setAttribute('data-tip', it.label);
    b.innerHTML = (it.svg || (it.ic ? icon(it.ic) : '')) + (it.n != null ? `<i class="gd-slotn">${esc(String(it.n))}</i>` : '');
    b.onclick = (ev) => { ev.stopPropagation(); if (!it.keep) gardenBubbleClose(); it.run(b); };
    row.appendChild(b);
  }
  box.appendChild(el);
  _gh.bubble = { el, at, w: el.offsetWidth, h: el.offsetHeight, key: '' };
  gardenHudFrame(true);
  return el;
}
/** The node a thing is drawn with, for the red flash. */
function _ghNodeOf(uid) { return uid && _gdp.svg ? _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(uid)}"]`) : null; }
function _ghDoTo(uid, r) { if (r && !r.ok) gameDenyOf(r, _ghNodeOf(uid)); return r; }
function gardenPlantBubble(p, m) {
  const def = p.def;
  if (def.special === 'heart') { gardenBubbleOpen({ x: p.x + p.fp / 2, y: p.y }, { title: def.name, sub: m.visit ? '' : _gdpNum(m.totalDone) + ' tasks', items: [] }); return; }
  const items = [];
  if (p.ripe) items.push({ svg: _GH_GLYPH.hand, label: 'Pick', cls: 'is-go', run: () => _ghDoTo(p.uid, gardenHarvest(p.uid)) });
  if (def.thirst) items.push({ svg: _GH_GLYPH.water, label: p.thirsty ? 'Water: it is thirsty' : 'Water', cls: p.thirsty ? 'is-go' : '', run: () => _ghDoTo(p.uid, gardenWater(p.uid)) });
  items.push({ svg: _GH_GLYPH.feed, label: 'Fertilise: half a day of growth', n: gardenHas('fertiliser'), cls: gardenHas('fertiliser') ? '' : 'is-off', run: (b) => { const r = gardenFeed(p.uid); if (r && !r.ok) gameDenyOf(r, b); } });
  if (p.stage >= 3) items.push({ svg: _GH_GLYPH.trim, label: 'Trim', cls: p.overgrown ? 'is-go' : '', run: () => _ghDoTo(p.uid, gardenPrune(p.uid)) });
  items.push({ ic: 'move', label: 'Move', run: () => gardenMoveStart(p.uid, 'plant') });
  items.push({ svg: _GH_GLYPH.dig, label: 'Dig up', run: () => { _ghDoTo(p.uid, gardenDig(p.uid)); _gdp.sel = ''; } });
  const a = gardenStageName(def, p.stage);
  gardenBubbleOpen({ x: p.x + p.fp / 2, y: p.y - 0.4 - 0.5 * p.stage / 4 }, { title: def.name, sub: m.visit ? gardenVisitPlantLine(p, a) : p.ripe ? 'Ready' : p.nextIn ? `${a} · ${_gdHoursLabel(p.nextIn)}` : a, items });
}
function gardenDecorBubble(d, m) {
  const def = d.def, items = [], ci = gardenCollectInfo(d.uid, m);
  if (ci) items.push({ ic: 'gift', label: ci.ready ? ci.label : ci.soon, cls: ci.ready ? 'is-go' : 'is-off', run: (b) => { const r = gardenCollect(d.uid); if (r && !r.ok) gameDenyOf(r, b); } });
  if (m.visit) { gardenVisitDecorBubble(d, m, items); gardenBubbleOpen({ x: d.x + (def.w || 1) / 2, y: d.y - 0.5 }, { title: def.name, sub: gardenVisitDecorLine(d), items }); return; }
  if (def.effect && def.effect.kind === 'show') items.push({ ic: 'eye', label: 'See your catches', run: () => gardenCatchOpen('show') });
  if (def.rot) items.push({ ic: 'rotate-cw', label: 'Turn', run: () => _ghDoTo(d.uid, gardenRotateDecor(d.uid)) });
  if (def.v > 1) items.push({ ic: 'palette', label: 'Restyle', run: () => _ghDoTo(d.uid, gardenStyleDecor(d.uid)) });
  items.push({ ic: 'move', label: 'Move', run: () => gardenMoveStart(d.uid, 'decor') });
  items.push({ svg: _GH_GLYPH.bag, label: 'Back in the bag', run: () => { _ghDoTo(d.uid, gardenRemoveDecor(d.uid)); _gdp.sel = ''; } });
  gardenBubbleOpen({ x: d.x + (def.w || 1) / 2, y: d.y - 0.5 }, { title: def.name, items });
}
/** An empty spot in a bed: the seeds that would grow right here. */
function gardenSpotBubble(cell, m) {
  const fit = _gdpSeedList().filter(x => !_gdPlaceOk(m, x.def, cell.x, cell.y, 'plant')).slice(0, 6);
  const items = fit.map(x => ({ svg: gardenIconSvg(x.id, { kind: 'seed', px: 34 }), n: x.n, label: x.def.name, run: (b) => {
    const r = gardenPlantAt(x.id, cell.x, cell.y);
    if (r && !r.ok) gameDenyOf(r, b);
  } }));
  items.push({ ic: 'store', label: 'More seeds in the shop', cls: fit.length ? '' : 'is-go', run: () => gardenPopupOpen('shop') });
  const a = gardenArea(gardenAreaAt(cell.x, cell.y, m.level.level));
  gardenBubbleOpen({ x: cell.x + 0.5, y: cell.y - 0.1 }, { title: a ? a.name : '', items, cls: fit.length ? '' : 'is-empty' });
  if (!fit.length) { const go = _gh.bubble && _gh.bubble.el.querySelector('.is-go'); if (go) go.appendChild(_gdpEl('i', 'gd-arrow-inline')); }
  gardenSpotMark(cell);
}
/** The little ring on the spot a bubble or a trowel is talking about. */
function gardenSpotMark(cell) {
  const gh = _gdp.svg && _gdp.svg.querySelector('.gd-ghost'); if (!gh) return;
  const W = GARDEN_WORLD, k = cell ? 'spot' + cell.x + ',' + cell.y : '';
  if (gh.dataset.k === k) return;
  gh.dataset.k = k;
  gh.innerHTML = cell ? `<ellipse class="gd-spotmark" cx="${(cell.x + 0.5) * W.cellW}" cy="${W.sky + (cell.y + 0.6) * W.cellH}" rx="${W.cellW * 0.34}" ry="${W.cellH * 0.34}"/>` : '';
}
function gardenLandBubble(id, m) {
  const info = gardenLandInfo(id, m); if (!info || info.owned) return;
  const a = info.def, lane = a.y < 11 ? a.y + a.h - 2.1 : a.y + 0.2;
  const items = [{ svg: _GH_GLYPH.coin, label: `Buy for ${_gdpNum(info.cost)} coins`, n: _gdpNum(info.cost), cls: 'is-go is-buy', run: (b) => {
    const r = gardenBuyLand(id);
    if (!r.ok) { gameDenyOf(r, b); return; }
    gameCheer(b, { text: '-' + info.cost, tone: 'coin', sound: true });
  } }];
  gardenBubbleOpen({ x: a.x + a.w / 2, y: lane }, { title: a.name, sub: a.blurb, items, cls: 'is-land' });
}
/** A click on land that is not yours. Land for sale: you walk to its sign and the price opens there. Land that opens with your level: a padlock. */
function gardenLandClick(id, ev) {
  const a = gardenArea(id), at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null; if (!a) return;
  const m = gardenHere();
  if (m.visit) { gameDeny(null, { kind: 'lock', at, say: 'That land is not open in this garden.' }); return; }
  if (!a.buy) { gameDeny(null, { kind: 'lock', badge: 'Lv ' + a.lv, at, say: `${a.name} opens at garden level ${a.lv}.` }); return; }
  if (m.level.level < a.lv) { gameDeny(null, { kind: 'lock', badge: 'Lv ' + a.lv, at, say: `${a.name} can be bought from garden level ${a.lv}.` }); return; }
  const stand = { x: a.x + a.w / 2, y: a.y < 11 ? 11.4 : 12.6 };
  if (!gardenWalkToPoint(stand, () => gardenLandBubble(id, gardenHere()), { radius: 2 })) gameDeny(null, { at, say: 'You cannot get there.' });
}
/** Pick up something already in the garden: it follows the pointer as a ghost until you click somewhere it can go. */
function gardenMoveStart(uid, kind) {
  gardenBubbleClose();
  if (typeof gardenVisitMayMove === 'function' && !gardenVisitMayMove(uid)) return;
  _gdp.moving = { uid, kind };
  const box = _ghBox(); if (box) box.focus({ preventScroll: true });
  const n = _ghNodeOf(uid); if (n) n.classList.add('is-lifted');
  if (box) box.dataset.placing = '1';
  _gh.bar = ''; _ghBar(box, gardenHere());
}
function gardenMoveEnd() {
  if (!_gdp.moving) return;
  const n = _ghNodeOf(_gdp.moving.uid); if (n) n.classList.remove('is-lifted');
  _gdp.moving = null;
  _gdpGhostClear();
  _gh.bar = ''; const box = _ghBox(); if (box) { box.dataset.placing = ''; _ghBar(box, gardenHere()); }
}

/* ---------- the first-time guide: a bouncing arrow, and the keys until you have used them ---------- */
function _ghArrowTarget(m) {
  const n = gardenNextStep(m), nPlants = m.plants.filter(p => p.def.special !== 'heart').length;
  _gh.arrowStep = n;
  if (nPlants >= 4) return null;
  if (n.target && /^plant/.test(n.key)) return { x: n.target.x + 0.5, y: n.target.y };
  if (/^(empty|buy)/.test(n.key)) { const p = GARDEN_PROPS.find(x => x.act === 'shop'); return p ? { x: p.x + p.w / 2, y: p.y - (p.tall || 2) + 0.3 } : null; }
  return null;
}
function _ghArrow(m) {
  const box = _ghBox(); if (!box) return;
  const t = m.visit ? null : _ghArrowTarget(m);
  let el = box.querySelector(':scope > .gd-arrow');
  if (!t) { if (el) el.remove(); _gh.arrow = null; return; }
  if (!el) { el = document.createElement('div'); el.className = 'gd-arrow'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<svg viewBox="0 0 40 52"><path d="M20 50L3 26h10V3h14v23h10z" fill="#ffc93c" stroke="#7a5200" stroke-width="3" stroke-linejoin="round"/></svg>'; box.appendChild(el); }
  _gh.arrow = t;
}
function _ghWalkHint() {
  const box = _ghBox(); if (!box) return;
  const seen = !!_gdG().seen.walked;
  let el = box.querySelector(':scope > .gd-walkhint');
  if (seen) { if (el) el.remove(); _gh.hint = false; return; }
  if (el) return;
  el = document.createElement('div'); el.className = 'gd-walkhint'; el.setAttribute('aria-label', 'Click or tap a spot to walk there, or use W A S D');
  el.innerHTML = '<svg class="gd-hint-mouse" viewBox="0 0 26 36" aria-hidden="true"><rect x="2" y="2" width="22" height="32" rx="11" fill="#fff" stroke="#2a2a2a" stroke-width="2"/><path d="M13 2v13M2.500 15h21" stroke="#2a2a2a" stroke-width="1.600"/><path d="M13 2a11 11 0 0 0-10.500 13H13z" fill="#ffc93c" stroke="#2a2a2a" stroke-width="1.600"/></svg>'
    + '<span class="gd-keys" aria-hidden="true"><kbd class="k-w">W</kbd><kbd class="k-a">A</kbd><kbd class="k-s">S</kbd><kbd class="k-d">D</kbd></span>';
  box.appendChild(el);
  _gh.hint = true;
}
/** You have walked: the hint has done its job. */
function gardenWalkedOnce() {
  if (!_gh.hint) return;
  _gh.hint = false;
  const g = _gdG(); if (!g.seen.walked) { g.seen.walked = _gdToday(); if (typeof saveUI === 'function') saveUI(); }
  const box = _ghBox(), el = box && box.querySelector(':scope > .gd-walkhint');
  if (el) { el.classList.add('is-gone'); setTimeout(() => el.remove(), 400); }
}

/* ---------- paint and frame ---------- */
function gardenHudPaint(m) {
  const box = _ghBox(); if (!box) return;
  _ghHud(box, m); _ghMenu(box, m); _ghBar(box, m); _ghQuick(box, m); _ghMini(box, m); _ghNeeds(m); _ghArrow(m); _ghWalkHint();
  if (typeof gardenVisitTagPaint === 'function') gardenVisitTagPaint(box, m);
  if (typeof gardenLiveGoalPaint === 'function') gardenLiveGoalPaint(box);   // a shared goal in a live garden (94-garden-live-7goal.js)
  if (_gh.bag) _ghBag();
}
function gardenHudReset() { Object.assign(_gh, { hud: '', menu: '', bar: '', quick: '', mini: '', needs: '', bubble: null, bag: false, menuOpen: false, arrow: null, hint: false, dot: '' }); }
function gardenHudFrame(force) {
  const box = _gw.box; if (!box) return;
  // you walked on: the marks follow you to whatever is nearest now
  if (_gh.needsAt && _gh.needs && Math.hypot(_gw.px - _gh.needsAt.x, _gw.py - _gh.needsAt.y) > 2.5) _ghNeeds(gardenHere());
  const B = _gh.bubble;
  if (B) {
    const p = _ghProject(B.at.x, B.at.y);
    if (p) {
      const s = _gw.size, x = Math.round(Math.max(6, Math.min(s.w - B.w - 6, p.x - B.w / 2))), y = Math.round(Math.max(60, Math.min(s.h - B.h - 92, p.y - B.h - 10)));
      const tail = Math.round(Math.max(12, Math.min(B.w - 12, p.x - x)));
      const key = x + ',' + y + ',' + tail;
      if (force || B.key !== key) { B.key = key; B.el.style.transform = `translate(${x}px, ${y}px)`; B.el.style.setProperty('--tail', tail + 'px'); }
    }
  }
  if (_gh.arrow) {
    const el = box.querySelector(':scope > .gd-arrow'), p = _ghProject(_gh.arrow.x, _gh.arrow.y);
    if (el && p) { const k = Math.round(p.x) + ',' + Math.round(p.y); if (el._k !== k) { el._k = k; el.style.transform = `translate(${Math.round(p.x) - 20}px, ${Math.round(p.y) - 60}px)`; } }
  }
  const mini = box.querySelector(':scope > .gd-mini');
  if (mini && mini.firstChild) {
    const me = mini.querySelector('.gd-mini-me'), view = mini.querySelector('.gd-mini-view'), W = GARDEN_WORLD, c = _gw.cam;
    const k = _gw.px.toFixed(1) + ',' + _gw.py.toFixed(1) + ',' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ',' + c.w.toFixed(0);
    if (me && _gh.dot !== k) {
      _gh.dot = k;
      me.setAttribute('cx', _gw.px.toFixed(1)); me.setAttribute('cy', _gw.py.toFixed(1));
      if (view) { view.setAttribute('x', (c.x / W.cellW).toFixed(1)); view.setAttribute('y', Math.max(0, (c.y - W.sky) / W.cellH).toFixed(1)); view.setAttribute('width', (c.w / W.cellW).toFixed(1)); view.setAttribute('height', (c.h / W.cellH).toFixed(1)); }
    }
  }
}
