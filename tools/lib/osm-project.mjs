// OpenStreetMap data to scene recipe sections (docs/dev/SCENE_ENGINE_V2.md 17.3 to 17.6; builder E). Node >= 20, no dependencies, pure.
// AUTHORING TIME ONLY: the output is plain JSON data written into a recipe; the app never fetches or reads OSM.
//
//   osmCamera(o)                          -> the camera of V2 2.1/2.2 from { lat, lon, heading, fov, eye, horizon, x0 } (+ f, dMin, t)
//   osmElements(data)                     -> { nodes, ways, rels } from an Overpass `out geom` response (multipolygons joined into rings)
//   osmProject(data, cam, opts)           -> { sections: { surfaces, water, buildings, place, scatter }, report, source }
//        opts: { range 700, budget 20000 (bytes of the sections), library: [{ id, category, tags }] | null, realOf(id) -> metres | null,
//                urban: 'auto' | bool, maxTrees 150, fetched, hash, bbox }
//   osmMerge(scene, imported)             -> { scene, kept, replaced, skipped }: re-import that keeps hand entries (17.1 --into)
//   osmHeadings(data, { lat, lon, range }) -> the 8 compass headings with the named features in each (no --heading given)
//   osmPreviewScene(rec, opts)            -> v1 scene data (screen polygons) that draws the imported layout with the v1 renderer:
//                                            a look at the import before (or without) the v2 compile; used by `scene osm --preview`
//   entryHash(section, entry)             -> 6 hex: what `source.osm.own` records for each imported entry
//
// Ground coordinates are metres: x to the right of the view axis, d forward along it (geo.mjs groundOf). Everything is clipped to the
// view wedge (d 0.5 to range, |x| <= d * tan(fov / 2) * 1.2), simplified with a tolerance of 1.5 screen units at each point's depth,
// rounded to 0.1 m, and features under 2 units on screen are dropped. Names, brands and operators NEVER reach drawn text: they appear
// only in the report (for meta.site suggestions and the missing list).
import { createHash } from 'node:crypto';
import { groundOf, ringArea, ringCentroid, pointInRing, nearestOnLine, lineLength, simplify, clipRing, clipLine, wedgePlanes, haversine } from './geo.mjs';
import * as T from './osm-tags.mjs';

export const OSM_DEFAULTS = Object.freeze({ fov: 66, eye: 1.65, horizon: 470, range: 700, budget: 20000, maxTrees: 100, maxBuildings: 160 });
const RAD = Math.PI / 180;
const r1 = (v) => Math.round(v * 10) / 10;
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function osmCamera(o = {}) {
  const fov = +o.fov || OSM_DEFAULTS.fov, eye = +o.eye || OSM_DEFAULTS.eye, horizon = o.horizon != null ? +o.horizon : OSM_DEFAULTS.horizon;
  const f = 800 / Math.tan(fov / 2 * RAD), x0 = o.x0 != null ? +o.x0 : 800;
  if (!Number.isFinite(+o.lat) || !Number.isFinite(+o.lon)) throw new Error('the camera needs lat and lon');
  if (horizon >= 899) throw new Error('the horizon must be above the bottom of the frame');
  return { lat: +o.lat, lon: +o.lon, heading: ((+o.heading || 0) % 360 + 360) % 360, fov, eye, horizon, x0, f, dMin: f * eye / (900 - horizon), t: Math.tan(fov / 2 * RAD) };
}
const proj = (C, p, h = 0) => [C.x0 + C.f * p[0] / p[1], C.horizon + C.f * (C.eye - h) / p[1]];

/* ---------------------------------------------------------------------------------------------
   Elements
   --------------------------------------------------------------------------------------------- */
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
function joinRings(segs) {
  const pool = segs.filter(s => s.length >= 2).map(s => s.slice()), rings = [];
  while (pool.length) {
    let cur = pool.shift(), guard = 0;
    while (!same(cur[0], cur[cur.length - 1]) && guard++ < 2000) {
      const end = cur[cur.length - 1], i = pool.findIndex(s => same(s[0], end) || same(s[s.length - 1], end));
      if (i < 0) break;
      let s = pool.splice(i, 1)[0]; if (!same(s[0], end)) s = s.slice().reverse();
      cur = cur.concat(s.slice(1));
    }
    if (cur.length >= 4 && same(cur[0], cur[cur.length - 1])) rings.push(cur.slice(0, -1));
  }
  return rings;
}
export function osmElements(data) {
  const els = (data && data.elements) || [], nodes = [], ways = [], rels = [];
  for (const e of els) {
    if (e.type === 'node' && Number.isFinite(e.lat) && e.tags) nodes.push({ id: 'n' + e.id, tags: e.tags, ll: [e.lat, e.lon] });
    else if (e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length >= 2) {
      const pts = e.geometry.filter(Boolean).map(g => [g.lat, g.lon]);
      const closed = pts.length >= 4 && same(pts[0], pts[pts.length - 1]);
      ways.push({ id: 'w' + e.id, tags: e.tags || {}, pts: closed ? pts.slice(0, -1) : pts, closed });
    } else if (e.type === 'relation' && Array.isArray(e.members) && e.tags && (e.tags.type === 'multipolygon' || e.tags.type === 'boundary' && false)) {
      const outer = e.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && Array.isArray(m.geometry)).map(m => m.geometry.filter(Boolean).map(g => [g.lat, g.lon]));
      const rings = joinRings(outer);
      if (rings.length) rels.push({ id: 'r' + e.id, tags: e.tags, rings });
    }
  }
  return { nodes, ways, rels };
}

/* ---------------------------------------------------------------------------------------------
   Projection
   --------------------------------------------------------------------------------------------- */
/** Chain ways of the same look end to end (OSM splits a street into many ways): fewer, smoother strips. */
function chain(list, keyOf) {
  const groups = new Map();
  for (const w of list) { const k = keyOf(w); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(w); }
  const out = [];
  for (const g of groups.values()) {
    const pool = g.map(w => Object.assign({}, w, { ll: w.ll.slice(), ids: [w.id] }));
    while (pool.length) {
      const cur = pool.shift();
      let grown = true;
      while (grown) {
        grown = false;
        for (let i = 0; i < pool.length; i++) {
          const s = pool[i], a = cur.ll, b = s.ll;
          if (same(a[a.length - 1], b[0])) cur.ll = a.concat(b.slice(1));
          else if (same(a[a.length - 1], b[b.length - 1]) && !s.oneway) cur.ll = a.concat(b.slice(0, -1).reverse());
          else if (same(a[0], b[b.length - 1])) cur.ll = b.concat(a.slice(1));
          else if (same(a[0], b[0]) && !s.oneway && !cur.oneway) cur.ll = b.slice().reverse().concat(a.slice(1));
          else continue;
          cur.ids.push(s.id); pool.splice(i, 1); grown = true; break;
        }
      }
      out.push(cur);
    }
  }
  return out;
}
const fracNear = (line, others, within) => {
  if (!line.length || !others.length) return 0;
  let n = 0; for (const p of line) if (others.some(o => nearestOnLine(p, o.g).m <= within(o))) n++;
  return n / line.length;
};
/** The screen box of ground points (each grown by `half` metres): [X0, Y0, X1, Y1]. */
function screenBox(C, pts, half = 0) {
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const p of pts) for (const q of half ? [[p[0] - half, p[1]], [p[0] + half, p[1]], [p[0], Math.max(0.5, p[1] - half)], [p[0], p[1] + half]] : [p]) {
    if (q[1] <= 0.1) continue;
    const [X, Y] = proj(C, q); X0 = Math.min(X0, X); X1 = Math.max(X1, X); Y0 = Math.min(Y0, Y); Y1 = Math.max(Y1, Y);
  }
  return [X0, Y0, X1, Y1];
}
const tooSmall = (b) => !(b[2] > b[0]) || (b[2] - b[0] < 2 && b[3] - b[1] < 2) || b[3] - b[1] < 0.5 || b[0] > 1760 || b[2] < -160;
const roundPts = (pts) => { const out = []; for (const p of pts) { const q = [r1(p[0]), r1(p[1])]; if (!out.length || q[0] !== out[out.length - 1][0] || q[1] !== out[out.length - 1][1]) out.push(q); } return out; };
const ccw = (r) => (ringArea(r) < 0 ? r.slice().reverse() : r);

