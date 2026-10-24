/* ============================================================
   FRIENDS: WHAT EACH FRIEND CAN SEE, the pure part (2.17). Owner: perms.
   No DOM, no page globals at load: lib/friends/share.mjs evaluates this file
   in Node (like lib/customise.mjs), so the page, the sender and the receiver
   use ONE scope model and ONE allow-list.

   The user's rule (24 Oct): "choose what friend can see what of your data ...
   they have to be a trusted friend and you can enable or disable what they see".
     - profile and game progress are on by default; everything else is OFF;
     - anything beyond profile and game needs a friend you marked TRUSTED;
     - an unknown scope or level means nothing is sent (default deny);
     - a share can be time-limited (until a day, or a window such as a trip).

   WHO SENDS WHAT (docs/dev/FRIENDS.md section 9): profile ('profile', agent profile),
   game progress ('share:game', the engine) and presence ('presence', the engine) are sent
   by their owners; the scopes here only decide WHETHER (app.ctx.friends.setPolicy).
   Tasks, calendar, money, locations and memories are built and sent by agent perms
   (lib/friends/share.mjs) as 'share:<scope>'.

   DATA: state.friendPerms (a data key, synced: lib/sync/manifest.mjs '── perms ──') =
     { v: 1,
       stopped: 0 | ms,                    "Stop sharing everything": nothing goes to anyone (Together spaces,
                                           cheers, quests, postcards, live:addr too: lib/friends/share.mjs decide())
       friends: { <friendId>: {
         trusted: bool,                    you marked them trusted (needed beyond profile and game)
         stopped: 0 | ms,                  "Stop sharing with Sam"
         at: ms,                           last change
         scopes: { <scope>: { mode, ids?, streams?, tags?, items?, from?, until?, label? } } } } }
   A missing scope takes its default. ids = tasks shared one by one ('shared'),
   streams / tags = the chosen ones ('chosen'), items = chosen memories ('journal-YYYY-MM-DD',
   'postcard-CC', 'capsule-<id>', 'goals-YYYY'); from / until = 'YYYY-MM-DD' (inclusive), label =
   what the window was ("our Paris trip").

   API (plain functions; the page side is 98-perms-1core.js):
     PERMS_SCOPES                     the scopes in display order: {id, label, icon, kind, by, modes: [[id, label]], def, sensitive, risky?}
     PERMS_SENT_SCOPES                the scopes agent perms builds and sends itself
     permsScope(id) / permsModeOk(scope, mode) / permsIsOn(mode)
     permsNormalize(raw)              a clean state.friendPerms (never null)
     permsFriend(perms, friendId)     one friend's choices, every scope filled in
     permsEffective(perms, friendId, {status, today})
                                      {scope: {mode, on, reason?, until?, from?, label?}}: what may go out NOW
     permsWithScope(perms, friendId, scope, patch, now) / permsWithFriend(perms, friendId, patch, now)   new copies
                                      (a change of `trusted` turns every sensitive scope back to off: 2.17.1)
     permsTrustResets(perms, friendId)  the sensitive scopes on for them now (what a change of trust turns off)
     permsRisky(scope, mode)          the warning for money 'full' and location 'exact', else ''
     permsLevelText(scope, mode, name)  what that level shows, in words
     PERMS_SCHEMA / permsClean(scope, mode, data)   the strict allow-list: only listed fields, typed,
                                      capped; the sender passes every packet through it and the
                                      receiver validates with it (prototype keys are never copied)
     permsCleanEnvelope(kind, body)   a whole message body ('share:<scope>', 'share:ack', 'share:resync')
     permsPlaceLine(v, max)           a calendar place for a friend, or '' when it holds a join link, a meeting code or an address
     permsCalTimes(e)                 a shared calendar item's absolute start and end {t0, t1} (ms), or null
                                      (an older sender's item, or an all-day one: read its date and wall times)

   CALENDAR TIMES (2.17 'layers'): a timed event carries its absolute instants, startUtc / endUtc
   ('YYYY-MM-DDTHH:MM:SSZ'), and the packet carries the sender's time zone (tz), so a friend in
   another zone sees it at the right time on their own clock. date / start / end stay as the
   sender's wall times (the old shape, still accepted from an older sender); all-day events keep
   their dates only (a day off is that day wherever you are).
   ============================================================ */

