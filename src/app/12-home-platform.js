/* ============================================================
   HOME WIDGET PLATFORM. Owner: Home foundation (W0-A, 3 Oct).
   The shared building blocks every Home widget uses (WIDGETS_CATALOGUE.md 4.1),
   so a widget file stays small and they all behave alike. Loads before
   12-home.js (build order), so this file only declares things.

   CATALOGUE EXTRAS (registerHomeWidget fields, see 12-home.js)
     group: 'time'|'tasks'|'people'|'money'|'files'|'wellbeing'|'fun'|'system'
                            Add widget groups "Not on Home" by it (HOME_GROUPS)
     multi: 4               how many copies Home may hold (default 1). Copy ids are
                            '<id>~<n>' (n = 2..multi); the first copy is the bare id.
     aliases: [...]         words for it (the gallery's filter; the server's
                            lib/home-topbar.mjs HOME_WIDGETS has the same list)
     fresh: true            a "New" badge in Add widget until the user has looked at it
     defaults: {...}        its settings when nothing is saved (homePrefs)
     sample(kit)            optional: sample data for the gallery preview (homeSample)

   COPIES
     ctx.instance / ctx.id  the copy's id ('runway~2'); ctx.baseId 'runway'; ctx.copy 2
     homeBaseId(id), homeCopyNo(id), homeInstanceIds(base), homeInstancesShown(base)
     homeWidgetAddCopy(base, size)   the gallery's "Add another"
     homeWidgetRemoveCopy(id)        a copy's minus in Customise (its settings go too; Undo)
     A copy exists while it is in the layout or has a widgetPrefs entry, so an older
     build that drops copy ids loses nothing (lib/home-topbar.mjs normalizeHomeLayout).

   SETTINGS (data: state.home.widgetPrefs[instanceId]; saveData, one undo step)
     homePrefs(ctx|id)                    defaults + saved, a fresh copy (shallow merge:
                                          set a nested object whole)
     homeSetPrefs(ctx|id, patch, msg)     null = back to the default; false when nothing
                                          changed (a re-click saves nothing); 4 KB per copy
     homeSettingsMenu(anchor, ctx, fields)   a ready-made settings popover:
                                          fields [{key, label, type:'toggle'|'choice'|'number'|'text',
                                          choices:[[value, label]], min, max, step, hint, placeholder}]
     homeSettingsButton(ctx)              a gear button that opens def.settings (for a widget header)
     Assistants: set_home_widget (server schema: HOME_WIDGET_PREFS in lib/home-topbar.mjs).

   DATA, TICKS, ACTIONS
     homeData(key, urlOrLoader, {maxAge, ctx|wid, sig})
                            -> {status:'loading'|'ok'|'empty'|'error', data, at, error, loading, offline?}
                            One request in flight per key; stale data while it refreshes;
                            never awaited in render(); nothing fetched in a preview or while
                            the server is down; repaints the widgets that asked (homeRerenderWidget)
                            only when the result changed. sig: refetch when it differs (e.g.
                            state._lastSave). A URL answering 404/204, null, or {status:'empty'} = 'empty'.
                            homeDataRefresh(key) fetches again now; homeDataPeek(key).
     homeTick(ctx|wid, fn)  one shared timer on the minute; paused while the tab is hidden,
                            stopped when Home is left; fn(now) updates text in place or
                            returns 'rerender'. Nothing in a preview. Call it from render().
     homeAction(btn, run|ops, {done, toast, undo, say, wid})
                            one click: busy (aria-busy, disabled) -> done (data-done, label
                            `done`), so a re-click does nothing; `toast` with Undo (`undo:
                            true` = the page's undo(), or a function); errors: netErrorMessage,
                            the button comes back, the toast offers Try again. run(btn) may
                            return a Promise; false = nothing happened. An array = server ops
                            (homeOps). After a save Home repaints: draw the done state from the data.
     homeOps(ops, {done, wid, client})   ops through POST /api/actions (validation, history,
                            undo by token) as client 'home:<wid>'; the toast offers Undo.
     actionsApply(ops, o) / actionsUndo(token, o)   the same for any page (the palette uses it)

   SMALL THINGS
     homeMemo(key, sig, fn), homeMemoSig({minute, extra})   memoised derived models
     homeSample(key)        sample content for previews: the widget's own sample(kit), else
                            a shared kit entry: tasks, people, events, emails, money, history,
                            resources, habits, countdown, note (synthetic, relative to today)
     homeRowKeys(el, {open, done, today, tomorrow, keys})   the shared row keys on rows
                            [data-row] (tabindex 0): Enter open, X main action, T today,
                            ] tomorrow, Up/Down move. homeRowAttrs(id, label) writes them.
     qaChipsHtml(parsed, removable, known), qaSuggest(sigil, q, raw)   the quick-add parser's
                            chips and #/@ suggestions (never write a second parser)
     homeAmountsHidden(), homeSetAmountsHidden(on), homeAmtHtml(text)   "Hide amounts"
                            (UI key homeUI.hideAmounts; .hg-amt blurs, hover/focus shows)
     homeSuggestSlot(el, ctx, context) / registerHomeSuggestProvider(fn)   one suggestion at
                            the foot of a widget (M and up). Nothing until the suggestions
                            engine registers a provider: fn({wid, baseId, size, context}) -> Element|null.
                            The user's rule (3 Oct): a suggestion's main click opens the normal
                            editor prefilled; a small check applies it as-is, with Undo.
   ============================================================ */

