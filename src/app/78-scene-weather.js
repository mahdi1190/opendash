/* ============================================================
   SCENE ENGINE v2: the weather pass (docs/dev/SCENE_ENGINE_V2.md 8; builder C). Browser only.
   It plugs into the pass registry (78-scene-0pass.js, builder B: sceneRenderPassDefine) and never edits the renderer.
   The weather comes resolved in the light (sceneLightV2: L.wx = sceneWeather(...)); a change re-bakes (the light key).

     prebake     the puddles (scenePuddles, seeded) handed to the water pass as extra regions (env.waterExtra); the rain,
                 snow and ring particle sets; the lightning schedule
     sprite      the snow cap (the sprite's top edges white by snowDepth) on buildings, structures, landmarks, trees, shrubs,
                 street furniture and vehicles; a thin rime of frost on trees, shrubs and plants
     ground      wet ground (hard surfaces darker, a faint sky tint, more sky toward the far edge), snow lying (full, slush
                 with tyre tracks, patchy under a canopy), frost on grass-like ground; the puddles too when no water pass
     layer over  the light streaks on wet ground straight below every lamp, lit window and a backlit low sun
     frameGroup  rain rings on the puddles and on rippling water (at most 20)
     framePost   v2 falling rain (two depth tiers, slanted by the wind, one path each) and snow (two tiers, batched), and the
                 lightning flash of a thunderstorm (never in stills, captures or under reduced motion)
   v1 scenes: only with fx { weather: 2 }: snow caps, wet ground (on grey fills: tarmac, paving); v1 keeps its own rain and snow.
   Private names: _scwx* (shared with 70-scene-1weather.js; this file uses _scwxP*).
   ============================================================ */
