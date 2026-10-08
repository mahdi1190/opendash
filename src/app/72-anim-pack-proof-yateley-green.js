/* ============================================================
   ANIMATION PACK "proof-yateley-green": the hand-composed v2 proof of
   Yateley Green (71-scene-proof-yateley-green.js; its parts in
   70-scene-lib-proof-yateley-green.js). Registered as the UK area packs are
   (72-anim-pack-uk-area-yateley.js): a county-prefixed id, the place fields,
   the live sky; it plays only in its county or near Yateley.
   ============================================================ */
function proofYateleyGreenItems() {
  if (typeof sceneItems !== 'function') return [];
  const COUNTY = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  return sceneItems('proof-yateley-green').map(it => Object.assign(it, {
    id: `${COUNTY}-proof-${it.id}`, label: 'Yateley Green, ' + NAME, site: 'Yateley Green — the pond, the oaks and St Peter\'s',
    colour: 'green', mood: 'calm', intensity: 'standard', priority: 1, theme: 'any', region: [NATION],
    tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'landscape', 'village green', 'pond', 'church', 'heron', 'ducklings', 'dog'],
    county: COUNTY, ukRegion: region, ukKind: 'landscape', signature: false, ukPart: 'proof-yateley-green',
    ukPlace: 'yateley-green', ukLocality: 'Yateley', ukTown: 'Yateley', ukView: 'proof',
    when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: 'Yateley' }], ctx).nearby.length > 0)),
  }));
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = proofYateleyGreenItems();
  if (!items.length) return;
  animRegisterPack({ id: 'proof-yateley-green', name: 'UK: Yateley Green (proof)', version: '1.0.0',
    description: 'Yateley Green composed by hand on the v2 engine: the pond, the oaks, the cottages and St Peter\'s, with a hunting heron, a mallard brood and a dog at fetch. Plays only in its county or near Yateley.', items });
})();
