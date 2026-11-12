// Generates assets/garden/island-v5.json: Fleetwater Vale (docs: C:/tmp/worlddesign/WORLD_PLAN.md).
// The layout file is the saved-world identity (hash-pinned in lib/garden-island.mjs), so it is
// written once by this script and then reviewed, never hand-edited.
//   node tools/garden-vale-layout.mjs            write the JSON and print checks
//   node tools/garden-vale-layout.mjs --svg f    also write a preview SVG of the cell raster
// Ids, zones, levels and gate ids are kept from island-v4; shapes, positions and section
// cells are new (gardens start fresh in this world, so no saved cell has to survive).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const v4 = JSON.parse(readFileSync(join(root, 'assets/garden/island-v4.json'), 'utf8'));
const W = { cols: 96, rows: 96, cellW: 48, cellH: 30 };
const r2 = n => Math.round(n * 100) / 100;
const warn = [];

/* ------------------------------------------------------------ the land */
// The coast runs off the west and north edges into the mainland (backdrop only: no cells there).
const COAST = [[-2, 83], [0, 83], [4, 84.5], [7, 87.5], [10, 86.5], [13, 89], [18, 90.5], [24, 91.5], [30, 90.5], [35, 88], [38, 84.5],
  [41, 81.5], [45, 80.3], [50, 80], [55, 80.6], [58, 81.4], [60, 82.6], [61.4, 85.4], [63.4, 86], [64.6, 87], [66, 88], [71, 87.2], [75, 84.6], [78.5, 84.2], [80.5, 86.5],
  [83, 83], [86, 79], [88.5, 73], [88, 68], [90, 62], [91.5, 56], [90.6, 50], [89.4, 46.4], [86.8, 44.4], [86.8, 40.8], [89.2, 38.6], [90, 36], [90.8, 32], [88.6, 26], [85.6, 22.4],
  [82.6, 19.5], [79.6, 16.4], [78, 12], [79.6, 8], [81.5, 4], [81, 0], [81.5, -3], [-2, -3]];

/* ------------------------------------------------------------ regions (a partition of the plane) */
const REG = {
  'north-headland': [[-16, -16], [112, -16], [112, 16.4], [79.6, 16.4], [76, 20], [70, 22], [63, 24], [58.4, 26], [47, 26.2], [37, 26.4], [30, 22.6], [20, 21.2], [10, 20.4], [-16, 20]],
  'orchard-headland': [[58.4, 26], [63, 24], [70, 22], [76, 20], [79.6, 16.4], [112, 16.4], [112, 50], [90.6, 50], [78, 50.6], [68, 48.4], [63.6, 48.6], [61, 43.6], [60.8, 34], [61, 28.6]],
  'east-mill': [[63.6, 48.6], [68, 48.4], [78, 50.6], [90.6, 50], [112, 50], [112, 112], [66.4, 112], [64.8, 84], [63.6, 77], [64.6, 68], [66.6, 60], [65, 55]],
  'home-island': [[37, 26.4], [47, 26.2], [58.4, 26], [61, 28.6], [60.8, 34], [61, 43.6], [63.6, 48.6], [65, 55], [66.6, 60], [64.6, 68], [63.6, 77], [64.8, 84], [66.4, 112], [38, 112], [38, 84.5], [36.4, 78], [35, 70], [32.6, 62], [30.6, 56], [31.4, 48], [32.4, 40], [34.6, 30]],
  'southwest-ruins': [[32.6, 62], [35, 70], [36.4, 78], [38, 84.5], [38, 112], [13.6, 112], [13, 89], [12.4, 80], [11, 74], [14.6, 68.6], [20, 64.8], [27, 62.6]],
  'west-woods': [[-16, 20], [10, 20.4], [20, 21.2], [30, 22.6], [37, 26.4], [34.6, 30], [32.4, 40], [31.4, 48], [30.6, 56], [32.6, 62], [27, 62.6], [20, 64.8], [14.6, 68.6], [11, 74], [12.4, 80], [13, 89], [13.6, 112], [-16, 112]],
};

/* ------------------------------------------------------------ water */
// Ribbons are split where a path crosses: the dry gap is the bridge, ford or stepping stones.
const LAKE = [[38.6, 34.6], [39.6, 31.2], [41.8, 28.8], [43.6, 27.9], [46.8, 27.8], [50, 28.2], [55, 28.9], [59, 31], [60.2, 35], [58.6, 38.8], [53, 40.4], [47, 40.6], [42, 39.2]];
const TARN = [[27, 11], [29, 9], [32.5, 8.8], [35, 10.4], [33.8, 13], [30, 13.6], [27.6, 12.8]];
const WOOD_POOL = [[24.6, 71.4], [26.8, 69.4], [30.6, 69.6], [32, 72], [30.4, 74.4], [26.6, 74.4]];
const ORCH_POOL = [[69, 31], [71, 29.2], [74.6, 29.4], [76, 31.6], [74.4, 33.8], [70.4, 33.6]];
const SPRING = [[4.2, 28.6], [5.8, 28.2], [7, 29.4], [6.2, 30.8], [4.6, 30.8]];
const GORGE = [[31.4, 13.2], [33.5, 16], [37, 17.6], [40, 20.2], [42.6, 23], [44.6, 25.4], [45.2, 27.6]];
const RIVER = [[58.2, 38.4], [61, 43.6], [63.6, 48.6], [65, 55], [66.6, 60], [70.2, 64.6], [73, 68], [75.6, 72.6], [77.4, 77.6], [79.4, 82.4], [80.6, 88], [81.4, 92]];
const BROOK = [[6.6, 30.2], [10, 33.6], [16, 35.4], [23, 37.2], [30, 36], [35.4, 36.4], [39.6, 35.2]];
// [polyline, half width, gaps [[x, y, half length]]]
const ribbons = {
  gorge: [GORGE, .85, [[35.8, 16.9, .8]]],
  river: [RIVER, 1.45, [[59.9, 41.1, .75], [65, 55.1, 1.25], [78.6, 80.4, .8]]],
  brook: [BROOK, .62, [[10.3, 33.7, .7], [25.6, 36.8, .7], [37.4, 36, .8]]],
};

/* ------------------------------------------------------------ geometry helpers */
function inLoop(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
function segD(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); }
function lineD(x, y, pts) { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segD(x, y, pts[i - 1], pts[i])); return d; }
function smooth(pts, n = 3) { // Catmull-Rom resample, open polyline
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); return out;
}
function smoothLoop(pts, n = 4) {
  const out = [], L = pts.length;
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => r2(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)))); }
  }
  return out;
}
// A ribbon of half width hw around a polyline, as a closed loop (with rounded-ish ends).
function ribbon(line, hw, wobble = 0) {
  const L = smooth(line, 4), left = [], right = [];
  for (let i = 0; i < L.length; i++) {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const w = hw * (1 + wobble * Math.sin(i * 1.7)) ;
    left.push([r2(L[i][0] + nx * w), r2(L[i][1] + ny * w)]); right.push([r2(L[i][0] - nx * w), r2(L[i][1] - ny * w)]);
  }
  const loop = left.concat(right.reverse()); let area = 0; for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length]; area += p[0] * q[1] - q[0] * p[1]; }
  return area < 0 ? loop.reverse() : loop;   // every basin winds the same way
}
// Split a polyline at gap points; returns sub-polylines with the gap cut out.
function splitAt(line, gaps) {
  const L = smooth(line, 6); let parts = [[]];
  for (const p of L) {
    const inGap = gaps.some(([gx, gy, h]) => Math.hypot(p[0] - gx, p[1] - gy) < h + .9);
    if (inGap) { if (parts[parts.length - 1].length) parts.push([]); continue; }
    parts[parts.length - 1].push(p);
  }
  return parts.filter(p => p.length >= 2);
}
function bbox(pts) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; }
function rect(b, pad = 0) { const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad)); return { x, y, w: Math.min(W.cols, Math.ceil(b.x1 + pad)) - x, h: Math.min(W.rows, Math.ceil(b.y1 + pad)) - y }; }

