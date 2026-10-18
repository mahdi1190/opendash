// The pixel checks: what the frame SHOWS against what the world simulates (audit 15 Oct, bugs 1, 4, 7, 8, 12, 13, 17, 19;
// docs/dev/HANDOFF_WORLD_ENGINE.md "drawn vs simulated"; requirements R1, V5, H6, L2, L4, K4, A11, 16.1). Node >= 20, no
// dependencies; Chrome through tools/release-chrome.mjs (DevTools over a pipe: no port, never the user's live server).
//
// Every other check reads the simulation or the plan; none read the pixels, so ducks that were never drawn, trees with no crown,
// shadows of nothing and people on undrawn decks all passed. This one renders the real frame in the page and, for every entity
// and agent of the frame the renderer planned, draws it ALONE (render's own _wfrImage: the very sprite, transform and waterline
// cut the frame uses), builds an ownership buffer in the renderer's draw order (worldFrameOrder over the chunks and the agents,
// with the occluder redraws), and compares with the canvas:
//   px[id] = { a: its opaque pixels drawn alone, top: those in the top 40 % of its box, own: the pixels it should show (nothing
//              nearer covers them), match: the owned pixels whose canvas colour is its own }
// plus the water's gap pixels, the static shadows cast and their casters, whether each walker's feet land on drawn planks, the v2
// particle mode, the lit pixels of the picture (worldLitPixels) and the generated buildings with lit panes. The frame record and these fields go through worldInvariants IN THE PAGE
// (79-world-9inv.js rules drawn, crown, shadowOrphan, deckDrawn, particles, nightLight, waterGap, and every rule that reads the
// frame record), so the same rules judge Node runs and real frames.
//
//   WORLD_CHECK_RULES                       the rules run on a real frame (those that need no history)
//   worldCheckPlan(spec, o)                 -> [{ label, at, wx, t }]: o.dates (names of world.mjs DATES or ISO), o.times (scene
//                                              seconds; default 0, 90, 180), o.matrix (the V6 matrix at o.times)
//   worldCheckFrame(chrome, o)              -> { violations, stats, overlay (PNG buffer: the frame with every violation boxed) }
//                                              for the frame the page shows now (after page.set and page.frameAt(t))
//   worldCheck(chrome, src, o)              -> { cells: [{ label, t, violations, stats, file, overlay }], counts, errors }
//   worldCheckText(res, title)              a printable report
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { worldPageOpen, fileSafe, WORLD_SIZES } from './sheet.mjs';
import { worldMatrixCells, worldWeatherFits } from './adversarial.mjs';

/**
 * The lit pixels of a frame (RGBA bytes, W x H): pixels that are bright and warm the way lamp light and lit glass are (red over 150,
 * red at least 40 over blue, red plus green over 300) and that the night sky, moonlit stone and snow never are. The night check counts
 * them on the PICTURE: it used to read a light layer (S.lights.c) that the compositor never makes, so every night frame had 0 lit
 * pixels and failed, and no dusk frame was judged at all (the night-light audit, 18 Oct). Runs in Node and, by its source, in the page.
 */
export function worldLitPixels(F, W, H) {
  let n = 0;
  for (let p = 0, q = 0; p < W * H; p++, q += 4) { const r = F[q], g = F[q + 1], b = F[q + 2]; if (r > 150 && r - b >= 40 && r + g > 300) n++; }
  return n;
}

/** The rules a single real frame is judged by (the ones that need a frame history, popping and stuck, run in Node). */
export const WORLD_CHECK_RULES = Object.freeze(['drawn', 'crown', 'shadowOrphan', 'deckDrawn', 'particles', 'nightLight', 'waterGap', 'edgeCut', 'nearStatic',
  'crownCut', 'crowd', 'outfitClone', 'habitat', 'onWater', 'floating', 'giant', 'nearBand', 'order', 'season', 'orphan', 'shadowOnWater', 'reflectOutsideWater']);

