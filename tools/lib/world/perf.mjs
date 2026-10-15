// World engine v3, module F: the performance budget (docs/dev/WORLD_ENGINE.md 7). Node >= 20, no dependencies.
//
//   WORLD_BUDGET                          the budget table (ms, counts); a measure FAILS at 1.2 x its budget (7: "tests fail at 1.2x")
//   worldPerfNode(spec, E, o)             the pure world part in Node: validate, build, nav, life init, life tick (median ms over
//                                         o.ticks at 15 Hz, scaled to 60 agents), chunks, frame order (median per frame), statics
//   worldPerfBrowser(chrome, spec, o)     the real renderer on a scene page (78-scene-* + 79-world-*): first bake, drawMs, dynMs,
//                                         sprites, bitmaps, agents, order violations; o: { seconds, throttle, at, season }
//   worldPerfCheck(measures)              -> { ok, lines: [{ item, value, budget, unit, ratio, status: 'ok' | 'warn' | 'fail' | 'n/a' }] }
//   worldPerfText(check)                  a printable report
//   worldMotion(E, spec, { seconds })     the life sim with every motion check (red marks); worldMotionSvg(E, spec, r): the overlay
//   WORLD_PERF_SIZES, WORLD_PERF_EXTREMES the average machine's two sizes (1920 x 1080 at 1.25, 3440 x 1440; F1) and the matrix
//                                         extremes (Z1: a summer noon and a snowy winter night with many lights)
//   worldPerfProfile(E, spec, o)          the per-system profile (G12): the systems runner (worldRun) over o.seconds, p50 / p95 ms
//                                         per system against its budgetMs (fail at 1.2x); { systems: [...], ok, by }
//   worldPerfMatrix(chrome, spec, o)      the browser gates at both sizes x both extremes, GPU on, CPU throttle 4: cold and warm load,
//                                         frame median and p95, sprites and sprite memory (F1, F2, Z1) -> [{ size, extreme, measures, check }]
import { scenePerf } from '../scene-page.mjs';

export const WORLD_BUDGET = Object.freeze({
  coldLoadMs: { budget: 5000, unit: 'ms', label: 'cold load at --gpu --throttle=4 (first bake)' },
  worldBakeMs: { budget: 5000, unit: 'ms', label: 'cold load to a fully drawn scene at --gpu --throttle=4 (the world bake)' },
  worldMs: { budget: 600, unit: 'ms', label: 'world part (validate + build + nav + life + chunks)' },
  warmLoadMs: { budget: 1000, unit: 'ms', label: 'warm load (the same scene mounted again)' },
  frameMs: { budget: 8, unit: 'ms', label: 'frame median (drawMs)' },
  frameP95: { budget: 14, unit: 'ms', label: 'frame p95 (drawMs)' },
  spriteMB: { budget: 96, unit: 'MB', label: 'sprite memory (distinct sprites x bytes)' },
  lifeTickMs: { budget: 1.5, unit: 'ms', label: 'life tick, 60 agents' },
  orderMs: { budget: 0.7, unit: 'ms', label: 'sort + interleave per frame' },
  occDraws: { budget: 40, unit: '', label: 'occluder redraws per frame' },
  chunks: { budget: 24, unit: '', label: 'chunk bitmaps' },
  sprites: { budget: 600, unit: '', label: 'distinct sprites' },
  agents: { budget: 60, unit: '', label: 'agents on screen (cities 60, nature 25)' },
  orderViolations: { budget: 0, unit: '', label: 'worldOrderCheck violations' },
});
export const WORLD_FAIL_FACTOR = 1.2;
// reported, never failed: the frame and warm-load times depend on the machine (the user's gate is the cold load, under 5 s at a 4x throttle); the frame
// times are taken as the page runs (no forced flush: a forced getImageData per blit turns the canvas software-rendered and made every frame 100 times slower)
const WORLD_INFO = new Set(['frameMs', 'frameP95', 'warmLoadMs']);

const now = () => performance.now();
const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r2 = (v) => Math.round(v * 100) / 100;

