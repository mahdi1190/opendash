/*
 * The part of tools/collide-audit.mjs that runs inside the page (a dev tool, not a test). One async function expression:
 * the tool evaluates `(<this file>)(options)` in the throwaway sandbox and gets back { total, counts, faults, scanned }.
 *
 * What it compares, everywhere on the map:
 *   the drawn side   each standing sprite's own pixels (its drawn base: the trunk or wall foot, not leaf litter or a
 *                    shadow), and a picture of the whole map as the game draws it (a mosaic of the real canvas with the
 *                    collision view off, read back as "is this pixel water-coloured")
 *   the walking side the real feet test (_gwFree), the boxes (_gwBuildSolids), the walking grid, the routes' planner
 * Checks (kind):
 *   walk-through, block-size, block-offset   a standing thing against the block at its drawn base; a tree drawn as shapes
 *                                            (1b); stonework (gates, walls) column by column along its drawn foot (1c)
 *   invisible-wall                           a box, a blocked cell or a locked plot with nothing drawn on it; a block
 *                                            between the drawn parts of a thing, or running on past its drawn ends (1c)
 *   drawn-blocked-walkable                   a drawn rock or wall (landform) the feet can walk into
 *   water-walkable, shore-blocked, shore-drawn-dry   every shoreline: feet on drawn water; feet stopped on dry land
 *                                            beside water; water drawn as dry ground
 *   crossing-gap, crossing-deck              every bridge, footbridge, stepping stones and pier: both ends join their
 *                                            paths; what you can walk on is the drawn deck
 *   locked-edge                              a locked plot edge that stops the feet where its painter draws no fence
 *   decor-foot                               every placeable decoration (each family, each way round): its block
 *                                            against its art; a fence's block reaches each joint of a run; a long
 *                                            thing's drawn ends stop the feet
 *   cast-on-dry                              a cell middle the cast accepts as water that is drawn as ground or rock
 *   door-unreachable                         a door, gate or arrival point you cannot walk to from where you arrive
 *   click-area                               a click area that is not on its art
 *   path-blocked                             a drawn path that is not walkable along its middle or across its width
 *   closed-edge                              each region closed in turn: a way into it that is not its gate, or a gate
 *                                            that cannot be walked up to
 *   draw-order                               a standing thing that sorts above or below its own drawn base, where the
 *                                            feet can stand in between: you are drawn on the wrong side of it
 *   slide-stall, slide-jitter                how walking feels: a diagonal press into an edge that stops dead where it
 *                                            could slide on, or shakes on the spot
 *   overlap                                  two drawn things on top of each other that are not meant to be: a field
 *                                            over a path, a path under a building, a path over water, a thing standing
 *                                            on a path, a thing inside another, a building on a field (each pair once)
 *   route-none, route-detour, route-stall    click-to-walk: no way found where the feet have one; a way much longer than
 *                                            the feet need; a walk that stands still or never arrives (followed frame by
 *                                            frame the way the game follows it)
 */
