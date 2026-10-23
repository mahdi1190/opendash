// The world critic (docs/dev/WORLD_ENGINE.md 6 step 6, 12.3, 12.4, 16.4; requirements P7, C1, C4, C6, U3, U4). Node >= 20, no dependencies.
//
//   criticRecordsOfWorld(E, world, o)       -> [{ obj, cls, z, box }]: a v3 world's statics, its generated buildings (by the extruder's
//                                              box) and its backdrop bands as screen boxes
//   criticRecordsOfData(E, data, o)         -> the same for v2 / v1 scene data, from the v2 compile (every placed, scattered and kit item;
//                                              a generated building by its projected box)
//   criticScore(records, o)                 -> { near, mid, far: { cover, variety, n }, bare, score }: ONE method for both sides, so a
//                                              converted scene and its source are judged alike (the box measure, 0..100)
//   worldCritic(E, spec, o)                 -> { score, richness, worldRichness, coverage, framing: { cuts, landmarks }, problems, by }
//   criticOfRef(E, ref, o)                  -> the critic of a registered scene: a v3 item (its spec) or a v2 / v1 item (its data)
//   criticAgainst(E, spec, sourceRef, o)    -> { v3, source, ok, margin }: the converted scene must score at least its source (P7, U4)
//   criticText(c, title)                    -> a printable report
//
// The box measure: the frame (1600 x 900 scene units) is sampled on a 64 x 36 grid; a sample is covered by a band when a box of that
// band holds it. near: z < 15 m, mid: 15-80 m, far: beyond (the backdrop counts as far). score = sum over bands of
// weight x (0.4 cover / target + 0.3 variety / target + 0.3 log density / target, each capped at 1), x 100. kb's worldRichness (the floor) is reported beside it
// for the v3 world when it is loaded, and look's worldCoverage (C6) and appearance's worldFrameCheck / worldLandmarkCheck (C1, C4)
// when they are; otherwise the invariant checker's edgeCut and landmark rules stand in.

// targets: a rich scene of the corpus (the proof scenes) reaches about 90; the user's "much emptier" conversions scored 50-70
export const CRITIC_BANDS = Object.freeze([
  { id: 'near', z0: 0, z1: 15, w: 0.3, cover: 0.4, variety: 10, n: 80 },
  { id: 'mid', z0: 15, z1: 80, w: 0.45, cover: 0.6, variety: 25, n: 300 },
  { id: 'far', z0: 80, z1: Infinity, w: 0.25, cover: 0.25, variety: 15, n: 500 },
]);
const W0 = 1600, H0 = 900, COLS = 64, ROWS = 36;
const r3 = (v) => Math.round(v * 1000) / 1000;
const r1 = (v) => Math.round(v * 10) / 10;

function camOf(E, world, spec) {
  if (world && world.cam) return world.cam;
  if (E.sceneCamera && spec && spec.camera) return E.sceneCamera({ camera: spec.camera });
  return null;
}
function boxOf(E, cam, e) {
  if (E.worldEntityBox) { try { const b = E.worldEntityBox(cam, e); if (b && b.every(Number.isFinite)) return b; } catch { /* below */ } }
  const info = E.worldObjectInfo ? E.worldObjectInfo(e.obj) : null, h = Number.isFinite(e.height) ? e.height : info ? info.size.h : 1, w = info ? info.size.w : h;
  const p = E.sceneProject(cam, e.x, Math.max(0.3, e.z), Number.isFinite(e.y) ? e.y : 0), k = cam.f / Math.max(0.3, e.z);
  return [p.X - w * k / 2, p.Y - h * k, p.X + w * k / 2, p.Y];
}

