// tools/lib/svg-clean.mjs - sanitise and shrink one SVG at development time (no dependencies).
//
// A strict allowlist: only plain drawing elements and attributes survive, every reference must stay inside
// the file (#id), and anything that cannot be kept faithfully (text that needs a font, embedded images,
// filters) makes the whole file fail, so the vendor keeps its pictogram instead of a half-drawn logo.
// Numbers are rounded relative to the drawing's size, which does not change how it looks.
//
//   cleanSvg(text) -> {ok: true, viewBox, inner, mono, bytes} | {ok: false, why}

const DROP_SUBTREE = new Set(['title', 'desc', 'metadata', 'sodipodi:namedview', 'namedview', 'defs-ignored']);
const KEEP = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'use']);
const FAIL = new Set(['script', 'foreignobject', 'image', 'text', 'tspan', 'textpath', 'filter', 'iframe', 'a', 'animate', 'animatetransform', 'animatemotion', 'set', 'pattern', 'symbol', 'marker', 'switch', 'font', 'video', 'audio', 'canvas', 'html', 'body']);
const ATTRS = new Set(['d', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'transform',
  'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'points', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'spreadmethod', 'clippathunits', 'maskunits', 'maskcontentunits', 'clip-path', 'mask', 'id', 'href', 'xlink:href', 'viewbox', 'color']);
const CASE = { gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform', spreadmethod: 'spreadMethod', clippathunits: 'clipPathUnits', maskunits: 'maskUnits', maskcontentunits: 'maskContentUnits', viewbox: 'viewBox', lineargradient: 'linearGradient', radialgradient: 'radialGradient', clippath: 'clipPath' };
const DEFAULTS = { 'fill-opacity': '1', opacity: '1', 'stroke-opacity': '1', 'stop-opacity': '1', 'fill-rule': 'nonzero', 'clip-rule': 'nonzero', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-miterlimit': '4', 'stroke-dasharray': 'none', 'stroke-dashoffset': '0', stroke: 'none' };
const BAD_VALUE = /javascript:|data:|https?:|file:|@import|expression\(|<|>/i;

function fail(why) { const e = new Error(why); e.clean = true; throw e; }
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');

/** Very small XML reader: -> a tree of {tag, attrs, kids}. Doctypes with internal entities are refused. */
function parse(xml) {
  if (/<!ENTITY/i.test(xml)) fail('entities');
  const src = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/i, '');
  const root = { tag: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<(\/)?([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/)?>|<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[5] != null) { stack[stack.length - 1].text = (stack[stack.length - 1].text || '') + m[5]; continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) { while (stack.length > 1 && stack[stack.length - 1].tag !== tag) stack.pop(); if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = unesc(a[2] != null ? a[2] : a[3]);
    const node = { tag, attrs, kids: [], at: m.index + m[0].length };
    stack[stack.length - 1].kids.push(node);
    if (!m[4]) stack.push(node);
    if (tag === 'style' && !m[4]) { const end = src.indexOf('</', re.lastIndex); if (end > 0) node.text = src.slice(re.lastIndex, end); }
  }
  return root.kids.find(k => k.tag === 'svg') || fail('no svg element');
}

/** Simple stylesheet rules (.a,.b{fill:#000}, tag{...}) -> a lookup; anything fancier fails the file. */
function readStyles(node, out) {
  if (node.tag === 'style') {
    const css = String(node.text || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!\[CDATA\[|\]\]>/g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const sel of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        if (!/^(\.[\w-]+|[a-z]+)$/i.test(sel)) fail('style selector ' + sel);
        out.set(sel.toLowerCase(), Object.assign(out.get(sel.toLowerCase()) || {}, parseStyle(m[2])));
      }
    }
  }
  for (const k of node.kids) readStyles(k, out);
}
function parseStyle(s) {
  const o = {};
  for (const part of String(s || '').split(';')) { const i = part.indexOf(':'); if (i > 0) o[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim(); }
  return o;
}

function cleanColor(v) {
  const s = String(v).trim();
  const m = /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.exec(s);
  if (m) return ('#' + m[1] + m[2] + m[3]).toLowerCase();
  return /^#[0-9a-f]+$/i.test(s) ? s.toLowerCase() : s;
}
function roundNum(str, dp) {
  const n = Number(str);
  if (!Number.isFinite(n)) return str;
  let s = String(Math.round(n * 10 ** dp) / 10 ** dp);
  if (s === '-0') s = '0';
  return s.replace(/^(-?)0\./, '$1.');
}
/** Round every number in a path or list, and drop the spaces it can do without. */
function squeezeNumbers(v, dp) {
  const out = [];
  const re = /([a-zA-Z(),])|(-?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
  let m, prev = '';
  while ((m = re.exec(v))) {
    if (m[1]) { if (m[1] !== ',') { out.push(m[1]); prev = m[1]; } continue; }
    const num = roundNum(m[2], dp);
    const needSpace = prev && /[\d.]$/.test(prev) && !num.startsWith('-') && !(num.startsWith('.') && /\.\d*$/.test(prev));
    out.push((needSpace ? ' ' : '') + num);
    prev = num;
  }
  return out.join('');
}

/**
 * A path, read properly: an arc's two flags are single digits that may touch the next number ("a1 1 0 01.5.5"),
 * so they can't be read as ordinary numbers. Anything unexpected fails the file rather than drawing it wrong.
 */
const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
function squeezePath(d, dp) {
  const out = [];
  let i = 0, prev = '';
  const n = d.length;
  const skip = () => { while (i < n && /[\s,]/.test(d[i])) i++; };
  const num = () => {
    skip();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40));
    if (!m) fail('bad path');
    i += m[0].length;
    return m[0];
  };
  const push = (v) => {
    const s = roundNum(v, dp);
    const space = prev && /[\d.]$/.test(prev) && !s.startsWith('-') && !(s.startsWith('.') && /\.\d*$/.test(prev));
    out.push((space ? ' ' : '') + s); prev = s;
  };
  while (true) {
    skip();
    if (i >= n) break;
    const c = d[i];
    if (!/[a-zA-Z]/.test(c)) fail('bad path');
    const need = ARGS[c.toLowerCase()];
    if (need == null) fail('bad path command');
    i++;
    out.push(c); prev = c;
    if (need === 0) continue;
    let first = true;
    while (true) {
      skip();
      if (i >= n || /[a-zA-Z]/.test(d[i])) { if (first) fail('bad path'); break; }
      if (need === 7) {
        push(num()); push(num()); push(num());
        for (let f = 0; f < 2; f++) { skip(); const fl = d[i]; if (fl !== '0' && fl !== '1') fail('bad arc flag'); i++; out.push((/[\d.]$/.test(prev) ? ' ' : '') + fl); prev = fl; }
        push(num()); push(num());
      } else for (let k = 0; k < need; k++) push(num());
      first = false;
    }
  }
  return out.join('');
}

export function cleanSvg(text) {
  try {
    const src = String(text || '');
    if (src.length > 900000) fail('too large');
    const svg = parse(src);
    const styles = new Map();
    readStyles(svg, styles);
    let vb = (svg.attrs.viewbox || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(n => !Number.isFinite(n))) {
      const w = parseFloat(svg.attrs.width), h = parseFloat(svg.attrs.height);
      if (!(w > 0 && h > 0)) fail('no size');
      vb = [0, 0, w, h];
    }
    if (!(vb[2] > 0 && vb[3] > 0)) fail('empty view box');
    // About a thousandth of a pixel on a 64 px tile: invisible at any size we draw.
    const dp = Math.max(0, Math.min(5, Math.ceil(3 - Math.log10(Math.max(vb[2], vb[3])))));
    const ids = new Map();
    const newId = (id) => { if (!ids.has(id)) ids.set(id, 'abcdefghijklmnopqrstuvwxyz'[ids.size % 26] + (ids.size >= 26 ? Math.floor(ids.size / 26) : '')); return ids.get(id); };
    const colours = new Set();
    let inDefs = 0, drew = 0;

    const attrsOf = (n) => {
      const merged = {};
      const tagRule = styles.get(n.tag); if (tagRule) Object.assign(merged, tagRule);
      for (const c of String(n.attrs.class || '').split(/\s+/).filter(Boolean)) { const r = styles.get('.' + c.toLowerCase()); if (r) Object.assign(merged, r); }
      Object.assign(merged, Object.fromEntries(Object.entries(n.attrs).filter(([k]) => k !== 'style' && k !== 'class')));
      Object.assign(merged, parseStyle(n.attrs.style));
      return merged;
    };
    const walk = (n, isRoot) => {
      const tag = n.tag;
      if (DROP_SUBTREE.has(tag) || tag === 'style' || tag.includes(':')) return '';
      if (FAIL.has(tag)) fail('<' + tag + '>');
      if (!KEEP.has(tag)) fail('unknown <' + tag + '>');
      const A = attrsOf(n);
      if (A.display === 'none' || A.visibility === 'hidden') return '';
      const out = [];
      for (const [k0, v0] of Object.entries(A)) {
        const k = k0.toLowerCase();
        if (!ATTRS.has(k)) continue;
        if (isRoot && ['id', 'width', 'height', 'viewbox', 'x', 'y'].includes(k)) continue;
        let v = String(v0).trim();
        if (DEFAULTS[k] === v) continue;
        if (k === 'id') { out.push(['id', newId(v)]); continue; }
        if (k === 'href' || k === 'xlink:href') {
          if (!/^#[\w:.-]+$/.test(v)) fail('outside reference');
          out.push(['href', '#' + newId(v.slice(1))]); continue;
        }
        if (/url\(/i.test(v)) {
          const u = /^url\(\s*['"]?#([\w:.-]+)['"]?\s*\)(\s+\S+)?$/i.exec(v);
          if (!u) fail('outside url()');
          out.push([k, `url(#${newId(u[1])})`]); continue;
        }
        if (BAD_VALUE.test(v)) fail('bad value in ' + k);
        if (k === 'd') v = squeezePath(v, dp);
        else if (k === 'points' || k === 'transform' || k === 'gradienttransform') v = squeezeNumbers(v, dp);
        else if (['x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'stroke-width', 'width', 'height'].includes(k) && /^-?[\d.]+(e-?\d+)?$/i.test(v)) v = roundNum(v, dp);
        else if (k === 'fill' || k === 'stroke' || k === 'stop-color') { v = cleanColor(v); if (v !== 'none') colours.add(v.toLowerCase()); }
        out.push([CASE[k] || k, v]);
      }
      if (tag === 'stop' && !Object.keys(A).some(k => k === 'offset')) out.push(['offset', '0']);
      const isDefs = tag === 'defs' || tag === 'lineargradient' || tag === 'radialgradient' || tag === 'clippath' || tag === 'mask';
      if (isDefs) inDefs++;
      const kids = n.kids.map(k => walk(k, false)).join('');
      if (isDefs) inDefs--;
      if (!isDefs && !inDefs && ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'use'].includes(tag)) drew++;
      if (isRoot) return (out.length ? `<g ${out.map(([k, v]) => `${k}="${v.replace(/"/g, "'")}"`).join(' ')}>${kids}</g>` : kids);
      if (tag === 'g' && !out.length) return kids;
      if ((tag === 'defs' || tag === 'g') && !kids) return '';
      const name = CASE[tag] || tag;
      const at = out.map(([k, v]) => ` ${k}="${v.replace(/"/g, "'")}"`).join('');
      return kids ? `<${name}${at}>${kids}</${name}>` : `<${name}${at}/>`;
    };
    const inner = walk(svg, true);
    if (!drew) fail('nothing drawn');
    // Make double sure (a reader bug must not let anything through).
    if (/<\s*(script|style|image|foreignObject|iframe|a)\b|\son\w+\s*=|javascript:|https?:\/\//i.test(inner)) fail('unsafe after cleaning');
    colours.delete('currentcolor');
    return { ok: true, viewBox: vb.map(n => roundNum(n, dp).replace(/^\./, '0.')).join(' '), inner, colours: colours.size, bytes: inner.length };
  } catch (e) {
    if (e && e.clean) return { ok: false, why: e.message };
    return { ok: false, why: 'unreadable: ' + (e && e.message) };
  }
}
