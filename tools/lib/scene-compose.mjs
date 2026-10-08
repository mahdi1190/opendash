// The auto-composer (docs/dev/SCENE_ENGINE_V2.md 20.3; builder G). Node >= 20, no dependencies. DETERMINISTIC: no model, no clock,
// no randomness that is not seeded; the same brief, cache and date give the same draft.
//
//   parseBrief(text, { places })      -> { text, place, at, preset, weather, season, subject, unknown: [words], used: [words], tags }
//                                         keyword tables only (BRIEF_TABLES); unknown words are listed back to the author
//   gazetteer(reg)                     -> [{ name, lat, lon, src }]   the region places and the composed scenes' sites (offline)
//   locate(brief, { places, at, geocode }) -> { name, lat, lon, src } | null
//   layoutFromOsm(response, { lat, lon }) -> Layout: the Overpass JSON in local metres (east, north) about (lat, lon):
//        { lat, lon, buildings: [{ id, poly, h, levels, tags, name, kind }], water: [{ id, kind, poly | line, width }],
//          ways: [{ id, kind, line, width, cls, bridge, tags, name }], areas: [{ id, kind, poly }], features: [{ id, kind, e, n, h, r, name, tags, poly? }] }
//   findSubject(layout, brief)         -> the feature the brief names (or the most notable one near the centre), with its height and radius
//   searchViewpoints(layout, subject, presetId, { candidates, seed, siblings, eye, fov, terrain }) -> [{ e, n, heading, side, dist, score, parts, ... }]
//        a seeded ring of camera positions on walkable ground, headings that put the subject on a third, scored on visibility
//        (ray occlusion by footprints with heights, under 30 %), the preset's needs, the composition rules on a quick projection,
//        and uniqueness against the pack's siblings (their composition fingerprints, scene-composition.mjs)
//   projectLite(layout, view, { range, fov, eye, horizon }) -> recipe sections { surfaces, water, buildings, landmarks, missing }
//        (used only when builder E's tools/lib/osm-project.mjs is not there: E's projection is the real one, 17.3)
//   draftRecipe({ brief, layout, subject, view, sections, pack, id, styles, kits, objects }) -> the recipe (16.1) of the draft
//   compose(briefText, opts)           -> { recipe, report }   the whole pipeline (20.3 steps 1 to 4); writing and rendering are the
//                                         command's job (scene-cmd/compose.mjs): it writes only through scene-recipe.mjs (builder D)
// Everything that needs another builder is optional and guarded: E's osmFetch / osmProject / terrainSample, F's styles, the
// engine bundle (sceneCameraPreset, sceneKitPick, sceneObj). Missing pieces are named in report.notes.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cameraModule, compositionFingerprint } from './scene-composition.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAD = Math.PI / 180;
const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm360 = (h) => ((h % 360) + 360) % 360;