/* ---------- groups and words (catalogue extras) ---------- */
const HOME_GROUPS = Object.freeze([
  ['time', 'Time'], ['tasks', 'Tasks'], ['people', 'People'], ['money', 'Money'], ['files', 'Files & knowledge'],
  ['wellbeing', 'Wellbeing'], ['fun', 'Fun'], ['system', 'Trust & system'], ['other', 'More'],
]);
// The widgets that came before the platform: their group and words (the server's
// lib/home-topbar.mjs HOME_WIDGETS has the same; tests/home-platform.test.mjs compares).
const _HOME_GROUP_OF = Object.freeze({ today: 'time', focus: 'tasks', schedule: 'time', links: 'files', finance: 'money', people: 'people', countdowns: 'time', week: 'time', waiting: 'people' });
const _HOME_ALIASES = Object.freeze({
  today: ['summary', 'hero', 'today summary', 'today hero', 'start my day'],
  focus: ['focus tasks', 'important tasks', 'tasks', 'focus board'],
  schedule: ['schedule', 'timeline', 'calendar', 'agenda', 'events', 'today schedule', 'today timeline'],
  links: ['links', 'suggested links', 'auto-links'],      // 'suggestions' is the Suggestions widget's (12-home-w-suggest.js)
  finance: ['finances', 'finance', 'money', 'spending', 'budget', 'spent today'],
  people: ['people', 'follow up', 'follow-up', 'follow ups', 'follow-ups', 'who i am meeting', 'meetings with people'],
  countdowns: ['countdown', 'deadlines', 'dates'],
  week: ['week', 'week strip', 'upcoming', 'next 7 days'],
  waiting: ['waiting', 'blocked', 'waiting on others', 'chase', 'things to chase'],
});
function homeGroupOf(d) {
  const g = d && d.group;
  return HOME_GROUPS.some(x => x[0] === g) ? g : ((d && _HOME_GROUP_OF[d.id]) || 'other');
}
function homeGroupLabel(g) { const x = HOME_GROUPS.find(y => y[0] === g); return x ? x[1] : 'More'; }
function homeAliasesOf(d) {
  const a = d && Array.isArray(d.aliases) ? d.aliases : (d && _HOME_ALIASES[d.id]) || [];
  return a.filter(x => typeof x === 'string' && x);
}
function _homeMultiOf(d) {
  const n = Math.round(Number(d && d.multi));
  return Number.isFinite(n) && n > 1 ? Math.min(n, 9) : 1;
}

/* ---------- copies ---------- */
const _HOME_COPY_RE = /^(.+)~([2-9]|[1-9]\d)$/;      // same rule as lib/home-topbar.mjs splitHomeInstance
function homeBaseId(id) { const m = _HOME_COPY_RE.exec(String(id == null ? '' : id)); return m ? m[1] : String(id == null ? '' : id); }
function homeCopyNo(id) { const m = _HOME_COPY_RE.exec(String(id == null ? '' : id)); return m ? Number(m[2]) : 1; }
/** Every id a widget may use: [base, base~2, ... base~multi]. */
function homeInstanceIds(baseId) {
  const d = homeWidgetDefs().find(x => x.id === baseId);
  const n = d ? _homeMultiOf(d) : 1;
  return [baseId, ...Array.from({ length: n - 1 }, (_, i) => `${baseId}~${i + 2}`)];
}
/** The copies of a widget shown on Home, in board order. */
function homeInstancesShown(baseId) { return homeLayout().widgets.filter(w => !w.hidden && homeBaseId(w.id) === baseId).map(w => w.id); }
/** Add the next copy of a widget (the gallery's "Add another"): the first one not shown. Returns its id, or false. */
function homeWidgetAddCopy(baseId, size) {
  const def = homeWidgetDef(baseId);
  if (!def || def.multi < 2) return false;
  const all = homeLayout().widgets;
  const shown = new Set(all.filter(w => !w.hidden).map(w => w.id));
  const id = homeInstanceIds(baseId).find(x => !shown.has(x));
  if (!id) { homeAnnounce(`${def.title}: all ${def.multi} copies are already on Home`); return false; }
  const prefs = Object.assign({}, homeState().widgetPrefs || {});
  if (id !== baseId && !Object.prototype.hasOwnProperty.call(prefs, id)) prefs[id] = {};   // a copy exists while it has an entry
  const me = all.find(w => w.id === id) || { id, size: def.defaultSize, hidden: false };
  const next = all.filter(w => w.id !== id).concat([Object.assign({}, me, { hidden: false }, size && def.sizes.includes(size) ? { size } : {})]);
  _homeAdded = id; _homeEditFocusId = id;
  _homeEntry.painted.delete(id);
  const cd = homeWidgetDef(id);
  homeSaveLayout(next, { prefs, say: `${cd ? cd.title : def.title} added` });
  return id;
}
/** Remove a copy (2..multi) and its settings: one undo step. */
function homeWidgetRemoveCopy(id) {
  const def = homeWidgetDef(id);
  if (!def || def.copy < 2) return false;
  const prefs = Object.assign({}, homeState().widgetPrefs || {});
  delete prefs[id];
  const vis = typeof _homeVisibleIds === 'function' ? _homeVisibleIds() : [];
  const i = vis.indexOf(id);
  _homeEditFocusId = vis[i + 1] || vis[i - 1] || null;
  _homeEntry.painted.delete(id);
  return homeSaveLayout(homeLayout().widgets.filter(w => w.id !== id), { prefs, toast: `${def.title} removed`, say: `${def.title} removed` });
}

