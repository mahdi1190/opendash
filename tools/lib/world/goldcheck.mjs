// GOLD-RELATIVE checks of a world scene (docs/dev/SCENE_FACTORY.md 4): what made Fleet Pond 2 and Albert Square good, measured on
// the BUILT world (after the solver and the fill), beside the same numbers for the archetype's gold scene. They replace the box
// critic's verdict, which scored a scene that had lost its subject level with Fleet Pond. One pass, about 1-3 s a scene; a review
// number for the author, never a gate.
//
//   goldChecks(E, spec, o)   -> { checks: [{ id, label, ok, value, want }], pass, of, world, budget, drops, ms }
//        o: { plan (archetypes.mjs: subject, lead, framing, far, near), checks (the archetype's: sky, framing, farMover, nearLife),
//             gold (another goldChecks result: its numbers are printed beside and set the relative bars), seconds (life sample, 12) }
//   goldText(r, title, gold)  -> printable lines
//   loadBudget(E, world, o)   -> { statics, buildings, chunks, biggestChunk, live, agents, sprites, buildMs }
//
// The checks: subject (the landmark or the plan's subject is in the built world, at least 60 % of it inside the frame, its centre
// off the frame's edges), lead (a ground line from the frame's foot into the vista), framing (tall things cut by both sides of the
// frame within 40 m), sky (the share of open sky in the archetype's range), near (the near band dressed: the box cover at least
// 60 % of the gold's), facade (no single building over 30 % of the frame), farMover (something moves in the far band in the
// first 10 s), nearLife (people or animals in the near-mid band in the first 12 s), landmarks (every authored landmark kept),
// statics (no static person.* entity: standing and sitting people come from populations with goals).
import { criticRecordsOfWorld, criticScore, boxOf, buildingBox } from './critic.mjs';
import { frameCam, leadingLine } from './frame.mjs';
import { glitchLoad } from './glitch.mjs';

/** The open sky the eye sees on a summer-noon render (a PNG): blue sky and white cloud pixels above the horizon, a share of the frame. */
export function skyShareOfPng(file, horizon) {
  const img = glitchLoad(file), W = img.width, H = img.height, d = img.data, ch = d.length / (W * H), hz = Math.min(H, Math.round((horizon / 900) * H) + 2);
  let n = 0, k = 0;
  for (let y = 0; y < hz; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * ch, r = d[i], g = d[i + 1], b = d[i + 2];
    if ((b > r + 25 && b > g + 5 && b > 110) || (r > 215 && g > 220 && b > 225)) n++;
  }
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) k++;
  return Math.round(n / k * 100) / 100;
}

const r2 = (v) => Math.round(v * 100) / 100;
const COLS = 64, ROWS = 36;

function subjectBox(E, world, cam, plan, spec) {
  const sid = plan && plan.subject ? plan.subject.id || null : null, kind = plan && plan.subject ? plan.subject.kind : null;
  if (kind === 'surface' || (!kind && sid)) {
    const s = (world.surfaces || []).find(x => x.id === sid);
    if (s) {
      const pts = s.path || s.poly || [];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of pts) { if (!(p[1] > 0.3)) continue; const q = E.sceneProject(cam, p[0], p[1], 0); x0 = Math.min(x0, q.X); x1 = Math.max(x1, q.X); y0 = Math.min(y0, q.Y - 30); y1 = Math.max(y1, q.Y); }
      if (x0 <= x1) return { id: sid, box: [x0, y0, x1, y1] };
    }
    if (kind === 'surface') return { id: sid, box: null, lost: true };
  }
  if (kind !== 'landmark') {
    const b = (world.buildings || []).find(x => (sid && x.id === sid) || (!sid && x.landmark)) || (kind === 'building' ? null : null);
    if (b) return { id: b.id, box: buildingBox(E, cam, b, world.season || 'summer') };
    if (kind === 'building') return { id: sid, box: null, lost: true };
  }
  const sobj = plan && plan.subject ? plan.subject.obj : null;
  const e = (world.entities || []).find(x => (sobj && x.obj === sobj) || (sid && x.id === sid) || (!sid && !sobj && x.landmark));
  if (e) return { id: e.id || e.obj, box: boxOf(E, cam, e) };
  if (sid || (spec.landmarks || []).length) return { id: sid || (spec.landmarks[0].id || spec.landmarks[0].obj), box: null, lost: true };
  const lb = (world.buildings || []).find(x => x.landmark);
  if (lb) return { id: lb.id, box: buildingBox(E, cam, lb, world.season || 'summer') };
  return null;
}
function leadOf(spec, plan) {
  if (plan && Array.isArray(plan.lead) && plan.lead.length > 1) return plan.lead;
  if (Array.isArray(spec.marsh) && spec.marsh[0] && Array.isArray(spec.marsh[0].walk)) return spec.marsh[0].walk;
  // the longest ground path that starts near the camera
  let best = null, bestLen = 0;
  for (const s of spec.surfaces || []) {
    if (!Array.isArray(s.path) || !/path|pavement|towpath|road|boardwalk|plaza|tram|rail/.test(s.kind)) continue;
    const z0 = Math.min(...s.path.map(p => p[1])), len = Math.max(...s.path.map(p => p[1])) - z0;
    if (z0 < 12 && len > bestLen) { best = s.path; bestLen = len; }
  }
  if (best) return best;
  // else a long walkable or water polygon's centre line
  for (const s of spec.surfaces || []) {
    if (!Array.isArray(s.poly) || !/water|towpath|pavement|path|plaza/.test(s.kind)) continue;
    const zs = s.poly.map(p => p[1]), z0 = Math.min(...zs), z1 = Math.max(...zs);
    if (z0 > 12 || z1 - z0 < 60) continue;
    const line = [];
    for (let k = 0; k < 6; k++) { const z = z0 + 1 + (Math.min(z1, 400) - z0 - 1) * (k / 5) ** 2, xs = []; for (let i = 0; i < s.poly.length; i++) { const a = s.poly[i], b = s.poly[(i + 1) % s.poly.length]; if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) xs.push(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])); } if (xs.length >= 2) line.push([(Math.min(...xs) + Math.max(...xs)) / 2, z]); }
    if (line.length > 2) return line;
  }
  return null;
}

