/* ============================================================
   GARDENS WITH FRIENDS, the page core (2.18, agent 'garden-social'; docs/dev/GARDEN.md section 11).
   Your garden goes to friends as a snapshot (ids, cells, stages: gardenSnapshot), they visit it in
   their own app, drawn by their own art engine, and the small things they do there (a visit, a
   watering, a parcel, a reaction, a heart, a guestbook line) come back to you as capped requests that
   THIS page checks against your own garden before anything changes. The Node side is
   lib/friends/garden.mjs (server/routes/garden-social.mjs); the rules both sides use are
   94-garden-social-0rules.js. The visit page, the gallery and the panels: 94-garden-social-2visit.js;
   the co-op bed of a Together space: 94-garden-social-3bed.js.

   WHAT THIS FILE DOES
     publishing   your snapshot to friends (Friends.publish('garden')): when the garden changes (the
                  'opendash:garden' event), debounced, at most every 15 minutes, and when a plant moves a
                  stage (checked every 5 minutes while the page is visible); never more than it must (each
                  publish is one message per friend). The per-friend 'Garden' permission (agent perms, on by
                  default) decides who gets it
     applying     friends' waterings: the plant of that kind at that cell is watered and, at most once a
                  plant a day and GSOC_BOOST.perDay in all, grows GSOC_BOOST.hours faster. Parcels wait to be
                  unwrapped (gardenSocialUnwrap). Every change is a ledger entry keyed by the message id, so two
                  devices never apply one twice; then the server is told (POST /api/garden-social/applied)
     your visits  gardenSocialAct(friendId, t, extra): water, react, like and visit go at once; a gift and a
                  guestbook line wait a few seconds with Undo first. Each gives a little garden XP (GSOC_XP),
                  once a friend a day
     feed lines   Friends.describe for 'garden:act' and 'garden:line'; your own level-ups and ribbons go in
                  your hangout feed (friendsFeedPost, a local line)

   PUBLIC API
     gardenSocialLoad(force) -> Promise<view>     GET /api/garden-social (cached 20 s)
     gardenSocialView()                           the last view or null
     gardenSocialFriendLoad(id, force) -> Promise<friend view>   one friend's garden and your visits there
     gardenSocialAct(friendId, t, extra, o) -> Promise<result|null>
     gardenSocialGive(friendId, k, id) / gardenSocialSign(friendId, text, input?)   with the Undo window
     gardenSocialUnwrap(actId)                    a parcel into your bag
     gardenSocialFacts()                          the social ribbons' facts (94-garden-1core.js gardenFacts)
     gardenSocialBadge()                          new things friends did in your garden (the Friends tab count)
     gardenSocialOnEvent(d)                       /api/events 'garden' (86-live-sync.js)
     gardenSocialShares(friendId) / gardenSocialSetShare(friendId, on)   the 'Garden' permission for a friend
   Friend text (names, guestbook lines) goes on the page with textContent only; nothing here reaches
   Claude, the MCP, actions or People.
   ============================================================ */
const _gsc = {
  data: null, at: 0, loading: null, err: null,
  friends: new Map(),            // friendId -> {data, at, loading}
  pubT: 0, pubBusy: false, applyBusy: false, reloadT: 0, lastSig: '',
  toasted: new Set(), booted: false, repaintT: 0,
};
const _GSC_PUB_KEY = 'opendash.gardenSocial.pub.v1';
const _GSC_FID_RE = /^[0-9a-f]{16}$/;
const _GSC_MSG_RE = /^[0-9a-f]{32}$/;
const _GSC_PUB_GAP = 15 * 60000, _GSC_PUB_STALE = 12 * 3600000, _GSC_BYTES = 27000;

