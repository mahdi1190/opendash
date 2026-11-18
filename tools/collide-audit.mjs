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
const { sandboxEnv } = await import(pathToFileURL(ENV_MODULE).href);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WORK = path.join(OUT, 'run-' + LABEL), DATA = path.join(WORK, 'data-' + PORT), PROFILE = path.join(WORK, 'profile-' + CDP), THUMB_DIR = path.join(OUT, LABEL + '-thumbs');
for (const d of [DATA, PROFILE, THUMB_DIR]) fs.rmSync(d, { recursive: true, force: true });
for (const d of [DATA, THUMB_DIR]) fs.mkdirSync(d, { recursive: true });

/* ---------- the part that runs in the page ---------- */
async function inPageAudit() {
  const W = GARDEN_WORLD, nw = _gw.nativeWorld, scene = nw.root.scene, m = gardenHere(), CW = W.cellW, CH = W.cellH;
  const toCell = (X, Y) => ({ x: X / CW, y: (Y - W.sky) / CH }), toPx = (x, y) => ({ X: x * CW, Y: W.sky + y * CH });
  const big = { x: -2400, y: -2400, w: W.cols * CW + 4800, h: W.sky + W.rows * CH + 4800 };
  // every painter places everything it would place anywhere on the map (they bake lazily near the camera)
  for (let i = 0; i < 900; i++) {
    for (const P of [window.GardenPaintWood, window.GardenPaintVale]) if (P && P.tick) try { P.tick(performance.now(), big); } catch (e) { /* a painter's own error is in its status */ }
    if (i % 40 === 39) await new Promise(r => setTimeout(r, 0));
  }
  _gw.grid = null; const grid = _gwGrid(m, true), D = gardenCollideData(m);
  const regionOf = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x, y) : null; return r ? r.id : 'coast-or-sea'; };
  const free = (x, y) => _gwFree(x, y);
  // ---------- the drawn side: every standing sprite, with its pixels ----------
  const recByRoot = new Map(); for (const r of nw.entities.values()) recByRoot.set(r.root, r);
  const owner = o => { for (let p = o; p; p = p.parentContainer) { const r = recByRoot.get(p); if (r) return r; } return null; };
  const pix = new Map();
  const pixelsOf = im => {
    const fr = im.frame, src = fr && fr.source && fr.source.image; if (!src || !(src instanceof HTMLCanvasElement || src instanceof HTMLImageElement)) return null;
    const key = im.texture.key + '#' + fr.name; if (pix.has(key)) return pix.get(key);
    let out = null;
    try {
      const w = fr.cutWidth, h = fr.cutHeight; if (!w || !h || w * h > 4e6) { pix.set(key, null); return null; }
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h); const data = cx.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
      // The drawn base: what stands on the ground, not a fallen apple or a tuft beside it. Solid paint only (alpha >= 160, so
      // a soft shadow does not count); in the lowest tenth of the drawing, the widest run of columns painted in most of its
      // rows (a trunk, a wall, a post), and its lowest painted row.
      let top = h, bottom = -1;
      for (let v = 0; v < h && top === h; v++) for (let u = 0; u < w; u++) if (a[v * w + u] >= 160) { top = v; break; }
      for (let v = h - 1; v >= 0 && bottom < 0; v--) { let n = 0; for (let u = 0; u < w; u++) if (a[v * w + u] >= 160 && ++n >= 2) { bottom = v; break; } }
      let vb = -1, u0 = w, u1 = -1;
      if (bottom >= top) {
        const band = Math.max(4, Math.min(40, Math.round((bottom - top) * .1))), b0 = Math.max(top, bottom - band), rowsN = bottom - b0 + 1, col = new Uint16Array(w);
        for (let v = b0; v <= bottom; v++) for (let u = 0; u < w; u++) if (a[v * w + u] >= 160) col[u]++;
        let best = null; for (const thr of [.6, .35, .15]) { if (best) break; for (let u = 0, s = -1; u <= w; u++) { const on = u < w && col[u] >= rowsN * thr; if (on && s < 0) s = u; if (!on && s >= 0) { if (!best || u - s > best[1] - best[0]) best = [s, u - 1]; s = -1; } } }   // (a fallen apple under the tree: the trunk is painted in fewer of the lowest rows)
        if (best) { u0 = best[0]; u1 = best[1]; for (let v = bottom; v >= b0 && vb < 0; v--) for (let u = u0; u <= u1; u++) if (a[v * w + u] >= 160) { vb = v; break; } }
      }
      out = { w, h, a, vb, u0, u1, top };
    } catch (e) { out = null; }
    pix.set(key, out); return out;
  };
  const KIND = (k, rec) => {
    const md = rec && rec.metadata || {};
    if (/^__garden|^gpwd-|^gpw-|gpw-mist|gpw-foam|\|u\|/.test(k)) return '';
    if (/\|plant\.(planter|rph-flower-tub|tub|pot)/.test(k)) return 'decor';
    if (/\|plant\./.test(k)) return '';   // bracken, ferns, reeds, shrubs: flora you brush through by design
    if (/\|tree\.|^gpwo\||\|(pine|rowan)\|/.test(k)) return 'tree';
    if (/\|peak\||\|crag\||\|rock\.|boulder/.test(k)) return 'rock';
    if (/\|building\.|\|structure\./.test(k)) return 'building';
    if (/\|gate\||gatesign|\|falls\|/.test(k)) return 'gate';
    if (/ruin|wall|terrace/.test(k)) return 'wall';
    if (/fence|railing|hedge/.test(k)) return 'fence';
    if (/^gpm\|/.test(k)) return 'landmark';
    if (md.kind === 'plant' || md.kind === 'ground') return '';   // (a planted row, or understory: the planting's own rules)
    if (/^gpv-\d\|[^|]*\|[^|]*\|t\|(crates|pots|net|boat|crate|bench|anchor|fishbox)/.test(k)) return 'harbour';
    if (md.kind === 'decor' || /\|dec\|/.test(k)) return 'decor';
    if (md.kind === 'prop' || md.kind === 'scenery' || /^gpp\||\|street\./.test(k)) return 'prop';
    if (/^gpv-|^gpt-/.test(k)) return 'prop';
    return 'other';
  };
  const objs = [];
  const visit = o => {
    if (!o) return; const list = o.list || null;
    if ((o.type === 'Image' || o.type === 'Sprite') && o.texture) {
      const k = String(o.texture.key || ''), rec = owner(o), kind = KIND(k, rec);
      if (kind && o.depth > -9000) {
        const P = pixelsOf(o);
        if (P && P.vb >= 0 && P.u1 >= P.u0) {
          // (copied: Phaser hands back one shared matrix for every object)
          const wm = o.getWorldTransformMatrix(), mx = { a: wm.a, b: wm.b, c: wm.c, d: wm.d, e: wm.e, f: wm.f }, ox = o.displayOriginX, oy = o.displayOriginY;
          mx.det = mx.a * mx.d - mx.b * mx.c;
          const wp = (u, v) => { const x = u - ox, y = v - oy; return { X: x * mx.a + y * mx.c + mx.e, Y: x * mx.b + y * mx.d + mx.f }; };
          const a = wp(P.u0, P.vb), b = wp(P.u1 + 1, P.vb + 1), t = wp(P.u0, P.top), bb = o.getBounds();
          const X0 = Math.min(a.X, b.X), X1 = Math.max(a.X, b.X), Yb = Math.max(a.Y, b.Y), heightPx = Math.abs(Yb - t.Y);
          const md = rec && rec.metadata || {}, prop = md.prop || null;
          const name = prop ? prop.name || prop.id : md.id ? String(md.id) : k.split('|').filter(s => s && !/^[0-9a-f]{12,}$/.test(s) && !/^(autumn|summer|winter|spring|d|t|o|f|s|base|gdpaint|gpp|gpm|gpv-1|gpt-3)$/.test(s)).slice(0, 2).join(' ');
          objs.push({ im: o, rec, key: k, kind, name, X0, X1, Yb, heightPx, bounds: { x: bb.x, y: bb.y, w: bb.width, h: bb.height }, P, mx, ox, oy, prop });
        }
      }
    }
    if (list) for (const c of list) visit(c);
  };
  visit(scene.children);
  // opaque paint at a world point, from any standing sprite (inverse transform into its texture)
  const buckets = new Map(), BK = 96; const bkey = (i, j) => i + ',' + j;
  // vector drawings (props, sights, decorations drawn as shapes): their own hit test is their paint
  const vec = [];
  for (const r of nw.entities.values()) { const k = r.metadata && r.metadata.kind; if (!['prop', 'scenery', 'decor', 'land'].includes(k) || !r.handle || !r.bounds) continue; vec.push({ vector: true, rec: r, bounds: { x: r.bounds.x, y: r.bounds.y, w: r.bounds.width, h: r.bounds.height } }); }
  for (const o of objs.concat(vec)) { const b = o.bounds; for (let j = Math.floor(b.y / BK); j <= Math.floor((b.y + b.h) / BK); j++) for (let i = Math.floor(b.x / BK); i <= Math.floor((b.x + b.w) / BK); i++) { const k = bkey(i, j); (buckets.get(k) || buckets.set(k, []).get(k)).push(o); } }
  const paintAt = (X, Y, except) => {
    for (const o of buckets.get(bkey(Math.floor(X / BK), Math.floor(Y / BK))) || []) {
      if (o === except) continue; const b = o.bounds; if (X < b.x || X > b.x + b.w || Y < b.y || Y > b.y + b.h) continue;
      if (o.vector) { if (!o.rec.handle.hitPoint || o.rec.handle.hitPoint(X, Y)) return o; continue; }   // (a drawing with no hit test of its own: its box)
      const M = o.mx, dx = X - M.e, dy = Y - M.f, lx = (M.d * dx - M.c * dy) / M.det, ly = (M.a * dy - M.b * dx) / M.det, u = Math.floor(lx + o.ox), v = Math.floor(ly + o.oy);
      if (u >= 0 && v >= 0 && u < o.P.w && v < o.P.h && o.P.a[v * o.P.w + u] >= 120) return o;
    }
    return null;
  };
  // ---------- compare ----------
  const faults = [], push = f => { f.region = regionOf(f.x, f.y); faults.push(f); };
  const noBlock = new Set(['gate']);
  const softProp = p => p && gardenPropCol(p) === 'none';
  const solidsNear = (x0, y0, x1, y1) => D.rects.filter(r => r.x1 > x0 && r.x0 < x1 && r.y1 > y0 && r.y0 < y1);
  const hardAt = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows && grid.hard[cy * W.cols + cx] ? D.cellWhy.get(cy * W.cols + cx) || 'blocked cell' : ''; };
  let checked = 0;
  for (const o of objs) {
    if (noBlock.has(o.kind) || softProp(o.prop) || o.heightPx < 14) continue;
    if (o.rec && o.rec.metadata && o.rec.metadata.kind === 'decor') { const d = gardenDecorById(m, o.rec.metadata.uid); if (d && (gardenDecorCol(d.def) === 'none' || d.def.layer === 'ground')) continue; }
    checked++;
    const a = toCell(o.X0, o.Yb), b = toCell(o.X1, o.Yb), span = b.x - a.x, mid = (a.x + b.x) / 2, yb = a.y;
    if (yb < 0 || yb > W.rows || mid < 0 || mid > W.cols) continue;
    const yTest = yb - 4 / CH, xs = span < .3 ? [mid] : [a.x + span * .2, mid, b.x - span * .2];
    const freeN = xs.filter(x => free(x, yTest)).length, midFree = free(mid, yTest);
    const base = { obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: +mid.toFixed(2), y: +yb.toFixed(2), span: +span.toFixed(2) };
    if (midFree && (xs.length === 1 || freeN >= 2)) { push({ kind: 'walk-through', ...base, detail: 'feet can stand on its drawn base (' + freeN + ' of ' + xs.length + ' test points free)' }); continue; }
    // what blocks at its base: boxes and cells along the base line, a third of a cell deep
    const band = { y0: yb - .35, y1: yb + .05 };
    // (only blocks that reach under this base: a neighbour's trunk beside it is the neighbour's)
    const rs = solidsNear(a.x - .15, band.y0, b.x + .15, band.y1);
    let bx0 = Infinity, bx1 = -Infinity;
    for (const r of rs) { bx0 = Math.min(bx0, r.x0); bx1 = Math.max(bx1, r.x1); }
    const cellsUnder = []; for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) if (hardAt(x + .5, yb - .15)) cellsUnder.push(x);
    for (const x of cellsUnder) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x + 1); }
    if (!(bx1 > bx0)) {
      // nothing under the base, though the feet cannot stand there (water or the shore): fine; otherwise look a little round it
      const near = solidsNear(a.x - .6, band.y0 - .4, b.x + .6, band.y1 + .3); if (!near.length) continue;
      let c0 = Infinity, c1 = -Infinity; for (const r of near) { c0 = Math.min(c0, r.x0); c1 = Math.max(c1, r.x1); }
      if (Math.abs((c0 + c1) / 2 - mid) > .25) push({ kind: 'block-offset', ...base, detail: 'its block stands ' + ((c0 + c1) / 2 - mid).toFixed(2) + ' cells beside the drawn base' });
      continue;
    }
    const bw = bx1 - bx0, bc = (bx0 + bx1) / 2;
    if (span > .6 && bw < span * .4) push({ kind: 'block-size', ...base, detail: 'block ' + bw.toFixed(2) + ' cells wide under a base ' + span.toFixed(2) + ' wide (too small)' });
    else if (rs.length && bw > .8 && bw > Math.max(span * 2, span + 1)) push({ kind: 'block-size', ...base, detail: 'block ' + bw.toFixed(2) + ' cells wide under a base ' + span.toFixed(2) + ' wide (too big)' });
    if (Math.abs(bc - mid) > Math.max(.35, span * .4) && !(bx0 <= mid && bx1 >= mid)) push({ kind: 'block-offset', ...base, detail: 'block centre ' + (bc - mid).toFixed(2) + ' cells from the base centre' });
  }
  // invisible walls: boxes and cells that block where no standing thing has paint
  const painted = (x0, y0, x1, y1) => { for (const fy of [.15, .5, .85]) for (const fx of [.15, .5, .85]) { const p = toPx(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy); if (paintAt(p.X, p.Y)) return true; } return false; };
  for (const r of D.rects) {
    if (r.form) continue;   // (a landform: its outline is checked against its drawing below)
    if (painted(r.x0 - .06, r.y0 - .1, r.x1 + .06, r.y1 + .04)) continue;
    push({ kind: 'invisible-wall', obj: /trunk/.test(r.src) ? 'tree' : /harbour/.test(r.src) ? 'harbour' : /lamp|pier|post/.test(r.src) ? 'prop' : /wall|rock/.test(r.src) ? 'wall' : 'prop', name: r.src, x: +((r.x0 + r.x1) / 2).toFixed(2), y: +r.y1.toFixed(2), w: +(r.x1 - r.x0).toFixed(2), h: +(r.y1 - r.y0).toFixed(2), detail: 'box ' + [r.x0, r.y0, r.x1, r.y1].map(v => v.toFixed(2)).join(', ') + ' with nothing drawn on it' });
  }
  const cellGroups = new Map();
  for (const c of D.cells) {
    if (!/^(static cell|building cell|decoration)/.test(c.src)) continue;
    if (painted(c.x, c.y, c.x + 1, c.y + 1)) continue;
    const id = c.src.replace(/ cell \d+,\d+/, ' cell'); (cellGroups.get(id) || cellGroups.set(id, []).get(id)).push(c);
  }
  for (const [id, list] of cellGroups) { const x = list.reduce((s, c) => s + c.x + .5, 0) / list.length, y = list.reduce((s, c) => s + c.y + .5, 0) / list.length; push({ kind: 'invisible-wall', obj: /^decoration/.test(id) ? 'decor' : 'building', name: id, x: +x.toFixed(2), y: +y.toFixed(2), detail: list.length + ' blocked cell(s) with nothing drawn: ' + list.slice(0, 6).map(c => c.x + ',' + c.y).join(' ') }); }
  // landforms: the polygon is what is drawn (the painters draw it; layout contract) vs where the feet are stopped
  const island = gardenIslandData(), inLoop = (x, y, pts) => { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) on = !on; } return on; };
  for (const f of island.landforms || []) {
    if (!f.polygon || f.col !== 'full') continue;
    const xs = f.polygon.map(p => p[0]), ys = f.polygon.map(p => p[1]); let walkIn = 0, ghost = 0, wx = 0, wy = 0, gx = 0, gy = 0; const st = .2, A = st * st;
    for (let y = Math.max(0, Math.min(...ys) - 1); y < Math.min(W.rows, Math.max(...ys) + 1); y += st) for (let x = Math.max(0, Math.min(...xs) - 1); x < Math.min(W.cols, Math.max(...xs) + 1); x += st) {
      const inside = inLoop(x, y, f.polygon), why = hardAt(x, y);
      if (inside && !why && free(x, y)) { walkIn += A; wx += x; wy += y; }
      else if (!inside && why && why.includes(f.id)) { ghost += A; gx += x; gy += y; }
    }
    const kindObj = f.kind === 'mountain' || f.kind === 'rock-wall' ? 'rock' : 'wall';
    if (walkIn >= .3) push({ kind: 'drawn-blocked-walkable', obj: kindObj, name: (f.kind + ' ' + f.id), x: +(wx / (walkIn / A)).toFixed(2), y: +(wy / (walkIn / A)).toFixed(2), detail: walkIn.toFixed(2) + ' square cells of the drawn ' + f.kind + ' are walkable' });
    if (ghost >= .3) push({ kind: 'invisible-wall', obj: kindObj, name: (f.kind + ' ' + f.id), x: +(gx / (ghost / A)).toFixed(2), y: +(gy / (ghost / A)).toFixed(2), detail: ghost.toFixed(2) + ' square cells blocked by its cells outside the drawn ' + f.kind });
  }
  // click areas against the art they belong to
  for (const c of D.clicks) {
    if (!c.act) continue;
    const mine = objs.filter(o => o.rec && o.rec.metadata && o.rec.metadata.prop && o.rec.metadata.prop.id === c.id);
    let ax0 = Infinity, ax1 = -Infinity, ab = -Infinity;
    for (const o of mine) { const p0 = toCell(o.X0, o.Yb), p1 = toCell(o.X1, o.Yb); ax0 = Math.min(ax0, toCell(o.bounds.x, 0).x); ax1 = Math.max(ax1, toCell(o.bounds.x + o.bounds.w, 0).x); ab = Math.max(ab, p0.y); void p1; }
    if (!mine.length) { if (c.art) { ax0 = c.art.x0; ax1 = c.art.x1; ab = c.art.y1; } else continue; }
    const ow = c.own.x1 - c.own.x0, ov = Math.max(0, Math.min(c.own.x1, ax1) - Math.max(c.own.x0, ax0)), cx = (c.own.x0 + c.own.x1) / 2;
    let on = 0, n = 0; for (const fy of [.2, .5, .8]) for (const fx of [.15, .5, .85]) { n++; const p = toPx(c.own.x0 + ow * fx, c.own.y0 + (c.own.y1 - c.own.y0) * fy); if (mine.some(o => paintAt(p.X, p.Y) === o) || paintAt(p.X, p.Y)) on++; }
    const base = { obj: 'prop', name: c.name, x: +cx.toFixed(2), y: +c.own.y1.toFixed(2) };
    if (ov < ow * .5) push({ kind: 'click-area', ...base, detail: 'click area ' + ow.toFixed(1) + ' wide overlaps the art by ' + ov.toFixed(2) + ' cells' });
    else if (Math.abs(c.own.y1 - ab) > .8 && mine.length) push({ kind: 'click-area', ...base, detail: 'click area ends ' + (c.own.y1 - ab).toFixed(2) + ' rows from the drawn base' });
    else if (on / n < .34) push({ kind: 'click-area', ...base, detail: 'only ' + on + ' of ' + n + ' points of the click area are over the art' });
  }
  // doors and arrival points nobody can reach (from where you arrive)
  const keep = { px: _gw.px, py: _gw.py }; _gw.px = W.start.x + .5; _gw.py = W.start.y + .5; _gw.reach = null;
  const reach = _gwReach();
  for (const d of D.doors) {
    let ok = false; for (let dy = -1.2; dy <= 1.2 && !ok; dy += .2) for (let dx = -1.2; dx <= 1.2 && !ok; dx += .2) { const x = d.x + dx, y = d.y + dy; if (Math.hypot(dx, dy) <= 1.25 && free(x, y) && reach[Math.floor(y) * W.cols + Math.floor(x)]) ok = true; }
    if (!ok) push({ kind: 'door-unreachable', obj: d.kind === 'gate' ? 'gate' : 'prop', name: d.name, x: +d.x.toFixed(2), y: +d.y.toFixed(2), detail: d.kind + ' point with no reachable standing room within 1.2 cells' });
  }
  _gw.px = keep.px; _gw.py = keep.py; _gw.reach = null;
  // paths drawn but not walkable (sampled along each route's middle line)
  for (const r of island.routes || []) {
    if (!r.points || r.points.length < 2) continue;
    const pts = gardenIslandRoutePath(r).points; let run = null;
    const flush = () => { if (run && run.n >= 2) push({ kind: 'path-blocked', obj: 'path', name: 'path ' + r.id, x: +run.x.toFixed(2), y: +run.y.toFixed(2), detail: (run.n * .4).toFixed(1) + ' cells of path blocked by ' + [...run.why].slice(0, 3).join('; ') }); run = null; };
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], len = Math.hypot(q.x - p.x, q.y - p.y), n = Math.max(1, Math.round(len / .4));
      for (let k = 0; k < n; k++) {
        const x = p.x + (q.x - p.x) * k / n, y = p.y + (q.y - p.y) * k / n;
        if (free(x, y) || free(x + .3, y) || free(x - .3, y) || free(x, y + .3) || free(x, y - .3)) { flush(); continue; }
        const why = gardenCollideAt(x, y); if (!why.length) why.push('the feet test (edge of water or a box)');
        if (!run) run = { x, y, n: 0, why: new Set() }; run.n++; for (const w of why) run.why.add(w);
      }
    }
    flush();
  }
  // tally
  const counts = { byKind: {}, byRegion: {}, byObject: {}, byRegionKind: {} };
  for (const f of faults) { counts.byKind[f.kind] = (counts.byKind[f.kind] || 0) + 1; counts.byRegion[f.region] = (counts.byRegion[f.region] || 0) + 1; counts.byObject[f.obj] = (counts.byObject[f.obj] || 0) + 1; const k = f.region + ' / ' + f.kind; counts.byRegionKind[k] = (counts.byRegionKind[k] || 0) + 1; }
  const objKinds = {}; for (const o of objs) objKinds[o.kind] = (objKinds[o.kind] || 0) + 1;
  return { total: faults.length, counts, faults, scanned: { sprites: objs.length, checked, byKind: objKinds, rects: D.rects.length, cells: D.cells.length, doors: D.doors.length, clicks: D.clicks.length, landforms: (island.landforms || []).length, routes: (island.routes || []).length } };
}

