/* ============================================================
   GARDEN, the page (2.18, agent 'garden-engine'): #view=garden and its tabs
   garden:shop, garden:almanac, garden:basket (94-garden-5extras.js draws those
   three, the photo mode and the time-lapse).

   THE GARDEN TAB
     the header      your level and XP, coins, water left in the can, fertiliser
     today           the three daily garden tasks and the week's three quests (they pay
                     out by themselves when done), the weather's note, who is visiting
     the stage       the whole garden (gardenSceneSvg), patched in place so nothing jumps
     modes           View (calm: no grid, no tools; click a plant to read about it),
                     Tend (tools: Hand, Water, Seeds, Feed, Trim, Dig; drag the can or a
                     seed across the beds), Decorate (place from your bag, drag to move,
                     R turns, S restyles, Delete puts it back in your bag)
     trays           your seeds (Tend) and decorations (Decorate): click to pick, or drag
                     one onto the garden
     the inspector   what you selected: its stage, when it next grows, thirst, and every
                     action for it; decorations say what they do (and Collect)
     quick actions   Water all, Harvest all, Undo (Ctrl+Z here), Photo, Time-lapse
   Keyboard on the stage: arrows move a cell cursor, Enter uses the tool there, 1-6 tools,
   W water all, H harvest all, R / S / Delete in Decorate, Esc clears. Every action has Undo;
   nothing asks "are you sure". Text from the catalogue goes in with textContent or esc().
   ============================================================ */
const GARDEN_TABS = Object.freeze([['garden', 'Garden', 'sprout'], ['shop', 'Shop', 'store'], ['almanac', 'Almanac', 'book-open'], ['basket', 'Basket', 'shopping-basket'],
  ['friends', 'Friends', 'users']]);   // 'friends': ── garden-social ── friends' gardens, visits and your guestbook (94-garden-social-2visit.js)
const GARDEN_TOOLS_UI = Object.freeze([
  ['hand', 'Hand', 'hand', 'Look, pick what is ripe, collect from the hive and the compost'],
  ['water', 'Water', 'droplet', 'Water a plant, or drag across the beds'],
  ['seed', 'Plant', 'sprout', 'Plant the seed picked below: click a free cell, or drag along a row'],
  ['feed', 'Feed', 'flask-conical', 'Half a day’s growth (one feed a day each)'],
  ['trim', 'Trim', 'scissors', 'Tidy a plant that has gone a bit wild: sometimes you get a cutting'],
  ['dig', 'Dig up', 'shovel', 'Lift a plant (Undo puts it back)'],
]);
const _gdp = { entry: '', root: null, svg: null, mode: '', tool: '', seed: '', decor: '', sel: '', hoverUid: '', cur: null,
  press: null, sweep: null, carry: null, keyBound: false, burstT: 0, wasVisible: false };

function _gdpTab(v) { const m = /^garden:([a-z]+)$/.exec(String(v || '')); const t = m ? m[1] : 'garden'; return GARDEN_TABS.some(x => x[0] === t) ? t : 'garden'; }
function _gdpPrefs() { const g = _gdG(); return g.prefs; }
function _gdpMode() { return _gdp.mode || _gdpPrefs().mode || 'tend'; }
function _gdpTool() { return _gdp.tool || _gdpPrefs().tool || 'hand'; }
function _gdpSetPref(k, v) { const p = _gdpPrefs(); if (p[k] === v) return; p[k] = v; if (typeof saveUI === 'function') saveUI(); }
function _gdpEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _gdpBtn(label, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn ' + (o.kind || 'btn-secondary') + (o.sm !== false ? ' btn-sm' : '') + (o.cls ? ' ' + o.cls : '');
  b.innerHTML = (o.icon ? icon(o.icon) : '') + (label ? `<span>${esc(label)}</span>` : '');
  if (o.tip) b.setAttribute('data-tip', o.tip);
  if (o.aria) b.setAttribute('aria-label', o.aria);
  if (o.disabled) b.disabled = true;
  if (o.run) b.onclick = (e) => { e.stopPropagation(); o.run(e); };
  return b;
}
function _gdpNum(n) { try { return Number(n).toLocaleString(); } catch (e) { return String(n); } }
/** One plain line: an action's answer, as a calm toast (never a dialog). */
function _gdpSay(r) { if (r && !r.ok && r.msg && typeof toast === 'function') toast(r.msg, { icon: 'sprout', timeout: 3200 }); return r; }

/* ---------- the section, the sidebar, the palette ---------- */
registerSection('garden', {
  match: v => v === 'garden' || /^garden:(shop|almanac|basket|friends)$/.test(String(v || '')),
  title: () => 'Garden',
  crumb: v => (_gdpTab(v) === 'garden' ? [] : [GARDEN_TABS.find(t => t[0] === _gdpTab(v))[1]]),
  group: 'home', layout: 'page', hashable: true, taskControls: false, icon: 'sprout',
  mount(container, view) { _gdpMount(container, view || state.view); },
  unmount() { _gdp.entry = ''; _gdp.root = null; _gdp.svg = null; _gdp.press = null; _gdp.sweep = null; _gdpCarryEnd(); },
});
/* Home's sidebar: a 'Fun' heading with the Garden (and the Game page while the Fun level is on). Other modules may add
   rows through gardenFunNavAdd({id, order, label, icon, view, when}) (agent pets, for example). */
const _GDP_FUN_ROWS = [];
function gardenFunNavAdd(row) { if (row && row.id && !_GDP_FUN_ROWS.some(r => r.id === row.id)) { _GDP_FUN_ROWS.push(row); _GDP_FUN_ROWS.sort((a, b) => (a.order || 50) - (b.order || 50)); } }
registerSidebarBlock('home', {
  id: 'fun-nav', order: 13.5, label: 'Fun',
  render(el, ctx) {
    if (gardenFun() === 'off') return false;   // like the Game row: the Fun level Off hides it (the palette and #view=garden still work)
    el.appendChild(sbSection({ title: 'Fun' }));
    let ready = 0;
    try { if (state.garden && state.garden.since) { const m = gardenModel(); ready = m.ripe; } } catch (e) { ready = 0; }
    el.appendChild(sbNavItem({ label: 'Garden', icon: 'sprout', view: 'garden', active: /^garden(:|$)/.test(String(state.view || '')), count: ready || '', title: ready ? `${ready} ready to pick` : 'Your garden' }));
    if (typeof sbGameRowOn === 'function' && sbGameRowOn()) el.appendChild(sbNavItem({ label: 'Game', icon: 'gamepad-2', view: 'game', title: 'Levels, streaks, quests and records' }));
    for (const r of _GDP_FUN_ROWS) { try { if (r.when && !r.when()) continue; el.appendChild(sbNavItem({ label: r.label, icon: r.icon || 'sparkles', view: r.view, active: state.view === r.view })); } catch (e) { /* another module's row */ } }
    void ctx;
  },
});
registerCommand({ id: 'garden-open', group: 'Go to', label: 'Garden', icon: 'sprout', keywords: 'garden plants grow flowers seeds water harvest game fun', run: () => setView('garden') });
registerCommand({ id: 'garden-water', label: 'Water the garden', icon: 'droplets', keywords: 'garden water plants can thirsty', run: () => { gardenEnsure(); const r = gardenWaterAll(); _gdpSay(r); } });
registerCommand({ id: 'garden-harvest', label: 'Harvest everything that is ready', icon: 'shopping-basket', keywords: 'garden harvest pick ripe fruit veg flowers basket', run: () => { gardenEnsure(); _gdpSay(gardenHarvestAll()); } });
registerCommand({ id: 'garden-shop', label: 'Garden shop', icon: 'store', keywords: 'garden shop seeds decorations buy tools', run: () => setView('garden:shop') });
registerCommand({ id: 'garden-almanac', label: 'Garden almanac and ribbons', icon: 'book-open', keywords: 'garden almanac collection plants visitors ribbons discovered', run: () => setView('garden:almanac') });
registerCommand({ id: 'garden-basket', label: 'Garden basket and bouquets', icon: 'shopping-basket', keywords: 'garden basket harvest sell market bouquet', run: () => setView('garden:basket') });
registerCommand({ id: 'garden-photo', label: 'Take a photo of the garden', icon: 'camera', keywords: 'garden photo picture image png', run: () => { gardenEnsure(); if (typeof gardenPhotoOpen === 'function') gardenPhotoOpen(); } });
registerCommand({ id: 'garden-timelapse', label: 'Garden time-lapse', icon: 'film', keywords: 'garden time lapse history growth replay', run: () => { gardenEnsure(); if (typeof gardenTimelapseOpen === 'function') gardenTimelapseOpen(); } });

