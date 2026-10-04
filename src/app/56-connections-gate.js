/* ============================================================
   CONNECTION GATING (window.Connections). Owner: Connections.
   Features that need a connection stay visible but greyed out, with a
   tooltip and a "Connect" link, until that connection works.

   Mark an element (any module, no JS needed):
     <button data-requires="claude">Suggest</button>
       claude | gmail | calendar | bank   (space-separated = all of them)
     data-requires-soft="bank"   only a note in the tooltip; still clickable
                                 (e.g. "Update finances" also imports CSVs)
     data-requires-hint="..."    custom tooltip text
   Legacy classes work too: .ai-only = claude, .gmail-only = gmail.
   Buttons/links/menu items get aria-disabled + tooltip and a click opens
   "Connect X"; form fields are disabled; any other element (a panel)
   gets a small overlay with a Connect button.

   JS:
     Connections.has(name)            -> boolean
     Connections.status(name)         -> {status, state, checkedAt, message, ...} | null
     Connections.onChange(fn)         -> unsubscribe; fn(all) after every refresh
     Connections.requires(el, name, hint)  same as the attribute
     Connections.refresh({stale})     re-read /api/connections (stale: let the
                                      server re-check anything older than an hour)
     Connections.check(id)            run one check now (POST /api/connections/probe)
     Connections.open(id)             go to the Connections page, that card highlighted
   Feature switches in config (features.ai / email / calendar / finance =
   false) hide the matching gated elements instead of greying them out.
   ============================================================ */
// gmail / calendar / bank mean "a working email / calendar / bank SOURCE"
// (56-sources.js): any number of them, any MCP server or iCal link.
const CONN_NAMES = {
  claude: { label: 'Claude', what: 'Claude (the Claude Code app on this computer)', feature: 'ai' },
  gmail: { label: 'email', what: 'a connected mailbox', feature: 'email', cap: 'email' },
  calendar: { label: 'a calendar', what: 'a connected calendar', feature: 'calendar', cap: 'calendar' },
  bank: { label: 'your bank', what: 'a connected bank', feature: 'finance', cap: 'bank' },
};
/** true/false from the sources' capabilities when the server sent them, else null (older server). */
function _connCap(name) {
  const k = CONN_NAMES[name] && CONN_NAMES[name].cap;
  const c = k && _connAll && _connAll.capabilities && _connAll.capabilities[k];
  return c ? !!c.available : null;
}
const _CONN_CACHE_KEY = 'dashboard-connections-v1';
let _connAll = null;              // last /api/connections answer
let _connLoadedLive = false;      // true once the server answered this session
const _connSubs = new Set();
let _connObserver = null;

function _connReadCache() {
  try { const c = JSON.parse(localStorage.getItem(_CONN_CACHE_KEY) || 'null'); return c && typeof c === 'object' ? c : null; } catch (e) { return null; }
}
function _connEntryOk(id) { return !!(_connAll && _connAll[id] && _connAll[id].state === 'ok'); }

function connHas(name) {
  switch (name) {
    case 'claude': return (typeof AI_AVAILABLE !== 'undefined' && AI_AVAILABLE) || _connEntryOk('claude');
    case 'gmail': case 'calendar': case 'bank': {
      const live = name !== 'bank' && typeof GOOGLE_LIVE !== 'undefined' && GOOGLE_LIVE;
      const cap = _connCap(name);
      return cap !== null ? (cap || live) : (_connEntryOk(name) || live);
    }
    default: return true;
  }
}
/** True while we have no answer yet for `name` (first load of a fresh browser). */
function _connUnknown(name) {
  if (connHas(name)) return false;
  const e = _connAll && _connAll[name];
  // The fast local answer (user report, 4 Oct: Finances said "Checking your bank…" for as long
  // as Claude took to answer, with no bank connected). Once the server has said which sources
  // exist and how they last did, a capability that is not available is simply not connected:
  // a source never seen working ('unknown') is not connected yet. Show "Connect", not "Checking".
  const cap = CONN_NAMES[name] && CONN_NAMES[name].cap;
  if (cap && _connLoadedLive && _connAll && Array.isArray(_connAll.sources)) return false;
  if (e && e.checking) return true;
  if (!_connLoadedLive) return !(e && e.checkedAt);           // nothing known yet (fresh browser)
  if (name === 'claude' && typeof AI_PENDING !== 'undefined' && AI_PENDING && !(e && e.checkedAt)) return true;
  return false;
}
function _connFeatureOff(name) {
  const f = (APP_CONFIG.features || {});
  const k = CONN_NAMES[name] && CONN_NAMES[name].feature;
  return !!(k && f[k] === false);
}