/** A v3 world's statics and backdrop as critic records. o: { season, backdrop (false: leave the bands out) }. */
export function criticRecordsOfWorld(E, world, o = {}) {
  const cam = camOf(E, world, null), out = [];
  if (!cam) return out;
  const ents = (world.entities || []).filter(e => e && e.obj && e.z > 0.3);
  let bands = [];
  if (o.backdrop !== false && E.worldBackdrop) { try { bands = (E.worldBackdrop(world, cam, o.season || world.season || 'summer') || []).filter(b => b && b.obj && b.z > 0); } catch { bands = []; } }
  // hedge surfaces draw their hedge object along the line (the host: one piece every 2 m) unless the world already expanded them
  const hedgeEnts = [];
  for (const s of world.surfaces || []) {
    if (s.kind !== 'hedge' || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj || 'plant.towpath-hedge';
    if (ents.some(e => e.obj === obj && e.host === s.id)) continue;
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1], b = s.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 2));
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (z > 0.5) hedgeEnts.push({ obj, x, z, y: E.sceneGroundHeight ? E.sceneGroundHeight(cam, x, z) : 0 }); }
    }
  }
  for (const e of ents.concat(hedgeEnts, bands.map(b => Object.assign({ backdrop: true }, b)))) {
    const box = boxOf(E, cam, e);
    if (!box) continue;
    out.push({ obj: e.obj, cls: e.cls || null, z: e.z, box, backdrop: !!e.backdrop, landmark: !!e.landmark });
  }
  // the generated buildings (spec `buildings`, `along` frontages) are world.buildings, not entities: each one by the box the extruder
  // draws it in (the v2 generator's own projection, so a converted street and its v2 source are judged alike); one 'kind' per style
  for (const b of world.buildings || []) {
    const box = buildingBox(E, cam, b, o.season || world.season || 'summer');
    if (!box) continue;
    const z = b.foot.reduce((s, p) => s + p[1], 0) / b.foot.length;
    out.push({ obj: 'building.' + (b.style || 'victorian-terrace'), cls: 'building', z, box, backdrop: false, landmark: !!b.landmark });
  }
  return out;
}
/** The screen box of a world building: the extruder's (the generator's projection, roof included), else its prism. */
function buildingBox(E, cam, b, season) {
  if (!b || !Array.isArray(b.foot) || b.foot.length < 3) return null;
  if (E.worldExtrudeBuilding) { try { const p = E.worldExtrudeBuilding(b, cam, { season }); if (p && Array.isArray(p.box) && p.box.every(Number.isFinite)) return p.box; } catch { /* the prism */ } }
  const h = Number.isFinite(b.h) ? b.h : (Number.isFinite(b.storeys) ? b.storeys : 2) * 3.1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of b.foot) for (const y of [0, h]) { if (!(p[1] > 0.3)) continue; const q = E.sceneProject(cam, p[0], p[1], y); if (q && Number.isFinite(q.X)) { x0 = Math.min(x0, q.X); x1 = Math.max(x1, q.X); y0 = Math.min(y0, q.Y); y1 = Math.max(y1, q.Y); } }
  return x0 <= x1 ? [x0, y0, x1, y1] : null;
}

/** v2 / v1 scene data as critic records: every compiled item (placements, scatter, kits, backdrop hills) with its depth. */
export function criticRecordsOfData(E, data, o = {}) {
  const C = E.sceneCompile(data, { season: o.season || 'summer' }), out = [], cam = C.cam || null;
  for (const it of C.items || []) {
    // a generated building (data.buildings, data.streets) is a direct item: its own projected box, not its placeholder's 4 x 4 units
    if (it.direct && Array.isArray(it.direct.box) && it.direct.box.every(Number.isFinite)) {
      out.push({ obj: 'building.' + (it.direct.style || 'gen'), cls: 'building', z: Number.isFinite(it.direct.dc) ? it.direct.dc : it.g && Number.isFinite(it.g.d) ? it.g.d : 50, box: it.direct.box });
      continue;
    }
    const def = E.sceneObj ? E.sceneObj(it.o) : null;
    if (!def || !def.size) continue;
    const w = def.size[0] * (it.s || 1), h = def.size[1] * (it.s || 1);
    let z = it.g && Number.isFinite(it.g.d) ? it.g.d : Number.isFinite(it.dz) ? it.dz : null;
    if (z == null && cam && E.sceneUnproject) { try { const g = E.sceneUnproject(cam, it.x, it.y); z = g && Number.isFinite(g.d) ? g.d : null; } catch { z = null; } }
    if (z == null) z = 5000;   // sky and horizon art: far
    out.push({ obj: it.o, cls: it.cls || null, z, box: [it.x - w / 2, it.y - h, it.x + w / 2, it.y] });
  }
  return { records: out, cam, horizon: cam ? cam.horizon : (data.view && data.view.horizon) || 470 };
}