/** A seeded random (mulberry32) and a string hash. */
export function rndOf(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hashOf(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* =============================================================================================
   1. The brief (deterministic keyword tables)
   ============================================================================================= */
const PRESET_WORDS = {
  'across-water': ['across the river', 'across the lake', 'across the water', 'across the canal', 'across the pond', 'across the harbour', 'across the basin', 'across the bay', 'across the reservoir', 'across the dock', 'over the water', 'from the far bank', 'from the other bank', 'across the broad', 'across the mere'],
  'down-street': ['down the street', 'down the canal', 'along the canal', 'along the street', 'down the road', 'along the towpath', 'down the lane', 'along the river', 'down the river', 'up the street', 'up the lane', 'along the high street', 'down the high street', 'along the road'],
  'from-hill': ['from the hill', 'from a hill', 'from the edge', 'from the moor', 'from the down', 'from the downs', 'from the tor', 'over the town', 'over the city', 'over the valley', 'view over', 'from the ridge', 'from above the town', 'from the fell'],
  raised: ['from above', 'from the bridge', 'from a window', 'raised', 'overlooking', 'from the balcony', 'from the tower', 'from upstairs', 'from the viaduct'],
  'through-arch': ['through the arch', 'through the gate', 'through the trees', 'framed by', 'under the arch', 'through the archway', 'through the gateway', 'through the branches'],
  'close-up': ['close up', 'close-up', 'closeup', 'detail', 'at the door', 'up close', 'at the gate', 'at the entrance'],
  panorama: ['panorama', 'panoramic', 'wide view', 'skyline', 'the whole', 'wide angle', 'sweeping view'],
  street: ['street level', 'in the square', 'in the street', 'on the street', 'at street level', 'in the market', 'on the corner'],
};
const MOMENT_WORDS = [
  ['golden hour', 'golden'], ['golden', 'golden'], ['blue hour', 'dusk'], ['sunset', 'sunset'], ['sundown', 'sunset'], ['sunrise', 'dawn'], ['first light', 'dawn'],
  ['daybreak', 'dawn'], ['dawn', 'dawn'], ['early morning', 'morning'], ['morning', 'morning'], ['midday', 'noon'], ['noon', 'noon'], ['lunchtime', 'noon'],
  ['afternoon', 'afternoon'], ['twilight', 'dusk'], ['dusk', 'dusk'], ['evening', 'dusk'], ['midnight', 'night'], ['at night', 'night'], ['night', 'night'],
  ['nighttime', 'night'], ['by day', 'day'], ['daytime', 'day'],
];
const WEATHER_WORDS = [
  ['in the rain', 'rain'], ['rainy', 'rain'], ['raining', 'rain'], ['rain', 'rain'], ['wet', 'rain'], ['drizzle', 'drizzle'], ['drizzly', 'drizzle'], ['showers', 'showers'],
  ['thunderstorm', 'thunder'], ['thunder', 'thunder'], ['storm', 'thunder'], ['stormy', 'thunder'], ['in the snow', 'snow'], ['snowy', 'snow'], ['snowing', 'snow'], ['snow', 'snow'],
  ['sleet', 'sleet'], ['foggy', 'fog'], ['fog', 'fog'], ['misty', 'mist'], ['mist', 'mist'], ['frosty', 'frost'], ['frost', 'frost'], ['hoarfrost', 'frost'],
  ['clear sky', 'clear'], ['clear', 'clear'], ['sunny', 'clear'], ['sunshine', 'clear'], ['blue sky', 'clear'], ['overcast', 'cloudy'], ['cloudy', 'cloudy'], ['grey day', 'cloudy'],
];
const SEASON_WORDS = [['spring', 'spring'], ['springtime', 'spring'], ['summer', 'summer'], ['summertime', 'summer'], ['autumn', 'autumn'], ['fall', 'autumn'], ['autumnal', 'autumn'], ['winter', 'winter'], ['wintry', 'winter'], ['christmas', 'winter']];
/** Subjects: brief words -> the OSM tags that find them, a default height (m) and the F style a stand-in building would take. */
export const SUBJECTS = Object.freeze({
  cathedral: { tags: [['building', 'cathedral']], h: 60, style: null, words: ['cathedral', 'minster'] },
  church: { tags: [['amenity', 'place_of_worship'], ['building', 'church'], ['building', 'chapel']], h: 30, style: null, words: ['church', 'chapel', 'abbey', 'priory', 'kirk'] },
  mosque: { tags: [['building', 'mosque'], ['religion', 'muslim']], h: 25, style: null, words: ['mosque'] },
  mill: { tags: [['historic', 'mill'], ['man_made', 'works'], ['building', 'industrial'], ['building', 'warehouse'], ['craft', 'mill']], h: 18, style: 'mill', words: ['mill', 'warehouse', 'works', 'factory', 'forge'] },
  station: { tags: [['railway', 'station'], ['building', 'train_station'], ['public_transport', 'station']], h: 12, style: 'station', words: ['station', 'railway station'] },
  bridge: { tags: [['bridge', 'yes'], ['man_made', 'bridge'], ['bridge', 'viaduct']], h: 10, style: null, words: ['bridge', 'viaduct', 'footbridge', 'aqueduct'] },
  castle: { tags: [['historic', 'castle'], ['building', 'castle']], h: 25, style: null, words: ['castle', 'keep', 'fort', 'fortress'] },
  tower: { tags: [['man_made', 'tower'], ['building', 'tower'], ['tower:type', 'clock']], h: 40, style: null, words: ['tower', 'clock tower', 'spire'] },
  hall: { tags: [['amenity', 'townhall'], ['building', 'civic'], ['amenity', 'courthouse']], h: 25, style: null, words: ['town hall', 'city hall', 'guildhall', 'council house', 'hall', 'corn exchange'] },
  museum: { tags: [['tourism', 'museum'], ['tourism', 'gallery'], ['amenity', 'arts_centre']], h: 18, style: null, words: ['museum', 'gallery'] },
  library: { tags: [['amenity', 'library']], h: 18, style: null, words: ['library'] },
  theatre: { tags: [['amenity', 'theatre'], ['amenity', 'cinema']], h: 18, style: null, words: ['theatre', 'theater', 'crucible', 'opera house', 'cinema'] },
  market: { tags: [['amenity', 'marketplace'], ['building', 'market']], h: 8, style: 'interwar-shops', words: ['market', 'market place', 'marketplace', 'market square'] },
  pub: { tags: [['amenity', 'pub']], h: 9, style: 'victorian-terrace', words: ['pub', 'inn', 'tavern'] },
  lock: { tags: [['waterway', 'lock_gate'], ['lock', 'yes']], h: 2, style: null, words: ['lock', 'locks', 'lock gates'] },
  quay: { tags: [['man_made', 'quay'], ['waterway', 'dock'], ['landuse', 'harbour'], ['leisure', 'marina']], h: 3, style: null, words: ['quay', 'wharf', 'basin', 'harbour', 'marina', 'dock', 'docks'] },
  pier: { tags: [['man_made', 'pier']], h: 6, style: null, words: ['pier', 'jetty'] },
  lighthouse: { tags: [['man_made', 'lighthouse']], h: 25, style: null, words: ['lighthouse'] },
  windmill: { tags: [['man_made', 'windmill'], ['man_made', 'watermill']], h: 15, style: null, words: ['windmill', 'windpump', 'watermill', 'water wheel', 'wheel'] },
  monument: { tags: [['historic', 'monument'], ['historic', 'memorial'], ['tourism', 'artwork'], ['historic', 'statue']], h: 8, style: null, words: ['statue', 'monument', 'memorial', 'cenotaph', 'sculpture', 'obelisk'] },
  fountain: { tags: [['amenity', 'fountain']], h: 4, style: null, words: ['fountain'] },
  gate: { tags: [['historic', 'city_gate'], ['barrier', 'gate'], ['historic', 'gate']], h: 8, style: null, words: ['gate', 'arch', 'archway', 'gatehouse'] },
  stadium: { tags: [['leisure', 'stadium'], ['building', 'stadium']], h: 30, style: null, words: ['stadium', 'ground', 'arena'] },
  university: { tags: [['amenity', 'university'], ['building', 'university']], h: 25, style: null, words: ['university', 'college'] },
  tree: { tags: [['natural', 'tree']], h: 20, style: null, words: ['oak', 'tree', 'yew', 'great tree'] },
});
const STOP = new Set(['the', 'a', 'an', 'at', 'in', 'on', 'of', 'from', 'and', 'with', 'by', 'to', 'for', 'its', 'over', 'under', 'into', 'across', 'down', 'along', 'through', 'up', 'near', 'view', 'scene', 'looking', 'toward', 'towards', 'seen', 'beside', 'behind', 'past', 'i', 'it', 'is', 'some', 'old', 'new']);
export const BRIEF_TABLES = Object.freeze({ PRESET_WORDS, MOMENT_WORDS, WEATHER_WORDS, SEASON_WORDS, SUBJECTS, STOP: [...STOP] });

const tokenise = (s) => String(s).toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
/** Find a phrase in the (spaced) text; mark its words used. Returns true when found. */
function take(state, phrase) {
  const re = new RegExp(`(^| )${phrase.replace(/[-]/g, '\\-')}( |$)`);
  const m = re.exec(state.text);
  if (!m) return false;
  const start = m.index + m[1].length;
  state.text = state.text.slice(0, start) + phrase.replace(/[^ ]/g, '_') + state.text.slice(start + phrase.length);
  state.used.push(phrase);
  return true;
}
const normName = (s) => tokenise(s).replace(/\b(the|st|saint)\b/g, '').replace(/\s+/g, ' ').trim();
/**
 * Parse a one-line brief. places: a gazetteer [{ name, lat, lon }] used to recognise the place words (longest match wins).
 * The place is otherwise the first comma-separated segment's words that no table took.
 */
export function parseBrief(text, { places = [] } = {}) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('scene compose needs a brief, e.g. "Kelham Island, golden hour, across the river"');
  const segs = raw.split(',').map(s => tokenise(s)).filter(Boolean);
  const state = { text: ' ' + segs.join(' , ') + ' ', used: [] };
  state.text = state.text.trim();
  const out = { text: raw, place: null, at: null, preset: null, weather: null, season: null, subject: null, unknown: [], used: [], tags: [] };
  // presets (the longest phrase first), moments, weather, seasons
  const presetPhrases = Object.entries(PRESET_WORDS).flatMap(([id, ws]) => ws.map(w => [w, id])).sort((a, b) => b[0].length - a[0].length);
  for (const [w, id] of presetPhrases) if (take(state, w)) { if (!out.preset) out.preset = id; }
  for (const [w, m] of [...MOMENT_WORDS].sort((a, b) => b[0].length - a[0].length)) if (take(state, w)) { if (!out.at) out.at = m; }
  for (const [w, k] of [...WEATHER_WORDS].sort((a, b) => b[0].length - a[0].length)) if (take(state, w)) { if (!out.weather) out.weather = k; }
  for (const [w, s] of SEASON_WORDS) if (take(state, w)) { if (!out.season) out.season = s; }
  // the place: a gazetteer name (longest first), before the subject words (so "Winchester Cathedral" as a place keeps its word)
  const byLen = places.filter(p => p && p.name).map(p => [normName(p.name), p]).filter(([n]) => n.length >= 3).sort((a, b) => b[0].length - a[0].length);
  for (const [n, p] of byLen) {
    if (take(state, n)) { out.place = { name: p.name, lat: p.lat, lon: p.lon, src: p.src || 'gazetteer' }; break; }
  }
  // the subject
  const subjPhrases = Object.entries(SUBJECTS).flatMap(([id, s]) => s.words.map(w => [w, id])).sort((a, b) => b[0].length - a[0].length);
  for (const [w, id] of subjPhrases) {
    if (take(state, w)) { if (!out.subject) out.subject = { kind: id, word: w }; }
  }
  // a place not in the gazetteer: the leftover words of the first segment
  const left = state.text.split(' , ');
  if (!out.place) {
    const words = (left[0] || '').split(' ').filter(w => w && !/^_+$/.test(w) && !STOP.has(w));
    if (words.length) { out.place = { name: words.join(' '), lat: null, lon: null, src: 'brief' }; for (const w of words) state.used.push(w); left[0] = ''; }
  }
  // unknown words: everything left that is not a stop word, a used word or a place word
  const placeWords = new Set(out.place ? tokenise(out.place.name).split(' ') : []);
  for (const seg of left) for (const w of seg.split(' ')) if (w && !/^_+$/.test(w) && w !== ',' && !STOP.has(w) && !placeWords.has(w)) out.unknown.push(w);
  out.used = state.used;
  out.tags = [...new Set([out.subject && out.subject.kind, out.preset === 'across-water' ? 'water' : null, out.preset === 'down-street' ? 'street' : null,
    out.at, out.weather && out.weather !== 'clear' ? out.weather : null, out.season].filter(Boolean))];
  return out;
}

/* =============================================================================================
   2. Locating
   ============================================================================================= */
/** The offline gazetteer: region places ([id, name, unit, lat, lon, kind] rows) and the composed scenes' labels and sites. */
export function gazetteer(reg) {
  const out = [], seen = new Set();
  const add = (name, lat, lon, src) => {
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const k = normName(name);
    if (!k || seen.has(k)) return;
    seen.add(k); out.push({ name, lat, lon, src });
  };
  try {
    for (const r of (reg && reg.R && reg.R.ANIM_REGIONS) || []) for (const p of r.places || []) add(p[1], p[3], p[4], 'region:' + r.id);
  } catch { /* no regions */ }
  try {
    for (const e of reg.items()) {
      const it = e.item;
      if (!it || !it.composed) continue;
      let data = null;
      try { data = typeof it.scene === 'function' ? it.scene() : it.scene; } catch { data = null; }
      const v = data && data.view;
      if (!v || !Number.isFinite(v.lat)) continue;
      add(String(it.label || '').replace(/\s*\(.*\)\s*$/, ''), v.lat, v.lon, 'scene:' + e.ref);
    }
  } catch { /* no registry */ }
  return out;
}
/** Where the brief is: --at wins, then the gazetteer match, then an injected geocoder (E's Nominatim helper, cached). */
export async function locate(brief, { at = null, geocode = null } = {}) {
  if (Array.isArray(at) && Number.isFinite(at[0]) && Number.isFinite(at[1])) return { name: brief.place ? brief.place.name : 'the given point', lat: at[0], lon: at[1], src: '--at' };
  if (brief.place && Number.isFinite(brief.place.lat)) return brief.place;
  if (brief.place && typeof geocode === 'function') {
    const g = await geocode(brief.place.name);
    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { name: brief.place.name, lat: g.lat, lon: g.lon, src: 'geocode' };
  }
  return null;
}

/* =============================================================================================
   3. The layout: Overpass JSON in local metres
   ============================================================================================= */
/** Local metres about (lat0, lon0), the equirectangular form of V2 17.3. */
export function enu(lat0, lon0) {
  const kx = Math.cos(lat0 * RAD) * 111320, ky = 110540;
  return { to: (lat, lon) => [(lon - lon0) * kx, (lat - lat0) * ky], from: (e, n) => [lat0 + n / ky, lon0 + e / kx] };
}
const ROAD_W = { motorway: 11, trunk: 10, primary: 9, secondary: 7.5, tertiary: 7, unclassified: 6, residential: 6, service: 4, living_street: 5 };
const ROAD_DENSITY = { motorway: 1.2, trunk: 1.2, primary: 1.2, secondary: 1, tertiary: 0.8, unclassified: 0.5, residential: 0.4, service: 0.2, living_street: 0.4 };
const PATH_KIND = { footway: ['path', 2], path: ['path', 2], bridleway: ['path', 2.5], cycleway: ['cycleway', 1.5], pedestrian: ['plaza', 3], steps: ['steps', 2.5], track: ['track', 3] };
const WATER_W = { canal: 10, river: 25, stream: 3, drain: 2, ditch: 1.5 };
const AREA_KIND = [
  [['leisure', 'park'], 'park'], [['leisure', 'garden'], 'garden'], [['leisure', 'common'], 'grass'], [['leisure', 'recreation_ground'], 'grass'], [['landuse', 'grass'], 'grass'],
  [['landuse', 'village_green'], 'grass'], [['landuse', 'farmland'], 'field'], [['landuse', 'meadow'], 'meadow'], [['natural', 'heath'], 'heath'], [['natural', 'scrub'], 'heath'],
  [['natural', 'wood'], 'wood'], [['landuse', 'forest'], 'wood'], [['natural', 'beach'], 'beach'], [['natural', 'sand'], 'sand'], [['amenity', 'parking'], 'parking'],
  [['place', 'square'], 'plaza'], [['highway', 'pedestrian'], 'plaza'], [['area:highway', 'pedestrian'], 'plaza'], [['landuse', 'railway'], 'rail'],
];
const LANDMARK_KEYS = [['amenity', 'place_of_worship'], ['railway', 'station'], ['historic', null], ['tourism', 'attraction'], ['tourism', 'museum'], ['tourism', 'gallery'], ['tourism', 'artwork'],
  ['man_made', 'tower'], ['man_made', 'windmill'], ['man_made', 'watermill'], ['man_made', 'lighthouse'], ['man_made', 'bridge'], ['man_made', 'works'], ['amenity', 'fountain'], ['amenity', 'clock'],
  ['amenity', 'townhall'], ['amenity', 'theatre'], ['amenity', 'library'], ['amenity', 'marketplace'], ['amenity', 'pub'], ['leisure', 'stadium'], ['building', 'cathedral'], ['building', 'church'],
  ['building', 'train_station'], ['building', 'castle'], ['natural', 'tree']];
const tagIs = (t, k, v) => t && t[k] != null && (v == null || t[k] === v || (k === 'bridge' && v === 'yes' && t[k] !== 'no'));
const polyArea = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a) / 2; };
const centroid = (P) => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
function heightOf(tags, kind) {
  const num = (v) => { const m = /^\s*([0-9.]+)/.exec(String(v || '')); return m ? parseFloat(m[1]) : NaN; };
  const h = num(tags.height);
  if (Number.isFinite(h) && h > 0) return h;
  const lv = num(tags['building:levels']);
  if (Number.isFinite(lv) && lv > 0) return lv * 3 + (tags['roof:shape'] === 'flat' ? 0 : 2);
  const subj = Object.values(SUBJECTS).find(s => s.tags.some(([k, v]) => tagIs(tags, k, v)));
  if (subj && tags.building) return subj.h;
  return { cathedral: 60, church: 25, chapel: 12, industrial: 15, warehouse: 15, commercial: 15, retail: 8, apartments: 15, house: 8, terrace: 9, semidetached_house: 8, detached: 8, garage: 3, shed: 3, train_station: 12, civic: 18, university: 18, school: 10, office: 18 }[kind] || 9;
}
const wayLine = (el, P) => (el.geometry || []).filter(g => g && Number.isFinite(g.lat)).map(g => P.to(g.lat, g.lon));
const closed = (L) => L.length > 3 && Math.hypot(L[0][0] - L[L.length - 1][0], L[0][1] - L[L.length - 1][1]) < 0.5;
/** Overpass JSON (elements with `out geom`) -> the layout in local metres about (lat, lon). */
export function layoutFromOsm(response, { lat, lon }) {
  const P = enu(lat, lon);
  const L = { lat, lon, buildings: [], water: [], ways: [], areas: [], features: [] };
  const els = (response && response.elements) || [];
  for (const el of els) {
    const t = el.tags || {};
    const id = `${el.type[0]}${el.id}`;
    // the outer rings of multipolygon relations count as closed ways
    const rings = el.type === 'way' ? [wayLine(el, P)] : el.type === 'relation' ? (el.members || []).filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry.map(g => P.to(g.lat, g.lon))) : [];
    const node = el.type === 'node' ? P.to(el.lat, el.lon) : null;
    const name = t.name || null;
    let isLandmark = false;
    for (const [k, v] of LANDMARK_KEYS) if (tagIs(t, k, v)) { isLandmark = true; break; }
    if (t.building || t['building:part']) {
      for (const ring of rings) if (closed(ring)) {
        const poly = ring.slice(0, -1);
        const kind = t.building && t.building !== 'yes' ? t.building : (t.amenity || t.historic || 'yes');
        const b = { id, poly, h: heightOf(t, kind), levels: Number(t['building:levels']) || null, tags: t, name, kind, area: polyArea(poly) };
        L.buildings.push(b);
        if (isLandmark || name && (t.historic || t.amenity || t.tourism)) L.features.push({ id, kind: featureKind(t), e: centroid(poly)[0], n: centroid(poly)[1], h: b.h, r: Math.sqrt(b.area / Math.PI), name, tags: t, poly });
      }
      continue;
    }
    if (t.waterway && el.type === 'way' && WATER_W[t.waterway] != null) {
      const w = Number(t.width) || WATER_W[t.waterway];
      L.water.push({ id, kind: t.waterway === 'drain' || t.waterway === 'ditch' ? 'stream' : t.waterway, line: rings[0], width: w, name });
      continue;
    }
    if ((t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.waterway === 'dock')) {
      const kind = { river: 'river', canal: 'canal', lake: 'lake', pond: 'pond', reservoir: 'lake', basin: 'basin', lock: 'canal', oxbow: 'lake' }[t.water] || (t.waterway === 'dock' ? 'harbour' : t.landuse === 'reservoir' ? 'lake' : 'lake');
      for (const ring of rings) if (closed(ring)) L.water.push({ id, kind, poly: ring.slice(0, -1), name });
      continue;
    }
    const hwArea = el.type === 'way' && closed(rings[0] || []) && (t.area === 'yes' || t.highway === 'pedestrian');
    if (t.highway && el.type === 'way' && !hwArea) {
      const line = rings[0];
      if (!line || line.length < 2) continue;
      if (ROAD_W[t.highway] != null) {
        const lanes = Number(t.lanes);
        L.ways.push({ id, kind: 'road', cls: t.highway, line, width: Number(t.width) || (lanes ? lanes * 3.2 : ROAD_W[t.highway]), bridge: tagIs(t, 'bridge', 'yes'), name, tags: t, sidewalk: t.sidewalk || null });
      } else if (PATH_KIND[t.highway]) {
        const [kind, w] = PATH_KIND[t.highway];
        L.ways.push({ id, kind, cls: t.highway, line, width: Number(t.width) || w, bridge: tagIs(t, 'bridge', 'yes'), name, tags: t });
      }
      if (isLandmark && t.bridge && t.bridge !== 'no') L.features.push({ id, kind: 'bridge', e: centroid(line)[0], n: centroid(line)[1], h: 8, r: Math.max(5, lineLen(line) / 2), name, tags: t, line });
      continue;
    }
    if (t.railway && el.type === 'way' && ['rail', 'light_rail', 'narrow_gauge', 'tram'].includes(t.railway)) {
      L.ways.push({ id, kind: t.railway === 'tram' ? 'tramway' : 'rail', cls: t.railway, line: rings[0], width: t.railway === 'tram' ? 3 : 3.5, bridge: tagIs(t, 'bridge', 'yes'), name, tags: t });
      continue;
    }
    if (t.railway === 'platform' || t.public_transport === 'platform') {
      for (const ring of rings) if (ring.length > 1) { if (closed(ring)) L.areas.push({ id, kind: 'platform', poly: ring.slice(0, -1) }); else L.ways.push({ id, kind: 'platform', cls: 'platform', line: ring, width: 4, tags: t }); }
      continue;
    }
    const ak = AREA_KIND.find(([[k, v]]) => tagIs(t, k, v));
    if (ak && rings.length) {
      for (const ring of rings) if (closed(ring)) L.areas.push({ id, kind: ak[1], poly: ring.slice(0, -1), name, tags: t });
      if (!isLandmark) continue;
    }
    if (node && isLandmark) {
      const kind = featureKind(t);
      L.features.push({ id, kind, e: node[0], n: node[1], h: heightOf(t, kind) || (SUBJECTS[kind] && SUBJECTS[kind].h) || 8, r: kind === 'tree' ? 5 : 4, name, tags: t });
    }
  }
  // stable order (the response order is not guaranteed between servers)
  for (const k of ['buildings', 'water', 'ways', 'areas', 'features']) L[k].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return L;
}
function featureKind(t) {
  for (const [id, s] of Object.entries(SUBJECTS)) if (s.tags.some(([k, v]) => tagIs(t, k, v))) return id;
  return t.historic ? 'monument' : t.tourism || t.amenity || 'landmark';
}
const lineLen = (L) => { let s = 0; for (let i = 1; i < L.length; i++) s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); return s; };

