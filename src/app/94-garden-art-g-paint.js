/* ============================================================
   GARDEN ART, painted figures (Painted village style). The owner, Nov 2026: the people and creatures "look like stickers over the painting".
   The opening scenes' kit (70-scene-lib-*, the faceless people of 70-scene-lib-people-0figure.js, the animals) is flat vector with soft form
   shading lit from the upper left, no ink outlines, colours in the world's own key, and every figure stands in a soft contact shadow.
   This file brings every figure the garden draws into that key WITHOUT redrawing it, so every wardrobe item, pet look, fish and bug keeps
   its own drawing and id, and a friend sees exactly the same figure:

     gardenFigurePaint(svg, kind)   -> the same SVG fragment, painted: kind 'actor' (people), 'pet', 'fish' (side on), 'bug' (from above), 'npc'
       - every opaque flat fill becomes a soft linear gradient: sunlit at the upper left, the base colour through the middle, a shade toward
         the lower right in the scenes' own warm-green shadow (never black), so a figure picks up the ground it stands on. A person is one
         light field over the whole figure (userSpaceOnUse, carried through every piece's transform), because the kit cuts a person into
         many overlapping pieces and a gradient per piece shows every seam; a pet, a fish or a bug is shaded piece by piece (objectBoundingBox)
       - colours are graded into the scene's key: a little less saturation and a touch of the low sun, so a pure navy or a red is not louder
         than the painting round it
       - an ink outline on a filled shape (the creature art and the villagers have them) becomes a gentle one: the shape's own deep tone,
         thinner and softer. Strokes that ARE the drawing (an arm, a leg, an antenna) keep their width and only take the grade
       - shading and highlight overlays (anything already see-through) keep their flat colour, graded
     gardenFigurePaintOn()          -> true when the garden is open in the Painted village style on the Phaser renderer
     gardenFigureShadowSvg(rx, ry)  -> the soft contact shadow used under painted figures (two nested ellipses, the scene's shadow colour)

   Only paints and stroke widths change: element order, classes, transforms and CSS motion hooks are untouched, so every walk cycle, pose
   and trick plays as before. The gradients are plain SVG <linearGradient> (the native compiler turns each into vertex colours once, then the
   figure's static parts are baked into its cached textures like any flat fill): nothing new is drawn per frame. The result is cached per
   source string (bounded). Pure string work: no DOM, no state, so Node may evaluate it.
   ============================================================ */
