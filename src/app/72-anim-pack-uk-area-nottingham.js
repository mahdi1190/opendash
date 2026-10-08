/* UK: Nottingham (area pack). Composed scenes on the scene engine: Nottingham Castle on Castle Rock,
   Ye Olde Trip to Jerusalem, the Council House and the Old Market Square fountains, the trams, the
   Lace Market and Hockley, Wollaton Hall and its deer park, Trent Bridge and the Victoria Embankment,
   the Major Oak and Sherwood Forest, and the Goose Fair.
   The rows are in 71-scene-uk-nottingham-0.js (UK_NOTTINGHAM_SCENES), built by the 'notts-city'
   archetype (70-scene-lib-area-nottingham.js). Each scene follows the season by date and the live
   sky. Registered like the Manchester area pack: one item per view, the place fields of the UK
   packs (each row carries its own coordinates, so the Sherwood views count as near Edwinstowe and
   Mansfield as well as the city), and the scene built lazily. */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof sceneItem !== 'function' || typeof sceneFromArchetype !== 'function'
    || typeof UK_NOTTINGHAM_SCENES === 'undefined' || typeof ukCounty !== 'function' || !ukCounty('nottinghamshire')) return;
  if (typeof sceneArchetype === 'function' && !sceneArchetype('notts-city')) return;
  const county = 'nottinghamshire', area = ukCounty(county);
  const items = UK_NOTTINGHAM_SCENES.map(row => {
    const kind = row.kind, town = row.town || 'Nottingham';
    const o = { id: row.id, ukPlace: row.ukPlace, ukTown: town, ukLat: row.params.lat, ukLon: row.params.lon };
    const meta = {
      id: county + '-' + row.id, label: row.label, site: row.label + ' — ' + row.reason, colour: row.colour,
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'nottingham-area',
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(row.tags),
      ukPlace: row.ukPlace, ukTown: town, ukLocality: town, ukLat: row.params.lat, ukLon: row.params.lon, ukView: row.ukView, viewReason: row.reason,
      liveSky: { lat: row.params.lat, lon: row.params.lon },
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || animUkScenePools([Object.assign({ county }, o)], ctx).nearby.length > 0),
    };
    const params = row.params, patch = row.patch || {};
    return sceneItem(meta, () => sceneFromArchetype('notts-city', params, patch));
  });
  animRegisterPack({ id: 'uk-area-nottingham', name: 'UK: Nottingham', version: '1.0.0',
    description: 'Nottingham and Sherwood on the scene engine: the Castle and its rock, the Trip to Jerusalem, the Council House and the Old Market Square, the trams, the Lace Market, Wollaton Hall, the Trent, the Major Oak and the Goose Fair, with the seasons and the live sky.', items });
})();
