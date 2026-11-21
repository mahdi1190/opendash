// Folk audit (a dev tool, not a test suite; npcs-PLAN section 7): for any island layout json plus the placed things (assets/garden/
// vale-things.json and every vale-<region>.json, vale-folk.json among them), the vale's folk as the game's own rules
// (src/app/94-garden-folk-0rules.js, the same file the game runs) see them:
//   - each villager's home (by kind; a villager with no home that fits is travelling) and the old landmark ids that were only preferences
//   - each routine block and what the layout offers for it (an activity whose query nothing answers is listed)
//   - the day's plan, booked: two villagers on one thing at the same time is a fault
//   - a grep of the folk's code for landmark ids used as places (rule 17: only `prefer` lists may name one)
//
//   node tools/folk-audit.mjs                         this worktree's island-v5.json
//   node tools/folk-audit.mjs --island assets/garden/island-v4.json
//   node tools/folk-audit.mjs --tiny                  a made-up layout: one cottage, one bench, a pond (rule 17: no code change)
//   options: --day [YYYY-MM-DD] (replay the whole day at 60x: every leg, stalls over 3 s, long legs, overlaps)  --season s  --rain
//            --all-open (every region open; by default only the home island is, as in a new garden)  --json out.json  --quiet
// It draws a map of homes and the day's legs to C:/tmp/folk-audit/<layout>.svg. The things come from tools/affordance-audit.mjs (its
// kinds and placement rules), so a thing the game leaves out is left out here too. Walkability of each stand point is the affordance
// audit's cell model; the game's collision view (Shift+C) is the last word.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2), has = (k) => argv.includes(k), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const TINY = has('--tiny'), ISLAND = arg('--island', ''), QUIET = has('--quiet'), DAY = has('--day') ? arg('--day', '2026-11-21') : '', SEASON = arg('--season', 'autumn'), RAIN = has('--rain'), ALLOPEN = has('--all-open');
const ctxVm = { console, Math, Object, Array, Map, Set, Number, String, JSON, Infinity, NaN, isFinite, parseFloat, Date };
vm.createContext(ctxVm);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-zz-7act-0kinds.js'), 'utf8') + '\n;this.K=GARDEN_KINDS;this.spots=gardenKindSpots;this.kindOf=gardenKindOf;', ctxVm);
vm.runInContext(readFileSync(join(root, 'src/app/94-garden-folk-0rules.js'), 'utf8') + '\n;this.F=VALE_FOLK;this.R=VALE_ROUTINES;this.A=VALE_ACTIVITIES;this.solve=valeFolkSolveHomes;this.find=valeFolkFind;this.plan=valeFolkPlanAll;this.at=valeFolkAt;this.homeOf=valeFolkHomeOf;this.rng=valeRng;', ctxVm);
const report = { layout: '', homes: {}, blocks: {}, unanswered: [], faults: [], legs: [], plan: {}, grep: [] };
/* ---------- the things standing in the layout ---------- */
let things = [], layoutId = 'tiny', zones = null, cells = null;
if (TINY) {
  things = [
    { id: 'tiny-cottage', kind: 'building', x: 10, y: 10, w: 3, h: 2, door: { x: 10.5, y: 10.5 }, region: '' },
    { id: 'tiny-bench', kind: 'bench', x: 14, y: 12, w: 2, h: 1, region: '' },
  ];
  report.note = 'a made-up layout: one cottage, one bench and a pond; nothing else';
} else {
  const out = join(process.env.TEMP || '/tmp', 'folk-audit-aff.json');
  const a = ['tools/affordance-audit.mjs', '--json', out, '--quiet']; if (ISLAND) a.push('--island', ISLAND);
  try { execFileSync(process.execPath, a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { /* faults exit non-zero: the json is still written */ }
  const aff = JSON.parse(readFileSync(out, 'utf8'));
  const island = JSON.parse(readFileSync(ISLAND || join(root, 'assets/garden/island-v5.json'), 'utf8'));
  layoutId = island.id || basename(ISLAND || 'island-v5');
  const stat = new Map((island.static || []).map(r => [r.id, r]));
  const placed = new Map(); for (const f of readdirSync(join(root, 'assets/garden')).filter(f => /^vale-[a-z0-9-]+\.json$/.test(f))) { try { for (const r of JSON.parse(readFileSync(join(root, 'assets/garden', f), 'utf8')).things || []) placed.set(r.id, r); } catch (e) { /* skip */ } }
  const faulted = new Set(); for (const f of aff.faults || []) { const m = /^(\S+) \(/.exec(f); if (m && /leaves it out|left out/.test(f)) faulted.add(m[1]); }
  for (const t of aff.things || []) {
    if (!t.kind || t.kind === 'person' || faulted.has(t.id)) continue;
    const s = stat.get(t.id), p = placed.get(t.id), K = ctxVm.K[t.kind] || {};
    if (!s && !p) continue;   // (a longer pier's decks are built later, through lake works: not there in a new garden)
    things.push({ id: t.id, kind: t.kind, x: t.at[0], y: t.at[1], w: s ? s.w : (p && p.w) || K.w || 1, h: s ? s.h : (p && p.h) || K.h || 1, front: p && p.front, src: s ? 'layout' : 'thing', door: s && s.door ? { x: s.door.x + 0.5, y: s.door.y + 0.5 } : null, region: t.region || '' });
  }
  zones = new Map((island.regions || []).map(r => [r.id, r.zone || 0]));
}
report.layout = layoutId;
const homeIsland = (t) => ALLOPEN || TINY || !t.region || !zones || !zones.get(t.region);
/* ---------- the finder's view, as the game builds it (without the walking grid) ---------- */
const doorOf = (t) => t.kind === 'road' ? { x: t.x, y: t.y } : t.door || (t.src === 'thing' ? { x: t.x, y: t.y + 0.42 } : { x: t.x, y: t.y + 0.6 });
const ctx = {
  seed: layoutId, layout: layoutId, things,
  spots: (t) => ctxVm.spots({ kind: t.kind, x: t.x, y: t.y, w: t.w, front: t.front }),
  door: doorOf,
  ground: (type, x, y, r, rng) => ({ x: Math.round((x + (rng() - 0.5) * r) * 4) / 4, y: Math.round((y + rng() * r * 0.5) * 4) / 4 }),
  public: () => true, open: (t) => homeIsland(t), walkable: () => true,
  season: SEASON, rain: RAIN, snow: false,
};
/* ---------- homes ---------- */
const rows = ctxVm.F;
const homes = ctxVm.solve(rows, things, {}, Object.assign({}, ctx, { open: null }));
const homeThings = new Map(), away = new Set(), road = { id: 'road', kind: 'road', x: things[0] ? things[0].x : 0, y: things[0] ? things[0].y + 2 : 0 };
for (const r of rows) {
  const t = things.find(q => q.id === homes.get(r.id));
  report.homes[r.id] = t ? { home: t.id, kind: ctxVm.homeOf(t), at: [t.x, t.y], preferred: (r.prefer || []).includes(t.id), open: ctx.open(t) } : { home: null, travelling: true };
  // (as the game: someone whose home is in closed land comes out by day at the open ground nearest it; here the nearest open thing stands in for the walking grid)
  let gate = null; if (t && !ctx.open(t)) { let bd = Infinity; for (const q of things) if (ctx.open(q) && q !== t) { const d = Math.hypot(q.x - t.x, q.y - t.y); if (d < bd) { bd = d; gate = { id: 'gate:' + r.id, kind: 'road', x: q.x + 1, y: q.y + 1.2 }; } } }
  if (t && ctx.open(t)) homeThings.set(r.id, t); else { homeThings.set(r.id, gate || road); away.add(r.id); }
}
/* ---------- what each routine block can find ---------- */
for (const r of rows) {
  const R = ctxVm.R[r.routine] || {}, out = {};
  for (const [blk, choices] of Object.entries(R)) {
    out[blk] = choices.map(([id]) => { const A = ctxVm.A[id]; const sp = A ? ctxVm.find(A.q, Object.assign({}, ctx, { home: homeThings.get(r.id) }), { rng: ctxVm.rng('aud') }) : null; if (!sp) report.unanswered.push(`${r.id} ${blk}: ${id} (nothing on this layout answers it: the next choice is used)`); return id + (sp ? ' -> ' + sp.src : ' -> nothing'); });
  }
  report.blocks[r.id] = out;
}
/* ---------- the day ---------- */
const day = DAY || '2026-11-21';
const plans = ctxVm.plan(rows, Object.assign({}, ctx, { day, weekday: new Date(day + 'T12:00:00').getDay(), homes: homeThings, away }));
for (const [id, p] of plans) report.plan[id] = p.map(e => `${String(Math.floor(e.t0 / 60)).padStart(2, '0')}:${String(e.t0 % 60).padStart(2, '0')}-${String(Math.floor(e.t1 / 60)).padStart(2, '0')}:${String(e.t1 % 60).padStart(2, '0')} ${e.act}${e.inside ? ' (in)' : ''} @ ${e.spot ? e.spot.src : '-'}${e.walk ? ` walk ${e.walk}s` : ''}`);
// faults: two villagers on one thing at once (not doors), a villager with no plan, a leg longer than a whole activity
const uses = [];
for (const [id, p] of plans) {
  if (!p.length) report.faults.push(`${id}: no plan at all`);
  for (let i = 0; i < p.length; i++) {
    const e = p[i]; if (!e.spot) continue;
    if (!e.inside && !/^(door|porch):/.test(e.spot.key)) uses.push({ id, key: e.spot.key, t0: e.t0, t1: e.t1 });
    if (e.walk > (e.t1 - e.t0) * 60) report.faults.push(`${id}: the walk to ${e.act} at ${e.spot.src} (${e.walk} s) takes longer than the activity (${e.t1 - e.t0} min)`);
    if (i && e.walk) report.legs.push({ id, from: p[i - 1].spot && p[i - 1].spot.src, to: e.spot.src, s: e.walk });
  }
}
for (let i = 0; i < uses.length; i++) for (let j = i + 1; j < uses.length; j++) { const a = uses[i], b = uses[j]; if (a.id !== b.id && a.key === b.key && a.t0 < b.t1 && b.t0 < a.t1) report.faults.push(`overlap: ${a.id} and ${b.id} both on ${a.key} (${a.t0}-${a.t1} and ${b.t0}-${b.t1})`); }
/* ---------- --day: a replay at 60x (a minute a second): where each one is, stalls, long legs ---------- */
if (DAY) {
  const stalls = [];
  for (const [id, p] of plans) {
    let last = null, still = 0;
    for (let mnt = 0; mnt < 1440; mnt++) {
      const w = ctxVm.at(p, mnt); if (!w) continue;
      const pos = w.e.spot ? `${w.e.spot.x.toFixed(1)},${w.e.spot.y.toFixed(1)}` : '';
      if (w.walking && pos === last) { still++; if (still === 4) stalls.push(`${id} at ${mnt} min: walking but not moving`); } else still = 0;
      last = pos;
    }
  }
  report.stalls = stalls;
  report.longLegs = report.legs.filter(l => l.s > 120).map(l => `${l.id}: ${l.from} -> ${l.to} ${l.s} s`);
}
/* ---------- rule 17: landmark ids used as places in the folk's code ---------- */
const ids = new Set(TINY ? [] : things.filter(t => t.src === 'layout').map(t => t.id));
for (const f of ['src/app/94-garden-folk-0rules.js', 'src/app/94-garden-folk-3path.js', 'src/app/94-garden-wonder-0vale-folk.js']) {
  const lines = readFileSync(join(root, f), 'utf8').split('\n');
  lines.forEach((l, n) => { if (/prefer:|preferred|\/\/|^\s*\*/.test(l)) return; for (const id of ids) if (!ctxVm.K[id] && l.includes(`'${id}'`)) report.grep.push(`${f}:${n + 1} names '${id}'`); });
}
/* ---------- the map ---------- */
try {
  mkdirSync('C:/tmp/folk-audit', { recursive: true });
  const S = 8, Wd = 96 * S, H = 96 * S;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}"><rect width="100%" height="100%" fill="#eef0e4"/>`;
  for (const t of things) svg += `<rect x="${(t.x - t.w / 2) * S}" y="${(t.y - t.h) * S}" width="${t.w * S}" height="${t.h * S}" fill="${ctxVm.homeOf(t) ? '#c8a070' : '#a8b098'}" opacity=".7"/>`;
  const col = ['#c0392b', '#2471a3', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#7f8c8d', '#b7950b', '#1f618d'];
  let k = 0;
  for (const [id, p] of plans) { const c = col[k++ % col.length]; let d = ''; for (const e of p) if (e.spot) d += (d ? 'L' : 'M') + (e.spot.x * S).toFixed(0) + ' ' + (e.spot.y * S).toFixed(0); svg += `<path d="${d}" stroke="${c}" stroke-width="1.6" fill="none" opacity=".75"/>`; const h = homeThings.get(id); if (h) svg += `<circle cx="${h.x * S}" cy="${h.y * S}" r="5" fill="${c}"/><text x="${h.x * S + 7}" y="${h.y * S}" font-size="11" fill="${c}">${id}</text>`; }
  svg += '</svg>';
  writeFileSync(`C:/tmp/folk-audit/${layoutId}.svg`, svg);
  report.map = `C:/tmp/folk-audit/${layoutId}.svg`;
} catch (e) { report.map = 'not drawn: ' + e.message; }
/* ---------- the report ---------- */
if (arg('--json', '')) writeFileSync(arg('--json'), JSON.stringify(report, null, 2));
console.log(`FOLK AUDIT ${layoutId}${TINY ? ' (tiny)' : ''}  day ${day}, ${SEASON}${RAIN ? ', rain' : ''}${ALLOPEN ? ', every region open' : ', a new garden (only the home island open)'}`);
console.log('HOMES'); for (const [id, h] of Object.entries(report.homes)) console.log(`  ${id.padEnd(9)} ${h.home ? `${h.home} (${h.kind})${h.preferred ? '' : ' [not its old landmark]'}${h.open ? '' : ' [region not open: comes by day from the road]'}` : 'none: travelling'}`);
if (!QUIET) { console.log('THE DAY'); for (const [id, p] of Object.entries(report.plan)) { console.log('  ' + id); for (const l of p) console.log('    ' + l); } }
console.log(`UNANSWERED (${report.unanswered.length})`); for (const u of (QUIET ? report.unanswered.slice(0, 12) : report.unanswered)) console.log('  ' + u);
if (DAY) { console.log(`STALLS (${report.stalls.length})`); for (const s of report.stalls) console.log('  ' + s); console.log(`LEGS OVER 2 MIN (${report.longLegs.length})`); for (const s of report.longLegs) console.log('  ' + s); }
console.log(`LANDMARK IDS IN THE FOLK'S CODE (${report.grep.length})`); for (const g of report.grep) console.log('  ' + g);
console.log(`FAULTS (${report.faults.length})`); for (const f of report.faults) console.log('  ' + f); if (!report.faults.length) console.log('  none');
console.log('map: ' + report.map);
