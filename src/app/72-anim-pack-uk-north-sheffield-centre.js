/* ============================================================
   ANIMATION PACK "uk-north-sheffield-centre": Sheffield city centre, four views hand-composed on the scene engine v2
   (71-scene-uk-north-sheffield-centre.js; ground plans and own objects in 70-scene-lib-sheffield-centre.js).
     wide     the Peace Gardens: the Holberry Cascades, the Goodwin Fountain and the Town Hall
     close    Millennium Square and the Winter Garden, St Paul's Tower beside it
     station  Sheaf Square: the Cutting Edge, the station and Park Hill on its hill
     evening  a Park Hill deck: the Supertram on the hillside, the city and the western hills
   Each item is all-season with the live sky (the date picks the season, the real sun the light). Each scene is a THUNK,
   built only when it is shown or linted. Plays only in South Yorkshire or near Sheffield. Self-contained: registers itself.
   ============================================================ */
function sceneUkNorthSheffieldCentreItems() {
  if (typeof sceneItem !== 'function' || typeof sceneUkNorthSheffieldCentreV1 !== 'function') return [];
  const COUNTY = 'south-yorkshire', NAME = 'South Yorkshire', NATION = 'GB-ENG', TOWN = 'Sheffield', PLACE = 'sheffield-centre';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'yorkshire';
  const when = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: TOWN }], ctx).nearby.length > 0));
  const views = [
    { n: 1, fn: sceneUkNorthSheffieldCentreV1, view: 'wide', colour: 'green', label: 'Peace Gardens, Sheffield', site: 'The Peace Gardens: the cascades lead to the Goodwin Fountain and the Town Hall', tags: ['fountain', 'gardens', 'town hall', 'square'] },
    { n: 2, fn: sceneUkNorthSheffieldCentreV2, view: 'close', colour: 'teal', label: 'Winter Garden, Sheffield', site: "Millennium Square: the Winter Garden's glass and larch, St Paul's Tower beside it", tags: ['glasshouse', 'square', 'tower'] },
    { n: 3, fn: sceneUkNorthSheffieldCentreV3, view: 'station', colour: 'blue', label: 'Sheaf Square, Sheffield', site: 'Sheaf Square: the Cutting Edge runs down to the station, Park Hill on the hill above', tags: ['station', 'sculpture', 'steel', 'tram'] },
    { n: 4, fn: sceneUkNorthSheffieldCentreV4, view: 'evening', colour: 'amber', label: 'Park Hill, Sheffield', site: 'From a Park Hill deck: the Supertram climbs the hill, the city and its western hills beyond', tags: ['tram', 'skyline', 'hills', 'brutalist'] },
  ];
  return views.map(V => {
    let data = null;
    const meta = {
      id: `${COUNTY}-${PLACE}-${V.n}`, label: V.label, site: V.site,
      colour: V.colour, mood: 'cheerful', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'sheffield', 'city', 'townscape'].concat(V.tags),
      county: COUNTY, ukRegion: region, ukKind: 'city', signature: V.n === 1, ukPart: 'uk-north-' + PLACE,
      ukPlace: PLACE, ukLocality: TOWN, ukTown: TOWN, ukView: V.view, viewReason: V.site,
      liveSky: { lat: 53.38, lon: -1.468 },
      when,
    };
    return sceneItem(meta, () => data || (data = V.fn()));
  });
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneUkNorthSheffieldCentreItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-sheffield-centre', name: 'UK: Sheffield city centre', version: '1.0.0',
    description: 'Sheffield city centre in four views hand-composed on the scene engine v2: the Peace Gardens and the Town Hall, the Winter Garden, Sheaf Square with the Cutting Edge and the station, and the city from a Park Hill deck, in every season with the live sky. Plays only in South Yorkshire or near Sheffield.', items });
})();
