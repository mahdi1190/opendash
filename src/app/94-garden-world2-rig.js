/* Actor art is prepared once as retained layers. CSS supplies the authored
 * keyframes; the game samples numeric tracks at display cadence afterwards. */
window.GardenPhaserRig = (function () {
  'use strict';
  const I = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  const TAU = Math.PI * 2;
  function mul(a, b) { return { a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b, c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d, e: a.a * b.e + a.c * b.f + a.e, f: a.b * b.e + a.d * b.f + a.f }; }
  function inv(m) { const d = m.a * m.d - m.b * m.c; return Math.abs(d) < 1e-9 ? I : { a: m.d / d, b: -m.b / d, c: -m.c / d, d: m.a / d, e: (m.c * m.f - m.d * m.e) / d, f: (m.b * m.e - m.a * m.f) / d }; }
  function plain(m) { return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }; }
  function around(m, x, y) { return { ...m, e: m.e + x - m.a * x - m.c * y, f: m.f + y - m.b * x - m.d * y }; }
  function matrixText(m) { return 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].join(',') + ')'; }
  function attributeMatrix(node) { let m = I; const list = node.transform && node.transform.baseVal; if (list) for (let i = 0; i < list.numberOfItems; i++) m = mul(m, list.getItem(i).matrix); return m; }
  function transform(value, box, css) {
    let text = String(value || 'none');
    for (let n = 0; n < 5 && text.includes('var('); n++) text = text.replace(/var\(\s*(--[-\w]+)\s*(?:,\s*([^()]*))?\)/g, (_, name, fallback) => css.getPropertyValue(name).trim() || fallback || '0');
    if (text === 'none') return { ...I, rotationHint: 0 };
    // Actor transforms use SVG user units. Resolve percentages against their
    // own reference box before DOMMatrix parses the numeric transform list.
    text = text.replace(/translate(X|Y)?\(([^()]*)\)/gi, (whole, axis, args) => {
      const values = args.trim().split(/\s*,\s*|\s+/).filter(Boolean); let valid = true;
      const converted = values.map((v, index) => { if (!v.endsWith('%')) return v; const size = axis && axis.toLowerCase() === 'y' || !axis && index === 1 ? box.height : box.width; const number = parseFloat(v); if (!Number.isFinite(number)) { valid = false; return v; } return number * size / 100 + 'px'; });
      return valid ? 'translate' + (axis || '') + '(' + converted.join(',') + ')' : whole;
    });
    try {
      const native = new DOMMatrix(text); if (!native.is2D || ![native.a, native.b, native.c, native.d, native.e, native.f].every(Number.isFinite)) return null;
      let rotationHint = 0;
      for (const match of text.matchAll(/rotate\(\s*([-+\d.e]+)(deg|rad|turn|grad)\s*\)/gi)) rotationHint += Number(match[1]) * ({ deg: Math.PI / 180, rad: 1, turn: TAU, grad: Math.PI / 200 }[match[2].toLowerCase()]);
      return { ...plain(native), rotationHint };
    } catch (e) { return null; }
  }
  function decompose(m) {
    const sx = Math.hypot(m.a, m.b);
    if (sx < 1e-8) return { x: m.e, y: m.f, angle: 0, sx: 0, sy: Math.hypot(m.c, m.d), skew: 0, direct: m };
    const ca = m.a / sx, sa = m.b / sx, projection = ca * m.c + sa * m.d, sy = (m.a * m.d - m.b * m.c) / sx;
    let angle = Math.atan2(sa, ca); if (Number.isFinite(m.rotationHint)) angle += Math.round((m.rotationHint - angle) / TAU) * TAU;
    return { x: m.e, y: m.f, angle, sx, sy, skew: Math.abs(sy) > 1e-8 ? projection / sy : 0 };
  }
  function interpolate(a, b, p) {
    const mix = (x, y) => x + (y - x) * p;
    if (a.direct || b.direct) { const x = a.direct || compose(a), y = b.direct || compose(b); return { a: mix(x.a, y.a), b: mix(x.b, y.b), c: mix(x.c, y.c), d: mix(x.d, y.d), e: mix(x.e, y.e), f: mix(x.f, y.f) }; }
    return compose({ x: mix(a.x, b.x), y: mix(a.y, b.y), angle: mix(a.angle, b.angle), sx: mix(a.sx, b.sx), sy: mix(a.sy, b.sy), skew: mix(a.skew, b.skew) });
  }
  function compose(v) { const c = Math.cos(v.angle), s = Math.sin(v.angle); return { a: c * v.sx, b: s * v.sx, c: (c * v.skew - s) * v.sy, d: (s * v.skew + c) * v.sy, e: v.x, f: v.y }; }
  const easings = new Map();
  function easing(value) {
    const name = String(value || 'linear').trim(); if (easings.has(name)) return easings.get(name);
    const presets = { ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] };
    const cubic = /^cubic-bezier\(([^)]+)\)$/.exec(name), steps = /^steps\(\s*(\d+)\s*(?:,\s*([\w-]+))?\s*\)$/.exec(name);
    let fn = p => p;
    if (name === 'step-start') fn = () => 1;
    else if (name === 'step-end') fn = p => p >= 1 ? 1 : 0;
    else if (steps) {
      const count = Math.max(1, Number(steps[1])), position = steps[2] || 'end';
      fn = p => { if (p >= 1) return 1; const step = Math.floor(Math.max(0, p) * count); return position === 'start' || position === 'jump-start' ? Math.min(1, (step + 1) / count) : position === 'jump-none' ? Math.min(1, step / Math.max(1, count - 1)) : position === 'jump-both' ? (step + 1) / (count + 1) : step / count; };
    } else {
      const points = presets[name] || cubic && cubic[1].split(',').map(Number);
      if (points && points.length === 4 && points.every(Number.isFinite)) {
        const [x1, y1, x2, y2] = points, curve = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t * t * t;
        fn = p => { if (p <= 0 || p >= 1) return p; let lo = 0, hi = 1, t = p; for (let i = 0; i < 12; i++) { if (curve(t, x1, x2) < p) lo = t; else hi = t; t = (lo + hi) / 2; } return curve(t, y1, y2); };
      }
    }
    easings.set(name, fn); return fn;
  }
  function frameTrack(frames, property, underlying, parse) {
    const track = [];
    for (const frame of frames) if (frame[property] != null) { const value = parse(frame[property]); if (value == null) return null; track.push({ offset: Number(frame.computedOffset == null ? frame.offset : frame.computedOffset), value, ease: easing(frame.easing) }); }
    if (!track.length) return [];
    if (!track.every(f => Number.isFinite(f.offset))) return null;
    track.sort((a, b) => a.offset - b.offset);
    if (track[0].offset > 0) track.unshift({ offset: 0, value: underlying, ease: easing('linear') });
    if (track[track.length - 1].offset < 1) track.push({ offset: 1, value: underlying, ease: easing('linear') });
    return track;
  }
  function position(track, p, blend) {
    if (track.length === 1 || p <= track[0].offset) return track[0].value;
    let i = 0; while (i < track.length - 2 && p >= track[i + 1].offset) i++;
    const a = track[i], b = track[i + 1], width = b.offset - a.offset;
    return blend(a.value, b.value, a.ease(width > 0 ? Math.max(0, Math.min(1, (p - a.offset) / width)) : 1));
  }
  function progress(effect, time) {
    let active = (time - effect.startedAt) * effect.rate + effect.initial - effect.delay;
    const total = effect.duration * effect.iterations, backwards = effect.fill === 'both' || effect.fill === 'backwards', forwards = effect.fill === 'both' || effect.fill === 'forwards';
    if (active < 0) { if (!backwards) return null; active = 0; }
    let ended = false;
    if (active >= total) { if (!forwards) return null; active = total; ended = true; }
    const overall = Math.max(0, active / effect.duration + effect.iterationStart), iteration = ended && Number.isInteger(overall) && overall > 0 ? overall - 1 : Math.floor(overall);
    let p = ended && Number.isInteger(overall) && overall > 0 ? 1 : overall - Math.floor(overall);
    if (effect.direction === 'reverse' || effect.direction === 'alternate' && iteration % 2 === 1 || effect.direction === 'alternate-reverse' && iteration % 2 === 0) p = 1 - p;
    return effect.ease(p);
  }
  function inspect(root) {
    if (!root || typeof root.getAnimations !== 'function') return new Map();
    const animations = root.getAnimations({ subtree: true }), grouped = new Map();
    for (const animation of animations) {
      const effect = animation.effect, node = effect && effect.target; if (!node || node !== root && !root.contains(node)) continue;
      let frames, timing; try { frames = effect.getKeyframes(); timing = effect.getTiming(); } catch (e) { continue; }
      if (!frames.some(f => f.transform != null || f.opacity != null)) continue;
      if (frames.some(f => f.composite && !['auto', 'replace'].includes(f.composite))) continue;
      const list = grouped.get(node) || []; list.push({ frames, timing, initial: Number(animation.currentTime) || 0, rate: Number(animation.playbackRate) || 1 }); grouped.set(node, list);
    }
    if (!grouped.size) return new Map();
    const nodes = [root, ...root.querySelectorAll('*')];
    // Stop cloned CSS before measuring the authored rest pose. No live node or
    // live Animation object is changed by compilation.
    for (const node of nodes) if (node.style) node.style.setProperty('animation', 'none', 'important');
    const normalized = new Map();
    for (const node of nodes) {
      if (!node.style || !node.transform) continue;
      const css = getComputedStyle(node); let box = { x: 0, y: 0, width: 0, height: 0 };
      if (grouped.has(node) || css.transformBox === 'fill-box') { try { box = node.getBBox(); } catch (e) { /* empty definition */ } }
      const values = String(css.transformOrigin || '0 0').split(/\s+/), fill = css.transformBox === 'fill-box';
      const origin = (raw, start, size) => String(raw).endsWith('%') ? start + (parseFloat(raw) || 0) * size / 100 : (fill ? start : 0) + (parseFloat(raw) || 0);
      const x = origin(values[0], box.x, box.width), y = origin(values[1], box.y, box.height), parsed = transform(css.transform, box, css), local = parsed ? around(parsed, x, y) : attributeMatrix(node);
      normalized.set(node, { css, box, x, y, local, raw: parsed || attributeMatrix(node), opacity: Math.max(0, Math.min(1, Number(css.opacity) || 0)) });
    }
    for (const [node, state] of normalized) {
      node.setAttribute('transform', matrixText(state.local)); node.style.transformOrigin = '0 0'; node.style.setProperty('transform', matrixText(state.local), 'important');
      node.style.translate = 'none'; node.style.rotate = 'none'; node.style.scale = 'none';
    }
    const motions = new Map(), startedAt = performance.now();
    for (const [node, entries] of grouped) {
      const state = normalized.get(node); if (!state) continue;
      const effects = []; let changesOpacity = false;
      for (const entry of entries) {
        const timing = entry.timing, duration = Number(timing.duration); if (!(duration > 0)) continue;
        const frames = entry.frames;
        const transforms = frameTrack(frames, 'transform', decompose(state.raw), value => { const m = transform(value, state.box, state.css); return m && decompose(m); });
        const opacities = frameTrack(frames, 'opacity', state.opacity, value => { const number = Number(value); return Number.isFinite(number) ? number : null; });
        if (!transforms || !opacities || !transforms.length && !opacities.length) continue;
        changesOpacity = changesOpacity || !!opacities.length;
        effects.push({ transforms, opacities, duration, delay: Number(timing.delay) || 0, iterations: timing.iterations === Infinity ? Infinity : Math.max(0, Number(timing.iterations) || 0), iterationStart: Number(timing.iterationStart) || 0, direction: timing.direction || 'normal', fill: timing.fill || 'none', ease: easing(timing.easing), initial: entry.initial, rate: entry.rate, startedAt });
      }
      if (!effects.length) continue;
      if (changesOpacity) { node.removeAttribute('opacity'); node.style.setProperty('opacity', '1', 'important'); }
      const neutralInverse = inv(state.local), motion = { kind: 'rig', periodMs: Math.max(...effects.map(e => e.duration)), startedAt, effects, neutralInverse, originX: state.x, originY: state.y, baseOpacity: state.opacity, changesOpacity, _time: NaN, _enabled: null, _sample: null };
      motion.sample = (time, enabled) => sample(motion, time, enabled);
      motions.set(node, motion);
    }
    return motions;
  }
  function sample(motion, time, enabled) {
    const on = enabled !== false;
    if (motion._time === time && motion._enabled === on) return motion._sample;
    let local = null, alpha = motion.changesOpacity ? motion.baseOpacity : 1;
    if (on) for (const effect of motion.effects) {
      const p = progress(effect, time); if (p == null) continue;
      if (effect.transforms.length) local = position(effect.transforms, p, interpolate);
      if (effect.opacities.length) alpha = position(effect.opacities, p, (a, b, q) => a + (b - a) * q);
    }
    motion._time = time; motion._enabled = on;
    return motion._sample = { matrix: local ? mul(motion.neutralInverse, around(local, motion.originX, motion.originY)) : I, alpha: Math.max(0, Math.min(1, alpha)) };
  }
  function viewportMatrix(node) {
    if (!node || node.localName !== 'svg') return I;
    const length = name => { try { return Number(node[name].baseVal.value) || 0; } catch (e) { return Number(node.getAttribute(name)) || 0; } };
    const x = length('x'), y = length('y'), width = length('width'), height = length('height'), vb = node.viewBox && node.viewBox.baseVal;
    if (!vb || !(vb.width > 0 && vb.height > 0 && width > 0 && height > 0)) return { ...I, e: x, f: y };
    let sx = width / vb.width, sy = height / vb.height, dx = 0, dy = 0;
    const aspect = node.preserveAspectRatio && node.preserveAspectRatio.baseVal, align = aspect ? aspect.align : 6;
    if (align !== 1) {
      sx = sy = aspect && aspect.meetOrSlice === 2 ? Math.max(sx, sy) : Math.min(sx, sy);
      const column = Math.max(0, align - 2) % 3, row = Math.floor(Math.max(0, align - 2) / 3);
      dx = (width - vb.width * sx) * column / 2; dy = (height - vb.height * sy) * row / 2;
    }
    return { a: sx, b: 0, c: 0, d: sy, e: x + dx - vb.x * sx, f: y + dy - vb.y * sy };
  }
  return Object.freeze({ inspect, sample, viewportMatrix });
})();
