/* ============================================================
   SCENE ENGINE v2: the atmos pass (docs/dev/SCENE_ENGINE_V2.md 7 and 8.4; builder C). Browser only.
   It plugs into the pass registry (78-scene-0pass.js, builder B: sceneRenderPassDefine) and never edits the renderer.
   Every stage is baked except the fog banks (one draw each per frame).

     prebake    v2: the static light sources (sceneLightsOf) into env.lights; the haze of every placement by its real depth
                (sceneHazeAt, bucketed to 0.1: env.itemHaze) and its lift near a lamp at night (sceneLiftAt: env.itemLift);
                the fog-bank sprites
     sprite     soft shading (a horizontal gradient away from the sun) and the rim light on the sun's edge (backlit or
                golden hour), for the classes tree building structure landmark vehicle person animal rock; the sprite's
                on-screen orientation (req.flip) is honoured, and spriteKey carries it
     ground     v2: the haze the weather adds to the ground beyond what the compile baked into the surfaces (fog, mist)
     layer      under (v2, after dusk): lamp pools (perspective ellipses, 'lighter') and window / shopfront spill;
                over: halos round lamp heads and lit signs
     group      v2: a very subtle depth veil on a bitmap that holds only far content (at most 0.12)
     frameGroup v2: the fog banks, drawn behind the nearer bitmaps (true depth: 60, 150, 400 m), drifting with the wind
     framePost  v1 with fx: the fog banks over the frame (there is no camera)
   v1 scenes: the pass applies only with fx { atmos: 2 } (shading and rim; the v1 layer haze stays) or fx { weather: 2 } (fog banks).

   For builder D (the flow pass): sceneHeadlightSprite(k, view) -> { head, tail } pre-rendered light sprites
   ({ c, x0, y0, w, h }: device px, the top-left offset from the lamp anchor), sceneHeadlightDraw(ctx, spr, X, Y, dir, alpha),
   sceneLitSpillSprite(k, lenM) (the moving spill strip of a lit tram, train or bus).
   Private names: _scat* (shared with 70-scene-1atmos.js; this file uses _scatP* / _scatB*).
   ============================================================ */
