/* Fishing reflections are retained native vector commands. Bodies use the
 * bounded Water snapshot cache; a changing line never needs a texture bake. */
window.GardenNativeFishingReflections = (function () {
  'use strict';
  const number = value => Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0;
  function visible(object) {
    for (let p = object; p; p = p.parentContainer) if (!p.active || p.alpha === 0 || p.visible === false && !(p._nativeCacheHiddenBy && (!p._nativeNode || p._nativeNode._computedVisible !== false))) return false;
    return true;
  }
  function paint(value, fallback) {
    value = String(value || '').trim(); if (!value || value === 'none' || value === 'transparent') return null;
    if (value[0] === '#') { let hex = value.slice(1); if (hex.length < 5) hex = [...hex].map(c => c + c).join(''); return { color: parseInt(hex.slice(0, 6), 16), alpha: hex.length > 6 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 }; }
    const rgb = /^rgba?\(([^)]+)\)/.exec(value); if (rgb) { const v = rgb[1].split(/[ ,/]+/).map(number); return { color: (v[0] << 16) | (v[1] << 8) | v[2], alpha: v[3] == null ? 1 : v[3] }; }
    return { color: ({ white: 0xffffff, black: 0, red: 0xff0000, gold: 0xffd700, purple: 0x800080 }[value] == null ? fallback : { white: 0xffffff, black: 0, red: 0xff0000, gold: 0xffd700, purple: 0x800080 }[value]), alpha: 1 };
  }
  function create(scene, options) {
    const graphics = scene.add.graphics().setDepth(100000), records = new Map(); options.parent.add(graphics);
    let diagnostics = [], segments = 0, triangles = 0, rippleBands = 0, distortedSegments = 0, maxDrift = 0;
    const ripple = { clock: 0, strength: 0, motion: false, step: 6, ready: false };
    const depthAt = (y, plane, height) => Math.max(0, Math.min(1, (y - plane) / Math.max(1, height)));
    const fadeAt = (y, plane, height) => .44 + .56 * (1 - depthAt(y, plane, height)) ** .8;
    function driftAt(y, plane, height) {
      if (!ripple.motion || y <= plane) return 0;
      // A continuous world-space field keeps adjacent skin triangles and the
      // line joined. Its clock/strength match the body reflection bands. Ease
      // into the water so the float's exact contact point never slides away.
      return Math.sin(ripple.clock + y * .11) * ripple.strength * (.2 + depthAt(y, plane, height)) * Math.min(1, (y - plane) / 3);
    }
    const transform = (m, p) => ({ x: m.a * p.x + m.c * p.y + (m.tx == null ? m.e || 0 : m.tx), y: m.b * p.x + m.d * p.y + (m.ty == null ? m.f || 0 : m.ty) });
    function clippedSegment(a, b, color, width, alpha, plane, height) {
      drawLineSection(a, b, plane, plane, color, width, alpha, height);
    }
    function drawLineSection(a, b, planeA, planeB, color, width, alpha, height) {
      const depthA = a.y - planeA, depthB = b.y - planeB;
      if (depthA < 0 && depthB < 0) return;
      if (depthA < 0 || depthB < 0) { const t = depthA / (depthA - depthB), plane = planeA + (planeB - planeA) * t, point = { x: a.x + (b.x - a.x) * t, y: plane }; if (depthA < 0) { a = point; planeA = plane; } else { b = point; planeB = plane; } }
      // Subdivide only long strokes; already tessellated fishing lines usually
      // need one section. The fixed cap also bounds oversized equipped skins.
      const count = Math.min(16, Math.max(1, Math.ceil(Math.abs(b.y - a.y) / Math.max(ripple.step, height / 15))));
      let previous = { x: a.x + driftAt(a.y, planeA, height), y: a.y }, previousPlane = planeA;
      for (let i = 1; i <= count; i++) {
        const t = i / count, y = a.y + (b.y - a.y) * t, plane = planeA + (planeB - planeA) * t, drift = driftAt(y, plane, height), next = { x: a.x + (b.x - a.x) * t + drift, y };
        maxDrift = Math.max(maxDrift, Math.abs(drift));
        graphics.lineStyle(width, color, alpha * fadeAt((previous.y + y) / 2, (previousPlane + plane) / 2, height));
        options.clipLine(previous, next, (x, yy, xx, yyy) => { graphics.lineBetween(x, yy, xx, yyy); segments++; if (ripple.motion && Math.abs(drift) > .001) distortedSegments++; });
        previous = next; previousPlane = plane;
      }
    }
    function clipRect(points, left, top, right, bottom) {
      let out = points;
      for (const [axis, edge, sign] of [['x', left, 1], ['x', right, -1], ['y', top, 1], ['y', bottom, -1]]) {
        const next = []; if (!out.length) return next;
        let previous = out[out.length - 1], was = (previous[axis] - edge) * sign >= -1e-8;
        for (const p of out) { const inside = (p[axis] - edge) * sign >= -1e-8; if (inside !== was) { const k = (edge - previous[axis]) / (p[axis] - previous[axis]); next.push({ x: previous.x + (p.x - previous.x) * k, y: previous.y + (p.y - previous.y) * k }); } if (inside) next.push(p); previous = p; was = inside; }
        out = next;
      }
      return out;
    }
    function filledTriangle(points, color, alpha, plane, height, view) {
      const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x)), top = Math.max(plane, Math.min(...points.map(p => p.y))), bottom = Math.max(...points.map(p => p.y));
      const margin = Math.abs(ripple.strength) * 1.2;
      if (bottom <= top || right + margin < view.x || left - margin > view.x + view.width || bottom < view.y || top > view.y + view.height) return;
      const step = Math.max(ripple.step, height / 15);
      const intersection = (a, b) => { const out = []; for (const x of a) for (const yy of b) { const lo = Math.max(x[0], yy[0]), hi = Math.min(x[1], yy[1]); if (hi > lo) out.push([lo, hi]); } return out; };
      let y = top;
      while (y < bottom) {
        const end = Math.min(bottom, (Math.floor(y / step + 1e-7) + 1) * step), e = Math.min(.02, (end - y) * .1), band = clipRect(points, left, y, right, end);
        let bandLeft = Infinity, bandRight = -Infinity;
        const startDrift = driftAt(y, plane, height), endDrift = driftAt(end, plane, height);
        maxDrift = Math.max(maxDrift, Math.abs(startDrift), Math.abs(endDrift));
        for (let i = 0; i < band.length; i++) { const p = band[i], drift = startDrift + (endDrift - startDrift) * (p.y - y) / (end - y); band[i] = { x: p.x + drift, y: p.y }; bandLeft = Math.min(bandLeft, band[i].x); bandRight = Math.max(bandRight, band[i].x); }
        if (band.length >= 3 && bandRight > bandLeft) {
          let spans = options.intervals((y + end) / 2, bandLeft, bandRight, true); spans = intersection(spans, options.intervals(y + e, bandLeft, bandRight, true)); spans = intersection(spans, options.intervals(end - e, bandLeft, bandRight, true));
          for (const span of spans) { const polygon = clipRect(band, span[0], y, span[1], end); if (polygon.length < 3) continue; rippleBands++; graphics.fillStyle(color, alpha * fadeAt((y + end) / 2, plane, height)); for (let i = 2; i < polygon.length; i++) { graphics.fillTriangle(polygon[0].x, polygon[0].y, polygon[i - 1].x, polygon[i - 1].y, polygon[i].x, polygon[i].y); triangles++; } }
        }
        y = end;
      }
    }
    function floatCommands(node) {
      const commands = [];
      const walk = n => {
        if (!n || commands.length >= 48) return;
        const a = n.attrs || {}, tag = n.localName; let contours = [];
        if (['defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'filter', 'style'].includes(tag)) return;
        if (tag === 'path') contours = GardenNativeArt.parsePath(a.d);
        else if (tag === 'ellipse' || tag === 'circle') { const rx = number(a.rx || a.r), ry = number(a.ry || a.r), cx = number(a.cx), cy = number(a.cy); contours = [{ closed: true, points: Array.from({ length: 16 }, (_, i) => ({ x: cx + Math.cos(i / 16 * Math.PI * 2) * rx, y: cy + Math.sin(i / 16 * Math.PI * 2) * ry })) }]; }
        else if (tag === 'rect') { const x = number(a.x), y = number(a.y), w = number(a.width), h = number(a.height); contours = [{ closed: true, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] }]; }
        const style = n._styles || a, fill = paint(style.fill || a.fill, 0xd8452a), stroke = paint(style.stroke || a.stroke, 0xdce8dc);
        for (const contour of contours) {
          const points = contour.points; if (points.length < 2) continue;
          commands.push({ node: n, points, world: points.map(() => ({ x: 0, y: 0 })), indices: fill && points.length > 2 ? Phaser.Geom.Polygon.Earcut(points.flatMap(p => [p.x, p.y]), null, 2) : null, fill, stroke, width: number(style['stroke-width'] || a['stroke-width']) || 1, fillAlpha: style['fill-opacity'] == null ? 1 : number(style['fill-opacity']), strokeAlpha: style['stroke-opacity'] == null ? 1 : number(style['stroke-opacity']), closed: contour.closed });
        }
        for (const child of n.children || []) walk(child);
      };
      walk(node); return commands;
    }
    function pathNumbers(node) { return (String(node && node.getAttribute('d') || '').match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number); }
    function drawCommands(commands, plane, view, alpha) {
      let height = 1;
      for (const command of commands) {
        command.drawn = !!command.node.target && visible(command.node.target); if (!command.drawn) continue;
        let opacity = 1; for (let object = command.node.target; object; object = object.parentContainer) opacity *= object.alpha == null ? 1 : object.alpha;
        command.opacity = opacity;
        const matrix = command.node.target.getWorldTransformMatrix();
        for (let i = 0; i < command.points.length; i++) { const p = command.points[i], point = command.world[i]; point.x = matrix.a * p.x + matrix.c * p.y + (matrix.tx == null ? matrix.e || 0 : matrix.tx); point.y = plane * 2 - (matrix.b * p.x + matrix.d * p.y + (matrix.ty == null ? matrix.f || 0 : matrix.ty)); height = Math.max(height, point.y - plane); }
      }
      for (const command of commands) {
        if (!command.drawn) continue; const points = command.world, opacity = command.opacity;
        if (command.fill && command.indices) for (let i = 0; i < command.indices.length; i += 3) filledTriangle([points[command.indices[i]], points[command.indices[i + 1]], points[command.indices[i + 2]]], command.fill.color, alpha * opacity * command.fill.alpha * command.fillAlpha, plane, height, view);
        if (command.stroke) { for (let i = 1; i < points.length; i++) clippedSegment(points[i - 1], points[i], command.stroke.color, command.width, alpha * opacity * command.stroke.alpha * command.strokeAlpha, plane, height); if (command.closed) clippedSegment(points[points.length - 1], points[0], command.stroke.color, command.width, alpha * opacity * command.stroke.alpha * command.strokeAlpha, plane, height); }
      }
    }
    function update(rows, view, environment, time, motion) {
      graphics.clear(); diagnostics = []; segments = 0; triangles = 0; rippleBands = 0; distortedSegments = 0; maxDrift = 0;
      const clock = number(time) / 1000 * .9;
      // Water passes its frozen ambient clock during hush. Freeze wind strength
      // with it, even if the lighting environment still updates its gust value.
      if (!ripple.ready || clock !== ripple.clock || ripple.motion !== !!motion) ripple.strength = (environment.windX == null ? 1 : number(environment.windX)) * .45 + number(environment.gust) * .6 + .35;
      ripple.clock = clock; ripple.motion = !!motion; ripple.ready = true; ripple.step = Math.max(2 / Math.max(.3, view.zoom), 6);
      const keep = new Set(), alpha = .32 * (.85 + Math.max(0, Math.min(1, number(environment.daylight))) * .15);
      for (const row of (rows || []).slice(0, 8)) {
        if (!row || !row.rod || !row.line || !row.bob || !row.rod.target || !row.line.target || !row.bob.target || !visible(row.rod.target)) continue;
        keep.add(row.id); let record = records.get(row.id); if (!record || record.node !== row.bob || record.first !== row.bob.firstChild || record.count !== row.bob.children.length) { record = { node: row.bob, first: row.bob.firstChild, count: row.bob.children.length, commands: floatCommands(row.bob) }; records.set(row.id, record); }
        if (record.skin !== row.rodSkin) { record.skin = row.rodSkin; record.skinCommands = row.rodSkin ? floatCommands(row.rodSkin) : []; }
        const before = segments + triangles, beforeBands = rippleBands, beforeDistorted = distortedSegments, foot = number(row.footY), water = number(row.waterY), plane = Number.isFinite(row.floatPlaneY) ? row.floatPlaneY : water, rodValues = pathNumbers(row.rod), lineValues = pathNumbers(row.line), rodMatrix = row.rod.target.getWorldTransformMatrix(), lineMatrix = row.line.target.getWorldTransformMatrix();
        const mirror = (p, ground) => ({ x: p.x, y: ground * 2 - p.y }), rodPaint = paint(row.rod._styles && row.rod._styles.stroke, 0x806143), rodWidth = number(row.rod._styles && row.rod._styles['stroke-width']) || 2.2;
        const rodOpacity = row.rod._styles && row.rod._styles['stroke-opacity'];
        let rodHeight = 1;
        if (rodValues.length >= 4) { const a = mirror(transform(rodMatrix, { x: rodValues[0], y: rodValues[1] }), foot), b = mirror(transform(rodMatrix, { x: rodValues[2], y: rodValues[3] }), foot); rodHeight = Math.max(1, a.y - foot, b.y - foot); if (rodPaint && (rodOpacity == null || number(rodOpacity) > 0)) clippedSegment(a, b, rodPaint.color, rodWidth, alpha * .95, foot, rodHeight); }
        if (record.skin && visible(record.skin.target)) drawCommands(record.skinCommands, foot, view, alpha);
        if (lineValues.length >= 6 && visible(row.line.target)) {
          const a = transform(lineMatrix, { x: lineValues[0], y: lineValues[1] }), b = transform(lineMatrix, { x: lineValues[2], y: lineValues[3] }), c = transform(lineMatrix, { x: lineValues[4], y: lineValues[5] }), color = paint(row.line._styles && row.line._styles.stroke, 0xe1e9d8), count = Math.min(24, Math.max(10, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) * view.zoom / 28))); let previous = mirror(a, foot), previousPlane = foot;
          if (color) for (let i = 1; i <= count; i++) { const t = i / count, u = 1 - t, ground = foot + (plane - foot) * t, next = mirror({ x: u * u * a.x + 2 * t * u * b.x + t * t * c.x, y: u * u * a.y + 2 * t * u * b.y + t * t * c.y }, ground); drawLineSection(previous, next, previousPlane, ground, color.color, number(row.line._styles && row.line._styles['stroke-width']) || .85, alpha * .8, rodHeight); previous = next; previousPlane = ground; }
        }
        if (visible(row.bob.target)) drawCommands(record.commands, plane, view, alpha);
        diagnostics.push({ id: row.id, drawn: segments + triangles > before, segments: segments + triangles - before, bands: rippleBands - beforeBands, distortedSegments: distortedSegments - beforeDistorted, motion: ripple.motion, footY: foot, waterY: water, floatPlaneY: plane });
      }
      for (const key of records.keys()) if (!keep.has(key)) records.delete(key);
    }
    return { update, clear() { graphics.clear(); diagnostics = []; segments = 0; triangles = 0; rippleBands = 0; distortedSegments = 0; maxDrift = 0; ripple.motion = false; ripple.ready = false; }, status: () => ({ rigs: diagnostics, rigSegments: segments, rigTriangles: triangles, rigRippleBands: rippleBands, rigDistortedSegments: distortedSegments, rigMaxDrift: maxDrift, rigMotion: ripple.motion, rigRippleTime: ripple.clock / .9 }), destroy() { records.clear(); graphics.destroy(); } };
  }
  return Object.freeze({ create });
})();
