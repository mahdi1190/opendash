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
      places: [{label, cc}] (names only), share: {places: false, visits: true},
      react: true (the avatar reacts to your day), collected: {'hat:witch': day, 'banner:pumpkins': day},
      look: {banner, bannerCol, bannerCol2, scene, np: {font, weight, col, fx}, title, favs, cur: {k, t}, tint}
            (2.18, agent 'you': the card's look, 97-profile-0look.js),
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
     profileCardEl(who, o)          the profile card (2.18: bigger, with your banner, nameplate, title, favourite emoji,
                                    'currently', the tint and your visitors count). o.compact (the hub), o.preview (what a
                                    friend sees of you), o.actions (an element for the top right), o.visits (show the count)
     profileNameplateApply(el, p, o)   style a name element with a profile's nameplate (o.small: the corner)
     profileTitleOf(p)              the title chosen and shown {id, label, icon} | null
     profileLookCtx()               profileUnlockCtx() plus {garden, friends}: what the look's locks read
     profileExtend({key, wire, sanitize, card})   another agent adds a field to the profile (e.g. 'pets': a pet):
                                    wire(stateProfile) -> value for friends | undefined; sanitize(raw) -> clean value |
                                    null (also for friends' values); card(cardEl, view, o) draws it on the card. The
                                    server side is lib/profile-avatar.mjs extendProfileKind(field, schema).
     profileVisits()                Promise {total, week, today} | null: friends' visits to your card (counts only)
     profilePayload()               the body friends get (profileWire): only what you filled in
     profileShareNow(force)         publish it with Friends.publish('profile', body) -> Promise<bool>
     window.OpenDashProfile         {get, set, avatarEl, avatarHtml, cardEl, payload, sanitize, name, share, extend, title, visits}
     document event 'opendash:profile'   detail {profile}: it changed (here, or synced from another device)
   Text from friends is drawn with textContent only, after profileSanitize; an avatar is data drawn here.
   ============================================================ */
const _pf = { n: 0, shareT: 0, chipKey: '', statusT: 0, booted: false, lastSig: '', io: null, visits: null, visitsAt: 0, visitsP: null, visited: new Map() };
const PF_STATUS_PRESETS = Object.freeze([['🎯', 'Focusing'], ['💻', 'Working'], ['✍️', 'Writing'], ['📞', 'In a meeting'], ['☕', 'On a break'], ['🏠', 'Working from home'],
  ['✈️', 'Travelling'], ['🌴', 'On holiday'], ['🤒', 'Off sick'], ['😴', 'Away']]);

function _pfState() {
  if (typeof state === 'undefined' || !state) return { status: {}, avatar: profileAvatarDefault(), share: {}, collected: {} };
  if (!state.profile || typeof state.profile !== 'object' || Array.isArray(state.profile)) state.profile = { v: 1 };
  const p = state.profile;
  for (const k of ['status', 'share', 'collected']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  if (!p.avatar || typeof p.avatar !== 'object' || Array.isArray(p.avatar)) p.avatar = profileAvatarDefault();
  if (p.look != null && (typeof p.look !== 'object' || Array.isArray(p.look))) p.look = {};
  if (!p.v) p.v = 1;
  return p;
}
const _pfLookOf = (p) => (typeof profileLookNormalize === 'function' ? profileLookNormalize(p && p.look) : null);
function profileGet() {
  const p = _pfState();
  return { name: profileText(p.name, PF_MAX.name), pronouns: profileText(p.pronouns, PF_MAX.pronouns), bio: profileText(p.bio, PF_MAX.bio),
    working: profileText(p.working, PF_MAX.working), theme: typeof p.theme === 'string' && p.theme ? p.theme : 'indigo',
    status: { emoji: profileEmojiOk(p.status.emoji) ? p.status.emoji : '', text: profileText(p.status.text, PF_MAX.status), until: Number(p.status.until) || 0 },
    avatar: profileAvatarNormalize(p.avatar), badges: Array.isArray(p.badges) ? p.badges.slice(0, PF_MAX.badges) : null,
    places: Array.isArray(p.places) ? p.places.slice(0, PF_MAX.places) : [], share: Object.assign({ places: false, visits: true }, p.share),
    react: p.react !== false, collected: Object.assign({}, p.collected), look: _pfLookOf(p), updatedAt: Number(p.updatedAt) || 0 };
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
    else if (k === 'look' && v && typeof v === 'object' && !Array.isArray(v)) {   // field by field (the nameplate and 'currently' too), then cleaned
      const cur = p.look && typeof p.look === 'object' ? p.look : {};
      const next = Object.assign({}, cur, v);
      if (v.np && typeof v.np === 'object') next.np = Object.assign({}, cur.np, v.np);
      if (v.cur && typeof v.cur === 'object') next.cur = Object.assign({}, cur.cur, v.cur);
      p.look = typeof profileLookNormalize === 'function' ? profileLookNormalize(next) : next;
    } else if (['name', 'pronouns', 'bio', 'working', 'theme', 'badges', 'places', 'react'].includes(k)) p[k] = v;
    else if (_pfExt().has(k)) p[k] = v;   // another agent's field (profileExtend): its wire() and sanitize() check it
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
  // 2.18: seasonal banners are collected the same way ('banner:<id>')
  let banners = 0;
  for (const b of typeof PF_BANNERS !== 'undefined' ? PF_BANNERS : []) {
    if (!b.season) continue;
    const key = 'banner:' + b.id;
    if (!p.collected[key] && profileSeasonOn(b.season, ctx.today, ctx.birthday)) { p.collected[key] = ctx.today; got.push(b.label + ' banner'); banners++; }
  }
  if (!got.length) return [];
  if (typeof saveUI === 'function') saveUI();
  if (typeof toast === 'function' && (typeof gameOn !== 'function' || gameOn())) {
    toast(`New for your profile this season: ${got.join(', ')}. ${got.length > 1 ? 'They are' : 'It is'} yours to keep.`,
      { icon: 'sparkles', timeout: 9000, action: { label: 'Try it on', run: () => {
        if (banners && typeof _pfOpenLook === 'function') { _pfUI.lookTab = 'banner'; _pfOpenLook(); } else if (typeof setView === 'function') setView('settings:me');
      } } });
  }
  return got;
}

/* ---------- drawing for others: you, a friend, a person ---------- */
const _PF_SELF = Symbol('self');
function _pfWho(who) {
  if (who == null || who === 'me' || who === _PF_SELF || (who && typeof who === 'object' && who.self === true)) {
    const p = profileGet();
    p.ext = _pfExtValues(_pfState(), true);
    return { me: true, avatar: p.avatar, theme: p.theme, name: profileDisplayName(p), profile: p };
  }
  if (typeof who !== 'object') return { name: '' };
  const raw = who.profile && typeof who.profile === 'object' ? who.profile : who.avatar && typeof who.avatar === 'object' && (who.name != null || who.status != null) ? who : null;
  if (raw) {
    const c = profileSanitize(raw, { badgeOk: (id) => !!profileBadgeInfo(id) });
    if (who.game && typeof who.game === 'object') c.game = profileSanitize({ game: who.game }).game;
    c.look = _pfLookOf(raw);   // 2.18: ids mapped through the look tables (an old friend without one gets the default)
    c.ext = _pfExtValues(raw, false);
    const nick = who.profile ? profileText(who.nick || who.name, PF_MAX.name) : '';
    return { friend: true, avatar: raw.avatar ? c.avatar : null, theme: c.theme, name: nick || c.name, profile: c, game: c.game };
  }
  // a friend view (window.Friends) that has not sent a profile yet: initials, never People's avatar (their id is not a person's)
  if (Object.prototype.hasOwnProperty.call(who, 'profile') || Object.prototype.hasOwnProperty.call(who, 'friendship')) {
    return { friend: true, avatar: null, theme: '', name: profileText(who.nick || who.name, PF_MAX.name), profile: { name: profileText(who.nick || who.name, PF_MAX.name), status: {}, badges: [], places: [], look: _pfLookOf(null), ext: {} } };
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

/* ---------- extensions (2.18): other agents add a field to the profile ---------- */
// var, not const: another agent's file may call profileExtend before this file has run (a classic script shares one scope)
var _pfExtStore;   // eslint-disable-line no-var
function _pfExt() { return _pfExtStore || (_pfExtStore = new Map()); }
function _pfExtReserved() { return ['v', 'name', 'pronouns', 'bio', 'working', 'theme', 'status', 'avatar', 'badges', 'places', 'share', 'react', 'collected', 'look',
  'sentSig', 'updatedAt', 'emoji', 'until', 'color', 'city', 'at', 'game', 'ext', '__proto__', 'constructor', 'prototype']; }
/**
 * profileExtend({key, wire, sanitize, card, order}) -> true | false (a bad or taken key).
 *   key        the field, /^[a-z][A-Za-z0-9]{1,23}$/ (state.profile[key] on this side, body[key] on the wire)
 *   wire(sp)   from state.profile (raw), what friends get: a small JSON value, or undefined for nothing
 *   sanitize(v) a friend's value (or yours, from wire) cleaned for drawing: allow-listed ids and plain text, or null
 *   card(el, view, o)  draw it on the card (view: {me, friend, name, profile: {..., ext: {key: clean value}}})
 *   mine(sp)   optional (integrate 2.18): what your OWN card shows, when that differs from what friends get (a pet
 *              you keep to yourself still sits on your card; the preview of what friends see uses wire)
 * profileSet({[key]: value}) saves it like the rest of the profile (synced as one value) and shares it soon.
 * The server must accept the field too: lib/profile-avatar.mjs extendProfileKind(key, schema).
 */
function profileExtend(def) {
  if (!def || typeof def !== 'object') return false;
  const key = String(def.key || '');
  if (!/^[a-z][A-Za-z0-9]{1,23}$/.test(key) || _pfExtReserved().includes(key)) return false;
  _pfExt().set(key, { key, order: Number(def.order) || 50, wire: typeof def.wire === 'function' ? def.wire : null,
    sanitize: typeof def.sanitize === 'function' ? def.sanitize : () => null, card: typeof def.card === 'function' ? def.card : null,
    mine: typeof def.mine === 'function' ? def.mine : null });   // integrate 2.18: what YOUR own card shows (else what friends get)
  try { _pf.chipKey = ''; if (_pf.booted) _pfShareSoon(); } catch (e) { /* called before this file ran: the first share includes it */ }
  return true;
}
/** Extension values, cleaned: mine from state.profile (through wire), a friend's from their profile body. */
function _pfExtValues(src, mine) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const e of _pfExt().values()) {
    try {
      const raw = mine ? (e.mine ? e.mine(src) : e.wire ? e.wire(src) : undefined) : (Object.prototype.hasOwnProperty.call(src, e.key) ? src[e.key] : undefined);
      if (raw === undefined || raw === null) continue;
      const v = e.sanitize(raw);
      if (v !== undefined && v !== null) out[e.key] = v;
    } catch (err) { console.error('[profile] extension ' + e.key, err); }
  }
  return out;
}

/* ---------- the look on the page: nameplate, title, banner motion ---------- */
function _pfFun() {
  try { if (typeof memFunLevel === 'function') return memFunLevel(); if (typeof gameFun === 'function') return gameFun(); } catch (e) { /* default */ }
  return 'subtle';
}
/** Animated banners and nameplates move only with motion allowed and the Fun level not Off. */
function _pfLookMotion() { return _pfMotionOk() && _pfFun() !== 'off'; }
/** The title shown on a profile (yours or a friend's): {id, label, icon} from the tables, or null. */
function profileTitleOf(p) {
  const look = p && p.look ? p.look : _pfLookOf(p);
  const t = look && look.title && typeof pfTitle === 'function' ? pfTitle(look.title) : null;
  return t ? { id: t.id, label: t.label, icon: t.icon || 'award' } : null;
}
/** Style a name with a profile's nameplate: font, weight, colour or gradient and the effect, all from the tables. */
function profileNameplateApply(el, p, o) {
  o = o || {};
  if (!el || !el.style) return el;
  const look = p && p.look ? p.look : _pfLookOf(p);
  const th = o.theme || _pfThemeHex(p && p.theme);
  const css = look && typeof profileNameplateCss === 'function' ? profileNameplateCss(look.np, th) : null;
  const keep = String(el.className || '').split(/\s+/).filter(c => c && !/^pf-np/.test(c));
  if (!css) { el.className = keep.join(' '); return el; }
  const cls = keep.concat(['pf-np', 'pf-np-fx-' + css.fx]);
  if (css.gradient) cls.push('pf-np-grad');
  if (o.small) cls.push('pf-np-small');
  if (css.anim && !_pfLookMotion()) cls.push('pf-np-still');
  el.className = cls.join(' ');
  el.style.fontFamily = css.font;
  el.style.fontWeight = String(css.weight);
  el.style.fontStretch = css.stretch || '';
  el.style.setProperty('--np-size', String(css.size || 1));
  el.style.setProperty('--np-t', th);
  if (css.colour) el.style.setProperty('--np-c', css.colour); else el.style.removeProperty('--np-c');
  if (css.gradient) el.style.setProperty('--np-g', `linear-gradient(90deg, ${css.gradient.join(', ')})`); else el.style.removeProperty('--np-g');
  return el;
}
/** What the look's locks read: the avatar's unlock context plus the garden (things ever finished) and your friends. */
function profileLookCtx() {
  const ctx = profileUnlockCtx();
  ctx.achFor = _pfAchFor;
  try { const g = typeof memGardenModel === 'function' ? memGardenModel(7) : null; ctx.garden = g ? Number(g.total) || 0 : 0; } catch (e) { ctx.garden = 0; }
  try { ctx.friends = window.Friends && typeof window.Friends.list === 'function' ? window.Friends.list().length : 0; } catch (e) { ctx.friends = 0; }
  return ctx;
}
/* ---------- the achievements' rewards (2.18 ach-core: ACH_REWARD_KINDS 'title' | 'banner' | 'plate', owner 'you') ----------
   An achievement may name a title, a banner or a nameplate part as its reward ('title:Timekeeper', 'banner:sunset',
   'plate:goldfoil'; docs/dev/ACHIEVEMENTS_500.md). Where this build has it (profileLookRewardRef, 97-profile-0look.js),
   that achievement locks it in Your card and its card names it; where it has not, nothing changes. All guarded. */
function _pfAchFor(kind, o) {
  if (typeof achUnlockOf !== 'function' || !o) return '';
  if (kind === 'title') return achUnlockOf('title', o.label) || achUnlockOf('title', o.id) || '';
  if (kind === 'banner') return achUnlockOf('banner', o.id) || '';
  if (kind === 'font' || kind === 'col' || kind === 'fx') return achUnlockOf('plate', o.id) || '';
  return '';
}
if (typeof registerAchRewardLabel === 'function' && typeof profileLookRewardRef === 'function') {
  registerAchRewardLabel('title', (ref) => { const r = profileLookRewardRef('title', ref); return r ? `the title “${r.label}”` : ''; });
  registerAchRewardLabel('banner', (ref) => { const r = profileLookRewardRef('banner', ref); return r ? `the ${r.label} profile banner` : ''; });
  registerAchRewardLabel('plate', (ref) => { const r = profileLookRewardRef('plate', ref); return r ? `the ${r.label} nameplate ${r.kind === 'font' ? 'font' : r.kind === 'col' ? 'colour' : 'style'}` : ''; });
}
/** The achievements' reward hook (78-achievements.js _achRewardEmit): the corner and an open Settings › Profile show it at once. */
function profileAchReward(kind, ref) {
  try {
    if (typeof profileLookRewardRef !== 'function' || !profileLookRewardRef(kind, ref)) return false;
    _pf.chipKey = '';
    if (typeof state !== 'undefined' && state && state.view === 'settings:me' && typeof render === 'function') render();
    else if (typeof profileCornerPaint === 'function') profileCornerPaint();
    return true;
  } catch (e) { return false; }
}
/** The banner's art (an SVG string from the look tables). */
function _pfBannerHtml(look, th, o) {
  if (typeof profileBannerSvg !== 'function') return '';
  return profileBannerSvg(look, { theme: th, uid: _pfUid(), motion: !(o && o.still) && _pfLookMotion(), density: _pfFun() === 'full' ? 'full' : 'subtle' });
}
/** A full scene of the app's own list for a ref ('pack/item'), or null (a friend's scene this app lacks: their colour shows). */
function _pfSceneItem(ref) {
  if (typeof ref !== 'string' || !/^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}$/.test(ref) || typeof animItem !== 'function') return null;
  try { const it = animItem(ref); return it && it.full ? it : null; } catch (e) { return null; }
}
/** Lay one of the app's own scenes over the banner, drawn still by its own engine when the card comes into view. */
function _pfSceneBanner(host, ref, o) {
  const it = _pfSceneItem(ref);
  if (!it || typeof animItemHtml !== 'function') return false;
  host.classList.add('has-scene');
  host.setAttribute('data-scene-key', 'pfb-' + String(ref).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60));
  const mount = () => {
    if (host.querySelector(':scope > .anim-scene')) return;
    try {
      const t = document.createElement('template');
      t.innerHTML = animItemHtml(it, { size: 'fill', live: false, detail: 'tile', hover: !!(o && o.hover) && _pfLookMotion() });   // the app's own scene markup for its own item: no friend text in it
      const h = t.content.firstElementChild;
      if (h) { h.classList.add('pf-card-scene'); host.appendChild(h); }
    } catch (e) { console.error('[profile] scene banner', e); }
  };
  if (typeof IntersectionObserver === 'function') {
    if (!_pf.io) _pf.io = new IntersectionObserver((list) => { for (const x of list) if (x.isIntersecting) { _pf.io.unobserve(x.target); if (x.target._pfMount) { x.target._pfMount(); delete x.target._pfMount; } } }, { rootMargin: '120px' });
    host._pfMount = mount; _pf.io.observe(host);
  } else mount();
  const lab = document.createElement('span'); lab.className = 'pf-card-scene-l'; lab.textContent = it.label || 'A scene';
  host.appendChild(lab);
  return true;
}

/** The profile card: you, a friend (their shared profile), or o.preview (exactly what friends get of you). */
function profileCardEl(who, o) {
  o = o || {};
  const shown = o.preview ? { profile: profilePayload(), game: _pfGameShare() } : who;   // the preview IS a friend's view of you
  const w = _pfWho(shown);
  const p = w.profile || {};
  const look = p.look || _pfLookOf(null) || { tint: 'soft', banner: 'theme', np: {}, favs: [], cur: {} };
  const th = _pfThemeHex(w.theme);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; };
  const card = el('div', 'pf-card' + (o.compact ? ' is-compact' : '') + ' tint-' + (look.tint || 'soft'));
  card.style.setProperty('--pf-c', th);
  // the banner: art from the tables, or one of this app's own scenes (by id) over your colour
  const ban = el('div', 'pf-card-banner');
  ban.setAttribute('aria-hidden', 'true');
  ban.innerHTML = _pfBannerHtml(look, th, o);   // built from allow-listed ids and re-checked colours only (97-profile-0look.js)
  if (look.banner === 'scene' && look.scene) _pfSceneBanner(ban, look.scene, { hover: !o.compact });
  card.appendChild(ban);
  // the avatar over the banner's edge, and an optional slot for buttons beside it
  const top = el('div', 'pf-card-top');
  const avw = el('span', 'pf-card-av');
  avw.appendChild(profileAvatarEl(w.me ? null : shown, o.compact ? 64 : 92, { motion: !!w.me }));
  top.appendChild(avw);
  if (o.actions && o.actions.nodeType === 1) { const a = el('div', 'pf-card-acts'); a.appendChild(o.actions); top.appendChild(a); }
  card.appendChild(top);
  // the name, big and in your nameplate style; pronouns, title, status, level
  const head = el('div', 'pf-card-head');
  const nm = el('div', 'pf-card-name');
  const n1 = el('span', 'pf-card-n', w.name || 'Friend');
  profileNameplateApply(n1, p, { theme: th });
  nm.appendChild(n1);
  if (p.pronouns) nm.appendChild(el('span', 'pf-card-pron', p.pronouns));
  head.appendChild(nm);
  const title = profileTitleOf(p);
  if (title) {
    const t = el('span', 'pf-card-title');
    t.innerHTML = icon(/^[a-z0-9-]+$/.test(title.icon) ? title.icon : 'award', 'i-xs');
    t.appendChild(el('span', null, title.label));
    head.appendChild(t);
  }
  const st = w.me ? profileStatusNow(p) : (p.status && (p.status.emoji || p.status.text) && !(p.status.until && p.status.until <= Date.now()) ? p.status : null);   // clock-ok
  if (st) head.appendChild(el('div', 'pf-card-status', [st.emoji, st.text].filter(Boolean).join(' ')));
  const lv = w.me ? (typeof gameOn !== 'function' || gameOn() ? _pfGameShare() : null) : w.game;
  if (lv && lv.level) {
    const g = el('div', 'pf-card-lv');
    g.innerHTML = icon('trophy', 'i-xs');
    g.appendChild(el('span', null, `Level ${lv.level}${typeof gameTitleOf === 'function' ? ' ' + gameTitleOf(lv.level) : ''}${lv.streak ? ` · ${lv.streak}-day streak` : ''}`));
    head.appendChild(g);
  }
  card.appendChild(head);
  if (p.bio) card.appendChild(el('p', 'pf-card-bio', p.bio));
  // what you are into right now, and what you are working on
  const cur = look.cur && look.cur.k && look.cur.t ? (typeof PF_CURRENTLY !== 'undefined' ? PF_CURRENTLY.find(x => x[0] === look.cur.k) : null) : null;
  if (cur) {
    const c = el('div', 'pf-card-cur');
    c.innerHTML = icon(cur[2], 'i-xs');
    c.append(el('span', 'pf-card-cur-k', cur[1]), el('span', 'pf-card-cur-t', look.cur.t));
    card.appendChild(c);
  }
  if (p.working) {
    const wk = el('div', 'pf-card-work');
    wk.innerHTML = icon('briefcase', 'i-xs');
    wk.appendChild(el('span', null, 'Working on ' + p.working));
    card.appendChild(wk);
  }
  if (Array.isArray(look.favs) && look.favs.length) {
    const f = el('div', 'pf-card-favs');
    f.setAttribute('role', 'img'); f.setAttribute('aria-label', 'Favourite emoji: ' + look.favs.join(' '));
    for (const e of look.favs) f.appendChild(el('span', 'pf-fav', e));
    card.appendChild(f);
  }
  const badges = (w.me ? profileShowcase(p) : p.badges || []).map(profileBadgeInfo).filter(Boolean);
  if (badges.length && !o.compact) {
    const row = el('div', 'pf-card-badges');
    for (const b of badges) {
      const c = el('span', 'pf-badge'); c.setAttribute('data-tip', b.hint ? `${b.label}: ${b.hint}` : b.label);
      c.innerHTML = icon(/^[a-z0-9-]+$/.test(b.icon) ? b.icon : 'award', 'i-sm');
      c.appendChild(el('span', null, b.label));
      row.appendChild(c);
    }
    card.appendChild(row);
  }
  const places = Array.isArray(p.places) ? p.places : [];
  if (places.length && !o.compact) {
    const row = el('div', 'pf-card-places');
    for (const pl of places) row.appendChild(el('span', 'pf-place', [profileFlag(pl.cc), profileText(pl.label, PF_MAX.place)].filter(Boolean).join(' ')));
    card.appendChild(row);
  }
  // friends' visits to your card: a count, never who (only on your own card)
  if (w.me && o.visits && !o.preview) {
    const v = el('div', 'pf-card-visits'); v.hidden = true;
    card.appendChild(v);
    profileVisits().then((n) => { if (v.isConnected) _pfVisitsPaint(v, n); }).catch(() => {});
  }
  // other agents' fields (profileExtend), in their order
  for (const e of [..._pfExt().values()].sort((a, b) => a.order - b.order)) {
    if (!e.card || !p.ext || p.ext[e.key] == null) continue;
    try { e.card(card, w, o); } catch (err) { console.error('[profile] extension card ' + e.key, err); }
  }
  return card;
}

