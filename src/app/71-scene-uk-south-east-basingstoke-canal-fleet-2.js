/* COMPOSED SCENE: Basingstoke Canal at Fleet, view 2 of 4 (close): standing on the towpath, the canal on
   the left, looking south-west (heading 215) along the cut as a narrowboat chugs slowly past close
   alongside, its stove chimney smoking; boats moored nose to tail under the alders and willows of the
   offside, walkers, a jogger and a cyclist on the towpath, a brick road bridge far down the reach.
   Built by sceneCanalView (71-scene-uk-south-east-basingstoke-canal-fleet-0.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v2.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalView !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-2', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'narrowboat'], liveSky: { lat: 51.279, lon: -0.836 } }, () => sceneCanalView({
    id: 'fleet-canal-2', lat: 51.279, lon: -0.836, heading: 215, at: 'afternoon',
    F: 880, h: 1.6, hor: 515, vx: 840, side: -1, eyeX: 0.3, zMax: 700, bend: -0.0016, bendFrom: 90, seed: 2,
    bands: [3, 14, 40, 110, 260, 700], tall: 15, sMax: 2.4,
    bridge: { z: 190, v: 0 },
    towTrees: { 'tree.bank-oak': 4, 'tree.bank-birch': 1, 'tree.bank-alder': 2 },
    offTrees: { 'tree.bank-alder': 3, 'tree.bank-willow': 2, 'tree.bank-oak': 1 },
    trees: [['tree.bank-willow', 17.5, 30, 11], ['tree.bank-oak', -4.8, 22, 15], ['tree.bank-alder', 17, 48, 13], ['tree.bank-birch', -4.2, 36, 14], ['tree.bank-oak', -6.5, 15, 16]],
    boats: [{ z: 8.5, g: 2, l: 1, x: 0.9 }, { off: true, z: 30, g: 3, l: 2 }, { off: true, z: 51, g: 4, l: 0 }, { off: true, z: 72, g: 4, l: 1 }],
    birds: [['bird.mallard', 6, 44, 0], ['bird.mallard', 6.8, 46, 1], ['bird.moorhen', 12.8, 22, 0, true], ['bird.coot', 9, 58, 0], ['bird.grebe', 11, 80, 0, true]],
    swans: [9, 34, 54],
    folk: [['person.dog-walker', 0.2, 10, 24, 0, 5], ['person.cyclist', -0.4, 22, 70, 1, 14], ['person.jogger', 0.3, 45, 95, 2, 9]],
  }));
})();
