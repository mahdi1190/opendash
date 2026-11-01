/* ============================================================
   GARDEN, THE CATCHING OVERHAUL: THE ENGINE (docs/dev/CATCH_FEATURES.md). What you have on, what raises the odds, and everything a catch sets off.

   SAVES. Things you buy go through the ledger like everything else (gear:<id>, kit:<id>, bait:<id>, map:<map>-<n>, meal:smoked, decor:<id>), so two devices add up. Choices are in prefs (prefs.reel, line, hook).
   The rest is one small record, prefs.ca (synced with prefs, so the last device to write wins on it; nothing in it can make coins):
     sd the lake's own number, setups [{rod, reel, line, hook, bait, bobber}], stock {fishId: day it ends}, rl fish let go, nem {id, cm, at, d} the one that got away, nemDone,
     run, runDay a run of catches, job, jobDay, jobN the old angler's jobs, wb {w, cm} best this week for the poster, rec [[id, cm, friend id]] the lake's records, hall {f: {id: day}, b: {id: day}},
     th, thSlot sightings of the thing in the lake, ch chests found, fe rosettes, smk {at, n} the smoker, fed (time a meal wears off), sugar {uid, at}, pins [ids]
   And per day in fd[day]: rk the rack (best five, [[id, cm]]), sf {spot: time} spots fed, j {s: {spot: n}, lost, nem, ev: [events seen]} for the diary, fw weighed in.

   FRIENDS. gardenCatchWire() goes in the snapshot as `ca` (lib/friends/garden.mjs, gardenCatchWireClean): ids and numbers. gardenTackleLook adds to the look (`g`). What is on the screen on a visit comes from THEIR `ca` (gardenCatchHere).
   THE HOST DECIDES. _gfsRun asks gardenLineWhyNot and gardenLineKeen for a line, with the reel, line and hook from that person's look. gardenCatchSpawnPlan is asked by whoever runs the water.
   ============================================================ */
const GARDEN_CATCH_RULES = Object.freeze({ setups: 3, stockDays: 7, stockMax: 6, stockTimes: 3, knownTimes: 2.2, spotShare: 0.4, hotShare: 0.5, spotKeen: 1.25, fedKeen: 1.5, hotKeen: 1.3, fedMs: 3600000, runKeen: 0.04, runMax: 0.3, nemAfterMs: 1200000, nemChance: 0.3, legendChance: 0.15, mapChance: 1 / 14, smokeMs: 4 * 3600000, smokeMax: 3, mealMs: 30 * 60000, sugarMs: 2 * 3600000 });
function _gca() { const p = _gdG().prefs; if (!p.ca || typeof p.ca !== 'object' || Array.isArray(p.ca)) p.ca = {}; return p.ca; }
/** Your lake's own number: made once, and it never changes. */
function gardenLakeSeed() { const c = _gca(); if (!Number.isInteger(c.sd)) c.sd = Math.floor(Math.random() * 9999); return c.sd; }   // clock-ok: luck
function _gcaOnVisit() { return typeof gardenVisitOn === 'function' && gardenVisitOn(); }
const _gcaMemo = { at: -1e9, v: null };
/** What the lake shows to friends, ids and numbers. Asked by every snapshot and every repaint. */
function gardenCatchWire() {
  const t = performance.now(); if (_gcaMemo.v && t - _gcaMemo.at < 1200) return _gcaMemo.v;
  const c = _gca(), g = _gdG(), today = _gdToday(), fd = (g.fd[today] && typeof g.fd[today] === 'object') ? g.fd[today] : {}, hall = c.hall || {};
  const hf = Object.keys(hall.f || {}), hb = Object.keys(hall.b || {}), lim = (v, hi) => Math.max(0, Math.min(hi, Math.floor(Number(v) || 0)));
  const out = { sd: lim(gardenLakeSeed(), 9999), ha: lim(hf.length + hb.length, 999), sm: lim(gardenSmokerState(), 2), aj: lim(c.job, 99), fe: lim(c.fe, 99), rl: lim(c.rl, 999), th: lim(c.th, 99), ch: lim(c.ch, 9),
    hf: hf.slice(-24), hb: hb.slice(-12), st: Object.keys(gardenStockNow(today)).slice(0, 6), fd: Object.keys(gardenSpotsFed()).slice(0, 7),
    rk: (Array.isArray(fd.rk) ? fd.rk : []).slice(0, 5).map(r => [String(r[0]), Math.max(1, Math.min(400, Math.round(Number(r[1]) || 1)))]),
    rc: (Array.isArray(c.rec) ? c.rec : []).slice(0, 3).map(r => [String(r[0]), Math.max(1, Math.min(400, Math.round(Number(r[1]) || 1)))]) };
  const wk = _gdWeekFrom(today);
  if (c.wb && c.wb.w === wk) out.wb = [_gtDayNo(wk), lim(c.wb.cm, 400)];
  if (c.sugar) { const pl = g.plants[c.sugar.uid]; if (pl && Number.isInteger(pl.x) && Number.isInteger(pl.y)) out.sg = [lim(pl.x, 63), lim(pl.y, 63)]; }   // the tree you painted
  _gcaMemo.at = t; _gcaMemo.v = out;
  return out;
}
function _gcaDirty() { _gcaMemo.at = -1e9; }
/** The lake on screen: yours, or on a visit your friend's (from their snapshot). */
function gardenCatchHere() {
  if (_gcaOnVisit()) { const s = typeof _gdvSnap === 'function' ? _gdvSnap() : null; return (s && s.ca) || {}; }
  return gardenCatchWire();
}
/** After something friends can see has changed: whoever is in your garden gets a fresh copy, at most every 20 seconds. Keep messages few. */
let _gcaShowT = 0;
function gardenCatchShowSoon() {
  _gcaDirty();
  if (_gcaShowT) return;
  _gcaShowT = setTimeout(() => { _gcaShowT = 0; try { if (typeof _gll !== 'undefined' && _gll.role === 'host' && _glh.on && _glhAnyone()) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); } catch (e) { /* the next visit has it */ } }, 20000);
}