/* ---------- settings (state.home.widgetPrefs) ---------- */
const HOME_PREFS_MAX_BYTES = 4096;                    // = lib/home-topbar.mjs HOME_WIDGET_PREFS_MAX_BYTES
function _homeClone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function _homePrefsId(x) { return typeof x === 'string' ? x : (x && (x.instance || x.id)) || ''; }
function _homeDefaultsOf(id) {
  const raw = homeWidgetDefs().find(d => d.id === homeBaseId(id));
  if (!raw || raw.defaults == null) return {};
  try { const v = typeof raw.defaults === 'function' ? raw.defaults() : raw.defaults; return v && typeof v === 'object' ? _homeClone(v) : {}; }
  catch (e) { console.error(`[home] defaults of "${raw.id}" failed`, e); return {}; }
}
/** A widget copy's settings: its defaults, then what is saved (a fresh object each call). */
function homePrefs(ctxOrId) {
  const id = _homePrefsId(ctxOrId);
  const all = homeState().widgetPrefs;
  const saved = all && typeof all === 'object' ? all[id] : null;
  return Object.assign(_homeDefaultsOf(id), saved && typeof saved === 'object' && !Array.isArray(saved) ? _homeClone(saved) : {});
}
/**
 * Change a widget copy's settings: patch {key: value}, null = back to the default.
 * One saveData (undo step) and a Home render; msg = a toast with Undo. Returns false
 * (and saves nothing) when nothing changed or the settings would pass 4 KB.
 */
function homeSetPrefs(ctxOrId, patch, msg) {
  const id = _homePrefsId(ctxOrId);
  if (!id || !patch || typeof patch !== 'object') return false;
  const all = Object.assign({}, homeState().widgetPrefs || {});
  const had = Object.prototype.hasOwnProperty.call(all, id);
  const before = had && all[id] && typeof all[id] === 'object' ? all[id] : {};
  const cur = Object.assign({}, before);
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype' || v === undefined) continue;
    if (v === null) delete cur[k]; else cur[k] = _homeClone(v);
  }
  const keep = Object.keys(cur).length > 0 || homeCopyNo(id) > 1;   // a copy keeps {} (it exists while it has an entry)
  if (JSON.stringify(cur) === JSON.stringify(before) && keep === had) return false;
  const json = JSON.stringify(cur);
  const bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(json).length : json.length;
  if (bytes > HOME_PREFS_MAX_BYTES) { toast('Those settings are too large to save', { kind: 'err' }); return false; }
  if (keep) all[id] = cur; else delete all[id];
  homeUpdate({ widgetPrefs: Object.keys(all).length ? all : undefined }, msg || null);
  return true;
}
/** A gear for a widget's own header (outside Customise): opens def.settings(anchor, ctx). */
function homeSettingsButton(ctx, label) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm hg-gear'; b.dataset.act = 'settings';
  b.innerHTML = icon('sliders-horizontal');
  const t = label || `${(ctx && ctx.def && ctx.def.title) || 'Widget'} settings`;
  b.setAttribute('aria-label', t); b.setAttribute('data-tip', 'Settings'); b.setAttribute('aria-haspopup', 'dialog');
  b.onclick = (e) => { e.stopPropagation(); homeOpenSettings(ctx, b); };
  return b;
}
function homeOpenSettings(ctx, anchor) {
  const def = ctx && ctx.def;
  if (!def || typeof def.settings !== 'function' || (ctx && ctx.preview)) return;
  try { def.settings(anchor, ctx); } catch (e) { console.error(`[home] settings of "${def.id}" failed`, e); }
}
/**
 * A ready-made settings popover. Each change saves at once (one undo step; a choice
 * already picked does nothing). Text and number fields save on Enter or when they lose focus.
 */