/* ------------------------------------------------------------ freshwater basins (ids kept + new river ones) */
const basin = (id, boundary, level, extra = {}) => {
  const b = bbox(boundary), area = rect(b, 1), wet = rect({ x: b.x + .3, y: b.y + .3, x1: b.x1 - .3, y1: b.y1 - .3 });
  return Object.assign({ id, area, wet, level, boundary }, extra);
};
const freshwater = [
  basin('pond', smoothLoop(LAKE, 4), 1, { name: 'The Mere' }),
  basin('allotment-pool', smoothLoop(WOOD_POOL, 4), 10, { sectionIds: ['ls-lily-pool', 'ls-stone-pool'], name: 'The woodland pond' }),
  basin('orchard-pool', smoothLoop(ORCH_POOL, 4), 14, { sectionIds: ['ls-deep-pool', 'ls-clear-pool', 'ls-moon-pool', 'ls-sedge-pool'], name: 'The orchard pond' }),
  basin('tarn', smoothLoop(TARN, 4), 18, { name: 'The source tarn' }),
  basin('spring', smoothLoop(SPRING, 3), 3, { name: 'Foxglove spring' }),
];
const riverNames = { gorge: ['The gorge', 18], river: ['Millwater river', 1], brook: ['The woodland brook', 3] };
const riverParts = {};
for (const [id, [line, hw, gaps]] of Object.entries(ribbons)) {
  riverParts[id] = splitAt(line, gaps);
  riverParts[id].forEach((part, i) => freshwater.push(basin(`${id}-${i + 1}`, ribbon(part, hw, .12), riverNames[id][1], { name: riverNames[id][0], river: id })));
}
// Basin levels follow the region they lie in.
const regionOf = (x, y) => Object.entries(REG).find(([, p]) => inLoop(x, y, p))?.[0] || '';
const regionMeta = Object.fromEntries(v4.regions.map(r => [r.id, r]));
for (const b of freshwater) if (b.river) { const c = [b.wet.x + b.wet.w / 2, b.wet.y + b.wet.h / 2], reg = regionMeta[regionOf(...c)]; b.level = reg ? reg.level : 1; }
// River fish homes (regions table): the mill race is the stretch past the mill.
const millStretch = freshwater.filter(b => b.river === 'river').sort((a, b) => b.wet.h * b.wet.w - a.wet.h * a.wet.w)[0];

/* ------------------------------------------------------------ walls and the scarp (landforms, full colliders) */
function wallSegments(id, region, kind, line, gaps, thick = 1.7, step = 5) {
  const L = smooth(line, 8), out = []; let run = [];
  const flush = () => { if (run.length >= 2) { for (let i = 0; i < run.length - 1; i += step) { const seg = run.slice(i, Math.min(run.length, i + step + 1)); if (seg.length >= 2) out.push(seg); } } run = []; };
  for (const p of L) { if (gaps.some(([gx, gy, h]) => Math.hypot(p[0] - gx, p[1] - gy) < h)) { flush(); continue; } run.push(p); }
  flush();
  return out.map((seg, i) => ({ id: `${id}-${i + 1}`, region, kind, polygon: ribbon(seg, thick / 2).map(p => [r2(p[0]), r2(p[1])]), col: 'full', reserved: true }));
}
const SCARP = [[-16, 19.6], [10, 20], [20, 20.8], [30, 22.2], [37, 25.8], [41, 25.9], [47, 25.6], [52, 25.5], [58.4, 25.5], [63, 23.6], [70, 21.6], [76, 19.6], [79.4, 16.4]];
const landforms = [
  // keep v4's peaks, moved onto the high fells
  { id: 'cloudbreak-west-peak', region: 'north-headland', kind: 'mountain', polygon: smoothLoop([[8, 8], [13, 3.6], [18, 5.4], [17, 9.4], [11, 10.4]], 3), col: 'full', reserved: true },
  { id: 'cloudbreak-east-peak', region: 'north-headland', kind: 'mountain', polygon: smoothLoop([[59, 11], [63.6, 5.4], [69, 7], [68.4, 11.6], [62.6, 13]], 3), col: 'full', reserved: true },
  { id: 'woodland-old-foundation', region: 'southwest-ruins', kind: 'ruin', polygon: smoothLoop([[22, 80.2], [25, 79.6], [25.6, 82], [22.6, 82.6]], 3), col: 'full', reserved: true },
  ...wallSegments('fell-scarp', 'north-headland', 'rock-wall', SCARP, [[42.2, 25.9, 1.7], [45.2, 25.6, 2.0], [71, 21.3, 2.2]], 1.6, 5),
  ...wallSegments('ruin-wall', 'southwest-ruins', 'ruin-wall', [[32.6, 62], [27, 62.6], [20, 64.8], [14.6, 68.6], [11, 74], [12.4, 80], [12.8, 84.4]], [[19.6, 65.1, 2.2]], 1.6, 5),
  ...wallSegments('postern-wall', 'southwest-ruins', 'ruin-wall', [[32.6, 62], [35, 70], [36.4, 78], [37.8, 83.6]], [[35.8, 74.2, 1.8]], 1.6, 5),
  ...wallSegments('orchard-bank', 'orchard-headland', 'terrace-wall', [[60.2, 27.2], [61, 28.6], [60.8, 34], [61, 39.4]], [[61, 38.4, 1.8]], 1.6, 5),
  ...wallSegments('terrace-wall', 'orchard-headland', 'terrace-wall', [[63.2, 48.6], [68, 48.4], [78, 50.6], [90.8, 50]], [[80.2, 50.4, 2.0]], 1.6, 5),
];

