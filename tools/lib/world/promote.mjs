// The opening rotation's world scenes (docs/dev/SCENE_FACTORY.md 2). PURE text edits of ONE table: the lines between
// '@opening-begin' and '@opening-end' in src/app/79-world-zzgallery.js, one line a promoted world scene:
//     'fleet-pond-2-w3': {"supersedes":["uk-south-east/hampshire-fleet-pond-2", ...]},      a world version of a registered opening
//     'whitby-harbour-1-w3': {"county":"north-yorkshire","ukTown":"Whitby",...},             a place that only has a world scene
//
//   readOpening(root)                    -> { file, text, lines, begin, end, entries: Map(id -> { i, entry }) }
//   promotedIds(root)                    -> [world ids in the table]
//   openingEntry(E, id, o)               -> { entry, notes }: what `promote` writes: the registered items the world scene supersedes
//                                           (the id without '-w3', with a county prefix, and the seasonal siblings of a base view unless
//                                           another promoted scene claims them), else a place of its own (county, ukTown, ukPlace,
//                                           ukView, its lat/lon, o.months)
//   writeOpening(root, id, entry | null) -> { changed, line }: promote (add or replace the line) or demote (remove it)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const OPENING_FILE = 'src/app/79-world-zzgallery.js';
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const LINE_RE = /^\s*'([a-z0-9][a-z0-9-]*)':\s*(\{.*\}),?\s*$/;

export function readOpening(root) {
  const file = join(root, OPENING_FILE), text = readFileSync(file, 'utf8'), lines = text.split('\n');
  const begin = lines.findIndex(l => l.includes('@opening-begin')), end = lines.findIndex(l => l.includes('@opening-end'));
  if (begin < 0 || end < begin) throw new Error(`${OPENING_FILE}: the '@opening-begin' / '@opening-end' markers are missing`);
  const entries = new Map();
  for (let i = begin + 1; i < end; i++) {
    const m = LINE_RE.exec(lines[i]);
    if (!m) continue;
    try { entries.set(m[1], { i, entry: JSON.parse(m[2]) }); } catch (e) { throw new Error(`${OPENING_FILE}:${i + 1}: not JSON: ${e.message}`); }
  }
  return { file, text, lines, begin, end, entries };
}
export function promotedIds(root) { return [...readOpening(root).entries.keys()]; }

/** The refs a world scene takes over, and the place fields of a world-only place. o: { county, town, place, view, months, claimed: Set(ref) }. */
export function openingEntry(E, id, o = {}) {
  const notes = [], x = id.replace(/-w3$/, ''), seasonal = new RegExp('-(' + SEASONS.join('|') + ')$');
  const own = seasonal.test(x);
  const refs = [...(E.refs ? E.refs.keys() : [])].filter(r => !/^(world-preview|uk-world|scene-page)\//.test(r));
  const claimed = o.claimed || new Set();
  const hits = refs.filter(r => {
    const rid = r.slice(r.indexOf('/') + 1), base = rid.replace(seasonal, '');
    if (rid === x || rid.endsWith('-' + x)) return true;
    return !own && seasonal.test(rid) && (base === x || base.endsWith('-' + x)) && !claimed.has(r);
  }).filter(r => { const it = E.refs.get(r); return it && it.slot === 'opening' && it.full; });
  if (hits.length) {
    for (const r of hits) { const it = E.refs.get(r); if (!it.composed) notes.push(`${r} is hand-drawn SVG: the world scene replaces its picture`); }
    return { entry: { supersedes: hits }, notes };
  }
  const reg = E.refs && (E.refs.get('world-preview/' + id) || E.refs.get('uk-world/' + id));
  const it = reg || (E.packs && (E.packs['world-test'] || []).find(i => i.id === id));
  if (!it) throw new Error(`unknown world scene '${id}'`);
  const spec = E.worldHostSpec ? E.worldHostSpec(it) : null, P = (spec && spec.place) || {};
  const county = o.county || it.county, town = o.town || it.ukTown;
  if (!county || !town || (E.ukCounty && !E.ukCounty(county))) throw new Error(`${id}: no county or town to play in (give --county=<county id> --town=<town>): county '${county || ''}' ${county && E.ukCounty && !E.ukCounty(county) ? 'is not a county id' : ''}`);
  const entry = { county, ukTown: town, ukPlace: o.place || it.ukPlace || x.replace(/-\d+$/, ''), ukView: o.view || (it.ukView && it.ukView !== 'world-engine' ? it.ukView : 'world') };
  if (Number.isFinite(P.lat) && Number.isFinite(P.lon)) { entry.ukLat = Math.round(P.lat * 1e4) / 1e4; entry.ukLon = Math.round(P.lon * 1e4) / 1e4; }
  if (o.months) entry.months = String(o.months).split(',').map(Number).filter(m => m >= 1 && m <= 12);
  if (o.label) entry.label = String(o.label);
  notes.push(`a place of its own: plays near ${town} (${county})`);
  return { entry, notes };
}

/** Add, replace (entry) or remove (null) one scene's line. The rest of the file is left as it is. */
export function writeOpening(root, id, entry) {
  const R = readOpening(root), lines = R.lines.slice(), had = R.entries.get(id);
  const line = entry ? `    '${id}': ${JSON.stringify(entry)},` : null;
  if (had && line === lines[had.i]) return { changed: false, line };
  if (had) { if (line) lines[had.i] = line; else lines.splice(had.i, 1); }
  else if (line) {
    // keep the table sorted by id
    let at = R.end;
    for (const [k, v] of R.entries) if (k > id) { at = Math.min(at, v.i); }
    lines.splice(at, 0, line);
  } else return { changed: false, line: null };
  writeFileSync(R.file, lines.join('\n'));
  return { changed: true, line };
}