/** The pure world part in Node. Every stage is optional (typeof guards): a missing module reports n/a. */
export function worldPerfNode(spec, E, o = {}) {
  const m = { stages: {} }, T = (k, fn) => { const a = now(); const v = fn(); m.stages[k] = r2(now() - a); return v; };
  if (E.worldValidate) T('validate', () => E.worldValidate(spec));
  const world = E.worldBuild ? T('build', () => E.worldBuild(spec, { season: o.season || 'summer' })) : null;
  if (!world) { m.worldMs = null; return m; }
  m.statics = (world.entities || []).length;
  const nav = E.worldNavBuild ? T('nav', () => E.worldNavBuild(world)) : null;
  const life = nav && E.worldLifeInit ? T('lifeInit', () => E.worldLifeInit(world, nav, 0)) : null;
  const cam = world.cam, zMin = cam ? Math.max(0.3, (cam.dMin || 1) * 0.5) : 0.3;
  const proj = cam && E.sceneProject ? { f: cam.f, project: (x, z, y) => { const p = E.sceneProject(cam, x, Math.max(zMin, z), y); return [p.X, p.Y]; } } : null;
  const chunks = E.worldChunks && proj ? T('chunks', () => E.worldChunks(world, nav, proj)) : null;
  m.worldMs = r2(Object.values(m.stages).reduce((a, b) => a + b, 0));
  m.chunks = chunks ? chunks.length : null;
  if (life && E.worldLifeTick && E.worldAgents) {
    const dt = 1 / 15, ticks = o.ticks || 300, ms = [], ord = [];
    for (let i = 0; i < 15 * 90; i++) E.worldLifeTick(life, dt);   // the warm-up (4.4): the populations are in
    let agents = 0, viol = 0;
    for (let i = 0; i < ticks; i++) {
      const a = now(); E.worldLifeTick(life, dt); ms.push(now() - a);
      if (chunks && E.worldFrameOrder && i % 10 === 0) {
        const ag = (E.worldAgents(life) || []).map(x => Object.assign({}, x, { static: false, height: x.height || 1.7 }));
        agents = Math.max(agents, ag.length);
        const b = now(); const order = E.worldFrameOrder(chunks, ag, proj); ord.push(now() - b);
        if (E.worldOrderCheck && i % 50 === 0) viol += E.worldOrderCheck(order).length;
      }
    }
    const n = Math.max(1, (E.worldAgents(life) || []).length);
    m.agentsSim = n; m.agents = agents;
    m.lifeTickMsRaw = r2(median(ms));
    m.lifeTickMs = r2(median(ms) * 60 / n);   // per 60 agents (the budget's unit)
    m.orderMs = ord.length ? r2(median(ord)) : null;
    m.orderViolations = E.worldOrderCheck ? viol : null;
  }
  return m;
}

/** The real renderer on a scene page. chrome: tools/release-chrome.mjs launchChrome(). */
export async function worldPerfBrowser(chrome, spec, o = {}) {
  if (o.throttle && chrome.cdp) await chrome.cdp('Emulation.setCPUThrottlingRate', { rate: Number(o.throttle) || 1 });
  const data = `worldHostData(${JSON.stringify(spec)}, { id: ${JSON.stringify(o.id || 'perf')} })`;
  const t0 = Date.now();
  const r = await scenePerf(chrome, { data, waitWorld: true, flush: o.flush === undefined ? false : o.flush, seconds: o.seconds || 4, at: o.at, season: o.season, governor: false, size: o.size, dpr: o.dpr, wx: o.wx });
  const wall = Date.now() - t0;
  // a Chrome without a GPU rasterises in software (SwiftShader): the frame and warm-load times are then the software rasteriser's, not the engine's
  let software = false;
  try { const r = await chrome.evaluate(`(() => { const c = document.createElement('canvas').getContext('webgl'); if (!c) return 'none'; const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? String(c.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unknown'; })()`); software = /swiftshader|llvmpipe|software|none/i.test(String(r)); } catch { software = false; }
  const pass = (r.passes && r.passes['world-life']) || {};
  // warm load: the same scene mounted again in this page (a second host, another key): what opening it a second time costs
  let warm = null;
  try { warm = await chrome.evaluate(WARM_JS); } catch { warm = null; }
  if (o.throttle && chrome.cdp) await chrome.cdp('Emulation.setCPUThrottlingRate', { rate: 1 });
  const wf = (r.passes && r.passes['world-frame']) || {};
  return { software, worldBakeMs: Number.isFinite(wf.bakeMs) ? Math.round(wf.bakeMs) : null, coldLoadMs: r.firstBakeMs != null ? Math.round(r.firstBakeMs) : null, warmLoadMs: Number.isFinite(warm) ? warm : null, wallMs: wall, frameMs: r.drawMs ? r.drawMs.median : null, frameP95: r.drawMs ? r.drawMs.p95 : null,
    dynMs: r.dynMs ? r.dynMs.median : null, sprites: r.sprites, spriteMB: Number.isFinite(r.spriteBytes) ? Math.round(r.spriteBytes / 1048576 * 10) / 10 : null, bitmaps: r.bitmaps,
    occDraws: r.occDraws != null ? r.occDraws : null, agentsShown: pass.agents != null ? pass.agents : null, passes: r.passes || null, governor: r.governor || null, raw: r };
}
const WARM_JS = `(async () => {
  const box = document.querySelector('.sp-box'), host = box && box.querySelector('.anim-scene');
  if (!host) return null;
  // the first copy stops (in the app a scene is shown once): the second mount measures the warm path, not two scenes at once
  if (typeof _schHosts !== 'undefined') for (const r of _schHosts.values()) if (r.r) { r.still = true; r.r.stop(); }
  const b2 = document.createElement('div'); b2.className = 'sp-box'; b2.setAttribute('data-scene-key', 'warm-' + Date.now());
  b2.innerHTML = host.outerHTML.replace(/ sc-ready/g, '');
  const t0 = performance.now(); box.parentNode.appendChild(b2);
  if (typeof sceneHostScan === 'function') sceneHostScan(document);
  await new Promise(r => requestAnimationFrame(r));
  const el = b2.querySelector('.anim-scene'), rec = typeof _schHosts !== 'undefined' ? _schHosts.get(el) : null;
  if (!rec) return null;
  while (performance.now() - t0 < 20000) { if (rec.r && rec.r.ready) break; await new Promise(r => setTimeout(r, 20)); }
  return Math.round(performance.now() - t0);
})()`;

