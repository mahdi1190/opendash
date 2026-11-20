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
// Millwater valley (zone 2) is hand-authored in assets/garden/vale-valley.json (round 3), read the way the village's file is.
const VL = JSON.parse(readFileSync(join(root, 'assets/garden/vale-valley.json'), 'utf8'));
// The High orchard (zone 4, VH) is hand-authored in assets/garden/vale-orchard.json (round 3 layouts), as the village is.
const VH = JSON.parse(readFileSync(join(root, 'assets/garden/vale-orchard.json'), 'utf8'));
// Cloudbreak mountains (zone 5) are hand-authored in assets/garden/vale-mountains.json, like the village (the approved plan, 19 Nov 2026)
const VM = JSON.parse(readFileSync(join(root, 'assets/garden/vale-mountains.json'), 'utf8'));
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
// Whispering woodland (zone 1) is hand-authored in assets/garden/vale-woodland.json (round 3), read like the village's file.
const VW = JSON.parse(readFileSync(join(root, 'assets/garden/vale-woodland.json'), 'utf8'));
// extra dry gaps cut after the old ones, so the river pieces that were there keep their ids (brook-2 is the fish's home)
const extraGaps = { brook: (VW.crossings || []).filter(c => c.over === 'brook').map(c => [c.x, c.y, c.gap || .55]) };
const ribbons = {
  gorge: [GORGE, .85, [[35.8, 16.9, .8], [41.95, 22.3, .9]]],   // (2.74 Cloudbreak: the lip stones cross above the falls; a third piece of gorge, gorge-3, below them)
  river: [RIVER, 1.45, [[59.9, 41.1, .75], [65, 55.1, 1.25], [78.6, 80.4, .8], ...VL.crossings.filter(c => c.over === 'river').map(c => [c.x, c.y, .75])]],   // (round 3: the weir walk's footbridge below the mill wheel)
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
  ...VH.newWater.map(w => basin(w.id, smoothLoop(w.boundary, 4).map(p => p.map(r2)), w.level, { name: w.name })),   // (the dip: a warm pool under the orchard bank; the dip's fish live here)
  basin('tarn', smoothLoop(TARN, 4), 18, { name: 'The source tarn' }),
  basin('spring', smoothLoop(SPRING, 5), 3, { name: 'Foxglove spring' }),
];
const riverNames = { gorge: ['The gorge', 18], river: ['Millwater river', 1], brook: ['The woodland brook', 3] };
const riverParts = {};
for (const [id, [line, hw, gaps]] of Object.entries(ribbons)) {
  riverParts[id] = splitAt(line, gaps);
  // (round 3, valley: the weir footbridge cuts the valley reach in two; the estuary keeps its id river-4, the frog pool's home, and the
  //  new reach between the weir and the stones is river-5)
  const ids = riverParts[id].map((p, i) => `${id}-${i + 1}`); if (id === 'river' && ids.length === 5) ids.splice(3, 2, 'river-5', 'river-4');
  // (round 3, woodland: extra dry gaps cut after the old ones, so the pieces that were there keep their ids)
  const more = extraGaps[id] || [], pieces = []; let extra = riverParts[id].length;
  riverParts[id].forEach((part, i) => { if (!more.length) { pieces.push([ids[i], part]); return; }
    const sub = splitAt(part, more); sub.forEach((q, k) => pieces.push([k ? `${id}-${++extra}` : ids[i], q])); });
  pieces.forEach(([pid, part]) => freshwater.push(basin(pid, ribbon(part, hw, .12), riverNames[id][1], { name: riverNames[id][0], river: id })));
}
// Basin levels follow the region they lie in.
const regionOf = (x, y) => Object.entries(REG).find(([, p]) => inLoop(x, y, p))?.[0] || '';
const regionMeta = Object.fromEntries(v4.regions.map(r => [r.id, r]));
for (const b of freshwater) if (b.river) { const c = [b.wet.x + b.wet.w / 2, b.wet.y + b.wet.h / 2], reg = regionMeta[regionOf(...c)]; b.level = reg ? reg.level : 1; }
// River fish homes (regions table): the mill race is the stretch past the mill.
const millStretch = freshwater.find(b => b.id === 'river-3') || freshwater.filter(b => b.river === 'river').sort((a, b) => b.wet.h * b.wet.w - a.wet.h * a.wet.w)[0];   // (the reach the wheel stands on, above the weir)

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
  // (the old woodland's ruin and postern walls (layout round 3, critic 2): a block as thick as the stones drawn on it and their
  //  shade, three quarters of a cell, in short pieces each drawn as one stretch of wall on its own foot (critic 3: the outline
  //  a third of a cell, the stones' own foot; the feet stop at short boxes along its middle line, _gwOldWallBoxes); a ribbon 1.6 cells wide stopped the feet a cell
  //  out on the grass and the beach beside a line of low stones. The postern wall ends on the grass above the beach, and
  //  starts against the ruin wall's end rather than on top of it.)
  ...wallSegments('ruin-wall', 'southwest-ruins', 'ruin-wall', [[32.6, 62], [27, 62.6], [20, 64.8], [14.6, 68.6], [11, 74], [12.4, 80], [12.8, 84.4]], [[19.6, 65.1, 2.2]], .32, 2),
  ...wallSegments('postern-wall', 'southwest-ruins', 'ruin-wall', [[32.8, 62.45], [35, 70], [36.4, 78], [37.3, 82.4]], [[35.8, 74.2, 1.8]], .32, 2),
  ...wallSegments('orchard-bank', 'orchard-headland', 'terrace-wall', [[60.2, 27.2], [61, 28.6], [60.8, 34], [61, 39.4]], [[61, 38.4, 1.8]], 1.6, 5),
  // Cloudbreak mountains (vale-mountains.json): the cove's cliffs and the falls rail, rock lines that stop the feet
  ...VM.walls.map(w => ({ id: w.id, region: 'north-headland', kind: w.kind, polygon: ribbon(w.line, w.halfWidth).map(p => [r2(p[0]), r2(p[1])]), col: 'full', reserved: true })),
  ...wallSegments('terrace-wall', 'orchard-headland', 'terrace-wall', [[63.2, 48.6], [68, 48.4], [78, 50.6], [90.8, 50]], [[80.2, 50.4, 2.0]], 1.6, 5),
  // the valley's screens (vale-valley.json): ground a tall roof hides, closed with what belongs there (the Ham's hedge, the wheel
  // pit, the rickyard's rails, the reed bed), so nobody walks out of sight behind the mill, the barn or the smokehouse
  ...VL.screens.map(s => Object.assign({ id: 'screen-' + s.id, region: VL.region, kind: 'screen', screen: s.id, name: s.reads, polygon: s.poly.map(p => p.map(r2)), col: 'full', reserved: true }, s.ricks ? { ricks: s.ricks } : {})),
];

/* ------------------------------------------------------------ routes: main road, lanes, trails, plazas */
const route = (id, tier, points, zone, extra = {}) => {
  const widthCells = extra.widthCells || (tier === 'main' ? 3 : tier === 'lane' ? 2 : tier === 'plaza' ? 4.4 : 1.4);
  const r = { id, tier, level: 1, widthCells, points: points.map(p => [r2(p[0]), r2(p[1])]), public: zone === 0, zone };
  Object.assign(r, extra); r.widthCells = widthCells; return r;
};
// The village (zone 0) is hand-authored in assets/garden/vale-village.json (2.74): splines with a width at each
// control point, resampled here into dense points (about 0.5 cells apart) and a width per point (route.widths;
// widthCells keeps the widest), plaza shapes, the 31 village sections grouped into fields, and the static moves.
const VV = JSON.parse(readFileSync(join(root, 'assets/garden/vale-village.json'), 'utf8'));
function splineW(ctrl, widths, closed, step = .5) { // Catmull-Rom through the control points; width interpolated by parameter
  const n = ctrl.length, g = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))], gw = i => closed ? widths[(i + n) % n] : widths[Math.max(0, Math.min(n - 1, i))], pts = [], ws = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let s = 0; s < k; s++) {
      const t = s / k, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([r2(f(p0[0], p1[0], p2[0], p3[0])), r2(f(p0[1], p1[1], p2[1], p3[1]))]); ws.push(r2(gw(i) * (1 - t) + gw(i + 1) * t));
    }
  }
  if (closed) { pts.push(pts[0].slice()); ws.push(ws[0]); } else { pts.push(ctrl[n - 1].map(r2)); ws.push(r2(widths[n - 1])); }
  return { pts, ws };
}
const vRoute = id => { const a = VV.routes.find(r => r.id === id); if (!a) throw Error('vale-village.json has no route ' + id); const { pts, ws } = splineW(a.control, a.widths, !!a.closed);
  return route(id, a.tier, pts, 0, Object.assign({ widthCells: Math.max(...ws), widths: ws }, a.gateId ? { gateId: a.gateId } : {}, id === 'plaza-loop' ? { shape: VV.plazas['the-square'].poly.map(p => p.map(r2)) } : {})); };
