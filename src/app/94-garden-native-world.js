/* The outdoor game scene. Saved garden rows become retained native objects;
 * movement, projection and picking never depend on an SVG document. */
window.GardenNativeWorld = (function () {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function attribute(markup, name) { const m = new RegExp('\\b' + name + '="([^"]*)"').exec(markup); return m ? m[1] : ''; }
  function plantHealthBody(source) {
    // Only these authored health fields may differ. Growth, position, pending
    // badges and every botanical detail still take the normal rebuild path.
    return source.replace(/^<g class="([^"]*)"/, (_, cls) => '<g class="' + cls.replace(/\s+is-thirsty(?=\s|$)/g, '') + '"')
      .replace(/\bdata-sig="[^"]*"/, 'data-sig=""')
      .replace(/(<g class="gart-health" transform=")[^"]*"/, '$1"');
  }
  function hash(text) { let n = 2166136261; for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619); return n >>> 0; }
  function outlines(cells, material, W, precise) {
    const edges = new Map(), at = (x, y) => x >= 0 && y >= 0 && x < W.cols && y < W.rows && cells[y * W.cols + x].material === material;
    const add = (x, y, xx, yy) => { const k = x + ',' + y; let list = edges.get(k); if (!list) { list = []; edges.set(k, list); } list.push([xx, yy]); };
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) if (at(x, y)) { if (!at(x, y - 1)) add(x, y, x + 1, y); if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); if (!at(x - 1, y)) add(x, y + 1, x, y); }
    const loops = [];
    while (edges.size) {
      const start = edges.keys().next().value; let key = start, loop = [], guard = cells.length * 8;
      do { const coord = key.split(',').map(Number); loop.push({ x: coord[0] * W.cellW, y: W.sky + coord[1] * W.cellH }); const list = edges.get(key); if (!list || !list.length) break; const next = list.pop(); if (!list.length) edges.delete(key); key = next.join(','); } while (key !== start && guard-- > 0);
      if (loop.length < 3) continue;
      loop = loop.filter((p, i, all) => { const a = all[(i + all.length - 1) % all.length], b = all[(i + 1) % all.length]; return (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x); });
      if (precise) { loops.push(loop); continue; }
      if (material === 'path') loop = insetTerrainContour(loop, 5.5);
      else if (['bed', 'patch', 'veg', 'rich', 'herb', 'berry'].includes(material)) loop = insetTerrainContour(loop, 1.5);
      const rounded = [], radius = material === 'path' ? 15 : material === 'water' || material === 'pool' ? 25 : 17;
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i], a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length], da = Math.hypot(a.x - p.x, a.y - p.y), db = Math.hypot(b.x - p.x, b.y - p.y), r = Math.min(radius, da * .4, db * .4);
        const from = { x: p.x + (a.x - p.x) * r / da, y: p.y + (a.y - p.y) * r / da }, to = { x: p.x + (b.x - p.x) * r / db, y: p.y + (b.y - p.y) * r / db };
        for (let step = 0; step <= 4; step++) { const t = step / 4, u = 1 - t; rounded.push({ x: u * u * from.x + 2 * u * t * p.x + t * t * to.x, y: u * u * from.y + 2 * u * t * p.y + t * t * to.y }); }
      }
      if (rounded.length) loops.push(material === 'water' || material === 'pool' ? shorelineContour(rounded) : rounded);
    }
    return loops;
  }
  function polygonArea(points) { let sum = 0; for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; sum += a.x * b.y - b.x * a.y; } return sum / 2; }
  function insetTerrainContour(points, distance) {
    return points.map((p, i) => {
      const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length], al = Math.hypot(p.x - a.x, p.y - a.y) || 1, bl = Math.hypot(b.x - p.x, b.y - p.y) || 1;
      const ax = -(p.y - a.y) / al, ay = (p.x - a.x) / al, bx = -(b.y - p.y) / bl, by = (b.x - p.x) / bl, m = distance / Math.max(.25, 1 + ax * bx + ay * by);
      return { x: p.x + (ax + bx) * m, y: p.y + (ay + by) * m };
    });
  }
  function naturalTerrainContour(points, amplitude) {
    const out = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, steps = Math.max(1, Math.ceil(length / 25));
      for (let j = 0; j < steps; j++) { const t = j / steps, x = a.x + dx * t, y = a.y + dy * t, d = amplitude * Math.sin(t * Math.PI) * (.55 + .45 * Math.sin(x * .031 + y * .023)); out.push({ x: x - dy / length * d, y: y + dx / length * d }); }
    }
    return out;
  }
  function woodlandFloorTone(lawn, forest, share) {
    const channel = shift => Math.round(((lawn >>> shift) & 255) * (1 - share) + ((forest >>> shift) & 255) * share);
    return channel(16) << 16 | channel(8) << 8 | channel(0);
  }
  function shorelineContour(points) {
    const sampled = naturalTerrainContour(points, 0), out = [];
    for (let i = 0; i < sampled.length; i++) {
      const a = sampled[(i + sampled.length - 1) % sampled.length], p = sampled[i], b = sampled[(i + 1) % sampled.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
      // Broad coves and smaller reed scallops sit inside boundary water cells;
      // every cell centre remains in open water for the canonical cast target.
      const wave = .5 + .29 * Math.sin(p.x * .017 + p.y * .013) + .15 * Math.cos(p.x * .038 - p.y * .021), reach = Math.min(15, 10 / Math.max(.7, Math.abs(dx) / length));
      const inset = 1.5 + Math.max(0, wave) * reach;
      out.push({ x: p.x - dy / length * inset, y: p.y + dx / length * inset });
    }
    return out;
  }
  function woodlandCrown(x, y, rx, ry, seed) {
    const phase = (seed % 997) / 159, points = [];
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24, lobe = 1 + Math.sin(a * 3 + phase) * .085 + Math.sin(a * 6 - phase * .7) * .1 + Math.cos(a * 9 + phase) * .022;
      points.push({ x: x + Math.cos(a) * rx * lobe + Math.sin(a) * rx * .09, y: y + Math.sin(a) * ry * lobe });
    }
    return points;
  }
  function insidePolygon(p, loop) { let on = false; for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) { const a = loop[i], b = loop[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) on = !on; } return on; }
  function clipTerrainPolygon(points, box) {
    let out = points;
    for (const [axis, edge, greater] of [['x', box.x, true], ['x', box.x + box.width, false], ['y', box.y, true], ['y', box.y + box.height, false]]) {
      const input = out; out = []; if (!input.length) break;
      const inside = p => greater ? p[axis] >= edge : p[axis] <= edge;
      for (let i = 0; i < input.length; i++) {
        const a = input[i], b = input[(i + 1) % input.length], ai = inside(a), bi = inside(b);
        if (ai) out.push(a);
        if (ai !== bi) { const t = (edge - a[axis]) / (b[axis] - a[axis]); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
      }
    }
    return out;
  }
  function terrainBox(points) { const xs = points.map(p => p.x), ys = points.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys); return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }; }
  function terrainEllipse(x, y, w, h) { return Array.from({ length: 40 }, (_, i) => ({ x: x + Math.cos(i * Math.PI / 20) * w / 2, y: y + Math.sin(i * Math.PI / 20) * h / 2 })); }
  function terrainRoundedRect(x, y, w, h, radius) {
    const r = Math.max(0, Math.min(Number(radius) || 0, w / 2, h / 2)), points = [];
    for (const [cx, cy, start] of [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]]) for (let i = 0; i <= 4; i++) { const a = start + i * Math.PI / 8; points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
    return points;
  }
  function fillOutlines(g, loops, color) {
    const outers = loops.filter(p => polygonArea(p) > 0), holes = loops.filter(p => polygonArea(p) <= 0);
    g.fillStyle(color);
    for (const outer of outers) {
      const coords = [], holeIndices = []; for (const p of outer) coords.push(p.x, p.y);
      for (const hole of holes) if (insidePolygon(hole[0], outer)) { holeIndices.push(coords.length / 2); for (const p of hole) coords.push(p.x, p.y); }
      const triangles = Phaser.Geom.Polygon.Earcut(coords, holeIndices, 2);
      for (let i = 0; i < triangles.length; i += 3) { const a = triangles[i] * 2, b = triangles[i + 1] * 2, c = triangles[i + 2] * 2; g.fillTriangle(coords[a], coords[a + 1], coords[b], coords[b + 1], coords[c], coords[c + 1]); }
    }
  }
  function element(scene, tag, attrs) { return GardenNativeArt.element(scene, tag, attrs || {}); }
  function create(scene, options) {
    options = options || {};
    const W = GARDEN_WORLD, width = W.cols * W.cellW, height = W.sky + W.rows * W.cellH;
    // The camera clips the outer scene. Baking this viewport into a newly
    // created actor at its local origin would permanently cut its silhouette.
    const rootNode = element(scene, 'svg', { class: 'gd-svg gd-native-world', viewBox: '0 0 ' + width + ' ' + height, overflow: 'visible' });
    const root = rootNode.target;
    const group = (name, depth) => { const node = element(scene, 'g', { class: name }); node.target.setDepth(depth); rootNode.appendChild(node); return node; };
    const oceanBackdrop = scene.add.graphics().setDepth(-10010).setVisible(false); rootNode._inner.add(oceanBackdrop);
    const terrain = group('gd-ground', -10000), pierBoards = group('gd-pier-boards', -9250), design = group('gd-dz', -9400), objects = group('gd-objects', 0), actors = group('gd-actors', 50000), pets = group('gd-pets', 51000), ui = group('gd-ui', 90000);
    const needGround = group('gd-need-ground gd-needs', -9260); needGround.setAttribute('pointer-events', 'none');
    const effects = element(scene, 'g', { class: 'gd-fx' }); ui.appendChild(effects);
    const editorPreview = element(scene, 'g', { class: 'gdz-native-preview', 'pointer-events': 'none' }); ui.appendChild(editorPreview); editorPreview.target.setVisible(false);
    for (const cls of ['gd-hover', 'gd-sel']) ui.appendChild(element(scene, 'rect', { class: cls, width: 0, height: 0, rx: 4 }));
    ui.appendChild(element(scene, 'g', { class: 'gd-ghost' }));
    group('gd-weather', 79000); group('gd-nightlayer', 80000);
    const drawings = new Map(), dynamic = new Map(), needRings = new Map(), markers = [], terrainObjects = [], terrainChunks = new Map(), pierDeckRecords = new Map(), terrainLabels = [], solidObjects = [], pointLights = [], fadingProps = [], cacheQueue = new Map(), terrainBaseQueue = new Map();
    const sceneryCache = { retainBase: true, baseQuality: 1, baseFromCapture: true, baseMaxBytes: 512 * 1024 };
    const mainDrawingGuard = 16;
    let mainExcludedDrawings = 0, mainExclusionCameraId = 0;
    const specialMainActors = new Map(), specialMainClasses = new WeakMap();
    const specialMainCounts = { tracked: 0, stones: 0, dragonflies: 0, excludedStones: 0, excludedDragonflies: 0, unknownBounds: 0 };
    const canopyOccluders = [], coveringCanopies = [];
    let playerOcclusionHeight = 60;
    const waterRegions = [], reflectedScenery = [], lockedRegions = [], gateRows = [], landmarkRows = [], forestRows = [];
    const containsWater = (x, y) => waterRegions.some(r => !r.frozen && x >= r.bounds.x && x <= r.bounds.x + r.bounds.width && y >= r.bounds.y && y <= r.bounds.y + r.bounds.height && insidePolygon({ x, y }, r.points) && !r.holes.some(hole => insidePolygon({ x, y }, hole)));
    let ambientPause = null;
    let editorState = null, editorPaint = null, editorMoves = 0, editorLayerPaints = 0;
    let surfaceRevision = 0, effectActorRows = [], effectHeldRows = [], effectCreatureRows = [], effectFrame = -1, effectSerial = 0;
    // Frontier needs only resident locked-land geometry and its revision.
    const frontierMetadata = { revision: surfaceRevision, lockedRegions };
    const effectIds = new WeakMap(), creatureMotion = new WeakMap();
    const chunkWidth = W.cellW * 4, chunkHeight = W.cellH * 6;
    const route = scene.add.graphics(); route.setDepth(89000); root.add(route);
    let model = null, modelKey = '', terrainKey = '', shorelineRevision = 0, sorted = false, dead = false, routeKey = '', fishZoom = 1, wasFishing = false, fishViewMode = '', playerViewKey = '', playerProfile = null, playerWardrobe = null, visibleStatic = 0, visibleTerrain = 0, cacheQuality = 0, terrainBaseQuality = 1, terrainBaseReady = 0;
    let camera = { x: 0, y: 0, w: 800, h: 600, scale: 1, left: 0, top: 0 }, zoomInputAt = 0, activityCamera = null, cameraUiMode = '', cameraUiZoomIn = null, cameraUiZoomOut = null, size = { w: options.width || scene.scale.width || 1000, h: options.height || scene.scale.height || 700 };
    const playerNode = element(scene, 'g', { class: 'gd-player', 'data-live': '1' });
    playerNode.innerHTML = '<g class="gd-pl-sh"><ellipse class="gd-pl-halo" cx="0" cy="1" rx="17" ry="6" fill="#f1df9e" opacity=".36"/><ellipse cx="0" cy="1" rx="12" ry="3.4" fill="#253c2b" opacity=".2"/></g><g class="gd-pl-bob"><g class="gd-pl-in"></g></g>';
    objects.appendChild(playerNode);
    const playerInner = playerNode.querySelector('.gd-pl-in'), playerBob = playerNode.querySelector('.gd-pl-bob');
    let playerPosePreparation = null;
    const xray = element(scene, 'g', { class: 'gd-pl-xray' }); xray.appendChild(element(scene, 'g')); xray.target.setVisible(false); ui.appendChild(xray);
    _gw.node = playerNode; _gw.bobEl = playerBob; _gw.xr = xray; _gw.z = -1;

    function nodeDrawing(id, source, metadata, depth, parent) {
      const old = drawings.get(id);
      if (old && old.source === source) { old.metadata = metadata; return old; }
      if (old && metadata.kind === 'plant') {
        const health = /<g class="gart-health" transform="([^"]*)">/.exec(source);
        const body = health && plantHealthBody(source);
        if (health && body === (old.healthBody || plantHealthBody(old.source))) {
          const plant = old.node.querySelector('.gd-plant'), joint = plant && plant.querySelector('.gart-health');
          if (joint) {
            plant.setAttribute('class', attribute(source, 'class'));
            plant.setAttribute('data-sig', attribute(source, 'data-sig'));
            joint.setAttribute('transform', health[1]);
            old.source = source; old.healthBody = body; old.metadata = metadata; old.bounds = old.handle.bounds;
            return old;
          }
        }
      }
      if (old) { old.handle.destroy(); drawings.delete(id); }
      const handle = GardenNativeArt.create(scene, source, { depth });
      (parent || objects).appendChild(handle.rootNode); handle.root.setDepth(depth);
      const record = { id, source, handle, root: handle.root, node: handle.rootNode, metadata, depth, bounds: handle.bounds };
      drawings.set(id, record); cacheQueue.set(handle.rootNode, { ...sceneryCache, staticOnly: true }); sorted = true; return record;
    }
    function queueDrawing(record) {
      record.cacheScheduled = true;
      if (record.handle.cacheNodes) for (const node of record.handle.cacheNodes) cacheQueue.set(node, { ...sceneryCache, staticOnly: false, tileSize: 512, viewBounds: record.bounds, visibleRoot: record.root });
      else cacheQueue.set(record.node, { ...sceneryCache, staticOnly: !record.node.nativeBounds, tileSize: 512 });
    }
    function syncNeedRings(rows) {
      if (dead) return;
      const keep = new Set(), ordered = []; let changed = false;
      for (const spec of rows) {
        const key = String(spec.key), signature = [spec.rx, spec.ry, spec.fill].join('|'), tf = 'translate(' + spec.x.toFixed(1) + ' ' + spec.y.toFixed(1) + ')';
        keep.add(key); let record = needRings.get(key);
        if (record && record.signature !== signature) { record.node.remove(); needRings.delete(key); record = null; }
        if (!record) {
          const node = element(scene, 'g', { 'data-k': key, transform: tf }), ring = element(scene, 'ellipse', { class: 'gd-need-ring', rx: spec.rx, ry: spec.ry, fill: spec.fill });
          needGround.appendChild(node); node.appendChild(ring);
          record = { node, ring, signature, tf }; needRings.set(key, record); changed = true;
          GardenNativeArt.cache(ring, { staticOnly: false, quality: 1, adaptive: true, crop: false, tileSize: 512 });
        } else if (record.tf !== tf) { record.node.setAttribute('transform', tf); record.tf = tf; changed = true; }
        // Preserve the existing need-wrapper offscreen policy without layout.
        record.node._gartBox = { x: spec.x - 40, y: spec.y - 130, w: 80, h: 145 }; ordered.push(record.node);
      }
      for (const [key, record] of needRings) if (!keep.has(key)) { record.node.remove(); needRings.delete(key); changed = true; }
      let ref = needGround.firstChild;
      for (const node of ordered) { if (node === ref) ref = ref.nextSibling; else needGround.insertBefore(node, ref); }
      if (changed) { rootNode._gartAux = null; rootNode._gartViewKey = null; }
    }
    function designLayer(draft) {
      const row = nodeDrawing('ground:design', gardenDesignLayer({ dz: draft }), { kind: 'ground' }, -9350, design);
      editorLayerPaints++; sortObjects(); return row.node;
    }
    function designPreview(spec) {
      if (!spec || editorState && editorState.key !== spec.key) {
        if (editorState && editorState.record) {
          const { record, saved } = editorState, target = record.root;
          if (target.active) { if (target.parentContainer) target.parentContainer.remove(target); if (saved.parent && saved.parent.active) saved.parent.addAt(target, Math.max(0, Math.min(saved.index, saved.parent.list.length))); target.setPosition(saved.x, saved.y).setAlpha(saved.alpha).setDepth(saved.depth).setVisible(saved.visible); }
          record.editorLifted = false; for (const item of editorState.reflections) item.source = target; sorted = true;
        }
        for (const child of [...editorPreview.children]) child.remove();
        editorState = null; editorPreview.target.setVisible(false);
        if (!spec) { editorPaint = null; return true; }
      }
      if (!editorState) {
        const record = spec.source && drawings.get(spec.source);
        if (record) {
          drawingMainExclusion(record, false);
          const target = record.root, parent = target.parentContainer, saved = { parent, index: parent ? parent.getIndex(target) : 0, x: target.x, y: target.y, alpha: target.alpha, depth: target.depth, visible: target.visible };
          const reflections = reflectedScenery.filter(item => item.source === target); for (const item of reflections) item.source = null;
          if (parent) parent.remove(target); editorPreview._inner.add(target); record.editorLifted = true;
          editorState = { key: spec.key, record, saved, reflections, target };
        } else if (spec.html) {
          const node = element(scene, 'g'); node.innerHTML = spec.html; editorPreview.appendChild(node); gardenDesignPainted(node, spec.words);
          editorState = { key: spec.key, node, target: node.target };
        } else return false;
      }
      const state = editorState;
      state.target.setPosition(state.record ? state.saved.x + (spec.x - spec.ox) * W.cellW : (spec.x + .5) * W.cellW, state.record ? state.saved.y + (spec.y - spec.oy) * W.cellH : W.sky + (spec.y + 1) * W.cellH - 4).setAlpha(spec.valid ? .85 : .55).setDepth(0).setVisible(true);
      editorPreview.target.setVisible(true); editorMoves++; return true;
    }
    function label(parent, x, y, text, sizePx, color, center) {
      const node = element(scene, 'text', { x, y, 'font-family': 'Georgia, serif', 'font-size': sizePx, fill: color || '#3a4935', 'text-anchor': center ? 'middle' : 'start', 'dominant-baseline': center ? 'middle' : 'auto' });
      node.textContent = String(text); parent.appendChild(node); terrainObjects.push({ destroy: () => node.remove() }); if (parent === terrain) terrainLabels.push({ node, bounds: node.getBBox() }); return node;
    }
    function terrainChunk(cx, cy) {
      const key = cx + ',' + cy; let record = terrainChunks.get(key); if (record) return record;
      const node = element(scene, 'g', { class: 'gd-ground-chunk', 'data-chunk': key });
      const bounds = { x: cx * chunkWidth, y: cy * chunkHeight, width: Math.min(chunkWidth, width - cx * chunkWidth), height: Math.min(chunkHeight, height - cy * chunkHeight) };
      node.nativeBounds = bounds; terrain.appendChild(node);
      record = { node, bounds, layers: new Map(), seen: false }; terrainChunks.set(key, record); return record;
    }
    function terrainPainter(layer) {
      // Partition paint once, rather than traversing the entire world's
      // Graphics command buffer when a close camera needs native vectors.
      // Crossing shapes are clipped to disjoint boxes, including their alpha.
      let fill = { color: 0xffffff, alpha: 1 }, line = { width: 1, color: 0xffffff, alpha: 1 };
      const graphic = chunk => { let g = chunk.layers.get(layer); if (!g) { g = scene.add.graphics().setDepth(layer); chunk.node._inner.add(g); chunk.node._inner.sort('depth'); chunk.layers.set(layer, g); } return g; };
      const paint = (method, args, b, polygon, style) => {
        if (b.x + b.width <= 0 || b.y + b.height <= 0 || b.x >= width || b.y >= height) return;
        const x0 = Math.max(0, Math.floor(b.x / chunkWidth)), y0 = Math.max(0, Math.floor(b.y / chunkHeight)), x1 = Math.min(Math.ceil(width / chunkWidth) - 1, Math.ceil((b.x + b.width) / chunkWidth) - 1), y1 = Math.min(Math.ceil(height / chunkHeight) - 1, Math.ceil((b.y + b.height) / chunkHeight) - 1);
        let points = null;
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          const chunk = terrainChunk(cx, cy), cb = chunk.bounds, g = graphic(chunk); g.fillStyle(style.color, style.alpha);
          if (method && b.x >= cb.x && b.y >= cb.y && b.x + b.width <= cb.x + cb.width && b.y + b.height <= cb.y + cb.height) g[method](...args);
          else { if (!points) points = polygon(); const clipped = clipTerrainPolygon(points, cb); if (clipped.length > 2) g.fillPoints(clipped, true, true); }
        }
      };
      const fillPolygon = (points, style) => paint(null, null, terrainBox(points), () => points, style || fill);
      const stroke = (points, closed) => {
        if (points.length < 2 || !line.width || !line.alpha) return;
        const normals = [], left = [], right = [], n = points.length;
        for (let i = 0; i < n - (closed ? 0 : 1); i++) { const a = points[i], b = points[(i + 1) % n], length = Math.hypot(b.x - a.x, b.y - a.y) || 1; normals.push({ x: -(b.y - a.y) / length, y: (b.x - a.x) / length }); }
        for (let i = 0; i < n; i++) {
          const before = normals[(i - 1 + normals.length) % normals.length], after = normals[i % normals.length], a = !closed && i === 0 ? after : before, b = !closed && i === n - 1 ? before : after;
          let nx = a.x + b.x, ny = a.y + b.y, length = Math.hypot(nx, ny); if (length < .0001) { nx = b.x; ny = b.y; length = 1; } nx /= length; ny /= length;
          const reach = Math.min(line.width * 2, line.width / 2 / Math.max(.25, nx * b.x + ny * b.y)), p = points[i]; left.push({ x: p.x + nx * reach, y: p.y + ny * reach }); right.push({ x: p.x - nx * reach, y: p.y - ny * reach });
        }
        for (let i = 0; i < n - (closed ? 0 : 1); i++) { const j = (i + 1) % n; fillPolygon([left[i], right[i], right[j], left[j]], line); }
      };
      const api = {
        fillStyle(color, alpha = 1) { fill = { color, alpha }; return api; },
        lineStyle(w, color, alpha = 1) { line = { width: w, color, alpha }; return api; },
        fillPoints(points) { const coords = points.flatMap(p => [p.x, p.y]), triangles = Phaser.Geom.Polygon.Earcut(coords, null, 2); for (let i = 0; i < triangles.length; i += 3) { const a = points[triangles[i]], b = points[triangles[i + 1]], c = points[triangles[i + 2]]; api.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y); } return api; },
        fillRect(x, y, w, h) { paint('fillRect', [x, y, w, h], { x, y, width: w, height: h }, () => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], fill); return api; },
        fillTriangle(x, y, xx, yy, xxx, yyy) { const p = [{ x, y }, { x: xx, y: yy }, { x: xxx, y: yyy }]; paint('fillTriangle', [x, y, xx, yy, xxx, yyy], terrainBox(p), () => p, fill); return api; },
        fillEllipse(x, y, w, h) { paint('fillEllipse', [x, y, w, h], { x: x - w / 2, y: y - h / 2, width: w, height: h }, () => terrainEllipse(x, y, w, h), fill); return api; },
        fillCircle(x, y, r) { paint('fillCircle', [x, y, r], { x: x - r, y: y - r, width: r * 2, height: r * 2 }, () => terrainEllipse(x, y, r * 2, r * 2), fill); return api; },
        fillRoundedRect(x, y, w, h, r) { paint('fillRoundedRect', [x, y, w, h, r], { x, y, width: w, height: h }, () => terrainRoundedRect(x, y, w, h, r), fill); return api; },
        lineBetween(x, y, xx, yy) { stroke([{ x, y }, { x: xx, y: yy }], false); return api; },
        strokePoints(points, closed) { stroke(points, closed); return api; },
        strokeEllipse(x, y, w, h) { stroke(terrainEllipse(x, y, w, h), true); return api; },
        strokeRoundedRect(x, y, w, h, r) { stroke(terrainRoundedRect(x, y, w, h, r), true); return api; },
      };
      return api;
    }
    function terrainPalette(season) {
      const shared = { earth: 0x886b53, soilLight: 0xb4936d, soilDark: 0x65583f, stone: 0xcec4a6, stoneLight: 0xe2d8b9, seam: 0x9b9d7c, bank: 0x8caa83, shallow: 0x9ac1ad, foam: 0xc6ddd0 };
      return { ...shared, ...(season === 'winter'
        ? { lawn: 0x9db8a4, light: 0xbacdb5, forest: 0x526f63, forestFloor: 0x789581, leaf: 0x739a84, leafLight: 0xa7c1a2, water: 0x76a8ad, deep: 0x4b7d8b, wild: 0x819d83 }
        : season === 'autumn'
          ? { lawn: 0x83a875, light: 0xa3bd83, forest: 0x355b46, forestFloor: 0x5d7d57, leaf: 0x638853, leafLight: 0xa0b675, water: 0x5b9b9a, deep: 0x387b89, wild: 0x6c8e62 }
          : { lawn: 0x7daa77, light: 0xa2c486, forest: 0x315c48, forestFloor: 0x587d56, leaf: 0x5c885a, leafLight: 0x99ba7b, water: 0x599f9d, deep: 0x347b8b, wild: 0x639264 }) };
    }
    function cultivatedSections(m) {
      const sections = new Set();
      const remember = (item, w, h) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const row = gardenLandCell(item.x + dx, item.y + dy); if (row) sections.add(row.id); } };
      for (const item of m.plants || []) { const def = item.def || gardenPlant(item.id); if (def) remember(item, def.fp || 1, def.fp || 1); }
      for (const item of m.decor || []) { const def = item.def || gardenDecor(item.id); if (def && def.layer === 'ground') remember(item, def.w || 1, def.h || 1); }
      return sections;
    }
    function clearPierDecks() {
      cacheQueue.delete(pierBoards);
      // Each native deck owns its Graphics and cached tiles. Removing the
      // node releases both once; these Graphics never enter terrainObjects.
      for (const record of pierDeckRecords.values()) { cacheQueue.delete(record.node); record.node.remove(); }
      pierDeckRecords.clear(); pierBoards.nativeBounds = null;
    }
    // The Painted village art style (94-garden-native-painted.js): the scene
    // kit's painting baked over the village and start area. Cells and walking
    // are shared; outside its feathered box the island keeps this painting.
    let packGround = null, packPlanting = null;
    function packOn() { const on = !!(window.GardenNativePainted && GardenNativePainted.wanted() && GardenNativePainted.ready() && typeof gardenIslandActive === 'function' && gardenIslandActive()); if (on) GardenNativePainted.overLayer = rootNode._inner; return on; }
    function clearPack() { if (packGround) packGround.destroy(); if (packPlanting) packPlanting.destroy(); packGround = packPlanting = null; if (window.GardenPaintNature) GardenPaintNature.clear(); }
    // Painted nature (94-garden-paint-*.js): the vale's water and woods, drawn from the layout.
    function natureLayers(sc, cellAt) { if (window.GardenPaintNature) try { GardenPaintNature.paint(scene, rootNode._inner, objects._inner || objects.target, { W, data: GardenIslandLayout.data, season: sc.season, tod: sc.tod, cellAt }); } catch (e) { GardenNativePainted.lastError = String(e && e.stack || e); } }
    function natureTick(time) { if (!window.GardenPaintNature) return; const cam = scene.cameras.main, zx = cam.zoomX || cam.zoom || 1, zy = cam.zoomY || cam.zoom || 1; GardenPaintNature.tick(time, { x: cam.scrollX + cam.width / 2 - cam.width / zx / 2, y: cam.scrollY + cam.height / 2 - cam.height / zy / 2, w: cam.width / zx, h: cam.height / zy }); }
    function packLayers(m, sc, island, cellAt, cultivatedNow, cells) {
      if (!island || !packOn()) return false;
      const D = GardenIslandLayout.data, start = D.anchors.start;
      const cbox = { x0: start.x - 18, x1: start.x + 18, y0: start.y - 26, y1: start.y + 17 };
      const box = { x: cbox.x0 * W.cellW, y: W.sky + cbox.y0 * W.cellH, w: (cbox.x1 - cbox.x0 + 1) * W.cellW, h: (cbox.y1 - cbox.y0 + 1) * W.cellH };
      const mark = test => cells.map((c, i) => ({ material: test(c, i % W.cols, Math.floor(i / W.cols)) ? 'm' : '' }));
      const wet = c => ['ocean', 'water', 'pool', 'lake', 'ice'].includes(c.material);
      const inBox = (x, y) => x >= cbox.x0 - 2 && x <= cbox.x1 + 2 && y >= cbox.y0 - 2 && y <= cbox.y1 + 2;
      // The sea edge is the island's own coast (the shared smooth outline);
      // inland water keeps its rounded cell contour.
      const coast = island.land.map(l => l.map(q => ({ x: q[0] * W.cellW, y: W.sky + q[1] * W.cellH })));
      const lawn = coast.map(l => insetTerrainContour(l, island.beachWidthPx));
      const lakes = outlines(cells.map((c, i) => ({ material: inBox(i % W.cols, Math.floor(i / W.cols)) && wet(c) && c.material !== 'ocean' ? 'water' : '' })), 'water', W);
      const pathLoops = outlines(mark((c, x, y) => inBox(x, y) && c.material === 'path'), 'm', W, true).map(l => insetTerrainContour(l, -2));
      // Owned beds: soil where something grows, a dug edge round an empty owned plot,
      // so plantable land always reads as plantable on the painted lawn.
      const soilSet = new Set(['bed', 'patch', 'veg', 'rich', 'herb', 'berry']);
      const soil = outlines(mark((c, x, y) => inBox(x, y) && soilSet.has(c.material)), 'm', W, true).map(l => insetTerrainContour(l, 2));
      const owned = outlines(mark((c, x, y) => inBox(x, y) && c.row && c.row.plot && !c.locked && !soilSet.has(c.material)), 'm', W, true).map(l => insetTerrainContour(l, 3));
      const pt = p => ({ x: p.x * W.cellW, y: W.sky + p.y * W.cellH });
      const routes = D.routes.filter(r => r.points && r.points.length > 1).map(r => { const st = gardenIslandRoadStyle(r); return { main: st.main, width: st.main ? 40 : 26, points: gardenIslandRoutePath(r).points.map(pt) }; });
      const pc = pt({ x: start.x + .5, y: start.y + .5 }), pw = 250, ph = 130;
      const plaza = { centre: pc, bounds: { x: pc.x - pw / 2, y: pc.y - ph / 2, w: pw, h: ph }, points: terrainRoundedRect(pc.x - pw / 2, pc.y - ph / 2, pw, ph, 40) };
      const meadow = (px, py) => { const c = cellAt(Math.floor(px / W.cellW), Math.floor((py - W.sky) / W.cellH)); return !!c && !wet(c) && !['beach', 'path'].includes(c.material) && Math.hypot((px - pc.x) / pw, (py - pc.y) / ph) > .62; };
      const sig = [cbox.x0, cbox.y0, (sc.areas || []).join(','), cultivatedNow ? [...cultivatedNow].sort().join(',') : '', lakes.length, pathLoops.length].join('|');
      try { packGround = GardenNativePainted.ground(scene, rootNode._inner, { W, box, coast, lawn, lakes, paths: pathLoops, routes, plaza, meadow, soil, owned, season: sc.season, sig: sig + '|' + soil.length + ':' + owned.length }); }
      catch (e) { GardenNativePainted.lastError = String(e && e.stack || e); return false; }
      const blocked = new Set(); for (const p of D.static) { const boxes = [p, p.apron].filter(Boolean); for (const b of boxes) for (let y = Math.floor(b.y) - 1; y <= b.y + b.h; y++) for (let x = Math.floor(b.x) - 1; x <= b.x + b.w; x++) blocked.add(x + ',' + y); }
      // Planting keeps clear of every path, doorway, owned plot and saved
      // plant or decoration; land not yet bought grows wild until it is.
      const taken = new Set(); for (const item of (m.plants || []).concat(m.decor || [])) for (let y = item.y - 1; y <= item.y + 2; y++) for (let x = item.x - 1; x <= item.x + 2; x++) taken.add(x + ',' + y);
      const near = (x, y, r, test) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const c = cellAt(x + dx, y + dy); if (c && test(c)) return true; } return false; };
      const isPath = c => c.material === 'path' || c.material === 'beach';
      const spot = (x, y) => {
        const c = cellAt(x, y); if (!c || blocked.has(x + ',' + y) || taken.has(x + ',' + y)) return '';
        if (c.material === 'beach' && near(x, y, 1, wet) && !near(x, y, 1, cc => cc.material === 'path')) return 'shore';
        if (wet(c) || c.material === 'beach' || c.material === 'path') return '';
        if (typeof gardenIslandRegionAt === 'function') { const r = gardenIslandRegionAt(x + .5, y + .5); if (r && r.zone) return ''; }
        if (near(x, y, 1, isPath)) return '';
        if (c.row && c.locked) return ['wood', 'orchard', 'dell'].includes(c.row.kind) || c.row.solid ? 'tree' : 'wild';
        if (c.row && c.row.plot) return '';
        return near(x, y, 2, isPath) ? 'edge' : 'tree';
      };
      try { packPlanting = GardenNativePainted.planting(scene, objects._inner || objects.target, { W, box: cbox, spot, season: sc.season }); } catch (e) { GardenNativePainted.lastError = String(e && e.stack || e); }
      natureLayers(sc, cellAt);
      sorted = true;
      return true;
    }
    function drawTerrain(m, sc, lake, cultivated, decks) {
      if (terrain._cache) terrain._uncache(); clearPierDecks(); clearPack();
      for (const chunk of terrainChunks.values()) { cacheQueue.delete(chunk.node); chunk.node.remove(); } terrainChunks.clear(); terrainBaseQueue.clear();
      for (const old of terrainObjects) old.destroy(); terrainObjects.length = 0; terrainLabels.length = 0; markers.length = 0;
      waterRegions.length = 0; lockedRegions.length = 0; gateRows.length = 0; forestRows.length = 0; surfaceRevision++; frontierMetadata.revision = surfaceRevision;
      terrain.nativeBounds = { x: 0, y: 0, width, height }; pierBoards.nativeBounds = null;
      const island = typeof gardenIslandActive === 'function' && gardenIslandActive() ? gardenIslandGeometry() : null;
      const coast = island ? island.land.map(loop => loop.map(point => ({ x: point[0] * W.cellW, y: W.sky + point[1] * W.cellH }))) : [];
      const p = terrainPalette(sc.season), g = terrainPainter(0), cells = new Array(W.cols * W.rows), kinds = new Set(), level = m.level.level;
      oceanBackdrop.clear().setVisible(!!island);
      if (island) {
        oceanBackdrop.fillStyle(p.water).fillRect(-3000, -3000, width + 6000, height + 6000);
        // Exact shared coast outside; an inland sand band only changes paint.
        for (const loop of coast) {
          fillOutlines(g, [loop], sc.season === 'winter' ? 0xd4d1b5 : 0xd9c99f);
          fillOutlines(g, [insetTerrainContour(loop, 10)], sc.season === 'winter' ? 0xdedcc5 : 0xe4d6b2);
          fillOutlines(g, [insetTerrainContour(loop, island.beachWidthPx * .86)], woodlandFloorTone(p.lawn, 0xd9c99f, .22));
          fillOutlines(g, [insetTerrainContour(loop, island.beachWidthPx)], p.lawn);
        }
        const b = island.visualOceanBounds, points = [{ x: b.x * W.cellW, y: W.sky + b.y * W.cellH }, { x: (b.x + b.w) * W.cellW, y: W.sky + b.y * W.cellH }, { x: (b.x + b.w) * W.cellW, y: W.sky + (b.y + b.h) * W.cellH }, { x: b.x * W.cellW, y: W.sky + (b.y + b.h) * W.cellH }];
        waterRegions.push({ id: 'ocean:' + island.revision, ocean: true, points, holes: coast.map(loop => loop.slice().reverse()), bounds: terrainBox(points), frozen: false });
      }
      const soilKinds = new Set(['bed', 'patch', 'veg', 'rich', 'herb', 'berry']), woods = new Set(['wood', 'dell', 'wild']);
      if (!island) g.fillStyle(p.lawn).fillRect(0, W.sky, width, height - W.sky);
      // Owning an empty section does not turn its whole footprint into a dirt
      // patch. Cultivated ground stays visible beneath plants and ground decor;
      // planting/land guides still describe the unchanged canonical sections.
      for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
        const row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null, area = gardenAreaAt(x, y, level), locked = String(area).startsWith('locked:');
        const islandCell = island ? gardenIslandBaseCell(x, y) : null;
        const water = gardenIsWater(x, y), iceCell = typeof _GD_ICE !== 'undefined' && _GD_ICE.has(x + ',' + y), fixedLand = typeof _GD_WALK_EXTRA !== 'undefined' && _GD_WALK_EXTRA.has(x + ',' + y), prop = iceCell && typeof gardenPropAt === 'function' ? gardenPropAt(x, y) : null, frozen = iceCell && (island || !lake || lake.cellContains(x, y)) && !fixedLand && !(prop && prop.walk), path = !!(row && (row.lane || row.trail)) && !locked;
        let material = frozen ? 'ice' : islandCell && islandCell.ocean ? 'ocean' : water ? lake && lake.cellContains(x, y) ? 'lake' : 'water' : islandCell && islandCell.beach ? 'beach' : path ? 'path' : row && row.solid ? 'wild' : row && row.kind || 'green';
        // Future growing plots stay part of the landscape until they open;
        // a map full of tiny unowned soil patches overwhelms the village.
        if (island && row && soilKinds.has(row.kind) && (locked || !cultivated.has(row.id))) material = 'green';
        cells[y * W.cols + x] = { material, locked, area, row, water }; kinds.add(material);
      }
      const lakeHoles = lake && !island ? outlines(cells.map((c, index) => ({ material: lake.cellContains(index % W.cols, Math.floor(index / W.cols)) && (!c.water || c.material === 'ice') ? 'hole' : '' })), 'hole', W, true).filter(loop => polygonArea(loop) > 0).map(loop => loop.slice().reverse()) : [];
      const frozenLake = lake && kinds.has('ice') && !kinds.has('lake');
      const cellAt = (x, y) => x >= 0 && y >= 0 && x < W.cols && y < W.rows ? cells[y * W.cols + x] : null;
      const woodland = (x, y) => { const c = cellAt(x, y); return !!c && !c.water && c.material !== 'ice' && (!island || !['ocean', 'beach'].includes(c.material)) && (!island && c.locked || c.row && c.row.solid || woods.has(c.material)); };
      const lockedCells = cells.map((c, index) => ({ material: c.locked && (!island || !gardenIslandOceanCell(index % W.cols, Math.floor(index / W.cols))) ? c.area.slice(7) : '' }));
      const authoredRegions = island && typeof _gldIslandRegionGeometry === 'function' ? _gldIslandRegionGeometry() : [];
      const regionOpen = new Set(sc.areas || []);
      for (const region of authoredRegions) if (region.zone && !regionOpen.has('zn-' + region.zone)) lockedRegions.push(region);
      for (const id of authoredRegions.length ? [] : new Set(lockedCells.map(c => c.material).filter(Boolean))) {
        const loops = outlines(lockedCells, id, W, true), holes = loops.filter(loop => polygonArea(loop) < 0);
        for (const points of loops.filter(loop => polygonArea(loop) > 0)) lockedRegions.push({ id: id + ':' + lockedRegions.length, area: id, zone: /^zn-/.test(id) ? Number(id.slice(3)) : null, points, holes: holes.filter(hole => insidePolygon(hole[0], points)), bounds: terrainBox(points) });
      }
      // Regional ground follows the authored coast, but the shared beach
      // band, water and paths keep their own materials. Chunked paint owns
      // these broad, quiet tones just like ordinary terrain.
      if (authoredRegions.length) {
        const regionFloor = cells.map((cell, index) => {
          if (['ocean', 'beach', 'water', 'pool', 'lake', 'ice', 'path'].includes(cell.material)) return { material: '' };
          const region = gardenIslandRegionAt(index % W.cols + .5, Math.floor(index / W.cols) + .5);
          return { material: region ? region.id : '' };
        });
        for (const region of gardenIslandData().regions) {
          const tone = parseInt(_gldIslandRegionTone(region, sc.season).slice(1), 16);
          fillOutlines(g, outlines(regionFloor, region.id, W), woodlandFloorTone(p.lawn, tone, .42));
        }
      }
      const borders = new Map();
      // Wood, dell and wild share one floor colour: join their visual floor
      // across section borders, while all canonical cells stay unchanged.
      const floorCells = cells.map(cell => ({ material: woods.has(cell.material) ? 'woodland-floor' : '' }));
      // A single quiet floor avoids contour stripes. Its small inward waves
      // share world coordinates across chunks; short rounded corners stay put.
      const floorLoops = outlines(floorCells, 'woodland-floor', W).map(loop => naturalTerrainContour(loop, 6.5));
      fillOutlines(g, floorLoops, woodlandFloorTone(p.lawn, p.forestFloor, island ? .48 : .84));
      // Other surfaces retain their exact contours and paint above this floor.
      const otherWaterLoops = typeof gardenOtherWaterLoops === 'function' ? gardenOtherWaterLoops(m) : null; let otherWaterPainted = false;
      const paintOrder = [...kinds].sort((a, b) => (a === 'ice' ? 3 : ['lake', 'water', 'pool'].includes(a) ? 2 : 0) - (b === 'ice' ? 3 : ['lake', 'water', 'pool'].includes(b) ? 2 : 0));
      for (const kind of paintOrder) {
        if (woods.has(kind) || island && (kind === 'ocean' || kind === 'beach' || !soilKinds.has(kind) && !['path', 'ice', 'water', 'pool', 'lake'].includes(kind))) continue;
        const otherWater = otherWaterLoops && (kind === 'water' || kind === 'pool'); if (otherWater && otherWaterPainted) continue; if (otherWater) otherWaterPainted = true;
        const water = kind === 'water' || kind === 'pool' || kind === 'lake', soil = soilKinds.has(kind);
        const base = kind === 'ice' ? 0xb9d4d1 : water ? p.water : kind === 'path' ? island ? woodlandFloorTone(p.lawn, p.stone, .25) : p.stone : soil ? p.earth : p.lawn;
        let loops = otherWater ? otherWaterLoops : lake && !island && (kind === 'lake' || kind === 'ice' && frozenLake) ? [lake.points.map(point => ({ x: point.x * W.cellW, y: W.sky + point.y * W.cellH }))] : outlines(cells, kind, W);
        if (lake && !island && (kind === 'lake' || kind === 'ice' && frozenLake) && polygonArea(loops[0]) < 0) loops = [loops[0].slice().reverse()];
        borders.set(kind, loops); if (!(island && kind === 'path')) fillOutlines(island && kind === 'ice' ? terrainPainter(1) : g, loops, base);
        if (water || kind === 'ice') {
          const holes = kind === 'lake' ? lakeHoles : loops.filter(loop => polygonArea(loop) <= 0);
          for (const points of loops.filter(loop => polygonArea(loop) > 0)) waterRegions.push({ id: kind + ':' + waterRegions.length, points, holes: kind === 'lake' ? holes : holes.filter(hole => insidePolygon(hole[0], points)), holesCrossBoundary: kind === 'lake' && holes.some(hole => hole.some(point => !insidePolygon(point, points))), bounds: terrainBox(points), frozen: kind === 'ice' });
        }
      }
      if (island) {
        // The reservation remains broad enough for two players. A continuous
        // inner path and quiet grass shoulders make it read as a village walk,
        // rather than a road stamped from the square reservation cells.
        const routeColor = woodlandFloorTone(p.stone, 0xbda780, .42), routeEdge = woodlandFloorTone(p.lawn, routeColor, .35);
        const pointOf = point => ({ x: point.x * W.cellW, y: W.sky + point.y * W.cellH });
        const pathAt = point => cellAt(Math.floor(point.x), Math.floor(point.y))?.material === 'path';
        const routePoints = gardenIslandRoutePath;
        const paintRoute = (route, radius, color) => {
          const gate = route.gateId && GardenIslandLayout.data.gates.find(g => g.id === route.gateId), closed = gate && !(sc.areas || []).includes('zn-' + gate.n);
          const sampled = routePoints(route), points = sampled.points, sides = points.map((p, i) => { const a = points[i ? i - 1 : sampled.closed ? points.length - 2 : 0], b = points[i < points.length - 1 ? i + 1 : sampled.closed ? 1 : i], length = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length; return [{ x: p.x + nx * radius, y: p.y + ny * radius }, { x: p.x - nx * radius, y: p.y - ny * radius }]; });
          g.fillStyle(color);
          for (let i = 1; i < points.length; i++) {
            // Clip each small strip to the actual open path cells. Rejecting
            // an entire strip when one corner crossed a cell edge left gaps
            // and detached scraps near bends and closed district boundaries.
            const quad = [sides[i - 1][0], sides[i][0], sides[i][1], sides[i - 1][1]];
            const bounds = terrainBox(quad), x0 = Math.max(0, Math.floor(bounds.x)), y0 = Math.max(0, Math.floor(bounds.y)), x1 = Math.min(W.cols - 1, Math.ceil(bounds.x + bounds.width) - 1), y1 = Math.min(W.rows - 1, Math.ceil(bounds.y + bounds.height) - 1);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
              // Another public apron can overlap this closed branch. Keep its
              // clear ground without painting an isolated route beyond the gate.
              if (closed && (x - gate.x) * gate.dx + (y - gate.y) * gate.dy >= 0) continue;
              const cell = cellAt(x, y);
              // Rounded authored bends can pass through the clear shoulder of
              // a path cell. Clipping them to centre-classified path cells
              // cuts square notches into an otherwise continuous curve.
              if (!cell || cell.locked || cell.water || cell.row && (cell.row.plot || cell.row.solid) || cell.material === 'beach' || cell.material === 'ocean') continue;
              const clipped = clipTerrainPolygon(quad, { x, y, width: 1, height: 1 });
              if (clipped.length > 2 && Math.abs(polygonArea(clipped)) > 1e-8) g.fillPoints(clipped.map(pointOf));
            }
          }
        };
        const routes = GardenIslandLayout.data.routes.filter(route => route.points && route.points.length > 1);
        for (const route of routes) { const style = gardenIslandRoadStyle(route); paintRoute(route, style.edgeRadius, style.main ? woodlandFloorTone(p.lawn, 0x9b9273, .56) : routeEdge); }
        for (const route of routes) { const style = gardenIslandRoadStyle(route); paintRoute(route, style.radius, style.main ? woodlandFloorTone(p.stone, 0xd9cca9, .68) : routeColor); }
        // Quiet paving joints identify the main arrival road at walking scale.
        // They share its retained ground batch and add no interactive objects.
        g.lineStyle(.65, 0x8c8165, .25);
        for (const route of routes) for (const joint of gardenIslandRoadJoints(route)) {
          const cell = cellAt(Math.floor(joint.x), Math.floor(joint.y));
          if (!cell || cell.locked || cell.water || cell.row && cell.row.plot) continue;
          const a = pointOf(joint.a), b = pointOf(joint.b); g.lineBetween(a.x, a.y, b.x, b.y);
        }
        // A doorway gets a small rounded forecourt, not a painted rectangle
        // covering its full physical reservation. Spare apron stays clear lawn.
        for (const prop of GardenIslandLayout.data.static) {
          const a = prop.apron; if (!a || !prop.door) continue;
          const fw = Math.min(2.8, prop.w + .4, a.w - .4), fh = Math.min(1.25, a.h - .2);
          const x = clamp(prop.door.x + .5 - fw / 2, a.x + .1, a.x + a.w - fw - .1), y = clamp(prop.y + prop.h + .1, a.y + .1, a.y + a.h - fh - .1);
          const points = terrainRoundedRect(x * W.cellW, W.sky + y * W.cellH, fw * W.cellW, fh * W.cellH, 12);
          if (!points.every(point => pathAt({ x: point.x / W.cellW, y: (point.y - W.sky) / W.cellH }))) continue;
          g.fillStyle(woodlandFloorTone(p.stone, routeColor, .5)).fillPoints(points);
        }
      }
      const paintCrown = (cx, cy, rx, ry, seed, color) => {
        const points = woodlandCrown(cx, cy, rx, ry, seed);
        g.fillStyle(color).fillPoints(points);
        // One joined crown reads as a tree at map scale. Its rounded light
        // mass is offset toward the sun, leaving a quiet lower canopy shade.
        const shade = points.slice(2, 24).concat([{ x: cx - rx * .51, y: cy + ry * .22 }, { x: cx - rx * .05, y: cy + ry * .35 }, { x: cx + rx * .57, y: cy + ry * .08 }]);
        g.fillStyle(p.forest, .22).fillPoints(shade);
        g.fillStyle(color === 0xa18e57 ? 0xc1af79 : p.leafLight, .28).fillPoints(woodlandCrown(cx - rx * .21, cy - ry * .34, rx * .67, ry * .48, seed + 137));
      };
      for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
        const cell = cells[y * W.cols + x], kind = cell.material, px = x * W.cellW, py = W.sky + y * W.cellH, seed = hash(x + ',' + y);
        if (kind === 'path') {
          if (!island && cell.row && cell.row.lane && y >= 19 && y <= 20) {
            for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
              const sx = px + column * 16 + .7, sy = py + row * 10 + .7, variant = (seed + row * 7 + column * 11) % 5;
              g.fillStyle(variant === 0 ? 0xb8b99c : variant === 1 ? 0xdad2b4 : 0xc5c2a5, .6).fillRoundedRect(sx, sy, 14.6, 8.6, 1.8);
              g.lineStyle(.55, p.stoneLight, .5).lineBetween(sx + 2, sy + 1.2, sx + 12.6, sy + 1.2);
              g.lineStyle(.5, p.seam, .24).lineBetween(sx + 2, sy + 8, sx + 12.6, sy + 8);
            }
          }
          if (!island && seed % 17 === 0) g.fillStyle(p.stoneLight, .34).fillEllipse(px + 14 + seed % 18, py + 13, 3.2, 1.5).fillStyle(p.seam, .2).fillEllipse(px + 17 + seed % 18, py + 17, 1.8, 1);
          if (!island && seed % 31 === 0) g.fillStyle(0xe4d9b9, .28).fillPoints([{ x: px + 16, y: py + 11 }, { x: px + 31, y: py + 10 }, { x: px + 35, y: py + 17 }, { x: px + 20, y: py + 20 }, { x: px + 13, y: py + 16 }]);
        } else if (kind === 'ice') {
          if (seed % 17 === 0) (island ? terrainPainter(1) : g).lineStyle(.75, 0xe2eeeb, .45).lineBetween(px + 3, py + 18, px + 20, py + 13).lineBetween(px + 20, py + 13, px + 35, py + 15).lineStyle(.55, 0x7ea9b0, .3).lineBetween(px + 20, py + 13, px + 24, py + 6);
        } else if (kind === 'lake') {
          if (seed % 29 === 0) g.lineStyle(.8, p.foam, .2).lineBetween(px + 7, py + 16, px + 25, py + 15).lineBetween(px + 30, py + 15, px + 38, py + 16);
        } else if (island && (kind === 'ocean' || kind === 'beach')) {
          // Continuous coast paint owns these cells; no tiled lawn or streaks.
        } else if (kind === 'water' || kind === 'pool') {
          // Small waters keep the engine's curved ripples, without a second
          // set of static straight streaks crossing their shallow margins.
        } else if (soilKinds.has(kind)) {
          if (seed % 7 === 0) g.fillStyle(0xc2a17a, .16).fillEllipse(px + 18, py + 17, 2.6, 1.3);
          if (['patch', 'veg', 'rich'].includes(kind) && x % 3 === 0) g.lineStyle(.8, 0x594e3b, .15).lineBetween(px + 11, py + 19, px + 37, py + 19);
        } else if (woodland(x, y)) {
          const interior = woodland(x - 1, y) && woodland(x + 1, y) && woodland(x, y - 1) && woodland(x, y + 1);
          if (interior && x % 3 === 0 && y % 3 === 0) {
            const cx = px + 24 + seed % 35 - 17, foot = py + 30 + (seed >>> 5) % 23 - 11;
            const front = !woodland(x, y + 2) || !woodland(x - 1, y + 2) || !woodland(x + 1, y + 2);
            if (front) {
              g.fillStyle(0x345c45, .1).fillEllipse(cx + 2, foot + 3, 67, 12);
              g.lineStyle(3, 0x6d7350, .9).lineBetween(cx, foot + 4, cx - 2, foot - 27).lineStyle(1.8, 0x6d7350, .9).lineBetween(cx - 1, foot - 16, cx - 13, foot - 31).lineBetween(cx - 1, foot - 20, cx + 11, foot - 34);
            }
            const copper = sc.season === 'autumn' && seed % 7 === 0, unplantable = cell.locked || cell.row && cell.row.solid, rx = (unplantable ? 71 : 49) + (seed >>> 7) % 19, ry = (unplantable ? 61 : 43) + (seed >>> 11) % 18;
            paintCrown(cx + (seed >>> 15) % 15 - 7, foot - (unplantable ? 91 : 54) - seed % 13, rx, ry, seed, copper ? 0xa18e57 : seed % 3 === 0 ? sc.season === 'winter' ? 0x89ab95 : 0x73935e : p.leaf);
            if (unplantable && front && forestRows.length < 22) forestRows.push({ id: 'forest:' + x + ':' + y, x: cx, y: foot, height: 162 + seed % 41, width: 66 + (seed >>> 7) % 24, seed, kind: 'tree' });
          } else if (!interior && woodland(x, y - 1) && seed % 11 === 0) {
            const cx = px + 22 + seed % 6, foot = py + 25;
            g.lineStyle(2.2, 0x73744e).lineBetween(cx, foot + 2, cx - 1, foot - 25).lineStyle(1.2, 0x73744e).lineBetween(cx, foot - 14, cx - 9, foot - 28);
            paintCrown(cx - 1, foot - 40, 20 + seed % 5, 25 + (seed >>> 4) % 6, seed, p.leaf);
          } else if (!interior && seed % 9 === 0) {
            g.fillStyle(p.leaf, .83).fillPoints(woodlandCrown(px + 23, py + 11, 20 + seed % 8, 11 + (seed >>> 3) % 5, seed));
          }
        } else {
          if (seed % 29 === 0) g.lineStyle(.8, 0xd4dfa5, .3).lineBetween(px + 18, py + 20, px + 16, py + 15).lineBetween(px + 19, py + 20, px + 22, py + 16);
          if (seed % 83 === 0) g.fillStyle(sc.season === 'winter' ? 0xe1e9d7 : 0xf0e1a4, .65).fillCircle(px + 21, py + 16, 1.2).fillCircle(px + 25, py + 19, 1);
        }
      }
      for (const [kind, loops] of borders) {
        if (kind === 'lake') {
          for (const [w, c, a] of [[6, p.bank, .42], [2.2, p.shallow, .48]]) { g.lineStyle(w, c, a); for (const loop of loops) g.strokePoints(loop, true); }
        } else if (kind === 'water' || kind === 'pool') {
          // The shallow shelf belongs inside the shared physical outline.
          // Its gently varying width avoids a bright tubular pond border.
          for (const loop of loops) {
            const inset = insetTerrainContour(loop, 6.5).map((point, i) => { const edge = loop[i], k = .83 + .17 * Math.sin(edge.x * .041 + edge.y * .033); return { x: edge.x + (point.x - edge.x) * k, y: edge.y + (point.y - edge.y) * k }; });
            for (let i = 0; i < loop.length; i++) {
              const j = (i + 1) % loop.length, a = loop[i], b = loop[j], c = inset[j], d = inset[i];
              g.fillStyle(p.shallow, .23).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y).fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
              const light = b.x - a.x > b.y - a.y;
              g.lineStyle(light ? .8 : 1.1, light ? 0xbdc5a0 : 0x688d73, light ? .42 : .48).lineBetween(a.x, a.y, b.x, b.y);
              if (light && i % 4 !== 0) g.lineStyle(.6, p.foam, .24).lineBetween(d.x, d.y, c.x, c.y);
            }
          }
        } else if (kind === 'path' && !island) {
          for (const loop of loops) for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length], light = b.x - a.x > b.y - a.y; g.lineStyle(light ? .9 : 1.1, light ? p.stoneLight : p.seam, light ? .5 : .27).lineBetween(a.x, a.y, b.x, b.y); }
        } else if (soilKinds.has(kind)) {
          for (const loop of loops) for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length], light = b.x - a.x > b.y - a.y; g.lineStyle(light ? .9 : 1.1, light ? p.soilLight : p.soilDark, light ? .34 : .28).lineBetween(a.x, a.y, b.x, b.y); }
        }
      }
      if (authoredRegions.length) forestRows.push(..._gldIslandRegionStands());
      const smallWaters = waterRegions.filter(region => !region.frozen && !region.ocean && !region.id.startsWith('lake:'));
      const withinWater = (x, y, region) => insidePolygon({ x, y }, region.points) && !region.holes.some(hole => insidePolygon({ x, y }, hole));
      const occupiedBank = (x, y) => {
        const gx = x / W.cellW, gy = (y - W.sky) / W.cellH, cell = cellAt(Math.floor(gx), Math.floor(gy));
        if (!cell || cell.material === 'path' || soilKinds.has(cell.material) || cell.row && (cell.row.lane || cell.row.trail)) return true;
        if (typeof gardenPropAt === 'function' && gardenPropAt(Math.floor(gx), Math.floor(gy))) return true;
        return (m.plants || []).some(item => { const span = (gardenPlant(item.id) || {}).fp || 1; return gx >= item.x - .12 && gy >= item.y - .12 && gx <= item.x + span + .12 && gy <= item.y + span + .12; })
          || (m.decor || []).some(item => { const def = gardenDecor(item.id) || {}; return gx >= item.x - .12 && gy >= item.y - .12 && gx <= item.x + (def.w || 1) + .12 && gy <= item.y + (def.h || 1) + .12; });
      };
      for (const region of smallWaters) {
        let placed = 0;
        for (const [loopIndex, loop] of [region.points, ...region.holes].entries()) {
          let traveled = 0, next = 21 + hash(region.id + ':' + loopIndex) % 37;
          for (let i = 0; i < loop.length && placed < 7; i++) {
            const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy); if (length < .001) continue;
            while (next < traveled + length && placed < 7) {
              const along = (next - traveled) / length, x = a.x + dx * along, y = a.y + dy * along, tx = dx / length, ty = dy / length, nx = -ty, ny = tx, seed = hash(region.id + ':' + Math.round(next));
              next += 72 + seed % 47;
              const wetX = x + nx * 4.5, wetY = y + ny * 4.5, dryX = x - nx * 5, dryY = y - ny * 5;
              if (seed % 3 === 0 && withinWater(wetX, wetY, region) && withinWater(wetX + tx * 5 + nx * 2, wetY + ty * 5 + ny * 2, region)) {
                g.lineStyle(.8, 0xb1c6ad, .28).lineBetween(wetX - tx * 2, wetY - ty * 2, wetX + tx * 3 + nx, wetY + ty * 3 + ny);
                g.fillStyle(0x597f71, .23).fillEllipse(wetX + nx * 2, wetY + ny * 2, 4.6, 2.1);
              }
              if (occupiedBank(dryX, dryY) || smallWaters.some(water => withinWater(dryX, dryY, water))) continue;
              // Keep each low footprint wholly on dry bank, clear of paths,
              // props and owned planting; no water or movement mask changes.
              const bankDry = [[-6, 0], [6, 0], [0, -3], [0, 3]].every(([ox, oy]) => !smallWaters.some(water => withinWater(dryX + ox, dryY + oy, water)) && !occupiedBank(dryX + ox, dryY + oy));
              if (!bankDry) continue; placed++;
              if (seed % 4 !== 0 && sc.season !== 'winter') {
                g.fillStyle(0x678d68, .3).fillEllipse(dryX, dryY + 1, 13, 4);
                const lean = (seed % 5 - 2) * .6, h = 8 + seed % 6;
                g.lineStyle(.95, 0x577e5b, .86).lineBetween(dryX - 3, dryY, dryX - 5 + lean, dryY - h * .72).lineBetween(dryX, dryY, dryX + lean, dryY - h).lineBetween(dryX + 3, dryY, dryX + 6 + lean, dryY - h * .58);
                if (seed % 5 === 0) g.fillStyle(0x928459, .83).fillEllipse(dryX + lean, dryY - h + 1, 1.6, 4.2);
              } else {
                g.fillStyle(0x4e755f, .18).fillEllipse(dryX + 1, dryY + 1.5, 11, 3.6);
                g.fillStyle(seed % 2 ? 0xb2b89a : 0xabb39a, .9).fillEllipse(dryX - 1, dryY, 7.5, 3.8).fillStyle(0xd0d0b2, .65).fillEllipse(dryX - 2, dryY - .7, 4.2, 1.4);
                g.fillStyle(0x94a58a, .88).fillEllipse(dryX + 4.4, dryY + 1.2, 3.4, 2.2);
              }
            }
            traveled += length;
          }
        }
      }
      // Low reeds and river stones belong to the bank, not a tiled water grid.
      if (!island) for (let y = 1; y < W.rows - 1; y++) for (let x = 1; x < W.cols - 1; x++) {
        const c = cellAt(x, y), seed = hash('bank' + x + ',' + y); if (!c || c.water || c.material === 'path' || soilKinds.has(c.material)) continue;
        const near = [[0, -1], [1, 0], [0, 1], [-1, 0]].find(([dx, dy]) => cellAt(x + dx, y + dy)?.material === 'lake'); if (!near || seed % 4) continue;
        const xx = (x + .5 + near[0] * .38) * W.cellW, yy = W.sky + (y + .5 + near[1] * .38) * W.cellH;
        g.fillStyle(0x698d6a, .52).fillEllipse(xx, yy + 2, 27, 8);
        g.lineStyle(1.2, 0x537f60, .85).lineBetween(xx - 5, yy, xx - 8, yy - 15).lineBetween(xx, yy + 1, xx + 1, yy - 21).lineBetween(xx + 5, yy, xx + 9, yy - 13);
        g.fillStyle(0xc2c4a3, .86).fillEllipse(xx + 12, yy + 3, 9, 4).fillStyle(0x8b9c7e, .6).fillEllipse(xx + 14, yy + 4, 8, 3);
      }
      for (const pier of decks) {
        const x = pier.x * W.cellW, y = W.sky + pier.y * W.cellH, w = pier.w * W.cellW, h = pier.h * W.cellH;
        const node = element(scene, 'g', { class: 'gd-pier-deck', 'data-pier': pier.id }), pg = scene.add.graphics();
        const b = pier.side === 'south' ? { x: x - 6, y: y - 1, width: w + 17, height: h + 13 } : { x: x - 4, y: y - 5, width: w + 8, height: h + 14 };
        node.nativeBounds = b; pierBoards.appendChild(node); node._inner.add(pg);
        pierDeckRecords.set(pier.id, { node, bounds: b });
        // The parent union is diagnostic only; caches and culling use each deck.
        const old = pierBoards.nativeBounds;
        pierBoards.nativeBounds = old ? { x: Math.min(old.x, b.x), y: Math.min(old.y, b.y), width: Math.max(old.x + old.width, b.x + b.width) - Math.min(old.x, b.x), height: Math.max(old.y + old.height, b.y + b.height) - Math.min(old.y, b.y) } : b;
        if (pier.side === 'south') {
          pg.fillStyle(0x315d54, .22).fillRoundedRect(x + 9, y + 11, w + 1, h, 5).fillStyle(0x796c51).fillRoundedRect(x - 4, y, w + 8, h, 4);
          for (let yy = y + 3; yy < y + h - 3; yy += 14) { pg.fillStyle(Math.floor(yy / 14) % 3 ? 0xb19a71 : 0xbda77c).fillRect(x + 1, yy, w - 2, 12.5); pg.lineStyle(.8, 0xe6d5a8, .42).lineBetween(x + 7, yy + 2, x + w - 7, yy + 2); pg.fillStyle(0x68694e, .55).fillCircle(x + 7, yy + 8, .8).fillCircle(x + w - 7, yy + 8, .8); }
          for (const xx of [x - 1, x + w + 1]) pg.fillStyle(0x716c50).fillRoundedRect(xx - 3, y + 4, 6, 16, 2).fillStyle(0xd0bd8c).fillEllipse(xx, y + 4, 7, 4);
        } else {
          // Side decks retain a shallow timber edge and two water-end supports.
          const waterEnd = pier.side === 'west' ? x + 3 : x + w - 3, endFace = pier.side === 'west' ? x - 3 : x + w - 1, endBevel = pier.side === 'west' ? x - .8 : x + w + .8;
          const cap = sc.season === 'winter' ? 0xd0c2aa : 0xd2ac78;
          pg.fillStyle(0x315d54, .22).fillRoundedRect(x + 3, y + 3, w, h + 4, 3);
          for (const yy of [y + 6, y + h - 6]) {
            pg.fillStyle(0x6e4c2a).fillRect(waterEnd - 2.8, yy, 5.6, 11).fillStyle(0x6e4c2a, .55).fillRect(waterEnd - 2.8, yy + 11, 5.6, 3);
            pg.fillStyle(0xc49a64, .4).fillRect(waterEnd - 1.8, yy + 2, 1.2, 10);
          }
          pg.fillStyle(0x6e4c2a).fillRoundedRect(x, y + h - 1, w, 5, 1.5).fillRoundedRect(endFace, y + 2, 4, h + 2, 1);
          pg.lineStyle(.7, 0xb28650, .45).lineBetween(x + 8, y + h + 1, x + w - 8, y + h + 1);
          pg.lineStyle(.8, 0x4c3218, .55).lineBetween(x + 1, y + h + 3, x + w - 1, y + h + 3);
          pg.lineStyle(.7, 0xd2ac78, .35).lineBetween(endBevel, y + 4, endBevel, y + h - 3);
          pg.fillStyle(0x796c51).fillRoundedRect(x, y, w, h, 3);
          for (let xx = x + 3; xx < x + w - 3; xx += 14) { const bw = Math.min(12.5, x + w - 3 - xx); pg.fillStyle(Math.floor(xx / 14) % 3 ? 0xb19a71 : 0xbda77c).fillRect(xx, y + 1, bw, h - 2); pg.lineStyle(.8, 0xe6d5a8, .42).lineBetween(xx + 2, y + 7, xx + 2, y + h - 7); pg.fillStyle(0x68694e, .55).fillCircle(xx + bw / 2, y + 7, .8).fillCircle(xx + bw / 2, y + h - 7, .8); }
          pg.lineStyle(.8, 0xe8d0a0, .55).lineBetween(x + 1, y + 1, x + w - 1, y + 1).lineBetween(x + 1, y + h - 1, x + w - 1, y + h - 1);
          for (const yy of [y + 6, y + h - 6]) {
            pg.fillStyle(cap).fillEllipse(waterEnd, yy, 7, 4);
            pg.lineStyle(.65, 0x8a6238, .7).strokeEllipse(waterEnd, yy + .2, 4.4, 2.2);
          }
          const entrance = pier.side === 'west' ? x + w - 6 : x + 6;
          for (const yy of [y + 6, y + h - 6]) pg.fillStyle(0x716c50).fillRoundedRect(entrance - 3, yy - 8, 6, 11, 2).fillStyle(0xd0bd8c).fillEllipse(entrance, yy - 8, 7, 4);
        }
      }
      const entry = island && GardenIslandLayout.data.anchors.start;
      const cx = (entry ? entry.x : 22.5) * W.cellW, cy = W.sky + (entry ? entry.y : 20.5) * W.cellH;
      if (packLayers(m, sc, island, cellAt, cultivated, cells)) { /* the pack's plaza replaces the painted arrival disc */ } else g.fillStyle(0xb8b491).fillEllipse(cx, cy, 65, 26).lineStyle(1.1, 0x7f9270, .8).strokeEllipse(cx, cy, 65, 26).lineStyle(.8, 0xe2dcb9, .65).strokeEllipse(cx, cy, 56, 21);
      g.fillStyle(0x788d6c, .8).fillTriangle(cx, cy - 7, cx + 3, cy + 1, cx - 3, cy + 1).fillTriangle(cx, cy + 7, cx + 2, cy - 1, cx - 2, cy - 1);
      if (island) {
        // One connected ocean clips every cell-derived floor at the exact
        // shared land hole. Pier boards stay above this unbroken sea.
        const ocean = waterRegions.find(region => region.ocean), edge = terrainPainter(.5), beach = terrainPainter(1);
        fillOutlines(edge, [ocean.points, ...ocean.holes], p.water);
        for (const loop of coast) {
          fillOutlines(beach, [insetTerrainContour(loop, -20), loop.slice().reverse()], woodlandFloorTone(p.water, p.shallow, .3));
          beach.lineStyle(1.15, p.foam, .42).strokePoints(loop, true);
        }
      } else {
        const horizon = terrainPainter(-1);
        horizon.fillStyle(0x729d8b, .6).fillEllipse(width * .23, W.sky - 13, width * .82, 97).fillEllipse(width * .75, W.sky - 21, width * .86, 93);
        horizon.fillStyle(p.forestFloor, .78).fillEllipse(width * .35, W.sky + 2, width * .77, 56).fillEllipse(width * .9, W.sky - 1, width * .64, 51);
      }
      const zones = typeof GARDEN_ZONES === 'undefined' ? [] : GARDEN_ZONES, presentedOpen = new Set(sc.areas || []);
      for (const gate of typeof GARDEN_ZONE_GATES === 'undefined' ? [] : GARDEN_ZONE_GATES) {
        const zone = zones.find(z => z.n === gate.n); if (!zone) continue;
        const customized = typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(gate.id)).some(Boolean);
        if (!gardenLandGatePresented(gate, presentedOpen, customized)) continue;
        const foot = gateCrossingFoot(gate), x = foot ? foot.x : (gate.x + .5) * W.cellW, y = foot ? foot.y : W.sky + (gate.y + gate.h) * W.cellH - 4, points = [{ x: gate.x * W.cellW, y: W.sky + gate.y * W.cellH }, { x: (gate.x + 1) * W.cellW, y: W.sky + gate.y * W.cellH }, { x: (gate.x + 1) * W.cellW, y: W.sky + (gate.y + gate.h) * W.cellH }, { x: gate.x * W.cellW, y: W.sky + (gate.y + gate.h) * W.cellH }];
        const cross = gate.crossSpan && gate.crossSpan.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }));
        if (cross) { points.length = 0; const dx = gate.dx * W.cellW * .4, dy = gate.dy * W.cellH * .4; points.push({ x: cross[0].x - dx, y: cross[0].y - dy }, { x: cross[1].x - dx, y: cross[1].y - dy }, { x: cross[1].x + dx, y: cross[1].y + dy }, { x: cross[0].x + dx, y: cross[0].y + dy }); }
        const gateBounds = terrainBox(points);
        gateRows.push({ id: gate.id, zone: gate.n, x, y, dx: gate.dx, dy: gate.dy, width: gateBounds.width, height: gateBounds.height, open: (sc.areas || []).includes(zone.id), points, bounds: gateBounds, root: null });
      }
      // Land prices stay in deliberate ground inspection and the land office.
      cacheQueue.delete(terrain);
      for (const record of pierDeckRecords.values()) cacheQueue.set(record.node, { staticOnly: false, tileSize: 512 });
    }
    function gateCrossingFoot(gate) {
      if (!gate || typeof gardenIslandActive !== 'function' || !gardenIslandActive()) return null;
      if (gate.crossSpan && typeof _gldIslandGateFrame === 'function') { const frame = _gldIslandGateFrame(gate); return { x: frame.x, y: frame.y }; }
      // Zone classification samples a cell centre. The first closed row or
      // column starts at this cell edge, not at the bottom of the old art
      // envelope (gate.h). Keep the gate and its effects on that crossing.
      return { x: (gate.dx ? gate.x + (gate.dx < 0 ? 1 : 0) : gate.x + .5) * W.cellW,
        y: W.sky + (gate.dy ? gate.y + (gate.dy < 0 ? 1 : 0) : gate.y + .5) * W.cellH };
    }
    function villageStyle(prop) { return !!prop && (['shop', 'tackle', 'stall', 'board', 'lf-office'].includes(prop.kind) || prop.kind === 'bench' && prop.id === 'craft-bench'); }
    function sceneryKind(prop) { if (!prop) return ''; const kind = prop.art || String(prop.kind || '').replace(/^lf-/, ''); return ['windmill', 'falls', 'gate', 'shepherd', 'chapel', 'mill'].includes(kind) ? kind : typeof gardenZoneGate === 'function' && gardenZoneGate(prop.id) ? 'gate' : ''; }
    function sceneryBuilding(prop, sc) {
      const kind = sceneryKind(prop); if (!kind || !window.GardenNativeScenery) return null;
      if (typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(prop.id)).some(Boolean)) return null;
      const gate = kind === 'gate' && typeof gardenZoneGate === 'function' ? gardenZoneGate(prop.id) : null, zone = gate && gardenZone(gate.n);
      const open = gate ? (sc.areas || []).includes(zone.id) : !String(gardenAreaAt(prop.x, prop.y, model.level.level)).startsWith('locked:');
      const major = !gate, foot = gateCrossingFoot(gate);
      const handle = GardenNativeScenery.create(scene, { id: prop.id, kind, x: foot ? foot.x : (prop.x + prop.w / 2) * W.cellW, y: foot ? foot.y : W.sky + (prop.y + prop.h) * W.cellH - 4, width: gate ? gate.h > 1 ? 74 : 57 : prop.w * W.cellW, name: zone ? zone.name : prop.name, level: zone && zone.lv, showRequirement: false, open, major, gate, season: sc.season });
      if (handle && foot) handle.foot = foot;
      if (handle && ambientPause) handle.pauseAmbient(ambientPause); return handle;
    }
    // The Painted village's props, gates, falls and decorations
    // (94-garden-native-painted-props.js): baked images in a plain handle,
    // kept while their signature (what they show) is unchanged.
    function paintedRecord(key, signature, make, metadata, depth, parent) {
      const old = drawings.get(key);
      if (old && old.source === signature) { old.metadata = Object.assign(metadata, { foot: old.handle.foot }); return old; }
      let made = null; try { made = make(); } catch (e) { if (window.GardenNativePainted) GardenNativePainted.lastError = String(e && e.stack || e); }
      if (!made) return null;
      if (old) old.handle.destroy();
      (parent || objects).appendChild(made.rootNode); made.root.setDepth(depth); if (ambientPause && made.pauseAmbient) made.pauseAmbient(ambientPause);
      metadata.foot = made.foot;
      const record = { id: key, source: signature, handle: made, root: made.root, node: made.rootNode, metadata, depth, bounds: made.bounds };
      drawings.set(key, record); sorted = true; return record;
    }
    function paintedOn() { return packOn() && !!window.GardenPaintedProps; }
    function villageBuilding(prop, sc) {
      if (prop && packOn() && GardenNativePainted.ready() && !(typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(prop.id)).some(Boolean))) { const packed = GardenNativePainted.building(scene, prop, sc, element, W); if (packed) return packed; }
      if (!villageStyle(prop)) return null;
      if (typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(prop.id)).some(Boolean)) return null;
      const cw = prop.w * W.cellW, x = prop.x * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 4, litWindows = sc.tod === 'dusk' || sc.tod === 'night';
      const h = prop.kind === 'board' ? 111 : prop.kind === 'stall' ? 116 : prop.kind === 'bench' ? 101 : 222;
      const node = element(scene, 'g', { class: 'gd-it gd-prop gd-prop-' + prop.kind, 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
      const art = scene.add.graphics(); node._inner.add(art);
      const facadeScale = prop.kind === 'board' ? 1.2 : prop.kind === 'stall' ? 1.16 : prop.kind === 'bench' ? 1.12 : 1;
      if (facadeScale !== 1) art.setPosition(0, foot * (1 - facadeScale)).setScale(1, facadeScale);
      const ink = 0x4b5342, timber = 0x9c7851, woodDark = 0x705a42, cream = 0xece0bf, trim = 0xf7edd1, roof = prop.kind === 'shop' ? 0xa16c51 : prop.kind === 'lf-office' ? 0x6c7f70 : 0x537e6c, roofDark = prop.kind === 'shop' ? 0x78533f : prop.kind === 'lf-office' ? 0x4c6156 : 0x3c6054;
      const poly = (color, points, alpha = 1) => art.fillStyle(color, alpha).fillPoints(points.map(([x, y]) => ({ x, y })), true, true);
      const sign = (text, xx, yy, size = 9, color = '#3e584a') => { const n = element(scene, 'text', { class: 'gd-native-sign', x: xx, y: foot + (yy - foot) * facadeScale, 'font-family': 'Georgia, serif', 'font-size': size * facadeScale, fill: color, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }); n.textContent = text; node.appendChild(n); };
      art.fillStyle(0x284d3c, .13).fillEllipse(x + cw / 2 + 5, foot + 3, cw + 22, 16);
      if (prop.kind === 'bench') {
        // A working bench shares the village's oak, stone and restrained ink.
        // Tools stay legible as a few silhouettes rather than surface noise.
        for (const xx of [x + 8, x + cw - 15]) art.fillStyle(0x9a9e80).fillRoundedRect(xx - 3, foot - 3, 15, 6, 2).fillStyle(woodDark).fillRoundedRect(xx, foot - 62, 8, 63, 2).fillStyle(timber).fillRect(xx + 1, foot - 59, 2, 56);
        art.fillStyle(woodDark).fillRoundedRect(x + 5, foot - 78, cw - 9, 37, 3).fillStyle(0xb49769).fillRoundedRect(x + 8, foot - 75, cw - 15, 31, 2);
        art.lineStyle(.8, 0x765e43, .4).lineBetween(x + 10, foot - 64, x + cw - 9, foot - 64).lineBetween(x + 10, foot - 53, x + cw - 9, foot - 53);
        for (let i = 0; i < 3; i++) {
          const xx = x + 21 + i * 22;
          art.fillStyle(woodDark).fillCircle(xx, foot - 70, 1.6).lineStyle(2.8, 0x795b3e).lineBetween(xx, foot - 66, xx - 1, foot - 50);
          if (i === 0) art.fillStyle(0x889c91).fillRoundedRect(xx - 6, foot - 65, 12, 5, 1);
          else if (i === 1) poly(0x879b8e, [[xx - 1, foot - 67], [xx + 8, foot - 61], [xx + 5, foot - 55], [xx - 2, foot - 58]]);
          else art.lineStyle(2, 0x8d9d8c).lineBetween(xx - 5, foot - 67, xx - 6, foot - 58).lineBetween(xx + 5, foot - 67, xx + 4, foot - 58).lineBetween(xx - 6, foot - 58, xx + 4, foot - 58);
        }
        art.fillStyle(woodDark).fillRoundedRect(x + 4, foot - 17, cw - 8, 7, 2).fillStyle(0xb79a6e).fillRect(x + 10, foot - 17, cw - 20, 2);
        poly(0x705b40, [[x - 4, foot - 39], [x + 6, foot - 45], [x + cw + 3, foot - 45], [x + cw + 8, foot - 36], [x + cw + 7, foot - 31], [x - 4, foot - 31]]);
        poly(0xc5a477, [[x - 4, foot - 39], [x + 6, foot - 45], [x + cw + 3, foot - 45], [x + cw + 8, foot - 36], [x - 4, foot - 36]]);
        art.lineStyle(.9, 0xead4a5, .7).lineBetween(x - 2, foot - 38, x + cw + 4, foot - 37).lineStyle(.8, 0x896746, .6).lineBetween(x + 5, foot - 42, x + cw + 2, foot - 42);
        art.fillStyle(0x765e42).fillRoundedRect(x + 14, foot - 31, 24, 15, 2).fillStyle(0xb9945f).fillRoundedRect(x + 16, foot - 29, 20, 10, 2).lineStyle(.8, 0x7f6644, .6).lineBetween(x + 18, foot - 25, x + 33, foot - 25);
        art.fillStyle(0x6b8970).fillRoundedRect(x + cw - 27, foot - 56, 16, 16, 3).fillStyle(0xb8c4a6).fillEllipse(x + cw - 19, foot - 56, 16, 5).lineStyle(1.1, 0x587b5e).lineBetween(x + cw - 22, foot - 57, x + cw - 28, foot - 69).lineBetween(x + cw - 17, foot - 57, x + cw - 11, foot - 72);
        art.fillStyle(trim).fillRoundedRect(x + cw / 2 - 21, foot - 32, 42, 10, 2); sign('CRAFT', x + cw / 2, foot - 27, 6.5);
      } else if (prop.kind === 'board') {
        for (const xx of [x + 11, x + cw - 15]) art.fillStyle(woodDark).fillRoundedRect(xx, foot - 62, 7, 64, 2).fillStyle(timber).fillRect(xx + 1, foot - 59, 2, 57);
        art.fillStyle(woodDark).fillRoundedRect(x + 3, foot - 65, cw - 6, 49, 4).fillStyle(0xb7a174).fillRoundedRect(x + 7, foot - 61, cw - 14, 41, 2);
        poly(roofDark, [[x - 6, foot - 64], [x + cw / 2, foot - 83], [x + cw + 6, foot - 64], [x + cw + 5, foot - 59], [x - 5, foot - 59]]);
        poly(roof, [[x - 7, foot - 65], [x + cw / 2, foot - 85], [x + cw + 7, foot - 65]]);
        art.lineStyle(1, 0xb7bd8d, .6).lineBetween(x - 2, foot - 66, x + cw / 2, foot - 81);
        art.fillStyle(cream).fillRoundedRect(x + 15, foot - 52, 26, 25, 1).fillStyle(0xe6d2a8).fillRoundedRect(x + 49, foot - 51, 30, 22, 1);
        art.lineStyle(.8, 0x8a9270, .8).lineBetween(x + 20, foot - 44, x + 34, foot - 44).lineBetween(x + 20, foot - 39, x + 32, foot - 39).lineBetween(x + 54, foot - 42, x + 72, foot - 42).lineBetween(x + 54, foot - 36, x + 68, foot - 36);
        for (const xx of [x + 27, x + 64]) art.fillStyle(0x8f674a).fillCircle(xx, foot - 51, 1.4);
        art.fillStyle(0xd4c18f).fillRoundedRect(x + 21, foot - 18, cw - 42, 11, 2); sign('NOTICES', x + cw / 2, foot - 12, 7.5);
        art.lineStyle(.9, ink, .48).strokeRoundedRect(x + 3, foot - 65, cw - 6, 49, 4);
      } else if (prop.kind === 'stall') {
        for (const xx of [x + 8, x + cw - 12]) art.fillStyle(woodDark).fillRoundedRect(xx, foot - 72, 5, 74, 2).fillStyle(0xc8b187).fillRect(xx + 1, foot - 68, 1, 66);
        art.fillStyle(woodDark).fillRoundedRect(x + 5, foot - 31, cw - 10, 32, 3).fillStyle(0xb99a6c).fillRoundedRect(x + 7, foot - 29, cw - 14, 27, 2);
        art.lineStyle(1.2, 0x796447, .65); for (let xx = x + 17; xx < x + cw - 10; xx += 16) art.lineBetween(xx, foot - 27, xx, foot - 3);
        art.fillStyle(0xd4bb87).fillRoundedRect(x + 1, foot - 34, cw - 2, 7, 2);
        poly(roofDark, [[x - 9, foot - 48], [x + 10, foot - 85], [x + cw - 12, foot - 85], [x + cw + 10, foot - 48]]);
        for (let i = 0; i < 5; i++) {
          const left = x - 9 + i * (cw + 19) / 5, right = x - 9 + (i + 1) * (cw + 19) / 5, backLeft = x + 10 + i * (cw - 22) / 5, backRight = x + 10 + (i + 1) * (cw - 22) / 5;
          poly(i % 2 ? cream : 0x78946a, [[left, foot - 48], [backLeft, foot - 85], [backRight, foot - 85], [right, foot - 48]]);
          art.fillStyle(i % 2 ? 0xe7d9b3 : 0x65855e).fillEllipse((left + right) / 2, foot - 48, right - left + .2, 9);
        }
        art.lineStyle(1.3, 0xe8dfbf, .65).lineBetween(x + 10, foot - 85, x + cw - 12, foot - 85);
        for (let i = 0; i < 3; i++) {
          const xx = x + 18 + i * 27; art.fillStyle(woodDark).fillRoundedRect(xx - 10, foot - 39, 22, 9, 2);
          for (let j = 0; j < 3; j++) art.fillStyle([0xc78d4f, 0x9aaf61, 0xc2a353][i]).fillCircle(xx - 5 + j * 6, foot - 41 - (j % 2) * 3, 4.5);
        }
        art.fillStyle(0xe9ddb8).fillRoundedRect(x + cw / 2 - 25, foot - 23, 50, 12, 2); sign('THE MARKET', x + cw / 2, foot - 17, 6.5);
        art.lineStyle(.9, ink, .5).lineBetween(x + 5, foot - 1, x + cw - 5, foot - 1).lineBetween(x + 5, foot - 29, x + 5, foot - 2).lineBetween(x + cw - 5, foot - 29, x + cw - 5, foot - 2);
      } else {
        const left = x - 1, right = x + cw - 10, middle = (left + right) / 2, eave = foot - 142, peak = foot - 201;
        // A shared stone plinth, plaster front and shaded timber side establish
        // one village style. The saved ground footprint remains the same.
        art.fillStyle(0x7a8567).fillRoundedRect(x + 3, foot - 6, cw + 1, 10, 3).fillStyle(0xb9b89a).fillRoundedRect(x + 6, foot - 8, cw - 6, 9, 2);
        poly(0xbcae83, [[right, eave + 4], [right + 18, eave - 8], [right + 18, foot - 8], [right, foot]]);
        art.fillStyle(cream).fillRoundedRect(left, eave, right - left, 141, 2).fillStyle(0xd5c49c).fillRect(left, foot - 10, right - left, 9);
        art.fillStyle(0xf5eacb, .6).fillRect(left + 2, eave + 3, 4, 129);
        art.fillStyle(0xe0d1aa).fillRect(left + 4, foot - 84, right - left - 8, 5).fillStyle(0x9b7e56).fillRect(left, foot - 88, right - left, 4);
        art.lineStyle(.85, ink, .48).lineBetween(left, eave + 1, left, foot - 7).lineBetween(left + 1, foot + 1, right + 15, foot + 1);
        for (let i = 0; i < 4; i++) { const xx = left + 10 + i * (right - left - 16) / 4; art.lineStyle(.65, 0x8c8e72, .5).lineBetween(xx, foot - 7, xx - 1, foot); }
        art.fillStyle(woodDark).fillRect(left - 1, eave + 1, 4, 136).fillRect(right - 3, eave + 1, 4, 135);
        for (const xx of [left + 5, right - 9]) art.lineStyle(2, timber, .9).lineBetween(xx, foot - 89, xx + (xx < middle ? 17 : -17), foot - 126);
        art.lineStyle(.7, 0x947e59, .45).lineBetween(right + 8, eave - 1, right + 8, foot - 9).lineBetween(right + 15, eave - 5, right + 15, foot - 12);
        const chimneyX = x + cw * .72;
        art.fillStyle(0xa99570).fillRect(chimneyX, foot - 214, 14, 37).fillStyle(0xd8c69e).fillRoundedRect(chimneyX - 2, foot - 219, 18, 6, 1);
        for (let i = 0; i < 3; i++) art.lineStyle(.8, 0x796e52, .55).lineBetween(chimneyX + 1, foot - 207 + i * 10, chimneyX + 13, foot - 207 + i * 10);
        poly(roofDark, [[x - 8, eave + 2], [middle, peak], [middle + 20, peak - 8], [x + cw + 5, eave - 10], [right + 6, eave + 3]]);
        poly(roof, [[x - 8, eave], [middle, peak - 1], [right + 6, eave]]);
        poly(0x213e34, [[x - 7, eave], [right + 7, eave], [right + 7, eave + 6], [x - 7, eave + 6]], .65);
        art.lineStyle(1.1, 0xdccaa3, .65).lineBetween(x - 6, eave - 1, middle, peak + 2).lineBetween(middle, peak + 2, right + 4, eave - 1);
        for (let i = 1; i < 5; i++) {
          const t = i / 5, yy = peak + (eave - peak) * t, half = (right + 7 - (x - 7)) * t / 2;
          art.lineStyle(.8, roofDark, .46).lineBetween(middle - half, yy, middle + half, yy);
          for (let j = -2; j <= 2; j++) { const xx = middle + j * 22 + (i % 2 ? 11 : 0); if (Math.abs(xx - middle) < half - 5) art.lineStyle(.65, roofDark, .32).lineBetween(xx, yy + 1, xx, Math.min(eave - 1, yy + 7)); }
        }
        art.lineStyle(1.1, ink, .66).strokePoints([{ x: x - 8, y: eave }, { x: middle, y: peak - 1 }, { x: right + 6, y: eave }], false);
        art.fillStyle(woodDark).fillCircle(middle, foot - 165, 14).fillStyle(litWindows ? 0xffe4ac : 0xb6c9af).fillCircle(middle, foot - 165, 10).lineStyle(1.4, litWindows ? 0xffefd0 : trim).lineBetween(middle - 9, foot - 165, middle + 9, foot - 165).lineBetween(middle, foot - 174, middle, foot - 156);
        const paintWindow = (xx, yy) => {
          art.fillStyle(timber).fillRoundedRect(xx - 3, yy - 3, 27, 32, 4).fillStyle(litWindows ? 0xffd28a : 0x638f88).fillRoundedRect(xx, yy, 21, 26, 3);
          art.fillStyle(litWindows ? 0xffefd0 : 0xc7d4b8, .55).fillRoundedRect(xx + 2, yy + 2, 8, 12, 2).lineStyle(1.6, litWindows ? 0xffefd0 : trim).lineBetween(xx + 10.5, yy + 1, xx + 10.5, yy + 25).lineBetween(xx + 1, yy + 12, xx + 20, yy + 12);
          art.lineStyle(.8, ink, .5).strokeRoundedRect(xx - 3, yy - 3, 27, 32, 4);
          art.fillStyle(roofDark).fillRoundedRect(xx - 8, yy, 4, 26, 1).fillRoundedRect(xx + 25, yy, 4, 26, 1);
          art.fillStyle(timber).fillRoundedRect(xx - 5, yy + 27, 31, 7, 2);
          for (let i = 0; i < 3; i++) art.fillStyle(0x668b58).fillEllipse(xx + i * 9 + 1, yy + 26, 12, 10).fillStyle(i % 2 ? 0xd6ba76 : 0xcf9b79).fillCircle(xx + i * 9 + 1, yy + 22, 2.3);
        };
        paintWindow(left + 13, foot - 52); paintWindow(right - 35, foot - 52);
        paintWindow(left + 16, foot - 125); paintWindow(right - 38, foot - 125);
        art.fillStyle(woodDark).fillRoundedRect(middle - 16, foot - 52, 32, 53, { tl: 13, tr: 13, bl: 1, br: 1 }).fillStyle(prop.kind === 'shop' ? 0x6f8b65 : prop.kind === 'lf-office' ? 0x75836a : 0x527e74).fillRoundedRect(middle - 12, foot - 48, 24, 48, { tl: 10, tr: 10, bl: 1, br: 1 });
        art.lineStyle(.7, 0xe5d7ae, .35).lineBetween(middle - 5, foot - 38, middle - 5, foot - 5).lineBetween(middle + 4, foot - 38, middle + 4, foot - 5).fillStyle(0xd5bb76).fillCircle(middle + 7, foot - 23, 1.5);
        art.fillStyle(0xbbb99a).fillRoundedRect(middle - 20, foot - 2, 40, 6, 2).fillStyle(0xddd4af).fillRect(middle - 19, foot - 2, 38, 1.2);
        art.fillStyle(timber).fillRoundedRect(middle - 40, foot - 74, 80, 16, 3).fillStyle(trim).fillRoundedRect(middle - 37, foot - 72, 74, 12, 2);
        sign(prop.kind === 'shop' ? 'SEED & STEM' : prop.kind === 'lf-office' ? 'LAND OFFICE' : 'TACKLE & TIDE', middle, foot - 66, 7.8);
        if (prop.kind === 'lf-office') {
          art.fillStyle(0xe8dbb4).fillRoundedRect(middle - 7, foot - 40, 14, 16, 1).lineStyle(.9, 0x84936d).lineBetween(middle - 4, foot - 36, middle + 1, foot - 30).lineBetween(middle + 1, foot - 30, middle + 5, foot - 34).lineStyle(.8, 0x9aa779).lineBetween(middle, foot - 37, middle - 3, foot - 26);
        }
        art.fillStyle(0x8b7754).fillRoundedRect(x + cw - 9, foot - 27, 11, 24, 2).fillStyle(0x6c9270).fillEllipse(x + cw - 3, foot - 30, 22, 16).fillStyle(0x92ac79).fillEllipse(x + cw - 7, foot - 34, 12, 10);
      }
      if (['shop', 'tackle', 'lf-office'].includes(prop.kind) && typeof gardenCraftBuildingSkin === 'function') {
        const left = x - 1, right = x + cw - 10, middle = (left + right) / 2;
        const skin = element(scene, 'g', { class: 'gd-native-crafted-building', 'pointer-events': 'none' });
        skin.innerHTML = gardenCraftBuildingSkin(prop, sc, { left, right, foot, eave: foot - 142, peak: foot - 202, roofLeft: x - 8, roofRight: right + 6, roof, wood: timber, windows: [{ x: left + 13, y: foot - 52, w: 21, h: 26 }, { x: right - 35, y: foot - 52, w: 21, h: 26 }, { x: left + 16, y: foot - 125, w: 21, h: 26 }, { x: right - 38, y: foot - 125, w: 21, h: 26 }], door: { x: middle - 12, y: foot - 48, w: 24, h: 48 } });
        node.appendChild(skin);
      }
      const b = { x: x - 14, y: foot - h - 4, width: cw + 32, height: h + 16 }; node.nativeBounds = b;
      return { root: node.target, rootNode: node, bounds: b, update() {}, destroy() { node.remove(); } };
    }
    function sync(next) {
      if (dead) return;
      const m = next || gardenHere(), designRev = typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0;
      const lake = typeof gardenLakeGeometry === 'function' ? gardenLakeGeometry(m) : null;
      const surfaceKey = (typeof _GD_ICE === 'undefined' ? 0 : _GD_ICE.size) + ':' + (typeof _GD_WALK_EXTRA === 'undefined' ? 0 : _GD_WALK_EXTRA.size);
      const decks = gardenPierDecks(m.works || [], m), deckKey = decks.map(p => [p.id, p.x, p.y, p.w, p.h].join(',')).join(';');
      const key = (m.visit ? m.visit.key : _gd.memoKey || _gd.rev) + '|' + designRev + '|' + m.tod + '|' + m.season + '|' + surfaceKey + '|' + (lake && lake.revision || 0) + '|' + deckKey;
      if (model === m && modelKey === key) return;
      model = m; modelKey = key;
      const sc = gardenSceneFromModel(m), opts = { uid: 'gnative', size: 'l', crop: 'world', interactive: true, still: false, native: true, readOnly: !!m.visit, friend: m.visit && m.visit.drawFriend };
      const nightMaterials = sc.tod === 'dusk' || sc.tod === 'night';
      // Precipitation changes the live atmosphere. Actual ice and shoreline
      // geometry already participate through the surface and lake revisions.
      const cultivated = typeof gardenIslandActive === 'function' && gardenIslandActive() ? cultivatedSections(m) : null;
      const tk = [packOn() ? 'painted' : '', sc.season, sc.tod, m.level.level, (sc.areas || []).join(','), designRev, surfaceKey, lake && lake.revision, cultivated && [...cultivated].sort().join(','), deckKey].join('|');
      if (terrainKey !== tk) { terrainKey = tk; drawTerrain(m, sc, lake, cultivated, decks); }
      shorelineRevision = lake && lake.revision || 0;
      const keep = new Set(), modelPlants = new Map(m.plants.map(p => [p.uid, p])), modelDecor = new Map(m.decor.map(p => [p.uid, p]));
      const add = (id, html, metadata, depth, parent) => { if (!html) return; keep.add(id); return nodeDrawing(id, html, metadata, depth, parent); };
      if (typeof gardenCraftSurfaceRows === 'function' && !packGround) for (const row of gardenCraftSurfaceRows(sc)) add('ground:craft:' + row.id, row.html, { kind: 'ground', id: row.id }, -9370);
      for (const item of sc.plants || []) add('plant:' + item.uid, _gdrItem('plant', item, sc, opts), { kind: 'plant', uid: item.uid, id: item.id, model: modelPlants.get(item.uid) }, W.sky + (item.y + (gardenPlant(item.id).fp || 1)) * W.cellH);
      const paintOpts = { element, W, night: nightMaterials, layer: rootNode._inner };
      for (const item of sc.decor || []) { const def = gardenDecor(item.id), ground = def && def.layer === 'ground';
        if (!ground && paintedOn() && GardenPaintedProps.decorKnown(item.id) && !(typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf('decor:' + item.uid) || {}).some(Boolean))) {
          const key = 'decor:' + item.uid, rec = paintedRecord(key, GardenPaintedProps.decorSignature(item, sc, nightMaterials), () => GardenPaintedProps.decor(scene, item, sc, paintOpts), { kind: 'decor', uid: item.uid, id: item.id, model: modelDecor.get(item.uid) }, W.sky + (item.y + (def && def.h || 1)) * W.cellH);
          if (rec) { keep.add(key); continue; }
        }
        add('decor:' + item.uid, _gdrItem('decor', item, sc, opts), { kind: 'decor', uid: item.uid, id: item.id, model: modelDecor.get(item.uid) }, ground ? -9200 : W.sky + (item.y + (def && def.h || 1)) * W.cellH, ground ? design : objects); }
      const props = new Map(gardenPropsNow().map(p => [p.id, p]));
      for (const row of gardenWorldProps(sc, opts)) {
        const id = attribute(row.html, 'data-prop'), prop = props.get(id) || (typeof gardenLandSiteProp === 'function' ? gardenLandSiteProp(id) : null), key = 'prop:' + id;
        const windowed = prop && ['shop', 'tackle', 'lf-office'].includes(prop.kind);
        const paneMaterialKey = prop && ['windmill', 'shepherd', 'mill'].includes(sceneryKind(prop)) ? '|panes:' + (nightMaterials ? 'warm' : 'day') : '';
        const signature = prop && 'native-landscape-crafted-9' + (packOn() ? '-painted' : '') + '|' + prop.id + '|' + [prop.x, prop.y, prop.w, prop.h, sc.season, sceneryKind(prop) === 'gate' ? (sc.areas || []).join('.') : ''].join(',') + (windowed ? '|windows:' + (nightMaterials ? 'warm' : 'day') : '');
        if (prop && paintedOn() && !(typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(prop.id)).some(Boolean))) {
          const gateRow = typeof gardenZoneGate === 'function' ? gardenZoneGate(prop.id) : null, meta = { kind: prop.act ? 'prop' : 'scenery', id, prop, model: prop };
          let rec = null;
          if (gateRow && gateRow.crossSpan) { const open = (sc.areas || []).includes('zn-' + gateRow.n); rec = paintedRecord(key, GardenPaintedProps.gateSignature(gateRow, open, sc), () => GardenPaintedProps.gate(scene, gateRow, sc, paintOpts, open), meta, 76000, rootNode); }
          else if (sceneryKind(prop) === 'falls') rec = paintedRecord(key, 'painted-falls-2|' + prop.id + '|' + [prop.x, prop.y, prop.w, prop.h, sc.season].join(','), () => GardenPaintedProps.falls(scene, { id: prop.id, width: prop.w * W.cellW, x: (prop.x + prop.w / 2) * W.cellW, y: W.sky + (prop.y + prop.h) * W.cellH - 4, season: sc.season }, paintOpts), meta, W.sky + row.z * W.cellH);
          else { const sig = GardenPaintedProps.signature(prop, sc, nightMaterials); if (sig) rec = paintedRecord(key, sig, () => GardenPaintedProps.prop(scene, prop, sc, paintOpts), meta, W.sky + row.z * W.cellH); }
          if (rec) { keep.add(key); continue; }
        }
        const old = drawings.get(key), standardLook = (villageStyle(prop) || sceneryKind(prop)) && !(typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(prop.id)).some(Boolean));
        if (standardLook && old && old.source === signature) {
          keep.add(key); old.metadata = { kind: prop.act ? 'prop' : 'scenery', id, prop, model: prop, foot: old.handle.foot };
          if (old.handle.setLitWindows) { old.handle.setLitWindows(nightMaterials); old.materialKey = paneMaterialKey; }
          continue;
        }
        const custom = prop && (sceneryBuilding(prop, sc) || villageBuilding(prop, sc));
        if (custom) {
          if (custom.setLitWindows) custom.setLitWindows(nightMaterials);
          keep.add(key); if (old) old.handle.destroy(); (custom.kind === 'gate' ? rootNode : objects).appendChild(custom.rootNode); custom.root.setDepth(custom.kind === 'gate' ? 76000 : W.sky + row.z * W.cellH); const record = { id: key, source: signature, materialKey: custom.setLitWindows ? paneMaterialKey : '', handle: custom, root: custom.root, node: custom.rootNode, metadata: { kind: prop.act ? 'prop' : 'scenery', id, prop, model: prop, foot: custom.foot }, depth: custom.kind === 'gate' ? 76000 : W.sky + row.z * W.cellH, bounds: custom.bounds }; drawings.set(key, record); queueDrawing(record); sorted = true;
        } else add(key, row.html, { kind: prop && prop.act ? 'prop' : attribute(row.html, 'data-land') ? 'land' : 'scenery', id, prop, land: attribute(row.html, 'data-land'), model: prop }, W.sky + row.z * W.cellH);
      }
      // Painted crossings stay standing once their region is yours: the
      // bridge, the arch, the stair are part of the land, now open.
      if (paintedOn() && typeof gardenIslandActive === 'function' && gardenIslandActive()) for (const g of gardenIslandData().gates || []) {
        const key = 'prop:' + g.id; if (keep.has(key) || !g.crossSpan || !(sc.areas || []).includes('zn-' + g.n) || typeof _gldIslandGateFrame !== 'function') continue;
        const frame = _gldIslandGateFrame(g), rec = paintedRecord(key, GardenPaintedProps.gateSignature(g, true, sc), () => GardenPaintedProps.gate(scene, g, sc, paintOpts, true), { kind: 'scenery', id: g.id, model: { id: g.id, kind: 'gate-open', x: frame.x / W.cellW - .5, y: (frame.y - W.sky) / W.cellH - 1, w: 1, h: 1 } }, frame.y + 2);
        if (rec) keep.add(key);
      }
      if (typeof gardenIslandActive === 'function' && gardenIslandActive() && (gardenIslandData().regions || []).length) {
        for (const row of _gldIslandUnderstoryRows(sc)) add('ground:understory:' + row.id, row.html, { kind: 'ground', id: row.id }, -9340);
        for (const row of _gldIslandLandformRows(sc)) add('landform:' + row.id, row.html, { kind: 'scenery', id: row.id, model: { id: row.id, kind: row.kind, x: row.x, y: row.y, w: row.w, h: row.h }, foot: row.foot }, row.foot.y - 2);
      }
      for (const spec of forestRows) {
        if (window.GardenPaintNature && GardenPaintNature.covers(W, spec.x, spec.y)) continue;   // painted woods stand there
        const id = spec.id, signature = 'native-forest-crafted-8|' + id + '|' + sc.season; keep.add(id);
        if (drawings.get(id)?.source === signature) continue;
        const old = drawings.get(id); if (old) old.handle.destroy();
        const handle = GardenNativeScenery.create(scene, { ...spec, season: sc.season }); if (!handle) continue;
        if (typeof gardenCraftTreeDetail === 'function') {
          const bark = element(scene, 'g', { class: 'gd-crafted-bark', 'pointer-events': 'none' });
          bark.innerHTML = gardenCraftTreeDetail(spec, sc.season, true); handle.rootNode.appendChild(bark);
          bark.nativeBounds = bark.getBBox(); if (handle.cacheNodes) handle.cacheNodes.push(bark);
        }
        objects.appendChild(handle.rootNode); handle.root.setDepth(spec.y - 2); if (ambientPause) handle.pauseAmbient(ambientPause);
        const record = { id, source: signature, handle, root: handle.root, node: handle.rootNode, metadata: { kind: 'scenery', tree: true, model: { id, kind: 'tree', x: (spec.x - spec.width) / W.cellW, y: (spec.y - W.sky) / W.cellH - 1, w: spec.width * 2 / W.cellW, h: 1 }, foot: { x: spec.x, y: spec.y } }, depth: spec.y - 2, bounds: handle.bounds }; drawings.set(id, record); queueDrawing(record); sorted = true;
      }
      if (typeof gardenDesignLayer === 'function') add('ground:design', gardenDesignLayer(sc), { kind: 'ground' }, -9350, design);
      if (typeof gardenDesignPainted === 'function') gardenDesignPainted(rootNode, sc.dz);
      for (const [id, record] of drawings) if (!keep.has(id)) { record.handle.destroy(); drawings.delete(id); sorted = true; }
      restoreCanopyAlpha();
      solidObjects.length = 0; pointLights.length = 0; fadingProps.length = 0; reflectedScenery.length = 0; landmarkRows.length = 0; canopyOccluders.length = 0; effectFrame = -1;
      for (const record of drawings.values()) {
        const meta = record.metadata, source = meta.model, def = source && (source.def || source), captureKey = record.materialKey ? record.source + record.materialKey : record.source;
        if (record.handle.kind) {
          const foot = meta.foot || { x: (source.x + (source.w || 1) / 2) * W.cellW, y: W.sky + (source.y + (source.h || 1)) * W.cellH };
          landmarkRows.push({ id: record.id, kind: record.handle.kind, source: record.root, body: record.handle.body, bounds: record.bounds, x: foot.x, y: foot.y, tall: foot.y - record.bounds.y, dynamic: record.handle.dynamic, captureKey });
          const gate = gateRows.find(g => g.id === meta.id); if (gate) { gate.root = record.root; gate.bounds = record.bounds; gate.depth = 76000; }
        }
        if (meta.prop && meta.prop.kind) fadingProps.push(record);
        if (record.handle.painted && record.handle.lights) record.handle.lights.forEach((l, i) => pointLights.push({ id: record.id + ':pl' + i, x: l.x, y: l.y, radius: l.radius, color: nightMaterials ? 0xffc17a : 0xffd88e, intensity: .8 }));
        if (record.handle.canopyOcclusion) {
          const crown = record.handle.canopyOcclusion;
          canopyOccluders.push({ id: record.id, record, node: crown.node, polygons: crown.polygons, bounds: terrainBox(crown.polygons.flat()), normalAlpha: crown.node.target.alpha, faded: false });
        }
        if (meta.kind === 'ground' || def && def.layer === 'ground') continue;
        if (source && def) {
          const x = meta.foot ? meta.foot.x : (source.x + (def.fp || def.w || 1) / 2) * W.cellW, y = meta.foot ? meta.foot.y : W.sky + (source.y + (def.fp || def.h || 1)) * W.cellH;
          solidObjects.push({ id: record.id, x, y, w: Math.min((def.fp || def.w || 1) * W.cellW, record.bounds.width || 80), h: W.cellH * .4, height: Math.max(12, (record.bounds.height || 60) * .8), kind: meta.kind, root: record.root });
          reflectedScenery.push({ id: record.id, source: record.root, x, y, w: record.bounds.width, h: W.cellH * .4, tall: record.bounds.height, bounds: record.bounds, kind: meta.kind, dynamic: !!record.handle.dynamic, captureKey });
          if (def.glow || def.effect && def.effect.kind === 'light') pointLights.push({ id: record.id, x, y: y - Math.min(50, record.bounds.height || 40), radius: def.glow ? 54 : 105, color: nightMaterials ? 0xffc17a : 0xffd98c, intensity: def.glow ? .35 : .8 });
          if (meta.kind === 'prop' && ['shop', 'tackle'].includes(def.kind)) pointLights.push({ id: record.id + ':window', x, y: y - (record.handle.painted ? 48 : nightMaterials ? 76 : 28), radius: nightMaterials ? 96 : 72, color: nightMaterials ? 0xffc47c : 0xffdca3, intensity: .58 });
          // Painted village houses are lower: the glow sits on their window row.
          else if (record.handle.painted && meta.kind === 'prop' && ['lf-office', 'hall'].includes(def.kind)) pointLights.push({ id: record.id + ':window', x, y: y - 48, radius: nightMaterials ? 90 : 64, color: nightMaterials ? 0xffc47c : 0xffdca3, intensity: .55 });
          if (meta.prop && /^(lamp|lampbox|beacon|lighthouse)$/.test(def.art || def.kind || '')) pointLights.push({ id: record.id + ':lamp', x, y: record.bounds.y + record.bounds.height * .3, radius: def.art === 'lighthouse' ? 175 : 110, height: record.bounds.height * .75, color: nightMaterials ? 0xffc17a : 0xffd88e, intensity: .8, flicker: def.art === 'beacon' });
        } else if (meta.kind === 'scenery' && record.bounds.width < 350 && record.bounds.height > 25) {
          const foot = meta.foot || { x: record.bounds.x + record.bounds.width / 2, y: record.bounds.y + record.bounds.height };
          solidObjects.push({ id: record.id, x: foot.x, y: foot.y, w: record.bounds.width * (meta.tree ? .25 : .65), h: 9, height: record.bounds.height * .82, kind: 'scenery', root: record.root });
          reflectedScenery.push({ id: record.id, source: record.root, x: foot.x, y: foot.y, w: record.bounds.width, h: 9, tall: record.bounds.height, bounds: record.bounds, kind: 'scenery', dynamic: !!record.handle.dynamic, captureKey });
        }
      }
      _gw.grid = null; _gw.gq = null; _gw.solids = null; _gw.gridKey = ''; _gw.cam.dirty = true;
      if (typeof _gwGrid === 'function') _gwGrid(m);
      sortObjects();
    }
    function sortObjects() { if (!sorted) return; discoverSpecialMainActors(); (objects._inner || objects.target).sort('depth'); (rootNode._inner || root).sort('depth'); sorted = false; }
    function walkTo(pt, then, opts) {
      opts = opts || {}; if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return false;
      const target = _gwFree(pt.x, pt.y) ? { x: pt.x, y: pt.y } : _gwNearestFreePt(pt.x, pt.y, opts.radius || 3);
      if (!target) return false;
      const path = _gwRoute({ x: _gw.px, y: _gw.py }, target); if (path == null) return false;
      _gw.path = path; _gw.goal = target; _gw.then = then || null; _gw.sneak = !!opts.sneak; _gw.replan = false; _gw.repaths = 0; _gw.blockT = 0;
      if (!opts.net) _gw.netting = null;
      if (typeof gardenLiveWalked === 'function') gardenLiveWalked(target);
      if (!path.length && typeof then === 'function') { _gw.then = null; then(true); }
      return true;
    }
    function move(dt) {
      const keys = _gw.keys, casting = _gw.fishing && _gw.fishing.state !== 'idle';
      if (_gw.hold && casting) _gw.hold = null;
      if (_gw.hold && !_gw.hold.steer && _gw.t - _gw.hold.t0 > .28) _gw.hold.steer = true;
      let dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
      let want = 0, ux = 0, uy = 0, distance = 0, target = null, direct = false;
      const pushed = _gwPushOut(dt);
      if (!pushed && !casting && (dx || dy)) {
        _gw.path = []; _gw.then = null; _gw.netting = null; _gw.hold = null;
        const length = Math.hypot(dx * W.cellW, dy * W.cellH); ux = dx * W.cellW / length; uy = dy * W.cellH / length;
        _gw.sneak = keys.has('shift'); want = _gw.sneak ? GW_SPEED.sneak : GW_SPEED.walk * _gwWalkBonus(); direct = true;
      } else if (!pushed && !casting && _gw.hold && _gw.hold.steer) {
        const pt = point(_gw.hold.cx, _gw.hold.cy); if (pt) { dx = (pt.x - _gw.px) * W.cellW; dy = (pt.y - _gw.py) * W.cellH; distance = Math.hypot(dx, dy); if (distance > 10) { ux = dx / distance; uy = dy / distance; direct = true; want = Math.min(distance > 150 ? GW_SPEED.run : GW_SPEED.walk, Math.sqrt(2 * GW_ACC * distance) + 34); } }
      } else if (!pushed && !casting && _gw.path.length) {
        while (_gw.path.length > 1 && _gwLos({ x: _gw.px, y: _gw.py }, _gw.path[1], GW_CLEAR)) _gw.path.shift();
        target = _gw.path[0]; dx = (target.x - _gw.px) * W.cellW; dy = (target.y - _gw.py) * W.cellH; distance = Math.hypot(dx, dy); ux = dx / (distance || 1); uy = dy / (distance || 1);
        let remaining = distance; for (let i = 1; i < _gw.path.length; i++) remaining += Math.hypot((_gw.path[i].x - _gw.path[i - 1].x) * W.cellW, (_gw.path[i].y - _gw.path[i - 1].y) * W.cellH);
        want = Math.min(_gw.sneak ? GW_SPEED.sneak : (remaining > 170 ? GW_SPEED.run : GW_SPEED.walk) * _gwWalkBonus(), Math.sqrt(2 * GW_ACC * remaining) + 34);
      }
      if (want && typeof gardenPlayWalk === 'function') want *= gardenPlayWalk();
      _gw.spd = want ? (_gw.spd || 0) + clamp(want - (_gw.spd || 0), -GW_ACC * dt * 1.4, GW_ACC * dt) : 0;
      _gw.moving = false;
      if (want && _gw.spd > 3) {
        const step = _gw.spd * dt;
        if (target && distance <= step) {
          _gw.px = target.x; _gw.py = target.y; _gw.path.shift(); _gw.moving = !!_gw.path.length;
          if (!_gw.path.length) { _gw.spd = 0; const fn = _gw.then; _gw.then = null; if (typeof fn === 'function') fn(true); }
        } else { _gw.moving = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH); if (!_gw.moving) { _gw.blockT = (_gw.blockT || 0) + dt; if (!direct && _gw.blockT > .25) { _gw.blockT = 0; if (!_gwRepath()) { _gw.path = []; _gw.then = null; } } } else _gw.blockT = 0; }
        if (Math.abs(ux) > .3) _gw.face = ux > 0 ? 1 : -1;
      }
      if (pushed) _gw.moving = true;
      if (_gw.moving && typeof _gwSaveSoon === 'function') _gwSaveSoon();
    }
    function drawPlayer(time) {
      if (typeof gartPlayerStep === 'function') gartPlayerStep(_gw);
      const pose = typeof _GPL !== 'undefined' && _GPL.pose && Date.now() < _GPL.until ? _GPL.pose : '';
      const appearance = [_gw.moving ? 1 : 0, _gw.face, typeof _GPL === 'undefined' ? 's' : _GPL.dir, pose, _gw.fishing && _gw.fishing.state !== 'idle' ? 1 : 0, _gd.rev, gardenMotionOn() ? 1 : 0].join('|');
      if (appearance !== playerViewKey || playerProfile !== state.profile || playerWardrobe !== state.wardrobe || !playerInner.firstChild) {
        playerViewKey = appearance; playerProfile = state.profile; playerWardrobe = state.wardrobe;
        if (typeof gartPlayerPaint === 'function') gartPlayerPaint(playerInner, _gw);
        const box = playerInner.getBBox(), corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([px, py]) => GardenNativeArt.point(playerInner._matrix || { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, px, py));
        playerOcclusionHeight = clamp(-Math.min(...corners.map(point => point.y)), 44, 88);
      }
      const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH, z = Math.floor(_gw.py * 3);
      playerNode.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); playerNode.setAttribute('data-z', String(_gw.py + .001)); playerNode.target.setDepth(y + .001);
      if (z !== playerNode._nativeZ) { playerNode._nativeZ = z; sorted = true; }
      const bob = !playerInner.querySelector('.gpl-root') && _gw.moving && gardenMotionOn() ? -Math.abs(Math.sin(time / 1000 * (_gw.sneak ? 7 : 11))) * 1.6 : 0;
      playerBob.setAttribute('transform', 'translate(0 ' + bob + ')');
      for (const record of fadingProps) {
        if (record.editorLifted) continue;
        const p = record.metadata.prop, b = record.bounds, sx = _gw.px * W.cellW, sy = W.sky + _gw.py * W.cellH;
        const behind = sx > b.x - 8 && sx < b.x + b.width + 8 && sy > b.y + 18 && sy < W.sky + (p.y + p.h) * W.cellH - 1.5;
        if (record.behind !== behind) { record.behind = behind; record.root.setAlpha(behind ? .38 : 1); }
      }
      coveringCanopies.length = 0;
      const probes = [{ x, y: y - playerOcclusionHeight * .81 }, { x, y: y - playerOcclusionHeight * .48 }, { x: x - 6, y: y - playerOcclusionHeight * .54 }, { x: x + 6, y: y - playerOcclusionHeight * .54 }];
      for (const crown of canopyOccluders) {
        const b = crown.bounds;
        let covered = false;
        if (crown.record.root.visible && crown.record.root.active && crown.record.depth > y + .01 && x + 8 >= b.x - 3 && x - 8 <= b.x + b.width + 3 && y - playerOcclusionHeight <= b.y + b.height + 3 && y >= b.y - 3) {
          const matrix = GardenNativeArt.inverse(crown.node._matrix);
          covered = probes.some(probe => { const point = GardenNativeArt.point(matrix, probe.x, probe.y); return crown.polygons.some(polygon => insidePolygon(point, polygon)); });
        }
        const alpha = crown.normalAlpha * (covered ? .24 : 1);
        if (crown.faded !== covered || Math.abs(crown.node.target.alpha - alpha) > .0001) { crown.faded = covered; crown.node.target.setAlpha(alpha); }
        if (covered) coveringCanopies.push(crown.id);
      }
    }
    function restoreCanopyAlpha() { for (const crown of canopyOccluders) { if (crown.node.target.active) crown.node.target.setAlpha(crown.normalAlpha); crown.faded = false; } coveringCanopies.length = 0; }
    function activitySubject() {
      const subject = window.GardenActivityCamera && GardenActivityCamera.current();
      if (!subject) { activityCamera = null; return null; }
      if (!activityCamera || activityCamera.id !== subject.id) activityCamera = { id: subject.id, zoom: 1, mode: _gdpPrefs().cam === 'fit' ? 'fit' : 'focus' };
      return subject;
    }
    function cameraTarget(prefs) {
      const ar = size.w / Math.max(1, size.h), fishing = !!(_gw.fishing && _gw.fishing.state !== 'idle' && _gw.fishing.bx < GARDEN_ROOM_X);
      if (fishing !== wasFishing) { wasFishing = fishing; fishZoom = 1; fishViewMode = ''; }
      if (typeof gardenDesignCam === 'function') { const view = gardenDesignCam(ar, width, height); if (view) return view; }
      const activity = fishing ? null : activitySubject(); if (fishing) activityCamera = null;
      const fit = fishing ? fishViewMode === 'fit' : activity ? activityCamera.mode === 'fit' : prefs.cam === 'fit';
      let vh = fit ? Math.max(height, width / ar) : GW_ZOOMS[clamp(Number.isInteger(Number(prefs.zoom)) && prefs.zoom != null ? Number(prefs.zoom) : typeof _gwCamDefaultIdx === 'function' ? _gwCamDefaultIdx() : 2, 0, GW_ZOOMS.length - 1)], vw = vh * ar;
      let x = _gw.px * W.cellW - vw / 2, y = W.sky + _gw.py * W.cellH - vh / 2 - 24;
      if (fishing && !fit) {
        const f = _gw.fishing, fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 25, bx = f.bx * W.cellW, by = W.sky + f.by * W.cellH;
        vh = Math.max(190, Math.abs(by - fy) + 130, (Math.abs(bx - fx) + 170) / ar) * fishZoom; vw = vh * ar; x = (fx + bx) / 2 - vw / 2; y = (fy + by) / 2 - vh / 2;
      } else if (fit) { x = (width - vw) / 2; y = (height - vh) / 2; }
      else if (activity) {
        const framed = GardenActivityCamera.frame(activity, { x: _gw.px * W.cellW, y: W.sky + _gw.py * W.cellH }, size, vh, activityCamera.zoom);
        x = framed.x; y = framed.y; vw = framed.w; vh = framed.h;
      }
      if (!fit) { if (vw > width) { vw = width; vh = vw / ar; } if (vh > height) { vh = height; vw = vh * ar; } x = clamp(x, 0, Math.max(0, width - vw)); y = clamp(y, 0, Math.max(0, height - vh)); }
      return { x, y, w: vw, h: vh };
    }
    // Only the frame/HUD comparison reuses this private result. Public callers
    // still receive an independent cameraControls snapshot on every request.
    const cameraUiControls = {};
    function updateCamera(dt, snap) {
      const prefs = _gdpPrefs(), target = cameraTarget(prefs), smooth = !snap && _gw.cam.init && gardenMotionOn(), mix = smooth ? 1 - Math.exp(-dt * 13) : 1;
      camera.x += (target.x - camera.x) * mix; camera.y += (target.y - camera.y) * mix;
      camera.w += (target.w - camera.w) * mix; camera.h += (target.h - camera.h) * mix;
      camera.scale = Math.min(size.w / camera.w, size.h / camera.h); camera.left = (size.w - camera.w * camera.scale) / 2; camera.top = (size.h - camera.h * camera.scale) / 2;
      const main = scene.cameras.main;
      // Phaser's zoom setters dirty the camera even for the same numeric value.
      // Compare its real zoom, so photo-camera restoration still takes effect.
      if (main.zoomX !== camera.scale || main.zoomY !== camera.scale) main.setZoom(camera.scale);
      main.centerOn(camera.x + camera.w / 2, camera.y + camera.h / 2);
      scene._nativeViewTransition = smooth && (Math.abs(target.h - camera.h) > target.h * .003 || performance.now() - zoomInputAt < 110);
      scene._nativeTargetZoom = Math.min(size.w / target.w, size.h / target.h);
      const cam = _gw.cam; cam.x = camera.x; cam.y = camera.y; cam.w = camera.w; cam.h = camera.h;
      cam.vh = camera.h; cam.init = true; cam.dirty = false; cam.goal = target;
      const controls = cameraControlsFor(prefs, cameraUiControls);
      if (controls.mode !== cameraUiMode || controls.canZoomIn !== cameraUiZoomIn || controls.canZoomOut !== cameraUiZoomOut) {
        cameraUiMode = controls.mode; cameraUiZoomIn = controls.canZoomIn; cameraUiZoomOut = controls.canZoomOut;
        if (typeof _gwUpdateCamUi === 'function') _gwUpdateCamUi();
      }
      if (options.onCamera) options.onCamera(camera);
    }
    function inCamera(b, margin, view) { const m = margin == null ? 96 : margin; view = view || camera; return b.x + b.width >= view.x - m && b.x <= view.x + view.w + m && b.y + b.height >= view.y - m && b.y <= view.y + view.h + m; }
    function drawingBoundsKnown(b) { return !!b && Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.width) && Number.isFinite(b.height) && b.width > 0 && b.height > 0 && Number.isFinite(b.x + b.width) && Number.isFinite(b.y + b.height); }
    function drawingMainExclusion(record, excluded, cameraId) {
      const target = record.root, bit = (cameraId == null ? scene.cameras.main.id : cameraId) | 0, owned = record._mainExclusionBit || 0;
      // Keep logical/preparation visibility. Only the scene camera is masked;
      // native cache and water RenderTextures use their separate id-zero camera.
      if (owned && (!excluded || owned !== bit)) { target.cameraFilter = (target.cameraFilter || 0) & ~owned; record._mainExclusionBit = 0; }
      if (!excluded || !bit || (bit & (bit - 1))) return false;
      // Never claim an existing filter bit, so returning onscreen cannot clear
      // another camera user's exclusion. Unrelated bits are preserved too.
      if (!((target.cameraFilter || 0) & bit)) { target.cameraFilter = (target.cameraFilter || 0) | bit; record._mainExclusionBit = bit; }
      return record._mainExclusionBit === bit;
    }
    function discoverSpecialMainActors() {
      // External garden sprites share this world's object ownership, but are
      // not World.dynamic records. Discover only on the existing dirty sort
      // (or explicit photo preparation); do not scan model collections/frame.
      const stones = typeof _wdi !== 'undefined' && _wdi.S && _wdi.S.stones;
      for (const node of objects.children) {
        const previous = specialMainClasses.get(node);
        if (previous !== undefined && !(previous === '' && stones && stones.node === node)) continue;
        let kind = '', key = '', body = null, lift = null, local = null;
        if (stones && stones.node === node && stones.id === 'wd-stones') {
          kind = 'stones'; key = 'wd-stones';
          // Static authored ellipses: this local bbox is prepared once per
          // connected owner, never queried during the normal culling loop.
          local = node.getBBox();
        } else {
          const bk = node.getAttribute('data-bk'), bug = bk && _gw.bugs && _gw.bugs.get(bk);
          if (bug && bug.node === node && bug.def && bug.def.shape === 'dragonfly' && node.querySelector('.gcb-dragonfly')) { kind = 'dragonfly'; key = bk; body = bug.inEl; lift = bug.liftEl; }
        }
        specialMainClasses.set(node, kind);
        if (kind) specialMainActors.set(node, { node, root: node.target, kind, key, body, lift, local, source: kind === 'stones' ? stones.svg : '', bounds: { x: 0, y: 0, width: 0, height: 0 }, boundsKnown: false, excluded: false });
      }
    }
    function specialMainTranslation(node) {
      const m = node && node._matrix;
      return m && m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && Number.isFinite(m.e) && Number.isFinite(m.f) ? m : null;
    }
    function specialMainBounds(record) {
      const m = specialMainTranslation(record.node), out = record.bounds;
      if (!m) return false;
      if (record.kind === 'stones') {
        const stones = typeof _wdi !== 'undefined' && _wdi.S && _wdi.S.stones, b = record.local;
        if (!stones || stones.node !== record.node || stones.svg !== record.source || stones.tf == null || !drawingBoundsKnown(b)) return false;
        out.x = m.e + b.x; out.y = m.f + b.y; out.width = b.width; out.height = b.height;
      } else {
        const b = _gw.bugs && _gw.bugs.get(record.key), bm = record.body && record.body._matrix, lm = specialMainTranslation(record.lift);
        // Decorated variants can add halos, wisps and scaling outside the
        // ordinary body plan. Leave those and unknown transforms untouched.
        if (!b || b.node !== record.node || b.inEl !== record.body || b.liftEl !== record.lift || b.v || !b.def || b.def.shape !== 'dragonfly' || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.lift) || b.lift < 0 || !Number.isFinite(b.def.size) || b.def.size <= 0 || !bm || !lm || lm.e !== 0) return false;
        const scale = Math.round(GW_BUG_SCALE * b.def.size * 100) / 100;
        if (!(scale > 0) || !Number.isFinite(bm.a) || !Number.isFinite(bm.d) || bm.b !== 0 || bm.c !== 0 || bm.e !== 0 || bm.f !== 0 || Math.abs(Math.abs(bm.a) - scale) > .000001 || Math.abs(bm.d - scale) > .000001) return false;
        // Authored tail <=22 (+1.9 stroke); wings <=17 x4.2 about
        // (4,+/-1.4), with shimmer scaleY<=1. A24-unit radius covers
        // every ordinary body/wing phase. Include the original foot shadow.
        const radius = 24 * scale + .1, shadowY = 3 * GW_BUG_SCALE * b.def.size + .1, x = b.x * W.cellW, y = W.sky + b.y * W.cellH;
        // Existing offscreen drawing defers transforms. Union its displayed
        // pose and live numeric pose, rather than hiding stale visible art.
        const left = Math.min(m.e, x) - radius, right = Math.max(m.e, x) + radius;
        const top = Math.min(m.f + lm.f - radius, y - b.lift - radius, m.f - shadowY, y - shadowY), bottom = Math.max(m.f + lm.f + radius, y - b.lift + radius, m.f + shadowY, y + shadowY);
        out.x = left; out.y = top; out.width = right - left; out.height = bottom - top;
      }
      return drawingBoundsKnown(out);
    }
    function cullSpecialMainActors(view) {
      specialMainCounts.tracked = specialMainCounts.stones = specialMainCounts.dragonflies = specialMainCounts.excludedStones = specialMainCounts.excludedDragonflies = specialMainCounts.unknownBounds = 0;
      for (const [node, record] of specialMainActors) {
        const owner = record.kind === 'stones' ? typeof _wdi !== 'undefined' && _wdi.S && _wdi.S.stones : _gw.bugs && _gw.bugs.get(record.key);
        if (!owner || owner.node !== node || !node.isConnected || node.scene !== scene || node.parentNode !== objects || !record.root.active) { drawingMainExclusion(record, false, mainExclusionCameraId); specialMainActors.delete(node); specialMainClasses.delete(node); continue; }
        record.boundsKnown = specialMainBounds(record);
        record.excluded = drawingMainExclusion(record, record.boundsKnown && !inCamera(record.bounds, mainDrawingGuard, view), mainExclusionCameraId);
        specialMainCounts.tracked++; specialMainCounts[record.kind === 'stones' ? 'stones' : 'dragonflies']++;
        if (!record.boundsKnown) specialMainCounts.unknownBounds++;
        if (record.excluded) specialMainCounts[record.kind === 'stones' ? 'excludedStones' : 'excludedDragonflies']++;
      }
    }
    function specialMainStatus() {
      return { ...specialMainCounts, targets: [...specialMainActors.values()].map(record => ({ kind: record.kind, key: record.key, bounds: record.boundsKnown ? { ...record.bounds } : null, logicalVisible: record.root.visible, excluded: record.excluded, ownedBit: record._mainExclusionBit || 0, cameraFilter: record.root.cameraFilter || 0 })) };
    }
    function cullAndCache(view, renderOnly, preparing) {
      view = view || camera;
      visibleStatic = 0; visibleTerrain = 0; terrainBaseReady = 0; mainExcludedDrawings = 0; mainExclusionCameraId = scene.cameras.main.id | 0;
      const resolution = scene.game.renderer.resolution || scene.game.config.resolution || 1;
      const physical = view.scale * resolution, qualityBand = [1, 2, 3, 4, 6, 8, 12].find(q => q >= physical) || 12;
      terrainBaseQuality = Math.max(1, Math.min(12, Math.ceil(Math.min(size.w / width, size.h / height) * resolution)));
      cacheQuality = qualityBand;
      for (const chunk of terrainChunks.values()) {
        const visible = inCamera(chunk.bounds, 64, view), cache = chunk.node._cache;
        const baseReady = !!chunk.node._cacheBase || !!cache && !cache.cropped && cache.quality >= terrainBaseQuality;
        if (baseReady) terrainBaseReady++;
        if (chunk.node.target.visible !== visible) chunk.node.target.setVisible(visible);
        if (visible) {
          visibleTerrain++;
          if (!baseReady && !inCamera(chunk.bounds, 0, view)) terrainBaseQueue.set(chunk.node, terrainBaseQuality);
          else terrainBaseQueue.delete(chunk.node);
          if (!chunk.node._cacheRecipe && (!chunk.seen || !cacheQueue.has(chunk.node))) cacheQueue.set(chunk.node, { staticOnly: false, quality: 1, retainBase: true, baseQuality: terrainBaseQuality, tileSize: 512 });
        } else if (!baseReady) terrainBaseQueue.set(chunk.node, terrainBaseQuality);
        else terrainBaseQueue.delete(chunk.node);
        chunk.seen = visible;
      }
      for (const item of terrainLabels) item.node.target.setVisible(inCamera(item.bounds, 64, view));
      let pierVisible = false;
      for (const record of pierDeckRecords.values()) {
        const visible = inCamera(record.bounds, 64, view), wasVisible = record.node.target.visible;
        if (wasVisible !== visible) record.node.target.setVisible(visible);
        if (visible) {
          pierVisible = true;
          if (!record.node._cacheRecipe && !wasVisible) cacheQueue.set(record.node, { staticOnly: false, tileSize: 512 });
        }
      }
      if (pierBoards.target.visible !== pierVisible) pierBoards.target.setVisible(pierVisible);
      for (const record of drawings.values()) {
        if (record.editorLifted) { drawingMainExclusion(record, false, mainExclusionCameraId); record.root.setVisible(true); continue; }
        const knownBounds = drawingBoundsKnown(record.bounds), visible = !knownBounds || inCamera(record.bounds, 96, view);
        if (record.root.visible !== visible) record.root.setVisible(visible);
        const excluded = drawingMainExclusion(record, knownBounds && !inCamera(record.bounds, mainDrawingGuard, view), mainExclusionCameraId);
        if (visible && excluded) mainExcludedDrawings++;
        if (visible) { visibleStatic++; if (!record.cacheScheduled) queueDrawing(record); }
      }
      for (const record of dynamic.values()) { const b = bounds(record.id); if (b) record.root.setVisible(inCamera({ x: b.left, y: b.top, width: b.width, height: b.height }, 150, view)); }
      cullSpecialMainActors(view);
      if (renderOnly) return;
      const started = performance.now(); let count = 0;
      const capture = (node, opts) => { cacheQueue.delete(node); const { viewBounds, visibleRoot, ...captureOptions } = opts || {}; GardenNativeArt.cache(node, { quality: 2, adaptive: true, ...captureOptions, preparing: !!preparing }); count++; return count >= 1 || performance.now() - started >= 3; };
      // Nearby ground gets its sharp native cache before decorative upgrades.
      // Hidden chunks retain a small fit-view cache under the same GPU budget.
      for (const chunk of terrainChunks.values()) if (chunk.seen && inCamera(chunk.bounds, 0, view) && cacheQueue.has(chunk.node)) { if (GardenNativeArt.cacheValid(chunk.node)) { cacheQueue.delete(chunk.node); continue; } if (scene._nativeViewTransition && chunk.node._cache) continue; if (capture(chunk.node, cacheQueue.get(chunk.node))) return; }
      for (const [node, opts] of cacheQueue) {
        if (node._dead) { cacheQueue.delete(node); continue; }
        if (!node.target.visible || opts.visibleRoot && !opts.visibleRoot.visible) continue;
        const b = opts.viewBounds || node.nativeBounds || node.getBBox(); if (!inCamera(b, 0, view)) continue;
        if (GardenNativeArt.cacheValid(node)) { cacheQueue.delete(node); continue; }
        if (scene._nativeViewTransition && node._cache) continue;
        if (capture(node, opts)) break;
      }
      // One bounded background capture follows visible work. It also demotes
      // hidden close-view caches to the quality needed by the whole-map view.
      if (count || scene._nativeViewTransition || performance.now() - started >= 2) return;
      for (const [node, quality] of terrainBaseQueue) {
        if (node._dead) { terrainBaseQueue.delete(node); continue; }
        terrainBaseQueue.delete(node);
        GardenNativeArt.cache(node, { staticOnly: false, quality, adaptive: false, background: true, baseCapture: true, crop: false, retainBase: true, baseQuality: quality, tileSize: 512, preparing: !!preparing });
        break;
      }
    }
    function point(clientX, clientY, local) {
      let x = clientX, y = clientY;
      if (!local && options.box) { const box = options.box.getBoundingClientRect(); x -= box.left; y -= box.top; }
      return { x: (camera.x + (x - camera.left) / camera.scale) / W.cellW, y: (camera.y + (y - camera.top) / camera.scale - W.sky) / W.cellH };
    }
    function project(x, y, lift) { return { x: (x * W.cellW - camera.x) * camera.scale + camera.left, y: (W.sky + y * W.cellH - (lift || 0) - camera.y) * camera.scale + camera.top }; }
    function cameraControlsFor(prefs, result) {
      const fishing = !!(_gw.fishing && _gw.fishing.state !== 'idle' && _gw.fishing.bx < GARDEN_ROOM_X), temporary = fishing || !!activityCamera;
      const mode = fishing ? fishViewMode : activityCamera ? activityCamera.mode : prefs.cam;
      const zoom = fishing ? fishZoom : activityCamera ? activityCamera.zoom : prefs.zoom == null ? typeof _gwCamDefaultIdx === 'function' ? _gwCamDefaultIdx() : 2 : Number(prefs.zoom), fit = mode === 'fit';
      result = result || {};
      result.mode = fit ? 'fit' : 'follow'; result.zoom = zoom; result.temporary = temporary;
      result.activity = fishing ? 'fishing' : activityCamera ? activityCamera.id : null;
      result.canZoomIn = fit || zoom > (temporary ? .35 : 0); result.canZoomOut = fit || zoom < (temporary ? 5 : GW_ZOOMS.length - 1);
      return result;
    }
    function cameraControls() { return cameraControlsFor(_gdpPrefs()); }
    function cameraSet(mode, step) {
      zoomInputAt = performance.now();
      const prefs = _gdpPrefs(), fishing = !!(_gw.fishing && _gw.fishing.state !== 'idle' && _gw.fishing.bx < GARDEN_ROOM_X);
      if (fishing) {
        if (step) { fishViewMode = 'focus'; fishZoom = clamp(fishZoom * Math.pow(1.22, step), .35, 5); }
        else if (mode) fishViewMode = mode === 'fit' ? 'fit' : 'focus';
      } else if (activitySubject()) {
        if (step) { activityCamera.mode = 'focus'; activityCamera.zoom = clamp(activityCamera.zoom * Math.pow(1.22, step), .35, 5); }
        else if (mode) { activityCamera.mode = mode === 'fit' ? 'fit' : 'focus'; if (mode === 'follow') activityCamera.zoom = 1; }
      } else if (step) { const initial = prefs.zoom == null ? typeof _gwCamDefaultIdx === 'function' ? _gwCamDefaultIdx() : 2 : Number(prefs.zoom); prefs.zoom = clamp(initial + step, 0, GW_ZOOMS.length - 1); prefs.cam = 'follow'; }
      else if (mode) prefs.cam = mode;
      _gw.cam.dirty = true; if (!fishing && !activityCamera && typeof saveUI === 'function') saveUI(); updateCamera(.016, false);
      return cameraControls();
    }
    function bounds(id) {
      const row = drawings.get(id) || drawings.get('prop:' + id) || drawings.get('plant:' + id) || drawings.get('decor:' + id) || dynamic.get(id);
      if (!row) return null; const b = row.bounds || row.handle.bounds, dx = row.x == null ? 0 : row.x * W.cellW, dy = row.y == null ? 0 : W.sky + row.y * W.cellH - (row.lift || 0);
      return { x: b.x + dx, y: b.y + dy, width: b.width, height: b.height, left: b.x + dx, top: b.y + dy, right: b.x + dx + b.width, bottom: b.y + dy + b.height };
    }
    function pick(worldX, worldY) {
      const candidates = [], pt = { x: worldX / W.cellW, y: (worldY - W.sky) / W.cellH }, designing = typeof gardenDesignOn === 'function' && gardenDesignOn();
      for (const row of drawings.values()) { const made = designing && /^dzc\d+-/.test(row.metadata.id || ''), fixed = designing && row.metadata.id && gardenDesignRow(row.metadata.id); if (!['plant', 'decor', 'prop', 'land'].includes(row.metadata.kind) && !made && !fixed) continue; const b = row.bounds, owns = row.metadata.kind === 'prop' && row.metadata.prop && _gwPropOwnsPoint(row.metadata.prop, pt); if (owns || worldX >= b.x && worldX <= b.x + b.width && worldY >= b.y && worldY <= b.y + b.height) candidates.push({ ...row.metadata, kind: made || fixed ? 'prop' : row.metadata.kind, depth: row.depth, record: row }); }
      for (const row of dynamic.values()) if (row.hit || row.onClick) { const b = bounds(row.id); if (b && worldX >= b.left && worldX <= b.right && worldY >= b.top && worldY <= b.bottom) candidates.push({ kind: row.kind || 'sprite', id: row.id, model: row, depth: row.root.depth }); }
      for (const row of markers) if (worldX >= row.x && worldX <= row.x + row.width && worldY >= row.y && worldY <= row.y + row.height) candidates.push(row);
      candidates.sort((a, b) => b.depth - a.depth);
      if (designing) return candidates[0] || null;
      const top = candidates[0]; if (!top || top.kind !== 'prop') return top || null;
      const props = candidates.filter(hit => hit.kind === 'prop' && hit.prop), physical = props.find(hit => _gwPropOwnsPoint(hit.prop, pt));
      if (physical) return physical;
      const intent = _gwPlantPickIntent(gardenHere(), pt), planted = intent.plant && drawings.get('plant:' + intent.plant.uid), plantHit = planted ? { ...planted.metadata, depth: planted.depth, record: planted } : candidates.find(hit => hit.kind === 'plant');
      // This only changes the visual roof hit. Placement and plant actions
      // still run their ordinary canonical validators and walking rules.
      if (intent.seed) return null;
      if (intent.plantTool && plantHit) return plantHit;
      if (intent.tool === 'hand') {
        const itemHit = [plantHit, ...candidates.filter(hit => hit.kind === 'decor')].filter(Boolean).sort((a, b) => b.depth - a.depth)[0];
        const targetDepth = itemHit ? itemHit.depth : W.sky + (intent.cell.y + 1) * W.cellH, covering = props.filter(hit => hit.depth >= targetDepth);
        const revealed = covering.length && covering.every(hit => hit.record.behind || hit.record.root.alpha <= .45);
        if (revealed && itemHit) return itemHit;
        if (revealed && intent.emptyBed) return null;
      }
      return top;
    }
    function actor(id, svg, x, y, opts) {
      opts = opts || {}; let row = dynamic.get(id);
      if (!row || row.source !== svg) {
        if (row) row.handle.destroy(); const handle = GardenNativeArt.create(scene, svg, {}); (opts.layer === 'actors' ? actors : opts.layer === 'pets' ? pets : objects).appendChild(handle.rootNode);
        row = { id, source: svg, handle, root: handle.root, node: handle.rootNode, bounds: handle.bounds, ...opts }; dynamic.set(id, row); sorted = true;
      }
      Object.assign(row, { x, y, lift: opts.lift || 0 });
      const scale = opts.scale == null ? 1 : opts.scale;
      row.node.setAttribute('transform', 'translate(' + x * W.cellW + ' ' + (W.sky + y * W.cellH - row.lift) + ') scale(' + (opts.face < 0 ? -scale : scale) + ' ' + scale + ')');
      row.node.setAttribute('data-z', String(opts.z == null ? y : opts.z)); row.root.setDepth(opts.depth == null ? W.sky + (opts.z == null ? y : opts.z) * W.cellH : opts.depth);
      if (opts.alpha != null) row.root.setAlpha(opts.alpha);
      const z = Math.floor(y * 3); if (row.zk !== z) { row.zk = z; sorted = true; }
      return row;
    }
    function remove(id) { const row = dynamic.get(id); if (!row) return; row.handle.destroy(); dynamic.delete(id); sorted = true; }
    function drawRoute() {
      const points = _gw.path || [], key = points.length ? [_gw.px.toFixed(1), _gw.py.toFixed(1), ...points.map(p => p.x + ',' + p.y)].join('|') : '';
      if (routeKey === key) return; routeKey = key; route.clear(); if (!points.length) return;
      route.lineStyle(1.8 / camera.scale, 0xf7edca, .7).beginPath().moveTo(_gw.px * W.cellW, W.sky + _gw.py * W.cellH);
      for (const p of points) route.lineTo(p.x * W.cellW, W.sky + p.y * W.cellH); route.strokePath();
      const end = points[points.length - 1]; route.lineStyle(1.5 / camera.scale, 0xfff4cf, .8).strokeEllipse(end.x * W.cellW, W.sky + end.y * W.cellH, 16, 8);
    }
    function update(time, delta) {
      // Frame-rate independence: a slow frame (under ~18 fps) is simulated as
      // up to five equal sub-steps of at most 55 ms, so walking keeps real
      // speed instead of slowing down. At normal frame rates this is one step.
      if (dead) return; const frameDt = Math.min(.25, Math.max(0, delta / 1000 || .016)), steps = Math.max(1, Math.ceil(frameDt / .055 - 1e-9)), dt = frameDt / steps;
      // Old-version lines can briefly preserve a shoreline cove without a
      // dashboard repaint. Ordinary swimming keeps this resident revision.
      if (model && typeof gardenLakeGeometry === 'function' && gardenLakeGeometry(model).revision !== shorelineRevision) sync(model);
      _gw.frameActive = true; _gw.frameGrid = null; _gw.framePrefs = _gdpPrefs();
      try {
        if (editorPaint) { const paint = editorPaint; editorPaint = null; paint(); }
        for (let i = 0; i < steps; i++) { _gw.t = (_gw.t || 0) + dt; move(dt); }
        drawPlayer(time); updateCamera(frameDt, !_gw.cam.init); drawRoute(); for (const row of dynamic.values()) if (typeof row.update === 'function') row.update(frameDt, row);
        cullAndCache(); natureTick(time);
        const lighting = window.GardenNative && GardenNative.lighting(), environment = lighting && lighting.environment ? lighting.environment() : {};
        for (const row of drawings.values()) if (row.handle.kind && row.handle.update) row.handle.update(time, environment);
        sortObjects();
      }
      finally { _gw.frameActive = false; _gw.frameGrid = null; _gw.framePrefs = null; }
    }
    function prepareRender() {
      if (dead) return false;
      // Photo capture can replace the Phaser camera while simulation is paused.
      // Read its current numeric viewport without changing follow-camera state.
      const cam = scene.cameras.main, zoomX = cam.zoomX || cam.zoom || 1, zoomY = cam.zoomY || cam.zoom || 1;
      const view = { x: cam.scrollX + cam.width / 2 - cam.width / zoomX / 2, y: cam.scrollY + cam.height / 2 - cam.height / zoomY / 2, w: cam.width / zoomX, h: cam.height / zoomY, scale: Math.max(zoomX, zoomY) };
      const stones = typeof _wdi !== 'undefined' && _wdi.S && _wdi.S.stones;
      if (stones && stones.cullBox && stones.node && stones.node.scene === scene && stones.node.parentNode === objects && stones.node.isConnected) {
        // A source born outside the follow view can defer its first placement.
        // A direct wide capture uses the authored position, including sources
        // whose normal frame has not yet installed their first transform.
        if (stones.tf == null && Number.isFinite(stones.x) && Number.isFinite(stones.y) && Number.isFinite(stones.lift)) {
          stones.tf = 'translate(' + (stones.x * W.cellW).toFixed(1) + ' ' + (W.sky + stones.y * W.cellH - stones.lift).toFixed(1) + ')'; stones.node.setAttribute('transform', stones.tf);
          const z = stones.z != null ? stones.z : stones.y;
          if (Number.isFinite(z)) { stones.zk = Math.floor(z * 3); stones.node.setAttribute('data-z', z.toFixed(2)); gardenRowPlace(objects, stones.node, z); }
        }
        gardenCull(stones, stones.node, stones.x, stones.y, view);
      }
      discoverSpecialMainActors();
      cullAndCache(view, true);
      sortObjects();
      // The caller runs GardenNativeArt.updateAll once after this to refresh
      // text resolution and expose native vectors above cached pixel quality.
      return true;
    }
    function preparePlayerPose() {
      if (!playerInner.firstChild || typeof gartPlayerSvg !== 'function' || typeof _gplAvatar !== 'function' || typeof _gartMotionOk !== 'function') return 0;
      const avatar = _gplAvatar(), gear = typeof _gplMyGear === 'function' ? _gplMyGear() : null, motion = _gartMotionOk(), key = JSON.stringify([avatar, gear, motion]);
      if (!playerPosePreparation || playerPosePreparation.key !== key) {
        const poses = [];
        for (const pose of ['idle', 'walk']) for (const dir of ['s', 'n', 'e']) poses.push({ pose, dir });
        poses.push({ pose: 'fish', dir: 'e', stageRod: true });
        playerPosePreparation = { key, poses, next: 0, frame: -1 };
      }
      const preparation = playerPosePreparation, frame = scene.game.loop.frame;
      if (preparation.next === preparation.poses.length || preparation.frame === frame) return preparation.poses.length - preparation.next;
      preparation.frame = frame;
      const pose = preparation.poses[preparation.next], entry = playerInner._nativePlayerCurrent;
      // The original compiler source is the retained-body key. Serializing
      // innerHTML here could make an equivalent but cold replacement body.
      const original = entry ? entry.source : playerInner.innerHTML, transform = playerInner.getAttribute('transform');
      const source = gartPlayerSvg(avatar, { ...pose, motion, gear });
      if (source) try {
        playerInner.innerHTML = source;
        const scale = typeof GW_SCALE === 'number' ? GW_SCALE : .74;
        playerInner.setAttribute('transform', 'scale(' + (pose.dir === 'e' && _gw.face < 0 ? -scale : scale) + ' ' + scale + ')');
        const body = playerInner._nativePlayerCurrent && playerInner._nativePlayerCurrent.node || playerInner.firstChild;
        if (body) GardenNativeArt.cache(body, { staticOnly: true, quality: 2, adaptive: true, tileSize: 512, preparing: true });
      } finally {
        playerInner.innerHTML = original;
        if (transform == null) playerInner.removeAttribute('transform'); else playerInner.setAttribute('transform', transform);
      }
      preparation.next++;
      return preparation.poses.length - preparation.next;
    }
    function prepareCaches() {
      if (dead) return { ready: true, terrainReady: 0, terrainTotal: 0, pendingVisible: 0, pendingPlayerPoses: 0 };
      const started = performance.now();
      // Only loading calls this method. Compile one current-avatar pose per
      // engine frame without advancing movement, actions or the pose state.
      const pendingPlayerPoses = preparePlayerPose();
      // Hidden loading can use a few short jobs per engine frame. Normal play
      // keeps its single-capture limit, while opening avoids idle frame waits.
      for (let i = 0; i < 6; i++) { cullAndCache(null, false, true); if (performance.now() - started >= 5) break; }
      sortObjects();
      let terrainReady = 0, pendingVisible = GardenNativeArt.pendingCaches(scene);
      for (const chunk of terrainChunks.values()) {
        const cache = chunk.node._cache;
        if (chunk.node._cacheBase || cache && !cache.cropped && cache.quality >= terrainBaseQuality) terrainReady++;
        else if (!inCamera(chunk.bounds, 0)) terrainBaseQueue.set(chunk.node, terrainBaseQuality);
      }
      for (const [node, opts] of cacheQueue) {
        if (node._dead || !node.target.visible || opts.visibleRoot && !opts.visibleRoot.visible) continue;
        if (inCamera(opts.viewBounds || node.nativeBounds || node.getBBox(), 0)) pendingVisible++;
      }
      return { ready: terrainReady === terrainChunks.size && !pendingVisible && !pendingPlayerPoses, terrainReady, terrainTotal: terrainChunks.size, pendingVisible, pendingPlayerPoses };
    }
    function resize(w, h) { size = { w: Math.max(1, w), h: Math.max(1, h) }; _gw.size = { ...size }; _gw.sizeOk = true; _gw.cam.init = false; updateCamera(.016, true); }
    function destroy() { if (dead) return; dead = true; clearPack(); designPreview(null); restoreCanopyAlpha(); for (const row of drawings.values()) row.handle.destroy(); for (const row of dynamic.values()) row.handle.destroy(); for (const record of specialMainActors.values()) drawingMainExclusion(record, false); specialMainActors.clear(); drawings.clear(); dynamic.clear(); needRings.clear(); clearPierDecks(); cacheQueue.clear(); terrainBaseQueue.clear(); terrainChunks.clear(); rootNode.remove(); }
    function effectBounds(node, localBounds, worldMatrix) {
      const bounds = localBounds || node.getBBox(), matrix = worldMatrix || node.target.getWorldTransformMatrix();
      const ma = matrix.a, mb = matrix.b, mc = matrix.c, md = matrix.d, tx = matrix.tx == null ? matrix.e || 0 : matrix.tx, ty = matrix.ty == null ? matrix.f || 0 : matrix.ty;
      const x0 = bounds.x, y0 = bounds.y, x1 = bounds.x + bounds.width, y1 = bounds.y + bounds.height;
      // The same four corners and affine operation order, without temporary
      // corner pairs, projected points or the terrainBox coordinate arrays.
      const ax = ma * x0 + mc * y0 + tx, ay = mb * x0 + md * y0 + ty;
      const bx = ma * x1 + mc * y0 + tx, by = mb * x1 + md * y0 + ty;
      const cx = ma * x0 + mc * y1 + tx, cy = mb * x0 + md * y1 + ty;
      const dx = ma * x1 + mc * y1 + tx, dy = mb * x1 + md * y1 + ty;
      const x = Math.min(ax, bx, cx, dx), y = Math.min(ay, by, cy, dy);
      return { x, y, width: Math.max(ax, bx, cx, dx) - x, height: Math.max(ay, by, cy, dy) - y };
    }
    function effectsState() {
      const frame = scene.game.loop.frame;
      if (effectFrame !== frame) {
        effectFrame = frame; effectActorRows = []; effectHeldRows = []; effectCreatureRows = []; effectsState.fishingRigs = [];
        const add = (id, node, body, x, y, kind, moving, key, lift) => {
          if (!node || !body || !node.isConnected || !body.target || !body.target.active || !node.target.visible && !node.target._nativeCacheHiddenBy) return;
          const localBounds = body.getBBox(), matrix = body.target.getWorldTransformMatrix(), b = effectBounds(body, localBounds, matrix), sourceFootY = matrix.ty == null ? matrix.f || 0 : matrix.ty;
          const row = { id, source: body.target, node: body, x, y, groundX: x, groundY: y, waterline: y, w: kind === 'pet' ? Math.min(42, Math.max(12, b.width * .8)) : 22, h: kind === 'pet' ? 7 : 8, tall: Math.min(100, Math.max(12, b.height)), bounds: b, kind, moving: !!moving, dynamic: true, bakedContact: true, captureKey: key || body._gplKey || '', lift: lift == null ? y - sourceFootY : lift, sourceFootY };
          effectActorRows.push(row); return row;
        };
        add('player', playerNode, playerInner, _gw.px * W.cellW, W.sky + _gw.py * W.cellH, 'actor', _gw.moving, playerInner._gplKey);
        const rig = (id, F, fx, footX, footY) => {
          if (!F || F.state === 'idle' || F.bx >= GARDEN_ROOM_X || !fx || !fx.rod || !fx.line || !fx.bob) return;
          const waterY = W.sky + F.by * W.cellH, u = F.state === 'cast' ? Math.max(0, Math.min(1, (F.t - .22) / .5)) : F.state === 'land' ? (1 - Math.min(1, F.t / .5)) ** 2 : 1;
          effectsState.fishingRigs.push({ id, rod: fx.rod, rodSkin: fx.skin && fx.skin.g, line: fx.line, bob: fx.bob, footX, footY, waterX: F.bx * W.cellW, waterY, floatPlaneY: footY + (waterY - footY) * u, state: F.state });
        };
        rig('player-rig', _gw.fishing, _gw.fx, _gw.px * W.cellW, W.sky + _gw.py * W.cellH);
        const held = (id, node, x, y) => {
          if (!node || !node.isConnected || !node.target || !node.target.active) return;
          const body = node.querySelector('.gcm') || node;
          if (!effectIds.has(body)) effectIds.set(body, ++effectSerial);
          const b = effectBounds(body); effectHeldRows.push({ id, source: body.target, x, y, w: b.width, h: 1, tall: Math.max(12, y - b.y), bounds: b, kind: 'held', dynamic: true, moving: false, captureKey: String(effectIds.get(body)) });
        };
        if (typeof _gmo !== 'undefined' && _gmo.g) held('player-held', _gmo.g, _gw.px * W.cellW, W.sky + _gw.py * W.cellH);
        if (typeof _gtgo !== 'undefined' && _gtgo.held) held('player-photo-held', _gtgo.held, _gw.px * W.cellW, W.sky + _gw.py * W.cellH);
        const pets = new Set();
        const pet = (P, id) => {
          if (!P || !P.node || pets.has(P.node) || typeof _ptwGone === 'function' && _ptwGone(P)) return;
          pets.add(P.node);
          const body = P.face && P.face.target ? P.face : P.node.querySelector('.gdp-body') || P.node;
          const motion = typeof petGardenMotionState === 'function' ? petGardenMotionState(P) : null;
          const row = add(id, P.node, body, motion ? motion.groundX : P.x * W.cellW, motion ? motion.groundY : W.sky + P.y * W.cellH, 'pet', motion ? motion.moving : P.tx != null || P.moving, (P.mood || P.pose || '') + '|' + (P.act || '') + '|' + (P.dir || P.face || 1), motion ? motion.altitude : undefined);
          if (row && motion) Object.assign(row, { groundX: motion.groundX, groundY: motion.groundY, altitude: motion.altitude, shadowScale: motion.shadowScale, airborne: motion.airborne });
        };
        if (typeof _ptw !== 'undefined' && _ptw.on) for (let index = 0; index < _ptw.pets.length; index++) pet(_ptw.pets[index], 'pet:' + index);
        if (_gw.pet) pet(_gw.pet, 'pet:follow');
        if (typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) {
          if (A.rm || A.away) continue;
          add('peer:' + A.w, A.root, A.inner, A.x * W.cellW, W.sky + A.y * W.cellH, 'actor', A.moving, A.key);
          rig('peer-rig:' + A.w, A.fish, A.fxe, A.x * W.cellW, W.sky + A.y * W.cellH);
          if (A.heldG || A.photoG) held('peer-held:' + A.w, A.heldG || A.photoG, A.x * W.cellW, W.sky + A.y * W.cellH);
          if (A.pp) pet(A.pp, 'peer-pet:' + A.w);
        }
        if (typeof _gllRoams !== 'undefined') for (const R of _gllRoams) pet(R.P, 'host-pack:' + (R.u || R.species));
        if (typeof _gwSprites !== 'undefined') for (const S of _gwSprites) {
          if (!S.node || !S.node.target || !S.ground && S.foot == null || S.simulationOnly) continue;
          if (!effectIds.has(S)) effectIds.set(S, ++effectSerial);
          add('animal:' + effectIds.get(S), S.node, S.node, S.x * W.cellW, W.sky + S.y * W.cellH, 'pet', !!S.moving, S.svg, S.lift || 0);
        }
        if (typeof gardenLeafBoatWaterActors === 'function') {
          const boats = gardenLeafBoatWaterActors();
          for (let index = 0; index < Math.min(8, boats.length); index++) {
            const boat = boats[index]; if (!Number.isFinite(boat.x) || !Number.isFinite(boat.y)) continue;
            const row = add('leafboat:' + boat.id, boat.node, boat.body, boat.x, boat.y, 'boat', boat.moving, boat.captureKey, 0);
            if (row) Object.assign(row, { w: clamp(Number.isFinite(boat.w) ? boat.w : 24, 4, 64), h: clamp(Number.isFinite(boat.h) ? boat.h : 5, 2, 16), tall: clamp(Number.isFinite(boat.tall) ? boat.tall : 24, 4, 80), medium: 'water', altitude: 0, airborne: false, shadowStrength: .35 });
          }
        }
        const seenCreatures = new Set();
        const creature = c => {
          const S = c && c.S, node = S && (c.node || S.node), body = c && (c.poseEl || c.artEl);
          if (!S || seenCreatures.has(S) || !node || node.scene !== scene || !rootNode.contains(node) || !node.isConnected || !node.target.visible || !body || !body.target || !body.target.active || c.hidden || c.gone || c.left || c.onScreen === false || c.fade <= .025 || c.sink >= .95) return;
          seenCreatures.add(S);
          let state = creatureMotion.get(S);
          if (!state || state.node !== node) {
            state = { node, x: S.x, y: S.y, wake: node.querySelector('.gl-wake') }; creatureMotion.set(S, state);
            // NativeWater supplies shore-clipped rings for these same subjects.
            // Keep the authored wake for Classic and indoor Life renderers.
            if (state.wake) state.wake.style.display = 'none';
          }
          const moving = Math.hypot(S.x - state.x, S.y - state.y) > .0001; state.x = S.x; state.y = S.y;
          const bounds = effectBounds(body), x = S.x * W.cellW, y = W.sky + S.y * W.cellH, lift = Math.max(0, S.lift || 0);
          effectCreatureRows.push({ id: 'wildlife:' + Math.abs(c.id % 100000), species: c.def.id, source: body.target, node: body, x, y, groundX: x, groundY: y, waterline: y, sourceFootY: y - lift, bounds, w: Math.max(4, bounds.width), h: 4, tall: Math.max(4, bounds.height), kind: 'wildlife', medium: c.medium, sink: c.sink || 0, lift, altitude: lift, airborne: c.medium === 'air' && !(c.raisedPerch || c.perched), moving, dynamic: true, animated: true, nativeWaterWake: true, captureKey: [c.def.id, c.clip, c.tokens, c.medium, c.fx < 0 ? -1 : 1, !!(c.raisedPerch || c.perched)].join('|') });
        };
        if (typeof _gl !== 'undefined' && _gl.list) for (const c of _gl.list) creature(c);
        if (typeof _glc !== 'undefined' && _glc.ghosts) for (const g of _glc.ghosts.values()) creature(g.c);
      }
      return { revision: surfaceRevision, parent: rootNode._inner, regions: waterRegions, lockedRegions, gates: gateRows, landmarks: landmarkRows, containsWater, actors: effectActorRows, creatures: effectCreatureRows, fishingRigs: effectsState.fishingRigs || [], reflectables: effectHeldRows.length ? reflectedScenery.concat(effectHeldRows) : reflectedScenery, lights: pointLights };
    }
    function occluders() { return solidObjects.concat([{ id: 'player', x: _gw.px * W.cellW, y: W.sky + _gw.py * W.cellH, w: 19, h: 8, height: 51, kind: 'actor', root: playerNode.target }]); }
    function playerOcclusionState() { return { active: coveringCanopies.length > 0, occluders: coveringCanopies.slice(), tracked: canopyOccluders.length, outline: false, treeRootAlphaUnchanged: true, fadedCrowns: canopyOccluders.filter(crown => crown.faded).map(crown => ({ id: crown.id, alpha: crown.node.target.alpha, normalAlpha: crown.normalAlpha })) }; }
    const api = { root, rootNode, objectsNode: objects, actorsNode: actors, petsNode: pets, uiNode: ui, effectsNode: effects, playerNode, sync, update, prepareRender, prepareCaches, walkTo, actor, spawn: spec => actor(spec.id, spec.svg || '', spec.x, spec.y, spec), remove, point, project, pick, bounds, resize, cameraSet, cameraControls, zoom: step => cameraSet(null, step), camera: () => ({ ...camera }), model: () => model, playerState: () => ({ x: _gw.px, y: _gw.py, face: _gw.face, moving: _gw.moving }), entities: drawings, dynamic, occluders, lightSources: () => pointLights, renderStats: () => ({ staticObjects: drawings.size, visibleStatic, terrainChunks: terrainChunks.size, visibleTerrain, cacheQuality, terrainBaseQuality, terrainBaseReady, queuedTerrainBase: terrainBaseQueue.size, queuedCaches: cacheQueue.size, needGroundRings: needRings.size, mainCameraCull: { cameraId: mainExclusionCameraId, guardWorldPx: mainDrawingGuard, excludedDrawings: mainExcludedDrawings, specialActors: specialMainStatus() }, playerOcclusion: playerOcclusionState() }), setVisible: value => root.setVisible(value), depthChanged: () => { sorted = true; }, flushDepth: sortObjects, stopMoving: () => { _gw.path = []; _gw.then = null; _gw.hold = null; _gw.keys.clear(); _gw.spd = 0; }, destroy };
    api.effectsState = effectsState;
    api.frontierState = () => frontierMetadata;
    api.syncNeedRings = syncNeedRings;
    api.playerOcclusionState = playerOcclusionState;
    api.designLayer = designLayer;
    api.designPreview = designPreview;
    api.scheduleDesignPreview = paint => { editorPaint = paint; };
    api.designStatus = () => ({ preview: !!editorState, source: editorState && editorState.record ? editorState.record.id : null, retained: !!(editorState && editorState.record), moves: editorMoves, layerPaints: editorLayerPaints, layerConnected: design.isConnected, layerChildren: design.children.length, layerShapes: design.querySelectorAll('path,circle,ellipse,rect').length, previewChildren: editorPreview._inner.list.length });
    api.setVisible = value => { if (!value) restoreCanopyAlpha(); return root.setVisible(value); };
    api.pauseAmbient = state => { ambientPause = state; for (const row of drawings.values()) if (row.handle.pauseAmbient) row.handle.pauseAmbient(state); };
    _gw.nativeWorld = api; _gw.on = true; _gw.box = options.box || _gw.box; _gw.root = options.root || _gw.root; _gw.svg = rootNode; _gw.node = playerNode;
    if (!_gw.keys) _gw.keys = new Set(); if (!_gw.path) _gw.path = []; _gw.cam.init = false;
    sync(options.model || gardenHere()); resize(size.w, size.h); drawPlayer(0);
    return api;
  }
  return Object.freeze({ create });
})();