/* ------------------------------------------------------------ routes: main road, lanes, trails, plazas */
const route = (id, tier, points, zone, extra = {}) => {
  const widthCells = extra.widthCells || (tier === 'main' ? 3 : tier === 'lane' ? 2 : tier === 'plaza' ? 4.4 : 1.4);
  const r = { id, tier, level: 1, widthCells, points: points.map(p => [r2(p[0]), r2(p[1])]), public: zone === 0, zone };
  Object.assign(r, extra); r.widthCells = widthCells; return r;
};
const GREEN = { x: 48, y: 52, rx: 7.2, ry: 4.6 };
const greenRing = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 16; pts.push([GREEN.x + Math.cos(a) * GREEN.rx * (1 + .04 * Math.sin(i * 2.3)), GREEN.y + Math.sin(a) * GREEN.ry]); } pts[16] = pts[0].slice(); return pts; })();
const routes = [
  // the arrival spine: quay, high street, the green, the Lakeside terrace (harbour-walk[0] is the green end)
  route('harbour-walk', 'main', [[48, 57.4], [48.4, 61.6], [49.2, 66.6], [50, 71.6], [50.4, 76.4]], 0),
  route('plaza-loop', 'main', greenRing, 0, { widthCells: 2.6 }),
  route('green-terrace', 'main', [[48, 47.2], [48.2, 45.4], [48.4, 43.8]], 0),
  route('lakeside-terrace', 'plaza', [[44.4, 43.6], [52.8, 43.6]], 0, { widthCells: 3.6 }),
  route('the-quay', 'plaza', [[44.6, 77.6], [56, 77.6]], 0, { widthCells: 3.4 }),
  // village lanes and walks
  route('west-lane', 'lane', [[40.8, 52.4], [37.4, 52.8], [34, 53.2], [31, 52.4], [27, 51], [22.6, 48.6]], 0, { gateId: 'island-woods' }),
  route('east-road', 'lane', [[55.2, 52.6], [58.4, 53.4], [61.6, 54.4], [65, 55.1], [69, 56.6], [72, 58.8]], 0, { gateId: 'island-mill' }),
  route('cottage-lane', 'lane', [[45.4, 56.4], [44.2, 62.2], [41.6, 66], [38.8, 70.2], [36.6, 74.2]], 0),
  route('lake-walk-west', 'trail', [[44.4, 43.6], [40.8, 43.6], [37, 42.2], [35.6, 38.4], [36.6, 36], [36.6, 33.4], [37.6, 30.2], [40.2, 28], [42.2, 27.2]], 0),
  route('lake-walk-east', 'trail', [[52.8, 43.6], [55.6, 42.8], [58.2, 42], [59.9, 41.1]], 0),
  route('south-common', 'trail', [[53.6, 56], [56.4, 60.4], [57.2, 65.6], [55, 70.4], [50.2, 72]], 0),
  route('strand', 'trail', [[44.6, 77.6], [41.8, 79.2], [39.4, 81.6]], 0),
  route('lighthouse-walk', 'trail', [[56, 77.6], [58.2, 80], [60.4, 82.6]], 0),
  route('field-path', 'trail', [[41.6, 66], [46, 68.4], [49.4, 68.6]], 0),
  // Whispering woodland (zone 1)
  route('woods-lane', 'lane', [[22.6, 48.6], [19.4, 46.6], [16.6, 44.8]], 1),
  route('great-oak-clearing', 'plaza', [[14, 44.4], [16.6, 44.8]], 1, { widthCells: 4.6 }),
  route('woodland-loop', 'trail', [[14, 44.4], [11, 40.6], [9.6, 36.4], [10.3, 33.7], [13.6, 30.4], [20, 30.6], [24.6, 34.2], [25.6, 36.8], [27.2, 40.6], [25.4, 46], [22.6, 48.6]], 1),
  route('spring-trail', 'trail', [[11.4, 31.8], [8.6, 29.4]], 1),
  route('cove-trail', 'trail', [[11, 40.6], [7.8, 50], [6.2, 62], [5.2, 72], [6.2, 81.6]], 1),
  route('brook-walk', 'trail', [[27.2, 40.6], [31.6, 39.4], [35.2, 38.2], [37.2, 37.4]], 1),
  // Old woodland (zone 3)
  route('ruins-lane', 'lane', [[17.2, 45.6], [18.2, 53], [19, 60], [19.6, 65.1], [21, 70.4], [22.2, 74.4]], 3, { gateId: 'island-ruins' }),
  route('ruin-court', 'plaza', [[21, 74.8], [23.6, 74.8]], 3, { widthCells: 4.4 }),
  route('ruins-circuit', 'trail', [[21, 74.8], [18.6, 78.6], [15.8, 84], [21.6, 87.4], [28.6, 86.4], [32.6, 82], [33.2, 77.6], [34.6, 74.6], [35.8, 74.2], [36.6, 74.2]], 3),
  route('pond-walk', 'trail', [[23.6, 74.8], [27, 76.6], [31, 76.8], [32.6, 82]], 3),
  route('west-shore', 'trail', [[15.8, 84], [13.6, 87.6]], 3),
  // Millwater valley (zone 2)
  route('mill-lane', 'lane', [[72, 58.8], [72.8, 62.4], [73.8, 65.4]], 2),
  route('mill-yard', 'plaza', [[74, 65.8], [76.4, 65.8]], 2, { widthCells: 4 }),
  route('estuary-lane', 'lane', [[73.8, 65.4], [76.6, 69], [78.8, 73.2], [80.2, 77], [81.4, 79.4]], 2),
  route('valley-meadow', 'trail', [[76.4, 65.8], [80, 64], [84.6, 62.4], [86.4, 66.4], [85.6, 72], [82.4, 75.4], [78.8, 73.2]], 2),
  route('coast-walk', 'trail', [[81.4, 79.4], [78.6, 80.4], [76, 82.4], [71, 84.8], [66.4, 85.4], [63.8, 84.6], [61.6, 83.6]], 2),
  route('field-track', 'trail', [[79.8, 56], [84.4, 55.2], [88, 57.8], [87.4, 62], [84.6, 62.4]], 2),
  route('marsh-boardwalk', 'trail', [[81.4, 79.4], [84, 77.8], [86.2, 74.6], [85.6, 72]], 2),
  route('water-meadow', 'trail', [[67.4, 71], [70.6, 73.4], [72.6, 77.4], [71, 84.8]], 2),
  route('riverside', 'trail', [[66.4, 85.4], [67.2, 78], [67.4, 71], [64.2, 67.6], [57.2, 65.6]], 2),
  // High orchard (zone 4)
  route('orchard-stair', 'lane', [[76.4, 65.8], [78, 61.4], [79.8, 56], [80.2, 50.4], [79.6, 45], [78.4, 40], [77.8, 37]], 4, { gateId: 'island-orchard' }),
  route('cider-square', 'plaza', [[76.6, 37], [79.2, 37]], 4, { widthCells: 4 }),
  route('orchard-pass', 'trail', [[76.6, 37], [73.4, 35.8], [68.4, 35.4], [66, 31.4], [67.4, 27], [71, 23.6], [71, 21.3]], 4, { gateId: 'island-headland' }),
  route('folly-trail', 'trail', [[79.2, 37], [82.6, 34.4], [84.8, 29.6]], 4),
  route('east-beach', 'trail', [[79.2, 37], [82.4, 40.4], [85.6, 42.4]], 4),
  route('lakeside-steps', 'trail', [[59.9, 41.1], [61, 38.4], [62.6, 35.6], [65.6, 34.4], [68.4, 35.4]], 4),
  route('orchard-rows', 'trail', [[68, 42.4], [74, 41.4], [78.4, 40], [84, 45.6]], 4),
  // Cloudbreak mountains (zone 5)
  route('pass-summit', 'trail', [[71, 21.3], [70.6, 19.6], [66.4, 18.4], [60.6, 16.4], [56, 12.6], [51.6, 9.8]], 5),
  route('summit-cairn', 'plaza', [[49.6, 9.8], [51.6, 9.8]], 5, { widthCells: 3.6 }),
  route('summit-tarn', 'trail', [[49.6, 9.8], [44, 12], [38.6, 12.4], [36, 12]], 5),
  route('gorge-trail', 'trail', [[36, 12], [35.2, 15], [35.8, 16.9], [36.6, 19.8], [39.4, 22.4], [41.4, 24.4], [42.2, 25.9], [42.2, 27.2]], 5),
  route('cold-cove', 'trail', [[56, 12.6], [62, 15.6], [70.4, 14.6], [74.6, 10.6], [77.2, 9.6]], 5),
  route('moor-trail', 'trail', [[38.6, 12.4], [35.4, 7.2], [28, 6.4], [20, 12.6], [10, 14.6], [3, 14]], 5),
];

