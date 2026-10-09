// Builder B's v2 test page (docs/dev/SCENE_ENGINE_V2.md 27.2): the canal fixture (scene-v2-b-canal.js) on the real canvas
// renderer, at a fixed moment, with no host: the page creates the renderer from the compiled scene itself, so it works
// before A's v2 compile lands. window.__v2b = { r (the renderer), C, L, ready }.
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import vm from 'node:vm';
import { sceneSourceFiles } from '../../tools/lib/scene-page.mjs';

/**
 * opts: { root, at (ISO, the sky's moment; null = the authored 'afternoon'), still, flush, noReeds, passes (false: no v2
 * passes at all: the scene drawn as v1), governor (false), t (the first frame's time), w, h }
 */
export function v2bPageHtml(opts = {}) {
  // a source that does not parse (another builder's file in the middle of an edit, in the shared tree) is left out and named
  const skipped = [];
  const root = opts.root, src = sceneSourceFiles(root, { browser: true, fixtures: true }).map(f => {
    const t = readFileSync(f, 'utf8');
    try { new vm.Script(t, { filename: f }); return t; } catch (e) { skipped.push(basename(f)); return ''; }
  }).join('\n;\n');
  if (skipped.length && opts.onSkip) opts.onSkip(skipped);
  const fx = readFileSync(join(root, 'tests', 'fixtures', 'scene-v2-b-canal.js'), 'utf8');
  const cfg = { at: opts.at || null, still: !!opts.still, flush: opts.flush || false, noReeds: !!opts.noReeds, passes: opts.passes !== false, governor: opts.governor === false ? false : undefined, t: opts.t || 0, w: opts.w || 1600, h: opts.h || 900, only: opts.only || null };
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#111;overflow:hidden}canvas{display:block;width:${cfg.w}px;height:${cfg.h}px}</style></head>
<body><canvas id="c"></canvas><script>window.__sceneErrors=[];addEventListener('error',e=>window.__sceneErrors.push(String(e.message)));window.__sceneOpts=${JSON.stringify({ governor: cfg.governor, flush: cfg.flush })};</script>
<script>${src}
;${fx}
;(function () {
  const cfg = ${JSON.stringify(cfg)};
  if (cfg.only) { const keep = new Set(cfg.only); for (const p of sceneRenderPassList()) if (!keep.has(p.id)) sceneRenderPassDefine({ id: p.id, applies: () => false }); }
  const C = sceneV2BCanal({ noReeds: cfg.noReeds });
  if (!cfg.passes) C.v = 1;
  const sky = cfg.at ? almSceneLight(Date.parse(cfg.at), C.cam.lat, C.cam.lon, 'UTC') : null;
  const view = Object.assign({}, C.view, { season: C.season, at: 'afternoon' }), o = sky ? { sky } : {};
  const L = typeof sceneLightV2 === 'function' && cfg.passes ? sceneLightV2(o, view, { v: 2, camera: C.cam, view: C.view, weather: 'none' }) : sceneLight(o, view);
  const canvas = document.getElementById('c');
  const r = sceneRendererCreate(canvas, { compiled: C }, { L, dpr: 1, still: cfg.still, season: C.season, flush: cfg.flush, governor: cfg.governor, time: () => performance.now() / 1000 });
  r.resize(cfg.w, cfg.h);
  r.frame(cfg.t);
  window.__v2b = { r, C, L, ready: true };
})();
</script></body></html>`;
}
