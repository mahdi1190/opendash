/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-salford-quays-lowry-w3: converted by `node tools/world.mjs convert uk-north-manchester-quays-nq/greater-manchester-salford-quays-lowry`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (38):
     - place[0]: landmark.mqn-lowry-v1: pixel placement unprojected to [18.5, 87] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: landmark.mqn-iwm-v1: pixel placement unprojected to [-152.6, 327.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mqn-liftbridge-v1: pixel placement unprojected to [-1.5, 192.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.mqn-mcbridge-v1: pixel placement unprojected to [-2, 556] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.1, 4.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.1, 6.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.1, 9] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.1, 13] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.2, 20] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.2, 30] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.3, 44] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.4, 61.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.mqn-quayrail-v1: pixel placement unprojected to [-1.5, 86.1] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mqn-media, 12 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mqn-media, 18 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mqn-media, 9 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mqn-media, 7 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.brutalist: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (brutalist, 5 storeys) -> one 'building.brutalist' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mqn-media, 14 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - actors[1]: actor bird.goose: no life class; dropped
     - backdrop: backdrop style 'coast' chosen from the place and the water; check it against the real view
     - entities[126].at: repair: removed (badAttach) bird.herring-gull stands on the ground but (-1.05, 19.6) is water
     - entities[3]: repair: removed (overlap) structure.mqn-quayrail-v1 overlaps structure.mqn-quayrail-v1 (entities[2]) by 1.2 m
     - entities[4]: repair: removed (overlap) structure.mqn-quayrail-v1 overlaps structure.mqn-quayrail-v1 (entities[3]) by 1.2 m
     - entities[22]: repair: removed (overlap) street.mqn-lifebuoy overlaps structure.mqn-quayrail-v1 (entities[3]) by 0.154 m
     - entities[30]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[25]) by 0.45 m
     - entities[31]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[27]) by 0.45 m
     - entities[32]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[29]) by 0.45 m
     - entities[38]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[37]) by 0.2 m
     - entities[39]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[38]) by 0.2 m
     - landmarks[0]: repair: removed (overlap) landmark.mqn-lowry-v1 overlaps tree.mqn-street-tree (entities[45]) by 0.462 m
     - entities[63]: repair: removed (overlap) street.mqn-bin overlaps street.mqn-planter-grass (entities[55]) by 0.33 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-salford-quays-lowry-w3","label":"Salford Quays, Greater Manchester","site":"Salford Quays — the Lowry, its lift bridge and IWM North across the Ship Canal","tags":["uk","north west","manchester","salford","city","waterfront","quays","arts centre","museum","bridge","world-v3"],"liveSky":{"lat":53.4704,"lon":-2.2946},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.4704,
  "lon": -2.2946,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.7,
  "fov": 56,
  "horizon": 480,
  "heading": 258,
  "water": -2.4
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-3.6, 5.5],
    [3.6, 5.5],
    [1993.9, 3000],
    [-1993.9, 3000]]
  },
  {
   "id": "trafford",
   "kind": "plaza",
   "poly": [[-600, 120],
    [-78, 120],
    [-78, 1000],
    [-600, 1000]]
  },
  {
   "id": "iwm-lawn",
   "kind": "grass",
   "poly": [[-200, 150],
    [-150, 150],
    [-128, 280],
    [-200, 300]]
  },
  {
   "id": "prom",
   "kind": "plaza",
   "poly": [[-1, 3.5],
    [18, 3.5],
    [18, 420],
    [-1, 420]]
  },
  {
   "id": "pier9",
   "kind": "plaza",
   "poly": [[-1, 420],
    [200, 420],
    [200, 1000],
    [-1, 1000]]
  },
  {
   "id": "canal",
   "kind": "water",
   "water": "harbour",
   "poly": [[-1, 3],
    [-1, 900],
    [-78, 900],
    [-78, 3]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "structure.mqn-liftbridge-v1",
   "at": [-1.5, 192.31],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-mcbridge-v1",
   "at": [-2, 556.04],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.1, 4.2],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.15, 13],
   "variant": 3,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.2, 20],
   "variant": 4,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.25, 29.99],
   "variant": 5,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.3, 44.02],
   "variant": 6,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.4, 61.93],
   "variant": 7,
   "attach": "water"
  },
  {
   "obj": "structure.mqn-quayrail-v1",
   "at": [-1.5, 86.12],
   "variant": 8,
   "attach": "water"
  },
  {
   "obj": "street.lamppost",
   "at": [-0.2, 26],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-0.2, 62],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-0.2, 118],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-0.2, 180],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [0.4, 23],
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [0.4, 47],
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-0.4, 16],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-0.4, 36],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [-0.4, 56],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-0.4, 80],
   "variant": 3
  },
  {
   "obj": "street.bollard",
   "at": [-0.4, 104],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [-0.5, 40]
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [-0.5, 90]
  },
  {
   "obj": "street.mqn-parasol",
   "at": [15, 27],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [15.2, 33],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [15, 40],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [15.3, 48],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [15, 57],
   "variant": 3
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [12.8, 24],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [12.8, 36.5],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [12.8, 52],
   "variant": 2
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [12.8, 64],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [8.2, 14.6],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.photographer",
   "at": [-0.3, 15.5],
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [0.5, 23.2]
  },
  {
   "obj": "person.couple",
   "at": [-0.2, 36],
   "facing": 270
  },
  {
   "obj": "person.child-scooter",
   "at": [4.6, 19]
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [11.6, 62],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [11.8, 98],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [11.6, 134],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.6, 7.4],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.2, 7.9],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.2, 8.3],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.8, 7.6],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [4.6, 11.4],
   "variant": 4
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5, 12],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.6, 8.8],
   "variant": 2
  },
  {
   "obj": "bird.herring-gull",
   "at": [-0.7, 19.6]
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [4.6, 9.6],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [2.8, 7.6],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.phone-idler",
   "at": [3.1, 7.4],
   "facing": 270
  },
  {
   "obj": "person.student",
   "at": [3.7, 7.9],
   "facing": 270
  },
  {
   "obj": "person.takeaway-walker",
   "at": [4.3, 8.3],
   "facing": 90
  },
  {
   "obj": "person.busker",
   "at": [6.4, 12.6],
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [0.5, 47.2]
  },
  {
   "obj": "person.elderly-walker",
   "at": [3.4, 30],
   "facing": 0
  },
  {
   "obj": "street.mqn-bin",
   "at": [-0.3, 31],
   "variant": 1
  },
  {
   "obj": "street.mqn-totem",
   "at": [8.6, 22],
   "variant": 1
  },
  {
   "obj": "street.mqn-aboard",
   "at": [12.4, 19.5],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [12.2, 45],
   "variant": 1
  },
  {
   "obj": "person.couple",
   "at": [1.5, 10.4],
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [1.4, 17],
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [1.4, 17.2]
  },
  {
   "obj": "person.child-ball",
   "at": [2.6, 12.4],
   "facing": 90
  },
  {
   "obj": "bird.goose",
   "at": [-10, 22],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "bird.mallard",
   "at": [-3.4, 11],
   "attach": "water"
  },
  {
   "obj": "bird.coot",
   "at": [-6, 46],
   "attach": "water"
  },
  {
   "obj": "building.gen-direct",
   "at": [-130, 350]
  },
  {
   "obj": "building.gen-direct",
   "at": [-205, 400]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.27, 6.21]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.06, 6.72]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.77, 7.63]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.83, 8]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.46, 8.26]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.42, 8.61]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.33, 9.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.19, 9.92]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.7, 10.03]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.59, 10.84]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.04, 10.94]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.09, 12.63]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.37, 19.01]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.57, 20.36]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.76, 20.65]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.23, 21.44]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [4.09, 21.71]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.56, 23.14]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.01, 24.11]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.98, 24.31]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.2, 24.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [7.93, 26.36]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [10.06, 28.86]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [7.47, 29.12]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.3, 29.79]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [13.99, 29.84]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.83, 30.22]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [7.49, 30.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [15.34, 30.68]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [14.68, 31.01]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [16.64, 31.66]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [16.46, 33.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [15, 33.37]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [14.96, 34.89]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "prom",
   "n": 26,
   "seed": 5802
  },
  {
   "obj": "ground.leaves",
   "at": [-0.46, 9.31]
  },
  {
   "obj": "ground.leaves",
   "at": [0.15, 10.57]
  },
  {
   "obj": "ground.leaves",
   "at": [9.68, 19.29]
  },
  {
   "obj": "ground.leaves",
   "at": [3.36, 19.6]
  },
  {
   "obj": "ground.leaves",
   "at": [3.77, 20.37]
  },
  {
   "obj": "ground.leaves",
   "at": [2.62, 21.04]
  },
  {
   "obj": "ground.leaves",
   "at": [9.51, 21.33]
  },
  {
   "obj": "ground.leaves",
   "at": [8.97, 22.18]
  },
  {
   "obj": "ground.leaves",
   "at": [2.95, 22.2]
  },
  {
   "obj": "ground.leaves",
   "at": [9.99, 30.61]
  },
  {
   "obj": "ground.leaves",
   "at": [12.8, 30.81]
  },
  {
   "obj": "ground.leaves",
   "at": [15.52, 32.72]
  },
  {
   "obj": "ground.leaves",
   "at": [16.07, 34.8]
  },
  {
   "cluster": "ground.leaves",
   "on": "prom",
   "n": 11,
   "seed": 1193
  }],
 "landmarks": [{
   "obj": "landmark.mqn-iwm-v1",
   "at": [-152.59, 327.92],
   "variant": 0,
   "src": "https://thelowry.com/about-us/the-building/"
  }],
 "life": [{
   "who": "walkers",
   "on": "prom",
   "rate": "17/min",
   "mix": {
    "jogger": 0.07,
    "family": 0.07,
    "buggy": 0.07,
    "elderly-couple": 0.07,
    "stroll": 0.27,
    "dog-walker": 0.13,
    "couple": 0.13,
    "student": 0.13,
    "shopper": 0.07
   }
  },
  {
   "who": "walkers",
   "on": "trafford",
   "rate": "2/min",
   "mix": {
    "stroll": 0.67,
    "couple": 0.33
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
   "who": "mute-swan",
   "count": 1,
   "on": "canal"
  }],
 "backdrop": {
  "style": "coast"
 },
 "seed": 1
});
})();