function _gscNow() { return typeof Clock !== 'undefined' && Clock && typeof Clock.now === 'function' ? Clock.now() : Date.now(); }   // clock-ok: Node-free fallback
function _gscToday() { try { return todayStr(); } catch (e) { return new Date(_gscNow()).toISOString().slice(0, 10); } }   // clock-ok: fallback only
function _gscFun() { try { return typeof gardenFun === 'function' ? gardenFun() : 'subtle'; } catch (e) { return 'subtle'; } }
function _gscReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _gscServer() { return typeof _serverAvailable === 'undefined' || !!_serverAvailable; }
async function _gscApi(path, body) {
  const init = body === undefined ? { method: 'GET', cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch(path, init);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || j.ok === false) {
    const e = new Error((j && typeof j.error === 'string' && j.error) || `The garden could not do that just now (${r.status}).`);
    e.code = j && j.code; e.status = r.status;
    throw e;
  }
  return j;
}
/** The friends who are confirmed (window.Friends, 96-friends-0core.js). */
function _gscFriendList() {
  const F = window.Friends;
  if (!F || typeof F.list !== 'function') return [];
  try { return (F.list() || []).filter(f => f && _GSC_FID_RE.test(String(f.id || '')) && f.status === 'friend'); } catch (e) { return []; }
}
function _gscFriend(id) { const F = window.Friends; try { return F && typeof F.get === 'function' ? F.get(id) : null; } catch (e) { return null; } }
/** A friend's name (plain text: textContent only). */
function gardenSocialName(id) {
  const f = typeof id === 'object' ? id : _gscFriend(id);
  if (!f) return 'A friend';
  try { return typeof friendName === 'function' ? friendName(f) : String(f.nick || f.name || 'A friend'); } catch (e) { return 'A friend'; }
}
function _gscFirst(id) { return String(gardenSocialName(id)).split(/\s+/)[0] || 'Your friend'; }
function _gscPlantName(id, lower) { const p = typeof gardenPlant === 'function' ? gardenPlant(id) : null; const n = p ? p.name : 'plant'; return lower ? n.toLowerCase().replace(/^the /, '') : n; }
function _gscItemName(k, id) {
  if (k === 'seed') { const p = gardenPlant(id); return p ? `${p.name.toLowerCase().replace(/^the /, '')} seed` : 'seed'; }
  const d = gardenDecor(id); return d ? d.name.toLowerCase() : 'decoration';
}
function _gscA(name) { return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name; }

/* ---------- loading ---------- */
function gardenSocialView() { return _gsc.data; }
function gardenSocialLoad(force) {
  if (_gsc.loading) return _gsc.loading;
  if (!force && _gsc.data && Date.now() - _gsc.at < 20000) return Promise.resolve(_gsc.data);   // clock-ok: a cache age
  if (!_gscServer()) return Promise.resolve(_gsc.data);
  // the friends' gardens this page holds already are not sent again (each can be 30 KB)
  const prev = _gsc.data && _gsc.data.gardens ? _gsc.data.gardens : {};
  const have = Object.entries(prev).filter(([id, g]) => g && g.snap && g.got && _GSC_FID_RE.test(id)).slice(0, 200).map(([id, g]) => id + '.' + Math.floor(g.got)).join(',');
  _gsc.loading = _gscApi('/api/garden-social' + (have ? '?have=' + encodeURIComponent(have) : '')).then((d) => {
    for (const [id, g] of Object.entries(d.gardens || {})) if (g && g.same && prev[id] && prev[id].snap) { g.snap = prev[id].snap; delete g.same; }
    _gsc.data = d; _gsc.at = Date.now(); _gsc.err = null;   // clock-ok: a cache age
    _gscApplySoon();
    _gscRepaintSoon();
    return d;
  }).catch((e) => { _gsc.err = e; throw e; }).finally(() => { _gsc.loading = null; });
  return _gsc.loading;
}
function _gscReloadSoon(ms) { clearTimeout(_gsc.reloadT); _gsc.reloadT = setTimeout(() => { gardenSocialLoad(true).catch(() => {}); }, ms == null ? 400 : ms); }
function gardenSocialFriendLoad(id, force) {
  if (!_GSC_FID_RE.test(String(id || ''))) return Promise.reject(new Error('That friend is not here any more.'));
  const c = _gsc.friends.get(id) || {};
  if (c.loading) return c.loading;
  if (!force && c.data && Date.now() - c.at < 15000) return Promise.resolve(c.data);   // clock-ok: a cache age
  c.loading = _gscApi('/api/garden-social/friend?id=' + encodeURIComponent(id)).then((d) => {
    c.data = d; c.at = Date.now(); c.err = null;   // clock-ok: a cache age
    return d;
  }).catch((e) => { c.err = e; throw e; }).finally(() => { c.loading = null; });
  _gsc.friends.set(id, c);
  return c.loading;
}
function gardenSocialFriendCached(id) { const c = _gsc.friends.get(id); return c ? c.data : null; }
/** Repaint what shows friends' gardens (the visit page, the Friends tab, the hangout panels): one frame. */
function _gscRepaintSoon() {
  if (_gsc.repaintT) return;
  _gsc.repaintT = requestAnimationFrame(() => {
    _gsc.repaintT = 0;
    try { if (typeof _gsvRepaint === 'function') _gsvRepaint(); } catch (e) { console.error('[garden-social]', e); }
  });
}

