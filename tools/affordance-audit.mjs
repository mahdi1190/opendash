// Affordance audit (a dev tool, not a test suite): for any island layout json, every thing standing in it, its KIND
// (src/app/94-garden-zz-7act-0kinds.js), the moves and pet behaviours it offers, whether each stand point is on walkable
// ground and reachable from the arrival point, and the things whose kind is unknown (they offer nothing). Then the ground's
// types (water edge, deep water, open grass, sand, slope) counted from the layout's own cells.
//
//   node tools/affordance-audit.mjs                                  this worktree's assets/garden/island-v5.json
//   node tools/affordance-audit.mjs --island path/to/island.json     any layout file
//   node tools/affordance-audit.mjs --ref feat/village-layout        a branch's layout, landmark table and region files (git show)
//   options: --json out.json (the full report)  --quiet (summary and faults only)
//
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
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-zz-7act-0kinds.js'), 'utf8') + '\n;this.K=GARDEN_KINDS;this.T=GARDEN_TERRAIN;this.kindOf=gardenKindOf;this.spots=gardenKindSpots;this.byPet=GARDEN_KIND_BY_PET;', ctx);

/* ---------- the cell model, as the game has it (94-garden-0island.js) ---------- */
const W = Object.assign({}, data.world);
const isl = { GARDEN_WORLD: W, GardenIslandLayout: { data }, GardenIslandCanonicalLayout: { data }, _GD_LAND: new Set(), _GD_WORKS: new Map(), GARDEN_PROPS: [], GARDEN_LAND_THICKET: [], gardenArea: () => null, gardenWorkOwned: () => false, Math, Object, Array, Map, Set, Number, String, JSON, Infinity, NaN, isFinite, Uint8Array, Int8Array, Float32Array };
vm.createContext(isl);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-0island.js'), 'utf8') + '\n;this.cell=gardenIslandBaseCell;this.land=gardenIslandLandContains;this.fresh=gardenIslandFreshwaterContains;', isl);
const cell = (x, y) => { try { return isl.cell(x, y); } catch (e) { return null; } };
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
for (const r of data.static || []) things.push({ id: r.id, src: 'layout', art: artOf.get(r.id) || '', kind: ctx.kindOf({ id: r.id, art: artOf.get(r.id) || '', kind: r.kind }), x: r.x + r.w / 2, y: r.y + r.h, w: r.w, h: r.h, front: r.front, region: (cell(r.x + r.w / 2, r.y + r.h - 0.5) || {}).region || '' });
const orphans = [];
for (const r of placed.values()) {
  let x = Number(r.x), y = Number(r.y);
  if (r.on) { const a = things.find(t => t.id === r.on); if (!a) { orphans.push(r.id + ' (on ' + r.on + ', not in this layout)'); continue; } x = a.x + ((r.at || [])[0] || 0); y = a.y + ((r.at || [])[1] || 0); }
  const K = ctx.K[r.kind];
  things.push({ id: r.id, src: 'thing', kind: K ? r.kind : '', x, y, w: Number(r.w) || (K && K.w) || 1, h: Number(r.h) || (K && K.h) || 1, front: r.front, season: r.season || '', region: (cell(x, y - 0.1) || {}).region || '' });
}

