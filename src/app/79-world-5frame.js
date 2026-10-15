/* ============================================================
   WORLD ENGINE v3, package render: the WORLD COMPOSITOR (docs/dev/WORLD_ENGINE.md 2.1-2.3, 2.8, 11.3, 15.4, 16.1, 16.6;
   requirements R1, R2, F3, V5, section 19). Private names: _wfr.
   The v2 renderer draws the base layer of a world scene (sky, clouds, ground surfaces, base water; weather on top). This
   render pass ('world-frame', 78-scene-0pass.js registry; stages prebake, frameGroup, framePost) draws the WORLD on it:
     at bake   D's chunks (79-world-3order.js worldChunks over every static: entities, the backdrop bands, appearance's
               extruded lines, buildings and long hulls) each into its own bitmap clipped to its box, integer-snapped with a
               1 px bleed (no seams); sprites through the v2 rasteriser (env.sprite) or, with look's materials loaded, coloured
               per part by material (worldMaterialColour); the statics' ground shadows (look: worldShadowPlan /
               worldDrawShadows), the water with the mirror of the statics (look: worldWaterPlan / worldWaterComposite /
               worldWaterMirror, about each owner's contact row: H1) and the static night lights (look: worldLights);
     per frame the agents at the scene time (79-world-5host.js worldHostAt: the systems runner and the life sim), D's
               worldFrameOrder over chunks + agents + the statics that sway by cause (drawn live, capped), with the occluder
               redraws (R1; size never exempts an occluder, R2); agents with appearance's views and animation hooks
               (worldViewOf, worldAnimHooks), floaters cut at their waterline (worldWaterCut); their shadows; look's per-frame
               water mirror of the agents (their columns only), rings and wakes; their lights.
   Caches are keyed by what they depend on (F3, V5): sprites by object, view, part, season, material key (season state, light
   band, weather, snow, haze) and scale bucket; chunk bitmaps by their members, the frame geometry and those keys; the shadow
   layer by the sun bucket; the water by the sun bucket and the frame; the lights layer by the set of lit lights. A change of
   time inside a light band re-plans the shadows and the lights and reuses every sprite and chunk bitmap.
   Section 19: a stable tie by id (worldOrderNearer); view changes cross-fade (0.25 s) and keep appearance's hysteresis; scale
   buckets change with hysteresis; no chunk seams (integer chunk origins, 1 px bleed, each entity in exactly one chunk).
   PURE part (Node + browser): worldFramePlan, worldFrameScene, worldFrameAt (the frame record of 16.1, no drawing).
   BROWSER part: the pass (registered when the pass registry is loaded) and the rasteriser.
   Every other package is reached through typeof guards: a missing package removes its feature, never the scene.
   ============================================================ */

let _wfrPassDefined = false;
/** Is the compositor's pass registered? (79-world-5host.js: the live data then carries no statics.) */
function worldFramePassOn() { return _wfrPassDefined; }

const WORLD_FRAME_ZMIN = 0.3;              // nearer than this (metres): behind the lens, not drawn
const WORLD_FRAME_FADE_S = 0.25;           // a view change cross-fades over this (19)
const WORLD_FRAME_LIVE_CAP = 24;           // statics drawn live (they sway by cause, M3): the nearest this many
const WORLD_FRAME_LIVE_H = 36;             // ... at least this tall on screen (scene units)
const WORLD_FRAME_LIVE_AREA = 0.4;         // ... and covering at most this share of the frame (a giant framing crown stays baked)
const _WFR_PAD = 2;
const _WFR_LIVE_KINDS = new Set(['sway', 'flicker', 'spin', 'bob', 'paddle', 'turn']);

/* ---------- pure: draw records ---------- */
function _wfrHeight(e) {
  if (typeof _wh5HeightOf === 'function') return _wh5HeightOf(e);
  return Number.isFinite(e.height) && e.height > 0 ? e.height : Number.isFinite(e.h) && e.h > 0 ? e.h : 1.7;
}
/** The drawn view of a static or an agent: appearance's worldViewOf, else the agent's own (life), else from its facing. */
function _wfrView(e, cam, agent, prev) {
  if (typeof worldViewOf === 'function') {
    try {
      const v = worldViewOf(e, cam, prev ? { prev: prev.view, prevMirror: prev.mirror } : undefined);
      if (v && typeof v.view === 'string') return { view: v.view, mirror: !!v.mirror, obj: typeof v.obj === 'string' ? v.obj : null, variant: Number.isInteger(v.variant) ? v.variant : null, persp: !!v.persp, s: Number.isFinite(v.s) && v.s > 0 ? v.s : null };
    } catch (err) { /* below */ }
  }
  if (agent && typeof e.view === 'string') return { view: e.view, mirror: !!e.mirror, obj: null, variant: null, persp: false, s: null };
  if (typeof worldHostViewOf === 'function') { const v = worldHostViewOf(Number(e.facing) || 0, e.x, e.z); return { view: v.view, mirror: v.mirror, obj: null, variant: null, persp: false, s: null }; }
  return { view: 'side', mirror: false, obj: null, variant: null, persp: false, s: null };
}
function _wfrIsWater(e) { return String(e.attach || '') === 'water' || e.layer === 'swim'; }
function _wfrId(e, oid) { return e.id != null ? String(e.id) : oid + '@' + e.x + ',' + e.z; }
/** The record of an extruded primitive (a line piece, a building, a long hull in perspective). */
function _wfrPrimRec(prim, ent, vw) {
  const b = prim.box || [0, 0, 0, 0], foot = Array.isArray(prim.foot) && prim.foot.length ? prim.foot : ent ? [[ent.x, ent.z]] : [[0, Math.max(1, prim.zKey || 1)]];
  let cx = 0, cz = 0;
  for (const p of foot) { cx += p[0]; cz += p[1]; }
  cx /= foot.length; cz /= foot.length;
  const e = ent || { id: prim.id, obj: prim.obj || 'line.' + (prim.sub || prim.lineKind || prim.kind), cls: prim.kind === 'line' ? prim.sub || 'line' : prim.kind, x: cx, z: cz, y: 0, static: true, solidity: prim.solidity || null, foot, height: prim.height || null };
  const id = ent ? _wfrId(ent, prim.obj || 'hull') : String(prim.id != null ? prim.id : 'prim@' + cx.toFixed(2) + ',' + cz.toFixed(2));
  return { id, ent: e, prim, obj: e.obj, o: prim.obj || e.obj, v: Number.isInteger(prim.variant) ? prim.variant : 0, X: (b[0] + b[2]) / 2, Y: b[3], s: 1, flip: false,
    box: { x0: b[0], y0: b[1], x1: b[2], y1: b[3] }, x: Number.isFinite(e.x) ? e.x : cx, y: Number.isFinite(e.y) ? e.y : 0, z: Number.isFinite(e.z) ? e.z : cz, foot, height: prim.height || _wfrHeight(e),
    attach: e.attach || null, static: e.static !== false, cut: null, view: vw ? vw.view : 'side', mirror: vw ? !!vw.mirror : false, backdrop: !!e.backdrop };
}
/**
 * The draw record of a world entity or agent at a camera (scene units, 1600 x 900): { id, ent, obj, o (the view's object), v,
 * X, Y, s, flip, box: { x0, y0, x1, y1 }, x, y, z, foot, height, attach, static, cut (where a floater is cut: look's
 * worldWaterCut, scene units, or null), view, mirror, prim? (a long hull drawn in perspective) }; null when it is behind the
 * lens or has no drawing. o: { season, agent, prev (the last view: hysteresis), regions (look's water regions) }.
 */
function _wfrRec(e, cam, o) {
  o = o || {};
  if (!e || !e.obj || !cam || typeof sceneProject !== 'function' || typeof sceneObj !== 'function') return null;
  if (!(e.z > WORLD_FRAME_ZMIN) || !Number.isFinite(e.x)) return null;
  const vw = _wfrView(e, cam, o.agent, o.prev);
  // a long hull seen at an angle or end-on: drawn in true perspective, never a flat side slab (Q4)
  if (vw.persp && !e.landmark && typeof worldExtrudeHull === 'function') {
    try { const prim = worldExtrudeHull(e, cam, { season: o.season }); if (prim && prim.box) { const r = _wfrPrimRec(prim, e, vw); r.cut = prim.noCut ? null : _wfrCutOf(e, cam, o.regions); return r; } } catch (err) { /* a sprite below */ }
  }
  const oid = vw.obj && sceneObj(vw.obj) ? vw.obj : (typeof _wh5ViewObj === 'function' ? _wh5ViewObj(e.obj, vw.view) : e.obj), def = sceneObj(oid);
  if (!def || !def.size) return null;
  const v = vw.variant != null ? vw.variant : Number.isInteger(e.variant) ? e.variant : 0;
  const P = sceneProject(cam, e.x, e.z, Number.isFinite(e.y) ? e.y : null), s = vw.s || (cam.f / e.z) * _wfrHeight(e) / def.size[1];
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(oid, v, o.season || 'summer') : null, b = (sh && sh.box) || [-def.size[0] / 2, -def.size[1], def.size[0] / 2, 0];
  const flip = !!vw.mirror && def.flippable !== false;
  const box = flip ? { x0: P.X - b[2] * s, y0: P.Y + b[1] * s, x1: P.X - b[0] * s, y1: P.Y + b[3] * s } : { x0: P.X + b[0] * s, y0: P.Y + b[1] * s, x1: P.X + b[2] * s, y1: P.Y + b[3] * s };
  const foot = Array.isArray(e.foot) && e.foot.length ? e.foot : [[e.x, e.z]];
  return { id: _wfrId(e, oid), ent: e, obj: e.obj, o: oid, v, X: P.X, Y: P.Y, s, flip, box, x: e.x, y: Number.isFinite(e.y) ? e.y : 0, z: e.z, foot,
    height: _wfrHeight(e), attach: e.attach || null, static: e.static !== false, cut: _wfrCutOf(e, cam, o.regions), view: vw.view, mirror: !!vw.mirror, backdrop: !!e.backdrop };
}
/**
 * Where a floater's art is cut (H3): look's worldWaterCut on the region it floats in, else its waterline row when it sinks
 * (its y below its waterline). One that does not sink is never cut (SCENE_LESSONS C: boats without a hull part do not sink).
 */
