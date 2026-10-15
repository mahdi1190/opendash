/* ============================================================
   ANIMATION PACK "uk-north-sheffield-parks": Sheffield's parks, hand-composed on the scene engine v2
   (71-scene-uk-north-sheffield-parks.js; objects and helpers in 70-scene-lib-sheffield-parks.js). Four real viewpoints:
   the Botanical Gardens' pavilions, the Porter Brook's stepping stones in Endcliffe Park, Weston Park with the museum and
   Firth Court, and the Round House at Ringinglow on the edge of the Peak. Each an all-season item with the live sky: the
   scene follows the date's season, the real sun and the weather. Each scene is a THUNK, built only when it is shown or
   linted. Plays only in South Yorkshire or near Sheffield.
   ============================================================ */
function sceneUkSheffieldParksItems() {
  if (typeof sceneItem !== 'function' || typeof SCENE_SHP_VIEWS === 'undefined') return [];
  const COUNTY = 'south-yorkshire', NAME = 'South Yorkshire', NATION = 'GB-ENG', TOWN = 'Sheffield';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'yorkshire';
  const when = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: TOWN }], ctx).nearby.length > 0));
  const fns = {
    1: typeof sceneUkSheffieldParksV1 === 'function' ? sceneUkSheffieldParksV1 : null,
    2: typeof sceneUkSheffieldParksV2 === 'function' ? sceneUkSheffieldParksV2 : null,
    3: typeof sceneUkSheffieldParksV3 === 'function' ? sceneUkSheffieldParksV3 : null,
    4: typeof sceneUkSheffieldParksV4 === 'function' ? sceneUkSheffieldParksV4 : null,
  };
  const views = [
    { n: 1, place: 'sheffield-botanical-gardens', locality: 'Broomhall', view: 'pavilions', kind: 'landscape', colour: 'green', mood: 'calm', label: 'Botanical Gardens',
      site: 'The Botanical Gardens — up the lawn to the glass pavilions, picnics on the grass', tags: ['botanical gardens', 'glasshouse', 'lawn', 'flowers', 'park'] },
    { n: 2, place: 'endcliffe-park', locality: 'Endcliffe', view: 'stepping-stones', kind: 'landscape', colour: 'green', mood: 'cheerful', label: 'Endcliffe Park',
      site: 'Endcliffe Park — the stepping stones over the Porter Brook by the cafe', tags: ['park', 'brook', 'stepping stones', 'cafe', 'ducks', 'dogs'] },
    { n: 3, place: 'weston-park', locality: 'Crookesmoor', view: 'museum', kind: 'city', colour: 'blue', mood: 'energetic', label: 'Weston Park',
      site: 'Weston Park — the bandstand, the museum and Firth Court across Western Bank', tags: ['park', 'museum', 'university', 'bandstand', 'buses', 'students'] },
    { n: 4, place: 'ringinglow', locality: 'Ringinglow', view: 'edge', kind: 'landscape', colour: 'amber', mood: 'calm', label: 'Ringinglow',
      site: 'Ringinglow — the Round House and the road out over the moor to the edges of the Peak', tags: ['moor', 'peak', 'toll house', 'drystone walls', 'sheep', 'cyclists'] },
  ];
  const items = [];
  for (const v of views) {
    const fn = fns[v.n], V = SCENE_SHP_VIEWS['v' + v.n];
    if (typeof fn !== 'function' || !V) continue;
    let data = null;
    const cam = V.camera;
    items.push(sceneItem({
      id: `${COUNTY}-sheffield-parks-${v.n}`, label: v.label + ', ' + TOWN, site: v.site,
      colour: v.colour, mood: v.mood, intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'sheffield'].concat(v.tags),
      county: COUNTY, ukRegion: region, ukKind: v.kind, signature: false, ukPart: 'sheffield-parks',
      ukPlace: v.place, ukLocality: v.locality, ukTown: TOWN, ukView: v.view,
      liveSky: { lat: cam.lat, lon: cam.lon }, when,
    }, () => data || (data = fn())));
  }
  return items;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneUkSheffieldParksItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-sheffield-parks', name: 'UK: Sheffield parks', version: '1.0.0',
    description: 'Sheffield\'s parks, hand-composed on the scene engine v2 from four real viewpoints: the Botanical Gardens\' glass pavilions, the Porter Brook\'s stepping stones in Endcliffe Park, Weston Park with the museum and Firth Court, and the Round House at Ringinglow on the edge of the Peak; in every season with the live sky. Plays only in South Yorkshire or near Sheffield.', items });
})();
