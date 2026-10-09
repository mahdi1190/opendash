// Scene LOAD profiler (visual QA only; nothing here ships). How long a full-screen scene takes from being requested
// (its host inserted) to its first full-quality frame (the host's sc-ready), and how smoothly it plays from there.
// Headless Chrome at the user's screen size (3440 x 1440, dpr 1 by default); per scene:
//   cold    a fresh browser profile (no persistent cache), the page's first scene
//   warm    the page loaded again in the same profile (the persistent scene cache survives; memory caches do not)
//   reopen  the same page: the scene closed for 3 s (its renderer destroyed) and opened again (the memory caches survive)
// Reports per run: readyMs (request -> first full frame), firstPaintMs (request -> the first picture on screen: the cached
// still or the live canvas), the worst rAF gap in the 3 s after the request and in the 3 s after ready, the bake's phases
// (main-thread CPU ms), sprite counts and bytes.
//   node tools/scene-load-profile.mjs [--refs=pack/id,...] [--w=3440 --h=1440 --dpr=1] [--at=ISO] [--gpu] [--runs=cold,warm,reopen]
//        [--throttle=4] (CDP CPU throttling: an average machine) [--repeat=N] [--check] [--gaps]
//        [--cpuprofile=<dir>] (a .cpuprofile of each cold load, plus the top self-time functions) [--json=<file>]
// Headless Chrome here runs without a GPU (software raster): the numbers are a pessimistic bound; --gpu lets Chrome use one.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './release-chrome.mjs';
import { scenePageHtml } from './lib/scene-page.mjs';

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const W = Number(flags.w) || 3440, H = Number(flags.h) || 1440, DPR = Number(flags.dpr) || 1;
const AT = flags.at || '2026-10-09T14:30:00Z';
const PACKS = ['proof-fleet-pond', 'proof-yateley-green', 'proof-wyndhams-pool'];
const RUNS = String(flags.runs || 'cold,warm,reopen').split(',');
const chromeOpts = flags.gpu ? { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] } : {};

// the page: every scene source, no host yet (the measurement inserts it)
// --check: the governor stays off (its level is frame state: a janky cold load may step it down, a smooth restore not)
const page = scenePageHtml({ refs: [], size: { w: W, h: H }, dpr: DPR, governor: flags.check ? false : undefined }).replace('<div id="sp-root">', `<div id="sp-root"><div class="sp-row"><div class="sp-box" id="lp-box" data-scene-key="load-profile"></div></div>`);

