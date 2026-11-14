// The world stage's own tools (docs/dev/WORLD_STAGE.md 7): a world (v3) scene through BOTH players at the same scene time.
// Node >= 20, no dependencies. Chrome over a pipe (tools/release-chrome.mjs; WebGL through SwiftShader for the stage). Never the live
// server, never the data folder.
//
//   node tools/stage.mjs render <ref> [--dir=D] [--dates=summer,autumn,night] [--t=4] [--size=1600x900] [--pages]
//        at each date, the world's clock pinned at scene time t: the stage's frame and the canvas path's frame OF THE SAME MOMENT
//        IN THE SAME PAGE (the stage's baker is the canvas renderer: its snapshot draws the same world, life and draw memory):
//        <id>-<date>-canvas.png, <id>-<date>-stage.png, <id>-<date>-pair.png (side by side) and <id>-<date>-diff.png (the
//        difference, amplified), with the mean difference and the share of pixels off by more than 24 levels. --pages: the canvas
//        frame from a page of its own instead (the canvas player as the app runs it; the life there is not the same life: rewinding
//        a world does not rewind its life, so people stand a little elsewhere)
//   node tools/stage.mjs perf <ref> [--date=summer] [--seconds=10] [--json]
//        the load timeline to sc-ready on each player (cold page: the bake, the engine, the game, the uploads, the first frame) and
//        the per-frame CPU over the seconds (the stage's update and the canvas renderer's draw)
//   node tools/stage.mjs flicker <ref> [--date=summer] [--seconds=3] [--fps=30] [--player=stage|canvas]
//        a one-off probe: frames at fps of the pinned clock, the pixels that change and change back within 3 frames (A-B-A)
// <ref>: 'world-test/<id>-w3' or a bare id, as tools/world.mjs takes.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEngine, resolveRef } from './lib/world/convert.mjs';
import { scenePageHtml, repoRoot, stageChromeArgs } from './lib/scene-page.mjs';
import { composeSheet } from './lib/world/sheet.mjs';
import { pngDecode, pngEncode } from './lib/png.mjs';

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = argv.filter(a => !a.startsWith('--'));
const [cmd, ref] = pos;
const root = repoRoot();
const out = (s) => process.stdout.write(s + '\n');
const DATES = { spring: '2026-04-18T14:00:00Z', summer: '2026-07-16T13:00:00Z', autumn: '2026-10-22T13:00:00Z', winter: '2026-01-20T13:00:00Z', night: '2026-07-16T22:30:00Z', dusk: '2026-10-22T17:15:00Z' };
// (tools/world.mjs dateOf: from 53 degrees north a July midnight is twilight, so 'night' is a January midnight there)
const dateOf = (nm, spec) => { const lat = spec && spec.place && Number.isFinite(spec.place.lat) ? spec.place.lat : 51.5; return nm === 'night' && lat > 53 ? '2026-01-20T22:30:00Z' : DATES[nm] || nm; };
const sizeOf = (s) => { const m = /^(\d{2,5})x(\d{2,5})$/.exec(String(s || '')); return m ? { w: +m[1], h: +m[2] } : { w: 1600, h: 900 }; };

function specOf(r) {
  const E = loadEngine({ root });
  const hit = resolveRef(E, r) || resolveRef(E, 'world-test/' + r);
  if (!hit) throw new Error(`unknown scene '${r}'`);
  const spec = E.worldHostSpec ? E.worldHostSpec(hit.item) : null;
  if (!spec) throw new Error(`'${r}' is not a world (v3) scene`);
  return { spec, id: hit.item.id, ref: hit.ref };
}
async function chromeFor() { const { launchChrome } = await import('./release-chrome.mjs'); return launchChrome({ extraArgs: [...stageChromeArgs] }); }

