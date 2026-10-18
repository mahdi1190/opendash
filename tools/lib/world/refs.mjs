// v3 (world engine) scenes in the anim-pack tools (docs/dev/WORLD_ENGINE.md 8.7): a v3 scene is registered by worldAdd into the
// scene packs (_scPacks), often in the hidden 'world-test' pack that no animation pack lists, so the animation registry's refs do
// not see it. These helpers find it by ref and give the tools what they need: the spec, the derived v2 data (statics) for the
// Node lint, and a page data expression that goes through the app's own v3 path (the player's data.v === 3 -> worldRendererFor).

/** The registry's getter for any top-level name of the bundle. */
const getter = (reg) => (reg && reg.R && typeof reg.R.get === 'function' ? reg.R.get : () => undefined);

/** Every registered v3 scene: [{ ref, pack, item, spec }]. */
export function worldScenes(reg) {
  const get = getter(reg), packs = get('_scPacks'), specOf = get('worldHostSpec');
  const out = [];
  if (!packs || typeof specOf !== 'function') return out;
  for (const p of Object.keys(packs)) for (const it of packs[p] || []) {
    let spec = null;
    try { spec = specOf(it); } catch { spec = null; }
    if (spec) out.push({ ref: p + '/' + it.id, pack: p, item: it, spec });
  }
  return out;
}

/** A v3 scene by ref: '<pack>/<id>', a bare id ('fleet-pond-2-w3') or a short name ('fleet-pond-2' -> '<pack>/fleet-pond-2-w3'). */
export function worldSceneOf(reg, ref) {
  const all = worldScenes(reg);
  return all.find(s => s.ref === ref) || all.find(s => s.item.id === ref) || all.find(s => s.item.id === ref + '-w3')
    || all.find(s => ref.includes('/') && s.item.id === ref.split('/')[1]) || null;
}

/** The derived v2 data of a v3 scene (statics only, no life sim): what the v2 lint, sanity and SVG measure. */
export function worldV2Data(reg, s, o = {}) {
  const host = getter(reg)('worldHostData');
  if (typeof host !== 'function') throw new Error('the world host (src/app/79-world-5host.js: worldHostData) is not loaded');
  return host(s.spec, Object.assign({ id: s.item.id, sim: false }, o));
}

/** The page data expression for a v3 scene: what a worldAdd item's scene is in the app (the derived v2 data + the live world for the pass). */
export function worldPageData(s) {
  return 'worldHostData(' + JSON.stringify(s.spec) + ', { id: ' + JSON.stringify(s.item.id) + ', sync: !!(window.__sceneOpts && window.__sceneOpts.still) })';
}

/** A selectScenes entry for a v3 scene (kind 'world'). */
export function worldEntry(reg, s) {
  let memo = null;
  return { ref: s.ref, label: s.item.label || s.item.id, item: s.item, spec: s.spec, kind: 'world', pack: s.pack, data: () => memo || (memo = worldV2Data(reg, s)) };
}

/** The world engine's functions out of an evaluated registry (the names tools/lib/world/perf.mjs worldMotion uses). */
export function worldEngineOf(reg) {
  const get = getter(reg), E = {};
  for (const n of ['worldBuild', 'worldValidate', 'worldNavBuild', 'worldNavOk', 'worldLifeInit', 'worldLifeTick', 'worldAgents', 'worldLifeIsSpawn',
    'worldHostOrderCheck', 'worldHostData', 'worldHostSpec', 'sceneCamera', 'sceneProject', 'sceneSvg', 'worldChunks', 'worldFrameOrder', 'worldOrderCheck', 'worldSourceSpec']) E[n] = get(n);
  return E;
}

const numOf = (limit) => { const m = String(limit).match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };

/**
 * The v2 composed lint of a v3 scene, made fair and stricter (8.7):
 *  - the movers of a v3 scene are its life sim, not data actors: bar movers / travellers / motionKinds are measured on the sim
 *    (agents seen, agents that travel at least 10 m, distinct classes) against the same limits;
 *  - variety and care findings about look fields (tint, flip, variant, scale spread) are the host's job, which the author cannot set
 *    (v3 refuses look fields): they become warnings marked [engine];
 *  - group 'world': worldValidate must report 0 errors, and the Node motion check (forbidden cells, floaters off the water,
 *    pops, stuck walkers, depth order) must report 0 red marks over `seconds` of sim.
 */
