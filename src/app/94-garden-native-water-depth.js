/* A semantic water mask replaces the static depth field's gradient triangles.
 * Red stores local depth; alpha stores the liquid union. Lighting is uniform
 * data, so changing the sky never redraws or uploads the mask. */
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
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)
void main () {
  vec4 field = texture2D(uDepth, outTexCoord);
  if (field.a < 0.001) discard;
  float depth = clamp(field.r / max(field.a, 0.001), 0.0, 1.0);
  float alpha = field.a * (uAlpha.x + depth * uAlpha.y);
  vec4 fragColor = vec4(mix(uTop, uBottom, depth) * alpha, alpha);
  #pragma phaserTemplate(fragmentProcess)
  gl_FragColor = fragColor;
}`;
  function create(scene, options) {
    const W = GARDEN_WORLD, width = W.cols * W.cellW, height = W.sky + W.rows * W.cellH, scale = .5;
    const pixelWidth = Math.ceil(width * scale), pixelHeight = Math.ceil(height * scale), textureBytes = pixelWidth * pixelHeight * 4, key = '__garden-water-depth-' + scene.sys.settings.key;
    const top = [0, 0, 0], bottom = [0, 0, 0], alpha = [.11, .09];
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
        shader = scene.add.shader({ name: 'GardenWaterDepth', fragmentSource: fragment, setupUniforms(set) { set('uDepth', 0); set('uTop', top); set('uBottom', bottom); set('uAlpha', alpha); } }, width / 2, height / 2, width, height, [key]);
        options.parent.add(shader); shader.setVisible(false); lastError = null; return true;
      } catch (error) { lastError = String(error && error.message || error); release(); return false; }
    }
    function rebuild(regions) {
      if (dead) return false;
      const liquid = regions.filter(region => !region.frozen), frozen = regions.filter(region => region.frozen); active = liquid.length > 0;
      if (!active) { if (shader) shader.setVisible(false); return true; }
      if (!ensure()) return false;
      const context = mask.context, image = context.createImageData(pixelWidth, pixelHeight), pixels = image.data;
      for (let row = 0; row < pixelHeight; row++) {
        const y = (row + .5) / scale, spans = [], ice = options.merge(frozen.flatMap(region => options.intervals(region, y)));
        for (const region of liquid) {
          const bounds = region.bounds; if (y < bounds.y || y >= bounds.y + bounds.height) continue;
          const depth = Math.max(0, Math.min(1, (y - bounds.y) / Math.max(1, bounds.height)));
          const intervals = options.subtract(options.intervals(region, y), ice);
          for (const [left, right] of intervals) spans.push({ left: Math.max(0, left * scale), right: Math.min(pixelWidth, right * scale), depth });
        }
        spans.sort((a, b) => a.left - b.left); let coveredTo = -Infinity;
        for (const span of spans) {
          const left = Math.max(span.left, coveredTo), right = span.right; if (right <= left) continue;
          coveredTo = right; const from = Math.floor(left), to = Math.ceil(right), red = Math.round(span.depth * 255);
          for (let x = from; x < to; x++) {
            const coverage = Math.min(right, x + 1) - Math.max(left, x), at = (row * pixelWidth + x) * 4, previous = pixels[at + 3] / 255, amount = previous + coverage;
            pixels[at] = Math.round((pixels[at] * previous + red * coverage) / amount); pixels[at + 3] = Math.round(Math.min(1, amount) * 255);
          }
        }
      }
      context.putImageData(image, 0, 0); mask.refresh(); builds++; shader.setVisible(visible && active); return true;
    }
    function colors(topColor, bottomColor, baseAlpha) {
      for (let i = 0; i < 3; i++) { const shift = (2 - i) * 8; top[i] = (topColor >> shift & 255) / 255; bottom[i] = (bottomColor >> shift & 255) / 255; }
      alpha[0] = baseAlpha;
    }
    return {
      rebuild, colors,
      setVisible(value) { visible = !!value; if (shader) shader.setVisible(visible && active); },
      status() { return { textureBytes: reserved ? textureBytes : 0, quads: shader && shader.visible ? 1 : 0, builds, lastError }; },
      destroy() { if (dead) return; dead = true; release(); },
    };
  }
  return Object.freeze({ create });
})();