/* =============================================================================================
   4. The subject
   ============================================================================================= */
/** The feature the brief names: its kind's tags (the nearest to the centre wins among equals; a named one beats an unnamed one). */
export function findSubject(layout, brief) {
  const fs = layout.features || [];
  const want = brief && brief.subject ? SUBJECTS[brief.subject.kind] : null;
  const dist = (f) => Math.hypot(f.e, f.n);
  const notable = (f) => (f.name ? 2 : 0) + (f.tags && (f.tags.historic || f.tags.tourism) ? 1 : 0) + Math.min(2, (f.h || 0) / 20) + Math.min(1, (f.r || 0) / 20);
  let pool = want ? fs.filter(f => want.tags.some(([k, v]) => tagIs(f.tags, k, v))) : fs.filter(f => f.kind !== 'tree');
  // a word that names it ("the mill"): prefer features whose name has the word
  if (want && brief.subject.word) { const named = pool.filter(f => f.name && tokenise(f.name).includes(brief.subject.word)); if (named.length) pool = named; }
  if (!pool.length) return null;
  pool = pool.slice().sort((a, b) => (notable(b) - notable(a)) || (dist(a) - dist(b)) || (a.id < b.id ? -1 : 1));
  const f = pool[0];
  return Object.assign({}, f, { h: f.h || (want ? want.h : 10), r: f.r || 6, want: brief && brief.subject ? brief.subject.kind : f.kind });
}

/* =============================================================================================
   5. The viewpoint search
   ============================================================================================= */