/* ---------- what you have on ---------- */
function _gcaWorn(kind) {
  const list = GARDEN_TACKLE_KINDS[kind], id = _gdG().prefs[kind], d = id && list.find(x => x.id === id);
  return d && gardenGearOwned(d.id) ? d : list[0];
}
function gardenTackleOwned(kind, id) { const d = gardenGearDef(id); return !!d && d.kind === kind && gardenGearOwned(id); }
const _gcaUse = { at: -1e9, v: null };
/** What is on your line now: {rod, reel, line, hook, bait, float}, all ids. Asked four times a second while a line is out. */
function gardenTackleInUse() {
  const t = performance.now(); if (_gcaUse.v && t - _gcaUse.at < 800) return _gcaUse.v;
  _gcaUse.at = t; _gcaUse.v = { rod: gardenRod().id, reel: _gcaWorn('reel').id, line: _gcaWorn('line').id, hook: _gcaWorn('hook').id, bait: gardenBait().id, float: gardenBobber().id };
  return _gcaUse.v;
}
function _gcaUseDirty() { _gcaUse.at = -1e9; if (typeof _gplGearMemo !== 'undefined') _gplGearMemo.at = -1e9; }
/** Someone else's, from the look they send. */
function gardenSetOfLook(g, bait) { return { rod: (g && g.r) || 'rod-1', reel: (g && g.rl) || 'reel-basic', line: (g && g.ln) || 'line-mono', hook: (g && g.hk) || 'hook-small', bait: bait || 'worm' }; }
/** The look's extra fields: only what is not the starter, so a look stays small. */
function gardenTackleLook(out) {
  const u = gardenTackleInUse(), c = _gca();
  if (u.reel !== 'reel-basic') out.rl = u.reel;
  if (u.line !== 'line-mono') out.ln = u.line;
  if (u.hook !== 'hook-small') out.hk = u.hook;
  if (gardenHas('gear:bug-lantern') > 0) { let dark = false; try { const t = gardenHere().tod; dark = t === 'night' || t === 'dusk'; } catch (e) { /* unlit */ } out.l = dark ? 2 : 1; }
  if (gardenHas('gear:bug-jar') > 0) { const fd = _gdG().fd[_gdToday()], n = fd && Number(fd.ff) || 0; out.j = Math.max(1, Math.min(9, n + 1)); }
  if (typeof _gw !== 'undefined' && _gw.boat) out.bt = 1;
  if (c.runDay === _gdToday() && (Number(c.run) || 0) >= 3) out.st = Math.min(99, Number(c.run));
  if (Number(c.fed) > _gdNow()) out.fd = 1;
  return out;
}
/** Buy a reel, a line, a hook or a bit of the bug kit. */
function gardenTackleBuy(d) {
  const m = gardenModel(), w = m.wallet, g = _gdG();
  if (!d.st || (!d.st.pack && !d.pack && gardenGearOwned(d.id))) return _gdNo('Yours already');
  if ((d.lv || 1) > m.level.level) return _gdNo('Garden level ' + d.lv);
  if (w.coins < d.price) return _gdNo(`That costs ${d.price} coins: you have ${w.coins}`);
  const lk = 'b.' + m.today + '.' + _gdUid(''), item = d.pack ? 'kit:' + d.id : 'gear:' + d.id, mark = _gdMark([['led', lk], ['prefs', d.kind]]);
  g.led[lk] = { d: m.today, k: 'b', c: _gdCost(d.price), i: { [item]: d.pack || 1 }, n: 1 };
  if (GARDEN_TACKLE_KINDS[d.kind]) g.prefs[d.kind] = d.id;   // the new one goes straight on
  _gcaUseDirty(); _gdEmit('buy', { item, n: d.pack || 1 });
  if (GARDEN_TACKLE_KINDS[d.kind]) gardenJobEvent({ kind: 'buy', tackle: d.kind });
  return _gdDone(`Bought the ${d.name.toLowerCase()} for ${d.price} coins`, 'buying tackle', mark, { icon: 'shopping-bag' });
}
function gardenTackleBought() { _gcaUseDirty(); }
/** One tap: put on a saved setup. */
function gardenSetupSave(i) {
  const c = _gca(), u = gardenTackleInUse(); if (!Array.isArray(c.setups)) c.setups = [];
  if (i < 0 || i >= GARDEN_CATCH_RULES.setups) return _gdNo('There is no such slot');
  c.setups[i] = { rod: u.rod, reel: u.reel, line: u.line, hook: u.hook, bait: u.bait, bobber: u.float };
  _gdSave(); return { ok: true, msg: 'Saved. One tap puts it all back on.' };
}
function gardenSetupUse(i) {
  const c = _gca(), s = Array.isArray(c.setups) ? c.setups[i] : null; if (!s) return _gdNo('Nothing saved there yet');
  const g = _gdG(), had = [];
  for (const [k, id] of [['rod', s.rod], ['reel', s.reel], ['line', s.line], ['hook', s.hook]]) { if (gardenGearOwned(id)) g.prefs[k] = id; else { const d = gardenGearDef(id); if (d) had.push(d.name.toLowerCase()); } }
  if (s.bait) { const b = GARDEN_BAITS.find(x => x.id === s.bait); if (b && (b.own || gardenHas('bait:' + b.id) > 0)) g.prefs.bait = b.id; else if (b) had.push('some ' + b.name.toLowerCase()); }
  if (s.bobber && gardenBobberOwned(s.bobber)) g.prefs.bobber = s.bobber;
  _gcaUseDirty(); _gdSave(); _gdEmit('gear', { kind: 'setup' });
  return { ok: true, msg: had.length ? `On. You are out of ${had.join(' and ')}.` : 'All on.' };
}
/** What this setup is good for, in plain words. */
function gardenSetupWords(u) {
  const d = (id) => gardenGearDef(id), bits = [], reel = d(u.reel), line = d(u.line), hook = d(u.hook), bait = d(u.bait), rod = d(u.rod);
  if (reel && reel.good) bits.push(reel.good);
  if (line && line.good && line.tier > 1) bits.push(line.good);
  if (hook && hook.good && hook.tier > 1) bits.push(hook.good);
  const warn = [];
  if (line && line.st.str < 1.3) warn.push('a big fish can snap this line if you hold on through a run');
  if (hook && hook.st.small < 1) warn.push('little fish will ignore a hook this size');
  return { good: bits.join(', '), warn: warn.join('; '), reach: rod ? rod.st.range : 3, bait: bait ? bait.blurb : '' };
}
/** The line in the lake, on your own screen: its colour, the lure under the float, the reel on the rod. */
function gardenTackleOnLine(fx, layer) {
  const u = gardenTackleInUse(), ll = gardenLineLook(u.line), reel = gardenGearDef(u.reel);
  fx.line.setAttribute('stroke', ll.c); fx.line.setAttribute('stroke-width', String(ll.w));
  fx.bob.innerHTML += gardenLureSvg(u.bait);
  fx.reel = _gwEl('circle', { class: 'gd-reelwheel', r: '3.2', fill: reel ? reel.st.c : '#a87c4f', stroke: '#2a2018', 'stroke-width': '0.8' });
  layer.appendChild(fx.reel);
}
const _GCA_LURE = Object.freeze({ dough: '#e8dcb0', maggot: '#f4eee0', 'glow-lure': '#9afff0', chum: '#b89a6a', 'golden-fly': '#f2c432', cricket: '#5a4a2a', shrimp: '#f0a080', berry: '#6a2a7a', spinner: '#d8dce0', spoon: '#e8ecf0', 'moth-fly': '#f4f0d8', 'frog-lure': '#5fb43a', 'deep-jig': '#3a4a7a' });
/** Your lure, a dot of colour under the float, so friends can see what you are using. */
function gardenLureSvg(id) { const c = _GCA_LURE[id]; return c ? `<path d="M0 3.5v4" stroke="#fbfbf2" stroke-width=".6" stroke-opacity=".6"/><circle cx="0" cy="8.6" r="1.9" fill="${c}" stroke="#2a2018" stroke-width=".5"/>` : ''; }
function gardenReelOnBack(id) { const d = gardenGearDef(id); return d ? `<circle cx="-3.6" cy="-33" r="3.3" fill="${d.st.c}" stroke="#2a2018" stroke-width=".8"/><circle cx="-3.6" cy="-33" r="1" fill="#fbfbf2"/>` : ''; }
/** The bug kit and a good run, on someone's figure. Feet at 0,0. */
function gardenKitOnFigure(g) {
  let s = '';
  if (g.l) s += `<g class="gpl-slung">${g.l === 2 ? '<ellipse cx="13" cy="-24" rx="26" ry="22" fill="#ffd97a" fill-opacity=".2"/><ellipse cx="13" cy="-24" rx="10" ry="9" fill="#ffe9a8" fill-opacity=".5"/>' : ''}<path d="M13 -33v4" stroke="#3a3a42" stroke-width="1.2"/><path d="M9.5 -29h7l-1 9h-5z" fill="${g.l === 2 ? '#ffe28a' : '#e8e0c0'}" stroke="#2a2a32" stroke-width="1"/><path d="M9 -29.5h8" stroke="#3a3a42" stroke-width="1.6"/></g>`;
  if (g.j) { const lit = Math.min(1, (g.j - 1) / 5); s += `<g class="gpl-slung">${lit ? `<ellipse cx="-13" cy="-22" rx="${(5 + lit * 8).toFixed(1)}" ry="${(5 + lit * 8).toFixed(1)}" fill="#e8f07a" fill-opacity="${(0.15 + lit * 0.2).toFixed(2)}"/>` : ''}<rect x="-16.5" y="-27" width="7" height="9" rx="1.6" fill="#d8ecd8" fill-opacity=".75" stroke="#5a6a5a" stroke-width=".8"/><path d="M-16.5 -27h7" stroke="#8a6a3a" stroke-width="1.6"/>${Array.from({ length: Math.min(4, g.j - 1) }, (_, i) => `<circle cx="${-14.8 + (i % 2) * 3.4}" cy="${-20.6 - i * 1.6}" r="1" fill="#f4ff8a"/>`).join('')}</g>`; }
  if (g.fd) s += '<g class="gpl-slung gca-warm"><path d="M-3 -76q-3 -4 0 -8t0 -8M3 -74q-3 -4 0 -7t0 -7" fill="none" stroke="#fff4d8" stroke-opacity=".7" stroke-width="1.5" stroke-linecap="round"/></g>';
  if (g.st >= 3) s += `<g class="gpl-slung"><path transform="translate(0 -84) scale(${Math.min(1.5, 0.8 + g.st * 0.06).toFixed(2)})" d="M0 -6Q5 -1 3 4Q1 7 0 7Q-1 7 -3 4Q-5 -1 0 -6z" fill="#f2a22a" stroke="#c8541a" stroke-width=".8"/></g>`;
  return s;
}
/** Click a person: their reel, line and hook too. */
function gardenTackleRow(g, add) {
  for (const id of [g.rl, g.ln, g.hk]) { const d = id ? gardenGearDef(id) : null; if (d && d.tackle && GARDEN_TACKLE_KINDS[d.kind]) add(gardenTackleSvg(d, 22), d.name); }
  if (g.l) { const d = gardenGearDef('bug-lantern'); add(gardenTackleSvg(d, 22), d.name); }
  if (g.j) { const d = gardenGearDef('bug-jar'); add(gardenTackleSvg(d, 22), d.name); }
}
/** A picture of a piece of tackle: the shop, the moment you get it. */
function gardenTackleSvg(d, px) {
  const c = d.st.c || '#8a9298'; let b = '';
  if (d.kind === 'reel') b = `<circle cx="0" cy="0" r="17" fill="${c}" stroke="#2a2018" stroke-width="2"/><circle cx="0" cy="0" r="11" fill="none" stroke="#fbfbf2" stroke-opacity=".6" stroke-width="2"/><circle cx="0" cy="0" r="3.4" fill="#fbfbf2"/><path d="M12 -12L22 -22" stroke="#2a2018" stroke-width="3" stroke-linecap="round"/><circle cx="23" cy="-23" r="3.4" fill="#2a2018"/>`;
  else if (d.kind === 'line') b = `<rect x="-15" y="-19" width="30" height="38" rx="5" fill="#c8a46a" stroke="#6e4c2a" stroke-width="2"/><path d="M-14 -12h28M-14 -6h28M-14 0h28M-14 6h28M-14 12h28" stroke="${c}" stroke-width="3"/>`;
  else if (d.kind === 'hook') b = `<path d="M3 -22V8a9 9 0 0 1-18 0l5 5" fill="none" stroke="${d.id === 'hook-gold' ? '#f2c432' : '#7a8288'}" stroke-width="${d.tier === 2 ? 4.4 : 3}" stroke-linecap="round"/><circle cx="3" cy="-23" r="3" fill="none" stroke="#7a8288" stroke-width="2"/>`;
  else if (d.id === 'bug-lantern') b = '<path d="M0 -24v6" stroke="#3a3a42" stroke-width="2.4"/><path d="M-10 -18h20l-3 26h-14z" fill="#ffe28a" stroke="#2a2a32" stroke-width="2"/><path d="M-12 -18h24M-9 10h18" stroke="#3a3a42" stroke-width="3.4"/>';
  else if (d.id === 'bug-jar') b = '<rect x="-13" y="-17" width="26" height="34" rx="6" fill="#d8ecd8" fill-opacity=".8" stroke="#5a6a5a" stroke-width="2"/><path d="M-13 -17h26" stroke="#8a6a3a" stroke-width="5"/><circle cx="-4" cy="5" r="2.6" fill="#f4ff8a"/><circle cx="5" cy="-3" r="2.6" fill="#f4ff8a"/>';
  else b = '<path d="M-14 -8h28l-4 26h-20z" fill="#b8a678" stroke="#6e4c2a" stroke-width="2"/><ellipse cx="0" cy="-8" rx="14" ry="4" fill="#fbf5e6" stroke="#6e4c2a" stroke-width="2"/><path d="M6 -10L18 -24" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/>';
  return `<svg class="gd-catch-ico" viewBox="-30 -30 60 60" width="${px}" height="${px}" aria-hidden="true" focusable="false">${b}</svg>`;
}