(async function collideAuditPage(opts) {
  opts = opts || {};
  const W = GARDEN_WORLD, nw = _gw.nativeWorld, scene = nw.root.scene, CW = W.cellW, CH = W.cellH;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let m = gardenHere();
  const toCell = (X, Y) => ({ x: X / CW, y: (Y - W.sky) / CH }), toPx = (x, y) => ({ X: x * CW, Y: W.sky + y * CH });
  const big = { x: -2400, y: -2400, w: W.cols * CW + 4800, h: W.sky + W.rows * CH + 4800 };
  const tickAll = async n => { for (let i = 0; i < n; i++) { for (const P of [window.GardenPaintWood, window.GardenPaintVale]) if (P && P.tick) try { P.tick(performance.now(), big); } catch (e) { /* a painter's own error is in its status */ } if (i % 40 === 39) await sleep(0); } };
  await tickAll(900);   // every painter places everything it would place anywhere on the map (they bake lazily near the camera)
  _gw.grid = null; let grid = _gwGrid(m, true), D = gardenCollideData(m);
  const island = gardenIslandData(), lvl = m.level.level;
  const regionOf = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x, y) : null; return r ? r.id : 'coast-or-sea'; };
  const free = (x, y) => _gwFree(x, y);
  const inLoop = (x, y, pts) => { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) on = !on; } return on; };
  const faults = [], push = f => { if (!f.region) f.region = regionOf(f.x, f.y); f.x = +(+f.x).toFixed(2); f.y = +(+f.y).toFixed(2); faults.push(f); };
  const hardAt = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows && grid.hard[cy * W.cols + cx] ? D.cellWhy.get(cy * W.cols + cx) || 'blocked cell' : ''; };

  /* ---------- the drawn side: every standing sprite, with its pixels ---------- */
  let recByRoot = new Map(); for (const r of nw.entities.values()) recByRoot.set(r.root, r);
  const owner = o => { for (let p = o; p; p = p.parentContainer) { const r = recByRoot.get(p); if (r) return r; } return null; };
  const pix = new Map();
  const pixelsOf = (im, tall) => {
    const originU = Math.round(im.displayOriginX || 0);
    const fr = im.frame, src = fr && fr.source && fr.source.image; if (!src || !(src instanceof HTMLCanvasElement || src instanceof HTMLImageElement)) return null;
    // (a cropped image shows only that part of its picture: a bridge's parapet strip, one half of an arch)
    const crop = im.isCropped && im._crop ? { x: Math.round(im._crop.x), y: Math.round(im._crop.y), w: Math.round(im._crop.width), h: Math.round(im._crop.height) } : null;
    const key = im.texture.key + '#' + fr.name + (tall ? '#t' + originU : '') + (crop ? '#c' + [crop.x, crop.y, crop.w, crop.h].join(',') : ''); if (pix.has(key)) return pix.get(key);
    let out = null;
    try {
      const w = fr.cutWidth, h = fr.cutHeight; if (!w || !h || w * h > 4e6) { pix.set(key, null); return null; }
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h); const data = cx.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
      if (crop) for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) if (u < crop.x || v < crop.y || u >= crop.x + crop.w || v >= crop.y + crop.h) a[v * w + u] = 0;
      // The drawn base: what stands on the ground. Solid paint only (alpha >= 160, so a soft shadow does not count).
      let top = h, bottom = -1;
      for (let v = 0; v < h && top === h; v++) for (let u = 0; u < w; u++) if (a[v * w + u] >= 160) { top = v; break; }
      for (let v = h - 1; v >= 0 && bottom < 0; v--) { let n = 0; for (let u = 0; u < w; u++) if (a[v * w + u] >= 160 && ++n >= 2) { bottom = v; break; } }
      let vb = -1, vLow = -1, u0 = w, u1 = -1;
      if (bottom >= top) {
        // In the lowest tenth of the drawing, the runs of columns painted in most of its rows. A thing's base is the widest
        // run. A tree's is the run nearest its own foot (the column its painter stands it on): leaf litter, a root or a low
        // bough beside the trunk is often wider than the trunk (the old audit read autumn leaf litter as the base and
        // reported about 25 trunks as walked through). vLow is the lowest paint under the trunk (litter lies lower).
        const band = Math.max(4, Math.min(40, Math.round((bottom - top) * .1))), b0 = Math.max(top, bottom - band), rowsN = bottom - b0 + 1, col = new Uint16Array(w);
        for (let v = b0; v <= bottom; v++) for (let u = 0; u < w; u++) if (a[v * w + u] >= 160) col[u]++;
        let best = null;
        for (const thr of [.6, .35, .15]) {
          if (best) break; const runs = [];
          for (let u = 0, s = -1; u <= w; u++) { const on = u < w && col[u] >= rowsN * thr; if (on && s < 0) s = u; if (!on && s >= 0) { runs.push([s, u - 1]); s = -1; } }
          if (!runs.length) continue;
          if (tall) { const near = runs.filter(r => originU >= r[0] - 6 && originU <= r[1] + 6).sort((p, q) => (p[1] - p[0]) - (q[1] - q[0]))[0]; best = near || (thr === .15 ? runs.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - originU) - Math.abs((q[0] + q[1]) / 2 - originU))[0] : null); }
          else { const joined = []; for (const r of runs) { const last = joined[joined.length - 1]; if (last && r[0] - last[1] <= 12) last[1] = r[1]; else joined.push([r[0], r[1]]); } best = joined.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0]; }   // (canes of a screen, legs of a stack: one base, not its widest leg)
        }
        if (best) {
          u0 = best[0]; u1 = best[1];
          for (let v = bottom; v >= b0 && vb < 0; v--) for (let u = u0; u <= u1; u++) if (a[v * w + u] >= 160) { vb = v; break; }
          vLow = vb;
        }
      }
      out = { w, h, a, vb, vLow: Math.max(vb, vLow), u0, u1, top, bottom };
    } catch (e) { out = null; }
    pix.set(key, out); return out;
  };
  const KIND = (k, rec) => {
    const md = rec && rec.metadata || {};
    if (/^__garden|^gpwd-|^gpw-|gpw-mist|gpw-foam|\|u\||mainland-haze|shingle|\|t\|rail\||lightpool/.test(k)) return '';   // (a footbridge's near rail is its crossing's: check 9)
    if (/\|plant\.(planter|rph-flower-tub|tub|pot)/.test(k)) return 'decor';
    if (/\|plant\./.test(k)) return 'flora';   // bracken, ferns, reeds, shrubs: flora you brush through by design (kept for "is anything drawn here")
    if (/\|tree\.|^gptree\||^gpwo\||\|(pine|rowan)\|/.test(k)) return 'tree';
    if (/\|peak\||\|crag\||\|rock\.|boulder|cove-rock/.test(k)) return 'rock';
    if (/\|building\.|\|structure\./.test(k)) return 'building';
    if (/\|gate\||gatesign|\|falls\|/.test(k)) return 'gate';
    if (/ruin|wall|terrace/.test(k)) return 'wall';
    if (/fence|railing|hedge/.test(k)) return 'fence';
    if (/^gpm\|/.test(k)) return 'landmark';
    if (md.kind === 'plant' || md.kind === 'ground') return '';   // (a planted row, or understory: the planting's own rules)
    if (/^gpv-\d\|[^|]*\|[^|]*\|t\|(crates|pots|net|boat|crate|bench|anchor|fishbox|bollard|buoy|baskets|sacks|bell)/.test(k)) return 'harbour';
    if (md.kind === 'decor' || /\|dec\|/.test(k)) return 'decor';
    if (md.kind === 'prop' || md.kind === 'scenery' || /^gpp\||\|street\./.test(k)) return 'prop';
    if (/^gpv-|^gpt-/.test(k)) return 'prop';
    return 'other';
  };
  const collect = only => {
    const list = [];
    const visit = o => {
      if (!o) return; const kids = o.list || null;
      if ((o.type === 'Image' || o.type === 'Sprite') && o.texture) {
        const k = String(o.texture.key || ''), rec = owner(o), kind = KIND(k, rec);
        // (a standing part of a picture that is out of view is hidden with it, not gone; and a picture baked into a cached
        // tile hides its own images behind the tile, 94-garden-native-art.js: every sight and building once it has been
        // on screen a while. Skipping those made the count of things checked change from run to run.)
        if (kind && o.depth > -9000 && (o.visible !== false || o._gppStanding || o._nativeCacheHiddenBy) && (!only || only(rec, k))) {
          const P = pixelsOf(o, kind === 'tree');
          if (P && P.vb >= 0 && P.u1 >= P.u0) {
            // (copied: Phaser hands back one shared matrix for every object)
            const wm = o.getWorldTransformMatrix(), mx = { a: wm.a, b: wm.b, c: wm.c, d: wm.d, e: wm.e, f: wm.f }, ox = o.displayOriginX, oy = o.displayOriginY;
            mx.det = mx.a * mx.d - mx.b * mx.c;
            const wp = (u, v) => { const x = u - ox, y = v - oy; return { X: x * mx.a + y * mx.c + mx.e, Y: x * mx.b + y * mx.d + mx.f }; };
            const a = wp(P.u0, P.vb), b = wp(P.u1 + 1, P.vb + 1), t = wp(P.u0, P.top), low = wp(P.u0, P.vLow + 1), bb = o.getBounds();
            const X0 = Math.min(a.X, b.X), X1 = Math.max(a.X, b.X), Yb = Math.max(a.Y, b.Y), heightPx = Math.abs(Yb - t.Y);
            const md = rec && rec.metadata || {}, prop = md.prop || null;
            const name = prop ? prop.name || prop.id : md.id ? String(md.id) : k.split('|').filter(s => s && !/^[0-9a-f]{12,}$/.test(s) && !/^(autumn|summer|winter|spring|d|t|o|f|s|base|gdpaint|gpp|gpm|gpv-1|gpt-3|gptree)$/.test(s)).slice(0, 2).join(' ');
            list.push({ im: o, rec, key: k, kind, name, X0, X1, Yb, YbLow: Math.max(Yb, low.Y), heightPx, bounds: { x: bb.x, y: bb.y, w: bb.width, h: bb.height }, P, mx, ox, oy, prop });
          }
        }
      }
      if (kids) for (const c of kids) visit(c);
    };
    visit(scene.children); return list;
  };
  const all = collect(), objs = all.filter(o => o.kind !== 'flora'), flora = all.filter(o => o.kind === 'flora');
  // opaque paint at a world point, from any standing sprite (inverse transform into its texture)
  const BK = 96, bkey = (i, j) => i + ',' + j;
  const bucketsOf = list => { const B = new Map(); for (const o of list) { const b = o.bounds; for (let j = Math.floor(b.y / BK); j <= Math.floor((b.y + b.h) / BK); j++) for (let i = Math.floor(b.x / BK); i <= Math.floor((b.x + b.w) / BK); i++) { const k = bkey(i, j); (B.get(k) || B.set(k, []).get(k)).push(o); } } return B; };
  // vector drawings (props, sights, decorations drawn as shapes): their own hit test is their paint
  const vec = [];
  for (const r of nw.entities.values()) { const k = r.metadata && r.metadata.kind; if (!['prop', 'scenery', 'decor', 'land'].includes(k) || !r.handle || !r.bounds) continue; vec.push({ vector: true, rec: r, bounds: { x: r.bounds.x, y: r.bounds.y, w: r.bounds.width, h: r.bounds.height } }); }
  const buckets = bucketsOf(objs.concat(vec)), floraBuckets = bucketsOf(flora);
  const paintIn = (B, X, Y, except) => {
    for (const o of B.get(bkey(Math.floor(X / BK), Math.floor(Y / BK))) || []) {
      if (o === except) continue; const b = o.bounds; if (X < b.x || X > b.x + b.w || Y < b.y || Y > b.y + b.h) continue;
      if (o.vector) { if (!o.rec.handle.hitPoint || o.rec.handle.hitPoint(X, Y)) return o; continue; }   // (a drawing with no hit test of its own: its box)
      const M = o.mx, dx = X - M.e, dy = Y - M.f, lx = (M.d * dx - M.c * dy) / M.det, ly = (M.a * dy - M.b * dx) / M.det, u = Math.floor(lx + o.ox), v = Math.floor(ly + o.oy);
      if (u >= 0 && v >= 0 && u < o.P.w && v < o.P.h && o.P.a[v * o.P.w + u] >= 120) return o;
    }
    return null;
  };
  const paintAt = (X, Y, except) => paintIn(buckets, X, Y, except);

  /* ---------- the picture: the whole map as the game draws it, read back as "water-coloured or not" ---------- */
  const MS = 2, MW = Math.ceil(W.cols * CW / MS), MH = Math.ceil((W.sky + W.rows * CH) / MS), mask = new Uint8Array(MW * MH);   // 0 not seen, 1 water colour, 2 anything else
  const mosaic = { tiles: 0, seen: 0, ok: false, note: '' };
  if (!opts.noPicture) try {
    const prefs = _gdpPrefs(), keep = { cam: prefs.cam, zoom: prefs.zoom, x: _gw.px, y: _gw.py }, wasOn = gardenCollideOn();
    if (wasOn) gardenCollideToggle(false);
    prefs.cam = 'follow'; prefs.zoom = 6;
    const game = scene.game, snap = () => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no snapshot')), 8000); game.renderer.snapshot(img => { clearTimeout(t); res(img); }); });
    const cnv = document.createElement('canvas'), cctx = cnv.getContext('2d', { willReadFrequently: true });
    for (let ty = 9; ty < W.rows + 12; ty += 19) for (let tx = 11; tx < W.cols + 14; tx += 21) {
      const cx = Math.min(W.cols - 2, tx), cy = Math.min(W.rows - 2, ty), q = gardenWorldNearestFree(cx, cy, 8, .14) || { x: cx, y: cy };
      _gw.px = q.x; _gw.py = q.y; _gw.path = []; _gw.cam.init = false; _gw.cam.dirty = true;
      await sleep(opts.tileMs || 1500);
      const img = await snap(), cam = nw.camera(), box = _gw.box.getBoundingClientRect(), k = img.width / box.width;
      cnv.width = img.width; cnv.height = img.height; cctx.drawImage(img, 0, 0);
      const data = cctx.getImageData(0, 0, img.width, img.height).data;
      const i0 = Math.max(0, Math.ceil(cam.x / MS)), i1 = Math.min(MW - 1, Math.floor((cam.x + cam.w) / MS)), j0 = Math.max(0, Math.ceil(cam.y / MS)), j1 = Math.min(MH - 1, Math.floor((cam.y + cam.h) / MS));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const sx = Math.floor(((i * MS + MS / 2 - cam.x) * cam.scale + (cam.left || 0)) * k), sy = Math.floor(((j * MS + MS / 2 - cam.y) * cam.scale + (cam.top || 0)) * k);
        if (sx < 4 || sy < 4 || sx >= img.width - 4 || sy >= img.height - 4) continue;
        const o = (sy * img.width + sx) * 4, r = data[o], g = data[o + 1], b = data[o + 2];
        if (!mask[j * MW + i]) mosaic.seen++;
        mask[j * MW + i] = b >= r + 12 && b >= g - 25 ? 1 : 2;
      }
      mosaic.tiles++;
    }
    prefs.cam = keep.cam; prefs.zoom = keep.zoom; _gw.px = keep.x; _gw.py = keep.y; _gw.cam.init = false; _gw.cam.dirty = true;
    if (wasOn) gardenCollideToggle(true);
    mosaic.ok = mosaic.seen > MW * MH * .5; mosaic.share = +(mosaic.seen / (MW * MH)).toFixed(3);
  } catch (e) { mosaic.note = String(e && e.message || e); }
  /** Share of water-coloured pixels round a cell point (rx, ry in world px); -1 when the picture has no pixels there. */
  const pixWater = (x, y, rx, ry) => {
    const p = toPx(x, y), i0 = Math.floor((p.X - rx) / MS), i1 = Math.floor((p.X + rx) / MS), j0 = Math.floor((p.Y - ry) / MS), j1 = Math.floor((p.Y + ry) / MS); let wet = 0, n = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { if (i < 0 || j < 0 || i >= MW || j >= MH) continue; const v = mask[j * MW + i]; if (!v) continue; n++; if (v === 1) wet++; }
    return n >= 4 ? wet / n : -1;
  };
  /** Group flagged lattice points (key "i,j") into touching clusters: [{n, x, y}] in cells. */
  const clusters = (set, step) => {
    const out = [], seen = new Set();
    for (const k0 of set) {
      if (seen.has(k0)) continue; const stack = [k0]; seen.add(k0); let n = 0, sx = 0, sy = 0;
      while (stack.length) { const k = stack.pop(), [i, j] = k.split(',').map(Number); n++; sx += i; sy += j; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const q = (i + di) + ',' + (j + dj); if (set.has(q) && !seen.has(q)) { seen.add(q); stack.push(q); } } }
      out.push({ n, x: sx / n * step, y: sy / n * step, area: n * step * step });
    }
    return out;
  };

  /* ---------- 1. standing things against the block at their drawn base ---------- */
  const noBlock = new Set(['gate']);
  const softProp = p => p && gardenPropCol(p) === 'none';
  const solidsNear = (x0, y0, x1, y1) => D.rects.filter(r => r.x1 > x0 && r.x0 < x1 && r.y1 > y0 && r.y0 < y1);
  let checked = 0;
  const checkObject = (o, extra) => {
    const a = toCell(o.X0, o.Yb), b = toCell(o.X1, o.Yb), span = b.x - a.x, mid = (a.x + b.x) / 2, yb = a.y;
    if (yb < 0 || yb > W.rows || mid < 0 || mid > W.cols) return;
    const yTest = yb - 4 / CH, xs = span < .3 ? [mid] : [a.x + span * .2, mid, b.x - span * .2];
    // a wall or a rock that stands on a landform (a ruin wall's stones, a peak on its mountain) is the landform's: check 4
    { const formNear = (x0, y0, x1, y1) => D.rects.some(r => r.form && _gwFormHitsBox(r.form, x0, y0, x1, y1)), peak = /\|peak\||\|crag\|/.test(o.key);
      if (o.kind === 'wall' && formNear(a.x - .1, yb - .7, b.x + .1, yb + .15)) return;
      if (o.kind === 'rock' && (peak ? formNear(a.x - .1, yb - 1.6, b.x + .1, yb + .15) : formNear(mid - .05, yb - .3, mid + .05, yb))) return; }
    // by design, said in the walking code: the Great Oak's roots are walked over (only its bole blocks); a crutch under a bough is a pole you brush past
    if (/great-oak|crutch/.test(o.name + ' ' + o.key)) return;
    // nobody can get to it (it stands in the water, a skerry): nothing to line up
    { let touch = false; for (let x = a.x - .3; x <= b.x + .3 && !touch; x += .15) for (const dy of [-.5, -.25, 0, .25]) if (free(x, yb + dy)) { touch = true; break; } if (!touch) return; }
    const freeN = xs.filter(x => free(x, yTest)).length; let midFree = free(mid, yTest), skirt = 0;
    // a thin thing (a pole, a post): its small block may sit a few pixels above or below the last painted row
    if (midFree && span < .3) for (let y = yb - 10 / CH; y <= yb + 4 / CH && midFree; y += 2 / CH) if (!free(mid, y)) midFree = false;
    const base = Object.assign({ obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mid, y: yb, span: +span.toFixed(2) }, extra || {});
    // a tree's roots flare and its leaf litter lies lower than its trunk: its block may sit anywhere from the narrow foot down to the lowest root
    if (midFree && o.kind === 'tree') { for (let y = yb - 14 / CH; y <= yb + 5 / CH && midFree; y += 2 / CH) if (!free(mid, y)) midFree = false; if (!midFree) return; }
    // a painted sight stands in a skirt of grass, a mound or worn ground drawn a little below its foot line (a treehouse's
    // tussocks, a warren's spoil): its block may start up to half a cell above the lowest paint. Its width is still judged below.
    if (midFree && o.kind === 'landmark') { for (let y = yb - 16 / CH; y <= yb && midFree; y += 2 / CH) if (!free(mid, y)) { midFree = false; skirt = yb - y; } }
    // a thin thing held by stays or with a wide skirt (a maypole, a crutch under a bough): its block stands under the middle of the drawing
    if (midFree && span < .45 && o.bounds.w > 40) { const bc = toCell(o.bounds.x + o.bounds.w / 2, o.bounds.y + o.bounds.h), near = solidsNear(bc.x - .35, bc.y - 1.2, bc.x + .35, bc.y + .15).filter(r => !r.form); if (near.length) return; }
    if (midFree && (xs.length === 1 || freeN >= 2)) { push({ kind: extra ? 'decor-foot' : 'walk-through', ...base, detail: 'feet can stand on its drawn base (' + freeN + ' of ' + xs.length + ' test points free)' }); return; }
    // what blocks at its base: boxes and cells along the base line, a third of a cell deep
    // (only blocks that reach under this base: a neighbour's trunk beside it is the neighbour's)
    const band = { y0: yb - .35 - skirt, y1: yb + .05 };
    const rs = solidsNear(a.x - .05, band.y0, b.x + .05, band.y1).filter(r => !r.form);   // (a landform's box is its outline's bounds, not a block)
    let bx0 = Infinity, bx1 = -Infinity;
    for (const r of rs) { bx0 = Math.min(bx0, r.x0); bx1 = Math.max(bx1, r.x1); }
    const cellsUnder = []; for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) if (hardAt(x + .5, yb - .15) || skirt && hardAt(x + .5, yb - .15 - skirt)) cellsUnder.push(x);
    for (const x of cellsUnder) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x + 1); }
    if (!(bx1 > bx0)) {
      // nothing under the base, though the feet cannot stand there (water or the shore): fine; otherwise look a little round it
      const near = solidsNear(a.x - .6, band.y0 - .4, b.x + .6, band.y1 + .3).filter(r => !r.form); if (!near.length) return;
      let c0 = Infinity, c1 = -Infinity; for (const r of near) { c0 = Math.min(c0, r.x0); c1 = Math.max(c1, r.x1); }
      const bodyMid = toCell(o.bounds.x + o.bounds.w / 2, 0).x, bodyW = o.bounds.w / CW;
      if (Math.abs((c0 + c1) / 2 - bodyMid) <= Math.max(.2, bodyW * .2)) return;   // (a thing on legs: its block is under the middle of its body)
      if (Math.abs((c0 + c1) / 2 - mid) > .25 && !(c0 <= mid && c1 >= mid)) push({ kind: extra ? 'decor-foot' : 'block-offset', ...base, detail: 'its block stands ' + ((c0 + c1) / 2 - mid).toFixed(2) + ' cells beside the drawn base' });
      return;
    }
    const bw = bx1 - bx0, bc = (bx0 + bx1) / 2;
    // a block much wider than the base only counts when it is this thing's own (one box, or its own cells): neighbours' boxes side by side are theirs
    const own = rs.length <= 1 || cellsUnder.length;
    if (span > .6 && bw < span * .4) push({ kind: extra ? 'decor-foot' : 'block-size', ...base, detail: 'block ' + bw.toFixed(2) + ' cells wide under a base ' + span.toFixed(2) + ' wide (too small)' });
    else if (own && rs.length <= 1 && !cellsUnder.length && bw > .8 && bw > Math.max(span * 2, span + 1) && bw > o.bounds.w / CW * 1.15) push({ kind: extra ? 'decor-foot' : 'block-size', ...base, detail: 'block ' + bw.toFixed(2) + ' cells wide under a base ' + span.toFixed(2) + ' wide (too big)' });
    // (leaf litter or a root to one side of a sight widens its lowest paint, and a decoration drawn in parts has a narrow lowest run: a block under the middle of the body is in the right place)
    const bodyMid2 = toCell(o.bounds.x + o.bounds.w / 2, 0).x, underBody = (o.kind === 'landmark' || !!extra) && Math.abs(bc - bodyMid2) <= Math.max(.2, o.bounds.w / CW * .15);
    if (!underBody && Math.abs(bc - mid) > Math.max(.35, span * .4) && !(bx0 <= mid && bx1 >= mid)) push({ kind: extra ? 'decor-foot' : 'block-offset', ...base, detail: 'block centre ' + (bc - mid).toFixed(2) + ' cells from the base centre' });
  };
  for (const o of objs) {
    if (noBlock.has(o.kind) || softProp(o.prop) || o.heightPx < 14) continue;
    if (o.rec && o.rec.metadata && o.rec.metadata.kind === 'decor') { const d = gardenDecorById(m, o.rec.metadata.uid); if (d && (gardenDecorCol(d.def) === 'none' || d.def.layer === 'ground')) continue; }
    checked++; checkObject(o);
  }

  /* ---------- 1b. drawings made of shapes, not pictures: the world's own big trees ---------- */
  // (collect() reads pictures only. The big trees that stand where no painter plants a wood, twelve on the fells, are
  // drawn as shapes, so check 1 never saw them and reported none while every one could be walked through: the
  // verifier, 18 Nov 2026.) Their record names its foot; the trunk must stop the feet somewhere from a little above it
  // down to its roots, like any tree in check 1.
  const shapeTrees = { checked: 0 };
  { const pictured = new Set(all.map(o => o.rec).filter(Boolean));
    for (const r of nw.entities.values()) {
      const md = r.metadata || {}; if (!md.foot || !md.tree || pictured.has(r)) continue;
      const fx = md.foot.x / CW, fy = (md.foot.y - W.sky) / CH; if (fx < 0 || fy < 0 || fx >= W.cols || fy >= W.rows) continue;
      let touch = false; for (const [dx, dy] of [[0, .3], [-.4, 0], [.4, 0], [0, -.4]]) if (free(fx + dx, fy + dy)) { touch = true; break; } if (!touch) continue;
      shapeTrees.checked++;
      let open = true; for (let y = fy - 14 / CH; y <= fy + 5 / CH && open; y += 2 / CH) if (!free(fx, y)) open = false;
      if (open) push({ kind: 'walk-through', obj: 'tree', name: String(r.id), key: 'shape drawing', x: fx, y: fy, detail: 'a tree drawn as shapes (' + Math.round((r.bounds && r.bounds.height || 0) / CH * 10) / 10 + ' cells tall): the feet can stand on its trunk foot' });
    }
  }

  /* ---------- 1c. standing stonework column by column: gates, walls, piers; and the gaps and ends of a thing in parts ---------- */
  // Check 1 judges a thing by one base run, and passes every gate by. Stonework is judged here along its whole drawn foot,
  // a column every 3 px: the feet may not stand on it (a gate's piers and wall stubs, the stair's cheeks), and must
  // not stop well short of it on open ground in front (a ruin wall's block was its layout band, up to a cell in front of
  // the wall drawn on its middle line: the verifier, 18 Nov 2026). For a thing in parts (standing stones, boulders) and
  // a sight: no block between its drawn parts, and none running on past its drawn ends.
  const parts = { columns: 0, objects: 0 };
  { const wpOf = o => (u, v) => { const x = u - o.ox, y = v - o.oy; return { X: x * o.mx.a + y * o.mx.c + o.mx.e, Y: x * o.mx.b + y * o.mx.d + o.mx.f }; };
    const bare = (X, Y) => !paintAt(X, Y) && !paintIn(floraBuckets, X, Y);
    const cellFree = (X, Y) => { const c = toCell(X, Y); return c.x >= 0 && c.y >= 0 && c.x < W.cols && c.y < W.rows && free(c.x, c.y); };
    const wetPx = (X, Y) => { const c = toCell(X, Y); return gardenWaterContainsPoint(c.x, c.y); };
    const roadsAt = (island.routes || []).filter(r => r.points && r.points.length > 1).map(r => ({ pts: gardenIslandRoutePath(r).points, rad: gardenIslandRoadStyle(r).radius }));
    const onRoad = (x, y, k) => roadsAt.some(R => { for (let i = 1; i < R.pts.length; i++) { const p = R.pts[i - 1], q = R.pts[i], ax = (q.x - p.x) * CW, ay = (q.y - p.y) * CH, bx = (x - p.x) * CW, by = (y - p.y) * CH, L = ax * ax + ay * ay || 1, t = Math.max(0, Math.min(1, (ax * bx + ay * by) / L)); if (Math.hypot(bx - ax * t, by - ay * t) < R.rad * CW * k) return true; } return false; });
    const runsOf = (cols, from = 0) => { const out = []; let cur = null; for (const c of cols) { if (cur && c.u - cur.u1 <= 3 + from) { cur.u1 = c.u; cur.list.push(c); } else { cur = { u0: c.u, u1: c.u, list: [c] }; out.push(cur); } } return out; };
    for (const o of objs) {
      const stone = o.kind === 'gate' || o.kind === 'wall', inParts = o.kind === 'landmark' || o.kind === 'rock';
      if (!stone && !inParts) continue;
      if (/lightpool|\|block$|gatesign|\|falls\||\|peak\||\|crag\|/.test(o.key) || o.heightPx < 14) continue;   // (a peak or crag is its mountain's: check 4)
      const P = o.P, wp = wpOf(o), cols = [];
      // each column's lowest solid paint with at least 10 px of solid paint standing above it (a tuft or a pebble is not a wall)
      for (let u = 0; u < P.w; u += 3) {
        let v = P.h - 1; while (v >= 0 && P.a[v * P.w + u] < 160) v--; if (v < 0) continue;
        let up = v; while (up > 0 && P.a[(up - 1) * P.w + u] >= 160) up--; if (v - up < 10) continue;
        const p = wp(u + .5, v + 1); cols.push({ u, X: p.X, Y: p.Y });
      }
      if (!cols.length) continue;
      parts.objects++; parts.columns += cols.length;
      if (stone) {
        const through = [], short = [], gateBase = Math.max(...cols.map(c => c.Y));
        // (a gate's own way through: a bridge's deck and parapet ends are walked on and beside, and the stair's treads are
        // its steps; only its standing stonework, the piers, stubs, cheeks, posts and boulders, is held to its foot)
        const G = o.kind === 'gate' ? (island.gates || []).find(g => o.key.includes(g.id) || o.name === g.id) : null, gk = G && window.GardenPaintedProps && GardenPaintedProps.gateKind ? GardenPaintedProps.gateKind(G) : '';
        if (gk === 'bridge') continue;
        // (a wall: a stone or two of rubble proud of its foot is not the wall, so it takes four columns in a row)
        const fr = G && typeof _gldIslandGateFrame === 'function' ? (() => { try { return _gldIslandGateFrame(G); } catch (e) { return null; } })() : null, gHalf = fr ? Math.max(46, Math.min(80, fr.span * .62)) : 0;
        for (const c of cols) {
          if (o.kind === 'gate' && c.Y < gateBase - 16) continue;   // (a gate's picture holds its trees too: a crown's lower edge is not a foot)
          if (gk === 'stair' && fr && Math.abs(c.X - fr.x) < gHalf * 1.55 - 4) continue;   // (the treads between its cheeks)
          const cc = toCell(c.X, c.Y); if (o.kind === 'gate' && onRoad(cc.x, cc.y - .1, .95)) continue;   // (the gateway itself: the path runs through it)
          if (cellFree(c.X, c.Y - 3) && cellFree(c.X, c.Y - 8)) through.push(c);
          else { const F = c.Y + GW_FOOT.y * CH + .3 * CH, F2 = c.Y + GW_FOOT.y * CH + .8 * CH; if (!cellFree(c.X, F) && cellFree(c.X, F2) && bare(c.X, F) && bare(c.X, F - 6) && !wetPx(c.X, F)) { const why = gardenCollideAt(toCell(c.X, F).x, toCell(c.X, F).y).join('; '); if (why && !/water/.test(why)) short.push(Object.assign({ why }, c)); } }
        }
        for (const R of runsOf(through)) if (R.list.length >= (o.kind === 'wall' ? 4 : 3)) { const m = R.list[R.list.length >> 1], mc = toCell(m.X, m.Y); push({ kind: 'walk-through', obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mc.x, y: mc.y, detail: (R.list.length * 3) + ' px of its drawn foot can be stood on (stonework judged column by column)' }); }
        for (const R of runsOf(short)) if (R.list.length >= 4) { const m = R.list[R.list.length >> 1], mc = toCell(m.X, m.Y); push({ kind: 'block-offset', obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mc.x, y: mc.y, detail: 'over ' + (R.list.length * 3) + ' px of its length the feet stop more than ' + (.3 + GW_FOOT.y).toFixed(2) + ' cells in front of its drawn foot, on open ground (' + m.why.slice(0, 80) + ')' }); }
      } else {
        // in parts: the gaps between its drawn parts, and past its drawn ends, at its base line
        const base = Math.max(...cols.map(c => c.Y)), low = cols.filter(c => c.Y >= base - 10); if (!low.length) continue;
        const Rs = runsOf(low, 3), yb = base - 4;
        const anyBlockAt = X => !cellFree(X, yb) && bare(X, yb) && bare(X, yb - 10) && !wetPx(X, yb);
        for (let i = 1; i < Rs.length; i++) { const g0 = Rs[i - 1].list[Rs[i - 1].list.length - 1].X, g1 = Rs[i].list[0].X, gap = g1 - g0; if (gap < GW_FOOT.x * 2 * CW + 8) continue; const X = (g0 + g1) / 2; if (anyBlockAt(X) && cellFree(X, yb + GW_FOOT.y * CH + .6 * CH)) { const mc = toCell(X, yb); push({ kind: 'invisible-wall', obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mc.x, y: mc.y, detail: 'blocked in the ' + Math.round(gap) + ' px gap between two of its drawn parts, with nothing drawn there' }); } }
        const L = Math.min(...low.map(c => c.X)), Rt = Math.max(...low.map(c => c.X)), off = (GW_FOOT.x + .25) * CW, off2 = (GW_FOOT.x + .75) * CW;
        for (const [X, X2, side] of [[L - off, L - off2, 'west'], [Rt + off, Rt + off2, 'east']]) if (anyBlockAt(X) && cellFree(X2, yb)) { const mc = toCell(X, yb); push({ kind: 'invisible-wall', obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mc.x, y: mc.y, detail: 'its block runs on more than ' + (.25).toFixed(2) + ' cells past its drawn ' + side + ' end, with nothing drawn there' }); }
      }
    }
  }

  /* ---------- 2. invisible walls: boxes and cells that block where nothing is drawn ---------- */
  const painted = (x0, y0, x1, y1, above) => { for (const fy of [.15, .5, .85]) for (const fx of [.15, .5, .85]) { const p = toPx(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy); if (paintAt(p.X, p.Y)) return true; } if (above) for (const up of [10, 20, 30]) for (const fx of [.2, .5, .8]) { const p = toPx(x0 + (x1 - x0) * fx, y0); if (paintAt(p.X, p.Y - up)) return true; } return false; };   // (above: the body of a thing on legs, a bench's seat over the box between them)
  for (const r of D.rects) {
    if (r.form) continue;   // (a landform: its outline is checked against its drawing below)
    if (painted(r.x0 - .06, r.y0 - .1, r.x1 + .06, r.y1 + .04, true)) continue;
    if (mosaic.ok && !gardenIslandLandContains((r.x0 + r.x1) / 2, r.y1) && pixWater((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (r.x1 - r.x0) * CW / 2, (r.y1 - r.y0) * CH / 2) < .3) continue;   // (out past the coast and the picture is not water: a wall painted into the ground, like the quay's sea wall)
    push({ kind: 'invisible-wall', obj: /trunk/.test(r.src) ? 'tree' : /harbour/.test(r.src) ? 'harbour' : /lamp|pier|post/.test(r.src) ? 'prop' : /wall|rock/.test(r.src) ? 'wall' : 'prop', name: r.src, x: (r.x0 + r.x1) / 2, y: r.y1, w: +(r.x1 - r.x0).toFixed(2), h: +(r.y1 - r.y0).toFixed(2), detail: 'box ' + [r.x0, r.y0, r.x1, r.y1].map(v => v.toFixed(2)).join(', ') + ' with nothing drawn on it' });
  }
  const cellGroups = new Map();
  for (const c of D.cells) {
    if (!/^(static cell|building cell|decoration)/.test(c.src)) continue;
    if (painted(c.x, c.y, c.x + 1, c.y + 1)) continue;
    const id = c.src.replace(/ cell \d+,\d+/, ' cell'); (cellGroups.get(id) || cellGroups.set(id, []).get(id)).push(c);
  }
  for (const [id, list] of cellGroups) { const x = list.reduce((s, c) => s + c.x + .5, 0) / list.length, y = list.reduce((s, c) => s + c.y + .5, 0) / list.length; push({ kind: 'invisible-wall', obj: /^decoration/.test(id) ? 'decor' : 'building', name: id, x, y, detail: list.length + ' blocked cell(s) with nothing drawn: ' + list.slice(0, 6).map(c => c.x + ',' + c.y).join(' ') }); }

  /* ---------- 3. locked land: it blocks where it is drawn (a fence, wall or hedge ring; a thicket) and nowhere else ---------- */
  // The painters' rule (94-garden-paint-vale-1valley.js, 94-garden-paint-wood-0core.js): a locked plot in open country
  // is ringed by a fence, wall or hedge on every edge that meets ground you can walk on; in a painted wood it is a
  // thicket instead, one bush or small tree a cell. So: in a wood, each blocked cell must have a standing thing drawn
  // on most of it; elsewhere, each blocked edge next to open ground must be one the fence painter draws.
  const plots = new Map(), lockedId = (x, y) => { if (x < 0 || y < 0 || x >= W.cols || y >= W.rows || !grid.hard[y * W.cols + x]) return ''; const a = String(gardenAreaAt(x, y, lvl)); return a.startsWith('locked:') && !_gwLandformCell(x, y) && !/^zn-/.test(a.slice(7)) ? a.slice(7) : ''; };
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const id = lockedId(x, y); if (id) (plots.get(id) || plots.set(id, []).get(id)).push([x, y]); }
  const isThicketWood = (x, y) => { const r = gardenIslandRegionAt(x + .5, y + .5); return !!(r && window.GardenPaintWood && GardenPaintWood.thicketWood && GardenPaintWood.thicketWood(r.id)); };
  const anyPaint = (X, Y) => paintAt(X, Y) || paintIn(floraBuckets, X, Y);
  const footIn = new Set(); for (const o of all) { const c = toCell((o.X0 + o.X1) / 2, o.Yb); for (const dy of [-.35, 0]) footIn.add(Math.floor(c.x) + ',' + Math.floor(c.y + dy)); }   // (cells something stands on: a crown over a cell is not a thicket on it)
  let lockedEdges = 0;
  for (const [id, cells] of plots) {
    const bare = [], openEdges = [];
    for (const [x, y] of cells) {
      if (isThicketWood(x, y)) {
        let on = 0; for (const fy of [.2, .5, .8]) for (const fx of [.2, .5, .8]) { const p = toPx(x + fx, y + fy); if (anyPaint(p.X, p.Y)) on++; }
        if (on < 3 || !footIn.has(x + ',' + y)) bare.push([x, y, on]);
      } else for (const [dx, dy, side] of [[0, 1, 's'], [0, -1, 'n'], [1, 0, 'e'], [-1, 0, 'w']]) {
        const nx = x + dx, ny = y + dy; if (lockedId(nx, ny)) continue;
        if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows || grid.hard[ny * W.cols + nx]) continue;
        if (!free(nx + .5, ny + .5)) continue;   // (water or a box beside it: nobody walks into this edge)
        lockedEdges++;
        const nrow = typeof gardenLandCell === 'function' ? gardenLandCell(nx, ny) : null, base = gardenIslandBaseCell(nx, ny), row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null;
        const fenced = row && !(nrow && nrow.id === row.id) && base && base.land && !base.freshwater && !base.solid && !(nrow && nrow.solid);
        if (!fenced) openEdges.push(x + ',' + y + side);
      }
    }
    const cx = cells.reduce((s, c) => s + c[0] + .5, 0) / cells.length, cy = cells.reduce((s, c) => s + c[1] + .5, 0) / cells.length;
    if (bare.length) push({ kind: 'invisible-wall', obj: 'locked land', name: 'locked plot ' + id, x: bare.reduce((s, c) => s + c[0] + .5, 0) / bare.length, y: bare.reduce((s, c) => s + c[1] + .5, 0) / bare.length, detail: bare.length + ' of its ' + cells.length + ' blocked cells have next to nothing drawn on them (a thicket in a wood): ' + bare.slice(0, 5).map(c => c[0] + ',' + c[1]).join(' ') });
    if (openEdges.length) push({ kind: 'locked-edge', obj: 'locked land', name: 'locked plot ' + id, x: cx, y: cy, detail: openEdges.length + ' edge(s) stop the feet where no fence, wall or hedge is drawn: ' + openEdges.slice(0, 6).join(' ') });
  }

  /* ---------- 4. landforms: the polygon is what is drawn (the painters draw it; layout contract) vs where the feet are stopped ---------- */
  // (a ruin wall's layout outline is a band a cell and a half thick; where the painted garden draws it, the wall stands on
  // the band's middle line and that drawn foot is what stops the feet: gardenRuinWallFoot, 94-garden-world-0walk.js.
  // Judged against the band, the open ground either side of the drawn wall read as "drawn rock you can walk on".
  // Check 1c holds the wall's block to its picture.)
  const thinWalls = typeof gardenRuinWallFoot === 'function' && window.GardenPaintVale && GardenPaintVale.owns && GardenPaintVale.owns('ruin-wall');
  for (const f0 of island.landforms || []) {
    if (!f0.polygon || f0.col !== 'full') continue;
    const f = thinWalls && f0.kind === 'ruin-wall' ? Object.assign({}, f0, { polygon: gardenRuinWallFoot(f0.polygon) || f0.polygon }) : f0;
    const xs = f.polygon.map(p => p[0]), ys = f.polygon.map(p => p[1]); let walkIn = 0, ghost = 0, wx = 0, wy = 0, gx = 0, gy = 0; const st = .2, A = st * st;
    for (let y = Math.max(0, Math.min(...ys) - 1); y < Math.min(W.rows, Math.max(...ys) + 1); y += st) for (let x = Math.max(0, Math.min(...xs) - 1); x < Math.min(W.cols, Math.max(...xs) + 1); x += st) {
      const inside = inLoop(x, y, f.polygon), why = hardAt(x, y);
      if (inside && !why && free(x, y)) { walkIn += A; wx += x; wy += y; }
      else if (!inside && why && why.includes(f.id)) { ghost += A; gx += x; gy += y; }
    }
    const kindObj = f.kind === 'mountain' || f.kind === 'rock-wall' ? 'rock' : 'wall';
    if (walkIn >= .3) push({ kind: 'drawn-blocked-walkable', obj: kindObj, name: (f.kind + ' ' + f.id), x: wx / (walkIn / A), y: wy / (walkIn / A), detail: walkIn.toFixed(2) + ' square cells of the drawn ' + f.kind + ' are walkable' });
    if (ghost >= .3) push({ kind: 'invisible-wall', obj: kindObj, name: (f.kind + ' ' + f.id), x: gx / (ghost / A), y: gy / (ghost / A), detail: ghost.toFixed(2) + ' square cells blocked by its cells outside the drawn ' + f.kind });
  }

  /* ---------- 5. click areas against the art they belong to ---------- */
  for (const c of D.clicks) {
    if (!c.act) continue;
    const mine = objs.filter(o => o.rec && o.rec.metadata && o.rec.metadata.prop && o.rec.metadata.prop.id === c.id);
    let ax0 = Infinity, ax1 = -Infinity, ab = -Infinity;
    for (const o of mine) { const p0 = toCell(o.X0, o.Yb); ax0 = Math.min(ax0, toCell(o.bounds.x, 0).x); ax1 = Math.max(ax1, toCell(o.bounds.x + o.bounds.w, 0).x); ab = Math.max(ab, p0.y); }
    if (!mine.length) { if (c.art) { ax0 = c.art.x0; ax1 = c.art.x1; ab = c.art.y1; } else continue; }
    const ow = c.own.x1 - c.own.x0, ov = Math.max(0, Math.min(c.own.x1, ax1) - Math.max(c.own.x0, ax0)), cx = (c.own.x0 + c.own.x1) / 2;
    let on = 0, n = 0; for (const fy of [.2, .5, .8]) for (const fx of [.15, .5, .85]) { n++; const p = toPx(c.own.x0 + ow * fx, c.own.y0 + (c.own.y1 - c.own.y0) * fy); const cp = toCell(p.X, p.Y); if (paintAt(p.X, p.Y) || c.art && cp.x >= c.art.x0 && cp.x <= c.art.x1 && cp.y >= c.art.y0 && cp.y <= c.art.y1 + .15) on++; }
    const base = { obj: 'prop', name: c.name, x: cx, y: c.own.y1 };
    if (ov < ow * .5) push({ kind: 'click-area', ...base, detail: 'click area ' + ow.toFixed(1) + ' wide overlaps the art by ' + ov.toFixed(2) + ' cells' });
    else if (Math.abs(c.own.y1 - ab) > .8 && mine.length && on / n < .67) push({ kind: 'click-area', ...base, detail: 'click area ends ' + (c.own.y1 - ab).toFixed(2) + ' rows from the drawn base' });
    else if (on / n < .34) push({ kind: 'click-area', ...base, detail: 'only ' + on + ' of ' + n + ' points of the click area are over the art' });
  }

  /* ---------- 6. doors, gates and arrival points: reachable on foot from where you arrive, with room to stand ---------- */
  const keepAt = { px: _gw.px, py: _gw.py }, start = { x: W.start.x + .5, y: W.start.y + .5 };
  _gw.px = start.x; _gw.py = start.y; _gw.reach = null;
  const reach = _gwReach(), doorList = D.doors.slice();
  if (typeof GRM_ROOMS !== 'undefined' && typeof _grmDoorPt === 'function') for (const R of GRM_ROOMS) { let p = null; try { p = _grmDoorPt(R); } catch (e) { p = null; } if (p && Number.isFinite(p.x) && p.x < W.cols) doorList.push({ x: p.x, y: p.y, id: 'room:' + R.id, name: 'the way in to ' + (R.name || R.id), kind: 'room door' }); }
  let doorsChecked = 0;
  for (const d of doorList) {
    doorsChecked++;
    let ok = false, spot = null; for (let dy = -1.2; dy <= 1.2 && !ok; dy += .2) for (let dx = -1.2; dx <= 1.2 && !ok; dx += .2) { const x = d.x + dx, y = d.y + dy; if (Math.hypot(dx, dy) <= 1.25 && free(x, y) && reach[Math.floor(y) * W.cols + Math.floor(x)]) { ok = true; spot = { x, y }; } }
    const here = free(d.x, d.y);
    if (!ok) { push({ kind: 'door-unreachable', obj: d.kind === 'gate' ? 'gate' : 'prop', name: d.name, x: d.x, y: d.y, detail: d.kind + ' point with no reachable standing room within 1.2 cells' }); continue; }
    if (!here && d.kind !== 'gate') {
      const near = _gwNearestFreePt(d.x, d.y, 1.5), far = near ? Math.hypot((near.x - d.x) * CW, (near.y - d.y) * CH) : 999;
      if (far > 40) push({ kind: 'door-unreachable', obj: 'prop', name: d.name, x: d.x, y: d.y, detail: 'its ' + d.kind + ' point is blocked (' + (gardenCollideAt(d.x, d.y).slice(0, 2).join('; ') || 'the feet test') + ') and the nearest standing room is ' + Math.round(far) + ' px away' });
    }
    if (d.kind !== 'start') { let route = null; try { route = _gwRoute(start, spot); } catch (e) { route = null; } if (!route) push({ kind: 'door-unreachable', obj: d.kind === 'gate' ? 'gate' : 'prop', name: d.name, x: d.x, y: d.y, detail: 'click-to-walk finds no way from the arrival point to this ' + d.kind }); }
  }
  _gw.px = keepAt.px; _gw.py = keepAt.py; _gw.reach = null;

  /* ---------- 7. paths drawn but not walkable: along the middle, and across the drawn width ---------- */
  const crossGeo = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [];
  const nearCrossing = (x, y) => crossGeo.some(c => { const ax = c.a.x / CW, ay = (c.a.y - W.sky) / CH, bx = c.b.x / CW, by = (c.b.y - W.sky) / CH, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(-.15, Math.min(1.15, ((x - ax) * dx + (y - ay) * dy) / L)); return Math.hypot((ax + dx * t - x) * CW, (ay + dy * t - y) * CH) < 60; });
  const decksNow = typeof gardenPierDecks === 'function' ? gardenPierDecks() : [];
  const onDeck = (x, y) => decksNow.some(p => x >= p.x - .2 && x <= p.x + p.w + .2 && y >= p.y - .2 && y <= p.y + p.h + .2);
  let pathSamples = 0;
  for (const r of island.routes || []) {
    if (!r.points || r.points.length < 2) continue;
    const pts = gardenIslandRoutePath(r).points, style = gardenIslandRoadStyle(r), half = Math.max(0, style.radius - GW_FOOT.x - .08);
    for (const lane of ['middle', 'edge']) {
      let run = null;
      const flush = () => { if (run && run.n >= (lane === 'middle' ? 2 : 4)) push({ kind: 'path-blocked', obj: 'path', name: 'path ' + r.id + (lane === 'edge' ? ' (its width)' : ''), x: run.x, y: run.y, detail: (run.n * .4).toFixed(1) + ' cells of the path' + (lane === 'edge' ? '’s drawn width (' + (style.radius * 2).toFixed(1) + ' cells) cannot be walked: ' : ' blocked by ') + [...run.why].slice(0, 3).join('; ') }); run = null; };
      if (lane === 'edge' && half < .2) continue;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], len = Math.hypot(q.x - p.x, q.y - p.y), n = Math.max(1, Math.round(len / .4)), ux = (q.x - p.x) * CW, uy = (q.y - p.y) * CH, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul / CW, ny = ux / ul / CH;
        for (let k = 0; k < n; k++) {
          const x = p.x + (q.x - p.x) * k / n, y = p.y + (q.y - p.y) * k / n; pathSamples++;
          let blockedAt = null;
          // (where a path's line runs over the water beside its own bridge, nothing is painted and the bridge carries
          // the walk: check 9 walks every crossing end to end and into its paths by real click-to-walk)
          if (lane === 'middle') { if (!(free(x, y) || free(x + .3, y) || free(x - .3, y) || free(x, y + .3) || free(x, y - .3)) && !(gardenWaterContainsPoint(x, y) && nearCrossing(x, y))) blockedAt = { x, y }; }
          else if (!nearCrossing(x, y) && !onDeck(x, y) && free(x, y)) for (const s of [-1, 1]) { const ex = x + nx * half * CW * s, ey = y + ny * half * CW * s; if (!free(ex, ey) && !free(ex + nx * -s * 6, ey + ny * -s * 6)) { const q = toPx(ex, ey); if (paintAt(q.X, q.Y) || paintAt(q.X, q.Y - 10) || gardenPropAt(Math.floor(ex), Math.floor(ey))) continue; blockedAt = { x: ex, y: ey }; break; } }   // (a barrel, a lamp, a stall drawn on a square stands there by design: checks 1 and 2 hold it to its art)
          if (!blockedAt) { flush(); continue; }
          const why = gardenCollideAt(blockedAt.x, blockedAt.y); if (!why.length) why.push('the feet test (edge of water or a box)');
          if (!run) run = { x: blockedAt.x, y: blockedAt.y, n: 0, why: new Set() }; run.n++; for (const w of why) run.why.add(w);
        }
      }
      flush();
    }
  }

  /* ---------- 8. every shoreline: the sea, the Mere, rivers, brooks, ponds, the tarn ---------- */
  const waterAt = (x, y) => gardenWaterContainsPoint(x, y);
  const waterOnly = (x, y) => { const fx = GW_FOOT.x, fy = GW_FOOT.y; return _gwHardFeet(grid, x, y, fx, fy) && !_gwSolidHit(x, y, fx, fy) && gardenWonderWalkFine(x, y, fy) && !_gwGridFeet(grid, x, y, fx, fy); };
  const shore = { points: 0, wet: 0, notes: [] };
  // where the feet can stand, on a quarter-cell lattice over the whole map (the shoreline, the feel of walking and click-to-walk all read it)
  const ST = .25, NX = W.cols / ST, NY = W.rows / ST, lat = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) lat[j * NX + i] = free(i * ST + .001, j * ST + .001) ? 1 : 0;
  const latAt = (i, j) => i >= 0 && j >= 0 && i < NX && j < NY && lat[j * NX + i] === 1;
  if (mosaic.ok || opts.noPicture) {
    const onWater = new Set(), dryBlocked = new Set(), drawnDry = new Set();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x = i * ST + .001, y = j * ST + .001, fr = lat[j * NX + i] === 1; shore.points++;
      const wet = waterAt(x, y); if (wet) shore.wet++;
      if (fr) { if (mosaic.ok && pixWater(x, y, 6, 3) >= .85 && pixWater(x, y, 11, 5) >= .7) { const p = toPx(x, y); if (!anyPaint(p.X, p.Y) && !anyPaint(p.X, p.Y - 8)) onWater.add(i + ',' + j); } continue; }
      if (!wet && waterOnly(x, y)) {
        // the feet (with half as much room again) touch no water, yet only the water test stops them
        let touch = false; for (let k = 0; k < 8 && !touch; k++) { const a = k * Math.PI / 4; if (waterAt(x + Math.cos(a) * GW_FOOT.x * 1.5, y + Math.sin(a) * GW_FOOT.y * 1.5)) touch = true; }
        if (!touch && (!mosaic.ok || pixWater(x, y, 10, 4) <= .25)) dryBlocked.add(i + ',' + j);
      } else if (wet && mosaic.ok && waterOnly(x, y)) { const p = toPx(x, y); if (pixWater(x, y, 9, 5) === 0 && pixWater(x, y, 16, 9) <= .04 && !anyPaint(p.X, p.Y) && !anyPaint(p.X, p.Y + 6)) drawnDry.add(i + ',' + j); }
    }
    for (const c of clusters(onWater, ST)) if (c.n >= 4) push({ kind: 'water-walkable', obj: 'shore', name: waterAt(c.x, c.y) ? 'water you can walk on' : 'drawn water outside the water’s edge', x: c.x, y: c.y, detail: c.area.toFixed(2) + ' square cells where the feet can stand and the picture is water' });
    for (const c of clusters(dryBlocked, ST)) if (c.n >= 3) push({ kind: 'shore-blocked', obj: 'shore', name: 'dry ground beside water', x: c.x, y: c.y, detail: c.area.toFixed(2) + ' square cells of dry ground where only the water test stops the feet (no water within reach of them)' });
    // (not a fault on its own: a rock kerb along the gorge, wet sand at the tide line and reed beds are drawn inside the water's edge and are meant to stop the feet. Listed for the eye.)
    for (const c of clusters(drawnDry, ST)) if (c.n >= 12) shore.notes.push({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), area: +c.area.toFixed(2), region: regionOf(c.x, c.y) });
  }
  // A float lands at the middle of the cell you cast at (94-garden-fish-3game.js _gwFishCast). Every cell middle the cast
  // accepts must be drawn as water: where the water's edge is wider than its painting, the float sat on the drawn bank
  // (the gorge: the verifier cast onto its stone bank, 18 Nov 2026; check 8 had listed those spots only as notes).
  shore.casts = 0;
  if (mosaic.ok) {
    const dryFloat = new Set();
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const cx = x + .5, cy = y + .5; if (!gardenWaterContainsPoint(cx, cy)) continue;
      if (typeof _gwFishStoneCovered === 'function' && _gwFishStoneCovered(cx, cy)) continue;
      if (typeof gardenWaterNo === 'function' && gardenWaterNo(x, y, m)) continue;
      shore.casts++;
      // (all but no water-coloured pixel near the float, and next to none round it: the Mere's and the sea's reflections of the
      // bank and the sky's colours at the tide line are patchy and are not taken for ground)
      const pw = pixWater(cx, cy, 5, 3); if (pw < 0 || pw > .05 || pixWater(cx, cy, 10, 6) >= .2) continue;
      const p = toPx(cx, cy); if (anyPaint(p.X, p.Y)) continue;   // (a float among reeds or lily pads, or a crossing drawn over it: those are their own checks)
      dryFloat.add(x + ',' + y);
    }
    for (const c of clusters(dryFloat, 1)) push({ kind: 'cast-on-dry', obj: 'shore', name: 'a cast lands on drawn ground', x: c.x + .5, y: c.y + .5, detail: c.n + ' cell middle(s) the cast accepts as water are drawn as ' + (regionOf(c.x + .5, c.y + .5) === 'north-headland' ? 'rock or bank' : 'ground') + ': the float sits on them' });
  }

  /* ---------- 9. every bridge, footbridge, stepping stones and pier: the deck you walk is the deck that is drawn, and both ends join ---------- */
  const basins = (island.freshwater || []).filter(f => Array.isArray(f.boundary));
  const rawWater = (x, y) => !gardenIslandLandContains(x, y) || basins.some(f => inLoop(x, y, f.boundary)) || crossGeo.some(c => gardenIslandInPolygon(x, y, c.points));
  const crossingsChecked = [];
  // Over water round one deck. `support` is the deck's own outline in cells (a bridge's boards, the stones, a pier's cells):
  //   inside it, a foot's width in from its edge, every point must be walkable, and the picture must show a deck, not water
  //   outside it, over water, nothing may be walkable
  const deckCompare = (label, name, x0, y0, x1, y1, support) => {
    let wetWalk = 0, stop = 0, wetDeck = 0, inN = 0, walk = 0; const st = .1, A = st * st, wpt = [0, 0], spt = [0, 0], dpt = [0, 0];
    const inside = (x, y) => gardenIslandInPolygon(x, y, support), deep = (x, y) => inside(x, y) && inside(x - GW_FOOT.x - .06, y) && inside(x + GW_FOOT.x + .06, y) && inside(x, y - GW_FOOT.y - .05) && inside(x, y + GW_FOOT.y + .05);
    for (let y = y0; y <= y1; y += st) for (let x = x0; x <= x1; x += st) {
      const fr = free(x, y), raw = rawWater(x, y), ins = inside(x, y);
      if (fr && raw) walk += A;
      if (ins && raw) { inN++; if (mosaic.ok && pixWater(x, y, 3, 2) >= .75) { wetDeck += A; dpt[0] += x; dpt[1] += y; } }
      if (deep(x, y) && !fr) { stop += A; spt[0] += x; spt[1] += y; }
      if (!ins && raw && fr && waterAt(x, y)) { wetWalk += A; wpt[0] += x; wpt[1] += y; }
    }
    crossingsChecked.push({ id: name, walkOverWater: +walk.toFixed(2), deckOverWater: +(inN * A).toFixed(2), walkableWaterBeside: +wetWalk.toFixed(2), deckStopsFeet: +stop.toFixed(2), deckDrawnAsWater: +wetDeck.toFixed(2) });
    if (wetWalk >= .12) push({ kind: 'crossing-deck', obj: label, name, x: wpt[0] / (wetWalk / A), y: wpt[1] / (wetWalk / A), detail: wetWalk.toFixed(2) + ' square cells of water beside its deck can be walked on' });
    if (stop >= .12) push({ kind: 'crossing-deck', obj: label, name, x: spt[0] / (stop / A), y: spt[1] / (stop / A), detail: stop.toFixed(2) + ' square cells of its deck stop the feet: ' + (gardenCollideAt(spt[0] / (stop / A), spt[1] / (stop / A)).slice(0, 2).join('; ') || 'the feet test (edge of water or a box)') });
    if (wetDeck >= .3 && wetDeck > inN * A * .3) push({ kind: 'crossing-deck', obj: label, name, x: dpt[0] / (wetDeck / A), y: dpt[1] / (wetDeck / A), detail: wetDeck.toFixed(2) + ' of the ' + (inN * A).toFixed(2) + ' square cells you walk over the water are drawn as water, not as a deck' });
  };
  for (const c of crossGeo) {
    const a = { x: c.a.x / CW, y: (c.a.y - W.sky) / CH }, b = { x: c.b.x / CW, y: (c.b.y - W.sky) / CH }, name = c.kind + ' ' + c.crossing.id, label = c.kind === 'stepping-stones' ? 'stones' : 'bridge';
    // the middle line of the deck, bank to bank, and a step on at each end
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx * CW, dy * CH), ext = 10 / len; let gap = null, gapN = 0;   // (a step past each landing; whether the path beyond joins is the click-to-walk test below: paths bend at a bridge)
    for (let t = -ext; t <= 1 + ext + 1e-9; t += 3 / len) { const x = a.x + dx * t, y = a.y + dy * t; if (!free(x, y)) { gapN++; if (!gap) gap = { x, y, t }; } }
    if (gap) push({ kind: 'crossing-gap', obj: label, name, x: gap.x, y: gap.y, detail: (gapN * 3) + ' px of its middle line cannot be walked, first ' + (gap.t < 0 ? 'before its near end' : gap.t > 1 ? 'past its far end' : Math.round(gap.t * 100) + '% of the way over') + ': ' + (gardenCollideAt(gap.x, gap.y).slice(0, 2).join('; ') || 'the feet test (edge of water or a box)') });
    // both ends join their path: click-to-walk from the path a little before it to the path a little past it goes over the deck
    const route = (island.routes || []).find(r => r.id === c.crossing.along);
    if (route) {
      const pts = gardenIslandRoutePath(route).points, far = p => Math.min(Math.hypot((p.x - a.x) * CW, (p.y - a.y) * CH), Math.hypot((p.x - b.x) * CW, (p.y - b.y) * CH));
      const side = e => { let best = null; for (const p of pts) { const de = Math.hypot((p.x - e.x) * CW, (p.y - e.y) * CH), other = e === a ? b : a, doth = Math.hypot((p.x - other.x) * CW, (p.y - other.y) * CH); if (de < doth && de > 50 && de < 170 && free(p.x, p.y) && (!best || de < best.d)) best = { d: de, p }; } return best && best.p; };
      const pa = side(a), pb = side(b); void far;
      if (pa && pb) {
        let way = null; try { way = _gwRoute(pa, pb); } catch (e) { way = null; }
        const straight = Math.hypot((pb.x - pa.x) * CW, (pb.y - pa.y) * CH); let walked = 0; if (way) { let at = pa; for (const p of way) { walked += Math.hypot((p.x - at.x) * CW, (p.y - at.y) * CH); at = p; } }
        if (!way) push({ kind: 'crossing-gap', obj: label, name, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, detail: 'click-to-walk finds no way over it from its path on one bank to its path on the other' });
        else if (walked > straight * 1.6 + 60) push({ kind: 'crossing-gap', obj: label, name, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, detail: 'click-to-walk goes ' + Math.round(walked) + ' px round instead of ' + Math.round(straight) + ' px over it' });
      }
    }
    const xs = c.support.map(p => p.x), ys = c.support.map(p => p.y);
    deckCompare(label, name, Math.min(...xs) - .7, Math.min(...ys) - .7, Math.max(...xs) + .7, Math.max(...ys) + .7, c.support);
  }
  for (const p of decksNow) deckCompare('pier', 'pier ' + p.id, p.x - 1, p.y - .5, p.x + p.w + 1, p.y + p.h + 1, [{ x: p.x, y: p.y - 1 }, { x: p.x + p.w, y: p.y - 1 }, { x: p.x + p.w, y: p.y + p.h }, { x: p.x, y: p.y + p.h }]);
  // a pier's deck from the quay to its end, down the middle
  for (const p of decksNow) { let n = 0, first = null; for (let y = p.y - .6; y <= p.y + p.h - .35; y += .1) if (!free(p.x + p.w / 2, y)) { n++; first = first || y; } if (n) push({ kind: 'crossing-gap', obj: 'pier', name: 'pier ' + p.id, x: p.x + p.w / 2, y: first, detail: (n * .1).toFixed(1) + ' cells of its middle line cannot be walked' }); }


  /* ---------- 11. how walking feels: a diagonal press into any edge slides along it, and never shakes ---------- */
  // From every standing point beside something that stops the feet, press each diagonal toward it for a third of a
  // second, with the game's own step (_gwMoveBy at walking pace, 60 frames a second). A stall: the feet stop dead (or
  // crawl) where giving a few pixels the other way would let them go on (the corner of a box, a slanted wall, a kink
  // in a bank), not in a true inside corner. A jitter: the feet reverse direction three times or more.
  const stage = async name => { window.__auditStage = name + ' @' + Math.round(performance.now()); await sleep(0); };
  await stage('feel');
  const feel = { starts: 0, runs: 0, stalls: 0, jitters: 0, ms: 0, of: 0 };
  if (!opts.noFeel) {
    const t0 = performance.now(), keepPos = { x: _gw.px, y: _gw.py }, stepPx = GW_SPEED.walk / 60, dd = stepPx / Math.hypot(CW, CH);
    const stalls = new Map(), jitters = new Map(), edgePts = [];
    for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) {
      if (!lat[j * NX + i]) continue;
      let edge = false; for (let dj = -1; dj <= 1 && !edge; dj++) for (let di = -1; di <= 1; di++) if (!lat[(j + dj) * NX + i + di]) { edge = true; break; }
      if (edge) edgePts.push(j * NX + i);
    }
    // (every standing point beside an edge, thinned evenly to opts.feelMax of them: the same points every run)
    feel.of = edgePts.length; const stride = Math.max(1, Math.ceil(edgePts.length / (opts.feelMax || 9000)));
    for (let e = 0; e < edgePts.length; e += stride) {
      const i = edgePts[e] % NX, j = (edgePts[e] - i) / NX; feel.starts++;
      if (feel.starts % 500 === 0) await stage('feel ' + e + '/' + edgePts.length);
      const x = i * ST + .001, y = j * ST + .001;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (latAt(i + sx, j + sy) && latAt(i + sx, j) && latAt(i, j + sy)) continue;   // (nothing that way)
        feel.runs++; _gw.px = x; _gw.py = y; if (_gw.shoreMove) _gw.shoreMove = {};
        let lastX = 0, lastY = 0, flips = 0, slow = 0, stall = null;
        for (let f = 0; f < 16; f++) {
          const bx = _gw.px, by = _gw.py; _gwMoveBy(sx * dd, sy * dd);
          const mx = (_gw.px - bx) * CW, my = (_gw.py - by) * CH;
          // (a reversal you could see: three quarters of a pixel or more in a frame. Less is the last settling into a corner)
          if (Math.abs(mx) > .75) { if (lastX && Math.sign(mx) !== lastX) flips++; lastX = Math.sign(mx); }
          if (Math.abs(my) > .75) { if (lastY && Math.sign(my) !== lastY) flips++; lastY = Math.sign(my); }
          if (Math.hypot(mx, my) >= stepPx * .15) { slow = 0; continue; }
          if (++slow < 2) continue;
          // stopped: could they go on along the edge that caught them? One step across for a small give against the
          // up-and-down part of the press (an edge up to about 50 degrees from level), or one step up or down for a
          // small give against the across part (an edge within about 20 degrees of upright), and the next step too.
          // (An edge met nearly square, and a true inside corner, are honest stops.)
          const x0 = _gw.px, y0 = _gw.py, vx = sx * dd * CW, vy = sy * dd * CH; let round = '';
          for (let g = .5; g <= 3.5 && !round; g += .5) if (free(x0 + vx / CW, y0 - sy * g / CH) && free(x0 + 2 * vx / CW, y0 - sy * 2 * g / CH) && free(x0 + 3 * vx / CW, y0 - sy * 3 * g / CH)) round = 'across, giving ' + g + ' px ' + (sy > 0 ? 'up' : 'down') + ' a step';
          for (let g = .25; g <= .75 && !round; g += .25) if (free(x0 - sx * g / CW, y0 + vy / CH) && free(x0 - sx * 2 * g / CW, y0 + 2 * vy / CH) && free(x0 - sx * 3 * g / CW, y0 + 3 * vy / CH)) round = (sy > 0 ? 'down' : 'up') + ', giving ' + g + ' px ' + (sx > 0 ? 'left' : 'right') + ' a step';
          if (round) stall = { x: x0, y: y0, round, dir: (sy > 0 ? 'down' : 'up') + '-' + (sx > 0 ? 'right' : 'left'), from: [x, y, sx, sy] };
          break;
        }
        if (stall) { feel.stalls++; const k = Math.round(stall.x) + ',' + Math.round(stall.y), g = stalls.get(k) || stalls.set(k, { n: 0, first: stall }).get(k); g.n++; }
        else if (flips >= 3) { feel.jitters++; const k = Math.round(x) + ',' + Math.round(y), g = jitters.get(k) || jitters.set(k, { n: 0, x, y, dir: (sy > 0 ? 'down' : 'up') + '-' + (sx > 0 ? 'right' : 'left'), from: [x, y, sx, sy] }).get(k); g.n++; }
      }
    }
    _gw.px = keepPos.x; _gw.py = keepPos.y; if (_gw.shoreMove) _gw.shoreMove = {};
    const whyAt = (x, y, sx, sy) => { for (const [ax, ay] of [[sx, sy], [sx, 0], [0, sy]]) { const w = gardenCollideAt(x + ax * .3, y + ay * .2); if (w.length) return w.slice(0, 2).join('; '); } return 'the edge of water or a box'; };
    for (const g of stalls.values()) { const s = g.first, sx = /right/.test(s.dir) ? 1 : -1, sy = /down/.test(s.dir) ? 1 : -1; push({ kind: 'slide-stall', obj: 'walking', from: s.from, name: 'pressing ' + s.dir + ' into ' + whyAt(s.x, s.y, sx, sy), x: s.x, y: s.y, detail: g.n + ' press(es) near here stop dead; the feet could go on ' + s.round }); }
    for (const g of jitters.values()) push({ kind: 'slide-jitter', obj: 'walking', from: g.from, name: 'pressing ' + g.dir + ' beside ' + whyAt(g.x, g.y, /right/.test(g.dir) ? 1 : -1, /down/.test(g.dir) ? 1 : -1), x: g.x, y: g.y, detail: g.n + ' press(es) near here change direction three times or more in a third of a second' });
    feel.ms = Math.round(performance.now() - t0);
  }

  /* ---------- 12. click-to-walk: it finds the way the feet have, without a long detour, and gets there without standing still ---------- */
  await stage('routes');
  const walkTo = { hubs: 0, routes: 0, followed: 0, none: 0, detours: 0, stalls: 0, ms: 0, routeMs: 0, followMs: 0, worst: [] };
  if (!opts.noRoutes) {
    const t0 = performance.now(), keepPos = { x: _gw.px, y: _gw.py };
    // the shortest way the feet have, over the lattice (eight ways, in pixels), from one point to everywhere
    const field = from => {
      const dist = new Float64Array(NX * NY).fill(Infinity), heap = [], si = Math.round(from.x / ST), sj = Math.round(from.y / ST);
      const pushH = (d, n) => { heap.push([d, n]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const popH = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m2 = c; if (l < heap.length && heap[l][0] < heap[m2][0]) m2 = l; if (r < heap.length && heap[r][0] < heap[m2][0]) m2 = r; if (m2 === c) break; [heap[m2], heap[c]] = [heap[c], heap[m2]]; c = m2; } } return top; };
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) if (latAt(si + di, sj + dj)) { const n = (sj + dj) * NX + si + di, d = Math.hypot(di * ST * CW, dj * ST * CH); if (d < dist[n]) { dist[n] = d; pushH(d, n); } }
      const sxp = ST * CW, syp = ST * CH, diag = Math.hypot(sxp, syp);
      while (heap.length) { const [d, n] = popH(); if (d > dist[n]) continue; const i = n % NX, j = (n - i) / NX;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; if (!latAt(i + di, j + dj)) continue; if (di && dj && (!latAt(i + di, j) || !latAt(i, j + dj))) continue; const nn = (j + dj) * NX + i + di, nd = d + (di && dj ? diag : di ? sxp : syp); if (nd < dist[nn]) { dist[nn] = nd; pushH(nd, nn); } } }
      return dist;
    };
    const fieldAt = (dist, p) => { let best = Infinity; const i0 = Math.round(p.x / ST), j0 = Math.round(p.y / ST); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (latAt(i0 + di, j0 + dj)) best = Math.min(best, dist[(j0 + dj) * NX + i0 + di] + Math.abs((i0 + di) * ST - p.x) * CW + Math.abs((j0 + dj) * ST - p.y) * CH); return best; };
    const lenOf = (from, way) => { let L = 0, at = from; for (const p of way) { L += Math.hypot((p.x - at.x) * CW, (p.y - at.y) * CH); at = p; } return L; };
    // follow a planned way frame by frame, as the game does (94-garden-native-world.js move)
    const follow = (from, goal, way) => {
      let path = way.slice(), spd = 0, blockT = 0, repaths = 0, frames = 0, stood = 0; const dt = 1 / 60, cap = Math.ceil(lenOf(from, way) / (GW_SPEED.walk * dt) * 2.5) + 400;
      _gw.px = from.x; _gw.py = from.y; if (_gw.shoreMove) _gw.shoreMove = {};
      while (path.length && frames++ < cap) {
        while (path.length > 1 && _gwLos({ x: _gw.px, y: _gw.py }, path[1], GW_CLEAR)) path.shift();
        const target = path[0], dx = (target.x - _gw.px) * CW, dy = (target.y - _gw.py) * CH, distance = Math.hypot(dx, dy), ux = dx / (distance || 1), uy = dy / (distance || 1);
        let remaining = distance; for (let k = 1; k < path.length; k++) remaining += Math.hypot((path[k].x - path[k - 1].x) * CW, (path[k].y - path[k - 1].y) * CH);
        const want = Math.min(remaining > 170 ? GW_SPEED.run : GW_SPEED.walk, Math.sqrt(2 * GW_ACC * remaining) + 34);
        spd += Math.max(-GW_ACC * dt * 1.4, Math.min(GW_ACC * dt, want - spd));
        if (spd <= 3) continue;
        const step = spd * dt;
        if (distance <= step) { _gw.px = target.x; _gw.py = target.y; path.shift(); continue; }
        if (_gwMoveBy(ux * step / CW, uy * step / CH)) { blockT = 0; continue; }
        stood++; blockT += dt;
        if (blockT > .25) { blockT = 0; if (++repaths > 4) break; const tgt = free(goal.x, goal.y) ? goal : _gwNearestFreePt(goal.x, goal.y, 3), np = tgt ? _gwRoute({ x: _gw.px, y: _gw.py }, tgt) : null; if (!np) break; path = np; }
      }
      return { ok: !path.length, frames, repaths, stood, x: _gw.px, y: _gw.py };
    };
    const hubs = [{ name: 'the arrival point', x: W.start.x + .5, y: W.start.y + .5 }];
    for (const d of D.doors) if (d.kind === 'gate' && hubs.length < (opts.hubs || 3)) { const p = _gwNearestFreePt(d.x, d.y, 2); if (p) hubs.push({ name: d.name, x: p.x, y: p.y }); }
    const targets = [];
    for (const d of doorList) { if (d.kind === 'start') continue; let spot = null; for (let r = 0; r <= 1.2 && !spot; r += .2) for (let a = 0; a < 8 && !spot; a++) { const x = d.x + Math.cos(a * Math.PI / 4) * r, y = d.y + Math.sin(a * Math.PI / 4) * r; if (free(x, y)) spot = { x, y }; } if (spot) targets.push({ d, spot }); }
    walkTo.hubs = hubs.length;
    for (const [hi, h] of hubs.entries()) {
      const dist = field(h);
      for (const t of targets) {
        const ref = fieldAt(dist, t.spot); if (!Number.isFinite(ref) || ref < 60) continue;
        walkTo.routes++; if (walkTo.routes % 20 === 0) await stage('routes ' + walkTo.routes);
        const tr = performance.now();
        let way = null; try { way = _gwRoute({ x: h.x, y: h.y }, t.spot); } catch (e) { way = null; }
        walkTo.routeMs += performance.now() - tr;
        const base = { obj: 'walking', x: t.d.x, y: t.d.y, region: regionOf(t.d.x, t.d.y) };
        if (!way) { walkTo.none++; push({ kind: 'route-none', ...base, name: 'from ' + h.name + ' to ' + t.d.name, detail: 'click-to-walk finds no way, though the feet have one ' + Math.round(ref) + ' px long' }); continue; }
        const L = lenOf(h, way);
        if (L > ref * 1.3 + 90) { walkTo.detours++; push({ kind: 'route-detour', ...base, name: 'from ' + h.name + ' to ' + t.d.name, detail: 'click-to-walk goes ' + Math.round(L) + ' px; the feet have a way of ' + Math.round(ref) + ' px' }); }
        walkTo.worst.push(+(L / ref).toFixed(2));
        if (hi > 0) continue;   // (followed frame by frame from the arrival point)
        walkTo.followed++;
        // the last 700 px of the way up to the door, planned afresh from there (the game checks its sight line every
        // frame, which makes a whole cross-map walk slow to replay); every twelfth door is walked the whole way
        let from = { x: h.x, y: h.y }, wayF = way;
        if (L > 760 && walkTo.followed % 12) { let left = L - 700, at = from; for (const p of way) { const seg = Math.hypot((p.x - at.x) * CW, (p.y - at.y) * CH); if (seg >= left) { const k = left / (seg || 1); from = { x: at.x + (p.x - at.x) * k, y: at.y + (p.y - at.y) * k }; break; } left -= seg; at = p; } const w2 = free(from.x, from.y) ? _gwRoute(from, t.spot) : null; if (w2) wayF = w2; else from = { x: h.x, y: h.y }; }
        const tf = performance.now(), r = follow(from, t.spot, wayF), miss = Math.hypot((r.x - t.spot.x) * CW, (r.y - t.spot.y) * CH);
        walkTo.followMs += performance.now() - tf;
        if (!r.ok || miss > 8) { walkTo.stalls++; push({ kind: 'route-stall', obj: 'walking', x: r.x, y: r.y, name: 'walking from ' + h.name + ' to ' + t.d.name, detail: 'the walk never arrives: it ends ' + Math.round(miss) + ' px short after ' + r.frames + ' frames and ' + r.repaths + ' new plans' }); }
        else if (r.repaths) { walkTo.stalls++; push({ kind: 'route-stall', obj: 'walking', x: t.d.x, y: t.d.y, name: 'walking from ' + h.name + ' to ' + t.d.name, detail: 'the walk stands still ' + r.repaths + ' time(s) for a quarter of a second and plans again (' + r.stood + ' still frames)' }); }
      }
      await sleep(0);
    }
    walkTo.routeMs = Math.round(walkTo.routeMs); walkTo.followMs = Math.round(walkTo.followMs);
    walkTo.worst.sort((p, q) => q - p); walkTo.worst = walkTo.worst.slice(0, 5);
    _gw.px = keepPos.x; _gw.py = keepPos.y; if (_gw.shoreMove) _gw.shoreMove = {};
    walkTo.ms = Math.round(performance.now() - t0);
  }

  /* ---------- 13. each region closed in turn (its own gate shut, the rest open): it stops the feet all along its edge, and its gate can be walked up to ---------- */
  // (All five shut at once says little: three of the gates stand inside regions that are themselves closed then.)
  // A drawn path that runs on into a closed region's mist away from its gate is listed as a note, not a fault: the
  // layout's paths cross region lines by design and the mist is drawn over them.
  await stage('closed');
  const closed = { zones: 0, edgeCells: 0, gates: 0, leaks: 0, pathNotes: [] };
  if (!opts.noClosed) try {
    const zones = [..._GD_LAND].filter(z => /^zn-/.test(z)), keepPos = { x: _gw.px, y: _gw.py };
    const gateZone = g => { const k = typeof WK_GATES !== 'undefined' && WK_GATES[g.id]; return k && k.zone ? 'zn-' + k.zone : ''; };
    try {
      for (const z of zones) {
        _GD_LAND.delete(z);
        try {
          _gw.grid = null; _gw.gq = null; _gw.reach = null;
          const g2 = _gwGrid(gardenHere(), true), zoneOf = (x, y) => { const a = String(gardenAreaAt(x, y, lvl)); return /^locked:zn-/.test(a) ? a.slice(7) : ''; };
          _gw.px = start.x; _gw.py = start.y; const reach2 = _gwReach(); closed.zones++;
          // nobody gets in: no cell of the closed region can be reached, and none lets the feet stand
          const leak = new Set(); let cellsIn = 0;
          for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
            if (zoneOf(x, y) !== z) continue; cellsIn++;
            if (reach2[y * W.cols + x] || !g2.hard[y * W.cols + x] || free(x + .5, y + .5)) leak.add(x + ',' + y);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W.cols && ny < W.rows && !zoneOf(nx, ny) && reach2[ny * W.cols + nx]) { closed.edgeCells++; break; } }
          }
          if (!cellsIn) push({ kind: 'closed-edge', obj: 'closed region', name: z + ' has no cells when shut', x: start.x, y: start.y, detail: 'shutting this region closes nothing' });
          for (const c of clusters(leak, 1)) { closed.leaks++; push({ kind: 'closed-edge', obj: 'closed region', name: 'a way into ' + regionOf(c.x + .5, c.y + .5) + ' with its gate shut', x: c.x + .5, y: c.y + .5, detail: c.n + ' cell(s) of the closed region can be stood on or reached' }); }
          // its shut gate can be walked up to
          const mine = (island.gates || []).filter(g => gateZone(g) === z);
          for (const g of mine) { closed.gates++; const gx = g.x + .5, gy = g.y + .5; let ok = false; for (let dy = -1.8; dy <= 1.8 && !ok; dy += .2) for (let dx = -1.8; dx <= 1.8 && !ok; dx += .2) { const x = gx + dx, y = gy + dy; if (x >= 0 && y >= 0 && x < W.cols && y < W.rows && free(x, y) && reach2[Math.floor(y) * W.cols + Math.floor(x)]) ok = true; } if (!ok) push({ kind: 'closed-edge', obj: 'gate', name: g.id + ' (shut)', x: gx, y: gy, detail: 'the shut gate cannot be walked up to from the arrival point with every other gate open' }); }
          // (note) a drawn path that meets the closed region away from its gate
          for (const r of island.routes || []) { if (!r.points || r.points.length < 2) continue; const pts = gardenIslandRoutePath(r).points; let was = null, said = false;
            for (let k = 1; k < pts.length && !said; k++) { const p = pts[k - 1], q = pts[k], n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / .3));
              for (let t = 0; t < n && !said; t++) { const x = p.x + (q.x - p.x) * t / n, y = p.y + (q.y - p.y) * t / n, inZ = x >= 0 && y >= 0 && x < W.cols && y < W.rows && zoneOf(Math.floor(x), Math.floor(y)) === z; const now = inZ ? 'in' : (free(x, y) && reach2[Math.floor(y) * W.cols + Math.floor(x)] ? 'out' : was);
                if (was && now && was !== now && !mine.some(g => Math.hypot(g.x + .5 - x, g.y + .5 - y) < 3.2)) { said = true; closed.pathNotes.push({ zone: z, path: r.id, x: +x.toFixed(2), y: +y.toFixed(2) }); } was = now; } } }
        } finally { _GD_LAND.add(z); }
      }
    } finally {
      for (const z of zones) _GD_LAND.add(z);
      _gw.grid = null; _gw.gq = null; _gw.reach = null; grid = _gwGrid(gardenHere(), true); D = gardenCollideData(gardenHere()); _gw.px = keepPos.x; _gw.py = keepPos.y;
    }
  } catch (e) { closed.error = String(e && e.stack || e).slice(0, 300); }

  /* ---------- 14. drawing order: you are drawn in front of what you stand in front of, and behind what you stand behind ---------- */
  // Every standing sprite sorts against the player's feet line by one number: its depth (or its handle's), or its
  // layer's when it sits in a layer that is always over or under the walkers. Where the feet are stopped at its drawn
  // base (its block, read with the same feet test the game uses), that number must fall inside the stopped band:
  //   below the band: someone standing just in front of the block is drawn behind the thing;
  //   above the band: someone standing just behind the block is drawn in front of it.
  // Things with no block at their base (walked over or brushed past) have no wrong side and are not judged.
  await stage('order');
  const order = { checked: 0, judged: 0, faults: 0, alwaysOver: 0, alwaysUnder: 0 };
  if (!opts.noOrder) try {
    const playerObj = nw.playerNode && nw.playerNode.target, pChain = []; for (let p = playerObj; p; p = p.parentContainer) pChain.push(p);
    const pSet = new Set(pChain), seenAt = new Set(), TOL = 5;
    const standPx = (X, Y) => { const c = toCell(X, Y); return c.x >= 0 && c.y >= 0 && c.x < W.cols && c.y < W.rows && free(c.x, c.y); };
    for (const o of objs) {
      if (!playerObj || /lightpool|\|block$|gatesign/.test(o.key)) continue;
      let child = o.im, anc = o.im.parentContainer; while (anc && !pSet.has(anc)) { child = anc; anc = anc.parentContainer; }
      if (!anc) continue;
      const pChild = pChain[pChain.indexOf(anc) - 1]; if (!pChild) continue;
      if (pChild !== playerObj && Math.abs(child.depth) >= 70000) continue;   // (light, weather, signs over everything: not paint that stands in the world)
      const T = pChild === playerObj ? child.depth : child.depth > pChild.depth ? Infinity : -Infinity, X = (o.X0 + o.X1) / 2, Yb = o.Yb;
      order.checked++; if (T === Infinity) order.alwaysOver++; if (T === -Infinity) order.alwaysUnder++;
      // the stopped band of feet rows at the base's middle column: the run of blocked rows nearest the drawn base
      let top = null, bottom = null;
      for (let d = 0; d <= 12 && top == null; d++) for (const Y of d ? [Yb - d, Yb + d] : [Yb]) if (!standPx(X, Y)) { top = bottom = Y; break; }
      if (top == null) continue;
      while (top > Yb - 90 && !standPx(X, top - 1)) top--; while (bottom < Yb + 60 && !standPx(X, bottom + 1)) bottom++;
      if (top <= Yb - 90 || bottom >= Yb + 60) continue;   // (water, a building's whole footprint, the map's edge: no near side or far side to stand on here)
      order.judged++;
      let what = '';
      if (T > bottom + TOL && standPx(X, bottom + 2)) what = 'someone standing just in front of it is drawn behind it (it sorts ' + (T === Infinity ? 'over everyone' : Math.round(T - bottom) + ' px below the front of its block') + ')';
      else if (T < top - TOL && standPx(X, top - 2) && paintAt(X, top - 8) === o) what = 'someone standing just behind it is drawn in front of it (it sorts ' + (T === -Infinity ? 'under everyone' : Math.round(top - T) + ' px above the back of its block') + ')';
      if (!what) continue;
      const c = toCell(X, Yb), k = o.name + '|' + Math.round(c.x * 2) + ',' + Math.round(c.y * 2); if (seenAt.has(k)) continue; seenAt.add(k);
      order.faults++; push({ kind: 'draw-order', obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: c.x, y: c.y, detail: what });
    }
  } catch (e) { order.error = String(e && e.stack || e).slice(0, 300); }

  /* ---------- 15. overlaps: no two drawn things lie on top of each other unless they are meant to ---------- */
  // Meant to: a bridge over water, a crown over a path, a path running into its own square, things set out on a square
  // or the quay, a gate across its path. Everything else is reported as a pair:
  //   a field over a path            a plot's cells under a path's drawn width (its fence and sign stand on the path)
  //   a path under a building        a building or sight's footprint on a path's drawn width
  //   a path over water              a path's middle line over water where no bridge, stones or pier carries it
  //   a field over water             a plot's cell that is water (its fence, hedge or wall is drawn across the water)
  //   a path through a square        a path that is not the square's own running on across its paving
  //   a thing on a path              a tree, rock, prop or sight whose drawn base stands well inside a path's width
  //   a thing inside another         two standing things whose drawn bases share the same ground; a drawn base inside a
  //                                  building's footprint or inside a rock or wall; two footprints on the same cells
  //   a building on a field          a building's footprint or its door step inside a plot
  await stage('overlaps');
  const overlap = { pairs: 0, byPair: {}, roads: 0, plotCells: 0, things: 0 };
  if (!opts.noOverlap) try {
    const seenPair = new Set();
    const over = (pair, a, b, x, y, detail) => { const k = pair + '|' + a + '|' + b; if (seenPair.has(k)) return; seenPair.add(k); overlap.pairs++; overlap.byPair[pair] = (overlap.byPair[pair] || 0) + 1; push({ kind: 'overlap', obj: pair, name: a + ' / ' + b, x, y, detail }); };
    const plazas = (island.presentation && island.presentation.plazas) || [];
    const roads = [];
    for (const r of island.routes || []) {
      if (!r.points || r.points.length < 2) continue;
      const pts = gardenIslandRoutePath(r).points, rad = gardenIslandRoadStyle(r).radius;
      roads.push({ id: r.id, pts, rad, square: plazas.some(p => p.route === r.id), x0: Math.min(...pts.map(q => q.x)) - rad - .3, x1: Math.max(...pts.map(q => q.x)) + rad + .3, y0: Math.min(...pts.map(q => q.y)) - rad * CW / CH - .3, y1: Math.max(...pts.map(q => q.y)) + rad * CW / CH + .3 });
    }
    overlap.roads = roads.length;
    const distPx = (R, x, y) => { let best = Infinity; for (let i = 1; i < R.pts.length; i++) { const p = R.pts[i - 1], q = R.pts[i], ax = (q.x - p.x) * CW, ay = (q.y - p.y) * CH, bx = (x - p.x) * CW, by = (y - p.y) * CH, L = ax * ax + ay * ay || 1, t = Math.max(0, Math.min(1, (ax * bx + ay * by) / L)), d = Math.hypot(bx - ax * t, by - ay * t); if (d < best) best = d; } return best; };
    const inSquare = (x, y, k) => plazas.find(p => ((x - p.x) / (p.rx || 3.2)) ** 2 + ((y - p.y) / (p.ry || 2.4)) ** 2 <= (k || 1));   // (a square with no size of its own: the painters' default, 94-garden-paint-wood-0core.js)
    /** How much of a rectangle (cells) lies under a path's drawn band, in square cells, and where. `k`: share of the half width that counts. */
    const under = (R, x0, y0, x1, y1, k) => { if (x1 < R.x0 || x0 > R.x1 || y1 < R.y0 || y0 > R.y1) return null; const N = 5; let on = 0, sx = 0, sy = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = x0 + (x1 - x0) * (i + .5) / N, y = y0 + (y1 - y0) * (j + .5) / N; if (distPx(R, x, y) < R.rad * CW * k) { on++; sx += x; sy += y; } } return on ? { area: on / (N * N) * (x1 - x0) * (y1 - y0), x: sx / on, y: sy / on } : null; };
    // a field over a path; a field over water (its fence or hedge is drawn across the water)
    const fieldOn = new Map(), fieldWet = new Map();
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null; if (!row || !row.plot) continue; overlap.plotCells++;
      { let wet = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (gardenWaterContainsPoint(x + (i + .5) / 4, y + (j + .5) / 4)) wet++; if (wet >= 12) (fieldWet.get(row.id) || fieldWet.set(row.id, []).get(row.id)).push(x + ',' + y); }
      for (const R of roads) { const u = under(R, x, y, x + 1, y + 1, .8); if (!u) continue; const k = row.id + '|' + R.id, g = fieldOn.get(k) || fieldOn.set(k, { plot: row.id, road: R.id, area: 0, sx: 0, sy: 0, cells: [] }).get(k); g.area += u.area; g.sx += u.x * u.area; g.sy += u.y * u.area; g.cells.push(x + ',' + y); }
    }
    for (const g of fieldOn.values()) if (g.area >= .3) over('a field over a path', 'plot ' + g.plot, 'path ' + g.road, g.sx / g.area, g.sy / g.area, g.area.toFixed(2) + ' square cells of the plot lie under the path’s drawn width (cells ' + g.cells.slice(0, 6).join(' ') + ')');
    for (const [id, cells] of fieldWet) { const [cx, cy] = cells[0].split(',').map(Number); over('a field over water', 'plot ' + id, 'water at ' + cells[0], cx + .5, cy + .5, cells.length + ' cell(s) of the plot are water, three quarters or more: ' + cells.slice(0, 6).join(' ') + ' (a ring drawn round the plot crosses the water)'); }
    // a path under a building; a building on a field; two footprints on the same cells
    const propsNow = gardenPropsNow().filter(p => !(p.needs && !gardenWorkOwned(p.needs)) && !p.site), blocked = faults.filter(f => f.kind === 'path-blocked').map(f => f.name + ' ' + f.detail), onRoad = new Set();
    const foot = p => gardenPropCol(p) === 'soft' ? { x0: p.x + (p.w || 1) / 2 - Math.min(p.w || 1, 2) * .25, y0: p.y + (p.h || 1) - .36, x1: p.x + (p.w || 1) / 2 + Math.min(p.w || 1, 2) * .25, y1: p.y + (p.h || 1) - .08 } : { x0: p.x, y0: p.y, x1: p.x + (p.w || 1), y1: p.y + (p.h || 1) };
    for (const p of propsNow) {
      if (gardenPropCol(p) === 'none') continue; const f = foot(p), nm = p.name || p.id;
      if (!inSquare((f.x0 + f.x1) / 2, f.y1)) for (const R of roads) { if (R.square) continue; const u = under(R, f.x0, f.y0, f.x1, f.y1, .7); if (!u || u.area < .2) continue; onRoad.add(p.id + '|' + R.id); if (blocked.some(b => b.includes('(' + nm + ')'))) continue; over('a path under a building', nm, 'path ' + R.id, u.x, u.y, u.area.toFixed(2) + ' square cells of its footprint stand on the path’s drawn width'); }   // (one fault per cause: a building on a path's middle line is a path-blocked fault already)
      const inPlot = new Map(); for (let y = Math.floor(f.y0); y < f.y1; y++) for (let x = Math.floor(f.x0); x < f.x1; x++) { const row = gardenLandCell(x, y); if (row && row.plot) inPlot.set(row.id, (inPlot.get(row.id) || 0) + 1); }
      for (const [id, n] of inPlot) over('a building on a field', nm, 'plot ' + id, (f.x0 + f.x1) / 2, f.y1, n + ' cell(s) of its footprint are cells of the plot');
      if (p.door) { const row = gardenLandCell(p.door.x, p.door.y); if (row && row.plot) over('a building on a field', 'the door step of ' + nm, 'plot ' + row.id, p.door.x + .5, p.door.y + .5, 'its door step at ' + p.door.x + ',' + p.door.y + ' is a cell of the plot' + (String(gardenAreaAt(p.door.x, p.door.y, lvl)).startsWith('locked:') ? ' (shut behind its fence until the plot is bought)' : '')); }
      for (const q of propsNow) { if (q === p || q.id <= p.id || gardenPropCol(q) === 'none') continue; const g = foot(q), w = Math.min(f.x1, g.x1) - Math.max(f.x0, g.x0), h = Math.min(f.y1, g.y1) - Math.max(f.y0, g.y0); if (w > .05 && h > .05) over('a thing inside another', nm, q.name || q.id, Math.max(f.x0, g.x0) + w / 2, Math.min(f.y1, g.y1), 'their footprints share ' + (w * h).toFixed(2) + ' square cells'); }
    }
    // a path over water; a path through a square that is not its own
    for (const R of roads) {
      let run = null; const flush = () => { if (run && run.n >= 4) over('a path over water', 'path ' + R.id, 'water at ' + run.x.toFixed(1) + ', ' + run.y.toFixed(1), run.x, run.y, (run.n * .25).toFixed(1) + ' cells of its middle line lie over water with no bridge, stones or pier there'); run = null; };
      const inSq = new Map(), ends = [inSquare(R.pts[0].x, R.pts[0].y, 1.1), inSquare(R.pts[R.pts.length - 1].x, R.pts[R.pts.length - 1].y, 1.1)];   // (a path that ends in a square joins it)
      for (let i = 1; i < R.pts.length; i++) {
        const p = R.pts[i - 1], q = R.pts[i], n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / .25));
        for (let k = 0; k < n; k++) {
          const x = p.x + (q.x - p.x) * k / n, y = p.y + (q.y - p.y) * k / n;
          if (gardenWaterContainsPoint(x, y) && !nearCrossing(x, y) && !onDeck(x, y) && (!mosaic.ok || pixWater(x, y, 8, 4) >= .5)) { if (!run) run = { x, y, n: 0 }; run.n++; } else flush();
          const sq = inSquare(x, y, .8); if (sq && sq.route !== R.id && !ends.includes(sq)) { const g = inSq.get(sq.id) || inSq.set(sq.id, { n: 0, x, y }).get(sq.id); g.n++; if (g.n === 4) { g.x = x; g.y = y; } }
        }
      }
      flush();
      for (const [id, g] of inSq) if (g.n * .25 >= 2.5) over('a path through a square', 'path ' + R.id, 'square ' + id, g.x, g.y, (g.n * .25).toFixed(1) + ' cells of the path run on across the square’s own paving');
    }
    // standing things: on a path; base in base; in a building's footprint; in rock or wall
    const stands = objs.filter(o => ['tree', 'rock', 'prop', 'harbour', 'landmark', 'building', 'wall'].includes(o.kind) && o.heightPx >= 14 && !/lightpool|\|block$|gatesign|bridge|stones|\|stair|steps|boardwalk|\|pier/.test(o.key)).map(o => { const a = toCell(o.X0, o.Yb), b = toCell(o.X1, o.Yb); return { o, x: (a.x + b.x) / 2, y: a.y, w: b.x - a.x, tag: o.kind + ' ' + o.name + ' at ' + ((a.x + b.x) / 2).toFixed(1) + ', ' + a.y.toFixed(1), propId: o.prop ? o.prop.id : '' }; }).filter(t => t.x >= 0 && t.y >= 0 && t.x < W.cols && t.y < W.rows);
    overlap.things = stands.length;
    const fullForms = (island.landforms || []).filter(f => f.polygon && f.col === 'full').map(f => ({ f, x0: Math.min(...f.polygon.map(q => q[0])), x1: Math.max(...f.polygon.map(q => q[0])), y0: Math.min(...f.polygon.map(q => q[1])), y1: Math.max(...f.polygon.map(q => q[1])) }));
    const cellOf = new Map();
    for (const t of stands) {
      // on a path (not on a square or the quay, where things are set out)
      if (!inSquare(t.x, t.y, 1.15) && !softProp(t.o.prop)) for (const R of roads) { if (R.square || t.x < R.x0 || t.x > R.x1 || t.y < R.y0 || t.y > R.y1) continue; const d = distPx(R, t.x, t.y - 2 / CH); if (d < R.rad * CW * .55) { if (t.propId && (onRoad.has(t.propId + '|' + R.id) || blocked.some(b => b.includes('(' + (t.o.prop.name || t.propId) + ')')))) break; over('a thing on a path', t.tag, 'path ' + R.id, t.x, t.y, 'its drawn base stands ' + Math.round(d) + ' px from the middle of a path ' + Math.round(R.rad * 2 * CW) + ' px wide'); break; } }
      // inside a building's footprint that is not its own
      { const P = gardenPropAt(Math.floor(t.x), Math.floor(t.y - .12)); if (P && gardenPropCol(P) === 'full' && P.id !== t.propId && ['tree', 'rock', 'harbour'].includes(t.o.kind)) over('a thing inside another', t.tag, P.name || P.id, t.x, t.y, 'its drawn base stands inside the footprint of ' + (P.name || P.id)); }
      // inside rock or a wall
      if (['tree', 'prop', 'harbour', 'landmark', 'building'].includes(t.o.kind)) for (const F of fullForms) { if (t.x < F.x0 || t.x > F.x1 || t.y < F.y0 || t.y > F.y1) continue; if (F.f.kind === 'ruin' || F.f.kind === 'mountain' || F.f.kind === 'rock-wall' && /\|pine\|/.test(t.o.key)) continue;   // (meant: a ruin's floor is grown over; the Edge's own wind-bent pines stand on its rock, 94-garden-paint-terrain-1fells.js)
        if (inLoop(t.x, t.y - .15, F.f.polygon) && inLoop(t.x - .2, t.y - .15, F.f.polygon) && inLoop(t.x + .2, t.y - .15, F.f.polygon)) { over('a thing inside another', t.tag, F.f.kind + ' ' + F.f.id, t.x, t.y, 'its drawn base stands inside the drawn ' + F.f.kind); break; } }
      const k = Math.floor(t.x) + ',' + Math.floor(t.y); (cellOf.get(k) || cellOf.set(k, []).get(k)).push(t);
    }
    // two drawn bases on the same ground (not parts of one thing)
    for (const t of stands) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const u of cellOf.get((Math.floor(t.x) + di) + ',' + (Math.floor(t.y) + dj)) || []) {
      if (u === t || u.tag <= t.tag || u.o.rec && u.o.rec === t.o.rec || u.propId && u.propId === t.propId || u.o.im.parentContainer && u.o.im.parentContainer === t.o.im.parentContainer && u.o.kind !== 'tree') continue;
      const ow = Math.min(t.x + t.w / 2, u.x + u.w / 2) - Math.max(t.x - t.w / 2, u.x - u.w / 2), small = Math.min(t.w, u.w);
      if (small * CW >= 5 && ow > small * .5 && Math.abs(t.y - u.y) * CH <= 7) over('a thing inside another', t.tag, u.tag, (t.x + u.x) / 2, Math.max(t.y, u.y), 'their drawn bases share ' + Math.round(ow * CW) + ' px of the same ground line');
    }
  } catch (e) { overlap.error = String(e && e.stack || e).slice(0, 400); }

  /* ---------- 10. every decoration a player can place: each family, each way round ---------- */
  await stage('decor');
  const decor = { placed: 0, checked: 0, drawn: 0, families: {}, skipped: [] };
  if (!opts.noDecor) try {
    const G = _gdG(), uids = [], want = [];
    for (const def of GARDEN_DECOR) for (let r = 0; r < (def.rot ? 4 : 1); r++) want.push({ def, r });
    const okCell = (x, y) => { if (x < 1 || y < 1 || x >= W.cols - 1 || y >= W.rows - 1) return false; const i = y * W.cols + x, b = gardenIslandBaseCell(x, y); return !grid.hard[i] && !grid[i] && b && b.land && !b.freshwater && !b.solid && !gardenIsWater(x, y) && !String(gardenAreaAt(x, y, lvl)).startsWith('locked:') && !m.occ.get(x + ',' + y) && !gardenPropAt(x, y) && free(x + .5, y + .5); };
    const taken = new Set(); let wi = 0;
    for (let y = 2; y < W.rows - 3 && wi < want.length; y += 1) for (let x = 2; x < W.cols - 4 && wi < want.length; x += 1) {
      const { def, r } = want[wi], w = def.w || 1, h = def.h || 1; let ok = true;
      for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) if (!okCell(xx, yy) || taken.has(xx + ',' + yy)) ok = false;
      if (ok && solidsNear(x - .6, y - .6, x + w + .6, y + h + .6).length) ok = false;
      if (!ok) continue;
      for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) taken.add(xx + ',' + yy);
      const uid = 'zzaudit' + wi; G.decor[uid] = { d: def.id, x, y, r, v: 0, at: Date.now() }; uids.push({ uid, def, r, x, y }); wi++;
    }
    decor.placed = uids.length; decor.wanted = want.length;
    _gdSave(); await sleep(2500);
    m = gardenHere(); _gw.grid = null; grid = _gwGrid(m, true); D = gardenCollideData(m);
    // walk the camera over them so the painted world draws each one
    const prefs = _gdpPrefs(), keep = { cam: prefs.cam, zoom: prefs.zoom, x: _gw.px, y: _gw.py }; prefs.cam = 'follow'; prefs.zoom = 6;
    const rowsSeen = [...new Set(uids.map(u => Math.round(u.y / 14)))];
    for (const ry of rowsSeen) for (let tx = 12; tx < W.cols; tx += 22) { const q = gardenWorldNearestFree(tx, ry * 14 + 4, 8, .14) || { x: tx, y: ry * 14 + 4 }; _gw.px = q.x; _gw.py = q.y; _gw.path = []; _gw.cam.init = false; _gw.cam.dirty = true; await sleep(700); }
    prefs.cam = keep.cam; prefs.zoom = keep.zoom; _gw.px = keep.x; _gw.py = keep.y; _gw.cam.init = false; _gw.cam.dirty = true;
    await sleep(400);
    recByRoot = new Map(); for (const r of nw.entities.values()) recByRoot.set(r.root, r);
    const mine = new Map(uids.map(u => [u.uid, u])), sprites = collect((rec) => !!(rec && rec.metadata && rec.metadata.kind === 'decor' && mine.has(rec.metadata.uid)));
    const byUid = new Map(); for (const o of sprites) { const u = o.rec.metadata.uid; (byUid.get(u) || byUid.set(u, []).get(u)).push(o); }
    for (const u of uids) {
      const fam = u.def.cat || 'other', F = decor.families[fam] || (decor.families[fam] = { placed: 0, checked: 0, faults: 0 }); F.placed++;
      const col = gardenDecorCol(u.def), list = byUid.get(u.uid) || [];
      if (!list.length) { const rec = [...nw.entities.values()].find(r => r.metadata && r.metadata.uid === u.uid); if (!rec) decor.skipped.push(u.def.id + ' (not drawn)'); continue; }
      decor.drawn++;
      if (col === 'none' || u.def.layer === 'ground') continue;
      // its biggest picture that stands on the ground (a windmill's turning sails are sometimes its biggest picture, and end two rows up: that came and went from run to run)
      const lowest = Math.max(...list.map(q => q.Yb)), o = list.filter(q => q.Yb >= lowest - CH * .6).sort((p, q) => q.bounds.w * q.bounds.h - p.bounds.w * p.bounds.h)[0]; if (o.heightPx < 10) continue;
      decor.checked++; F.checked++; const before = faults.length;
      o.kind = 'decor'; o.name = (u.def.name || u.def.id) + (u.def.rot ? ' (turn ' + u.r + ')' : '');
      checkObject(o, { family: fam, region: 'decorations (anywhere)', decor: u.def.id, turn: u.r, col });
      // its block's foot against its drawn foot
      const a = toCell(o.X0, o.Yb), b = toCell(o.X1, o.Yb), w = u.def.w || 1, h = u.def.h || 1, foot = u.y + h, mid = (a.x + b.x) / 2;   // (a turned decoration keeps its footprint: 94-garden-design-2tools.js; only its drawing turns)
      if (faults.length === before && Math.abs(a.y - foot) > .5) push({ kind: 'decor-foot', obj: 'decor', name: o.name, family: fam, region: 'decorations (anywhere)', decor: u.def.id, turn: u.r, col, x: mid, y: a.y, detail: 'its drawn base is ' + (a.y - foot).toFixed(2) + ' rows from the foot of its ' + w + ' x ' + h + ' footprint' });
      // Placed in a run (a fence): the block must reach each joint, or a run of them has a gap at every joint (railings,
      // the kerb, the hurdle: the verifier walked through every joint, 18 Nov 2026). A foot standing on the joint line
      // with only this panel placed misses its block exactly when it would pass between two. Turned edge-on, the panel
      // blocks along its drawn length. A long thing (a planter): the feet do not stand on its drawn ends.
      if (faults.length === before && col !== 'none') {
        const yT = foot - .12, at = { obj: 'decor', name: o.name, family: fam, region: 'decorations (anywhere)', decor: u.def.id, turn: u.r, col };
        if (fam === 'fence' && u.def.rot && u.r % 2 === 1) { const open = [.15, .5, .85].filter(fy => free(u.x + w / 2, u.y + fy * h)); if (open.length) push({ kind: 'decor-foot', ...at, x: u.x + w / 2, y: u.y + .5, detail: 'turned edge-on, the feet can stand on its drawn line at ' + open.length + ' of 3 points along it: a run of them can be walked through' }); }
        else if (fam === 'fence') { const ends = [u.x + .02, u.x + w - .02].filter(x => free(x, yT)); if (ends.length && a.x <= u.x + .2 && b.x >= u.x + w - .2) push({ kind: 'decor-foot', ...at, x: ends[0], y: yT, detail: 'drawn to the edge of its cell, but a foot on the joint line misses its block: a run of these has a gap at every joint' }); }
        else if (w >= 2 && b.x - a.x >= 1.4) { const ends = [a.x + .15, b.x - .15].filter(x => free(x, yT)); if (ends.length) push({ kind: 'decor-foot', ...at, x: ends[0], y: yT, detail: 'drawn ' + (b.x - a.x).toFixed(2) + ' cells long, the feet can stand on ' + ends.length + ' of its drawn ends' }); }
      }
      if (faults.length > before) F.faults += faults.length - before;
    }
    decor.keepForThumbs = !!opts.keepDecor;
    if (!opts.keepDecor) { for (const u of uids) delete G.decor[u.uid]; _gdSave(); await sleep(800); }
    else window.__auditDecorUids = uids.map(u => u.uid);
  } catch (e) { decor.error = String(e && e.stack || e).slice(0, 400); }

  /* ---------- tally ---------- */
  const counts = { byKind: {}, byRegion: {}, byObject: {}, byRegionKind: {} };
  for (const f of faults) { counts.byKind[f.kind] = (counts.byKind[f.kind] || 0) + 1; counts.byRegion[f.region] = (counts.byRegion[f.region] || 0) + 1; counts.byObject[f.obj] = (counts.byObject[f.obj] || 0) + 1; const k = f.region + ' / ' + f.kind; counts.byRegionKind[k] = (counts.byRegionKind[k] || 0) + 1; }
  const objKinds = {}; for (const o of all) objKinds[o.kind] = (objKinds[o.kind] || 0) + 1;
  return { total: faults.length, counts, faults, scanned: { sprites: all.length, checked, shapeTrees, parts, byKind: objKinds, rects: D.rects.length, cells: D.cells.length, doors: doorsChecked, clicks: D.clicks.length, landforms: (island.landforms || []).length, routes: (island.routes || []).length, pathSamples, lockedPlots: plots.size, lockedEdges, shorePoints: shore.points, shoreDrawnDryNotes: shore.notes, crossings: crossingsChecked, decks: decksNow.length, picture: mosaic, decor, feel, walkTo, closed, order, overlap } };
})
