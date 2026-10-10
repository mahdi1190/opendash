/* ============================================================
   ANIMATION PACK "uk-north-manchester-quays-nq": Manchester and Salford, four views hand-composed on the scene engine v2
   (71-scene-uk-north-manchester-quays-nq.js; cameras and perspective landmarks in 70-scene-lib-manchester-quays-nq.js).
     1 Salford Quays: the Lowry's promenade, the lift bridge and IWM North across the Ship Canal
     2 MediaCityUK: the piazza by the Metrolink stop, the swing footbridge's white pylon, IWM North over the water
     3 the Northern Quarter: Stevenson Square, the painted kiosk, murals, cafes and the buses round the square
     4 Ancoats: the Rochdale Canal under the Redhill Street mills, a lock, narrowboats and the towpath
   Each item is one all-season view with the live sky: the scene follows the date's season, the real sun and the weather.
   The scenes are THUNKS, built only when shown or linted. Plays only in Greater Manchester or near Manchester and Salford.
   ============================================================ */
function sceneMqnPackItems() {
  if (typeof sceneItem !== 'function' || typeof sceneUkMqnV1 !== 'function') return [];
  const COUNTY = 'greater-manchester', NAME = 'Greater Manchester', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'north-west';
  const near = (town) => (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: town }], ctx).nearby.length > 0));
  const views = [
    { fn: 'sceneUkMqnV1', id: 'salford-quays-lowry', label: 'Salford Quays', town: 'Salford', place: 'salford-quays', view: 'promenade', colour: 'blue', mood: 'calm',
      site: 'Salford Quays — the Lowry, its lift bridge and IWM North across the Ship Canal', tags: ['waterfront', 'quays', 'arts centre', 'museum', 'bridge'] },
    { fn: 'sceneUkMqnV2', id: 'mediacity-piazza', label: 'MediaCityUK', town: 'Salford', place: 'salford-quays', view: 'piazza', colour: 'blue', mood: 'energetic',
      site: 'MediaCityUK — a Metrolink tram at the piazza stop, the swing footbridge and IWM North over the water', tags: ['waterfront', 'tram', 'metrolink', 'piazza', 'bridge'] },
    { fn: 'sceneUkMqnV3', id: 'stevenson-square', label: 'Stevenson Square', town: 'Manchester', place: 'northern-quarter', view: 'square', colour: 'amber', mood: 'energetic',
      site: 'The Northern Quarter — Stevenson Square, its painted kiosk, murals, cafes and buses', tags: ['city', 'street art', 'cafe', 'square', 'bus', 'cycling'] },
    { fn: 'sceneUkMqnV4', id: 'ancoats-canal', label: 'Ancoats', town: 'Manchester', place: 'ancoats', view: 'towpath', colour: 'green', mood: 'calm',
      site: 'Ancoats — the Rochdale Canal under the cotton mills of Redhill Street', tags: ['canal', 'mills', 'towpath', 'narrowboat', 'lock', 'industrial heritage'] },
  ];
  // the scene functions (each guarded: a view whose function is missing builds nothing)
  const FN = {
    sceneUkMqnV1: () => (typeof sceneUkMqnV1 === 'function' ? sceneUkMqnV1() : null),
    sceneUkMqnV2: () => (typeof sceneUkMqnV2 === 'function' ? sceneUkMqnV2() : null),
    sceneUkMqnV3: () => (typeof sceneUkMqnV3 === 'function' ? sceneUkMqnV3() : null),
    sceneUkMqnV4: () => (typeof sceneUkMqnV4 === 'function' ? sceneUkMqnV4() : null),
  };
  const HAS = { sceneUkMqnV1: typeof sceneUkMqnV1 === 'function', sceneUkMqnV2: typeof sceneUkMqnV2 === 'function', sceneUkMqnV3: typeof sceneUkMqnV3 === 'function', sceneUkMqnV4: typeof sceneUkMqnV4 === 'function' };
  const items = [];
  for (const V of views) {
    if (!HAS[V.fn]) continue;
    let data = null;
    const build = () => data || (data = FN[V.fn]());
    const cam = SCENE_MQN.cams['v' + (views.indexOf(V) + 1)];
    items.push(sceneItem({
      id: `${COUNTY}-${V.id}`, label: V.label + ', ' + NAME, site: V.site,
      colour: V.colour, mood: V.mood, intensity: 'standard', priority: 1, theme: 'any', region: [NATION],
      tags: ['uk', region.replace(/-/g, ' '), 'manchester', 'salford', 'city'].concat(V.tags),
      county: COUNTY, ukRegion: region, ukKind: 'city', signature: false, ukPart: 'manchester-quays-nq',
      ukPlace: V.place, ukLocality: V.town, ukTown: V.town, ukView: V.view,
      liveSky: { lat: cam.lat, lon: cam.lon },
      when: near(V.town),
    }, build));
  }
  return items;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneMqnPackItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-manchester-quays-nq', name: 'UK: Manchester and Salford (Quays, Northern Quarter, Ancoats)', version: '1.0.0',
    description: 'Four views of Manchester and Salford hand-composed on the scene engine v2: the Lowry and IWM North across the Ship Canal, a Metrolink tram at MediaCityUK, Stevenson Square in the Northern Quarter and the Rochdale Canal under the Ancoats mills, in every season with the live sky. Plays only in Greater Manchester or near Manchester and Salford.', items });
})();
