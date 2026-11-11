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
const _gh = { hud: '', menu: '', bar: '', quick: '', mini: '', needs: '', bubble: null, bag: false, menuOpen: false, statusOpen: false, miniOpen: false, viewOpen: false, arrow: null, hint: false, walkOrigin: null, dot: '', camKey: '' };

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
/** Your title: read from the Field Journal's pages, never a number (JOURNAL.md section 9). */
const GH_TITLES = Object.freeze(['New in the vale', 'Keeper of the Mere', 'Friend of the woods', 'Walker of the Millwater', 'Keeper of the old ways', 'Orchard hand', 'Of the high places', 'Naturalist of Fleetwater']);
function _ghTitle() { let n = 0; try { if (typeof gardenJournalPageState === 'function') for (const p of GARDEN_JOURNAL_PAGES) if (gardenJournalPageState(p.id).done) n++; } catch (e) { n = 0; } return GH_TITLES[Math.min(GH_TITLES.length - 1, n)]; }
function _ghHud(box, m) {
  const w = m.wallet, lv = w.level, wi = m.water, sky = _gdpSkyChip(m), treats = _ghTreats();
  const pct = Math.round(lv.pct * 100);
  const stat = (cls, ic, val, tip) => `<span class="gd-stat ${cls}" data-tip="${escAttr(tip)}">${ic}<b>${esc(String(val))}</b></span>`;
  const html = `<button type="button" class="gd-hud-summary" data-hud-details aria-label="Garden status: ${escAttr(_ghTitle())}, ${escAttr(_gdpNum(w.coins))} coins. Show details" aria-expanded="false" aria-controls="gd-status-details">${stat('is-coins', _GH_GLYPH.coin, _gdpNum(w.coins), 'Coins')}${icon('chevron-down')}</button><div class="gd-status-details" id="gd-status-details" hidden><div class="gd-hud-lv"><b>${esc(_ghTitle())}</b></div><small>Your title grows as the Field Journal’s pages fill.</small>`
    + '<div class="gd-hud-stats">'
    + stat('is-coins', _GH_GLYPH.coin, _gdpNum(w.coins), 'Coins: earned by focusing on tasks and finishing them')
    + (treats != null ? stat('is-treats', icon('cookie'), treats, 'Treats for your pet') : '')
    + stat('is-timber', icon('trees'), _gdpNum(gardenHas('mat:timber')), 'Timber: for land, building, fences and paths') + stat('is-stone', icon('mountain'), _gdpNum(gardenHas('mat:stone')), 'Stone: for land, building, paths and ornaments')
    + '</div>'
    + `<div class="gd-hud-sky" data-tip="${escAttr(_gdpWeatherNote(m) || sky.text)}">${icon(sky.ic)}<span>${esc(sky.text)}</span></div></div>`;
  const el = _ghHost(box, 'gd-hud'); el.setAttribute('aria-label', 'Garden status');
  if (_gh.hud !== html || !el.firstChild) { const focused = el.contains(document.activeElement); _gh.hud = html; el.innerHTML = html; if (focused) el.querySelector('[data-hud-details]').focus({ preventScroll: true }); }
  el.querySelector('[data-hud-details]').setAttribute('aria-expanded', String(_gh.statusOpen)); el.querySelector('.gd-status-details').hidden = !_gh.statusOpen;
  if (!el._gdBound) { el._gdBound = true; el.addEventListener('click', ev => { if (ev.target.closest('[data-hud-details]')) { const on = !_gh.statusOpen; _ghClosePanels(box); _gh.statusOpen = on; _ghHud(box, gardenHere()); } }); }
}
const _GH_MENU = Object.freeze([
  ['play', 'Play', 'gamepad-2'],
  ['graphics', 'Graphics', 'monitor'],
  ['lands', 'Buy land', 'map-pin'],
  ['design', 'Design', 'paintbrush'],
  ['shop', 'Shop', 'store'], ['basket', 'Market stall', 'shopping-basket'], ['craft', 'Crafting', 'hammer'], ['tricks', 'Pet tricks', 'wand-sparkles'], ['almanac', 'Notice board', 'clipboard-list'], ['journal', 'Field Journal (J)', 'book-open'], ['catch', 'Bag & tackle', 'fish'], ['friends', 'Friends', 'users'], ['help', 'Help', 'circle-help'],
]);
function _ghMenu(box, m) {
  const btn = ([id, label, ic]) => `<button type="button" class="gd-mbtn" data-menu="${id}">${icon(ic)}<span>${esc(label)}</span></button>`;
  const by = id => _GH_MENU.find(row => row[0] === id), group = (name, rows) => `<section class="gd-mgroup"><h3>${esc(name)}</h3><div>${rows.filter(Boolean).map(btn).join('')}</div></section>`;
  const garden = ['shop', 'basket', 'craft', 'design'].map(by);
  const own = !m.visit && _gdG(), predecessor = '94f5b2dbe4dce765cafb2b40';
  if (own && own.since && (gardenWorldIsLegacy() || GARDEN_WORLD.v === 3 && Number(own.seen.world) === 3 && own.seen.worldLayout === predecessor && GARDEN_WORLD.lh !== predecessor) && gardenWorldReady()) garden.push(['update', 'Update my garden', 'sprout']);
  const together = ['play', 'tricks', 'friends'].map(by).concat([['emote', 'Dance (Q)', 'smile']]);
  if (typeof gardenLiveCanSay === 'function' && gardenLiveCanSay(m)) together.push(['say', 'Say something', 'message-circle']);
  if (typeof gardenSnapCan === 'function' && gardenSnapCan()) together.push(['snap', 'Group photo', 'camera']);
  if (m.visit) together.push(['visit', 'Guestbook', 'feather']);
  const html = `<button type="button" class="gd-mbtn gd-mleave gd-mnav" data-menu="nav" aria-label="Show sidebar" title="Show sidebar">${icon('panel-left')}</button><button type="button" class="gd-mbtn gd-mmore" data-menu="more" aria-label="Garden menu" aria-expanded="false" aria-controls="gd-menu-panel">${icon('menu')}<span>Menu</span></button><div class="gd-mlist" id="gd-menu-panel">`
    + group('Garden', garden) + group('Explore', ['journal', 'lands', 'almanac', 'catch'].map(by)) + group('Play & friends', together)
    + group('View & help', [['map', 'Map (M)', 'map'], ['view', 'Camera', 'sliders-horizontal'], by('graphics'), by('help')])
    + `</div><button type="button" class="gd-mbtn gd-mleave" data-menu="leave" aria-label="${m.visit ? 'Back to your garden' : 'Leave the garden'}" data-tip="${m.visit ? 'Back to your garden' : 'Leave the garden'}">${icon('x')}</button>`;
  const el = _ghHost(box, 'gd-menu', 'nav');
  el.classList.toggle('is-open', !!_gh.menuOpen);
  if (_gh.menu !== html || !el.firstChild) { _gh.menu = html; el.setAttribute('aria-label', 'Garden menu'); el.innerHTML = html; }
  el.querySelector('[data-menu="more"]').setAttribute('aria-expanded', String(_gh.menuOpen)); el.querySelector('.gd-mlist').hidden = !_gh.menuOpen;
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-menu]'); if (!b) return;
      const id = b.dataset.menu;
      if (id === 'nav') { const t = document.getElementById('drawer-btn'); if (t) t.click(); return; }   // on a phone, or with the sidebar folded away
      if (id === 'more') { const on = !_gh.menuOpen; _ghClosePanels(box); _gh.menuOpen = on; _ghMenu(box, gardenHere()); return; }
      _ghClosePanels(box);
      if (id === 'map' || id === 'view') { _ghToggleView(id, box, true); return; }
      if (id === 'emote') { if (typeof gartEmoteWheel === 'function') gartEmoteWheel(); return; }
      if (id === 'say') { if (typeof gardenLivePhrases === 'function') gardenLivePhrases(box.querySelector('.gd-mmore')); return; }
      if (id === 'snap') { if (typeof gardenSnapAsk === 'function') gardenSnapAsk(); return; }
      if (id === 'leave') { setView(typeof gardenVisitOn === 'function' && gardenVisitOn() ? 'garden' : 'home'); return; }
      if (id === 'update') { setView('garden:update'); return; }
      if (id === 'help') { gardenGuideOpen(); return; }
      if (id === 'graphics') { gardenGraphicsOpen(); return; }
      if (id === 'design') { gardenDesignEnter(); return; }
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
    if (s.seed && !on(s)) return '';   // seeds remain in the bag and keep their number-key bindings
    const count = s.seed ? s.n : s.k === 'feed' ? fert : s.k === 'water' ? (m.water.raining ? '' : m.water.left) : '';
    const empty = s.k === 'feed' && !fert;
    return `<button type="button" class="gd-slot${s.seed ? ' is-seed' : ''}${empty ? ' is-empty' : ''}" data-slot="${escAttr(s.k)}"${s.tool ? ` data-tool="${s.tool}"` : ''} aria-pressed="${on(s) ? 'true' : 'false'}" aria-label="${escAttr(s.tip)}" data-tip="${escAttr(s.tip)}"><kbd>${i + 1}</kbd>${_ghSlotArt(s)}${count !== '' ? `<i class="gd-slotn">${count}</i>` : ''}</button>${i === 4 ? '<span class="gd-slotgap"></span>' : ''}`;
  });
  let carry = '';
  if (tool === 'decorate' && _gdp.decor) { const d = gardenDecor(_gdp.decor); if (d) carry = `<button type="button" class="gd-slot is-carry" data-slot="carry" aria-pressed="true" aria-label="Put it back in the bag" data-tip="${escAttr(d.name)}: click the world to place it. Esc puts it back">${gardenIconSvg(d.id, { kind: 'decor', px: 34 })}<i class="gd-slotn">${gardenHas('decor:' + d.id)}</i></button>`; }
  if (_gdp.moving) carry = `<button type="button" class="gd-slot is-carry" data-slot="carry" aria-pressed="true" aria-label="Stop moving it" data-tip="Click where it should go. Esc to stop">${icon('move')}</button>`;
  const html = parts.join('') + carry + `<button type="button" class="gd-slot gd-slot-bag" data-slot="bag" aria-pressed="${_gh.bag ? 'true' : 'false'}" aria-label="Your bag: seeds and decorations" data-tip="Your bag: seeds and decorations"><kbd>B</kbd>${_GH_GLYPH.bag}</button>`;
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
function gardenSlotPick(k, keyboard) {
  if (!keyboard && Date.now() - (_gdp.carriedAt || 0) < 400) return;   // clock-ok: suppress the pointer click after a drag, not an intentional key
  _ghClosePanels(_ghBox());
  if (k === 'bag') { _gh.bag = !_gh.bag; gardenBubbleClose(); _ghBag(); _gh.bar = ''; _ghBar(_ghBox(), gardenHere()); return; }
  if (k === 'carry') { if (_gdp.moving) gardenMoveEnd(); _gdp.decor = ''; _gdpPickTool('hand'); return; }
  _gh.bag = false; _ghBag();
  if (k.startsWith('seed:')) { const id = k.slice(5); if (_gdpTool() === 'seed' && _gdp.seed === id) { _gdpPickTool('hand'); return; } _gdp.seed = id; _gdpPickTool('seed'); return; }
  _gdpPickTool(_gdpTool() === k ? 'hand' : k);
}
/** Number keys: the hotbar in order. */
function gardenSlotKey(n) { const s = _gdpSlots(gardenHere())[n - 1]; if (s) { gardenSlotPick(s.k, true); return true; } return false; }