const _SCATP_SHADE = new Set(['tree', 'building', 'structure', 'landmark', 'vehicle', 'car', 'bus', 'tram', 'train', 'bike', 'tractor', 'boat', 'person', 'cyclist', 'animal', 'animal-graze', 'animal-dog', 'rock']);
const _SCATP_CAT = { tree: 'tree', building: 'building', structure: 'structure', landmark: 'landmark', vehicle: 'vehicle', boat: 'boat', person: 'person', animal: 'animal', rock: 'rock', plant: 'shrub', street: 'street', rail: 'rail', bird: 'bird', ground: 'cover', prop: 'street' };
const _scatPClamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** rgba() of a hex colour. */
function _scatPRgba(hex, a) { const v = typeof _scHex === 'function' ? _scHex(hex) : [255, 255, 255]; return `rgba(${v[0]},${v[1]},${v[2]},${Math.round(_scatPClamp(a, 0, 1) * 1000) / 1000})`; }
function _scatPMix(a, b, t) { return typeof _scMixHex === 'function' ? _scMixHex(a, b, t) : _scatMix(a, b, t); }
/** The class of a sprite request: req.cls (A's sceneObjClass), else A's classifier, else the object's category. */
function _scatPCls(req) {
  if (req.cls) return req.cls;
  if (typeof sceneObjClass === 'function') { try { const c = sceneObjClass(req.o); if (c) return c; } catch (e) { /* the category */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(req.o) : null;
  return def ? _SCATP_CAT[def.category] || def.category : null;
}
/** Is this scene v2, or a v1 scene that opted in to one of these fx? */
function _scatPV2(C) { return !!(C && C.v === 2 && C.cam); }
function _scatPFx(C, k) { return !!(C && C.fx && C.fx[k] === 2); }
/** A reusable scratch canvas (CPU-backed: it is composited into CPU-backed sprites and bitmaps). */
const _scatPScr = [];
function _scatPScratch(i, w, h) {
  let s = _scatPScr[i];
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (!s || s.c.width < w || s.c.height < h) {
    const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.max(w, s ? s.c.width : 0), Math.max(h, s ? s.c.height : 0)) : Object.assign(document.createElement('canvas'), { width: Math.max(w, s ? s.c.width : 0), height: Math.max(h, s ? s.c.height : 0) });
    s = _scatPScr[i] = { c, x: c.getContext('2d', { willReadFrequently: true }) };
  }
  s.x.setTransform(1, 0, 0, 1, 0, 0); s.x.globalAlpha = 1; s.x.globalCompositeOperation = 'source-over';
  s.x.clearRect(0, 0, w, h);
  return s;
}
function _scatPCanvas(w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
/** The transform from scene units into a layer's group bitmap (device px), and the group. */
function _scatPGroupOf(env, layer) {
  let g = null;
  if (typeof env.bitmapOf === 'function') { try { g = env.bitmapOf(layer); } catch (e) { g = null; } }
  if (!g || !Number.isFinite(g.x)) g = (env.groups || []).find(q => q && q.layers && q.layers.includes(layer)) || g || { x: 0, y: 0 };
  return g;
}
function _scatPTG(env, layer) { const g = _scatPGroupOf(env, layer), gx0 = Number.isFinite(g.x) ? g.x : 0, gy0 = Number.isFinite(g.y) ? g.y : 0; return [env.vs, 0, 0, env.vs, env.ox - gx0, env.oy - gy0]; }
/** The camera of a compiled scene (C.cam), with its focal length. */
function _scatPCam(C) {
  if (typeof sceneRenderCam === 'function') { try { const c = sceneRenderCam(C); if (c && Number.isFinite(c.f)) return c; } catch (e) { /* below */ } }
  const c = C && C.cam; if (!c) return null; if (!c.f) return Object.assign({}, c, { f: 800 / Math.tan((c.fov || 66) * Math.PI / 360) }); return c;
}
/** The screen row (scene units) of flat ground at depth d. */
function _scatPRow(cam, d) { return sceneAtmosProject(cam, 0, Math.max(0.05, d), 0).Y; }
/** The light's sun side in sprite space (1: lit from the right), honouring the placement's flip. */
function _scatPSide(L, flip) { const s = L && L.side ? L.side : 1; return flip ? -s : s; }
/** How much rim light now: backlit, or a golden-hour sun (alt 0..12) on a sky that is not overcast. 0 = none. */
function sceneRimAt(L) {
  if (!L || !(L.alt > -1)) return 0;
  const golden = L.alt < 14 ? _scatPClamp((14 - L.alt) / 9, 0, 1) * _scatPClamp(1 - (L.cover || 0) * 1.1, 0, 1) * 0.9 : 0;
  const b = (L.backlit || 0) > 0.15 ? L.backlit : 0;
  const k = Math.max(b, golden);
  return k < 0.05 ? 0 : Math.round(k * 10) / 10;
}
/** How strong the soft shading is now (0.10 + 0.12 * (1 - cover)), weaker at night and with the sun straight ahead or behind. */
function _scatPShadeK(L) {
  const rel = L && L.sun && Number.isFinite(L.sun.rel) ? L.sun.rel : 90, across = 0.45 + 0.55 * Math.abs(Math.sin(rel * Math.PI / 180));
  return (0.10 + 0.12 * (1 - _scatPClamp(L.cover || 0, 0, 1))) * (1 - 0.8 * _scatPClamp(L.dark || 0, 0, 1)) * across;
}
/** The classes whose facade faces the camera (a building's elevation): they are lit or shaded as a whole by the sun's azimuth. */
const _SCATP_FACADE = new Set(['building', 'structure', 'landmark']);
/**
 * How the sun lights a facade that faces the camera (7.2): +1 the sun straight behind the camera (the facade in full sun),
 * -1 the sun straight ahead (the facade in its own shade), weighted by how much direct sun there is (low sun, cloud, night).
 * Bucketed to 0.1 (part of the sprite key).
 */
function sceneFacadeLight(L) {
  if (!L || !L.sun || !Number.isFinite(L.sun.rel) || !(L.alt > 0)) return 0;
  const sunK = _scatPClamp(L.alt / 5, 0, 1) * (1 - 0.75 * _scatPClamp(L.cover || 0, 0, 1)) * (1 - _scatPClamp(L.dark || 0, 0, 1));
  return Math.round(-Math.cos(L.sun.rel * Math.PI / 180) * sunK * 10) / 10;
}
/** The sun's azimuth relative to the heading in 30-degree buckets (the light key: about every 2 hours). */
function _scatPRel(L) { return L && L.sun && Number.isFinite(L.sun.rel) ? Math.round(L.sun.rel / 30) : 0; }

/* ---------- the sprite pass (7.2) ---------- */
/**
 * Shade and rim one rasterised sprite in place (cx: its 2d context; its canvas in device px). side: 1 lit from the right,
 * -1 from the left (in sprite space). Exposed for tests and for direct items (B).
 */
function sceneAtmosShadeSprite(cx, L, side, o) {
  o = o || {};
  const c = cx.canvas, w = c.width, h = c.height;
  if (!L || w < 3 || h < 6) return false;
  const a = o.shade == null ? _scatPShadeK(L) : o.shade;
  cx.save();
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1;
  // a facade (o.facade, -1 .. 1): in the sun it takes the key light (warm at golden hour), in its own shade a cool shade
  const fa = o.facade || 0;
  if (fa > 0.05) { cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = _scatPRgba(_scatPMix(L.light || '#fff4e0', '#ffffff', 0.25), 0.1 * fa); cx.fillRect(0, 0, w, h); }
  else if (fa < -0.05) { cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = _scatPRgba(_scatPMix('#1a2436', L.shade || '#6a7480', 0.1), 0.3 * -fa); cx.fillRect(0, 0, w, h); }
  if (a > 0.01) {
    const shCol = _scatPMix('#05080d', L.shade || '#6a7480', 0.04);   // near black: source-atop at alpha a multiplies by (1 - a)
    const g = cx.createLinearGradient(side > 0 ? w : 0, 0, side > 0 ? 0 : w, 0);
    g.addColorStop(0, _scatPRgba(shCol, 0)); g.addColorStop(0.45, _scatPRgba(shCol, a * 0.35)); g.addColorStop(1, _scatPRgba(shCol, a));
    cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = g; cx.fillRect(0, 0, w, h);
  }
  const rim = o.rim == null ? sceneRimAt(L) : o.rim;
  // no rim under 24 px (invisible) or over 300,000 px (a whole facade: the edge reads as a line, and it costs the bake 5 ms)
  if (rim > 0 && h >= 24 && w * h <= 300000) {
    // the sprite's alpha, shifted away from the sun, cut from a copy filled with the low sun's colour: a thin lit edge
    const off = _scatPClamp(h / 50, 1.5, 3.5), s = _scatPScratch(0, w, h), sx = s.x;
    sx.drawImage(c, 0, 0);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = _scatPMix((L.alt < 12 ? L.lowSun : L.light) || '#ffe6b8', '#fff6e0', 0.3); sx.fillRect(0, 0, w, h);
    sx.globalCompositeOperation = 'destination-out'; sx.drawImage(c, -side * off, off * 0.6);
    sx.globalCompositeOperation = 'source-over';
    cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = _scatPClamp(0.55 * rim * (o.rimK || 1), 0, 0.6);
    cx.drawImage(s.c, 0, 0, w, h, 0, 0, w, h);
  }
  cx.restore();
  return true;
}

/**
 * An object's 'lit' part after real dusk, reshaped so light reads as light (7.3), in place (cx: the rasterised lit sprite;
 * req: the sprite request with k, x0, y0 and shapes). o.lamp: a lamp whose ground pool the pass draws itself (in perspective,
 * with an inverse-square falloff): the object's own pool, everything in the bottom eighth of its height, is dropped and its
 * head's glow kept. o.flood: a floodlit facade: the light is softened (blurred), kept to the facade (never a beam into the sky
 * or across the ground), and turned into a wash from below that fades out two thirds of the way up, so the building stays a
 * dark mass with a glow at its foot.
 */
function sceneAtmosLitSprite(cx, req, o) {
  const c = cx.canvas, w = c.width, h = c.height, sh = req && req.shapes;
  if (!sh || !sh.box || !(req.k > 0) || w < 2 || h < 2 || !(o.lamp || o.flood)) return false;
  const k = req.k, Y = (y) => (y - req.y0) * k, top = Math.min(-1, sh.box[1]);
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1;
  if (o.lamp) {
    const y1 = Y(top * 0.13), y0 = Y(top * 0.2), g = cx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = g; cx.fillRect(0, Math.max(0, y0), w, h);
  } else {
    // 1. soften: no hard edge survives
    const b = _scatPClamp(0.03 * Math.max(w, h), 2, 18), s = _scatPScratch(1, w, h);
    if (typeof s.x.filter === 'string') {
      s.x.filter = `blur(${Math.round(b * 10) / 10}px)`; s.x.drawImage(c, 0, 0); s.x.filter = 'none';
      cx.clearRect(0, 0, w, h); cx.drawImage(s.c, 0, 0, w, h, 0, 0, w, h);
    }
    // 2. only on the facade: the object's own silhouette (every part but 'lit')
    if (typeof _sccPath === 'function') {
      const m = _scatPScratch(2, w, h), mx = m.x;
      mx.setTransform(k, 0, 0, k, -req.x0 * k, -req.y0 * k); mx.fillStyle = '#000'; mx.strokeStyle = '#000';
      for (const p of sh.order) if (p !== 'lit') for (const s0 of sh.parts[p] || []) {
        if (s0.m) { mx.save(); mx.transform(s0.m[0], s0.m[1], s0.m[2], s0.m[3], s0.m[4], s0.m[5]); }
        const path = _sccPath(s0.d);
        if (s0.f) mx.fill(path);
        if (s0.s && (s0.w || 1) > 1.5) { mx.lineWidth = s0.w; mx.stroke(path); }
        if (s0.m) mx.restore();
      }
      cx.globalCompositeOperation = 'destination-in'; cx.drawImage(m.c, 0, 0, w, h, 0, 0, w, h);
    }
    // 3. a wash from below: strongest at the foot, gone two thirds of the way up
    const g = cx.createLinearGradient(0, Y(0), 0, Y(top * 0.7));
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.35, 'rgba(0,0,0,0.45)'); g.addColorStop(0.75, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = g; cx.fillRect(0, 0, w, h);
  }
  cx.restore();
  return true;
}

/* ---------- night lights (7.3) ---------- */
/** A lamp pool: a circle r metres across round (x, d) on the ground, as a perspective ellipse with a radial falloff. */
function _scatPPool(gx, cam, l, alpha) {
  const dn = Math.max(0.6, l.d - l.r), df = l.d + l.r, yN = _scatPRow(cam, dn), yF = _scatPRow(cam, df), c = sceneAtmosProject(cam, l.x, l.d, 0);
  // a little rounder than the strict projection from eye height: a pool, never a thin bar
  const rx = l.r * c.k, ry = Math.max(0.5, (yN - yF) / 2, rx * 0.11), cy = _scatPClamp(c.Y, yF, yN);   // centred under the head (the far half is shorter in perspective)
  if (rx < 1.5) return 0;
  gx.save();
  gx.translate(c.X, cy); gx.scale(1, ry / rx);
  // a point light h metres up: the ground's light falls as (1 + (rho / h)^2)^-1.5 (bright under the lamp, soft long tail),
  // eased to nothing at r
  const g = gx.createRadialGradient(0, 0, 0, 0, 0, rx), hh = Math.max(1.5, Math.min(l.h || 5, 7));
  for (const u of [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1]) { const rho = u * l.r, e = Math.pow(1 + (rho / hh) * (rho / hh) * 2.2, -1.5) * (1 - u * u * (3 - 2 * u)); g.addColorStop(u, _scatPRgba(l.col, e)); }
  gx.globalAlpha = alpha; gx.fillStyle = g; gx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  gx.restore();
  return 1;
}
/** Window or shopfront spill: a trapezoid of light on the ground in front of the facade (x, d), w wide, r metres deep. */
function _scatPSpill(gx, cam, l, alpha) {
  const w = Math.max(0.6, l.w || 3), dep = Math.max(0.8, l.r || 2.4), dNear = Math.max(0.6, l.d - dep);
  const p = [sceneAtmosProject(cam, l.x - w / 2, l.d, 0), sceneAtmosProject(cam, l.x + w / 2, l.d, 0), sceneAtmosProject(cam, l.x + w * 0.6, dNear, 0), sceneAtmosProject(cam, l.x - w * 0.6, dNear, 0)];
  if (Math.abs(p[1].X - p[0].X) < 1) return 0;
  const g = gx.createLinearGradient(0, p[0].Y, 0, p[2].Y);
  g.addColorStop(0, _scatPRgba(l.col, 1)); g.addColorStop(1, _scatPRgba(l.col, 0));
  gx.globalAlpha = alpha; gx.fillStyle = g;
  gx.beginPath(); gx.moveTo(p[0].X, p[0].Y); for (let i = 1; i < 4; i++) gx.lineTo(p[i].X, p[i].Y); gx.closePath(); gx.fill();
  return 1;
}
/** A halo round a lamp head or lit sign (screen point hx, hy; radius in scene units). */
function _scatPHalo(gx, x, y, r, col, alpha) {
  if (r < 1) return 0;
  const g = gx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, _scatPRgba(col, 0.9)); g.addColorStop(0.25, _scatPRgba(col, 0.35)); g.addColorStop(1, _scatPRgba(col, 0));
  gx.globalAlpha = alpha; gx.fillStyle = g; gx.fillRect(x - r, y - r, 2 * r, 2 * r);
  return 1;
}

/**
 * What hides a light inside its own layer: the layer's sprites are drawn before the 'over' stage, so a halo or a streak of a
 * lamp BEHIND a nearer building of the same layer would paint over that building. -> Map(light -> { head, foot }): true where
 * a nearer opaque placement (building, structure, landmark, a tree's crown) of the same layer covers the lamp head / its foot.
 */
function sceneLightHidden(C, lights) {
  const out = new Map(), blockers = [];
  if (!C || !C.items || !lights || !lights.length) return out;
  const OPAQUE = new Set(['building', 'structure', 'landmark', 'tree']);
  C.items.forEach((it, i) => {
    if (!it || (it.strip >= 0 && it.strip != null)) return;
    const def = typeof sceneObj === 'function' ? sceneObj(it.o) : null, cls = it.cls || (def && (_SCATP_CAT[def.category] || def.category));
    if (!OPAQUE.has(cls)) return;
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(it.o, it.v, it.season) : null;
    if (!sh) return;
    const b = sh.box, s = it.s == null ? 1 : it.s, box = it.flip ? [it.x - b[2] * s, it.y + b[1] * s, it.x - b[0] * s, it.y + b[3] * s] : [it.x + b[0] * s, it.y + b[1] * s, it.x + b[2] * s, it.y + b[3] * s];
    const d = Number.isFinite(it.dz) ? it.dz : it.g && Number.isFinite(it.g.d) ? it.g.d : null;
    // a tree hides with its crown only (the trunk is thin): the upper 60 % of its box, inset
    if (cls === 'tree') { const w = box[2] - box[0]; box[0] += w * 0.15; box[2] -= w * 0.15; box[3] = box[1] + (box[3] - box[1]) * 0.6; }
    blockers.push({ i, layer: it.layer, d, box });
  });
  for (const l of lights) {
    let head = false, foot = false;
    for (const b of blockers) {
      if (b.i === l.i || b.layer !== l.layer || b.d == null || !(b.d < l.d - 0.3)) continue;
      const inb = (x, y) => x >= b.box[0] && x <= b.box[2] && y >= b.box[1] && y <= b.box[3];
      if (!head && inb(l.hx, l.hy)) head = true;
      if (!foot && inb(l.kind === 'spill' ? l.hx : l.X, l.Y - 1)) foot = true;
      if (head && foot) break;
    }
    out.set(l, { head, foot });
  }
  return out;
}

/* ---------- fog banks (8.4) ---------- */
/**
 * The fog-bank plan for a compiled v2 scene and a light: up to wx.banks banks at about 60, 150, 400 (and 30) metres, each a
 * soft horizontal band round its ground row, `h` metres tall; pure. -> [{ d, y, hh, op, speed, seed }] (scene units).
 */
function sceneFogBanks(C, L) {
  const wx = L && L.wx, n = wx ? Math.min(4, wx.banks | 0) : 0;
  if (!n) return [];
  const cam = _scatPCam(C), out = [], D = [150, 60, 400, 30].slice(0, n).sort((a, b) => b - a);
  const hor = cam ? cam.horizon : (C && C.view && C.view.horizon) || 560;
  for (const d of D) {
    const y = cam ? _scatPRow(cam, d) : hor + 8 + 2400 / d, k = cam ? cam.f / d : 1600 / d;
    const hh = _scatPClamp(5 * k, 10, 110);
    out.push({ d, y: Math.round(y * 10) / 10, hh: Math.round(hh * 10) / 10, op: Math.round((0.28 + 0.22 * (wx.fog || 0.5)) * (d < 50 ? 0.7 : 1) * 100) / 100, speed: (L.wind || 1) * 4 * (d < 100 ? 1.4 : d < 300 ? 1 : 0.6), seed: d });
  }
  return out;
}
/** One bank's sprite: soft lobes along a band, periodic over `per` device px so the drift can wrap with no seam. */
function _scatPBankSprite(b, col, vs, W) {
  const per = Math.ceil(W * 0.75), hh = b.hh * vs, c = _scatPCanvas(per * 2, hh * 2.2), cx = c.getContext('2d', { willReadFrequently: true });
  const r = sceneRnd(sceneHash('fogbank|' + b.seed)), cy = hh * 1.1;
  const g0 = cx.createLinearGradient(0, cy - hh, 0, cy + hh);
  g0.addColorStop(0, _scatPRgba(col, 0)); g0.addColorStop(0.5, _scatPRgba(col, 0.55)); g0.addColorStop(1, _scatPRgba(col, 0));
  cx.fillStyle = g0; cx.fillRect(0, cy - hh, per * 2, 2 * hh);
  for (let i = 0; i < 9; i++) {
    const x = r() * per, rx = per * (0.08 + r() * 0.12), ry = hh * (0.35 + r() * 0.4), y = cy + (r() - 0.6) * hh * 0.5, a = 0.25 + r() * 0.3;
    for (const ox of [-per, 0, per, 2 * per]) {
      cx.save(); cx.translate(x + ox, y); cx.scale(1, ry / rx);
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, _scatPRgba(col, a)); g.addColorStop(1, _scatPRgba(col, 0));
      cx.fillStyle = g; cx.fillRect(-rx, -rx, 2 * rx, 2 * rx); cx.restore();
    }
  }
  return { c, per, top: (b.y - b.hh * 1.1) * vs };
}
function _scatPBankDraw(ctx, env, B, t, below) {
  const st = env._scat;
  if (!st || !st.banks.length) return 0;
  let n = 0;
  for (const b of B) {
    const s = b.spr, top = s.top + env.oy;
    if (below != null && top >= below) continue;
    const x = -(((b.speed * t * env.vs) % s.per) + s.per) % s.per;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = b.op;
    ctx.drawImage(s.c, Math.round(x), Math.round(top));
    n++;
  }
  ctx.globalAlpha = 1;
  return n;
}