/** In the page: open ref now; resolve once it is ready + 3 s with the timings. */
const OPEN = (ref, at, keepMs) => `(async () => {
  const ref = ${JSON.stringify(ref)}, it = animItem(ref);
  if (!it) return { error: 'unknown ' + ref };
  const pk = animPack(ref.split('/')[0]);
  if (pk && pk.css && !document.getElementById('lp-css')) { const st = document.createElement('style'); st.id = 'lp-css'; st.textContent = pk.css; document.head.appendChild(st); }
  const box = document.getElementById('lp-box');
  const lat = it.liveSky ? it.liveSky.lat : 51.3, lon = it.liveSky ? it.liveSky.lon : -0.8, sky = almSceneLight(Date.parse(${JSON.stringify(at)}), lat, lon, 'UTC');
  const gaps = [], longs = []; let last = performance.now(), on = true, firstPaint = 0;
  let po = null; try { po = new PerformanceObserver(l => { for (const e of l.getEntries()) longs.push([e.startTime, e.duration]); }); po.observe({ type: 'longtask', buffered: false }); } catch (e) { po = null; }
  const tick = (now) => { gaps.push([now, now - last]); last = now; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t0 = performance.now();
  box.innerHTML = animItemHtml(it, { size: 'fill', live: true, sky, tod: sky.tod });
  if (typeof sceneHostScan === 'function') sceneHostScan(document);
  const host = box.firstElementChild;
  let ready = 0, animAt = 0;
  await new Promise(res => {
    const chk = () => {
      const n = performance.now();
      if (!firstPaint && host && (host.classList.contains('sc-ready') || host.classList.contains('sc-shown'))) firstPaint = n;
      if (host && host.classList.contains('sc-ready')) { ready = n; requestAnimationFrame((t2) => { animAt = t2; res(); }); return; }
      if (n - t0 > 30000) { res(); return; }
      requestAnimationFrame(chk);
    };
    requestAnimationFrame(chk);
  });
  const end = Math.max(t0 + 3000, (ready || t0) + 3000);
  await new Promise(r => setTimeout(r, Math.max(0, end - performance.now()) + 50));
  on = false; if (po) po.disconnect();
  const st = (window.__sceneStats() || [])[0] || {};
  const worst = (a, b) => gaps.filter(g => g[0] > a && g[0] <= b).reduce((m, g) => Math.max(m, g[1]), 0);
  const frames = (a, b) => gaps.filter(g => g[0] > a && g[0] <= b).length;
  const live = host && host.classList.contains('sc-live') ? (window.__sceneStats()[0] || {}) : null;
  const out = { animMs: animAt ? Math.round(animAt - t0) : null, over33: gaps.filter(g => g[0] > t0 && g[0] <= t0 + 3000 && g[1] > 34).length,
    liveMs: (st.prebaked && st.prebaked.tl ? (st.prebaked.tl.find(x => x.startsWith('live@')) || null) : null), pbtl: st.prebaked ? st.prebaked.tl : null, pbBytes: st.prebaked ? st.prebaked.bytes : null, pbFrame: st.prebaked ? st.prebaked.frameMs : null, passFrame: st.passes ? Object.fromEntries(Object.entries(st.passes).map(([k, v]) => [k, [Math.round(v.frameMs), v.frames, v.maxMs]])) : null, dyn: st.dynMs, readyMs: ready ? Math.round(ready - t0) : null, hostReadyMs: st.readyMs, firstPaintMs: firstPaint ? Math.round(firstPaint - t0) : null,
    worstGapLoad: Math.round(worst(t0, t0 + 3000)), worstGapAfterReady: ready ? Math.round(worst(ready, ready + 3000)) : null,
    framesAfterReady: ready ? frames(ready, ready + 3000) : 0,
    longAfterReady: ready ? gaps.filter(g => g[0] > ready && g[0] <= ready + 3000 && g[1] > 25).map(g => [Math.round(g[0] - ready), Math.round(g[1])]).slice(0, 8) : [],
    longTasks: longs.filter(x => x[0] >= t0).map(x => [Math.round(x[0] - (ready || t0)), Math.round(x[1])]),
    longLoad: gaps.filter(g => g[0] > t0 && g[0] <= (ready || t0 + 3000) && g[1] > 40).map(g => [Math.round(g[0] - t0), Math.round(g[1])]).slice(0, 12),
    bakeMs: st.bakeMs, bakeWallMs: st.bakeWallMs, warmWallMs: st.warmWallMs, maxSliceMs: st.maxSliceMs, phases: st.phases, sprites: st.sprites, spriteBytes: st.spriteBytes,
    newSprites: st.newSprites, newSpriteBytes: st.newSpriteBytes, bitmaps: st.bitmaps, placements: st.placements, size: st.size, restored: st.restored || null,
    passes: st.passes ? Object.fromEntries(Object.entries(st.passes).map(([k, v]) => [k, v.bakeMs])) : null };
  if (${keepMs} < 0) { box.innerHTML = ''; }
  return out;
})()`;