/* ---------- will it come to your line? ---------- */
function _gcaFits(want, have) {   // this or better for a reel, exactly this for the rest (a golden hook suits anything)
  const w = gardenGearDef(want), h = gardenGearDef(have); if (!w) return true; if (!h) return false;
  if (w.kind === 'reel') return h.tier >= w.tier;
  return h.id === w.id || (w.kind === 'hook' && h.id === 'hook-gold');
}
/** Why this fish ignores this line, in plain words ('' if it does not): rod, reel, line, hook and bait, from the fish's needs. */
function gardenLineWhyNot(def, set) {
  const n = def && def.needs; if (!n || !set) return '';
  const name = (id) => { const d = gardenGearDef(id); return d ? d.name.toLowerCase() : id; };
  if (n.rod) { const r = gardenGearDef(set.rod), t = r ? r.tier : 1; if (t < n.rod) { const w = GARDEN_RODS.find(x => x.tier === n.rod); return `it wants a stronger rod${w ? ': the ' + w.name.toLowerCase() : ''}`; } }
  if (n.reel && !_gcaFits(n.reel, set.reel)) return `it pulls too hard for your reel: it wants the ${name(n.reel)}`;
  if (n.line && !_gcaFits(n.line, set.line)) return `it does not trust your line: it wants the ${name(n.line)}`;
  if (n.hook && !_gcaFits(n.hook, set.hook)) return `your hook will not do: it wants the ${name(n.hook)}`;
  if (Array.isArray(n.bait) && n.bait.length && !n.bait.includes(set.bait)) return `it will only take ${n.bait.map(name).slice(0, 3).join(' or ')}`;
  return '';
}
/** Said while you wait: a fish near your float that will not come, and why. */
function gardenLineMood(F) {
  if (typeof _gfs === 'undefined') return '';
  const set = gardenTackleInUse();
  for (const f of _gfs.list.values()) {
    if (f.st !== GF_ST.swim || Math.hypot(f.x - F.bx, f.y - F.by) > GF_SCHOOL.reach + 1) continue;
    const why = gardenLineWhyNot(f.def, set); if (why) { const known = !!_gdG().fl[f.id]; return `${known ? 'A ' + f.def.name.toLowerCase() : 'That fish'} looked and swam on: ${why}.`; }
  }
  return '';
}
/** How keen a fish is on this line: what is on it, where it is, what is going on, how you have been doing. */
function gardenLineKeen(f, Q) {
  const set = Q.set || {}, line = gardenGearDef(set.line), hook = gardenGearDef(set.hook), shy = f.def.rarity !== 'common', R = GARDEN_CATCH_RULES;
  let k = gardenEventFactor('keen');
  if (shy) k *= gardenEventFactor('shy');
  if (line && line.st.shy && shy) k *= line.st.shy;
  if (hook && hook.st.big) k *= f.cm >= 60 ? hook.st.big : hook.st.small;
  if (Q.bait && gardenBaitLikes(Q.bait, f.def)) k *= 2;
  if (Q.bait && Q.bait.st.deep && gardenWaterZone(Math.floor(Q.x), Math.floor(Q.y)) === 'deep') k *= 1.6;
  const sp = gardenSpotAt(Q.x, Q.y);
  if (sp) { k *= R.spotKeen; if (gardenSpotsFed()[sp]) k *= R.fedKeen; try { if (gardenHotSpot(gardenHere().today).id === sp) k *= R.hotKeen; } catch (e) { /* no sky */ } }
  if (shy && !_gcaOnVisit()) { const c = _gca(); if (c.runDay === _gdToday()) k *= 1 + Math.min(R.runMax, (Number(c.run) || 0) * R.runKeen); }
  if (f.z) k *= 2;
  return k;
}
/** What your reel, line, hook and a meal do to the plan for a cast. */
function gardenTacklePlan(plan) {
  const u = gardenTackleInUse(), hook = gardenGearDef(u.hook);
  plan.tackle = u;
  if (hook) { plan.strike += hook.st.strike || 0; plan.hookQ = hook.st.q || 0; }
  if (Number(_gca().fed) > _gdNow()) { plan.bar += 0.04; plan.strike += 0.2; }
  return plan;
}

