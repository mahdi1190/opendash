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
 *   walk-through, block-size, block-offset   a standing thing against the block at its drawn base
 *   invisible-wall                           a box, a blocked cell or a locked plot with nothing drawn on it
 *   drawn-blocked-walkable                   a drawn rock or wall (landform) the feet can walk into
 *   water-walkable, shore-blocked, shore-drawn-dry   every shoreline: feet on drawn water; feet stopped on dry land
 *                                            beside water; water drawn as dry ground
 *   crossing-gap, crossing-deck              every bridge, footbridge, stepping stones and pier: both ends join their
 *                                            paths; what you can walk on is the drawn deck
 *   locked-edge                              a locked plot edge that stops the feet where its painter draws no fence
 *   decor-foot                               every placeable decoration (each family, each way round): its block
 *                                            against its art
 *   door-unreachable                         a door, gate or arrival point you cannot walk to from where you arrive
 *   click-area                               a click area that is not on its art
 *   path-blocked                             a drawn path that is not walkable along its middle or across its width
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
    const key = im.texture.key + '#' + fr.name + (tall ? '#t' + originU : ''); if (pix.has(key)) return pix.get(key);
    let out = null;
    try {
      const w = fr.cutWidth, h = fr.cutHeight; if (!w || !h || w * h > 4e6) { pix.set(key, null); return null; }
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h); const data = cx.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
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
          else best = runs.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0];
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
    if (/^__garden|^gpwd-|^gpw-|gpw-mist|gpw-foam|\|u\||mainland-haze|shingle/.test(k)) return '';
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
        if (kind && o.depth > -9000 && o.visible !== false && (!only || only(rec, k))) {
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
    const freeN = xs.filter(x => free(x, yTest)).length; let midFree = free(mid, yTest);
    const base = Object.assign({ obj: o.kind, name: o.name, key: o.key.slice(0, 90), x: mid, y: yb, span: +span.toFixed(2) }, extra || {});
    // a tree's roots flare and its leaf litter lies lower than its trunk: its block may sit anywhere from the narrow foot down to the lowest root
    if (midFree && o.kind === 'tree') { for (let y = yb - 14 / CH; y <= yb + 5 / CH && midFree; y += 2 / CH) if (!free(mid, y)) midFree = false; if (!midFree) return; }
    // a thin thing held by stays or with a wide skirt (a maypole, a crutch under a bough): its block stands under the middle of the drawing
    if (midFree && span < .45 && o.bounds.w > 40) { const bc = toCell(o.bounds.x + o.bounds.w / 2, o.bounds.y + o.bounds.h), near = solidsNear(bc.x - .35, bc.y - 1.2, bc.x + .35, bc.y + .15).filter(r => !r.form); if (near.length) return; }
    if (midFree && (xs.length === 1 || freeN >= 2)) { push({ kind: extra ? 'decor-foot' : 'walk-through', ...base, detail: 'feet can stand on its drawn base (' + freeN + ' of ' + xs.length + ' test points free)' }); return; }
    // what blocks at its base: boxes and cells along the base line, a third of a cell deep
    // (only blocks that reach under this base: a neighbour's trunk beside it is the neighbour's)
    const band = { y0: yb - .35, y1: yb + .05 };
    const rs = solidsNear(a.x - .05, band.y0, b.x + .05, band.y1).filter(r => !r.form);   // (a landform's box is its outline's bounds, not a block)
    let bx0 = Infinity, bx1 = -Infinity;
    for (const r of rs) { bx0 = Math.min(bx0, r.x0); bx1 = Math.max(bx1, r.x1); }
    const cellsUnder = []; for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) if (hardAt(x + .5, yb - .15)) cellsUnder.push(x);
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
    else if (own && rs.length <= 1 && !cellsUnder.length && bw > .8 && bw > Math.max(span * 2, span + 1)) push({ kind: extra ? 'decor-foot' : 'block-size', ...base, detail: 'block ' + bw.toFixed(2) + ' cells wide under a base ' + span.toFixed(2) + ' wide (too big)' });
    if (Math.abs(bc - mid) > Math.max(.35, span * .4) && !(bx0 <= mid && bx1 >= mid)) push({ kind: extra ? 'decor-foot' : 'block-offset', ...base, detail: 'block centre ' + (bc - mid).toFixed(2) + ' cells from the base centre' });
  };
  for (const o of objs) {
    if (noBlock.has(o.kind) || softProp(o.prop) || o.heightPx < 14) continue;
    if (o.rec && o.rec.metadata && o.rec.metadata.kind === 'decor') { const d = gardenDecorById(m, o.rec.metadata.uid); if (d && (gardenDecorCol(d.def) === 'none' || d.def.layer === 'ground')) continue; }
    checked++; checkObject(o);
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
  let lockedEdges = 0;
  for (const [id, cells] of plots) {
    const bare = [], openEdges = [];
    for (const [x, y] of cells) {
      if (isThicketWood(x, y)) {
        let on = 0; for (const fy of [.2, .5, .8]) for (const fx of [.2, .5, .8]) { const p = toPx(x + fx, y + fy); if (anyPaint(p.X, p.Y)) on++; }
        if (on < 3) bare.push([x, y, on]);
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
  for (const f of island.landforms || []) {
    if (!f.polygon || f.col !== 'full') continue;
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
    else if (Math.abs(c.own.y1 - ab) > .8 && mine.length) push({ kind: 'click-area', ...base, detail: 'click area ends ' + (c.own.y1 - ab).toFixed(2) + ' rows from the drawn base' });
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
          if (lane === 'middle') { if (!(free(x, y) || free(x + .3, y) || free(x - .3, y) || free(x, y + .3) || free(x, y - .3))) blockedAt = { x, y }; }
          else if (!nearCrossing(x, y) && !onDeck(x, y) && free(x, y)) for (const s of [-1, 1]) { const ex = x + nx * half * CW * s, ey = y + ny * half * CW * s; if (!free(ex, ey) && !free(ex + nx * -s * 6, ey + ny * -s * 6)) { blockedAt = { x: ex, y: ey }; break; } }
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
  if (mosaic.ok || opts.noPicture) {
    const ST = .25, onWater = new Set(), dryBlocked = new Set(), drawnDry = new Set();
    for (let j = 0; j < W.rows / ST; j++) for (let i = 0; i < W.cols / ST; i++) {
      const x = i * ST + .001, y = j * ST + .001, fr = free(x, y); shore.points++;
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

  /* ---------- 10. every decoration a player can place: each family, each way round ---------- */
  const decor = { placed: 0, checked: 0, drawn: 0, families: {}, skipped: [] };
  if (!opts.noDecor) try {
    const G = _gdG(), uids = [], want = [];
    for (const def of GARDEN_DECOR) for (let r = 0; r < (def.rot ? 4 : 1); r++) want.push({ def, r });
    const okCell = (x, y) => { if (x < 1 || y < 1 || x >= W.cols - 1 || y >= W.rows - 1) return false; const i = y * W.cols + x, b = gardenIslandBaseCell(x, y); return !grid.hard[i] && !grid[i] && b && b.land && !b.freshwater && !b.solid && !gardenIsWater(x, y) && !String(gardenAreaAt(x, y, lvl)).startsWith('locked:') && !m.occ.get(x + ',' + y) && !gardenPropAt(x, y) && free(x + .5, y + .5); };
    const taken = new Set(); let wi = 0;
    for (let y = 2; y < W.rows - 3 && wi < want.length; y += 1) for (let x = 2; x < W.cols - 4 && wi < want.length; x += 1) {
      const { def, r } = want[wi], w = (r % 2 && def.rot ? def.h : def.w) || 1, h = (r % 2 && def.rot ? def.w : def.h) || 1; let ok = true;
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
      const o = list.slice().sort((p, q) => q.bounds.w * q.bounds.h - p.bounds.w * p.bounds.h)[0]; if (o.heightPx < 10) continue;
      decor.checked++; F.checked++; const before = faults.length;
      o.kind = 'decor'; o.name = (u.def.name || u.def.id) + (u.def.rot ? ' (turn ' + u.r + ')' : '');
      checkObject(o, { family: fam, region: 'decorations (anywhere)', decor: u.def.id, turn: u.r, col });
      // its block's foot against its drawn foot
      const a = toCell(o.X0, o.Yb), b = toCell(o.X1, o.Yb), w = (u.r % 2 && u.def.rot ? u.def.h : u.def.w) || 1, h = (u.r % 2 && u.def.rot ? u.def.w : u.def.h) || 1, foot = u.y + h, mid = (a.x + b.x) / 2;
      if (faults.length === before && Math.abs(a.y - foot) > .5) push({ kind: 'decor-foot', obj: 'decor', name: o.name, family: fam, region: 'decorations (anywhere)', decor: u.def.id, turn: u.r, col, x: mid, y: a.y, detail: 'its drawn base is ' + (a.y - foot).toFixed(2) + ' rows from the foot of its ' + w + ' x ' + h + ' footprint' });
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
  return { total: faults.length, counts, faults, scanned: { sprites: all.length, checked, byKind: objKinds, rects: D.rects.length, cells: D.cells.length, doors: doorsChecked, clicks: D.clicks.length, landforms: (island.landforms || []).length, routes: (island.routes || []).length, pathSamples, lockedPlots: plots.size, lockedEdges, shorePoints: shore.points, shoreDrawnDryNotes: shore.notes, crossings: crossingsChecked, decks: decksNow.length, picture: mosaic, decor } };
})
