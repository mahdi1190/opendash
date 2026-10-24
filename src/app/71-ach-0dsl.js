/* ============================================================
   ACHIEVEMENTS, the engine (2.18 B0; docs/dev/ACHIEVEMENTS_500.md). PURE: no DOM,
   no page globals at load, so Node (tools/ach-dayone.mjs) loads it as the page does.

   What a definition is (a pack file 71-ach-pack-*.js writes them, data only):
     { id: 'pl-top3-kept', cat: 'planning', name: 'Called it',
       desc: "Finish all three of yesterday's top three today.",   // an instruction, 90 characters at most
       when: { days: 'd.top3Done', min: 3, gte: 30 },                // the condition (below)
       rarity: 'rare',                    // common | uncommon | rare | epic | legendary: the XP comes from it
       icon: 'target',                    // a Lucide name in vendor/icons/lucide-sprite.svg (default: the category's)
       series: 'planner', tier: 'gold',   // optional: one card with pips on the wall (bronze..platinum)
       unlock: 'title:Oracle',            // optional reward id: title|banner|plate|wear|seed|decor|treat|accent|anim
       secret: false, clue: '',           // a secret shows '???' and its clue (no clue at all: "Some secrets keep themselves")
       season: 'MM-DD..MM-DD',            // optional: shown "in season" then, "Back in <month>" otherwise
       needs: 'garden',                   // optional feature (or a list): finance locations travel calendar friends claude sync garden pets wardrobe you
       private: false,                    // never auto-shown as a badge or sent to friends (money, places, health-like)
       go: 'view:today' | 'cmd:<palette id>' }   // optional: the Next up button (default: the category's)

   The condition (series are {key: number}; d.* keyed by ISO day, w.* by week start, c.* by month start):
     {n: Fact, gte: N}                            a number reaches N
     {days: Series, min?: 1, max?, gte: N, on?}   units (days, or weeks for w.*) whose value is in [min, max]
     {run: Series, min?: 1, gte: N, skip?: 'weekend', freeze?: false, on?}
                                                  the longest run of consecutive units (skipped units and units
                                                  outside `on` neither count nor break it; freeze: streak freezes
                                                  bridge gaps, one to start, one more per 7 days / 4 weeks)
     {win: Series, span: D, gte: N, on?}          the best sum over D consecutive units (span 1: the best day)
     {cal: 'week'|'month'|'quarter'|'year', s: Series, gte: N, times?: 1, on?}
                                                  calendar periods whose sum reaches N, at least `times` of them
     {same: [[Series, min, max?], ...], gte: N, on?}   days on which every listed series is in range
     {all: [Cond, ...]} | {any: [Cond, ...]}
     {ratio: [Fact, Fact], gte: R, minOf: K}      numerator / denominator >= R once the denominator >= K
     {mark: Kind, gte: N}                         distinct keys marked     {has: [Kind, Key]}   one key marked
     {meta: {cat?, shelf?, tier?, rarity?, secret?, series?, pack?, all?, noHist?}, gte: N}   achievements earned
     {meta: {shelves: K}} | {meta: {catComplete: K}} | {meta: {inWeek: K}}   K shelves touched, categories
                                                  complete, unlocks in one week (history unlocks never count)
     on (a day filter): {dow: [0..6], workday, md: 'MM-DD'|[...], from: 'MM-DD', to: 'MM-DD' (may wrap the year),
                         m: [1..12], fri13, palindrome, fullMoon, birthday}

   Progress is {n, of, done}: the best so far (never a current run that can fall).

     ACH_SHELVES, ACH_CATS, achCat(id)      five shelves, 26 categories
     ACH_RARITY, ACH_TIERS, ACH_HIST_XP     XP per rarity; history unlocks at half XP, 2,000 at most
     achEval(cond, F) -> {n, of, done}      F: {n(fact), s(series), m(kind), ctx: {today, weekStart, birthday},
                                            unlocked, hist} (71-ach-1facts.js achFactsView builds one)
     achDayMatches(iso, filter, ctx), achFullMoonDay(iso), achDayAdd, achWeekOf
     registerAchievementPack({id, label, defs}) / achPack(id, defs)   add achievements (any file, any time;
                                            before 71-achievements.js they wait for the core 78)
     achPacksAll(), achLintReport(), achLintSummary()   what loaded and what was skipped (and why)
     achCanonical(cond)                     sorted-key JSON (the duplicate check)
     achRewardParse('title:Oracle') -> {kind, id} | null; ACH_REWARD_KINDS
   Lint is a runtime guard, not a test suite: a definition with a duplicate id, name or condition, an
   unknown category, rarity or operator, a description over 90 characters or a banned word is skipped
   with console.warn('[ach] ...') and listed in Settings > Diagnostics.
   ============================================================ */
