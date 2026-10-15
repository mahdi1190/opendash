/* ============================================================
   ANIMATION PACK "uk-north-manchester-castlefield": Castlefield, Manchester, hand-composed on the scene engine v2
   (71-scene-uk-north-manchester-castlefield.js; its ground plans and in-perspective objects in
   70-scene-lib-manchester-castlefield.js). Four views of one place, each an all-season item with the live sky: the scene
   follows the date's season, the real sun and the weather. Each scene is a THUNK, built only when it is shown or linted.
   Plays only in Greater Manchester or near Manchester.
   ============================================================ */
function sceneUkNorthMcfItems() {
  if (typeof sceneItem !== 'function' || typeof sceneUkNorthMcfBasin !== 'function') return [];
  const COUNTY = 'greater-manchester', NAME = 'Greater Manchester', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'north-west';
  const place = 'manchester-castlefield', town = 'Manchester';
  const when = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: town }], ctx).nearby.length > 0));
  const VIEWS = [
    { key: 'basin', fn: sceneUkNorthMcfBasin, view: 'basin', label: 'Castlefield Basin', reason: 'Across the basin to Merchants\' Bridge, a tram crossing the viaduct',
      tags: ['canal', 'basin', 'viaduct', 'tram', 'footbridge', 'narrowboat', 'skyline'] },
    { key: 'viaducts', fn: sceneUkNorthMcfViaducts, view: 'viaducts', label: 'Castlefield viaducts', reason: 'Under the viaducts at Castlefield Junction: trams, trains and the sky park',
      tags: ['canal', 'viaduct', 'tram', 'railway', 'towpath', 'narrowboat'] },
    { key: 'warehouses', fn: sceneUkNorthMcfWarehouses, view: 'warehouses', label: 'Castlefield warehouses', reason: 'From Merchants\' Bridge up the reach to the canal warehouses',
      tags: ['canal', 'warehouse', 'narrowboat', 'wharf', 'skyline'] },
    { key: 'fort', fn: sceneUkNorthMcfFort, view: 'fort', label: 'Roman fort, Castlefield', reason: 'The reconstructed north gate of the Roman fort of Mamucium',
      tags: ['roman', 'fort', 'gate', 'park', 'viaduct', 'tram'] },
  ];
  return VIEWS.map((V) => {
    const cam = SCENE_MCF.views[V.key].camera;
    let data = null;
    return sceneItem({
      id: `${COUNTY}-castlefield-${V.key}`, label: V.label + ', ' + town, site: `Castlefield, ${town} — ${V.reason}`,
      colour: V.key === 'fort' ? 'green' : 'blue', mood: 'calm', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'manchester', 'castlefield', 'city'].concat(V.tags),
      county: COUNTY, ukRegion: region, ukKind: 'city', signature: false, ukPart: 'uk-north-manchester-castlefield',
      ukPlace: place, ukLocality: 'Castlefield', ukTown: town, ukView: V.view, viewReason: V.reason,
      liveSky: { lat: cam.lat, lon: cam.lon },
      when,
    }, () => data || (data = V.fn()));
  });
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneUkNorthMcfItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-manchester-castlefield', name: 'UK: Manchester, Castlefield', version: '1.0.0',
    description: 'Castlefield in Manchester, hand-composed on the scene engine v2 in four views: the canal basin and Merchants\' Bridge, the Victorian viaducts with trams and trains crossing, the canal warehouses from the bridge, and the Roman fort\'s north gate, in every season with the live sky. Plays only in Greater Manchester or near Manchester.', items });
})();