export const WORLD_CHECK_DATES = Object.freeze({
  spring: '2026-04-18T14:00:00Z', summer: '2026-07-16T13:00:00Z', autumn: '2026-10-22T13:00:00Z', winter: '2026-01-20T13:00:00Z',
  night: '2026-07-16T22:30:00Z', dusk: '2026-10-22T17:15:00Z', 'winter-night': '2026-01-20T22:00:00Z',
});

/** The cells of a check run. */
export function worldCheckPlan(spec, o = {}) {
  const times = (o.times && o.times.length ? o.times : [0, 90, 180]).map(Number).filter(Number.isFinite);
  const out = [];
  if (o.matrix) {
    for (const c of worldMatrixCells(spec)) for (const t of times) out.push({ label: `${c.season} ${c.moment} ${c.wx}`, at: c.at, wx: c.wx === 'clear' ? null : c.wx, t });
    return out;
  }
  const dates = o.dates && o.dates.length ? o.dates : ['spring', 'summer', 'autumn', 'winter', 'night'];
  for (const d of dates) for (const t of times) out.push({ label: d, at: WORLD_CHECK_DATES[d] || d, wx: o.wx || null, t });
  return out;
}

/* ---------- the page side (runs in the scene page: every name below is a page global of 78-scene-* / 79-world-*) ---------- */
function pageProbe(opts, litPixels) {
  const out = { error: null, violations: [], stats: {}, overlay: null };
  const hosts = typeof _schHosts !== 'undefined' ? [..._schHosts.values()].filter(r => r.r) : [];
  const rec = hosts[0];
  if (!rec) { out.error = 'no scene host'; return out; }
  const R = rec.r, env = R.env, S = env && env._wfr;
  if (!S || !S.ready || !S.plan) { out.error = 'the world compositor has no bake (env._wfr): not a v3 scene, or the compositor is off'; return out; }
  const live = S.rec, world = live.world, cam = world.cam, vs = env.vs, ox = env.ox, oy = env.oy, W = env.W, H = env.H, t = Number(opts.t) || 0;
  // 1. the frame as the canvas shows it (the renderer's own snapshot at t: the same passes, the scrubbed scene time)
  const snap = R.snapshot(t);
  if (!snap) { out.error = 'no snapshot'; return out; }
  const F = snap.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  // 2. the agents exactly as _wfrDraw makes them (culled, near band, off frame), then the draw order
  const st = typeof worldHostAt === 'function' ? worldHostAt(live, t, { key: env, warming: false, still: !!env.still }) : { agents: [] };
  const aRecs = [], skipped = [];
  for (const a of st.agents || []) {
    if (a.culled && a.cullReason !== 'occluded') continue;
    const r = _wfrRec(_wfrAgentEnt(a), cam, { season: S.season, agent: true, regions: S.regions });
    if (!r) continue;
    if (!r.prim && r.z < cam.f * r.height / 405 && !a.framed) { skipped.push(r.id); continue; }
    if (r.box.x1 * vs + ox < -50 || r.box.x0 * vs + ox > W + 50 || r.box.y1 * vs + oy < -50) continue;
    r.agent = a; aRecs.push(r);
  }
  const movers = S.plan.live.concat(aRecs);
  const order = typeof worldFrameOrder === 'function' ? worldFrameOrder(S.plan.chunks, movers, null) : [];
  // 3. ownership in draw order: each record drawn alone, its opaque pixels own the frame until something later paints over them
  const own = new Int32Array(W * H).fill(-1), ownS = new Int32Array(W * H).fill(-1), exp = new Uint8ClampedArray(W * H * 3), recs = [], idx = new Map(), stat = [];
  const A_MIN = 160;
  const imgOf = (r) => { try { return _wfrImage(env, S, r, r.agent ? null : S.draw.get(r.id)); } catch (e) { return null; } };
  const paint = (r, clip) => {
    let k = idx.get(r.id);
    if (k == null) { k = recs.length; idx.set(r.id, k); recs.push(r); stat.push({ a: 0, top: 0, own: 0, match: 0, drawn: false, fa: 0, ft: 0 }); }
    const im = imgOf(r), s = stat[k];
    if (!im) { if (!clip) s.drawn = true; return; }
    const d = im.img.data, w = im.img.width, h = im.img.height, topY = (r.box.y0 + (r.box.y1 - r.box.y0) * 0.4) * vs + oy;
    for (let j = 0; j < h; j++) {
      const Y = im.y + j;
      if (Y < 0 || Y >= H) continue;
      if (clip && (Y < clip[1] || Y >= clip[3])) continue;
      for (let i = 0; i < w; i++) {
        const X = im.x + i, q = (j * w + i) * 4;
        if (X < 0 || X >= W || d[q + 3] < A_MIN) continue;
        if (clip && (X < clip[0] || X >= clip[2])) continue;
        if (!clip) { s.a++; if (Y < topY) s.top++; }
        const p = Y * W + X;
        own[p] = k; exp[p * 3] = d[q]; exp[p * 3 + 1] = d[q + 1]; exp[p * 3 + 2] = d[q + 2];
        if (!r.agent) ownS[p] = k;
      }
    }
    if (!clip) {
      s.drawn = true;
      // the faint pixels too (thin winter twigs at a distance are antialiased below the ownership alpha): the crown measure
      for (let j = 0; j < h; j++) { const Y = im.y + j; if (Y < 0 || Y >= H) continue; for (let i = 0; i < w; i++) { const a = d[(j * w + i) * 4 + 3]; if (a < 40) continue; s.fa++; if (Y < topY) s.ft++; } }
    }
  };
  let clip = null;
  for (const it of order) {
    if (it.kind === 'chunk') { for (const r of it.ref.ents || []) paint(r, null); continue; }
    if (it.kind === 'agent') { paint(it.ref, null); const b = it.ref.box; clip = [Math.floor(b.x0 * vs + ox) - 1, Math.floor(b.y0 * vs + oy) - 1, Math.ceil(b.x1 * vs + ox) + 1, Math.ceil(b.y1 * vs + oy) + 1]; continue; }
    if (it.kind === 'redraw' && clip) paint(it.ref, clip);
  }
  // static ownership before the agents (for the deck test: what lies under a walker's feet)
  // 4. compare: an owned pixel matches when the canvas shows its own colour (a lit window, rain or a lamp's glow may differ)
  // things drawn live (agents with their walk, paddle and flap poses; statics swaying in the wind) are matched within 2 px: the
  // posed parts move a little against the rest sprite drawn alone
  const TOL = Number(opts.tol) || 48, moving = recs.map(r => !!(r.agent || r.live));
  const near = (p, e) => {
    const X = p % W, Y = (p - X) / W;
    for (let dy = -2; dy <= 2; dy++) { const yy = Y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -2; dx <= 2; dx++) { const xx = X + dx; if (xx < 0 || xx >= W) continue; const q = (yy * W + xx) * 4; if (Math.abs(F[q] - exp[e]) <= TOL && Math.abs(F[q + 1] - exp[e + 1]) <= TOL && Math.abs(F[q + 2] - exp[e + 2]) <= TOL) return true; } }
    return false;
  };
  for (let p = 0; p < W * H; p++) {
    const k = own[p];
    if (k < 0) continue;
    const s = stat[k];
    s.own++;
    const q = p * 4, e = p * 3;
    if (Math.abs(F[q] - exp[e]) <= TOL && Math.abs(F[q + 1] - exp[e + 1]) <= TOL && Math.abs(F[q + 2] - exp[e + 2]) <= TOL) s.match++;
    else if (moving[k] && near(p, e)) s.match++;
  }
  // sp: does its sprite hold any pixel at all (its whole drawing, not only the part inside the frame)? A sprite whose every shape
  // was dropped (a winter crown deleted as 'leaf', bug 1) is cached empty (c: null); prims (extruded lines, buildings, hulls) count
  // as drawn when their alone image has pixels
  const spOf = (r) => {
    if (r.prim) return null;
    const d = !r.agent ? S.draw.get(r.id) : null;
    let sp = d && d.sp ? d.sp : null;
    if (!sp) { try { sp = _wfrSpriteOf(env, S, r, '*'); } catch (e) { sp = null; } }
    return sp && sp.c && sp.w > 0 && sp.h > 0 ? 1 : 0;
  };
  const px = {};
  recs.forEach((r, k) => { const s = stat[k], sp = spOf(r); px[r.id] = { a: s.a, top: s.top, fa: s.fa, ft: s.ft, own: s.own, match: s.match, sp: sp == null ? (s.a > 0 ? 1 : null) : sp, live: moving[k] ? 1 : 0 }; });
  // 5. what the world simulates but the plan left out: present statics (by the descriptor's state) with no draw record
  const absent = typeof _wfrAbsent === 'function' && S.tctx ? _wfrAbsent(world, S.tctx).set : new Set();
  const extra = [];
  for (const e of world.entities || []) {
    if (!e || e.static === false || !e.obj || absent.has(String(e.id))) continue;
    const id = _wfrId(e, e.obj);
    if (S.plan.byId.has(id)) continue;
    const r = _wfrRec(e, cam, { season: S.season, regions: S.regions });
    if (r && !(r.box.x1 < -1800 || r.box.x0 > 3400 || r.box.y1 < -900 || r.box.y0 > 1800)) extra.push(r);
  }
  // 6. the water's gap pixels (H6): inside the water outlines, nothing owns the pixel and the canvas is transparent there
  let gaps = 0, M = null;
  if (S.wet && S.wet.water && S.wet.water.length) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(vs, 0, 0, vs, ox, oy); g.fillStyle = '#fff';
    for (const P of S.wet.water) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); g.fill(); }
    if (S.wet.over && S.wet.over.length) { g.globalCompositeOperation = 'destination-out'; for (const P of S.wet.over) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); g.fill(); } }
    M = g.getImageData(0, 0, W, H).data;
    for (let p = 0; p < W * H; p++) if (M[p * 4 + 3] > 200 && own[p] < 0 && F[p * 4 + 3] < 250) gaps++;
  }
  // 7. the static shadows cast this frame (look's plan, the layer the bake drew) and their casters
  const shadowsCast = [];
  const sh = S.shadow && S.shadow.plan ? S.shadow.plan : [];
  for (const s of sh) if (s && s.ref != null && s.kind !== 'contact') { const r = S.plan.byId.get(String(s.ref)); shadowsCast.push({ ref: String(s.ref), kind: s.kind || 'cast', obj: r ? r.obj : null }); }
  // 8. the walkers' feet in the PICTURE: false when the pixels under the feet are open water (inside the water outline, outside
  // every surface the compositor paints over it, and no static drawn there). Bug 7: birders stood on the nav deck where no
  // planks were drawn. Only a clear case counts: three foot pixels all on visible water.
  const deckFoot = {};
  for (const r of aRecs) {
    const a = r.agent;
    if (!a || !M || a.layer === 'air' || a.layer === 'swim' || a.layer === 'wade' || a.layer === 'fly') continue;
    const Xd = Math.round((r.box.x0 + r.box.x1) / 2 * vs + ox), Yd = Math.round(r.box.y1 * vs + oy) - 1, half = Math.max(1, Math.round((r.box.x1 - r.box.x0) * vs * 0.15));
    let water = 0, seen = 0;
    for (const xx of [Xd - half, Xd, Xd + half]) {
      if (xx < 0 || Yd < 0 || xx >= W || Yd >= H) continue;
      seen++;
      const p = Yd * W + xx;
      if (M[p * 4 + 3] > 200 && ownS[p] < 0) water++;
    }
    deckFoot[r.id] = !(seen === 3 && water === 3);
  }
  // 9. lights: the lit pixels of the PICTURE (worldLitPixels: warm and bright), the on lights (look's worldLights), the generated
  // buildings whose panes are lit now (worldBuildingGlassMask at the frame's sun), the sun, the particle mode
  const litPx = typeof litPixels === 'function' ? litPixels(F, W, H) : null;
  let glassLit = 0;
  const LN = S.lightNow;
  if (LN && typeof worldBuildingGlassMask === 'function') for (const r of S.plan.recs) if (r.prim && r.prim.kind === 'building' && r.prim.direct && (r.prim.direct.shapes || []).some(sh => sh && sh.glow) && worldBuildingGlassMask(String(r.id), LN.alt, LN.share, LN.murky, LN.sky ? LN.sky.localHour : null)) glassLit++;
  let lights = [];
  try { const L = env.Lnow || env.L; lights = typeof worldLights === 'function' ? (worldLights({ entities: S.plan.recs.filter(r => !r.prim).map(r => Object.assign({}, r.ent, { id: r.id })) }, { sky: S.sky || undefined, L, season: S.season }) || []).map(l => ({ ref: l.ref, kind: l.kind, on: !!l.on })) : []; } catch (e) { lights = []; }
  const L = env.Lnow || env.L, sun = S.sky && S.sky.sun ? { az: S.sky.sun.az, alt: S.sky.sun.alt } : L ? { az: L.az, alt: L.alt } : null;
  const P = env.C && env.C.particles;
  const particles = P && typeof P === 'object' ? (P.n > 0 && P.kind ? P.kind : 'none') : typeof P === 'string' ? P : live.data && live.data.particles !== undefined ? (typeof live.data.particles === 'object' ? live.data.particles.kind : live.data.particles) : null;
  // 10. the frame record of what was planned and drawn, judged by the invariant checker in this page
  const recOf = (r, agent) => {
    const e = r.ent, a = r.agent || {};
    return { id: r.id, cls: e.cls || null, obj: e.obj, static: !agent, auto: e.auto || null, landmark: !!e.landmark, framing: !!(e.framing || e.framed), x: r.x, y: r.y, z: r.z,
      facing: Number(e.facing) || 0, foot: r.foot, height: r.height, layer: e.layer || null, host: e.host || null, parent: e.parent || null, view: r.view, mirror: !!r.mirror,
      box: [r.box.x0, r.box.y0, r.box.x1, r.box.y1], order: null, speed: agent ? Math.hypot(e.vx || 0, e.vz || 0) : 0, vx: agent ? e.vx || 0 : 0, vz: agent ? e.vz || 0 : 0,
      state: agent ? a.state || null : null, attach: e.attach || null, deck: e.deck || null, prim: r.prim ? r.prim.kind || null : null, spans: !!(r.prim && r.prim.spans), backdrop: !!r.backdrop, decal: !!e.decal,
      variant: agent ? (a.variant != null ? a.variant : r.v) : r.v, outfit: agent ? a.outfit : null, group: agent ? a.group : null, pose: agent ? a.pose || null : null, age: agent ? a.age || null : null,
      framed: !!(a.framed || e.framed), solidity: e.solidity || null, waterline: Number.isFinite(e.waterline) ? e.waterline : null };
  };
  // draw positions and the occluder redraws (each redraw paints over the mover drawn just before it), as worldFrameAt records them
  const pos = new Map(), redrawn = new Map();
  let p = 0, lastAgent = null;
  for (const it of order) {
    if (it.kind === 'chunk') for (const r of it.ref.ents || []) pos.set(r.id, p++);
    else if (it.kind === 'redraw') { const k = it.ref.id; if (!redrawn.has(k)) redrawn.set(k, []); if (lastAgent != null) redrawn.get(k).push(lastAgent); p++; if (!pos.has(k)) pos.set(k, p - 1); }
    else { pos.set(it.ref.id, p++); lastAgent = it.ref.id; }
  }
  const ents = S.plan.recs.map(r => recOf(r, false)).concat(extra.map(r => recOf(r, false)), aRecs.map(r => recOf(r, true)));
  for (const e of ents) { if (pos.has(e.id)) e.order = pos.get(e.id); if (e.static && redrawn.has(e.id)) e.redrawFor = redrawn.get(e.id).slice(); }
  const ctx = S.tctx ? JSON.parse(JSON.stringify(S.tctx)) : null;
  const frame = { t, ctx, cam: { f: cam.f, x0: cam.x0, horizon: cam.horizon, eye: cam.eye, heading: cam.heading, fov: cam.fov, water: cam.water, dMin: cam.dMin }, W: W / vs, H: H / vs, ents,
    surfaces: world.surfaces || [], season: S.season, sun, lights, px, shadowsCast, deckFoot, particles, litPx, glassLit, waterGaps: gaps };
  const rules = opts.rules || null;
  let v = [];
  const stI = {};
  try { v = worldInvariants(frame, { world, rules, stats: stI, agents: st.agents || [] }); } catch (e) { out.error = 'worldInvariants threw: ' + (e && e.message); }
  out.violations = v;
  let lost = 0, empty = 0;
  recs.forEach((r) => { const q = px[r.id]; if (q.sp === 0) empty++; else if (q.own >= (r.agent ? 30 : q.live ? 200 : 40) && q.match / q.own < 0.3) lost++; });
  out.stats = { W, H, statics: S.plan.recs.length, agents: aRecs.length, simAgents: (st.agents || []).length, nearSkipped: skipped.length, notPlanned: extra.length,
    emptySprites: empty, lostOnCanvas: lost, waterGaps: gaps, litPx, shadows: shadowsCast.length, particles, sunAlt: sun ? Math.round(sun.alt * 10) / 10 : null, ran: stI.ran || [], na: stI.na || [] };
  // 11. the overlay: the frame with every violation boxed in red and named
  if (opts.overlay !== false) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(snap, 0, 0);
    const byId = new Map(ents.map(e => [String(e.id), e]));
    g.lineWidth = 2; g.font = '12px system-ui, sans-serif';
    let row = 0;
    for (const x of v) {
      const e = x.id != null ? byId.get(String(x.id)) : null, b = e && e.box;
      if (b) {
        const X0 = b[0] * vs + ox, Y0 = b[1] * vs + oy, X1 = b[2] * vs + ox, Y1 = b[3] * vs + oy;
        g.strokeStyle = 'rgba(255,0,60,0.95)'; g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
        g.fillStyle = 'rgba(0,0,0,0.6)'; const s = x.rule + ': ' + (e.obj || x.id); g.fillRect(Math.max(0, X0), Math.max(0, Y0) - 14, g.measureText(s).width + 6, 14);
        g.fillStyle = '#ff6b8a'; g.fillText(s, Math.max(0, X0) + 3, Math.max(0, Y0) - 3);
      } else if (row < 12) {
        const s = x.rule + ': ' + x.msg.slice(0, 140);
        g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(8, 8 + row * 16, g.measureText(s).width + 8, 15); g.fillStyle = '#ff6b8a'; g.fillText(s, 12, 20 + row * 16); row++;
      }
    }
    out.overlay = c.toDataURL('image/png');
  }
  return out;
}

