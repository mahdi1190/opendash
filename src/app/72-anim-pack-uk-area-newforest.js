/* ============================================================
   PACK uk-area-newforest: the New Forest, Hampshire (composed scenes).
   Lyndhurst, Brockenhurst, Beaulieu and Buckler's Hard, Bolderwood, the
   heaths and ponds, Lymington, Keyhaven and Hurst Castle. Every scene is
   COMPOSED (docs/dev/SCENE_ENGINE.md section 3): library objects placed by
   the 'newforest' archetype (71-scene-uk-newforest-0.js) plus each scene's
   own touches (71-scene-uk-newforest-1..N.js), drawn by the canvas renderer
   on the live sky, four seasons from the date.
   Registration follows the UK county packs (72-anim-pack-uk-south-east.js):
   the item id is '<county>-<id>', the label ends with the county, the tags
   start with uk / region / county / kind, and the item plays only in its own
   county (or near its ukTown). The rebuilt items keep their old ids, places
   and views, so saved pins and the rotation keep working.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const NAMES = { hampshire: 'Hampshire' };
  const items = [];
  for (const o of sceneItems('uk-area-newforest')) {
    const county = o.county || 'hampshire', kind = o.ukKind || 'landscape', months = o.months || null;
    const region = typeof ukCounty === 'function' && ukCounty(county) ? ukCounty(county).region : 'south-east';
    items.push(Object.assign({
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', region: ['GB-ENG'], reduced: 'static', priority: 1, full: true,
      county, ukRegion: region, ukKind: kind, signature: kind === 'signature', site: o.label,
    }, o, {
      id: county + '-' + o.id,
      label: o.label + ', ' + NAMES[county],
      tags: ['uk', region.replace(/-/g, ' '), NAMES[county].toLowerCase(), kind].concat(o.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && (!months || months.includes(+String(day).slice(5, 7))) && (!o.ukSeason || o.ukSeason === animSeasonOf(day)) && (ctx.county === county || (!!o.ukTown && typeof animUkScenePools === 'function' && animUkScenePools([{ county, ukTown: o.ukTown }], ctx).nearby.length > 0)),
    }));
  }
  animRegisterPack({ id: 'uk-area-newforest', movedFrom: ['uk-south-east'], name: 'UK: the New Forest', version: '1.0.0',
    description: 'Composed scenes of the New Forest, Hampshire: ponies on the heath, Lyndhurst, Brockenhurst, Beaulieu and Buckler\'s Hard, the ancient woods, Lymington and Hurst Castle, on the live sky through the four seasons.', items });
})();
