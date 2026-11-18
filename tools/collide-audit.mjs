#!/usr/bin/env node
/*
 * Collision audit for the garden (Fleetwater Vale): does what the feet are tested against line up with what is drawn?
 * A dev tool, not a test: it opens the built app in a throwaway sandbox (fresh data folder and browser profile, a fixed
 * clock, made-up data only, all five regional gates opened as synthetic progress), waits for every painter to place its
 * objects, and compares, object by object:
 *   - the drawn side: the painters' own placement (each standing sprite's anchor, transform and art bounds) plus a pixel
 *     check of its drawn base (the lowest opaque rows of its texture, so a shadow does not count)
 *   - the walking side: the real walking data (_gwBuildSolids boxes, the walking grid's blocked cells, landforms, water)
 * and reports, by region and kind:
 *   walk-through        drawn and standing, but the feet can stand on its base
 *   invisible-wall      blocks the feet where nothing is drawn
 *   block-size          a block much bigger or smaller than the drawn base
 *   block-offset        a block beside (or behind) the drawn base
 *   click-area          a click area that does not match the art
 *   door-unreachable    a door or arrival point nobody can walk to
 *   path-blocked        a path drawn but not walkable
 *   drawn-blocked-walkable  rock or wall drawn (a landform) where the feet can walk
 *   water-walkable, shore-blocked   every shoreline: feet on drawn water; feet stopped on dry ground beside water
 *   crossing-gap, crossing-deck     every bridge, stepping stones and pier: its ends join; you walk the drawn deck
 *   locked-edge             unbought land that stops the feet where no fence, wall, hedge or thicket is drawn
 *   decor-foot              every decoration a player can place (each family, each way round): block against art
 *   closed-edge, draw-order, slide-stall, slide-jitter, route-none, route-detour, route-stall
 *                           each region shut in turn; who is drawn in front of whom; how walking and click-to-walk feel
 *   overlap                 two drawn things on top of each other that are not meant to be (each pair once)
 * (the checks themselves: tools/lib/collide-audit-page.js; --no-decor and --no-picture skip the slow parts)
 * Writes <out>/<label>.json and <out>/<label>.html (a thumbnail per fault, with the collision view on).
 *
 *   node build.mjs && node tools/collide-audit.mjs --label before [--port 4882 --cdp 10082 --out C:/tmp/collide --thumbs 260]
 *
 * The server always starts with the sandbox environment from --sandbox-env (default C:/tmp/sandbox-env.mjs, which exports
 * sandboxEnv(): no way out to the real calendar, mail or the Claude command line). Without it the tool refuses to run.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const REPO = path.resolve(arg('repo', process.cwd())), PORT = Number(arg('port', 4882)), CDP = Number(arg('cdp', 10082));
const OUT = arg('out', 'C:/tmp/collide'), LABEL = arg('label', 'audit'), THUMBS = Number(arg('thumbs', 260)), CLOCK = arg('clock', '2026-11-18T13:00:00');
const ENV_MODULE = arg('sandbox-env', 'C:/tmp/sandbox-env.mjs');
const EDGE = arg('browser', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
if (!fs.existsSync(ENV_MODULE)) { console.error('No sandbox environment module at ' + ENV_MODULE + ': refusing to start a server without it.'); process.exit(2); }
const { sandboxEnv, EDGE_SAFE_FLAGS } = await import(pathToFileURL(ENV_MODULE).href);
// (a fresh browser profile must never sign in, sync or install extensions: the module's own list when it has one)
const SAFE_FLAGS = Array.isArray(EDGE_SAFE_FLAGS) && EDGE_SAFE_FLAGS.length ? EDGE_SAFE_FLAGS : ['--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-features=msImplicitSignin'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WORK = path.join(OUT, 'run-' + LABEL), DATA = path.join(WORK, 'data-' + PORT), PROFILE = path.join(WORK, 'profile-' + CDP), THUMB_DIR = path.join(OUT, LABEL + '-thumbs');
for (const d of [DATA, PROFILE, THUMB_DIR]) fs.rmSync(d, { recursive: true, force: true });
for (const d of [DATA, THUMB_DIR]) fs.mkdirSync(d, { recursive: true });

/* ---------- the part that runs in the page: tools/lib/collide-audit-page.js ---------- */
const PAGE = fs.readFileSync(new URL('./lib/collide-audit-page.js', import.meta.url), 'utf8');

