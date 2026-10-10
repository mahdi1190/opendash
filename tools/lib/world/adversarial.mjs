// The proof that the world engine works first time (docs/dev/WORLD_ENGINE.md 16.2, 16.3, 16.5; requirements section 16).
// Node >= 20, no dependencies. The engine (E) is tools/lib/world/convert.mjs loadEngine(): every world* function is reached by name,
// so a package that is not loaded yet makes its part report n/a, never a crash.
//
//   ADVERSARIAL_DIR, adversarialFixtures(root)  the 14 deliberately wrong scenes of 16.3: [{ file, id, title, req, about, expect, spec }]
//   logMatches(log, expect)                     -> { ok, missing: [expect entry], matched: n }: the load log explains every fix
//   worldMomentsOf(spec, dates)                 -> [{ date, moment, at (ISO), ms }]: 3 dates x 5 times (dawn, noon, golden, dusk, night)
//   WORLD_MATRIX                                the V6 matrix: 4 seasons x 5 times x 3 weathers; worldMatrixCells(spec) lists its cells
//   worldTimeOf(E, world, ms, wx)               the time context (systems' worldTimeCtx, else a small almanac fallback)
//   worldSimOf(E, spec, o)                      -> Sim { world, ctx, t, step(dt), agents(), frame(), isSpawn, log, kind, error }
//   worldInvariantRun(E, spec, o)               -> { frames, counts, first, uniq, na, ran, agentsSeen, msPerFrame, log, error }: the
//                                                  invariant checker every frame (o.hz, default 5) over o.seconds (default WORLD_LOOP_S)
//   adversarialRun(E, fx, o)                    -> { id, registered, built, errors, log, logOk, missing, run, violations, ok, owners }
//   OWNERS                                      requirement / rule -> the package that owns the fix (for the gate's messages)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sceneTimesFor, seasonDates } from '../scene-times.mjs';

export const ADVERSARIAL_DIR = join('tests', 'fixtures', 'world', 'adversarial');
export const WORLD_TIMES = Object.freeze(['dawn', 'noon', 'golden', 'dusk', 'night']);
export const WORLD_WEATHERS = Object.freeze(['clear', 'cloudy', 'rain']);
export const WORLD_SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
/** The three dates of 16.2 / 16.4 (month-day; the year is the current one): winter, summer, autumn. */
export const WORLD_DATES3 = Object.freeze(['01-15', '07-15', '10-15']);
export const WORLD_MATRIX = Object.freeze({ seasons: WORLD_SEASONS, times: WORLD_TIMES, weathers: WORLD_WEATHERS });
/** Which package owns the fix for a rule or requirement (docs/dev/WORLD_ENGINE.md 8). */
export const OWNERS = Object.freeze({
  habitat: 'sense (snap) + kb (habitat tags)', overlap: 'sense', inSolid: 'life', onWater: 'life', floating: 'sense (statics) + life (movers) + look (waterline)',
  orphan: 'sense (K4 parents) + kb', pathBlocked: 'sense (P3)', reflectOutsideWater: 'look', shadowOnWater: 'look', shadowDir: 'look', waterGap: 'look',
  edgeCut: 'appearance (C1) + life (C2)', nearBand: 'life', giant: 'life (A10) + kb (K8)', popping: 'life', stuck: 'life', slidingFeet: 'appearance',
  facing: 'life (A5)', laneDir: 'life (A9 traffic) + sense (K3)', animStill: 'appearance', stillMoving: 'appearance', staticAnim: 'appearance + systems',
  clones: 'appearance (M4)', windDir: 'systems (wind) + look', order: 'render', landmark: 'appearance (C4) + kb (P8)', bare: 'kb (fill) + look (coverage)',
  season: 'kb (state) + look (materials, light)', log: 'sense (load log)', register: 'sense (worldAdd never refuses)', build: 'sense (G8 isolation)',
});

const r2 = (v) => Math.round(v * 100) / 100;

/** The adversarial fixtures, sorted by id. */
export function adversarialFixtures(root) {
  const dir = join(root, ADVERSARIAL_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => Object.assign({ file: join(dir, f) }, JSON.parse(readFileSync(join(dir, f), 'utf8'))));
}

