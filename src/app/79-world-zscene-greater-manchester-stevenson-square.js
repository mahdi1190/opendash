/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-stevenson-square-w3: converted by `node tools/world.mjs convert uk-north-manchester-quays-nq/greater-manchester-stevenson-square`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (49):
     - place[0]: structure.mqn-kiosk-v3: pixel placement unprojected to [3, 30] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mqn-mural-v3: pixel placement unprojected to [-13, 87.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[73]: street.lamppost: pixel placement unprojected to [-3.1, 5.8] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mqn-ancoats-mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mqn-ancoats-mill, 6 storeys) -> one 'building.mqn-ancoats-mill' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[8]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[8]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[9]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[9]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[10]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[10]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[11]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[11]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[12]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[12]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[13]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[13]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[14]: building.mqn-ancoats-mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[14]: building footprint (mqn-ancoats-mill, 8 storeys) -> one 'building.mqn-ancoats-mill' entity at its centre: the library size replaces the authored footprint
     - flows[3]: flow on ["pave-l","pave-n","pave-e"]: one population per surface is better; kept on 'pave-l' only
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[15]: repair: removed (overlap) street.bench overlaps structure.mqn-kiosk-v3 (entities[0]) by 0.476 m
     - entities[16]: repair: removed (overlap) street.bench overlaps street.mqn-bike-hoop (entities[11]) by 0.335 m
     - entities[14]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[13]) by 0.65 m
     - entities[73]: repair: removed (overlap) street.lamppost overlaps street.mqn-planter-grass (entities[18]) by 0.21 m
     - entities[29]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[24]) by 0.45 m
     ... and 9 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-stevenson-square-w3","label":"Stevenson Square, Greater Manchester","site":"The Northern Quarter — Stevenson Square, its painted kiosk, murals, cafes and buses","tags":["uk","north west","manchester","salford","city","city","street art","cafe","square","bus","cycling","world-v3"],"liveSky":{"lat":53.4824,"lon":-2.2346},"mood":"energetic","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 53.4824,
  "lon": -2.2346,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.65,
  "fov": 58,
  "horizon": 520,
  "heading": 40
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-3.9, 5.6],
    [3.9, 5.6],
    [2078.7, 3000],
    [-2078.7, 3000]]
  },
  {
   "id": "square",
   "kind": "plaza",
   "poly": [[-6.5, 2],
    [36, 2],
    [36, 76.4],
    [-6.5, 76.4]]
  },
  {
   "id": "lever",
   "kind": "road",
   "path": [[-10, 1],
    [-10, 72],
    [-14, 79],
    [-24, 80],
    [-160, 80]],
   "width": 7
  },
  {
   "id": "pave-l",
   "kind": "pavement",
   "path": [[-15.1, 1],
    [-15.09, 71.74],
    [-16.53, 74.57],
    [-24.03, 74.9],
    [-160, 74.9]],
   "width": 3.2
  },
  {
   "id": "hilton",
   "kind": "road",
   "path": [[-160, 80],
    [160, 80]],
   "width": 7
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[-160, 84.7],
    [160, 84.7]],
   "width": 2.4
  },
  {
   "id": "pave-e",
   "kind": "pavement",
   "poly": [[36, 2],
    [39, 2],
    [39, 76.4],
    [36, 76.4]]
  }],
 "entities": [{
   "obj": "structure.mqn-kiosk-v3",
   "at": [3, 29.99],
   "variant": 0
  },
  {
   "obj": "structure.mqn-mural-v3",
   "at": [-13.01, 87.23],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [13, 20],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [25.8, 31.8],
   "variant": 1
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [20, 52],
   "variant": 2
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [30, 66],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-2, 60],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 10],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 34],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 58],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [37.4, 64],
   "variant": 3
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [14, 34],
   "variant": 0
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [15.8, 34],
   "variant": 2
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [24, 50],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [7, 37],
   "facing": 180
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-4, 6],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [5, 9],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [30, 46],
   "variant": 2
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-4.5, 44],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [20, 72],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.6, 14],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.4, 19],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.8, 30.4],
   "variant": 3
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.4, 41.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.6, 56.4],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [16.6, 41],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 8],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 16],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 26],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 40],
   "variant": 3
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 54],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 68],
   "variant": 1
  },
  {
   "obj": "person.photographer",
   "at": [4, 74],
   "facing": 0
  },
  {
   "obj": "person.bench-reader",
   "at": [12.5, 33.1]
  },
  {
   "obj": "person.skateboarder",
   "at": [16, 58]
  },
  {
   "obj": "person.child-scooter",
   "at": [7, 24]
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [2.6, 6.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.2, 7.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.4, 7.8],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.6, 7.2],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.4, 8.2],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [3.1, 8.8],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.8, 9.2],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [3.8, 8.5],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [11, 12.4],
   "variant": 4
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [11.6, 13],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.6, 9.8],
   "variant": 2
  },
  {
   "obj": "person.busker",
   "at": [3.8, 11.2],
   "facing": 270
  },
  {
   "obj": "person.couple",
   "at": [1.6, 9.4],
   "facing": 90
  },
  {
   "obj": "person.phone-idler",
   "at": [4.6, 8.2],
   "facing": 270
  },
  {
   "obj": "person.student",
   "at": [-2.2, 12.6],
   "facing": 90
  },
  {
   "obj": "person.student",
   "at": [-1.6, 13.2],
   "facing": 270
  },
  {
   "obj": "person.wheelchair-user",
   "at": [8, 18],
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [2, 28.7]
  },
  {
   "obj": "person.bench-reader",
   "at": [7, 37.2]
  },
  {
   "obj": "street.mqn-bin",
   "at": [-5.2, 16],
   "variant": 0
  },
  {
   "obj": "street.mqn-bin",
   "at": [6.6, 14],
   "variant": 1
  },
  {
   "obj": "street.mqn-bin",
   "at": [22, 40],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.6, 8.6],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.8, 24],
   "variant": 1
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.6, 36],
   "variant": 0
  },
  {
   "obj": "street.mqn-totem",
   "at": [9, 26],
   "variant": 1
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-4.71, 11.32]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.31, 14.46]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-5.34, 17.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.65, 17.59]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-4.43, 18.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.07, 18.68]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.13, 19.55]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.27, 19.77]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.2, 20.97]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-2.98, 22.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.14, 22.35]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.07, 23.06]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.4, 23.62]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.28, 23.9]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.22, 24.04]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.02, 24.24]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.4, 24.55]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [11.46, 25.67]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [13.77, 26.09]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.24, 26.17]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [15.68, 26.31]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.89, 26.37]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [11.58, 26.74]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.74, 29.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.34, 29.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.97, 31.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.46, 31.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.83, 32.13]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [12.19, 33.46]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "square",
   "n": 26,
   "seed": 7917
  },
  {
   "obj": "ground.leaves",
   "at": [-0.64, 15.08]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.13, 16.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.51, 17.26]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.39, 18.41]
  },
  {
   "obj": "ground.leaves",
   "at": [11.09, 23.57]
  },
  {
   "obj": "ground.leaves",
   "at": [5.39, 24.15]
  },
  {
   "obj": "ground.leaves",
   "at": [10.31, 24.46]
  },
  {
   "obj": "ground.leaves",
   "at": [11.93, 24.47]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.37, 26.13]
  },
  {
   "obj": "ground.leaves",
   "at": [5.62, 27.86]
  },
  {
   "obj": "ground.leaves",
   "at": [11.46, 32.01]
  },
  {
   "cluster": "ground.leaves",
   "on": "square",
   "n": 4,
   "seed": 3115
  },
  {
   "obj": "building.gen-direct",
   "at": [-24.4, 9]
  },
  {
   "obj": "building.gen-direct",
   "at": [47.6, 16]
  },
  {
   "obj": "building.gen-direct",
   "at": [-23.9, 22.5]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 12,
   "seed": 9778
  }],
 "life": [{
   "who": "cyclists",
   "on": "lever",
   "rate": "1/3min",
   "mix": {
    "cyclist": 1
   }
  },
  {
   "who": "walkers",
   "on": "pave-l",
   "rate": "14/min",
   "mix": {
    "takeaway-walker": 0.13,
    "commuter": 0.13,
    "stroll": 0.27,
    "dog-walker": 0.13,
    "couple": 0.13,
    "student": 0.13,
    "shopper": 0.07
   }
  },
  {
   "who": "walkers",
   "on": "square",
   "rate": "28/min",
   "mix": {
    "takeaway-walker": 0.13,
    "family": 0.07,
    "skateboarder": 0.07,
    "stroll": 0.27,
    "dog-walker": 0.13,
    "couple": 0.13,
    "student": 0.13,
    "shopper": 0.07
   }
  }],
 "backdrop": {
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
