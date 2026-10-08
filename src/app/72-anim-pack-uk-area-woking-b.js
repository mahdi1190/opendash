/* ============================================================
   PACK uk-area-woking-b: the second batch of composed Woking scenes (docs/dev/SCENE_ENGINE.md section 3).
   Seven scenes, each a different real place in and around Woking: Commercial Way, the Kingfield
   match-day car park, Old Woking church, the Brookwood cemetery station platform, a lock on the
   Basingstoke Canal, the river Wey at Byfleet and Hook Heath. Scenes come from
   71-scene-uk-woking-b-scenes.js; objects from 70-scene-lib-area-woking-b.js and the shared library.
   Each item is a normal registry item (sceneItem) with the UK place fields, so county detection, nearby
   pools, pins and the rotation work; the season comes from the date and the light from the live sky.
   Plays in Surrey, or near Woking.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const COUNTY = 'surrey';
  const area = typeof ukCounty === 'function' ? ukCounty(COUNTY) : null;
  if (!area) return;
  const items = sceneItems('uk-area-woking-b').map((it) => {
    const kind = it.ukKind || 'landmark', town = it.town || 'Woking';
    const base = { county: COUNTY, ukTown: town, ukLocality: town, ukPlace: it.ukPlace || it.id, ukView: it.ukView || 'wide', viewReason: it.viewReason || it.site };
    return Object.assign(it, base, {
      id: COUNTY + '-' + it.id, intensity: 'subtle', priority: 1, region: [area.nation], ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'area-woking-b',
      tags: Array.from(new Set(['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(it.tags || []))),
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([Object.assign({ county: COUNTY }, base)], ctx).nearby.length > 0)),
    });
  });
  animRegisterPack({ id: 'uk-area-woking-b', name: 'UK: Woking (2)', version: '1.0.0', css: '',
    description: 'Composed Woking scenes, second batch: Commercial Way, the Kingfield floodlights, Old Woking church, the Brookwood cemetery station, a Basingstoke Canal lock, the Wey at Byfleet and Hook Heath, with the live sky and four seasons.', items });
})();