/**
 * Every expected log entry must be matched. expect: { log: [{ any: [actions], id?, obj?, rule?, match? (a regexp over the entry), n? }] }.
 * A log entry: { id, obj, action, rule, reason, from, to, by } (12.5); id may also sit in `path` or `ref`.
 */
export function logMatches(log, expect) {
  const L = Array.isArray(log) ? log : [], missing = [];
  let matched = 0;
  for (const want of (expect && expect.log) || []) {
    const re = want.match ? new RegExp(want.match, 'i') : null;
    const hits = L.filter(e => e && (!want.any || want.any.includes(e.action))
      && (want.id == null || e.id === want.id || e.ref === want.id || String(e.path || '').includes(want.id) || String(e.reason || '').includes(want.id))
      && (want.obj == null || e.obj === want.obj)
      && (want.rule == null || [].concat(want.rule).includes(e.rule))
      && (!re || re.test(JSON.stringify(e))));
    if (hits.length >= (want.n || 1)) matched++; else missing.push(Object.assign({ found: hits.length }, want));
  }
  return { ok: !missing.length, missing, matched };
}

/** The 3 dates x 5 times of a spec's place: [{ date, moment, at, ms }]. dates: 'MM-DD' strings or ISO dates. */
export function worldMomentsOf(spec, dates = WORLD_DATES3, year = new Date().getUTCFullYear()) {
  const P = (spec && spec.place) || {}, C = (spec && spec.camera) || {};
  const lat = Number.isFinite(P.lat) ? P.lat : Number.isFinite(C.lat) ? C.lat : 51.5, lon = Number.isFinite(P.lon) ? P.lon : Number.isFinite(C.lon) ? C.lon : -0.1;
  const out = [];
  for (const d of dates) {
    const date = /^\d{4}-/.test(d) ? d.slice(0, 10) : `${year}-${d}`;
    const T = sceneTimesFor(lat, lon, date);
    for (const m of WORLD_TIMES) if (T[m]) out.push({ date, moment: m, at: T[m], ms: Date.parse(T[m]) });
  }
  return out;
}
/** The V6 matrix cells of a spec: 4 seasons x 5 times x 3 weathers. */
export function worldMatrixCells(spec, year = new Date().getUTCFullYear()) {
  const P = (spec && spec.place) || {}, lat = Number.isFinite(P.lat) ? P.lat : 51.5;
  const dates = seasonDates(lat, year);
  const out = [];
  for (const s of WORLD_SEASONS) {
    const d = dates.find(x => x.season === s);
    for (const m of worldMomentsOf(spec, [d.date], year)) for (const wx of WORLD_WEATHERS) out.push({ season: s, date: m.date, moment: m.moment, at: m.at, ms: m.ms, wx });
  }
  return out;
}

/** The time context: systems' worldTimeCtx, else a fallback from the almanac (month 0-11, as worldTimeCtx gives it). */
export function worldTimeOf(E, world, ms, wx) {
  if (typeof E.worldTimeCtx === 'function') { try { const c = E.worldTimeCtx(world, ms, { wx }); if (c) return c; } catch { /* the fallback */ } }
  const P = (world && world.place) || {}, lat = Number.isFinite(P.lat) ? P.lat : 51.5, lon = Number.isFinite(P.lon) ? P.lon : -0.1;
  const d = new Date(ms + lon / 15 * 3600000);
  let sun = { az: 180, alt: 45 };
  if (E.almSunPosition) { try { const s = E.almSunPosition(ms, lat, lon); if (s) sun = { az: s.az != null ? s.az : s.azimuth, alt: s.alt }; } catch { /* noon */ } }
  const season = E.sceneSeason ? E.sceneSeason(ms, lat) : ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][d.getUTCMonth()];
  return { ms, lat, lon, month: d.getUTCMonth(), hour: d.getUTCHours() + d.getUTCMinutes() / 60, dow: d.getUTCDay(), season, weather: wx || 'clear', sun, wind: null, snowing: wx === 'snow', snowDay: wx === 'snow', src: 'fallback' };
}

