// The static preflight (docs/dev/WORLD_ENGINE.md 16.4, 16.7): what the full invariant gate WILL report, predicted in about a second
// per scene from the three season worlds alone, before any 15-cell run. Node >= 20, no dependencies. Never a gate: the full gate
// (`world invariants`) is unchanged and still decides.
//
//   worldPreflight(E, spec, o)   -> { id, ms, dates, facts }: o { id, ref, hz (the gate's frame rate, 5) }. E: loadEngine() (with
//                                E.priv, convert.mjs PRIVATE_NAMES)
//   preflightText(res, title)    -> a printable report: each predicted fact once, ranked, in the critic's rule / msg / fix style
//   PREFLIGHT_STATIC_RULES       the static rule set, judged by the gate's own worldInvariants (79-world-9inv.js) on render's
//                                worldFrameAt at every one of the 15 gate moments (the absent set and the sun differ by time of day)
//   PREFLIGHT_ROUTE_RULES        the rules a lane or rail vehicle can break on its known path (the route sweeps)
//
// The three parts (E1, C:/tmp/scene-study/e1-probe.mjs, measured 22 Oct: 35 of 35 of MediaCity's tram overlaps, none on Deansgate):
//   1. statics: worldBuild for each gate date (the fill differs by date), then worldInvariants({ rules: PREFLIGHT_STATIC_RULES }) on
//      worldFrameAt(world, 0) at each gate moment. The gate's own code and thresholds: nothing is re-implemented.
//   2. route sweeps: a rail position is a pure function of the clock (worldTrafficRailAt), a lane vehicle can only be on its lane
//      inside its span (worldTrafficSpan, at the kerb offset). Rails: the timetable at the gate's clock (90 s warm-up, the framed
//      offset life gives it) every 0.1 s over one full pattern, plus every arc-length pose at 0.05 m. Two corrections E1 found:
//      across a polyline vertex the heading SNAPS while the record's velocity is the chord of the last life step, so the swept
//      body takes every chord pose near each vertex (a hull drawn in perspective follows the velocity, a sprite box the heading:
//      both are judged); and a lane vehicle is DRAWN one move step behind (the 5 Hz frame lerps at alpha 0): centre at s, chord to
//      s + d. Each pose is a candidate when the gate's own geometry (_wivPen, _wivPolyDist, render's _wfrRec box) touches at all
//      (zero tolerance, a superset); a candidate becomes a fact only when the gate's rules (worldInvariants with
//      PREFLIGHT_ROUTE_RULES) report it on render's own frame record of that pose (worldFrameAt with the pose as its one agent).
//   3. advisories that no gate rule covers: `laneBlocked` (a lane whose traffic population never runs, because a parked vehicle
//      or another solid stands within 1.2 m of its line: worldTrafficSpan gives it no span; E1, Kelham-3's alma:f in every season).
// A fact: { rule, id, sev: 'error' | 'advice', kind: 'static' | 'route' | 'lane', msg, fix, owner, seasons, first: { date, moment, t,
// when }, n }. Ranked: errors first, then the most seasons, then the earliest first hit.
import { worldMomentsOf, OWNERS } from './adversarial.mjs';

