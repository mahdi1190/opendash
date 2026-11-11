/* ============================================================
   GARDEN WONDER, stories (docs/dev/STORIES.md; the bible: STORY_BIBLE.md).
   Every story is plain data: the main line (the mill and the vale), character arcs (optional, opened by friendship and curiosity), and small stories (a scene or three).
   This file is the engine; the stories live in 94-garden-wonder-1tales.js (and any later file that calls wdTaleAdd).

   A story:  {id, kind: 'main' | 'arc' | 'small', title, journal (one line for the Stories page), gentle: 'keep' | 'soft' | 'skip', steps: [beat]}
             gentle: 'skip' hides the whole story in the gentle telling; 'soft' (and 'keep') use each line's soft words where it has them.
   A beat:   {id, who, when, lines, choice, set, give, heavy, sit, free, note}
     who     a caller id (tam, bramble, pip, thistle, wick, quince), 'angler' (the pier), a resident (wdTaleResident: hollin),
             'place' (said as you walk by: `near` anchor ids, `r` cells), 'catch' (comes up on your line or net), 'post' (a letter from `from`).
     when    {after: 'story.beat' | [...], days (since the last of those), open: [zone numbers], heart: n (with who) or {who: n}, season: [], tod: [],
              dry: 1, rain: 1, flag: {k: v}, noflag: [k], item: 'id' (in your bag), level: n, home: 1 (only at their home: heavy moments are told there), deep: 1 (only in the full telling), fish: [ids] (for 'catch'), weekday: [0-6], fog: 1 (a damp or cold dawn, for now)}
     lines   strings, or {t, soft, flag, noflag} (soft '' leaves it out of the gentle telling; flag/noflag: only when those flags are, or are not, set)
     choice  [{label, t, set: {flag: value}, mood: {who: n}}]: what you can say. No choice is the right one, and none pays.
     set     flags set when the beat is heard; give {item: n} (a small gift, once); heavy: 1 (the care note once before, and the quiet link beside it);
     sit     what happens if you just sit with them; free: 1 (does not wait for the beat before it).
   Beats in a story go in order unless free; one beat a day per story; at most one heavy beat a day.
   SAVED (garden.wd, per player, never in the snapshot): sx.<story>.<beat> the day heard, sf.<flag> flags, sc.<story>.<beat> the choice, cn (the care note was shown).
   ============================================================ */
