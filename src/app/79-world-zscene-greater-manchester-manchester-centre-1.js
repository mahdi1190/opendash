/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-1-w3: converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-1`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (27):
     - place[0]: landmark.mcr-town-hall-v1: pixel placement unprojected to [84, 100] m (was pinned perspective art: check it is a real object at this spot)
     - place[0]: landmark landmark.mcr-town-hall-v1: src is a placeholder; give the listing or map reference
     - place[1]: landmark.mcr-albert-memorial: pixel placement unprojected to [-17.2, 85.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: landmark landmark.mcr-albert-memorial: src is a placeholder; give the listing or map reference
     - place[57]: street.mcr-statue: pixel placement unprojected to [-3.6, 5.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[58]: street.lamppost: pixel placement unprojected to [4.3, 6.3] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mcr-palazzo, 4 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - flows[1]: flow on ["pave-n","pave-s"]: one population per surface is better; kept on 'pave-n' only
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - landmarks[0]: repair: removed (overlap) landmark.mcr-town-hall-v1 overlaps street.lamppost (entities[6]) by 0.277 m
     - entities[40]: repair: removed (overlap) structure.mcr-planter overlaps street.bench (entities[34]) by 0.38 m
     - life[3].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-manchester-centre-1-w3","label":"Albert Square, Manchester","site":"Albert Square — the Town Hall clock tower over the square, pigeons round the Albert Memorial","tags":["uk","north west","greater manchester","manchester","city","civic","town hall","clock tower","albert memorial","gothic","square","world-v3"],"liveSky":{"lat":53.4791,"lon":-2.2464},"mood":"energetic","colour":"red"},
{
 "v": 3,
 "place": {
  "lat": 53.4791,
  "lon": -2.2464,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.65,
  "fov": 76,
  "horizon": 662,
  "heading": 52
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-6.2, 6.4],
    [6.2, 6.4],
    [2929.8, 3000],
    [-2929.8, 3000]]
  },
  {
   "id": "princess",
   "kind": "tram",
   "path": [[28.58, 242.4],
    [-135.79, 81.52]],
   "width": 9
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[32.99, 237.9],
    [-131.38, 77.02]],
   "width": 3.6
  },
  {
   "id": "pave-s",
   "kind": "pavement",
   "path": [[24.24, 246.83],
    [-140.13, 85.95]],
   "width": 3.4
  },
  {
   "id": "th-walk",
   "kind": "pavement",
   "poly": [[-8.68, 196.13],
    [87.51, 97.84],
    [81.8, 92.25],
    [-14.4, 190.53]]
  },
  {
   "id": "square",
   "kind": "plaza",
   "poly": [[-14.4, 190.53],
    [83.19, 90.82],
    [-19, -9.21],
    [-116.6, 90.51]]
  }],
 "entities": [{
   "obj": "street.mcr-statue",
   "at": [-10.02, 158.89],
   "variant": 1
  },
  {
   "obj": "street.mcr-statue",
   "at": [-8.17, 131.26],
   "variant": 0
  },
  {
   "obj": "street.mcr-statue",
   "at": [29.65, 98.34],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [-9.22, 178.09],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [10.41, 162.32],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [40.05, 130.61],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [61.83, 104.07],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-8.05, 111.13],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [45.1, 71.13],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [-5.82, 144.6]
  },
  {
   "obj": "person.bench-reader",
   "at": [31.17, 118.23]
  },
  {
   "obj": "person.photographer",
   "at": [-1.71, 98.93],
   "facing": 90
  },
  {
   "obj": "person.child-ball",
   "at": [20.97, 97.21]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-26.71, 114.34],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-29.24, 114.45],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-30.56, 112.26],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-20.14, 117.82],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-18.21, 119.23],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-3.44, 15.83],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-3, 14.81],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.98, 14.61],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.11, 14.81],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-2.44, 15.58],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [2.28, 11.26],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.08, 10.47],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [2.88, 11.53],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.8, 9.81],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [3.11, 9.97],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.1, 9.82],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.07, 11.69],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.78, 27.27],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.16, 27.32],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-10.23, 26.69],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-7.56, 26.44],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [6.2, 10.2]
  },
  {
   "obj": "person.bench-sitter",
   "at": [7.4, 10.3],
   "variant": 1
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-44, 66],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [-21, 58]
  },
  {
   "obj": "street.bollard",
   "at": [-19.5, 56.6]
  },
  {
   "obj": "street.bollard",
   "at": [-17.8, 55.4]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.01, 7.99],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [-0.64, 6.88],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.55, 7.33],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.55, 7.04],
   "variant": 1
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-14, 20],
   "variant": 0
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-25.5, 35],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.mcr-bin",
   "at": [-5.6, 9.4],
   "variant": 1
  },
  {
   "obj": "street.mcr-bin",
   "at": [6.2, 16.5]
  },
  {
   "obj": "street.mcr-bin",
   "at": [-12, 30]
  },
  {
   "obj": "street.mcr-cycle-stand",
   "at": [-10.5, 17],
   "variant": 1
  },
  {
   "obj": "street.mcr-totem",
   "at": [4.6, 12.6],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [-1.8, 19.5]
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-30, 45],
   "variant": 1
  },
  {
   "obj": "structure.mcr-planter",
   "at": [-13.5, 25.5],
   "variant": 1
  },
  {
   "obj": "street.mcr-statue",
   "at": [-3.6, 5.67],
   "variant": 0
  },
  {
   "obj": "street.lamppost",
   "at": [4.31, 6.3],
   "variant": 1
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 8,
   "seed": 9778
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-20.22, 23.01]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-22.39, 24.26]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.86, 26.04]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-19.2, 28.13]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-8.09, 28.24]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.29, 28.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-20.41, 29.82]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-13.49, 31.23]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-12.82, 33.33]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [17.54, 36.85]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [24.18, 37.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-30.52, 39.43]
  },
  {
   "obj": "ground.leaves",
   "at": [4.85, 20.17]
  },
  {
   "obj": "ground.leaves",
   "at": [8.85, 21.16]
  },
  {
   "obj": "ground.leaves",
   "at": [6.65, 22.11]
  },
  {
   "obj": "ground.leaves",
   "at": [0.08, 22.65]
  },
  {
   "obj": "ground.leaves",
   "at": [1.54, 23.71]
  },
  {
   "obj": "ground.leaves",
   "at": [-10.1, 25.93]
  },
  {
   "obj": "ground.leaves",
   "at": [-22.61, 25.95]
  },
  {
   "obj": "ground.leaves",
   "at": [4.08, 26.88]
  },
  {
   "obj": "ground.leaves",
   "at": [19.52, 28.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-16.35, 31.35]
  },
  {
   "obj": "ground.leaves",
   "at": [23.71, 34.25]
  },
  {
   "obj": "ground.leaves",
   "at": [17.2, 34.46]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.46, 34.87]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [17.29, 24.28]
  }],
 "landmarks": [{
   "obj": "landmark.mcr-albert-memorial",
   "at": [-17.22, 85.33],
   "variant": 0,
   "src": "converted from uk-north-manchester-centre/greater-manchester-manchester-centre-1: check the listing"
  }],
 "life": [{
   "who": "walkers",
   "on": "th-walk",
   "rate": "15/min",
   "mix": {
    "stroll": 0.27,
    "commuter": 0.18,
    "shopper": 0.14,
    "student": 0.09,
    "couple": 0.09,
    "elderly-walker": 0.05,
    "takeaway-walker": 0.09,
    "buggy": 0.05,
    "family": 0.05
   }
  },
  {
   "who": "walkers",
   "on": "pave-n",
   "rate": "4/min"
  },
  {
   "who": "tram",
   "on": "princess",
   "every": "4min"
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/2min",
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
