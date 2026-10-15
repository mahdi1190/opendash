// `scene check` (merge package "checks", 15 Oct): the per-frame mover invariants over a FULL loop that really advances t, and
// (--browser) drawn vs simulated on the real canvas renderer.
//
//   node tools/anim-pack.mjs scene check <ref>[,<ref>...] [--pack <id>] [--loop 300] [--hz 4] [--browser] [--probe 12]
//       [--out <dir>] [--baseline <report.json>] [--json] [--crowd off]
//
// Node (always): sceneXInvariantLoop (src/app/78-scene-x-inv.js, ported from the world engine's 79-world-9inv.js) runs every
// 1 / hz s over --loop seconds: bodiesOverlap, offLayer, throughSolid, floaterLevel, nearBand, pop, teleport, faceSlide, stuck.
// It runs twice per view: `base` (the movers' own places, sceneActorAt / sceneActorAtV2 / sceneFlowAgents) and `now` (through
// the crowd pass sceneXCrowdAt when it is loaded and on; the same as base when it is not). Counts per rule are printed side by side.
//
// --browser: the scene loads in headless Chrome; its clock is stopped and every probe frame is drawn at its own t (12 frames spread
// over the loop, --probe). Drawn vs simulated: the renderer's own calls to sceneActorAt / sceneActorAtV2 / sceneFlowAgents at that
// t are recorded (what the simulation has; ground movers: people, dogs, grazers, water birds, boats), then the frame is drawn again
// with ONE mover hidden; a mover on screen (alpha > 0.3)
// whose box shows no pixel change was simulated but not drawn, unless a nearer static covers it (occludedBy) or it is turning round
// (the canvas narrows a turning sprite through side-on: |facing| < 0.35 draws next to nothing). Package 1's records
// (renderer.stats().movers with window.__sceneOpts.records, and __sceneOpts.moversOff) are used when the renderer has them.
// Also an 8-frame strip PNG (<out>/<ref>-strip.png) to show the motion, and a frozen-clock check (the probe frames must differ).
//
// --out writes <out>/report.json: { generated, loop, hz, views: { ref: { base, now, drawn } }, totals }. --baseline <report.json>
// compares `now` with that file's `now`: exit 1 only when an error rule's count rose. Without it: exit 1 on any error-level
// violation now (or any missing drawing with --browser).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fileSafe = (s) => String(s).replace(/[\\/:*?"<>|#]+/g, '__');
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);