/* ---------- friends' visits (2.18): counts only (server/routes/profile.mjs) ---------- */
/** Friends' visits to your card: Promise {total, week, today} | null (cached a minute). */
function profileVisits() {
  if (_pf.visits && Date.now() - _pf.visitsAt < 60000) return Promise.resolve(_pf.visits);   // clock-ok: a cache age
  if (_pf.visitsP) return _pf.visitsP;
  _pf.visitsP = fetch('/api/profile/visits', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
    .then((j) => { const n = j && j.ok ? { total: Math.max(0, Number(j.total) || 0), week: Math.max(0, Number(j.week) || 0), today: Math.max(0, Number(j.today) || 0) } : null; _pf.visits = n; _pf.visitsAt = Date.now(); return n; })   // clock-ok: a cache age
    .catch(() => null).finally(() => { _pf.visitsP = null; });
  return _pf.visitsP;
}
/**
 * integrate 2.18: the server's `event: profile` (86-live-sync.js; server/routes/profile.mjs emits {type: 'visit'} when a
 * friend's visit is counted): the visits line on every open card of yours updates at once instead of within the minute.
 */
function profileOnEvent(d) {
  if (!d || d.type !== 'visit') return;
  _pf.visits = null; _pf.visitsAt = 0;
  const lines = typeof document !== 'undefined' ? document.querySelectorAll('.pf-card-visits') : [];
  if (!lines.length) return;
  profileVisits().then((n) => { for (const v of lines) if (v.isConnected) _pfVisitsPaint(v, n); }).catch(() => {});
}
function _pfVisitsPaint(v, n) {
  if (!v || !n || !n.total) return;
  v.replaceChildren();
  v.innerHTML = icon('eye', 'i-xs');
  const s = document.createElement('span');
  s.textContent = `${n.total.toLocaleString()} visit${n.total === 1 ? '' : 's'} from friends${n.week ? ` · ${n.week.toLocaleString()} this week` : ''}`;
  v.appendChild(s);
  v.setAttribute('data-tip', 'How often friends opened your card this year. Only the number: never who.');
  v.hidden = false;
}
/** You opened a friend's card: tell them +1, once a day per friend, when you allow it (Settings > Profile). Never says more than that. */
function profileVisitFriend(f) {
  try {
    if (!f || f.status !== 'friend' || !/^[0-9a-f]{16}$/.test(String(f.id || ''))) return;
    if (!profileGet().share.visits) return;
    const F = _pfFriends();
    if (!F || typeof F.send !== 'function') return;
    const day = _pfToday(), key = 'pfVisit:' + f.id;
    if (_pf.visited.get(f.id) === day) return;
    _pf.visited.set(f.id, day);
    let last = '';
    try { last = localStorage.getItem(key) || ''; } catch (e) { last = ''; }
    if (last === day) return;
    try { localStorage.setItem(key, day); } catch (e) { /* private mode: once per page load */ }
    F.send(f.id, 'profile:visit', { d: day }).catch(() => {});   // the kind's scope is 'profile': it only goes where your profile does
  } catch (e) { /* never in the way */ }
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
  const body = profileWire(src, { fallbackName: forFriends || (typeof userName === 'function' ? userName() : ''), badgeOk: (id) => !!profileBadgeInfo(id) });
  // 2.18: the card's look (only what differs from the default) and other agents' fields (profileExtend)
  const look = typeof profileLookWire === 'function' ? profileLookWire(p.look) : null;
  if (look) body.look = look;
  const extKeys = [];
  for (const e of [..._pfExt().values()].sort((a, b) => a.order - b.order)) {
    if (!e.wire || Object.prototype.hasOwnProperty.call(body, e.key)) continue;
    try { const v = e.wire(p); if (v !== undefined && v !== null) { body[e.key] = v; extKeys.push(e.key); } } catch (err) { console.error('[profile] extension ' + e.key, err); }
  }
  // integrate 2.18: a friend still on 2.17 drops a profile over 4096 bytes whole (their cap), so in the rare worst case
  // (every text field full) the extras go first, newest first: other agents' fields, then the look's lines and emoji
  const size = () => { try { return JSON.stringify(body).length; } catch (e) { return 0; } };
  while (size() > _PF_BODY_SOFT_MAX) {
    if (extKeys.length) { delete body[extKeys.pop()]; continue; }
    if (body.look && body.look.cur) { delete body.look.cur; continue; }
    if (body.look && body.look.favs) { delete body.look.favs; continue; }
    if (body.look) { delete body.look; continue; }
    break;
  }
  return body;
}
const _PF_BODY_SOFT_MAX = 4000;   // integrate 2.18: under 2.17's 4096 cap on the profile kind (2.18's is 6144)
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
    extend: (def) => profileExtend(def), title: (p) => profileTitleOf(p || profileGet()), visits: () => profileVisits(),   // 2.18
  });
}
