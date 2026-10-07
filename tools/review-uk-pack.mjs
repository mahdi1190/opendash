// Visual QA only; no app or build changes. Uses the existing dependency-free
// headless Chrome driver. Output stays outside the repository by default.
// node tools/review-uk-pack.mjs uk-south-east C:/path/to/review-output [filter] [modes]
//   filter: a county, ukLocality, ukSeason, ukPlace, ukPart (e.g. yateley-common-v2) or item id ('all', 'full', 'mini'); modes: light-still,dark-still,light-motion,dark-motion
// Live skies (scenes with liveSky): the real sun, moon and light at a moment and place.
//   --at=<ISO>              render at that moment (default place Yateley, this computer's zone)
//   --location=lat,lon      the place (with --at or --times); --zone=<IANA zone>
//   --times                 every scene at its season's review moments: dawn, noon, sunset, dusk,
//                           night, full-moon night and new-moon night (files <id>-<mode>-<moment>.png)
//   --size=lg               render at a tile size instead of full screen ('fill'): rich scenes draw less there
//   --sheets-only           rebuild the contact sheets from cached frames
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChrome } from './release-chrome.mjs';
import { root, loadAnim, sceneCss, scenePage, reviewMoments, parseArgs, DEFAULT_PLACE } from './uk-scene-lib.mjs';
const { flags, pos } = parseArgs(process.argv.slice(2));
const R = loadAnim();
const packId = pos[0] || 'uk-south-east';
const out = resolve(pos[1] || join(root, '..', 'uk-art-review', packId));
mkdirSync(out, { recursive: true });
const pack = R.animPack(packId);
if (!pack) throw new Error('Unknown pack: ' + packId);
const countyFilter = pos[2] === 'all' ? null : pos[2];
const sceneItems = countyFilter ? pack.items.filter(it => it.county === countyFilter || it.ukLocality === countyFilter || it.ukSeason === countyFilter || it.ukPart === countyFilter || it.ukPlace === countyFilter || it.id === countyFilter || (countyFilter === 'full' && it.full) || (countyFilter === 'mini' && !it.full)) : pack.items;
if (!sceneItems.length) throw new Error('No scenes for county: ' + countyFilter);
const css = sceneCss(pack);
const modes = [{ name: 'light-still', dark: false, reduced: true }, { name: 'dark-still', dark: true, reduced: true }, { name: 'light-motion', dark: false, reduced: false }, { name: 'dark-motion', dark: true, reduced: false }].filter(m => !pos[3] || pos[3].split(',').includes(m.name));
const coords = flags.location ? String(flags.location).split(',').map(Number) : [DEFAULT_PLACE.lat, DEFAULT_PLACE.lon];
if (coords.length !== 2 || !coords.every(Number.isFinite)) throw new Error('--location needs lat,lon');
const zone = flags.zone || DEFAULT_PLACE.zone, size = flags.size || 'fill';
const skyAt = ms => { const s = R.almSceneLight(ms, coords[0], coords[1], zone); if (!s) throw new Error('No sky for that moment/place'); return s; };
// the moments to render per item: one fixed moment (--at), the review set (--times) or the authored scene (no live sky)
const momentsFor = it => flags.times ? reviewMoments(R, it.ukSeason || 'summer', coords[0], coords[1]) : flags.at ? [{ name: '', ms: Date.parse(flags.at) }] : [{ name: '', ms: null }];
if (flags.at && !Number.isFinite(Date.parse(flags.at))) throw new Error('--at needs an ISO date-time');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chrome = flags['sheets-only'] ? null : await launchChrome();
const rows = [];
try {
  for (const mode of modes) {
    for (const it of sceneItems) {
      for (const m of momentsFor(it)) {
        const sky = m.ms != null ? skyAt(m.ms) : null;
        const body = R.animItemHtml(it, { live: !mode.reduced, reduced: mode.reduced, size, ...(sky ? { sky } : { lighting: false }) });
        const filename = `${it.id}-${mode.name}${m.name ? '-' + m.name : ''}.png`;
        if (!chrome) { if (!existsSync(join(out, filename))) throw new Error('Missing cached frame: ' + filename); }
        else writeFileSync(join(out, filename), await chrome.screenshot({ html: scenePage(body, css, { dark: mode.dark, pauseAt: 6500 }), width: 1600, height: 900, transparent: false }));
        rows.push({ id: it.id, county: it.county || pack.id, site: (it.site || it.label) + (m.name ? ` · ${m.name}${sky ? ` (${sky.tod}, sun ${Math.round(sky.altitude)}°, moon ${Math.round((sky.moonPos && sky.moonPos.illum || 0) * 100)}%)` : ''}` : ''), mode: mode.name, moment: m.name, at: m.ms != null ? new Date(m.ms).toISOString() : null, bytes: body.length, file: filename });
      }
    }
    console.log(`${packId}: ${rows.filter(r => r.mode === mode.name).length} ${mode.name} review frames`);
    if (!chrome && !flags['sheets-only']) continue;
    const sheetChrome = chrome || await launchChrome();
    try {
      for (const county of new Set(sceneItems.map(it => it.county || pack.id))) {
        const group = rows.filter(r => r.county === county && r.mode === mode.name);
        for (let page = 0; page < Math.ceil(group.length / 24); page++) {
          const tiles = group.slice(page * 24, (page + 1) * 24);
          const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#17232b;color:#fff;font:14px system-ui}h1{font-size:19px;margin:0 0 10px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}img{display:block;width:100%;aspect-ratio:16/9}figure{margin:0}figcaption{padding:5px 0;min-height:34px}</style></head><body><h1>${esc(county)} · ${mode.name}</h1><main>${tiles.map(t => `<figure><img src="${pathToFileURL(join(out, t.file)).href}"><figcaption>${esc(t.site)}</figcaption></figure>`).join('')}</main></body></html>`;
          writeFileSync(join(out, `sheet-${county}-${mode.name}${group.length > 24 ? '-' + (page + 1) : ''}.png`), await sheetChrome.screenshot({ html: sheet, width: 1600, height: 'auto', transparent: false }));
        }
      }
    } finally { if (!chrome) await sheetChrome.close(); }
  }
  writeFileSync(join(out, countyFilter ? `review-${countyFilter}.json` : 'review.json'), JSON.stringify({ pack: pack.id, scenes: sceneItems.length, width: 1600, height: 900, motionTimeMs: 6500, place: { lat: coords[0], lon: coords[1], zone }, renders: rows }, null, 2));
  console.log('Review output: ' + out);
} finally { if (chrome) await chrome.close(); }
