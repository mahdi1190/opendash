/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-centre-2-w3: converted by `node tools/world.mjs convert uk-north-sheffield-centre/south-yorkshire-sheffield-centre-2`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (8):
     - surfaces[1]: surface kind 'edge' has no v3 kind: dropped
     - surfaces[2]: surface kind 'edge' has no v3 kind: dropped
     - surfaces[3]: surface kind 'edge' has no v3 kind: dropped
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - landmarks[0]: repair: removed (overlap) landmark.shc-winter-garden overlaps street.lamppost (entities[11]) by 0.277 m
     - entities[58]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[57]) by 0.2 m
     - entities[59]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[58]) by 0.2 m
     - entities[60]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[59]) by 0.2 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-centre-2-w3","label":"Winter Garden, Sheffield","site":"Millennium Square: the Winter Garden's glass and larch, St Paul's Tower beside it","tags":["uk","yorkshire","south yorkshire","sheffield","city","townscape","glasshouse","square","tower","world-v3"],"liveSky":{"lat":53.3794,"lon":-1.469},"mood":"cheerful","colour":"teal"},
{
 "v": 3,
 "place": {
  "lat": 53.3794,
  "lon": -1.469,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 56,
  "horizon": 548,
  "heading": 75
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-4.2, 6.3],
    [4.2, 6.3],
    [1993.9, 3000],
    [-1993.9, 3000]]
  },
  {
   "id": "bed-near",
   "kind": "grass",
   "poly": [[4.6, 5.6],
    [14, 5.6],
    [14, 9.4],
    [4.6, 9.4]]
  },
  {
   "id": "gallery",
   "kind": "plaza",
   "poly": [[20, 68],
    [100, 68],
    [100, 80],
    [20, 80]]
  },
  {
   "id": "wg",
   "kind": "plaza",
   "poly": [[-42, 80],
    [42, 80],
    [42, 100],
    [-42, 100]]
  },
  {
   "id": "pit-0",
   "kind": "grass",
   "poly": [[-25.2, 42.8],
    [-22.8, 42.8],
    [-22.8, 45.2],
    [-25.2, 45.2]]
  },
  {
   "id": "pit-1",
   "kind": "grass",
   "poly": [[-20.7, 47.8],
    [-18.3, 47.8],
    [-18.3, 50.2],
    [-20.7, 50.2]]
  },
  {
   "id": "pit-2",
   "kind": "grass",
   "poly": [[-29.2, 50.8],
    [-26.8, 50.8],
    [-26.8, 53.2],
    [-29.2, 53.2]]
  },
  {
   "id": "pit-3",
   "kind": "grass",
   "poly": [[24.8, 56.8],
    [27.2, 56.8],
    [27.2, 59.2],
    [24.8, 59.2]]
  },
  {
   "id": "pit-4",
   "kind": "grass",
   "poly": [[-37.2, 68.8],
    [-34.8, 68.8],
    [-34.8, 71.2],
    [-37.2, 71.2]]
  },
  {
   "id": "bed-l",
   "kind": "grass",
   "poly": [[-30, 40],
    [-17, 40],
    [-17, 54],
    [-30, 54]]
  }],
 "entities": [{
   "obj": "tree.pool-birch",
   "at": [-24, 44],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [-19.5, 49],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [-28, 52],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [26, 58],
   "variant": 1
  },
  {
   "obj": "tree.cherry",
   "at": [-36, 70],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [16, 34],
   "variant": 1
  },
  {
   "obj": "person.cafe-goer",
   "at": [20, 38],
   "variant": 0
  },
  {
   "obj": "person.cafe-goer",
   "at": [15, 43],
   "variant": 3
  },
  {
   "obj": "street.bench",
   "at": [-14, 58],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [9, 60],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [8, 31],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-5, 56],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [11, 64],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.planter",
   "at": [-3.4, 72],
   "variant": 1
  },
  {
   "obj": "plant.planter",
   "at": [3.6, 72],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.planter",
   "at": [-12, 26],
   "variant": 0
  },
  {
   "obj": "plant.planter",
   "at": [12.5, 50],
   "variant": 2
  },
  {
   "obj": "plant.planter",
   "at": [19, 30],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [-10, 36.2]
  },
  {
   "obj": "person.child-scooter",
   "at": [4, 26]
  },
  {
   "obj": "person.photographer",
   "at": [-2.4, 48],
   "facing": 90
  },
  {
   "obj": "person.child-ball",
   "at": [-6, 16]
  },
  {
   "obj": "person.bench-sitter",
   "at": [-3.6, 15],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.33, 12.28],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [1.89, 12.58],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.27, 11.47],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.68, 13.53],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.67, 13.69],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-1.24, 11.88],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.01, 41.98],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-8.01, 41.49],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.56, 43.24],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-10.21, 41.24],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-10.49, 42.18],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [10.09, 61.92],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [11.05, 61.72],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [14.66, 59.92],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [14.51, 60.2],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [0.54, 7.56],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-0.8, 8.15],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [1.26, 7.1],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.dog",
   "at": [-2.2, 11.5],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "plant.planter",
   "at": [6.4, 12.6],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [-5.2, 12],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [4.4, 16.5],
   "variant": 1
  },
  {
   "obj": "street.mqn-parasol",
   "at": [13.5, 30],
   "variant": 1
  },
  {
   "obj": "street.mqn-parasol",
   "at": [16.5, 36],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [13.8, 42],
   "variant": 3
  },
  {
   "obj": "street.mqn-parasol",
   "at": [17, 47],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [12.4, 33],
   "variant": 1
  },
  {
   "obj": "person.cafe-goer",
   "at": [15.6, 39.5],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [13, 45],
   "variant": 0
  },
  {
   "obj": "person.cafe-goer",
   "at": [18.2, 33.5],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [16, 50],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [9.6, 17],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-15, 38],
   "variant": 2
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [21, 62],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-8.4, 14],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [4.2, 21],
   "variant": 1
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-4.5, 30],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [6, 44],
   "variant": 2
  },
  {
   "obj": "building.gen-direct",
   "at": [-92, 100]
  },
  {
   "obj": "building.gen-direct",
   "at": [-45, 190]
  },
  {
   "obj": "ground.leaves",
   "at": [8.28, 16.61]
  },
  {
   "obj": "ground.leaves",
   "at": [3.32, 17.62]
  },
  {
   "obj": "ground.leaves",
   "at": [7.21, 18.75]
  },
  {
   "obj": "ground.leaves",
   "at": [-3.15, 19.08]
  },
  {
   "obj": "ground.leaves",
   "at": [7.12, 22.31]
  },
  {
   "obj": "ground.leaves",
   "at": [0.62, 25.13]
  },
  {
   "obj": "ground.leaves",
   "at": [8.67, 26.86]
  },
  {
   "obj": "ground.leaves",
   "at": [4.22, 30.85]
  },
  {
   "cluster": "ground.leaves",
   "on": "land",
   "n": 10,
   "seed": 6798
  },
  {
   "cluster": "plant.shrub",
   "on": "bed-l",
   "n": 10,
   "seed": 5604
  },
  {
   "cluster": "plant.wildflowers",
   "on": "bed-l",
   "n": 14,
   "seed": 4053
  },
  {
   "cluster": "plant.grass",
   "on": "bed-l",
   "n": 11,
   "seed": 3562
  },
  {
   "cluster": "plant.daisies",
   "on": "bed-l",
   "n": 15,
   "seed": 8673
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.36, 16.53]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.09, 19.48]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [11.75, 22.41]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-20.89, 34.52]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-19.11, 34.74]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "land",
   "n": 9,
   "seed": 7328
  },
  {
   "obj": "plant.shrub",
   "at": [4.62, 7.97]
  },
  {
   "obj": "plant.shrub",
   "at": [5.3, 8.4]
  },
  {
   "obj": "plant.shrub",
   "at": [5.69, 9.26]
  },
  {
   "obj": "plant.shrub",
   "at": [5.62, 9.35]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.68, 7.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.69, 7.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.5, 8.86]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.63, 9.09]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.88, 9.26]
  },
  {
   "obj": "plant.daisies",
   "at": [4.72, 7.9]
  },
  {
   "obj": "plant.daisies",
   "at": [4.68, 8.27]
  },
  {
   "obj": "plant.daisies",
   "at": [5.21, 8.29]
  },
  {
   "obj": "plant.daisies",
   "at": [5.32, 8.45]
  },
  {
   "obj": "plant.daisies",
   "at": [5.21, 8.63]
  },
  {
   "obj": "plant.daisies",
   "at": [4.74, 8.71]
  },
  {
   "obj": "plant.daisies",
   "at": [5.31, 9.1]
  },
  {
   "obj": "plant.daisies",
   "at": [4.95, 9.17]
  },
  {
   "obj": "plant.daisies",
   "at": [4.82, 9.18]
  },
  {
   "obj": "plant.grass",
   "at": [4.71, 7.99]
  },
  {
   "obj": "plant.grass",
   "at": [4.98, 8]
  },
  {
   "obj": "plant.grass",
   "at": [4.78, 8.31]
  },
  {
   "obj": "plant.grass",
   "at": [5.21, 8.44]
  },
  {
   "obj": "plant.grass",
   "at": [5.1, 8.44]
  },
  {
   "obj": "plant.grass",
   "at": [4.93, 8.51]
  },
  {
   "obj": "plant.grass",
   "at": [5.45, 8.89]
  },
  {
   "obj": "plant.grass",
   "at": [4.9, 9.06]
  },
  {
   "obj": "plant.grass",
   "at": [5.13, 9.15]
  }],
 "landmarks": [{
   "obj": "landmark.shc-st-pauls-tower",
   "at": [-58, 132],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  },
  {
   "obj": "landmark.shc-gallery",
   "at": [50, 76],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  }],
 "life": [{
   "who": "walkers",
   "on": "land",
   "rate": "7/min",
   "mix": {
    "stroll": 0.77,
    "dog-walker": 0.08,
    "jogger": 0.08,
    "family": 0.08
   }
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/1min",
   "on": "land"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "land"
  },
  {
   "who": "visit",
   "mix": {
    "jogger": 1
   },
   "rate": "1/6min",
   "on": "land"
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
