/* ============================================================
   BUILD 2: THE VALE MUSEUM, IN THE GAME. The rules are in 94-garden-build2-0museum.js; the building is painted by
   94-garden-native-painted-zb2museum.js and placed through layout data (assets/garden/vale-museum.json, a row of the kind `museum`).

   Walk up to any museum (the Vale Museum by the west road, the lake hall, the Little museum you can build: all of the kind `museum`) and
   press E, or click it: the museum opens. Four wings, each with a keeper from the vale (Pip keeps the River Hall's fish, Quince the
   Glasshouse's bugs, Tam the Stone Gallery's fossils, Bramble the Curio Cabinet). Every exhibit is drawn in its own case (a tank you can
   watch it swim in, a glass dome, a plinth, a frame) with a brass label; what is missing shows as an outline. The strip at the foot lists
   what you could give from your pockets (and from home: Perpetua brings it over). Give one, and the keeper thanks you and tells you a
   fact about it; your Field Journal card gets a museum stamp. A wing's first piece opens it and its keeper gives you a present for your
   own garden; the whole collection's milestones bring more. The building outside grows a banner for each wing that opens.

   Friends: in a friend's garden, live, you give to THEIR museum (intent `donate`: their page writes it, with your name on the label, and
   only then is it taken from your pockets). On a saved copy you can look round, nothing more. Their museum reaches you in their snapshot
   (`mu`, ids and numbers only, no names); on your own screen a friend's gift says who gave it.

     gardenMuseumRows()            your exhibits: Map key -> { w, id, d, q, cm, by }      gardenMuseumHas(key) / gardenMuseumCount()
     gardenMuseumGive(item)        give one (Undo as everything else)                     gardenMuseumOpen(o)  the museum's pop-up
     gardenMuseumTab(el, m)        the museum drawn into any element (the pop-up; the catch pop-up's old lake hall tab)
     gardenMuseumWire()            what friends may see (`mu`)    gardenMuseumHallLists()  the lake hall's old counts, fed from the museum
     gardenB2Kept()                fossils and curios on show: not in pockets or at home (94-garden-build2-1pockets.js)
     gardenB2OpenProp(p) / gardenB2PropAt(id) / gardenMuseumActRows(px, py, rows)   doors, clicks and the E prompt, by kind
     gardenMuseumCardMark(c, kind, id) / gardenMuseumEntryMark(dl, kind, id)   the Field Journal's stamp and line
     gardenB2HostIntent / gardenB2VisitDonate / gardenB2VisitDone / gardenB2DiaryWhat   giving to a friend's museum, live
   ============================================================ */
const _gb2m = { rev: 0, rows: null, sig: '', kept: null, keptSig: '', wing: 'f', page: 0, pick: '', say: null, from: '', fid: '', give: 0 };
const GMU_PAGE = 24;

/* ---------- your collection ---------- */
function _gb2mSig(g) { const mu = g.mu || {}, hall = (g.prefs && g.prefs.ca && g.prefs.ca.hall) || {}; let n = 0; for (const k in mu) n++; return _gb2m.rev + '|' + n + '|' + Object.keys(hall.f || {}).length + '|' + Object.keys(hall.b || {}).length; }
/** Every exhibit you have: g.mu, and the old lake hall's fish and bugs (given before the museum opened). */
function gardenMuseumRows() {
  const g = _gdG(), sig = _gb2mSig(g);
  if (_gb2m.rows && _gb2m.sig === sig && _gb2m.g === g) return _gb2m.rows;
  const out = new Map(), hall = (g.prefs && g.prefs.ca && g.prefs.ca.hall) || {};
  for (const w of ['f', 'b']) for (const id of Object.keys(hall[w] || {})) { const key = w + '.' + id; if (gardenMuseumIds(w).includes(id)) out.set(key, { key, w, id, d: String(hall[w][id] || ''), old: true }); }
  for (const [key, r] of Object.entries(g.mu || {})) {
    if (!r || typeof r !== 'object') continue;
    const w = key.slice(0, 1), id = key.slice(2); if (key.charAt(1) !== '.' || !gardenMuseumIds(w).includes(id)) continue;   // (a wing or a kind a newer app knows: kept, not shown)
    out.set(key, { key, w, id, d: String(r.d || ''), q: Number(r.q) || 0, cm: Number(r.cm) || 0, by: r.by ? String(r.by) : '' });
  }
  _gb2m.rows = out; _gb2m.sig = sig; _gb2m.g = g;
  return out;
}
function gardenMuseumHas(key) { return gardenMuseumRows().has(key); }
function gardenMuseumCount() { return gardenMuseumRows().size; }
function _gb2mWingN(rows, w) { let n = 0; for (const r of rows.values()) if (r.w === w) n++; return n; }
/** Fossils and curios on show stay yours (every "found" count keeps working), but they are no longer in your pockets or at home. */
function gardenB2Kept() {
  const sig = _gb2mSig(_gdG()); if (_gb2m.kept && _gb2m.keptSig === sig) return _gb2m.kept;
  const out = {};
  for (const r of gardenMuseumRows().values()) { const W = gardenMuseumWing(r.w); if (W && W.keep) out[W.item + ':' + r.id] = 1; }
  _gb2m.kept = out; _gb2m.keptSig = sig; return out;
}
/** For the snapshot: { n, f: [[id, cm]], b, o, c, g: [[wing, id]] given by a friend }. Always there (empty: a museum with nothing yet), so a
 *  friend's page knows this one can be given to. */