function homeSettingsMenu(anchor, ctx, fields, o) {
  o = o || {};
  const id = _homePrefsId(ctx);
  return openPopover(anchor, (el, close) => {
    el.classList.add('hg-set');
    const title = o.title || `${(ctx && ctx.def && ctx.def.title) || 'Widget'} settings`;
    el.innerHTML = `<div class="hg-set-h">${icon((ctx && ctx.def && ctx.def.icon) || 'sliders-horizontal')}<b>${esc(title)}</b></div>`;
    const paint = () => {
      for (const x of el.querySelectorAll('.hg-set-row')) x.remove();
      const p = homePrefs(id);
      for (const f of fields || []) {
        if (!f || !f.key) continue;
        const row = document.createElement('div'); row.className = 'hg-set-row'; row.dataset.key = f.key;
        const lab = document.createElement('div'); lab.className = 'hg-set-l';
        lab.innerHTML = `<span>${esc(f.label || f.key)}</span>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}`;
        row.appendChild(lab);
        const v = p[f.key];
        // Saved: the rows repaint; keyboard focus comes back to the same control (the picked choice).
        const save = (val) => {
          if (!homeSetPrefs(id, { [f.key]: val })) return;
          paint();
          const r = el.querySelector(`.hg-set-row[data-key="${CSS.escape(f.key)}"]`);
          const to = r && (r.querySelector('[aria-checked="true"].on, .switch, input') || r.querySelector('button'));
          if (to) try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ }
        };
        if (f.type === 'toggle') {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'switch' + (v ? ' on' : '');
          b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', v ? 'true' : 'false'); b.setAttribute('aria-label', f.label || f.key);
          b.onclick = () => save(!v);
          row.appendChild(b);
        } else if (f.type === 'choice') {
          const seg = document.createElement('span'); seg.className = 'seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', f.label || f.key);
          for (const [val, txt] of f.choices || []) {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = txt;
            const on = JSON.stringify(val) === JSON.stringify(v);
            b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
            if (on) b.classList.add('on');
            b.onclick = () => { if (!on) save(val); };          // the current choice does nothing
            seg.appendChild(b);
          }
          row.appendChild(seg);
        } else {
          const inp = document.createElement('input'); inp.className = 'input input-sm';
          inp.type = f.type === 'number' ? 'number' : 'text';
          if (f.type === 'number') { if (f.min != null) inp.min = f.min; if (f.max != null) inp.max = f.max; if (f.step != null) inp.step = f.step; }
          if (f.placeholder) inp.placeholder = f.placeholder;
          inp.value = v == null ? '' : String(v);
          inp.setAttribute('aria-label', f.label || f.key);
          const commit = () => {
            let val = inp.value.trim();
            if (f.type === 'number') {
              if (val === '') val = null;
              else { val = Number(val); if (!Number.isFinite(val)) return; if (f.min != null) val = Math.max(f.min, val); if (f.max != null) val = Math.min(f.max, val); }
            } else if (val === '') val = null;
            if (JSON.stringify(val) !== JSON.stringify(v == null ? null : v)) save(val);
          };
          inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } };
          inp.onchange = commit;
          row.appendChild(inp);
        }
        el.appendChild(row);
      }
    };
    paint();
    if (o.foot) { const f = document.createElement('div'); f.className = 'hg-set-foot'; f.textContent = o.foot; el.appendChild(f); }
  }, { width: o.width || 320, align: 'end', className: 'hg-set-pop' });
}

/* ---------- remote data ---------- */
const _homeDataCache = new Map();     // key -> {status, data, at, error, loading, sig, src, subs, fp}
function _homeDataEntry(key) {
  let e = _homeDataCache.get(key);
  if (!e) { e = { status: 'loading', data: null, at: 0, error: null, loading: false, sig: undefined, src: null, subs: new Set(), fp: '' }; _homeDataCache.set(key, e); }
  return e;
}
function _homeDataView(e, preview) {
  // While a refresh runs the last answer stands; 'loading' only before the first one.
  const v = { status: e.at || e.data != null ? e.status : (e.error ? 'error' : 'loading'), data: e.data, at: e.at, error: e.error, loading: e.loading, preview: !!preview };
  if (typeof e.src === 'string' && _homeDataOffline()) v.offline = true;
  return v;
}
function homeData(key, src, o) {
  o = o || {};
  const ctx = o.ctx || null;
  const preview = !!(o.preview || (ctx && ctx.preview));
  const wid = o.wid || (ctx && !preview ? ctx.id : null);
  const e = _homeDataEntry(String(key));
  if (src) e.src = src;
  if (wid && !preview) e.subs.add(wid);
  if (preview) return _homeDataView(e, true);
  const maxAge = o.maxAge == null ? 60000 : Number(o.maxAge);
  const stale = !e.at || Date.now() - e.at >= maxAge || (o.sig !== undefined && o.sig !== e.sig);
  if (stale && !e.loading && e.src) _homeDataFetch(e, o.sig);
  return _homeDataView(e, false);
}
function homeDataPeek(key) { const e = _homeDataCache.get(String(key)); return e ? _homeDataView(e, false) : null; }
/** Fetch again now (e.g. after an update finished); the widgets that asked repaint when it changes. */
function homeDataRefresh(key) {
  const e = _homeDataCache.get(String(key));
  if (!e || !e.src) return;
  e.at = 0;
  if (!e.loading) _homeDataFetch(e, e.sig);
}
/** Refresh the cached read-only data used by widgets currently on Home. */
function homeDataRefreshVisible() {
  const jobs = [];
  for (const e of _homeDataCache.values()) {
    if (!e.src || e.loading || !e.subs.size) continue;
    e.at = 0;
    const job = _homeDataFetch(e, e.sig);
    if (job) jobs.push(job);
  }
  return Promise.allSettled(jobs);
}
function _homeDataOffline() { return typeof _serverAvailable !== 'undefined' && _serverAvailable === false; }
function _homeDataFetch(e, sig) {
  // No server (yet: the first render runs before the health check): stay as we are; the
  // next render after it answers fetches. The view says offline; the offline banner explains.
  if (_homeDataOffline() && typeof e.src === 'string') return;
  e.loading = true;
  const src = e.src;
  const p = typeof src === 'function' ? new Promise((res) => res(src())) : fetch(src, { cache: 'no-store', headers: { Accept: 'application/json' } }).then(async (r) => {
    if (r.status === 404 || r.status === 204) return null;
    const j = await r.json().catch(() => null);
    if (!r.ok) { const err = new Error((j && j.error && (j.error.message || j.error)) || `HTTP ${r.status}`); err.status = r.status; throw err; }
    return j;
  });
  p.then((data) => {
    e.data = data === undefined ? null : data;
    e.status = data == null || (data && typeof data === 'object' && data.status === 'empty') ? 'empty' : 'ok';
    e.error = null;
  }, (err) => {
    e.error = typeof netErrorMessage === 'function' ? netErrorMessage(err) : String((err && err.message) || err);
    if (e.data == null) e.status = 'error';               // keep showing the last good answer
  }).then(() => {
    e.loading = false; e.at = Date.now(); e.sig = sig;
    let fp;
    try { fp = e.status + '#' + (e.error || '') + '#' + JSON.stringify(e.data); } catch (x) { fp = String(Math.random()); }
    if (fp !== e.fp) { e.fp = fp; _homeDataNotify(e); }
  });
  return p;
}
function _homeDataNotify(e) {
  if (typeof state === 'undefined' || state.view !== 'home' || typeof document === 'undefined') return;
  for (const wid of [...e.subs]) {
    const frame = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(wid)}"]`);
    if (!frame) { e.subs.delete(wid); continue; }
    try { homeRerenderWidget(wid); } catch (x) { console.error(`[home] repaint of "${wid}" failed`, x); }
  }
}
/** Home was left: nobody is listening any more (the cached answers stay for next time). */
function _homeDataForget() { for (const e of _homeDataCache.values()) e.subs.clear(); }

