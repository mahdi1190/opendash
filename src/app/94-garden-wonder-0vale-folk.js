/* ============================================================
   THE FOLK'S RUNNER (it sorts after 94-garden-wonder-0kit.js, whose wdMod it calls at load; npcs-PLAN 3.3 to 3.7, Phase 1): everyone in VALE_FOLK lives their day where the planner says, on real stand points.
   - Homes: solved once by kind (valeFolkSolveHomes) and saved (vh.<id>, vm.<id>), so they never shuffle. Someone whose home is in land
     you have not opened yet comes in by day from the road and goes back at dusk (travelling), as the plan says.
   - The day: planned once a day for everyone together (seeded, booked), one villager a frame, while you stand (never inside a walk).
   - Walking: a villager on screen walks the path service's way (lanes first); off screen they are only worked out along their leg, and
     join it where they would be when they come within VFR_NEAR cells of the view. Nobody appears or vanishes in view: they come out of
     doors and go in at them.
   - Talking: each villager in reach is offered by the prompt ("E  Talk to Pip"), wherever they are and whatever they are doing. They stop,
     turn to you, and say today's words (the callers' and residents' own talk, friendship and favours, 94-garden-wonder-1folk.js, -1kin.js,
     -1tale.js). Someone at home: "E  Knock on Bramble's door", and they come out.
   - Tellers walk to you: someone with the next piece of a story that is not heavy comes over when you have stood a moment (once a day);
     a heavy beat waits for their calm hour at home (the story's own `home` rule asks wdKinAtHome).
   - Tells: the angler sits with his back to the moving water; Thistle or Quince and Hollin meeting on a path (the relationship table):
     Hollin steps off it and waits; Bramble sits and rubs out the same corner of his map. The first time you see one it goes in the
     Field Journal's People page (vt.<tell>), with no explanation.
   - Friends: the host sends the folk's whole state (gl:fk, 94-garden-folk-9live.js); a guest draws them where the host says.
   gardenFolkLive()          true when the folk live their days here (the switch, the painted world, folk on in Settings)
   gardenFolkActRows(px, py) the prompt's rows for the folk in reach (94-garden-zz-7act-1core.js asks)
   gardenFolkTalkTo(id)      talk to them now (the prompt, a click)
   gardenFolkFeet()          [{ x, y, name }] for the collision view (yellow: solid to your feet, gardenFolkBlocks)
   gardenFolkState()         the dev tools' and audit's view: [{ id, x, y, act, spot, inside, walking, on }]
   ============================================================ */
const VFR_NEAR = 6, VFR_TICK = 0.1, VFR_MS_WALK = 3, VFR_MS_IDLE = 8;
const _vfr = { on: false, day: '', key: '', homes: new Map(), plans: new Map(), V: new Map(), queue: [], book: null, ctx: null, t: 0, tickT: 0, teller: null, lastKey: '', seen: new Set(), stats: { tick: 0, tickMax: 0, plan: 0, planMax: 0, frames: 0, frameMax: 0 } };
function gardenFolkLive() {
  if (typeof VALE_FOLK_LIVE === 'undefined' || !VALE_FOLK_LIVE || typeof _gw === 'undefined' || !_gw.on || GARDEN_WORLD.v < 3) return false;
  try { if (typeof gardenFun === 'function' && gardenFun() === 'off') return false; if (typeof _wdOn === 'function' && !_wdOn('folk')) return false; } catch (e) { return false; }
  return true;
}
function _vfrMinute() { const sh = Number(_vfr.shift) || 0; return (((_vfrClockMinute() + sh) % 1440) + 1440) % 1440; }   // (_vfr.shift: minutes on, for the dev tools and the audit's sandbox day only)
function _vfrClockMinute() { try { const p = Clock.parts(_gdNow()); return p.h * 60 + p.mi + (Number(p.s) || 0) / 60; } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; } }
function _vfrWeekday(iso) { return new Date(iso + 'T12:00:00').getDay(); }
/* ---------- the finder's view of this layout ---------- */
function _vfrDoorOf(t) {
  if (!t) return null;
  if (t.kind === 'road') return { x: t.x, y: t.y };
  if (t.src === 'thing') { const K = GARDEN_KINDS[t.kind] || {}; return { x: t.x + (K.w || 1) * 0.05, y: t.y + 0.42 }; }
  let p = null; try { p = (typeof GARDEN_PROPS !== 'undefined' && GARDEN_PROPS.find(q => q.id === t.id)) || (gardenIslandData().static || []).find(q => q.id === t.id) || null; } catch (e) { p = null; }
  if (p && p.door && Number.isFinite(p.door.x)) { const d = { x: p.door.x + 0.5, y: p.door.y + 0.5 }; const f = typeof _gwFree === 'function' && !_gwFree(d.x, d.y) && typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(d.x, d.y, 1.5) : null; return f || d; }
  const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(t.x, t.y + 0.6, 2) : null; return f || { x: t.x, y: t.y + 0.6 };
}
function _vfrOpenAt(x, y, m) { try { const z = gardenIslandZoneAt(Math.floor(x), Math.floor(y)); return !z || (m.areas || []).includes('zn-' + z); } catch (e) { return true; } }
function _vfrCtx(m) {
  const things = (typeof gardenAffordThings === 'function' ? gardenAffordThings() : []).filter(t => t.kind && t.kind !== 'person' && !(t.needs && typeof gardenWorkOwned === 'function' && !gardenWorkOwned(t.needs)));   // (a longer pier not built yet is not there to sit on)
  const spotsMemo = new Map(), doorMemo = new Map(), baseMemo = new Map();
  const free = (x, y) => typeof _gwFree !== 'function' || _gwFree(x, y);
  const C = {
    seed: (() => { try { return String((gardenIslandData() || {}).id || '') + '|' + String((state && state.garden && state.garden.id) || ''); } catch (e) { return 'vale'; } })(),
    layout: (() => { try { return gardenIslandData().id; } catch (e) { return ''; } })(),
    things,
    spots(t) {
      if (spotsMemo.has(t.id)) return spotsMemo.get(t.id);
      let B = { x: t.x, y: t.y, w: t.w }; try { if (typeof gardenAffordDrawnBase === 'function') B = gardenAffordDrawnBase(t); } catch (e) { /* the plan's */ }
      let s = []; try { s = gardenKindSpots({ kind: t.kind, x: B.x, y: B.y, w: B.w, front: t.front }); } catch (e) { s = []; }
      s = s.filter(q => !q.needs || gardenKindNeedsOk(q.needs, { season: m.season, night: m.tod === 'night', level: m.level && m.level.level }));
      s = _vfrSideOn(s, C.base(t), t.kind);
      spotsMemo.set(t.id, s); return s;
    },
    base(t) {
      if (!baseMemo.has(t.id)) {
        let B = { x: t.x, y: t.y, w: t.w || 1 }; try { if (typeof gardenAffordDrawnBase === 'function') B = gardenAffordDrawnBase(t); } catch (e) { /* the plan's */ }
        let h = 1.2; try { const w = window.GardenNative && GardenNative.world(), rec = w && w.entities instanceof Map ? w.entities.get('prop:' + t.id) : null; if (rec && rec.bounds && rec.bounds.height) h = rec.bounds.height / GARDEN_WORLD.cellH; } catch (e) { /* not drawn yet */ }
        baseMemo.set(t.id, Object.assign({}, B, { h: Math.min(8, h) }));   // (h: how tall it is drawn, in rows: someone standing just behind it seems to stand on it)
      }
      return baseMemo.get(t.id);
    },
    door(t) { if (!doorMemo.has(t.id)) doorMemo.set(t.id, _vfrDoorOf(t)); return doorMemo.get(t.id); },
    ground(type, x, y, r, rng) {
      for (let k = 0; k < 24; k++) { const a = rng() * Math.PI * 2, d = 0.8 + rng() * r, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7; if (typeof gardenTerrainAt === 'function' && gardenTerrainAt(px, py) === type && free(px, py) && _vfrOpenAt(px, py, m)) return { x: Math.round(px * 4) / 4, y: Math.round(py * 4) / 4 }; }
      return null;
    },
    public(x, y) { return _vfrOpenAt(x, y, m); },
    open(t) { return _vfrOpenAt(t.x, t.y - 0.2, m); },
    walkable(x, y, s, t) {
      if (s && (s.seat || s.pierEnd)) return true;
      // (an edge to lean on is stood at only where the feet can be: a wheel pit's wall stands in water)
      if (!(s && s.edge) && !(free(x, y) || (typeof _gwNearestFreePt === 'function' && !!_gwNearestFreePt(x, y, 0.35)))) return false;
      return _vfrClearOfThings(C, x, y, t && t.id);   // (rule 12: never behind a notice board, so as to stand on its roof, nor over another thing's foot)
    },
    season: m.season, rain: !!(m.rain && m.rain.now), snow: !!(m.rain && m.rain.snow),
  };
  return C;
}
/** Things a figure may stand on or beside freely (flat ground things); everything else is drawn and must not be overlapped. */
function _vfrFlat(t) { const K = (t && GARDEN_KINDS[t.kind]) || {}; return !t.kind || K.solid === 'free' || /^(pier|bridge|fishing-bank|ball|leaf-pile|log|stepping|road|plaza|path|field|plot|pond|crossing|ford)/.test(t.kind); }
/** Can a standing figure be here without covering a thing or being hidden behind it (rule 12)? The figure is about 0.6 cells wide and
 *  a little over a cell tall; a thing's drawn width is its own (a tree only its trunk). skip: the thing they are at. */