function gardenMuseumWire() {
  const raw = { n: 0, f: [], b: [], o: [], c: [], g: [] };
  for (const r of gardenMuseumRows().values()) { if (r.w === 'f') raw.f.push([r.id, Math.round(r.cm || 0)]); else if (raw[r.w]) raw[r.w].push(r.id); if (r.by) raw.g.push([r.w, r.id]); raw.n++; }
  return gardenMuseumClean(raw) || { n: 0, f: [], b: [], o: [], c: [] };
}
/** The lake hall's own numbers (`ca.ha`, `hf`, `hb`: an older friend's app grows the hall from them), fed from the whole museum. */
function gardenMuseumHallLists() {
  const f = [], b = []; let n = 0;
  for (const r of gardenMuseumRows().values()) { n++; if (r.w === 'f') f.push(r.id); else if (r.w === 'b') b.push(r.id); }
  return { n, f, b };
}
/** The museum on screen: yours, or on a visit your friend's, from their snapshot (an older app's: its lake hall's fish and bugs). */
function gardenMuseumHere() {
  let m = null; try { m = gardenHere(); } catch (e) { m = null; }
  if (!m || !m.visit) return { visit: false, rows: gardenMuseumRows(), live: false, fid: '', can: true };
  const snap = (m.visit && m.visit.snap) || (typeof _gdvSnap === 'function' ? _gdvSnap() : null) || {}, rows = new Map(), fid = String(m.visit.fid || '');
  const gave = new Set(((_gdG().prefs.b2 || {}).gave || {})[fid] || []);
  const mu = snap.mu && typeof snap.mu === 'object' ? snap.mu : null, given = new Set(((mu && mu.g) || []).map(r => r[0] + '.' + r[1]));
  const add = (w, id, cm) => { const key = w + '.' + id; if (gardenMuseumIds(w).includes(id)) rows.set(key, { key, w, id, cm: Number(cm) || 0, by: gave.has(key) ? 'you' : given.has(key) ? 'friend' : '' }); };
  if (mu) { for (const r of mu.f || []) add('f', r[0], r[1]); for (const w of ['b', 'o', 'c']) for (const id of mu[w] || []) add(w, id, 0); }
  else { const ca = snap.ca || {}; for (const id of ca.hf || []) add('f', id, 0); for (const id of ca.hb || []) add('b', id, 0); }
  const live = typeof _glvLive === 'function' && _glvLive();
  return { visit: true, rows, live, fid, can: !!mu && live, first: typeof _gscFirst === 'function' ? _gscFirst(fid) : 'Your friend' };
}

/* ---------- what each exhibit is ---------- */
function _gb2mDef(w, id) { try { if (w === 'f') return gardenFishDef(id); if (w === 'b') return gardenBugDef(id); } catch (e) { /* none */ } return null; }
function gardenMuseumName(w, id) {
  try {
    const d = _gb2mDef(w, id); if (d) return d.name;
    if (w === 'o' && typeof GP_FOSSILS !== 'undefined') for (const F of GP_FOSSILS) for (const P of F.parts) if (F.id + '-' + P[0] === id) return P[1];
    if (w === 'c' && typeof GARDEN_LAND_CURIOS !== 'undefined') { const c = GARDEN_LAND_CURIOS.find(x => x.id === id); if (c) return c.name; }
    const W = gardenMuseumWing(w); if (W && typeof W.name === 'function') return W.name(id);
  } catch (e) { /* below */ }
  return 'Something old';
}
function _gb2mProper(w, id) { const d = _gb2mDef(w, id); return !!(d && d.legend && /^(The|Old) /.test(d.name)); }
/** The keeper's fact: the table's, else the thing's own note or label. */
function _gb2mFact(w, id) {
  const f = gardenMuseumFact(w, id); if (f) return f;
  const d = _gb2mDef(w, id); if (d && d.blurb) return d.blurb;
  try { if (w === 'c') { const c = GARDEN_LAND_CURIOS.find(x => x.id === id); if (c && c.blurb) return c.blurb; } } catch (e) { /* none */ }
  return '';
}
/** The item that would be given: a fish's plainest one you have (your starred ones fetch more at the market), from your pockets first. */
function _gb2mPay(w, id) {
  const W = gardenMuseumWing(w); if (!W) return '';
  if (w === 'f') {
    let inPk = null; try { inPk = gardenB2On() ? gardenB2View().slots : null; } catch (e) { inPk = null; }
    const keys = [0, 1, 2, 3].map(q => gardenFishKey(id, q)).filter(k => gardenHas(k) > 0); if (!keys.length) return '';
    const pk = inPk ? keys.find(k => inPk.some(s => s && s.i === k)) : '';
    return pk || keys[0];
  }
  const item = W.item + ':' + id;   // (a fossil piece or curio is only "kept" once it is on show: one not on show is in your pockets or at home)
  return gardenHas(item) > 0 ? item : '';
}
/** Pictures: a fish or bug its own catalogue drawing; a fossil piece its bone; a curio its own drawing. */
function gardenMuseumArt(w, id, px, o) {
  try {
    if (w === 'f') return gardenCatchSvg('fish', id, px, { uid: 'gmuf' + id + (o && o.sil ? 's' : '') });
    if (w === 'b') return gardenCatchSvg('bug', id, px, { uid: 'gmub' + id + (o && o.sil ? 's' : ''), glow: false });
    if (w === 'o') return _gb2mBone(id, px);
    if (w === 'c' && typeof gardenLandCurioSvg === 'function') { const s = gardenLandCurioSvg(id, px); if (s) return s; }
    const W = gardenMuseumWing(w); if (W && typeof W.svg === 'function') return W.svg(id, px);
  } catch (e) { /* the plain fossil */ }
  return typeof _gb2Pic === 'function' ? _gb2Pic('fos', px) : '';
}
/* the bones, bone-coloured and lit from the upper left; one drawing for each kind of piece (viewBox -24 -24 48 48) */
const _GMU_BONE = Object.freeze({
  skull: '<path d="M-17 4q-3 -16 10 -20q12 -3 20 6q5 6 4 13l-5 1l-1 4l-5 -1l-1 3l-6 -1q-3 4 -9 2q-6 -1 -7 -7z" fill="#e9dfc6"/><path d="M-9 -15q10 -4 17 2" stroke="#fff8e8" stroke-width="2" fill="none" opacity=".8"/><ellipse cx="2" cy="-3" rx="4.6" ry="3.6" fill="#5a4a36"/><ellipse cx="-9" cy="2" rx="2.2" ry="1.6" fill="#7a6a52"/><path d="M-6 9l2 3M-1 9l1 3M4 8l1 3M9 7l1 3" stroke="#c8bb9a" stroke-width="1.6" stroke-linecap="round"/><path d="M-15 6q8 4 30 -2" stroke="#b8a986" stroke-width="1" fill="none"/>',
  ribs: '<path d="M-18 -10q18 -6 36 0" stroke="#d8ccae" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + [-12, -6, 0, 6, 12].map(x => `<path d="M${x} -9q${x * .3 - 6} 10 ${x * .1 - 3} 20" stroke="#e9dfc6" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M${x - .6} -8q${x * .3 - 6} 9 ${x * .1 - 3.6} 18" stroke="#fff8e8" stroke-width=".8" fill="none" opacity=".7"/>`).join(''),
  claw: '<path d="M-6 16q-6 -16 4 -28q8 -8 14 -4q-8 4 -10 14q-2 8 0 18z" fill="#e9dfc6"/><path d="M-3 12q-4 -12 4 -22" stroke="#fff8e8" stroke-width="1.6" fill="none" opacity=".8"/><path d="M-8 16h12" stroke="#b8a986" stroke-width="2" stroke-linecap="round"/>',
  tail: [0, 1, 2, 3, 4, 5].map(i => `<g transform="translate(${-18 + i * 7.4} ${Math.sin(i * .7) * 4}) rotate(${i * 6})"><rect x="-3" y="-3.4" width="6" height="6.8" rx="2" fill="${i % 2 ? '#e0d4b8' : '#e9dfc6'}"/><path d="M-2 -2.6h3" stroke="#fff8e8" stroke-width="1" opacity=".8"/></g>`).join(''),
  shell: '<ellipse cx="0" cy="2" rx="19" ry="13" fill="#d8ccae"/><ellipse cx="-1" cy="0" rx="17" ry="11" fill="#e9dfc6"/><path d="M-10 -6l6 4l-6 5l-6 -4zM0 -8l6 4l-6 4l-6 -4zM10 -6l6 4l-6 5l-6 -4zM-5 4l5 4l-5 4l-5 -4zM6 4l5 4l-5 4l-5 -4z" fill="none" stroke="#b8a986" stroke-width="1.3"/><path d="M-12 -7q10 -6 22 -1" stroke="#fff8e8" stroke-width="1.8" fill="none" opacity=".8"/>',
  head: '<path d="M-16 4q0 -14 14 -15q14 1 16 10q1 6 -4 9q-12 4 -26 -4z" fill="#e9dfc6"/><circle cx="4" cy="-3" r="3.4" fill="#5a4a36"/><path d="M14 4q-6 3 -14 2" stroke="#b8a986" stroke-width="1.4" fill="none"/><path d="M-10 -6q8 -6 16 -2" stroke="#fff8e8" stroke-width="1.6" fill="none" opacity=".8"/>',
  flip: '<path d="M-18 -4q14 -10 34 -2q4 3 0 6q-18 10 -32 4q-6 -3 -2 -8z" fill="#e9dfc6"/>' + [-10, -3, 4, 11].map(x => `<path d="M${x} -4l1 8" stroke="#b8a986" stroke-width="1.2"/>`).join('') + '<path d="M-14 -5q14 -7 28 -2" stroke="#fff8e8" stroke-width="1.4" fill="none" opacity=".8"/>',
  tusk: '<path d="M-20 10q2 -18 20 -24q14 -4 20 4q-12 -2 -22 6q-8 6 -10 16z" fill="#efe6cc"/><path d="M-16 6q4 -14 18 -18" stroke="#fffaee" stroke-width="2" fill="none" opacity=".85"/><path d="M-20 10l-2 3l6 1z" fill="#b8a986"/>',
  leg: '<rect x="-5" y="-20" width="10" height="34" rx="5" fill="#e9dfc6"/><ellipse cx="0" cy="-19" rx="8" ry="5" fill="#e9dfc6"/><ellipse cx="0" cy="14" rx="8" ry="5" fill="#e0d4b8"/><path d="M-3 -16v28" stroke="#fff8e8" stroke-width="1.6" opacity=".8"/>',
  spine: [0, 1, 2, 3, 4].map(i => `<g transform="translate(${-16 + i * 8} ${-Math.sin(i * .8) * 3})"><rect x="-3.6" y="-4" width="7.2" height="8" rx="2.2" fill="#e9dfc6"/><path d="M0 -4l-1 -8l2 0z" fill="#e0d4b8"/><path d="M-2.6 -3h4" stroke="#fff8e8" stroke-width="1" opacity=".8"/></g>`).join(''),
});
function _gb2mBone(id, px) {
  const part = String(id).split('-').pop(), art = _GMU_BONE[part] || _GMU_BONE.skull;
  return `<svg class="gmu-bone" viewBox="-24 -24 48 48" width="${px}" height="${px}" aria-hidden="true" focusable="false"><ellipse cx="0" cy="18" rx="18" ry="3.4" fill="#3a2e20" opacity=".22"/>${art}</svg>`;
}