/* ------------------------------------------------------------ gates (ids, n and fromZone kept) */
const gate = (id, name, n, x, y, dx, dy, door, district, fromZone, kind, h = 4) => {
  const span = dx ? [[x + .5, y + .5 - h / 2], [x + .5, y + .5 + h / 2]] : [[x + .5 - h / 2, y + .5], [x + .5 + h / 2, y + .5]];
  return { id, name, n, x, y, dx, dy, h, widthCells: h, door, district, fromZone, crossSpan: span, kind };
};
const gates = [
  gate('island-woods', 'Forest arch', 1, 30, 52, -1, 0, { x: 32, y: 52 }, 'west-woods', 0, 'tree-arch'),
  gate('island-mill', 'Millwater bridge', 2, 66, 55, 1, 0, { x: 63, y: 54 }, 'east-mill', 0, 'bridge'),
  gate('island-ruins', 'Ruined arch', 3, 19, 65, 0, 1, { x: 19, y: 62 }, 'southwest-ruins', 1, 'ruined-arch'),
  gate('island-orchard', 'Orchard stair', 4, 80, 49, 0, -1, { x: 80, y: 52 }, 'orchard-headland', 2, 'stair'),
  gate('island-headland', 'Cloudbreak pass', 5, 71, 20, 0, -1, { x: 71, y: 23 }, 'north-headland', 4, 'pass'),
];

/* ------------------------------------------------------------ static places (ids kept) */
const v4Static = Object.fromEntries(v4.static.map(p => [p.id, p]));
const S = [];
function stat(id, x, y, extra = {}) {
  const base = v4Static[id] || {}, w = extra.w || base.w || 1, h = extra.h || base.h || 1;
  const row = Object.assign({}, base, { id, x, y, w, h }, extra);
  if (row.door !== null) row.door = extra.door || { x: x + Math.floor((w - 1) / 2), y: y + h };
  if (base.apron) row.apron = { x: x - 1, y: y + 1, w: w + 2, h: 3 };
  if (base.rearEnvelope) row.rearEnvelope = { x: r2(x + base.rearEnvelope.x - base.x), y: r2(y + base.rearEnvelope.y - base.y), w: base.rearEnvelope.w, h: base.rearEnvelope.h };
  delete row.district; row.district = extra.district || base.district || 'plaza-village';
  S.push(row); return row;
}
// the quay and harbour
stat('pier', 49, 79, { h: 5, door: { x: 50, y: 78 } });
stat('pier-2', 49, 84, { h: 4, door: null });
stat('pier-3', 49, 88, { h: 4, door: null });
stat('tackle-shop', 52, 74, { district: 'harbour-bay' });
stat('old-angler', 56, 79, { door: { x: 54.6, y: 78.8 }, district: 'harbour-bay' });   // (you stand beside him, not on him)
stat('jetty-post', 48, 81, { door: null, district: 'harbour-bay' });
stat('boat', 47.25, 82, { door: { x: 49, y: 81 }, district: 'harbour-bay' });
stat('camera-tripod', 46, 76, { door: { x: 46, y: 77 }, district: 'harbour-bay' });
stat('ld-hull', 41, 80, { door: { x: 42, y: 79 }, district: 'harbour-bay' });
stat('ld-lighthouse', 61, 84, { door: { x: 61, y: 83 }, district: 'harbour-bay' });
// the green: shops face in
stat('garden-shop', 36, 50, { door: { x: 37, y: 51 } });
stat('land-office', 43, 45, { door: { x: 44, y: 46 } });
stat('notice-board', 57, 50, { door: { x: 57, y: 51 } });
stat('market-stall', 51, 58, { door: { x: 51, y: 59 } });
stat('post-box', 46, 58, { door: { x: 46, y: 59 } });
stat('craft-bench', 54, 58, { door: { x: 54, y: 59 } });
stat('sundial', 48, 51, { door: { x: 48, y: 52 } });
stat('field-journal', 51, 49, { door: { x: 51, y: 50 } });
// the Lakeside terrace, the Mere and the falls
stat('lake-hall', 51, 41, { door: { x: 52, y: 42 }, district: 'east-hall' });
stat('lake-board', 54, 42, { door: { x: 54, y: 43 }, district: 'east-hall' });
stat('ld-bench-b', 45, 42, { door: { x: 45, y: 43 }, district: 'east-hall' });
stat('reed-bank', 39, 38, { door: null, district: 'pond-grove' });
stat('ld-falls', 44, 26, { w: 3, door: { x: 42, y: 27 }, district: 'pond-grove' });
// the regions' sights (plan §5 landmarks and §6 homes)
stat('ld-bench-a', 15, 41, { door: { x: 15, y: 42 }, district: 'west-woods' });
stat('ld-mill', 72, 63, { door: { x: 73, y: 64 }, district: 'east-mill' });
stat('smoker', 82, 77, { door: { x: 82, y: 78 }, district: 'east-mill' });
stat('ld-tower', 28, 77, { door: { x: 29, y: 78 }, district: 'southwest-ruins' });
const sightRow = id => ({ id, w: 1, h: 1, col: 'full', walk: false, level: 1, needs: null, tall: 1 });
const SIGHTS = [
  // [id, x, y, w, district, door?, col?]
  ['ld-sign-c', 41, 54, 1, 'plaza-village', { x: 41, y: 55 }, 'none'], ['ld-cross', 54, 54, 1, 'plaza-village', { x: 54, y: 55 }, 'soft'],
  ['ld-lamp-a', 47, 44, 1, 'east-hall', { x: 47, y: 45 }, 'none'], ['ld-lamp-b', 50, 76, 1, 'harbour-bay', { x: 50, y: 77 }, 'none'],
  ['ld-sunk', 34, 47, 2, 'plaza-village', { x: 35, y: 48 }], ['ld-wish', 33, 58, 1, 'plaza-village', { x: 43, y: 58 }],
  ['ld-boathouse', 55, 77, 3, 'harbour-bay', null], ['ld-bridge', 37, 36, 1, 'pond-grove', null, 'none'],
  ['ld-hollow', 13, 43, 1, 'west-woods', { x: 13, y: 44 }], ['ld-house', 6, 28, 2, 'west-woods', { x: 6, y: 27 }], ['ld-pump', 9, 30, 1, 'west-woods', { x: 10, y: 31 }],
  ['ld-driftwood', 5, 82, 2, 'west-woods', { x: 6, y: 81 }],
  ['ld-chapel', 19, 72, 3, 'southwest-ruins', { x: 20, y: 73 }], ['ld-icehouse', 26, 84, 2, 'southwest-ruins', { x: 26, y: 85 }], ['ld-statue', 24, 73, 1, 'southwest-ruins', { x: 24, y: 74 }],
  ['ld-labyrinth', 30, 80, 3, 'southwest-ruins', { x: 31, y: 81 }],
  ['ld-hide', 82, 80, 2, 'east-mill', { x: 81, y: 80 }], ['ld-frog', 69, 77, 1, 'east-mill', { x: 68, y: 77 }], ['ld-boles', 86, 61, 1, 'east-mill', { x: 85, y: 62 }],
  ['ld-barn', 82, 66, 3, 'east-mill', { x: 83, y: 67 }], ['ld-churn', 78, 63, 1, 'east-mill', { x: 78, y: 64 }], ['ld-smoke', 84, 76, 3, 'east-mill', { x: 85, y: 77 }],
  ['ld-barrels', 76, 35, 1, 'orchard-headland', { x: 76, y: 36 }], ['ld-folly', 84, 28, 2, 'orchard-headland', { x: 84, y: 30 }], ['ld-ring', 70, 39, 4, 'orchard-headland', { x: 71, y: 40 }],
  ['ld-clamp', 66, 29, 1, 'orchard-headland', { x: 66, y: 30 }], ['ld-orchard-wall', 72, 44, 2, 'orchard-headland', { x: 72, y: 45 }], ['ld-treehouse', 86, 46, 2, 'orchard-headland', { x: 86, y: 47 }],
  ['ld-beacon', 52, 8, 1, 'north-headland', { x: 52, y: 9 }], ['ld-cairn', 48, 8, 1, 'north-headland', { x: 48, y: 9 }], ['ld-stones', 44, 9, 4, 'north-headland', { x: 45, y: 11 }],
  ['ld-hut', 59, 17, 1, 'north-headland', { x: 59, y: 18 }], ['ld-grotto', 65, 13, 2, 'north-headland', { x: 65, y: 14 }], ['ld-warren', 30, 4, 1, 'north-headland', { x: 30, y: 5 }],
  ['ld-mile', 2, 52, 1, 'west-woods', { x: 3, y: 52 }],
  // the folk's story places (docs/dev/STORIES.md, "Anchors the layout must provide"): Hollin's hut off the ruins circuit,
  // Thistle's old house at the top of the woods, the great stump where Tam digs (feat/find-gates' lantern)
  ['ld-woodhut', 13, 76, 2, 'southwest-ruins', { x: 14, y: 77 }], ['ld-oldhouse', 22, 26, 2, 'west-woods', { x: 23, y: 27 }], ['ld-stump', 21, 44, 1, 'west-woods', { x: 21, y: 45 }],
];
for (const [id, x, y, w, district, door, col] of SIGHTS) stat(id, x, y, Object.assign(sightRow(id), { w, district, door: door === undefined ? undefined : door, col: col || 'full' }));
for (const p of S) if (p.door === undefined) p.door = { x: p.x, y: p.y + 1 };
// the story places that are part of something already drawn: points only, no art and no footprint (read by 94-garden-wonder-1kin.js _wkAnchor and the gates' finds)
const storyAnchors = {
  'ld-ruined-arch': { x: 19.5, y: 67, of: 'island-ruins' }, 'ld-falls-cave': { x: 42.2, y: 26.4, of: 'fleet-falls' }, 'ld-lamp-room': { x: 61.5, y: 83.6, of: 'ld-lighthouse' },
  'ld-mill-office': { x: 76.5, y: 64.6, of: 'ld-mill' }, 'ld-hothouse': { x: 39.5, y: 63.5, of: 'lc-glasshouse' }, 'ld-terrace-bench': { x: 47.5, y: 43.6, of: 'lakeside-terrace' },
};