/** What each imported entry is recorded as (source.osm.own): the section and the entry without its src, hashed. */
export function entryHash(section, e) { const { src, ...rest } = e; return createHash('sha1').update(section + '|' + JSON.stringify(rest)).digest('hex').slice(0, 6); }

export function osmProject(data, cam, opts = {}) {
  const C = osmCamera(cam), G = groundOf(C), range = +opts.range || +cam.range || OSM_DEFAULTS.range;
  const lib = Array.isArray(opts.library) ? opts.library : null;
  const libIds = lib ? new Set(lib.map(o => o.id)) : null, has = (id) => !libIds || libIds.has(id);
  const realOf = typeof opts.realOf === 'function' ? opts.realOf : () => null;
  const tg = (ll) => G.toGround(ll[0], ll[1]);
  const { nodes, ways, rels } = osmElements(data);
  const tWide = C.t * 1.2;
  const problems = [], counts = {}, missing = [], named = [];
  const bump = (k, n = 1) => { counts[k] = (counts[k] || 0) + n; };
  const inWedge = (p, m = 0, dFar = range) => p[1] >= 0.5 && p[1] <= dFar && Math.abs(p[0]) <= p[1] * tWide + m;

  // 1. classify (urban first: pavements default to both sides in a built-up view)
  const bWays = ways.filter(w => w.closed && w.tags.building && w.tags.building !== 'no');
  const nearBuildings = bWays.filter(w => { const c = ringCentroid(w.pts.map(tg)); return inWedge(c, 20, Math.min(range, 350)); }).length;
  const urban = opts.urban === true || opts.urban === false ? opts.urban : nearBuildings >= 10;
  // the rest surface: open country is grass; a suburb of houses is garden (trees and people may stand in the unmapped gardens);
  // a town centre is plot (yards and forecourts)
  const HOUSES = new Set(['house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'residential', 'cottage']);
  const houseShare = bWays.length ? bWays.filter(w => HOUSES.has(w.tags.building)).length / bWays.length : 0;
  const restKind = !urban ? 'grass' : houseShare >= 0.4 || bWays.some(w => w.tags.landuse === 'residential') || ways.some(w => w.tags.landuse === 'residential' && w.closed) && houseShare >= 0.25 ? 'garden' : 'plot';
  const roads = [], paths = [], rails = [], trams = [], platforms = [], waterLines = [], waterAreas = [], areas = [], buildings = [], parts = [], coast = [], treeRows = [], areaFeatures = [];
  const add = (src, ll, closed, idTag) => {
    const t = src.tags, c = T.classifyWay(t, { closed, urban });
    const lm = T.landmarkKind(t);
    if (closed && (lm || t.name && (t.leisure === 'park' || t.leisure === 'garden' || t.place === 'square' || t.highway === 'pedestrian'))) areaFeatures.push({ id: idTag, tags: t, ll, lm });
    if (!c) return;
    const w = Object.assign({ id: idTag, tags: t, ll, closed, layer: +t.layer || 0, oneway: t.oneway === 'yes' }, c);
    if (c.section === 'water') (c.area ? waterAreas : waterLines).push(w);
    else if (c.section === 'building') buildings.push(w);
    else if (c.section === 'part') parts.push(w);
    else if (c.section === 'coast') coast.push(w);
    else if (c.section === 'treerow') treeRows.push(w);
    else if (c.area) areas.push(w);
    else if (c.kind === 'road' || c.road) roads.push(w);
    else if (c.kind === 'rail') rails.push(w);
    else if (c.kind === 'tramway') trams.push(w);
    else if (c.kind === 'platform') platforms.push(w);
    else paths.push(w);
  };
  for (const w of ways) add(w, w.pts, w.closed, w.id);
  for (const r of rels) r.rings.forEach((ring, i) => add(r, ring, true, r.id + (i ? '-' + i : '')));
  const geo = (w) => (w.g = w.g || w.ll.map(tg));

  // 2. canal width from a long, narrow canal polygon; river centrelines inside a river polygon are dropped (the polygon wins)
  for (const wl of waterLines) {
    const g = geo(wl);
    for (const wa of waterAreas) {
      // the share of the line's points near the polygon that lie inside it (a canal runs for miles beyond its mapped outline)
      const ring = geo(wa), xs = ring.map(p => p[0]), ds = ring.map(p => p[1]), pad = 25;
      const near = g.filter(p => p[0] >= Math.min(...xs) - pad && p[0] <= Math.max(...xs) + pad && p[1] >= Math.min(...ds) - pad && p[1] <= Math.max(...ds) + pad);
      if (near.length < 2) continue;
      const inside = near.filter(p => pointInRing(p, ring)).length / near.length;
      if (inside < 0.6) continue;
      const A = Math.abs(ringArea(ring)), per = lineLength(ring.concat([ring[0]])), wEst = 2 * A / per;
      // a mapped canal outline wins over its centreline (integration, 8 Oct: Castlefield): it is the real shape, with its wharves,
      // arms and basins; the line keeps the estimated width for the towpath test below
      if (wl.kind === 'canal' && wa.kind === 'canal') { if (!T.parseMetres(wl.tags.width)) wl.width = Math.max(4, Math.min(30, r1(wEst))); wl.drop = 'in-basin'; }
      else if (wl.kind === 'river' && (wa.kind === 'river' || wa.kind === 'lake')) wl.drop = 'in-area';
    }
  }
  // a river centreline with no width tag and no outline around it is a small river
  for (const wl of waterLines) if (wl.kind === 'river' && !wl.drop && !T.parseMetres(wl.tags.width) && T.WATER_LINES[wl.waterway] && T.WATER_LINES[wl.waterway].alone) wl.width = T.WATER_LINES[wl.waterway].alone;
  // 3. towpaths (a path along a canal), embedded tram lines (a tram on a road)
  const canals = waterLines.filter(w => w.kind === 'canal' && (!w.drop || w.drop === 'in-basin')).map(w => ({ g: geo(w), width: w.width }));
  for (const p of paths) {
    if (!['path', 'track', 'cycleway', 'pavement'].includes(p.kind)) continue;
    if (p.tags.towpath === 'yes' || canals.length && fracNear(geo(p), canals, o => o.width / 2 + 6) >= 0.6) p.kind = 'towpath';
  }
  const roadGeo = roads.map(r => ({ g: geo(r), width: r.width }));
  for (const t of trams) if (fracNear(geo(t), roadGeo, () => 4) >= 0.6) t.embedded = true;
  // 4. bridges: what they span
  const waterGeo = waterLines.filter(w => !w.drop).map(w => ({ g: geo(w), width: w.width })), waterRings = waterAreas.filter(w => !w.drop).map(geo);
  const railGeo = rails.map(r => ({ g: geo(r), width: r.width }));
  const overOf = (w) => {
    const g = geo(w);
    if (g.some(p => waterRings.some(r => pointInRing(p, r))) || fracNear(g, waterGeo, o => o.width / 2 + 2) > 0) return 'water';
    if (fracNear(g, railGeo, o => o.width / 2 + 2) > 0) return 'rail';
    return 'road';
  };

  const sidesOf = (r) => T.sidewalkSides(r.tags, urban);
  const chainedRoads = chain(roads, w => [w.kind, w.width, w.markings, w.bridge, w.crossing, sidesOf(w).join(), w.layer].join('|'));
  const chainedPaths = chain(paths, w => [w.kind, w.width, w.bridge, w.layer].join('|'));
  const chainedRails = chain(rails, w => [w.width, w.bridge, w.layer].join('|'));
  const chainedTrams = chain(trams, w => [w.embedded, w.bridge].join('|'));
  // rills and drains under 1 m are left out: a channel that narrow draws as a trench (reported)
  const rills = waterLines.filter(w => !w.drop && w.width < 1);
  if (rills.length) bump('rillsLeftOut', rills.length);
  const chainedWater = chain(waterLines.filter(w => !w.drop && w.width >= 1), w => [w.kind, w.width].join('|'));
  for (const list of [chainedRoads, chainedPaths, chainedRails, chainedTrams, chainedWater]) for (const w of list) { w.g = w.ll.map(tg); w.over = w.bridge ? overOf(w) : null; }

  // streets for the buildings' fronts (unclipped geometry)
  const streets = chainedRoads.filter(r => !r.crossing).map(r => r.g).concat(chainedPaths.filter(p => ['pavement', 'path', 'plaza'].includes(p.kind)).map(p => p.g));

  // point features (nodes), and area features (centroids) for landmarks, named places and shops
  const shopsAt = [];
  const features = [];
  for (const n of nodes) {
    const t = n.tags, p = tg(n.ll);
    const shop = T.shopOf(t); if (shop) shopsAt.push({ p, shop });
    if (t.natural === 'tree' && !T.landmarkKind(t)) { features.push({ kind: 'tree', p, tags: t, id: n.id }); continue; }
    const lm = T.landmarkKind(t); if (lm) features.push({ kind: lm, p, tags: t, id: n.id, node: true });
  }
  for (const a of areaFeatures) features.push({ kind: a.lm || 'place', p: ringCentroid(a.ll.map(tg)), tags: a.tags, id: a.id, area: true, foot: a.ll.map(tg) });
  for (const r of treeRows) { const g = geo(r), L = lineLength(g); for (let s = 4; s < L; s += 9) { let acc = 0; for (let i = 1; i < g.length; i++) { const sl = Math.hypot(g[i][0] - g[i - 1][0], g[i][1] - g[i - 1][1]); if (acc + sl >= s) { const k = (s - acc) / sl; features.push({ kind: 'tree', p: [g[i - 1][0] + (g[i][0] - g[i - 1][0]) * k, g[i - 1][1] + (g[i][1] - g[i - 1][1]) * k], tags: r.tags, id: r.id + '@' + s }); break; } acc += sl; } } }
  // de-duplicate a feature mapped twice (a church node and its building)
  const seen = [];
  const dedup = features.filter(f => { if (f.kind === 'tree') return true; const nm = f.tags.name || ''; const dup = seen.find(s => s.kind === f.kind && (s.name || '') === nm && Math.hypot(s.p[0] - f.p[0], s.p[1] - f.p[1]) < 80); if (dup) return false; seen.push({ kind: f.kind, name: nm, p: f.p }); return true; });

  // library landmarks matched by name (each used once, the best match)
  const landmarks = lib ? lib.filter(o => o.category === 'landmark') : [];
  const used = new Set();
  // the towns of this data (addr:city): a landmark object named for another town ('mcr-central-library') never stands in for a
  // local namesake (integration, 8 Oct: Nottingham's Central Library drew Manchester's)
  const cities = new Set();
  for (const e of nodes.concat(ways)) { const c = e.tags && (e.tags['addr:city'] || e.tags['is_in:city']); if (c) for (const w of T.nameTokens(c)) cities.add(w); }
  const TOWN_PREFIX = { mcr: 'manchester', ldn: 'london', bham: 'birmingham', sheff: 'sheffield', notts: 'nottingham' };
  const matchLandmark = (tags) => {
    const nm = tags.name; if (!nm || !landmarks.length) return null;
    const toks = T.nameTokens(nm), slug = T.slugOf(nm);
    if (!toks.length) return null;
    let best = null;
    for (const o of landmarks) {
      if (used.has(o.id)) continue;
      const place = (o.tags || []).find(t => /^place:/.test(t)), pslug = place ? place.split('/').pop() : '';
      const idToks = T.nameTokens(o.id.replace(/^landmark\./, '')), shared = toks.filter(w => idToks.includes(w)).length;
      let score = pslug && pslug === slug ? 2 : shared / toks.length >= 0.66 && shared >= Math.min(2, toks.length) ? shared / (toks.length + idToks.length - shared) : 0;
      if (score > 0 && cities.size && idToks.length > shared && !toks.includes(idToks[0])) {
        const town = TOWN_PREFIX[idToks[0]] || idToks[0];
        if (!cities.has(town) && !(o.tags || []).some(t => cities.has(t))) score = 0;
      }
      if (score > 0 && (!best || score > best.score)) best = { id: o.id, score };
    }
    return best ? best.id : null;
  };
  const genericFor = (kind, tags) => {
    if (kind === 'tree') { const id = T.treeObjectFor(tags); return has(id) ? id : has('tree.oak') ? 'tree.oak' : null; }
    const spec = T.SCENE_OSM_OBJECTS[kind]; if (!spec) return null;
    for (const o of spec.objs) {
      if (o.startsWith('tag:')) { const tag = o.slice(4), hit = lib && lib.find(x => x.category !== 'landmark' && (x.tags || []).includes(tag)); if (hit) return hit.id; }
      else if (has(o) && lib) return o;
    }
    return null;
  };

  /* ---- build the sections at a simplification factor k, keeping features nearer than dCut ---- */
  const build = (k, dCut) => {
    const surfaces = [], water = [], place = [], scatter = [], bOut = [], localMissing = [], ids = new Map();
    const idOf = (kind) => { const p = { pavement: 'pave', tramway: 'tram', platform: 'plat', cycleway: 'cycle' }[kind] || kind; const n = (ids.get(p) || 0) + 1; ids.set(p, n); return `${p}-${n}`; };
    const tol = (p) => k * 1.5 * Math.max(p[1], C.dMin) / C.f;
    const planes = (m = 0) => wedgePlanes({ dNear: 0.5, dFar: dCut, t: tWide, m });
    const local = { dropped: 0, near: 0 };
    // areas
    const areaList = areas.map(a => ({ a, ring: geo(a) })).map(({ a, ring }) => ({ a, poly: clipRing(ring, planes()) })).filter(x => x.poly.length >= 3);
    const areaOut = [];
    for (const { a, poly } of areaList) {
      const s = roundPts(simplify(poly, tol, true));
      if (s.length < 3 || tooSmall(screenBox(C, s))) { local.dropped++; continue; }
      const nearD = Math.min(...s.map(p => p[1]));
      areaOut.push({ order: T.AREA_ORDER[a.kind] || 3, near: nearD, layer: a.layer, e: { id: '', kind: a.kind, poly: ccw(s), src: 'osm' }, a, area: Math.abs(ringArea(s)) });
    }
    for (const p of platforms.filter(p => p.area)) { const poly = clipRing(geo(p), planes()); if (poly.length < 3) continue; const s = roundPts(simplify(poly, tol, true)); if (s.length >= 3 && !tooSmall(screenBox(C, s))) areaOut.push({ order: 8, near: Math.min(...s.map(q => q[1])), layer: p.layer, e: { id: '', kind: 'platform', poly: ccw(s), src: 'osm' }, a: p }); }
    // the same outline mapped twice (a way and a multipolygon, or two tags) is one surface
    const seenPoly = new Set();
    for (let i = areaOut.length - 1; i >= 0; i--) { const key = areaOut[i].e.kind + JSON.stringify(areaOut[i].e.poly); if (seenPoly.has(key)) areaOut.splice(i, 1); else seenPoly.add(key); }
    areaOut.sort((x, y) => x.order - y.order || x.layer - y.layer || y.near - x.near);
    for (const x of areaOut) { x.e.id = idOf(x.e.kind); surfaces.push(x.e); bump2(x.e.kind);
      if (x.e.kind === 'wood' || x.e.kind === 'heath') scatterFor(x, scatter); }
    // strips
    const strips = [];
    const stripOf = (w, kind, extra = {}) => {
      for (const run of clipLine(w.g, planes(w.width / 2 + 1))) {
        const s = roundPts(simplify(run, tol));
        if (s.length < 2 || tooSmall(screenBox(C, s, w.width / 2))) { local.dropped++; continue; }
        strips.push({ w, e: Object.assign({ id: '', kind, path: s, width: r1(w.width) }, extra, { src: 'osm' }), near: Math.min(...s.map(p => p[1])) });
      }
    };
    const rank = { track: 1, path: 2, towpath: 2, cycleway: 3, steps: 3, plaza: 4, pavement: 4, platform: 5, rail: 6, road: 7, tramway: 8, bridge: 9 };
    // an elevated way (a viaduct, or a long bridge over land) is NOT ground: painted as a surface it lies on the ground under the
    // arches (integration, 8 Oct: the Castlefield viaducts drew as rails across the towpath). It is left out and listed as a missing
    // viaduct unless a library landmark stands for it (matched by the bridge's own name elsewhere).
    const elevated = (w) => {
      if (!w.bridge) return false;
      const t = w.tags || {};
      if (t.bridge === 'viaduct' || (w.layer || 0) >= 2) return true;
      return w.over !== 'water' && lineLength(w.g) > 60;
    };
    const viaduct = new Set();
    const keepGround = (w) => { if (!elevated(w)) return true; if (clipLine(w.g, planes(4)).length) viaduct.add(w); return false; };
    // bridges (V2 3.1): a deck that carries a road or path over water, rail or road; rails and tram lines on bridges keep their kind + over
    for (const p of chainedPaths.filter(keepGround)) stripOf(p, p.bridge ? 'bridge' : p.kind, p.bridge ? { carries: 'path', over: p.over, walk: true, drive: p.kind === 'cycleway' || p.kind === 'path' ? ['bike'] : [] } : {});
    for (const p of platforms.filter(p => !p.area)) { p.g = geo(p); stripOf(p, 'platform'); }
    for (const r of chainedRails.filter(keepGround)) stripOf(r, 'rail', Object.assign({ tracks: Math.round(r.width / 3.5) }, r.bridge ? { over: r.over } : {}));
    const roadStrips = [];
    for (const r of chainedRoads.filter(keepGround)) {
      const before = strips.length;
      stripOf(r, r.bridge ? 'bridge' : 'road', r.crossing ? { markings: r.markings, crossing: true } : r.bridge ? { carries: 'road', over: r.over, walk: true, drive: ['car', 'bus', 'bike', 'tractor'] } : { markings: r.markings });
      for (let i = before; i < strips.length; i++) roadStrips.push(strips[i]);
    }
    for (const t of chainedTrams.filter(keepGround)) stripOf(t, 'tramway', Object.assign(t.embedded ? { embedded: true } : {}, t.bridge ? { over: t.over } : {}));
    strips.sort((x, y) => (rank[x.e.kind] || 5) - (rank[y.e.kind] || 5) + (x.e.crossing ? 20 : 0) - (y.e.crossing ? 20 : 0) || x.w.layer - y.w.layer || y.near - x.near);
    const pavements = [];
    for (const s of strips) {
      s.e.id = idOf(s.e.kind === 'road' && s.e.crossing ? 'xing' : s.e.kind);
      // a pavement shows when its road runs away from the camera (tall on screen) or is near (a 2 m strip is half a unit at 90 m)
      const sb = screenBox(C, s.e.path, s.e.width / 2), showsPave = sb[3] - sb[1] >= 6 || s.near <= 90;
      if (s.e.kind === 'road' && !s.e.crossing && showsPave) for (const side of sidesOf(s.w)) pavements.push({ id: `${s.e.id}-${side[0]}`, kind: 'pavement', beside: s.e.id, side, width: 2, kerb: 0.12, src: 'osm' });
    }
    const main = strips.filter(s => !s.e.crossing).map(s => s.e), xings = strips.filter(s => s.e.crossing).map(s => s.e);
    for (const e of main) { surfaces.push(e); bump2(e.kind); }
    for (const e of pavements) { surfaces.push(e); bump2('pavement'); }
    for (const e of xings) { surfaces.push(e); bump2('crossing'); }
    // water
    for (const w of waterAreas.filter(w => !w.drop)) {
      const poly = clipRing(geo(w), planes()); if (poly.length < 3) continue;
      const s = roundPts(simplify(poly, tol, true));
      if (s.length < 3 || tooSmall(screenBox(C, s))) { local.dropped++; continue; }
      const kind = w.kind === 'canal' ? 'lake' : w.kind;
      water.push(Object.assign({ id: idOf(w.kind === 'canal' ? 'basin' : kind), kind, poly: ccw(s) }, w.kind === 'canal' ? { base: T.CANAL_LOOK.base.slice(), mirror: T.CANAL_LOOK.mirror, ripple: T.CANAL_LOOK.ripple } : {}, { src: 'osm' }));
    }
    // a canal line that runs mostly inside a basin kept as its outline is drawn by that outline (a channel over it draws as a trench)
    const basinRings = waterAreas.filter(w => !w.drop && w.kind === 'canal').map(geo);
    for (const w of chainedWater) {
      if (w.kind === 'canal' && basinRings.length && w.g.filter(p => basinRings.some(r => pointInRing(p, r))).length >= 0.4 * w.g.length) continue;
      for (const run of clipLine(w.g, planes(w.width / 2 + 1))) {
        const s = roundPts(simplify(run, tol));
        if (s.length < 2 || tooSmall(screenBox(C, s, w.width / 2))) { local.dropped++; continue; }
        water.push({ id: idOf(w.kind), kind: w.kind, path: s, width: r1(w.width), edge: w.kind === 'canal' ? 'coping' : 'natural', src: 'osm' });
      }
    }
    if (coast.length) {
      const pts = coast.flatMap(c => clipLine(geo(c), planes()).flat());
      if (pts.length >= 2) { const ds = pts.map(p => p[1]).sort((a, b) => a - b), d0 = ds[Math.floor(ds.length / 2)]; water.push({ id: 'sea', kind: 'sea', band: [r1(d0), null], foam: 'shore', src: 'osm' }); }
    }
    for (const w of water) bump2('water:' + w.kind);
    // buildings (footprints for F), nearest first for the occlusion test, then written far to near
    const usedHere = new Set(), landmarkFoot = [];
    const pl = [];
    for (const f of dedup) {
      if (!inWedge(f.p, 0, dCut) || f.p[1] < C.dMin * 0.9) continue;
      if (f.kind === 'tree') { pl.push({ f, obj: genericFor('tree', f.tags), tree: true }); continue; }
      // a summit is a landmark seen from afar (its library art is the whole hill); standing on it, it is the ground (terrain)
      if (f.kind === 'peak' && Math.hypot(f.p[0], f.p[1]) < 1000) continue;
      if (f.foot && pointInRing([0, 0], f.foot)) continue;   // the camera stands inside it (a hill fort, a square, a park): not a view of it
      const lmId = matchLandmark(f.tags);
      if (lmId && !usedHere.has(lmId)) { usedHere.add(lmId); used.add(lmId); pl.push({ f, obj: lmId, landmark: true }); if (f.foot) landmarkFoot.push(f.foot); continue; }
      if (f.kind === 'place' || f.kind === 'peak') continue;   // named parks and squares only match library landmarks; peaks come from the terrain
      if (f.kind === 'station' && !f.node) continue;            // a station building: F's station style on its footprint
      const g = genericFor(f.kind, f.tags);
      if (g) pl.push({ f, obj: g });
      else { const spec = T.SCENE_OSM_OBJECTS[f.kind] || { what: f.kind, h: 8 }; const h = T.parseMetres(f.tags.height) || spec.h; if (!spec.gen) localMissing.push({ kind: f.kind, what: spec.what, d: Math.round(f.p[1]), h: Math.round(h), at: [r1(f.p[0]), r1(f.p[1])], name: f.tags.name || null, msg: `${spec.what}, ${Math.round(Math.hypot(f.p[0], f.p[1]))} m, ${Math.round(h)} m tall: no library object` }); }
    }
    used.clear();
    const bl = [];
    for (const b of buildings) {
      let ring = ccw(geo(b));
      if (landmarkFoot.some(fp => pointInRing(ringCentroid(ring), fp))) { bump('buildings-as-landmarks'); continue; }
      if (!clipRing(ring, planes(0)).length) continue;
      const c0 = ringCentroid(ring); if (c0[1] > dCut) continue;
      // a building the camera stands beside (any corner nearer than the bottom of the frame) would be a cut slab at the frame edge:
      // it is left out and reported; frame the view with a placement instead, or move the camera
      if (ring.some(p => p[1] < C.dMin * 0.9)) { const cx = ringCentroid(ring); if (Math.abs(cx[0]) < cx[1] * tWide * 1.5 + 30) local.near++; continue; }
      let tolB = 0.25 * Math.min(k, 3), s = roundPts(simplify(ring, tolB, true));
      while (s.length > 24 && tolB < 20) { tolB *= 1.6; s = roundPts(simplify(ring, tolB, true)); }
      if (s.length < 3) continue;
      const area = Math.abs(ringArea(s));
      if (area < 6) continue;
      const tags = Object.assign({}, b.tags);
      const hp = parts.filter(p => pointInRing(ringCentroid(geo(p)), s)).map(p => T.parseMetres(p.tags.height) || (T.parseMetres(p.tags['building:levels']) * 3 || 0));
      const H = T.buildingHeight(tags, area); if (hp.length && Math.max(...hp) > H.h) { H.h = r1(Math.max(...hp)); H.storeys = Math.max(1, Math.round((H.h - H.roofH) / 3)); }
      const shopNode = shopsAt.find(x => pointInRing(x.p, s));
      const shop = T.shopOf(tags) || (shopNode ? shopNode.shop : null);
      const style = T.buildingStyle(tags, { lat: C.lat, lon: C.lon, areaM2: area, shop: !!shop });
      const e = { foot: ccw(s), h: H.h, storeys: H.storeys, roof: H.roof, style, seed: fnv(b.id) % 9973 + 1, front: frontOf(ccw(s), streets) };
      if (shop) e.shop = shop;
      e.osm = b.id.replace(/-\d+$/, '');
      e.src = 'osm';
      bl.push({ e, near: Math.min(...s.map(p => p[1])), c: ringCentroid(s) });
    }
    // occlusion: process near to far; a building hidden behind nearer ones on every column it covers is dropped
    bl.sort((a, b) => a.near - b.near);
    const COLS = 200, top = new Float32Array(COLS).fill(Infinity), colOf = (X) => Math.max(0, Math.min(COLS - 1, Math.floor((X + 160) / 1920 * COLS)));
    let hidden = 0;
    for (const b of bl) {
      const pr = b.e.foot.filter(p => p[1] > 0.5).map(p => ({ X: C.x0 + C.f * p[0] / p[1], Yt: C.horizon + C.f * (C.eye - b.e.h) / p[1] }));
      if (!pr.length) continue;
      const X0 = Math.min(...pr.map(q => q.X)), X1 = Math.max(...pr.map(q => q.X)), hiTop = Math.min(...pr.map(q => q.Yt)), loTop = Math.max(...pr.map(q => q.Yt));
      if (X1 < -160 || X0 > 1760) { b.hidden = true; hidden++; continue; }
      let visible = false;
      for (let c = colOf(X0); c <= colOf(X1); c++) if (hiTop < top[c] - 0.5) { visible = true; break; }
      if (!visible) { b.hidden = true; hidden++; continue; }
      for (let c = colOf(X0) + 1; c < colOf(X1); c++) top[c] = Math.min(top[c], loTop);
    }
    const kept = bl.filter(b => !b.hidden).slice(0, opts.maxBuildings || OSM_DEFAULTS.maxBuildings);
    // each kept building's screen cover (columns and the lowest roof row), for hiding the trees behind it
    const covers = kept.map(b => { const pr = b.e.foot.filter(p => p[1] > 0.5).map(p => ({ X: C.x0 + C.f * p[0] / p[1], Yt: C.horizon + C.f * (C.eye - b.e.h) / p[1] })); return { near: b.near, X0: Math.min(...pr.map(q => q.X)), X1: Math.max(...pr.map(q => q.X)), top: Math.max(...pr.map(q => q.Yt)) }; });
    const treeHidden = (p) => { const X = C.x0 + C.f * p[0] / p[1], half = C.f * 4 / p[1], top = C.horizon + C.f * (C.eye - 14) / p[1]; return covers.some(c => c.near < p[1] - 3 && c.X0 <= X - half && c.X1 >= X + half && c.top <= top); };
    kept.sort((a, b) => b.c[1] - a.c[1] || a.c[0] - b.c[0]);
    for (const b of kept) bOut.push(b.e);
    // placements: landmarks and generics first (fix: never snapped), then trees (nearest first, capped)
    const roadLines = chainedRoads.filter(r => !r.crossing && !r.bridge);
    const onRoad = (p) => { let best = null; for (const r of roadLines) { const q = nearestOnLine(p, r.g); const off = q.m - r.width / 2; if (!best || off < best) best = off; } return best == null ? Infinity : best; };
    const trees = [];
    const greenAreas = areas.filter(a => ['grass', 'lawn', 'park', 'garden', 'meadow', 'heath', 'wood', 'field', 'verge', 'bank'].includes(a.kind)).map(geo);
    for (const x of pl.filter(x => x.tree && x.obj).sort((a, b) => a.f.p[1] - b.f.p[1])) {
      if (treeHidden(x.f.p)) { local.treesHidden = (local.treesHidden || 0) + 1; continue; }
      const off = onRoad(x.f.p);
      if (off < -0.5) { bump('treesOnRoad'); continue; }                        // in the carriageway: a mapping slip, not drawn
      if (off < 2.2 && sidesOf(roadLines.find(r => nearestOnLine(x.f.p, r.g).m - r.width / 2 === off) || { tags: {} }).length) x.pit = true;   // a street tree in the pavement
      // a mapped tree outside every green area stands in a square, a yard or a car park: in a pit (integration, 8 Oct: Old Market
      // Square's trees were refused on the plaza and the plot)
      else if (!greenAreas.some(r => pointInRing(x.f.p, r))) x.pit = true;
      trees.push(x);
      if (trees.length >= (opts.maxTrees || OSM_DEFAULTS.maxTrees)) break;
    }
    // the per-frame budget (V2 25): only the nearest trees sway (at most 30, within 80 m); the rest are baked still
    trees.forEach((x, i) => { if (i >= (opts.maxSway != null ? opts.maxSway : 30) || x.f.p[1] > 80) x.still = true; });
    for (const x of pl.filter(x => !x.tree && x.obj).concat(trees)) {
      const e = { obj: x.obj, at: [r1(x.f.p[0]), r1(x.f.p[1])] };
      if (x.landmark) e.fix = true;
      if (x.pit) e.pit = true;
      if (x.still) e.anim = false;
      if (!x.tree) e.osm = x.f.id;
      const hTag = T.parseMetres(x.f.tags.height), rh = realOf(x.obj);
      if (hTag > 0 && rh > 0) e.k = Math.round(Math.max(0.6, Math.min(1.6, hTag / rh)) * 100) / 100;
      e.src = 'osm';
      place.push(e); bump2(x.landmark ? 'landmark' : x.tree ? 'tree' : 'object');
    }
    // bridges over water: a structure placement spanning the water (17.5), when the library has one
    const bridgeObj = ['structure.bridge-brick', 'structure.bridge-arch'].find(id => lib && has(id));
    for (const s of strips.filter(s => s.e.kind === 'bridge' && s.e.over === 'water')) {
      const g = s.e.path, mid = g[Math.floor(g.length / 2)];
      if (!inWedge(mid, 0, dCut)) continue;
      // a footbridge (a deck that carries only a path) is not a brick road arch: listed for the object backlog instead
      // (integration, 8 Oct: Merchant's Bridge, a curved steel footbridge, drew as a massive arch)
      if (s.e.carries === 'path') { localMissing.push({ kind: 'footbridge', what: 'a footbridge over water', d: Math.round(mid[1]), h: 4, at: mid, name: (s.w.tags && s.w.tags.name) || null, msg: `a footbridge over water, ${Math.round(Math.hypot(mid[0], mid[1]))} m: no library footbridge (the deck is drawn as a bridge surface)` }); continue; }
      if (bridgeObj) {
        // sized to its real span (integration, 8 Oct): a 12 m footbridge over a canal is not a road arch at full size
        const e = { obj: bridgeObj, at: [mid[0], mid[1]], over: 'water', src: 'osm' };
        const o = lib.find(x => x.id === bridgeObj), rh = realOf(bridgeObj);
        let span = 0; for (let i = 1; i < g.length; i++) span += Math.hypot(g[i][0] - g[i - 1][0], g[i][1] - g[i - 1][1]);
        if (o && Array.isArray(o.size) && o.size[1] > 0 && rh > 0 && span > 0) {
          const realL = rh * o.size[0] / o.size[1];
          e.k = Math.round(Math.max(0.3, Math.min(1.6, span / realL)) * 100) / 100;
        }
        place.push(e); bump2('bridge');
      }
      else localMissing.push({ kind: 'bridge', what: 'a bridge over water', d: Math.round(mid[1]), h: 6, at: mid, name: null, msg: `a bridge over water, ${Math.round(Math.hypot(mid[0], mid[1]))} m: no library object` });
    }
    for (const w of viaduct) {
      const run = clipLine(w.g, planes(4))[0], mid = run[Math.floor(run.length / 2)];
      const what = w.kind === 'rail' || w.kind === 'tramway' ? 'a railway viaduct' : 'an elevated road or path';
      localMissing.push({ kind: 'viaduct', what, d: Math.round(mid[1]), h: 10, at: [r1(mid[0]), r1(mid[1])], name: (w.tags && w.tags.name) || null, msg: `${what}, ${Math.round(Math.hypot(mid[0], mid[1]))} m: elevated, not drawn as ground (place a library viaduct or bridge landmark there)` });
    }
    return { surfaces, water, buildings: bOut, place, scatter, missing: localMissing, dropped: local.dropped, hidden, near: local.near, treesHidden: local.treesHidden || 0 };
  };
  const counts2 = {};
  const bump2 = (k) => { counts2[k] = (counts2[k] || 0) + 1; };
  const scatterFor = (x, out) => {
    const nearD = Math.max(C.dMin, Math.min(...x.e.poly.map(p => p[1]))), farD = Math.max(...x.e.poly.map(p => p[1]));
    if (x.e.kind === 'wood') {
      const lt = x.a.tree || 'mixed';
      const mix0 = lt === 'needleleaved' ? { 'tree.pine': 3, 'tree.birch': 1 } : lt === 'broadleaved' ? { 'tree.oak': 2, 'tree.birch': 1, 'tree.alder': 1 } : { 'tree.oak': 2, 'tree.pine': 1, 'tree.birch': 1 };
      const mix = Object.fromEntries(Object.entries(mix0).filter(([id]) => has(id)));
      if (!Object.keys(mix).length) return;
      const n = Math.max(3, Math.min(40, Math.round(x.area / 150)));
      // a wood beyond 80 m is baked still (its sway would cost a draw per tree every frame and barely shows)
      out.push(Object.assign({ obj: mix, on: x.e.id, d: [r1(nearD), r1(Math.min(farD, range))], n, dist: 'ground', cluster: { centres: Math.max(2, Math.round(n / 8)), spread: 12 }, gap: 'foot', seed: fnv(x.a.id) % 97 + 1 }, nearD > 80 ? { anim: false } : {}, { src: 'osm' }));
    } else if (x.e.kind === 'heath') {
      if (nearD >= 140) return;   // heather and gorse are ground cover: beyond 150 m the surface's own texture carries it
      const mix = Object.fromEntries(Object.entries({ 'plant.heather': 3, 'plant.gorse': 1 }).filter(([id]) => has(id)));
      if (!Object.keys(mix).length) return;
      out.push({ obj: mix, on: x.e.id, d: [r1(nearD), r1(Math.min(farD, 150))], n: Math.max(10, Math.min(200, Math.round(x.area / 40))), dist: 'screen', cluster: { centres: 6, spread: 6 }, gap: 'foot', seed: fnv(x.a.id) % 97 + 1, anim: 'strip', src: 'osm' });
    }
  };

  // the budget (16.1): raise the tolerance and drop far features first until the sections fit
  const budget = +opts.budget || OSM_DEFAULTS.budget;
  let k = 1, dCut = range, out = null, bytes = 0, rounds = 0;
  for (; rounds < 10; rounds++) {
    for (const key of Object.keys(counts2)) delete counts2[key];
    out = build(k, dCut);
    bytes = JSON.stringify({ surfaces: out.surfaces, water: out.water, buildings: out.buildings, place: out.place, scatter: out.scatter }).length;
    if (bytes <= budget) break;
    k *= 1.6; dCut = Math.max(C.dMin * 4, dCut * 0.82);
  }
  if (rounds) problems.push({ rule: 'budget', sev: bytes > budget ? 'warn' : 'info', msg: `simplified ${rounds} time(s) to fit ${budget} bytes: tolerance x${r1(k)}, features beyond ${Math.round(dCut)} m dropped`, fix: bytes > budget ? 'use a smaller --range or a narrower --fov' : '' });
  const rest = { id: 'land', kind: restKind, rest: true, src: 'osm' };
  const surfaces = [rest].concat(out.surfaces);
  Object.assign(counts, counts2, { buildings: out.buildings.length, hiddenBuildings: out.hidden, hiddenTrees: out.treesHidden, droppedSmall: out.dropped, missing: out.missing.length });
  for (const m of out.missing) problems.push({ rule: 'missing', sev: 'info', msg: m.msg, at: m.at });
  if (counts.rillsLeftOut) problems.push({ rule: 'rills', sev: 'info', msg: `${counts.rillsLeftOut} rill(s) or drain(s) under 1 m wide left out` });
  if (out.near) problems.push({ rule: 'near', sev: 'info', msg: `${out.near} building(s) beside the camera (nearer than the bottom of the frame, ${r1(C.dMin)} m) left out`, fix: 'move the camera a few metres, or frame the view with a placement' });
  const unsigned = out.buildings.filter(b => b.shop && b.shop.sign === false).length;
  if (unsigned) problems.push({ rule: 'brand', sev: 'info', msg: `${unsigned} shop(s) get no sign (branded, or no generic word)` });
  // named features in view: the report and meta.site suggestions (never drawn)
  for (const f of dedup) if (f.tags.name && inWedge(f.p, 0, range)) named.push({ name: f.tags.name, what: f.kind, d: Math.round(Math.hypot(f.p[0], f.p[1])), x: r1(f.p[0]) });
  for (const w of chainedRoads.concat(chainedWater)) { const nm = w.tags.name; if (!nm) continue; const near = w.g.filter(p => inWedge(p)).sort((a, b) => a[1] - b[1])[0]; if (near) named.push({ name: nm, what: w.kind, d: Math.round(Math.hypot(near[0], near[1])), x: r1(near[0]) }); }
  const namedU = []; for (const n of named.sort((a, b) => a.d - b.d)) if (!namedU.some(m => m.name === n.name)) namedU.push(n);
  const sections = { surfaces, water: out.water, buildings: out.buildings, place: out.place, scatter: out.scatter };
  const source = { osm: { fetched: opts.fetched || null, bbox: opts.bbox || null, hash: opts.hash || null } };
  return {
    sections, source,
    camera: { eye: C.eye, fov: C.fov, horizon: C.horizon, heading: C.heading, lat: C.lat, lon: C.lon },
    report: { urban, counts, bytes, budget, rounds, range, dCut: Math.round(dCut), named: namedU.slice(0, 20), missing: out.missing, problems, site: namedU.slice(0, 3).map(n => n.name) },
  };
}

/** The footprint edge that faces the nearest street (17.4: where the door goes); without a street in 60 m, the edge facing the camera. */
function frontOf(ring, streets) {
  let best = -1, bm = Infinity, cam = -1, cm = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1) continue;
    const n = [dy / L, -dx / L], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const tc = -(n[0] * m[0] + n[1] * m[1]) / Math.hypot(m[0], m[1]); if (tc > cm) { cm = tc; cam = i; }
    for (const s of streets) {
      const r = nearestOnLine(m, s); if (r.m > 60 || r.m >= bm) continue;
      if ((r.q[0] - m[0]) * n[0] + (r.q[1] - m[1]) * n[1] > 0) { bm = r.m; best = i; }
    }
  }
  return best >= 0 ? best : Math.max(0, cam);
}

