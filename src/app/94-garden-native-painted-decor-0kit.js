/* The Painted village's decorations, the ones people buy, craft or win, in the
 * opening scenes' house style (docs/dev/SCENE_LESSONS.md): soft shading lit
 * from the upper left, no outlines, lobed natural shapes, a contact shadow.
 *
 * One registry for every family file (94-garden-native-painted-decor-1*.js):
 *   GardenPaintedDecor.add(family, { id: row })   at load, plain data only
 *   row = { box: [x0, y0, x1, y1], draw(B, o),    world px round the foot (0, 0)
 *           v: n variants, side: { box, draw }    the view along a fence run (rot 1, 3)
 *           glow: { w, halo }                     a light pool at dusk and night (halo: y of the lamp)
 *           anim: [{ id, box, draw, x, y, kind: 'spin'|'sway'|'bob'|'flutter'|'flicker', speed, amp }],
 *           iconOnly: true }                     only the shop and bag picture (the world keeps a live drawing)
 *   o = { season, night, v, side, r (seeded random), K (the props kit), D (sceneDraw), icon }
 *
 * The world drawing is baked once into a texture keyed by what it shows (the
 * props kit's bake), so a redraw reuses it; only the anim parts move. Icons
 * for the shop, the bag and the crafting bench come from the same painters,
 * drawn at icon size into a small canvas, kept in a bounded cache. Nothing
 * here runs at load except the registry itself, so a family file may call
 * add() at load (it sorts after this file). */
