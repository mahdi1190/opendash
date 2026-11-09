/* One game, one scene clock, native display components and native input.
 * Saved rules and HTML menus are shared with the dashboard; no SVG scene is
 * mounted, measured, watched or rasterized by this runtime. */
function gardenSceneElement(tag, attrs) {
  if (window.GardenNative && GardenNative.scene()) return GardenNativeArt.element(GardenNative.scene(), tag, attrs || {});
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const key in attrs || {}) node.setAttribute(key, attrs[key]);
  return node;
}
function gardenSceneRoot() { return window.GardenNative && GardenNative.root() || (typeof _gw !== 'undefined' && _gw.svg) || document.querySelector('.gd-page .gd-svg') || document.querySelector('.gd-svg'); }
window.GardenNative = (function () {
  'use strict';
  let live = null, serial = 0, lastError = null, stylesConfigured = false;
  const events = new WeakMap(), explicit = new WeakMap();
  function active() { return !!(live && !live.dead); }
  function scene() { return active() ? live.scene || null : null; }
  function root() { return active() && live.world ? live.world.rootNode : null; }
  function world() { return active() ? live.world || null : null; }
  function wanted() { return _gdpPrefs().renderEngine !== 'standard'; }
  function inRoom() { return !!(window.GardenNativeRooms && GardenNativeRooms.current()); }
  function matrix(m) {
    const value = { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e == null ? m.tx || 0 : m.e, f: m.f == null ? m.ty || 0 : m.f };
    value.inverse = () => matrix(GardenNativeArt.inverse(value)); value.multiply = other => matrix(GardenNativeArt.multiply(value, other));
    value.translate = (x, y) => value.multiply({ a: 1, b: 0, c: 0, d: 1, e: x, f: y }); value.scale = n => value.multiply({ a: n, b: 0, c: 0, d: n, e: 0, f: 0 });
    value.scaleNonUniform = (x, y) => value.multiply({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); value.rotate = angle => { const a = angle * Math.PI / 180; return value.multiply({ a: Math.cos(a), b: Math.sin(a), c: -Math.sin(a), d: Math.cos(a), e: 0, f: 0 }); };
    return value;
  }
  function screenMatrix(node, screen) {
    const transform = node.target.getWorldTransformMatrix(), local = matrix(transform);
    if (!screen) return local;
    const cam = node.scene.cameras.main, o = cam.getWorldPoint(0, 0), x = cam.getWorldPoint(1, 0), y = cam.getWorldPoint(0, 1), inv = GardenNativeArt.inverse({ a: x.x - o.x, b: x.y - o.y, c: y.x - o.x, d: y.y - o.y, e: o.x, f: o.y });
    const box = node.scene.game.canvas.getBoundingClientRect(); return matrix({ a: 1, b: 0, c: 0, d: 1, e: box.left, f: box.top }).multiply(inv).multiply(local);
  }
  function installComponents() {
    const p = GardenNativeArt.Node.prototype; if (p._gameApi) return; p._gameApi = true;
    p.getCTM = function () { return screenMatrix(this, false); }; p.getScreenCTM = function () { return screenMatrix(this, true); };
    p.createSVGMatrix = () => matrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    p.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform(m) { return GardenNativeArt.point(m, this.x, this.y); } });
    p.getBoundingClientRect = function () { const b = this.getBBox(), m = this.getScreenCTM(), points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => GardenNativeArt.point(m, x, y)); const left = Math.min(...points.map(q => q.x)), top = Math.min(...points.map(q => q.y)), right = Math.max(...points.map(q => q.x)), bottom = Math.max(...points.map(q => q.y)); return { x: left, y: top, left, top, right, bottom, width: right - left, height: bottom - top }; };
    p.addEventListener = function (type, fn) { let map = events.get(this); if (!map) { map = new Map(); events.set(this, map); } if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); };
    p.removeEventListener = function (type, fn) { const map = events.get(this); if (map && map.has(type)) map.get(type).delete(fn); };
    p.dispatchEvent = function (event) { for (let n = this; n; n = n.parentNode) { const listeners = events.get(n); if (listeners && listeners.has(event.type)) for (const fn of listeners.get(event.type)) fn.call(n, event); } return true; };
    p.animate = function (frames, timing) { return animate(this, frames, timing); };
    p.getAnimations = function (options) { const out = [...(explicit.get(this) || [])]; if (options && options.subtree) for (const child of this.children) out.push(...child.getAnimations(options)); return out; };
    p.replaceWith = function (next) { const parent = this.parentNode; if (parent) parent.replaceChild(next, this); this.destroy(); };
    p.focus = function () { if (live && live.box) live.box.focus({ preventScroll: true }); };
    Object.defineProperty(p, 'viewBox', { get() { const b = this.getAttribute('viewBox'); const values = String(b || '0 0 1 1').split(/[ ,]+/).map(Number); return { baseVal: { x: values[0], y: values[1], width: values[2], height: values[3] } }; } });
  }
  function decompose(m) { const sx = Math.hypot(m.a, m.b) || 1e-9, sy = (m.a * m.d - m.b * m.c) / sx; let angle = Math.atan2(m.b, m.a); if (Number.isFinite(m.rotationHint)) angle += Math.round((m.rotationHint - angle) / (Math.PI * 2)) * Math.PI * 2; return { x: m.e, y: m.f, sx, sy, angle, skew: Math.abs(sy) > 1e-8 ? (m.a * m.c + m.b * m.d) / (sx * sy) : 0 }; }
  function interpolate(a, b, t) { const v = {}; for (const key of ['x', 'y', 'sx', 'sy', 'angle', 'skew']) v[key] = a[key] + (b[key] - a[key]) * t; const c = Math.cos(v.angle), s = Math.sin(v.angle); return { a: c * v.sx, b: s * v.sx, c: (c * v.skew - s) * v.sy, d: (s * v.skew + c) * v.sy, e: v.x, f: v.y }; }
  // Explicit effects share each property's original inline value. Removing an
  // older effect must not overwrite a newer one or leave a stale held pose.
  const animationSlots = new WeakMap(), animationEasings = new Map();
  const animationCss = key => String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  function animationEase(value) {
    const text = String(value || 'linear').trim(); if (animationEasings.has(text)) return animationEasings.get(text);
    const named = { ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] };
    const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(text), values = named[text] || (bezier && bezier[1].split(',').map(Number));
    let ease = p => p;
    if (values && values.length === 4 && values.every(Number.isFinite)) {
      const [x1, y1, x2, y2] = values, cubic = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
      ease = p => { if (p <= 0 || p >= 1) return p; let lo = 0, hi = 1, t = p; for (let i = 0; i < 15; i++) { const x = cubic(t, x1, x2); if (Math.abs(x - p) < .000001) break; if (x < p) lo = t; else hi = t; t = (lo + hi) / 2; } return cubic(t, y1, y2); };
    } else {
      const steps = /^steps\(\s*(\d+)\s*(?:,\s*([\w-]+)\s*)?\)$/.exec(text), count = steps ? Math.max(1, Number(steps[1])) : 1, position = steps ? steps[2] || 'end' : text === 'step-start' ? 'start' : text === 'step-end' ? 'end' : '';
      if (position) ease = p => { if (p < 0 || p > 1) return p; if (position === 'jump-none') return Math.max(0, Math.min(1, Math.floor(p * count) / Math.max(1, count - 1))); if (position === 'jump-both') return (Math.floor(p * count) + 1) / (count + 1); return /^(start|jump-start)$/.test(position) ? Math.min(1, (Math.floor(p * count) + 1) / count) : Math.floor(p * count) / count; };
    }
    animationEasings.set(text, ease); return ease;
  }
  function animationOffsets(frames) {
    if (!frames.length) return frames;
    const out = frames.map(frame => ({ ...frame, offset: frame.offset == null ? null : Number(frame.offset) }));
    if (out.length === 1 && out[0].offset == null) out[0].offset = 1;
    if (out.length > 1) { if (out[0].offset == null) out[0].offset = 0; if (out[out.length - 1].offset == null) out[out.length - 1].offset = 1; }
    let last = -1, offset = -1;
    for (let i = 0; i < out.length; i++) if (out[i].offset != null) {
      const next = out[i].offset; if (!Number.isFinite(next) || next < 0 || next > 1 || next < offset) throw new TypeError('Animation offsets must increase between 0 and 1.');
      if (last >= 0) for (let j = last + 1; j < i; j++) out[j].offset = offset + (next - offset) * (j - last) / (i - last);
      last = i; offset = next;
    }
    return out;
  }
  function animationTracks(frames) {
    const tracks = new Map(), metadata = new Set(['offset', 'computedOffset', 'easing', 'composite', 'iterationComposite']), keyframes = [];
    const add = (property, value, offset, easing) => { if (value == null) return; const prop = animationCss(property), track = tracks.get(prop) || []; track.push({ offset, raw: value, easing: easing || 'linear' }); tracks.set(prop, track); };
    if (Array.isArray(frames)) {
      for (const frame of animationOffsets(frames)) { keyframes.push({ ...frame, computedOffset: frame.offset }); for (const property of Object.keys(frame)) if (!metadata.has(property)) add(property, frame[property], frame.offset, frame.easing); }
    } else for (const property of Object.keys(frames || {})) if (!metadata.has(property)) {
      const values = Array.isArray(frames[property]) ? frames[property] : [frames[property]], offsets = Array.isArray(frames.offset) ? frames.offset : [];
      const entries = animationOffsets(values.map((value, i) => ({ value, offset: offsets.length === values.length ? offsets[i] : null, easing: Array.isArray(frames.easing) ? frames.easing[i % frames.easing.length] : frames.easing })));
      for (const entry of entries) { add(property, entry.value, entry.offset, entry.easing); keyframes.push({ [property]: entry.value, offset: entry.offset, computedOffset: entry.offset, easing: entry.easing || 'linear' }); }
    }
    return { tracks, keyframes: keyframes.sort((a, b) => a.offset - b.offset) };
  }
  function animationNumber(value, unit) {
    const match = /^([-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?)\s*([a-z%]*)$/i.exec(String(value).trim());
    return match ? { n: Number(match[1]), unit: match[2] || unit || '' } : null;
  }
  function animationValue(prop, raw, box, styles) {
    const text = String(raw == null ? '' : raw).trim(), none = !text || text === 'none';
    if (prop === 'transform') return { kind: 'matrix', value: decompose(GardenNativeArt.matrix(none ? 'none' : text, box, styles)) };
    if (prop === 'rotate') { const token = animationNumber(none ? '0deg' : text.split(/\s+/).pop(), 'deg'); if (token) return { kind: 'angle', value: token.n * (token.unit === 'turn' ? 360 : token.unit === 'rad' ? 180 / Math.PI : token.unit === 'grad' ? .9 : 1) }; }
    if (prop === 'translate' || prop === 'scale' || prop === 'transform-origin') {
      let parts = (none ? prop === 'scale' ? '1 1' : '0px 0px' : text).split(/\s+/);
      if (prop === 'transform-origin') { const keywords = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' }; if (/^(top|bottom)$/.test(parts[0])) parts = [parts[1] || 'center', parts[0]]; parts = parts.map(part => keywords[part] || part); }
      if (parts.length === 1) parts.push(prop === 'scale' ? parts[0] : prop === 'transform-origin' ? '50%' : '0px');
      const values = parts.slice(0, 2).map(part => animationNumber(part, prop === 'scale' ? '' : 'px'));
      if (values.every(Boolean)) return { kind: prop === 'scale' ? 'scale' : 'lengths', value: values.map(v => prop === 'scale' && v.unit === '%' ? { n: v.n / 100, unit: '' } : v) };
    }
    const scalar = animationNumber(text, ''); if (scalar) return { kind: 'number', value: prop === 'opacity' && scalar.unit === '%' ? { n: scalar.n / 100, unit: '' } : scalar };
    return { kind: 'discrete', value: text };
  }
  function animationMix(a, b, t, box, styles) {
    if (a.kind !== b.kind) return t < .5 ? a.raw : b.raw;
    if (a.kind === 'matrix') { const m = interpolate(a.value, b.value, t); return 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].join(',') + ')'; }
    if (a.kind === 'angle') return a.value + (b.value - a.value) * t + 'deg';
    const pixels = (v, axis) => v.n * (v.unit === '%' ? (axis ? box.height : box.width) / 100 : v.unit === 'em' ? parseFloat(styles['font-size']) || 16 : v.unit === 'rem' ? 16 : v.unit === 'vw' ? innerWidth / 100 : v.unit === 'vh' ? innerHeight / 100 : 1);
    const number = (x, y, axis) => x.unit === y.unit ? x.n + (y.n - x.n) * t + x.unit : pixels(x, axis) + (pixels(y, axis) - pixels(x, axis)) * t + 'px';
    if (a.kind === 'lengths' || a.kind === 'scale') return a.value.map((v, i) => number(v, b.value[i], i)).join(' ');
    if (a.kind === 'number') return number(a.value, b.value, 0);
    return t < .5 ? a.value : b.value;
  }
  function animate(node, frames, options) {
    if (node._uncache) node._uncache(true);
    const timing = typeof options === 'number' ? { duration: options } : { ...(options || {}) }, source = animationTracks(frames), box = node.getBBox(), styles = { ...(node._styles || {}) };
    const duration = timing.duration == null || timing.duration === 'auto' ? 0 : Number(timing.duration), delay = Number(timing.delay) || 0, endDelay = Number(timing.endDelay) || 0, iterations = timing.iterations == null ? 1 : Number(timing.iterations), iterationStart = Number(timing.iterationStart) || 0;
    if (Number.isNaN(duration) || duration < 0 || Number.isNaN(iterations) || iterations < 0 || iterationStart < 0 || !Number.isFinite(iterationStart) || !Number.isFinite(delay) || !Number.isFinite(endDelay)) throw new TypeError('Invalid animation timing.');
    const activeDuration = duration === 0 || iterations === 0 ? 0 : duration * iterations, endTime = Math.max(0, delay + activeDuration + endDelay), direction = timing.direction || 'normal', fill = timing.fill || 'none', effectEase = animationEase(timing.easing);
    const tracks = new Map(), underlying = new Map(), owned = new Map(), target = new EventTarget();
    for (const [prop, values] of source.tracks) { const track = values.map(value => ({ ...value, value: { ...animationValue(prop, value.raw, box, styles), raw: value.raw }, ease: animationEase(value.easing) })); if (track[0].offset > 0) track.unshift({ offset: 0, underlying: true, ease: animationEase('linear') }); if (track[track.length - 1].offset < 1) track.push({ offset: 1, underlying: true, ease: animationEase('linear') }); tracks.set(prop, track); }
    let state = 'running', time = 0, rate = 1, listening = false, shutdownBound = false, finishedPromise, finishedResolve, finishedReject, settled = false, generation = 0;
    const makeFinished = () => { generation++; settled = false; finishedPromise = new Promise((resolve, reject) => { finishedResolve = resolve; finishedReject = reject; }); finishedPromise.catch(() => {}); };
    const publish = slot => {
      if (node._dead) return; const layer = [...slot.layers].reverse().find(entry => entry.contributes), value = layer ? layer.value : slot.inline;
      if (layer || slot.hadInline) { if (node.style.getPropertyValue(slot.prop) !== String(value)) node.style.setProperty(slot.prop, value); }
      else if (Object.prototype.hasOwnProperty.call(node._styleValues || {}, slot.prop)) node.style.removeProperty(slot.prop);
    };
    const release = () => { const list = explicit.get(node); if (list) { list.delete(api); node._nativeAnimating = [...list].some(animation => animation._nativeContributing); } };
    const unclaim = () => { const slots = animationSlots.get(node); for (const [prop, layer] of owned) { const slot = slots && slots.get(prop); if (!slot) continue; slot.layers = slot.layers.filter(entry => entry !== layer); publish(slot); if (!slot.layers.length) slots.delete(prop); } owned.clear(); if (slots && !slots.size) animationSlots.delete(node); if (shutdownBound) { node.scene.events.off('shutdown', shutdown); shutdownBound = false; } release(); };
    const claim = () => {
      let list = explicit.get(node); if (!list) { list = new Set(); explicit.set(node, list); } list.add(api); node._nativeAnimating = true;
      let slots = animationSlots.get(node); if (!slots) { slots = new Map(); animationSlots.set(node, slots); }
      for (const prop of tracks.keys()) if (!owned.has(prop)) {
        const inline = node.style.getPropertyValue(prop), computed = prop === 'opacity' && Number.isFinite(node.target.alpha) ? node.target.alpha : node._styles[prop] == null ? prop === 'transform' ? node.getAttribute('transform') || 'none' : prop === 'scale' ? '1 1' : prop === 'rotate' ? '0deg' : prop === 'opacity' ? 1 : 'none' : node._styles[prop];
        underlying.set(prop, { ...animationValue(prop, computed, box, styles), raw: computed });
        let slot = slots.get(prop); if (!slot) { slot = { prop, hadInline: Object.prototype.hasOwnProperty.call(node._styleValues || {}, prop), inline, layers: [] }; slots.set(prop, slot); }
        const layer = { value: inline, contributes: false }; slot.layers.push(layer); owned.set(prop, layer);
      }
      if (!shutdownBound) { node.scene.events.once('shutdown', shutdown); shutdownBound = true; }
    };
    const progressAt = value => {
      const before = value < Math.min(delay, endTime), after = value >= Math.min(delay + activeDuration, endTime), contributes = !before && !after || before && /^(both|backwards)$/.test(fill) || after && /^(both|forwards)$/.test(fill);
      const elapsed = before ? 0 : Math.max(0, Math.min(activeDuration, value - delay));
      let overall = duration === 0 ? iterationStart + (before ? 0 : iterations) : elapsed / duration + iterationStart;
      if (!Number.isFinite(overall)) overall = iterationStart;
      let iteration = Math.floor(overall), progress = overall - iteration;
      if (!before && elapsed === activeDuration && iterations > 0 && progress === 0) { iteration = Math.max(0, iteration - 1); progress = 1; }
      const reverse = direction === 'reverse' || direction === 'alternate-reverse', alternate = direction === 'alternate' || direction === 'alternate-reverse';
      if (reverse !== !!(alternate && iteration % 2)) progress = 1 - progress;
      return { contributes, progress: effectEase(progress), iteration, elapsed };
    };
    const render = () => {
      if (node._dead || time == null) return false; const phase = progressAt(time), slots = animationSlots.get(node);
      for (const [prop, track] of tracks) { const layer = owned.get(prop); if (!layer) continue; layer.contributes = phase.contributes;
        if (phase.contributes) { let index = 0; while (index < track.length - 2 && phase.progress >= track[index + 1].offset) index++; const a = track[index], b = track[Math.min(track.length - 1, index + 1)], span = b.offset - a.offset, p = span ? (phase.progress - a.offset) / span : 1; layer.value = animationMix(a.underlying ? underlying.get(prop) : a.value, b.underlying ? underlying.get(prop) : b.value, a.ease(p), box, styles); }
        const slot = slots && slots.get(prop); if (slot) publish(slot);
      }
      api._nativeContributing = phase.contributes && tracks.size > 0; node._nativeAnimating = [...(explicit.get(node) || [])].some(animation => animation._nativeContributing);
      return phase.contributes;
    };
    const detach = () => { if (listening) { node.scene.events.off('update', tick); listening = false; } };
    const attach = () => { if (!listening && rate !== 0 && state === 'running') { node.scene.events.on('update', tick); listening = true; } };
    const complete = () => { if (state === 'finished' || state === 'idle') return; state = 'finished'; detach(); const contributes = render(); if (!contributes) unclaim(); if (!settled) { settled = true; finishedResolve(api); const token = generation; queueMicrotask(() => { if (state !== 'finished' || token !== generation) return; const event = new Event('finish'); target.dispatchEvent(event); if (api.onfinish) api.onfinish(event); }); } };
    function tick(now, delta) { if (node._dead) { api.cancel(); return; } if (state !== 'running' || rate === 0) return; time = (time == null ? 0 : time) + Math.max(0, Number(delta) || 0) * rate; if (rate > 0 && time >= endTime) { time = endTime; complete(); } else if (rate < 0 && time <= 0) { time = 0; complete(); } else render(); }
    function shutdown() { api.cancel(); }
    const api = {
      onfinish: null, oncancel: null,
      effect: { target: node, getTiming: () => ({ ...timing, duration, delay, endDelay, iterations, iterationStart, direction, fill }), getKeyframes: () => source.keyframes.map(frame => ({ ...frame })), getComputedTiming: () => ({ duration, delay, endDelay, iterations, iterationStart, activeDuration, endTime, localTime: time, progress: time == null ? null : progressAt(time).progress, currentIteration: time == null ? null : progressAt(time).iteration }) },
      get finished() { return finishedPromise; }, get ready() { return Promise.resolve(api); }, get playState() { return state; }, get pending() { return false; },
      get currentTime() { return time; }, set currentTime(value) { if (value == null) { time = null; state = 'idle'; detach(); unclaim(); return; } const next = Number(value); if (!Number.isFinite(next)) throw new TypeError('Animation currentTime must be finite.'); time = next; claim(); if (state === 'idle') { state = 'paused'; if (settled) makeFinished(); } else if (state === 'finished' && (rate < 0 ? time > 0 : time < endTime)) { state = 'running'; makeFinished(); attach(); } render(); },
      get playbackRate() { return rate; }, set playbackRate(value) { const next = Number(value); if (!Number.isFinite(next)) throw new TypeError('Animation playbackRate must be finite.'); rate = next; if (state === 'finished' && time != null && (rate < 0 ? time > 0 : rate > 0 && time < endTime)) { state = 'running'; makeFinished(); claim(); } detach(); attach(); },
      addEventListener: (...args) => target.addEventListener(...args), removeEventListener: (...args) => target.removeEventListener(...args),
      pause() { if (state === 'idle') { time = rate < 0 && Number.isFinite(endTime) ? endTime : 0; claim(); } if (settled) makeFinished(); state = 'paused'; detach(); render(); },
      play() { if (rate < 0 && !Number.isFinite(endTime) && (time == null || time <= 0)) throw new DOMException('Cannot reverse an animation with an infinite end time.', 'InvalidStateError'); if (time == null || rate >= 0 && (time < 0 || time >= endTime) || rate < 0 && (time <= 0 || time > endTime)) time = rate < 0 ? endTime : 0; if (settled) makeFinished(); state = 'running'; claim(); attach(); render(); },
      reverse() { api.playbackRate = rate === 0 ? -1 : -rate; api.play(); },
      finish() { if (rate === 0 || rate > 0 && !Number.isFinite(endTime)) throw new DOMException('This animation cannot finish at its current playback rate.', 'InvalidStateError'); if (state === 'idle') { if (settled) makeFinished(); state = 'running'; claim(); } time = rate < 0 ? 0 : endTime; complete(); },
      cancel() { if (state === 'idle') return; state = 'idle'; time = null; detach(); unclaim(); if (shutdownBound) { node.scene.events.off('shutdown', shutdown); shutdownBound = false; } if (!settled) { settled = true; finishedReject(new DOMException('Animation cancelled', 'AbortError')); } const event = new Event('cancel'); target.dispatchEvent(event); if (api.oncancel) api.oncancel(event); },
      commitStyles() { const slots = animationSlots.get(node); for (const prop of tracks.keys()) { const slot = slots && slots.get(prop); if (slot) { slot.hadInline = true; slot.inline = node.style.getPropertyValue(prop); } } },
      updatePlaybackRate(value) { api.playbackRate = value; },
    };
    makeFinished(); claim(); render(); attach(); return api;
  }
  function normalizeEvent(pointer) {
    const original = pointer.event || pointer, touch = original.changedTouches && original.changedTouches[0], box = live.box.getBoundingClientRect();
    return { clientX: touch ? touch.clientX : original.clientX == null ? pointer.x + box.left : original.clientX, clientY: touch ? touch.clientY : original.clientY == null ? pointer.y + box.top : original.clientY, button: original.button || 0, buttons: original.buttons, pointerId: pointer.id == null ? original.pointerId : pointer.id, pointerType: touch ? 'touch' : 'mouse', target: live.game.canvas, shiftKey: original.shiftKey, ctrlKey: original.ctrlKey, metaKey: original.metaKey, altKey: original.altKey, preventDefault() { if (original.cancelable) original.preventDefault(); }, stopPropagation() { if (original.stopPropagation) original.stopPropagation(); }, stopImmediatePropagation() { if (original.stopImmediatePropagation) original.stopImmediatePropagation(); } };
  }
  function clearHover(s) {
    s.hoverArmed = false;
    _gdp.hoverSprite = null; _gdp.hoverUid = ''; _gw.hoverBug = '';
    _gdpHighlight(null); gardenHoverCardHide();
    if (typeof _gwtHide === 'function') _gwtHide();
    const status = s.box.querySelector('.gd-status'); if (status) status.hidden = true;
    s.box.dataset.hover = '';
    // A gesture or placement owns its ghost and cursor. Retire only hover
    // feedback; never cancel the gesture, change tools or close its bubble.
    const owned = _gdp.press || _gdp.sweep || _gdp.carry || _gdp.moving || _gw.hold || _gw.netting || _gw.fishing && _gw.fishing.state !== 'idle' || _gdp.tool === 'seed' || _gdp.tool === 'decorate' || typeof gardenDesignOn === 'function' && gardenDesignOn();
    if (!owned) gameCursor(s.box, '');
  }
  function hoverProjection(s, remember) {
    if (!remember && !s.hoverArmed) return;
    const cam = s.scene.cameras.main, zx = cam.zoomX || cam.zoom || 1, zy = cam.zoomY || cam.zoom || 1;
    const left = cam.scrollX + cam.width / 2 - cam.width / zx / 2, top = cam.scrollY + cam.height / 2 - cam.height / zy / 2, right = left + cam.width / zx, bottom = top + cam.height / zy;
    if (!(zx > 0 && zy > 0) || !Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) { clearHover(s); return; }
    if (remember) {
      s.hoverArmed = true; s.hoverCamera = cam; s.hoverLeft = left; s.hoverTop = top; s.hoverRight = right; s.hoverBottom = bottom; s.hoverWidth = cam.width; s.hoverHeight = cam.height; s.hoverX = cam.x; s.hoverY = cam.y; s.hoverRotation = cam.rotation;
      return;
    }
    // Accumulate drift from the last physical hover, rather than resetting
    // its baseline every frame. Ignore subpixel easing noise in a resting view.
    if (cam !== s.hoverCamera || cam.width !== s.hoverWidth || cam.height !== s.hoverHeight || cam.x !== s.hoverX || cam.y !== s.hoverY || cam.rotation !== s.hoverRotation || Math.abs(left - s.hoverLeft) * zx > .125 || Math.abs(right - s.hoverRight) * zx > .125 || Math.abs(top - s.hoverTop) * zy > .125 || Math.abs(bottom - s.hoverBottom) * zy > .125) clearHover(s);
  }
  function bindInput(s) {
    const touches = new Map(); let pinch = null, wheel = 0, wheelAt = 0;
    const designing = () => typeof gardenDesignOn === 'function' && gardenDesignOn();
    s.scene.input.on('pointerdown', pointer => {
      if (!active()) return; if (designing()) { touches.clear(); pinch = null; return; } const ev = normalizeEvent(pointer); s.box.focus({ preventScroll: true });
      if (inRoom()) { GardenNativeRooms.pointer(ev); return; } if (_gdpPopOpen()) return;
      touches.set(pointer.id, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); gardenHoldEnd(); _gdpDragCancel(_gdp.press); _gdp.press = null; return; }
      if (ev.button !== 0) return;
      const cell = _gdpCellOf(ev), nativeHit = pick(ev.clientX, ev.clientY), it = _gdpNativeItemOfHit(nativeHit), mode = _gdpMode(), tool = _gdpTool(), model = gardenHere();
      const petHit = typeof _ptwFreeHand === 'function' && _ptwFreeHand() ? nativeHit : null;
      if (petHit && petHit.kind === 'pet' && typeof _ptwClick === 'function') { _ptwClick({ ...ev, type: 'pointerdown', target: petHit.node }); _gdp.press = null; return; }
      _gdp.press = { x0: ev.clientX, y0: ev.clientY, it, cell, moved: false, id: pointer.id };
      if (_gh.bubble) gardenBubbleClose(); gardenSpotMark(null);
      if (mode === 'tend' && !_gdp.moving && (tool === 'water' || tool === 'seed')) _gdp.sweep = { done: new Set(), n: 0, undo0: _gd.undo.length, tool, last: '' };
      else if (mode === 'tend' && !_gdp.moving && tool === 'hand' && !_gwFishBusy()) {
        const plant = it && it.kind === 'plant' ? gardenPlantById(model, it.uid) : cell ? _gdpPlantAtCell(model, cell) : null;
        if (plant && plant.thirsty && !plant.ripe && plant.def.thirst && !model.rain.now) _gdp.sweep = { done: new Set(), n: 0, undo0: _gd.undo.length, tool: 'water', last: '' };
      }
      if (!_gdp.sweep && !_gdp.moving && mode !== 'decorate' && tool !== 'seed') { const action = gardenWorldPick(it, cell, ev, model); if (action.kind === 'ground' && gardenHoldStart(ev)) _gdp.press.hold = true; }
    });
    s.scene.input.on('pointermove', pointer => { if (!active() || designing()) return; const ev = normalizeEvent(pointer); if (inRoom()) { GardenNativeRooms.pointerMove(ev); return; } if (touches.has(pointer.id)) touches.set(pointer.id, { x: ev.clientX, y: ev.clientY }); if (pinch && touches.size > 1) { const [a, b] = [...touches.values()], distance = Math.hypot(a.x - b.x, a.y - b.y); if (distance > pinch * 1.12) { s.world.zoom(-1); pinch = distance; } else if (distance < pinch / 1.12) { s.world.zoom(1); pinch = distance; } return; } const pr = _gdp.press; if (pr && (Math.abs(ev.clientX - pr.x0) > 9 || Math.abs(ev.clientY - pr.y0) > 9)) pr.moved = true; if (pr && pr.hold) gardenHoldMove(ev); else if (pr && pr.moved) _gdpDragMove(ev); else { _gdpHover(ev); hoverProjection(s, true); } });
    const release = pointer => { if (!active()) return; const ev = normalizeEvent(pointer); touches.delete(pointer.id); if (designing()) { touches.clear(); pinch = null; return; } if (touches.size < 2 && pinch) { pinch = null; _gdp.press = null; return; } if (inRoom()) { GardenNativeRooms.up(); return; } const pr = _gdp.press; _gdp.press = null; if (!pr) return; if (pr.hold) { gardenHoldEnd(); return; } if (_gdp.sweep) { if (pr.moved) { _gdpSweepEnd(); return; } _gdp.sweep = null; } if (pr.moved && pr.drag) _gdpDragDrop(ev, pr); else if (!pr.moved) _gdpClick(pr.it, pr.cell, ev); };
    s.scene.input.on('pointerup', release); s.scene.input.on('pointerupoutside', release);
    s.contextmenu = ev => {
      if (!active() || designing() || inRoom() || _gdpPopOpen() || _gwFishBusy()) return;
      ev.preventDefault(); const model = gardenHere(), cell = _gdpCellOf(ev), item = _gdpPickItem(ev, cell);
      if (_gdpMode() === 'decorate' || _gdp.moving || _gdpTool() === 'seed') { _gdpEsc(); return; }
      const plant = item && item.kind === 'plant' ? gardenPlantById(model, item.uid) : cell ? _gdpPlantAtCell(model, cell) : null;
      if (plant) { _gdp.sel = plant.uid; _gdpPaintSel(model); gardenPlantBubble(plant, model); return; }
      const decor = item && item.kind === 'decor' ? gardenDecorById(model, item.uid) : null;
      if (decor) { _gdp.sel = decor.uid; _gdpPaintSel(model); gardenDecorBubble(decor, model); }
    };
    s.game.canvas.addEventListener('contextmenu', s.contextmenu);
    s.blur = () => { _gw.keys.clear(); if (inRoom()) { _grm.keys.clear(); _ee.keys.clear(); GardenNativeRooms.up(); } gardenHoldEnd(); _gdpDragCancel(_gdp.press); _gdp.press = null; touches.clear(); pinch = null; _gwFishRelease(); if (_gdp.sweep) _gdpSweepEnd(); clearHover(s); };
    window.addEventListener('blur', s.blur); s.game.canvas.addEventListener('pointercancel', s.blur);
    s.hoverLeave = () => clearHover(s); s.game.canvas.addEventListener('pointerleave', s.hoverLeave);
    s.scene.input.on('wheel', (pointer, selected, dx, dy, dz, ev) => { if (!active() || designing() || inRoom() || _gdpPopOpen()) return; if (ev && ev.cancelable) ev.preventDefault(); wheel += dy; const now = performance.now(); if (Math.abs(wheel) >= 24 && now - wheelAt > 65) { s.world.zoom(wheel > 0 ? 1 : -1); wheel = 0; wheelAt = now; } void selected; void dx; void dz; });
    const key = (ev, down) => {
      if (!active() || ev.isComposing) return;
      if (GardenNativeRooms.filterKey && GardenNativeRooms.filterKey(ev)) return;
      // Releasing a movement key still matters after focus moves into a field.
      if (!down) {
        const dir = _GW_KEYMAP[ev.key]; if (dir) _gw.keys.delete(dir); if (ev.key === 'Shift') _gw.keys.delete('shift');
        if (inRoom()) { const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; _grm.keys.delete(k); _ee.keys.delete(k); if (k === 'Shift') { _grm.keys.delete('shift'); _ee.keys.delete('shift'); } GardenNativeRooms.key(ev); }
        else if (ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable="true"]')) { const dir = _GW_KEYMAP[ev.key]; if (dir) _gw.keys.delete(dir); if (ev.key === 'Shift') _gw.keys.delete('shift'); if (ev.key === ' ' || /^e$/i.test(ev.key)) _gwFishRelease(); }
        else gardenWorldKey(ev, false);
        return;
      }
      if (typeof gardenDesignOn === 'function' && gardenDesignOn()) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const target = ev.target;
      if (target && target.closest) {
        if (target.closest('input,textarea,select,[contenteditable="true"]') && ev.key !== 'Escape') return;
        if (target.closest('button,a') && (ev.key === ' ' || ev.key === 'Enter')) return;
        const dialog = target.closest('[role="dialog"],[role="menu"]');
        if (dialog && !dialog.classList.contains('grm-native-room')) return;
      }
      if (inRoom()) { GardenNativeRooms.key(ev); return; }
      if (!_gdpPopOpen()) _gdpKey(ev);
    };
    const handledKeys = new WeakSet();
    s.captureKey = ev => {
      if (!active()) return; const down = ev.type === 'keydown';
      if (down && (ev.ctrlKey || ev.metaKey || ev.altKey)) return;
      handledKeys.add(ev);
      // The on-demand HUD handles its own menu arrows and panel Escape before
      // movement consumes them. The engine must not re-handle that same event.
      if (down && typeof gardenHudOwnsKey === 'function' && gardenHudOwnsKey(ev)) return;
      const prevented = ev.defaultPrevented; key(ev, down);
      if (down && !prevented && ev.defaultPrevented) ev.stopImmediatePropagation();
    };
    window.addEventListener('keydown', s.captureKey, true); window.addEventListener('keyup', s.captureKey, true);
    s.scene.input.keyboard.on('keydown', ev => { if (!handledKeys.has(ev)) key(ev, true); }); s.scene.input.keyboard.on('keyup', ev => { if (!handledKeys.has(ev)) key(ev, false); });
  }
  function step(s, time, delta) {
    if (s.dead || !s.world || document.hidden) return;
    if (!s.box.isConnected || !wanted()) { destroy(); return; }
    if (!s.ready) return;
    const dt = Math.min(.055, Math.max(.001, delta / 1000 || .016));
    if (!s.capturing) {
      // The Classic slow heartbeat finds DOM SVG stages, which native mode
      // does not mount. Keep its canonical weather/time check on this clock,
      // including idle scenes; an unchanged light key does not repaint.
      if (s.lightCheckAt == null || time - s.lightCheckAt >= 2560) {
        s.lightCheckAt = time;
        if (typeof gardenLightCheck === 'function') { try { gardenLightCheck(); } catch (error) { console.error('[garden]', error); } }
      }
      if (inRoom()) { GardenNativeRooms.update(time, dt); _gwFishFrame(dt); }
      else {
        s.world.update(time, delta);
        // World.update owns its movement memo and releases it on return. The
        // remaining outdoor simulation also samples many feet; share one exact
        // collision snapshot here rather than rebuilding its revision per probe.
        _gw.frameActive = true; _gw.frameGrid = null; _gw.framePrefs = _gdpPrefs();
        try {
          _gwFishFrame(dt); _gwBugsFrame(dt); _gwPetFrame(dt); _gwSpritesFrame(dt); if (typeof gardenLifeVisitFrame === 'function') gardenLifeVisitFrame(time); if (typeof _ptw !== 'undefined' && _ptw.on) _ptwFrame(time, true); if (s.world.flushDepth) s.world.flushDepth(); gardenHudFrame(); if (typeof gardenPoseFrame === 'function') gardenPoseFrame();
        } finally { _gw.frameActive = false; _gw.frameGrid = null; _gw.framePrefs = null; }
      }
      hoverProjection(s, false);
      s.lighting.update(time, delta); GardenNativeArt.updateAll(s.scene, time);
      if (!inRoom() && typeof petGardenVisualFrame === 'function') petGardenVisualFrame(time, delta);
      if (s.frontier) s.frontier.update(time, delta);
      // Each synchronous presentation pass owns one fresh lighting snapshot.
      let presentationEnvironment = null;
      if (s.surface) s.surface.update(time, delta, presentationEnvironment = s.lighting.environment());
      if (s.water) { waterInteractions(s); s.water.update(time, delta, presentationEnvironment || s.lighting.environment()); }
    }
    s.frames++; s.time = time;
  }
  function presentationKey(model) {
    const { now, occ, visit, ...view } = model, saved = { ..._gdG() }, prefs = { ...saved.prefs };
    delete saved.prefs; delete prefs.cam; delete prefs.zoom;
    const weather = typeof _gdWeather === 'function' ? _gdWeather() : null;
    view.plants = model.plants.map(({ hours, dry, nextIn, lastWater, ...plant }) => ({ ...plant, lastWater: plant.def.special === 'heart' ? 0 : model.rain.now ? 1 : lastWater }));
    view.rain = { ...model.rain, last: model.rain.now ? 1 : model.rain.last };
    const ui = [_gdpTool(), _gdp.seed, _gdp.decor, _gdp.sel, _gdp.moving && [_gdp.moving.kind, _gdp.moving.uid]];
    // Model/cache revision numbers may change when an unrelated dashboard
    // refresh reads fresh state. Compare the actual garden presentation.
    // Position and camera movement belong to the engine, not a scene repaint.
    // Bag and menu visibility belong to their retained HUD handlers; opening
    // those panels does not change the world's plants, scenery or lighting.
    return JSON.stringify([
      view, Math.floor(now / 60000), visit && { ...visit, key: undefined }, saved, prefs,
      typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0,
      state.profile, state.wardrobe, state.pet, state.game && state.game.seen,
      typeof _gm !== 'undefined' && _gm.rev, gardenFun(), gardenMotionOn(), ui,
      weather && weather.today && [weather.today.sunrise, weather.today.sunset], typeof gardenSocialBadge === 'function' ? gardenSocialBadge() : 0,
    ], (key, value) => key === 'def' && value && value.id ? value.id : value);
  }
  function refreshLiveHud(s, model) {
    // These overlays have their own event/time state, independent of plants
    // and inventory. Keep them live when the retained garden can be reused.
    gardenLiveHostPainted(model);
    if (typeof gardenVisitTagPaint === 'function') gardenVisitTagPaint(s.box, model);
    if (typeof gardenLiveGoalPaint === 'function') gardenLiveGoalPaint(s.box);
    if (typeof gardenPlayHud === 'function') gardenPlayHud(s.box, model);
    if (typeof _ptwCheck === 'function') _ptwCheck();
  }
  function sync(model) {
    const s = live; if (!s || s.dead) return; s.model = model;
    if (!s.world) return;
    let key = null;
    try { key = presentationKey(model); } catch (error) { /* Unknown model extensions take the full paint path. */ }
    if (key != null && s.presentationKey === key) { s.syncReused = (s.syncReused || 0) + 1; _gdp.svg = s.world.rootNode; _gw.svg = s.world.rootNode; refreshLiveHud(s, model); return; }
    s.syncFull = (s.syncFull || 0) + 1;
    s.world.sync(model); s.lighting.sync(model); if (s.water) s.water.sync(model); if (s.surface) s.surface.sync(model); _gdp.svg = s.world.rootNode; _gw.svg = s.world.rootNode;
    _gwBugsSync(model); gardenLifeSync(model); gardenWonderSync(model); gardenLiveHostPainted(model); gardenGamePainted(model); if (typeof gardenDesignPainted === 'function') gardenDesignPainted(_gdp.svg, model.dz);
    gardenHudPaint(model); if (typeof _ptwCheck === 'function') _ptwCheck();
    s.presentationKey = key;
  }
  function interact(hit) {
    const s = live; if (!s) return;
    if (hit.kind === 'room-leave') { roomEffects(s, false); s.box.classList.remove('gd-native-indoor'); return; }
    if (hit.kind === 'fish-press') { _gwFishPress(true); return; }
    if (hit.kind === 'water' && hit.room) { _gwFishCast(hit.cell); }
  }
  function enterRoom(room) {
    const s = live; if (!s || !s.world) return false;
    if (typeof _fxS !== 'undefined' && _fxS.live) _fxS.live.stop(true);
    _gwFishCancel(); if (typeof petGardenSuspend === 'function') petGardenSuspend(); s.world.stopMoving(); s.world.setVisible(false);
    const entered = GardenNativeRooms.enter(room, { scene: s.scene, world: s.world, box: s.box, onInteract: interact, onExit() { if (s.dead) return; s.world.setVisible(true); roomEffects(s, false); s.world.resize(s.box.clientWidth, s.box.clientHeight); gardenHudPaint(s.model); } });
    if (entered) { roomEffects(s, true); s.box.classList.add('gd-native-indoor'); } else s.world.setVisible(true);
    return entered;
  }
  function leaveRoom() { const s = live; if (!s || !inRoom()) return false; roomEffects(s, false); const result = GardenNativeRooms.leave(); s.box.classList.remove('gd-native-indoor'); return result; }
  function roomEffects(s, on) {
    if (!!s.hoverRoom !== !!on) { s.hoverRoom = !!on; clearHover(s); }
    const room = on ? { ...GardenNativeRooms.lighting(), root: GardenNativeRooms.current().root, effectsState: GardenNativeRooms.effectsState } : null;
    if (s.lighting) s.lighting.setRoom(room); if (s.water) s.water.setRoom(room); if (s.frontier) s.frontier.setRoom(room); if (s.surface) s.surface.setRoom(room); s.waterFishing = '';
  }
  function waterInteractions(s) {
    const f = _gw.fishing, phase = f && f.state || 'idle';
    if (phase === s.waterFishing) return;
    const prior = s.waterFishing; s.waterFishing = phase;
    if (!f || !Number.isFinite(f.bx) || !Number.isFinite(f.by)) return;
    const pt = f.bx >= GARDEN_ROOM_X ? GardenNativeRooms.roomPoint(f.bx, f.by) : { x: f.bx * GARDEN_WORLD.cellW, y: GARDEN_WORLD.sky + f.by * GARDEN_WORLD.cellH };
    if (!pt) return;
    if (phase === 'wait' && prior === 'cast') s.water.effect('cast', pt.x, pt.y, { rings: false });
    else if (phase === 'land') s.water.effect('catch', pt.x, pt.y, { rings: false });
  }
  // Phaser 4 specializes its textured batch shader for every texture count.
  // Zoom changes that count even when every visible object is already cached.
  // Prepare the reachable native suite before input, on the engine's own clock.
  function prepareShaders(s, complete) {
    const renderer = s.game.renderer, nodes = renderer.renderNodes, started = performance.now();
    const report = s.shaderPreparation = { state: 'preparing', prepared: 0, compiled: 0, limit: 0, ms: 0 };
    const cacheReport = s.cachePreparation = { state: 'preparing', frames: 0, terrainReady: 0, terrainTotal: 0, pendingVisible: 0, ms: 0 };
    let jobs = null, index = 0, timer = null, finished = false, shaderState = null;
    const copy = config => ({ base: { ...config.base }, additions: config.additions.map(addition => ({ ...addition })), features: [...config.features] });
    const cleanup = () => {
      clearTimeout(timer); s.game.events.off('postrender', advance); s.scene.events.off('shutdown', shutdown);
      s.game.canvas.removeEventListener('webglcontextlost', lost); s.stopShaderPreparation = null;
    };
    const finish = (error, state) => {
      if (finished) return; finished = true; cleanup();
      report.state = error ? 'failed' : state || 'ready'; report.ms = performance.now() - started;
      cacheReport.ms = report.ms; if (error) cacheReport.state = 'failed';
      if (!s.dead) complete(error);
    };
    const lost = () => finish(new Error('The graphics connection was interrupted. Reopen the garden to try again.'));
    const shutdown = () => finish(new Error('The garden closed before its graphics were ready.'));
    const standard = config => config && config.base && config.base.name === 'STANDARD' && Array.isArray(config.features) && !config.features.length && Array.isArray(config.additions) && config.additions.filter(addition => !addition.disable).every(addition => /^(TexCoordOut|Tint|\d+TexCount|GetTexture\d+)$/.test(addition.name));
    const advance = () => {
      if (s.dead) { s.stopShaderPreparation(); return; }
      try {
        if (renderer.contextLost) { lost(); return; }
        // Loading uses the same bounded capture scheduler as normal play.
        // Prepare fit-view terrain too, so the first zoom-out does not replay
        // uncached woodland. Game rules, movement and saves stay paused.
        const now = performance.now(), cache = s.world.prepareCaches ? s.world.prepareCaches() : { ready: true };
        Object.assign(cacheReport, cache); cacheReport.frames++; cacheReport.ms = now - started;
        GardenNativeArt.updateAll(s.scene, now); if (s.water) s.water.update(now, 0, s.lighting.environment());
        const cacheDone = cache.ready || now - started >= 6000;
        if (cacheDone) cacheReport.state = cache.ready ? 'ready' : 'continuing';
        if (shaderState) { if (cacheDone) finish(null, shaderState); return; }
        if (!jobs) {
          const quad = nodes && typeof nodes.getNode === 'function' && nodes.getNode('BatchHandlerQuad'), manager = quad && quad.programManager;
          if (!manager || typeof quad.finalizeTextureCount !== 'function' || !renderer.shaderProgramFactory) { shaderState = 'unsupported'; if (cacheDone) finish(null, shaderState); return; }
          // Read the suite used by the real first render, including its native
          // texture-coordinate/tint additions, rather than inventing shaders.
          const rendered = Object.values(manager.programs).map(suite => suite.config).find(standard);
          const source = rendered || (standard(manager.currentConfig) ? manager.currentConfig : null);
          if (!source) { shaderState = 'unsupported'; if (cacheDone) finish(null, shaderState); return; }
          report.limit = Math.floor(Math.min(16, renderer.maxTextures, quad.maxTexturesPerBatch || renderer.maxTextures));
          if (!(report.limit >= 1)) { shaderState = 'unsupported'; if (cacheDone) finish(null, shaderState); return; }
          jobs = Array.from({ length: report.limit }, (_, count) => ({ manager, quad, count: count + 1, config: copy(source) }));
          const flat = nodes.getNode('BatchHandlerTriFlat'), flatManager = flat && flat.programManager;
          if (flatManager && flatManager.currentConfig.base.name === 'FLAT') jobs.push({ manager: flatManager, config: copy(flatManager.currentConfig) });
        }
        const job = jobs[index], manager = job.manager, previous = manager.currentConfig, factory = renderer.shaderProgramFactory;
        let suite;
        try {
          manager.currentConfig = copy(job.config);
          if (job.quad) job.quad.finalizeTextureCount(job.count);
          const config = manager.currentConfig, key = factory.getKey(config.base, config.additions, config.features), existed = factory.has(key);
          suite = manager.getCurrentProgramSuite();
          if (suite && !existed) report.compiled++;
        } finally { manager.currentConfig = previous; }
        if (!suite) return;
        report.prepared++; index++;
        if (index === jobs.length) { shaderState = 'ready'; if (cacheDone) finish(); }
      } catch (error) { finish(error); }
    };
    s.stopShaderPreparation = () => { if (finished) return; finished = true; cleanup(); report.state = 'cancelled'; report.ms = performance.now() - started; };
    s.scene.events.once('shutdown', shutdown); s.game.canvas.addEventListener('webglcontextlost', lost);
    timer = setTimeout(() => finish(new Error('The garden graphics took too long to open. Reopen the garden to try again.')), 10000);
    s.game.events.on('postrender', advance);
  }
  function openingVisibility(s) {
    if (s.dead || !s.ready || !s.scene) return;
    const cover = s.openingCover;
    const covered = !!(cover && cover.isConnected && !cover.classList.contains('is-out') && !cover.classList.contains('is-skip') && !s.capturing);
    if (covered !== !!s.openingCovered) {
      s.openingCovered = covered;
      // Visibility gates Phaser rendering, independently of scene updates.
      // Warm caches first; keep rules and live visitors advancing underneath.
      s.scene.sys.setVisible(!covered);
    }
    if (cover && (!cover.isConnected || cover.classList.contains('is-out') || cover.classList.contains('is-skip'))) {
      s.openingCover = null;
      if (s.openingObserver) { s.openingObserver.disconnect(); s.openingObserver = null; }
    }
  }
  function watchOpening(s) {
    const cover = document.getElementById('od-splash'); if (!cover) return;
    s.openingCover = cover;
    s.openingObserver = new MutationObserver(() => openingVisibility(s));
    s.openingObserver.observe(cover, { attributes: true, attributeFilter: ['class'] });
    if (cover.parentNode) s.openingObserver.observe(cover.parentNode, { childList: true });
  }
  function mount(parent, box, model) {
    if (live && live.parent === parent && !live.dead) { sync(model); return; }
    destroy(); if (window.GardenPhaser) GardenPhaser.destroy(); gardenWorldStop(); lastError = null;
    const s = live = { id: ++serial, parent, box, model, dead: false, ready: false, frames: 0, started: performance.now() };
    watchOpening(s);
    const host = s.host = document.createElement('div'); host.className = 'gd-native-stage'; host.style.cssText = 'position:absolute;inset:0;overflow:hidden;touch-action:none;visibility:hidden'; host.setAttribute('aria-label', 'Your garden'); parent.appendChild(host);
    const loading = s.loading = document.createElement('div'); loading.className = 'gd-renderer-preparing'; loading.setAttribute('role', 'status'); loading.textContent = 'Opening the garden…'; loading.style.cssText = 'position:absolute;inset:45% 20% auto;text-align:center;z-index:30;color:var(--fg,#293c30);padding:16px;background:var(--surface,#f6f5ed);border-radius:16px'; box.appendChild(loading);
    FreefloGameEngine.load().then(Phaser => {
      if (s.dead) return; installComponents(); if (typeof gardenAudioPrepare === 'function') gardenAudioPrepare();
      if (!stylesConfigured) { const css = [...document.querySelectorAll('style')].map(node => node.textContent.replace(/@font-face\s*\{[^}]*\}/g, '')).join('\n'); GardenNativeArt.configure(css); stylesConfigured = true; }
      const config = { create() {
        if (s.dead) return;
        try {
          s.scene = this; s.game = this.game;
          const position = _gwSavedPos(); if (position) { _gw.px = position.x; _gw.py = position.y; }
          _gw.root = _gdp.root; _gw.box = box; _gw.sizeOk = false;
          s.world = GardenNativeWorld.create(this, { model: s.model, box, root: _gdp.root }); _gdp.svg = s.world.rootNode; _gw.svg = s.world.rootNode;
          s.lighting = GardenNativeLight.create(this, { world: s.world, model: s.model });
          if (window.GardenNativeFrontier) s.frontier = GardenNativeFrontier.create(this, { world: s.world });
          if (window.GardenNativeSurface) s.surface = GardenNativeSurface.create(this, { world: s.world, model: s.model });
          if (window.GardenNativeWater) s.water = GardenNativeWater.create(this, { world: s.world, model: s.model }); sync(s.model);
          if (s.world.prepareRender) s.world.prepareRender();
          s.lighting.update(performance.now(), 16); GardenNativeArt.updateAll(s.scene, performance.now()); if (s.frontier) s.frontier.update(performance.now(), 0); let presentationEnvironment = null; if (s.surface) s.surface.update(performance.now(), 0, presentationEnvironment = s.lighting.environment()); if (s.water) s.water.update(performance.now(), 0, presentationEnvironment || s.lighting.environment());
          prepareShaders(s, error => {
            if (error) { lastError = String(error && error.message || error); loading.textContent = 'The garden could not open: ' + lastError; console.error('[native garden]', error); return; }
            bindInput(s); _gwBuildCamUi(box); s.ready = true; s.loadMs = performance.now() - s.started; openingVisibility(s); host.style.visibility = ''; loading.remove(); box.focus({ preventScroll: true });
          });
        } catch (error) { lastError = String(error && error.message || error); loading.textContent = 'The garden could not open: ' + lastError; throw error; }
      }, update(time, delta) { step(s, time, delta); } };
      // Four texture slots keep the reachable shader suite small; preparation
      // still warms every native variant before the player takes control.
      s.game = new Phaser.Game({ type: Phaser.WEBGL, parent: host, width: Math.max(1, box.clientWidth), height: Math.max(1, box.clientHeight), backgroundColor: '#87aa78', antialias: true, resolution: Math.min(2, devicePixelRatio || 1), powerPreference: 'high-performance', maxTextures: 4, audio: { noAudio: true }, input: { keyboard: true, mouse: { preventDefaultWheel: true }, touch: true, activePointers: 3, gamepad: false }, scene: config, fps: { target: 60, min: 15, limit: 0, smoothStep: false }, banner: false });
      s.resize = new ResizeObserver(() => { if (s.dead || !s.ready || s.capturing) return; const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; s.game.scale.resize(w, h); if (!inRoom()) s.world.resize(w, h); }); s.resize.observe(box);
      s.visibility = () => { if (s.dead || !s.game) return; if (document.hidden) { if (s.blur) s.blur(); s.game.loop.sleep(); } else s.game.loop.wake(); }; document.addEventListener('visibilitychange', s.visibility);
    }).catch(error => { lastError = String(error && error.message || error); if (s.dead) return; loading.textContent = 'The garden could not open: ' + lastError; console.error('[native garden]', error); });
  }
  function point(x, y) { const s = live; if (!s || !s.world) return null; return inRoom() ? GardenNativeRooms.point(x, y) : s.world.point(x, y); }
  function pick(x, y) {
    const s = live; if (!s || !s.world || inRoom()) return null;
    const p = s.world.point(x, y), W = GARDEN_WORLD, hit = s.world.pick(p.x * W.cellW, W.sky + p.y * W.cellH);
    let pet = null;
    if (typeof _ptwFreeHand === 'function' && _ptwFreeHand()) {
      for (const node of s.world.rootNode.querySelectorAll('.ptw')) {
        if (!node.target.visible) continue; const b = node.getBoundingClientRect(), depth = node.target.depth;
        if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom && (!hit || depth >= hit.depth) && (!pet || depth >= pet.depth)) {
          const transform = matrix(node._inner.getWorldTransformMatrix());
          if (Math.abs(transform.a * transform.d - transform.b * transform.c) < 1e-10) continue;
          const local = GardenNativeArt.point(GardenNativeArt.inverse(transform), p.x * W.cellW, W.sky + p.y * W.cellH);
          if (node.paintedHit(local.x, local.y)) pet = { kind: 'pet', node, depth };
        }
      }
    }
    if (pet) return pet;
    return hit ? { ...hit, uid: hit.uid || hit.model && hit.model.uid, prop: hit.kind === 'prop' ? hit.id : null, land: hit.kind === 'land' ? hit.land || hit.id : null, ground: !!(hit.model && hit.model.def && hit.model.def.layer === 'ground'), node: hit.record && hit.record.node || hit.node || null } : null;
  }
  function capture(frame) {
    const s = live; if (!s || !s.ready || inRoom()) return Promise.reject(new Error('The outdoor garden is not open.'));
    if (s.capturing) return Promise.reject(new Error('A garden photo is already being taken.'));
    return new Promise((resolve, reject) => {
      const size = { w: s.game.scale.width, h: s.game.scale.height }, cam = s.scene.cameras.main;
      const hidden = [s.world.uiNode.target, ...s.world.rootNode.querySelectorAll('.gd-needs,.gd-need-ground,.gd-locksign,.gd-pl-halo,.gll-name,.gll-say,.gll-fx').map(n => n.target), ...s.world.root.list.filter(n => n.depth === 89000)];
      const visible = new Map(hidden.map(object => [object, object.visible])); let ghost = null, settled = false;
      s.capturing = true; openingVisibility(s); for (const object of hidden) object.setVisible(false); s.host.style.visibility = 'hidden';
      const restore = () => {
        if (s.dead) return; if (ghost) ghost.remove();
        s.game.scale.resize(size.w, size.h); for (const [object, value] of visible) if (object.active) object.setVisible(value);
        s.world.resize(size.w, size.h); if (s.world.prepareRender) s.world.prepareRender(); GardenNativeArt.updateAll(s.scene, s.time || performance.now()); if (typeof petGardenVisualFrame === 'function') petGardenVisualFrame(s.time || performance.now()); let presentationEnvironment = null; if (s.surface) s.surface.update(s.time || performance.now(), 0, presentationEnvironment = s.lighting.environment()); if (s.water) s.water.update(s.time || performance.now(), 0, presentationEnvironment || s.lighting.environment());
        s.host.style.visibility = ''; s.capturing = false; openingVisibility(s);
      };
      const finish = (error, blob) => { if (settled) return; settled = true; clearTimeout(timer); restore(); if (error) reject(error); else resolve(blob); };
      const timer = setTimeout(() => finish(new Error('The garden photo took too long.')), 5000);
      try {
        const w = 1600, h = Math.round(frame.h * w / frame.w); s.game.scale.resize(w, h); cam.setZoom(w / frame.w).centerOn(frame.x + frame.w / 2, frame.y + frame.h / 2);
        if (typeof gardenPhotoGhost === 'function') ghost = gardenPhotoGhost(s.world.rootNode, frame);
        if (s.world.prepareRender) s.world.prepareRender(); GardenNativeArt.updateAll(s.scene, s.time || performance.now(), true); if (typeof petGardenVisualFrame === 'function') petGardenVisualFrame(s.time || performance.now()); s.lighting.update(s.time || performance.now(), 16); let presentationEnvironment = null; if (s.surface) s.surface.update(s.time || performance.now(), 0, presentationEnvironment = s.lighting.environment()); if (s.water) s.water.update(s.time || performance.now(), 0, presentationEnvironment || s.lighting.environment());
        s.game.renderer.snapshot(image => { if (settled) return; try { const parts = image.src.split(','); const bytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0)); finish(null, new Blob([bytes], { type: 'image/png' })); } catch (error) { finish(error); } }, 'image/png');
      } catch (error) { finish(error); }
    });
  }
  function destroy() {
    const s = live; if (!s) return;
    clearHover(s);
    if (typeof _fxS !== 'undefined' && _fxS.live) _fxS.live.stop(true);
    if (window.GardenNativeArt) GardenNativeArt.pauseAmbient({ hush: false, frozen: false });
    if (window.GardenNativeActions) GardenNativeActions.destroy();
    live = null; s.dead = true; if (typeof _gfs !== 'undefined') _gfs.ambientPaused = false;
    if (s.openingObserver) s.openingObserver.disconnect();
    if (s.stopShaderPreparation) s.stopShaderPreparation();
    if (s.resize) s.resize.disconnect(); if (s.visibility) document.removeEventListener('visibilitychange', s.visibility); if (s.blur) window.removeEventListener('blur', s.blur);
    if (s.hoverLeave && s.game) s.game.canvas.removeEventListener('pointerleave', s.hoverLeave);
    if (s.captureKey) { window.removeEventListener('keydown', s.captureKey, true); window.removeEventListener('keyup', s.captureKey, true); }
    roomEffects(s, false);
    if (window.GardenNativeRooms && GardenNativeRooms.current()) GardenNativeRooms.leave(); if (typeof _ptwStop === 'function') _ptwStop();
    if (s.frontier) s.frontier.destroy(); if (s.surface) s.surface.destroy(); if (s.water) s.water.destroy(); if (s.lighting) s.lighting.destroy(); if (s.world) s.world.destroy(); if (s.game) s.game.destroy(true); if (s.host) s.host.remove(); if (s.loading) s.loading.remove();
    _gw.on = false; _gw.svg = null; _gdp.svg = null; _gw.nativeWorld = null;
  }
  function status() { const s = live; return s ? { ready: s.ready, session: s.id, backend: 'phaser-native', native: true, roomsNative: true, compatibilityDom: false, frames: s.frames, loadMs: s.loadMs || performance.now() - s.started, syncs: { full: s.syncFull || 0, reused: s.syncReused || 0 }, shaderPreparation: s.shaderPreparation ? { ...s.shaderPreparation } : null, cachePreparation: s.cachePreparation ? { ...s.cachePreparation } : null, room: inRoom(), entities: s.scene ? GardenNativeArt.stats(s.scene) : null, world: s.world ? s.world.renderStats() : null, lighting: s.lighting ? s.lighting.status() : null, water: s.water ? s.water.status() : null, frontier: s.frontier ? s.frontier.status() : null, surface: s.surface ? s.surface.status() : null, lastError } : { ready: false, backend: 'none', lastError }; }
  function setAmbientPaused(state) { if (typeof _gfs !== 'undefined') _gfs.ambientPaused = !!(state && (state.hush || state.frozen)); if (!live) return; if (GardenNativeArt.pauseAmbient) GardenNativeArt.pauseAmbient(state); if (window.GardenNativeActions) GardenNativeActions.pauseAmbient(state); if (live.lighting && live.lighting.pauseAmbient) live.lighting.pauseAmbient(state); if (live.water && live.water.pauseAmbient) live.water.pauseAmbient(state); if (live.world && live.world.pauseAmbient) live.world.pauseAmbient(state); if (live.frontier) live.frontier.pauseAmbient(state); if (live.surface) live.surface.pauseAmbient(state); }
  function setPhotoFilter(filter) { if (live && live.host) live.host.style.filter = String(filter || ''); }
  function float(text, x, y) { if (!scene() || !text) return; const object = scene().add.text(x, y, String(text), { fontFamily: 'Inter, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#fff5cc', stroke: '#344130', strokeThickness: 3, resolution: 3 }).setOrigin(.5, 1).setDepth(91000); scene().tweens.add({ targets: object, y: y - 38, alpha: 0, duration: 1450, ease: 'Sine.easeOut', onComplete: () => object.destroy() }); }
  return { active, scene, root, world, wanted, mount, sync, point, pick, capture, destroy, status, enterRoom, leaveRoom, inRoom, animate, matrix, setAmbientPaused, setPhotoFilter, float, lighting: () => live && live.lighting, water: () => live && live.water, surface: () => live && live.surface };
})();
