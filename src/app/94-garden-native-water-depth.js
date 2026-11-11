/* A retained semantic water mask replaces gradient triangles. Red stores
 * distance from the actual shore, green marks marine water and alpha keeps the
 * liquid union. Sky changes update colours without rebuilding this mask. */
window.GardenNativeWaterDepth = (function () {
  'use strict';
  const fragment = `
#pragma phaserTemplate(shaderName)
#pragma phaserTemplate(extensions)
#pragma phaserTemplate(features)
precision mediump float;
#pragma phaserTemplate(fragmentDefine)
varying vec2 outTexCoord;
uniform sampler2D uDepth;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec2 uAlpha;
uniform vec4 uField;
uniform vec2 uMaskSize;
uniform vec2 uOcean;
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)
void main () {
  vec2 sampleUV = outTexCoord;
  if (uOcean.x > 0.5) {
    vec2 worldPoint = vec2(uField.x + outTexCoord.x * uField.z, uField.y + (1.0 - outTexCoord.y) * uField.w);
    sampleUV = vec2(worldPoint.x / uMaskSize.x, 1.0 - worldPoint.y / uMaskSize.y);
  }
  vec4 field;
  if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) {
    if (uOcean.x < 0.5) discard;
    field = vec4(1.0, 1.0, 0.0, 1.0);
  } else field = texture2D(uDepth, sampleUV);
  if (field.a < 0.001) discard;
  float depth = clamp(field.r / max(field.a, 0.001), 0.0, 1.0);
  float marine = clamp(field.g / max(field.a, 0.001), 0.0, 1.0);
  // Silty pond margins and the clearer marine shelf share one shore field.
  // The soft shelf changes material colour, never the shape of the water.
  float shelf = smoothstep(0.025, 0.34, depth);
  float basin = smoothstep(0.04, 0.96, depth);
  vec3 silt = uTop * vec3(1.06, 1.01, 0.85);
  vec3 clearShelf = uTop * vec3(0.87, 1.035, 1.04);
  vec3 shallows = mix(silt, clearShelf, marine);
  vec3 water = mix(shallows, mix(uTop, uBottom, basin), shelf);
  float alpha = field.a * (uAlpha.x + basin * uAlpha.y);
  vec4 fragColor = vec4(clamp(water, 0.0, 1.0) * alpha, alpha);
  #pragma phaserTemplate(fragmentProcess)
  gl_FragColor = fragColor;
}`;
  // Keep room in the existing water cache for the player, pet, rod and scenery
  // reflections. A fixed half-scale field outgrows that cache on a large island.
  const MASK_BYTES = 3 * 1024 * 1024;
  function shoreDistance(pixels, width, height, scaleX, scaleY) {
    const distances = new Float32Array(width * height), count = Math.max(width, height), input = new Float64Array(count), output = new Float64Array(count), vertices = new Int32Array(count), limits = new Float64Array(count + 1), far = 1e12;
    // Exact separable squared distance transform. Its work is linear in the
    // retained mask, with no shoreline search or geometry work during frames.
    function transform(length, spacing) {
      let k = 0; vertices[0] = 0; limits[0] = -far; limits[1] = far;
      for (let q = 1; q < length; q++) {
        let p = vertices[k], crossing = ((input[q] + spacing * q * q) - (input[p] + spacing * p * p)) / (2 * spacing * (q - p));
        while (crossing <= limits[k]) { k--; p = vertices[k]; crossing = ((input[q] + spacing * q * q) - (input[p] + spacing * p * p)) / (2 * spacing * (q - p)); }
        vertices[++k] = q; limits[k] = crossing; limits[k + 1] = far;
      }
      k = 0;
      for (let q = 0; q < length; q++) { while (limits[k + 1] < q) k++; const delta = q - vertices[k]; output[q] = spacing * delta * delta + input[vertices[k]]; }
    }
    for (let x = 0; x < width; x++) { for (let y = 0; y < height; y++) input[y] = pixels[(y * width + x) * 4 + 3] ? far : 0; transform(height, 1 / (scaleY * scaleY)); for (let y = 0; y < height; y++) distances[y * width + x] = output[y]; }
    for (let y = 0; y < height; y++) { const start = y * width; for (let x = 0; x < width; x++) input[x] = distances[start + x]; transform(width, 1 / (scaleX * scaleX)); for (let x = 0; x < width; x++) distances[start + x] = output[x]; }
    return distances;
  }
  function create(scene, options) {
    const W = GARDEN_WORLD, width = W.cols * W.cellW, height = W.sky + W.rows * W.cellH, scale = Math.min(.5, Math.sqrt(MASK_BYTES / (width * height * 4)));
    const pixelWidth = Math.max(1, Math.floor(width * scale)), pixelHeight = Math.max(1, Math.floor(height * scale)), scaleX = pixelWidth / width, scaleY = pixelHeight / height, textureBytes = pixelWidth * pixelHeight * 4, key = '__garden-water-depth-' + scene.sys.settings.key;
    const top = [0, 0, 0], bottom = [0, 0, 0], alpha = [.11, .09], fieldBounds = [0, 0, width, height], maskSize = [width, height], ocean = [0, 0];
    let mask = null, shader = null, reserved = false, dead = false, active = false, visible = true, builds = 0, lastError = null;
    function release() {
      if (shader) { shader.destroy(); shader = null; }
      if (mask) { if (scene.textures.exists(key)) scene.textures.remove(key); mask = null; }
      if (reserved) { reserved = false; if (options.release) options.release(textureBytes); }
    }
    function ensure() {
      if (mask && shader) return true;
      if (options.reserve && !options.reserve(textureBytes)) { lastError = 'Water depth texture could not fit in the water cache'; return false; }
      reserved = true;
      try {
        mask = scene.textures.createCanvas(key, pixelWidth, pixelHeight);
        shader = scene.add.shader({ name: 'GardenWaterDepth', fragmentSource: fragment, setupUniforms(set) { set('uDepth', 0); set('uTop', top); set('uBottom', bottom); set('uAlpha', alpha); set('uField', fieldBounds); set('uMaskSize', maskSize); set('uOcean', ocean); } }, fieldBounds[0] + fieldBounds[2] / 2, fieldBounds[1] + fieldBounds[3] / 2, fieldBounds[2], fieldBounds[3], [key]);
        options.parent.add(shader); shader.setVisible(false); lastError = null; return true;
      } catch (error) { lastError = String(error && error.message || error); release(); return false; }
    }
    function rebuild(regions) {
      if (dead) return false;
      const liquid = regions.filter(region => !region.frozen), frozen = regions.filter(region => region.frozen); active = liquid.length > 0;
      if (!active) { if (shader) shader.setVisible(false); return true; }
      // Only the quad grows into the open sea. The bounded world mask keeps
      // the same liquid/ice union and is reused until its geometry changes.
      const sea = liquid.find(region => region.ocean), b = sea && sea.bounds;
      ocean[0] = b ? 1 : 0; fieldBounds[0] = b ? b.x : 0; fieldBounds[1] = b ? b.y : 0; fieldBounds[2] = b ? b.width : width; fieldBounds[3] = b ? b.height : height;
      if (!ensure()) return false;
      shader.setPosition(fieldBounds[0] + fieldBounds[2] / 2, fieldBounds[1] + fieldBounds[3] / 2).setSize(fieldBounds[2], fieldBounds[3]);
      const context = mask.context, image = context.createImageData(pixelWidth, pixelHeight), pixels = image.data;
      for (let row = 0; row < pixelHeight; row++) {
        const y = (row + .5) / scaleY, spans = [], ice = options.merge(frozen.flatMap(region => options.intervals(region, y)));
        for (const region of liquid) {
          const bounds = region.bounds; if (y < bounds.y || y >= bounds.y + bounds.height) continue;
          const intervals = options.subtract(options.intervals(region, y), ice);
          for (const [left, right] of intervals) spans.push({ left: Math.max(0, left * scaleX), right: Math.min(pixelWidth, right * scaleX), marine: region.ocean ? 255 : 0 });
        }
        spans.sort((a, b) => a.left - b.left); let coveredTo = -Infinity;
        for (const span of spans) {
          const left = Math.max(span.left, coveredTo), right = span.right; if (right <= left) continue;
          coveredTo = right; const from = Math.floor(left), to = Math.ceil(right);
          for (let x = from; x < to; x++) {
            const coverage = Math.min(right, x + 1) - Math.max(left, x), at = (row * pixelWidth + x) * 4, previous = pixels[at + 3] / 255, amount = previous + coverage;
            pixels[at + 1] = Math.round((pixels[at + 1] * previous + span.marine * coverage) / amount); pixels[at + 3] = Math.round(Math.min(1, amount) * 255);
          }
        }
      }
      const distances = shoreDistance(pixels, pixelWidth, pixelHeight, scaleX, scaleY), halfPixel = .5 / Math.max(scaleX, scaleY);
      for (let i = 0; i < distances.length; i++) {
        const at = i * 4; if (!pixels[at + 3]) continue;
        const range = pixels[at + 1] > 127 ? 210 : 112, depth = Math.max(0, Math.min(1, (Math.sqrt(distances[i]) - halfPixel) / range));
        pixels[at] = Math.round(depth * 255);
      }
      context.putImageData(image, 0, 0); mask.refresh(); builds++; shader.setVisible(visible && active); return true;
    }
    function colors(topColor, bottomColor, baseAlpha) {
      for (let i = 0; i < 3; i++) { const shift = (2 - i) * 8; top[i] = (topColor >> shift & 255) / 255; bottom[i] = (bottomColor >> shift & 255) / 255; }
      alpha[0] = baseAlpha; alpha[1] = Math.max(.09, baseAlpha * .85);
    }
    return {
      rebuild, colors,
      setVisible(value) { visible = !!value; if (shader) shader.setVisible(visible && active); },
      status() { return { textureBytes: reserved ? textureBytes : 0, quads: shader && shader.visible ? 1 : 0, builds, lastError, maskScale: [scaleX, scaleY], shoreDepth: true }; },
      destroy() { if (dead) return; dead = true; release(); },
    };
  }
  return Object.freeze({ create });
})();