/* ---------- the bag: pick one and drop it in the world ---------- */
function _ghCloseBag(box) {
  if (_gdp.carry) _gdpCarryEnd();
  _gh.bag = false; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere()); _ghFocusStage(box);
}
function _ghBag() {
  const box = _ghBox(); if (!box) return;
  let el = box.querySelector(':scope > .gd-bagpop');
  if (!_gh.bag) { if (el) { const focused = el.contains(document.activeElement); el.remove(); if (focused) box.focus({ preventScroll: true }); } return; }
  const fresh = !el;
  if (!el) { el = document.createElement('div'); el.className = 'gd-bagpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'gd-bag-title'); el.setAttribute('aria-describedby', 'gd-bag-instruction'); box.appendChild(el); }
  const m = gardenHere(), seeds = _gdpSeedList(), decor = _gdpDecorList(), stored = gardenStoredIndex(m);
  const pageSize = 24, pageCount = Math.max(1, Math.ceil(stored.rows.length / pageSize));
  const page = Math.max(0, Math.min(pageCount - 1, Math.floor(Number(el._bagStoredPage) || 0))); el._bagStoredPage = page;
  const stamp = JSON.stringify([seeds.map(x => [x.id, x.n, x.def.name]), decor.map(x => [x.id, x.n, x.def.name]), page]);
  if (el._bagStamp === stamp && el._bagStoredSignature === stored.signature && el.firstChild) return;
  const previous = el.contains(document.activeElement) ? document.activeElement.dataset.bagItem || document.activeElement.dataset.bagAction : '';
  const previousScroll = el.querySelector('.gd-bagcontents')?.scrollTop || 0; el._bagStamp = stamp; el._bagStoredSignature = stored.signature; el.textContent = '';
  const close = () => _ghCloseBag(box);
  const head = _gdpEl('div', 'gd-baghead'), title = _gdpEl('h2', '', 'Your bag'), dismiss = _gdpEl('button', 'gd-bagclose');
  title.id = 'gd-bag-title'; dismiss.type = 'button'; dismiss.dataset.bagAction = 'close'; dismiss.setAttribute('aria-label', 'Close bag'); dismiss.innerHTML = icon('x'); dismiss.onclick = close; head.append(title, dismiss); el.appendChild(head);
  const instruction = _gdpEl('p', 'gd-bag-instruction', 'Choose an item, then click or tap the garden to plant or place it. Or drag it there.'); instruction.id = 'gd-bag-instruction'; el.appendChild(instruction);
  const contents = _gdpEl('div', 'gd-bagcontents'); el.appendChild(contents);
  const tile = (kind, x) => {
    const b = _gdpEl('button', 'gd-bagit'); b.type = 'button'; b.dataset.bagItem = kind + ':' + x.id; b.setAttribute('data-tip', x.def.name); b.setAttribute('aria-label', `${x.def.name}, ${_gdpNum(x.n)} owned. Choose to ${kind === 'seed' ? 'plant' : 'place'}.`);
    b.innerHTML = '<span class="gd-bagit-art" aria-hidden="true">' + gardenIconSvg(x.id, { kind: kind === 'decor' ? 'decor' : 'seed', px: 48 }) + '</span>';
    const label = _gdpEl('span', 'gd-bagit-label'); label.append(_gdpEl('span', 'gd-bagit-name', x.def.name), _gdpEl('small', 'gd-bagit-count', _gdpNum(x.n) + ' owned')); b.appendChild(label);
    b.addEventListener('pointerdown', (ev) => { if (ev.button === 0) _gdpCarryStart(kind, x.id, ev); });
    b.onclick = () => {
      if (Date.now() - (_gdp.carriedAt || 0) < 400) return;   // clock-ok: that was the end of a drag
      _gh.bag = false; _ghBag();
      if (kind === 'decor') { _gdp.decor = x.id; _gdpPickTool('decorate'); } else { _gdp.seed = x.id; _gdpPickTool('seed'); }
    };
    return b;
  };
  if (!seeds.length && !decor.length && !stored.rows.length) {
    contents.appendChild(_gdpEl('p', 'gd-bagempty', 'Your bag is empty.'));
  }
  const section = (kind, name, rows) => { if (!rows.length) return; const s = _gdpEl('section', 'gd-bagsection'), h = _gdpEl('h3', '', name), g = _gdpEl('div', 'gd-baggrid'); h.id = 'gd-bag-' + kind; g.setAttribute('role', 'group'); g.setAttribute('aria-labelledby', h.id); for (const x of rows) g.appendChild(tile(kind, x)); s.append(h, g); contents.appendChild(s); };
  section('seed', 'Seeds', seeds); section('decor', 'Decorations', decor);
  if (stored.rows.length) {
    const shelf = _gdpEl('section', 'gd-bagsection'), heading = _gdpEl('h3', '', 'Stored garden'), grid = _gdpEl('div', 'gd-baggrid');
    heading.id = 'gd-bag-stored'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', heading.id);
    shelf.append(heading, _gdpEl('p', 'gd-bag-instruction', 'These keep their original growth and history. Choose one, then place it in a free spot.'));
    if (pageCount > 1) {
      const pages = _gdpEl('div', 'gd-bagfoot'); pages.setAttribute('role', 'group'); pages.setAttribute('aria-label', 'Stored garden pages');
      pages.style.gap = '8px'; pages.style.alignItems = 'center'; pages.style.flexWrap = 'wrap';
      grid.id = 'gd-bag-stored-grid'; grid.setAttribute('aria-describedby', 'gd-bag-stored-range');
      const turn = next => {
        const last = Math.max(0, Math.ceil(gardenStoredIndex(gardenHere()).rows.length / pageSize) - 1), target = Math.max(0, Math.min(last, next));
        if (target === el._bagStoredPage) return;
        el._bagStoredPage = target; _ghBag();
      };
      const pageButton = (label, action, next, disabled) => {
        const b = _gdpEl('button', 'gd-bagshop', label); b.type = 'button'; b.dataset.bagAction = action; b.disabled = disabled;
        b.setAttribute('aria-label', label + ' stored garden page'); b.setAttribute('aria-controls', grid.id);
        if (disabled) { b.style.opacity = '.45'; b.style.cursor = 'default'; }
        b.onclick = () => turn(next); return b;
      };
      const range = _gdpEl('span', 'gd-bagit-count', (page * pageSize + 1) + '\u2013' + Math.min(stored.rows.length, (page + 1) * pageSize) + ' of ' + stored.rows.length);
      range.id = 'gd-bag-stored-range'; range.setAttribute('role', 'status'); range.setAttribute('aria-live', 'polite'); range.setAttribute('aria-atomic', 'true');
      pages.append(pageButton('Previous', 'stored-prev', page - 1, page === 0), range, pageButton('Next', 'stored-next', page + 1, page === pageCount - 1)); shelf.appendChild(pages);
    }
    for (const item of gardenStoredItems(m, page * pageSize, pageSize)) {
      const button = _gdpEl('button', 'gd-bagit'); button.type = 'button'; button.dataset.bagItem = 'stored:' + item.kind + ':' + item.uid;
      button.setAttribute('aria-label', 'Place stored ' + item.def.name);
      button.innerHTML = '<span class="gd-bagit-art" aria-hidden="true">' + gardenIconSvg(item.def.id, { kind: item.kind, stage: item.stage, variant: item.variant, r: item.r, v: item.v, px: 48 }) + '</span>';
      const label = _gdpEl('span', 'gd-bagit-label'); label.append(_gdpEl('span', 'gd-bagit-name', item.def.name), _gdpEl('small', 'gd-bagit-count', item.kind === 'plant' ? 'Saved plant' : 'Saved decoration')); button.appendChild(label);
      button.onclick = () => { if (!gardenMoveStart(item.uid, item.kind)) return; _gh.bag = false; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere()); _ghFocusStage(box); };
      grid.appendChild(button);
    }
    shelf.appendChild(grid); contents.appendChild(shelf);
  }
  const foot = _gdpEl('div', 'gd-bagfoot'), shop = _gdpEl('button', 'gd-bagshop'); shop.type = 'button'; shop.dataset.bagAction = 'shop'; shop.innerHTML = icon('store') + '<span>Visit shop</span>'; shop.onclick = () => { _gh.bag = false; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere()); gardenPopupOpen('shop'); }; foot.appendChild(shop); el.appendChild(foot);
  contents.scrollTop = previousScroll;
  if (fresh) dismiss.focus({ preventScroll: true });
  else if (previous) { const active = [...el.querySelectorAll('[data-bag-item],[data-bag-action]')].find(n => n.dataset.bagItem === previous || n.dataset.bagAction === previous), fallback = el.querySelector('[data-bag-action="stored-prev"]:not(:disabled),[data-bag-action="stored-next"]:not(:disabled)') || dismiss; (active && !active.disabled ? active : fallback).focus({ preventScroll: true }); }
}