/** Text for a gated element's tooltip. */
function connGateHint(names, custom) {
  if (custom) return custom;
  const n = names.find(x => !connHas(x)) || names[0];
  const info = CONN_NAMES[n] || { label: n, what: n };
  if (_connUnknown(n)) return `Checking ${info.label}…`;
  const e = _connAll && _connAll[n];
  const srcs = info.cap && _connAll && Array.isArray(_connAll.sources) ? _connAll.sources.filter(s => s.capability === info.cap && s.enabled && s.kind !== 'csv') : null;
  if (srcs) {
    const a = srcs.find(s => s.state === 'auth');
    if (a) return `${a.label} needs you to sign in again. Click to reconnect.`;
    if (!srcs.length) return `Needs ${info.what}: add one in Connections. Click to connect.`;
    if (srcs.every(s => s.state === 'error' || s.state === 'setup')) return `${srcs[0].label} is not working right now. Click to see why.`;
  }
  if (e && e.state === 'auth') return `${info.label} needs you to sign in again. Click to reconnect.`;
  if (n !== 'claude' && !connHas('claude')) return `Needs ${info.what}, which works through Claude. Click to connect.`;
  return `Needs ${info.what}. Click to connect.`;
}

const _GATE_SEL = '[data-requires], [data-requires-soft], .ai-only, .gmail-only';
const _GATE_FORM = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
function _gateNames(el, soft) {
  const v = el.getAttribute(soft ? 'data-requires-soft' : 'data-requires');
  if (v) return v.split(/\s+/).filter(n => CONN_NAMES[n]);
  if (soft) return [];
  const out = [];
  if (el.classList.contains('ai-only')) out.push('claude');
  if (el.classList.contains('gmail-only')) out.push('gmail');
  return out;
}
function _gateIsControl(el) {
  if (_GATE_FORM.has(el.tagName) || el.tagName === 'BUTTON' || el.tagName === 'A') return true;
  const r = el.getAttribute('role');
  return r === 'button' || r === 'menuitem' || r === 'menuitemcheckbox' || r === 'switch' || r === 'tab' || el.classList.contains('pop-item');
}

/** Apply (or lift) the gate on one element. */
function _gateApply(el) {
  if (!el || el.nodeType !== 1 || el.closest('.gate-overlay')) return;
  const names = _gateNames(el, false);
  const soft = _gateNames(el, true);
  const off = names.length && names.some(_connFeatureOff);
  el.classList.toggle('gate-off', !!off);
  const missing = names.filter(n => !connHas(n));
  const gated = !off && missing.length > 0;
  const custom = el.getAttribute('data-requires-hint');
  if (gated) {
    if (!el.classList.contains('is-gated')) {
      if (el.hasAttribute('data-tip') && !el.hasAttribute('data-gate-tip')) el.setAttribute('data-gate-tip', el.getAttribute('data-tip'));
      el.classList.add('is-gated');
    }
    el.classList.toggle('is-checking', missing.every(_connUnknown));
    el.setAttribute('data-tip', connGateHint(missing, custom));
    if (_gateIsControl(el)) {
      el.setAttribute('aria-disabled', 'true');
      if (_GATE_FORM.has(el.tagName) && !el.disabled) { el.disabled = true; el.setAttribute('data-gate-disabled', '1'); }
    } else {
      el.classList.add('is-gated-box');
      let ov = el.querySelector(':scope > .gate-overlay');
      if (!ov) { ov = document.createElement('div'); ov.className = 'gate-overlay'; el.appendChild(ov); }
      const n = missing[0];
      const key = n + '|' + (_connUnknown(n) ? 'u' : 'm');
      if (ov.dataset.key !== key) {
        ov.dataset.key = key;
        ov.innerHTML = `${icon(n === 'claude' ? 'sparkles' : n === 'bank' ? 'landmark' : n === 'gmail' ? 'mail' : 'calendar-days')}<span class="gate-ov-text"></span>`;
        ov.querySelector('.gate-ov-text').textContent = _connUnknown(n) ? `Checking ${CONN_NAMES[n].label}…` : (custom || `Connect ${CONN_NAMES[n].label} to use this.`);
        if (!_connUnknown(n)) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
          b.innerHTML = icon('plug') + '<span>Connect</span>';
          b.addEventListener('click', (e) => { e.stopPropagation(); connOpen(n); });
          ov.appendChild(b);
        }
      }
      for (const c of el.children) if (c !== ov) c.setAttribute('inert', '');
    }
  } else if (el.classList.contains('is-gated')) {
    el.classList.remove('is-gated', 'is-checking', 'is-gated-box');
    el.removeAttribute('aria-disabled');
    if (el.hasAttribute('data-gate-tip')) { el.setAttribute('data-tip', el.getAttribute('data-gate-tip')); el.removeAttribute('data-gate-tip'); }
    else el.removeAttribute('data-tip');
    if (el.getAttribute('data-gate-disabled') === '1') { el.disabled = false; el.removeAttribute('data-gate-disabled'); }
    const ov = el.querySelector(':scope > .gate-overlay');
    if (ov) ov.remove();
    for (const c of el.children) c.removeAttribute('inert');
  }
  // Soft requirement: a note in the tooltip, never blocked.
  if (soft.length) {
    const sm = soft.filter(n => !connHas(n));
    if (!el.hasAttribute('data-soft-tip0')) el.setAttribute('data-soft-tip0', el.getAttribute('data-tip') || '');
    const base = el.getAttribute('data-soft-tip0');
    el.classList.toggle('is-soft-gated', sm.length > 0);
    const note = sm.length ? (el.getAttribute('data-requires-hint') || `${CONN_NAMES[sm[0]].label[0].toUpperCase() + CONN_NAMES[sm[0]].label.slice(1)} is not connected.`) : '';
    const tip = [base, note].filter(Boolean).join('\n');
    if (tip) el.setAttribute('data-tip', tip); else el.removeAttribute('data-tip');
  }
}
/* Controls in other modules that predate data-requires: they are matched here
   and get the attribute, so the gate covers them without touching those files.
   New code should simply put data-requires on its own elements.
   (Email triage, Finances bank sync and the person panel now set data-requires
   themselves; their old selectors here matched nothing and were removed.) */
