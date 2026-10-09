/* COMPOSED SCENE: Basingstoke Canal at Fleet, view 1 of 4 (wide): from the parapet of Reading Road
   bridge, looking west-south-west (heading 240) straight down the cut: moored boats at the wharf below
   on the left, garden fences, houses and boats on the offside, the towpath with walkers and a cyclist,
   and the next brick bridge far down the reach. Built by sceneCanalView
   (71-scene-uk-south-east-basingstoke-canal-fleet-0.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalView !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-1', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'narrowboat'], liveSky: { lat: 51.28, lon: -0.84 } }, () => sceneCanalView({
    id: 'fleet-canal-1', lat: 51.28, lon: -0.84, heading: 240, at: 'afternoon',
    F: 950, h: 5.4, hor: 430, vx: 820, side: 1, eyeX: 8.2, zMax: 800, bend: 0.0011, bendFrom: 110, seed: 1,
    bands: [9, 22, 50, 120, 280, 800], parapet: true, treeTint: false,
    bridge: { z: 150, v: 0 },
    houses: [[23, 40, 9, 0, 'mid'], [24, 56, 9, 0, 'mid'], [28, 92, 8, 0, 'mid'], [27, 118, 10, 0, 'mid']], rocks: false, foreN: [150, 100],
    towTrees: { 'tree.bank-oak': 4, 'tree.bank-alder': 2 },
    offTrees: { 'tree.bank-willow': 3, 'tree.bank-alder': 3, 'tree.bank-oak': 1 },
    trees: [['tree.bank-oak', -4.8, 25, 16], ['tree.bank-oak', -9, 24, 15], ['tree.bank-alder', -6.5, 30, 16], ['tree.bank-alder', -4.3, 34, 15],
      ['tree.bank-oak', -13, 27, 16], ['tree.bank-willow', 17.4, 30, 11], ['tree.bank-alder', 17, 44, 13], ['tree.bank-willow', 17.6, 40, 10]],
    boats: [{ z: 13, g: 0, l: 1, anim: false }, { z: 35, g: 1, l: 0 }, { off: true, z: 58, g: 1, l: 2 }, { off: true, z: 82, g: 1, l: 0 }, { z: 112, g: 1, l: 0, x: 3.6 }],
    birds: [['bird.mallard', 5, 26, 0], ['bird.mallard', 5.6, 27, 1], ['bird.moorhen', 13.2, 30, 0, true], ['bird.coot', 10, 22, 0], ['bird.mallard', 11, 19, 1, true], ['bird.moorhen', 3.2, 48, 0]],
    swans: [7.6, 40, 60],
    folk: [['person.dog-walker', -0.3, 30, 70, 0, 7], ['person.cyclist', 0.4, 34, 110, 1, 16], ['person.jogger', -0.4, 48, 120, 2, 11], ['person.walker', 0.2, 70, 140, 1, 5]],
  }));
})();