/** render's worldFrameAt, measured once per process: when it is too slow to run every frame the runs use the checker's own record. */
const FRAME_AT = { slow: false, note: null };
/**
 * A running scene in Node: the systems runner when it is loaded (worldRun), the life sim over the nav map (worldNavBuild +
 * worldLifeInit) when no registered system moves the agents, and the frame record from render's worldFrameAt when loaded, else
 * the checker's own worldInvariantFrame. o: { ms, wx, season, warm (s; default the life sim's own 90 s) }.
 */
export function worldSimOf(E, spec, o = {}) {
  const ms = Number.isFinite(o.ms) ? o.ms : Date.parse('2026-07-15T12:00:00Z'), lat = spec.place && Number.isFinite(spec.place.lat) ? spec.place.lat : 51.5;
  const season = o.season || (E.sceneSeason ? E.sceneSeason(ms, lat) : 'summer');
  const sim = { kind: null, error: null, t: 0, log: [], world: null, ctx: null, life: null, runner: null };
  let world = null;
  try { world = E.worldBuild(spec, { season, ms, wx: o.wx, ctx: o.ctx }); } catch (e) { sim.error = 'worldBuild threw: ' + (e && e.message || e); return sim; }
  sim.world = world;
  sim.log = Array.isArray(world.log) ? world.log : [];
  sim.ctx = worldTimeOf(E, world, ms, o.wx);
  // the runner (systems): time, wind, anim, light ... (and life when the life package registered it)
  if (typeof E.worldRun === 'function') {
    try { sim.runner = E.worldRun(world, { ms, wx: o.wx, deterministic: true, quiet: true }); } catch (e) { sim.runner = null; sim.error = 'worldRun threw: ' + (e && e.message || e); }
  }
  const lifeSystem = typeof E.worldSystemList === 'function' && E.worldSystemList().some(s => s.id === 'life');
  if (sim.runner && lifeSystem && world.sim) { sim.life = world.sim; sim.kind = 'runner'; }
  else if (E.worldNavBuild && E.worldLifeInit) {
    try { const nav = world.nav || E.worldNavBuild(world); world.nav = nav; sim.life = E.worldLifeInit(world, nav, 0); sim.kind = sim.runner ? 'runner+life' : 'life'; }
    catch (e) { sim.error = 'the life sim threw: ' + (e && e.message || e); sim.kind = sim.runner ? 'runner' : 'statics'; }
  } else sim.kind = sim.runner ? 'runner' : 'statics';
  const cache = {}, born = new Map();
  sim.agents = () => { try { return sim.life && E.worldAgents ? E.worldAgents(sim.life) || [] : []; } catch { return []; } };
  sim.step = (dt) => {
    if (sim.runner) { try { sim.runner.advance ? sim.runner.advance(dt) : sim.runner.step(dt); } catch (e) { sim.error = sim.error || 'runner: ' + e.message; } }
    if (sim.life && sim.kind !== 'runner') { const n = Math.max(1, Math.round(dt * 15)); for (let i = 0; i < n; i++) E.worldLifeTick(sim.life, dt / n); }
    sim.t += dt;
    if (world.time) sim.ctx = world.time;
  };
  sim.isSpawn = (e) => { try { return !!(sim.life && E.worldLifeIsSpawn && E.worldLifeIsSpawn(sim.life, e.layer, e.x, e.z)); } catch { return false; } };
  // the frame record: render's worldFrameAt (the real one) unless o.frameAt === 'own', or it throws, gives no ents, or is too
  // slow to run every frame (> 60 ms twice: then the checker's own record, and the run says so in frameSource)
  sim.frameSource = typeof E.worldFrameAt === 'function' && o.frameAt !== 'own' && !(FRAME_AT.slow && o.frameAt !== 'render') ? 'worldFrameAt' : 'worldInvariantFrame';
  if (FRAME_AT.slow && sim.frameSource !== 'worldFrameAt' && typeof E.worldFrameAt === 'function') sim.frameNote = FRAME_AT.note;
  let slow = 0;
  sim.frame = () => {
    let fr = null;
    if (sim.frameSource === 'worldFrameAt') {
      const a = performance.now();
      try { fr = E.worldFrameAt(world, sim.t); } catch (e) { fr = null; sim.frameNote = 'worldFrameAt threw: ' + e.message; }
      if (fr && !Array.isArray(fr.ents)) { fr = null; sim.frameNote = 'worldFrameAt gave no ents'; }
      const ms = performance.now() - a;
      if (ms > 60 && o.frameAt !== 'render' && ++slow >= 2) {
        // too slow to run every frame: the checker's own record, for this run and the rest of the process (re-tried with frameAt: 'render')
        sim.frameSource = 'worldInvariantFrame';
        FRAME_AT.slow = true; FRAME_AT.note = sim.frameNote = `worldFrameAt took ${Math.round(ms)} ms a frame (render budget 4 ms): the checker's own frame record was used`;
      }
      if (!fr && o.frameAt !== 'render') sim.frameSource = 'worldInvariantFrame';
    }
    if (!fr) fr = E.worldInvariantFrame(world, sim.agents(), { t: sim.t, ctx: sim.ctx, cache, born, sun: sim.ctx && sim.ctx.sun, season });
    // the run checks the date it was asked for: a frame record built at another time (a default clock) is judged at this one
    if (fr.ctx && sim.ctx && fr.ctx.ms != null && sim.ctx.ms != null && Math.abs(fr.ctx.ms - sim.ctx.ms) > 3600000 && !sim.ctxNote) sim.ctxNote = sim.frameNote = (sim.frameNote ? sim.frameNote + '; ' : '') + `the frame record's time context (${new Date(fr.ctx.ms).toISOString().slice(0, 16)}) is not the world's (${new Date(sim.ctx.ms).toISOString().slice(0, 16)})`;
    fr.ctx = sim.ctx || fr.ctx;
    if (!fr.season) fr.season = season;
    return fr;
  };
  return sim;
}