/** The surface table's weather columns (V2 3.1) when the ground file (A) is not loaded: [wet, snow, grassy]. */
const _SCWXP_KINDS = {
  road: [0.8, 'slush'], parking: [0.7, 'slush'], driveway: [0.6, 'slush'], track: [0.3, 'full'], pavement: [0.6, 'slush'], plaza: [0.7, 'slush'], platform: [0.6, 'slush'],
  path: [0.3, 'full'], towpath: [0.3, 'full'], cycleway: [0.5, 'slush'], steps: [0.5, 'full'], bridge: [0.6, 'full'], rail: [0.2, 'full'], tramway: [0.8, 'slush'],
  grass: [0.2, 'full', 1], lawn: [0.2, 'full', 1], park: [0.2, 'full', 1], verge: [0.2, 'full', 1], field: [0.1, 'full', 1], meadow: [0.1, 'full', 1], heath: [0.1, 'full', 1],
  wood: [0.1, 'partial', 1], garden: [0.2, 'full', 1], bank: [0.4, 'full', 1], reedbed: [0.6, 'partial', 1], beach: [0.5, 'full'], sand: [0.5, 'full'], shingle: [0.5, 'full'],
  rock: [0.4, 'full'], mud: [0.9, 'full'], edge: [0.5, 'full'], rooftop: [0.4, 'full'], plot: [0.2, 'full'],
};
const _SCWXP_HARD = new Set(['road', 'parking', 'driveway', 'pavement', 'plaza', 'platform', 'cycleway', 'steps', 'bridge', 'tramway', 'rock', 'edge', 'rooftop']);
const _SCWXP_CAP = new Set(['building', 'structure', 'landmark', 'tree', 'shrub', 'street', 'vehicle', 'car', 'bus', 'tram', 'train', 'tractor', 'bike', 'boat', 'rail', 'rock']);
const _SCWXP_RIME = new Set(['tree', 'shrub', 'cover', 'plant']);
const _scwxPClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function _scwxPRgba(hex, a) { const v = typeof _scHex === 'function' ? _scHex(hex) : [255, 255, 255]; return `rgba(${v[0]},${v[1]},${v[2]},${Math.round(_scwxPClamp(a, 0, 1) * 1000) / 1000})`; }
function _scwxPMix(a, b, t) { return typeof _scMixHex === 'function' ? _scMixHex(a, b, t) : a; }
/** The weather columns of a surface kind: A's SCENE_SURFACE_KINDS when loaded, else the table above. -> { wet, snow, grassy, hard } */
function sceneWeatherSurface(kind) {
  let K = null;
  try { K = typeof SCENE_SURFACE_KINDS !== 'undefined' && SCENE_SURFACE_KINDS ? SCENE_SURFACE_KINDS[kind] : null; } catch (e) { K = null; }
  const F = _SCWXP_KINDS[kind] || [0.2, 'full'];
  const wet = K && Number.isFinite(K.wet) ? K.wet : F[0], snow = K && typeof K.snow === 'string' ? K.snow : F[1];
  const flags = (K && K.flags) || {};
  return { wet, snow, grassy: !!(F[2] || flags.plant || (K && K.plant)), hard: !!(flags.hard || (K && K.hard) || _SCWXP_HARD.has(kind)) };
}
/** The resolved weather of a bake: L.wx (sceneLightV2), else resolved here from the compiled input. */
function _scwxPWx(env) {
  const L = env.L;
  if (L && L.wx) return L.wx;
  if (typeof sceneWeather !== 'function') return null;
  return sceneWeather(_scwxInputOf(env.C), L, {});
}
function _scwxPV2(C) { return !!(C && C.v === 2 && C.cam); }
function _scwxPFx(C) { return !!(C && C.fx && C.fx.weather === 2); }
function _scwxPCls(req) {
  if (req.cls) return req.cls;
  if (typeof sceneObjClass === 'function') { try { const c = sceneObjClass(req.o); if (c) return c; } catch (e) { /* the category */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(req.o) : null;
  return def ? ({ plant: 'shrub', ground: 'cover', vehicle: 'vehicle', prop: 'street' })[def.category] || def.category : null;
}
const _scwxPq = (v, s) => Math.round((v || 0) / s);
/** Is the frame a still, a capture or under reduced motion? (no lightning then) */
function _scwxPQuiet(env) {
  if (env.still) return true;
  if (typeof window !== 'undefined' && window.__sceneOpts) return true;
  try { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/* ---------- sprite passes: snow cap, frost rime (8.3, 8.4) ---------- */
/**
 * The top edges of a rasterised sprite turned white (snow) or rimed (frost), in place: the sprite's alpha shifted DOWN by
 * `off` device px is cut from a copy filled with `col`; what remains (the top edges) is laid on source-atop at `alpha`.
 */
function sceneWeatherCapSprite(cx, col, alpha, off) {
  const c = cx.canvas, w = c.width, h = c.height;
  if (w < 3 || h < 4 || !(alpha > 0.01)) return false;
  const s = _scatPScratch(1, w, h), sx = s.x;
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, w, h);
  sx.globalCompositeOperation = 'destination-out'; sx.drawImage(c, 0, off);
  sx.globalCompositeOperation = 'source-over';
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = _scwxPClamp(alpha, 0, 1);
  cx.drawImage(s.c, 0, 0, w, h, 0, 0, w, h);
  cx.restore();
  return true;
}

/* ---------- ground: wet, snow, frost (8.2 to 8.4) ---------- */
/** The x span of a ground polygon (metres) at depth d, or null. */
function _scwxPSpan(poly, d) {
  let a = Infinity, b = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, d1] = poly[j], [x2, d2] = poly[i];
    if ((d1 <= d && d2 > d) || (d2 <= d && d1 > d)) { const x = x1 + (x2 - x1) * (d - d1) / (d2 - d1); if (x < a) a = x; if (x > b) b = x; }
  }
  return a < b ? [a, b] : null;
}
/** Two darker tyre tracks per lane on a slushy road: projected quads along fractions of the road's span. */
function _scwxPTracks(gx, cam, poly, col, alpha) {
  const ds = poly.map(p => p[1]), xs = poly.map(p => p[0]), d0 = Math.max(Math.min(...ds), (cam.dMin || 3) * 0.9), d1 = Math.min(Math.max(...ds), 160);
  if (!(d1 > d0)) return 0;
  const N = 28, fr = [0.16, 0.32, 0.68, 0.84], tw = 0.32;
  gx.fillStyle = _scwxPRgba(col, 1); gx.globalAlpha = alpha;
  gx.beginPath();
  let any = 0;
  // a road across the view (much wider than it is deep): the tracks run along x at fractions of its depth span
  const xw = Math.max(...xs) - Math.min(...xs), dw = Math.max(...ds) - Math.min(...ds);
  if (xw > 3 * dw) {
    const x0 = Math.max(Math.min(...xs), -400), x1 = Math.min(Math.max(...xs), 400);
    for (const u of fr) {
      const d = Math.min(...ds) + dw * u;
      if (d < d0 || d > d1) continue;
      const a = sceneAtmosProject(cam, x0, d - tw / 2, 0), b = sceneAtmosProject(cam, x1, d - tw / 2, 0), c = sceneAtmosProject(cam, x1, d + tw / 2, 0), e = sceneAtmosProject(cam, x0, d + tw / 2, 0);
      gx.moveTo(a.X, a.Y); gx.lineTo(b.X, b.Y); gx.lineTo(c.X, c.Y); gx.lineTo(e.X, e.Y); gx.closePath(); any++;
    }
    if (any) gx.fill();
    return any ? 1 : 0;
  }
  for (const u of fr) {
    let prev = null;
    for (let k = 0; k <= N; k++) {
      const d = d0 * Math.pow(d1 / d0, k / N), sp = _scwxPSpan(poly, d);
      if (!sp) { prev = null; continue; }
      const x = sp[0] + (sp[1] - sp[0]) * u, a = sceneAtmosProject(cam, x - tw / 2, d, 0), b = sceneAtmosProject(cam, x + tw / 2, d, 0);
      if (prev) { gx.moveTo(prev[0].X, prev[0].Y); gx.lineTo(prev[1].X, prev[1].Y); gx.lineTo(b.X, b.Y); gx.lineTo(a.X, a.Y); gx.closePath(); any++; }
      prev = [a, b];
    }
  }
  if (any) gx.fill();
  return any ? 1 : 0;
}
/** Seeded snow patches inside a polygon (metres) for 'partial' kinds (under a canopy). */
function _scwxPPatches(gx, cam, poly, seed, col, alpha) {
  const r = sceneRnd(seed), xs = poly.map(p => p[0]), ds = poly.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), d0 = Math.max(Math.min(...ds), 2), d1 = Math.min(Math.max(...ds), 400);
  gx.fillStyle = _scwxPRgba(col, 1); gx.globalAlpha = alpha; gx.beginPath();
  let n = 0;
  for (let i = 0; i < 60 && n < 30; i++) {
    const d = d0 * Math.pow(d1 / d0, r()), x = x0 + r() * (x1 - x0);
    if (!_scwxInPoly(x, d, poly)) continue;
    const c = sceneAtmosProject(cam, x, d, 0), rx = (1 + r() * 2.5) * c.k, ry = rx * cam.eye / d * 1.4;
    if (rx < 1) continue;
    gx.moveTo(c.X + rx, c.Y); gx.ellipse(c.X, c.Y, rx, Math.max(0.5, ry), 0, 0, Math.PI * 2); n++;
  }
  if (n) gx.fill();
  return n;
}
/** A v1 ground fill counts as hard when its colour is a mid grey (tarmac, paving): the only clue a v1 scene gives. */
function _scwxPGreyFill(fill) {
  const c = typeof fill === 'string' ? fill : fill && (fill.lin || fill.rad) ? (fill.lin || fill.rad)[0][1] : null;
  if (!c || !/^#[0-9a-f]{3,6}$/i.test(c)) return false;
  const [r, g, b] = _scHex(c), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx - mn < 26 && mx > 40 && mx < 200;
}

/* ---------- falling weather (8.2, 8.3) ---------- */
/** Seeded particles: two depth tiers; positions are pure functions of t. kind 'rain' | 'snow'. */
function sceneWeatherParticles(kind, n, seed) {
  const r = sceneRnd(seed || 7), out = [];
  for (let i = 0; i < n; i++) {
    const near = i % 5 < 2;   // 40 % near
    if (kind === 'rain') out.push({ near, x0: r() * 1760 - 80, y0: r() * 1000, vy: near ? 1000 + r() * 300 : 560 + r() * 200, len: near ? 26 + r() * 16 : 10 + r() * 8 });
    else out.push({ near, x0: r() * 1760 - 80, y0: r() * 1000, vy: near ? 60 + r() * 30 : 24 + r() * 16, size: near ? 3 + r() * 2.2 : 1.4 + r() * 1.2, amp: 8 + r() * 20, f: 0.5 + r() * 0.9, ph: r() * 6.283 });
  }
  return out;
}
/** A particle at t (scene units): rain falls slanted by the wind (dx = wind * 0.35 * dy), snow drifts and sways. */
function sceneWeatherParticleAt(p, t, wind, kind) {
  const dy = p.vy * t, y = ((p.y0 + dy) % 1000 + 1000) % 1000 - 50;
  const dx = kind === 'rain' ? -(wind || 1) * 0.35 * dy : (wind || 1) * 18 * t + p.amp * Math.sin(p.f * t + p.ph);
  const x = ((p.x0 + dx) % 1760 + 1760) % 1760 - 80;
  return { x, y };
}
/** The lightning schedule: 1 to 3 flashes a minute at seeded times (each 120 ms). Is there a flash at t? */
function sceneLightningAt(seed, t) {
  for (const m of [Math.floor(t / 60), Math.floor(t / 60) - 1]) {
    if (m < 0) continue;
    const r = sceneRnd(sceneHash('flash|' + seed + '|' + m)), n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const at = m * 60 + r() * 60; if (t >= at && t < at + 0.12) return true; }
  }
  return false;
}