export const PREFLIGHT_STATIC_RULES = Object.freeze(['habitat', 'overlap', 'pathBlocked', 'walkwayWater', 'floating', 'orphan', 'giant', 'nearStatic', 'crownCut', 'landmark', 'bare', 'edgeCut', 'season', 'laneDir']);
export const PREFLIGHT_ROUTE_RULES = Object.freeze(['overlap', 'inSolid', 'edgeCut', 'nearBand', 'laneDir']);
// the sweep's sampling (not thresholds: every decision is the gate's): lanes every 0.25 m, rails every 0.1 s and 0.05 m, chord
// poses every 0.02 m with chords 0.05 m apart; how many candidate poses of one fact are put to the gate's rules
const SWEEP = Object.freeze({ laneDs: 0.25, railDt: 0.1, railDs: 0.05, chordDs: 0.02, chordDd: 0.05, confirmTimed: 6, confirmGeom: 3, edgeMargin: 120 });
const FIX = {
  habitat: 'move it onto a surface its class may use (K1), or leave it to the fill (P6)',
  overlap: 'move the two solids apart (P2: 5 cm)',
  pathBlocked: 'keep the 1.2 m walking line clear (move the solid, or set blocks: true where it really blocks)',
  walkwayWater: 'a walkway joins land to land (or runs to a platform at a reed edge) and never crosses open water',
  floating: 'stand it on the ground, the water or its deck (W2)',
  orphan: 'place it within reach of its parent, or name parent (K4)',
  giant: 'use the class\'s real size (K8); nothing drawn as a giant at the lens',
  nearStatic: 'move it beyond its near band, or mark it framed: true when it frames the view (C1, C2)',
  crownCut: 'move the tree back or choose a lower one, so its crown shows (C1)',
  landmark: 'clear the line of sight to the landmark\'s face (C4, P8)',
  bare: 'dress that part of the frame (fill tiers) or move the camera (C6)',
  edgeCut: 'bring it inside the frame, or mark it a framing element (C1)',
  season: 'leave the state to the engine: no pinned season (S1, V3)',
};
const ROUTE_FIX = {
  overlap: (f) => `keep solids out of the swept path of ${f.mover} on ${f.where}: move ${f.id}${!/^fill-/.test(f.id) ? '' : /^tree\./.test(f.obj || '')
    ? ' (a fill tree: the fill keeps furniture out of rail paths but not trees, so change the ground it grows on there, or straighten the track; engine: 79-world-1fill.js)'
    : ' (fill furniture: its rail keep-out, w/2 + 1.9 m, is too tight where the body swings out on a curve; ease the curve, or report it to the fill; engine: 79-world-1fill.js)'}`,
  inSolid: (f) => `move ${f.id} off ${f.where}, or the lane off it (a kerb vehicle rides 0.75 m in from the edge)`,
  edgeCut: (f) => `end ${f.where} before the bottom edge, or move the camera (C1, C2)`,
  nearBand: (f) => `end ${f.where} before the near band (f x h / 405 m), or move the camera (C2)`,
  laneDir: (f) => `${f.where} passes within half a road of another road's centre line (a junction): the gate judges a car by the nearest road line and has no junction exemption; end the crossing road's line at the kerb of this one, or move it clear (engine: laneDir, 79-world-9inv.js)`,
};
const MOVER_RULES = new Set(['edgeCut', 'nearBand', 'laneDir']);
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
/** Distance from a point to a segment (plain geometry; candidates only, the gate's rule decides). */
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
const now = () => performance.now();
const copy = (o) => JSON.parse(JSON.stringify(o));

/* ---------- a grid over the gate's solid set (statics only: the movers are the swept bodies) ---------- */
function solidGrid(P, list) {
  const cell = 4, m = new Map(), arr = [];
  for (const s of list.values()) {
    if (s.static === false) continue;
    const r = P._wivRadiusOf(s), it = { s, x: s.x, z: s.z, r };
    arr.push(it);
    for (let i = Math.floor((s.x - r) / cell); i <= Math.floor((s.x + r) / cell); i++) for (let j = Math.floor((s.z - r) / cell); j <= Math.floor((s.z + r) / cell); j++) {
      const k = i + ',' + j; let l = m.get(k); if (!l) m.set(k, l = []); l.push(it);
    }
  }
  return {
    n: arr.length,
    near(x, z, r) {
      const out = new Set();
      for (let i = Math.floor((x - r) / cell); i <= Math.floor((x + r) / cell); i++) for (let j = Math.floor((z - r) / cell); j <= Math.floor((z + r) / cell); j++) {
        const l = m.get(i + ',' + j); if (l) for (const it of l) if (Math.hypot(it.x - x, it.z - z) <= it.r + r + 1e-6) out.add(it.s);
      }
      return out;
    },
  };
}

/* ---------- the poses a lane or rail vehicle can take ---------- */
/** Arc lengths on [s0, s1]: a regular grid plus both sides of every polyline vertex (the heading snaps there). */
function samplesOf(cum, s0, s1, ds) {
  const out = [];
  for (let s = s0; s <= s1 + 1e-9; s += ds) out.push(s);
  for (const c of cum || []) for (const d of [-1e-4, 1e-4]) { const s = c + d; if (s >= s0 && s <= s1) out.push(s); }
  return out.sort((a, b) => a - b);
}
/**
 * The bodies the gate really checks near a vertex: the velocity is the chord of the last life step, the heading the segment's, so
 * across a vertex the body takes every angle between the two. Rail (ahead false): centre at s, chord from s - d. Lane (ahead true):
 * the drawn centre is the previous step's: centre at s, chord to s + d, heading the newer step's. -> [{ s, x, z, heading, vdir, d }]
 */