/** Does segment p->q cross polygon P (or start inside it)? Returns the distance along p->q of the first crossing, else -1. */
function segPoly(p, q, P) {
  let best = Infinity;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1], bx = P[i][0], by = P[i][1];
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((ax - p[0]) * ey - (ay - p[1]) * ex) / den, u = ((ax - p[0]) * dy - (ay - p[1]) * dx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best === Infinity ? -1 : best * Math.hypot(dx, dy);
}
export function pointIn(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
function distToLine(L, x, y) {
  let best = Infinity, dir = null;
  for (let i = 1; i < L.length; i++) {
    const [ax, ay] = L[i - 1], [bx, by] = L[i], ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1;
    const t = clamp(((x - ax) * ex + (y - ay) * ey) / l2, 0, 1), d = Math.hypot(ax + ex * t - x, ay + ey * t - y);
    if (d < best) { best = d; dir = [ex, ey]; }
  }
  return { d: best, dir };
}
const bearingOf = (dx, dy) => norm360(Math.atan2(dx, dy) / RAD);   // compass bearing of an (east, north) vector
/** The camera of a preset (from 70-scene-1camera.js through the engine bundle, or the file). */
function presetOf(id, opts = {}) {
  const m = opts.cameraModule || cameraModule(opts.root || ROOT);
  return m.SCENE_CAMERA_PRESETS[id] || m.SCENE_CAMERA_PRESETS.street;
}
/** Where a camera at (e, n) facing `heading` sees the ground point (pe, pn): [x right, d forward]. */
const toCam = (e, n, heading, pe, pn) => { const s = Math.sin(heading * RAD), c = Math.cos(heading * RAD), de = pe - e, dn = pn - n; return [de * c - dn * s, de * s + dn * c]; };

/** What a camera sees of the subject: the occluded share (footprints with heights; trees at 0.75), sampled over 9 columns x 6 rows. */
export function occlusion(layout, subject, cam) {
  const eye = cam.eye, cols = 9, rows = 6;
  const sx = subject.e, sy = subject.n, D = Math.hypot(sx - cam.e, sy - cam.n);
  if (D < 1) return { share: 1, by: [] };
  const ux = (sx - cam.e) / D, uy = (sy - cam.n) / D, px = -uy, py = ux;   // across the view
  let hidden = 0, n = 0;
  const by = new Map();
  // only the things near the sight corridor can hide the subject
  const corridor = [[cam.e, cam.n], [sx, sy]];
  const near = boundsOf(layout).filter(T => T.id !== subject.id && distToLine(corridor, T.c[0], T.c[1]).d <= T.R + subject.r + 2);
  const blockers = near.filter(T => T.poly && !(subject.poly && pointIn(subject.poly, T.c[0], T.c[1]))).map(T => ({ id: T.id, poly: T.poly, h: T.h }));
  const trees = near.filter(T => T.tree).map(T => ({ id: T.id, e: T.c[0], n: T.c[1], r: T.R, h: T.h }));
  for (let c = 0; c < cols; c++) {
    const off = ((c + 0.5) / cols - 0.5) * 2 * subject.r * 0.8;
    const tx = sx + px * off, ty = sy + py * off;
    const Dt = Math.hypot(tx - cam.e, ty - cam.n);
    for (let r = 0; r < rows; r++) {
      const hs = subject.h * (r + 0.5) / rows;   // the height of the sample on the subject
      // the sight line from the eye to (tx, ty, hs): a blocker at distance t of height hb hides it when hb > eye + (hs - eye) * t / Dt
      let w = 0, who = null;
      for (const b of blockers) {
        const t = segPoly([cam.e, cam.n], [tx, ty], b.poly);
        if (t < 0 || t > Dt - Math.max(2, subject.r * 0.3)) continue;
        if (b.h > eye + (hs - eye) * t / Dt) { w = 1; who = b.id; break; }
      }
      if (!w) for (const f of trees) {
        const v = distToLine([[cam.e, cam.n], [tx, ty]], f.e, f.n);
        if (v.d > (f.r || 4)) continue;
        const t = Math.hypot(f.e - cam.e, f.n - cam.n);
        if (t > Dt - 2) continue;
        if ((f.h || 12) > eye + (hs - eye) * t / Dt && (f.h || 12) * 0.25 < eye + (hs - eye) * t / Dt) { w = 0.75; who = f.id; break; }
      }
      hidden += w; n++;
      if (who) by.set(who, (by.get(who) || 0) + w);
    }
  }
  return { share: r3(hidden / n), by: [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, w]) => ({ id, share: r3(w / n) })) };
}

/** The quick projection of a candidate: sky share, the subject's size and screen x, water rows, leading lines. */
export function quickFrame(layout, subject, cam, pre = null) {
  const f = 800 / Math.tan(cam.fov * RAD / 2), eye = cam.eye, H = 900, horizon = cam.horizon;
  const [sx, sd] = toCam(cam.e, cam.n, cam.heading, subject.e, subject.n);
  const X = 800 + f * sx / Math.max(0.5, sd);
  const size = sd > 0.5 ? f * subject.h / sd / H : 0;
  // the skyline lift per column (rows above the horizon): the highest top of buildings and trees within 1.5 km; it does not depend on the
  // horizon row, so a horizon search reuses it (pre.lift)
  const lift = pre && pre.lift ? pre.lift : skylineLift(layout, cam, f);
  const sky = skyShareOf(lift, horizon);  // water between the camera and the subject: the near and far depth along the axis to the subject, and its share of the frame height
  let wNear = Infinity, wFar = -Infinity;
  const dMin = f * eye / (H - horizon);
  for (const w of layout.water || []) {
    const poly = w.poly || (w.line ? bufferLine(w.line, (w.width || 10) / 2) : null);
    if (!poly) continue;
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, pe = cam.e + (subject.e - cam.e) * t, pn = cam.n + (subject.n - cam.n) * t;
      if (pointIn(poly, pe, pn)) { const dd = Math.hypot(pe - cam.e, pn - cam.n) * Math.cos(Math.atan2(sx, sd)); wNear = Math.min(wNear, dd); wFar = Math.max(wFar, dd); }
    }
  }
  const rowOf = (d) => horizon + f * eye / Math.max(dMin, d);
  const water = isFinite(wNear) ? { near: r1(wNear), far: r1(wFar), share: r3((rowOf(wNear) - rowOf(wFar)) / H) } : null;
  // leading lines: ways and waterways ahead whose direction converges near the subject's column or a third
  const lines = [];
  for (const w of (layout.ways || []).concat((layout.water || []).filter(x => x.line).map(x => Object.assign({ kind: x.kind }, x)))) {
    const L = w.line;
    if (!L || L.length < 2) continue;
    let bestSeg = null;
    for (let i = 1; i < L.length; i++) {
      let a = toCam(cam.e, cam.n, cam.heading, L[i - 1][0], L[i - 1][1]), b = toCam(cam.e, cam.n, cam.heading, L[i][0], L[i][1]);
      if (Math.max(a[1], b[1]) < 3 || Math.min(a[1], b[1]) > 400) continue;
      // clip to the depth range in front of the camera (3 to 400 m)
      const cut = (p, q, dd) => { const t = (dd - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, dd]; };
      if (a[1] < 3) a = cut(a, b, 3); if (b[1] < 3) b = cut(b, a, 3);
      if (a[1] > 400) a = cut(a, b, 400); if (b[1] > 400) b = cut(b, a, 400);
      const near = Math.min(a[1], b[1]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (Math.abs((a[0] + b[0]) / 2) > Math.max(a[1], b[1]) * Math.tan(cam.fov * RAD / 2) * 1.1) continue;
      if (len < 15) continue;
      if (!bestSeg || near < bestSeg.near) bestSeg = { a, b, near, len };
    }
    if (!bestSeg) continue;
    let { a, b } = bestSeg;
    if (b[1] < a[1]) [a, b] = [b, a];
    const dd = b[1] - a[1], dx = b[0] - a[0];
    if (dd <= 1e-6 || Math.abs(dx) > 4 * dd) continue;   // runs across: not a leading line
    const vp = 800 + f * dx / dd;
    lines.push({ id: w.id, kind: w.kind, vp: Math.round(vp), near: r1(bestSeg.near) });
  }
  return { f, X: Math.round(X), xFrac: r3(X / 1600), d: r1(sd), x: r1(sx), size: r3(size), sky: r3(sky), water, lines, dMin: r1(dMin), lift };
}
const SKY_COLS = 32;
/** Per thing (footprint or tree crown): its centre and bounding radius, memoised per layout. */
const _bounds = new WeakMap();
function boundsOf(layout) {
  if (_bounds.has(layout)) return _bounds.get(layout);
  const things = (layout.buildings || []).map(b => { const c = centroid(b.poly); let R = 0; for (const p of b.poly) R = Math.max(R, Math.hypot(p[0] - c[0], p[1] - c[1])); return { id: b.id, poly: b.poly, c, R, h: b.h }; })
    .concat((layout.features || []).filter(t => t.kind === 'tree').map(t => ({ id: t.id, c: [t.e, t.n], R: t.r || 4, h: t.h || 12, tree: true })));
  _bounds.set(layout, things);
  return things;
}
/** The skyline lift per column (rows above the horizon), from each thing's projected column span at its nearest depth. */
export function skylineLift(layout, cam, f) {
  const lift = new Float64Array(SKY_COLS), eye = cam.eye, cw = 1600 / SKY_COLS;
  for (const T of boundsOf(layout)) {
    const [cx, cd] = toCam(cam.e, cam.n, cam.heading, T.c[0], T.c[1]);
    if (cd + T.R < 0.5 || cd - T.R > 1500 || T.h <= eye) continue;
    let x0 = Infinity, x1 = -Infinity, dn = Infinity;
    const pts = T.poly ? T.poly.map(p => toCam(cam.e, cam.n, cam.heading, p[0], p[1])) : [[cx - T.R, cd], [cx + T.R, cd]];
    for (const [x, d] of pts) { if (d < 0.5) continue; const X = 800 + f * x / d; x0 = Math.min(x0, X); x1 = Math.max(x1, X); dn = Math.min(dn, d); }
    if (!isFinite(dn) || x1 < 0 || x0 > 1600) continue;
    const rows = f * (T.h - eye) / dn * (T.tree ? 0.85 : 1);
    for (let c = Math.max(0, Math.floor(x0 / cw)); c <= Math.min(SKY_COLS - 1, Math.floor(x1 / cw)); c++) if (rows > lift[c]) lift[c] = rows;
  }
  return lift;
}
export function skyShareOf(lift, horizon) {
  let sky = 0;
  for (let c = 0; c < lift.length; c++) sky += clamp(horizon - lift[c], 0, 900) / 900;
  return sky / lift.length;
}
/** A polygon buffer of a polyline (a water centreline) for inside tests. */
export function bufferLine(L, w) {
  const left = [], right = [];
  for (let i = 0; i < L.length; i++) {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)];
    let ex = b[0] - a[0], ey = b[1] - a[1]; const l = Math.hypot(ex, ey) || 1; ex /= l; ey /= l;
    left.push([L[i][0] - ey * w, L[i][1] + ex * w]); right.push([L[i][0] + ey * w, L[i][1] - ex * w]);
  }
  return left.concat(right.reverse());
}
/** Is a camera position on ground a person could stand on (and, for `raised`, somewhere above it)? */
export function standable(layout, e, n, presetId) {
  for (const b of layout.buildings || []) if (pointIn(b.poly, e, n)) return { ok: false, why: 'inside a building' };
  const onBridge = (layout.ways || []).some(w => w.bridge && distToLine(w.line, e, n).d <= w.width / 2 + 1);
  for (const w of layout.water || []) {
    const poly = w.poly || (w.line ? bufferLine(w.line, (w.width || 10) / 2) : null);
    if (poly && pointIn(poly, e, n) && !onBridge) return { ok: false, why: 'in the water' };
  }
  if (presetId === 'raised') {
    const nearB = (layout.buildings || []).some(b => b.h >= 7 && distToLine(b.poly.concat([b.poly[0]]), e, n).d <= 6);
    return nearB || onBridge ? { ok: true, on: onBridge ? 'bridge' : 'window', raised: true } : { ok: false, why: 'nothing to stand on above the ground (a bridge or an upper window)' };
  }
  for (const w of layout.ways || []) {
    if (w.kind === 'rail') continue;
    const d = distToLine(w.line, e, n).d;
    if (w.kind === 'road') { if (d <= w.width / 2 + 3) return { ok: true, on: d <= w.width / 2 ? 'road (the pavement)' : 'pavement' }; }
    else if (d <= w.width / 2 + 1.5) return { ok: true, on: w.kind };
  }
  for (const a of layout.areas || []) if (['park', 'garden', 'grass', 'plaza', 'heath', 'meadow', 'beach', 'sand', 'platform', 'wood'].includes(a.kind) && pointIn(a.poly, e, n)) return { ok: true, on: a.kind };
  return { ok: false, why: 'not on a path, pavement, square or park' };
}

