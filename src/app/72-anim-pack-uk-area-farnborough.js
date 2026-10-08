/* ============================================================
   ANIMATION PACK "uk-area-fleet": Fleet and Farnborough, composed on the
   scene engine (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Fleet Pond, the Basingstoke Canal at Fleet, Fleet station, All Saints'
   Church, Southwood Country Park, Southwood Woodland and the airship hangar
   at Farnborough: one row per VIEW in the table of 71-scene-uk-fleet-scenes.js,
   each built by its archetype (70-scene-lib-area-fleet.js).
   Fleet Pond and the canal keep their FOUR seasonal items per view (spring,
   summer, autumn, winter), with the same item fields as the earlier items:
   id (county-prefixed, the view's original season without a suffix), label,
   site, ukPlace, ukView, ukSeason, season. The other views are one item each
   (the scene follows the date's season by itself). Every scene has the live
   sky. The scene is a THUNK: a row is built only when it is shown or linted.
   ukAreaFarnboroughItems() returns the items, so they can also be merged into
   another UK pack.
   ============================================================ */
function ukAreaFarnboroughItems() {
  if (typeof sceneItem !== 'function' || typeof sceneTable !== 'function' || typeof sceneFromArchetype !== 'function') return [];
  const COUNTY = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  const PLACES = {
    'farnborough-airshow': { label: 'Farnborough Airshow', town: 'Farnborough', kind: 'landmark', tags: ['airshow', 'aviation', 'aircraft', 'airfield'] },
    'farnborough-business-park': { label: 'Farnborough Business Park', town: 'Farnborough', kind: 'town', tags: ['business park', 'offices', 'airport', 'aviation'] },
    'farnborough-queensmead': { label: 'Queensmead, Farnborough', town: 'Farnborough', kind: 'town', tags: ['shopping', 'town centre', 'street'] },
    'st-michaels-abbey': { label: "St Michael's Abbey", town: 'Farnborough', kind: 'heritage', tags: ['abbey', 'church', 'gothic'] },
    'farnborough-fast-museum': { label: 'FAST museum', town: 'Farnborough', kind: 'heritage', tags: ['museum', 'aviation', 'heritage'] },
    'farnborough-main-station': { label: 'Farnborough Main station', town: 'Farnborough', kind: 'heritage', tags: ['station', 'railway', 'town'] },
    'farnborough-north-station': { label: 'Farnborough North station', town: 'Farnborough', kind: 'heritage', tags: ['station', 'railway', 'level crossing'] },
    'farnborough-canal': { label: 'Basingstoke Canal, Farnborough', town: 'Farnborough', kind: 'heritage', tags: ['canal', 'towpath', 'narrowboat'] },
  };
  const META = new Set(['arch', 'place', 'n', 'view', 'orig', 'reason', 'rsp', 'rsu', 'rau', 'rwi']);
  const REASON = { spring: 'rsp', summer: 'rsu', autumn: 'rau', winter: 'rwi' };
  const near = (town) => (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: town }], ctx).nearby.length > 0));
  const out = [];
  for (const row of sceneTable('uk-farnborough') || []) {
    const P = PLACES[row.place];
    if (!P) continue;
    const label = P.label, patch = {};
    // the archetype's params: the row without its item fields and captions, and without empty cells (a small row)
    const params = {};
    for (const [k, v] of Object.entries(row)) if (v != null && !META.has(k) && !(Array.isArray(v) && !v.length)) params[k] = v;
    const scene = () => sceneFromArchetype(row.arch, params, patch);
    const base = (reason) => ({
      label: label + ', ' + NAME, site: `${label} — ${reason}`, mood: row.view === 'evening' ? 'dreamy' : 'calm', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
      county: COUNTY, ukRegion: region, ukKind: P.kind, signature: false, ukPart: 'area-farnborough',
      ukPlace: row.place, ukLocality: P.town, ukTown: P.town, ukView: row.view, viewReason: reason, liveSky: { lat: row.lat, lon: row.lon },
    });
    if (row.orig) {
      for (const season of ['spring', 'summer', 'autumn', 'winter']) {
        const reason = row[REASON[season]], w = near(P.town);
        const meta = Object.assign(base(reason), {
          id: `${COUNTY}-${row.place}-${row.n}${season !== row.orig ? '-' + season : ''}`,
          colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green',
          tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), P.kind].concat(P.tags, season),
          ukSeason: season, sceneSeason: season,
          when: (day, ctx) => season === animSeasonOf(day) && w(day, ctx),
        });
        const it = sceneItem(meta, scene);
        it.season = [season];
        out.push(it);
      }
    } else {
      const meta = Object.assign(base(row.reason), {
        id: `${COUNTY}-${row.place}-${row.n}`, colour: P.kind === 'heritage' ? 'slate' : P.kind === 'landmark' ? 'blue' : P.kind === 'town' ? 'amber' : 'green',
        tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), P.kind].concat(P.tags, row.view),
        when: near(P.town),
      });
      out.push(sceneItem(meta, scene));
    }
  }
  return out;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = ukAreaFarnboroughItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-area-farnborough', name: 'UK: Farnborough', version: '1.0.0',
    description: "The Farnborough Airshow, the business park and airport, Queensmead, St Michael's Abbey, the FAST museum, Farnborough Main and North stations and the Basingstoke Canal by the airfield, composed on the scene engine: every view in four seasons with the live sky. Plays only in its county or near Farnborough.", items });
})();
