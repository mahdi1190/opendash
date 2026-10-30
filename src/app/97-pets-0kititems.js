/* ============================================================
   PETS, custom accessories (2.22), the pure part. A DESIGN IS DATA, NOT MARKUP: a list of shapes (path data in a fixed
   frame, colour slots), checked here and drawn by 97-pets-0kitdraw.js (petItemShapes). Nothing in a design can load,
   run or fetch anything: it is numbers, path letters and '#rrggbb'. The assistant draws them (lib/pet-ai.mjs), a friend
   can send them (kind 'pet:items'), a share code can carry them: every route in goes through petItemClean, which REJECTS
   what it does not accept and never repairs it. PURE: no DOM, no state; lib/profile-pets.mjs evaluates this file with the
   kit so the server checks exactly what the page draws.

     PET_ITEM                       limits (shapes, path size, labels, colours, how many saved and worn)
     PET_ITEM_SLOTS                 [[slot, label, look field]]: head (hair, hats, horns), face (glasses, masks, moustaches), neck
     petItemClean(raw, o)           {ok, item, errors}: a clean design from anything. o.id gives the id
     petItemWire(item)              the design without your description (what a share code carries)
     petItemFriendWire(item, species)  what friends get: the same, with the fit chosen for the sender's species
     petItemSig(item)              a short signature of the drawing (cache keys, change detection)
     petItemFitOf(item, species)    the nudge in force: {dx, dy, s, rot} (the species' own, else the design's)
     petItemCovers(item, points)    which points of the design's frame lie under a filled, mostly opaque shape ([bool])
     petItemPathSegs(d)             a path as absolute segments [['M',x,y],['L',x,y],['C',x1,y1,x2,y2,x,y],['Q',x1,y1,x,y],['Z']] | null

   THE FRAMES (what the assistant is told, in the pet's own proportions):
     head and face   origin at the centre of the pet's head, +x towards the face (it looks right), +y down, the head is a
                     circle of radius 50 (so the crown is at y = -50), whatever the species
     neck            origin at the middle of the collar line, +y down, 100 = the collar's width
   Every coordinate may reach +-PET_ITEM.bound, so a design can never grow far past the pet (it is also drawn inside the
   pet's own box).

   A shape: {p (path), f? (fill), s? (stroke), w? (stroke width), o? (opacity)}. A colour reference is k1, k2, k3 (the design's
   colours, as listed in cols), with a tone: k1 (base), k1s (shade), k1l (light), k1d (deep); w (white) and i (ink).
   ============================================================ */
const PET_ITEM = Object.freeze({ maxShapes: 40, maxPath: 900, maxPaths: 4000, maxPoints: 120, maxLabel: 32, maxAbout: 200, maxCols: 3, maxSaved: 12, bound: 200,
  fit: Object.freeze({ dx: 80, dy: 80, smin: 0.4, smax: 2.2, rot: 60 }) });
const PET_ITEM_SLOTS = Object.freeze([['head', 'Head', 'itemHead'], ['face', 'Face', 'itemFace'], ['neck', 'Neck', 'itemNeck']]);
const _PIT_REF = /^(?:k[1-3][sld]?|w|i)$/;
const _PIT_OK = new WeakSet();       // designs that went through petItemClean (the drawing trusts these, and re-checks others)
const _PIT_SIG = new WeakMap();
const _pitR = (v) => { const r = Math.round(v * 10) / 10; return r === 0 ? 0 : r; };

/**
 * A path as absolute segments, or null. Allowed: M L H V C S Q T Z (either case), numbers only; NO arcs. Every point
 * (after relative moves are added up) must lie within +-bound, and there are at most PET_ITEM.maxPoints of them. H, V, S and T
 * become L, L, C and Q, so what comes out is one small vocabulary (M L C Q Z, absolute, one decimal).
 */
