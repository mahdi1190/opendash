// The invariant checker on the REAL rendered frames (docs/dev/WORLD_ENGINE.md 16.2; requirements section 16 item 2, A2-A6, Y4).
// Node >= 20, no dependencies.
//
// The Node run (adversarial.mjs worldInvariantRun) checks a simulation that is built the way the page builds it. This one checks
// the page itself: one scene page in real Chrome, the host's clock stopped, the life advanced to each scene time t, the frame
// DRAWN, and then the frame record of exactly what that draw put on the canvas (79-world-5frame.js worldFrameDrawn: the same
// agents at the same scene time, after the draw's own drops: the near band, the frame sides, the governor's thinning) goes to
// worldInvariants, with the previous frame kept (popping, stuck, sliding feet) over the WHOLE loop.
//
//   worldBrowserInvariants(chrome, src, o)  -> { cells: [{ label, frames, agents, violations, counts, first, error }], errors }
//     src: { spec, id, ref } as the other browser tools take it; o: { moments (worldMomentsOf), seconds (default the loop), hz
//     (default 2), size, root, rules, skip, onCell }
import { worldPageOpen } from './sheet.mjs';

const R2 = (v) => Math.round(v * 100) / 100;

/** The page-side step: draw already happened; check the frame the draw produced. The tracker lives in the page (window.__worldInv). */
const CHECK = (id, t, reset, rules, skip) => `(() => {
  try {
    if (${reset ? 'true' : 'false'} || !window.__worldInv) window.__worldInv = typeof worldInvariantTracker === 'function' ? worldInvariantTracker() : null;
    const rec = typeof worldHostLive === 'function' ? worldHostLive(${JSON.stringify(id)}) : null;
    if (!rec) return { error: 'no live world ' + ${JSON.stringify(id)} };
    const fr = typeof worldFrameDrawn === 'function' ? worldFrameDrawn(${JSON.stringify(id)}) : null;
    if (!fr) return { error: 'nothing drawn yet (the compositor has not run for this world)' };
    const life = rec.driver && typeof rec.driver.life === 'function' ? rec.driver.life() : null;
    const o = { world: rec.world, track: window.__worldInv, isSpawn: (e) => { try { return !!(life && typeof worldLifeIsSpawn === 'function' && worldLifeIsSpawn(life, e.layer, e.x, e.z)); } catch (e2) { return false; } } };
    ${rules ? 'o.rules = ' + JSON.stringify(rules) + ';' : ''}
    ${skip ? 'o.skip = ' + JSON.stringify(skip) + ';' : ''}
    const stats = {}; o.stats = stats;
    const v = worldInvariants(fr, o);
    const agents = fr.ents.filter(e => e.static === false).length;
    return { n: v.length, agents, t: fr.t, resets: rec.stats ? rec.stats.resets : null, resetting: !!rec.resetting, lastReset: rec.stats && rec.stats.lastReset || null, v: v.slice(0, 40).map(x => ({ rule: x.rule, id: x.id, msg: x.msg })), na: stats.na || [] };
  } catch (e) { return { error: String(e && e.stack || e) }; }
})()`;

/** One cell: the whole loop at hz checks a second on a page that is already at the cell's moment. */
async function runLoop(chrome, page, id, o) {
  const seconds = o.seconds, hz = o.hz, step = 1 / hz, counts = {}, first = {}, all = [];
  let frames = 0, agentsMax = 0, error = null, resets = null;
  const na = new Set();
  for (let k = 0; k * step <= seconds + 1e-9; k++) {
    const t = Math.round(k * step * 1000) / 1000;
    let ok;
    try { ok = await page.frameAt(t); } catch (e) { error = 'frame ' + t + ': ' + e.message; break; }
    if (ok !== true) { error = 'no canvas renderer'; break; }
    const r = await chrome.evaluate(CHECK(id, t, k === 0, o.rules, o.skip));
    if (!r || r.error) { error = (r && r.error) || 'no result'; break; }
    // the frame checked must be the frame asked for: a clock that drifted (the host's own loop, a reset in idle time) makes every
    // frame-to-frame rule (popping, stuck, sliding feet) meaningless, so it is an error of the run, never a violation of the scene
    if (Math.abs(r.t - t) > 0.05 || r.resetting || (k > 0 && resets != null && r.resets !== resets)) { error = `the clock drifted: asked for t ${t}, drew ${r.t} (resets ${resets} -> ${r.resets}, resetting ${r.resetting}, why ${JSON.stringify(r.lastReset)})`; break; }
    resets = r.resets;
    frames++; agentsMax = Math.max(agentsMax, r.agents);
    for (const n of r.na || []) na.add(n);
    for (const v of r.v) {
      counts[v.rule] = (counts[v.rule] || 0) + 1;
      if (!first[v.rule]) first[v.rule] = Object.assign({ t }, v);
      if (all.length < 60) all.push(Object.assign({ t }, v));
    }
    // r.n can exceed the 40 kept per frame: count the rest under their rule is not possible, so note it
    if (r.n > r.v.length) counts._more = (counts._more || 0) + (r.n - r.v.length);
  }
  const uniq = Object.values(counts).reduce((a, b) => a + b, 0);
  return { frames, agents: agentsMax, violations: all, counts, first, uniq, na: [...na], error };
}

/**
 * Open the scene once and check every moment of o.moments (re-lit, not reloaded). o.moments: [{ label, at (ISO), wx? }].
 */
export async function worldBrowserInvariants(chrome, src, o = {}) {
  const loop = Number.isFinite(o.loop) ? o.loop : 360, seconds = Number.isFinite(o.seconds) ? o.seconds : loop, hz = o.hz || 2;
  const size = o.size || { w: 1600, h: 900 }, cells = [], errors = [];
  const moments = o.moments && o.moments.length ? o.moments : [{ label: 'now', at: null }];
  const id = (src.spec ? (src.id || (src.ref ? src.ref.split('/').pop() : 'world')) + '~w3' : null);
  let page = null;
  for (const m of moments) {
    try {
      if (!page) page = await worldPageOpen(chrome, src, { size, at: m.at || null, wx: m.wx || null, root: o.root, live: true, freeze: true });
      else await page.set({ at: m.at, wx: m.wx || null });
      await page.rewind();
    } catch (e) { errors.push(`${m.label}: ${e.message}`); cells.push({ label: m.label, frames: 0, agents: 0, violations: [], counts: {}, first: {}, uniq: 0, error: e.message }); continue; }
    const live = id || (await chrome.evaluate(`typeof _wh5Live !== 'undefined' ? [..._wh5Live.keys()][0] : null`));
    const r = await runLoop(chrome, page, live, { seconds: Number.isFinite(m.seconds) ? m.seconds : seconds, hz, rules: o.rules, skip: o.skip });
    for (const e of await page.errors()) errors.push(`${m.label}: page: ${e}`);
    const cell = Object.assign({ label: m.label }, r);
    cells.push(cell);
    if (typeof o.onCell === 'function') o.onCell(cell);
  }
  return { cells, errors, size: { w: size.w, h: size.h }, hz, seconds, R2 };
}
