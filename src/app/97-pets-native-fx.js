/* Spectacle timelines render through the game's scene. This command context
 * emits native Graphics and pooled sprites; it creates no display canvas or
 * animation loop. Small particle icons are ordinary cached texture assets. */
window.GardenNativePetFx = (function () {
  'use strict';
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, caches = new WeakMap(); let serial = 0;
  const unitCircle = Array.from({ length: 49 }, (_, i) => ({ x: Math.cos(i / 48 * Math.PI * 2), y: Math.sin(i / 48 * Math.PI * 2) }));
  const clamp = value => Math.max(0, Math.min(1, value));
  const mul = (a, b) => ({ a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b, c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d, e: a.a * b.e + a.c * b.f + a.e, f: a.b * b.e + a.d * b.f + a.f });
  function color(raw) {
    if (raw && raw.stops) return raw;
    const value = String(raw || '#000000').trim(), match = /^#([\da-f]{3,8})$/i.exec(value);
    if (match) { let hex = match[1]; if (hex.length <= 4) hex = [...hex].map(c => c + c).join(''); return { color: parseInt(hex.slice(0, 6), 16), alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 }; }
    const rgb = /^rgba?\(([^)]+)\)/.exec(value); if (rgb) { const n = rgb[1].split(/[,\s/]+/).map(Number); return { color: (n[0] << 16) | (n[1] << 8) | n[2], alpha: n.length > 3 ? n[3] : 1 }; }
    return { color: value === 'white' ? 0xffffff : 0, alpha: value === 'transparent' ? 0 : 1 };
  }
  function blend(stops, p) {
    const list = stops._sorted && stops._sorted.length === stops.length ? stops._sorted : (stops._sorted = stops.slice().sort((a, b) => a.at - b.at)); if (!list.length) return { color: 0, alpha: 0 };
    let a = list[0], b = list[list.length - 1]; for (let i = 0; i < list.length - 1; i++) if (p >= list[i].at && p <= list[i + 1].at) { a = list[i]; b = list[i + 1]; break; }
    const t = clamp((p - a.at) / Math.max(.000001, b.at - a.at)), alpha = a.alpha * (1 - t) + b.alpha * t;
    const mix = shift => alpha > .000001 ? Math.round((((a.color >> shift) & 255) * a.alpha * (1 - t) + ((b.color >> shift) & 255) * b.alpha * t) / alpha) : 0;
    return { color: (mix(16) << 16) | (mix(8) << 8) | mix(0), alpha };
  }
  function clip(subject, boundary) {
    let output = subject; let area = 0; for (let i = 0; i < boundary.length; i++) { const a = boundary[i], b = boundary[(i + 1) % boundary.length]; area += a.x * b.y - b.x * a.y; } const sign = area >= 0 ? 1 : -1;
    for (let i = 0; i < boundary.length && output.length; i++) { const a = boundary[i], b = boundary[(i + 1) % boundary.length], input = output; output = []; const side = p => sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)); let before = input[input.length - 1], bs = side(before); for (const p of input) { const ps = side(p); if ((ps >= 0) !== (bs >= 0)) { const t = bs / (bs - ps); output.push({ x: before.x + (p.x - before.x) * t, y: before.y + (p.y - before.y) * t }); } if (ps >= 0) output.push(p); before = p; bs = ps; } }
    return output;
  }
  class Context {
    constructor(scene) {
      this.native = true; this.scene = scene; this.root = scene.add.container(0, 0).setDepth(100000000); this.graphics = []; this.images = new Map(); this.usedImages = new Map(); this.stack = []; this.paths = []; this.m = I; this.globalAlpha = 1; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.globalCompositeOperation = 'source-over'; this.lineWidth = 1; this.order = 0; this.run = null;
    }
    clearRect() { for (const g of this.graphics) { g.clear(); g.setVisible(false); } for (const list of this.images.values()) for (const image of list) image.setVisible(false); this.gUsed = 0; this.usedImages.clear(); this.order = 0; this.run = null; this.paths = []; this.contour = null; this.m = I; this.stack.length = 0; const canvas = this.scene.game.canvas, cam = this.scene.cameras.main; if (!this.canvasBounds || this.scaleW !== this.scene.scale.width || this.scaleH !== this.scene.scale.height) { this.canvasBounds = canvas.getBoundingClientRect(); this.scaleW = this.scene.scale.width; this.scaleH = this.scene.scale.height; } const bounds = this.canvasBounds, origin = cam.getWorldPoint(0, 0), x = cam.getWorldPoint(this.scaleW / Math.max(1, bounds.width), 0), y = cam.getWorldPoint(0, this.scaleH / Math.max(1, bounds.height)), a = x.x - origin.x, b = x.y - origin.y, c = y.x - origin.x, d = y.y - origin.y; this.project = { a, b, c, d, e: origin.x - bounds.left * a - bounds.top * c, f: origin.y - bounds.left * b - bounds.top * d }; }
    pt(x, y, matrix) { const m = matrix || this.m, p = this.project || I, sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f; return { x: p.a * sx + p.c * sy + p.e, y: p.b * sx + p.d * sy + p.f }; }
    opacity() { return clamp(this.globalAlpha) * (this.globalCompositeOperation === 'lighter' ? .45 : 1); }
    target() { const mode = this.globalCompositeOperation === 'lighter' ? 1 : 0; if (!this.run || this.run.mode !== mode) { let g = this.graphics[this.gUsed++]; if (!g) { g = this.scene.add.graphics(); this.graphics.push(g); this.root.add(g); } g.setVisible(true).setDepth(++this.order).setBlendMode(mode); this.run = { g, mode }; } return this.run.g; }
    save() { this.stack.push({ m: this.m, globalAlpha: this.globalAlpha, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, globalCompositeOperation: this.globalCompositeOperation, lineWidth: this.lineWidth, lineCap: this.lineCap, lineJoin: this.lineJoin }); }
    restore() { const state = this.stack.pop(); if (state) Object.assign(this, state); }
    translate(x, y) { this.m = mul(this.m, { ...I, e: x, f: y }); }
    scale(x, y) { this.m = mul(this.m, { ...I, a: x, d: y == null ? x : y }); }
    rotate(a) { this.m = mul(this.m, { a: Math.cos(a), b: Math.sin(a), c: -Math.sin(a), d: Math.cos(a), e: 0, f: 0 }); }
    setTransform(a, b, c, d, e, f) { this.m = typeof a === 'object' ? a : { a, b, c, d, e, f }; }
    beginPath() { this.paths = []; this.contour = null; }
    moveTo(x, y) { this.contour = { points: [this.pt(x, y)], closed: false }; this.paths.push(this.contour); }
    lineTo(x, y) { if (!this.contour) this.moveTo(x, y); else this.contour.points.push(this.pt(x, y)); }
    closePath() { if (this.contour) this.contour.closed = true; }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    quadraticCurveTo(cx, cy, x, y) { if (!this.contour) this.moveTo(0, 0); const a = this.contour.points[this.contour.points.length - 1], c = this.pt(cx, cy), b = this.pt(x, y); for (let i = 1; i <= 16; i++) { const t = i / 16, u = 1 - t; this.contour.points.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }); } }
    bezierCurveTo(x1, y1, x2, y2, x, y) { if (!this.contour) this.moveTo(0, 0); const a = this.contour.points[this.contour.points.length - 1], b = this.pt(x1, y1), c = this.pt(x2, y2), d = this.pt(x, y); for (let i = 1; i <= 20; i++) { const t = i / 20, u = 1 - t; this.contour.points.push({ x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y }); } }
    arc(x, y, radius, start, end, reverse) { this.ellipse(x, y, radius, radius, 0, start, end, reverse); }
    ellipse(x, y, rx, ry, rotation, start, end, reverse) { let sweep = end - start; if (!reverse && sweep < 0) sweep = sweep % (Math.PI * 2) + Math.PI * 2; if (reverse && sweep > 0) sweep = sweep % (Math.PI * 2) - Math.PI * 2; sweep = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, sweep)); const n = Math.max(4, Math.min(64, Math.ceil(Math.abs(sweep) * Math.sqrt(Math.max(rx, ry, 1))))), c = Math.cos(rotation), s = Math.sin(rotation); for (let i = 0; i <= n; i++) { const a = start + sweep * i / n, px = x + c * Math.cos(a) * rx - s * Math.sin(a) * ry, py = y + s * Math.cos(a) * rx + c * Math.sin(a) * ry; if (!i && !this.contour) this.moveTo(px, py); else this.lineTo(px, py); } }
    contours(path) { return path && path.nativePath != null ? GardenNativeArt.parsePath(path.nativePath).map(contour => ({ points: contour.points.map(p => this.pt(p.x, p.y)), closed: contour.closed })) : this.paths; }
    createLinearGradient(x0, y0, x1, y1) { return { kind: 'linear', a: { x: x0, y: y0 }, b: { x: x1, y: y1 }, m: { ...this.m }, stops: [], addColorStop(at, value) { this.stops.push({ at, ...color(value) }); } }; }
    createRadialGradient(x0, y0, r0, x1, y1, r1) { return { kind: 'radial', a: { x: x0, y: y0 }, b: { x: x1, y: y1 }, r0, r1, m: { ...this.m }, stops: [], addColorStop(at, value) { this.stops.push({ at, ...color(value) }); } }; }
    fill(path) {
      const g = this.target(), style = color(this.fillStyle), alpha = this.opacity(); if (!alpha) return;
      for (const contour of this.contours(path)) {
        const points = contour.points; if (points.length < 3) continue;
        if (!style.stops) { g.fillStyle(style.color, style.alpha * alpha).fillPoints(points, true, true); continue; }
        const transform = mul(this.project || I, style.m), inverse = GardenNativeArt.inverse(transform), raw = points.map(p => GardenNativeArt.point(inverse, p.x, p.y));
        const mapped = p => GardenNativeArt.point(transform, p.x, p.y);
        const paint = (boundary, t) => { const c = blend(style.stops, t); if (c.alpha <= 0) return; const cut = clip(points, boundary.map(mapped)); if (cut.length > 2) g.fillStyle(c.color, c.alpha * alpha).fillPoints(cut, true, true); };
        if (style.kind === 'linear') {
          const dx = style.b.x - style.a.x, dy = style.b.y - style.a.y, length = Math.hypot(dx, dy); if (length < .000001) continue;
          const parameters = raw.map(p => ((p.x - style.a.x) * dx + (p.y - style.a.y) * dy) / (length * length)), lo = Math.min(...parameters), hi = Math.max(...parameters);
          const reach = Math.max(length, ...raw.map(p => Math.hypot(p.x - style.a.x, p.y - style.a.y))) * 2 + 1, nx = -dy / length * reach, ny = dx / length * reach;
          for (let i = 0; i < 32; i++) { const t = lo + (hi - lo) * i / 32, u = lo + (hi - lo) * (i + 1) / 32; paint([{ x: style.a.x + dx * t + nx, y: style.a.y + dy * t + ny }, { x: style.a.x + dx * u + nx, y: style.a.y + dy * u + ny }, { x: style.a.x + dx * u - nx, y: style.a.y + dy * u - ny }, { x: style.a.x + dx * t - nx, y: style.a.y + dy * t - ny }], (t + u) / 2); }
        } else {
          const radius = t => style.r0 + (style.r1 - style.r0) * t, center = t => ({ x: style.a.x + (style.b.x - style.a.x) * t, y: style.a.y + (style.b.y - style.a.y) * t });
          // Disjoint annuli paint each pixel once; overlapping discs bleach
          // transparent centres, especially under additive blending.
          const ring = (inner, outer, a, b, t) => { for (let k = 0; k < 48; k++) { const p = unitCircle[k], q = unitCircle[k + 1]; paint([{ x: a.x + p.x * inner, y: a.y + p.y * inner }, { x: b.x + p.x * outer, y: b.y + p.y * outer }, { x: b.x + q.x * outer, y: b.y + q.y * outer }, { x: a.x + q.x * inner, y: a.y + q.y * inner }], t); } };
          if (style.r0 > 0) paint(unitCircle.slice(0, 48).map(p => ({ x: style.a.x + p.x * style.r0, y: style.a.y + p.y * style.r0 })), 0);
          for (let i = 0; i < 32; i++) { const t = i / 32, u = (i + 1) / 32; ring(radius(t), radius(u), center(t), center(u), (t + u) / 2); }
          const edge = Math.max(style.r1, ...raw.map(p => Math.hypot(p.x - style.b.x, p.y - style.b.y))) + 1;
          if (edge > style.r1 && blend(style.stops, 1).alpha > 0) ring(style.r1, edge, style.b, style.b, 1);
        }
      }
    }
    stroke(path) {
      const g = this.target(), source = color(this.strokeStyle), p = this.project || I, width = Math.max(.05, this.lineWidth * Math.sqrt(Math.abs((this.m.a * this.m.d - this.m.b * this.m.c) * (p.a * p.d - p.b * p.c)))), alpha = this.opacity();
      const inverse = source.stops ? GardenNativeArt.inverse(mul(p, source.m)) : null;
      const sample = point => {
        if (!source.stops) return source;
        const local = GardenNativeArt.point(inverse, point.x, point.y), dx = source.b.x - source.a.x, dy = source.b.y - source.a.y;
        const t = source.kind === 'linear' ? ((local.x - source.a.x) * dx + (local.y - source.a.y) * dy) / Math.max(.000001, dx * dx + dy * dy) : (Math.hypot(local.x - source.b.x, local.y - source.b.y) - source.r0) / Math.max(.000001, source.r1 - source.r0);
        return blend(source.stops, t);
      };
      for (const contour of this.contours(path)) {
        const points = contour.points; if (points.length < 2) continue;
        if (!source.stops) g.lineStyle(width, source.color, alpha * source.alpha).strokePoints(points, contour.closed, contour.closed);
        else for (let i = 1; i < points.length + (contour.closed ? 1 : 0); i++) {
          const a = points[i - 1], b = points[i % points.length], count = Math.max(1, Math.min(32, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(.001, Math.sqrt(Math.abs(p.a * p.d - p.b * p.c))) / 12)));
          for (let k = 0; k < count; k++) { const t = k / count, u = (k + 1) / count, c = sample({ x: a.x + (b.x - a.x) * (t + u) / 2, y: a.y + (b.y - a.y) * (t + u) / 2 }); if (c.alpha > 0) g.lineStyle(width, c.color, alpha * c.alpha).lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); }
        }
        if (!contour.closed && this.lineCap === 'round') for (const point of [points[0], points[points.length - 1]]) { const c = sample(point); g.fillStyle(c.color, alpha * c.alpha).fillCircle(point.x, point.y, width / 2); }
      }
    }
    fillRect(x, y, w, h) { const previous = this.paths, contour = this.contour; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.paths = previous; this.contour = contour; }
    drawImage(source, ...args) {
      if (!source) return; let cache = caches.get(this.scene); if (!cache) { cache = new WeakMap(); caches.set(this.scene, cache); } let key = cache.get(source); if (!key) { key = 'garden-native-fx-' + (++serial); this.scene.textures.addImage(key, source); cache.set(source, key); }
      let list = this.images.get(key); if (!list) { list = []; this.images.set(key, list); } const index = this.usedImages.get(key) || 0; this.usedImages.set(key, index + 1); let object = list[index]; if (!object) { object = this.scene.add.image(0, 0, key).setOrigin(.5); list.push(object); this.root.add(object); }
      const q = args.length >= 8 ? args.slice(-4) : args, x = q[0] || 0, y = q[1] || 0, w = q.length >= 4 ? q[2] : source.width, h = q.length >= 4 ? q[3] : source.height, pos = this.pt(x + w / 2, y + h / 2), matrix = mul(this.project || I, this.m), { a, b, c, d } = matrix, sx = Math.hypot(a, b), sy = sx > .000001 ? (a * d - b * c) / sx : Math.hypot(c, d);
      // The library's 128px textures are soft glows. Keep their reach local
      // to the game viewport while ordinary particle icons keep their size.
      const extent = Math.max(Math.abs(w) * Math.hypot(this.m.a, this.m.b), Math.abs(h) * Math.hypot(this.m.c, this.m.d)), glowLimit = this.canvasBounds ? Math.max(180, Math.min(this.canvasBounds.width, this.canvasBounds.height) * .6) : 420;
      const size = source.width === 128 && source.height === 128 ? Math.min(1, glowLimit / Math.max(1, extent)) : 1;
      object.setVisible(true).setPosition(pos.x, pos.y).setRotation(Math.atan2(b, a)).setScale(sx * w * size / Math.max(1, source.width), sy * h * size / Math.max(1, source.height)).setAlpha(this.opacity()).setBlendMode(this.globalCompositeOperation === 'lighter' ? 1 : 0).setDepth(++this.order); this.run = null;
    }
    finishFrame() { if (this.root.sort) this.root.sort('depth'); }
    destroy() { this.root.destroy(); this.graphics.length = 0; this.images.clear(); }
  }
  function run(def, host, o) {
    o = o || {}; const scene = window.GardenNative && GardenNative.scene(); if (!scene) return null;
    if (_fxS.live) _fxS.live.stop(true);
    const g = new Context(scene), W = innerWidth, H = innerHeight, small = W < 700, F = { W, H, g, host, parts: [], cap: small ? Math.round(FX_CAP / 2) : FX_CAP, q: small ? .6 : 1, P: host.pos(), flash: 0, flashC: '#ffffff', far: null };
    const steps = (def.steps || []).slice().sort((a, b) => a[0] - b[0]).map(([at, kind, p]) => ({ at, kind, p: p || {}, dur: p && p.dur || 0, L: null, done: false }));
    let t = 0, alive = true; const total = def.ms / 1000;
    function advance(dt) { t += dt; for (const step of steps) { if (step.done || t < step.at) continue; if (!step.L) { const make = PET_FX[step.kind]; if (!make) { step.done = true; continue; } step.p = { ...step.p, dur: step.dur || .0001 }; step.L = make(F, step.p); } const u = step.dur ? _fxClamp((t - step.at) / step.dur, 0, 1) : 1; if (step.L.update) step.L.update(dt, u); if (u >= 1) step.done = true; } _fxStep(F, dt); if (F.flash > 0) F.flash = Math.max(0, F.flash - dt * 2.2); }
    function paint() { g.clearRect(0, 0, W, H); for (const step of steps) if (step.L && step.L.draw && (!step.done || step.dur && t - step.at <= step.dur + .02) && t >= step.at) step.L.draw(g, step.dur ? _fxClamp((t - step.at) / step.dur, 0, 1) : 1); _fxDraw(F, g); if (F.flash > 0) { g.globalAlpha = Math.min(.18, F.flash * .22); g.fillStyle = F.flashC; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } g.finishFrame(); }
    function stop(quiet) { if (!alive) return; alive = false; scene.events.off('postupdate', frame); scene.events.off('shutdown', onShutdown); document.removeEventListener('visibilitychange', onVisibility); if (fade) fade.stop(); try { if (host.end) host.end(); } catch (e) { /* an actor may have left */ } g.destroy(); if (_fxS.live === handle) _fxS.live = null; if (!quiet && o.done) o.done(); }
    function frame(time, delta) { if (!alive) return; if (typeof host.isCurrent === 'function' && !host.isCurrent()) { stop(true); return; } if (document.hidden) { stop(); return; } advance(Math.min(.1, Math.max(0, delta / 1000))); paint(); if (t >= total) stop(); }
    function onVisibility() { if (document.hidden) stop(); }
    function onShutdown() { stop(true); }
    let fade = null; const handle = { stop, seek(to) { while (t < to) advance(Math.min(1 / 30, to - t)); paint(); }, get t() { return t; }, native: true };
    _fxS.live = handle; document.addEventListener('visibilitychange', onVisibility); scene.events.once('shutdown', onShutdown);
    if (!_fxMotion()) { const keep = F.host; F.host = { pos: keep.pos, outline: keep.outline }; handle.seek(def.still == null ? total * .6 : def.still); g.root.setAlpha(0); fade = scene.tweens.add({ targets: g.root, alpha: 1, duration: 500, hold: 1600, yoyo: true, onComplete: () => stop() }); }
    else if (!o.manual) scene.events.on('postupdate', frame);
    return handle;
  }
  return Object.freeze({ run, Context });
})();
