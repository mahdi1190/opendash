/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-3-w3: converted by `node tools/world.mjs convert uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-3`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (44):
     - place[0]: landmark.klm-p-v3-fatcat: pixel placement unprojected to [-3.8, 19.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.klm-p-v3-hill: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[21]: plant.klm-sycamore-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings[0]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (kelham-works, 4 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (kelham-works, 2 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (kelham-works, 4 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (kelham-flats, 5 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (kelham-flats, 6 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - buildings[8]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[8]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[9]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[9]: building footprint (kelham-flats, 5 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - buildings[10]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[10]: building footprint (kelham-works, 4 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[11]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[11]: building footprint (kelham-flats, 6 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - flows[1]: flow on ["pave-far","pave-near","side-pl","side-pr"]: one population per surface is better; kept on 'pave-far' only
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[70]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[4]) by 0.277 m
     - entities[8]: repair: removed (overlap) vehicle.car overlaps street.bollard (entities[5]) by 0.277 m
     - entities[71]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[5]) by 0.277 m
     - entities[60]: repair: removed (overlap) vehicle.car-rear overlaps vehicle.car (entities[8]) by 1.8 m
     - entities[48]: repair: removed (overlap) vehicle.car-rear overlaps vehicle.car (entities[10]) by 1.8 m
     - entities[49]: repair: removed (overlap) vehicle.car-rear overlaps vehicle.car (entities[11]) by 1.8 m
     - entities[56]: repair: removed (overlap) person.cafe-goer overlaps person.cafe-goer (entities[12]) by 0.45 m
     - entities[51]: repair: removed (overlap) street.mqn-planter-grass overlaps street.mqn-planter-grass (entities[16]) by 1.636 m
     - entities[50]: repair: removed (overlap) plant.planter overlaps plant.planter (entities[17]) by 0.6 m
     - entities[20]: repair: removed (blocksPath) building.gen-direct covers the whole width of side-pl
     - entities[10]: repair: removed (blocksPath) vehicle.car covers the whole width of bays-far
     ... and 4 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-kelham-3-w3","label":"The Fat Cat on Alma Street, Sheffield","site":"Alma Street, Kelham Island — the Fat Cat ale house, drinkers outside, the street busy","tags":["uk","yorkshire","south yorkshire","sheffield","kelham island","city","industrial heritage","street","pub","ale house","brewery","traffic","people","world-v3"],"liveSky":{"lat":53.3897,"lon":-1.4712},"mood":"cheerful","colour":"red"},
{
 "v": 3,
 "place": {
  "lat": 53.3897,
  "lon": -1.4712,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 48,
  "horizon": 520,
  "heading": 300,
  "x0": 660
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-3.9, 7],
    [3.9, 7],
    [1669.6, 3000],
    [-1669.6, 3000]]
  },
  {
   "id": "side",
   "kind": "road",
   "path": [[-5.49, 12.7],
    [-25.87, 29.8],
    [-71.83, 68.38]],
   "width": 6.4
  },
  {
   "id": "side-pl",
   "kind": "pavement",
   "path": [[-8.13, 9.56],
    [-28.51, 26.66],
    [-74.47, 65.24]],
   "width": 1.8
  },
  {
   "id": "side-pr",
   "kind": "pavement",
   "path": [[-2.85, 15.84],
    [-23.23, 32.94],
    [-69.19, 71.52]],
   "width": 1.8
  },
  {
   "id": "alma",
   "kind": "road",
   "path": [[-23.85, -14.46],
    [34.02, 54.48],
    [136.9, 177.04]],
   "width": 6.4
  },
  {
   "id": "bays-far",
   "kind": "plaza",
   "path": [[-27.14, -11.7],
    [30.73, 57.24],
    [133.61, 179.8]],
   "width": 2.2
  },
  {
   "id": "bays-near",
   "kind": "plaza",
   "path": [[-20.56, -17.22],
    [37.31, 51.72],
    [140.19, 174.28]],
   "width": 2.2
  },
  {
   "id": "pave-far",
   "kind": "pavement",
   "path": [[-29.13, -10.03],
    [28.74, 58.91],
    [131.62, 181.47]],
   "width": 3
  },
  {
   "id": "pave-near",
   "kind": "pavement",
   "path": [[-17.73, -19.6],
    [40.14, 49.34],
    [143.02, 171.9]],
   "width": 5.2
  },
  {
   "id": "xing",
   "kind": "road",
   "path": [[2.47, 8.49],
    [-5.8, 15.44]],
   "width": 3
  }],
 "entities": [{
   "obj": "tree.plane-avenue",
   "at": [17.15, 41.22]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [29.36, 55.78]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [43.51, 72.63]
  },
  {
   "obj": "street.bollard",
   "at": [1.17, 6.32]
  },
  {
   "obj": "street.bollard",
   "at": [3.74, 9.39]
  },
  {
   "obj": "street.bollard",
   "at": [6.31, 12.45]
  },
  {
   "obj": "plant.planter",
   "at": [10.11, 14.49]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [12.9, 19.98]
  },
  {
   "obj": "person.cafe-goer",
   "at": [-2.86, 19.49],
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [-2.05, 20.38],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "person.cafe-goer",
   "at": [1.97, 25.24],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "animal.dog",
   "at": [2.84, 28.69],
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [2.2, 29.09],
   "variant": 0
  },
  {
   "obj": "plant.planter",
   "at": [8.37, 36.45]
  },
  {
   "obj": "building.gen-direct",
   "at": [-25.2, 7.2]
  },
  {
   "obj": "building.gen-direct",
   "at": [18.2, 9.7]
  },
  {
   "obj": "building.gen-direct",
   "at": [37.9, 31.6]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 8,
   "seed": 9778
  },
  {
   "obj": "ground.leaves",
   "at": [-6.02, 15.92]
  },
  {
   "obj": "ground.leaves",
   "at": [-4.58, 19.15]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.63, 21.59]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.43, 22.91]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-6.56, 15.81]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-5.47, 16.76]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-5.32, 19.43]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-4.32, 20.23]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-2.31, 23.33]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [1.15, 26.41]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [3.3, 26.58]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [8.22, 34.75]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [4.38, 7.83]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [4.07, 7.97]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [5.07, 8.51]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [4.23, 8.74]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [3.26, 8.77]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [3.73, 9.02]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [3.74, 9.47]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [6.06, 10.06]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [5.97, 11.44]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [6.08, 12.12]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [7.88, 14.78]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [9.16, 15.5]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [9.1, 16.27]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-2.43, 19.9]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [0.13, 23.26]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [2.57, 27.33]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [2, 27.99]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-6.75, 19.35]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-8.37, 20.67]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-7.59, 19.95]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.49, 8.1]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.68, 8.23]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [4.85, 8.81]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [4.66, 9.78]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5.31, 9.83]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5.48, 11.29]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5.85, 11.71]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [6.54, 12.44]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [7.32, 13.1]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.14, 7.75]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [2.28, 7.94]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.95, 8.72]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.69, 8.76]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.49, 9.72]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.99, 10.26]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [5.66, 10.35]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [5, 11.4]
  },
  {
   "obj": "ground.leaves",
   "at": [2.56, 7.79]
  },
  {
   "obj": "ground.leaves",
   "at": [3.77, 7.96]
  },
  {
   "obj": "ground.leaves",
   "at": [2.08, 7.97]
  },
  {
   "obj": "ground.leaves",
   "at": [3.29, 8.16]
  },
  {
   "obj": "ground.leaves",
   "at": [3, 8.57]
  },
  {
   "obj": "ground.leaves",
   "at": [4.76, 9.43]
  },
  {
   "obj": "street.bollard",
   "at": [1.19, 7.05]
  }],
 "landmarks": [{
   "obj": "landmark.klm-p-v3-fatcat",
   "at": [-3.79, 19.63],
   "src": "https://www.simt.co.uk/kelham-island-museum"
  },
  {
   "obj": "landmark.klm-chimney",
   "at": [16, 132],
   "variant": 0,
   "src": "https://www.simt.co.uk/kelham-island-museum"
  }],
 "life": [{
   "who": "walkers",
   "on": "pave-far",
   "rate": "6/min",
   "mix": {
    "stroll": 0.17,
    "student": 0.17,
    "couple": 0.11,
    "dog-walker": 0.11,
    "takeaway-walker": 0.11,
    "shopper": 0.11,
    "commuter": 0.11,
    "buggy": 0.06,
    "elderly-walker": 0.06
   }
  },
  {
   "who": "cyclists",
   "on": "alma",
   "rate": "1/2min",
   "mix": {
    "cyclist": 0.67,
    "cyclist-commuter": 0.33
   }
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/2min",
   "on": "land"
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