/* ---------- the minute tick ---------- */
const _homeTicks = new Map();         // wid -> fn(now)
let _homeTickTimer = 0;
let _homeTickBound = false;
function homeTick(ctxOrWid, fn) {
  const ctx = ctxOrWid && typeof ctxOrWid === 'object' ? ctxOrWid : null;
  if (ctx && ctx.preview) return () => {};
  const wid = ctx ? ctx.id : String(ctxOrWid || '');
  if (!wid || typeof fn !== 'function') return () => {};
  _homeTicks.set(wid, fn);
  _homeTickArm();
  return () => { if (_homeTicks.get(wid) === fn) _homeTicks.delete(wid); };
}
function _homeTickArm() {
  if (typeof document === 'undefined' || typeof setTimeout !== 'function') return;
  if (!_homeTickBound && typeof document.addEventListener === 'function') {
    _homeTickBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimeout(_homeTickTimer); _homeTickTimer = 0; }
      else if (_homeTicks.size) _homeTickRun();            // catch up at once, then on the minute
    });
  }
  if (_homeTickTimer || document.hidden) return;
  _homeTickTimer = setTimeout(_homeTickRun, 60000 - (Date.now() % 60000) + 120);
}
function _homeTickRun() {
  clearTimeout(_homeTickTimer); _homeTickTimer = 0;
  if (typeof state === 'undefined' || state.view !== 'home') { _homeTicks.clear(); return; }
  if (document.hidden) return;
  const now = new Date(Clock.now());   // an instant: widgets read its wall time through Clock.parts
  for (const [wid, fn] of [..._homeTicks]) {
    const frame = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(wid)}"]`);
    if (!frame) { _homeTicks.delete(wid); continue; }
    let r;
    try { r = fn(now); } catch (e) { console.error(`[home] tick of "${wid}" failed`, e); continue; }
    if (r === 'rerender') homeRerenderWidget(wid);
  }
  if (_homeTicks.size) _homeTickArm();
}
function homeTickStop() {
  if (_homeTickTimer && typeof clearTimeout === 'function') clearTimeout(_homeTickTimer);
  _homeTickTimer = 0; _homeTicks.clear();
}

/* ---------- actions: server ops, one-click buttons ---------- */
async function _actionsPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const e = new Error((j.error && (j.error.message || j.error)) || `HTTP ${r.status}`);
    e.code = j.error && j.error.code; e.status = r.status; e.data = j.error || j;
    throw e;
  }
  return j;
}
/** Undo a server change by its token (throws; a 409 means something changed since: pass force). */
async function actionsUndo(token, o) {
  o = o || {};
  const u = await _actionsPost('/api/actions/undo', Object.assign({ token, source: 'ui', client: o.client || 'dashboard' }, o.force ? { force: true } : {}));
  if (typeof _asstAdopt === 'function') await _asstAdopt(u.version);
  return u;
}
/**
 * Run ops through the actions layer (POST /api/actions): the same validation, history
 * and undo as assistants and MCP clients. Dangerous ops are previewed first and need a
 * click. o: {client, done: toast text (false = no toast), confirmTitle, throw}.
 * Returns the server's answer, or false (cancelled, or failed and toasted).
 */