/** The page side of drawn vs simulated (evaluated in the scene page; needs 78-scene-x-inv.js and the canvas host loaded). */
const PAGE_INSTALL = `(() => {
  if (window.__scx) return true;
  const rec = typeof _schHosts !== 'undefined' ? [..._schHosts.values()].find(r => r.r) : null;
  if (!rec) return 'no canvas renderer on the page: ' + JSON.stringify(window.__sceneErrors);
  rec.still = true; rec.r.stop();
  const R = rec.r, C = R.compiled, cv = rec.canvas || document.querySelector('.sc-canvas');
  if (!C || !cv) return 'no compiled scene or canvas';
  const cx = cv.getContext('2d'), G = R.geometry;
  const st = { hide: null, hideF: null, cur: null, seen: new Map(), flows: [] };
  const HID = ${JSON.stringify({ x: -1e5, y: -1e5, X: -1e5, Y: -1e5, s: 0, alpha: 0, dir: 1, flip: false, d: 1e5 })};
  const o1 = sceneActorAt, o2 = typeof sceneActorAtV2 === 'function' ? sceneActorAtV2 : null, o3 = typeof sceneFlowAgents === 'function' ? sceneFlowAgents : null;
  const hid = (a) => st.hide === 'all' || (st.hide && st.hide.has(a));
  window.sceneActorAt = function (a, t) { if (hid(a)) return Object.assign({}, HID); const p = o1(a, t); if (t === st.cur && p && !st.seen.has(a)) st.seen.set(a, { v2: false, X: p.x, Y: p.y, s: p.s, dir: p.dir, alpha: p.alpha == null ? 1 : p.alpha }); return p; };
  if (o2) window.sceneActorAtV2 = function (a, t, cam) { if (hid(a)) return Object.assign({}, HID); const p = o2(a, t, cam); if (t === st.cur && p) st.seen.set(a, { v2: true, X: p.X, Y: p.Y, s: p.s, dir: p.flip ? -1 : 1, alpha: p.alpha == null ? 1 : p.alpha }); return p; };
  if (o3) window.sceneFlowAgents = function (C2, t, L, opt) {
    let out = o3(C2, t, L, opt);
    if (st.hideF === 'all') out = [];
    else if (st.hideF) out = out.filter(g => !st.hideF.has(g.flow + '.' + g.lane + '.' + g.k));
    if (st.cur != null && Math.abs(t - st.cur) < 1e-3 && !st.hideF) st.flows = out.slice();
    return out;
  };
  const dev = (b) => [Math.max(0, Math.floor(b[0] * G.vs + G.ox)), Math.max(0, Math.floor(b[1] * G.vs + G.oy)), Math.min(G.W, Math.ceil(b[2] * G.vs + G.ox)), Math.min(G.H, Math.ceil(b[3] * G.vs + G.oy))];
  const grab = (r) => (r[2] > r[0] && r[3] > r[1] ? cx.getImageData(r[0], r[1], r[2] - r[0], r[3] - r[1]).data : null);
  const diff = (A, B) => { let n = 0; if (!A || !B) return 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) n++; return n; };
  const season = C.season || 'summer';
  const boxOf = (it) => {
    let sh = null; try { sh = sceneObjShapes(it.o, it.v || 0, it.season || season); } catch (e) { sh = null; }
    if (!sh || !sh.box) return null;
    const b = sh.box, s = it.s || 1;
    return [it.flip ? it.x - b[2] * s : it.x + b[0] * s, it.y + b[1] * s, it.flip ? it.x - b[0] * s : it.x + b[2] * s, it.y + b[3] * s];
  };
  let statics = null;
  const occluder = (m, box) => {
    if (!statics) statics = (C.items || []).map((it, i) => ({ it, i, b: boxOf(it), d: it.g && Number.isFinite(it.g.d) ? it.g.d : null })).filter(q => q.b);
    const area = Math.max(1, (box[2] - box[0]) * (box[3] - box[1]));
    let best = null, bestCov = 0;
    for (const q of statics) {
      // nearer than the mover: its depth when both have one, else its foot row lower on the screen
      const nearer = q.d != null && Number.isFinite(m.d) ? q.d < m.d - 0.3 : q.it.y > m.Y + 0.5;
      if (!nearer) continue;
      const ov = Math.max(0, Math.min(box[2], q.b[2]) - Math.max(box[0], q.b[0])) * Math.max(0, Math.min(box[3], q.b[3]) - Math.max(box[1], q.b[1]));
      if (ov / area > bestCov) { bestCov = ov / area; best = q; }
    }
    return bestCov >= 0.5 ? { obj: best.it.o, i: best.i, cover: Math.round(bestCov * 100) / 100 } : null;
  };
  const records = () => { try { const s = R.stats(); return Array.isArray(s.movers) ? s.movers : null; } catch (e) { return null; } };
  window.__scx = {
    probe(t) {
      const out = { t, movers: [], source: 'probe' };
      st.hide = null; st.hideF = null; st.seen = new Map(); st.flows = []; st.cur = t;
      if (window.__sceneOpts) window.__sceneOpts.records = true;
      R.frame(t);
      st.cur = null;
      const recs = records();
      const full = cx.getImageData(0, 0, G.W, G.H).data, rowOf = (r, A) => { const w = r[2] - r[0], o = new Uint8ClampedArray(w * (r[3] - r[1]) * 4); for (let y = r[1]; y < r[3]; y++) o.set(A.subarray((y * G.W + r[0]) * 4, (y * G.W + r[2]) * 4), (y - r[1]) * w * 4); return o; };
      const list = [];
      const drawnList = typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : (C.actors || []);
      for (const [a, p] of st.seen) {
        // ground movers only (as the invariants): fliers, bats, insects and sky actors are left out by the renderer by time of day
        if (!(p.alpha > 0.3) || !(p.s > 0) || !sceneXGroundMover(a.o)) continue;
        const ai = drawnList.indexOf(a);
        // its facing now (the canvas's _sccFace): a turn round narrows the sprite through side-on, to nothing at mid-turn
        let face = p.dir;
        if (typeof _sccFace === 'function') { try { face = _sccFace(a, t, { dir: p.dir, s: p.s }, a.ground ? C.cam : null); } catch (e) { face = p.dir; } }
        // the box of its facing (a front or back view is unmirrored, a heading view may swap the object: both facings then)
        const box = sceneXMoverBox({ X: p.X, Y: p.Y, s: p.s, obj: a.o, v: a.v, dir: Math.abs(face) >= 0.99 && !(a.$hv && a.$hv.p && a.$hv.p.vo && a.$hv.p.vo !== a.o) ? Math.sign(face) : 0 }, season);
        if (!box) continue;
        list.push({ id: 'a' + (ai >= 0 ? ai : '?'), obj: a.o, a, layer: a.layer, box, X: p.X, Y: p.Y, d: null, alpha: p.alpha, face });
      }
      for (const g of st.flows) {
        if (!(g.alpha > 0.3)) continue;
        const box = sceneXMoverBox({ X: g.X, Y: g.Y, s: g.s, obj: g.o, v: g.v, dir: g.view === 'front' || g.view === 'back' ? 1 : g.flip ? -1 : 1 }, season);
        if (box) list.push({ id: 'f' + g.flow + '.' + g.lane + '.' + g.k, obj: g.o, key: g.flow + '.' + g.lane + '.' + g.k, box, X: g.X, Y: g.Y, d: g.d, alpha: g.alpha });
      }
      let j = 0;
      for (const m of list) {
        const r = dev(m.box), area = Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
        const full0 = Math.max(1, (m.box[2] - m.box[0]) * (m.box[3] - m.box[1]) * G.vs * G.vs);
        if (area < 16 || area / full0 < 0.3) continue;   // mostly off the canvas
        j++;
        if (m.a) st.hide = new Set([m.a]); else st.hideF = new Set([m.key]);
        R.frame(t + 1e-6 * j);
        st.hide = null; st.hideF = null;
        const ch = diff(rowOf(r, full), grab(r)), need = Math.max(3, Math.round(area * 0.01));
        let status = ch >= need ? 'drawn' : 'missing', occ = null;
        if (status === 'missing' && Number.isFinite(m.face) && Math.abs(m.face) < 0.35) status = 'turning';
        if (status === 'missing') { occ = occluder(m, m.box); if (occ) status = 'occluded'; }
        out.movers.push({ id: m.id, obj: m.obj, layer: m.layer || null, face: Number.isFinite(m.face) ? Math.round(m.face * 100) / 100 : null, box: m.box.map(v => Math.round(v)), px: area, changed: ch, status, occludedBy: occ });
      }
      if (recs) out.records = recs.length;
      R.frame(t);
      return out;
    },
    // package 1's records, when the renderer has them: the boxes of every mover of the last frame, drawn vs moversOff
    probeRecords(t) {
      if (!window.__sceneOpts) return null;
      window.__sceneOpts.records = true; window.__sceneOpts.moversOff = false;
      R.frame(t);
      const recs = records();
      if (!recs || !recs.length) return null;
      const A = cx.getImageData(0, 0, G.W, G.H).data;
      window.__sceneOpts.moversOff = true; R.frame(t + 1e-6); window.__sceneOpts.moversOff = false;
      const B = cx.getImageData(0, 0, G.W, G.H).data, out = [];
      for (const q of recs) {
        if (!q || !q.box) continue;
        const r = dev(q.box);
        if ((r[2] - r[0]) * (r[3] - r[1]) < 16) continue;
        let n = 0;
        for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const i = (y * G.W + x) * 4; if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) n++; }
        out.push({ id: q.id, box: q.box, drawn: q.drawn, occludedBy: q.occludedBy || null, changed: n, status: n > 0 ? 'drawn' : q.occludedBy ? 'occluded' : q.drawn === false ? 'skipped' : 'missing' });
      }
      R.frame(t);
      return { t, movers: out, source: 'records' };
    },
    // one probe frame's pixels, to check that the frames really change over time (the frozen-clock bug of 15 Oct)
    sig(t) { R.frame(t); const d = cx.getImageData(0, 0, G.W, G.H).data, o = []; for (let i = 0; i < d.length; i += 4 * 97) o.push(d[i] >> 3, d[i + 1] >> 3, d[i + 2] >> 3); return o.join(','); },
    strip(ts) {
      const w = 400, h = 225, cols = 4, rows = Math.ceil(ts.length / cols), S = document.createElement('canvas');
      S.width = w * cols; S.height = h * rows;
      const sx = S.getContext('2d');
      ts.forEach((t, i) => {
        R.frame(t);
        sx.drawImage(cv, 0, 0, cv.width, cv.height, (i % cols) * w, Math.floor(i / cols) * h, w, h);
        sx.fillStyle = 'rgba(0,0,0,.6)'; sx.fillRect((i % cols) * w, Math.floor(i / cols) * h, 74, 18);
        sx.fillStyle = '#fff'; sx.font = '12px sans-serif'; sx.fillText('t ' + t.toFixed(1) + ' s', (i % cols) * w + 6, Math.floor(i / cols) * h + 13);
      });
      return S.toDataURL('image/png');
    },
  };
  return true;
})()`;