window.GardenPaintedDecor = (function () {
  'use strict';
  const ROWS = Object.create(null);
  let lastError = null, iconMs = 0, icons = 0;
  function add(family, rows) { for (const id of Object.keys(rows)) ROWS[id] = Object.assign({ family }, rows[id]); }
  const row = id => ROWS[id] || null;
  const kit = () => window.GardenPaintedProps && GardenPaintedProps.kit;
  const vOf = (R, v) => R && R.v ? ((v | 0) % R.v + R.v) % R.v : 0;
  const sideOf = (R, r) => !!(R && R.side && ((r | 0) % 2 === 1));
  const partOf = (R, side) => side ? R.side : R;
  function opts(K, id, season, night, v, side, icon, tile) { return { season: season || 'summer', night: !!night, v, side, tile: tile | 0, r: K.rng(K.hash(id) + v * 31 + (tile | 0) * 97 + 1), K, D: sceneDraw, H, P: K.PALETTE, icon: !!icon }; }

  /* ---------- shared touches, so each family keeps one look (o.H) ---------- */
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, p = Math.abs(f); r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };
  const H = {
    shade,
    // a colour as a lit-from-the-upper-left trio [base, shade, light, deep]
    pal: c => [c, shade(c, -.22), shade(c, .28), shade(c, -.45)],
    // a body of colour, lit across: light at the left, deeper at the right
    lit: (B, x0, x1, c) => B.lin(x0, 0, x1, 0, [[0, shade(c, .22)], [.4, c], [1, shade(c, -.28)]]),
    // a plank with a lit top edge, a shade below and a little grain
    plank(B, x, y, w, h, pal, r) { B.beam(x, y, w, h, pal); if (r && w > 10) for (let i = 0; i < Math.max(1, w / 16); i++) { const gx = x + 3 + r() * (w - 8); B.s(`M${gx} ${y + h * .45}h${3 + r() * 5}`, pal[1], .5, .5); } return B; },
    // glass: a pale fill and a bright streak to the upper left
    glass(B, d, x, y, w, h, op) { B.f(d, 'rgba(206,232,236,' + (op == null ? .5 : op) + ')').f(B.poly([[x + w * .12, y + h * .9], [x + w * .3, y + h * .9], [x + w * .5, y + h * .08], [x + w * .32, y + h * .08]]), '#ffffff', .45); return B; },
    // a flame in three tones (bright core), for fires, candles and lanterns
    flame(B, x, y, s, op) { B.f(`M${x - 5 * s} ${y}q${-1 * s} ${-7 * s} ${5 * s} ${-14 * s}q${6 * s} ${7 * s} ${5 * s} ${14 * s}z`, '#e8742a', op == null ? .95 : op).f(`M${x - 3 * s} ${y}q0 ${-5 * s} ${3 * s} ${-9 * s}q${3 * s} ${4 * s} ${3 * s} ${9 * s}z`, '#f8b440').f(`M${x - 1.5 * s} ${y}q0 ${-3 * s} ${1.5 * s} ${-5 * s}q${1.5 * s} ${2 * s} ${1.5 * s} ${5 * s}z`, '#fff0b8'); return B; },
    // a bulb or lamp: a soft halo when lit, a bright core
    bulb(B, x, y, rr, col, lit) { if (lit) B.f(B.circ(x, y, rr * 2.4), B.rad(x, y, rr * 2.4, [[0, 'rgba(255,226,150,.55)'], [1, 'rgba(255,226,150,0)']])); B.f(B.circ(x, y, rr), lit ? shade(col, .35) : shade(col, -.1)).f(B.circ(x - rr * .3, y - rr * .3, rr * .4), '#ffffff', lit ? .85 : .5); return B; },
    // a cluster of round blooms over a leafy base (pots, baskets, barrows)
    blooms(B, r, x, y, w, h, cols, season) { const L = B.cx && (window.GardenPaintedProps ? GardenPaintedProps.kit.leafOf(season) : null) || ['#46703a', '#5e8a44', '#82aa58', '#a9c674']; B.f(sceneDraw.blob(r, x, y, w * .55, h * .5, 9, .4), L[0]).f(sceneDraw.blob(r, x - w * .08, y - h * .1, w * .45, h * .38, 8, .4), L[1]).f(sceneDraw.blob(r, x - w * .2, y - h * .25, w * .2, h * .16, 6, .4), L[2], .9); if (season === 'winter') return B; const n = Math.round(w * h / 40) + 3; for (let i = 0; i < n; i++) { const px = x + (r() - .5) * w * .95, py = y + (r() - .6) * h * .8, c = cols[i % cols.length], rr = 1.6 + r() * 1.4; B.f(B.circ(px, py, rr), c).f(B.circ(px - rr * .3, py - rr * .3, rr * .45), '#ffffff', .4); } return B; },
    // a rope or cord, slightly darker under a pale top
    cord(B, d, w, c) { B.s(d, shade(c || '#c8b48a', -.3), (w || 1.4) + .6, .9).s(d, c || '#c8b48a', w || 1.4); return B; },
    // fabric with stripes across it (deckchairs, awnings, hammocks)
    stripes(B, clip, x0, y0, x1, y1, a, b, n) { const cx = B.cx; cx.save(); cx.clip(new Path2D(clip)); B.f(B.rect(x0, y0, x1 - x0, y1 - y0), a); const sw = (x1 - x0) / (n * 2); for (let i = 0; i < n; i++) B.f(B.rect(x0 + (i * 2 + 1) * sw, y0, sw, y1 - y0), b); B.f(B.rect(x0, y0, x1 - x0, y1 - y0), B.lin(x0, 0, x1, 0, [[0, 'rgba(255,255,255,.18)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(40,30,20,.22)']])); cx.restore(); return B; },
    // painted stone: base, a light face upper left, a mossy cap when old
    carved(B, d, x0, x1, pal) { B.f(d, B.lin(x0, 0, x1, 0, [[0, pal[2]], [.45, pal[0]], [1, pal[3] || pal[1]]])); return B; },
  };

  /* ---------- in the world ---------- */
  // SC: the drawing's scale in the world (painters draw a little large for a crisp icon)
  const ANIM = {
    spin: (a) => (n, t, m) => { if (m) n.setRotation(t * (a.speed || 1.6)); },
    sway: (a, ph) => (n, t, m) => { if (m) n.setRotation(Math.sin(t * (a.speed || 1.2) + ph) * (a.amp || .05)); },
    bob: (a, ph, y0, sc) => (n, t, m) => { if (m) n.y = y0 + Math.sin(t * (a.speed || 1.4) + ph) * (a.amp || 2) * sc; },
    flutter: (a, ph, y0, sc) => (n, t, m) => { if (m) n.setScale((1 + Math.sin(t * (a.speed || 5) + ph) * (a.amp || .06)) * sc / 2, sc / 2); },
    flicker: (a, ph) => (n, t, m) => { if (m) n.setAlpha(.82 + Math.sin(t * (a.speed || 7) + ph) * .1 + Math.sin(t * 13.1 + ph) * .06); },
  };
  // fences stay full size so a row of them meets; everything else sits at the scale of the village's props
  const scaleOf = R => R.scale || (R.family === 'fences' ? 1 : .8);
  // Textures of another season or time of day are let go a little after the
  // village moves on (every decoration is redrawn then), so memory stays bounded.
  let lastMood = null;
  function sweep(scene, mood) {
    if (lastMood === mood) return; const was = lastMood; lastMood = mood; if (was == null) return;
    setTimeout(() => { try { if (!scene.textures) return; for (const key of scene.textures.getTextureKeys()) if (key.startsWith('gpp|dec|') && !key.endsWith('|' + lastMood)) scene.textures.remove(key); } catch (e) { lastError = String(e); } }, 4000);
  }
  // Baking is spread out: a redraw that would bake many new pictures at once
  // (a friend's garden, thirty things placed) bakes about 10 ms of them and
  // lets the rest appear over the next frames, so no task runs long.
  const queue = []; let tickAt = 0, tickMs = 0, pumping = false, deferred = 0;
  function budget() { const now = performance.now(); if (now - tickAt > 30) { tickAt = now; tickMs = 0; } return tickMs < 10; }
  function pump() {
    if (pumping) return; pumping = true;
    const run = () => { const t0 = performance.now(); while (queue.length && performance.now() - t0 < 10) { const job = queue.shift(); try { job(); } catch (e) { lastError = String(e && e.stack || e); } } if (queue.length) setTimeout(run, 16); else pumping = false; };
    setTimeout(run, 16);
  }
  function world(scene, item, sc, o) {
    const K = kit(), R = ROWS[item.id], def = typeof gardenDecor === 'function' ? gardenDecor(item.id) : null; if (!K || !R || !def) return null;
    const W = o.W, season = sc.season || 'summer', night = !!o.night, mood = season + '|' + (night ? 'n' : 'd');
    const flat = !!R.ground, fx = (item.x + (def.w || 1) / 2) * W.cellW, foot = W.sky + (item.y + (def.h || 1)) * W.cellH - (flat ? 0 : 4);
    // paths and ground covers lie flat; tile is a position variant so a run of them does not repeat
    const side = sideOf(R, item.r), v = vOf(R, item.v), P = partOf(R, side), flip = !flat && !!item.flip, SC = flat ? 1 : scaleOf(R), tile = R.tiles ? ((item.x * 7 + item.y * 13) % R.tiles + R.tiles) % R.tiles : 0;
    if (!P || !P.draw) return null;
    sweep(scene, mood); warmSoon();
    const h = K.handle(scene, o, 'decor:' + item.uid, { cls: 'decor' });
    let gone = false; const destroy = h.destroy; h.destroy = () => { gone = true; destroy(); };
    const mainKey = 'dec|' + item.id + '|' + v + (side ? '|s' : '') + (tile ? '|t' + tile : '') + '|' + mood;
    const paint = () => {
      if (gone) return; const t0 = performance.now();
      const key = K.bake(scene, mainKey, P.box, B => P.draw(B, opts(K, item.id, season, night, v, side, false, tile)));
      const im = h.add(K.image(scene, key, fx, foot)); if (!im) return;
      im.setScale(SC / 2); if (flip) im.setFlipX(true);
      (P.anim || []).forEach((a, i) => {
        const ak = K.bake(scene, 'dec|' + item.id + '|' + a.id + '|' + v + '|' + mood, a.box, B => a.draw(B, opts(K, item.id, season, night, v, side)));
        const x = fx + (flip ? -a.x : a.x) * SC, y = foot + a.y * SC, ai = h.add(K.image(scene, ak, x, y)); if (!ai) return;
        ai.setScale(SC / 2); if (flip) ai.setFlipX(true);
        h.move(ai, (ANIM[a.kind] || ANIM.sway)(a, i * 1.7 + item.x * .3, y, SC));
      });
      tickMs += performance.now() - t0;
    };
    if (scene.textures.exists('gpp|' + mainKey) || budget()) paint(); else { deferred++; queue.push(paint); pump(); }
    if (P.glow) { const hy = P.glow.halo == null ? null : foot + P.glow.halo * SC; h.lights.push({ x: fx, y: hy == null ? foot - 10 : hy, radius: P.glow.radius || 90, pool: true }); if (night) K.glowPool(scene, h, fx, foot, (P.glow.w || 70) * SC, hy); }
    const [x0, y0, x1, y1] = P.box, bx0 = (flip ? -x1 : x0) * SC, bx1 = (flip ? -x0 : x1) * SC;
    return K.finish(h, { x: fx + bx0, y: foot + y0 * SC, width: bx1 - bx0, height: (y1 - y0) * SC + 6 }, { x: fx, y: foot });
  }
  function ground(id) { const R = ROWS[id]; return !!(R && R.ground && !R.iconOnly); }
  function signature(item, sc, night) { const R = ROWS[item.id]; return R ? 'painted-decor-3|' + item.id + '|' + item.x + ',' + item.y + '|' + vOf(R, item.v) + (sideOf(R, item.r) ? 's' : '') + (item.flip ? 'f' : '') + '|' + sc.season + (night ? '|n' : '') : null; }

  /* ---------- icons: the shop, the bag, the crafting bench ---------- */
  const ICON = new Map(), ICON_MAX = 320, S = 112;
  // what to draw for an id: a registry row, an older painted prop, or a library object
  function source(id, v, side) {
    const R = ROWS[id]; if (R) { const P = partOf(R, false); if (!P || !P.draw) return null;
      // the moving parts are drawn too, where they rest, and the box grows to hold them
      const box = P.box.slice(); for (const a of P.anim || []) { box[0] = Math.min(box[0], a.x + a.box[0]); box[1] = Math.min(box[1], a.y + a.box[1]); box[2] = Math.max(box[2], a.x + a.box[2]); box[3] = Math.max(box[3], a.y + a.box[3]); }
      return { box, draw: (B, o) => { P.draw(B, o); for (const a of P.anim || []) { B.cx.save(); B.cx.translate(a.x, a.y); a.draw(B, o); B.cx.restore(); } }, v: vOf(R, v) }; }
    const PP = window.GardenPaintedProps; if (!PP || !PP.decorTable) return null;
    const d = PP.decorTable[id]; if (!d) return null;
    if (d[0] === 'paint') { const P = PP.paintTable[d[1]]; return P ? { box: P.box, draw: (B, o) => P.draw(B, o), v: 0 } : null; }
    if (d[0] === 'lib') return { lib: d };
    return null;
  }
  function iconCanvas(id, o) {
    const K = kit(), src = K && source(id, o.v); if (!src) return null;
    const c = document.createElement('canvas'); c.width = S; c.height = S; const cx = c.getContext('2d');
    if (src.lib) {
      const GP = window.GardenNativePainted; if (!GP || !GP.objectCanvas || typeof sceneObj !== 'function' || !sceneObj(src.lib[1])) return null;
      const m = GP.objectCanvas(src.lib[1], src.lib[2], o.season || 'summer', src.lib[3], false); if (!m) return null;
      return fit(m.c, m.c.getContext('2d'), c, cx, true);
    }
    // draw at a generous size, then crop to what was painted so small icons fill their tile
    const [x0, y0, x1, y1] = src.box, k = Math.min(S * 1.5 / (x1 - x0), S * 1.5 / (y1 - y0)), tw = Math.ceil((x1 - x0) * k), th = Math.ceil((y1 - y0) * k);
    const t = document.createElement('canvas'); t.width = tw; t.height = th; const tx = t.getContext('2d', { willReadFrequently: true });
    tx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    // a patch of lawn under its foot, so pale things (white pickets, glass, snow) read on the paper
    const B = K.brush(tx), gr = K.rng(K.hash(id)), gw = Math.min(46, Math.max(16, (x1 - x0) * .42)), L = K.leafOf(o.season || 'summer');
    B.f(sceneDraw.blob(gr, 0, 1.6, gw, 5.4, 9, .3), L[0], .55).f(sceneDraw.blob(gr, -gw * .1, .4, gw * .86, 4, 9, .3), L[1], .55).f(sceneDraw.blob(gr, -gw * .3, -.6, gw * .4, 1.8, 7, .4), L[2], .45);
    src.draw(B, opts(K, id, o.season, false, src.v, false, true));
    return fit(t, tx, c, cx, true);
  }
  // copy the painted part of t into the square c: centred, standing on the bottom edge
  function fit(t, tx, c, cx, stand) {
    const { width: tw, height: th } = t, a = tx.getImageData(0, 0, tw, th).data; let mx = tw, my = th, Mx = -1, My = -1;
    for (let y = 0; y < th; y += 2) for (let x = 0; x < tw; x += 2) if (a[(y * tw + x) * 4 + 3] > 40) { if (x < mx) mx = x; if (x > Mx) Mx = x; if (y < my) my = y; if (y > My) My = y; }
    if (Mx < 0) return null; mx = Math.max(0, mx - 2); my = Math.max(0, my - 2); Mx = Math.min(tw, Mx + 3); My = Math.min(th, My + 3);
    const w = Mx - mx, h = My - my, k = Math.min(S * .92 / w, S * .92 / h);
    cx.imageSmoothingQuality = 'high'; cx.drawImage(t, mx, my, w, h, (S - w * k) / 2, stand ? S - 2 - h * k : (S - h * k) / 2, w * k, h * k);
    return c;
  }
  // Icons are made while a 12 ms slice of the current task lasts; past that a
  // tile is handed out empty and filled a moment later (and every icon is
  // made ahead in idle time once one is asked for), so a full shop never
  // holds the page up.
  let iconTick = 0, iconTickMs = 0; const waiting = new Map();
  function iconBudget() { const now = performance.now(); if (now - iconTick > 40) { iconTick = now; iconTickMs = 0; } return iconTickMs < 12; }
  function make(key, fn) { const t0 = performance.now(); let url = ''; try { const c = fn(); url = c ? c.toDataURL('image/png') : ''; } catch (e) { lastError = String(e && e.stack || e); } if (ICON.size >= ICON_MAX) ICON.delete(ICON.keys().next().value); ICON.set(key, url); const ms = performance.now() - t0; iconMs += ms; iconTickMs += ms; icons++; return url; }
  function later(key, fn) {
    if (!waiting.has(key)) waiting.set(key, fn);
    if (waiting.size === 1) setTimeout(function fill() {
      const t0 = performance.now();
      for (const [k, f] of waiting) { if (performance.now() - t0 > 12) break; waiting.delete(k); const url = ICON.has(k) ? ICON.get(k) : make(k, f); for (const el of document.querySelectorAll('svg[data-gpdi="' + CSS.escape(k) + '"] image')) { if (url) el.setAttribute('href', url); else el.closest('svg').style.visibility = 'hidden'; } }
      if (waiting.size) setTimeout(fill, 20);
    }, 0);
  }
  const shell = (key, url, px, cls) => `<svg class="${cls}" viewBox="0 0 ${S} ${S}" width="${px}" height="${px}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"${url ? '' : ` data-gpdi="${key.replace(/"/g, '')}"`}><image href="${url || ''}" x="0" y="0" width="${S}" height="${S}"/></svg>`;
  /** An item as a small standalone <svg> holding its painted picture, or '' when it has none. */
  function icon(id, o) {
    o = Object.assign({}, o); if (o.silhouette) return '';
    if (!ROWS[id] && !(window.GardenPaintedProps && GardenPaintedProps.decorTable && GardenPaintedProps.decorTable[id])) return '';
    o.v = (o.v | 0) || (o.variant | 0);   // the mill's stage and the marble jar's count come as the variant
    const px = o.px || 48, key = id + '|' + o.v + '|' + (o.season || 'summer'), fn = () => iconCanvas(id, o);
    let url = ICON.get(key);
    if (url === undefined) { if (iconBudget()) url = make(key, fn); else later(key, fn); }
    if (url === '') return '';
    warmSoon();
    return shell(key, url, px, 'gd-ico gd-ico-painted');
  }
  // make every decoration's icon ahead, a few at a time when the page is idle
  let warmed = false;
  function warmSoon() {
    if (warmed) return; warmed = true;
    const ids = Object.keys(ROWS).concat(Object.keys(window.GardenPaintedProps && GardenPaintedProps.decorTable || {})), idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 50));
    let i = 0; const step = (d) => { const t0 = performance.now(); while (i < ids.length && performance.now() - t0 < Math.min(10, Math.max(4, d.timeRemaining()))) { const id = ids[i++], key = id + '|0|summer'; if (!ICON.has(key)) make(key, () => iconCanvas(id, { v: 0 })); } if (i < ids.length) idle(step, { timeout: 2000 }); };
    setTimeout(() => idle(step, { timeout: 2000 }), 1500);
  }
  /** A painted icon of anything with a painter of its own (crafted things that are not decorations). */
  const EXTRA = Object.create(null);
  function addIcon(id, p) { EXTRA[id] = p; }
  function extraIcon(id, px, cls) {
    const p = EXTRA[id], K = kit(); if (!p || !K) return '';
    const key = 'x|' + id; let url = ICON.get(key);
    if (url === undefined) url = make(key, () => { const c = document.createElement('canvas'); c.width = S; c.height = S; const [x0, y0, x1, y1] = p.box, k = Math.min(S * 1.5 / (x1 - x0), S * 1.5 / (y1 - y0)), t = document.createElement('canvas'); t.width = Math.ceil((x1 - x0) * k); t.height = Math.ceil((y1 - y0) * k); const tx = t.getContext('2d', { willReadFrequently: true }); tx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); p.draw(K.brush(tx), opts(K, id, 'summer', false, 0, false, true)); return fit(t, tx, c, c.getContext('2d'), false); });
    return url ? `<svg class="${cls || 'gcr-art'} gd-ico-painted" viewBox="0 0 ${S} ${S}" width="${px}" height="${px}" aria-hidden="true" focusable="false"><image href="${url}" x="0" y="0" width="${S}" height="${S}"/></svg>` : '';
  }
  function status() { return { rows: Object.keys(ROWS).length, deferred, queued: queue.length, icons, iconMs: Math.round(iconMs), cached: ICON.size, lastError }; }
  return { opts, add, row, has: id => !!ROWS[id] && !ROWS[id].iconOnly,   // iconOnly: painted in the shop and bag, drawn live in the world (the aquarium shows your own fish)
     ids: () => Object.keys(ROWS), ground, world, signature, icon, addIcon, extraIcon, iconCanvas, status, get lastError() { return lastError; } };
})();