function petItemPathSegs(d, bound) {
  bound = bound || PET_ITEM.bound;
  if (typeof d !== 'string' || !d.trim() || d.length > PET_ITEM.maxPath) return null;
  const TOK = /[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  if (d.replace(TOK, '').replace(/[\s,]+/g, '') !== '') return null;
  const toks = d.match(TOK) || [];
  const ARGS = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, Z: 0 };
  const isCmd = (t) => /^[A-Za-z]$/.test(t);
  const segs = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, pts = 0, first = true, lc = null, lq = null;
  while (i < toks.length) {
    if (isCmd(toks[i])) {
      cmd = toks[i++];
      if (first && cmd !== 'M' && cmd !== 'm') return null;
      if (cmd === 'Z' || cmd === 'z') { segs.push(['Z']); x = sx; y = sy; lc = lq = null; continue; }
    } else if (!cmd || cmd === 'Z' || cmd === 'z') return null;
    first = false;
    const U = cmd.toUpperCase(), rel = cmd !== U, n = ARGS[U];
    if (i + n > toks.length) return null;
    const a = [];
    for (let k = 0; k < n; k++) { if (isCmd(toks[i + k])) return null; a.push(Number(toks[i + k])); }
    i += n;
    const X = (v) => (rel ? x + v : v), Y = (v) => (rel ? y + v : v);
    let seg, nlc = null, nlq = null;
    if (U === 'M') seg = ['M', X(a[0]), Y(a[1])];
    else if (U === 'L') seg = ['L', X(a[0]), Y(a[1])];
    else if (U === 'H') seg = ['L', X(a[0]), y];
    else if (U === 'V') seg = ['L', x, Y(a[0])];
    else if (U === 'Q') { seg = ['Q', X(a[0]), Y(a[1]), X(a[2]), Y(a[3])]; nlq = [seg[1], seg[2]]; }
    else if (U === 'T') { const c = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y]; seg = ['Q', c[0], c[1], X(a[0]), Y(a[1])]; nlq = c; }
    else if (U === 'C') { seg = ['C', X(a[0]), Y(a[1]), X(a[2]), Y(a[3]), X(a[4]), Y(a[5])]; nlc = [seg[3], seg[4]]; }
    else { const c = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; seg = ['C', c[0], c[1], X(a[0]), Y(a[1]), X(a[2]), Y(a[3])]; nlc = [seg[3], seg[4]]; }   // S
    for (let k = 1; k < seg.length; k++) if (!Number.isFinite(seg[k]) || Math.abs(seg[k]) > bound) return null;
    pts += (seg.length - 1) / 2;
    if (pts > PET_ITEM.maxPoints) return null;
    x = seg[seg.length - 2]; y = seg[seg.length - 1]; lc = nlc; lq = nlq;
    if (U === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }   // more pairs after M are lineto
    segs.push(seg.map((v, k) => (k ? _pitR(v) : v)));
  }
  return segs.length ? segs : null;
}
function _pitSegsStr(segs) { return segs.map(s => s[0] + s.slice(1).join(' ')).join(''); }

function _pitFit(f) {
  f = f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v * 100) / 100)) : d; };
  const L = PET_ITEM.fit;
  return { dx: num(f.dx, -L.dx, L.dx, 0), dy: num(f.dy, -L.dy, L.dy, 0), s: num(f.s, L.smin, L.smax, 1), rot: num(f.rot, -L.rot, L.rot, 0) };
}

/** A clean design from anything. {ok, item, errors}: item is null unless ok. Never throws. */
function petItemClean(raw, o) {
  o = o || {};
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, item: null, errors: ['That is not an accessory.'] };
  const id = typeof o.id === 'string' ? o.id : raw.id;
  if (typeof id !== 'string' || !_PT_ITEM_ID.test(id)) errors.push('The accessory has no valid id.');
  const slot = typeof raw.slot === 'string' && PET_ITEM_SLOTS.some(s => s[0] === raw.slot) ? raw.slot : '';
  if (!slot) errors.push('The slot must be head, face or neck.');
  const cols = [];
  if (!Array.isArray(raw.cols) || !raw.cols.length || raw.cols.length > PET_ITEM.maxCols) errors.push(`Give 1 to ${PET_ITEM.maxCols} colours.`);
  else for (const c of raw.cols) { if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) cols.push(c.toLowerCase()); else { errors.push('Colours must look like #3b74d6.'); break; } }
  const shapes = [];
  let chars = 0;
  if (!Array.isArray(raw.shapes) || !raw.shapes.length) errors.push('The accessory has no shapes.');
  else if (raw.shapes.length > PET_ITEM.maxShapes) errors.push(`At most ${PET_ITEM.maxShapes} shapes.`);
  else {
    for (let i = 0; i < raw.shapes.length; i++) {
      const s = raw.shapes[i], at = `Shape ${i + 1}`;
      if (!s || typeof s !== 'object' || Array.isArray(s)) { errors.push(`${at} is not a shape.`); break; }
      const segs = petItemPathSegs(s.p);
      if (!segs) { errors.push(`${at}: the path is not allowed (letters M L H V C S Q T Z and numbers only, within bounds).`); break; }
      const out = { p: _pitSegsStr(segs) };
      let bad = '';
      for (const k of ['f', 's']) {
        const v = s[k];
        if (v == null || v === '' || v === 'none') continue;   // "no fill" / "no stroke" written out is the same as leaving it out
        const m = typeof v === 'string' && _PIT_REF.test(v) ? /^k([1-3])/.exec(v) : null;
        if (typeof v !== 'string' || !_PIT_REF.test(v) || (m && Number(m[1]) > cols.length)) bad = `${at}: "${String(v).slice(0, 12)}" is not a colour of this accessory.`;
        else out[k] = v;
      }
      if (!bad && !out.f && !out.s) bad = `${at} has neither a fill nor a stroke.`;
      if (!bad && s.w != null) { const w = Number(s.w); if (w >= 0.4 && w <= 14) out.w = _pitR(w); else bad = `${at}: stroke width must be 0.4 to 14.`; }
      else if (!bad && out.s) out.w = 2;
      if (!bad && s.o != null) { const op = Number(s.o); if (op >= 0.1 && op <= 1) out.o = Math.round(op * 100) / 100; else bad = `${at}: opacity must be 0.1 to 1.`; }
      if (bad) { errors.push(bad); break; }
      chars += out.p.length;
      shapes.push(out);
    }
    if (!errors.length && chars > PET_ITEM.maxPaths) errors.push('The drawing is too detailed.');
  }
  if (errors.length) return { ok: false, item: null, errors };
  const item = { v: 1, id, label: petText(raw.label, PET_ITEM.maxLabel) || 'My design', slot, cols, shapes, fit: _pitFit(raw.fit) };
  const about = petText(raw.about, PET_ITEM.maxAbout);
  if (about) item.about = about;
  if (raw.fitBy && typeof raw.fitBy === 'object' && !Array.isArray(raw.fitBy)) {
    const fb = {};
    for (const k of Object.keys(raw.fitBy).slice(0, 24)) if (petSpecies(k)) fb[k] = _pitFit(raw.fitBy[k]);
    if (Object.keys(fb).length) item.fitBy = fb;
  }
  _PIT_OK.add(item);
  return { ok: true, item, errors: [] };
}
/** The design as friends get it: everything but your description. */
function petItemWire(item) {
  if (!item) return null;
  const w = { v: 1, id: item.id, label: item.label, slot: item.slot, cols: item.cols.slice(), shapes: item.shapes.map(s => Object.assign({}, s)), fit: Object.assign({}, item.fit) };
  if (item.fitBy) w.fitBy = JSON.parse(JSON.stringify(item.fitBy));
  return w;
}
/** Is p = [x, y] inside the polygon (nonzero winding)? A point exactly on an edge may go either way. */
function _pitWinding(poly, p) {
  let w = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if (a[1] <= p[1]) { if (b[1] > p[1] && (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]) > 0) w++; }
    else if (b[1] <= p[1] && (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]) < 0) w--;
  }
  return w;
}
/**
 * Which of the points (in the design's own frame) lie under a filled, mostly opaque shape of the design (opacity 0.6 or more;
 * strokes and see-through lenses do not count). Curves are flattened into 8 steps; every closed piece of a shape counts, as a
 * fill would draw them. Used to catch a wig or hat that hides the pet's eyes (lib/pet-ai.mjs).
 */
