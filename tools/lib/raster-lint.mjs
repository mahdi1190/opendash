// object lint for RASTER objects (docs/dev/OBJECT_IMPORT.md "Lint"). Called by tools/lib/scene-lint.mjs lintObject for kind 'raster'.
//
// FAIL: identity, unique, size (4 to 2000 units), files (every image's bytes are there and decode), transparency (the base has a
//       transparent background), bytes (an image over SCENE_RASTER_BUDGET.imageKB.max, an object over objectKB.max), pixels (a
//       side over maxSide), anim (every hook's part exists and pivots inside the box), frames (2 to 6), tags (kit and role, or
//       the landmark tags)
// WARN: bytes over the warn budgets, density (pixels per world unit outside .5 to 3: blurry or wasted), palette (the share of
//       pixels near the house palette under .35), text (lettering-like rows: no text or logos), night (a building, vehicle,
//       boat, structure or landmark without a lit part or a night image: tag it unlit), webp (passed through unprocessed)
import { pngDecode, isPng, isWebp } from './png.mjs';
import { paletteScore, textScore, alphaStats } from './raster-image.mjs';

const ID_RE = /^[a-z]+\.[a-z0-9-]{1,40}$/;
const LIT_CATS = ['building', 'vehicle', 'boat', 'structure', 'landmark', 'rail'];
const r2 = (v) => Math.round(v * 100) / 100;

