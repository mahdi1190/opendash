/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-centre-3-w3: converted by `node tools/world.mjs convert uk-north-sheffield-centre/south-yorkshire-sheffield-centre-3`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (33):
     - place[0]: structure.shc-cutting-edge: pixel placement unprojected to [7.4, 12.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.shc-cutting-edge: pixel placement unprojected to [8.2, 17.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.shc-cutting-edge: pixel placement unprojected to [8.4, 23.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.shc-cutting-edge: pixel placement unprojected to [7.8, 28.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.shc-cutting-edge: pixel placement unprojected to [6.5, 34.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.shc-cutting-edge: pixel placement unprojected to [4.8, 39.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.shc-cutting-edge: pixel placement unprojected to [2.7, 44.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.shc-cutting-edge: pixel placement unprojected to [0.5, 49.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.shc-cutting-edge: pixel placement unprojected to [-1.8, 54.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.shc-cutting-edge: pixel placement unprojected to [-4, 59.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.shc-cutting-edge: pixel placement unprojected to [-5.9, 64.7] m (was pinned perspective art: check it is a real object at this spot)
     - flows[0]: flow on ["sq","forecourt"]: one population per surface is better; kept on 'sq' only
     - flows[1]: flow on ["pave-n","pave-s"]: one population per surface is better; kept on 'pave-n' only
     - actors[0]: actor vehicle.shc-supertram: no life class; dropped
     - actors[1]: actor vehicle.shc-supertram: no life class; dropped
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[49].at: repair: removed (badAttach) person.child-ball stands on the ground but (-2, 47) is water
     - entities[1]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[0]) by 0.56 m
     - entities[2]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[1]) by 0.51 m
     - entities[3]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[2]) by 0.55 m
     - entities[4]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[3]) by 0.66 m
     - entities[5]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[4]) by 0.79 m
     - entities[6]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[5]) by 0.92 m
     - entities[7]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[6]) by 0.98 m
     - entities[8]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[7]) by 0.99 m
     - entities[9]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[8]) by 0.95 m
     - entities[10]: repair: removed (overlap) structure.shc-cutting-edge overlaps structure.shc-cutting-edge (entities[9]) by 0.9 m
     - entities[35]: repair: removed (overlap) street.mqn-planter-grass overlaps structure.shc-cutting-edge (entities[10]) by 0.07 m
     - landmarks[0]: repair: removed (overlap) landmark.shc-station overlaps vehicle.taxi-black (entities[14]) by 0.3 m
     - entities[79]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[43]) by 0.277 m
     - entities[78]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[44]) by 0.277 m
     - entities[84]: repair: removed (blocksPath) building.gen-direct covers the whole width of pave-n
     - life[2].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-centre-3-w3","label":"Sheaf Square, Sheffield","site":"Sheaf Square: the Cutting Edge runs down to the station, Park Hill on the hill above","tags":["uk","yorkshire","south yorkshire","sheffield","city","townscape","station","sculpture","steel","tram","world-v3"],"liveSky":{"lat":53.3786,"lon":-1.4656},"mood":"cheerful","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.3786,
  "lon": -1.4656,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 4.6,
  "fov": 66,
  "horizon": 404,
  "heading": 104,
  "water": -0.25
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-8.3, 10.3],
    [8.3, 10.3],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "sheaf",
   "kind": "road",
   "path": [[-260, 103.6],
    [260, 72.4]],
   "width": 14
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[-260.54, 94.62],
    [259.46, 63.42]],
   "width": 4
  },
  {
   "id": "pave-s",
   "kind": "pavement",
   "path": [[-259.43, 113.08],
    [260.57, 81.88]],
   "width": 5
  },
  {
   "id": "xing",
   "kind": "road",
   "path": [[-6, 81.36],
    [-6, 95.36]],
   "width": 4.4
  },
  {
   "id": "sq",
   "kind": "plaza",
   "poly": [[-20.5, 11],
    [5, 11],
    [4.8, 12.5],
    [5.6, 18],
    [5.8, 24],
    [5, 30],
    [3.4, 36],
    [1.2, 42],
    [-1.4, 48],
    [-4.2, 54],
    [-6.8, 60],
    [-9, 66],
    [-9, 68],
    [40, 68],
    [40, 80.5],
    [-20.5, 80.5]]
  },
  {
   "id": "rank",
   "kind": "plaza",
   "poly": [[-80, 99],
    [60, 98.5],
    [60, 104],
    [-80, 104.5]]
  },
  {
   "id": "forecourt",
   "kind": "plaza",
   "poly": [[-200, 104.5],
    [200, 102],
    [200, 116],
    [-200, 116]]
  },
  {
   "id": "station",
   "kind": "plaza",
   "poly": [[-200, 116],
    [200, 116],
    [200, 140],
    [-200, 140]]
  },
  {
   "id": "hall",
   "kind": "plaza",
   "poly": [[-50, 12],
    [-21, 12],
    [-21, 74],
    [-50, 74]]
  },
  {
   "id": "bed",
   "kind": "grass",
   "poly": [[-19.5, 16],
    [-12.5, 16],
    [-12.5, 40],
    [-19.5, 40]]
  },
  {
   "id": "slope",
   "kind": "grass",
   "poly": [[-260, 140],
    [260, 140],
    [260, 600],
    [-260, 600]]
  },
  {
   "id": "pit-0",
   "kind": "grass",
   "poly": [[-16.2, 18.8],
    [-13.8, 18.8],
    [-13.8, 21.2],
    [-16.2, 21.2]]
  },
  {
   "id": "pit-1",
   "kind": "grass",
   "poly": [[-15.2, 25.8],
    [-12.8, 25.8],
    [-12.8, 28.2],
    [-15.2, 28.2]]
  },
  {
   "id": "pit-2",
   "kind": "grass",
   "poly": [[-18.2, 58.8],
    [-15.8, 58.8],
    [-15.8, 61.2],
    [-18.2, 61.2]]
  },
  {
   "id": "pit-3",
   "kind": "grass",
   "poly": [[12.8, 34.8],
    [15.2, 34.8],
    [15.2, 37.2],
    [12.8, 37.2]]
  },
  {
   "id": "pool-1",
   "kind": "water",
   "water": "pond",
   "poly": [[-4.6, 24],
    [1.6, 24],
    [1.2, 31],
    [-4.8, 31]],
   "shallow": 1.5
  },
  {
   "id": "pool-2",
   "kind": "water",
   "water": "pond",
   "poly": [[-5.6, 34],
    [0.4, 34],
    [-0.4, 42],
    [-6.2, 42]],
   "shallow": 1.5
  },
  {
   "id": "pool-3",
   "kind": "water",
   "water": "pond",
   "poly": [[-7, 45],
    [-1.2, 45],
    [-2.4, 54],
    [-8, 54]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "structure.shc-cutting-edge",
   "at": [7.4, 12.5],
   "variant": 0
  },
  {
   "obj": "vehicle.taxi-black",
   "at": [-34, 101.5],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "vehicle.taxi-black",
   "at": [-26, 101.5],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "vehicle.taxi-black",
   "at": [-18, 101.5],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "vehicle.taxi-black",
   "at": [16, 101.5],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "vehicle.taxi-black",
   "at": [24, 101.5],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [-15, 20],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [-14, 27],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [-17, 60],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [14, 36],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-52, 113],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-30, 114],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [40, 112],
   "variant": 2
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [64, 111],
   "variant": 0
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-15.6, 43],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-15.6, 44.8],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-15.6, 46.6],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-15.6, 48.4],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [14, 16],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [22, 30],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [12, 52],
   "variant": 1
  },
  {
   "obj": "person.photographer",
   "at": [0.6, 18.5],
   "facing": 90
  },
  {
   "obj": "person.phone-idler",
   "at": [-3.4, 16.8],
   "variant": 2
  },
  {
   "obj": "person.wheelchair-user",
   "at": [-11.4, 22],
   "variant": 1
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-13.6, 30],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [6.4, 70],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-12, 46],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [5.4, 58],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-8.6, 74],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-34, 107],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [30, 106],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-20, 96],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [-14, 96],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [6, 95.5],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [-11.5, 36],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.skateboarder",
   "at": [-1, 20]
  },
  {
   "obj": "person.skateboarder",
   "at": [-12.4, 44],
   "variant": 2
  },
  {
   "obj": "person.bench-sitter",
   "at": [-11, 16.7]
  },
  {
   "obj": "person.couple",
   "at": [3, 18]
  },
  {
   "obj": "person.phone-idler",
   "at": [-12, 62]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.76, 20.72],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.13, 22.64],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.62, 20.24],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-3.07, 21.32],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-2.14, 23.03],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.07, 43.81],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.72, 43.18],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-5.65, 42.96],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-8.15, 43.16],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-3.06, 58.51],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-2.28, 57.73],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.43, 59.77],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.76, 59.3],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-4.03, 56.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-3.73, 13.86],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.21, 13.55],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-5.27, 14.19],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.42, 13.25],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-3.59, 14.62],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "street.lamppost",
   "at": [-6.6, 13.2],
   "variant": 3
  },
  {
   "cluster": "tree.far-birch",
   "on": "slope",
   "n": 19,
   "seed": 2006
  },
  {
   "cluster": "tree.far-broad",
   "on": "slope",
   "n": 39,
   "seed": 6871
  },
  {
   "obj": "tree.distant",
   "at": [-147.57, 307.94]
  },
  {
   "obj": "tree.distant",
   "at": [56.45, 332.6]
  },
  {
   "obj": "tree.distant",
   "at": [-141.61, 351.24]
  },
  {
   "cluster": "tree.wyv-far-oak",
   "on": "slope",
   "n": 14,
   "seed": 1622
  },
  {
   "obj": "street.bollard",
   "at": [-19.98, 96.26]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "land",
   "n": 15,
   "seed": 7328
  },
  {
   "obj": "ground.leaves",
   "at": [20.55, 32.07]
  },
  {
   "cluster": "ground.leaves",
   "on": "land",
   "n": 16,
   "seed": 6798
  },
  {
   "obj": "person.child-ball",
   "at": [-1.41, 47.26]
  },
  {
   "obj": "plant.shrub",
   "at": [-14.06, 18.38]
  },
  {
   "obj": "plant.shrub",
   "at": [-12.51, 18.54]
  },
  {
   "obj": "plant.shrub",
   "at": [-12.67, 18.59]
  },
  {
   "obj": "plant.shrub",
   "at": [-13.44, 19.62]
  },
  {
   "obj": "plant.shrub",
   "at": [-13.45, 20.02]
  },
  {
   "obj": "plant.shrub",
   "at": [-13.67, 20.56]
  },
  {
   "obj": "plant.shrub",
   "at": [-13.37, 21.8]
  },
  {
   "obj": "plant.shrub",
   "at": [-13.83, 21.91]
  },
  {
   "obj": "plant.shrub",
   "at": [-16.2, 22.46]
  },
  {
   "obj": "plant.shrub",
   "at": [-16.22, 23.66]
  },
  {
   "obj": "plant.shrub",
   "at": [-15.85, 24.26]
  },
  {
   "obj": "plant.shrub",
   "at": [-16.51, 25.59]
  },
  {
   "obj": "plant.shrub",
   "at": [-15.4, 26.11]
  },
  {
   "obj": "plant.shrub",
   "at": [-16.46, 28.49]
  },
  {
   "obj": "plant.shrub",
   "at": [-15.98, 30.53]
  },
  {
   "obj": "plant.shrub",
   "at": [-14.24, 31.84]
  },
  {
   "obj": "plant.shrub",
   "at": [-16.64, 36.3]
  },
  {
   "obj": "plant.shrub",
   "at": [-15.77, 37.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.43, 17.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.8, 20.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.45, 21.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.66, 22.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.79, 22.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.69, 23.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.56, 23.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.59, 23.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.95, 24.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.25, 24.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.87, 25.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.82, 26.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.66, 26.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.2, 28.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.38, 30.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.94, 30.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-18.64, 33.71]
  },
  {
   "cluster": "plant.grass-long",
   "on": "bed",
   "n": 5,
   "seed": 9568
  },
  {
   "obj": "plant.wildflowers",
   "at": [-13.17, 17.44]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.53, 21.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.87, 22.84]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.78, 22.96]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.87, 23.53]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-17.29, 32.1]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.66, 32.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-12.76, 33.52]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-16.7, 33.63]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-13.63, 35.53]
  },
  {
   "obj": "building.gen-direct",
   "at": [-38, 39]
  }],
 "landmarks": [{
   "obj": "landmark.shc-park-hill",
   "at": [-30, 430],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  }],
 "life": [{
   "who": "walkers",
   "on": "sq",
   "rate": "7/min",
   "mix": {
    "stroll": 0.77,
    "dog-walker": 0.08,
    "jogger": 0.08,
    "family": 0.08
   }
  },
  {
   "who": "walkers",
   "on": "pave-n",
   "rate": "3/min",
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
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
