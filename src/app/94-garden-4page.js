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
const GARDEN_TABS = Object.freeze([['garden', 'Garden', 'sprout'], ['catch', 'Catch', 'fish'], ['shop', 'Shop', 'store'], ['almanac', 'Almanac', 'book-open'], ['basket', 'Basket', 'shopping-basket'],
  ['friends', 'Friends', 'users']]);   // 'friends': ── garden-social ── friends' gardens, visits and your guestbook (94-garden-social-2visit.js)
/* 2.23: what can be in your hand. The hand needs nothing else: it does what the thing in front of it needs. The rest are for when you want to choose (the hotbar, 94-garden-world-2hud.js). */
const GARDEN_TOOLS_UI = Object.freeze(['hand', 'water', 'feed', 'trim', 'dig', 'seed', 'decorate']);
const _gdp = { entry: '', root: null, svg: null, mode: '', tool: '', seed: '', decor: '', sel: '', hoverUid: '', cur: null,
  press: null, sweep: null, carry: null, keyBound: false, burstT: 0, wasVisible: false };

function _gdpTab(v) { const m = /^garden:([a-z]+)$/.exec(String(v || '')); const t = m ? m[1] : 'garden'; return GARDEN_TABS.some(x => x[0] === t) ? t : 'garden'; }
function _gdpPrefs() { const g = _gdG(); return g.prefs; }
function _gdpTool() { const t = _gdp.tool || 'hand'; return GARDEN_TOOLS_UI.includes(t) ? t : 'hand'; }
function _gdpMode() { return _gdpTool() === 'decorate' ? 'decorate' : 'tend'; }
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
/** An action's "no". In the garden the world shows it (gameDeny: red, a shake, an X); from anywhere else (the palette, Home) it has to be words. */
function _gdpSay(r, target) {
  if (!r || r.ok || !r.msg) return r;
  if (_gdp.root && _gdp.root.isConnected) gameDenyOf(r, target || null);
  else if (typeof toast === 'function') toast(r.msg, { icon: 'sprout', timeout: 3200 });
  return r;
}