/** The load budget of a built world: what the opening has to bake and draw. */
export function loadBudget(E, world, o = {}) {
  const ents = world.entities || [];
  const out = { statics: ents.length, buildings: (world.buildings || []).length, chunks: null, biggestChunk: null, live: null, agents: o.agents == null ? null : o.agents, sprites: null, buildMs: o.buildMs == null ? null : o.buildMs };
  const kinds = new Set(ents.map(e => e.obj + '#' + (e.variant == null ? '' : e.variant)));
  for (const a of o.agentObjs || []) kinds.add(a);
  out.sprites = kinds.size;
  if (E.worldFramePlan) {
    try {
      const plan = E.worldFramePlan(world, { season: o.season || 'summer', cam: world.cam });
      const sizes = (plan.chunks || []).map(c => (c.ents || []).length), total = sizes.reduce((a, b) => a + b, 0);
      out.chunks = sizes.length; out.biggestChunk = total ? r2(Math.max(...sizes) / total) : 0; out.live = (plan.live || []).length;
    } catch (e) { out.chunkError = String(e && e.message || e).slice(0, 120); }
  }
  return out;
}

/** Sample the life for o.seconds: the far mover and the near-mid life (the population sim in Node, no browser). */
function lifeSample(E, world, cam, o) {
  const res = { farMoverAt: null, nearLife: 0, maxAgents: 0, objs: new Set(), error: null };
  if (!E.worldNavBuild || !E.worldLifeInit || !E.worldLifeTick || !E.worldAgents) { res.error = 'no life engine'; return res; }
  try {
    const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0), dt = 0.1, start = new Map(), near = new Set();
    // the host warms the life up before the first frame (WORLD_HOST_WARM_S, 90 s): sample what the opening shows, not an empty start
    for (let t = 0; t < (o.warm == null ? 60 : o.warm); t += 0.25) E.worldLifeTick(life, 0.25);
    const farZ = o.farZ || 60, inFrame = (a) => { const p = E.sceneProject(cam, a.x, Math.max(0.3, a.z), a.y || 0); return p.X > 0 && p.X < 1600 && p.Y > 0 && p.Y < 900; };
    for (let t = 0; t <= (o.seconds || 12); t += dt) {
      if (t > 0) E.worldLifeTick(life, dt);
      const now = E.worldAgents(life) || [];
      res.maxAgents = Math.max(res.maxAgents, now.length);
      for (const a of now) {
        res.objs.add(String(a.obj || a.cls || ''));
        if (!start.has(a.id)) start.set(a.id, { x: a.x, z: a.z });
        const s = start.get(a.id);
        if (res.farMoverAt == null && t <= 10 && a.z >= farZ && a.layer !== 'air' && inFrame(a) && Math.hypot(a.x - s.x, a.z - s.z) > 2) res.farMoverAt = Math.round(t * 10) / 10;
        if (a.layer !== 'air' && a.z > 3 && a.z < 40 && inFrame(a)) near.add(a.id);
      }
    }
    res.nearLife = near.size;
  } catch (e) { res.error = String(e && e.message || e).slice(0, 160); }
  return res;
}