const PERMS_VERSION = 1;
const PERMS_SCOPES = Object.freeze([
  Object.freeze({ id: 'profile', label: 'Profile', icon: 'user', kind: 'profile', by: 'profile', def: 'on', sensitive: false,
    modes: Object.freeze([['off', 'Hidden'], ['on', 'Shown']]) }),
  Object.freeze({ id: 'game', label: 'Game progress', icon: 'trophy', kind: 'share:game', by: 'engine', def: 'on', sensitive: false,
    modes: Object.freeze([['off', 'Hidden'], ['on', 'Level and streak']]) }),
  // ── garden-social ── (2.18: the garden snapshot, kind 'garden', published by the page: 94-garden-social-1core.js)
  Object.freeze({ id: 'garden', label: 'Garden', icon: 'sprout', kind: 'garden', by: 'garden', def: 'on', sensitive: false,
    modes: Object.freeze([['off', 'Hidden'], ['on', 'Plants and decorations']]) }),
  // ── end garden-social ──
  Object.freeze({ id: 'presence', label: 'Online status', icon: 'wifi', kind: 'presence', by: 'engine', def: 'off', sensitive: true,
    modes: Object.freeze([['off', 'Hidden'], ['on', 'Online, focusing, travelling']]) }),
  Object.freeze({ id: 'tasks', label: 'Tasks', icon: 'square-check', kind: 'share:tasks', by: 'perms', def: 'none', sensitive: true,
    modes: Object.freeze([['none', 'None'], ['shared', 'Only tasks I share'], ['chosen', 'Chosen streams or tags'], ['all', 'All my tasks']]) }),
  Object.freeze({ id: 'calendar', label: 'Calendar', icon: 'calendar', kind: 'share:calendar', by: 'perms', def: 'none', sensitive: true,
    modes: Object.freeze([['none', 'None'], ['busy', 'Busy or free only'], ['titles', 'Times and titles'], ['full', 'Full details']]) }),
  Object.freeze({ id: 'money', label: 'Money', icon: 'wallet', kind: 'share:money', by: 'perms', def: 'none', sensitive: true, risky: 'full',
    modes: Object.freeze([['none', 'None'], ['summary', 'A summary in words'], ['full', 'Full totals']]) }),
  Object.freeze({ id: 'locations', label: 'Locations', icon: 'map-pin', kind: 'share:locations', by: 'perms', def: 'none', sensitive: true, risky: 'exact',
    modes: Object.freeze([['none', 'None'], ['countries', 'Countries'], ['cities', 'Cities'], ['exact', 'Exact places']]) }),
  Object.freeze({ id: 'memories', label: 'Memories & journal', icon: 'book-open', kind: 'share:memories', by: 'perms', def: 'none', sensitive: true,
    modes: Object.freeze([['none', 'None'], ['chosen', 'Only what I choose']]) }),
]);
const PERMS_SCOPE_IDS = Object.freeze(PERMS_SCOPES.map(s => s.id));
const PERMS_SENT_SCOPES = Object.freeze(PERMS_SCOPES.filter(s => s.by === 'perms').map(s => s.id));
const PERMS_OFF = Object.freeze(['off', 'none']);
const _PM_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const _PM_UTC_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;
const _PM_TZ_RE = /^(UTC|[A-Z][A-Za-z_+-]{0,30}(\/[A-Za-z0-9_+-]{1,30}){1,2})$/;
/** Ids that cross to a friend (and friend ids): docs/dev/FRIENDS.md rule 3. */
const PERMS_SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const _PM_TASK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,119}$/;   // this dashboard's own task ids (never sent as they are unless safe)
const _PM_MEM_ID_RE = /^(journal-\d{4}-\d{2}-\d{2}|postcard-[A-Z]{2}|capsule-[A-Za-z0-9_-]{1,56}|goals-\d{4})$/;
const _PM_BAD_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);
const _pmOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const _pmObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function permsScope(id) { return PERMS_SCOPES.find(s => s.id === id) || null; }
function permsModeOk(scope, mode) { const s = permsScope(scope); return !!s && typeof mode === 'string' && s.modes.some(m => m[0] === mode); }
function permsIsOn(mode) { return typeof mode === 'string' && !!mode && !PERMS_OFF.includes(mode); }
function permsFriendIdOk(id) { return typeof id === 'string' && PERMS_SAFE_ID_RE.test(id) && !_PM_BAD_KEYS.includes(id); }