function _wfrCutOf(e, cam, regions) {
  if (!_wfrIsWater(e) && !(Number.isFinite(e.waterline) && Number.isFinite(e.y) && e.y < e.waterline - 0.005)) return null;
  if (typeof worldWaterCut === 'function' && Array.isArray(regions)) {
    for (const R of regions) {
      let c = null;
      try { c = worldWaterCut(e, cam, R); } catch (err) { c = null; }
      if (c) return c.sink > 0.005 ? c : null;
    }
  }
  const wly = Number.isFinite(e.waterline) ? e.waterline : Number.isFinite(cam.water) ? cam.water : null;
  if (wly == null || !Number.isFinite(e.y) || !(e.y < wly - 0.005)) return null;
  return { kind: 'row', row: sceneProject(cam, e.x, e.z, wly).Y, sink: wly - e.y };
}
/** The ground footprint of an agent: its point, or for a long one (a boat, a bus, a train) its hull box along its heading. */
function _wfrAgentFoot(a) {
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(a.obj) : null;
  const L = info && info.size ? info.size.w : 0, D = info && info.size ? info.size.d : 0;
  if (!(L > 1.6)) return [[a.x, a.z]];
  // a hull lies along its heading (a boat that slides sideways round an obstacle does not swing its hull with its velocity)
  const sp = Math.hypot(a.vx || 0, a.vz || 0), hd = Number.isFinite(a.heading) ? a.heading : sp > 0.02 ? Math.atan2(a.vx, a.vz) : Number.isFinite(a.facing) ? a.facing * Math.PI / 180 : 0;
  const c = Math.cos(hd), s = Math.sin(hd), out = [];
  for (const [u, w] of [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]]) out.push([a.x + u * s + w * c, a.z + u * c - w * s]);
  return out;
}
/** An agent as an entity record (the shape statics have: 1.2), from what the driver gives. */
function _wfrAgentEnt(a) {
  const sp = Math.hypot(a.vx || 0, a.vz || 0);
  const hull = a.len > 4 && Number.isFinite(a.heading);
  const facing = hull ? a.heading * 180 / Math.PI : sp > 0.02 ? Math.atan2(a.vx, a.vz) * 180 / Math.PI : Number.isFinite(a.facing) ? a.facing : Number.isFinite(a.heading) ? a.heading * 180 / Math.PI : 90;
  return Object.assign({}, a, { id: a.id != null ? String(a.id) : null, static: false, facing, foot: _wfrAgentFoot(a), height: Number.isFinite(a.h) ? a.h : a.height,
    attach: a.attach || (a.host ? 'deck:' + a.host : a.layer === 'swim' ? 'water' : a.layer === 'air' ? 'air' : 'ground') });
}

