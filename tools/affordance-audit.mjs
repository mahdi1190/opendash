// Affordance audit (a dev tool, not a test suite): for any island layout json, every thing standing in it, its KIND
// (src/app/94-garden-zz-7act-0kinds.js), the moves and pet behaviours it offers, whether each stand point is on walkable
// ground and reachable from the arrival point, and the things whose kind is unknown (they offer nothing). Then the ground's
// types (water edge, deep water, open grass, sand, slope) counted from the layout's own cells.
//
//   node tools/affordance-audit.mjs                                  this worktree's assets/garden/island-v5.json
//   node tools/affordance-audit.mjs --island path/to/island.json     any layout file
//   node tools/affordance-audit.mjs --ref feat/village-layout        a branch's layout, landmark table and region files (git show)
//   (--island is a layout dropped into THIS code: a fixed thing with no land or catalog row here is listed as drawn by nothing, as the
//    game would treat it; --ref is that branch's layout with that branch's own tables and painters)
//   options: --json out.json (the full report)  --quiet (summary and faults only)
//
// A placed thing (a layout `things` row) is checked by the game's own ground rule: not in the water, on a path, a building's footprint,
// rock, a wall's outline or another thing; the game moves it to the nearest clear ground within 3 cells (said here as a fault, with
// where), or leaves it out. The game also keeps it off what painters draw with a foot and off painted paving, which only the game sees.
// The kinds and the cell model are this worktree's code, read as it is (the same files the game runs); a layout needs no code
// change to be audited. Walkability here is the layout's own cell raster (land, fresh water, rock, fixed things that block): the
// game's collision view (Shift+C) is the last word, this is the quick look.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg('--ref', ''), QUIET = process.argv.includes('--quiet');
const git = (p) => execFileSync('git', ['-C', root, 'show', `${REF}:${p}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
const readSrc = (p) => REF ? git(p) : readFileSync(join(root, p), 'utf8');
const islandText = arg('--island', '') ? readFileSync(arg('--island'), 'utf8') : readSrc('assets/garden/island-v5.json');
const data = JSON.parse(islandText);

/* ---------- the registry, as the game has it ---------- */
const ctx = { console, Math, Object, Array, Map, Set, Number, String, JSON, Infinity, NaN, isFinite, parseFloat };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-zz-7act-0kinds.js'), 'utf8') + '\n;this.K=GARDEN_KINDS;this.T=GARDEN_TERRAIN;this.kindOf=gardenKindOf;this.spots=gardenKindSpots;this.snap=gardenKindSnap;this.byPet=GARDEN_KIND_BY_PET;this.rise=gardenRiseAt;this.meet=gardenKindBoxesMeet;this.drawable=gardenKindDrawable;this.plot=gardenPlotNear;', ctx);
// the drawings of placeable things, as the game has them (94-garden-zz-7act-2world.js _GAW_ART): a kind whose drawing is not there is left out
let ARTS = null;
try { const a = { Object, Math, String, Number, Array, JSON }; vm.createContext(a); vm.runInContext(readFileSync(join(root, 'src/app/94-garden-zz-7act-2world.js'), 'utf8').split('\nconst _gawN')[0] + '\n;this.A=_GAW_ART;', a); ARTS = Object.assign({}, a.A); } catch (e) { ARTS = null; }
// the folk's small homes have their drawings in a file of their own (94-garden-folk-2art.js), looked up the same way by the game
try { if (ARTS && existsSync(join(root, 'src/app/94-garden-folk-2art.js'))) { const f = { Object, Math, String, Number, Array, JSON }; vm.createContext(f); vm.runInContext(readFileSync(join(root, 'src/app/94-garden-folk-2art.js'), 'utf8') + '\n;this.A=VALE_FOLK_ART;', f); Object.assign(ARTS, f.A); } } catch (e) { /* no folk homes */ }

/* ---------- the cell model, as the game has it (94-garden-0island.js) ---------- */
const W = Object.assign({}, data.world);
const isl = { GARDEN_WORLD: W, GardenIslandLayout: { data }, GardenIslandCanonicalLayout: { data }, _GD_LAND: new Set(), _GD_WORKS: new Map(), GARDEN_PROPS: [], GARDEN_LAND_THICKET: [], gardenArea: () => null, gardenWorkOwned: () => false, Math, Object, Array, Map, Set, Number, String, JSON, Infinity, NaN, isFinite, Uint8Array, Int8Array, Float32Array };
vm.createContext(isl);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-0island.js'), 'utf8') + '\n;this.cell=gardenIslandBaseCell;this.land=gardenIslandLandContains;this.fresh=gardenIslandFreshwaterContains;', isl);
const cell = (x, y) => { try { return isl.cell(x, y); } catch (e) { return null; } };
// painted paving (roads, lanes, plazas, the arrival square), as the game reads it: the ground kit's own laid paths (94-garden-paint-ground-0kit.js)
// and the pets' _plStoneAt (97-pets-tricks-7life-3props.js), the same source text run on this layout. A placed thing is kept off it.
let stoneAt = () => false;
try {
  isl.window = isl;
  vm.runInContext(readFileSync(join(root, 'src/app/94-garden-paint-ground-0kit.js'), 'utf8'), isl);
  const pr = readFileSync(join(root, 'src/app/97-pets-tricks-7life-3props.js'), 'utf8'), a = pr.indexOf('let _plStoneD'), b = pr.indexOf('\n/** Where the thing may lie');
  vm.runInContext(pr.slice(a, b) + '\n;this.stoneAt=_plStoneAt;', isl); stoneAt = (x, y) => { try { return !!isl.stoneAt(x, y); } catch (e) { return false; } };
} catch (e) { console.error('(paving not read: ' + e.message + ')'); }
const statById = new Map((data.static || []).map(r => [r.id, r]));
const walkOn = (data.static || []).filter(r => r.walk);   // a pier's boards: walked on over the water
const blocks = (x, y) => {
  if (walkOn.some(r => x >= r.x && x < r.x + r.w && y >= r.y - 0.5 && y < r.y + r.h)) return false;
  const c = cell(x, y); if (!c) return true;
  let land = c.land, fresh = c.freshwater; try { land = isl.land(x, y); fresh = land && isl.fresh(x, y); } catch (e) { /* the cell's word */ }   // (the point itself, not the cell's middle: a stand point on a bank's lip)
  if (!land || fresh || c.solid) return true;
  if (c.staticId) { const s = statById.get(c.staticId); if (s && (s.col || 'full') === 'full' && !s.walk) return true; }
  return false;
};
// reachable from the arrival point over walkable cells (every region open: the audit looks at the whole layout)
const start = data.anchors && data.anchors.start || data.world.start || { x: 48, y: 55 };
const reach = new Uint8Array(W.cols * W.rows);
{ const q = [[Math.floor(start.x), Math.floor(start.y)]]; reach[q[0][1] * W.cols + q[0][0]] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows || reach[ny * W.cols + nx] || blocks(nx + 0.5, ny + 0.5)) continue; reach[ny * W.cols + nx] = 1; q.push([nx, ny]); } } }
const reachable = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < W.cols && cy < W.rows && !!reach[cy * W.cols + cx]; };
const nearReach = (x, y, r) => { for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (reachable(x + dx, y + dy)) return true; return false; };

/* ---------- what stands in it ---------- */
const sightSrc = (() => { try { return readSrc('src/app/94-garden-lands-0table.js'); } catch (e) { return ''; } })();
const catSrc = (() => { try { return readSrc('src/app/94-garden-0catalog.js'); } catch (e) { return ''; } })();
const artOf = new Map();
for (const m of sightSrc.matchAll(/\{ id: '([a-z0-9-]+)', art: '([a-z0-9-]+)'/g)) artOf.set(m[1], m[2]);
for (const m of catSrc.matchAll(/\{ id: '([a-z0-9-]+)'[^\n]*?\bkind: '([a-z0-9-]+)'/g)) if (!artOf.has(m[1])) artOf.set(m[1], m[2]);
// things placed through layout data: the layout's own `things`, the shared file, and every region file's `things`
const placed = new Map();
const takeThings = (txt) => { try { const d = JSON.parse(txt); for (const r of (Array.isArray(d) ? d : d.things) || []) if (r && r.id) placed.set(r.id, r); } catch (e) { /* not json */ } };
if (REF) {
  let files = []; try { files = execFileSync('git', ['-C', root, 'ls-tree', '--name-only', REF, 'assets/garden/'], { encoding: 'utf8' }).split(/\r?\n/).map(f => f.replace(/^assets\/garden\//, '')).filter(f => /^vale-[a-z0-9-]+\.json$/.test(f)); } catch (e) { files = []; }
  if (!files.includes('vale-things.json') && existsSync(join(root, 'assets/garden/vale-things.json'))) takeThings(readFileSync(join(root, 'assets/garden/vale-things.json'), 'utf8'));   // (a branch without the shared file: this worktree's rows)
  for (const f of files.sort((a, b) => (a === 'vale-things.json' ? -1 : b === 'vale-things.json' ? 1 : a.localeCompare(b)))) takeThings(git('assets/garden/' + f));
} else for (const f of readdirSync(join(root, 'assets/garden')).filter(f => /^vale-[a-z0-9-]+\.json$/.test(f)).sort((a, b) => (a === 'vale-things.json' ? -1 : b === 'vale-things.json' ? 1 : a.localeCompare(b)))) takeThings(readFileSync(join(root, 'assets/garden', f), 'utf8'));
for (const r of data.things || []) placed.set(r.id, r);

const things = [];
for (const r of data.static || []) things.push({ id: r.id, src: 'layout', art: artOf.get(r.id) || '', drawn: artOf.has(r.id), kind: ctx.kindOf({ id: r.id, art: artOf.get(r.id) || '', kind: r.kind }), x: r.x + r.w / 2, y: r.y + r.h, w: r.w, h: r.h, front: r.front, region: (cell(r.x + r.w / 2, r.y + r.h - 0.5) || {}).region || '' });
// the same ground rule the game uses for a placed thing (94-garden-zz-7act-0scan.js _gksPlaceFault), on the layout's own cells and walls
const wallForms = (data.landforms || []).filter(f => f.col === 'full' && Array.isArray(f.polygon) && f.polygon.length > 2);
const inPoly = (px, py, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1] || 1e-9) + a[0]) ins = !ins; } return ins; };
const placeFault = (K, x, y, w, h, self) => {
  const hw = w / 2, pts = [[x, y - 0.06], [x - hw * 0.85, y - 0.06], [x + hw * 0.85, y - 0.06], [x, y - h * 0.9]];
  if (K.fill) for (let qy = y - h + 0.2; qy < y; qy += 0.5) for (let qx = x - hw + 0.2; qx < x + hw; qx += 0.5) pts.push([qx, qy]);   // (a building: its whole footprint, as the game checks it)
  for (const [px, py] of pts) { const c = cell(px, py); let fresh = false; try { fresh = isl.fresh(px, py) || !isl.land(px, py); } catch (e) { fresh = !!(c && c.freshwater); } if (fresh) return 'in the water'; if (!c || !c.land) return 'off the land'; if (c.solid) return 'on rock or a wall'; if (!K.onPath && c.route) return 'on a path (' + c.route + ')'; if (c.staticId && c.staticId !== self) { const st = statById.get(c.staticId); if (st && (st.col || 'full') === 'full' && !st.walk) return 'on ' + c.staticId; } }
  for (const [px, py] of pts) if (ctx.plot(data, px, py, 0.45)) return 'on a garden plot or its wall';   // (the game's own gardenPlotNear)
  for (const f of wallForms) for (const [px, py] of pts) if (inPoly(px, py, f.polygon)) return 'on the ' + f.kind + ' ' + f.id;
  for (const o of things) { if (o.id === self) continue; if (ctx.meet(x, y, w, h, o.x, o.y, o.w || 1, o.h || 1)) return 'on ' + o.id; }   // (as drawn: the game's own gardenKindBoxesMeet)
  if (!K.onPath) for (const [px, py] of pts.concat([[x - hw - 0.45, y - 0.1], [x + hw + 0.45, y - 0.1], [x, y + 0.4], [x, y - h - 0.45]])) if (stoneAt(px, py)) return 'on paving';   // (the game's own margin: a walled yard's rim)
  // where you stand to use it can be walked to from the arrival point (the game asks the same, over the land open now)
  if (K.acts) { const kid = Object.keys(ctx.K).find(k => ctx.K[k] === K); for (const sp of ctx.spots({ kind: kid, x, y, w })) { if (sp.pierEnd || sp.wade || sp.boat) continue; if (!reachable(sp.stand.x, sp.stand.y)) return 'its standing spot cannot be walked to from the arrival point (shut in)'; } }
  return '';
};
const placeNear = (K, x, y, w, h, self) => { for (let r = 0.35; r <= 3.01; r += 0.35) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + r, qx = Math.round((x + Math.cos(a) * r) * 100) / 100, qy = Math.round((y + Math.sin(a) * r * 0.75) * 100) / 100; if (!placeFault(K, qx, qy, w, h, self)) return { x: qx, y: qy }; } return null; };
const orphans = [];
const report = { layout: data.id, ref: REF || '(worktree)', file: arg('--island', REF ? REF + ':assets/garden/island-v5.json' : 'assets/garden/island-v5.json'), things: [], unknown: [], orphans, faults: [], terrain: {}, kinds: {}, missingKinds: [], notDrawn: [], painted: [], paintedUnknown: [] };
for (let r of placed.values()) {
  let x = Number(r.x), y = Number(r.y);
  if (r.on) { const a = things.find(t => t.id === r.on); if (!a) { orphans.push(r.id + ' (on ' + r.on + ', not in this layout)'); continue; } x = a.x + ((r.at || [])[0] || 0); y = a.y + ((r.at || [])[1] || 0); }
  const K = ctx.K[r.kind];
  if (K && K.ground) { const wetp = (px, py) => { try { return isl.fresh(px, py) || !isl.land(px, py); } catch (e) { return false; } }; const sn = ctx.snap(r.kind, x, y, Number(r.w) || K.w, wetp, r.front); if (!sn) { report.faults.push(`${r.id} (${r.kind}): no ${K.ground} within 4 cells of where its row puts it: it is left out`); continue; } if (sn.moved) report.faults.push(`${r.id} (${r.kind}): its row puts it off the ${K.ground}; the game moves it ${Math.round(Math.hypot(sn.x - x, sn.y - y) * 10) / 10} cells to ${sn.x},${sn.y} (move the row there)`); x = sn.x; y = sn.y; if (sn.front != null) r = Object.assign({}, r, { front: sn.front }); }
  if (K && !ctx.drawable(r.kind, ARTS)) { report.faults.push(`${r.id} (${r.kind}): kind ${r.kind} has no drawing to place (nothing invisible is used): the game leaves it out`); continue; }
  if (K && !K.ground) { const w0 = Number(r.w) || K.w || 1, h0 = Number(r.h) || K.h || 1, why = placeFault(K, x, y, w0, h0, r.id); if (why) { const q = placeNear(K, x, y, w0, h0, r.id); if (!q) { report.faults.push(`${r.id} (${r.kind}): its row puts it ${why}, and there is no clear ground within 3 cells: the game leaves it out`); continue; } report.faults.push(`${r.id} (${r.kind}): its row puts it ${why}: the game moves it to ${q.x},${q.y} (put it there, or somewhere better, in the layout)`); x = q.x; y = q.y; } }
  things.push({ id: r.id, src: 'thing', kind: K ? r.kind : '', x, y, w: Number(r.w) || (K && K.w) || 1, h: Number(r.h) || (K && K.h) || 1, front: r.front, season: r.season || '', region: (cell(x, y - 0.1) || {}).region || '' });
}

/* ---------- each thing's offer, checked ---------- */
const round = (v) => Math.round(v * 100) / 100;
const s0IsPart = (K) => (K.acts || []).some(a => a.at);
for (const t of things) {
  const K = t.kind ? ctx.K[t.kind] : null, row = { id: t.id, src: t.src, kind: t.kind || '?', region: t.region, at: [round(t.x), round(t.y)], acts: [], pets: [] };
  if (!K) { report.unknown.push(t.id + (t.art ? ' (art ' + t.art + ')' : '')); report.things.push(row); continue; }
  report.kinds[t.kind] = (report.kinds[t.kind] || 0) + 1;
  if (K.pet) row.pets.push(K.pet); if (K.drink) row.pets.push('drink'); if (K.warm) row.pets.push('warm'); if (!K.noPerch && (K.top || K.petSeat)) row.pets.push('perch');
  if (t.src === 'thing') {   // a placed thing's own ground
    const c = cell(t.x, t.y - 0.1);
    if (!c || !c.land) report.faults.push(`${t.id} (${t.kind}): its foot ${round(t.x)},${round(t.y)} is off the land`);
    else if (c.freshwater && K.solid !== 'free') report.faults.push(`${t.id} (${t.kind}): its foot is in the water`);
    else if (c.staticId && c.staticId !== t.id) report.faults.push(`${t.id} (${t.kind}): stands on ${c.staticId}'s footprint (nothing overlaps)`);
    else if (c.route && K.solid === 'block') report.faults.push(`${t.id} (${t.kind}): blocks a path (${c.route})`);
  }
  // what the game offers is what is drawn: a fixed thing with no land or catalog row is drawn by nothing unless a painter draws it as
  // its own thing (then it is found as that painted thing, listed under PAINTED below), so it is not counted here
  if (t.src === 'layout' && !t.drawn && !(K.acts || []).some(a => a.pierEnd)) { row.notDrawn = true; if ((K.acts || []).length) report.notDrawn.push(t.id + ' (' + t.kind + ')'); report.things.push(row); continue; }
  if (t.src === 'thing' && K.place && !K.art && !K.paint && !K.ground) { row.notDrawn = true; report.notDrawn.push(t.id + ' (' + t.kind + ': no drawing)'); report.things.push(row); continue; }
  const partW = (K.acts || []).some(a => a.at) && K.dw ? K.dw : t.w;   // (a part and its stand point are on the thing as its painter draws it: the game reads the drawn width, the audit the kind's dw)
  for (const s of ctx.spots({ kind: t.kind, x: t.x, y: t.y, w: s0IsPart(K) ? partW : t.w, front: t.front })) {
    if (s.pierEnd) { row.acts.push({ act: s.act, stand: 'the far end of the built pier', ok: true }); continue; }
    const c = cell(s.stand.x, s.stand.y), walk = !blocks(s.stand.x, s.stand.y) || (s.boat && !blocks(s.stand.x + 0.4, s.stand.y)), edge = !!(s.edge || s.seat != null || s.wade || s.boat), rch = reachable(s.stand.x, s.stand.y) || nearReach(s.stand.x, s.stand.y, s.boat ? 1.2 : 0.6);   // (the walker gets you within reach of it; a boat is boarded from beside it)
    const ok = (walk || edge) && rch;
    row.acts.push({ act: s.act, stand: [round(s.stand.x), round(s.stand.y)], deg: s.deg, walkable: walk, reachable: rch, ok, needs: s.needs || undefined });
    if (!ok) report.faults.push(`${t.id} (${t.kind}) ${s.act}: stand ${round(s.stand.x)},${round(s.stand.y)} is ${!walk && !edge ? 'not walkable (' + (c ? (c.freshwater ? 'water' : c.solid ? 'rock' : c.staticId ? c.staticId : !c.land ? 'off the land' : '?') : 'outside') + ')' : 'not reachable from the arrival point'}`);
  }
  // its upper floors (94-garden-zz-7act-3height.js): each way up starts at a foot you can walk to (placed on the layout's foot here; the
  // game places it on the thing as drawn, within a few px of this)
  for (const L of K.levels || []) for (const w of L.ways || []) {
    const HH = 41.44, fx = t.x + w.foot[0] * HH / (W.cellW || 48), fy = t.y + w.foot[1] * HH / (W.cellH || 30);
    const walk = !blocks(fx, fy), rch = reachable(fx, fy) || nearReach(fx, fy, 0.6), ok = walk && rch;
    row.acts.push({ act: 'up to ' + (L.name || L.id) + ' (' + (w.by || 'ladder') + (w.inside ? ', inside' : '') + ')', stand: [round(fx), round(fy)], walkable: walk, reachable: rch, ok });
    if (!ok) report.faults.push(`${t.id} (${t.kind}) the way up to ${L.name || L.id}: its foot ${round(fx)},${round(fy)} is ${!walk ? 'not walkable' : 'not reachable from the arrival point'}`);
  }
  report.things.push(row);
}
// what the painters draw as things of their own (GardenPaintVale thing({ key })): the game finds them by their painted foot and gives
// each the kind its name says. Read from the painters' code (this worktree's, or the branch's): a name with no kind is listed.
{
  let files = [];
  try { files = REF ? execFileSync('git', ['-C', root, 'ls-tree', '--name-only', REF, 'src/app/'], { encoding: 'utf8' }).split(/\r?\n/).filter(f => /94-garden-paint-vale-[^/]+\.js$/.test(f)) : readdirSync(join(root, 'src/app')).filter(f => /^94-garden-paint-vale-.+\.js$/.test(f)).map(f => 'src/app/' + f); } catch (e) { files = []; }
  const names = new Set();
  for (const f of files) { let txt = ''; try { txt = readSrc(f); } catch (e) { continue; } for (const m of txt.matchAll(/thing\(\{\s*key:\s*'([a-z0-9-]+)/g)) names.add(m[1].replace(/-$/, '')); }
  for (const nm of [...names].sort()) { const k = ctx.kindOf({ id: nm, head: true }); report.painted.push({ name: nm, kind: k || '?' }); if (!k) report.paintedUnknown.push(nm); }
}
// kinds the game knows that this layout has none of (things for the layout's authors to place)
for (const [k, K] of Object.entries(ctx.K)) if (!report.kinds[k] && (K.acts || K.pet) && !K.species && k !== 'seat' && k !== 'garden-well') report.missingKinds.push(k);

/* ---------- the ground ---------- */
const terr = { 'water-edge': 0, deep: 0, 'open-grass': 0, sand: 0, slope: 0, path: 0, rock: 0 };
const wet = (x, y) => { const c = cell(x, y); return !!(c && c.freshwater); };
for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
  const c = cell(x + 0.5, y + 0.5); if (!c) continue;
  if (c.freshwater) { if (wet(x + 0.5, y - 1) && wet(x + 0.5, y - 2) && wet(x + 1.5, y - 1) && wet(x - 0.5, y - 1)) terr.deep++; continue; }
  if (!c.land) continue;
  if (c.solid) { terr.rock++; continue; }
  if (ctx.rise(data, cell, x + 0.5, y + 0.5)) terr.slope++;   // (the game's own gardenRiseAt: ground you walk on that rises)
  if (wet(x + 0.5, y - 0.6) && wet(x + 0.5, y - 2.1) && reach[y * W.cols + x]) terr['water-edge']++;
  if (c.beach) terr.sand++; else if (c.route) terr.path++; else if (!c.reserved && !c.staticId) terr['open-grass']++;
}
report.terrain = terr;
for (const [type, T] of Object.entries(ctx.T)) if ((T.acts || []).length || (T.pets || []).length) report.terrain[type + ' offers'] = (T.acts || []).map(a => a.act).join(' ') + ' | pets: ' + (T.pets || []).join(' ');

/* ---------- print ---------- */
const out = [];
out.push(`AFFORDANCE AUDIT  ${report.layout}  (${report.file})`);
out.push(`things: ${things.length} (${things.filter(t => t.src === 'layout').length} fixed in the layout, ${things.filter(t => t.src === 'thing').length} placed through layout data)   known kinds: ${Object.keys(report.kinds).length}   unknown: ${report.unknown.length}   faults: ${report.faults.length}`);
out.push(`kinds: ${Object.entries(report.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', ')}`);
if (!QUIET) {
  out.push('', 'EVERY THING  (kind, region, foot)  moves offered [stand point: ok | NOT WALKABLE | NOT REACHABLE]  pets');
  for (const r of report.things) out.push(`  ${r.id.padEnd(18)} ${r.kind.padEnd(14)} ${String(r.region || '').padEnd(17)} ${r.at.join(',').padEnd(12)} ${r.acts.map(a => a.act + (a.ok ? '' : a.walkable === false ? ' [NOT WALKABLE]' : ' [NOT REACHABLE]') + (a.needs ? ' (' + Object.entries(a.needs).map(e => e.join(' ')).join(', ') + ')' : '')).join(' ') || '-'}${r.pets.length ? '   pets: ' + r.pets.join(' ') : ''}`);
}
out.push('', `UNKNOWN KIND (offer nothing): ${report.unknown.join(', ') || 'none'}`);
out.push(`FIXED THINGS NOTHING DRAWS (no land or catalog row, no drawing: the game offers nothing there; draw them, or place them as layout things of a kind with a painter): ${report.notDrawn.join(', ') || 'none'}`);
out.push(`PAINTED THINGS (found in the game by their painted foot): ${report.painted.filter(p => p.kind !== '?' && p.kind !== 'building' && p.kind !== 'scenery').map(p => p.name + ' ' + p.kind).join(', ') || 'none'}`);
out.push(`PAINTED THINGS OF NO KNOWN KIND (they offer nothing: give the name a word in GARDEN_KINDS): ${report.paintedUnknown.join(', ') || 'none'}`);
out.push(`PLACED ROWS WHOSE ANCHOR IS NOT IN THIS LAYOUT: ${orphans.join(', ') || 'none'}`);
out.push(`KINDS THIS LAYOUT HAS NONE OF: ${report.missingKinds.join(', ')}`);
out.push(`PAVING (the game's own laid paths and plazas, kept clear of placed things): ${stoneAt(start.x + 0.5, start.y + 0.5) ? 'read' : 'NOT READ: placed things on paving are not caught here'}`);
out.push('', 'FAULTS'); for (const f of report.faults) out.push('  ' + f); if (!report.faults.length) out.push('  none');
out.push('', 'GROUND (cells, read from the layout)'); for (const [k, v] of Object.entries(report.terrain)) out.push(`  ${k}: ${v}`);
console.log(out.join('\n'));
if (arg('--json', '')) writeFileSync(arg('--json'), JSON.stringify(report, null, 1));