/* ---------- mount ---------- */
function _gdpMount(container, view) {
  if (!gardenEnsure()) {
    // the state is still loading (a new browser): a calm moment, then the real garden (gardenEnsure renders again)
    mountEmptyState(container, { icon: 'sprout', title: 'Your garden is waking up', text: 'Reading your history so everything you have grown comes with you.' });
    return;
  }
  const tab = _gdpTab(view), entering = _gdp.entry !== view;
  _gdp.entry = view;
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = 'Everything you finish grows here. Nothing ever wilts.';
  const m = gardenModel();
  const root = _gdpEl('div', 'gd-page gd-tab-' + tab + (entering ? ' is-enter' : '') + (gardenFun() === 'off' ? ' is-funoff' : ''));
  root.appendChild(_gdpHead(m));
  const tabs = _gdpEl('div', 'gd-tabs'); tabs.setAttribute('role', 'tablist');
  for (const [id, label, ic] of GARDEN_TABS) {
    const b = _gdpEl('button', 'gd-tabbtn'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
    const on = id === tab;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) b.setAttribute('aria-current', 'page');
    b.dataset.tab = id;
    if (id === 'basket') { const n = _gdpBasketCount(m); if (n) b.appendChild(_gdpEl('span', 'gd-tabn', String(n))); }
    if (id === 'friends' && typeof gardenSocialBadge === 'function') { const n = gardenSocialBadge(); if (n) b.appendChild(_gdpEl('span', 'gd-tabn', String(n))); }
    b.onclick = () => { const v = id === 'garden' ? 'garden' : 'garden:' + id; if (state.view === v) { const mm = document.getElementById('main'); if (mm && mm.scrollTop > 0) mm.scrollTo({ top: 0, behavior: 'smooth' }); return; } setView(v); };
    tabs.appendChild(b);
  }
  root.appendChild(tabs);
  const body = _gdpEl('div', 'gd-body');
  root.appendChild(body);
  container.appendChild(root);
  _gdp.root = root;
  if (tab === 'garden') _gdpGardenTab(body, m);
  else if (tab === 'shop' && typeof gardenShopTab === 'function') gardenShopTab(body, m);
  else if (tab === 'almanac' && typeof gardenAlmanacTab === 'function') gardenAlmanacTab(body, m);
  else if (tab === 'basket' && typeof gardenBasketTab === 'function') gardenBasketTab(body, m);
  else if (tab === 'friends' && typeof gardenFriendsTab === 'function') gardenFriendsTab(body, m);
  _gdpBindKeys();
  gardenTickSoon(400);
}
function _gdpBasketCount(m) { let n = 0; for (const [k, v] of Object.entries(m.wallet.items)) if (v > 0 && (k.startsWith('crop:') || k.startsWith('bq:') || k === 'honey')) n += v; return n; }
/** Everything that shows the garden, brought up to date (the engine calls this after every change). */
function _gdpRepaint() {
  if (!_gdp.root || !_gdp.root.isConnected) return;
  const tab = _gdpTab(state.view);
  const m = gardenModel();
  const head = _gdp.root.querySelector('.gd-head');
  if (head) head.replaceWith(_gdpHead(m));
  const bt = _gdp.root.querySelector('.gd-tabbtn[data-tab="basket"]');
  if (bt) { const n = _gdpBasketCount(m); let c = bt.querySelector('.gd-tabn'); if (!n && c) c.remove(); else if (n) { if (!c) bt.appendChild(c = _gdpEl('span', 'gd-tabn')); c.textContent = String(n); } }
  if (tab === 'garden') { const bar = _gdp.root.querySelector('.gd-toolbar'); if (bar) bar.replaceWith(_gdpToolbar(m)); _gdpPaintStage(m); _gdpPaintSide(m); }
  else {
    const body = _gdp.root.querySelector('.gd-body');
    const typing = document.activeElement && body && body.contains(document.activeElement) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (tab === 'friends') { if (typeof gardenFriendsTabRepaint === 'function') gardenFriendsTabRepaint(m); }   // its own repaint (it keeps friends' gardens drawn)
    else if (body && !typing) { const y = (document.getElementById('main') || {}).scrollTop; body.textContent = ''; if (tab === 'shop') gardenShopTab(body, m); else if (tab === 'almanac') gardenAlmanacTab(body, m); else if (tab === 'basket') gardenBasketTab(body, m); const mm = document.getElementById('main'); if (mm && y != null) mm.scrollTop = y; }
  }
}

/* ---------- the header ---------- */
function _gdpHead(m) {
  const w = m.wallet, lv = w.level;
  const head = _gdpEl('div', 'gd-head');
  const l = _gdpEl('div', 'gd-head-l');
  l.innerHTML = `<div class="overline">Fun</div><h1>Your garden</h1>`;
  const lvl = _gdpEl('div', 'gd-level');
  lvl.innerHTML = `<span class="gd-lv-n">${icon('sprout')}<b></b></span><span class="gd-lv-t"></span><span class="gd-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></span><span class="gd-lv-x muted"></span>`;
  lvl.querySelector('b').textContent = 'Level ' + lv.level;
  lvl.querySelector('.gd-lv-t').textContent = lv.title;
  lvl.querySelector('.gd-xpbar').setAttribute('aria-valuenow', String(Math.round(lv.pct * 100)));
  lvl.querySelector('.gd-xpbar i').style.width = Math.round(lv.pct * 100) + '%';
  lvl.querySelector('.gd-lv-x').textContent = `${_gdpNum(lv.into)} of ${_gdpNum(lv.need)} XP`;
  const nextArea = GARDEN_AREAS.find(a => a.lv > lv.level);
  if (nextArea) lvl.setAttribute('data-tip', `Level ${nextArea.lv} opens the ${nextArea.name.toLowerCase()}`);
  l.appendChild(lvl);
  head.appendChild(l);
  const r = _gdpEl('div', 'gd-head-r');
  const chip = (ic, val, label, tip, cls) => { const c = _gdpEl('span', 'gd-chip' + (cls ? ' ' + cls : '')); c.innerHTML = icon(ic) + '<b></b><span></span>'; c.querySelector('b').textContent = val; c.querySelector('span').textContent = label; if (tip) c.setAttribute('data-tip', tip); return c; };
  r.appendChild(chip('coins', _gdpNum(w.coins), 'coins', 'Earned from finished tasks, focus time, streaks, garden tasks and the market', 'is-coins'));
  const wi = m.water;
  r.appendChild(chip('droplet', wi.raining ? 'Rain' : `${wi.left}`, wi.raining ? 'is watering' : `of ${wi.cap + wi.bonus} water`, wi.raining ? 'The rain is watering everything for you' : `The can refills every morning; +2 for each task you finish today (+${wi.bonus} so far)`, 'is-water'));
  r.appendChild(chip('flask-conical', String(gardenHas('fertiliser')), 'feed', 'Fertiliser: the shop sells it, a compost bin makes it', 'is-feed'));
  head.appendChild(r);
  return head;
}