function petItemCovers(item, points) {
  const hit = points.map(() => false);
  if (!item || !Array.isArray(item.shapes)) return hit;
  for (const sh of item.shapes) {
    if (!sh.f || (sh.o != null && sh.o < 0.6)) continue;
    const segs = petItemPathSegs(sh.p);
    if (!segs) continue;
    const polys = [];
    let poly = [], cx = 0, cy = 0;
    const flush = () => { if (poly.length > 2) polys.push(poly); poly = []; };
    for (const s of segs) {
      if (s[0] === 'M') { flush(); poly = [[s[1], s[2]]]; cx = s[1]; cy = s[2]; }
      else if (s[0] === 'L') { poly.push([s[1], s[2]]); cx = s[1]; cy = s[2]; }
      else if (s[0] === 'Q') {
        for (let t = 1; t <= 8; t++) { const u = t / 8, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u; poly.push([a * cx + b * s[1] + c * s[3], a * cy + b * s[2] + c * s[4]]); }
        cx = s[3]; cy = s[4];
      } else if (s[0] === 'C') {
        for (let t = 1; t <= 8; t++) { const u = t / 8, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; poly.push([a * cx + b * s[1] + c * s[3] + d * s[5], a * cy + b * s[2] + c * s[4] + d * s[6]]); }
        cx = s[5]; cy = s[6];
      } else if (s[0] === 'Z') { const first = poly[0]; flush(); if (first) { cx = first[0]; cy = first[1]; } }
    }
    flush();
    points.forEach((p, i) => { if (!hit[i]) { let w = 0; for (const pg of polys) w += _pitWinding(pg, p); if (w !== 0) hit[i] = true; } });
  }
  return hit;
}
/** The design as a friend gets it: no description, and the fit already chosen for the sender's species (so no fitBy). */
function petItemFriendWire(item, species) {
  const w = petItemWire(item);
  if (!w) return null;
  w.fit = petItemFitOf(item, species);
  delete w.fitBy;
  return w;
}
/** A short signature of the drawing (not of the label or description): changes whenever what is drawn changes. */
function petItemSig(item) {
  if (!item || typeof item !== 'object') return '';
  let g = _PIT_SIG.get(item);
  if (g !== undefined) return g;
  let h = 2166136261;
  const s = JSON.stringify([item.id, item.slot, item.cols, item.shapes, item.fit, item.fitBy || null]);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  g = (h >>> 0).toString(36);
  _PIT_SIG.set(item, g);
  return g;
}
/** The nudge in force for a species: its own entry in fitBy, else the design's. */
function petItemFitOf(item, species) {
  const f = item && item.fitBy && item.fitBy[species] ? item.fitBy[species] : item && item.fit;
  return _pitFit(f);
}
/** A clean design for drawing: the design itself when it went through petItemClean, else a cleaned copy (null when it is not acceptable). */
function petItemTrusted(item) {
  if (!item || typeof item !== 'object') return null;
  if (_PIT_OK.has(item)) return item;
  const r = petItemClean(item);
  return r.ok ? r.item : null;
}
