/* ============================================================
   PROFILE, the page side (2.17): state.profile, unlocks, the avatar's mood,
   seasonal items, sharing with friends, the top-bar chip and the API.
   The avatar kit (tables, checks, drawing) is 97-profile-0kit.js; Settings >
   Profile with the character builder is 97-profile-2ui.js.

   state.profile (a UI key: saveUI, never an undo step; synced like the game,
   lib/sync/manifest.mjs '── profile ──'):
     {v: 1, name, pronouns, bio, working, theme (swatch id | '#rrggbb'),
      status: {emoji, text, until (ms, 0 = until cleared)},
      avatar: {skin, eyes, ... one id per part (PF_PARTS)},
      badges: [achievement id] | null (null: the newest three earned from tasks, streaks, focus,
              bosses, quests, levels, milestones and friends: never money or places),
      places: [{label, cc}] (names only), share: {places: false},
      react: true (the avatar reacts to your day), collected: {'hat:witch': day},
      sentSig (what friends last got), updatedAt}

   PUBLIC API (safe to call at any time; never throws):
     profileGet()                   the profile, filled in (a copy)
     profileSet(patch, o)           merge (avatar and status per field), save, repaint, share soon. o.quiet: no render
     profileDisplayName(p?)         the name to show: the profile's, else Settings' name, else 'You'
     profileStatusNow(p?)           {emoji, text, until} | null (an expired status is none)
     profileShowcase(p?)            the badge ids shown (chosen, else the newest three earned that are not private)
     profileBadgeInfo(id)           {id, label, icon, hint} from the achievements | null
     profileUnlockCtx()             the context profileLockOf reads (game level, achievements, collected, today, birthday)
     profileMood()                  what the face does today: {mouth, eyes, extra} (empty when react is off)
     profileLive(who?)              {hour, season, level, levelPct, streak} for live frames and backgrounds
     profileAvatarHtml(who, size, o)   markup string; who: null | 'me' | {self: true} (you), a friend view from
                                    window.Friends (its profile), a profile object, or a person (People's avatar)
     profileAvatarEl(who, size | {size, motion, mood})   the same as an element (the Friends tab calls it)
     profileCardEl(who, o)          the profile card (o.compact, o.preview: what a friend sees of you)
     profilePayload()               the body friends get (profileWire): only what you filled in
     profileShareNow(force)         publish it with Friends.publish('profile', body) -> Promise<bool>
     window.OpenDashProfile         {get, set, avatarEl, avatarHtml, cardEl, payload, sanitize, name}
     document event 'opendash:profile'   detail {profile}: it changed (here, or synced from another device)
   Text from friends is drawn with textContent only, after profileSanitize; an avatar is data drawn here.
   ============================================================ */
const _pf = { n: 0, shareT: 0, chipKey: '', statusT: 0, booted: false, lastSig: '' };
const PF_STATUS_PRESETS = Object.freeze([['🎯', 'Focusing'], ['💻', 'Working'], ['✍️', 'Writing'], ['📞', 'In a meeting'], ['☕', 'On a break'], ['🏠', 'Working from home'],
  ['✈️', 'Travelling'], ['🌴', 'On holiday'], ['🤒', 'Off sick'], ['😴', 'Away']]);

