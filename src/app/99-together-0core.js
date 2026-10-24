/* ============================================================
   TOGETHER (2.17), the page core: shared spaces with friends.
   A space is a list, board, party, trip or shared house that friends edit
   together (lib/friends/spaces.mjs merges it like your own devices do; the
   server keeps it in friends/spaces.json and carries it over the friends
   channel, docs/dev/FRIENDS.md). This file: the data, edits with Undo, the
   live events, friends' names and avatars, the sidebar block and the
   'together' section. The pages are 99-together-1space.js, the friend layers
   in Today / timeline / calendar and Find a time 99-together-2layers.js, the
   game together 99-together-3game.js, money, dates and wishes
   99-together-4life.js, Plan together 99-together-5plan.js.

   THE OWNER'S RULES: everything a friend wrote is untrusted. It is shown
   with textContent / esc() only (never innerHTML with friend text), never a
   link or a picture is loaded from it, it never enters the state (so the MCP,
   the assistant, Claude, connectors and the actions layer never see it), and
   nothing a friend sends changes your own tasks: an assignment waits for
   Accept, an invitation for Join, a friend's "done" for your Mark done.

   These files load after 99-boot.js, so module state is `var` (no TDZ when
   the first render calls a hook) and every hook checks tgOn() first.

   Hooks other files call (all optional, `typeof fn === 'function'`):
     togetherListExtras(list, view)     Today / Inbox / day lists: shared and "From Sam" rows (2layers)
     togetherTimelineLane(el, day, view) / togetherTimelineTime(el, day, base, g)   week timeline layers
     togetherCalColumn(col, iso, hourPx) / togetherCalDueCell(cell, iso)            calendar layers
     togetherTaskMenuItems(id, anchor)  Assign to a friend… / Share to a space… (1space)
     togetherTaskSection(id)            a shared task's comments and status in its panel (1space)
     togetherOnEvent(d)                 /api/events 'together' (86-live-sync.js)
     togetherFilesChanged()             friends/spaces.json arrived from another computer
     togetherAfterRender()              after every render (80-main-render.js)
   ============================================================ */
var _tg = {
  data: null,            // the last GET /api/together answer
  loading: null, loadedAt: 0, err: '', queued: false,
  prev: null,            // spaces by id before the last load (what changed: 3game / notices)
  focusKey: '', drafts: {},   // the input that had focus (kept across re-renders) and what was typed
  live: {},              // spaceId -> {fid: {at, here, x, y, sel, card, text}} (Plan together)
  focusing: {},          // fid -> {until, mins, at} (Focus together)
  keep: false,           // a drag on the Plan board: keep its root across re-renders
  pending: 0,            // edits in flight
};
const TG_KIND_LABEL = { list: 'Shared list', board: 'Shared board', party: 'Party', trip: 'Trip', house: 'Shared house', pair: 'Just us two' };
const TG_KIND_ICON = { list: 'list-checks', board: 'columns-3', party: 'party-popper', trip: 'plane', house: 'house', pair: 'users' };
const TG_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function tgOn() { return typeof _tg !== 'undefined' && !!_tg && typeof state !== 'undefined' && !!state; }
function tgHas() { return tgOn() && !!_tg.data; }
/** Friends are set up and the channel answers (else the pages explain how to start). */
function tgChannel() { return tgHas() && !!_tg.data.channel && !!_tg.data.me; }
function tgMe() { return tgHas() && _tg.data.me ? _tg.data.me.id : ''; }
function tgFriends() { return tgHas() && Array.isArray(_tg.data.friends) ? _tg.data.friends : []; }
/** Every space this computer knows (joined, invited, left...). */
function tgAllSpaces() { return tgHas() && Array.isArray(_tg.data.spaces) ? _tg.data.spaces : []; }
function tgSpaces() { return tgAllSpaces().filter(s => s.status === 'joined'); }
function tgInvites() { return tgAllSpaces().filter(s => s.status === 'invited' && s.value && s.value.members && s.value.members[tgMe()] && !s.value.members[tgMe()].removed); }
function tgSpace(id) { return tgAllSpaces().find(s => s.id === id) || null; }
function tgVal(id) { const s = tgSpace(id); return s ? s.value : null; }
function tgSpaceName(sp) { return String((sp && sp.value && sp.value.meta && sp.value.meta.name) || 'Shared space'); }
function tgKindOf(sp) { const k = sp && sp.value && sp.value.meta && sp.value.meta.kind; return TG_KIND_LABEL[k] ? k : 'list'; }
/** Active members of a space (not left, not removed), friend keys. */
function tgMembers(v) { return Object.entries((v && v.members) || {}).filter(([, m]) => m && !m.left && !m.removed).map(([k]) => k); }
function tgIsMember(v, fid) { const m = v && v.members && v.members[fid]; return !!(m && !m.left && !m.removed); }

