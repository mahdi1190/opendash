/* ============================================================
   SCENE ENGINE: the SVG-subset parser and the nature-kit adapter
   (docs/dev/SCENE_ENGINE.md, section 2.3). PURE classic script: no DOM,
   nothing runs at load except the constant tables below.

   sceneShapesFromSvg(markup, { parts, flatten, bb })
       -> { parts: { name: [Shape] }, order: [name], anim: [AnimTemplate] }
     Reads the markup the nature kit (and, with flatten, a hand-drawn region
     scene) produces: <defs>, <g id>, <use href="#id" transform>, <g transform
     fill color opacity class style>, <path>, <circle>, <ellipse>, <rect>,
     <polygon>, <polyline>, <line>, fill-opacity / stroke-opacity, stroke*,
     currentColor, linearGradient / radialGradient (userSpaceOnUse or the
     bounding box, href inheritance). Transforms accumulate into the shape's
     `m` matrix [a, b, c, d, e, f]. Clip paths, masks, patterns and filters
     are ignored (the shape is kept, unclipped). Anything else throws with
     the tag, so `object lint` names it.
     Shapes inside an x-ukn<cls> group go to the part KIT_PARTS[cls] maps it
     to (a second group of the same kind gets the part name kind + '2' ...);
     the group's transform-origin becomes the hook's pivot. Travel and
     particle wrappers (pace, drift, glide ...) are flattened at their rest
     position. opts.parts maps a kit class to another part name.
     flatten: true (landmark extraction from a hand-drawn region scene,
     section 16.3): EVERY motion wrapper is flattened at rest; shapes in a
     us-lit / tx-lit / hx-lit group get glow 'window', in a us-lamps /
     tx-lamps group glow 'lamp'; star and tint groups are dropped; every
     shape carries `bb` (its world bounding box, approximate).
   scenePathPts(d) / scenePathBox(d, m)
       the points of a path (end and control points; arcs add their radius
       box) and its bounding box through a matrix: used by the parser, the
       object lint and the upgrade tool.
   sceneObjFromKit(def)
       sceneObjDefine with a build() that calls the kit (lazily, on the
       'obj' kit instance, never K.live) and parses its markup. The parsed
       hooks are returned with the parts under the reserved key `$anim`.
   ============================================================ */
const KIT_PARTS = Object.freeze({
  tree: 'sway', gust: 'sway', gust2: 'sway', gust3: 'sway', sway: 'sway', weep: 'sway',
  leg: 'walk', arm: 'walk', step: 'bob',
  bob: 'bob',
  flap: 'flap', wing: 'flap',
  tail: 'turn', wag: 'turn', ear: 'turn', look: 'turn', peck: 'turn', nibble: 'turn', graze: 'turn',
  glow: 'flicker', twinkle: 'flicker', shim: 'flicker',
  spin: 'spin',
});
/** Kit travel and particle classes: flattened at rest (actors and particles move things in a composed scene). */
const SCENE_KIT_FLATTEN = Object.freeze(['pace', 'drift', 'glide', 'dart', 'hop', 'leap', 'flit', 'buzz', 'fall', 'snow', 'wake', 'splash', 'ring', 'wobble', 'shaft', 'flutter']);

