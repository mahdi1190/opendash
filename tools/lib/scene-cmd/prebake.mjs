// `scene prebake <ref>`: a canvas scene's static picture baked ONCE, at build time, for the prebaked player (src/app/78-scene-player.js).
//
//   node tools/anim-pack.mjs scene prebake <pack>/<id> [--out <dir>] [--quality 0.8] [--only-seasons spring,summer,autumn,winter]
//        [--light-keys day,golden,dusk,night] [--width 3440] [--seconds 180] [--no-gpu] [--compare-out <dir>]
//
// The scene's own renderer (78-scene-canvas.js) runs in headless Chrome (with the GPU unless --no-gpu) at the reference size
// (--width x 9/16: the whole 1600 x 900 safe frame, the sharpest a 3440-wide screen needs) for each season and light key:
//   day     the season's date at the sun's highest
//   golden  the evening, the sun 6 degrees up
//   dusk    the sun 4 degrees down
//   night   the sun at its lowest
// and writes, under assets/scenes/<pack>/<id>/ (or --out):
//   <season>-<key>-g<i>.webp      the depth groups (the land between the moving things; static shadows, water, reflections baked in)
//   <season>-<key>-s<g>.<k>.webp  the wind strips (reeds, grasses: skewed per frame at runtime)
//   <season>-<key>-cl<i>.webp     the clouds (drift per frame)
//   <season>-<key>-wr<i>/wm<i>    the water pass's reflection and mask (ripple and glints per frame)
//   <season>-<key>-lit<g>.webp    night only, when the scene has lit windows: the lights alone (added at the live window share)
//   <season>-<key>-atlas<p>.webp + <season>-<key>-sprites.json   the frame sprites (actors, birds, flows, the scene's own life),
//                                 pre-rasterised: the runtime's sprite cache is filled from them
//   <season>-c.json               the compiled scene the runtime needs (what moves: scenePrebakedReduce)
//   manifest.json                 the reference geometry, the key moments and altitudes, every file and its layout, the sizes
// The sky is NOT baked: the player paints the live sky (sceneSkyPaint) behind the land.
// Checks: the runtime path is emulated in the same page (the images decoded back, the reduced compiled scene, the atlas) and
// its frames compared with the full renderer's at t = 0, 6.5 and 13 s; the bake plan must be the same; sizes are reported.
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'], KEYS = ['day', 'golden', 'dusk', 'night'];
// a representative day in each season (the moon of that night is the night key's)
const DATES = { spring: '2026-04-22', summer: '2026-07-08', autumn: '2026-10-14', winter: '2027-01-13' };
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

