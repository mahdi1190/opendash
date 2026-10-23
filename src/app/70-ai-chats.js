/* ============================================================
   AI CHATS THAT FOLLOW YOU (every conversation is synced data)
   ============================================================
   Where they live (lib/sync/manifest.mjs, the chats block):
     state.taskChat[taskId]        the per-task chat (70-ai.js): [{id, role: 'user'|'claude', text, ts}]
     state.assistantChat.messages  the assistant panel (72-assistant.js): [{id, role: 'user'|'assistant',
                                   text, ts, pending?, by?, model?, ms?, via?, error?, stopped?, proposals}]
     state.chatMeta[chatKey]       {clearedAt, readAt, older: {deviceId: {n, name}}}      (synced)
     state.chatArchive[chatKey]    THIS computer's older messages of a long chat (device-local)
     state/proposals.json          the proposals themselves, with their status (server/actions/journal.mjs)
   chatKey: 'task:<taskId>' or 'assistant'.

   Rules
   - Every message has an id, made once (random), and a time. Lists merge by id
     (the sync engine, lib/sync/model.mjs; tabs, 86-live-sync.js) and are shown
     in time order (chatSorted), so two computers sending at the same moment
     keep both messages, once each. Older messages without an id merge by their
     content (time, role and text) and keep working.
   - A reply being written is published ONCE (pending, naming the computer and
     tab writing it: "Answering on Home laptop…") and replaced by its id when it
     is done; its progress (status line, interim text) stays in this tab. A reply
     left pending by a tab that went away shows as interrupted after
     CHAT_STALE_MS, and that tab marks it so when it is reloaded.
   - Long chats: once a chat has more than CHAT_MAX messages only the newest
     CHAT_KEEP travel. Every computer copies the messages older than the newest
     CHAT_KEEP into its own chatArchive as soon as it sees them, so a trim made
     on another computer loses nothing here. chatMeta[key].older[thisComputer]
     says how many older messages this computer keeps; the others show
     "N older messages on <computer>".
   - Clearing a chat empties its list (the container stays, so a message sent at
     that moment on another computer survives) and records clearedAt, which
     every computer applies to its own archive.
   - Chats never make page undo steps and are never rolled back by one
     (01-core-state.js _NO_UNDO_KEYS). A clash inside a chat between two tabs is
     settled here without asking (chatSettleConflicts, called by syncMergeTab).
   - Privacy: chats can quote mail. They travel like all sync data, end-to-end
     encrypted, and nothing here logs their text.
   ============================================================ */
const CHAT_KEEP = 60;                    // messages that keep travelling once a chat is trimmed
const CHAT_MAX = 100;                    // a chat longer than this is trimmed to CHAT_KEEP
const CHAT_ARCHIVE_MAX = 5000;           // older messages one computer keeps per chat
const CHAT_STALE_MS = 15 * 60 * 1000;    // a reply still "being written" after this was interrupted
const CHAT_KEYS = ['taskChat', 'assistantChat', 'chatMeta', 'chatArchive'];

