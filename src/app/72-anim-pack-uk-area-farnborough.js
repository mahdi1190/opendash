/* ============================================================
   PACK uk-area-farnborough: the composed Farnborough scenes (docs/dev/SCENE_ENGINE.md section 3).
   Eight scenes, one real place each (the list is at the top of 71-scene-uk-farnborough-scenes.js):
   the airshow, St Michael's Abbey, the FAST museum, Farnborough Main and North stations, Queensmead,
   the business park and the Basingstoke Canal. Each is a normal registry item (sceneItem) with the
   UK place fields, so county detection, nearby pools, pins and the rotation work; the season comes
   from the date and the light from the live sky. Plays in Hampshire, and near Farnborough.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const COUNTY = 'hampshire', TOWN = 'Farnborough';
  const area = typeof ukCounty === 'function' ? ukCounty(COUNTY) : null;
  if (!area) return;
  const items = sceneItems('uk-area-farnborough').map((it) => {
    const kind = it.ukKind || 'landmark', base = { county: COUNTY, ukTown: TOWN, ukLocality: TOWN, ukPlace: it.ukPlace, ukView: it.ukView, viewReason: it.viewReason };
    return Object.assign(it, base, {
      id: COUNTY + '-' + it.id, intensity: 'subtle', priority: 1, region: [area.nation], ukRegion: area.region, ukKind: kind, signature: kind === 'landmark', ukPart: 'area-farnborough',
      tags: Array.from(new Set(['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(it.tags || []))),
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([Object.assign({ county: COUNTY }, base)], ctx).nearby.length > 0)),
    });
  });
  animRegisterPack({ id: 'uk-area-farnborough', name: 'UK: Farnborough', version: '2.0.0', css: '',
    description: 'Composed Farnborough scenes, one real place each: the Airshow crowd line, St Michael\'s Abbey, the FAST museum, Farnborough Main and North stations, Queensmead, the Business Park lake and the Basingstoke Canal, with the live sky and four seasons.', items });
})();
