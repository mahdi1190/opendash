// scene migrate: a v1 composed scene to a v2 recipe (docs/dev/SCENE_ENGINE_V2.md 16.4; builder D). Node >= 20, no dependencies.
//
//   node tools/anim-pack.mjs scene migrate <ref>[,...] | --pack <id> [--dry-run] [--report] [--keep-pixels] [--out dir] [--force] [--json]
//
// 1. Compile the v1 scene and INFER its camera: the horizon from the view, the eye fitted to the depth ladder (eye = 1.72 x (900 -
//    horizon) / 132), the fov from the view (tools/lib/scene-sanity.mjs inferCamera).
// 2. Ground fills become polygon SURFACES (unprojected with that camera; the kind from the palette slot, SLOT_KINDS; an unknown slot
//    becomes grass, with a note). A fill that rises above the horizon (hills, the skyline band) stays a pixel ground entry. v1 water
//    becomes v2 water: a lake polygon, or a CANAL (a fitted centreline and width) when it is long and narrow in perspective (over
//    6 : 1 after unprojection), or the sea when it reaches the horizon across the frame.
// 3. Placements with their anchor more than 2 units below the horizon become GROUND placements: at: [x, d] and k = the placement's
//    scale over the scale of its depth (so it keeps its look; the scale rule then judges k). On or above the horizon they stay pixel
//    placements with pin: true (the skyline backdrop). Objects without a known real size stay pixel placements (listed). Scatter rules
//    become dist: 'screen' ground rules over the unprojected area (x and d ranges, n, the seed and the mix kept); actors get ground
//    paths (and speedM, metres a second, beside their v1 speed).
// 4. The sanity lint runs on the v1 scene (and on the migrated one when A's v2 compile is loaded: the snapped and refused
//    placements), and the recipe is written (src/app/71-scene-<pack>-r-<id>.js; it supersedes the v1 item, V2 14.3) with meta copied.
//    The report lists every snapped and refused placement, every vehicle that stood on grass, every water region that became a canal
//    and the scale ratios. The tool never "fixes" by guessing a surface: a refused placement stays out until a person decides.
// --dry-run prints the report and writes nothing; --report also writes <out>/migrate-<pack>.json (out: .anim-ref/migrate).
//
// Pure parts, exported for tests: migrateScene(data, C, { E, cam, keepPixels }) -> { rec, report }, unprojectPoly, fitChannel.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inferCamera, pathPolys, slotKind, slotOfPaint, sanityRules, sanitySummary } from '../scene-sanity.mjs';

/** The core's sceneHash (FNV-1a), so a placement keeps the seed the v1 compile gave it (its variant phase, its lit windows). */
const hash = (str) => { let h = 2166136261; const t = String(str); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
const KIND_OF = { drive: 'road', 'walk-hard': 'pavement', walk: 'path', soft: 'grass', beach: 'beach', rail: 'rail' };
const V2_LAYERS = ['horizon', 'far', 'mid', 'near', 'fore', 'front'];

/** Clip a screen polygon to the rows below yMin (Sutherland-Hodgman against one horizontal line). */
function clipBelow(poly, yMin) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ina = a[1] >= yMin, inb = b[1] >= yMin;
    if (ina) out.push(a);
    if (ina !== inb) { const t = (yMin - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yMin]); }
  }
  return out;
}
/** Douglas-Peucker in ground metres, the tolerance growing with depth (2 % of d, at least 0.2 m). */
function simplify(pts) {
  if (pts.length <= 4) return pts;
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(), A = pts[a], B = pts[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = 0;
    for (let i = a + 1; i < b; i++) { const P = pts[i], dist = Math.abs(dy * P[0] - dx * P[1] + B[0] * A[1] - B[1] * A[0]) / L, tol = Math.max(0.2, 0.02 * P[1]); if (dist / tol > bd) { bd = dist / tol; best = i; } }
    if (bd > 1) { keep[best] = true; st.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/** A screen polygon to ground metres [[x, d], ...] (clipped 2 units below the horizon), simplified. null when nothing is left. */
export function unprojectPoly(poly, cam) {
  const c = clipBelow(poly.map(p => [p[0], Math.min(900, p[1])]), cam.horizon + 2);
  if (c.length < 3) return null;
  const g = c.map(([X, Y]) => { const d = cam.f * cam.eye / (Y - cam.horizon); return [r1((X - cam.x0) * d / cam.f), r1(d)]; });
  // an open ring (no repeated closing point), then Douglas-Peucker on its two halves (split at the point farthest from the first)
  const ring = g.filter((p, i) => i === 0 || p[0] !== g[i - 1][0] || p[1] !== g[i - 1][1]);
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  if (ring.length < 3) return null;
  if (ring.length <= 12) return ring;
  let far = 1;
  for (let i = 1; i < ring.length; i++) if (Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]) > Math.hypot(ring[far][0] - ring[0][0], ring[far][1] - ring[0][1])) far = i;
  const s = simplify(ring.slice(0, far + 1)).concat(simplify(ring.slice(far).concat([ring[0]])).slice(1, -1));
  return s.length >= 3 ? s : ring;
}
/** The horizontal spans [x0, x1] of a ground polygon at depth d. */
function spansAt(poly, d) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > d) !== (yj > d)) xs.push(xi + (d - yi) * (xj - xi) / (yj - yi)); }
  xs.sort((a, b) => a - b);
  const out = []; for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
