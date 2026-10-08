// The composition lint (docs/dev/SCENE_ENGINE_V2.md 20.2 and 20.4; builder G). Node >= 20, no dependencies, no I/O apart from
// reading src/app/70-scene-1camera.js once when the engine bundle does not carry it.
//
//   compositionRules(C, data, { pack, siblings, thresholds, strict, E, reg, ref }) -> [Rule]   the group 'composition' (wired by
//       tools/lib/scene-lint.mjs, builder D, through a dynamic import). Rule = { group, rule, ok, value, limit, message, warn?, sev }:
//       a WARNING is ok with its text in `warn` (the v1 lint's convention); with strict (--strict-placement) it is a failure (ok false).
//       Rules: thirds, leadingLine (presets that want one, and v1 scenes), waterShare (across-water), framing (presets that want it),
//       skyShare, subjectSize, horizonVariety (the pack), tooSimilar (the pack).
//       siblings: the pack's other scenes as [{ ref, fp }] or [{ ref, C, data }] or [{ ref, data }]; or give `reg` + `pack` and they are
//       found and fingerprinted here (memoised per registry and pack).
//   compositionMeasures(C, data, { E, compositionOf }) -> the measures of sceneCompositionOf (70-scene-1camera.js)
//   compositionFingerprint(m, data, ref)        -> { ref, preset, horizon, horizonBucket, headingClass, third, grid: [...], kinds, series }
//   fingerprintSimilarity(a, b)                 -> { sim, cos, shared: ['preset', ...] }   0..1; tooSimilar above thresholds.similar (0.9)
//   horizonSpread(rows)                         -> the standard deviation of horizon rows
//   COMPOSITION_DEFAULTS                        the designed thresholds (anim-quality.json composed.composition overrides them)
//   cameraModule(root)                          -> { SCENE_CAMERA_PRESETS, sceneCameraPreset, sceneCompositionOf } evaluated from the file
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const r3 = (v) => Math.round(v * 1000) / 1000;
const pctS = (v) => `${Math.round(v * 100)} %`;

/** The designed thresholds (V2 20.2, 20.4). Fractions of the frame unless said otherwise. */
export const COMPOSITION_DEFAULTS = Object.freeze({
  designed: true,
  thirds: { maxDist: 0.08, central: [0.45, 0.55] },
  leadingLine: { maxDist: 0.15 },
  framing: { one: [0.08, 0.25], both: [0.25, 0.40] },
  skyShare: { default: [0.22, 0.45], wide: [0.30, 0.50], closeUp: [0.10, 0.35] },
  subjectSize: { default: [0.18, 0.45], closeUp: [0.35, 0.60] },
  horizonVariety: { minStd: 40, minScenes: 3 },
  tooSimilar: { similar: 0.9 },
});
const SKY_BY_PRESET = { 'from-hill': 'wide', panorama: 'wide', 'close-up': 'closeUp' };

/* ---------------------------------------------------------------------------------------------
   The camera module (70-scene-1camera.js) when the engine bundle does not carry it
   --------------------------------------------------------------------------------------------- */
const _modules = new Map();
export function cameraModule(root = ROOT) {
  if (_modules.has(root)) return _modules.get(root);
  const file = join(root, 'src', 'app', '70-scene-1camera.js');
  if (!existsSync(file)) throw new Error(`no ${file} (builder G's camera presets)`);
  const fn = new vm.Script(`(function () {\n${readFileSync(file, 'utf8')}\nreturn { SCENE_CAMERA_PRESETS, sceneCameraPreset, sceneCompositionOf, sceneCompositionSetups };\n})`, { filename: '70-scene-1camera.js' }).runInThisContext();
  const m = fn();
  _modules.set(root, m);
  return m;
}
function compositionOfFn(E, opts = {}) {
  if (typeof opts.compositionOf === 'function') return opts.compositionOf;
  const get = E && E.get ? E.get : E && E._reg && E._reg.R ? E._reg.R.get : null;
  const fromBundle = get ? get('sceneCompositionOf') : null;
  if (typeof fromBundle === 'function') return fromBundle;
  if (opts.reg && opts.reg.R && typeof opts.reg.R.get === 'function') { const f = opts.reg.R.get('sceneCompositionOf'); if (typeof f === 'function') return f; }
  return cameraModule(opts.root || ROOT).sceneCompositionOf;
}
/** The measures of one compiled scene (sceneCompositionOf with the engine's object boxes). */
export function compositionMeasures(C, data, opts = {}) {
  const E = opts.E || null, f = compositionOfFn(E, opts);
  return f(C, { data: data || null, obj: E && E.obj ? E.obj : opts.obj, shapes: E && E.shapes ? E.shapes : opts.shapes });
}