/* ---------- the quick pills: pick all, water all, undo ---------- */
function _ghQuick(box, m) {
  const thirsty = m.visit ? gardenVisitCount(m, 'water') : m.rain.now ? 0 : m.plants.filter(p => p.thirsty && p.def.thirst && p.def.special !== 'heart').length;
  const ripeN = m.visit ? gardenVisitCount(m, 'harvest') : m.ripe;
  const undo = gardenCanUndo() ? _gd.undo[_gd.undo.length - 1] : null;
  const html = (ripeN > 1 ? `<button type="button" class="gd-pill is-pick" data-quick="pick" data-tip="Pick everything that is ready (H)" aria-label="Pick all ${ripeN}">${icon('shopping-basket')}<b>${ripeN}</b></button>` : '')
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
  let el = box.querySelector(':scope > .gd-mini');
  if (!_gh.miniOpen) { if (el) el.hidden = true; return; }
  const W = GARDEN_WORLD, marks = m.plants.filter(p => p.ripe || (p.thirsty && p.def.thirst)).slice(0, 60).map(p => `<circle cx="${p.x + 0.5}" cy="${p.y + 0.5}" r="0.8" fill="${p.ripe ? '#ffc93c' : '#62c2ff'}"/>`).join('');
  const open = new Set(m.areas);
  const island = typeof gardenIslandActive === 'function' && gardenIslandActive();
  const area = gardenLandMini(open, m.season, m.level.level, m) + (island ? '' : GARDEN_AREAS.filter(a => a.water && open.has(a.id)).map(a => `<rect x="${a.water.x}" y="${a.water.y}" width="${a.water.w}" height="${a.water.h}" fill="#4f93c8"/>`).join(''));
  const html = `<div class="gd-map-head"><b>Garden map</b><button type="button" data-map="close" aria-label="Close map">${icon('x')}</button></div><svg viewBox="0 0 ${W.cols} ${W.rows}" preserveAspectRatio="none" role="img" aria-label="Garden paths, plants, your position and camera"><rect width="${W.cols}" height="${W.rows}" fill="#7ea85a"/>${area}${marks}<rect class="gd-mini-view" fill="none" stroke="#fff" stroke-width=".35"/><circle class="gd-mini-me" r="1.100" fill="#fff" stroke="#2a2a2a" stroke-width=".3"/></svg><div class="gd-map-foot"><span>Click or tap to walk.</span><button type="button" data-map="fit">Fit whole garden</button></div>`;
  el = _ghHost(box, 'gd-mini', 'section'); el.hidden = false; el.id = 'gd-map-panel';
  if (_gh.mini !== html || !el.firstChild) {
    _gh.mini = html; el.innerHTML = html; _gh.dot = '';
    el.setAttribute('aria-label', m.visit ? 'Map of this garden' : 'Map of your garden'); _gh.frameEls = null;
  }
  if (!el._gdBound) {
    el._gdBound = true;
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-map]'); if (b) { if (b.dataset.map === 'fit') gardenCamSet('fit'); _ghClosePanels(box); _ghFocusStage(box); return; }
      const svg = ev.target.closest('svg'); if (!svg) return;
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W.cols, y = (ev.clientY - r.top) / r.height * W.rows;
      const a = gardenAreaAt(Math.floor(x), Math.floor(y), gardenHere().level.level);
      if (a.startsWith('locked:')) { gardenLandClick(a.slice(7), { clientX: ev.clientX, clientY: ev.clientY }); return; }
      if (!gardenWalkToPoint({ x, y }, null, { radius: 4 })) gameDeny(el, { at: { x: ev.clientX, y: ev.clientY } });
      else { _ghClosePanels(box); _ghFocusStage(box); }
    });
  }
  gardenHudFrame(true);
}