/** The pixel check of the frame the page shows now. o: { t, rules, tol, overlay }. */
export async function worldCheckFrame(chrome, o = {}) {
  const r = await chrome.evaluate(`(${pageProbe.toString()})(${JSON.stringify({ t: o.t || 0, rules: o.rules || WORLD_CHECK_RULES, tol: o.tol, overlay: o.overlay })}, ${worldLitPixels.toString()})`);
  if (!r) return { error: 'the probe returned nothing', violations: [], stats: {} };
  if (r.overlay) r.overlay = Buffer.from(String(r.overlay).replace(/^data:image\/png;base64,/, ''), 'base64');
  return r;
}

/**
 * Check a scene's real frames. src: { spec, id, ref }. o: { dates, times, matrix, wx, dir, root, rules, force (a weather that does
 * not fit its date is refused unless force), onCell }.
 */
export async function worldCheck(chrome, src, o = {}) {
  const spec = src.spec || {}, lat = spec.place && Number.isFinite(spec.place.lat) ? spec.place.lat : 51.5;
  const cells = worldCheckPlan(spec, o), dir = o.dir || join(tmpdir(), 'opendash-world', 'check'), name = fileSafe(src.ref || src.id || 'world');
  mkdirSync(dir, { recursive: true });
  const res = { cells: [], counts: {}, errors: [], dir };
  let page = null;
  for (const c of cells) {
    const fit = worldWeatherFits(c.wx, c.at, lat);
    if (!fit.ok && !o.force) { res.errors.push(`${c.label}: refused: ${fit.why}`); continue; }
    try {
      // a LIVE page (sheet.mjs): the life advances to each pinned scene time (a still page shows the base moment in every frame);
      // a new date, or a time before the last one, starts the loop again from its seed (page.rewind)
      if (!page) { page = await worldPageOpen(chrome, src, { size: WORLD_SIZES['16:9'], at: c.at, wx: c.wx, root: o.root, live: true }); page.cur = c.at + '|' + c.wx; page.lastT = null; }
      if (page.cur !== c.at + '|' + c.wx) { await page.set({ at: c.at, wx: c.wx || null }); page.cur = c.at + '|' + c.wx; page.lastT = null; }
      if (page.lastT == null || c.t < page.lastT) await page.rewind();
      page.lastT = c.t;
      const ok = await page.frameAt(c.t);
      if (ok !== true) throw new Error('no canvas renderer');
      const r = await worldCheckFrame(chrome, { t: c.t, rules: o.rules, tol: o.tol });
      if (r.error) res.errors.push(`${c.label} t ${c.t}: ${r.error}`);
      const base = `${name}--${fileSafe(c.label)}--t${String(Math.round(c.t)).padStart(4, '0')}`;
      const file = join(dir, base + '.png');
      writeFileSync(file, await page.png());
      let overlay = null;
      if (r.overlay) { overlay = join(dir, base + '--check.png'); writeFileSync(overlay, r.overlay); }
      for (const v of r.violations || []) res.counts[v.rule] = (res.counts[v.rule] || 0) + 1;
      const cell = { label: c.label, at: c.at, wx: c.wx, t: c.t, violations: r.violations || [], stats: r.stats || {}, file, overlay };
      res.cells.push(cell);
      if (o.onCell) o.onCell(cell);
    } catch (e) { res.errors.push(`${c.label} t ${c.t}: ${e.message}`); }
  }
  if (page) for (const e of await page.errors()) res.errors.push('page: ' + e);
  res.ok = !res.errors.length && res.cells.every(c => !c.violations.length);
  return res;
}

/** One line per cell, the violations grouped by rule under it. */
export function worldCheckText(res, title = '') {
  const out = [`world check${title ? ': ' + title : ''} (the real frames against the simulation)`];
  for (const c of res.cells) {
    const by = {};
    for (const v of c.violations) (by[v.rule] = by[v.rule] || []).push(v);
    const s = c.stats || {};
    out.push(`${c.violations.length ? 'FAIL' : 'ok  '} ${c.label} t ${c.t}: ${c.violations.length} violation(s); ${s.statics} statics, ${s.agents}/${s.simAgents} agents drawn, ${s.emptySprites} empty sprites, ${s.lostOnCanvas} lost on the canvas, ${s.waterGaps} water gap px, ${s.litPx} lit px, sun ${s.sunAlt}`);
    for (const [k, list] of Object.entries(by)) out.push(`       ${k.padEnd(14)} ${String(list.length).padStart(4)}  e.g. ${list[0].msg}`);
    if (c.overlay) out.push(`       overlay: ${c.overlay}`);
  }
  for (const e of res.errors) out.push('  ERROR ' + e);
  return out.join('\n');
}