const ACH_SHELVES = Object.freeze([
  { id: 'plan', label: 'Plan', icon: 'calendar-check' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'life', label: 'Life', icon: 'sprout' },
  { id: 'people', label: 'People', icon: 'users' },
  { id: 'play', label: 'Play', icon: 'gamepad-2' },
]);
// group: the old wall group a category's badges count as (97-profile-1core.js PF_SHOWCASE_AUTO_GROUPS decides
// which may be shown automatically; 'memories', 'money', 'places', 'people' and 'private' never are).
const ACH_CATS = Object.freeze([
  ['planning', 'plan', 'Planning ahead', 'calendar-clock', 'pl', 'cmd:rf-plan-week', 'tasks'],
  ['priorities', 'plan', 'Priorities', 'flag', 'pr', 'view:today', 'tasks'],
  ['estimating', 'plan', 'Estimating', 'hourglass', 'es', 'view:all', 'focus'],
  ['reviews', 'plan', 'Reviews', 'calendar-range', 'rv', 'view:home:week', 'tasks'],
  ['tidy', 'plan', 'Tidy lists', 'archive', 'td', 'cmd:rf-sweep', 'tasks'],
  ['finishing', 'work', 'Finishing what you start', 'circle-check', 'fn', 'view:today', 'tasks'],
  ['focus', 'work', 'Deep work', 'timer', 'fo', 'cmd:game-focus-next', 'focus'],
  ['capture', 'work', 'Inbox and capture', 'inbox', 'ca', 'cmd:quick-capture', 'tasks'],
  ['waiting', 'work', 'Waiting and handing off', 'handshake', 'wt', 'view:waiting', 'tasks'],
  ['craft', 'work', 'Tools and craft', 'wrench', 'cr', 'cmd:sidebar-customise', 'tasks'],
  ['habits', 'life', 'Habits and routines', 'repeat', 'hb', 'view:all', 'streaks'],
  ['rhythm', 'life', 'Rhythm', 'flame', 'rh', '', 'streaks'],
  ['balance', 'life', 'Rest and balance', 'coffee', 'bl', '', 'milestones'],
  ['journal', 'life', 'Notes, journal and memories', 'notebook-pen', 'jr', 'view:memories', 'memories'],
  ['money', 'life', 'Money, gently', 'piggy-bank', 'mo', 'view:finance', 'money', { private: true, needs: ['finance'] }],
  ['places', 'life', 'Places and travel', 'map-pin', 'pc', 'view:locations', 'places', { private: true, needs: ['locations'] }],
  ['people', 'people', 'People and kindness', 'heart', 'pp', 'view:people', 'people'],
  ['meetings', 'people', 'Calendar and meetings', 'calendar-days', 'mt', 'view:calendar', 'tasks'],
  ['friends', 'people', 'Friends and together', 'users', 'fr', 'view:friends', 'friends', { needs: ['friends'] }],
  ['garden', 'play', 'Garden', 'flower-2', 'gd', 'view:garden', 'milestones', { needs: ['garden'] }],
  ['pets', 'play', 'Pets', 'paw-print', 'pt', 'view:pet', 'milestones', { needs: ['pets'] }],
  ['style', 'play', 'Wardrobe and profile', 'shirt', 'st', 'view:settings:me', 'milestones'],
  ['scenes', 'play', 'Scenes and seasons', 'image', 'sc', 'view:settings:animations', 'milestones'],
  ['game', 'play', 'Quests, bosses and records', 'crown', 'gm', 'view:game', 'quests'],
  ['secrets', 'play', 'Secrets', 'sparkles', 'sx', '', 'milestones'],
  ['meta', 'play', 'Meta and collections', 'trophy', 'mx', '', 'milestones'],
].map(([id, shelf, label, icon, prefix, go, group, x]) => Object.freeze(Object.assign({ id, shelf, label, icon, prefix, go, group, private: false, needs: [] }, x || {}))));
const _ACH_CAT_BY = new Map(ACH_CATS.map(c => [c.id, c]));
function achCat(id) { return _ACH_CAT_BY.get(id) || null; }