/* The map and view controls are explicit, temporary panels. */
function _ghFocusStage(box) { if (box) box.focus({ preventScroll: true }); }
function _ghClosePanels(box, focus) {
  _gh.menuOpen = _gh.statusOpen = _gh.miniOpen = _gh.viewOpen = false; if (!box) return;
  const menu = box.querySelector(':scope > .gd-menu'); if (menu) { menu.classList.remove('is-open'); const b = menu.querySelector('[data-menu="more"]'); if (b) b.setAttribute('aria-expanded', 'false'); const p = menu.querySelector('.gd-mlist'); if (p) p.hidden = true; }
  for (const s of ['.gd-mini', '.gd-viewpanel', '.gd-status-details']) { const el = box.querySelector(s); if (el) el.hidden = true; }
  for (const b of box.querySelectorAll('[data-hud-view],[data-hud-details]')) b.setAttribute('aria-expanded', 'false');
  if (focus) { const b = menu && menu.querySelector('[data-menu="more"]'); if (b) b.focus({ preventScroll: true }); else _ghFocusStage(box); }
}
function _ghToggleView(kind, box, force) {
  const on = force || !(kind === 'map' ? _gh.miniOpen : _gh.viewOpen); _ghClosePanels(box);
  if (_gh.bag) { _gh.bag = false; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere()); }
  if (kind === 'map') _gh.miniOpen = on; else _gh.viewOpen = on;
  _ghViewTools(box); if (_gh.miniOpen) _ghMini(box, gardenHere()); if (_gh.viewOpen) _ghViewPanel(box); _gh.frameEls = null;
}
function _ghViewTools(box) {
  const el = _ghHost(box, 'gd-viewtools', 'nav'); el.setAttribute('aria-label', 'Garden view');
  if (!el.firstChild) el.innerHTML = `<button type="button" data-hud-view="map" aria-label="Map (M)" aria-controls="gd-map-panel">${icon('map')}<span>Map</span></button><button type="button" data-hud-view="view" aria-label="View and controls (?)" aria-controls="gd-view-panel">${icon('sliders-horizontal')}<span>View</span></button>`;
  for (const b of el.querySelectorAll('[data-hud-view]')) b.setAttribute('aria-expanded', String(b.dataset.hudView === 'map' ? _gh.miniOpen : _gh.viewOpen));
  if (!el._gdBound) { el._gdBound = true; el.addEventListener('click', ev => { const b = ev.target.closest('[data-hud-view]'); if (b) _ghToggleView(b.dataset.hudView, box); }); }
}
function _ghCameraButtons(box) {
  const panel = box.querySelector(':scope > .gd-viewpanel'); if (!panel || panel.hidden) return;
  const native = window.GardenNative && GardenNative.world(), c = native && native.cameraControls ? native.cameraControls() : null, fit = gardenCamMode() === 'fit';
  const i = c ? 0 : _gwCamZoomIdx(), canIn = c ? c.canZoomIn : fit || i > 0, canOut = c ? c.canZoomOut : fit || i < GW_ZOOMS.length - 1;
  const key = fit + '|' + canIn + '|' + canOut; if (_gh.camKey === key && panel._cameraReady) return; _gh.camKey = key; panel._cameraReady = true;
  panel.querySelector('[data-viewcam="fit"]').setAttribute('aria-pressed', String(fit));
  panel.querySelector('[data-viewcam="in"]').disabled = !canIn; panel.querySelector('[data-viewcam="out"]').disabled = !canOut;
}
function _ghViewPanel(box) {
  const el = _ghHost(box, 'gd-viewpanel', 'section'); el.id = 'gd-view-panel'; el.hidden = !_gh.viewOpen; el.setAttribute('aria-label', 'View and controls');
  if (!el.firstChild) el.innerHTML = `<div class="gd-map-head"><b>View & controls</b><button type="button" data-view-close aria-label="Close view controls">${icon('x')}</button></div><div class="gd-camera-row"><button type="button" data-viewcam="in">${icon('plus')}<span>Closer</span></button><button type="button" data-viewcam="out">${icon('minus')}<span>Further</span></button><button type="button" data-viewcam="fit">${icon('maximize')}<span>Fit</span></button><button type="button" data-viewcam="me">${icon('locate-fixed')}<span>Follow</span></button></div><dl class="gd-control-list"><dt>Walk</dt><dd>Click or tap a spot; WASD or arrows.</dd><dt>Interact</dt><dd><kbd>E</kbd> or <kbd>Space</kbd></dd><dt>Tools / bag</dt><dd><kbd>1–5</kbd> / <kbd>B</kbd></dd><dt>Camera</dt><dd>Wheel or pinch; <kbd>+ −</kbd>, <kbd>F</kbd> Fit, <kbd>C</kbd> Follow.</dd><dt>Moves</dt><dd><kbd>Q</kbd>; friends and photos are in Menu.</dd></dl><button type="button" class="gd-view-help" data-view-help>More help</button>`;
  if (!el._gdBound) { el._gdBound = true; el.addEventListener('click', ev => { if (ev.target.closest('[data-view-close]')) { _ghClosePanels(box); _ghFocusStage(box); return; } if (ev.target.closest('[data-view-help]')) { _ghClosePanels(box); gardenGuideOpen(); return; } const b = ev.target.closest('[data-viewcam]'); if (!b) return; const k = b.dataset.viewcam; if (k === 'in') gardenCamSet(null, -1); else if (k === 'out') gardenCamSet(null, 1); else gardenCamSet(k === 'fit' && gardenCamMode() !== 'fit' ? 'fit' : 'follow'); _gh.camKey = ''; _ghCameraButtons(box); }); }
  _ghCameraButtons(box);
}
function gardenHudOwnsKey(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable="true"]') || _gdpPopOpen()) return false;
  if (typeof _pe !== 'undefined' && _pe.wheel && _pe.wheel.isConnected && (ev.key === 'Escape' || ev.key.toLowerCase() === 'q')) return true;
  if (_gh.bag && (ev.key === 'Escape' || /^[1-9]$/.test(ev.key) || ev.key.toLowerCase() === 'b' || ev.key.toLowerCase() === 'q')) return true;
  return _gh.menuOpen && /^Arrow(Left|Right|Up|Down)$/.test(ev.key) || ev.key === 'Escape' && (_gh.menuOpen || _gh.miniOpen || _gh.viewOpen || _gh.statusOpen) && !_gwFishBusy() && !_gw.netting;
}
function _ghUiBind(box) {
  box.classList.add('gd-ui-clean'); box.dataset.gardenUi = 'simple'; if (box._ghUiBound) return; box._ghUiBound = true;
  box.addEventListener('pointerdown', ev => { if (!ev.target.closest('.gd-menu,.gd-hud,.gd-mini,.gd-viewtools,.gd-viewpanel')) _ghClosePanels(box); }, true);
  box.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest('input,textarea,select,[contenteditable="true"]') || _gdpPopOpen()) return;
    if (typeof _pe !== 'undefined' && _pe.wheel && _pe.wheel.isConnected && (ev.key === 'Escape' || ev.key.toLowerCase() === 'q')) {
      if (ev.key === 'Escape' && (_gwFishBusy() || _gw.netting)) { _gdpKey(ev); return; }
      ev.preventDefault(); ev.stopPropagation(); gartEmoteWheel(); return;
    }
    if (_gh.bag && (ev.key === 'Escape' || ev.key.toLowerCase() === 'b')) {
      if (ev.key === 'Escape' && (_gwFishBusy() || _gw.netting)) { _gdpKey(ev); return; }
      ev.preventDefault(); ev.stopPropagation(); _ghCloseBag(box); return;
    }
    if (_gh.bag && (/^[1-9]$/.test(ev.key) || ev.key.toLowerCase() === 'q')) {
      ev.preventDefault(); ev.stopPropagation(); _ghCloseBag(box);
      if (/^[1-9]$/.test(ev.key)) gardenSlotKey(Number(ev.key)); else if (typeof gartEmoteWheel === 'function') gartEmoteWheel();
      return;
    }
    if (ev.key === 'Escape' && (_gh.menuOpen || _gh.miniOpen || _gh.viewOpen || _gh.statusOpen) && !_gwFishBusy() && !_gw.netting) { ev.preventDefault(); ev.stopPropagation(); _ghClosePanels(box, true); return; }
    if (ev.key.toLowerCase() === 'm' || ev.key === '?') { ev.preventDefault(); ev.stopPropagation(); _ghToggleView(ev.key === '?' ? 'view' : 'map', box); return; }
    if (_gh.menuOpen && ev.key.startsWith('Arrow')) { const buttons = [...box.querySelectorAll('.gd-mlist button')], i = buttons.indexOf(document.activeElement), delta = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowUp' ? -2 : ev.key === 'ArrowDown' ? 2 : 1; if (buttons.length) { ev.preventDefault(); ev.stopPropagation(); buttons[Math.max(0, Math.min(buttons.length - 1, i < 0 ? 0 : i + delta))].focus(); } }
  }, true);
}