/* ---------- giving ---------- */
/** Give one to your own museum. o.quiet: no message (the panel's keeper says it). */
function gardenMuseumGive(item, o) {
  o = o || {};
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return gardenB2VisitDonate(item);
  const key = gardenMuseumKeyOf(item); if (!key) return _gdNo('The museum does not take that');
  const w = key.charAt(0), id = key.slice(2), W = gardenMuseumWing(w), name = gardenMuseumName(w, id), proper = _gb2mProper(w, id);
  if (gardenMuseumHas(key)) return _gdNo(gardenMuseumHave(W.keeper, name, proper));
  const pay = _gb2mPay(w, id); if (!pay) return _gdNo(`You have no ${name.toLowerCase()} with you.`);
  const g = _gdG(), today = _gdToday(), lk = 'mu.' + today + '.' + _gdUid(''), rows = gardenMuseumRows(), before = rows.size, wingBefore = _gb2mWingN(rows, w);
  // what this gift brings: the wing's present (its first piece) and any milestone of the whole collection (one ledger line each, by name,
  // so a second device never gives one twice)
  const gifts = [];
  if (!wingBefore && W.gift && !g.led['mu.w.' + w]) gifts.push({ lk: 'mu.w.' + w, item: W.gift, who: W.keeper, say: W.giftSay });
  for (const S of GB2_MUSEUM.steps) if (before < S.at && before + 1 >= S.at && !g.led['mu.s.' + S.at]) gifts.push({ lk: 'mu.s.' + S.at, item: S.item, who: S.who, say: S.say });
  const marks = [['led', lk], ['mu', key]].concat(gifts.map(x => ['led', x.lk])); if (w === 'f' || w === 'b') marks.push(['prefs', 'ca']);
  const mark = _gdMark(marks);
  const rec = { d: today };
  if (w === 'f') { const fp = gardenFishParse(pay); rec.q = fp ? fp.q : 0; let cm = 0; try { const s = gardenSpecShown('fish', id); cm = s ? Number(s.c) : 0; } catch (e) { cm = 0; } if (!cm && g.fl[id]) cm = Number(g.fl[id].b) || 0; if (cm) rec.cm = Math.max(1, Math.min(400, Math.round(cm))); }
  g.led[lk] = { d: today, k: 'mu', x: GB2_MUSEUM.xp, i: W.keep ? {} : { [pay]: -1 }, n: 1 };
  g.mu[key] = rec;
  for (const x of gifts) g.led[x.lk] = { d: today, k: 'mu', i: { [x.item]: 1 }, n: 0 };
  if (w === 'f' || w === 'b') {   // (the old lake hall's record too: an older device of yours never offers the same kind again, and the old angler's job counts it)
    const c = _gca(), hall = c.hall && typeof c.hall === 'object' ? c.hall : (c.hall = { f: {}, b: {} }); hall[w] = hall[w] || {}; if (!hall[w][id]) hall[w][id] = today;
    try { gardenJobEvent({ kind: 'hall' }); } catch (e) { /* no job */ }
  }
  _gb2m.rev++; _gb2m.give++;
  if (W.keep && typeof _gb2 !== 'undefined') { _gb2.wallet = null; _gb2.rev++; }   // (kept on show: out of your pockets now, not only once the purse changes)
  const after = before + 1, wingAfter = wingBefore + 1, all = gardenMuseumIds(w).length;
  const lines = [gardenMuseumThanks(W.keeper, name, _gb2m.give, proper)], fact = _gb2mFact(w, id);
  if (fact) lines.push(fact);
  for (const x of gifts) { const d = _gb2mGiftName(x.item); lines.push(x.say + (d ? ` (${d} is in your pockets.)` : '')); }
  if (wingAfter >= all && all) lines.push((GB2_KEEPER_SAYS[W.keeper] || {}).done || 'This wing is complete!');
  _gb2m.say = { who: W.keeper, lines, key, fresh: true, first: !wingBefore };
  _gb2m.wing = w; _gb2m.pick = key; _gb2m.page = Math.floor(Math.max(0, gardenMuseumIds(w).indexOf(id)) / GMU_PAGE);
  try { gardenCatchShowSoon(); } catch (e) { /* friends see it next time */ }
  try { _gdEmit('museum', { key, item: pay, n: after, first: !wingBefore }); } catch (e) { /* fine */ }
  const msg = o.quiet ? '' : lines[0];
  return _gdDone(msg, 'giving to the museum', mark, { icon: W.icon === 'bone' ? 'landmark' : W.icon, quiet: !!o.quiet });
}
function _gb2mGiftName(item) { try { return typeof gardenB2Name === 'function' ? 'The ' + gardenB2Name(item).toLowerCase() : ''; } catch (e) { return ''; } }