// The valley's routes (vale-valley.json). east-road belongs to the village file up to the Millwater bridge; its tail past the bridge is
// the valley's. orchard-stair's foot (from the fork to the stair) is the valley's; above the stair it keeps the orchard's points.
const lRoute = (id, zone, extra = {}) => { const a = VL.routes.find(r => r.id === id); if (!a) throw Error('vale-valley.json has no route ' + id); let ctrl = a.control, wd = a.widths;
  if (id === 'east-road') { const v = VV.routes.find(r => r.id === 'east-road'), k = v.control.findIndex(p => p[0] === a.control[0][0] && p[1] === a.control[0][1]); if (k < 0) throw Error('east-road: the bridge point is not in the village file'); ctrl = v.control.slice(0, k).concat(a.control); wd = v.widths.slice(0, k).concat(a.widths); }
  if (a.keepNorth) { ctrl = ctrl.concat(a.keepNorth); wd = wd.concat(a.keepNorth.map(() => wd[wd.length - 1])); }
  const { pts, ws } = splineW(ctrl, wd, false);
  return route(id, a.tier, pts, zone, Object.assign({ widthCells: Math.max(...ws), widths: ws }, a.gateId ? { gateId: a.gateId } : {}, a.surface ? { surface: a.surface } : {}, extra)); };
// The old woodland (zone 3) is hand-authored in assets/garden/vale-oldwood.json (layout round 3, 19 Nov 2026), read the
// same way: splines with a width at each control point, the court and the two yards as shapes, the static moves, the
// 17 sections in eight fields. Its ruins-lane takes over from the woods' part of the lane at 18.9,62.6.
const VO = JSON.parse(readFileSync(join(root, 'assets/garden/vale-oldwood.json'), 'utf8'));
const VO_SKIP = new Set(['maze-gap']);   // (the solved maze's way through: no hedge yet opens later, so the west ring stays shut; see the file's routes)
function oldwoodRoutes() {
  const out = [];
  for (const a of VO.routes) {
    if (VO_SKIP.has(a.id)) continue;
    // (merge, round 3: the yew lane's north end, from the Great Oak clearing's south rim down to 18.9,62.6, is the woodland's
    //  (vale-woodland.json); from there on it is the old woodland's. Without the woodland's file it falls back to ruinsLaneNorth.)
    const wl = VW.routes.find(r => r.id === 'ruins-lane'), wk = wl ? wl.control.findIndex(p => p[0] === a.control[0][0] && p[1] === a.control[0][1]) : -1;
    const north = wk > 0 ? wl.control.slice(0, wk) : VO.ruinsLaneNorth, northW = wk > 0 ? wl.widths.slice(0, wk) : VO.ruinsLaneNorth.map(() => 2);
    const plaza = VO.plazas[a.id], ctrl = a.id === 'ruins-lane' ? north.concat(a.control) : a.control, wid = a.id === 'ruins-lane' ? northW.concat(a.widths) : a.widths;
    if (plaza) { out.push(route(a.id, 'plaza', a.control, 3, { widthCells: 2, shape: plaza.poly.map(p => p.map(r2)) })); continue; }
    const { pts, ws } = splineW(ctrl, wid, false);
    out.push(route(a.id, a.tier === 'track' ? 'trail' : a.tier, pts, 3, Object.assign({ widthCells: Math.max(...ws), widths: ws }, a.gateId ? { gateId: a.gateId } : {}, a.tier === 'track' ? { worn: 'earth', unsigned: true } : {})));
  }
  // the two yards: the postern yard where the round and the pond walk meet, and the yew maze's yard
  // (the maze's spine is the turf in its mouth, between the outer ring's gap and the inner hedge: a spine across the whole
  //  yard ran under both rings of hedge)
  for (const [id, y] of Object.entries(VO.yards)) { const b = bbox(y.poly), cy = r2((b.y + b.y1) / 2); out.push(route(id, 'plaza', id === 'maze-yard' ? [[32.75, cy], [r2(b.x1), cy]] : [[r2(b.x + .4), cy], [r2(b.x1 - .4), cy]], 3, { widthCells: 1, shape: y.poly.map(p => p.map(r2)), yard: true })); }
  return out;
}
// the walled garden's old brick wall on three sides (the ruin wall behind it is the fourth), its two green doors gaps in it
// (layout round 3 fixes: laid in straight lengths, each one block and one drawing (94-garden-paint-vale-1oldwood.js), so
//  the feet stop exactly at the brick that is drawn; a smoothed line bent round its corners and stood a cell off its art)
{ const e = VO.enclosures['garden-yard'], hw = (e.thick || .4) / 2;
  for (const w of e.walls) {
    const [[x0, y0], [x1, y1]] = w.line, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * hw, ny = (x1 - x0) / L * hw;
    landforms.push({ id: w.id, region: 'southwest-ruins', kind: 'ruin-wall', brick: true, line: w.line.map(p => p.map(r2)), pier: w.pier || [], door: w.door || [], polygon: [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]].map(p => p.map(r2)), col: 'full', reserved: true });
  } }
const vPlaza = (id, width) => { const p = VV.plazas[id]; return route(id, 'plaza', p.spine, 0, { widthCells: width, shape: p.poly.map(q => q.map(r2)) }); };
const wRoute = id => { const a = VW.routes.find(r => r.id === id); if (!a) throw Error('vale-woodland.json has no route ' + id); const { pts, ws } = splineW(a.control, a.widths, false);
  return route(id, a.tier, pts, a.zone, Object.assign({ widthCells: Math.max(...ws), widths: ws }, a.gateId ? { gateId: a.gateId } : {}, a.track ? { track: true } : {})); };
// a shaped woodland plaza: its outline, and a spine through it for painters that want a line (the spine's width stays inside the outline)
const wPlaza = (id, p, width) => { const sp = p.spine || (() => { const b = bbox(p.poly), cy = (b.y + b.y1) / 2; return [[b.x + .8, cy], [b.x1 - .8, cy]]; })(); return route(id, 'plaza', sp, 1, { widthCells: width, shape: p.poly.map(q => q.map(r2)), surface: p.surface || 'earth' }); };   // (a clearing and a yard in the wood are trodden earth, not setts)
// the High orchard's routes (vale-orchard.json): the same splines; orchard-stair's foot, from the fork up to 80.2,50.4, is the
// valley's (vale-valley.json, without its keepNorth, which held the old orchard points), and the authored climb follows it
const oRoute = a => { let ctrl = a.control, wd = a.widths;
  if (a.id === 'orchard-stair') { const v = VL.routes.find(r => r.id === 'orchard-stair'), n = v.control.length, same = v.control[n - 1][0] === a.control[0][0] && v.control[n - 1][1] === a.control[0][1];
    ctrl = v.control.slice(0, same ? n - 1 : n).concat(a.control); wd = v.widths.slice(0, same ? n - 1 : n).concat(a.widths); }
  const { pts, ws } = splineW(ctrl, wd, false);
  return route(a.id, a.tier, pts, 4, Object.assign({ widthCells: Math.max(...ws), widths: ws }, a.gateId ? { gateId: a.gateId } : {}, a.surface ? { surface: a.surface } : {})); };
const oPlaza = id => { const p = VH.plazas[id]; return route(id, 'plaza', p.spine, 4, { widthCells: 3, shape: p.poly.map(q => q.map(r2)) }); };
const mRoute = a => { const { pts, ws } = splineW(a.control, a.widths, false); return route(a.id, a.tier, pts, 5, Object.assign({ widthCells: Math.max(...ws), widths: ws, surface: a.surface }, a.opens ? { opens: a.opens } : {})); };
const mPlaza = (id, p) => { const b = bbox(p.poly), cy = r2((b.y + b.y1) / 2), wide = b.x1 - b.x >= b.y1 - b.y;
  const spine = wide ? [[b.x + (b.x1 - b.x) * .3, cy], [b.x + (b.x1 - b.x) * .7, cy]] : [[(b.x + b.x1) / 2, b.y + (b.y1 - b.y) * .3], [(b.x + b.x1) / 2, b.y + (b.y1 - b.y) * .7]];
  return route(id, 'plaza', spine, 5, { widthCells: r2(Math.min(b.x1 - b.x, b.y1 - b.y) * .6), shape: p.poly.map(q => q.map(r2)), surface: p.surface, name: p.name }); };
