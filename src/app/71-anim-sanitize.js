/* ============================================================
   MAKE YOUR OWN (v2.2 wave 6): the SVG and CSS sanitiser, the quality gate
   at runtime, and the "My animations" pack. PURE classic script (after
   71-anim-registry.js): no DOM, nothing runs at load. The server
   (lib/anim-make.mjs) evaluates this same file, so a drawing is checked the
   same way in the preview, before it is saved, and again whenever it is read.

     animSanitizeSvg(svg, o)     -> {ok, svg, errors[]}   o: {id (the item id: ids
                                    inside are prefixed with it), max}
         A whitelist: shapes, groups, gradients, clip paths and masks only. It
         REJECTS (never repairs): <script>, on* handlers, href / xlink:href,
         url() other than url(#local), <foreignObject>, <image>, <use>,
         <style>, SMIL, text, entities, comments with markup, and input over
         the size or node caps. What passes is re-written from the parse, so
         the markup is always balanced and quoted.
     animSanitizeCss(css, id)    -> {ok, css, errors[]}  rules must start with
         `.as-<id>`, keyframes must be named `<id>-...`; no url(), @import or
         other at-rules; a small property whitelist. The output is gated like
         the core scenes (it only moves when the scene is live).
     animMarkupProblem(html)     the quality gate's markup check (the same as
                                 tests/anim-packs.test.mjs): '' when clean
     animMakeItem(raw, o)        -> {ok, item, errors[]}  a stored record from a
         draft {label, slot, tags, svg, reducedSvg, css}; o {id, at, about}
     animGateItem(item)          -> errors[]: the gate (renders, markup, sizes, still variant)
     animMinePack(records)       the "My animations" pack manifest (or null when empty)
   ============================================================ */
const ANIM_MAKE_PACK_ID = 'mine';
const ANIM_MAKE_MAX_SVG = 6000;       // characters in one drawing (svg or reducedSvg)
const ANIM_MAKE_MAX_CSS = 1400;
const ANIM_MAKE_MAX_NODES = 160;
const ANIM_MAKE_MAX_ITEMS = 16;       // 16 x 1400 css stays inside ANIM_PACK_CSS_MAX_BYTES
const ANIM_MAKE_MAX_ABOUT = 300;
const ANIM_MAKE_SLOTS = Object.freeze(['opening', 'celebration', 'symbol', 'sky', 'empty-loading', 'task-done', 'focus']);
const ANIM_MAKE_ID_RE = /^my-[a-z0-9]{6,12}$/;

const _AMS_ELEMENTS = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask']);
const _AMS_FORBIDDEN = { script: 'script is not allowed', foreignobject: 'foreignObject is not allowed', iframe: 'iframe is not allowed', object: 'object is not allowed',
  embed: 'embed is not allowed', image: 'images are not allowed (nothing may be fetched)', use: 'use is not allowed', a: 'links are not allowed', style: 'style elements are not allowed (use css)',
  animate: 'SMIL animation is not allowed (use the x-* classes or css)', set: 'SMIL animation is not allowed', animatemotion: 'SMIL animation is not allowed', animatetransform: 'SMIL animation is not allowed',
  text: 'text is not allowed', tspan: 'text is not allowed', textpath: 'text is not allowed', feimage: 'images are not allowed (nothing may be fetched)', handler: 'script is not allowed', listener: 'script is not allowed' };