/** The average machine (F1): 1920 x 1080 at 1.25 (a laptop at 125 %: a 1536 x 864 css box) and 3440 x 1440 (the ultrawide). */
export const WORLD_PERF_SIZES = Object.freeze([
  { id: '1920x1080@1.25', size: { w: 1536, h: 864 }, dpr: 1.25 },
  { id: '3440x1440', size: { w: 3440, h: 1440 }, dpr: 1 },
]);
/** The matrix extremes (Z1): an easy summer noon and a snowy winter night with every light on. */
export const WORLD_PERF_EXTREMES = Object.freeze([
  { id: 'summer-noon', mmdd: '07-15', hour: 12, wx: 'clear' },
  { id: 'snowy-night', mmdd: '01-15', hour: 22, wx: 'snow' },
]);
/** The ISO moment of an extreme at a place (local solar time from the longitude). */
export function worldPerfAt(ext, spec, year = new Date().getUTCFullYear()) {
  const lon = spec && spec.place && Number.isFinite(spec.place.lon) ? spec.place.lon : 0;
  return new Date(Date.parse(`${year}-${ext.mmdd}T00:00:00Z`) + (ext.hour - lon / 15) * 3600000).toISOString();
}

/**
 * The per-system profile (G12) in Node: the systems runner over o.seconds (default 20) of scene time, p50 / p95 ms per
 * system and its budget; a system over 1.2 x its budget fails. Without the runner: the life tick and the order alone.
 */
export function worldPerfProfile(E, spec, o = {}) {
  const out = { systems: [], ok: true, by: null, seconds: o.seconds || 20 };
  const world = E.worldBuild(spec, { season: o.season || 'summer' });
  if (typeof E.worldRun === 'function') {
    let R = null;
    try { R = E.worldRun(world, { ms: o.ms, wx: o.wx, quiet: true }); } catch (e) { out.error = e.message; }
    if (R) {
      const n = Math.round(out.seconds * 30);
      for (let i = 0; i < n; i++) R.step(1 / 30);
      const st = R.stats();
      out.by = 'worldRun';
      for (const s of st.systems || []) {
        const budget = Number.isFinite(s.budgetMs) ? s.budgetMs : null, p50 = s.p50 != null ? s.p50 : s.avg;
        const status = budget == null ? 'n/a' : p50 > budget * WORLD_FAIL_FACTOR ? 'fail' : p50 > budget ? 'warn' : 'ok';
        if (status === 'fail') out.ok = false;
        out.systems.push({ id: s.id, phase: s.phase, p50: r2(p50 || 0), p95: r2(s.p95 || 0), budget, status, enabled: s.enabled !== false, error: s.error || null, level: s.level || 0 });
      }
      return out;
    }
  }
  const n = worldPerfNode(spec, E, { ticks: 150 });
  out.by = 'life+order';
  for (const [id, v, b] of [['life', n.lifeTickMs, WORLD_BUDGET.lifeTickMs.budget], ['order', n.orderMs, WORLD_BUDGET.orderMs.budget]]) {
    const status = v == null ? 'n/a' : v > b * WORLD_FAIL_FACTOR ? 'fail' : v > b ? 'warn' : 'ok';
    if (status === 'fail') out.ok = false;
    out.systems.push({ id, p50: v, p95: null, budget: b, status });
  }
  return out;
}

