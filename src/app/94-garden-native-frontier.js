/* A distance field softens locked-land boundaries into moving mist. The
 * locked core keeps its exact membership; open land receives only pale wisps. */
window.GardenNativeFrontier = (function () {
  'use strict';
  const fragment = `
#pragma phaserTemplate(shaderName)
#pragma phaserTemplate(extensions)
#pragma phaserTemplate(features)
precision mediump float;
#pragma phaserTemplate(fragmentDefine)
varying vec2 outTexCoord;
uniform sampler2D uLand;
uniform sampler2D uMist;
uniform vec2 uSize;
uniform vec2 uOrigin;
uniform float uPadding;
uniform float uTime;
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)
void main () {
  vec2 uv = outTexCoord;
  vec4 land = texture2D(uLand, (uv * uSize + vec2(uPadding)) / (uSize + vec2(uPadding * 2.0)));
  float distance = (land.r - 0.5) * 384.0;
  if (distance < -30.0) discard;
  vec2 p = (uOrigin + uv * uSize) / 420.0;
  float a = texture2D(uMist, fract(p * vec2(0.83, 1.19) + vec2(uTime * 0.006, -uTime * 0.003))).r;
  float b = texture2D(uMist, fract(p * vec2(1.73, 2.27) + vec2(-uTime * 0.005, uTime * 0.003))).g;
  float c = texture2D(uMist, fract(p * vec2(0.91, 4.4) + vec2(uTime * 0.009, uTime * 0.002))).b;
  float density = smoothstep(0.22, 0.79, a * 0.58 + b * 0.30 + c * 0.12);
  float billow = (a - 0.5) * 43.0 + (b - 0.5) * 17.0;
  // Billows fade inward before exact membership clips the dark core.
  // Otherwise a nonzero edge density ends abruptly on the cell boundary.
  float coreFade = smoothstep(0.0, 24.0, distance);
  float core = smoothstep(12.0, 112.0, distance + billow) * coreFade * step(0.5, land.g);
  float edge = smoothstep(-28.0, 8.0, distance) * (1.0 - smoothstep(22.0, 72.0, distance));
  float fringe = edge * smoothstep(0.36, 0.74, b * 0.35 + c * 0.65) * 0.055;
  float alpha = (core * (0.40 + density * 0.25) + fringe * (1.0 - core)) * land.b;
  if (alpha < 0.002) discard;
  vec3 deep = mix(vec3(0.105, 0.17, 0.18), vec3(0.31, 0.41, 0.39), density);
  vec3 color = mix(vec3(0.57, 0.68, 0.62), deep, smoothstep(0.02, 0.5, core));
  vec4 fragColor = vec4(color * alpha, alpha);
  #pragma phaserTemplate(fragmentProcess)
  gl_FragColor = fragColor;
}`;
  function distanceField(bits, width, height, target) {
    const field = new Float32Array(bits.length), count = Math.max(width, height), input = new Float64Array(count), output = new Float64Array(count), vertices = new Int32Array(count), limits = new Float64Array(count + 1), far = 1e12;
    const transform = length => {
      let k = 0; vertices[0] = 0; limits[0] = -far; limits[1] = far;
      for (let q = 1; q < length; q++) {
        let p = vertices[k], crossing = ((input[q] + q * q) - (input[p] + p * p)) / (2 * (q - p));
        while (crossing <= limits[k]) { k--; p = vertices[k]; crossing = ((input[q] + q * q) - (input[p] + p * p)) / (2 * (q - p)); }
        vertices[++k] = q; limits[k] = crossing; limits[k + 1] = far;
      }
      k = 0;
      for (let q = 0; q < length; q++) { while (limits[k + 1] < q) k++; const delta = q - vertices[k]; output[q] = delta * delta + input[vertices[k]]; }
    };
    for (let x = 0; x < width; x++) { for (let y = 0; y < height; y++) input[y] = bits[y * width + x] === target ? 0 : far; transform(height); for (let y = 0; y < height; y++) field[y * width + x] = output[y]; }
    for (let y = 0; y < height; y++) { const start = y * width; for (let x = 0; x < width; x++) input[x] = field[start + x]; transform(width); for (let x = 0; x < width; x++) field[start + x] = output[x]; }
    return field;
  }
  function boundaryFingerprint(regions) {
    // Compare exact geometry only after a world revision, including holes.
    // Palette and shoreline redraws can replace otherwise identical rows.
    const loop = points => points.map(p => [p.x, p.y]);
    return JSON.stringify(regions.map(region => [String(region.id), loop(region.points), (region.holes || []).map(loop)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }
  /* Regions supply coast-clipped contours. Every closed region is misted;
   * its own gate, rather than another region's progression order, owns access. */
  function islandPresentation(world, source) {
    if (typeof gardenIslandActive !== 'function' || !gardenIslandActive()) return { regions: source, key: '', gate: null };
    const data = gardenIslandData(), model = typeof world.model === 'function' ? world.model() : null, open = new Set(model && model.areas || []);
    const gate = data.gates.find(g => !open.has('zn-' + g.n));
    const regions = source.filter(region => { const row = typeof gardenLandRow === 'function' ? gardenLandRow(region.area) : null, zone = region.zone == null ? row && row.zn : region.zone; return !!zone && !open.has('zn-' + zone); });
    return { regions, gate, key: 'island:' + data.id + ':' + regions.map(region => region.id).join(',') };
  }
  function create(scene, options) {
    const W = GARDEN_WORLD, width = W.cols * W.cellW, height = W.sky + W.rows * W.cellH;
    const tileSize = 512, padding = 192, scale = .25, maskSize = (tileSize + padding * 2) * scale;
    const prefix = '__garden-frontier-' + scene.sys.settings.key, noiseKey = prefix + '-mist';
    const noise = scene.textures.createCanvas(noiseKey, 128, 128), ctx = noise.context, data = ctx.createImageData(128, 128);
    const hash = (x, y, n, seed) => { let h = Math.imul((x + n) % n + seed, 374761393) ^ Math.imul((y + n) % n, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
    const value = (x, y, n, seed) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v); return (hash(i, j, n, seed) * (1 - a) + hash(i + 1, j, n, seed) * a) * (1 - b) + (hash(i, j + 1, n, seed) * (1 - a) + hash(i + 1, j + 1, n, seed) * a) * b; };
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const i = (y * 128 + x) * 4; for (let c = 0; c < 3; c++) data.data[i + c] = Math.round(255 * (value(x / 32, y / 32, 4, 17 + c * 13) * .6 + value(x / 16, y / 16, 8, 83 + c * 7) * .28 + value(x / 8, y / 8, 16, 41 + c) * .12)); data.data[i + 3] = 255; }
    ctx.putImageData(data, 0, 0); noise.refresh();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), tiles = new Map(), parent = options.world.rootNode._inner || options.world.root;
    let regions = null, revision = -1, boundary = null, count = 0, districtGate = '', room = false, paused = false, elapsed = 0, dead = false, builds = 0, buildMs = 0, reuses = 0, visible = 0;
    function clearTiles() {
      for (const tile of tiles.values()) { if (tile.shader) tile.shader.destroy(); if (tile.texture) scene.textures.remove(tile.key); }
      tiles.clear(); visible = 0;
    }
    function rebuild(state, presentation) {
      clearTiles(); regions = state.lockedRegions || []; revision = state.revision; count = presentation.regions.length; districtGate = presentation.gate && presentation.gate.id || '';
      for (const region of presentation.regions) {
        const b = region.bounds, x0 = Math.max(0, Math.floor((b.x - 30) / tileSize)), y0 = Math.max(0, Math.floor((b.y - 30) / tileSize)), x1 = Math.min(Math.ceil(width / tileSize) - 1, Math.floor((b.x + b.width + 30) / tileSize)), y1 = Math.min(Math.ceil(height / tileSize) - 1, Math.floor((b.y + b.height + 30) / tileSize));
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          const id = cx + ':' + cy; let tile = tiles.get(id);
          if (!tile) { tile = { x: cx * tileSize, y: cy * tileSize, key: prefix + '-land-' + id, regions: [], texture: null, shader: null, built: false }; tiles.set(id, tile); }
        }
      }
      // Include every contour within the distance-field padding, even if that
      // contour has no core in this tile. Adjacent tiles then share one edge.
      for (const tile of tiles.values()) tile.regions = presentation.regions.filter(region => { const b = region.bounds; return b.x + b.width >= tile.x - padding && b.x <= tile.x + tileSize + padding && b.y + b.height >= tile.y - padding && b.y <= tile.y + tileSize + padding; });
    }
    function buildTile(tile) {
      if (tile.built) return; tile.built = true;
      const started = performance.now(), mask = scene.textures.createCanvas(tile.key, maskSize, maskSize), c = mask.context;
      c.setTransform(scale, 0, 0, scale, (padding - tile.x) * scale, (padding - tile.y) * scale); c.fillStyle = '#fff';
      for (const region of tile.regions) { c.beginPath(); for (const loop of [region.points, ...(region.holes || [])]) { if (!loop.length) continue; c.moveTo(loop[0].x, loop[0].y); for (let i = 1; i < loop.length; i++) c.lineTo(loop[i].x, loop[i].y); c.closePath(); } c.fill('evenodd'); }
      c.setTransform(1, 0, 0, 1, 0, 0);
      const image = c.getImageData(0, 0, maskSize, maskSize), pixels = image.data, bits = new Uint8Array(maskSize * maskSize); let occupied = 0;
      for (let i = 0; i < bits.length; i++) {
        const x = tile.x - padding + (i % maskSize + .5) / scale, y = tile.y - padding + (Math.floor(i / maskSize) + .5) / scale;
        bits[i] = pixels[i * 4 + 3] >= 128 && x >= 0 && x < width && y >= 0 && y < height ? 1 : 0; occupied += bits[i];
      }
      if (!occupied) { scene.textures.remove(tile.key); builds++; buildMs = performance.now() - started; return; }
      const toOpen = distanceField(bits, maskSize, maskSize, 0), toLocked = distanceField(bits, maskSize, maskSize, 1);
      for (let i = 0; i < bits.length; i++) {
        const distance = (bits[i] ? Math.max(0, Math.sqrt(toOpen[i]) - .5) : -Math.max(0, Math.sqrt(toLocked[i]) - .5)) / scale, at = i * 4;
        pixels[at] = Math.round((Math.max(-192, Math.min(192, distance)) / 384 + .5) * 255); pixels[at + 1] = bits[i] * 255; pixels[at + 2] = 255; pixels[at + 3] = 255;
      }
      c.putImageData(image, 0, 0); mask.refresh(); tile.texture = mask;
      tile.shader = scene.add.shader({ name: 'GardenFrontierMist', fragmentSource: fragment, setupUniforms(set) { set('uLand', 0); set('uMist', 1); set('uSize', [tileSize, tileSize]); set('uOrigin', [tile.x, tile.y]); set('uPadding', padding); set('uTime', elapsed); } }, tile.x + tileSize / 2, tile.y + tileSize / 2, tileSize, tileSize, [tile.key, noiseKey]).setDepth(75000).setVisible(false);
      parent.add(tile.shader); options.world.depthChanged(); builds++; buildMs = performance.now() - started;
    }
    function update(time, delta) {
      if (dead) return; const state = typeof options.world.frontierState === 'function' ? options.world.frontierState() : options.world.effectsState();
      if (state && (state.lockedRegions !== regions || state.revision !== revision)) {
        const next = state.lockedRegions || [], presentation = islandPresentation(options.world, next), fingerprint = boundaryFingerprint(presentation.regions) + '|' + presentation.key;
        if (fingerprint !== boundary) { rebuild(state, presentation); boundary = fingerprint; }
        else { regions = next; revision = state.revision; reuses++; }
      }
      if (!paused && !reduced.matches && (typeof gardenMotionOn !== 'function' || gardenMotionOn())) elapsed += Math.min(80, Math.max(0, delta || 0)) / 1000;
      const view = options.world.camera(), overlaps = (tile, margin) => tile.x + tileSize >= view.x - margin && tile.x <= view.x + view.w + margin && tile.y + tileSize >= view.y - margin && tile.y <= view.y + view.h + margin;
      visible = 0; let prepared = false;
      for (const tile of tiles.values()) {
        const on = !room && overlaps(tile, 16);
        // Visible fields are prepared together. While walking, warm
        // one nearby field on the shared clock before it enters the camera.
        if (!tile.built && on) buildTile(tile);
        if (!tile.built && !room && overlaps(tile, tileSize) && !prepared) { buildTile(tile); prepared = true; }
        if (tile.shader) { tile.shader.setVisible(on); if (on) visible++; }
      }
    }
    return { update, setRoom(value) { room = !!value; if (room) for (const tile of tiles.values()) if (tile.shader) tile.shader.setVisible(false); }, pauseAmbient(state) { paused = !!(state && (state.hush || state.frozen)); }, status: () => ({ regions: count, districtGate, animated: !paused && !reduced.matches && (typeof gardenMotionOn !== 'function' || gardenMotionOn()), edge: 'signed-distance', tiles: tiles.size, residentTiles: [...tiles.values()].filter(tile => tile.texture).length, visibleTiles: visible, maskBuilds: builds, maskReuses: reuses, maskBuildMs: buildMs, textureBytes: [...tiles.values()].filter(tile => tile.texture).length * maskSize * maskSize * 4 + 128 * 128 * 4 }), destroy() { if (dead) return; dead = true; clearTiles(); scene.textures.remove(noiseKey); } };
  }
  return { create };
})();
