// `scene upgrade <ref>`: scaffold the composed version of a hand-drawn region scene (docs/dev/SCENE_ENGINE.md section 16.3).
// Node >= 20, no dependencies. Pure helpers plus upgradeScaffold, which only computes the files (the command writes them).
//
//   suggestArchetype(item, index)                  -> [{ id, score, what }]   +2 per index hint in the item's tags, +1 per hint in its label
//                                                    and site words; best first (ties keep the index order)
//   regionKeyOf(region, item)                      -> 'place:singapore' | 'country:JP' ...   the region key of a full region item
//   placeOf(region, item)                          -> { lat, lon }   the row of a place; for a unit its first big row, else the mean of its rows
//   climateOf(lat, tags) / kitsFor(group, climate, table) / waterOf(tags, arch) / atOf(tags)   the params the scaffold fills in
//   extractLandmark(markup, box, { parse })         -> { shapes, size, count, dropped, box }   the shapes of the old art inside --box,
//                                                    re-anchored at (box centre x, box bottom), the sky and haze dropped (16.3 step 3)
//   paletteOf(shapes, n)                           -> ['#hex', ...]   the n most area-weighted fills
//   scenePaletteOf(allShapes)                      -> { base: { ground: [...], water: [...] } }   from the old art's lowest bands
//   shapeClusters(allShapes, n)                    -> [{ box, count }]   the n largest non-sky clusters (for choosing --box)
//   landmarkFileText(...) / upgradeFileText(...)    the two files (a native landmark object; the draft upgrade)
//   upgradeScaffold(reg, E, ref, opts)             -> { item, region, key, suggest, archetype, built, fallback, landmark, files: [{ file, text }], clusters, notes }
import { sceneShapesFromSvg } from './scene-svg.mjs';
import { regions } from './anim-region.mjs';

const r2 = (v) => Math.round(v * 100) / 100;
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/* ---------------------------------------------------------------------------------------------
   Which archetype
   --------------------------------------------------------------------------------------------- */