/* ---------------------------------------------------------------------------------------------
   Re-import (--into): replace only unedited imported entries; keep hand entries and hand edits
   --------------------------------------------------------------------------------------------- */
const SECTIONS = ['surfaces', 'water', 'buildings', 'place', 'scatter'];
/**
 * scene: the recipe's scene object (not modified). imported: osmProject's result.
 * An entry with src 'osm' whose hash is in scene.source.osm.own is an untouched import: it is REPLACED. One with src 'osm' that no
 * longer matches its recorded hash was edited by hand: it becomes src 'osm*' and is kept. Entries without src, or 'osm*', are kept.
 * An imported surface or water id that a kept entry already uses is skipped (the hand version wins).
 */
export function osmMerge(scene, imported) {
  const s = JSON.parse(JSON.stringify(scene || {}));
  const own = new Set(((s.source || {}).osm || {}).own || []);
  const stats = { kept: 0, replaced: 0, edited: 0, skipped: 0, added: 0 };
  const newOwn = [];
  for (const sec of SECTIONS) {
    const old = Array.isArray(s[sec]) ? s[sec] : [];
    const kept = [];
    for (const e of old) {
      if (e && e.src === 'osm') {
        if (own.has(entryHash(sec, e))) { stats.replaced++; continue; }
        kept.push(Object.assign({}, e, { src: 'osm*' })); stats.edited++;
      } else { kept.push(e); stats.kept++; }
    }
    const keptIds = new Set(kept.filter(e => e && e.id).map(e => e.id));
    const keptRest = kept.some(e => e && e.rest);
    const inc = (imported.sections[sec] || []).filter(e => {
      if (e.id && keptIds.has(e.id)) { stats.skipped++; return false; }
      if (e.rest && keptRest) { stats.skipped++; return false; }
      return true;
    });
    for (const e of inc) newOwn.push(entryHash(sec, e));
    stats.added += inc.length;
    if (sec === 'surfaces') {
      const rest = kept.filter(e => e && e.rest).concat(inc.filter(e => e.rest)).slice(0, 1);
      s[sec] = rest.concat(inc.filter(e => !e.rest), kept.filter(e => !(e && e.rest)));
    } else if (sec === 'place') s[sec] = kept.concat(inc);
    else s[sec] = inc.concat(kept);
    if (!s[sec].length && !(sec in (scene || {}))) delete s[sec];
  }
  s.source = Object.assign({}, s.source || {}, { osm: Object.assign({}, imported.source.osm, { own: newOwn }) });
  return { scene: s, stats };
}

