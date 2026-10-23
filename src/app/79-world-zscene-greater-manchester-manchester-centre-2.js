/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-2-w3: converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-2`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (23):
     - place[0]: landmark.mcr-town-hall-tower-far: pixel placement unprojected to [34.2, 206.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[0]: landmark landmark.mcr-town-hall-tower-far: src is a placeholder; give the listing or map reference
     - place[1]: landmark.mcr-town-hall-extension: pixel placement unprojected to [48.1, 96.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: landmark landmark.mcr-town-hall-extension: src is a placeholder; give the listing or map reference
     - place[2]: landmark.mcr-midland-hotel: pixel placement unprojected to [-150, 120] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: landmark landmark.mcr-midland-hotel: src is a placeholder; give the listing or map reference
     - place[3]: landmark.mcr-central-library: pixel placement unprojected to [-12.3, 69.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: landmark landmark.mcr-central-library: src is a placeholder; give the listing or map reference
     - place[4]: landmark.mcr-cenotaph: pixel placement unprojected to [6, 47] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: landmark landmark.mcr-cenotaph: src is a placeholder; give the listing or map reference
     - place[50]: street.lamppost: pixel placement unprojected to [3.9, 5.6] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[34].at: repair: removed (badAttach) street.mcr-bin stands on the tram line
     - entities[36].at: repair: removed (badAttach) street.mcr-totem stands on the tram line
     - landmarks[1]: repair: removed (overlap) landmark.mcr-town-hall-extension overlaps street.lamppost (entities[8]) by 0.277 m
     - landmarks[3]: repair: removed (overlap) landmark.mcr-central-library overlaps street.lamppost (entities[9]) by 0.277 m
     - entities[35]: repair: removed (overlap) street.mcr-cycle-stand overlaps structure.mcr-planter (entities[30]) by 0.224 m
     - entities[50]: repair: removed (overlap) street.mcr-bin overlaps street.mcr-bin (entities[33]) by 0.6 m
     - landmarks[4]: repair: removed (overlap) landmark.mcr-cenotaph overlaps landmark.mcr-central-library (landmarks[3]) by 6 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-manchester-centre-2-w3","label":"St Peter's Square, Manchester","site":"St Peter's Square — trams at the stop below the Central Library rotunda, the Cenotaph beside them","tags":["uk","north west","greater manchester","manchester","city","civic","central library","rotunda","cenotaph","metrolink","tram","square","world-v3"],"liveSky":{"lat":53.4772,"lon":-2.2421},"mood":"energetic","colour":"red"},
{
 "v": 3,
 "place": {
  "lat": 53.4772,
  "lon": -2.2421,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.65,
  "fov": 74,
  "horizon": 615,
  "heading": 318
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-5.2, 5.5],
    [5.2, 5.5],
    [2825.8, 3000],
    [-2825.8, 3000]]
  },
  {
   "id": "lawn",
   "kind": "grass",
   "poly": [[-70, 54],
    [-34, 52],
    [-30, 66],
    [-72, 70]]
  },
  {
   "id": "line-a",
   "kind": "tram",
   "path": [[-160, 12.4],
    [-40, 19.6],
    [40, 24.4],
    [160, 31.6]],
   "width": 7
  },
  {
   "id": "line-b",
   "kind": "tram",
   "path": [[-160, 26.4],
    [-40, 33.6],
    [40, 38.4],
    [160, 45.6]],
   "width": 7
  },
  {
   "id": "island",
   "kind": "plaza",
   "path": [[-38, 26.72],
    [38, 31.28]],
   "width": 5
  },
  {
   "id": "near-sq",
   "kind": "plaza",
   "poly": [[-60, 6],
    [60, 6],
    [60, 21.6],
    [-60, 14.4]]
  },
  {
   "id": "far-sq",
   "kind": "plaza",
   "poly": [[-30, 39.2],
    [70, 45.2],
    [70, 90],
    [-30, 70]]
  }],
 "entities": [{
   "obj": "street.mcr-tram-shelter",
   "at": [-13.68, 28.18],
   "variant": 0,
   "facing": 87
  },
  {
   "obj": "street.mcr-tram-shelter",
   "at": [13.68, 29.82],
   "variant": 1,
   "facing": 87
  },
  {
   "obj": "person.phone-idler",
   "at": [-19.8, 28.56],
   "variant": 1,
   "facing": 87
  },
  {
   "obj": "person.student",
   "at": [-0.06, 30],
   "variant": 0,
   "facing": 87
  },
  {
   "obj": "street.mcr-peters-cross",
   "at": [-40, 60]
  },
  {
   "obj": "person.couple",
   "at": [3, 43.2],
   "facing": 0
  },
  {
   "obj": "street.lamppost",
   "at": [-7, 17.9],
   "variant": 0
  },
  {
   "obj": "street.lamppost",
   "at": [8.5, 18.3],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [44, 58],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [-36, 56],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [-28, 64]
  },
  {
   "obj": "person.bench-reader",
   "at": [-25.5, 64.2]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-52, 60],
   "variant": 2
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-64, 66],
   "variant": 1
  },
  {
   "obj": "tree.plane-avenue",
   "at": [58, 64],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.36, 12.02],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-3.96, 10.99],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-4.87, 10.76],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-1.65, 11.18],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-2.92, 11.14],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-4.87, 12.35],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [3.92, 12.79],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [4.59, 11.91],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [3.65, 11.94],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5.46, 12.76],
   "variant": 2
  },
  {
   "obj": "person.child-ball",
   "at": [2.2, 15.4]
  },
  {
   "obj": "street.bollard",
   "at": [-6, 17.6]
  },
  {
   "obj": "street.bollard",
   "at": [-1.6, 17.8]
  },
  {
   "obj": "street.bollard",
   "at": [3, 17.7]
  },
  {
   "obj": "structure.mcr-planter",
   "at": [-6.5, 7.2],
   "variant": 1
  },
  {
   "obj": "structure.mcr-planter",
   "at": [9.5, 10.5],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-8.6, 13.4],
   "variant": 1
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [10.6, 15.6],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mcr-bin",
   "at": [-4.2, 8.6],
   "variant": 1
  },
  {
   "obj": "person.bench-sitter",
   "at": [-1.2, 11.5],
   "variant": 3
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.41, 8.07],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.51, 7.41],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.64, 8.12],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.2, 6.79],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.07, 10.5],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [-7.54, 9.81],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.94, 9.68],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [3.93, 5.56],
   "variant": 0
  },
  {
   "obj": "building.gen-direct",
   "at": [-69, 148]
  },
  {
   "obj": "building.gen-direct",
   "at": [118, 162.5]
  },
  {
   "obj": "person.student",
   "at": [-0.06, 30]
  },
  {
   "obj": "person.phone-idler",
   "at": [-19.8, 28.56]
  },
  {
   "obj": "street.mcr-totem",
   "at": [-14.42, 17.09]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.32, 7.73]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.19, 9.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.72, 9.18]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.2, 9.52]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.04, 9.63]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.06, 10.3]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.64, 10.69]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.15, 10.72]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.68, 11.65]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.11, 12.26]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.12, 12.33]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.31, 12.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.59, 16.91]
  },
  {
   "obj": "ground.leaves",
   "at": [6.62, 8.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.13, 10.82]
  },
  {
   "obj": "ground.leaves",
   "at": [5.04, 11.49]
  },
  {
   "obj": "ground.leaves",
   "at": [2.45, 12.55]
  },
  {
   "obj": "ground.leaves",
   "at": [6.24, 12.81]
  },
  {
   "obj": "ground.leaves",
   "at": [3.11, 13.21]
  },
  {
   "obj": "ground.leaves",
   "at": [11.44, 13.96]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.35, 14.32]
  },
  {
   "obj": "ground.leaves",
   "at": [1.06, 14.8]
  },
  {
   "obj": "ground.leaves",
   "at": [12.95, 15.53]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.95, 15.66]
  }],
 "landmarks": [{
   "obj": "landmark.mcr-town-hall-tower-far",
   "at": [34.18, 206.08],
   "variant": 0,
   "src": "converted from uk-north-manchester-centre/greater-manchester-manchester-centre-2: check the listing"
  },
  {
   "obj": "landmark.mcr-midland-hotel",
   "at": [-149.97, 119.98],
   "variant": 1,
   "src": "converted from uk-north-manchester-centre/greater-manchester-manchester-centre-2: check the listing"
  }],
 "life": [{
   "who": "tram",
   "on": "line-a",
   "every": "3min"
  },
  {
   "who": "tram",
   "on": "line-b",
   "every": "4min"
  },
  {
   "who": "walkers",
   "on": "near-sq",
   "rate": "14/min",
   "mix": {
    "commuter": 0.24,
    "stroll": 0.24,
    "student": 0.14,
    "shopper": 0.1,
    "couple": 0.1,
    "takeaway-walker": 0.1,
    "buggy": 0.05,
    "elderly-walker": 0.05
   }
  },
  {
   "who": "walkers",
   "on": "island",
   "rate": "2/min",
   "mix": {
    "commuter-station": 0.5,
    "commuter": 0.33,
    "student": 0.17
   }
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/6min",
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