/**
 * The invariant checker over a running scene. o: { ms, wx, seconds (default WORLD_LOOP_S), hz (checks per second, default 5),
 * rules, skip, keep (violations kept, default 200), sim (an existing worldSimOf) }.
 */
export function worldInvariantRun(E, spec, o = {}) {
  const loop = Number.isFinite(E.WORLD_LOOP_S) ? E.WORLD_LOOP_S : 360;
  const seconds = Number.isFinite(o.seconds) ? o.seconds : loop, hz = o.hz || 5, keep = o.keep || 200;
  const sim = o.sim || worldSimOf(E, spec, o);
  const out = { seconds, hz, frames: 0, counts: {}, first: {}, uniq: 0, violations: [], na: [], ran: [], agentsSeen: 0, msPerFrame: 0, log: sim.log, kind: sim.kind, error: sim.error };
  if (!sim.world) return out;
  if (typeof E.worldInvariants !== 'function') { out.error = 'worldInvariants is not loaded'; return out; }
  const track = E.worldInvariantTracker(), seen = new Set(), na = new Set(), ran = new Set(), ids = new Set();
  let ms = 0;
  const check = () => {
    const fr = sim.frame(), st = {};
    for (const e of fr.ents || []) if (e.static === false) ids.add(e.id);
    const v = E.worldInvariants(fr, { world: sim.world, track, stats: st, isSpawn: sim.isSpawn, rules: o.rules, skip: o.skip });
    ms += st.ms || 0; out.frames++;
    for (const r of st.na || []) na.add(r);
    for (const r of st.ran || []) ran.add(r);
    for (const x of v) {
      out.counts[x.rule] = (out.counts[x.rule] || 0) + 1;
      if (!out.first[x.rule]) out.first[x.rule] = Object.assign({ t: r2(sim.t) }, x);
      const k = x.rule + '|' + x.id;
      if (!seen.has(k)) { seen.add(k); if (out.violations.length < keep) out.violations.push(Object.assign({ t: r2(sim.t) }, x)); }
    }
  };
  check();
  for (let t = 0; t + 1 / hz <= seconds + 1e-9; t += 1 / hz) { sim.step(1 / hz); check(); }
  out.uniq = seen.size;
  out.na = [...na].filter(r => !ran.has(r));
  out.ran = [...ran];
  out.agentsSeen = ids.size;
  out.msPerFrame = out.frames ? r2(ms / out.frames) : 0;
  out.error = out.error || sim.error;
  out.frameSource = sim.frameSource; out.frameNote = sim.frameNote || null;
  return out;
}

