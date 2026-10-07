/* COMPOSED SCENE: Basingstoke Canal at Fleet, view 4 of 4 (evening): from the towpath near Pondtail, looking
   west-south-west (heading 250) along the cut into the evening sun, the old brick arch of Pondtail Bridge
   ahead with the towpath passing under it, the back gardens of Fleet running down to the offside with boats
   moored below them, lit house and cabin windows from real dusk (the live sky).
   Built by sceneCanalView (71-scene-uk-south-east-basingstoke-canal-fleet-0.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v4.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalView !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-4', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'dreamy', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'evening'], liveSky: { lat: 51.29, lon: -0.83 } }, () => sceneCanalView({
    id: 'fleet-canal-4', lat: 51.29, lon: -0.83, heading: 250, at: 'sunset',
    F: 900, h: 1.6, hor: 520, vx: 760, side: 1, eyeX: 0, zMax: 700, bend: -0.0012, bendFrom: 80, seed: 4,
    bands: [3, 14, 36, 100, 240, 700], tall: 16, sMax: 2.4,
    bridge: { z: 46, v: 0 },
    houses: [[25, 18, 9, 0], [23, 30, 8, 0], [22, 62, 9, 0, 'near'], [24, 84, 10, 0, 'near']], rocks: false,
    towTrees: { 'tree.bank-oak': 3, 'tree.bank-birch': 2 },
    offTrees: { 'tree.bank-willow': 2, 'tree.bank-oak': 1 },
    trees: [['tree.bank-oak', -4.8, 21, 15], ['tree.bank-willow', 17.5, 17, 10], ['tree.bank-birch', -4.2, 30, 14], ['tree.bank-oak', -4.4, 40, 12], ['tree.bank-oak', -6, 9, 16]],
    boats: [{ off: true, z: 9, g: 3, l: 0 }, { off: true, z: 30, g: 4, l: 1 }, { off: true, z: 62, g: 4, l: 2, anim: false }],
    birds: [['bird.mallard', 4, 13, 0], ['bird.mallard', 4.6, 14, 1], ['bird.moorhen', 3, 30, 0], ['bird.coot', 10, 26, 0, true]],
    swans: [6, 20, 34],
    folk: [['person.dog-walker', 0.2, 10, 30, 0, 5], ['person.cyclist', -0.3, 20, 60, 1, 14], ['person.jogger', 0.3, 32, 80, 2, 9]],
  }));
})();