export function goldChecks(E, spec, o = {}) {
  const t0 = Date.now();
  const world = o.world || E.worldBuild(JSON.parse(JSON.stringify(spec)), { season: o.season || 'summer' });
  const buildMs = Date.now() - t0;
  const cam = world.cam || E.sceneCamera({ camera: spec.camera }), fc = frameCam(spec.camera || {}), C = o.checks || {}, gold = o.gold || null, plan = o.plan || null;
  const checks = [], add = (id, label, ok, value, want) => checks.push({ id, label, ok: ok == null ? null : !!ok, value, want });
  const gv = (id) => { const g = gold && gold.checks.find(c => c.id === id); return g ? (typeof g.value === 'string' && /^[0-9.]+ /.test(g.value) ? parseFloat(g.value) : g.value) : null; };
  // subject
  const sb = subjectBox(E, world, cam, plan, spec);
  if (!sb) add('subject', 'subject in view', null, 'none declared', 'a landmark or plan.subject');
  else if (!sb.box) add('subject', 'subject in view', false, `${sb.id}: LOST in the build`, '>= 60 % in frame');
  else {
    const b = sb.box, w = Math.max(1, b[2] - b[0]), share = Math.max(0, Math.min(1600, b[2]) - Math.max(0, b[0])) / w, cx = (b[0] + b[2]) / 2, h = Math.min(900, b[3]) - Math.max(0, b[1]);
    add('subject', 'subject in view', share >= 0.6 && cx > 1600 * 0.1 && cx < 1600 * 0.9 && h > 900 * 0.05, `${sb.id}: ${Math.round(share * 100)} % in, centre ${Math.round(cx / 16)} %, ${Math.round(h / 9)} % tall`, '>= 60 % in, centre 10-90 %, >= 5 % tall');
  }
  // leading line
  const lead = leadOf(spec, plan), ll = lead ? leadingLine(fc, lead) : { meets: false };
  add('lead', 'leading line', ll.meets, lead ? `foot ${ll.startY != null ? Math.round(Math.min(900, ll.startY) / 9) : '-'} % -> vista ${ll.endX != null ? Math.round(ll.endX / 16) + ' % x, ' + Math.round(ll.endY / 9) + ' % y' : '-'}` : 'none', 'from the foot of the frame into the middle 70 % near the horizon');
  // the critic's records: framing, sky, near cover, facades
  const records = criticRecordsOfWorld(E, world, { season: world.season || 'summer' });
  let L = 0, R = 0;
  for (const r of records) {
    const b = r.box; if (!b || r.backdrop || !(r.z < 40)) continue;
    const tall = b[1] < 900 * 0.5 && (b[3] - b[1]) > 900 * 0.25;
    if (!tall) continue;
    if (b[0] < 1600 * 0.04 && b[2] > 1600 * 0.06) L++;
    if (b[2] > 1600 * 0.96 && b[0] < 1600 * 0.94) R++;
  }
  const needF = C.framing == null ? 2 : C.framing;
  add('framing', 'framing both sides', needF < 2 ? L + R >= needF : L > 0 && R > 0, `left ${L}, right ${R}`, needF < 2 ? `>= ${needF}` : 'both sides');
  const covered = new Uint8Array(COLS * ROWS), hz = cam.horizon;
  for (const r of records) { const b = r.box; if (!b || r.backdrop) continue; const c0 = Math.max(0, Math.floor(b[0] / 1600 * COLS)), c1 = Math.min(COLS - 1, Math.floor(b[2] / 1600 * COLS)), w0 = Math.max(0, Math.floor(b[1] / 900 * ROWS)), w1 = Math.min(ROWS - 1, Math.floor(b[3] / 900 * ROWS)); for (let j = w0; j <= w1; j++) for (let i = c0; i <= c1; i++) covered[j * COLS + i] = 1; }
  let sky = 0;
  for (let j = 0; j < ROWS; j++) { const Y = (j + 0.5) * 900 / ROWS; if (Y > hz) continue; for (let i = 0; i < COLS; i++) if (!covered[j * COLS + i]) sky++; }
  // the sky's range: within 0.15 of the gold's share (the same box measure on both), else the archetype's range
  const gsky = gv('sky'), skyShare = o.skyPng ? skyShareOfPng(o.skyPng, hz) : r2(sky / (COLS * ROWS)), sr = Number.isFinite(gsky) ? [r2(Math.max(0.03, gsky - 0.15)), r2(gsky + 0.15)] : C.sky || [0.05, 0.45];
  add('sky', 'sky share', skyShare >= sr[0] && skyShare <= sr[1], skyShare + (o.skyPng ? ' (render)' : ' (boxes)'), `${sr[0]}-${sr[1]}`);
  const score = criticScore(records, { horizon: hz }), nc = score.near ? score.near.cover : 0, gnc = gv('near');
  add('near', 'near band dressed', gnc != null ? nc >= gnc * 0.6 : nc >= 0.2, r2(nc), gnc != null ? `>= ${r2(gnc * 0.6)} (60 % of the gold's ${gnc})` : '>= 0.2');
  let facade = 0, facadeId = '';
  for (const b of world.buildings || []) { const bx = buildingBox(E, cam, b, world.season || 'summer'); if (!bx || b.landmark) continue; const a = (Math.min(1600, bx[2]) - Math.max(0, bx[0])) * (Math.min(900, bx[3]) - Math.max(0, bx[1])) / (1600 * 900); if (a > facade) { facade = a; facadeId = b.id; } }
  add('facade', 'no blank facade', facade <= 0.3, `${Math.round(facade * 100)} %${facadeId ? ' (' + facadeId + ')' : ''}`, '<= 30 % of the frame for one building');
  // life in the first seconds
  const ls = lifeSample(E, world, cam, { seconds: o.seconds || 12, farZ: C.farMover || 60 });
  add('farMover', 'a far mover early', ls.error ? null : ls.farMoverAt != null, ls.error ? ls.error : ls.farMoverAt != null ? `moving at ${ls.farMoverAt} s` : 'none in 10 s', `beyond ${C.farMover || 60} m within 10 s`);
  add('nearLife', 'life near-mid', ls.error ? null : ls.nearLife >= (C.nearLife || 1), ls.error ? ls.error : `${ls.nearLife} in 12 s`, `>= ${C.nearLife || 1} people or animals at 3-40 m`);
  // landmarks kept; no static people
  const lmWant = (spec.landmarks || []).length, lmHave = (world.entities || []).filter(e => e.landmark).length;
  add('landmarks', 'landmarks kept', lmHave >= lmWant, `${lmHave} of ${lmWant}`, 'all');
  const stat = (spec.entities || []).filter(e => /^person\./.test(String(e.obj || ''))).length;
  add('statics', 'no static people', stat === 0, stat, '0 (people come from populations with goals)');
  const log = Array.isArray(world.log) ? world.log : [];
  const drops = { drop: 0, move: 0, snap: 0, fill: 0, dress: 0, frame: 0 };
  for (const l of log) if (l && drops[l.action] != null) drops[l.action]++;
  const budget = loadBudget(E, world, { buildMs, agents: ls.maxAgents, agentObjs: [...ls.objs] });
  const scored = checks.filter(c => c.ok != null);
  return { checks, pass: scored.filter(c => c.ok).length, of: scored.length, world, budget, drops, dropped: log.filter(l => l && l.action === 'drop').slice(0, 12).map(l => `${l.id || l.obj || l.path || ''} [${l.rule}] ${l.reason || ''}`.slice(0, 160)), ms: Date.now() - t0 };
}

export function goldText(r, title = '', gold = null) {
  const out = [`gold checks: ${title}  ${r.pass}/${r.of}${gold ? `  (gold ${gold.pass}/${gold.of})` : ''}`];
  for (const c of r.checks) {
    const g = gold && gold.checks.find(x => x.id === c.id);
    out.push(`  ${c.ok == null ? ' -- ' : c.ok ? ' ok ' : 'MISS'} ${c.label.padEnd(20)} ${String(c.value).padEnd(44)} ${g ? '| gold: ' + g.value : ''}${c.ok === false ? '  want ' + c.want : ''}`);
  }
  const B = r.budget;
  out.push(`  budget: ${B.statics} statics, ${B.buildings} buildings, ${B.chunks == null ? '?' : B.chunks} chunks (biggest ${B.biggestChunk == null ? '?' : Math.round(B.biggestChunk * 100) + ' %'}), ${B.live == null ? '?' : B.live} live statics, ${B.agents} agents, ${B.sprites} distinct sprites, build ${B.buildMs} ms`);
  out.push(`  solver / fill: ${Object.entries(r.drops).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const d of r.dropped) out.push('    drop ' + d);
  return out;
}