async function actionsApply(ops, o) {
  o = o || {};
  const client = o.client || 'dashboard';
  try {
    // Make sure the server has this tab's latest edits before it changes anything.
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    const dry = await _actionsPost('/api/actions', { ops, dryRun: true, source: 'ui', client });
    if (dry.needsConfirm) {
      const n = (dry.preview || []).reduce((a, p) => a + ((p.changes || []).length || 1), 0);
      const ok = await confirmDialog({ title: o.confirmTitle || 'Apply this change?', text: `${n} change${n === 1 ? '' : 's'}. You can undo it afterwards.`, confirmLabel: 'Apply' });
      if (!ok) return false;
    }
    const j = await _actionsPost('/api/actions', { ops, confirm: dry.confirm, source: 'ui', client });
    if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
    if (o.done !== false) {
      toast(o.done || 'Done', { kind: 'ok', action: j.undo ? { label: 'Undo', run: async () => {
        try { await actionsUndo(j.undo, { client }); }
        catch (e) { toast(netErrorMessage(e, 'Could not undo'), { kind: 'err' }); }
      } } : undefined });
    }
    return j;
  } catch (e) {
    if (o.throw) throw e;
    toast(netErrorMessage(e, 'That did not work'), { kind: 'err' });
    return false;
  }
}
/** Server ops from a Home widget (client 'home:<wid>'). */
function homeOps(ops, o) {
  o = o || {};
  const wid = o.wid || (o.ctx && o.ctx.id) || '';
  return actionsApply(ops, Object.assign({}, o, { client: o.client || ('home:' + (wid || 'widget')) }));
}
/**
 * One click that does its job once (see the header). Returns a Promise of run's result
 * (false when nothing happened, the button was busy or done, or it failed).
 */
function homeAction(btn, run, o) {
  o = o || {};
  if (!btn || btn.dataset.done === '1' || btn.getAttribute('aria-busy') === 'true') return Promise.resolve(false);
  const label = btn.innerHTML;
  const restore = () => { btn.removeAttribute('aria-busy'); btn.disabled = false; btn.classList.remove('is-busy'); };
  btn.setAttribute('aria-busy', 'true'); btn.disabled = true; btn.classList.add('is-busy');
  const go = Array.isArray(run)
    ? () => homeOps(run, Object.assign({}, o, { throw: true, done: o.toast || (typeof o.done === 'string' ? o.done : 'Done') }))
    : run;
  return Promise.resolve().then(() => go(btn)).then((r) => {
    restore();
    if (r === false) return false;
    btn.dataset.done = '1'; btn.classList.add('is-done');
    if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'true');
    if (typeof o.done === 'string') btn.innerHTML = icon('check') + `<span>${esc(o.done)}</span>`;
    if (!Array.isArray(run) && o.toast) {
      const u = o.undo === true ? () => undo() : (typeof o.undo === 'function' ? o.undo : null);
      toast(o.toast, { kind: 'ok', action: u ? { label: 'Undo', run: u } : undefined });
    }
    if (o.say && typeof homeAnnounce === 'function') homeAnnounce(o.say);
    return r;
  }, (e) => {
    restore();
    btn.innerHTML = label;
    console.warn('[home] action failed', e);
    toast(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'That did not work', { kind: 'err', action: { label: 'Try again', run: () => homeAction(btn, run, o) } });
    return false;
  });
}

/* ---------- memo, samples ---------- */
const _homeMemoCache = new Map();
/** fn() once per (key, sig): derived models across Home renders. key: a string or ctx (its copy id). */
function homeMemo(key, sig, fn) {
  const k = typeof key === 'string' ? key : _homePrefsId(key);
  const s = typeof sig === 'string' ? sig : JSON.stringify(sig);
  const hit = _homeMemoCache.get(k);
  if (hit && hit.sig === s) return hit.val;
  const val = fn();
  _homeMemoCache.set(k, { sig: s, val });
  return val;
}
/**
 * The usual memo signature: the data version (every save, undo, redo and live-sync
 * update changes it), today, and (o.minute) the minute; o.extra adds anything else.
 */