/** The box measure (one method for both sides). o: { W, H, horizon }. */
export function criticScore(records, o = {}) {
  const W = o.W || W0, H = o.H || H0, hz = Number.isFinite(o.horizon) ? o.horizon : H / 2;
  const res = {}, cells = CRITIC_BANDS.map(() => new Uint8Array(COLS * ROWS)), objs = CRITIC_BANDS.map(() => new Set()), counts = CRITIC_BANDS.map(() => 0);
  const any = new Uint8Array(COLS * ROWS);
  for (const r of records) {
    const b = r.box;
    if (!b || b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H) continue;
    const bi = CRITIC_BANDS.findIndex(x => r.z >= x.z0 && r.z < x.z1);
    if (bi < 0) continue;
    objs[bi].add(r.obj); counts[bi]++;
    const c0 = Math.max(0, Math.floor(b[0] / W * COLS)), c1 = Math.min(COLS - 1, Math.floor(b[2] / W * COLS));
    const w0 = Math.max(0, Math.floor(b[1] / H * ROWS)), w1 = Math.min(ROWS - 1, Math.floor(b[3] / H * ROWS));
    for (let j = w0; j <= w1; j++) for (let i = c0; i <= c1; i++) {
      const X = (i + 0.5) * W / COLS, Y = (j + 0.5) * H / ROWS;
      if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3]) { cells[bi][j * COLS + i] = 1; any[j * COLS + i] = 1; }
    }
  }
  let score = 0;
  CRITIC_BANDS.forEach((band, bi) => {
    let n = 0; for (const v of cells[bi]) n += v;
    const cover = n / (COLS * ROWS), variety = objs[bi].size;
    res[band.id] = { cover: r3(cover), variety, n: counts[bi] };
    const dens = Math.min(1, Math.log1p(counts[bi]) / Math.log1p(band.n));
    score += band.w * (0.4 * Math.min(1, cover / band.cover) + 0.3 * Math.min(1, variety / band.variety) + 0.3 * dens);
  });
  // bare: samples below the horizon no box covers (the box measure; look's worldCoverage is the engine's C6 measure)
  let below = 0, bare = 0;
  for (let j = 0; j < ROWS; j++) {
    const Y = (j + 0.5) * H / ROWS;
    if (Y <= hz) continue;
    for (let i = 0; i < COLS; i++) { below++; if (!any[j * COLS + i]) bare++; }
  }
  res.bare = below ? r3(bare / below) : 0;
  res.score = r1(score * 100);
  return res;
}

/**
 * The critic of a v3 spec: richness (the box measure and kb's worldRichness), emptiness (look's worldCoverage) and framing
 * (appearance's worldFrameCheck / worldLandmarkCheck, else the invariant checker's edgeCut and landmark rules). o: { season, world }.
 */
