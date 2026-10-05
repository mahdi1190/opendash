// Animation quality lint: pure functions, no I/O, no dependencies (Node >= 20).
//
//   measure(markup, kind, opts)               -> metrics        kind: 'scene' | 'item'
//   check(metrics, profile, thresholds)       -> [{rule, message, value, min?, max?}]   [] = pass
//   lintMarkup(markup, profile, thresholds, opts) -> { metrics, failures }
//   ruleTable(metrics, profile, thresholds)   -> [{rule, value, limit, ok}]   a PASS / FAIL row per rule
//   thinSpots(metrics, profile, thresholds)   -> advisory: passes that are still thinner than 90 % of the corpus
//   checkCss(css)                             -> failures for a pack's css (keyframes move transform and opacity only)
//   profileFor({pack, full}, thresholds)      -> 'scene' | 'scene-legacy' | 'item' | 'item-classic'
//   applyWaivers(failures, ref, thresholds)   -> { failures, waived }
//   shapeKeys / sharedShares                  how much of a scene is identical to other scenes (templated or copied art)
//   RULE_PLAN / RULE_HINTS / proposeThresholds / describe    which metrics are rules, how to fix them, and calibration
//
// A 'scene' is a full-screen opening (item.full: 1600 x 900 user units, sliced to fill any screen);
// an 'item' is a small 64 x 64 drawing (a symbol, a celebration, a small-town mark ...). `markup` is
// what animItemHtml() returns (a wrapper span plus the svg), or just the svg, or its inside.
// `opts.css` / `opts.classes`: the css the item ships with (library, registry and pack css): every motion
// and evening class the drawing uses must be defined there, or it silently does nothing.
//
// The thresholds (tools/anim-quality.json) are CALIBRATED on the accepted corpus: every existing scene
// and item passes, and the floors sit at the corpus minimum (or just under it), so a thin, flat or
// padded drawing fails. The metrics are chosen because they are hard to raise without actually
// drawing: they are measured from the GEOMETRY (bounding boxes, what covers real area, how the
// detail is spread, how many shapes are genuinely different) rather than counted from the text, and
// a composite richness index stops one big number from hiding thin everything else.
//
// What this cannot see is whether the picture is GOOD: composition, taste, readability. A drawing that is
// numerically rich but meaningless (random shapes clustered around a point) can pass. That needs the eye:
// `node tools/anim-pack.mjs sheet` renders it and `reference` shows the standard to match.

export const SCENE = Object.freeze({ w: 1600, h: 900 });
export const SMALL = Object.freeze({ w: 64, h: 64 });

const SHAPE_TAGS = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'line', 'polyline']);
const DEFS_LIKE = new Set(['defs', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'symbol', 'filter']);
const ALLOWED_TAGS = new Set([...SHAPE_TAGS, ...DEFS_LIKE, 'svg', 'g', 'stop', 'use', 'span']);
const FORBIDDEN_TAGS = new Set(['text', 'tspan', 'textpath', 'image', 'script', 'foreignobject', 'iframe', 'object', 'embed', 'style', 'a', 'animate', 'set', 'animatemotion', 'animatetransform', 'feimage', 'link', 'audio', 'video', 'canvas']);
const FILL_CLASSES = new Set(['k', 'c', 's', 'w', 'm']);
const STROKE_CLASSES = new Set(['ln', 'lk', 'lc', 'lm', 'lw', 'lsoft']);

/* ---------------------------------------------------------------------------------------------
   Motion vocabulary. Region scene kits prefix their motion classes with two letters (x-uspar,
   x-txglide, x-ukshim): the kind is what follows. Small items use the library's own names.
   --------------------------------------------------------------------------------------------- */
const PARALLAX_KINDS = new Set(['par']);
const DRIFT_KINDS = new Set(['drift', 'move']);
const STRUCTURAL_KINDS = new Set(['par', 'drift', 'move', 'spin', 'rays', 'glow', 'rise']);   // sky and light, not "life"
const SCENE_KINDS = new Set(['par', 'drift', 'move', 'glide', 'shim', 'puff', 'flap', 'bob', 'glow', 'rise', 'sway', 'sway2', 'spin', 'flag', 'flicker', 'lift', 'fall',
  'heel', 'wheel', 'weed', 'bubble', 'tail', 'fly', 'graze', 'graze2', 'rays', 'nod', 'mist', 'flutter', 'swim', 'lark', 'roll']);

/** 'x-uspar' -> 'par'; 'x-glide' -> 'glide'; 'x-pop' -> 'pop'. A region prefix is two letters. */
export function motionKind(cls) {
  const n = String(cls).replace(/^x-/, '');
  if (SCENE_KINDS.has(n)) return n;
  const k = n.slice(2);
  return n.length > 2 && SCENE_KINDS.has(k) ? k : n;
}