/* ---------- the garden tab ---------- */
function _gdpGardenTab(body, m) {
  const g = _gdG();
  if (!g.seen.intro) body.appendChild(_gdpWelcome(m));
  if (gardenFun() === 'off') { const off = _gdpEl('div', 'card gd-offnote'); off.innerHTML = icon('moon', 'i-sm'); off.appendChild(_gdpEl('span', null, 'The Fun level is Off: your garden is still here and still growing, quietly. Visitors and celebrations are resting.')); body.appendChild(off); }
  const today = _gdpEl('div', 'gd-today'); body.appendChild(today);
  const wrap = _gdpEl('div', 'gd-main'); body.appendChild(wrap);
  const left = _gdpEl('div', 'gd-left'); wrap.appendChild(left);
  const side = _gdpEl('aside', 'gd-side'); wrap.appendChild(side);
  left.appendChild(_gdpToolbar(m));
  const stage = _gdpEl('div', 'gd-stagebox');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'Your garden. Arrow keys move, Enter uses the tool, 1 to 6 pick a tool.');
  stage.setAttribute('role', 'application');
  const inner = _gdpEl('div', 'gd-stage');
  stage.appendChild(inner);
  stage.appendChild(_gdpEl('div', 'gd-status'));
  left.appendChild(stage);
  left.appendChild(_gdpEl('div', 'gd-tray'));
  _gdp.svg = null;
  _gdpPaintStage(m);
  _gdpPaintSide(m);
  _gdpBindStage(stage);
}
function _gdpWelcome(m) {
  const c = _gdpEl('div', 'card gd-welcome');
  const old = m.totalDone > 0;
  c.innerHTML = `<div class="gd-wel-art">${gardenIconSvg('sunflower', { kind: 'plant', px: 64 })}</div><div class="gd-wel-t"><h2></h2><p></p><p class="muted"></p></div>`;
  c.querySelector('h2').textContent = old ? 'Your garden has grown up' : 'Welcome to your garden';
  c.querySelector('p').textContent = old ? `The old oak and the flowers from your last fortnight came with you, with ${_gdpNum(m.wallet.coins)} coins for everything you have finished so far. Plant, water, pick and decorate: it is all yours now.` : 'Everything you finish grows here: tasks earn coins, seeds and water. Plant something, water it, watch it bloom, pick it and make bouquets.';
  c.querySelectorAll('p')[1].textContent = 'Nothing ever wilts. A thirsty plant only droops a little and waits for you.';
  const go = _gdpBtn('Let’s garden', { kind: 'btn-primary', icon: 'sprout', sm: false, run: () => { const g = _gdG(); g.seen.intro = _gdToday(); _gdSave(); c.remove(); } });
  c.querySelector('.gd-wel-t').appendChild(go);
  return c;
}
function _gdpToolbar(m) {
  const bar = _gdpEl('div', 'gd-toolbar');
  const mode = _gdpMode();
  const seg = _gdpEl('div', 'seg gd-modes');
  for (const [k, label, ic, tip] of [['view', 'View', 'eye', 'Calm: just look'], ['tend', 'Tend', 'hand', 'Plant, water, feed, trim and pick'], ['decorate', 'Decorate', 'armchair', 'Place and move decorations']]) {
    const b = _gdpEl('button'); b.type = 'button'; b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`; b.setAttribute('data-tip', tip);
    b.setAttribute('aria-pressed', mode === k ? 'true' : 'false');
    b.onclick = () => { if (_gdpMode() === k) return; _gdp.mode = k; _gdpSetPref('mode', k); _gdp.sel = ''; _gdp.decor = ''; _gdpRefreshChrome(); };
    seg.appendChild(b);
  }
  bar.appendChild(seg);
  if (mode === 'tend') {
    const tools = _gdpEl('div', 'gd-tools'); tools.setAttribute('role', 'toolbar'); tools.setAttribute('aria-label', 'Garden tools');
    GARDEN_TOOLS_UI.forEach(([k, label, ic, tip], i) => {
      const b = _gdpEl('button', 'gd-tool'); b.type = 'button'; b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
      b.setAttribute('data-tip', `${tip} · ${i + 1}`); b.setAttribute('aria-pressed', _gdpTool() === k ? 'true' : 'false');
      if (k === 'feed') b.appendChild(_gdpEl('i', 'gd-tooln', String(gardenHas('fertiliser'))));
      b.onclick = () => _gdpPickTool(k);
      tools.appendChild(b);
    });
    bar.appendChild(tools);
  }
  const q = _gdpEl('div', 'gd-quick');
  const thirsty = m.plants.filter(p => p.thirsty && p.def.thirst).length;
  q.appendChild(_gdpBtn(thirsty ? `Water all (${thirsty})` : 'Water all', { icon: 'droplets', tip: m.rain.now ? 'The rain is doing it' : 'Water every plant that wants it, as far as the can goes · W', disabled: m.rain.now, run: () => _gdpAct(gardenWaterAll()) }));
  q.appendChild(_gdpBtn(m.ripe ? `Harvest all (${m.ripe})` : 'Harvest all', { icon: 'shopping-basket', kind: m.ripe ? 'btn-primary' : 'btn-secondary', tip: 'Pick everything that is ready · H', disabled: !m.ripe, run: () => _gdpAct(gardenHarvestAll()) }));
  q.appendChild(_gdpBtn('', { icon: 'undo-2', aria: 'Undo', tip: 'Undo the last garden change · Ctrl+Z', disabled: !gardenCanUndo(), run: () => gardenUndo() }));
  q.appendChild(_gdpBtn('', { icon: 'camera', aria: 'Photo', tip: 'Photo mode', run: () => gardenPhotoOpen() }));
  q.appendChild(_gdpBtn('', { icon: 'film', aria: 'Time-lapse', tip: 'Your garden’s story, as a time-lapse', run: () => gardenTimelapseOpen() }));
  bar.appendChild(q);
  return bar;
}
function _gdpPickTool(k) {
  if (k === 'seed' && !_gdp.seed) { const first = _gdpSeedList()[0]; if (first) _gdp.seed = first.id; }
  _gdp.tool = k; _gdpSetPref('tool', k);
  if (k !== 'hand') _gdp.sel = _gdp.sel && k === 'hand' ? _gdp.sel : '';
  _gdpRefreshChrome();
}
/** Toolbar, tray and stage after a mode or tool change. */
function _gdpRefreshChrome() {
  if (!_gdp.root) return;
  const m = gardenModel();
  const bar = _gdp.root.querySelector('.gd-toolbar'); if (bar) bar.replaceWith(_gdpToolbar(m));
  const box = _gdp.root.querySelector('.gd-stagebox');
  if (box) { box.dataset.mode = _gdpMode(); box.dataset.tool = _gdpTool(); }
  _gdpPaintStage(m, true);
  _gdpPaintSide(m);
}

/* ---------- the stage ---------- */
function _gdpPaintStage(m, force) {
  if (!_gdp.root) return;
  const inner = _gdp.root.querySelector('.gd-stage'); if (!inner) return;
  const mode = _gdpMode(), still = !gardenMotionOn();
  const sc = gardenSceneFromModel(m);
  const parts = gardenSceneParts(sc, { size: 'l', crop: 'all', interactive: mode !== 'view', still, uid: 'gdp', label: `Your garden: ${m.plants.length} plants, level ${m.level.level}`, cacheKey: _gd.memoKey + '|' + mode + '|' + (still ? 1 : 0) });
  if (!_gdp.svg || !_gdp.svg.isConnected || force && mode !== (_gdp.svg.dataset.mode || '')) _gdp.svg = gardenSvgMount(inner, parts);
  else _gdp.svg = gardenSvgPatch(_gdp.svg, parts);
  if (_gdp.svg) _gdp.svg.dataset.mode = mode;
  const box = _gdp.root.querySelector('.gd-stagebox');
  if (box) { box.dataset.mode = mode; box.dataset.tool = _gdpTool(); }
  _gdpPaintSel(m);
  // visitors you can see go in the almanac (only while the page is on screen)
  if (document.visibilityState === 'visible' && m.visitors.length) setTimeout(() => gardenNoteVisitors(m.visitors), 1200);
}
function _gdpCellOf(ev) {
  const svg = _gdp.svg; if (!svg || !svg.getScreenCTM) return null;
  const ctm = svg.getScreenCTM(); if (!ctm) return null;
  const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD;
  const x = Math.floor(p.x / W.cellW), y = Math.floor((p.y - W.sky) / W.cellH);
  if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return null;
  return { x, y };
}
function _gdpItemOf(ev) {
  const g = ev.target && ev.target.closest ? ev.target.closest('.gd-it[data-uid]') : null;
  return g ? { uid: g.getAttribute('data-uid'), kind: g.classList.contains('gd-plant') ? 'plant' : 'decor', ground: !!g.closest('.gd-paths') } : null;
}
function _gdpRect(el, x, y, w, h) { if (!el) return; const W = GARDEN_WORLD; el.setAttribute('x', x * W.cellW + 1); el.setAttribute('y', W.sky + y * W.cellH + 1); el.setAttribute('width', Math.max(0, w * W.cellW - 2)); el.setAttribute('height', Math.max(0, h * W.cellH - 2)); }
function _gdpFootOf(m, uid) {
  const p = gardenPlantById(m, uid); if (p) return { x: p.x, y: p.y, w: p.fp, h: p.fp };
  const d = gardenDecorById(m, uid); if (d) return { x: d.x, y: d.y, w: d.def.w || 1, h: d.def.h || 1 };
  return null;
}
function _gdpPaintSel(m) {
  if (!_gdp.svg) return;
  const sel = _gdp.svg.querySelector('.gd-sel'), hov = _gdp.svg.querySelector('.gd-hover');
  const f = _gdp.sel ? _gdpFootOf(m, _gdp.sel) : null;
  if (sel) { if (f) _gdpRect(sel, f.x, f.y, f.w, f.h); else _gdpRect(sel, 0, 0, 0, 0); }
  if (hov && _gdp.cur && _gdp.cur.kb) _gdpRect(hov, _gdp.cur.x, _gdp.cur.y, 1, 1);
}
function _gdpHover(ev) {
  if (!_gdp.svg) return;
  const m = gardenModel(), hov = _gdp.svg.querySelector('.gd-hover'), status = _gdp.root && _gdp.root.querySelector('.gd-status');
  const it = _gdpItemOf(ev), cell = _gdpCellOf(ev);
  let foot = it ? _gdpFootOf(m, it.uid) : null;
  if (!foot && cell) foot = { x: cell.x, y: cell.y, w: 1, h: 1 };
  const tool = _gdpTool(), mode = _gdpMode();
  // placing: the ghost
  const placing = mode === 'decorate' && _gdp.decor ? gardenDecor(_gdp.decor) : mode === 'tend' && tool === 'seed' && _gdp.seed ? gardenPlant(_gdp.seed) : null;
  if (_gdp.carry) return;
  if (placing && cell) { _gdpGhost(m, placing, mode === 'decorate' ? 'decor' : 'plant', cell.x, cell.y); foot = null; }
  else _gdpGhostClear();
  if (hov) { if (foot && mode !== 'view') _gdpRect(hov, foot.x, foot.y, foot.w, foot.h); else _gdpRect(hov, 0, 0, 0, 0); }
  if (hov) hov.classList.toggle('is-item', !!it);
  _gdp.hoverUid = it ? it.uid : '';
  if (status) status.textContent = _gdpDescribe(m, it ? it.uid : '', cell, placing);
}
function _gdpDescribe(m, uid, cell, placing) {
  if (placing && cell) { const why = _gdPlaceOk(m, placing, cell.x, cell.y, gardenDecor(placing.id) ? 'decor' : 'plant'); return why || `${placing.name}: click to ${gardenDecor(placing.id) ? 'place' : 'plant'} here`; }
  const p = uid ? gardenPlantById(m, uid) : null;
  if (p) {
    const bits = [p.def.name, gardenStageName(p.def, p.stage)];
    if (p.ripe) bits.push('ready to pick'); else if (p.nextIn) bits.push('next stage in about ' + _gdHoursLabel(p.nextIn));
    if (p.thirsty) bits.push('thirsty'); if (p.overgrown) bits.push('could do with a trim');
    return bits.join(' · ');
  }
  const d = uid ? gardenDecorById(m, uid) : null;
  if (d) { const ci = gardenCollectInfo(d.uid, m); return d.def.name + (ci && ci.ready ? ' · ' + ci.label : '') + (d.def.blurb ? ' · ' + d.def.blurb : ''); }
  if (cell) { const a = gardenAreaAt(cell.x, cell.y, m.level.level); if (a.startsWith('locked:')) { const ar = gardenArea(a.slice(7)); return `${ar.name}: opens at garden level ${ar.lv}. ${ar.blurb}`; } const ar = gardenArea(a); return ar ? ar.name + (ar.cats.length ? ' · ' + ar.cats.map(c => GARDEN_CATS[c].label.toLowerCase()).slice(0, 4).join(', ') : ' · paths, seats and decorations') : ''; }
  return '';
}
function _gdpGhost(m, def, kind, x, y) {
  const gh = _gdp.svg && _gdp.svg.querySelector('.gd-ghost'); if (!gh) return;
  const why = _gdPlaceOk(m, def, x, y, kind);
  const W = GARDEN_WORLD, fw = kind === 'decor' ? def.w || 1 : def.fp || 1, fh = kind === 'decor' ? def.h || 1 : def.fp || 1;
  const key = [def.id, x, y, why ? 1 : 0, _gdp.carry ? 1 : 0].join('|');
  if (gh.dataset.k === key) return;
  gh.dataset.k = key;
  const frag = _gdArt(def.id, kind === 'plant' ? { kind, stage: 1, season: m.season, size: 'm', tod: 'day' } : { kind, season: m.season, size: 'm', tod: 'day', r: 0 });
  const ground = kind === 'decor' && def.layer === 'ground';
  const tr = ground ? `translate(${(x + fw / 2) * W.cellW} ${W.sky + (y + fh) * W.cellH}) scale(0.75)` : `translate(${(x + fw / 2) * W.cellW} ${W.sky + (y + fh) * W.cellH - 4}) scale(0.75)`;
  gh.innerHTML = `<rect class="gd-ghostcell${why ? ' is-bad' : ''}" x="${x * W.cellW + 1}" y="${W.sky + y * W.cellH + 1}" width="${fw * W.cellW - 2}" height="${fh * W.cellH - 2}" rx="4"/><g class="gd-ghostart${why ? ' is-bad' : ''}" transform="${tr}">${frag}</g>`;
}
function _gdpGhostClear() { const gh = _gdp.svg && _gdp.svg.querySelector('.gd-ghost'); if (gh && gh.dataset.k) { gh.dataset.k = ''; gh.innerHTML = ''; } }

/* ---------- pointer: click, sweep, drag ---------- */
function _gdpBindStage(box) {
  box.addEventListener('pointermove', (ev) => {
    const pr = _gdp.press;
    if (pr && (Math.abs(ev.clientX - pr.x0) > 4 || Math.abs(ev.clientY - pr.y0) > 4)) pr.moved = true;
    if (pr && pr.moved) { _gdpDragMove(ev); return; }
    _gdpHover(ev);
  });
  box.addEventListener('pointerleave', () => { if (_gdp.press) return; const hov = _gdp.svg && _gdp.svg.querySelector('.gd-hover'); if (hov) _gdpRect(hov, 0, 0, 0, 0); _gdpGhostClear(); const st = _gdp.root && _gdp.root.querySelector('.gd-status'); if (st) st.textContent = ''; });
  box.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || !_gdp.svg || !_gdp.svg.contains(ev.target)) return;
    const it = _gdpItemOf(ev), cell = _gdpCellOf(ev);
    _gdp.press = { x0: ev.clientX, y0: ev.clientY, it, cell, moved: false, id: ev.pointerId };
    const mode = _gdpMode(), tool = _gdpTool();
    if (mode === 'tend' && (tool === 'water' || tool === 'seed')) { _gdp.sweep = { done: new Set(), n: 0, undo0: _gd.undo.length, tool, last: '' }; _gdpSweepAt(ev); }
    try { box.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
  });
  box.addEventListener('pointerup', (ev) => {
    const pr = _gdp.press; _gdp.press = null;
    try { box.releasePointerCapture(ev.pointerId); } catch (e) { /* fine */ }
    if (!pr) return;
    if (_gdp.sweep) { _gdpSweepEnd(); return; }
    if (pr.moved && pr.drag) { _gdpDragDrop(ev, pr); return; }
    if (!pr.moved) _gdpClick(pr.it, pr.cell, ev);
  });
  box.addEventListener('pointercancel', () => { _gdp.press = null; if (_gdp.sweep) _gdpSweepEnd(); _gdpGhostClear(); });
  box.addEventListener('keydown', (ev) => _gdpKey(ev));
  box.addEventListener('focus', () => { if (!_gdp.cur) _gdp.cur = { x: 9, y: 6, kb: false }; });
}
function _gdpAct(r, keepSel) {
  if (r && !r.ok) _gdpSay(r);
  if (!keepSel && r && r.ok) _gdpRefreshChromeSoon();
  return r;
}
let _gdpChromeQ = 0;
function _gdpRefreshChromeSoon() { if (_gdpChromeQ) return; _gdpChromeQ = requestAnimationFrame(() => { _gdpChromeQ = 0; if (!_gdp.root) return; const m = gardenModel(); const bar = _gdp.root.querySelector('.gd-toolbar'); if (bar) bar.replaceWith(_gdpToolbar(m)); }); }
function _gdpClick(it, cell, ev) {
  const m = gardenModel(), mode = _gdpMode(), tool = _gdpTool();
  if (mode === 'view') { _gdp.sel = it ? it.uid : ''; _gdpPaintSel(m); _gdpPaintSide(m); return; }
  if (mode === 'decorate') {
    if (_gdp.decor && cell) { const r = gardenPlaceDecor(_gdp.decor, cell.x, cell.y, 0); _gdpAct(r); if (r.ok && gardenHas('decor:' + _gdp.decor) < 1) _gdp.decor = ''; _gdpPaintSide(gardenModel()); return; }
    _gdp.sel = it ? it.uid : ''; _gdpPaintSel(m); _gdpPaintSide(m);
    return;
  }
  // tend
  const p = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : (cell ? _gdpPlantAtCell(m, cell) : null);
  const d = it && it.kind === 'decor' ? gardenDecorById(m, it.uid) : null;
  switch (tool) {
    case 'hand':
      if (p) { _gdp.sel = p.uid; if (p.ripe) _gdpAct(gardenHarvest(p.uid), true); }
      else if (d) { _gdp.sel = d.uid; const ci = gardenCollectInfo(d.uid, m); if (ci && ci.ready) _gdpAct(gardenCollect(d.uid), true); }
      else _gdp.sel = '';
      break;
    case 'feed': if (p) _gdpAct(gardenFeed(p.uid)); break;
    case 'trim': if (p) _gdpAct(gardenPrune(p.uid)); break;
    case 'dig': if (p) { _gdpAct(gardenDig(p.uid)); if (_gdp.sel === p.uid) _gdp.sel = ''; } break;
  }
  const mm = gardenModel(); _gdpPaintSel(mm); _gdpPaintSide(mm);
  void ev;
}
function _gdpPlantAtCell(m, cell) { const c = m.occ.get(cell.x + ',' + cell.y); return c && c.plant ? gardenPlantById(m, c.plant) : null; }
/** The watering can or a seed dragged across the beds: each plant (or cell) once, one Undo for the whole sweep. */
function _gdpSweepAt(ev) {
  const sw = _gdp.sweep; if (!sw) return;
  const m = gardenModel(), cell = _gdpCellOf(ev); if (!cell) return;
  if (sw.tool === 'water') {
    const it = _gdpItemOf(ev), p = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, cell);
    if (!p || sw.done.has(p.uid)) return;
    sw.done.add(p.uid);
    const r = gardenWater(p.uid, { quiet: true });
    if (r.ok) { sw.n++; _gdpSplash(p); } else if (sw.n === 0 && sw.done.size === 1) sw.last = r.msg;
  } else {
    const k = cell.x + ',' + cell.y; if (sw.done.has(k) || !_gdp.seed) return;
    sw.done.add(k);
    const r = gardenPlantAt(_gdp.seed, cell.x, cell.y, { quiet: true });
    if (r.ok) sw.n++; else if (sw.n === 0) sw.last = r.msg;
  }
}
function _gdpSweepEnd() {
  const sw = _gdp.sweep; _gdp.sweep = null;
  if (!sw) return;
  if (!sw.n) { if (sw.last) _gdpSay({ ok: false, msg: sw.last }); return; }
  // fold the sweep's steps into one Undo
  const steps = _gd.undo.splice(sw.undo0);
  const mark = []; for (const u of steps) mark.push(...u.mark);
  const label = sw.tool === 'water' ? `watering ${sw.n} plant${sw.n === 1 ? '' : 's'}` : `planting ${sw.n} seed${sw.n === 1 ? '' : 's'}`;
  _gdPushUndo(label, mark);
  const u = _gd.undo[_gd.undo.length - 1];
  const name = sw.tool === 'seed' && gardenPlant(_gdp.seed) ? gardenPlant(_gdp.seed).name.toLowerCase() : '';
  toast(sw.tool === 'water' ? `Watered ${sw.n} plant${sw.n === 1 ? '' : 's'}` : `Planted ${sw.n} ${name}${sw.n === 1 ? '' : name.endsWith('s') ? '' : 's'}`, { icon: sw.tool === 'water' ? 'droplets' : 'sprout', timeout: 5000, action: { label: 'Undo', run: () => { if (_gd.undo[_gd.undo.length - 1] === u) gardenUndo(); } } });
  if (sw.tool === 'seed' && gardenHas('seed:' + _gdp.seed) < 1) { _gdp.seed = ''; }
  _gdpRefreshChromeSoon(); _gdpPaintSide(gardenModel());
}
function _gdpSplash(p) {
  if (!gardenMotionOn() || !_gdp.svg) return;
  const fx = _gdp.svg.querySelector('.gd-fx'); if (!fx) return;
  const W = GARDEN_WORLD, x = (p.x + p.fp / 2) * W.cellW, y = W.sky + (p.y + p.fp) * W.cellH - 10;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'gd-splash');
  g.innerHTML = [0, 1, 2, 3, 4].map(i => `<circle cx="${x + (i - 2) * 5}" cy="${y - 16}" r="2.2" fill="#7fc4ec" style="--i:${i}"/>`).join('');
  fx.appendChild(g);
  setTimeout(() => g.remove(), 900);
}
function _gdpDragMove(ev) {
  const pr = _gdp.press;
  if (_gdp.sweep) { _gdpSweepAt(ev); _gdpHover(ev); return; }
  const mode = _gdpMode();
  if (mode !== 'decorate' || !pr.it) return;
  pr.drag = true;
  const m = gardenModel(), cell = _gdpCellOf(ev); if (!cell) return;
  const isPlant = pr.it.kind === 'plant';
  const it = isPlant ? gardenPlantById(m, pr.it.uid) : gardenDecorById(m, pr.it.uid); if (!it) return;
  const node = _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(pr.it.uid)}"]`);
  if (node) node.classList.add('is-lifted');
  const gh = _gdp.svg.querySelector('.gd-ghost'), W = GARDEN_WORLD;
  const why = _gdPlaceOk(m, it.def, cell.x, cell.y, isPlant ? 'plant' : 'decor', pr.it.uid);
  const fw = isPlant ? it.def.fp || 1 : it.def.w || 1, fh = isPlant ? it.def.fp || 1 : it.def.h || 1;
  if (gh) gh.innerHTML = `<rect class="gd-ghostcell${why ? ' is-bad' : ''}" x="${cell.x * W.cellW + 1}" y="${W.sky + cell.y * W.cellH + 1}" width="${fw * W.cellW - 2}" height="${fh * W.cellH - 2}" rx="4"/>`;
  pr.target = cell;
  const st = _gdp.root.querySelector('.gd-status'); if (st) st.textContent = why || `Drop to move the ${it.def.name.toLowerCase()} here`;
}
function _gdpDragDrop(ev, pr) {
  const node = _gdp.svg && _gdp.svg.querySelector('.gd-it.is-lifted'); if (node) node.classList.remove('is-lifted');
  _gdpGhostClear();
  const cell = pr.target; if (!cell || !pr.it) return;
  const r = pr.it.kind === 'plant' ? gardenMovePlant(pr.it.uid, cell.x, cell.y) : gardenMoveDecor(pr.it.uid, cell.x, cell.y);
  if (r.ok) { _gdp.sel = pr.it.uid; const u = _gd.undo[_gd.undo.length - 1]; if (pr.it.kind === 'decor') toast('Moved', { icon: 'move', timeout: 4000, action: { label: 'Undo', run: () => { if (_gd.undo[_gd.undo.length - 1] === u) gardenUndo(); } } }); }
  _gdpAct(r, true);
  void ev;
}

