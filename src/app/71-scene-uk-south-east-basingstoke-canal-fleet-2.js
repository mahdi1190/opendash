/* COMPOSED SCENE (v2, redrawn): Basingstoke Canal at Fleet, view 2 of 4 (close): on the towpath by the moorings near
   Pondtail, the cut on the left sweeping away to the right: a narrowboat moored close alongside with its stove smoking, more
   boats nose to tail beyond, purple loosestrife and meadowsweet framing the towpath, a heron in the offside margin, mallards
   and their brood, a swan pair, a willow curtain top left.
   REDRAWN on the scene engine v2 (a curving cut seen at an angle, boats and bridges drawn in the camera's perspective): built by sceneCanalViewV2 (70-scene-lib-canal-views.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v2.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalViewV2 !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-2', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'narrowboat'], liveSky: { lat: 51.279, lon: -0.836 } }, () => sceneCanalViewV2('fleet-canal-2'));
})();
