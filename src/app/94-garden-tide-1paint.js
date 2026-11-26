/* ============================================================
   THE TIDE, DRAWN (GardenPaintTide). Called by the painted nature's front door (94-garden-paint-nature.js) with the water, the
   woods and the vale: paint() after the ground is drawn, tick() once a frame with the camera's world rectangle, clear().

   ONE SHADER OVER ONE FLOOD FIELD, the way the water's depth plane is drawn (94-garden-native-water-depth.js): the field
   (94-garden-tide-0rules.js, how high each 6 px of the shore stands above low water, its kind of shore) is baked once per
   layout into a 768 x 505 texture (1.55 MB) in short slices, uploaded once, and never re-baked for the hour or the season:
   the waterline, the wet line, the time and the colours are uniforms.
     under the water   clear shallows over the sand, deeper and greener out to the drop-off, weed over rock, silt over mud,
                       soft light rolling in towards the shore, a thin bright edge where it ends (the live swash draws its
                       foam over that edge when you are close: 94-garden-paint-vale-1harbour.js rides it on the tide)
     the wet band      sand the falling tide has just left: darker, with the sky caught in it
     low water         ripple marks on the lower sand
   Over the vale's ground (-9346) and its swash, under every standing thing, every shadow and every figure.
   Wading: rings round the feet of anyone standing in the tide (one Graphics, near the camera, at most 30 times a second).
   Other tide modules hang their own layers here (GardenPaintTide.parts: glints, the pools' stones): {id, paint(scene, root,
   info), tick(time, view, T), clear()}.
   Nothing runs at load; nothing runs while the garden is hidden (the world's loop stops).
   ============================================================ */