/* ---------- what raises the odds: asked by whoever runs the water, once for each new fish ---------- */
function gardenStockNow(today) { const c = _gca(), out = {}; for (const [id, end] of Object.entries(c.stock || {})) if (typeof end === 'string' && end >= today) out[id] = end; return out; }
function gardenSpotsFed() {
  const fd = _gdG().fd[_gdToday()], out = {}, t = _gdNow(); if (_gcaOnVisit()) { const c = gardenCatchHere(); for (const id of c.fd || []) out[id] = 1; return out; }
  if (fd && fd.sf) for (const [id, at] of Object.entries(fd.sf)) if (t - Number(at) < GARDEN_CATCH_RULES.fedMs) out[id] = 1;
  return out;
}
/** A new fish: where (a spot, often), the odds and now and then one in particular. Returns {p, ctx(p), weigh(def, w, p), forced(ctx)}. */
function gardenCatchSpawnPlan(b, m, at) {
  const R = GARDEN_CATCH_RULES, here = gardenCatchHere(), today = m.today, spots = GARDEN_SPOTS.filter(s => s.zone === b.zone), fed = gardenSpotsFed(), hot = gardenHotSpot(today);
  let p = null;
  if (!at && spots.length && b.zone !== 'pond' && Math.random() < R.spotShare) {
    const pref = spots.find(s => fed[s.id]) || (spots.includes(hot) && Math.random() < R.hotShare ? hot : null) || spots[Math.floor(Math.random() * spots.length)];
    const x = pref.x + (Math.random() - 0.5) * pref.r, y = pref.y + (Math.random() - 0.5) * pref.r * 0.7;
    if (gardenIsWater(Math.floor(x), Math.floor(y))) p = { x, y };
  }
  const rare = gardenEventFactor('rare'), stock = here.st || (_gcaOnVisit() ? [] : Object.keys(gardenStockNow(today))), known = gardenLakeKnownFor(here.sd == null ? gardenLakeSeed() : here.sd);
  const reeds = gardenWorkOwned('reed-beds');
  const job = _gcaOnVisit() ? null : gardenJobNow();
  return {
    p,
    ctx: (q) => ({ spot: gardenSpotAt(q.x, q.y), moon: _gtMoon(today), events: gardenEventsNow() }),
    weigh: (def, w, q) => {
      if (!def || def.cat !== 'fish') return w;
      let k = 1;
      if (def.rarity !== 'common') k *= rare * (reeds && gardenSpotAt(q.x, q.y) === 'reed-bank' ? 1.5 : 1);
      if (stock.includes(def.id)) k *= R.stockTimes;
      if (known.includes(def.id)) k *= R.knownTimes;
      if (job && job.fish === def.id) k *= 4;
      return w * k;
    },
    forced: (ctx) => {
      if (_gcaOnVisit()) return null;
      const c = _gca(), N = c.nem;
      // the one that got away comes back, after a while, in the water where it lives
      if (N && gardenFishDef(N.id) && _gdNow() - Number(N.at) > R.nemAfterMs && Math.random() < R.nemChance && gardenFishDef(N.id).zone.includes(ctx.zone)) return { id: N.id, cm: N.cm, z: 1 };
      if (job && job.legend && Math.random() < R.legendChance) { const d = gardenFishDef(job.legend); if (d && gardenFishFits(d, ctx)) return { id: d.id, z: 2 }; }
      return null;
    },
  };
}
/** A mark on a shadow: the one that got away trails your line and float; a legend shows rings. */
function gardenFishMark(f) {
  if (f.z === 1) { const b = gardenBobber(); return `<path d="M-14 0q-14 8 -30 3" fill="none" stroke="#fbfbf2" stroke-opacity=".75" stroke-width=".9"/><circle cx="-45" cy="3" r="3" fill="${b.c}" stroke="#2a2018" stroke-width=".7"/><path d="M-48 2.4a3 3 0 0 1 6 0z" fill="${b.c2}"/>`; }
  if (f.z === 2) return '<ellipse class="gca-legend" cx="0" cy="0" rx="34" ry="14" fill="none" stroke="#ffe27a" stroke-opacity=".7" stroke-width="1.2"/>';
  return '';
}

/* ---------- a catch sets things off ---------- */
function gardenCatchAfter(def, out, plan) {
  const g = _gdG(), c = _gca(), today = _gdToday(), fd = _gcFd(g, today), isFish = def.cat === 'fish', story = [];
  let m = null; try { m = gardenHere(); } catch (e) { /* no sky */ }
  const spot = plan.at ? gardenSpotAt(plan.at.x, plan.at.y) : '', J = fd.j && typeof fd.j === 'object' ? fd.j : (fd.j = {});
  for (const id of gardenEventsNow()) { if (!Array.isArray(J.ev)) J.ev = []; if (!J.ev.includes(id)) J.ev.push(id); }
  if (spot) { J.s = J.s || {}; J.s[spot] = (Number(J.s[spot]) || 0) + 1; }
  if (isFish) {
    // the run of catches
    c.run = (c.runDay === today ? Number(c.run) || 0 : 0) + 1; c.runDay = today;
    if ([3, 5, 10].includes(c.run)) { _gcaUseDirty(); _gdEmit('gear', { kind: 'run' }); story.push(`${c.run} in a row`); }
    // the rack: your best five of the day, hung up by the pier
    const rk = Array.isArray(fd.rk) ? fd.rk.slice() : []; rk.push([def.id, out.cm]); rk.sort((a, b) => b[1] - a[1]); fd.rk = rk.slice(0, 5);
    // the lake's records: yours, and anybody's who fished here
    if (!_gcaOnVisit() && gardenLakeRecord(def.id, out.cm, '') && c.rec[0][0] === def.id && c.rec[0][1] === out.cm && c.rec.length > 1) story.push('The biggest ever caught in this lake');
    // the poster
    const wk = _gdWeekFrom(today), wanted = gardenWantedFor(wk);
    if (wanted && wanted.id === def.id) {
      const first = !c.wb || c.wb.w !== wk;
      if (first || out.cm > (Number(c.wb.cm) || 0)) { c.wb = { w: wk, cm: out.cm }; story.push(first ? 'That is the one on the poster: a pack of maggots for you' : 'Your best yet for the poster'); }
      if (first) g.led['ca.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', i: { 'bait:maggot': 3 }, n: 1 };
    }
    // the one that got away
    if (plan.z === 1 && c.nem && c.nem.id === def.id) {
      const days = Math.max(0, _gtDayNo(today) - _gtDayNo(c.nem.d || today));
      story.push(`It's the one that got away! It still had your float in its mouth${days ? `, after ${days} day${days === 1 ? '' : 's'}` : ''}`);
      c.nem = null; c.nemDone = (Number(c.nemDone) || 0) + 1; J.nem = (Number(J.nem) || 0) + 1; out.record = true;
    }
  }
  // a piece of a map
  const piece = _gcaMapRoll(m);
  if (piece) { g.led['ca.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', i: { [piece.item]: 1 }, n: 1 }; story.push(piece.words); }
  // a job for the old angler
  const said = gardenJobEvent({ kind: 'fish', def, cm: out.cm, spot, tod: m ? m.tod : '', perfect: out.perfect, zone: plan.zone, bait: plan.baitDef ? plan.baitDef.id : 'worm' });
  if (said) story.push(said);
  if (story.length) out.story = story.join('. ');
  gardenCatchShowSoon();
}
function gardenCatchAfterBug(def) {
  const fd = _gcFd(_gdG(), _gdToday());
  if (def.id === 'firefly' && gardenHas('gear:bug-jar') > 0) { fd.ff = (Number(fd.ff) || 0) + 1; _gcaUseDirty(); _gdEmit('gear', { kind: 'jar' }); }
  gardenJobEvent({ kind: 'bug', def });
}
/** Lost in the fight, not on the strike: remember it. A fish of any size that took real work; the commonest ones are not worth a grudge. */
function gardenCatchGotAway(plan, how) {
  const def = plan.def; if (!def || def.cat !== 'fish' || plan.contest) return;
  const c = _gca(), today = _gdToday(), fd = _gcFd(_gdG(), today), J = fd.j && typeof fd.j === 'object' ? fd.j : (fd.j = {});
  J.lost = (Number(J.lost) || 0) + 1;
  c.run = 0;
  if (!_gcaOnVisit() && !plan.z && (plan.diff >= 4.5 || def.rarity !== 'common')) c.nem = { id: def.id, cm: Math.round(plan.cm) || def.cm[0], at: _gdNow(), d: today, how };
  _gcaUseDirty(); _gdSave();
}
/** The biggest three ever caught in this lake, by anyone: true when this one gets on the board. who: a friend's id, or '' for you. */
function gardenLakeRecord(id, cm, who) {
  const c = _gca(), rec = Array.isArray(c.rec) ? c.rec.slice() : [];
  if (rec.length >= 3 && cm <= rec[rec.length - 1][1]) return false;
  rec.push([id, cm, who || '']); rec.sort((a, b) => b[1] - a[1]); c.rec = rec.slice(0, 3);
  return c.rec.some(r => r[0] === id && r[1] === cm);
}
/** A guest landed a fish (fx got fish): the host's board hears about it, and someone holding the second line is thanked. */
function gardenCatchHeard(A, ev) {
  const d = gardenFishDef(ev.i), cm = Number(ev.n) || 0; if (!d || d.cat !== 'fish' || !cm) return;
  if (typeof _gll !== 'undefined' && _gll.role === 'host' && A && A.f && cm <= d.cm[1]) { if (gardenLakeRecord(d.id, cm, A.f)) { _gdSave(); gardenCatchShowSoon(); } }
  gardenHelpDone(A, true);
}