/* ---------------------------------------------------------------------------------------------
   A small, tolerant SVG parser (elements, attributes, nesting). Not a validator: what it cannot
   make sense of is reported as `problems`.
   --------------------------------------------------------------------------------------------- */
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>|<[^>]*>|([^<]+)/g;
const QUOTED = /([^\s=\/>"']+)="([^"]*)"/g;
const ATTR = /([^\s=\/>"']+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

export function parseMarkup(src) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  const problems = [], all = [], stack = [];
  let cur = root;
  const re = new RegExp(TOKEN.source, 'g');
  let m;
  while ((m = re.exec(src))) {
    if (m[5] != null) { if (m[5].trim()) problems.push(`stray text "${m[5].trim().slice(0, 24)}"`); continue; }
    if (m[0].startsWith('<!--')) continue;
    if (m[2] == null) { problems.push(`malformed tag ${m[0].slice(0, 40)}`); continue; }
    const tag = m[2];
    if (m[1]) {   // a closing tag
      const top = stack[stack.length - 1];
      if (top && top.tag === tag) { stack.pop(); cur = top.parent; } else problems.push(`unbalanced </${tag}>`);
      continue;
    }
    const attrs = {};
    const as = m[3];
    if (as) {
      QUOTED.lastIndex = 0;
      let a, quoted = 0;
      while ((a = QUOTED.exec(as))) { attrs[a[1]] = a[2]; quoted++; }
      let eq = 0, at = as.indexOf('=');
      while (at >= 0) { eq++; at = as.indexOf('=', at + 1); }
      if (eq !== quoted || as.indexOf("'") >= 0) {   // single-quoted, unquoted or odd attributes: the slow, complete way
        for (const b of as.matchAll(ATTR)) attrs[b[1]] = b[2] != null ? b[2] : b[3] != null ? b[3] : b[4] != null ? b[4] : '';
      }
    }
    const node = { tag, attrs, children: [], parent: cur };
    cur.children.push(node);
    all.push(node);
    if (!m[4]) { stack.push(node); cur = node; }
  }
  if (stack.length) problems.push(`unclosed <${stack[stack.length - 1].tag}>`);
  return { root, all, problems };
}

/* ---------- colour ---------- */
function hex6(c) {
  c = String(c || '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(c);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) return '#' + h.slice(0, 3).split('').map(x => x + x).join('');
    if (h.length === 6 || h.length === 8) return '#' + h.slice(0, 6);
    return null;
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c);
  if (m) return '#' + [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, Math.round(+v))).toString(16).padStart(2, '0')).join('');
  if (c === 'white') return '#ffffff';
  if (c === 'black') return '#000000';
  return null;
}
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lumOf = (h) => { const [r, g, b] = rgbOf(h).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

/** Distinct perceptual colours: greedy clusters in sRGB, so ten near-identical shades count once. */
export function colourClusters(hexes, radius = 22) {
  const reps = [];
  for (const h of hexes) {
    const c = rgbOf(h);
    if (!reps.some(r => Math.hypot(r[0] - c[0], r[1] - c[1], r[2] - c[2]) < radius)) reps.push(c);
  }
  return reps.length;
}

/* ---------- geometry ---------- */
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
/**
 * Bounding box (control points included), segment count and a translation-invariant signature of path data:
 * the same outline drawn at two places has the same `sig` (every point is a delta from the segment start).
 */
export function pathBox(d) {
  const t = String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g);
  if (!t) return null;
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, segs = 0, first = true;
  const sig = [];
  const pt = (px, py) => { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; };
  const n = () => parseFloat(t[i++]);
  const isNum = () => i < t.length && !/^[a-zA-Z]$/.test(t[i]);
  const seg = (name, pts, extra) => {
    for (let k = 0; k < pts.length; k += 2) pt(pts[k], pts[k + 1]);
    sig.push(name + (extra || '') + pts.map((v, k) => Math.round(v - (k % 2 ? y : x))).join(','));
    segs++; x = pts[pts.length - 2]; y = pts[pts.length - 1];
  };
  while (i < t.length) {
    if (/^[a-zA-Z]$/.test(t[i])) cmd = t[i++];
    else if (!cmd) return null;
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ax = (v) => rel ? x + v : v, ay = (v) => rel ? y + v : v;
    if (C === 'Z') { x = sx; y = sy; continue; }
    if (C === 'M') {
      const a = n(), b = n(), nx = ax(a), ny = ay(b);
      if (first) { x = nx; y = ny; pt(x, y); segs++; first = false; } else seg('M', [nx, ny]);
      sx = x; sy = y; cmd = rel ? 'l' : 'L';
      continue;
    }
    if (C === 'L' || C === 'T') { do { const a = n(), b = n(); seg(C, [ax(a), ay(b)]); } while (isNum()); continue; }
    if (C === 'H') { do { const a = n(); seg('H', [ax(a), y]); } while (isNum()); continue; }
    if (C === 'V') { do { const a = n(); seg('V', [x, ay(a)]); } while (isNum()); continue; }
    if (C === 'C') { do { const p = []; for (let k = 0; k < 3; k++) { const a = n(), b = n(); p.push(ax(a), ay(b)); } seg('C', p); } while (isNum()); continue; }
    if (C === 'S' || C === 'Q') { do { const p = []; for (let k = 0; k < 2; k++) { const a = n(), b = n(); p.push(ax(a), ay(b)); } seg(C, p); } while (isNum()); continue; }
    if (C === 'A') {
      do {
        const rx = Math.abs(n()), ry = Math.abs(n()), rot = n(), f1 = n(), f2 = n(), a = n(), b = n();
        const nx = ax(a), ny = ay(b);
        pt((x + nx) / 2 - rx * 0.3, (y + ny) / 2 - ry * 0.3); pt((x + nx) / 2 + rx * 0.3, (y + ny) / 2 + ry * 0.3);
        seg('A', [nx, ny], `${Math.round(rx)},${Math.round(ry)},${Math.round(rot)},${f1},${f2},`);
      } while (isNum());
      continue;
    }
    return null;
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1, segs, sig: sig.join('') };
}
function matMul(a, b) { return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]; }
function parseTransform(s) {
  let m = [1, 0, 0, 1, 0, 0];
  for (const f of String(s || '').matchAll(/(translate|scale|rotate|matrix|skewX|skewY)\(([^)]*)\)/g)) {
    const a = f[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let t = null;
    if (f[1] === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (f[1] === 'scale') t = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0];
    else if (f[1] === 'rotate') { const r = (a[0] || 0) * Math.PI / 180, c = Math.cos(r), s2 = Math.sin(r), cx = a[1] || 0, cy = a[2] || 0; t = [c, s2, -s2, c, cx - c * cx + s2 * cy, cy - s2 * cx - c * cy]; }
    else if (f[1] === 'matrix' && a.length === 6) t = a;
    else if (f[1] === 'skewX') t = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
    else if (f[1] === 'skewY') t = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    if (t && t.every(Number.isFinite)) m = matMul(m, t);
  }
  return m;
}
function localBox(n) {
  const a = n.attrs;
  switch (n.tag) {
    case 'rect': return { x0: num(a.x), y0: num(a.y), x1: num(a.x) + num(a.width), y1: num(a.y) + num(a.height) };
    case 'circle': { const r = num(a.r); return { x0: num(a.cx) - r, y0: num(a.cy) - r, x1: num(a.cx) + r, y1: num(a.cy) + r }; }
    case 'ellipse': { const rx = num(a.rx), ry = num(a.ry); return { x0: num(a.cx) - rx, y0: num(a.cy) - ry, x1: num(a.cx) + rx, y1: num(a.cy) + ry }; }
    case 'line': return { x0: Math.min(num(a.x1), num(a.x2)), y0: Math.min(num(a.y1), num(a.y2)), x1: Math.max(num(a.x1), num(a.x2)), y1: Math.max(num(a.y1), num(a.y2)) };
    case 'polygon': case 'polyline': {
      const v = String(a.points || '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (v.length < 4) return null;
      const xs = v.filter((_, i) => i % 2 === 0), ys = v.filter((_, i) => i % 2 === 1);
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }
    case 'path': return pathBox(a.d);
    default: return null;
  }
}
function applyBox(b, m, pad) {
  if (!b) return null;
  const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad };
}
const union = (a, b) => !a ? (b && { ...b }) : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };

/* ---------- style helpers ---------- */
const _styleRe = new Map();
function styleProp(n, prop) {
  const s = n.attrs.style;
  if (!s) return null;
  let re = _styleRe.get(prop);
  if (!re) _styleRe.set(prop, re = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)'));
  const m = re.exec(s);
  return m ? m[1].trim() : null;
}
const classesOf = (n) => (n.attrs.class ? String(n.attrs.class).split(/\s+/).filter(Boolean) : []);
const urlId = (v) => { const m = /^url\(\s*#([^)\s]+)\s*\)$/.exec(String(v || '').trim()); return m ? m[1] : null; };

/** Walk the tree once and annotate every element: effective fill / stroke / opacity, accumulated transform, in <defs>, motion. */
function annotate(parsed) {
  const walk = (n, inh) => {
    for (const c of n.children) {
      const a = c.attrs, cls = classesOf(c);
      let fill = styleProp(c, 'fill') || a.fill || null, stroke = styleProp(c, 'stroke') || a.stroke || null;
      if (fill == null) { const fc = cls.find(k => FILL_CLASSES.has(k)); if (fc) fill = 'class:' + fc; else if (cls.some(k => STROKE_CLASSES.has(k))) fill = 'none'; }
      if (stroke == null) { const sc = cls.find(k => STROKE_CLASSES.has(k)); if (sc) stroke = 'class:' + sc; }
      c.fill = fill != null ? fill : inh.fill;
      c.stroke = stroke != null ? stroke : inh.stroke;
      c.opacity = inh.opacity * (a.opacity != null ? num(a.opacity, 1) : 1);
      c.matrix = a.transform ? matMul(inh.matrix, parseTransform(a.transform)) : inh.matrix;
      c.inDefs = inh.inDefs || DEFS_LIKE.has(c.tag);
      c.cls = cls;
      c.motion = cls.filter(k => /^x-/.test(k));
      c.inMotion = inh.inMotion || c.motion.length > 0;
      walk(c, { fill: c.fill, stroke: c.stroke, opacity: c.opacity, matrix: c.matrix, inDefs: c.inDefs, inMotion: c.inMotion });
    }
  };
  walk(parsed.root, { fill: null, stroke: null, opacity: 1, matrix: [1, 0, 0, 1, 0, 0], inDefs: false, inMotion: false });
}

/* ---------------------------------------------------------------------------------------------
   measure
   --------------------------------------------------------------------------------------------- */
const TINT_RE = /^[a-z]{2,4}-tint$/;
const LIT_RE = /^[a-z]{2,4}-lit(?:-[a-z]+)?$/;
const LAMP_RE = /^[a-z]{2,4}-lamps$/;
const STAR_RE = /^[a-z]{2,4}-star$/;
const LIGHT_CLASS_RE = /^[a-z]{2,4}-(tint|lit|lamps|star)$/;

const _cssClassCache = new Map();
/** The set of class names a css text defines (memoised: the CLI passes the same css for every item). */
export function cssClasses(css) {
  let s = _cssClassCache.get(css);
  if (!s) { s = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(x => x[1])); if (_cssClassCache.size > 8) _cssClassCache.clear(); _cssClassCache.set(css, s); }
  return s;
}

export function measure(markup, kind, opts = {}) {
  const src = String(markup == null ? '' : markup);
  const scene = kind === 'scene';
  const W = scene ? SCENE.w : SMALL.w, H = scene ? SCENE.h : SMALL.h, A = W * H;
  const parsed = parseMarkup(src);
  annotate(parsed);
  const els = parsed.all;
  const m = { kind, bytes: Buffer.byteLength(src) };

  /* --- structure: valid, nothing executable or fetched, ids resolve, motion classes are not overridden --- */
  const problems = [...parsed.problems];
  const ids = [], refs = [];
  for (const e of els) {
    const tl = e.tag.toLowerCase();
    if (FORBIDDEN_TAGS.has(tl)) problems.push(`<${e.tag}> is not allowed`);
    else if (!ALLOWED_TAGS.has(e.tag)) problems.push(`unsupported <${e.tag}>`);
    for (const k in e.attrs) {
      const v = e.attrs[k];
      if (k === 'id') ids.push(v);
      if (k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110) problems.push(`event handler ${k}`);
      if (k === 'href' || k === 'xlink:href') { if (!/^#[\w-]+$/.test(v)) problems.push(`${k} must be an internal #reference`); else refs.push(v.slice(1)); }
      if (v.indexOf(':') >= 0 && /javascript:|vbscript:|data:/i.test(v)) problems.push(`${k} carries a script or data URL`);
      if (v.indexOf('url(') >= 0) for (const u of v.matchAll(/url\(\s*([^)]*)\)/gi)) { const t = u[1].trim(); if (/^#[\w-]+$/.test(t)) refs.push(t.slice(1)); else problems.push(`${k} fetches a url`); }
    }
  }
  if (/NaN|undefined|\[object /.test(src)) problems.push('NaN / undefined / [object] in the markup');
  const idSet = new Set(ids);
  m.problems = [...new Set(problems)];
  const seenIds = new Set(), dup = new Set();
  for (const id of ids) { if (seenIds.has(id)) dup.add(id); seenIds.add(id); }
  m.duplicateIds = [...dup];
  m.danglingRefs = [...new Set(refs.filter(r => !idSet.has(r)))];
  m.xTransformElements = els.filter(e => e.motion.length && (e.attrs.transform != null || /(?:^|;)\s*transform\s*:/.test(e.attrs.style || ''))).length;
  const svgEl = els.find(e => e.tag === 'svg');
  const vb = svgEl && svgEl.attrs.viewBox ? svgEl.attrs.viewBox.trim().split(/\s+/).map(Number) : null;
  m.wrongViewBox = !!vb && (vb[2] !== W || vb[3] !== H);

  /* --- shapes: only painted shapes that are on the canvas count --- */
  const allShapes = els.filter(e => SHAPE_TAGS.has(e.tag) && !e.inDefs);
  m.shapesDeclared = allShapes.length;
  for (const e of allShapes) {
    const strokeOn = e.stroke != null && e.stroke !== 'none';
    const sw = strokeOn ? (e.attrs['stroke-width'] != null ? num(e.attrs['stroke-width'], 1) : /^class:/.test(e.stroke) ? (e.cls.includes('t') ? 3.4 : e.stroke === 'class:lsoft' ? 9 : e.stroke === 'class:lw' ? 1.4 : 2.4) : 1) : 0;
    const lb = localBox(e);
    e.box = lb ? applyBox(lb, e.matrix, sw / 2) : null;
    const fillOn = e.fill !== 'none';
    e.painted = (fillOn || strokeOn) && e.opacity > 0.02 && !!e.box;
    e.onCanvas = e.painted && e.box.x1 > 0 && e.box.x0 < W && e.box.y1 > 0 && e.box.y0 < H && (e.box.x1 - e.box.x0) * (e.box.y1 - e.box.y0) >= 0.5;
    const pb = e.tag === 'path' ? pathBox(e.attrs.d) : null;
    e.segs = pb ? pb.segs : 0;
    e.sig = pb ? pb.sig : '';
  }
  const shapes = allShapes.filter(e => e.onCanvas);
  m.shapes = shapes.length;
  m.hiddenShapes = allShapes.length - shapes.length;
  m.hiddenShare = allShapes.length ? +(m.hiddenShapes / allShapes.length).toFixed(3) : 0;
  m.groups = els.filter(e => e.tag === 'g' && !e.inDefs).length;
  m.paths = shapes.filter(e => e.tag === 'path').length;
  m.pathSegments = shapes.reduce((a, e) => a + e.segs, 0);
  m.bytesPerShape = m.shapes ? Math.round(m.bytes / m.shapes) : 0;
  m.segmentsPerShape = m.shapes ? +(m.pathSegments / m.shapes).toFixed(2) : 0;   // outlines per shape: primitives alone (rect, circle) are cheap
  const w_ = (e) => e.box.x1 - e.box.x0, h_ = (e) => e.box.y1 - e.box.y0, area = (e) => Math.max(0, w_(e)) * Math.max(0, h_(e));

  // Distinct geometry: identical copies do not add to the picture. `distinctShapes` ignores exact repeats;
  // `distinctForms` also ignores the SAME shape drawn at another place (a grid of identical dots is one form).
  const geo = new Set(), forms = new Set();
  for (const e of shapes) {
    const a = e.attrs, sz = (...k) => k.map(q => Math.round(num(a[q]))).join(',');
    const form = e.tag === 'path' ? 'p' + e.sig : e.tag === 'rect' ? 'r' + sz('width', 'height', 'rx') : e.tag === 'circle' ? 'c' + sz('r') : e.tag === 'ellipse' ? 'e' + sz('rx', 'ry') : e.tag + (a.points || [a.x2 - a.x1, a.y2 - a.y1].join(','));
    forms.add(form + '|' + e.fill + '|' + e.stroke + '|' + (a.transform ? a.transform.replace(/translate\([^)]*\)/g, '') : ''));
    geo.add(e.tag + '|' + (e.tag === 'path' ? a.d : [a.cx, a.cy, a.r, a.rx, a.ry, a.x, a.y, a.width, a.height, a.x1, a.y1, a.x2, a.y2, a.points].join(',')) + '|' + e.fill + '|' + (a.transform || ''));
  }
  m.distinctShapes = geo.size;
  m.distinctForms = forms.size;
  m.distinctRatio = m.shapes ? +(geo.size / m.shapes).toFixed(3) : 0;

  /* --- colours: raw, perceptually distinct, and the ones that carry real area --- */
  const colourSrc = [];
  for (const e of els) for (const k of ['fill', 'stroke', 'stop-color']) { const v = styleProp(e, k) || e.attrs[k]; if (v) colourSrc.push(v); }
  const distinct = [...new Set(colourSrc.map(hex6).filter(Boolean))];
  m.colours = distinct.length;
  m.colourClusters = colourClusters(distinct);
  const classFills = new Set(), classStrokes = new Set();
  for (const e of shapes) { if (/^class:/.test(e.fill || '')) classFills.add(e.fill.slice(6)); if (/^class:/.test(e.stroke || '')) classStrokes.add(e.stroke.slice(6)); }
  m.strokeClasses = classStrokes.size;
  m.distinctFills = new Set([...[...classFills].map(c => 'class:' + c), ...shapes.map(e => hex6(e.fill)).filter(Boolean)]).size;

  /* --- vocabulary: a small item paints only with the theme classes (k c s w m, lk lc lm lw ...), never inline colours --- */
  const wrapperTag = (e) => e.tag === 'span' || e.tag === 'svg';
  const known = (c) => /^x-/.test(c) || /^o-[a-z]$/.test(c) || (scene ? /^[a-z]{2,4}-(tint|lit|lit-w|lamps|star|evening)$/.test(c) : (FILL_CLASSES.has(c) || STROKE_CLASSES.has(c) || c === 't' || c === 'dash' || c === 'ap-gr'));
  const unknown = new Set();
  for (const e of els) if (!wrapperTag(e)) for (const c of e.cls) if (!known(c)) unknown.add(c);
  m.unknownClasses = unknown.size;
  m.unknownClassList = [...unknown].sort();
  m.inlinePaint = els.filter(e => !e.inDefs && !wrapperTag(e) && ((e.attrs.fill != null && e.attrs.fill !== 'none') || (e.attrs.stroke != null && e.attrs.stroke !== 'none') || e.attrs['stroke-width'] != null || e.attrs['stroke-linecap'] != null || e.attrs['stroke-linejoin'] != null)).length;

  /* --- gradients --- */
  const grads = els.filter(e => e.tag === 'linearGradient' || e.tag === 'radialGradient');
  const gradById = new Map(grads.map(g => [g.attrs.id, g]));
  m.gradients = grads.length;
  const usedGrad = new Set();
  for (const e of els) for (const k of ['fill', 'stroke']) { const id = urlId(styleProp(e, k) || e.attrs[k]); if (id && gradById.has(id)) usedGrad.add(id); }
  m.gradientsUsed = usedGrad.size;
  m.gradientFilledShapes = shapes.filter(e => gradById.has(urlId(e.fill))).length;
  const fadesOut = (e) => { const g = gradById.get(urlId(e.fill)); return !!g && g.children.some(s => s.attrs['stop-opacity'] != null && num(s.attrs['stop-opacity'], 1) < 0.97); };
  m.translucentLayers = shapes.filter(e => e.opacity < 0.97 || (e.attrs['fill-opacity'] != null && num(e.attrs['fill-opacity'], 1) < 0.97) || fadesOut(e)).length;

  /* --- motion --- */
  const groupBox = (g) => {
    if (SHAPE_TAGS.has(g.tag)) return g.painted ? g.box : null;
    let b = null;
    for (const c of g.children) b = union(b, groupBox(c));
    return b;
  };
  const moversAll = els.filter(e => e.motion.length && !e.inDefs);
  const seesArea = scene ? 16 : 2;
  const movers = [];
  for (const g of moversAll) {
    const b = groupBox(g);
    if (b && b.x1 > 0 && b.x0 < W && b.y1 > 0 && b.y0 < H && (b.x1 - b.x0) * (b.y1 - b.y0) >= seesArea) { g.mbox = b; movers.push(g); }
  }
  m.movingGroups = movers.length;
  m.deadMovers = moversAll.length - movers.length;
  const kinds = new Map();
  for (const e of movers) for (const c of e.motion) { const k = scene ? motionKind(c) : c.replace(/^x-/, ''); kinds.set(k, (kinds.get(k) || 0) + 1); }
  m.motionKinds = kinds.size;
  m.motionKindList = [...kinds.keys()].sort();
  m.staggerDelays = new Set(movers.map(e => (styleProp(e, '--d') || '').trim()).filter(Boolean)).size;
  m.distinctDurations = new Set(movers.map(e => (styleProp(e, '--ad') || '').trim()).filter(Boolean)).size;
  m.motionShare = m.shapes ? +(shapes.filter(e => e.inMotion).length / m.shapes).toFixed(3) : 0;
  m.unstaggered = movers.length >= 3 && m.staggerDelays === 0 ? 1 : 0;
  m.movingPerShape = m.shapes ? +(m.movingGroups / m.shapes).toFixed(3) : 0;

  if (!scene) {
    /* a small item: how much is drawn, how much of the 64 x 64 it fills, how much of it moves */
    if (shapes.length) {
      const b = shapes.reduce((a, e) => union(a, e.box), null);
      m.extentW = +(Math.min(W, b.x1) / W - Math.max(0, b.x0) / W).toFixed(3);
      m.extentH = +(Math.min(H, b.y1) / H - Math.max(0, b.y0) / H).toFixed(3);
    } else { m.extentW = 0; m.extentH = 0; }
    const ic = new Set();
    for (const e of shapes) for (let cy = Math.max(0, Math.floor(e.box.y0 / 8)); cy <= Math.min(7, Math.floor(e.box.y1 / 8)); cy++) for (let cx = Math.max(0, Math.floor(e.box.x0 / 8)); cx <= Math.min(7, Math.floor(e.box.x1 / 8)); cx++) ic.add(cy * 8 + cx);
    m.inkCells = ic.size;
    attachCss(m, els, opts);
    return m;
  }

  /* --- scene composition: layers, where the detail sits, how sizes mix, how the palette behaves --- */
  const isTint = (e) => e.cls.some(c => TINT_RE.test(c));
  const overlay = (e) => isTint(e) || (w_(e) >= W * 0.97 && h_(e) >= H * 0.97);
  const content = shapes.filter(e => !overlay(e));
  m.contentShapes = content.length;
  const detail = content.filter(e => area(e) < A * 0.06);
  m.detailShapes = detail.length;
  m.tinyShare = m.shapes ? +(content.filter(e => area(e) < 60 && w_(e) < 14 && h_(e) < 14).length / m.shapes).toFixed(3) : 0;
  m.shapesPerKB = +(m.shapes / (m.bytes / 1024)).toFixed(2);
  Object.defineProperty(m, '_keys', { value: keysOf(shapes), enumerable: false });   // for sharedShares(): not part of the JSON

  // Depth layers: wide shapes (a ridge, a shore, a street, a haze band) and their tonal progression.
  const bands = content.filter(e => w_(e) >= W * 0.55);
  m.bands = bands.length;
  m.bandFills = new Set(bands.map(e => e.fill)).size;
  // Where the drawing sits: the 16 x 9 cells that hold the centre of a detail shape.
  const cells = new Set(), cols = new Set(), rows = new Set();
  for (const e of detail) {
    const cx = (e.box.x0 + e.box.x1) / 2, cy = (e.box.y0 + e.box.y1) / 2;
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    const c = Math.floor(cx / 100), r = Math.floor(cy / 100);
    cells.add(r * 16 + c); cols.add(c); rows.add(r);
  }
  m.detailCells = cells.size; m.detailColumns = cols.size; m.detailRows = rows.size;
  // Focus: a picture has a subject. The densest 300 x 200 window of the canvas holds this share of all the detail
  // (a shape counts 1 plus its path segments); scattered detail spreads evenly and has no subject.
  const GX = 36, GY = 18, grid = new Float64Array(GX * GY);   // 50 px cells from x = -100
  let totalW = 0;
  for (const e of detail) {
    const cx = (e.box.x0 + e.box.x1) / 2, cy = (e.box.y0 + e.box.y1) / 2, w = 1 + e.segs;
    totalW += w;
    const gx = Math.floor((cx + 100) / 50), gy = Math.floor(cy / 50);
    if (gx >= 0 && gx < GX && gy >= 0 && gy < GY) grid[gy * GX + gx] += w;
  }
  let bestW = 0;
  for (let gy = 0; gy <= GY - 4; gy++) for (let gx = 0; gx <= GX - 6; gx++) {
    let wsum = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) wsum += grid[(gy + j) * GX + gx + i];
    if (wsum > bestW) bestW = wsum;
  }
  m.focusShare = totalW ? +(bestW / totalW).toFixed(3) : 0;

  // Cover-ups: a solid, opaque shape over (nearly) the whole canvas, drawn after the first thing, hides whatever was padded under it.
  const firstShape = shapes[0];
  m.coverUps = shapes.filter(e => e !== firstShape && !isTint(e) && hex6(e.fill) && e.opacity >= 0.97 && !(e.attrs['fill-opacity'] != null && num(e.attrs['fill-opacity'], 1) < 0.97) && w_(e) >= W * 0.9 && h_(e) >= H * 0.9).length;

  // A real picture mixes sizes: big layers, mid-size structures, small details (log2 of the area).
  const sizeBuckets = new Map();
  for (const e of content) { const a = area(e); if (a > 1) { const b = Math.max(0, Math.min(20, Math.floor(Math.log2(a)))); sizeBuckets.set(b, (sizeBuckets.get(b) || 0) + 1); } }
  m.sizeClasses = [...sizeBuckets.values()].filter(v => v >= 3).length;
  // Palette: colours that cover real area; the darkest-to-lightest span; the hue sectors with real painted area (confetti uses them all).
  const byColour = new Map(), hueArea = new Array(12).fill(0);
  let satArea = 0;
  const paint = (c, a) => {
    byColour.set(c, (byColour.get(c) || 0) + a);
    const [r, g, b] = rgbOf(c).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 0.12 || l < 0.12 || l > 0.9 || d / (1 - Math.abs(2 * l - 1)) < 0.25) return;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hueArea[Math.floor(((h * 60) + 360) % 360 / 30) % 12] += a; satArea += a;
  };
  for (const e of content) {
    const a = Math.min(area(e), A), c = hex6(e.fill), g = gradById.get(urlId(e.fill));
    if (c) paint(c, a);
    else if (g) { const st = g.children.filter(s => s.tag === 'stop' && (s.attrs['stop-opacity'] == null || num(s.attrs['stop-opacity'], 1) >= 0.3)).map(s => hex6(styleProp(s, 'stop-color') || s.attrs['stop-color'])).filter(Boolean); for (const sc of st) paint(sc, a / st.length); }
  }
  m.coloursWithArea = [...byColour.values()].filter(v => v >= A * 0.004).length;
  const lums = [...byColour.keys()].map(lumOf);
  m.tonalRange = lums.length ? +(Math.max(...lums) - Math.min(...lums)).toFixed(3) : 0;
  m.hueSectors = satArea ? hueArea.filter(v => v >= satArea * 0.04).length : 0;
  // The ground reaches the bottom edge: shapes touching y >= 880 cover the width.
  const bottom = content.filter(e => e.box.y1 >= H - 20 && w_(e) >= 40).map(e => [Math.max(0, e.box.x0), Math.min(W, e.box.x1)]).sort((p, q) => p[0] - q[0]);
  let covered = 0, edge = 0;
  for (const [a, b] of bottom) if (b > edge) { covered += b - Math.max(a, edge); edge = b; }
  m.bottomCover = +(covered / W).toFixed(3);

  // The sky: the first thing drawn is a rect with a gradient that fills the canvas.
  const first = els.find(e => SHAPE_TAGS.has(e.tag) && !e.inDefs);
  const sg = first && gradById.get(urlId(first.fill));
  m.skyGradient = !!(first && first.tag === 'rect' && sg && first.box && w_(first) >= W * 0.97 && h_(first) >= H * 0.6 && first.box.y0 <= 1);
  m.skyStops = sg ? sg.children.filter(c => c.tag === 'stop').length : 0;

  // The evening grade: a full-canvas rect with the region's -tint class, drawn LAST, and the things it lights.
  const tints = els.filter(e => e.cls.some(c => TINT_RE.test(c)));
  m.eveningGrade = tints.length > 0;
  m.eveningGradeCovers = tints.some(e => e.tag === 'rect' && e.box && w_(e) >= W * 0.97 && h_(e) >= H * 0.97);
  const last = [...els].reverse().find(e => SHAPE_TAGS.has(e.tag) && !e.inDefs);
  m.eveningGradeLast = !!last && last.cls.some(c => TINT_RE.test(c));
  m.eveningLights = els.filter(e => e.cls.some(c => LIT_RE.test(c) || LAMP_RE.test(c) || STAR_RE.test(c))).length;

  // Motion structure: parallax and drift (depth), ambient life (everything that is not sky, light or layers).
  const withKind = (set) => movers.filter(e => e.motion.some(c => set.has(motionKind(c)))).length;
  m.parallaxGroups = withKind(PARALLAX_KINDS);
  m.driftGroups = withKind(new Set([...PARALLAX_KINDS, ...DRIFT_KINDS]));
  m.ambientKinds = [...kinds.keys()].filter(k => !STRUCTURAL_KINDS.has(k)).length;
  m.ambientGroups = movers.filter(e => e.motion.some(c => !STRUCTURAL_KINDS.has(motionKind(c)))).length;
  m.unknownMotion = [...new Set(movers.flatMap(e => e.motion).filter(c => !SCENE_KINDS.has(motionKind(c))))].sort();
  // Does the motion spread over the picture (sky, middle, ground) rather than sit in one strip?
  const zones = new Set();
  for (const g of movers) { const cy = (g.mbox.y0 + g.mbox.y1) / 2; if (cy >= 0 && cy < H) zones.add(Math.floor(cy / (H / 3))); }
  m.motionZones = zones.size;
  attachCss(m, els, opts);
  return m;
}

function attachCss(m, els, opts) {
  if (typeof opts.css !== 'string' && !opts.classes) { m.undefinedClasses = []; return; }
  const defined = opts.classes || cssClasses(opts.css);
  const used = new Set();
  for (const e of els) for (const c of e.cls) if (/^x-/.test(c) || LIGHT_CLASS_RE.test(c)) used.add(c);
  m.undefinedClasses = [...used].filter(c => !defined.has(c)).sort();
}

/* ---------------------------------------------------------------------------------------------
   The composite richness index. One number that is hard to raise by inflating a single count:
   each component is its value over the corpus median, capped, then averaged.
   --------------------------------------------------------------------------------------------- */
export function richness(metrics, spec) {
  const cap = spec.cap || 1.25;
  const parts = Object.entries(spec.components).map(([k, med]) => [k, Math.min(cap, (+metrics[k] || 0) / med)]);
  const index = parts.reduce((s, [, v]) => s + v, 0) / parts.length;
  return { index: +index.toFixed(3), weakest: parts.sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`) };
}

/* ---------------------------------------------------------------------------------------------
   check: thresholds -> failures
   --------------------------------------------------------------------------------------------- */
/** What to do about a failed rule: [fix when below the minimum, fix when above the maximum]. */
export const RULE_HINTS = {
  bytes: ['the drawing is thin: draw more (a scene is 10-32 KB, a small item 0.6-14 KB)', 'over the size budget: simplify, or reuse a kit helper instead of repeating markup'],
  shapes: ['too few shapes: add real structure (terrain, buildings, props, foliage), not specks', 'too many shapes'],
  paths: ['too few hand-shaped paths: build outlines with real contours, not only rect/circle', ''],
  pathSegments: ['the outlines are too simple: give landmarks and terrain real contours (curves, steps, tiers)', ''],
  bytesPerShape: ['the shapes are trivial (bytes per shape): use proper outlines, not tiny primitives', ''],
  shapesPerKB: ['too little drawn for its size: the markup is padded or repeated', ''],
  distinctShapes: ['too few DIFFERENT shapes: identical copies do not count', ''],
  distinctForms: ['too few DIFFERENT forms: the same shape drawn again somewhere else counts once, so give things their own outlines', ''],
  hiddenShare: ['', 'padded with invisible, unpainted or off-canvas shapes'],
  distinctRatio: ['too many copy-pasted shapes: vary the geometry', ''],
  colours: ['palette too small: paint sky, light, shadow and accent tones (a scene uses 27-68 colours)', 'hex colours in a small item: use the theme classes (k c s w m, lk lc lm lw)'],
  colourClusters: ['too few perceptually distinct colours (near-identical shades count once): use a real palette', ''],
  coloursWithArea: ['too few colours cover real area: the palette must be used on large shapes, not only specks', ''],
  distinctFills: ['too few distinct fills', ''],
  tonalRange: ['flat tonal range: add deep shadows (silhouettes) and bright light', ''],
  hueSectors: ['', 'confetti palette: too many unrelated hues carry area; build the picture on 2-4 hue families'],
  gradientsUsed: ['gradients are defined but not used by any fill', ''],
  gradientFilledShapes: ['too few shapes use a gradient fill', ''],
  translucentLayers: ['too few translucent layers: add haze, glow and soft shadow for atmosphere', ''],
  skyStops: ['the sky gradient needs 3+ colour stops', ''],
  bands: ['too few wide depth layers (ridges, shores, streets, haze): layer far to near', ''],
  bandFills: ['the wide layers share too few colours: give depth a tonal progression', ''],
  detailShapes: ['too few detail shapes', ''],
  detailCells: ['detail is bunched up: spread it over the canvas (cells of 100 x 100 holding detail)', ''],
  detailColumns: ['detail covers too few columns of the canvas: it must span the width', ''],
  detailRows: ['detail covers too few rows of the canvas: sky, middle and ground all need it', ''],
  unknownClasses: ['', 'classes outside the vocabulary (items: k c s w m, ln lk lc lm lw lsoft, t, dash, o-*, x-*; scenes: x-*, o-*, the kit tint/lit/lamps/star): they are not styled'],
  inlinePaint: ['', 'inline fill / stroke colours or stroke widths: a small item paints with the theme classes (k c s w m lk lc lm lw, t) so dark mode and the themes work'],
  gradients: ['too few gradients: sky, light glow, haze, water and terrain are all gradients', 'gradients in a small item: it is flat theme-coloured art'],
  focusShare: ['the detail has no focus: scattered evenly over the canvas, with no subject. Build one landmark or cluster of detail the eye goes to', ''],
  segmentsPerShape: ['the shapes are mostly primitives (rect, circle, ellipse): shape real outlines with paths', ''],
  sizeClasses: ['sizes do not mix: a picture has big layers, mid-size structures and small details', ''],
  tinyShare: ['', 'padded with specks: too large a share of the shapes are tiny'],
  bottomCover: ['the ground does not reach the bottom edge: something must fill the foot of the canvas', ''],
  hiddenShapes: ['', 'padded with invisible or off-canvas shapes'],
  coverUps: ['', 'a solid opaque shape covers the whole canvas after the first layer: it hides what is under it'],
  sharedShare: ['', 'too much of this scene is identical to another scene of the pack: draw its own picture, do not re-dress a template'],
  sharedShareAll: ['', 'too much of this scene is copied unchanged from other scenes: draw its own picture'],
  movingGroups: ['too little moves: add parallax clouds, birds, shimmer, smoke, sway', ''],
  motionKinds: ['too few kinds of motion: mix drift, glide, shimmer, puff, sway, flicker ...', ''],
  driftGroups: ['too few drifting groups (clouds, haze, parallax layers)', ''],
  parallaxGroups: ['no parallax layer', ''],
  ambientGroups: ['too little ambient life (birds, shimmer, smoke, flags, swaying, falling things)', ''],
  ambientKinds: ['too few kinds of ambient life', ''],
  motionZones: ['motion sits in one strip: spread the life over sky, middle and ground', ''],
  distinctDurations: ['everything moves in lockstep: vary the --ad durations', ''],
  staggerDelays: ['no staggering: give moving elements different --d delays', ''],
  movingPerShape: ['too small a part of the drawing moves', 'far too much is animated: the stillness is lost'],
  motionShare: ['too little of the drawing is inside a moving group', 'everything moves: keep the base still'],
  unstaggered: ['', 'three or more things move with no --d stagger: they pulse in lockstep'],
  deadMovers: ['', 'moving groups with nothing visible inside'],
  extentW: ['the drawing does not fill the width of the 64 x 64 frame', ''],
  extentH: ['the drawing does not fill the height of the 64 x 64 frame', ''],
  inkCells: ['the drawing covers too little of the frame (cells of 8 x 8 holding ink)', ''],
};
function ruleMessage(metric, v, t, side) {
  const h = RULE_HINTS[metric], lim = side === 'min' ? t.min : t.max;
  const text = h && h[side === 'min' ? 0 : 1];
  return `${metric} ${v} ${side === 'min' ? '<' : '>'} ${lim}${text ? ': ' + text : ''}`;
}

/**
 * Check measured metrics against a profile of the thresholds file. `profile` is a key of the thresholds
 * ('scene', 'item', 'item-classic'); the structural rules always apply. Returns failures, [] when it passes.
 */
export function check(metrics, profile, thresholds) {
  const spec = thresholds && thresholds[profile];
  if (!spec) throw new Error(`no thresholds for "${profile}"`);
  const m = metrics, scene = m.kind === 'scene', out = [];
  const fail = (rule, message, value, extra) => out.push(Object.assign({ rule, message, value }, extra));
  if (m.problems.length) fail('structure', 'Invalid markup: ' + m.problems.slice(0, 4).join('; '), m.problems.length, { max: 0 });
  if (m.duplicateIds.length) fail('unique-ids', 'Duplicate ids: ' + m.duplicateIds.slice(0, 4).join(', '), m.duplicateIds.length, { max: 0 });
  if (m.danglingRefs.length) fail('refs-resolve', 'url(#id) / href points at nothing: ' + m.danglingRefs.slice(0, 4).join(', '), m.danglingRefs.length, { max: 0 });
  if (m.xTransformElements) fail('x-transform', 'A transform sits on an element with an x-* class (its animation would replace it): wrap the element in <g transform="...">', m.xTransformElements, { max: 0 });
  if (m.wrongViewBox) fail('viewbox', `The viewBox must be 0 0 ${scene ? '1600 900' : '64 64'}`, 1, { max: 0 });
  if (m.undefinedClasses && m.undefinedClasses.length) fail('classes-defined', 'Classes with no css rule (they would not animate or light up): ' + m.undefinedClasses.slice(0, 5).join(', '), m.undefinedClasses.length, { max: 0 });
  if (scene) {
    if (!m.skyGradient) fail('sky-gradient', 'The first thing drawn must be a full-canvas rect filled with a sky gradient (full(`url(#sky)`))', 0, { min: 1 });
    if (!m.eveningGrade) fail('evening-grade', "No evening-grade tint: end the scene with the kit's finish(): a full-canvas rect with the region's -tint class", 0, { min: 1 });
    else if (!m.eveningGradeCovers) fail('evening-grade', 'The tint layer does not cover the whole 1600 x 900 canvas', 0, { min: 1 });
    else if (!m.eveningGradeLast) fail('evening-grade-last', 'The tint layer must be the LAST thing drawn: it grades everything under it', 0, { min: 1 });
  }
  for (const [metric, t] of Object.entries(spec)) {
    if (metric.startsWith('_') || t == null || typeof t !== 'object') continue;
    if (metric === 'richness') {
      const r = richness(m, t);
      if (t.min != null && r.index < t.min) fail('richness', `richness ${r.index} < ${t.min} (1.0 = the median accepted ${scene ? 'scene' : 'item'}); the thinnest parts: ${r.weakest.join(', ')}`, r.index, { min: t.min });
      continue;
    }
    const v = m[metric];
    if (typeof v !== 'number') continue;
    const detail = metric === 'unknownClasses' && m.unknownClassList.length ? ` (${m.unknownClassList.slice(0, 6).join(', ')})` : '';
    if (t.min != null && v < t.min) fail(metric, ruleMessage(metric, v, t, 'min') + detail, v, { min: t.min });
    if (t.max != null && v > t.max) fail(metric, ruleMessage(metric, v, t, 'max') + detail, v, { max: t.max });
  }
  return out;
}

/** measure + check in one call. */
export function lintMarkup(markup, profile, thresholds, opts = {}) {
  const metrics = measure(markup, profile.startsWith('scene') ? 'scene' : 'item', opts);
  return { metrics, failures: check(metrics, profile, thresholds) };
}

/** Which thresholds profile an item is judged by: 'scene' / 'item' (the strict ones, every new pack), or the legacy 'scene-legacy' / 'item-classic' for the frozen list of packs calibrated on their own older corpus. */
export function profileFor(it, thresholds) {
  const prof = (thresholds && thresholds.profiles) || {};
  const legacy = (name) => (prof[name] && prof[name].packs || []).includes(it.pack);
  if (it.full) return legacy('scene-legacy') ? 'scene-legacy' : 'scene';
  return legacy('item-classic') ? 'item-classic' : 'item';
}

/** Split failures into the ones still failing and the ones waived (thresholds.waivers: [{ref, rule, reason}]). */
export function applyWaivers(failures, ref, thresholds) {
  const w = ((thresholds && thresholds.waivers) || []).filter(x => x.ref === ref);
  const waived = failures.filter(f => w.some(x => x.rule === f.rule));
  return { failures: failures.filter(f => !waived.includes(f)), waived };
}

/**
 * A pack's css: motion keyframes move transform and opacity only (compositor-friendly, and the repo rule),
 * and nothing is fetched. Returns failures like check().
 */
export function checkCss(css) {
  const out = [];
  const text = String(css || '');
  for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    const bad = new Set();
    for (const b of m[2].matchAll(/\{([^{}]*)\}/g)) for (const d of b[1].split(';')) { const k = d.split(':')[0].trim(); if (k && !/^(transform|opacity|animation-timing-function)$/.test(k) && !k.startsWith('--')) bad.add(k); }
    if (bad.size) out.push({ rule: 'css-motion', message: `@keyframes ${m[1]} animates ${[...bad].join(', ')}: motion may only change transform and opacity`, value: bad.size, max: 0 });
  }
  if (/@import|url\(\s*['"]?(?!#)/i.test(text)) out.push({ rule: 'css-fetch', message: 'the pack css must not @import or load url() resources', value: 1, max: 0 });
  return out;
}

/* ---------------------------------------------------------------------------------------------
   Calibration: which metrics are rules, and how thresholds are proposed from a corpus.
   The thresholds file (tools/anim-quality.json) is the result; `node tools/anim-pack.mjs calibrate`
   shows how every threshold compares with the corpus today.
   --------------------------------------------------------------------------------------------- */
const MIN = ['min'], MAX = ['max'], BOTH = ['min', 'max'];
/** The rules of each profile: metric -> which sides are limited. Keys of the thresholds file. */
export const RULE_PLAN = {
  scene: {
    bytes: BOTH, shapes: MIN, paths: MIN, pathSegments: MIN, segmentsPerShape: MIN, bytesPerShape: MIN, shapesPerKB: MIN, distinctShapes: MIN, distinctForms: MIN, distinctRatio: MIN,
    colours: MIN, colourClusters: MIN, coloursWithArea: MIN, tonalRange: MIN, hueSectors: MAX,
    gradients: MIN, gradientsUsed: MIN, gradientFilledShapes: MIN, translucentLayers: MIN, skyStops: MIN,
    bands: MIN, bandFills: MIN, detailShapes: MIN, detailCells: MIN, detailColumns: MIN, detailRows: MIN, focusShare: MIN, sizeClasses: MIN, tinyShare: MAX, hiddenShare: MAX, bottomCover: MIN,
    movingGroups: MIN, motionKinds: MIN, driftGroups: MIN, ambientGroups: MIN, ambientKinds: MIN, motionZones: MIN, distinctDurations: MIN, staggerDelays: MIN, movingPerShape: BOTH,
    sharedShare: MAX, sharedShareAll: MAX, unknownClasses: MAX, coverUps: MAX, richness: MIN,
  },
  item: {
    bytes: BOTH, shapes: MIN, paths: MIN, pathSegments: MIN, distinctShapes: MIN, distinctForms: MIN, distinctFills: MIN, inkCells: MIN, extentW: MIN, extentH: MIN,
    colours: MAX, gradients: MAX, inlinePaint: MAX, unknownClasses: MAX,
    movingGroups: MIN, motionKinds: MIN, motionShare: MIN, hiddenShapes: MAX, richness: MIN,
  },
};
RULE_PLAN['scene-legacy'] = RULE_PLAN.scene;
RULE_PLAN['item-classic'] = RULE_PLAN.item;
/** Components of the composite richness index, per metrics kind. */
export const RICHNESS_COMPONENTS = {
  scene: ['shapes', 'pathSegments', 'colourClusters', 'gradients', 'translucentLayers', 'movingGroups', 'motionKinds', 'ambientGroups', 'bands', 'detailCells', 'sizeClasses', 'distinctForms', 'bytes'],
  item: ['shapes', 'pathSegments', 'distinctForms', 'movingGroups', 'inkCells', 'bytes'],
};

/** min / p3 / median / max of a list of numbers. */
export function describe(values) {
  const a = values.map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  const at = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  return { n: a.length, min: a[0], p3: at(0.03), p10: at(0.1), p25: at(0.25), median: at(0.5), p90: at(0.9), max: a[a.length - 1] };
}
const round = (v, down) => { const f = Math.abs(v) >= 10 ? 1 : 1000; return (down ? Math.floor(v * f) : Math.ceil(v * f)) / f; };

/**
 * Propose a profile's thresholds from the metrics of its corpus: every limit sits AT the corpus floor (or ceiling),
 * so everything in the corpus passes. `caps` fixes the hard ceilings (bytes). `richnessMin` sets the composite floor.
 */
export function proposeThresholds(corpus, profile, { caps = {}, richnessMin } = {}) {
  const kind = profile.startsWith('scene') ? 'scene' : 'item';
  const out = {};
  for (const [metric, sides] of Object.entries(RULE_PLAN[profile])) {
    if (metric === 'richness') {
      const comps = {};
      for (const k of RICHNESS_COMPONENTS[kind]) comps[k] = Math.max(1, describe(corpus.map(m => m[k])).median);
      const idx = corpus.map(m => richness(m, { components: comps, cap: 1.25 }).index);
      const d = describe(idx);
      out.richness = { min: richnessMin != null ? richnessMin : round(d.min, true), warnMin: round(d.p10, true), median: d.median, cap: 1.25, components: comps, note: `composite of ${Object.keys(comps).join(', ')}, each capped at 125% of its corpus median; corpus index n=${d.n}: min ${d.min}, p3 ${d.p3}, p10 ${d.p10}, median ${d.median}, max ${d.max}` };
      continue;
    }
    const d = describe(corpus.map(m => m[metric]));
    const t = {};
    if (sides.includes('min')) { t.min = round(d.min, true); t.warnMin = round(d.p10, true); }
    if (sides.includes('max')) { t.max = caps[metric] != null ? caps[metric] : round(d.max, false); t.warnMax = round(d.p90, false); }
    t.median = d.median;
    t.note = `corpus n=${d.n}: min ${d.min}, p3 ${d.p3}, p10 ${d.p10}, median ${d.median}, p90 ${d.p90}, max ${d.max}`;
    out[metric] = t;
  }
  return out;
}

/**
 * The per-rule table of a check: [{rule, value, limit, ok}] for every structural rule and every threshold of the
 * profile, so a tool can print PASS / FAIL for each. `failures` is check()'s result for the same metrics.
 */
export function ruleTable(metrics, profile, thresholds, failures = check(metrics, profile, thresholds)) {
  const spec = thresholds[profile], m = metrics, scene = m.kind === 'scene';
  const bad = new Set(failures.map(f => f.rule));
  const rows = [];
  const row = (rule, value, limit) => rows.push({ rule, value, limit, ok: !bad.has(rule) });
  row('structure', m.problems.length, '= 0');
  row('unique-ids', m.duplicateIds.length, '= 0');
  row('refs-resolve', m.danglingRefs.length, '= 0');
  row('x-transform', m.xTransformElements, '= 0');
  row('viewbox', m.wrongViewBox ? 1 : 0, '= 0');
  row('classes-defined', (m.undefinedClasses || []).length, '= 0');
  if (scene) {
    row('sky-gradient', m.skyGradient ? 1 : 0, '= 1');
    row('evening-grade', m.eveningGrade && m.eveningGradeCovers ? 1 : 0, '= 1');
    row('evening-grade-last', m.eveningGradeLast ? 1 : 0, '= 1');
  }
  for (const [metric, t] of Object.entries(spec)) {
    if (metric.startsWith('_') || t == null || typeof t !== 'object') continue;
    const v = metric === 'richness' ? richness(m, t).index : m[metric];
    const lim = [t.min != null ? `>= ${t.min}` : '', t.max != null ? `<= ${t.max}` : ''].filter(Boolean).join(' and ');
    row(metric, v, lim);
  }
  return rows;
}

/** The exact shapes of a drawing as a set of keys: geometry and position, not paint. */
function keysOf(shapes) {
  const keys = new Set();
  for (const e of shapes) {
    const a = e.attrs;
    const geo = e.tag === 'path' ? a.d : [a.cx, a.cy, a.r, a.rx, a.ry, a.x, a.y, a.width, a.height, a.x1, a.y1, a.x2, a.y2, a.points].join(',');
    keys.add(e.tag + '|' + geo + '|' + (a.transform || ''));   // paint is left out on purpose: a re-coloured copy is still a copy
  }
  return keys;
}
/** shapeKeys(markup): the keys of a drawing. Two scenes that share many keys are the same picture re-dressed: see sharedShares(). */
export function shapeKeys(markup) {
  const parsed = parseMarkup(String(markup));
  annotate(parsed);
  return keysOf(parsed.all.filter(e => SHAPE_TAGS.has(e.tag) && !e.inDefs));
}
/**
 * For a list of {pack, keys} (one per scene): the share (0..1) of each scene's shapes that appear unchanged in at least one
 * OTHER scene of its own pack (`pack`) or of any pack (`all`). Hand-drawn scenes share a few percent (a window, a bird);
 * a templated pack, or a scene copied and re-coloured, shares most of them.
 */
export function sharedShares(list) {
  const all = new Map(), perPack = new Map();
  for (const r of list) {
    const pk = perPack.get(r.pack) || perPack.set(r.pack, new Map()).get(r.pack);
    for (const k of r.keys) { all.set(k, (all.get(k) || 0) + 1); pk.set(k, (pk.get(k) || 0) + 1); }
  }
  return list.map(r => {
    let a = 0, p = 0;
    const pk = perPack.get(r.pack);
    for (const k of r.keys) { if (all.get(k) > 1) a++; if (pk.get(k) > 1) p++; }
    const n = r.keys.size || 1;
    return { pack: +(p / n).toFixed(3), all: +(a / n).toFixed(3) };
  });
}

/**
 * Advisory, not a failure: the metrics where a drawing that PASSES is still thinner than 90 % of the accepted corpus
 * (below warnMin), or looks padded (above warnMax of a padding rule). Returns [{rule, side, value, warn, median}], worst
 * first: where to add richness. A size budget (bytes) is not padding, so it is never listed above its ceiling.
 */
export function thinSpots(metrics, profile, thresholds) {
  const spec = thresholds[profile], out = [];
  for (const [metric, t] of Object.entries(spec)) {
    if (metric.startsWith('_') || t == null || typeof t !== 'object') continue;
    const v = metric === 'richness' ? richness(metrics, t).index : metrics[metric];
    if (typeof v !== 'number') continue;
    const med = t.median || 1;
    if (t.warnMin != null && v < t.warnMin && (t.min == null || v >= t.min)) out.push({ rule: metric, side: 'low', value: v, warn: t.warnMin, median: t.median, gap: (t.warnMin - v) / med });
    if (metric !== 'bytes' && t.warnMax != null && v > t.warnMax && (t.max == null || v <= t.max)) out.push({ rule: metric, side: 'high', value: v, warn: t.warnMax, median: t.median, gap: (v - t.warnMax) / med });
  }
  return out.sort((a, b) => b.gap - a.gap).map(({ gap, ...x }) => x);
}