/* ---------- what needs me today ---------- */
const GH_NEED_MARKS = 3;
function _ghNeeds(m) {
  if (!_gdp.svg) return;
  const layer = _gdp.svg.querySelector('.gd-actors'); if (!layer) return;
  let g = layer.querySelector(':scope > .gd-needs');
  const nativeWorld = window.GardenNative && GardenNative.world(), groundNeeds = !!(nativeWorld && nativeWorld.rootNode === _gdp.svg && typeof nativeWorld.syncNeedRings === 'function');
  const W = GARDEN_WORLD, list = m.plants.filter(p => p.def.special !== 'heart' && (p.ripe || (p.thirsty && p.def.thirst && !m.rain.now)) && (!m.visit || gardenVisitWants(p))).slice(0, 60);
  // a full bed must not disappear under marks: every plant that wants you gets a soft ring on the ground, and only the few nearest you get a mark above it
  const far = (p) => Math.hypot((p.x + p.fp / 2) - _gw.px, ((p.y + p.fp) - _gw.py) * 0.8);
  const near = new Set(list.slice().sort((a, b) => far(a) - far(b)).slice(0, GH_NEED_MARKS).map(p => p.uid));
  const key = list.map(p => p.uid + (p.ripe ? 'r' : 't') + (near.has(p.uid) ? '!' : '')).join(',') + (groundNeeds && list.length ? '|ground' : '');
  // World-owned ground rings are separate from the nearest badge annotations.
  // Reconcile before the badge memo return; a moved plant keeps its ring cache.
  if (groundNeeds) nativeWorld.syncNeedRings(list.map(p => ({ key: p.uid + (p.ripe ? 'r' : 't'), x: (p.x + p.fp / 2) * W.cellW, y: W.sky + (p.y + p.fp) * W.cellH - 3, rx: 12 + p.fp * 7, ry: 4 + p.fp * 2.4, fill: p.ripe ? '#ffd24a' : '#62c2ff' })));
  const annotations = groundNeeds ? list.filter(p => near.has(p.uid)) : list;
  _gh.needsAt = { x: _gw.px, y: _gw.py };
  if (g && _gh.needs === key) return;
  _gh.needs = key;
  if (!g) { g = gardenSceneElement('g'); g.setAttribute('class', 'gd-needs'); layer.insertBefore(g, layer.firstChild); }
  // only the marks that changed: writing them all again restarted every ring and mark in view each time the nearest few changed, which is every few steps
  const have = new Map(); for (const c of g.children) have.set(c.getAttribute('data-k'), c);
  const keyOf = (p) => p.uid + (p.ripe ? 'r' : 't') + (near.has(p.uid) ? '!' : '') + (groundNeeds ? '|ground' : '');
  const draw = (p, i) => {
    const x = (p.x + p.fp / 2) * W.cellW, foot = W.sky + (p.y + p.fp) * W.cellH - 3, h = Math.max(22, Math.min(92, 64 * ((p.def.look && p.def.look.h) || 0.7) * 0.75 * (0.45 + p.stage * 0.14)));
    const ripe = p.ripe, ring = groundNeeds ? '' : `<ellipse class="gd-need-ring" rx="${(12 + p.fp * 7)}" ry="${(4 + p.fp * 2.4)}" fill="${ripe ? '#ffd24a' : '#62c2ff'}"/>`;
    if (!near.has(p.uid)) return `<g transform="translate(${x.toFixed(1)} ${foot.toFixed(1)})">${ring}</g>`;
    let top = -h - 9;
    try { const n = _ghNodeOf(p.uid); if (n && n._ghTop === undefined) { const b = n.getBBox ? n.getBBox() : null; n._ghTop = b && b.height > 1 ? Math.max(-118, b.y * 0.75 - 9) : null; } if (n && n._ghTop != null) top = n._ghTop; } catch (e) { /* the estimate will do */ }   // (once per plant: asking forces the whole page's layout)
    return `<g transform="translate(${x.toFixed(1)} ${foot.toFixed(1)})">${ring}<g transform="translate(0 ${top.toFixed(1)})"><g class="gd-need-b" style="--i:${i % 5}"><circle r="6" fill="#fff" stroke="${ripe ? '#c88a08' : '#2c7ab0'}" stroke-width="1.200"/>${ripe ? '<path transform="scale(.74)" d="M0 -5.200l1.500 3.700 3.700 1.500-3.700 1.500L0 5.200l-1.500-3.700-3.700-1.500 3.700-1.500z" fill="#f2a60c"/>' : '<path transform="scale(.74)" d="M0 -5.400c2.500 3.300 3.800 5 3.800 6.800a3.800 3.800 0 0 1-7.600 0c0-1.800 1.300-3.500 3.800-6.800z" fill="#3b9ad8"/>'}</g></g></g>`;
  };
  const fresh = []; list.forEach((p, i) => { if (groundNeeds && !near.has(p.uid)) return; const k = keyOf(p); if (!have.has(k)) fresh.push([k, draw(p, i)]); });
  const parsed = _gdrParse(fresh.map(f => f[1]).join(''));
  parsed.forEach((n, i) => {
    n.setAttribute('data-k', fresh[i][0]); have.set(fresh[i][0], n);
    const tm = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(n.getAttribute('transform') || '');   // where it is, for what is drawn following the view (94-garden-art-h-life.js), without asking the page
    if (tm) n._gartBox = { x: +tm[1] - 40, y: +tm[2] - 130, w: 80, h: 145 };
  });
  if (fresh.length) _gdp.svg._gartAux = null;
  let ref = g.firstChild;
  for (const p of annotations) { const n = have.get(keyOf(p)); if (n === ref) ref = ref.nextSibling; else g.insertBefore(n, ref); }
  while (ref) { const nx = ref.nextSibling; ref.remove(); ref = nx; }
  // Only fresh, attached static rings enroll in the existing shared cache.
  // Badge siblings keep their own animation and nearest-mark lifetime.
  const nativeScene = window.GardenNative && GardenNative.scene();
  if (!groundNeeds && nativeScene && window.GardenNativeArt) for (const n of parsed) {
    const ring = n.querySelector(':scope > .gd-need-ring');
    if (ring && ring.target && ring.isConnected && ring.scene === nativeScene) {
      GardenNativeArt.cache(ring, { staticOnly: false, quality: 1, adaptive: true, crop: false, tileSize: 512 });
    }
  }
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
    if (it.text) { b.classList.add('has-text'); b.appendChild(document.createTextNode(it.text)); }
    else if (it.label) { b.classList.add('has-label'); b.appendChild(_gdpEl('span', 'gd-bub-l', String(it.label).split(':')[0])); }   // (a word under the picture: not everyone reads a picture)   // (words on the button, where a picture would not say it)
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
  items.push({ svg: _GH_GLYPH.feed, label: 'Compost: half a day of growth', n: gardenHas('fertiliser'), cls: gardenHas('fertiliser') ? '' : 'is-off', run: (b) => { const r = gardenFeed(p.uid); if (r && !r.ok) gameDenyOf(r, b); } });
  if (p.stage >= 3) items.push({ svg: _GH_GLYPH.trim, label: 'Trim', cls: p.overgrown ? 'is-go' : '', run: () => _ghDoTo(p.uid, gardenPrune(p.uid)) });
  items.push({ ic: 'move', label: 'Move', run: () => gardenMoveStart(p.uid, 'plant') });
  items.push({ svg: _GH_GLYPH.dig, label: 'Dig up', run: () => { _ghDoTo(p.uid, gardenDig(p.uid)); _gdp.sel = ''; } });
  const a = gardenStageName(def, p.stage);
  gardenBubbleOpen({ x: p.x + p.fp / 2, y: p.y - 0.4 - 0.5 * p.stage / 4 }, { title: def.name, sub: m.visit ? gardenVisitPlantLine(p, a) : p.ripe ? 'Ready' : p.nextIn ? `${a} · ${_gdHoursLabel(p.nextIn)}` : a, items });
}
function gardenDecorBubble(d, m) {
  const def = d.def, items = [], ci = gardenCollectInfo(d.uid, m);
  if (def.effect && def.effect.kind === 'sit' && typeof gardenWonderSeatItem === 'function') items.push(gardenWonderSeatItem(d));
  if (ci) items.push({ ic: 'gift', label: ci.ready ? ci.label : ci.soon, cls: ci.ready ? 'is-go' : 'is-off', run: (b) => { const r = gardenCollect(d.uid); if (r && !r.ok) gameDenyOf(r, b); } });
  if (m.visit) { gardenVisitDecorBubble(d, m, items); gardenBubbleOpen({ x: d.x + (def.w || 1) / 2, y: d.y - 0.5 }, { title: def.name, sub: gardenVisitDecorLine(d), items }); return; }
  if (def.effect && def.effect.kind === 'play' && typeof gardenPlayBubble === 'function') gardenPlayBubble(d, items);
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
  const a = info.def, K = GARDEN_LAND_KINDS[a.kind], D = gardenLandDoor(a);
  const items = [{ svg: _GH_GLYPH.coin, label: `Buy for ${_gdpNum(info.cost)} coins`, n: _gdpNum(info.cost), cls: 'is-go is-buy', run: (b) => {
    const r = gardenBuyLand(id);
    if (!r.ok) { gameDenyOf(r, b); return; }
    gameCheer(b, { text: '-' + info.cost, tone: 'coin', sound: true });
  } }];
  gardenBubbleOpen({ x: D ? D.fx + 0.5 : a.x + a.w / 2, y: D ? D.fy : a.y }, { title: a.name, sub: `${K.name}: ${gardenLandGrowsLine(a)}. ${K.says || ''}`.trim(), items, cls: 'is-land' });
}
/** A click on land that is not yours. A section you can buy: you walk to it and the price opens there. Otherwise: a padlock, and it says what is needed. */
function gardenLandClick(id, ev) {
  const a = gardenArea(id), at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null; if (!a) return;
  if (a.solid) { gameDeny(null, { at, say: 'Too thick to walk through.' }); return; }
  const m = gardenHere();
  if (m.visit) { gameDeny(null, { kind: 'lock', at, say: 'That land is not open in this garden.' }); return; }
  if (!a.buy) { gameDeny(null, { kind: 'lock', badge: 'Lv ' + a.lv, at, say: `${a.name} opens at garden level ${a.lv}.` }); return; }
  if (m.level.level < a.lv) { gameDeny(null, { kind: 'lock', badge: 'Lv ' + a.lv, at, say: `${a.name} can be bought from garden level ${a.lv}.` }); return; }
  const info = gardenLandInfo(id, m), D = gardenLandDoor(a);
  if (!info || !D) return;
  if (!info.reach) { const t = gardenLandRow(a.via); gameDeny(null, { kind: 'lock', badge: 'Lv ' + t.lv, at, say: `The way to ${a.name} is ${t.name}: it opens at garden level ${t.lv}.` }); return; }
  if (!info.keyOk) { gameDeny(null, { kind: 'lock', at, say: `${a.name} has a rusty gate. Keep digging: somebody lost a key.` }); return; }
  if (!gardenWalkToPoint({ x: D.x + 0.5, y: D.y + 0.5 }, () => gardenLandBubble(id, gardenHere()), { radius: 2 })) gameDeny(null, { at, say: 'You cannot get there.' });
}
/** Pick up something already in the garden: it follows the pointer as a ghost until you click somewhere it can go. */
function gardenMoveStart(uid, kind) {
  gardenBubbleClose();
  const m = gardenHere(), item = kind === 'decor' || kind === 'plant' ? gardenPlacementItem(m, kind, uid) : null;
  if (!item || item.pend) return false;
  if (typeof gardenVisitMayMove === 'function' && !gardenVisitMayMove(uid)) return;
  if (_gdp.moving) gardenMoveEnd();
  _gdp.moving = { uid, kind, id: item.def.id, originX: item.x, originY: item.y, packed: !!item.packed, visitId: m.visit ? m.visit.fid : '' };
  const box = _ghBox(); if (box) box.focus({ preventScroll: true });
  const n = _ghNodeOf(uid); if (n) n.classList.add('is-lifted');
  if (box) box.dataset.placing = '1';
  _gh.bar = ''; if (box) _ghBar(box, m);
  if (typeof _gdpGhost === 'function') _gdpGhost(m, item.def, kind, item.x, item.y, uid);
  if (typeof _gdpPlacementFeedback === 'function') _gdpPlacementFeedback('lift', item, kind);
  return true;
}
function gardenMoveEnd() {
  if (!_gdp.moving) return;
  const n = _ghNodeOf(_gdp.moving.uid); if (n) n.classList.remove('is-lifted');
  _gdp.moving = null;
  _gdpGhostClear();
  _gh.bar = ''; const box = _ghBox(); if (box) { box.dataset.placing = ''; _ghBar(box, gardenHere()); }
}
/** A live result or a synced save may replace the thing under an active lift. */
function _ghPlacementReconcile(m) {
  const moving = _gdp.moving;
  if (moving) {
    const item = gardenPlacementItem(m, moving.kind, moving.uid);
    if (!item || item.pend || item.def.id !== moving.id || item.x !== moving.originX || item.y !== moving.originY || !!item.packed !== moving.packed || (m.visit ? m.visit.fid : '') !== moving.visitId || m.visit && typeof gardenVisitMay === 'function' && !gardenVisitMay('move', item)) gardenMoveEnd();
    else { const node = _ghNodeOf(moving.uid); if (node) node.classList.add('is-lifted'); }
  }
  if (_gdp.sel && !gardenPlantById(m, _gdp.sel) && !gardenDecorById(m, _gdp.sel)) {
    _gdp.sel = ''; if (typeof _gdpHighlight === 'function') _gdpHighlight(null); if (typeof gardenHoverCardHide === 'function') gardenHoverCardHide(); gardenBubbleClose();
  }
}