/* ---------------------------------------------------------------------------------------------
   No heading given: what lies in each of the 8 compass directions
   --------------------------------------------------------------------------------------------- */
export function osmHeadings(data, { lat, lon, range = 700 } = {}) {
  const { nodes, ways, rels } = osmElements(data);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((n, i) => ({ heading: i * 45, name: n, features: [] }));
  const push = (tags, ll, weight) => {
    if (!tags.name) return;
    const d = haversine(lat, lon, ll[0], ll[1]); if (d > range || d < 5) return;
    const y = Math.sin((ll[1] - lon) * RAD) * Math.cos(ll[0] * RAD), x = Math.cos(lat * RAD) * Math.sin(ll[0] * RAD) - Math.sin(lat * RAD) * Math.cos(ll[0] * RAD) * Math.cos((ll[1] - lon) * RAD);
    const brg = (Math.atan2(y, x) / RAD + 360) % 360, dir = dirs[Math.round(brg / 45) % 8];
    if (!dir.features.some(f => f.name === tags.name)) dir.features.push({ name: tags.name, what: T.landmarkKind(tags) || tags.leisure || tags.waterway || tags.highway || tags.natural || tags.amenity || tags.building || 'feature', d: Math.round(d), w: weight });
  };
  for (const n of nodes) push(n.tags, n.ll, T.landmarkKind(n.tags) ? 3 : 1);
  for (const w of ways) { const c = w.pts[Math.floor(w.pts.length / 2)]; push(w.tags, c, T.landmarkKind(w.tags) ? 3 : w.tags.waterway || w.tags.leisure ? 2 : 1); }
  for (const r of rels) push(r.tags, r.rings[0][0], 2);
  for (const d of dirs) d.features = d.features.sort((a, b) => b.w - a.w || a.d - b.d).slice(0, 6).map(({ w, ...f }) => f);
  return dirs;
}