// XP doubles with each step: an achievement is worth a real effort's XP (docs/dev/ACHIEVEMENTS_500.md 2.3).
const ACH_RARITY = Object.freeze({
  common: Object.freeze({ id: 'common', label: 'Common', short: 'C', xp: 20, rank: 1 }),
  uncommon: Object.freeze({ id: 'uncommon', label: 'Uncommon', short: 'U', xp: 40, rank: 2 }),
  rare: Object.freeze({ id: 'rare', label: 'Rare', short: 'R', xp: 80, rank: 3 }),
  epic: Object.freeze({ id: 'epic', label: 'Epic', short: 'E', xp: 160, rank: 4 }),
  legendary: Object.freeze({ id: 'legendary', label: 'Legendary', short: 'L', xp: 320, rank: 5 }),
});
const ACH_TIERS = Object.freeze(['bronze', 'silver', 'gold', 'platinum']);
const ACH_HIST_XP = Object.freeze({ rate: 0.5, cap: 2000 });   // history unlocks: half XP, 2,000 in all at most
// Reward ids: '<kind>:<id>'. owner: the module that turns the id into something (its guarded hook is called on
// an unlock: typeof window[hook] === 'function'); label: how a card names it while the owner is missing.
const ACH_REWARD_KINDS = Object.freeze({
  title: Object.freeze({ owner: 'you', hook: 'profileAchReward', label: 'Title', needs: 'you', with: 'with your profile card' }),
  banner: Object.freeze({ owner: 'you', hook: 'profileAchReward', label: 'Profile banner', needs: 'you', with: 'with your profile card' }),
  plate: Object.freeze({ owner: 'you', hook: 'profileAchReward', label: 'Nameplate', needs: 'you', with: 'with your profile card' }),
  wear: Object.freeze({ owner: 'wardrobe', hook: 'wardrobeAchReward', label: 'Wardrobe item', needs: 'wardrobe', with: 'with the wardrobe' }),
  seed: Object.freeze({ owner: 'garden', hook: 'gardenAchReward', label: 'Seeds', needs: 'garden', with: 'with the Garden' }),
  decor: Object.freeze({ owner: 'garden', hook: 'gardenAchReward', label: 'Garden decoration', needs: 'garden', with: 'with the Garden' }),
  treat: Object.freeze({ owner: 'pets', hook: 'petAchReward', label: 'Pet treat', needs: 'pets', with: 'with Pets' }),
  accent: Object.freeze({ owner: 'game', hook: 'gameAchReward', label: 'Accent colour', needs: '', with: '' }),
  anim: Object.freeze({ owner: 'library', hook: 'animAchReward', label: 'Animation', needs: '', with: '' }),
});
function achRewardParse(s) {
  const m = /^([a-z]+):(.{1,60})$/.exec(String(s || ''));
  return m && ACH_REWARD_KINDS[m[1]] ? { kind: m[1], id: m[2] } : null;
}
const ACH_FEATURES = Object.freeze(['finance', 'locations', 'travel', 'calendar', 'friends', 'claude', 'sync', 'garden', 'pets', 'wardrobe', 'you']);
const _ACH_BANNED = /\b(fail|failed|failure|lost|lose|broke|broken|missed|miss|lazy|only|behind|guilty)\b/i;