/* ------------------------------------------------------------ side piers (lv 10 ruins shore, lv 14 orchard beach) */
const reservedSidePiers = [
  { id: 'reserved-west-pier', side: 'west', level: 10, reserved: { x: 6, y: 88, w: 7, h: 2 }, entry: { x: 13, y: 88 }, apron: { x: 13, y: 86, w: 3, h: 4 }, upgrades: v4.reservedSidePiers[0].upgrades.replace('old woodland shore', 'old woodland shore at Wren point') },
  { id: 'reserved-east-pier', side: 'east', level: 14, reserved: { x: 87, y: 42, w: 7, h: 2 }, entry: { x: 86, y: 42 }, apron: { x: 83, y: 41, w: 3, h: 4 }, upgrades: v4.reservedSidePiers[1].upgrades },
];

/* ------------------------------------------------------------ the cell raster (same rules as 94-garden-0island.js) */
const signedArea = l => { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const landLoop = smoothLoop(COAST, 4).map(p => p.map(r2)), land = [signedArea(landLoop) > 0 ? landLoop : landLoop.reverse()];   // the same winding as v4's coast
const landAt = (x, y) => inLoop(x, y, land[0]);
const coastD = (x, y) => { let d = Infinity; for (let i = 0; i < land[0].length; i++) { const a = land[0][i], b = land[0][(i + 1) % land[0].length], ax = a[0] * W.cellW, ay = a[1] * W.cellH, dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH, t = Math.max(0, Math.min(1, ((x * W.cellW - ax) * dx + (y * W.cellH - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(x * W.cellW - ax - dx * t, y * W.cellH - ay - dy * t)); } return d; };
const inRect = (x, y, r) => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const onRoute = (x, y, r) => lineD(x, y, r.points) <= r.widthCells / 2;
const cells = [];
for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
  const cx = x + .5, cy = y + .5, l = landAt(cx, cy), fw = l && freshwater.some(b => inLoop(cx, cy, b.boundary)), beach = l && !fw && coastD(cx, cy) <= 76;
  const rt = l && routes.find(r => onRoute(cx, cy, r)), st = S.find(p => inRect(cx, cy, p)), ap = l && S.find(p => p.apron && inRect(cx, cy, p.apron)), rear = l && S.find(p => p.rearEnvelope && inRect(cx, cy, p.rearEnvelope));
  const side = reservedSidePiers.find(p => inRect(cx, cy, p.reserved) || inRect(cx, cy, p.apron)), lf = l && landforms.find(f => inLoop(cx, cy, f.polygon));
  const reg = l ? regionOf(cx, cy) : '';
  cells.push({ x, y, land: l, fw, beach, route: rt ? rt.id : '', st: st ? st.id : '', lf: lf ? lf.id : '', reserved: !!(lf || st || ap || rt || rear || side), reg, zone: reg ? regionMeta[reg].zone : -1 });
}
const C = (x, y) => x >= 0 && y >= 0 && x < W.cols && y < W.rows ? cells[y * W.cols + x] : null;
for (const c of cells) if (c.land && !c.reg) warn.push(`land cell ${c.x},${c.y} has no region`);

/* ------------------------------------------------------------ sections: hand-placed starter beds, the rest packed by kind */
const RSE = v4.retainedSectionEntitlements, v4Cells = v4.sectionCells;
const ZONE_BY_ID = {
  1: 'reed-isle rush-hollow snipe-rough sallow-carr willow-foot clover-corner buttercup-bank sunny-doorstep blackbird-corner hazel-copse foxglove-strip fern-hollow bluebell-wood ivy-corner strawberry-bank rhubarb-patch walnut-shade owl-wood beech-top ness-wood',
  2: 'first-furrow onion-bed potato-ground bean-corner allot-row bean-beds hop-garden black-soil pea-sticks market-beds giant-veg deep-loam prize-beds kingcup bulrush-edge frog-steps dragonfly-bank sedge-isle marigold-bank moorhen-bank bittern-reach boat-bank heron-isle iris-bed last-bank lark-marsh maze-ground otter-run alder-carr far-willows herb-wall',
  3: 'tiny-isle wader-flats lily-pool stone-pool otter-holt heronry hazel-isle ferny-way exotic-glade hermit-corner silver-birches gull-rest sandy-spit spit-end cockle-bank otter-beach walled-garden',
  4: 'windfall crab-row apple-row cherry-row damson-dip gate-pear cider-nook old-plum medlar-strip sun-terrace espalier nursery deep-pool clear-pool moon-pool sedge-pool cowslip-rise bee-bank orchid-slope thyme-terrace',
  5: 'warm-stones long-view windy-flats skylark-top high-pasture rabbit-warren mist-meadow world-end far-shore',
};
const zoneOfSection = {};
ZONE_BY_ID[0] = 'pumpkin-nook salad-strip seedling-rows';
for (const [z, list] of Object.entries(ZONE_BY_ID)) for (const s of list.split(' ')) zoneOfSection['ls-' + s] = +z;
for (const s of RSE) { if (s.id.startsWith('lc-')) zoneOfSection[s.id] = 0; if (zoneOfSection[s.id] === undefined) { warn.push('no zone for ' + s.id); zoneOfSection[s.id] = v4.sectionZones[s.id]; } }
const zoneRegion = Object.fromEntries(v4.regions.map(r => [r.zone, r.id]));
const taken = new Set(), K = (x, y) => x + ',' + y;
const sectionCells = {};
const BED = { x: 36, y: 57, w: 7, h: 4 };
const HEART = { x: BED.x + 1, y: BED.y };
sectionCells['lc-front-bed'] = []; sectionCells['lc-cottage-bed'] = [];
for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 7; dx++) { sectionCells['lc-front-bed'].push([BED.x + dx, BED.y + dy]); sectionCells['lc-cottage-bed'].push([BED.x + dx, BED.y + 2 + dy]); }
for (const id of ['lc-front-bed', 'lc-cottage-bed']) for (const [x, y] of sectionCells[id]) { const c = C(x, y); if (!c.land || c.fw || c.beach || c.reserved) warn.push(`starter bed ${id} cell ${x},${y} is not free (${c.route || c.st || c.lf || (c.beach ? 'beach' : '')})`); taken.add(K(x, y)); }
const shapeOf = n => n >= 19 ? [5, 4] : n >= 14 ? [7, 2] : n >= 12 ? [4, 3] : n >= 9 ? [3, 3] : n >= 6 ? [3, 2] : [2, 2];
const free = (x, y, zone) => { const c = C(x, y); return !!c && c.land && !c.fw && !c.beach && !c.reserved && c.zone === zone && !taken.has(K(x, y)) && x >= 1 && y >= 1 && x < W.cols - 1 && y < W.rows - 1; };
const routeD = (x, y, zone) => { let d = Infinity; for (const r of routes) if (r.zone === zone || (zone === 0 && r.public)) d = Math.min(d, lineD(x, y, r.points) - r.widthCells / 2); return d; };
const waterD = (x, y, ids) => { let d = Infinity; for (const b of freshwater) if (!ids || ids.includes(b.id) || ids.includes(b.river)) for (const p of b.boundary) d = Math.min(d, Math.hypot(p[0] - x, p[1] - y)); return d; };
const seaD = (x, y) => coastD(x, y) / W.cellH;
// Where each kind likes to be, per zone (lower is better). Every plot stays near a way in.
function score(kind, id, x, y, zone) {
  let s = Math.abs(routeD(x, y, zone) - 2.2) * 1.4;
  if (kind === 'pool') { const pool = freshwater.find(b => (b.sectionIds || []).includes(id)); s += pool ? waterD(x, y, [pool.id]) * 2 : 0; }
  if (kind === 'pondedge') s += waterD(x, y, ['pond']) * 3;
  if (kind === 'reed') s += Math.min(waterD(x, y, ['river', 'brook', 'pond']), seaD(x, y)) * 1.2;
  if (kind === 'rock' && zone !== 5) s += seaD(x, y) * .8;
  if (zone === 0) { // village: the cottage gardens and the south common fields, never the lakeshore paths
    if (kind === 'green') s += Math.hypot((x - GREEN.x) / GREEN.rx, (y - GREEN.y) / GREEN.ry) * 3;
    if (/patch|bed|glass|meadow/.test(kind)) s += Math.abs(y - 63) * .5 + Math.abs(x - 44) * .25;
    if (kind === 'orchard') s += Math.hypot(x - 57, y - 64) * .6;
    if (kind === 'wood') s += Math.hypot(x - 36, y - 44) * .6;
  }
  if (zone === 2 && /veg|rich/.test(kind)) s += Math.hypot(x - 80, y - 61) * .3;
  if (zone === 4 && /orchard/.test(kind)) s += Math.abs(y - 41) * .4;
  return s;
}
// The pond plot follows the Mere's bank: a connected run of free bank cells (any shape).
{ const n = v4Cells['lc-pond'].length, bank = (x, y) => free(x, y, 0) && waterD(x + .5, y + .5, ['pond']) <= 2.4 && !taken.has(K(x - 1, y)) || false;
  const seeds = cells.filter(c => bank(c.x, c.y)).sort((a, b) => Math.hypot(a.x - 38, a.y - 39) - Math.hypot(b.x - 38, b.y - 39)), got = [], seen = new Set();
  const queue = seeds.length ? [[seeds[0].x, seeds[0].y]] : [];
  while (queue.length && got.length < n) { const [x, y] = queue.shift(), k = K(x, y); if (seen.has(k) || !bank(x, y)) continue; seen.add(k); got.push([x, y]); for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) queue.push([x + dx, y + dy]); }
  if (got.length < 4) warn.push('no bank for lc-pond'); for (const [x, y] of got) taken.add(K(x, y)); sectionCells['lc-pond'] = got.sort((a, b) => a[1] - b[1] || a[0] - b[0]); }
const order = RSE.filter(s => !sectionCells[s.id]).map(s => ({ s, n: v4Cells[s.id].length, zone: zoneOfSection[s.id] })).sort((a, b) => b.n - a.n || a.s.id.localeCompare(b.s.id));
for (const { s, n, zone } of order) {
  const [w0, h0] = shapeOf(n); let best = null;
  for (const [w, h] of [[w0, h0], [h0, w0]]) for (let y = 1; y < W.rows - h; y++) for (let x = 1; x < W.cols - w; x++) {
    let ok = true;
    for (let dy = -1; dy <= h && ok; dy++) for (let dx = -1; dx <= w && ok; dx++) {
      const inside = dx >= 0 && dy >= 0 && dx < w && dy < h;
      if (inside ? !free(x + dx, y + dy, zone) : taken.has(K(x + dx, y + dy))) ok = false;
    }
    if (!ok) continue;
    // a way in: one neighbouring cell is walkable ground of the same zone
    let door = false;
    for (let dx = 0; dx < w && !door; dx++) for (const yy of [y - 1, y + h]) { const c = C(x + dx, yy); if (c && c.land && !c.fw && !c.lf && !c.st && c.zone === zone) door = true; }
    if (!door) continue;
    if (routeD(x + w / 2, y + h / 2, zone) > 3 + Math.max(w, h) / 2) continue;   // every plot is beside a path
    if (s.kind === 'pondedge' && waterD(x + w / 2, y + h / 2, ['pond']) > Math.max(w, h) / 2 + 1.5) continue;   // the pond plot is on the Mere's bank
    const sc = score(s.kind, s.id, x + w / 2, y + h / 2, zone);
    if (!best || sc < best.sc) best = { sc, x, y, w, h };
  }
  if (!best) { warn.push(`no room for ${s.id} (${s.kind}, ${n}) in zone ${zone}`); sectionCells[s.id] = []; continue; }
  const out = [];
  for (let dy = 0; dy < best.h; dy++) for (let dx = 0; dx < best.w; dx++) if (out.length < Math.max(n, 4)) { out.push([best.x + dx, best.y + dy]); taken.add(K(best.x + dx, best.y + dy)); }
  sectionCells[s.id] = out;
}
const sectionZones = Object.fromEntries(RSE.map(s => [s.id, zoneOfSection[s.id]]));

/* ------------------------------------------------------------ checks */
for (const r of routes) for (let i = 1; i < r.points.length; i++) { const a = r.points[i - 1], b = r.points[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .25); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (!landAt(x, y)) { warn.push(`route ${r.id} leaves land at ${r2(x)},${r2(y)}`); break; } const c = C(Math.floor(x), Math.floor(y)); if (c && (c.fw || c.lf)) { warn.push(`route ${r.id} crosses ${c.fw ? 'water' : c.lf} at cell ${c.x},${c.y}`); k = n; i = r.points.length; } } }
for (const p of S) { if (p.walk || p.col === 'none' || p.id === 'ld-falls') continue; for (let y = Math.floor(p.y); y < p.y + p.h; y++) for (let x = Math.floor(p.x); x < p.x + p.w; x++) { const c = C(x, y); if (!c || !c.land || c.fw) { warn.push(`static ${p.id} cell ${x},${y} is on water`); } else if (c.lf) warn.push(`static ${p.id} on ${c.lf}`); } if (p.door) { const c = C(Math.floor(p.door.x), Math.floor(p.door.y)); if (!c || !c.land || c.fw || c.lf) warn.push(`static ${p.id} door ${p.door.x},${p.door.y} is not on land`); else if (regionMeta[c.reg].zone !== (regionMeta[regionOf(p.x + p.w / 2, p.y + .5)] || {}).zone) warn.push(`static ${p.id} door is in another region`); } }
for (const p of S) { const c = C(Math.floor(p.x), Math.floor(p.y)); if (p.district && regionMeta[p.district] && c && c.reg !== p.district) warn.push(`static ${p.id} lies in ${c.reg}, not ${p.district}`); }
for (const [id, a] of Object.entries(storyAnchors)) { const c = C(Math.floor(a.x), Math.floor(a.y)); if (!c || !c.land || c.fw) warn.push(`story anchor ${id} is not on land`); }
for (const g of gates) { const c = C(g.x, g.y), d = C(g.door.x, g.door.y); if (!c || c.zone !== g.n) warn.push(`gate ${g.id} cell is in zone ${c && c.zone}`); if (!d || d.zone !== g.fromZone) warn.push(`gate ${g.id} door is in zone ${d && d.zone}`); if (c && !c.route) warn.push(`gate ${g.id} is not on a path`); }
const start = { x: 48, y: 54 }; { const c = C(start.x, start.y); if (!c || c.zone !== 0 || c.fw || c.lf || c.st) warn.push('start is not on open village ground'); }