/* ---------- the pop-up ---------- */
function gardenB2Popup(tab) { return tab === 'museum' ? { title: 'The Vale Museum', icon: 'landmark', fill: (el, m) => gardenMuseumTab(el, m) } : null; }
/** Open the museum (o.wing: start in that wing; o.from: the thing whose door you came in by). */
function gardenMuseumOpen(o) {
  o = o || {};
  const here = gardenMuseumHere();
  if (o.wing && gardenMuseumWing(o.wing)) _gb2m.wing = o.wing;
  if (here.fid !== _gb2m.fid) { _gb2m.fid = here.fid; _gb2m.say = null; _gb2m.pick = ''; _gb2m.page = 0; }
  _gb2m.from = o.from || '';
  if (!_gb2m.say || !_gb2m.say.fresh) _gb2m.say = null;
  try { gardenSfx('door'); } catch (e) { /* quiet */ }
  gardenPopupOpen('museum', { title: here.visit ? `${here.first}’s museum` : 'The Vale Museum' });
  return true;
}
function _gb2mRepaint() {
  try { if (typeof _gdp !== 'undefined' && _gdp.pop && _gdp.pop.tab === 'museum' && typeof gardenPopupRefresh === 'function') { gardenPopupRefresh(); return; } } catch (e) { /* below */ }
  try { if (_gb2m.el && _gb2m.el.isConnected) gardenMuseumTab(_gb2m.el, gardenModel()); } catch (e) { /* closed */ }
}
function _gb2mEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/** The museum, drawn into el: the wings, the keeper, the cases, and what you could give. */
function gardenMuseumTab(el, m) {
  _gb2m.el = el; el.textContent = '';
  const here = gardenMuseumHere(), rows = here.rows, W = gardenMuseumWing(_gb2m.wing) || GB2_WINGS[0];
  const root = el.appendChild(_gb2mEl('div', 'gmu' + (here.visit ? ' is-visit' : '')));
  // the wings, with how full each is
  const tabs = root.appendChild(_gb2mEl('div', 'gmu-tabs')); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'The museum’s wings');
  for (const R of GB2_WINGS) {
    const all = gardenMuseumIds(R.id).length, n = _gb2mWingN(rows, R.id), b = tabs.appendChild(_gb2mEl('button', 'gmu-tab' + (n >= all && all ? ' is-done' : '') + (n ? '' : ' is-shut')));
    b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(R.id === W.id)); b.dataset.tab = 'gmu-' + R.id;
    b.innerHTML = `${icon(R.icon === 'bone' ? 'landmark' : R.icon)}<span class="gmu-tab-t"><b></b><small>${n} of ${all}</small></span><i class="gmu-tab-bar" style="--f:${all ? (n / all).toFixed(3) : 0}"></i>`;
    b.querySelector('b').textContent = R.short;
    b.setAttribute('aria-label', `${R.name}: ${n} of ${all} on show${n ? '' : '. It opens with its first piece'}`);
    b.onclick = () => { _gb2m.wing = R.id; _gb2m.page = 0; _gb2m.pick = ''; _gb2m.say = null; try { gardenSfx('tab'); } catch (e) { /* quiet */ } _gb2mRepaint(); };
  }
  const body = root.appendChild(_gb2mEl('div', 'gmu-body'));
  _gb2mGuide(body, W, here, rows);
  _gb2mHall(body, W, here, rows);
  _gb2mGiveStrip(root, W, here, rows);
  _gb2mFoot(root, here, rows);
}
/** The keeper of this wing, in an arched niche, saying a line: welcome, thank you, or about the piece you chose. */
function _gb2mGuide(body, W, here, rows) {
  const g = body.appendChild(_gb2mEl('aside', 'gmu-guide'));
  const who = W.keeper, top = typeof gardenCastTop === 'function' ? gardenCastTop(who) : 54;
  let art = ''; try { art = typeof gardenCastSvg === 'function' ? gardenCastSvg(who, {}) : ''; } catch (e) { art = ''; }
  const niche = g.appendChild(_gb2mEl('div', 'gmu-niche'));
  niche.innerHTML = art ? `<svg class="gmu-keeper" viewBox="-36 ${-top - 8} 72 ${top + 14}" aria-hidden="true" focusable="false"><ellipse cx="0" cy="2" rx="22" ry="4" fill="#2a1e14" opacity=".25"/>${art}</svg>` : `<span class="gmu-face">${esc(String(_gb2mWho(who)).slice(0, 1))}</span>`;
  g.appendChild(_gb2mEl('b', 'gmu-who', _gb2mWho(who)));
  g.appendChild(_gb2mEl('small', 'gmu-role', 'Keeper of ' + W.name.replace(/^The /, 'the ')));
  const say = g.appendChild(_gb2mEl('div', 'gmu-say')); say.setAttribute('aria-live', 'polite');
  let lines = [];
  const S = _gb2m.say;
  if (S && S.who === who) lines = S.lines;
  else if (_gb2m.pick && rows.has(_gb2m.pick) && _gb2m.pick.charAt(0) === W.id) { const r = rows.get(_gb2m.pick), fact = _gb2mFact(r.w, r.id); lines = [gardenMuseumName(r.w, r.id) + '.', fact || 'One of the vale’s own.']; }
  else if (_gb2m.pick && _gb2m.pick.charAt(0) === W.id) lines = [here.visit ? 'Not in this museum yet.' : 'Not in the museum yet. Bring me one and I’ll find it a place.'];
  else if (here.visit) lines = [`This is ${here.first}’s museum. Have a look round.`, here.can ? `Give ${here.first}’s museum something it hasn’t got, and the label will say your name.` : here.live ? 'Their museum is older than yours: it can be looked at, not given to.' : 'Come back while they are in their garden to give them something.'];
  else lines = [(GB2_KEEPER_SAYS[who] || {}).hi || 'Welcome to the museum.'];
  if (_gb2m.from === 'lake-hall' && !S && !_gb2m.pick && !here.visit) lines = lines.concat(['The lake hall is part of the museum now. Everything you gave it is on show in here.']);
  lines.forEach((t, i) => say.appendChild(_gb2mEl('p', i === 0 ? 'gmu-say-a' : 'gmu-say-b', t)));
  if (S && S.fresh) { S.fresh = false; say.classList.add('is-new'); }
}
function _gb2mWho(id) { if (typeof GJ_WHO !== 'undefined' && GJ_WHO[id]) return GJ_WHO[id]; try { const r = VALE_FOLK_ROW.get(id); if (r) return r.name; } catch (e) { /* plain */ } return String(id || ''); }
/** The wing's cases, a page at a time: what is on show, and an outline for each piece still missing. */
function _gb2mHall(body, W, here, rows) {
  const hall = body.appendChild(_gb2mEl('section', 'gmu-hall gmu-case-' + W.case)); hall.setAttribute('aria-label', W.name);
  const head = hall.appendChild(_gb2mEl('div', 'gmu-hall-h'));
  head.appendChild(_gb2mEl('h3', null, W.name));
  head.appendChild(_gb2mEl('p', null, W.blurb));
  const ids = gardenMuseumIds(W.id), pages = Math.max(1, Math.ceil(ids.length / GMU_PAGE)); _gb2m.page = Math.max(0, Math.min(pages - 1, _gb2m.page));
  const grid = hall.appendChild(_gb2mEl('div', 'gmu-grid'));
  const book = W.id === 'f' ? _gdG().fl : W.id === 'b' ? _gdG().bl : null;
  if (W.id === 'o') _gb2mSkeletons(grid, rows);
  ids.slice(_gb2m.page * GMU_PAGE, (_gb2m.page + 1) * GMU_PAGE).forEach((id, i) => {
    const key = W.id + '.' + id, r = rows.get(key), no = _gb2m.page * GMU_PAGE + i + 1, b = grid.appendChild(_gb2mEl('button', 'gmu-ex' + (r ? ' is-on' : ' is-empty') + (_gb2m.pick === key ? ' is-pick' : '') + (_gb2m.say && _gb2m.say.key === key ? ' is-new' : '')));
    b.type = 'button'; b.dataset.id = 'gmu-' + key;
    const name = gardenMuseumName(W.id, id), def = _gb2mDef(W.id, id), known = !!(book && book[id]) || (W.keep && gardenHas(W.item + ':' + id) > 0);
    if (r) {
      const size = W.id === 'f' && r.cm ? `${Math.round(r.cm)} cm` : '', by = r.by === 'you' ? 'Given by you' : r.by === 'friend' ? 'Given by a friend' : r.by ? 'Given by ' + (typeof _gscFirst === 'function' ? _gscFirst(r.by) : 'a friend') : here.visit ? '' : 'Given by you';
      const day = r.d && typeof _gjDay === 'function' ? _gjDay(r.d) : '';
      b.innerHTML = `<span class="gmu-case">${_gb2mCase(W, id, r)}</span><span class="gmu-plate"><b></b><small></small></span>`;
      b.querySelector('b').textContent = name;
      b.querySelector('small').textContent = [size, by + (day && !here.visit ? ' · ' + day : '')].filter(Boolean).join(' · ');
      b.setAttribute('aria-label', `${name}${size ? ', ' + size : ''}. ${by}${day ? ', ' + day : ''}`);
    } else {
      b.innerHTML = `<span class="gmu-case gmu-outline">${known && W.id !== 'o' && W.id !== 'c' ? `<span class="gmu-sil">${gardenMuseumArt(W.id, id, 54, { sil: true })}</span>` : '<span class="gmu-q">?</span>'}</span><span class="gmu-plate"><b></b><small></small></span>`;
      b.querySelector('b').textContent = known ? name : (def && def.legend ? 'A legend' : 'No. ' + no);
      b.querySelector('small').textContent = known ? (here.visit ? 'Not here yet' : 'You have found one: bring it in') : 'Not found yet';
      b.setAttribute('aria-label', known ? `${name}: not in the museum yet` : 'An empty place: not found yet');
    }
    b.onclick = () => { _gb2m.pick = key; _gb2m.say = null; try { gardenSfx('tab'); } catch (e) { /* quiet */ } _gb2mRepaint(); };
  });
  if (pages > 1) {
    const pg = hall.appendChild(_gb2mEl('div', 'gmu-pager')), prev = pg.appendChild(_gb2mEl('button', 'gmu-pg')), at = pg.appendChild(_gb2mEl('span', 'gmu-pgat', `${_gb2m.page + 1} of ${pages}`)), next = pg.appendChild(_gb2mEl('button', 'gmu-pg'));
    prev.type = next.type = 'button'; prev.innerHTML = icon('chevron-left'); next.innerHTML = icon('chevron-right'); prev.setAttribute('aria-label', 'Previous room'); next.setAttribute('aria-label', 'Next room');
    prev.dataset.id = 'gmu-prev'; next.dataset.id = 'gmu-next'; prev.disabled = _gb2m.page === 0; next.disabled = _gb2m.page >= pages - 1; void at;
    prev.onclick = () => { _gb2m.page--; _gb2m.pick = ''; _gb2mRepaint(); }; next.onclick = () => { _gb2m.page++; _gb2m.pick = ''; _gb2mRepaint(); };
  }
}
/** One exhibit in its case: a tank of water with gravel and weed (it swims), a glass dome on a stand, a stone plinth, a framed shelf. */
function _gb2mCase(W, id, r) {
  const art = gardenMuseumArt(W.id, id, W.id === 'f' ? 58 : 50);
  if (W.case === 'tank') { const d = _gb2mDef('f', id), deep = d && d.home && (d.home.sea || /tarn|deep|grotto/.test(String(d.home.w || ''))); return `<svg class="gmu-tankbg" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="gmuw${deep ? 'd' : 's'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep ? '#5f97ae' : '#8cc6c0'}"/><stop offset="1" stop-color="${deep ? '#24506a' : '#3f7f7a'}"/></linearGradient></defs><rect x="0" y="0" width="100" height="70" fill="url(#gmuw${deep ? 'd' : 's'})"/><path d="M0 7h100" stroke="#e8fbf6" stroke-width="1.2" opacity=".55"/><path d="M14 0l-8 70M40 0l-6 70M70 0l-10 70" stroke="#ffffff" stroke-width="6" opacity=".05"/><path d="M0 62q20 -5 40 -1t60 -2v11h-100z" fill="#c8b48a"/><path d="M0 64q25 -3 50 0t50 -1" stroke="#a8925e" stroke-width="1" fill="none"/>${[8, 22, 37, 55, 71, 88].map((x, i) => `<circle cx="${x}" cy="${66 - (i % 2)}" r="${1.4 + (i % 3) * .5}" fill="${i % 2 ? '#8a7a5a' : '#e8dcc0'}"/>`).join('')}<path class="gmu-weed" d="M84 64q-6 -14 2 -26q6 -10 0 -22" stroke="#4f8a4a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path class="gmu-weed is-b" d="M12 64q4 -10 -2 -20" stroke="#6aa058" stroke-width="2" fill="none" stroke-linecap="round"/></svg><span class="gmu-swim">${art}</span><i class="gmu-bub"></i><i class="gmu-bub is-b"></i>`; }
  if (W.case === 'jar') return `<svg class="gmu-jarbg" viewBox="0 0 100 70" aria-hidden="true"><path d="M50 66v-6" stroke="#7a5a36" stroke-width="3"/><path d="M40 60q10 -18 16 -34M56 40q8 -4 10 -12" stroke="#6a4a2a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M66 28q6 -2 8 2q-4 4 -8 -2z" fill="#6aa058"/><path d="M44 46q-6 -2 -8 2q4 4 8 -2z" fill="#82b468"/></svg><span class="gmu-perch">${art}</span><svg class="gmu-jarglass" viewBox="0 0 100 70" aria-hidden="true"><path d="M22 66v-36q0 -26 28 -26t28 26v36z" fill="#e8f4f2" fill-opacity=".14" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.4"/><path d="M30 56v-26q0 -16 14 -20" stroke="#ffffff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/><rect x="16" y="64" width="68" height="6" rx="2" fill="#8a5a34"/><rect x="16" y="64" width="68" height="1.6" fill="#b88a5a"/></svg>`;
  if (W.case === 'plinth') return `<span class="gmu-on">${art}</span><svg class="gmu-plinthbg" viewBox="0 0 100 26" aria-hidden="true"><rect x="22" y="2" width="56" height="5" rx="1.4" fill="#d6cfbc"/><rect x="26" y="7" width="48" height="15" fill="#c3baa4"/><rect x="26" y="7" width="12" height="15" fill="#d6cfbc" opacity=".6"/><rect x="62" y="7" width="12" height="15" fill="#a39b85" opacity=".7"/><rect x="20" y="21" width="60" height="5" rx="1.4" fill="#b3aa94"/></svg>`;
  return `<span class="gmu-frame"><span class="gmu-felt">${art}</span></span>`;
}
/** A whole skeleton, all four pieces on show, stands up assembled at the front of the Stone Gallery. */
function _gb2mSkeletons(grid, rows) {
  if (typeof GP_FOSSILS === 'undefined') return;
  for (const F of GP_FOSSILS) {
    if (!F.parts.every(P => rows.has('o.' + F.id + '-' + P[0]))) continue;
    const b = grid.appendChild(_gb2mEl('div', 'gmu-ex gmu-skel is-on')); b.setAttribute('role', 'img'); b.setAttribute('aria-label', `The ${F.name.toLowerCase()} skeleton, standing whole`);
    let art = ''; try { art = gardenDecor('play-fos-' + F.id) ? gardenIconSvg('play-fos-' + F.id, { kind: 'decor', px: 120 }) : ''; } catch (e) { art = ''; }
    if (!art) art = F.parts.map(P => _gb2mBone(F.id + '-' + P[0], 40)).join('');
    b.innerHTML = `<span class="gmu-case gmu-skelcase">${art}</span><span class="gmu-plate"><b></b><small>The whole skeleton</small></span>`;
    b.querySelector('b').textContent = F.name;
  }
}
/** What you could give: from your pockets first, then from home (Perpetua brings it over). */
function _gb2mGiveStrip(root, W, here, rows) {
  const box = root.appendChild(_gb2mEl('section', 'gmu-give')), h = box.appendChild(_gb2mEl('h4'));
  const list = _gb2mCanGive(rows, here);
  if (here.visit && !here.can) { h.textContent = 'From your pockets'; box.appendChild(_gb2mEl('p', 'gmu-none', here.live ? 'This museum can be looked at, not given to: your friend’s app is older than yours.' : `Come back while ${here.first} is in their garden to give something.`)); return; }
  h.textContent = here.visit ? `Give ${here.first}’s museum something new` : 'New for the museum';
  if (!list.length) { box.appendChild(_gb2mEl('p', 'gmu-none', here.visit ? 'Nothing you carry is new for this museum.' : 'Nothing you have is new for the museum. Catch, net and dig, and bring what you find.')); return; }
  const row = box.appendChild(_gb2mEl('div', 'gmu-chips'));
  // this wing's first, then the rest
  list.sort((a, b) => (a.w === W.id ? 0 : 1) - (b.w === W.id ? 0 : 1) || (a.home ? 1 : 0) - (b.home ? 1 : 0));
  for (const x of list.slice(0, 18)) {
    const b = row.appendChild(_gb2mEl('button', 'gmu-chip' + (x.home ? ' is-home' : ''))); b.type = 'button'; b.dataset.id = 'gmu-give-' + x.key;
    b.innerHTML = `<span class="gmu-chip-art">${gardenMuseumArt(x.w, x.id, 34)}</span><span class="gmu-chip-t"><b></b><small></small></span><span class="gmu-chip-go">${icon('gift')}<span>Give</span></span>`;
    b.querySelector('b').textContent = x.name; b.querySelector('small').textContent = x.home ? 'At home: Perpetua brings it' : (gardenMuseumWing(x.w) || {}).short || '';
    b.setAttribute('aria-label', `Give the ${x.name.toLowerCase()} to the museum${x.home ? ' (it is at home: Perpetua brings it over)' : ''}`);
    b.onclick = () => {
      const r = gardenMuseumGive(x.item, { quiet: true });
      if (!r || r.ok === false) { gameDenyOf(r || _gdNo('That did not work. Try again.'), b); return; }
      try { gardenSfx('catch', { rare: true }); } catch (e) { /* quiet */ }
      try { gameCheer(b, { text: '+' + GB2_MUSEUM.xp + ' XP', tone: 'xp' }); } catch (e) { /* fine */ }
      if (!here.visit) _gb2mRepaint();
    };
  }
  if (list.length > 18) box.appendChild(_gb2mEl('p', 'gmu-more', `And ${list.length - 18} more.`));
}
/** Everything you have that this museum has not: [{ key, w, id, item, name, home }]. In a friend's museum: only what is in your pockets. */
function _gb2mCanGive(rows, here) {
  const out = [], seen = new Set();
  let v = null; try { v = gardenB2On() ? gardenB2View() : null; } catch (e) { v = null; }
  const pocket = new Set(v ? v.slots.filter(Boolean).map(s => s.i) : []);
  const consider = (item, home) => { const key = gardenMuseumKeyOf(item); if (!key || seen.has(key) || rows.has(key)) return; const w = key.charAt(0), id = key.slice(2); if (w === 'f') { const d = _gb2mDef('f', id); if (!d || d.cat !== 'fish') return; } seen.add(key); out.push({ key, w, id, item, name: gardenMuseumName(w, id), home }); };
  for (const it of pocket) consider(it, false);
  if (!here.visit) { const items = gardenWallet().items, kept = gardenB2Kept(); for (const k in items) if (Math.floor(Number(items[k]) || 0) - (kept[k] || 0) > 0) consider(k, true); }
  return out;
}
function _gb2mFoot(root, here, rows) {
  const n = rows.size, foot = root.appendChild(_gb2mEl('div', 'gmu-foot'));
  const next = GB2_MUSEUM.steps.find(S => S.at > n);
  foot.appendChild(_gb2mEl('b', null, `${n} on show`));
  if (!here.visit && next) foot.appendChild(_gb2mEl('span', null, `${next.at - n} more and ${_gb2mWho(next.who)} has a present for you.`));
  else if (!here.visit) foot.appendChild(_gb2mEl('span', null, 'Every milestone reached. The vale is proud of you.'));
}