const PRESET_RING = { 'close-up': [8, 15], street: [60, 320], 'down-street': [60, 450], raised: [60, 450], 'across-water': [60, 600], 'through-arch': [50, 300], panorama: [200, 600], 'from-hill': [250, 600] };
/**
 * The seeded candidates and their scores. opts: { candidates: 24 (kept), seed, siblings: [{ ref, fp }], eye, fov, horizon, terrain(e, n) -> m }.
 * Returns the kept candidates, best first; each { e, n, heading, side, dist, standOn, score, parts, occ, frame, preset, cam }.
 */
export function searchViewpoints(layout, subject, presetId, opts = {}) {
  const P = presetOf(presetId, opts);
  const seed = opts.seed != null ? opts.seed : hashOf(`${subject.id}|${P.id}`);
  const rnd = rndOf(seed);
  const [r0, r1x] = PRESET_RING[P.id] || [60, 600];
  const ringN = 24, rings = 4, out = [];
  const fov = opts.fov || P.fov, eye = opts.eye || P.eye;
  const aThird = Math.atan(Math.tan(fov * RAD / 2) / 3) / RAD;   // the angle off the axis that puts a point on a third line
  for (let k = 0; k < ringN * rings; k++) {
    const ring = Math.floor(k / ringN), j = k % ringN;
    const az = (j + rnd() * 0.8) * 360 / ringN, dist = r0 + (r1x - r0) * (ring + rnd()) / rings;
    const e = subject.e + Math.sin(az * RAD) * dist, n = subject.n + Math.cos(az * RAD) * dist;
    const st = standable(layout, e, n, P.id);
    if (!st.ok) continue;
    const toSubj = bearingOf(subject.e - e, subject.n - n);
    for (const side of [-1, 1]) {
      // side -1: the subject on the LEFT third (camera turned right of it), +1 on the right third
      const heading = norm360(toSubj - side * aThird);
      const camEye = st.raised ? (st.on === 'bridge' ? 6 : 8) : eye;
      out.push(scoreCandidate(layout, subject, P, { e: r1(e), n: r1(n), heading: r1(heading), side, dist: r1(dist), standOn: st.on, eye: camEye, fov, horizon: opts.horizon || P.horizon }, opts));
    }
  }
  // feature-led candidates: the places this preset's view is taken from (a bank, a street, a bridge, under trees)
  const extra = featureSpots(layout, subject, P, r0, r1x);
  const pickN = Math.min(extra.length, 160), step = extra.length / Math.max(1, pickN);
  for (let i = 0; i < pickN; i++) {
    const [e, n] = extra[Math.floor(i * step)];
    const st = standable(layout, e, n, P.id);
    if (!st.ok) continue;
    const toSubj = bearingOf(subject.e - e, subject.n - n), dist = Math.hypot(subject.e - e, subject.n - n);
    for (const side of [-1, 1]) {
      const heading = norm360(toSubj - side * aThird);
      const camEye = st.raised ? (st.on === 'bridge' ? 6 : 8) : eye;
      out.push(scoreCandidate(layout, subject, P, { e: r1(e), n: r1(n), heading: r1(heading), side, dist: r1(dist), standOn: st.on, eye: camEye, fov, horizon: opts.horizon || P.horizon }, opts));
    }
  }
  out.sort((a, b) => (b.score - a.score) || (a.e - b.e) || (a.n - b.n) || (a.side - b.side));
  // distinct viewpoints: drop a candidate within 12 m of a better one looking the same way (within 15 degrees)
  const kept = [];
  for (const c of out) {
    if (kept.some(k => Math.hypot(k.e - c.e, k.n - c.n) < 12 && Math.abs(((k.heading - c.heading + 540) % 360) - 180) < 15)) continue;
    kept.push(c);
    if (kept.length >= (opts.candidates || 24)) break;
  }
  return kept;
}
/** Spots along the features a preset is taken from, inside the ring [r0, r1] round the subject (deterministic order). */
function featureSpots(layout, subject, P, r0, r1x) {
  const out = [];
  const inRing = (e, n) => { const d = Math.hypot(e - subject.e, n - subject.n); return d >= r0 && d <= r1x; };
  const along = (L, every, fn) => { for (let i = 1; i < L.length; i++) { const [ax, ay] = L[i - 1], [bx, by] = L[i], l = Math.hypot(bx - ax, by - ay); const k = Math.max(1, Math.round(l / every)); for (let j = 0; j < k; j++) { const t = (j + 0.5) / k; fn(ax + (bx - ax) * t, ay + (by - ay) * t, (bx - ax) / (l || 1), (by - ay) / (l || 1)); } } };
  const ring = (poly) => poly.concat([poly[0]]);
  if (P.id === 'across-water' || P.id === 'panorama') {
    for (const w of layout.water || []) {
      const poly = w.poly || (w.line ? bufferLine(w.line, (w.width || 10) / 2) : null);
      if (!poly) continue;
      along(ring(poly), 20, (x, y, ux, uy) => { for (const off of [3, 6, 11]) for (const sgn of [-1, 1]) { const e = x - uy * off * sgn, n = y + ux * off * sgn; if (!pointIn(poly, e, n) && inRing(e, n)) out.push([e, n]); } });
    }
  }
  if (P.id === 'down-street' || P.id === 'street' || P.id === 'close-up') {
    for (const w of layout.ways || []) {
      if (w.kind === 'rail') continue;
      along(w.line, P.id === 'close-up' ? 3 : 25, (x, y, ux, uy) => { const offs = w.kind === 'road' ? [w.width / 2 + 1, -(w.width / 2 + 1)] : [0]; for (const off of offs) { const e = x - uy * off, n = y + ux * off; if (inRing(e, n)) out.push([e, n]); } });
    }
    for (const a of layout.areas || []) if (a.kind === 'plaza') along(ring(a.poly), 15, (x, y, ux, uy) => { const e = x - uy * 4, n = y + ux * 4; if (pointIn(a.poly, e, n) && inRing(e, n)) out.push([e, n]); });
    for (const w of layout.water || []) if (w.line && P.id === 'down-street') along(w.line, 30, (x, y, ux, uy) => { for (const sgn of [-1, 1]) { const off = (w.width || 10) / 2 + 2; const e = x - uy * off * sgn, n = y + ux * off * sgn; if (inRing(e, n)) out.push([e, n]); } });
  }
  if (P.id === 'raised') {
    for (const w of layout.ways || []) if (w.bridge) along(w.line, 8, (x, y) => { if (inRing(x, y)) out.push([x, y]); });
    for (const b of layout.buildings || []) if (b.h >= 7 && b.id !== subject.id) along(ring(b.poly), 12, (x, y, ux, uy) => { for (const sgn of [-1, 1]) { const e = x - uy * 3 * sgn, n = y + ux * 3 * sgn; if (!pointIn(b.poly, e, n) && inRing(e, n)) out.push([e, n]); } });
  }
  if (P.id === 'through-arch') {
    for (const f of layout.features || []) if (f.kind === 'tree') for (let a = 0; a < 8; a++) { const e = f.e + Math.sin(a * Math.PI / 4) * 6, n = f.n + Math.cos(a * Math.PI / 4) * 6; if (inRing(e, n)) out.push([e, n]); }
    for (const a of layout.areas || []) if (a.kind === 'wood') along(ring(a.poly), 20, (x, y) => { if (inRing(x, y)) out.push([x, y]); });
  }
  return out.map(([e, n]) => [r1(e), r1(n)]);
}
function rangeScore(v, [lo, hi]) { if (v >= lo && v <= hi) return 1; const w = (hi - lo) || 0.1; return clamp(1 - (v < lo ? lo - v : v - hi) / w, 0, 1); }
function scoreCandidate(layout, subject, P, c, opts) {
  const cam = { e: c.e, n: c.n, heading: c.heading, eye: c.eye, fov: c.fov, horizon: c.horizon };
  const occ = occlusion(layout, subject, cam);
  // the horizon that brings the sky share into the preset's range (the skyline lift does not depend on the horizon row)
  const skyR = (P.aim && P.aim.sky) || P.sky || [0.22, 0.45], skyMid = (skyR[0] + skyR[1]) / 2;
  let frame = quickFrame(layout, subject, cam);
  const lo = Math.max(250, P.horizon - 70), hi = Math.min(620, P.horizon + 70);
  let best = { h: cam.horizon, err: Math.abs(frame.sky - skyMid) };
  for (let h = lo; h <= hi; h += 10) { const err = Math.abs(skyShareOf(frame.lift, h) - skyMid); if (err < best.err - 1e-9) best = { h, err }; }
  if (best.h !== cam.horizon) { cam.horizon = best.h; frame = quickFrame(layout, subject, cam, { lift: frame.lift }); }
  const parts = {};
  parts.visibility = occ.share > 0.3 ? 0 : 1 - occ.share / 0.3 * 0.5;
  // the preset's needs
  let needs = 0.6;
  const notes = [];
  if (P.id === 'across-water') {
    if (!frame.water) { needs = 0; notes.push('no water between the camera and the subject'); }
    else { needs = 0.5 * rangeScore(frame.water.share, P.water || [0.18, 0.32]) + 0.5 * rangeScore(frame.water.far, P.farBank || [30, 250]); notes.push(`water ${Math.round(frame.water.share * 100)} % of the height, far bank ${frame.water.far} m`); }
  } else if (P.id === 'down-street') {
    const axis = frame.lines.filter(l => l.near < 25);
    if (!axis.length) { needs = 0.1; notes.push('no street or canal running away from the camera'); }
    else { const vp = axis[0].vp / 1600; needs = (vp >= 0.28 && vp <= 0.45) || (vp >= 0.55 && vp <= 0.72) ? 1 : vp > 0.45 && vp < 0.55 ? 0.5 : 0.3; notes.push(`the ${axis[0].kind} ${axis[0].id} vanishes at ${Math.round(vp * 100)} % of the width`); }
  } else if (P.id === 'from-hill') {
    if (typeof opts.terrain === 'function') {
      const hc = opts.terrain(c.e, c.n), hs = opts.terrain(subject.e, subject.n);
      const rise = Number.isFinite(hc) && Number.isFinite(hs) ? hc - hs : 0;
      needs = clamp(rise / 60, 0, 1); notes.push(`the camera stands ${Math.round(rise)} m above the subject`);
    } else { needs = 0.5; notes.push('no terrain: elevation not judged (run with the terrain tool, builder E)'); }
  } else if (P.id === 'raised') { needs = c.standOn === 'bridge' || c.standOn === 'window' ? 1 : 0.2; }
  else if (P.id === 'through-arch') {
    const near = (layout.features || []).filter(f => f.kind === 'tree' && Math.hypot(f.e - c.e, f.n - c.n) < 18).length + (layout.areas || []).filter(a => a.kind === 'wood' && pointIn(a.poly, c.e, c.n)).length;
    needs = near ? 1 : 0.5; if (!near) notes.push('no trees or arch near the camera: the framing comes from the kit');
  } else if (P.id === 'close-up') { needs = rangeScore(frame.d, P.subjectD || [8, 15]); }
  else if (P.id === 'street' || P.id === 'panorama') { needs = frame.lines.length ? 1 : 0.5; }
  parts.needs = r3(needs);
  // composition: the subject on a third (by construction, unless clipped), its size, the sky, a leading line toward it
  const subjR = P.subject || [0.18, 0.45];
  const thirds = Math.abs(frame.xFrac - (c.side < 0 ? 1 / 3 : 2 / 3)) <= 0.08 ? 1 : 0.4;
  const lead = frame.lines.some(l => Math.min(Math.abs(l.vp - frame.X), Math.abs(l.vp - 1600 * (c.side < 0 ? 1 / 3 : 2 / 3))) <= 0.15 * 1600) ? 1 : frame.lines.length ? 0.5 : 0.2;
  // the leading line counts only for the presets that want one (street, raised, down-street)
  parts.composition = P.lines ? r3(0.15 * thirds + 0.25 * rangeScore(frame.size, subjR) + 0.25 * rangeScore(frame.sky, P.sky || skyR) + 0.35 * lead)
    : r3(0.3 * thirds + 0.35 * rangeScore(frame.size, subjR) + 0.35 * rangeScore(frame.sky, P.sky || skyR));
  // uniqueness against the siblings' fingerprints: preset, horizon bucket, heading class, third
  const sibs = opts.siblings || [];
  let uniq = 1;
  if (sibs.length) {
    const hb = Math.round(cam.horizon / 50), hc = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(c.heading / 45) % 8], third = c.side < 0 ? 'L' : 'R';
    let worst = 0;
    for (const s of sibs) { const fp = s.fp || s; let m = 0; if (fp.preset === P.id) m += 0.3; if (fp.horizonBucket === hb) m += 0.25; if (fp.headingClass === hc) m += 0.2; if (fp.third === third) m += 0.25; worst = Math.max(worst, m); }
    uniq = 1 - worst;
  }
  parts.uniqueness = r3(uniq);
  const score = r3(parts.visibility * 0.35 + parts.needs * 0.25 + parts.composition * 0.3 + parts.uniqueness * 0.1 - (occ.share > 0.3 ? 1 : 0));
  return Object.assign({}, c, { horizon: cam.horizon, score, parts, occ, frame, notes, preset: P.id });
}