const GREEN = { x: 49, y: 51.6, rx: 6.6, ry: 4.4 };   // (the green's rough extent, for painters that only want a centre and radii)
const routes = [
  // the arrival spine: quay, high street, the square and the green, the Lakeside terrace (harbour-walk[0] is the green end)
  vRoute('harbour-walk'), vRoute('plaza-loop'), vRoute('green-terrace'), vPlaza('lakeside-terrace', 1.6), vPlaza('the-quay', 2),
  // village lanes and walks
  vRoute('west-lane'), lRoute('east-road', 0, { gateId: 'island-mill' }), vRoute('cottage-lane'), vRoute('cottage-path'),
  vRoute('lake-walk-west'), vRoute('lake-walk-east'), vRoute('south-common'), vRoute('strand'), vRoute('lighthouse-walk'), vRoute('field-path'),
  // Whispering woodland (zone 1): hand-authored (vale-woodland.json): three loops and an oak, every path back to the Great Oak.
  // The clearing and the two yards are shaped plazas; ruins-lane (the yew lane, zone 3) leaves the clearing's south rim.
  ...VW.routes.filter(r => r.zone === 1).map(r => wRoute(r.id)), wPlaza('great-oak-clearing', VW.plazas['great-oak-clearing'], 3), wPlaza('woodpile-yard', VW.yards['woodpile-yard'], 1.4), wPlaza('arch-forecourt', VW.yards['arch-forecourt'], 1.4),
  // Old woodland (zone 3): hand-authored in assets/garden/vale-oldwood.json (layout round 3), read above (oldwoodRoutes); its
  // ruins-lane starts on the woodland's clearing rim (vale-woodland.json) and is the old woodland's from 18.9,62.6
  ...oldwoodRoutes(),
  // Millwater valley (zone 2): hand-authored (vale-valley.json, round 3): one lane from the bridge along the top of the valley, down
  // between the mill and the barn into the yard and on beside the river to the estuary; every other path loops back to it
  lRoute('mill-lane', 2), lRoute('estuary-lane', 2), lRoute('field-track', 2), lRoute('valley-meadow', 2), lRoute('marsh-boardwalk', 2),
  lRoute('coast-walk', 2), lRoute('riverside', 2), lRoute('water-meadow', 2), lRoute('race-path', 2), lRoute('weir-walk', 2),
  route('mill-yard', 'plaza', VL.yard.spine || VL.plazas['mill-yard'].spine, 2, { widthCells: .6, shape: VL.plazas['mill-yard'].poly.map(p => p.map(r2)) }),
  // High orchard (zone 4): hand-authored (vale-orchard.json); the stair's foot below 80.2,50.4 is the valley's (vale-valley.json)
  ...VH.routes.map(a => oRoute(a)),
  oPlaza('cider-square'),
  // Cloudbreak mountains (zone 5): hand-authored (vale-mountains.json): the Cloudbreak Way, lanes and trails with a width
  // at each control point, and the open tops as shapes (the summit, the col, Wick's yard, the Long View, the falls top, the moor's end)
  ...VM.routes.map(a => mRoute(a)),
  ...Object.entries(VM.plazas).map(([id, p]) => mPlaza(id, p)),
];