/* ---------- the sandbox ---------- */
const srv = spawn(process.execPath, ['serve.mjs', '--port', String(PORT), '--no-open', '--data-dir', DATA], { cwd: REPO, stdio: 'ignore', env: sandboxEnv() });
const br = spawn(EDGE, ['--headless=new', ...SAFE_FLAGS, `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`, '--window-size=1500,900', 'about:blank'], { stdio: 'ignore' });
let finished = false;
const stop = async code => { if (finished) return; finished = true; try { br.kill(); } catch { /* gone */ } try { srv.kill(); } catch { /* gone */ } await sleep(500); process.exit(code); };
setTimeout(() => { console.error('overall timeout'); stop(3); }, 50 * 60 * 1000);
let tabs = null; for (let i = 0; i < 60 && !tabs; i++) { await sleep(500); try { tabs = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); } catch { /* not up yet */ } }
const page = tabs.find(t => t.type === 'page' && t.url === 'about:blank') || tabs.find(t => t.type === 'page'); const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
let seq = 0; const wait = new Map(), errors = [];
ws.onmessage = msg => { const d = JSON.parse(msg.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d.result || d.error); wait.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') errors.push(String((d.params.exceptionDetails.exception || {}).description || d.params.exceptionDetails.text).slice(0, 300)); };
const send = (method, params = {}, ms = 60000) => Promise.race([new Promise(r => { const n = ++seq; wait.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); }), sleep(ms).then(() => ({ timeout: method }))]);
const ev = async (expression, ms) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, ms); if (r && r.timeout) throw new Error('timeout: ' + expression.slice(0, 80)); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result && r.result.value; };
const evq = async (e, ms) => { try { return await ev(e, ms); } catch (err) { return 'ERR ' + err.message.slice(0, 200); } };
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{const D=Date,off=new D(${JSON.stringify(CLOCK)}).getTime()-D.now();class F extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}}window.Date=F;})();` });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch { /* starting */ } await sleep(500); }
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` }); await sleep(12000);
  const close = `[...document.querySelectorAll('button')].filter(b=>/^(Lovely|Close|Got it|Thank you|Not now|Later|Keep this island|Continue|Sounds good|Skip for now)$/.test(b.textContent.trim())).forEach(b=>b.click())`;
  await evq(`[...document.querySelectorAll('button,a')].find(b=>/Skip for now/.test(b.textContent))?.click()`); await sleep(1000); await evq(close); await sleep(800);
  await evq(`setView('garden')`); await sleep(15000); await evq(close);
  // synthetic progress in this throwaway save: the five regional gates are open
  await evq(`(()=>{const g=_gdG();for(const id of ['island-woods','island-mill','island-ruins','island-orchard','island-headland'])g.led['gt.'+id]={d:'2026-11-12',k:'gk',i:{['gate:'+id]:1},n:1};_gdSave();return 1})()`);
  await evq(`setView('home')`); await sleep(3000); await evq(`setView('garden')`); await sleep(14000); await evq(close); await sleep(1000);
  // a look at the whole map first, so every painter places what it only places in view (the orchard's trees)
  await evq(`gardenCamSet('fit')`); await sleep(14000); await evq(`gardenCamSet('follow')`); await sleep(3000);
  console.log('garden', await evq(`JSON.stringify({open:[..._GD_LAND].filter(x=>/^zn-/.test(x)),native:!!(window.GardenNative&&GardenNative.active()),version:typeof APP_VERSION!=='undefined'?APP_VERSION:''})`));
  const result = await ev(`(${PAGE})(${JSON.stringify({ noDecor: process.argv.includes('--no-decor'), noPicture: process.argv.includes('--no-picture') })})`, 900000);
  result.label = LABEL; result.clock = CLOCK; result.errors = errors.slice(0, 20); result.when = new Date().toISOString();
  console.log('faults', result.total, JSON.stringify(result.counts.byKind));
  // thumbnails with the collision view on, worst first (walk-through and invisible walls, then the rest)
  const order = { 'walk-through': 0, 'invisible-wall': 1, 'water-walkable': 1, 'shore-blocked': 1, 'crossing-gap': 2, 'crossing-deck': 2, 'locked-edge': 2, 'path-blocked': 3, 'door-unreachable': 3, 'block-offset': 4, 'block-size': 5, 'drawn-blocked-walkable': 6, 'click-area': 7, 'decor-foot': 8, 'closed-edge': 2, 'draw-order': 3, overlap: 4, 'slide-stall': 6, 'slide-jitter': 6, 'route-none': 3, 'route-detour': 6, 'route-stall': 6 };
  const picks = result.faults.map((f, i) => ({ f, i })).filter(p => p.f.kind !== 'decor-foot').sort((a, b) => (order[a.f.kind] ?? 9) - (order[b.f.kind] ?? 9)).slice(0, THUMBS);
  await evq(`(()=>{const p=_gdpPrefs();p.cam='follow';p.zoom=4;_gw.cam.dirty=true;gardenCollideToggle(true);document.querySelectorAll('.gd-collide-key,.qs-card,[class*=quick-start]').forEach(e=>e.style.visibility='hidden');return gardenCollideOn()})()`);
  await sleep(1500);
  for (const { f, i } of picks) {
    const at = await evq(`(()=>{const p=gardenWorldNearestFree(${f.x},${f.y}+3.5,2.5,.14)||{x:${f.x},y:${f.y}+3.5};_gw.px=p.x;_gw.py=p.y;_gw.path=[];_gw.cam.init=false;_gw.cam.dirty=true;return 1})()`);
    void at; await sleep(1100);
    const xy = await evq(`(()=>{const q=_gw.nativeWorld.project(${f.x},${f.y});const b=_gw.box.getBoundingClientRect();return JSON.stringify({x:q.x+b.left,y:q.y+b.top})})()`);
    let p; try { p = JSON.parse(xy); } catch { continue; }
    const clip = { x: Math.max(250, Math.min(1500 - 340, Math.round(p.x - 170))), y: Math.max(0, Math.min(900 - 220, Math.round(p.y - 120))), width: 340, height: 220, scale: 1 };
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip }, 30000);
    if (r && r.data) { const file = `f${String(i).padStart(4, '0')}.jpg`; fs.writeFileSync(path.join(THUMB_DIR, file), Buffer.from(r.data, 'base64')); f.thumb = LABEL + '-thumbs/' + file; }
  }
  fs.writeFileSync(path.join(OUT, LABEL + '.json'), JSON.stringify(result, null, 1));
  fs.writeFileSync(path.join(OUT, LABEL + '.html'), report(result));
  console.log('wrote', path.join(OUT, LABEL + '.json'), path.join(OUT, LABEL + '.html'));
  await stop(0);
} catch (e) { console.error(e && e.stack || e); console.error('page errors', errors.slice(0, 5)); await stop(1); }

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function report(r) {
  const table = (title, obj) => `<section><h2>${esc(title)}</h2><table>${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table></section>`;
  const cards = r.faults.map(f => `<figure class="${esc(f.kind)}">${f.thumb ? `<img loading="lazy" src="${esc(f.thumb)}" alt="">` : '<div class="nothumb">no picture</div>'}<figcaption><b>${esc(f.kind)}</b> · ${esc(f.obj)} · ${esc(f.region)}<br>${esc(f.name)}<br><small>${esc(f.detail)} · at ${f.x}, ${f.y}</small></figcaption></figure>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>Collision audit ${esc(r.label)}</title><style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#fbf3e1;color:#3b2a1a}h1{margin:0 0 6px}section{display:inline-block;vertical-align:top;margin:0 18px 12px 0}
table{border-collapse:collapse}td{padding:2px 8px;border-bottom:1px solid #dcc59b}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}figure{margin:0;background:#fffaf0;border:1.5px solid #dcc59b;border-radius:8px;overflow:hidden}
figure img,.nothumb{width:100%;aspect-ratio:340/220;object-fit:cover;display:block;background:#e9dcc0}.nothumb{display:grid;place-items:center;color:#8a7350}figcaption{padding:6px 8px}small{color:#6b5236}</style>
<h1>Collision audit: ${esc(r.label)}</h1><p>${r.total} faults · ${r.when} · clock ${esc(r.clock)} · scanned ${esc(JSON.stringify(r.scanned))}</p>
${table('By kind', r.counts.byKind)}${table('By region', r.counts.byRegion)}${table('By object', r.counts.byObject)}${table('Region / kind', r.counts.byRegionKind)}
<div class="grid">${cards}</div>`;
}
