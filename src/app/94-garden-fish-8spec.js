/* ============================================================
   GARDEN, EVERY CATCH IS ONE OF A KIND: THE SPECIMENS (docs/dev/GARDEN_TOGETHER.md section 23). The owner, 1 Nov 2026: "make every fish caught unique with its own size etc".
   The bag stays as it was: fish:<id>-<q> and bug:<id>, what trades, gifts and the market use. A specimen is a record beside it, kept in the garden's state and synced like the rest, entry by entry:

     state.garden.sp   {key: {k: 'f'|'b', i: id, v?: variant, c: cm (a bug: mm), g: grams (a bug: mg), q, d: day, z?: where (a zone or a bug's home), p?: the friend whose garden it was, w?: [friend ids there], n: serial, s?: 1 it has left your bag}}
     state.garden.vl   {variantId: {n, d (first day), l (last day), i (the first kind it was on)}}: what you have found. Never trimmed, so progress never goes backwards
     state.garden.prefs.showSp  {f: {fishId: key}, b: {bugId: key}}: which one of a kind stands in your showcase

   Friend ids in `p` and `w` stay here: only ids (their names are looked up when shown), and they never go in the snapshot. Selling or giving something changes the bag, not the record. Past GARDEN_SPEC.max the lowest-scoring go
   (a pinned one and the newest few never do); the fish log and `vl` keep the counts. A record of nothing is never made for a contest fish: those are let go.
   ============================================================ */
const GARDEN_SPEC = Object.freeze({ max: 300, slack: 20, keepNew: 20 });
const _GSP_FISH_K = Object.freeze({ slim: 0.009, round: 0.02, flat: 0.018, carp: 0.016, koi: 0.015, eel: 0.002, pike: 0.005, sturgeon: 0.006, cat: 0.01, crayfish: 0.012 });
const _GSP_BUG_MM = Object.freeze({ butterfly: 55, moth: 45, bee: 14, beetle: 18, stag: 40, dragonfly: 60, firefly: 12, cicada: 32 });
const _GSP_RANK = Object.freeze({ common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 });