/* ---------- letting one go, and the lake's own character ---------- */
/** Let a fish go. It goes into the real water in front of you, you can see it swim off, and that kind is three times as common in your lake for a week. */
function gardenFishRelease(key) {
  const fp = gardenFishParse(key), d = fp && gardenFishDef(fp.id); if (!d || d.cat !== 'fish') return _gdNo('That cannot swim');
  if (gardenHas(key) < 1) return _gdNo('You have none of those');
  const g = _gdG(), c = _gca(), today = _gdToday(), lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  g.led[lk] = { d: today, k: 'ca', i: { [key]: -1 }, n: 1 };
  c.stock = gardenStockNow(today); c.stock[d.id] = _gdAddDays(today, GARDEN_CATCH_RULES.stockDays);
  const ids = Object.keys(c.stock); if (ids.length > GARDEN_CATCH_RULES.stockMax) delete c.stock[ids[0]];
  c.rl = (Number(c.rl) || 0) + 1;
  try { if (typeof _gw !== 'undefined' && _gw.on && !_gcaOnVisit() && _gfsDecides()) { const L = gardenLakeWater(), x = Math.max(L.x + 1, Math.min(L.x + L.w - 2, _gw.px)), y = Math.max(L.y + 0.6, Math.min(L.y + L.h - 2, _gw.py + 1.5)); if (gardenIsWater(Math.floor(x), Math.floor(y))) { _gfs.u = (_gfs.u + 1) % 1000; _gfsAdd({ u: _gfs.u, id: d.id, cm: Math.round((d.cm[0] + d.cm[1]) / 2), x, y, tx: x + 2.5, ty: y + 1.5, band: 'b0', life: 200 }); _gfs.dirty = true; _gfsRing(x, y, 1); } } } catch (e) { /* it swam off out of sight */ }
  gardenJobEvent({ kind: 'release', def: d });
  gardenCatchShowSoon();
  return _gdDone(`You let the ${d.name.toLowerCase()} go. There will be more of them in your lake this week.`, 'letting a fish go', mark, { icon: 'fish' });
}

/* ---------- the lake hall ---------- */
const GARDEN_HALL_TIERS = Object.freeze([
  Object.freeze({ at: 0, name: 'a tent and a hopeful sign' }), Object.freeze({ at: 5, name: 'a wooden hut' }), Object.freeze({ at: 15, name: 'a proper hall' }), Object.freeze({ at: 40, name: 'a hall with a tower' }), Object.freeze({ at: 90, name: 'the great lake hall' }),
]);
function gardenHallTier(n) { let t = 0; for (let i = 0; i < GARDEN_HALL_TIERS.length; i++) if (n >= GARDEN_HALL_TIERS[i].at) t = i; return t; }
/** Give one to the hall. It leaves your bag for good, and the first of each kind is all it takes. */
function gardenHallGive(kind, id) {
  const g = _gdG(), c = _gca(), today = _gdToday(), hall = c.hall && typeof c.hall === 'object' ? c.hall : (c.hall = { f: {}, b: {} }), key = kind === 'bug' ? 'b' : 'f';
  hall[key] = hall[key] || {};
  if (hall[key][id]) return _gdNo('The hall has one of those already');
  let item = '';
  if (kind === 'bug') { if (gardenHas('bug:' + id) > 0) item = 'bug:' + id; }
  else for (const q of [0, 1, 2, 3]) if (gardenHas(gardenFishKey(id, q)) > 0) { item = gardenFishKey(id, q); break; }
  if (!item) return _gdNo('You have none of those in your bag');
  const before = Object.keys(hall.f || {}).length + Object.keys(hall.b || {}).length, lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  g.led[lk] = { d: today, k: 'ca', x: 3, i: { [item]: -1 }, n: 1 };
  hall[key][id] = today;
  gardenJobEvent({ kind: 'hall' });
  const t0 = gardenHallTier(before), t1 = gardenHallTier(before + 1);
  gardenCatchShowSoon();
  return _gdDone(t1 > t0 ? `The hall is growing! It is ${GARDEN_HALL_TIERS[t1].name} now.` : 'Thank you. It is on show now, with your name by it.', 'giving to the hall', mark, { icon: 'landmark' });
}

/* ---------- the smoker: goes in now, comes out hours later ---------- */
function gardenSmokerState() { const s = _gca().smk; if (!s || !s.at) return 0; return _gdNow() - Number(s.at) >= GARDEN_CATCH_RULES.smokeMs ? 2 : 1; }
function gardenSmokerPut() {
  if (!gardenWorkOwned('smoker')) return _gdNo('You need a smoker: build one at the tackle shop');
  const c = _gca(); if (c.smk && c.smk.at) return _gdNo(gardenSmokerState() === 2 ? 'Take out what is in there first' : 'It is still smoking');
  const bag = gardenCatchBag().fish.filter(r => r.def.cat === 'fish').sort((a, b) => gardenCatchEach(a.key) - gardenCatchEach(b.key)), take = {};
  let n = 0; for (const r of bag) { const k = Math.min(r.n, GARDEN_CATCH_RULES.smokeMax - n); if (k > 0) { take[r.key] = -k; n += k; } if (n >= GARDEN_CATCH_RULES.smokeMax) break; }
  if (!n) return _gdNo('You have no fish to smoke');
  const today = _gdToday(), lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  _gdG().led[lk] = { d: today, k: 'ca', i: take, n: 1 };
  c.smk = { at: _gdNow(), n };
  gardenCatchShowSoon();
  return _gdDone(`${n} fish in the smoker. Come back in four hours: you will see the smoke stop.`, 'lighting the smoker', mark, { icon: 'flame' });
}
function gardenSmokerTake() {
  if (gardenSmokerState() !== 2) return _gdNo('It is not ready yet');
  const c = _gca(), today = _gdToday(), n = Number(c.smk.n) || 1, lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  _gdG().led[lk] = { d: today, k: 'ca', x: 2, i: { 'meal:smoked': n }, n: 1 };
  c.smk = null;
  gardenCatchShowSoon();
  return _gdDone(`${n} smoked fish. Eat one before you fish: the bar is wider and you have longer to strike, for half an hour.`, 'taking from the smoker', mark, { icon: 'flame' });
}
function gardenMealEat() {
  if (gardenHas('meal:smoked') < 1) return _gdNo('You have no smoked fish');
  const c = _gca(), today = _gdToday(), lk = 'ca.' + today + '.' + _gdUid('');
  _gdG().led[lk] = { d: today, k: 'ca', i: { 'meal:smoked': -1 }, n: 1 };
  c.fed = _gdNow() + GARDEN_CATCH_RULES.mealMs;
  _gcaUseDirty(); _gdSave(); _gdEmit('gear', { kind: 'meal' });
  return { ok: true, msg: 'Delicious. For half an hour the bar is wider and you have longer to strike.' };
}