// the page is served over http on 127.0.0.1 (as the app is), with the prebaked scenes' assets at /api/scene-assets/ (the route of
// server/routes/scene-assets.mjs), never cached (cold means cold)
const ASSETS = resolve(fileURLToPath(new URL('../assets/scenes', import.meta.url)));
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/' || u.pathname === '/page.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(page); return; }
  const m = /^\/api\/scene-assets\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9][a-z0-9.-]*\.(webp|json))$/.exec(u.pathname);
  const file = m ? resolve(join(ASSETS, m[1], m[2], m[3])) : '';
  if (!m || !file.startsWith(ASSETS + sep)) { res.writeHead(404); res.end(); return; }
  try { const b = readFileSync(file); res.writeHead(200, { 'Content-Type': m[4] === 'webp' ? 'image/webp' : 'application/json', 'Cache-Control': 'no-store' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PAGE_URL = 'http://127.0.0.1:' + server.address().port + '/page.html';
async function loadPage(chrome) {
  if (chrome.emulateMedia) await chrome.emulateMedia([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await chrome.screenshot({ url: PAGE_URL, width: W, height: H, scale: DPR, transparent: false });
  // --throttle=4: an average machine's CPU (CDP CPU throttling; the GPU is as it is)
  if (flags.throttle && chrome.cdp) await chrome.cdp('Emulation.setCPUThrottlingRate', { rate: Number(flags.throttle) || 1 });
  // let the page settle (the script's own start-up, idle work: an idle-time pre-bake may run here, as in the app)
  await chrome.evaluate('new Promise(r => setTimeout(r, 1500))');
}

/** The top self-time functions of a CPU profile. */
function topSelf(prof, n = 25) {
  const self = new Map(), byId = new Map(prof.nodes.map(x => [x.id, x]));
  const dt = prof.timeDeltas || [];
  for (let i = 0; i < prof.samples.length; i++) {
    const nd = byId.get(prof.samples[i]); if (!nd) continue;
    const cf = nd.callFrame, k = (cf.functionName || '(anon)') + ' ' + (cf.url ? cf.url.split('/').pop() : '') + ':' + (cf.lineNumber + 1);
    self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000);
  }
  return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v * 10) / 10]);
}

const results = [];
// the check: a restored scene draws the same pixels as the fresh bake (frame 0 against the still the bake kept)
const CHECK0 = `(async () => {
        const snap = window.__sceneSnapshot ? window.__sceneSnapshot(0) : null, st = (window.__sceneStats() || [])[0] || {};
        if (!snap || (!st.restored && !${!!flags.history})) return { checked: false };
        const keys = (await sceneStoreStats()).keys.filter(k => k.startsWith('B|'));
        const rec = await sceneStoreGet(keys[0]);
        if (!rec || !rec.still) return { checked: false };
        const b = await createImageBitmap(rec.still), c = new OffscreenCanvas(b.width, b.height), x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(b, 0, 0);
        const A = x.getImageData(0, 0, c.width, c.height).data, B = snap.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let diff = 0, max = 0, bx = [1e9, 1e9, -1, -1];
        for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); if (d) { diff++; if (d > max) max = d; const p = i >> 2, px = p % c.width, py = (p / c.width) | 0; bx = [Math.min(bx[0], px), Math.min(bx[1], py), Math.max(bx[2], px), Math.max(bx[3], py)]; } }
        return { checked: true, size: [c.width, c.height], differing: diff, maxDiff: max, box: diff ? bx : null };
      })()`;
const refsOf = async (chrome) => flags.refs ? String(flags.refs).split(',') : chrome.evaluate(`${JSON.stringify(PACKS)}.map(id => animPack(id) && animPack(id).items[0] ? animPack(id).items[0].ref : null).filter(Boolean)`);
let refs = null;
{
  const chrome = await launchChrome(chromeOpts);
  try { await loadPage(chrome); refs = await refsOf(chrome); } finally { await chrome.close(); }
}
const REPEAT = Math.max(1, Number(flags.repeat) || 1);
for (let rep = 0; rep < REPEAT; rep++) for (const ref of refs) {
  const chrome = await launchChrome(chromeOpts);
  try {
    const row = { ref, rep };
    if (RUNS.includes('cold')) {
      await loadPage(chrome);
      if (flags.cpuprofile) { await chrome.cdp('Profiler.enable'); await chrome.cdp('Profiler.setSamplingInterval', { interval: 200 }); await chrome.cdp('Profiler.start'); }
      row.cold = await chrome.evaluate(OPEN(ref, AT, 0));
      if (flags.cpuprofile) {
        const { profile } = await chrome.cdp('Profiler.stop');
        mkdirSync(flags.cpuprofile, { recursive: true });
        writeFileSync(join(flags.cpuprofile, ref.replace(/[^a-z0-9-]+/gi, '_') + '.cpuprofile'), JSON.stringify(profile));
        row.top = topSelf(profile);
      }
    }
    if (flags.history) {   // the same check in the cold page: frame 0 three seconds later against the still kept at ready
      await chrome.evaluate(`new Promise(r => setTimeout(r, 2500))`);
      row.historyCheck = await chrome.evaluate(CHECK0);
    }
    // the bake is kept in idle time after it is ready (encoded off the main thread): wait for it before loading again
    row.stored = await chrome.evaluate(`(async () => { if (typeof sceneStoreStats !== 'function') return null; const t0 = performance.now(); let s = null;
      while (performance.now() - t0 < 20000) { s = await sceneStoreStats(); if (s.keys && s.keys.some(k => k.startsWith('B|'))) break; await new Promise(r => setTimeout(r, 250)); }
      return s ? { entries: s.entries, MB: Math.round(s.bytes / 1048576 * 10) / 10, waitedMs: Math.round(performance.now() - t0) } : null; })()`);
    if (RUNS.includes('warm')) {
      await loadPage(chrome);
      const CHECK = CHECK0; const _unused = `(async () => {
        const snap = window.__sceneSnapshot ? window.__sceneSnapshot(0) : null, st = (window.__sceneStats() || [])[0] || {};
        if (!snap || (!st.restored && !${!!flags.history})) return { checked: false };
        const keys = (await sceneStoreStats()).keys.filter(k => k.startsWith('B|'));
        const rec = await sceneStoreGet(keys[0]);
        if (!rec || !rec.still) return { checked: false };
        const b = await createImageBitmap(rec.still), c = new OffscreenCanvas(b.width, b.height), x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(b, 0, 0);
        const A = x.getImageData(0, 0, c.width, c.height).data, B = snap.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let diff = 0, max = 0;
        let bx = [1e9, 1e9, -1, -1];
        for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); if (d) { diff++; if (d > max) max = d; const p = i >> 2, px = p % c.width, py = (p / c.width) | 0; bx = [Math.min(bx[0], px), Math.min(bx[1], py), Math.max(bx[2], px), Math.max(bx[3], py)]; } }
        let crops = null;
        if (diff && ${!!flags.crops}) {
          const crop = async (src) => { const w = bx[2] - bx[0] + 41, h = bx[3] - bx[1] + 41, k = new OffscreenCanvas(w * 2, h * 2), kx = k.getContext('2d'); kx.imageSmoothingEnabled = false; kx.drawImage(src, bx[0] - 20, bx[1] - 20, w, h, 0, 0, w * 2, h * 2);
            const bl = await k.convertToBlob({ type: 'image/png' }); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); };
          crops = [await crop(c), await crop(snap)];
        }
        return { checked: true, size: [c.width, c.height], differing: diff, maxDiff: max, box: diff ? bx : null, crops };
      })()`;
      if (flags.cpuprofile) { await chrome.cdp('Profiler.enable'); await chrome.cdp('Profiler.setSamplingInterval', { interval: 200 }); await chrome.cdp('Profiler.start'); }
      row.warm = await chrome.evaluate(OPEN(ref, AT, 0));
      if (flags.check) row.check = await chrome.evaluate(CHECK);
      if (flags.cpuprofile) {
        const { profile } = await chrome.cdp('Profiler.stop');
        writeFileSync(join(flags.cpuprofile, ref.replace(/[^a-z0-9-]+/gi, '_') + '-warm.cpuprofile'), JSON.stringify(profile));
        row.topWarm = topSelf(profile, 15);
      }
    }
    if (RUNS.includes('prepared')) {
      // a fresh profile: the scene prepared in idle time (sceneHostPrepare, as the app does for the next opening), then opened
      const fresh = await launchChrome(chromeOpts);
      try {
        await loadPage(fresh);
        row.prep = await fresh.evaluate(`(async () => {
          const it = animItem(${JSON.stringify(ref)}), lat = it.liveSky ? it.liveSky.lat : 51.3, lon = it.liveSky ? it.liveSky.lon : -0.8;
          const sky = almSceneLight(Date.parse(${JSON.stringify(AT)}), lat, lon, 'UTC'), d = document.createElement('div');
          d.innerHTML = animItemHtml(it, { size: 'fill', live: true, sky, tod: sky.tod });
          const h = d.firstElementChild, t0 = performance.now();
          const r = await sceneHostPrepare([{ ref: ${JSON.stringify(ref)}, w: ${W / DPR}, h: ${H / DPR}, lod: Number(h.getAttribute('data-sc-lod')) || 1, sky: h.getAttribute('data-sc-sky') }]);
          return { ms: Math.round(performance.now() - t0), r };
        })()`);
        row.prepared = await fresh.evaluate(OPEN(ref, AT, 0));
      } finally { await fresh.close(); }
    }
    if (RUNS.includes('reopen')) {
      await chrome.evaluate(`(() => { document.getElementById('lp-box').innerHTML = ''; return new Promise(r => setTimeout(r, 3200)); })()`);
      row.reopen = await chrome.evaluate(OPEN(ref, AT, 0));
    }
    results.push(row);
  } finally { await chrome.close(); }
}

const f = (v) => (v == null ? '-' : String(Math.round(v)));
console.log(`scene load profile: ${W} x ${H} @ dpr ${DPR}, sky at ${AT}${flags.gpu ? ', --gpu' : ', software raster'}`);
console.log('ref                                         run     ready  paint  worst(load)  worst(after ready)  bake(cpu/wall)  warm(wall)  sprites(new)  MB(new)');
for (const r of (REPEAT > 1 && !flags.verbose ? [] : results)) for (const k of RUNS) {
  const x = r[k]; if (!x) continue;
  if (x.error) { console.log(r.ref, k, x.error); continue; }
  console.log(`${r.ref.padEnd(44)}${k.padEnd(8)}${f(x.readyMs).padStart(6)} ${f(x.firstPaintMs).padStart(6)} ${f(x.worstGapLoad).padStart(12)} ${f(x.worstGapAfterReady).padStart(19)} ${(f(x.bakeMs) + '/' + f(x.bakeWallMs)).padStart(15)} ${f(x.warmWallMs).padStart(11)} ${(x.sprites + '(' + x.newSprites + ')').padStart(13)} ${(((x.spriteBytes || 0) / 1048576).toFixed(0) + '(' + ((x.newSpriteBytes || 0) / 1048576).toFixed(0) + ')').padStart(8)}`);
  if (flags.verbose || k === 'cold') console.log('    phases', JSON.stringify(x.phases), ' passes', JSON.stringify(x.passes), x.restored ? ' restored ' + JSON.stringify(x.restored) : '');
  else if (x.restored) console.log('    restored', JSON.stringify(x.restored), ' phases', JSON.stringify(x.phases));
  if (flags.gaps) console.log('    long gaps (load: ms after request, gap)', JSON.stringify(x.longLoad), ' after ready', JSON.stringify(x.longAfterReady), ' long tasks (ms from ready, ms)', JSON.stringify(x.longTasks));
  if (k === 'cold' && r.stored) console.log('    stored', JSON.stringify(r.stored));
  if (k === 'prepared' && r.prep) console.log('    prepared in idle time first', JSON.stringify(r.prep));
}
for (const r of results) for (const [tk, lab] of [['top', 'cold'], ['topWarm', 'warm']]) if (r[tk]) { console.log('top self time (' + lab + ') ' + r.ref); for (const [k, v] of r[tk]) console.log('   ' + String(v).padStart(8) + ' ms  ' + k); }
if (flags.check) for (const r of results) {
  const c = r.check || {};
  if (c.crops) { mkdirSync(String(flags.crops), { recursive: true }); c.crops.forEach((u, i) => writeFileSync(join(String(flags.crops), r.ref.replace(/[^a-z0-9-]+/gi, '_') + (i ? '-restored' : '-fresh') + '.png'), Buffer.from(u.split(',')[1], 'base64'))); delete c.crops; }
  console.log('pixel check ' + r.ref + ': ' + JSON.stringify(c));
  if (r.historyCheck) console.log('  same page, frame 0 again 3 s after ready: ' + JSON.stringify(r.historyCheck));
}
// the summary: median (and worst) over the repeats, per scene and run
const med = (a) => { const s = a.filter(v => v != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const mx = (a) => { const s = a.filter(v => v != null); return s.length ? Math.max(...s) : null; };
console.log(`
summary over ${REPEAT} run(s): median (worst) ms`);
console.log('scene                    run      ready           first paint     animating       worst frame, load   frames>33ms(3s)  worst frame, 3 s after ready');
for (const ref of refs) for (const k of RUNS) {
  const xs = results.filter(r => r.ref === ref && r[k] && !r[k].error).map(r => r[k]);
  if (!xs.length) continue;
  const cell = (key) => (f(med(xs.map(x => x[key]))) + ' (' + f(mx(xs.map(x => x[key]))) + ')').padEnd(16);
  console.log(`${ref.split('/')[1].padEnd(25)}${k.padEnd(9)}${cell('readyMs')}${cell('firstPaintMs')}${cell('animMs')}${cell('worstGapLoad').padEnd(20)}${cell('over33').padEnd(17)}${cell('worstGapAfterReady')}`);
  for (const x of xs) if (x.pbtl) console.log('    prebaked timeline (ms after the player started):', x.pbtl.join(' '), ' player frame ms', JSON.stringify(x.pbFrame), ' renderer dyn ms', JSON.stringify(x.dyn), ' passes frame ms/frames', JSON.stringify(x.passFrame));
}
if (flags.json) writeFileSync(flags.json, JSON.stringify(results, null, 2));
server.close();
