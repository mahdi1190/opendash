// A tiny headless-Chrome driver for the release tools (brand PNGs, previews).
// Speaks the DevTools protocol over --remote-debugging-pipe, so it needs no
// WebSocket and no npm packages: Node 20+ built-ins only.
//
//   const chrome = await launchChrome();           // finds Chrome or Chromium
//   const png = await chrome.screenshot({ html, width, height, scale, transparent });
//   await chrome.close();
//
// Set CHROME_PATH (or pass { executable }) when Chrome is somewhere unusual.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';

export function findChrome(env = process.env, platform = process.platform) {
  if (env.CHROME_PATH && existsSync(env.CHROME_PATH)) return env.CHROME_PATH;
  const c = [];
  if (platform === 'win32') {
    for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA, 'C:\\Program Files', 'C:\\Program Files (x86)'].filter(Boolean)) {
      c.push(join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      c.push(join(base, 'Chromium', 'Application', 'chrome.exe'));
      c.push(join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    c.push('/Applications/Chromium.app/Contents/MacOS/Chromium');
    c.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const dir of String(env.PATH || '').split(delimiter).filter(Boolean)) {
      for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) c.push(join(dir, n));
    }
  }
  return c.find(p => existsSync(p)) || null;
}

export async function launchChrome({ executable = findChrome(), timeoutMs = 30000, extraArgs = [] } = {}) {
  if (!executable) throw new Error('Chrome or Chromium not found: set CHROME_PATH to its executable.');
  const profile = mkdtempSync(join(tmpdir(), 'opendash-chrome-'));
  const args = [
    '--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-sync', '--disable-component-update',
    ...(extraArgs.includes('--enable-gpu') ? [] : ['--disable-gpu']), '--hide-scrollbars', '--mute-audio',
    // Same colours on every machine, and pages under assets/ may load the
    // repo's own font file from disk.
    '--force-color-profile=srgb', '--allow-file-access-from-files',
    // Chrome refuses to start as root with its sandbox on (Docker, some CI).
    ...(process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    ...extraArgs.filter(a => a !== '--enable-gpu'),   // e.g. the perf check's --gpu (tools/perf-uk-scene.mjs)
    'about:blank',
  ];
  const proc = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
  const toChrome = proc.stdio[3], fromChrome = proc.stdio[4];
  let stderr = '';
  proc.stderr.on('data', d => { stderr = (stderr + d).slice(-4000); });

  let nextId = 1, pending = new Map(), listeners = new Set(), buf = '';
  fromChrome.setEncoding('utf8');
  fromChrome.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`)); else p.resolve(msg.result);
      } else if (msg.method) for (const l of listeners) l(msg);
    }
  });
  const exited = new Promise(r => proc.on('exit', r));
  proc.on('exit', () => { for (const p of pending.values()) p.reject(new Error(`Chrome exited. ${stderr.trim().slice(-400)}`)); pending.clear(); });

  function send(method, params = {}, sessionId) {
    const id = nextId++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, timeoutMs);
      pending.set(id, { method, resolve: v => { clearTimeout(t); resolve(v); }, reject: e => { clearTimeout(t); reject(e); } });
      toChrome.write(JSON.stringify(msg) + '\0');
    });
  }
  function once(method, sessionId) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { listeners.delete(l); reject(new Error(`waiting for ${method} timed out`)); }, timeoutMs);
      const l = m => { if (m.method === method && (!sessionId || m.sessionId === sessionId)) { clearTimeout(t); listeners.delete(l); resolve(m.params); } };
      listeners.add(l);
    });
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  let page = 0;

  return {
    executable,
    /** Render a page and return a PNG buffer of exactly width x height x scale pixels.
     *  height 'auto' measures the page first (for preview sheets). */
    async screenshot({ html, url, width, height, scale = 1, transparent = true }) {
      const auto = height === 'auto';
      if (auto) height = 600;
      await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
      await s('Emulation.setDefaultBackgroundColorOverride', transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
      let target = url;
      if (html != null) {
        const file = join(profile, `page-${++page}.html`);
        writeFileSync(file, html);
        target = pathToFileURL(file).href;
      }
      const loaded = once('Page.loadEventFired', sessionId);
      const nav = await s('Page.navigate', { url: target });
      if (nav.errorText) throw new Error(`could not open ${target}: ${nav.errorText}`);
      await loaded;
      const r = await s('Runtime.evaluate', {
        expression: `(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return [...document.images].filter(i => !i.naturalWidth).map(i => i.src.slice(0, 80)); })()`,
        awaitPromise: true, returnByValue: true,
      });
      const broken = r.result && r.result.value;
      if (Array.isArray(broken) && broken.length) throw new Error(`images failed to load: ${broken.join(', ')}`);
      if (auto) {
        const m = await s('Runtime.evaluate', { expression: 'Math.ceil(document.documentElement.getBoundingClientRect().height)', returnByValue: true });
        height = Math.max(1, m.result.value | 0);
        await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
        await s('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))', awaitPromise: true });
      }
      const shot = await s('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width, height, scale: 1 } });
      return Buffer.from(shot.data, 'base64');
    },
    /** Capture the CURRENT page without navigating again (after a page has drawn itself: a second navigation would restart it). */
    async capture({ width, height, scale = 1 }) {
      await s('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))', awaitPromise: true });
      const shot = await s('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width, height, scale: 1 } });
      return Buffer.from(shot.data, 'base64');
    },
    /** Evaluate an expression in the current page (returns its value). */
    async evaluate(expression) {
      const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      return r.result && r.result.value;
    },
    async close() {
      try { await send('Browser.close'); } catch { /* already gone */ }
      const timer = setTimeout(() => { try { proc.kill(); } catch {} }, 3000);
      await exited;
      clearTimeout(timer);
      // release the DevTools pipes and stderr explicitly once Chrome has exited: a process that launches many Chromes
      // (the CLI tests, a sheet of many refs) must not keep their pipe handles open (Windows crashed with an access violation)
      listeners.clear();
      for (const st of [toChrome, fromChrome, proc.stderr]) { try { st.removeAllListeners('data'); st.destroy(); } catch { /* already closed */ } }
      for (let i = 0; i < 5; i++) {
        try { rmSync(profile, { recursive: true, force: true }); break; } catch { await new Promise(r => setTimeout(r, 300)); }
      }
    },
  };
}