/* ---------- the section, the sidebar, the palette ---------- */
registerSection('garden', {
  match: v => v === 'garden' || /^garden:(shop|almanac|basket|friends|catch)$/.test(String(v || '')),
  title: () => 'Garden',
  crumb: v => (_gdpTab(v) === 'garden' ? [] : [GARDEN_TABS.find(t => t[0] === _gdpTab(v))[1]]),
  group: 'home', layout: 'bare', hashable: true, taskControls: false, icon: 'sprout',
  mount(container, view) { _gdpMount(container, view || state.view); },
  unmount() { _gdpWorldUnmount(); },
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
  // 2.23: the shop, the almanac and the rest are panels over the world, so their old routes open the world and then the panel
  const tab = _gdpTab(view);
  if (tab !== 'garden') { _gdp.then = tab; setTimeout(() => { if (state.view === view) setView('garden'); }, 0); return; }
  _gdpWorldMount(container, view);
}
/** The world on the page: your own garden, or on a visit your friend's. The same stage and the same everything: gardenHere() says which garden it is. */
function _gdpWorldMount(container, view) {
  const entering = _gdp.entry !== view;
  _gdp.entry = view;
  const m = gardenHere();
  const root = _gdpEl('div', 'gd-page gd-full gd-tab-garden' + (entering ? ' is-enter' : '') + (gardenFun() === 'off' ? ' is-funoff' : ''));
  const body = _gdpEl('div', 'gd-body');
  root.appendChild(body);
  container.appendChild(root);
  _gdp.root = root; _gdp.tool = 'hand'; _gdp.moving = null;
  document.documentElement.classList.add('gd-immersive');
  gardenHudReset();
  _gdpGardenTab(body, m);
  _gdpBindKeys();
  gardenGameStart(root, m);
  gardenWorldStart(root, m);
  gardenHudPaint(m);
  gardenTickSoon(400);
  if (_gdp.then) { const t = _gdp.then; _gdp.then = ''; setTimeout(() => { if (_gdp.root === root) gardenPopupOpen(t); }, 60); }
}
function _gdpWorldUnmount() { document.documentElement.classList.remove('gd-immersive'); if (typeof toastHeldFlush === 'function') toastHeldFlush(); gardenHudReset(); gardenGameStop(); if (typeof gardenPopupClose === 'function') gardenPopupClose(); if (typeof gardenWorldStop === 'function') gardenWorldStop(); _gdp.entry = ''; _gdp.root = null; _gdp.svg = null; _gdp.press = null; _gdp.sweep = null; _gdpCarryEnd(); }
/** Is the world what is on screen? Your garden, or a garden you are visiting. */
function _gdpWorldView() { return state.view === 'garden' || (typeof gardenVisitOn === 'function' && gardenVisitOn()); }
function _gdpBasketCount(m) { let n = 0; for (const [k, v] of Object.entries(m.wallet.items)) if (v > 0 && (k.startsWith('crop:') || k.startsWith('bq:') || k === 'honey')) n += v; return n; }
/** Everything that shows the garden, brought up to date (the engine calls this after every change). */
function _gdpRepaint() {
  _gdpRepaintInner();
  if (_gdp.pop && typeof gardenPopupRefresh === 'function') gardenPopupRefresh();   // a pop-up over the garden shows the new state too
}
function _gdpRepaintInner() {
  if (!_gdp.root || !_gdp.root.isConnected) return;
  const m = gardenHere();
  _gdpPaintStage(m); gardenHudPaint(m);
}

/* ---------- the sky, for the HUD ---------- */
function _gdpSkyChip(m) {
  const tod = { dawn: 'Dawn', day: 'Daytime', dusk: 'Evening', night: 'Night' }[m.tod] || '';
  const ic = m.rain.snow ? 'snowflake' : m.rain.now ? 'droplets' : m.tod === 'night' ? 'moon' : m.tod === 'dawn' ? 'sunrise' : m.tod === 'dusk' ? 'sunset' : 'sun';
  const wx = m.rain.now ? (m.rain.snow ? 'snowing' : 'raining') : '';
  return { ic, text: `${GARDEN_SEASON_LABEL[m.season]} · ${tod.toLowerCase()}${wx ? ' · ' + wx : ''}` };
}
/* ---------- the garden: one stage that fills the page, and overlays on it (94-garden-world-2hud.js) ---------- */
function _gdpGardenTab(body, m) {
  const game = _gdpEl('div', 'gd-game'); body.appendChild(game);
  const stage = _gdpEl('div', 'gd-stagebox');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', (m.visit ? m.visit.name + "'s garden" : 'Your garden') + '. Click a spot or use W A S D to walk. Numbers pick a tool, Space does what is in front of you.');
  stage.setAttribute('role', 'application');
  stage.appendChild(_gdpEl('div', 'gd-stage'));
  stage.appendChild(_gdpEl('div', 'gd-status'));
  game.appendChild(stage);
  _gdp.svg = null;
  _gdpPaintStage(m);
  _gdpBindStage(stage);
}
function _gdpPickTool(k) {
  if (typeof _gwFishCancel === 'function' && typeof _gwFishBusy === 'function' && _gwFishBusy()) _gwFishCancel();
  if (typeof _gw !== 'undefined' && _gw.netting) _gw.netting = null;
  if (k === 'seed' && !_gdp.seed) { const first = _gdpSeedList()[0]; if (first) _gdp.seed = first.id; }
  if (_gdp.moving) gardenMoveEnd();
  gardenBubbleClose();
  _gdp.tool = k;
  if (k !== 'hand') _gdp.sel = '';
  if (k !== 'decorate') _gdp.decor = '';
  _gdpRefreshChrome();
  const box = _gdp.root && _gdp.root.querySelector('.gd-stagebox'); if (box) box.focus({ preventScroll: true });
}
/** Hotbar and stage after a tool change. */
function _gdpRefreshChrome() {
  if (!_gdp.root) return;
  const m = gardenHere();
  const box = _gdp.root.querySelector('.gd-stagebox');
  if (box) { box.dataset.mode = _gdpMode(); box.dataset.tool = _gdpTool(); box.dataset.placing = _gdp.moving || _gdpMode() === 'decorate' || _gdpTool() === 'seed' ? '1' : ''; }
  _gdpPaintStage(m, true);
  gardenHudPaint(m);
}

/* ---------- the stage ---------- */
function _gdpPaintStage(m, force) {
  if (!_gdp.root) return;
  const inner = _gdp.root.querySelector('.gd-stage'); if (!inner) return;
  const mode = _gdpMode(), still = !gardenMotionOn();
  const sc = gardenSceneFromModel(m);
  const parts = gardenSceneParts(sc, { size: 'l', crop: 'all', interactive: true, fit: 'xMidYMid meet', still, uid: 'gdp', label: `${m.visit ? m.visit.name + "'s" : 'Your'} garden: ${m.plants.length} plants, level ${m.level.level}`, cacheKey: (m.visit ? m.visit.key : _gd.memoKey) + '|' + mode + '|' + (still ? 1 : 0), friend: m.visit ? m.visit.drawFriend : undefined, readOnly: !!m.visit });
  if (!_gdp.svg || !_gdp.svg.isConnected || force && mode !== (_gdp.svg.dataset.mode || '')) _gdp.svg = gardenSvgMount(inner, parts);
  else _gdp.svg = gardenSvgPatch(_gdp.svg, parts);
  if (_gdp.svg) _gdp.svg.dataset.mode = mode;
  const box = _gdp.root.querySelector('.gd-stagebox');
  if (box) { box.dataset.mode = mode; box.dataset.tool = _gdpTool(); }
  _gdpPaintSel(m);
  try { if (typeof gardenWorldPainted === 'function') gardenWorldPainted(m); } catch (e) { console.error('[garden world]', e); }
  try { gardenGamePainted(m); } catch (e) { console.error('[garden]', e); }
  // visitors you can see go in the almanac (only while the page is on screen)
  if (!m.visit && document.visibilityState === 'visible' && m.visitors.length) setTimeout(() => gardenNoteVisitors(typeof gardenLifeOwns === 'function' ? m.visitors.filter(v => !gardenLifeOwns(v.id)) : m.visitors), 1200);   // (the live creatures note themselves when you really see them)
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
/**
 * The plant or decoration under the pointer, the same answer for the hover, the press and the right-click: whatever is painted under the
 * pointer; else the one whose drawing's box the pointer is inside (a tall flower used to light up only on a petal or at its foot, and
 * nowhere between); else null (the cell then decides).
 */
function _gdpPickItem(ev, cell) {
  const exact = _gdpItemOf(ev);
  if (exact && !exact.ground) return exact;
  const svg = _gdp.svg, pt = typeof _gwPointAt === 'function' ? _gwPointAt(ev) : null;
  if (svg && pt) {
    let best = null, bz = -1e9;
    for (const n of svg.querySelectorAll('.gd-objects > .gd-it[data-uid]')) {
      const z = parseFloat(n.getAttribute('data-z'));
      if (!(z >= pt.y - 0.3 && z <= pt.y + 6.5)) continue;   // a drawing stands up to about six rows above where it is rooted
      const r = n.getBoundingClientRect();
      if (ev.clientX < r.left - 2 || ev.clientX > r.right + 2 || ev.clientY < r.top - 2 || ev.clientY > r.bottom + 2) continue;
      if (z > bz) { bz = z; best = n; }   // the one nearest the front wins
    }
    if (best) return { uid: best.getAttribute('data-uid'), kind: best.classList.contains('gd-plant') ? 'plant' : 'decor', ground: false };
  }
  void cell;
  return exact;
}
/** Is a pop-up open over the garden? (One that was closed some other way is forgotten, so it can never lock the garden up.) */
function _gdpPopOpen() {
  const P = _gdp.pop;
  if (P && !(P.el && P.el.isConnected)) _gdp.pop = null;
  return !!_gdp.pop;
}
function _gdpRect(el, x, y, w, h) { if (!el) return; const W = GARDEN_WORLD; el.setAttribute('x', x * W.cellW + 1); el.setAttribute('y', W.sky + y * W.cellH + 1); el.setAttribute('width', Math.max(0, w * W.cellW - 2)); el.setAttribute('height', Math.max(0, h * W.cellH - 2)); }
function _gdpFootOf(m, uid) {
  const p = gardenPlantById(m, uid); if (p) return { x: p.x, y: p.y, w: p.fp, h: p.fp };
  const d = gardenDecorById(m, uid); if (d) return { x: d.x, y: d.y, w: d.def.w || 1, h: d.def.h || 1 };
  return null;
}
/** The selected plant or decoration glows (no square round its tiles). */
function _gdpPaintSel(m) {
  if (!_gdp.svg) return;
  const sel = _gdp.svg.querySelector('.gd-sel'); if (sel) _gdpRect(sel, 0, 0, 0, 0);
  for (const n of _gdp.svg.querySelectorAll('.gd-selected')) n.classList.remove('gd-selected');
  if (_gdp.sel && !(typeof _gwFishBusy === 'function' && _gwFishBusy())) { const n = _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(_gdp.sel)}"]`); if (n) n.classList.add('gd-selected'); }
  void m;
}
/** One thing under the pointer lights up (a plant, a decoration, a building); null clears it. */
function _gdpHighlight(node) {
  if (_gdp.hl === node) return;
  if (_gdp.hl && _gdp.hl.classList) _gdp.hl.classList.remove('gd-hl');
  _gdp.hl = node || null;
  if (node && node.classList) node.classList.add('gd-hl');
}
/**
 * What a click here would do, worked out once and used by the cursor, the highlight and the label:
 * {cur (the cursor), node (lights up), uid (for the hover card), label, spot (a cell to ring)}. cur 'no' is the X: it won't work, and you can tell before you click.
 */
function _gdpIntent(ev, m, it, cell) {
  const tool = _gdpTool(), k = gardenWorldPick(it, cell, ev, m);
  const nodeOf = (u) => (u ? _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(u)}"]`) : null);
  _gw.hoverBug = k.kind === 'bug' ? k.bug.key : '';
  switch (k.kind) {
    case 'prop': return { cur: 'door', node: _gdp.svg.querySelector(`.gd-prop[data-prop="${k.prop.id}"]`), label: k.prop.name };
    case 'bug': return { cur: 'net', label: k.bug.def.name };
    case 'sprite': return { cur: k.sprite.cursor || 'hand', label: k.sprite.label || '' };
    case 'water': { const ci = typeof gardenCastsInfo === 'function' ? gardenCastsInfo(m) : null; return { cur: ci && ci.left < 1 && !ci.free ? 'no' : 'rod' }; }
    case 'land': { const a = gardenArea(k.land); if (m.visit) return { cur: 'no', label: a.name }; if (a.buy && m.level.level >= a.lv) return { cur: 'buy', label: `${a.name} · ${_gdpNum(a.buy)}` }; return { cur: 'no', label: `${a.name} · Lv ${a.lv}` }; }
    case 'spot': return { cur: 'trowel', spot: k.cell };
    case 'decor': return { cur: m.visit && tool === 'dig' && !gardenVisitMay('take', k.decor) ? 'no' : tool === 'hand' ? 'hand' : tool === 'dig' ? 'spade' : 'no', node: nodeOf(k.decor.uid), label: m.visit && k.decor.by ? k.decor.def.name + ' · ' + _gllByLine('d', k.decor.by) : k.decor.def.name };
    case 'plant': {
      const p = k.plant, uid = p.uid, dry = p.def.thirst && !m.rain.now;
      if (p.def.special === 'heart') return { cur: 'hand', node: nodeOf(uid), uid };
      if (m.visit) return { cur: gardenVisitCursor(p, tool), node: nodeOf(uid), uid };   // the same pictures, for what your level reaches
      const cur = tool === 'water' ? (dry ? 'can' : 'no') : tool === 'feed' ? (gardenHas('fertiliser') > 0 ? 'feed' : 'no') : tool === 'trim' ? (p.stage >= 3 ? 'shears' : 'no') : tool === 'dig' ? 'spade'
        : p.ripe ? 'hand' : p.thirsty && dry ? 'can' : p.overgrown && p.stage >= 3 ? 'shears' : 'hand';
      return { cur, node: nodeOf(uid), uid };
    }
    case 'ground': { const c = k.cell; return { cur: gardenWalkable(c.x, c.y) && !gardenReachable(c.x, c.y) ? 'no' : 'walk' }; }
    default: return { cur: '' };
  }
}
function _gdpHover(ev) {
  if (!_gdp.svg) return;
  const box = _gdp.root && _gdp.root.querySelector('.gd-stagebox'), status = _gdp.root && _gdp.root.querySelector('.gd-status');
  if (!box) return;
  const onWorld = _gdp.svg.contains(ev.target);
  // fishing locks you in and a pop-up is on top of the garden: nothing under the pointer lights up. Nor does the world under the hotbar or the HUD
  if (_gdpPopOpen() || !onWorld || (typeof _gwFishBusy === 'function' && _gwFishBusy())) { _gdpHighlight(null); _gdpGhostClear(); gardenHoverCardHide(); gameCursor(box, ''); box.dataset.hover = ''; if (status) status.hidden = true; return; }
  const m = gardenHere(), cell = _gdpCellOf(ev), it = _gdpPickItem(ev, cell), tool = _gdpTool(), mode = _gdpMode();
  if (_gdp.carry) return;
  const placing = _gdp.moving ? (_gdp.moving.kind === 'decor' ? (gardenDecorById(m, _gdp.moving.uid) || {}).def : (gardenPlantById(m, _gdp.moving.uid) || {}).def)
    : mode === 'decorate' && _gdp.decor ? gardenDecor(_gdp.decor) : tool === 'seed' && _gdp.seed ? gardenPlant(_gdp.seed) : null;
  if (placing) {
    // placing: the ghost shows where it will go, green or red, and the cursor says the same
    const kind = _gdp.moving ? _gdp.moving.kind : mode === 'decorate' ? 'decor' : 'plant';
    if (cell) _gdpGhost(m, placing, kind, cell.x, cell.y, _gdp.moving && _gdp.moving.uid); else _gdpGhostClear();
    const why = cell ? _gdPlaceOk(m, placing, cell.x, cell.y, kind, _gdp.moving && _gdp.moving.uid) : 'x';
    gameCursor(box, why ? 'no' : kind === 'decor' ? 'grab' : 'trowel');
    _gdpHighlight(null); gardenHoverCardHide(); if (status) status.hidden = true;
    return;
  }
  // a pet under the pointer: a click pats it (97-pets-7roam.js takes the click)
  if (ev.target.closest && ev.target.closest('.ptw')) { gameCursor(box, 'hand'); box.dataset.hover = ''; _gdpHighlight(null); gardenHoverCardHide(); if (status) status.hidden = true; return; }
  const I = _gdpIntent(ev, m, it, cell);
  gameCursor(box, I.cur);
  box.dataset.hover = I.cur === 'door' ? 'prop' : '';
  _gdpHighlight(I.node || null);
  _gdp.hoverUid = I.uid || '';
  if (I.spot) gardenSpotMark(I.spot); else if (_gh.bubble == null) gardenSpotMark(null);
  { const pu = I.uid && gardenPlantById(m, I.uid) && !_gh.bubble ? I.uid : ''; gardenHoverCard(ev, m, pu); }   // (the bubble already says what it is)
  if (status) {
    if (I.label && ev.pointerType !== 'touch') {
      status.textContent = I.label; status.hidden = false;
      const r = box.getBoundingClientRect();
      status.style.transform = `translate(${Math.round(Math.min(r.width - 170, ev.clientX - r.left + 16))}px, ${Math.round(Math.max(4, ev.clientY - r.top - 34))}px)`;
    } else status.hidden = true;
  }
}
function _gdpGhost(m, def, kind, x, y, ignore) {
  const gh = _gdp.svg && _gdp.svg.querySelector('.gd-ghost'); if (!gh) return;
  const why = _gdPlaceOk(m, def, x, y, kind, ignore);
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
    let pr = _gdp.press;
    // the button came up where we could not see it (outside the window, another window): the press is over, whatever it was doing
    if (pr && ev.pointerType === 'mouse' && ev.buttons === 0) { _gdp.press = null; pr = null; if (typeof gardenHoldEnd === 'function') gardenHoldEnd(); if (_gdp.sweep) _gdpSweepEnd(); }
    // a click may wobble a little (a mouse, a trackpad): only more than a few pixels is a drag. A press that wobbled 5 pixels used to be thrown away.
    if (pr && (Math.abs(ev.clientX - pr.x0) > 9 || Math.abs(ev.clientY - pr.y0) > 9)) pr.moved = true;
    if (pr && pr.hold) { if (typeof gardenHoldMove === 'function') gardenHoldMove(ev); return; }   // holding the button on the ground: you keep walking to the pointer
    if (pr && pr.moved) { _gdpDragMove(ev); return; }
    _gdpHover(ev);
  });
  box.addEventListener('pointerleave', () => { if (_gdp.press) return; if (typeof _gw !== 'undefined') _gw.hoverBug = ''; box.dataset.hover = ''; gameCursor(box, ''); gardenHoverCardHide(); _gdpGhostClear(); const st = _gdp.root && _gdp.root.querySelector('.gd-status'); if (st) st.hidden = true; });
  box.addEventListener('pointerleave', () => { _gdpHighlight(null); });
  // right-click a plant or a decoration: its bubble, right there
  box.addEventListener('contextmenu', (ev) => {
    if (!_gdp.svg || !_gdp.svg.contains(ev.target) || _gdpPopOpen() || (typeof _gwFishBusy === 'function' && _gwFishBusy())) return;
    const m = gardenHere(), cell = _gdpCellOf(ev), it = _gdpPickItem(ev, cell);
    ev.preventDefault();
    if (_gdpMode() === 'decorate' || _gdp.moving || _gdpTool() === 'seed') { _gdpEsc(); return; }   // in games a right click puts down what you carry
    const p = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : cell ? _gdpPlantAtCell(m, cell) : null;
    if (p) { _gdp.sel = p.uid; _gdpPaintSel(m); gardenPlantBubble(p, m); return; }
    const d = it && it.kind === 'decor' ? gardenDecorById(m, it.uid) : null;   // paths too: this is how you lift one with your hand free
    if (d) { _gdp.sel = d.uid; _gdpPaintSel(m); gardenDecorBubble(d, m); }
  });
  // two fingers zoom (a pinch), one finger is a click
  const touches = new Map();
  const pinchEnd = (ev) => { touches.delete(ev.pointerId); if (touches.size < 2) _gdp.pinch = null; };
  box.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'touch' && _gdp.svg && _gdp.svg.contains(ev.target)) {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; _gdp.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; _gdp.press = null; _gdp.sweep = null; return; }
    }
    if (_gdp.pinch || ev.button !== 0 || !_gdp.svg || !_gdp.svg.contains(ev.target)) return;
    const cell = _gdpCellOf(ev), it = _gdpPickItem(ev, cell);
    _gdp.press = { x0: ev.clientX, y0: ev.clientY, it, cell, moved: false, id: ev.pointerId };
    const mode = _gdpMode(), tool = _gdpTool();
    if (_gh.bubble) gardenBubbleClose();
    gardenSpotMark(null);
    // a press only arms a sweep: dragging across a row waters (or plants) them all with one Undo; a plain click walks up and does the one
    if (mode === 'tend' && !_gdp.moving && (tool === 'water' || tool === 'seed')) _gdp.sweep = { done: new Set(), n: 0, undo0: _gd.undo.length, tool, last: '' };
    else if (mode === 'tend' && !_gdp.moving && tool === 'hand' && !(typeof _gwFishBusy === 'function' && _gwFishBusy())) {
      const m0 = gardenHere(), pp = it && it.kind === 'plant' ? gardenPlantById(m0, it.uid) : (cell ? _gdpPlantAtCell(m0, cell) : null);
      if (pp && pp.thirsty && !pp.ripe && pp.def.thirst && !m0.rain.now) _gdp.sweep = { done: new Set(), n: 0, undo0: _gd.undo.length, tool: 'water', last: '' };
    }
    // pressing bare ground: you start walking there at once, and keep walking to the pointer for as long as the button is down
    if (!_gdp.sweep && !_gdp.moving && mode !== 'decorate' && tool !== 'seed' && !_gdpPopOpen() && typeof gardenHoldStart === 'function' && typeof gardenWorldPick === 'function') {
      const k = gardenWorldPick(it, cell, ev, gardenHere());
      if (k.kind === 'ground' && gardenHoldStart(ev)) _gdp.press.hold = true;
    }
    try { box.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
  });
  box.addEventListener('pointermove', (ev) => {
    if (!_gdp.pinch || !touches.has(ev.pointerId)) return;
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const [a, b] = [...touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > _gdp.pinch.d * 1.18) { _gdp.pinch.d = d; gardenCamSet(null, -1); } else if (d < _gdp.pinch.d / 1.18) { _gdp.pinch.d = d; gardenCamSet(null, 1); }
  });
  box.addEventListener('pointerup', pinchEnd);
  box.addEventListener('pointercancel', pinchEnd);
  box.addEventListener('pointerup', (ev) => {
    const pr = _gdp.press; _gdp.press = null;
    try { box.releasePointerCapture(ev.pointerId); } catch (e) { /* fine */ }
    if (!pr) return;
    if (pr.hold) { if (typeof gardenHoldEnd === 'function') gardenHoldEnd(); return; }   // the press already walked you there
    if (_gdp.sweep) { if (pr.moved) { _gdpSweepEnd(); return; } _gdp.sweep = null; }
    if (pr.moved && pr.drag) { _gdpDragDrop(ev, pr); return; }
    if (!pr.moved) _gdpClick(pr.it, pr.cell, ev);
  });
  box.addEventListener('pointercancel', () => { _gdp.press = null; if (typeof gardenHoldEnd === 'function') gardenHoldEnd(); if (_gdp.sweep) _gdpSweepEnd(); _gdpGhostClear(); });
  box.addEventListener('lostpointercapture', () => { if (typeof gardenHoldEnd === 'function') gardenHoldEnd(); });
  box.addEventListener('keydown', (ev) => { if (ev.target !== box && ev.target && ev.target.closest && ev.target.closest('button, a, input, select, textarea') && (ev.key === ' ' || ev.key === 'Enter')) return; _gdpKey(ev); });
  box.addEventListener('focus', () => { if (!_gdp.cur) _gdp.cur = { x: 9, y: 6, kb: false }; });
}
function _gdpAct(r) { if (r && !r.ok) _gdpSay(r); return r; }
function _gdpRefreshChromeSoon() { if (_gdp.root) gardenHudPaint(gardenHere()); }
function _gdpClick(it, cell, ev) {
  const m = gardenHere(), mode = _gdpMode(), tool = _gdpTool();
  const at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null;
  // something carried: it goes down here, or it says no
  if (_gdp.moving) {
    if (!cell) return;
    const { uid, kind } = _gdp.moving, r = kind === 'decor' ? gardenMoveDecor(uid, cell.x, cell.y) : gardenMovePlant(uid, cell.x, cell.y);
    if (!r.ok) { gameDenyOf(r, null, { at }); return; }
    gardenMoveEnd(); gameCheer(null, { at, quiet: false });
    return;
  }
  if (mode === 'decorate') {
    if (_gdp.decor && cell) {
      const r = gardenPlaceDecor(_gdp.decor, cell.x, cell.y, 0);
      if (!r.ok) { gameDenyOf(r, null, { at }); return; }
      gameCheer(null, { at });
      gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 1.3 }, null, { radius: 3 });
      if (gardenHas('decor:' + _gdp.decor) < 1) { _gdp.decor = ''; _gdpPickTool('hand'); } else gardenHudPaint(gardenHere());
      return;
    }
    _gdpPickTool('hand');
    return;
  }
  if (tool === 'seed') {
    // a click on a building still goes to the building; anywhere else the seed goes in, once you have walked over
    if (typeof gardenWorldClick === 'function' && gardenWorldClick(it, cell, ev, m)) return;
    if (!cell || !_gdp.seed) { gameDeny(null, { kind: 'bag', at, say: 'Pick a seed first.' }); return; }
    const def = gardenPlant(_gdp.seed), why = def ? _gdPlaceOk(m, def, cell.x, cell.y, 'plant') : 'No seed';
    if (m.visit && m.visit.no.plant) { gardenVisitDenied('plant'); return; }   // your level there: the padlock, and one tap asks for more
    if (why) { gameDenyOf({ ok: false, msg: why }, null, { at, kind: /level|buy this land/i.test(why) ? undefined : 'tool' }); return; }
    const id = _gdp.seed, c = { x: cell.x, y: cell.y };
    if (!gardenWalkAct({ x: c.x + 0.5, y: c.y + 1.3 }, () => {
      const r = gardenPlantAt(id, c.x, c.y);
      if (!r.ok) gameDenyOf(r, null, { at });
      else if (gardenHas('seed:' + id) < 1) { _gdp.seed = ''; _gdpPickTool('hand'); }
    }, { radius: 2.5, face: c, near: 74 })) gameDeny(null, { at, say: 'You cannot get there.' });
    return;
  }
  if (typeof gardenWorldClick === 'function') gardenWorldClick(it, cell, ev, m);
}
/** The tool in your hand, on a plant or a decoration you have walked up to. */
function _gdpActOn(uid) {
  const m = gardenHere(), tool = _gdpTool(), p = gardenPlantById(m, uid), d = p ? null : gardenDecorById(m, uid);
  const node = _ghNodeOf(uid);
  _gdp.sel = uid; _gdpPaintSel(m);
  if (d) {
    if (tool === 'dig') { const r = gardenRemoveDecor(d.uid); if (!r.ok) gameDenyOf(r, node); _gdp.sel = ''; return; }
    if (tool !== 'hand') { gameDeny(node, { kind: 'tool', say: 'That tool is for plants.' }); return; }
    const ci = gardenCollectInfo(d.uid, m);
    if (ci && ci.ready) { const r = gardenCollect(d.uid); if (!r.ok) gameDenyOf(r, node); return; }
    if (d.def.effect && d.def.effect.kind === 'show') { if (m.visit) gardenPopupOpen('visit'); else gardenCatchOpen('show'); return; }   // the aquarium, the bug case and the trophy board open your showcase (a friend's: what they show)
    gardenDecorBubble(d, m);
    return;
  }
  if (!p) return;
  let r = null;
  switch (tool) {
    case 'water': r = gardenWater(p.uid); if (!r.ok) gameDenyOf(r, node, { kind: /can is empty/i.test(r.msg) ? 'water' : 'tool' }); break;
    case 'feed': r = gardenFeed(p.uid); if (!r.ok) gameDenyOf(r, node, { kind: 'tool' }); break;
    case 'trim': r = gardenPrune(p.uid); if (!r.ok) gameDenyOf(r, node, { kind: 'tool' }); break;
    case 'dig': r = gardenDig(p.uid); if (!r.ok) gameDenyOf(r, node, { kind: 'tool' }); else _gdp.sel = ''; break;
    default: _gdpSmartPlant(p, m);
  }
}
/** A click on a plant with nothing in your hand does what it needs: ripe is picked, thirsty is watered, wild is trimmed; a happy one offers its bubble. */
function _gdpSmartPlant(p, m) {
  const node = _ghNodeOf(p.uid);
  if (p.def.special !== 'heart') {
    let r = null;
    if (p.ripe) r = gardenHarvest(p.uid);
    else if (p.thirsty && p.def.thirst && !m.rain.now) r = gardenWater(p.uid);
    else if (p.overgrown && p.stage >= 3) r = gardenPrune(p.uid);
    if (r) { if (!r.ok) gameDenyOf(r, node, /can is empty/i.test(r.msg) ? { kind: 'water' } : undefined); return; }
  }
  gardenPlantBubble(p, m);
}
function _gdpPlantAtCell(m, cell) { const c = m.occ.get(cell.x + ',' + cell.y); return c && c.plant ? gardenPlantById(m, c.plant) : null; }
/** The watering can or a seed dragged across the beds: each plant (or cell) once, one Undo for the whole sweep. */
function _gdpSweepAt(ev) {
  const sw = _gdp.sweep; if (!sw) return;
  const m = gardenHere(), cell = _gdpCellOf(ev); if (!cell) return;
  if (sw.tool === 'water') {
    const it = _gdpItemOf(ev), p = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, cell);
    if (!p || sw.done.has(p.uid)) return;
    sw.done.add(p.uid);
    const r = gardenWater(p.uid, { quiet: true });
    if (r.ok) { sw.n++; _gdpSplash(p); } else gameDenyOf(r, _ghNodeOf(p.uid), { silent: true, at: { x: ev.clientX, y: ev.clientY }, kind: /can is empty/i.test(r.msg) ? 'water' : 'tool' });
  } else {
    const k = cell.x + ',' + cell.y; if (sw.done.has(k) || !_gdp.seed) return;
    sw.done.add(k);
    const r = gardenPlantAt(_gdp.seed, cell.x, cell.y, { quiet: true });
    if (r.ok) sw.n++; else gameDenyOf(r, null, { silent: true, at: { x: ev.clientX, y: ev.clientY } });
  }
}
function _gdpSweepEnd() {
  const sw = _gdp.sweep; _gdp.sweep = null;
  if (!sw) return;
  if (!sw.n || (typeof gardenVisitOn === 'function' && gardenVisitOn())) return;   // (on a visit there are no steps of yours to fold: the host keeps its own)
  // fold the sweep's steps into one Undo (the pill by the hotbar)
  const steps = _gd.undo.splice(sw.undo0);
  const mark = []; for (const u of steps) mark.push(...u.mark);
  _gdPushUndo(sw.tool === 'water' ? `watering ${sw.n} plant${sw.n === 1 ? '' : 's'}` : `planting ${sw.n} seed${sw.n === 1 ? '' : 's'}`, mark);
  if (sw.tool === 'seed' && gardenHas('seed:' + _gdp.seed) < 1) { _gdp.seed = ''; _gdpPickTool('hand'); }
  _gdpRefreshChromeSoon();
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
  if (!pr.it || pr.it.ground && _gdpTool() !== 'hand') return;
  if (_gdpTool() !== 'hand' && _gdpMode() !== 'decorate') return;
  pr.drag = true;
  const m = gardenHere(), cell = _gdpCellOf(ev); if (!cell) return;
  const isPlant = pr.it.kind === 'plant';
  const it = isPlant ? gardenPlantById(m, pr.it.uid) : gardenDecorById(m, pr.it.uid); if (!it) return;
  const node = _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(pr.it.uid)}"]`);
  if (node) node.classList.add('is-lifted');
  const gh = _gdp.svg.querySelector('.gd-ghost'), W = GARDEN_WORLD;
  const why = _gdPlaceOk(m, it.def, cell.x, cell.y, isPlant ? 'plant' : 'decor', pr.it.uid);
  const fw = isPlant ? it.def.fp || 1 : it.def.w || 1, fh = isPlant ? it.def.fp || 1 : it.def.h || 1;
  if (gh) gh.innerHTML = `<rect class="gd-ghostcell${why ? ' is-bad' : ''}" x="${cell.x * W.cellW + 1}" y="${W.sky + cell.y * W.cellH + 1}" width="${fw * W.cellW - 2}" height="${fh * W.cellH - 2}" rx="4"/>`;
  pr.target = cell;
  gameCursor(_gdp.root.querySelector('.gd-stagebox'), why ? 'no' : 'grab');
}
function _gdpDragDrop(ev, pr) {
  const node = _gdp.svg && _gdp.svg.querySelector('.gd-it.is-lifted'); if (node) node.classList.remove('is-lifted');
  _gdpGhostClear();
  const cell = pr.target; if (!cell || !pr.it) return;
  const r = pr.it.kind === 'plant' ? gardenMovePlant(pr.it.uid, cell.x, cell.y) : gardenMoveDecor(pr.it.uid, cell.x, cell.y);
  if (r.ok) { _gdp.sel = pr.it.uid; gameCheer(null, { at: { x: ev.clientX, y: ev.clientY } }); } else gameDenyOf(r, null, { at: { x: ev.clientX, y: ev.clientY } });
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
  const cell = _gdpCellOf(ev), m = gardenHere();
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
  const at = { x: ev.clientX, y: ev.clientY };
  if (r.ok) gameCheer(null, { at }); else gameDenyOf(r, null, { at });
}
function _gdpCarryEnd() {
  window.removeEventListener('pointermove', _gdpCarryMove);
  document.documentElement.classList.remove('gd-carrying');
  if (_gdp.carry) { _gdp.carry = null; _gdpGhostClear(); }
}