export function worldLintAdjust(reg, s, r, { seconds = 120, motion = null } = {}) {
  if (!r || !r.rules) return r;
  const E = worldEngineOf(reg), rules = r.rules.slice();
  const put = (x) => { const i = rules.findIndex(q => q.group === x.group && q.rule === x.rule); if (i >= 0) rules[i] = x; else rules.push(x); };
  // validation
  const v = typeof E.worldValidate === 'function' ? E.worldValidate(s.spec) : { ok: false, errors: [{ rule: 'missing', path: '', msg: 'worldValidate is not loaded' }] };
  put({ group: 'world', rule: 'validate', ok: v.ok, value: v.errors.length, limit: '0 errors', message: v.ok ? '' : `worldValidate: ${v.errors.slice(0, 5).map(e => `${e.rule} ${e.path}: ${e.msg}`).join('; ')}` });
  // the life sim
  let m = motion;
  if (!m) {
    try { m = worldMotionLite(E, s.spec, seconds); } catch (e) { m = { error: e.message }; }
  }
  if (m.error) put({ group: 'world', rule: 'motion', ok: false, value: 'error', limit: 'runs', message: `the life sim threw: ${m.error}` });
  else {
    const by = {}; for (const x of m.red) by[x.rule] = (by[x.rule] || 0) + 1;
    put({ group: 'world', rule: 'motion', ok: !m.red.length, value: m.red.length, limit: `0 red marks in ${m.seconds} s`, message: m.red.length ? `motion: ${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(', ')} (node tools/world.mjs motion ${s.ref} draws them)` : '' });
    const travel = m.tracks.filter(t => { if (t.pts.length < 2) return false; const a = t.pts[0], b = t.pts[t.pts.length - 1]; let d = 0; for (let i = 1; i < t.pts.length; i++) d += Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1]); return d >= 10 || Math.hypot(b[0] - a[0], b[1] - a[1]) >= 10; }).length;
    const kinds = new Set(m.tracks.map(t => t.cls)).size;
    for (const [name, value, msg] of [['movers', m.agentsSeen, 'life populations (spec.life) with more agents'], ['travellers', travel, 'populations that cross the scene (goals to edges, leave)'], ['motionKinds', kinds, 'more kinds of life (walkers, birds, boats, dogs ...)']]) {
      const old = rules.find(q => q.group === 'bar' && q.rule === name), lim = old ? numOf(old.limit) : null;
      if (!old || lim == null) continue;
      put(Object.assign({}, old, { ok: value >= lim, value, message: value >= lim ? '' : `${name} ${value} (life sim) below ${lim}: ${msg}` }));
    }
  }
  // dataBytes: what the author writes is the spec, not the derived v2 data the engine makes from it (the source: a valley is twenty numbers, not its hundred thousand)
  const db = rules.findIndex(q => q.group === 'data' && q.rule === 'dataBytes');
  if (db >= 0) { const src = typeof E.worldSourceSpec === 'function' && s.item ? E.worldSourceSpec(s.item.id) : null, n = JSON.stringify(src || s.spec).length, lim = numOf(rules[db].limit); rules[db] = Object.assign({}, rules[db], { value: n, ok: lim == null || n <= lim, message: lim == null || n <= lim ? '' : `dataBytes ${n} > ${lim}: the v3 spec is too large: use clusters (cluster + on + density) instead of single entities` }); }
  for (let i = 0; i < rules.length; i++) {
    const q = rules[i];
    if (!q.ok && q.group === 'variety') rules[i] = Object.assign({}, q, { ok: true, message: '', warn: `[engine] ${q.message || q.rule}` });
  }
  const failures = rules.filter(q => !q.ok), warnings = (r.warnings || []).concat(rules.filter(q => q.ok && q.warn && !(r.warnings || []).includes(q.warn)).map(q => q.warn));
  return Object.assign({}, r, { v: 3, rules, failures, warnings: [...new Set(warnings)], pass: !failures.length, gold: !!r.gold && !failures.length, world: { validate: v, motion: m && !m.error ? { seconds: m.seconds, agents: m.agentsSeen, red: m.red.length } : m } });
}

/** perf.mjs worldMotion without the import cycle (the same checks); lazily imported. */
let _perf = null;
function worldMotionLite(E, spec, seconds) {
  if (!_perf) throw new Error('call worldLintPrepare() first');
  return _perf.worldMotion(E, spec, { seconds });
}
/** Load tools/lib/world/perf.mjs once (async import). */
export async function worldLintPrepare() { if (!_perf) _perf = await import('./perf.mjs'); return _perf; }