/* ---------- the maps ---------- */
function gardenChestMapNow() {
  const c = _gca(), i = Math.max(0, Number(c.ch) || 0);
  return i < GARDEN_CHEST_MAPS.length ? GARDEN_CHEST_MAPS[i] : null;
}
function gardenChestPieces(map) { let n = 0; for (let i = 1; i <= 4; i++) if (gardenHas(`map:${map.id}-${i}`) > 0) n++; return n; }
function _gcaMapRoll(m) {
  const map = gardenChestMapNow(); if (!map || !m || (m.level && m.level.level < 3) || _gcaOnVisit()) return null;
  if (Math.random() >= GARDEN_CATCH_RULES.mapChance) return null;
  for (let i = 1; i <= 4; i++) if (gardenHas(`map:${map.id}-${i}`) < 1) return { item: `map:${map.id}-${i}`, words: `A torn bit of old map was caught up with it (${gardenChestPieces(map) + 1} of 4)` };
  return null;
}
/** A cast: chum at a spot feeds it, and the cross on your map waits for you. */
function gardenCatchCast(F) {
  if (!F || !F.plan || F.plan.contest) return;
  const sp = gardenSpotAt(F.bx, F.by);
  if (sp && F.plan.baitDef && F.plan.baitDef.st.chum) {
    const fd = _gcFd(_gdG(), _gdToday()); fd.sf = Object.assign({}, fd.sf, { [sp]: _gdNow() });
    gardenJobEvent({ kind: 'feed', spot: sp }); gardenCatchShowSoon();
    if (typeof gardenFloat === 'function') gardenFloat('You fed the water here', Math.floor(F.bx), Math.floor(F.by) - 1, 1, 1, '');
  }
  const map = gardenChestMapNow();
  if (map && !_gcaOnVisit() && gardenChestPieces(map) >= 4) { const at = gardenChestAt(gardenLakeSeed(), map.id); if (Math.hypot(F.bx - at.x - 0.5, F.by - at.y - 0.5) < 1.3) { F.chestFor = map; F.chestAt = performance.now() + 3200; } }
}
/** Something heavy on the line where the cross is. True when it takes the bait. */
function gardenChestWait(F) {
  if (!F.chestFor || F.chestDone || performance.now() < F.chestAt) return false;
  F.chestDone = true;
  const P = F.plan; P.chest = F.chestFor; P.id = 'old-key'; P.def = gardenFishDef('old-key'); P.beh = 'sinker'; P.cm = 40; P.diff = 6; P.line = 1;
  return true;
}
function gardenChestLanded(plan) {
  const map = plan.chest, c = _gca(), g = _gdG(), today = _gdToday(), i = { ['decor:' + map.make]: 1 };
  for (let n = 1; n <= 4; n++) i[`map:${map.id}-${n}`] = -1;
  g.led['ca.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', c: map.coins, x: 12, i, n: 1 };
  c.ch = (Number(c.ch) || 0) + 1;
  const d = gardenDecor(map.make);
  _gwHeldUp(`<g transform="scale(1.1)"><rect x="-22" y="-20" width="44" height="26" rx="4" fill="#7a4a2a" stroke="#3a2010" stroke-width="2"/><path d="M-22 -8h44" stroke="#e8c24a" stroke-width="3"/></g>`, 2400);
  _gwCatchCard({ svg: gardenCatchSvg('fish', 'old-key', 64, { uid: 'cc' }), name: 'X marks the spot!', sub: `You hauled it up: ${map.coins} coins, and ${d ? d.name.toLowerCase() : 'something old'} to put in your garden.`, isNew: true, rare: true, open: 'lake', ms: 7000 });
  _gdSave(); gardenCatchShowSoon(); _gdpRefreshChromeSoon();
}

/* ---------- bugs: habitats, the lantern, sugar ---------- */
function gardenBugWeight(b, m) {
  let n = 0; for (const d of m.decor) if (d.def.effect && d.def.effect.kind === 'habitat' && d.def.effect.what && d.def.effect.what.includes(b.shape)) n++;
  return 1 + 2 * Math.min(2, n);
}
function gardenLanternHere(rnd) {
  if (typeof _gw === 'undefined' || _gcaOnVisit() || gardenHas('gear:bug-lantern') < 1) return null;
  return { x: _gw.px + (rnd() - 0.5) * 3, y: _gw.py + (rnd() - 0.5) * 2 };
}
/** Paint the nearest tree you have grown. It shows on the trunk, and a few hours later something has come to it. */
function gardenSugarTree() {
  if (gardenHas('kit:sugar-pot') < 1) return _gdNo('You have no pot of sugar: the tackle shop sells them');
  const m = gardenModel(), trees = m.plants.filter(p => p.def.cat === 'tree' && p.stage >= 3); if (!trees.length) return _gdNo('You need a grown tree');
  const px = typeof _gw !== 'undefined' ? _gw.px : trees[0].x, py = typeof _gw !== 'undefined' ? _gw.py : trees[0].y;
  trees.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  const c = _gca(), today = _gdToday(), lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  _gdG().led[lk] = { d: today, k: 'ca', i: { 'kit:sugar-pot': -1 }, n: 1 };
  c.sugar = { uid: trees[0].uid, at: _gdNow() };
  return _gdDone(`You painted the ${trees[0].def.name.toLowerCase()} with sugar. Come back in a couple of hours.`, 'painting a tree', mark, { icon: 'bug' });
}
/** It has come: one bug on that tree, in place of another (never more bugs). It stays till you net it. */
function gardenSugarBug(list, m) {
  const c = _gca(), S = c.sugar; if (!S || _gcaOnVisit() || m.now - Number(S.at) < GARDEN_CATCH_RULES.sugarMs) return list;
  const t = m.plants.find(p => p.uid === S.uid); if (!t) { c.sugar = null; return list; }
  const key = 'sg.' + Math.floor(Number(S.at) / 1000);
  const fd = _gdG().fd[m.today]; if (fd && Array.isArray(fd.k) && fd.k.includes(key)) { c.sugar = null; return list; }
  const pool = GARDEN_BUGS.filter(b => b.lv <= m.level.level && b.rarity !== 'common' && (b.hab.includes('tree') || b.hab.includes('woods') || b.shape === 'moth' || b.shape === 'beetle') && (!b.seasons.length || b.seasons.includes(m.season)));
  if (!pool.length) return list;
  const b = pool[gardenHash(key) % pool.length], one = { key, id: b.id, x: t.x + 0.9, y: t.y + 1.2, hab: 'tree', t: 0.5 };
  return list.length ? list.slice(0, -1).concat(one) : [one];
}

