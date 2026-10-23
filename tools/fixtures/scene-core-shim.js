/* ============================================================
   SCENE CORE SHIM (test scaffolding, builder B; docs/dev/SCENE_ENGINE.md sections 2 to 5).
   A small STAND-IN for builder A's src/app/70-scene-0core.js, with the same names and the
   section 2 / 4 contract, so the renderers (70-scene-svg.js, 78-scene-canvas.js,
   78-scene-host.js), their tests and the page harness can run before the core lands.
   It is loaded ONLY when src/app/70-scene-0core.js does not exist (tests/scene-render.test.mjs,
   tools/lib/scene-page.mjs): once the real core is merged this file is never loaded, and the
   reviewer may delete it. It is not part of the app build (it lives under tests/).
   Classic script, one shared scope: every name starts with scene / SCENE_ / _sc.
   ============================================================ */
const SCENE_W = 1600, SCENE_H = 900;
const SCENE_LAYERS_DEFAULT = [
  { id: 'horizon', depth: 0.08, haze: 0.65 }, { id: 'far', depth: 0.2, haze: 0.45 }, { id: 'mid', depth: 0.45, haze: 0.2 },
  { id: 'near', depth: 0.75, haze: 0.06 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
];
const SCENE_SIGN_FONT = '600 {px}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SCENE_SIGN_DENY = ['underground', 'tfl', 'transport for london', 'johnston', 'mind the gap', 'oyster', 'roundel', 'london overground', 'elizabeth line', 'docklands light railway'];
const SCENE_SEASONS_4 = ['spring', 'summer', 'autumn', 'winter'];

function sceneHash(str) { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function sceneRnd(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const sceneD = {
  circ: (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`,
  ell: (x, y, rx, ry) => `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`,
  rect: (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`,
  poly: (pts) => 'M' + pts.map(p => p[0] + ' ' + p[1]).join('L') + 'z',
};

/* ---------- objects ---------- */
const _scObjs = new Map(), _scShapeMemo = new Map();
function sceneObjDefine(def) { if (!def || !/^[a-z]+\.[a-z0-9-]{1,40}$/.test(def.id || '')) throw new Error('sceneObjDefine: bad id ' + (def && def.id)); _scObjs.set(def.id, def); _scShapeMemo.clear(); return def; }
function sceneObj(id) { return _scObjs.get(id) || null; }
function sceneObjs() { return [..._scObjs.values()]; }
function _scSlot(def, season, slot) {
  const p = def.palette || {};
  return (p[season] && p[season][slot] != null) ? p[season][slot] : p.base ? p.base[slot] : undefined;
}
function _scPaint(def, season, paint) {
  if (paint == null) return null;
  if (typeof paint === 'string') {
    if (paint[0] !== '@') return paint;
    const m = /^@([a-zA-Z0-9_-]+)(?:\.(\d+))?$/.exec(paint), v = m ? _scSlot(def, season, m[1]) : null;
    if (v == null) return '#ff00ff';
    return Array.isArray(v) ? v[Math.min(v.length - 1, +(m[2] || 0))] : v;
  }
  const key = paint.lin ? 'lin' : 'rad';
  return Object.assign({}, paint, { [key]: paint[key].map(([o, c, op]) => [o, _scPaint(def, season, c), op == null ? 1 : op]) });
}
function _scBox(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k in parts) for (const sh of parts[k]) {
    const b = scenePathBox(sh.d, sh.m);
    if (!b) continue;
    const w = (sh.s && sh.w) ? sh.w / 2 : 0;
    x0 = Math.min(x0, b[0] - w); y0 = Math.min(y0, b[1] - w); x1 = Math.max(x1, b[2] + w); y1 = Math.max(y1, b[3] + w);
  }
  return isFinite(x0) ? [Math.floor(x0 - 2), Math.floor(y0 - 2), Math.ceil(x1 + 2), Math.ceil(y1 + 2)] : [-2, -2, 2, 2];
}
function sceneObjShapes(id, v, season) {
  const def = sceneObj(id);
  if (!def) return null;
  const vv = Math.max(0, Math.min((def.variants || 1) - 1, v | 0)), se = def.seasonal === false ? 'summer' : (season || 'summer');
  const key = id + '|' + vv + '|' + se;
  if (_scShapeMemo.has(key)) return _scShapeMemo.get(key);
  const raw = def.build(vv, sceneRnd(sceneHash(id + '|' + vv + (def.shapeBySeason ? '|' + se : ''))), { season: se, v: vv }) || {};
  const order = def.parts || Object.keys(raw), parts = {};
  for (const name of order) {
    parts[name] = (raw[name] || []).map(sh => {
      const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh;
      return { f: _scPaint(def, se, o.f), d: o.d, op: o.op == null ? 1 : o.op, s: o.s ? _scPaint(def, se, o.s) : null, w: o.w || 0, cap: o.cap || null, m: o.m || null, glow: o.glow || null, detail: !!o.detail };
    });
  }
  const anim = Object.entries(def.anim || {}).map(([kind, a]) => Object.assign({ kind, k: 1 }, a));
  const out = { box: def.box || _scBox(parts), parts, order, anim };
  _scShapeMemo.set(key, out);
  return out;
}

/* ---------- light, colour, wind ---------- */
const _scKits = new Map();
function sceneKit(name) {
  if (!_scKits.has(name)) _scKits.set(name, typeof ukNatureKit === 'function' && typeof animSceneKit === 'function' ? ukNatureKit(animSceneKit()) : null);
  return _scKits.get(name);
}
function sceneLight(o, view) {
  const K = sceneKit('light');
  if (K) return K.live(o || {}, view || {});
  return { live: false, alt: 30, az: 180, tod: 'day', phase: 'day', dark: 0, sun: { x: 900, y: 200, show: true, rel: 0 }, moon: { show: false, illum: 0 }, top: '#3a80c4', mid: '#98c4e4', low: '#eaeee6', lowSun: '#eaeee6', lowAway: '#dce9ef',
    light: '#fff0d4', shade: '#fff0dc', shadeOp: 0.03, haze: '#d6e2e6', cloud: ['#c0cfe0', '#f2f5f8', '#ffffff'], cover: 0.3, rain: false, snow: false, fog: false, wind: 1, stars: 0, lamps: false, windows: false,
    side: 1, shadow: { dx: 0.5, dy: 0.1, len: 1, gx: 1, gy: 0, op: 0.2 }, horizon: (view && view.horizon) || 560, fov: 80, heading: 180, water: (b) => b || ['#7fb0c0', '#3f7e96', '#1d4c64'] };
}
const _scHx = c => { let s = String(c).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const _scMix = (a, b, t) => { if (!t || !b) return a; const A = _scHx(a), B = _scHx(b), k = Math.max(0, Math.min(1, t)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const _scTones = new WeakMap();
function sceneTone(L) {
  if (!L) return c => c;
  let f = _scTones.get(L);
  if (f) return f;
  const K = sceneKit('obj'), memo = new Map();
  f = c => { let v = memo.get(c); if (v) return v; v = K ? K.toneStr(L, `fill="${c}"`).slice(6, -1) : c; memo.set(c, v); return v; };
  _scTones.set(L, f);
  return f;
}
function sceneColour(hex, o) {
  o = o || {};
  let c = hex;
  if (o.tint && o.tint[1]) c = _scMix(c, o.tint[0], o.tint[1]);
  if (o.haze) c = _scMix(c, o.hazeCol || (o.L ? o.L.haze : '#c9dbe0'), o.haze);
  return o.L ? sceneTone(o.L)(c) : c;
}
function sceneWind(t, x, L) {
  const w = L ? L.wind : 1;
  const base = 0.55 * Math.sin(0.9 * t + 0.0035 * x) + 0.3 * Math.sin(2.1 * t + 0.011 * x + 1.7) + 0.15 * Math.sin(5.3 * t + 0.031 * x);
  const gust = 0.8 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * (t - x / 420) / 9)), 6);
  return w * (base + gust);
}
function sceneScaleBucket(s) { return 2 ** (Math.round(Math.log2(Math.max(1e-3, s)) * 4) / 4); }
function sceneSeason(ms, lat, scene) {
  if (scene && scene.season && scene.season !== 'auto') return scene.season;
  if (!Number.isFinite(ms)) return 'summer';
  if (Math.abs(lat || 0) < 23.5) return (scene && scene.tropic) || 'summer';
  const m = new Date(ms).getUTCMonth(), n = m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  return lat < 0 ? { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[n] : n;
}
function sceneSignText(s) {
  const text = String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  if (!text || text.length > 40) return { ok: false, text, problem: 'length 1 to 40' };
  if (!/^[\p{L}\p{N} '&.,()\-\/]+$/u.test(text)) return { ok: false, text, problem: 'characters' };
  const low = text.toLowerCase(), bad = SCENE_SIGN_DENY.find(w => low.includes(w));
  return bad ? { ok: false, text, problem: 'deny-list: ' + bad } : { ok: true, text, problem: null };
}

/* ---------- compile (section 4) ---------- */
function _scInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function _scAreaBox(a) { if (a.rect) return a.rect; const xs = a.poly.map(p => p[0]), ys = a.poly.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
function _scInArea(x, y, a) { return a.rect ? x >= a.rect[0] && x <= a.rect[2] && y >= a.rect[1] && y <= a.rect[3] : _scInPoly(x, y, a.poly); }
function _scNoise(x, y, seed) {
  const h = (i, j) => (sceneHash(seed + ':' + i + ':' + j) % 1000) / 1000, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function _scLerpY(tab, y) { if (!tab || !tab.length) return 1; if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, s0] = tab[i - 1], [y1, s1] = tab[i]; return s0 + (s1 - s0) * (y - y0) / (y1 - y0); } return tab[tab.length - 1][1]; }
function _scPick(r, w) { if (typeof w === 'string') return w; if (Array.isArray(w)) return w[Math.floor(r() * w.length) % w.length]; const e = Object.entries(w), tot = e.reduce((n, [, k]) => n + k, 0); let x = r() * tot; for (const [id, k] of e) { if ((x -= k) <= 0) return id; } return e[e.length - 1][0]; }
function _scPathLen(path) { let n = 0; for (let i = 1; i < path.length; i++) n += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return n; }
function _scAnims(id, v, season, seed, over) {
  if (over === false) return [];
  const sh = sceneObjShapes(id, v, season);
  if (!sh) return [];
  const r = sceneRnd(seed * 7 + 3);
  return sh.anim.map(a => {
    const o = (over && over[a.kind]) || {};
    let k = o.k != null ? o.k : (a.k || 1);
    if (Array.isArray(k)) k = k[0] + r() * (k[1] - k[0]);
    return Object.assign({}, a, { phase: r(), k, period: a.period || { sway: 4, bob: 3, flap: 0.5, walk: 0.9, paddle: 2.4, turn: 6, flicker: 2, spin: 4 }[a.kind] || 3, pivot: a.pivot || [0, 0] });
  });
}
function _scGlowOn(id, v, season, seed) {
  const def = sceneObj(id), sh = sceneObjShapes(id, v, season);
  let n = 0;
  for (const p of sh.order) for (const s of sh.parts[p]) if (s.glow) n++;
  if (!n) return null;
  const r = sceneRnd(seed * 13 + 5), on = def.night && def.night.on != null ? def.night.on : 0.7, out = [];
  for (let i = 0; i < n; i++) out.push(r() < on);
  return out;
}
const _scCompiled = new WeakMap();
function sceneCompile(data, opt) {
  opt = opt || {};
  const season = opt.season || (data.season && data.season !== 'auto' ? data.season : 'summer'), lod = opt.lod == null ? 1 : opt.lod;
  const memoKey = season + '|' + lod;
  let m = _scCompiled.get(data);
  if (m && m.has(memoKey)) return m.get(memoKey);
  const layersIn = data.layers || SCENE_LAYERS_DEFAULT, layers = layersIn.map((l, i) => ({ id: l.id, i, depth: l.depth, haze: l.haze || 0 }));
  const li = id => { const l = layers.find(x => x.id === id); return l ? l.i : layers.length - 1; };
  const pal = (paint) => _scPaint({ palette: data.palette || {} }, season, paint);
  const items = [], strips = [];
  const hz = (i) => Math.round(layers[i].haze * 10) / 10;
  const push = (p, order) => {
    const def = sceneObj(p.obj);
    if (!def) return null;
    const v = Math.max(0, Math.min((def.variants || 1) - 1, p.variant | 0)), se = p.season || season, seed = p.seed | 0, L = li(p.layer);
    const sh = sceneObjShapes(p.obj, v, se);
    const it = { o: p.obj, v, x: p.x, y: p.y, s: p.s || 1, flip: !!p.flip && def.flippable !== false, layer: L, haze: hz(L),
      tint: p.tint ? [p.tint[0], Math.round(p.tint[1] / 0.08) * 0.08] : null, season: se, seed, z: p.y, order,
      strip: -1, anim: p.strip ? [] : _scAnims(p.obj, v, se, seed, p.anim), glowOn: _scGlowOn(p.obj, v, se, seed),
      shadow: p.shadow != null ? !!p.shadow : !!def.shadow, reflect: p.reflect != null ? !!p.reflect : !!def.reflect, lit: !!(sh && sh.parts.lit && sh.parts.lit.length) };
    items.push(it);
    return it;
  };
  let order = 0;
  for (const p of data.place || []) push(p, order++);
  (data.scatter || []).forEach((rule, ri) => {
    const r = sceneRnd(sceneHash(data.id + '|' + ri + '|' + (rule.seed | 0)));
    const box = _scAreaBox(rule.area), aw = box[2] - box[0], ah = box[3] - box[1];
    let n = rule.n != null ? rule.n : Math.round((rule.density || 1) * aw * ah / 10000);
    n = Math.min(3000, n);
    const keep = Math.max(0, Math.round(n * lod)), gap = rule.minGap || 0, cell = Math.max(4, gap), grid = new Map(), got = [];
    let tries = 0;
    while (got.length < n && tries++ < n * 12) {
      const x = box[0] + r() * aw, y = box[1] + r() * ah;
      if (!_scInArea(x, y, rule.area)) continue;
      const mk = rule.mask;
      if (mk && mk.avoid && mk.avoid.some(a => _scInArea(x, y, a))) continue;
      if (mk && mk.noise && _scNoise(x / mk.noise.scale, y / mk.noise.scale, rule.seed | 0) < mk.noise.cut) continue;
      if (gap) {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        let ok = true;
        for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) for (const q of grid.get((gx + i) + ',' + (gy + j)) || []) if (Math.hypot(q[0] - x, q[1] - y) < gap) { ok = false; break; }
        if (!ok) continue;
        const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push([x, y]);
      }
      const obj = _scPick(r, rule.obj), def = sceneObj(obj);
      const s0 = Array.isArray(rule.s) ? rule.s[0] + r() * (rule.s[1] - rule.s[0]) : (rule.s || 1);
      const vv = rule.variant === 'random' || rule.variant == null ? Math.floor(r() * ((def && def.variants) || 1)) : Array.isArray(rule.variant) ? rule.variant[0] + Math.floor(r() * (rule.variant[1] - rule.variant[0] + 1)) : rule.variant;
      const tk = rule.tint ? [rule.tint.col, rule.tint.k[0] + r() * (rule.tint.k[1] - rule.tint.k[0])] : null;
      got.push({ obj, x: Math.round(x), y: Math.round(y), s: Math.round(s0 * _scLerpY(rule.sByY, y) * 100) / 100, flip: r() < (rule.flip == null ? 0.5 : rule.flip), variant: vv, layer: rule.layer, seed: Math.floor(r() * 1e6), tint: tk,
        strip: rule.anim === 'strip', anim: rule.anim === 'strip' ? false : rule.anim });
    }
    const pick = sceneRnd(sceneHash(data.id + '|lod|' + ri)), kept = got.filter(() => true).map(g => [pick(), g]).sort((a, b) => a[0] - b[0]).slice(0, keep).map(x => x[1]);
    const made = kept.map(p => push(p, order++)).filter(Boolean);
    if (rule.anim === 'strip' && made.length) {
      const w = 140, byCol = new Map();
      for (const it of made) { const c = Math.floor((it.x + 160) / w); (byCol.get(c) || byCol.set(c, []).get(c)).push(it); }
      for (const [c, list] of byCol) strips.push({ layer: li(rule.layer), x0: -160 + c * w, x1: -160 + (c + 1) * w, y0: Math.min(...list.map(i => i.y)), y1: Math.max(...list.map(i => i.y)), items: list, amp: rule.amp || 1 });
    }
  });
  items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.order - b.order);
  items.forEach(it => { delete it.order; });
  strips.forEach((st, si) => { st.items = st.items.map(it => { it.strip = si; return items.indexOf(it); }); });
  const actors = (data.actors || []).map((a, i) => {
    const def = sceneObj(a.obj); if (!def) return null;
    const v = a.variant | 0, seed = a.seed != null ? a.seed : i + 1;
    return { o: a.obj, v, layer: li(a.layer), path: a.path, len: _scPathLen(a.path), speed: a.speed || 20, loop: a.loop || 'pingpong', s: a.s || 1,
      sByY: a.sByY === true ? [[500, 0.5], [900, 1.2]] : a.sByY || null, seed, offset: a.offset != null ? a.offset : sceneRnd(seed)(), anim: _scAnims(a.obj, v, season, seed, a.anim) };
  }).filter(Boolean);
  const flocks = (data.flocks || []).map((f, i) => ({ o: f.obj, n: f.n || 5, area: f.area, speed: f.speed || 30, s: f.s || 0.5, seed: f.seed != null ? f.seed : i + 1, layer: li(f.layer || 'far') }));
  const signs = (data.signage ? data.signs || [] : []).slice(0, 6).map((s, i) => ({ layer: li(s.layer), x: s.x, y: s.y, w: s.w, h: s.h, text: sceneSignText(s.text).text, bars: (s.bars || []).slice(0, 6), style: s.style || 'board', ink: s.ink || '#1d2226', board: s.board || '#f4f1e8', seed: i }));
  const ground = (data.ground || []).map(g => ({ layer: li(g.layer), d: g.d, fill: pal(g.fill) }));
  const water = (data.water || []).map(w => ({ layer: li(w.layer), d: w.d, y0: w.y0, y1: w.y1, base: w.base || ['#7fb0c0', '#3f7e96', '#1d4c64'], reflect: !!w.reflect, shimmer: w.shimmer || 0, lightPath: !!w.lightPath }));
  const sky = data.sky === false ? null : Object.assign({ stars: 180, sunR: 26, moonR: 20 }, data.sky || {}, { clouds: Object.assign({ n: 4, y: [60, 320], speed: 6 }, (data.sky && data.sky.clouds) || {}) });
  if (sky) { sky.clouds = { n: sky.clouds.n, y0: sky.clouds.y[0], y1: sky.clouds.y[1], speed: sky.clouds.speed }; }
  const pk = data.particles === 'none' ? 'none' : data.particles && typeof data.particles === 'object' ? data.particles.kind : { spring: 'petals', summer: 'motes', autumn: 'leaves', winter: 'snow' }[season];
  const animatedParts = items.reduce((n, it) => n + it.anim.reduce((m, a) => m + (a.parts ? a.parts.length : 1), 0), 0);
  const actorParts = actors.reduce((n, a) => n + 1 + a.anim.length, 0), flockBirds = flocks.reduce((n, f) => n + f.n, 0);
  const objects = {}, categories = {};
  for (const it of items) { objects[it.o] = (objects[it.o] || 0) + 1; const c = (sceneObj(it.o).category || 'prop'); categories[c] = (categories[c] || 0) + 1; }
  const used = new Set([...items.map(i => i.layer), ...ground.map(g => g.layer), ...water.map(w => w.layer)]);
  const C = { v: 1, id: data.id, w: SCENE_W, h: SCENE_H, season, lod, setting: data.setting || 'natural', arch: data.arch || null,
    view: Object.assign({ heading: 180, fov: 80, horizon: 560, lift: 1 }, data.view), sky, layers, ground, water, items, strips, actors, flocks, signs,
    particles: { kind: pk || 'none', n: pk === 'none' ? 0 : (data.particles && data.particles.n) || 60 }, camera: Object.assign({ pan: 0, period: 90 }, data.camera || {}),
    stats: { placements: items.length, staticItems: items.filter(i => !i.anim.length && i.strip < 0).length, animatedParts, stripItems: items.filter(i => i.strip >= 0).length, strips: strips.length,
      actors: actors.length, flockBirds, signs: signs.length, animatedDraws: animatedParts + strips.length + actorParts + flockBirds, objects, categories, layersUsed: used.size,
      distinctSprites: new Set(items.map(i => [i.o, i.v, i.season, i.haze, i.tint ? i.tint[1] : 0, sceneScaleBucket(i.s)].join('|'))).size, dataBytes: JSON.stringify(data).length } };
  if (!m) { m = new Map(); _scCompiled.set(data, m); }
  m.set(memoKey, C);
  return C;
}
const _scDataMemo = new WeakMap();
function sceneData(x) {
  const s = x && x.scene !== undefined ? x.scene : x;
  if (typeof s !== 'function') return s;
  if (!_scDataMemo.has(s)) _scDataMemo.set(s, s());
  return _scDataMemo.get(s);
}
function sceneItem(meta, data) {
  const d0 = typeof data === 'function' ? null : data;
  const item = Object.assign({}, meta, { slot: meta.slot || 'opening', full: true, rich: true, composed: true, scene: data,
    season: 'any', theme: meta.theme || 'any', intensity: meta.intensity || 'standard', reduced: 'static' });
  if (d0) item.liveSky = { lat: d0.view.lat, lon: d0.view.lon };
  item.svg = (o) => sceneSvg(data, o);
  return item;
}