export function worldPerfProfileText(p, title = '') {
  const out = [`per-system profile${title ? ': ' + title : ''} (${p.by || 'n/a'}, ${p.seconds} s; fail at 1.2x budget)`];
  for (const s of p.systems) out.push(`  ${String(s.status).padEnd(4)} ${String(s.id).padEnd(12)} p50 ${s.p50} ms  p95 ${s.p95 == null ? '-' : s.p95} ms  budget ${s.budget == null ? '-' : s.budget} ms${s.error ? '  ERROR ' + s.error : ''}${s.level ? '  degraded ' + s.level : ''}`);
  if (p.error) out.push('  error: ' + p.error);
  return out.join('\n');
}

/**
 * The browser gates (F1, F2, Z1): both sizes x both extremes, GPU on (the caller launches Chrome with it), CPU throttle 4.
 * o: { id, seconds, throttle (4), sizes, extremes }. Returns [{ size, extreme, at, measures, check }].
 */
export async function worldPerfMatrix(chrome, spec, o = {}) {
  const out = [];
  for (const sz of o.sizes || WORLD_PERF_SIZES) for (const ex of o.extremes || WORLD_PERF_EXTREMES) {
    const at = worldPerfAt(ex, spec);
    let m;
    try { m = await worldPerfBrowser(chrome, spec, { id: (o.id || 'perf') + '-' + sz.id + '-' + ex.id, seconds: o.seconds || 4, throttle: o.throttle == null ? 4 : o.throttle, at, wx: ex.wx, size: sz.size, dpr: sz.dpr }); }
    catch (e) { m = { error: e.message }; }
    out.push({ size: sz.id, extreme: ex.id, at, measures: m, check: m.error ? { ok: false, lines: [], error: m.error } : worldPerfCheck(m) });
  }
  return out;
}

/** Lines against the budget. A value over budget warns; over 1.2 x budget fails. orderViolations: any is a fail. */
export function worldPerfCheck(measures) {
  const lines = [];
  for (const [k, b] of Object.entries(WORLD_BUDGET)) {
    const v = measures[k];
    if (WORLD_INFO.has(k) && Number.isFinite(v)) { lines.push({ item: k, label: b.label + ' [informational]', value: r2(v), budget: b.budget, unit: b.unit, ratio: b.budget ? r2(v / b.budget) : null, status: 'info' }); continue; }
    if (v == null || !Number.isFinite(v)) { lines.push({ item: k, label: b.label, value: null, budget: b.budget, unit: b.unit, ratio: null, status: 'n/a' }); continue; }
    const ratio = b.budget ? v / b.budget : (v > 0 ? Infinity : 0);
    const status = k === 'orderViolations' ? (v > 0 ? 'fail' : 'ok') : ratio > WORLD_FAIL_FACTOR ? 'fail' : ratio > 1 ? 'warn' : 'ok';
    lines.push({ item: k, label: b.label, value: r2(v), budget: b.budget, unit: b.unit, ratio: Number.isFinite(ratio) ? r2(ratio) : null, status });
  }
  return { ok: !lines.some(l => l.status === 'fail'), lines };
}

export function worldPerfText(check, title = '') {
  const out = [title ? `world perf: ${title}` : 'world perf'];
  for (const l of check.lines) out.push(`  ${l.status.padEnd(4)} ${l.item.padEnd(16)} ${l.value == null ? 'n/a' : String(l.value) + l.unit}`.padEnd(48) + ` budget ${l.budget}${l.unit}   ${l.label}`);
  out.push(check.ok ? '  within budget (fail at 1.2x)' : '  OVER BUDGET');
  return out.join('\n');
}

/**
 * The life sim of a spec in Node for `seconds` at 15 Hz with every check of 8.3 / 8.6, each failure a red mark:
 * forbidden (an agent on a cell its layer forbids), float (a floater or wader off the water level), pop / vanish (appearing or
 * leaving off a spawn cell), stuck (a walking agent that has not moved 0.3 m in 20 s), order (worldOrderCheck, every 2 s).
 */