/* ---------- the old angler's jobs: one at a time, one new one a day after the first few ---------- */
function _gJ(id, says, ask, test, more) { return Object.freeze(Object.assign({ id, says, ask, test }, more || {})); }
const GARDEN_ANGLER_JOBS = Object.freeze([
  _gJ('j-first', 'New here? Good. Everyone starts the same way.', 'Catch any fish. Click near a shadow, wait for the big splash, then click.', (e) => e.kind === 'fish' && e.def.cat === 'fish', { pay: { 'bait:dough': 5 } }),
  _gJ('j-bait', 'Worms are fine. But a fish likes a change.', 'Buy some bait at the tackle shop, and catch a fish with it.', (e) => e.kind === 'fish' && e.def.cat === 'fish' && e.bait !== 'worm', { c: 10 }),
  _gJ('j-reeds', 'See the reeds to the east? Shy fish hide in there. Go gently.', 'Catch a fish at the reed bank.', (e) => e.kind === 'fish' && e.spot === 'reed-bank', { pay: { 'bait:maggot': 3 } }),
  _gJ('j-reel', 'That reel of yours sounds like a bag of spoons.', 'Buy a better reel at the tackle shop.', (e) => e.kind === 'buy' && e.tackle === 'reel', { c: 15, have: () => _gcaWorn('reel').tier > 1 }),
  _gJ('j-bug', 'Not everything worth catching swims. Bring a net, walk slowly.', 'Net any bug. Creep up on it: hold Shift, or just click it.', (e) => e.kind === 'bug', { pay: { 'bait:cricket': 3 } }),
  _gJ('j-letgo', 'Now the hard one. Let one go. It comes back, one way or another.', 'Open your bag and let a fish go.', (e) => e.kind === 'release', { c: 10 }),
  _gJ('j-dusk', 'They feed at the edges of the day. I set my watch by it.', 'Catch a fish at dawn or at dusk.', (e) => e.kind === 'fish' && e.def.cat === 'fish' && (e.tod === 'dawn' || e.tod === 'dusk'), { c: 15 }),
  _gJ('j-hall', 'That old hall by the reeds needs fish, and it needs somebody to care.', 'Give one fish or bug to the lake hall.', (e) => e.kind === 'hall', { c: 15 }),
  _gJ('j-log', 'There is a log out past the shallows. Things with whiskers live under it.', 'Catch a fish at the sunken log.', (e) => e.kind === 'fish' && e.spot === 'sunken-log', { pay: { 'bait:shrimp': 3 } }),
  _gJ('j-feed', 'If you want a place to be good, feed it first.', 'Cast chum at any of the spots in the lake.', (e) => e.kind === 'feed', { c: 15 }),
  _gJ('j-big', 'I have not seen you with a proper fish yet.', 'Land a fish of 50 cm or more.', (e) => e.kind === 'fish' && e.cm >= 50, { c: 20 }),
  _gJ('j-deep', 'The big ones are past the end of the pier. You will need the reach.', 'Catch a fish in the deep water.', (e) => e.kind === 'fish' && e.zone === 'deep' && e.def.cat === 'fish', { pay: { 'bait:spinner': 3 } }),
  _gJ('j-night', 'I do my best thinking out here after dark.', 'Catch a fish at night.', (e) => e.kind === 'fish' && e.def.cat === 'fish' && e.tod === 'night', { c: 20 }),
  _gJ('j-rare', 'Well now. Let us see if you are lucky or good.', 'Catch a rare fish.', (e) => e.kind === 'fish' && ['rare', 'epic', 'legendary'].includes(e.def.rarity), { pay: { 'bait:golden-fly': 1 } }),
  _gJ('l-koi', 'I will tell you something. There are four fish here that no one believes in. The first lives in still water: gold from nose to tail.', 'Catch the emperor koi, in the pond. I have seen one with rings on the water round it.', (e) => e.kind === 'fish' && e.def.id === 'emperor-koi', { legend: 'emperor-koi', c: 30 }),
  _gJ('l-moon', 'The second only comes up with the moon. Silver, like a plate.', 'Catch the moonfish: deep water, at night.', (e) => e.kind === 'fish' && e.def.id === 'moonfish', { legend: 'moonfish', c: 30 }),
  _gJ('l-sun', 'The third is the other way about. High summer, full sun. It hurts to look at.', 'Catch the sunburst fish: deep water, by day, in summer.', (e) => e.kind === 'fish' && e.def.id === 'sunburst-fish', { legend: 'sunburst-fish', c: 30 }),
  _gJ('l-whiskers', 'And the last is mine. I have had him on the line twice in forty years. Old Whiskers. Dawn or dusk, deep water. It helps if it rains.', 'Catch Old Whiskers. You will want your strongest line.', (e) => e.kind === 'fish' && e.def.id === 'old-whiskers', { legend: 'old-whiskers', c: 60, pay: { 'decor:legend-plaque': 1 } }),
]);
/** The job you are on, or a little one of the day once the story is done: {say, ask, fish?, legend?, def?, waiting?, done?}. */
function gardenJobNow() {
  const c = _gca(), i = Number(c.job) || 0, today = _gdToday();
  if (i >= GARDEN_ANGLER_JOBS.length) {
    const list = GARDEN_FISH.filter(f => f.cat === 'fish' && !f.needs && f.lv <= gardenModel().level.level && f.rarity !== 'epic' && f.rarity !== 'legendary' && f.zone.some(z => z !== 'pond')), d = list.length ? list[gardenHash('aj|' + today) % list.length] : null;
    return d ? { daily: true, id: 'daily', says: c.jobDay === today ? 'That will do for today. Come back tomorrow.' : 'Forty years, and I still like to see one of these.', ask: `Catch ${_gscA(d.name.toLowerCase())} today.`, fish: d.id, done: c.jobDay === today, test: (e) => e.kind === 'fish' && e.def.id === d.id, c: 10 } : null;
  }
  // after the first three jobs a new one comes the next day: a reason to come back, never a wall in your way
  const J = GARDEN_ANGLER_JOBS[i]; if (!J) return null;
  if (i >= 3 && c.jobDay === today) return { waiting: true, id: 'wait', says: 'That will do for today. Come and see me tomorrow.', ask: 'Nothing more today.' };
  return J;
}
/** Something happened: does it finish the job? Pays out and says so. */
function gardenJobEvent(e) {
  if (_gcaOnVisit() && e.kind === 'fish') return '';   // (his jobs are for your own lake)
  const J = gardenJobNow(); if (!J || J.waiting || J.done) return '';
  let hit = false; try { hit = !!J.test(e); } catch (err) { hit = false; }
  if (!hit) return '';
  const c = _gca(), today = _gdToday();
  const i = {}; if (J.pay) Object.assign(i, J.pay);
  _gdG().led['aj.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', c: J.c || 0, x: 4, i, n: 1 };
  c.jobDay = today; if (!J.daily) c.job = (Number(c.job) || 0) + 1;
  _gdSave(); gardenCatchShowSoon();
  return 'The old angler nodded. Go and see him';
}