export function worldCritic(E, spec, o = {}) {
  const season = o.season || 'summer';
  const world = o.world || E.worldBuild(spec, { season });
  const cam = camOf(E, world, spec), problems = [];
  const records = criticRecordsOfWorld(E, world, { season });
  const richness = criticScore(records, { horizon: cam ? cam.horizon : undefined });
  let worldRichness = null, coverage = null, cuts = null, landmarks = null;
  if (E.worldRichness && cam) { try { worldRichness = E.worldRichness(world, cam); } catch (e) { problems.push('worldRichness threw: ' + e.message); } }
  if (E.worldCoverage && cam) { try { coverage = E.worldCoverage(world, cam, { season }); } catch (e) { problems.push('worldCoverage threw: ' + e.message); } }
  if (E.worldFrameCheck && cam) { try { const r = E.worldFrameCheck(world, cam); cuts = Array.isArray(r) ? r : r && (r.issues || r.cuts || r.problems || r.items) || []; } catch (e) { problems.push('worldFrameCheck threw: ' + e.message); } }
  if (E.worldLandmarkCheck && cam) { try { const r = E.worldLandmarkCheck(world, cam); landmarks = Array.isArray(r) ? r : r && (r.landmarks || r.items) || []; } catch (e) { problems.push('worldLandmarkCheck threw: ' + e.message); } }
  // the invariant checker's framing rules ALWAYS run beside appearance's check (15 Oct: worldFrameCheck said '0 cut' while a
  // bramble covered 41 % of the canal frame): C1 cuts, giants at the lens (nearStatic) and trees with their crown above the frame
  if (E.worldInvariants && E.worldInvariantFrame) {
    const fr = E.worldInvariantFrame(world, [], { season });
    const v = E.worldInvariants(fr, { world, rules: ['edgeCut', 'nearStatic', 'crownCut', 'landmark'] });
    const seen = new Set((cuts || []).map(c => c && c.id).filter(Boolean));
    cuts = (cuts || []).concat(v.filter(x => x.rule !== 'landmark' && !seen.has(x.id)).map(x => ({ id: x.id, ok: false, msg: x.msg, by: 'invariants:' + x.rule })));
    if (landmarks == null) landmarks = v.filter(x => x.rule === 'landmark').map(x => ({ id: x.id, ok: false, msg: x.msg, by: 'invariants' }));
  }
  const badCuts = (cuts || []).filter(c => c && c.ok !== true), badLm = (landmarks || []).filter(l => l && l.ok === false);
  if (coverage && coverage.ok === false) problems.push(coverage.msg || 'emptyBackground');
  for (const c of badCuts) problems.push('frame: ' + (c.msg || c.why || c.id));
  for (const l of badLm) problems.push('landmark: ' + (l.msg || l.id));
  if (worldRichness && worldRichness.ok === false) problems.push('richness floor: ' + (worldRichness.msg || 'below the floor'));
  // advice for the author, not a fault of the render: landmarks the load path demoted to scenery (C4: this camera cannot show them)
  const notes = (Array.isArray(world.log) ? world.log : []).filter(l => l && l.action === 'demote').map(l => 'demoted: ' + l.reason);
  // the STRICT measure (look's worldDetailCoverage): what the eye sees, by silhouette, texture and dressing. Every FAIL rule is a
  // problem (exit 1): bare channel walls, flat surfaces, bare quays and ground, an empty foreground, too few depth layers, no
  // framing, no bough in a natural view, low variety, no life. Its warnings (the sky share) are notes. o.strict === false skips it.
  let strict = null;
  if (o.strict !== false && E.worldDetailCoverage && E.worldDetailProblems && cam) {
    try {
      const rec = E.worldDetailCoverage(world, cam, { season });
      const kit = o.kit || (world.fillState && world.fillState.style) || (E.worldFillStyle ? E.worldFillStyle(world) : null);
      const list = E.worldDetailProblems(rec, { kit });
      strict = { rec, problems: list, kit, ok: !list.some(p => p.severity !== 'warn') };
      for (const p of list) (p.severity === 'warn' ? notes : problems).push(`${p.rule}: ${p.msg} (fix: ${p.fix})`);
    } catch (e) { problems.push('the strict measure threw: ' + e.message); }
  }
  return { notes, score: richness.score, richness, worldRichness, coverage: coverage ? { bare: coverage.bare, sky: coverage.sky, ok: coverage.ok, msg: coverage.msg || '' } : null, strict,
    framing: { cuts: badCuts, landmarks: badLm }, problems, records: records.length, by: { richness: 'critic-boxes', floor: E.worldRichness ? 'worldRichness' : null, coverage: E.worldCoverage ? 'worldCoverage' : null, strict: E.worldDetailCoverage ? 'worldDetailCoverage' : null, framing: E.worldFrameCheck ? 'worldFrameCheck' : 'invariants' } };
}