/** Open a page on a player and wait until it is ready (the stage: playing, or fallen back to the canvas: reported). */
async function openPlayer(chrome, s, player, o) {
  const P = s.spec.place || {}, loc = [P.lat != null ? P.lat : 51.5, P.lon != null ? P.lon : -0.1];
  const opts = { root, size: o.size, dpr: 1, still: false, governor: false, renderer: player, at: o.at, location: loc,
    data: `worldHostData(${JSON.stringify(s.spec)}, { id: ${JSON.stringify(s.id)}, sync: true })` };
  if (chrome.emulateMedia) await chrome.emulateMedia([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const t0 = Date.now();
  await chrome.screenshot({ html: scenePageHtml(opts), width: o.size.w, height: o.size.h, scale: 1, transparent: false });
  const ok = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 60000))])');
  if (ok !== true) throw new Error(`${player}: the page did not get ready: ${ok} ${JSON.stringify(await chrome.evaluate('window.__sceneErrors'))}`);
  const st = await chrome.evaluate(`(async () => {
    const t0 = performance.now(); let rec = null;
    while (performance.now() - t0 < 30000) { rec = [..._schHosts.values()].find(r => r.r); if (rec && rec.r.ready && !rec.r.baking) break; await new Promise(r => setTimeout(r, 50)); }
    if (!rec) return { error: 'no host' };
    const s = rec.r.stats();
    return { engine: s.engine || 'canvas', stage: s.stage || null, readyMs: rec.tReady ? Math.round(rec.tReady - rec.tReq) : null };
  })()`);
  st.loadMs = Date.now() - t0;
  return st;
}
/** The world's life from its seed, the clock pinned at t, one frame drawn by the host's renderer; -> the PNG. */
async function frameAt(chrome, s, t, size) {
  const id = s.id + '~w3';
  await chrome.evaluate(`(() => { const rec = [..._schHosts.values()].find(r => r.r); rec.r.stop(); if (typeof worldHostRewind === 'function') worldHostRewind(${JSON.stringify(id)}); return true; })()`);
  // the life advances to t in whole ticks; a few frames on the way (as a page plays), then the frame at t
  for (const u of [t * 0.25, t * 0.5, t * 0.75, t]) {
    await chrome.evaluate(`(() => { const rec = [..._schHosts.values()].find(r => r.r); const live = worldHostLive(${JSON.stringify(id)}); if (live) live.clock.pin(${u}); rec.r.frame(${u}); return true; })()`);
  }
  return chrome.capture({ width: size.w, height: size.h, scale: 1 });
}
/** Mean absolute difference (0..255) and the share of pixels off by more than 24 on any channel; the diff image (x4). */
function diffOf(a, b) {
  const A = pngDecode(a), B = pngDecode(b), n = A.width * A.height, D = { width: A.width, height: A.height, data: Buffer.alloc(n * 4) };
  let sum = 0, off = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 4, dr = Math.abs(A.data[k] - B.data[k]), dg = Math.abs(A.data[k + 1] - B.data[k + 1]), db = Math.abs(A.data[k + 2] - B.data[k + 2]), m = Math.max(dr, dg, db);
    sum += (dr + dg + db) / 3; if (m > 24) off++;
    D.data[k] = Math.min(255, dr * 4); D.data[k + 1] = Math.min(255, dg * 4); D.data[k + 2] = Math.min(255, db * 4); D.data[k + 3] = 255;
  }
  return { mean: Math.round(sum / n * 100) / 100, offShare: Math.round(off / n * 10000) / 100, png: pngEncode(D, { level: 6 }) };
}