const _GFP = Object.freeze({
  sun: [255, 244, 214],        // the low warm sun of the scenes
  shade: [52, 62, 44],         // the scenes' shadow (the painted ground's shadow, a little deeper)
  deep: [40, 38, 30],          // outlines
  grade: [205, 196, 160],      // the world's key: a dry warm green-grey every colour is pulled a little toward
  kinds: {
    // People are built of many overlapping pieces (a sleeve over a cuff over a hand), so their light is gentler and mostly from above:
    // a strong diagonal on every piece reads as blotches. Skin keeps its flat tone (a face shaded per piece looks dirty).
    // tone: the scene kit's own form shading, per piece (see _gfpTone): ts how much of the piece the lit body covers (the rest is its shade rim,
    // thickest at the lower right), td how deep the shade is, tl the light glaze; tmin the smallest piece (in the walker's units) that gets it.
    actor: { lit: 0.16, dk: 0.24, sat: 0.9, key: 0.05, mid: 0.42, field: [-16, -74, 12, 2], tone: { ts: 0.9, td: 0.26, tl: 0.3, tmin: 2.4 } },
    npc: { lit: 0.14, dk: 0.24, sat: 0.94, key: 0.04, mid: 0.42, field: [-16, -62, 12, 2], tone: { ts: 0.9, td: 0.26, tl: 0.3, tmin: 2.4 } },
    pet: { lit: 0.15, dk: 0.22, sat: 0.94, key: 0.04, x1: 0.1, y1: 0, x2: 0.62, y2: 1, tone: { ts: 0.88, td: 0.28, tl: 0.32, tmin: 2.4 } },
    fish: { lit: 0.14, dk: 0.2, sat: 0.95, key: 0.03, x1: 0.3, y1: 0, x2: 0.5, y2: 1, tone: { ts: 0.86, td: 0.3, tl: 0.36, tmin: 3, ay: 0.22 } },
    bug: { lit: 0.13, dk: 0.2, sat: 0.95, key: 0.03, x1: 0.1, y1: 0.05, x2: 0.8, y2: 0.95, tone: { ts: 0.86, td: 0.3, tl: 0.4, tmin: 2.2 } },
  },
});
const _gfpCache = new Map();
function _gfpRgb(c) {
  let h = String(c).trim().slice(1);
  if (h.length === 3) h = h.replace(/./g, ch => ch + ch);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function _gfpHex(a) { return '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function _gfpMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
/** A colour graded into the scenes' key: saturation eased toward its own grey, then a touch of the world's warm green-grey. */
function _gfpGrade(rgb, K) {
  const grey = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11, s = _gfpMix([grey, grey, grey], rgb, K.sat);
  return _gfpMix(s, _GFP.grade, K.key);
}
/** The Painted village style is chosen (and the Phaser renderer, which is the only one that draws it). */
function gardenFigurePaintStyle() {
  try { if (typeof _gdpPrefs !== 'function') return false; const p = _gdpPrefs(); return !!p && p.artStyle === 'painted' && p.renderEngine !== 'standard'; } catch (e) { return false; }
}
function gardenFigurePaintOn() { return gardenFigurePaintStyle() && typeof _gw !== 'undefined' && !!_gw.on; }
function gardenFigureShadowSvg(rx, ry) {
  const x = Math.max(2, Number(rx) || 12), y = Math.max(1, Number(ry) || 3.4), f = v => Math.round(v * 100) / 100;
  // Wide and faint, then a small deeper core where the feet press: the scenes' shadow pass, not a grey disc.
  return `<ellipse cx="0" cy="0.8" rx="${f(x * 1.35)}" ry="${f(y * 1.45)}" fill="#34402b" fill-opacity="0.1"/><ellipse cx="0" cy="0.8" rx="${f(x)}" ry="${f(y)}" fill="#34402b" fill-opacity="0.13"/><ellipse cx="0" cy="0.6" rx="${f(x * 0.62)}" ry="${f(y * 0.6)}" fill="#2a3322" fill-opacity="0.16"/>`;
}
const _GFP_SHAPE = /^(path|rect|circle|ellipse|polygon|polyline|g|use)$/;
const _GFP_VOID = /^(path|rect|circle|ellipse|polygon|polyline|line|stop|use|image|animateTransform|animate|set)$/i;
const _GFP_ID = Object.freeze([1, 0, 0, 1, 0, 0]);
function _gfpMul(m, n) { return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; }
function _gfpInv(m) { const z = m[0] * m[3] - m[1] * m[2]; if (Math.abs(z) < 1e-9) return _GFP_ID; return [m[3] / z, -m[1] / z, -m[2] / z, m[0] / z, (m[2] * m[5] - m[3] * m[4]) / z, (m[1] * m[4] - m[0] * m[5]) / z]; }
function _gfpPt(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
/** An SVG transform list as a matrix (matrix, translate, scale, rotate, skewX/Y). */
function _gfpTf(t) {
  let M = _GFP_ID;
  for (const m of String(t).matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number); let n = _GFP_ID;
    if (m[1] === 'matrix' && v.length >= 6) n = v.slice(0, 6);
    else if (m[1] === 'translate') n = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (m[1] === 'scale') n = [v[0] == null ? 1 : v[0], 0, 0, v[1] == null ? (v[0] == null ? 1 : v[0]) : v[1], 0, 0];
    else if (m[1] === 'rotate') { const r = (v[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), cx = v[1] || 0, cy = v[2] || 0; n = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; }
    else if (m[1] === 'skewX') n = [1, 0, Math.tan((v[0] || 0) * Math.PI / 180), 1, 0, 0];
    else if (m[1] === 'skewY') n = [1, Math.tan((v[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    M = _gfpMul(M, n);
  }
  return M;
}
function _gfpKey(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
/** An ink line: a stroke darker than its fill and of the fill's own hue (or no hue). A coloured ring on a pale disc (a net) is the drawing, not ink. */
function _gfpInk(s, f) {
  const lum = c => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11, sat = c => { const mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
  if (lum(s) > Math.min(120, lum(f) * 0.8)) return false;
  if (sat(s) < 0.3 || sat(f) < 0.12 && sat(s) < 0.3) return true;
  const hue = c => { const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; return mx === r ? ((g - b) / d + 6) % 6 * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60; };
  if (sat(f) < 0.12) return false;
  const dh = Math.abs(hue(s) - hue(f)); return Math.min(dh, 360 - dh) < 40;
}
function _gfpAttr(attrs, name) { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(attrs); return m ? m[1] : null; }
function _gfpSet(attrs, name, value) {
  const re = new RegExp('((?:^|\\s)' + name + '=")([^"]*)(")');
  return re.test(attrs) ? attrs.replace(re, (_, a, __, c) => a + value + c) : attrs + ' ' + name + '="' + value + '"';
}
/** A shape's box in its own units (an ellipse, a circle, a rect, or a path of absolute commands), or null. */
function _gfpBox(tag, a) {
  const n = (k) => Number(_gfpAttr(a, k) || 0);
  if (tag === 'ellipse') { const rx = n('rx'), ry = n('ry'); return rx > 0 && ry > 0 ? [n('cx') - rx, n('cy') - ry, 2 * rx, 2 * ry] : null; }
  if (tag === 'circle') { const r = n('r'); return r > 0 ? [n('cx') - r, n('cy') - r, 2 * r, 2 * r] : null; }
  if (tag === 'rect') { const w = n('width'), h = n('height'); return w > 0 && h > 0 ? [n('x'), n('y'), w, h] : null; }
  if (tag !== 'path') return null;
  const d = _gfpAttr(a, 'd') || '';
  if (!d || /[a-y]|[AHV]/.test(d.replace(/e-?\d/gi, ''))) return null;   // relative commands, arcs and lone axes: no cheap box (the piece keeps its gradient)
  const v = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
  if (v.length < 6) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); }
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
}
/**
 * The scene kit's form shading on one opaque piece (70-scene-lib-animals-cat.js: "the haunch in shade, the lit side of the body, the light
 * along the back"): the piece in its shade, its lit body over it scaled toward a point up and left of its middle (so the shade is a rim,
 * thickest at the lower right, away from the sun), and on a big enough piece a light glaze up at the upper left. Three flat paints, no seams
 * of gradient. Returns null for a piece too small or of a shape whose box is unknown.
 */
function _gfpTone(tag, a, base, K, M) {
  const T = K.tone; if (!T) return null;
  const b = _gfpBox(tag, a); if (!b) return null;
  const k = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1, w = b[2] * k, h = b[3] * k;
  if (Math.min(w, h) < T.tmin) return null;
  const r = v => Math.round(v * 1000) / 1000, own = _gfpAttr(a, 'transform');
  const at = (s, fx, fy) => { const ax = b[0] + b[2] * fx, ay = b[1] + b[3] * fy; return `${own ? own + ' ' : ''}matrix(${r(s)} 0 0 ${r(s)} ${r(ax * (1 - s))} ${r(ay * (1 - s))})`; };
  // the rim is a fixed width in the walker's units (about 0.9), however big the piece: a big coat and a small cuff shade alike
  const s = Math.max(T.ts, 1 - 1.5 / Math.max(1, Math.min(w, h))), sh = _gfpHex(_gfpMix(base, _GFP.shade, T.td));
  const drop = (x) => x.replace(/\s(stroke|stroke-width|stroke-opacity|stroke-linecap|stroke-linejoin|class|style|id)="[^"]*"/g, '');
  const plain = drop(a);
  let out = '<' + tag + _gfpSet(plain, 'fill', sh) + '/>' + '<' + tag + _gfpSet(_gfpSet(plain, 'fill', _gfpHex(base)), 'transform', at(s, 0.34, T.ay != null ? T.ay : 0.28)) + '/>';
  const curvy = tag === 'ellipse' || tag === 'circle' || tag === 'path' && ((_gfpAttr(a, 'd') || '').match(/[CQST]/g) || []).length >= 3;   // a boxy piece takes no glaze (it would read as a pale block)
  if (curvy && Math.min(w, h) >= 4.4) out += '<' + tag + _gfpSet(_gfpSet(_gfpSet(plain, 'fill', _gfpHex(_gfpMix(base, _GFP.sun, T.tl))), 'transform', at(0.4, 0.1, 0.08)), 'fill-opacity', '0.28') + '/>';
  // what the piece had besides its fill (an edge drawn on it) goes on top, unchanged
  const strokeOnly = /\sstroke="(?!none)[^"]*"/.test(a) ? '<' + tag + _gfpSet(a, 'fill', 'none') + '/>' : '';
  return out + strokeOnly;
}
function gardenFigurePaint(svg, kind) {
  if (!svg || typeof svg !== 'string') return svg || '';
  if (svg.startsWith('<!--gfp-->')) return svg;   // already painted (a figure inside a figure: a pet held, a fish held up)
  const K = _GFP.kinds[kind] || _GFP.kinds.actor, ck = (kind || 'actor') + '|' + svg;
  const hit = _gfpCache.get(ck); if (hit != null) return hit;
  const grads = new Map(), gk = (kind || 'actor').slice(0, 2), stack = [_GFP_ID];
  let out = '';
  try {
    out = svg.replace(/<(\/?)([a-zA-Z]+)(\s[^<>]*?)?(\/?)>/g, (whole, end, tag, attrs, close) => {
      // The transform stack: a person's light is one field over the whole figure (see K.field), so each piece needs its place in it.
      if (end) { if (!_GFP_VOID.test(tag) && stack.length > 1) stack.pop(); return whole; }
      const own = attrs ? _gfpAttr(attrs, 'transform') : null, M = own ? _gfpMul(stack[stack.length - 1], _gfpTf(own)) : stack[stack.length - 1];
      if (!close && !_GFP_VOID.test(tag)) stack.push(M);
      if (!_GFP_SHAPE.test(tag) || !attrs) return whole;
      let a = attrs;
      const fill = _gfpAttr(a, 'fill'), stroke = _gfpAttr(a, 'stroke'), op = Number(_gfpAttr(a, 'opacity') || 1), fop = Number(_gfpAttr(a, 'fill-opacity') || 1);
      const fRgb = fill && fill[0] === '#' ? _gfpRgb(fill) : null, sRgb = stroke && stroke[0] === '#' ? _gfpRgb(stroke) : null;
      let base = null;
      if (fRgb) {
        base = _gfpGrade(fRgb, K);
        if (op >= 0.95 && fop >= 0.95 && close && tag !== 'use' && tag !== 'g' && !/\sclip-path=|\smask=/.test(a)) {
          const toned = _gfpTone(tag, a, base, K, M);
          if (toned) return toned;
        }
        if (op >= 0.95 && fop >= 0.95 && tag !== 'use' && tag !== 'g') {
          const lit = _gfpMix(base, _GFP.sun, K.lit), dk = _gfpMix(base, _GFP.shade, K.dk);
          let id, geo;
          if (K.field) {
            // One light over the whole person, in the figure's own units (feet at 0, crown near -70): the sun at the upper left, the
            // shade gathering toward the feet. Each piece samples the same field through its own transform, so a sleeve, a cuff and a
            // hand meet without a seam however the kit cut them.
            const I = _gfpInv(M), p1 = _gfpPt(I, K.field[0], K.field[1]), p2 = _gfpPt(I, K.field[2], K.field[3]), r = v => Math.round(v * 10) / 10;
            geo = `gradientUnits="userSpaceOnUse" x1="${r(p1[0])}" y1="${r(p1[1])}" x2="${r(p2[0])}" y2="${r(p2[1])}"`;
            id = 'gfp' + gk + _gfpHex(base).slice(1) + _gfpKey(geo);
          } else { geo = `gradientUnits="objectBoundingBox" x1="${K.x1}" y1="${K.y1}" x2="${K.x2}" y2="${K.y2}"`; id = 'gfp' + gk + _gfpHex(base).slice(1); }
          if (!grads.has(id)) grads.set(id, `<linearGradient id="${id}" ${geo}><stop offset="0" stop-color="${_gfpHex(lit)}"/><stop offset="${K.mid || 0.5}" stop-color="${_gfpHex(base)}"/><stop offset="1" stop-color="${_gfpHex(dk)}"/></linearGradient>`);
          a = _gfpSet(a, 'fill', `url(#${id})`);
        } else a = _gfpSet(a, 'fill', _gfpHex(base));
      }
      if (sRgb) {
        const filled = fill && fill !== 'none';
        if (filled && tag !== 'g' && _gfpInk(sRgb, fRgb || sRgb)) {
          // An ink outline round a filled shape: the shape's own deep tone, thinner and softer (the kit has none; a figure keeps a whisper of one to read at 40 px).
          const own = base || _gfpGrade(sRgb, K), w = Number(_gfpAttr(a, 'stroke-width') || 1);
          a = _gfpSet(a, 'stroke', _gfpHex(_gfpMix(own, _GFP.deep, 0.42)));
          a = _gfpSet(a, 'stroke-width', String(Math.round(w * 0.62 * 100) / 100));
          a = _gfpSet(a, 'stroke-opacity', String(Math.round(Number(_gfpAttr(a, 'stroke-opacity') || 1) * 0.72 * 100) / 100));
        } else {
          // A stroke that is part of the drawing: graded; a near-black line is lifted to a deep warm brown.
          const L = sRgb[0] * 0.3 + sRgb[1] * 0.59 + sRgb[2] * 0.11;
          a = _gfpSet(a, 'stroke', _gfpHex(L < 40 ? _gfpMix(sRgb, [58, 50, 40], 0.6) : _gfpGrade(sRgb, K)));
        }
      }
      return '<' + tag + a + close + '>';
    });
    out = '<!--gfp-->' + (grads.size ? `<defs>${[...grads.values()].join('')}</defs>` : '') + out;
  } catch (e) { out = svg; }
  if (_gfpCache.size > 160) _gfpCache.delete(_gfpCache.keys().next().value);
  _gfpCache.set(ck, out);
  return out;
}
/** Paint only when the garden is open in the Painted village style (a figure on a profile page or a card keeps its own drawing). */
function gardenFigurePaintIf(svg, kind) { return gardenFigurePaintOn() ? gardenFigurePaint(svg, kind) : svg; }
