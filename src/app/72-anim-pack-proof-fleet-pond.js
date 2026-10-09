/* ============================================================
   ANIMATION PACK "proof-fleet-pond": Fleet Pond, Hampshire, hand-composed on the scene engine v2
   (71-scene-proof-fleet-pond.js; its ground plan and render pass in 70-scene-lib-proof-fleet-pond.js).
   One all-season item with the live sky: the scene follows the date's season, the real sun and the weather.
   The scene is a THUNK, built only when it is shown or linted; building it also registers the scene's own
   render pass (the render-pass registry loads after the 72 files). Plays only in its county or near Fleet.
   ============================================================ */
function sceneProofFleetPondItems() {
  if (typeof sceneItem !== 'function' || typeof sceneProofFleetPondData !== 'function') return [];
  const COUNTY = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  const P = SCENE_PROOF_FLEET_POND.camera;
  let data = null;
  const meta = {
    id: `${COUNTY}-fleet-pond-proof`, label: 'Fleet Pond, ' + NAME, site: 'Fleet Pond — a heron hunts the reed edge as a train crosses the embankment',
    colour: 'green', mood: 'calm', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
    tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'landscape', 'lake', 'reedbed', 'boardwalk', 'heron', 'railway', 'nature reserve'],
    county: COUNTY, ukRegion: region, ukKind: 'landscape', signature: false, ukPart: 'proof-fleet-pond',
    ukPlace: 'fleet-pond', ukLocality: 'Fleet', ukTown: 'Fleet', ukView: 'boardwalk',
    liveSky: { lat: P.lat, lon: P.lon },
    when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: 'Fleet' }], ctx).nearby.length > 0)),
  };
  const it = sceneItem(meta, () => {
    if (typeof sceneProofFleetPondPass === 'function') sceneProofFleetPondPass();
    return data || (data = sceneProofFleetPondData());
  });
  return [it];
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneProofFleetPondItems();
  if (!items.length) return;
  // define the scene's render pass once every script has loaded (the registry, 78-scene-0pass.js, loads after this file)
  if (typeof window !== 'undefined' && typeof sceneProofFleetPondPass === 'function') {
    setTimeout(sceneProofFleetPondPass, 0);
    if (typeof window.addEventListener === 'function') window.addEventListener('load', () => sceneProofFleetPondPass());
  }
  animRegisterPack({ id: 'proof-fleet-pond', name: 'UK: Fleet Pond (proof)', version: '1.0.0',
    description: 'Fleet Pond nature reserve from the reedbed boardwalk, hand-composed on the scene engine v2: the heron\'s hunt, a kingfisher, courting grebes, swans and the trains on the embankment, in every season with the live sky. Plays only in its county or near Fleet.', items });
})();