const sceneShapesFromSvg = (function () {
  const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  const r2 = (v) => Math.round(v * 100) / 100;
  const IDENT = [1, 0, 0, 1, 0, 0];
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const isIdent = (m) => !m || (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0);
  const apply = (m, x, y) => (m ? [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] : [x, y]);

  /** An SVG transform list -> matrix. */
  function parseTransform(t) {
    let m = IDENT.slice();
    if (!t) return m;
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    let hit = false;
    for (const [, fn, args] of String(t).matchAll(re)) {
      hit = true;
      const a = (args.match(NUM) || []).map(Number);
      let n;
      if (fn === 'matrix') n = a.length === 6 ? a : IDENT;
      else if (fn === 'translate') n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
      else if (fn === 'scale') n = [a[0] == null ? 1 : a[0], 0, 0, a[1] == null ? (a[0] == null ? 1 : a[0]) : a[1], 0, 0];
      else if (fn === 'rotate') {
        const r = (a[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        n = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
      } else if (fn === 'skewX') n = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
      else n = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
      m = mul(m, n);
    }
    if (!hit && String(t).trim()) throw new Error(`sceneShapesFromSvg: cannot read transform "${t}"`);
    return m;
  }

  const pathBox = (d, m) => scenePathBox(d, m);

  /* ---------- a tiny XML reader (the subset our generators write) ---------- */
  const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  function parseXml(src) {
    const root = { tag: '#root', attrs: {}, kids: [] }, stack = [root];
    const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|(<)/g;
    for (const m of String(src).matchAll(re)) {
      if (m[0].startsWith('<!--')) continue;
      if (m[6]) throw new Error('sceneShapesFromSvg: stray "<" in the markup');
      if (m[5] != null) { if (m[5].trim()) { const top = stack[stack.length - 1]; if (!/^(title|desc|style)$/.test(top.tag)) throw new Error(`sceneShapesFromSvg: text in <${top.tag}> ("${m[5].trim().slice(0, 20)}"): drawings carry no text`); } continue; }
      const [, close, tag, attrText, self] = m;
      if (close) {
        const top = stack.pop();
        if (!top || top.tag !== tag) throw new Error(`sceneShapesFromSvg: </${tag}> closes <${top ? top.tag : '?'}>`);
        continue;
      }
      const attrs = {};
      for (const a of (attrText || '').matchAll(ATTR)) attrs[a[1]] = unesc(a[2] != null ? a[2] : a[3]);
      const node = { tag, attrs, kids: [] };
      stack[stack.length - 1].kids.push(node);
      if (!self) stack.push(node);
    }
    if (stack.length !== 1) throw new Error(`sceneShapesFromSvg: <${stack[stack.length - 1].tag}> is never closed`);
    return root;
  }
  const styleOf = (attrs) => {
    const o = {};
    if (attrs.style) for (const part of attrs.style.split(';')) { const k = part.indexOf(':'); if (k > 0) o[part.slice(0, k).trim()] = part.slice(k + 1).trim(); }
    return o;
  };
  const PRESENT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-dasharray', 'color', 'fill-opacity', 'stroke-opacity'];
  const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
  const hex6 = (c) => { const s = String(c).toLowerCase(); return s.length === 4 ? '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s; };
  const NAMED = { white: '#ffffff', black: '#000000', none: 'none', transparent: 'none' };

  const SKIP = new Set(['clipPath', 'mask', 'pattern', 'filter', 'title', 'desc', 'style', 'symbol', 'metadata', 'marker']);
  const CONTAINERS = new Set(['#root', 'svg', 'g', 'a', 'span', 'switch']);
  const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line']);

  function shapeD(n) {
    const a = n.attrs, f = (k, d = 0) => (a[k] == null ? d : Number(String(a[k]).replace(/px$/, '')));
    const R = (v) => r2(v);
    switch (n.tag) {
      case 'path': return a.d || '';
      case 'circle': { const r = f('r'), cx = f('cx'), cy = f('cy'); return r > 0 ? `M${R(cx - r)} ${R(cy)}a${R(r)} ${R(r)} 0 1 0 ${R(2 * r)} 0a${R(r)} ${R(r)} 0 1 0 ${R(-2 * r)} 0z` : ''; }
      case 'ellipse': { const rx = f('rx'), ry = f('ry'), cx = f('cx'), cy = f('cy'); return rx > 0 && ry > 0 ? `M${R(cx - rx)} ${R(cy)}a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0z` : ''; }
      case 'rect': {
        const x = f('x'), y = f('y'), w = a.width == null ? 0 : f('width'), h = a.height == null ? 0 : f('height');
        if (!(w > 0 && h > 0)) return '';
        let rx = a.rx != null ? f('rx') : a.ry != null ? f('ry') : 0, ry = a.ry != null ? f('ry') : rx;
        rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
        if (!rx || !ry) return `M${R(x)} ${R(y)}h${R(w)}v${R(h)}h${R(-w)}z`;
        return `M${R(x + rx)} ${R(y)}h${R(w - 2 * rx)}a${R(rx)} ${R(ry)} 0 0 1 ${R(rx)} ${R(ry)}v${R(h - 2 * ry)}a${R(rx)} ${R(ry)} 0 0 1 ${R(-rx)} ${R(ry)}h${R(2 * rx - w)}a${R(rx)} ${R(ry)} 0 0 1 ${R(-rx)} ${R(-ry)}v${R(2 * ry - h)}a${R(rx)} ${R(ry)} 0 0 1 ${R(rx)} ${R(-ry)}z`;
      }
      case 'polygon': case 'polyline': {
        const p = (a.points || '').match(NUM) || [];
        if (p.length < 4) return '';
        let d = `M${p[0]} ${p[1]}`;
        for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
        return n.tag === 'polygon' ? d + 'z' : d;
      }
      case 'line': return `M${f('x1')} ${f('y1')}L${f('x2')} ${f('y2')}`;
      default: return '';
    }
  }

  return function sceneShapesFromSvg(markup, opts = {}) {
    const flatten = !!opts.flatten, withBb = flatten || !!opts.bb;
    const remap = (opts.parts && !Array.isArray(opts.parts) && typeof opts.parts === 'object') ? opts.parts : {};
    const doc = parseXml(markup);
    const ids = new Map();
    const index = (n) => { if (n.attrs.id) ids.set(n.attrs.id, n); for (const k of n.kids) index(k); };
    index(doc);

    // gradients -> paint objects (stops inherited through href)
    const gradCache = new Map();
    function gradient(id, bbox) {
      const g = ids.get(id);
      if (!g || !/^(linearGradient|radialGradient)$/.test(g.tag)) return null;
      const chain = [];
      for (let n = g, k = 0; n && k < 8; k++) { chain.push(n); const h = n.attrs.href || n.attrs['xlink:href']; n = h ? ids.get(h.replace(/^#/, '')) : null; }
      const attr = (k) => { for (const n of chain) if (n.attrs[k] != null) return n.attrs[k]; return null; };
      const stopsNode = chain.find(n => n.kids.some(k => k.tag === 'stop'));
      const stops = stopsNode ? stopsNode.kids.filter(k => k.tag === 'stop').map(s => {
        const st = styleOf(s.attrs), off = String(s.attrs.offset != null ? s.attrs.offset : st.offset || 0);
        const o = off.endsWith('%') ? parseFloat(off) / 100 : Number(off);
        let c = s.attrs['stop-color'] || st['stop-color'] || '#000000';
        c = NAMED[c] || c;
        if (!HEX.test(c)) throw new Error(`sceneShapesFromSvg: gradient ${id} has a stop colour "${c}" (use #rrggbb)`);
        const op = s.attrs['stop-opacity'] != null ? Number(s.attrs['stop-opacity']) : st['stop-opacity'] != null ? Number(st['stop-opacity']) : null;
        return op != null && op !== 1 ? [r4(o), hex6(c), r4(op)] : [r4(o), hex6(c)];
      }) : [];
      if (!stops.length) return null;
      if (attr('gradientTransform')) throw new Error(`sceneShapesFromSvg: gradient ${id} has a gradientTransform (not supported)`);
      const user = attr('gradientUnits') === 'userSpaceOnUse';
      const num = (k, d) => { const v = attr(k); if (v == null) return d; const s = String(v); return s.endsWith('%') ? parseFloat(s) / 100 : Number(s); };
      const key = id + (user ? '' : '|' + (bbox || []).join(','));
      if (gradCache.has(key)) return gradCache.get(key);
      const bx = (u) => (user || !bbox ? u : bbox[0] + u * (bbox[2] - bbox[0]));
      const by = (u) => (user || !bbox ? u : bbox[1] + u * (bbox[3] - bbox[1]));
      let paint;
      if (g.tag === 'linearGradient') paint = { lin: stops, x1: r2(bx(num('x1', 0))), y1: r2(by(num('y1', 0))), x2: r2(bx(num('x2', user ? 0 : 1))), y2: r2(by(num('y2', 0))) };
      else {
        const r = num('r', 0.5);
        paint = { rad: stops, cx: r2(bx(num('cx', 0.5))), cy: r2(by(num('cy', 0.5))), r: r2(user || !bbox ? r : r * Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1])) };
      }
      gradCache.set(key, paint);
      return paint;
    }
    function paintOf(v, st, bboxLocal) {
      if (v == null) return null;
      let s = String(v).trim();
      if (s === 'currentColor') s = st.color || '#000000';
      s = NAMED[s] || s;
      if (s === 'none') return null;
      const u = /^url\(\s*#([^)\s]+)\s*\)/.exec(s);
      if (u) return gradient(u[1], bboxLocal);
      if (!HEX.test(s)) throw new Error(`sceneShapesFromSvg: colour "${s}" (use #rrggbb, currentColor or a gradient)`);
      return hex6(s);
    }

    const parts = {}, order = [], anim = [], kindCount = {};
    const partFor = (st) => st.part || 'body';
    const addShape = (st, sh) => {
      const p = partFor(st);
      if (!parts[p]) { parts[p] = []; order.push(p); }
      parts[p].push(sh);
    };

    function visit(n, st, depth) {
      if (depth > 40) throw new Error('sceneShapesFromSvg: nesting deeper than 40 (a <use> loop?)');
      const tag = n.tag;
      if (tag === 'defs' || tag === 'linearGradient' || tag === 'radialGradient' || tag === 'stop' || SKIP.has(tag)) return;
      if (!CONTAINERS.has(tag) && !SHAPES.has(tag) && tag !== 'use') throw new Error(`sceneShapesFromSvg: <${tag}> is not supported`);
      const a = n.attrs, css = styleOf(a);
      if (a.display === 'none' || css.display === 'none' || a.visibility === 'hidden') return;
      const cls = String(a.class || '').split(/\s+/).filter(Boolean);
      // flatten mode: star and tint groups are dropped
      if (flatten && cls.some(c => /^(us|tx|hx)-(star|tint)$/.test(c))) return;
      const s2 = Object.assign({}, st);
      for (const k of PRESENT) { const v = css[k] != null ? css[k] : a[k]; if (v != null) s2[k] = v; }
      if (s2.color === 'currentColor') s2.color = st.color;
      const op = Number(css.opacity != null ? css.opacity : a.opacity != null ? a.opacity : 1);
      s2.op = (st.op == null ? 1 : st.op) * (Number.isFinite(op) ? op : 1);
      let m = st.m || IDENT;
      if (a.transform) m = mul(m, parseTransform(a.transform));
      if (tag === 'use' && (a.x || a.y)) m = mul(m, [1, 0, 0, 1, Number(a.x || 0), Number(a.y || 0)]);
      s2.m = m;
      // glow classes (hand-drawn lit windows and lamps; the kit's hx-lit portholes)
      if (cls.some(c => /^(us|tx|hx)-lit(-w)?$/.test(c))) s2.glow = 'window';
      if (cls.some(c => /^(us|tx)-lamps$/.test(c))) s2.glow = 'lamp';
      // motion wrappers
      for (const c of cls) {
        const mk = /^x-ukn([a-z]+?)(\d*)$/.exec(c);   // any other motion class (x-us*, x-uk*, x-tx*) is flattened at rest
        if (mk && !flatten) {
          const kcls = mk[1], kind = KIT_PARTS[kcls];
          if (!kind || SCENE_KIT_FLATTEN.includes(kcls)) continue;   // a travel or particle wrapper: flattened at rest
          const limb = kind === 'walk' ? (kcls === 'arm' ? 'arm' : 'leg') : null;   // legs and arms: one walk hook per pair
          const n0 = (kindCount[limb || kind] = (kindCount[limb || kind] || 0) + 1);
          const name = remap[kcls] || (limb ? limb + String.fromCharCode(64 + n0) : n0 === 1 ? kind : kind + n0);
          const org = /([-\d.]+)px\s+([-\d.]+)px/.exec(css['transform-origin'] || '');
          const pv = org ? apply(st.m, Number(org[1]), Number(org[2])) : null;
          const pivot = pv ? [r2(pv[0]), r2(pv[1])] : [0, 0];
          const ad = /([\d.]+)s/.exec(css['--ad'] || '');
          if (limb) {
            let t = anim.find(x => x.kind === 'walk' && x.limb === limb);
            if (!t) { t = { kind: 'walk', part: name, parts: [], pivot, limb }; if (ad) t.period = r2(Number(ad[1]) * 2); if (limb === 'arm') t.deg = 16; anim.push(t); }
            if (!t.parts.includes(name)) t.parts.push(name);
          } else if (!anim.some(x => x.part === name)) {
            const t = { kind, part: name, pivot };
            if (ad) t.period = r2(Number(ad[1]));
            if (kind === 'bob') { const dy = /(-?[\d.]+)px/.exec(css['--dy'] || ''); t.dy = dy ? Math.abs(Number(dy[1])) : 1.5; }
            anim.push(t);
          }
          s2.part = name;
        }
      }
      if (tag === 'use') {
        const href = (a.href || a['xlink:href'] || '').replace(/^#/, '');
        const ref = ids.get(href);
        if (!ref) throw new Error(`sceneShapesFromSvg: <use href="#${href}"> points at nothing`);
        if (ref.tag === 'symbol') throw new Error('sceneShapesFromSvg: <symbol> is not supported (use <g id>)');
        visit(ref, s2, depth + 1);
        return;
      }
      if (CONTAINERS.has(tag)) { for (const k of n.kids) visit(k, s2, depth + 1); return; }
      // a shape
      const d = shapeD(n);
      if (!d) return;
      const mm = isIdent(m) ? null : m.map(r4);
      const local = withBb || /url\(/.test(String(s2.fill) + String(s2.stroke)) ? pathBox(d, null) : null;
      const fillRaw = tag === 'line' || tag === 'polyline' && s2.fill == null ? 'none' : (s2.fill == null ? '#000000' : s2.fill);
      const f = paintOf(fillRaw, s2, local);
      const sp = paintOf(s2.stroke, s2, local);
      const sw = s2['stroke-width'] != null ? Number(String(s2['stroke-width']).replace(/px$/, '')) : 1;
      if (!f && !(sp && sw > 0)) return;
      const sh = {};
      if (f) sh.f = f;
      sh.d = d;
      let o = s2.op;
      if (f && !sp && s2['fill-opacity'] != null) o *= Number(s2['fill-opacity']);
      if (sp && !f && s2['stroke-opacity'] != null) o *= Number(s2['stroke-opacity']);
      if (o !== 1) sh.op = r4(o);
      if (sp && sw > 0) { sh.s = sp; sh.w = r2(sw); if (s2['stroke-linecap'] && s2['stroke-linecap'] !== 'butt') sh.cap = s2['stroke-linecap']; if (s2['stroke-dasharray'] && s2['stroke-dasharray'] !== 'none') sh.dash = String(s2['stroke-dasharray']).split(/[\s,]+/).map(Number).filter(Number.isFinite); }
      if (mm) sh.m = mm;
      if (s2.glow) sh.glow = s2.glow;
      if (withBb) { const b = pathBox(d, mm); if (b) { const pad = sp ? sw / 2 * Math.max(Math.abs(mm ? mm[0] : 1), Math.abs(mm ? mm[3] : 1)) : 0; sh.bb = [r2(b[0] - pad), r2(b[1] - pad), r2(b[2] + pad), r2(b[3] + pad)]; } }
      addShape(s2, sh);
    }
    visit(doc, { m: IDENT, op: 1, color: '#000000' }, 0);
    if (Array.isArray(opts.parts)) { const want = opts.parts.filter(p => parts[p]); for (const p of order) if (!want.includes(p)) want.push(p); order.splice(0, order.length, ...want); }
    for (const t of anim) delete t.limb;
    return { parts, order, anim };
  };
})();

/** The points of a path (end points, control points, arc radius boxes), and its box through a matrix. */
function scenePathPts(d) { return _scPathPts(d); }
function _scPathPts(d) {
  const pts = [];
  const toks = String(d || '').match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const num = () => Number(toks[i++]);
  const more = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { x = sx; y = sy; continue; }
    if (!more()) continue;
    const bx = rel ? x : 0, by = rel ? y : 0;
    if (C === 'M' || C === 'L' || C === 'T') { x = bx + num(); y = by + num(); if (C === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; } pts.push([x, y]); }
    else if (C === 'H') { x = (rel ? x : 0) + num(); pts.push([x, y]); }
    else if (C === 'V') { y = (rel ? y : 0) + num(); pts.push([x, y]); }
    else if (C === 'C') { pts.push([bx + num(), by + num()], [bx + num(), by + num()]); x = bx + num(); y = by + num(); pts.push([x, y]); }
    else if (C === 'S' || C === 'Q') { pts.push([bx + num(), by + num()]); x = bx + num(); y = by + num(); pts.push([x, y]); }
    else if (C === 'A') { const rx = Math.abs(num()), ry = Math.abs(num()); num(); num(); num(); const nx = bx + num(), ny = by + num(), mx = (x + nx) / 2, my = (y + ny) / 2; pts.push([mx - rx, my - ry], [mx + rx, my + ry], [nx, ny]); x = nx; y = ny; }
    else i++;
  }
  return pts;
}
/* scenePathBox(d, m) lives in 70-scene-svg.js (one definition for the bundle). */

/**
 * An object whose drawing comes from the nature kit: `kit(K, v, season)` returns the kit's markup for
 * variant v (called at the origin, with shadow: false and still: false). Parsed lazily, once per
 * (v, season). Every field of sceneObjDefine passes through; `parts` (an array: part order, or an
 * object: kit class -> part name) steers the parser.
 */
function sceneObjFromKit(def) {
  const kit = def.kit, mapParts = def.parts;
  if (typeof kit !== 'function') throw new Error(`sceneObjFromKit ${def.id}: kit must be (K, v, season) => markup`);
  const out = Object.assign({}, def);
  delete out.kit;
  out.parts = Array.isArray(mapParts) ? mapParts : undefined;
  if (!out.parts) delete out.parts;
  out.fromKit = true;
  out.build = function (v, rnd, ctx) {
    const K = sceneKit('obj');
    const season = (ctx && ctx.season) || 'summer';
    const markup = kit(K, v, season);
    const res = sceneShapesFromSvg(markup, { parts: mapParts });
    const parts = {};
    for (const p of res.order) parts[p] = res.parts[p];
    Object.defineProperty(parts, '$anim', { value: res.anim, enumerable: false });
    return parts;
  };
  return sceneObjDefine(out);
}
