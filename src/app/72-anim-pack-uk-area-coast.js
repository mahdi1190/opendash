/* ============================================================
   ANIMATION PACK "uk-area-coast": the Solent coast (Portsmouth, Gosport, Southsea,
   Lee-on-the-Solent, Southampton). COMPOSED scenes only (docs/dev/SCENE_ENGINE.md 3):
   the rows in 71-scene-uk-solent-scenes.js on the archetype in 71-scene-uk-solent-0arch.js,
   drawn by the canvas renderer; the season comes from the date, the light from the live sky.
   Registration follows the composed Yateley views (72-anim-pack-uk-south-east-yateley-green-v1.js):
   the same county item fields and the same opt-in rule as the uk-south-east pack (a scene plays
   only when the detected county is Hampshire, or the user's town is within reach of its town).
   Three items keep the ids, labels and captions of the hand-drawn South East items they rebuild.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const NATION = 'GB-ENG', COUNTY = 'hampshire', REGION = 'south-east';
  const found = sceneItems('uk-area-coast');
  if (!found.length) return;
  const TOWN = { Portsmouth: [50.80, -1.09], Gosport: [50.79, -1.13], Southampton: [50.90, -1.40] };
  const items = found.map(it => {
    const town = it.ukTown, ll = TOWN[town] || null;
    return Object.assign(it, {
      label: it.label + ', Hampshire', intensity: 'subtle', region: [NATION], priority: 1, county: COUNTY, ukRegion: REGION, ukKind: 'landscape', ukTown: town, ukLocality: town,
      ukLat: ll ? ll[0] : undefined, ukLon: ll ? ll[1] : undefined,
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: town }], ctx).nearby.length > 0)),
    });
  });
  animRegisterPack({ id: 'uk-area-coast', name: 'UK: the Solent coast', version: '1.0.0',
    description: 'Composed scenes of Portsmouth Harbour, the Historic Dockyard, Southsea, Gosport and Southampton\'s docks, with the live sky and the four seasons. Opt-in by county like every UK pack.', items });
})();
