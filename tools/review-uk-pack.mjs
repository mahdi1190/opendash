// Visual QA only; no app or build changes. Uses the existing dependency-free
// headless Chrome driver. Output stays outside the repository by default.
// node tools/review-uk-pack.mjs uk-south-east C:/path/to/review-output
// Optional fourth argument: one county or ukPart id to rerender a local art change.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchChrome } from './release-chrome.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = join(root, 'src', 'app');
const packId = process.argv[2] || 'uk-south-east';
const out = resolve(process.argv[3] || join(root, '..', 'uk-art-review', packId));
mkdirSync(out, { recursive: true });
const files = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...readdirSync(app).filter(f => /^71-anim-(us2?|asia2?)[-.]/.test(f)).sort(), ...readdirSync(app).filter(f => /^72-anim-pack-.*\.js$/.test(f)).sort()];
const R = new Function(files.map(f => readFileSync(join(app, f), 'utf8')).join('\n;\n') + '\nreturn {animPack,animItemHtml};')();
const pack = R.animPack(packId);
if (!pack) throw new Error('Unknown pack: ' + packId);
const countyFilter = process.argv[4];
const sceneItems = countyFilter ? pack.items.filter(it => it.county === countyFilter || it.ukPart === countyFilter) : pack.items;
if (!sceneItems.length) throw new Error('No scenes for county: ' + countyFilter);
const css = ['71-anim-registry.css', '71-anim-library.css'].map(f => readFileSync(join(root, 'src', 'styles', f), 'utf8')).join('\n') + '\n' + pack.css;
const modes = [{ name: 'light-still', dark: false, reduced: true }, { name: 'dark-still', dark: true, reduced: true }, { name: 'light-motion', dark: false, reduced: false }, { name: 'dark-motion', dark: true, reduced: false }];
const chrome = await launchChrome();
const rows = [];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
try {
  for (const mode of modes) {
    for (const it of sceneItems) {
      const html = `<!doctype html><html data-theme="${mode.dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>${css}
        html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#233d46;--ap-speed:1;--ap-ease:ease-in-out}
        .anim-scene.ap-full{position:absolute;inset:0;width:100%;height:100%;border-radius:0;background:none;--as-size:100%;filter:none}
        .anim-scene.ap-full svg{width:100%;height:100%;filter:none}
        </style></head><body>${R.animItemHtml(it, { live: !mode.reduced, reduced: mode.reduced, size: 'fill' })}
        <script>for(const a of document.getAnimations()){a.pause();a.currentTime=6500}</script></body></html>`;
      const filename = `${it.id}-${mode.name}.png`;
      const png = await chrome.screenshot({ html, width: 1600, height: 900, transparent: false });
      writeFileSync(join(out, filename), png);
      rows.push({ id: it.id, county: it.county, site: it.site, mode: mode.name, file: filename });
    }
    console.log(`${packId}: ${sceneItems.length} full-size ${mode.name} renders`);
    for (const county of new Set(sceneItems.map(it => it.county))) {
      const tiles = rows.filter(r => r.county === county && r.mode === mode.name);
      const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#17232b;color:#fff;font:14px system-ui}h1{font-size:19px;margin:0 0 10px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}img{display:block;width:100%;aspect-ratio:16/9}figure{margin:0}figcaption{padding:5px 0;min-height:34px}</style></head><body><h1>${esc(county)} · ${mode.name}</h1><main>${tiles.map(t => `<figure><img src="${pathToFileURL(join(out, t.file)).href}"><figcaption>${esc(t.site)}</figcaption></figure>`).join('')}</main></body></html>`;
      writeFileSync(join(out, `sheet-${county}-${mode.name}.png`), await chrome.screenshot({ html: sheet, width: 1600, height: 'auto', transparent: false }));
    }
  }
  writeFileSync(join(out, countyFilter ? `review-${countyFilter}.json` : 'review.json'), JSON.stringify({ pack: pack.id, scenes: sceneItems.length, width: 1600, height: 900, motionTimeMs: 6500, renders: rows }, null, 2));
  console.log('Review output: ' + out);
} finally { await chrome.close(); }