/** A friend's name: their own (Friends list), else as the space has it. Friend text: shown with textContent. */
function tgName(fid, v) {
  if (!fid) return 'Someone';
  if (fid === tgMe()) return 'You';
  const f = tgFriends().find(x => x.id === fid);
  if (f && f.name) return f.name;
  if (typeof Friends !== 'undefined' && Friends && typeof Friends.get === 'function') { try { const g = Friends.get(fid); if (g && (g.nick || g.name)) return String(g.nick || g.name); } catch (e) { /* not loaded */ } }
  if (v && v.members && v.members[fid] && v.members[fid].name) return String(v.members[fid].name);
  for (const s of tgAllSpaces()) { const m = s.value && s.value.members && s.value.members[fid]; if (m && m.name) return String(m.name); }
  return 'A friend';
}
function tgFirst(fid, v) { return fid === tgMe() ? 'You' : String(tgName(fid, v)).split(/\s+/)[0] || 'A friend'; }
/** Online, focusing...: the friends engine's presence (only when the friend shares it). */
function tgPresence(fid) {
  try { if (typeof Friends !== 'undefined' && Friends && typeof Friends.presence === 'function') return Friends.presence(fid) || 'offline'; } catch (e) { /* not loaded */ }
  const f = tgFriends().find(x => x.id === fid);
  return (f && f.presence) || 'offline';
}
const _TG_HUES = ['blue', 'teal', 'green', 'amber', 'orange', 'pink', 'violet', 'indigo', 'red', 'slate'];
function _tgHue(fid) { let h = 0; for (const c of String(fid || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return _TG_HUES[h % _TG_HUES.length]; }
/** An avatar: agent 'profile's when it is there, else initials (never a picture from a friend's URL). */
function tgAvatarEl(fid, size, v) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 20 : 28;
  if (typeof profileAvatarEl === 'function') {
    try {
      // Not (or no longer) a friend view: `profile: null` makes agent 'profile' draw initials, never a People avatar.
      const f = (typeof Friends !== 'undefined' && Friends && typeof Friends.get === 'function' && fid !== tgMe() ? Friends.get(fid) : null) || { id: fid, name: tgName(fid, v), self: fid === tgMe(), profile: null };
      const el = profileAvatarEl(f, { size: px });
      if (el && el.nodeType === 1) { el.classList.add('tg-av'); return el; }
    } catch (e) { /* initials below */ }
  }
  const el = document.createElement('span');
  el.className = 'tg-av tg-av-' + (size || 'md') + ' tg-hue-' + _tgHue(fid);
  el.textContent = fid === tgMe() ? avatarInitials(userName() || 'You') : avatarInitials(tgName(fid, v));
  el.title = tgName(fid, v);
  const pr = fid !== tgMe() ? tgPresence(fid) : null;
  if (pr && pr !== 'offline') { const d = document.createElement('i'); d.className = 'tg-pres is-' + pr; d.setAttribute('aria-hidden', 'true'); el.appendChild(d); }
  return el;
}
function tgAvatarStack(fids, v, max) {
  const w = document.createElement('span'); w.className = 'tg-avs';
  const n = max || 5;
  for (const f of fids.slice(0, n)) w.appendChild(tgAvatarEl(f, 'sm', v));
  if (fids.length > n) { const m = document.createElement('span'); m.className = 'tg-av tg-av-sm tg-av-more'; m.textContent = '+' + (fids.length - n); w.appendChild(m); }
  return w;
}

/* ---------- small DOM helpers (text always through textContent) ---------- */
function tgEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = String(text);
  return el;
}
/** A button: a thin wrapper over uiButton (11-ui-kit.js). o: {primary, ghost, sm (default true), cls (extra classes; btn-* words pick the kind), icon, tip, aria, disabled, run}.
    Kept as a global because the garden's visit page (94-garden-social-3bed.js) calls it. */
