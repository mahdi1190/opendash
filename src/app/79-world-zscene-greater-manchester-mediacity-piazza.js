/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-mediacity-piazza-w3: converted by `node tools/world.mjs convert uk-north-manchester-quays-nq/greater-manchester-mediacity-piazza`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (36):
     - place[0]: landmark.mqn-iwm-v2: pixel placement unprojected to [-49.1, 354] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mqn-mcbridge-v2: pixel placement unprojected to [15.9, 125] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mqn-screen-v2: pixel placement unprojected to [26.9, 48] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.mqn-quayrail-v2: pixel placement unprojected to [13.6, 130.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.mqn-ole-v2: pixel placement unprojected to [1.1, 30] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.mqn-ole-v2: pixel placement unprojected to [-0.4, 50.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.mqn-ole-v2: pixel placement unprojected to [-7.2, 70.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.mqn-ole-v2: pixel placement unprojected to [-24.5, 87.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.mqn-ole-v2: pixel placement unprojected to [-49.9, 95.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mqn-tramstop-v2: pixel placement unprojected to [0.9, 33.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mqn-tramstop-v2: pixel placement unprojected to [1.6, 28] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mqn-tramstop-v2: pixel placement unprojected to [-8.1, 29.7] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mqn-media, 8 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mqn-media, 6 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mqn-media, 8 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mqn-media, 5 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.mqn-media: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (mqn-media, 11 storeys) -> one 'building.mqn-media' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.brutalist: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (brutalist, 5 storeys) -> one 'building.brutalist' entity at its centre: the library size replaces the authored footprint
     - actors[0]: actor bird.goose: no life class; dropped
     - backdrop: backdrop style 'coast' chosen from the place and the water; check it against the real view
     - entities[9]: repair: removed (overlap) structure.mqn-tramstop-v2 overlaps structure.mqn-ole-v2 (entities[3]) by 0.2 m
     - entities[15]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[12]) by 0.428 m
     - entities[95]: repair: removed (overlap) street.mqn-planter-grass overlaps street.mqn-planter-grass (entities[16]) by 0.218 m
     - entities[29]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[28]) by 0.65 m
     - entities[67]: repair: removed (overlap) street.mqn-bin overlaps street.mqn-bike-hoop (entities[28]) by 0.175 m
     - entities[30]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[29]) by 0.325 m
     - entities[31]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[30]) by 0.325 m
     - entities[78]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[75]) by 0.45 m
     - entities[79]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[76]) by 0.45 m
     - entities[80]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[77]) by 0.45 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-mediacity-piazza-w3","label":"MediaCityUK, Greater Manchester","site":"MediaCityUK — a Metrolink tram at the piazza stop, the swing footbridge and IWM North over the water","tags":["uk","north west","manchester","salford","city","waterfront","tram","metrolink","piazza","bridge","world-v3"],"liveSky":{"lat":53.4726,"lon":-2.2978},"mood":"energetic","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.4726,
  "lon": -2.2978,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 6,
  "fov": 56,
  "horizon": 400,
  "heading": 190,
  "water": -1.6
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-10.8, 16.2],
    [10.8, 16.2],
    [1993.9, 3000],
    [-1993.9, 3000]]
  },
  {
   "id": "piazza",
   "kind": "plaza",
   "poly": [[4, 3],
    [400, 3],
    [400, 130],
    [-400, 130],
    [-400, 112],
    [-60, 106],
    [-24, 92],
    [-8, 76],
    [3, 60],
    [4, 56]]
  },
  {
   "id": "piazza-w",
   "kind": "plaza",
   "poly": [[-400, 3],
    [-12, 3],
    [-12, 40],
    [-400, 60]]
  },
  {
   "id": "trafford",
   "kind": "plaza",
   "poly": [[-600, 318],
    [600, 318],
    [600, 1500],
    [-600, 1500]]
  },
  {
   "id": "tramway",
   "kind": "tram",
   "path": [[-3.5, 2],
    [-3.5, 30],
    [-5, 50],
    [-12, 70],
    [-30, 86],
    [-70, 96],
    [-160, 104],
    [-300, 110]],
   "width": 7.2
  },
  {
   "id": "platform",
   "kind": "plaza",
   "poly": [[0.2, 20],
    [3.8, 20],
    [3.8, 56],
    [0.2, 56]]
  },
  {
   "id": "platform-l",
   "kind": "plaza",
   "poly": [[-10.8, 20],
    [-7.2, 20],
    [-7.6, 46],
    [-11.2, 46]]
  },
  {
   "id": "canal",
   "kind": "water",
   "water": "harbour",
   "poly": [[-600, 130.2],
    [600, 130.2],
    [600, 318],
    [-600, 318]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "structure.mqn-mcbridge-v2",
   "at": [15.91, 125.03],
   "variant": 0
  },
  {
   "obj": "structure.mqn-screen-v2",
   "at": [26.9, 47.99],
   "variant": 0
  },
  {
   "obj": "structure.mqn-quayrail-v2",
   "at": [13.61, 130.08],
   "variant": 0
  },
  {
   "obj": "structure.mqn-ole-v2",
   "at": [1.1, 30],
   "variant": 0
  },
  {
   "obj": "structure.mqn-ole-v2",
   "at": [-0.41, 50.29],
   "variant": 1
  },
  {
   "obj": "structure.mqn-ole-v2",
   "at": [-7.25, 70.36],
   "variant": 2
  },
  {
   "obj": "structure.mqn-ole-v2",
   "at": [-24.45, 87.22],
   "variant": 3
  },
  {
   "obj": "structure.mqn-ole-v2",
   "at": [-49.92, 95.73],
   "variant": 4
  },
  {
   "obj": "structure.mqn-tramstop-v2",
   "at": [0.9, 33.7],
   "variant": 0
  },
  {
   "obj": "structure.mqn-tramstop-v2",
   "at": [-8.1, 29.7],
   "variant": 2
  },
  {
   "obj": "street.mqn-parasol",
   "at": [24.5, 36],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [24, 42],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [24.4, 70],
   "variant": 1
  },
  {
   "obj": "street.mqn-parasol",
   "at": [24, 77],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [9, 20],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [14, 34],
   "variant": 1
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [8, 52],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [16, 64],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [6, 88],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [18, 104],
   "variant": 2
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-8, 116],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [11, 24],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [15, 40],
   "variant": 1
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [10, 58],
   "variant": 2
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [19, 70],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [8, 96],
   "variant": 1
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [5.4, 25],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [0, 128.5],
   "facing": 0
  },
  {
   "obj": "street.bench",
   "at": [8, 128.5],
   "facing": 0
  },
  {
   "obj": "street.bench",
   "at": [-20, 128.5],
   "facing": 0
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 126],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [10, 126],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [-24, 126],
   "variant": 2
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [4, 129.4]
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [-14, 129.4]
  },
  {
   "obj": "person.phone-idler",
   "at": [1.6, 25]
  },
  {
   "obj": "person.student",
   "at": [2.4, 37],
   "facing": 270
  },
  {
   "obj": "person.shopper",
   "at": [1.8, 50]
  },
  {
   "obj": "person.takeaway-walker",
   "at": [-9, 26],
   "facing": 90
  },
  {
   "obj": "person.photographer",
   "at": [2, 128],
   "facing": 0
  },
  {
   "obj": "person.couple",
   "at": [12, 127.5]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [7.4, 24],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [8.1, 24.6],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [6.8, 25.3],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [8.8, 25.8],
   "variant": 3
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [9.6, 24.4],
   "variant": 4,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [4.6, 40],
   "variant": 1
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [20, 30],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [6, 66],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [14, 84],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [22, 100],
   "variant": 1
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-4, 104],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [3.4, 44],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [12, 30],
   "variant": 2
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [18, 58],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [10, 92],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [16.5, 44],
   "facing": 180
  },
  {
   "obj": "street.bench",
   "at": [-14, 100],
   "facing": 180
  },
  {
   "obj": "street.bench",
   "at": [26, 84],
   "facing": 180
  },
  {
   "obj": "person.bench-reader",
   "at": [16.5, 44.2]
  },
  {
   "obj": "person.bench-reader",
   "at": [-14, 100.2]
  },
  {
   "obj": "person.bench-reader",
   "at": [26, 84.2]
  },
  {
   "obj": "street.mqn-bin",
   "at": [16, 52],
   "variant": 1
  },
  {
   "obj": "street.mqn-bin",
   "at": [3.6, 70],
   "variant": 0
  },
  {
   "obj": "street.mqn-bin",
   "at": [24, 66],
   "variant": 1
  },
  {
   "obj": "street.mqn-totem",
   "at": [6, 36],
   "variant": 0
  },
  {
   "obj": "street.mqn-totem",
   "at": [12, 112],
   "variant": 1
  },
  {
   "obj": "street.mqn-aboard",
   "at": [22.4, 34],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [22.6, 74],
   "variant": 1
  },
  {
   "obj": "street.mqn-parasol",
   "at": [18.4, 38],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [19, 44],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [18.6, 50],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "person.phone-idler",
   "at": [9, 27],
   "facing": 270
  },
  {
   "obj": "person.commuter",
   "at": [9.8, 27.6],
   "facing": 90
  },
  {
   "obj": "person.student",
   "at": [16, 62],
   "facing": 0
  },
  {
   "obj": "person.student",
   "at": [16.8, 62.4],
   "facing": 270
  },
  {
   "obj": "person.photographer",
   "at": [20, 104],
   "facing": 270
  },
  {
   "obj": "person.elderly-couple",
   "at": [6, 98],
   "facing": 0
  },
  {
   "obj": "person.commuter",
   "at": [5.2, 19.6],
   "facing": 270
  },
  {
   "obj": "person.takeaway-walker",
   "at": [6, 20.4],
   "facing": 270
  },
  {
   "obj": "person.student",
   "at": [8.6, 21],
   "facing": 90
  },
  {
   "obj": "person.commuter-station",
   "at": [-9, 22],
   "facing": 90
  },
  {
   "obj": "person.phone-idler",
   "at": [-8.6, 30],
   "facing": 90
  },
  {
   "obj": "person.shopper",
   "at": [-9.4, 38],
   "facing": 90
  },
  {
   "obj": "person.commuter",
   "at": [2.2, 31],
   "facing": 270
  },
  {
   "obj": "person.student",
   "at": [1.6, 44],
   "facing": 270
  },
  {
   "obj": "street.mqn-bin",
   "at": [-11.4, 20],
   "variant": 0
  },
  {
   "obj": "street.mqn-totem",
   "at": [-11.6, 28],
   "variant": 0
  },
  {
   "obj": "building.gen-direct",
   "at": [-165, 400]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.1, 33.28]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "piazza",
   "n": 57,
   "seed": 5576
  },
  {
   "obj": "building.gen-direct",
   "at": [45.3, 33]
  },
  {
   "obj": "building.gen-direct",
   "at": [44.3, 74]
  },
  {
   "obj": "building.gen-direct",
   "at": [47, 114]
  },
  {
   "obj": "building.gen-direct",
   "at": [-50, 117]
  },
  {
   "obj": "ground.leaves",
   "at": [10.5, 21.37]
  },
  {
   "cluster": "ground.leaves",
   "on": "piazza",
   "n": 21,
   "seed": 901
  },
  {
   "obj": "person.elderly-couple-back",
   "at": [6, 98]
  },
  {
   "obj": "building.gen-direct",
   "at": [-30, 34]
  },
  {
   "obj": "street.mqn-totem",
   "at": [-12.05, 28]
  },
  {
   "obj": "street.mqn-bin",
   "at": [-10.8, 20.05]
  }],
 "landmarks": [{
   "obj": "landmark.mqn-iwm-v2",
   "at": [-49.11, 354.02],
   "variant": 0,
   "src": "https://thelowry.com/about-us/the-building/"
  }],
 "life": [{
   "who": "tram",
   "on": "tramway",
   "every": "4min"
  },
  {
   "who": "walkers",
   "on": "piazza",
   "rate": "53/min",
   "mix": {
    "commuter": 0.27,
    "stroll": 0.2,
    "takeaway-walker": 0.13,
    "student": 0.07,
    "couple": 0.07,
    "phone-idler": 0.07,
    "family": 0.07,
    "buggy": 0.07,
    "dog-walker": 0.07
   }
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