/* ---------- the pass ---------- */
const sceneWeatherPass = {
  id: 'weather',
  // by stage (V2 13.1): prebake 10 (puddles before the water pass reads them), sprite 20 (after shading), ground 10, streaks
  // over the objects at 50 (after the halos), rings at 50, rain and snow at 50 (the fog banks follow at 60)
  order: { prebake: 10, sprite: 20, ground: 10, 'layer:over': 50, frameGroup: 50, framePost: 50, default: 50 },
  applies(C) { return _scwxPV2(C) || _scwxPFx(C); },
  /** The light key: what the weather bakes (wet, snow lying, frost, the kind). */
  key(L, C) {
    const wx = L && L.wx;
    if (!wx) return '';
    return ['w' + wx.kind, _scwxPq(wx.wet, 0.2), _scwxPq(wx.snowDepth, 0.1), _scwxPq(wx.frost, 0.2), _scwxPq(wx.rain, 0.25), _scwxPq(wx.snow, 0.25)].join(':');
  },
  spriteKey(L, C, req) {
    const wx = L && L.wx;
    if (!wx || !req || req.part === 'lit') return '';
    const cls = _scwxPCls(req), def = typeof sceneObj === 'function' ? sceneObj(req.o) : null;
    let k = '';
    if (wx.snowDepth > 0.05 && (_SCWXP_CAP.has(cls) || (def && def.snowCap))) k += 's' + _scwxPq(wx.snowDepth, 0.1);
    if (_scwxPV2(C) && wx.frost > 0.05 && _SCWXP_RIME.has(cls)) k += 'r' + _scwxPq(wx.frost, 0.2);
    return k;
  },
  prebake(env) {
    const C = env.C, wx = _scwxPWx(env), st = env._scwx = { wx, puddles: [], rain: null, snow: null, rings: [], streaks: 0, waterPass: false };
    if (!wx) return;
    const lod = env.lod == null ? 1 : env.lod;
    if (_scwxPV2(C)) {
      st.puddles = typeof scenePuddles === 'function' ? scenePuddles(C, wx, { lod }) : [];
      // the water pass draws the puddles when it reads env.waterExtra (it says so: takesExtra); otherwise this pass draws them
      st.waterPass = typeof sceneRenderPasses === 'function' && (() => { try { return sceneRenderPasses('prebake', C).concat(sceneRenderPasses('layer:under', C)).some(p => p.id === 'water' && p.takesExtra); } catch (e) { return false; } })();
      if (st.puddles.length && Array.isArray(env.waterExtra)) for (const p of st.puddles) env.waterExtra.push(p);
      if (wx.rain > 0.05) st.rain = sceneWeatherParticles('rain', Math.round(250 * _scwxPClamp(wx.rain, 0, 1) * Math.max(0.4, lod)), sceneHash((C.id || '') + '|rain'));
      if (wx.snow > 0.05) st.snow = sceneWeatherParticles('snow', Math.round(200 * _scwxPClamp(wx.snow, 0, 1) * Math.max(0.4, lod)), sceneHash((C.id || '') + '|snow'));
      // rain rings: on the puddles and on rippling water within 80 m, nearest first, at most 20
      if (wx.rain > 0.05) {
        const cam = C.cam, regions = st.puddles.concat((C.water || []).filter(w => w.v2 && w.v2.polyM && (w.v2.dNear || 0) < 80));
        const r = sceneRnd(sceneHash((C.id || '') + '|rings')), want = Math.min(20, Math.round(8 + 12 * wx.rain));
        const cand = [];
        for (const w of regions) {
          const poly = w.v2.polyM, xs = poly.map(p => p[0]), ds = poly.map(p => p[1]), d0 = Math.max(Math.min(...ds), cam.dMin || 3), d1 = Math.min(Math.max(...ds), 80);
          if (!(d1 > d0)) continue;
          for (let i = 0; i < 12; i++) {
            const d = d0 + r() * (d1 - d0), x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs));
            if (!_scwxInPoly(x, d, poly)) continue;
            const c = sceneAtmosProject(cam, x, d, 0), rx = 0.28 * c.k;
            if (rx < 1.2 || c.X < -20 || c.X > 1620) continue;
            cand.push({ X: c.X, Y: c.Y, rx, ry: rx * cam.eye / d * 1.2, d, layer: w.layer, per: 0.7 + r() * 0.6, ph: r() });
          }
        }
        cand.sort((a, b) => a.d - b.d);
        st.rings = cand.slice(0, want);
      }
    }
  },
  sprite(env, cx, req) {
    const st = env._scwx, wx = st && st.wx, L = env.L;
    if (!wx || !req || req.part === 'lit') return;
    const cls = _scwxPCls(req), def = typeof sceneObj === 'function' ? sceneObj(req.o) : null, h = cx.canvas.height;
    if (wx.snowDepth > 0.05 && (_SCWXP_CAP.has(cls) || (def && def.snowCap))) {
      const col = L && typeof sceneColour === 'function' ? sceneColour('#f2f5f8', { L }) : '#f2f5f8';
      sceneWeatherCapSprite(cx, col, _scwxPClamp(wx.snowDepth * 1.1, 0, 0.95), _scwxPClamp(h / 40, 2, 4) * (cls === 'tree' ? 1.2 : 1));
    }
    if (_scwxPV2(env.C) && wx.frost > 0.05 && _SCWXP_RIME.has(cls)) {
      const col = L && typeof sceneColour === 'function' ? sceneColour('#e6eef2', { L }) : '#e6eef2';
      sceneWeatherCapSprite(cx, col, 0.5 * wx.frost, _scwxPClamp(h / 70, 1, 2));
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = 0.2 * wx.frost; cx.fillStyle = '#dfe6ea'; cx.fillRect(0, 0, cx.canvas.width, h); cx.restore();
    }
  },
  ground(env, layer, gx) {
    const C = env.C, L = env.L, st = env._scwx, wx = st && st.wx;
    if (!wx || !(wx.wet > 0.05 || wx.snowDepth > 0.05 || wx.frost > 0.05) || typeof _sccPath !== 'function') return;
    const v2 = _scwxPV2(C), cam = v2 ? C.cam : null, surf = new Map((C.surfaces || []).map(s => [s.id, s]));
    const snowCol = L && typeof sceneColour === 'function' ? sceneColour('#eef2f6', { L }) : '#eef2f6', slushCol = L && typeof sceneColour === 'function' ? sceneColour('#c8ccd0', { L }) : '#c8ccd0';
    const frostCol = L && typeof sceneColour === 'function' ? sceneColour('#dfe6ea', { L }) : '#dfe6ea';
    gx.save(); gx.setTransform(..._scatPTG(env, layer)); gx.globalCompositeOperation = 'source-over';
    for (const gd of C.ground) {
      if (gd.layer !== layer) continue;
      let kind = null, s = null;
      if (v2) { s = gd.surf != null ? surf.get(gd.surf) : null; kind = s ? s.kind : null; if (!kind || gd.edge || gd.mark) continue; }
      else kind = _scwxPGreyFill(gd.fill) ? 'road' : null;   // v1 (fx): grey fills read as tarmac or paving; others are left alone
      if (!kind) continue;
      const K = sceneWeatherSurface(kind), path = _sccPath(gd.d), box = scenePathBox(gd.d) || [0, 0, 1600, 900];
      // wet: darker hard ground, a faint sky tint, and more sky toward the far edge (a grazing view reflects more)
      if (wx.wet > 0.05 && K.wet >= 0.15 && wx.snowDepth < 0.5) {
        // darker (x 1 - 0.18 wet on hard ground), a faint sky tint (10 % of the low sky), and a grazing sheen that grows with
        // distance (the Fresnel of a wet film: none at the camera's feet, up to 0.3 of the low sky far away)
        const k = wx.wet * K.wet, sky = (L && L.low) || '#c8d4dc';
        gx.globalAlpha = 1; gx.fillStyle = `rgba(0,0,0,${Math.round(0.18 * wx.wet * (K.hard ? 1 : 0.55) * 1000) / 1000})`; gx.fill(path);
        gx.fillStyle = _scwxPRgba(sky, 0.1 * k); gx.fill(path);
        if (cam) {
          const y0 = Math.max(box[1], cam.horizon + 0.5), y1 = Math.max(y0 + 1, box[3]), sheen = (Y) => { const d = cam.f * cam.eye / Math.max(0.5, Y - cam.horizon); return 0.3 * k * _scwxPClamp(1 - (cam.eye / d) / 0.15, 0, 1); };
          const g = gx.createLinearGradient(0, y0, 0, y1);
          for (let q = 0; q <= 4; q++) g.addColorStop(q / 4, _scwxPRgba(sky, sheen(y0 + (y1 - y0) * q / 4)));
          gx.fillStyle = g; gx.fill(path);
        }
      }
      // snow lying
      if (wx.snowDepth > 0.05) {
        const sd = wx.snowDepth;
        if (K.snow === 'full') { gx.globalAlpha = _scwxPClamp(sd * 2, 0, 1) * 0.96; gx.fillStyle = snowCol; gx.fill(path); }
        else if (K.snow === 'slush') {
          gx.globalAlpha = _scwxPClamp(sd * 0.85, 0, 0.8); gx.fillStyle = slushCol; gx.fill(path);
          if (v2 && s && s.polyM && ['road', 'tramway', 'parking', 'driveway'].includes(kind)) { gx.save(); gx.clip(path); _scwxPTracks(gx, cam, s.polyM, _scwxPMix(slushCol, '#4a5058', 0.55), 0.5 * sd); gx.restore(); }
        } else if (K.snow === 'partial' && v2 && s && s.polyM) { gx.save(); gx.clip(path); _scwxPPatches(gx, cam, s.polyM, sceneHash((C.id || '') + '|' + s.id), snowCol, _scwxPClamp(sd * 1.4, 0, 0.9)); gx.restore(); }
      }
      // frost on grass-like ground: lighter and paler
      if (wx.frost > 0.05 && K.grassy && wx.snowDepth < 0.5) { gx.globalAlpha = 0.35 * wx.frost; gx.fillStyle = frostCol; gx.fill(path); }
    }
    // the puddles themselves, when no water pass takes them: a still mirror of the sky (the low sky at the far edge, the high
    // sky near: the mirror image of the sky about the horizon), a dark wet rim, and a glint of the low sun when it is ahead
    if (v2 && !st.waterPass) for (const p of st.puddles) if (p.layer === layer) {
      const path = _sccPath(p.d), g = gx.createLinearGradient(0, p.y0, 0, p.y1), top = (L && L.top) || '#6a8aa8', low = (L && L.low) || '#c8d4dc', mid = (L && L.mid) || '#98b4c8';
      g.addColorStop(0, _scwxPMix(low, '#3a444c', 0.15)); g.addColorStop(0.5, _scwxPMix(mid, '#3a444c', 0.2)); g.addColorStop(1, _scwxPMix(top, '#3a444c', 0.3));
      gx.globalAlpha = 1; gx.strokeStyle = 'rgba(20,24,28,0.35)'; gx.lineWidth = Math.max(0.6, (p.y1 - p.y0) * 0.12); gx.stroke(path);
      gx.globalAlpha = 0.92; gx.fillStyle = g; gx.fill(path);
      if (L && L.sun && L.sun.show && (L.backlit || 0) > 0.2) { gx.save(); gx.clip(path); gx.globalCompositeOperation = 'lighter'; gx.globalAlpha = 0.5 * L.backlit; gx.fillStyle = L.lowSun || '#fff0c8'; gx.fillRect(L.sun.x - 40, p.y0, 80, p.y1 - p.y0); gx.restore(); }
    }
    gx.restore();
  },
  /** Over the layer: the light streaks on wet ground below lamps, lit windows and a backlit low sun (baked; 'lighter'). */
  layer(env, layer, gx, when) {
    const C = env.C, L = env.L, st = env._scwx, wx = st && st.wx;
    if (when !== 'over' || !_scwxPV2(C) || !wx || !(wx.wet > 0.2) || wx.snowDepth >= 0.5 || !L || typeof _sccPath !== 'function') return;
    // the wet ground of this layer: the clip
    const surf = new Map((C.surfaces || []).map(s => [s.id, s])), clip = new Path2D();
    let any = false, kw = 0;
    for (const gd of C.ground) if (gd.layer === layer && gd.surf != null) { const s = surf.get(gd.surf); if (!s) continue; const K = sceneWeatherSurface(s.kind); if (K.wet >= 0.3) { clip.addPath(_sccPath(gd.d)); any = true; kw = Math.max(kw, K.wet); } }
    for (const p of st.puddles) if (p.layer === layer) { clip.addPath(_sccPath(p.d)); any = true; kw = Math.max(kw, 0.9); }
    if (!any) return;
    const cam = C.cam, lights = (env.lights && env.lights.length ? env.lights : (env._scat && env._scat.lights) || []).filter(l => l.layer <= layer);
    gx.save(); gx.setTransform(..._scatPTG(env, layer)); gx.clip(clip); gx.globalCompositeOperation = 'lighter';
    // a soft streak: an elliptical falloff from the source's foot, straight down (a stretched radial gradient)
    const streak = (x, y0, len, w, col, a) => {
      if (len < 2 || w < 0.6 || a < 0.01) return;
      gx.save(); gx.translate(x, y0); gx.scale(w / 2, len);
      const g = gx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, _scwxPRgba(col, a)); g.addColorStop(0.3, _scwxPRgba(col, a * 0.5)); g.addColorStop(0.65, _scwxPRgba(col, a * 0.16)); g.addColorStop(1, _scwxPRgba(col, 0));
      gx.globalAlpha = 1; gx.fillStyle = g; gx.fillRect(-1, 0, 2, 1);
      gx.restore();
      st.streaks++;
    };
    const A = wx.wet * kw * 0.4;
    const hid = env._scat && env._scat.hid;
    if (L.lamps || L.windows) for (const l of lights) {
      if (l.kind === 'spill' && !L.windows) continue;
      if (hid && hid.get(l) && hid.get(l).foot) continue;
      if (l.kind !== 'spill' && !L.lamps) continue;
      // 2 to 6 times the source's height on screen (by how wet), at most 420 units
      const hgt = Math.max(4, l.Y - l.hy), len = Math.min(420, hgt * (2 + 4 * _scwxPClamp(wx.wet, 0, 1))), k = cam.f / Math.max(0.5, l.d);
      streak(l.hx, l.Y, len, l.kind === 'spill' ? Math.max(3, (l.w || 2) * k * 0.7) : Math.max(4, 1.1 * k), l.col, A * (l.kind === 'spill' ? 0.75 : 1.2));
    }
    // a low sun ahead glares on wet ground: a long bright streak below it
    if (L.sun && L.sun.show && (L.backlit || 0) > 0.3 && L.alt > 0 && L.alt < 25) streak(L.sun.x, cam.horizon, 900 - cam.horizon, 160 + 120 * L.backlit, L.lowSun || '#fff0c8', 0.35 * wx.wet * L.backlit);
    gx.restore();
  },
  /** Rain rings on puddles and rippling water: each ring grows and fades; one stroke per phase group (3). */
  frameGroup(env, grp, ctx, t, below) {
    const st = env._scwx;
    if (!st || !st.rings.length || !grp || !grp.layers) return 0;
    const mine = st.rings.filter(r => grp.layers.includes(r.layer));
    if (!mine.length) return 0;
    const tt = env.still ? 0 : t, col = (env.L && env.L.dark > 0.5) ? '#9aa6b4' : '#e4ecf2';
    ctx.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy); ctx.lineWidth = 1 / env.vs * 1.2; ctx.strokeStyle = col;
    let n = 0;
    for (let q = 0; q < 3; q++) {
      ctx.beginPath(); let a = 0, c = 0;
      for (let i = q; i < mine.length; i += 3) {
        const r = mine[i], u = ((tt / r.per + r.ph) % 1 + 1) % 1;
        if (below != null && r.Y * env.vs + env.oy > below) continue;
        ctx.moveTo(r.X + r.rx * u, r.Y); ctx.ellipse(r.X, r.Y, Math.max(0.1, r.rx * u), Math.max(0.1, r.ry * u), 0, 0, Math.PI * 2); a += 1 - u; c++;
      }
      if (!c) continue;
      ctx.globalAlpha = _scwxPClamp(0.55 * a / c, 0.08, 0.6); ctx.stroke(); n += c;
    }
    ctx.globalAlpha = 1;
    return n;
  },
  /** Falling rain and snow (v2), and the lightning. */
  framePost(env, ctx, t) {
    const st = env._scwx, L = env.L, wx = st && st.wx;
    if (!wx) return 0;
    let n = 0;
    const tt = env.still ? 0 : t, wind = wx.wind || 1, dark = L ? _scwxPClamp(L.dark || 0, 0, 1) : 0;
    ctx.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy);
    if (st.rain && st.rain.length) {
      const col = _scwxPMix('#d6dee8', '#7d8896', dark), sl = -wind * 0.35;
      for (const near of [false, true]) {
        ctx.beginPath();
        for (const p of st.rain) { if (p.near !== near) continue; const q = sceneWeatherParticleAt(p, tt, wind, 'rain'); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + sl * p.len, q.y + p.len); }
        ctx.strokeStyle = col; ctx.lineWidth = near ? 1.4 : 0.9; ctx.globalAlpha = near ? 0.42 : 0.24; ctx.stroke(); n++;
      }
    }
    if (st.snow && st.snow.length) {
      ctx.fillStyle = _scwxPMix('#ffffff', '#b8c2d0', dark * 0.6);
      for (const near of [false, true]) {
        ctx.beginPath();
        for (const p of st.snow) { if (p.near !== near) continue; const q = sceneWeatherParticleAt(p, tt, wind, 'snow'); ctx.rect(q.x, q.y, p.size, p.size); }
        ctx.globalAlpha = near ? 0.92 : 0.7; ctx.fill(); n++;
      }
    }
    if (wx.thunder && !_scwxPQuiet(env) && sceneLightningAt(env.C && env.C.id, t)) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, env.W || 1600, env.H || 900); n++;
    }
    ctx.globalAlpha = 1;
    return n;
  },
  stats(env) { const st = env._scwx || {}; const wx = st.wx || {}; return { kind: wx.kind || null, puddles: (st.puddles || []).length, rain: st.rain ? st.rain.length : 0, snow: st.snow ? st.snow.length : 0, rings: (st.rings || []).length, streaks: st.streaks || 0 }; },
};

if (typeof sceneRenderPassDefine === 'function') { try { sceneRenderPassDefine(sceneWeatherPass); } catch (e) { if (typeof console !== 'undefined') console.warn('weather pass not registered:', e && e.message); } }