/* ---------- live events (/api/events 'garden') ---------- */
function gardenSocialOnEvent(d) {
  if (!d || typeof d !== 'object') return;
  const from = typeof d.from === 'string' && _GSC_FID_RE.test(d.from) ? d.from : '';
  if (d.type === 'snap' && from) { const c = _gsc.friends.get(from); if (c) c.at = 0; }
  if (d.type === 'act' && from && typeof d.id === 'string' && _GSC_MSG_RE.test(d.id) && !_gsc.toasted.has(d.id)) {
    _gsc.toasted.add(d.id);
    _gscArrived(d, from);
  }
  if (d.type === 'sent' && typeof d.to === 'string') { const c = _gsc.friends.get(d.to); if (c) c.at = 0; }
  _gscReloadSoon(d.type === 'act' ? 250 : 600);
}
/** A friend did something in your garden: a calm toast (none when the Fun level is Off), after it is applied. */
function _gscArrived(d, from) {
  if (_gscFun() === 'off') return;
  const who = _gscFirst(from);
  let text = '', ic = 'sprout', action = null;
  if (d.t === 'water') { text = `${who} watered your ${_gscPlantName(d.p, true)}`; ic = 'droplet'; }
  else if (d.t === 'gift') { text = `${who} left a parcel in your garden`; ic = 'gift'; action = { label: 'Unwrap', run: () => { gardenSocialLoad(true).catch(() => null).then(() => gardenSocialUnwrap(d.id)); } }; }
  else if (d.t === 'react') { const r = gsocReact(d.e); text = `${who} loved your garden${r ? ' ' + r.e : ''}`; ic = 'smile'; }
  else if (d.t === 'sign') { text = `${who} signed your guestbook`; ic = 'feather'; action = { label: 'Read it', run: () => setView('garden:friends') }; }
  else if (d.t === 'like') { text = `${who} gave your garden a heart`; ic = 'heart'; }
  else if (d.t === 'visit') { if (_gscFun() !== 'full') return; text = `${who} is visiting your garden`; ic = 'footprints'; }
  if (!text) return;
  if (!action && !/^garden(:|$)/.test(String(state.view || ''))) action = { label: 'See', run: () => setView('garden:friends') };
  toast(text, { icon: ic, timeout: 6000, action });
}

