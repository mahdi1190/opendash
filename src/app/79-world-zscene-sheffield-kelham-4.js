/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-4-w3: converted by `node tools/world.mjs convert uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (40):
     - place[0]: landmark.klm-p-v4-gateway-wall: pixel placement unprojected to [-1.9, 33.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.klm-p-v4-paving-fore: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[2]: structure.klm-p-v4-paving-near: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[14]: structure.klm-p-v4-hill: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[23]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[24]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[25]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[26]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[34]: plant.klm-sycamore-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings[0]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (kelham-works, 2 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (kelham-works, 2 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (kelham-works, 4 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (kelham-flats, 6 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (kelham-flats, 5 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.kelham-works: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (kelham-works, 3 storeys) -> one 'building.kelham-works' entity at its centre: the library size replaces the authored footprint
     - buildings[8]: building.kelham-flats: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[8]: building footprint (kelham-flats, 6 storeys) -> one 'building.kelham-flats' entity at its centre: the library size replaces the authored footprint
     - flows[0]: flow on ["pave-far","pave-near"]: one population per surface is better; kept on 'pave-far' only
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[83]: repair: removed (overlap) tree.mqn-street-tree overlaps tree.mqn-street-tree (entities[4]) by 0.462 m
     - entities[6]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[5]) by 1.03 m
     - entities[7]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[5]) by 0.26 m
     - entities[8]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[6]) by 0.26 m
     - entities[74]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[12]) by 1.016 m
     - entities[75]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[13]) by 1.016 m
     - entities[76]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[14]) by 1.016 m
     - entities[81]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[16]) by 0.277 m
     - entities[82]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[17]) by 0.277 m
     - life[1].on: repair: removed (unreachable) cyclists (drive) cannot use cycle (path)
     - life[2].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-kelham-4-w3","label":"The Green Lane Works gateway, Sheffield","site":"Green Lane, Kelham Island — the Works gateway and its clock turret, cyclists and walkers","tags":["uk","yorkshire","south yorkshire","sheffield","kelham island","city","industrial heritage","street","gateway","clock tower","works","cycle route","people","world-v3"],"liveSky":{"lat":53.3911,"lon":-1.4741},"mood":"proud","colour":"teal"},
{
 "v": 3,
 "place": {
  "lat": 53.3911,
  "lon": -1.4741,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 58,
  "horizon": 610,
  "heading": 228,
  "x0": 960
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-5.1, 7.4],
    [5.1, 7.4],
    [2078.7, 3000],
    [-2078.7, 3000]]
  },
  {
   "id": "lane",
   "kind": "road",
   "path": [[27.44, -10.92],
    [-30.43, 58.02],
    [-133.31, 180.58]],
   "width": 6.6
  },
  {
   "id": "cycle",
   "kind": "path",
   "path": [[30.58, -8.28],
    [-27.29, 60.66],
    [-130.17, 183.22]],
   "width": 1.6
  },
  {
   "id": "pave-far",
   "kind": "pavement",
   "path": [[32.27, -6.87],
    [-25.6, 62.07],
    [-128.48, 184.63]],
   "width": 2.8
  },
  {
   "id": "pave-near",
   "kind": "pavement",
   "path": [[20.7, -16.58],
    [-37.17, 52.36],
    [-140.05, 174.92]],
   "width": 11
  }],
 "entities": [{
   "obj": "street.bench",
   "at": [-9.68, 19.3],
   "facing": 90
  },
  {
   "obj": "person.bench-reader",
   "at": [-9.68, 19.3],
   "facing": 90
  },
  {
   "obj": "plant.planter",
   "at": [-8.76, 13.54]
  },
  {
   "obj": "street.bench",
   "at": [-2.54, 8.31],
   "facing": 90
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-10.96, 14.3],
   "variant": 2
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-1.36, 13.74],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-17.09, 22.21],
   "variant": 2
  },
  {
   "obj": "street.lamppost",
   "at": [-26.2, 64.18]
  },
  {
   "obj": "street.lamppost",
   "at": [-45.49, 87.16]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-9.06, 26.34]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-27.06, 47.79]
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-46.35, 70.77]
  },
  {
   "obj": "street.bollard",
   "at": [5.96, 8.91]
  },
  {
   "obj": "street.bollard",
   "at": [3.39, 11.98]
  },
  {
   "obj": "street.bollard",
   "at": [0.81, 15.04]
  },
  {
   "obj": "person.couple",
   "at": [-12.75, 20.63],
   "facing": 270
  },
  {
   "obj": "person.phone-idler",
   "at": [-7.12, 20.14],
   "facing": 90
  },
  {
   "obj": "person.dog-walker",
   "at": [-11.74, 24.09],
   "facing": 90
  },
  {
   "obj": "person.student",
   "at": [-19.05, 25.79],
   "facing": 270
  },
  {
   "obj": "person.photographer",
   "at": [-2.74, 33.74],
   "facing": 90
  },
  {
   "obj": "person.couple",
   "at": [-3.7, 37.37],
   "facing": 270
  },
  {
   "obj": "person.bench-reader",
   "at": [-8.25, 42.17],
   "facing": 270
  },
  {
   "obj": "building.gen-direct",
   "at": [30.3, 7.1]
  },
  {
   "obj": "building.gen-direct",
   "at": [-18.5, 10.6]
  },
  {
   "obj": "building.gen-direct",
   "at": [13.1, 27.7]
  },
  {
   "obj": "building.gen-direct",
   "at": [-37.7, 34.9]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 5,
   "seed": 9778
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-0.42, 8.47]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-6.38, 9.09]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-1.65, 9.81]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-5.24, 10.15]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [4.37, 10.28]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-7.21, 11.3]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [0.77, 12.15]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-3.42, 12.25]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [3.51, 12.29]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-7.69, 15.01]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-7.14, 15.91]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-1.61, 15.92]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-2.69, 16]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-17.79, 34.76]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [-21.64, 38.21]
  },
  {
   "obj": "ground.leaves",
   "at": [-5.79, 36.41]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [0.49, 8.07]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-2.04, 8.18]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [4.58, 8.42]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-5.56, 8.46]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [3.25, 8.67]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [5.13, 10.05]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-5.73, 10.08]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-2.32, 10.42]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [2.6, 11.73]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [2.16, 13.52]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-7.04, 22.34]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-20.56, 28.17]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [-20.21, 31.29]
  },
  {
   "obj": "ground.leaves",
   "at": [-5.01, 8.23]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.79, 9.11]
  },
  {
   "obj": "ground.leaves",
   "at": [-4.71, 10.03]
  },
  {
   "obj": "ground.leaves",
   "at": [1.15, 10.32]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.07, 13.77]
  },
  {
   "obj": "ground.leaves",
   "at": [-7.12, 17.77]
  },
  {
   "obj": "ground.leaves",
   "at": [-12.51, 17.92]
  },
  {
   "obj": "ground.leaves",
   "at": [-10.33, 28]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [5.01, 10.26]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.13, 10.48]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.32, 10.62]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.8, 10.71]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.14, 13.36]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.67, 13.5]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-5.46, 16.14]
  },
  {
   "obj": "ground.stockyards-paving",
   "at": [0.87, 30.23]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [9.09, 19.2]
  },
  {
   "obj": "ground.stockyards-wear",
   "at": [6.12, 22.93]
  },
  {
   "obj": "street.bollard",
   "at": [5.34, 9.27]
  }],
 "landmarks": [{
   "obj": "landmark.klm-p-v4-gateway-wall",
   "at": [-1.85, 33.4],
   "src": "https://www.simt.co.uk/kelham-island-museum"
  },
  {
   "obj": "landmark.klm-chimney",
   "at": [-0.25, 96.42],
   "variant": 1,
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
    "jogger": 0.06,
    "takeaway-walker": 0.11,
    "shopper": 0.06,
    "commuter": 0.11,
    "buggy": 0.06,
    "elderly-walker": 0.06
   }
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