function _vfrClearOfThings(C, x, y, skip) {
  for (const t of C.things) {
    if (t.id === skip || Math.abs(t.x - x) > 8 || t.y - y > 9 || y - t.y > 1 || _vfrFlat(t)) continue;
    const tree = /tree|oak|trunk/.test(t.kind), B = C.base(t), hw = (tree ? 0.5 : (B.w || 1) / 2) + 0.3, up = tree ? 1.4 : Math.max(1.4, (B.h || 1.2) + 0.6);
    if (Math.abs(x - B.x) < hw && y > B.y - up && y < B.y + 0.8) return false;
  }
  return true;
}
/** Stand points for side-on figures: a stand right in front of a thing (a notice board read face on) covers its foot and shows the
 *  figure's back or side to it, so it is moved to stand beside the thing, at its foot, turned to it; one on each side (the booking
 *  takes one). Seats, banks and pier ends are kept. Every stand also says what the figure turns to (look: the thing's drawn middle). */
function _vfrSideOn(spots, B, kind) {
  const out = [], hw = (B.w || 1) / 2;
  for (const q of spots) {
    const st = q.stand;
    // fishing from a deck wider than a figure: at its edge, on either side, facing out over the water (never mid-deck, the line on the boards)
    if (st && /^(dangle|fishsit|fishsitfront|fish)$/.test(q.act) && !q.edge && /pier|jetty|dock/.test(kind || '') && hw > 0.6) { for (const sd of [-1, 1]) out.push(Object.assign({}, q, { stand: { x: B.x + sd * (hw - 0.34), y: st.y }, look: { x: B.x + sd * (hw + 3), y: st.y }, edgeSide: sd, mid: B.x })); continue; }
    if (!st || q.seat || q.edge || q.pierEnd) { out.push(q); continue; }
    if (Math.abs(st.x - B.x) < hw + 0.2 && st.y > B.y - 1.4 && st.y < B.y + 1.0) { for (const sd of [-1, 1]) out.push(Object.assign({}, q, { stand: { x: B.x + sd * (hw + 0.5), y: B.y + 0.12 }, look: { x: B.x, y: B.y }, side: sd })); }
    else out.push(Object.assign({}, q, { look: q.look || { x: B.x, y: B.y } }));
  }
  return out;
}
/** Who lives in the vale today: the eight and Perpetua (a resident's own `here` and the gentle telling still count). */
function _vfrRows(m) {
  return VALE_FOLK.filter(r => {
    if (r.resident && typeof WD_TALE_RESIDENTS !== 'undefined') { const R = WD_TALE_RESIDENTS.get(r.id); if (R && R.deep && typeof _wtDeep === 'function' && !_wtDeep()) return false; if (R && typeof R.here === 'function') { try { if (!R.here(m)) return false; } catch (e) { return false; } } }
    return true;
  });
}
/* ---------- homes and the day's plans ---------- */
function _vfrBegin(m) {
  const ctx = _vfrCtx(m), rows = _vfrRows(m), W = _wdG(), saved = {};
  for (const r of rows) if (W['vh.' + r.id]) saved[r.id] = W['vh.' + r.id];
  const homes = valeFolkSolveHomes(rows, ctx.things, saved, Object.assign({}, ctx, { open: null }));
  const today = m.today; let dirty = false;
  for (const [id, hid] of homes) if (W['vh.' + id] !== hid) { W['vh.' + id] = hid; W['vm.' + id] = today; dirty = true; }
  if (dirty) _wdSave();
  _vfr.homes = new Map(); _vfr.away = new Set();
  // the way in to the vale: the arrival road's first point (where visitors come ashore), else the arrival point itself
  const road = (() => { let p = null; try { const r = typeof gardenIslandArrivalRoad === 'function' ? gardenIslandArrivalRoad() : null; const q = r && (r.entry || (r.points && r.points[0])); p = Array.isArray(q) ? { x: q[0], y: q[1] } : q && Number.isFinite(q.x) ? q : null; } catch (e) { p = null; } const st = GARDEN_WORLD.start; return { id: 'road', kind: 'road', x: p ? p.x : st.x + 0.5, y: p ? p.y : st.y + 0.5 }; })();
  for (const r of rows) {
    const t = ctx.things.find(q => q.id === homes.get(r.id));
    if (t && ctx.open(t)) _vfr.homes.set(r.id, t);
    else { _vfr.homes.set(r.id, road); _vfr.away.add(r.id); }   // their own home is in land not open yet: by day from the road
  }
  _vfr.ctx = ctx; _vfr.rows = rows; _vfr.day = today; _vfr.book = new Map(); _vfr.plans = new Map(); _vfr.queue = rows.slice();
  _vfr.key = _vfrKey(m);
}
function _vfrKey(m) { return [m.today, (m.areas || []).length, m.season, m.rain && m.rain.now ? 1 : 0, typeof _vfpGridKey === 'function' ? _vfpGridKey() : ''].join('|'); }
/** One villager's plan (a frame's work; at most a few ms). */
function _vfrPlanOne(m) {
  const row = _vfr.queue.shift(); if (!row) return;
  const t0 = performance.now(), ctx = _vfr.ctx;
  const plan = valeFolkPlanAll([row], Object.assign({}, ctx, { day: m.today, weekday: _vfrWeekday(m.today), homes: _vfr.homes, book: _vfr.book, away: _vfr.away }));
  let p = plan.get(row.id) || [];
  // travelling (home not open yet): the night's and the inside hours are off the map, by the road
  if (_vfr.away.has(row.id)) p = p.map(e => e.inside ? Object.assign({}, e, { offmap: true }) : e);
  // the angler's tell: on a deck's edge he takes the side that puts his back to the moving water (the mirror of the planned side; one
  // villager to a thing, so the other side is his too)
  if (row.id === 'angler') p = p.map(e => { const sp = e.spot; if (e.act !== 'fish' || !sp || !sp.edgeSide || !Number.isFinite(sp.mid)) return e; const f = _vfrAwayFromRiver(sp.x, sp.y); if (!f || f === sp.edgeSide) return e; return Object.assign({}, e, { spot: Object.assign({}, sp, { x: 2 * sp.mid - sp.x, at: { x: 2 * sp.mid - sp.at.x, y: sp.at.y }, edgeSide: -sp.edgeSide }) }); });
  _vfr.plans.set(row.id, p);
  const ms = performance.now() - t0; _vfr.stats.plan += ms; if (ms > _vfr.stats.planMax) _vfr.stats.planMax = ms;
}
/* ---------- each villager ---------- */
function _vfrV(id) {
  let V = _vfr.V.get(id);
  if (!V) { V = { id, row: VALE_FOLK_ROW.get(id), x: null, y: null, face: 1, path: null, pathFor: '', asking: '', S: null, entry: null, hold: null, pose: '', inside: false, aside: null, mark: false }; _vfr.V.set(id, V); }
  return V;
}
/** Where the plan puts them now: { x, y, e, walking, inside } (off screen: along the leg, in a straight line). */
function _vfrWhere(id, minute) {
  const plan = _vfr.plans.get(id), at = valeFolkAt(plan, minute); if (!at || !at.e.spot) return null;
  const e = at.e, to = e.spot;
  if (at.walking && at.prev && at.prev.spot) { const a = at.prev.spot, k = at.along; return { x: a.x + (to.x - a.x) * k, y: a.y + (to.y - a.y) * k, e, walking: true, inside: false, along: k }; }
  return { x: to.x, y: to.y, e, walking: false, inside: !!e.inside };
}
function _vfrView() { try { const v = _glCamView(); return v; } catch (e) { return { x0: _gw.px - 12, x1: _gw.px + 12, y0: _gw.py - 9, y1: _gw.py + 9 }; } }
function _vfrNearView(x, y, v, pad) { return x > v.x0 - pad && x < v.x1 + pad && y > v.y0 - pad && y < v.y1 + pad; }
/* ---------- drawing ---------- */
const _vfrArt = new Map();
function _vfrMarkup(V, pose, walk, face, mark) {
  const cast = V.row.cast, k = cast + '|' + pose + '|' + (walk ? 1 : 0) + '|' + face + '|' + (mark ? 1 : 0);
  let s = _vfrArt.get(k); if (s != null) return s;
  let fig = typeof gardenCastSvg === 'function' ? gardenCastSvg(cast, { walk }) : '';
  if (!fig) fig = typeof _wdFolkArt === 'function' && typeof WD_FOLK_ROW !== 'undefined' && WD_FOLK_ROW.get(V.id) ? _wdFolkArt(WD_FOLK_ROW.get(V.id)) : '';
  // (fishing is done standing at the edge with the rod out: a side-on figure sat with its legs out over a deck reads as floating over the boards)
  const cls = { sit: 'gca-sit', read: 'gca-read', rub: 'gca-sit gca-rub', talk: 'gca-talk', sittalk: 'gca-sit gca-talk' }[pose] || '';
  if (cls) fig = fig.replace(/class="gca gca-(walk|idle)/, 'class="gca gca-$1 ' + cls);
  if (face < 0) fig = fig.replace('<g class="wd-flip">', '<g class="wd-flip" transform="scale(-1 1)">');
  // a rod and line for those who fish without one of their own (the angler's own picture has his rod and line: nothing is added to it)
  let extra = '';
  if (pose === 'fish' && cast !== 'angler') extra = `<path d="M${face * 6} -22L${face * 34} -52" stroke="#6e4c2a" stroke-width="1.6" stroke-linecap="round"/><path d="M${face * 34} -52Q${face * 64} -24 ${face * 88} 16" stroke="#f4f4ea" stroke-width=".5" fill="none" opacity=".8"/>`;
  const top = typeof gardenCastTop === 'function' ? gardenCastTop(cast) : 50;
  const m = mark ? `<g class="wd-mark" transform="translate(0 ${-top - 8})"><rect x="-9" y="-6" width="18" height="11" rx="5.5" fill="#fffdf4" stroke="#6a5a44" stroke-width="0.6"/><circle cx="-4" cy="-0.5" r="1.1" fill="#6a5a44"/><circle cy="-0.5" r="1.1" fill="#6a5a44"/><circle cx="4" cy="-0.5" r="1.1" fill="#6a5a44"/></g>` : '';
  s = gardenActorSized(fig + extra + m);
  if (_vfrArt.size > 160) _vfrArt.clear();
  _vfrArt.set(k, s); return s;
}
/** How far up a seated villager is lifted (world px): the seat's height less their hip's. */
function _vfrSeatLift(V, spot) {
  const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, seat = spot && spot.seat ? spot.seat : 0.36, seatPx = S * 70 * seat * 0.8;
  const top = typeof gardenCastTop === 'function' ? gardenCastTop(V.row.cast) : 50, hip = top * 0.3 * (typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.6);
  return Math.max(0, Math.round(seatPx - hip));
}
function _vfrShow(V) {
  if (V.S) return;
  V.S = wdSprite({ id: 'vf-' + V.id, x: V.x, y: V.y, hit: 0.75, hitUp: 16, label: V.row.name, cursor: 'hand', ground: true, foot: 0.2, svg: '', lift: 0,
    update() { }, onClick: () => gardenFolkTalkTo(V.id) });
  V.drawn = ''; V.alpha = 0;
}
function _vfrHide(V) { if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } V.S = null; } V.drawn = ''; }
function _vfrDraw(V, walking) {
  const S = V.S; if (!S) return;
  const e = V.entry, at = !walking && e && V.arrived;
  let pose = 'idle';
  if (V.hold || V.greet) pose = at && e.clip === 'sit' ? 'sittalk' : 'talk';   // (sat down, they talk from the seat)
  else if (at && e.clip === 'sit') pose = V.id === 'bramble' && V.rubbing ? 'rub' : 'sit';
  else if (at && e.clip === 'fish') pose = 'fish';
  else if (at && e.clip === 'read') pose = 'read';
  const mark = !!V.mark && !V.hold, face = V.face < 0 ? -1 : 1, k = pose + (walking ? 'w' : '') + face + (mark ? 'm' : '');
  if (V.drawn !== k) { V.drawn = k; wdArt(S, _vfrMarkup(V, pose, walking && !V.hold, face, mark)); }
  S.x = V.x; S.y = V.y;
  const sat = pose === 'sit' || pose === 'rub' || pose === 'sittalk';
  S.lift = sat ? _vfrSeatLift(V, e && e.spot) : 0;
  S.z = sat && e && e.spot && e.spot.at ? e.spot.at.y + 0.02 : null;   // (sat on a seat: drawn on it, in front of its back rail)
}
/* ---------- walking ---------- */
function _vfrAsk(V, to, pri) {
  const key = to.x.toFixed(2) + ',' + to.y.toFixed(2);
  if (V.pathFor === key && (V.path || V.asking === key)) return;
  V.asking = key; V.pathFor = key; V.path = null;
  const from = { x: V.x, y: V.y };
  gardenFolkPathAsk(from, to, (pts) => { if (V.asking !== key) return; V.asking = ''; V.path = pts ? pts.slice() : [{ x: to.x, y: to.y }]; V.noWay = !pts; });
  const last = _vfp.jobs[_vfp.jobs.length - 1]; if (last) last.pri = pri || 0;
}
/** One frame's step along their path; true when they are there. */
function _vfrStep(V, dt, speedMul) {
  if (!V.path) return false;
  const G = GARDEN_WORLD, sp = VALE_FOLK_SPEED * (V.row.speed || 1) * (speedMul || 1);
  let left = sp * dt;
  while (left > 0 && V.path.length) {
    const p = V.path[0], dx = (p.x - V.x) * G.cellW, dy = (p.y - V.y) * G.cellH, d = Math.hypot(dx, dy);
    if (d <= left) { V.x = p.x; V.y = p.y; V.path.shift(); left -= d; continue; }
    const nx = V.x + dx / d * left / G.cellW, ny = V.y + dy / d * left / G.cellH;
    if (_vfrIntoYou(V, nx, ny)) { const now = performance.now(); if (!V.bumpT) V.bumpT = now; else if (now - V.bumpT > 900) { V.bumpT = 0; _vfrRoundYou(V); } V.waiting = true; return false; }
    V.bumpT = 0; V.waiting = false;
    V.x = nx; V.y = ny; if (Math.abs(dx) > 0.5) V.face = dx > 0 ? 1 : -1; left = 0;
  }
  return !V.path.length;
}
/** Can a standing figure be here: the feet free with room for its width, clear of every drawn thing but `skip`, in open land. */
function _vfrBodyOk(x, y, skip) {
  if (typeof _gwFree === 'function' && !(_gwFree(x, y, 0.04) && _gwFree(x - 0.28, y) && _gwFree(x + 0.28, y))) return false;
  if (_vfr.ctx && !_vfrClearOfThings(_vfr.ctx, x, y, skip || '')) return false;
  return !_vfr.m || _vfrOpenAt(x, y, _vfr.m);
}
/** Where to stand to talk to someone at tx, ty: side by side at talking distance (the figures are side-on), clear of everything, the
 *  nearest such place to where they are now. null: nowhere clear (they talk from where they are). */