/* ---------- publishing your garden ---------- */
/** Your snapshot for friends (and your hearts), trimmed to fit one message: paths go first, then the furthest-back decorations. */
function _gscSnapBody() {
  if (typeof gardenSnapshot !== 'function' || typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) return null;
  const s = gardenSnapshot();
  if (!s || !Array.isArray(s.plants)) return null;
  const v = _gsc.data && _gsc.data.tally ? _gsc.data.tally : null;
  const body = { v: 1, lv: Math.max(1, Math.min(999, Number(s.lv) || 1)), season: s.season, areas: s.areas.slice(0, 12), plants: s.plants, decor: s.decor, heart: Math.max(0, Math.min(6, Number(s.heart) || 0)), at: Math.floor(Number(s.at) || _gscNow()) };
  if (v && Number(v['in.like']) > 0) body.hearts = Math.min(1e7, Number(v['in.like']));
  let json = JSON.stringify(body);
  if (json.length > _GSC_BYTES) {
    const ground = (r) => { const d = gardenDecor(r[0]); return d && d.layer === 'ground'; };
    body.decor = body.decor.filter(r => !ground(r));
    json = JSON.stringify(body);
    while (json.length > _GSC_BYTES && body.decor.length) { body.decor = body.decor.slice(0, Math.floor(body.decor.length * 0.8)); json = JSON.stringify(body); }
    while (json.length > _GSC_BYTES && body.plants.length) { body.plants = body.plants.slice(0, Math.floor(body.plants.length * 0.85)); json = JSON.stringify(body); }
  }
  return body;
}
function _gscPubMemo() { try { const j = JSON.parse(localStorage.getItem(_GSC_PUB_KEY) || 'null'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } }
function _gscPubSave(m) { try { localStorage.setItem(_GSC_PUB_KEY, JSON.stringify(m)); } catch (e) { /* private mode: kept for this page */ } }
function _gscPublishSoon(ms) { clearTimeout(_gsc.pubT); _gsc.pubT = setTimeout(() => { _gscPublish(false).catch(() => {}); }, ms == null ? 90000 : ms); }
/** Publish your garden when it changed (not more than every 15 minutes), or once in 12 hours so friends see it is current. */
async function _gscPublish(force) {
  if (_gsc.pubBusy || !_gscServer()) return;
  if (!_gscFriendList().length) return;
  const body = _gscSnapBody();
  if (!body) return;
  const sig = String(gardenHash(JSON.stringify(Object.assign({}, body, { at: 0 }))));
  const memo = _gscPubMemo(), now = Date.now();   // clock-ok: spacing messages, not a date
  if (!force && memo.sig === sig && now - (memo.at || 0) < _GSC_PUB_STALE) return;
  if (!force && now - (memo.at || 0) < _GSC_PUB_GAP) { _gscPublishSoon((memo.at || 0) + _GSC_PUB_GAP - now + 1000); return; }
  _gsc.pubBusy = true;
  try {
    await _gscApi('/api/friends/publish', { kind: 'garden', body });
    _gscPubSave({ sig, at: now });
  } catch (e) { /* the next change or the 5-minute check tries again */ }
  finally { _gsc.pubBusy = false; }
}

/* ---------- applying friends' waterings ---------- */
function _gscSaveGarden() {
  if (typeof _gdSave === 'function') { try { _gdSave(); return; } catch (e) { console.error('[garden-social]', e); } }
  if (typeof saveUI === 'function') saveUI();
  if (typeof gardenRepaintSoon === 'function') gardenRepaintSoon();
}
function _gscApplySoon() { setTimeout(() => { _gscApplyPending().catch((e) => console.error('[garden-social] apply', e)); }, 50); }
/**
 * Waterings friends sent, applied to YOUR garden: the plant of that kind at that cell is watered now, and (once a plant
 * a day, GSOC_BOOST.perDay in all) grows GSOC_BOOST.hours faster. A plant that has moved or been picked since is left
 * as it is. Every one leaves a ledger entry 'fw.<message id>', so another device never applies it again. Parcels that
 * another device already unwrapped ('gg.<id>') are only reported.
 */
async function _gscApplyPending() {
  const d = _gsc.data;
  if (_gsc.applyBusy || !d || !Array.isArray(d.pending) || !d.pending.length) return;
  if (typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) { setTimeout(_gscApplySoon, 5000); return; }
  _gsc.applyBusy = true;
  try {
    const g = typeof _gdG === 'function' ? _gdG() : state.garden;
    const today = _gscToday(), now = _gscNow();
    const done = [];
    let changed = false, boosts = Object.values(g.led || {}).filter(e => e && e.k === 'fw' && e.d === today && e.b).length;
    const boostedToday = new Set(Object.values(g.led || {}).filter(e => e && e.k === 'fw' && e.d === today && e.b).map(e => e.u));
    let m = null;
    for (const a of d.pending) {
      if (!a || !_GSC_MSG_RE.test(String(a.id || ''))) continue;
      if (a.t === 'gift') { if (g.led['gg.' + a.id]) done.push(a.id); continue; }
      if (a.t !== 'water') continue;
      if (g.led['fw.' + a.id]) { done.push(a.id); continue; }
      const uid = Object.keys(g.plants).find(u => { const p = g.plants[u]; return p && p.p === a.p && p.x === a.x && p.y === a.y; });
      if (!uid) { g.led['fw.' + a.id] = { d: today, k: 'fw', n: 0, u: '' }; done.push(a.id); changed = true; continue; }
      if (!m) m = gardenModel();
      const live = gardenPlantById(m, uid), pl = g.plants[uid];
      if (live && !(m.rain && m.rain.now)) { pl.dh = Math.round(((Number(pl.dh) || 0) + (Number(live.dry) || 0)) * 10) / 10; pl.w = now; }
      const boost = boosts < GSOC_BOOST.perDay && !boostedToday.has(uid) && !(live && live.def && live.def.special);
      if (boost) { pl.fb = (Number(pl.fb) || 0) + GSOC_BOOST.hours; boosts++; boostedToday.add(uid); }
      g.led['fw.' + a.id] = { d: today, k: 'fw', n: 1, u: uid, b: boost ? 1 : 0 };
      done.push(a.id); changed = true;
    }
    if (changed) _gscSaveGarden();
    if (done.length) {
      try { await _gscApi('/api/garden-social/applied', { ids: done.slice(0, 200) }); } catch (e) { /* the next load tries again: the ledger keys keep it from applying twice */ }
      _gscReloadSoon(800);
    }
  } finally { _gsc.applyBusy = false; }
}
/** Did a friend's watering (message id) make that plant grow faster? (for the feed line) */
function gardenSocialBoosted(id) { const e = state.garden && state.garden.led && state.garden.led['fw.' + id]; return e ? (e.b ? 'boost' : e.u ? 'water' : 'gone') : ''; }

/* ---------- parcels ---------- */
/** Unwrap a friend's parcel: the seed or decoration goes into your bag (a ledger entry keyed by the message). */
function gardenSocialUnwrap(id) {
  const d = _gsc.data;
  const a = d ? [...(Array.isArray(d.pending) ? d.pending : []), ...(Array.isArray(d.inbox) ? d.inbox : [])].find(x => x && x.id === id && x.t === 'gift' && x.dir === 'in') : null;
  if (!a) { toast('That parcel is unwrapped already, or not here any more.', { icon: 'gift' }); return false; }
  if (typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) { toast('Your garden is still waking up: try again in a moment.', { icon: 'sprout' }); return false; }
  const g = typeof _gdG === 'function' ? _gdG() : state.garden;
  if (!g.led['gg.' + id]) {
    if (!gsocGiftOk(a.k, a.item)) { toast('This parcel holds something your OpenDash does not know yet: update OpenDash to open it.', { icon: 'gift' }); return false; }
    g.led['gg.' + id] = { d: _gscToday(), k: 'gg', i: { [a.k + ':' + a.item]: 1 }, n: 1 };
    if (a.k === 'decor' && !g.disc[a.item]) g.disc[a.item] = _gscToday();
    _gscSaveGarden();
  }
  d.pending = (d.pending || []).filter(x => x.id !== id);
  for (const x of d.inbox || []) if (x.id === id) x.applied = x.applied || Date.now();   // clock-ok: a local mark until the next load
  _gscApi('/api/garden-social/applied', { ids: [id] }).then(() => _gscReloadSoon(300)).catch(() => {});
  const what = _gscA(_gscItemName(a.k, a.item));
  const plant = a.k === 'seed';
  toast(`From ${_gscFirst(a.f)}: ${what}. It is in your bag.`, { icon: 'gift', kind: 'ok', timeout: 7000,
    action: { label: plant ? 'Plant it' : 'Place it', run: () => { try { const p = g.prefs || (g.prefs = {}); if (plant) { p.mode = 'tend'; p.tool = 'seed'; p.seed = a.item; } else p.mode = 'decorate'; if (typeof saveUI === 'function') saveUI(); } catch (e) { /* prefs are a nicety */ } setView('garden'); } } });
  if (_gscFun() === 'full' && typeof _gdpBurst === 'function' && /^garden/.test(String(state.view || ''))) { try { _gdpBurst('ribbon'); } catch (e) { /* a flourish */ } }
  _gscRepaintSoon();
  return true;
}

/* ---------- your visits ---------- */
/** Garden XP for something you did in a friend's garden (once a friend a day for each kind: the key says so). */
function _gscXp(t, friendId, day) {
  const x = GSOC_XP[t];
  if (!x || typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) return 0;
  const g = typeof _gdG === 'function' ? _gdG() : state.garden;
  const key = 'sx.' + (day || _gscToday()) + '.' + t + '.' + String(friendId).slice(0, 16);
  if (g.led[key]) return 0;
  g.led[key] = { d: day || _gscToday(), k: 'sx', x, n: 1 };
  _gscSaveGarden();
  return x;
}
/**
 * Do something in a friend's garden now: t visit | water | react | like (extra: {p, x, y} | {e}); gifts and guestbook
 * lines go through gardenSocialGive / gardenSocialSign (they wait for Undo first). o {quiet}. -> the server's answer or null.
 */
async function gardenSocialAct(friendId, t, extra, o) {
  o = o || {};
  try {
    const r = await _gscApi('/api/garden-social/act', Object.assign({ to: friendId, t }, extra || {}));
    const xp = _gscXp(t, friendId, r.day);
    const c = _gsc.friends.get(friendId);
    if (c && c.data) { c.data.used = Object.assign({}, c.data.used, { [t]: ((c.data.used || {})[t] || 0) + 1 }); }
    if (!o.quiet) {
      const who = _gscFirst(friendId);
      const tail = xp ? ` · +${xp} garden XP` : '';
      const msg = t === 'water' ? `You watered ${who}'s ${_gscPlantName(extra && extra.p, true)}${tail}` : t === 'like' ? `You gave ${who}'s garden a heart${tail}` : t === 'react' ? `${(gsocReact(extra && extra.e) || {}).e || ''} sent to ${who}${tail}`.trim() : '';
      if (msg) toast(r.queued && !r.sent ? msg + ' (it goes when they are reachable)' : msg, { icon: t === 'water' ? 'droplet' : t === 'like' ? 'heart' : 'smile', kind: 'ok', timeout: 3500 });
    }
    _gscReloadSoon(600);
    return r;
  } catch (e) {
    if (!o.quiet) toast(e && e.message ? e.message : 'That did not go through.', { kind: e && e.code === 'CAP' ? '' : 'err', icon: e && e.code === 'CAP' ? 'clock' : undefined, retry: e && (e.code === 'CAP' || e.code === 'NOT_SHARED' || e.code === 'GONE') ? undefined : () => gardenSocialAct(friendId, t, extra, o) });
    return null;
  }
}
/** After a short Undo window (nothing is sent before it ends). */
function _gscAfterUndo(msg, ic, run, undo, ms) {
  let undone = false;
  const wait = ms || 6000;
  const timer = setTimeout(() => { if (!undone) run(); }, wait);
  toast(msg, { icon: ic, timeout: wait, action: { label: 'Undo', run: () => { undone = true; clearTimeout(timer); if (undo) undo(); toast('Undone: nothing was sent', { kind: 'ok', icon: 'undo-2' }); } } });
}
/** Leave a seed or a decoration from your bag in a friend's garden. It leaves your bag at once (Undo puts it back). */
function gardenSocialGive(friendId, k, id) {
  if (!gsocGiftOk(k, id)) { toast('That can not be given as a gift.', { icon: 'gift' }); return; }
  if (typeof gardenHas !== 'function' || gardenHas(k + ':' + id) < 1) { toast(`You have no ${_gscItemName(k, id)} left to give.`, { icon: 'gift' }); return; }
  const g = typeof _gdG === 'function' ? _gdG() : state.garden;
  const key = 'gs.' + _gscToday() + '.' + Math.floor(_gscNow()).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  g.led[key] = { d: _gscToday(), k: 'gs', i: { [k + ':' + id]: -1 }, n: 1 };
  _gscSaveGarden();
  const back = () => { const gg = typeof _gdG === 'function' ? _gdG() : state.garden; if (gg.led[key]) { delete gg.led[key]; _gscSaveGarden(); } };
  const who = _gscFirst(friendId), what = _gscA(_gscItemName(k, id));
  _gscAfterUndo(`Wrapping ${what} for ${who}…`, 'gift', async () => {
    const r = await gardenSocialAct(friendId, 'gift', { k, item: id }, { quiet: true });
    if (!r) { back(); toast(`The parcel for ${who} did not go: it is back in your bag.`, { kind: 'err', retry: () => gardenSocialGive(friendId, k, id) }); return; }
    toast(`Parcel left in ${who}'s garden${GSOC_XP.gift ? ` · +${GSOC_XP.gift} garden XP` : ''}`, { icon: 'gift', kind: 'ok' });
  }, back);
}
/** Sign a friend's guestbook (one line, plain text). input: the field, given its text back if it does not go. */
function gardenSocialSign(friendId, text, input) {
  const t = gsocText(text);
  if (!t) { toast('Write a few words first.', { icon: 'feather' }); return false; }
  const who = _gscFirst(friendId);
  _gscAfterUndo(`Signing ${who}'s guestbook…`, 'feather', async () => {
    const r = await gardenSocialAct(friendId, 'sign', { txt: t }, { quiet: true });
    if (!r) { _gscDraftBack(friendId, t, input); toast(`Your note to ${who} did not go. It is back in the box.`, { kind: 'err', retry: () => gardenSocialSign(friendId, t, input) }); return; }
    toast(`Signed ${who}'s guestbook${GSOC_XP.sign ? ` · +${GSOC_XP.sign} garden XP` : ''}`, { icon: 'feather', kind: 'ok' });
    _gscRepaintSoon();
  }, () => _gscDraftBack(friendId, t, input));
  return true;
}

/** A guestbook line that did not go (or was undone) goes back where it was written: the box, or the page's draft. */
function _gscDraftBack(friendId, text, input) {
  if (typeof gardenSocialDraftBack === 'function') { try { gardenSocialDraftBack(friendId, text); return; } catch (e) { /* the field below */ } }
  if (input && input.isConnected && !input.value) input.value = text;
}

/* ---------- the 'Garden' permission for one friend (agent perms) ---------- */
function gardenSocialShares(friendId) {
  try { if (typeof permsNowFor === 'function') { const e = permsNowFor(friendId); return !!(e && e.garden && e.garden.on); } } catch (e) { /* perms not here */ }
  return true;
}
function gardenSocialSetShare(friendId, on) {
  if (typeof permsSetScope !== 'function') { toast('Sharing choices live in Friends: update OpenDash to change them here.', { icon: 'info' }); return; }
  permsSetScope(friendId, 'garden', { mode: on ? 'on' : 'off' });
  if (on) _gscPublishSoon(3000);
}

/* ---------- facts for the social ribbons, the tab's count ---------- */
function gardenSocialFacts() {
  const d = _gsc.data;
  const t = d && d.tally ? d.tally : {};
  return {
    gardenVisits: d ? Number(d.visitDays) || 0 : 0,
    friendWaters: Number(t['out.water']) || 0,
    guestbookSigned: Number(t['out.sign']) || 0,
    giftsGiven: Number(t['out.gift']) || 0,
    heartsReceived: Number(t['in.like']) || 0,
  };
}
function gardenSocialBadge() { const d = _gsc.data; return d ? Math.max(0, Math.min(99, Number(d.unseen) || 0)) : 0; }

/* ---------- feed lines (the hangout feed, 96-friends-1ui.js) ---------- */
function _gscDescribeAct(e, f) {
  const b = e.b && typeof e.b === 'object' ? e.b : {};
  const who = f ? gardenSocialName(f) : 'A friend';
  const out = e.dir === 'out';
  const plant = b.p ? _gscPlantName(b.p, true) : 'plant';
  const r = b.e ? gsocReact(b.e) : null;
  const q = (s) => (s ? ` “${s}”` : '');
  switch (b.t) {
    case 'visit': return { icon: 'footprints', text: out ? `You visited ${who}'s garden` : `${who} visited your garden`, tone: out ? '' : 'warm' };
    case 'water': {
      if (out) return { icon: 'droplet', text: `You watered ${who}'s ${plant}` };
      const how = gardenSocialBoosted(e.id);
      return { icon: 'droplet', text: `${who} watered your ${plant}${how === 'boost' ? ': it grew a little faster' : ''}`, tone: 'warm' };
    }
    case 'gift': {
      const opened = !out && state.garden && state.garden.led && state.garden.led['gg.' + e.id];
      const what = b.k && b.item ? _gscA(_gscItemName(b.k, b.item)) : 'a parcel';
      return { icon: 'gift', text: out ? `You left ${who} a parcel (${what})` : opened ? `${who} left you ${what}` : `${who} left a parcel in your garden`, tone: 'party' };
    }
    case 'react': return { icon: 'smile', text: out ? `You reacted to ${who}'s garden ${r ? r.e : ''}`.trim() : `${who} loved your garden ${r ? r.e + ' ' + r.label : ''}`.trim(), tone: 'warm' };
    case 'sign': return { icon: 'feather', text: out ? `You signed ${who}'s guestbook:${q(b.txt)}` : `${who} signed your guestbook:${q(b.txt)}`, tone: 'warm' };
    case 'like': return { icon: 'heart', text: out ? `You gave ${who}'s garden a heart` : `${who} gave your garden a heart`, tone: 'warm' };
    default: return { icon: 'sprout', text: out ? `You visited ${who}'s garden` : `${who} visited your garden` };
  }
}
function _gscVisitBtn(fid) {
  if (!_GSC_FID_RE.test(String(fid || ''))) return null;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm gsc-feed-go';
  b.innerHTML = icon('sprout');
  const s = document.createElement('span'); s.textContent = 'Visit'; b.appendChild(s);
  b.onclick = (ev) => { ev.stopPropagation(); setView('garden:visit:' + fid); };
  return b;
}
function _gscDescribeLine(e, f) {
  const b = e.b && typeof e.b === 'object' ? e.b : {};
  const who = f ? gardenSocialName(f) : 'A friend';
  const fid = f && f.id;
  switch (b.t) {
    case 'shared': return { icon: 'sprout', text: `${who} shared their garden with you${b.n ? ` (level ${b.n})` : ''}`, tone: 'warm', el: _gscVisitBtn(fid) };
    case 'level': return { icon: 'sprout', text: `${who}'s garden reached level ${b.n || '?'}`, tone: 'party', el: _gscVisitBtn(fid) };
    case 'bloom': { const p = gardenPlant(b.p); return { icon: 'flower', text: `${who}'s ${p ? p.name.toLowerCase().replace(/^the /, '') : 'rare plant'} is in bloom`, tone: 'party', el: _gscVisitBtn(fid) }; }
    case 'mylevel': return { icon: 'sprout', text: `Your garden reached level ${b.n || '?'}${typeof GARDEN_LEVEL_TITLES !== 'undefined' && GARDEN_LEVEL_TITLES[(b.n || 1) - 1] ? ': ' + GARDEN_LEVEL_TITLES[(b.n || 1) - 1] : ''}`, tone: 'party' };
    case 'myribbon': { const r = (typeof GARDEN_RIBBONS !== 'undefined' ? GARDEN_RIBBONS : []).find(x => x.id === b.p); return { icon: r ? r.icon : 'award', text: `You earned a garden ribbon: ${r ? r.label : 'a ribbon'}`, tone: 'party' }; }
    default: return { icon: 'sprout', text: 'Something grew in the garden' };
  }
}

/* ---------- your own milestones in your hangout feed; publishing on change ---------- */
document.addEventListener('opendash:garden', (ev) => {
  const d = ev && ev.detail ? ev.detail : {};
  _gscPublishSoon(d.kind === 'level' ? 5000 : 90000);
  if (!_gscFriendList().length || typeof friendsFeedPost !== 'function') return;
  try {
    if (d.kind === 'level' && Number.isInteger(d.level)) friendsFeedPost({ kind: 'garden:line', body: { t: 'mylevel', n: d.level } }).catch(() => {});
    if (d.kind === 'ribbon' && typeof d.ribbon === 'string' && /^[a-z0-9-]{1,40}$/.test(d.ribbon)) friendsFeedPost({ kind: 'garden:line', body: { t: 'myribbon', p: d.ribbon } }).catch(() => {});
  } catch (e) { /* a feed line is a nicety */ }
});

/* ---------- start ---------- */
// The feed's words and the panels as soon as the whole page script has run (window.Friends is defined later in it).
setTimeout(() => {
  const F = window.Friends;
  if (!F) return;
  try {
    F.describe('garden:act', _gscDescribeAct);
    F.describe('garden:line', _gscDescribeLine);
    // Friends' latest kinds also arrive as 'friends' msg events: a friend's new snapshot makes a visit page fresh.
    F.on('garden', (m) => { if (m && typeof m.from === 'string') { const c = _gsc.friends.get(m.from); if (c) c.at = 0; _gscReloadSoon(800); } });
  } catch (e) { console.error('[garden-social] friends hooks', e); }
  if (typeof _gsvRegisterPanels === 'function') { try { _gsvRegisterPanels(F); } catch (e) { console.error('[garden-social] panels', e); } }
}, 0);
setTimeout(function _gscBoot() {
  if (!_gscServer()) { setTimeout(_gscBoot, 30000); return; }
  const F = window.Friends;
  _gsc.booted = true;
  Promise.resolve(F && F.ready).then(() => gardenSocialLoad(true)).then(() => _gscPublish(false)).catch(() => {});
  // While the page is visible: a plant moving a stage changes the snapshot (each check is cheap: no message unless it changed).
  setInterval(() => {
    if (document.hidden || !_gscServer()) return;
    _gscPublish(false).catch(() => {});
    if (/^(garden|friends)(:|$)/.test(String(state.view || ''))) gardenSocialLoad(false).catch(() => {});
  }, 5 * 60000);
}, 6000);