/* ---------- a small first-use walking tip; full controls stay on demand ---------- */
function _ghWalkHint() {
  const box = _ghBox(); if (!box) return;
  const seen = !!_gdG().seen.walked;
  let el = box.querySelector(':scope > .gd-walkhint');
  if (seen) { if (el) el.remove(); _gh.hint = false; _gh.walkOrigin = null; return; }
  if (el) { _gh.hint = true; if (!_gh.walkOrigin) _gh.walkOrigin = { x: _gw.px, y: _gw.py }; return; }
  el = document.createElement('div'); el.className = 'gd-walkhint'; el.setAttribute('role', 'note');
  el.innerHTML = '<span>Click or tap a spot to walk. Controls are in <b>View</b>.</span><button type="button" aria-label="Dismiss walking tip">×</button>';
  el.querySelector('button').onclick = gardenWalkedOnce;
  box.appendChild(el);
  _gh.hint = true; _gh.walkOrigin = { x: _gw.px, y: _gw.py };
}
/** You have walked: the hint has done its job. */
function gardenWalkedOnce() {
  if (!_gh.hint) return;
  _gh.hint = false; _gh.walkOrigin = null;
  const g = _gdG(); if (!g.seen.walked) { g.seen.walked = _gdToday(); if (typeof state !== 'undefined') state._localDirty = true; if (typeof saveUI === 'function') saveUI(); if (typeof schedulePersist === 'function') schedulePersist(); }
  const box = _ghBox(), el = box && box.querySelector(':scope > .gd-walkhint');
  if (el) el.remove();
}