/* ---------- getting ready for a fish ---------- */
/** Everything that fish needs, what you have of it, and where it lives. {rows: [{what, ok, on?, id?}], where: {x, y, words}|null, when: words} */
function gardenReadyFor(def) {
  const n = def.needs || {}, u = gardenTackleInUse(), rows = [], name = (id) => { const d = gardenGearDef(id); return d ? d.name : id; };
  if (n.rod) { const w = GARDEN_RODS.find(x => x.tier >= n.rod && gardenGearOwned(x.id)), need = GARDEN_RODS.find(x => x.tier === n.rod); rows.push({ what: `${need ? need.name : 'A better rod'} or better`, ok: !!w, id: w ? w.id : '', kind: 'rod' }); }
  for (const k of ['reel', 'line', 'hook']) if (n[k]) { const have = GARDEN_TACKLE_KINDS[k].find(x => gardenGearOwned(x.id) && _gcaFits(n[k], x.id)); rows.push({ what: name(n[k]), ok: !!have, id: have ? have.id : '', kind: k }); }
  if (Array.isArray(n.bait) && n.bait.length) { const have = n.bait.find(id => { const b = GARDEN_BAITS.find(x => x.id === id); return b && (b.own || gardenHas('bait:' + id) > 0); }); rows.push({ what: n.bait.map(name).slice(0, 3).join(' or '), ok: !!have, id: have || '', kind: 'bait' }); }
  const sp = n.spot ? gardenSpotDef(n.spot) : null; let where = null;
  if (sp) where = { x: sp.x, y: sp.y, words: sp.name };
  else { const z = (n.zone && [].concat(n.zone)[0]) || def.zone[0], fav = GARDEN_SPOTS.find(s => s.zone === z); if (z === 'pond') { const a = GARDEN_AREAS.find(q => q.water && !q.fishing); if (a) where = { x: a.water.x + a.water.w / 2, y: a.water.y + a.water.h / 2, words: 'the pond' }; } else if (fav) where = { x: fav.x, y: fav.y, words: fav.name.replace(/^The /, 'the ') + ', or anywhere in that water' }; }
  const bits = [];
  if (def.tod && def.tod.length && def.tod.length < 4) bits.push(def.tod.map(t => ({ dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' })[t]).join(' or '));
  if (def.seasons && def.seasons.length) bits.push('in ' + def.seasons.join(' or '));
  if (n.rain || def.rain) bits.push(n.rain ? 'in the rain' : 'best in the rain');
  void u;
  return { rows, where, when: bits.join(', ') };
}
/** Put on everything you have that it needs. */
function gardenReadyEquip(def) {
  const R = gardenReadyFor(def), g = _gdG(), had = [];
  for (const r of R.rows) { if (r.ok && r.id) g.prefs[r.kind] = r.id; else had.push(r.what); }
  _gcaUseDirty(); _gdSave(); _gdEmit('gear', { kind: 'ready' });
  return { ok: !had.length, msg: had.length ? `You still need: ${had.join(', ')}. The tackle shop has them.` : 'All on. You are ready.' };
}
function gardenPinToggle(id) {
  const c = _gca(), list = Array.isArray(c.pins) ? c.pins.slice() : [], at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1); else { if (list.length >= 3) list.shift(); list.push(id); }
  c.pins = list; _gdSave();
  return at < 0;
}
const _gcaPinSaid = new Map();
/** A soft word when a fish you pinned can be caught right now. At most once in half an hour for each one, and never over a line that is out. */
function _gcaPinCheck(m) {
  const pins = Array.isArray(_gca().pins) ? _gca().pins : []; if (!pins.length || _gwFishBusy()) return;
  const ctx = { zone: '', tod: m.tod, season: m.season, rain: !!(m.rain && m.rain.now), level: m.level.level, spot: '', moon: _gtMoon(m.today), events: gardenEventsNow() }, t = performance.now();
  for (const id of pins) {
    const d = gardenFishDef(id); if (!d) continue;
    if ((_gcaPinSaid.get(id) || -1e9) > t - 1800000) continue;
    if (d.zone.some(z => { try { return gardenFishFits(d, Object.assign({}, ctx, { zone: z, spot: d.needs && d.needs.spot ? d.needs.spot : '' })); } catch (e) { return false; } })) { _gcaPinSaid.set(id, t); if (typeof _gdgNote === 'function') _gdgNote(`The ${_gdG().fl[id] ? d.name.toLowerCase() : 'fish you pinned'} is about now.`, icon('fish')); return; }
  }
}

/* ---------- the diary: a few plain lines about your day, from what was kept ---------- */
const _GCA_TOD = Object.freeze({ dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' });
function gardenDiaryDay(iso) {
  const fd = _gdG().fd[iso]; if (!fd || typeof fd !== 'object') return null;
  const n = Number(fd.c) || 0, J = fd.j || {}, rk = Array.isArray(fd.rk) ? fd.rk : [], bugs = Array.isArray(fd.k) ? fd.k.length : 0, out = [];
  if (!n && !bugs) return null;
  if (n) { const best = rk[0] && gardenFishDef(rk[0][0]); out.push(`You landed ${n} fish${best ? `, and the best was ${_gscA(best.name.toLowerCase())} of ${rk[0][1]} cm` : ''}.`); }
  if (bugs) out.push(`${bugs} bug${bugs === 1 ? '' : 's'} went in the net.`);
  if (J.s) { const top = Object.entries(J.s).sort((a, b) => b[1] - a[1])[0], s = top && gardenSpotDef(top[0]); if (s) out.push(`${s.name} was where it happened.`); }
  if (Array.isArray(J.ev)) for (const id of J.ev.slice(0, 2)) { const e = GARDEN_LAKE_EVENTS[id]; if (e) out.push(`${e.name}.`); }
  if (J.lost) out.push(J.lost === 1 ? 'One got away.' : `${J.lost} got away.`);
  if (J.nem) out.push('And you got back the one that got away.');
  if (fd.fw) out.push('You weighed in at the festival.');
  return out;
}

/* ---------- the festival ---------- */
/** Weigh in your best of the day (fish) or count your bugs (the bug-off). Once, for a rosette you can put out, and friends can see. */
function gardenFestivalWeigh() {
  const today = _gdToday(), kind = gardenFestivalOn(today); if (!kind) return _gdNo('There is no festival today');
  const g = _gdG(), fd = _gcFd(g, today), c = _gca(); if (fd.fw) return _gdNo('You have weighed in already. Well done.');
  let tier = 0;
  if (kind === 'fish') {
    const rk = Array.isArray(fd.rk) ? fd.rk : []; if (!rk.length) return _gdNo('Catch something first');
    let best = 0; for (const [id, cm] of rk) { const d = gardenFishDef(id); if (d) best = Math.max(best, (cm - d.cm[0]) / Math.max(1, d.cm[1] - d.cm[0])); }
    tier = best >= 0.75 ? 3 : best >= 0.45 ? 2 : 1;
  } else { const n = Array.isArray(fd.k) ? fd.k.length : 0; if (!n) return _gdNo('Net something first'); tier = n >= 6 ? 3 : n >= 3 ? 2 : 1; }
  const lk = 'ca.' + today + '.' + _gdUid(''), coins = [0, 10, 25, 50][tier], label = ['', 'a third-place', 'a second-place', 'a first-place'][tier];
  g.led[lk] = { d: today, k: 'ca', c: coins, x: 5 * tier, i: { 'decor:rosette-stand': 1 }, n: 1 };
  fd.fw = tier; c.fe = (Number(c.fe) || 0) + 1;
  _gdSave(); gardenCatchShowSoon();
  return { ok: true, msg: `The judges gave you ${label} rosette, and ${coins} coins. It is in your bag to put out.` };
}

/* ---------- the second line: a monster on someone's line, and anyone can grab hold ---------- */
const _gcaHelp = { of: null, el: null };
function gardenHelpHeard(A, e, ev) {
  if (e === 'help') {
    if (ev.to === _gfsSlot() && _gw.reel) { _gw.reel.help = (_gw.reel.help || 0) + 1; if (_gw.reel.say) _gw.reel.say.textContent = 'Somebody has the second line!'; }
    return;
  }
  // a monster on someone's line: a small button for a little while. No more than that
  if (_gwFishBusy()) return;
  const box = _gdgBox(); if (!box) return;
  if (_gcaHelp.el) _gcaHelp.el.remove();
  const b = document.createElement('button'); b.type = 'button'; b.className = 'gd-helpbtn'; b.textContent = `${A.n || 'A friend'} has a monster on! Grab the second line`;
  b.onclick = (x) => { x.stopPropagation(); b.remove(); _gcaHelp.el = null; _gcaHelpGo(A, ev); };
  box.appendChild(b); _gcaHelp.el = b; setTimeout(() => { if (_gcaHelp.el === b) { b.remove(); _gcaHelp.el = null; } }, 25000);
}
function _gcaHelpGo(A, ev) {
  if (!Number.isInteger(ev.x) || !Number.isInteger(ev.y)) return;
  const pt = { x: ev.x + 0.5, y: ev.y + 0.5 };
  _gwFacePt(pt);
  _gw.fishing = { state: 'help', t: 0, plan: { baitDef: GARDEN_BAITS[0] }, bx: pt.x, by: pt.y, nibN: 0, nibble: 0, hold: false, fu: null, mood: '' };
  _gcaHelp.of = A.w;
  _gwFishClearFx(); _gwFx(); _gwBody(); _gwFishFocus(true);
  gardenLiveFx('fish', 'cast', { x: ev.x, y: ev.y, i: 'worm' });   // (everyone sees your line go to the same float)
  gardenLiveFx('fish', 'help', { to: A.w });
}
/** The fight is over. Landed: you share the glory, and a little bait. */
function gardenHelpDone(A, won) {
  if (_gcaHelp.of == null || !A || A.w !== _gcaHelp.of || !_gw.fishing || _gw.fishing.state !== 'help') return;
  _gcaHelp.of = null; _gwFishCancel();
  if (won) { const today = _gdToday(); _gdG().led['ca.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', x: 3, i: { 'bait:maggot': 2 }, n: 1 }; _gdSave(); if (typeof _gdgNote === 'function') _gdgNote('You landed it together! Two lots of maggots for your trouble.', icon('fish')); }
}

/* ---------- a look every few seconds, while the garden is open ---------- */
const _gcaTick = { at: 0, ev: '', dark: null };
function gardenCatchTick() {
  if (typeof gardenThingFrame === 'function') gardenThingFrame();
  if (typeof _gw !== 'undefined' && _gw.boat && typeof gardenBoatHud === 'function') gardenBoatHud();
  const t = performance.now(); if (t - _gcaTick.at < 5000) return; _gcaTick.at = t;
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const list = gardenEventsNow(), key = list.join(',');
  if (key !== _gcaTick.ev) { _gcaTick.ev = key; gardenRepaintSoon(); if (typeof gardenLakeNote === 'function') gardenLakeNote(list, true); }
  if (!_gcaOnVisit()) { _gcaPinCheck(m); if (gardenHas('gear:bug-lantern') > 0) { const dark = m.tod === 'night' || m.tod === 'dusk'; if (_gcaTick.dark !== null && dark !== _gcaTick.dark) { _gcaUseDirty(); _gdEmit('gear', { kind: 'lantern' }); } _gcaTick.dark = dark; } }
  if (_gcaHelp.of != null && _gw.fishing && _gw.fishing.state === 'help') { const A = typeof _gll !== 'undefined' ? _gll.actors.get(_gcaHelp.of) : null; if (!A || !A.fish) { _gcaHelp.of = null; _gwFishCancel(); } }
}
