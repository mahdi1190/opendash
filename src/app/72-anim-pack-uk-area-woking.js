/* ============================================================
   PACK uk-area-woking: the composed Woking scenes (docs/dev/SCENE_ENGINE.md section 3).
   The scenes are rows of the woking-view archetype (71-scene-uk-woking-0arch.js,
   71-scene-uk-woking-views.js) drawn from the library (70-scene-lib-area-woking.js and the
   shared objects): the Martian tripod, the station, the Basingstoke Canal and the Lightbox,
   the Shah Jahan Mosque, Woking Park, Victoria Square and Horsell Common.
   Each item is a normal registry item (sceneItem) with the UK place fields, so county
   detection, nearby pools, pins and the rotation work; the season comes from the date and
   the light from the live sky. Plays in Surrey, or near Woking.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const COUNTY = 'surrey', TOWN = 'Woking';
  const area = typeof ukCounty === 'function' ? ukCounty(COUNTY) : null;
  if (!area) return;
  const items = sceneItems('uk-area-woking').map((it) => {
    const kind = it.ukKind || 'landmark', base = { county: COUNTY, ukTown: TOWN, ukLocality: TOWN, ukPlace: it.ukPlace, ukView: it.ukView, viewReason: it.viewReason };
    return Object.assign(it, base, {
      id: COUNTY + '-' + it.id, intensity: 'subtle', priority: 1, region: [area.nation], ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'area-woking',
      tags: Array.from(new Set(['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(it.tags || []))),
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([Object.assign({ county: COUNTY }, base)], ctx).nearby.length > 0)),
    });
  });
  animRegisterPack({ id: 'uk-area-woking', name: 'UK: Woking', version: '1.0.0', css: '',
    description: 'Composed Woking scenes: the Martian tripod, the 1930s station, the Basingstoke Canal and the Lightbox, the Shah Jahan Mosque, Woking Park, the towers of Victoria Square and the sandpits of Horsell Common, with the live sky and four seasons.', items });
})();