/* ---------- doors, clicks and the E prompt: any thing of the kind `museum` ---------- */
function _gb2mIsMuseum(t) { try { const k = t && (t.kind && GARDEN_KINDS[t.kind] ? t.kind : gardenKindOf({ id: t.id, art: t.art || t.kind })); return !!(k && GARDEN_KINDS[k] && GARDEN_KINDS[k].museum); } catch (e) { return false; } }
/** A building's door (94-garden-world-0walk.js _gwOpenProp): a museum's opens the museum. A land feature keeps its own bubble. */
function gardenB2OpenProp(p) {
  if (!p) return false;
  if (p.b2museum) return gardenMuseumOpen({ from: p.id });
  if (p.act === 'lf' || !_gb2mIsMuseum({ id: p.id, art: p.kind })) return false;
  return gardenMuseumOpen({ from: p.id, wing: p.act === 'hall' ? 'f' : '' });
}
/** A click on a museum placed through layout data: a prop to walk to (its door in front of its middle), then in. */
function gardenB2PropAt(id) {
  if (!id || typeof gardenAffordThings !== 'function') return null;
  const t = gardenAffordThings().find(q => q.id === id && q.src === 'thing'); if (!t || !_gb2mIsMuseum(t)) return null;
  const w = t.w || 1, h = t.h || 1;
  return { id: t.id, b2museum: true, act: 'b2museum', name: 'The Vale Museum', x: t.x - w / 2, y: t.y - h, w, h, door: { x: Math.floor(t.x), y: Math.floor(t.y) } };
}
/** The E prompt at any museum's door: "Go into the museum". */
function gardenMuseumActRows(px, py, rows) {
  if (typeof gardenAffordThings !== 'function') return;
  for (const t of gardenAffordThings()) {
    if (!_gb2mIsMuseum(t) || t.src === 'decor') continue;
    const dx = t.x - px, dy = (t.y + 0.25 - py) * 1.3; if (Math.hypot(dx, dy) > GA_REACH) continue;
    const name = String(t.name || 'the museum'), words = 'Go into the ' + name.replace(/^the /i, '');   // 'Go into the lake hall', 'Go into the Little museum', 'Go into the Vale Museum'
    rows.push({ key: 'b2mu:' + t.src + ':' + t.id, act: 'b2-museum', b2: () => gardenMuseumOpen({ from: t.id, wing: /hall/.test(t.id) ? 'f' : '' }), words, name, x: t.x, y: t.y + 0.25, src: 'b2mu:' + t.id, promptY: t.y - 1.4, thing: t });
  }
}

