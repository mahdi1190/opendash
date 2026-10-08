/* ============================================================
   ANIMATION PACK "uk-area-norwich": Norwich and the Norfolk Broads as
   composed scenes (docs/dev/SCENE_ENGINE.md 3 and 8): the cathedral and the
   Close, the castle, the market, the Forum, Elm Hill, Tombland, Pull's Ferry,
   Cow Tower, a riverside match day, and windpumps and sailing boats on the
   Broads. PURE classic script. The scenes are data rows
   (71-scene-uk-norwich-1.js) built by the norwich-view archetype
   (71-scene-uk-norwich-0arch.js) from the library (70-scene-lib-area-norwich.js
   and the shared kits). Each scene is ONE auto-season composed scene: the date
   picks the season, the live sky the light. Every item is a normal Norfolk
   county item of the UK East of England region, so the opening, the gallery,
   pins and the rotation treat it like the rest.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const county = 'norfolk', REGION = 'east', NATION = 'GB-ENG', NAME = 'Norfolk';
  const items = sceneItems('uk-area-norwich').map(it => {
    const kind = it.ukKind || 'landscape';
    return Object.assign(it, {
      mood: it.mood || 'calm', intensity: it.intensity || 'subtle', region: [NATION], priority: 1,
      county, ukRegion: REGION, ukKind: kind, signature: false, ukArea: 'norwich',
      label: it.label + ', ' + NAME,
      tags: ['uk', 'east of england', NAME.toLowerCase(), kind].concat(it.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && ctx.county === county,
    });
  });
  animRegisterPack({ id: 'uk-area-norwich', name: 'UK: Norwich and the Broads', version: '1.0.0',
    description: 'Composed, living scenes of Norwich and the Norfolk Broads: the cathedral and the Close, the castle above the market, the Forum, Elm Hill and Tombland, Pull\'s Ferry and Cow Tower on the Wensum, a riverside match day, and windpumps and sails on the Broads, in four seasons under the live sky.', items });
})();