const WD_TALES = [];
const WD_TALE_BY = new Map();
/** Add a story (any later file may). */
/** Take a story out (a later file replacing an earlier draft). */
function wdTaleDrop(id) { const s = WD_TALE_BY.get(id); if (!s) return; WD_TALE_BY.delete(id); WD_TALES.splice(WD_TALES.indexOf(s), 1); }
/** Add a beat to a story already added: at the end, or after the beat with id 'after'. */
function wdTaleBeat(storyId, beat, after) { const s = WD_TALE_BY.get(storyId); if (!s || !beat || s.steps.some(b => b.id === beat.id)) return; const i = after ? s.steps.findIndex(b => b.id === after) : -1; if (i >= 0) s.steps.splice(i + 1, 0, beat); else s.steps.push(beat); }
function wdTaleAdd(story) { if (!story || !story.id || WD_TALE_BY.has(story.id)) return; story.steps = (story.steps || []).filter(Boolean); WD_TALES.push(story); WD_TALE_BY.set(story.id, story); }
const WD_TALE_RESIDENTS = new Map();
/** A resident who lives at a place and is found there (not a caller): {id, name, art (svg), home: {region, near: [anchor ids]}, deep, day: [lines]}. */
function wdTaleResident(r) { if (r && r.id) WD_TALE_RESIDENTS.set(r.id, r); }
function _wtW() { return _wdG(); }
function wdTaleFlag(k) { return _wtW()['sf.' + k]; }
function _wtSeen(story, beat) { return _wtW()[`sx.${story}.${beat}`]; }
function wdTaleSeen(ref) { const [s, b] = String(ref).split('.'); return b ? _wtSeen(s, b) : Object.keys(_wtW()).some(k => k.startsWith(`sx.${s}.`)); }
function _wtDeep() { return typeof _wkDeep === 'function' ? _wkDeep() : true; }
function _wtHeart(who) { return typeof wdKinHeart === 'function' ? wdKinHeart(who) : 0; }
function _wtOpen(m, n) { return !n || (Array.isArray(m.areas) && m.areas.includes('zn-' + n)); }
/** Is this beat’s `when` true now? */
function _wtWhen(w, m, who) {
  if (!w) return true;
  const today = m.today, list = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
  if (w.deep && !_wtDeep()) return false;
  if (w.level && m.level.level < w.level) return false;
  for (const n of list(w.open)) if (!_wtOpen(m, n)) return false;
  let last = '';
  for (const ref of list(w.after)) { const d = wdTaleSeen(ref); if (!d) return false; if (typeof d === 'string' && d > last) last = d; }
  if (w.days && last && _wdDaysBetween(last, today) < w.days) return false;
  if (w.heart != null) { const H = typeof w.heart === 'object' ? w.heart : { [who]: w.heart }; for (const [k, n] of Object.entries(H)) if (_wtHeart(k) < n) return false; }
  if (w.season && !list(w.season).includes(m.season)) return false;
  if (w.weekday != null && !list(w.weekday).includes(new Date(m.today + 'T12:00:00').getDay())) return false;   // 0 Sunday … 6 Saturday
  if (w.fog && !(m.tod === 'dawn' && ((m.rain && m.rain.now) || m.season === 'autumn' || m.season === 'winter'))) return false;   // no fog in the weather yet: a damp or cold dawn stands in
  if (w.tod && !list(w.tod).includes(m.tod)) return false;
  if (w.dry && m.rain && m.rain.now) return false;
  if (w.rain && !(m.rain && m.rain.now)) return false;
  if (w.flag) for (const [k, v] of Object.entries(w.flag)) if (v === true ? !wdTaleFlag(k) : wdTaleFlag(k) !== v) return false;
  for (const k of list(w.noflag)) if (wdTaleFlag(k)) return false;
  if (w.home && !(typeof wdKinAtHome === 'function' && wdKinAtHome(who))) return false;
  if (w.item && !(typeof gardenHas === 'function' && gardenHas(w.item) > 0)) return false;
  if (typeof w.test === 'function') { try { if (!w.test(m)) return false; } catch (e) { return false; } }
  return true;
}
function _wtStoryOn(s) { return !(s.gentle === 'skip' && !_wtDeep()); }
/** The next beat of a story that is ready now, or null (in order, one a day). */
function _wtNext(s, m, who) {
  if (!_wtStoryOn(s)) return null;
  const W = _wtW(), today = m.today; let heardToday = false;
  for (const b of s.steps) if (!b.free && W[`sx.${s.id}.${b.id}`] === today) heardToday = true;
  for (let i = 0; i < s.steps.length; i++) {
    const b = s.steps[i]; if (W[`sx.${s.id}.${b.id}`]) continue;   // (in order: the first beat not yet heard and not free is the only one that can come)
    if (heardToday && !b.free) return null;
    if (who && b.who !== who) { if (!b.free) return null; continue; }
    if (b.heavy && (_wtHeavyToday() || _wtMainToday())) { if (!b.free) return null; continue; }   // one heavy moment a day, and never on a day the main line moved
    if (!_wtWhen(b.when, m, b.who)) { if (!b.free) return null; continue; }
    return b;
  }
  return null;
}
function _wtMainToday() { const W = _wtW(), t = _wdToday(); for (const s of WD_TALES) if (s.kind === "main") for (const b of s.steps) if (W[`sx.${s.id}.${b.id}`] === t) return true; return false; }
function _wtHeavyToday() { const W = _wtW(); return W.hv === _wdToday(); }
const _WT_RANK = { main: 0, arc: 1, small: 2 };
/** The beat this speaker would tell now, with its story: main line first, then arcs, then small stories. */
function wdTaleFor(who, m) {
  if (!m || m.visit) return null;
  const rows = WD_TALES.slice().sort((a, b) => (_WT_RANK[a.kind] || 2) - (_WT_RANK[b.kind] || 2));
  for (const s of rows) { const b = _wtNext(s, m, who); if (b) return { s, b }; }
  return null;
}
/** The main line’s next beat (any speaker): who should come today. */
function wdTaleMainNext(m) { if (!m || m.visit) return null; for (const s of WD_TALES) if (s.kind === 'main') { const b = _wtNext(s, m, ''); if (b) return { s, b }; } return null; }
function _wtLine(l) {
  if (l == null) return '';
  if (typeof l === 'string') return l;
  if (l.flag) for (const [k, v] of Object.entries(l.flag)) if (v === true ? !wdTaleFlag(k) : wdTaleFlag(k) !== v) return '';
  for (const k of l.noflag || []) if (wdTaleFlag(k)) return '';
  return _wtDeep() || l.soft === undefined ? l.t : l.soft;
}
/** Hear a beat: {lines, actions}. Marks it heard, sets its flags, gives its gift once. */
function wdTaleTell(s, b, o) {
  const W = _wtW(), today = _wdToday(), lines = [], actions = [];
  if (b.heavy && _wtDeep() && !W.cn) { W.cn = today; lines.push(WK_CARE.note); }
  for (const l of b.lines || []) { const t = _wtLine(l); if (t) lines.push(t); }
  W[`sx.${s.id}.${b.id}`] = today; if (b.heavy) W.hv = today;
  for (const [k, v] of Object.entries(b.set || {})) W['sf.' + k] = v;
  if (b.give) { const g = _gdG(), key = `wt.${s.id}.${b.id}`; if (!g.led[key]) { g.led[key] = { d: today, k: 'wd', i: Object.assign({}, b.give), n: 1 }; const item = Object.keys(b.give)[0]; lines.push(`(${typeof _wkItemWords === 'function' ? _wkItemWords(item) : 'Something'}: in your bag.)`.replace(/^\((.)/, (x, c) => '(' + c.toUpperCase())); } }
  _wdSave();
  const after = (o && o.after) || null;
  for (const c of b.choice || []) actions.push({ label: c.label, primary: true, run: (T) => { W[`sc.${s.id}.${b.id}`] = c.k || c.label; for (const [k, v] of Object.entries(c.set || {})) W['sf.' + k] = v; for (const [who, n] of Object.entries(c.mood || {})) if (typeof _wkAdd === 'function') _wkAdd(who, n); _wdSave(); T.say(_wtLine(c) || '…', b.sit ? [{ label: 'Sit for a while', run: (T2) => T2.say(_wtLine(b.sit), _wtCare(b)) }].concat(_wtCare(b)) : _wtCare(b)); if (after) after(c); } });
  if (b.sit) actions.push({ label: 'Sit for a while', primary: !(b.choice || []).length, run: (T) => T.say(_wtLine(b.sit), _wtCare(b)) });
  actions.push(..._wtCare(b));
  return { lines, actions };
}
function _wtCare(b) { return b.heavy && _wtDeep() ? [{ label: 'If this brings anything up', run: () => { if (typeof wdKinCarePage === 'function') wdKinCarePage(); } }] : []; }
/* ---------- places, catches and the post ---------- */
const _wt = { near: new Set(), res: new Map() };
function _wtAnchorPt(ids) { for (const id of ids || []) { const p = typeof _wkAnchor === 'function' ? _wkAnchor(id) : null; if (p) return p; } return null; }
function _wtPlaces(m) {
  for (const s of WD_TALES) {
    const b = _wtNext(s, m, 'place') || _wtNext(s, m, 'traveller'); if (!b || _wt.near.has(s.id + b.id)) continue;   // (a traveller speaks at the quay as a place does, until travellers walk the arrival road)
    const p = _wtAnchorPt(b.near); if (!p || !wdNear(p.x, p.y, b.r || 3)) continue;
    _wt.near.add(s.id + b.id);
    const t = wdTaleTell(s, b).lines.join(' '); if (t) wdAmbient(t, 11000, 'story');
  }
}
document.addEventListener('opendash:garden', (e) => {
  const d = e.detail || {}; if (d.kind !== 'fish' && d.kind !== 'bug') return;
  try {
    const m = gardenModel(); if (m.visit) return;
    for (const s of WD_TALES) { const b = _wtNext(s, m, 'catch'); if (!b || (b.when && b.when.fish && !b.when.fish.includes(d.id))) continue; const t = wdTaleTell(s, b).lines.join(' '); if (t) setTimeout(() => wdAmbient(t, 11000, 'story'), 2600); return; }
  } catch (x) { /* later */ }
});
/** A letter that may come today from a story (94-garden-wonder-2post.js asks), as a letter row. */
function wdTaleLetterDue(m) {
  for (const s of WD_TALES) { const b = _wtNext(s, m, 'post'); if (b) return _wtLetterRow(s, b); }
  return null;
}
function _wtLetterRow(s, b) { return { id: `tale.${s.id}.${b.id}`, from: b.from || 'Someone', text: (b.lines || []).map(_wtLine).filter(Boolean), sign: b.sign || b.from || '', _tale: [s.id, b.id] }; }
/** Letter rows for letters already come (the Keepsakes list). */
function wdTaleLetterRow(id) { const p = String(id).split('.'); if (p[0] !== 'tale') return null; const s = WD_TALE_BY.get(p[1]), b = s && s.steps.find(x => x.id === p[2]); return b ? _wtLetterRow(s, b) : null; }
function wdTaleLettersHad() { const W = _wtW(), out = []; for (const k of Object.keys(W)) if (k.startsWith('l.tale.')) { const r = wdTaleLetterRow(k.slice(2)); if (r) out.push(r); } return out; }
/** When a story letter arrives: it counts as heard. */
function wdTaleLetterCame(r) { if (r && r._tale) { const W = _wtW(); W[`sx.${r._tale[0]}.${r._tale[1]}`] = _wdToday(); const s = WD_TALE_BY.get(r._tale[0]), b = s && s.steps.find(x => x.id === r._tale[1]); for (const [k, v] of Object.entries((b && b.set) || {})) W['sf.' + k] = v; } }
/* ---------- residents: found at home, never calling ---------- */
function _wtResPlace(r, m) {
  if (_wt.res.has(r.id)) return;
  if (r.deep && !_wtDeep()) return;
  if (typeof r.here === 'function' && !r.here(m)) return;
  const z = typeof _wkRegionZone === 'function' ? _wkRegionZone(r.home.region) : 0; if (z == null || !_wtOpen(m, z)) return;
  const p = _wtAnchorPt(r.home.near); if (!p) return;
  const to = wdFreeNear(p.x, p.y, 2); if (!to) return;
  if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(to.x), Math.floor(to.y))) return;
  const S = wdSprite({ id: 'wt-' + r.id, x: to.x, y: to.y, still: true, hit: 0.75, hitUp: 16, label: r.name, cursor: 'hand', svg: r.art(), onClick: () => _wtResTalk(r, S) });
  _wt.res.set(r.id, S);
}
function _wtResTalk(r, S) {
  const m = gardenModel(), W = _wtW(), today = m.today, F = wdFacts(m, r.id), lines = [], actions = [];
  const t = wdTaleFor(r.id, m);
  if (t) { const o = wdTaleTell(t.s, t.b); lines.push(...o.lines); actions.push(...o.actions); }
  else if (W['fy.' + r.id] !== today && (r.dayRows || r.day)) { const rows = r.dayRows ? r.dayRows() : null, d = rows && typeof _wkDayPick === 'function' ? _wkDayPick(r.id, rows, _wkFacts(F, m), today) : r.day ? r.day[gardenHash('wt|' + today + r.id) % r.day.length] : ''; W['fy.' + r.id] = today; if (d) lines.push(d); }
  if (F.last !== today && typeof _wkAdd === 'function') _wkAdd(r.id, 1);
  W['fv.' + r.id] = today; W['fn.' + r.id] = F.talks + 1; _wdSave();
  wdTalk({ name: r.name, art: r.art(), lines: lines.length ? lines : [r.quiet || '…'], actions, at: { x: S.x, y: S.y }, bye: 'Goodbye' });
}
wdMod({
  id: 'tales', pref: 'folk',
  begin() { _wt.near.clear(); _wt.res.clear(); },
  tick(m) {
    if (m.visit || _wd.still) return;
    try { _wtPlaces(m); for (const r of WD_TALE_RESIDENTS.values()) _wtResPlace(r, m); } catch (e) { console.error('[garden stories]', e); }
  },
  end() { for (const S of _wt.res.values()) S.remove(); _wt.res.clear(); },
});
/* ---------- the Stories page (Keepsakes): every story begun, with what was said, so you can read it again ---------- */
function wdBoxStories(el, m) {
  const W = _wtW(), begun = WD_TALES.filter(s => _wtStoryOn(s) && s.steps.some(b => W[`sx.${s.id}.${b.id}`]));
  if (!begun.length) { el.appendChild(_gdpEl('p', 'muted wd-box-empty', 'Nothing yet. The old angler on the pier might have a story, if you sit with him.')); return; }
  const order = { main: 0, arc: 1, small: 2 }, head = { main: 'The vale', arc: 'People', small: 'Small stories' };
  let last = '';
  for (const s of begun.sort((a, b) => order[a.kind] - order[b.kind])) {
    if (s.kind !== last) { last = s.kind; el.appendChild(_gdpEl('h4', 'wd-tale-h', head[s.kind] || '')); }
    const box = _gdpEl('details', 'wd-tale'); const sum = _gdpEl('summary'); sum.appendChild(_gdpEl('b', null, s.title)); sum.appendChild(_gdpEl('small', 'muted', ' ' + (s.journal || ''))); box.appendChild(sum);
    for (const b of s.steps) { if (!W[`sx.${s.id}.${b.id}`]) continue; for (const l of b.lines || []) { const t = _wtLine(l); if (t) box.appendChild(_gdpEl('p', null, t)); } const c = W[`sc.${s.id}.${b.id}`]; if (c) { const ch = (b.choice || []).find(x => (x.k || x.label) === c); if (ch) box.appendChild(_gdpEl('p', 'muted', 'You: ' + ch.label + '. ' + _wtLine(ch))); } }
    el.appendChild(box);
  }
  const next = wdTaleMainNext(m);
  if (next) { const n = next.b.who === 'angler' ? 'The old angler' : (WD_FOLK_ROW.get(next.b.who) || {}).name; if (n) el.appendChild(_gdpEl('p', 'muted', `${n} has the next part of the vale’s story.`)); }
}