/* ---------- days: UTC maths on ISO days (the caller gives local days) ---------- */
const _ACH_DAYMS = 86400000;
function _achT(iso) { return Date.parse(iso + 'T12:00:00Z'); }
function achDayAdd(iso, n) { return new Date(_achT(iso) + n * _ACH_DAYMS).toISOString().slice(0, 10); }   // clock-ok: UTC date maths on ISO days
function achDow(iso) { return new Date(_achT(iso)).getUTCDay(); }   // clock-ok: weekday of an ISO day
function achWeekOf(iso, ws) { const s = ws === 'Sun' ? 0 : ws === 'Sat' ? 6 : 1; return achDayAdd(iso, -((achDow(iso) - s + 7) % 7)); }
function achDaysBetween(a, b) { return Math.round((_achT(b) - _achT(a)) / _ACH_DAYMS); }
// The day (UTC) holding a full moon: a fixed synodic month from the new moon of 6 Jan 2000, 18:14 UTC.
const _ACH_SYN = 29.530588853 * _ACH_DAYMS, _ACH_NEW0 = Date.UTC(2000, 0, 6, 18, 14);
function achFullMoonDay(iso) {
  const t0 = Date.parse(iso + 'T00:00:00Z'), full0 = _ACH_NEW0 + _ACH_SYN / 2;
  const k = Math.floor((t0 - full0) / _ACH_SYN);
  for (let j = k; j <= k + 1; j++) { const f = full0 + j * _ACH_SYN; if (f >= t0 && f < t0 + _ACH_DAYMS) return true; }
  return false;
}
function _achMdIn(md, a, b) { return a <= b ? md >= a && md <= b : md >= a || md <= b; }
/** Does an ISO day pass a filter? (ctx.birthday: 'MM-DD' from the settings, never a person) */
function achDayMatches(iso, f, ctx) {
  if (!f) return true;
  const md = iso.slice(5), dow = achDow(iso);
  if (Array.isArray(f.dow) && !f.dow.includes(dow)) return false;
  if (f.workday && (dow === 0 || dow === 6)) return false;
  if (f.md) { const l = Array.isArray(f.md) ? f.md : [f.md]; if (!l.includes(md)) return false; }
  if ((f.from || f.to) && !_achMdIn(md, f.from || '01-01', f.to || '12-31')) return false;
  if (Array.isArray(f.m) && !f.m.includes(Number(iso.slice(5, 7)))) return false;
  if (f.fri13 && !(iso.slice(8) === '13' && dow === 5)) return false;
  if (f.palindrome) { const s = iso.replace(/-/g, ''); if (s !== s.split('').reverse().join('')) return false; }
  if (f.fullMoon && !achFullMoonDay(iso)) return false;
  if (f.birthday) { const b = String((ctx && ctx.birthday) || '').slice(-5); if (!/^\d\d-\d\d$/.test(b) || md !== b) return false; }
  return true;
}
/** A season 'MM-DD..MM-DD' (or {from, to}) -> {from, to} | null. */
function achSeason(s) {
  if (!s) return null;
  if (typeof s === 'object' && s.from) return { from: String(s.from), to: String(s.to || s.from) };
  const m = /^(\d\d-\d\d)\.\.(\d\d-\d\d)$/.exec(String(s));
  return m ? { from: m[1], to: m[2] } : null;
}
function achInSeason(def, today) { const s = def && def.season; return !s || _achMdIn(String(today).slice(5), s.from, s.to); }