function tgBtn(label, o) {
  o = o || {};
  const cls = String(o.cls || '');
  const m = /\bbtn-(primary|ghost|danger|secondary)\b/.exec(cls);
  return uiButton({ label, icon: o.icon, kind: m ? m[1] : o.primary ? 'primary' : o.ghost ? 'ghost' : 'secondary', size: o.sm === false ? 'md' : 'sm',
    cls: cls.split(/\s+/).filter(c => c && !/^btn(-(primary|ghost|danger|secondary|sm|icon))?$/.test(c)).join(' '),
    tip: o.tip, aria: o.aria, disabled: o.disabled, run: o.run });
}
function tgIconBtn(ic, label, run, cls) { return tgBtn('', { cls: 'btn-icon btn-sm' + (cls ? ' ' + cls : ''), icon: ic, aria: label, tip: label, run }); }
/** A text input that keeps what was typed (and its focus) across re-renders. */
function tgInput(key, o) {
  o = o || {};
  const el = document.createElement(o.multi ? 'textarea' : 'input');
  el.className = 'control' + (o.cls ? ' ' + o.cls : '');
  if (!o.multi) el.type = o.type || 'text';
  if (o.placeholder) el.placeholder = o.placeholder;
  if (o.max) el.maxLength = o.max;
  if (o.rows) el.rows = o.rows;
  if (o.aria) el.setAttribute('aria-label', o.aria);
  el.dataset.tgDraft = key;
  el.value = _tg.drafts[key] != null ? _tg.drafts[key] : (o.value != null ? String(o.value) : '');
  el.addEventListener('input', () => { _tg.drafts[key] = el.value; });
  el.addEventListener('focus', () => { _tg.focusKey = key; });
  el.addEventListener('blur', () => { setTimeout(() => { if (_tg.focusKey === key && document.activeElement !== el) _tg.focusKey = ''; }, 0); });
  if (o.onEnter) el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (!o.multi || e.ctrlKey || e.metaKey)) { e.preventDefault(); o.onEnter(el.value, el); } if (e.key === 'Escape') { el.value = ''; delete _tg.drafts[key]; el.blur(); } });
  return el;
}
function tgClearDraft(key) { delete _tg.drafts[key]; if (_tg.focusKey === key) _tg.focusKey = ''; }
function _tgRestoreFocus() {
  if (!_tg.focusKey) return;
  const el = document.querySelector(`[data-tg-draft="${CSS.escape(_tg.focusKey)}"]`);
  if (el && document.activeElement !== el) { try { el.focus({ preventScroll: true }); const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* a number field */ } }
}
function tgNewId(p) { return (p || 'i') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function tgDayOf(ms) { try { return Clock.parts(Number(ms)).iso; } catch (e) { return fmtDate(new Date(Number(ms))); } }
function tgAgo(ms) {
  const m = Math.max(0, Math.round((Date.now() - Number(ms)) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
}

/* ---------- prefs (state.together: a synced UI key, no undo step) ---------- */
function _tgSt() {
  if (!state.together || typeof state.together !== 'object') state.together = { v: 1, prefs: {}, spaces: {}, seen: {} };
  const t = state.together;
  if (!t.prefs || typeof t.prefs !== 'object') t.prefs = {};
  if (!t.spaces || typeof t.spaces !== 'object') t.spaces = {};
  if (!t.seen || typeof t.seen !== 'object') t.seen = {};
  return t;
}
/** layers (friends' tasks faint in your views, default on), calendar (their busy times, on), leaderboard (off), focusTell (off), cheers (on). */
function tgPref(k) {
  const v = tgOn() ? _tgSt().prefs[k] : undefined;
  if (v !== undefined) return v;
  return { layers: true, calendar: true, leaderboard: false, focusTell: false, cheers: true }[k];
}
function tgSetPref(k, v) { _tgSt().prefs[k] = v; saveUI(); render(); }
function tgSpacePref(id, k) { const s = _tgSt().spaces[id]; return s && typeof s === 'object' ? s[k] : undefined; }
function tgSetSpacePref(id, k, v) { const t = _tgSt(); if (!t.spaces[id] || typeof t.spaces[id] !== 'object') t.spaces[id] = {}; t.spaces[id][k] = v; saveUI(); }
/** Once-only flags (a celebration shown, a notice given): one entry per key, so two computers never repeat it. */
function tgSeen(key) { return tgOn() && !!_tgSt().seen[key]; }
function tgMarkSeen(key) {
  const t = _tgSt(); t.seen[key] = todayStr();
  // Old flags go after 120 days.
  const keys = Object.keys(t.seen);
  if (keys.length > 3000) { const cut = Clock.addDays(todayStr(), -120); for (const k of keys) if (t.seen[k] < cut) delete t.seen[k]; }
  saveUI();
}

/* ---------- loading ---------- */
async function _tgFetch(path, body, method) {
  const opt = body === undefined && !method ? { cache: 'no-store' } : { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) };
  let r;
  try { r = await fetch(path, opt); }
  catch (e) { throw new Error(netErrorMessage(e)); }
  let j = null;
  try { j = await r.json(); } catch (e) { /* no body */ }
  if (!r.ok) throw new Error((j && j.error) || `The server said ${r.status}.`);
  return j || {};
}
/** Fetch the spaces (coalesced: a second call while one runs queues one more). */
function tgLoad() {
  if (!tgOn() || (typeof _serverAvailable !== 'undefined' && !_serverAvailable)) return Promise.resolve(null);
  if (_tg.loading) { _tg.queued = true; return _tg.loading; }
  _tg.loading = (async () => {
    try {
      const j = await _tgFetch('/api/together');
      const prev = new Map(tgAllSpaces().map(s => [s.id, s]));
      const had = !!_tg.data;
      _tg.data = j; _tg.err = ''; _tg.loadedAt = Date.now();
      if (had) { try { tgAfterLoad(prev); } catch (e) { console.error('[together]', e); } }
      _tg.prev = prev;
      render();
    } catch (e) {
      _tg.err = String(e && e.message || e);
      _tg.failAt = Date.now();
      if (!_tg.data) _tg.data = { ok: false, channel: false, me: null, friends: [], spaces: [], failed: true };
    } finally {
      _tg.loading = null;
      if (_tg.queued) { _tg.queued = false; setTimeout(tgLoad, 50); }
    }
    return _tg.data;
  })();
  return _tg.loading;
}
let _tgLoadTimer = 0;
function tgLoadSoon(ms) { clearTimeout(_tgLoadTimer); _tgLoadTimer = setTimeout(tgLoad, ms == null ? 150 : ms); }
/** What changed after a load: the game moments and notices (3game) look at old vs new. */
function tgAfterLoad(prev) { if (typeof tgNotice === 'function') tgNotice(prev); }

/* ---------- edits (optimistic, with Undo) ---------- */
function _tgClone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
const _TG_LISTS = new Set(['items', 'columns', 'countdowns', 'expenses', 'quests', 'challenges', 'feed', 'wishlist', 'goals', 'plan', 'bed']);   // 'bed': ── garden-social ── the co-op bed (2.18)
const _TG_SUBLISTS = new Set(['subtasks', 'comments']);
/** The same as lib/friends/spaces.mjs applyPatch: ops on a copy of a space value. */
function tgApplyPatch(value, ops) {
  const v = _tgClone(value) || {};
  for (const o of ops) {
    const p = o.path;
    let node = v, i = 0;
    for (; i < p.length - 1; i++) {
      const seg = p[i];
      if (Array.isArray(node)) {
        let el = node.find(x => x && x.id === seg);
        if (!el) { if (o.op !== 'set') { node = null; break; } el = { id: seg }; node.push(el); }
        node = el;
      } else if (node && typeof node === 'object') {
        if (!node[seg] || typeof node[seg] !== 'object') {
          if (o.op !== 'set') { node = null; break; }
          node[seg] = (i === 0 && _TG_LISTS.has(seg)) || (i === 2 && _TG_SUBLISTS.has(seg)) ? [] : {};
        }
        node = node[seg];
      } else { node = null; break; }
    }
    if (!node) continue;
    const last = p[p.length - 1];
    if (Array.isArray(node)) {
      const at = node.findIndex(x => x && x.id === last);
      if (o.op === 'del') { if (at >= 0) node.splice(at, 1); continue; }
      if (o.op === 'move') {
        if (at < 0) continue;
        const [el] = node.splice(at, 1);
        const bi = o.before ? node.findIndex(x => x && x.id === o.before) : -1;
        if (bi >= 0) node.splice(bi, 0, el); else node.push(el);
        continue;
      }
      const el = Object.assign({}, _tgClone(o.value), { id: last });
      if (at >= 0) node[at] = el;
      else { const bi = o.before ? node.findIndex(x => x && x.id === o.before) : -1; if (bi >= 0) node.splice(bi, 0, el); else node.push(el); }
      continue;
    }
    if (o.op === 'del') delete node[last];
    else if (o.op === 'set') node[last] = _tgClone(o.value);
  }
  return v;
}
/** What puts ops back: the old value at each path (set), or a delete where there was none. */
function _tgGet(v, p) {
  let node = v;
  for (const seg of p) {
    if (Array.isArray(node)) node = node.find(x => x && x.id === seg);
    else if (node && typeof node === 'object') node = node[seg];
    else return undefined;
    if (node === undefined) return undefined;
  }
  return node;
}
function tgInverse(value, ops) {
  const inv = [];
  for (const o of ops.slice().reverse()) {
    if (o.op === 'move') {
      const list = _tgGet(value, o.path.slice(0, -1));
      if (!Array.isArray(list)) continue;
      const at = list.findIndex(x => x && x.id === o.path[o.path.length - 1]);
      const next = at >= 0 && list[at + 1] ? list[at + 1].id : null;
      inv.push({ op: 'move', path: o.path, before: next });
      continue;
    }
    const old = _tgGet(value, o.path);
    if (old === undefined) inv.push({ op: 'del', path: o.path });
    else {
      // A list item put back where it was.
      const list = _tgGet(value, o.path.slice(0, -1));
      let before = null;
      if (Array.isArray(list)) { const at = list.findIndex(x => x && x.id === o.path[o.path.length - 1]); before = at >= 0 && list[at + 1] ? list[at + 1].id : null; }
      inv.push({ op: 'set', path: o.path, value: _tgClone(old), ...(before ? { before } : {}) });
    }
  }
  return inv;
}
/**
 * Change a space: shown at once, saved on the server, sent to the members.
 * o: {toast: 'text' (with Undo), quiet, undo: false (no Undo offered)} -> Promise<bool>
 */
async function tgEdit(spaceId, ops, o) {
  o = o || {};
  const sp = tgSpace(spaceId);
  if (!sp || !ops || !ops.length) return false;
  const before = sp.value;
  const inv = o.undo === false ? null : tgInverse(before, ops);
  sp.value = tgApplyPatch(before, ops);
  _tg.pending++;
  render();
  try {
    const r = await _tgFetch('/api/together/edit', { space: spaceId, ops });
    const cur = tgSpace(spaceId);
    if (cur && r && r.value) cur.value = r.value;
    render();
    if (o.toast) toast(o.toast, { icon: o.icon || 'check', action: inv && inv.length ? { label: 'Undo', run: () => tgEdit(spaceId, inv, { undo: false, toast: 'Undone', icon: 'undo-2' }) } : null });
    return true;
  } catch (e) {
    const cur = tgSpace(spaceId);
    if (cur) cur.value = before;
    render();
    toast(`Not saved (${_tgWhy(e)}): it is back as it was.`, { kind: 'err', retry: () => tgEdit(spaceId, ops, o) });
    return false;
  } finally { _tg.pending = Math.max(0, _tg.pending - 1); }
}
async function tgPost(path, body, okMsg) {
  try { const r = await _tgFetch(path, body); if (okMsg) toast(okMsg, { kind: 'ok' }); return r; }
  catch (e) { toast(`That did not go through (${_tgWhy(e)}).`, { kind: 'err', retry: () => tgPost(path, body, okMsg) }); return null; }
}
/** The cause of a failure in a few plain words (no full stop: it goes inside a sentence). */
function _tgWhy(e) { return String((e && e.message) || e || 'something went wrong').replace(/[.\s]+$/, '').slice(0, 160) || 'something went wrong'; }
/**
 * Do it after a short Undo window instead of asking first: the toast says what is about to happen,
 * and Undo stops it before anything is sent. (Closing the page in the window means it never happens.)
 */
function tgAfterUndo(msg, ic, run, ms) {
  let undone = false;
  const wait = Math.max(3000, ms || 8000);
  const timer = setTimeout(() => { if (!undone) run(); }, wait);
  toast(msg, { icon: ic || 'undo-2', timeout: wait, action: { label: 'Undo', run: () => { undone = true; clearTimeout(timer); toast('Undone: nothing changed', { kind: 'ok', icon: 'undo-2' }); } } });
}
/** A wait or a load problem in a Together page: what is happening, and Try again. */
function tgWaitEl(what) {
  const w = tgEl('div', 'tg-calm tg-sm tg-wait');
  const down = typeof _serverAvailable !== 'undefined' && !_serverAvailable;
  if (down) w.appendChild(tgEl('span', '', `OpenDash's server isn't answering, so ${what} can't load. It shows here again when the server is back.`));
  else if (_tg.data && _tg.data.failed) w.appendChild(tgEl('span', '', `${what[0].toUpperCase() + what.slice(1)} could not load (${_tgWhy(_tg.err)}). It tries again by itself in a minute.`));
  else { w.insertAdjacentHTML('beforeend', icon('loader-circle', 'i-sm')); w.appendChild(tgEl('span', '', `Loading ${what}…`)); }
  if (!_tg.loading || down || (_tg.data && _tg.data.failed)) w.appendChild(tgBtn('Try again', { ghost: true, icon: 'refresh-cw', run: () => { tgLoad(); render(); } }));
  return w;
}
/** A line in the space's own feed (your event: done, joined, quest, trophy...). Old lines go (the feed keeps 400). */
function tgFeedOps(spaceId, kind, text, ref) {
  const v = tgVal(spaceId); if (!v) return [];
  const id = tgNewId('f');
  const ops = [{ op: 'set', path: ['feed', id], value: { by: tgMe(), at: Date.now(), kind, text: String(text || '').slice(0, 200), ref: ref || null } }];
  const mine = (v.feed || []).filter(x => x.by === tgMe());
  if ((v.feed || []).length >= 400 && mine.length) ops.push({ op: 'del', path: ['feed', mine[0].id] });
  return ops;
}
/* ---------- space activity in the Friends feed (friendsFeedPost, agent 'friends') ----------
   A few meaningful lines from your spaces: a shared task finished, a team quest done, a challenge
   won, a time booked, and trip and countdown milestones (a month, two weeks, a week, three days,
   tomorrow, today). Each happens ONCE: its key goes in state.together.seen, which syncs, so two of
   your computers never both post it. CAPPED: at most TG_HANGOUT_DAY lines a day, TG_HANGOUT_SPACE_DAY
   per space; a line over the cap is dropped for good (never posted late). Tasks friends finish in
   one space between two loads become one line. They are local lines ('note'), never sent: each
   friend's app makes its own from the space. */
const TG_HANGOUT_DAY = 8, TG_HANGOUT_SPACE_DAY = 3;
/** Post one line once. spaceId: where it happened; key: what happened (unique in the space); o: {friend?}. -> posted? */
function tgHangoutOnce(spaceId, key, text, ic, o) {
  o = o || {};
  if (!tgOn() || typeof friendsFeedPost !== 'function' || !TG_ID_RE.test(String(spaceId || '')) || !key) return false;
  const k = 'hang:' + spaceId + ':' + String(key).slice(0, 120);
  if (tgSeen(k)) return false;
  const seen = _tgSt().seen, today = todayStr();
  const todays = Object.keys(seen).filter(x => x.startsWith('hang:') && seen[x] === today);
  const capped = todays.length >= TG_HANGOUT_DAY || todays.filter(x => x.startsWith('hang:' + spaceId + ':')).length >= TG_HANGOUT_SPACE_DAY;
  tgMarkSeen(k);
  if (capped) return false;
  try {
    const ev = { kind: 'note', text: String(text || '').slice(0, 200), group: spaceId };
    if (ic && /^[a-z0-9-]{1,40}$/.test(ic)) ev.icon = ic;
    if (o.friend && /^[a-f0-9]{16}$/.test(String(o.friend))) ev.friend = o.friend;
    const r = friendsFeedPost(ev);
    if (r && typeof r.catch === 'function') r.catch(() => { /* the Friends tab is optional */ });
    return true;
  } catch (e) { return false; }
}
/** Older callers: one line, capped like the rest (o: {text, icon, space?, key?}). */
function tgHangout(o) {
  if (!o) return;
  const sp = o.space && TG_ID_RE.test(o.space) ? o.space : (tgSpaces()[0] && tgSpaces()[0].id);
  if (sp) tgHangoutOnce(sp, o.key || ('t:' + String(o.text || '').slice(0, 80)), o.text, o.icon);
}
/** Trip and countdown milestones in your spaces (from togetherAfterRender; every 10 minutes and when the day turns). */
const TG_MILESTONES = [30, 14, 7, 3, 1, 0];
var _tgHangTick = { at: 0, day: '' };
function tgHangoutTick() {
  if (!tgChannel() || typeof friendsFeedPost !== 'function') return;
  const t = Date.now(), today = todayStr();
  if (t - _tgHangTick.at < 10 * 60 * 1000 && _tgHangTick.day === today) return;
  _tgHangTick.at = t; _tgHangTick.day = today;
  const when = (n, what) => (n === 0 ? `Today: ${what}` : n === 1 ? `Tomorrow: ${what}` : n === 7 ? `One week to go: ${what}` : n === 14 ? `Two weeks to go: ${what}` : n === 30 ? `A month to go: ${what}` : `${n} days to go: ${what}`);
  for (const sp of tgSpaces()) {
    const v = sp.value;
    const days = (iso) => (typeof tgDaysTo === 'function' ? tgDaysTo(iso) : null);
    if (v.meta && v.meta.start && v.meta.start >= today) {
      const n = days(v.meta.start);
      if (TG_MILESTONES.includes(n)) tgHangoutOnce(sp.id, `trip:${v.meta.start}:${n}`, when(n, `${String(v.meta.place || tgSpaceName(sp)).slice(0, 80)} trip`), 'plane');
    }
    for (const cd of (v.countdowns || []).slice(0, 100)) {
      if (!cd || !cd.date || cd.date < today) continue;
      const n = days(cd.date);
      if (TG_MILESTONES.includes(n)) tgHangoutOnce(sp.id, `cd:${cd.id}:${cd.date}:${n}`, when(n, String(cd.title || 'a countdown').slice(0, 80) + ` (${tgSpaceName(sp).slice(0, 40)})`), 'hourglass');
    }
  }
}

/* ---------- live events ---------- */
function togetherOnEvent(d) {
  if (!tgOn() || !d || typeof d !== 'object') return;
  if (d.type === 'spaces') { tgLoadSoon(d.from ? 120 : 400); return; }
  if (d.type === 'live' && d.event && typeof d.from === 'string') { try { tgOnLive(d.from, d.event); } catch (e) { console.error('[together] live', e); } }
  // A cheer or a focus message (the friends engine checked it against its schema; still friend text).
  if (d.type === 'msg' && typeof d.from === 'string' && d.b && typeof d.b === 'object') {
    try {
      if (d.kind === 'cheer' && typeof tgCheerMsg === 'function') tgCheerMsg({ from: d.from, b: d.b });
      else if (d.kind === 'focus' && typeof tgFocusMsg === 'function') tgFocusMsg({ from: d.from, b: d.b });
    } catch (e) { console.error('[together] msg', e); }
  }
}
function togetherFilesChanged() { if (tgOn()) tgLoadSoon(300); }
function tgOnLive(from, ev) {
  if (ev.t === 'focus') { if (typeof tgFocusHeard === 'function') tgFocusHeard(from, ev); return; }
  if (ev.t === 'nudge') { if (typeof tgNudgeHeard === 'function') tgNudgeHeard(from, ev); return; }
  if (ev.t === 'cheer') { if (typeof tgCheerHeard === 'function') tgCheerHeard(from, ev); return; }
  if (ev.space && (ev.t === 'cursor' || ev.t === 'here' || ev.t === 'edit')) { if (typeof tgPlanHeard === 'function') tgPlanHeard(from, ev); }
}
/** Send a live event (rate-limited here, and again at the receiver). */
const _tgLiveLast = {};
function tgSendLive(space, event, minGapMs) {
  if (!tgChannel()) return;
  const t = Date.now();
  if (_tg.liveOffUntil && t < _tg.liveOffUntil) return;   // the friends engine does not carry live events yet
  const k = (space || '') + '|' + event.t;
  if (minGapMs && t - (_tgLiveLast[k] || 0) < minGapMs) return;
  _tgLiveLast[k] = t;
  _tgFetch('/api/together/live', { space: space || null, event }).then((r) => { if (r && r.unsupported) _tg.liveOffUntil = Date.now() + 10 * 60 * 1000; }).catch(() => { /* fleeting: never retried */ });
}
/** A cheer or focus message to friends you share a space with (the documented friends kinds). */
function tgSendKind(to, kind, body) {
  if (!tgChannel()) return Promise.resolve(null);
  const list = [].concat(to).filter(Boolean);
  if (!list.length) return Promise.resolve(null);
  return _tgFetch('/api/together/send', { to: list, kind, body }).then((r) => {
    // a stop (Settings > Privacy) holds these too: say so instead of looking sent
    const stopped = typeof permsGet === 'function' && (permsGet().stopped || list.every(id => permsFor(id).stopped));
    if (r && !r.sent && !r.queued && stopped) toast('Not sent: you stopped sharing.', { kind: 'warn', icon: 'eye-off', action: { label: 'Share again', run: () => { if (typeof permsResumeAll === 'function') permsResumeAll(); } } });
    return r;
  }).catch((e) => { toastError('send it', e, () => tgSendKind(to, kind, body)); return null; });
}

/* ---------- counts ---------- */
/** Items waiting for your Accept, across your joined spaces (assigned to you by someone else). */
function tgRequests() {
  const me = tgMe(), out = [];
  if (!me) return out;
  for (const sp of tgSpaces()) for (const it of sp.value.items || []) {
    if (it.assignee === me && it.by !== me && !(it.ack && it.ack[me]) && it.status !== 'done') out.push({ sp, it });
  }
  return out;
}
/** Is this item yours to do: assigned to you and accepted, or yours with no one else on it. */
function tgIsMine(it) {
  const me = tgMe();
  if (!me || !it) return false;
  if (it.assignee === me) return it.by === me || (it.ack && it.ack[me] === 'accepted');
  return !it.assignee && it.by === me;
}
function tgOpenCount(sp) { return (sp.value.items || []).filter(it => it.status !== 'done').length; }

/* ---------- the sidebar ---------- */
registerPage({
  id: 'together', view: 'together', match: v => v === 'together' || String(v).startsWith('together:'),
  label: 'Together', icon: 'handshake', area: 'tasks', order: 100, since: '2.17', discover: true,
  desc: 'Shared lists, boards and trips with friends',
  keywords: 'together shared space spaces list board trip house party friends plan split costs',
});
registerSidebarBlock('tasks', {
  id: 'together', order: 17, label: 'Together',
  render(el) {
    if (!tgOn()) return;
    const sps = tgSpaces();
    const inv = tgInvites().length + tgRequests().length;
    // Nothing shared yet: no heading (2.18: empty sections hide; Friends > Shared spaces and All pages reach it).
    if (!sps.length && !inv && !/^together(:|$)/.test(String(state.view || ''))) return false;
    el.appendChild(sbSection({ title: 'Together', collapsible: 'together', actions: [{ icon: 'plus', label: 'New shared space', run: () => tgNewSpaceDialog() }] }));
    if (sbIsCollapsed('together')) return;
    el.appendChild(sbNavItem({ label: 'Friends & spaces', icon: 'users', view: 'together', badge: inv ? String(inv) : '', title: inv ? `${inv} waiting for you` : 'Shared lists, boards, parties and trips' }));
    for (const sp of sps.slice().sort((a, b) => (tgSpacePref(a.id, 'order') || 0) - (tgSpacePref(b.id, 'order') || 0) || tgSpaceName(a).localeCompare(tgSpaceName(b)))) {
      if (tgSpacePref(sp.id, 'hidden')) continue;
      const v = 'together:' + sp.id;
      const kind = tgKindOf(sp);
      el.appendChild(sbNavItem({ label: tgSpaceName(sp), icon: _tgIconOf(sp), view: v, count: tgOpenCount(sp) || '', active: state.view === v || state.view.startsWith(v + ':'), title: TG_KIND_LABEL[kind] + ' with ' + tgMembers(sp.value).filter(f => f !== tgMe()).map(f => tgFirst(f, sp.value)).join(', ') }));
    }
  },
});
/* Friends > Shared spaces (2.18, NAVIGATION_PLAN.md 2.2): Together lives in Tasks (its spaces are task lists) and is
   reachable from the Friends hangout too: your spaces, each opening together:<id>, and one way to make one. */
if (typeof window !== 'undefined' && window.Friends && typeof window.Friends.registerPanel === 'function') {
  window.Friends.registerPanel({
    id: 'shared-spaces', order: 8, where: 'hangout', title: 'Shared spaces', icon: 'handshake',
    render(el, d) {
      if (!tgOn()) return false;
      if (!tgHas()) { if (!_tg.loading && typeof tgLoad === 'function') tgLoad(); return false; }
      const sps = tgSpaces().filter(sp => !tgSpacePref(sp.id, 'hidden'));
      const inv = tgInvites().length;
      const friends = d && Array.isArray(d.friends) ? d.friends.filter(f => f && f.status === 'friend').length : 0;
      if (!sps.length && !inv && !friends) return false;   // with a friend it always shows, with New shared space
      const list = document.createElement('div'); list.className = 'tg-fr-spaces';
      for (const sp of sps.slice(0, 6)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tg-fr-space';
        b.innerHTML = icon(_tgIconOf(sp), 'i-sm');
        const name = document.createElement('span'); name.className = 'tg-fr-space-n'; name.textContent = tgSpaceName(sp);
        const n = tgOpenCount(sp);
        const meta = document.createElement('span'); meta.className = 'muted num'; meta.textContent = n ? n + ' open' : TG_KIND_LABEL[tgKindOf(sp)];
        b.append(name, meta);
        b.onclick = () => setView('together:' + sp.id);
        list.appendChild(b);
      }
      if (inv) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tg-fr-space is-invite';
        b.innerHTML = icon('mail', 'i-sm');
        const t = document.createElement('span'); t.className = 'tg-fr-space-n'; t.textContent = inv === 1 ? 'An invitation is waiting' : inv + ' invitations are waiting';
        b.appendChild(t);
        b.onclick = () => setView('together');
        list.appendChild(b);
      }
      if (!sps.length && !inv) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'A list, a board or a trip that you and your friends edit together. It lives in Tasks.'; el.appendChild(p); }
      el.appendChild(list);
      const acts = document.createElement('div'); acts.className = 'tg-fr-acts';
      const mk = document.createElement('button'); mk.type = 'button'; mk.className = 'btn btn-secondary btn-sm';
      mk.innerHTML = icon('plus', 'i-sm') + '<span>New shared space</span>';
      mk.onclick = () => { if (typeof tgNewSpaceDialog === 'function') tgNewSpaceDialog(); else setView('together'); };
      acts.appendChild(mk);
      if (sps.length) {
        const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-ghost btn-sm';
        all.innerHTML = '<span>All shared spaces</span>' + icon('chevron-right', 'i-sm');
        all.onclick = () => setView('together');
        acts.appendChild(all);
      }
      el.appendChild(acts);
    },
  });
}
function _tgIconOf(sp) {
  const ic = sp && sp.value && sp.value.meta && sp.value.meta.icon;
  return ic && /^[a-z0-9-]{1,32}$/.test(ic) ? ic : TG_ICON_DEFAULT(tgKindOf(sp));
}
function TG_ICON_DEFAULT(kind) { return TG_KIND_ICON[kind] || 'list-checks'; }