function _vfrTalkSpot(V, tx, ty) {
  let best = null, bd = Infinity;
  for (const [ox, oy, w] of [[1.3, 0, 0], [-1.3, 0, 0], [1.25, 0.4, 0.4], [-1.25, 0.4, 0.4], [1.25, -0.4, 0.5], [-1.25, -0.4, 0.5], [1.6, 0.15, 0.3], [-1.6, 0.15, 0.3], [1.0, 0.9, 1], [-1.0, 0.9, 1]]) {
    const x = tx + ox, y = ty + oy;
    if (!_vfrBodyOk(x, y, '')) continue;
    if (_vfr.list && _vfr.list.some(O => O !== V && O.S && !O.inside && Math.hypot(O.x - x, (O.y - y) * 1.6) < 0.8)) continue;
    const d = Math.hypot(x - V.x, y - V.y) + w; if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
/** The folk are solid to your feet (94-garden-world-0walk.js asks while you walk): an oval round each one's feet that you cannot walk
 *  into. A step that takes you out of one is always allowed, so nobody can pin you. A guest's copy of the host's folk counts too. */
function gardenFolkBlocks(x, y) {
  if (typeof _gw === 'undefined') return false;
  const L = _vfr.on ? _vfr.list : (_vfg.V.size ? [..._vfg.V.values()] : null); if (!L) return false;
  for (const V of L) {
    if (!V.S || V.inside || V.x == null) continue;
    const ex = (x - V.x) / VFR_BODY.x, ey = (y - V.y) / VFR_BODY.y, e = ex * ex + ey * ey; if (e >= 1) continue;
    const ox = (_gw.px - V.x) / VFR_BODY.x, oy = (_gw.py - V.y) / VFR_BODY.y; if (e < ox * ox + oy * oy - 1e-6) return true;
  }
  return false;
}
const VFR_BODY = Object.freeze({ x: 0.5, y: 0.3 });
/** Would a villager stepping to x, y walk into you? Then they wait, and after a moment go round you. */
function _vfrIntoYou(V, x, y) {
  if (typeof _gw === 'undefined' || V.hold) return false;
  const ex = (x - _gw.px) / VFR_BODY.x, ey = (y - _gw.py) / VFR_BODY.y, e = ex * ex + ey * ey; if (e >= 1) return false;
  const ox = (V.x - _gw.px) / VFR_BODY.x, oy = (V.y - _gw.py) / VFR_BODY.y; return e < ox * ox + oy * oy;
}
function _vfrRoundYou(V) {
  const p = V.path && V.path[0]; if (!p) return;
  const dx = p.x - V.x, dy = p.y - V.y, n = Math.hypot(dx, dy) || 1;
  for (const s of [1, -1]) { const q = { x: _gw.px - dy / n * 0.9 * s, y: _gw.py + dx / n * 0.6 * s }; if (_vfrBodyOk(q.x, q.y, '') ) { V.path.unshift(q); return; } }
}
/* ---------- tells: what people do ---------- */
const VALE_TELLS = Object.freeze({
  'back-to-water': 'The old angler fishes with his back to the moving water. Every time.',
  'steps-aside': 'Hollin stepped off the path when someone came the other way, and waited.',
  'rub-out': 'Bramble sat down and rubbed out the same corner of his map again.',
});
function _vfrTellSeen(id, V) {
  const W = _wdG(), k = 'vt.' + id; if (W[k]) return;
  if (!V || !V.S || typeof _gw === 'undefined' || Math.hypot(V.x - _gw.px, (V.y - _gw.py) * 1.3) > 9) return;
  W[k] = _wdToday(); _wdSave();
  try { gardenToast('In your journal: ' + VALE_TELLS[id]); } catch (e) { /* quiet */ }
}
/** The way the angler faces on his spot: away from the nearest moving water (the layout's rivers), until the story turns him round. */
function _vfrAwayFromRiver(x, y) {
  let best = null, bd = Infinity;
  try { const R = (gardenIslandData().presentation || {}).rivers || {}; for (const r of Array.isArray(R) ? R : Object.values(R)) { const pts = (r && (r.points || r.path || r.line)) || []; for (const p of pts) { const px = Array.isArray(p) ? p[0] : p.x, py = Array.isArray(p) ? p[1] : p.y; const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; } } } } catch (e) { best = null; }
  return best ? (best.x > x ? -1 : 1) : null;
}
function _vfrBackToWater(V, e) {
  if (V.id !== 'angler' || !e || e.act !== 'fish' || !e.spot || (typeof wdTaleFlag === 'function' && wdTaleFlag('mill.end'))) return null;
  if (e._away === undefined) e._away = _vfrAwayFromRiver(e.spot.x, e.spot.y);
  return e._away;
}
/** Which way someone faces on their spot (pure: worked out wherever they are, on screen or off, so someone you walk up to already faces
 *  the way their place says). */
function _vfrFaceAt(V, e) {
  const sp = e && e.spot; if (!sp) return V.face;
  const bw = _vfrBackToWater(V, e); if (bw) return bw;
  if (sp.at) { if (Math.abs(sp.at.x - sp.x) > 0.25) return sp.at.x > sp.x ? 1 : -1; }
  if (sp.deg != null) { const d = ((sp.deg % 360) + 360) % 360; if (d < 80 || d > 280) return 1; if (d > 100 && d < 260) return -1; }
  return V.face;
}
/** Two folk meeting on a path: the relationship table says what they do. 'no': the one who steps aside leaves the path a little and waits. */
function _vfrCrossings(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (!a.S || !b.S || a.inside || b.inside) continue;
    const d = Math.hypot(a.x - b.x, (a.y - b.y) * 1.3); if (d > 2.6) continue;
    const who = valeFolkAside(a.id, b.id);
    if (!who) {
      // close friends meeting on the way stop for a word (the relationship table's 'close'), once an hour of play for a pair
      if (valeFolkRel(a.id, b.id) !== 'close' || a.hold || b.hold || a.greet || b.greet || !(a.path && a.path.length) || !(b.path && b.path.length) || d > 1.9) continue;
      const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id, now = performance.now(); _vfr.greeted = _vfr.greeted || new Map();
      if (now - (_vfr.greeted.get(k) || -1e9) < 3600e3) continue; _vfr.greeted.set(k, now);
      a.greet = { until: now + 2600, other: b.id }; b.greet = { until: now + 2600, other: a.id };
      continue;
    }
    const V = who === a.id ? a : b, O = V === a ? b : a;
    if (V.aside || !V.path || !V.path.length || V.hold) continue;
    // off to the side of the way, at right angles to where they were going, onto the first ground clear of it
    const p = V.path[0], dx = p.x - V.x, dy = p.y - V.y, n = Math.hypot(dx, dy) || 1;
    for (const s of [1, -1]) { const q = { x: V.x - dy / n * 1.1 * s, y: V.y + dx / n * 1.1 * s }; if (typeof _gwFree !== 'function' || _gwFree(q.x, q.y)) { V.aside = { q, until: performance.now() + 5200, other: O.id, path: V.path }; V.path = [q]; V.face = O.x > V.x ? 1 : -1; break; } }
    if (V.aside) _vfrTellSeen('steps-aside', V);
  }
}
/** Narrow crossings (a bridge, anything of a kind marked narrow): one walker at a time. Someone about to step on while another is on it
 *  waits at their end, at most a few seconds (they never wait in a doorway: the wait is only at a crossing). */