/** In the page: the helpers (defined once). */
export const PAGE_LIB = `(() => {
  const b64 = (blob) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
  const enc = (c, q) => (typeof c.convertToBlob === 'function' ? c.convertToBlob({ type: 'image/webp', quality: q }) : new Promise(r => c.toBlob(r, 'image/webp', q)));
  const canvasOf = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const waitReady = (r, ready) => new Promise((res, rej) => { const t0 = performance.now(); const chk = () => { if (ready.v && !r.waiting && !r.baking) res(); else if (performance.now() - t0 > 120000) rej(new Error('bake timed out')); else setTimeout(chk, 50); }; chk(); });
  window.__pb = {
    /** The key moments of a date: ms at the sun's highest, the evening at +6, the evening at -4, the lowest (the night after). */
    moments(lat, lon, date) {
      const d0 = Date.parse(date + 'T00:00:00Z'), alt = (ms) => almSceneLight(ms, lat, lon, 'UTC').altitude;
      const st = 120000, pts = [];
      for (let ms = d0; ms <= d0 + 36 * 3600000; ms += st) pts.push([ms, alt(ms)]);
      const day = pts.filter(p => p[0] < d0 + 24 * 3600000).reduce((a, b) => (b[1] > a[1] ? b : a));
      const after = pts.filter(p => p[0] > day[0]);
      const cross = (v) => { for (let i = 1; i < after.length; i++) if (after[i - 1][1] >= v && after[i][1] < v) return after[i]; return null; };
      const golden = cross(6), dusk = cross(-4);
      const night = after.filter(p => p[0] < day[0] + 20 * 3600000).reduce((a, b) => (b[1] < a[1] ? b : a));
      const out = { day, golden, dusk, night };
      return Object.fromEntries(Object.entries(out).filter(([, v]) => v).map(([k, v]) => [k, { ms: v[0], alt: Math.round(v[1] * 10) / 10 }]));
    },
    /** The full bake of one season and key at W x H: the files (base64 WebP), the layout, the compiled scene. */
    async bake(o) {
      const it = animItem(o.ref), data = sceneData(it);
      const L = scenePrebakedLight(data, o.season, o.ms);
      const cv = canvasOf(o.W, o.H), ready = { v: false };
      const r = sceneRendererCreate(cv, data, { lod: 1, season: o.season, L, dpr: 1, time: () => 0, warm: false, governor: false, onReady: () => { ready.v = true; } });
      r.bakeIdle(o.W, o.H, { eager: true });
      await waitReady(r, ready);
      const ex = r.exportBake(), geo = r.geometry, C = r.compiled, st = r.stats();
      const files = {}, sizes = {};
      const put = async (name, c, q) => { const b = await enc(c, q); files[name] = await b64(b); sizes[name] = b.size; return b; };
      const blobs = {}, tiles = {};
      // under-paint: where a nearer group is opaque, a farther group's soft edge (within 3 px of its own pixels) takes the nearer
      // group's colour, fully opaque. Hidden by the nearer group anyway; without it, the two antialiased edges of neighbouring
      // depth groups leave a faint light seam once the images are scaled by the browser (each is filtered on its own)
      {
        const gs = ex.meta.groups.map((g, gi) => { const i = ex.names.indexOf('g' + gi); return i >= 0 && g.w ? { g, c: ex.list[i] } : null; });
        const ids = gs.map(e => (e ? e.c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, e.c.width, e.c.height) : null));
        for (let i = 0; i < gs.length; i++) {
          if (!gs[i]) continue;
          const F = gs[i], fd = ids[i].data, FW = F.c.width, FH = F.c.height;
          // the far group's alpha dilated by 3 px (where its soft edges reach)
          const near = new Uint8Array(FW * FH);
          for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (fd[(y * FW + x) * 4 + 3]) for (let dy = -3; dy <= 3; dy++) { const yy = y + dy; if (yy < 0 || yy >= FH) continue; for (let dx = -3; dx <= 3; dx++) { const xx = x + dx; if (xx >= 0 && xx < FW) near[yy * FW + xx] = 1; } }
          let n = 0;
          for (let j = i + 1; j < gs.length; j++) {
            if (!gs[j]) continue;
            const N = gs[j], nd = ids[j].data, NW = N.c.width, NH = N.c.height, ox = N.g.x - F.g.x, oy = N.g.y - F.g.y;
            for (let y = Math.max(0, oy); y < Math.min(FH, oy + NH); y++) for (let x = Math.max(0, ox); x < Math.min(FW, ox + NW); x++) {
              const p = y * FW + x, q = ((y - oy) * NW + (x - ox)) * 4;
              if (!near[p] || fd[p * 4 + 3] === 255 || nd[q + 3] !== 255) continue;
              fd[p * 4] = nd[q]; fd[p * 4 + 1] = nd[q + 1]; fd[p * 4 + 2] = nd[q + 2]; fd[p * 4 + 3] = 255; n++;
            }
          }
          if (n) F.c.getContext('2d').putImageData(ids[i], 0, 0);
        }
      }
      for (let i = 0; i < ex.names.length; i++) {
        const n = ex.names[i], c = ex.list[i];
        if (n === 'sky') continue;
        // the land groups as TILES: bands of 216 px cut to their non-empty runs (the browser decodes an image as a whole, one
        // after another: the empty ~40 % of a group is not decoded at all)
        if (/^g[0-9]+$/.test(n)) {
          const W = c.width, H = c.height, T = 216, d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data, list = [];
          for (let ty = 0; ty < H; ty += T) {
            const th = Math.min(T, H - ty), cols = [];
            for (let tx = 0; tx < W; tx += T) {
              let any = false;
              for (let y = ty; y < ty + th && !any; y += 1) for (let x = tx; x < Math.min(W, tx + T); x += 1) if (d[(y * W + x) * 4 + 3]) { any = true; break; }
              cols.push(any);
            }
            // runs of non-empty tiles (a gap of one empty tile is bridged: fewer images)
            let i0 = -1;
            for (let i = 0; i <= cols.length; i++) {
              const on = i < cols.length && (cols[i] || (i + 1 < cols.length && cols[i + 1] && i0 >= 0));
              if (on && i0 < 0) i0 = i;
              if (!on && i0 >= 0) { const x = i0 * T, w = Math.min(W, i * T) - x; list.push([x, ty, w, th]); i0 = -1; }
            }
          }
          tiles[n] = [];
          for (let k = 0; k < list.length; k++) {
            // each tile carries 4 px of its neighbours (its 'bleed'; the player clips it to the core): a scaled image is filtered
            // with what lies beyond its edge, so a tile cut exactly at its core shows a faint seam where it meets the next
            // (at the group's own edge there is no neighbour: its edge pixels are repeated, so the edge stays as opaque as it is)
            const P = 4, [x, y, w, h] = list[k], x0 = Math.max(0, x - P), y0 = Math.max(0, y - P), x1 = Math.min(W, x + w + P), y1 = Math.min(H, y + h + P);
            const tc = canvasOf(w + 2 * P, h + 2 * P), tx = tc.getContext('2d');
            tx.drawImage(c, x0, y0, x1 - x0, y1 - y0, x0 - x + P, y0 - y + P, x1 - x0, y1 - y0);
            const L = x0 - x + P, T = y0 - y + P, R = L + (x1 - x0), B = T + (y1 - y0);
            if (T > 0) tx.drawImage(tc, 0, T, tc.width, 1, 0, 0, tc.width, T);
            if (B < tc.height) tx.drawImage(tc, 0, B - 1, tc.width, 1, 0, B, tc.width, tc.height - B);
            if (L > 0) tx.drawImage(tc, L, 0, 1, tc.height, 0, 0, L, tc.height);
            if (R < tc.width) tx.drawImage(tc, R - 1, 0, 1, tc.height, R, 0, tc.width - R, tc.height);
            const tn = n + '.' + k;
            blobs[tn] = await put(tn, tc, o.q);
            tiles[n].push({ name: tn, x: x - P, y: y - P, w: w + 2 * P, h: h + 2 * P, core: [x, y, w, h] });
          }
          continue;
        }
        // masks lossless (their edges are the water's edge); the picture at the quality asked
        blobs[n] = await put(n, c, /^wm/.test(n) ? 1 : o.q);
      }
      const dims = {};
      ex.names.forEach((n, i) => { dims[n] = [ex.list[i].width, ex.list[i].height]; });
      // night lights: lit windows and lamps alone (the night bake with the windows on minus the same with them off), when there are any
      let lit = null;
      const lightsAny = L && L.windows && C.items.some(x => x.lit || (x.glowOn && x.glowOn.some(Boolean)) || (x.direct && x.direct.shapes && x.direct.shapes.some(s => s.glow)));
      if (o.key === 'night' && lightsAny) {
        const L0 = Object.assign({}, L, { windows: false, windowShare: 0 });
        const cv0 = canvasOf(o.W, o.H), rd = { v: false };
        const r0 = sceneRendererCreate(cv0, data, { lod: 1, season: o.season, L: L0, dpr: 1, time: () => 0, warm: false, governor: false, onReady: () => { rd.v = true; } });
        r0.bakeIdle(o.W, o.H, { eager: true });
        await waitReady(r0, rd);
        const ex0 = r0.exportBake();
        lit = [];
        for (let gi = 0; gi < ex.meta.groups.length; gi++) {
          const g = ex.meta.groups[gi], g0 = ex0.meta.groups[gi], c = ex.list[ex.names.indexOf('g' + gi)], c0 = ex0.list[ex0.names.indexOf('g' + gi)];
          if (!g.w || !c || !c0) { lit.push(null); continue; }
          // the difference in the lit bake's box (the unlit one drawn at its own place)
          const d = canvasOf(g.w, g.h), dx = d.getContext('2d', { willReadFrequently: true });
          dx.drawImage(c0, g0.x - g.x, g0.y - g.y);
          const A = dx.getImageData(0, 0, g.w, g.h).data, Bd = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, g.w, g.h);
          const B = Bd.data; let any = 0, x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
          for (let p = 0, i = 0; i < B.length; i += 4, p++) {
            const r1 = Math.max(0, B[i] - A[i]), g1 = Math.max(0, B[i + 1] - A[i + 1]), b1 = Math.max(0, B[i + 2] - A[i + 2]);
            B[i] = r1; B[i + 1] = g1; B[i + 2] = b1; B[i + 3] = 255;
            if (r1 + g1 + b1 > 6) { any++; const x = p % g.w, y = (p / g.w) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
          }
          if (any < 20) { lit.push(null); continue; }
          dx.putImageData(Bd, 0, 0);
          const w = x1 - x0 + 1, h = y1 - y0 + 1, e = canvasOf(w, h);
          e.getContext('2d').drawImage(d, x0, y0, w, h, 0, 0, w, h);
          blobs['lit' + gi] = await put('lit' + gi, e, o.q);
          lit.push({ x: g.x + x0, y: g.y + y0, w, h });
        }
        r0.destroy();
      }
      const red = scenePrebakedReduce(C), planFull = JSON.stringify(sceneBakePlan(C)), planRed = JSON.stringify(sceneBakePlan(red));
      window.__pbState = { r, L, data, ex, geo, blobs, red: JSON.stringify(red), o };
      return { files, sizes, dims, tiles, meta: ex.meta, geo, lit, red: window.__pbState.red, planSame: planFull === planRed,
        stats: { sprites: st.sprites, bakeMs: st.bakeMs, items: C.items.length, kept: red.items.length, lights: (C.lights || []).length },
        light: { alt: L.alt, dark: L.dark, stars: L.stars, wind: L.wind, windows: !!L.windows, lk: geo.lk } };
    },
    /** Emulate the runtime (the player's own restore from the encoded images, the reduced compiled scene) at the reference size:
     *  record the frame sprites it asks for over 'seconds' of play, pack them into an atlas, and compare its frames with the full bake's. */
    async runtime(o, man, K) {
      const S = window.__pbState, W = o.W, H = o.H;
      // the player's own loader on the encoded images (blob: URLs in place of the files), at the reference size
      const urls = {};
      for (const [n, b] of Object.entries(S.blobs)) { const u = URL.createObjectURL(b); urls[n] = u; _scpbBlobs.set(u, Promise.resolve(b)); }
      const fake = Object.assign({}, man, { dir: '' });
      const K2 = JSON.parse(JSON.stringify(K)), nameOf = (f) => f.replace(/^.*-(?=(g|s|cl|wr|wm|lit)[0-9])/, '').replace(/.webp$/, '');
      const swap = (e) => { if (e && e.file) e.file = urls[nameOf(e.file)]; };
      K2.groups.forEach(g => { swap(g); swap(g.lit); (g.strips || []).forEach(swap); (g.tiles || []).forEach(swap); });
      (K2.clouds || []).forEach(swap); Object.values(K2.pass || {}).forEach(swap);
      const G = { W, H, vs: man.vs, ox: man.ox, oy: man.oy };
      const KS = await _scpbLoadKey(fake, K2, G); await _scpbLoadPass(fake, KS);
      const sky = canvasOf(W, H);
      sceneSkyPaint(sky.getContext('2d', { alpha: false }), S.L, { view: man.view, sky: man.sky }, [G.vs, 0, 0, G.vs, G.ox, G.oy], false);
      sceneSprites.clear();
      const rec = new Map(), get0 = sceneSprites.get;
      sceneSprites.get = (key, build) => { const sp = get0.call(sceneSprites, key, build); rec.set(key, sp); return sp; };
      const cv = canvasOf(W, H), ready = { v: false };
      // the renderer's part of the player, drawn into one canvas for the comparison: the land images as bitmaps in their places
      const R = _scpbRestore(KS), gb = KS.groups.map(g => { if (!g.tiles || !g.tiles.length) return null; const c = canvasOf(Math.round(g.w), Math.round(g.h)), x = c.getContext('2d'); for (const t of g.tiles) { const q = t.core || t; x.drawImage(t.img, q.x - t.x, q.y - t.y, q.w, q.h, Math.round(q.x - g.x), Math.round(q.y - g.y), q.w, q.h); } return c; });
      const get1 = R.get;
      R.get = (n) => (n === 'sky' ? sky : /^g[0-9]+$/.test(n) ? gb[+n.slice(1)] : get1(n));
      R.meta.groups.forEach((m, gi) => { if (gb[gi]) { m.w = gb[gi].width; m.h = gb[gi].height; } });
      R.borrowed = true;
      const r2 = sceneRendererCreate(cv, null, { compiled: JSON.parse(S.red), restore: () => R, spriteVs: man.vs, lod: 1, season: o.season, L: S.L, dpr: 1, time: () => 0, governor: false, onReady: () => { ready.v = true; } });
      r2.bakeIdle(W, H, { eager: true });
      await waitReady(r2, ready);
      for (let t = 0; t <= o.seconds; t += 0.25) r2.frame(t);
      sceneSprites.get = get0;
      // compare with the full renderer's frames
      const diff = [];
      for (const t of [0, 6.5, 13]) {
        const a = S.r.snapshot(t), b = r2.snapshot(t);
        const A = a.getContext('2d').getImageData(0, 0, W, H).data, B = b.getContext('2d').getImageData(0, 0, W, H).data;
        let n = 0, max = 0, sum = 0;
        for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d > 8) n++; if (d > max) max = d; sum += d; }
        diff.push({ t, over8: Math.round(n / (W * H) * 10000) / 100, max, mean: Math.round(sum / (W * H) * 100) / 100 });
        if (o.compare && t === 6.5) { window.__pbCompare = [a, b]; }
      }
      // the atlas: shelf-packed pages of at most 4096 x 4096
      const list = [...rec.entries()];
      const sprites = list.filter(([, sp]) => sp && sp.c && sp.c.width && sp.c.height).sort((x, y) => y[1].c.height - x[1].c.height);
      const pages = [], entries = [];
      let page = null, x = 0, y = 0, rowH = 0;
      const newPage = () => { page = { items: [], w: 0, h: 0 }; pages.push(page); x = 0; y = 0; rowH = 0; };
      newPage();
      for (const [key, sp] of sprites) {
        const w = sp.c.width, h = sp.c.height;
        if (x + w > 4096) { x = 0; y += rowH + 2; rowH = 0; }
        if (y + h > 4096) { newPage(); }
        page.items.push([key, sp, x, y]); page.w = Math.max(page.w, x + w); page.h = Math.max(page.h, y + h);
        x += w + 2; rowH = Math.max(rowH, h);
      }
      const atlas = [];
      for (let pi = 0; pi < pages.length; pi++) {
        const pg = pages[pi];
        if (!pg.items.length) continue;
        const c = canvasOf(pg.w, pg.h), cx = c.getContext('2d');
        for (const [key, sp, ax, ay] of pg.items) { cx.drawImage(sp.c, ax, ay); entries.push([key, atlas.length, ax, ay, sp.c.width, sp.c.height, sp.x0, sp.y0, sp.w, sp.h, sp.sc]); }
        const b = await enc(c, 0.92);
        atlas.push({ data: await b64(b), size: b.size, w: pg.w, h: pg.h });
      }
      for (const [key, sp] of list) if (!sp || !sp.c) entries.push([key, -1, 0, 0, 0, 0, 0, 0, 0, 0, sp ? sp.sc || 1 : 1]);
      const st = r2.stats();
      r2.destroy(); S.r.destroy();
      for (const u of Object.values(urls)) { _scpbBlobs.delete(u); URL.revokeObjectURL(u); }
      return { diff, atlas, entries, frameSprites: sprites.length, empty: list.length - sprites.length, runtimeBakeMs: st.bakeMs };
    },
    /** The two frames of the last compare (full | prebaked emulation at t 6.5), as PNG base64. */
    async comparePng() { const [a, b] = window.__pbCompare || []; if (!a) return null; return [await b64(await a.convertToBlob({ type: 'image/png' })), await b64(await b.convertToBlob({ type: 'image/png' }))]; },
  };
  return true;
})()`;