function chordPoses(path, placeAt, s0, s1, Lmax, ahead) {
  const out = [], cum = path.cum;
  for (let i = 1; i < cum.length - 1; i++) {
    const v = cum[i];
    const a0 = ahead ? Math.max(s0, v - Lmax) : Math.max(s0, v), a1 = ahead ? Math.min(s1, v) : Math.min(s1, v + Lmax);
    for (let s = a0; s <= a1 + 1e-9; s += SWEEP.chordDs) {
      for (let d = SWEEP.chordDd; d <= Lmax + 1e-9; d += SWEEP.chordDd) {
        const sa = ahead ? s : s - d, sb = ahead ? s + d : s;
        if (!(sa < v && sb >= v) || sa < 0 || sb > path.len) continue;          // only chords that cross the vertex are new poses
        const A = placeAt(sa), B = placeAt(sb), C = ahead ? A : B;
        out.push({ s, x: C.x, z: C.z, heading: B.heading, vdir: Math.atan2(B.x - A.x, B.z - A.z), chord: d });
      }
    }
  }
  return out;
}
function kbH(E, obj, b, dflt) {
  let kb = null; try { kb = E.worldKb ? E.worldKb(obj) : null; } catch { kb = null; }
  return kb && kb.size && Array.isArray(kb.size.h) ? kb.size.h[1] : b && b.h ? b.h[1] : dflt;
}
/** Every pose of every lane vehicle of the life populations; a lane that gets no span is an advisory (laneBlocked). */
function lanePoses(E, life) {
  const T = life.traffic, poses = [], none = [];
  if (!T) return { poses, none };
  const step = E.WORLD_LIFE_STEP || 1 / 15;
  for (const pop of life.pops) {
    const spec = pop.spec || {};
    let lanes = T.lanes.filter(l => !spec.on || l.road === spec.on);
    if (!lanes.length) lanes = T.lanes;
    for (const ent of pop.entries) {
      const b = E.worldBrains[ent.m.cls];
      if (!b || b.kind !== 'lane') continue;
      const obj = (spec.obj && spec.obj[ent.key]) || ent.m.obj, info = E.worldObjectInfo(obj);
      const len = info && info.size ? Math.max(1.6, info.size.w) : (ent.m.cls === 'bus' ? 11 : 4.2);
      const h0 = Math.max(info && info.size ? info.size.h : 0, b.h ? b.h[1] : 1.6), hMax = kbH(E, obj, b, h0);
      for (const lane of lanes) {
        const span = E.worldTrafficSpan(T, lane, h0, len);
        if (span.blocked || span.s1 - span.s0 < len * 2) { none.push({ lane: lane.id, road: lane.road, who: spec.who || null, obj, blocked: !!span.blocked, blocks: lane.blocks.slice(), span: [r1(span.s0), r1(span.s1)] }); continue; }
        const kerb = b.kerb ? lane.kerb : 0;
        const placeAt = (s) => { const p = E.worldTrafficLaneAt(lane, s); return { x: p.x - p.tz * kerb, z: p.z + p.tx * kerb, heading: Math.atan2(p.tx, p.tz) }; };
        const base = { kind: 'lane', cls: ent.m.cls, obj, layer: b.layer, where: lane.id, road: lane.road, len, h: hMax };
        for (const s of samplesOf(lane.cum, span.s0, span.s1, SWEEP.laneDs)) { const c = placeAt(s); poses.push({ ...base, s, x: c.x, z: c.z, heading: c.heading, vdir: c.heading }); }
        // across a vertex: the drawn centre a step behind, the velocity along the chord (a gait up to 1.2 x the brain's top speed)
        const Lmax = (b.speed ? b.speed[1] : 13.4) * 1.2 * step;
        for (const c of chordPoses(lane, placeAt, span.s0, span.s1, Lmax, true)) poses.push({ ...base, s: c.s, x: c.x, z: c.z, heading: c.heading, vdir: c.vdir, chord: c.chord });
      }
    }
  }
  return { poses, none };
}
/** The gate's timetable phase: a gate cell's life warms up 90 s first, so a framed line's offset is the one for show0 = 90. */
function gatePhase(E, P, life) {
  const warm = E.WORLD_LIFE_WARM && Number.isFinite(E.WORLD_LIFE_WARM.secs) ? E.WORLD_LIFE_WARM.secs : 90, T = life.traffic;
  for (const pop of life.pops) for (const ent of pop.entries) {
    const tt = ent.tt; if (!tt) continue;
    let off0 = null, offW = null;
    try { off0 = P._wtrFramedOffset(T, tt, 0); offW = P._wtrFramedOffset(T, tt, warm); } catch { /* keep */ }
    const framed = off0 != null && Math.abs(off0 - tt.offset) < 1e-6 && !P._wtrParkedOn(T, tt.tracks);
    if (framed && offW != null) tt.offset = offW;
  }
  return warm;
}
function railPoses(E, life) {
  const T = life.traffic, timed = [], arc = [], entries = [];
  if (!T) return { timed, arc, entries };
  const step = E.WORLD_LIFE_STEP || 1 / 15;
  for (const pop of life.pops) for (const ent of pop.entries) {
    const tt = ent.tt; if (!tt) continue;
    const b = E.worldBrains[ent.m.cls], obj = (pop.spec && pop.spec.obj && pop.spec.obj[ent.key]) || ent.m.obj, hMax = kbH(E, obj, b, 3.6);
    const span = tt.period * tt.tracks.length;
    entries.push({ id: tt.id, obj, period: tt.period, span });
    // the timetable at the gate's clock, one full pattern at 0.1 s; the velocity is the chord of the last life step
    for (let c = 0; c < span - 1e-9; c += SWEEP.railDt) {
      const prev = new Map(E.worldTrafficRailAt(T, tt, c - step).map(r => [r.k, r]));
      for (const r of E.worldTrafficRailAt(T, tt, c)) {
        const q = prev.get(r.k), moving = q && Math.hypot(r.x - q.x, r.z - q.z) / step > 0.05;
        timed.push({ kind: 'rail', timed: true, cls: ent.m.cls, obj, layer: 'rail', where: r.track.id, trackKind: r.track.kind, s: r.s, x: r.x, z: r.z, heading: r.heading,
          vdir: moving ? Math.atan2(r.x - q.x, r.z - q.z) : r.heading, clock: c, span, h: hMax, state: r.state });
      }
    }
    // every pose a rigid body centred on the track can take: the tangent, and across each vertex every chord a step can make
    const Lmax = (tt.v || 13) * 1.05 * step;
    for (const tr of tt.tracks) {
      const placeAt = (s) => { const p = E.worldTrafficLaneAt(tr, s); return { x: p.x, z: p.z, heading: Math.atan2(p.tx, p.tz) }; };
      const base = { kind: 'rail', cls: ent.m.cls, obj, layer: 'rail', where: tr.id, trackKind: tr.kind, h: hMax };
      for (const s of samplesOf(tr.cum, 0, tr.len, SWEEP.railDs)) { const c = placeAt(s); arc.push({ ...base, s, x: c.x, z: c.z, heading: c.heading, vdir: c.heading }); }
      for (const c of chordPoses(tr, placeAt, 0, tr.len, Lmax, false)) arc.push({ ...base, s: c.s, x: c.x, z: c.z, heading: c.heading, vdir: c.vdir, chord: c.chord });
    }
  }
  return { timed, arc, entries };
}