/* ---------- paint and frame ---------- */
function gardenHudPaint(m) {
  const box = _ghBox(); if (!box) return;
  _ghUiBind(box);
  _ghPlacementReconcile(m);
  _ghHud(box, m); _ghMenu(box, m); _ghBar(box, m); _ghQuick(box, m); _ghViewTools(box); _ghMini(box, m); if (_gh.viewOpen) _ghViewPanel(box); else { const p = box.querySelector(':scope > .gd-viewpanel'); if (p) p.hidden = true; } _ghNeeds(m); _ghWalkHint();
  gardenLandsPaint(m);   // today's dig spot, the forage, the weekend cart
  if (typeof gardenVisitTagPaint === 'function') gardenVisitTagPaint(box, m);
  if (typeof gardenLiveGoalPaint === 'function') gardenLiveGoalPaint(box);   // a shared goal in a live garden (94-garden-live-7goal.js)
  if (typeof gardenPlayHud === 'function') gardenPlayHud(box, m);   // play: pets coming home, secrets (94-garden-play-0kit.js)
  if (_gh.bag) _ghBag();
  if (typeof _gdpDecorationPainted === 'function') _gdpDecorationPainted(m);
  _gh.frameEls = null; _gh.framePose = null;
}
function gardenHudReset() { Object.assign(_gh, { hud: '', menu: '', bar: '', quick: '', mini: '', needs: '', bubble: null, bag: false, menuOpen: false, statusOpen: false, miniOpen: false, viewOpen: false, arrow: null, hint: false, walkOrigin: null, dot: '', camKey: '', frameEls: null, framePose: null }); }
function gardenHudFrame(force) {
  const box = _gw.box; if (!box) return;
  // Native routes return before the Classic walked-once callback. Actual
  // displacement catches pointer, keyboard and touch walking on either owner.
  if (_gh.hint && _gh.walkOrigin && Math.hypot(_gw.px - _gh.walkOrigin.x, _gw.py - _gh.walkOrigin.y) > .15) gardenWalkedOnce();
  if (_gh.viewOpen) _ghCameraButtons(box);
  // you walked on: the marks follow you to whatever is nearest now
  if (_gh.needsAt && _gh.needs && Math.hypot(_gw.px - _gh.needsAt.x, _gw.py - _gh.needsAt.y) > 2.5) _ghNeeds(gardenHere());
  const B = _gh.bubble;
  const c = _gw.cam, size = _gw.size, previous = _gh.framePose;
  if (!force && previous && previous.box === box && previous.bubble === B && previous.arrow === _gh.arrow && previous.x === _gw.px && previous.y === _gw.py && previous.cx === c.x && previous.cy === c.y && previous.cw === c.w && previous.ch === c.h && previous.sw === size.w && previous.sh === size.h) return;
  if (!previous) _gh.framePose = {};
  Object.assign(_gh.framePose, { box, bubble: B, arrow: _gh.arrow, x: _gw.px, y: _gw.py, cx: c.x, cy: c.y, cw: c.w, ch: c.h, sw: size.w, sh: size.h });
  // HUD elements are replaced by gardenHudPaint, never by walking. Cache the
  // handles once so camera updates do not search the page on every frame.
  let refs = _gh.frameEls;
  if (!refs || refs.box !== box) {
    const mini = box.querySelector(':scope > .gd-mini');
    refs = _gh.frameEls = { box, arrow: box.querySelector(':scope > .gd-arrow'), me: mini && mini.querySelector('.gd-mini-me'), view: mini && mini.querySelector('.gd-mini-view'), meKey: '', viewKey: '' };
  }
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
    const el = refs.arrow, p = _ghProject(_gh.arrow.x, _gh.arrow.y);
    if (el && p) { const k = Math.round(p.x) + ',' + Math.round(p.y); if (el._k !== k) { el._k = k; el.style.transform = `translate(${Math.round(p.x) - 20}px, ${Math.round(p.y) - 60}px)`; } }
  }
  const me = refs.me, view = refs.view, W = GARDEN_WORLD;
  if (me) {
    const k = _gw.px.toFixed(1) + ',' + _gw.py.toFixed(1);
    if (force || refs.meKey !== k) {
      refs.meKey = k;
      me.setAttribute('cx', _gw.px.toFixed(1)); me.setAttribute('cy', _gw.py.toFixed(1));
    }
  }
  if (view) {
    const x = (c.x / W.cellW).toFixed(1), y = Math.max(0, (c.y - W.sky) / W.cellH).toFixed(1), width = (c.w / W.cellW).toFixed(1), height = (c.h / W.cellH).toFixed(1), k = x + ',' + y + ',' + width + ',' + height;
    if (force || refs.viewKey !== k) { refs.viewKey = k; view.setAttribute('x', x); view.setAttribute('y', y); view.setAttribute('width', width); view.setAttribute('height', height); }
  }
}