function _pfState() {
  if (typeof state === 'undefined' || !state) return { status: {}, avatar: profileAvatarDefault(), share: {}, collected: {} };
  if (!state.profile || typeof state.profile !== 'object' || Array.isArray(state.profile)) state.profile = { v: 1 };
  const p = state.profile;
  for (const k of ['status', 'share', 'collected']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  if (!p.avatar || typeof p.avatar !== 'object' || Array.isArray(p.avatar)) p.avatar = profileAvatarDefault();
  if (!p.v) p.v = 1;
  return p;
}
function profileGet() {
  const p = _pfState();
  return { name: profileText(p.name, PF_MAX.name), pronouns: profileText(p.pronouns, PF_MAX.pronouns), bio: profileText(p.bio, PF_MAX.bio),
    working: profileText(p.working, PF_MAX.working), theme: typeof p.theme === 'string' && p.theme ? p.theme : 'indigo',
    status: { emoji: profileEmojiOk(p.status.emoji) ? p.status.emoji : '', text: profileText(p.status.text, PF_MAX.status), until: Number(p.status.until) || 0 },
    avatar: profileAvatarNormalize(p.avatar), badges: Array.isArray(p.badges) ? p.badges.slice(0, PF_MAX.badges) : null,
    places: Array.isArray(p.places) ? p.places.slice(0, PF_MAX.places) : [], share: Object.assign({ places: false }, p.share),
    react: p.react !== false, collected: Object.assign({}, p.collected), updatedAt: Number(p.updatedAt) || 0 };
}
function _pfEmit() { try { document.dispatchEvent(new CustomEvent('opendash:profile', { detail: { profile: profileGet() } })); } catch (e) { /* old browser */ } }
function profileSet(patch, o) {
  o = o || {};
  const p = _pfState();
  if (!patch || typeof patch !== 'object') return profileGet();
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'avatar' && v && typeof v === 'object') p.avatar = profileAvatarNormalize(Object.assign({}, p.avatar, v));
    else if (k === 'status' && v && typeof v === 'object') p.status = Object.assign({}, p.status, v);
    else if (k === 'share' && v && typeof v === 'object') p.share = Object.assign({}, p.share, v);
    else if (k === 'collected' && v && typeof v === 'object') p.collected = Object.assign({}, p.collected, v);
    else if (['name', 'pronouns', 'bio', 'working', 'theme', 'badges', 'places', 'react'].includes(k)) p[k] = v;
  }
  p.updatedAt = Date.now();   // clock-ok: a real time stamp (what friends sort by)
  _pf.chipKey = '';
  if (typeof saveUI === 'function') saveUI();
  _pfEmit();
  _pfShareSoon();
  _pfStatusTimer();
  if (!o.quiet) _pfChipPaint();
  return profileGet();
}
function profileDisplayName(p) {
  p = p || profileGet();
  return p.name || (typeof userName === 'function' && userName()) || 'You';
}
function profileStatusNow(p) {
  const st = (p || profileGet()).status || {};
  if (!st.emoji && !st.text) return null;
  if (st.until && st.until <= Date.now()) return null;   // clock-ok: compares with a real time stamp
  return { emoji: st.emoji || '', text: st.text || '', until: st.until || 0 };
}
/** Clear the chip when a status runs out (the next render would too). */
function _pfStatusTimer() {
  clearTimeout(_pf.statusT);
  const st = profileGet().status, left = st.until ? st.until - Date.now() : 0;   // clock-ok
  if (left > 0 && left < 864e5) _pf.statusT = setTimeout(() => { _pf.chipKey = ''; _pfChipPaint(); }, left + 500);
}

/* ---------- badges, unlocks, the mood ---------- */
function profileBadgeInfo(id) {
  const d = typeof achDef === 'function' ? achDef(id) : null;
  return d ? { id: d.id, label: d.label, icon: d.icon || 'award', hint: d.hint || '' } : null;
}
function _pfEarned() {
  try {
    const st = typeof achState === 'function' ? achState() : null;
    const un = st && st.unlocked ? st.unlocked : {};
    return Object.keys(un).filter(id => profileBadgeInfo(id)).sort((a, b) => String(un[b]).localeCompare(String(un[a])) || a.localeCompare(b)).map(id => ({ id, day: un[id] }));
  } catch (e) { return []; }
}
/* The groups the automatic showcase may draw from (2.17.1). Never money, places, health-like or
   memories badges: a friend learns nothing private from the default. A group not listed here
   (a new one) stays out of it too. A badge you pick yourself ("My pick") always shows. */