/** The house palette: the commonest hex colours of the vector library (memoised per engine). */
export function housePalette(E, max = 400) {
  if (E._house) return E._house;
  const n = new Map();
  const add = (c) => { if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) n.set(c.toLowerCase(), (n.get(c.toLowerCase()) || 0) + 1); };
  for (const d of (typeof E.objs === 'function' ? E.objs() : [])) {
    if (d.kind === 'raster' || !d.palette) continue;
    for (const season of Object.values(d.palette)) for (const v of Object.values(season || {})) [].concat(v).forEach(add);
  }
  E._house = [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([c]) => c);
  return E._house;
}
function bytesOf(E, key) {
  const url = typeof E.rasterUrl === 'function' ? E.rasterUrl(key) : null;
  if (!url) return null;
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}
export function lintRasterObject(id, { E, thresholds = {}, rule }) {
  const O = thresholds.object || {}, d = E.obj(id), rules = [];
  const add = (name, ok, value, limit, message, warn = false) => rules.push(Object.assign(rule('object', name, ok, value, limit, message), warn ? { warn: true, ok: true, note: ok ? '' : message } : {}));
  const B = E.rasterBudget || { imageKB: { warn: 96, max: 256 }, objectKB: { warn: 192, max: 512 }, maxSide: 1024 };
  const cats = E.categories || [];
  add('identity', ID_RE.test(id) && (!cats.length || cats.includes(d.category)) && id.split('.')[0] === d.category, id, '<category>.<name>, a known category', `${id}: the id must be <category>.<name> and match its category (${d.category})`);
  const dupes = typeof E.dups === 'function' ? E.dups().filter(x => x === id).length : 0;
  add('unique', !dupes, dupes ? `defined ${dupes + 1} times` : 'once', 'one definition', `${id} is defined ${dupes + 1} times: one meta.json per id`);
  const [smin, smax] = O.size || [4, 2000];
  add('size', Array.isArray(d.size) && d.size.every(v => v >= smin && v <= smax), (d.size || []).join(' x '), `${smin} to ${smax}`, `size [w, h] within ${smin} to ${smax} units`);
  const keys = typeof E.rasterKeys === 'function' ? E.rasterKeys(id) : [];
  const stats = { variants: d.variants || 1, shapes: 0, glow: 0, lit: false, parts: [], anim: [], images: keys.length, bytes: 0, kind: 'raster' };
  let missing = [], bad = [], big = [], warnBig = [], sides = [], webp = 0, density = [];
  const base = new Map();
  for (const key of keys) {
    const buf = bytesOf(E, key);
    if (!buf) { missing.push(key); continue; }
    stats.bytes += buf.length;
    const kb = buf.length / 1024;
    if (kb > B.imageKB.max) big.push(`${key} ${Math.round(kb)} KB`); else if (kb > B.imageKB.warn) warnBig.push(`${key} ${Math.round(kb)} KB`);
    if (isWebp(buf)) { webp++; continue; }
    if (!isPng(buf)) { bad.push(key); continue; }
    try {
      const img = pngDecode(buf);
      if (Math.max(img.width, img.height) > B.maxSide) sides.push(`${key} ${img.width} x ${img.height}`);
      base.set(key, img);
    } catch (e) { bad.push(`${key} (${e.message})`); }
  }
  add('files', !missing.length && !bad.length, missing.length ? `missing ${missing.length}` : bad.length ? `bad ${bad.length}` : `${keys.length} images`, 'every image present and readable', `images missing or unreadable: ${missing.concat(bad).join(', ')} (re-run object import, or rebuild the library file: the meta.json names them)`);
  const v0 = d.raster.images[0], b0 = base.get(v0.base);
  if (b0) {
    const a = alphaStats(b0);
    add('transparency', a.transparent >= 0.02, `${Math.round(a.transparent * 100)} % clear`, 'a transparent background (>= 2 %)', 'the base image has no transparent background: remove it (object import does it for a flat background)');
    const [w, h] = d.size || [1, 1], dens = Math.max(b0.width / w, b0.height / h);
    density.push(dens);
    add('density', dens >= 0.5 && dens <= 3, `${r2(dens)} px/unit`, '0.5 to 3 pixels per world unit', dens < 0.5 ? 'the image is small for its size: it will look blurred near the front (import a larger image or a smaller --size)' : 'more pixels than a scene ever shows: re-import with a lower --res (bytes)', true);
    const pal = housePalette(E);
    if (pal.length) { const s = paletteScore(b0, pal); stats.palette = s; add('palette', s >= 0.35, s, '>= 0.35 near the house palette', `only ${Math.round(s * 100)} % of the pixels are near the house palette: consider --palette 0.3 on import (a warning)`, true); }
    const t = textScore(b0);
    add('text', !t.rows, t.rows ? `${t.rows} lettering-like row(s)` : 'none', 'no text, logos or lettering', 'lettering-like marks found: no text, signs with words, logos or brands (8.4); repaint them as plain shapes', true);
  } else if (!webp) add('transparency', false, 'unreadable', 'a readable base image', 'the base image could not be read');
  add('bytes', !big.length && stats.bytes / 1024 <= B.objectKB.max, `${Math.round(stats.bytes / 1024)} KB`, `<= ${B.imageKB.max} KB an image, ${B.objectKB.max} KB an object`, `too large: ${big.join(', ') || Math.round(stats.bytes / 1024) + ' KB in all'} (re-import with a lower --res or a smaller --size)`);
  if (warnBig.length || stats.bytes / 1024 > B.objectKB.warn) add('bytesWarn', false, `${Math.round(stats.bytes / 1024)} KB`, `<= ${B.imageKB.warn} KB an image, ${B.objectKB.warn} KB an object`, `over the warn budget: ${warnBig.join(', ') || Math.round(stats.bytes / 1024) + ' KB in all'}`, true);
  add('pixels', !sides.length, sides.length ? sides.join(', ') : 'ok', `<= ${B.maxSide} px a side`, `an image is over ${B.maxSide} px a side: ${sides.join(', ')}`);
  if (webp) add('webp', false, `${webp} WebP`, 'PNG', 'WebP images are passed through unprocessed (no trim, scale or transparency check): prefer PNG', true);
  const R0 = (() => { try { return E.shapes(id, 0, 'summer'); } catch { return null; } })();
  if (R0) {
    stats.parts = R0.order; stats.anim = (R0.anim || []).map(a => a.kind); stats.lit = !!(R0.parts.lit && R0.parts.lit.length);
    stats.shapes = R0.order.reduce((n, p) => n + (R0.parts[p] || []).length, 0);
    const box = R0.box;
    const badHooks = (R0.anim || []).filter(a => { const parts = a.parts || (a.part && a.part !== '*' ? [a.part] : []); const pv = a.pivot || [0, 0]; return parts.some(p => !R0.parts[p]) || pv[0] < box[0] - 2 || pv[0] > box[2] + 2 || pv[1] < box[1] - 2 || pv[1] > box[3] + 2; });
    add('anim', !badHooks.length, badHooks.length ? badHooks.map(a => a.kind).join(', ') : (R0.anim || []).length, 'every hook\'s part exists, its pivot inside the box', 'a hook names a missing part or pivots outside the box');
  }
  const fr = d.raster.frames;
  if (fr) add('frames', fr.images.length >= 2 && fr.images.length <= 6, fr.images.length, '2 to 6 frames', 'a frames animation needs 2 to 6 frames');
  const t = d.tags || [], kits = E.kits || [], roles = E.roles || [];
  if (d.category !== 'landmark') {
    const kitTags = t.filter(x => x.startsWith('kit:')), roleTags = t.filter(x => x.startsWith('role:'));
    const ok = kitTags.length >= 1 && (!kits.length || kitTags.every(k => kits.includes(k.slice(4)))) && roleTags.length === 1 && (!roles.length || roles.includes(roleTags[0].slice(5)));
    add('tags', ok, `${kitTags.join(' ') || 'no kit'} ${roleTags.join(' ') || 'no role'}`, 'at least one kit:<kit>, exactly one role:<role>', 'tags: at least one kit:<kit> from SCENE_KITS and exactly one role:<role> from SCENE_ROLES (import with --kit and --role)');
  } else {
    add('landmarkTags', t.includes('landmark') && t.some(x => /^place:[a-z0-9-]+\/.+/.test(x)), t.join(' '), 'landmark, place:<region>/<key>', 'tags landmark and place:<region>/<key> (import with --tags)');
    add('landmarkFlip', d.flippable === false, String(d.flippable !== false), 'flippable: false', 'a landmark is never mirrored: flippable: false');
  }
  if (LIT_CATS.includes(d.category) && !t.includes('unlit') && !t.includes('natural')) {
    const night = stats.lit || d.raster.images.some(v => v.night || v.lit || v.mask_lit);
    add('night', night, night ? 'lit' : 'none', 'a lit part or a night image (or tag unlit)', 'no night look: no lit windows were found and there is no night or lit image (a sheet\'s night and lit columns, mask_lit, or tag the object unlit)', true);
  }
  return { id, pass: rules.every(r => r.ok), rules, stats };
}