/* ---------- the stored choices ---------- */
function _pmIdList(v, max, re) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const x of v) {
    const s = typeof x === 'string' ? x.trim() : '';
    if (s && s.length <= 120 && (!re || re.test(s)) && !_PM_BAD_KEYS.includes(s) && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
function _pmScopeCfg(scope, raw) {
  const def = permsScope(scope);
  const r = _pmObj(raw) ? raw : {};
  const out = { mode: permsModeOk(scope, r.mode) ? r.mode : def.def };
  if (scope === 'tasks') { out.ids = _pmIdList(r.ids, 500, _PM_TASK_ID_RE); out.streams = _pmIdList(r.streams, 50); out.tags = _pmIdList(r.tags, 50); }
  if (scope === 'memories') out.items = _pmIdList(r.items, 300, _PM_MEM_ID_RE);
  if (typeof r.from === 'string' && _PM_DAY_RE.test(r.from)) out.from = r.from;
  if (typeof r.until === 'string' && _PM_DAY_RE.test(r.until)) out.until = r.until;
  if (out.from && out.until && out.until < out.from) delete out.from;
  if ((out.from || out.until) && typeof r.label === 'string' && r.label.trim()) out.label = r.label.trim().slice(0, 80);
  return out;
}
/** A clean state.friendPerms: {v, stopped, friends: {id: {trusted, stopped, at, scopes}}}. */
function permsNormalize(raw) {
  const r = _pmObj(raw) ? raw : {};
  const out = { v: PERMS_VERSION, stopped: Number(r.stopped) > 0 ? Number(r.stopped) : 0, friends: {} };
  const fr = _pmObj(r.friends) ? r.friends : {};
  for (const id of Object.keys(fr)) {
    if (!permsFriendIdOk(id)) continue;
    const f = _pmObj(fr[id]) ? fr[id] : {};
    const scopes = {};
    const sc = _pmObj(f.scopes) ? f.scopes : {};
    for (const s of PERMS_SCOPE_IDS) if (_pmOwn(sc, s)) scopes[s] = _pmScopeCfg(s, sc[s]);
    out.friends[id] = { trusted: f.trusted === true, stopped: Number(f.stopped) > 0 ? Number(f.stopped) : 0, at: Number(f.at) > 0 ? Number(f.at) : 0, scopes };
  }
  return out;
}
/** One friend's choices, every scope filled in (defaults where nothing was chosen). */
function permsFriend(perms, friendId) {
  const p = permsNormalize(perms);
  const f = (permsFriendIdOk(friendId) && p.friends[friendId]) || { trusted: false, stopped: 0, at: 0, scopes: {} };
  const scopes = {};
  for (const s of PERMS_SCOPE_IDS) scopes[s] = f.scopes[s] ? f.scopes[s] : _pmScopeCfg(s, null);
  return { trusted: f.trusted === true, stopped: f.stopped, at: f.at, scopes, chosen: Object.keys(f.scopes) };
}
/**
 * What may go out to this friend NOW. o: {status: the friend's status ('friend' = confirmed;
 * anything else, or none, denies everything), today: 'YYYY-MM-DD'}. Default deny: not a
 * confirmed friend, a stop, an unknown level, an expired or not-yet-started window, or a
 * friend not marked trusted for a sensitive scope all give {mode: 'none', on: false, reason}.
 */
function permsEffective(perms, friendId, o) {
  o = o || {};
  const p = permsNormalize(perms);
  const f = permsFriend(p, friendId);
  const today = typeof o.today === 'string' && _PM_DAY_RE.test(o.today) ? o.today : '';
  const out = {};
  for (const def of PERMS_SCOPES) {
    const c = f.scopes[def.id];
    const off = (reason) => ({ mode: 'none', on: false, reason, chosen: c.mode });
    let e;
    if (!permsFriendIdOk(friendId)) e = off('not-friend');
    else if (o.status === 'blocked') e = off('blocked');
    else if (o.status !== 'friend') e = off('not-friend');
    else if (p.stopped) e = off('stopped-all');
    else if (f.stopped) e = off('stopped');
    else if (!permsModeOk(def.id, c.mode) || !permsIsOn(c.mode)) e = off('off');
    else if (def.sensitive && f.trusted !== true) e = off('trust');
    else if (c.until && (!today || today > c.until)) e = off('expired');
    else if (c.from && (!today || today < c.from)) e = off('not-yet');
    else e = { mode: c.mode, on: true, chosen: c.mode };
    if (c.until) e.until = c.until;
    if (c.from) e.from = c.from;
    if (c.label) e.label = c.label;
    out[def.id] = e;
  }
  return out;
}
function _pmClone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function _pmEntry(p, friendId) { return p.friends[friendId] || (p.friends[friendId] = { trusted: false, stopped: 0, at: 0, scopes: {} }); }
/** A copy of perms with one scope of one friend changed (patch merged; null or '' removes a field). */
function permsWithScope(perms, friendId, scope, patch, now) {
  const p = _pmClone(permsNormalize(perms));
  if (!permsFriendIdOk(friendId) || !permsScope(scope)) return p;
  const f = _pmEntry(p, friendId);
  const cur = Object.assign({}, f.scopes[scope] || _pmScopeCfg(scope, null));
  for (const [k, v] of Object.entries(patch || {})) { if (_PM_BAD_KEYS.includes(k)) continue; if (v === null || v === '') delete cur[k]; else cur[k] = v; }
  f.scopes[scope] = _pmScopeCfg(scope, cur);
  f.at = Number(now) || f.at || 0;
  return permsNormalize(p);
}
/** A copy of perms with one friend's own fields changed ({trusted, stopped, scopes}). */
function permsWithFriend(perms, friendId, patch, now) {
  const p = _pmClone(permsNormalize(perms));
  if (!permsFriendIdOk(friendId)) return p;
  const f = _pmEntry(p, friendId);
  if (patch && _pmOwn(patch, 'trusted')) {
    const t = patch.trusted === true;
    // 2.17.1: trust going on or off never brings back levels chosen before. Every sensitive scope that
    // was on goes back to off (its windows and picks stay), so marking someone trusted turns on only
    // what is chosen with it (patch.scopes below, or permsWithScope right after) and its own warning.
    if (t !== (f.trusted === true)) for (const s of permsTrustResets(p, friendId)) f.scopes[s] = Object.assign({}, f.scopes[s], { mode: permsScope(s).def });
    f.trusted = t;
  }
  if (patch && _pmOwn(patch, 'stopped')) f.stopped = Number(patch.stopped) > 0 ? Number(patch.stopped) : 0;
  if (patch && _pmObj(patch.scopes)) for (const s of PERMS_SCOPE_IDS) if (_pmOwn(patch.scopes, s)) f.scopes[s] = _pmScopeCfg(s, patch.scopes[s]);
  f.at = Number(now) || f.at || 0;
  return permsNormalize(p);
}

/** The sensitive scopes set to a level for this friend now: what a change of trust turns back to off. */
function permsTrustResets(perms, friendId) {
  const f = permsFriendIdOk(friendId) && _pmObj(perms) && _pmObj(perms.friends) ? perms.friends[friendId] : null;
  const sc = f && _pmObj(f.scopes) ? f.scopes : {};
  return PERMS_SCOPES.filter(d => d.sensitive && _pmObj(sc[d.id]) && permsIsOn(sc[d.id].mode)).map(d => d.id);
}

/* ---------- words ---------- */
function permsRisky(scope, mode) {
  if (scope === 'money' && mode === 'full') return 'They will see your spending this month by category, your budgets, your income and the total in your accounts. Only share this with someone you would show your bank app to.';
  if (scope === 'locations' && mode === 'exact') return 'They will see where you are now to about 1 km, and the places you stayed in the last two weeks. Only share this with someone you would trust with your address.';
  return '';
}
const _PM_LEVEL_TEXT = Object.freeze({
  'profile:on': 'your name, and the bio, emoji, colour, pronouns and city you set in your profile',
  'game:on': 'your level, title, XP, XP this week, streak, best streak, quests and focus minutes',
  'garden:on': 'your garden as it grows: which plants and decorations, where they stand, how grown they are, its level and the season (never your tasks or anything you wrote); they can visit it, water a plant, leave a heart or a gift and sign your guestbook',
  'presence:on': 'whether you are online, focusing, travelling or away (never where)',
  'tasks:shared': 'only the tasks you share with them one by one: title, due date, status, priority, stream, tags and subtask progress',
  'tasks:chosen': 'tasks in the streams or with the tags you choose: title, due date, status, priority, stream, tags and subtask progress',
  'tasks:all': 'all your open tasks and the ones done in the last two weeks: title, due date, status, priority, stream, tags and subtask progress',
  'calendar:busy': 'when you are busy, from start and end times (and your time zone, so they see them on their own clock) only: no titles, places or people',
  'calendar:titles': 'your events with their times and titles: no places, people or notes',
  'calendar:full': 'your events with times, titles, places, which calendar and how many people are invited (never their names or addresses, join links or notes)',
  'money:summary': 'a few words such as "On budget this month" and a percentage: never an amount',
  'money:full': 'your spending this month and week by category, budgets, income, regular payments and the total in your accounts (never transactions, account names or numbers)',
  'locations:countries': 'the countries you have been to (by day) and the one you are in now',
  'locations:cities': 'the cities you have been to (by day) and the one you are in now: no positions, no times',
  'locations:exact': 'where you are now to about 1 km, and the places you stayed in the last two weeks',
  'memories:chosen': 'only the journal days, postcards, capsules and goals you pick',
});
function permsLevelText(scope, mode, name) {
  const who = name ? String(name) : 'They';
  const verb = name ? 'sees' : 'see';
  const t = permsIsOn(mode) ? _PM_LEVEL_TEXT[scope + ':' + mode] : '';
  return t ? `${who} ${verb} ${t}.` : `${who} ${verb} nothing from here.`;
}

/* ---------- the allow-list (sender and receiver) ----------
   Field types: s<n> = one line of at most n characters; t<n> = text (line breaks kept);
   p<n> = a place: one line, dropped when it holds a link, a meeting code or an address (permsPlaceLine);
   d = 'YYYY-MM-DD'; hm = 'HH:MM'; n = a number; i = an id ([A-Za-z0-9_-], 64 at most);
   b = true/false; e:<a|b> = one of these words; tags = up to 12 short strings; c = a colour
   (#hex or a swatch word); z = an instant in UTC, 'YYYY-MM-DDTHH:MM:SSZ'; tz = a time zone name
   ('Europe/London', 'UTC'); {o: {...}} = an object of these; [shape, n] = a list of at most n.
   Strings are cleaned exactly like lib/friends/core.mjs cleanLine / cleanText (and trimmed),
   so the engine's own schema check leaves them as they are and the hashes agree.
   Profile, game progress and presence are not here: their owners send them. */
const _PM_TASK_ITEM = Object.freeze({ id: 'i', title: 's200', due: 'd', time: 'hm', status: 'e:todo|doing|done', priority: 'e:p1|p2|p3', stream: 's60', color: 'c', tags: 'tags', subDone: 'n', subTotal: 'n', doneOn: 'd', planned: 'd' });
const _PM_CAL_BUSY = Object.freeze({ id: 'i', date: 'd', until: 'd', start: 'hm', end: 'hm', allDay: 'b', startUtc: 'z', endUtc: 'z' });
const _PM_COUNTRY = Object.freeze({ cc: 's2', country: 's60', first: 'd', last: 'd' });
const _PM_CITY = Object.freeze({ city: 's80', cc: 's2', first: 'd', last: 'd' });
const PERMS_SCHEMA = Object.freeze({
  tasks: {
    shared: { items: [_PM_TASK_ITEM, 500] }, chosen: { items: [_PM_TASK_ITEM, 500] }, all: { items: [_PM_TASK_ITEM, 500] },
  },
  calendar: {
    busy: { from: 'd', to: 'd', tz: 'tz', items: [_PM_CAL_BUSY, 1200] },
    titles: { from: 'd', to: 'd', tz: 'tz', items: [Object.assign({}, _PM_CAL_BUSY, { title: 's200' }), 1200] },
    full: { from: 'd', to: 'd', tz: 'tz', items: [Object.assign({}, _PM_CAL_BUSY, { title: 's200', location: 'p120', calendar: 's60', people: 'n', repeating: 'b' }), 1200] },
  },
  money: {
    summary: { month: 's20', status: 'e:under|on|over|none', word: 's80', pct: 'n', trend: 'e:less|same|more|none' },
    full: {
      currency: 's3', month: 's20', asOf: 'd', spent: 'n', lastMonthSameDay: 'n', lastMonth: 'n', income: 'n', recurring: 'n', balance: 'n',
      week: { o: { from: 'd', to: 'd', total: 'n', usual: 'n' } },
      categories: [{ category: 's40', spent: 'n', budget: 'n', usual: 'n' }, 20],
    },
  },
  locations: {
    countries: { now: { o: { cc: 's2', country: 's60' } }, visited: [_PM_COUNTRY, 200] },
    cities: { now: { o: { cc: 's2', country: 's60', city: 's80' } }, visited: [_PM_COUNTRY, 200], cities: [_PM_CITY, 300] },
    exact: { now: { o: { cc: 's2', country: 's60', city: 's80', place: 's120', lat: 'n', lon: 'n', since: 'n' } },
      visited: [_PM_COUNTRY, 200], cities: [_PM_CITY, 300],
      recent: [{ id: 'i', place: 's120', city: 's80', cc: 's2', lat: 'n', lon: 'n', from: 'd', to: 'd' }, 100] },
  },
  memories: {
    chosen: { items: [{ id: 'i', kind: 'e:journal|postcard|capsule|goals', date: 'd', title: 's120', text: 't2000', line: 't500', mood: 'n',
      cc: 's2', city: 's80', days: 'n', opens: 'd', sealed: 'b', goals: 'tags', done: 'n' }, 300] },
  },
});
/** Scopes whose data is {items: [...]} with ids: sent as a diff when only some items changed. */
const PERMS_LIST_SCOPES = Object.freeze(['tasks', 'calendar', 'memories']);

// eslint-disable-next-line no-control-regex
const _PM_LINE_BAD = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\u200b-\u200f\ufeff]/g;
// eslint-disable-next-line no-control-regex
const _PM_TEXT_BAD = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\u200b-\u200f\ufeff]/g;
/** One line, as lib/friends/core.mjs cleanLine, then trimmed again (so cleaning twice changes nothing). */
function permsCleanLine(v, max) { return String(v == null ? '' : v).replace(_PM_LINE_BAD, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim(); }
// A calendar place that carries a meeting link, a join code or an address: Zoom, Calendly and pasted
// invites put the whole join URL (with ?pwd=) in the Location field. 'Full details' promises never to
// send join links, so such a place is not sent at all. It is tested on the whole line before it is cut
// to length (a passcode past the cut must not leave its meeting number behind) and on the line that is
// sent (so cleaning twice agrees).
const _PM_LINK_RE = new RegExp([
  '[a-z][a-z0-9+.-]{0,20}://', '\\bwww\\.', '\\b(tel|sips?|mailto|msteams|zoommtg|zoomus|webcal|skype|facetime|callto|ms-teams):',
  '\\b[a-z0-9][a-z0-9-]*(\\.[a-z0-9-]+)*\\.[a-z]{2,24}/\\S',                       // host/path without a scheme (zoom.us/j/..., discord.gg/...)
  'zoom\\.us', 'zoomgov\\.com', 'teams\\.(microsoft|live)\\.com', 'meet\\.google\\.com', 'webex\\.com', 'gotomeet', 'goto\\.com',
  'whereby\\.com', 'meet\\.jit\\.si', 'chime\\.aws', 'bluejeans', 'ringcentral', 'calendly\\.com',
  '[?&](pwd|passcode|password|pin|tk|token|key)=', '\\b(passcode|password|meeting id|meeting-id|conference id|access code|participant code)\\b',
  '\\bpin\\s*[:=#]?\\s*\\d', ',,\\s*\\d', '\\d{4,}\\s*#',                              // dial-in PINs (a number, then ",,<PIN>#" or "<PIN>#")
  '\\d(?:[\\s().-]{0,2}\\d){8,}',                                                       // a meeting number or a phone number (9+ digits: 881 2345 6789)
  '\\b[a-z]{3}-[a-z]{4}-[a-z]{3}\\b',                                                  // a Meet code (abc-defg-hij)
  '[^\\s@]+@[^\\s@]+\\.[a-z]{2,}',                                                     // an email address
].join('|'), 'i');
/** A place name for a friend: one line (as permsCleanLine), or '' when it holds a link, a meeting code or an address. */
function permsPlaceLine(v, max) {
  const s = permsCleanLine(v, max);
  return s && !_PM_LINK_RE.test(s) && !_PM_LINK_RE.test(permsCleanLine(v, 1000)) ? s : '';
}
/** Text with line breaks, as lib/friends/core.mjs cleanText, then trimmed again. */
function permsCleanText(v, max) {
  return String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(_PM_TEXT_BAD, ' ').replace(/[ \t]+/g, ' ').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max).trim();
}
function _pmCleanVal(t, v) {
  if (v === undefined || v === null) return undefined;
  if (t === 'b') return typeof v === 'boolean' ? v : undefined;
  if (t === 'n') return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e13 ? Math.round(v * 100) / 100 : undefined;
  if (t === 'd') return typeof v === 'string' && _PM_DAY_RE.test(v) ? v : undefined;
  if (t === 'hm') return typeof v === 'string' && /^([01]\d|2[0-4]):[0-5]\d$/.test(v) ? v : undefined;
  if (t === 'z') return typeof v === 'string' && _PM_UTC_RE.test(v) && Number.isFinite(Date.parse(v)) ? v : undefined;
  if (t === 'tz') return typeof v === 'string' && v.length <= 64 && _PM_TZ_RE.test(v) && !_PM_BAD_KEYS.includes(v) ? v : undefined;
  if (t === 'i') return typeof v === 'string' && PERMS_SAFE_ID_RE.test(v) && !_PM_BAD_KEYS.includes(v) ? v : undefined;
  if (t === 'c') {
    if (typeof v !== 'string') return undefined;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase();
    return /^[a-z]{3,12}$/.test(v) ? v : undefined;
  }
  if (t === 'tags') {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter(x => typeof x === 'string').map(x => permsCleanLine(x, 40)).filter(Boolean).slice(0, 12);
    return out.length ? out : undefined;
  }
  if (typeof t === 'string' && t.startsWith('e:')) return typeof v === 'string' && t.slice(2).split('|').includes(v) ? v : undefined;
  if (typeof t === 'string' && /^[stp]\d+$/.test(t)) {
    if (typeof v !== 'string') return undefined;
    const n = Number(t.slice(1));
    const s = t[0] === 't' ? permsCleanText(v, n) : t[0] === 'p' ? permsPlaceLine(v, n) : permsCleanLine(v, n);
    return s || undefined;
  }
  if (Array.isArray(t)) {
    if (!Array.isArray(v)) return undefined;
    const [shape, max] = t;
    const out = [];
    const seen = new Set();
    for (const x of v) {
      if (out.length >= max) break;
      const c = _pmCleanObj(shape, x);
      if (!c) continue;
      if (c.id !== undefined) { if (seen.has(c.id)) continue; seen.add(c.id); }
      out.push(c);
    }
    return out;
  }
  if (_pmObj(t) && t.o) return _pmCleanObj(t.o, v) || undefined;
  return undefined;
}
/** Only the fields `shape` lists, each typed and capped; null when nothing is left. Never copies a key it does not know. */
function _pmCleanObj(shape, v) {
  if (!_pmObj(v)) return null;
  const out = {};
  for (const k of Object.keys(shape)) {
    if (_PM_BAD_KEYS.includes(k) || !_pmOwn(v, k)) continue;
    const c = _pmCleanVal(shape[k], v[k]);
    if (c !== undefined) out[k] = c;
  }
  return Object.keys(out).length ? out : null;
}
function _pmShape(scope, mode) {
  const s = _pmOwn(PERMS_SCHEMA, scope) ? PERMS_SCHEMA[scope] : null;
  return s && typeof mode === 'string' && _pmOwn(s, mode) ? s[mode] : null;
}
/** The data of one scope at one level, cleaned by the allow-list; null for an unknown scope or level. */
function permsClean(scope, mode, data) {
  const shape = _pmShape(scope, mode);
  if (!shape) return null;
  const out = _pmCleanObj(shape, data) || {};
  if (PERMS_LIST_SCOPES.includes(scope) && !Array.isArray(out.items)) out.items = [];
  return out;
}
/** One list item of a scope at a level, cleaned (for diffs). */
function permsCleanItem(scope, mode, item) {
  const shape = _pmShape(scope, mode);
  if (!shape || !Array.isArray(shape.items)) return null;
  const c = _pmCleanObj(shape.items[0], item);
  return c && typeof c.id === 'string' ? c : null;
}
/** The cap on one list scope's items at a level (0: not a list). */
function permsItemCap(scope, mode) {
  const shape = _pmShape(scope, mode);
  return shape && Array.isArray(shape.items) ? shape.items[1] : 0;
}
/** A shared calendar item's absolute times {t0, t1} (ms), from startUtc / endUtc; null for an all-day item, an older sender's item or nonsense (at most 14 days long). */
function permsCalTimes(e) {
  if (!_pmObj(e) || e.allDay === true) return null;
  const t0 = typeof e.startUtc === 'string' && _PM_UTC_RE.test(e.startUtc) ? Date.parse(e.startUtc) : NaN;
  const t1 = typeof e.endUtc === 'string' && _PM_UTC_RE.test(e.endUtc) ? Date.parse(e.endUtc) : NaN;
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0 || t1 - t0 > 14 * 86400000) return null;
  return { t0, t1 };
}
const _PM_HASH_RE = /^[a-f0-9]{16,64}$/;
const PERMS_PART_MAX = 27000;     // characters of base64 per part (a body stays under the engine's 32 KB)
const PERMS_PARTS_MAX = 64;
/**
 * A whole message body, cleaned: {kind, scope, body} or null (dropped). Kinds:
 *   'share:<scope>'  {v, op: 'full', mode, h, at, until?, data}
 *                    {v, op: 'diff', mode, base, h, at, until?, upsert, remove, extra?}   (list scopes)
 *                    {v, op: 'part', mode, h, at, until?, seq, of, part}    one piece of a large 'full' (base64 JSON)
 *                    {v, op: 'revoke', at}
 *   'share:ack'      {scope, h, at?}       the friend has it
 *   'share:resync'   {scope}               the friend's copy does not match: send it whole
 */