/** Drawn vs simulated in the browser for one view: { frames, movers, drawn, occluded, missing: [...], source, frozen, strip }. */
async function browserCheck(chrome, page, opts, { loop, frames, stripFile }) {
  await chrome.screenshot({ html: page.scenePageHtml(Object.assign({}, opts, { still: false, renderer: 'canvas', dpr: 1 })), width: 1600, height: 900, scale: 1, transparent: false });
  const ready = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 30000))])');
  if (ready !== true) throw new Error('scene page did not get ready: ' + ready + ' ' + JSON.stringify(await chrome.evaluate('window.__sceneErrors')));
  const ok = await chrome.evaluate(PAGE_INSTALL);
  if (ok !== true) throw new Error(String(ok));
  const ts = Array.from({ length: frames }, (_, k) => Math.round((loop * (k + 0.5) / frames) * 100) / 100);
  const res = { frames: ts.length, movers: 0, drawn: 0, occluded: 0, turning: 0, missing: [], source: 'probe', frozen: false };
  for (const t of ts) {
    let r = await chrome.evaluate(`window.__scx.probeRecords(${t})`);
    if (!r) r = await chrome.evaluate(`window.__scx.probe(${t})`);
    res.source = r.source;
    for (const m of r.movers) {
      res.movers++;
      if (m.status === 'drawn') res.drawn++;
      else if (m.status === 'occluded') res.occluded++;
      else if (m.status === 'turning') res.turning++;
      else if (m.status === 'missing') res.missing.push(Object.assign({ t }, m));
    }
  }
  // the clock: the probe frames must not all look the same (a frozen clock draws the base moment every time)
  const sigs = new Set();
  for (const t of ts.slice(0, 4)) sigs.add(await chrome.evaluate(`window.__scx.sig(${t})`));
  res.frozen = sigs.size < 2;
  if (stripFile) {
    const st = Array.from({ length: 8 }, (_, k) => Math.round(Math.min(loop, 60) * k / 8 * 100) / 100);
    const url = await chrome.evaluate(`window.__scx.strip(${JSON.stringify(st)})`);
    writeFileSync(stripFile, Buffer.from(String(url).replace(/^data:image\/png;base64,/, ''), 'base64'));
    res.strip = stripFile;
  }
  return res;
}