/* ---------- one pose: the agent the life sim would hand render ---------- */
function poseAgent(E, world, q, id) {
  let y = 0;
  if (typeof E.worldNavY === 'function' && world.nav) { try { y = E.worldNavY(world.nav, q.layer === 'rail' ? 'walk' : q.layer, q.x, q.z) || 0; } catch { y = 0; } }
  if (q.trackKind === 'rail' && E.WORLD_RAIL_BED) y += E.WORLD_RAIL_BED.h;
  const vd = Number.isFinite(q.vdir) ? q.vdir : q.heading, v = q.state === 'stopped' ? 0 : 8;
  return { id, obj: q.obj, cls: q.cls, kind: q.kind, layer: q.layer, x: q.x, y, z: q.z, heading: q.heading, vx: Math.sin(vd) * v, vz: Math.cos(vd) * v, len: q.len || 28, h: q.h, r: 1, state: q.state === 'stopped' ? 'stopped' : 'drive' };
}
/** The candidates of one pose against one solid set: the gate's geometry at zero tolerance (every hit the rules could report).
 *  frame: also the rules that do not depend on the solids (nearBand, the bottom-edge cut): once per pose and date. */
function candidates(E, P, world, q, ss, cam, season, cand, frame) {
  const a = poseAgent(E, world, q, 'route:' + q.where), ent = P._wfrAgentEnt(a);
  if (!(ent.z > 0.3)) return;                                // behind the lens: render keeps no record
  const vd = Number.isFinite(q.vdir) ? q.vdir : q.heading, moving = a.state !== 'stopped';
  const feet = [ent.foot];
  if (moving && Math.abs(Math.atan2(Math.sin(vd - q.heading), Math.cos(vd - q.heading))) > 1e-6) feet.push(P._wfrAgentFoot(Object.assign({}, a, { heading: vd })));
  // depth: how deep the geometry meets (reported); rank: the order the candidates are put to the gate's rules (default: deepest first)
  const add = (rule, id, depth, rank) => {
    const key = rule + '|' + id + '|' + ss.key;
    let c = cand.get(key); if (!c) cand.set(key, c = { rule, id, ss, poses: [] });
    c.poses.push({ q, depth, rank: rank != null ? rank : depth });
  };
  const m = { id: a.id, static: false, cls: q.cls, obj: q.obj, x: ent.x, z: ent.z, foot: ent.foot, layer: q.layer, solidity: null, height: q.h };
  // overlap (P2): only a mover the gate puts in its solid set (vehicle, train, tram or boat with a solid footprint)
  const solidMover = /^(vehicle|train|tram|boat)$/.test(P._wivCls(m) || '') && P._wivSolidity(m) === 'solid' && P._wivFootOf(m);
  if (solidMover) {
    for (const s of ss.grid.near(m.x, m.z, P._wivRadiusOf(m))) {
      if (P._wivRelated(s, m)) continue;
      for (const F of feet) {
        const mf = F === m.foot ? m : Object.assign({}, m, { foot: F });
        if (P._wivDisjointLong(s, mf)) continue;
        const p = P._wivPen(s.foot, F);
        if (p > 0) add('overlap', s.id, p);
      }
    }
  }
  // inSolid (A2): the mover's centre inside a static solid (rail and air movers are exempt)
  if (q.layer !== 'air' && q.layer !== 'rail') for (const s of ss.grid.near(m.x, m.z, 0.01)) { if (!P._wivRelated(m, s)) { const d = P._wivPolyDist(s.foot, m.x, m.z); if (d < 0) add('inSolid', s.id, -d); } }
  if (!frame) return;
  // laneDir (A9): a lane vehicle is judged against the nearest road; it can only be 'on the right' of ANOTHER road (a junction, a
  // crossing street): a candidate wherever another road's line comes within its half width + 2 m (a superset of the rule's + 0.5 m)
  // (ranked by how far it sits to the right of that road's line for its direction of travel: the rule's own reading, at zero tolerance)
  if (q.kind === 'lane' && ss.roads && ss.roads.length) {
    let dOwn = Infinity;
    const own = ss.roads.find(s => s.id === q.road);
    if (own) for (let i = 1; i < own.path.length; i++) dOwn = Math.min(dOwn, segDist(q.x, q.z, own.path[i - 1], own.path[i]));
    const vd = Number.isFinite(q.vdir) ? q.vdir : q.heading, vx = Math.sin(vd), vz = Math.cos(vd);
    let worst = 0, rank = -Infinity;
    for (const s of ss.roads) {
      if (s.id === q.road) continue;
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1], b = s.path[i], d = segDist(q.x, q.z, a, b);
        if (d > (s.width || 0) / 2 + 2 || d > dOwn + 0.01) continue;
        let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
        if (vx * tx + vz * tz < 0) { tx = -tx; tz = -tz; }
        const ox = q.x - a[0], oz = q.z - a[1], al = ox * tx + oz * tz, side = (ox - al * tx) * -tz + (oz - al * tz) * tx;
        if (side < worst) worst = side;
        // the order to try them in: within the rule's reach of the line first (half width + 0.5 m), then the farthest to the right
        if (side < 0) rank = Math.max(rank, (d <= (s.width || 0) / 2 + 0.5 ? 100 : 0) - side);
      }
    }
    if (worst < 0) add('laneDir', q.where, -worst, rank);
  }
  // nearBand (C2)
  if (cam.f && ent.z < cam.f * q.h / 405) add('nearBand', q.where, cam.f * q.h / 405 - ent.z);
  // the bottom-edge cut (C1, C2): body corners projected first (cheap), then render's own record box where it can matter (a box's
  // bottom is the body's lowest ground point: a sprite's foot row, a hull's nearest corner; 120 px is a wide margin over that)
  let cy = -Infinity;
  for (const F of feet) for (const c of F) { try { const pp = E.sceneProject(cam, c[0], Math.max(0.3, c[1]), a.y); if (pp && Number.isFinite(pp.Y)) cy = Math.max(cy, pp.Y); } catch { /* none */ } }
  if (cy > ss.H - SWEEP.edgeMargin) {
    let r = null; try { r = P._wfrRec(ent, cam, { season, agent: true, prev: null, regions: ss.regions }); } catch { r = null; }
    const b = r && r.box;
    if (b && b.y1 > ss.H) add('edgeCut', q.where, b.y1 - ss.H);
  }
}
/** The gate's own route rules on render's own frame record of one pose (the pose as the frame's one agent). -> [violation] */
function confirm(E, world, ss, q) {
  const id = 'route:' + q.where, a = poseAgent(E, world, q, id);
  world.time = ss.ctx;
  if (world.$wfr) { world.$wfr._lights = null; world.$wfr._look = null; }
  const fr = E.worldFrameAt(world, 0, { agents: [a], ctx: ss.ctx });
  fr.ctx = ss.ctx;
  const v = E.worldInvariants(fr, { world, agents: [a], rules: PREFLIGHT_ROUTE_RULES });
  return v.filter(x => x.id === id || String(x.msg).includes('(' + id + ')'));
}
/** The static id of a route violation (the gate names the pair in either order). */
function otherId(v, moverId) {
  if (v.rule === 'overlap') { const m = /\(([^()]+)\) and .*\(([^()]+)\) overlap/.exec(String(v.msg)); if (m) return m[1] === moverId ? m[2] : m[1]; }
  if (v.rule === 'inSolid') { const m = /\(([^()]+)\)\s*$/.exec(String(v.msg)); if (m) return m[1]; }
  return v.id === moverId ? null : v.id;
}
/** The earliest gate time (0..loop, after the warm-up) at which the timetable clock c comes round. */
function gateTimes(c, span, warm, loop) {
  const out = [];
  for (let k = -3; k <= 4; k++) { const t = c + k * span - warm; if (t >= -1e-6 && t <= loop + 1e-6) out.push(r1(Math.max(0, t))); }
  return out.sort((x, y) => x - y);
}