/* =============================================================================================
   6. The lite projection (when builder E's osm-project.mjs is absent)
   ============================================================================================= */
/** Clip a polygon to the view wedge: d >= dNear, d <= range, |x| <= d * k (Sutherland-Hodgman over the 4 half-planes). */
export function clipWedge(P, { dNear = 0.5, range = 700, k = 0.8 } = {}) {
  const planes = [(p) => p[1] - dNear, (p) => range - p[1], (p) => p[1] * k - p[0], (p) => p[1] * k + p[0]];
  let out = P;
  for (const f of planes) {
    const inp = out; out = [];
    if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const a = inp[(i + inp.length - 1) % inp.length], b = inp[i], fa = f(a), fb = f(b);
      if (fb >= 0) { if (fa < 0) out.push(lerpAt(a, b, fa, fb)); out.push(b); }
      else if (fa >= 0) out.push(lerpAt(a, b, fa, fb));
    }
  }
  return out;
}
const lerpAt = (a, b, fa, fb) => { const t = fa / (fa - fb); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
/** Clip a polyline to the wedge: the pieces inside (each with at least 2 points). */
export function clipLine(L, opt) {
  const inside = (p) => p[1] >= opt.dNear && p[1] <= opt.range && Math.abs(p[0]) <= p[1] * opt.k;
  const pieces = []; let cur = [];
  const N = 8;
  for (let i = 0; i < L.length; i++) {
    if (i === 0) { if (inside(L[0])) cur.push(L[0]); continue; }
    const a = L[i - 1], b = L[i];
    for (let s = 1; s <= N; s++) { const p = [a[0] + (b[0] - a[0]) * s / N, a[1] + (b[1] - a[1]) * s / N]; if (inside(p)) cur.push(p); else if (cur.length) { pieces.push(cur); cur = []; } }
  }
  if (cur.length) pieces.push(cur);
  return pieces.filter(p => p.length >= 2).map(p => simplify(p, 0.5));
}
/** Douglas-Peucker in metres; the tolerance grows with depth (1.5 screen units at that depth, V2 17.3). */
export function simplify(L, tol0, f = 1232) {
  if (L.length <= 2) return L.map(p => [r1(p[0]), r1(p[1])]);
  const keep = new Uint8Array(L.length); keep[0] = keep[L.length - 1] = 1;
  const rec = (i, j) => {
    let best = -1, bi = -1;
    const [ax, ay] = L[i], [bx, by] = L[j], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey) || 1;
    for (let k = i + 1; k < j; k++) { const d = Math.abs((L[k][0] - ax) * ey - (L[k][1] - ay) * ex) / l; const tol = Math.max(tol0, 1.5 * Math.max(1, L[k][1]) / f); if (d > tol && d > best) { best = d; bi = k; } }
    if (bi >= 0) { keep[bi] = 1; rec(i, bi); rec(bi, j); }
  };
  rec(0, L.length - 1);
  return L.filter((_, i) => keep[i]).map(p => [r1(p[0]), r1(p[1])]);
}
/** Douglas-Peucker for a closed ring (open polygon form, no repeated first point): split at the point farthest from the first. */
export function simplifyRing(P, tol0) {
  if (P.length <= 4) return P.map(p => [r1(p[0]), r1(p[1])]);
  let far = 1, fd = -1;
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = simplify(P.slice(0, far + 1), tol0), b = simplify(P.slice(far).concat([P[0]]), tol0);
  return a.concat(b.slice(1, -1));
}
const slug = (s, n = 30) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n) || 'x';
/**
 * The layout seen from `view` ({ e, n, heading } in the layout's metres) as recipe sections (V2 3.2, 5.1, 17.4, 17.5).
 * The ids are unique and match /^[a-z0-9-]{1,30}$/; every entry carries src: 'osm'.
 */