export default {
  summary: 'the per-frame mover invariants over a full loop that advances t (bodies overlapping, off layer, through solids, floaters off the water, near band, pops, teleports, face slides, stuck); --browser adds drawn vs simulated',
  usage: 'scene check <ref>[,<ref>...] [--pack <id>] [--loop 300] [--hz 4] [--browser] [--probe 12] [--out <dir>] [--baseline <report.json>] [--json] [--crowd off]',
  options: {
    loop: { type: 'string', help: 'check: the seconds of the loop to run (default 300)' },
    hz: { type: 'string', help: 'check: frames per second of the loop (default 4)' },
    browser: { type: 'boolean', help: 'check: also drawn vs simulated on the real renderer (12 frames over the loop) and an 8-frame strip PNG' },
    probe: { type: 'string', help: 'check --browser: how many frames to probe over the loop (default 12)' },
    baseline: { type: 'string', help: 'check: a report.json to compare with; exit 1 only when an error rule\'s count rose' },
    crowd: { type: 'string', help: 'check: off = the base places only (the crowd pass sceneXCrowdAt switched off for `now`)' },
  },
  async run(args, ctx, lib) {
    const pos = (ctx.positionals || []).filter(x => x !== 'check');
    const reg = lib.loadRegistry(ctx.root, { fresh: true }), E = lib.engineOf(reg);
    const R = (n) => reg.R.get(n), loopFn = R('sceneXInvariantLoop');
    if (typeof loopFn !== 'function') throw new Error('scene check needs sceneXInvariantLoop (src/app/78-scene-x-inv.js) in the registry load (tools/lib/anim-sources.mjs SCENE_FILE_RE)');
    const scenes = lib.selectScenes(reg, E, args, pos);
    if (!scenes.length) throw new Error('scene check needs refs (<pack>/<id>) or --pack');
    const loop = Number(args.loop) > 0 ? Number(args.loop) : 300, hz = Number(args.hz) > 0 ? Number(args.hz) : 4;
    const probe = Number(args.probe) > 0 ? Math.round(Number(args.probe)) : 12;
    const crowdNow = String(args.crowd || '').toLowerCase() !== 'off' && process.env.SCENE_X !== 'off';
    const rules = (R('SCENE_X_INV_RULES') || []).map(r => r.rule), sevOf = Object.fromEntries((R('SCENE_X_INV_RULES') || []).map(r => [r.rule, r.sev]));
    const views = {}, rows = [];
    for (const s of scenes) {
      if (s.kind === 'world') { ctx.out(`skip  ${s.ref}  (a v3 world scene: node tools/world.mjs check)`); continue; }
      const data = s.data(), C = E.compile(data, { season: 'summer', lod: 1, L: null });
      const base = loopFn(C, { seconds: loop, hz, data, crowd: false });
      const now = crowdNow ? loopFn(C, { seconds: loop, hz, data, crowd: true }) : base;
      views[s.ref] = { base: strip(base), now: strip(now), crowd: now.crowd };
      rows.push({ s, base, now });
    }
    // drawn vs simulated (browser)
    if (args.browser) {
      const page = lib.harness;
      if (!page || typeof page.scenePageHtml !== 'function') throw new Error('scene check --browser needs the page harness tools/lib/scene-page.mjs');
      if (args.out) mkdirSync(args.out, { recursive: true });
      await lib.withChrome(args, async (chrome) => {
        for (const { s } of rows) {
          const opts = lib.pageOpts(ctx.root, s, { size: { w: 1600, h: 900 } }, args);
          try {
            const d = await browserCheck(chrome, page, opts, { loop, frames: probe, stripFile: args.out ? join(args.out, fileSafe(s.ref) + '-strip.png') : null });
            views[s.ref].drawn = d;
          } catch (e) { views[s.ref].drawn = { error: e.message }; }
        }
      });
    }
    // print: per view, per rule, base -> now
    const W0 = Math.max(10, ...rows.map(r => r.s.ref.length));
    ctx.out(`${pad('view', W0)}  ${rules.map(r => lpad(r, Math.max(6, r.length))).join(' ')}   (base -> now, ${loop} s at ${hz} Hz${crowdNow ? '' : ', crowd off'})`);
    const totals = { base: {}, now: {} };
    for (const { s, base, now } of rows) {
      const cells = rules.map(r => { const a = base.counts[r] || 0, b = now.counts[r] || 0; totals.base[r] = (totals.base[r] || 0) + a; totals.now[r] = (totals.now[r] || 0) + b; return lpad(a === b ? String(b) : `${a}->${b}`, Math.max(6, r.length)); });
      const d = views[s.ref].drawn;
      ctx.out(`${pad(s.ref, W0)}  ${cells.join(' ')}${d ? d.error ? `   browser: ${d.error}` : `   drawn ${d.drawn}/${d.movers}, occluded ${d.occluded}, turning ${d.turning}, missing ${d.missing.length}${d.frozen ? ', FROZEN CLOCK' : ''}` : ''}`);
      if (now.crowdError) ctx.out(`    note  the crowd pass threw (base places used): ${now.crowdError}`);
      if (!args.json) for (const [rule, list] of Object.entries(now.samples)) for (const v of list.slice(0, 2)) ctx.out(`    ${pad(v.sev, 5)} ${pad(rule, 13)} t ${v.t} s  ${v.msg}`);
      if (!args.json && now !== base) for (const [rule, list] of Object.entries(base.samples)) if (!now.samples[rule]) for (const v of list.slice(0, 2)) ctx.out(`    ${pad(v.sev, 5)} ${pad(rule, 13)} t ${v.t} s  (base only) ${v.msg}`);
      if (d && d.missing) for (const m of d.missing.slice(0, 5)) ctx.out(`    error drawn         t ${m.t} s  ${m.obj} (${m.id}) (layer ${m.layer || '-'}) is simulated on screen (box ${m.box.join(',')}) but its box shows no change: not drawn`);
    }
    ctx.out(`${pad('total', W0)}  ${rules.map(r => lpad(totals.base[r] === totals.now[r] ? String(totals.now[r]) : `${totals.base[r]}->${totals.now[r]}`, Math.max(6, r.length))).join(' ')}`);
    const report = { generated: new Date().toISOString(), loop, hz, crowd: crowdNow, rules: R('SCENE_X_INV_RULES'), views, totals };
    if (args.out) { mkdirSync(args.out, { recursive: true }); writeFileSync(join(args.out, 'report.json'), JSON.stringify(report, null, 1)); ctx.out(`wrote ${join(args.out, 'report.json')}`); }
    if (args.json) ctx.out(JSON.stringify(report));
    // the exit code
    let bad = 0;
    if (args.baseline) {
      if (!existsSync(args.baseline)) throw new Error(`no baseline ${args.baseline}`);
      const B = JSON.parse(readFileSync(args.baseline, 'utf8'));
      for (const [ref, v] of Object.entries(views)) {
        const was = B.views && B.views[ref] && B.views[ref].now ? B.views[ref].now.counts : {};
        for (const r of rules) if (sevOf[r] === 'error' && (v.now.counts[r] || 0) > (was[r] || 0)) { bad++; ctx.out(`REGRESSION  ${ref}  ${r}: ${was[r] || 0} -> ${v.now.counts[r]}`); }
        if (v.drawn && v.drawn.missing && v.drawn.missing.length) bad++;
      }
    } else for (const v of Object.values(views)) { if (v.now.errors > 0) bad++; if (v.drawn && ((v.drawn.missing && v.drawn.missing.length) || v.drawn.frozen || v.drawn.error)) bad++; }
    return bad ? 1 : 0;
  },
};

/** A loop result without its sample objects' bulk (the report keeps the first 5 per rule). */
function strip(r) { return { frames: r.frames, movers: r.movers, crowd: r.crowd, crowdError: r.crowdError || null, counts: r.counts, errors: r.errors, warns: r.warns, pairs: r.pairs, ms: r.ms, samples: r.samples }; }
