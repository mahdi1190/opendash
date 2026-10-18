// Walking in place: the measurement (docs/dev/WORLD_ENGINE.md 16.2 `walkInPlace`, SCENE_LESSONS section AA). Node >= 20, no dependencies.
//
// The user (18 Oct): "so many people just walking in place". The engine's own checks were green because they compared the legs with
// the shown velocity (the number the legs are made from). This measures what is DRAWN: per person (and dog) per frame, from the frame
// record (Node: render's worldFrameAt over the life sim; --browser: the record of what Chrome drew, worldFrameDrawn), the ground speed
// and the screen speed over the last 0.5 s, the clip and its rate, the view, the distance and the gait, with the engine's own
// classifier (79-world-9inv.js worldWalkInPlace: held, slip, flat) and the CAUSE read from the life sim (pinch yield, pushed back by
// the separation pass, group follower, taut lead, queue, sidestep, a side-only figure seen end-on, an end-on view).
//
//   worldInPlaceRun(E, spec, o)               -> report (Node)      o: { ms, wx, seconds (120), hz (10) }
//   worldInPlaceBrowser(chrome, src, o)       -> report (the page)  o: { at, seconds (60), hz (10), root, size }
//   worldInPlaceText(report, id)              -> printable lines
//   report: { frames, samples (person-frames with a box), striding (drawn with legs), far (striding under the LOD: no legs drawn),
//             faults, share (faults / samples), sustained (faults lasting over the grace, what the invariant reports), byCause, byView,
//             worst: [{ id, obj, n, cause, view }] }
import { worldSimOf } from './adversarial.mjs';

const R3 = (v) => Math.round(v * 1000) / 1000;

/** The cause of a fault from the life agent (raw life record) and the frame record mover. */
export function inPlaceCause(fault, m, a, lifeT, sideOnly) {
  if (fault === 'flat') return sideOnly ? 'flat:side-only art seen end-on' : 'flat:' + (m.view || '?') + ' view';
  const p = fault + ':';
  if (!a) return p + 'other';
  if (a.yieldPinch != null && lifeT - a.yieldPinch < 0.3) return p + 'pinch yield';
  if (a.squeezed != null && lifeT - a.squeezed < 0.25) return p + 'pushed back (separation)';
  if (a.held != null && lifeT - a.held < 0.3) return p + 'queue or taut lead (stands)';
  if (a.leader) return p + 'group follower';
  if (a.taut || (a.members && a.members.some(q => q.lead && Math.hypot(q.x - a.x, q.z - a.z) > q.lead.len * 0.9))) return p + 'taut lead';
  if (a.slow != null && a.slow < 0.5) return p + 'queue';
  if (a.sideV > 0.01) return p + 'sidestep';
  if (a.turning) return p + 'turning';
  return p + 'other';
}

function newReport() { return { frames: 0, samples: 0, striding: 0, far: 0, faults: 0, sustained: 0, share: 0, sustainedShare: 0, byCause: {}, byView: {}, per: new Map() }; }
function add(R, m, res, cause, sustained) {
  R.samples++;
  if (!res) return;
  R.striding++;
  if (!res.fault) return;
  R.faults++; if (sustained) R.sustained++;
  R.byCause[cause] = (R.byCause[cause] || 0) + 1;
  R.byView[m.view || '?'] = (R.byView[m.view || '?'] || 0) + 1;
  let p = R.per.get(m.id); if (!p) R.per.set(m.id, p = { id: m.id, obj: m.obj, n: 0, causes: {}, views: {} });
  p.n++; p.causes[cause] = (p.causes[cause] || 0) + 1; p.views[m.view] = (p.views[m.view] || 0) + 1;
}
function finish(R) {
  R.share = R.samples ? R3(R.faults / R.samples) : 0;
  R.sustainedShare = R.samples ? R3(R.sustained / R.samples) : 0;
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  R.worst = [...R.per.values()].sort((a, b) => b.n - a.n).slice(0, 8).map(p => ({ id: p.id, obj: p.obj, n: p.n, cause: top(p.causes)[0], view: top(p.views)[0] }));
  delete R.per;
  return R;
}
const isPerson = (m) => m && m.static === false && /^(person\.|animal\.dog)/.test(String(m.obj || '')) && m.layer !== 'drive';

/** The Node run: the life sim, the real frame record (worldFrameAt), the engine's classifier. */
export function worldInPlaceRun(E, spec, o = {}) {
  const seconds = o.seconds || 120, hz = o.hz || 10, sim = worldSimOf(E, spec, o), R = newReport();
  if (!sim.world || typeof E.worldWalkInPlace !== 'function') return Object.assign(finish(R), { error: sim.error || 'worldWalkInPlace is not loaded' });
  const H = new Map(), sideOnly = (obj) => { try { const d = E.sceneObj(obj); return !(d && d.views && !Array.isArray(d.views)); } catch { return false; } };
  for (let i = 0; i <= seconds * hz; i++) {
    if (i) sim.step(1 / hz);
    const fr = sim.frame(), L = sim.life, raw = new Map(((L && L.agents) || []).map(a => [String(a.id), a]));
    R.frames++;
    for (const m of fr.ents) {
      if (!isPerson(m)) continue;
      let h = H.get(m.id); if (!h) H.set(m.id, h = {});
      const res = E.worldWalkInPlace(m, h, sim.t);
      if (!res && m.anim && m.anim.state === 'move' && m.box && m.box[3] - m.box[1] < 14) R.far++;
      if (res && res.fault) { if (h.bad == null || h.fault !== res.fault) { h.bad = sim.t; h.fault = res.fault; } } else h.bad = null;
      const sus = !!(res && res.fault && sim.t - h.bad >= (E.WORLD_INPLACE ? E.WORLD_INPLACE.grace : 0.6));
      add(R, m, res, res && res.fault ? inPlaceCause(res.fault, m, raw.get(String(m.id)), L ? L.t : 0, sideOnly(m.obj)) : null, sus);
    }
  }
  return finish(R);
}

