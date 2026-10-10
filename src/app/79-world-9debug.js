/* ============================================================
   WORLD ENGINE (scene format v3): the dev overlays and the time / season / weather scrubber (docs/dev/WORLD_ENGINE.md 15.5,
   16.4; requirements G9, V6). Package `tools`, private prefix _wdb. Browser only where it touches the DOM; nothing runs at
   load except the render-pass registration below (guarded), so Node evaluates this file harmlessly.

   Turn it on with #worlddev=1 (or ?worlddev=1) in the page address. Every world scene then draws, over its frame:
     footprints (solid red, passable green, walkable blue), the walk nav map, the agents' paths and velocities, depth order
     numbers, the light direction (sun azimuth and elevation, the scene's shadow direction), the wind field, the water
     mirror lines (each water region's waterline), the invariant violations of the current frame (worldInvariants, red
     rings and a list), and the per-system profile (the runner's p50 / p95 ms per system, else the render passes' cost).
   A small panel (top right) toggles each layer and holds the scrubber: day of year, time of day and weather, applied live
   to every world scene on the page through sceneHostSet (re-lit, never rebuilt), with play buttons that drag through a
   day or a year.

     worldDevOn()                      -> true when the page address asks for the dev overlays
     worldDebug(env, ctx, t, o)        draws the overlays of one world frame into ctx (the pass calls it; tools may too).
                                          o: { layers: { footprints, nav, paths, order, light, wind, water, violations, profile } }
     worldDevPanel(doc)                -> the panel element (created once; the scrubber and the layer toggles)
     worldDevApply(o)                  re-light every world host: o: { ms, wx } (null wx: the scene's own weather)
     WORLD_DEV_LAYERS                  the layer names and their default state
   Other packages are read through typeof guards: worldHostLive (render), worldInvariants (this package), worldWind
   (systems), worldWaterPlan (look), worldNavLayer (life). A missing one leaves its layer empty.
   ============================================================ */
const WORLD_DEV_LAYERS = Object.freeze({ footprints: true, nav: false, paths: true, order: false, light: true, wind: true, water: true, violations: true, profile: true });
const _wdbState = { layers: Object.assign({}, WORLD_DEV_LAYERS), panel: null, last: new Map(), play: null, ms: null, wx: null };