function permsCleanEnvelope(kind, body) {
  if (typeof kind !== 'string' || !_pmObj(body)) return null;
  const at = Number(body.at);
  const okAt = Number.isInteger(at) && at > 0 && at < 1e14 ? at : 0;
  if (kind === 'share:ack' || kind === 'share:resync') {
    if (!PERMS_SENT_SCOPES.includes(body.scope)) return null;
    const out = { scope: body.scope };
    if (kind === 'share:ack') { if (typeof body.h !== 'string' || !_PM_HASH_RE.test(body.h)) return null; out.h = body.h; out.at = okAt; }
    return { kind, scope: body.scope, body: out };
  }
  const m = /^share:([a-z]+)$/.exec(kind);
  if (!m || !PERMS_SENT_SCOPES.includes(m[1])) return null;
  const scope = m[1];
  if (body.v !== PERMS_VERSION) return null;
  if (body.op === 'revoke') return { kind, scope, body: { v: PERMS_VERSION, op: 'revoke', at: okAt } };
  if (!permsModeOk(scope, body.mode) || !permsIsOn(body.mode)) return null;
  if (typeof body.h !== 'string' || !_PM_HASH_RE.test(body.h)) return null;
  const until = Number(body.until);
  const head = { v: PERMS_VERSION, op: body.op, mode: body.mode, h: body.h, at: okAt, ...(Number.isInteger(until) && until > 0 && until < 1e14 ? { until } : {}) };
  if (body.op === 'full') {
    const data = permsClean(scope, body.mode, body.data);
    return data ? { kind, scope, body: Object.assign(head, { data }) } : null;
  }
  if (body.op === 'part') {
    const seq = Number(body.seq), of = Number(body.of);
    if (!Number.isInteger(of) || of < 1 || of > PERMS_PARTS_MAX || !Number.isInteger(seq) || seq < 0 || seq >= of) return null;
    if (typeof body.part !== 'string' || !body.part || body.part.length > PERMS_PART_MAX || !/^[A-Za-z0-9+/=]+$/.test(body.part)) return null;
    return { kind, scope, body: Object.assign(head, { seq, of, part: body.part }) };
  }
  if (body.op === 'diff' && PERMS_LIST_SCOPES.includes(scope)) {
    if (typeof body.base !== 'string' || !_PM_HASH_RE.test(body.base)) return null;
    const cap = permsItemCap(scope, body.mode);
    const upsert = (Array.isArray(body.upsert) ? body.upsert : []).slice(0, cap).map(x => permsCleanItem(scope, body.mode, x)).filter(Boolean);
    const remove = (Array.isArray(body.remove) ? body.remove : []).filter(x => typeof x === 'string' && PERMS_SAFE_ID_RE.test(x)).slice(0, cap);
    // the extra fields of a list scope (calendar from/to) travel with a diff too
    const extra = permsClean(scope, body.mode, Object.assign({}, _pmObj(body.extra) ? body.extra : {}, { items: [] }));
    if (extra) delete extra.items;
    return { kind, scope, body: Object.assign(head, { base: body.base, upsert, remove, ...(extra && Object.keys(extra).length ? { extra } : {}) }) };
  }
  return null;
}