/* ---------- keyboard ---------- */
function _gdpKey(ev) {
  if (ev.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName)) return;
  if (_gdpPopOpen()) return;   // a pop-up is open: its own keys
  if (ev.key === 'Escape' && typeof _gwFishBusy === 'function' && (_gwFishBusy() || _gw.netting)) { ev.preventDefault(); ev.stopPropagation(); if (_gwFishBusy()) _gwFishCancel(); _gw.netting = null; return; }
  if (typeof gardenWorldKey === 'function' && gardenWorldKey(ev, true, _gdpMode() === 'decorate')) return;   // 2.22: you walk, the camera zooms (while decorating only the arrows walk: R, S and Delete are yours)
  const m = gardenHere(), mode = _gdpMode();
  if (ev.key === 'Enter') { ev.preventDefault(); gardenWorldInteract(); return; }
  if (/^[1-9]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey) { if (gardenSlotKey(Number(ev.key))) ev.preventDefault(); return; }
  const k = ev.key.toLowerCase();
  if (k === 'b' && !ev.ctrlKey && !ev.metaKey) { gardenSlotPick('bag'); ev.preventDefault(); return; }
  if (k === 'w' && ev.shiftKey && !ev.ctrlKey && !ev.metaKey) { _gdpAct(gardenWaterAll()); ev.preventDefault(); return; }   // W alone walks, Shift+W waters it all
  if (k === 'h' && !ev.ctrlKey && !ev.metaKey) { _gdpAct(gardenHarvestAll()); ev.preventDefault(); return; }
  if (ev.key === 'Delete' && mode !== 'decorate' && _gdp.sel) { const sp = gardenPlantById(m, _gdp.sel); if (sp && sp.def.special !== 'heart') { _gdpAct(gardenDig(sp.uid)); _gdp.sel = ''; ev.preventDefault(); return; } }
  if (mode === 'decorate' && _gdp.sel) {
    const d = gardenDecorById(m, _gdp.sel);
    if (k === 'r' && d) { _gdpAct(gardenRotateDecor(d.uid), true); ev.preventDefault(); return; }
    if (k === 's' && d) { _gdpAct(gardenStyleDecor(d.uid), true); ev.preventDefault(); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && d) { _gdpAct(gardenRemoveDecor(d.uid)); _gdp.sel = ''; ev.preventDefault(); return; }
  }
  if (ev.key === 'Escape' && _gdpEsc()) { ev.preventDefault(); ev.stopPropagation(); }
}
/** Esc or a right click: put down whatever you are holding. True when there was something. */
function _gdpEsc() {
  if (_gdp.moving) { gardenMoveEnd(); return true; }
  if (_gh.bubble) { gardenBubbleClose(); gardenSpotMark(null); return true; }
  if (_gh.bag) { _gh.bag = false; _ghBag(); _gh.bar = ''; gardenHudPaint(gardenHere()); return true; }
  if (_gdp.sel || _gdp.decor || _gdpTool() !== 'hand') { _gdp.sel = ''; _gdp.decor = ''; _gdpPickTool('hand'); return true; }
  return false;
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

/* ---------- bits the panels and the hotbar use ---------- */
/* Other parts of the garden still call this after a change: it has nothing of its own to paint now, the HUD does it all. */
function _gdpPaintSide() { if (_gdp.root && _gdp.root.isConnected) gardenHudPaint(gardenHere()); }
function _gdpToday(el, m) {
  const rows = gardenDailyTasks(m), qs = gardenWeekQuests(m);
  const h = _gdpEl('div', 'gd-today-h');
  h.appendChild(_gdpEl('b', null, 'Goals'));
  const note = _gdpWeatherNote(m); if (note) h.appendChild(_gdpEl('span', 'gd-wx muted', note));
  el.appendChild(h);
  const list = _gdpEl('div', 'gd-tasks');
  const task = (t, week) => {
    const c = _gdpEl('div', 'gd-task' + (t.done ? ' is-done' : ''));
    const pct = Math.round(t.have / t.n * 100);
    c.innerHTML = `<span class="gd-ring" style="--p:${pct}">${icon(t.done ? 'check' : t.def.icon)}</span><span class="gd-task-t"><b></b><small class="muted"></small></span>`;
    c.querySelector('b').textContent = t.label;
    const pay = week ? t.def.c : gardenDailyCoins(t.def);
    c.querySelector('small').textContent = t.done ? `Done · +${pay} coins` : `${Math.min(t.have, t.n)} of ${t.n} · +${pay} coins${week ? ' · this week' : ''}`;
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
function _gdpAgo(ms) { const h = ms / 3600000; return h < 1 ? 'within the hour' : h < 24 ? Math.round(h) + ' hours ago' : Math.round(h / 24) + ' days ago'; }
function _gdpEffectText(def) {
  const e = def.effect; if (!e) return '';
  return ({ can: `+${e.n} water in the can every day`, sprinkler: 'Waters the cells around it every morning', pond: 'Frogs and dragonflies come to it', birds: 'Birds come to visit', bugs: 'Ladybirds and bees move in', hedgehog: 'A hedgehog may come at dusk', hive: 'Honey every two days while three flowers bloom', compost: 'One bag of fertiliser a day', light: 'Glows at night; moths and bats come', sit: 'A seat: someone’s cat may borrow it', show: 'Shows your best catches; friends see it when they visit', luck: 'Brings luck: rare finds come a little more often', wish: 'One wish a day (a coin in, sometimes a seed back)', cold: 'Plants beside it grow as if it were their season', scare: 'A little extra at harvest nearby', shed: 'A place for your tools', hedge: 'A wren may move in' })[e.kind] || '';
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