/* ---------- the evaluator ---------- */
function _achNum(v) { const n = Number(v); return isFinite(n) ? n : 0; }
/** The series' days with a value, sorted (cached on F for one check). */
function _achSer(F, name) {
  const c = F._sc || (F._sc = new Map());
  let r = c.get(name);
  if (r) return r;
  let raw = null;
  try { raw = F.s(name); } catch (e) { raw = null; }
  raw = raw && typeof raw === 'object' ? raw : {};
  const keys = Object.keys(raw).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && _achNum(raw[k]) !== 0).sort();
  r = { raw, keys, week: /^w\./.test(name) };
  c.set(name, r);
  return r;
}
function _achRun(S, min, skip, freeze) {
  const step = S.week ? 7 : 1;
  const q = S.keys.filter(k => _achNum(S.raw[k]) >= min && !skip(k));
  if (!q.length) return 0;
  let best = 0;
  if (!freeze && !skip.some) {
    let run = 0, prev = '';
    for (const k of q) { run = prev && achDayAdd(prev, step) === k ? run + 1 : 1; prev = k; if (run > best) best = run; }
    return best;
  }
  const set = new Set(q), last = q[q.length - 1], every = S.week ? 4 : 7, fmax = S.week ? 1 : 2;
  let run = 0, earn = 0, fz = 1;
  for (let d = q[0], i = 0; d <= last && i < 7000; d = achDayAdd(d, step), i++) {
    if (skip(d)) continue;
    if (set.has(d)) { run++; earn++; if (earn >= every) { earn = 0; fz = Math.min(fmax, fz + 1); } if (run > best) best = run; }
    else if (freeze && run > 0 && fz > 0) fz--;
    else { run = 0; earn = 0; fz = 1; }
  }
  return best;
}
function _achWin(S, span, ok) {
  const keys = S.keys.filter(ok);
  let best = 0;
  if (span <= 1) { for (const k of keys) best = Math.max(best, _achNum(S.raw[k])); return best; }
  const back = (span - 1) * (S.week ? 7 : 1);
  let sum = 0, j = 0;
  for (let i = 0; i < keys.length; i++) {
    sum += _achNum(S.raw[keys[i]]);
    const from = achDayAdd(keys[i], -back);
    while (keys[j] < from) { sum -= _achNum(S.raw[keys[j]]); j++; }
    if (sum > best) best = sum;
  }
  return best;
}
function _achPeriod(iso, kind, ws) {
  if (kind === 'week') return achWeekOf(iso, ws);
  if (kind === 'month') return iso.slice(0, 7);
  if (kind === 'quarter') return iso.slice(0, 4) + 'Q' + Math.ceil(Number(iso.slice(5, 7)) / 3);
  return iso.slice(0, 4);
}
function _achP(n, of) { n = Math.max(0, _achNum(n)); of = Math.max(1, _achNum(of)); return { n: Math.min(n, of), of, done: n >= of, raw: n }; }
function _achMeta(q, F) {
  const un = F.unlocked || {}, hist = F.hist || {};
  const defs = _ACH.defs;
  const isOn = (d) => !!un[d.id] && !(q.noHist && hist[d.id]);
  if (q.shelves) { const s = new Set(defs.filter(isOn).map(d => d.shelf)); return _achP(s.size, q.shelves); }
  if (q.catComplete) {
    let n = 0;
    for (const c of ACH_CATS) { if (c.id === 'meta') continue; const l = defs.filter(d => d.cat === c.id); if (l.length && l.every(isOn)) n++; }
    return _achP(n, q.catComplete);
  }
  if (q.inWeek) {
    const ws = (F.ctx && F.ctx.weekStart) || 'Mon', per = new Map();
    for (const d of defs) { const day = un[d.id]; if (!day || hist[d.id] || !/^\d{4}-\d{2}-\d{2}$/.test(String(day))) continue; const w = achWeekOf(day, ws); per.set(w, (per.get(w) || 0) + 1); }
    let best = 0; for (const v of per.values()) best = Math.max(best, v);
    return _achP(best, q.inWeek);
  }
  const want = (d) => (!q.cat || d.cat === q.cat) && (!q.shelf || d.shelf === q.shelf) && (!q.tier || d.tier === q.tier)
    && (!q.rarity || (Array.isArray(q.rarity) ? q.rarity.includes(d.rarity) : d.rarity === q.rarity))
    && (q.secret == null || !!d.secret === !!q.secret) && (!q.series || d.series === q.series) && (!q.pack || d.pack === q.pack);
  const pool = defs.filter(want);
  const got = pool.filter(d => isOn(d) && !(q.noHist && hist[d.id])).length;
  return q.all ? _achP(got, pool.length) : _achP(got, q.gte);
}
/** Evaluate a condition against the facts F -> {n, of, done}. Never throws (a bad condition is 0 of 1). */
function achEval(cond, F) {
  if (!cond || typeof cond !== 'object' || !F) return _achP(0, 1);
  const meta = !!cond.meta;
  const memo = F._memo || (F._memo = new Map());
  let key = '';
  if (!meta && !cond.all && !cond.any) { try { key = JSON.stringify(cond); } catch (e) { key = ''; } if (key && memo.has(key)) return memo.get(key); }
  let r;
  try { r = _achEval1(cond, F); } catch (e) { r = _achP(0, 1); }
  if (key) memo.set(key, r);
  return r;
}
function _achEval1(c, F) {
  const ctx = F.ctx || {};
  const ok = (k) => !c.on || achDayMatches(k, c.on, ctx);
  if (c.n != null && typeof c.n === 'string') { let v = 0; try { v = F.n(c.n); } catch (e) { v = 0; } return _achP(v, c.gte); }
  if (c.days) { const S = _achSer(F, c.days), min = c.min == null ? 1 : c.min; return _achP(S.keys.filter(k => ok(k) && _achNum(S.raw[k]) >= min && (c.max == null || _achNum(S.raw[k]) <= c.max)).length, c.gte); }
  if (c.run) {
    const S = _achSer(F, c.run);
    const skip = (k) => (c.skip === 'weekend' && !S.week && (achDow(k) === 0 || achDow(k) === 6)) || !ok(k);
    skip.some = c.skip === 'weekend' || !!c.on;
    return _achP(_achRun(S, c.min == null ? 1 : c.min, skip, !!c.freeze), c.gte);
  }
  if (c.win) return _achP(_achWin(_achSer(F, c.win), Math.max(1, Math.round(_achNum(c.span) || 1)), ok), c.gte);
  if (c.cal) {
    const S = _achSer(F, c.s), per = new Map();
    for (const k of S.keys) if (ok(k)) { const p = _achPeriod(k, c.cal, ctx.weekStart); per.set(p, (per.get(p) || 0) + _achNum(S.raw[k])); }
    const times = Math.max(1, Math.round(_achNum(c.times) || 1));
    if (times === 1) { let best = 0; for (const v of per.values()) best = Math.max(best, v); return _achP(best, c.gte); }
    let n = 0; for (const v of per.values()) if (v >= c.gte) n++;
    return _achP(n, times);
  }
  if (Array.isArray(c.same)) {
    const parts = c.same.map(p => ({ S: _achSer(F, p[0]), min: p[1] == null ? 1 : _achNum(p[1]), max: p[2] == null ? null : _achNum(p[2]) }));
    const drv = parts.find(p => p.min > 0);
    if (!drv) return _achP(0, c.gte);
    return _achP(drv.S.keys.filter(k => ok(k) && parts.every(p => { const v = _achNum(p.S.raw[k]); return v >= p.min && (p.max == null || v <= p.max); })).length, c.gte);
  }
  if (Array.isArray(c.all)) {
    const rs = c.all.map(x => achEval(x, F));
    if (rs.length === 1) return rs[0];
    return _achP(rs.filter(r => r.done).length, rs.length);
  }
  if (Array.isArray(c.any)) {
    let best = _achP(0, 1);
    for (const x of c.any) { const r = achEval(x, F); if (r.done) return r; if (r.n / r.of > best.n / best.of) best = r; }
    return best;
  }
  if (Array.isArray(c.ratio)) {
    let a = 0, b = 0; try { a = _achNum(F.n(c.ratio[0])); b = _achNum(F.n(c.ratio[1])); } catch (e) { /* 0 */ }
    const minOf = Math.max(1, _achNum(c.minOf) || 1);
    if (b < minOf) return { n: b, of: minOf, done: false, raw: b };
    const r = a / b, want = _achNum(c.gte);
    return { n: Math.round(Math.min(r, want) * 100), of: Math.max(1, Math.round(want * 100)), done: r >= want, raw: r };
  }
  if (c.mark) { let m = null; try { m = F.m(c.mark); } catch (e) { m = null; } return _achP(m ? Object.keys(m).length : 0, c.gte); }
  if (Array.isArray(c.has)) { let m = null; try { m = F.m(c.has[0]); } catch (e) { m = null; } return _achP(m && m[c.has[1]] ? 1 : 0, 1); }
  if (c.meta && typeof c.meta === 'object') return _achMeta(Object.assign({ gte: c.gte }, c.meta), F);
  return _achP(0, 1);
}