/* ---------- the Field Journal: a stamp, and since when ---------- */
function gardenMuseumCardMark(c, kind, id) {
  if (!c || (kind !== 'fish' && kind !== 'bug')) return;
  const here = gardenMuseumHere(); if (here.visit) return;
  const r = here.rows.get((kind === 'bug' ? 'b.' : 'f.') + id); if (!r) return;
  const s = document.createElement('span'); s.className = 'gmu-jstamp'; s.title = 'In the museum'; s.innerHTML = icon('landmark'); c.appendChild(s);
}
function gardenMuseumEntryMark(dl, kind, id) {
  if (!dl || (kind !== 'fish' && kind !== 'bug')) return;
  const here = gardenMuseumHere(); if (here.visit) return;
  const r = here.rows.get((kind === 'bug' ? 'b.' : 'f.') + id);
  dl.appendChild(_gb2mEl('dt', null, 'Museum')); dl.appendChild(_gb2mEl('dd', null, r ? (r.d && typeof _gjDay === 'function' ? 'On show since ' + _gjDay(r.d) : 'On show') : 'Not given yet'));
}

/* ---------- friends: giving to a friend's museum, live ---------- */
/** On a visit: ask the host's page to put it in their museum. Your one is held until they say yes (then it is theirs), or comes back. */
function gardenB2VisitDonate(item) {
  const here = gardenMuseumHere(), key = gardenMuseumKeyOf(item);
  if (!here.visit) return _gdNo('You are at home');
  if (!here.can) return _gdNo(here.live ? 'Their museum can be looked at, not given to: their app is older than yours.' : 'Come back while they are in their garden.');
  if (!key) return _gdNo('The museum does not take that');
  const w = key.charAt(0), id = key.slice(2), W = gardenMuseumWing(w), name = gardenMuseumName(w, id);
  if (here.rows.has(key)) return _gdNo(gardenMuseumHave(W.keeper, name, _gb2mProper(w, id)));
  let pay = W.item + ':' + id;
  if (w === 'f') { pay = [0, 1, 2, 3].map(q => gardenFishKey(id, q)).find(k => gardenHas(k) > 0) || ''; }
  if (!pay || gardenHas(pay) < 1) return _gdNo(`You have no ${name.toLowerCase()} with you.`);
  let cm = 0; try { if (w === 'f') { const s = gardenSpecShown('fish', id); cm = s ? Math.round(Number(s.c) || 0) : 0; } } catch (e) { cm = 0; }
  const q = w === 'f' ? ((gardenFishParse(pay) || {}).q || 0) : 0;
  _gb2m.pending = { key, w, id, name, fid: here.fid };
  const r = _gdvDo('donate', { k: W.item, item: id, u: Math.max(0, Math.min(400, cm)) + '-' + q }, pay);
  if (r && r.ok !== false) { _gb2m.say = { who: W.keeper, lines: [`Off it goes to ${here.first}’s museum…`], key, fresh: true }; _gb2mRepaint(); }
  return r;
}
/** The host said yes (94-garden-live-2visit.js _glvResult): remember it was yours, take the XP, and the keeper thanks you. */
function gardenB2VisitDone(b, P) {
  if (!b || b.t !== 'donate' || !P || !P.f) return;
  const W = GB2_WINGS.find(x => x.item === P.f.k); if (!W) return;
  const key = W.id + '.' + P.f.item, g = _gdG(), fid = String((typeof _glv !== 'undefined' && _glv.fid) || (_gb2m.pending && _gb2m.pending.fid) || '');
  const p = g.prefs.b2 && typeof g.prefs.b2 === 'object' ? g.prefs.b2 : (g.prefs.b2 = {}), gave = p.gave && typeof p.gave === 'object' ? p.gave : (p.gave = {});
  if (fid) { const list = Array.isArray(gave[fid]) ? gave[fid].slice(-200) : []; if (!list.includes(key)) list.push(key); gave[fid] = list; }
  g.led['mu.v.' + (b.i || _gdUid(''))] = { d: _gdToday(), k: 'mu', x: GB2_MUSEUM.xp, i: {}, n: 1 };
  const name = gardenMuseumName(W.id, P.f.item), fact = _gb2mFact(W.id, P.f.item), first = typeof _gscFirst === 'function' && fid ? _gscFirst(fid) : 'your friend';
  _gb2m.say = { who: W.keeper, lines: [`${gardenMuseumThanks(W.keeper, name, ++_gb2m.give, _gb2mProper(W.id, P.f.item))} It says “Given by you” on the label in ${first}’s museum.`].concat(fact ? [fact] : []), key, fresh: true };
  try { _gdSave(); } catch (e) { /* saved with the next change */ }
  try { gardenMessage(`You gave ${first}’s museum ${gardenMuseumA(name, _gb2mProper(W.id, P.f.item))}. +${GB2_MUSEUM.xp} XP`, { icon: 'landmark', ms: 5000 }); } catch (e) { /* quiet */ }
  _gb2mRepaint();
}
/** On the host's page: a friend's gift to this museum. '' when done (written with whose it was), else why not. */
function gardenB2HostIntent(ev, put) {
  if (!ev || ev.t !== 'donate') return 'kind';
  const W = GB2_WINGS.find(x => x.item === ev.k); if (!W) return 'gift';
  const id = String(ev.item || ''), key = W.id + '.' + id; if (!gardenMuseumIds(W.id).includes(id)) return 'gift';
  if (gardenMuseumHas(key)) return 'have';
  const g = _gdG(), today = _gdToday(), mark = _gdMark([['mu', key]]), m = /^(\d{1,3})-([0-3])$/.exec(String(ev.u || ''));
  const rec = { d: today, by: String(ev.f || '') };
  if (W.id === 'f' && m) { const cm = Number(m[1]); if (cm > 0) rec.cm = Math.min(400, cm); rec.q = Number(m[2]); }
  g.mu[key] = rec; _gb2m.rev++;
  if (W.id === 'f' || W.id === 'b') { const c = _gca(), hall = c.hall && typeof c.hall === 'object' ? c.hall : (c.hall = { f: {}, b: {} }); hall[W.id] = hall[W.id] || {}; if (!hall[W.id][id]) hall[W.id][id] = today; }
  const name = gardenMuseumName(W.id, id), who = typeof _gscFirst === 'function' ? _gscFirst(ev.f) : 'A friend';
  setTimeout(() => { try { gardenMessage(`${who} gave your museum ${gardenMuseumA(name, _gb2mProper(W.id, id))}!`, { icon: 'landmark', ms: 6000 }); } catch (e) { /* quiet */ } try { gardenCatchShowSoon(); } catch (e) { /* later */ } _gb2mRepaint(); }, 0);
  return put(mark, { noUndo: true, k: ev.k, item: id });
}
/** The host's diary (94-garden-live-3host.js _glhDiaryWhat). */
function gardenB2DiaryWhat(e, n, who) {
  if (!e || e.t !== 'donate') return '';
  const W = GB2_WINGS.find(x => x.item === e.k), name = W ? gardenMuseumName(W.id, e.item) : 'something';
  return n > 1 ? `${who} gave your museum ${n} things` : `${who} gave your museum ${gardenMuseumA(name, W ? _gb2mProper(W.id, e.item) : false)}`;
}
/** A visit's act (94-garden-visit-0world.js gardenVisitAct): giving is asked through gardenB2VisitDonate. */
function gardenB2VisitAct(t, a) { if (t !== 'donate' || !a) return null; return gardenB2VisitDonate(a.item); }