/* ------------------------------------------------------------ districts (ids kept) */
const dist = (id, b, extra) => Object.assign({}, v4.districts.find(d => d.id === id), { bounds: b }, extra || {});
const regionBounds = id => { const cs = cells.filter(c => c.land && c.reg === id); const xs = cs.map(c => c.x), ys = cs.map(c => c.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 }; };
const districts = [
  dist('garden-core', { x: BED.x, y: BED.y, w: BED.w, h: BED.h }, { name: 'The cottage gardens', role: 'The two starter beds, 7 x 2 each, beside the green.' }),
  dist('south-grow-common', { x: 36, y: 60, w: 24, h: 13 }, { name: 'The south common', role: 'Field strips and allotments between the green and the quay.' }),
  dist('plaza-village', { x: 34, y: 45, w: 27, h: 14 }, { name: 'The green', role: 'The hub: shops face in round the green; the signpost points to every region.' }),
  dist('pond-grove', { x: 37, y: 25, w: 25, h: 17 }, { name: 'The Mere', role: 'The village lake, with Fleet Falls in its north-west corner.' }),
  dist('east-hall', { x: 43, y: 40, w: 13, h: 5 }, { name: 'Lakeside terrace', role: 'The lake hall and the bench with the falls view.' }),
  dist('harbour-bay', { x: 38, y: 72, w: 26, h: 20 }, { name: 'The quay', role: 'Pier, tackle shop and lighthouse; travellers and friends land here.' }),
  ...['west-woods', 'east-mill', 'southwest-ruins', 'orchard-headland', 'north-headland'].map(id => dist(id, regionBounds(id))),
];