function gardenSpecRows() { return Object.entries(_gdG().sp).filter(([, r]) => r && typeof r === 'object').map(([key, r]) => Object.assign({ key }, r)); }
function _gspDef(r) { return r.k === 'b' ? gardenBugDef(r.i) : gardenFishDef(r.i); }
/** How good it is: variant first, then how rare the kind, how big for its kind, how fine. */
function gardenSpecScore(r) {
  const d = _gspDef(r), span = d && d.cm ? Math.max(1, d.cm[1] - d.cm[0]) : 1, size = d && d.cm ? Math.max(0, Math.min(1.5, (Number(r.c) - d.cm[0]) / span)) : 0.5;
  return gardenVariantRank(r.v) * 1000 + (d ? (_GSP_RANK[d.rarity] || 0) : 0) * 100 + size * 40 + (Number(r.q) || 0) * 10;
}
function _gspCompany() {
  const out = { p: '', w: [] };
  if (typeof _gll === 'undefined' || !_gll || !_gll.role) return out;
  const re = /^[0-9a-f]{16}$/, w = new Set(), live = typeof _glvLive === 'function' && _glvLive();
  if (_gll.role === 'visit' && typeof _glv !== 'undefined' && re.test(String(_glv.fid || ''))) { out.p = _glv.fid; if (live) w.add(_glv.fid); }
  if (_gll.role === 'host' || live) for (const A of _gll.actors.values()) if (A && re.test(String(A.f || ''))) w.add(A.f);
  out.w = [...w].slice(0, 4);
  return out;
}
function _gspSerial(g) {
  let top = 0; for (const r of Object.values(g.sp)) if (r && Number(r.n) > top) top = Number(r.n);
  let n = 0; try { const w = gardenWallet(); n = (Number(w.n.fished) || 0) + (Number(w.n.netted) || 0); } catch (e) { n = 0; }
  return Math.max(top, n) + 1;
}
/** Record what was just caught. kind 'fish' | 'bug', def, o: {v, cm, q, z, day, rnd}. -> {key, rec, newVariant}. */
function gardenSpecAdd(kind, def, o) {
  const g = _gdG(), rnd = o.rnd || Math.random, day = o.day || _gdToday(), V = o.v ? gardenVariantFor(kind, def, o.v) : null, fat = (V && V.fat) || 1;   // clock-ok: luck, not a date
  const rec = { k: kind === 'bug' ? 'b' : 'f', i: def.id, q: Math.max(0, Math.min(3, Math.floor(Number(o.q) || 0))), d: day, n: _gspSerial(g) };
  if (kind === 'fish') {
    rec.c = Math.max(1, Math.min(400, Math.round(Number(o.cm) || def.cm[0])));
    rec.g = Math.max(1, Math.min(1e7, Math.round((_GSP_FISH_K[def.look && def.look.s] || 0.012) * Math.pow(rec.c, 3) * (0.85 + rnd() * 0.3) * fat)));
  } else {
    const s = V && V.size ? V.size[0] + rnd() * (V.size[1] - V.size[0]) : 1;
    rec.c = Math.max(1, Math.min(999, Math.round((_GSP_BUG_MM[def.shape] || 20) * (Number(def.size) || 1) * (0.8 + rnd() * 0.4) * s)));
    rec.g = Math.max(1, Math.min(1e7, Math.round(0.12 * Math.pow(rec.c, 2.2) * fat)));
  }
  if (V) rec.v = V.id;
  if (o.z) rec.z = String(o.z).slice(0, 12);
  const co = _gspCompany(); if (co.p) rec.p = co.p; if (co.w.length) rec.w = co.w;
  const key = 'sp' + _gdUid('');
  g.sp[key] = rec;
  let newVariant = false;
  if (V) { const l = g.vl[V.id]; if (!l) { g.vl[V.id] = { n: 1, d: day, l: day, i: def.id }; newVariant = true; } else { l.n = (Number(l.n) || 0) + 1; l.l = day; } }
  _gspTrim(g);
  return { key, rec, newVariant };
}
function _gspPinned(g) {
  const p = g.prefs.showSp, out = new Set();
  if (p && typeof p === 'object') for (const m of [p.f, p.b]) if (m && typeof m === 'object') for (const k of Object.values(m)) out.add(k);
  return out;
}
/** Full: the lowest-scoring go, a batch at a time. A pinned one and the newest few stay. */
function _gspTrim(g) {
  const keys = Object.keys(g.sp); if (keys.length <= GARDEN_SPEC.max + GARDEN_SPEC.slack) return;
  const pin = _gspPinned(g), rows = gardenSpecRows();
  const fresh = new Set(rows.slice().sort((a, b) => (Number(b.n) || 0) - (Number(a.n) || 0)).slice(0, GARDEN_SPEC.keepNew).map(r => r.key));
  const drop = rows.filter(r => !pin.has(r.key) && !fresh.has(r.key)).sort((a, b) => gardenSpecScore(a) - gardenSpecScore(b)).slice(0, keys.length - GARDEN_SPEC.max);
  for (const r of drop) delete g.sp[r.key];
}
/** Bug quality: only a specimen has it (a bug in the bag is just a bug). A better net brings them in better. */
function gardenSpecBugQ(rnd, tier) {
  const r = rnd() - Math.max(0, (Number(tier) || 1) - 1) * 0.04;
  return r < 0.04 ? 3 : r < 0.16 ? 2 : r < 0.46 ? 1 : 0;
}
/** The chance roll for a bug about now: the same on every screen, from its key and the conditions there. */
function gardenSpecBugV(key, hab, m) {
  try { return gardenVariantRoll('bug', gardenVariantCtx(m, { hab }), gardenRand('gd-bugv|' + key)); } catch (e) { return ''; }
}