/**
 * A channel fitted to a ground polygon: the widest span's middle at 12 depths (log-spaced) as the centreline, the median span as the
 * width. { path, width, aspect (length / width) } or null.
 */
export function fitChannel(poly) {
  const ds = poly.map(p => p[1]), d0 = Math.min(...ds), d1 = Math.max(...ds);
  if (!(d1 > d0)) return null;
  const path = [], widths = [];
  for (let k = 0; k <= 11; k++) {
    const d = d0 * Math.pow(d1 / d0, (k + 0.5) / 12), sp = spansAt(poly, d);
    if (!sp.length) continue;
    const w = sp.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    path.push([r1((w[0] + w[1]) / 2), r1(d)]); widths.push(w[1] - w[0]);
  }
  if (path.length < 2 || !widths.length) return null;
  widths.sort((a, b) => a - b);
  let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  const width = widths[Math.floor(widths.length / 2)];
  return { path, width: r1(width), aspect: r1(len / Math.max(0.1, width)) };
}
/** An object's real height in metres: A's sceneObjReal, its own `real`, the flows' table (movers), else null. */
function realH(E, def) {
  if (!def) return null;
  if (typeof E.real === 'function') { try { const r = E.real(def.id); if (r && r.h > 0 && r.src !== 'class') return r.h; } catch { /* fall through */ } }
  if (def.real && def.real.h > 0) return def.real.h;
  if (typeof E.flowReal === 'function' && ['vehicle', 'person', 'boat', 'animal', 'rail'].includes(def.category)) { try { const r = E.flowReal(def.id); if (r && r.h > 0) return r.h; } catch { /* fall through */ } }
  return null;
}
/**
 * Migrate one v1 scene: { rec (a v2 recipe, the meta left to the caller), report }. opts: { E, cam (default inferred), keepPixels,
 * pack, meta }. The report: { camera, surfaces: { kind: n }, kept: { ground: n }, water: [{ i, kind, aspect }], placements: { ground,
 * pinned, pixel }, noReal: [obj], scatter: { ground, pixel }, actors: { ground, pixel }, notes: [], check: { maxDX, maxDY, maxDS } }.
 */
