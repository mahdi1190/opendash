// OpenStreetMap fetching for the scene tools (docs/dev/SCENE_ENGINE_V2.md 17.2; builder E). Node >= 20, no dependencies.
// AUTHORING TIME ONLY: the app never fetches; what this returns is projected into plain recipe data (osm-project.mjs).
//
//   osmQuery(bbox, { timeout })            -> the Overpass QL text for the view's bounding box [south, west, north, east] (one query per run)
//   osmFetch({ bbox, fetch, cacheDir, refresh, offline, overpass, now, sleep, log, maxAgeDays })
//                                          -> { data, fetched: 'YYYY-MM-DD', hash (6 hex of the response), query, key, cached, file }
//   nominatimSearch(q, { fetch, cacheDir, refresh, offline, now, sleep })   -> [{ lat, lon, label, type, cls }] (geocoding for --place; 90 days)
//   cacheRoot(root)                        -> <root>/.anim-ref/cache (git-ignored; a developer cache, never committed, never read by the app)
//
// (No Accept header: Overpass answers a 504 to 'Accept: application/json'.)
// Etiquette (17.2): the User-Agent names the tool and the project; one Overpass request per run and none in parallel; a 429 or 504
// waits 30 s and retries ONCE, then fails with a clear message; Nominatim at most 1 request per second. Tests inject `fetch`, `sleep`
// and `now`: npm test never touches the network.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const USER_AGENT = 'OpenDash scene tool (https://github.com/mahdi1190/opendash)';
const DAY = 86400000;

export const cacheRoot = (root) => join(root, '.anim-ref', 'cache');
export const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** The one Overpass query of a run (V2 17.2): every tag family the projection reads, ways and relations with their geometry. */
export function osmQuery(bbox, { timeout = 60 } = {}) {
  const [s, w, n, e] = bbox.map(v => +(+v).toFixed(5));
  if (![s, w, n, e].every(Number.isFinite) || s >= n || w >= e) throw new Error(`bad bbox ${JSON.stringify(bbox)}`);
  const W = ['highway', 'railway', 'waterway', 'natural', 'landuse', 'leisure', 'building', '"building:part"', 'amenity', 'historic', 'tourism', 'man_made', 'bridge', 'barrier', '"area:highway"'];
  return [
    `[out:json][timeout:${timeout}][bbox:${s},${w},${n},${e}];`,
    '(',
    ...W.map(k => `  way[${k}];`),
    '  way["public_transport"="platform"];',
    '  way["place"="square"];',
    '  relation["type"="multipolygon"];',
    '  node["natural"~"^(tree|peak)$"];',
    '  node["amenity"~"^(place_of_worship|fountain|clock|cafe|restaurant|pub|bar|fast_food|ice_cream|bank|pharmacy|post_office|library)$"];',
    '  node["historic"]; node["memorial"]; node["tourism"~"^(attraction|artwork)$"];',
    '  node["man_made"~"^(tower|windmill|lighthouse|water_tower|chimney)$"];',
    '  node["railway"="station"]; node["shop"];',
    ');',
    'out geom;',
  ].join('\n');
}

function readCache(file, maxAgeMs, now) {
  if (!existsSync(file)) return null;
  try {
    const j = JSON.parse(readFileSync(file, 'utf8'));
    const age = now - Date.parse(j.fetchedAt || j.fetched);
    return { j, fresh: Number.isFinite(age) && age >= 0 && age < maxAgeMs };
  } catch { return null; }
}
function readIndex(cacheDir) { try { return JSON.parse(readFileSync(join(cacheDir, 'osm', 'index.json'), 'utf8')) || {}; } catch { return {}; } }
function writeCache(file, obj) {
  mkdirSync(join(file, '..'), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj));
  renameSync(tmp, file);
}

/** A typed error the commands print as one line. */
export class OsmFetchError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

/**
 * Fetch (or read from the cache) the OSM data of a bbox. One request; a 429 or 504 waits 30 s and retries once.
 * offline: never fetch (a missing or stale cache is an error unless allowStale); refresh: ignore the cache.
 */
