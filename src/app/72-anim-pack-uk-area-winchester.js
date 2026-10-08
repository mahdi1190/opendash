/* ============================================================
   ANIMATION PACK "uk-area-winchester": the Winchester area as composed scenes
   (docs/dev/SCENE_ENGINE.md 3 and 8): Winchester, Chawton, the Test and the
   Itchen, the Watercress Line and the South Downs. PURE classic script.
   The scenes are data rows (71-scene-uk-winchester-1.js) built by the
   chalk-country archetype (71-scene-uk-winchester-0arch.js) from the library
   (70-scene-lib-area-winchester.js and the shared kits). Each scene is ONE
   auto-season composed scene: the date picks the season, the live sky the light.
   Every item is a normal Hampshire county item of the UK South East region
   (the same fields and when() as 72-anim-pack-uk-south-east.js), so the
   opening, the gallery, pins and the rotation treat it like the rest. Six ids
   are the ones the older hand-drawn items used (hampshire-winchester-cathedral,
   -watercress-line, -chalk-stream-trout, -south-downs-dawn, -chawton,
   -watercress-beds): the integrator removes those old versions.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const county = 'hampshire', REGION = 'south-east', NATION = 'GB-ENG', NAME = 'Hampshire';
  const items = sceneItems('uk-area-winchester').map(it => {
    const kind = it.ukKind || 'landscape';
    return Object.assign(it, {
      mood: it.mood || 'calm', intensity: it.intensity || 'subtle', region: [NATION], priority: 1,
      county, ukRegion: REGION, ukKind: kind, signature: false, ukArea: 'winchester',
      label: it.label + ', ' + NAME,
      tags: ['uk', REGION.replace(/-/g, ' '), NAME.toLowerCase(), kind].concat(it.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && ctx.county === county,
    });
  });
  animRegisterPack({ id: 'uk-area-winchester', name: 'UK: Winchester and the chalk country', version: '1.0.0',
    description: 'Composed, living scenes around Winchester: the cathedral and the City Mill, the Test and the Itchen, Chawton, the Watercress Line and the South Downs, in four seasons under the live sky.', items });
})();
