/* COMPOSED SCENE (v2, redrawn): Basingstoke Canal at Fleet, view 4 of 4 (evening): a long lens from the towpath's water
   edge near Pondtail, west-south-west (heading 250) into the low sun: Pondtail Bridge's brick arch with the towpath under it
   and its full ring of reflection, boats moored below the back gardens of Fleet, lit windows at real dusk, swans.
   REDRAWN on the scene engine v2 (a curving cut seen at an angle, boats and bridges drawn in the camera's perspective): built by sceneCanalViewV2 (70-scene-lib-canal-views.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v4.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalViewV2 !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-4', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'dreamy', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'evening'], liveSky: { lat: 51.29, lon: -0.83 } }, () => sceneCanalViewV2('fleet-canal-4'));
})();