/* ---------------------------------------------------------------------------------------------
   A v1 preview of an import: screen polygons per depth band, buildings as lit prisms, ridges as hills
   --------------------------------------------------------------------------------------------- */
const PREVIEW_BANDS = [{ id: 'horizon', d: [800, 1e9] }, { id: 'far', d: [200, 800] }, { id: 'mid', d: [50, 200] }, { id: 'near', d: [15, 50] }, { id: 'fore', d: [0, 15] }];
const KIND_COL = { grass: ['#7f9a52', '#5d7a3a'], park: ['#7fa052', '#5a7d38'], lawn: ['#86a858', '#628a3e'], garden: ['#7a9450', '#5b7438'], meadow: ['#93a05a', '#6f7d40'], field: ['#a8a060', '#8a8448'],
  heath: ['#8a7a5a', '#6d5f44'], wood: ['#4f6a3a', '#3c5430'], plot: ['#9a958a', '#7d786e'], road: ['#6a6b6e', '#4e4f52'], pavement: ['#a9a6a0', '#8f8c86'], plaza: ['#b2aca0', '#948e82'],
  path: ['#b09a72', '#94805c'], towpath: ['#a8946c', '#8c7a56'], track: ['#9a8660', '#7e6c4c'], cycleway: ['#9a5a4e', '#7e463c'], steps: ['#a6a29a', '#8a867e'], rail: ['#7a6e62', '#5e544a'],
  tramway: ['#66676a', '#4c4d50'], platform: ['#b4aea2', '#989286'], parking: ['#707174', '#55565a'], bridge: ['#8e8a84', '#74706a'], beach: ['#d6c59a', '#c2ae80'], sand: ['#d6c59a', '#c2ae80'],
  shingle: ['#a8a296', '#8c8678'], rock: ['#8a8680', '#6e6a64'], mud: ['#6e6250', '#564c3e'], reedbed: ['#8a8a50', '#6e6e3c'], bank: ['#7a8a4a', '#5e6e38'], verge: ['#7f9a52', '#5d7a3a'], edge: ['#b0aaa0', '#908a80'] };