function worldDevOn() {
  try {
    if (typeof location === 'undefined') return false;
    return /(?:[?&#]|^)worlddev=1(?:&|$)/.test(String(location.search || '') + '&' + String(location.hash || '').replace(/^#/, '&'));
  } catch (e) { return false; }
}
function _wdbLive(env) {
  const id = env && env.C && env.C.id;
  if (!id || typeof worldHostLive !== 'function') return null;
  try { return worldHostLive(id); } catch (e) { return null; }
}
function _wdbProj(cam, x, z, y) {
  if (typeof sceneProject !== 'function' || !cam) return null;
  try { const p = sceneProject(cam, x, Math.max(0.3, z), y == null ? null : y); return p && Number.isFinite(p.X) ? p : null; } catch (e) { return null; }
}
function _wdbPoly(ctx, cam, poly, y) {
  let n = 0;
  ctx.beginPath();
  for (const p of poly) { const q = _wdbProj(cam, p[0], p[1], y); if (!q) continue; if (n++) ctx.lineTo(q.X, q.Y); else ctx.moveTo(q.X, q.Y); }
  if (n > 1) ctx.closePath();
  return n > 1;
}
function _wdbArrow(ctx, x, y, dx, dy, col) {
  const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx - ux * 7 - uy * 4, y + dy - uy * 7 + ux * 4); ctx.lineTo(x + dx - ux * 7 + uy * 4, y + dy - uy * 7 - ux * 4); ctx.closePath(); ctx.fill();
}
function _wdbText(ctx, x, y, s, col, bg) {
  ctx.font = '12px system-ui, sans-serif';
  const w = ctx.measureText(s).width;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(x - 2, y - 11, w + 4, 15); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}

/** The overlays of one world frame. ctx is already in scene units (1600 x 900). */
function worldDebug(env, ctx, t, o) {
  o = o || {};
  const L = Object.assign({}, _wdbState.layers, o.layers || {}), rec = _wdbLive(env), world = rec && rec.world, cam = (env && env.cam) || (env && env.C && env.C.cam) || (world && world.cam);
  if (!world || !cam) return 0;
  const sim = rec.sim || null, life = sim && sim.life, nav = sim && sim.nav;
  let agents = [];
  try { agents = life && typeof worldAgents === 'function' ? worldAgents(life) : (world.agents || []); } catch (e) { agents = []; }
  ctx.save();
  ctx.lineWidth = 1;
  // the walk nav map (static: cached per world as a list of projected cell centres)
  if (L.nav && nav && typeof worldNavOk === 'function' && typeof sceneUnproject === 'function') {
    // sampled through the public API: a screen grid below the horizon, unprojected, asked worldNavOk (walk and swim)
    let pts = _wdbState.last.get('nav');
    if (!pts || pts.world !== world) {
      pts = { world, list: [], swim: [] };
      for (let Y = Math.max(0, cam.horizon + 2); Y < 900; Y += 9) for (let X = 0; X < 1600; X += 9) {
        let g = null; try { g = sceneUnproject(cam, X, Y); } catch (e) { g = null; }
        if (!g || !Number.isFinite(g.x)) continue;
        try { if (worldNavOk(nav, 'walk', g.x, g.d, 0)) pts.list.push(X, Y); else if (worldNavOk(nav, 'swim', g.x, g.d, 0)) pts.swim.push(X, Y); } catch (e) { /* off the grid */ }
      }
      _wdbState.last.set('nav', pts);
    }
    ctx.fillStyle = 'rgba(0,200,255,0.3)';
    for (let i = 0; i < pts.swim.length; i += 2) ctx.fillRect(pts.swim[i] - 1, pts.swim[i + 1] - 1, 2, 2);
    ctx.fillStyle = 'rgba(40,140,255,0.35)';
    for (let i = 0; i < pts.list.length; i += 2) ctx.fillRect(pts.list[i] - 1, pts.list[i + 1] - 1, 2, 2);
  }
  // footprints
  if (L.footprints) {
    for (const e of world.entities || []) {
      if (!Array.isArray(e.foot) || e.foot.length < 3 || !(e.z > 0.5) || e.z > 250) continue;
      ctx.strokeStyle = e.solidity === 'solid' ? 'rgba(230,40,40,0.9)' : e.solidity === 'walkable' ? 'rgba(40,110,255,0.9)' : 'rgba(30,170,70,0.8)';
      if (_wdbPoly(ctx, cam, e.foot, e.y)) ctx.stroke();
    }
  }
  // the water mirror lines: look's plan when loaded, else each water region's outline at its level
  if (L.water) {
    let plan = null;
    if (typeof worldWaterPlan === 'function') { try { plan = worldWaterPlan(world, cam); } catch (e) { plan = null; } }
    ctx.strokeStyle = 'rgba(0,230,255,0.95)'; ctx.setLineDash([6, 4]);
    if (Array.isArray(plan) && plan.some(r => r && r.topRow)) {
      for (const r of plan) {
        const row = r.topRow; if (!row) continue;
        ctx.beginPath(); let n = 0;
        for (let X = 0; X < row.length; X++) { const Y = row[X]; if (!Number.isFinite(Y)) { n = 0; continue; } if (n++) ctx.lineTo(X * (1600 / row.length), Y); else ctx.moveTo(X * (1600 / row.length), Y); }
        ctx.stroke();
      }
    } else for (const s of world.surfaces || []) {
      if (s.kind !== 'water' || !Array.isArray(s.poly)) continue;
      const lvl = Number.isFinite(s.level) ? s.level : cam.water || 0;
      if (_wdbPoly(ctx, cam, s.poly, lvl)) ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  // paths, velocities and depth order of the agents
  for (const a of agents) {
    const p = _wdbProj(cam, a.x, a.z, a.y);
    if (!p) continue;
    if (L.paths) {
      const raw = life && life.agents ? life.agents.find(q => q.id === a.id) : null, path = raw && raw.path;
      if (Array.isArray(path) && path.length > 1) {
        ctx.strokeStyle = 'rgba(255,200,0,0.8)'; ctx.beginPath(); let n = 0;
        for (const q of path) { const xz = Array.isArray(q) ? q : [q.x, q.z]; const r = _wdbProj(cam, xz[0], xz[1], 0); if (!r) continue; if (n++) ctx.lineTo(r.X, r.Y); else ctx.moveTo(r.X, r.Y); }
        ctx.stroke();
      }
      const v = _wdbProj(cam, a.x + (a.vx || 0) * 2, a.z + (a.vz || 0) * 2, a.y);
      if (v && Math.hypot(a.vx || 0, a.vz || 0) > 0.05) _wdbArrow(ctx, p.X, p.Y, v.X - p.X, v.Y - p.Y, 'rgba(255,140,0,0.95)');
    }
    if (L.order) _wdbText(ctx, p.X + 3, p.Y - 3, String(a.id) + ' z' + Math.round(a.z), '#fff', 'rgba(0,0,0,0.55)');
  }
  // the wind field (systems' one wind)
  if (L.wind && typeof worldWind === 'function') {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
      const z = 8 + j * 14, x = (i - 2) * z * 0.35, p = _wdbProj(cam, x, z, 0);
      if (!p) continue;
      let w = null; try { w = worldWind(world, x, z, t); } catch (e) { w = null; }
      if (!w) continue;
      const q = _wdbProj(cam, x + (w.dx || 0) * 3, z + (w.dz || 0) * 3, 0);
      if (q) _wdbArrow(ctx, p.X, p.Y, q.X - p.X, q.Y - p.Y, 'rgba(180,255,180,0.9)');
    }
  }
  // the light direction (top left)
  if (L.light) {
    const T = world.time || (rec && rec.ctx) || null, Lnow = env && env.Lnow;
    const az = T && T.sun ? T.sun.az : Lnow && Lnow.sun ? Lnow.sun.az : null, alt = T && T.sun ? T.sun.alt : Lnow ? Lnow.alt : null;
    if (Number.isFinite(az)) {
      const rel = (az - (cam.heading || 0)) * Math.PI / 180;
      ctx.strokeStyle = '#ffd400'; ctx.beginPath(); ctx.arc(60, 60, 34, 0, Math.PI * 2); ctx.stroke();
      _wdbArrow(ctx, 60, 60, Math.sin(rel) * 30, -Math.cos(rel) * 30, alt > 0 ? '#ffd400' : '#8899ff');
      _wdbText(ctx, 18, 112, `sun az ${Math.round(az)} alt ${Math.round(alt)}`, '#fff', 'rgba(0,0,0,0.55)');
    }
  }
  // the invariant violations of this frame (checked twice a second)
  if (L.violations && typeof worldInvariants === 'function' && typeof worldInvariantFrame === 'function') {
    let v = _wdbState.last.get('viol');
    if (!v || v.world !== world || Math.abs(t - v.t) > 0.5) {
      const cache = (_wdbState.last.get('cache') && _wdbState.last.get('cache').world === world) ? _wdbState.last.get('cache') : { world, frame: {}, track: worldInvariantTracker() };
      _wdbState.last.set('cache', cache);
      let list = [];
      try {
        const fr = typeof worldFrameAt === 'function' ? worldFrameAt(world, t) : null;
        const frame = fr && Array.isArray(fr.ents) ? fr : worldInvariantFrame(world, agents, { t, ctx: world.time || null, cam, cache: cache.frame });
        list = worldInvariants(frame, { world, track: cache.track });
        v = { world, t, list, byId: new Map(frame.ents.map(e => [String(e.id), e])) };
      } catch (e) { v = { world, t, list: [{ rule: 'debug', id: null, msg: String(e && e.message || e) }], byId: new Map() }; }
      _wdbState.last.set('viol', v);
    }
    ctx.strokeStyle = 'rgba(255,0,60,0.95)'; ctx.lineWidth = 2;
    for (const x of v.list) {
      const e = x.id != null ? v.byId.get(String(x.id)) : null, b = e && e.box;
      if (!b) continue;
      const B = Array.isArray(b) ? b : [b.x0, b.y0, b.x1, b.y1];
      ctx.strokeRect(B[0], B[1], B[2] - B[0], B[3] - B[1]);
    }
    ctx.lineWidth = 1;
    const by = {}; for (const x of v.list) by[x.rule] = (by[x.rule] || 0) + 1;
    let y = 140;
    _wdbText(ctx, 12, y, `${v.list.length} violation(s)`, v.list.length ? '#ff6680' : '#7f7', 'rgba(0,0,0,0.6)');
    for (const [k, n] of Object.entries(by).slice(0, 12)) { y += 16; _wdbText(ctx, 12, y, `${k} ${n}: ${(v.list.find(q => q.rule === k) || {}).msg || ''}`.slice(0, 110), '#ffd0d8', 'rgba(0,0,0,0.6)'); }
  }
  // the per-system profile (bottom left)
  if (L.profile) {
    let rows = [];
    const R = world.runner || (rec && rec.runner);
    if (R && typeof R.stats === 'function') { try { rows = (R.stats().systems || []).map(s => `${s.id} ${(+s.p50 || 0).toFixed(2)} / ${(+s.p95 || 0).toFixed(2)} ms${s.level ? ' L' + s.level : ''}${s.enabled === false ? ' OFF' : ''}`); } catch (e) { rows = []; } }
    else if (env && env.passStats) rows = Object.entries(env.passStats).map(([k, p]) => `${k} ${p.frames ? (p.frameMs / p.frames).toFixed(2) : '0'} ms`);
    if (rec && rec.stats) rows.push(`agents ${rec.stats.agents || 0}, life tick ${(+rec.stats.tickMs || 0).toFixed(2)} ms`);
    let y = 900 - 12 - rows.length * 15;
    for (const r of rows) { _wdbText(ctx, 12, y, r, '#e8f0ff', 'rgba(0,0,0,0.6)'); y += 15; }
  }
  ctx.restore();
  return 1;
}

/* ---------- the scrubber and the layer toggles (V6) ---------- */
/** Re-light every world host on the page: o.ms (a time) and o.wx (a weather kind, or null for the scene's own). */
function worldDevApply(o) {
  o = o || {};
  if (typeof document === 'undefined' || typeof sceneHostSet !== 'function') return 0;
  let n = 0;
  for (const el of document.querySelectorAll('.anim-scene.ap-composed')) {
    const rec = typeof _schHosts !== 'undefined' ? _schHosts.get(el) : null, d = rec && rec.data;
    if (d && !d.world3 && !(typeof worldHostLive === 'function' && d.id && worldHostLive(d.id))) continue;
    const set = {};
    if (Number.isFinite(o.ms)) set.at = o.ms;
    if ('wx' in o) set.wx = o.wx || null;
    try { if (sceneHostSet(el, set)) n++; } catch (e) { /* the next host */ }
  }
  return n;
}
function _wdbMsOf(day, hour) { const y = new Date().getUTCFullYear(); return Date.UTC(y, 0, 1) + (day - 1) * 86400000 + hour * 3600000; }
/** The dev panel: layer toggles and the scrubber. Created once, on the first dev frame. */
function worldDevPanel(doc) {
  doc = doc || (typeof document !== 'undefined' ? document : null);
  if (!doc || !doc.body) return null;
  if (_wdbState.panel && _wdbState.panel.isConnected) return _wdbState.panel;
  const now = new Date(), day0 = Math.floor((Date.now() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000) + 1, hour0 = now.getUTCHours() + now.getUTCMinutes() / 60;
  const p = doc.createElement('div');
  p.className = 'wdb-panel';
  p.setAttribute('role', 'region'); p.setAttribute('aria-label', 'World dev overlays');
  p.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:rgba(16,18,24,0.92);color:#e8ecf2;font:12px system-ui,sans-serif;padding:8px 10px;border-radius:8px;max-width:300px;box-shadow:0 2px 10px rgba(0,0,0,0.4)';
  const layerBoxes = Object.keys(WORLD_DEV_LAYERS).map(k => `<label style="display:inline-block;margin:0 8px 2px 0"><input type="checkbox" data-wdb-layer="${k}"${_wdbState.layers[k] ? ' checked' : ''}> ${k}</label>`).join('');
  p.innerHTML = `<div style="font-weight:600;margin-bottom:4px">World dev (#worlddev=1)</div><div>${layerBoxes}</div>
<div style="margin-top:6px">Day <span data-wdb-out="day"></span><input type="range" min="1" max="365" step="1" value="${day0}" data-wdb="day" style="width:100%"></div>
<div>Time <span data-wdb-out="hour"></span><input type="range" min="0" max="24" step="0.25" value="${hour0.toFixed(2)}" data-wdb="hour" style="width:100%"></div>
<div>Weather <select data-wdb="wx"><option value="">the scene's own</option><option>clear</option><option>cloudy</option><option>rain</option><option>snow</option><option>fog</option></select>
<button type="button" data-wdb-play="day">Play a day</button> <button type="button" data-wdb-play="year">Play a year</button> <button type="button" data-wdb-play="stop">Stop</button></div>`;
  const q = (s) => p.querySelector(s), day = q('[data-wdb="day"]'), hour = q('[data-wdb="hour"]'), wx = q('[data-wdb="wx"]');
  const show = () => { q('[data-wdb-out="day"]').textContent = new Date(_wdbMsOf(+day.value, 0)).toISOString().slice(5, 10); const h = +hour.value; q('[data-wdb-out="hour"]').textContent = String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0') + ' UTC'; };
  const apply = () => { show(); _wdbState.ms = _wdbMsOf(+day.value, +hour.value); _wdbState.wx = wx.value || null; worldDevApply({ ms: _wdbState.ms, wx: _wdbState.wx }); };
  day.addEventListener('input', apply); hour.addEventListener('input', apply); wx.addEventListener('change', apply);
  for (const cb of p.querySelectorAll('[data-wdb-layer]')) cb.addEventListener('change', () => { _wdbState.layers[cb.getAttribute('data-wdb-layer')] = cb.checked; });
  const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  for (const b of p.querySelectorAll('[data-wdb-play]')) b.addEventListener('click', () => {
    if (_wdbState.play) { clearInterval(_wdbState.play); _wdbState.play = null; }
    const k = b.getAttribute('data-wdb-play');
    if (k === 'stop' || reduced) return;
    _wdbState.play = setInterval(() => {
      if (k === 'day') hour.value = String((+hour.value + 0.25) % 24); else day.value = String(+day.value % 365 + 2);
      apply();
    }, 400);
  });
  show();
  doc.body.appendChild(p);
  _wdbState.panel = p;
  return p;
}

if (typeof sceneRenderPassDefine === 'function') {
  sceneRenderPassDefine({
    id: 'world-debug',
    order: { framePost: 95, default: 95 },
    cache: false,
    applies(C) { return worldDevOn() && !!(C && C.id && typeof worldHostLive === 'function' && worldHostLive(C.id)); },
    framePost(env, ctx, t) {
      if (typeof document !== 'undefined') worldDevPanel(document);
      ctx.save();
      ctx.setTransform(env.vs || 1, 0, 0, env.vs || 1, env.ox || 0, env.oy || 0);
      const n = worldDebug(env, ctx, t);
      ctx.restore();
      return n;
    },
  });
}
