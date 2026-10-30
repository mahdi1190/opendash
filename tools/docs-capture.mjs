#!/usr/bin/env node
// Regenerates the README screenshots and GIFs in docs/media/ from FAKE demo data (never real data).
//
//   node tools/make-fake-data.mjs <sbx> --user "Alex" --force --trip
//   node tools/docs-capture.mjs --seed <sbx>          (adds fake expenses, friends, garden, pets to the sandbox only)
//   node --require tools/docs-fakehost.cjs serve.mjs --port 4191 --no-open --data-dir <sbx>   (the shim hides this PC's name)
//   node tools/docs-capture.mjs [--port 4191] [--out docs/media] [--only name,name] [--explore view,view]
//
// Drives headless Edge/Chrome over the DevTools pipe (tools/release-chrome.mjs) at 1440x900, takes PNG stills and
// records short GIFs (Page.captureScreenshot frames -> gifFromPngs in tools/lib/scene-capture.mjs). Node built-ins only.
// The shot list is in tools/docs-shots.mjs.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './release-chrome.mjs';
import { gifFromPngs, pngDecode, pngEncode } from './lib/scene-capture.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argValue = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(argValue('--port', '4191'));
if (PORT !== 4190 && PORT !== 4191) { console.error('docs-capture only uses ports 4190/4191'); process.exit(2); }
const OUT = resolve(argValue('--out', join(ROOT, 'docs', 'media')));
const ONLY = argValue('--only', '') ? argValue('--only', '').split(',') : null;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const W = 1440, H = 900;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (argv.includes('--seed')) { const { seed } = await import('./docs-seed.mjs'); await seed(argValue('--seed', 'C:/tmp/sbx-docs')); process.exit(0); }

const chrome = await launchChrome({ executable: existsSync(EDGE) ? EDGE : undefined, timeoutMs: 60000 });
const cdp = (m, p) => chrome.cdp(m, p);
const ev = (e) => chrome.evaluate(e);
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'light' }] });

async function open(view, theme = 'light') {
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await sleep(3000);
  await calm();
  await setTheme(theme);
  if (view) await go(view);
}
/** Dismiss first-run notices (they are remembered in the sandbox) and keep toasts and the animation card out of shots. */
async function calm() {
  // Docs and website pictures show OpenDash's own symbols, never company logos (Settings > Money look).
  await ev("(() => { try { state.homeUI = Object.assign({}, state.homeUI, { noLogos: true }); if (typeof render === 'function') render(); } catch (e) { /* not loaded yet */ } })()");
  for (let i = 0; i < 3; i++) {
    await ev(`(() => { for (const b of document.querySelectorAll('.modal button, .scrim button, .anew-card button, .toast button')) { const t = (b.innerText || b.getAttribute('aria-label') || '').trim(); if (/^(sounds good|not now|got it|skip|close|dismiss|ok)$/i.test(t) || /^close$/i.test(b.getAttribute('aria-label') || '')) b.click(); } })()`);
    await sleep(500);
  }
  await ev(`(() => { if (!document.getElementById('dc-calm')) { const s = document.createElement('style'); s.id = 'dc-calm'; s.textContent = '.toast, .anew-card, .toasts { display: none !important; }'; document.head.appendChild(s); } })()`);
}
async function setTheme(t) {
  await ev(`(() => { try { if (typeof setTheme === 'function') setTheme(${JSON.stringify(t)}); else { state.theme = ${JSON.stringify(t)}; } document.documentElement.setAttribute('data-theme', ${JSON.stringify(t)}); } catch (e) { document.documentElement.setAttribute('data-theme', ${JSON.stringify(t)}); } })()`);
  await sleep(500);
}
async function go(view, wait = 1800) { await ev(`setView(${JSON.stringify(view)})`); await sleep(wait); }
async function shot() { const r = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }); return Buffer.from(r.data, 'base64'); }
async function rectOf(sel) {   // CSS selector, or 'text=Label' (the smallest visible clickable-ish element containing the text)
  const js = sel.startsWith('text=')
    ? `(() => { const t=${JSON.stringify(sel.slice(5))}.toLowerCase(); let best=null; for (const e of document.querySelectorAll('button,a,[role=button],[role=tab],label,summary,li,div,span,h1,h2,h3,p')) { const tx=(e.innerText||'').trim().toLowerCase(); if (!tx||tx.length>t.length+30||!tx.includes(t)) continue; const r=e.getBoundingClientRect(); if (r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) continue; const n = tx === t ? 0 : 1000 + tx.length; if (!best||n<best.n) best={n,x:r.x,y:r.y,w:r.width,h:r.height}; } return best; })()`
    : `(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`;
  return ev(js);
}
let mouse = { x: 700, y: 450 };
async function moveTo(x, y, steps = 6) {
  for (let i = 1; i <= steps; i++) { const px = mouse.x + (x - mouse.x) * i / steps, py = mouse.y + (y - mouse.y) * i / steps; await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py }); await rec?.tick(); }
  mouse = { x, y };
}
async function click(sel, o = {}) {
  const r = typeof sel === 'string' ? await rectOf(sel) : sel;
  if (!r) throw new Error('nothing to click: ' + JSON.stringify(sel));
  const x = r.x + (o.fx ?? 0.5) * r.w, y = r.y + (o.fy ?? 0.5) * r.h;
  await moveTo(x, y);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await rec?.tick(); await (rec ? rec.hold(o.wait ?? 350) : sleep(o.wait ?? 350));
}
async function drag(from, to, steps = 14) {
  await moveTo(from.x, from.y);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 });
  await moveTo(to.x, to.y, steps);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 });
  await rec?.tick(); await (rec ? rec.hold(400) : sleep(400));
}
async function type(text, delay = 70) { for (const ch of text) { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await rec?.tick(); await sleep(delay); } }
async function key(k, mods = 0) {
  const vk = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, Backspace: 8 }[k] || k.toUpperCase().charCodeAt(0);
  const base = { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods };
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await (rec ? rec.hold(300) : sleep(300));
}
async function scrollBy(sel, dy, steps = 6) { for (let i = 0; i < steps; i++) { await ev(`(() => { const e=${sel ? `document.querySelector(${JSON.stringify(sel)})` : 'null'} || document.scrollingElement; e.scrollTop += ${dy / steps}; })()`); await rec?.tick(); await sleep(60); } }