/* ---------- the pass ---------- */
const sceneAtmosPass = {
  id: 'atmos',
  // by stage (V2 13.1): prebake 20 (after the weather's), sprite 10 (before snow caps), ground 15 (after wet and snow), pools and
  // spill under the objects at 35 (after water 20 and shadows 30), halos over them at 40, the veil at 70, fog banks at 60
  order: { prebake: 20, sprite: 10, ground: 15, 'layer:under': 35, 'layer:over': 40, group: 70, frameGroup: 60, framePost: 60, default: 40 },
  applies(C) { return _scatPV2(C) || _scatPFx(C, 'atmos') || _scatPFx(C, 'weather'); },
  /** The light key: the sun's side in 30-degree buckets, the rim, the atmosphere (V), lamps and the window share. */
  key(L, C) {
    if (!L) return '';
    const parts = ['a' + _scatPRel(L), sceneRimAt(L)];
    if (_scatPV2(C)) { const a = L.atmos || {}; parts.push(Math.round((a.V || 0) / 50), L.lamps ? 1 : 0, Math.round(sceneWindowShare(L) * 10)); }
    if (L.wx && L.wx.banks) parts.push('b' + L.wx.banks);
    return parts.join(':');
  },
  /** Shaded classes: the flip bit and the shading (the sprite is shaded for its on-screen orientation). */
  spriteKey(L, C, req) {
    if (!L || !req || !(_scatPV2(C) || _scatPFx(C, 'atmos'))) return '';
    if (req.part === 'lit') return 'lit2';
    const cls = _scatPCls(req), def = typeof sceneObj === 'function' ? sceneObj(req.o) : null;
    if (!_SCATP_SHADE.has(cls) || (def && def.shade === false)) return '';
    return 'sh' + _scatPRel(L) + (req.flip ? 'f' : '') + 'r' + sceneRimAt(L) + 'k' + Math.round(_scatPShadeK(L) * 20) + (_SCATP_FACADE.has(cls) ? 'fa' + sceneFacadeLight(L) : '');
  },
  prebake(env) {
    const C = env.C, L = env.L, st = env._scat = { lights: [], banks: [], pools: 0, halos: 0, spill: 0, hazed: 0, lifted: 0 };
    if (_scatPV2(C)) {
      const cam = _scatPCam(C);
      const lights = C.lights && C.lights.length ? C.lights : (typeof sceneLightsOf === 'function' ? sceneLightsOf(C) : []);
      st.lights = lights;
      st.hid = sceneLightHidden(C, lights);
      if (Array.isArray(env.lights)) for (const l of lights) env.lights.push(l);
      const n = C.items.length;
      if (!env.itemHaze || env.itemHaze.length !== n) env.itemHaze = new Float32Array(n);
      if (!env.itemLift || env.itemLift.length !== n) env.itemLift = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const it = C.items[i];
        let d = Number.isFinite(it.dz) ? it.dz : it.g && Number.isFinite(it.g.d) ? it.g.d : null;
        if (d == null && cam && it.y > cam.horizon + 0.5) d = cam.f * cam.eye / (it.y - cam.horizon);
        // a placement with no depth (a pixel placement in the sky): the layer's haze as authored, else none
        const hz = d != null ? sceneHazeAt(d, C.atmos, L) : (it.haze || 0);
        env.itemHaze[i] = Math.round(hz * 10) / 10;
        if (env.itemHaze[i] > 0) st.hazed++;
        const lift = L && L.lamps ? sceneLiftAt(it, lights, L, cam) : 0;
        env.itemLift[i] = lift;
        if (lift) st.lifted++;
      }
    }
    // fog banks: v2 (frameGroup) and v1 with fx (framePost)
    const B = sceneFogBanks(C, L);
    if (B.length && env.W) {
      const col = _scatPMix((L.atmos && L.atmos.col) || L.haze || '#dfe4e6', '#1e2432', _scatPClamp(L.dark || 0, 0, 1) * 0.7);
      st.banks = B.map(b => Object.assign({}, b, { spr: _scatPBankSprite(b, col, env.vs, env.W) }));
      for (const b of st.banks) {
        if (typeof env.keep === 'function') env.keep({ c: b.spr.c, bytes: b.spr.c.width * b.spr.c.height * 4 });
        try { b.spr.c.getContext('2d').getImageData(0, 0, 1, 1); } catch (e) { /* rasterised in the bake, not on the first frame */ }
      }
    }
  },
  sprite(env, cx, req) {
    const C = env.C, L = env.L;
    if (!L || !req || !(_scatPV2(C) || _scatPFx(C, 'atmos'))) return;
    const cls = _scatPCls(req), def = typeof sceneObj === 'function' ? sceneObj(req.o) : null;
    if (req.part === 'lit') {
      // a lamp (a light source the pass pools itself): keep its head's glow, drop its own ground pool; a facade: a soft wash
      const st = env._scat, lamp = !!(st && st.lights && st.lights.some(l => l.i === req.i && l.kind !== 'spill'));
      sceneAtmosLitSprite(cx, req, { lamp, flood: !lamp && _SCATP_FACADE.has(cls) });
      return;
    }
    if (!_SCATP_SHADE.has(cls) || (def && def.shade === false)) return;
    sceneAtmosShadeSprite(cx, L, _scatPSide(L, req.flip), _SCATP_FACADE.has(cls) ? { facade: sceneFacadeLight(L) } : undefined);
  },
  /** v2: the ground haze the weather adds beyond the compiled surfaces' own (fog and mist lower V; the compile used C.atmos). */
  ground(env, layer, gx) {
    const C = env.C, L = env.L;
    if (!_scatPV2(C) || !L || !L.atmos || !C.atmos) return;
    const cam = _scatPCam(C);
    if (!cam || L.atmos.V >= C.atmos.V * 0.95) return;
    const paths = C.ground.filter(g => g.layer === layer);
    if (!paths.length || typeof _sccPath !== 'function') return;
    const clip = new Path2D();
    let y0 = Infinity, y1 = -Infinity;
    for (const g of paths) { clip.addPath(_sccPath(g.d)); const b = scenePathBox(g.d); if (b) { y0 = Math.min(y0, b[1]); y1 = Math.max(y1, b[3]); } }
    y0 = Math.max(y0, cam.horizon + 0.5); y1 = Math.min(y1, 900);
    if (!(y1 > y0)) return;
    const extra = (Y) => { const d = cam.f * cam.eye / Math.max(0.5, Y - cam.horizon); return _scatPClamp(sceneHazeAt(d, null, L) - sceneHazeAt(d, C.atmos, null), 0, 1); };
    const g = gx.createLinearGradient(0, y0, 0, y1);
    for (let k = 0; k <= 6; k++) { const Y = y0 + (y1 - y0) * k / 6; g.addColorStop(k / 6, _scatPRgba(L.atmos.col, extra(Y))); }
    gx.save(); gx.setTransform(..._scatPTG(env, layer)); gx.globalCompositeOperation = 'source-over'; gx.globalAlpha = 1;
    gx.fillStyle = g; gx.fill(clip);
    gx.restore();
  },
  layer(env, layer, gx, when) {
    const C = env.C, L = env.L, st = env._scat;
    if (!_scatPV2(C) || !L || !st || !st.lights.length || !(L.lamps || L.windows)) return;
    const cam = _scatPCam(C), dark = _scatPClamp(L.dark == null ? 1 : L.dark, 0, 1);
    gx.save(); gx.setTransform(..._scatPTG(env, layer)); gx.globalCompositeOperation = 'lighter';
    const mine = st.lights.filter(l => l.layer === layer);
    if (when === 'under') {
      for (const l of mine) {
        if (st.hid && st.hid.get(l) && st.hid.get(l).foot && l.kind === 'spill') continue;
        if (l.kind === 'lamp' && L.lamps) st.pools += _scatPPool(gx, cam, l, 0.45 * Math.max(0.35, dark));
        else if (l.kind === 'spill' && L.windows) st.spill += _scatPSpill(gx, cam, l, 0.25 * _scatPClamp(sceneWindowShare(L) / 0.55, 0.3, 1.2) * Math.max(0.4, dark));
      }
    } else if (when === 'over') {
      for (const l of mine) {
        if (l.kind === 'spill' || !L.lamps || (st.hid && st.hid.get(l) && st.hid.get(l).head)) continue;
        // an object with its own 'lit' part (a library lamp's halo) carries its halo already
        const it = C.items[l.i];
        if (it && it.lit && l.kind === 'lamp') continue;
        const k = cam.f / Math.max(0.5, l.d), r = Math.max(4, (l.kind === 'halo' ? 0.7 : 1.1) * k);
        st.halos += _scatPHalo(gx, l.hx, l.hy, r, l.col, 0.55 * Math.max(0.35, dark));
      }
    }
    gx.restore();
  },
  /** v2: a subtle veil of the haze colour over a bitmap that holds only far content (at most 0.12, never on near things). */
  group(env, grp) {
    const C = env.C, L = env.L;
    if (!_scatPV2(C) || !L || !L.atmos || !grp || !grp.c) return;
    const cam = _scatPCam(C), bands = cam.bands || [];
    const near = Math.min(...grp.layers.map(l => { const b = bands.find(q => q.i === l); return b && Number.isFinite(b.d0) ? b.d0 : 0; }));
    if (!(near >= 150)) return;
    const a = Math.min(0.12, 0.6 * sceneHazeAt(Math.max(near, 800), null, L));
    if (a < 0.01) return;
    const gx = grp.c.getContext('2d'), yB = (_scatPRow(cam, near) * env.vs + env.oy) - grp.y, yH = (cam.horizon * env.vs + env.oy) - grp.y;
    const g = gx.createLinearGradient(0, Math.min(yH, yB - 1), 0, yB);
    g.addColorStop(0, _scatPRgba(L.atmos.col, a)); g.addColorStop(1, _scatPRgba(L.atmos.col, a * 0.3));
    gx.save(); gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-atop'; gx.fillStyle = g; gx.fillRect(0, 0, grp.w || grp.c.width, Math.max(0, yB)); gx.restore();
  },
  /**
   * v2: the fog banks in true depth: a bank is drawn with the group whose near edge is the largest at or before its depth
   * (after that group's bitmap, before the nearer bitmaps), so nearer things stand crisp in front of it.
   */
  frameGroup(env, grp, ctx, t, below) {
    const st = env._scat, C = env.C;
    if (!st || !st.banks.length || !_scatPV2(C)) return 0;
    const groups = env.groups || [], gi = groups.indexOf(grp);
    if (gi < 0) return 0;
    st.fgSeen = true;
    if (!st.owner) {
      const bands = (_scatPCam(C).bands) || [];
      const nears = groups.map(g => Math.min(...(g.layers || [0]).map(l => { const b = bands.find(q => q.i === l); return b && Number.isFinite(b.d0) ? b.d0 : 0; })));
      st.owner = st.banks.map(b => { let best = -1; nears.forEach((n, i) => { if (n <= b.d && (best < 0 || n >= nears[best])) best = i; }); return best < 0 ? groups.length - 1 : best; });
    }
    return _scatPBankDraw(ctx, env, st.banks.filter((b, i) => st.owner[i] === gi), env.still ? 0 : t, below);
  },
  /** v1 with fx (no camera, no depth): the fog banks over the frame; v2 only when the renderer has no frameGroup stage. */
  framePost(env, ctx, t) {
    const st = env._scat;
    if (!st || !st.banks.length || (_scatPV2(env.C) && st.fgSeen)) return 0;
    return _scatPBankDraw(ctx, env, st.banks, env.still ? 0 : t, null);
  },
  stats(env) { const st = env._scat || {}; return { lights: (st.lights || []).length, pools: st.pools || 0, halos: st.halos || 0, spill: st.spill || 0, hazed: st.hazed || 0, lifted: st.lifted || 0, banks: (st.banks || []).length }; },
};