const STYLE_COL = { 'victorian-terrace': '#9a5a44', georgian: '#b8a488', edwardian: '#a2604a', '1930s-semi': '#d8cfc0', 'interwar-shops': '#a86e52', mill: '#8e4a36', 'norfolk-flint': '#8a8a84', 'stone-cottage': '#b2a07e', 'modern-glass': '#7f97a8', brutalist: '#a09c94', station: '#9a6448' };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
/** The left and right edges of a strip (a mitred offset of its centreline). */
export function stripEdges(path, width) {
  const L = [], R = [], h = width / 2;
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    const nx = -dy / n, ny = dx / n;   // left of the direction of travel
    L.push([path[i][0] + nx * h, path[i][1] + ny * h]); R.push([path[i][0] - nx * h, path[i][1] - ny * h]);
  }
  return { L, R };
}
export function osmPreviewScene(rec, { id = 'osm-preview', season = 'auto', at = 'golden', realOf = () => null, sizeOf = () => null } = {}) {
  const cam = osmCamera(rec.camera), ground = [], water = [], place = [];
  const pathD = (pts) => 'M' + pts.map(p => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`).join(' L') + ' Z';
  const scr = (pts, h = 0) => pts.map(p => proj(cam, p, h));
  const bandOfD = (d) => PREVIEW_BANDS.findIndex(b => d >= b.d[0] && d < b.d[1]);
  const fillOf = (kind, d0, d1) => { const c = KIND_COL[kind] || KIND_COL.grass; return { lin: [[0, c[0]], [1, c[1]]], y1: Math.round(proj(cam, [0, Math.max(d1, cam.dMin)])[1]), y2: Math.round(proj(cam, [0, Math.max(d0, cam.dMin * 0.9)])[1]) }; };
  const planesFor = (b) => wedgePlanes({ dNear: Math.max(0.5, b.d[0], cam.dMin * 0.9), dFar: Math.min(b.d[1], 20000), t: cam.t * 1.25, m: 0 });
  const emitPoly = (poly, kind, list = ground, extra = null) => PREVIEW_BANDS.forEach((b, i) => {
    const c = clipRing(poly, planesFor(b)); if (c.length < 3) return;
    const s = scr(c), e = { layer: b.id, d: pathD(s) };
    if (extra) { const ys = s.map(p => p[1]); Object.assign(e, extra, { y0: Math.round(Math.min(...ys)), y1: Math.round(Math.max(...ys)) }); } else e.fill = fillOf(kind, b.d[0], Math.min(b.d[1], 2000));
    list.push(e);
  });
  // the terrain ridges: hills behind everything, far bands first
  const T0 = rec.terrain;
  if (T0 && Array.isArray(T0.ridges)) {
    const cols = { horizon: ['#9aa7b4', '#8d9aa6'], far: ['#7f8f84', '#6e7e72'], mid: ['#6f7f58', '#5f6f4a'] };
    for (const r of T0.ridges.slice().sort((a, b) => b.d - a.d)) {
      const pts = r.pts; if (!pts || pts.length < 2) continue;
      const base = Math.max(cam.horizon + 4, ...pts.map(p => p[1])) + 2;
      const c = r.d > 6000 ? cols.horizon : r.d > 2000 ? cols.far : cols.mid;
      ground.push({ layer: 'horizon', d: 'M' + pts.map(p => `${p[0]} ${p[1]}`).join(' L') + ` L${pts[pts.length - 1][0]} ${base} L${pts[0][0]} ${base} Z`, fill: { lin: [[0, c[0]], [1, c[1]]], y1: Math.round(Math.min(...pts.map(p => p[1]))), y2: Math.round(base) } });
    }
  }
  // the rest: one band-cut rectangle of the rest kind under everything
  const surfaces = rec.surfaces || [], restS = surfaces.find(s => s.rest), byId = new Map(surfaces.map(s => [s.id, s]));
  const big = 3000;
  emitPoly([[-big, 0.5], [big, 0.5], [big, 20000], [-big, 20000]], restS ? restS.kind : 'grass');
  const stripPoly = (path, width) => { const { L, R } = stripEdges(path, width); return L.concat(R.reverse()); };
  const edgesOf = new Map();
  for (const s of surfaces) {
    if (s.rest) continue;
    let poly = null;
    if (s.poly) poly = s.poly;
    else if (s.path) { poly = stripPoly(s.path, s.width || 3); edgesOf.set(s.id, stripEdges(s.path, s.width || 3)); }
    else if (s.beside && byId.has(s.beside) && byId.get(s.beside).path) {
      const p = byId.get(s.beside), off = (p.width || 6) / 2 + (s.gap || 0) + s.width / 2, { L, R } = stripEdges(p.path, off * 2);
      const centre = s.side === 'left' ? L : R; poly = stripPoly(centre, s.width);
    } else if (s.band) { const b1 = s.band[1] == null ? 20000 : Math.min(20000, s.band[1]); poly = [[-big, s.band[0]], [big, s.band[0]], [big, b1], [-big, b1]]; }
    if (poly) emitPoly(poly, s.kind);
  }
  for (const w of rec.water || []) {
    const poly = w.poly || (w.path ? stripPoly(w.path, w.width || 8) : w.band ? [[-big, w.band[0]], [big, w.band[0]], [big, 20000], [-big, 20000]] : null);
    if (!poly) continue;
    const base = w.base || (w.kind === 'canal' ? ['#4a5a48', '#3a4a3e', '#2a362e'] : w.kind === 'river' ? ['#5a7480', '#3f5e6a', '#2d4652'] : ['#6a8a9a', '#446a7c', '#2a4a5a']);
    emitPoly(poly, w.kind, water, { base, reflect: true, shimmer: 18, lightPath: true });
  }
  // buildings: the walls that face the camera and a roof cap, far to near, in the band of their nearest corner
  const sun = [-0.6, 0.8];
  const bl = (rec.buildings || []).map(b => ({ b, near: Math.min(...b.foot.map(p => p[1])) })).sort((a, b) => b.near - a.near);
  for (const { b, near } of bl) {
    const band = PREVIEW_BANDS[Math.max(0, bandOfD(near))].id, col = STYLE_COL[b.style] || '#9a6a52', ring = b.foot;
    const walls = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length], dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1, n = [dy / L, -dx / L], m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (n[0] * -m[0] + n[1] * -m[1] <= 0 || a[1] < 0.6 || c[1] < 0.6) continue;
      walls.push({ a, c, n, dist: Math.hypot(m[0], m[1]) });
    }
    walls.sort((p, q) => q.dist - p.dist);
    for (const w of walls) {
      const lit = 0.72 + 0.28 * Math.max(0, -(w.n[0] * sun[0] + w.n[1] * sun[1]));
      const q = [proj(cam, w.a), proj(cam, w.c), proj(cam, w.c, b.h), proj(cam, w.a, b.h)];
      ground.push({ layer: band, d: pathD(q), fill: shade(col, lit) });
      // windows: storeys x bays, laid out on the wall plane
      const L = Math.hypot(w.c[0] - w.a[0], w.c[1] - w.a[1]), bays = Math.floor(L / 3.2), wh = (q[0][1] - q[3][1]) / Math.max(1, b.storeys + 0.6);
      if (bays < 1 || wh < 5) continue;
      for (let s = 0; s < b.storeys; s++) for (let j = 0; j < bays; j++) {
        const u0 = (j + 0.3) / bays, u1 = (j + 0.7) / bays, h0 = s * 3 + 0.9, h1 = s * 3 + 2.3;
        const P = (u, h) => proj(cam, [w.a[0] + (w.c[0] - w.a[0]) * u, w.a[1] + (w.c[1] - w.a[1]) * u], h);
        ground.push({ layer: band, d: pathD([P(u0, h0), P(u1, h0), P(u1, h1), P(u0, h1)]), fill: shade(col, lit * 0.45) });
      }
    }
    if (b.roof !== 'flat') {
      const tops = ring.filter(p => p[1] > 0.6).map(p => proj(cam, p, b.h));
      if (tops.length >= 3) { const xs = tops.map(p => p[0]), yTop = Math.min(...tops.map(p => p[1])), x0 = Math.min(...xs), x1 = Math.max(...xs), rh = Math.max(2, cam.f * (b.h * 0.25) / Math.max(near, 1) * 0.6);
        ground.push({ layer: band, d: pathD([[x0, yTop + 1], [x1, yTop + 1], [x1 - (x1 - x0) * 0.12, yTop - rh], [x0 + (x1 - x0) * 0.12, yTop - rh]]), fill: shade('#5a4a48', 1) }); }
    }
  }
  // placements: real size from the depth (realOf, else the landmark table, else 15 m trees)
  for (const p of rec.place || []) {
    if (!p.at) continue;
    const [x, d] = p.at; if (d < cam.dMin * 0.9) continue;
    const sz = sizeOf(p.obj); if (!sz) continue;
    const H = (realOf(p.obj) || (/^tree\./.test(p.obj) ? 15 : /^landmark\./.test(p.obj) ? 18 : 4)) * (p.k || 1);
    const [X, Y] = proj(cam, [x, d]), s = cam.f * H / d / sz[1];
    if (X < -400 || X > 2000) continue;
    place.push({ obj: p.obj, x: Math.round(X), y: Math.round(Y), s: Math.round(s * 1000) / 1000, layer: PREVIEW_BANDS[Math.max(0, bandOfD(d))].id });
  }
  return { v: 1, id, view: { lat: cam.lat, lon: cam.lon, heading: cam.heading, fov: cam.fov, horizon: cam.horizon, lift: 1 }, at, season, setting: 'mixed',
    layers: PREVIEW_BANDS.map((b, i) => ({ id: b.id, depth: [0.08, 0.2, 0.45, 0.75, 1][i], haze: [0.3, 0.16, 0.06, 0.02, 0][i] })),
    ground, water, place, particles: 'none', weather: 'none' };
}