/* ---------- the sandbox ---------- */
const srv = spawn(process.execPath, ['serve.mjs', '--port', String(PORT), '--no-open', '--data-dir', DATA], { cwd: REPO, stdio: 'ignore', env: sandboxEnv() });
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`, '--window-size=1500,900', 'about:blank'], { stdio: 'ignore' });
let finished = false;
const stop = async code => { if (finished) return; finished = true; try { br.kill(); } catch { /* gone */ } try { srv.kill(); } catch { /* gone */ } await sleep(500); process.exit(code); };
setTimeout(() => { console.error('overall timeout'); stop(3); }, 40 * 60 * 1000);
let tabs = null; for (let i = 0; i < 60 && !tabs; i++) { await sleep(500); try { tabs = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); } catch { /* not up yet */ } }
const page = tabs.find(t => t.type === 'page'); const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
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
  const result = await ev(`(${inPageAudit.toString()})()`, 600000);
  result.label = LABEL; result.clock = CLOCK; result.errors = errors.slice(0, 20); result.when = new Date().toISOString();
  console.log('faults', result.total, JSON.stringify(result.counts.byKind));
  // thumbnails with the collision view on, worst first (walk-through and invisible walls, then the rest)
  const order = { 'walk-through': 0, 'invisible-wall': 1, 'path-blocked': 2, 'door-unreachable': 3, 'block-offset': 4, 'block-size': 5, 'drawn-blocked-walkable': 6, 'click-area': 7 };
  const picks = result.faults.map((f, i) => ({ f, i })).sort((a, b) => (order[a.f.kind] ?? 9) - (order[b.f.kind] ?? 9)).slice(0, THUMBS);
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