export function projectLite(layout, view, { range = 700, fov = 66, urban = true, objects = null } = {}) {
  const k = Math.tan(fov * RAD / 2) * 1.2, opt = { dNear: 0.5, range, k };
  const T = (p) => toCam(view.e, view.n, view.heading, p[0], p[1]);
  const ids = new Set(), uid = (base) => { let b = slug(base, 26), id = b, i = 2; while (ids.has(id)) id = `${b}-${i++}`; ids.add(id); return id; };
  const surfaces = [], water = [], buildings = [], landmarks = [], missing = [];
  ids.add('land');
  const areaOrder = ['field', 'meadow', 'heath', 'wood', 'grass', 'park', 'garden', 'beach', 'sand', 'parking', 'rail', 'platform', 'plaza'];
  for (const a of (layout.areas || []).slice().sort((p, q) => areaOrder.indexOf(p.kind) - areaOrder.indexOf(q.kind) || (p.id < q.id ? -1 : 1))) {
    const P = clipWedge(a.poly.map(T), opt);
    if (P.length < 3 || polyArea(P) < 4) continue;
    surfaces.push({ id: uid(a.kind), kind: a.kind, poly: simplifyRing(P, 0.5), src: 'osm' });
  }
  for (const w of layout.water || []) {
    if (w.poly) { const P = clipWedge(w.poly.map(T), opt); if (P.length >= 3 && polyArea(P) >= 4) water.push({ id: uid(w.kind), kind: w.kind, poly: simplifyRing(P, 0.5), src: 'osm' }); }
    else if (w.line && !(layout.water || []).some(x => x.poly && x.kind === w.kind && pointIn(x.poly, w.line[Math.floor(w.line.length / 2)][0], w.line[Math.floor(w.line.length / 2)][1]))) {
      for (const piece of clipLine(w.line.map(T), opt)) water.push({ id: uid(w.kind), kind: w.kind, path: piece, width: r1(w.width), src: 'osm' });
    }
  }
  const roads = [];
  for (const w of (layout.ways || []).slice().sort((p, q) => (p.kind === 'road') - (q.kind === 'road') || (p.id < q.id ? -1 : 1))) {
    for (const piece of clipLine(w.line.map(T), opt)) {
      const id = uid(w.kind === 'road' ? (w.cls === 'primary' || w.cls === 'secondary' ? 'main-road' : 'road') : w.kind);
      const s = { id, kind: w.kind, path: piece, width: r1(w.width), src: 'osm' };
      if (w.kind === 'road') { s.markings = ['primary', 'secondary', 'tertiary', 'trunk'].includes(w.cls) ? 'centre' : 'none'; roads.push({ s, w }); }
      if (w.kind === 'path' && (layout.water || []).some(x => x.kind === 'canal' && (x.line ? distToLine(x.line, w.line[0][0], w.line[0][1]).d < 6 + (x.width || 10) / 2 : false))) s.kind = 'towpath';
      if (w.bridge) s.bridge = true;
      surfaces.push(s);
    }
  }
  // pavements beside urban roads (sidewalk=both by default in towns, V2 17.3)
  for (const { s, w } of roads) {
    const sw = w.sidewalk || (urban && w.cls !== 'service' ? 'both' : 'no');
    if (sw === 'no' || sw === 'none') continue;
    for (const side of sw === 'both' ? ['left', 'right'] : [sw]) if (side === 'left' || side === 'right') surfaces.push({ id: uid(`${s.id}-pave-${side[0]}`), kind: 'pavement', beside: s.id, side, width: 2, kerb: 0.12, src: 'osm' });
  }
  // buildings (F projects them; the subject is one of them when it is a footprint)
  let seed = 1;
  for (const b of (layout.buildings || [])) {
    const P = b.poly.map(T);
    const inView = P.some(p => p[1] >= 0.5 && p[1] <= range && Math.abs(p[0]) <= p[1] * k);
    if (!inView) continue;
    const foot = simplifyRing(P, 0.3);
    if (foot.length < 3) continue;
    buildings.push({ id: uid('b-' + (b.kind === 'yes' ? 'house' : b.kind)), foot, h: r1(b.h), storeys: b.levels || Math.max(1, Math.round((b.h - 1) / 3)), roof: b.tags['roof:shape'] || (b.h > 20 ? 'flat' : 'gable'), style: styleOf(b), seed: seed++, front: frontEdge(foot), src: 'osm', osm: b.id });
  }
  // landmarks: a library object when one matches, else listed as missing (the import names, never draws, the name)
  for (const f of layout.features || []) {
    const [x, d] = T([f.e, f.n]);
    if (d < 0.5 || d > range || Math.abs(x) > d * k) continue;
    if (f.kind === 'tree') { landmarks.push({ obj: 'tree.oak', at: [r1(x), r1(d)], src: 'osm' }); continue; }
    if (buildings.some(b => b.osm === f.id)) continue;   // a footprint: F draws it
    const obj = objects ? objects(f) : null;
    if (obj) landmarks.push({ obj, at: [r1(x), r1(d)], fix: true, src: 'osm' });
    else missing.push({ what: f.kind, name: f.name || null, at: [r1(x), r1(d)], h: r1(f.h || 0), osm: f.id });
  }
  return { surfaces, water, buildings, landmarks, missing };
}
/** F's style from the tags (V2 17.4, the short form): material, use, era. */
export function styleOf(b) {
  const t = b.tags || {}, mat = t['building:material'] || '', y = parseInt(t.start_date, 10);
  if (t['building:architecture']) { const a = t['building:architecture'].toLowerCase(); for (const s of ['georgian', 'victorian', 'edwardian', 'brutalist']) if (a.includes(s)) return s === 'victorian' ? 'victorian-terrace' : s; }
  if (/flint/.test(mat)) return 'norfolk-flint';
  if (b.kind === 'train_station' || t.railway === 'station') return 'station';
  if (['industrial', 'warehouse'].includes(b.kind) || t.historic === 'mill' || t.man_made === 'works') return 'mill';
  if (/stone/.test(mat)) return 'stone-cottage';
  if (Number.isFinite(y)) {
    if (y < 1840) return 'georgian'; if (y <= 1900) return 'victorian-terrace'; if (y <= 1918) return 'edwardian';
    if (y <= 1939) return b.kind === 'semidetached_house' ? '1930s-semi' : t.shop ? 'interwar-shops' : '1930s-semi';
    if (y >= 1945 && y <= 1979 && /concrete/.test(mat)) return 'brutalist'; if (y > 1990) return 'modern-glass';
  }
  if (t.shop || b.kind === 'retail') return 'interwar-shops';
  if (b.kind === 'semidetached_house') return '1930s-semi';
  if (['office', 'commercial'].includes(b.kind) && b.h > 20) return 'modern-glass';
  return 'victorian-terrace';
}
/** The footprint edge nearest the camera axis... the one facing the camera (the lowest mean d): where the door goes. */
function frontEdge(foot) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < foot.length; i++) { const a = foot[i], b = foot[(i + 1) % foot.length]; const md = (a[1] + b[1]) / 2; if (md < bd) { bd = md; best = i; } }
  return best;
}

/* =============================================================================================
   7. The draft recipe
   ============================================================================================= */
const MOOD_OF = { dawn: 'calm', morning: 'cheerful', day: 'cheerful', noon: 'energetic', afternoon: 'cheerful', golden: 'dreamy', sunset: 'dreamy', dusk: 'calm', night: 'cosy' };   // ANIM_MOODS
const COLOUR_OF = { 'across-water': 'teal', 'down-street': 'amber', 'from-hill': 'green', raised: 'blue', 'through-arch': 'green', 'close-up': 'amber', panorama: 'blue', street: 'amber' };
/**
 * The recipe (V2 16.1) of the draft. sections: projectLite's (or E's osmProject's) output. kits: region kits (the composer picks the
 * framing tree and scatter through `pick(role, tags)`). Flows for every road, pavement, towpath and waterway (densities by class).
 */
export function draftRecipe({ brief, place, subject, view, sections, pack, id, presetCam, kits = ['temperate', 'people', 'birds'], pick = null, region = null, date = null }) {
  const S = sections;
  // the rest of the ground: grass, unless the view is a dense townscape (then yards and forecourts)
  const surfaces = (S.surfaces.some(x => x && x.rest) ? [] : [{ id: 'land', kind: S.buildings.length >= 20 ? 'plot' : 'grass', rest: true }]).concat(S.surfaces);
  const place_ = [];
  // the subject: a library landmark when the projection placed one; else its footprint is among the buildings (F draws it)
  // the subject's footprint: by its OSM id (the lite projection), else the footprint holding its centre (E's projection)
  const [sx0, sd0] = toCam(view.e, view.n, view.heading, subject.e, subject.n);
  let subjB = S.buildings.find(b => b.osm === subject.id) || S.buildings.find(b => Array.isArray(b.foot) && b.foot.length >= 3 && pointIn(b.foot, sx0, sd0));
  // a library object the projection stood on the subject's footprint (a church, a station): it IS the subject; the generated stand-in goes
  const onFoot = subjB ? S.landmarks.find(l => Array.isArray(l.at) && (pointIn(subjB.foot, l.at[0], l.at[1]) || Math.hypot(l.at[0] - sx0, l.at[1] - sd0) < 4) && !/^tree\./.test(l.obj)) : null;
  if (onFoot) { onFoot.subject = true; S.buildings = S.buildings.filter(b => b !== subjB); subjB = null; }
  if (subjB) {
    subjB.subject = true;
    const st = SUBJECTS[subject.want] && SUBJECTS[subject.want].style;
    if (st) subjB.style = st;
    // no generator style fits it (a church, a castle ...): it stands in as a plain building, and the report lists it as missing
    else (S.missing = S.missing || []).push({ what: subject.want || subject.kind, name: subject.name || null, at: [r1(toCam(view.e, view.n, view.heading, subject.e, subject.n)[0]), r1(toCam(view.e, view.n, view.heading, subject.e, subject.n)[1])], h: r1(subject.h || 0), osm: subject.id, note: `drawn as a ${subjB.style} stand-in: no library landmark and no generator style for a ${subject.want || subject.kind}` });
  }
  for (const l of S.landmarks) place_.push(l);
  const subjPl = place_.find(p => p.fix && Math.hypot(p.at[0] - toCam(view.e, view.n, view.heading, subject.e, subject.n)[0], p.at[1] - toCam(view.e, view.n, view.heading, subject.e, subject.n)[1]) < 3);
  if (subjPl) subjPl.subject = true;
  // framing in front: a tree at the edge for presets that want it (street: one side; through-arch: both)
  const P = presetCam;
  const tree = pick ? pick('tree', ['deciduous']) || pick('tree', []) : 'tree.oak';
  if (tree && (P.preset === 'through-arch' || P.preset === 'street')) {
    const sides = P.preset === 'through-arch' ? [-1, 1] : [view.side > 0 ? -1 : 1];   // the side away from the subject
    for (const s of sides) place_.push({ obj: tree, at: [r1(s * 7.5), 6.5], layer: 'front', k: 1.1, src: 'compose' });
  }
  // scatter: trees on the green surfaces, shrubs on verges and banks (smart scatter keeps them off hard ground, V2 11)
  const green = surfaces.filter(s => ['park', 'grass', 'garden', 'heath', 'meadow', 'wood'].includes(s.kind)).map(s => s.id);
  const hard = surfaces.filter(s => ['road', 'path', 'pavement', 'towpath', 'plaza', 'cycleway', 'rail', 'tramway', 'parking', 'platform'].includes(s.kind)).map(s => s.id);
  const scatter = (S.scatter || []).slice();   // the projection's own rules (E: woods, heaths, tree rows) first
  if (green.length && tree) scatter.push({ obj: tree, on: green, avoid: hard, d: [12, 260], n: 14, dist: 'ground', cluster: { centres: 3, spread: 18 }, gap: 'foot', seed: hashOf(id) % 997 });
  // low plants (category plant, role ground): never a flat ground decal such as sand or litter (cover handles those, V2 10)
  const shrub = pick ? pick('ground', [], { category: 'plant' }) || pick('shrub', [], { category: 'plant' }) : null;
  // species: 1: the engine's species fill must not add a tall plant (a hedge) that would hide the view this draft was chosen for
  if (shrub && green.length) scatter.push({ obj: shrub, on: green, avoid: hard, d: [5, 60], n: 60, dist: 'screen', cluster: { centres: 6, spread: 6 }, species: 1, seed: (hashOf(id) >> 3) % 997 });
  // flows: every road, pavement, path, towpath and waterway in view (V2 20.3 step 4)
  const flows = [];
  const roads = surfaces.filter(s => s.kind === 'road');
  if (roads.length) flows.push({ id: 'traffic', kind: 'drive', on: roads.map(s => s.id), density: r3(Math.max(...roads.map(s => (s.id.startsWith('main') ? 1.2 : 0.4)))), profile: 'commuter', mix: 'kit', max: 8 });
  const walks = surfaces.filter(s => ['pavement', 'path', 'towpath', 'plaza'].includes(s.kind));
  if (walks.length) flows.push({ id: 'walkers', kind: 'walk', on: walks.map(s => s.id), density: 0.6, profile: 'town', mix: 'kit', both: true, max: 14 });
  const tows = surfaces.filter(s => s.kind === 'towpath' || s.kind === 'cycleway');
  if (tows.length) flows.push({ id: 'cycles', kind: 'cycle', on: tows.map(s => s.id), density: 0.3, profile: 'leisure', mix: 'kit', max: 3 });
  const ways = S.water.filter(w => ['canal', 'river'].includes(w.kind));
  if (ways.length) flows.push({ id: 'boats', kind: 'boat', on: ways.map(w => w.id), density: 0.4, profile: 'boats', mix: 'kit', max: 3 });
  const name = subject.name || place.name;
  const recipe = {
    v: 2, pack,
    meta: { id, label: titleCase(name).slice(0, 60), site: titleCase(place.name).slice(0, 60), tags: [...new Set(brief.tags.concat([slug(place.name, 20)]).concat(S.water.length ? ['water'] : []).concat(S.buildings.length ? ['town'] : []))].slice(0, 6),
      mood: MOOD_OF[brief.at] || 'calm', colour: COLOUR_OF[P.preset] || 'blue', region: region || [] },
    scene: {
      id,
      view: { lat: r6(place.lat0 != null ? place.lat0 : place.lat), lon: r6(place.lon0 != null ? place.lon0 : place.lon) },
      camera: Object.assign({}, P, { horizon: Math.round(view.horizon || P.horizon), heading: Math.round(view.heading) }),
      surfaces, water: S.water, buildings: S.buildings, place: place_, scatter, flows,
      atmos: 'auto', weather: brief.weather ? { kind: brief.weather } : 'live', cover: 'auto', season: brief.season || 'auto', at: brief.at || 'golden',
      setting: S.buildings.length > 6 ? 'urban' : S.buildings.length ? 'mixed' : 'natural', kits,
      source: S.source && S.source.osm ? S.source : { osm: { fetched: date || null, hash: null } },
    },
  };
  return recipe;
}
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const titleCase = (s) => String(s || '').replace(/\b[a-z]/g, c => c.toUpperCase());