/* ---------- the conditions ---------- */
function _gspMoon(iso) {
  if (typeof gardenMoonPhase === 'function') { try { return gardenMoonPhase(iso); } catch (e) { /* worked out below */ } }
  const age = (((Date.parse(iso + 'T12:00:00Z') - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588 + 29.530588) % 29.530588;   // clock-ok: the moon's age from a known new moon, a pure sum on a day
  return age < 1.8 || age > 27.7 ? 'new' : age < 13 ? 'waxing' : age < 16.6 ? 'full' : 'waning';
}
/** What the one who decides knows when something spawns. o: {zone, hab, chum, frenzy}. */
function gardenVariantCtx(m, o) {
  o = o || {};
  return {
    tod: m.tod, season: m.season, rain: !!(m.rain && m.rain.now), snow: !!(m.rain && m.rain.snow), moon: _gspMoon(m.today), zone: o.zone || '', room: o.room || '', hab: o.hab || '', chum: !!o.chum, frenzy: !!o.frenzy,
    event: (id) => { try { return typeof gardenEventOn === 'function' && !!gardenEventOn(id); } catch (e) { return false; } },
    work: (id) => { try { return typeof gardenWorkOwned === 'function' && !!gardenWorkOwned(id); } catch (e) { return false; } },
  };
}
/** A fish that has just spawned: {v, cm}. Only a real fish can be one. */
function gardenVariantSpawn(def, cm, b, m, o) {
  if (!def || def.cat !== 'fish') return { v: '', cm };
  const v = gardenVariantRoll('fish', gardenVariantCtx(m, Object.assign({ zone: b && b.zone }, o)), Math.random);
  return v ? { v, cm: gardenVariantSize(def, cm, v, Math.random) } : { v: '', cm };
}
/** It bit: the plan gets its variant. A rarer one fights harder, and the words on the reel give it away. */
function gardenVariantBite(plan, f) {
  const V = gardenVariantFor('fish', f.def, f.v); plan.v = V ? V.id : ''; plan.vWords = '';
  if (!V) return;
  if (plan.diff && V.diff) plan.diff = Math.min(12, plan.diff + V.diff);
  const rank = gardenVariantRank(V);
  if (rank >= 3) plan.vWords = 'Something very strange is on your line!';
  else if (rank >= 2) plan.vWords = 'Something odd on your line…';
}

/* ---------- the market: a variant may sell for more, inside the market's daily limits ---------- */
/** Selling n of this bag item: the premium for the best specimens of it still in your bag. {extra, keys} (the caller adds extra to the total, so the daily limit still rules it, and marks keys). */
function gardenSpecSellExtra(item, n, each) {
  const fp = gardenFishParse(item), bug = String(item).startsWith('bug:') ? String(item).slice(4) : '';
  if (!fp && !bug) return { extra: 0, keys: [] };
  const rows = gardenSpecRows().filter(r => r.v && !r.s && (fp ? r.k === 'f' && r.i === fp.id && (Number(r.q) || 0) === fp.q : r.k === 'b' && r.i === bug)).sort((a, b) => gardenVariantRank(b.v) - gardenVariantRank(a.v)).slice(0, Math.max(0, n));
  let extra = 0; const keys = [];
  for (const r of rows) { const t = gardenVariantTier(r.v); if (!t) continue; extra += Math.round(each * (t.sell - 1)); keys.push(r.key); }
  return { extra, keys };
}
function gardenSpecMarkSold(keys) { const g = _gdG(); for (const k of keys) if (g.sp[k]) g.sp[k] = Object.assign({}, g.sp[k], { s: 1 }); }
/** The best variant of this bag item you still have (for its card in the bag), or null. */
function gardenSpecInBag(kind, r) {
  const best = gardenSpecRows().filter(x => x.v && !x.s && (kind === 'fish' ? x.k === 'f' && x.i === r.id && (Number(x.q) || 0) === (r.q || 0) : x.k === 'b' && x.i === r.id)).sort((a, b) => gardenVariantRank(b.v) - gardenVariantRank(a.v))[0];
  return best || null;
}

/* ---------- the showcase and what friends get ---------- */
/** Which one of this kind stands in the showcase: the one you chose, or your best. */
function gardenSpecShown(kind, id) {
  const g = _gdG(), k = kind === 'bug' ? 'b' : 'f', p = g.prefs.showSp, key = p && p[k] && p[k][id];
  if (key && g.sp[key]) return Object.assign({ key, pinned: true }, g.sp[key]);
  let best = null, bs = -1;
  for (const r of gardenSpecRows()) { if (r.k !== k || r.i !== id) continue; const s = gardenSpecScore(r); if (s > bs) { bs = s; best = r; } }
  return best;
}
/** "Show it off": this very one goes in the tank or the case. */
function gardenSpecPin(key) {
  const g = _gdG(), r = g.sp[key]; if (!r) return _gdNo('That catch is not in your records any more');
  const kind = r.k === 'b' ? 'bug' : 'fish', k = r.k, cur = gardenShowGet();
  if (!cur[k].includes(r.i)) { const t = gardenShowToggle(kind, r.i); if (!t.ok) return t; }
  const p = Object.assign({}, g.prefs.showSp); p[k] = Object.assign({}, p[k], { [r.i]: key });
  g.prefs.showSp = p; _gdSave(); _gdEmit('show', { kind, id: r.i });
  setTimeout(() => { try { if (_gll.role === 'host' && _glh.on && _glhAnyone()) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); } catch (e) { /* the next visit has it */ } }, 300);   // friends in the garden see it now (section 22)
  return { ok: true, msg: '' };
}
function gardenSpecIsPinned(key) { return _gspPinned(_gdG()).has(key) && (() => { const r = _gdG().sp[key]; return !!r && gardenShowGet()[r.k].includes(r.i); })(); }
/** What goes in the snapshot (only if you share your garden with that friend: it travels with it): your best few, how many variants, how many catches. Nothing about where, when or who with. */
function gardenSpecWire() {
  const g = _gdG(), rows = gardenSpecRows().map(r => [gardenSpecScore(r) + (_gspPinned(g).has(r.key) ? 5000 : 0), r]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const pick = (k, max) => rows.filter(r => r.k === k && _spOk(r)).slice(0, max).map(r => [r.i, r.v || '-', Math.max(1, Math.min(999, Number(r.c) || 1)), Math.max(0, Math.min(3, Number(r.q) || 0)), Math.max(0, Math.min(1e7, Number(r.n) || 0))]);
  const f = pick('f', GARDEN_SPEC_WIRE.fish), b = pick('b', GARDEN_SPEC_WIRE.bugs), vn = Object.keys(g.vl).filter(gardenVariantDef).length;
  if (!f.length && !b.length && !vn) return null;
  // (to the nearest ten: one more minnow is no reason to send a friend your garden again)
  let c = 0; try { const w = gardenWallet(); c = Math.floor(Math.max(0, Math.min(1e7, (Number(w.n.fished) || 0) + (Number(w.n.netted) || 0))) / 10) * 10; } catch (e) { c = 0; }
  return { f, b, vn, c };
}
function _spOk(r) { return !!_gspDef(r); }

/* ---------- the same, in words ---------- */
function gardenSpecName(kind, id, v) {
  const def = kind === 'bug' ? gardenBugDef(id) : gardenFishDef(id); if (!def) return '';
  const V = gardenVariantFor(kind, def, v), n = def.name.replace(/^the /i, '');
  return V ? `${V.name} ${n.toLowerCase()}` : n;
}
function gardenSpecSize(kind, c) {
  const n = Math.round(Number(c) || 0);
  return kind === 'bug' ? (n >= 100 ? (n / 10).toFixed(1) + ' cm' : n + ' mm') : n + ' cm';
}
function gardenSpecWeight(kind, g) {
  const n = Number(g) || 0;
  if (kind === 'bug') return n >= 1000 ? (n / 1000).toFixed(1) + ' g' : n + ' mg';
  return n >= 1000000 ? (n / 1000000).toFixed(2) + ' tonnes' : n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + ' kg' : n + ' g';
}
function gardenSpecWhere(r) {
  const bits = [];
  if (r.k === 'b') { const w = typeof _GV_HAB_WORDS !== 'undefined' ? _GV_HAB_WORDS[r.z] : ''; if (w) bits.push(w); }
  else if (r.z) { const z = (typeof GARDEN_FISH_ZONES !== 'undefined' && GARDEN_FISH_ZONES[r.z]) || null; if (z) bits.push('in ' + String(z.label).toLowerCase()); }
  if (r.p && typeof gardenSocialName === 'function') bits.push('in ' + String(gardenSocialName(r.p)).split(/\s+/)[0] + '’s garden');
  return bits.join(' ');
}
function gardenSpecWith(r) {
  if (!Array.isArray(r.w) || !r.w.length || typeof gardenSocialName !== 'function') return '';
  return 'with ' + r.w.map(id => String(gardenSocialName(id)).split(/\s+/)[0]).join(', ');
}
function gardenSpecDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); if (!m) return '';
  return `${Number(m[3])} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] || ''} ${m[1]}`;
}
function gardenSpecFound() { return Object.keys(_gdG().vl).filter(gardenVariantDef).length; }