// The High orchard's four new terrace walls (vale-orchard.json): thin (half a cell), they stop the feet along their own
// line only, and open where a path climbs them (the painter lays steps in each opening). A piece shorter than a cell is left out.
for (const w of VH.newLandforms) {
  const L = smooth(w.line, 10), hw = (w.thickness || .5) / 2, near = routes.filter(r => r.zone === 4 && r.tier !== 'plaza');
  const open = p => near.some(r => { const P = r.points, Wd = r.widths; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))), wd = Wd ? Wd[i - 1] + (Wd[i] - Wd[i - 1]) * t : r.widthCells; if (Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t) <= wd / 2 + .3) return true; } return false; });
  const runs = []; let run = [];
  // (fix round 1: where a place is built into the wall, the bee boles and the rope wall, the place is the wall: the thin
  // wall stops either side of it, so no strip of stone shows behind it)
  const inWall = [...Object.values(VH.staticMoves), ...VH.newStatics].filter(q => q.inWall), built = p => inWall.some(q => p[0] > q.x - .1 && p[0] < q.x + q.w + .1 && p[1] > q.y - .6 && p[1] < q.y + q.h + .6);
  for (const p of L) { if (open(p) || built(p)) { if (run.length) runs.push(run); run = []; } else run.push(p); }
  if (run.length) runs.push(run);
  const len = q => q.reduce((n, p, i) => i ? n + Math.hypot(p[0] - q[i - 1][0], p[1] - q[i - 1][1]) : 0, 0);
  runs.filter(q => q.length >= 2 && len(q) >= 1).forEach((q, k) => landforms.push({ id: k ? `${w.id}-${'bcdef'[k - 1]}` : w.id, region: w.region, kind: w.kind, name: 'A terrace wall', polygon: ribbon(q, hw).map(p => [r2(p[0]), r2(p[1])]), col: 'full', reserved: true, thin: true }));
}

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
stat('pier', 49, 79, { w: 2, h: 8, door: { x: 50, y: 78 } });   // (village fix round 3: a long pier from the start, as in the plan, not a stubby square, and two cells wide, so it reads as a pier; it grows on from there)
stat('pier-2', 49, 87, { w: 2, h: 3, door: null });
stat('pier-3', 49, 90, { w: 2, h: 3, door: null });
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
stat('ld-tower', 28, 78, { door: { x: 29, y: 79 }, district: 'southwest-ruins' });   // (round 3 integration: a row south, off the pond walk's drawn width)
const sightRow = id => ({ id, w: 1, h: 1, col: 'full', walk: false, level: 1, needs: null, tall: 1 });
const SIGHTS = [
  // [id, x, y, w, district, door?, col?]
  ['ld-sign-c', 41, 54, 1, 'plaza-village', { x: 41, y: 55 }, 'none'], ['ld-cross', 54, 54, 1, 'plaza-village', { x: 54, y: 55 }, 'soft'],
  ['ld-lamp-a', 47, 44, 1, 'east-hall', { x: 47, y: 45 }, 'none'], ['ld-lamp-b', 50, 76, 1, 'harbour-bay', { x: 50, y: 77 }, 'none'],
  ['ld-sunk', 34, 47, 2, 'plaza-village', { x: 35, y: 48 }], ['ld-wish', 33, 58, 1, 'plaza-village', { x: 43, y: 58 }],
  ['ld-boathouse', 55, 77, 3, 'harbour-bay', null], ['ld-bridge', 37, 36, 1, 'pond-grove', null, 'none'],
  ['ld-hollow', 13, 43, 1, 'west-woods', { x: 13, y: 44 }], ['ld-house', 6, 28, 2, 'west-woods', { x: 6, y: 27 }], ['ld-pump', 11, 29, 1, 'west-woods', { x: 11, y: 30 }],
  ['ld-driftwood', 5, 82, 2, 'west-woods', { x: 6, y: 81 }],
  ['ld-chapel', 19, 72, 3, 'southwest-ruins', { x: 20, y: 73 }], ['ld-icehouse', 26, 84, 2, 'southwest-ruins', { x: 26, y: 85 }], ['ld-statue', 24, 73, 1, 'southwest-ruins', { x: 24, y: 74 }],
  ['ld-labyrinth', 30, 80, 3, 'southwest-ruins', { x: 31, y: 81 }],
  ['ld-hide', 82, 80, 2, 'east-mill', { x: 81, y: 80 }], ['ld-frog', 69, 77, 1, 'east-mill', { x: 68, y: 77 }], ['ld-boles', 85, 60, 1, 'east-mill', { x: 85, y: 61 }],
  ['ld-barn', 82, 66, 3, 'east-mill', { x: 83, y: 67 }], ['ld-churn', 78, 63, 1, 'east-mill', { x: 78, y: 64 }], ['ld-smoke', 84, 76, 3, 'east-mill', { x: 85, y: 77 }],
  ['ld-barrels', 76, 35, 1, 'orchard-headland', { x: 76, y: 36 }], ['ld-folly', 84, 28, 2, 'orchard-headland', { x: 84, y: 30 }], ['ld-ring', 70, 39, 4, 'orchard-headland', { x: 71, y: 40 }],
  ['ld-clamp', 68, 29, 1, 'orchard-headland', { x: 68, y: 30 }], ['ld-orchard-wall', 72, 44, 2, 'orchard-headland', { x: 72, y: 45 }], ['ld-treehouse', 86, 46, 2, 'orchard-headland', { x: 86, y: 47 }],
  ['ld-beacon', 52, 8, 1, 'north-headland', { x: 52, y: 9 }], ['ld-cairn', 48, 8, 1, 'north-headland', { x: 48, y: 9 }], ['ld-stones', 44, 9, 4, 'north-headland', { x: 45, y: 11 }],
  ['ld-hut', 59, 17, 1, 'north-headland', { x: 59, y: 18 }], ['ld-grotto', 65, 13, 2, 'north-headland', { x: 65, y: 14 }], ['ld-warren', 30, 4, 1, 'north-headland', { x: 30, y: 5 }],
  ['ld-mile', 2, 52, 1, 'west-woods', { x: 3, y: 52 }],
  // the folk's story places (docs/dev/STORIES.md, "Anchors the layout must provide"): Hollin's hut off the ruins circuit,
  // Thistle's old house at the top of the woods, the great stump where Tam digs (feat/find-gates' lantern)
  ['ld-woodhut', 13, 76, 2, 'southwest-ruins', { x: 14, y: 77 }], ['ld-oldhouse', 22, 26, 2, 'west-woods', { x: 23, y: 27 }], ['ld-stump', 21, 44, 1, 'west-woods', { x: 21, y: 45 }],
];
for (const [id, x, y, w, district, door, col] of SIGHTS) stat(id, x, y, Object.assign(sightRow(id), { w, district, door: door === undefined ? undefined : door, col: col || 'full' }));
for (const p of S) if (p.door === undefined) p.door = { x: p.x, y: p.y + 1 };
// the hand-authored village (vale-village.json): statics that move to face the square, and the new cottages
for (const [id, mv] of Object.entries(VV.staticMoves)) { const p = S.find(q => q.id === id); if (!p) { warn.push('static move: no static ' + id); continue; } Object.assign(p, mv); if (p.apron) p.apron = p.door && p.door.y < p.y ? { x: p.x - 1, y: p.y - 3, w: p.w + 2, h: 3 } : { x: p.x - 1, y: p.y + 1, w: p.w + 2, h: 3 }; }
for (const ns of VV.newStatics) S.push(Object.assign(sightRow(ns.id), ns));
// the hand-authored woodland (vale-woodland.json): the summer house up off the spring's rim, Thistle's old house and the summer
// house at cottage size (rule 14: three cells wide, as deep as they stand), the bench out from under the Great Oak, Wren's seat
// across the brook, the woodshed on its yard, a bench at four of the forks
for (const [id, mv] of Object.entries(VW.staticMoves)) { const p = S.find(q => q.id === id); if (!p) { warn.push('woodland move: no static ' + id); continue; } Object.assign(p, mv); }
for (const ns of VW.newStatics) S.push(Object.assign(sightRow(ns.id), ns));
// the hand-authored valley (vale-valley.json, round 3): the mill, the barn and the smokehouse on the footprints their size needs
// (rule 14: the mill's ridge about 5.5 figures, the barn's 4), the milk stand at the fork, the bee boles against the carr, the
// hide on its legs at the salt edge; and the valley's seats (a bench for two, each facing one view) and its lamps
for (const [id, mv] of Object.entries(VL.staticMoves)) { const p = S.find(q => q.id === id); if (!p) { warn.push('valley move: no static ' + id); continue; } Object.assign(p, mv); }
VL.seats.forEach((q, i) => { if (q.dropped) return; const [x, y] = q.cell || q.at.map(Math.floor); S.push(Object.assign(sightRow('ld-vseat-' + (i + 1)), { x, y, w: q.w || 2, h: 1, col: 'soft', block: [1.15, .3], district: VL.region, door: { x, y: y + 1 }, faces: q.faces })); });
VL.lamps.forEach((q, i) => S.push(Object.assign(sightRow('ld-vlamp-' + (i + 1)), { x: Math.floor(q[0]), y: Math.floor(q[1]), col: 'soft', block: [.26, .2], hit: [.06, 2.3], district: VL.region, door: { x: Math.floor(q[0]), y: Math.floor(q[1]) + 1 } })));
// the hand-authored old woodland (vale-oldwood.json): the chapel, the tower, the ice house, Hollin's hut and the maze's
// sundial move to the plan's places and grow to the footprints the size standard needs (rule 14)
for (const [id, mv] of Object.entries(VO.staticMoves)) {
  const p = S.find(q => q.id === id); if (!p) { warn.push('oldwood static move: no static ' + id); continue; }
  const { why, ...m } = mv; void why; Object.assign(p, m); if (!m.apron) delete p.apron; delete p.rearEnvelope;
}
// the hand-authored High orchard (vale-orchard.json): its sights moved onto the terraces, and its new places (Quince's
// cottage, the press, the bell, the cider board, the bee boles in the bee wall, the cliff pippin). Notes stay in the file.
const keepKeys = row => Object.fromEntries(Object.entries(row).filter(([k]) => ['x', 'y', 'w', 'h', 'door', 'col', 'walk', 'tall', 'district'].includes(k)));
for (const [id, mv] of Object.entries(VH.staticMoves)) { const p = S.find(q => q.id === id); if (!p) { warn.push('orchard static move: no static ' + id); continue; } Object.assign(p, keepKeys(mv)); if (mv.walk) { p.walk = true; p.col = 'none'; } }
for (const ns of VH.newStatics) S.push(Object.assign(sightRow(ns.id), keepKeys(ns), { id: ns.id }));
// Cloudbreak (vale-mountains.json): the hut, cairn, beacon, stones, grotto and warren at their new sizes and places, and
// three new ones (the bothy, the toposcope, the moor's end gate). The standing stones block only the four stones
// (presentation.mountains.stones), so their rectangle is open ground on the summit (col 'none').
for (const [id, mv] of Object.entries(VM.staticMoves)) { const p = S.find(q => q.id === id); if (!p) { warn.push('mountain static move: no static ' + id); continue; } Object.assign(p, mv); delete p.stones; delete p.apron; }
for (const ns of VM.newStatics) S.push(Object.assign(sightRow(ns.id), ns));
// how deep a building stands on the ground (fix round 1): a house blocks its whole footprint, front wall to back wall, not
// only the row along its front, so the feet stop where its walls stand and never step into the picture. The front row
// (and so the foot it is drawn from, its door and its depth order) stays where it was; the rows behind it are added.
for (const [id, d] of Object.entries(VV.depth || {})) {
  const p = S.find(q => q.id === id); if (!p) { warn.push('depth: no static ' + id); continue; }
  const foot = p.y + p.h; p.y = foot - d; p.h = d;
  if (p.apron) p.apron = p.door && p.door.y < p.y ? { x: p.x - 1, y: p.y - 3, w: p.w + 2, h: 3 } : { x: p.x - 1, y: foot, w: p.w + 2, h: p.w <= 2 ? 1 : 3 };   // (a stall or a bench needs only the row it is used from)
}
// the story places that are part of something already drawn: points only, no art and no footprint (read by 94-garden-wonder-1kin.js _wkAnchor and the gates' finds)
const storyAnchors = {
  'ld-ruined-arch': { x: 19.5, y: 67, of: 'island-ruins' }, 'ld-falls-cave': { x: 42.2, y: 26.4, of: 'fleet-falls' }, 'ld-lamp-room': { x: 61.5, y: 83.6, of: 'ld-lighthouse' },
  'ld-mill-office': VL.storyAnchors['ld-mill-office'] || { x: 76.5, y: 64.6, of: 'ld-mill' }, 'ld-hothouse': { x: 40.5, y: 65.6, of: 'lc-glasshouse' }, 'ld-terrace-bench': { x: 48.9, y: 43.6, of: 'lakeside-terrace' },
  'lc-the-green': { x: 49.7, y: 51.9, of: 'the-green' },   // (fix round 1: on the open lawn beside the sundial, not in front of it)
  'ld-hollin-yard': { x: 15.05, y: 78.5, of: 'ld-woodhut' },   // (layout round 3, critic 3: Hollin works in his yard between the door and the log store; he stood in his own doorway, over the wall and the door)
  'ld-quince': { x: 24.4, y: 71.5, of: 'ruins-pond' },   // (quince's brook: the old woodland pond past the ruined arch, out of sight of Hollin's hut)   // (the stories mean the village green, not the land section of that name)
};