const CONN_AUTO_GATES = [];
function _gateAuto(r) {
  if (!r.querySelectorAll) return;
  for (const g of CONN_AUTO_GATES) {
    const hits = [];
    if (r.nodeType === 1 && r.matches && r.matches(g.sel)) hits.push(r);
    for (const el of r.querySelectorAll(g.sel)) hits.push(el);
    for (const el of hits) {
      if (el.hasAttribute('data-requires') || (g.test && !g.test(el))) continue;
      el.setAttribute('data-requires', g.req);
      if (g.hint && !el.hasAttribute('data-requires-hint')) el.setAttribute('data-requires-hint', g.hint);
    }
  }
}
function connApplyAll(root) {
  const r = root || document;
  _gateAuto(r);
  if (r.nodeType === 1 && r.matches && r.matches(_GATE_SEL)) _gateApply(r);
  if (r.querySelectorAll) for (const el of r.querySelectorAll(_GATE_SEL)) _gateApply(el);
}

/** Why a click on a gated element was stopped, and the way out. */
function _gateExplain(el) {
  const names = _gateNames(el, false).filter(n => !connHas(n));
  const n = names[0] || 'claude';
  const info = CONN_NAMES[n];
  if (_connUnknown(n)) { toast(`Still checking ${info.label}. Try again in a moment.`, { icon: 'loader-circle' }); return; }
  const text = connGateHint(names, el.getAttribute('data-requires-hint')).replace(/ ?Click to (re)?connect\.$/, '');
  const inMenu = el.closest('.pop, .ctx-menu, .modal, .drawer');
  if (inMenu || !el.isConnected) { toast(text, { icon: 'plug', action: { label: 'Connect', run: () => connOpen(n) } }); return; }
  openPopover(el, (pop, close) => {
    pop.classList.add('gate-pop');
    const p = document.createElement('div'); p.className = 'gate-pop-text';
    p.innerHTML = icon('plug');
    const s = document.createElement('span'); s.textContent = text; p.appendChild(s);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm';
    b.innerHTML = icon('plug') + `<span>Connect ${esc(info.label)}</span>`;
    b.onclick = () => { close(); connOpen(n); };
    pop.append(p, b);
  }, { align: 'start', width: 280 });
}

function connOpen(id) {
  _connFocus = id || null;
  if (typeof setView === 'function') setView('connections');
}
let _connFocus = null;