/* ---------------------------------------------------------------------------------------------
   Fingerprints and similarity (20.4)
   --------------------------------------------------------------------------------------------- */
// group weights of the coverage grid: the sky is in every picture, so it counts least; the things that make a view its own count most
const GRID_W = { sky: 0.35, water: 1.2, hard: 0.8, soft: 0.6, building: 1.2, tree: 1, life: 0.6 };
const SEASON_SUFFIX = /-(spring|summer|autumn|winter)$/;
export function compositionFingerprint(m, data = null, ref = '') {
  const grid = [];
  for (const g of Object.keys(GRID_W)) for (const v of (m.grid && m.grid.groups && m.grid.groups[g]) || new Array(144).fill(0)) grid.push(r3(v * GRID_W[g]));
  const third = m.subject ? (m.subject.xFrac < 0.45 ? 'L' : m.subject.xFrac > 0.55 ? 'R' : 'C') : null;
  const id = (data && data.id) || ref.split('/').pop() || '';
  return {
    v: 1, ref, preset: m.preset || null, horizon: m.horizon, horizonBucket: m.horizonBucket, headingClass: m.headingClass, third,
    subject: m.subject ? m.subject.o : null, grid, kinds: m.kinds || {},
    // a seasonal series (the same view, a fixed season each): its members are MEANT to share the composition
    series: data && data.season && data.season !== 'auto' ? id.replace(SEASON_SUFFIX, '') : null, season: data && data.season && data.season !== 'auto' ? data.season : null,
  };
}
function cosine(a, b) {
  let ab = 0, aa = 0, bb = 0;
  // centred on the mean of the two: what both share everywhere (sky over land) does not make two views alike
  for (let i = 0; i < a.length; i++) { const m = (a[i] + (b[i] || 0)) / 2; const x = a[i] - m * 0.5, y = (b[i] || 0) - m * 0.5; ab += x * y; aa += x * x; bb += y * y; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}
export function fingerprintSimilarity(a, b) {
  const cos = Math.max(0, cosine(a.grid, b.grid));
  const shared = [];
  if (a.preset && a.preset === b.preset) shared.push('preset');
  if (Math.abs((a.horizon || 0) - (b.horizon || 0)) <= 20) shared.push('horizon');
  if (a.headingClass === b.headingClass) shared.push('heading');
  if (a.third && a.third === b.third) shared.push('third');
  if (a.subject && a.subject === b.subject) shared.push('subject');
  const disc = (shared.filter(s => s !== 'subject').length + (shared.includes('subject') ? 1 : 0)) / 5;
  return { sim: r3(0.75 * cos + 0.25 * disc), cos: r3(cos), shared };
}
export function horizonSpread(rows) {
  const xs = rows.filter(Number.isFinite);
  if (xs.length < 2) return 0;
  const mu = xs.reduce((n, x) => n + x, 0) / xs.length;
  return r3(Math.sqrt(xs.reduce((n, x) => n + (x - mu) ** 2, 0) / xs.length));
}

/* ---------------------------------------------------------------------------------------------
   The pack's siblings
   --------------------------------------------------------------------------------------------- */
const _packs = new WeakMap();
function compileOf(E, data) {
  const season = data.season && data.season !== 'auto' ? data.season : 'summer';
  return E.compile(data, { season, lod: 1, L: null });
}
/** Fingerprints of every composed scene of a pack: [{ ref, fp }] (memoised per registry and pack). */
export function packFingerprints(reg, pack, E, opts = {}) {
  if (!reg || !pack) return [];
  let m = _packs.get(reg);
  if (!m) { m = new Map(); _packs.set(reg, m); }
  if (m.has(pack)) return m.get(pack);
  const out = [];
  for (const e of reg.items().filter(x => x.pack === pack && x.item && x.item.composed)) {
    try {
      const data = E.data ? E.data(e.item) : (typeof e.item.scene === 'function' ? e.item.scene() : e.item.scene);
      const C = compileOf(E, data);
      out.push({ ref: e.ref, fp: compositionFingerprint(compositionMeasures(C, data, Object.assign({ E, reg }, opts)), data, e.ref) });
    } catch (err) { /* a scene that does not compile is the data lint's business */ }
  }
  m.set(pack, out);
  return out;
}
function siblingFps(opts, E) {
  const out = [];
  for (const s of opts.siblings || []) {
    if (!s) continue;
    if (s.fp) { out.push({ ref: s.ref || s.fp.ref, fp: s.fp }); continue; }
    if (!E) continue;
    try {
      const data = s.data || (s.item && E.data ? E.data(s.item) : null);
      if (!data) continue;
      const C = s.C || compileOf(E, data);
      out.push({ ref: s.ref || data.id, fp: compositionFingerprint(compositionMeasures(C, data, Object.assign({}, opts, { E })), data, s.ref || data.id) });
    } catch (err) { /* skipped */ }
  }
  if (!out.length && opts.reg && opts.pack && E) return packFingerprints(opts.reg, opts.pack, E, opts);
  return out;
}

/* ---------------------------------------------------------------------------------------------
   The rules
   --------------------------------------------------------------------------------------------- */
function mkRule(strict) {
  return (name, ok, value, limit, message, extra = {}) => {
    if (ok) return { group: 'composition', rule: name, ok: true, value, limit, message: '', sev: 'warn', ...extra };
    if (strict) return { group: 'composition', rule: name, ok: false, value, limit, message: `${message} (strict)`, sev: 'warn', ...extra };
    return { group: 'composition', rule: name, ok: true, value, limit, message: '', warn: message, sev: 'warn', ...extra };
  };
}
function thresholdsOf(t) {
  const c = (t && t.composed && t.composed.composition) || (t && t.composition) || t || {};
  const out = {};
  for (const k of Object.keys(COMPOSITION_DEFAULTS)) out[k] = Object.assign({}, COMPOSITION_DEFAULTS[k], c[k] && typeof c[k] === 'object' ? c[k] : {});
  return out;
}
/**
 * The composition group for one compiled scene. `data` is its scene data. Returns lint rules (see the header).
 * The measures are attached as `rules.measures` (non-enumerable) for callers that want them.
 */
export function compositionRules(C, data, opts = {}) {
  const T = thresholdsOf(opts.thresholds);
  const E = opts.E || null;
  const rule = mkRule(!!opts.strict);
  const m = opts.measures || compositionMeasures(C, data, opts);
  const presetId = m.preset || (data && data.camera && data.camera.preset) || null;
  const out = [];
  const S = m.subject;
  // thirds
  if (!S) out.push(rule('thirds', true, 'no landmark or signature', 'subject within 0.08 of a third line', '', { info: 'no landmark or signature placed: thirds not judged' }));
  else {
    const centralBad = S.central && !S.symmetric;
    const ok = !centralBad && (S.thirdsDist <= T.thirds.maxDist || S.symmetric);
    out.push(rule('thirds', ok, `x ${S.xFrac}${S.symmetric ? ' (symmetric)' : ''}`, `within ${T.thirds.maxDist} of 1/3 or 2/3, not in ${T.thirds.central.join(' to ')}`,
      `thirds: the subject ${S.o} (place[${S.i}]) sits at ${pctS(S.xFrac)} of the width${centralBad ? ', in the central band' : ''}, ${S.thirdsDist} from the nearest third line: move it (or turn the camera ${S.xFrac < S.third ? 'left' : 'right'} by about ${Math.round(Math.abs(S.xFrac - S.third) * (m.fov || 66))} degrees) so it sits on the ${S.third < 0.5 ? 'left' : 'right'} third, or tag the object 'symmetric' if it is a head-on facade`));
  }
  // leading lines: the presets that want them (street, raised, down-street) and scenes with no preset (v1); across-water leads with the
  // water itself, from-hill with its ridges, through-arch with its frame, close-up and panorama with the subject and the horizon
  const P0 = presetId ? cameraPreset(presetId, opts) : null;
  if (!P0 || P0.lines) {
    const L = m.leading || { n: 0 };
    const ok = !!L.ok;
    out.push(rule('leadingLine', ok, L.n ? `${L.n} line(s), best ${L.best} at ${L.dist}` : 'none', `a strip converging within ${T.leadingLine.maxDist} of the subject or its third`,
      L.n ? `leadingLine: the nearest line (${L.best}) converges ${L.dist} of the width away from ${S ? 'the subject and its third line' : 'the frame'}: turn the camera or move the subject so the road, path, canal or rail leads to it`
        : 'leadingLine: no road, path, towpath, canal or rail runs into the picture: add one that leads toward the subject (a path strip, the water\'s centreline), or use a preset that has one (down-street)'));
  }
  // the water's share (across-water: 18 % to 32 % of the frame)
  if (P0 && P0.water) {
    const v = m.waterShare || 0, rng = P0.water, ok = v >= rng[0] && v <= rng[1];
    out.push(rule('waterShare', ok, v, rng.join(' to '), `waterShare: the water fills ${pctS(v)} of the frame, outside ${rng.map(pctS).join(' to ')}: ${v < rng[0] ? 'stand nearer the bank (the near edge within 5 to 10 m) or lower the eye' : 'step back from the bank or raise the horizon'}`));
  }
  // framing (presets that want it)
  const P = P0;
  if (P && P.framing) {
    const F = m.framing || { left: 0, right: 0, sides: 0 };
    const rng = P.framing === 'both' ? (P.frame || T.framing.both) : (P.frame || T.framing.one);
    const ok = P.framing === 'both' ? F.left >= rng[0] && F.right >= rng[0] && F.left <= rng[1] && F.right <= rng[1] : (F.cover >= rng[0] && F.cover <= rng[1]);
    out.push(rule('framing', ok, `left ${F.left}, right ${F.right}`, `${P.framing === 'both' ? 'both sides' : 'one side'} ${rng.join(' to ')}`,
      `framing: the ${presetId} preset wants a 'front'-band frame on ${P.framing === 'both' ? 'both sides' : 'one side'} covering ${rng.map(pctS).join(' to ')} of the width (now left ${pctS(F.left)}, right ${pctS(F.right)}): add a tree, an arch or a wall with layer: 'front' at the edge, or trim the one there`));
  }
  // the sky
  {
    const rng = (P && P.sky) || T.skyShare[SKY_BY_PRESET[presetId] || 'default'];
    const v = m.skyShare, ok = v >= rng[0] && v <= rng[1];
    out.push(rule('skyShare', ok, v, rng.join(' to '), `skyShare: open sky fills ${pctS(v)} of the frame, outside ${rng.map(pctS).join(' to ')}: ${v > rng[1] ? `lower the horizon (camera.horizon ${m.horizon} -> about ${Math.round(m.horizon - (v - (rng[0] + rng[1]) / 2) * 900)}) or put a skyline, hills or trees behind` : `raise the horizon (camera.horizon ${m.horizon} -> about ${Math.round(m.horizon + ((rng[0] + rng[1]) / 2 - v) * 900)}) or thin the skyline`}`));
  }
  // the subject's size
  if (S) {
    const rng = (P && P.subject) || T.subjectSize[presetId === 'close-up' ? 'closeUp' : 'default'];
    const ok = S.size >= rng[0] && S.size <= rng[1];
    out.push(rule('subjectSize', ok, S.size, rng.join(' to '), `subjectSize: the subject ${S.o} is ${pctS(S.size)} of the frame height, outside ${rng.map(pctS).join(' to ')}: ${S.size > rng[1] ? 'stand further back (a larger d) or use a wider preset' : 'stand closer, or use close-up / street'}`));
  } else out.push(rule('subjectSize', true, 'no subject', '', '', { info: 'no landmark or signature placed: size not judged' }));

  // the pack: horizon variety and similarity
  const sibs = siblingFps(opts, E).filter(s => s.ref !== opts.ref);
  const me = compositionFingerprint(m, data, opts.ref || '');
  if (sibs.length + 1 >= T.horizonVariety.minScenes) {
    const sd = horizonSpread([m.horizon, ...sibs.map(s => s.fp.horizon)]);
    out.push(rule('horizonVariety', sd >= T.horizonVariety.minStd, sd, `>= ${T.horizonVariety.minStd}`, `horizonVariety: the horizon rows of the pack (${sibs.length + 1} scenes) vary by only ${sd} units (sd): give some scenes a raised or from-hill camera (horizon 330 to 400) and some a close-up (500)`));
  }
  let worst = null;
  for (const s of sibs) {
    if (me.series && s.fp.series === me.series && me.season !== s.fp.season) continue;   // a seasonal series is the same view on purpose
    const r = fingerprintSimilarity(me, s.fp);
    if (!worst || r.sim > worst.sim) worst = Object.assign({ ref: s.ref }, r);
  }
  if (worst) out.push(rule('tooSimilar', worst.sim <= T.tooSimilar.similar, worst.sim, `<= ${T.tooSimilar.similar}`,
    `tooSimilar: this composition is ${worst.sim} similar to ${worst.ref} (coverage ${worst.cos}; shared: ${worst.shared.join(', ') || 'none'}): change the camera (preset, heading or horizon), put the subject on the other third, or lead in with a different line`, { similarTo: worst.ref }));
  Object.defineProperty(out, 'measures', { value: m, enumerable: false });
  Object.defineProperty(out, 'fingerprint', { value: me, enumerable: false });
  return out;
}
function cameraPreset(id, opts) {
  try { const m = cameraModule(opts.root || ROOT); return m.SCENE_CAMERA_PRESETS[id] || null; } catch { return null; }
}