/** The page: the life the page runs, the frame record of what it DREW at each pinned scene time, the same classifier in the page. */
export async function worldInPlaceBrowser(chrome, src, o = {}) {
  const { worldPageOpen } = await import('./sheet.mjs');
  const seconds = o.seconds || 60, hz = o.hz || 10, R = newReport(), errors = [];
  const page = await worldPageOpen(chrome, src, { size: o.size || { w: 1600, h: 900 }, at: o.at || null, wx: o.wx || null, root: o.root, live: true, freeze: true });
  await page.rewind();
  const id = (src.id || (src.ref ? src.ref.split('/').pop() : 'world')) + '~w3';
  await chrome.evaluate('window.__wip = new Map(); true');
  for (let k = 0; k <= seconds * hz; k++) {
    const t = Math.round(k / hz * 1000) / 1000;
    if (await page.frameAt(t) !== true) { errors.push('no canvas renderer'); break; }
    const r = await chrome.evaluate(`(() => { try {
      const fr = worldFrameDrawn(${JSON.stringify(id)}); if (!fr) return { error: 'nothing drawn' };
      const rec = worldHostLive(${JSON.stringify(id)}), L = rec.driver && rec.driver.life ? rec.driver.life() : null, raw = new Map((L ? L.agents : []).map(a => [String(a.id), a]));
      const out = [];
      for (const m of fr.ents) {
        if (!(m.static === false && /^(person\\.|animal\\.dog)/.test(String(m.obj || '')) && m.layer !== 'drive')) continue;
        let h = window.__wip.get(m.id); if (!h) window.__wip.set(m.id, h = {});
        const res = worldWalkInPlace(m, h, fr.t);
        if (res && res.fault) { if (h.bad == null || h.fault !== res.fault) { h.bad = fr.t; h.fault = res.fault; } } else h.bad = null;
        const a = raw.get(String(m.id)) || null, d = typeof sceneObj === 'function' ? sceneObj(m.obj) : null;
        out.push({ id: m.id, obj: m.obj, view: m.view, H: m.box ? m.box[3] - m.box[1] : 0, move: !!(m.anim && m.anim.state === 'move'), res, sus: !!(res && res.fault && fr.t - h.bad >= WORLD_INPLACE.grace), sideOnly: !(d && d.views && !Array.isArray(d.views)),
          a: a ? { yieldPinch: a.yieldPinch, squeezed: a.squeezed, held: a.held, leader: !!a.leader, taut: !!(a.members && a.members.some(q => q.lead && Math.hypot(q.x - a.x, q.z - a.z) > q.lead.len * 0.9)), slow: a.slow, sideV: a.sideV, turning: a.turning } : null, lifeT: L ? L.t : 0 });
      }
      return { t: fr.t, out };
    } catch (e) { return { error: String(e && e.stack || e) }; } })()`);
    if (!r || r.error) { errors.push((r && r.error) || 'no result'); break; }
    R.frames++;
    for (const q of r.out) {
      if (!q.res && q.move && q.H < 14) R.far++;
      add(R, q, q.res, q.res && q.res.fault ? inPlaceCause(q.res.fault, q, q.a, q.lifeT, q.sideOnly) : null, q.sus);
    }
  }
  for (const e of await page.errors()) errors.push('page: ' + e);
  return Object.assign(finish(R), { errors });
}

export function worldInPlaceText(R, id) {
  const pc = (v) => (v * 100).toFixed(1) + ' %';
  const lines = [`${id}: ${R.frames} frames, ${R.samples} person-frames, ${R.striding} drawn striding with legs, ${R.far} striding under the LOD (no legs drawn)`,
    `  walking in place: ${R.faults} person-frames (${pc(R.share)} of person-time), ${R.sustained} past the 0.6 s grace (${pc(R.sustainedShare)}: what walkInPlace reports)`];
  for (const [k, n] of Object.entries(R.byCause).sort((a, b) => b[1] - a[1])) lines.push(`    ${k.padEnd(36)} ${String(n).padStart(6)}`);
  if (R.worst && R.worst.length) { lines.push('  worst:'); for (const w of R.worst) lines.push(`    ${String(w.id).padEnd(10)} ${String(w.obj).padEnd(24)} ${String(w.n).padStart(5)} frames, mostly ${w.cause} (${w.view})`); }
  for (const e of R.errors || []) lines.push('  ERROR ' + e);
  if (R.error) lines.push('  ERROR ' + R.error);
  return lines.join('\n');
}
