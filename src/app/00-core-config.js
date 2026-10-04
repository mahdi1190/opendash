/* ============================================================
   CORE: CONFIG + SHARED HELPERS (loaded first; everything may use these)
   ============================================================ */
// The server puts the public part of <data>/config.json into
// <script id="dashboard-config" type="application/json"> when it serves
// index.html (server/http.mjs injectConfig). Opened as a plain file there is
// no server, so the defaults below apply (the time zone is this browser's own).
function browserTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}
const DEFAULT_APP_CONFIG = {
  userName: '', currency: 'GBP', locale: 'en-GB', timezone: browserTimeZone(), weekStart: 'Mon',
  theme: { default: 'light', auto: false },
  ai: { model: 'claude-haiku-4-5', chatModel: 'claude-opus-5-5', effort: 'medium', style: '' },
  features: { finance: true, calendar: true, email: true, ai: true },
};
const APP_CONFIG = (() => {
  let cfg = {};
  try {
    const el = document.getElementById('dashboard-config');
    cfg = el ? JSON.parse(el.textContent || '{}') : {};
  } catch (e) { cfg = {}; }
  const merged = Object.assign({}, DEFAULT_APP_CONFIG, cfg);
  for (const k of ['theme', 'ai', 'features']) merged[k] = Object.assign({}, DEFAULT_APP_CONFIG[k], cfg[k] || {});
  return merged;
})();

/** The user's first name from config ('' if not set). */
function userName() { return String(APP_CONFIG.userName || '').trim(); }
/** "Sam" or "the user": for AI prompts. */
function userLabel() { return userName() || 'the user'; }
/** "Sam's OpenDash" or "OpenDash". */
function appTitle() { return userName() ? `${userName()}'s OpenDash` : 'OpenDash'; }

// HTML escaping. EVERY piece of user or external text (task titles, tags,
// names, notes, email subjects/senders, AI output, error messages) must go
// through esc() before it is put into innerHTML / insertAdjacentHTML, or be
// set with textContent instead. escAttr is the same function, named for use
// inside attribute values.
const _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => _ESC_MAP[c]); }
const escAttr = esc;
/** A CSS colour from data, or a safe fallback (for style attributes). */
function safeColor(c, fallback) {
  const v = String(c == null ? '' : c).trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|var\(--[a-z0-9-]+\)|[a-z]{3,20})$/i.test(v) ? v : (fallback || '#6b7280');
}
/** Only http(s) URLs (for avatars and links from data). */
function safeUrl(u) {
  const v = String(u == null ? '' : u).trim();
  return /^https?:\/\//i.test(v) ? v : '';
}

// ─── Section registry ────────────────────────────────────────────────────
// New top-level views ("sections": calendar, people, settings, ...) register
// here instead of growing the if-chain in _renderMainBody (80-main-render.js):
//
//   registerSection('calendar', {
//     match: v => v === 'calendar',          // which state.view values it owns
//     title: v => 'Calendar',                // header title
//     mount(container, view) {...},          // render into #main-body
//     unmount() {...},                       // optional: called when leaving
//     taskControls: false,                   // hide List/Board/Sort/Group controls
//     hashable: true,                        // allow #view=<name> deep links
//   });
const SECTIONS = new Map();
function registerSection(name, def) {
  if (!name || !def || typeof def.mount !== 'function') throw new Error('registerSection needs a name and mount()');
  SECTIONS.set(name, Object.assign({ match: v => v === name, title: () => name, taskControls: false, hashable: true }, def));
}
function sectionFor(view) {
  for (const [name, def] of SECTIONS) { try { if (def.match(view)) return Object.assign({ name }, def); } catch (e) {} }
  return null;
}
