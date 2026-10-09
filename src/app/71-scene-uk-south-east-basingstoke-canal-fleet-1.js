/* COMPOSED SCENE (v2, redrawn): Basingstoke Canal at Fleet, view 1 of 4 (wide): from the parapet of Reading Road bridge,
   looking west-south-west (heading 240) down the wharf: narrowboats moored nose to tail on the towpath side, the canal
   society's trip boat coming up the cut, swans, the back gardens and houses of Fleet on the offside, the reach bending away
   right then left between oak and willow, a willow curtain over the right of the frame.
   REDRAWN on the scene engine v2 (a curving cut seen at an angle, boats and bridges drawn in the camera's perspective): built by sceneCanalViewV2 (70-scene-lib-canal-views.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalViewV2 !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-1', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'narrowboat'], liveSky: { lat: 51.28, lon: -0.84 } }, () => sceneCanalViewV2('fleet-canal-1'));
})();