const wordsOf = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
export function suggestArchetype(item, index = []) {
  const tags = new Set((item.tags || []).map(t => String(t).toLowerCase()));
  const w = [...wordsOf(item.label), ...wordsOf(item.site)];
  const words = new Set([...w, ...w.slice(1).map((x, i) => w[i] + '-' + x)]);
  return index.map((a, i) => ({ id: a.id, what: a.what, i, score: (a.hints || []).reduce((n, h) => n + (tags.has(h) ? 2 : 0) + (words.has(h) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i).map(({ i, ...x }) => x);
}

/* ---------------------------------------------------------------------------------------------
   The item's place in its region
   --------------------------------------------------------------------------------------------- */
export function regionOf(reg, pack) { return regions(reg).find(r => r.owns(pack)) || null; }
export function regionKeyOf(region, item) {
  const F = region.fields;
  if (item[F.kind] === 'city' && item[F.place]) return 'place:' + item[F.place];
  if (item[F.unit]) return region.unitWord + ':' + item[F.unit];
  return item.key || null;
}
export function placeOf(region, item) {
  const F = region.fields, rows = region.places || [];
  if (item.liveSky && Number.isFinite(item.liveSky.lat)) return { lat: item.liveSky.lat, lon: item.liveSky.lon };
  if (item[F.kind] === 'city') { const row = rows.find(r => r[0] === item[F.place]); if (row) return { lat: row[3], lon: row[4] }; }
  const mine = rows.filter(r => r[2] === item[F.unit]);
  const big = mine.find(r => r[5] === 'big');
  if (big) return { lat: big[3], lon: big[4] };
  if (mine.length) return { lat: r2(mine.reduce((n, r) => n + r[3], 0) / mine.length), lon: r2(mine.reduce((n, r) => n + r[4], 0) / mine.length) };
  return null;
}
export function climateOf(lat, tags = []) {
  const t = new Set(tags);
  if (Number.isFinite(lat) && Math.abs(lat) < 23.5) return 'tropical';
  if (t.has('desert') || t.has('arid')) return 'arid';
  if (t.has('alpine') || t.has('mountain')) return 'alpine';
  if (t.has('snow') || t.has('arctic') || t.has('aurora')) return 'polar';
  return 'temperate';
}
export function kitsFor(group, climate, table) {
  const K = table || {};
  let base = null;
  for (const [k, v] of Object.entries(K)) {
    if (k === 'climate' || k === 'always') continue;
    if (k === group || (k.endsWith('*') && String(group || '').startsWith(k.slice(0, -1)))) { base = v; break; }
  }
  if (!base) base = (K.climate && (K.climate[climate] || K.climate.temperate)) || [climate];
  return [...new Set([...base, ...(K.always || [])])];
}
export function waterOf(tags = [], arch = null) {
  const t = new Set(tags);
  for (const [w, hints] of [['bay', ['bay', 'marina']], ['sea', ['sea', 'coast', 'beach', 'surf', 'harbour', 'harbor', 'port']], ['river', ['river', 'riverboat']], ['lake', ['lake']], ['pond', ['pond']], ['canal', ['canal']]]) if (hints.some(h => t.has(h))) return w;
  return (arch && arch.water) || 'none';
}
export function atOf(tags = []) {
  const t = new Set(tags);
  if (t.has('night') || t.has('aurora') || t.has('neon')) return 'night';
  if (t.has('dusk')) return 'dusk';
  if (t.has('sunset')) return 'sunset';
  if (t.has('sunrise') || t.has('dawn')) return 'dawn';
  if (t.has('golden')) return 'golden';
  return 'afternoon';
}

/* ---------------------------------------------------------------------------------------------
   The landmark
   --------------------------------------------------------------------------------------------- */
const allShapes = (parsed) => (parsed.order || Object.keys(parsed.parts)).flatMap(p => parsed.parts[p]);
const isSky = (s) => { const w = s.bb ? s.bb[2] - s.bb[0] : 0; return w > 1100 || ((s.op != null && s.op < 1) && w > 400); };
export function extractLandmark(markup, box, { parse = sceneShapesFromSvg } = {}) {
  const [x0, y0, x1, y1] = box, bw = x1 - x0;
  const shapes = allShapes(parse(markup, { flatten: true }));
  const kept = [], dropped = { outside: 0, wide: 0, sky: 0 };
  for (const s of shapes) {
    if (!s.bb) continue;
    const cx = (s.bb[0] + s.bb[2]) / 2, cy = (s.bb[1] + s.bb[3]) / 2, w = s.bb[2] - s.bb[0];
    if (isSky(s)) { dropped.sky++; continue; }
    if (cx < x0 || cx > x1 || cy < y0 || cy > y1) { dropped.outside++; continue; }
    if (w > bw * 0.9) { dropped.wide++; continue; }
    kept.push(s);
  }
  const ax = Math.round((x0 + x1) / 2), ay = Math.round(y1);
  let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
  const out = kept.map(s => {
    ux0 = Math.min(ux0, s.bb[0]); uy0 = Math.min(uy0, s.bb[1]); ux1 = Math.max(ux1, s.bb[2]); uy1 = Math.max(uy1, s.bb[3]);
    const m = s.m || [1, 0, 0, 1, 0, 0];
    const o = Object.assign({}, s);
    delete o.bb;
    o.m = [m[0], m[1], m[2], m[3], r2(m[4] - ax), r2(m[5] - ay)];
    if (o.m[0] === 1 && o.m[1] === 0 && o.m[2] === 0 && o.m[3] === 1 && o.m[4] === 0 && o.m[5] === 0) delete o.m;
    return o;
  });
  const size = kept.length ? [Math.max(4, Math.round(ux1 - ux0)), Math.max(4, Math.round(Math.min(uy1, ay) - uy0))] : [0, 0];
  return { shapes: out, size, count: out.length, dropped, box, anchor: [ax, ay], glow: out.filter(s => s.glow).length };
}
const hexRgb = (c) => { const s = String(c).replace('#', ''); const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const areaOf = (s) => (s.bb ? Math.max(1, (s.bb[2] - s.bb[0]) * (s.bb[3] - s.bb[1])) : 1);
export function paletteOf(shapes, n = 6) {
  const w = new Map();
  for (const s of shapes) { const f = typeof s.f === 'string' ? s.f : s.f && (s.f.lin || s.f.rad) ? (s.f.lin || s.f.rad)[0][1] : null; if (!f || s.glow) continue; w.set(f, (w.get(f) || 0) + areaOf(s) * (s.op == null ? 1 : s.op)); }
  return [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
}
export function scenePaletteOf(shapes) {
  const bands = shapes.filter(s => s.bb && s.bb[2] - s.bb[0] >= 1200 && s.bb[3] >= 700 && s.bb[1] >= 300).sort((a, b) => b.bb[1] - a.bb[1]);
  const ground = [], water = [];
  for (const s of bands) {
    const f = typeof s.f === 'string' ? s.f : s.f && (s.f.lin || s.f.rad) ? (s.f.lin || s.f.rad).map(x => x[1]) : null;
    for (const c of [].concat(f || [])) { const [r, g, b] = hexRgb(c); (b > r + 10 && b >= g - 10 ? water : ground).push(c); }
  }
  const uniq = (a) => [...new Set(a)].slice(0, 3);
  const base = {};
  if (ground.length) base.ground = uniq(ground);
  if (water.length) base.water = uniq(water);
  return { base };
}
export function shapeClusters(shapes, n = 5) {
  const list = shapes.filter(s => s.bb && !isSky(s) && s.bb[2] - s.bb[0] < 900);
  const parent = list.map((_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const near = (a, b) => a.bb[0] <= b.bb[2] + 4 && b.bb[0] <= a.bb[2] + 4 && a.bb[1] <= b.bb[3] + 4 && b.bb[1] <= a.bb[3] + 4;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (near(list[i], list[j])) parent[find(i)] = find(j);
  const groups = new Map();
  for (let i = 0; i < list.length; i++) { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(list[i]); }
  return [...groups.values()].map(g => {
    const box = [Math.min(...g.map(s => s.bb[0])), Math.min(...g.map(s => s.bb[1])), Math.max(...g.map(s => s.bb[2])), Math.max(...g.map(s => s.bb[3]))].map(Math.round);
    return { box, count: g.length, area: (box[2] - box[0]) * (box[3] - box[1]) };
  }).filter(c => c.box[2] - c.box[0] < 1200).sort((a, b) => b.count - a.count || b.area - a.area).slice(0, n);
}

/* ---------------------------------------------------------------------------------------------
   The files
   --------------------------------------------------------------------------------------------- */
const fmtShape = (s) => {
  const parts = [];
  if (s.f != null) parts.push(`f: ${JSON.stringify(s.f)}`);
  parts.push(`d: ${JSON.stringify(s.d)}`);
  for (const k of ['op', 's', 'w', 'cap', 'dash', 'm', 'glow']) if (s[k] != null) parts.push(`${k}: ${JSON.stringify(s[k])}`);
  return `{ ${parts.join(', ')} }`;
};
export function landmarkFileText({ id, regionId, key, ref, size, shapes, palette, box }) {
  const [w, h] = size;
  return `/* ============================================================
   SCENE LIBRARY: ${id} (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3)
   EXTRACTED by \`node tools/anim-pack.mjs scene upgrade ${ref} --box ${box.join(',')}\`
   from the hand-drawn art: ${shapes.length} shapes, re-anchored at the box's bottom centre.
   This is a STARTING POINT, not the finished object. REFINE it:
   - the real structure: look up its form and be factual (no invented
     towers, spires or tiers); keep the silhouette recognisable
   - window grids or tiers, mullions, floors; edge highlights and shaded
     sides consistent with ONE light direction (the sun on the left)
   - the night look: the 'lit' part (floodlights, crown and edge lighting,
     LED outlines) and glow on windows (glow: 'window') and lamps
   - snow on roofs in winter if the place has snow (then seasonal: true
     and palettes for all four seasons)
   - at least 80 shapes; no text, flags, emblems or brands
   Then: node tools/anim-pack.mjs object lint ${id}
         node tools/anim-pack.mjs object sheet ${id} --mode night
   ============================================================ */
(function () {
  sceneObjDefine({
    id: ${q(id)},
    category: 'landmark',
    size: [${w}, ${h}],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: { base: { main: ${JSON.stringify(palette)} } },   // the old art's most-used fills (paletteOf), for the refinement
    night: { glow: { window: '#ffd98a', lamp: '#ffe2a0' }, on: 0.75 },
    parts: ['body', 'lit'],
    shadow: { rx: ${Math.max(10, Math.round(w / 2))}, ry: ${Math.max(4, Math.round(w / 16))}, h: ${h} },
    reflect: true,
    tags: ['landmark', ${q(`place:${regionId}/${key}`)}, ${q(regionId)}],
    credit: ${q(`extracted from ${ref}`)},
    build() {
      return {
        body: [
${shapes.map(s => '          ' + fmtShape(s) + ',').join('\n')}
        ],
        lit: [],
      };
    },
  });
})();
`;
}
export function upgradeFileText({ ref, regionId, key, archetype, suggested, landmarks, params, notes = [] }) {
  const p = Object.entries(params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  return `/* ============================================================
   UPGRADE (draft) of ${ref} (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by \`node tools/anim-pack.mjs scene upgrade ${ref}\`.
   The app keeps showing the hand-drawn art while state is 'draft'; the
   tool shows this scene with --upgrades. Keep the item's identity: the id,
   key, place fields, label, site, tags and when come from the region entry.
${notes.map(n => '   ' + n).join('\n')}
   Next:
     node tools/anim-pack.mjs scene sheet ${ref} --compare --upgrades --times
     node tools/anim-pack.mjs scene lint ${ref} --upgrades --perf
   and set state: 'live' only when the lint prints GOLD and the compare
   sheet has been looked at in light and night. Care: no signs or text, at
   most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  animRegionSceneUpgrade(${q(regionId)}, ${q(key)}, {
    state: 'draft',
    archetype: ${q(archetype)},${suggested && suggested !== archetype ? `   // suggested: ${suggested} (not built yet; switch when it lands)` : ''}
    landmarks: ${JSON.stringify(landmarks)},
    scene: () => sceneFromArchetype(${q(archetype)},
      { ${p} },
      { place: [], scatter: [], actors: [] }),
  });
})();
`;
}

/* ---------------------------------------------------------------------------------------------
   The scaffold
   --------------------------------------------------------------------------------------------- */
export function upgradeScaffold(reg, E, ref, { archetype = null, box = null, landmark = null, slug = null, force = false } = {}) {
  const entry = reg.items().find(e => e.ref === ref);
  if (!entry) throw new Error(`unknown ref ${ref} (a ref is <pack>/<item id>, e.g. asia-southeast/singapore-skyline)`);
  const item = entry.item, region = regionOf(reg, entry.pack);
  if (!entry.full || item.composed || !region) throw new Error(`${ref} is not a full hand-drawn scene of a region: only region scenes upgrade through animRegionSceneUpgrade. UK, Texas and world items upgrade in their own pack files with the same item fields (docs/dev/SCENE_ENGINE.md 16.2, last bullet)`);
  const key = regionKeyOf(region, item);
  if (!key) throw new Error(`${ref}: cannot tell its region key`);
  const existing = typeof region.upgrades === 'function' ? (region.upgrades() || []).find(u => u.key === key) : (item.upgrade ? { key, state: item.upgrade.state } : null);
  if (existing && !force) throw new Error(`${ref} (${key}) already has a ${existing.state || 'draft'} upgrade: edit its file, or pass --force to scaffold it again`);
  const index = E.index || [];
  if (!index.length) throw new Error('the archetype index (SCENE_ARCHETYPE_INDEX, src/app/70-scene-arch-0list.js) is not loaded in this checkout');
  const suggest = suggestArchetype(item, index).slice(0, 3);
  const wanted = archetype || (suggest[0] && suggest[0].score > 0 ? suggest[0].id : 'basic');
  if (archetype && !index.some(a => a.id === archetype) && archetype !== 'basic') throw new Error(`unknown archetype ${archetype} (the index: ${index.map(a => a.id).join(', ')}, or basic)`);
  const built = typeof E.archetype === 'function' && !!E.archetype(wanted);
  const use = built ? wanted : 'basic';
  const place = placeOf(region, item) || { lat: null, lon: null };
  const tags = item.tags || [];
  const climate = climateOf(place.lat, tags);
  const archInfo = index.find(a => a.id === wanted) || null;
  const keyRef = key.split(':').slice(1).join(':').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const s = slug || keyRef;
  if (!/^[a-z0-9-]{1,40}$/.test(s)) throw new Error(`--slug must be lower case letters, digits and dashes, got "${s}"`);
  const markup = reg.html(item, { live: true, size: 'fill' });
  const parsed = sceneShapesFromSvg(markup, { flatten: true }), shapes = allShapes(parsed);
  const scenePalette = scenePaletteOf(shapes);
  const landmarkId = landmark || `landmark.${s}`;
  const files = [];
  let lm = null;
  const clusters = shapeClusters(shapes);
  if (landmark) {
    if (typeof E.obj === 'function' && !E.obj(landmark)) throw new Error(`--landmark ${landmark}: no such object (object list --category landmark)`);
  } else if (box) {
    lm = extractLandmark(markup, box);
    if (!lm.count) throw new Error(`--box ${box.join(',')} holds no shapes of the art (the largest clusters: ${clusters.map(c => c.box.join(',')).join('  ')})`);
    if (typeof E.obj === 'function' && E.obj(landmarkId) && !force) throw new Error(`${landmarkId} already exists: pass --slug <another> or --landmark ${landmarkId} to use it`);
    files.push({ file: `src/app/70-scene-lib-landmark-${s}.js`, text: landmarkFileText({ id: landmarkId, regionId: region.id, key, ref, size: lm.size, shapes: lm.shapes, palette: paletteOf(lm.shapes), box }) });
  }
  const params = { id: s, lat: place.lat, lon: place.lon, heading: 180, at: atOf(tags), climate, kits: kitsFor(entry.pack, climate, E.regionKits), landmarks: [landmarkId], water: waterOf(tags, archInfo), horizon: 520, density: 1 };
  if (Object.keys(scenePalette.base).length) params.palette = scenePalette;
  const notes = [];
  if (!built) notes.push(`The suggested archetype ${wanted} is not built yet: this draft uses basic. Switch when src/app/70-scene-arch-${wanted}.js lands.`);
  if (lm) notes.push(`Landmark ${landmarkId}: extracted from --box ${box.join(',')} (${lm.count} shapes, ${lm.glow} lit). Refine it before going live.`);
  if (box || landmark) files.push({ file: `src/app/71-scene-upgrade-${region.id}-${s}.js`, text: upgradeFileText({ ref, regionId: region.id, key, archetype: use, suggested: wanted, landmarks: [landmarkId], params, notes }) });
  return { entry, item, region, key, suggest, archetype: use, wanted, built, fallback: !built, landmark: lm, landmarkId, files, clusters, params, notes };
}
