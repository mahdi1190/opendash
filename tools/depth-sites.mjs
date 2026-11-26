#!/usr/bin/env node
// Depth sites (a dev tool, not a test): checks the ways underground (assets/garden/vale-depth.json, any `things` row of kind tunnel)
// against a layout's own cells, by the same geometry the game uses (src/app/94-garden-zz-8depth-0rules.js gardenTunnelGeom). For each
// tunnel and each of its mouths: where you stand to go in is open land you can stand on (not water, rock, a building or someone's plot);
// the opening itself lies off paths, plots and water (an arch or an adit is cut into the wall or rock it stands against); mouths keep three
// cells from any other tunnel's; every mouth's stair reaches the passages. Nothing names a place: a new row anywhere is checked the same.
//   node tools/depth-sites.mjs                         this worktree's layout and rows
//   node tools/depth-sites.mjs --island path.json      any layout file
//   node tools/depth-sites.mjs --json out.json         the full report
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadGardenThings } from '../lib/garden-things.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const data = JSON.parse(readFileSync(arg('--island', join(root, 'assets/garden/island-v5.json')), 'utf8'));
const W = Object.assign({}, data.world);
const ctx = { console, Math, Object, Array, Number, String, JSON, Infinity, NaN, isFinite, Map, Set };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-zz-8depth-0rules.js'), 'utf8') + '\n;this.geom=gardenTunnelGeom;this.free=gardenTunnelFree;', ctx);
const isl = { GARDEN_WORLD: W, GardenIslandLayout: { data }, GardenIslandCanonicalLayout: { data }, _GD_LAND: new Set(), _GD_WORKS: new Map(), GARDEN_PROPS: [], GARDEN_LAND_THICKET: [], gardenArea: () => null, gardenWorkOwned: () => false, Math, Object, Array, Map, Set, Number, String, JSON, Infinity, NaN, isFinite, Uint8Array, Int8Array, Float32Array };
vm.createContext(isl);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-0island.js'), 'utf8') + '\n;this.cell=gardenIslandBaseCell;this.land=gardenIslandLandContains;this.fresh=gardenIslandFreshwaterContains;', isl);
const forms = (data.landforms || []).filter(f => f.col === 'full' && Array.isArray(f.polygon));
const inPoly = (px, py, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1] || 1e-9) + a[0]) ins = !ins; } return ins; };
const plots = new Set(); for (const cells of Object.values(data.sectionCells || {})) for (const c of cells || []) if (Array.isArray(c)) plots.add(c[0] + ',' + c[1]);
const what = (x, y) => { const c = isl.cell(x, y); if (!c) return 'off the map'; if (!isl.land(x, y)) return 'the sea'; if (isl.fresh(x, y)) return 'water'; const f = forms.find(f => inPoly(x, y, f.polygon)); if (f) return 'rock (' + f.id + ')'; if (c.staticId) return 'a building (' + c.staticId + ')'; if (plots.has(Math.floor(x) + ',' + Math.floor(y))) return 'a plot'; if (c.route) return 'a path'; return ''; };
const statics = new Map((data.static || []).map(s => [s.id, s]));
const rows = loadGardenThings(root).things.filter(r => r.kind === 'tunnel').concat((data.things || []).filter(r => r && r.kind === 'tunnel'));
const report = { layout: data.id, tunnels: [], faults: [] };
const all = [];
for (const r of rows) {
  let x = Number(r.x), y = Number(r.y);
  if (r.on) { const s = statics.get(r.on); if (!s) { report.faults.push(`${r.id}: placed on ${r.on}, which this layout has not got: the game leaves it out`); continue; } x = s.x + s.w / 2 + ((r.at || [])[0] || 0); y = s.y + s.h + ((r.at || [])[1] || 0); }
  const G = ctx.geom(r, x, y, W), row = { id: r.id, style: G.style, at: [x, y], mouths: [], fault: G.fault };
  if (G.fault) { report.faults.push(`${r.id}: ${G.fault}`); report.tunnels.push(row); continue; }
  for (const m of G.mouths) {
    const stand = what(m.x, m.y), cell = isl.cell(m.x, m.y) || {}, built = m.by === 'arch' || m.by === 'adit', issues = [];
    if (stand && stand !== 'a path') issues.push('you would stand on ' + stand);
    for (let t = 0.25; t <= 0.95; t += 0.1) { const ox = m.x + m.fx * t, oy = m.y + m.fy * t, w = what(ox, oy); if (!w || (built && /^rock|^a building/.test(w))) continue; if ((w === 'a path' && !built) || w === 'a plot' || w === 'water' || w === 'the sea' || (!built && /^rock|^a building/.test(w))) { issues.push('its opening lies on ' + w); break; } }   // (an arch or an adit opens off whatever ground is before it, a path to its door too)
    for (const o of all) if (o.id !== r.id && Math.hypot(o.x - m.x, o.y - m.y) < 3) issues.push(`within 3 cells of ${o.id}'s mouth`);
    row.mouths.push({ i: m.i, by: m.by, face: m.face, at: [+m.x.toFixed(2), +m.y.toFixed(2)], region: cell.region || '', ok: !issues.length, issues });
    for (const s of issues) report.faults.push(`${r.id} mouth ${m.i} (${m.by} at ${m.x.toFixed(2)},${m.y.toFixed(2)}): ${s}`);
  }
  for (const m of G.mouths) all.push({ id: r.id, x: m.x, y: m.y });
  row.chambers = G.ells.map(c => ({ what: c.what, at: [+c.cx.toFixed(2), +c.cy.toFixed(2)] }));
  row.cells = G.cbox.map(v => +v.toFixed(1));
  report.tunnels.push(row);
}
const out = [`DEPTH SITES  ${report.layout}  tunnels: ${report.tunnels.length}  faults: ${report.faults.length}`];
for (const t of report.tunnels) out.push(`  ${t.id.padEnd(16)} ${String(t.style).padEnd(7)} ${t.fault ? 'LEFT OUT: ' + t.fault : t.mouths.map(m => `${m.by}/${m.face}@${m.at.join(',')} (${m.region})${m.ok ? '' : ' !'}`).join('  ') + '  chambers: ' + (t.chambers || []).map(c => c.what).join(', ')}`);
out.push('FAULTS'); out.push(...(report.faults.length ? report.faults.map(f => '  ' + f) : ['  none']));
console.log(out.join('\n'));
if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify(report, null, 1));
process.exitCode = report.faults.length ? 1 : 0;