/* ---------- carrying a seed or decoration from a tray onto the garden ---------- */
function _gdpCarryStart(kind, id, ev) {
  _gdp.carry = { kind, id, x0: ev.clientX, y0: ev.clientY, moved: false };
  window.addEventListener('pointermove', _gdpCarryMove);
  window.addEventListener('pointerup', _gdpCarryUp, { once: true });
}
function _gdpCarryMove(ev) {
  const c = _gdp.carry; if (!c) return;
  if (Math.abs(ev.clientX - c.x0) + Math.abs(ev.clientY - c.y0) > 6) c.moved = true;
  if (!c.moved || !_gdp.svg) return;
  document.documentElement.classList.add('gd-carrying');
  const cell = _gdpCellOf(ev), m = gardenModel();
  const def = c.kind === 'decor' ? gardenDecor(c.id) : gardenPlant(c.id);
  if (cell && def) _gdpGhost(m, def, c.kind === 'decor' ? 'decor' : 'plant', cell.x, cell.y); else _gdpGhostClear();
}
function _gdpCarryUp(ev) {
  const c = _gdp.carry; _gdpCarryEnd();
  if (!c) return;
  if (!c.moved) return;   // a click: the tray's own handler picks it
  _gdp.carriedAt = Date.now();   // clock-ok: the click that follows a drag is not a pick
  const cell = _gdp.svg ? _gdpCellOf(ev) : null;
  if (!cell) return;
  const r = c.kind === 'decor' ? gardenPlaceDecor(c.id, cell.x, cell.y, 0) : gardenPlantAt(c.id, cell.x, cell.y);
  _gdpAct(r);
}
function _gdpCarryEnd() {
  window.removeEventListener('pointermove', _gdpCarryMove);
  document.documentElement.classList.remove('gd-carrying');
  if (_gdp.carry) { _gdp.carry = null; _gdpGhostClear(); }
}