/* ---------- the board: who among your friends has the rarest and the biggest ---------- */
/** Only what friends already share: the `sp` of each garden you can see. There is no central server, so this is everyone this computer has heard from. -> {people, rarest, biggest, most}. */
function gardenSpecBoard() {
  const view = typeof gardenSocialView === 'function' ? gardenSocialView() : null, gardens = (view && view.gardens) || {}, people = [];
  const mine = gardenSpecClean(gardenSpecWire());
  people.push({ id: '', me: true, name: 'You', sp: mine || { f: [], b: [], vn: 0, c: 0 } });
  for (const f of typeof _gscFriendList === 'function' ? _gscFriendList() : []) {
    const g = gardens[f.id], sp = g && g.snap ? gardenSpecClean(g.snap.sp) : null;
    people.push({ id: f.id, me: false, name: typeof gardenSocialName === 'function' ? gardenSocialName(f.id) : 'A friend', sp });
  }
  const top = (p) => {
    if (!p.sp) return null;
    let best = null, bs = -1;
    for (const [list, k] of [[p.sp.f, 'fish'], [p.sp.b, 'bug']]) for (const x of list) { const s = gardenSpecScore({ k: k === 'bug' ? 'b' : 'f', i: x[0], v: x[1] === '-' ? '' : x[1], c: x[2], q: x[3] }); if (s > bs) { bs = s; best = { kind: k, id: x[0], v: x[1] === '-' ? '' : x[1], c: x[2], q: x[3], score: s }; } }
    return best;
  };
  const big = (p) => { if (!p.sp || !p.sp.f.length) return null; const x = p.sp.f.slice().sort((a, b) => b[2] - a[2])[0]; return { kind: 'fish', id: x[0], v: x[1] === '-' ? '' : x[1], c: x[2], q: x[3] }; };
  const on = people.filter(p => p.sp);
  return {
    people,
    rarest: on.map(p => ({ p, c: top(p) })).filter(x => x.c).sort((a, b) => b.c.score - a.c.score),
    biggest: on.map(p => ({ p, c: big(p) })).filter(x => x.c).sort((a, b) => b.c.c - a.c.c),
    most: on.filter(p => p.sp.vn).sort((a, b) => b.sp.vn - a.sp.vn),
    quiet: people.filter(p => !p.sp).length,
  };
}
