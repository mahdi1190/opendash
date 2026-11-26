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
  if (typeof gardenKitThings === 'function' && !m.visit) { try { things.push(...gardenKitThings()); } catch (e) { /* an ordinary day */ } }   // (folk3: the day's kit, a stall's counter, the brazier, the card table: 94-garden-wonder-folk3-6kit.js)
  const spotsMemo = new Map(), doorMemo = new Map(), baseMemo = new Map();
  const free = (x, y) => typeof _gwFree !== 'function' || _gwFree(x, y);
  const C = {
    seed: (() => { try { return String((gardenIslandData() || {}).id || '') + '|' + String((state && state.garden && state.garden.id) || ''); } catch (e) { return 'vale'; } })(),
    layout: (() => { try { return gardenIslandData().id; } catch (e) { return ''; } })(),
    things,
    spots(t) {
      if (spotsMemo.has(t.id)) return spotsMemo.get(t.id);
      if (t.kit && typeof gardenKitSpots === 'function') { const ks = gardenKitSpots(t); spotsMemo.set(t.id, ks); return ks; }   // (folk3: a kit place has its own stand)
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
    reach(a, b) { return typeof gardenFolkReach !== 'function' || gardenFolkReach(a, b); },
    open(t) { return _vfrOpenAt(t.x, t.y - 0.2, m); },
    walkable(x, y, s, t) {
      if (s && (s.seat || s.pierEnd || s.kit)) return true;   // (folk3: a kit place is placed clear already; behind a counter is where its keeper stands)
      // (an edge to lean on is stood at only where the feet can be: a wheel pit's wall stands in water)
      if (!(s && s.edge) && !(free(x, y) || (typeof _gwNearestFreePt === 'function' && !!_gwNearestFreePt(x, y, 0.35)))) return false;
      return _vfrClearOfThings(C, x, y, t && t.id);   // (rule 12: never behind a notice board, so as to stand on its roof, nor over another thing's foot)
    },
    season: m.season, rain: !!(m.rain && m.rain.now), snow: !!(m.rain && m.rain.snow),
  };
  return C;
}
/** Things a figure may stand on or beside freely (flat ground things); everything else is drawn and must not be overlapped. */
function _vfrFlat(t) { const K = (t && GARDEN_KINDS[t.kind]) || {}; return !t.kind || t.flat || K.solid === 'free' || /^(pier|bridge|fishing-bank|ball|leaf-pile|log|stepping|road|plaza|path|field|plot|pond|crossing|ford)/.test(t.kind); }
/** Can a standing figure be here without covering a thing or being hidden behind it (rule 12)? The figure is about 0.6 cells wide and
 *  a little over a cell tall; a thing's drawn width is its own (a tree only its trunk). skip: the thing they are at. */