window.GardenPaintTide = (function () {
  'use strict';
  const DEPTH = -9345.8, RING_DEPTH = -9345.3, KEY = '__garden-tide-field';
  const FRAG = `
#pragma phaserTemplate(shaderName)
#pragma phaserTemplate(extensions)
#pragma phaserTemplate(features)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#pragma phaserTemplate(fragmentDefine)
varying vec2 outTexCoord;
uniform sampler2D uMask;
uniform vec4 uField;
uniform vec2 uMaskSize;
uniform vec4 uTide;
uniform vec4 uLook;
uniform vec3 uEdge;
uniform vec3 uShoal;
uniform vec3 uWet;
uniform vec3 uSky;
uniform vec3 uFoam;
uniform vec3 uWeed;
uniform vec3 uSilt;
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)
float wave(vec2 p) { return sin(p.x * 0.021 + sin(p.y * 0.033) * 1.7) * sin(p.y * 0.029 - sin(p.x * 0.017) * 1.3); }
void main () {
  vec2 wp = vec2(uField.x + outTexCoord.x * uField.z, uField.y + (1.0 - outTexCoord.y) * uField.w);
  vec2 uv = vec2(wp.x / uMaskSize.x, 1.0 - wp.y / uMaskSize.y);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 m = texture2D(uMask, uv);
  float h = m.r * 127.5 - 24.0;
  float line = uTide.x, wet = uTide.y, t = uTide.z;
  if (h > max(line, wet) + 2.0 && (uTide.w < 0.01 || h > 36.0)) discard;
  float rocky = m.g, mud = m.b;
  float n = wave(wp) * 0.5 + 0.5;
  float n2 = wave(wp * 2.3 + vec2(31.0, 17.0)) * 0.5 + 0.5;
  float d = line - h;
  vec4 col = vec4(0.0);
  if (d > 0.0) {
    // under the water: clear over the sand at the edge, the shoal's green-blue out to the drop-off
    float s = smoothstep(0.0, 40.0, d);
    vec3 water = mix(uEdge, uShoal, s * 0.92);
    water = mix(water, uWeed, rocky * (0.18 + 0.32 * s) * (0.7 + 0.6 * n));
    water = mix(water, mix(uShoal * 0.9, uSilt, 0.3), mud * (0.3 + 0.5 * s));   // (over the mud by a river mouth: the river's own green-brown, not a pale film)
    // the light on it: soft bands rolling in towards the shore, broken by the swell
    float band = sin(h * 0.27 + t * 1.15 + n * 5.0 + n2 * 2.0);
    float glint = smoothstep(0.8, 1.0, band) * (0.3 + 0.7 * n2) * (1.0 - s * 0.45);
    water = mix(water, uSky, glint * uLook.w);
    float a = (0.16 + 0.54 * s) * uLook.z;
    // where it ends: a thin bright line of wet light (the swash's foam rides it when you are close)
    float rim = 1.0 - smoothstep(0.0, 3.5, d);
    float lace = rim * (0.55 + 0.45 * sin(wp.x * 0.09 + wp.y * 0.05 + t * 1.7 + n * 6.0));
    water = mix(water, uFoam, lace * 0.6 * uLook.x);
    a = max(a, lace * 0.45 * uLook.x * uLook.z);
    // out past the authored coast the painted sea is the water
    a *= smoothstep(-22.0, -4.0, h);
    col = vec4(water * a, a);
  } else if (h < wet + 1.5) {
    // the wet band behind a falling tide: darker sand, the sky caught in it here and there
    float k = 1.0 - smoothstep(line, wet + 1.5, h);
    float a = (0.08 + 0.22 * k) * uLook.z;
    vec3 c = mix(uWet, uWet * 0.8, rocky);
    float sheen = smoothstep(0.58, 0.9, n) * k * (1.0 - rocky * 0.6);
    c = mix(c, uSky, sheen * 0.6);
    a += sheen * 0.1 * uLook.z;
    col = vec4(c * a, a);
  }
  if (uTide.w > 0.0 && d <= 0.0 && h > 2.0 && h < 36.0) {
    // ripple marks the water left on the lower sand at low water
    float r = sin(h * 0.92 + n * 6.0 + n2 * 2.5);
    float mark = smoothstep(0.84, 1.0, r) * (1.0 - smoothstep(16.0, 36.0, h)) * uTide.w * (1.0 - rocky) * (1.0 - mud);
    float a = mark * 0.16 * uLook.z;
    col = vec4(col.rgb + uWet * 0.62 * a * (1.0 - col.a), col.a + a * (1.0 - col.a));
  }
  if (col.a < 0.004) discard;
  vec4 fragColor = col;
  #pragma phaserTemplate(fragmentProcess)
  gl_FragColor = fragColor;
}`;
  // colours by the time of day (the light module grades the whole view over this) and season: the painted sea's own shallows
  const PAL = {
    day: { edge: '#d2e6d6', shoal: '#86c4b4', wet: '#8f7a52', sky: '#e2f0ee', foam: '#fbfdf6', weed: '#5c7a50', silt: '#a8986e' },
    dawn: { edge: '#d6e4d6', shoal: '#8ac2b4', wet: '#8c7652', sky: '#f6e2d0', foam: '#fbf6ee', weed: '#5c7650', silt: '#a8966e' },
    dusk: { edge: '#d4e2d2', shoal: '#88c0b2', wet: '#8a7250', sky: '#f8d0a8', foam: '#f8f0e4', weed: '#5a7450', silt: '#a4926a' },
    night: { edge: '#5e6a5a', shoal: '#42544a', wet: '#3a3628', sky: '#8a948e', foam: '#b9c6ca', weed: '#2e3c2a', silt: '#4c4838' },
  };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const mixHex = (a, b, t) => { const A = rgb(a), B = rgb(b); return A.map((v, i) => v + (B[i] - v) * t); };
  const parts = [];
  let S = null, lastError = null, uploaded = null, builds = 0, worstStep = 0, worstTick = 0;
  const ok = (f) => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  function wanted() { return !!(window.GardenTide && typeof gardenIslandActive === 'function' && gardenIslandActive() && !window.__gptOff); }
  /** Paint the tide. info: { W, data, season, tod }. root: the world's root layer (the vale's ground is at -9346). */
  function paint(scene, root, info, objects) {
    clear();
    if (!wanted() || !scene || !root) return null;
    const tod = info && info.tod || 'day', season = info && info.season || 'summer', P = Object.assign({}, PAL[tod] || PAL.day);
    if (season === 'winter' && tod !== 'night') { P.edge = '#dce8e4'; P.shoal = '#9cc6c4'; P.sky = '#eef4f4'; }
    S = { scene, root, objects: objects || null, tod, season, shader: null, rings: null, ringT: 0, visT: 0, vis: false, live: true,
      field4: [0, 0, 1, 1], size2: [1, 1], tide4: [0, 0, 0, 0], look4: [1, tod === 'night' ? 1 : 0, tod === 'night' ? .85 : 1, tod === 'night' ? .25 : .5],
      edge: mixHex(P.edge, P.edge, 0), shoal: rgb(P.shoal), wet: rgb(P.wet), sky: rgb(P.sky), foam: rgb(P.foam), weed: rgb(P.weed), silt: rgb(P.silt), info, t0: 0 };
    for (const p of parts) ok(() => p.paint && p.paint(scene, root, info, objects));
    return { destroy: clear };
  }
  /** The field as a texture: red the flood height, green rocky, blue mud. Made once per layout (kept across repaints). */
  function upload(scene, F) {
    if (uploaded && uploaded.rev === F.rev && uploaded.lay === F.lay && scene.textures.exists(KEY)) return true;
    const t0 = performance.now();
    if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    const tex = scene.textures.createCanvas(KEY, F.FW, F.FH); if (!tex) return false;
    const img = tex.context.createImageData(F.FW, F.FH), px = img.data;
    for (let i = 0, n = F.FW * F.FH; i < n; i++) { const o = i * 4, k = F.K[i]; px[o] = F.H[i]; px[o + 1] = k === 2 ? 255 : 0; px[o + 2] = k === 3 ? 255 : 0; px[o + 3] = 255; }
    tex.context.putImageData(img, 0, 0); tex.refresh();
    uploaded = { rev: F.rev, lay: F.lay, bytes: F.FW * F.FH * 4, ms: Math.round(performance.now() - t0) }; builds++;
    return true;
  }
  function makeShader() {
    const F = GardenTide.field(); if (!F || !F.bounds || !S) return false;
    const scene = S.scene, W = GARDEN_WORLD, b = F.bounds;
    S.field4[0] = b.x; S.field4[1] = b.y; S.field4[2] = b.w; S.field4[3] = b.h; S.size2[0] = F.FW * F.P; S.size2[1] = F.FH * F.P;
    const me = S;
    S.shader = scene.add.shader({ name: 'GardenTide', fragmentSource: FRAG, setupUniforms(set) { set('uMask', 0); set('uField', me.field4); set('uMaskSize', me.size2); set('uTide', me.tide4); set('uLook', me.look4); set('uEdge', me.edge); set('uShoal', me.shoal); set('uWet', me.wet); set('uSky', me.sky); set('uFoam', me.foam); set('uWeed', me.weed); set('uSilt', me.silt); } }, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, [KEY]);
    S.shader.setDepth(DEPTH); S.root.add(S.shader); S.shader.setVisible(false);
    if (S.root.sort) S.root.sort('depth');
    S.rings = scene.add.graphics().setDepth(RING_DEPTH); S.root.add(S.rings); if (S.root.sort) S.root.sort('depth');
    void W; return true;
  }
  /** Each frame: the field is worked on (a few ms between frames until it is ready), then the uniforms and the wading rings. */
  function tick(time, view) {
    if (!S || !view) return;
    const t0 = performance.now();
    if (!S.shader) {
      if (!GardenTide.ready()) { const room = typeof gardenBakeRoom === 'function' ? gardenBakeRoom(4) : 4; ok(() => GardenTide.step(Math.max(1, Math.min(4, room)))); worstStep = Math.max(worstStep, performance.now() - t0); if (typeof gardenBakeSpent === 'function') gardenBakeSpent(performance.now() - t0); return; }
      if (!S.upAt) { S.upAt = time; return; }   // (the upload on a frame of its own)
      const F = GardenTide.field(); if (!ok(() => upload(S.scene, F)) || !ok(makeShader)) { S.shader = S.shader || null; return; }
    }
    const T = GardenTide.now(), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
    S.tide4[0] = T.line; S.tide4[1] = T.wet; S.tide4[2] = motion ? (time / 1000) % 3600 : 0; S.tide4[3] = T.level < .3 ? 1 - T.level / .3 : 0;
    const cam = S.scene.cameras && S.scene.cameras.main, z = cam ? cam.zoom : 1;
    S.look4[0] = z >= 1.2 ? .4 : 1;   // (close up the live swash draws the foam; further out this edge is the water's line)
    // only when a stretch of shore with any tide is in view
    if (time - S.visT > 300) { S.visT = time; const F = GardenTide.field(); let vis = false; if (F) { const x0 = Math.floor(view.x / 256), x1 = Math.floor((view.x + view.w) / 256), y0 = Math.floor(view.y / 256), y1 = Math.floor((view.y + view.h) / 256); for (let y = y0; y <= y1 && !vis; y++) for (let x = x0; x <= x1; x++) if (F.chunks.has(x + ',' + y)) { vis = true; break; } } if (vis !== S.vis) { S.vis = vis; S.shader.setVisible(vis); if (!vis && S.rings) S.rings.clear(); } }
    if (S.vis) ok(() => wade(time, view, T, z, motion));
    for (const p of parts) if (p.tick) ok(() => p.tick(time, view, T, S.vis));
    worstTick = Math.max(worstTick, performance.now() - t0);
  }
  /* ---------- wading: rings round the feet of anyone standing in the tide ---------- */
  const feet = new Map();
  function wade(time, view, T, z, motion) {
    const g = S.rings; if (!g) return;
    if (z < .9 || T.line < 3) { if (S.ringOn) { g.clear(); S.ringOn = false; } return; }
    if (time - S.ringT < 33) return; S.ringT = time;
    let rows = null; try { const w = window.GardenNative && GardenNative.world(); rows = w && w.effectsState ? w.effectsState().actors : null; } catch (e) { rows = null; }
    g.clear(); S.ringOn = false; if (!rows || !rows.length) return;
    const W = GARDEN_WORLD, t = time / 1000;
    for (const a of rows) {
      if (!a || (a.kind !== 'actor' && a.kind !== 'pet') || (a.lift || 0) > 4) continue;
      const x = a.groundX != null ? a.groundX : a.x, y = a.groundY != null ? a.groundY : a.y;
      if (x < view.x - 40 || x > view.x + view.w + 40 || y < view.y - 40 || y > view.y + view.h + 40) continue;
      const h = GardenTide.h(x / W.cellW, (y - W.sky) / W.cellH), d = T.line - h; if (!(d > 1.5) || !Number.isFinite(h) || h < 0) continue;   // (only on the sand the tide covers: a swimmer or a boat out in the sea has its own water)
      const k = Math.min(1, d / 18), rx = (a.kind === 'pet' ? Math.max(8, (a.w || 20) * .55) : 11) * (.8 + .4 * k), ry = rx * .3;
      let f = feet.get(a.id); if (!f) { if (feet.size > 40) feet.clear(); feet.set(a.id, f = { x, y, rings: [], at: 0 }); }
      const moved = Math.hypot(x - f.x, y - f.y); f.x = x; f.y = y;
      // a ring stays at the feet; walking sends rings out behind
      if (motion && (a.moving || moved > .3) && t - f.at > .28 && f.rings.length < 4) { f.at = t; f.rings.push({ x, y, t0: t }); }
      g.fillStyle(0xffffff, .16 * (.5 + k * .5)).fillEllipse(x, y + .5, rx * 2.1, ry * 2.1);
      g.lineStyle(1.2, 0xffffff, .55 * (.5 + k * .5)).strokeEllipse(x, y, rx * 2, ry * 2);
      for (let i = f.rings.length - 1; i >= 0; i--) { const r = f.rings[i], u = (t - r.t0) / 1.1; if (u >= 1) { f.rings.splice(i, 1); continue; } g.lineStyle(1, 0xffffff, .45 * (1 - u)).strokeEllipse(r.x, r.y, rx * 2 * (1 + u * 1.4), ry * 2 * (1 + u * 1.4)); }
      S.ringOn = true;
    }
  }
  function clear() {
    if (!S) return; const s = S; S = null;
    for (const p of parts) ok(() => p.clear && p.clear());
    if (s.shader) ok(() => s.shader.destroy());
    if (s.rings) ok(() => s.rings.destroy());
    feet.clear();
  }
  function status() {
    const F = window.GardenTide && GardenTide.field(), T = window.GardenTide ? GardenTide.now() : null;
    return { on: !!S, shader: !!(S && S.shader), visible: !!(S && S.vis), fieldMs: F ? F.ms : null, fieldRev: F ? F.rev : 0, textureBytes: uploaded ? uploaded.bytes : 0, uploadMs: uploaded ? uploaded.ms : null, builds, worstStepMs: +worstStep.toFixed(1), worstTickMs: +worstTick.toFixed(1), line: T ? +T.line.toFixed(1) : null, level: T ? +T.level.toFixed(2) : null, parts: parts.map(p => p.id), lastError };
  }
  return { wanted, paint, tick, clear, status, parts, scene: () => (S ? S.scene : null), root: () => (S ? S.root : null), objects: () => (S ? S.objects : null), tod: () => (S ? S.tod : 'day'), get lastError() { return lastError; } };
})();