const PF_SHOWCASE_AUTO_GROUPS = Object.freeze(['tasks', 'streaks', 'focus', 'bosses', 'quests', 'levels', 'milestones', 'friends']);
function _pfAutoBadgeOk(id) {
  const d = typeof achDef === 'function' ? achDef(id) : null;
  return !!(d && PF_SHOWCASE_AUTO_GROUPS.includes(d.group));
}
function profileShowcase(p) {
  p = p || profileGet();
  const earned = new Set(_pfEarned().map(x => x.id));
  if (Array.isArray(p.badges)) return p.badges.filter(id => earned.has(id)).slice(0, PF_MAX.badges);
  return _pfEarned().filter(x => _pfAutoBadgeOk(x.id)).slice(0, 3).map(x => x.id);
}
function _pfStats() { try { return typeof gameStats === 'function' ? gameStats() : null; } catch (e) { return null; } }
function _pfToday() { try { return Clock.today(); } catch (e) { return new Date().toISOString().slice(0, 10); } }   // clock-ok: fallback only
function _pfHour() { try { return Clock.parts(Clock.now()).h; } catch (e) { return new Date().getHours(); } }   // clock-ok: fallback only
function profileUnlockCtx() {
  const s = _pfStats(), g = typeof state !== 'undefined' && state && state.game && state.game.seen ? state.game.seen : {};
  return {
    game: !!s, levelMax: Math.max(1, Number(g.levelMax) || 1, s ? Number(s.level.max) || s.level.level : 1),
    ach: new Set(_pfEarned().map(x => x.id)), achLabel: (id) => { const b = profileBadgeInfo(id); return b ? b.label : id; },
    collected: _pfState().collected, today: _pfToday(), birthday: typeof APP_CONFIG !== 'undefined' && APP_CONFIG ? APP_CONFIG.birthday : '',
  };
}
function _pfSeason(iso) { const m = Number(String(iso).slice(5, 7)); return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
function profileLive(who) {
  const out = { hour: _pfHour(), season: _pfSeason(_pfToday()) };
  if (who && typeof who === 'object') {   // a friend: only what they share of their game (share:game), else nothing
    const g = who.game && typeof who.game === 'object' ? who.game : null;
    if (g) { out.level = Math.max(1, Math.floor(Number(g.level)) || 1); out.streak = Math.max(0, Math.floor(Number(g.streak)) || 0); out.levelPct = 0; }
    return out;
  }
  const s = _pfStats();
  if (s) { out.level = s.level.level; out.levelPct = s.level.pct; out.streak = s.streaks && s.streaks.done ? s.streaks.done.current : 0; }
  return out;
}
/** Delight: your avatar reacts to your day (a grin on a streak, a sparkle when the week's quests are done or the run is long, sleepy late at night, a party hat on your birthday). */
function profileMood() {
  const p = profileGet();
  if (!p.react) return {};
  const m = {}, h = _pfHour(), today = _pfToday();
  if (h >= 23 || h < 5) { if (['dot', 'round', 'wide', 'lashes'].includes(p.avatar.eyes)) m.eyes = 'sleepy'; m.extra = 'zzz'; }
  const s = typeof gameOn === 'function' && gameOn() ? _pfStats() : null;
  if (s) {
    const st = s.streaks && s.streaks.done ? s.streaks.done : null;
    if (st && st.todayDone && st.current >= 3 && ['smile', 'neutral', 'smirk'].includes(p.avatar.mouth)) m.mouth = 'grin';
    const q = s.quests && Array.isArray(s.quests.list) ? s.quests.list : [];
    if (!m.extra && ((q.length && q.every(x => x.done)) || (st && st.todayDone && st.current >= 7))) m.extra = 'sparkle';
  }
  const bd = typeof APP_CONFIG !== 'undefined' && APP_CONFIG && typeof APP_CONFIG.birthday === 'string' ? APP_CONFIG.birthday : '';
  if (bd && today.slice(5) === bd) { m.extra = 'party'; m.mouth = 'grin'; }
  return m;
}

/* ---------- seasonal items: collected while in season, yours for good ---------- */
function profileCollectSeasonal() {
  const ctx = profileUnlockCtx(), p = _pfState(), got = [];
  for (const part of PF_PARTS) for (const o of part.opts || []) {
    if (!o.season) continue;
    const key = part.k + ':' + o.id;
    if (!p.collected[key] && profileSeasonOn(o.season, ctx.today, ctx.birthday)) { p.collected[key] = ctx.today; got.push(o.label); }
  }
  if (!got.length) return [];
  if (typeof saveUI === 'function') saveUI();
  if (typeof toast === 'function' && (typeof gameOn !== 'function' || gameOn())) {
    toast(`New for your avatar this season: ${got.join(', ')}. ${got.length > 1 ? 'They are' : 'It is'} yours to keep.`,
      { icon: 'sparkles', timeout: 9000, action: { label: 'Try it on', run: () => { if (typeof setView === 'function') setView('settings:me'); } } });
  }
  return got;
}

/* ---------- drawing for others: you, a friend, a person ---------- */
const _PF_SELF = Symbol('self');
function _pfWho(who) {
  if (who == null || who === 'me' || who === _PF_SELF || (who && typeof who === 'object' && who.self === true)) {
    const p = profileGet();
    return { me: true, avatar: p.avatar, theme: p.theme, name: profileDisplayName(p), profile: p };
  }
  if (typeof who !== 'object') return { name: '' };
  const raw = who.profile && typeof who.profile === 'object' ? who.profile : who.avatar && typeof who.avatar === 'object' && (who.name != null || who.status != null) ? who : null;
  if (raw) {
    const c = profileSanitize(raw, { badgeOk: (id) => !!profileBadgeInfo(id) });
    if (who.game && typeof who.game === 'object') c.game = profileSanitize({ game: who.game }).game;
    const nick = who.profile ? profileText(who.nick || who.name, PF_MAX.name) : '';
    return { friend: true, avatar: raw.avatar ? c.avatar : null, theme: c.theme, name: nick || c.name, profile: c, game: c.game };
  }
  // a friend view (window.Friends) that has not sent a profile yet: initials, never People's avatar (their id is not a person's)
  if (Object.prototype.hasOwnProperty.call(who, 'profile') || Object.prototype.hasOwnProperty.call(who, 'friendship')) {
    return { friend: true, avatar: null, theme: '', name: profileText(who.nick || who.name, PF_MAX.name), profile: { name: profileText(who.nick || who.name, PF_MAX.name), status: {}, badges: [], places: [] } };
  }
  return { person: who, name: profileText(who.name, 80) };
}
function _pfUid() { return 'pfa' + (++_pf.n).toString(36); }
function _pfMotionOk() { return !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _pfThemeHex(t) { return /^#[0-9a-f]{6}$/i.test(String(t)) ? String(t).toLowerCase() : (PF_SWATCHES[t] || PF_SWATCHES.indigo).hex; }
function _pfSizeOf(size) { const n = typeof size === 'object' && size ? Number(size.size) : Number(size); return Math.max(12, Math.min(512, Math.round(n || 32))); }
function profileAvatarHtml(who, size, o) {
  o = Object.assign({}, typeof size === 'object' && size ? size : {}, o || {});
  const sz = _pfSizeOf(size), w = _pfWho(who);
  if (w.avatar) {
    const mood = o.mood || (w.me ? profileMood() : {});
    return profileAvatarSvg(w.avatar, { size: sz, uid: _pfUid(), theme: w.theme, live: profileLive(w.me ? null : { game: w.game }), mood, motion: !!o.motion && _pfMotionOk() });
  }
  if (w.person && typeof avatarHtml === 'function') return avatarHtml(w.person, sz);
  const ini = typeof avatarInitials === 'function' ? avatarInitials(w.name || '?') : String(w.name || '?').slice(0, 2).toUpperCase();
  return `<span class="pf-av-init" style="--pf-c:${_pfThemeHex(w.theme)}">${esc(ini)}</span>`;
}
function profileAvatarEl(who, size, o) {
  o = Object.assign({}, typeof size === 'object' && size ? size : {}, o || {});
  const sz = _pfSizeOf(size), w = _pfWho(who);
  const el = document.createElement('span');
  el.className = 'pf-av' + (w.me ? ' is-me' : '') + (w.avatar && w.avatar.shape === 'squircle' ? ' is-sq' : '');
  el.style.setProperty('--pf-size', sz + 'px');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', w.me ? 'Your avatar' : (w.name ? w.name + "'s avatar" : 'Avatar'));
  el.innerHTML = profileAvatarHtml(who, sz, o);   // built from allow-listed ids and numbers only (97-profile-0kit.js)
  return el;
}

/** The profile card: you, a friend (their shared profile), or o.preview (exactly what friends get of you). */
function profileCardEl(who, o) {
  o = o || {};
  const shown = o.preview ? { profile: profilePayload(), game: _pfGameShare() } : who;   // the preview IS a friend's view of you
  const w = _pfWho(shown);
  const p = w.profile || {};
  const card = document.createElement('div');
  card.className = 'pf-card' + (o.compact ? ' is-compact' : '');
  card.style.setProperty('--pf-c', _pfThemeHex(w.theme));
  const band = document.createElement('div'); band.className = 'pf-card-band';
  const av = profileAvatarEl(w.me ? null : shown, o.compact ? 56 : 72, { motion: !!w.me });
  const head = document.createElement('div'); head.className = 'pf-card-head';
  const nm = document.createElement('div'); nm.className = 'pf-card-name';
  const n1 = document.createElement('span'); n1.textContent = w.name || 'Friend'; nm.appendChild(n1);
  if (p.pronouns) { const pr = document.createElement('span'); pr.className = 'pf-card-pron'; pr.textContent = p.pronouns; nm.appendChild(pr); }
  head.appendChild(nm);
  const st = w.me ? profileStatusNow(p) : (p.status && (p.status.emoji || p.status.text) && !(p.status.until && p.status.until <= Date.now()) ? p.status : null);   // clock-ok
  if (st) { const s = document.createElement('div'); s.className = 'pf-card-status'; s.textContent = [st.emoji, st.text].filter(Boolean).join(' '); head.appendChild(s); }
  const lv = w.me ? _pfGameShare() : w.game;
  if (lv && lv.level) {
    const g = document.createElement('div'); g.className = 'pf-card-lv';
    g.innerHTML = icon('trophy', 'i-xs');
    const t = document.createElement('span');
    t.textContent = `Level ${lv.level}${typeof gameTitleOf === 'function' ? ' ' + gameTitleOf(lv.level) : ''}${lv.streak ? ` · ${lv.streak}-day streak` : ''}`;
    g.appendChild(t); head.appendChild(g);
  }
  card.append(band, av, head);
  if (p.bio) { const b = document.createElement('p'); b.className = 'pf-card-bio'; b.textContent = p.bio; card.appendChild(b); }
  if (p.working) {
    const wk = document.createElement('div'); wk.className = 'pf-card-work';
    wk.innerHTML = icon('briefcase', 'i-xs');
    const t = document.createElement('span'); t.textContent = 'Working on ' + p.working; wk.appendChild(t);
    card.appendChild(wk);
  }
  const badges = (w.me ? profileShowcase(p) : p.badges || []).map(profileBadgeInfo).filter(Boolean);
  if (badges.length && !o.compact) {
    const row = document.createElement('div'); row.className = 'pf-card-badges';
    for (const b of badges) {
      const c = document.createElement('span'); c.className = 'pf-badge'; c.setAttribute('data-tip', b.hint ? `${b.label}: ${b.hint}` : b.label);
      c.innerHTML = icon(/^[a-z0-9-]+$/.test(b.icon) ? b.icon : 'award', 'i-sm');
      const t = document.createElement('span'); t.textContent = b.label; c.appendChild(t);
      row.appendChild(c);
    }
    card.appendChild(row);
  }
  const places = Array.isArray(p.places) ? p.places : [];
  if (places.length && !o.compact) {
    const row = document.createElement('div'); row.className = 'pf-card-places';
    for (const pl of places) {
      const c = document.createElement('span'); c.className = 'pf-place';
      c.textContent = [profileFlag(pl.cc), profileText(pl.label, PF_MAX.place)].filter(Boolean).join(' ');
      row.appendChild(c);
    }
    card.appendChild(row);
  }
  return card;
}

/* ---------- sharing with friends (docs/dev/FRIENDS.md: kind 'profile', Friends.publish) ---------- */
function _pfGameShare() {
  const s = _pfStats();
  if (!s) return null;
  return { level: s.level.level, streak: s.streaks && s.streaks.done ? s.streaks.done.current : 0, best: s.streaks && s.streaks.done ? s.streaks.done.best : 0, xp: s.xp.total };
}
function profilePayload() {
  const p = _pfState();
  const src = Object.assign({}, p, { badges: profileShowcase(profileGet()) });
  // No display name set here: the name chosen for friends (Friends settings, "Your name for friends"), then Name & region.
  let forFriends = '';
  try { const F = _pfFriends(), m = F && typeof F.me === 'function' ? F.me() : null; forFriends = m && typeof m.name === 'string' ? m.name : ''; } catch (e) { forFriends = ''; }
  return profileWire(src, { fallbackName: forFriends || (typeof userName === 'function' ? userName() : ''), badgeOk: (id) => !!profileBadgeInfo(id) });
}
function _pfSig(body) { const b = Object.assign({}, body); delete b.at; const s = JSON.stringify(b); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
function _pfFriends() { return typeof window !== 'undefined' && window.Friends && typeof window.Friends.publish === 'function' ? window.Friends : null; }
async function profileShareNow(force) {
  const F = _pfFriends();
  if (!F) return false;
  try { if (F.ready && typeof F.ready.then === 'function') await F.ready; } catch (e) { return false; }
  const body = profilePayload(), sig = _pfSig(body), p = _pfState();
  if (!force && sig === p.sentSig) return true;
  try {
    await F.publish('profile', body);
    p.sentSig = sig;
    if (typeof saveUI === 'function') saveUI();
    return true;
  } catch (e) { console.warn('[profile] not sent to friends yet:', e && e.message); return false; }
}
function _pfShareSoon() { clearTimeout(_pf.shareT); _pf.shareT = setTimeout(() => { profileShareNow(false).catch(() => {}); }, 3000); }

/* ---------- the corner (2.17.1): the top-bar chip moved to the sidebar's workspace button (97-profile-3corner.js) ---------- */
/** Repaint the corner: your avatar, status emoji and friends badge (the 2.17 chip's job; the name stays for the callers above). */
function _pfChipPaint() {
  if (typeof profileCornerPaint !== 'function') return;
  try { profileCornerPaint(); } catch (e) { console.error('[profile corner]', e); }
}
/** Set a quick status: the corner's hub opens on the quick statuses (anchor: optional; falls back to Settings > Profile). */
function profileOpenPop(anchor) {
  if (typeof profileHubOpen === 'function' && profileHubOpen(anchor, { status: true })) return;
  if (typeof setView === 'function') setView('settings:me');
}
function _pfEndOfDay() {
  try { const t = Clock.parts(Clock.now()); return Clock.now() + (24 * 60 - 1 - t.min) * 60000 + (59 - (t.s || 0)) * 1000; } catch (e) { const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime(); }   // clock-ok: fallback only
}

/* ---------- boot, sync and other modules ---------- */
function _pfBoot() {
  if (_pf.booted) return; _pf.booted = true;
  try { profileCollectSeasonal(); } catch (e) { console.error('[profile]', e); }
  _pfStatusTimer();
  const F = _pfFriends();
  if (F && F.ready && typeof F.ready.then === 'function') F.ready.then(() => profileShareNow(false)).catch(() => {});
}
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(_pfBoot, 4000), { once: true });
  // a new day can bring a seasonal item; a level or an achievement can change the frame, the mood and the showcase
  document.addEventListener('opendash:game', (e) => {
    const k = e && e.detail ? e.detail.kind : '';
    _pf.chipKey = '';
    if (k === 'achievement' || k === 'level') { _pfShareSoon(); setTimeout(_pfChipPaint, 50); }
  });
  setInterval(() => { try { if (!_pf.booted) return; profileCollectSeasonal(); _pfChipPaint(); } catch (e) { /* never in the way */ } }, 30 * 60000);
  window.OpenDashProfile = Object.freeze({
    get: () => profileGet(), set: (patch) => profileSet(patch), name: () => profileDisplayName(),
    avatarEl: (who, size) => profileAvatarEl(who, size), avatarHtml: (who, size) => profileAvatarHtml(who, size), cardEl: (who, o) => profileCardEl(who, o),
    payload: () => profilePayload(), sanitize: (p) => profileSanitize(p, { badgeOk: (id) => !!profileBadgeInfo(id) }), share: (force) => profileShareNow(force),
  });
}