/* ------------------------------------------------------------ side piers (lv 10 ruins shore, lv 14 orchard beach) */
const reservedSidePiers = [
  { id: 'reserved-west-pier', side: 'west', level: 10, reserved: { x: 6, y: 88, w: 7, h: 2 }, entry: { x: 13, y: 88 }, apron: { x: 12, y: 87, w: 3, h: 2 },   /* (layout fix, west: the apron kept to the sand; its top row stood on two lawn cells the shore paths' paint skips, a square notch in the path at the cove link's end) */ upgrades: v4.reservedSidePiers[0].upgrades.replace('old woodland shore', 'old woodland shore at Wren point') },
  { id: 'reserved-east-pier', side: 'east', level: 14, reserved: { x: 87, y: 42, w: 7, h: 2 }, entry: { x: 86, y: 42 }, apron: { x: 83, y: 41, w: 3, h: 4 }, upgrades: v4.reservedSidePiers[1].upgrades },
];

/* ------------------------------------------------------------ the cell raster (same rules as 94-garden-0island.js) */
const signedArea = l => { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const landLoop = smoothLoop(COAST, 4).map(p => p.map(r2)), land = [signedArea(landLoop) > 0 ? landLoop : landLoop.reverse()];   // the same winding as v4's coast
const landAt = (x, y) => inLoop(x, y, land[0]);
const coastD = (x, y) => { let d = Infinity; for (let i = 0; i < land[0].length; i++) { const a = land[0][i], b = land[0][(i + 1) % land[0].length], ax = a[0] * W.cellW, ay = a[1] * W.cellH, dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH, t = Math.max(0, Math.min(1, ((x * W.cellW - ax) * dx + (y * W.cellH - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(x * W.cellW - ax - dx * t, y * W.cellH - ay - dy * t)); } return d; };
const inRect = (x, y, r) => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
// On a route: inside its shape (a plaza), or within the local half width of its centreline (route.widths, per point).
const onRoute = (x, y, r) => { if (r.shape && inLoop(x, y, r.shape)) return true; const P = r.points, Wd = r.widths;
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))), w = Wd ? Wd[i - 1] + (Wd[i] - Wd[i - 1]) * t : r.widthCells; if (Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t) <= w / 2) return true; }
  return false; };
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
// (round 3) in the valley nothing stands on a path or on another thing (rule 12)
for (const p of S) { if (p.district !== VL.region) continue; for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) { const c = C(x, y); if (c && c.route && !/^ld-(vseat|vlamp)-2$/.test(p.id)) warn.push(`valley static ${p.id} cell ${x},${y} is on route ${c.route}`); const o = S.find(q => q !== p && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (o) warn.push(`valley static ${p.id} overlaps ${o.id} at ${x},${y}`); } }
// (round 3) no path is laid over a valley screen: the ground a roof hides is closed, and a road painted into it would end at an invisible stop
{ const hit = new Map(); for (const f of landforms.filter(q => q.kind === 'screen')) { const b = bbox(f.polygon); for (let y = b.y; y <= b.y1; y += .2) for (let x = b.x; x <= b.x1; x += .2) { if (!inLoop(x, y, f.polygon)) continue; for (const r of routes) if (onRoute(x, y, r)) { const k = r.id + ' onto ' + f.id; hit.set(k, (hit.get(k) || 0) + 1); } } }
  for (const [k, n] of hit) warn.push(`route ${k} (${(n * .04).toFixed(2)} square cells)`); }
