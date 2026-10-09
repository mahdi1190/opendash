/* ============================================================
   PACK paint-fleet-canal: a painted scene (docs/dev/PAINTED_SCENES.md; the scene is 71-scene-paint-fleet-canal.js). In the gallery; set the
   items' when (see 72-anim-pack-proof-yateley-green.js) to put it in the daily rotation for its place.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function' || !sceneItems("paint-fleet-canal").length) return;
  const COUNTY = 'hampshire', TOWN = 'Fleet';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  const items = sceneItems('paint-fleet-canal').map(it => Object.assign(it, {
    label: 'Basingstoke Canal at Fleet', site: 'Fleet towpath, looking west towards Reading Road bridge',
    colour: 'green', mood: 'calm', intensity: 'standard', priority: 1, theme: 'any', region: ['GB-ENG'],
    tags: ['uk', region.replace(/-/g, ' '), 'hampshire', 'fleet', 'canal', 'landscape', 'painted'],
    county: COUNTY, ukRegion: region, ukKind: 'landscape', signature: false,
    ukPart: 'paint-fleet-canal', ukPlace: 'fleet-canal', ukLocality: TOWN, ukTown: TOWN, ukView: 'painted',
    when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY ||
      (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: TOWN }], ctx).nearby.length > 0))
  }));
  animRegisterPack({ id: 'paint-fleet-canal', name: 'UK: Fleet canal (painted)', description: 'Basingstoke Canal at Fleet: five aligned seasonal and night paintings with live canal life.', version: '1.0.0', items });
})();