async function render() {
  const s = specOf(ref), size = sizeOf(flags.size), T = Number(flags.t) || 4;
  const dir = resolve(typeof flags.dir === 'string' ? flags.dir : join(tmpdir(), 'opendash-world', 'stage'));
  mkdirSync(dir, { recursive: true });
  const names = String(typeof flags.dates === 'string' ? flags.dates : 'summer,autumn,night').split(',');
  const chrome = await chromeFor();
  try {
    for (const nm of names) {
      const at = dateOf(nm, s.spec), files = {}, info = {};
      for (const player of flags.pages ? ['canvas', 'stage'] : ['stage']) {
        info[player] = await openPlayer(chrome, s, player, { size, at });
        const png = await frameAt(chrome, s, T, size);
        files[player] = join(dir, `${s.id}-${nm}-${player}.png`);
        writeFileSync(files[player], png);
        const errs = await chrome.evaluate('window.__sceneErrors || []');
        if (errs.length) info[player].errors = errs.slice(0, 3);
      }
      if (!flags.pages) {
        // both renderers' own pixels of the same moment (no page css over them: the host's vignette): the stage read back right
        // after drawing t, then its baker (the canvas renderer of the same bake: the same world, life and draw memory) at t
        for (const [player, expr] of [['stage', 'rec.r'], ['canvas', '(rec.r.baker || rec.r)']]) {
          const b64 = await chrome.evaluate(`(async () => { const rec = [..._schHosts.values()].find(r => r.r); const c = ${expr}.snapshot(${T});
            const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/png' }) : await new Promise(r => c.toBlob(r, 'image/png'));
            const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); return btoa(s); })()`);
          files[player] = join(dir, `${s.id}-${nm}-${player}.png`);
          writeFileSync(files[player], Buffer.from(b64, 'base64'));
        }
        info.canvas = { engine: 'canvas (the stage\'s baker, same page)' };
      }
      const { readFileSync } = await import('node:fs');
      const d = diffOf(readFileSync(files.canvas), readFileSync(files.stage));
      const diff = join(dir, `${s.id}-${nm}-diff.png`); writeFileSync(diff, d.png);
      const pair = join(dir, `${s.id}-${nm}-pair.png`);
      writeFileSync(pair, await composeSheet(chrome, [{ row: 0, col: 0, label: 'canvas', file: files.canvas, rowLabel: nm }, { row: 0, col: 1, label: 'stage (' + info.stage.engine + ')', file: files.stage }, { row: 0, col: 2, label: 'difference x4', file: diff }],
        { title: `${s.ref} at ${at}, scene time ${T} s`, thumb: { w: 800, h: Math.round(800 * size.h / size.w) } }));
      out(`  ${nm} (${at}): canvas ${files.canvas}`);
      out(`    stage (${info.stage.engine}${info.stage.stage && info.stage.stage.why ? ': ' + info.stage.stage.why : ''}) ${files.stage}`);
      out(`    pair ${pair}  diff ${diff}: mean ${d.mean}, ${d.offShare} % of pixels off by > 24`);
      for (const p of ['canvas', 'stage']) if (info[p].errors) out(`    ${p} page errors: ${JSON.stringify(info[p].errors)}`);
    }
  } finally { await chrome.close(); }
}

async function perf() {
  const s = specOf(ref), size = sizeOf(flags.size), seconds = Number(flags.seconds) || 10, at = dateOf(typeof flags.date === 'string' ? flags.date : 'summer', s.spec);
  const chrome = await chromeFor(), res = {};
  try {
    for (const player of ['canvas', 'stage']) {
      const o = await openPlayer(chrome, s, player, { size, at });
      const r = await chrome.evaluate(`(async () => {
        const rec = [..._schHosts.values()].find(r => r.r);
        rec.r.start();
        await new Promise(r => setTimeout(r, 500));
        rec.r.resetStats();
        const t0 = performance.now(); let frames = 0;
        await new Promise(res => { const f = () => { frames++; if (performance.now() - t0 < ${seconds * 1000}) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
        const s = rec.r.stats();
        return { rafFps: Math.round(frames / ${seconds} * 10) / 10, drawMs: s.drawMs, canvasDrawMs: s.canvasDrawMs || null, engine: s.engine || 'canvas', stage: s.stage || null,
          bakeMs: s.bakeMs, bakeWallMs: s.bakeWallMs, warmWallMs: s.warmWallMs, world: s.passes && s.passes['world-frame'] ? { bakeMs: s.passes['world-frame'].bakeMs, maxPrepareSliceMs: s.passes['world-frame'].maxPrepareSliceMs } : null };
      })()`);
      res[player] = Object.assign({ loadMs: o.loadMs, readyMs: o.readyMs }, r);
    }
  } finally { await chrome.close(); }
  if (flags.json) { out(JSON.stringify(res, null, 1)); return; }
  for (const [p, r] of Object.entries(res)) {
    out(`${p} (${r.engine}${r.stage && r.stage.why ? ': ' + r.stage.why : ''}): sc-ready ${r.readyMs} ms after mount (page ${r.loadMs} ms); bake ${r.bakeMs} ms CPU, ${r.bakeWallMs} ms wall; world bake ${r.world ? r.world.bakeMs : '-'} ms, longest slice ${r.world ? r.world.maxPrepareSliceMs : '-'} ms`);
    out(`  per frame (CPU, ms): median ${r.drawMs.median}, p95 ${r.drawMs.p95}, max ${r.drawMs.max} over ${r.drawMs.n} frames; rAF ${r.rafFps} fps`);
    if (r.stage && r.engine === 'phaser') out(`  stage: engine loaded ${r.stage.engineMs} ms, game ${r.stage.gameMs} ms, baker ready ${r.stage.bakerReadyMs} ms, ready ${r.stage.readyMs} ms (after create); engine parse ${r.stage.engineLoadMs} ms; uploads ${r.stage.uploads} (${r.stage.uploadMs} ms, longest ${r.stage.uploadMax} ms); textures ${r.stage.textures} (${Math.round(r.stage.texBytes / 1048576)} MB); images ${r.stage.images}; shaders ${JSON.stringify(r.stage.shaders)}`);
  }
}