/* ---------- keyboard ---------- */
function _gdpKey(ev) {
  if (ev.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName)) return;
  const m = gardenModel(), mode = _gdpMode(), W = GARDEN_WORLD;
  if (!_gdp.cur) _gdp.cur = { x: 9, y: 6, kb: true };
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (mv) {
    ev.preventDefault();
    _gdp.cur = { x: Math.max(0, Math.min(W.cols - 1, _gdp.cur.x + mv[0])), y: Math.max(0, Math.min(W.rows - 1, _gdp.cur.y + mv[1])), kb: true };
    const c = m.occ.get(_gdp.cur.x + ',' + _gdp.cur.y);
    _gdpPaintSel(m);
    const st = _gdp.root.querySelector('.gd-status'); if (st) st.textContent = _gdpDescribe(m, c ? c.plant || c.decor || '' : '', _gdp.cur, null);
    return;
  }
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    const c = m.occ.get(_gdp.cur.x + ',' + _gdp.cur.y) || {};
    const uid = c.plant || c.decor || c.ground || '';
    const it = uid ? { uid, kind: c.plant === uid ? 'plant' : 'decor' } : null;
    if (mode === 'tend' && _gdpTool() === 'water') { const p = c.plant ? gardenPlantById(m, c.plant) : null; if (p) _gdpAct(gardenWater(p.uid)); return; }
    if (mode === 'tend' && _gdpTool() === 'seed' && _gdp.seed) { _gdpAct(gardenPlantAt(_gdp.seed, _gdp.cur.x, _gdp.cur.y)); return; }
    _gdpClick(it, { x: _gdp.cur.x, y: _gdp.cur.y }, ev);
    return;
  }
  if (mode === 'tend' && /^[1-6]$/.test(ev.key)) { _gdpPickTool(GARDEN_TOOLS_UI[Number(ev.key) - 1][0]); ev.preventDefault(); return; }
  const k = ev.key.toLowerCase();
  if (k === 'w' && !ev.ctrlKey && !ev.metaKey) { _gdpAct(gardenWaterAll()); ev.preventDefault(); return; }
  if (k === 'h' && !ev.ctrlKey && !ev.metaKey) { _gdpAct(gardenHarvestAll()); ev.preventDefault(); return; }
  if (mode === 'decorate' && _gdp.sel) {
    const d = gardenDecorById(m, _gdp.sel);
    if (k === 'r' && d) { _gdpAct(gardenRotateDecor(d.uid), true); ev.preventDefault(); return; }
    if (k === 's' && d) { _gdpAct(gardenStyleDecor(d.uid), true); ev.preventDefault(); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && d) { _gdpAct(gardenRemoveDecor(d.uid)); _gdp.sel = ''; ev.preventDefault(); return; }
  }
  if (ev.key === 'Escape') {
    if (_gdp.sel || _gdp.decor || (_gdpTool() !== 'hand' && mode === 'tend')) { ev.preventDefault(); ev.stopPropagation(); _gdp.sel = ''; _gdp.decor = ''; if (mode === 'tend') _gdpPickTool('hand'); else _gdpRefreshChrome(); }
  }
}
function _gdpBindKeys() {
  if (_gdp.keyBound) return;
  _gdp.keyBound = true;
  // Ctrl+Z on the garden page undoes the last garden change (the app's own undo covers the rest of the dashboard)
  document.addEventListener('keydown', (ev) => {
    if (!/^garden(:|$)/.test(String(state.view || '')) || !(ev.ctrlKey || ev.metaKey) || ev.shiftKey || ev.key.toLowerCase() !== 'z') return;
    const t = ev.target;
    if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
    if (!gardenCanUndo()) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    gardenUndo();
  }, true);
}