// the valley's seats and lamps are used from the path beside them: the door is the neighbouring path cell (else the cell below)
for (const p of S) if (/^ld-v(seat|lamp)-/.test(p.id)) { let best = null; for (let x = p.x - 1; x <= p.x + p.w; x++) for (let y = p.y - 1; y <= p.y + p.h; y++) { if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) continue; if ((x < p.x || x >= p.x + p.w) && (y < p.y || y >= p.y + p.h)) continue; const c = C(x, y); if (!c || !c.route || c.st || c.fw || c.lf) continue; const d = Math.abs(y - p.y - (p.h - 1) / 2) + (y > p.y ? 0 : .3); if (!best || d < best.d) best = { x, y, d }; } if (best) p.door = { x: best.x, y: best.y }; else warn.push(`valley ${p.id} has no path beside it`); }

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
// the village's 31 sections are hand-authored, in fields (vale-village.json); each cell must be free village ground
for (const [id, a] of Object.entries(VV.sections)) {
  if (id === 'lc-front-bed' || id === 'lc-cottage-bed') { if (JSON.stringify(a.cells) !== JSON.stringify(sectionCells[id])) warn.push('starter bed ' + id + ' differs from the 7 x 2 bed'); continue; }
  const keep = [], why = (x, y) => { const c = C(x, y); return !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform' : c.reserved ? 'reserved (apron or facade)' : c.zone !== 0 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : ''; };
  for (const [x, y] of a.cells) { const w = why(x, y); if (w) warn.push(`village section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } }
  // a section short of its old size grows into free ground beside it, nearest its middle first
  // (fix round 1: the green's borders are laid as authored, round the green's rim, and not grown back to their old size
  // into the middle of the lawn: a green is lawn first, with borders round it)
  const need = a.asAuthored ? a.cells.length : Math.max(4, v4Cells[id].length), mx = a.cells.reduce((n, c) => n + c[0], 0) / a.cells.length, my = a.cells.reduce((n, c) => n + c[1], 0) / a.cells.length;
  while (keep.length && keep.length < need) { let best = null; for (const [x, y] of keep) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (why(nx, ny)) continue; const d = Math.hypot(nx - mx, ny - my); if (!best || d < best[2]) best = [nx, ny, d]; } if (!best) break; keep.push([best[0], best[1]]); taken.add(K(best[0], best[1])); }
  if (keep.length < need) warn.push(`village section ${id} has ${keep.length} cells, fewer than its ${need}`);
  sectionCells[id] = keep;
}
// the woodland's 20 sections are hand-authored too (vale-woodland.json): larger plots, each on free woodland ground beside a path
for (const [id, a] of Object.entries(VW.sections)) {
  const keep = [];
  for (const [x, y] of a.cells) { const c = C(x, y), w = !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform' : c.reserved ? 'reserved' : c.zone !== 1 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : '';
    if (w) warn.push(`woodland section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } }
  if (zoneOfSection[id] !== 1) warn.push('woodland section ' + id + ' is not a zone 1 section');
  sectionCells[id] = keep;
}
// the valley's 31 sections, hand-authored in 13 fields (vale-valley.json, round 3): laid as authored, each cell free valley ground
for (const [id, a] of Object.entries(VL.sections)) {
  const keep = [], why = (x, y) => { const c = C(x, y); return !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform ' + c.lf : c.reserved ? 'reserved (apron or facade)' : c.zone !== 2 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : ''; };
  for (const [x, y] of a.cells) { const w = why(x, y); if (w) warn.push(`valley section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } }
  if (keep.length < Math.max(4, v4Cells[id].length)) warn.push(`valley section ${id} has ${keep.length} cells, fewer than its old ${v4Cells[id].length}`);
  sectionCells[id] = keep;
}
// (round 3) the valley's trees (vale-valley.json trees: [x, y, species, height px]) stand on free ground: not on water, a path,
// a building, a screen, the beach, or a field (the alder carr's own trees excepted), and their trunks clear of each other
for (const t of VL.trees || []) { const [x, y] = t, c = C(Math.floor(x), Math.floor(y)), sec = Object.entries(sectionCells).find(([, cs]) => cs.some(q => q[0] === Math.floor(x) && q[1] === Math.floor(y)));
  const why = !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform ' + c.lf : sec && !(t[4] === 'in-field') ? 'section ' + sec[0] : '';
  if (why) warn.push(`valley tree at ${x},${y} is not on free ground (${why})`); }
if (process.env.VALLEY_MAP) { const secAt = new Map(); for (const [id, cs] of Object.entries(sectionCells)) for (const q of cs) secAt.set(K(q[0], q[1]), id); for (let y = 48; y < 88; y++) { let l = String(y).padStart(3) + ' '; for (let x = 56; x < 92; x++) { const c = C(x, y); l += !c || !c.land ? '~' : c.fw ? 'w' : c.beach ? ':' : c.route ? '=' : c.st ? '#' : c.lf ? 'X' : secAt.has(K(x, y)) ? 's' : c.zone !== 2 ? ',' : '.'; } console.log(l); } console.log('    ' + Array.from({ length: 36 }, (_, i) => (56 + i) % 10).join('')); }
// the old woodland's 17 sections are hand-authored, in eight fields (vale-oldwood.json); each cell must be free zone-3
// ground, except that the shore's rock plots (the spit and Otter cove) may lie on the beach (the plan's beach exception)
for (const [id, a] of Object.entries(VO.sections)) {
  const keep = [], why = (x, y) => { const c = C(x, y); return !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach && a.kind !== 'rock' ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform ' + c.lf : c.reserved ? 'reserved (apron or facade)' : c.zone !== 3 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : ''; };
  for (const [x, y] of a.cells) { const w = why(x, y); if (w) warn.push(`oldwood section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } }
  if (keep.length < 4) warn.push(`oldwood section ${id} has ${keep.length} cells`);
  sectionCells[id] = keep.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
}
// the High orchard's 20 sections are hand-authored too, in eight fields (vale-orchard.json), laid as drawn (161 cells, was 84)
for (const [id, a] of Object.entries(VH.sections)) {
  const keep = [], why = (x, y) => { const c = C(x, y); return !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform ' + c.lf : c.reserved ? 'reserved' : c.zone !== 4 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : ''; };
  for (const [x, y] of a.cells) { const w = why(x, y); if (w) warn.push(`orchard section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } }
  if (keep.length < 4) warn.push(`orchard section ${id} has only ${keep.length} cells`);
  sectionCells[id] = keep.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
}
// Cloudbreak's nine sections are hand-authored fields (vale-mountains.json): each cell must be free zone-5 ground
const mWhy = (x, y) => { const c = C(x, y); return !c || !c.land ? 'sea' : c.fw ? 'water' : c.beach ? 'beach' : c.route ? 'route ' + c.route : c.st ? 'static ' + c.st : c.lf ? 'landform' : c.reserved ? 'reserved' : c.zone !== 5 ? 'zone ' + c.zone : taken.has(K(x, y)) ? 'taken' : S.some(p => p.door && Math.floor(p.door.x) === x && Math.floor(p.door.y) === y) ? 'a door' : ''; };
for (const [id, f] of Object.entries(VM.fields)) { const keep = []; for (const [x, y] of f.cells) { const w = mWhy(x, y); if (w) warn.push(`mountain section ${id} cell ${x},${y} is not free (${w})`); else { keep.push([x, y]); taken.add(K(x, y)); } } sectionCells[id] = keep; }
const fieldOf = Object.fromEntries(Object.entries(VV.sections).map(([id, a]) => [id, a.field]));
// (round 3: a story place left empty on purpose, such as the quince by the old woodland pond, is never packed with a plot)
const anchorCells = new Set(Object.values(storyAnchors).map(a => K(Math.floor(a.x), Math.floor(a.y))));
const shapeOf = n => n >= 19 ? [5, 4] : n >= 14 ? [7, 2] : n >= 12 ? [4, 3] : n >= 9 ? [3, 3] : n >= 6 ? [3, 2] : [2, 2];
const free = (x, y, zone) => { const c = C(x, y); return !!c && c.land && !c.fw && !c.beach && !c.reserved && c.zone === zone && !taken.has(K(x, y)) && !anchorCells.has(K(x, y)) && x >= 1 && y >= 1 && x < W.cols - 1 && y < W.rows - 1; };
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
if (!sectionCells['lc-pond']) { const n = v4Cells['lc-pond'].length, bank = (x, y) => free(x, y, 0) && waterD(x + .5, y + .5, ['pond']) <= 2.4 && !taken.has(K(x - 1, y)) || false;
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

/* ------------------------------------------------------------ the village green's lawn and the fields (presentation) */
// The lawn is the inside edge of the flagged walk round the green (plaza-loop's ribbon, pulled in from its local half width).
const greenLawn = (() => { const r = routes.find(q => q.id === 'plaza-loop'), P = r.points.slice(0, -1), n = P.length, cx = P.reduce((a, p) => a + p[0], 0) / n, cy = P.reduce((a, p) => a + p[1], 0) / n, out = [];
  for (let i = 0; i < n; i += 2) { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if ((cx - P[i][0]) * nx + (cy - P[i][1]) * ny < 0) { nx = -nx; ny = -ny; } const h = r.widths[i] / 2; out.push([r2(P[i][0] + nx * h), r2(P[i][1] + ny * h)]); }
  return out; })();
// Each field: its sections, how its locked land reads, and its one gate: the field cell beside walkable public ground nearest the authored hint.
const ORCH_EDGE = { rows: 'long-grass', stair: 'long-grass', bank: 'meadow', walled: 'long-grass',   /* (fix round 2: the espalier garden's wall is the thyme wall's brick face, painted by the orchard painter; a brick edge round the field stood alone as a knee-high stub) */ pools: 'reeds', orchid: 'meadow', rise: 'meadow', thyme: 'heather' };
const EDGE = { wren: 'hedge', green: 'kerb', wood: 'bracken', mere: 'reeds', glass: 'wall', allot: 'long-grass', orchard: 'hedge-road', meadow: 'meadow', bridge: 'stile', light: 'drystone' };
const fieldRow = (FS, SS, zone) => ([id, f]) => {
  const secs = Object.keys(SS).filter(s => SS[s].field === id), mine = new Set(secs.flatMap(s => sectionCells[s].map(c => K(c[0], c[1])))), cand = [];
  for (const s of secs) for (const [x, y] of sectionCells[s]) for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const c = C(x + dx, y + dy); if (!c || mine.has(K(x + dx, y + dy)) || taken.has(K(x + dx, y + dy)) || !c.land || c.fw || c.st || c.lf || c.zone !== zone) continue; cand.push({ x, y, out: { x: x + dx, y: y + dy }, section: s, onRoute: !!c.route }); }
  const hint = f.gateHint || null, score = q => (q.onRoute ? 0 : 2) + (hint ? Math.hypot(q.x - hint[0], q.y - hint[1]) : 0);
  const gate = hint && cand.length ? cand.sort((a, b) => score(a) - score(b))[0] : null;
  if (hint && !gate) warn.push('field ' + id + ' has no gate');
  return { id, name: f.name, edge: f.edgeKind || f.edge || EDGE[id] || 'hedge', sections: secs, ...(f.edgeAll ? { edgeAll: true } : {}), gate: gate ? { x: gate.x, y: gate.y, out: gate.out, section: gate.section } : null };
};
// each region's hand-authored fields, read from its own file (vale-<region>.json), with its zone
const fields = [[VV, 0], [VW, 1], [VL, 2]].flatMap(([SRC, zone]) => Object.entries(SRC.fields || {}).map(fieldRow(SRC.fields, SRC.sections, zone)))
  // the High orchard's eight fields (vale-orchard.json lists each field's sections): locked land reads as rough grass, meadow,
  // sedge, the old wall or heather; never a fence ring
  .concat(Object.entries(VH.fields).map(([id, f]) => fieldRow(null, Object.fromEntries(f.sections.map(s => [s, { field: 'high-' + id }])), 4)(['high-' + id, { name: f.name, gateHint: f.gate, edge: ORCH_EDGE[id] }])));
// the old woodland's eight fields: the gate is the field cell beside a path nearest the field's middle, so each opens off the walk
for (const [id, f] of Object.entries(VO.fields)) {
  const secs = Object.keys(VO.sections).filter(s => VO.sections[s].field === id), mine = new Set(secs.flatMap(s => sectionCells[s].map(c => K(c[0], c[1])))), cand = [];
  const all = secs.flatMap(s => sectionCells[s]), mx = all.reduce((n, c) => n + c[0], 0) / (all.length || 1), my = all.reduce((n, c) => n + c[1], 0) / (all.length || 1);
  for (const s of secs) for (const [x, y] of sectionCells[s]) for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const c = C(x + dx, y + dy); if (!c || mine.has(K(x + dx, y + dy)) || taken.has(K(x + dx, y + dy)) || !c.land || c.fw || c.st || c.lf || c.zone !== 3 || !c.route) continue; cand.push({ x, y, out: { x: x + dx, y: y + dy }, section: s, d: Math.hypot(x + .5 - mx, y + .5 - my) + (dy ? 0 : .4) }); }
  const g = cand.sort((a, b) => a.d - b.d)[0];
  if (!g) warn.push('oldwood field ' + id + ' has no gate on a path');
  fields.push({ id: 'ow-' + id, name: f.name, edge: VO.fieldEdges[id] || 'bracken', sections: secs, gate: g ? { x: g.x, y: g.y, out: g.out, section: g.section } : null });
}
// Cloudbreak's fields: one section each, its gate the field cell beside a path nearest the authored hint
for (const [id, f] of Object.entries(VM.fields)) {
  const mine = new Set(sectionCells[id].map(c => K(c[0], c[1]))), cand = [];
  for (const [x, y] of sectionCells[id]) for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const c = C(x + dx, y + dy); if (!c || mine.has(K(x + dx, y + dy)) || taken.has(K(x + dx, y + dy)) || !c.land || c.fw || c.st || c.lf || c.zone !== 5) continue; cand.push({ x, y, out: { x: x + dx, y: y + dy }, onRoute: !!c.route }); }
  const sc = q => (q.onRoute ? 0 : 2) + Math.hypot(q.x + .5 - f.gateHint[0], q.y + .5 - f.gateHint[1]), g = cand.sort((a, b) => sc(a) - sc(b))[0];
  if (!g) warn.push('mountain field ' + id + ' has no gate'); else if (!g.onRoute) warn.push('mountain field ' + id + ' gate is not onto a path');
  fields.push({ id, name: f.name, edge: f.edge, kind: f.kind, zone: 5, sections: [id], gate: g ? { x: g.x, y: g.y, out: g.out, section: id } : null });
}
for (const [id, a] of Object.entries(storyAnchors)) { const x = Math.floor(a.x), y = Math.floor(a.y); if (Object.entries(sectionCells).some(([, cs]) => cs.some(c => c[0] === x && c[1] === y))) warn.push(`story anchor ${id} stands in a field (${x},${y})`); }

/* ------------------------------------------------------------ what the painter reads (presentation only, no collision) */
const presentation = {
  name: 'Fleetwater Vale',
  storyAnchors,
  mainland: { note: 'Past the west and north edges the land runs on as backdrop: hills and fells in haze. No cells, nothing to walk or save.', edges: ['west', 'north'] },
  rivers: Object.fromEntries(Object.entries(ribbons).map(([id, [line, hw]]) => [id, { name: riverNames[id][0], halfWidth: hw, line: smooth(line, 4).map(p => [r2(p[0]), r2(p[1])]) }])),
  falls: { id: 'fleet-falls', name: 'Fleet Falls', x: 44, y: 24.6, w: 3, h: 3, pool: [45.4, 28.4], caveStair: [42.2, 25.9], note: 'Drops off the scarp into the NW corner of the Mere; the cave stair runs behind it on the west side.' },
  crossings: [
    { id: 'falls-footbridge', kind: 'footbridge', over: 'brook', x: 36.3, y: 36.3, along: 'lake-walk-west' },   // (village fix round 1: where the lake walk crosses the brook; at 37.4 its landing lay a cell east of the deck's foot)
    { id: 'outlet-footbridge', kind: 'footbridge', over: 'river', x: 59.9, y: 41.1, along: 'lakeside-steps' },
    { id: 'millwater-bridge', kind: 'hump-bridge', over: 'river', x: 65, y: 55.1, along: 'east-road', gateId: 'island-mill' },
    { id: 'estuary-stones', kind: 'stepping-stones', over: 'river', x: 78.6, y: 80.4, along: 'coast-walk' },
    ...VL.crossings.map(c => Object.assign({ id: c.id, kind: c.kind, over: c.over, x: c.x, y: c.y, along: c.along }, c.shut ? { shut: c.shut, opensWith: c.opensWith } : {})),   // (round 3: the weir walk's planks below the mill wheel)
    { id: 'gorge-stones', kind: 'stepping-stones', style: 'clapper', over: 'gorge', x: 35.8, y: 16.9, along: 'gorge-trail' },   // (Cloudbreak plan: drawn as a clapper bridge, two flat slabs two figures wide)
    { id: 'lip-stones', kind: 'stepping-stones', over: 'gorge', x: 41.95, y: 22.3, along: 'lip-stones' },   // (new: across the gorge above the falls, the Edge walk's way to the falls top)
    { id: 'brook-stones-west', kind: 'stepping-stones', over: 'brook', x: 10.3, y: 33.7, along: 'woodland-loop' },
    { id: 'brook-stones-east', kind: 'stepping-stones', over: 'brook', x: 25.6, y: 36.8, along: 'woodland-loop' },
    ...VW.crossings.map(c => ({ id: c.id, kind: c.kind, over: c.over, x: c.x, y: c.y, along: c.along })),   // (round 3: Wren's log over the brook, from the seat to the north bank)
  ],
  plazas: [
    { id: 'the-green', route: 'plaza-loop', x: GREEN.x, y: GREEN.y, rx: GREEN.rx - 1.3, ry: GREEN.ry - 1.3, lawn: greenLawn, lime: VV.lime, square: VV.plazas['the-square'].poly.map(p => p.map(r2)), rose: { x: 48.8, y: 57.9 }, job: 'an English village green: a rounded triangle of striped lawn inside a flagged walk, the great lime and the sundial on it; the square at its foot, where the high street arrives, with the market, the craft bench, the post box and the cross facing onto it' },
    { id: 'the-quay', route: 'the-quay', x: 50.3, y: 77.6, shape: VV.plazas['the-quay'].poly.map(p => p.map(r2)), job: 'a harbour front bulging at the pier root and tapering into the strand and the lighthouse walk; pier, tackle shop, boathouse; travellers and friends land here' },
    { id: 'lakeside-terrace', route: 'lakeside-terrace', x: 48.6, y: 43.6, shape: VV.plazas['lakeside-terrace'].poly.map(p => p.map(r2)), job: 'a crescent along the Mere shore: lake hall facing the water, the bench with the falls view' },
    { id: 'great-oak-clearing', route: 'great-oak-clearing', x: r2(VW.plazas['great-oak-clearing'].oak[0] - 2.9), y: r2(VW.plazas['great-oak-clearing'].oak[1] + 1.5), oak: VW.plazas['great-oak-clearing'].oak, shape: VW.plazas['great-oak-clearing'].poly.map(p => p.map(r2)), job: 'the Great Oak (draw a huge oak crown here, seen from the Forest arch)' },
    // (round 3: the woods' two yards, trodden earth to their own outlines, from vale-woodland.json)
    ...Object.entries(VW.yards).map(([id, y]) => { const b = bbox(y.poly); return { id, route: id, x: r2((b.x + b.x1) / 2), y: r2((b.y + b.y1) / 2), shape: y.poly.map(p => p.map(r2)), job: y.label + ': trodden earth in the wood' }; }),
    { id: 'mill-yard', route: 'mill-yard', x: VL.yard.x, y: VL.yard.y, shape: VL.plazas['mill-yard'].poly.map(p => p.map(r2)), job: VL.yard.job },
    { id: 'ruin-court', route: 'ruin-court', x: 22.7, y: 75.9, shape: VO.plazas['ruin-court'].poly.map(p => p.map(r2)), job: VO.plazas['ruin-court'].job },
    ...Object.entries(VO.yards).map(([id, y]) => { const b = bbox(y.poly); return { id, route: id, x: r2((b.x + b.x1) / 2), y: r2((b.y + b.y1) / 2), shape: y.poly.map(p => p.map(r2)), job: y.job }; }),
    { id: 'cider-square', route: 'cider-square', x: 80.2, y: 37.4, shape: VH.plazas['cider-square'].poly.map(p => p.map(r2)), job: VH.presentation.plazas['cider-square'].job },
    ...Object.entries(VM.plazas).map(([id, p]) => { const b = bbox(p.poly); return { id, route: id, name: p.name, surface: p.surface, x: r2((b.x + b.x1) / 2), y: r2((b.y + b.y1) / 2), shape: p.poly.map(q => q.map(r2)),
      job: { 'summit-cairn': 'Cloudbreak top: a rock-and-turf summit reaching the standing stones; the cairn and the empty beacon on the skyline', 'cloudbreak-col': 'the col through the rock step above the pass, turf', 'wick-yard': 'Wick\'s yard: flags before the hut door, a bench and the telescope', 'long-view': 'the Long View: a rock ledge with a bench over the vale', 'falls-top': 'the falls top: wet rock beside the lip, the cave stair down behind the water', 'moor-end': 'the moor\'s end: peat, the last wall and the field gate, the fingerpost to the Long Road' }[id] || p.name }; }),
  ],
  woodland: { glades: VW.glades, yards: Object.keys(VW.yards), lamps: VW.lamps, ringedBirches: VW.ringedBirches, soupCamp: VW.soupCamp, wallGaps: VW.wallGaps, note: 'Whispering woodland (vale-woodland.json): glades are rooms of light (short grass, no tall trees); a lamp stands at each fork; the ringed birches mark the deer track to Wren’s seat; the soup camp is beside the Great Oak.' },
  screens: VL.screens.map(s => ({ id: s.id, landform: 'screen-' + s.id, reads: s.reads })),
  // (round 3: the water meadows' three carriers from their hatches, and the race path's fishing stage: painted ground, no collision)
  carriers: (VL.carriers || []).map(c => ({ id: c.id, pts: c.pts.map(p => p.map(r2)) })), stage: VL.stage || null, weir: VL.weir || null, valleyTrees: VL.trees || [],   // (round 3: what closes the ground behind the valley's roofs)
  fields,   // each region's sections grouped into fields: how locked land reads (edge) and the one way in (gate)
  gateKinds: Object.fromEntries(gates.map(g => [g.id, g.kind])),
  shortcuts: [
    { id: 'coast-walk', route: 'coast-walk', from: 'east-mill', to: 'home-island', level: 6, note: 'estuary stepping stones to the lighthouse and quay' },
    { id: 'postern', route: 'ruins-circuit', from: 'southwest-ruins', to: 'home-island', level: 10, at: [35.8, 74.2], note: 'a gap in the ruin wall onto the cottage lane' },
    { id: 'lakeside-steps', route: 'lakeside-steps', from: 'orchard-headland', to: 'home-island', level: 14, at: [61, 38.4], note: 'steps down the orchard bank to the outlet footbridge' },
    { id: 'cliff-steps', route: 'cliff-steps', from: 'orchard-headland', to: 'orchard-headland', level: 14, at: [86, 40.6], note: 'steps up the cliff from the cove to the pippin; the gate at their top is tied from the cliff side' },
    ...VM.shortcuts.filter(sc => sc.id !== 'C').map(sc => ({ id: sc.id === 'A' ? 'lip-stones' : 'wicks-steps', name: sc.name, route: sc.route, from: 'north-headland', to: 'north-headland', at: sc.at, note: sc.how })),
    { id: 'falls-cave-stair', route: 'gorge-trail', from: 'north-headland', to: 'home-island', level: 18, at: [42.2, 25.9], note: 'behind the falls, down to the lake walk' },
  ],
  // the High orchard's painted-only places (vale-orchard.json): the ring's eight perry pears and the Mother tree (painted trees,
  // their trunks solid through the orchard painter), seats, lamps, the midsummer line the folly trail is mown along, the
  // hurdle and the cliff gate, Quince's yard behind her cottage, the planting and the sight lines
  orchard: { ring: VH.trees.ring, mother: VH.trees.mother, seats: VH.paintOnly.seats, lamps: VH.paintOnly.lamps, midsummerLine: VH.paintOnly.midsummerLine, hurdle: VH.paintOnly.hurdle, cliffGate: VH.paintOnly.cliffGate, yard: VH.hiddenGround, planting: VH.paintOnly.planting, sightLines: VH.presentation.sightLines, pierApron: VH.reservedPier.apron },
  landmarks: { lighthouse: 'ld-lighthouse', watchtower: 'ld-tower', folly: 'ld-folly', greatOak: 'great-oak-clearing', beacon: 'ld-beacon', millWheel: 'ld-mill', falls: 'ld-falls' },
  // the old woodland's own things for its painters (vale-oldwood.json): lamps, finger posts, benches, the well head, the
  // carved birds and the bell rim (the two secrets), the garden's green doors, the maze, the Old Man and the sea steps
  oldwood: { treeless: VO.treeless || [], gardenWalls: VO.enclosures['garden-yard'].walls.map(w => w.id), lamps: VO.props.lamps.map(([x, y, what]) => ({ x, y, what })), fingerPosts: VO.props.fingerPosts, benches: VO.props.benches, wellHead: VO.props.wellHead, smallStone: VO.props.smallStone,
    carvedBirds: VO.props.carvedBirds, bellRim: VO.props.bellRim, gardenDoors: VO.enclosures['garden-yard'].doors, oldMan: VO.props.oldMan, seaSteps: VO.props.seaSteps,
    maze: { x: 31.2, y: 80.05, rx: 2.3, ry: 1.67, mouth: 'east', note: 'two low clipped yew rings and the sundial at the heart; the east mouth opens on the round, the west ring stays shut' },
    focalPoints: VO.focalPoints, secrets: VO.secrets, glades: VO.glades, planting: VO.planting, hollinsTrack: 'hollins-track' },
  mountains: { stones: VM.staticMoves['ld-stones'].stones, wayCairns: VM.wayCairns, seats: VM.seats, trees: VM.trees, sights: VM.sights, secrets: VM.secrets, midwinterLine: VM.midwinterLine },
  mist: 'Each closed region already gets mist from its polygon (94-garden-native-frontier.js).',
  millRace: millStretch.id,
};

/* ------------------------------------------------------------ nothing overlaps: no plot cell under a path's drawn width */
// (vale final) A plot cell that a path's painted ribbon covers by a good share was a plot under the path (the collision audit's
// overlap check: the orchard rows' trail along the bee bank and the cider nook, the lake walk over the deer corner). Such a cell
// is the path's, not the plot's. The ribbon is the route's own width at each point, as painted (half of it, a little in).
{
  const ribbons = routes.filter(r => Array.isArray(r.points) && r.points.length > 1 && r.tier !== 'plaza').map(r => ({ id: r.id, P: r.points, w: Array.isArray(r.widths) && r.widths.length === r.points.length ? r.widths : r.points.map(() => r.widthCells || 1.4) }));
  const under = (px, py) => { for (const rb of ribbons) for (let i = 1; i < rb.P.length; i++) { const [ax, ay] = rb.P[i - 1], [bx, by] = rb.P[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)), half = (rb.w[i - 1] * (1 - t) + rb.w[i] * t) * .44; if (Math.hypot(ax + dx * t - px, ay + dy * t - py) < half) return rb.id; } return ''; };
  for (const [id, cells] of Object.entries(sectionCells)) {
    if (id === 'lc-front-bed' || id === 'lc-cottage-bed' || cells.length < 3) continue;
    const keep = cells.filter(([x, y]) => { let n = 0; for (const fy of [.2, .5, .8]) for (const fx of [.2, .5, .8]) if (under(x + fx, y + fy)) n++; return n < 3; });
    if (keep.length < cells.length && keep.length >= 2) { warn.push(`plot ${id}: ${cells.length - keep.length} cell(s) under a path's width given to the path`); sectionCells[id] = keep; }
  }
}

/* ------------------------------------------------------------ write */
const out = {
  id: 'island-v5-fleetwater-vale', version: 5,
  mechanics: { revision: 5, predecessorLayout: '6e944bb9572a554637db8684', contract: 'fleetwater-vale-fresh-start-v2', village: 'hand-authored (assets/garden/vale-village.json)', regions: 'hand-authored, one file each (assets/garden/vale-woodland.json, vale-valley.json, vale-oldwood.json, vale-orchard.json, vale-mountains.json); every garden starts fresh (approved reset, 19 Nov 2026)' },
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
  allotmentPolicy: Object.assign({}, v4.allotmentPolicy, { assignedCells: Object.values(sectionCells).reduce((n, c) => n + c.length, 0), treePriority: 'Village sections are hand-authored fields that follow lanes, shore and slope (vale-village.json); the rest are coherent 2x2 or larger footprints, packed by kind near their paths. Starter beds stay 7x2 each.' }),
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

/* ------------------------------------------------------------ placed things (not part of the identity) */
// The ball, the log seats, the campfires, the telescope ... are rows of a KIND in assets/garden/vale-things.json or in a region
// file's own `things` (lib/garden-things.mjs). They are not written into island-v5.json, so placing one never starts a garden
// again. Each row: { id, kind, x, y } or { id, kind, on: '<a static id>', at: [dx, dy] }. Check them: node tools/affordance-audit.mjs
{
  const { loadGardenThings } = await import('../lib/garden-things.mjs');
  const T = loadGardenThings(root), ids = new Set(S.map(p => p.id));
  const lost = T.things.filter(t => t.on && !ids.has(t.on)).map(t => t.id + ' (on ' + t.on + ')');
  console.log('placed things', T.things.length, 'from', T.from.join(' '), lost.length ? 'ANCHOR MISSING: ' + lost.join(', ') : '');
}