/** A new message id: time + randomness, unique across computers. */
function chatNewId(prefix) {
  let r = '';
  try { const b = new Uint8Array(8); crypto.getRandomValues(b); r = Array.from(b, x => (x % 36).toString(36)).join(''); }
  catch (e) { r = Math.random().toString(36).slice(2, 10); }
  return (prefix || 'm') + Date.now().toString(36) + r;
}
/** This tab, across its reloads (sessionStorage): a pending reply it left behind is its own to mark interrupted. */
let _chatTab = null;
function chatTabId() {
  if (_chatTab) return _chatTab;
  try { _chatTab = sessionStorage.getItem('dashboard-tab-id'); } catch (e) { _chatTab = null; }
  if (!_chatTab) { _chatTab = chatNewId('t'); try { sessionStorage.setItem('dashboard-tab-id', _chatTab); } catch (e) { /* memory only */ } }
  return _chatTab;
}
/** This computer as sync knows it: {id, name} (only while sync is on), from /api/sync/status, refreshed every 10 minutes. */
let _chatDev = null, _chatDevAt = 0, _chatDevP = null;
function chatDevice() {
  if (Date.now() - _chatDevAt > 10 * 60 * 1000 && !_chatDevP && typeof _serverAvailable !== 'undefined' && _serverAvailable) {
    _chatDevP = fetch('/api/sync/status', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then((s) => {
      _chatDev = s && s.enabled && s.deviceId ? { id: String(s.deviceId), name: String(s.deviceName || 'another computer').slice(0, 60) } : null;
    }).catch(() => { /* keep the last answer */ }).finally(() => { _chatDevAt = Date.now(); _chatDevP = null; });
  }
  return _chatDev;
}

function _chatHash(s) {
  let h = 0x811c9dc5;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
/** The identity of a message: its id, else (older messages) its time, role and text. */
function chatMsgKey(m) {
  if (!m || typeof m !== 'object') return '';
  return m.id ? 'i:' + m.id : 't:' + (Number(m.ts) || 0) + ':' + (m.role || '') + ':' + _chatHash(m.text);
}
/** A copy in time order (ties by identity: the same order on every computer). */
function chatSorted(list) {
  return (Array.isArray(list) ? list : []).filter(m => m && typeof m === 'object').slice().sort((a, b) => {
    const d = (Number(a.ts) || 0) - (Number(b.ts) || 0);
    if (d) return d;
    const ka = chatMsgKey(a), kb = chatMsgKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/* ---------- where each chat is ---------- */
function _chatIsObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
/** The synced list of a chat (never null). */
function chatList(key) {
  if (key === 'assistant') {
    if (!_chatIsObj(state.assistantChat)) state.assistantChat = { messages: [] };
    if (!Array.isArray(state.assistantChat.messages)) state.assistantChat.messages = [];
    return state.assistantChat.messages;
  }
  const id = String(key).slice(5);
  const l = state.taskChat && state.taskChat[id];
  return Array.isArray(l) ? l : [];
}
function chatSetList(key, list) {
  if (key === 'assistant') { chatList('assistant'); state.assistantChat.messages = list; return; }
  if (!_chatIsObj(state.taskChat)) state.taskChat = {};
  state.taskChat[String(key).slice(5)] = list;
}
function chatMetaOf(key, create) {
  if (!_chatIsObj(state.chatMeta)) { if (!create) return {}; state.chatMeta = {}; }
  let m = state.chatMeta[key];
  if (!_chatIsObj(m)) { if (!create) return {}; m = state.chatMeta[key] = {}; }
  return m;
}
function _chatArchive(key) {
  const a = _chatIsObj(state.chatArchive) ? state.chatArchive[key] : null;
  return Array.isArray(a) ? a : [];
}
function _chatSetArchive(key, list) {
  if (!_chatIsObj(state.chatArchive)) state.chatArchive = {};
  if (list.length) state.chatArchive[key] = list; else delete state.chatArchive[key];
}

/**
 * What a chat shows: its synced messages and this computer's older ones, in
 * time order, each once. -> {messages, olderHere, olderElsewhere: {n, name}|null}
 */
function chatView(key) {
  const list = chatList(key);
  const cleared = Number(chatMetaOf(key).clearedAt) || 0;
  const have = new Set(list.map(chatMsgKey));
  const older = _chatArchive(key).filter(m => m && (Number(m.ts) || 0) > cleared && !have.has(chatMsgKey(m)));
  return { messages: chatSorted([...older, ...list]), olderHere: older.length, olderElsewhere: chatOlderElsewhere(key, older.length) };
}
/** The computer that keeps the most older messages of this chat beyond what this one has: {n, name} or null. */
function chatOlderElsewhere(key, mine) {
  const o = chatMetaOf(key).older;
  if (!_chatIsObj(o)) return null;
  const me = chatDevice();
  let best = null;
  for (const [id, v] of Object.entries(o)) {
    if ((me && id === me.id) || !_chatIsObj(v)) continue;
    const n = Math.max(0, Math.floor(Number(v.n) || 0));
    if (n > (mine || 0) && (!best || n > best.n)) best = { n: n - (mine || 0), name: String(v.name || 'another computer').slice(0, 60) };
  }
  return best;
}
/** The note at the top of a long chat: "12 older messages on Home laptop" (escaped HTML, or ''). */
function chatOlderNoteHtml(key) {
  const v = chatView(key);
  const o = v.olderElsewhere;
  if (!o) return '';
  return `<div class="chat-older muted">${typeof icon === 'function' ? icon('history', 'i-xs') : ''}<span>${o.n} older message${o.n === 1 ? '' : 's'} on ${esc(o.name)}</span></div>`;
}

/**
 * Keep one chat tidy: time order, older messages copied into this computer's
 * archive, a long chat trimmed to its newest CHAT_KEEP, and this computer's
 * "older messages here" count. True when anything changed (save it).
 */
function chatSweep(key) {
  let changed = false;
  const meta = chatMetaOf(key);
  const cleared = Number(meta.clearedAt) || 0;
  const list = chatList(key);
  const sorted = chatSorted(list);
  if (sorted.length !== list.length || sorted.some((m, i) => m !== list[i])) { chatSetList(key, sorted); changed = true; }
  // Copy what is older than the newest CHAT_KEEP into the archive now, before any trim can take it.
  let arch = _chatArchive(key);
  const archLen = arch.length;
  if (cleared) arch = arch.filter(m => (Number(m.ts) || 0) > cleared);
  const inArch = new Set(arch.map(chatMsgKey));
  const add = sorted.slice(0, Math.max(0, sorted.length - CHAT_KEEP)).filter(m => !m.pending && !inArch.has(chatMsgKey(m)));
  if (add.length || arch.length !== archLen) {
    arch = chatSorted([...arch, ...add.map(m => JSON.parse(JSON.stringify(m)))]).slice(-CHAT_ARCHIVE_MAX);
    _chatSetArchive(key, arch);
    changed = true;
  }
  // Trim: the same newest CHAT_KEEP on every computer (time order is the same everywhere).
  let synced = sorted;
  if (sorted.length > CHAT_MAX) { synced = sorted.slice(-CHAT_KEEP); chatSetList(key, synced); changed = true; }
  // How many older ones this computer keeps (its own entry: computers never clash).
  const dev = chatDevice();
  if (dev) {
    const have = new Set(synced.map(chatMsgKey));
    const n = arch.filter(m => !have.has(chatMsgKey(m))).length;
    const o = _chatIsObj(meta.older) ? meta.older : null;
    const cur = o && o[dev.id];
    if (n ? !(cur && cur.n === n && cur.name === dev.name) : !!cur) {
      const m2 = chatMetaOf(key, true);
      m2.older = Object.assign({}, _chatIsObj(m2.older) ? m2.older : {});
      if (n) m2.older[dev.id] = { n, name: dev.name }; else delete m2.older[dev.id];
      changed = true;
    }
  }
  return changed;
}
/** chatSweep over every chat (after adopting a newer copy, at boot). True when anything changed. */
function chatSweepAll() {
  let changed = false;
  try {
    for (const id of Object.keys(_chatIsObj(state.taskChat) ? state.taskChat : {})) if (chatSweep('task:' + id)) changed = true;
    if (chatSweep('assistant')) changed = true;
  } catch (e) { console.error('[chats] sweep', e); }
  return changed;
}
/** Empty a chat everywhere: its list, this computer's archive, and clearedAt for the others' archives. */
function chatClear(key) {
  chatSetList(key, []);
  _chatSetArchive(key, []);
  const m = chatMetaOf(key, true);
  m.clearedAt = Date.now();
  if (_chatIsObj(m.older)) { const dev = chatDevice(); if (dev && m.older[dev.id]) { m.older = Object.assign({}, m.older); delete m.older[dev.id]; } }
  saveData();
}
/** Save a chat change (saveData: chats make no undo step, 01-core-state.js). */
function chatSave(key) { if (key) chatSweep(key); saveData(); }

/* ---------- replies being written ---------- */
/** A reply published as pending by a tab that is no longer writing it. */
function chatIsStale(m) { return !!(m && m.pending && Date.now() - (Number(m.ts) || 0) > CHAT_STALE_MS); }
/** Who is writing a pending reply, for "Answering on Home laptop…" ('' = this computer). */
function chatWriterName(m) {
  const by = m && m.by;
  if (!by || !by.dev) return '';
  const me = chatDevice();
  return me && by.dev === me.id ? '' : String(by.name || 'another computer').slice(0, 60);
}
/** The stamp a pending reply carries: this tab, and this computer when sync is on. */
function chatWriter() {
  const dev = chatDevice();
  return Object.assign({ tab: chatTabId() }, dev ? { dev: dev.id, name: dev.name } : {});
}

/* ---------- read / unread (synced: read on one computer is read on all) ---------- */
/** The newest message not yours (an answer), or 0. */
function chatNewestAnswerTs(key) {
  let t = 0;
  for (const m of chatList(key)) if (m && m.role !== 'user' && !m.pending && (Number(m.ts) || 0) > t) t = Number(m.ts) || 0;
  return t;
}
function chatUnread(key) { return chatNewestAnswerTs(key) > (Number(chatMetaOf(key).readAt) || 0); }
/** Mark a chat read up to its newest answer. True when that changed (save it). */
function chatMarkRead(key) {
  const t = chatNewestAnswerTs(key);
  if (!t || t <= (Number(chatMetaOf(key).readAt) || 0)) return false;
  chatMetaOf(key, true).readAt = t;
  return true;
}

/* ---------- tabs merging their copies (86-live-sync.js syncMergeTab) ---------- */
const _CHAT_PSTATE_RANK = { applied: 6, undone: 5, dismissed: 4, error: 2, pending: 1 };
/**
 * A clash inside a chat between two tabs or computers is settled without
 * asking: a proposal's state keeps the more final one (applied over pending),
 * lists of applied/skipped changes join, anything else keeps this tab's copy
 * (it is saved next, so it becomes the later one everywhere). Returns the
 * conflicts that are not about chats.
 */
function chatSettleConflicts(merged, conflicts) {
  const rest = [];
  for (const c of conflicts || []) {
    if (!c || !Array.isArray(c.path) || !CHAT_KEYS.includes(c.path[0])) { rest.push(c); continue; }
    const last = c.path[c.path.length - 1];
    let v = c.local;
    if (last === 'state' && typeof c.local === 'string' && typeof c.remote === 'string') {
      v = (_CHAT_PSTATE_RANK[c.remote] || 0) > (_CHAT_PSTATE_RANK[c.local] || 0) ? c.remote : c.local;
    } else if (Array.isArray(c.local) && Array.isArray(c.remote) && ['applied', 'skipped', 'handled', 'undoneIdx'].includes(last)) {
      v = [...new Set([...c.local, ...c.remote])].sort((a, b) => a - b);
    } else if (Array.isArray(c.local) && Array.isArray(c.remote) && (c.path.length === 2 || last === 'messages')) {
      // A whole message list (messages without ids that share a time): both sides' messages, once each.
      const seen = new Set(), out = [];
      const gone = new Set((Array.isArray(c.base) ? c.base : []).map(chatMsgKey).filter(k => !c.local.some(m => chatMsgKey(m) === k) || !c.remote.some(m => chatMsgKey(m) === k)));
      for (const m of [...c.local, ...c.remote]) { const k = chatMsgKey(m); if (!k || seen.has(k) || gone.has(k)) continue; seen.add(k); out.push(m); }
      v = chatSorted(out);
    }
    if (v !== c.local && typeof syncResolve === 'function') syncResolve(merged, { path: c.path, local: v }, 'local');
  }
  return rest;
}
/** After this tab took a newer copy of the state (86-live-sync.js, 99-boot.js): tidy the chats, repaint the panel. True when the chats changed here. */
function chatAfterAdopt() {
  const changed = chatSweepAll();
  if (typeof _asstOnAdopt === 'function') { try { _asstOnAdopt(); } catch (e) { /* the next paint shows it */ } }
  return changed;
}
/** The synced proposals file changed (another computer applied or dismissed one): the panel brings its cards in step. */
function chatProposalsChanged() {
  if (typeof _asstProposalsChanged === 'function') _asstProposalsChanged();
}