/* ---------- canonical form and lint ---------- */
function achCanonical(v) {
  if (Array.isArray(v)) return '[' + v.map(achCanonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + achCanonical(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const _ACH_NAME_RE = /^[A-Za-z0-9._:-]{1,48}$/;
/** '' when a condition is well formed, else why not. */
function achCondError(c, depth) {
  depth = depth || 0;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'not an object';
  if (depth > 6) return 'nested too deep';
  const num = (v) => typeof v === 'number' && isFinite(v);
  const nm = (v) => typeof v === 'string' && _ACH_NAME_RE.test(v);
  const onOk = !c.on || (typeof c.on === 'object' && !Array.isArray(c.on));
  if (!onOk) return 'bad day filter';
  if (c.n != null) return nm(c.n) && num(c.gte) ? '' : 'n needs a fact name and gte';
  if (c.days != null || c.run != null || c.win != null) {
    const s = c.days != null ? c.days : c.run != null ? c.run : c.win;
    if (!nm(s) || !num(c.gte)) return 'needs a series name and gte';
    if (c.win != null && !num(c.span)) return 'win needs span';
    return '';
  }
  if (c.cal != null) return ['week', 'month', 'quarter', 'year'].includes(c.cal) && nm(c.s) && num(c.gte) ? '' : 'cal needs week|month|quarter|year, s and gte';
  if (c.same != null) return Array.isArray(c.same) && c.same.length && c.same.every(p => Array.isArray(p) && nm(p[0])) && c.same.some(p => (p[1] == null ? 1 : p[1]) > 0) && num(c.gte) ? '' : 'same needs [[series, min, max?]...] and gte';
  if (c.all != null || c.any != null) { const l = c.all != null ? c.all : c.any; if (!Array.isArray(l) || !l.length) return 'all/any needs a list'; for (const x of l) { const e = achCondError(x, depth + 1); if (e) return e; } return ''; }
  if (c.ratio != null) return Array.isArray(c.ratio) && c.ratio.length === 2 && c.ratio.every(nm) && num(c.gte) && num(c.minOf) ? '' : 'ratio needs [fact, fact], gte and minOf';
  if (c.mark != null) return nm(c.mark) && num(c.gte) ? '' : 'mark needs a kind and gte';
  if (c.has != null) return Array.isArray(c.has) && c.has.length === 2 && nm(c.has[0]) && typeof c.has[1] === 'string' ? '' : 'has needs [kind, key]';
  if (c.meta != null) return typeof c.meta === 'object' && (num(c.gte) || c.meta.shelves || c.meta.catComplete || c.meta.inWeek || c.meta.all) ? '' : 'meta needs gte';
  return 'unknown operator';
}

/* ---------- the registry ---------- */
const _ACH = { defs: [], byId: new Map(), names: new Map(), conds: new Map(), packs: new Map(), skipped: [], queue: [], core: false };
function _achFold(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function _achNeeds(v) { const l = Array.isArray(v) ? v : String(v || '').split(/[\s,]+/); return l.map(x => String(x).trim()).filter(x => ACH_FEATURES.includes(x)); }
/** One definition, cleaned, with the names older readers use (label, hint, group, fact, of). */
function _achNorm(d, pack) {
  const c = _ACH_CAT_BY.get(d.cat) || _ACH_CAT_BY.get('meta');
  const rar = ACH_RARITY[d.rarity] ? d.rarity : 'common';
  const when = d.when || (d.fact ? { n: d.fact, gte: Number(d.of) || 1 } : null);
  const simple = when && typeof when.n === 'string' && Object.keys(when).length === 2;
  const priv = !!(d.private || c.private);
  const needs = _achNeeds(d.needs != null ? d.needs : c.needs);
  return Object.freeze(Object.assign({}, d, {
    id: String(d.id), cat: c.id, shelf: c.shelf, name: String(d.name || d.label || d.id), desc: String(d.desc || d.hint || ''),
    label: String(d.name || d.label || d.id), hint: String(d.desc || d.hint || ''),
    when, rarity: rar, xp: ACH_RARITY[rar].xp, icon: d.icon || c.icon,
    series: d.series || null, tier: ACH_TIERS.includes(d.tier) ? d.tier : null,
    unlock: d.unlock && achRewardParse(d.unlock) ? String(d.unlock) : null,
    secret: !!d.secret, clue: String(d.clue || ''), season: achSeason(d.season), needs, private: priv,
    go: d.go != null ? String(d.go) : c.go, pack: pack || 'core', group: d.group || (priv ? 'private' : c.group),
    fact: simple ? when.n : (d.fact || null), of: simple ? Number(when.gte) || 1 : (Number(d.of) || 1),
  }));
}
function _achSkip(pack, id, why) {
  _ACH.skipped.push({ pack, id: String(id || '?'), why });
  try { console.warn(`[ach] skipped ${id || '?'} (${pack}): ${why}`); } catch (e) { /* no console */ }
}
function _achAdd(d, pack, core) {
  if (!d || typeof d !== 'object') { _achSkip(pack, '?', 'not an object'); return false; }
  const id = String(d.id || '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 24) { _achSkip(pack, id, 'the id must be lowercase words joined by dashes, 24 characters at most'); return false; }
  if (_ACH.byId.has(id)) { _achSkip(pack, id, 'duplicate id'); return false; }
  if (!core) {
    if (!_ACH_CAT_BY.has(d.cat)) { _achSkip(pack, id, 'unknown category ' + d.cat); return false; }
    const pre = _ACH_CAT_BY.get(d.cat).prefix + '-';
    if (!id.startsWith(pre)) { _achSkip(pack, id, `the id must start with ${pre}`); return false; }
    if (!ACH_RARITY[d.rarity]) { _achSkip(pack, id, 'missing or unknown rarity'); return false; }
    if (!d.name || String(d.name).length > 28) { _achSkip(pack, id, 'the name is missing or over 28 characters'); return false; }
    if (!d.desc || String(d.desc).length > 90) { _achSkip(pack, id, 'the description is missing or over 90 characters'); return false; }
    if (_ACH_BANNED.test(d.name) || _ACH_BANNED.test(d.desc)) { _achSkip(pack, id, 'a banned word (never shaming: docs/dev/ACHIEVEMENTS_500.md 2.7)'); return false; }
    if (d.unlock && !achRewardParse(d.unlock)) { _achSkip(pack, id, 'unknown unlock kind ' + d.unlock); return false; }
    if (d.tier && (!d.series || !ACH_TIERS.includes(d.tier))) { _achSkip(pack, id, 'a tier needs a series and bronze|silver|gold|platinum'); return false; }
  }
  const when = d.when || (d.fact ? { n: d.fact, gte: Number(d.of) || 1 } : null);
  const err = achCondError(when);
  if (err) { _achSkip(pack, id, 'condition: ' + err); return false; }
  const fold = _achFold(d.name || d.label);
  if (!core && _ACH.names.has(fold)) { _achSkip(pack, id, `the name repeats ${_ACH.names.get(fold)}`); return false; }
  const canon = achCanonical(when);
  if (!core && _ACH.conds.has(canon)) { _achSkip(pack, id, `the condition repeats ${_ACH.conds.get(canon)}`); return false; }
  const def = _achNorm(Object.assign({}, d, { when }), pack);
  _ACH.defs.push(def); _ACH.byId.set(id, def); _ACH.names.set(fold, id);
  if (!_ACH.conds.has(canon)) _ACH.conds.set(canon, id);
  return true;
}
function _achPackIn(p) {
  const rec = _ACH.packs.get(p.id) || { id: p.id, label: p.label || p.id, n: 0, skipped: 0 };
  for (const d of p.defs) { if (_achAdd(d, p.id, false)) rec.n++; else rec.skipped++; }
  _ACH.packs.set(p.id, rec);
  return rec;
}
/**
 * Add a pack of achievements: registerAchievementPack({id: 'b1-plan', label: 'Plan shelf', defs: [...]}).
 * Before the core 78 are in (71-achievements.js) the pack waits; after, it is linted and added at once.
 * Safe at any time from any file (2.18 modules too). -> {id, n, skipped} | null
 */
function registerAchievementPack(pack) {
  if (!pack || typeof pack !== 'object' || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(String(pack.id || '')) || !Array.isArray(pack.defs)) {
    try { console.warn('[ach] a pack needs {id, defs: [...]}'); } catch (e) { /* no console */ }
    return null;
  }
  const p = { id: String(pack.id), label: String(pack.label || pack.id), defs: pack.defs.slice() };
  if (!_ACH.core) { _ACH.queue.push(p); return { id: p.id, n: 0, skipped: 0, waiting: true }; }
  const r = _achPackIn(p);
  if (typeof _achOnPack === 'function') { try { _achOnPack(p.id); } catch (e) { /* the page's hook */ } }
  return r;
}
function achPack(id, defs, label) { return registerAchievementPack({ id, defs, label }); }
/** The core list (71-achievements.js), then every pack that was waiting. Returns the live list (ACH_DEFS). */
function _achBindCore(list) {
  if (_ACH.core) return _ACH.defs;
  for (const d of list) _achAdd(d, 'core', true);
  _ACH.core = true;
  for (const p of _ACH.queue.splice(0)) _achPackIn(p);
  return _ACH.defs;
}
function achPacksAll() { return [..._ACH.packs.values()].map(p => Object.assign({}, p)); }
function achLintReport() { return { loaded: _ACH.defs.length, skipped: _ACH.skipped.slice(), packs: achPacksAll() }; }
function achLintSummary() {
  const r = achLintReport();
  return `${r.loaded.toLocaleString('en-GB')} loaded, ${r.skipped.length} skipped${r.skipped.length ? ' (' + r.skipped.slice(0, 4).map(s => s.id + ': ' + s.why).join('; ') + (r.skipped.length > 4 ? '; ...' : '') + ')' : ''}`;
}