/* =============================================================================================
   8. The pipeline
   ============================================================================================= */
async function tryImport(spec) { try { return await import(spec); } catch { return null; } }
/**
 * The whole compose (steps 1 to 4). opts: {
 *   pack, id, at: [lat, lon] | null, date ISO, candidates (24), seed,
 *   places (gazetteer), geocode(name) -> {lat, lon}, osm: Overpass JSON (a file's contents) | null, fetchOsm({ lat, lon, radius }) -> Overpass JSON,
 *   project(response, cam) -> sections (E's osmProject), terrain(e, n) -> m, siblings [{ ref, fp }], kits, pick(role, tags) -> obj id,
 *   objects(feature) -> a library landmark id | null, styles: [ids], cameraModule }
 * Returns { recipe, report } (report: brief, place, subject, chosen, alternatives (the next 2 of the top 3), missing, notes).
 */
export async function compose(text, opts = {}) {
  const notes = [];
  const brief = parseBrief(text, { places: opts.places || [] });
  if (!opts.pack) throw new Error('scene compose needs --pack <id>');
  const place = await locate(brief, { at: opts.at, geocode: opts.geocode });
  if (!place) throw new Error(`could not find "${brief.place ? brief.place.name : text}": give --at lat,lon (the gazetteer has the region places and the scenes' sites${opts.geocode ? '' : '; geocoding needs builder E\'s osm-fetch.mjs'})`);
  const preset = brief.preset || (brief.subject && ['bridge', 'quay', 'lock'].includes(brief.subject.kind) ? 'across-water' : 'street');
  if (!brief.preset) notes.push(`no viewpoint words in the brief: the ${preset} preset`);
  // the OSM data: 1.5 km about the place
  let response = opts.osm || null;
  if (!response && typeof opts.fetchOsm === 'function') response = await opts.fetchOsm({ lat: place.lat, lon: place.lon, radius: 750 });
  if (!response) throw new Error('no OpenStreetMap data: give --osm <overpass.json>, or install builder E\'s tools/lib/osm-fetch.mjs (it fetches and caches)');
  const layout = layoutFromOsm(response, { lat: place.lat, lon: place.lon });
  const subject = findSubject(layout, brief);
  if (!subject) throw new Error(`no ${brief.subject ? brief.subject.kind : 'landmark'} found in the OpenStreetMap data within 750 m of ${place.name}: name the subject ("the church", "the mill") or move --at`);
  const cands = searchViewpoints(layout, subject, preset, { candidates: opts.candidates || 24, seed: opts.seed, siblings: opts.siblings || [], terrain: opts.terrain, cameraModule: opts.cameraModule });
  if (!cands.length) throw new Error(`no viewpoint for the ${preset} preset: no walkable ground in the ring round ${subject.name || subject.kind} (try another preset or --at)`);
  const best = cands[0];
  if (best.occ.share > 0.3) notes.push(`the best viewpoint still hides ${Math.round(best.occ.share * 100)} % of the subject`);
  const mod = opts.cameraModule || cameraModule(opts.root || ROOT);
  const [clat, clon] = enu(place.lat, place.lon).from(best.e, best.n);
  const presetCam = mod.sceneCameraPreset(preset, { heading: best.heading, lat: r6(clat), lon: r6(clon), eye: best.eye, horizon: best.horizon });
  presetCam.lat = r6(clat); presetCam.lon = r6(clon);
  // E's projection when it is there (the real one, 17.3), else the lite one
  let sections = null;
  if (typeof opts.project === 'function') {
    try {
      const r = await opts.project(response, Object.assign({}, presetCam, { range: 700 }));
      sections = r && (r.sections || r);
      if (sections && !Array.isArray(sections.surfaces)) sections = null;
      if (sections) {
        sections = Object.assign({ surfaces: [], water: [], buildings: [], landmarks: [], missing: [], scatter: [] }, sections);
        if (sections.place && !sections.landmarks.length) sections.landmarks = sections.place;
        if (r.report && Array.isArray(r.report.missing)) sections.missing = sections.missing.concat(r.report.missing);
        if (r.source) sections.source = r.source;
        notes.push('the layout: builder E\'s osmProject');
      }
    } catch (e) { notes.push(`osmProject failed (${e.message}): the lite projection was used`); }
  }
  if (!sections) {
    if (!opts.project) notes.push('builder E\'s osm-project.mjs is not there: the lite projection (roads, paths, water, parks, footprints, landmarks) was used');
    sections = projectLite(layout, best, { fov: presetCam.fov, urban: layout.buildings.length > 20, objects: opts.objects });
  }
  if (opts.styles && opts.styles.length) for (const b of sections.buildings) if (!opts.styles.includes(b.style)) { notes.push(`style ${b.style} is not among F's styles: ${opts.styles[0]}`); b.style = opts.styles[0]; }
  const id = opts.id || slug(`${place.name}-${subject.name || subject.kind}-${preset}`, 40);
  const view = Object.assign({}, best);
  const recipe = draftRecipe({ brief, place: Object.assign({}, place, { lat0: clat, lon0: clon }), subject, view, sections, pack: opts.pack, id, presetCam, kits: opts.kits, pick: opts.pick, region: opts.region, date: opts.date });
  recipe.scene.view = { lat: r6(place.lat), lon: r6(place.lon) };   // the place; the camera carries where it stands
  const alt = cands.slice(1, 3).map(c => ({ e: c.e, n: c.n, heading: c.heading, horizon: c.horizon, score: c.score, parts: c.parts, occlusion: c.occ.share, standOn: c.standOn, latlon: enu(place.lat, place.lon).from(c.e, c.n).map(r6) }));
  const report = {
    v: 1, brief: { text: brief.text, place: brief.place && brief.place.name, at: brief.at, preset, weather: brief.weather, season: brief.season, subject: brief.subject, unknown: brief.unknown },
    place: { name: place.name, lat: place.lat, lon: place.lon, src: place.src },
    subject: { name: subject.name, kind: subject.kind, h: subject.h, at: [r1(subject.e), r1(subject.n)], osm: subject.id },
    chosen: { e: best.e, n: best.n, latlon: [r6(clat), r6(clon)], heading: best.heading, horizon: best.horizon, eye: best.eye, standOn: best.standOn, score: best.score, parts: best.parts, occlusion: best.occ, frame: { xFrac: best.frame.xFrac, size: best.frame.size, sky: best.frame.sky, water: best.frame.water, lines: best.frame.lines.slice(0, 4) }, notes: best.notes },
    alternatives: alt, candidates: cands.length, missing: sections.missing || [], notes,
    counts: { surfaces: recipe.scene.surfaces.length, water: recipe.scene.water.length, buildings: recipe.scene.buildings.length, place: recipe.scene.place.length, flows: recipe.scene.flows.length },
    bytes: JSON.stringify(recipe.scene).length,
  };
  if (report.bytes > 24000) notes.push(`the scene data is ${report.bytes} bytes, over the 24,000 budget: E's projection simplifies until it fits`);
  return { recipe, report, layout, candidates: cands };
}
export { tryImport };
/** Siblings' fingerprints for the uniqueness score, from a registry (packFingerprints of scene-composition.mjs). */
export async function siblingsOf(reg, pack, E) {
  const { packFingerprints } = await import('./scene-composition.mjs');
  try { return packFingerprints(reg, pack, E); } catch { return []; }
}
export { compositionFingerprint };