function _vfrClearOfThings(C, x, y, skip, relaxed) {
  for (const t of C.things) {
    if (t.id === skip || Math.abs(t.x - x) > 8 || t.y - y > 9 || y - t.y > 1 || _vfrFlat(t)) continue;
    const tree = /tree|oak|trunk/.test(t.kind), B = C.base(t), hw = (tree ? 0.5 : (B.w || 1) / 2) + 0.3, up = tree ? 1.4 : relaxed ? Math.min(2.6, Math.max(1.4, (B.h || 1.2) + 0.6)) : Math.max(1.4, (B.h || 1.2) + 0.6);   // (anywhere in its picture's height behind it: seen standing on it or in it. relaxed: only just behind it)
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
  try { if (typeof gardenFolkFieldNow === 'function') gardenFolkFieldNow(); } catch (e) { /* planned without it: found as they go */ }
  const ctx = _vfrCtx(m), rows = _vfrRows(m), W = _wdG(), saved = {};
  for (const r of rows) if (W['vh.' + r.id]) saved[r.id] = W['vh.' + r.id];
  const homes = valeFolkSolveHomes(rows, ctx.things, saved, Object.assign({}, ctx, { open: null, reserved: typeof gardenHouseReserve === 'function' ? gardenHouseReserve(ctx.things, saved) : [] }));
  const today = m.today; let dirty = false;
  for (const [id, hid] of homes) if (W['vh.' + id] !== hid) { W['vh.' + id] = hid; W['vm.' + id] = today; dirty = true; }
  if (dirty) _wdSave();
  _vfr.homes = new Map(); _vfr.away = new Set();
  // the way in to the vale: the arrival road's first point (where visitors come ashore), else the arrival point itself
  const road = (() => { let p = null; try { const r = typeof gardenIslandArrivalRoad === 'function' ? gardenIslandArrivalRoad() : null; const q = r && (r.entry || (r.points && r.points[0])); p = Array.isArray(q) ? { x: q[0], y: q[1] } : q && Number.isFinite(q.x) ? q : null; } catch (e) { p = null; } const st = GARDEN_WORLD.start; return { id: 'road', kind: 'road', x: p ? p.x : st.x + 0.5, y: p ? p.y : st.y + 0.5 }; })();
  for (const r of rows) {
    const t = ctx.things.find(q => q.id === homes.get(r.id));
    if (t && ctx.open(t)) _vfr.homes.set(r.id, t);
    else { _vfr.homes.set(r.id, (t && _vfrGateFor(t, r.id, ctx)) || road); _vfr.away.add(r.id); }   // their own home is in land not open yet: by day they come out of that land's edge (the way home), else from the road
  }
  _vfr.ctx = ctx; _vfr.rows = rows; _vfr.day = today; _vfr.book = new Map(); _vfr.plans = new Map(); _vfr.queue = rows.slice();
  _vfr.key = _vfrKey(m);
  try { _vfrMarksDraw(); } catch (e) { console.error('[folk marks]', e); }
}
/** (round 2) Where someone whose home is in closed land comes out by day and goes back at dusk: the open ground nearest their home, on
 *  the way to it (each their own, so nobody crowds the arrival road or the pier). Searched outwards in rings; null if nothing is open. */
function _vfrGateFor(t, id, ctx) {
  const st = GARDEN_WORLD.start, inn = st ? { x: st.x + 0.5, y: st.y + 0.5 } : null;
  const free = (x, y) => (typeof _gwFree !== 'function' || _gwFree(x, y)) && ctx.open({ x, y }) && (!inn || ctx.reach({ x, y }, inn));   // (and joined to the village: a pocket of open ground across the lake is no way in)
  for (let r = 1; r <= 48; r++) {
    let best = null, bd = Infinity;
    for (let k = 0; k < r * 8; k++) {
      const a = k / (r * 8) * Math.PI * 2, x = Math.round(t.x + Math.cos(a) * r) + 0.5, y = Math.round(t.y + Math.sin(a) * r) + 0.5;
      if (!free(x, y)) continue;
      const d = Math.hypot(x - t.x, y - t.y) + (valeHash(id + k) % 100) / 400; if (d < bd) { bd = d; best = { x, y }; }
    }
    if (best) return { id: 'gate:' + id, kind: 'road', x: best.x, y: best.y };
  }
  return null;
}
/* ---------- door marks (npcs-PLAN 3.3): the resident's sign by their door, so you know whose home it is ----------
   A short post beside the door with a little hanging board painted with their mark (a spade, a map, a fish...), its foot in a tuft of grass
   with a contact shadow (rule 13). Only on a home in open land whose resident lives there; small homes painted with their own door (a
   burrow, a holt) carry it on the board too. Stands where walking is free beside the door, never on the path to it. */
const VFR_MARKS = Object.freeze({
  angler: '<path d="M-2.4 -3.6q0 4 2.4 4.4q2.6 0 2.6 -2.6M2.6 -1.8l1.2 -1.2" stroke="#3a3a30" stroke-width=".9" fill="none" stroke-linecap="round"/><path d="M0 -6v2.6" stroke="#3a3a30" stroke-width=".8"/>',
  pip: '<path d="M-4 0q4 -3.4 7 0q-3 3.4 -7 0zM3 0l2.4 -2v4z" fill="#5a7a8a"/><circle cx="-2" cy="-.4" r=".5" fill="#1a1a1a"/>',
  tam: '<path d="M0 -6v6" stroke="#5a3a22" stroke-width="1.2"/><path d="M-2 0h4v2.4q-2 2 -4 0z" fill="#7f8a90"/>',
  bramble: '<path d="M-4.4 -3.4l3 -1l3 1l3 -1v6.8l-3 1l-3 -1l-3 1z" fill="#e8d8b0" stroke="#8a6a44" stroke-width=".4"/><path d="M-1.4 -4.4v6.8M1.6 -3.4v6.8" stroke="#8a6a44" stroke-width=".4"/>',
  thistle: '<ellipse cx="0" cy="-3" rx="1.8" ry="2.6" fill="#b08a58"/><path d="M0 -.6v4.6" stroke="#a07a4a" stroke-width="1.1" stroke-linecap="round"/>',
  quince: '<rect x="-2.6" y="-3" width="5.2" height="5.6" rx="1.4" fill="#c88a30"/><rect x="-3" y="-4.2" width="6" height="1.6" rx=".6" fill="#e8dcc0"/>',
  wick: '<path d="M1.8 -4.6a4 4 0 1 0 0 8a3.2 3.2 0 1 1 0 -8z" fill="#e8d890"/>',
  hollin: '<path d="M-3.6 3.6l5 -7" stroke="#6a4a2e" stroke-width="1.1"/><path d="M.4 -4.6l3 .8l-.4 3l-2.6 -.8z" fill="#8a96a0"/>',
  perpetua: '<rect x="-4" y="-2.8" width="8" height="5.6" rx=".6" fill="#f4ecdc" stroke="#8a6a44" stroke-width=".4"/><path d="M-4 -2.6l4 3l4 -3" stroke="#8a6a44" stroke-width=".4" fill="none"/>',
});
function _vfrMarkSvg(id) {
  const icon = VFR_MARKS[id]; if (!icon) return '';
  // a small painted board nailed to the upper door: its shadow on the door, the board's lit top edge, two nails, the mark
  return '<rect x="-5.2" y="-4.2" width="11.6" height="10" rx="1.8" fill="#1a1208" opacity=".28"/>'
    + '<rect x="-5.8" y="-5.4" width="11.6" height="10" rx="1.8" fill="#5a4028"/><rect x="-5.1" y="-4.8" width="10.2" height="8.8" rx="1.3" fill="#e8dcc0"/><rect x="-5.1" y="-4.8" width="10.2" height="2.2" rx="1" fill="#fff6e4" opacity=".6"/>'
    + '<circle cx="-4" cy="-3.6" r=".5" fill="#8a8478"/><circle cx="4" cy="-3.6" r=".5" fill="#8a8478"/>'
    + `<g transform="translate(0 -.2) scale(.92)">${icon}</g>`;
}
function _vfrMarksDraw() {
  for (const S of _vfr.marks || []) { try { S.remove(); } catch (e) { /* gone */ } }
  _vfr.marks = [];
  if (typeof wdSprite !== 'function' || typeof GARDEN_PROPS === 'undefined') return;
  for (const [id, H] of _vfr.homes) {
    // a building with a door of its own (a cottage, the boathouse): the mark on the door. A small home painted with its own (the holt's
    // fish on its nail, the burrow's round door) needs none.
    if (!H || H.kind === 'road' || H.src === 'thing' || !VFR_MARKS[id] || _vfr.away.has(id)) continue;
    if (typeof valeFolkHomeOf === 'function' && (!valeFolkHomeOf(H) || valeFolkHomeOf(H) === 'postbox')) continue;   // (the snail post's post box is her round, not a door)
    let p = null; try { p = GARDEN_PROPS.find(q => q.id === H.id) || (gardenIslandData().static || []).find(q => q.id === H.id) || null; } catch (e) { p = null; }
    if (!p || !p.door || !Number.isFinite(p.door.x)) continue;
    const foot = p.y + p.h, row = VALE_FOLK_ROW.get(id);
    try { _vfr.marks.push(wdSprite({ id: 'vfm-' + id, x: p.door.x + 0.5, y: foot + 0.02, hit: 0.2, hitUp: 8, label: (row ? row.name : id) + '’s home', ground: true, svg: _vfrMarkSvg(id), lift: 30 + Math.max(0, (foot - p.door.y - 1)) * 30, update() { } })); } catch (e) { /* no stage */ }
  }
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
/** Where the plan puts them now: { x, y, e, walking, inside, ahead } (off screen: along the leg's own path, the one they would walk on
 *  screen, round water, buildings and blocked ground; until that path is found, or where there is none, they wait where they were). */
function _vfrWhere(id, minute) {
  const plan = _vfr.plans.get(id), at = valeFolkAt(plan, minute); if (!at || !at.e.spot) return null;
  const e = at.e, to = e.spot;
  // (the plan allows a straight walk's time and a little; the way round the lake is longer, so off screen they take the time that way
  // really takes, at their own pace: a friend watching sees them walk, not dash)
  if (at.prev && at.prev.spot && (at.walking || (e._rw && at.secs < e._rw))) {
    const a = at.prev.spot, pts = typeof gardenFolkPathKept === 'function' ? gardenFolkPathKept(a, to) : null;
    if (pts && pts.length) {
      if (!e._rw) { const G = GARDEN_WORLD, row = VALE_FOLK_ROW.get(id) || {}; let len = 0, p = a; for (const q of pts) { len += Math.hypot((q.x - p.x) * G.cellW, (q.y - p.y) * G.cellH); p = q; } e._rw = len / (VALE_FOLK_SPEED * (row.speed || 1)); }
      const k = Math.min(1, at.secs / Math.max(1, e.walk || 0, e._rw));
      if (k < 1) { const q = gardenFolkAlong(a, pts, k); return { x: q.x, y: q.y, e, walking: true, inside: false, along: k, ahead: q.ahead, hx: q.hx }; }
    } else if (at.walking) return { x: a.x, y: a.y, e, walking: true, inside: false, along: at.along, ahead: [], hx: 0, wait: true };
  }
  return { x: to.x, y: to.y, e, walking: false, inside: !!e.inside };
}
function _vfrView() { try { const v = _glCamView(); return v; } catch (e) { return { x0: _gw.px - 12, x1: _gw.px + 12, y0: _gw.py - 9, y1: _gw.py + 9 }; } }
function _vfrNearView(x, y, v, pad) { return x > v.x0 - pad && x < v.x1 + pad && y > v.y0 - pad && y < v.y1 + pad; }
/* ---------- drawing ---------- */
const _vfrArt = new Map();
function _vfrMarkup(V, pose, walk, face, mark, view) {
  view = view === 's' || view === 'n' ? view : 'e';
  const cast = V.row.cast, k = cast + '|' + pose + '|' + (walk ? 1 : 0) + '|' + face + '|' + (mark === 'wave' ? 2 : mark ? 1 : 0) + view;
  let s = _vfrArt.get(k); if (s != null) return s;
  // walking: the stride rig drives the legs (planted feet, every way round); standing: front on, or side on for what they do there
  let fig = typeof gardenCastSvg === 'function' ? gardenCastSvg(cast, { stride: !!walk, view: view === 'e' ? '' : view, fish: pose === 'fish' }) : '';
  if (!fig) fig = typeof _wdFolkArt === 'function' && typeof WD_FOLK_ROW !== 'undefined' && WD_FOLK_ROW.get(V.id) ? _wdFolkArt(WD_FOLK_ROW.get(V.id)) : '';
  // (fishing is done standing at the edge with the rod out: a side-on figure sat with its legs out over a deck reads as floating over the boards)
  const cls = { sit: 'gca-sit', read: 'gca-read', rub: 'gca-sit gca-rub', talk: 'gca-talk', sittalk: 'gca-sit gca-talk' }[pose] || (typeof VF3_POSE_CLS !== 'undefined' && VF3_POSE_CLS[pose]) || '';   // (folk3: cheer, clap, crouch, count... 94-garden-folk3-0rules.js)
  if (cls) fig = fig.replace(/class="gca gca-(walk|idle)/, 'class="gca gca-$1 ' + cls);
  if (face < 0 && view === 'e') fig = fig.replace('<g class="wd-flip">', '<g class="wd-flip" transform="scale(-1 1)">');
  // a rod and line for those who fish without one of their own (the angler's own picture has his rod and line: nothing is added to it)
  let extra = '';
  if (pose === 'fish') extra = `<path d="M${face * 6} -22L${face * 34} -52" stroke="#6e4c2a" stroke-width="1.6" stroke-linecap="round"/><path d="M${face * 34} -52Q${face * 64} -24 ${face * 88} 16" stroke="#f4f4ea" stroke-width=".5" fill="none" opacity=".8"/>`;
  const top = typeof gardenCastTop === 'function' ? gardenCastTop(cast) : 50;
  const m = mark === 'wave' ? `<g class="wd-mark vf-wave" transform="translate(${face * 6} ${-top - 6})"><circle r="6.4" fill="#fffdf4" stroke="#6a5a44" stroke-width="0.6"/><path d="M-2.6 2.6V-1.2M-1 2.4V-3M.6 2.4V-3.2M2.2 2.6V-2.2M-2.6 2.6q2.4 2.4 4.8 0l1.6 -2.4" stroke="#6a5a44" stroke-width="1" fill="none" stroke-linecap="round"/></g>`
    : mark ? `<g class="wd-mark" transform="translate(0 ${-top - 8})"><rect x="-9" y="-6" width="18" height="11" rx="5.5" fill="#fffdf4" stroke="#6a5a44" stroke-width="0.6"/><circle cx="-4" cy="-0.5" r="1.1" fill="#6a5a44"/><circle cy="-0.5" r="1.1" fill="#6a5a44"/><circle cx="4" cy="-0.5" r="1.1" fill="#6a5a44"/></g>` : '';
  s = gardenActorSized(fig + extra + m);
  if (_vfrArt.size > 160) _vfrArt.clear();
  _vfrArt.set(k, s); return s;
}
/**
 * Which of the three drawings (front s, side e, back n) a villager is drawn with, from the way they are heading (V.h, screen degrees:
 * 0 east, 90 towards you), turned smoothly (no flicker on a slanting path: a family changes only well past the half-way mark).
 * Standing: talking to you they face you; what they do at a place (sit, fish, read, a look at a board) is side on, facing it.
 */
function _vfrView3(V, walking, pose) {
  if (!walking) { V.view = pose === 'talk' && (V.hold || V.mine) ? 's' : (typeof VF3_POSE_VIEW !== 'undefined' && VF3_POSE_VIEW[pose]) || 'e'; return V.view; }   // (folk3: a pose seen best face on: behind a market stall)
  const h = Number.isFinite(V.h) ? V.h : 90, yaw = Math.abs(((h - 90 + 540) % 360) - 180), prev = V.view || 'e';
  let v = yaw < 38 ? 's' : yaw > 142 ? 'n' : 'e';
  if (prev === 's' && yaw < 48) v = 's'; else if (prev === 'n' && yaw > 132) v = 'n'; else if (prev === 'e' && yaw > 30 && yaw < 150) v = 'e';
  if (v === 'e') { const c = Math.cos(h * Math.PI / 180); if (Math.abs(c) > 0.05) V.face = c > 0 ? 1 : -1; }
  V.view = v; V.yaw = v === 's' ? 0 : v === 'n' ? 180 : 90;
  return v;
}
/** Each frame while walking: the shared stride rig (94-garden-zz-6move.js) on their own drawn limbs: feet planted, moved by the ground covered. */
function _vfrStride(V, walking, view) {
  if (!walking || !V.S || typeof _gmvStride !== 'function') { if (V.st) { V.st.lpx = V.st.lpy = null; } return; }
  try {
    if (typeof _gmvMotion === 'function' && !_gmvMotion()) return;
    const body = V.S.node && V.S.node.firstChild; if (!body || !body.querySelector) return;
    V.st = V.st || { h: 0 };
    _gmvStride(V.st, body, typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.6, { px: V.x, py: V.y, moving: true, v: VALE_FOLK_SPEED * (V.row.speed || 1), gait: 'w', dir: view, yaw: view === 's' ? 0 : view === 'n' ? 180 : 90, mirror: view === 'e' ? (V.face < 0 ? -1 : 1) : 1 });
  } catch (e) { /* drawn standing */ }
}
/** The way a step goes, turned towards smoothly (turn rate as the gardener's). */
function _vfrHeadTo(V, dxPx, dyPx, dt) {
  if (Math.abs(dxPx) + Math.abs(dyPx) < 0.01) return;
  const want = Math.atan2(dyPx * 1.6, dxPx) * 180 / Math.PI;
  if (!Number.isFinite(V.h)) { V.h = want; return; }
  let d = ((want - V.h + 540) % 360) - 180; const st = 640 * Math.max(0.016, dt || 0.016);
  V.h = ((V.h + (Math.abs(d) <= st ? d : Math.sign(d) * st) + 540) % 360) - 180;
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
  const e = V.entry, at = !walking && e && V.arrived && !V.visit;   // (come over to you: they stand, whatever their plan's place would have them do)
  let pose = 'idle';
  if (V.hold || V.greet) pose = at && e.clip === 'sit' ? 'sittalk' : 'talk';   // (sat down, they talk from the seat)
  else if (at && e.clip === 'sit') pose = V.id === 'bramble' && V.rubbing ? 'rub' : 'sit';
  else if (at && e.clip === 'fish') pose = 'fish';
  else if (at && e.clip === 'read') pose = 'read';
  else if (at && typeof VF3_POSE_CLS !== 'undefined' && VF3_POSE_CLS[e.clip]) pose = e.clip;   // (folk3: behind a stall, warming at the brazier, browsing)
  const nod = V.nod && performance.now() < V.nod.until ? V.nod : null; if (V.nod && !nod) V.nod = null;
  if (nod) { const O = _vfr.V.get(nod.other); if (O) { V.h = Math.atan2((O.y - V.y) * 30 * 1.6, (O.x - V.x) * 48) * 180 / Math.PI; if (Math.abs(O.x - V.x) > 0.2) V.face = O.x > V.x ? 1 : -1; } }   // (a nod in passing: the head and body turn to the other a moment)
  const mark = V.mark && !V.hold ? true : nod ? 'wave' : false, face = V.face < 0 ? -1 : 1, view = _vfrView3(V, walking && !V.hold, pose), k = pose + (walking ? 'w' : '') + face + (mark ? (mark === 'wave' ? 'v' : 'm') : '') + view;
  if (V.drawn !== k) { V.drawn = k; wdArt(S, _vfrMarkup(V, pose, walking && !V.hold, face, mark, view)); }
  S.x = V.x; S.y = V.y;
  _vfrStride(V, walking && !V.hold, view);
  const sat = pose === 'sit' || pose === 'rub' || pose === 'sittalk';
  S.lift = sat ? _vfrSeatLift(V, e && e.spot) : 0;
  S.z = sat && e && e.spot && e.spot.at ? e.spot.at.y + 0.02 : null;   // (sat on a seat: drawn on it, in front of its back rail)
}
/* ---------- walking ---------- */
function _vfrAsk(V, to, pri) {
  const key = to.x.toFixed(2) + ',' + to.y.toFixed(2);
  // (round 2) an empty path left from the last leg is no path: ask again (Bramble stood where she told you something for the rest of her block)
  if (V.pathFor === key && ((V.path && V.path.length) || (V.asking === key && performance.now() - (V.askT || 0) < 4000) || (V.noWay && performance.now() - (V.noWayT || 0) < 5000))) return;
  V.askT = performance.now();
  V.asking = key; V.pathFor = key; V.path = null;
  const from = { x: V.x, y: V.y };
  // (no way there at all: they stay where they are, never a straight line over the lake or through a wall; looked at again in a while)
  gardenFolkPathAsk(from, to, (pts) => { if (V.asking !== key) return; V.asking = ''; V.path = pts ? pts.slice() : []; V.noWay = !pts; V.noWayT = pts ? 0 : performance.now(); });
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
    const who = _vfrIntoYou(V, nx, ny);
    if (who) { const now = performance.now(); if (!V.bumpT) V.bumpT = now; else if (now - V.bumpT > 900) { V.bumpT = 0; if (!_vfrRoundYou(V, who)) { V.path = null; V.pathFor = ''; V.noWay = false; } } V.waiting = true; return false; }   // (no room either side: the way is looked for again, from here)
    V.bumpT = 0; V.waiting = false;
    V.x = nx; V.y = ny; _vfrHeadTo(V, dx, dy, dt); left = 0;
  }
  return !V.path.length;
}
/** Can a standing figure be here: the feet free with room for its width, clear of every drawn thing but `skip`, in open land. */
function _vfrBodyOk(x, y, skip, relaxed) {
  if (typeof _gwFree === 'function' && !(_gwFree(x, y, 0.04) && _gwFree(x - 0.28, y) && _gwFree(x + 0.28, y))) return false;
  if (_vfr.ctx && !_vfrClearOfThings(_vfr.ctx, x, y, skip || '', relaxed)) return false;
  return !_vfr.m || _vfrOpenAt(x, y, _vfr.m);
}
/** Where to stand to talk to someone at tx, ty: side by side at talking distance (the figures are side-on), clear of everything, the
 *  nearest such place to where they are now. null: nowhere clear (they talk from where they are). */
function _vfrTalkSpot(V, tx, ty) {
  let best = null, bd = Infinity;
  // (two passes: clear of everything; then, where you yourself stand in the height of something tall, only clear of standing on it)
  for (const relaxed of [false, true]) { if (best) break; for (const [ox, oy, w] of [[1.3, 0, 0], [-1.3, 0, 0], [1.25, 0.4, 0.4], [-1.25, 0.4, 0.4], [1.25, -0.4, 0.5], [-1.25, -0.4, 0.5], [1.6, 0.15, 0.3], [-1.6, 0.15, 0.3], [1.0, 0.9, 1], [-1.0, 0.9, 1], [1.9, 0, 0.6], [-1.9, 0, 0.6]]) {
    const x = tx + ox, y = ty + oy;
    if (!_vfrBodyOk(x, y, '', relaxed)) continue;
    if (_vfr.list && _vfr.list.some(O => O !== V && O.S && !O.inside && Math.hypot(O.x - x, (O.y - y) * 1.6) < 0.8)) continue;
    const d = Math.hypot(x - V.x, y - V.y) + w; if (d < bd) { bd = d; best = { x, y }; }
  } }
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
/** How close a walking villager comes to a player before they stop and go round: wider than the feet's oval, so two standing figures
 *  never cover each other (a figure is over a cell tall: one just behind you was drawn inside you). */
const VFR_PASS = Object.freeze({ x: 0.75, y: 0.62 });
/** Every player figure in the garden: yours and each visiting friend's (friends are treated exactly as you are). */
function _vfrFigures() {
  const out = []; if (typeof _gw !== 'undefined' && Number.isFinite(_gw.px)) out.push({ x: _gw.px, y: _gw.py });
  try { if (typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) if (A && !A.me && Number.isFinite(A.x) && Number.isFinite(A.y)) out.push({ x: A.x, y: A.y }); } catch (e) { /* alone */ }
  return out;
}
/** Would a villager stepping to x, y walk into a player (you or a friend)? Then they wait, and after a moment go round them. */
function _vfrIntoYou(V, x, y) {
  if (V.hold) return null;
  for (const P of _vfrFigures()) {
    const ex = (x - P.x) / VFR_PASS.x, ey = (y - P.y) / VFR_PASS.y, e = ex * ex + ey * ey; if (e >= 1) continue;
    const ox = (V.x - P.x) / VFR_PASS.x, oy = (V.y - P.y) / VFR_PASS.y; if (e < ox * ox + oy * oy) return P;
  }
  return null;
}
function _vfrRoundYou(V, P) {
  const p = V.path && V.path[0]; if (!p || !P) return false;
  const dx = p.x - V.x, dy = p.y - V.y, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n;
  // a step out to the side of them and a step past, on ground the feet can take (wider each try; either side), then on along the way
  for (const w of [1.05, 1.4, 1.8]) for (const s of [1, -1]) {
    const q1 = { x: P.x - uy * w * s * 1.0 - ux * 0.6, y: P.y + ux * w * s * 0.8 - uy * 0.5 }, q2 = { x: P.x - uy * w * s * 1.0 + ux * 1.0, y: P.y + ux * w * s * 0.8 + uy * 0.9 };
    if (typeof _gwFree === 'function' && !(_gwFree(q1.x, q1.y) && _gwFree(q2.x, q2.y) && _vfrLineFree(V, q1) && _vfrLineFree(q1, q2) && _vfrLineFree(q2, p))) continue;
    V.path.unshift(q1, q2); return true;
  }
  return false;
}
/** Is the straight step from a villager to q clear of blocked ground (a step round someone never cuts through a wall)? */
function _vfrLineFree(a, q) { const n = Math.max(2, Math.ceil(Math.hypot(q.x - a.x, q.y - a.y) * 4)); for (let i = 1; i <= n; i++) { const t = i / n; if (!_gwFree(a.x + (q.x - a.x) * t, a.y + (q.y - a.y) * t)) return false; } return true; }
/** Is another figure standing at x, y (the gnome, a traveller, a pet: any world sprite that is not one of the folk)? */
function _vfrSpriteAt(x, y, own) {
  if (typeof _gwSprites === 'undefined') return false;
  for (const S of _gwSprites) { if (S === own || S.simulationOnly || !Number.isFinite(S.x) || !Number.isFinite(S.y) || /^vf/.test(String(S.id || ''))) continue; if (Math.abs(S.x - x) < 0.7 && Math.abs(S.y - y) < 0.4) return true; }
  return false;
}
/** Their stand point, or the nearest clear one beside it when another figure is already on it (looked at every few seconds). */
function _vfrClearDest(V, e, to, now) {
  if (e._dest && now - e._destT < 4000) return e._dest;
  e._destT = now; e._dest = to;
  if (!_vfrSpriteAt(to.x, to.y, V.S)) return to;
  for (const [ox, oy] of [[0.75, 0], [-0.75, 0], [0.6, 0.35], [-0.6, 0.35], [0, 0.55], [1.1, 0], [-1.1, 0]]) { const x = to.x + ox, y = to.y + oy; if (!_vfrSpriteAt(x, y, V.S) && _vfrBodyOk(x, y, to.src)) { e._dest = Object.assign({}, to, { x, y }); break; } }
  return e._dest;
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
  // (round 2) noted only when you have seen it: they stood well inside the picture (clear of the edges and the cards along the bottom),
  // with no talk card open, for two seconds of it
  if (!_vfrOnScreen(V)) { V.seen = V.seen || {}; V.seen[id] = 0; return; }
  V.seen = V.seen || {}; const now = performance.now(); if (!V.seen[id]) { V.seen[id] = now; return; } if (now - V.seen[id] < 2000) return;
  W[k] = _wdToday(); _wdSave();
  try { gardenToast('In your journal: ' + VALE_TELLS[id]); } catch (e) { /* quiet */ }
}
function _vfrOnScreen(V) {
  try { if (typeof _wd !== 'undefined' && _wd.talk) return false; const v = _vfrView(), w = v.x1 - v.x0, h = v.y1 - v.y0; return V.x > v.x0 + w * 0.12 && V.x < v.x1 - w * 0.12 && V.y > v.y0 + h * 0.18 && V.y < v.y1 - h * 0.3; } catch (e) { return false; }
}
/** The way the angler faces on his spot: away from the nearest moving water (the layout's rivers), until the story turns him round. */
function _vfrAwayFromRiver(x, y) {
  let best = null, bd = Infinity;
  try { const R = (gardenIslandData().presentation || {}).rivers || {}; for (const r of Array.isArray(R) ? R : Object.values(R)) { const pts = (r && (r.points || r.path || r.line)) || []; for (const p of pts) { const px = Array.isArray(p) ? p[0] : p.x, py = Array.isArray(p) ? p[1] : p.y; const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; } } } } catch (e) { best = null; }
  return best ? (best.x > x ? -1 : 1) : null;
}
function _vfrBackToWater(V, e) {
  if (V.id !== 'angler' || !e || e.act !== 'fish' || !e.spot || (typeof wdTaleFlag === 'function' && wdTaleFlag('mill.end'))) return null;
  if (e._away === undefined) { const f = _vfrAwayFromRiver(e.spot.x, e.spot.y), w = _vfrWetSide(e.spot.x, e.spot.y); e._away = f && (!w || w === f || _vfrWetAt(e.spot.x + f * 1.3, e.spot.y)) ? f : null; }   // (only where that way is still water: never his line on the grass)
  return e._away;
}
function _vfrWetAt(x, y) { try { const t = typeof gardenTerrainAt === 'function' ? gardenTerrainAt(x, y) : ''; return t === 'water' || t === 'deep'; } catch (e) { return false; } }
/** Which side of a point the water is on (-1 left, 1 right, 0 neither or both): a bank's stand faces its water. */
function _vfrWetSide(x, y) { const l = _vfrWetAt(x - 1.3, y) || _vfrWetAt(x - 1.3, y - 0.5), r = _vfrWetAt(x + 1.3, y) || _vfrWetAt(x + 1.3, y - 0.5); return l && !r ? -1 : r && !l ? 1 : 0; }
/** Which way someone faces on their spot (pure: worked out wherever they are, on screen or off, so someone you walk up to already faces
 *  the way their place says). */
function _vfrFaceAt(V, e) {
  const sp = e && e.spot; if (!sp) return V.face;
  const bw = _vfrBackToWater(V, e); if (bw) return bw;
  if (sp.edge && e.act === 'fish') { const w = _vfrWetSide(sp.x, sp.y); if (w) return w; }   // (fishing from a bank: facing its water)
  if (sp.at) { if (Math.abs(sp.at.x - sp.x) > 0.25) return sp.at.x > sp.x ? 1 : -1; }
  if (sp.deg != null) { const d = ((sp.deg % 360) + 360) % 360; if (d < 80 || d > 280) return 1; if (d > 100 && d < 260) return -1; }
  return V.face;
}
/** Two folk meeting on a path: the relationship table says what they do. 'no': the one who steps aside leaves the path a little and waits. */
function _vfrCrossings(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (!a.S || !b.S || a.inside || b.inside || a.drive || b.drive) continue;
    const d = Math.hypot(a.x - b.x, (a.y - b.y) * 1.3); if (d > 2.6) continue;
    const who = valeFolkAside(a.id, b.id);
    if (!who) {
      // close friends meeting on the way stop for a word (the relationship table's 'close'), once an hour of play for a pair
      const rel = valeFolkRel(a.id, b.id);
      if (rel !== 'close') {
        // (round 2) everyone else the table knows as 'warm': a wave in passing, both turning to the other a moment, without stopping
        if (rel !== 'warm' || a.hold || b.hold || a.greet || b.greet || d > 2.2) continue;
        const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id, now = performance.now(); _vfr.waved = _vfr.waved || new Map();
        if (now - (_vfr.waved.get(k) || -1e9) < 600e3) continue; _vfr.waved.set(k, now);
        a.nod = { until: now + 1600, other: b.id }; b.nod = { until: now + 1600, other: a.id };
        continue;
      }
      if (a.hold || b.hold || a.greet || b.greet || !(a.path && a.path.length) || !(b.path && b.path.length) || d > 1.9) continue;
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
  else if (!walking && !_vfr.queue.length && typeof gardenFolkPlaceGraph === 'function') { try { const dOf = (t) => _vfr.ctx && _vfr.ctx.door ? _vfr.ctx.door(t) : t; gardenFolkPlaceGraph(_vfr.plans, dOf); gardenFolkPathWarm(_vfr.plans, dOf, _vfr.day); } catch (e) { /* found as they go */ } }
  const minute = _vfrMinute(), v = _vfrView(), now = performance.now(), list = [];
  for (const row of _vfr.rows || []) {
    if (!_vfr.plans.has(row.id)) continue;
    const V = _vfrV(row.id), w = _vfrWhere(row.id, minute); if (!w) continue;
    list.push(V); V.offWalk = false;
    if (V.x == null) { V.x = w.x; V.y = w.y; V.inside = w.inside || !!w.e.offmap; }
    if (V.drive && typeof gardenFolkDriveFrame === 'function') { gardenFolkDriveFrame(V, dt, now, v); continue; }   // (folk3: out of their day for a game or a moment, 94-garden-wonder-folk3-0drive.js)
    if (V.entry !== w.e) { V.entry = w.e; V.arrived = false; V.rubbing = false; V.path = null; V.pathFor = ''; }
    const e = V.entry, to = e.spot, near = _vfrNearView(V.x, V.y, v, VFR_NEAR) || _vfrNearView(to.x, to.y, v, VFR_NEAR) && !e.inside;
    // a teller on their way to you: their visit stands in for the plan until you talk, or it runs out
    // (round 2) once there, they wait a little while you are about (75 s), not the rest of their block: then back to what their day says
    const vgone = V.visit && V.visit.arr && (now - V.visit.arr > 75000 || Math.hypot(_gw.px - V.x, _gw.py - V.y) > 14);
    const goal = V.visit && now < V.visit.until && !vgone ? V.visit : null; if (V.visit && !goal) { V.visit = null; V.mark = false; V.drawn = ''; V.arrived = false; V.path = null; V.pathFor = ''; }
    let dest = goal ? goal.at : to;
    if (!goal && to && !e.inside && !e.offmap && !(to.seat || to.edge || to.edgeSide)) dest = _vfrClearDest(V, e, to, now);   // (someone else already stood there: the gnome by the bed, a traveller)
    if (V.hold && !V.S && !V.inside && near) _vfrShow(V);   // (held while off the page: drawn as soon as you look)
    if (V.hold) { if (now > V.hold.until || (V.hold.by == null && typeof _wd !== 'undefined' && !_wd.talk && now - V.hold.t0 > 1500) || (V.hold.A && !_gll.actors.has(V.hold.by))) { V.hold = null; V.drawn = ''; } else { const tx = V.hold.A ? V.hold.A.x : _gw.px, ty = V.hold.A ? V.hold.A.y : _gw.py;
      // (stopped too close, on your feet: a step back first, to talking distance, then turn to you)
      if (V.S && !V.hold.step && !V.hold.stepped && (Math.hypot(V.x - tx, (V.y - ty) * 1.3) < 1.1 || !_vfrBodyOk(V.x, V.y, V.entry && V.arrived && V.entry.spot ? V.entry.spot.src : ''))) { V.hold.stepped = 1; const q = _vfrTalkSpot(V, tx, ty); if (q) V.hold.step = q; }
      if (V.hold.step) { V.path = [V.hold.step]; if (_vfrStep(V, dt, 0.8)) V.hold.step = null; _vfrDraw(V, !!(V.path && V.path.length)); continue; }
      V.face = tx > V.x ? 1 : -1; if (V.S) _vfrDraw(V, false); continue; } }
    if (!near && !V.S) {
      // off screen: where the plan says, in a straight line along the leg (nothing walked frame by frame)
      if (!goal) { V.x = w.x; V.y = w.y; V.inside = w.inside || !!e.offmap; V.arrived = !w.walking; V.offWalk = !!w.walking && !w.wait; V.ahead = w.ahead || null; if (V.arrived) V.face = _vfrFaceAt(V, e); else if (Math.abs(w.hx || 0) > 0.05) V.face = w.hx > 0 ? 1 : -1; }
      else { V.inside = false; V.offWalk = true; V.ahead = null; _vfrAsk(V, goal.at, 1); if (V.path && V.path.length) _vfrStep(V, dt); }   // (on the way over to you, off screen: on the path, as on screen)
      continue;
    }
    if (V.inside && !(e.inside && !goal)) { V.inside = false; V.x = to && V.entry.inside ? V.x : V.x; }   // out of the door (they were in; now their plan takes them out)
    if (V.inside) { _vfrHide(V); continue; }
    V.offWalk = false; V.ahead = null;
    if (!near && V.S && !(V.path && V.path.length)) { _vfrHide(V); continue; }
    // (no way to where they are going: off the view they are simply there, on it they stand and wait)
    if (V.noWay && !goal && !_vfrNearView(V.x, V.y, v, 0) && !_vfrNearView(dest.x, dest.y, v, 0)) { V.x = dest.x; V.y = dest.y; V.noWay = false; V.path = null; V.pathFor = ''; }
    _vfrShow(V);
    if (V.greet) { if (now > V.greet.until || V.hold) V.greet = null; else { const O = _vfr.V.get(V.greet.other); if (O) V.face = O.x > V.x ? 1 : -1; _vfrDraw(V, false); continue; } }   // (two who are close stop to pass the time of day)
    if (V.aside) { _vfrTellSeen('steps-aside', V); if (now > V.aside.until) { V.path = null; V.pathFor = ''; V.aside = null; } else { if (V.path && V.path.length) _vfrStep(V, dt, 0.8); _vfrDraw(V, !!(V.path && V.path.length)); continue; } }
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
      if (goal && !goal.arr) goal.arr = now;
      if (!V.arrived) { V.arrived = true; V.face = goal ? (_gw.px > V.x ? 1 : -1) : _vfrFaceAt(V, e); if (V.id === 'bramble' && e.clip === 'sit') { V.rubbing = true; V.rubT = now; } }
      if (V.rubbing) { _vfrTellSeen('rub-out', V); if (now - V.rubT > 3800) { V.rubbing = false; V.drawn = ''; } }   // (noted while you watch her at it)
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
  if ((typeof gardenGameBusy === 'function' && gardenGameBusy()) || (typeof gardenSceneBusy === 'function' && gardenSceneBusy())) return;   // (folk3: nobody comes over with a story while a game or a moment is on)
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
  if (!_vfr.on && typeof _gll !== 'undefined' && _gll.role === 'visit') { const out = []; for (const V of _vfg.V.values()) if (V.S && Math.hypot(V.x - px, (V.y - py) * 1.3) <= 2 && !(typeof gardenGameFolkBusy === 'function' && gardenGameFolkBusy(V.id))) out.push({ key: 'folk:' + V.id, act: 'talk', folk: V.id, words: 'Talk to ' + V.row.name.replace(/^The /, 'the '), name: V.row.name, x: V.x, y: V.y, promptY: V.y - 2.2, pri: 0.9 }); return out; }
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
    if (!V.S || (V.drive && V.drive.noTalk)) continue;   // (folk3: someone running a race or hiding is not stopped for a chat)
    if (Math.hypot(V.x - px, (V.y - py) * 1.3) > 2.2) continue;
    out.push({ key: 'folk:' + V.id, act: 'talk', folk: V.id, words: 'Talk to ' + V.row.name.replace(/^The /, 'the '), name: V.row.name, x: V.x, y: V.y, promptY: V.y - ((typeof gardenCastTop === 'function' ? gardenCastTop(V.row.cast) : 50) * (typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.6) + (V.S ? V.S.lift || 0 : 0) + 10) / GARDEN_WORLD.cellH, pri: 0.9 });   // (the prompt over their head, not on it)
  }
  return out.filter(r => r.words);
}
/** A stand-in for the old caller sprite, so their talk code (94-garden-wonder-1folk.js) runs as it always did. */
/* One gift a day to each villager: read from the gift's own record (fg.<id>.<n>, dated, saved and synced; "Take it back" removes it),
   never a copy of a flag: the proxy was given V.gave when the talk opened, the gift set it on the proxy later, and V never knew. */
function _vfrGaveToday(id) { const W = _wdG(), n = Number(W['fgn.' + id] || 0), r = n ? W['fg.' + id + '.' + n] : null; return !!(r && r.d === _wdToday()); }
function _vfrProxy(V) { const row = WD_FOLK_ROW.get(V.id), id = row ? row.id : V.id; return { row, x: V.x, y: V.y, svg: '', node: null, get gave() { return _vfrGaveToday(id); }, set gave(v) { void v; }, path: [], home: { x: V.x, y: V.y }, remove() { }, set hold(v) { } }; }
function gardenFolkTalkTo(id) {
  if (typeof gardenGameFolkTap === 'function' && gardenGameFolkTap(id)) return true;   // (folk3: a click on someone in a game is a move in it: Found you!)
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
    if (typeof gardenSceneForTalk === 'function' && gardenSceneForTalk(id, V, m)) return true;   // (folk3: the beat is a moment you see, 94-garden-wonder-folk3-8scene.js)
    if (_vfrTalkWith(id, V, m)) return true;
    if (id === 'angler') { gardenPopupOpen('catch', { sub: 'lake', title: 'The old angler' }); return true; }
  } catch (e) { console.error('[folk talk]', e); }
  return false;
}
/** What someone says and offers when you talk to them: their story, today's news, favours, Give something, friendship. The same for
 *  the host and for a visiting friend (friends are trusted: full co-op), each kept in the talker's own vale. False: nothing to say. */
function _vfrTalkWith(id, V, m) {
  if (id === 'angler') return !!(typeof wdAnglerTalk === 'function' && wdAnglerTalk({ door: { x: V.x - 0.5, y: V.y - 0.5 } }));
  if (WD_FOLK_ROW.get(id)) { _wdFolkTalk(_vfrProxy(V)); return true; }
  if (typeof WD_TALE_RESIDENTS !== 'undefined' && WD_TALE_RESIDENTS.get(id)) { _wtResTalk(WD_TALE_RESIDENTS.get(id), { x: V.x, y: V.y }); return true; }
  if (id === 'perpetua') { _vfrPerpetuaTalk(V, m); return true; }
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
  end() { _vfr.on = false; for (const S of _vfr.marks || []) { try { S.remove(); } catch (e) { /* gone */ } } _vfr.marks = []; for (const V of _vfr.V.values()) _vfrHide(V); _vfr.V.clear(); _vfr.plans.clear(); _vfr.list = []; },
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
  if (V.drive && typeof gardenFolkDrivePose === 'function') return gardenFolkDrivePose(V);   // (folk3: 'run', 'walk' or the pose)
  const e = V.entry; if (V.hold) return V.arrived && e && e.clip === 'sit' ? 'sittalk' : 'talk';
  if (V.waiting) return 'idle';   // (stopped for someone in the way: stood, on every screen)
  if (!V.arrived || !e) return 'walk';
  if (V.visit) return 'idle';
  return e.clip === 'sit' ? (V.rubbing ? 'rub' : 'sit') : e.clip === 'fish' ? 'fish' : e.clip === 'read' ? 'read' : (typeof VF3_POSE_CLS !== 'undefined' && VF3_POSE_CLS[e.clip] ? e.clip : 'idle');   // (folk3: stall, warm, browse)
}
function _vfrHostSend(now) {
  if (typeof _gll === 'undefined' || _gll.role !== 'host' || typeof _glh === 'undefined' || !_glh.on || !_glhAnyone() || !_glhLooking()) return;
  if (now - _vfl.at < (typeof gardenGameBusy === 'function' && gardenGameBusy() ? 400 : 800)) return; _vfl.at = now;   // (folk3: twice as often while a game runs: a runner covers four cells in 0.8 s)
  if (_gll.actors.size !== _vfl.n) { _vfl.n = _gll.actors.size; _vfl.sig = ''; _vfl.sentAt = 0; }   // (someone has just come in: the whole list at once)
  const n10 = (v, hi) => Math.max(0, Math.min(hi * 10, Math.round(v * 10))), W = GARDEN_WORLD, l = [];
  for (const V of _vfr.list || []) {
    if (V.inside || V.x == null) continue;
    // the way ahead (the next few points of their path, on screen or off), so a friend's copy walks the same way round things
    const ahead = V.waiting ? null : V.path && V.path.length ? V.path : V.offWalk && V.ahead && V.ahead.length ? V.ahead : null;
    const p = ahead ? ahead[ahead.length - 1] : { x: V.x, y: V.y };
    const r = { i: V.id, x: n10(V.x, W.cols), y: n10(V.y, W.rows), tx: n10(p.x, W.cols), ty: n10(p.y, W.rows), a: V.offWalk ? 'walk' : _vfrPoseWord(V), f: V.face < 0 ? 1 : 0 };
    if (ahead) { r.p = []; for (const q of ahead.slice(0, 6)) r.p.push(n10(q.x, W.cols), n10(q.y, W.rows)); }
    if (V.hold && V.hold.by != null) r.h = Math.max(0, Math.min(9, Number(V.hold.by) || 0));
    if (V.nod && performance.now() < V.nod.until) r.w = 1;   // (a wave in passing: friends see it too)
    l.push(r); if (l.length >= 16) break;
  }
  // (a live message is at most 1400 bytes: the ways ahead are shortened, the farthest first, until it fits)
  for (let guard = 0; guard < 40 && JSON.stringify({ l }).length > 1300; guard++) { let big = null; for (const r of l) if (r.p && (!big || r.p.length > big.p.length)) big = r; if (!big) break; big.p.length -= 2; if (!big.p.length) delete big.p; }
  const sig = JSON.stringify(l.map(r => [r.i, Math.round(r.x / 5), Math.round(r.y / 5), r.tx, r.ty, r.a, r.f, r.h, r.w, r.p ? r.p.slice(0, 2) : 0]));   // (where they are, to half a cell: a walk is told every 0.8 s, a rest every 8 s)
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
    const to = { x: r.x / 10, y: r.y / 10 }, ahead = [];
    if (Array.isArray(r.p)) for (let k = 0; k + 1 < r.p.length && ahead.length < 8; k += 2) if (Number.isFinite(r.p[k]) && Number.isFinite(r.p[k + 1])) ahead.push({ x: r.p[k] / 10, y: r.p[k + 1] / 10 });
    { const G = GARDEN_WORLD; V.need = Math.hypot((V.x - to.x) * G.cellW, (V.y - to.y) * G.cellH) + (r.a === 'walk' ? 0.8 * VALE_FOLK_SPEED * (VALE_FOLK_ROW.get(r.i).speed || 1) : r.a === 'run' && typeof VF3_RUN === 'number' ? 0.4 * VF3_RUN : 0); V.done = 0; }   // (0.8 s: about how old a message is when it comes, measured on a local relay: sent every 0.8 s, then carried)
    V.goal = { x: r.tx / 10, y: r.ty / 10 }; V.a = String(r.a || 'idle'); V.f = r.f ? -1 : 1; V.heldBy = r.h; V.wave = r.w ? performance.now() + 1600 : 0; V.at = performance.now();
    // the way the host's villager walks: first to where the host saw them (straight only where that is clear; else on along the way
    // they were already going, which leads there), then on along the host's own path. Nothing is ever walked straight through a wall.
    if (r.a !== 'walk' && r.a !== 'run') ahead.length = 0;   // (standing, or stopped for someone: only to where the host has them, no further)
    if (Math.hypot(V.x - to.x, V.y - to.y) > 3) { V.x = to.x; V.y = to.y; V.route = ahead; V.need = 0; }
    else if ((r.a !== 'walk' && r.a !== 'run') || Math.hypot(V.x - to.x, V.y - to.y) < 0.15 || typeof _gwFree !== 'function' || _vfrLineFree(V, to)) V.route = [to].concat(ahead);
    else V.route = (V.route || []).slice(0, 16).concat([to], ahead);
  }
  for (const [id, V] of _vfg.V) if (!seen.has(id)) { if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } } _vfg.V.delete(id); }   // gone in at a door, or off by the road
}
function _vfgFrame(dt) {
  const G = GARDEN_WORLD, v = _vfrView();
  // (a talk of yours with one of them has closed: they are let go on every screen)
  for (const V of _vfg.V.values()) if (V.mine && !(typeof _wd !== 'undefined' && _wd.talk)) { V.mine = false; try { gardenLiveFx('folk', 'bye', { i: V.id }); } catch (e) { /* alone */ } }
  for (const V of _vfg.V.values()) {
    // along the host's own path, at their own pace (a little quicker while catching up)
    // (the host's villager has walked on since that message came: how far behind theirs this copy is, in px; quicker in proportion, up to
    // half as fast again, so the two screens stay within a cell)
    const run = V.a === 'run' && typeof VF3_RUN === 'number', v0 = run ? VF3_RUN * (V.row.speed || 1) : VALE_FOLK_SPEED * (V.row.speed || 1);   // (folk3: a villager running a race runs on a friend's screen too)
    if ((V.a === 'walk' || run) && V.route && V.route.length) V.need = (V.need || 0) + v0 * dt;
    const lag = Math.max(0, (V.need || 0) - (V.done || 0)) / G.cellW;
    let st = v0 * dt * (1 + Math.min(0.5, lag * 0.4)), moved = false, hdx = 0, hdy = 0;
    const st0 = st;
    while (st > 0 && V.route && V.route.length) {
      const p = V.route[0], dx = (p.x - V.x) * G.cellW, dy = (p.y - V.y) * G.cellH, d = Math.hypot(dx, dy);
      if (d <= st) { V.x = p.x; V.y = p.y; V.route.shift(); st -= d; if (d > 0.01) { hdx = dx; hdy = dy; moved = true; } continue; }
      V.x += dx / d * st / G.cellW; V.y += dy / d * st / G.cellH; hdx = dx; hdy = dy; moved = true; st = 0;
    }
    V.done = (V.done || 0) + (st0 - st);
    if (moved) _vfrHeadTo(V, hdx, hdy, dt);
    // (drawn only near your view, as the host draws theirs: someone thirty cells off is not drawn at all)
    const nearV = _vfrNearView(V.x, V.y, v, VFR_NEAR);
    if (!nearV) { if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } V.S = null; V.drawn = ''; } continue; }
    if (!V.S) { V.S = wdSprite({ id: 'vfg-' + V.id, x: V.x, y: V.y, hit: 0.75, hitUp: 16, label: V.row.name, cursor: 'hand', ground: true, svg: '', lift: 0, update() { }, onClick: () => gardenFolkGuestTalk(V.id) }); V.drawn = ''; }
    const walking = moved && (V.a === 'walk' || run);
    if (!walking) V.face = (V.a === 'talk' || V.a === 'sittalk' || V.mine) && V.mine && typeof _gw !== 'undefined' ? (_gw.px > V.x ? 1 : -1) : V.f;
    const pose = V.a === 'walk' || V.a === 'run' ? 'idle' : V.a, view = !walking && typeof VF3_POSE_VIEW !== 'undefined' && VF3_POSE_VIEW[pose] ? (V.view = VF3_POSE_VIEW[pose]) : _vfrView3(V, walking, pose), face = V.face < 0 ? -1 : 1, wave = V.wave && performance.now() < V.wave, k = pose + (walking ? 'w' : '') + face + view + (wave ? 'v' : '');
    if (V.drawn !== k) { V.drawn = k; wdArt(V.S, _vfrMarkup(V, pose, walking, face, wave ? 'wave' : false, view)); }
    V.S.x = V.x; V.S.y = V.y;
    if (run && walking && typeof _vf3Stride === 'function') _vf3Stride(V, true, view, V.runD || (V.runD = { speed: v0, gait: 'r' })); else _vfrStride(V, walking, view);
    const sat = pose === 'sit' || pose === 'rub' || pose === 'sittalk'; V.S.lift = sat ? _vfrSeatLift(V, null) : 0;
  }
}
function gardenFolkGuestTalk(id) {
  const V = _vfg.V.get(id); if (!V) return false;
  try { gardenLiveFx('folk', 'talk', { i: id }); } catch (e) { /* alone */ }
  V.mine = true; V.drawn = '';
  let m = null; try { m = gardenModel(); } catch (e) { m = null; }
  // a visiting friend is trusted: the same talk as the host gets (their story, news, favours, Give something, friendship), worked out
  // from and kept in your own vale; only when they have nothing more to say today, their day line as they would say it to a visitor
  let ok = false; try { ok = !!m && _vfrTalkWith(id, V, m) && !!_wd.talk; } catch (e) { console.error('[folk talk]', e); ok = false; }
  if (ok) return true;
  const rows = (typeof WK_DAY !== 'undefined' && WK_DAY[id]) || (id === 'perpetua' ? VFR_PERPETUA_DAY : null);
  let line = ''; try { const F = typeof wdFacts === 'function' && m ? (typeof _wkFacts === 'function' ? _wkFacts(wdFacts(m, id), m) : wdFacts(m, id)) : {}; line = rows && typeof _wkDayPick === 'function' ? _wkDayPick(id, rows, F, m ? m.today : '') : ''; } catch (e) { line = ''; }
  wdTalk({ name: V.row.name, art: typeof gardenCastSvg === 'function' ? gardenCastSvg(V.row.cast) : '', lines: [line || 'Oh, hello again. Any friend of theirs is a friend of the vale.'].filter(Boolean), actions: [], at: { x: V.x, y: V.y }, bye: 'Goodbye' });
  return true;
}
wdMod({
  id: 'vale-folk-guest', pref: 'folk', visit: true,
  begin() { },
  frame(dt) { if (typeof _gll !== 'undefined' && _gll.role === 'visit' && _vfg.V.size) { try { _vfgFrame(dt); } catch (e) { console.error('[folk guest]', e); } } },
  tick(m) { if (!m.visit && _vfg.V.size) this.end(); },
  end() { for (const V of _vfg.V.values()) if (V.S) { try { V.S.remove(); } catch (e) { /* gone */ } } _vfg.V.clear(); },
});
