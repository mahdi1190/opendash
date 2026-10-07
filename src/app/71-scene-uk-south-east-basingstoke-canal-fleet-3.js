/* COMPOSED SCENE: Basingstoke Canal at Fleet, view 3 of 4 (the wooded towpath, ukView 'autumn'): on the
   towpath between Fleet and Crookham, the canal on the right, looking south-west (heading 215) through a
   tunnel of mature oak, alder and willow to a low brick arch road bridge (Crookham Road style) closing the
   reach; narrowboats moored along the offside under the trees, walkers, a family and a cyclist on the towpath.
   Built by sceneCanalView (71-scene-uk-south-east-basingstoke-canal-fleet-0.js); registered as the items of
   72-anim-pack-uk-south-east-basingstoke-canal-fleet-v3.js (same ids, place and view fields). */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneCanalView !== 'function') return;   // the engine core is not in this build
  sceneAdd('uk-south-east', { id: 'fleet-canal-3', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'woodland'], liveSky: { lat: 51.28, lon: -0.84 } }, () => sceneCanalView({
    id: 'fleet-canal-3', lat: 51.28, lon: -0.84, heading: 215, at: 'afternoon',
    F: 900, h: 1.6, hor: 525, vx: 760, side: 1, eyeX: -0.1, zMax: 700, bend: 0.0018, bendFrom: 95, seed: 3,
    bands: [3, 14, 36, 100, 240, 700], tall: 18, sMax: 2.4,
    bridge: { z: 72, v: 0 },
    towTrees: { 'tree.bank-oak': 4, 'tree.bank-birch': 2, 'tree.bank-alder': 1 },
    offTrees: { 'tree.bank-oak': 3, 'tree.bank-alder': 2, 'tree.bank-willow': 1 },
    trees: [['tree.bank-oak', -5.2, 9, 17, 'sway'], ['tree.bank-birch', -4.2, 20, 13, 'sway'], ['tree.bank-oak', 18.5, 30, 15], ['tree.bank-alder', 17, 44, 13], ['tree.bank-willow', 16.9, 58, 10], ['tree.bank-oak', -4.6, 46, 15]],
    boats: [{ off: true, z: 16, g: 3, l: 0 }, { off: true, z: 38, g: 4, l: 1, anim: false }, { off: true, z: 92, g: 4, l: 2, anim: false }],
    birds: [['bird.mallard', 6, 15, 0], ['bird.mallard', 6.8, 16, 1], ['bird.moorhen', 3, 24, 0], ['bird.coot', 9, 28, 0, true], ['bird.heron', 15.2, 64, 0, true]],
    swans: [7, 40, 60],
    folk: [['person.dog-walker', 0.2, 9, 22, 0, 5], ['person.cyclist', -0.3, 20, 60, 1, 14], ['person.walker', 0, 36, 64, 2, 4]],
  }));
})();