/* ---------- the side: today, the inspector, visitors; the tray under the stage ---------- */
function _gdpPaintSide(m) {
  if (!_gdp.root) return;
  const today = _gdp.root.querySelector('.gd-today'); if (today) { today.textContent = ''; _gdpToday(today, m); }
  const side = _gdp.root.querySelector('.gd-side'); if (side) { side.textContent = ''; _gdpInspector(side, m); _gdpVisitorsBox(side, m); }
  const tray = _gdp.root.querySelector('.gd-tray'); if (tray) { tray.textContent = ''; _gdpTray(tray, m); }
}
function _gdpToday(el, m) {
  const rows = gardenDailyTasks(m), qs = gardenWeekQuests(m);
  const h = _gdpEl('div', 'gd-today-h');
  h.appendChild(_gdpEl('b', null, 'Today in the garden'));
  const note = _gdpWeatherNote(m); if (note) h.appendChild(_gdpEl('span', 'gd-wx muted', note));
  el.appendChild(h);
  const list = _gdpEl('div', 'gd-tasks');
  const task = (t, week) => {
    const c = _gdpEl('div', 'gd-task' + (t.done ? ' is-done' : ''));
    const pct = Math.round(t.have / t.n * 100);
    c.innerHTML = `<span class="gd-ring" style="--p:${pct}">${icon(t.done ? 'check' : t.def.icon)}</span><span class="gd-task-t"><b></b><small class="muted"></small></span>`;
    c.querySelector('b').textContent = t.label;
    c.querySelector('small').textContent = t.done ? `Done · +${t.def.c} coins` : `${Math.min(t.have, t.n)} of ${t.n} · +${t.def.c} coins${week ? ' · this week' : ''}`;
    return c;
  };
  for (const t of rows) list.appendChild(task(t, false));
  el.appendChild(list);
  const doneQ = qs.filter(q => q.done).length;
  const det = document.createElement('details'); det.className = 'gd-quests';
  const sum = document.createElement('summary'); sum.textContent = `This week’s garden quests · ${doneQ} of ${qs.length}`;
  det.appendChild(sum);
  const ql = _gdpEl('div', 'gd-tasks'); for (const q of qs) ql.appendChild(task(q, true)); det.appendChild(ql);
  if (_gdp.questsOpen) det.open = true;
  det.addEventListener('toggle', () => { _gdp.questsOpen = det.open; });
  el.appendChild(det);
}
function _gdpWeatherNote(m) {
  if (m.rain.now) return (m.rain.label || 'Rain') + ': the garden is being watered for you.';
  if (m.rain.snow) return 'Snow: everything is tucked up and resting.';
  if (m.rain.last && m.now - m.rain.last < 12 * 3600000) return 'It rained earlier: everything has had a drink.';
  const t = m.plants.filter(p => p.thirsty && p.def.thirst).length;
  if (t) return `${t} plant${t === 1 ? ' is' : 's are'} a little thirsty.`;
  if (m.ripe) return `${m.ripe} ready to pick.`;
  return { dawn: 'Early light over the garden.', day: 'A calm day in the garden.', dusk: 'The garden is settling for the evening.', night: 'The garden is asleep.' }[m.tod] || '';
}
function _gdpInspector(side, m) {
  const box = _gdpEl('section', 'gd-insp card');
  const uid = _gdp.sel;
  const p = uid ? gardenPlantById(m, uid) : null, d = !p && uid ? gardenDecorById(m, uid) : null;
  if (!p && !d) {
    const mode = _gdpMode();
    box.classList.add('is-empty');
    box.appendChild(_gdpEl('h3', null, mode === 'decorate' ? 'Decorating' : mode === 'view' ? 'Just looking' : 'Tending'));
    box.appendChild(_gdpEl('p', 'muted', mode === 'decorate' ? 'Pick a decoration below and click a spot, or drag one in. Click a placed one to move, turn or put it away.' : mode === 'view' ? 'Click anything to read about it. Switch to Tend to garden.' : 'Click a plant to see how it is doing. Ripe ones sparkle: the hand picks them.'));
    const lv = m.level.level, next = GARDEN_AREAS.find(a => a.lv > lv);
    if (next) box.appendChild(_gdpEl('p', 'gd-insp-next', `Next: the ${next.name.toLowerCase()} opens at level ${next.lv}.`));
    side.appendChild(box);
    return;
  }
  const def = p ? p.def : d.def, kind = p ? 'plant' : 'decor';
  const top = _gdpEl('div', 'gd-insp-top');
  top.innerHTML = gardenIconSvg(def.id, p ? { kind: 'plant', stage: p.stage, variant: p.variant, season: m.season, thirsty: p.thirsty, ripe: p.ripe, heart: p.heart, px: 64 } : { kind: 'decor', r: d.r, v: d.v, px: 64 });
  const tt = _gdpEl('div', 'gd-insp-t');
  tt.appendChild(_gdpEl('h3', null, def.name));
  if (p) { const r = GARDEN_RARITY[def.rarity]; const tag = _gdpEl('span', 'gd-rar gd-rar-' + def.rarity, r.label); tt.appendChild(tag); }
  top.appendChild(tt);
  box.appendChild(top);
  const facts = _gdpEl('ul', 'gd-insp-facts');
  const li = (ic, text) => { const x = _gdpEl('li'); x.innerHTML = icon(ic, 'i-sm'); x.appendChild(_gdpEl('span', null, text)); facts.appendChild(x); };
  if (p) {
    if (def.special === 'heart') li('trees', `Grows with every task you finish: ${_gdpNum(m.totalDone)} so far`);
    else {
      li('sprout', gardenStageName(def, p.stage) + (p.ripe ? ' · ready to pick' : p.nextIn ? ` · next in about ${_gdHoursLabel(p.nextIn)}` : ''));
      if (def.thirst) li('droplet', p.thirsty ? 'Thirsty: it is growing slowly until it gets a drink' : m.rain.now ? 'The rain is watering it' : 'Happy: watered ' + _gdpAgo(m.now - p.lastWater));
      else li('droplet', def.cat === 'water' ? 'Lives in the pond: never thirsty' : 'Finds its own water');
      li('calendar', (p.inSeason ? 'In season' : 'Out of season: growing a little slower') + ' · best in ' + (def.seasons.length === 4 ? 'any season' : def.seasons.map(s => GARDEN_SEASON_LABEL[s].toLowerCase()).join(' and ')));
      if (def.yield) li('shopping-basket', `${def.yield.regrow ? 'Picked again and again' : 'Lifted when harvested'} · ${def.yield.n[0]}${def.yield.n[1] > def.yield.n[0] ? '-' + def.yield.n[1] : ''} each time · sells for ${gardenSellPrice('crop:' + def.id, m)}`);
      if (p.overgrown) li('scissors', 'A little wild: a trim tidies it');
      if (p.hc) li('repeat', `Harvested ${p.hc} time${p.hc === 1 ? '' : 's'}`);
    }
  } else {
    if (d.def.effect) li('sparkles', _gdpEffectText(d.def));
    const ci = gardenCollectInfo(d.uid, m); if (ci) li(ci.ready ? 'gift' : 'clock', ci.ready ? ci.label : ci.soon);
  }
  box.appendChild(facts);
  if (def.blurb) box.appendChild(_gdpEl('p', 'gd-insp-blurb', def.blurb));
  const acts = _gdpEl('div', 'gd-insp-acts');
  if (p && def.special !== 'heart') {
    if (p.ripe) acts.appendChild(_gdpBtn('Pick', { kind: 'btn-primary', icon: 'shopping-basket', run: () => _gdpAct(gardenHarvest(p.uid), true) }));
    if (def.thirst) acts.appendChild(_gdpBtn('Water', { icon: 'droplet', run: () => _gdpAct(gardenWater(p.uid), true) }));
    acts.appendChild(_gdpBtn('Feed', { icon: 'flask-conical', disabled: gardenHas('fertiliser') < 1, tip: gardenHas('fertiliser') < 1 ? 'No fertiliser: the shop has some' : 'Half a day’s growth', run: () => _gdpAct(gardenFeed(p.uid), true) }));
    if (p.stage >= 3) acts.appendChild(_gdpBtn('Trim', { icon: 'scissors', run: () => _gdpAct(gardenPrune(p.uid), true) }));
    acts.appendChild(_gdpBtn('Dig up', { icon: 'shovel', kind: 'btn-ghost', run: () => { _gdpAct(gardenDig(p.uid)); _gdp.sel = ''; _gdpPaintSide(gardenModel()); } }));
  } else if (d) {
    const ci = gardenCollectInfo(d.uid, m);
    if (ci) acts.appendChild(_gdpBtn(ci.ready ? ci.label : 'Collect', { kind: ci.ready ? 'btn-primary' : 'btn-secondary', icon: 'gift', disabled: !ci.ready, tip: ci.ready ? '' : ci.soon, run: () => _gdpAct(gardenCollect(d.uid), true) }));
    if (d.def.rot) acts.appendChild(_gdpBtn('Turn', { icon: 'rotate-cw', tip: 'R', run: () => _gdpAct(gardenRotateDecor(d.uid), true) }));
    if (d.def.v > 1) acts.appendChild(_gdpBtn('Style', { icon: 'palette', tip: 'S', run: () => _gdpAct(gardenStyleDecor(d.uid), true) }));
    acts.appendChild(_gdpBtn('Put away', { icon: 'package', kind: 'btn-ghost', tip: 'Back in your bag · Delete', run: () => { _gdpAct(gardenRemoveDecor(d.uid)); _gdp.sel = ''; _gdpPaintSide(gardenModel()); } }));
  }
  if (acts.children.length) box.appendChild(acts);
  if (_gdpMode() === 'decorate') box.appendChild(_gdpEl('p', 'muted gd-insp-hint', 'Drag it to move it.'));
  side.appendChild(box);
}
function _gdpAgo(ms) { const h = ms / 3600000; return h < 1 ? 'within the hour' : h < 24 ? Math.round(h) + ' hours ago' : Math.round(h / 24) + ' days ago'; }
function _gdpEffectText(def) {
  const e = def.effect; if (!e) return '';
  return ({ can: `+${e.n} water in the can every day`, sprinkler: 'Waters the cells around it every morning', pond: 'Frogs and dragonflies come to it', birds: 'Birds come to visit', bugs: 'Ladybirds and bees move in', hedgehog: 'A hedgehog may come at dusk', hive: 'Honey every two days while three flowers bloom', compost: 'One bag of fertiliser a day', light: 'Glows at night; moths and bats come', sit: 'A seat: someone’s cat may borrow it', luck: 'Brings luck: rare finds come a little more often', wish: 'One wish a day (a coin in, sometimes a seed back)', cold: 'Plants beside it grow as if it were their season', scare: 'A little extra at harvest nearby', shed: 'A place for your tools', hedge: 'A wren may move in' })[e.kind] || '';
}
function _gdpVisitorsBox(side, m) {
  const box = _gdpEl('section', 'gd-visitors card');
  box.appendChild(_gdpEl('h3', null, 'Visiting now'));
  if (!m.visitors.length) box.appendChild(_gdpEl('p', 'muted', gardenFun() === 'off' ? 'Visitors rest while the Fun level is Off.' : 'Nobody just now. Flowers bring bees and butterflies; a bird bath brings robins; the pond brings frogs.'));
  else {
    const ul = _gdpEl('ul', 'gd-vlist');
    for (const v of m.visitors) { const li = _gdpEl('li'); li.innerHTML = gardenIconSvg(v.id, { kind: 'visitor', px: 32 }); li.appendChild(_gdpEl('span', null, v.def.name)); if (v.def.rarity !== 'common') li.appendChild(_gdpEl('span', 'gd-rar gd-rar-' + v.def.rarity, GARDEN_RARITY[v.def.rarity].label)); li.title = v.def.blurb || ''; ul.appendChild(li); }
    box.appendChild(ul);
  }
  side.appendChild(box);
}
function _gdpSeedList() {
  const w = gardenWallet(), out = [];
  for (const [k, n] of Object.entries(w.items)) if (k.startsWith('seed:') && n > 0) { const p = gardenPlant(k.slice(5)); if (p) out.push({ id: p.id, def: p, n: Math.floor(n) }); }
  return out.sort((a, b) => GARDEN_CAT_ORDER.indexOf(a.def.cat) - GARDEN_CAT_ORDER.indexOf(b.def.cat) || a.def.name.localeCompare(b.def.name));
}
function _gdpDecorList() {
  const w = gardenWallet(), out = [];
  for (const [k, n] of Object.entries(w.items)) if (k.startsWith('decor:') && n > 0) { const d = gardenDecor(k.slice(6)); if (d) out.push({ id: d.id, def: d, n: Math.floor(n) }); }
  return out.sort((a, b) => GARDEN_DECOR_CAT_ORDER.indexOf(a.def.cat) - GARDEN_DECOR_CAT_ORDER.indexOf(b.def.cat) || a.def.name.localeCompare(b.def.name));
}
function _gdpTray(el, m) {
  const mode = _gdpMode();
  if (mode === 'view') return;
  const isDecor = mode === 'decorate';
  if (!isDecor && _gdpTool() !== 'seed') {
    const hint = _gdpEl('div', 'gd-tray-hint muted');
    hint.textContent = `${_gdpSeedList().reduce((s, x) => s + x.n, 0)} seeds in your bag · pick Plant (3) to sow them`;
    const b = _gdpBtn('Plant', { icon: 'sprout', run: () => _gdpPickTool('seed') }); hint.appendChild(b);
    el.appendChild(hint);
    return;
  }
  const list = isDecor ? _gdpDecorList() : _gdpSeedList();
  const head = _gdpEl('div', 'gd-tray-h');
  head.appendChild(_gdpEl('b', null, isDecor ? 'Your decorations' : 'Your seeds'));
  head.appendChild(_gdpEl('span', 'muted', isDecor ? 'Click one, then a spot in the garden, or drag it in' : 'Click one, then a free cell (or drag along a row)'));
  head.appendChild(_gdpBtn(isDecor ? 'More in the shop' : 'Get seeds', { kind: 'btn-ghost', icon: 'store', run: () => setView('garden:shop') }));
  el.appendChild(head);
  if (!list.length) {
    el.appendChild(_gdpEl('p', 'gd-tray-empty muted', isDecor ? 'Nothing in your bag yet. The shop has benches, lanterns, bird baths and more: coins come from finishing tasks.' : 'No seeds left. Finishing tasks brings free packets, and the shop sells plenty.'));
    return;
  }
  const row = _gdpEl('div', 'gd-tray-row'); row.setAttribute('role', 'listbox'); row.setAttribute('aria-label', isDecor ? 'Decorations' : 'Seeds');
  const cur = isDecor ? _gdp.decor : _gdp.seed;
  for (const x of list) {
    const b = _gdpEl('button', 'gd-trayit'); b.type = 'button'; b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', cur === x.id ? 'true' : 'false');
    b.innerHTML = isDecor ? gardenIconSvg(x.id, { kind: 'decor', px: 40 }) : gardenIconSvg(x.id, { kind: 'seed', px: 40 });
    b.appendChild(_gdpEl('span', 'gd-trayit-n', x.def.name));
    b.appendChild(_gdpEl('i', 'gd-trayit-c', '×' + x.n));
    const where = isDecor ? '' : ' · grows in the ' + ((x.def.areas || GARDEN_CATS[x.def.cat].areas).map(a => gardenArea(a).name.toLowerCase()).slice(0, 2).join(' or '));
    b.setAttribute('data-tip', x.def.name + where);
    b.addEventListener('pointerdown', (ev) => { if (ev.button === 0) _gdpCarryStart(isDecor ? 'decor' : 'seed', x.id, ev); });
    b.onclick = () => {
      if (Date.now() - (_gdp.carriedAt || 0) < 400) return;   // clock-ok: that was the end of a drag
      if (isDecor) _gdp.decor = _gdp.decor === x.id ? '' : x.id; else { _gdp.seed = x.id; _gdp.tool = 'seed'; }
      _gdp.sel = '';
      _gdpPaintSide(gardenModel());
      const st = _gdp.root.querySelector('.gd-stagebox'); if (st) st.focus({ preventScroll: true });
    };
    row.appendChild(b);
  }
  el.appendChild(row);
}