async function flicker() {
  const s = specOf(ref), size = sizeOf(flags.size || '800x450'), seconds = Number(flags.seconds) || 3, fps = Number(flags.fps) || 30, player = flags.player === 'canvas' ? 'canvas' : 'stage';
  const at = dateOf(typeof flags.date === 'string' ? flags.date : 'summer', s.spec), chrome = await chromeFor();
  const frames = [];
  try {
    const o = await openPlayer(chrome, s, player, { size, at });
    const id = s.id + '~w3';
    await chrome.evaluate(`(() => { const rec = [..._schHosts.values()].find(r => r.r); rec.r.stop(); worldHostRewind(${JSON.stringify(id)}); return true; })()`);
    const T0 = Number(flags.t) || 2;
    for (let k = 0; k <= seconds * fps; k++) {
      const t = T0 + k / fps;
      await chrome.evaluate(`(() => { const rec = [..._schHosts.values()].find(r => r.r); const live = worldHostLive(${JSON.stringify(id)}); if (live) live.clock.pin(${t}); rec.r.frame(${t}); return true; })()`);
      frames.push(pngDecode(await chrome.capture({ width: size.w, height: size.h, scale: 1 })));
    }
    out(`${player} (${o.engine}${o.stage && o.stage.why ? ': ' + o.stage.why : ''}), ${frames.length} frames at ${fps} fps from t ${T0}`);
  } finally { await chrome.close(); }
  // A-B-A: a pixel that changes by more than 40 from frame i-1 to i and is back within 12 of frame i-1 at i+1 or i+2
  const n = frames[0].width * frames[0].height, per = [], hot = new Map(), cell = 32;
  for (let i = 1; i + 1 < frames.length; i++) {
    const a = frames[i - 1].data, b = frames[i].data, c = frames[i + 1].data, d = i + 2 < frames.length ? frames[i + 2].data : null;
    let cnt = 0;
    for (let p = 0; p < n; p++) {
      const k = p * 4, ch = Math.max(Math.abs(b[k] - a[k]), Math.abs(b[k + 1] - a[k + 1]), Math.abs(b[k + 2] - a[k + 2]));
      if (ch <= 40) continue;
      const back = (x) => Math.max(Math.abs(x[k] - a[k]), Math.abs(x[k + 1] - a[k + 1]), Math.abs(x[k + 2] - a[k + 2])) <= 12;
      if (back(c) || (d && back(d))) { cnt++; const key = Math.floor((p % frames[0].width) / cell) + ',' + Math.floor(p / frames[0].width / cell); hot.set(key, (hot.get(key) || 0) + 1); }
    }
    per.push(cnt);
  }
  const sorted = per.slice().sort((x, y) => x - y), top = [...hot].sort((x, y) => y[1] - x[1]).slice(0, 6);
  out(`A-B-A pixels a frame: median ${sorted[Math.floor(sorted.length / 2)]}, max ${sorted[sorted.length - 1]}, total ${per.reduce((x, y) => x + y, 0)} over ${per.length} frames (${(n / 1e6).toFixed(2)} Mpx a frame)`);
  out(`hottest ${cell} px cells (x,y in cells: pixels): ${top.map(([k, v]) => k + ': ' + v).join('  ')}`);
}

const cmds = { render, perf, flicker };
if (!cmds[cmd] || !ref) { out('usage: node tools/stage.mjs render|perf|flicker <ref> [flags] (see the top of this file)'); process.exitCode = 2; }
else cmds[cmd]().catch((e) => { out('error: ' + (e && e.stack || e)); process.exitCode = 1; });
