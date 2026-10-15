/* COMPOSED SCENE (v2, redrawn): Basingstoke Canal at Fleet, view 3 of 4 (the wooded reach, ukView 'autumn'): from the
   reedy offside bank, the cut bending left under oak and alder to the brick arch of Malthouse Bridge, its ring mirrored in
   the still water; boats moored along the far towpath, a kingfisher on a twig over the margin, an oak bough overhead.
   REDRAWN on the scene engine v2 (a curving cut seen at an angle, boats and bridges drawn in the camera's perspective): built by sceneCanalViewV2 (70-scene-lib-canal-views.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v3.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalViewV2 !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-3', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'woodland'], liveSky: { lat: 51.28, lon: -0.84 } }, () => sceneCanalViewV2('fleet-canal-3'));
})();
