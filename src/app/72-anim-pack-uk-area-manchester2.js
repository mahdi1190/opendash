/* UK: Manchester and Salford, second batch (area pack). Composed scenes on the scene engine: Piccadilly
   Gardens, the basin and the station, the Cathedral and the Corn Exchange, the Chinatown gate, Canal
   Street, New Islington marina, Spinningfields, the Eastlands and Old Trafford match days, Heaton Park,
   Oxford Road and Fallowfield, Market Street, the Science and Industry Museum, rain on Sackville Street,
   IWM North and the Ordsall Chord on the Salford side, and the Stockport viaduct.
   The rows are in 71-scene-uk-manchester2-0.js (UK_MANCHESTER2_SCENES): each row's params go to the
   'mcr2-street' archetype (70-scene-lib-area-manchester2.js: sky, horizon, bands and water) and its
   patch holds that scene's own composition. Each scene follows the season by date and the live sky.
   Registered like the other area packs: one item per view, the place fields of the UK packs (with the
   view's own lat / lon, so nearby towns in the county pick them up), and the scene built lazily. */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof sceneItem !== 'function' || typeof sceneFromArchetype !== 'function'
    || typeof UK_MANCHESTER2_SCENES === 'undefined' || typeof ukCounty !== 'function' || !ukCounty('greater-manchester')) return;
  if (typeof sceneArchetype === 'function' && !sceneArchetype('mcr2-street')) return;
  const county = 'greater-manchester', area = ukCounty(county);
  const items = UK_MANCHESTER2_SCENES.map(row => {
    const kind = row.kind, P = row.params;
    const o = { id: row.id, ukPlace: row.ukPlace, ukTown: row.town, ukLat: P.lat, ukLon: P.lon };
    const meta = {
      id: county + '-' + row.id, label: row.label, site: row.label + ' — ' + row.reason, colour: row.colour,
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'manchester2-area',
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(row.tags),
      ukPlace: row.ukPlace, ukTown: row.town, ukLocality: row.town, ukLat: P.lat, ukLon: P.lon, ukView: row.ukView, viewReason: row.reason,
      liveSky: { lat: P.lat, lon: P.lon },
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || animUkScenePools([Object.assign({ county }, o)], ctx).nearby.length > 0),
    };
    return sceneItem(meta, () => sceneFromArchetype('mcr2-street', P, row.patch || {}));
  });
  animRegisterPack({ id: 'uk-area-manchester2', name: 'UK: Manchester (more)', version: '1.1.0',
    description: 'More of Manchester, Salford and Stockport on the scene engine: Piccadilly, the Cathedral, Chinatown, Canal Street, New Islington, match days, Heaton Park, student life, the Quays and the Chord, with the seasons and the live sky.', items });
})();
