// Performance check for rich full-screen scenes (visual QA only; nothing here ships).
// Renders one scene full screen (1600 x 900) in headless Chrome with its motion live, lets it
// settle, then times requestAnimationFrame for a few seconds. Fails (exit 1) when the median
// frame is over the target. Also reports the rendered size, the SVG element count and the
// number of running animations (animate a few <g> wrappers holding many shapes, not thousands
// of separate nodes).
//   node tools/perf-uk-scene.mjs <item id or ref> [--pack=uk-south-east] [--seconds=3] [--max=20]
//        [--at=<ISO> --location=lat,lon --zone=<IANA zone>] [--size=fill] [--gpu]
//   node tools/perf-uk-scene.mjs demo [--season=summer] [--at=...]   the nature-kit demo scene
// Headless Chrome runs without a GPU here (software raster), so these numbers are a pessimistic
// bound; --gpu lets Chrome use one where it can.
import { launchChrome } from './release-chrome.mjs';
import { loadAnim, sceneCss, scenePage, parseArgs, DEFAULT_PLACE } from './uk-scene-lib.mjs';
import { demoSceneHtml } from './uk-kit-demo.mjs';
const { flags, pos } = parseArgs(process.argv.slice(2));
const target = pos[0];
if (!target) { console.error('usage: node tools/perf-uk-scene.mjs <item id|demo> [--seconds=3] [--max=20] [--at=ISO --location=lat,lon]'); process.exit(2); }
const R = loadAnim();
const pack = R.animPack(flags.pack || 'uk-south-east');
const coords = flags.location ? String(flags.location).split(',').map(Number) : [DEFAULT_PLACE.lat, DEFAULT_PLACE.lon];
const sky = flags.at ? R.almSceneLight(Date.parse(flags.at), coords[0], coords[1], flags.zone || DEFAULT_PLACE.zone) : null;
let body, label;
if (target === 'demo') { body = demoSceneHtml(R, { season: flags.season || 'summer', sky, size: flags.size || 'fill' }); label = 'nature-kit demo (' + (flags.season || 'summer') + ')'; }
else {
  const it = pack.items.find(i => i.id === target || i.ref === target) || R.animItem(target);
  if (!it) throw new Error('Unknown scene: ' + target);
  body = R.animItemHtml(it, { live: true, size: flags.size || 'fill', ...(sky ? { sky } : { lighting: false }) });
  label = it.ref;
}
const seconds = Number(flags.seconds) || 3, max = Number(flags.max) || 20;
const chrome = await launchChrome(flags.gpu ? { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] } : {});
try {
  await chrome.screenshot({ html: scenePage(body, sceneCss(pack)), width: 1600, height: 900, transparent: false });
  const r = await chrome.evaluate(`(async () => {
    await new Promise(r => setTimeout(r, 800));
    const t = []; let last = performance.now(); const end = last + ${seconds * 1000};
    await new Promise(res => { const f = now => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    t.shift(); const s = t.slice().sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    const svg = document.querySelector('svg');
    return { frames: t.length, median: q(.5), p90: q(.9), p99: q(.99), worst: s[s.length - 1], over33: t.filter(x => x > 33.4).length,
      elements: svg ? svg.querySelectorAll('*').length : 0, animations: document.getAnimations().length, bytes: document.body.innerHTML.length };
  })()`);
  const f = v => Math.round(v * 10) / 10;
  console.log(`${label}: ${r.frames} frames in ${seconds} s; median ${f(r.median)} ms, p90 ${f(r.p90)} ms, p99 ${f(r.p99)} ms, worst ${f(r.worst)} ms, ${r.over33} over 33 ms`);
  console.log(`  ${Math.round(body.length / 1024)} KB rendered, ${r.elements} SVG elements, ${r.animations} running animations`);
  if (!(r.median < max)) { console.error(`  FAIL: median frame ${f(r.median)} ms >= ${max} ms`); process.exitCode = 1; }
  else console.log(`  ok: median under ${max} ms`);
} finally { await chrome.close(); }
