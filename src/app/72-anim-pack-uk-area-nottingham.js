/* UK: Nottingham (area pack). Twelve composed scenes, each a different real place: Nottingham Castle from the road
   below its rock, Ye Olde Trip to Jerusalem from Brewhouse Yard, the Old Market Square fountains and the Council House,
   the trams on Maid Marian Way, Stoney Street in the Lace Market, Hockley's shops at dusk, the deer of Wollaton Park,
   Trent Bridge from the towpath, the Wilford Suspension Bridge, the Major Oak, a pine ride in Sherwood Pines with the
   tower of Edwinstowe church, and the Goose Fair.
   The rows are in 71-scene-uk-nottingham-0.js (UK_NOTTINGHAM_SCENES); each builds its own scene data with the NOTTS kit
   (70-scene-lib-area-nottingham.js). Each scene follows the season by date and the live sky. Registered like the other UK
   area packs: one item per view, the UK place fields (each row carries its own coordinates, so the Sherwood views count
   as near Edwinstowe, and the city views as Nottingham), and each scene built lazily. */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof sceneItem !== 'function' || typeof NOTTS === 'undefined'
    || typeof UK_NOTTINGHAM_SCENES === 'undefined' || typeof ukCounty !== 'function' || !ukCounty('nottinghamshire')) return;
  const county = 'nottinghamshire', area = ukCounty(county);
  const items = UK_NOTTINGHAM_SCENES.map(row => {
    const kind = row.kind, town = row.town || 'Nottingham';
    const meta = {
      id: county + '-' + row.id, label: row.label, site: row.label + ' — ' + row.reason, colour: row.colour,
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'nottingham-area',
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(row.tags),
      ukPlace: row.ukPlace, ukTown: town, ukLocality: town, ukLat: row.lat, ukLon: row.lon, ukView: row.ukView, viewReason: row.reason,
      liveSky: { lat: row.lat, lon: row.lon },
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || animUkScenePools([{ county, ukPlace: row.ukPlace, ukTown: town, ukLat: row.lat, ukLon: row.lon }], ctx).nearby.length > 0),
    };
    return sceneItem(meta, () => row.build());
  });
  // Below the bar (the composed lint and the tile budget fail them; the batch-2 run was stopped before they were fixed):
  // drafts, kept in the source and NOT registered until they are migrated to v2 and pass (docs/dev/SCENE_ENGINE_V2.md 29,
  // "Later stages"; integration, 8 Oct). Remove an id here once its scene passes `scene lint --strict-placement`.
  const DRAFTS = new Set(["nottinghamshire-castle-rock","nottinghamshire-ye-olde-trip","nottinghamshire-maid-marian-trams","nottinghamshire-hockley-shops","nottinghamshire-wollaton-deer-park","nottinghamshire-major-oak","nottinghamshire-sherwood-pines","nottinghamshire-goose-fair"]);
  for (let k = items.length - 1; k >= 0; k--) if (DRAFTS.has(items[k].id)) items.splice(k, 1);
  animRegisterPack({ id: 'uk-area-nottingham', name: 'UK: Nottingham', version: '2.0.0',
    description: 'Nottingham and Sherwood on the scene engine: the Castle and its rock, the Trip to Jerusalem, the Old Market Square, the trams, the Lace Market, Hockley, Wollaton Park, Trent Bridge, the Wilford bridge, the Major Oak, Sherwood Pines and the Goose Fair, with the seasons and the live sky.', items });
})();
