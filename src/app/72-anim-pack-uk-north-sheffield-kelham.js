/* ============================================================
   ANIMATION PACK "uk-north-sheffield-kelham": Kelham Island and the River Don, Sheffield, hand-composed on the scene engine v2
   (71-scene-uk-north-sheffield-kelham.js; objects and ground plans in 70-scene-lib-sheffield-kelham.js). Four real viewpoints,
   each an all-season item with the live sky: the scene follows the date's season, the real sun and the weather. Each scene is
   a THUNK, built only when it is shown or linted. Plays only in South Yorkshire or near Sheffield.
   ============================================================ */
function sceneUkSheffieldKelhamItems() {
  if (typeof sceneItem !== 'function' || typeof SCENE_KLM === 'undefined') return [];
  const COUNTY = 'south-yorkshire', NAME = 'South Yorkshire', NATION = 'GB-ENG', TOWN = 'Sheffield', PLACE = 'kelham-island';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'yorkshire';
  const when = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: TOWN }], ctx).nearby.length > 0));
  const views = [
    { n: 1, fn: typeof sceneUkSheffieldKelhamV1 === 'function' ? sceneUkSheffieldKelhamV1 : null, view: 'bridge', colour: 'blue', mood: 'calm', label: 'The Don from Ball Street bridge',
      site: 'The River Don from Ball Street bridge — the weir below Cornish Place, a heron on the crest', tags: ['river', 'weir', 'bridge', 'heron', 'works', 'flats'] },
    { n: 2, fn: typeof sceneUkSheffieldKelhamV2 === 'function' ? sceneUkSheffieldKelhamV2 : null, view: 'museum', colour: 'amber', mood: 'calm', label: 'The goit at Kelham Island Museum',
      site: 'The goit at Kelham Island Museum — the River Don Engine house, the Bessemer converter in the yard', tags: ['goit', 'museum', 'steel', 'bessemer converter', 'engine house', 'chimney'] },
    { n: 3, fn: typeof sceneUkSheffieldKelhamV3 === 'function' ? sceneUkSheffieldKelhamV3 : null, view: 'street', colour: 'red', mood: 'cheerful', label: 'The Fat Cat on Alma Street',
      site: 'Alma Street, Kelham Island — the Fat Cat ale house, drinkers outside, the street busy', tags: ['street', 'pub', 'ale house', 'brewery', 'traffic', 'people'] },
    { n: 4, fn: typeof sceneUkSheffieldKelhamV4 === 'function' ? sceneUkSheffieldKelhamV4 : null, view: 'gateway', colour: 'teal', mood: 'proud', label: 'The Green Lane Works gateway',
      site: 'Green Lane, Kelham Island — the Works gateway and its clock turret, cyclists and walkers', tags: ['street', 'gateway', 'clock tower', 'works', 'cycle route', 'people'] },
  ];
  const items = [];
  for (const v of views) {
    const fn = v.fn;
    if (typeof fn !== 'function') continue;
    let data = null;
    const cam = SCENE_KLM['v' + v.n].camera;
    items.push(sceneItem({
      id: `${COUNTY}-sheffield-kelham-${v.n}`, label: v.label + ', ' + TOWN, site: v.site,
      colour: v.colour, mood: v.mood, intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'sheffield', 'kelham island', 'city', 'industrial heritage'].concat(v.tags),
      county: COUNTY, ukRegion: region, ukKind: 'city', signature: false,
      ukPlace: PLACE, ukLocality: 'Kelham Island', ukTown: TOWN, ukView: v.view,
      liveSky: { lat: cam.lat, lon: cam.lon }, when,
    }, () => data || (data = fn())));
  }
  return items;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneUkSheffieldKelhamItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-sheffield-kelham', name: 'UK: Kelham Island, Sheffield', version: '1.0.0',
    description: 'Kelham Island and the River Don, Sheffield, hand-composed on the scene engine v2 from four real viewpoints: Ball Street bridge and the weir, the goit by the museum and the River Don Engine house, the Fat Cat on Alma Street, and the Green Lane Works gateway; in every season with the live sky. Plays only in South Yorkshire or near Sheffield.', items });
})();