/** The rows of the nav grids a mover can stand on (sorted z, one per row with any standable cell in view): chunk rule (b). */
function _wfrStandZ(nav, cam) {
  if (!nav || !nav.layers) return null;
  const out = [], k = cam && cam.f ? 800 / cam.f * 1.3 : 1.5;
  for (const L of Object.keys(nav.layers)) {
    const g = nav.layers[L];
    if (!g || !g.data || !g.w) continue;
    for (let j = 0; j < g.h; j++) {
      const z = g.oz + (j + 0.5) * g.cell, xm = z * k;
      for (let i = 0; i < g.w; i++) {
        const x = g.ox + (i + 0.5) * g.cell;
        if (x < -xm || x > xm) continue;
        const q = j * g.w + i;
        if (g.data[q] && (!g.clear || g.clear[q] > 0)) { out.push(z); break; }
      }
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

const WORLD_FRAME_CHUNK_AREA = 1.5;       // chunk bitmaps hold at most this many frames of pixels (7)
/**
 * Keep the chunk bitmaps within WORLD_FRAME_CHUNK_AREA frames of pixels (7): while over, the two adjacent chunks whose boxes
 * overlap most (the largest saving: their areas less their union's) are merged. A mover between them is then slotted after
 * the merged chunk and the nearer statics it overlaps are redrawn over it, so the order stays true; only the cost moves.
 */
function _wfrMergeChunks(chunks, standZ) {
  const F = [0, 0, 1600, 900], budget = WORLD_FRAME_CHUNK_AREA * 1600 * 900;
  const area = (b) => (b ? Math.max(0, Math.min(F[2], b.x1) - Math.max(F[0], b.x0)) * Math.max(0, Math.min(F[3], b.y1) - Math.max(F[1], b.y0)) : 0);
  const uni = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
  const list = chunks.slice();
  let total = list.reduce((t, c) => t + area(c.bbox), 0);
  // runs of two or three neighbours in depth (a small chunk between two big ones must not block their merge)
  while (total > budget && list.length > 2) {
    let best = -1, len = 0, save = 0;
    for (let k = 0; k + 1 < list.length; k++) {
      let u = null, sum = 0;
      for (let m = 0; m < 3 && k + m < list.length; m++) {
        const C = list[k + m];
        if (C.backdrop || !C.ents.length) break;
        u = uni(u, C.bbox); sum += area(C.bbox);
        if (m === 0) continue;
        // a mover can stand between them: a merge costs occluder redraws there (7: < 40 a frame), so it must save more
        const rows = standZ ? _wfrRowsBetween(standZ, list[k + m].z1, list[k].z0) : 0;
        const sv = (sum - area(u)) / m / (1 + rows / 12);
        if (sv > save) { save = sv; best = k; len = m + 1; }
      }
    }
    if (best < 0 || save * (len - 1) < 0.01 * budget) break;
    const run = list.slice(best, best + len);
    let u = null;
    for (const C of run) u = uni(u, C.bbox);
    const before = run.reduce((t, C) => t + area(C.bbox), 0);
    list.splice(best, len, { z0: run[len - 1].z0, z1: run[0].z1, ents: [].concat(...run.map(C => C.ents)), bbox: u, stand: run.reduce((t, C) => t + (C.stand || 0), 0) });
    total -= before - area(u);
  }
  list.forEach((c, i) => { c.i = i; });
  return list;
}

/** The standable rows (sorted z) strictly between two depths. */
function _wfrRowsBetween(standZ, zNear, zFar) {
  let lo = 0, hi = standZ.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (standZ[m] <= zNear) lo = m + 1; else hi = m; }
  let n = 0;
  for (let j = lo; j < standZ.length && standZ[j] < zFar; j++) n++;
  return n;
}
/**
 * The static plan of a world at a camera (pure): every static entity, the backdrop bands and appearance's extruded lines and
 * buildings as draw records; the statics that sway by cause (M3; appearance's hooks) and stand tall enough are drawn live
 * (plan.live, capped); the rest go into D's chunks. o: { season, nav, backdrop (false: none), cam, regions }.
 * -> { cam, recs, live, chunks, byId }
 */
/**
 * Is a static there at this moment (S1, V3, K6)? The knowledge base's state for the entity (worldKbState(kb, ctx, id).present):
 * flowers out of their months, café tables in the rain, leaf litter in May are not drawn. Landmarks always are; without the
 * knowledge base or a time context everything is. kb's fill reads this function (typeof) to place seasonal accents.
 */
function worldStaticPresent(e, ctx) {
  if (!e || !ctx || typeof ctx !== 'object' || e.landmark || !e.obj || typeof worldKb !== 'function' || typeof worldKbState !== 'function') return true;
  try { const kb = worldKb(e.obj); if (!kb) return true; const st = worldKbState(kb, ctx, e.id != null ? e.id : null); return !(st && st.present === false); } catch (err) { return true; }
}
/** The absent statics of a world at a time context, as a sorted id list and its key (plans and bakes are kept per key). */
function _wfrAbsent(world, ctx) {
  const ids = [];
  if (ctx) for (const e of (world && world.entities) || []) if (e && e.static !== false && !worldStaticPresent(e, ctx)) ids.push(String(e.id));
  ids.sort();
  return { set: new Set(ids), key: ids.length ? _wfrHashStr(ids.join(',')) : '-' };
}
function worldFramePlan(world, o) {
  o = o || {};
  const cam = o.cam || (world && world.cam);
  const out = { cam, recs: [], live: [], chunks: [], byId: new Map() };
  if (!world || !cam) return out;
  const absent = o.absent instanceof Set ? o.absent : o.ctx ? _wfrAbsent(world, o.ctx).set : null;
  const ents = (world.entities || []).filter(e => e && e.static !== false && e.obj && !(absent && absent.has(String(e.id))));
  if (o.backdrop !== false && typeof worldBackdrop === 'function') {
    try { for (const b of worldBackdrop(world, cam, o.season || 'summer') || []) if (b && b.obj && Number.isFinite(b.x) && b.z > 0) ents.push(Object.assign({ static: true, backdrop: true }, b)); } catch (e) { /* no bands */ }
  }
  const add = (r) => {
    if (!r) return;
    // off the frame (with room for 21:9 and phone crops): not drawn, not ordered
    if (r.box.x1 < -1800 || r.box.x0 > 3400 || r.box.y1 < -900 || r.box.y0 > 1800) return;
    if (out.byId.has(r.id)) r.id = r.id + '#' + out.recs.length;
    out.recs.push(r); out.byId.set(r.id, r);
  };
  for (const e of ents) add(_wfrRec(e, cam, { season: o.season, regions: o.regions }));
  // lines and buildings (Q2, Q3): footprints in metres, extruded by appearance; ordered and occluding like any static
  if (typeof worldExtrude === 'function') {
    try { for (const p of worldExtrude(world, cam, { season: o.season, hulls: false }) || []) if (p && p.box) add(_wfrPrimRec(p, null, null)); } catch (e) { /* no extrusion */ }
  }
  // statics that move by cause (the wind's sway, a flame's flicker, a moored bob): drawn live, nearest first
  if (typeof worldAnimHooks === 'function') {
    const cand = [];
    for (const r of out.recs) {
      if (r.prim || r.backdrop || r.box.y1 - r.box.y0 < WORLD_FRAME_LIVE_H) continue;
      const vis = Math.max(0, Math.min(1600, r.box.x1) - Math.max(0, r.box.x0)) * Math.max(0, Math.min(900, r.box.y1) - Math.max(0, r.box.y0));
      if (vis > WORLD_FRAME_LIVE_AREA * 1600 * 900) continue;
      let h = null;
      try { h = worldAnimHooks(r.ent, 0, { obj: r.o, variant: r.v, season: o.season, world }); } catch (e) { h = null; }
      if (Array.isArray(h) && h.some(x => x && _WFR_LIVE_KINDS.has(x.kind))) cand.push(r);
    }
    cand.sort((a, b) => a.z - b.z || (a.id < b.id ? -1 : 1));
    for (const r of cand.slice(0, WORLD_FRAME_LIVE_CAP)) { r.live = true; out.live.push(r); }
  }
  const chunked = out.recs.filter(r => !r.live);
  if (typeof worldChunks === 'function') {
    const standZ = o.nav ? _wfrStandZ(o.nav, cam) : null;
    out.chunks = _wfrMergeChunks(worldChunks({ entities: chunked }, standZ ? { standZ } : null, null, {}), standZ);
  } else out.chunks = chunked.length ? [{ i: 0, z0: 0, z1: Infinity, ents: chunked.slice().sort((a, b) => b.z - a.z), bbox: null, stand: 0 }] : [];
  return out;
}

/* ---------- pure: the frame record (16.1) ---------- */
function _wfrMonth(ms) { return Number.isFinite(ms) ? new Date(ms).getUTCMonth() : 6; }
/** The time context (11.11): the systems package's worldTimeCtx when loaded, else a small one from the date and the light. */
function _wfrTimeCtx(world, ms, o) {
  o = o || {};
  if (typeof worldTimeCtx === 'function' && Number.isFinite(ms)) { try { const c = worldTimeCtx(world, ms); if (c) return c; } catch (e) { /* below */ } }
  const P = (world && world.place) || {}, L = o.L || null, m = _wfrMonth(ms);
  const d0 = Number.isFinite(ms) ? Date.UTC(new Date(ms).getUTCFullYear(), 0, 1) : null;
  return { ms: Number.isFinite(ms) ? ms : null, lat: P.lat, lon: P.lon, month: m, doy: d0 != null ? Math.floor((ms - d0) / 86400000) + 1 : null,
    hour: L && Number.isFinite(L.localHour) ? L.localHour : null, season: o.season || (typeof sceneSeason === 'function' && Number.isFinite(ms) ? sceneSeason(ms, P.lat) : 'summer'),
    weather: L ? (L.snow ? 'snow' : L.rain ? 'rain' : L.fog ? 'fog' : (L.cover || 0) > 0.7 ? 'cloud' : 'clear') : 'clear', cover: L ? L.cover || 0 : null,
    snowDay: !!(L && L.snow), sun: L && Number.isFinite(L.alt) ? { az: L.az, alt: L.alt } : null, dark: L ? L.dark || 0 : null };
}
/** The sky of a time context (look: worldSkyOf; with a v2 light L, the same grade as the base layer), or null. */
function _wfrSky(ctx, cam, L) {
  if (typeof worldSkyOf !== 'function' || !ctx) return null;
  try { return worldSkyOf(ctx, { L: L || undefined, heading: cam && cam.heading }); } catch (e) { return null; }
}
/**
 * A scene prepared for frame records: the spec (an item, data or spec), its world at the date's season, its life driver and
 * its plan. o: { date (ms; T2: previews and tests give a fixed moment), seed (overrides the spec's), season }.
 */
function worldFrameScene(x, o) {
  o = o || {};
  let spec = typeof worldHostSpec === 'function' ? worldHostSpec(x) : x;
  if (!spec) throw new Error('worldFrameScene: not a v3 scene');
  if (o.seed != null && Number(o.seed) !== Number(spec.seed)) spec = Object.assign({}, spec, { seed: Number(o.seed) | 0 });
  const P = spec.place || {}, date = Number.isFinite(o.date) ? o.date : null;
  const season = o.season || (date != null && typeof sceneSeason === 'function' ? sceneSeason(date, P.lat) : 'summer');
  const world = typeof worldHostWorld === 'function' ? worldHostWorld(spec, { season }) : (typeof worldBuild === 'function' ? worldBuild(spec, { season }) : null);
  if (!world) throw new Error('worldFrameScene: no world');
  const driver = typeof worldHostDriver === 'function' ? worldHostDriver(world, { ms: date != null ? date : undefined, deterministic: true }) : null;
  let regions = [];
  if (typeof worldWaterPlan === 'function' && world.cam) { try { regions = worldWaterPlan(world, world.cam) || []; } catch (e) { regions = []; } }
  const plan = worldFramePlan(world, { season, nav: driver && driver.nav, regions, ctx: date != null ? _wfrTimeCtx(world, date, { season }) : null });
  return { spec, world, cam: world.cam, season, date, driver, plan, regions, W: 1600, H: 900 };
}
function _wfrR3(v) { return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : v; }
// geometry at full precision: a checker reading the record reproduces the order's own comparisons (no rounding ties)
function _wfrBoxArr(b) { return b ? [b.x0, b.y0, b.x1, b.y1] : null; }
function _wfrPts(P) { return Array.isArray(P) ? P.map(q => [q[0], q[1]]) : null; }
/** Plain data only (the record is compared and stored: no functions, no shared objects). */
function _wfrPlain(o) { if (o == null) return null; try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
/** The frame-record handle of a built world (kept on it, not enumerable): its plan, water regions, season and date. */
function _wfrWorldScene(world, o) {
  const season = o.season || world.season || 'summer', tctx = o.ctx || (world.time && Number.isFinite(world.time.ms) ? world.time : null);
  const ab = _wfrAbsent(world, tctx), key = season + '|' + (world.nav ? 'n' : '-') + '|' + ab.key;
  let h = world.$wfr;
  if (h && h.key === key) return h;
  let regions = [];
  if (typeof worldWaterPlan === 'function') { try { regions = worldWaterPlan(world, world.cam) || []; } catch (e) { regions = []; } }
  const date = Number.isFinite(o.date) ? o.date : world.time && Number.isFinite(world.time.ms) ? world.time.ms : Number.isFinite(world.ms) ? world.ms : null;
  h = { key, world, cam: world.cam, season, date, driver: null, plan: worldFramePlan(world, { season, nav: world.nav, regions, absent: ab.set }), regions, W: 1600, H: 900 };
  try { Object.defineProperty(world, '$wfr', { value: h, enumerable: false, configurable: true, writable: true }); } catch (e) { /* frozen: built again next time */ }
  return h;
}
/** The agents a driven world has now: o.agents, its life (life package: worldLifeOf; the systems' world.sim), else world.agents. */
function _wfrWorldAgents(world, o) {
  if (Array.isArray(o.agents)) return o.agents;
  try {
    const L = (typeof worldLifeOf === 'function' ? worldLifeOf(world) : null) || world.sim || null;
    if (L && typeof worldAgents === 'function') return worldAgents(L) || [];
  } catch (e) { /* below */ }
  return Array.isArray(world.agents) ? world.agents : [];
}
/**
 * The frame record at scene time t (seconds), built without drawing (16.1): what the compositor would draw, for the
 * invariant checker. scene: a worldFrameScene, or an item / spec (prepared here with o). The same scene, date, seed and t
 * give the same record (R4). Box and order are render's; the fields other packages own are filled by their functions when
 * loaded (life: the agent fields; appearance: view, anim; systems: sway, wind; look: shadow, reflect, sun, lights), else null.
 */
function worldFrameAt(scene, t, o) {
  o = o || {};
  // a built world that its caller drives (the systems' render step, the tools' runs, the debug overlay): its plan is kept on
  // it, its agents are the ones it has now (o.agents, else its life: worldLifeOf / world.sim / world.agents)
  const ext = !!(scene && !scene.plan && scene.cam && Number.isFinite(scene.cam.f) && Array.isArray(scene.entities));
  if (ext) scene = _wfrWorldScene(scene, o);
  else if (!scene || !scene.world || !scene.plan) scene = worldFrameScene(scene, o);
  t = Math.max(0, Number(t) || 0);
  const world = scene.world, cam = scene.cam, plan = scene.plan;
  // the life at t: a fresh driver when t is earlier than where this one is (deterministic from the seed)
  if (!ext && scene.driver && t + 1e-9 < scene.driver.tau && typeof worldHostDriver === 'function') {
    if (scene.driver.stop) scene.driver.stop();
    scene.driver = worldHostDriver(world, { nav: scene.driver.nav, ms: scene.date != null ? scene.date : undefined, deterministic: true });
    scene._views = null;
  }
  let agents = [];
  if (ext) agents = _wfrWorldAgents(world, o);
  else if (scene.driver) { try { agents = scene.driver.at(t); } catch (e) { agents = []; } }
  const ctx = ext && world.time && Number.isFinite(world.time.ms) ? world.time : _wfrTimeCtx(world, scene.date, { season: scene.season });
  const sky = _wfrSky(ctx, cam);
  const mem = scene._views || (scene._views = new Map());
  const aRecs = [];
  for (const a of agents) {
    const ent = _wfrAgentEnt(a), r = _wfrRec(ent, cam, { season: scene.season, agent: true, prev: mem.get(String(a.id)), regions: scene.regions });
    if (!r) continue;
    r.agent = a; aRecs.push(r);
    mem.set(r.id, { view: r.view, mirror: r.mirror });
  }
  const movers = plan.live.concat(aRecs);
  const order = typeof worldFrameOrder === 'function' ? worldFrameOrder(plan.chunks, movers, null) : [];
  scene._order = order;   // the last frame's draw list (tools and the debug overlay read it)
  // draw positions: a static's own draw (its chunk), a mover's draw, and each occluder redraw with the mover it is clipped to
  // (a redraw paints only over the mover just drawn, so it orders the static after THAT mover only)
  const pos = new Map(), redrawn = new Map();
  let p = 0, lastAgent = null;
  for (const it of order) {
    if (it.kind === 'chunk') for (const e of it.ref.ents || []) pos.set(e.id, p++);
    else if (it.kind === 'redraw') { const k = it.ref.id; if (!redrawn.has(k)) redrawn.set(k, []); if (lastAgent != null) redrawn.get(k).push(lastAgent); p++; if (!pos.has(k)) pos.set(k, p - 1); }
    else { pos.set(it.ref.id, p++); lastAgent = it.ref.id; }
  }
  // look's fields (shadow, reflect) under the record's ids: an unnamed static is known by its object and place
  const asEnt = (r) => Object.assign({}, r.ent, { id: r.id });
  // (the statics' part is planned once per scene and date; the agents' every frame)
  let look = null;
  if (typeof worldLookOf === 'function') {
    try {
      if (!scene._look) scene._look = worldLookOf({ entities: plan.recs.filter(r => !r.backdrop && !(r.prim && r.ent.id == null)).map(asEnt), surfaces: world.surfaces, cam }, cam, { sky: sky || undefined, regions: scene.regions });
      const la = worldLookOf({ entities: [], surfaces: world.surfaces, cam }, cam, { sky: sky || undefined, agents: aRecs.map(asEnt), regions: scene.regions });
      look = new Map(scene._look);
      for (const [k, v] of la) look.set(k, v);
    } catch (e) { look = null; }
  }
  let wind = null;
  if (typeof worldWind === 'function') { try { const w = worldWind(world, 0, 0, t); wind = w ? { dir: _wfrR3(Number.isFinite(w.dir) ? w.dir : Math.atan2(w.dx || 0, w.dz || 0) * 180 / Math.PI), s: _wfrR3(w.s) } : null; } catch (e) { wind = null; } }
  const one = (r, agent) => {
    const e = r.ent, a = r.agent || {};
    let anim = null, sway = null;
    if (typeof worldAnimOf === 'function') { try { anim = _wfrPlain(worldAnimOf(agent ? Object.assign({}, a, e) : e, world)); } catch (err) { anim = null; } }
    if (!anim) anim = agent ? { state: Math.hypot(e.vx || 0, e.vz || 0) > 0.05 ? 'move' : 'idle', clip: a.clip || null, rate: null, phase: _wfrR3(a.phase || 0), period: null } : { state: 'none' };
    if (typeof worldSway === 'function') {
      try { const s = worldSway(e, world, t); sway = s ? { dir: _wfrR3(s.dir), amp: _wfrR3(s.amp) } : null; } catch (err) { sway = null; }
    }
    const L = look ? look.get(r.id) : null, sh = L && L.shadow;
    const shadow = sh ? { poly: _wfrPts(sh.poly), dir: sh.dir ? [_wfrR3(sh.dir[0]), _wfrR3(sh.dir[1])] : null, kind: sh.kind || null,
      holes: Array.isArray(sh.holes) ? sh.holes.map(_wfrPts).filter(Boolean) : [] } : null;
    let reflect = L && L.reflect ? { surface: L.reflect.surface || null, rowY: _wfrR3(L.reflect.rowY) } : null;
    if (!reflect && !look && r.cut && r.cut.kind === 'row') reflect = { surface: null, rowY: _wfrR3(r.cut.row) };
    const sp = Math.hypot(e.vx || 0, e.vz || 0);
    return { id: r.id, cls: e.cls || null, obj: e.obj, static: !agent, auto: e.auto || null, landmark: !!e.landmark, framing: !!(e.framing || e.framed), x: r.x, y: r.y, z: r.z,
      facing: _wfrR3(Number(e.facing) || 0), foot: _wfrPts(r.foot), height: _wfrR3(r.height), layer: e.layer || null, host: e.host || null, parent: e.parent || null,
      view: r.view, mirror: !!r.mirror, box: _wfrBoxArr(r.box), order: pos.has(r.id) ? pos.get(r.id) : null, speed: agent ? _wfrR3(sp) : 0, vx: agent ? _wfrR3(e.vx || 0) : 0, vz: agent ? _wfrR3(e.vz || 0) : 0,
      state: agent ? a.state || null : null, born: agent && Number.isFinite(a.born) ? a.born : null, anim, sway, shadow, reflect, waterline: Number.isFinite(e.waterline) ? _wfrR3(e.waterline) : null,
      prim: r.prim ? r.prim.kind || null : null, redrawFor: !agent && redrawn.has(r.id) ? redrawn.get(r.id).slice() : null, alpha: agent && Number.isFinite(a.alpha) ? _wfrR3(a.alpha) : null, pose: agent ? a.pose || null : null, age: agent ? a.age || null : null, solidity: e.solidity || null, decal: !!e.decal };
  };
  const ents = plan.recs.map(r => one(r, false)).concat(aRecs.map(r => one(r, true)));
  let lights = [];
  if (typeof worldLights === 'function') {
    try {
      const pl = (L) => ({ ref: L.ref, kind: L.kind, x: _wfrR3(L.x), y: _wfrR3(L.y), z: _wfrR3(L.z), on: !!L.on });
      if (!scene._lights) scene._lights = (worldLights({ entities: plan.recs.filter(r => !r.prim).map(asEnt) }, { sky: sky || undefined, season: scene.season }) || []).map(pl);
      lights = scene._lights.concat((worldLights({ entities: [] }, { sky: sky || undefined, season: scene.season, agents: aRecs.map(asEnt) }) || []).map(pl));
    } catch (e) { lights = []; }
  }
  const sun = sky && sky.sun ? { az: _wfrR3(sky.sun.az), alt: _wfrR3(sky.sun.alt), g: null } : ctx.sun ? { az: _wfrR3(ctx.sun.az), alt: _wfrR3(ctx.sun.alt), g: null } : null;
  if (sun && typeof worldSunOf === 'function') { try { const S = worldSunOf(sky || { az: sun.az, alt: sun.alt }, cam); sun.g = S && S.g ? [_wfrR3(S.g[0]), _wfrR3(S.g[1])] : null; } catch (e) { /* none */ } }
  return { t, ctx: _wfrPlain(ctx) || {}, cam: { f: cam.f, x0: cam.x0, horizon: cam.horizon, eye: cam.eye, heading: cam.heading, fov: cam.fov }, W: scene.W, H: scene.H, ents, wind,
    sun, lights, log: Array.isArray(world.log) ? world.log.slice() : [] };
}

/* ---------- browser: the rasteriser ---------- */
function _wfrBand(L, sky) {
  if (sky && typeof sky.band === 'string') return sky.band;
  if (!L) return 'day';
  if ((L.dark || 0) > 0.6) return 'night';
  const alt = Number(L.alt) || 0, am = (Number(L.az) || 180) < 180;
  return alt < 2 ? (am ? 'dawn' : 'dusk') : alt < 12 ? 'golden' : 'day';
}
function _wfrCanvas(w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
const _WFR_CPU = { willReadFrequently: true };
const _wfrPaths = new Map();
function _wfrPath(d) {
  let p = _wfrPaths.get(d);
  if (!p) { if (_wfrPaths.size > 30000) _wfrPaths.clear(); p = new Path2D(d); _wfrPaths.set(d, p); }
  return p;
}
const _wfrMul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const _wfrParts = (h) => (h.parts ? h.parts : [h.part || '*']);
const _wfrBucket = (s) => (typeof sceneScaleBucket === 'function' ? sceneScaleBucket(s) : 2 ** (Math.round(Math.log2(Math.max(1e-3, s)) * 4) / 4));
/** Still parts of a resolved object (every part but 'lit' and frames-only parts). */
function _wfrStill(sh) { return sh.still || sh.order.filter(p => p !== 'lit'); }
function _wfrHasImg(sh) { for (const p of _wfrStill(sh)) for (const s of sh.parts[p] || []) if (s.img) return true; return false; }
function _wfrPaint(cx, p, col) {
  if (typeof p === 'string') return col(p);
  const stops = p.lin || p.rad;
  if (!stops) return '#000';
  const g = p.lin ? cx.createLinearGradient(p.x1 || 0, p.y1 || 0, p.x2 || 0, p.y2 != null ? p.y2 : 1) : cx.createRadialGradient(p.cx || 0, p.cy || 0, 0, p.cx || 0, p.cy || 0, p.r || 1);
  for (const [off, c, op] of stops) {
    const cc = col(c);
    if (op == null || op === 1) g.addColorStop(Math.max(0, Math.min(1, off)), cc);
    else { const n = parseInt(String(cc).slice(1), 16) || 0; g.addColorStop(Math.max(0, Math.min(1, off)), `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${op})`); }
  }
  return g;
}
/**
 * A sprite coloured by MATERIALS (V2): each shape of each part gets look's material (worldMaterialOf) and colour
 * (worldMaterialColour) for this entity's material context (season and leaf state, light, weather, snow, haze); leaves on a
 * bare tree are dropped (worldMaterialVisible). Kept in the shared sprite cache (sceneSprites) under a key of what it depends
 * on. Raster objects and a missing look package take the v2 path (env.sprite, graded by the v2 light).
 */
function _wfrSprite(env, S, oid, v, part, sc, mc, x) {
  x = x || {};
  const v2 = () => { try { return env.sprite({ o: oid, v, part, season: S.season, haze: x.haze || 0, tint: null, scale: sc, flip: false, cls: x.cls || null, litGlow: !!x.litGlow }); } catch (e) { return null; } };
  if (!S.mat || !mc || typeof sceneObjShapes !== 'function' || typeof Path2D !== 'function' || typeof sceneSprites === 'undefined') return v2();
  const sh = sceneObjShapes(oid, v, S.season);
  if (!sh) return null;
  if (_wfrHasImg(sh)) return v2();
  let mk = '';
  try { mk = worldMaterialKey(mc); } catch (e) { return v2(); }
  const key = 'w3|' + oid + '|' + v + '|' + part + '|' + S.season + '|' + mk + '|' + S.band + '|' + Math.round(sc * 64) / 64 + (x.litGlow ? '|g' : '');
  return sceneSprites.get(key, () => {
    const names = part === '*' ? _wfrStill(sh) : part.startsWith('rest:') ? _wfrStill(sh).filter(p => !part.slice(5).split(',').includes(p)) : [part];
    const detail = typeof sceneDetailAt !== 'function' || sceneDetailAt(oid, sh, sc);
    let b = null;
    for (const p of names) for (const s of sh.parts[p] || []) {
      if (!detail && s.detail) continue;
      const q = typeof scenePathBox === 'function' ? scenePathBox(s.d, s.m) : null;
      if (!q) continue;
      const w = s.s ? (s.w || 1) / 2 + 1 : 1;
      b = b ? [Math.min(b[0], q[0] - w), Math.min(b[1], q[1] - w), Math.max(b[2], q[2] + w), Math.max(b[3], q[3] + w)] : [q[0] - w, q[1] - w, q[2] + w, q[3] + w];
    }
    if (b) b = [Math.max(b[0], sh.box[0] - 4), Math.max(b[1], sh.box[1] - 4), Math.min(b[2], sh.box[2] + 4), Math.min(b[3], sh.box[3] + 4)];
    if (!b || b[2] <= b[0] || b[3] <= b[1]) return { c: null, x0: 0, y0: 0, w: 0, h: 0, sc, bytes: 0 };
    let k = sc;
    if ((b[2] - b[0]) * k > 2048 || (b[3] - b[1]) * k > 2048) k = Math.min(2048 / (b[2] - b[0]), 2048 / (b[3] - b[1]));
    const W = Math.ceil((b[2] - b[0]) * k + 2 * _WFR_PAD), H = Math.ceil((b[3] - b[1]) * k + 2 * _WFR_PAD);
    const c = _wfrCanvas(W, H), cx = c.getContext('2d', _WFR_CPU);
    cx.setTransform(k, 0, 0, k, _WFR_PAD - b[0] * k, _WFR_PAD - b[1] * k);
    const def = x.litGlow ? sceneObj(oid) : null, nc = (def && def.night && def.night.glow) || {};
    let any = false;
    for (const p of names) for (const s of sh.parts[p] || []) {
      if (!detail && s.detail) continue;
      const fillHex = typeof s.f === 'string' ? s.f : null;
      let mat = 'paint';
      try { mat = worldMaterialOf(oid, p, fillHex, s); } catch (e) { mat = 'paint'; }
      if (typeof worldMaterialVisible === 'function' && !worldMaterialVisible(mat, mc)) continue;
      const col = (hex) => { try { return worldMaterialColour(mat, hex, mc); } catch (e) { return hex; } };
      if (s.m) { cx.save(); cx.transform(s.m[0], s.m[1], s.m[2], s.m[3], s.m[4], s.m[5]); }
      const path = _wfrPath(s.d);
      if (x.litGlow && s.glow) { cx.globalAlpha = 1; cx.fillStyle = nc[s.glow] || (s.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'); cx.fill(path); }
      else {
        cx.globalAlpha = s.op == null ? 1 : s.op;
        if (s.f) { cx.fillStyle = _wfrPaint(cx, s.f, col); cx.fill(path); }
        if (s.s) { cx.strokeStyle = _wfrPaint(cx, s.s, col); cx.lineWidth = s.w || 1; cx.lineCap = s.cap || 'butt'; cx.stroke(path); }
      }
      if (s.m) cx.restore();
      any = true;
    }
    if (!any) { c.width = 0; return { c: null, x0: b[0], y0: b[1], w: 0, h: 0, sc: k, bytes: 0 }; }
    try { cx.getImageData(0, 0, 1, 1); } catch (e) { /* drawn on first use */ }
    return { c, x0: b[0] - _WFR_PAD / k, y0: b[1] - _WFR_PAD / k, w: W / k, h: H / k, sc: k, bytes: W * H * 4 };
  });
}
/** The material context of one entity (look), or null when materials are not loaded. */
function _wfrMc(S, e) {
  if (!S.mat || !S.mctx) return null;
  try { return worldMaterialFor(S.mctx, e, S.tctx); } catch (err) { return S.mctx; }
}
/** The v2 haze of an entity from its own depth (never per chunk). */
function _wfrHaze(env, e) {
  if (typeof sceneHazeAt !== 'function') return 0;
  try { return Math.round(sceneHazeAt(Math.hypot(e.x || 0, e.z || 0), env.C.atmos, env.L) * 10) / 10; } catch (err) { return 0; }
}
/** The sprite of a draw record (part '*' or one part), at its scale bucket. */
function _wfrSpriteOf(env, S, r, part, x) {
  const sc = _wfrBucket(x && x.bucket ? x.bucket : r.s) * env.vs, mc = _wfrMc(S, r.ent);
  return _wfrSprite(env, S, r.o, r.v, part || '*', sc, mc, Object.assign({ haze: mc ? 0 : _wfrHaze(env, r.ent), cls: r.ent.cls || null }, x || {}));
}
function _wfrM(env, r) { return [env.vs * r.s * (r.flip ? -1 : 1), 0, 0, env.vs * r.s, env.vs * r.X + env.ox, env.vs * r.Y + env.oy]; }
/** Clip a context to what lies above a floater's cut (device px: scene units through vs, ox, oy, then less the bitmap's origin). */
function _wfrClipCut(cx, cut, env, bx, by) {
  const vs = env.vs, ox = env.ox - (bx || 0), oy = env.oy - (by || 0);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.beginPath();
  if (cut.kind === 'line' && Array.isArray(cut.pts) && cut.pts.length >= 2) {
    // the near edge of the outline at the level, column by column (its lowest row), held flat past its ends
    const xs = [...new Set(cut.pts.map(p => p[0]))].sort((a, b) => a - b);
    const low = (X) => { let y = -Infinity; const P = cut.pts; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[j], b = P[i]; if (Math.min(a[0], b[0]) > X || Math.max(a[0], b[0]) < X) continue; const yy = a[0] === b[0] ? Math.max(a[1], b[1]) : a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]); if (yy > y) y = yy; } return y; };
    const ch = xs.map(X => [X * vs + ox, low(X) * vs + oy]).filter(p => Number.isFinite(p[1]));
    if (ch.length >= 2) {
      cx.moveTo(-1e5, -1e5); cx.lineTo(1e5, -1e5); cx.lineTo(1e5, ch[ch.length - 1][1]);
      for (let i = ch.length - 1; i >= 0; i--) cx.lineTo(ch[i][0], ch[i][1]);
      cx.lineTo(-1e5, ch[0][1]); cx.closePath(); cx.clip();
      return;
    }
  }
  const row = cut.row != null ? cut.row : cut.footRow;
  cx.rect(-1e5, -1e5, 2e5, 1e5 + row * vs + oy); cx.clip();
}
/**
 * Draw one record on a context whose device origin is (bx, by): a prim through appearance's worldExtrudeDraw, a sprite with its
 * device transform; a floater cut at its waterline. d: the record's bake state { sp, M } (statics) or null (made now).
 */
function _wfrDrawRec(cx, env, S, r, d, bx, by, alpha) {
  bx = bx || 0; by = by || 0;
  if (r.cut) { cx.save(); _wfrClipCut(cx, r.cut, env, bx, by); }
  let n = 0;
  try {
    if (r.prim) {
      if (typeof worldExtrudeDraw === 'function') {
        const L = env.Lnow || env.L;
        n = worldExtrudeDraw(cx, r.prim, { vs: env.vs, ox: env.ox - bx, oy: env.oy - by, sprite: env.sprite, mctx: S.mctx || undefined, night: !!(L && (L.dark > 0.5 || L.windows)),
          windowShare: S.sky && Number.isFinite(S.sky.windowShare) ? S.sky.windowShare : L && L.windowShare, season: S.season, haze: _wfrHaze(env, r.ent), alpha: alpha == null ? 1 : alpha }) || 0;
      }
    } else {
      const sp = d && d.sp ? d.sp : _wfrSpriteOf(env, S, r, '*'), M = d && d.M ? d.M : _wfrM(env, r);
      if (sp && sp.c) {
        cx.globalAlpha = alpha == null ? 1 : alpha;
        cx.setTransform(M[0], M[1], M[2], M[3], M[4] - bx, M[5] - by);
        cx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
        n = 1;
      }
    }
  } catch (e) { n = 0; }
  if (r.cut) cx.restore();
  cx.globalAlpha = 1;
  return n;
}
const _wfrNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const _wfrHashStr = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

/* ---------- the wet area: where the water shows (1.4: later surfaces and decks lie over it) ---------- */
/** A surface's outline in metres (a path with its width as a polygon). */
function _wfrSurfPoly(s) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return s.poly;
  if (!Array.isArray(s.path) || s.path.length < 2) return null;
  const L = [], R = [], w = (Number(s.width) || 2) / 2;
  for (let i = 0; i < s.path.length; i++) {
    const a = s.path[Math.max(0, i - 1)], b = s.path[Math.min(s.path.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
    L.push([s.path[i][0] - dz / n * w, s.path[i][1] + dx / n * w]); R.push([s.path[i][0] + dz / n * w, s.path[i][1] - dx / n * w]);
  }
  return L.concat(R.reverse());
}
/** A ground polygon (metres) on the screen (scene units), clipped at the near plane. y: a height, or null (the ground). */
function _wfrScrPoly(cam, P, y) {
  const near = Math.max(WORLD_FRAME_ZMIN, (cam.dMin || 1) * 0.25), out = [];
  const pr = (p) => { const q = sceneProject(cam, p[0], p[1], y); out.push([q.X, q.Y]); };
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = a[1] >= near, ib = b[1] >= near;
    if (ia) pr(a);
    if (ia !== ib) { const t = (near - a[1]) / (b[1] - a[1]); pr([a[0] + (b[0] - a[0]) * t, near]); }
  }
  return out.length >= 3 ? out : null;
}
/**
 * The wet plan of a world: the water's screen outlines (look's regions, else the water surfaces) and the outlines of what lies
 * over the water (the surfaces after a water surface in the spec: a boardwalk, a deck, a towpath edge; later surfaces win).
 */
function _wfrWet(world, cam, regions) {
  const out = { water: [], over: [], decks: [] };
  if (!world || !cam || typeof sceneProject !== 'function') return out;
  const surfs = world.surfaces || [];
  if (Array.isArray(regions) && regions.length) { for (const R of regions) if (Array.isArray(R.clip) && R.clip.length >= 3) out.water.push(R.clip); }
  else for (const s of surfs) if (s && s.kind === 'water') { const P = _wfrSurfPoly(s), q = P && _wfrScrPoly(cam, P, Number.isFinite(s.level) ? s.level : Number.isFinite(cam.water) ? cam.water : null); if (q) out.water.push(q); }
  const first = surfs.findIndex(s => s && s.kind === 'water');
  if (first >= 0) for (let i = first + 1; i < surfs.length; i++) {
    const s = surfs[i];
    if (!s || s.kind === 'water') continue;
    const P = _wfrSurfPoly(s), q = P && _wfrScrPoly(cam, P, Number.isFinite(s.y) ? s.y : null);
    if (q) { out.over.push(q); if (_WFR_DECK_KINDS.has(s.kind)) out.decks.push({ s, scr: q }); }
  }
  return out;
}
// walkable surfaces that lie over the water: the compositor draws their planks over its water (the v2 ground under the base
// water would otherwise show the water's own colour through them: a pale, untextured slab, QP4)
const _WFR_DECK_KINDS = new Set(['boardwalk', 'deck', 'bridge-deck', 'jetty', 'pontoon', 'platform']);
const _WFR_DECK_COL = { boardwalk: '#7d7264', deck: '#7a6e60', 'bridge-deck': '#8c8478', jetty: '#766a5c', pontoon: '#6f6a62', platform: '#8a8478' };
/** The decks over the water (scene units), each a timber fill coloured by the light and the weather, with its planks across. */
function _wfrDrawDecks(ctx, env, S) {
  const cam = S.rec.world.cam, vs = env.vs, ox = env.ox, oy = env.oy;
  let n = 0;
  ctx.save(); ctx.setTransform(vs, 0, 0, vs, ox, oy);
  for (const D of (S.wet && S.wet.decks) || []) {
    const s = D.s, hex = _WFR_DECK_COL[s.kind] || '#86694a', mat = s.kind === 'pontoon' || s.kind === 'platform' || s.kind === 'bridge-deck' ? 'stone' : 'timber';
    let col = hex;
    if (S.mat && S.mctx) { try { col = worldMaterialColour(mat, hex, S.mctx) || hex; } catch (e) { col = hex; } }
    else if (env.L && env.L.dark > 0.5) col = '#2e2a26';
    ctx.beginPath(); ctx.moveTo(D.scr[0][0], D.scr[0][1]); for (let i = 1; i < D.scr.length; i++) ctx.lineTo(D.scr[i][0], D.scr[i][1]); ctx.closePath();
    ctx.fillStyle = col; ctx.globalAlpha = 1; ctx.fill();
    // the planks: across a path every 0.3 m (they foreshorten by themselves), clipped to the deck
    if (Array.isArray(s.path) && s.path.length >= 2 && typeof sceneProject === 'function') {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.6;
      const w = (Number(s.width) || 2) / 2, y = Number.isFinite(s.y) ? s.y : null;
      ctx.beginPath();
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1], b = s.path[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w, nz = dx / L * w;
        for (let t = 0; t < L; t += 0.3) {
          const cx = a[0] + dx * t / L, cz = a[1] + dz * t / L;
          if (Math.min(cz - nz, cz + nz) < 0.5) continue;
          const p = sceneProject(cam, cx - nx, cz - nz, y), q = sceneProject(cam, cx + nx, cz + nz, y);
          if (Math.abs(p.Y - q.Y) + Math.abs(p.X - q.X) < 0.4) continue;
          ctx.moveTo(p.X, p.Y); ctx.lineTo(q.X, q.Y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
    n++;
  }
  ctx.restore();
  return n;
}
/** Clip a context (in scene units) to everything but these screen polygons (even-odd with a frame-sized rectangle). */
function _wfrHoleClip(cx, polys) {
  cx.beginPath(); cx.rect(-1e4, -1e4, 2e4, 2e4);
  for (const P of polys) { cx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) cx.lineTo(P[i][0], P[i][1]); cx.closePath(); }
  cx.clip('evenodd');
}
/** Clip a context (in scene units) to the wet area: inside the water outlines and, with notOver, outside what lies over them. */
function _wfrWetClip(cx, wet, notOver) {
  cx.beginPath();
  for (const P of wet.water) { cx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) cx.lineTo(P[i][0], P[i][1]); cx.closePath(); }
  cx.clip('nonzero');
  if (notOver && wet.over.length) _wfrHoleClip(cx, wet.over);
}

/* ---------- browser: the bake (a generator run in slices) ---------- */
/**
 * The bake of one renderer bake (env): prebake runs it for a few ms, the warm-up's unseen frames run 8 ms slices, a visible
 * frame finishes what is left at once. Fills S: the context (time, sky, materials), the plan, the chunk bitmaps and every
 * static's sprite and device transform (S.draw: the redraws reuse them), the shadow layer, the water, the lights.
 */
function* _wfrBakeJob(env, S) {
  const rec = S.rec, world = rec.world, cam = world.cam, L = env.L, vs = env.vs, ox = env.ox, oy = env.oy, W = env.W, H = env.H;
  const cache = rec.frame.cache || (rec.frame.cache = new Map()), used = new Set();
  S.used = used;
  // 1. the context: time (T2: the light's moment), the sky with the v2 light's grade, the materials, the water regions
  const ms = L && Number.isFinite(L.ms) ? L.ms : null;
  S.tctx = _wfrTimeCtx(world, ms, { L, season: S.season });
  S.sky = _wfrSky(S.tctx, cam, L);
  S.band = _wfrBand(L, S.sky);
  if (rec.driver && typeof rec.driver.setTime === 'function' && ms != null) rec.driver.setTime(ms);
  S.mat = typeof worldMaterialColour === 'function' && typeof worldMaterialOf === 'function' && typeof worldMaterialKey === 'function' && typeof worldMaterialFor === 'function' && typeof worldMaterialCtx === 'function';
  if (S.mat) { try { S.mctx = worldMaterialCtx(S.tctx, { sky: S.sky || undefined, L, atmos: env.C.atmos }); } catch (e) { S.mat = false; } }
  if (typeof worldWaterPlan === 'function') { try { S.regions = worldWaterPlan(world, cam) || []; } catch (e) { S.regions = []; S.stats.errors.push('waterPlan: ' + (e && e.message)); } }
  S.wet = _wfrWet(world, cam, S.regions);
  yield;
  // 2. the plan: draw records and D's chunks (kept per world, season and nav: the camera does not move)
  const ab = _wfrAbsent(world, S.tctx && Number.isFinite(S.tctx.ms) ? S.tctx : null);
  const pk = 'plan|' + S.season + '|' + (rec.driver && rec.driver.nav ? 'n' : '-') + '|' + ab.key;
  let plan = rec.frame.plan && rec.frame.planKey === pk ? rec.frame.plan : null;
  if (!plan) { plan = worldFramePlan(world, { season: S.season, nav: rec.driver && rec.driver.nav, regions: S.regions, absent: ab.set }); rec.frame.plan = plan; rec.frame.planKey = pk; }
  S.plan = plan;
  yield;
  // 3. the chunks: each its own bitmap, clipped to its box, integer-snapped, 1 px bleed
  const geo = W + 'x' + H + '|' + Math.round(vs * 1e4) + '|' + Math.round(ox) + ',' + Math.round(oy);
  const lk = S.mat ? '' : 'v2' + ((env.out && env.out.lk) || '');
  for (const ch of plan.chunks) {
    const out = { ch, c: null, x: 0, y: 0, w: 0, h: 0 };
    S.chunks.push(out);
    if (!ch.ents.length) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, mk = '';
    for (const r of ch.ents) {
      const b = r.box;
      x0 = Math.min(x0, b.x0 * vs + ox); y0 = Math.min(y0, b.y0 * vs + oy); x1 = Math.max(x1, b.x1 * vs + ox); y1 = Math.max(y1, b.y1 * vs + oy);
      const mc = _wfrMc(S, r.ent);
      if (mc) { try { mk += worldMaterialKey(mc) + ';'; } catch (e) { /* none */ } }
      // the sprite and the device transform of every member, per bake (the frame's occluder redraws and the mirror reuse them)
      S.draw.set(r.id, { sp: null, M: r.prim ? null : _wfrM(env, r) });
    }
    const bx = Math.max(0, Math.floor(x0) - 1), by = Math.max(0, Math.floor(y0) - 1), bx1 = Math.min(W, Math.ceil(x1) + 1), by1 = Math.min(H, Math.ceil(y1) + 1);
    for (const r of ch.ents) if (!r.prim) S.draw.get(r.id).sp = _wfrSpriteOf(env, S, r, '*');
    if (bx1 <= bx || by1 <= by) continue;
    const key = 'ch|' + geo + '|' + S.season + '|' + S.band + '|' + _wfrHashStr(mk + lk) + '|' + _wfrHashStr(ch.ents.map(r => r.id).join(','));
    used.add(key);
    const kept = cache.get(key);
    if (kept) { Object.assign(out, kept); S.stats.chunksKept++; continue; }
    const c = _wfrCanvas(bx1 - bx, by1 - by), cx = c.getContext('2d', _WFR_CPU);
    let n = 0;
    for (const r of ch.ents) {
      S.stats.spritesDrawn += _wfrDrawRec(cx, env, S, r, S.draw.get(r.id), bx, by, 1) ? 1 : 0;
      if (++n % 8 === 0) yield;
    }
    try { cx.getImageData(0, 0, 1, 1); } catch (e) { /* drawn on first use */ }
    Object.assign(out, { c, x: bx, y: by, w: bx1 - bx, h: by1 - by });
    cache.set(key, { c, x: bx, y: by, w: bx1 - bx, h: by1 - by });
    S.stats.chunksMade++;
    yield;
  }
  S.stats.chunkPx = S.chunks.reduce((a, o) => a + (o.c ? o.w * o.h : 0), 0);
  for (const r of plan.live) S.draw.set(r.id, { sp: null, M: _wfrM(env, r) });
  // 4. the static shadows on the ground (look), one layer under every chunk (shadows lie on the ground; never on water)
  const sunOn = S.sky ? S.sky.sun.alt > 0 && S.sky.dark < 0.6 : !!(L && (L.alt || 0) > 0 && !(L.dark > 0.6));
  if (typeof worldShadowPlan === 'function' && typeof worldDrawShadows === 'function' && sunOn) {
    const sun = S.sky || L, sa = S.sky ? S.sky.sun : { alt: L.alt, az: L.az };
    const sk = 'sh|' + geo + '|' + Math.round((sa.alt || 0) * 2) + '|' + Math.round((sa.az || 0) * 2) + '|' + Math.round(((S.sky && S.sky.cover) || L.cover || 0) * 10);
    used.add(sk);
    let lay = cache.get(sk);
    if (!lay) {
      try {
        const ents = plan.recs.filter(r => !r.backdrop && !r.prim).map(r => Object.assign({}, r.ent, { id: r.id }));
        const sp = worldShadowPlan({ entities: ents, surfaces: world.surfaces, cam }, cam, sun) || [];
        let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
        for (const s of sp) for (const q of s.scr || []) { X0 = Math.min(X0, q[0] * vs + ox); X1 = Math.max(X1, q[0] * vs + ox); Y0 = Math.min(Y0, q[1] * vs + oy); Y1 = Math.max(Y1, q[1] * vs + oy); }
        const bx = Math.max(0, Math.floor(X0) - 2), by = Math.max(0, Math.floor(Y0) - 2), bw = Math.min(W, Math.ceil(X1) + 2) - bx, bh = Math.min(H, Math.ceil(Y1) + 2) - by;
        if (sp.length && bw > 0 && bh > 0) {
          const c = _wfrCanvas(bw, bh), cx = c.getContext('2d', _WFR_CPU), byId = plan.byId;
          const spriteOf = (ref) => { const r = byId.get(String(ref)), d = r && S.draw.get(r.id); return d && d.sp && d.sp.c ? { c: d.sp.c, x0: d.sp.x0, y0: d.sp.y0, w: d.sp.w, h: d.sp.h, s: r.s, flip: r.flip, X: r.X, Y: r.Y, x: r.x, d: r.z, top: d.sp.y0 } : null; };
          worldDrawShadows(cx, sp, { vs, ox: ox - bx, oy: oy - by, spriteOf, cam, sun: typeof worldSunOf === 'function' ? worldSunOf(sun, cam) : null });
          // never on water (L2): whatever the plan's holes missed, the water's own outline is cut out (what lies on it stays)
          if (S.wet && S.wet.water.length) { cx.save(); cx.setTransform(vs, 0, 0, vs, ox - bx, oy - by); _wfrWetClip(cx, S.wet, true); cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = '#000'; cx.fillRect(-1e4, -1e4, 2e4, 2e4); cx.restore(); }
          lay = { c, x: bx, y: by, plan: sp };
        } else lay = { c: null, plan: sp };
      } catch (e) { lay = { c: null, plan: [] }; S.stats.errors.push('shadows: ' + (e && e.message)); }
      cache.set(sk, lay);
    }
    S.shadow = lay.c ? lay : null;
    S.shade = (lay.plan || []).filter(s => s.holesScr && s.holesScr.length).flatMap(s => s.holesScr.map(h => ({ scr: h, op: s.op })));
  }
  yield;
  // 5. the water and the mirror of the statics (look: from the water surface, each pixel about its owner's contact row; H1)
  if (S.regions.length && typeof worldWaterComposite === 'function' && typeof worldWaterMirror === 'function' && typeof worldWaterContact === 'function') {
    let mk = '';
    if (S.mctx) { try { mk = worldMaterialKey(S.mctx); } catch (e) { mk = ''; } }
    const wk = 'wa|' + geo + '|' + S.band + '|' + (S.sky ? Math.round(S.sky.sun.alt * 2) + ',' + Math.round(S.sky.sun.az * 2) : '') + '|' + _wfrHashStr(lk + mk);
    used.add(wk);
    let kept = cache.get(wk);
    if (!kept) {
      kept = [];
      for (const R of S.regions) {
        try {
          const draws = [];
          for (const r of plan.recs.slice().sort((a, b) => b.z - a.z || (a.id < b.id ? -1 : 1))) {
            if (r.z < (R.dNear || 0) - 1 || r.box.x1 < R.box[0] || r.box.x0 > R.box[2] || r.box.y0 > R.box[3]) continue;
            const img = _wfrImage(env, S, r, S.draw.get(r.id));
            if (img) draws.push({ id: r.id, z: r.z, contact: worldWaterContact(R, r.ent, cam), img: img.img, x: img.x, y: img.y });
            if (draws.length % 16 === 0) yield;
          }
          const cmp = worldWaterComposite(R, draws, { vs, ox, oy, top: 0, W, H });
          const res = worldWaterMirror(null, R, cmp.comp, cmp.owner, { vs, ox, oy, W, H, sky: S.sky || undefined, L, base: true, ripple: false, shade: S.shade || [], t: 0 });
          kept.push({ R, res });
        } catch (e) { S.stats.errors.push('water: ' + (e && e.message)); }
        yield;
      }
      cache.set(wk, kept);
    }
    S.water = kept;
    if (typeof worldWaterFalls === 'function') { try { S.falls = worldWaterFalls(world, cam, S.regions) || []; } catch (e) { S.falls = []; } }
  }
  // 6. the static night lights (look: library glow parts only; per-window seeded thresholds)
  _wfrLightsPlan(env, S);
  // a cache entry no bake of this world uses any more is let go (the previous bake may still draw its own until the swap)
  const prev = rec.frame.used || new Set();
  for (const k of [...cache.keys()]) if (!used.has(k) && !prev.has(k)) cache.delete(k);
  rec.frame.used = used;
  S.ready = true;
}
/** One record drawn alone into a small canvas at its device box, read back (the water composite's pure input). */
function _wfrImage(env, S, r, d) {
  const vs = env.vs, b = r.box;
  const x0 = Math.floor(b.x0 * vs + env.ox) - 1, y0 = Math.floor(b.y0 * vs + env.oy) - 1, x1 = Math.ceil(b.x1 * vs + env.ox) + 1, y1 = Math.ceil(b.y1 * vs + env.oy) + 1;
  const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(env.W, x1), cy1 = Math.min(env.H, y1);
  if (cx1 <= cx0 || cy1 <= cy0) return null;
  const c = _wfrCanvas(cx1 - cx0, cy1 - cy0), cx = c.getContext('2d', _WFR_CPU);
  let dd = d;
  if (!r.prim && (!dd || !dd.sp)) dd = { sp: r.spNow || _wfrSpriteOf(env, S, r, '*'), M: _wfrM(env, r) };
  if (!_wfrDrawRec(cx, env, S, r, dd, cx0, cy0, 1)) return null;
  try { return { img: cx.getImageData(0, 0, cx1 - cx0, cy1 - cy0), x: cx0, y: cy0 }; } catch (e) { return null; }
}
/** The static lights of this light (look's worldLights): lit glows and lamp pools baked into one layer, keyed by the lit set. */
function _wfrLightsPlan(env, S) {
  S.lights = null;
  const rec = S.rec, world = rec.world, L = env.Lnow || env.L;
  if (typeof worldLights !== 'function' || typeof worldDrawLights !== 'function' || !L) return;
  const sky = L === env.L ? S.sky : _wfrSky(_wfrTimeCtx(world, L.ms, { L, season: S.season }), world.cam, L);
  let list = [];
  try {
    const ents = S.plan ? S.plan.recs.filter(r => !r.prim).map(r => Object.assign({}, r.ent, { id: r.id })) : world.entities;
    list = (worldLights({ entities: ents }, { sky: sky || undefined, L, season: S.season }) || []).filter(x => x.on);
  } catch (e) { S.stats.errors.push('lights: ' + (e && e.message)); return; }
  if (!list.length) return;
  const cache = rec.frame.cache || (rec.frame.cache = new Map());
  const key = 'li|' + env.W + 'x' + env.H + '|' + Math.round(env.vs * 1e4) + '|' + _wfrHashStr(list.map(x => x.ref + ':' + x.part).join(','));
  let lay = cache.get(key);
  if (!lay) {
    const c = _wfrCanvas(env.W, env.H), cx = c.getContext('2d', _WFR_CPU);
    try { worldDrawLights(cx, list, world.cam, { vs: env.vs, ox: env.ox, oy: env.oy }); } catch (e) { S.stats.errors.push('drawLights: ' + (e && e.message)); }
    lay = { c, n: list.length };
    cache.set(key, lay);
  }
  if (S.used) S.used.add(key);
  if (rec.frame.used) rec.frame.used.add(key);
  S.lights = lay;
}
function _wfrRun(S, ms) {
  if (!S.job || S.ready) return;
  const a = _wfrNow();
  try {
    let r = S.job.next();
    while (!r.done && _wfrNow() - a < ms) r = S.job.next();
    if (r.done) S.ready = true;
  } catch (e) { S.ready = true; S.failed = String(e && e.message || e); S.stats.errors.push('bake: ' + S.failed); }
  S.stats.bakeMs += _wfrNow() - a;
}

/* ---------- browser: a frame ---------- */
/**
 * The animation hooks of a mover or a live static: appearance's worldAnimHooks (v2 hooks with period, phase and amplitude
 * from what it is doing), else the object's own walk / paddle / flap hooks while it moves (a fallback; A6 is appearance's).
 */
function _wfrHooks(env, S, r, sh, tau) {
  if (typeof worldAnimHooks === 'function') {
    try {
      const h = worldAnimHooks(r.ent, tau, { obj: r.o, variant: r.v, season: S.season, world: S.rec.world });
      const list = Array.isArray(h) ? h : h && Array.isArray(h.hooks) ? h.hooks : null;
      if (list) return list.filter(x => x && x.kind);
    } catch (e) { /* below */ }
  }
  if (r.static || !sh || !Array.isArray(sh.anim) || !(Math.hypot(r.ent.vx || 0, r.ent.vz || 0) > 0.05)) return [];
  const ph = Number.isFinite(r.ent.phase) ? r.ent.phase : 0;
  return sh.anim.filter(h => h.kind === 'walk' || h.kind === 'paddle' || h.kind === 'flap').map(h => Object.assign({}, h, { phase: ((h.phase || 0) + ph) % 1 }));
}
/** Draw one mover (an agent or a live static): its rest sprite and its moving parts posed at the scene time, cut at a waterline. */
function _wfrDrawMover(env, S, ctx, r, tau, alpha) {
  if (r.prim) return _wfrDrawRec(ctx, env, S, r, null, 0, 0, alpha);
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(r.o, r.v, S.season) : null;
  const L = env.Lnow || env.L, night = !!(L && (L.windows || L.dark > 0.5)), lit = !r.static && night && /vehicle|tram|train|boat|bus|car/.test(String(r.ent.cls || r.obj));
  const hooks = typeof sceneAnimPose === 'function' ? _wfrHooks(env, S, r, sh, tau) : [], d = r.static ? S.draw.get(r.id) : null, M = d && d.M ? d.M : _wfrM(env, r);
  const x = { litGlow: lit, bucket: r.bucket };
  if (r.cut) { ctx.save(); _wfrClipCut(ctx, r.cut, env, 0, 0); }
  let n = 0;
  try {
    const blit = (sp, MM, al) => { if (!sp || !sp.c || !(al > 0)) return; ctx.globalAlpha = al; ctx.setTransform(MM[0], MM[1], MM[2], MM[3], MM[4], MM[5]); ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); n++; };
    const A0 = alpha == null ? 1 : alpha;
    if (!hooks.length) {
      const sp = _wfrSpriteOf(env, S, r, '*', x);
      r.spNow = sp;
      if (sp && env.keep) env.keep(sp);
      blit(sp, M, A0);
    } else {
      const whole = hooks.find(h => _wfrParts(h)[0] === '*'), moved = [...new Set(hooks.filter(h => _wfrParts(h)[0] !== '*').flatMap(_wfrParts))];
      const rest = _wfrSpriteOf(env, S, r, moved.length ? 'rest:' + moved.join(',') : '*', x);
      r.spNow = moved.length ? null : rest;
      if (rest && env.keep) env.keep(rest);
      let bob = 0;
      for (const h of hooks) if (h.kind === 'walk') { try { bob = sceneAnimPose(h, tau, L, r.x).bob || 0; } catch (e) { bob = 0; } break; }
      let W0 = null;
      if (whole) { try { W0 = sceneAnimPose(whole, tau, L, r.x).m; } catch (e) { W0 = null; } }
      const MR = W0 ? _wfrMul(M, W0) : M.slice();
      if (bob) MR[5] += bob * env.vs * r.s;
      blit(rest, MR, A0);
      for (const h of hooks) {
        if (h === whole) continue;
        const parts = _wfrParts(h);
        if (parts[0] === '*') continue;
        let pose = null;
        try { pose = sceneAnimPose(h, tau, L, r.x); } catch (e) { pose = null; }
        if (!pose) continue;
        parts.forEach((p, j) => {
          const al = pose.alphas ? pose.alphas[j] * pose.alpha : pose.alpha;
          const sp = _wfrSpriteOf(env, S, r, p, x);
          if (sp && env.keep) env.keep(sp);
          blit(sp, _wfrMul(MR, j === 1 && pose.m2 ? pose.m2 : pose.m), A0 * al);
        });
      }
    }
  } finally { if (r.cut) ctx.restore(); ctx.globalAlpha = 1; }
  return n;
}
/** The contact blob under a grounded agent (no look package): a soft ellipse, never on water or in the air. */
function _wfrBlob(ctx, env, r) {
  const a = r.ent;
  if (_wfrIsWater(a) || a.layer === 'wade' || a.layer === 'air' || /^air/.test(String(a.attach || ''))) return 0;
  const w = Math.max(3, (r.box.x1 - r.box.x0) * 0.7) * env.vs, h = Math.max(1, w * 0.18);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = env.Lnow && env.Lnow.dark > 0.7 ? 0.12 : 0.22;
  ctx.fillStyle = '#10161e';
  ctx.beginPath(); ctx.ellipse(r.X * env.vs + env.ox, r.Y * env.vs + env.oy, w / 2, h / 2, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.globalAlpha = 1;
  return 1;
}

/**
 * The water mirror of the agents, per frame (2.5: movers above the water are mirrored per frame, their columns only). Each
 * agent is one drawing, so the composite of its own pixels mirrored about its own contact row (look: worldWaterContact /
 * worldWaterContactRow; the far bank's edge for one on the bank, its own waterline for one in the water) is one flipped blit,
 * clipped to the water's outline and to the rows below that contact, faded by the kind's mirror strength: nothing reflects
 * outside the water, a floater's sunk part never mirrors, and a moving boat (a prim) is drawn once into a scratch and flipped.
 * (The statics' mirror is look's exact per-pixel composite at bake; this per-frame path costs one blit per agent.)
 */
function _wfrMirrorAgents(env, S, ctx, aRecs, tau) {
  if (typeof worldWaterContact !== 'function' || typeof worldWaterContactRow !== 'function') return 0;
  const vs = env.vs, ox = env.ox, oy = env.oy, cam = S.rec.world.cam;
  let n = 0;
  for (const w of S.water) {
    const R = w.R, P = R.clip;
    if (!Array.isArray(P) || P.length < 3) continue;
    const over = aRecs.filter(r => r.box.x1 > R.box[0] && r.box.x0 < R.box[2] && r.box.y0 < R.box[3] && r.z >= (R.dNear || 0) - 1 && !/^air/.test(String(r.ent.attach || '')));
    if (!over.length) continue;
    const look = R.look || {}, k = Math.max(0, Math.min(1, (look.mirror == null ? 0.7 : look.mirror))) * 0.6;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath(); ctx.moveTo(P[0][0] * vs + ox, P[0][1] * vs + oy);
    for (const q of P) ctx.lineTo(q[0] * vs + ox, q[1] * vs + oy);
    ctx.closePath(); ctx.clip();
    if (S.wet && S.wet.over.length) { ctx.setTransform(vs, 0, 0, vs, ox, oy); _wfrHoleClip(ctx, S.wet.over); }
    for (const r of over.sort((a, b) => b.z - a.z)) {
      let c = null;
      try { c = worldWaterContact(R, r.ent, cam); } catch (e) { c = null; }
      if (!c) continue;
      const row = worldWaterContactRow(R, c, r.X);
      if (!Number.isFinite(row) || !(r.box.y0 < row)) continue;
      const Yc = row * vs + oy;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(-1e5, Yc, 2e5, 1e5); ctx.clip();
      ctx.globalAlpha = k;
      if (r.prim) {
        const b = r.box, x0 = Math.floor(b.x0 * vs + ox) - 1, y0 = Math.floor(b.y0 * vs + oy) - 1, ww = Math.ceil((b.x1 - b.x0) * vs) + 2, hh = Math.min(Math.ceil(Yc - y0) + 1, Math.ceil((b.y1 - b.y0) * vs) + 2);
        if (ww > 0 && hh > 0 && ww < 4 * env.W && hh < 4 * env.H) {
          const sc = S.scratch && S.scratch.width >= ww && S.scratch.height >= hh ? S.scratch : (S.scratch = _wfrCanvas(Math.max(ww, 64), Math.max(hh, 64)));
          const sx = sc.getContext('2d');
          sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, sc.width, sc.height);
          _wfrDrawRec(sx, env, S, r, null, x0, y0, 1);
          ctx.setTransform(1, 0, 0, -1, 0, 2 * Yc);
          ctx.drawImage(sc, 0, 0, ww, hh, x0, y0, ww, hh);
          n++;
        }
      } else {
        const sp = _wfrSpriteOf(env, S, r, '*', { bucket: r.bucket });
        if (sp && sp.c) {
          const M = _wfrM(env, r);
          ctx.setTransform(M[0], 0, 0, -M[3], M[4], 2 * Yc - M[5]);
          ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
          n++;
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  return n;
}

/** One frame of the world on the v2 base layer (the last group's frameGroup, or framePost when there is no group). */
function _wfrDraw(env, ctx, t) {
  const S = env._wfr;
  if (!S) return 0;
  if (!S.ready) { if (env.warming) { _wfrRun(S, 8); if (!S.ready) return 0; } else _wfrRun(S, Infinity); }
  if (!S.plan) return 0;
  const rec = S.rec, world = rec.world, cam = world.cam, vs = env.vs, ox = env.ox, oy = env.oy, ta = _wfrNow(), L = env.Lnow || env.L;
  const st = typeof worldHostAt === 'function' ? worldHostAt(rec, t, { key: env, warming: !!env.warming, still: !!env.still }) : { tau: 0, agents: [] };
  const tau = st.tau;
  // the agents as draw records (views by appearance with hysteresis; scale buckets with hysteresis; view changes cross-fade)
  const mem = rec.frame.agents || (rec.frame.agents = new Map()), seen = new Set(), aRecs = [];
  let list = st.agents || [];
  const lvl = env.gov ? env.gov.level : 0;
  if (lvl >= 4) list = list.filter((a, i) => (i % 10) < 7);
  for (const a of list) {
    if (a.culled && a.cullReason !== 'occluded') continue;   // off the frame (the lod system); an occluded one still orders
    const m0 = mem.get(String(a.id));
    const r = _wfrRec(_wfrAgentEnt(a), cam, { season: S.season, agent: true, prev: m0, regions: S.regions });
    if (!r) continue;
    // the near band (3.2): a giant at the lens is never drawn even if a module let one through
    if (!r.prim && r.z < cam.f * r.height / 405 && !a.framed) continue;
    if (r.box.x1 * vs + ox < -50 || r.box.x0 * vs + ox > env.W + 50 || r.box.y1 * vs + oy < -50) continue;
    let m = m0;
    if (!m) { m = { e: Math.round(Math.log2(Math.max(1e-3, r.s)) * 4), view: r.view, mirror: r.mirror, o: r.o, flip: r.flip, prev: null, since: -1 }; mem.set(r.id, m); }
    const ex = Math.log2(Math.max(1e-3, r.s)) * 4;
    if (Math.abs(ex - m.e) > 0.75) m.e = Math.round(ex);
    r.bucket = 2 ** (m.e / 4);
    if (m.o !== r.o || m.flip !== r.flip) { m.prev = { o: m.o, flip: m.flip, view: m.view }; m.since = tau; }
    m.view = r.view; m.mirror = r.mirror; m.o = r.o; m.flip = r.flip;
    r.mem = m; seen.add(r.id);
    aRecs.push(r);
  }
  for (const k of [...mem.keys()]) if (!seen.has(k)) mem.delete(k);
  const movers = S.plan.live.concat(aRecs);
  const order = typeof worldFrameOrder === 'function' ? worldFrameOrder(S.plan.chunks, movers, null) : S.chunks.map(o => ({ kind: 'chunk', ref: o.ch })).concat(movers.map(r => ({ kind: 'agent', ref: r })));
  S.stats.orderMs = _wfrNow() - ta;
  let draws = 0;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // per-section profile (ms, averaged over the frames since the bake: stats().prof)
  const pf = S.stats.prof || (S.stats.prof = { order: 0, water: 0, mirror: 0, shadows: 0, depth: 0, lights: 0, n: 0 });
  let tp = _wfrNow();
  const lap = (k) => { const n = _wfrNow(); pf[k] += n - tp; tp = n; };
  pf.order += tp - ta; pf.n++;
  // 1. the water with the statics' mirror (rippled in bands), falls, then the agents' mirror on their columns, rings and wakes
  if (S.water && S.water.length) {
    ctx.save();
    if (S.wet && S.wet.over.length) { ctx.setTransform(vs, 0, 0, vs, ox, oy); _wfrHoleClip(ctx, S.wet.over); }
    for (const w of S.water) {
      try { draws += worldWaterDraw(ctx, w.res, w.R, tau, { vs, oy, wind: L && L.wind != null ? L.wind : 1 }) || 0; } catch (e) { /* the v2 base water shows */ }
    }
    ctx.restore();
  }
  if (S.falls && S.falls.length && typeof worldWaterDrawFalls === 'function') { try { draws += worldWaterDrawFalls(ctx, S.falls, tau, { vs, ox, oy }) || 0; } catch (e) { /* none */ } }
  lap('water');
  if (aRecs.length && S.water && S.water.length && !S.agentMirrorOff) {
    try { draws += _wfrMirrorAgents(env, S, ctx, aRecs, tau); } catch (e) { S.agentMirrorOff = true; S.stats.errors.push('agentMirror: ' + (e && e.message)); }
  }
  if (world.water && typeof worldWaterDrawFx === 'function') { try { draws += worldWaterDrawFx(ctx, world, cam, { vs, ox, oy }) || 0; } catch (e) { /* none */ } }
  // the decks over the water (boardwalks, jetties, platforms): planks over the water and its mirror, under everything that
  // stands on them (shadows, chunks and movers come after)
  if (S.wet && S.wet.decks && S.wet.decks.length) { try { draws += _wfrDrawDecks(ctx, env, S); } catch (e) { S.stats.errors.push('decks: ' + (e && e.message)); } }
  lap('mirror');
  // 2. the ground shadows of the statics, then the movers' shadows (look's plan per frame; else a contact blob)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.shadow && S.shadow.c) { ctx.drawImage(S.shadow.c, S.shadow.x, S.shadow.y); draws++; }
  if (aRecs.length) {
    const sunOn = S.sky ? S.sky.sun.alt > 0 && S.sky.dark < 0.6 : !!(L && (L.alt || 0) > 0 && !(L.dark > 0.6));
    if (typeof worldShadowPlan === 'function' && typeof worldDrawShadows === 'function') {
      if (sunOn && !S.agentShadowOff) {
        try {
          const sun = S.sky || L, ag = aRecs.map(r => Object.assign({}, r.ent, { id: r.id }));
          const plan = worldShadowPlan({ entities: [], surfaces: world.surfaces, cam }, cam, sun, { agents: ag, statics: false, W: 2 * (cam.x0 || 800) }) || [];
          const byId = new Map(aRecs.map(r => [r.id, r]));
          const spriteOf = (ref) => { const r = byId.get(String(ref)); const sp = r && !r.prim ? _wfrSpriteOf(env, S, r, '*', { bucket: r.bucket }) : null; return sp && sp.c ? { c: sp.c, x0: sp.x0, y0: sp.y0, w: sp.w, h: sp.h, s: r.s, flip: r.flip, X: r.X, Y: r.Y, x: r.x, d: r.z, top: sp.y0 } : null; };
          ctx.save();
          if (S.wet && S.wet.water.length) { ctx.setTransform(vs, 0, 0, vs, ox, oy); _wfrHoleClip(ctx, S.wet.water); }   // never on water (L2)
          draws += worldDrawShadows(ctx, plan, { vs, ox, oy, spriteOf, cam, sun: typeof worldSunOf === 'function' ? worldSunOf(sun, cam) : null }) || 0;
          ctx.restore();
        } catch (e) { S.agentShadowOff = true; S.stats.errors.push('agentShadows: ' + (e && e.message)); }
      }
    } else for (const r of aRecs) draws += _wfrBlob(ctx, env, r);
  }
  lap('shadows');
  // 3. chunks and movers in true depth order, with the occluder redraws (clipped to the mover drawn just before)
  const chunkOf = new Map(S.chunks.map(o => [o.ch, o]));
  let clip = null, redraws = 0;
  for (const it of order) {
    if (it.kind === 'chunk') {
      const o = chunkOf.get(it.ref);
      if (o && o.c) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(o.c, o.x, o.y); draws++; }
      continue;
    }
    if (it.kind === 'agent') {
      const r = it.ref, m = r.mem;
      const k = m && m.prev && m.since >= 0 ? Math.max(0, Math.min(1, (tau - m.since) / WORLD_FRAME_FADE_S)) : 1;
      if (k < 1 && m.prev && m.prev.o && !r.prim) draws += _wfrDrawMover(env, S, ctx, Object.assign({}, r, { o: m.prev.o, flip: !!m.prev.flip }), tau, 1 - k);
      else if (m) m.prev = null;
      draws += _wfrDrawMover(env, S, ctx, r, tau, k);
      const b = r.box;
      clip = [Math.floor(b.x0 * vs + ox) - 1, Math.floor(b.y0 * vs + oy) - 1, Math.ceil(b.x1 * vs + ox) + 1, Math.ceil(b.y1 * vs + oy) + 1];
      continue;
    }
    if (it.kind === 'redraw' && clip) {
      const r = it.ref, d = S.draw.get(r.id);
      if (!d) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1]); ctx.clip();
      if (_wfrDrawRec(ctx, env, S, r, d, 0, 0, 1)) { redraws++; draws++; }
      ctx.restore();
    }
  }
  lap('depth');
  // 4. the lights: the static layer, then the movers' own (head and tail lights, lit windows of trams and trains)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (S.lights && S.lights.c) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(S.lights.c, 0, 0); ctx.globalCompositeOperation = 'source-over'; draws++; }
  if (aRecs.length && typeof worldLights === 'function' && typeof worldDrawLights === 'function' && L && ((L.dark || 0) > 0.3 || L.windows || L.fog)) {
    try {
      const al = (worldLights({ entities: [] }, { sky: S.sky || undefined, L, season: S.season, agents: aRecs.map(r => Object.assign({}, r.ent, { id: r.id })) }) || []).filter(x => x.on);
      if (al.length) draws += worldDrawLights(ctx, al, cam, { vs, ox, oy }) || 0;
    } catch (e) { /* no mover lights */ }
  }
  ctx.restore();
  lap('lights');
  S.stats.frames++; S.stats.agents = aRecs.length; S.stats.redraws = redraws; S.stats.tau = tau;
  S.stats.frameMs = _wfrNow() - ta;
  rec.stats.draws = draws;
  return draws;
}

if (typeof sceneRenderPassDefine === 'function') {
  const recOf = (C) => (typeof worldHostLive === 'function' && C ? worldHostLive(C.id) : null);
  sceneRenderPassDefine({
    id: 'world-frame',
    // prebake after the water and flows; frameGroup after every v2 frame pass of the nearest group (the base water, its ripples)
    order: { prebake: 40, frameGroup: 95, framePost: 5, relight: 50, default: 95 },
    applies(C) { const r = recOf(C); return !!(r && r.compositor); },
    prebake(env) {
      const rec = recOf(env.C);
      if (!rec) return;
      const S = { rec, season: env.C.season || 'summer', band: 'day', ready: false, job: null, chunks: [], draw: new Map(), water: [], regions: [], falls: [], shadow: null, shade: [], lights: null, plan: null,
        stats: { bakeMs: 0, chunksMade: 0, chunksKept: 0, chunkPx: 0, spritesDrawn: 0, frames: 0, agents: 0, redraws: 0, orderMs: 0, frameMs: 0, tau: 0, errors: [] } };
      env._wfr = S;
      rec.frame.last = S;   // the latest bake of this world (tools and tests read its state)
      S.job = _wfrBakeJob(env, S);
      _wfrRun(S, env.still ? Infinity : 6);
    },
    frameGroup(env, grp, ctx, t) {
      const g = env.groups || [];
      if (!g.length || grp !== g[g.length - 1]) return 0;
      return _wfrDraw(env, ctx, t);
    },
    framePost(env, ctx, t) { return (env.groups || []).length ? 0 : _wfrDraw(env, ctx, t); },
    // a new light inside the same light key: the lights are planned again (V5: nothing is rasterised again)
    relight(env, L) {
      const S = env._wfr;
      if (!S || !S.ready) return;
      env.Lnow = L;
      if (S.rec.driver && typeof S.rec.driver.setTime === 'function' && L && Number.isFinite(L.ms)) S.rec.driver.setTime(L.ms);   // T2: the time context follows the light
      _wfrLightsPlan(env, S);
    },
    stats(env) {
      const S = env._wfr;
      if (!S) return {};
      const s = S.stats;
      return { ready: S.ready, chunks: S.chunks.filter(o => o.c).length, chunkSizes: S.chunks.filter(o => o.c).map(o => o.w + 'x' + o.h + '@' + o.x + ',' + o.y + ':' + o.ch.ents.length), chunkPx: s.chunkPx, chunksMade: s.chunksMade, chunksKept: s.chunksKept, statics: S.plan ? S.plan.recs.length : 0, live: S.plan ? S.plan.live.length : 0,
        agents: s.agents, redraws: s.redraws, occDraws: s.redraws, orderMs: Math.round(s.orderMs * 1000) / 1000, frameMs: Math.round(s.frameMs * 100) / 100, bakeMs: Math.round(s.bakeMs),
        prof: s.prof ? Object.fromEntries(Object.entries(s.prof).filter(([k]) => k !== 'n').map(([k, v]) => [k, Math.round(v / Math.max(1, s.prof.n) * 100) / 100])) : null,
        materials: !!S.mat, shadows: !!S.shadow, water: (S.water || []).length, lights: S.lights ? S.lights.n : 0, tau: Math.round(s.tau * 100) / 100, errors: s.errors.slice(0, 5) };
    },
  });
  _wfrPassDefined = true;
}