/** The critic of a registered scene by ref: a v3 item through worldCritic, a v2 / v1 item through its compiled data. */
export function criticOfRef(E, ref, o = {}, resolveRef) {
  const hit = resolveRef(E, ref);
  if (!hit) throw new Error(`unknown scene '${ref}'`);
  const spec = E.worldHostSpec ? E.worldHostSpec(hit.item) : null;
  if (spec) return Object.assign({ ref: hit.ref, v: 3 }, worldCritic(E, spec, o));
  const data = E.sceneData ? E.sceneData(hit.item) : hit.item.scene;
  const { records, horizon } = criticRecordsOfData(E, data, o);
  const richness = criticScore(records, { horizon });
  return { ref: hit.ref, v: data && data.v === 2 ? 2 : 1, score: richness.score, richness, records: records.length, problems: [], by: { richness: 'critic-boxes' } };
}

/** A v3 spec against its source scene (P7, U4): at least as rich, by the same measure. */
export function criticAgainst(E, spec, sourceRef, o = {}, resolveRef) {
  const v3 = worldCritic(E, spec, o), source = criticOfRef(E, sourceRef, o, resolveRef);
  const margin = r1(v3.score - source.score);
  return { v3, source, ok: v3.score + 0.5 >= source.score, margin };
}

export function criticText(c, title = '') {
  const out = [title ? `world critic: ${title}` : 'world critic'];
  const R = c.richness || {};
  out.push(`  score ${c.score} (box measure)  near cover ${R.near ? R.near.cover : '-'} variety ${R.near ? R.near.variety : '-'} | mid ${R.mid ? R.mid.cover : '-'} / ${R.mid ? R.mid.variety : '-'} | far ${R.far ? R.far.cover : '-'} / ${R.far ? R.far.variety : '-'} | bare ${R.bare}`);
  if (c.worldRichness) out.push(`  worldRichness (kb floor): ${JSON.stringify(c.worldRichness).slice(0, 200)}`);
  if (c.coverage) out.push(`  coverage (C6): bare ${c.coverage.bare}, open horizon ${c.coverage.sky} ${c.coverage.ok ? 'ok' : 'FAIL'}`);
  if (c.framing) out.push(`  framing: ${c.framing.cuts.length} cut, ${c.framing.landmarks.length} landmark problem(s) [${c.by && c.by.framing}]`);
  if (c.strict && c.strict.rec) {
    const r = c.strict.rec, pc = v => Math.round(v * 100) + '%';
    out.push(`  strict (${c.strict.kit || 'no kit'}): ${c.strict.ok ? 'PASS' : 'FAIL'}  bare ${pc(r.bare)} flat ${pc(r.flat)} | near ${pc(r.near.dressed)} dressed, ${pc(r.near.object)} standing | layers ${r.layerCount} [${r.layers.map(pc).join(' ')}] | frame top ${r.frame.top || '-'} left ${r.frame.left || '-'} right ${r.frame.right || '-'} | variety ${r.variety.all}/${r.variety.mid} | life ${r.life} | sky ${pc(r.sky)} | channel ${pc(r.channel.area)} (${pc(r.channel.flat)} flat) | paving bare ${pc(r.paving)}`);
  }
  for (const p of (c.problems || []).slice(0, 16)) out.push('    - ' + p);
  for (const n of (c.notes || []).slice(0, 6)) out.push('    note: ' + n);
  return out.join('\n');
}