/* ---------- the section ---------- */
registerSection('together', {
  match: v => v === 'together' || v.startsWith('together:'),
  title: v => { if (v === 'together') return 'Together'; const sp = tgSpace(String(v).split(':')[1]); return sp ? tgSpaceName(sp) : 'Shared space'; },
  // Tasks > Together > (space) > Plan together: every part but the last opens (2.18, NAVIGATION_PLAN.md 2.10).
  crumb: v => {
    const parts = String(v).split(':');
    if (parts.length < 2) return [];
    const sp = tgSpace(parts[1]), name = sp ? tgSpaceName(sp) : 'Shared space';
    if (parts.length < 3) return [{ label: 'Together', view: 'together' }, name];
    let tab = parts[2];
    try { const t = TG_TABS.find(x => x[0] === parts[2]); if (t) tab = t[1]; } catch (e) { /* the raw name */ }
    return [{ label: 'Together', view: 'together' }, { label: name, view: 'together:' + parts[1] }, tab];
  },
  group: 'tasks', layout: 'wide', hashable: true,
  headerActions: (view) => (typeof tgHeaderActions === 'function' ? tgHeaderActions(view) : null),
  keepRoot(main) { const r = main.querySelector('.tg-root'); return !!(_tg.keep && r && r.dataset.view === state.view); },
  mount(container, view) {
    if (_tg.keep && container.querySelector('.tg-root')) return;
    if (!_tg.data && !_tg.loading) tgLoad();
    const root = tgEl('div', 'tg-root'); root.dataset.view = view;
    container.appendChild(root);
    try {
      if (view === 'together') tgRenderHub(root);
      else { const [, id, tab] = String(view).split(':'); tgRenderSpace(root, id, tab || ''); }
    } catch (e) {
      console.error('[together] render', e);
      const b = tgEl('div', 'tg-calm tg-wait');
      b.appendChild(tgEl('span', '', 'This page could not be shown. Reloading the page usually fixes it.'));
      b.appendChild(tgBtn('Reload', { ghost: true, icon: 'refresh-cw', run: () => location.reload() }));
      root.appendChild(b);
    }
    setTimeout(_tgRestoreFocus, 0);
  },
  unmount() { if (typeof tgPlanLeave === 'function') tgPlanLeave(); _tg.keep = false; },
});
function togetherAfterRender() {
  if (!tgOn()) return;
  const up = typeof _serverAvailable === 'undefined' || _serverAvailable;
  // First load, or again a minute after a failed one (the server was starting or restarting).
  if (up && !_tg.loading && (!_tg.data || (_tg.data.failed && Date.now() - (_tg.failAt || 0) > 60000))) tgLoad();
  if (typeof tgGameTick === 'function') { try { tgGameTick(); } catch (e) { console.error('[together] game', e); } }
  if (typeof tgRepaintDrawer === 'function') { try { tgRepaintDrawer(); } catch (e) { console.error('[together] drawer', e); } }
  if (typeof tgPlanTick === 'function') { try { tgPlanTick(); } catch (e) { console.error('[together] plan', e); } }
  try { tgHangoutTick(); } catch (e) { console.error('[together] feed', e); }
}

/* ---------- start (these files run after 99-boot.js) ---------- */
function _tgBoot() {
  if (!tgOn()) return;
  // A deep link to a Together page opened before the section was registered.
  try { const hv = typeof _viewFromHash === 'function' ? _viewFromHash(typeof _BOOT_HASH !== 'undefined' ? _BOOT_HASH : location.hash) : null; if (hv && hv.startsWith('together') && state.view !== hv) state.view = hv; } catch (e) { /* stay */ }
  document.addEventListener('opendash:game', (e) => { try { if (typeof tgOnGameEvent === 'function') tgOnGameEvent(e.detail || {}); } catch (x) { /* the game is a bonus */ } });
  setTimeout(() => { tgLoad(); }, 600);
  render();
}