export async function osmFetch({ bbox, query = null, fetch = globalThis.fetch, cacheDir, refresh = false, offline = false, overpass = OVERPASS_URL,
  now = Date.now, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = () => {}, maxAgeDays = 30, timeout = 60 } = {}) {
  const q = query || osmQuery(bbox, { timeout });
  const key = sha1(q), file = cacheDir ? join(cacheDir, 'osm', key + '.json') : null;
  const t = typeof now === 'function' ? now() : now;
  let hit = file && !refresh ? readCache(file, maxAgeDays * DAY, t) : null;
  // a fresh cached answer for a bbox that CONTAINS this one serves too (the projection clips): turning the camera costs no request
  if (!(hit && hit.fresh) && !refresh && cacheDir && bbox && !query) {
    const idx = readIndex(cacheDir), inside = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];
    for (const [k, v] of Object.entries(idx)) {
      if (!v || !Array.isArray(v.bbox) || !inside(bbox, v.bbox) || v.timeout !== timeout) continue;
      const h2 = readCache(join(cacheDir, 'osm', k + '.json'), maxAgeDays * DAY, t);
      if (h2 && (h2.fresh || offline)) { hit = h2; break; }
    }
  }
  const done = (j, cached) => ({ data: j.response, fetched: j.fetched, hash: sha1(JSON.stringify(j.response)).slice(0, 6), query: q, key, cached, file });
  if (hit && hit.fresh) return done(hit.j, true);
  if (offline) {
    if (hit) { log(`note: the OSM cache is older than ${maxAgeDays} days (${hit.j.fetched}); used because of --offline`); return done(hit.j, true); }
    throw new OsmFetchError('no cached OSM data for this view and --offline is set (run once without --offline to fill .anim-ref/cache/osm/)', 'offline');
  }
  if (typeof fetch !== 'function') throw new OsmFetchError('no fetch available (Node >= 20 has one built in)', 'nofetch');
  const body = 'data=' + encodeURIComponent(q);
  let res = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    log(attempt ? 'retrying the Overpass request once' : `asking Overpass (${overpass}) for ${bbox ? bbox.join(',') : 'the query'}`);
    try {
      res = await fetch(overpass, { method: 'POST', headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    } catch (e) { throw new OsmFetchError(`Overpass could not be reached (${e.message}); try again later, or use --offline with a cached view`, 'network'); }
    if (res.status === 429 || res.status === 504) {
      if (attempt === 0) { log(`Overpass answered ${res.status} (busy): waiting 30 s, then one retry`); await sleep(30000); continue; }
      throw new OsmFetchError(`Overpass is busy (${res.status} twice). Wait a few minutes and run again, or name another instance with --overpass <url>; nothing was written.`, 'busy');
    }
    break;
  }
  if (!res.ok) throw new OsmFetchError(`Overpass answered ${res.status}${res.statusText ? ' ' + res.statusText : ''}`, 'http');
  let response;
  try { response = await res.json(); } catch (e) { throw new OsmFetchError('Overpass sent something that is not JSON (an error page?): ' + e.message, 'json'); }
  if (!response || !Array.isArray(response.elements)) throw new OsmFetchError('Overpass sent JSON without elements' + (response && response.remark ? ': ' + response.remark : ''), 'json');
  if (response.remark && /runtime error|timed out/i.test(response.remark)) throw new OsmFetchError('Overpass gave up: ' + response.remark + ' (try a smaller --range)', 'timeout');
  const j = { fetched: isoDay(t), fetchedAt: new Date(t).toISOString(), query: q, response };
  if (file) { writeCache(file, j); if (bbox && !query) { const idx = readIndex(cacheDir); idx[key] = { bbox: bbox.map(Number), fetched: j.fetched, timeout }; writeCache(join(cacheDir, 'osm', 'index.json'), idx); } }
  return done(j, false);
}

let lastNominatim = 0;
/** Geocode a place name with Nominatim (cached 90 days; at most 1 request per second). */
export async function nominatimSearch(q, { fetch = globalThis.fetch, cacheDir, refresh = false, offline = false, now = Date.now, sleep = (ms) => new Promise(r => setTimeout(r, ms)), limit = 5, url = NOMINATIM_URL } = {}) {
  const query = String(q || '').trim();
  if (!query) throw new OsmFetchError('--place needs a name', 'args');
  const key = sha1('nominatim|' + query.toLowerCase() + '|' + limit), file = cacheDir ? join(cacheDir, 'geocode', key + '.json') : null;
  const t = typeof now === 'function' ? now() : now;
  const hit = file && !refresh ? readCache(file, 90 * DAY, t) : null;
  if (hit && (hit.fresh || offline)) return hit.j.response;
  if (offline) throw new OsmFetchError(`"${query}" is not in the geocoding cache and --offline is set`, 'offline');
  const wait = 1100 - (t - lastNominatim);
  if (lastNominatim && wait > 0) await sleep(wait);
  lastNominatim = typeof now === 'function' ? now() : t;
  const u = `${url}?format=jsonv2&limit=${limit}&q=${encodeURIComponent(query)}`;
  let res;
  try { res = await fetch(u, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }); } catch (e) { throw new OsmFetchError('Nominatim could not be reached: ' + e.message, 'network'); }
  if (!res.ok) throw new OsmFetchError(`Nominatim answered ${res.status}`, 'http');
  const list = await res.json();
  const response = (Array.isArray(list) ? list : []).map(r => ({ lat: +r.lat, lon: +r.lon, label: String(r.display_name || '').slice(0, 160), type: r.type || '', cls: r.category || r.class || '' })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  if (file) writeCache(file, { fetched: isoDay(t), fetchedAt: new Date(t).toISOString(), query, response });
  return response;
}
