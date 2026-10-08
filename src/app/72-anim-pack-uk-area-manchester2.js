/* UK: Manchester, second batch (area pack). Composed scenes on the scene engine: Piccadilly Gardens
   and its trams, the Cathedral and the Corn Exchange, the Chinatown arch, Canal Street, New Islington
   marina and the Ancoats mills, rain on red brick, Spinningfields, match days at Eastlands and Old
   Trafford, MediaCity at night and the Lowry, Heaton Park, Oxford Road and Fallowfield, Market Street
   and the Science and Industry Museum.
   The rows are in 71-scene-uk-manchester2-0.js (UK_MANCHESTER2_SCENES), built by the 'mcr2-city'
   archetype (70-scene-lib-area-manchester2.js, on top of the first batch's 'mcr-city'). Each scene
   follows the season by date and the live sky. Registered like the first Manchester batch: one item
   per view, the place fields of the UK packs (with the view's own lat / lon, so nearby towns in the
   county pick them up), and the scene built lazily. */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof sceneItem !== 'function' || typeof sceneFromArchetype !== 'function'
    || typeof UK_MANCHESTER2_SCENES === 'undefined' || typeof ukCounty !== 'function' || !ukCounty('greater-manchester')) return;
  if (typeof sceneArchetype === 'function' && !sceneArchetype('mcr2-city')) return;
  const county = 'greater-manchester', area = ukCounty(county);
  const items = UK_MANCHESTER2_SCENES.map(row => {
    const kind = row.kind, town = row.town || 'Manchester', P = row.params;
    const o = { id: row.id, ukPlace: row.ukPlace, ukTown: town, ukLat: P.lat, ukLon: P.lon };
    const meta = {
      id: county + '-' + row.id, label: row.label, site: row.label + ' — ' + row.reason, colour: row.colour,
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'manchester2-area',
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(row.tags),
      ukPlace: row.ukPlace, ukTown: town, ukLocality: town, ukLat: P.lat, ukLon: P.lon, ukView: row.ukView, viewReason: row.reason,
      liveSky: { lat: P.lat, lon: P.lon },
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || animUkScenePools([Object.assign({ county }, o)], ctx).nearby.length > 0),
    };
    return sceneItem(meta, () => sceneFromArchetype('mcr2-city', P, row.patch || {}));
  });
  animRegisterPack({ id: 'uk-area-manchester2', name: 'UK: Manchester (more)', version: '1.0.0',
    description: 'More of Manchester and Salford on the scene engine: Piccadilly and its trams, the Cathedral, Chinatown, Canal Street, Ancoats, match days, the Quays at night, Heaton Park and student life, with the seasons and the live sky.', items });
})();