const _AMS_NUM = /^[-+\d.eE\s,]*$/;
const _AMS_PATH = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,eE+-]*$/;
const _AMS_LEN = /^-?[\d.]+(%|px)?$/;
const _AMS_PAINT = /^(none|currentColor|transparent|#[0-9a-fA-F]{3,8}|[a-z]{3,20}|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%deg]+\)|url\(#[A-Za-z][\w-]{0,40}\))$/;
const _AMS_ATTRS = {
  class: /^[A-Za-z0-9_ -]{0,160}$/, id: /^[A-Za-z][\w-]{0,40}$/,
  d: _AMS_PATH, points: _AMS_NUM, cx: _AMS_LEN, cy: _AMS_LEN, r: _AMS_LEN, rx: _AMS_LEN, ry: _AMS_LEN, x: _AMS_LEN, y: _AMS_LEN,
  x1: _AMS_LEN, y1: _AMS_LEN, x2: _AMS_LEN, y2: _AMS_LEN, width: _AMS_LEN, height: _AMS_LEN, fx: _AMS_LEN, fy: _AMS_LEN, offset: _AMS_LEN, pathLength: _AMS_NUM,
  transform: /^[a-zA-Z\d\s.,()+-]*$/, 'transform-origin': /^[a-z\d\s.%-]*$/, gradientTransform: /^[a-zA-Z\d\s.,()+-]*$/,
  fill: _AMS_PAINT, stroke: _AMS_PAINT, 'stop-color': _AMS_PAINT, 'clip-path': /^url\(#[A-Za-z][\w-]{0,40}\)$/, mask: /^url\(#[A-Za-z][\w-]{0,40}\)$/,
  'stroke-width': _AMS_NUM, 'stroke-dasharray': _AMS_NUM, 'stroke-dashoffset': _AMS_NUM, 'stroke-miterlimit': _AMS_NUM,
  'stroke-linecap': /^(butt|round|square)$/, 'stroke-linejoin': /^(miter|round|bevel)$/, 'fill-rule': /^(nonzero|evenodd)$/, 'clip-rule': /^(nonzero|evenodd)$/,
  opacity: _AMS_NUM, 'fill-opacity': _AMS_NUM, 'stroke-opacity': _AMS_NUM, 'stop-opacity': _AMS_NUM,
  gradientUnits: /^(userSpaceOnUse|objectBoundingBox)$/, maskUnits: /^(userSpaceOnUse|objectBoundingBox)$/, clipPathUnits: /^(userSpaceOnUse|objectBoundingBox)$/,
  'vector-effect': /^non-scaling-stroke$/, style: null,
};
const _AMS_STYLE_PROPS = new Set(['opacity', 'transform-origin', 'transform-box', 'fill', 'stroke', 'stroke-width', 'animation-delay', 'animation-duration']);
const _AMS_CLASS = /^(k|c|s|w|m|ln|lk|lc|lm|lw|lsoft|t|dash|o-[a-z]|ap-gr|x-[a-z0-9]{2,16}(-slow)?|u-[a-z0-9][a-z0-9-]{0,23})$/;
const _AMS_BAD_VALUE = /javascript:|vbscript:|data:|expression\s*\(|[<>&\\`]|undefined|NaN|\[object /i;

function _amsAttrEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
/** One attribute: an error message, or '' (and the value to write, possibly re-pointed at the prefixed ids). */
function _amsAttr(name, value, pre) {
  const low = name.toLowerCase();
  if (/^on/.test(low)) return { err: `event handler attributes (${name}) are not allowed` };
  if (low === 'href' || low === 'xlink:href' || low.endsWith(':href') || low === 'src') {
    return { err: /^\s*#/.test(value) ? `${name} is not allowed` : `external references (${name}) are not allowed` };
  }
  if (/url\s*\(/i.test(value) && !/^url\(#[A-Za-z][\w-]{0,40}\)$/.test(value.trim())) return { err: `external references (url() in ${name}) are not allowed` };
  if (_AMS_BAD_VALUE.test(value)) return { err: `the value of ${name} is not allowed` };
  if (!Object.prototype.hasOwnProperty.call(_AMS_ATTRS, name)) return { err: `the attribute ${name} is not allowed` };
  if (name === 'style') {
    const out = [];
    for (const part of value.split(';')) {
      if (!part.trim()) continue;
      const m = /^\s*(--[a-z][\w-]{0,24}|[a-z-]+)\s*:\s*([-\w\s.%#,()]{0,80})\s*$/.exec(part);
      if (!m || (!m[1].startsWith('--') && !_AMS_STYLE_PROPS.has(m[1])) || /url\s*\(/i.test(m[2])) return { err: 'that style is not allowed' };
      out.push(m[1] + ':' + m[2].trim());
    }
    return { value: out.join(';') };
  }
  if (!_AMS_ATTRS[name].test(value.trim())) return { err: `the value of ${name} is not allowed` };
  // Classes: the scene vocabulary and own `u-*` names only, so a drawing can never pick up a page class (.ap-opening is a fixed overlay).
  if (name === 'class') {
    const bad = value.trim().split(/\s+/).filter(Boolean).find(c => !_AMS_CLASS.test(c));
    if (bad) return { err: `the class ${bad} is not allowed (the scene classes and u-* only)` };
  }
  let v = value.trim();
  if (name === 'id') v = pre + v;
  else v = v.replace(/^url\(#([A-Za-z][\w-]{0,40})\)$/, (_, ref) => `url(#${pre}${ref})`);
  return { value: v };
}

/** Sanitise the inside of a 64x64 drawing. Rejects anything outside the whitelist. */
function animSanitizeSvg(input, o) {
  o = o || {};
  const max = o.max || ANIM_MAKE_MAX_SVG;
  const errors = [];
  if (typeof input !== 'string') return { ok: false, svg: '', errors: ['the drawing is not text'] };
  if (input.length > max) return { ok: false, svg: '', errors: [`the drawing is too large (${input.length} > ${max} characters)`] };
  const s = input;
  if (!s.trim()) return { ok: false, svg: '', errors: ['the drawing is empty'] };
  const pre = (o.id ? String(o.id) : 'my') + '-';
  const out = [], stack = [];
  let i = 0, nodes = 0, wrapped = false, wrapDone = false;
  const fail = (m) => { errors.push(m); return { ok: false, svg: '', errors }; };
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const text = s.slice(i, lt < 0 ? s.length : lt);
    if (text.trim()) return fail(/&/.test(text) ? 'entities are not allowed' : 'text is not allowed (shapes only)');
    if (lt < 0) break;
    if (s.startsWith('<!--', lt)) {
      const e = s.indexOf('-->', lt + 4);
      if (e < 0) return fail('an unclosed comment');
      if (/[<>]/.test(s.slice(lt + 4, e))) return fail('markup inside a comment is not allowed');
      i = e + 3; continue;
    }
    if (s[lt + 1] === '!' || s[lt + 1] === '?') return fail('declarations, CDATA and processing instructions are not allowed');
    const gt = s.indexOf('>', lt);
    if (gt < 0) return fail('an unclosed tag');
    const raw = s.slice(lt + 1, gt);
    i = gt + 1;
    const close = /^\/\s*([A-Za-z][\w:-]*)\s*$/.exec(raw);
    if (close) {
      const name = close[1];
      if (name === 'svg' && wrapped && !stack.length && !wrapDone) { wrapDone = true; continue; }
      if (stack.pop() !== name) return fail(`unbalanced </${name}>`);
      out.push(`</${name}>`);
      continue;
    }
    const open = /^([A-Za-z][\w:-]*)([\s\S]*)$/.exec(raw);
    if (!open) return fail('a malformed tag');
    const name = open[1];
    let rest = open[2];
    const selfClose = /\/\s*$/.test(rest);
    if (selfClose) rest = rest.replace(/\/\s*$/, '');
    const low = name.toLowerCase();
    if (_AMS_FORBIDDEN[low]) return fail(_AMS_FORBIDDEN[low]);
    if (name === 'svg' && !out.length && !stack.length && !wrapped && !selfClose) { wrapped = true; continue; }   // an outer <svg> wrapper is dropped
    if (wrapDone) return fail('shapes after the closing </svg>');
    if (!_AMS_ELEMENTS.has(name)) return fail(`<${name}> is not allowed`);
    if (++nodes > ANIM_MAKE_MAX_NODES) return fail(`too many shapes (over ${ANIM_MAKE_MAX_NODES})`);
    const attrs = [];
    const seen = new Set();
    const re = /^\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;
    let m;
    while ((m = re.exec(rest))) {
      const an = m[1], av = m[2] != null ? m[2] : m[3];
      if (seen.has(an)) return fail(`a repeated attribute (${an})`);
      seen.add(an);
      const r = _amsAttr(an, av, pre);
      if (r.err) return fail(r.err);
      attrs.push(` ${an}="${_amsAttrEsc(r.value)}"`);
      rest = rest.slice(m[0].length);
    }
    if (rest.trim()) {
      const bare = /^\s*([A-Za-z_:][\w:.-]*)/.exec(rest);
      if (bare && /^on/i.test(bare[1])) return fail(`event handler attributes (${bare[1]}) are not allowed`);
      return fail('malformed attributes (every value needs quotes)');
    }
    if (selfClose) out.push(`<${name}${attrs.join('')}/>`);
    else { out.push(`<${name}${attrs.join('')}>`); stack.push(name); }
  }
  if (stack.length) return fail(`unclosed <${stack[stack.length - 1]}>`);
  if (wrapped && !wrapDone) return fail('unclosed <svg>');
  if (!nodes) return fail('the drawing has no shapes');
  return { ok: true, svg: out.join(''), errors: [] };
}

const _AMC_PROPS = new Set(['animation', 'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function', 'animation-iteration-count',
  'animation-direction', 'animation-fill-mode', 'transform', 'transform-origin', 'transform-box', 'opacity', 'fill', 'stroke', 'stroke-width',
  'stroke-dasharray', 'stroke-dashoffset', 'fill-opacity', 'stroke-opacity']);
function _amcDecls(body) {
  const out = [];
  for (const part of body.split(';')) {
    if (!part.trim()) continue;
    const m = /^\s*(--[a-z][\w-]{0,24}|[a-z-]+)\s*:\s*([-\w\s.%#,()*/+]{1,200})\s*$/.exec(part);
    if (!m) return { err: 'a css declaration is not allowed' };
    if (!m[1].startsWith('--') && !_AMC_PROPS.has(m[1])) return { err: `the css property ${m[1]} is not allowed` };
    out.push(`${m[1]}: ${m[2].trim().replace(/\s+/g, ' ')}`);
  }
  return { css: out.join('; ') };
}
/** Read top-level `prelude { body }` blocks (one level of nesting for @keyframes). */
function _amcBlocks(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ob = s.indexOf('{', i);
    if (ob < 0) { if (s.slice(i).trim()) return null; break; }
    let depth = 1, j = ob + 1;
    for (; j < s.length && depth; j++) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; }
    if (depth) return null;
    const prelude = s.slice(i, ob).trim();
    if (!prelude || /[{}]/.test(prelude)) return null;
    out.push({ prelude, body: s.slice(ob + 1, j - 1) });
    i = j;
  }
  return out;
}
/** Sanitise an item's own css: scoped to `.as-<id>`, keyframes `<id>-*`, gated on the live scene. */
function animSanitizeCss(input, id) {
  if (input == null || input === '') return { ok: true, css: '', src: '', errors: [] };
  if (typeof input !== 'string') return { ok: false, css: '', errors: ['the css is not text'] };
  if (input.length > ANIM_MAKE_MAX_CSS) return { ok: false, css: '', errors: [`the css is too large (${input.length} > ${ANIM_MAKE_MAX_CSS} characters)`] };
  if (!ANIM_MAKE_ID_RE.test(String(id || ''))) return { ok: false, css: '', errors: ['the css needs the item id'] };
  const s = input.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (/url\s*\(/i.test(s)) return { ok: false, css: '', errors: ['external references (url()) are not allowed in css'] };
  if (/@import|@font-face|@charset|@namespace/i.test(s)) return { ok: false, css: '', errors: ['@import and fonts are not allowed in css'] };
  if (/[<\\`"']|expression\s*\(|javascript:|behavior|binding|!important/i.test(s)) return { ok: false, css: '', errors: ['that css is not allowed'] };
  const blocks = _amcBlocks(s);
  if (!blocks) return { ok: false, css: '', errors: ['the css is malformed'] };
  const out = [], src = [];
  const scope = '.as-' + id;
  for (const b of blocks) {
    const kf = /^@keyframes\s+([a-z][\w-]{0,60})$/i.exec(b.prelude);
    if (kf) {
      if (!kf[1].startsWith(id + '-')) return { ok: false, css: '', errors: [`keyframes must be named ${id}-...`] };
      const frames = _amcBlocks(b.body);
      if (!frames) return { ok: false, css: '', errors: ['the keyframes are malformed'] };
      const fs = [];
      for (const f of frames) {
        if (!/^(from|to|\d{1,3}(\.\d+)?%)(\s*,\s*(from|to|\d{1,3}(\.\d+)?%))*$/.test(f.prelude)) return { ok: false, css: '', errors: ['a keyframe step is not allowed'] };
        const d = _amcDecls(f.body);
        if (d.err) return { ok: false, css: '', errors: [d.err] };
        fs.push(`${f.prelude} { ${d.css} }`);
      }
      out.push(`@keyframes ${kf[1]} { ${fs.join(' ')} }`);
      src.push(out[out.length - 1]);
      continue;
    }
    if (b.prelude.startsWith('@')) return { ok: false, css: '', errors: ['only @keyframes is allowed'] };
    const sels = b.prelude.split(',').map(x => x.trim());
    const gated = [];
    for (const sel of sels) {
      if (!sel.startsWith(scope) || /^[\w-]/.test(sel.slice(scope.length)) || !/^[\w\s.#:>+~()*-]*$/.test(sel)) return { ok: false, css: '', errors: [`every css rule must start with ${scope}`] };
      gated.push(`.anim-scene.is-live ${sel}`, `.anim-hover-host:hover .anim-scene.anim-hover-only ${sel}`, `.anim-scene.anim-hover-only:hover ${sel}`);
    }
    const d = _amcDecls(b.body);
    if (d.err) return { ok: false, css: '', errors: [d.err] };
    out.push(`${gated.join(', ')} { ${d.css} }`);
    src.push(`${sels.join(', ')} { ${d.css} }`);
  }
  // css: what the page injects (gated); src: the canonical source that is stored (it sanitises to itself).
  return { ok: true, css: out.join('\n'), src: src.join('\n'), errors: [] };
}

/** The quality gate's markup check (tests/anim-packs.test.mjs uses the same rules). '' when clean. */
function animMarkupProblem(html) {
  if (/<script|<foreignObject|<iframe|<image\b|\son[a-z]+\s*=|javascript:/i.test(html)) return 'script or embedded content';
  if (/(href|src)\s*=\s*["']?(https?:|\/\/)|url\(\s*['"]?(https?:|\/\/)/i.test(html)) return 'fetches something';
  if (/NaN|undefined|\[object /.test(html)) return 'NaN / undefined in the markup';
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (!m[1]) stack.push(m[2]);
    else if (stack.pop() !== m[2]) return `unbalanced </${m[2]}>`;
  }
  return stack.length ? `unclosed <${stack[stack.length - 1]}>` : '';
}

const _AMK_TEXT = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
/** The pack item a stored record becomes. */
function _amkPackItem(r) {
  return {
    id: r.id, slot: r.slot, label: r.label, tags: ['mine'].concat(r.tags), mood: r.mood, intensity: r.intensity, theme: 'any', season: 'any', region: 'any',
    colour: r.colour, mine: true, about: r.about || '', svg: () => r.svg, reduced: r.reducedSvg ? () => r.reducedSvg : 'static',
  };
}
/** The runtime gate for one pack item: it renders in both variants, clean markup, within the size cap, still when reduced. */
function animGateItem(it) {
  const errors = [];
  for (const reduced of [false, true]) {
    let html = '';
    try { html = animItemHtml(it, { reduced, live: true, size: 'lg' }); } catch (e) { errors.push('it does not render'); continue; }
    if (!html || !html.includes('<svg')) { errors.push('it renders nothing'); continue; }
    const p = animMarkupProblem(html);
    if (p) errors.push(p + (reduced ? ' (still variant)' : ''));
    if (html.length > ANIM_ITEM_MAX_BYTES) errors.push(`too large once drawn (${html.length} > ${ANIM_ITEM_MAX_BYTES} bytes)`);
    if (reduced && !(html.includes('ap-still') && !html.includes('is-live'))) errors.push('the still variant moves');
  }
  return errors;
}
/**
 * A stored record from a draft (the assistant's answer, or a saved record read back).
 * o: {id (required, my-xxxxxx), at (ms), about (the user's description, kept short)}.
 */
function animMakeItem(raw, o) {
  o = o || {};
  const r = raw && typeof raw === 'object' ? raw : {};
  const errors = [];
  const id = String(o.id || r.id || '');
  if (!ANIM_MAKE_ID_RE.test(id)) return { ok: false, item: null, errors: ['the animation id is not valid'] };
  const slot = ANIM_MAKE_SLOTS.includes(r.slot) ? r.slot : null;
  if (!slot) errors.push(`slot must be one of ${ANIM_MAKE_SLOTS.join(', ')}`);
  const label = _AMK_TEXT(r.label, 60) || 'My animation';
  const tags = Array.isArray(r.tags) ? [...new Set(r.tags.map(t => _AMK_TEXT(t, 24).toLowerCase()).filter(t => /^[a-z0-9][a-z0-9 -]{0,23}$/.test(t)))].slice(0, 8) : [];
  const sv = animSanitizeSvg(r.svg, { id });
  if (!sv.ok) errors.push(...sv.errors.map(e => 'drawing: ' + e));
  let reducedSvg = '';
  if (typeof r.reducedSvg === 'string' && r.reducedSvg.trim()) {
    const rv = animSanitizeSvg(r.reducedSvg, { id });
    if (!rv.ok) errors.push(...rv.errors.map(e => 'still drawing: ' + e));
    else reducedSvg = rv.svg;
  }
  const cs = animSanitizeCss(r.css || '', id);
  if (!cs.ok) errors.push(...cs.errors.map(e => 'css: ' + e));
  if (errors.length) return { ok: false, item: null, errors };
  const item = {
    id, slot, label, tags, svg: sv.svg, reducedSvg, css: cs.src,
    mood: ANIM_MOODS.includes(r.mood) ? r.mood : 'cheerful',
    intensity: ANIM_INTENSITIES.includes(r.intensity) ? r.intensity : 'standard',
    colour: ANIM_SWATCHES.includes(r.colour) ? r.colour : 'violet',
    about: _AMK_TEXT(o.about != null ? o.about : r.about, ANIM_MAKE_MAX_ABOUT),
    at: Number.isFinite(+o.at) ? +o.at : (Number.isFinite(+r.at) ? +r.at : 0),
  };
  const v = animValidatePack({ id: ANIM_MAKE_PACK_ID, name: 'My animations', items: [_amkPackItem(item)] });
  if (!v.ok) return { ok: false, item: null, errors: v.errors };
  const gate = animGateItem(Object.assign(_amkPackItem(item), { ref: ANIM_MAKE_PACK_ID + '/' + id }));
  if (gate.length) return { ok: false, item: null, errors: gate };
  return { ok: true, item, errors: [] };
}
/** The "My animations" pack from the stored records (each re-checked), or null when there are none. */
function animMinePack(records) {
  const items = [], css = [];
  for (const raw of Array.isArray(records) ? records : []) {
    if (items.length >= ANIM_MAKE_MAX_ITEMS) break;
    const v = animMakeItem(raw, { id: raw && raw.id });
    if (!v.ok || items.some(x => x.id === v.item.id)) continue;
    items.push(_amkPackItem(v.item));
    if (v.item.css) css.push(animSanitizeCss(v.item.css, v.item.id).css);
  }
  if (!items.length) return null;
  return { id: ANIM_MAKE_PACK_ID, name: 'My animations', version: '1', description: 'Animations you described and the assistant drew. Kept in your data folder.', css: css.join('\n'), items };
}