function _connNotify() {
  connApplyAll(document);
  for (const fn of [..._connSubs]) { try { fn(_connAll); } catch (e) { console.error('[connections]', e); } }
}
let _connLoading = null;
async function connRefresh(opts) {
  opts = opts || {};
  if (_connLoading && !opts.force) return _connLoading;
  _connLoading = (async () => {
    try {
      const r = await fetch('/api/connections' + (opts.stale ? '?refresh=stale' : ''), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _connAll = await r.json();
      _connLoadedLive = true;
      try { localStorage.setItem(_CONN_CACHE_KEY, JSON.stringify(_connAll)); } catch (e) { /* storage full */ }
      if (_connAll.claude && _connAll.claude.state === 'ok' && typeof AI_AVAILABLE !== 'undefined' && !AI_AVAILABLE) {
        AI_AVAILABLE = true; document.body.classList.remove('no-ai');
      }
    } catch (e) { /* no server: keep the cached view */ }
    _connLoading = null;
    _connNotify();
    // Something is being checked: look again shortly.
    // Something is being checked, or the server list is still being read: look again shortly.
    if (_connAll && ((Array.isArray(_connAll.checking) && _connAll.checking.length) || (_connAll.discovery && _connAll.discovery.pending))) setTimeout(() => connRefresh(), 2500);
    return _connAll;
  })();
  return _connLoading;
}
async function connCheck(id) {
  if (_connAll && _connAll[id]) { _connAll[id] = Object.assign({}, _connAll[id], { checking: true }); _connNotify(); }
  try {
    const r = await fetch('/api/connections/probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'The check failed.');
    if (id === 'claude' && typeof AI_AVAILABLE !== 'undefined') {
      AI_AVAILABLE = j.state === 'ok';
      AI_PENDING = false;
      document.body.classList.toggle('no-ai', !AI_AVAILABLE);
    }
  } catch (e) {
    toast((e && e.message) || 'The OpenDash server is not running.', { kind: 'err' });
  }
  return connRefresh({ force: true });
}

window.Connections = {
  has: connHas,
  status: (name) => (_connAll && _connAll[name]) || null,
  all: () => _connAll,
  onChange(fn) { _connSubs.add(fn); return () => _connSubs.delete(fn); },
  requires(el, name, hint) {
    if (!el) return el;
    el.setAttribute('data-requires', String(name || 'claude'));
    if (hint) el.setAttribute('data-requires-hint', hint);
    _gateApply(el);
    return el;
  },
  refresh: connRefresh,
  check: connCheck,
  open: connOpen,
  apply: connApplyAll,
  names: () => Object.keys(CONN_NAMES),
};

/* ---------- wiring (declarations + document listeners only) ---------- */
// Clicks on a gated control never reach its own handler.
document.addEventListener('click', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('.is-gated') : null;
  if (!el || (e.target.closest && e.target.closest('.gate-overlay'))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  _gateExplain(el);
}, true);
for (const type of ['mousedown', 'pointerdown', 'dblclick', 'dragstart', 'submit']) {
  document.addEventListener(type, (e) => {
    const el = e.target && e.target.closest ? e.target.closest('.is-gated') : null;
    if (!el || (e.target.closest && e.target.closest('.gate-overlay'))) return;
    if (type !== 'mousedown' && type !== 'pointerdown') e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target && e.target.closest ? e.target.closest('.is-gated') : null;
  if (!el || _GATE_FORM.has(el.tagName)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  _gateExplain(el);
}, true);

if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
  _connObserver = new MutationObserver((muts) => {
    const added = [];
    for (const m of muts) {
      if (m.type === 'attributes') { _gateApply(m.target); continue; }
      for (const n of m.addedNodes) if (n.nodeType === 1) added.push(n);
    }
    // A big re-render (hundreds of rows): one pass over the document is cheaper.
    if (added.length > 40) connApplyAll(document);
    else for (const n of added) connApplyAll(n);
  });
  _connObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-requires', 'data-requires-soft'] });
  // Last session's answer gives a calm first paint; the live one follows.
  _connAll = _connReadCache();
  if (_connAll) for (const k of Object.keys(_connAll)) if (_connAll[k] && typeof _connAll[k] === 'object') _connAll[k].checking = false;
  const f = APP_CONFIG.features || {};
  for (const [k, v] of Object.entries(f)) document.body.classList.toggle('feat-off-' + k, v === false);
  // First live read once the page has booted (99-boot detects the server first).
  setTimeout(() => connRefresh({ stale: true }), 600);
  // Coming back to the tab: pick up checks made meanwhile (the server re-checks at most hourly).
  let _connLastFocus = Date.now();
  window.addEventListener('focus', () => { if (Date.now() - _connLastFocus > 60000) { _connLastFocus = Date.now(); connRefresh({ stale: true }); } });
}