export function migrateScene(data, C, { E, cam = null, keepPixels = false, pack = 'pack', meta = null } = {}) {
  cam = cam || inferCamera(C, data);
  const H = cam.horizon, report = { camera: null, surfaces: {}, kept: { ground: 0 }, water: [], placements: { ground: 0, pinned: 0, pixel: 0 }, noReal: [], scatter: { ground: 0, pixel: 0 }, actors: { ground: 0, pixel: 0 }, notes: [], check: { maxDX: 0, maxDY: 0, maxDS: 0 } };
  const v = data.view || {}, camera = { eye: r2(cam.eye), fov: r1(cam.fov), horizon: Math.round(H), heading: Number.isFinite(v.heading) ? v.heading : 180 };
  report.camera = camera;
  const scene = { id: data.id, view: { lat: v.lat, lon: v.lon }, camera };
  for (const k of ['palette', 'sky', 'particles', 'season', 'tropic', 'setting', 'at', 'signage', 'kits']) if (data[k] !== undefined) scene[k] = data[k];
  // ground fills: surfaces (below the horizon), pixel ground (the skyline backdrop)
  const surfaces = [{ id: 'land', kind: 'grass', rest: true }], pixelGround = [], used = new Set(['land']);
  const uid = (base) => { let id = base, n = 2; while (used.has(id)) id = `${base}-${n++}`; used.add(id); return id; };
  (data.ground || []).forEach((g, gi) => {
    const polys = pathPolys(g.d), ys = polys.flat().map(p => p[1]), top = ys.length ? Math.min(...ys) : 900;
    const layerId = (C.layers[(C.ground[gi] || {}).layer] || {}).id || g.layer || 'far';
    if (top < H - 2) { pixelGround.push(Object.assign({}, g, { layer: V2_LAYERS.includes(layerId) ? layerId : 'horizon' })); report.kept.ground++; return; }
    const slot = slotOfPaint(g.fill), kk = slotKind(slot), kind = KIND_OF[kk] || 'grass';
    if (!kk) report.notes.push(`ground[${gi}] (slot ${slot ? '@' + slot : 'a plain colour'}): an unknown surface, migrated as grass`);
    for (const p of polys) {
      const poly = unprojectPoly(p, cam);
      if (!poly) continue;
      surfaces.push({ id: uid(kind), kind, poly });
      report.surfaces[kind] = (report.surfaces[kind] || 0) + 1;
    }
  });
  scene.surfaces = surfaces;
  if (pixelGround.length) scene.ground = pixelGround;
  // water: lake, canal (long and narrow in perspective), or the sea (to the horizon across the frame)
  const water = [];
  (data.water || []).forEach((w, wi) => {
    for (const p of pathPolys(w.d)) {
      const ys = p.map(q => q[1]), xs = p.map(q => q[0]), top = Math.min(...ys), wide = Math.max(...xs) - Math.min(...xs) >= 1600 * 0.9;
      const poly = unprojectPoly(p, cam);
      if (!poly) continue;
      const dNear = Math.min(...poly.map(q => q[1]));
      if (top <= H + 2 && wide) { water.push({ id: uid('sea'), kind: 'sea', band: [r1(dNear), null] }); report.water.push({ i: wi, kind: 'sea' }); continue; }
      const ch = fitChannel(poly);
      if (ch && ch.aspect > 6) { water.push({ id: uid('canal'), kind: 'canal', path: ch.path, width: ch.width }); report.water.push({ i: wi, kind: 'canal', aspect: ch.aspect, width: ch.width }); }
      else { water.push({ id: uid('lake'), kind: 'lake', poly }); report.water.push({ i: wi, kind: 'lake', aspect: ch ? ch.aspect : null }); }
    }
  });
  scene.water = water;
  // placements: ground (at, k), pinned (the skyline backdrop), pixel (no real size)
  const place = [];
  const sDepth = (def, d, h) => (cam.f / d) * (h / def.size[1]);
  (data.place || []).forEach((p, pi) => {
    const def = E.obj(p.obj), y = p.y, base = {};
    for (const k of ['variant', 'flip', 'seed', 'tint', 'anim', 'shadow', 'reflect', 'season', 'pit']) if (p[k] !== undefined) base[k] = p[k];
    if (base.seed == null) base.seed = hash(data.id + '|p|' + pi) % 1e6;   // the v1 compile's default seed (V1 3)
    const h = def ? realH(E, def) : null;
    if (!def || keepPixels || !(y > H + 2) || !h || p.layer === 'front' || p.pin) {
      const pin = !(y > H + 2) || p.pin || p.layer === 'front';
      place.push(Object.assign({ obj: p.obj, x: p.x, y: p.y, s: p.s || 1 }, base, { layer: V2_LAYERS.includes(p.layer) ? p.layer : (pin ? 'far' : p.layer) }, pin ? { pin: true } : {}));
      if (pin) report.placements.pinned++; else { report.placements.pixel++; if (def && !h) report.noReal.push(p.obj); }
      return;
    }
    const d = cam.f * cam.eye / (y - H), x = (p.x - cam.x0) * d / cam.f, k = (p.s || 1) / sDepth(def, d, h);
    const g = Object.assign({ obj: p.obj, at: [r2(x), r2(d)], k: r3(k) }, base);
    place.push(g);
    report.placements.ground++;
    // a landmark is always drawn at its real height (V2 4.2: k is ignored), so a v1 landmark drawn bigger or smaller changes size
    if ((def.category === 'landmark' || (def.tags || []).includes('landmark')) && Math.abs(k - 1) > 0.1) report.notes.push(`place[${pi}] ${p.obj}: a landmark is drawn at its real height (${h} m); in v1 it was x ${r2(k)} of it: check the look, or correct its real size`);
    // the round trip with the camera's own formulas: the screen point and the scale it will be drawn at
    const dd = g.at[1], X = cam.x0 + cam.f * g.at[0] / dd, Y = H + cam.f * cam.eye / dd, s = g.k * sDepth(def, dd, h);
    report.check.maxDX = Math.max(report.check.maxDX, r2(Math.abs(X - p.x))); report.check.maxDY = Math.max(report.check.maxDY, r2(Math.abs(Y - p.y)));
    report.check.maxDS = Math.max(report.check.maxDS, r3(Math.abs(s / (p.s || 1) - 1)));
  });
  scene.place = place;
  report.noReal = [...new Set(report.noReal)].sort();
  // scatter rules: ground rules over the unprojected area (screen-even), when every object has a real size; else as they were
  scene.scatter = (data.scatter || []).map((rule) => {
    const area = rule.area || {}, poly = area.poly || (area.rect ? [[area.rect[0], area.rect[1]], [area.rect[2], area.rect[1]], [area.rect[2], area.rect[3]], [area.rect[0], area.rect[3]]] : null);
    const ids = typeof rule.obj === 'string' ? [rule.obj] : Array.isArray(rule.obj) ? rule.obj : Object.keys(rule.obj || {});
    const gp = poly ? unprojectPoly(poly, cam) : null, reals = ids.map(id => realH(E, E.obj(id)));
    if (keepPixels || !gp || reals.some(h => !h)) { report.scatter.pixel++; return rule; }
    const xs = gp.map(p => p[0]), ds = gp.map(p => p[1]);
    // the size factor range: the rule's scales over the depth scale at the area's near and far rows
    const yNear = Math.min(900, Math.max(...poly.map(p => p[1]))), yFar = Math.max(H + 3, Math.min(...poly.map(p => p[1])));
    const sr = Array.isArray(rule.s) ? rule.s : [rule.s || 1, rule.s || 1], ks = [];
    for (const [id, h] of ids.map((id, i) => [id, reals[i]])) {
      const def = E.obj(id);
      for (const y of [yNear, yFar]) { const d = cam.f * cam.eye / (y - H), byY = rule.sByY ? lerpY(rule.sByY, y) : 1; for (const s of sr) ks.push(s * byY / sDepth(def, d, h)); }
    }
    ks.sort((a, b) => a - b);
    const out = { obj: rule.obj, dist: 'screen', x: [r1(Math.min(...xs)), r1(Math.max(...xs))], d: [r1(Math.min(...ds)), r1(Math.max(...ds))], k: [r2(ks[0]), r2(ks[ks.length - 1])] };
    for (const k of ['n', 'density', 'seed', 'variant', 'flip', 'tint', 'anim', 'shadow', 'reflect', 'layer']) if (rule[k] !== undefined) out[k] = rule[k];
    report.scatter.ground++;
    return out;
  });
  // actors: a ground path (and speedM in m/s at the path's mean depth) when the whole path is below the horizon
  scene.actors = (data.actors || []).map((a) => {
    const ok = (a.path || []).every(p => p[1] > H + 2);
    if (!ok || keepPixels) { report.actors.pixel++; return a; }
    const ground = a.path.map(([X, Y]) => { const d = cam.f * cam.eye / (Y - H); return [r1((X - cam.x0) * d / cam.f), r1(d)]; });
    const dm = ground.reduce((n, p) => n + p[1], 0) / ground.length;
    report.actors.ground++;
    return Object.assign({}, a, { ground, speedM: r2((a.speed || 20) * dm / cam.f) });
  });
  for (const k of ['flocks', 'signs']) if (data[k] && data[k].length) scene[k] = data[k];
  scene.flows = [];
  Object.assign(scene, { atmos: 'auto', weather: data.weather && data.weather !== 'live' ? data.weather : 'live', cover: 'auto' });
  const m = meta ? Object.assign({}, meta) : { id: data.id, label: data.id, site: data.id, tags: [], mood: 'calm', colour: 'teal' };
  for (const k of Object.keys(m)) if (typeof m[k] === 'function' || m[k] === undefined) delete m[k];
  m.id = data.id;
  return { rec: { v: 2, pack, meta: m, scene }, report };
}
function lerpY(tab, y) { if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, s0] = tab[i - 1], [y1, s1] = tab[i]; return s0 + (s1 - s0) * (y - y0) / ((y1 - y0) || 1); } return tab[tab.length - 1][1]; }
/** The JSON-safe meta of a registry item (the fields a recipe's meta keeps). */
function metaOf(item) {
  const keep = ['id', 'label', 'site', 'tags', 'mood', 'colour', 'region', 'county', 'ukPlace', 'ukKind', 'ukRegion', 'intensity', 'priority', 'slot', 'theme', 'liveSky'];
  const m = {};
  for (const k of keep) if (item[k] !== undefined && typeof item[k] !== 'function') m[k] = JSON.parse(JSON.stringify(item[k]));
  return m;
}