const VFR_NARROW = Object.freeze(['bridge']);
function _vfrCrossingWait(V, list, now) {
  const C = _vfr.ctx; if (!C || !V.path || !V.path.length) return false;
  if (!C.narrow) C.narrow = C.things.filter(t => VFR_NARROW.includes(t.kind));
  for (const t of C.narrow) {
    const r = Math.max(0.9, (t.w || 1) / 2 + 0.3), mine = Math.hypot(V.x - t.x, V.y - t.y + 0.3);
    if (mine < r - 0.2 || mine > r + 0.9) continue;   // already on it, or not near it
    const next = V.path[0]; if (Math.hypot(next.x - t.x, next.y - t.y + 0.3) > mine) continue;   // walking away from it
    if (!list.some(O => O !== V && O.S && !O.inside && Math.hypot(O.x - t.x, O.y - t.y + 0.3) < r)) { V.waitAt = 0; continue; }
    if (!V.waitAt) V.waitAt = now;
    if (now - V.waitAt < 6000) return true;
  }
  return false;
}
/** Off screen, walking a leg: the way they face is the way the leg goes. */
function at_prevDir(w) { const P = w.e && w.e.spot; return P && Number.isFinite(w.x) && Math.abs(P.x - w.x) > 0.05 ? (P.x > w.x ? 1 : -1) : 0; }
/* ---------- the frame ---------- */
function _vfrFrame(dt) {
  if (!_vfr.on) return;
  const f0 = performance.now();
  const walking = typeof wdWalkingLately === 'function' ? wdWalkingLately() : false;
  try { if (typeof gardenFolkPathPump === 'function') gardenFolkPathPump(walking ? VFR_MS_WALK : VFR_MS_IDLE); } catch (e) { console.error('[folk path]', e); }
  _vfr.t += dt;
  const m = _vfr.m; if (!m) return;
  // plan one villager a frame, never while you walk (rule 8)
  if (_vfr.queue.length && !walking) _vfrPlanOne(m);
  const minute = _vfrMinute(), v = _vfrView(), now = performance.now(), list = [];
  for (const row of _vfr.rows || []) {
    if (!_vfr.plans.has(row.id)) continue;
    const V = _vfrV(row.id), w = _vfrWhere(row.id, minute); if (!w) continue;
    list.push(V);
    if (V.x == null) { V.x = w.x; V.y = w.y; V.inside = w.inside || !!w.e.offmap; }
    if (V.entry !== w.e) { V.entry = w.e; V.arrived = false; V.rubbing = false; V.path = null; V.pathFor = ''; }
    const e = V.entry, to = e.spot, near = _vfrNearView(V.x, V.y, v, VFR_NEAR) || _vfrNearView(to.x, to.y, v, VFR_NEAR) && !e.inside;
    // a teller on their way to you: their visit stands in for the plan until you talk, or it runs out
    const goal = V.visit && now < V.visit.until ? V.visit : null; if (V.visit && !goal) { V.visit = null; V.mark = false; }
    const dest = goal ? goal.at : to;
    if (V.hold && !V.S && !V.inside && near) _vfrShow(V);   // (held while off the page: drawn as soon as you look)
    if (V.hold) { if (now > V.hold.until || (V.hold.by == null && typeof _wd !== 'undefined' && !_wd.talk && now - V.hold.t0 > 1500) || (V.hold.A && !_gll.actors.has(V.hold.by))) { V.hold = null; V.drawn = ''; } else { const tx = V.hold.A ? V.hold.A.x : _gw.px, ty = V.hold.A ? V.hold.A.y : _gw.py;
      // (stopped too close, on your feet: a step back first, to talking distance, then turn to you)
      if (V.S && !V.hold.step && !V.hold.stepped && (Math.hypot(V.x - tx, (V.y - ty) * 1.3) < 1.1 || !_vfrBodyOk(V.x, V.y, V.entry && V.arrived && V.entry.spot ? V.entry.spot.src : ''))) { V.hold.stepped = 1; const q = _vfrTalkSpot(V, tx, ty); if (q) V.hold.step = q; }
      if (V.hold.step) { V.path = [V.hold.step]; if (_vfrStep(V, dt, 0.8)) V.hold.step = null; _vfrDraw(V, !!(V.path && V.path.length)); continue; }
      V.face = tx > V.x ? 1 : -1; if (V.S) _vfrDraw(V, false); continue; } }
    if (!near && !V.S) {
      // off screen: where the plan says, in a straight line along the leg (nothing walked frame by frame)
      if (!goal) { V.x = w.x; V.y = w.y; V.inside = w.inside || !!e.offmap; V.arrived = !w.walking; if (V.arrived) V.face = _vfrFaceAt(V, e); else if (w.e && at_prevDir(w)) V.face = at_prevDir(w); }
      else { V.inside = false; const G = GARDEN_WORLD, dx = (goal.at.x - V.x) * G.cellW, dy = (goal.at.y - V.y) * G.cellH, d = Math.hypot(dx, dy), st = VALE_FOLK_SPEED * (V.row.speed || 1) * dt; if (d > st) { V.x += dx / d * st / G.cellW; V.y += dy / d * st / G.cellH; } }   // (on the way over to you, off screen: along a straight line until the view is near, then on the path)
      continue;
    }
    if (V.inside && !(e.inside && !goal)) { V.inside = false; V.x = to && V.entry.inside ? V.x : V.x; }   // out of the door (they were in; now their plan takes them out)
    if (V.inside) { _vfrHide(V); continue; }
    if (!near && V.S && !V.path) { _vfrHide(V); continue; }
    _vfrShow(V);
    if (V.greet) { if (now > V.greet.until || V.hold) V.greet = null; else { const O = _vfr.V.get(V.greet.other); if (O) V.face = O.x > V.x ? 1 : -1; _vfrDraw(V, false); continue; } }   // (two who are close stop to pass the time of day)
    if (V.aside) { if (now > V.aside.until) { V.path = null; V.pathFor = ''; V.aside = null; } else { if (V.path && V.path.length) _vfrStep(V, dt, 0.8); _vfrDraw(V, !!(V.path && V.path.length)); continue; } }
    const there = Math.hypot((dest.x - V.x) * 48, (dest.y - V.y) * 30) < 3;
    if (!there) {
      _vfrAsk(V, dest, _vfrNearView(V.x, V.y, v, 0) ? 2 : 1);
      // the plan says they should have arrived long ago (a path was slow, a talk held them): a little quicker, never a jump in view
      const late = !goal && !w.walking ? 1.35 : 1;
      const wait = !!V.path && _vfrCrossingWait(V, list, now);
      if (V.path && !wait) _vfrStep(V, dt, late);
      V.arrived = false;   // (arriving is the next frame's: there, they take their pose)
      _vfrDraw(V, !wait && !V.waiting && !!(V.path && V.path.length));   // (waiting for you to pass: stood still, never walking on the spot)
    } else {
      V.x = dest.x; V.y = dest.y; V.path = null;
      if (!V.arrived) { V.arrived = true; V.face = goal ? (_gw.px > V.x ? 1 : -1) : _vfrFaceAt(V, e); if (V.id === 'bramble' && e.clip === 'sit') { V.rubbing = true; V.rubT = now; } }
      if (V.rubbing && now - V.rubT > 3800) { V.rubbing = false; V.drawn = ''; _vfrTellSeen('rub-out', V); }
      if (!goal && e.inside) { V.inside = true; _vfrHide(V); continue; }   // in at the door
      if (!goal && e.offmap) { V.inside = true; _vfrHide(V); continue; }
      _vfrDraw(V, false);
      const bw = V.arrived && V.S ? _vfrBackToWater(V, e) : null; if (bw && V.face === bw) _vfrTellSeen('back-to-water', V);
    }
  }
  _vfrCrossings(list);
  _vfr.list = list;
  _vfrHostSend(now);
  const ms = performance.now() - f0; _vfr.stats.frames++; if (ms > _vfr.stats.frameMax) _vfr.stats.frameMax = ms;
}
/* ---------- tellers: someone with a story comes to you ---------- */
function _vfrTellerTick(m) {
  if (m.visit || !_vfr.rows || _wd.talk || (typeof wdWalkingLately === 'function' && wdWalkingLately())) return;
  const W = _wdG(), today = m.today; if (W.vtl && W.vtl.d === today) { const V = _vfr.V.get(W.vtl.id); if (V && V.visit) return; if (W.vtl.done || W.vtl.went) return; }
  if (typeof wdTaleFor !== 'function') return;
  for (const row of _vfr.rows) {
    if (row.id === 'angler') continue;   // he stays on his pier: he lifts his hat to you (94-garden-wonder-1kin.js) and the story starts there
    let t = null; try { t = wdTaleFor(row.id, m); } catch (e) { t = null; }
    if (!t || t.b.heavy || (t.b.when && t.b.when.home)) continue;   // heavy beats wait for their calm hour at home
    const V = _vfr.V.get(row.id); if (!V || V.inside || V.x == null) continue;
    // a public spot near you that they can walk to (never on your own feet, never in land you have not opened)
    const at = _vfrTalkSpot(V, _gw.px, _gw.py);   // (side by side, clear of everything, in open land)
    if (!at) return;
    _vfrSendOver(V, row, at, m, 'something to tell you');
    return;
  }
  // nobody has a story piece waiting: the day's visitor (the old daily caller's pick, with their request, favour and thanks: the talk is
  // theirs, 94-garden-wonder-1folk.js) comes over instead, so a new garden still gets its daily visit (everything rewards)
  if (_wd.t < 22) return;   // (as the old caller: not in your first moments in the garden)
  let r = null; try { r = typeof _wdFolkPick === 'function' ? _wdFolkPick(m) : null; } catch (e) { r = null; }
  if (!r || !_vfr.rows.some(q => q.id === r.id)) return;
  const V = _vfr.V.get(r.id), e = V && V.entry; if (!V || V.x == null || (e && e.act === 'sleep')) return;
  const at = _vfrTalkSpot(V, _gw.px, _gw.py); if (!at) return;
  _vfrSendOver(V, VALE_FOLK_ROW.get(r.id), at, m, 'something to ask you');
}
function _vfrSendOver(V, row, at, m, what) {
  const W = _wdG();
  V.visit = { at, until: performance.now() + 8 * 60000 }; V.mark = true; V.path = null; V.pathFor = '';
  W.vtl = { d: m.today, id: row.id, went: 1 }; _wdSave();
  if (Math.hypot(V.x - _gw.px, V.y - _gw.py) > 8) try { wdAmbient(`${row.name} is on the way over. They look as if they have ${what}.`, 9000, 'folk'); } catch (e) { /* quiet */ }
}
/* ---------- the prompt and talking ---------- */
function gardenFolkActRows(px, py) {
  if (!_vfr.on && typeof _gll !== 'undefined' && _gll.role === 'visit') { const out = []; for (const V of _vfg.V.values()) if (V.S && Math.hypot(V.x - px, (V.y - py) * 1.3) <= 2) out.push({ key: 'folk:' + V.id, act: 'talk', folk: V.id, words: 'Talk to ' + V.row.name.replace(/^The /, 'the '), name: V.row.name, x: V.x, y: V.y, promptY: V.y - 2.2, pri: 0.9 }); return out; }
  if (!_vfr.on || !_vfr.list) return [];
  const out = [];
  for (const V of _vfr.list) {
    if (V.inside) {
      // at home, indoors: knock at their door
      const H = _vfr.homes.get(V.id); if (!H || H.kind === 'road' || V.entry && V.entry.offmap) continue;
      const d = _vfr.ctx && _vfr.ctx.door(H); if (!d || Math.hypot(d.x - px, (d.y - py) * 1.3) > 1.6) continue;
      out.push({ key: 'folk-knock:' + V.id, act: 'talk', folk: V.id, knock: 1, words: H.kind === 'postbox' ? '' : `Knock on ${V.row.name.replace(/^The /, 'the ')}’s door`, name: V.row.name, x: d.x, y: d.y, pri: 0.6 });
      continue;
    }
    if (!V.S) continue;
    if (Math.hypot(V.x - px, (V.y - py) * 1.3) > 2.2) continue;
    out.push({ key: 'folk:' + V.id, act: 'talk', folk: V.id, words: 'Talk to ' + V.row.name.replace(/^The /, 'the '), name: V.row.name, x: V.x, y: V.y, promptY: V.y - ((typeof gardenCastTop === 'function' ? gardenCastTop(V.row.cast) : 50) * (typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.6) + (V.S ? V.S.lift || 0 : 0) + 10) / GARDEN_WORLD.cellH, pri: 0.9 });   // (the prompt over their head, not on it)
  }
  return out.filter(r => r.words);
}
/** A stand-in for the old caller sprite, so their talk code (94-garden-wonder-1folk.js) runs as it always did. */
function _vfrProxy(V) { return { row: WD_FOLK_ROW.get(V.id), x: V.x, y: V.y, svg: '', node: null, gave: V.gave, path: [], home: { x: V.x, y: V.y }, remove() { }, set hold(v) { } }; }
function gardenFolkTalkTo(id) {
  if (typeof _gll !== 'undefined' && _gll.role === 'visit' && _vfg.V.has(id)) return gardenFolkGuestTalk(id);
  const V = _vfr.V.get(id); if (!V) return false;
  const m = gardenHere(); if (m.visit) { if (typeof gardenFolkGuestTalk === 'function') return gardenFolkGuestTalk(id); return false; }
  if (V.inside) {
    // a knock: "Coming!", and out they come to the step
    const H = _vfr.homes.get(id), d = H && _vfr.ctx.door(H); if (!d) return false;
    try { wdAmbient('“Coming!”', 2200, 'folk'); } catch (e) { /* quiet */ }
    // (out of the door standing, then a step to stand beside you: never sat on the doorstep under your feet behind the talk card)
    V.inside = false; V.x = d.x; V.y = d.y; V.arrived = false; V.hold = { t0: performance.now(), until: performance.now() + 90000 };
    const q = _vfrTalkSpot(V, _gw.px, _gw.py); if (q) { V.hold.step = q; V.hold.stepped = 1; }
    _vfrShow(V); _vfrDraw(V, !!q);
    setTimeout(() => gardenFolkTalkTo(id), 700);
    return true;
  }
  V.hold = { t0: performance.now(), until: performance.now() + 90000 }; V.face = _gw.px > V.x ? 1 : -1; V.path = null; V.pathFor = '';
  if (V.visit) { V.visit = null; V.mark = false; const W = _wdG(); if (W.vtl && W.vtl.id === id) { W.vtl.done = 1; _wdSave(); } }
  try { if (typeof gardenLiveFolkTalk === 'function') gardenLiveFolkTalk(id); } catch (e) { /* alone */ }
  if (V.S) _vfrDraw(V, false);
  try {
    if (id === 'angler') { if (!(typeof wdAnglerTalk === 'function' && wdAnglerTalk({ door: { x: V.x - 0.5, y: V.y - 0.5 } }))) gardenPopupOpen('catch', { sub: 'lake', title: 'The old angler' }); return true; }
    if (WD_FOLK_ROW.get(id)) { const P = _vfrProxy(V); _wdFolkTalk(P); V.gave = P.gave; return true; }
    if (typeof WD_TALE_RESIDENTS !== 'undefined' && WD_TALE_RESIDENTS.get(id)) { _wtResTalk(WD_TALE_RESIDENTS.get(id), { x: V.x, y: V.y }); return true; }
    if (id === 'perpetua') { _vfrPerpetuaTalk(V, m); return true; }
  } catch (e) { console.error('[folk talk]', e); }
  return false;
}
const VFR_PERPETUA_DAY = Object.freeze([
  { if: F => F.rain, t: 'Rain. Lovely. The post goes quicker in the rain. That is a lie. It goes exactly as quick.' },
  { if: F => F.tod === 'dawn', t: 'Up with the post. I have been up with the post since before the post was invented.' },
  { if: F => F.season === 'autumn', t: 'Leaves in the post box again. I deliver them. Somebody posted them, in a way.' },
  { if: F => F.season === 'winter', t: 'Cold mornings are slow mornings. I say that so you know what my warm ones are like.' },
  { if: F => F.season === 'summer', t: 'Hot. I keep to the shady side of everything. I have a lot of time to choose it.' },
  { t: 'I am exactly what I look like. A snail with the post. People keep waiting for there to be more to it.' },
  { t: 'Nothing for you today. If there were, I would be on my way. I am always on my way.' },
  { t: 'I have never lost a letter. I have been late with all of them. Both of those are true.' },
]);
function _vfrPerpetuaTalk(V, m) {
  const F = typeof _wkFacts === 'function' ? _wkFacts(wdFacts(m, 'perpetua'), m) : wdFacts(m, 'perpetua'), W = _wdG(), lines = [];
  if (!F.met) lines.push('Perpetua. The post. You will have had letters from me. You will have waited for them.');
  const d = W['fy.perpetua'] === m.today ? '' : (typeof _wkDayPick === 'function' ? _wkDayPick('perpetua', VFR_PERPETUA_DAY, F, m.today) : VFR_PERPETUA_DAY[5].t);
  if (d) { lines.push(d); W['fy.perpetua'] = m.today; }
  if (F.last !== m.today && typeof _wkAdd === 'function') _wkAdd('perpetua', 1);
  W['fv.perpetua'] = m.today; W['fn.perpetua'] = F.talks + 1; _wdSave();
  wdTalk({ name: 'Perpetua', art: gardenCastSvg('perpetua'), lines: lines.length ? lines : ['Still on my round.'], actions: [], at: { x: V.x, y: V.y }, bye: 'Goodbye' });
}
/** Are you at this one's home, at their calm hour (the stories' `home` beats ask)? null when the folk are not living their days. */
function gardenFolkAtHome(who) {
  if (!_vfr.on) return null;
  const V = _vfr.V.get(who), H = _vfr.homes.get(who); if (!V || !H || H.kind === 'road') return false;
  const e = V.entry, calm = !!e && ['home', 'porch', 'tend', 'sit', 'warm', 'shelter'].includes(e.act) && (e.act !== 'sit' || Math.hypot(e.spot.x - H.x, e.spot.y - H.y) < 10);
  const d = _vfr.ctx && _vfr.ctx.door(H); if (!d) return false;
  return calm && Math.hypot(_gw.px - d.x, _gw.py - d.y) < 8;
}
function gardenFolkFeet() { return (_vfr.on ? (_vfr.list || []) : [..._vfg.V.values()]).filter(V => V.S && !V.inside).map(V => ({ x: V.x, y: V.y, name: V.row.name })); }
function gardenFolkState() {
  return (_vfr.rows || []).map(r => { const V = _vfr.V.get(r.id) || {}; const e = V.entry || {}; return { id: r.id, x: V.x, y: V.y, act: e.act, t0: e.t0, t1: e.t1, spot: e.spot ? { x: e.spot.x, y: e.spot.y, src: e.spot.src, kind: e.spot.kind } : null, inside: !!V.inside, drawn: !!V.S, walking: !!(V.path && V.path.length), arrived: !!V.arrived, home: (_vfr.homes.get(r.id) || {}).id, away: _vfr.away ? _vfr.away.has(r.id) : false, visit: !!V.visit }; });
}
function gardenFolkPlans() { const o = {}; for (const [k, v] of _vfr.plans) o[k] = v.map(e => ({ t0: e.t0, t1: e.t1, act: e.act, x: e.spot && e.spot.x, y: e.spot && e.spot.y, src: e.spot && e.spot.src, inside: !!e.inside, walk: e.walk })); return o; }
function gardenFolkStats() { return Object.assign({ villagers: (_vfr.rows || []).length, planned: _vfr.plans.size, drawn: (_vfr.list || []).filter(V => V.S).length, path: typeof gardenFolkPathStats === 'function' ? gardenFolkPathStats() : null }, _vfr.stats); }
wdMod({
  id: 'vale-folk', pref: 'folk',
  begin(m) { _vfr.on = gardenFolkLive() && !m.visit; _vfr.m = m; if (_vfr.on) _vfrBegin(m); },
  frame(dt) { if (_vfr.on) { try { _vfrFrame(dt); } catch (e) { console.error('[folk]', e); } } },
  tick(m) {
    const t0 = performance.now();
    const live = gardenFolkLive() && !m.visit;
    if (live !== _vfr.on) { if (!live) this.end(); else { _vfr.on = true; _vfrBegin(m); } }
    if (!_vfr.on) return;
    _vfr.m = m;
    if (_vfrKey(m) !== _vfr.key && !(typeof wdWalkingLately === 'function' && wdWalkingLately())) { for (const V of _vfr.V.values()) { V.entry = null; V.path = null; V.pathFor = ''; } _vfrBegin(m); }
    _vfrTellerTick(m);
    const ms = performance.now() - t0; _vfr.stats.tick += ms; if (ms > _vfr.stats.tickMax) _vfr.stats.tickMax = ms;
  },
  end() { _vfr.on = false; for (const V of _vfr.V.values()) _vfrHide(V); _vfr.V.clear(); _vfr.plans.clear(); _vfr.list = []; },
});
/* ---------- with friends (npcs-PLAN 5): the host sends the folk's whole state; a guest draws them there ---------- */
/** For the saved copy (fk): [villager id, home thing id, the day they moved in (days since 1970)]: ids and numbers only. */
function gardenFolkSnap() {
  let W = null; try { W = _wdG(); } catch (e) { return null; }
  const out = [];
  for (const r of VALE_FOLK) { const h = W['vh.' + r.id]; if (typeof h !== 'string' || !/^[a-z][a-z0-9:,-]{0,40}$/.test(h)) continue; const d = Date.parse(String(W['vm.' + r.id] || '') + 'T12:00:00Z'); out.push([r.id, h, Number.isFinite(d) ? Math.floor(d / 86400000) : 0]); }   // clock-ok: a day number from a saved day
  return out.slice(0, 32);
}
const _vfl = { at: 0, sig: '', sentAt: 0 };
function _vfrPoseWord(V) {
  const e = V.entry; if (V.hold) return V.arrived && e && e.clip === 'sit' ? 'sittalk' : 'talk';
  if (!V.arrived || !e) return 'walk';
  return e.clip === 'sit' ? (V.rubbing ? 'rub' : 'sit') : e.clip === 'fish' ? 'fish' : e.clip === 'read' ? 'read' : 'idle';
}
function _vfrHostSend(now) {
  if (typeof _gll === 'undefined' || _gll.role !== 'host' || typeof _glh === 'undefined' || !_glh.on || !_glhAnyone() || !_glhLooking()) return;
  if (now - _vfl.at < 800) return; _vfl.at = now;
  if (_gll.actors.size !== _vfl.n) { _vfl.n = _gll.actors.size; _vfl.sig = ''; _vfl.sentAt = 0; }   // (someone has just come in: the whole list at once)
  const n10 = (v, hi) => Math.max(0, Math.min(hi * 10, Math.round(v * 10))), W = GARDEN_WORLD, l = [];
  for (const V of _vfr.list || []) {
    if (V.inside || V.x == null) continue;
    const p = V.path && V.path.length ? V.path[V.path.length - 1] : { x: V.x, y: V.y };
    const r = { i: V.id, x: n10(V.x, W.cols), y: n10(V.y, W.rows), tx: n10(p.x, W.cols), ty: n10(p.y, W.rows), a: _vfrPoseWord(V), f: V.face < 0 ? 1 : 0 };
    if (V.hold && V.hold.by != null) r.h = Math.max(0, Math.min(9, Number(V.hold.by) || 0));
    l.push(r); if (l.length >= 16) break;
  }
  const sig = JSON.stringify(l.map(r => [r.i, Math.round(r.x / 5), Math.round(r.y / 5), r.tx, r.ty, r.a, r.f, r.h]));   // (where they are, to half a cell: a walk is told every 0.8 s, a rest every 8 s)
  if (sig === _vfl.sig && now - _vfl.sentAt < 8000) return;
  _vfl.sig = sig; _vfl.sentAt = now;
  try { _glhSend('all', 'fk', { l }); } catch (e) { /* only a message */ }
}
/** A guest talks to one of the host's folk: they stop and face that guest on every screen. */
function gardenFolkHeldBy(A, ev) {
  if (!_vfr.on || !ev || typeof ev.i !== 'string') return;
  const V = _vfr.V.get(ev.i); if (!V || V.inside) return;
  if (ev.e === 'talk' && A) { V.hold = { t0: performance.now(), until: performance.now() + 90000, by: A.w, A }; V.path = null; V.pathFor = ''; V.drawn = ''; }
  else if (ev.e === 'bye' && V.hold && V.hold.A === A) { V.hold = null; V.drawn = ''; }
}
/* the guest's side: the host's folk, eased to where the host says (snapped only past 3 cells) */
const _vfg = { V: new Map(), at: 0 };
function gardenFolkGuestIn(l) {
  if (!Array.isArray(l)) return;
  const seen = new Set();
  for (const r of l) {
    if (!r || typeof r.i !== 'string' || !VALE_FOLK_ROW.has(r.i)) continue;
    seen.add(r.i);
    let V = _vfg.V.get(r.i);
    if (!V) { V = { id: r.i, row: VALE_FOLK_ROW.get(r.i), x: r.x / 10, y: r.y / 10, face: 1, S: null, drawn: '', path: null }; _vfg.V.set(r.i, V); }
    V.to = { x: r.x / 10, y: r.y / 10 }; V.goal = { x: r.tx / 10, y: r.ty / 10 }; V.a = String(r.a || 'idle'); V.f = r.f ? -1 : 1; V.h = r.h; V.at = performance.now();
    if (Math.hypot(V.x - V.to.x, V.y - V.to.y) > 3) { V.x = V.to.x; V.y = V.to.y; }
  }
  for (const [id, V] of _vfg.V) if (!seen.has(id)) { if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } } _vfg.V.delete(id); }   // gone in at a door, or off by the road
}
function _vfgFrame(dt) {
  const G = GARDEN_WORLD;
  for (const V of _vfg.V.values()) {
    if (!V.S) { V.S = wdSprite({ id: 'vfg-' + V.id, x: V.x, y: V.y, hit: 0.75, hitUp: 16, label: V.row.name, cursor: 'hand', ground: true, svg: '', lift: 0, update() { }, onClick: () => gardenFolkGuestTalk(V.id) }); V.drawn = ''; }
    // first to where the host last saw them, then on along to where they are going, at their own pace
    if (V.to && Math.hypot(V.x - V.to.x, V.y - V.to.y) <= 0.15) V.to = null;   // (caught up with where the host saw them: from now on, along to where they are going)
    const aim = V.to || V.goal, dx = (aim.x - V.x) * G.cellW, dy = (aim.y - V.y) * G.cellH, d = Math.hypot(dx, dy), st = VALE_FOLK_SPEED * (V.row.speed || 1) * dt * (aim === V.to ? 1.25 : 1);
    const walking = d > 1.5 && V.a === 'walk';
    if (d > 0.5) { const k = Math.min(1, st / d); V.x += dx / G.cellW * k; V.y += dy / G.cellH * k; if (Math.abs(dx) > 0.5) V.face = dx > 0 ? 1 : -1; }
    if (!walking) V.face = (V.a === 'talk' || V.a === 'sittalk') && V.mine && typeof _gw !== 'undefined' ? (_gw.px > V.x ? 1 : -1) : V.f;
    const pose = V.a === 'walk' ? 'idle' : V.a, face = V.face < 0 ? -1 : 1, k = pose + (walking ? 'w' : '') + face;
    if (V.drawn !== k) { V.drawn = k; wdArt(V.S, _vfrMarkup(V, pose, walking, face, false)); }
    V.S.x = V.x; V.S.y = V.y;
    const sat = pose === 'sit' || pose === 'rub' || pose === 'sittalk'; V.S.lift = sat ? _vfrSeatLift(V, null) : 0;
  }
}
function gardenFolkGuestTalk(id) {
  const V = _vfg.V.get(id); if (!V) return false;
  try { gardenLiveFx('folk', 'talk', { i: id }); } catch (e) { /* alone */ }
  V.mine = true;
  // the words are worked out here, from your own vale: their day line, as they would say it to a visitor
  let m = null; try { m = gardenModel(); } catch (e) { m = null; }
  const rows = (typeof WK_DAY !== 'undefined' && WK_DAY[id]) || (id === 'perpetua' ? VFR_PERPETUA_DAY : null);
  let line = ''; try { const F = typeof wdFacts === 'function' && m ? (typeof _wkFacts === 'function' ? _wkFacts(wdFacts(m, id), m) : wdFacts(m, id)) : {}; line = rows && typeof _wkDayPick === 'function' ? _wkDayPick(id, rows, F, m ? m.today : '') : ''; } catch (e) { line = ''; }
  wdTalk({ name: V.row.name, art: typeof gardenCastSvg === 'function' ? gardenCastSvg(V.row.cast) : '', lines: ['Oh, a visitor! Any friend of theirs is a friend of the vale.', line].filter(Boolean), actions: [], at: { x: V.x, y: V.y }, bye: 'Goodbye', onClose: () => { V.mine = false; try { gardenLiveFx('folk', 'bye', { i: id }); } catch (e) { /* alone */ } } });
  return true;
}
wdMod({
  id: 'vale-folk-guest', pref: 'folk', visit: true,
  begin() { },
  frame(dt) { if (typeof _gll !== 'undefined' && _gll.role === 'visit' && _vfg.V.size) { try { _vfgFrame(dt); } catch (e) { console.error('[folk guest]', e); } } },
  tick(m) { if (!m.visit && _vfg.V.size) this.end(); },
  end() { for (const V of _vfg.V.values()) if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } } _vfg.V.clear(); },
});
