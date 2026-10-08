/* ============================================================
   ANIMATION PACK "uk-area-hook": Hook and the canal country round it, composed
   on the scene engine (docs/dev/SCENE_ENGINE.md 3 and 8). PURE classic script.
   Hook high street and station, the Basingstoke Canal at North Warnborough and
   Greywell (Odiham Castle, the Greywell Tunnel and its bats), the River
   Whitewater and the fields and woods round Hook. The scenes are data rows
   (71-scene-uk-hook-scenes.js) built by the hook-country archetype
   (70-scene-lib-area-hook.js). Each scene is ONE auto-season composed scene:
   the date picks the season (all four), the live sky the light.
   Every item is a normal Hampshire county item of the UK South East region; it
   plays in Hampshire or within reach of Hook (the town list's Hook anchor).
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const county = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG', TOWN = 'Hook';
  const region = typeof ukCounty === 'function' && ukCounty(county) ? ukCounty(county).region : 'south-east';
  const near = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || (typeof animUkScenePools === 'function' && animUkScenePools([{ county, ukTown: TOWN }], ctx).nearby.length > 0));
  const items = sceneItems('uk-area-hook').map(it => {
    const kind = it.ukKind || 'landscape';
    return Object.assign(it, {
      mood: it.mood || 'calm', intensity: it.intensity || 'subtle', region: [NATION], priority: 1, theme: 'any',
      county, ukRegion: region, ukKind: kind, signature: false, ukArea: 'hook', ukPart: 'area-hook',
      ukLocality: TOWN, ukTown: TOWN, liveSky: { lat: it.lat, lon: it.lon },
      label: it.label + ', ' + NAME,
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), kind].concat(it.tags || []),
      when: near,
    });
  });
  if (!items.length) return;
  animRegisterPack({ id: 'uk-area-hook', name: 'UK: Hook and the Greywell canal', version: '1.0.0',
    description: 'Composed, living scenes round Hook: the high street and the station on the main line, the Basingstoke Canal by Odiham Castle and North Warnborough, the Greywell Tunnel and its bats, the River Whitewater, and the fields and woods, in four seasons under the live sky. Plays in Hampshire or near Hook.', items });
})();
