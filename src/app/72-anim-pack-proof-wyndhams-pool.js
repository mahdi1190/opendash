/* ============================================================
   ANIMATION PACK "proof-wyndhams-pool": Wyndham's Pool on Yateley Common at dusk, composed by hand on the scene engine v2
   (71-scene-proof-wyndhams-pool.js; its own objects in 70-scene-lib-proof-wyndhams-pool.js). One item with the fields
   of the Yateley area items (72-anim-pack-uk-area-yateley.js): county-prefixed id, label, site, ukPlace, ukView, the
   live sky. The scene keeps season 'auto', so it draws the date's season by itself. It plays only in its county or near
   Yateley, like the area pack. The scene is a THUNK: built only when it is shown or linted.
   ============================================================ */
function ukProofWyndhamsPoolItems() {
  if (typeof sceneItem !== 'function' || typeof sceneProofWyndhamsPool !== 'function') return [];
  const COUNTY = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  const label = "Wyndham's Pool", reason = 'a wooded heathland pond on Yateley Common, ringed by Scots pine and birch, at dusk';
  const meta = {
    id: `${COUNTY}-wyndhams-pool-dusk`, label: label + ', ' + NAME, site: `${label} — ${reason}`,
    colour: 'amber', mood: 'dreamy', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
    tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'landscape', 'pond', 'woodland', 'reeds', 'scots pine', 'heron', 'kingfisher', 'dusk'],
    county: COUNTY, ukRegion: region, ukKind: 'landscape', signature: false, ukPart: 'proof-wyndhams-pool',
    ukPlace: 'wyndhams-pool', ukLocality: 'Yateley', ukTown: 'Yateley', ukView: 'dusk-across-the-pool', viewReason: reason,
    liveSky: { lat: 51.3316, lon: -0.8221 },
    when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: 'Yateley' }], ctx).nearby.length > 0)),
  };
  let data = null;
  const it = sceneItem(meta, () => data || (data = sceneProofWyndhamsPool()));
  it.recipeV = 2;
  return [it];
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = ukProofWyndhamsPoolItems();
  if (!items.length) return;
  animRegisterPack({ id: 'proof-wyndhams-pool', name: "UK: Wyndham's Pool at dusk", version: '1.0.0',
    description: "Wyndham's Pool on Yateley Common at dusk, composed by hand on the scene engine v2: a heron stalking the shallows, a kingfisher's dive, swallows, bats and mist on the water, with the live sky. Plays only in its county or near Yateley.", items });
})();