function homeMemoSig(o) {
  o = o || {};
  const parts = [state._lastSave || 0, state._saveCount || 0, typeof _undoStack !== 'undefined' ? _undoStack.length : 0, typeof _redoStack !== 'undefined' ? _redoStack.length : 0, todayStr(), Clock.zone()];
  if (o.minute) { const d = Clock.parts(Clock.now()); parts.push(d.h * 60 + d.mi); }
  if (o.extra !== undefined) parts.push(typeof o.extra === 'string' ? o.extra : JSON.stringify(o.extra));
  return parts.join('|');
}
function _homeIsoPlus(n) { return Clock.addDays(todayStr(), n); }
function _homeAt(days, hh, mm) { return new Date(Clock.at(Clock.addDays(todayStr(), days), hh * 60 + (mm || 0))).toISOString(); }
/** Synthetic sample content, relative to today (generic names only). */
function _homeSampleKit() {
  const today = todayStr();
  const people = [
    { id: 'sample-sam', name: 'Sam Taylor', email: 'sam@example.com', color: 'teal' },
    { id: 'sample-alex', name: 'Alex Kim', email: 'alex@example.com', color: 'violet' },
    { id: 'sample-jo', name: 'Jo Rivera', email: 'jo@example.com', color: '#d97706' },
  ];
  const tasks = [
    { id: 'sample-1', title: 'Draft the quarterly report', dueDate: today, priority: 'p1', estimate: 60, stream: 'work', people: [] },
    { id: 'sample-2', title: 'Reply to Acme about the contract', dueDate: _homeIsoPlus(-2), priority: 'p2', estimate: 15, stream: 'work', people: ['sample-sam'] },
    { id: 'sample-3', title: 'Review the pull request', dueDate: _homeIsoPlus(1), priority: 'p2', estimate: 30, stream: 'work', people: ['sample-alex'] },
    { id: 'sample-4', title: 'Book a dentist appointment', dueDate: _homeIsoPlus(3), priority: 'p3', estimate: 10, stream: 'personal', people: [] },
    { id: 'sample-5', title: 'Prepare slides for Monday', dueDate: _homeIsoPlus(4), priority: 'p1', estimate: 90, stream: 'work', people: ['sample-jo'] },
    { id: 'sample-6', title: 'Renew the car insurance', dueDate: null, priority: 'p0', stream: 'personal', people: [] },
  ];
  return {
    today, tomorrow: _homeIsoPlus(1), people, tasks,
    events: [
      { id: 'sample-e1', title: 'Team standup', start: _homeAt(0, 9, 30), end: _homeAt(0, 9, 45), attendees: [{ email: 'sam@example.com' }, { email: 'alex@example.com' }] },
      { id: 'sample-e2', title: 'Design review with Acme', start: _homeAt(0, 11), end: _homeAt(0, 12), attendees: [{ email: 'jo@example.com' }], conferenceUrl: 'https://meet.example.com/abc' },
      { id: 'sample-e3', title: 'Lunch', start: _homeAt(0, 12, 30), end: _homeAt(0, 13, 15), attendees: [] },
      { id: 'sample-e4', title: 'Planning with Sam', start: _homeAt(0, 15), end: _homeAt(0, 15, 45), attendees: [{ email: 'sam@example.com' }] },
    ],
    emails: [
      { id: 'sample-m1', from: 'Sam Taylor <sam@example.com>', subject: 'Contract next steps', date: _homeAt(-2, 16), threadCount: 3 },
      { id: 'sample-m2', from: 'Jo Rivera <jo@example.com>', subject: 'Slides for Monday', date: _homeAt(-1, 10), threadCount: 1 },
      { id: 'sample-m3', from: 'Alex Kim <alex@example.com>', subject: 'Quick question about the review', date: _homeAt(0, 8, 40), threadCount: 2 },
    ],
    money: { currency: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.currency) || 'GBP', perDay: 23, left: 207, daysLeft: 9, balance: 1240, bills: [{ name: 'Phone', day: _homeIsoPlus(2), amount: 18 }, { name: 'Gym', day: _homeIsoPlus(5), amount: 30 }, { name: 'Streaming', day: _homeIsoPlus(7), amount: 11 }] },
    history: [
      { token: 'sample-h1', at: Date.now() - 12 * 60000, source: 'assistant', summary: 'Planned "Draft the quarterly report" for today', undoable: true },
      { token: 'sample-h2', at: Date.now() - 55 * 60000, source: 'mcp', client: 'Claude Code', summary: 'Added task "Review the pull request"', undoable: true },
      { token: 'sample-h3', at: Date.now() - 3 * 3600000, source: 'autolink', summary: 'Linked 2 files to "Prepare slides for Monday"', undoable: true },
    ],
    resources: [
      { id: 'sample-r1', kind: 'folder', label: 'Projects', target: '~/Projects' },
      { id: 'sample-r2', kind: 'url', label: 'Team wiki', target: 'https://example.com/wiki' },
      { id: 'sample-r3', kind: 'github', label: 'acme/app', target: 'https://github.com/acme/app' },
      { id: 'sample-r4', kind: 'snippet', label: 'Email sign-off', target: 'Best wishes' },
    ],
    habits: [
      { id: 'sample-hb1', title: 'Stretch', recur: 'daily', streak: 6, best: 12, doneToday: true },
      { id: 'sample-hb2', title: 'Read 20 pages', recur: 'daily', streak: 3, best: 9, doneToday: false },
      { id: 'sample-hb3', title: 'Weekly review', recur: 'weekly', streak: 4, best: 4, doneToday: false },
    ],
    countdown: { id: 'sample-cd', label: 'Launch', date: _homeIsoPlus(40) },
    note: '- 09:10 Tried the new outline; the intro reads better.\n- 11:40 Decided to drop the appendix.\n- [ ] Ask Sam about the figures',
  };
}
/** Sample content for a preview: the widget's own sample(kit) when it has one, else the kit's entry. */
function homeSample(key) {
  const kit = _homeSampleKit();
  const def = homeWidgetDefs().find(d => d.id === homeBaseId(key));
  if (def && typeof def.sample === 'function') {
    try { return def.sample(kit); } catch (e) { console.error(`[home] sample of "${def.id}" failed`, e); }
  }
  return Object.prototype.hasOwnProperty.call(kit, key) ? kit[key] : null;
}

/* ---------- the shared row keys ---------- */
/** Attributes for a row: one Tab stop, keyed by id (with homeRowKeys). */
function homeRowAttrs(id, label) {
  return `data-row="${escAttr(String(id))}" tabindex="0"${label ? ` aria-label="${escAttr(label)}"` : ''}`;
}
/**
 * Bind the row keys once on a widget's container (rebinding replaces the handlers).
 * h: {open, done, today, tomorrow, keys: {'n': fn}}; each gets (id, row, event).
 * Only when the row itself has focus (its buttons keep their own keys); never in a field.
 */
