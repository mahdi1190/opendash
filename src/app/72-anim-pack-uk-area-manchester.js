/* UK: Manchester (area pack). Composed scenes on the scene engine: the Town Hall and Albert Square,
   St Peter's Square and the Metrolink, Deansgate, the Beetham Tower and the John Rylands Library,
   Castlefield's canal and viaducts, the Northern Quarter and the Ancoats mills, the Whitworth and
   Whitworth Hall on Oxford Road, MediaCity and the Lowry on Salford Quays, and a match day.
   The rows are in 71-scene-uk-manchester-0.js (UK_MANCHESTER_SCENES), built by the 'mcr-city'
   archetype (70-scene-lib-area-manchester.js). Each scene follows the season by date and the
   live sky. The first eight rows replace the Manchester items of the uk-north-west pack with the
   same ids, place fields and captions. Registered like the composed Yateley views: one item per
   view, the place fields of the UK packs, and the scene built lazily. */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof sceneItem !== 'function' || typeof sceneFromArchetype !== 'function'
    || typeof UK_MANCHESTER_SCENES === 'undefined' || typeof ukCounty !== 'function' || !ukCounty('greater-manchester')) return;
  if (typeof sceneArchetype === 'function' && !sceneArchetype('mcr-city')) return;
  const county = 'greater-manchester', area = ukCounty(county), town = 'Manchester';
  const items = UK_MANCHESTER_SCENES.map(row => {
    const kind = row.kind, o = { id: row.id, ukPlace: row.ukPlace };
    const meta = {
      id: county + '-' + row.id, label: row.label, site: row.label + ' — ' + row.reason, colour: row.colour,
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'manchester-area',
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(row.tags),
      ukPlace: row.ukPlace, ukTown: town, ukLocality: town, ukView: row.ukView, viewReason: row.reason,
      liveSky: { lat: row.params.lat, lon: row.params.lon },
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || animUkScenePools([Object.assign({ county }, o)], ctx).nearby.length > 0),
    };
    const params = row.params, patch = row.patch || {};
    return sceneItem(meta, () => sceneFromArchetype('mcr-city', params, patch));
  });
  animRegisterPack({ id: 'uk-area-manchester', movedFrom: ['uk-north-west'], name: 'UK: Manchester', version: '1.0.0',
    description: 'Manchester and Salford on the scene engine: the Town Hall, Castlefield, the Northern Quarter, Deansgate, the Quays, the Metrolink and a match day, with the seasons and the live sky.', items });
})();