export default {
  summary: 'migrate v1 composed scenes to v2 recipes (camera inferred, fills to surfaces, placements to the ground) and list what is wrong',
  usage: 'scene migrate <ref>[,...] | --pack <id> [--dry-run] [--report] [--keep-pixels] [--out dir] [--force] [--json]',
  options: {
    report: { type: 'boolean', help: 'migrate: also write <out>/migrate-<pack>.json (the critic and the review read it)' },
    'keep-pixels': { type: 'boolean', help: 'migrate: keep every placement in pixels (convert only the camera, the ground and the water)' },
  },
  notes: ['scene migrate never "fixes" by guessing: a car on grass is reported (vehicleSurface) and, once A\'s compile runs the recipe, snapped to the road or refused; a person decides.'],
  async run(args, ctx, lib) {
    const root = ctx.root, reg = lib.loadRegistry(root, { fresh: true }), E = lib.engineOf(reg);
    E.require('scene migrate');
    const thresholds = lib.loadThresholds(root);
    const list = lib.selectScenes(reg, E, args, ctx.positionals);
    if (!list.length) throw new Error('scene migrate needs refs (composed v1 items) or --pack <id>');
    const dry = !!args['dry-run'], results = [];
    for (const s of list) {
      if (s.kind !== 'item') { ctx.err(`skip ${s.ref}: not a registered composed item`); continue; }
      if (s.item.recipe) { ctx.err(`skip ${s.ref}: already a v2 recipe`); continue; }
      const data = s.data(), C = E.compile(data, { season: 'summer', lod: 1, L: null });
      const before = sanitySummary(sanityRules(C, data, { E, thresholds, strict: true }));
      const vehiclesOnGrass = (sanityRules(C, data, { E, thresholds }).find(r => r.rule === 'vehicleSurface') || { offenders: [] }).offenders.map(o => o.msg);
      const pk = s.pack || s.ref.split('/')[0];
      const { rec, report } = migrateScene(data, C, { E, keepPixels: !!args['keep-pixels'], pack: pk, meta: metaOf(s.item) });
      // the recipe takes the v1 item's OWN id in its pack (sceneItems), so it supersedes it (V2 14.3). A region pack registers the
      // items under a prefixed id (hampshire-, south-yorkshire-) and a scene's data id may differ from its item id (integration,
      // 8 Oct: Peace Gardens became a second item, 'sheffield-peace-gardens', beside the one it was meant to replace)
      {
        // the item's own id: the registry id less the region prefix (the county slug) the region pack adds
        const rid = s.ref.split('/')[1], cslug = String(s.item.county || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const own = cslug && rid.startsWith(cslug + '-') ? rid.slice(cslug.length + 1) : rid;
        if (own && own !== rec.meta.id) { report.notes = (report.notes || []).concat([`the recipe takes the item's id ${own} (the scene data said ${rec.meta.id}), so it supersedes the v1 item`]); rec.meta.id = own; rec.scene.id = own; }
      }
      report.ref = s.ref; report.sanityBefore = before; report.vehiclesOnGrass = vehiclesOnGrass;
      // the migrated scene through A's compile (when the v2 branch is loaded): its snapped and refused placements, its sanity
      try {
        const fromRecipe = reg.R.get('sceneFromRecipe'), C2 = typeof fromRecipe === 'function' ? E.compile(fromRecipe(Object.assign({ id: rec.meta.id }, rec.scene)), { season: 'summer', lod: 1, L: null }) : null;
        if (C2 && C2.v === 2) {
          report.snapped = (C2.problems || []).filter(p => p.rule === 'snapped').map(p => ({ i: p.i, obj: p.obj, msg: p.msg }));
          report.refused = (C2.problems || []).filter(p => p.rule === 'refused').map(p => ({ i: p.i, obj: p.obj, msg: p.msg }));
          report.sanityAfter = sanitySummary(sanityRules(C2, rec.scene, { E, thresholds, strict: true }));
          // the compiled screen place of each converted placement against the v1 one (the 1.5-unit and 3 % check)
          // (an item is matched to its placement by the seed migrate wrote; snapped ones moved on purpose, capped people too)
          let dx = 0, dy = 0, ds = 0, n = 0;
          const bySeed = new Map(rec.scene.place.map((p, i) => [p.seed, i]));
          for (const it of C2.items || []) {
            const i = it.g ? bySeed.get(it.seed) : undefined, p1 = i != null ? rec.scene.place[i] : null, p0 = i != null ? (data.place || [])[i] : null;
            if (!p1 || !p1.at || !p0 || it.g.snapped || (it.o !== p1.obj && !String(it.o).startsWith(p1.obj + '-')) || it.cls === 'landmark') continue;
            if ((C2.problems || []).some(q => q.i === i && /cap/.test(q.rule))) continue;
            n++; dx = Math.max(dx, Math.abs(it.x - p0.x)); dy = Math.max(dy, Math.abs(it.y - p0.y)); ds = Math.max(ds, Math.abs(it.s / (p0.s || 1) - 1));
          }
          report.compiled = { n, maxDX: r2(dx), maxDY: r2(dy), maxDS: r3(ds) };
        } else report.notes.push('A\'s v2 compile is not loaded: snapped and refused placements are not known yet');
      } catch (e) { report.notes.push(`compiling the migrated recipe failed: ${e.message}`); }
      const probs = lib.recipes.recipeProblems(rec);
      report.recipeProblems = probs;
      report.bytes = lib.recipes.formatRecipe(rec).length;
      if (!dry) {
        try { const made = lib.recipes.newRecipeFile(root, rec, { force: !!args.force }); report.file = made.rel; }
        catch (e) { report.writeError = e.message; }
      }
      results.push(report);
    }
    if (args.report) {
      const out = resolve(args.out || join(root, '.anim-ref', 'migrate'));
      mkdirSync(out, { recursive: true });
      const byPack = new Map();
      for (const r of results) { const p = r.ref.split('/')[0]; if (!byPack.has(p)) byPack.set(p, []); byPack.get(p).push(r); }
      for (const [p, rs] of byPack) { const f = join(out, `migrate-${p}.json`); writeFileSync(f, JSON.stringify({ pack: p, scenes: rs }, null, 1)); ctx.out(`report: ${f}`); }
    }
    if (args.json) { ctx.out(JSON.stringify({ dryRun: dry, scenes: results }, null, 1)); return results.some(r => r.writeError) ? 1 : 0; }
    for (const r of results) {
      ctx.out(`\n${r.ref}${dry ? '  (dry run: nothing written)' : r.file ? `  -> ${r.file}` : r.writeError ? `  NOT WRITTEN: ${r.writeError}` : ''}`);
      ctx.out(`  camera: eye ${r.camera.eye} m, fov ${r.camera.fov}, horizon ${r.camera.horizon}, heading ${r.camera.heading} (inferred from the view and the depth ladder)`);
      ctx.out(`  surfaces: ${Object.entries(r.surfaces).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}${r.kept.ground ? `; ${r.kept.ground} skyline fill(s) kept in pixels` : ''}; water: ${r.water.map(w => w.kind + (w.aspect ? ` (${w.aspect}:1)` : '')).join(', ') || 'none'}`);
      ctx.out(`  placements: ${r.placements.ground} to the ground, ${r.placements.pinned} pinned (skyline), ${r.placements.pixel} kept in pixels${r.noReal.length ? ` (no real size: ${r.noReal.slice(0, 6).join(', ')}${r.noReal.length > 6 ? ' ...' : ''})` : ''}; scatter ${r.scatter.ground} ground / ${r.scatter.pixel} pixel; actors ${r.actors.ground} ground / ${r.actors.pixel} pixel`);
      ctx.out(`  round trip: x within ${r.check.maxDX}, y within ${r.check.maxDY} units, scale within ${Math.round(r.check.maxDS * 1000) / 10} %${r.compiled ? `; compiled (${r.compiled.n}): x ${r.compiled.maxDX}, y ${r.compiled.maxDY}, scale ${Math.round(r.compiled.maxDS * 1000) / 10} %` : ''}`);
      ctx.out(`  sanity (v1, strict): ${r.sanityBefore.errors} error(s), ${r.sanityBefore.warnings} warning(s)${Object.keys(r.sanityBefore.byRule).length ? ': ' + Object.entries(r.sanityBefore.byRule).map(([k, n]) => `${k} ${n}`).join(', ') : ''}${r.sanityAfter ? `; migrated: ${r.sanityAfter.errors} error(s), ${r.sanityAfter.warnings} warning(s)` : ''}`);
      for (const m of r.vehiclesOnGrass.slice(0, 8)) ctx.out(`  vehicle off the road: ${m}`);
      for (const w of r.water.filter(x => x.kind === 'canal')) ctx.out(`  water[${w.i}] became a canal (${w.aspect}:1, ${w.width} m wide)`);
      for (const p of (r.snapped || []).slice(0, 8)) ctx.out(`  snapped: place[${p.i}] ${p.obj}: ${p.msg}`);
      for (const p of (r.refused || []).slice(0, 8)) ctx.out(`  REFUSED: place[${p.i}] ${p.obj}: ${p.msg}`);
      for (const n of r.notes.slice(0, 6)) ctx.out(`  note: ${n}`);
      if (r.recipeProblems.length) ctx.out(`  recipe: ${r.recipeProblems.join('; ')}`);
    }
    return results.some(r => r.writeError) ? 1 : 0;
  },
};