/* ---------- vehicle lights for the flow pass (7.3; D draws them, one draw each) ---------- */
const _scatPHead = new Map();
/**
 * Pre-rendered vehicle lights at k device px per metre (bucketed to quarter octaves), for a view: 'side' (a headlight cone
 * along the ground ahead and a red tail glow), 'front' (two lamps and their glare), 'rear' (two red tail lamps).
 * -> { head, tail, k }; each part { c, x0, y0, w, h } (device px; x0, y0: the canvas's top-left from the lamp anchor, which
 * is the front lamp in side view (draw mirrored for a vehicle facing left) and the midpoint between the lamps otherwise).
 */
function sceneHeadlightSprite(k, view) {
  const kb = typeof sceneScaleBucket === 'function' ? sceneScaleBucket(Math.max(0.5, k)) : Math.max(0.5, k), v = ['front', 'rear'].includes(view) ? view : 'side', key = v + '|' + kb;
  let out = _scatPHead.get(key);
  if (out) return out;
  if (_scatPHead.size > 64) _scatPHead.clear();
  const glow = (r, col, stops) => {
    const R = Math.max(2, r * kb), c = _scatPCanvas(2 * R, 2 * R), cx = c.getContext('2d'), g = cx.createRadialGradient(R, R, 0, R, R, R);
    for (const [o, a] of stops) g.addColorStop(o, _scatPRgba(col, a));
    cx.fillStyle = g; cx.fillRect(0, 0, 2 * R, 2 * R);
    return { c, x0: -R, y0: -R, w: 2 * R, h: 2 * R };
  };
  const pair = (gap, r, col, stops) => {
    const R = Math.max(2, r * kb), G = gap * kb / 2, c = _scatPCanvas(2 * (G + R), 2 * R), cx = c.getContext('2d');
    for (const x of [R, R + 2 * G]) { const g = cx.createRadialGradient(x, R, 0, x, R, R); for (const [o, a] of stops) g.addColorStop(o, _scatPRgba(col, a)); cx.fillStyle = g; cx.fillRect(x - R, 0, 2 * R, 2 * R); }
    return { c, x0: -(G + R), y0: -R, w: 2 * (G + R), h: 2 * R };
  };
  if (v === 'side') {
    // the cone: from the lamp (0.65 m up) forward 11 m, spreading down onto the ground; brightest at the lamp
    const L = 11 * kb, H = 1.6 * kb, up = 0.55 * kb, c = _scatPCanvas(L + 0.6 * kb, H + up), cx = c.getContext('2d'), ax = 0.3 * kb, ay = up;
    const g = cx.createLinearGradient(ax, 0, ax + L, 0);
    g.addColorStop(0, 'rgba(255,244,214,0.55)'); g.addColorStop(0.25, 'rgba(255,240,205,0.28)'); g.addColorStop(1, 'rgba(255,236,200,0)');
    cx.fillStyle = g; cx.beginPath();
    cx.moveTo(ax, ay - 0.06 * kb); cx.lineTo(ax + L, ay - 0.45 * kb); cx.lineTo(ax + L, ay + 0.65 * kb); cx.lineTo(ax + L * 0.7, ay + 0.65 * kb); cx.lineTo(ax, ay + 0.06 * kb); cx.closePath(); cx.fill();
    const h2 = cx.createRadialGradient(ax, ay, 0, ax, ay, 0.5 * kb); h2.addColorStop(0, 'rgba(255,250,232,0.95)'); h2.addColorStop(1, 'rgba(255,240,210,0)');
    cx.fillStyle = h2; cx.fillRect(0, 0, kb, c.height);
    out = { head: { c, x0: -ax, y0: -ay, w: c.width, h: c.height }, tail: glow(0.45, '#ff2a1c', [[0, 0.9], [0.3, 0.45], [1, 0]]), k: kb };
  } else if (v === 'front') out = { head: pair(1.4, 0.7, '#fff6de', [[0, 1], [0.12, 0.8], [0.4, 0.25], [1, 0]]), tail: null, k: kb };
  else out = { head: null, tail: pair(1.4, 0.45, '#ff2a1c', [[0, 0.95], [0.25, 0.5], [1, 0]]), k: kb };
  _scatPHead.set(key, out);
  return out;
}
/** Draw one light sprite at the anchor (X, Y device px), mirrored for dir < 0, added ('lighter'). -> 1 draw (0 when nothing). */
function sceneHeadlightDraw(ctx, spr, X, Y, dir, alpha) {
  if (!spr || !spr.c) return 0;
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.setTransform(dir < 0 ? -1 : 1, 0, 0, 1, X, Y);
  ctx.drawImage(spr.c, spr.x0, spr.y0, spr.w, spr.h);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
  return 1;
}
/** The spill strip a lit tram, train or bus throws on the ground alongside (lenM long, about 1.6 m deep): anchor = its foot centre. */
function sceneLitSpillSprite(k, lenM) {
  const kb = typeof sceneScaleBucket === 'function' ? sceneScaleBucket(Math.max(0.5, k)) : k, len = Math.max(2, lenM || 12), key = 'spill|' + kb + '|' + Math.round(len);
  let out = _scatPHead.get(key);
  if (out) return out;
  const w = len * kb, h = Math.max(2, 0.9 * kb), c = _scatPCanvas(w + 4, h), cx = c.getContext('2d');
  const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,226,170,0.42)'); g.addColorStop(1, 'rgba(255,226,170,0)');
  cx.fillStyle = g; cx.fillRect(2, 0, w, h);
  out = { c, x0: -(w + 4) / 2, y0: 0, w: w + 4, h };
  _scatPHead.set(key, out);
  return out;
}

if (typeof sceneRenderPassDefine === 'function') { try { sceneRenderPassDefine(sceneAtmosPass); } catch (e) { if (typeof console !== 'undefined') console.warn('atmos pass not registered:', e && e.message); } }