/* ------------------------------------------------------------ the regions */
const regions = v4.regions.map(r => Object.assign({}, r, { polygons: [REG[r.id]] }, r.id === 'home-island' ? { name: 'Fleetwater' } : {}));

/* ------------------------------------------------------------ what the painter reads (presentation only, no collision) */
const presentation = {
  name: 'Fleetwater Vale',
  storyAnchors,
  mainland: { note: 'Past the west and north edges the land runs on as backdrop: hills and fells in haze. No cells, nothing to walk or save.', edges: ['west', 'north'] },
  rivers: Object.fromEntries(Object.entries(ribbons).map(([id, [line, hw]]) => [id, { name: riverNames[id][0], halfWidth: hw, line: smooth(line, 4).map(p => [r2(p[0]), r2(p[1])]) }])),
  falls: { id: 'fleet-falls', name: 'Fleet Falls', x: 44, y: 24.6, w: 3, h: 3, pool: [45.4, 28.4], caveStair: [42.2, 25.9], note: 'Drops off the scarp into the NW corner of the Mere; the cave stair runs behind it on the west side.' },
  crossings: [
    { id: 'falls-footbridge', kind: 'footbridge', over: 'brook', x: 37.4, y: 36, along: 'lake-walk-west' },
    { id: 'outlet-footbridge', kind: 'footbridge', over: 'river', x: 59.9, y: 41.1, along: 'lakeside-steps' },
    { id: 'millwater-bridge', kind: 'hump-bridge', over: 'river', x: 65, y: 55.1, along: 'east-road', gateId: 'island-mill' },
    { id: 'estuary-stones', kind: 'stepping-stones', over: 'river', x: 78.6, y: 80.4, along: 'coast-walk' },
    { id: 'gorge-stones', kind: 'stepping-stones', over: 'gorge', x: 35.8, y: 16.9, along: 'gorge-trail' },
    { id: 'brook-stones-west', kind: 'stepping-stones', over: 'brook', x: 10.3, y: 33.7, along: 'woodland-loop' },
    { id: 'brook-stones-east', kind: 'stepping-stones', over: 'brook', x: 25.6, y: 36.8, along: 'woodland-loop' },
  ],
  plazas: [
    { id: 'the-green', route: 'plaza-loop', x: GREEN.x, y: GREEN.y, rx: GREEN.rx - 1.3, ry: GREEN.ry - 1.3, job: 'hub: garden shop W, land office NW (the falls behind it), notice board E, market and post S; a great lime and the sundial fountain in the middle' },
    { id: 'the-quay', route: 'the-quay', x: 50.3, y: 77.6, job: 'pier, tackle shop, boathouse; travellers and friends land here' },
    { id: 'lakeside-terrace', route: 'lakeside-terrace', x: 48.6, y: 43.6, job: 'lake hall facing the water, the bench with the falls view' },
    { id: 'great-oak-clearing', route: 'great-oak-clearing', x: 15.3, y: 44.6, job: 'the Great Oak (draw a huge oak crown here, seen from the Forest arch)' },
    { id: 'mill-yard', route: 'mill-yard', x: 74.2, y: 65.8, job: 'the watermill and its turning wheel on the river' },
    { id: 'ruin-court', route: 'ruin-court', x: 22.3, y: 74.8, job: 'the chapel and old foundations' },
    { id: 'cider-square', route: 'cider-square', x: 77.9, y: 37, job: 'barrels, the press' },
    { id: 'summit-cairn', route: 'summit-cairn', x: 50.6, y: 9.8, job: 'the cairn and the beacon' },
  ],
  gateKinds: Object.fromEntries(gates.map(g => [g.id, g.kind])),
  shortcuts: [
    { id: 'coast-walk', route: 'coast-walk', from: 'east-mill', to: 'home-island', level: 6, note: 'estuary stepping stones to the lighthouse and quay' },
    { id: 'postern', route: 'ruins-circuit', from: 'southwest-ruins', to: 'home-island', level: 10, at: [35.8, 74.2], note: 'a gap in the ruin wall onto the cottage lane' },
    { id: 'lakeside-steps', route: 'lakeside-steps', from: 'orchard-headland', to: 'home-island', level: 14, at: [61, 38.4], note: 'steps down the orchard bank to the outlet footbridge' },
    { id: 'falls-cave-stair', route: 'gorge-trail', from: 'north-headland', to: 'home-island', level: 18, at: [42.2, 25.9], note: 'behind the falls, down to the lake walk' },
  ],
  landmarks: { lighthouse: 'ld-lighthouse', watchtower: 'ld-tower', folly: 'ld-folly', greatOak: 'great-oak-clearing', beacon: 'ld-beacon', millWheel: 'ld-mill', falls: 'ld-falls' },
  mist: 'Each closed region already gets mist from its polygon (94-garden-native-frontier.js).',
  millRace: millStretch.id,
};

