/* Water shares the engine clock and scene metadata. Small source-art captures
 * are reused as reflections; no scene screenshot or secondary frame loop. */
window.GardenNativeWater = (function () {
  'use strict';
  const TAU = Math.PI * 2, LIMIT_BYTES = 8 * 1024 * 1024, MAX_SOURCES = 18, MAX_VISIBLE = 10, MAX_RIPPLES = 48;
  const INTERVAL_CACHE_LIMIT = 2048, INTERVAL_CACHE_MAX_SPANS = 16, NO_INTERVALS = [];
  const polygonScans = new WeakMap();
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const finite = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
  function random(seed) { let value = seed >>> 0; return () => { value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
  function hash(text) { let value = 2166136261; for (const c of String(text)) value = Math.imul(value ^ c.charCodeAt(0), 16777619); return value >>> 0; }
  function boundsOf(points) { let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity; for (const p of points) { x = Math.min(x, p.x); y = Math.min(y, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y); } return Number.isFinite(x) ? { x, y, width: right - x, height: bottom - y } : { x: 0, y: 0, width: 0, height: 0 }; }
  function overlap(a, b, margin = 0) { return a.x + a.width >= b.x - margin && b.x + b.width >= a.x - margin && a.y + a.height >= b.y - margin && b.y + b.height >= a.y - margin; }
  function insidePolygon(x, y, points) { let inside = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
  function mergeIntervals(intervals) { intervals.sort((a, b) => a[0] - b[0]); const out = []; for (const interval of intervals) { if (interval[1] - interval[0] < 1e-6) continue; const last = out[out.length - 1]; if (last && interval[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], interval[1]); else out.push([...interval]); } return out; }
  function intersectIntervals(a, b) { const out = []; let i = 0, j = 0; while (i < a.length && j < b.length) { const lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]); if (hi > lo) out.push([lo, hi]); if (a[i][1] < b[j][1]) i++; else j++; } return out; }
  function subtractIntervals(outer, holes) { let out = outer; for (const hole of holes) { const next = []; for (const interval of out) { if (hole[1] <= interval[0] || hole[0] >= interval[1]) next.push(interval); else { if (hole[0] > interval[0]) next.push([interval[0], hole[0]]); if (hole[1] < interval[1]) next.push([hole[1], interval[1]]); } } out = next; } return out; }
  function polygonScan(points) {
    let scan = polygonScans.get(points); if (scan) return scan;
    const levels = [...new Set(points.map(p => p.y))].sort((a, b) => a - b), edges = [], bands = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j], b = points[i]; if (a.y === b.y) continue;
      edges.push({ low: Math.min(a.y, b.y), high: Math.max(a.y, b.y), x: a.x, y: a.y, slope: (b.x - a.x) / (b.y - a.y) });
    }
    for (let i = 1; i < levels.length; i++) {
      const y = (levels[i - 1] + levels[i]) / 2, active = edges.filter(edge => edge.low <= y && edge.high > y);
      active.sort((a, b) => a.x + a.slope * (y - a.y) - b.x - b.slope * (y - b.y));
      bands.push(active);
    }
    scan = { levels, bands }; polygonScans.set(points, scan); return scan;
  }
  function polygonIntervals(points, y) {
    const scan = polygonScan(points), levels = scan.levels;
    if (!levels.length || y < levels[0] || y >= levels[levels.length - 1]) return [];
    let lo = 0, hi = levels.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (levels[mid] <= y) lo = mid; else hi = mid; }
    // Polygon edges cannot cross within a vertex-height band. Their order is
    // prepared once, rather than scanning and sorting the shore for each strip.
    const edges = scan.bands[lo], out = [];
    for (let i = 1; i < edges.length; i += 2) { const a = edges[i - 1], b = edges[i]; out.push([a.x + a.slope * (y - a.y), b.x + b.slope * (y - b.y)]); }
    return out;
  }
  function regionIntervals(region, y) {
    if (y < region.bounds.y || y >= region.bounds.y + region.bounds.height) return [];
    let intervals = region.points.length > 2 ? polygonIntervals(region.points, y) : [];
    if (region.holes.length) intervals = subtractIntervals(intervals, region.holes.flatMap(points => polygonIntervals(points, y)));
    for (const e of region.ellipses) { const dy = (y - e.y) / e.ry; if (Math.abs(dy) < 1) { const width = e.rx * Math.sqrt(1 - dy * dy); intervals.push([e.x - width, e.x + width]); } }
    // Most reflection strips meet one uninterrupted stretch of water. Its
    // fresh interval needs neither sorting nor another copy of its endpoints.
    if (intervals.length < 2) return intervals.length && intervals[0][1] - intervals[0][0] < 1e-6 ? [] : intervals;
    return mergeIntervals(intervals);
  }
  function lineEdgeIndex(points, holes, bounds) {
    // Geometry changes replace the region and this index together. The grid
    // grows its cell size for unusually large bounds instead of its extent.
    const size = Math.max(64, Math.ceil(bounds.width / 128), Math.ceil(bounds.height / 128)), x = Math.floor(bounds.x / size) * size, y = Math.floor(bounds.y / size) * size;
    const cols = Math.max(1, Math.ceil((bounds.x + bounds.width - x) / size) + 1), rows = Math.max(1, Math.ceil((bounds.y + bounds.height - y) / size) + 1), buckets = new Array(cols * rows), edges = [];
    const add = polygon => {
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j], b = polygon[i], left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
        if (right < bounds.x || left > bounds.x + bounds.width || bottom < bounds.y || top > bounds.y + bounds.height) continue;
        const edge = { x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y, left, right, top, bottom, generation: 0 }; edges.push(edge);
        const x0 = Math.max(0, Math.floor((left - x) / size)), x1 = Math.min(cols - 1, Math.floor((right - x) / size)), y0 = Math.max(0, Math.floor((top - y) / size)), y1 = Math.min(rows - 1, Math.floor((bottom - y) / size));
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const at = cy * cols + cx; (buckets[at] || (buckets[at] = [])).push(edge); }
      }
    };
    add(points); for (const hole of holes) add(hole);
    return { x, y, size, cols, rows, buckets, edges, generation: 0, outer: points.length > 2 ? polygonScan(points) : null, holes: holes.map(polygonScan) };
  }
  function linePolygonContains(scan, x, y) {
    if (!scan) return false; const levels = scan.levels;
    if (!levels.length || y < levels[0] || y >= levels[levels.length - 1]) return false;
    let lo = 0, hi = levels.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (levels[mid] <= y) lo = mid; else hi = mid; }
    let inside = false;
    for (const edge of scan.bands[lo]) if (x < edge.x + edge.slope * (y - edge.y)) inside = !inside;
    return inside;
  }
  function lineRegionContains(region, x, y) {
    const b = region.bounds; if (x < b.x || y < b.y || x > b.x + b.width || y > b.y + b.height) return false;
    for (const e of region.ellipses) if (((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 <= 1) return true;
    const index = region.lineEdges; if (!linePolygonContains(index.outer, x, y)) return false;
    for (const hole of index.holes) if (linePolygonContains(hole, x, y)) return false;
    return true;
  }
  function mixColor(a, b, amount) { const p = clamp(amount), channel = shift => Math.round((a >> shift & 255) * (1 - p) + (b >> shift & 255) * p); return channel(16) << 16 | channel(8) << 8 | channel(0); }
  function horizontalExtent(points, ellipses) {
    let left = Infinity, right = -Infinity;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j], b = points[i];
      if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
      left = Math.min(left, a.x); right = Math.max(right, a.x);
      if (a.y === b.y) continue;
      // Include the actual interpolation's endpoint evaluations, not only
      // vertex x. Finite IEEE operations are monotone over the active y band;
      // this also encloses a rounded crossing just beyond a vertex extremum.
      const slope = (b.x - a.x) / (b.y - a.y), lo = a.x + slope * (Math.min(a.y, b.y) - a.y), hi = a.x + slope * (Math.max(a.y, b.y) - a.y);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      left = Math.min(left, lo, hi); right = Math.max(right, lo, hi);
    }
    for (const ellipse of ellipses) {
      const lo = ellipse.x - ellipse.rx, hi = ellipse.x + ellipse.rx;
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      left = Math.min(left, lo); right = Math.max(right, hi);
    }
    // Holes only subtract water. Unknown/empty extents keep the original path.
    return Number.isFinite(left) && Number.isFinite(right) && right >= left ? { left, right } : null;
  }
  function normalizeRegion(region, index) {
    const point = p => ({ x: finite(Array.isArray(p) ? p[0] : p.x), y: finite(Array.isArray(p) ? p[1] : p.y) }), points = (region.points || []).map(point), holes = (region.holes || []).map(list => list.map(point));
    const ellipses = (region.ellipses || []).map(e => Array.isArray(e) ? { x: finite(e[0]), y: finite(e[1]), rx: Math.abs(finite(e[2])), ry: Math.abs(finite(e[3])) } : { x: finite(e.x), y: finite(e.y), rx: Math.abs(finite(e.rx)), ry: Math.abs(finite(e.ry)) }).filter(e => e.rx > 0 && e.ry > 0);
    const b = region.bounds || boundsOf(points.length ? points : ellipses.flatMap(e => [{ x: e.x - e.rx, y: e.y - e.ry }, { x: e.x + e.rx, y: e.y + e.ry }]));
    if (points.length > 2) polygonScan(points); for (const hole of holes) polygonScan(hole);
    const bounds = { x: finite(b.x), y: finite(b.y), width: finite(b.width, finite(b.w)), height: finite(b.height, finite(b.h)) };
    const reflectionY = [];
    for (const p of points) reflectionY.push(p.y);
    for (const hole of holes) for (const p of hole) reflectionY.push(p.y);
    for (const e of ellipses) reflectionY.push(e.y - e.ry, e.y, e.y + e.ry);
    return { id: region.id || index, ocean: !!region.ocean, points, holes, ellipses, reflectionY, intervalXBounds: horizontalExtent(points, ellipses), holesCrossBoundary: !!region.holesCrossBoundary, bounds, frozen: !!region.frozen, lineEdges: lineEdgeIndex(points, holes, bounds) };
  }
  function affine(container, m, quality) {
    const a = m.a * quality, b = m.b * quality, c = m.c * quality, d = m.d * quality, dot = a * c + b * d, inner = container._waterInner;
    if (Math.abs(dot) > 1e-8) { const aa = a * a + b * b, dd = c * c + d * d, angle = .5 * Math.atan2(2 * dot, aa - dd), cs = Math.cos(angle), sn = Math.sin(angle), disc = Math.hypot(aa - dd, 2 * dot), sx = Math.sqrt(Math.max(0, (aa + dd + disc) / 2)), sy = (a * d - b * c < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (aa + dd - disc) / 2)); container.setRotation(Math.atan2(b * cs + d * sn, a * cs + c * sn)).setScale(sx, sy); inner.setRotation(-angle); }
    else { const sx = Math.hypot(a, b), sy = sx > 1e-9 ? (a * d - b * c) / sx : Math.hypot(c, d); container.setRotation(sx > 1e-9 ? Math.atan2(b, a) : Math.atan2(-c, d)).setScale(sx, sy); inner.setRotation(0); }
    container.setPosition(finite(m.tx, finite(m.e)) * quality, finite(m.ty, finite(m.f)) * quality);
  }
  function create(scene, options) {
    options = options || {};
    const root = scene.add.container(0, 0), reflections = scene.add.container(0, 0).setDepth(1), depth = scene.add.container(0, 0).setDepth(-1), spotLayer = scene.add.container(0, 0).setDepth(-.5), sheen = scene.add.graphics().setDepth(0), shore = scene.add.container(0, 0).setDepth(.5), ripples = scene.add.graphics().setDepth(2);
    root.add([depth, spotLayer, sheen, shore, reflections, ripples]);
    const surfLayers = [0, 1, 2].map(() => scene.add.graphics()); shore.add(surfLayers);
    let surfSegments = 0;
    const rng = random(187731), records = new Map(), ringList = [], particles = [], actorWake = new Map(), spotImages = [];
    const intervalSlots = new Array(INTERVAL_CACHE_LIMIT);
    let intervalCaches = new WeakMap(), intervalCursor = 0, intervalEntries = 0, intervalQueries = 0, intervalHits = 0, intervalMisses = 0, intervalEvictions = 0, intervalBypasses = 0, intervalOutside = 0, intervalInvalidations = 0, intervalEmptyBandQueriesSkipped = 0, intervalHorizontalRegionsSkipped = 0;
    let model = null, room = null, metadata = {}, regions = [], visibleRegions = [], regionRevision = null, regionSource = null, parent = null, dead = false, frame = 0, lastTime = 0, lastAmbient = 0, pauseAt = null, pauseOffset = 0, motion = true, lastMotion = true, fieldAt = -Infinity, ringAt = -Infinity, rainBudget = 0, captureBytes = 0, sequence = 0, captures = 0, captureErrors = 0, visibleReflections = 0, visibleBands = 0, sortDirty = false, snapshotTime = -Infinity, depthKey = '';
    let environment = { daylight: 1, rain: 0, snow: 0, windX: 1, windY: 0, gust: 0 }, currentView = { x: 0, y: 0, width: 960, height: 600, zoom: 1 };
    let spotNodes = [], spotsDirty = true, falloff = null, visibleSpots = 0, usedSpotBands = 0, subjectDiagnostics = [];
    const depthPlane = GardenNativeWaterDepth.create(scene, { parent: depth, intervals: regionIntervals, subtract: subtractIntervals, merge: mergeIntervals, reserve(bytes) { if (!reserve(bytes, null)) return false; captureBytes += bytes; return true; }, release(bytes) { captureBytes = Math.max(0, captureBytes - bytes); } });
    const fishingReflections = GardenNativeFishingReflections.create(scene, { parent: reflections, clipLine, intervals: waterIntervals });
    function sync(next) { model = next || null; }
    function setRoom(next) { if (room === next) return; room = next || null; regionRevision = null; spotsDirty = true; fieldAt = -Infinity; visibleReflections = 0; visibleBands = 0; visibleSpots = 0; for (const record of records.values()) { record.selected = false; hideRecord(record); } for (const image of spotImages) image.setVisible(false); ringList.length = 0; particles.length = 0; actorWake.clear(); updateRegions(readMetadata()); }
    function pauseAmbient(flags) { const paused = !!(flags && (flags.frozen || flags.hush)), now = lastTime || performance.now(); if (paused && pauseAt == null) { pauseAt = now; for (const record of records.values()) record.motionCheckAt = 0; } else if (!paused && pauseAt != null) { pauseOffset += now - pauseAt; pauseAt = null; for (const record of records.values()) record.motionCheckAt = 0; } }
    function readMetadata() { try { return room ? typeof room.effectsState === 'function' ? room.effectsState() || {} : room : options.world && typeof options.world.effectsState === 'function' ? options.world.effectsState() || {} : {}; } catch (e) { return {}; } }
    function updateRegions(next) {
      const target = next.parent || room && (room.root || room.parent) || options.world && options.world.rootNode && options.world.rootNode._inner;
      if (target !== parent) { if (root.parentContainer) root.parentContainer.remove(root); if (target) target.add(root); parent = target; root.setDepth(room ? 54 : -9275); if (parent && parent.sort) parent.sort('depth'); if (options.world && options.world.depthChanged) options.world.depthChanged(); }
      const revision = next.revision == null ? next.regions : next.revision;
      if (revision !== regionRevision || regionSource !== target) { clearIntervalCache(); regions = (next.regions || []).map(normalizeRegion); regionRevision = revision; regionSource = target; fieldAt = -Infinity; ringAt = -Infinity; depthKey = ''; spotsDirty = true; if (!depthPlane.rebuild(regions)) captureErrors++; prepareSurf(); }
    }
    function view() { const camera = scene.cameras.main, a = camera.getWorldPoint(0, 0), b = camera.getWorldPoint(camera.width, camera.height); return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), zoom: camera.zoom }; }
    function inside(region, x, y) { if (x < region.bounds.x || y < region.bounds.y || x > region.bounds.x + region.bounds.width || y > region.bounds.y + region.bounds.height) return false; if (region.ellipses.some(e => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 <= 1)) return true; return region.points.length > 2 && insidePolygon(x, y, region.points) && !region.holes.some(points => insidePolygon(x, y, points)); }
    function contains(x, y, liquidOnly = false) { if (liquidOnly && regions.some(region => region.frozen && inside(region, x, y))) return false; return regions.some(region => (!liquidOnly || !region.frozen) && inside(region, x, y)); }
    function clearIntervalCache() { intervalCaches = new WeakMap(); intervalSlots.fill(null); intervalCursor = 0; intervalEntries = 0; intervalInvalidations++; }
    function cachedRegionIntervals(region, y) {
      intervalQueries++;
      if (!Number.isFinite(y)) { intervalBypasses++; return regionIntervals(region, y); }
      if (y < region.bounds.y || y >= region.bounds.y + region.bounds.height) { intervalOutside++; return NO_INTERVALS; }
      let cache = intervalCaches.get(region); const hit = cache && cache.get(y);
      if (hit) { intervalHits++; return hit; }
      intervalMisses++; const intervals = regionIntervals(region, y);
      // Shoreline strips depend on geometry and exact y, not animated x drift
      // or camera clipping. Cached pairs stay private and read-only here;
      // waterIntervals always makes fresh clipped pairs for each consumer.
      // Large complex rows still use the same scan without retaining them.
      if (intervals.length > INTERVAL_CACHE_MAX_SPANS) { intervalBypasses++; return intervals; }
      if (!cache) { cache = new Map(); intervalCaches.set(region, cache); }
      const old = intervalSlots[intervalCursor];
      if (old) { old.cache.delete(old.y); intervalEvictions++; } else intervalEntries++;
      cache.set(y, intervals); intervalSlots[intervalCursor] = { cache, y }; intervalCursor = (intervalCursor + 1) % INTERVAL_CACHE_LIMIT;
      return intervals;
    }
    function waterIntervals(y, lo, hi, liquidOnly = false) {
      const all = [], finiteRange = Number.isFinite(y) && Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo;
      let ice = null;
      for (const region of visibleRegions) {
        const extent = region.intervalXBounds;
        if (finiteRange && extent && (hi <= extent.left || lo >= extent.right)) { intervalHorizontalRegionsSkipped++; continue; }
        const intervals = cachedRegionIntervals(region, y);
        for (const interval of intervals) { const left = Math.max(lo, interval[0]), right = Math.min(hi, interval[1]); if (right > left) (liquidOnly && region.frozen ? ice || (ice = []) : all).push([left, right]); }
      }
      // Ice exists only after a positive frozen span in a liquid-only query.
      if (all.length < 2 && !ice) return all;
      return ice ? subtractIntervals(mergeIntervals(all), mergeIntervals(ice)) : mergeIntervals(all);
    }
    function paintDepth() {
      depthPlane.setVisible(true);
      const daylight = clamp(finite(environment.daylight, 1)), cloud = clamp(finite(environment.cloudCover)), key = [Math.round(daylight * 12), Math.round(cloud * 4), Math.round(finite(environment.rain) * 3), !!room].join('|'); if (key === depthKey) return; depthKey = key;
      depthPlane.colors(mixColor(0x627d99, 0xb8d2bc, daylight * (1 - cloud * .25)), mixColor(0x142d4b, room ? 0x205363 : 0x285e72, daylight), room ? .09 : .11);
    }
    function prepareSpotFalloff() {
      if (falloff || snapshotTime === lastTime || !reserve(128 * 128 * 4, null)) return !!falloff;
      let g = null, rt = null, key = null;
      try {
        g = scene.make.graphics({ add: false }); const radial = (r, angle) => ({ x: 64 + Math.cos(angle) * 63 * r, y: 64 + Math.sin(angle) * 63 * r }), triangle = (a, b, c, aa, ab, ac) => g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, aa, ab, ac, ac).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
        for (let ring = 0; ring < 12; ring++) for (let segment = 0; segment < 40; segment++) { const inner = ring / 12, outer = (ring + 1) / 12, a0 = segment / 40 * TAU, a1 = (segment + 1) / 40 * TAU, a = radial(inner, a0), b = radial(outer, a0), c = radial(outer, a1), d = radial(inner, a1), aa = (1 - inner * inner) ** 2, ab = (1 - outer * outer) ** 2; triangle(a, b, c, aa, ab, ab); if (ring) triangle(a, c, d, aa, ab, aa); }
        rt = scene.add.renderTexture(0, 0, 128, 128).setVisible(false); rt.clear().draw(g).render(); key = '__garden-water-falloff-' + scene.sys.settings.key + '-' + (++sequence); rt.saveTexture(key); falloff = { rt, key, bytes: rt.texture.width * rt.texture.height * 4 }; captureBytes += falloff.bytes; snapshotTime = lastTime; captures++; return true;
      } catch (error) { captureErrors++; if (rt && rt.active) rt.destroy(); if (key && scene.textures.exists(key)) scene.textures.remove(key); return false; }
      finally { if (g) g.destroy(); }
    }
    function softSpot(x, y, rx, ry, color, alpha) {
      const b = { x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 }; if (!overlap(b, currentView, 5)) return;
      const ys = [b.y, b.y + b.height]; for (let i = 1; i < 12; i++) ys.push(b.y + b.height * i / 12);
      for (const region of visibleRegions) if (overlap(region.bounds, b)) { for (const p of [region.points, ...region.holes].flat()) if (p.y > b.y && p.y < b.y + b.height && ys.length < 48) ys.push(p.y); for (const e of region.ellipses) for (const yy of [e.y - e.ry, e.y, e.y + e.ry]) if (yy > b.y && yy < b.y + b.height && ys.length < 48) ys.push(yy); }
      ys.sort((a, b) => a - b);
      for (let i = 1; i < ys.length && usedSpotBands < 96; i++) { const top = ys[i - 1], bottom = ys[i], epsilon = Math.min(.02, (bottom - top) * .1); if (bottom - top < .01) continue; let spans = waterIntervals(top + epsilon, b.x, b.x + b.width, true);
        // An empty intersection cannot regain water at the remaining samples.
        if (!spans.length) { intervalEmptyBandQueriesSkipped += 2; continue; }
        spans = intersectIntervals(spans, waterIntervals((top + bottom) / 2, b.x, b.x + b.width, true));
        if (!spans.length) { intervalEmptyBandQueriesSkipped++; continue; }
        spans = intersectIntervals(spans, waterIntervals(bottom - epsilon, b.x, b.x + b.width, true));
        for (const [left, right] of spans) { if (usedSpotBands >= 96) break; let image = spotImages[usedSpotBands++]; if (!image) { image = scene.add.image(0, 0, falloff.key).setOrigin(0, 0); spotLayer.add(image); spotImages.push(image); } image.setVisible(true).setPosition(b.x, b.y).setScale(b.width / 128, b.height / 128).setCrop((left - b.x) / b.width * 128, (top - b.y) / b.height * 128, (right - left) / b.width * 128, (bottom - top) / b.height * 128).setTint(color).setAlpha(alpha); }
      }
    }
    function paintSpots() {
      for (const image of spotImages) image.setVisible(false); usedSpotBands = 0; visibleSpots = 0; if (room) return;
      if (spotNodes.some(node => node._dead || !node.isConnected)) spotsDirty = true;
      if (spotsDirty) { const node = options.world && options.world.rootNode; spotNodes = node && node.querySelectorAll ? node.querySelectorAll('[data-water-spot]') : []; spotsDirty = false; }
      const spots = [];
      for (const node of spotNodes) { const matrix = node.target.getWorldTransformMatrix(), rx = finite(node.getAttribute('data-water-rx')), ry = finite(node.getAttribute('data-water-ry')), spot = { kind: node.getAttribute('data-water-spot'), x: finite(matrix.tx, finite(matrix.e)), y: finite(matrix.ty, finite(matrix.f)), rx: Math.hypot(matrix.a * rx, matrix.c * ry), ry: Math.hypot(matrix.b * rx, matrix.d * ry) }; if (spot.rx > 0 && spot.ry > 0 && overlap({ x: spot.x - spot.rx, y: spot.y - spot.ry, width: spot.rx * 2, height: spot.ry * 2 }, currentView, 10)) spots.push(spot); }
      if (!spots.length || !prepareSpotFalloff()) return;
      for (const spot of spots) { if (usedSpotBands >= 96) break; const before = usedSpotBands;
        if (spot.kind === 'drop-off') { softSpot(spot.x, spot.y + 7, spot.rx * 1.05, spot.ry, 0x153f54, .23); softSpot(spot.x - spot.rx * .14, spot.y + 9, spot.rx * .68, spot.ry * .72, 0x10354d, .075); }
        else if (spot.kind === 'weed-bed') softSpot(spot.x, spot.y + 1, spot.rx, spot.ry * 1.15, 0x315e4a, .17);
        else if (spot.kind === 'cold-spring') { softSpot(spot.x, spot.y, spot.rx * 1.12, spot.ry * 1.18, 0x9bcbd8, .17); softSpot(spot.x + 2, spot.y - 1, spot.rx * .54, spot.ry * .6, 0xc8e4e5, .1); }
        if (usedSpotBands > before) visibleSpots++;
      }
    }
    function sheenSegment(a, b, c, d) { return sheen.lineBetween(a, b, c, d); }
    function rippleSegment(a, b, c, d) { return ripples.lineBetween(a, b, c, d); }
    function clipLine(a, b, callback, liquidOnly = true, clipRegions = visibleRegions) {
      const dx = b.x - a.x, dy = b.y - a.y, segmentBox = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(dx), height: Math.abs(dy) }, cuts = [0, 1];
      for (const region of clipRegions) { if (!overlap(region.bounds, segmentBox, .01)) continue;
        const index = region.lineEdges;
        if (++index.generation >= Number.MAX_SAFE_INTEGER) { index.generation = 1; for (const edge of index.edges) edge.generation = 0; }
        const x0 = Math.max(0, Math.floor((segmentBox.x - index.x) / index.size)), x1 = Math.min(index.cols - 1, Math.floor((segmentBox.x + segmentBox.width - index.x) / index.size)), y0 = Math.max(0, Math.floor((segmentBox.y - index.y) / index.size)), y1 = Math.min(index.rows - 1, Math.floor((segmentBox.y + segmentBox.height - index.y) / index.size));
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          const bucket = index.buckets[cy * index.cols + cx]; if (!bucket) continue;
          for (const edge of bucket) {
            if (edge.generation === index.generation) continue; edge.generation = index.generation;
            if (edge.right < segmentBox.x || edge.left > segmentBox.x + segmentBox.width || edge.bottom < segmentBox.y || edge.top > segmentBox.y + segmentBox.height) continue;
            const den = dx * edge.dy - dy * edge.dx; if (Math.abs(den) < 1e-9) continue;
            const px = edge.x - a.x, py = edge.y - a.y, t = (px * edge.dy - py * edge.dx) / den, u = (px * dy - py * dx) / den;
            if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
          }
        }
        for (const e of region.ellipses) { const x = (a.x - e.x) / e.rx, y = (a.y - e.y) / e.ry, vx = dx / e.rx, vy = dy / e.ry, aa = vx * vx + vy * vy, bb = 2 * (x * vx + y * vy), cc = x * x + y * y - 1, discriminant = bb * bb - 4 * aa * cc; if (discriminant >= 0 && aa > 1e-12) for (const t of [(-bb - Math.sqrt(discriminant)) / (2 * aa), (-bb + Math.sqrt(discriminant)) / (2 * aa)]) if (t > 0 && t < 1) cuts.push(t); }
      }
      cuts.sort((x, y) => x - y);
      for (let i = 1; i < cuts.length; i++) {
        const lo = cuts[i - 1], hi = cuts[i], mid = (lo + hi) / 2; if (hi - lo <= 1e-7) continue;
        const x = a.x + dx * mid, y = a.y + dy * mid;
        if (liquidOnly && regions.some(region => region.frozen && lineRegionContains(region, x, y))) continue;
        if (regions.some(region => (!liquidOnly || !region.frozen) && lineRegionContains(region, x, y))) callback(a.x + dx * lo, a.y + dy * lo, a.x + dx * hi, a.y + dy * hi);
      }
    }
    function wavelet(x, y, length, bend, color, opacity, width) {
      sheen.lineStyle(width, color, opacity); let previous = { x: x - length / 2, y };
      for (let i = 1; i <= 4; i++) { const t = i / 4, next = { x: x + (t - .5) * length, y: y + bend * 4 * t * (1 - t) }; clipLine(previous, next, sheenSegment); previous = next; }
    }
    function prepareSurf() {
      for (const layer of surfLayers) layer.clear(); surfSegments = 0;
      // Only a real ocean's land holes have a surf line. The outer world
      // extent and freshwater banks must never become a rectangular coast.
      for (const region of regions) { if (!region.ocean || region.frozen) continue;
        for (const points of region.holes) {
          const normals = points.map((a, i) => {
            const b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy); if (length < .01) return null;
            let x = -dy / length, y = dx / length;
            if (!lineRegionContains(region, (a.x + b.x) / 2 + x * 3, (a.y + b.y) / 2 + y * 3)) { x = -x; y = -y; }
            return { x, y };
          });
          const offset = (i, distance) => {
            const p = points[i], a = normals[(i + points.length - 1) % points.length], b = normals[i]; if (!a || !b) return p;
            const reach = distance / Math.max(.6, 1 + a.x * b.x + a.y * b.y);
            return { x: p.x + (a.x + b.x) * reach, y: p.y + (a.y + b.y) * reach };
          };
          for (let band = 0; band < surfLayers.length; band++) {
            const layer = surfLayers[band], distance = 4 + band * 10;
            for (let i = 0; i < points.length; i++) {
              const seed = hash(region.id + ':' + i + ':' + band); if (seed % 5 > 1) continue;
              const a = offset(i, distance), b = offset((i + 1) % points.length, distance), dx = b.x - a.x, dy = b.y - a.y;
              const lo = .04 + (seed % 11) / 100, hi = .86 + (seed >>> 5) % 9 / 100;
              const from = { x: a.x + dx * lo, y: a.y + dy * lo }, to = { x: a.x + dx * hi, y: a.y + dy * hi };
              // Clip once when the canonical region changes. Concave coves,
              // piers and any future land holes keep their exact water mask.
              clipLine(from, to, (x, y, xx, yy) => {
                layer.lineStyle(3.3 - band * .35, 0xc9e5d8, .13).lineBetween(x, y, xx, yy);
                layer.lineStyle(1.1 - band * .1, 0xecf0dc, .44 - band * .07).lineBetween(x, y, xx, yy); surfSegments++;
              }, true, regions);
            }
          }
        }
      }
      shore.setVisible(surfSegments > 0);
    }
    function surfGlow(clock, daylight, wet) {
      if (!surfSegments) return;
      // The three retained water-only contours gently brighten toward shore;
      // no geometry, captures or shoreline queries run on an ambient tick.
      const light = .48 + daylight * .52, weather = .88 + wet * .12;
      for (let band = 0; band < surfLayers.length; band++) {
        const pulse = motion ? .5 + .5 * Math.sin(clock * .72 + band * .78) : .55;
        surfLayers[band].setAlpha((.28 + pulse * pulse * .72) * light * weather);
      }
    }
    function bankGlints(clock, daylight, zoom) {
      let count = 0;
      for (const region of visibleRegions) { if (region.frozen || region.ocean) continue; if (!region.banks) region.banks = [region.points, ...region.holes, ...region.ellipses.map(e => Array.from({ length: 48 }, (_, i) => ({ x: e.x + Math.cos(i / 48 * TAU) * e.rx, y: e.y + Math.sin(i / 48 * TAU) * e.ry })))];
        for (const points of region.banks) for (let i = 0; i < points.length && count < 60; i++) { if (i % 3) continue; const a = points[i], b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy); if (length < 1 || !overlap({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(dx), height: Math.abs(dy) }, currentView, 5)) continue;
          const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, nx = -dy / length * 2.4, ny = dx / length * 2.4; let side = contains(x + nx, y + ny, true) && !contains(x - nx, y - ny) ? 1 : contains(x - nx, y - ny, true) && !contains(x + nx, y + ny) ? -1 : 0; if (!side) continue;
          const alpha = (.065 + daylight * .09) * (motion ? .65 + .35 * Math.sin(clock * .75 + x * .02 + y * .01) : .8), span = Math.min(15, length * .72), ux = dx / length * span / 2, uy = dy / length * span / 2;
          sheen.lineStyle(Math.max(.4, .75 / Math.sqrt(zoom)), 0xd8e8ce, alpha); clipLine({ x: x + nx * side - ux, y: y + ny * side - uy }, { x: x + nx * side + ux, y: y + ny * side + uy }, sheenSegment); count++;
        }
      }
    }
    function surface(time) {
      sheen.clear(); if (!visibleRegions.length) return;
      const env = environment, daylight = clamp(finite(env.daylight, 1)), wet = clamp(finite(env.rain)), wind = finite(env.windX, 1), clock = motion ? time / 1000 : 0, zoom = Math.max(.2, currentView.zoom), lod = 2 ** Math.max(0, Math.ceil(Math.log2(Math.max(currentView.width / 960, currentView.height / 650)))), stepX = 36 * lod, stepY = 22 * lod, color = daylight < .2 ? 0xa8c5d0 : env.cloudCover > .5 ? 0xc5d8d0 : 0xe3ecce;
      let count = 0;
      for (let gy = Math.floor(currentView.y / stepY); gy <= Math.ceil((currentView.y + currentView.height) / stepY) && count < 140; gy++) for (let gx = Math.floor(currentView.x / stepX); gx <= Math.ceil((currentView.x + currentView.width) / stepX) && count < 140; gx++) {
        const seed = hash(gx + ':' + gy); if (seed % 3) continue; const phase = seed % 997 / 997 * TAU, y = gy * stepY + (seed >>> 9) % 11, x = gx * stepX + seed % 19, length = 8 + (seed >>> 5) % 24;
        if (!contains(x, y, true)) continue; const drift = motion ? Math.sin(clock * .52 + phase + x * .009) * (1.8 + Math.abs(wind) * .5) : 0, shimmer = motion ? .72 + .28 * Math.sin(clock * .8 + phase) : .8, alpha = (.065 + daylight * .075 + wet * .015) * shimmer, bend = (1.2 + Math.sin(clock * .52 + phase) * .55) * (seed % 2 ? 1 : -1);
        wavelet(x + drift, y, length, bend, color, alpha, Math.max(.4, .8 / Math.sqrt(zoom)));
        if (seed % 7 === 0 && daylight > .15) { const caustic = (.035 + daylight * .035) * (1 - clamp(finite(env.cloudCover)) * .55); wavelet(x + drift + 3, y + 5, length * .65, -bend * 1.4, 0xc0dfc9, caustic, Math.max(.5, 1 / Math.sqrt(zoom))); wavelet(x + drift - 3, y + 8, length * .45, bend, 0xc0dfc9, caustic * .8, Math.max(.4, .75 / Math.sqrt(zoom))); }
        count++;
      }
      surfGlow(clock, daylight, wet); bankGlints(clock, daylight, zoom);
      for (const lamp of (metadata.lights || []).slice(0, 20)) { const x = finite(lamp.x), y = finite(lamp.groundY, finite(lamp.y)), radius = finite(lamp.radius, 100); if (!overlap({ x: x - radius, y, width: radius * 2, height: radius }, currentView, 20)) continue;
        const power = clamp(finite(lamp.intensity, .8)) * (room ? .12 : (1 - daylight) * .16); if (power < .01) continue;
        for (let i = 0; i < 7; i++) { const yy = y + 5 + i * 6, width = 3 + i * 1.3, dx = motion ? Math.sin(clock * 1.2 + i * .9 + x * .02) * (1 + i * .25) : 0; sheen.lineStyle(Math.max(.5, (2 - i * .15) / Math.sqrt(zoom)), typeof lamp.color === 'number' ? lamp.color : 0xffdf9a, power * (1 - i / 8)); clipLine({ x: x - width + dx, y: yy }, { x: x + width + dx, y: yy }, sheenSegment); }
      }
    }
    function hideRecord(record) { for (const image of record.images) if (image.visible) image.setVisible(false); record.usedImages = 0; }
    function releaseSnapshot(record) { if (!record.snapshot) return; const snapshot = record.snapshot; record.snapshot = null; captureBytes = Math.max(0, captureBytes - snapshot.bytes); if (snapshot.rt && snapshot.rt.active) snapshot.rt.destroy(); if (scene.textures.exists(snapshot.key)) scene.textures.remove(snapshot.key); }
    function destroyRecord(record) { for (const image of record.images) image.destroy(); releaseSnapshot(record); records.delete(record.id); }
    function trimSources(time) { for (const record of [...records.values()]) if (!record.selected && (!record.source || !record.source.active || time - record.usedAt > 20000 || records.size > MAX_SOURCES)) destroyRecord(record); }
    function sourceAnimates(source) { for (let parent = source.parentContainer; parent; parent = parent.parentContainer) if (parent._nativeNode && parent._nativeNode._nativeAnimating) return true; const pending = [source]; let visited = 0; while (pending.length && visited++ < 256) { const object = pending.pop(); if (!object || !object.active || !object.visible) continue; const node = object._nativeNode; if (node && (node._nativeAnimating || !node._motionBlocked && !node._clockPauseFlags && node._animations && node._animations.length) || object.anims && object.anims.isPlaying) return true; if (object.list) for (let i = object.list.length - 1; i >= 0; i--) pending.push(object.list[i]); } return false; }
    function reserve(bytes, keep) { if (bytes > LIMIT_BYTES) return false; const rank = keep ? keep.subjectPriority : -1, candidates = [...records.values()].filter(record => record !== keep && (!record.selected || keep && record.subjectPriority > rank)).sort((a, b) => (a.selected ? 1 : 0) - (b.selected ? 1 : 0) || b.subjectPriority - a.subjectPriority || a.usedAt - b.usedAt); for (const record of candidates) { if (captureBytes + bytes <= LIMIT_BYTES && records.size <= MAX_SOURCES) break; destroyRecord(record); } return captureBytes + bytes <= LIMIT_BYTES; }
    function sourceVisible(source) { for (let p = source; p; p = p.parentContainer) if (!p.active || p.alpha === 0 || p.visible === false && !(p._nativeCacheHiddenBy && (!p._nativeNode || p._nativeNode._computedVisible !== false))) return false; return true; }
    function parentAlpha(source) { let alpha = 1; for (let p = source.parentContainer; p; p = p.parentContainer) alpha *= p.alpha == null ? 1 : p.alpha; return clamp(alpha); }
    function capture(record, item, quality) {
      const source = item.source, b = item.bounds; if (!source || !source.active || !b || !(b.width > 0 && b.height > 0)) return false;
      quality = Math.max(.35, Math.min(quality, 768 / Math.max(b.width, b.height))); const width = Math.max(2, Math.ceil(b.width * quality)), height = Math.max(2, Math.ceil(b.height * quality)), bytes = width * height * 4;
      if (!reserve(bytes, record)) return false;
      const originalParent = source.parentContainer, displayList = source.displayList, index = originalParent ? originalParent.getIndex(source) : displayList && displayList.getIndex ? displayList.getIndex(source) : -1, sourceState = { x: source.x, y: source.y, scaleX: source.scaleX, scaleY: source.scaleY, rotation: source.rotation, alpha: source.alpha, visible: source.visible };
      let wrapper = null, inner = null, rt = null, key = null, attached = false; const visibility = [];
      try {
        const parentMatrix = originalParent && originalParent.getWorldTransformMatrix ? originalParent.getWorldTransformMatrix() : { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, opacity = parentAlpha(source);
        wrapper = scene.add.container(0, 0); inner = scene.add.container(0, 0); wrapper.add(inner); wrapper._waterInner = inner; affine(wrapper, parentMatrix, quality); wrapper.setAlpha(opacity);
        // A cache above this body can hide the original while its rendered
        // tile remains visible. Reveal only those external-cache originals;
        // internal caches retain their own tiles and hidden source geometry.
        const reveal = object => { const owner = object._nativeCacheHiddenBy; if (owner && object.visible === false && (!object._nativeNode || object._nativeNode._computedVisible !== false)) { let internal = false; for (let p = owner.target; p; p = p.parentContainer) if (p === source) { internal = true; break; } if (!internal) { visibility.push(object); object.setVisible(true); } } for (const child of object.list || []) reveal(child); }; reveal(source);
        attached = true; inner.add(source);
        // Phaser 4 DRAW adds its offsets to the object's existing position.
        // The affine wrapper already contains the parent's world translation;
        // subtract only the capture origin, rather than adding that parent twice.
        rt = scene.add.renderTexture(0, 0, width, height).setVisible(false); rt.clear().draw(wrapper, -b.x * quality, -b.y * quality).render(); key = '__garden-water-' + scene.sys.settings.key + '-' + (++sequence); rt.saveTexture(key);
        const actualWidth = rt.texture.width, actualHeight = rt.texture.height, actualBytes = actualWidth * actualHeight * 4; if (!reserve(actualBytes, record)) throw new Error('Reflection cache is full');
        releaseSnapshot(record); record.snapshot = { rt, key, bytes: actualBytes, bounds: { ...b }, width: actualWidth, height: actualHeight }; captureBytes += actualBytes; record.captureKey = String(item.captureKey == null ? item.revision == null ? '' : item.revision : item.captureKey); record.source = source; record.capturedAt = lastTime; record.firstReady = record.firstReady == null ? lastTime : record.firstReady; captures++;
        for (const image of record.images) image.setTexture(key); return true;
      } catch (error) { captureErrors++; if (rt && rt.active) rt.destroy(); if (key && scene.textures.exists(key)) scene.textures.remove(key); return false; }
      finally {
        for (const object of visibility) if (object.active) object.setVisible(false);
        if (attached && inner && source.active) inner.remove(source);
        if (source.active) { source.setPosition(sourceState.x, sourceState.y).setScale(sourceState.scaleX, sourceState.scaleY).setRotation(sourceState.rotation).setAlpha(sourceState.alpha).setVisible(sourceState.visible); if (attached) { if (originalParent && originalParent.active) originalParent.addAt(source, Math.max(0, Math.min(index, originalParent.list.length))); else if (displayList && displayList.addAt) displayList.addAt(source, Math.max(0, Math.min(index, displayList.list.length))); else if (!source.displayList && !source.parentContainer) scene.add.existing(source); } }
        if (wrapper && wrapper.active) wrapper.destroy(true);
      }
    }
    function itemBounds(item) { const b = item.bounds; if (b && Number.isFinite(b.x) && Number.isFinite(b.y) && b.width > 0 && b.height > 0) return { x: b.x, y: b.y, width: b.width, height: b.height }; const width = Math.max(4, finite(item.w, 24)), height = Math.max(4, finite(item.tall, finite(item.h, 40))); return { x: finite(item.x) - width / 2, y: finite(item.sourceFootY, finite(item.y)) - height, width, height }; }
    function reflectionBox(item) { const b = item.bounds, line = finite(item.waterline, finite(item.groundY, finite(item.y, b.y + b.height))), compression = 1; return { x: b.x, y: line + (line - b.y - b.height) * compression, width: b.width, height: b.height * compression, line, compression }; }
    function nearWater(box) { if (!visibleRegions.some(region => overlap(region.bounds, box))) return false; for (const fraction of [.02, .25, .5, .75, .98]) if (waterIntervals(box.y + box.height * fraction, box.x, box.x + box.width).length) return true; return false; }
    function reflectionImage(record, index) { let image = record.images[index]; if (!image) { image = scene.add.image(0, 0, record.snapshot.key).setOrigin(0, 0); reflections.add(image); record.images.push(image); sortDirty = true; } return image; }
    function paintReflection(record, item, time) {
      record.usedImages = 0; const snapshot = record.snapshot; if (!snapshot) { hideRecord(record); return; } const captured = snapshot.bounds, current = item.bounds, dx = current.x - captured.x, dy = current.y - captured.y, line = finite(item.waterline, finite(item.groundY, finite(item.y, current.y + current.height))), compression = 1, top = line + (line - current.y - current.height) * compression, bottom = line + (line - current.y) * compression, physical = Math.max(.5, currentView.zoom), step = Math.max(2 / physical, Math.min(7, (bottom - top) / 12)), breaks = [Math.max(top, line), bottom];
      if (!(bottom > breaks[0])) { hideRecord(record); return; }
      for (let y = breaks[0] + step; y < bottom && breaks.length < 28; y += step) breaks.push(y);
      // A strip never crosses a polygon vertex or ellipse extremum. Its safe
      // interval is the intersection at both edges and its centre, so source
      // pixels cannot leak onto an irregular bank or through an island.
      for (const region of visibleRegions) if (overlap(region.bounds, { x: current.x, y: top, width: current.width, height: bottom - top })) for (const y of region.reflectionY) if (y > breaks[0] && y < bottom && breaks.length < 54) breaks.push(y);
      breaks.sort((a, b) => a - b); const subject = item.kind === 'pet' || item.kind === 'actor' || item.kind === 'boat', frozen = !waterIntervals((Math.max(top, line) + bottom) / 2, current.x, current.x + current.width, true).length, strength = (subject ? .4 : .17) * (frozen ? .3 : 1) * (.85 + clamp(finite(environment.daylight, 1)) * .15), fadeIn = clamp((lastTime - record.firstReady) / 180), phase = record.phase;
      let used = 0;
      for (let i = 1; i < breaks.length && used < 64; i++) { const y0 = breaks[i - 1], y1 = breaks[i]; if (y1 - y0 < .01 || y1 < currentView.y || y0 > currentView.y + currentView.height) continue; const depth = clamp(((y0 + y1) / 2 - line) / Math.max(1, bottom - line)), drift = motion && !frozen ? Math.sin(time / 1000 * .9 + phase + i * .75) * (finite(environment.windX, 1) * .45 + finite(environment.gust) * .6 + .35) * (.2 + depth) : 0;
        const left = current.x + drift, right = left + current.width, epsilon = Math.min(.04, (y1 - y0) * .1); let intervals = waterIntervals(y0 + epsilon, left, right);
        // Keep all three exact shore samples for every surviving band.
        if (!intervals.length) { intervalEmptyBandQueriesSkipped += 2; continue; }
        intervals = intersectIntervals(intervals, waterIntervals((y0 + y1) / 2, left, right));
        if (!intervals.length) { intervalEmptyBandQueriesSkipped++; continue; }
        intervals = intersectIntervals(intervals, waterIntervals(y1 - epsilon, left, right));
        const sourceTop = clamp((line + (line - y1) / compression - dy - captured.y) / captured.height) * snapshot.height, sourceBottom = clamp((line + (line - y0) / compression - dy - captured.y) / captured.height) * snapshot.height;
        for (const interval of intervals) { const cropX = clamp((interval[0] - drift - dx - captured.x) / captured.width) * snapshot.width, cropRight = clamp((interval[1] - drift - dx - captured.x) / captured.width) * snapshot.width; if (cropRight - cropX < .1 || sourceBottom - sourceTop < .1) continue; const image = reflectionImage(record, used++);
          if (!image.visible) image.setVisible(true); image.setPosition(captured.x + dx + drift, line + (line - captured.y - dy) * compression).setScale(captured.width / snapshot.width, -captured.height * compression / snapshot.height).setCrop(cropX, sourceTop, cropRight - cropX, sourceBottom - sourceTop).setTint(0xc5d3cb).setAlpha(strength * ((subject ? .44 : .28) + (subject ? .56 : .72) * (1 - depth) ** .8) * fadeIn);
          const order = Math.floor(line * 2); if (image.depth !== order) { image.setDepth(order); sortDirty = true; } visibleBands++;
        }
      }
      for (let i = used; i < record.images.length; i++) if (record.images[i].visible) record.images[i].setVisible(false); record.usedImages = used; if (used) visibleReflections++;
    }
    function updateReflections(time) {
      // Selection and band clipping decide what to hide below. Keeping the bands
      // that remain selected avoids toggling every visible reflection off/on
      // inside the same engine update; the frame is drawn only afterward.
      for (const record of records.values()) record.selected = false;
      visibleReflections = 0; visibleBands = 0;
      subjectDiagnostics = [];
      const items = [], seenIds = new Set(), seenSources = new Set();
      for (const group of [metadata.actors || [], metadata.creatures || [], metadata.reflectables || []]) for (const raw of group) {
        if (!raw || !raw.source || seenSources.has(raw.source) || raw.id != null && seenIds.has(raw.id)) continue;
        if (raw.id != null) seenIds.add(raw.id); seenSources.add(raw.source);
        const subject = raw.kind === 'actor' || raw.kind === 'pet' || raw.kind === 'wildlife' || raw.kind === 'boat', diagnostic = subject && subjectDiagnostics.length < 32 ? { id: raw.id, kind: raw.kind, ...(raw.kind === 'wildlife' ? { species: raw.species, medium: raw.medium, lift: raw.lift, sink: raw.sink } : {}), visible: raw.source.visible, logicalVisible: sourceVisible(raw.source), snapshot: false, bands: 0, reason: '' } : null; if (diagnostic) subjectDiagnostics.push(diagnostic);
        if (!raw.source.active || !sourceVisible(raw.source)) { if (diagnostic) diagnostic.reason = 'source-hidden'; continue; }
        if (/^prop:ca-sp(?:weed-bed|cold-spring|drop-off)/.test(String(raw.id || ''))) continue;
        const item = { ...raw, bounds: itemBounds(raw) }, box = reflectionBox(item); if (diagnostic) { diagnostic.footY = box.line; diagnostic.reflectedBounds = { x: box.x, y: box.y, width: box.width, height: box.height }; }
        if (!overlap(box, currentView, 20)) { if (diagnostic) diagnostic.reason = 'offscreen'; continue; } if (!nearWater(box)) { if (diagnostic) diagnostic.reason = 'mirror-misses-water'; continue; }
        item.subjectPriority = raw.kind === 'actor' ? 0 : raw.kind === 'pet' && !/^animal:/.test(String(raw.id)) ? 1 : raw.kind === 'held' ? 2 : raw.kind === 'pet' || raw.kind === 'wildlife' || raw.kind === 'boat' ? 2.5 : 3;
        if (diagnostic) diagnostic.reason = 'not-selected';
        item.diagnostic = diagnostic; items.push({ item, score: item.subjectPriority * 100000 + Math.abs(box.x + box.width / 2 - currentView.x - currentView.width / 2) + Math.abs(box.y - currentView.y - currentView.height / 2) * .3 });
      }
      items.sort((a, b) => a.score - b.score); const selected = items.slice(0, MAX_VISIBLE), pending = [];
      for (const { item } of selected) { const id = (room ? 'room:' : 'world:') + String(item.id || item.source.name || hash(item.x + ':' + item.y)); let record = records.get(id); if (!record) { record = { id, images: [], phase: hash(id) % 997 / 997 * TAU, usedAt: time, selected: true, snapshot: null, source: null }; records.set(id, record); }
        record.selected = true; record.usedAt = time; record.subjectPriority = item.subjectPriority; const key = String(item.captureKey == null ? item.revision == null ? '' : item.revision : item.captureKey), changed = record.source !== item.source || record.captureKey !== key;
        if (item.dynamic && (record.motionSource !== item.source || record.motionKey !== key || time >= (record.motionCheckAt || 0))) { record.motionSource = item.source; record.motionKey = key; record.animated = item.animated === true || sourceAnimates(item.source); record.motionCheckAt = time + 1000; }
        const dynamic = motion && item.dynamic && record.animated && time - finite(record.capturedAt, -Infinity) >= (item.moving ? 150 : 300);
        if ((!record.snapshot || changed || dynamic) && time >= (record.retryAfter || 0)) pending.push({ record, item, priority: !record.snapshot ? 0 : changed ? 1 : 2 });
        record.item = item;
      }
      pending.sort((a, b) => a.record.subjectPriority - b.record.subjectPriority || a.priority - b.priority || finite(a.record.capturedAt, -Infinity) - finite(b.record.capturedAt, -Infinity));
      if (pending.length && snapshotTime !== time) { const job = pending[0], resolution = finite(scene.game.renderer.resolution, finite(scene.game.config.resolution, 1)); if (!capture(job.record, job.item, Math.min(2, Math.max(.75, currentView.zoom * resolution * .7)))) job.record.retryAfter = time + (job.record.subjectPriority < 2 ? 250 : 1000); snapshotTime = time; }
      for (const { item } of selected) { const id = (room ? 'room:' : 'world:') + String(item.id || item.source.name || hash(item.x + ':' + item.y)), record = records.get(id); if (record) paintReflection(record, item, lastAmbient); if (item.diagnostic) { const snapshot = record && record.snapshot; item.diagnostic.snapshot = !!snapshot; item.diagnostic.snapshotKey = snapshot ? snapshot.key : ''; item.diagnostic.snapshotSize = snapshot ? [snapshot.width, snapshot.height] : null; item.diagnostic.captureBounds = snapshot ? snapshot.bounds : null; item.diagnostic.bands = record ? record.usedImages : 0; item.diagnostic.reason = !snapshot ? 'awaiting-capture' : record.usedImages ? 'drawn' : 'clipped'; } }
      for (const record of records.values()) if (!record.selected) hideRecord(record);
      if (sortDirty) { reflections.sort('depth'); sortDirty = false; }
      if (frame % 90 === 0) trimSources(time);
    }
    function effect(kind, x, y, settings) {
      if (dead || !Number.isFinite(x) || !Number.isFinite(y)) return false; settings = typeof settings === 'number' ? { scale: settings } : settings || {}; const scale = clamp(finite(settings.scale, 1), .2, 4), ambient = !!settings.ambient || kind === 'rain' || kind === 'wake' || kind === 'step'; if (ambient && (!motion || pauseAt != null || !contains(x, y, true))) return false;
      const number = settings.rings === false ? 0 : kind === 'catch' || kind === 'splash' ? 3 : kind === 'bite' || kind === 'cast' ? 2 : 1;
      for (let i = 0; i < number; i++) { if (ringList.length >= MAX_RIPPLES) { const at = ringList.findIndex(ring => ring.ambient); ringList.splice(at < 0 ? 0 : at, 1); } ringList.push({ x, y, born: ambient ? lastAmbient : lastTime, delay: i * .1, ambient, scale: scale * (kind === 'rain' ? .5 : 1), life: kind === 'rain' ? .65 : 1.15 + i * .08, color: typeof settings.color === 'number' ? settings.color : 0xd9ece4, strength: kind === 'rain' ? .24 : kind === 'wake' ? .2 : .46, phase: rng() * TAU }); }
      if (motion && (kind === 'cast' || kind === 'splash' || kind === 'catch')) for (let i = 0; i < 6 && particles.length < 24; i++) particles.push({ x, y, vx: (rng() - .5) * 40 * scale, vy: -(18 + rng() * 24) * scale, born: lastTime, life: .45 + rng() * .25, scale });
      return true;
    }
    function ambientEvents(dt) {
      if (!motion || pauseAt != null || !visibleRegions.length) return;
      rainBudget = Math.min(3, rainBudget + dt * finite(environment.rain) * 22);
      while (rainBudget >= 1) { rainBudget--; for (let attempt = 0; attempt < 5; attempt++) { const x = currentView.x + rng() * currentView.width, y = currentView.y + rng() * currentView.height; if (contains(x, y, true)) { effect('rain', x, y, { ambient: true, scale: .8 + rng() * .5 }); break; } } }
      for (const actor of [...(metadata.actors || []), ...(metadata.creatures || [])]) {
        const wildlife = actor.kind === 'wildlife';
        if (actor.airborne || finite(actor.altitude, finite(actor.lift)) > 3 || wildlife && actor.medium !== 'water' || !wildlife && !actor.moving || !contains(actor.x, actor.y, true)) continue;
        const key = actor.id || actor.source, last = actorWake.get(key) ?? -Infinity, interval = actor.moving ? 150 : 2200;
        if (lastAmbient - last < interval) continue;
        actorWake.set(key, lastAmbient); if (actorWake.size > 96) actorWake.delete(actorWake.keys().next().value);
        effect('wake', actor.x, actor.y + 1, { ambient: true, scale: wildlife ? clamp(finite(actor.w, 24) / 48, .25, .8) * (actor.moving ? 1 : .55) : actor.kind === 'boat' ? clamp(finite(actor.w, 24) / 48, .3, .65) : actor.kind === 'pet' ? .65 : 1 });
      }
    }
    function paintRipples() {
      ripples.clear(); const zoom = Math.max(.25, currentView.zoom);
      for (let i = ringList.length - 1; i >= 0; i--) { const ring = ringList[i], age = ((ring.ambient ? lastAmbient : lastTime) - ring.born) / 1000 - ring.delay; if (age >= ring.life) { ringList.splice(i, 1); continue; } if (age < 0) continue; const p = clamp(age / ring.life), radius = ring.scale * (motion ? 3 + p * 16 : 7), ry = radius * .32, b = { x: ring.x - radius, y: ring.y - ry, width: radius * 2, height: ry * 2 }; if (!overlap(b, currentView, 5)) continue;
        ripples.lineStyle(Math.max(.4, .85 / Math.sqrt(zoom)), ring.color, ring.strength * (1 - p) ** 1.5); let previous = { x: ring.x + radius, y: ring.y }; for (let k = 1; k <= 28; k++) { const angle = k / 28 * TAU, next = { x: ring.x + Math.cos(angle) * radius, y: ring.y + Math.sin(angle) * ry }; clipLine(previous, next, rippleSegment); previous = next; }
      }
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i], age = (lastTime - p.born) / 1000; if (age >= p.life) { particles.splice(i, 1); continue; } const x = p.x + p.vx * age, y = p.y + p.vy * age + 70 * age * age; if (x < currentView.x || x > currentView.x + currentView.width || y < currentView.y || y > currentView.y + currentView.height) continue; ripples.fillStyle(0xe4f3ed, (1 - age / p.life) * .6).fillEllipse(x, y, p.scale * 1.6, p.scale * 2.4); }
    }
    function update(time, delta, env) {
      if (dead) return; lastTime = finite(time, performance.now()); frame++; if (env) environment = { ...environment, ...env }; metadata = readMetadata(); updateRegions(metadata); currentView = view(); visibleRegions = regions.filter(region => overlap(region.bounds, currentView, 180)); root.setVisible(visibleRegions.length > 0);
      try { motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(); } catch (e) { motion = true; }
      if (motion !== lastMotion) { fieldAt = -Infinity; ringAt = -Infinity; lastMotion = motion; } lastAmbient = (pauseAt == null ? lastTime : pauseAt) - pauseOffset;
      if (!visibleRegions.length) { visibleReflections = 0; visibleBands = 0; visibleSpots = 0; usedSpotBands = 0; subjectDiagnostics = []; fishingReflections.clear(); depthPlane.setVisible(false); sheen.clear(); ripples.clear(); depthKey = ''; for (const record of records.values()) { record.selected = false; hideRecord(record); } for (const image of spotImages) image.setVisible(false); trimSources(lastTime); return; }
      const dt = Math.min(.06, Math.max(0, finite(delta) > 1 ? finite(delta) / 1000 : finite(delta)));
      paintDepth(); paintSpots(); ambientEvents(dt); updateReflections(lastTime); fishingReflections.update(metadata.fishingRigs || [], currentView, environment, lastAmbient, motion);
      // Highlights are anchored to a world grid. Subpixel camera translation
      // must not defeat their ambient cadence and rebuild them every frame.
      const interval = motion ? 50 : 250, lod = 2 ** Math.max(0, Math.ceil(Math.log2(Math.max(currentView.width / 960, currentView.height / 650)))), viewKey = [Math.floor(currentView.x / (36 * lod)), Math.floor(currentView.y / (22 * lod)), currentView.width, currentView.height, Math.round(finite(environment.daylight, 1) * 40), finite(environment.rain), !!room].join('|');
      if (lastTime - fieldAt >= interval || viewKey !== surface.key) { surface(lastAmbient); surface.key = viewKey; fieldAt = lastTime; }
      if (lastTime - ringAt >= 32 || delta === 0 || ringList.length || particles.length) { paintRipples(); ringAt = lastTime; }
    }
    function destroy() { if (dead) return; dead = true; clearIntervalCache(); for (const record of [...records.values()]) destroyRecord(record); fishingReflections.destroy(); depthPlane.destroy(); if (falloff) { falloff.rt.destroy(); if (scene.textures.exists(falloff.key)) scene.textures.remove(falloff.key); captureBytes = Math.max(0, captureBytes - falloff.bytes); falloff = null; } ringList.length = 0; particles.length = 0; actorWake.clear(); spotNodes.length = 0; root.destroy(true); }
    function status() { const field = depthPlane.status(); return { native: true, regions: regions.length, visibleRegions: visibleRegions.length, reflections: visibleReflections, bands: visibleBands, subjects: subjectDiagnostics, ...fishingReflections.status(), depthTriangles: 0, depthQuads: field.quads, depthTextureBytes: field.textureBytes, depthMaskBuilds: field.builds, depthError: field.lastError, depthSpots: visibleSpots, spotBands: usedSpotBands, surfSegments, falloffBytes: falloff ? falloff.bytes : 0, captures, captureErrors, captureBytes, captureBudgetBytes: LIMIT_BYTES, cachedSources: records.size, intervalCache: { queries: intervalQueries, hits: intervalHits, misses: intervalMisses, outsideBounds: intervalOutside, bypasses: intervalBypasses, entries: intervalEntries, capacity: INTERVAL_CACHE_LIMIT, maxResultSpans: INTERVAL_CACHE_MAX_SPANS, evictions: intervalEvictions, invalidations: intervalInvalidations, emptyBandQueriesSkipped: intervalEmptyBandQueriesSkipped, horizontalRegionsSkipped: intervalHorizontalRegionsSkipped }, ripples: ringList.length, splashDrops: particles.length, paused: pauseAt != null, reducedMotion: !motion, room: !!room }; }
    return { sync, setRoom, update, pauseAmbient, effect, containsWater: contains, destroy, status, root };
  }
  return Object.freeze({ create });
})();
