/* Garden's retained Phaser scene. The compatibility drawing is compiled into
 * immutable textures and a cached scene graph. Gameplay changes arrive as
 * deltas; static scenery has no SVG work in the rendering loop. Animated rigs,
 * effects and the camera move native objects without regenerating their art.
 */
window.GardenPhaser = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let current = null, requested = null, serial = 0, lastFailure = null, lastBootState = null, lastTextureState = null;
  const semantic = '.gd-it,.gd-player,.gd-pet-follow,.gd-sprite,.gd-fs,.gd-bug,.gd-held,.gd-leapfish,.gd-catch-moment,.gd-photo-held,.gd-swing,.gd-pl-in,.pt-cfx,[data-live],[data-gp-layer]';
  const containers = new Set(['gd-objects', 'gd-actors', 'gd-ui', 'gd-pets', 'gd-row', 'gd-player', 'gd-pl-bob', 'gd-pl-sh', 'gd-pet-follow', 'gdp-body', 'gdp-face', 'gd-fishing', 'gd-rings', 'gd-fx', 'gd-ground', 'gd-sky', 'gd-clouds', 'gd-gridlines', 'gart-live', 'gd-school', 'gd-bugs', 'gd-bug', 'gb-lift', 'gll-actor', 'gll-bob', 'gll-fx', 'gd-photo-frame', 'ptw', 'ptw-lift']);
  const layerDepth = { 'gd-sky': -10000, 'gd-clouds': -9900, 'gd-far': -9800, 'gd-ground': -9700, 'gd-gridlines': -9550, 'gd-paths': -9400, 'gd-dz': -9350, 'gd-weather': 79000, 'gd-nightlayer': 80000, 'gd-ui': 90000 };
  const extraMotion = { 'gda-flutter': ['flutter', 320], 'gda-glow': ['glow', 3200], 'gda-ripple': ['ripple', 4500], 'gda-flicker': ['flicker', 900], 'gda-spin': ['spin', 4000], 'gda-bob': ['bob', 3600], 'gda-blink': ['blink', 2800], 'gart-swing': ['swing', 3600], 'gart-buzz': ['buzz', 4600], 'gart-hop': ['hop', 4200], 'gart-peck': ['peck', 3400], 'gart-wag': ['wag', 1800], 'gart-shuffle': ['shuffle', 7000], 'gart-creep': ['creep', 12000], 'gart-breathe': ['breathe', 3800], 'gart-ear': ['ear', 5000], 'gart-step': ['step', 600], 'gart-blink': ['eye-blink', 5200], 'gart-flick': ['flick', 2600], 'gart-fall': ['rain', 800], 'gart-snowf': ['snow', 10000], 'gart-rays': ['rays', 9000], 'gart-glimmer': ['rays', 4400], 'gart-leaf': ['leaf', 16000], 'gart-drift': ['drift', 40000], 'gart-amb': ['ambient', 16000], 'gart-wing': ['wing', 280], 'gart-fly': ['fly', 50000] };
  const extraMotionSelector = Object.keys(extraMotion).map(c => '.' + c).join(',');
  const metadataAttrs = new Set(['data-uid', 'data-sig', 'data-x', 'data-y', 'data-vid', 'data-live', 'data-bk', 'data-prop', 'data-land', 'role', 'tabindex', 'pointer-events']);

  function wanted() { try { return _gdpPrefs().renderEngine === 'phaser'; } catch (e) { return false; } }
  function active(svg) { return !!(current && current.ready && current.presented && !current.dead && (!svg || current.svg === svg)); }
  function preparing(svg) { return !!(current && !current.dead && !current.presented && (!svg || current.svg === svg)); }
  function enqueueAsset(r, s) { if (!s.all.has(r)) return; s.assets.add(r); s.assetQueueDirty = true; }
  function invalidateAsset(r, s) { if (!s.all.has(r)) return; r.dirty = true; r.empty = false; r.measured = false; r.motionUpgrade = false; r.qualityUpgrade = false; r.prepared = null; r.rev++; s.frozenRecords.delete(r); s.workStats.invalidations++; if (!tryCachedRig(r, s)) enqueueAsset(r, s); }
  function classify(r) { const n = r.node; r.isPlayer = !!n.closest('.gd-player'); r.isActor = !!n.closest('.gd-player,.gd-pet,.gd-pet-follow,.ptw,.gd-sprite,.gd-fs,.gd-bug,.gd-catch-moment,.gd-photo-held,.gll-actor'); r.isTransient = !!n.closest('.gd-catch-moment,.gd-photo-held,.gd-held,.gd-leapfish,.gd-bobber,.gd-bite,.pt-cfx'); r.isGround = !!n.closest('.gd-ground,.gd-sky,.gd-far'); r.isPet = !!n.closest('.ptw,.gd-pet-follow'); r.isCharacter = r.isPlayer || r.isPet || !!n.closest('.gll-actor'); r.isSemantic = n.matches(semantic); r.pickNode = n.closest('[data-uid],[data-prop],[data-land],.ptw'); r.inSchool = !!n.closest('.gd-school'); r.fishDepth = n.classList.contains('gd-fs'); }
  function jobCurrent(r, s, revision) { if (s.dead || !s.all.has(r) || revision !== r.rev || !r.node.isConnected || !s.svg.contains(r.node)) { s.workStats.abortedJobs++; return false; } return true; }
  function preparedVisual(r, s) {
    if (r.prepared) return r.prepared;
    const snapshot = r.snapshot || svgSnapshot(r.node, s), ancestors = ancestorClasses(r.node, s), kind = !r.partRoot && r.isActor ? 'actor' : 'still', markup = snapshot.outerHTML;
    s.workStats.visualPreparations++;
    return r.prepared = { snapshot, ancestors, kind, markup, baseKey: hash(markup + '|' + ancestors + '|' + kind), css: null };
  }
  function cachedVisual(s, base, quality, frames) { for (const q of [.5, 1, 2]) if (q >= quality) { const texture = s.textures.get(base + 'q' + q + 'a' + frames); if (texture) return texture; } return null; }
  function assetQuality(r, s) {
    // Resolution belongs to an asset, never to the camera. Walking and zooming
    // must not schedule a second raster job for an already compiled drawing.
    return s.lowMemory ? 1 : r.pickNode || r.isActor || r.isTransient ? 2 : 1;
  }
  function multiply(a, b) { return { a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b, c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d, e: a.a * b.e + a.c * b.f + a.e, f: a.b * b.e + a.d * b.f + a.f }; }
  function attributeMatrix(n) {
    let m = IDENTITY;
    if (n.transform && n.transform.baseVal) { const transforms = n.transform.baseVal; for (let i = 0; i < transforms.numberOfItems; i++) m = multiply(m, transforms.getItem(i).matrix); }
    return m;
  }
  function graphNode(n, s) {
    let g = s.graph.get(n);
    if (!g) { g = { node: n, parent: n !== s.svg && n.parentElement ? graphNode(n.parentElement, s) : null, drawings: new Set(), dirty: true, revision: 0, parentRevision: -1, checkedAt: -1 }; s.graph.set(n, g); }
    return g;
  }
  function attachGraph(r, s) {
    r.graph = graphNode(r.node, s); r.graphPath = [];
    for (let g = r.graph; g; g = g.parent) { g.drawings.add(r); r.graphPath.push(g); }
  }
  function detachGraph(r) { for (const g of r.graphPath || []) g.drawings.delete(r); r.graphPath = null; }
  function invalidateGraph(n, s) {
    const g = s.graph.get(n); if (g) { g.dirty = true; g.checkedAt = -1; } s.graphEpoch++;
  }
  function compiledGraph(g, s) {
    if (g.checkedAt === s.graphEpoch && !g.dirty) return g;
    const parent = g.parent ? compiledGraph(g.parent, s) : null;
    if (g.dirty || !parent || g.parentRevision !== parent.revision) {
      const n = g.node, root = n === s.svg;
      if (g.dirty) {
        const sampled = s.animationStyles.get(n), cl = n.classList;
        g.local = root ? IDENTITY : sampled && sampled.full || attributeMatrix(n);
        const opacity = n.getAttribute('opacity');
        g.localAlpha = root ? 1 : sampled && sampled.opacity != null ? sampled.opacity : (opacity == null ? 1 : Math.max(0, Math.min(1, Number(opacity)))) * (n.style.opacity ? Number(n.style.opacity) : 1);
        if (!root && cl.contains('gd-prop') && cl.contains('gd-behind')) g.localAlpha *= .38;
        if (!root && cl.contains('gd-gridlines')) g.localAlpha *= .16;
        g.localHidden = !root && (n.getAttribute('display') === 'none' || n.getAttribute('visibility') === 'hidden' || !n._gpRenderOnly && n.style.display === 'none' || cl.contains('gd-pl-xray') || cl.contains('gd-route') && !cl.contains('is-on') || cl.contains('gd-gridlines') && s.box.dataset.placing !== '1' && !document.documentElement.classList.contains('gd-carrying') || s.replacedProps && !n.hasAttribute('data-gp-layer') && n.getAttribute('data-prop') && s.replacedProps.has(n.getAttribute('data-prop')) || s.replaceGround && (cl.contains('gd-ground') || cl.contains('gd-paths')));
        g.localDepth = null;
        if (n.hasAttribute('data-gp-depth')) g.localDepth = Number(n.getAttribute('data-gp-depth')) || 0;
        else if (n.hasAttribute('data-z') && Number.isFinite(Number(n.getAttribute('data-z')))) g.localDepth = GARDEN_WORLD.sky + Number(n.getAttribute('data-z')) * GARDEN_WORLD.cellH;
        else { for (const name of cl) if (layerDepth[name] != null) { g.localDepth = layerDepth[name]; break; } if (g.localDepth == null && cl.contains('gd-actors')) g.localDepth = 50000; }
      }
      g.world = parent ? multiply(parent.world, g.local) : g.local;
      g.alpha = (parent ? parent.alpha : 1) * g.localAlpha;
      g.hidden = !!(g.localHidden || parent && parent.hidden);
      g.depth = g.localDepth == null ? parent ? parent.depth : 0 : g.localDepth;
      g.parentRevision = parent ? parent.revision : -1; g.revision++; g.dirty = false; s.workStats.graphUpdates++;
    }
    g.checkedAt = s.graphEpoch; return g;
  }
  function inverseMatrix(m) { const det = m.a * m.d - m.b * m.c; if (Math.abs(det) < .00001) return IDENTITY; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; }
  function matrix(node, svg) {
    const live = current && current.svg === svg ? current : null;
    if (live && live.graph.has(node)) return compiledGraph(live.graph.get(node), live).world;
    const list = []; let n = node;
    const session = current && current.svg === svg ? current : null;
    while (n && n !== svg) { let m = attributeMatrix(n); if (n.localName === 'svg' && window.GardenPhaserRig) m = multiply(m, GardenPhaserRig.viewportMatrix(n)); const sampled = session && session.animationStyles.get(n); list.push(sampled && sampled.full || m); n = n.parentElement; }
    let out = IDENTITY; for (let i = list.length - 1; i >= 0; i--) out = multiply(out, list[i]); return out;
  }
  function xy(m, x, y) { return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; }
  function destroyObject(r) { if (r.object) { r.object.destroy(); r.object = null; } if (r.affineWrap) { r.affineWrap.destroy(); r.affineWrap = null; } }
  function placeObject(r, m, p, s) {
    const o = r.object, px = r.pixelScale ? r.pixelScale.x : 1, py = r.pixelScale ? r.pixelScale.y : 1;
    const a = m.a * px, b = m.b * px, c = m.c * py, d = m.d * py, dot = a * c + b * d;
    if (Math.abs(dot) > .00001 * Math.max(1, Math.hypot(a, b) * Math.hypot(c, d))) {
      // Signed 2D SVD represents shear with two retained rotations and signed
      // scale; it needs no custom pipeline, mesh upload or bitmap regeneration.
      if (!r.affineWrap) { const parent = o.parentContainer; r.affineWrap = s.scene.add.container(0, 0); if (parent) { parent.remove(o); parent.add(r.affineWrap); } r.affineWrap.add(o); }
      const aa = a * a + b * b, dd = c * c + d * d, angle = .5 * Math.atan2(2 * dot, aa - dd), cs = Math.cos(angle), sn = Math.sin(angle), disc = Math.hypot(aa - dd, 2 * dot);
      const sx = Math.sqrt(Math.max(0, (aa + dd + disc) / 2)), sy = (a * d - b * c < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (aa + dd - disc) / 2)), rotation = Math.atan2(b * cs + d * sn, a * cs + c * sn);
      r.affineWrap.setPosition(p.x, p.y).setRotation(rotation).setScale(sx, sy).setDepth(r.depth); o.setPosition(0, 0).setRotation(-angle).setScale(1, 1);
    } else {
      if (r.affineWrap) r.affineWrap.setPosition(0, 0).setRotation(0).setScale(1, 1).setDepth(r.depth);
      const sx = Math.hypot(a, b), sy = sx > .00001 ? (a * d - b * c) / sx : Math.hypot(c, d); o.setPosition(p.x, p.y).setRotation(sx > .00001 ? Math.atan2(b, a) : Math.atan2(-c, d)).setScale(sx, sy);
    }
  }
  function screenMatrix(node, s) {
    const b = s.box.getBoundingClientRect(), p = s.projection, c = s.camera;
    const projection = { a: p.scale, b: 0, c: 0, d: p.scale, e: b.left + p.left - c.x * p.scale, f: b.top + p.top - c.y * p.scale };
    const outer = s.rootAnimationMatrix ? multiply({ ...IDENTITY, e: b.left, f: b.top }, multiply(s.rootAnimationMatrix, { a: p.scale, b: 0, c: 0, d: p.scale, e: p.left - c.x * p.scale, f: p.top - c.y * p.scale })) : projection;
    const m = multiply(outer, node === s.svg ? IDENTITY : matrix(node, s.svg));
    // SVGPoint.matrixTransform requires a native SVGMatrix in some browsers;
    // a separately constructed DOMMatrix is not accepted consistently.
    const out = s.svg.createSVGMatrix(); for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) out[name] = m[name]; return out;
  }
  function adaptCtm(node, s, child) {
    if (node === s.svg || typeof node.getScreenCTM !== 'function' || s.ctmMethods.has(node)) return;
    const original = node.getScreenCTM; s.ctmMethods.set(node, original);
    node.getScreenCTM = () => s.presented && !s.dead ? screenMatrix(node, s) : original.call(node);
    if (child && typeof node.getBoundingClientRect === 'function') { const rect = node.getBoundingClientRect; s.childRectMethods.set(node, rect); node.getBoundingClientRect = () => s.presented ? bounds(node) || rect.call(node) : rect.call(node); }
  }
  function restoreCtm(node, s) { const original = s.ctmMethods.get(node); if (original) { node.getScreenCTM = original; s.ctmMethods.delete(node); } const rect = s.childRectMethods.get(node); if (rect) { node.getBoundingClientRect = rect; s.childRectMethods.delete(node); } }
  function inverse(m, x, y) { const d = m.a * m.d - m.b * m.c; if (Math.abs(d) < 0.00001) return null; const xx = x - m.e, yy = y - m.f; return { x: (m.d * xx - m.c * yy) / d, y: (-m.b * xx + m.a * yy) / d }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function classes(n) { return n.classList ? [...n.classList] : []; }
  function isContainer(n, s) { if (n !== s.svg && n.localName === 'svg') return false; if (n.classList.contains('gd-weather')) return true; if (n.localName === 'g' && n.closest('.gd-weather') && (!n.matches(extraMotionSelector) || n.matches('.gart-amb,.gart-buzz,.gart-fly'))) return true; return n === s.svg || classes(n).some(c => containers.has(c)) || n.classList.contains('gart-bake') && n.getAttribute('data-split') === '1' || n.children.length === 1 && n.firstElementChild.matches('.gd-ring') || s.split.has(n); }
  function baseDepth(n, s) {
    let p = n;
    while (p && p !== s.svg) {
      if (p.hasAttribute('data-gp-depth')) return Number(p.getAttribute('data-gp-depth')) || 0;
      const z = p.getAttribute('data-z'); if (z != null && Number.isFinite(+z)) return GARDEN_WORLD.sky + Number(z) * GARDEN_WORLD.cellH;
      for (const c of classes(p)) if (layerDepth[c] != null) return layerDepth[c];
      if (p.classList.contains('gd-actors')) return 50000;
      p = p.parentElement;
    }
    return 0;
  }
  function weatherShapes(n) {
    if (!n.closest('.gd-weather')) return null;
    if (n.localName === 'line' || n.localName === 'circle') return [{ kind: 'shape', node: n }];
    if (n.localName === 'path' && n.parentElement.matches('.gart-wx') && !/[a-z]/i.test((n.getAttribute('d') || '').replace(/[MLHVZ]/gi, ''))) return [{ kind: 'lines', node: n, points: pathPoints(n.getAttribute('d'), 12000) }];
    if (!n.matches('.gart-fall,.gart-snowf,.gart-glimmer,.gda-ripple')) return null;
    const out = [], number = '([-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*))';
    const circle = new RegExp('^M' + number + '\\s+' + number + 'a' + number + '\\s+' + number + '\\s+0\\s+1\\s+0\\s+' + number + '\\s+0a' + number + '\\s+' + number + '\\s+0\\s+1\\s+0\\s+' + number + '\\s+0z$', 'i');
    for (const child of n.children) {
      if (child.localName !== 'path' || /url\(/.test((child.getAttribute('fill') || '') + (child.getAttribute('stroke') || ''))) return null;
      const d = child.getAttribute('d') || '';
      if (n.classList.contains('gart-fall')) { if (/[^MmLl\d\s.,+\-eE]/.test(d)) return null; out.push({ kind: 'lines', node: child, points: pathPoints(d, 12000) }); }
      else {
        const pieces = d.match(/M[^Mz]*z/gi) || []; if (!pieces.length || pieces.length > 3000 || pieces.join('') !== d.replace(/\s+$/g, '')) return null;
        const ellipses = [];
        for (const piece of pieces) { const m = circle.exec(piece); if (!m) return null; const v = m.slice(1).map(Number); if (v[2] <= 0 || v[3] <= 0 || Math.abs(v[4] - v[2] * 2) > .21 || Math.abs(v[7] + v[2] * 2) > .21) return null; ellipses.push({ x: v[0] + v[2], y: v[1], rx: v[2], ry: v[3] }); }
        out.push({ kind: 'ellipses', node: child, ellipses });
      }
    }
    return out.length ? out : null;
  }
  function isVector(n, s) { if (n.closest('.gd-weather')) { const weather = weatherShapes(n); if (weather) { s.weatherShapes.set(n, weather); return true; } } return s.vectorNodes.has(n) || n.matches('.gd-line,.gd-rod,.gll-fxrod,.gll-fxline,.gd-photo-mask,.gd-photo-corners,.gd-route-line,.gd-hover,.gd-sel,.gart-ring,.gd-ring,.gd-glint,.gd-pl-sh > ellipse') || n.localName === 'path' && (n.closest('.gd-gridlines') || n.parentElement && n.parentElement.matches('.gd-ground,.gd-sky') && /^M-3000\b/.test(n.getAttribute('d') || '')); }
  function nativeMotion(n) {
    const sway = n.matches('.gd-plant') && n.querySelector('.gda-sway');
    const extra = classes(n).map(c => extraMotion[c]).find(Boolean);
    const kind = sway || n.matches('.gda-sway') ? 'sway' : n.matches('.gart-cloud') ? 'cloud' : n.matches('.gd-waves') ? 'wave' : n.matches('.gart-ring') ? 'ring' : n.matches('.gd-ring') ? 'cast-ring' : n.matches('.gd-catch-moment') ? 'catch-pop' : n.matches('.gd-glint') ? 'glint' : n.matches('.gd-halo') ? 'glow' : extra ? extra[0] : n.localName === 'line' && n.closest('.gd-weather.is-rain') ? 'legacy-rain' : n.localName === 'circle' && n.closest('.gd-weather.is-snow') ? 'legacy-snow' : '';
    if (!kind) return null;
    const css = getComputedStyle(sway || n), seconds = (value, fallback) => { const v = parseFloat(value); return Number.isFinite(v) ? v * (String(value).trim().endsWith('ms') ? 1 : 1000) : fallback; };
    let box = null; try { const b = n.getBBox(); if (b.width > 0 && b.height > 0) box = { x: b.x, y: b.y, width: b.width, height: b.height }; } catch (e) { /* hidden initial state */ }
    const fallback = extra ? extra[1] : { sway: 5500, cloud: 150000, wave: 7000, ring: 6400, 'cast-ring': 1400, glint: 3400, glow: 4000, 'legacy-rain': 700, 'legacy-snow': 6000 }[kind];
    const origin = String(css.transformOrigin || '0 0').split(/\s+/), fillBox = css.transformBox === 'fill-box';
    const coord = (v, start, size) => String(v).endsWith('%') ? start + parseFloat(v) / 100 * size : (fillBox ? start : 0) + (parseFloat(v) || 0);
    return { kind, periodMs: kind === 'catch-pop' ? 450 : Math.max(70, seconds(css.animationDuration, fallback) || fallback || 1600), delayMs: seconds(css.animationDelay, 0), startedAt: performance.now(), amplitude: kind === 'cloud' ? Math.min(900, Math.max(0, parseFloat(css.getPropertyValue('--gx')) || 300)) : kind === 'wave' ? 14 : 0, gx: parseFloat(css.getPropertyValue('--gx')) || 0, gy: parseFloat(css.getPropertyValue('--gy')) || 0, gp: parseFloat(css.getPropertyValue('--gp')) || 80, radius: parseFloat(css.getPropertyValue('--r')) || 24, pivotX: extra && box ? coord(origin[0], box.x, box.width) : Number(n.getAttribute('cx')) || 0, pivotY: extra && box ? coord(origin[1], box.y, box.height) : Number(n.getAttribute('cy')) || 0, box, native: true };
  }
  function cssText() {
    function walk(rules) {
      let selected = '';
      for (const r of rules || []) {
        const text = r.cssText || '';
        if (r.cssRules && !r.selectorText && !r.name) {
          const inner = walk(r.cssRules), open = text.indexOf('{');
          // Keep the original conditions. Flattening reduced-motion rules here
          // would disable every sprite animation for everyone.
          if (inner && open >= 0) selected += text.slice(0, open + 1) + inner + '}\n';
        } else if (/\.(?:gd|gart|gpl|gdp|gfs|gmo|gcp|gcm|gcb|gcs|gba|gfa|pet|pt-|pf-fig|gll|grb|grw)|@keyframes (?:gd|gart|gpl|pet|pt-|gfs|gmo|gcp|gcm|gcb|gcs|gba|gfa)/.test(text)) selected += text + '\n';
      }
      return selected;
    }
    let out = ''; for (const sheet of document.styleSheets) { try { out += walk(sheet.cssRules); } catch (e) { /* not a local sheet */ } }
    return out;
  }
  function assetCss(clone, ancestors, s) {
    if (window.GardenTextureStyles) {
      if (s.compiledStyles == null) { try { s.compiledStyles = GardenTextureStyles.compile(s.css); s.cssStats = s.compiledStyles.stats; } catch (e) { s.compiledStyles = false; } }
      if (s.compiledStyles) return s.compiledStyles.forDrawing(clone, ancestors);
    }
    if (s.cssSheet === false) return s.css;
    if (!s.cssSheet) {
      try { s.cssSheet = new CSSStyleSheet(); s.cssSheet.replaceSync(s.css); }
      catch (e) { s.cssSheet = false; return s.css; }
    }
    const present = new Set(String(ancestors || '').split(/\s+/).filter(Boolean));
    for (const n of [clone, ...clone.querySelectorAll('[class]')]) for (const name of classes(n)) present.add(name);
    const signature = [...present].sort().join('|'), cached = s.cssCache.get(signature);
    if (cached != null) { s.cssStats.hits++; s.cssCache.delete(signature); s.cssCache.set(signature, cached); return cached; }
    // A matching selector must have every positive class outside its functional
    // pseudo-classes in this drawing or its ancestors. Ignore classes inside
    // :is/:where/:not/:has and attribute values, so alternatives and negation
    // remain conservative. Escaped selectors are retained intact.
    const mayMatch = selector => {
      if (selector.includes('\\')) return true;
      let round = 0, square = 0, quote = '', branchPossible = true;
      for (let i = 0; i < selector.length; i++) {
        const c = selector[i];
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") { quote = c; continue; }
        if (c === '[') { square++; continue; } if (c === ']') { square--; continue; }
        if (square) continue;
        if (c === '(') { round++; continue; } if (c === ')') { round--; continue; }
        if (round) continue;
        if (c === ',') { if (branchPossible) return true; branchPossible = true; continue; }
        if (c === '.') { const name = /^[-_a-zA-Z][-_a-zA-Z0-9]*/.exec(selector.slice(i + 1)); if (name) { if (!present.has(name[0])) branchPossible = false; i += name[0].length; } }
      }
      return branchPossible;
    };
    const select = rules => {
      let out = '';
      for (const rule of rules || []) {
        const text = rule.cssText || '';
        if (rule.selectorText) { if (mayMatch(rule.selectorText)) out += text + '\n'; }
        else if (rule.cssRules && !rule.name) { const inner = select(rule.cssRules), open = text.indexOf('{'); if (inner && open >= 0) out += text.slice(0, open + 1) + inner + '}\n'; }
        else out += text + '\n';  // retain all keyframes and other selected at-rules
      }
      return out;
    };
    const css = select(s.cssSheet.cssRules); s.cssStats.misses++; s.cssStats.selectedBytes += css.length; s.cssStats.maxSelectedBytes = Math.max(s.cssStats.maxSelectedBytes, css.length);
    s.cssCache.set(signature, css); if (s.cssCache.size > 128) s.cssCache.delete(s.cssCache.keys().next().value);
    return css;
  }
  function measurementRoot(s) {
    if (!s.measureRoot) {
      s.measureHost = document.createElement('div'); s.measureHost.setAttribute('aria-hidden', 'true');
      s.measureHost.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;visibility:hidden;pointer-events:none;contain:strict';
      s.measureRoot = s.measureHost.attachShadow({ mode: 'closed' }); document.body.appendChild(s.measureHost); s.measureContextDirty = true;
    }
    if (s.measureContextDirty) {
      const css = getComputedStyle(s.svg), names = new Set(['font-family', 'font-size', 'font-style', 'font-weight', 'font-stretch', 'line-height', 'letter-spacing', 'color', 'direction']);
      for (const name of css) if (name.startsWith('--')) names.add(name);
      for (const name of names) s.measureHost.style.setProperty(name, css.getPropertyValue(name));
      s.measureContextDirty = false;
    }
    return s.measureRoot;
  }
  function renderSlice(s) {
    if (s.dead) return Promise.resolve(false);
    if (!s.presented) {
      if (!interacting(s)) return Promise.resolve(true);
      s.workStats.frameYields++; return new Promise(resolve => requestAnimationFrame(() => resolve(!s.dead)));
    }
    s.workStats.frameYields++; return new Promise(resolve => s.frameWaiters.add(resolve));
  }
  function releaseRenderSlices(s, live) { for (const resolve of s.frameWaiters) resolve(live); s.frameWaiters.clear(); }
  function urgentAsset(r) {
    if (r.partRoot && r.partRoot.trackedSources && r.partRoot.trackedSources.size || !r.motionUpgrade && !r.qualityUpgrade && (r.isTransient || r.isCharacter)) return true;
    const s = current;
    if (!s || r.texture || r.empty || r.hidden || r.type === 'chunk-root') return false;
    // First-visible pixels are gameplay work. Overscan and richer motion may
    // wait, but a newly exposed path or building must fill both decode slots.
    const b = worldBounds(r), c = s.camera;
    return b.right >= c.x && b.left <= c.x + c.w && b.bottom >= c.y && b.top <= c.y + c.h;
  }
  function findOwner(n, s) { for (let p = n; p && p !== s.svg; p = p.parentElement) { const r = s.records.get(p); if (r && r.type !== 'container') return r; } return null; }
  function sourceBox(r) {
    if (r.measured) return true;
    if (r.node._gpBox) { r.box = { ...r.node._gpBox }; r.measured = true; return true; }
    try { const b = r.node.getBBox(); if (b.width > 0 && b.height > 0) { r.box = { x: Math.floor(b.x - 3), y: Math.floor(b.y - 3), width: Math.ceil(b.width + 6), height: Math.ceil(b.height + 6) }; r.measured = true; return true; } } catch (e) { /* a newly hidden/replaced node can need an isolated measure */ }
    return false;
  }
  function register(n, s) {
    if (!n || n.nodeType !== 1 || ['defs', 'style', 'title', 'desc', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'filter'].includes(n.localName.toLowerCase())) return;
    if (n._gartKids) s.fragmentSources.add(n);
    if (s.records.has(n)) {
      const g = s.graph.get(n), parent = n !== s.svg && n.parentElement ? graphNode(n.parentElement, s) : null;
      if (g && g.parent !== parent) { const drawings = [...g.drawings]; for (const drawing of drawings) detachGraph(drawing); g.parent = parent; for (const drawing of drawings) attachGraph(drawing, s); }
      touchTree(n, s); return;
    }
    // A complete plant is one visual asset. Splitting all its static siblings
    // into primitives would multiply cold-start jobs and texture allocations.
    const type = isContainer(n, s) ? 'container' : isVector(n, s) ? 'vector' : 'image';
    const r = { node: n, type, rev: 0, order: ++s.order, hidden: false, m: IDENTITY, box: n.matches(semantic) ? { x: -180, y: -250, width: 360, height: 300 } : null, object: null, texture: null, motion: n._gpMotion || nativeMotion(n), dirty: true };
    classify(r);
    attachGraph(r, s);
    r.hushEligible = !!(n.closest('.gd-it') && n.closest('.gd-objects') || n.closest('.gart-live,.gd-needs,.gart-cloud'));
    s.records.set(n, r); s.all.add(r);
    if (type === 'image' && n.matches('.gd-decor')) s.decorRoots.add(r);
    if (type !== 'container' && n.closest('.gd-weather')) {
      r.weather = true; r.motionStack = [];
      for (let p = n; p && p !== s.svg; p = p.parentElement) { let motion = s.motionSpecs.get(p); if (motion === undefined) { motion = nativeMotion(p); s.motionSpecs.set(p, motion); } if (motion) r.motionStack.unshift({ node: p, motion }); if (p.classList.contains('gd-weather')) break; }
      r.motion = null;
    }
    if (type === 'image') sourceBox(r);
    adaptCtm(n, s);
    if (type === 'image' && n.closest('.gd-player,.gd-pet,.gd-sprite,.gd-fs,.gd-bug,.gll-actor,.gd-catch-moment')) for (const child of n.querySelectorAll('*')) adaptCtm(child, s, true);
    if (n.matches('.gd-pl-sh > ellipse')) r.shadowAlpha = Number(getComputedStyle(n).opacity || 1) * Number(getComputedStyle(n.parentElement).opacity || 1);
    // Existing tooltips, pets and feedback can ask the logical node for a screen
    // rectangle. Return the retained visual's geometry, not display:none's zero.
    if (n !== s.svg && typeof n.getBoundingClientRect === 'function') {
      r.rectMethod = n.getBoundingClientRect;
      n.getBoundingClientRect = () => s.presented ? bounds(n) || r.rectMethod.call(n) : r.rectMethod.call(n);
    }
    if (type === 'container') for (const c of n.children) register(c, s);
    else if (type === 'vector') { r.object = s.scene.add.graphics(); s.transforms.add(r); s.vectors.add(r); }
    else { s.transforms.add(r); enqueueAsset(r, s); }
  }
  function removeRecord(r, s) {
    if (r.parts) { for (const part of r.parts) removeRecord(part, s); r.parts = null; }
    if (r.chunks) { for (const chunk of r.chunks) removeRecord(chunk, s); r.chunks = null; }
    destroyObject(r); detachGraph(r); unindexRecord(r, s); s.visibleRecords.delete(r); s.visibleMotions.delete(r);
    if (r.rectMethod) { try { r.node.getBoundingClientRect = r.rectMethod; } catch (e) { /* node already gone */ } }
    if (s.records.get(r.node) === r) s.records.delete(r.node); s.all.delete(r); s.assets.delete(r); s.transforms.delete(r); s.vectors.delete(r); r.rev++;
    s.decorQueue.delete(r);
    s.decorRoots.delete(r);
    s.frozenRecords.delete(r);
    if (r.texture) release(r.texture, s);
  }
  function removeTree(node, s) { for (const child of node.children || []) removeTree(child, s); const r = s.records.get(node); if (r) removeRecord(r, s); restoreCtm(node, s); }
  function descendants(n, s, fn) {
    const r = s.records.get(n); if (r && r.type !== 'container') { fn(r); return; }
    for (const c of n.children || []) descendants(c, s, fn);
  }
  function touchTree(n, s) { invalidateGraph(n, s); const g = s.graph.get(n); if (g) for (const r of g.drawings) if (r.type !== 'container') s.transforms.add(r); }
  function rebuild(n, s) {
    removeTree(n, s);
    register(n, s);
  }
  function splitFor(n, owner, s, vectorNode) {
    // A nested SVG owns a viewport (x/y/viewBox/preserveAspectRatio). Its
    // original parent image retains that projection. Never promote internal
    // paths to world Graphics using only their transform attribute chain.
    const viewport = n.closest('svg');
    if (viewport && viewport !== s.svg && n !== viewport) { invalidateAsset(owner, s); return; }
    if (vectorNode) s.vectorNodes.add(n);
    for (let p = n.parentElement; p && p !== owner.node.parentElement; p = p.parentElement) s.split.add(p);
    rebuild(owner.node, s);
  }
  function mutations(records, s) {
    if (s.dead) return;
    const invalid = new Set(), transformed = new Set(); s.workStats.mutationBatches++;
    for (const event of records) {
      const n = event.target; if (n !== s.svg && !s.svg.contains(n)) continue;
      if (n === s.svg && event.type === 'attributes') { if (event.attributeName === 'viewBox') { s.cameraDirty = true; s.assetQueueDirty = true; } continue; }
      if (event.type === 'attributes' && (metadataAttrs.has(event.attributeName) || event.attributeName.startsWith('aria-'))) continue;
      const r = s.records.get(n), owner = findOwner(n, s);
      if (n._gartKids) s.fragmentSources.add(n);
      if (event.type === 'attributes') invalidateGraph(n, s);
      if (event.type === 'childList') {
        for (const added of event.addedNodes) if (added.nodeType === 1 && added.closest('.gd-player,.gd-pet,.gd-sprite,.gd-fs,.gd-bug,.gll-actor,.gd-catch-moment')) { adaptCtm(added, s, true); for (const child of added.querySelectorAll('*')) adaptCtm(child, s, true); }
        for (const gone of event.removedNodes) if (gone.nodeType === 1 && !s.svg.contains(gone)) removeTree(gone, s);
        if (owner && owner.node !== n || r && (r.type === 'image' || r.type === 'chunk-root')) { invalid.add(owner || r); continue; }
        for (const added of event.addedNodes) if (added.nodeType === 1) register(added, s);
        // SVG groups do not lay out their siblings. Re-registering the added
        // subtree is enough; touching the entire objects layer for every move
        // turns one scene patch into repeated full-world traversals.
        continue;
      }
      const attr = event.attributeName;
      if (event.oldValue === n.getAttribute(attr)) continue;
      if (attr === 'class') {
        const paintClasses = value => String(value || '').split(/\s+/).filter(c => c && !['gart-off', 'gart-rest', 'gart-nosky', 'gd-behind'].includes(c)).sort().join(' ');
        if (paintClasses(event.oldValue) === paintClasses(n.getAttribute(attr))) { transformed.add(n); continue; }
      }
      if (attr === 'transform' || attr === 'data-z' || attr === 'data-gp-depth' || attr === 'opacity' || attr === 'display' || attr === 'visibility') {
        if (owner && owner.node !== n && attr === 'transform') splitFor(n, owner, s);
        else transformed.add(n);
      } else if (r && r.type === 'vector') { r.dirty = true; s.weatherShapes.delete(n); s.vectors.add(r); }
      else if (attr === 'class' || attr === 'style') {
        transformed.add(n);
        if (owner) invalid.add(owner);
        else {
          const appearance = value => String(value || '').replace(/(?:^|;)\s*(?:transform|translate|rotate|scale|opacity)\s*:[^;]*/gi, '').trim();
          if (attr === 'class' || appearance(event.oldValue) !== appearance(n.getAttribute(attr))) descendants(n, s, image => { if (image.type === 'image' || image.type === 'chunk-root') invalid.add(image); });
        }
      } else if (owner) {
        // A fish's variant sheen is opacity-only. A changing path is a retained
        // Graphics primitive rather than a raster upload every simulation step.
        if (['d', 'points', 'cx', 'cy', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2'].includes(attr) && n.localName !== 'g') splitFor(n, owner, s, true);
        else invalid.add(owner);
      }
    }
    for (const r of invalid) invalidateAsset(r, s);
    for (const node of transformed) { let covered = false; for (let p = node.parentElement; p && p !== s.svg; p = p.parentElement) if (transformed.has(p)) { covered = true; break; } if (!covered) touchTree(node, s); }
    queueAssets(s);
  }
  function hidden(n, s) {
    for (let p = n; p && p !== s.svg; p = p.parentElement) {
      if (p.getAttribute('display') === 'none' || p.getAttribute('visibility') === 'hidden' || !p._gpRenderOnly && p.style.display === 'none' || p.classList.contains('gart-off')) return true;
      if (p.classList.contains('gd-route') && !p.classList.contains('is-on')) return true;
      if (p.classList.contains('gd-pl-xray')) return true;
      if (p.classList.contains('gd-gridlines') && s.box.dataset.placing !== '1' && !document.documentElement.classList.contains('gd-carrying')) return true;
      if (s.replacedProps && !p.hasAttribute('data-gp-layer') && p.getAttribute('data-prop') && s.replacedProps.has(p.getAttribute('data-prop'))) return true;
      if (s.replaceGround && (p.classList.contains('gd-ground') || p.classList.contains('gd-paths'))) return true;
    }
    return false;
  }
  function alpha(n, s) { let a = 1; for (let p = n; p && p !== s.svg; p = p.parentElement) { const sampled = s.animationStyles.get(p); if (sampled && sampled.opacity != null) a *= sampled.opacity; else { const o = p.getAttribute('opacity'); if (o != null) a *= Math.max(0, Math.min(1, Number(o))); if (p.style.opacity) a *= Number(p.style.opacity); if (p.classList.contains('gd-prop') && p.classList.contains('gd-behind')) a *= .38; } if (p.classList.contains('gd-gridlines')) a *= 0.16; } return a; }
  function cssMatrix(value) {
    if (!value || value === 'none') return IDENTITY;
    try { const NativeMatrix = window.DOMMatrixReadOnly || window.DOMMatrix, m = new NativeMatrix(value); if ([m.a, m.b, m.c, m.d, m.e, m.f].every(Number.isFinite)) return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }; } catch (e) { /* older native parser: retain matrix serialization fallback */ }
    const values = String(value || '').slice(String(value || '').indexOf('(') + 1).match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi);
    if (!values || value === 'none') return IDENTITY;
    const v = values.map(Number); if (String(value).startsWith('matrix3d')) return { a: v[0], b: v[1], c: v[4], d: v[5], e: v[12], f: v[13] };
    return v.length === 6 ? { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] } : IDENTITY;
  }
  function disposeAnimationSampler(state, s) {
    if (!state.sampler) return;
    for (const entry of state.animations.values()) if (entry.mirror) { entry.mirror.cancel(); entry.mirror = null; }
    state.sampler.svg.remove(); state.sampler = null; s.samplerCount = Math.max(0, s.samplerCount - 1);
  }
  function mirrorAnimationCss(node, state, s, css, attribute, box) {
    if (!state.properties.has('transform') || css.transform !== 'none') return null;
    if (state.animations.size > 16) { state.samplerLimit = true; return null; }
    if (!state.sampler) {
      if (s.samplerCount >= 128) { state.samplerLimit = true; return null; }
      if (!s.samplerHost) { s.samplerHost = document.createElement('div'); s.samplerHost.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;visibility:hidden;pointer-events:none;contain:layout style paint'; s.samplerHost.setAttribute('aria-hidden', 'true'); document.body.appendChild(s.samplerHost); }
      const svg = document.createElementNS(NS, 'svg'), target = document.createElementNS(NS, 'g'), rect = document.createElementNS(NS, 'rect'); svg.setAttribute('width', '1'); svg.setAttribute('height', '1'); svg.style.cssText = 'width:1px;height:1px;overflow:visible'; rect.setAttribute('fill', '#000'); rect.setAttribute('opacity', '0'); target.appendChild(rect); svg.appendChild(target); s.samplerHost.appendChild(svg); state.sampler = { svg, target, rect }; s.samplerCount++;
    }
    const sampler = state.sampler, viewport = node.ownerSVGElement, viewBox = viewport && viewport.getAttribute('viewBox');
    if (viewBox && sampler.svg.getAttribute('viewBox') !== viewBox) sampler.svg.setAttribute('viewBox', viewBox);
    const geometry = [box.x, box.y, Math.max(.001, box.width), Math.max(.001, box.height)].join(',');
    if (sampler.geometry !== geometry) { sampler.rect.setAttribute('x', String(box.x)); sampler.rect.setAttribute('y', String(box.y)); sampler.rect.setAttribute('width', String(Math.max(.001, box.width))); sampler.rect.setAttribute('height', String(Math.max(.001, box.height))); sampler.geometry = geometry; }
    const target = sampler.target; if (target.style.animation !== 'none') target.style.animation = 'none'; if (target.style.transformBox !== css.transformBox) target.style.transformBox = css.transformBox; if (target.style.transformOrigin !== css.transformOrigin) target.style.transformOrigin = css.transformOrigin;
    const baseline = 'matrix(' + [attribute.a, attribute.b, attribute.c, attribute.d, attribute.e, attribute.f].join(' ') + ')'; if (target.getAttribute('transform') !== baseline) target.setAttribute('transform', baseline);
    for (const prop of state.properties) if (prop !== 'transform' && prop !== 'transformOrigin') { const value = node.style[prop] || (prop === 'opacity' ? node.getAttribute('opacity') || '1' : 'none'); if (target.style[prop] !== value) target.style[prop] = value; }
    for (const [animation, entry] of state.animations) {
      if (!entry.mirror) {
        const effect = animation.effect; if (!effect || typeof effect.getKeyframes !== 'function') continue;
        const frames = effect.getKeyframes().map(frame => { const next = { offset: frame.computedOffset == null ? frame.offset : frame.computedOffset, easing: frame.easing, composite: frame.composite }; for (const prop of entry.props) if (frame[prop] != null) next[prop] = frame[prop]; return next; });
        entry.mirror = target.animate(frames, effect.getTiming()); entry.mirror.pause(); if (effect.composite) entry.mirror.effect.composite = effect.composite; if (effect.iterationComposite) entry.mirror.effect.iterationComposite = effect.iterationComposite;
      }
      if (entry.mirror.currentTime !== animation.currentTime) entry.mirror.currentTime = animation.currentTime;
    }
    return getComputedStyle(target);
  }
  function sampleAnimation(node, state, s) {
    let css = getComputedStyle(node); const sourceCss = css, props = state.properties; let attribute = IDENTITY;
    if (node.transform && node.transform.baseVal) for (let i = 0; i < node.transform.baseVal.numberOfItems; i++) attribute = multiply(attribute, node.transform.baseVal.getItem(i).matrix);
    let box = state.box; if (!box) { try { const b = node.getBBox(); if (b.width || b.height) box = { x: b.x, y: b.y, width: b.width, height: b.height }; } catch (e) { /* no geometry */ } if (!box) { const owner = findOwner(node, s); box = owner && owner.box || { x: 0, y: 0, width: s.w || 1, height: s.h || 1 }; } state.box = box; }
    css = mirrorAnimationCss(node, state, s, css, attribute, box) || css;
    const length = (value, span) => String(value).endsWith('%') ? (parseFloat(value) || 0) / 100 * span : parseFloat(value) || 0;
    const translate = String(css.translate || 'none').split(/\s+/), scale = String(css.scale || 'none').split(/\s+/), angle = String(css.rotate || 'none').split(/\s+/).pop();
    const tx = props.has('translate') ? length(translate[0], box.width) : 0, ty = props.has('translate') ? length(translate[1], box.height) : 0;
    const sx = props.has('scale') && scale[0] !== 'none' ? Number(scale[0]) || 0 : 1, sy = props.has('scale') && scale[0] !== 'none' ? Number(scale[1] == null ? scale[0] : scale[1]) || 0 : 1;
    const rotation = props.has('rotate') && angle !== 'none' ? (parseFloat(angle) || 0) * (angle.endsWith('rad') ? 1 : angle.endsWith('turn') ? Math.PI * 2 : Math.PI / 180) : 0, c = Math.cos(rotation), sn = Math.sin(rotation);
    const origin = String(css.transformOrigin || '0 0').split(/\s+/), fill = css.transformBox === 'fill-box';
    const ox = length(origin[0], box.width) + (fill ? box.x : 0), oy = length(origin[1], box.height) + (fill ? box.y : 0);
    const cssTransform = props.has('transform') ? cssMatrix(css.transform) : attribute;
    let full = multiply({ a: c * sx, b: sn * sx, c: -sn * sy, d: c * sy, e: tx, f: ty }, cssTransform);
    full = multiply(multiply({ ...IDENTITY, e: ox, f: oy }, full), { ...IDENTITY, e: -ox, f: -oy });
    if (![...props].some(p => p !== 'opacity')) full = attribute;
    const sample = { full, delta: multiply(inverseMatrix(attribute), full), opacity: props.has('opacity') ? Number(css.opacity) : null, paintOpacity: Number(props.has('opacity') ? css.opacity : sourceCss.opacity), rawTransform: sourceCss.transform, resolvedTransform: css.transform, mirror: !!state.sampler, rawTranslate: css.translate, rawRotate: css.rotate };
    const before = s.animationStyles.get(node), signature = [full.a, full.b, full.c, full.d, full.e, full.f, sample.opacity, sample.paintOpacity].map(v => v == null ? '' : Math.round(v * 10000)).join(',');
    if (!before || before.signature !== signature) { sample.signature = signature; s.animationStyles.set(node, sample); touchTree(node, s); const owner = findOwner(node, s); if (owner && owner.node !== node) { s.transforms.add(owner); if (owner.parts) for (const part of owner.parts) s.transforms.add(part); } }
    if (node === s.svg) { s.rootAnimationMatrix = full; s.host.style.transformOrigin = '0 0'; const value = 'matrix(' + [full.a, full.b, full.c, full.d, full.e, full.f].join(',') + ')'; if (s.host.style.transform !== value) s.host.style.transform = value; if (sample.opacity != null) s.host.style.opacity = String(sample.opacity); }
  }
  function trackAnimation(node, animation, properties) {
    const s = current; if (!s || s.dead || !node || node !== s.svg && !s.svg.contains(node) || !animation) return animation;
    let state = s.animationTargets.get(node); if (!state) { state = { animations: new Map(), properties: new Set(), box: null }; s.animationTargets.set(node, state); }
    const props = new Set(properties && properties.length ? properties : ['transform', 'translate', 'rotate', 'scale', 'opacity', 'transformOrigin']);
    for (const prop of props) state.properties.add(prop);
    const remove = () => { animation.removeEventListener('cancel', remove); animation.removeEventListener('remove', remove); animation.removeEventListener('finish', finish); const entry = state.animations.get(animation); if (entry && entry.mirror) entry.mirror.cancel(); state.animations.delete(animation); if (!state.animations.size) disposeAnimationSampler(state, s); state.reset = true; };
    const finish = () => { const fill = animation.effect && animation.effect.getTiming().fill; if (fill !== 'forwards' && fill !== 'both') remove(); else state.reset = true; };
    animation.addEventListener('cancel', remove); animation.addEventListener('remove', remove); animation.addEventListener('finish', finish); state.animations.set(animation, { props, remove, finish });
    if (s.ready && node.matches('.pt-cfx') && !s.records.has(node)) register(node, s);
    const owner = findOwner(node, s);
    if (owner && owner.node !== node && node.closest('svg') === s.svg) {
      state.owner = owner;
      if (node === owner.node.firstElementChild && owner.node.children.length === 1) {
        if (!owner.proxySources) owner.proxySources = new Set(); owner.proxySources.add(node); s.transforms.add(owner);
      } else {
        if (!owner.trackedSources) owner.trackedSources = new Set(); owner.trackedSources.add(node);
        owner.decorLimit = null; invalidateAsset(owner, s); s.decorQueue.add(owner);
      }
    }
    state.reset = true; return animation;
  }
  function updateAnimations(s) {
    for (const [node, state] of s.animationTargets) {
      if (!node.isConnected || node !== s.svg && !s.svg.contains(node) || !state.animations.size) {
        disposeAnimationSampler(state, s);
        for (const [animation, entry] of state.animations) { animation.removeEventListener('cancel', entry.remove); animation.removeEventListener('remove', entry.remove); animation.removeEventListener('finish', entry.finish); }
        s.animationTargets.delete(node); s.animationStyles.delete(node); touchTree(node, s);
        const owner = state.owner; if (owner && s.all.has(owner)) { if (owner.proxySources) owner.proxySources.delete(node); if (owner.trackedSources && owner.trackedSources.delete(node)) { invalidateAsset(owner, s); if (!owner.trackedSources.size) { s.decorQueue.delete(owner); owner.decorLimit = null; } } s.transforms.add(owner); }
        if (node === s.svg) { s.rootAnimationMatrix = null; s.host.style.transform = ''; s.host.style.transformOrigin = ''; s.host.style.opacity = ''; } continue;
      }
      if (s.ready && node.matches('.pt-cfx') && !s.records.has(node)) register(node, s);
      if (state.reset) { state.properties.clear(); for (const entry of state.animations.values()) for (const prop of entry.props) state.properties.add(prop); }
      if (state.reset || [...state.animations.keys()].some(a => a.playState === 'running' || a.pending || a.playState === 'paused')) sampleAnimation(node, state, s);
      state.reset = false;
    }
  }
  function syncPierMask(s) {
    if (!s.school) return;
    const decks = gardenPierDecks(), key = decks.map(p => [p.id, p.x, p.y, p.w, p.h].join(',')).join(';');
    if (s.pierMaskKey === key) return; s.pierMaskKey = key;
    const W = GARDEN_WORLD;
    if (!s.pierMaskDrawing) s.pierMaskDrawing = s.scene.make.graphics();
    s.pierMaskDrawing.clear().fillStyle(0xffffff);
    for (const p of decks) s.pierMaskDrawing.fillRect(p.x * W.cellW - 3, W.sky + p.y * W.cellH, p.w * W.cellW + 6, p.h * W.cellH + 5);
    if (!s.pierMask) { s.pierMask = s.school.filters.external.addMask(s.pierMaskDrawing, true, s.scene.cameras.main, 'world'); s.pierMask.autoUpdate = false; }
    s.pierMask.needsUpdate = true;
  }
  function geometry(r, s) {
    if (s.assets.has(r)) s.assetQueueDirty = true;
    const graph = compiledGraph(r.graph || graphNode(r.node, s), s);
    r.m = graph.world; r.depth = graph.depth + r.order / 100000; s.workStats.geometryUpdates++;
    if (r.weather && r.motionStack) { r.motionReach = { x: 0, y: 0 }; for (const entry of r.motionStack) { entry.space = matrix(entry.node, s.svg); entry.inverse = inverseMatrix(entry.space); const motion = entry.motion, x = Math.max(Math.abs(motion.gx || 0), motion.radius * 1.3 || 0, motion.kind === 'drift' ? 30 : 0), y = Math.max(Math.abs(motion.gy || 0), motion.kind === 'leaf' ? 400 : 0, motion.radius || 0); r.motionReach.x += Math.abs(entry.space.a) * x + Math.abs(entry.space.c) * y; r.motionReach.y += Math.abs(entry.space.b) * x + Math.abs(entry.space.d) * y; } }
    if (r.proxySources) r.proxyMotionStack = [...r.proxySources].map(node => { const space = matrix(node, r.node); return { motion: { kind: 'tracked', node, opacityBase: Number(node.getAttribute('opacity') || node.style.opacity || 1) || 1 }, space, inverse: inverseMatrix(space) }; });
    if (r.fishDepth) r.depth = r.m.f - 5;
    r.hidden = graph.hidden; r.alpha = graph.alpha * (r.shadowAlpha == null ? 1 : r.shadowAlpha);
    if (r.chunks) return;
    const o = r.object; if (!o) return;
    if (r.inSchool) {
      // Phaser 4 uses filters for WebGL masks. Apply one shared world-space
      // cutout to the retained school, rather than one viewport filter per fish.
      if (!s.school) {
        s.school = s.scene.add.container(0, 0).setDepth(-9300).enableFilters();
        syncPierMask(s);
      }
      const drawing = r.affineWrap || o; if (drawing.parentContainer !== s.school) s.school.add(drawing);
      s.schoolDirty = true;
    }
    indexRecord(r, s); visibility(r, s); o.setAlpha(r.alpha); if (o.depth !== r.depth) o.setDepth(r.depth);
    const m = r.m, sx = Math.hypot(m.a, m.b), sy = sx > 0.00001 ? (m.a * m.d - m.b * m.c) / sx : 0;
    const b = r.box || { x: 0, y: 0 }; const p = xy(m, b.x, b.y);
    placeObject(r, m, p, s);
    r.drawX = p.x; r.drawY = p.y;
    if (o.visible) r.visibleAt = performance.now();
  }
  function inView(r, s) { if (!r.box) return true; const b = worldBounds(r), c = s.camera, margin = 96, drift = r.motion && (r.motion.kind === 'cloud' || r.motion.kind === 'wave') ? r.motion.amplitude : 0, rx = Math.max(drift, r.motionReach && r.motionReach.x || 0), ry = r.motionReach && r.motionReach.y || 0; return b.right + rx >= c.x - margin && b.left - rx <= c.x + c.w + margin && b.bottom + ry >= c.y - margin && b.top - ry <= c.y + c.h + margin; }
  function worldBounds(r) {
    const b = r.box || { x: -30, y: -90, width: 60, height: 95 }, m = r.m;
    if (r.boundsMatrix === m && r.boundsBox === b && r.worldBox) return r.worldBox;
    const x = m.a * b.x + m.c * b.y + m.e, y = m.b * b.x + m.d * b.y + m.f, ax = m.a * b.width, bx = m.c * b.height, ay = m.b * b.width, by = m.d * b.height;
    r.boundsMatrix = m; r.boundsBox = b; return r.worldBox = { left: x + Math.min(0, ax) + Math.min(0, bx), right: x + Math.max(0, ax) + Math.max(0, bx), top: y + Math.min(0, ay) + Math.min(0, by), bottom: y + Math.max(0, ay) + Math.max(0, by) };
  }
  const SCENE_CELL = 256;
  function unindexRecord(r, s) {
    if (r.spatialKeys) for (const key of r.spatialKeys) { const bucket = s.spatial.get(key); if (bucket) { bucket.delete(r); if (!bucket.size) s.spatial.delete(key); } }
    r.spatialKeys = null; r.spatialSignature = null; s.largeRecords.delete(r);
  }
  function indexRecord(r, s) {
    if (!r.object) return;
    if (r.type === 'vector' && !r.box) { if (r.spatialSignature !== '*') { unindexRecord(r, s); r.spatialSignature = '*'; s.largeRecords.add(r); } return; }
    const b = worldBounds(r), reach = r.motionReach || {}, drift = r.motion && (r.motion.kind === 'cloud' || r.motion.kind === 'wave') ? r.motion.amplitude : 0;
    const rx = Math.max(drift || 0, reach.x || 0), ry = reach.y || 0;
    const x0 = Math.floor((b.left - rx) / SCENE_CELL), x1 = Math.floor((b.right + rx) / SCENE_CELL), y0 = Math.floor((b.top - ry) / SCENE_CELL), y1 = Math.floor((b.bottom + ry) / SCENE_CELL);
    const signature = [x0, x1, y0, y1].join(','); if (r.spatialSignature === signature) return;
    unindexRecord(r, s); r.spatialSignature = signature;
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) { s.largeRecords.add(r); return; }
    r.spatialKeys = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = x + ',' + y; let bucket = s.spatial.get(key); if (!bucket) { bucket = new Set(); s.spatial.set(key, bucket); } bucket.add(r); r.spatialKeys.push(key); }
  }
  function movingRecord(r) { return !!(r.motion || r.motionStack && r.motionStack.length || r.proxyMotionStack && r.proxyMotionStack.length || r.texture && r.texture.frames > 1); }
  function visibility(r, s) {
    if (!r.object) { s.visibleRecords.delete(r); s.visibleMotions.delete(r); return; }
    const visible = !r.hidden && r.alpha > 0 && inView(r, s) && (!r.partRoot || r.partRoot.partsReady) && !r.partsReady;
    if (r.object.visible !== visible) r.object.setVisible(visible);
    if (visible) { s.visibleRecords.add(r); if (movingRecord(r)) s.visibleMotions.add(r); else s.visibleMotions.delete(r); if (r.texture && !r.partRoot && !r.parts && !r.decorCompiled && !r.decorLimit && r.node.classList.contains('gd-decor')) s.decorQueue.add(r); }
    else { s.visibleRecords.delete(r); s.visibleMotions.delete(r); }
  }
  function cullCamera(s) {
    const c = s.camera, margin = 96, candidates = new Set(s.largeRecords);
    for (let y = Math.floor((c.y - margin) / SCENE_CELL); y <= Math.floor((c.y + c.h + margin) / SCENE_CELL); y++) for (let x = Math.floor((c.x - margin) / SCENE_CELL); x <= Math.floor((c.x + c.w + margin) / SCENE_CELL); x++) { const bucket = s.spatial.get(x + ',' + y); if (bucket) for (const r of bucket) candidates.add(r); }
    for (const r of [...s.visibleRecords]) if (!candidates.has(r)) { if (r.object) r.object.setVisible(false); s.visibleRecords.delete(r); s.visibleMotions.delete(r); }
    for (const r of candidates) visibility(r, s);
    s.workStats.cullCandidates += candidates.size;
  }
  function restoreSourceView(s) {
    const c = s.camera, margin = 200;
    for (const node of s.fragmentSources) {
      if (!node.isConnected || !s.svg.contains(node)) { s.fragmentSources.delete(node); continue; }
      if (!node._gartKids) { s.fragmentSources.delete(node); continue; }
      let b = node._gartBox;
      if (!b && node._gartPx != null) b = { x: node._gartPx - 150, y: node._gartPy - 240, w: 300, h: 270 };
      if (!b && node.hasAttribute('data-x') && node.hasAttribute('data-y')) b = { x: Number(node.getAttribute('data-x')) * GARDEN_WORLD.cellW - 150, y: GARDEN_WORLD.sky + Number(node.getAttribute('data-y')) * GARDEN_WORLD.cellH - 240, w: 300, h: 270 };
      if (!b) { const r = s.records.get(node); if (r && r.box) { const world = worldBounds(r); b = { x: world.left, y: world.top, w: world.right - world.left, h: world.bottom - world.top }; } }
      if (!b || b.x + b.w < c.x - margin || b.x > c.x + c.w + margin || b.y + b.h < c.y - margin || b.y > c.y + c.h + margin) continue;
      node.appendChild(node._gartKids); node._gartKids = null; node._gartOff = false; node.classList.remove('gart-off');
      if (typeof gardenArtRestoreVectors === 'function') gardenArtRestoreVectors(node);
      s.fragmentSources.delete(node); s.workStats.restoredFragments++;
    }
  }
  function readCamera(s) {
    const v = (s.svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
    if (v.length !== 4 || !v.every(Number.isFinite) || v[2] <= 0 || v[3] <= 0) return;
    const w = s.box.clientWidth, h = s.box.clientHeight; if (!w || !h) return;
    if (s.w !== w || s.h !== h) { s.w = w; s.h = h; s.game.scale.resize(w, h); }
    s.camera = { x: v[0], y: v[1], w: v[2], h: v[3] };
    const zoom = Math.min(w / v[2], h / v[3]), cam = s.scene.cameras.main;
    cam.setZoom(zoom); cam.centerOn(v[0] + v[2] / 2, v[1] + v[3] / 2);
    if (s.pierMask) s.pierMask.needsUpdate = true;
    const changedZoom = s.hasCamera && Math.abs(zoom - s.projection.scale) > .0001, now = performance.now();
    s.projection = { scale: zoom, left: (w - v[2] * zoom) / 2, top: (h - v[3] * zoom) / 2 };
    s.targetQuality = s.quality = s.lowMemory ? 1 : 2;
    if (changedZoom) s.zoomUntil = now + 180;
    s.cameraDirty = false; s.hasCamera = true; s.assetQueueDirty = true;
  }
  function settleQuality(s) {
    // Kept as a compatibility hook for diagnostics. A camera gesture changes
    // projection only; asset resolution is immutable for the scene's lifetime.
  }
  function interacting(s) {
    const now = performance.now(), moving = typeof _gw !== 'undefined' && (_gw.moving || _gw.keys && _gw.keys.size), pointing = typeof _gdp !== 'undefined' && (_gdp.pinch || _gdp.press);
    if (moving || pointing) s.inputUntil = now + 180;
    return now < (s.inputUntil || 0) || now < (s.zoomUntil || 0);
  }
  function stagePoint(clientX, clientY, s) { const r = s.box.getBoundingClientRect(), p = s.projection, c = s.camera, q = s.rootAnimationMatrix ? inverse(s.rootAnimationMatrix, clientX - r.left, clientY - r.top) || { x: clientX - r.left, y: clientY - r.top } : { x: clientX - r.left, y: clientY - r.top }; return { x: c.x + (q.x - p.left) / p.scale, y: c.y + (q.y - p.top) / p.scale }; }
  function point(clientX, clientY) { if (!active()) return null; const p = stagePoint(clientX, clientY, current); return { x: p.x / GARDEN_WORLD.cellW, y: (p.y - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH }; }
  function rectOf(r, s) { const b = worldBounds(r), m = screenMatrix(s.svg, s), points = [xy(m, b.left, b.top), xy(m, b.right, b.top), xy(m, b.left, b.bottom), xy(m, b.right, b.bottom)], left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y)), width = Math.max(...points.map(p => p.x)) - left, height = Math.max(...points.map(p => p.y)) - top; return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() { return { left, top, width, height }; } }; }
  function bounds(node) {
    const s = current; if (!s || !s.ready || !s.presented || !node) return null;
    if (typeof node === 'string') { const id = CSS.escape(node); node = s.svg.querySelector('[data-uid="' + id + '"]') || s.svg.querySelector(':scope > [data-gp-layer][data-prop="' + id + '"]') || s.svg.querySelector('[data-prop="' + id + '"]'); }
    let r = node && s.records.get(node); if (r && r.type !== 'container') return rectOf(r, s);
    if (node && !r) { const owner = findOwner(node, s); if (owner && owner.box) return rectOf(owner, s); }
    if (!node) return null; const list = []; descendants(node, s, x => { if (x.box) list.push(rectOf(x, s)); });
    if (!list.length) return null;
    const left = Math.min(...list.map(x => x.left)), top = Math.min(...list.map(x => x.top)), right = Math.max(...list.map(x => x.right)), bottom = Math.max(...list.map(x => x.bottom)); return { left, top, right, bottom, x: left, y: top, width: right - left, height: bottom - top };
  }
  function pick(clientX, clientY) {
    const s = current; if (!active()) return null; const p = stagePoint(clientX, clientY, s); let hit = null;
    const candidates = new Set(s.largeRecords), bucket = s.spatial.get(Math.floor(p.x / SCENE_CELL) + ',' + Math.floor(p.y / SCENE_CELL)); if (bucket) for (const r of bucket) candidates.add(r);
    for (const r of candidates) {
      if (!r.object || !r.object.visible || !r.box || r.hidden || r.alpha < 0.05) continue;
      const n = r.pickNode; if (!n) continue;
      const q = inverse(r.m, p.x, p.y), b = r.box; if (!q || q.x < b.x || q.y < b.y || q.x > b.x + b.width || q.y > b.y + b.height) continue;
      if (r.texture && r.texture.mask) { const mx = Math.min(31, Math.max(0, Math.floor((q.x - b.x) / b.width * 32))), my = Math.min(31, Math.max(0, Math.floor((q.y - b.y) / b.height * 32))); if (r.texture.mask[(my * 32 + mx) * 4 + 3] < 10) continue; }
      if (!hit || r.depth > hit.depth) hit = { node: n, uid: n.getAttribute('data-uid'), prop: n.getAttribute('data-prop'), land: n.getAttribute('data-land'), kind: n.classList.contains('gd-plant') ? 'plant' : 'decor', depth: r.depth };
    }
    return hit;
  }

  function svgSnapshot(n, s, sourceMap) {
    const clone = n.cloneNode(true); clone.removeAttribute('transform'); clone.removeAttribute('opacity'); clone.style.removeProperty('display');
    if (sourceMap) { const original = [n, ...n.querySelectorAll('*')], copied = [clone, ...clone.querySelectorAll('*')]; clone._gpSourceMap = new Map(original.map((node, i) => [node, copied[i]])); }
    for (const effect of clone.querySelectorAll('.pt-cfx')) effect.remove();
    if (s.animationTargets.has(n)) clone.style.opacity = '1';
    const record = s.records.get(n);
    if (record && (record.weather || record.motion && record.motion.native)) { clone.style.animation = 'none'; clone.style.transform = 'none'; clone.style.removeProperty('animation-delay'); clone.style.removeProperty('animation-duration'); }
    if (n.matches('.gd-plant')) for (const sway of clone.querySelectorAll('.gda-sway')) { sway.style.animation = 'none'; sway.style.transform = 'none'; }
    // Identity and world position belong to the retained instance, not its
    // pixels. Equal plant/actor art shares a texture across instances and saves.
    // Local paint definitions retain their contents and stable references.
    const nodes = [clone, ...clone.querySelectorAll('*')], ids = new Map();
    for (const node of nodes) {
      node.classList.remove('gd-behind');
      for (const name of ['data-uid', 'data-sig', 'data-x', 'data-y', 'data-z', 'data-vid', 'data-live', 'data-bk']) node.removeAttribute(name);
      if (node.id) ids.set(node.id, 'gp-local-' + ids.size);
    }
    for (const node of nodes) for (const attr of [...node.attributes]) {
      if (attr.name === 'id') { node.setAttribute('id', ids.get(attr.value)); continue; }
      let value = attr.value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (all, quote, id) => ids.has(id) ? 'url(#' + ids.get(id) + ')' : all);
      if ((attr.localName === 'href' || attr.name === 'xlink:href') && value[0] === '#' && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
      if (value !== attr.value) node.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
    for (const b of clone.querySelectorAll('.gart-bake')) b.classList.add('no-bake');
    clone.classList.remove('gart-off');
    return clone;
  }
  function ancestorClasses(n, s) { const out = classes(s.svg); for (let p = n.parentElement; p && p !== s.svg; p = p.parentElement) out.push(...classes(p)); return out.filter(c => !['gd-behind', 'gart-off', 'gart-rest', 'gart-nosky'].includes(c)).join(' '); }
  async function imageOf(text) { const image = new Image(); image.decoding = 'async'; image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text); await image.decode(); return image; }
  async function decodedArtwork(text, s, width, height) {
    const cache = window.GardenTextureCache, key = cache ? await cache.key(text) : null;
    const stored = key ? await cache.get(key) : null;
    if (stored && stored.image.width === width && stored.image.height === height && stored.meta && stored.meta.fw === width && stored.meta.fh === height) { s.workStats.diskCacheHits++; return { ...stored, key, cached: true }; }
    if (stored) stored.close();
    s.workStats.decodes++; return { image: await imageOf(text), key, close() {}, cached: false };
  }
  function available(s) { if (s.dead) return Promise.resolve(false); if (!document.hidden && !s.indoor) return Promise.resolve(true); return new Promise(resolve => s.assetWaiters.add(resolve)); }
  function resumeAssets(s) { for (const resolve of s.assetWaiters) resolve(!s.dead); s.assetWaiters.clear(); queueAssets(s); }
  function release(t, s) { t.refs = Math.max(0, t.refs - 1); t.used = performance.now(); }
  function trim(s, force, required) {
    const now = performance.now(); if (!force && now < (s.nextTrimAt || 0)) return; s.nextTrimAt = now + 500; s.workStats.trimRuns++;
    const pressured = force || s.textureBytes + s.reservedBytes > s.textureBudget * 0.75;
    for (const r of [...s.all].filter(r => pressured && r.texture && (r.hidden || !inView(r, s))).sort((a, b) => (a.visibleAt || 0) - (b.visibleAt || 0))) {
      release(r.texture, s); r.texture = null; r.dirty = true; destroyObject(r); unindexRecord(r, s); visibility(r, s); enqueueAsset(r, s);
    }
    const stale = [...s.textures.values()].filter(t => !t.refs && (pressured || now - t.used > 15000)).sort((a, b) => a.used - b.used);
    for (const t of stale) { s.scene.textures.remove(t.key); if (t.canvas) { t.canvas.width = 1; t.canvas.height = 1; } s.textures.delete(t.hash); s.textureBytes -= t.bytes; if (pressured && s.textureBytes < s.textureBudget * 0.55 && s.textureBytes + s.reservedBytes + (required || 0) <= s.textureBudget) break; }
  }
  function reserve(s, bytes, r, width, height) {
    const cap = s.textureBudget;
    if (s.textureBytes + s.reservedBytes + bytes > cap) trim(s, true, bytes);
    if (s.textureBytes + s.reservedBytes + bytes > cap) { s.failedRequest = { bytes, width, height, classes: r.node.getAttribute('class'), box: r.box, chunk: !!r.chunkParent }; const e = new Error('The texture memory limit was reached'); e.code = 'TEXTURE_BUDGET'; throw e; }
    s.reservedBytes += bytes;
  }
  function chunkAsset(r, s, clone, box, key) {
    const previous = r.chunkHash;
    r.type = 'chunk-root'; r.box = box; r.chunkHash = key;
    r.chunkMarkup = clone.outerHTML; r.chunkAncestors = ancestorClasses(r.node, s);
    r.chunkWrapperStyle = r.weather ? ' style="animation:none!important;transform:none!important"' : '';
    r.chunkCss = assetCss(clone, r.chunkAncestors, s);
    destroyObject(r); unindexRecord(r, s); visibility(r, s); if (r.texture) { release(r.texture, s); r.texture = null; }
    const gridKey = [box.x, box.y, box.width, box.height].join(',');
    if (r.chunks && r.chunkGridKey !== gridKey) { for (const chunk of r.chunks) removeRecord(chunk, s); r.chunks = null; }
    r.chunkGridKey = gridKey;
    if (!r.chunks) {
      r.chunks = [];
      for (let y = box.y; y < box.y + box.height; y += 512) for (let x = box.x; x < box.x + box.width; x += 512) {
        const chunk = { node: r.node, type: 'image', chunkParent: r, partRoot: r.partRoot, hushEligible: r.hushEligible, rev: 0, order: r.order, hidden: false, m: r.m, motion: r.motion, weather: r.weather, motionStack: r.motionStack, box: { x, y, width: Math.min(512, box.x + box.width - x), height: Math.min(512, box.y + box.height - y) }, object: null, texture: null, dirty: true };
        classify(chunk); attachGraph(chunk, s); r.chunks.push(chunk); s.all.add(chunk); s.transforms.add(chunk); enqueueAsset(chunk, s);
        if (s.frozenRecords.has(r)) { s.frozenRecords.add(chunk); chunk.motionPauseAt = r.motionPauseAt; chunk.motionTimeOffset = r.motionTimeOffset; }
      }
    } else if (previous !== key) for (const chunk of r.chunks) { chunk.rev++; chunk.dirty = true; chunk.empty = false; enqueueAsset(chunk, s); s.transforms.add(chunk); }
    r.dirty = false;
  }
  async function bakeChunk(r, s) {
    const parent = r.chunkParent, revision = r.rev, box = r.box, quality = assetQuality(r, s);
    const key = hash(parent.chunkHash + '|' + [box.x, box.y, box.width, box.height, quality].join(','));
    let texture = s.textures.get(key);
    if (!texture) {
      const fw = Math.max(1, Math.ceil(box.width * quality)), fh = Math.max(1, Math.ceil(box.height * quality)), bytes = fw * fh * 4;
      reserve(s, bytes, r, fw, fh);
      try {
        const text = '<svg xmlns="' + NS + '" width="' + fw + '" height="' + fh + '" viewBox="' + [box.x, box.y, box.width, box.height].join(' ') + '"><style>' + (parent.chunkCss || s.css) + '\n*{animation-play-state:paused!important}</style>' + s.defs + '<g class="' + parent.chunkAncestors + '"' + (parent.chunkWrapperStyle || '') + '>' + parent.chunkMarkup + '</g></svg>';
        if (!(await available(s))) return;
        const decoded = await decodedArtwork(text, s, fw, fh);
        const canvas = document.createElement('canvas'); canvas.width = fw; canvas.height = fh;
        try { if (!(await available(s)) || !jobCurrent(r, s, revision)) return; canvas.getContext('2d').drawImage(decoded.image, 0, 0, fw, fh); }
        finally { decoded.close(); }
        if (!decoded.cached && decoded.key) GardenTextureCache.put(decoded.key, canvas, { fw, fh, quality });
        // Another instance can finish the same visual while this decode was
        // pending. Never replace its cache entry or orphan a live GPU texture.
        texture = s.textures.get(key);
        if (texture) canvas.width = canvas.height = 1;
        else {
          const tk = 'garden2-' + s.id + '-' + (++s.textureSeq), phaserTexture = s.scene.textures.addImage(tk, canvas); phaserTexture.add('0', 0, 0, 0, fw, fh);
          s.workStats.uploads++;
          texture = { key: tk, hash: key, box, frames: 1, fw, fh, quality, refs: 0, used: performance.now(), canvas, bytes, mask: null };
          s.textures.set(key, texture); s.textureBytes += bytes;
        }
      } finally { s.reservedBytes -= bytes; }
    }
    if (!texture || s.dead || !s.all.has(r) || revision !== r.rev) return;
    if (r.texture !== texture) { if (r.texture) release(r.texture, s); r.texture = texture; texture.refs++; }
    if (!r.object) r.object = s.scene.add.image(0, 0, texture.key, '0').setOrigin(0, 0); else r.object.setTexture(texture.key, '0');
    r.pixelScale = { x: box.width / texture.fw, y: box.height / texture.fh }; r.dirty = false; r.qualityUpgrade = false; geometry(r, s); if (r.partRoot) presentDecor(r.partRoot, s); trim(s);
  }
  async function bake(r, s) {
    if (s.dead) return;
    if (!r.node.isConnected || !s.svg.contains(r.node)) {
      const reason = r.node.isConnected ? 'foreign-node' : 'detached-node'; s.retiredRecords[reason] = (s.retiredRecords[reason] || 0) + 1;
      r.dirty = false; removeRecord(r, s); return;
    }
    if (r.chunkParent) return bakeChunk(r, s);
    // The original display list is already styled and laid out during warmup.
    // Reuse its local bounds and reject off-camera units before cloning any
    // markup or parsing another copy of the full garden stylesheet.
    if (sourceBox(r) || r.box) { geometry(r, s); if (!inView(r, s)) return; }
    const revision = r.rev, prepared = preparedVisual(r, s), kind = prepared.kind, baseKey = prepared.baseKey;
    const quality = assetQuality(r, s), key = baseKey + 'q' + quality + 'a1';
    let texture = cachedVisual(s, baseKey, quality, 1);
    if (!texture) {
      const clone = kind === 'actor' || !r.measured ? prepared.snapshot.cloneNode(true) : prepared.snapshot;
      const stylesheet = prepared.css || (prepared.css = assetCss(clone, prepared.ancestors, s));
      const wrapperStyle = r.weather ? ' style="animation:none!important;transform:none!important"' : '';
      let measure = null;
      if (!r.measured) {
        measure = document.createElementNS(NS, 'svg'); measure.setAttribute('xmlns', NS); measure.setAttribute('width', '1'); measure.setAttribute('height', '1');
        measure.style.cssText = 'position:fixed;left:-10000px;top:-10000px;overflow:visible;visibility:hidden;pointer-events:none';
        measure.innerHTML = '<style>' + stylesheet + '</style>' + s.defs + '<g class="' + prepared.ancestors + '"' + wrapperStyle + '></g>';
        const wrapper = measure.lastElementChild; wrapper.appendChild(clone); measurementRoot(s).appendChild(measure);
      }
      let held = 0, canvas = null, uploaded = false, decoded = null;
      try {
        const catchMoment = r.node.matches('.gd-catch-moment');
        if (catchMoment) for (const pop of clone.querySelectorAll('.gmo-pop')) { pop.style.animation = 'none'; pop.style.transform = 'none'; pop.style.opacity = '1'; }
        let box = r.box;
        if (measure) { const raw = clone.getBBox(); if (!(raw.width > 0 && raw.height > 0)) { r.dirty = false; r.empty = true; return; } box = { x: Math.floor(raw.x - 3), y: Math.floor(raw.y - 3), width: Math.ceil(raw.width + 6), height: Math.ceil(raw.height + 6) }; }
        r.box = box; r.measured = true; geometry(r, s);
        if (!inView(r, s)) return;   // measure once, then leave off-screen art queued without allocating a bitmap
        if (kind === 'still' && (box.width > 1024 || box.height > 1024)) { chunkAsset(r, s, clone, box, baseKey); return; }
        const scale = Math.min(quality, 2048 / box.width, 2048 / box.height, Math.sqrt(2500000 / (box.width * box.height)));
        const fw = Math.max(1, Math.ceil(box.width * scale)), fh = Math.max(1, Math.ceil(box.height * scale));
        canvas = document.createElement('canvas'); canvas.width = fw; canvas.height = fh;
        const bytes = canvas.width * canvas.height * 4; reserve(s, bytes, r, canvas.width, canvas.height); held = bytes;
        const ctx = canvas.getContext('2d');
        if (!(await available(s)) || !jobCurrent(r, s, revision)) return;
        const text = '<svg xmlns="' + NS + '" width="' + fw + '" height="' + fh + '" viewBox="' + [box.x, box.y, box.width, box.height].join(' ') + '"><style>' + stylesheet + '\n*{animation-play-state:paused!important}</style>' + s.defs + '<g class="' + prepared.ancestors + '"' + wrapperStyle + '>' + clone.outerHTML + '</g></svg>';
        decoded = await decodedArtwork(text, s, fw, fh); if (!(await available(s)) || !jobCurrent(r, s, revision)) return;
        ctx.drawImage(decoded.image, 0, 0, fw, fh);
        if (!decoded.cached && decoded.key) GardenTextureCache.put(decoded.key, canvas, { fw, fh, quality, box });
        if (!(await available(s)) || !jobCurrent(r, s, revision)) return;
        texture = s.textures.get(key);
        if (texture) canvas.width = canvas.height = 1;
        else {
          const tk = 'garden2-' + s.id + '-' + (++s.textureSeq), phaserTexture = s.scene.textures.addImage(tk, canvas); uploaded = true; s.workStats.uploads++;
          phaserTexture.add('0', 0, 0, 0, fw, fh);
          let mask = null; if (r.pickNode) { const maskCanvas = document.createElement('canvas'); maskCanvas.width = maskCanvas.height = 32; const mx = maskCanvas.getContext('2d', { willReadFrequently: true }); mx.drawImage(decoded.image, 0, 0, fw, fh, 0, 0, 32, 32); mask = mx.getImageData(0, 0, 32, 32).data; }
          texture = { key: tk, hash: key, contentKey: baseKey, box, frames: 1, canAnimate: false, fw, fh, quality, refs: 0, used: performance.now(), canvas, bytes: canvas.width * canvas.height * 4, mask };
          s.textures.set(key, texture); s.textureBytes += texture.bytes;
        }
      } finally { if (decoded) decoded.close(); if (held) s.reservedBytes -= held; if (canvas && !uploaded) canvas.width = canvas.height = 1; if (measure) measure.remove(); }
    } else { s.workStats.cacheHits++; }
    if (!texture || s.dead || revision !== r.rev || !s.records.has(r.node)) return;
    if (r.prewarm) { r.dirty = false; return; }
    if (!r.partRoot && r.parts && r.partsRevision !== revision) { for (const part of r.parts) removeRecord(part, s); r.parts = null; r.partsReady = false; r.decorCompiled = false; }
    if (r.texture !== texture) { if (r.texture) release(r.texture, s); r.texture = texture; texture.refs++; }
    r.box = texture.box;
    if (!r.object) r.object = s.scene.add.image(0, 0, texture.key, '0').setOrigin(0, 0);
    else r.object.setTexture(texture.key, '0');
    r.object.setDisplaySize(texture.box.width, texture.box.height);
    r.pixelScale = { x: texture.box.width / texture.fw, y: texture.box.height / texture.fh };
    geometry(r, s); r.dirty = false; r.motionUpgrade = false; r.qualityUpgrade = false;
    if (r.partRoot) presentDecor(r.partRoot, s);
    else if (!r.decorCompiled && !r.decorPlanning && !r.decorLimit && (r.isActor && window.GardenPhaserRig || r.trackedSources && r.trackedSources.size || r.node.matches('.gd-decor') && r.node.querySelector(extraMotionSelector + ',.gda-sway'))) { r.rigPending = !!(r.isActor && window.GardenPhaserRig); s.decorQueue.add(r); }
    trim(s);
  }
  function presentDecor(root, s) {
    const loaded = part => part.chunks ? part.chunks.filter(p => inView(p, s)).every(loaded) : !!part.texture || part.empty;
    if (root.partsReady || !root.parts || root.partsRevision !== root.rev || !root.parts.every(loaded)) return;
    root.partsReady = true; root.decorCompiled = true;
    destroyObject(root); unindexRecord(root, s); visibility(root, s);
    if (root.texture) { release(root.texture, s); root.texture = null; }
    for (const part of root.parts) geometry(part, s);
  }
  function planKey(clone, ancestors, css, s) { return clone.outerHTML + '|' + ancestors + '|' + css + '|' + s.defs; }
  function rememberPlan(key, plan, s) { s.rigPlans.delete(key); s.rigPlans.set(key, plan); if (s.rigPlans.size > 32) s.rigPlans.delete(s.rigPlans.keys().next().value); }
  function plannedPart(root, template, index, count) {
    const part = { node: root.node, type: 'image', partRoot: root, rev: 0, order: root.order + (index + 1) / (count + 1), hidden: false, m: root.m, hushEligible: root.hushEligible, box: template.box, measured: true, snapshot: template.snapshot, motionStack: template.motionStack, stackLocal: true, object: null, texture: null, dirty: true };
    classify(part); return part;
  }
  function bindPlan(root, plan, revision, s) {
    const parts = plan.map((template, index) => plannedPart(root, template, index, plan.length));
    root.parts = parts; root.partsRevision = revision; root.partsReady = false; root.decorDeferred = null;
    for (const part of parts) {
      attachGraph(part, s); s.all.add(part); s.transforms.add(part);
      const prepared = preparedVisual(part, s), texture = cachedVisual(s, prepared.baseKey, assetQuality(part, s), 1);
      if (texture) { part.texture = texture; texture.refs++; part.box = texture.box; part.object = s.scene.add.image(0, 0, texture.key, '0').setOrigin(0, 0); part.pixelScale = { x: texture.box.width / texture.fw, y: texture.box.height / texture.fh }; part.dirty = false; geometry(part, s); s.workStats.cacheHits++; }
      else enqueueAsset(part, s);
      if (s.frozenRecords.has(root)) { s.frozenRecords.add(part); part.motionPauseAt = root.motionPauseAt; part.motionTimeOffset = root.motionTimeOffset; }
    }
    presentDecor(root, s);
  }
  function tryCachedRig(root, s) {
    if (!s.presented || !root.isActor || root.partRoot || !window.GardenPhaserRig || root.trackedSources && root.trackedSources.size || !s.rigPlans.size) return false;
    const clone = svgSnapshot(root.node, s), ancestors = ancestorClasses(root.node, s), css = assetCss(clone, ancestors, s), key = planKey(clone, ancestors, css, s), plan = s.rigPlans.get(key);
    if (!plan || !plan.length) return false;
    // Only switch immediately when every prepared limb is resident. Otherwise
    // the ordinary path keeps a complete body visible while pixels load.
    for (let index = 0; index < plan.length; index++) { const part = plannedPart(root, plan[index], index, plan.length), prepared = preparedVisual(part, s); if (!cachedVisual(s, prepared.baseKey, assetQuality(part, s), 1)) return false; }
    if (root.parts) for (const part of root.parts) removeRecord(part, s);
    root.parts = null; root.partsReady = false; root.decorCompiled = false; root.decorLimit = null;
    destroyObject(root); unindexRecord(root, s); visibility(root, s); if (root.texture) { release(root.texture, s); root.texture = null; }
    root.dirty = false; root.rigPending = false; s.assets.delete(root); s.decorQueue.delete(root); rememberPlan(key, plan, s); s.workStats.rigPlanHits++;
    bindPlan(root, plan, root.rev, s); return true;
  }
  async function compilePlan(root, clone, ancestors, css, rig, tracked, valid, s) {
    const measure = document.createElementNS(NS, 'svg'); measure.setAttribute('width', '1'); measure.setAttribute('height', '1'); measure.style.cssText = 'position:fixed;left:-10000px;top:-10000px;overflow:visible;visibility:hidden;pointer-events:none';
    measure.innerHTML = '<style>' + css + '\n*{animation-play-state:paused!important}</style>' + s.defs + '<g class="' + ancestors + '"></g>'; measure.lastElementChild.appendChild(clone); measurementRoot(s).appendChild(measure);
    try {
      const rigMotions = rig ? GardenPhaserRig.inspect(clone) : null;
      const candidates = rigMotions ? [...rigMotions.keys()] : root.node.matches('.gd-decor') ? [...clone.querySelectorAll(extraMotionSelector + ',.gda-sway')] : [];
      if (tracked) for (const original of root.trackedSources) { const copied = clone._gpSourceMap.get(original); if (copied && clone.contains(copied) && !candidates.includes(copied)) candidates.push(copied); }
      if (!candidates.length) return [];
      if (candidates.length > (rig ? 32 : 12)) { root.decorLimit = 'motion-layer-limit'; return []; }
      const motions = new Map();
      for (const node of candidates) { let motion = rigMotions && rigMotions.get(node) || nativeMotion(node); if (tracked) for (const original of root.trackedSources) if (clone._gpSourceMap.get(original) === node) { motion = { kind: 'tracked', node: original, opacityBase: 1 }; break; } if (!motion) continue; const space = matrix(node, clone); motions.set(node, { motion, space, inverse: inverseMatrix(space) }); }
      if (!motions.size) return [];
      for (const [node, entry] of motions) { let attribute = IDENTITY; if (node.transform && node.transform.baseVal) for (let i = 0; i < node.transform.baseVal.numberOfItems; i++) attribute = multiply(attribute, node.transform.baseVal.getItem(i).matrix); node.style.animation = 'none'; node.style.translate = 'none'; node.style.rotate = 'none'; node.style.scale = 'none'; node.style.transformOrigin = '0 0'; node.style.transform = 'matrix(' + [attribute.a, attribute.b, attribute.c, attribute.d, attribute.e, attribute.f].join(',') + ')'; if (entry.motion.kind === 'tracked') { node.removeAttribute('opacity'); node.style.opacity = '1'; } }
      for (const [node, entry] of motions) if (entry.motion.kind === 'tracked') { const state = s.animationTargets.get(entry.motion.node); if (state) { const b = node.getBBox(); if (b.width || b.height) { state.box = { x: b.x, y: b.y, width: b.width, height: b.height }; state.reset = true; } } }
      const batches = []; let leaves = [], chain = [], leafCount = 0;
      const flush = () => { if (leaves.length) { batches.push({ leaves, chain: chain.slice() }); leaves = []; } };
      const visit = node => {
        if (['defs', 'style', 'title', 'desc', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'pattern', 'filter'].includes(node.localName)) return;
        const motion = motions.get(node); if (motion) { flush(); chain.push(motion); }
        if (!node.children.length || node.localName === 'text') { if (['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'image', 'use'].includes(node.localName)) { leaves.push(node); leafCount++; } }
        else for (const child of node.children) visit(child);
        if (motion) { flush(); chain.pop(); }
      };
      visit(clone); flush();
      if (leafCount > 2048 || batches.length > (rig ? 64 : 25)) { root.decorLimit = 'paint-layer-limit'; return []; }
      const original = [clone, ...clone.querySelectorAll('*')], definitions = new Set();
      for (const definition of clone.querySelectorAll('defs,clipPath,mask,linearGradient,radialGradient,pattern,filter')) { definitions.add(definition); for (const child of definition.querySelectorAll('*')) definitions.add(child); for (let p = definition.parentElement; p && p !== clone.parentElement; p = p.parentElement) definitions.add(p); }
      const plan = []; let yieldedAt = performance.now();
      for (let index = 0; index < batches.length; index++) {
        if (!(await available(s)) || !valid()) return null;
        const batch = batches[index], keep = new Set([clone, ...definitions]); let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (const node of batch.leaves) {
          for (let p = node; p && p !== clone.parentElement; p = p.parentElement) keep.add(p);
          const box = node.getBBox(), m = matrix(node, clone); if (!(box.width > 0 || box.height > 0)) continue;
          for (const p of [xy(m, box.x, box.y), xy(m, box.x + box.width, box.y), xy(m, box.x, box.y + box.height), xy(m, box.x + box.width, box.y + box.height)]) { left = Math.min(left, p.x); top = Math.min(top, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y); }
        }
        if (!Number.isFinite(left) || right < left || bottom < top) continue;
        const snapshot = clone.cloneNode(true), copied = [snapshot, ...snapshot.querySelectorAll('*')];
        for (let i = original.length - 1; i > 0; i--) if (!keep.has(original[i])) copied[i].remove();
        plan.push({ box: { x: Math.floor(left - 3), y: Math.floor(top - 3), width: Math.ceil(right - left + 6), height: Math.ceil(bottom - top + 6) }, snapshot, motionStack: batch.chain });
        if (performance.now() - yieldedAt > 4) { if (!(await renderSlice(s))) return null; yieldedAt = performance.now(); }
      }
      return valid() ? plan : null;
    } finally { measure.remove(); }
  }
  async function prepareDecor(root, s) {
    if (s.dead || root.dirty || !root.texture || root.parts || !s.all.has(root)) return;
    const rig = root.isActor && window.GardenPhaserRig;
    if (!rig && root.node.querySelector('svg')) { root.decorLimit = 'nested-viewport'; return; }
    const tracked = root.trackedSources && root.trackedSources.size;
    if (!rig && !tracked && (!root.box || Math.max(root.box.width, root.box.height) * s.projection.scale < 18)) { root.decorDeferred = 'distant-detail'; return; }
    const layerBudget = rig ? 384 : 160;
    let used = [...s.all].filter(r => r.partRoot && !r.prewarm).length;
    if (used >= layerBudget) for (const old of s.all) if (old.parts && !inView(old, s)) { used -= old.parts.length; for (const part of old.parts) removeRecord(part, s); old.parts = null; old.partsReady = false; old.decorCompiled = false; old.dirty = true; enqueueAsset(old, s); if (used < layerBudget - 32) break; }
    if (used >= layerBudget) { root.decorDeferred = 'scene-layer-budget'; return; }
    const revision = root.rev, clone = svgSnapshot(root.node, s, true), ancestors = ancestorClasses(root.node, s), css = assetCss(clone, ancestors, s), key = !tracked && rig ? planKey(clone, ancestors, css, s) : null;
    let plan = key && s.rigPlans.get(key);
    if (plan) { s.workStats.rigPlanHits++; rememberPlan(key, plan, s); }
    else { s.workStats.rigPlanCompiles++; plan = await compilePlan(root, clone, ancestors, css, rig, tracked, () => !s.dead && s.all.has(root) && revision === root.rev, s); if (key && plan) rememberPlan(key, plan, s); }
    if (!plan || !plan.length || s.dead || !s.all.has(root) || revision !== root.rev) return;
    if (used + plan.length > layerBudget) { root.decorDeferred = 'scene-layer-budget'; return; }
    bindPlan(root, plan, revision, s);
  }
  async function warmPlayer(s) {
    const root = [...s.all].find(r => !r.partRoot && r.node.classList.contains('gd-pl-in'));
    if (!root || typeof gartPlayerSvg !== 'function' || typeof _gplAvatar !== 'function' || !window.GardenPhaserRig) return true;
    const avatar = _gplAvatar(), gear = typeof _gplMyGear === 'function' ? _gplMyGear() : null, motion = typeof _gartMotionOk === 'function' ? _gartMotionOk() : gardenMotionOn(), ancestors = ancestorClasses(root.node, s);
    const valid = () => !s.dead && !s.presented && s.all.has(root);
    for (const dir of ['s', 'e', 'n']) for (const pose of ['idle', 'walk']) {
      if (!valid()) return false;
      const source = root.node.cloneNode(false); source.innerHTML = gartPlayerSvg(avatar, { dir, pose, motion, gear });
      const clone = svgSnapshot(source, s), css = assetCss(clone, ancestors, s), key = planKey(clone, ancestors, css, s);
      let plan = s.rigPlans.get(key);
      if (!plan) { s.workStats.rigPlanCompiles++; plan = await compilePlan(root, clone, ancestors, css, true, false, valid, s); if (!plan) return false; rememberPlan(key, plan, s); }
      for (let index = 0; index < plan.length; index++) {
        if (!valid()) return false;
        const part = plannedPart(root, plan[index], index, plan.length); part.prewarm = true; s.all.add(part);
        try { await bake(part, s); } finally { s.all.delete(part); s.assets.delete(part); s.transforms.delete(part); }
      }
      s.workStats.prewarmedPlayerPoses++;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return true;
  }
  function color(n, name, fallback) { const raw = n.getAttribute(name) || getComputedStyle(n)[name] || fallback; if (!raw || raw === 'none') return null; const m = /^#([a-f0-9]{6})$/i.exec(raw); if (m) return parseInt(m[1], 16); const rgb = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(raw); return rgb ? (+rgb[1] << 16) | (+rgb[2] << 8) | +rgb[3] : fallback; }
  function pathPoints(d, limit) {
    const tokens = String(d || '').match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [];
    const out = []; let i = 0, cmd = '', x = 0, y = 0, startX = 0, startY = 0;
    while (i < tokens.length && out.length < (limit || 300)) {
      if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
      const relative = cmd === cmd.toLowerCase(), c = cmd.toUpperCase(), counts = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, Z: 0 }, count = counts[c];
      if (count == null) break;
      if (c === 'Z') { out.push({ x: startX, y: startY }); cmd = ''; continue; }
      if (i + count > tokens.length || /^[a-z]$/i.test(tokens[i])) break;
      const a = tokens.slice(i, i + count).map(Number); i += count; if (!a.every(Number.isFinite)) break;
      const ox = relative ? x : 0, oy = relative ? y : 0;
      if (c === 'M' || c === 'L') { x = ox + a[0]; y = oy + a[1]; if (c === 'M') { startX = x; startY = y; out.push({ x, y, move: true }); cmd = relative ? 'l' : 'L'; } else out.push({ x, y }); }
      else if (c === 'H') { x = ox + a[0]; out.push({ x, y }); }
      else if (c === 'V') { y = oy + a[0]; out.push({ x, y }); }
      else if (c === 'Q' || c === 'C') {
        const x0 = x, y0 = y, x1 = ox + a[0], y1 = oy + a[1], x2 = ox + a[2], y2 = oy + a[3], x3 = c === 'C' ? ox + a[4] : x2, y3 = c === 'C' ? oy + a[5] : y2;
        for (let k = 1; k <= 12; k++) { const t = k / 12, u = 1 - t; out.push(c === 'Q' ? { x: u * u * x0 + 2 * u * t * x1 + t * t * x2, y: u * u * y0 + 2 * u * t * y1 + t * t * y2 } : { x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3 }); }
        x = x3; y = y3;
      }
    }
    return out;
  }
  function vector(r, s) {
    const n = r.node, g = r.object; if (!g) return; g.clear();
    if (r.weather) {
      const shapes = s.weatherShapes.get(n) || weatherShapes(n);
      if (shapes) {
        for (const shape of shapes) {
          const source = shape.node, fill = color(source, 'fill', null), stroke = color(source, 'stroke', null), ownAlpha = source === n ? 1 : Number(source.getAttribute('opacity') || 1);
          if (fill != null) g.fillStyle(fill, Number(source.getAttribute('fill-opacity') || 1) * ownAlpha);
          if (stroke != null) g.lineStyle(Number(source.getAttribute('stroke-width')) || 1, stroke, Number(source.getAttribute('stroke-opacity') || 1) * ownAlpha);
          if (shape.kind === 'ellipses') for (const e of shape.ellipses) { if (fill != null) g.fillEllipse(e.x, e.y, e.rx * 2, e.ry * 2); if (stroke != null) g.strokeEllipse(e.x, e.y, e.rx * 2, e.ry * 2); }
          else if (shape.kind === 'lines') { g.beginPath(); for (let i = 0; i < shape.points.length; i++) { const p = shape.points[i]; if (!i || p.move) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } if (fill != null) g.fillPath(); if (stroke != null) g.strokePath(); }
          else if (source.localName === 'circle') { const radius = Number(source.getAttribute('r')) || 0; if (fill != null) g.fillCircle(Number(source.getAttribute('cx')) || 0, Number(source.getAttribute('cy')) || 0, radius); }
          else if (source.localName === 'line' && stroke != null) g.lineBetween(Number(source.getAttribute('x1')) || 0, Number(source.getAttribute('y1')) || 0, Number(source.getAttribute('x2')) || 0, Number(source.getAttribute('y2')) || 0);
        }
        r.box = null; r.dirty = false; geometry(r, s); return;
      }
    }
    const stroke = color(n, 'stroke', null), fill = color(n, 'fill', null), width = Number(n.getAttribute('stroke-width')) || 1;
    if (stroke != null) g.lineStyle(width, stroke, Number(n.getAttribute('stroke-opacity') || 1));
    if (fill != null) g.fillStyle(fill, Number(n.getAttribute('fill-opacity') || 1));
    const val = a => Number(n.getAttribute(a)) || 0;
    if (n.localName === 'path' || n.localName === 'polyline') {
      const pts = n.localName === 'path' ? pathPoints(n.getAttribute('d')) : (n.getAttribute('points') || '').trim().split(/\s+/).map(x => { const p = x.split(',').map(Number); return { x: p[0], y: p[1] }; }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (pts.length) { g.beginPath(); for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (!i || p.move) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } if (fill != null) g.fillPath(); if (stroke != null) g.strokePath(); }
    } else if (n.localName === 'ellipse' || n.localName === 'circle') { const rx = val(n.localName === 'circle' ? 'r' : 'rx'), ry = val(n.localName === 'circle' ? 'r' : 'ry'); if (fill != null) g.fillEllipse(val('cx'), val('cy'), rx * 2, ry * 2); if (stroke != null) g.strokeEllipse(val('cx'), val('cy'), rx * 2, ry * 2); }
    else if (n.localName === 'rect') { if (fill != null) g.fillRoundedRect(val('x'), val('y'), val('width'), val('height'), val('rx')); if (stroke != null) g.strokeRect(val('x'), val('y'), val('width'), val('height')); }
    else if (n.localName === 'line') g.lineBetween(val('x1'), val('y1'), val('x2'), val('y2'));
    r.box = null; r.dirty = false; geometry(r, s);
  }
  function syncArt(s) {
    const art = window.GardenPlazaArt; if (!art || typeof art.layers !== 'function') return;
    let m; try { m = gardenHere(); } catch (e) { return; }
    const on = !!(_gdpPrefs().plazaPreview), layers = on ? art.layers(m, gardenSceneFromModel(m)) || [] : null;
    if (s.artOn === on && s.artLayers === layers) return; s.artOn = on; s.artLayers = layers;
    for (const node of s.svg.querySelectorAll(':scope > [data-gp-layer]')) { removeTree(node, s); node.remove(); }
    s.replaceGround = on && art.replaceGround === true; s.replacedProps = new Set();
    if (on) for (const layer of layers) {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('data-gp-layer', layer.id); g.setAttribute('data-gp-depth', String(layer.depth || 0));
      // Preview drawings belong only to the retained view. The normal SVG stays
      // visible and interactive while textures prepare in the background.
      g._gpRenderOnly = true; g.style.display = 'none';
      if (layer.replacesProp) { s.replacedProps.add(layer.replacesProp); g.setAttribute('data-prop', layer.replacesProp); g.classList.add('gd-prop'); }
      g.setAttribute('transform', 'translate(' + (layer.x || 0) + ' ' + (layer.y || 0) + ')');
      if (layer.land) g.setAttribute('data-land', layer.land);
      if (layer.motion) g._gpMotion = layer.motion;
      if (Number(layer.width) > 0 && Number(layer.height) > 0) g._gpBox = { x: 0, y: 0, width: Number(layer.width), height: Number(layer.height) };
      g.innerHTML = layer.svg; s.svg.appendChild(g); register(g, s);
    }
    s.svg._gwFadeGen = (s.svg._gwFadeGen || 0) + 1;
    for (const r of s.all) { invalidateGraph(r.node, s); s.transforms.add(r); }
  }
  function flushVisuals(s) {
    syncPierMask(s);
    const cameraChanged = s.cameraDirty;
    if (cameraChanged) { readCamera(s); restoreSourceView(s); if (s.observer) { const changes = s.observer.takeRecords(); if (changes.length) mutations(changes, s); } }
    for (const r of s.transforms) geometry(r, s); s.transforms.clear();
    if (cameraChanged) cullCamera(s);
    if (s.schoolDirty && s.school) { s.school.sort('depth'); s.schoolDirty = false; }
    for (const r of s.vectors) vector(r, s); s.vectors.clear();
  }
  function visibleJobs(s) {
    const moving = interacting(s);
    if (!s.assetQueueDirty && s.queueMoving === moving && s.assetCandidates) { s.assetCandidates = s.assetCandidates.filter(r => s.assets.has(r) && !r.loading); return s.assetCandidates; }
    s.assetQueueDirty = false; s.queueMoving = moving; s.workStats.queueRebuilds++;
    const jobs = [...s.assets].filter(r => {
      if (r.loading || r.hidden || !inView(r, s)) return false;
      if (!moving || !s.presented) return true;
      if (r.partRoot && !r.isActor && !(r.partRoot.trackedSources && r.partRoot.trackedSources.size)) return false;
      if (r.qualityUpgrade || r.motionUpgrade && (!r.isCharacter || r.texture && r.texture.frames >= 2)) return false;
      if (r.box && !r.texture && !r.isPlayer && !r.isTransient) { const b = worldBounds(r), c = s.camera; if (b.right < c.x || b.left > c.x + c.w || b.bottom < c.y || b.top > c.y + c.h) return false; }
      return true;
    });
    const priority = r => r.isTransient ? -40 : r.partRoot && r.partRoot.trackedSources && r.partRoot.trackedSources.size ? -35 : r.isPlayer || r.isPet ? -30 : r.texture ? 10 : r.chunkParent ? -20 : r.isGround ? -10 : r.isSemantic ? -5 : 0;
    jobs.sort((a, b) => Number(urgentAsset(b)) - Number(urgentAsset(a)) || priority(a) - priority(b) || a.order - b.order); return s.assetCandidates = jobs;
  }
  function pauseWarmWatchdog(s) { if (s.warmTimer) { clearTimeout(s.warmTimer); s.warmTimer = null; s.warmRemaining = Math.max(0, (s.warmRemaining == null ? 20000 : s.warmRemaining) - (performance.now() - s.warmStarted)); } }
  function armWarmWatchdog(s) { if (s.presented || s.dead || s.warmTimer || document.hidden || s.indoor || interacting(s)) return; if (s.warmRemaining == null) s.warmRemaining = 20000; s.warmStarted = performance.now(); s.warmTimer = setTimeout(() => { s.warmTimer = null; if (!s.dead && !s.presented) fail(s, new Error('The garden textures did not finish preparing')); }, s.warmRemaining); }
  function essentialMissing(s) { let count = 0; for (const r of s.all) if (((s.assets.has(r) || r.loading) && r.type !== 'chunk-root' && !r.texture && !r.empty || r.rigPending) && !r.hidden && inView(r, s)) count++; return count; }
  function present(s) {
    s.svg.style.display = 'none'; s.presented = true; s.scene.sys.settings.visible = !s.indoor; s.host.style.visibility = s.indoor ? 'hidden' : '';
    if (_gw.raf) cancelAnimationFrame(_gw.raf); _gw.raf = 0; if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; } _gw.last = 0;
    if (typeof _ptw !== 'undefined') { if (_ptw.raf) cancelAnimationFrame(_ptw.raf); _ptw.raf = 0; if (_ptw.idleT) clearTimeout(_ptw.idleT); _ptw.idleT = 0; _ptw.last = 0; }
    if (s.loadingHint) s.loadingHint.remove(); pauseWarmWatchdog(s);
    if (s.observer) { const changes = s.observer.takeRecords(); if (changes.length) mutations(changes, s); } flushVisuals(s);
    queueAssets(s);
  }
  function queueAssets(s) {
    if (s.dead || !s.ready || document.hidden || s.indoor || s.working >= 2) return;
    const preparingInput = !s.presented && interacting(s); if (preparingInput) pauseWarmWatchdog(s);
    const now = performance.now(), jobs = s.presented ? visibleJobs(s) : null, urgent = jobs && jobs.some(urgentAsset);
    if (s.presented && !s.cameraDirty && !s.transforms.size && !s.vectors.size && !jobs.length && !s.decorQueue.size && (!s.targetQuality || s.targetQuality === s.quality)) return;
    const due = preparingInput ? now + 16 : s.presented && !urgent ? Math.max(now + 8, s.nextOptionalAt || 0) : now + 8;
    if (s.assetTimer) { if (due >= s.assetDueAt - 1) return; clearTimeout(s.assetTimer); }
    s.assetDueAt = due; s.assetTimer = setTimeout(() => { s.assetTimer = 0; pumpAssets(s); }, Math.max(0, due - now));
  }
  function pumpAssets(s) {
    if (s.dead || !s.ready || document.hidden || s.indoor || s.pumping) return;
    s.pumping = true;
    try {
      flushVisuals(s); settleQuality(s);
      const preparingInput = !s.presented && interacting(s); if (preparingInput) pauseWarmWatchdog(s);
      armWarmWatchdog(s); s.workStats.pumpRuns++;
      const jobs = visibleJobs(s), startedAt = performance.now(), limit = 2, maxStarts = preparingInput ? 1 : !s.presented || jobs.some(urgentAsset) ? 2 : 1; let started = 0;
      for (const r of jobs) {
        if (s.working >= limit || started >= maxStarts || started && performance.now() - startedAt > 4) break;
        const optional = s.presented && !urgentAsset(r);
        if (optional && (s.optionalWorking || performance.now() < (s.nextOptionalAt || 0))) continue;
        if (optional) { s.optionalWorking = true; s.nextOptionalAt = performance.now() + (interacting(s) ? 100 : 64); s.workStats.optionalStarts++; }
        s.assets.delete(r); r.loading = true; s.working++; started++;
        bake(r, s).catch(e => { r.dirty = false; s.assetErrors++; if (e.code === 'TEXTURE_BUDGET') { fail(s, e); return; } if (s.assetErrors <= 3) console.warn('[garden renderer] a drawing could not be loaded', e.message); }).finally(() => {
          if (optional) s.optionalWorking = false; r.loading = false; s.working--; if (r.dirty && s.all.has(r) && !s.dead) enqueueAsset(r, s); queueAssets(s);
        });
      }
      if (!started && !s.decorWorking && s.working < limit) {
        const candidates = [...s.decorQueue].filter(r => s.all.has(r) && !r.parts && !r.hidden && inView(r, s) && r.texture && !r.dirty && !r.decorPlanning && (r.rigPending || performance.now() >= (s.backgroundHoldUntil || 0) || r.trackedSources && r.trackedSources.size));
        candidates.sort((a, b) => Number(!!b.rigPending) - Number(!!a.rigPending) || Number(!!(b.trackedSources && b.trackedSources.size)) - Number(!!(a.trackedSources && a.trackedSources.size)) || Math.max(b.box && b.box.width || 0, b.box && b.box.height || 0) - Math.max(a.box && a.box.width || 0, a.box && a.box.height || 0));
        const r = candidates[0];
        const optional = s.presented && r && !r.rigPending && !(r.trackedSources && r.trackedSources.size);
        if (r && (!optional || !s.optionalWorking && performance.now() >= (s.nextOptionalAt || 0))) { if (optional) { s.optionalWorking = true; s.nextOptionalAt = performance.now() + 64; s.workStats.optionalStarts++; } s.decorQueue.delete(r); r.decorPlanning = true; s.decorWorking = true; s.working++; prepareDecor(r, s).catch(e => { r.decorLimit = 'preparation-failed'; console.warn('[garden renderer] an object kept its standard appearance', e.message); }).finally(() => { if (optional) s.optionalWorking = false; r.rigPending = false; r.decorPlanning = false; s.decorWorking = false; s.working--; queueAssets(s); }); }
      }
      if (!s.presented && s.textureBytes > 0) s.warmReady = essentialMissing(s) === 0 && [...s.all].some(r => (r.texture || r.partsReady) && r.isPlayer);
      // Asset preparation is deliberately independent of RAF. A low frame rate
      // must not serialize hundreds of visible assets into two-per-frame work.
      // This pump never advances simulation or starts a second render loop.
      if (jobs.length > started && s.working < 2) queueAssets(s);
    } finally { s.pumping = false; }
  }
  const motionTracks = {
    sway: [[0, .28, .42, .58, .82, 1], [-.9, 1.9, 1.1, 2.3, -.3, -.9]],
    buzz: [[0, .2, .4, .6, .8, 1], [0, 3, 5, 2, -2, 0], [0, -2, 1, -3, -1, 0]],
    hop: [[0, .64, .70, .76, .82, .88, 1], [0, 0, 1, 2, 3, 4, 0], [0, 0, -4, 0, -2.4, 0, 0]],
    peck: [[0, .7, .76, .82, .88, 1], [0, 0, 22, 4, 20, 0]],
    shuffle: [[0, .2, .45, .55, .8, 1], [0, 0, 3, 4, 7, 7]],
    ear: [[0, .8, .85, .9, 1], [0, 0, -8, 2, 0]], flick: [[0, .8, .86, .92, 1], [0, 0, -14, 6, 0]],
    blink: [[0, .45, .55, 1], [1, .35, 1, 1]], eye: [[0, .93, .96, 1], [1, 1, .1, 1]],
    ambient: [[0, .17, .34, .5, .67, .84, 1], [0, .9, 1.3, .4, -.8, -1, 0], [0, -.5, .25, .55, .05, -.6, 0]]
  };
  function track(phase, stops, values) { let i = 0; while (i < stops.length - 2 && phase > stops[i + 1]) i++; const mix = (1 - Math.cos(Math.PI * (phase - stops[i]) / (stops[i + 1] - stops[i]))) / 2; return values[i] + (values[i + 1] - values[i]) * mix; }
  function motionFrame(motion, box, time) {
    const enabled = current && current.motionEnabled != null ? current.motionEnabled : gardenMotionOn();
    if (motion.kind === 'rig') { const sample = GardenPhaserRig.sample(motion, time, enabled); return { local: sample.matrix, opacity: sample.alpha }; }
    if (motion.kind === 'tracked') { const sample = current && current.animationStyles.get(motion.node); return { local: sample ? sample.delta : IDENTITY, opacity: sample ? sample.paintOpacity / (motion.opacityBase || 1) : 1 }; }
    const period = Math.max(70, Number(motion.periodMs) || 1600), t = time - (motion.delayMs || 0);
    const cycle = ((t / period) % 2 + 2) % 2, phase = cycle % 1, alternate = cycle <= 1 ? cycle : 2 - cycle;
    const eased = (1 - Math.cos(Math.PI * alternate)) / 2;
    let dx = 0, dy = 0, rotation = 0, scaleX = 1, scaleY = 1, opacity = 1;
    let px = motion.pivotX || 0, py = motion.pivotY || 0;
    if (enabled) {
      if (motion.kind === 'cloud' || motion.kind === 'wave') dx = -Math.cos(Math.PI * alternate) * motion.amplitude;
      else if (motion.kind === 'sway') {
        rotation = track(alternate, ...motionTracks.sway) * Math.PI / 180;
        if (box) { px = box.x + box.width / 2; py = box.y + box.height - 3; }
      } else if (motion.kind === 'ring') {
        scaleX = scaleY = .2 + 1.3 * Math.min(1, phase / .6);
        opacity = phase < .12 ? phase / .12 * .85 : Math.max(0, (.6 - phase) / .48) * .85;
      } else if (motion.kind === 'cast-ring' || motion.kind === 'catch-pop') {
        const progress = Math.max(0, Math.min(1, (time - motion.startedAt - (motion.delayMs || 0)) / period)), pop = 1 - (1 - progress) ** 3;
        if (motion.kind === 'cast-ring') { scaleX = scaleY = .3 + 2.3 * pop; opacity = .95 * (1 - pop); }
        else { scaleX = scaleY = .2 + .8 * pop; opacity = pop; }
      } else if (motion.kind === 'glint') opacity = phase < .7 ? 0 : phase < .82 ? (phase - .7) / .12 : (1 - phase) / .18;
      else if (motion.kind === 'glow') opacity = .775 - Math.cos(Math.PI * alternate) * .225;
      else if (motion.kind === 'waterfall') dy = Math.sin(time / period * Math.PI * 2) * Math.min(5, Math.max(0, Number(motion.amplitude) || 0));
      else if (motion.kind === 'shimmer') opacity = .88 + Math.sin(time / period * Math.PI * 2) * Math.min(.15, Math.max(0, Number(motion.amplitude) || 0));
      else if (motion.kind === 'rain') { dx = motion.gx * phase; dy = motion.gp * phase; }
      else if (motion.kind === 'snow') { dx = Math.sin(phase * Math.PI * 2) * 3; dy = motion.gp * phase; }
      else if (motion.kind === 'leaf') { dx = motion.gx * phase + Math.sin(phase * Math.PI) * 12; dy = (motion.gy || 400) * phase; rotation = phase * Math.PI * 11 / 6; opacity = Math.min(1, phase / .08, (1 - phase) / .08); }
      else if (motion.kind === 'drift') dx = -30 + eased * 60;
      else if (motion.kind === 'rays') opacity = .45 + eased * .55;
      else if (motion.kind === 'spin') rotation = phase * Math.PI * 2;
      else if (motion.kind === 'bob') dy = -1.2 + eased * 2.4;
      else if (motion.kind === 'flutter' || motion.kind === 'wing') scaleX = 1 - eased * (motion.kind === 'wing' ? .7 : .65);
      else if (motion.kind === 'ripple') { const wave = (1 - Math.cos(phase * Math.PI * 2)) / 2; scaleX = scaleY = .92 + .13 * wave; opacity = .35 + .55 * wave; }
      else if (motion.kind === 'flicker') { const flicker = Math.floor(eased * 3) / 3; scaleX = 1 - .08 * flicker; scaleY = 1 + .08 * flicker; opacity = 1 - .15 * flicker; }
      else if (motion.kind === 'blink') opacity = track(phase, ...motionTracks.blink);
      else if (motion.kind === 'eye-blink') scaleY = track(phase, ...motionTracks.eye);
      else if (motion.kind === 'swing') rotation = (-2.4 + 4.8 * eased) * Math.PI / 180;
      else if (motion.kind === 'wag') rotation = (-9 + 20 * eased) * Math.PI / 180;
      else if (motion.kind === 'step') rotation = (-12 + 24 * eased) * Math.PI / 180;
      else if (motion.kind === 'creep') dx = 5 * eased;
      else if (motion.kind === 'breathe') dy = -.7 * eased;
      else if (motion.kind === 'shuffle') dx = track(alternate, ...motionTracks.shuffle);
      else if (motion.kind === 'peck' || motion.kind === 'ear' || motion.kind === 'flick') rotation = track(phase, ...motionTracks[motion.kind]) * Math.PI / 180;
      else if (motion.kind === 'buzz' || motion.kind === 'hop' || motion.kind === 'ambient') { const v = motionTracks[motion.kind], radius = motion.kind === 'ambient' ? motion.radius : 1; dx = track(phase, v[0], v[1]) * radius; dy = track(phase, v[0], v[2]) * radius; }
      else if (motion.kind === 'fly') { const trip = Math.min(1, phase / .18); dx = motion.gx * trip; dy = motion.gy * trip; opacity = phase < .02 ? phase / .02 : phase < .18 ? 1 : Math.max(0, (.19 - phase) / .01); }
      else if (motion.kind === 'legacy-rain') { dx = -10 * phase; dy = -40 + phase * 100; opacity = phase < .2 ? phase / .2 : (1 - phase) / .8; }
      else if (motion.kind === 'legacy-snow') { dx = 18 * phase; dy = -60 + phase * 150; opacity = phase < .15 ? phase / .15 : (1 - phase) / .85; }
    }
    const c = Math.cos(rotation), sn = Math.sin(rotation), local = { a: c * scaleX, b: sn * scaleX, c: -sn * scaleY, d: c * scaleY, e: dx + px - c * scaleX * px + sn * scaleY * py, f: dy + py - sn * scaleX * px - c * scaleY * py };
    return { local, opacity };
  }
  function animateMotion(r, time, s) {
    let m = r.m, opacity = 1;
    if (r.motionStack && r.motionStack.length) { let composed = IDENTITY; for (const entry of r.motionStack) { const f = motionFrame(entry.motion, entry.motion.box, time); composed = multiply(composed, multiply(multiply(entry.space, f.local), entry.inverse)); opacity *= f.opacity; } m = r.stackLocal ? multiply(r.m, composed) : multiply(composed, r.m); }
    else if (r.motion) { const f = motionFrame(r.motion, r.box, time); m = multiply(r.m, f.local); opacity = f.opacity; }
    if (r.proxyMotionStack && r.proxyMotionStack.length) { let composed = IDENTITY; for (const entry of r.proxyMotionStack) { const f = motionFrame(entry.motion, null, time); composed = multiply(composed, multiply(multiply(entry.space, f.local), entry.inverse)); opacity *= f.opacity; } const relative = multiply(inverseMatrix(r.m), m); m = multiply(multiply(r.m, composed), relative); }
    const b = r.type === 'vector' ? { x: 0, y: 0 } : r.box || { x: 0, y: 0 }, p = xy(m, b.x, b.y), sx = Math.hypot(m.a, m.b), sy = sx > .00001 ? (m.a * m.d - m.b * m.c) / sx : 0;
    placeObject(r, m, p, s); r.object.setAlpha(r.alpha * opacity);
  }
  function ambientTime(r, s, time) {
    const paused = s.ambientHush && r.hushEligible || s.frozenRecords.has(r);
    if (paused && r.motionPauseAt == null) r.motionPauseAt = time;
    else if (!paused && r.motionPauseAt != null) { r.motionTimeOffset = (r.motionTimeOffset || 0) + time - r.motionPauseAt; r.motionPauseAt = null; }
    return (r.motionPauseAt == null ? time : r.motionPauseAt) - (r.motionTimeOffset || 0);
  }
  function update(s, time) {
    if (s.dead || !s.ready) return;
    if (!s.box.isConnected || !s.svg.isConnected || !wanted()) { destroy(); if (typeof _gwEnsureLoop === 'function' && _gw.on) _gwEnsureLoop(); return; }
    if (document.hidden) return;
    if (typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on) { indoor(true); return; }
    if (!s.presented) {
      // Standard keeps its own RAF and native geometry until the handover.
      // Preparing a second scene must neither advance gameplay nor draw it.
      if (interacting(s)) pauseWarmWatchdog(s);
      queueAssets(s);
      if (s.warmReady) {
        restoreSourceView(s); if (s.observer) { const changes = s.observer.takeRecords(); if (changes.length) mutations(changes, s); } flushVisuals(s);
        if (!essentialMissing(s)) {
          if (!s.playerWarmDone) {
            if (!s.playerWarmWorking) {
              s.playerWarmWorking = true; s.working++;
              warmPlayer(s).then(done => { if (done) s.playerWarmDone = true; }).catch(e => { s.playerWarmDone = true; console.warn('[garden renderer] some poses will prepare on first use', e.message); }).finally(() => { s.playerWarmWorking = false; s.working--; queueAssets(s); });
            }
          }
          else if (s.pipelineWarm) present(s);
          else if (!s.pipelineWarming) {
            // Compile the native pipelines in one hidden render before the
            // controls hand over. Preparation otherwise never draws a frame.
            s.pipelineWarming = true; s.pipelineWarmStarted = performance.now(); s.scene.sys.settings.visible = true;
            s.game.events.once('postrender', () => { if (s.dead) return; s.scene.sys.settings.visible = false; s.pipelineWarm = true; s.workStats.pipelineWarmMs = performance.now() - s.pipelineWarmStarted; });
          }
        }
      }
      return;
    }
    if (typeof _gwFrame === 'function' && _gw.on) _gwFrame(time, true);
    if (s.dead) return;
    if (typeof _ptw !== 'undefined' && _ptw.on && typeof _ptwFrame === 'function') _ptwFrame(time, true);
    if (s.dead) return;
    // Simulation deltas are consumed in this same engine frame. Waiting for a
    // MutationObserver microtask draws actors and their camera one frame late.
    if (s.observer) { const changes = s.observer.takeRecords(); if (changes.length) mutations(changes, s); }
    updateAnimations(s);
    s.motionEnabled = gardenMotionOn();
    if (typeof _gw !== 'undefined' && (_gw.moving || _gw.keys && _gw.keys.size)) s.backgroundHoldUntil = performance.now() + 220;
    const gridState = (s.box.dataset.placing === '1') + '|' + document.documentElement.classList.contains('gd-carrying');
    if (s.gridState !== gridState) { s.gridState = gridState; const grid = s.svg.querySelector('.gd-gridlines'); if (grid) touchTree(grid, s); }
    flushVisuals(s);
    for (const r of s.visibleMotions) if (r.object && r.object.visible) {
      const motionTime = ambientTime(r, s, time);
      if (r.motion || r.motionStack && r.motionStack.length || r.proxyMotionStack && r.proxyMotionStack.length) animateMotion(r, motionTime, s);
    }
    settleQuality(s); queueAssets(s);
    if (s.lastTime) { s.frameIntervals[s.frameIntervalIndex++ % 120] = time - s.lastTime; }
    s.frames++; s.lastTime = time; releaseRenderSlices(s, true);
  }
  function fail(s, error) {
    if (s.dead) return; s.error = String(error && error.message || error); lastFailure = s.error; lastBootState = bootState(s); lastTextureState = textureState(s); console.warn('[garden renderer] using the original renderer:', s.error);
    destroy(); requested = s.svg;
    if (typeof toast === 'function') toast('The new graphics could not start here. Using the standard view.', { kind: 'info' });
    if (typeof _gwEnsureLoop === 'function' && _gw.on) _gwEnsureLoop();
  }
  function ensure(svg, box) {
    if (!wanted() || !svg || !box || !window.FreefloGameEngine) { if (current) destroy(); requested = null; return; }
    if (current && current.svg === svg || requested === svg) return;
    destroy(); requested = svg;
    if (typeof gardenArtRestoreVectors === 'function') gardenArtRestoreVectors(svg);
    // Resident pixels and concurrent decode reservations share one bounded cap.
    // Rich desktop views can exceed 128 MiB; devices reporting at most 4 GiB
    // retain that smaller cap and a lower quality bucket.
    const lowMemory = Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4;
    const s = { id: ++serial, svg, box, ready: false, dead: false, order: 0, records: new WeakMap(), ctmMethods: new Map(), childRectMethods: new Map(), all: new Set(), split: new WeakSet(), vectorNodes: new WeakSet(), transforms: new Set(), vectors: new Set(), assets: new Set(), assetWaiters: new Set(), textures: new Map(), textureBytes: 0, textureBudget: (lowMemory ? 128 : 256) * 1024 * 1024, lowMemory, reservedBytes: 0, textureSeq: 0, working: 0, assetErrors: 0, frames: 0, cameraDirty: true, camera: { x: 0, y: 0, w: 1000, h: 600 }, projection: { scale: 1, left: 0, top: 0 }, css: cssText(), defs: [...svg.querySelectorAll(':scope > defs')].map(n => n.outerHTML).join('') };
    s.graph = new WeakMap(); s.graphEpoch = 0; s.spatial = new Map(); s.largeRecords = new Set(); s.visibleRecords = new Set(); s.visibleMotions = new Set(); s.frameIntervals = []; s.frameIntervalIndex = 0; s.rigPlans = new Map(); s.fragmentSources = new Set([...svg.querySelectorAll('.gart-off')].filter(n => n._gartKids));
    s.cssCache = new Map(); s.cssStats = { sourceBytes: s.css.length, hits: 0, misses: 0, selectedBytes: 0, maxSelectedBytes: 0 }; s.retiredRecords = {}; s.weatherShapes = new WeakMap(); s.motionSpecs = new WeakMap(); s.decorQueue = new Set(); s.decorRoots = new Set(); s.animationStyles = new WeakMap(); s.animationTargets = new Map(); s.frozenRecords = new Set(); s.samplerCount = 0;
    s.workStats = { invalidations: 0, mutationBatches: 0, visualPreparations: 0, abortedJobs: 0, decodes: 0, uploads: 0, cacheHits: 0, diskCacheHits: 0, atlasScans: 0, qualityChanges: 0, trimRuns: 0, queueRebuilds: 0, pumpRuns: 0, optionalStarts: 0, frameYields: 0, graphUpdates: 0, geometryUpdates: 0, cullCandidates: 0, rigPlanHits: 0, rigPlanCompiles: 0, prewarmedPlayerPoses: 0, restoredFragments: 0 }; s.assetQueueDirty = true; s.assetCandidates = []; s.frameWaiters = new Set();
    current = s;
    s.host = document.createElement('div'); s.host.className = 'gd-phaser-stage'; s.host.style.cssText = 'position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:auto;visibility:hidden'; s.host.setAttribute('aria-label', svg.getAttribute('aria-label') || 'Your garden'); box.insertBefore(s.host, box.firstChild);
    setPhotoFilter(svg, svg.style.filter || '');
    s.loadingHint = document.createElement('div'); s.loadingHint.className = 'gd-renderer-preparing'; s.loadingHint.style.cssText = 'position:absolute;top:64px;left:50%;transform:translateX(-50%);z-index:20;display:flex;gap:8px;align-items:center;padding:8px 12px;border-radius:12px;background:var(--panel,#fff8e8);color:var(--text,#332d24);box-shadow:0 2px 12px #0002'; s.loadingHint.setAttribute('role', 'status');
    const label = document.createElement('span'); label.textContent = 'Preparing the new view…';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel'; cancel.onclick = ev => { ev.stopPropagation(); if (typeof _gdpSetPref === 'function') _gdpSetPref('renderEngine', 'standard'); destroy(); if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); };
    s.loadingHint.append(label, cancel); box.appendChild(s.loadingHint);
    window.FreefloGameEngine.load().then(Phaser => {
      if (s.dead || !box.isConnected) return;
      const scene = { create() {
        if (s.dead) { disposeGame(this.game); return; }
        s.scene = this; s.game = this.game; s.ready = true; s.oldDisplay = svg.style.display; lastFailure = null; lastTextureState = null; if (s.bootTimer) clearTimeout(s.bootTimer);
        this.sys.settings.visible = false; s.driver = driverState(this.game);
        // Until handover the source remains the normal, culled SVG view, with
        // its own simulation and native hit geometry. Offscreen nodes return
        // to the logical display list once the retained view takes ownership.
        register(svg, s); syncArt(s); s.ambientFrozen = false; setAmbientPaused(svg, { hush: svg.classList.contains('gd-hush'), frozen: svg.hasAttribute('data-garden-frozen') });
        s.observer = new MutationObserver(events => mutations(events, s)); s.observer.observe(svg, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
        s.oldCtm = svg.getScreenCTM;
        svg.getScreenCTM = () => s.presented ? screenMatrix(svg, s) : s.oldCtm.call(svg);
        s.resize = new ResizeObserver(() => { s.cameraDirty = true; }); s.resize.observe(box); readCamera(s);
        s.visibility = () => { if (document.hidden) { s.game.loop.sleep(); if (s.assetTimer) { clearTimeout(s.assetTimer); s.assetTimer = 0; } pauseWarmWatchdog(s); } else if (!s.indoor) { _gw.last = 0; if (typeof _ptw !== 'undefined') _ptw.last = 0; resumeAssets(s); s.game.loop.wake(); armWarmWatchdog(s); queueAssets(s); } }; document.addEventListener('visibilitychange', s.visibility);
        s.host.querySelector('canvas').setAttribute('role', 'img');
        armWarmWatchdog(s);
        queueAssets(s);
      }, update(time) { update(s, time); } };
      s.game = new Phaser.Game({ type: Phaser.WEBGL, parent: s.host, width: Math.max(1, box.clientWidth), height: Math.max(1, box.clientHeight), backgroundColor: '#8aa671', transparent: false, antialias: true, resolution: Math.min(2, devicePixelRatio || 1), powerPreference: 'high-performance', audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false, gamepad: false }, physics: { default: false }, scene, fps: { target: 60, limit: 0, min: 15, smoothStep: false }, banner: false });
      s.bootTimer = setTimeout(() => { if (!s.dead && !s.ready) fail(s, new Error('The graphics engine did not finish starting')); }, 12000);
      s.host.addEventListener('pointerdown', ev => { if (typeof _ptwClick === 'function') _ptwClick(ev); }, true);
      s.host.addEventListener('webglcontextlost', ev => { ev.preventDefault(); fail(s, new Error('The graphics context was lost')); }, { once: true });
    }).catch(e => fail(s, e));
  }
  function patch(svg) { if (current && current.ready && !current.dead && current.svg === svg) { syncArt(current); current.defs = [...svg.querySelectorAll(':scope > defs')].map(n => n.outerHTML).join(''); current.measureContextDirty = true; queueAssets(current); } }
  function setPhotoFilter(svg, filter) { const s = current; if (!s || s.svg !== svg || !s.host) return; const value = String(filter || ''); if (s.host.style.filter !== value) s.host.style.filter = value; }
  function setAmbientPaused(svg, state) { const s = current; if (!s || s.svg !== svg || s.dead) return; s.ambientHush = !!(state && state.hush); const frozen = !!(state && state.frozen); if (frozen && !s.ambientFrozen) s.frozenRecords = new Set(s.all); else if (!frozen && s.ambientFrozen) s.frozenRecords.clear(); s.ambientFrozen = frozen; const now = performance.now(); for (const r of s.all) ambientTime(r, s, now); }
  function indoor(on) {
    const s = current; if (!s || !s.ready || s.indoor === on) return;
    s.indoor = on; s.host.style.visibility = on || !s.presented ? 'hidden' : ''; s.scene.sys.settings.visible = !!s.presented && !on;
    if (on) { s.game.loop.sleep(); if (s.assetTimer) { clearTimeout(s.assetTimer); s.assetTimer = 0; } pauseWarmWatchdog(s); }
    else if (!document.hidden) { _gw.last = 0; if (typeof _ptw !== 'undefined') _ptw.last = 0; s.cameraDirty = true; resumeAssets(s); s.game.loop.wake(); armWarmWatchdog(s); queueAssets(s); }
  }
  function disposeGame(game) {
    if (!game) return;
    game.destroy(true);
    // Phaser 4.2.1's destroy requests disposal on the next step. A hidden or
    // indoor game has no next step, so finish that same supported disposal
    // path after the current engine callback, when it cannot be re-entrant.
    const finish = () => queueMicrotask(() => { if (!game.pendingDestroy) return; if (game.isRunning && typeof game.runDestroy === 'function') game.runDestroy(); else if (game.events) game.events.once('ready', finish); });
    // BOOT precedes the default-texture/SceneManager READY callbacks. Disposing
    // in that gap leaves those callbacks pointing at a destroyed scene manager.
    finish();
  }
  function destroy() {
    const s = current; current = null; requested = null; if (!s) return; s.dead = true;
    if (s.observer) s.observer.disconnect(); if (s.resize) s.resize.disconnect();
    for (const state of s.animationTargets.values()) { disposeAnimationSampler(state, s); for (const [animation, entry] of state.animations) { animation.removeEventListener('cancel', entry.remove); animation.removeEventListener('remove', entry.remove); animation.removeEventListener('finish', entry.finish); } } s.animationTargets.clear(); if (s.samplerHost) s.samplerHost.remove();
    if (s.bootTimer) clearTimeout(s.bootTimer);
    if (s.assetTimer) clearTimeout(s.assetTimer); resumeAssets(s);
    releaseRenderSlices(s, false); if (s.measureHost) s.measureHost.remove();
    if (s.warmTimer) clearTimeout(s.warmTimer); if (s.loadingHint) s.loadingHint.remove();
    if (s.visibility) document.removeEventListener('visibilitychange', s.visibility);
    if (s.oldCtm) s.svg.getScreenCTM = s.oldCtm;
    for (const node of s.svg.querySelectorAll(':scope > [data-gp-layer]')) node.remove();
    if (s.ready) s.svg.style.display = s.oldDisplay || '';
    if (s.presented && typeof gardenWorldCaptureDepth === 'function') gardenWorldCaptureDepth(s.svg);
    for (const r of s.all) if (r.rectMethod) { try { r.node.getBoundingClientRect = r.rectMethod; } catch (e) { /* node gone */ } }
    for (const node of s.ctmMethods.keys()) restoreCtm(node, s);
    disposeGame(s.game); for (const texture of s.textures.values()) if (texture.canvas) { texture.canvas.width = 1; texture.canvas.height = 1; } s.textures.clear(); if (s.host) s.host.remove();
  }
  function isTarget(node) { return !!(active() && current.presented && !current.indoor && node && current.host.contains(node)); }
  function driverState(game) {
    const gl = game.renderer && game.renderer.gl; if (!gl) return { available: false };
    try { const info = gl.getExtension('WEBGL_debug_renderer_info'), vendor = gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER); return { available: true, vendor, renderer, version: gl.getParameter(gl.VERSION), software: /SwiftShader|llvmpipe|lavapipe|WARP|Microsoft Basic Render|software/i.test(String(renderer)) }; } catch (e) { return { available: true }; }
  }
  function bootState(s) { return { gameExists: !!s.game, isBooted: !!(s.game && s.game.isBooted), isRunning: !!(s.game && s.game.isRunning), rendererType: s.game && s.game.renderer && s.game.renderer.type, scenes: s.game && s.game.scene ? s.game.scene.scenes.map(x => ({ key: x.sys.settings.key, status: x.sys.settings.status, active: x.sys.settings.active })) : [] }; }
  function textureState(s) {
    const refs = new Map(); for (const r of s.all) if (r.texture) { let list = refs.get(r.texture); if (!list) { list = []; refs.set(r.texture, list); } list.push(r); }
    let visibleBytes = 0, unusedBytes = 0, invisibleBytes = 0;
    const largest = [...s.textures.values()].map(t => { const list = refs.get(t) || [], visible = list.some(r => !r.hidden && r.alpha > 0 && inView(r, s)); if (visible) visibleBytes += t.bytes; else if (!t.refs) unusedBytes += t.bytes; else invisibleBytes += t.bytes; return { bytes: t.bytes, width: t.canvas && t.canvas.width, height: t.fh, frames: t.frames, refs: t.refs, visible, classes: list[0] && list[0].node.getAttribute('class'), box: t.box }; }).sort((a, b) => b.bytes - a.bytes).slice(0, 12);
    const detail = r => ({ tag: r.node.localName, classes: r.node.getAttribute('class') || r.node.parentElement && r.node.parentElement.getAttribute('class'), layer: r.node.getAttribute('data-gp-layer') || r.node.closest('[data-gp-layer]') && r.node.closest('[data-gp-layer]').getAttribute('data-gp-layer'), prop: r.node.getAttribute('data-prop'), nearestOwnerMatches: r.node.ownerSVGElement === s.svg, reason: !r.node.isConnected ? 'detached-node' : !s.svg.contains(r.node) ? 'foreign-node' : r.loading ? 'decoding' : !r.measured ? 'needs-bounds' : r.texture ? 'updating-art' : 'queued-visible', type: r.type, measured: !!r.measured, loading: !!r.loading, dirty: !!r.dirty, hasTexture: !!r.texture, frames: r.texture && r.texture.frames, hidden: !!r.hidden, box: r.box });
    const pending = [...s.all].filter(r => (s.assets.has(r) || r.loading) && !r.hidden && inView(r, s));
    const player = [...s.all].filter(r => r.type !== 'container' && r.node.closest('.gd-player'));
    return { budgetBytes: s.textureBudget, residentBytes: s.textureBytes, reservedBytes: s.reservedBytes, visibleBytes, invisibleBytes, unusedBytes, quality: s.quality, lowMemory: s.lowMemory, css: { ...s.cssStats, cacheEntries: s.cssCache.size }, retiredRecords: s.retiredRecords, failedRequest: s.failedRequest || null, largest, pendingVisibleCount: pending.length, pendingVisible: pending.slice(0, 24).map(detail), playerTextureReady: player.some(r => !!r.texture), player: player.map(detail).slice(0, 12) };
  }
  function effectsState(s) {
    const records = [...s.all], targets = [...s.animationTargets].map(([node, state]) => ({ classes: node.getAttribute('class'), tag: node.localName, states: [...state.animations.keys()].map(a => a.playState), properties: [...state.properties], sampled: s.animationStyles.get(node) || null, retainedParts: !!(state.owner && state.owner.partsReady), proxy: !!(state.owner && state.owner.proxySources && state.owner.proxySources.has(node)) }));
    return { weatherLayers: records.filter(r => r.weather && r.type === 'vector').length, weatherSprites: records.filter(r => r.weather && r.type === 'image').length, weatherMotions: [...new Set(records.filter(r => r.weather).flatMap(r => (r.motionStack || []).map(e => e.motion.kind)))], decorativeObjects: records.filter(r => r.partsReady).length, compositeParts: records.filter(r => r.partRoot).length, pendingDecorations: s.decorQueue.size, limits: records.filter(r => r.decorLimit || r.decorDeferred).map(r => ({ classes: r.node.getAttribute('class'), reason: r.decorLimit || r.decorDeferred })).slice(0, 12), affineWrappers: records.filter(r => r.affineWrap).length, animationTargets: targets.length, animationSamplers: s.samplerCount, samplerLimits: [...s.animationTargets.values()].filter(t => t.samplerLimit).length, animations: targets.slice(0, 20), hush: !!s.ambientHush, frozen: !!s.ambientFrozen, pausedMotions: records.filter(r => r.motionPauseAt != null).length, preparationDeferred: performance.now() < (s.backgroundHoldUntil || 0) };
  }
  function rigFrame() {
    const s = current; if (!s) return [];
    const out = [];
    for (const r of s.visibleMotions) {
      const tracks = r.motionStack && r.motionStack.filter(entry => entry.motion.kind === 'rig');
      if (!tracks || !tracks.length || !r.object || !r.object.visible) continue;
      const o = r.object; out.push({ id: r.order, ownerclasses: r.partRoot && r.partRoot.node.getAttribute('class'), x: o.x, y: o.y, rotation: o.rotation, scaleX: o.scaleX, scaleY: o.scaleY, alpha: o.alpha, visible: o.visible, frames: r.texture && r.texture.frames, rigTracks: tracks.length });
      if (out.length >= 32) break;
    }
    return out;
  }
  function status() { const s = current; return s ? { session: s.id, ready: s.ready && !!s.presented, initialized: s.ready, presented: !!s.presented, backend: 'phaser-webgl', driver: s.driver || null, simulationOwner: s.presented ? 'phaser' : 'standard', sceneVisible: !!(s.scene && s.scene.sys.settings.visible), paused: !!s.indoor || document.hidden, entities: s.all.size, textures: s.textures.size, textureBytes: s.textureBytes, textureBudgetBytes: s.textureBudget, reservedTextureBytes: s.reservedBytes, workingTextures: s.working, pendingTextures: s.assets.size, pendingVisibleTextures: [...s.assets].filter(r => !r.hidden && inView(r, s)).length, terrainChunks: [...s.all].filter(r => r.chunkParent).length, visibleChunks: [...s.all].filter(r => r.chunkParent && r.object && r.object.visible).length, assetErrors: s.assetErrors, frames: s.frames, compatibility: 'logical-svg', lastError: lastFailure, boot: bootState(s) } : { ready: false, backend: 'svg', lastError: lastFailure, fallback: !!lastFailure, boot: lastBootState, textureMemory: lastTextureState }; }
  function diagnostics() { const s = current; if (!s) return { memory: lastTextureState, terrain: [] }; const motion = effectsState(s); return { work: { ...s.workStats, essentialMissing: essentialMissing(s), preparingPausedForInput: !s.presented && interacting(s), warmBudgetRemainingMs: s.warmRemaining == null ? 20000 : s.warmRemaining }, memory: textureState(s), motion, effects: motion, terrain: [...s.all].filter(r => r.chunks).map(r => ({ classes: r.node.getAttribute('class'), box: r.box, chunks: r.chunks.length })).sort((a, b) => b.chunks - a.chunks).slice(0, 12) }; }
  return { ensure, active, preparing, wanted, destroy, point, pick, bounds, patch, indoor, setPhotoFilter, trackAnimation, setAmbientPaused, isTarget, status, diagnostics, rigFrame };
})();