/* ---------- the preflight of one scene ---------- */
export function worldPreflight(E, spec, o = {}) {
  const P = E.priv || {};
  const missing = ['_wfrRec', '_wfrAgentEnt', '_wfrAgentFoot', '_wfrAbsent', '_wivContext', '_wivSolids', '_wivPen', '_wivPolyDist', '_wivRelated', '_wivDisjointLong', '_wivRadiusOf', '_wivCls', '_wivSolidity', '_wivFootOf', '_wtrFramedOffset', '_wtrParkedOn'].filter(n => typeof P[n] !== 'function');
  if (missing.length) throw new Error('preflight: the engine was loaded without its private helpers (' + missing.join(', ') + '): use convert.mjs loadEngine');
  const moments = worldMomentsOf(spec), lat = spec.place && Number.isFinite(spec.place.lat) ? spec.place.lat : 51.5;
  const loop = Number.isFinite(E.WORLD_LOOP_S) ? E.WORLD_LOOP_S : 360, hz = Number(o.hz) > 0 ? Number(o.hz) : 5;   // the gate's frame rate (world invariants --hz)
  const dates = [...new Set(moments.map(m => m.date))];
  const res = { id: o.id || null, ref: o.ref || null, ms: { build: 0, nav: 0, life: 0, frame: 0, statics: 0, poses: 0, sweep: 0, confirm: 0, total: 0 }, dates: [], facts: [] };
  const facts = new Map();
  const earlier = (a, b) => { const ta = a.t != null ? a.t : Infinity, tb = b.t != null ? b.t : Infinity; return ta < tb || (ta === tb && a.date < b.date); };
  const fact = (key, f, season, first) => {
    let x = facts.get(key);
    if (!x) facts.set(key, x = Object.assign({ seasons: [], dates: [], first: null, n: 0 }, f));
    if (!x.seasons.includes(season)) x.seasons.push(season);
    if (first && !x.dates.includes(first.date)) x.dates.push(first.date);
    x.n++;
    if (first && (!x.first || earlier(first, x.first))) x.first = first;
  };
  const tAll = now();
  for (const date of dates) {
    const ms0 = moments.find(m => m.date === date).ms, season = E.sceneSeason ? E.sceneSeason(ms0, lat) : 'summer';
    const D = { date, season, ms: {}, counts: {} };
    let t = now();
    const world = E.worldBuild(copy(spec), { season, ms: ms0 });
    D.ms.build = now() - t;
    t = now(); world.nav = E.worldNavBuild(world); D.ms.nav = now() - t;
    t = now(); const life = E.worldLifeInit(world, world.nav, 0, { warm: false }); D.ms.life = now() - t;
    const warm = gatePhase(E, P, life);
    // 1. the static rule set at every gate moment of this date
    const trackers = new Map(), solidSets = new Map();
    D.ms.frame = 0; D.ms.statics = 0;
    for (const m of moments.filter(x => x.date === date)) {
      const ctx = E.worldTimeCtx(world, m.ms, { ms: m.ms, deterministic: true, quiet: true });
      world.time = ctx;
      const ab = P._wfrAbsent(world, ctx);
      let track = trackers.get(ab.key); if (!track) trackers.set(ab.key, track = E.worldInvariantTracker());
      // render keeps the statics' lights and look on the plan, keyed by season / absent set / day but not by the hour: a gate cell is
      // a fresh world per moment, so drop them here or the dawn lights are judged at noon
      if (world.$wfr) { world.$wfr._lights = null; world.$wfr._look = null; }
      t = now();
      const fr = E.worldFrameAt(world, 0, { agents: [], ctx });
      fr.ctx = ctx; if (!fr.season) fr.season = season;
      D.ms.frame += now() - t;
      t = now();
      const v = E.worldInvariants(fr, { world, agents: [], track, rules: PREFLIGHT_STATIC_RULES });
      D.ms.statics += now() - t;
      for (const x of v) fact('static|' + x.rule + '|' + x.id, { rule: x.rule, id: x.id, sev: 'error', kind: 'static', msg: x.msg, fix: FIX[x.rule] || 'see WORLD_ENGINE 16.2', owner: OWNERS[x.rule] || null }, season, { date, moment: m.moment, t: 0, when: `${date} ${m.moment}, t 0` });
      if (!solidSets.has(ab.key)) {
        const C = P._wivContext(fr, { world, agents: [] }), sol = P._wivSolids(C);
        // (the roads laneDir judges by: the rule's own filter, a centre line and two-way)
        const roads = (world.surfaces || []).filter(s => s && s.kind === 'road' && Array.isArray(s.path) && s.path.length >= 2 && !s.oneway);
        solidSets.set(ab.key, { key: ab.key, grid: solidGrid(P, sol.list), ctx, moment: m.moment, regions: world.$wfr ? world.$wfr.regions : [], H: Number.isFinite(fr.H) ? fr.H : 900, roads });
      }
    }
    // 2. the route sweeps against each distinct solid set of the date
    t = now();
    const lp = lanePoses(E, life), rp = railPoses(E, life);
    D.ms.poses = now() - t;
    D.counts = { lanes: life.traffic ? life.traffic.lanes.length : 0, tracks: life.traffic ? life.traffic.tracks.length : 0, lanePoses: lp.poses.length, railTimed: rp.timed.length, railArc: rp.arc.length, solidSets: solidSets.size };
    t = now();
    const cand = new Map(), cam = world.cam;
    let first = true;
    for (const ss of solidSets.values()) { for (const q of lp.poses.concat(rp.timed, rp.arc)) candidates(E, P, world, q, ss, cam, season, cand, first); first = false; }
    D.ms.sweep = now() - t;
    D.counts.candidates = cand.size;
    D.candidates = [...cand.values()].map(c => `${c.rule}|${c.id}|${c.ss.key}: ${c.poses.length}`);
    // each candidate fact put to the gate's rules: timed rail poses in gate-time order (the first that the rules report is the first
    // hit), arc and lane poses deepest first
    t = now();
    // (a gate frame is every 1 / hz s: the timed poses on that grid are tried first, so the first hit is a frame the gate draws)
    const onGrid = (t) => Math.abs(t * hz - Math.round(t * hz)) < 1e-6, gridFirst = (p) => { const g = p.ts.find(onGrid); return g != null ? g : Infinity; };
    for (const c of cand.values()) {
      const timed = c.poses.filter(p => p.q.timed).map(p => Object.assign(p, { ts: gateTimes(p.q.clock, p.q.span, warm, loop) })).filter(p => p.ts.length).sort((a, b) => (gridFirst(a) - gridFirst(b)) || (a.ts[0] - b.ts[0]));
      const geom = c.poses.filter(p => !p.q.timed).sort((a, b) => b.rank - a.rank);
      let hit = null, at = null, tries = 0;
      // (edgeCut, nearBand and laneDir name the mover; overlap and inSolid the solid it meets)
      const ours = (x, p) => x.rule === c.rule && (MOVER_RULES.has(c.rule) || otherId(x, 'route:' + p.q.where) === c.id);
      for (const p of timed.slice(0, SWEEP.confirmTimed)) { tries++; const v = confirm(E, world, c.ss, p.q).find(x => ours(x, p)); if (v) { hit = { v, p }; at = Number.isFinite(gridFirst(p)) ? gridFirst(p) : p.ts[0]; break; } }
      if (!hit) for (const p of geom.slice(0, SWEEP.confirmGeom)) { tries++; const v = confirm(E, world, c.ss, p.q).find(x => ours(x, p)); if (v) { hit = { v, p }; break; } }
      D.counts.confirmed = (D.counts.confirmed || 0) + (hit ? 1 : 0); D.counts.tries = (D.counts.tries || 0) + tries;
      if (!hit) continue;
      const q = hit.p.q, depth = Math.max(...c.poses.map(p => p.depth));
      const also = timed.length ? [...new Set(timed.flatMap(p => p.ts))].sort((a, b) => a - b) : [];
      const sObj = (() => { const m = /^(\S+) \(([^()]+)\)/.exec(String(hit.v.msg)); return m && m[2] === c.id ? m[1] : (/and (\S+) \(([^()]+)\) overlap/.exec(String(hit.v.msg)) || [])[1] || null; })();
      const f = { rule: c.rule, id: c.id, obj: sObj, sev: 'error', kind: 'route', mover: q.obj, where: q.where, msg: `${hit.v.msg.replace('route:' + q.where, 'on ' + q.where)}${c.rule === 'overlap' && depth > 0 ? ` (up to ${r2(depth)} m on its route)` : ''}`, owner: OWNERS[c.rule] || null };
      f.fix = ROUTE_FIX[c.rule] ? ROUTE_FIX[c.rule](f) : FIX[c.rule];
      const when = at != null ? `t ${at} s after the warm-up${onGrid(at) ? ' (a ' + hz + ' Hz gate frame)' : ''}; the route touches it at t ${runsOf(also).slice(0, 4).join(', ')}` : (q.kind === 'lane' ? 'whenever a vehicle passes' : 'a pose the body can take (no 0.1 s timetable frame hits it)');
      fact('route|' + c.rule + '|' + c.id + '|' + q.where, f, season, { date, moment: c.ss.moment, t: at, when: `${date}: ${when}` });
    }
    D.ms.confirm = now() - t;
    // 3. lanes that carry no traffic because a solid stands in them (advisory: no gate rule fails on an empty lane)
    for (const n of lp.none) {
      if (!n.blocked) continue;
      const b = n.blocks.map(x => `${x.id} (s ${r1(x.s0)}-${r1(x.s1)})`).join(', ');
      fact('lane|' + n.lane, { rule: 'laneBlocked', id: n.lane, sev: 'advice', kind: 'lane', msg: `lane ${n.lane} carries no traffic: ${n.blocks.length} solid(s) stand within 1.2 m of its line: ${b}`, fix: `move them 1.2 m clear of the lane line (a parking bay or the kerb side), or put the ${n.who || 'traffic'} population on another road`, owner: 'life (traffic spans) + the scene' }, season, { date, moment: null, t: null, when: `${date}: the whole loop` });
    }
    for (const k of Object.keys(D.ms)) { res.ms[k] = (res.ms[k] || 0) + D.ms[k]; D.ms[k] = r1(D.ms[k]); }
    res.dates.push(D);
    world.nav = null;
  }
  res.ms.total = now() - tAll;
  for (const k of Object.keys(res.ms)) res.ms[k] = r1(res.ms[k]);
  const sevRank = { error: 0, advice: 1 };
  res.facts = [...facts.values()].sort((a, b) => (sevRank[a.sev] - sevRank[b.sev]) || (b.seasons.length - a.seasons.length) || ((a.first && a.first.t != null ? a.first.t : Infinity) - (b.first && b.first.t != null ? b.first.t : Infinity)) || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : String(a.id) < String(b.id) ? -1 : 1));
  return res;
}
/** Consecutive gate times (0.2 s apart at most) as runs: ['167.5-167.6', '200.6']. */
function runsOf(ts) {
  const runs = [];
  for (const v of ts) { const L = runs[runs.length - 1]; if (L && v - L[1] <= 0.2 + 1e-6) L[1] = v; else runs.push([v, v]); }
  return runs.map(r => r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`);
}

export function preflightText(res, title = '') {
  const out = [`world preflight: ${title || res.id || ''}  (${res.ms.total} ms: build ${res.ms.build}, statics ${r1(res.ms.frame + res.ms.statics)}, sweeps ${r1(res.ms.poses + res.ms.sweep)}, confirm ${res.ms.confirm})`];
  const errors = res.facts.filter(f => f.sev === 'error'), advice = res.facts.filter(f => f.sev !== 'error');
  out.push(`  ${errors.length} predicted gate fault(s), ${advice.length} advisor${advice.length === 1 ? 'y' : 'ies'}  [${res.dates.map(D => `${D.season}: ${D.counts.lanes} lanes, ${D.counts.tracks} tracks`).join('; ')}]`);
  res.facts.forEach((f, i) => {
    out.push(`  ${String(i + 1).padStart(2)}. ${f.sev === 'error' ? 'FAIL' : 'note'} ${f.rule} ${f.id}: ${f.msg} (fix: ${f.fix})`);
    out.push(`        ${f.kind}; ${f.seasons.join(', ')}; first hit ${f.first ? f.first.when : '-'}${f.owner ? '  [' + f.owner + ']' : ''}`);
  });
  if (!res.facts.length) out.push('  nothing predicted (the full gate still decides: world invariants)');
  return out.join('\n');
}
