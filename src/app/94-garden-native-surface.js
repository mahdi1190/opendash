/* Small ground interactions are presentation only and follow travelled feet. */
function gardenPetPuddles() { const surface = window.GardenNative && GardenNative.surface && GardenNative.surface(); return surface ? surface.puddles() : typeof _glPud !== 'undefined' ? _glPud.list : []; }
function gardenPetStepEffect(event) { const surface = window.GardenNative && GardenNative.surface && GardenNative.surface(); if (surface) surface.step(event); }
window.GardenNativeSurface = (function () {
  'use strict';
  const TAU = Math.PI * 2;
  const oval = (x, y, rx, ry) => Array.from({ length: 8 }, (_, i) => [x + Math.cos(i / 8 * TAU) * rx, y + Math.sin(i / 8 * TAU) * ry]);
  const paw = [oval(0, -.65, 1.7, 1.25), oval(-1.8, 1.75, .65, .7), oval(-.65, 2.6, .65, .7), oval(.65, 2.6, .65, .7), oval(1.8, 1.75, .65, .7)];
  const trackShapes = {
    shoe: [[[-1.25, -2.8], [1.25, -2.8], [1.6, -1], [1.7, 1.8], [1.1, 3], [-.9, 3], [-1.6, 1.9], [-1.65, -.8]]],
    paw, tiny: paw, broad: paw,
    hoof: [[[-.25, -2], [-1.7, -1.6], [-1.8, 1.5], [-1.2, 2.5], [-.25, 2.3]], [[.25, -2], [1.7, -1.6], [1.8, 1.5], [1.2, 2.5], [.25, 2.3]]],
    // A rounded heel and three toes, rather than a broad arrow-shaped web.
    web: [[[0, -1.55], [.5, -1.25], [.55, -.35], [1.65, .8], [1.8, 1.15], [1.55, 1.4], [.65, 1.05], [.35, 1.85], [0, 2], [-.35, 1.85], [-.65, 1.05], [-1.55, 1.4], [-1.8, 1.15], [-1.65, .8], [-.55, -.35], [-.5, -1.25]]],
    bird: [[[0, -1.6], [-.4, -.8], [-2.7, 2.1], [-2.1, 2.4]], [[-.25, -.8], [-.3, 3], [.3, 3], [.25, -.8]], [[0, -1.6], [2.1, 2.4], [2.7, 2.1], [.4, -.8]]],
    trail: [[[-.65, -3.8], [.65, -3.8], [.45, 3.8], [-.45, 3.8]]],
    wheel: [[[-1.6, -3.5], [-.8, -3.5], [-.8, 3.5], [-1.6, 3.5]], [[.8, -3.5], [1.6, -3.5], [1.6, 3.5], [.8, 3.5]]],
  };
  function contactGeometry(contact) {
    const c = Math.cos(contact.angle), s = Math.sin(contact.angle), scale = contact.size * (contact.track === 'tiny' ? .7 : contact.track === 'broad' ? 1.15 : contact.track === 'web' ? .8 : 1), offset = /^(trail|wheel)$/.test(contact.track) ? 0 : contact.side * contact.size * 2.5;
    contact.x -= s * offset; contact.y += c * offset;
    const point = (x, y) => ({ x: contact.x + (y * c - x * s) * scale, y: contact.y + (y * s + x * c) * scale }), triangles = [];
    for (const polygon of trackShapes[contact.track] || trackShapes.shoe) {
      if (contact.track === 'web') {
        // The toe notches are visible from the web's centre; a centre fan
        // preserves them without crossing the heel or overlapping triangles.
        const origin = point(0, .1);
        for (let i = 0; i < polygon.length; i++) { const a = point(polygon[i][0], polygon[i][1]), b = point(polygon[(i + 1) % polygon.length][0], polygon[(i + 1) % polygon.length][1]); triangles.push(origin.x, origin.y, a.x, a.y, b.x, b.y); }
        continue;
      }
      const origin = point(polygon[0][0], polygon[0][1]);
      for (let i = 1; i < polygon.length - 1; i++) { const a = point(polygon[i][0], polygon[i][1]), b = point(polygon[i + 1][0], polygon[i + 1][1]); triangles.push(origin.x, origin.y, a.x, a.y, b.x, b.y); }
    }
    contact.triangles = triangles; const a = point(-2, -3), b = point(2, -3); contact.rim = [a.x, a.y, b.x, b.y]; return contact;
  }
  function containsPoint(points, x, y) { let inside = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
  function pointBounds(points) { let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity; for (const p of points) { x = Math.min(x, p.x); y = Math.min(y, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y); } return { x, y, width: right - x, height: bottom - y }; }
  function puddleContains(p, x, y) { const b = p.bounds; return x >= b.x && y >= b.y && x <= b.x + b.width && y <= b.y + b.height && containsPoint(p.points, x, y); }
  function surfaceDay(model) {
    const snapshot = model && model.visit && model.visit.snap;
    return snapshot && Number.isFinite(snapshot.tz) && Number.isFinite(model.now) ? new Date(model.now + snapshot.tz * 60000).toISOString().slice(0, 10) : model && model.today || '';
  }
  function create(scene, options) {
    const W = GARDEN_WORLD, root = scene.add.container(0, 0).setDepth(-9195), pools = scene.add.container(0, 0), marks = scene.add.graphics(), glints = scene.add.graphics(), breath = scene.add.graphics().setDepth(79200);
    root.add([pools, marks, glints]); (options.world.rootNode._inner || options.world.root).add([root, breath]); options.world.depthChanged();
    const contacts = [], rings = [], leaves = [], puffs = [], feet = new Map(), poolDrawings = new Map(), shoreBuckets = new Map(), rippleCuts = [];
    let waterLoops = [];
    let model = options.model, day = surfaceDay(model), env = {}, puddles = [], key = '', room = false, paused = false, clock = 0, paintAt = -1, viewKey = '', rainAt = 0, sequence = 0, dead = false, puddleOpacity = 0, trackShoreGeneration = -1;
    let placementDirty = true, placementRaw = '', clearanceKey = '', clearance = new Uint8Array(W.cols * W.rows), clearanceGeneration = 0, shoreRevision = -1, shoreRegions = null, shoreFingerprint = '', shoreGeneration = 0, realm = '', frozenGround = null;
    let builds = 0, reuses = 0, syncs = 0, placementBuilds = 0, shoreBuilds = 0, retained = 0, rejectedBanks = 0, visiblePools = 0, visibleTracks = 0, visibleRings = 0, paints = 0, lastView = null;
    const motion = () => !paused && (typeof gardenMotionOn !== 'function' || gardenMotionOn());
    function inPuddle(x, y) { for (const p of puddles) if (puddleContains(p, x, y)) return p; return null; }
    function sync(next) {
      const nextRealm = next && next.visit ? 'visit:' + (next.visit.fid || next.visit.key || '') : 'home';
      if (realm && realm !== nextRealm) { contacts.length = rings.length = leaves.length = puffs.length = 0; feet.clear(); paintAt = -1; key = ''; }
      realm = nextRealm; model = next; day = surfaceDay(next); placementDirty = true; syncs++;
    }
    function syncShore(state) {
      if (state.revision === shoreRevision && state.regions === shoreRegions) return;
      shoreRevision = state.revision; shoreRegions = state.regions || []; placementDirty = true;
      const fingerprint = JSON.stringify(shoreRegions.map(r => [r.id, !!r.frozen, r.points.map(p => [p.x, p.y]), (r.holes || []).map(loop => loop.map(p => [p.x, p.y]))]));
      if (fingerprint === shoreFingerprint) return; shoreFingerprint = fingerprint; shoreGeneration++; shoreBuilds++; shoreBuckets.clear();
      waterLoops = shoreRegions.map(region => ({ outer: waterLoopIndex(region.points), holes: (region.holes || []).map(waterLoopIndex) }));
      for (const region of shoreRegions) for (const points of [region.points, ...(region.holes || [])]) for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], edge = { a, b, x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
        for (let y = Math.floor(edge.y0 / 64); y <= Math.floor(edge.y1 / 64); y++) for (let x = Math.floor(edge.x0 / 64); x <= Math.floor(edge.x1 / 64); x++) { const k = x + ',' + y; let bucket = shoreBuckets.get(k); if (!bucket) { bucket = []; shoreBuckets.set(k, bucket); } bucket.push(edge); }
      }
    }
    function waterLoopIndex(points) {
      const bands = new Map();
      // Keep the original edge order and arithmetic, including its strict
      // vertex rule. The band only selects edges that could cross this y.
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j]; if (a.y === b.y) continue;
        const edge = { a, b };
        for (let band = Math.floor(Math.min(a.y, b.y) / 64), end = Math.floor(Math.max(a.y, b.y) / 64); band <= end; band++) {
          let edges = bands.get(band); if (!edges) { edges = []; bands.set(band, edges); } edges.push(edge);
        }
      }
      return bands;
    }
    function waterLoopContains(bands, x, y) {
      const edges = bands.get(Math.floor(y / 64)); if (!edges) return false;
      let inside = false;
      for (const edge of edges) { const a = edge.a, b = edge.b; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside; }
      return inside;
    }
    function waterAt(x, y) {
      for (let i = 0; i < waterLoops.length; i++) {
        const region = shoreRegions[i], b = region.bounds, loops = waterLoops[i];
        if (!(x >= b.x && y >= b.y && x <= b.x + b.width && y <= b.y + b.height) || !waterLoopContains(loops.outer, x, y)) continue;
        let inHole = false; for (const hole of loops.holes) if (waterLoopContains(hole, x, y)) { inHole = true; break; }
        if (!inHole) return true;
      }
      return false;
    }
    function syncPlacement() {
      if (!placementDirty) return; placementDirty = false;
      const props = gardenPropsNow(), open = typeof _GD_LAND === 'undefined' ? [] : [..._GD_LAND].sort();
      const raw = JSON.stringify([model.level.level, open, shoreGeneration, model.plants.map(p => [p.x, p.y, p.fp || p.def.fp || 1]).sort(), model.decor.map(d => [d.x, d.y, d.def.w || 1, d.def.h || 1]).sort(), props.map(p => [p.x, p.y, p.w || 1, p.h || 1, !p.needs || gardenWorkOwned(p.needs)]).sort()]);
      if (raw === placementRaw) return; placementRaw = raw; placementBuilds++;
      const grid = typeof _gwGridNow === 'function' ? _gwGridNow(true) : null, next = new Uint8Array(clearance.length); let signature = '';
      for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const i = y * W.cols + x, occupied = model.occ.get(x + ',' + y); next[i] = !!(grid ? grid[i] : !gardenWalkable(x, y)) || !!gardenPropAt(x, y) || !!(occupied && (occupied.plant || occupied.decor)) ? 1 : 0; if (next[i]) signature += i + ','; }
      clearance = next; if (signature !== clearanceKey) { clearanceKey = signature; clearanceGeneration++; }
    }
    function dryBank(x, y) { const cx = Math.floor(x / W.cellW), cy = Math.floor((y - W.sky) / W.cellH); return cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows && !clearance[cy * W.cols + cx] && !waterAt(x, y); }
    function validPool(p) {
      const px = p.x * W.cellW, py = W.sky + p.y * W.cellH, envelope = p.points.map(q => ({ x: px + (q.x - px) * 1.07, y: py + (q.y - py) * 1.07 + .8 }));
      if (!dryBank(px, py)) return false;
      for (let i = 0; i < envelope.length; i++) { const a = envelope[i], b = envelope[(i + 1) % envelope.length], count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4)); for (let j = 0; j < count; j++) if (!dryBank(a.x + (b.x - a.x) * j / count, a.y + (b.y - a.y) * j / count)) return false; }
      const bounds = pointBounds(envelope), edges = new Set();
      for (let y = Math.floor(bounds.y / 64); y <= Math.floor((bounds.y + bounds.height) / 64); y++) for (let x = Math.floor(bounds.x / 64); x <= Math.floor((bounds.x + bounds.width) / 64); x++) for (const edge of shoreBuckets.get(x + ',' + y) || []) edges.add(edge);
      for (const edge of edges) {
        if (edge.x1 < bounds.x || edge.x0 > bounds.x + bounds.width || edge.y1 < bounds.y || edge.y0 > bounds.y + bounds.height) continue;
        if (containsPoint(envelope, edge.a.x, edge.a.y)) return false;
        const ex = edge.b.x - edge.a.x, ey = edge.b.y - edge.a.y;
        for (let i = 0; i < envelope.length; i++) { const a = envelope[i], b = envelope[(i + 1) % envelope.length], dx = b.x - a.x, dy = b.y - a.y, cross = dx * ey - dy * ex; if (Math.abs(cross) < 1e-8) continue; const ax = edge.a.x - a.x, ay = edge.a.y - a.y, t = (ax * ey - ay * ex) / cross, u = (ax * dy - ay * dx) / cross; if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return false; }
      }
      return true;
    }
    function poolDrawing(p) {
      const g = scene.add.graphics(), px = p.x * W.cellW, py = W.sky + p.y * W.cellH, coords = p.points.flatMap(q => [q.x, q.y]), triangles = Phaser.Geom.Polygon.Earcut(coords, null, 2);
      const fill = (scale, dy, color, alpha) => { g.fillStyle(color, alpha); for (let i = 0; i < triangles.length; i += 3) { const a = p.points[triangles[i]], b = p.points[triangles[i + 1]], c = p.points[triangles[i + 2]]; g.fillTriangle(px + (a.x - px) * scale, py + (a.y - py) * scale + dy, px + (b.x - px) * scale, py + (b.y - py) * scale + dy, px + (c.x - px) * scale, py + (c.y - py) * scale + dy); } };
      fill(1.035, .8, 0x506d70, .24); fill(1, 0, 0x91b6b5, .47); fill(.53, -.8, 0xd3e3dd, .12); pools.add(g); return g;
    }
    function buildPuddles() {
      const dirty = placementDirty, wetness = Math.max(Number(env.rain) || 0, Number.isFinite(env.wetness) ? env.wetness : model.rain && model.rain.now ? 1 : 0), wet = wetness > .02, frozen = model.season === 'winter' || env.snow > .1;
      const fade = Math.max(0, Math.min(1, (wetness - .015) / .535)); puddleOpacity = frozen ? 0 : fade * fade * (3 - 2 * fade); pools.setAlpha(puddleOpacity);
      syncShore(options.world.effectsState()); syncPlacement();
      if (trackShoreGeneration !== shoreGeneration) { trackShoreGeneration = shoreGeneration; for (let i = contacts.length - 1; i >= 0; i--) { const c = contacts[i]; for (let j = 0; j < c.triangles.length; j += 2) if (waterAt(c.triangles[j], c.triangles[j + 1])) { contacts.splice(i, 1); break; } } }
      const nextKey = [day, realm, wet, frozen, clearanceGeneration, shoreGeneration].join('|');
      if (nextKey === key) { if (dirty) reuses++; return; } key = nextKey; builds++; paintAt = -1;
      if (frozenGround != null && frozenGround !== frozen) { for (let i = contacts.length - 1; i >= 0; i--) if (contacts[i].snow !== frozen) contacts.splice(i, 1); feet.clear(); } frozenGround = frozen;
      const previous = new Map(puddles.map(p => [p.id, p])), next = []; retained = 0;
      if (wet && !frozen) {
        const rng = gardenRand('surface-puddles|' + day);
        for (let i = 0; i < 420 && next.length < 16; i++) {
          const x = rng() * W.cols, y = rng() * W.rows, w = .5 + rng() * .8, phase = rng() * TAU, id = 'puddle:' + day + ':' + i;
          if (!dryBank(x * W.cellW, W.sky + y * W.cellH) || next.some(p => Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 1.4)) continue;
          let p = previous.get(id);
          if (!p) { const px = x * W.cellW, py = W.sky + y * W.cellH, rx = w * W.cellW * .62; const points = Array.from({ length: 24 }, (_, k) => { const angle = k / 24 * TAU, r = .91 + Math.sin(angle * 3 + phase) * .055 + Math.cos(angle * 5 - phase) * .025; return { x: px + Math.cos(angle) * rx * r, y: py + Math.sin(angle) * rx * .36 * r }; }); p = { id, x, y, w, phase, points, bounds: pointBounds(points) }; }
          if (!validPool(p)) { rejectedBanks++; continue; } if (previous.has(id)) retained++; next.push(p);
          if (!poolDrawings.has(id)) poolDrawings.set(id, poolDrawing(p));
        }
      }
      puddles = next; const live = new Map(next.map(p => [p.id, p]));
      for (const [id, graphic] of poolDrawings) if (!live.has(id)) { graphic.destroy(); poolDrawings.delete(id); }
      for (let i = rings.length - 1; i >= 0; i--) { const p = live.get(rings[i].p.id); if (p) rings[i].p = p; else rings.splice(i, 1); }
    }
    function ripple(x, y, p, size) { if (rings.length >= 24) rings.shift(); rings.push({ x, y, p, age: 0, life: .6 + size * .15, size }); }
    function step(event) {
      if (dead || room || !model || !motion() || event.wet) return;
      const x = event.x, y = event.y; if (!Number.isFinite(x) || !Number.isFinite(y) || waterAt(x, y)) return;
      const p = inPuddle(x, y), size = Math.max(.5, Math.min(2.3, event.size || 1));
      if (p) { ripple(x, y, p, size); if (event.pet) event.pet._surfaceWetUntil = clock + 5; }
      const snow = !!event.snow || model.season === 'winter' || env.snow > .1, wet = p || env.wetness > .2 || event.wetFeet || event.pet && clock < event.pet._surfaceWetUntil;
      if ((snow || wet) && event.track !== 'none') {
        const contact = contactGeometry({ x, y, size, track: event.track || 'shoe', side: event.side || 1, angle: event.angle || 0, age: 0, life: snow ? 25 : 4.5, snow });
        let dry = true; for (let i = 0; i < contact.triangles.length; i += 2) if (waterAt(contact.triangles[i], contact.triangles[i + 1])) { dry = false; break; } if (dry) { if (contacts.length >= 96) contacts.shift(); contacts.push(contact); }
      }
      if (model.season === 'autumn' && !p && sequence++ % 3 === 0) {
        const rng = gardenRand('leaf-step|' + Math.round(x) + ',' + Math.round(y));
        for (let i = 0; i < 3; i++) { if (leaves.length >= 24) leaves.shift(); leaves.push({ x, y, vx: (rng() - .5) * 26, vy: -8 - rng() * 16, age: 0, life: .8 + rng() * .4, angle: rng() * TAU, color: [0xbb794d, 0xb69a53, 0x907447][i] }); }
      }
    }
    function actorSteps(delta) {
      const actors = options.world.effectsState().actors || [];
      for (const a of actors) {
        if (a.kind !== 'actor' && a.kind !== 'pet') continue;
        let shown = true; for (let node = a.source && (a.source.target || a.source); node; node = node.parentContainer) if (node.active === false || node.visible === false && !node._nativeCacheHiddenBy || node.alpha <= .025) { shown = false; break; } if (!shown) continue;
        let f = feet.get(a.id); if (!f || f.source !== a.source) {
          const node = a.node || a.source && a.source._nativeNode, pet = a.kind === 'pet' && node && node.closest && node.closest('.ptw'), species = pet && pet.dataset.ptw, definition = species && typeof petSpecies === 'function' ? petSpecies(species) : null;
          f = { x: a.x, y: a.y, source: a.source, distance: 0, side: 1, wetUntil: 0, heading: 0, mammal: a.kind === 'actor' || !!(definition && definition.kind === 'mammal'), breathAt: clock + 1.8 + (gardenHash(String(a.id)) % 100) * .025 };
          if (feet.size >= 64 && !feet.has(a.id)) feet.delete(feet.keys().next().value); feet.set(a.id, f);
        }
        const dx = a.x - f.x, dy = a.y - f.y, distance = Math.hypot(dx, dy); f.x = a.x; f.y = a.y;
        if (!delta) { f.distance = 0; continue; }
        if (distance > .01 && distance < 50) f.heading = Math.atan2(dy, dx);
        if ((model.season === 'winter' || env.snow > .1) && f.mammal && !a.airborne && !(a.altitude > 5 || a.lift > 5) && clock >= f.breathAt) {
          f.breathAt = clock + (a.kind === 'pet' ? 3.9 : 3.2) + (gardenHash(String(a.id)) % 70) * .018;
          if (puffs.length < 12) puffs.push({ x: a.x + Math.cos(f.heading) * (a.kind === 'pet' ? Math.min(9, a.w * .3) : 5), y: a.y - (a.kind === 'pet' ? (a.tall || 20) * .5 : Math.min(44, (a.tall || 54) * .78)), vx: Math.cos(f.heading) * 3 + (env.windX || 0) * 3, vy: -4, age: 0, life: 1.15, size: a.kind === 'pet' ? .75 : 1 });
        }
        if (a.kind !== 'actor') continue;
        if (!a.moving || distance > 50) { f.distance = 0; continue; }
        f.distance += distance;
        if (f.distance >= 15) { f.distance %= 15; f.side *= -1; if (inPuddle(a.x, a.y)) f.wetUntil = clock + 4; step({ x: a.x, y: a.y, side: f.side, size: 1, track: 'shoe', wetFeet: clock < f.wetUntil, angle: Math.atan2(dy, dx) }); }
      }
    }
    function currentView() {
      const camera = scene.cameras.main, zoomX = camera.zoomX || camera.zoom || 1, zoomY = camera.zoomY || camera.zoom || 1, cx = camera.scrollX + camera.width / 2, cy = camera.scrollY + camera.height / 2, w = camera.width / zoomX, h = camera.height / zoomY, cos = Math.cos(camera.rotation || 0), sin = Math.sin(camera.rotation || 0);
      const m = root.getWorldTransformMatrix(), det = m.a * m.d - m.b * m.c || 1, tx = m.tx == null ? m.e || 0 : m.tx, ty = m.ty == null ? m.f || 0 : m.ty;
      // The same four corners and transform arithmetic, without temporary
      // pair arrays/point objects or a second bounds pass on every update.
      const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
      const ax = cx + x0 * cos - y0 * sin - tx, ay = cy + x0 * sin + y0 * cos - ty;
      const bx = cx + x1 * cos - y0 * sin - tx, by = cy + x1 * sin + y0 * cos - ty;
      const qx = cx + x0 * cos - y1 * sin - tx, qy = cy + x0 * sin + y1 * cos - ty;
      const dx = cx + x1 * cos - y1 * sin - tx, dy = cy + x1 * sin + y1 * cos - ty;
      const aX = (m.d * ax - m.c * ay) / det, aY = (-m.b * ax + m.a * ay) / det;
      const bX = (m.d * bx - m.c * by) / det, bY = (-m.b * bx + m.a * by) / det;
      const cX = (m.d * qx - m.c * qy) / det, cY = (-m.b * qx + m.a * qy) / det;
      const dX = (m.d * dx - m.c * dy) / det, dY = (-m.b * dx + m.a * dy) / det;
      const x = Math.min(aX, bX, cX, dX), y = Math.min(aY, bY, cY, dY);
      // Keep this result independent: status() may retain a previous painted view.
      return { x, y, width: Math.max(aX, bX, cX, dX) - x, height: Math.max(aY, bY, cY, dY) - y, scale: Math.max(zoomX, zoomY) };
    }
    function puddleLine(ax, ay, bx, by, p) {
      const bounds = p.bounds, right = bounds.x + bounds.width, bottom = bounds.y + bounds.height;
      // A straight segment beyond one bounds edge cannot enter this puddle.
      // Touching edges and non-finite inputs keep the exact clipper below.
      if (Number.isFinite(ax) && Number.isFinite(ay) && Number.isFinite(bx) && Number.isFinite(by)
        && (ax < bounds.x && bx < bounds.x || ax > right && bx > right
          || ay < bounds.y && by < bounds.y || ay > bottom && by > bottom)) return;
      rippleCuts.length = 0; rippleCuts.push(0, 1); const dx = bx - ax, dy = by - ay;
      for (let i = 0; i < p.points.length; i++) { const a = p.points[i], b = p.points[(i + 1) % p.points.length], ex = b.x - a.x, ey = b.y - a.y, cross = dx * ey - dy * ex; if (Math.abs(cross) < 1e-8) continue; const x = a.x - ax, y = a.y - ay, t = (x * ey - y * ex) / cross, u = (x * dy - y * dx) / cross; if (t > 0 && t < 1 && u >= 0 && u <= 1) rippleCuts.push(t); }
      rippleCuts.sort((a, b) => a - b);
      for (let i = 1; i < rippleCuts.length; i++) { const a = rippleCuts[i - 1], b = rippleCuts[i], mid = (a + b) / 2; if (b - a > .00001 && puddleContains(p, ax + dx * mid, ay + dy * mid)) glints.lineBetween(ax + dx * a, ay + dy * a, ax + dx * b, ay + dy * b); }
    }
    function paint(view) {
      marks.clear(); glints.clear(); breath.clear();
      lastView = view; paints++; visiblePools = visibleTracks = visibleRings = 0;
      const seen = (x, y, rx = 0, ry = rx) => x + rx > view.x - 40 && x - rx < view.x + view.width + 40 && y + ry > view.y - 30 && y - ry < view.y + view.height + 30;
      for (const p of puddles) { const b = p.bounds, visible = seen(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + 2, b.height / 2 + 2); poolDrawings.get(p.id).setVisible(visible); if (visible) visiblePools++; }
      for (const c of contacts) {
        if (!seen(c.x, c.y)) continue; visibleTracks++; const alpha = Math.min(1, (c.life - c.age) / 2) * (c.snow ? .3 : .2);
        marks.fillStyle(c.snow ? 0x647f8a : 0x46594b, alpha);
        for (let i = 0; i < c.triangles.length; i += 6) marks.fillTriangle(c.triangles[i], c.triangles[i + 1], c.triangles[i + 2], c.triangles[i + 3], c.triangles[i + 4], c.triangles[i + 5]);
        if (c.snow) marks.lineStyle(.6, 0xe4eeee, alpha).lineBetween(c.rim[0], c.rim[1], c.rim[2], c.rim[3]);
      }
      for (const r of rings) {
        const radius = (2 + r.age * 18) * r.size;
        if (!seen(r.x, r.y, radius, radius * .36)) continue; visibleRings++; glints.lineStyle(Math.max(.35, .9 / Math.sqrt(view.scale)), 0xd9ece4, (1 - r.age / r.life) * .55 * puddleOpacity);
        let ax = r.x + radius, ay = r.y;
        for (let i = 1; i <= 24; i++) { const angle = i / 24 * TAU, bx = r.x + Math.cos(angle) * radius, by = r.y + Math.sin(angle) * radius * .36; puddleLine(ax, ay, bx, by, r.p); ax = bx; ay = by; }
      }
      for (const p of puddles) { const x = p.x * W.cellW, y = W.sky + p.y * W.cellH; if (!seen(x, y)) continue; const drift = Math.sin(clock * 1.7 + p.phase), rx = p.w * W.cellW * .62; glints.lineStyle(Math.max(.35, .75 / Math.sqrt(view.scale)), 0xf0eee0, (.19 + .08 * drift) * puddleOpacity); puddleLine(x - rx * .48 + drift * 2, y - rx * .07, x + rx * .03 + drift * 2, y - rx * .07, p); }
      for (const leaf of leaves) { if (!seen(leaf.x, leaf.y)) continue; glints.fillStyle(leaf.color, Math.min(1, (leaf.life - leaf.age) * 3)); const x = leaf.x, y = leaf.y; glints.fillTriangle(x - 2, y, x + 2, y - Math.sin(leaf.angle) * 3, x + 3, y + 2); }
      for (const puff of puffs) { if (!seen(puff.x, puff.y)) continue; const p = puff.age / puff.life, radius = (1 + p * 3) * puff.size, alpha = Math.min(1, p * 7) * (1 - p) ** 2 * .16; breath.fillStyle(0xe3ece7, alpha).fillEllipse(puff.x, puff.y, radius * 2.2, radius * 1.4).fillEllipse(puff.x + radius * .6, puff.y - radius * .25, radius * 1.5, radius * 1.25); }
    }
    function update(time, delta, environment) {
      if (dead || !model) return; env = environment || env; root.setVisible(!room); breath.setVisible(!room); if (room) return;
      if (typeof gardenMotionOn === 'function' && !gardenMotionOn() || model.season !== 'winter' && !(env.snow > .1)) { puffs.length = 0; breath.clear(); }
      if (typeof _glPud !== 'undefined' && _glPud.node && _glPud.node.target) _glPud.node.target.setVisible(false);
      buildPuddles(); const dt = motion() ? Math.min(.08, Math.max(0, delta || 0) / 1000) : 0; clock += dt; actorSteps(dt);
      if (dt) { for (const list of [contacts, rings, leaves, puffs]) for (let i = list.length - 1; i >= 0; i--) { const item = list[i]; item.age += dt; if (item.age >= item.life) list.splice(i, 1); } for (const leaf of leaves) { leaf.x += (leaf.vx + (env.windX || 0) * 12) * dt; leaf.y += leaf.vy * dt; leaf.vy += 26 * dt; leaf.angle += dt * 8; } for (const puff of puffs) { puff.x += puff.vx * dt; puff.y += puff.vy * dt; }
        rainAt += dt * (env.rain || 0); if (rainAt > .15 && puddles.length) { rainAt %= .15; const p = puddles[sequence++ % puddles.length], phase = sequence * 2.399; ripple(p.x * W.cellW + Math.sin(phase) * p.w * 12, W.sky + p.y * W.cellH + Math.cos(phase) * p.w * 3, p, .55); }
      }
      const view = currentView(), nextView = [Math.floor(view.x / 24), Math.floor(view.y / 24), Math.round(view.width), Math.round(view.height), Math.round(view.scale * 20)].join('|');
      if (paintAt < 0 || clock - paintAt >= .05 || nextView !== viewKey) { paintAt = clock; viewKey = nextView; paint(view); }
    }
    return { update, sync, step, puddleAt: inPuddle, puddles: () => puddles, setRoom(value) { const next = !!value; if (room === next) return; room = next; root.setVisible(!room); breath.setVisible(!room); puffs.length = 0; breath.clear(); feet.clear(); paintAt = -1; viewKey = ''; }, pauseAmbient(state) { paused = !!(state && (state.hush || state.frozen)); }, status: () => ({ puddles: puddles.length, tracks: contacts.length, rings: rings.length, leaves: leaves.length, breath: puffs.length, visiblePuddles: room ? 0 : visiblePools, visibleTracks: room ? 0 : visibleTracks, visibleRings: room ? 0 : visibleRings, puddleBuilds: builds, retainedPuddles: retained, puddleOpacity, syncs, reusedSyncs: reuses, placementBuilds, shoreBuilds, rejectedBanks, puddleShapes: poolDrawings.size, paints, clock, room, paused, view: lastView }), destroy() { if (dead) return; dead = true; for (const graphic of poolDrawings.values()) graphic.destroy(); poolDrawings.clear(); root.destroy(); breath.destroy(); contacts.length = rings.length = leaves.length = puffs.length = 0; feet.clear(); shoreBuckets.clear(); waterLoops = []; } };
  }
  return { create };
})();