/**
 * One adversarial fixture: it registers (worldAdd never refuses), builds (no throw), carries a load log that explains every
 * fix (fx.expect.log), and runs o.seconds (default 120) with zero invariant violations. o: { seconds, hz, ms, pack }.
 */
export function adversarialRun(E, fx, o = {}) {
  const res = { id: fx.id, title: fx.title, req: fx.req, registered: null, errors: [], built: false, log: [], logOk: false, missing: [], run: null, violations: 0, ok: false, owners: [] };
  if (typeof E.worldValidate === 'function') { try { res.errors = (E.worldValidate(fx.spec).errors || []).map(e => e.rule); } catch (e) { res.errors = ['threw: ' + e.message]; } }
  if (typeof E.worldAdd === 'function') {
    try {
      // registered = worldAdd said yes AND the item is in its pack (its repair notes in worldAddProblems are not a refusal)
      const pack = o.pack || 'world-adversarial', id = 'adv-' + fx.id;
      const before = typeof E.worldAddProblems === 'function' ? E.worldAddProblems().length : 0;
      const r = E.worldAdd(pack, { id, label: fx.title, site: 'adversarial fixture', tags: ['world-v3', 'test'] }, JSON.parse(JSON.stringify(fx.spec)));
      const inPack = E.packs && E.packs[pack] ? E.packs[pack].some(it => it && (it.id === id || String(it.id).startsWith(id + '-'))) : null;
      res.registered = !!r && inPack !== false;
      res.addNotes = typeof E.worldAddProblems === 'function' ? E.worldAddProblems().slice(before).flatMap(p => (p.errors || []).map(e => `${e.rule} (${e.severity || 'error'}) ${e.path}`)) : [];
      if (res.addNotes.some(n => /\(fatal\)/.test(n))) res.registered = false;
    } catch (e) { res.registered = false; res.registerError = e.message; }
  }
  const run = worldInvariantRun(E, JSON.parse(JSON.stringify(fx.spec)), { seconds: o.seconds || 120, hz: o.hz || 5, ms: o.ms });
  res.run = run;
  res.built = !run.error || !/worldBuild threw/.test(run.error);
  res.log = run.log || [];
  const lm = logMatches(res.log, fx.expect);
  res.logOk = lm.ok; res.missing = lm.missing;
  res.violations = run.uniq;
  const owners = new Set();
  if (res.registered === false) owners.add(OWNERS.register);
  if (!res.built) owners.add(OWNERS.build);
  if (!res.logOk) owners.add(OWNERS.log);
  for (const r of Object.keys(run.counts)) owners.add(OWNERS[r] || r);
  res.owners = [...owners];
  res.ok = res.registered !== false && res.built && res.logOk && res.violations === 0;
  return res;
}

/** One line per fixture and the failures under it. */
export function adversarialText(results) {
  const out = [];
  for (const r of results) {
    out.push(`${r.ok ? 'PASS' : 'FAIL'} ${r.id.padEnd(26)} registered ${r.registered === null ? 'n/a' : r.registered ? 'yes' : 'NO'}, built ${r.built ? 'yes' : 'NO'}, log ${r.logOk ? 'ok' : 'MISSING ' + r.missing.map(m => `${(m.any || ['*']).join('|')}${m.id ? ' ' + m.id : ''}${m.match ? ' /' + m.match + '/' : ''}`).join(', ')}, violations ${r.violations} (${r.run ? r.run.frames : 0} frames, ${r.run ? r.run.kind : '-'})`);
    if (r.run) for (const [k, n] of Object.entries(r.run.counts)) out.push(`       ${k.padEnd(20)} ${String(n).padStart(5)}  e.g. ${r.run.first[k].msg}   [${OWNERS[k] || '?'}]`);
    if (r.run && r.run.error) out.push(`       error: ${r.run.error}`);
    if (r.run && r.run.frameNote) out.push(`       note: ${r.run.frameNote}`);
  }
  return out.join('\n');
}