export default {
  summary: 'pre-bake a canvas scene\'s static picture per season and light key into WebP layers, an atlas of its frame sprites and a manifest (the prebaked player)',
  usage: 'scene prebake <ref> [--out <dir>] [--quality 0.8] [--only-seasons s,..] [--light-keys day,golden,dusk,night] [--width 3440] [--seconds 180] [--no-gpu] [--compare-out <dir>]',
  options: {
    out: { type: 'string', help: 'prebake: the output folder (default assets/scenes/<pack>/<id>)' },
    quality: { type: 'string', help: 'prebake: the WebP quality of the picture layers, 0 to 1 (default 0.8; masks and the atlas are lossless)' },
    'only-seasons': { type: 'string', help: 'prebake: the seasons (default all four)' },
    'light-keys': { type: 'string', help: 'prebake: the light keys (default day,golden,dusk,night)' },
    width: { type: 'string', help: 'prebake: the reference width in device px (default 3440; the height is 9/16 of it)' },
    seconds: { type: 'string', help: 'prebake: seconds of play the frame-sprite atlas covers (default 180)' },
    'no-gpu': { type: 'boolean', help: 'prebake: software raster (slower; the same pixels within rounding)' },
    'compare-out': { type: 'string', help: 'prebake: write full | prebaked-emulation frames (PNG) of each key to this folder' },
  },
  async run(args, ctx) {
    const ref = (ctx.positionals || []).filter(x => x !== 'prebake')[0];
    if (!ref || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(ref)) throw new Error('usage: scene prebake <pack>/<id>');
    const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
    const out = resolve(args.out || join(root, 'assets', 'scenes', ref));
    const q = Math.max(0.3, Math.min(1, Number(args.quality) || 0.8));
    const seasons = args['only-seasons'] ? splitList(args['only-seasons']) : SEASONS, keys = args['light-keys'] ? splitList(args['light-keys']) : KEYS;
    const RW = Math.round(Number(args.width) || 3440), RH = Math.round(RW * 9 / 16);
    const seconds = Number(args.seconds) || 180;
    const { launchChrome } = await import('../../release-chrome.mjs');
    const { scenePageHtml } = await import('../scene-page.mjs');
    const chrome = await launchChrome(args['no-gpu'] ? {} : { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] });
    const log = (s) => (ctx.out ? ctx.out(s) : console.log(s));
    try {
      await chrome.screenshot({ html: scenePageHtml({ refs: [], size: { w: 64, h: 36 }, dpr: 1 }), width: 64, height: 36, scale: 1, transparent: false });
      const ok = await chrome.evaluate(PAGE_LIB);
      if (ok !== true) throw new Error('the page helpers did not load');
      const info = await chrome.evaluate(`(() => { const it = animItem(${JSON.stringify(ref)}); if (!it || !it.composed) return null; const d = sceneData(it), v = d.view || {}, cam = d.camera || {};
        return { lat: Number.isFinite(v.lat) ? v.lat : cam.lat, lon: Number.isFinite(v.lon) ? v.lon : cam.lon, id: d.id, v: d.v || 1 }; })()`);
      if (!info) throw new Error('not a composed scene: ' + ref);
      if (existsSync(out)) for (const f of readdirSync(out)) if (/\.(webp|json)$/.test(f)) rmSync(join(out, f));
      mkdirSync(out, { recursive: true });
      if (args['compare-out']) mkdirSync(resolve(args['compare-out']), { recursive: true });
      const man = { v: 1, ref, scene: info.id, W: RW, H: RH, vs: RW / 1600, ox: 0, oy: 0, quality: q, built: null, view: null, sky: null, seasons: {}, bytes: {} };
      let total = 0;
      const t0 = Date.now();
      for (const season of seasons) {
        const moments = await chrome.evaluate(`__pb.moments(${info.lat}, ${info.lon}, ${JSON.stringify(DATES[season])})`);
        const S = man.seasons[season] = { c: season + '-c.json', anchors: {}, keys: {} };
        let cJson = null, sBytes = 0;
        for (const key of keys) {
          const m = moments[key];
          if (!m) { log(`  ${season} ${key}: no such moment on ${DATES[season]} (skipped)`); continue; }
          const tk = Date.now();
          const b = await chrome.evaluate(`__pb.bake(${JSON.stringify({ ref, season, key, ms: m.ms, W: RW, H: RH, q })})`);
          if (!b || !b.files) throw new Error(`bake failed: ${season} ${key}`);
          if (!b.planSame) throw new Error(`the reduced compiled scene changes the bake plan (${season} ${key})`);
          if (!man.view) {
            const vs = await chrome.evaluate(`(() => { const C = __pbState.r.compiled; return { view: { horizon: C.view.horizon }, sky: C.sky ? { moonR: C.sky.moonR, sunR: C.sky.sunR, stars: C.sky.stars } : null }; })()`);
            Object.assign(man, vs);
          }
          if (cJson == null) cJson = b.red;
          else if (cJson !== b.red) {
            // the compiled scene differs by light (it should not): keep one per key
            S.keys[key + '-c'] = true;
          }
          const pre = `${season}-${key}-`, fileOf = (n) => pre + n + '.webp';
          let kBytes = 0;
          for (const [n, data] of Object.entries(b.files)) { const buf = Buffer.from(data, 'base64'); writeFileSync(join(out, fileOf(n)), buf); kBytes += buf.length; }
          const K = { ms: m.ms, alt: m.alt, wind: b.light.wind, dark: b.light.dark, lk: b.light.lk, groups: [], clouds: [], pass: {} };
          b.meta.groups.forEach((g, gi) => {
            const strips = (g.strips || []).map((s, k) => ({ file: fileOf('s' + gi + '.' + k), x: s.x, y: s.y, w: b.dims['s' + gi + '.' + k][0], h: b.dims['s' + gi + '.' + k][1], base: s.base, xMid: s.xMid, amp: s.amp }));
            const e = { file: null, tiles: (b.tiles['g' + gi] || []).map(t => ({ file: fileOf(t.name), x: g.x + t.x, y: g.y + t.y, w: t.w, h: t.h, core: [g.x + t.core[0], g.y + t.core[1], t.core[2], t.core[3]] })), x: g.x, y: g.y, w: g.w, h: g.h, opaqueY: g.opaqueY, strips };
            if (b.lit && b.lit[gi]) e.lit = Object.assign({ file: fileOf('lit' + gi) }, b.lit[gi]);
            K.groups.push(e);
          });
          b.geo.clouds.forEach((c, i) => { const d = b.dims['cl' + i]; if (d) K.clouds.push({ file: fileOf('cl' + i), w: c.w, h: c.h, x0: c.x0, y: c.y, sp: c.sp, pw: d[0], ph: d[1] }); });
          for (const n of Object.keys(b.files)) if (/^(wr|wm)\d+$/.test(n)) K.pass[n] = { file: fileOf(n), w: b.dims[n][0], h: b.dims[n][1] };
          // the runtime emulated: the frame sprites it needs, and its frames against the full bake's
          const rt = await chrome.evaluate(`__pb.runtime(${JSON.stringify({ season, key, W: RW, H: RH, seconds, compare: !!args['compare-out'] })}, ${JSON.stringify({ vs: man.vs, ox: 0, oy: 0, view: man.view, sky: man.sky })}, ${JSON.stringify(K)}).catch(e => ({ error: String(e && e.stack || e) }))`);
          if (!rt || rt.error) throw new Error(`runtime emulation failed (${season} ${key}): ${rt ? rt.error : "no answer"}`);
          K.atlas = rt.atlas.map((a, i) => { const f = pre + 'atlas' + i + '.webp', buf = Buffer.from(a.data, 'base64'); writeFileSync(join(out, f), buf); kBytes += buf.length; return f; });
          K.sprites = pre + 'sprites.json';
          const sj = JSON.stringify(rt.entries);
          writeFileSync(join(out, K.sprites), sj); kBytes += Buffer.byteLength(sj);
          if (args['compare-out']) {
            const pngs = await chrome.evaluate('__pb.comparePng()');
            if (pngs) { writeFileSync(join(resolve(args['compare-out']), `${season}-${key}-full.png`), Buffer.from(pngs[0], 'base64')); writeFileSync(join(resolve(args['compare-out']), `${season}-${key}-prebaked.png`), Buffer.from(pngs[1], 'base64')); }
          }
          S.keys[key] = K;
          S.anchors[key] = key === 'day' ? Math.min(24, Math.max(10, m.alt)) : key === 'golden' ? 6 : key === 'dusk' ? -4 : Math.max(-11, Math.min(-6, m.alt));
          sBytes += kBytes;
          man.bytes[season + '-' + key] = kBytes;
          log(`  ${season.padEnd(7)} ${key.padEnd(7)} alt ${String(m.alt).padStart(6)}  ${(kBytes / 1048576).toFixed(2)} MB  (${Object.keys(b.files).length} layers, ${rt.frameSprites} frame sprites + ${rt.empty} empty in ${rt.atlas.length} atlas page(s))  items ${b.stats.items} -> ${b.stats.kept}`
            + `  runtime vs full: ${rt.diff.map(d => `t${d.t}: ${d.over8}% px >8, mean ${d.mean}`).join('; ')}  ${((Date.now() - tk) / 1000).toFixed(1)} s`);
        }
        writeFileSync(join(out, S.c), cJson || '{}');
        sBytes += Buffer.byteLength(cJson || '{}');
        man.bytes[season] = sBytes;
        total += sBytes;
      }
      man.bytes.total = total;
      man.built = new Date().toISOString().slice(0, 10);
      writeFileSync(join(out, 'manifest.json'), JSON.stringify(man));
      log(`prebaked ${ref}: ${Object.keys(man.seasons).length} season(s) x ${keys.length} key(s) at ${RW} x ${RH}, ${(total / 1048576).toFixed(2)} MB in ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      return 0;
    } finally { await chrome.close(); }
  },
};