function homeRowKeys(el, h) {
  if (!el) return;
  el._homeRowKeys = h || {};
  if (el._homeRowKeysBound) return;
  el._homeRowKeysBound = true;
  el.addEventListener('keydown', (e) => {
    const hh = el._homeRowKeys || {};
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const row = e.target && e.target.closest ? e.target.closest('[data-row]') : null;
    if (!row || row !== e.target || !el.contains(row)) return;
    const id = row.dataset.row;
    const k = e.key;
    const move = (dir) => {
      const rows = [...el.querySelectorAll('[data-row]')].filter(r => !r.closest('[hidden]') && r.getClientRects().length);
      const n = rows[rows.indexOf(row) + dir];
      if (n) n.focus();
    };
    let fn = null;
    if (k === 'Enter') fn = hh.open;
    else if (k === 'x' || k === 'X') fn = hh.done;
    else if (k === 't' || k === 'T') fn = hh.today;
    else if (k === ']') fn = hh.tomorrow;
    else if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); move(k === 'ArrowDown' ? 1 : -1); return; }
    if (!fn && hh.keys) fn = hh.keys[k] || hh.keys[k.toLowerCase()] || null;
    if (typeof fn !== 'function') return;
    e.preventDefault();
    try { fn(id, row, e); } catch (x) { console.error('[home] row key failed', x); }
  });
}

/* ---------- quick-add parser aliases (never write a second parser) ---------- */
function qaChipsHtml(parsed, removable, known) { return typeof _qadChips === 'function' ? _qadChips(parsed || {}, removable, known) : ''; }
function qaSuggest(sigil, q, raw) { return typeof _qadSuggestions === 'function' ? _qadSuggestions(sigil, q, raw) : []; }

/* ---------- hide amounts ---------- */
function homeAmountsHidden() { return !!(state.homeUI && typeof state.homeUI === 'object' && state.homeUI.hideAmounts); }
function homeSetAmountsHidden(on) {
  on = !!on;
  if (on === homeAmountsHidden()) return false;
  const ui = Object.assign({}, state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {});
  if (on) ui.hideAmounts = true; else delete ui.hideAmounts;
  state.homeUI = ui;
  saveUI();
  if (typeof homeAnnounce === 'function') homeAnnounce(on ? 'Amounts hidden' : 'Amounts shown');
  if (state.view === 'home') render();
  return true;
}
/** An amount (already formatted text) that "Hide amounts" blurs; hover or focus shows it. */
function homeAmtHtml(text) {
  if (!homeAmountsHidden()) return `<span class="hg-amt">${esc(text)}</span>`;
  return `<span class="hg-amt is-hidden" tabindex="0" title="Hidden: hover to show"><span aria-hidden="true">${esc(text)}</span><span class="sr-only">hidden</span></span>`;
}

/* ---------- a place for one suggestion (the suggestions engine fills it) ---------- */
let _homeSuggestProvider = null;
function registerHomeSuggestProvider(fn) { _homeSuggestProvider = typeof fn === 'function' ? fn : null; }
/** homeSuggestSlot(el, ctx, context) or homeSuggestSlot(el, {wid, size, context}). Returns the slot or null. */
function homeSuggestSlot(el, a, context) {
  if (!_homeSuggestProvider || !el) return null;
  const ctx = a && a.def ? a : null;
  if (ctx && ctx.preview) return null;
  const wid = ctx ? ctx.id : (a && a.wid);
  const size = (ctx ? ctx.size : a && a.size) || 'm';
  if (!wid || size === 's') return null;
  let node = null;
  try { node = _homeSuggestProvider({ wid, baseId: homeBaseId(wid), size, context: context !== undefined ? context : (a && a.context) || null }); }
  catch (e) { console.error(`[home] suggestion for "${wid}" failed`, e); return null; }
  if (!node) return null;
  const slot = document.createElement('div'); slot.className = 'hg-suggest'; slot.dataset.flip = 'sg:' + wid;
  slot.appendChild(node);
  el.appendChild(slot);
  return slot;
}

/* ---------- the gallery's "New" badges (UI key homeUI.gallerySeen) ---------- */
function homeWidgetIsNew(def) {
  if (!def || def.fresh !== true) return false;
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  return !(Array.isArray(ui.gallerySeen) && ui.gallerySeen.includes(def.baseId || def.id));
}
function homeMarkGallerySeen(id) {
  const ui = Object.assign({}, state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {});
  const seen = Array.isArray(ui.gallerySeen) ? ui.gallerySeen.filter(x => typeof x === 'string') : [];
  if (seen.includes(id)) return false;
  ui.gallerySeen = seen.concat([id]).slice(-100);
  state.homeUI = ui;
  saveUI();
  return true;
}
/** Does a widget match the gallery's filter? (title, description, words) */
function homeWidgetMatches(def, q) {
  q = String(q || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [def.title, def.description, ...(def.aliases || []), homeGroupLabel(def.group)].join(' \n ').toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}
