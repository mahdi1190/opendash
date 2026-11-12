/* Authored vector assets compile directly to Phaser display objects. The
 * component tree is plain game data: no SVG DOM, layout, image decode or
 * mutation observer participates in drawing or animation. */
window.GardenNativeArt = (function () {
  'use strict';
  const ID = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  const VOID = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'stop', 'image', 'use']);
  const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
  const DEFINITIONS = new Set(['defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'pattern', 'filter', 'style', 'title', 'desc']);
  const parsed = new Map(), paths = new Map(), sceneStates = new WeakMap(), liveStates = new Set(), pausedAmbient = new Set(), triangleBatchStates = new WeakMap();
  const rules = [], indexedRules = new Map(), keyframes = new Map(), matchedRules = new Map(), selectorAttrs = new Set(), selectorClasses = new Set(), selectorIds = new Set(), compiledSelectors = new Map(), compiledAtoms = new Map(), candidateRules = new Map(), styleClassKeys = new Map();
  const inheritedStyles = new Set(['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'color', 'visibility']);
  let sourceBytes = 0, ruleOrder = 0, styleVersion = 0, positionalSelectors = false;
  const environmentState = { windX: 0, windY: 0, gust: 0, rain: 0, snow: 0, daylight: 1 };
  let ambientPause = { hush: false, frozen: false };
  function mul(a, b) { return { a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b, c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d, e: a.a * b.e + a.c * b.f + a.e, f: a.b * b.e + a.d * b.f + a.f }; }
  function inv(m) { const z = m.a * m.d - m.b * m.c; return Math.abs(z) < 1e-10 ? ID : { a: m.d / z, b: -m.b / z, c: -m.c / z, d: m.a / z, e: (m.c * m.f - m.d * m.e) / z, f: (m.b * m.e - m.a * m.f) / z }; }
  function point(m, x, y) { return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; }
  function num(v, fallback) { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback == null ? 0 : fallback; }
  function nums(v) { return (String(v || '').match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number); }
  function entity(text) { return String(text || '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, key) => key[0] === '#' ? String.fromCodePoint(Math.max(0, Math.min(0x10ffff, key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1))))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[key.toLowerCase()] || '')); }
  function parse(markup) {
    const source = String(markup || ''), cached = parsed.get(source); if (cached) return cached;
    const root = { tag: 'g', attrs: {}, children: [], text: '' }, stack = [root];
    const tokens = source.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (token.startsWith('<!--') || /^<\?/.test(token) || /^<!/.test(token)) continue;
      if (token.startsWith('</')) { const closing = /^<\/\s*([\w:-]+)/.exec(token), tag = closing && closing[1].toLowerCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
      if (token[0] !== '<') { stack[stack.length - 1].text += entity(token); continue; }
      const start = /^<\s*([\w:-]+)/.exec(token); if (!start) continue;
      const tag = start[1].toLowerCase(), attrs = {};
      const body = token.slice(start[0].length).replace(/\/?\s*>$/, '');
      for (const m of body.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1]] = entity(m[2] == null ? m[3] == null ? m[4] : m[3] : m[2]);
      const node = { tag, attrs, children: [], text: '' }; stack[stack.length - 1].children.push(node);
      if (!VOID.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
    }
    if (source.length < 1500000) { parsed.set(source, root); sourceBytes += source.length; while (parsed.size > 48 || sourceBytes > 6000000) { const first = parsed.keys().next().value; sourceBytes -= first.length; parsed.delete(first); } }
    return root;
  }
  function declarations(text) {
    const out = {}; for (const part of String(text || '').split(/;(?![^()]*\))/)) { const split = part.indexOf(':'); if (split > 0) { const name = part.slice(0, split).trim(); out[name.startsWith('--') ? name : name.toLowerCase()] = part.slice(split + 1).trim().replace(/\s*!important\s*$/, ''); } } return out;
  }
  function splitSelector(selector) { const out = []; let token = '', depth = 0, quote = ''; for (const c of String(selector || '').trim()) { if (quote) { token += c; if (c === quote) quote = ''; } else if (c === '"' || c === "'") { quote = c; token += c; } else if (c === '(' || c === '[') { depth++; token += c; } else if (c === ')' || c === ']') { depth--; token += c; } else if (!depth && (c === '>' || /\s/.test(c))) { if (token) { out.push(token); token = ''; } if (c === '>') out.push(c); } else token += c; } if (token) out.push(token); return out; }
  function selectorBranches(selector) {
    const out = []; let start = 0, depth = 0, quote = '';
    for (let i = 0; i < selector.length; i++) { const c = selector[i]; if (quote) { if (c === quote && selector[i - 1] !== '\\') quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--; else if (c === ',' && !depth) { out.push(selector.slice(start, i)); start = i + 1; } }
    out.push(selector.slice(start)); return out;
  }
  function compileAtom(source) {
    let compiled = compiledAtoms.get(source); if (compiled) return compiled;
    let selector = source; const functions = [];
    for (let match = /:(is|where|not)\(/.exec(selector); match; match = /:(is|where|not)\(/.exec(selector)) {
      const start = match.index + match[0].length; let end = start, depth = 1, quote = '';
      for (; end < selector.length && depth; end++) { const c = selector[end]; if (quote) { if (c === quote && selector[end - 1] !== '\\') quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '(') depth++; else if (c === ')') depth--; }
      functions.push({ negative: match[1] === 'not', selector: compileSelector(selector.slice(start, depth ? end : end - 1)) }); selector = selector.slice(0, match.index) + selector.slice(end);
    }
    const attrs = []; selector = selector.replace(/\[([^\s~|^$*!=\]]+)\s*(?:([~|^$*]?=)\s*["']?([^\]"']*)["']?)?\]/g, (_, name, operator, value) => { attrs.push({ name, operator, value: value == null ? '' : value.trim() }); return ''; });
    compiled = { empty: !source, scope: /:scope\b/.test(selector), first: /:first-child\b/.test(selector), last: /:last-child\b/.test(selector), unsupported: /:hover|:focus|:active|:visited|:disabled|:checked|:has\(/.test(selector), functions, attrs, classes: [], ids: [], tag: '' };
    selector = selector.replace(/:[-\w]+(?:\([^()]*\))?/g, '');
    const tag = /^[a-z][\w:-]*/i.exec(selector); if (tag) compiled.tag = tag[0].toLowerCase();
    for (const match of selector.matchAll(/\.([-\w]+)/g)) compiled.classes.push(match[1]);
    for (const match of selector.matchAll(/#([-\w]+)/g)) compiled.ids.push(match[1]);
    compiledAtoms.set(source, compiled); if (compiledAtoms.size > 4096) compiledAtoms.delete(compiledAtoms.keys().next().value); return compiled;
  }
  function compileSelector(value) {
    const selector = String(value || ''); let compiled = compiledSelectors.get(selector); if (compiled) return compiled;
    compiled = []; const branches = selectorBranches(selector);
    for (const branch of branches) { const parts = splitSelector(branch), steps = []; if (branches.length === 1) compiled.partCount = parts.length; if (!parts.length) continue; steps.push({ atom: compileAtom(parts.pop()), direct: false }); while (parts.length) { let part = parts.pop(), direct = part === '>'; if (direct) part = parts.pop(); steps.push({ atom: compileAtom(part || ''), direct }); } compiled.push(steps); }
    compiledSelectors.set(selector, compiled); if (compiledSelectors.size > 4096) compiledSelectors.delete(compiledSelectors.keys().next().value); return compiled;
  }
  function nodeClasses(node) { const source = String(node.attrs.class || ''); if (node._selectorClassSource !== source) { node._selectorClassSource = source; node._selectorClasses = new Set(source.split(/\s+/).filter(Boolean)); } return node._selectorClasses; }
  function atom(node, compiled, scope) {
    if (!node || !compiled || compiled.empty || compiled.unsupported || compiled.scope && node !== scope || compiled.tag && node.localName !== compiled.tag) return false;
    if (compiled.first && (!node.parentNode || node.parentNode.children[0] !== node) || compiled.last && (!node.parentNode || node.parentNode.children[node.parentNode.children.length - 1] !== node)) return false;
    if (compiled.classes.length) { const classes = nodeClasses(node); for (const name of compiled.classes) if (!classes.has(name)) return false; }
    for (const id of compiled.ids) if (node.getAttribute('id') !== id) return false;
    for (const attr of compiled.attrs) { const value = node.getAttribute(attr.name), wanted = attr.value, op = attr.operator; if (value == null || op === '=' && value !== wanted || op === '~=' && !value.split(/\s+/).includes(wanted) || op === '^=' && !value.startsWith(wanted) || op === '$=' && !value.endsWith(wanted) || op === '*=' && !value.includes(wanted)) return false; }
    for (const fn of compiled.functions) { const accepted = matchesCompiled(node, fn.selector, scope); if (fn.negative ? accepted : !accepted) return false; }
    return true;
  }
  function matchesCompiled(node, compiled, scope) {
    scope = scope || node;
    for (const steps of compiled) { if (!atom(node, steps[0].atom, scope)) continue; let parent = node.parentNode, accepted = true; for (let i = 1; i < steps.length; i++) { const step = steps[i]; if (step.direct) { if (!atom(parent, step.atom, scope)) { accepted = false; break; } parent = parent.parentNode; } else { while (parent && !atom(parent, step.atom, scope)) parent = parent.parentNode; if (!parent) { accepted = false; break; } parent = parent.parentNode; } } if (accepted) return true; }
    return false;
  }
  function matches(node, selector, scope) { return matchesCompiled(node, compileSelector(selector), scope); }
  function selectorInputs(compiled) {
    for (const steps of compiled) for (const { atom: part } of steps) {
      for (const name of part.classes) selectorClasses.add(name);
      for (const id of part.ids) selectorIds.add(id);
      for (const attr of part.attrs) selectorAttrs.add(attr.name);
      if (part.first || part.last) positionalSelectors = true;
      for (const fn of part.functions) selectorInputs(fn.selector);
    }
  }
  function styleClasses(node) {
    const source = node.attrs.class || '';
    if (node._styleClassSource !== source || node._styleClassVersion !== styleVersion) {
      let key = styleClassKeys.get(source);
      if (key === undefined) { key = [...nodeClasses(node)].filter(name => name !== 'gd-hush' && selectorClasses.has(name)).sort().join('.'); styleClassKeys.set(source, key); if (styleClassKeys.size > 1024) styleClassKeys.delete(styleClassKeys.keys().next().value); }
      node._styleClassSource = source; node._styleClassVersion = styleVersion; node._styleClasses = key;
    }
    return node._styleClasses;
  }
  function selectorOwnKey(node) {
    const attributes = Object.keys(node.attrs).filter(name => selectorAttrs.has(name)).sort().map(name => [name, node.attrs[name]]);
    const siblings = positionalSelectors && node.parentNode ? ':' + (node.parentNode.children[0] === node ? 1 : 0) + (node.parentNode.children[node.parentNode.children.length - 1] === node ? 1 : 0) : '';
    // Generated art IDs and gameplay-only classes do not change a CSS match.
    // Share the match result while retaining every input used by a selector,
    // including nested :is/:not branches and sibling position.
    return node.localName + '.' + styleClasses(node) + '#' + (selectorIds.has(node.attrs.id) ? node.attrs.id : '') + JSON.stringify(attributes) + siblings;
  }
  function selectorPositions(node) {
    let key = '|position:';
    for (let n = node; n; n = n.parentNode) { const siblings = n.parentNode && n.parentNode.children; key += siblings && siblings[0] === n ? '1' : '0'; key += siblings && siblings[siblings.length - 1] === n ? '1' : '0'; }
    return key;
  }
  function rulesFor(node) {
    const key = node.localName + '#' + (selectorIds.has(node.attrs.id) ? node.attrs.id : '') + '.' + styleClasses(node); let candidates = candidateRules.get(key); if (candidates) return candidates;
    candidates = [];
    for (const bucket of ['*', 't:' + node.localName, 'i:' + (node.attrs.id || '')]) { const list = indexedRules.get(bucket); if (list) candidates.push(...list); }
    for (const cls of nodeClasses(node)) { const list = indexedRules.get('c:' + cls); if (list) candidates.push(...list); }
    candidates.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
    candidateRules.set(key, candidates); if (candidateRules.size > 1024) candidateRules.delete(candidateRules.keys().next().value); return candidates;
  }
  function cssBlocks(css, callback) {
    let i = 0;
    while (i < css.length) { const open = css.indexOf('{', i); if (open < 0) break; const head = css.slice(i, open).trim(); let depth = 1, end = open + 1, quote = ''; for (; end < css.length && depth; end++) { const c = css[end]; if (quote) { if (c === quote && css[end - 1] !== '\\') quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '{') depth++; else if (c === '}') depth--; } callback(head, css.slice(open + 1, end - 1)); i = end; }
  }
  function configure(cssText, renderer) {
    if (renderer) installNativeTriangleBatch(renderer);
    if (cssText === null && renderer) return { rules: rules.length, keyframes: keyframes.size };
    rules.length = 0; indexedRules.clear(); keyframes.clear(); matchedRules.clear(); selectorAttrs.clear(); selectorClasses.clear(); selectorIds.clear(); compiledSelectors.clear(); compiledAtoms.clear(); candidateRules.clear(); styleClassKeys.clear(); ruleOrder = 0; styleVersion++; positionalSelectors = false;
    const css = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
    function visit(text) { cssBlocks(text, (head, body) => {
      if (/^@(?:-webkit-)?keyframes\s+/.test(head)) { const name = head.split(/\s+/).pop(), frames = []; cssBlocks(body, (key, value) => { for (const offset of key.split(',')) frames.push({ offset: offset.trim() === 'from' ? 0 : offset.trim() === 'to' ? 1 : num(offset) / 100, style: declarations(value) }); }); frames.sort((a, b) => a.offset - b.offset); keyframes.set(name, frames); return; }
      if (head.startsWith('@')) { if (!/prefers-reduced-motion|data-motion.*reduced/.test(head)) visit(body); return; }
      if (!/\.(?:g[\w-]*|p(?:et|t|f)[\w-]*|wd-|tg-|ee-)/.test(head)) return;
      const style = declarations(body);
      // The engine owns spectacle clock pausing. Its scene flag must not
      // trigger a stylesheet cascade or replace any retained drawing.
      if (/\.gd-hush\b/.test(head) && Object.keys(style).every(key => key === 'animation-play-state')) return;
      for (const selector of selectorBranches(head)) {
        const compiled = compileSelector(selector), right = compiled[0] && compiled[0][0].atom, specificity = (selector.match(/#/g) || []).length * 100 + (selector.match(/[.\[]/g) || []).length * 10 + (compiled.partCount == null ? splitSelector(selector).length : compiled.partCount);
        const rule = { selector: selector.trim(), compiled, style, specificity, order: ruleOrder++ }; rules.push(rule);
        selectorInputs(compiled);
        const key = right && right.classes.length ? 'c:' + right.classes[right.classes.length - 1] : right && right.ids.length ? 'i:' + right.ids[0] : right && right.tag ? 't:' + right.tag : '*'; let list = indexedRules.get(key); if (!list) indexedRules.set(key, list = []); list.push(rule);
      }
    }); }
    visit(css); return { rules: rules.length, keyframes: keyframes.size };
  }
  function resolve(value, styles) {
    let out = String(value == null ? '' : value); for (let i = 0; i < 5 && out.includes('var('); i++) out = out.replace(/var\(\s*(--[-\w]+)\s*(?:,\s*([^()]*))?\)/g, (_, key, fallback) => styles[key] || fallback || '0');
    for (let i = 0; i < 4 && out.includes('calc('); i++) out = out.replace(/calc\(([^()]*)\)/g, (_, expression) => {
      const unit = (expression.match(/(?:\d|\.)\s*(px|ms|s|deg|%)/) || [])[1] || '', tokens = expression.replace(/(?:px|ms|deg|s|%)/g, '').match(/(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?|[+*/-]/gi) || [];
      const values = [], operators = [], priority = op => op === '*' || op === '/' ? 2 : 1, apply = () => { const op = operators.pop(), b = values.pop(), a = values.pop(); values.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b ? a / b : 0); }; let expectValue = true, sign = 1;
      for (const token of tokens) { if (/^[+*/-]$/.test(token)) { if (expectValue && (token === '-' || token === '+')) { if (token === '-') sign *= -1; continue; } while (operators.length && priority(operators[operators.length - 1]) >= priority(token)) apply(); operators.push(token); expectValue = true; } else { values.push(Number(token) * sign); sign = 1; expectValue = false; } }
      while (operators.length && values.length > 1) apply(); return Number.isFinite(values[0]) ? values[0] + unit : '0';
    }); return out;
  }
  function matrix(text, box, styles) {
    let out = ID, rotationHint = 0; text = resolve(text, styles || {});
    for (const call of text.matchAll(/(matrix|translate[xy]?|scale[xy]?|rotate|skew[xy]?)\s*\(([^)]*)\)/gi)) {
      const name = call[1].toLowerCase(), raw = call[2].split(/[ ,]+/).filter(Boolean), v = [];
      for (let i = 0, length = raw.length; i < length; i++) {
        const s = raw[i];
        v[i] = s.endsWith('%') ? name.startsWith('scale') ? num(s) / 100 : num(s) * ((name === 'translatey' || name === 'translate' && i === 1 ? box && box.height : box && box.width) || 0) / 100 : s.endsWith('rad') ? num(s) * 180 / Math.PI : s.endsWith('turn') ? num(s) * 360 : num(s);
      }
      let m = ID;
      if (name === 'matrix' && v.length >= 6) m = { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] };
      else if (name.startsWith('translate')) m = { ...ID, e: name === 'translatey' ? 0 : v[0] || 0, f: name === 'translatey' ? v[0] || 0 : v[1] || 0 };
      else if (name.startsWith('scale')) m = { ...ID, a: name === 'scaley' ? 1 : v[0] == null ? 1 : v[0], d: name === 'scalex' ? 1 : name === 'scaley' ? v[0] : v[1] == null ? v[0] : v[1] };
      else if (name === 'rotate') { const r = (v[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); rotationHint += r; m = { a: c, b: s, c: -s, d: c, e: 0, f: 0 }; if (v.length > 2) m = mul({ ...ID, e: v[1], f: v[2] }, mul(m, { ...ID, e: -v[1], f: -v[2] })); }
      else if (name.startsWith('skew')) m = { ...ID, c: name !== 'skewy' ? Math.tan((v[0] || 0) * Math.PI / 180) : 0, b: name === 'skewy' ? Math.tan((v[0] || 0) * Math.PI / 180) : 0 };
      out = mul(out, m);
    }
    return { ...out, rotationHint };
  }
  function around(m, x, y) { return { ...m, e: m.e + x - m.a * x - m.c * y, f: m.f + y - m.b * x - m.d * y }; }
  function viewportBox(node) { for (let svg = node; svg; svg = svg.parentNode) if (svg.localName === 'svg') { const v = nums(svg.attrs.viewBox || svg.attrs.viewbox); if (v.length === 4) return { x: v[0], y: v[1], width: v[2], height: v[3] }; if (num(svg.attrs.width) > 0 && num(svg.attrs.height) > 0) return { x: 0, y: 0, width: num(svg.attrs.width), height: num(svg.attrs.height) }; } return node.getBBox(); }
  function referenceBox(node) { return /^(fill-box|content-box|border-box)$/.test(node._styles['transform-box'] || '') ? node.getBBox() : viewportBox(node); }
  function originPoint(value, box, style) {
    let parts = resolve(value || '0 0', style).trim().split(/\s+/); if (parts.length === 1) parts.push('center'); if (/^(top|bottom)$/.test(parts[0]) || /^(left|right)$/.test(parts[1])) parts = [parts[1], parts[0]];
    const coordinate = (text, start, size, vertical) => { if (text === 'center') text = '50%'; else if (text === (vertical ? 'top' : 'left')) text = '0%'; else if (text === (vertical ? 'bottom' : 'right')) text = '100%'; return String(text).endsWith('%') ? start + num(text) * size / 100 : num(text); };
    return { x: coordinate(parts[0], box.x, box.width, false), y: coordinate(parts[1], box.y, box.height, true) };
  }
  function presentationMatrix(node, override, properties) {
    const style = properties && (properties.origin || properties.box) ? { ...node._styles, 'transform-origin': properties.origin || node._styles['transform-origin'], 'transform-box': properties.box || node._styles['transform-box'] } : node._styles, individual = ['translate', 'rotate', 'scale'].some(key => properties && properties[key] || style[key] && style[key] !== 'none'), css = override != null || style.transform != null || individual, authored = style.transform != null ? style.transform : node.attrs.transform, needsBox = properties || /%|center|left|right|top|bottom/.test([authored, style.translate, style.scale, style['transform-origin']].join(' ')), box = needsBox ? /^(fill-box|content-box|border-box)$/.test(style['transform-box'] || '') ? node.getBBox() : viewportBox(node) : { x: 0, y: 0, width: 0, height: 0 };
    let out = ID;
    for (const key of ['translate', 'rotate', 'scale']) if (properties && properties[key]) out = mul(out, properties[key]); else if (style[key] && style[key] !== 'none') out = mul(out, matrix(key + '(' + resolve(style[key], style).replace(/^z\s+/, '') + ')', box, style));
    out = mul(out, override || matrix(authored, box, style));
    if (css) { const origin = originPoint(style['transform-origin'], box, style); out = around(out, origin.x, origin.y); }
    if (node.localName === 'svg') out = mul(out, viewport(node.attrs));
    return out;
  }
  function nativeMatrix(node, m) {
    const outer = node.target, inner = node._inner, a = m.a, b = m.b, c = m.c, d = m.d, dot = a * c + b * d;
    if (Math.abs(dot) > .00001 * Math.max(1, Math.hypot(a, b) * Math.hypot(c, d))) {
      const aa = a * a + b * b, dd = c * c + d * d, angle = .5 * Math.atan2(2 * dot, aa - dd), cs = Math.cos(angle), sn = Math.sin(angle), disc = Math.hypot(aa - dd, 2 * dot), sx = Math.sqrt(Math.max(0, (aa + dd + disc) / 2)), sy = (a * d - b * c < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (aa + dd - disc) / 2));
      outer.setPosition(m.e, m.f).setRotation(Math.atan2(b * cs + d * sn, a * cs + c * sn)).setScale(sx, sy); inner.setRotation(-angle);
    } else { const sx = Math.hypot(a, b), sy = sx > 1e-8 ? (a * d - b * c) / sx : Math.hypot(c, d); outer.setPosition(m.e, m.f).setRotation(sx > 1e-8 ? Math.atan2(b, a) : Math.atan2(-c, d)).setScale(sx, sy); inner.setRotation(0); }
    node._matrix = m;
  }
  function parsePath(source) {
    source = String(source || ''); if (paths.has(source)) return paths.get(source);
    const tokens = source.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [], contours = [];
    let i = 0, command = '', x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0, last = '', contour = null;
    const begin = (a, b) => { contour = { points: [{ x: a, y: b }], closed: false }; contours.push(contour); sx = a; sy = b; };
    const line = (a, b) => { if (!contour) begin(x, y); contour.points.push({ x: a, y: b }); x = a; y = b; };
    function cubic(x1, y1, x2, y2, x3, y3) { const flatten = (ax, ay, bx, by, cx, cy, dx, dy, depth) => { const ex = dx - ax, ey = dy - ay, length = Math.hypot(ex, ey), flat = length > 1e-8 ? Math.max(Math.abs(ex * (by - ay) - ey * (bx - ax)), Math.abs(ex * (cy - ay) - ey * (cx - ax))) / length : Math.max(Math.hypot(bx - ax, by - ay), Math.hypot(cx - ax, cy - ay)); if (flat <= .06 || depth >= 9) { line(dx, dy); return; } const abx = (ax + bx) / 2, aby = (ay + by) / 2, bcx = (bx + cx) / 2, bcy = (by + cy) / 2, cdx = (cx + dx) / 2, cdy = (cy + dy) / 2, lx = (abx + bcx) / 2, ly = (aby + bcy) / 2, rx = (bcx + cdx) / 2, ry = (bcy + cdy) / 2, mx = (lx + rx) / 2, my = (ly + ry) / 2; flatten(ax, ay, abx, aby, lx, ly, mx, my, depth + 1); flatten(mx, my, rx, ry, cdx, cdy, dx, dy, depth + 1); }; flatten(x, y, x1, y1, x2, y2, x3, y3, 0); px = x2; py = y2; }
    function arc(rx, ry, degrees, large, sweep, tx, ty) {
      rx = Math.abs(rx); ry = Math.abs(ry); if (!rx || !ry || x === tx && y === ty) { line(tx, ty); return; }
      const phi = degrees * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi), dx = (x - tx) / 2, dy = (y - ty) / 2, xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
      const ratio = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (ratio > 1) { const scale = Math.sqrt(ratio); rx *= scale; ry *= scale; }
      const denom = rx * rx * yp * yp + ry * ry * xp * xp, factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - denom) / Math.max(1e-12, denom))), cxp = factor * rx * yp / ry, cyp = -factor * ry * xp / rx, cx = cp * cxp - sp * cyp + (x + tx) / 2, cy = sp * cxp + cp * cyp + (y + ty) / 2;
      const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry, vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry; let start = Math.atan2(uy, ux), delta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (!sweep && delta > 0) delta -= Math.PI * 2; if (sweep && delta < 0) delta += Math.PI * 2;
      const steps = Math.max(4, Math.min(80, Math.ceil(Math.abs(delta) * Math.sqrt(Math.max(rx, ry)) * 1.4)));
      for (let k = 1; k <= steps; k++) { const a = start + delta * k / steps; line(cx + cp * rx * Math.cos(a) - sp * ry * Math.sin(a), cy + sp * rx * Math.cos(a) + cp * ry * Math.sin(a)); }
      x = tx; y = ty;
    }
    let guard = 0;
    while (i < tokens.length && guard++ < 300000) {
      if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
      const kind = command.toUpperCase(), relative = command !== kind, count = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }[kind];
      if (count == null) break;
      if (kind === 'Z') { if (contour) contour.closed = true; x = sx; y = sy; command = ''; last = 'Z'; continue; }
      if (i + count > tokens.length || /^[a-z]$/i.test(tokens[i])) break;
      const a = tokens.slice(i, i + count).map(Number); if (!a.every(Number.isFinite)) break; i += count; const ox = relative ? x : 0, oy = relative ? y : 0;
      if (kind === 'M') { x = ox + a[0]; y = oy + a[1]; begin(x, y); command = relative ? 'l' : 'L'; }
      else if (kind === 'L') line(ox + a[0], oy + a[1]);
      else if (kind === 'H') line(ox + a[0], y);
      else if (kind === 'V') line(x, oy + a[0]);
      else if (kind === 'C') cubic(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]);
      else if (kind === 'S') cubic(last === 'C' || last === 'S' ? 2 * x - px : x, last === 'C' || last === 'S' ? 2 * y - py : y, ox + a[0], oy + a[1], ox + a[2], oy + a[3]);
      else if (kind === 'Q' || kind === 'T') { const qx = kind === 'T' ? last === 'Q' || last === 'T' ? 2 * x - px : x : ox + a[0], qy = kind === 'T' ? last === 'Q' || last === 'T' ? 2 * y - py : y : oy + a[1], tx = ox + a[kind === 'T' ? 0 : 2], ty = oy + a[kind === 'T' ? 1 : 3], ax = x, ay = y; cubic(ax + (qx - ax) * 2 / 3, ay + (qy - ay) * 2 / 3, tx + (qx - tx) * 2 / 3, ty + (qy - ty) * 2 / 3, tx, ty); px = qx; py = qy; }
      else if (kind === 'A') arc(a[0], a[1], a[2], !!a[3], !!a[4], ox + a[5], oy + a[6]);
      last = kind;
    }
    const output = contours.filter(c => c.points.length); if (source.length < 150000) { paths.set(source, output); if (paths.size > 512) paths.delete(paths.keys().next().value); } return output;
  }
  function ellipse(cx, cy, rx, ry, count) { count = count || Math.max(24, Math.min(192, Math.ceil(Math.PI * Math.sqrt(Math.max(Math.abs(rx), Math.abs(ry)) / .08)))); const points = []; for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2; points.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); } return points; }
  function geometry(tag, attrs) {
    const x = num(attrs.x), y = num(attrs.y), w = num(attrs.width), h = num(attrs.height);
    if (tag === 'path') return parsePath(attrs.d);
    if (tag === 'circle' || tag === 'ellipse') return [{ points: ellipse(num(attrs.cx), num(attrs.cy), num(attrs.rx, num(attrs.r)), num(attrs.ry, num(attrs.r))), closed: true }];
    if (tag === 'line') return [{ points: [{ x: num(attrs.x1), y: num(attrs.y1) }, { x: num(attrs.x2), y: num(attrs.y2) }], closed: false }];
    if (tag === 'polygon' || tag === 'polyline') { const values = nums(attrs.points), points = []; for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] }); return [{ points, closed: tag === 'polygon' }]; }
    if (tag === 'rect') {
      const rx = Math.max(0, Math.min(w / 2, num(attrs.rx, num(attrs.ry)))), ry = Math.max(0, Math.min(h / 2, num(attrs.ry, rx))); if (!rx || !ry) return [{ points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], closed: true }];
      const points = [], steps = Math.max(6, Math.min(32, Math.ceil(Math.sqrt(Math.max(rx, ry)) * 3))); for (const [cx, cy, start] of [[x + w - rx, y + ry, -Math.PI / 2], [x + w - rx, y + h - ry, 0], [x + rx, y + h - ry, Math.PI / 2], [x + rx, y + ry, Math.PI]]) for (let i = 0; i <= steps; i++) { const a = start + i / steps * Math.PI / 2; points.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }); } return [{ points, closed: true }];
    }
    return [];
  }
  function boxOf(points, padding) { if (!points.length) return { x: 0, y: 0, width: 0, height: 0 }; let x = Infinity, y = Infinity, r = -Infinity, b = -Infinity; for (const p of points) { x = Math.min(x, p.x); y = Math.min(y, p.y); r = Math.max(r, p.x); b = Math.max(b, p.y); } padding = padding || 0; return { x: x - padding, y: y - padding, width: r - x + 2 * padding, height: b - y + 2 * padding }; }
  function alpha(value, style, fallback) { const text = resolve(value, style || {}); return Math.max(0, Math.min(1, text.endsWith('%') ? num(text) / 100 : num(text, fallback == null ? 1 : fallback))); }
  function color(value, styles, fallback) {
    styles = styles || {}; value = resolve(value, styles).trim().toLowerCase(); if (!value || value === 'none' || value === 'transparent') return null;
    if (value === 'currentcolor') value = resolve(styles.color || '#000000', styles).trim().toLowerCase();
    if (value === 'currentcolor') value = '#000000';
    if (value === 'none' || value === 'transparent') return null;
    if (value[0] === '#') { const text = value.slice(1), n = text.length <= 4 ? text.split('').map(c => c + c).join('') : text; return { color: parseInt(n.slice(0, 6), 16), alpha: n.length === 8 ? parseInt(n.slice(6), 16) / 255 : 1 }; }
    const rgb = /^rgba?\(([^)]+)\)/.exec(value); if (rgb) { const a = rgb[1].split(/[ ,/]+/).filter(Boolean).map((v, i) => v.endsWith('%') ? num(v) * (i === 3 ? .01 : 2.55) : num(v)), channel = i => Math.max(0, Math.min(255, Math.round(a[i]))); return { color: channel(0) << 16 | channel(1) << 8 | channel(2), alpha: Math.max(0, Math.min(1, a[3] == null ? 1 : a[3])) }; }
    const hsl = /^hsla?\(([^)]+)\)/.exec(value); if (hsl) { const values = hsl[1].split(/[ ,/]+/).filter(Boolean), angle = values[0] || '0', hue = ((num(angle) * (angle.endsWith('turn') ? 360 : angle.endsWith('rad') ? 180 / Math.PI : 1) % 360) + 360) % 360 / 360, saturation = Math.max(0, Math.min(1, num(values[1]) / 100)), light = Math.max(0, Math.min(1, num(values[2]) / 100)), a = saturation * Math.min(light, 1 - light), channel = n => { const k = (n + hue * 12) % 12; return Math.round(255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return { color: channel(0) << 16 | channel(8) << 8 | channel(4), alpha: alpha(values[3], styles) }; }
    const names = { black: 0x000000, white: 0xffffff, red: 0xff0000, green: 0x008000, blue: 0x0000ff, yellow: 0xffff00, orange: 0xffa500, grey: 0x808080, gray: 0x808080, brown: 0xa52a2a, gold: 0xffd700, purple: 0x800080, pink: 0xffc0cb, navy: 0x000080, teal: 0x008080, lime: 0x00ff00, aqua: 0x00ffff, cyan: 0x00ffff, silver: 0xc0c0c0, maroon: 0x800000, fuchsia: 0xff00ff, magenta: 0xff00ff, olive: 0x808000, rebeccapurple: 0x663399 };
    return { color: names[value] == null ? fallback == null ? 0x000000 : fallback : names[value], alpha: 1 };
  }
  function stylesFor(node) {
    const parent = node.parentNode && node.parentNode._styles || {}, styles = {};
    for (const key of Object.keys(parent)) if (key.startsWith('--') || inheritedStyles.has(key)) styles[key] = parent[key];
    styles.fill = styles.fill || '#000000'; styles.color = styles.color || '#000000';
    for (const key of Object.keys(node.attrs)) if (key !== 'style' && key !== 'class' && key !== 'transform') styles[key] = node.attrs[key];
    node._selectorKey = (node.parentNode ? node.parentNode._selectorKey || selectorKey(node.parentNode) : '') + '/' + selectorOwnKey(node);
    const matchKey = node._selectorKey + (positionalSelectors ? selectorPositions(node) : '');
    let matched = matchedRules.get(matchKey);
    if (!matched) { matched = {}; for (const rule of rulesFor(node)) if (matchesCompiled(node, rule.compiled)) Object.assign(matched, rule.style); matchedRules.set(matchKey, matched); if (matchedRules.size > 2048) matchedRules.delete(matchedRules.keys().next().value); }
    Object.assign(styles, matched, node._styleValues);
    node._ownFillOpacity = [node.attrs['fill-opacity'], matched['fill-opacity'], node._styleValues['fill-opacity']].some(value => value != null && value !== 'inherit' && value !== 'unset');
    for (const key of Object.keys(styles)) if (styles[key] === 'inherit' || styles[key] === 'unset') { if (styles[key] === 'inherit' || inheritedStyles.has(key) || key.startsWith('--')) { if (parent[key] != null) styles[key] = parent[key]; else delete styles[key]; } else delete styles[key]; } else if (styles[key] === 'initial' || styles[key] === 'revert') delete styles[key];
    if (String(styles.color).toLowerCase() === 'currentcolor') styles.color = parent.color || '#000000';
    styles.fill = styles.fill || '#000000'; styles.color = styles.color || '#000000';
    node._inheritedKey = Object.keys(styles).filter(key => key.startsWith('--') || inheritedStyles.has(key)).sort().map(key => key + ':' + styles[key]).join(';');
    node._appliedParentStyleKey = parentStyleKey(node.parentNode, node.context);
    return styles;
  }
  function visualClasses(value) { return String(value || '').split(/\s+/).filter(c => c && c !== 'gd-hush').join(' '); }
  function selectorKey(node) { return (node.parentNode ? node.parentNode._selectorKey || selectorKey(node.parentNode) : '') + '/' + selectorOwnKey(node); }
  function transformKey(node) { const style = node._styles; return [style.transform == null ? '<attribute>' : resolve(style.transform, style), ...['translate', 'rotate', 'scale', 'transform-origin', 'transform-box'].map(key => resolve(style[key], style)), resolve(node.attrs.transform, style), node.localName === 'svg' ? [node.attrs.x, node.attrs.y, node.attrs.width, node.attrs.height, node.attrs.viewBox, node.attrs.preserveAspectRatio].join(',') : ''].join('|'); }
  const radialLeafRecipe = Object.freeze({ radialLeaf: true, quality: 2, adaptive: true, crop: false, preserveOwnMotion: true });
  function radialLeafGradientKey(node) {
    if ((node.localName !== 'circle' && node.localName !== 'ellipse') || node.children.length) return null;
    const style = node._styles, ref = /^url\(['"]?#([^)'"\s]+)['"]?\)$/.exec(resolve(style.fill, style));
    const definition = ref && node.context.defs.get(ref[1]);
    if (!definition || definition.tag !== 'radialgradient' || definition.children.length < 2 || definition.children.length > 8) return null;
    const attrs = definition.attrs, numeric = value => value == null || /^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?%?$/i.test(String(value).trim()) && Number.isFinite(num(value));
    // Literal object-bbox gradients have no viewport, href, custom-property or
    // inherited stop-color dependency. Unknown definitions keep their vectors.
    for (const key of Object.keys(attrs)) if (!['id','cx','cy','r','fx','fy','fr','gradientUnits','spreadMethod'].includes(key)) return null;
    if (attrs.gradientUnits != null && attrs.gradientUnits !== 'objectBoundingBox' || attrs.spreadMethod != null && attrs.spreadMethod !== 'pad' || !['cx','cy','r','fx','fy','fr'].every(key => numeric(attrs[key]))) return null;
    for (const stop of definition.children) {
      if (stop.tag !== 'stop' || stop.children.length || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(stop.attrs['stop-color'] || '') || !numeric(stop.attrs.offset) || !numeric(stop.attrs['stop-opacity']) || stop.attrs['stop-opacity'] == null && style['stop-opacity'] != null) return null;
      for (const key of Object.keys(stop.attrs)) if (!['offset','stop-color','stop-opacity'].includes(key)) return null;
    }
    return JSON.stringify([attrs, definition.children.map(stop => stop.attrs)]);
  }
  function syncRadialLeafCache(node) {
    const state = stateFor(node.scene), oldRecipe = node._cacheRecipe;
    if (oldRecipe && !oldRecipe.radialLeaf) { node._radialLeafPaintKey = null; return; }
    // Dense drawable paint is required before a gradient definition or local
    // bounds can make this leaf eligible for the existing cache.
    const graphics = node._graphics, words = graphics && graphics.commandBuffer.length;
    const candidate = graphics && !node.nativeBounds && !node._label && !node._strokeGraphics && words >= 16384 && words <= 262144;
    const gradient = candidate ? radialLeafGradientKey(node) : null, b = gradient && node.getBBox();
    const eligible = gradient && b && [b.x,b.y,b.width,b.height].every(Number.isFinite) && b.width > 0 && b.height > 0 && b.width <= 128 && b.height <= 128 && b.width * b.height <= 8192;
    if (!eligible) {
      if (oldRecipe && oldRecipe.radialLeaf) { releaseCache(node, false); state.cacheTrackedNodes.delete(node); state.recaches.delete(node); delete node._cacheRecipe; }
      node._radialLeafPaintKey = null; return;
    }
    node._radialLeafPaintKey = gradient;
    node._cacheRecipe = oldRecipe || { ...radialLeafRecipe }; state.cacheTrackedNodes.add(node);
    // Registration only: the existing shared scheduler owns every capture.
    if (!node._cache) queueCache(node, 0, 'missing');
  }
  function radialLeafReady(node) {
    const stamp = node._radialLeafPaintKey;
    if (!stamp) return false;
    const gradient = radialLeafGradientKey(node);
    if (!gradient || gradient !== stamp) { node.restyle(false); return false; }
    const graphics = node._graphics, steps = graphics && graphics._renderSteps, cache = node._cache, tiles = cache ? cache.tiles : [], list = node._inner.list;
    if (node.children.length || node._animations.length || node._nativeAnimating || node._animatedPaint || !graphics || node._strokeGraphics || node._inner.scaleX !== 1 || node._inner.scaleY !== 1 || graphics.x !== 0 || graphics.y !== 0 || graphics.rotation !== 0 || graphics.scaleX !== 1 || graphics.scaleY !== 1 || graphics.scrollFactorX !== 1 || graphics.scrollFactorY !== 1 || graphics.mask || graphics.cameraFilter !== 0 || graphics.blendMode !== -1 && graphics.blendMode !== 0 || graphics._nativeCacheHiddenBy && graphics._nativeCacheHiddenBy !== node || graphics.alpha !== alpha(node._styles['fill-opacity'], node._styles) || !Array.isArray(steps) || steps.length !== 1 || steps[0] !== graphics.renderWebGL || list.length !== tiles.length + 1 || list[0] !== graphics || node.target.filterCamera || node._inner.filterCamera || graphics.filterCamera) return false;
    for (let i = 0; i < tiles.length; i++) if (list[i + 1] !== tiles[i]) return false;
    for (let parent = node; parent; parent = parent.parentNode) {
      if (parent.target.blendMode !== -1 && parent.target.blendMode !== 0 || parent._inner.blendMode !== -1 && parent._inner.blendMode !== 0 || parent.target.scrollFactorX !== 1 || parent.target.scrollFactorY !== 1 || parent._inner.scrollFactorX !== 1 || parent._inner.scrollFactorY !== 1 || parent.target.mask || parent._inner.mask || parent.target.filterCamera || parent._inner.filterCamera || parent._animatedPaint || parent._animations.some(animation => animation.tracks.paintOpacity.length) || parent._styles['clip-path'] && parent._styles['clip-path'] !== 'none' || parent.attrs['clip-path'] && parent.attrs['clip-path'] !== 'none' || parent.localName === 'svg' && parent._styles.overflow !== 'visible' && parent.attrs.overflow !== 'visible') return false;
      // Existing ancestor captures retain ownership and flatten children back
      // to vectors themselves; avoid a second scheduled capture underneath.
      if (parent !== node && (parent._cache || parent._cacheRecipe && stateFor(parent.scene).cacheTrackedNodes.has(parent))) return false;
    }
    return true;
  }
  function paintKey(node, clipKey) { if (node.localName === 'image') return clipKey + '|image:' + ['href', 'xlink:href', 'x', 'y', 'width', 'height'].map(key => node.attrs[key] || '').join('|'); if (!SHAPES.has(node.localName) && node.localName !== 'text' && node.localName !== 'tspan') return clipKey; const style = node._styles, keys = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'color']; return clipKey + '|' + keys.map(key => key + ':' + resolve(style[key], style)).join(';') + '|' + (SHAPES.has(node.localName) ? ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'r', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'points'].map(key => node.attrs[key] || '').join('|') : [node.attrs.x || '', node.attrs.y || '', node.textContent].join('|')) + ((node.localName === 'circle' || node.localName === 'ellipse') ? '|radial:' + (radialLeafGradientKey(node) || '') : ''); }
  function parentStyleKey(parent, context) { return (parent ? (parent._selectorKey || selectorKey(parent)) + '|' + parent._inheritedKey : '') + '|motion:' + (context.options.motion === false ? 0 : 1) + '|clip:' + (parent ? parent._clipKey || '' : ''); }
  function queueActorCache(node) {
    for (let root = node; root; root = root.parentNode) if (root.classList.contains('gd-sprite') || root.classList.contains('gd-bug')) { stateFor(node.scene).actorCaches.add(root); return; }
  }
  function stateFor(scene) { let state = sceneStates.get(scene); if (!state) { const lowMemory = typeof navigator !== 'undefined' && Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4; state = { animations: new Set(), roots: new Set(), defs: new Map(), cachedNodes: new Set(), cacheTrackedNodes: new Set(), actorCaches: new Set(), recaches: new Map(), labels: new Set(), cacheBytes: 0, cacheBudget: (lowMemory ? 64 : 128) * 1024 * 1024, lowMemory, created: 0, shapes: 0, cachedTiles: 0, unknownImages: 0 }; sceneStates.set(scene, state); liveStates.add(state); if (scene.events && scene.events.once) scene.events.once('shutdown', () => { liveStates.delete(state); for (const node of state.animations) pausedAmbient.delete(node); state.animations.clear(); state.roots.clear(); state.cachedNodes.clear(); state.cacheTrackedNodes.clear(); state.actorCaches.clear(); state.recaches.clear(); state.labels.clear(); state.cacheBytes = 0; state.cachedTiles = 0; }); } return state; }
  function styleObject(node) { const values = node._styleValues; return new Proxy(values, { get(target, key) { if (key === 'setProperty') return (name, value) => { target[name] = String(value); node._styleChanged(name); }; if (key === 'removeProperty') return name => { const old = target[name]; delete target[name]; node._styleChanged(name); return old || ''; }; if (key === 'getPropertyValue') return name => target[name] || ''; if (key === 'cssText') return Object.entries(target).map(([k, v]) => k + ':' + v).join(';'); return target[String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())] || ''; }, set(target, key, value) { const name = String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()); if (name === 'css-text') { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, declarations(value)); node.restyle(true); } else { target[name] = String(value); node._styleChanged(name); } return true; } }); }
  function clearPlayerBodies(owner) {
    const bodies = owner._nativePlayerBodies; if (!bodies) return;
    owner._nativePlayerBodies = null; owner._nativePlayerCurrent = null;
    for (const entry of bodies.values()) entry.node.destroy();
    bodies.clear();
  }
  function swapPlayerBody(owner, source) {
    const local = owner.classList.contains('gd-pl-in') && owner.closest('.gd-player'), peer = owner.classList.contains('gll-in') && owner.closest('.gll-actor');
    if (!local && !peer) return false;
    source = String(source == null ? '' : source);
    const bodies = owner._nativePlayerBodies || (owner._nativePlayerBodies = new Map()), old = owner._nativePlayerCurrent;
    if (old && old.source === source && !old.node._dead && old.node.target.active && old.node.parentNode === owner) {
      bodies.delete(source); bodies.set(source, old); return true;
    }
    owner._uncache(false, true);
    for (const child of [...owner.children]) {
      owner.removeChild(child);
      if (old && child === old.node && !child._dead) {
        if (typeof child.getAnimations === 'function') for (const animation of child.getAnimations({ subtree: true })) animation.cancel();
        child.target.setVisible(false);
      }
      else child.destroy();
    }
    owner._text = ''; owner._nativePlayerCurrent = null;
    if (!source) return true;
    let entry = bodies.get(source), fresh = false;
    if (entry && (entry.node._dead || !entry.node.target.active)) { bodies.delete(source); entry.node.destroy(); entry = null; }
    const context = owner.context, building = context.building;
    if (!entry) {
      const ast = parse(source); collectDefs(ast, context.defs);
      // Each retained body owns its compiled descendants and static caches.
      // The wrapper is transparent to innerHTML and contains only this pose.
      const body = new NativeNode(owner.scene, 'g', { 'data-native-player-body': '1' }, context);
      context.building = true;
      try { for (const child of ast.children) body.appendChild(build(owner.scene, child, context, 0)); body._text = ast.text; }
      finally { context.building = building; }
      entry = { source, ast, node: body }; fresh = true;
    } else collectDefs(entry.ast, context.defs);
    // A warm append compares the inherited style key before deciding whether
    // CSS changes require restyling; unchanged bodies retain all geometry.
    if (fresh) context.building = true;
    try { owner.appendChild(entry.node); }
    finally { context.building = building; }
    entry.node._visibility(); owner._nativePlayerCurrent = entry;
    bodies.delete(source); bodies.set(source, entry);
    if (!building) {
      if (fresh) entry.node.restyle(true);
      owner.restyle(false);
      if (fresh) stateFor(owner.scene).actorCaches.add(entry.node);
    }
    while (bodies.size > (peer ? 8 : 10)) {
      const key = bodies.keys().next().value, expired = bodies.get(key);
      if (expired === entry) break;
      bodies.delete(key); expired.node.destroy();
    }
    return true;
  }
  function stopPetBody(entry) {
    for (const node of entry.nodes) {
      if (node._pcH) node._pcH.stop(true);
      if (typeof node.getAnimations === 'function') for (const animation of node.getAnimations({ subtree: true })) animation.cancel();
    }
  }
  function destroyPetBody(entry) { stopPetBody(entry); for (const node of entry.nodes) node.destroy(); }
  function clearPetBodies(owner) {
    const bodies = owner._nativePetBodies; if (!bodies) return;
    owner._nativePetBodies = null; owner._nativePetCurrent = null;
    for (const entry of bodies.values()) destroyPetBody(entry);
    bodies.clear();
  }
  function petBodySnapshot(nodes) {
    const rows = [], walk = node => { rows.push({ node, attrs: { ...node.attrs }, inline: { ...node._styleValues }, text: node._text, children: new Set(node.children) }); for (const child of node.children) walk(child); };
    for (const node of nodes) walk(node); return rows;
  }
  function samePetValues(a, b) { const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]); }
  function resetPetBody(entry) {
    // Clip sprites are temporary children. Authored children and species roots
    // stay intact, including ids referenced by masks and part selectors.
    if (entry.rows.some(row => row.node._dead || !row.node.target.active || [...row.children].some(child => child.parentNode !== row.node))) return false;
    const dirty = new Set();
    for (const row of entry.rows) {
      const node = row.node;
      for (const child of [...node.children]) if (!row.children.has(child)) child.remove();
      const attrsChanged = !samePetValues(node.attrs, row.attrs), inlineChanged = !samePetValues(node._styleValues, row.inline), textChanged = node._text !== row.text;
      if (attrsChanged) node.attrs = { ...row.attrs };
      if (inlineChanged) { node._styleValues = { ...row.inline }; node.style = styleObject(node); }
      if (textChanged) node._text = row.text;
      if (attrsChanged || inlineChanged || textChanged) dirty.add(node);
    }
    entry.dirty = [...dirty].filter(node => { for (let parent = node.parentNode; parent; parent = parent.parentNode) if (dirty.has(parent)) return false; return true; });
    return true;
  }
  function swapPetBody(owner, source) {
    if (!owner.classList.contains('ptw-face') || !owner.closest('.ptw')) return false;
    source = String(source == null ? '' : source);
    const bodies = owner._nativePetBodies || (owner._nativePetBodies = new Map()), old = owner._nativePetCurrent;
    if (old && old.source === source && old.nodes.every(node => !node._dead && node.target.active && node.parentNode === owner)) {
      bodies.delete(source); bodies.set(source, old); return true;
    }
    owner._uncache(false, true);
    if (old) {
      stopPetBody(old);
      if (!resetPetBody(old)) { bodies.delete(old.source); destroyPetBody(old); }
    }
    for (const child of [...owner.children]) {
      owner.removeChild(child);
      if (old && old.nodes.includes(child) && !child._dead) child.target.setVisible(false);
      else child.destroy();
    }
    owner._text = ''; owner._nativePetCurrent = null;
    if (!source) return true;
    let entry = bodies.get(source), fresh = false;
    if (entry && entry.rows.some(row => row.node._dead || !row.node.target.active)) { bodies.delete(source); destroyPetBody(entry); entry = null; }
    const context = owner.context, building = context.building;
    if (!entry) {
      const ast = parse(source); collectDefs(ast, context.defs);
      context.building = true;
      let nodes;
      try { nodes = ast.children.map(child => build(owner.scene, child, context, 0)); }
      finally { context.building = building; }
      entry = { source, ast, nodes, rows: petBodySnapshot(nodes), dirty: [] }; fresh = true;
    } else collectDefs(entry.ast, context.defs);
    const parentKey = parentStyleKey(owner, context), restyle = entry.nodes.filter(node => fresh || node._appliedParentStyleKey !== parentKey);
    // No extra wrapper: face.firstChild remains the actual authored P.root.
    context.building = true;
    try { for (const node of entry.nodes) owner.appendChild(node); owner._text = entry.ast.text; }
    finally { context.building = building; }
    if (!building) {
      for (const node of restyle) node.restyle(true);
      for (const node of entry.dirty) { let covered = false; for (let parent = node; parent; parent = parent.parentNode) if (restyle.includes(parent)) { covered = true; break; } if (!covered) node.restyle(true); }
      if (fresh || restyle.length || entry.dirty.length) owner.restyle(false);
      if (fresh) for (const node of entry.nodes) stateFor(owner.scene).actorCaches.add(node);
    }
    for (const node of entry.nodes) node._visibility();
    const reuse = owner._nativePetReuse || (owner._nativePetReuse = { hits: 0, misses: 0, cleanReuses: 0, contextRestyles: 0, dirtyRestyles: 0 });
    reuse[fresh ? 'misses' : 'hits']++;
    if (!fresh) { if (!restyle.length && !entry.dirty.length) reuse.cleanReuses++; reuse.contextRestyles += restyle.length; reuse.dirtyRestyles += entry.dirty.length; }
    reuse.last = { fresh, context: fresh ? 0 : restyle.length, dirty: entry.dirty.length };
    entry.dirty = []; owner._nativePetCurrent = entry;
    bodies.delete(source); bodies.set(source, entry);
    while (bodies.size > 8) { const key = bodies.keys().next().value, expired = bodies.get(key); if (expired === entry) break; bodies.delete(key); destroyPetBody(expired); }
    return true;
  }
  function installNativeTriangleBatch(renderer) {
    if (triangleBatchStates.has(renderer)) return;
    const engine = window.Phaser, webgl = engine && engine.Renderer && engine.Renderer.WebGL, nodes = webgl && webgl.RenderNodes, wrappers = webgl && webgl.Wrappers;
    const manager = renderer && renderer.renderNodes, existing = manager && manager._nodes, constructors = manager && manager._nodeConstructors;
    const batch = existing && existing.BatchHandlerTriFlat, fill = existing && existing.FillTri;
    if (!engine || engine.VERSION !== '4.2.1' || !nodes || !nodes.BatchHandlerTriFlat || !nodes.FillTri || !nodes.RenderNode || !wrappers || !wrappers.WebGLVertexBufferLayoutWrapper || !wrappers.WebGLBufferWrapper || !webgl.ProgramManager || !webgl.DrawingContext || !webgl.WebGLRenderer || Object.getPrototypeOf(renderer) !== webgl.WebGLRenderer.prototype || !manager || manager.renderer !== renderer || manager.debug || !constructors || constructors.BatchHandlerTriFlat !== nodes.BatchHandlerTriFlat || constructors.FillTri !== nodes.FillTri || !batch || !fill) return;
    const batchPrototype = nodes.BatchHandlerTriFlat.prototype, fillPrototype = nodes.FillTri.prototype, contextPrototype = webgl.DrawingContext.prototype, base = nodes.RenderNode.prototype;
    const original = batchPrototype.batch, run = batchPrototype.run, updateOptions = batchPrototype.updateRenderOptions, updateShader = batchPrototype.updateShaderConfig, uniforms = batchPrototype.setupUniforms, fillRun = fillPrototype.run, begin = base.onRunBegin, end = base.onRunEnd;
    const indices = fill._indexedTriangles, layout = batch.vertexBufferLayout, descriptor = layout && layout.layout, attributes = descriptor && descriptor.layout;
    const buffer = layout && layout.buffer, indexBuffer = batch.indexBuffer, floats = buffer && buffer.viewF32, packed = buffer && buffer.viewU32, outputIndices = indexBuffer && indexBuffer.viewU16;
    const capacity = batch.instancesPerBatch, options = batch.renderOptions, nextOptions = batch.nextRenderOptions, programs = batch.programManager;
    if (Object.getPrototypeOf(batch) !== batchPrototype || Object.getPrototypeOf(fill) !== fillPrototype || batch.manager !== manager || fill.manager !== manager || batch.batch !== original || typeof original !== 'function' || typeof run !== 'function' || typeof updateOptions !== 'function' || typeof updateShader !== 'function' || typeof uniforms !== 'function' || typeof fillRun !== 'function' || typeof begin !== 'function' || typeof end !== 'function' || batch.run !== run || batch.updateRenderOptions !== updateOptions || batch.updateShaderConfig !== updateShader || batch.setupUniforms !== uniforms || fill.run !== fillRun || batch.onRunBegin !== begin || batch.onRunEnd !== end || fill.onRunBegin !== begin || fill.onRunEnd !== end || !Array.isArray(indices) || indices.length !== 3 || indices[0] !== 0 || indices[1] !== 1 || indices[2] !== 2) return;
    if (!layout || Object.getPrototypeOf(layout) !== wrappers.WebGLVertexBufferLayoutWrapper.prototype || layout.renderer !== renderer || !descriptor || descriptor.stride !== 12 || !Array.isArray(attributes) || attributes.length !== 2 || !buffer || Object.getPrototypeOf(buffer) !== wrappers.WebGLBufferWrapper.prototype || buffer.renderer !== renderer || !indexBuffer || Object.getPrototypeOf(indexBuffer) !== wrappers.WebGLBufferWrapper.prototype || indexBuffer.renderer !== renderer || !programs || Object.getPrototypeOf(programs) !== webgl.ProgramManager.prototype || !options || !nextOptions) return;
    const position = attributes[0], tint = attributes[1];
    if (!position || position.name !== 'inPosition' || position.size !== 2 || position.type !== 5126 || position.normalized !== false || position.offset !== 0 || position.bytes !== 4 || !tint || tint.name !== 'inTint' || tint.size !== 4 || tint.type !== 5121 || tint.normalized !== true || tint.offset !== 8 || tint.bytes !== 1 || batch.verticesPerInstance !== 3 || batch.indicesPerInstance !== 3 || batch.topology !== 4 || !Number.isInteger(capacity) || capacity < 1 || capacity > 21845 || descriptor.count !== capacity * 3 || !(floats instanceof Float32Array) || !(packed instanceof Uint32Array) || !(outputIndices instanceof Uint16Array) || floats.buffer !== packed.buffer || floats.byteOffset !== packed.byteOffset || floats.byteLength !== packed.byteLength || floats.buffer !== buffer.dataBuffer || outputIndices.buffer !== indexBuffer.dataBuffer || floats.length !== capacity * 9 || outputIndices.length !== capacity * 3) return;
    const activity = { directTriangles: 0 };
    function batchIndependentTriangle(context, inputIndices, positions, colors, lighting) {
      // Pure option comparison first. Empty batches and changed options stay
      // wholly native: their prelude can flush another node or run callbacks.
      const count = this.instanceCount;
      if (this !== batch || inputIndices !== indices || count === 0 || !context) return original.apply(this, arguments);
      const alphaStrategy = context.alphaStrategy;
      if (lighting !== options.lighting || alphaStrategy !== options.alphaStrategy) return original.apply(this, arguments);
      if (window.Phaser !== engine || engine.VERSION !== '4.2.1' || renderer.renderNodes !== manager || manager._nodes !== existing || existing.BatchHandlerTriFlat !== batch || existing.FillTri !== fill || manager.renderer !== renderer || manager.debug || manager.currentBatchNode !== batch || manager.currentBatchDrawingContext !== context || context.renderer !== renderer || Object.getPrototypeOf(context) !== contextPrototype || Object.getPrototypeOf(batch) !== batchPrototype || Object.getPrototypeOf(fill) !== fillPrototype) return original.apply(this, arguments);
      if (batch.batch !== batchIndependentTriangle || batch.manager !== manager || fill.manager !== manager || fill._indexedTriangles !== indices || indices.length !== 3 || indices[0] !== 0 || indices[1] !== 1 || indices[2] !== 2 || fill.run !== fillRun || fill.onRunBegin !== begin || fill.onRunEnd !== end || batch.run !== run || batch.updateRenderOptions !== updateOptions || batch.updateShaderConfig !== updateShader || batch.setupUniforms !== uniforms || batch.onRunBegin !== begin || batch.onRunEnd !== end || batch.renderOptions !== options || batch.nextRenderOptions !== nextOptions || batch.programManager !== programs) return original.apply(this, arguments);
      if (batch.vertexBufferLayout !== layout || layout.layout !== descriptor || descriptor.layout !== attributes || attributes.length !== 2 || attributes[0] !== position || attributes[1] !== tint || descriptor.stride !== 12 || position.size !== 2 || position.type !== 5126 || position.normalized !== false || position.offset !== 0 || tint.size !== 4 || tint.type !== 5121 || tint.normalized !== true || tint.offset !== 8 || layout.buffer !== buffer || batch.indexBuffer !== indexBuffer || buffer.viewF32 !== floats || buffer.viewU32 !== packed || indexBuffer.viewU16 !== outputIndices || buffer.dataBuffer !== floats.buffer || indexBuffer.dataBuffer !== outputIndices.buffer || batch.verticesPerInstance !== 3 || batch.indicesPerInstance !== 3 || batch.topology !== 4 || batch.instancesPerBatch !== capacity || !Number.isInteger(count) || count < 1 || count >= capacity || batch.vertexCount !== count * 3 || !Array.isArray(positions) || positions.length !== 6 || !Array.isArray(colors) || colors.length !== 3) return original.apply(this, arguments);
      // The nonempty native prelude has no callback with these equal options.
      // Call it once at its original time, then unroll only fixed [0,1,2].
      batch.updateRenderOptions(lighting, alphaStrategy);
      let index = count * 3, output = batch.vertexCount * 3, vertex;
      floats[output++] = positions[0]; floats[output++] = positions[1]; packed[output++] = colors[0];
      vertex = batch.vertexCount; batch.vertexCount++; outputIndices[index++] = vertex;
      floats[output++] = positions[2]; floats[output++] = positions[3]; packed[output++] = colors[1];
      vertex = batch.vertexCount; batch.vertexCount++; outputIndices[index++] = vertex;
      floats[output++] = positions[4]; floats[output++] = positions[5]; packed[output++] = colors[2];
      vertex = batch.vertexCount; batch.vertexCount++; outputIndices[index++] = vertex;
      batch.instanceCount++; activity.directTriangles++;
      if (batch.instanceCount === capacity || index + 3 >= outputIndices.length) batch.run(context);
    }
    // Specialize this existing default instance, retaining all native buffers.
    batch.batch = batchIndependentTriangle; triangleBatchStates.set(renderer, activity);
  }
  let neutralInnerComponents = null;
  function installNeutralInnerRenderer(inner) {
    const engine = window.Phaser, steps = inner._renderSteps, components = engine && engine.GameObjects && engine.GameObjects.Components, container = engine && engine.GameObjects && engine.GameObjects.Container;
    // The pinned GameObject constructor owns one final Container render step.
    // Unknown engines/components/layouts retain that original reference.
    if (!engine || engine.VERSION !== '4.2.1' || !components || !components.Alpha || !components.AlphaSingle || !components.ScrollFactor || !container || typeof container.prototype.setScrollFactor !== 'function' || !Array.isArray(steps) || steps.length !== 1 || steps[0] !== inner.renderWebGL) return;
    if (!neutralInnerComponents) neutralInnerComponents = { alpha: components.Alpha.setAlpha, alphaSingle: components.AlphaSingle.setAlpha, scroll: components.ScrollFactor.setScrollFactor, containerScroll: container.prototype.setScrollFactor };
    const state = stateFor(inner.scene), counts = state.innerRender || (state.innerRender = { installed: 0, invocations: 0, neutralInvocations: 0, nativeChildren: 0, ordinaryChildren: 0, noParentFallback: 0, stepFallback: 0, contextFallback: 0, contextShapeFallback: 0, contextBlendFallback: 0, innerBlendFallback: 0, transformFallback: 0, opacityFallback: 0, scrollFallback: 0, maskFallback: 0 });
    counts.installed++; inner._nativeInnerRenderCounts = counts; inner._nativeInnerRenderer = steps[0]; steps[0] = renderNeutralInner;
  }
  function renderNeutralInner(renderer, container, context, parent, step, displayList, index) {
    const original = container._nativeInnerRenderer, counts = container._nativeInnerRenderCounts, steps = container._renderSteps; counts.invocations++;
    // useCanvas selects the main WebGL framebuffer, not the Canvas renderer.
    // Both main-canvas and texture DrawingContexts run this WebGL final step.
    const fallback = !parent ? 'noParentFallback' : !steps || steps.length !== 1 || steps[0] !== renderNeutralInner ? 'stepFallback' : !context || typeof context.useCanvas !== 'boolean' ? 'contextShapeFallback' : context.blendMode !== 0 ? 'contextBlendFallback' : container.blendMode !== -1 && container.blendMode !== 0 ? 'innerBlendFallback' : container.x !== 0 || container.y !== 0 || container.rotation !== 0 || container.scaleX !== 1 || container.scaleY !== 1 ? 'transformFallback' : container.alpha !== 1 ? 'opacityFallback' : container.scrollFactorX !== 1 || container.scrollFactorY !== 1 ? 'scrollFallback' : container.mask ? 'maskFallback' : null;
    if (fallback) { counts[fallback]++; if (fallback === 'contextShapeFallback' || fallback === 'contextBlendFallback' || fallback === 'innerBlendFallback') counts.contextFallback++; return original(renderer, container, context, parent, step, displayList, index); }
    counts.neutralInvocations++;
    const fixedBlend = container.blendMode !== -1;
    const camera = context.camera, children = container.list, count = children.length; camera.addToRenderList(container);
    if (!count) return;
    // The same matrix operations and main/texture render-list decisions apply.
    const transform = container.localTransform; transform.loadIdentity(); transform.multiply(parent); transform.translate(container.x, container.y); transform.rotate(container.rotation); transform.scale(container.scaleX, container.scaleY);
    let current = context;
    for (let i = 0; i < count; i++) {
      const child = children[i]; if (!child.willRender(camera)) continue;
      const owner = child._nativeNode, childSteps = child._renderSteps, ownedNative = owner && owner.target === child, nativeChild = ownedNative && childSteps && childSteps.length === 1 && childSteps[0] === child.renderWebGL, alpha = child.setAlpha, scroll = child.setScrollFactor;
      // Container's setter is distinct from Components.ScrollFactor. Its third
      // cascade argument defaults false; original renderer calls use two args.
      const neutralAlpha = nativeChild && (alpha === neutralInnerComponents.alpha || alpha === neutralInnerComponents.alphaSingle), neutralScroll = nativeChild && (scroll === neutralInnerComponents.containerScroll || scroll === neutralInnerComponents.scroll);
      let topLeft, topRight, bottomLeft, bottomRight, scrollX, scrollY;
      if (!neutralAlpha) { if (child.alphaTopLeft !== undefined) { topLeft = child.alphaTopLeft; topRight = child.alphaTopRight; bottomLeft = child.alphaBottomLeft; bottomRight = child.alphaBottomRight; } else { topLeft = topRight = bottomLeft = bottomRight = child.alpha; } }
      if (!neutralScroll) { scrollX = child.scrollFactorX; scrollY = child.scrollFactorY; }
      // Pinned fixed containers keep their incoming context; only inherited
      // containers change it for a child's blend mode. Nonzero incoming
      // contexts fall back above, preserving the original reset/clone branch.
      if (!fixedBlend && child.blendMode !== current.blendMode && child.blendMode !== -1) { current = context.getClone(); current.setBlendMode(child.blendMode); current.use(); }
      if (!neutralScroll && child.setScrollFactor) child.setScrollFactor(scrollX * container.scrollFactorX, scrollY * container.scrollFactorY);
      if (!neutralAlpha && child.setAlpha) child.setAlpha(topLeft * container.alpha, topRight * container.alpha, bottomLeft * container.alpha, bottomRight * container.alpha);
      if (neutralAlpha && neutralScroll) counts.nativeChildren++; else counts.ordinaryChildren++;
      child.renderWebGLStep(renderer, child, current, transform, undefined, children, i);
      if (!neutralAlpha && child.setAlpha) child.setAlpha(topLeft, topRight, bottomLeft, bottomRight);
      if (!neutralScroll && child.setScrollFactor) child.setScrollFactor(scrollX, scrollY);
    }
    if (current !== context) current.release();
  }
  class NativeNode {
    constructor(scene, tag, attrs, context) {
      this.scene = scene; this._native = true; this.localName = String(tag || 'g').toLowerCase(); this.tagName = this.localName; this.nodeType = 1; this.namespaceURI = 'http://www.w3.org/2000/svg'; this.attrs = { ...(attrs || {}) }; this.children = []; this.parentNode = null; this.context = context || { defs: new Map(), options: {} }; this._styleValues = declarations(this.attrs.style); this._styles = {}; this._dead = false; this._text = ''; this._matrix = ID; this._animations = [];
      this.target = scene.add.container(0, 0); this._inner = scene.add.container(0, 0); this.target.add(this._inner); this.target._nativeNode = this; installNeutralInnerRenderer(this._inner);
      this.style = styleObject(this); const self = this;
      this.classList = { contains(name) { return String(self.attrs.class || '').split(/\s+/).includes(name); }, add(...names) { const set = new Set(String(self.attrs.class || '').split(/\s+/).filter(Boolean)); for (const n of names) set.add(n); self.setAttribute('class', [...set].join(' ')); }, remove(...names) { self.setAttribute('class', String(self.attrs.class || '').split(/\s+/).filter(n => n && !names.includes(n)).join(' ')); }, toggle(name, force) { const on = force == null ? !this.contains(name) : !!force; if (on) this.add(name); else this.remove(name); return on; }, [Symbol.iterator]() { return String(self.attrs.class || '').split(/\s+/).filter(Boolean)[Symbol.iterator](); } };
      this.dataset = new Proxy({}, { get(_, key) { return self.getAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())) || undefined; }, set(_, key, value) { self.setAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value); return true; } });
      stateFor(scene).created++; if (!this.context.building) this.restyle(false);
    }
    get parentElement() { return this.parentNode; }
    get ownerSVGElement() { let n = this.parentNode; while (n) { if (n.localName === 'svg') return n; n = n.parentNode; } return null; }
    get isConnected() { if (this._dead || !this.target.active) return false; for (let target = this.target; target; target = target.parentContainer) if (target.displayList) return true; return false; }
    get childNodes() { return this.children; }
    get childElementCount() { return this.children.length; }
    get firstChild() { return this.children[0] || null; }
    get lastChild() { return this.children[this.children.length - 1] || null; }
    get firstElementChild() { return this.firstChild; }
    get lastElementChild() { return this.lastChild; }
    get nextSibling() { if (!this.parentNode) return null; return this.parentNode.children[this.parentNode.children.indexOf(this) + 1] || null; }
    get nextElementSibling() { return this.nextSibling; }
    get previousElementSibling() { if (!this.parentNode) return null; return this.parentNode.children[this.parentNode.children.indexOf(this) - 1] || null; }
    get className() { const node = this; return { get baseVal() { return node.attrs.class || ''; }, set baseVal(value) { node.setAttribute('class', value); }, get animVal() { return node.attrs.class || ''; } }; }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? String(this.attrs[name]) : null; }
    getAttributeNames() { return Object.keys(this.attrs); }
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
    setAttribute(name, value) {
      value = String(value); if (this.attrs[name] === value) return; const old = this.attrs[name];
      if (name === 'class' && visualClasses(old) === visualClasses(value)) { this.attrs[name] = value; return; }
      if (!name.startsWith('data-') && !name.startsWith('aria-') && name !== 'class' && name !== 'style') this._uncache(['transform', 'opacity', 'display', 'visibility'].includes(name), true);
      this.attrs[name] = value;
      if (name === 'style') { this._styleValues = declarations(value); this.style = styleObject(this); this.restyle(true); }
      else if (name === 'transform') this._applyTransform();
      else if (name === 'opacity') { this._styles.opacity = value; this._computedAlpha = alpha(value, this._styles); this.target.setAlpha(this._computedAlpha); }
      else if (name === 'visibility') this.restyle(true);
      else if (name === 'display') { this._styles[name] = value; this._visibility(); }
      else if (name === 'class' || name === 'clip-path' || selectorAttrs.has(name) || ['data-mode', 'data-tool', 'data-placing'].includes(name)) { this.restyle(true); queueActorCache(this); }
      else if (!name.startsWith('data-') && !name.startsWith('aria-')) this.restyle(this.children.length > 0);
    }
    setAttributeNS(ns, name, value) { this.setAttribute(name, value); }
    removeAttribute(name) { if (!this.hasAttribute(name)) return; if (name !== 'class' && name !== 'style') this._uncache(['transform', 'opacity', 'display', 'visibility'].includes(name), true); delete this.attrs[name]; if (name === 'style') { this._styleValues = {}; this.style = styleObject(this); } this.restyle(name === 'class' || name === 'style' || name === 'clip-path' || this.children.length > 0); }
    _styleChanged(name) {
      const transform = ['transform', 'transform-origin', 'translate', 'rotate', 'scale'].includes(name);
      if (this._styleValues[name] == null || this._styleValues[name] === '') {
        delete this._styleValues[name];
        if (transform || name === 'opacity') {
          // Finishing a brief rustle or gesture restores a container property.
          // These properties do not inherit; its botanical/actor descendants
          // keep their compiled geometry, styles and animation phase.
          this._uncache(true, true); this._styles = stylesFor(this);
          if (transform) this._applyTransform();
          else { this._computedAlpha = alpha(this._styles.opacity, this._styles); this.target.setAlpha(this._computedAlpha); }
          this._compileAnimations();
        } else this.restyle(true);
        return;
      }
      if (transform || ['opacity', 'display', 'visibility'].includes(name)) this._uncache(true, true);
      if (transform) { this._styles[name] = this._styleValues[name]; this._applyTransform(); }
      else if (name === 'opacity') { this._styles.opacity = this._styleValues.opacity; this._computedAlpha = alpha(this._styleValues.opacity, this._styles); this.target.setAlpha(this._computedAlpha); }
      else if (name === 'visibility') this.restyle(true);
      else if (name === 'display') { this._styles[name] = this._styleValues[name]; this._visibility(); }
      else this.restyle(true);
    }
    appendChild(child) { if (!child) return child; if (child.nodeType === 11) { for (const n of [...child.children]) this.appendChild(n); return child; } const previousStyle = child._appliedParentStyleKey; if (child.parentNode) child.parentNode.removeChild(child); this._uncache(false, true); child.parentNode = this; this.children.push(child); this._inner.add(child.target); child.context = this.context; if (!this.context.building && previousStyle !== parentStyleKey(this, child.context)) child.restyle(true); this._bounds = null; return child; }
    append(...children) { for (const child of children) this.appendChild(child); }
    insertBefore(child, before) { this.appendChild(child); if (before && before.parentNode === this) { const index = this.children.indexOf(before); this.children.splice(this.children.indexOf(child), 1); this.children.splice(index, 0, child); this._inner.moveTo(child.target, Math.max(0, index)); } return child; }
    removeChild(child) { const index = this.children.indexOf(child); if (index < 0) return child; this._uncache(false, true); this.children.splice(index, 1); this._inner.remove(child.target); child.parentNode = null; this._bounds = null; return child; }
    replaceChild(child, old) { this.insertBefore(child, old); this.removeChild(old); return old; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); this.destroy(); }
    contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
    matches(selector) { return matches(this, selector); }
    closest(selector) { const compiled = compileSelector(selector); for (let n = this; n; n = n.parentNode) if (matchesCompiled(n, compiled)) return n; return null; }
    querySelectorAll(selector) { const compiled = compileSelector(selector), out = []; const walk = n => { for (const child of n.children) { if (matchesCompiled(child, compiled, this)) out.push(child); walk(child); } }; walk(this); return out; }
    querySelector(selector) { const compiled = compileSelector(selector); const find = n => { for (const child of n.children) { if (matchesCompiled(child, compiled, this)) return child; const found = find(child); if (found) return found; } return null; }; return find(this); }
    cloneNode(deep) { const copy = new NativeNode(this.scene, this.localName, this.attrs, this.context); copy._text = this._text; if (deep) for (const child of this.children) copy.appendChild(child.cloneNode(true)); copy.restyle(true); return copy; }
    get innerHTML() { const body = this._nativePlayerCurrent && this._nativePlayerCurrent.node; return this.children.map(n => n === body ? n.innerHTML : n.outerHTML).join('') + this._text; }
    set innerHTML(value) { if (swapPlayerBody(this, value) || swapPetBody(this, value)) return; if (this._nativePlayerBodies) clearPlayerBodies(this); if (this._nativePetBodies) clearPetBodies(this); this._uncache(false, true); for (const child of [...this.children]) { this.removeChild(child); child.destroy(); } this._text = ''; const ast = parse(value); collectDefs(ast, this.context.defs); const building = this.context.building; this.context.building = true; try { for (const child of ast.children) this.appendChild(build(this.scene, child, this.context, 0)); this._text = ast.text; } finally { this.context.building = building; } if (!building) { this.restyle(true); if (this.classList.contains('gd-pl-in') || this.classList.contains('ptw-face') || this.classList.contains('gll-in')) stateFor(this.scene).actorCaches.add(this); queueActorCache(this); } }
    get outerHTML() { const attrs = Object.entries(this.attrs).map(([key, value]) => key + '="' + String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"').join(' '); return '<' + this.localName + (attrs ? ' ' + attrs : '') + '>' + this.innerHTML + '</' + this.localName + '>'; }
    get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
    set textContent(value) { const text = String(value == null ? '' : value); if (text === this._text) return; this._text = text; if (this.localName === 'text' || this.localName === 'tspan') this.restyle(false); }
    _visibility() { this._computedVisible = this.attrs.display !== 'none' && this.attrs.visibility !== 'hidden' && this._styles.display !== 'none' && this._styles.visibility !== 'hidden' && !DEFINITIONS.has(this.localName); this.target.setVisible(this._computedVisible && !this.target._nativeCacheHiddenBy); }
    _applyTransform(override, properties) {
      nativeMatrix(this, presentationMatrix(this, override, properties));
      if (!override) this._transformKey = transformKey(this);
    }
    restyle(deep) {
      if (this._dead || this.context.building) return;
      const nodes = [], walk = node => { nodes.push(node); if (deep) for (const child of node.children) walk(child); }; walk(this);
      // Resolve inheritance first, then geometry and bottom-up pivots. A whole
      // asset is compiled once rather than once per ancestor during assembly.
      for (const node of nodes) {
        if (node.localName === 'text' || node.localName === 'tspan') {
          const peerName = node.classList.contains('gll-name');
          if (node._peerNameLabel !== peerName && node._label) { node._uncache(true, true); if (!peerName) node._label.setScale(1); }
          node._peerNameLabel = peerName;
        }
        node._styles = stylesFor(node); node._motionBlocked = node.context.options.motion === false || !!(node.parentNode && node.parentNode._motionBlocked) || node.classList.contains('is-still') || node.classList.contains('is-funoff');
        node._clipKey = (node.parentNode ? node.parentNode._clipKey || '' : '') + '|' + (node._styles['clip-path'] || node.attrs['clip-path'] || '') + (node.localName === 'svg' ? '|viewport:' + [node.attrs.x, node.attrs.y, node.attrs.width, node.attrs.height, node.attrs.viewBox, node._styles.overflow || node.attrs.overflow].join(',') : '');
        const nextPaint = paintKey(node, node._clipKey), nextTransform = transformKey(node), nextAlpha = alpha(node._styles.opacity, node._styles), nextVisible = node.attrs.display !== 'none' && node.attrs.visibility !== 'hidden' && node._styles.display !== 'none' && node._styles.visibility !== 'hidden' && !DEFINITIONS.has(node.localName);
        node._paintChanged = node._paintKey !== nextPaint; node._transformChanged = node._transformKey !== nextTransform; node._alphaChanged = node._computedAlpha !== nextAlpha;
        if (node._paintChanged) { node._uncache(false, true); node._bounds = null; if (SHAPES.has(node.localName)) node._geometry = geometry(node.localName, node.attrs); }
        else if (node._transformChanged || node._alphaChanged || node._computedVisible !== nextVisible) node._uncache(true, true);
        node._paintKey = nextPaint;
        if (node._paintChanged && (node.localName === 'text' || node.localName === 'tspan')) node._draw();
      }
      for (let i = nodes.length - 1; i >= 0; i--) { const node = nodes[i]; if (node._transformChanged || node._paintChanged) node._applyTransform(); node._visibility(); if (node._alphaChanged) { node._computedAlpha = alpha(node._styles.opacity, node._styles); node.target.setAlpha(node._computedAlpha); } }
      for (const node of nodes) if (node._paintChanged && (SHAPES.has(node.localName) || node.localName === 'image')) node._draw();
      for (const node of nodes) node._compileAnimations();
    }
    _draw() {
      if (this._dead) return;
      if (SHAPES.has(this.localName)) {
        if (!this._graphics) { this._graphics = this.scene.add.graphics(); this._graphics._nativeFillNode = this; this._inner.addAt(this._graphics, 0); stateFor(this.scene).shapes++; }
        this._graphics.clear().setAlpha(alpha(this._styles['fill-opacity'], this._styles)); const contours = geometry(this.localName, this.attrs); this._geometry = contours; const style = this._styles, clips = clippingFor(this);
        drawShape(this._graphics, contours, { ...style, 'fill-opacity': 1 }, this.context.defs, clips, this, true, false);
        if (color(style.stroke, style)) { if (!this._strokeGraphics) { this._strokeGraphics = this.scene.add.graphics(); this._inner.addAt(this._strokeGraphics, 1); } this._strokeGraphics.clear(); drawShape(this._strokeGraphics, contours, style, this.context.defs, clips, this, false, true); }
        else if (this._strokeGraphics) { this._strokeGraphics.destroy(); this._strokeGraphics = null; }
      }
      else if (this.localName === 'image') {
        // A texture already in the scene (a baked painting), named by href.
        const key = String(this.attrs.href || this.attrs['xlink:href'] || ''), textures = this.scene.textures;
        if (this._image && (this._image.texture.key !== key || !this._image.active)) { this._image.destroy(); this._image = null; }
        if (!this._image && key && textures.exists(key)) { this._image = this.scene.add.image(0, 0, key).setOrigin(0, 0); this._inner.addAt(this._image, 0); }
        if (this._image) this._image.setPosition(num(this.attrs.x), num(this.attrs.y)).setDisplaySize(Math.max(.01, num(this.attrs.width, this._image.width)), Math.max(.01, num(this.attrs.height, this._image.height)));
      }
      else if (this.localName === 'text' || this.localName === 'tspan') {
        if (this.parentNode && this.parentNode.localName === 'text' && this.localName === 'tspan') return;
        const style = this._styles, fill = color(style.fill, style, 0x000000), fontSize = num(resolve(style['font-size'] || '12', style), 12), text = this.textContent.trim();
        if (!this._label) { this._textResolution = Math.max(2, Math.min(12, Math.ceil(effectivePixels(this)))); this._label = this.scene.add.text(0, 0, '', { resolution: this._textResolution }); this._label._nativeFillNode = this; this._inner.addAt(this._label, 0); stateFor(this.scene).labels.add(this); }
        this._label._nativeColorAlpha = fill ? fill.alpha : 0;
        this._label.setText(text).setStyle({ resolution: this._textResolution, fontFamily: style['font-family'] || 'Inter, Arial, sans-serif', fontSize: fontSize + 'px', color: '#' + ((fill && fill.color) || 0).toString(16).padStart(6, '0'), fontStyle: [style['font-style'], style['font-weight'] === 'bold' || num(style['font-weight']) >= 600 ? 'bold' : ''].filter(Boolean).join(' '), padding: { left: 1, right: 1, top: 1, bottom: 1 } }).setAlpha((fill ? fill.alpha : 0) * alpha(style['fill-opacity'], style));
        const anchor = style['text-anchor']; this._label.setOrigin(anchor === 'middle' ? .5 : anchor === 'end' ? 1 : 0, /middle|central/.test(style['dominant-baseline'] || '') ? .5 : .82).setPosition(num(this.attrs.x), num(this.attrs.y));
      }
    }
    getBBox() {
      if (this.nativeBounds) return { ...this.nativeBounds };
      if (this._bounds) return { ...this._bounds };
      const points = []; if (this._geometry) for (const contour of this._geometry) points.push(...contour.points);
      if (this.localName === 'image') { const x = num(this.attrs.x), y = num(this.attrs.y); points.push({ x, y }, { x: x + num(this.attrs.width), y: y + num(this.attrs.height) }); }
      if (this._label) { const x = this._label.x - this._label.width * this._label.originX, y = this._label.y - this._label.height * this._label.originY; points.push({ x, y }, { x: x + this._label.width, y: y + this._label.height }); }
      for (const child of this.children) { if (DEFINITIONS.has(child.localName)) continue; const b = child.getBBox(), m = child._matrix || ID; for (const p of [point(m, b.x, b.y), point(m, b.x + b.width, b.y), point(m, b.x, b.y + b.height), point(m, b.x + b.width, b.y + b.height)]) points.push(p); }
      return this._bounds = boxOf(points, num(this._styles['stroke-width']) / 2);
    }
    hit(x, y) {
      if (this._dead || DEFINITIONS.has(this.localName) || this.attrs.display === 'none' || this._styles.display === 'none' || this._styles.visibility === 'hidden' || this._styles['pointer-events'] === 'none') return null;
      const b = this.getBBox(); if (x < b.x - 2 || x > b.x + b.width + 2 || y < b.y - 2 || y > b.y + b.height + 2) return null;
      for (let i = this.children.length - 1; i >= 0; i--) { const child = this.children[i], p = point(inv(child._matrix || ID), x, y), found = child.hit(p.x, p.y); if (found) return found; }
      if (this.nativeBounds || this._label) return this;
      if (this._geometry) {
        const clips = clippingFor(this); if (clips.some(union => !union.some(polygon => insidePolygon(x, y, polygon)))) return null;
        const fill = this._styles.fill !== 'none', stroke = this._styles.stroke && this._styles.stroke !== 'none', radius = num(this._styles['stroke-width'], 1) / 2 + 2;
        for (const contour of this._geometry) {
          if (fill && contour.points.length > 2 && insideCompound(x, y, this._geometry, this._styles['fill-rule'])) return this;
          if (stroke) for (let i = 1; i < contour.points.length + (contour.closed ? 1 : 0); i++) { const a = contour.points[(i - 1) % contour.points.length], c = contour.points[i % contour.points.length], dx = c.x - a.x, dy = c.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / Math.max(.00001, dx * dx + dy * dy))); if (Math.hypot(x - a.x - dx * t, y - a.y - dy * t) <= radius) return this; }
        }
      }
      return null;
    }
    // A pet owns the input for its otherwise pointer-events:none art subtree.
    // Layout/nativeBounds boxes are broad phase only; cached originals still
    // describe the paint represented by their visible cache tiles.
    paintedHit(x, y) {
      if (this._dead || DEFINITIONS.has(this.localName) || this.attrs.display === 'none' || this.attrs.visibility === 'hidden' || this._styles.display === 'none' || this._styles.visibility === 'hidden' || !paintedVisible(this.target) || !paintedVisible(this._inner)) return null;
      for (let i = this.children.length - 1; i >= 0; i--) {
        const child = this.children[i], m = child._matrix || ID;
        if (Math.abs(m.a * m.d - m.b * m.c) < 1e-10) continue;
        const p = point(inv(m), x, y), found = child.paintedHit(p.x, p.y); if (found) return found;
      }
      if (!this._geometry && !this._label) return null;
      if (this._geometry && !this.children.length && !this._label && !this.nativeBounds) {
        // Leaf getBBox contains geometry plus nonnegative raw stroke padding
        // for this resolved-width grammar. Add the full resolved radius: a
        // literal/var spelling change can retain a differently padded cache.
        const width = resolve(this._styles['stroke-width'], this._styles);
        if (!width || /^\s*\+?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?(?:px)?\s*$/i.test(width)) {
          const b = this._bounds || this.getBBox(), padding = num(width, 1) / 2 + 2;
          if (Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.width) && Number.isFinite(b.height) && (x < b.x - padding || x > b.x + b.width + padding || y < b.y - padding || y > b.y + b.height + padding)) return null;
        }
      }
      const clips = clippingFor(this); if (clips.some(union => !union.some(polygon => insidePolygon(x, y, polygon)))) return null;
      if (this._label && paintedVisible(this._label) && this._label.text.trim()) {
        const label = this._label, m = label.getLocalTransformMatrix();
        if (Math.abs(m.a * m.d - m.b * m.c) >= 1e-10) {
          const p = point(inv({ a: m.a, b: m.b, c: m.c, d: m.d, e: m.tx, f: m.ty }), x, y);
          if (p.x >= -label.width * label.originX && p.x <= label.width * (1 - label.originX) && p.y >= -label.height * label.originY && p.y <= label.height * (1 - label.originY)) return this;
        }
      }
      if (this._geometry) {
        const style = this._styles, fillValue = resolve(style.fill == null ? '#000000' : style.fill, style), ref = /url\(['"]?#([^)'"\s]+)/.exec(fillValue), definition = ref && this.context.defs.get(ref[1]), fill = ref ? null : color(fillValue, style), stroke = color(style.stroke, style);
        if (paintedVisible(this._graphics) && insideCompound(x, y, this._geometry, style['fill-rule'])) {
          if (fill && fill.alpha > 0) return this;
          if (definition && /gradient$/.test(definition.tag)) {
            const sampler = gradientSampler(gradientDefinition(definition, this.context.defs), style, boxOf(this._geometry.flatMap(contour => contour.points)), viewportBox(this));
            if (sampler.sample(point(sampler.inverse, x, y)).alpha > 0) return this;
          }
        }
        const width = num(resolve(style['stroke-width'], style), 1), radius = width / 2 + 2;
        if (paintedVisible(this._strokeGraphics) && stroke && stroke.alpha > 0 && alpha(style['stroke-opacity'], style) > 0 && width > 0) for (const contour of this._geometry) {
          for (let i = 1; i < contour.points.length + (contour.closed ? 1 : 0); i++) {
            const a = contour.points[(i - 1) % contour.points.length], c = contour.points[i % contour.points.length], dx = c.x - a.x, dy = c.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / Math.max(.00001, dx * dx + dy * dy)));
            if (Math.hypot(x - a.x - dx * t, y - a.y - dy * t) <= radius) return this;
          }
        }
      }
      return null;
    }
    _compileAnimations() {
      const style = this._styles, key = Object.keys(style).filter(name => name.startsWith('animation') && name !== 'animation-play-state' || name.startsWith('--') || ['transform', 'transform-origin', 'transform-box', 'opacity', 'fill-opacity'].includes(name)).sort().map(name => name + ':' + style[name]).join(';');
      clockPause(this, 4, style['animation-play-state'] === 'paused', performance.now());
      if (key !== this._animationKey) {
        const hadAnimation = this._animations.length; resetPaintOpacity(this); this._animationKey = key; this._lastNativeTime = NaN; this._inner.setAlpha(1);
        const state = stateFor(this.scene); state.animations.delete(this); clockPause(this, 2, state.motionOn === false, performance.now()); this._animations = animationsFor(this);
        // These predicates and nonempty tracks change with the compiled styles.
        // Keep the sampler's property/easing order and the existing fill regexes.
        this._animationHasPaintOpacity = false;
        for (const animation of this._animations) {
          animation.fillsBefore = /both|backwards/.test(animation.fill); animation.fillsAfter = /both|forwards/.test(animation.fill); animation.sampleTracks = [];
          for (const property of ['transform', 'opacity', 'paintOpacity', 'translate', 'rotate', 'scale']) {
            const frames = animation.tracks[property]; if (frames.length) animation.sampleTracks.push({ property, frames, geometric: property !== 'opacity' && property !== 'paintOpacity' });
          }
          if (animation.tracks.paintOpacity.length) this._animationHasPaintOpacity = true;
        }
        if (hadAnimation || this._animations.length) this._uncache(!this._animationHasPaintOpacity, true);
        if (this._animations.length) state.animations.add(this);
        else if (hadAnimation && !this._nativeAnimating) { this._applyTransform(); this.target.setAlpha(alpha(style.opacity, style)); this._animatedTransform = this._animatedOpacity = this._animatedPaint = false; }
      }
      if (this._animationHasPaintOpacity) refreshPaintTargets(this);
      if (this.localName === 'circle' || this.localName === 'ellipse') syncRadialLeafCache(this);
    }
    _uncache(skipSelf, remember) { this._bounds = null; const now = remember ? performance.now() : 0; for (let n = skipSelf ? this.parentNode : this; n; n = n.parentNode) { n._bounds = null; const state = stateFor(n.scene), pending = state.recaches.get(n); if (remember && (n._cache || pending)) state.recaches.set(n, { recipe: n._cache ? n._cache.recipe : pending.recipe, due: now + 150 }); releaseCache(n, false); } }
    destroy() { if (this._dead) return; if (this.parentNode) this.parentNode.removeChild(this); this._uncache(); this._dead = true; stateFor(this.scene).animations.delete(this); stateFor(this.scene).roots.delete(this); stateFor(this.scene).actorCaches.delete(this); stateFor(this.scene).cacheTrackedNodes.delete(this); stateFor(this.scene).recaches.delete(this); stateFor(this.scene).labels.delete(this); pausedAmbient.delete(this); if (this._nativePlayerBodies) clearPlayerBodies(this); if (this._nativePetBodies) clearPetBodies(this); for (const child of [...this.children]) child.destroy(); this.children.length = 0; if (this.target && this.target.active) this.target.destroy(true); }
  }
  function viewport(attrs) { const values = nums(attrs.viewBox || attrs.viewbox), x = num(attrs.x), y = num(attrs.y); if (values.length < 4) return { ...ID, e: x, f: y }; const w = num(attrs.width, values[2]), h = num(attrs.height, values[3]), aspect = attrs.preserveAspectRatio || 'xMidYMid meet'; let sx = w / values[2], sy = h / values[3], dx = 0, dy = 0; if (!/^none/.test(aspect)) { sx = sy = /slice/.test(aspect) ? Math.max(sx, sy) : Math.min(sx, sy); dx = (w - values[2] * sx) * (/xMax/.test(aspect) ? 1 : /xMid/.test(aspect) ? .5 : 0); dy = (h - values[3] * sy) * (/YMax/.test(aspect) ? 1 : /YMid/.test(aspect) ? .5 : 0); } return { a: sx, b: 0, c: 0, d: sy, e: x + dx - values[0] * sx, f: y + dy - values[1] * sy }; }
  function collectDefs(ast, defs) { if (ast.attrs.id) defs.set(ast.attrs.id, ast); for (const child of ast.children) collectDefs(child, defs); }
  function build(scene, ast, context, level) {
    const node = new NativeNode(scene, ast.tag, ast.attrs, context); node._text = ast.text;
    if (ast.tag === 'use' && level < 16) { const ref = context.defs.get(String(ast.attrs.href || ast.attrs['xlink:href'] || '').replace(/^#/, '')); if (ref && ref !== ast) node.appendChild(build(scene, ref, context, level + 1)); node._inner.setPosition(num(ast.attrs.x), num(ast.attrs.y)); }
    else for (const child of ast.children) node.appendChild(build(scene, child, context, level + 1));
    if (!context.building) node.restyle(true); return node;
  }
  function gradientDefinition(def, defs, seen) { seen = seen || new Set(); if (!def || seen.has(def)) return def; seen.add(def); const ref = String(def.attrs.href || def.attrs['xlink:href'] || '').replace(/^#/, ''), parent = ref && defs.get(ref); if (!parent) return def; const base = gradientDefinition(parent, defs, seen); return { tag: def.tag, attrs: { ...base.attrs, ...def.attrs }, children: def.children.some(child => child.tag === 'stop') ? def.children : base.children }; }
  function gradientColor(def, style) {
    let previous = 0; const inherited = { ...style, ...def.attrs, ...declarations(def.attrs.style) };
    return def.children.filter(c => c.tag === 'stop').map(c => { const s = { ...inherited, ...c.attrs, ...declarations(c.attrs.style) }, col = color(s['stop-color'] || '#000000', s), offset = Math.max(previous, Math.min(1, Math.max(0, String(s.offset).endsWith('%') ? num(s.offset) / 100 : num(s.offset)))); previous = offset; return { offset, color: col ? col.color : 0, alpha: (col ? col.alpha : 0) * alpha(s['stop-opacity'], s) }; });
  }
  function insidePolygon(x, y, points) { let inside = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
  const triangulations = new WeakMap();
  function signedArea(points) { let area = 0; for (let i = 0, j = points.length - 1; i < points.length; j = i++) area += points[j].x * points[i].y - points[i].x * points[j].y; return area / 2; }
  function insideCompound(x, y, contours, rule) { let winding = 0; for (const contour of contours) { const p = contour.points; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[j], b = p[i], cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y); if (a.y <= y && b.y > y && cross > 0) winding++; else if (a.y > y && b.y <= y && cross < 0) winding--; } } return rule === 'evenodd' ? Math.abs(winding) % 2 === 1 : winding !== 0; }
  function scanlineFill(contours, rule) {
    const edges = [], ys = []; for (const contour of contours) { const p = contour.points; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[j], b = p[i]; ys.push(a.y); if (Math.abs(a.y - b.y) > 1e-8) edges.push({ a, b, winding: b.y > a.y ? 1 : -1 }); } }
    // Crossing contours require strip boundaries at edge intersections too.
    if (edges.length <= 256) for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) { const a = edges[i].a, b = edges[i].b, c = edges[j].a, d = edges[j].b, dx = b.x - a.x, dy = b.y - a.y, ex = d.x - c.x, ey = d.y - c.y, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue; const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / den, u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / den; if (t > 1e-7 && t < 1 - 1e-7 && u > 1e-7 && u < 1 - 1e-7) ys.push(a.y + t * dy); }
    ys.sort((a, b) => a - b); const levels = ys.filter((y, i) => !i || y - ys[i - 1] > 1e-7), triangles = [], at = (edge, y) => edge.a.x + (edge.b.x - edge.a.x) * (y - edge.a.y) / (edge.b.y - edge.a.y);
    for (let i = 1; i < levels.length; i++) { const top = levels[i - 1], bottom = levels[i], mid = (top + bottom) / 2, crossings = edges.filter(edge => mid > Math.min(edge.a.y, edge.b.y) && mid < Math.max(edge.a.y, edge.b.y)).map(edge => ({ edge, x: at(edge, mid) })).sort((a, b) => a.x - b.x); let winding = 0, left = null;
      for (const crossing of crossings) { const before = rule === 'evenodd' ? Math.abs(winding) % 2 : winding !== 0; winding += crossing.edge.winding; const after = rule === 'evenodd' ? Math.abs(winding) % 2 : winding !== 0; if (!before && after) left = crossing.edge; else if (before && !after && left) { const a = { x: at(left, top), y: top }, b = { x: at(crossing.edge, top), y: top }, c = { x: at(crossing.edge, bottom), y: bottom }, d = { x: at(left, bottom), y: bottom }; if (Math.abs(signedArea([a, b, c])) > 1e-9) triangles.push([a, b, c]); if (Math.abs(signedArea([a, c, d])) > 1e-9) triangles.push([a, c, d]); left = null; } }
    }
    return triangles;
  }
  function compoundTriangles(contours, rule) {
    rule = rule === 'evenodd' ? 'evenodd' : 'nonzero'; let cached = triangulations.get(contours); if (cached && cached[rule]) return cached[rule]; if (!cached) { cached = {}; triangulations.set(contours, cached); }
    const rings = contours.filter(c => c.points.length > 2).map(c => { const points = c.points.length > 3 && Math.hypot(c.points[0].x - c.points[c.points.length - 1].x, c.points[0].y - c.points[c.points.length - 1].y) < 1e-8 ? c.points.slice(0, -1) : c.points; return { points, area: signedArea(points), box: boxOf(points), parent: null }; }).filter(ring => Math.abs(ring.area) > 1e-9).sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
    let crossing = false;
    for (let i = 0; i < rings.length; i++) { const ring = rings[i]; for (let j = i - 1; j >= 0; j--) { const candidate = rings[j]; if (containsBox(candidate.box, ring.box, 1e-7) && insidePolygon(ring.points[0].x, ring.points[0].y, candidate.points)) { ring.parent = candidate; break; } if (intersectBox(candidate.box, ring.box)) crossing = true; } }
    if ((!rings.length || crossing && rings.length > 1) && contours.reduce((sum, contour) => sum + contour.points.length, 0) <= 256) return cached[rule] = scanlineFill(contours, rule);
    const groups = [], triangles = [];
    for (const ring of rings) { const parent = ring.parent; ring.winding = (parent ? parent.winding : 0) + (ring.area < 0 ? -1 : 1); ring.level = (parent ? parent.level : 0) + 1; const outside = rule === 'evenodd' ? (ring.level - 1) % 2 !== 0 : !!(parent && parent.winding), inside = rule === 'evenodd' ? ring.level % 2 !== 0 : ring.winding !== 0; if (!outside && inside) { ring.group = { outer: ring, holes: [] }; groups.push(ring.group); } else { ring.group = parent && parent.group; if (outside && !inside && ring.group) ring.group.holes.push(ring); } }
    const earcut = typeof Phaser !== 'undefined' && Phaser.Geom && Phaser.Geom.Polygon && Phaser.Geom.Polygon.Earcut;
    for (const group of groups) { const points = [...group.outer.points], holes = []; for (const hole of group.holes) { holes.push(points.length); points.push(...hole.points); } if (earcut) { const indices = earcut(points.flatMap(p => [p.x, p.y]), holes, 2); for (let i = 0; i < indices.length; i += 3) triangles.push([points[indices[i]], points[indices[i + 1]], points[indices[i + 2]]]); } else triangles.push(...scanlineFill([{ points: group.outer.points }, ...group.holes.map(hole => ({ points: hole.points }))], 'evenodd')); }
    return cached[rule] = triangles;
  }
  function paintedVisible(object) {
    if (!object || object.active === false || object.alpha <= 0) return false;
    if (object.visible !== false) return true;
    const owner = object._nativeCacheHiddenBy;
    return !!(owner && owner._cache && owner._cache.visible.get(object));
  }
  function localMatrix(node) { return presentationMatrix(node); }
  function assetMatrix(node) { const chain = []; for (let p = node; p; p = p.parentNode) chain.push(p); let out = ID; for (let i = chain.length - 1; i >= 0; i--) out = mul(out, localMatrix(chain[i])); return out; }
  function definitionShapes(def, parent, inherited) { const out = [], style = { ...(inherited || {}), ...def.attrs, ...declarations(def.attrs.style) }, m = mul(parent || ID, matrix(def.attrs.transform, null, style)); if (SHAPES.has(def.tag)) for (const contour of geometry(def.tag, def.attrs)) out.push({ points: contour.points.map(p => point(m, p.x, p.y)), closed: contour.closed, style }); for (const child of def.children) out.push(...definitionShapes(child, m, style)); return out; }
  function clippingFor(node) {
    const clips = []; let inverse = null;
    for (let owner = node; owner; owner = owner.parentNode) {
      if (owner.localName === 'svg' && owner._styles.overflow !== 'visible' && owner.attrs.overflow !== 'visible') {
        const vb = nums(owner.attrs.viewBox || owner.attrs.viewbox), width = num(owner.attrs.width, vb[2]), height = num(owner.attrs.height, vb[3]);
        if (vb.length === 4 && width > 0 && height > 0) { if (!inverse) inverse = inv(assetMatrix(node)); const transform = mul(mul(inverse, assetMatrix(owner)), inv(viewport(owner.attrs))), x = num(owner.attrs.x), y = num(owner.attrs.y), polygon = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }].map(p => point(transform, p.x, p.y)); clips.push([polygon]); }
      }
      const ref = /url\(['"]?#([^)'"\s]+)/.exec(owner._styles['clip-path'] || owner.attrs['clip-path'] || '');
      if (!ref) continue;
      const def = node.context.defs.get(ref[1]); if (!def) continue;
      if (!inverse) inverse = inv(assetMatrix(node)); let transform = mul(inverse, assetMatrix(owner));
      if (def.attrs.clipPathUnits === 'objectBoundingBox' || def.attrs.clippathunits === 'objectBoundingBox') { const b = owner.getBBox(); transform = mul(transform, { a: b.width, b: 0, c: 0, d: b.height, e: b.x, f: b.y }); }
      const shapes = definitionShapes(def, ID, {}).filter(s => s.points.length > 2).map(s => s.points.map(p => point(transform, p.x, p.y)));
      if (shapes.length) clips.push(shapes);
    }
    return clips;
  }
  function clipLine(points, clip) { const result = []; if (points.length < 2 || clip.length < 3) return points; let area = 0; for (let i = 0; i < clip.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length]; area += a.x * b.y - b.x * a.y; } const sign = area < 0 ? -1 : 1; for (let k = 0; k < points.length - 1; k++) { const p = points[k], q = points[k + 1], dx = q.x - p.x, dy = q.y - p.y; let lo = 0, hi = 1; for (let i = 0; i < clip.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length], ex = b.x - a.x, ey = b.y - a.y, base = sign * (ex * (p.y - a.y) - ey * (p.x - a.x)), rate = sign * (ex * dy - ey * dx); if (Math.abs(rate) < 1e-9) { if (base < 0) { lo = 1; hi = 0; break; } } else if (rate > 0) lo = Math.max(lo, -base / rate); else hi = Math.min(hi, -base / rate); } if (lo <= hi) { result.push({ x: p.x + dx * lo, y: p.y + dy * lo }, { x: p.x + dx * hi, y: p.y + dy * hi }); } } return result; }
  function blendStops(stops, t) { if (!stops.length) return { color: 0, alpha: 0 }; let a = stops[0], b = a; for (const stop of stops) { if (stop.offset > t) { b = stop; break; } a = b = stop; } if (t < stops[0].offset) a = b = stops[0]; const p = Math.max(0, Math.min(1, (t - a.offset) / Math.max(1e-9, b.offset - a.offset))), opacity = a.alpha * (1 - p) + b.alpha * p, channel = shift => opacity > 1e-9 ? Math.round((((a.color >> shift) & 255) * a.alpha * (1 - p) + ((b.color >> shift) & 255) * b.alpha * p) / opacity) : (a.color >> shift) & 255; return { color: channel(16) << 16 | channel(8) << 8 | channel(0), alpha: opacity }; }
  function clipPolygon(points, clip) {
    if (points.length < 3 || clip.length < 3) return [];
    let area = 0; for (let i = 0; i < clip.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length]; area += a.x * b.y - b.x * a.y; } const sign = area >= 0 ? 1 : -1; let out = points;
    for (let i = 0; i < clip.length && out.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length], input = out; out = []; const inside = p => sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= -.0001; for (let j = 0; j < input.length; j++) { const p = input[j], q = input[(j + 1) % input.length], pin = inside(p), qin = inside(q); if (pin) out.push(p); if (pin !== qin) { const dx = q.x - p.x, dy = q.y - p.y, ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex; if (Math.abs(den) > 1e-9) { const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / den; out.push({ x: p.x + dx * t, y: p.y + dy * t }); } } } }
    return out;
  }
  function clipScalar(points, value, threshold, keepGreater) { if (points.length < 3) return []; const out = []; for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length], av = value(a) - threshold, bv = value(b) - threshold, insideA = keepGreater ? av >= -1e-9 : av <= 1e-9, insideB = keepGreater ? bv >= -1e-9 : bv <= 1e-9; if (insideA) out.push(a); if (insideA !== insideB && Math.abs(av - bv) > 1e-12) { const t = av / (av - bv); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } } return out; }
  function gradientSampler(def, style, bounds, view) {
    const a = def.attrs, relative = a.gradientUnits !== 'userSpaceOnUse', coordinate = (value, size, fallback) => value == null ? fallback * size : String(value).endsWith('%') ? num(value) / 100 * size : num(value), base = relative ? { a: bounds.width, b: 0, c: 0, d: bounds.height, e: bounds.x, f: bounds.y } : ID, transform = mul(base, matrix(a.gradientTransform, bounds, style)), inverse = inv(transform), stops = gradientColor(def, style), spread = a.spreadMethod || 'pad';
    const xSize = relative ? 1 : view.width, ySize = relative ? 1 : view.height, radiusSize = relative ? 1 : Math.hypot(view.width, view.height) / Math.SQRT2, x1 = coordinate(a.x1, xSize, 0), y1 = coordinate(a.y1, ySize, 0), x2 = coordinate(a.x2, xSize, 1), y2 = coordinate(a.y2, ySize, 0), cx = coordinate(a.cx, xSize, .5), cy = coordinate(a.cy, ySize, .5), r = Math.max(1e-9, coordinate(a.r, radiusSize, .5)), fr = Math.max(0, Math.min(r, coordinate(a.fr, radiusSize, 0)));
    let fx = a.fx == null ? cx : coordinate(a.fx, xSize, .5), fy = a.fy == null ? cy : coordinate(a.fy, ySize, .5); const focalDistance = Math.hypot(fx - cx, fy - cy); if (focalDistance >= r - fr && focalDistance > 0) { const k = Math.max(0, (r - fr) * .999999) / focalDistance; fx = cx + (fx - cx) * k; fy = cy + (fy - cy) * k; }
    const linear = def.tag === 'lineargradient', dx = x2 - x1, dy = y2 - y1, lengthSquared = dx * dx + dy * dy, tAt = linear ? p => lengthSquared > 1e-12 ? ((p.x - x1) * dx + (p.y - y1) * dy) / lengthSquared : 1 : p => { const qx = p.x - fx, qy = p.y - fy, dcx = cx - fx, dcy = cy - fy, dr = r - fr, aa = dcx * dcx + dcy * dcy - dr * dr, bb = -2 * (qx * dcx + qy * dcy + fr * dr), cc = qx * qx + qy * qy - fr * fr; if (cc <= 0) return 0; if (Math.abs(aa) < 1e-12) return Math.max(0, -cc / (bb || -1e-12)); const root = Math.sqrt(Math.max(0, bb * bb - 4 * aa * cc)); return Math.max(0, (-bb - root) / (2 * aa)); };
    const sample = p => { let t = tAt(p); if (spread === 'repeat') t = (t % 1 + 1) % 1; else if (spread === 'reflect') { t = (t % 2 + 2) % 2; if (t > 1) t = 2 - t; } return blendStops(stops, t); };
    return { transform, inverse, stops, linear, tAt, sample, cx, cy, r, spread };
  }
  function coloredPolygon(g, polygon, sampler, opacity) {
    if (polygon.length < 3) return; const colors = polygon.map(sampler.sample), points = polygon.map(p => point(sampler.transform, p.x, p.y));
    for (let i = 1; i + 1 < points.length; i++) { const a = points[0], b = points[i], c = points[i + 1], ca = colors[0], cb = colors[i], cc = colors[i + 1]; if (Math.max(ca.alpha, cb.alpha, cc.alpha) <= 0 || Math.abs(signedArea([a, b, c])) < 1e-10) continue; g.fillGradientStyle(ca.color, cb.color, cc.color, cc.color, ca.alpha * opacity, cb.alpha * opacity, cc.alpha * opacity, cc.alpha * opacity).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y); }
  }
  function drawGradient(g, triangles, def, style, bounds, view, opacity) {
    const sampler = gradientSampler(def, style, bounds, view); if (!sampler.stops.length) return;
    for (const triangle of triangles) {
      const polygon = triangle.map(p => point(sampler.inverse, p.x, p.y));
      if (sampler.linear) {
        const values = polygon.map(sampler.tAt), min = Math.min(...values), max = Math.max(...values), cuts = [min, max];
        if (sampler.spread === 'pad') for (const stop of sampler.stops) { if (stop.offset > min && stop.offset < max) cuts.push(stop.offset); }
        else for (let turn = Math.floor(min); turn <= Math.ceil(max) && cuts.length < 128; turn++) for (const stop of sampler.stops) { const t = turn + (sampler.spread === 'reflect' && Math.abs(turn % 2) ? 1 - stop.offset : stop.offset); if (t > min && t < max) cuts.push(t); }
        cuts.sort((a, b) => a - b); if (max - min < 1e-10) coloredPolygon(g, polygon, sampler, opacity); else for (let i = 1; i < cuts.length; i++) if (cuts[i] - cuts[i - 1] > 1e-9) coloredPolygon(g, clipScalar(clipScalar(polygon, sampler.tAt, cuts[i - 1], true), sampler.tAt, cuts[i], false), sampler, opacity);
      } else {
        // A shared gradient-space grid gives each native triangle interpolated
        // vertex color/alpha. There are no opaque rings or polygonal glow fans.
        const b = boxOf(polygon), xs = [b.x, b.x + b.width], ys = [b.y, b.y + b.height], step = sampler.r / 16, addCuts = (list, lo, hi, center) => { const start = sampler.spread === 'pad' ? -16 : Math.max(-64, Math.floor((lo - center) / step)), end = sampler.spread === 'pad' ? 16 : Math.min(64, Math.ceil((hi - center) / step)); for (let i = start; i <= end; i++) { const value = center + i * step; if (value > lo + 1e-9 && value < hi - 1e-9) list.push(value); } list.sort((a, b) => a - b); };
        addCuts(xs, b.x, b.x + b.width, sampler.cx); addCuts(ys, b.y, b.y + b.height, sampler.cy);
        for (let x = 1; x < xs.length; x++) { const strip = clipScalar(clipScalar(polygon, p => p.x, xs[x - 1], true), p => p.x, xs[x], false); if (strip.length < 3) continue; const sb = boxOf(strip); for (let y = 1; y < ys.length; y++) { if (ys[y] < sb.y || ys[y - 1] > sb.y + sb.height) continue; coloredPolygon(g, clipScalar(clipScalar(strip, p => p.y, ys[y - 1], true), p => p.y, ys[y], false), sampler, opacity); } }
      }
    }
  }
  function drawCappedLine(g, points, width, cap, stroke, opacity, clips) {
    const a = points[0], b = points[1], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), angle = length > 1e-10 ? Math.atan2(dy, dx) : 0, radius = width / 2;
    let polygon = [];
    if (cap === 'square') {
      const ux = Math.cos(angle) * radius, uy = Math.sin(angle) * radius, nx = -uy, ny = ux;
      polygon = [{ x: a.x - ux + nx, y: a.y - uy + ny }, { x: a.x - ux - nx, y: a.y - uy - ny }, { x: b.x + ux - nx, y: b.y + uy - ny }, { x: b.x + ux + nx, y: b.y + uy + ny }];
    } else {
      const steps = Math.max(6, Math.min(48, Math.ceil(Math.PI * Math.sqrt(radius / .08) / 2)));
      for (let end = 0; end < 2; end++) for (let i = 0; i <= steps; i++) { const turn = angle - Math.PI / 2 + end * Math.PI + i / steps * Math.PI, center = end ? a : b, p = { x: center.x + Math.cos(turn) * radius, y: center.y + Math.sin(turn) * radius }, previous = polygon[polygon.length - 1]; if (!previous || Math.hypot(p.x - previous.x, p.y - previous.y) > 1e-8) polygon.push(p); }
    }
    // SVG round/square caps belong to the stroke's filled area. In particular,
    // Mx y h.1 with a wide round stroke is a ground dot, not a subpixel strip.
    // Fill the capsule in this existing Graphics; never create a cell object.
    let pieces = [polygon];
    for (const union of clips) { const next = []; for (const piece of pieces) for (const clip of union) { const clipped = clipPolygon(piece, clip); if (clipped.length > 2) next.push(clipped); } pieces = next; }
    g.fillStyle(stroke.color, stroke.alpha * opacity);
    for (const piece of pieces) g.fillPoints(piece, true, true);
  }
  function drawShape(g, contours, style, defs, clips, node, fillOnly, strokeOnly) {
    const fillValue = resolve(style.fill == null ? '#000000' : style.fill, style), ref = /url\(['"]?#([^)'"\s]+)/.exec(fillValue), definition = ref && defs.get(ref[1]), fill = ref ? null : color(fillValue, style), stroke = color(style.stroke, style), opacity = alpha(style['fill-opacity'], style), bounds = boxOf(contours.flatMap(contour => contour.points));
    if (!strokeOnly && (fill || definition)) {
      let triangles = compoundTriangles(contours, style['fill-rule']);
      if (clips.length) { const clipped = []; for (const triangle of triangles) { let pieces = [triangle]; for (const union of clips) { const next = []; for (const piece of pieces) for (const clip of union) { const polygon = clipPolygon(piece, clip); if (polygon.length > 2) next.push(polygon); } pieces = next; } for (const polygon of pieces) for (let i = 1; i + 1 < polygon.length; i++) clipped.push([polygon[0], polygon[i], polygon[i + 1]]); } triangles = clipped; }
      if (definition && /gradient$/.test(definition.tag)) drawGradient(g, triangles, gradientDefinition(definition, defs), style, bounds, viewportBox(node), opacity);
      else if (definition && definition.tag === 'pattern') for (const triangle of triangles) drawPattern(g, triangle, definition, style, defs, bounds);
      else if (fill && opacity > 0) { g.fillStyle(fill.color, fill.alpha * opacity); for (const [a, b, c] of triangles) g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y); }
    }
    const width = num(resolve(style['stroke-width'], style), 1);
    if (!fillOnly && stroke && width > 0) {
      const strokeOpacity = alpha(style['stroke-opacity'], style), dash = nums(resolve(style['stroke-dasharray'], style)), dashed = dash.length && dash.some(n => n > 0), cap = resolve(style['stroke-linecap'], style);
      g.lineStyle(width, stroke.color, stroke.alpha * strokeOpacity);
      for (const contour of contours) {
        if (contour.points.length < 2) continue;
        if (!contour.closed && contour.points.length === 2 && !dashed && (cap === 'round' || cap === 'square')) { drawCappedLine(g, contour.points, width, cap, stroke, strokeOpacity, clips); continue; }
        if (!clips.length) { if (dashed) dashedStroke(g, contour.points, contour.closed, dash, num(resolve(style['stroke-dashoffset'], style))); else g.strokePoints(contour.points, contour.closed, contour.closed); }
        else { const path = contour.closed ? [...contour.points, contour.points[0]] : contour.points; let segments = []; for (let i = 1; i < path.length; i++) segments.push([path[i - 1], path[i]]); for (const union of clips) { const next = []; for (const segment of segments) for (const clip of union) { const points = clipLine(segment, clip); for (let i = 1; i < points.length; i += 2) next.push([points[i - 1], points[i]]); } segments = next; } for (const [a, b] of segments) g.lineBetween(a.x, a.y, b.x, b.y); }
      }
    }
  }
  function dashedStroke(g, points, closed, pattern, offset) {
    if (pattern.length % 2) pattern = pattern.concat(pattern); pattern = pattern.map(n => Math.max(.00001, n)); const total = pattern.reduce((a, b) => a + b, 0); if (!total) return; offset = ((offset % total) + total) % total;
    let index = 0; while (offset > pattern[index] && index < pattern.length - 1) { offset -= pattern[index]; index++; } let remaining = pattern[index] - offset;
    const count = points.length + (closed ? 1 : 0); for (let i = 1; i < count; i++) { const a = points[(i - 1) % points.length], b = points[i % points.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy); if (!length) continue; let distance = 0; while (distance < length - .00001) { const step = Math.min(remaining, length - distance); if (!(index % 2) && step > .0001) g.lineBetween(a.x + dx * distance / length, a.y + dy * distance / length, a.x + dx * (distance + step) / length, a.y + dy * (distance + step) / length); distance += step; remaining -= step; if (remaining <= .00001) { index = (index + 1) % pattern.length; remaining = pattern[index]; } } }
  }
  function drawPattern(g, polygon, def, style, defs, bounds) {
    const b = bounds || boxOf(polygon), a = def.attrs, relative = a.patternUnits !== 'userSpaceOnUse', width = Math.max(.1, num(a.width, 8) * (relative ? b.width : 1)), height = Math.max(.1, num(a.height, 8) * (relative ? b.height : 1)), tm = matrix(a.patternTransform, b, style), inverse = inv(tm), projected = polygon.map(p => point(inverse, p.x, p.y)), bb = boxOf(projected), shapes = def.children.flatMap(child => definitionShapes(child, ID, { fill: '#000000' }));
    let tiles = 0; for (let y = Math.floor(bb.y / height) * height; y <= bb.y + bb.height; y += height) for (let x = Math.floor(bb.x / width) * width; x <= bb.x + bb.width; x += width) { if (tiles++ > 500) return; const translation = mul(tm, { ...ID, e: x, f: y }); for (const shape of shapes) { const points = shape.points.map(p => point(translation, p.x, p.y)), clipped = shape.closed ? clipPolygon(polygon, points) : clipLine(points, polygon), fill = color(shape.style.fill, style), stroke = color(shape.style.stroke, style); if (shape.closed && clipped.length > 2 && fill) g.fillStyle(fill.color, fill.alpha * num(shape.style['fill-opacity'], 1) * num(style['fill-opacity'], 1)).fillPoints(clipped, true, true); if (stroke && clipped.length > 1) g.lineStyle(num(shape.style['stroke-width'], 1), stroke.color, stroke.alpha).strokePoints(clipped, shape.closed, shape.closed); } }
  }
  function duration(value, fallback) { if (value == null || value === '') return fallback; const text = String(value); return num(text, fallback) * (text.endsWith('ms') ? 1 : 1000); }
  const easingCache = new Map();
  function timingEase(text, p) {
    text = text || 'ease'; let fn = easingCache.get(text);
    if (!fn) {
      const presets = { ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] }, cubic = /^cubic-bezier\(([^)]+)\)/.exec(text), steps = /^steps\(\s*(\d+)\s*(?:,\s*([\w-]+))?\)/.exec(text);
      fn = value => value;
      if (text === 'step-start') fn = () => 1;
      else if (text === 'step-end') fn = value => value >= 1 ? 1 : 0;
      else if (steps) { const count = Math.max(1, +steps[1]), position = steps[2] || 'end'; fn = value => value >= 1 ? 1 : Math.max(0, Math.min(1, (Math.floor(value * count) + (/start|jump-both/.test(position) ? 1 : 0)) / (position === 'jump-none' ? Math.max(1, count - 1) : position === 'jump-both' ? count + 1 : count))); }
      else if (presets[text] || cubic) { const values = presets[text] || nums(cubic[1]); if (values.length === 4) { const curve = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3; fn = value => { if (value <= 0 || value >= 1) return value; let lo = 0, hi = 1, t = value; for (let i = 0; i < 10; i++) { if (curve(t, values[0], values[2]) < value) lo = t; else hi = t; t = (lo + hi) / 2; } return curve(t, values[1], values[3]); }; } }
      easingCache.set(text, fn);
    }
    return fn(p);
  }
  function decompose(m) { const sx = Math.hypot(m.a, m.b) || 1e-9, sy = (m.a * m.d - m.b * m.c) / sx, angle = Math.atan2(m.b, m.a), hint = m.rotationHint; return { x: m.e, y: m.f, sx, sy, angle: Number.isFinite(hint) && Math.abs(hint) > Math.PI ? angle + Math.round((hint - angle) / (Math.PI * 2)) * Math.PI * 2 : angle, skew: Math.abs(sy) > 1e-8 ? (m.a * m.c + m.b * m.d) / (sx * sy) : 0 }; }
  function interpolate(a, b, p) {
    // Every animated geometric track samples here. Keep its fresh matrix,
    // without a temporary component object and key array for each sample.
    const q = 1 - p, x = a.x * q + b.x * p, y = a.y * q + b.y * p;
    const sx = a.sx * q + b.sx * p, sy = a.sy * q + b.sy * p;
    const angle = a.angle * q + b.angle * p, skew = a.skew * q + b.skew * p;
    const c = Math.cos(angle), s = Math.sin(angle);
    return { a: c * sx, b: s * sx, c: (c * skew - s) * sy, d: (s * skew + c) * sy, e: x, f: y };
  }
  function animationsFor(node) {
    const s = node._styles, split = value => String(value || '').split(/,(?![^()]*\))/).map(v => v.trim()), shorthands = split(resolve(s.animation, s)), names = split(s['animation-name']), count = Math.max(shorthands.length, names.length), out = [];
    for (let index = 0; index < count; index++) {
      const shorthand = shorthands[index % shorthands.length], tokens = shorthand.match(/(?:[\w-]+\([^)]*\)|[^\s])+/g) || [], longhand = key => { const values = split(resolve(s[key], s)); return values[index % values.length]; }, name = longhand('animation-name') || tokens.find(t => keyframes.has(t)), frames = keyframes.get(name); if (!frames || shorthand === 'none') continue;
      const times = tokens.filter(t => /^[-+.\d]+m?s$/.test(t)), frameBox = frames.find(frame => frame.style['transform-box']), frameOrigin = frames.find(frame => frame.style['transform-origin']), b = frameBox && /fill-box/.test(frameBox.style['transform-box']) ? node.getBBox() : referenceBox(node), geometric = ['transform', 'translate', 'rotate', 'scale'], underlying = {}, prepared = [];
      for (const property of geometric) { const value = property === 'transform' ? s.transform == null ? node.attrs.transform : s.transform : s[property]; underlying[property] = decompose(matrix(property === 'transform' ? value : value && value !== 'none' ? property + '(' + value + ')' : '', b, s)); }
      for (const frame of frames) { const f = { offset: frame.offset, ease: frame.style['animation-timing-function'] || longhand('animation-timing-function') || tokens.find(t => /ease|linear|steps|bezier/.test(t)) || 'ease' }; for (const property of geometric) f[property] = frame.style[property] == null ? null : decompose(matrix(property === 'transform' ? resolve(frame.style[property], s) : property + '(' + resolve(frame.style[property], s) + ')', b, s)); f.opacity = frame.style.opacity == null ? null : alpha(frame.style.opacity, s); f.paintOpacity = frame.style['fill-opacity'] == null ? null : alpha(frame.style['fill-opacity'], s); prepared.push(f); }
      underlying.opacity = alpha(s.opacity, s); underlying.paintOpacity = alpha(s['fill-opacity'], s); const tracks = {};
      for (const property of [...geometric, 'opacity', 'paintOpacity']) { const list = prepared.filter(f => f[property] != null); tracks[property] = list; if (!list.length) continue; if (list[0].offset > 0) list.unshift({ offset: 0, [property]: underlying[property], ease: list[0].ease }); if (list[list.length - 1].offset < 1) list.push({ offset: 1, [property]: underlying[property], ease: list[list.length - 1].ease }); }
      if (!Object.values(tracks).some(track => track.length)) continue;
      const iterations = longhand('animation-iteration-count') || tokens.find(token => token === 'infinite' || /^\d*\.?\d+$/.test(token));
      out.push({ tracks, origin: frameOrigin && frameOrigin.style['transform-origin'], box: frameBox && frameBox.style['transform-box'], duration: Math.max(1, duration(longhand('animation-duration'), duration(times[0], 0))), delay: duration(longhand('animation-delay'), duration(times[1], 0)), direction: longhand('animation-direction') || tokens.find(t => /^(alternate|alternate-reverse|reverse|normal)$/.test(t)) || 'normal', iterations: iterations === 'infinite' ? Infinity : Math.max(0, num(iterations, 1)), fill: longhand('animation-fill-mode') || tokens.find(t => /^(both|forwards|backwards)$/.test(t)) || 'none', started: nodeClock(node, performance.now()) });
    }
    return out;
  }
  function refreshPaintTargets(node) { const targets = [], walk = n => { if (n !== node && n._ownFillOpacity) return; if (n._graphics) targets.push(n._graphics); if (n._label) targets.push(n._label); for (const child of n.children) walk(child); }; walk(node); node._paintTargets = targets; }
  function resetPaintOpacity(node) { for (const target of node._paintTargets || []) if (target.active && target._nativeFillNode) { const owner = target._nativeFillNode; target.setAlpha(alpha(owner._styles['fill-opacity'], owner._styles) * (target._nativeColorAlpha == null ? 1 : target._nativeColorAlpha)); } }
  function applyPaintOpacity(node, value) { for (const target of node._paintTargets || []) if (target.active) target.setAlpha(value * (target._nativeColorAlpha == null ? 1 : target._nativeColorAlpha)); }
  function nodeClock(node, now) { return (node._clockPauseAt == null ? now : node._clockPauseAt) - (node._clockTimeOffset || 0); }
  function clockPause(node, flag, on, now) { const previous = node._clockPauseFlags || 0, next = on ? previous | flag : previous & ~flag; if (!previous && next) node._clockPauseAt = now; else if (previous && !next) { node._clockTimeOffset = (node._clockTimeOffset || 0) + now - node._clockPauseAt; node._clockPauseAt = null; } node._clockPauseFlags = next; }
  function updateMotionState(scene, time) {
    const state = stateFor(scene); if (state.motionCheckTime === time) return; state.motionCheckTime = time;
    let enabled = true; try { if (typeof gardenMotionOn === 'function') enabled = !!gardenMotionOn(); } catch (e) { /* standalone scene */ }
    if (state.motionOn === enabled) return; state.motionOn = enabled; const now = performance.now();
    for (const node of state.animations) { clockPause(node, 2, !enabled, now); if (!enabled && !node._nativeAnimating) { node._applyTransform(); node._computedAlpha = alpha(node._styles.opacity, node._styles); node.target.setAlpha(node._computedAlpha); node._inner.setAlpha(1); resetPaintOpacity(node); } }
  }
  function animateNode(node, time) {
    if (node._dead || !node.target.active || node._nativeAnimating || node._lastNativeTime === time || node._motionBlocked || stateFor(node.scene).motionOn === false) return;
    for (let parent = node; parent; parent = parent.parentNode) if (!parent.target.visible) return;
    node._lastNativeTime = time;
    time = nodeClock(node, time);
    let transform = null, opacity = null, paintOpacity = null, properties = null;
    for (const animation of node._animations) {
      let local = time - animation.started - animation.delay; if (local < 0 && !animation.fillsBefore) continue;
      const ended = local >= animation.duration * animation.iterations; if (ended && !animation.fillsAfter) continue;
      local = Math.max(0, local); const iteration = ended ? Math.max(0, Math.ceil(animation.iterations) - 1) : Math.floor(local / animation.duration); let p = ended ? animation.iterations > 0 ? animation.iterations % 1 || 1 : 0 : local / animation.duration % 1;
      if (animation.direction === 'reverse' || animation.direction === 'alternate' && iteration % 2 || animation.direction === 'alternate-reverse' && !(iteration % 2)) p = 1 - p;
      for (const track of animation.sampleTracks) {
        const property = track.property, frames = track.frames; let index = 0; while (index < frames.length - 2 && p > frames[index + 1].offset) index++;
        const a = frames[index], b = frames[index + 1] || a, f = timingEase(a.ease, Math.max(0, Math.min(1, (p - a.offset) / Math.max(.00001, b.offset - a.offset))));
        const value = track.geometric ? interpolate(a[property], b[property], f) : a[property] * (1 - f) + b[property] * f;
        if (property === 'transform') { if (value) transform = value; }
        else if (property === 'opacity') { if (value != null) opacity = value; }
        else if (property === 'paintOpacity') { if (value != null) paintOpacity = value; }
        else if (value) { if (!properties) properties = {}; properties[property] = value; }
      }
      if (animation.origin || animation.box) { if (!properties) properties = {}; if (animation.origin) properties.origin = animation.origin; if (animation.box) properties.box = animation.box; }
    }
    if (transform) {
      const classes = String(node.attrs.class || '');
      if (node._windClassKey !== classes) {
        node._windClassKey = classes;
        node._windClassFlags = /gda-sway|gart-wind|gart-swing|gart-cloud/.test(classes) ? node.classList.contains('gart-cloud') ? 3 : 1 : 0;
      }
      if (node._windClassFlags & 1) { const wind = num(environmentState.windX) * .008 + num(environmentState.gust) * .018; if (node._windClassFlags & 2) transform = { ...transform, e: transform.e + num(environmentState.windX) * .2 }; else transform = mul(transform, { a: Math.cos(wind), b: Math.sin(wind), c: -Math.sin(wind), d: Math.cos(wind), e: 0, f: 0 }); }
    }
    if (transform || properties || node._animatedTransform) node._applyTransform(transform, properties); node._animatedTransform = !!(transform || properties);
    if (opacity != null) node.target.setAlpha(opacity); else if (node._animatedOpacity) node.target.setAlpha(alpha(node._styles.opacity, node._styles)); node._animatedOpacity = opacity != null;
    if (paintOpacity != null) applyPaintOpacity(node, paintOpacity); else if (node._animatedPaint) resetPaintOpacity(node); node._animatedPaint = paintOpacity != null;
  }
  function cacheTransform(node, object) {
    const state = stateFor(node.scene);
    if (!state.cacheWorldMatrix) { const Matrix = Phaser.GameObjects.Components.TransformMatrix; state.cacheWorldMatrix = new Matrix(); state.cacheParentMatrix = new Matrix(); state.cacheCameraPoint = { x: 0, y: 0 }; }
    // Phaser allocates both matrices when these outputs are omitted. Cache
    // checks consume the scratch result synchronously; it never escapes.
    return object.getWorldTransformMatrix(state.cacheWorldMatrix, state.cacheParentMatrix);
  }
  function effectivePixels(node) {
    const scene = node.scene, zoom = scene.cameras && scene.cameras.main ? scene.cameras.main.zoom : 1, resolution = num(scene.game && scene.game.renderer && scene.game.renderer.resolution, num(scene.game && scene.game.config && scene.game.config.resolution, 1));
    let scale = 1;
    if (node.target.getWorldTransformMatrix) { const m = cacheTransform(node, node.target), aa = m.a * m.a + m.b * m.b, bb = m.c * m.c + m.d * m.d, cross = m.a * m.c + m.b * m.d; scale = Math.sqrt(Math.max(0, (aa + bb + Math.hypot(aa - bb, 2 * cross)) / 2)); }
    return zoom * resolution * scale;
  }
  function cacheQuality(node, options) {
    options = options || node._cacheRecipe || {};
    const b = node.getBBox(), state = stateFor(node.scene), floor = Math.max(.5, Math.min(12, num(options.quality, !state.lowMemory && b.width * b.height <= 1024 * 1024 ? 2 : 1)));
    if (options.adaptive === false) return floor;
    const required = Math.max(floor, Math.ceil(effectivePixels(node)));
    return [1, 2, 3, 4, 6, 8, 12].find(value => value >= required) || 12;
  }
  function intersectBox(a, b) { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; }
  function containsBox(a, b, tolerance) { tolerance = tolerance || 0; return !b || a && b.x >= a.x - tolerance && b.y >= a.y - tolerance && b.x + b.width <= a.x + a.width + tolerance && b.y + b.height <= a.y + a.height + tolerance; }
  function expandedBox(b, x, y) { return { x: b.x - x, y: b.y - y, width: b.width + x * 2, height: b.height + y * 2 }; }
  function nativeVisible(node) { if (node._dead || !node.target.active) return false; for (let n = node; n; n = n.parentNode) if (!n.target.visible) return false; return !!node.isConnected; }
  function localView(node) {
    const camera = node.scene.cameras && node.scene.cameras.main;
    if (!camera || !camera.getWorldPoint || !node._inner.getWorldTransformMatrix) return null;
    const x = num(camera.x), y = num(camera.y), width = num(camera.width), height = num(camera.height);
    if (!(width > 0 && height > 0)) return null;
    const matrix = cacheTransform(node, node._inner), determinant = matrix.a * matrix.d - matrix.b * matrix.c, degenerate = Math.abs(determinant) < 1e-10;
    // Copy the six inverse coefficients before calling another helper, so a
    // nested world transform cannot overwrite this projection's matrix.
    const a = degenerate ? 1 : matrix.d / determinant, b = degenerate ? 0 : -matrix.b / determinant, c = degenerate ? 0 : -matrix.c / determinant, d = degenerate ? 1 : matrix.a / determinant, e = degenerate ? 0 : (matrix.c * matrix.ty - matrix.d * matrix.tx) / determinant, f = degenerate ? 0 : (matrix.b * matrix.tx - matrix.a * matrix.ty) / determinant;
    const scratch = stateFor(node.scene).cacheCameraPoint; let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (let corner = 0; corner < 4; corner++) { camera.getWorldPoint(x + (corner & 1 ? width : 0), y + (corner & 2 ? height : 0), scratch); const px = a * scratch.x + c * scratch.y + e, py = b * scratch.x + d * scratch.y + f; left = Math.min(left, px); top = Math.min(top, py); right = Math.max(right, px); bottom = Math.max(bottom, py); }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  function cacheView(node, quality, options, background) {
    const full = node.getBBox(), view = background ? null : localView(node), visible = view ? intersectBox(full, view) : full;
    if (!visible) return { full, view, visible: null, bounds: null, cropped: false };
    let bounds = full;
    if (view && options.crop !== false && full.width * full.height * quality * quality * 4 > 512 * 1024) {
      const overscan = Math.max(.08, Math.min(.5, num(options.overscan, .18))), padded = expandedBox(view, view.width * overscan, view.height * overscan), grid = Math.max(1, 128 / quality), snapped = { x: Math.floor(padded.x / grid) * grid, y: Math.floor(padded.y / grid) * grid };
      snapped.width = Math.ceil((padded.x + padded.width) / grid) * grid - snapped.x; snapped.height = Math.ceil((padded.y + padded.height) / grid) * grid - snapped.y;
      bounds = intersectBox(full, snapped);
    }
    if (bounds) { const right = Math.ceil(bounds.x + bounds.width), bottom = Math.ceil(bounds.y + bounds.height); bounds = { x: Math.floor(bounds.x), y: Math.floor(bounds.y), width: right - Math.floor(bounds.x), height: bottom - Math.floor(bounds.y) }; }
    return { full, view, visible, bounds, cropped: !containsBox(bounds, full, .001) };
  }
  function cacheValid(node) {
    const cache = node && node._cache; if (!cache || cache.dirty || effectivePixels(node) > cache.quality * 1.02) return false;
    return !cache.cropped || containsBox(cache.coverage, intersectBox(node.getBBox(), localView(node) || node.getBBox()), .25 / cache.quality);
  }
  function cacheCoversView(node) { const cache = node._cache; return !!cache && (!cache.cropped || containsBox(cache.coverage, intersectBox(node.getBBox(), localView(node) || node.getBBox()), .25 / cache.quality)); }
  function showCache(node, cached) {
    const cache = node._cache; if (!cache || cache.showingVectors === !cached) return;
    cache.showingVectors = !cached;
    for (const child of cache.originals) if (child && child.active) child.setVisible(cached ? false : cache.visible.get(child));
    for (const tile of cache.tiles) tile.setVisible(cached);
  }
  function releaseCache(node, keepBase) {
    const state = stateFor(node.scene), cache = node._cache;
    const discard = capture => { for (const tile of capture.tiles) tile.destroy(); state.cacheBytes = Math.max(0, state.cacheBytes - capture.bytes); state.cachedTiles = Math.max(0, state.cachedTiles - capture.tiles.length); };
    if (cache) {
      for (const child of cache.originals) if (child && child.active) { if (child._nativeCacheHiddenBy === node) delete child._nativeCacheHiddenBy; child.setVisible(cache.visible.get(child)); }
      discard(cache); node._cache = null; state.cachedNodes.delete(node);
    }
    if (!keepBase && node._cacheBase) { discard(node._cacheBase); node._cacheBase = null; }
  }
  function retainBase(node) {
    const cache = node._cache;
    if (!cache || node._cacheBase || !cache.recipe.retainBase || cache.cropped || cache.quality !== (cache.recipe.baseQuality || 1)) return false;
    for (const child of cache.originals) if (child && child.active) { if (child._nativeCacheHiddenBy === node) delete child._nativeCacheHiddenBy; child.setVisible(cache.visible.get(child)); }
    for (const tile of cache.tiles) { tile.setVisible(false); node._inner.remove(tile); }
    node._cacheBase = cache; node._cache = null; stateFor(node.scene).cachedNodes.delete(node); return true;
  }
  function restoreBase(node) {
    const cache = node._cacheBase; if (!cache) return;
    for (const child of cache.originals) if (child && child.active) { child._nativeCacheHiddenBy = node; child.setVisible(false); }
    for (const tile of cache.tiles) { node._inner.add(tile); tile.setVisible(true); }
    node._cache = cache; node._cacheBase = null; stateFor(node.scene).cachedNodes.add(node);
  }
  function capturePixels(size) { return Math.max(2, Math.ceil(size / 2) * 2); }
  function captureTile(node, x, y, width, height) {
    const w = capturePixels(width), h = capturePixels(height);
    // Phaser first allocates at the supplied size, then its default forceEven
    // setSize rounds odd sizes up and allocates again. Supply that same final
    // size immediately; tile coverage, pixels and scale stay unchanged.
    return node.scene.add.renderTexture(x, y, w, h).setOrigin(0, 0);
  }
  function baseFromCapture(node, cache, quality) {
    if (node._cacheBase || cache.cropped || cache.quality <= quality) return;
    const state = stateFor(node.scene), b = cache.coverage, required = capturePixels(b.width * quality) * capturePixels(b.height * quality) * 4;
    if (required > (cache.recipe.baseMaxBytes || Infinity) || !cacheRoom(node, required, false)) return;
    const tiles = [], oldRotation = node._inner.rotation, oldScaleX = node._inner.scaleX, oldScaleY = node._inner.scaleY, oldAlpha = node._inner.alpha, tileSize = Math.min(512, 2048 / quality);
    try {
      // Only the completed sharp tiles are visible here. Downsampling them
      // adds a few textured quads, without replaying the authored vector art.
      node._inner.setRotation(0).setScale(quality).setAlpha(1);
      for (let y = b.y; y < b.y + b.height; y += tileSize) for (let x = b.x; x < b.x + b.width; x += tileSize) {
        const width = Math.min(tileSize, b.x + b.width - x) * quality, height = Math.min(tileSize, b.y + b.height - y) * quality, tile = captureTile(node, x, y, width, height); tiles.push(tile);
        tile.draw(node._inner, -x * quality, -y * quality); tile.render(); tile.setScale(1 / quality).setVisible(false);
      }
      for (const tile of tiles) { node._inner.add(tile); node._inner.remove(tile); }
      const bytes = tiles.reduce((sum, tile) => sum + tile.width * tile.height * 4, 0);
      node._cacheBase = { originals: cache.originals, visible: cache.visible, tiles, quality, bytes, recipe: { ...cache.recipe, quality, adaptive: false }, coverage: b, cropped: false, lastUsed: performance.now() };
      state.cacheBytes += bytes; state.cachedTiles += tiles.length; state.baseCopies = (state.baseCopies || 0) + 1;
    } catch (error) { for (const tile of tiles) tile.destroy(); state.cacheFailures = (state.cacheFailures || 0) + 1; }
    finally { node._inner.setRotation(oldRotation).setScale(oldScaleX, oldScaleY).setAlpha(oldAlpha); }
  }
  function cacheRefreshNeeded(node) {
    const cache = node._cache; if (!cache || !cache.cropped) return false;
    const view = localView(node); return !!view && !containsBox(cache.coverage, intersectBox(node.getBBox(), expandedBox(view, view.width * .06, view.height * .06)), 1 / cache.quality);
  }
  function queueCache(node, delay, reason) {
    const state = stateFor(node.scene); let recipe = node._cacheRecipe || node._cache && node._cache.recipe; if (!recipe) return;
    // A hidden fit-view capture is only a warm starting point. Once exposed
    // at close zoom its retained vectors remain the immediate sharp fallback.
    if (recipe.background && nativeVisible(node)) { recipe = { ...recipe, background: false, adaptive: true }; node._cacheRecipe = recipe; }
    const band = cacheQuality(node, recipe), now = performance.now(), pending = state.recaches.get(node);
    if (pending && reason === 'missing') { if (pending.band != null && pending.band !== band) { pending.band = band; pending.reason = 'quality'; pending.due = now + 80; } return; }
    if (pending && pending.band === band && pending.reason === reason) return;
    state.recaches.set(node, { recipe: { ...recipe }, band, due: now + (delay || 0), reason });
  }
  function cacheRoom(node, bytes, background, replacing) {
    const state = stateFor(node.scene); if (bytes > state.cacheBudget) return false;
    const additional = Math.max(0, bytes - (replacing || 0));
    if (state.cacheBytes + additional <= state.cacheBudget) return true;
    const now = performance.now(), candidates = [...state.cachedNodes].filter(other => other !== node && other._cache && !(other._cache.recipe.retainBase && !other._cache.cropped && other._cache.quality === (other._cache.recipe.baseQuality || 1)) && !other.contains(node) && !node.contains(other)).map(other => {
      const view = localView(other), visible = nativeVisible(other) && (!view || !!intersectBox(other.getBBox(), view));
      return { node: other, rank: visible ? cacheValid(other) ? 2 : 1 : 0, used: other._cache.lastUsed || 0, bytes: other._cache.bytes };
    }).filter(candidate => candidate.rank === 0).sort((a, b) => a.used - b.used || b.bytes - a.bytes);
    for (const candidate of candidates) { releaseCache(candidate.node, true); restoreBase(candidate.node); state.cacheEvictions = (state.cacheEvictions || 0) + 1; candidate.node._cacheRetryAfter = now + 300; if (state.cacheBytes + additional <= state.cacheBudget) return true; }
    return state.cacheBytes + additional <= state.cacheBudget;
  }
  function cacheAllowance(node, options, take) {
    const state = stateFor(node.scene), loop = node.scene.game && node.scene.game.loop, frame = loop && Number.isFinite(loop.frame) ? loop.frame : node.scene.time && node.scene.time.now;
    if (state.captureFrame !== frame || !state.captureLimit) { state.captureFrame = frame; state.captureCount = 0; state.captureLimit = 1; }
    if (options.preparing) state.captureLimit = 6;
    if ((state.captureCount || 0) >= state.captureLimit) return false;
    if (take) state.captureCount = (state.captureCount || 0) + 1;
    return true;
  }
  function pendingCaches(scene) {
    let count = 0; for (const node of stateFor(scene).cacheTrackedNodes) { if (!nativeVisible(node) || node._cacheRecipe && node._cacheRecipe.radialLeaf && !radialLeafReady(node)) continue; const view = localView(node); if ((!view || intersectBox(node.getBBox(), view)) && !cacheValid(node)) count++; } return count;
  }
  function updateAll(scene, time, sharp) {
    const state = stateFor(scene); updateMotionState(scene, time);
    // Keep covered captures through a moving zoom. Rebuilding a whole scene
    // at each intermediate scale causes repeated GPU allocation and raw-path
    // rendering in the same frames that need a smooth camera transition.
    const now = performance.now();
    for (const node of state.cacheTrackedNodes) {
      if (node._cacheRecipe && node._cacheRecipe.radialLeaf && !radialLeafReady(node)) { releaseCache(node, false); state.recaches.delete(node); continue; }
      if (!nativeVisible(node)) { state.recaches.delete(node); continue; }
      const view = localView(node); if (view && !intersectBox(node.getBBox(), view)) { state.recaches.delete(node); continue; }
      if (node._cache && !cacheValid(node)) { const reason = !cacheCoversView(node) ? 'coverage' : node._cache.dirty ? 'content' : 'quality', vectors = !!node._cache.recipe.radialLeaf || sharp || reason === 'coverage' || !scene._nativeViewTransition && effectivePixels(node) > 12.24; showCache(node, !vectors); if (!sharp) queueCache(node, reason === 'quality' ? 80 : 0, reason); }
      else if (!node._cache && now >= (node._cacheRetryAfter || 0)) queueCache(node, 0, 'missing');
      else if (node._cache) { showCache(node, true); node._cache.lastUsed = now; if (cacheRefreshNeeded(node)) queueCache(node, 0, 'coverage'); else if (!scene._nativeViewTransition && state.cacheBytes > state.cacheBudget * .7 && node._cache.bytes > 512 * 1024 && node._cache.quality > cacheQuality(node) * 1.5) queueCache(node, 150, 'demote'); }
    }
    const camera = scene.cameras && scene.cameras.main, resolution = num(scene.game && scene.game.renderer && scene.game.renderer.resolution, num(scene.game && scene.game.config && scene.game.config.resolution, 1)), labelBucket = camera ? Math.ceil(camera.zoom * resolution * 64) + '|' + camera.width + 'x' + camera.height : '1';
    for (const node of state.labels) {
      if (node._dead || !node._label || !node.target.active) continue;
      let pixels;
      if (node._peerNameLabel) {
        // Scale only the glyph, around its existing text anchor. Measuring
        // the owning node excludes this child scale and cannot feed back.
        pixels = effectivePixels(node);
        const size = num(node._label.style.fontSize, 12), scale = Math.min(1, 16 / Math.max(.001, size * pixels / Math.max(.001, resolution)));
        if (node._label.scaleX !== scale || node._label.scaleY !== scale) node._label.setScale(scale);
      }
      // Texture quality keeps its existing policy. The name size cap also
      // applies during camera easing, before that quality work is deferred.
      if (!sharp && scene._nativeViewTransition || node._textBucket === labelBucket) continue;
      let visible = true; for (let n = node; n; n = n.parentNode) if (!n.target.visible) { visible = false; break; } if (!visible) continue;
      const desired = Math.max(2, Math.min(12, Math.ceil(pixels == null ? effectivePixels(node) : pixels))); if (desired > node._textResolution) { for (let parent = node.parentNode; parent; parent = parent.parentNode) if (parent._cache) { parent._cache.dirty = true; if (!sharp) queueCache(parent, 0, 'content'); } node._textResolution = desired; node._label.setResolution(desired); } node._textBucket = labelBucket;
    }
    const rebuildAt = performance.now(); if (!sharp) for (const [node, pending] of state.recaches) { if (node._dead || !nativeVisible(node)) { state.recaches.delete(node); continue; } if (node._cache && cacheValid(node) && !cacheRefreshNeeded(node) && pending.reason !== 'demote') { state.recaches.delete(node); continue; } if (scene._nativeViewTransition && node._cache && cacheCoversView(node)) continue; if (pending.due > rebuildAt || rebuildAt < (node._cacheRetryAfter || 0)) continue; const view = localView(node); if (view && !intersectBox(node.getBBox(), view)) { state.recaches.delete(node); continue; } if (!cacheAllowance(node, pending.recipe, false)) break; const before = state.captureCount || 0; cacheNative(node, { ...pending.recipe, demote: pending.reason === 'demote' }); if (node._cache && cacheValid(node)) state.recaches.delete(node); else pending.due = rebuildAt + 80; if ((state.captureCount || 0) > before || performance.now() - rebuildAt > 3) break; }
    let cached = 0; const began = performance.now(); if (!sharp) for (const node of state.actorCaches) { state.actorCaches.delete(node); if (!node._dead && node.isConnected) cacheNative(node, { staticOnly: true, quality: 2 }); if (++cached >= 2 || performance.now() - began > 4) break; }
    for (const node of state.animations) animateNode(node, time);
    // Parent pose tracks can raise effective pixels after the scheduler pass.
    for (const node of state.cachedNodes) if (node._cache.recipe.radialLeaf && !cacheValid(node)) { showCache(node, false); if (!sharp && nativeVisible(node)) queueCache(node, 80, 'quality'); }
  }
  function create(scene, markup, options) {
    options = options || {}; const defs = new Map(stateFor(scene).defs), context = { defs, options, building: true }, ast = parse((options.defs || '') + String(markup || '')); collectDefs(ast, defs); for (const [id, value] of defs) stateFor(scene).defs.set(id, value);
    const node = build(scene, ast, context, 0); context.building = false; node.restyle(true); stateFor(scene).roots.add(node); if (options.depth != null) node.target.setDepth(options.depth);
    const handle = { root: node.target, rootNode: node, node, get bounds() { return node.getBBox(); }, update(time) { updateMotionState(scene, time); const walk = n => { if (n._animations.length) animateNode(n, time); for (const child of n.children) walk(child); }; walk(node); }, find(name) { return node.querySelectorAll(name.startsWith('.') || name.startsWith('#') || name.includes('[') ? name : '.' + name); }, query(selector) { return node.querySelector(selector); }, queryAll(selector) { return node.querySelectorAll(selector); }, contains(x, y) { return !!node.hit(x, y); }, hit(x, y) { return node.hit(x, y); }, destroy() { node.destroy(); }, cache(cacheOptions) { cacheNative(node, cacheOptions); return handle; } };
    return handle;
  }
  function cacheNative(node, options) {
    if (node._dead) return;
    options = options || {};
    if (options.radialLeaf && !radialLeafReady(node)) { releaseCache(node, false); stateFor(node.scene).recaches.delete(node); return; }
    if (options.staticOnly) { const counts = new Map(), inspect = n => { let count = n._graphics ? 1 : 0, childMoving = false; const ownMoving = !!(n._animations.length || n._nativeAnimating || n._peerNameLabel), paintMoving = n._animations.some(animation => animation.tracks.paintOpacity.length); for (const child of n.children) { const sub = inspect(child); count += sub.count; childMoving = childMoving || sub.moving; } const out = { count, ownMoving, paintMoving, childMoving, moving: ownMoving || childMoving }; counts.set(n, out); return out; }; inspect(node); const visit = n => { const state = counts.get(n); if (state.paintMoving) return; if (!state.childMoving && state.count >= 4) cacheNative(n, { ...options, staticOnly: false, partitioned: true, preserveOwnMotion: state.ownMoving }); else for (const child of n.children) visit(child); }; visit(node); return; }
    if (options.partitioned) {
      const movingChildren = n => n.children.some(child => child._animations.length || child._nativeAnimating || child._peerNameLabel || movingChildren(child));
      if (movingChildren(node) || node._animations.some(animation => animation.tracks.paintOpacity.length)) {
        const state = stateFor(node.scene); releaseCache(node, false); state.cacheTrackedNodes.delete(node); state.recaches.delete(node); delete node._cacheRecipe;
        cacheNative(node, { ...options, staticOnly: true }); return;
      }
      options = { ...options, preserveOwnMotion: !!(node._animations.length || node._nativeAnimating) };
    }
    const state = stateFor(node.scene), visibleNode = nativeVisible(node), background = !!options.background && !visibleNode && node.isConnected, quality = cacheQuality(node, options), capture = cacheView(node, quality, options, background || options.baseCapture), b = capture.bounds, tileSize = Math.max(16, Math.min(2048 / quality, options.tileSize || 2048));
    const recipe = { ...options }; delete recipe.baseCapture; delete recipe.preparing; delete recipe.demote;
    node._cacheRecipe = recipe; state.cacheTrackedNodes.add(node);
    if (node._cache && (background ? node._cache.quality === quality && !node._cache.cropped : cacheValid(node) && (options.demote ? node._cache.quality === quality : node._cache.quality >= quality) && !cacheRefreshNeeded(node))) { state.recaches.delete(node); return; }
    if (!b || !(b.width > 0 && b.height > 0) || !background && (!options.baseCapture && effectivePixels(node) > quality * 1.02 || !visibleNode)) return;
    if (!cacheAllowance(node, options, false)) { if (!background) queueCache(node, 0, 'budget'); return; }
    if (options.retainBase && !options.baseFromCapture && quality > (options.baseQuality || 1) && !node._cache && !node._cacheBase) cacheNative(node, { ...options, quality: options.baseQuality || 1, adaptive: false, baseCapture: true, crop: false });
    node._cacheRecipe = recipe;
    const requiredBytes = capturePixels(b.width * quality) * capturePixels(b.height * quality) * 4;
    const baseQuality = options.baseQuality || 1, possibleBaseBytes = options.baseFromCapture && !node._cacheBase && !capture.cropped && quality > baseQuality ? capturePixels(b.width * baseQuality) * capturePixels(b.height * baseQuality) * 4 : 0;
    const baseBytes = possibleBaseBytes <= (options.baseMaxBytes || Infinity) ? possibleBaseBytes : 0;
    const keepsCurrentBase = node._cache && !node._cacheBase && options.retainBase && !node._cache.cropped && node._cache.quality === (options.baseQuality || 1), replacementBytes = node._cache && !keepsCurrentBase ? node._cache.bytes : 0;
    // Failed admission keeps the covered capture visible. Only offscreen
    // detail can be evicted; a sharper visible neighbour is never sacrificed.
    if (!cacheRoom(node, requiredBytes + baseBytes, background, replacementBytes)) { state.cachePressureDeferrals = (state.cachePressureDeferrals || 0) + 1; node._cacheRetryAfter = performance.now() + 300; if (!background) queueCache(node, 300, 'capacity'); return; }
    if (!cacheAllowance(node, options, true)) { if (!background) queueCache(node, 0, 'budget'); return; }
    // Retain the previous capture until every replacement tile has rendered.
    // Allocation or rendering failures restore its presentation atomically.
    const previous = node._cache;
    if (previous) showCache(node, false);
    // Flatten previously captured descendants back to their retained vectors.
    // Recapturing a lower-resolution child texture would bake its blur into
    // the sharper parent and retain both allocations unnecessarily.
    for (const child of [...state.cachedNodes]) if (child !== node && node.contains(child)) releaseCache(child, false);
    const prepareLabels = n => { if (n._label) { const desired = Math.max(2, Math.min(12, Math.ceil(effectivePixels(n)))); if (desired > n._textResolution) { n._textResolution = desired; n._label.setResolution(desired); } } for (const child of n.children) prepareLabels(child); }; prepareLabels(node);
    const originals = previous ? previous.originals : [...node._inner.list], visible = new Map(originals.map(n => [n, n.visible])), tiles = [];
    const oldRotation = node._inner.rotation, oldScaleX = node._inner.scaleX, oldScaleY = node._inner.scaleY, oldAlpha = node._inner.alpha;
    try {
      node._inner.setRotation(0).setScale(quality).setAlpha(1);
      for (let y = Math.floor(b.y); y < b.y + b.height; y += tileSize) for (let x = Math.floor(b.x); x < b.x + b.width; x += tileSize) { const pad = 2 / quality, width = (Math.min(tileSize, b.x + b.width - x) + (x + tileSize < b.x + b.width ? pad : 0)) * quality, height = (Math.min(tileSize, b.y + b.height - y) + (y + tileSize < b.y + b.height ? pad : 0)) * quality,   /* (each tile runs two texels into the next: no hairline where they meet) */ tile = captureTile(node, x, y, width, height); tiles.push(tile); tile.draw(node._inner, -x * quality, -y * quality); tile.render(); tile.setScale(1 / quality); }
      node._inner.setRotation(oldRotation).setScale(oldScaleX, oldScaleY).setAlpha(oldAlpha);
      const bytes = tiles.reduce((sum, tile) => sum + tile.width * tile.height * 4, 0);
      if (!cacheRoom(node, bytes, background, replacementBytes)) { for (const tile of tiles) tile.destroy(); if (previous) showCache(node, true); return; }
      // Terrain's fit mip remains pinned under the same shared cache budget.
      if (previous && !retainBase(node)) releaseCache(node, true);
      for (const original of originals) { original._nativeCacheHiddenBy = node; original.setVisible(false); } for (const tile of tiles) node._inner.add(tile); node._cache = { originals, visible, tiles, quality, bytes, recipe, coverage: b, cropped: capture.cropped, lastUsed: performance.now() }; state.cachedNodes.add(node); state.recaches.delete(node); state.cachedTiles += tiles.length; state.cacheBytes += bytes;
      if (baseBytes && !node._cacheBase) baseFromCapture(node, node._cache, baseQuality);
      const freeze = n => { if (n !== node || !options.preserveOwnMotion) stateFor(n.scene).animations.delete(n); for (const child of n.children) freeze(child); }; freeze(node);
    } catch (e) { state.cacheFailures = (state.cacheFailures || 0) + 1; node._inner.setRotation(oldRotation).setScale(oldScaleX, oldScaleY).setAlpha(oldAlpha); for (const tile of tiles) tile.destroy(); if (previous && node._cache === previous) showCache(node, true); else { for (const original of originals) if (original.active) original.setVisible(visible.get(original)); restoreBase(node); } }
  }
  function element(scene, tag, attrs) { const node = new NativeNode(scene, tag, attrs, { defs: stateFor(scene).defs, options: {} }); stateFor(scene).roots.add(node); return node; }
  function stats(scene) { const s = stateFor(scene), triangleBatch = scene.sys && triangleBatchStates.get(scene.sys.renderer), cacheQualities = {}; let croppedCaches = 0, pinnedBases = 0, pinnedBaseBytes = 0, radialLeaves = 0, radialLeafCaches = 0, radialLeafVectors = 0; for (const node of s.cacheTrackedNodes) { if (node._cacheRecipe && node._cacheRecipe.radialLeaf) { radialLeaves++; if (node._cache) { radialLeafCaches++; if (node._cache.showingVectors) radialLeafVectors++; } } const base = node._cacheBase || node._cache && node._cache.recipe.retainBase && !node._cache.cropped && node._cache.quality === (node._cache.recipe.baseQuality || 1) && node._cache; if (base) { pinnedBases++; pinnedBaseBytes += base.bytes; } } for (const node of s.cachedNodes) if (node._cache) { cacheQualities[node._cache.quality] = (cacheQualities[node._cache.quality] || 0) + 1; if (node._cache.cropped) croppedCaches++; } return { created: s.created, shapes: s.shapes, animations: s.animations.size, motionOn: s.motionOn, roots: s.roots.size, labels: s.labels.size, cachedTiles: s.cachedTiles, cacheBytes: s.cacheBytes, cacheBudgetBytes: s.cacheBudget, cacheQualities, croppedCaches, trackedCaches: s.cacheTrackedNodes.size, pendingRecaches: s.recaches.size, capturesThisFrame: s.captureCount || 0, cacheEvictions: s.cacheEvictions || 0, cachePressureDeferrals: s.cachePressureDeferrals || 0, cacheFailures: s.cacheFailures || 0, pinnedBases, pinnedBaseBytes, staticBaseCopies: s.baseCopies || 0, unknownImages: s.unknownImages, radialLeaves: { tracked: radialLeaves, cached: radialLeafCaches, showingVectors: radialLeafVectors }, innerRender: s.innerRender ? { ...s.innerRender } : null, triangleBatch: triangleBatch ? { ...triangleBatch } : null, parsedAssets: parsed.size, cachedPaths: paths.size, styleRules: rules.length, matchedStyleCache: matchedRules.size }; }
  function pauseAmbient(next) {
    next = { hush: !!(next && next.hush), frozen: !!(next && next.frozen) }; if (next.hush === ambientPause.hush && next.frozen === ambientPause.frozen) return;
    ambientPause = next; const now = performance.now();
    const wanted = node => !node.closest('.gd-player,.gd-photo-held,.gd-catch-moment,.pt-cfx') && (next.frozen ? !!node.closest('.gd-it,.gart-live,.gd-school,.gd-weather,.ptw,.gd-pet-follow,.gd-sprite,.gll-actor') : next.hush ? !!node.closest('.gd-it,.gart-live,.gd-school,.gd-weather,.ptw,.gd-pet-follow,.gd-sprite') : false);
    for (const node of [...pausedAmbient]) if (node._dead || !wanted(node)) { if (!node._dead) clockPause(node, 1, false, now); node._ambientPauseAt = null; pausedAmbient.delete(node); }
    // Snapshot existing ambient tracks. New trick effects keep their own time.
    for (const state of liveStates) for (const node of state.animations) if (!pausedAmbient.has(node) && wanted(node)) { node._ambientPauseAt = now; clockPause(node, 1, true, now); pausedAmbient.add(node); }
  }
  function environment(next) { if (next) Object.assign(environmentState, next); return { ...environmentState }; }
  return Object.freeze({ create, draw: create, element, Node: NativeNode, configure, updateAll, cache: cacheNative, cacheQuality, cacheValid, pendingCaches, environment, pauseAmbient, parsePath, parse, matrix, multiply: mul, inverse: inv, point, stats });
})();