/* ------------------------------------------------------------ write */
const out = {
  id: 'island-v5-fleetwater-vale', version: 5,
  mechanics: { revision: 3, predecessorLayout: 'cbc9629edd7fb57272e9d21b', contract: 'fleetwater-vale-fresh-start-v1' },
  world: Object.assign({}, v4.world, { v: 5, start }),
  anchors: { heart: HEART, bed: BED, start },
  coast: { land, oceanBounds: v4.coast.oceanBounds, visualOceanBounds: v4.coast.visualOceanBounds, beachWidthPx: 76 },
  freshwater, districts, static: S, routes, reservedSidePiers,
  beachHabitats: v4.beachHabitats,
  retainedSectionEntitlements: RSE.map(s => ({ id: s.id, kind: s.kind, fam: s.fam, level: s.level, buy: s.buy, region: s.region })),
  sectionZones,
  featurePolicy: Object.assign({}, v4.featurePolicy, { defaultStaticIds: S.map(p => p.id) }),
  physicalContract: Object.assign({}, v4.physicalContract, { gateCrossings: 'Each gate stands on its path at a natural crossing (arch, bridge, stair, pass). A closed region is locked whole; walls and the scarp keep open regions to their paths and shortcuts.', fresh: 'Gardens from earlier layouts start fresh here; nothing is carried over.' }),
  gates, sectionCells,
  allotmentPolicy: Object.assign({}, v4.allotmentPolicy, { assignedCells: Object.values(sectionCells).reduce((n, c) => n + c.length, 0), treePriority: 'Every section has a coherent 2x2 or larger footprint, packed by kind near its paths. Starter beds stay 7x2 each.' }),
  regions, landforms,
  placementAnchors: { policy: v4.placementAnchors.policy, features: {}, sights: {} },
  presentation,
};
const text = JSON.stringify(out);
writeFileSync(join(root, 'assets/garden/island-v5.json'), text);
{ // the identity pins follow the file (lib/garden-island.mjs, lib/garden-island-identity.mjs)
  const sha = createHash('sha256').update(text).digest('hex'), pin = (file, re, value) => { const f = join(root, file), t = readFileSync(f, 'utf8'); if (!re.test(t)) throw Error('pin not found in ' + file); writeFileSync(f, t.replace(re, value)); };
  pin('lib/garden-island.mjs', /GARDEN_VALE_SHA256='[0-9a-f]{64}'/, `GARDEN_VALE_SHA256='${sha}'`);
  pin('lib/garden-island-identity.mjs', /GARDEN_EXPANDED_WORLD=Object\.freeze\(\[5,'[0-9a-f]{24}'\]\)/, `GARDEN_EXPANDED_WORLD=Object.freeze([5,'${sha.slice(0, 24)}'])`);
  console.log('island-v5', sha.slice(0, 24));
}
const byZone = {}; for (const [id, z] of Object.entries(sectionZones)) byZone[z] = (byZone[z] || 0) + (sectionCells[id].length ? 1 : 0);
console.log('sections placed per zone', JSON.stringify(byZone), 'statics', S.length, 'routes', routes.length, 'basins', freshwater.length, 'landforms', landforms.length);
for (const z of [0, 1, 2, 3, 4, 5]) console.log('zone', z, 'land cells', cells.filter(c => c.land && c.zone === z).length, 'free', cells.filter(c => c.land && c.zone === z && !c.fw && !c.reserved && !c.beach).length);
console.log(warn.length ? 'WARNINGS\n' + warn.join('\n') : 'no warnings');

/* ------------------------------------------------------------ preview SVG */
const svgAt = process.argv.indexOf('--svg');
if (svgAt > 0) {
  const P = 10, col = { 'home-island': '#d4dca0', 'west-woods': '#8db07a', 'east-mill': '#bcd394', 'southwest-ruins': '#a7ad8c', 'orchard-headland': '#e0d494', 'north-headland': '#bdb9a8' };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${96 * P}" height="${96 * P}" viewBox="0 0 ${96 * P} ${96 * P}"><rect width="100%" height="100%" fill="#6fa6c2"/>`;
  for (const c of cells) { if (!c.land) continue; let f = col[c.reg] || '#f0f'; if (c.beach) f = '#e8d8a6'; if (c.fw) f = '#5b9cc0'; if (c.route) f = '#c9a76e'; if (c.lf) f = '#6b665c'; if (c.st) f = '#7a4b33'; if (taken.has(K(c.x, c.y))) f = '#8a6a3a'; s += `<rect x="${c.x * P}" y="${c.y * P}" width="${P}" height="${P}" fill="${f}"/>`; }
  for (const [id, cs] of Object.entries(sectionCells)) for (const [x, y] of cs) s += `<rect x="${x * P + 1}" y="${y * P + 1}" width="${P - 2}" height="${P - 2}" fill="${id.startsWith('lc-') ? '#6b8f3a' : '#9b7a46'}"/>`;
  for (const g of gates) s += `<circle cx="${(g.x + .5) * P}" cy="${(g.y + .5) * P}" r="6" fill="#d0342c"/><text x="${(g.x + 1.2) * P}" y="${(g.y + .4) * P}" font-size="11" font-family="sans-serif" fill="#600">${g.n} ${g.name}</text>`;
  s += `<circle cx="${(start.x + .5) * P}" cy="${(start.y + .5) * P}" r="5" fill="#fff" stroke="#000"/>`;
  for (const p of S) if (/^ld-|shop|office|hall|board|stall/.test(p.id)) s += `<text x="${p.x * P}" y="${p.y * P - 2}" font-size="8" font-family="sans-serif" fill="#222">${p.id.replace(/^ld-/, '')}</text>`;
  s += '</svg>';
  writeFileSync(process.argv[svgAt + 1], s);
}