// ---- recording: tick() grabs a frame when the frame interval has elapsed; hold(ms) keeps ticking while waiting
let rec = null;
async function record(name, fn, { fps = 8, crop = null, scale = 1, maxSeconds = 8 } = {}) {
  const frames = []; const t0 = Date.now(); let last = 0; const gap = 1000 / fps;
  rec = {
    async tick(force) { const now = Date.now(); if (!force && now - last < gap) return; if (now - t0 > maxSeconds * 1000) return; last = now; frames.push(await shot()); },
    async hold(ms) { const end = Date.now() + ms; while (Date.now() < end) { await this.tick(); await sleep(15); } },
  };
  await rec.tick(true);
  try { await fn(rec); } finally { await rec.tick(true); rec = null; }
  if (process.env.DC_DUMP) { mkdirSync('C:/tmp/explore', { recursive: true }); [0, Math.floor(frames.length / 3), Math.floor(frames.length * 2 / 3), frames.length - 1].forEach((k, j) => writeFileSync(`C:/tmp/explore/${name}-${j}.png`, frames[k])); }
  const pngs = (crop || scale !== 1) ? frames.map(f => cropPng(f, crop || { x: 0, y: 0, w: W, h: H }, scale)) : frames;
  const { gif } = gifFromPngs(pngs, { fps });
  writeFileSync(join(OUT, name + '.gif'), gif);
  console.log(`  ${name}.gif  ${frames.length} frames  ${(gif.length / 1048576).toFixed(2)} MB`);
}
/** Crop a PNG to c = {x,y,w,h}, then shrink by `scale` (area average), giving an RGB PNG. */
function cropPng(buf, c, scale = 1) {
  const d = pngDecode(buf), ow = Math.round(c.w * scale), oh = Math.round(c.h * scale), rgb = Buffer.alloc(ow * oh * 3);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const x0 = Math.floor(x / scale), x1 = Math.max(x0 + 1, Math.min(c.w, Math.ceil((x + 1) / scale))), y0 = Math.floor(y / scale), y1 = Math.max(y0 + 1, Math.min(c.h, Math.ceil((y + 1) / scale)));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const s = ((c.y + yy) * d.width + c.x + xx) * 4; r += d.data[s]; g += d.data[s + 1]; b += d.data[s + 2]; n++; }
    const o = (y * ow + x) * 3; rgb[o] = r / n; rgb[o + 1] = g / n; rgb[o + 2] = b / n;
  }
  return pngEncode(ow, oh, rgb);
}
async function still(name, view, { theme = 'light', prep, clip } = {}) {
  await open(view, theme);
  if (prep) await prep();
  await sleep(600);
  const png = await shot();
  writeFileSync(join(OUT, name + '.png'), clip ? cropPng(png, clip) : png);
  console.log(`  ${name}.png`);
}

/** First run in a fresh sandbox: let the late notices appear, then answer them (the answers are saved, so shots stay clean). */
async function prepare() {
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await sleep(14000);
  await calm();
  await ev(`(() => { try { seenMarkOnce('whatsNew:2.19'); } catch (e) {} for (const b of document.querySelectorAll('button')) if ((b.innerText || '').trim() === 'Not now') b.click(); })()`);
  await sleep(8000);
  await calm();
  await sleep(1500);
}
await prepare();

const api = { open, go, setTheme, shot, rectOf, click, drag, type, key, scrollBy, still, record, ev, cdp, sleep, moveTo, W, H, OUT, PORT };

if (argv.includes('--explore')) {
  const views = argValue('--explore', '').split(',');
  mkdirSync('C:/tmp/explore', { recursive: true });
  await open(null);
  for (const v of views) { await go(v, 2200); writeFileSync(`C:/tmp/explore/${v.replace(/[^a-z0-9]/gi, '_')}.png`, await shot()); console.log('explored', v); }
  await chrome.close(); process.exit(0);
}

if (argv.includes('--probe')) {   // --probe <view> --js "<expression>": print what the page says (for writing shots)
  await open(null); await go(argValue('--probe', 'home'), 2000);
  console.log(JSON.stringify(await ev(argValue('--js', 'document.title')), null, 1)); await chrome.close(); process.exit(0);
}
const { shots } = await import('./docs-shots.mjs');
let failed = 0;
try {
  for (const s of shots(api)) {
    if (ONLY && !ONLY.includes(s.name)) continue;
    try { await s.run(); } catch (e) { failed++; console.error('  FAILED', s.name, e.message); }
  }
} finally { await chrome.close(); }
process.exit(failed ? 1 : 0);