export function worldMotion(E, spec, o = {}) {
  const seconds = o.seconds || 600, dt = 1 / 15;
  const world = E.worldBuild(spec, { season: 'summer' });
  const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0);
  const waterY = typeof world.waterY === 'number' ? world.waterY : world.cam && typeof world.cam.water === 'number' ? world.cam.water : 0;
  const isSpawn = typeof E.worldLifeIsSpawn === 'function' ? (L, x, z) => E.worldLifeIsSpawn(life, L, x, z) : null;
  const red = [], tracks = new Map(), seen = new Set();
  const mark = (t, a, rule, msg) => { if (red.length < 2000) red.push({ t, id: a.id, cls: a.cls, rule, msg, x: a.x, z: a.z, y: a.y }); };
  let prev = new Map((E.worldAgents(life) || []).map(a => [a.id, a]));
  for (const a of prev.values()) seen.add(a.id);
  const still = new Map();
  for (let i = 1, t = dt; t <= seconds; i++, t += dt) {
    E.worldLifeTick(life, dt);
    const now = E.worldAgents(life) || [], cur = new Map();
    for (const a of now) {
      cur.set(a.id, a);
      if (E.worldNavOk && a.layer !== 'air' && !a.host && !E.worldNavOk(nav, a.layer, a.x, a.z, 0)) mark(t, a, 'forbidden', `on a forbidden ${a.layer} cell at (${a.x.toFixed(2)}, ${a.z.toFixed(2)})`);
      if ((a.layer === 'swim' || a.layer === 'wade') && !a.host && Math.abs((a.y || 0) - waterY) > 1e-6) mark(t, a, 'float', `y ${a.y} but the water is at ${waterY}`);
      if (!prev.has(a.id) && !seen.has(a.id)) { seen.add(a.id); if (isSpawn && !a.host && a.layer !== 'air' && !isSpawn(a.layer, a.x, a.z)) mark(t, a, 'pop', 'appeared off a spawn cell'); }
      if (i % 15 === 0) {
        if (!tracks.has(a.id)) tracks.set(a.id, { cls: a.cls, pts: [] });
        tracks.get(a.id).pts.push([a.x, a.z, a.y || 0]);
        const st = still.get(a.id), moving = a.state === 'walk' || a.state === 'swim';
        if (!st || Math.hypot(a.x - st.x, a.z - st.z) > 0.3 || !moving) still.set(a.id, { x: a.x, z: a.z, t });
        else if (t - st.t > 20 && !st.marked) { st.marked = true; mark(t, a, 'stuck', `${a.state} but has not moved 0.3 m in 20 s`); }
      }
    }
    for (const [id, a] of prev) if (!cur.has(id) && isSpawn && !a.host && a.layer !== 'air' && !isSpawn(a.layer, a.x, a.z)) mark(t, a, 'vanish', 'left the scene off a spawn cell');
    if (i % 30 === 0 && E.worldHostOrderCheck) {
      const v = E.worldHostOrderCheck(world, now, world.cam) || [];
      for (const x of v.slice(0, 3)) red.push({ t, id: x.a + '/' + x.b, cls: 'order', rule: 'order', msg: x.why, x: null, z: null });
    }
    prev = cur;
  }
  return { seconds, agentsSeen: seen.size, red, tracks: [...tracks.entries()].map(([id, v]) => ({ id, cls: v.cls, pts: v.pts })) };
}

/** The overlay: the statics' still (the v2 SVG of the derived data) with each agent's track (green) and the red marks. */
export function worldMotionSvg(E, spec, r) {
  const cam = E.sceneCamera({ camera: spec.camera });
  const P = (x, z, y) => { const p = E.sceneProject(cam, x, Math.max(0.3, z), y); return [Math.round(p.X * 10) / 10, Math.round(p.Y * 10) / 10]; };
  let bg = '';
  try { const d = E.worldHostV2Data(spec, { id: 'motion' }); bg = E.sceneSvg ? E.sceneSvg(d, { season: 'summer', renderer: 'svg' }) : ''; } catch (e) { bg = ''; }
  const img = bg ? `<image href="data:image/svg+xml;base64,${Buffer.from(bg).toString('base64')}" width="1600" height="900" opacity="0.75"/>` : '<rect width="1600" height="900" fill="#dde"/>';
  const lines = r.tracks.filter(t => t.pts.length > 1).map(t => `<polyline fill="none" stroke="#1a9a3a" stroke-width="1.5" stroke-opacity="0.8" points="${t.pts.map(p => P(p[0], p[1], p[2]).join(',')).join(' ')}"/>`);
  const marks = r.red.filter(m => m.x != null).map(m => { const p = P(m.x, m.z, m.y); return `<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="none" stroke="#e01010" stroke-width="2.5"><title>${m.rule}: ${String(m.msg).replace(/[<&"]/g, '')}</title></circle>`; });
  const cap = `<text x="12" y="26" font-family="system-ui" font-size="18" fill="${r.red.length ? '#c00' : '#060'}">${r.agentsSeen} agents, ${r.seconds} s, ${r.red.length} red mark(s)</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">${img}${lines.join('')}${marks.join('')}${cap}</svg>`;
}