/* ---------- each thing's offer, checked ---------- */
const round = (v) => Math.round(v * 100) / 100;
const report = { layout: data.id, ref: REF || '(worktree)', file: arg('--island', REF ? REF + ':assets/garden/island-v5.json' : 'assets/garden/island-v5.json'), things: [], unknown: [], orphans, faults: [], terrain: {}, kinds: {}, missingKinds: [] };
for (const t of things) {
  const K = t.kind ? ctx.K[t.kind] : null, row = { id: t.id, src: t.src, kind: t.kind || '?', region: t.region, at: [round(t.x), round(t.y)], acts: [], pets: [] };
  if (!K) { report.unknown.push(t.id + (t.art ? ' (art ' + t.art + ')' : '')); report.things.push(row); continue; }
  report.kinds[t.kind] = (report.kinds[t.kind] || 0) + 1;
  if (K.pet) row.pets.push(K.pet); if (K.drink) row.pets.push('drink'); if (K.warm) row.pets.push('warm'); if (!K.noPerch && (K.top || K.petSeat)) row.pets.push('perch');
  if (K.place && K.art && !/^(scope|ladder|fire|ball|leaves|busker|logseat|basket|log|bank)$/.test(K.art) && t.src === 'thing') report.faults.push(`${t.id}: kind ${t.kind} has no drawing yet (art '${K.art}'): it offers nothing in the game until one is drawn`);
  if (t.src === 'thing') {   // a placed thing's own ground
    const c = cell(t.x, t.y - 0.1);
    if (!c || !c.land) report.faults.push(`${t.id} (${t.kind}): its foot ${round(t.x)},${round(t.y)} is off the land`);
    else if (c.freshwater && K.solid !== 'free') report.faults.push(`${t.id} (${t.kind}): its foot is in the water`);
    else if (c.staticId && c.staticId !== t.id) report.faults.push(`${t.id} (${t.kind}): stands on ${c.staticId}'s footprint (nothing overlaps)`);
    else if (c.route && K.solid === 'block') report.faults.push(`${t.id} (${t.kind}): blocks a path (${c.route})`);
  }
  for (const s of ctx.spots({ kind: t.kind, x: t.x, y: t.y, w: t.w, front: t.front })) {
    if (s.pierEnd) { row.acts.push({ act: s.act, stand: 'the far end of the built pier', ok: true }); continue; }
    const c = cell(s.stand.x, s.stand.y), walk = !blocks(s.stand.x, s.stand.y) || (s.boat && !blocks(s.stand.x + 0.4, s.stand.y)), edge = !!(s.edge || s.seat != null || s.wade || s.boat), rch = reachable(s.stand.x, s.stand.y) || nearReach(s.stand.x, s.stand.y, s.boat ? 1.2 : 0.6);   // (the walker gets you within reach of it; a boat is boarded from beside it)
    const ok = (walk || edge) && rch;
    row.acts.push({ act: s.act, stand: [round(s.stand.x), round(s.stand.y)], deg: s.deg, walkable: walk, reachable: rch, ok, needs: s.needs || undefined });
    if (!ok) report.faults.push(`${t.id} (${t.kind}) ${s.act}: stand ${round(s.stand.x)},${round(s.stand.y)} is ${!walk && !edge ? 'not walkable (' + (c ? (c.freshwater ? 'water' : c.solid ? 'rock' : c.staticId ? c.staticId : !c.land ? 'off the land' : '?') : 'outside') + ')' : 'not reachable from the arrival point'}`);
  }
  report.things.push(row);
}
// kinds the game knows that this layout has none of (things for the layout's authors to place)
for (const [k, K] of Object.entries(ctx.K)) if (!report.kinds[k] && (K.acts || K.pet) && !K.trunks && k !== 'seat' && k !== 'garden-well') report.missingKinds.push(k);

/* ---------- the ground ---------- */
const terr = { 'water-edge': 0, deep: 0, 'open-grass': 0, sand: 0, slope: 0, path: 0, rock: 0 };
const wet = (x, y) => { const c = cell(x, y); return !!(c && c.freshwater); };
for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
  const c = cell(x + 0.5, y + 0.5); if (!c) continue;
  if (c.freshwater) { if (wet(x + 0.5, y - 1) && wet(x + 0.5, y - 2) && wet(x + 1.5, y - 1) && wet(x - 0.5, y - 1)) terr.deep++; continue; }
  if (!c.land) continue;
  if (c.solid) { terr.rock++; continue; }
  if (c.slope || /slope|hill/i.test(c.landformId || '')) terr.slope++;
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
out.push(`PLACED ROWS WHOSE ANCHOR IS NOT IN THIS LAYOUT: ${orphans.join(', ') || 'none'}`);
out.push(`KINDS THIS LAYOUT HAS NONE OF: ${report.missingKinds.join(', ')}`);
out.push('', 'FAULTS'); for (const f of report.faults) out.push('  ' + f); if (!report.faults.length) out.push('  none');
out.push('', 'GROUND (cells, read from the layout)'); for (const [k, v] of Object.entries(report.terrain)) out.push(`  ${k}: ${v}`);
console.log(out.join('\n'));
if (arg('--json', '')) writeFileSync(arg('--json'), JSON.stringify(report, null, 1));
