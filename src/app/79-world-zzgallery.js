/* ============================================================
   WORLD ENGINE (v3): the test scenes, visible in the Animations gallery ONLY.
   The user asked (14 Oct) to see the v3 test scenes in the gallery before they pass review. They are registered
   as the pack 'world-preview' with when() always false and priority 0, so they never play in the daily
   rotation, the splash or the Home card. They can only be opened from the gallery, where they are grouped
   under their place with "(world)" in the label. Loads after 79-world-zscene-*.js, which register into _scPacks['world-test'].
   ============================================================ */
(function () {
  if (typeof animRegisterPack !== 'function' || typeof _scPacks !== 'object' || !_scPacks) return;
  const src = (_scPacks['world-test'] || []).filter(it => it && it.id);
  if (!src.length) return;
  // group each under its real place, next to its v2 views (the gallery's "all versions at this location")
  const PLACE = { 'fleet-canal-2-w3': ['fleet-canal', 'hampshire', 'Fleet'], 'fleet-pond-2-w3': ['fleet-pond', 'hampshire', 'Fleet'],
    'sheffield-kelham-1-w3': ['kelham-island', 'south-yorkshire', 'Sheffield'] };
  const items = src.map(it => Object.assign({}, it, PLACE[it.id] ? { ukPlace: PLACE[it.id][0], county: PLACE[it.id][1], ukTown: PLACE[it.id][2], ukView: 'world-engine' } : {}, {
    label: /\(world\)/.test(String(it.label || '')) ? it.label : String(it.label || it.id) + ' (world)',
    tags: (Array.isArray(it.tags) ? it.tags : []).concat(['world-engine', 'preview']),
    mood: ['calm', 'cheerful', 'proud', 'cosy', 'focused', 'dreamy', 'energetic', 'neutral'].includes(it.mood) ? it.mood : 'neutral',
    colour: typeof ANIM_SWATCHES === 'object' && ANIM_SWATCHES.includes(it.colour) ? it.colour : 'slate',
    priority: 0,
    when: () => false,   // gallery only: never chosen for the day
  }));
  try {
    animRegisterPack({ id: 'world-preview', name: 'World engine preview (gallery only)', version: '0.1.0',
      description: 'Test scenes on the new world engine (format v3), shown in the gallery for review. They never play in the rotation.',
      items });
  } catch (e) { /* a preview must never break the app */ }
})();
