/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-4-w3: converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (28):
     - place[0]: landmark.mcr-john-rylands: pixel placement unprojected to [2.5, 37.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[0]: landmark landmark.mcr-john-rylands: src is a placeholder; give the listing or map reference
     - place[33]: street.mcr-tram-shelter: pixel placement unprojected to [-4.8, 7] m (was pinned perspective art: check it is a real object at this spot)
     - place[34]: street.lamppost: pixel placement unprojected to [4.6, 6.1] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mcr-palazzo, 4 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mcr-palazzo, 4 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (modern-glass, 9 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (modern-glass, 12 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[47]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[0]) by 0.277 m
     - entities[48]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[1]) by 0.277 m
     - entities[38]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[2]) by 0.277 m
     - entities[37]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[3]) by 0.277 m
     - entities[64]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[4]) by 0.277 m
     - entities[65]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[5]) by 0.277 m
     - entities[61]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[6]) by 0.277 m
     - landmarks[0]: repair: removed (overlap) landmark.mcr-john-rylands overlaps street.bollard (entities[6]) by 0.277 m
     - entities[62]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[7]) by 0.277 m
     - entities[35]: repair: removed (overlap) building.gen-direct overlaps building.gen-direct (entities[34]) by 3.4 m
     - life[0].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-manchester-centre-4-w3","label":"Deansgate, Manchester","site":"Deansgate — buses and bikes pass the John Rylands Library's red sandstone Gothic","tags":["uk","north west","greater manchester","manchester","city","civic","john rylands library","deansgate","gothic","bus","street","world-v3"],"liveSky":{"lat":53.4806,"lon":-2.2473},"mood":"energetic","colour":"red"},
{
 "v": 3,
 "place": {
  "lat": 53.4806,
  "lon": -2.2473,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.65,
  "fov": 80,
  "horizon": 680,
  "heading": 214
 },
 "surfaces": [{
   "id": "land",
   "kind": "pavement",
   "poly": [[-6.7, 6.4],
    [6.8, 6.4],
    [3146.6, 3000],
    [-3146.6, 3000]]
  },
  {
   "id": "deansgate",
   "kind": "road",
   "path": [[-52.33, -32.53],
    [-9.9, 9.9],
    [32.53, 52.33],
    [103.24, 123.04]],
   "width": 12
  },
  {
   "id": "pave-e",
   "kind": "pavement",
   "path": [[-45.97, -38.89],
    [-3.54, 3.54],
    [38.89, 45.97],
    [109.6, 116.68]],
   "width": 6
  },
  {
   "id": "pave-w",
   "kind": "pavement",
   "path": [[-58.13, -26.73],
    [-15.7, 15.7],
    [26.73, 58.13],
    [97.44, 128.84]],
   "width": 4.4
  },
  {
   "id": "xing",
   "kind": "road",
   "path": [[13.01, 23.76],
    [3.96, 32.81]],
   "width": 3.2
  }],
 "entities": [{
   "obj": "street.lamppost",
   "at": [1.84, 12.3],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [27.29, 37.76],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [11.03, 39.88],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [-5.94, 22.91],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [11.67, 22.27]
  },
  {
   "obj": "street.bollard",
   "at": [14.5, 25.1]
  },
  {
   "obj": "street.bollard",
   "at": [2.9, 31.61]
  },
  {
   "obj": "street.bollard",
   "at": [5.3, 34.01]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [26.87, 57.98],
   "variant": 2
  },
  {
   "obj": "person.phone-idler",
   "at": [2.55, 32.81]
  },
  {
   "obj": "person.couple",
   "at": [14.71, 23.48]
  },
  {
   "obj": "person.photographer",
   "at": [11.03, 42.71]
  },
  {
   "obj": "person.student",
   "at": [6.08, 13.72]
  },
  {
   "obj": "person.elderly-couple",
   "at": [14.99, 47.23]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.92, 7.52],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.56, 6.94],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.88, 5.66],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-1.53, 8.3],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.65, 6.55],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [4.08, 13.06],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [3.73, 12.23],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [4.77, 13.32],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [9.07, 14.92],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [8, 13.67],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [8.27, 15.02],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [19.37, 27.29],
   "variant": 1
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [46.53, 77.92],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [63.22, 95.18],
   "variant": 2
  },
  {
   "obj": "street.mcr-bin",
   "at": [7.92, 17.54],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mcr-bin",
   "at": [23.48, 52.89]
  },
  {
   "obj": "street.mcr-cycle-stand",
   "at": [13.36, 17.75],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mcr-totem",
   "at": [11.38, 21.14],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mcr-tram-shelter",
   "at": [-4.77, 6.99],
   "variant": 0
  },
  {
   "obj": "street.lamppost",
   "at": [4.63, 6.05],
   "variant": 2
  },
  {
   "obj": "building.gen-direct",
   "at": [-24.4, 21.6]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 4,
   "seed": 9778
  },
  {
   "obj": "ground.leaves",
   "at": [1.59, 30.16]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.93, 30.98]
  },
  {
   "obj": "ground.leaves",
   "at": [6.3, 35.23]
  },
  {
   "obj": "ground.leaves",
   "at": [10.37, 39.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [15.85, 22.43]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [33.3, 36.93]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [29.61, 37.04]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [31.76, 38.56]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-27.99, 29.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.15, 29.91]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-25.18, 33.38]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [34.87, 37.35]
  },
  {
   "obj": "ground.leaves",
   "at": [9.72, 18]
  },
  {
   "obj": "ground.leaves",
   "at": [30.64, 35.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-21.74, 23.83]
  },
  {
   "obj": "ground.leaves",
   "at": [-3.84, 30.85]
  },
  {
   "obj": "ground.leaves",
   "at": [-17.45, 32.4]
  },
  {
   "obj": "ground.leaves",
   "at": [-26.84, 32.45]
  },
  {
   "obj": "ground.leaves",
   "at": [33.3, 34.13]
  },
  {
   "obj": "ground.leaves",
   "at": [-22.98, 37.06]
  },
  {
   "obj": "person.phone-idler",
   "at": [2.55, 32.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.71, 25.64]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-5.61, 27.66]
  }],
 "life": [{
   "who": "cyclists",
   "rate": "1/2min",
   "mix": {
    "cyclist-commuter": 0.67,
    "cyclist": 0.33
   }
  },
  {
   "who": "walkers",
   "on": "pave-e",
   "rate": "14/min",
   "mix": {
    "stroll": 0.2,
    "commuter": 0.2,
    "student": 0.15,
    "shopper": 0.15,
    "couple": 0.1,
    "takeaway-walker": 0.1,
    "buggy": 0.05,
    "dog-walker": 0.05
   }
  },
  {
   "who": "walkers",
   "rate": "11/min"
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/3min",
   "on": "land"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "land"
  }],
 "backdrop": {
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
