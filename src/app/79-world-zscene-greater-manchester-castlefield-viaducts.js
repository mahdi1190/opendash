/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-castlefield-viaducts-w3: converted by `node tools/world.mjs convert uk-north-manchester-castlefield/greater-manchester-castlefield-viaducts`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (47):
     - place[0]: structure.mcf-railbridge: pixel placement unprojected to [-38.2, 28] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mcf-railbridge-front: pixel placement unprojected to [-38.2, 28] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mcf-railbridge-pier: pixel placement unprojected to [-38.2, 28] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.mcf-railbridge: pixel placement unprojected to [-6.5, 31.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.mcf-railbridge-front: pixel placement unprojected to [-6.5, 31.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.mcf-railbridge-pier: pixel placement unprojected to [-6.5, 31.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.mcf-railbridge: pixel placement unprojected to [25.3, 35.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.mcf-railbridge-front: pixel placement unprojected to [25.3, 35.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.mcf-railbridge-pier: pixel placement unprojected to [25.3, 35.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mcf-railbridge: pixel placement unprojected to [57, 39.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mcf-railbridge-front: pixel placement unprojected to [57, 39.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mcf-railbridge-pier: pixel placement unprojected to [57, 39.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.mcf-railbridge: pixel placement unprojected to [88.8, 43.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.mcf-railbridge-front: pixel placement unprojected to [88.8, 43.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: structure.mcf-railbridge-pier: pixel placement unprojected to [88.8, 43.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[15]: structure.mcf-railbridge: pixel placement unprojected to [-0.4, 48.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: structure.mcf-railbridge-front: pixel placement unprojected to [-0.4, 48.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[17]: boat.mcf-narrowboat: pixel placement unprojected to [-3.2, 16.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[18]: boat.mcf-narrowboat: pixel placement unprojected to [-3.3, 30.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[19]: boat.mcf-narrowboat: pixel placement unprojected to [3.2, 54.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: structure.mcf-frame: pixel placement unprojected to [-4.3, 6.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[55]: plant.mcf-plane-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings[0]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mill, 5 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mill, 4 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (modern-glass, 14 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (modern-glass, 18 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (modern-glass, 11 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - flows[0]: flow on ["tow","square"]: one population per surface is better; kept on 'tow' only
     - actors[0]: actor vehicle.metrolink-m5000: no life class; dropped
     - actors[1]: actor vehicle.metrolink-m5000: no life class; dropped
     - actors[2]: actor rail.train: no life class; dropped
     - actors[9]: actor bird.goose: no life class; dropped
     - actors[10]: actor bird.goose: no life class; dropped
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[18]: repair: removed (overlap) boat.mcf-narrowboat overlaps structure.mcf-railbridge-pier (entities[5]) by 2.1 m
     ... and 7 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-castlefield-viaducts-w3","label":"Castlefield viaducts, Manchester","site":"Castlefield, Manchester — Under the viaducts at Castlefield Junction: trams, trains and the sky park","tags":["uk","north west","greater manchester","manchester","castlefield","city","canal","viaduct","tram","railway","towpath","narrowboat","world-v3"],"liveSky":{"lat":53.4738,"lon":-2.2553},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.4738,
  "lon": -2.2553,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 1.65,
  "fov": 68,
  "horizon": 590,
  "heading": 248,
  "water": -0.6
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-4.8, 5.7],
    [4.8, 5.7],
    [2529.4, 3000],
    [-2529.4, 3000]]
  },
  {
   "id": "tow",
   "kind": "towpath",
   "poly": [[6, 2],
    [6.2, 30],
    [5.6, 60],
    [3.5, 100],
    [-2, 150],
    [-12, 210],
    [-8, 210],
    [2, 150],
    [7.5, 100],
    [9.6, 60],
    [10.2, 30],
    [10, 2]]
  },
  {
   "id": "bank-r",
   "kind": "grass",
   "poly": [[10, 2],
    [10.2, 30],
    [9.6, 60],
    [7.5, 100],
    [2, 150],
    [12, 150],
    [16, 100],
    [24, 60],
    [28, 2]]
  },
  {
   "id": "square",
   "kind": "plaza",
   "poly": [[-5.5, 2],
    [-6, 30],
    [-7, 60],
    [-10, 100],
    [-16, 150],
    [-60, 150],
    [-60, 2]]
  },
  {
   "id": "lawn-l",
   "kind": "grass",
   "poly": [[-14, 30],
    [-16, 56],
    [-40, 56],
    [-40, 30]]
  },
  {
   "id": "cut",
   "kind": "water",
   "water": "canal",
   "poly": [[-5.5, 2],
    [6, 2],
    [6.2, 30],
    [5.6, 60],
    [3.5, 100],
    [-2, 150],
    [-12, 210],
    [-26, 280],
    [-44, 360],
    [-58, 360],
    [-40, 280],
    [-26, 210],
    [-16, 150],
    [-10, 100],
    [-7, 60],
    [-6, 30]],
   "shallow": 0.6
  }],
 "entities": [{
   "obj": "structure.mcf-railbridge",
   "at": [-38.23, 27.96],
   "variant": 10
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [-38.23, 27.96],
   "variant": 10
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [-38.23, 27.96],
   "variant": 10
  },
  {
   "obj": "structure.mcf-railbridge",
   "at": [-6.49, 31.92],
   "variant": 11
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [-6.49, 31.92],
   "variant": 11
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [-6.49, 31.92],
   "variant": 11
  },
  {
   "obj": "structure.mcf-railbridge",
   "at": [25.26, 35.91],
   "variant": 12
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [25.26, 35.91],
   "variant": 12
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [25.26, 35.91],
   "variant": 12
  },
  {
   "obj": "structure.mcf-railbridge",
   "at": [56.98, 39.86],
   "variant": 13
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [56.98, 39.86],
   "variant": 13
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [56.98, 39.86],
   "variant": 13
  },
  {
   "obj": "structure.mcf-railbridge",
   "at": [88.83, 43.88],
   "variant": 14
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [88.83, 43.88],
   "variant": 14
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [88.83, 43.88],
   "variant": 14
  },
  {
   "obj": "structure.mcf-railbridge",
   "at": [-0.44, 48.8],
   "variant": 15,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [-0.44, 48.8],
   "variant": 15,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [-3.15, 16.13],
   "variant": 7,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [3.22, 54.21],
   "variant": 9,
   "attach": "water"
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-22, 40],
   "variant": 0
  },
  {
   "obj": "tree.bank-birch",
   "at": [14, 30],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.bank-willow",
   "at": [13, 52],
   "variant": 0
  },
  {
   "obj": "tree.bank-alder",
   "at": [10, 124],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.bank-oak",
   "at": [-20, 122],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.plane-avenue",
   "at": [16, 92],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [10.6, 18],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-7.5, 20],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [10.4, 40],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-8.4, 46],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [-9, 17],
   "facing": 90
  },
  {
   "obj": "person.bench-sitter",
   "at": [-9, 17.05],
   "facing": 90
  },
  {
   "obj": "person.angler",
   "at": [6.7, 24],
   "facing": 270
  },
  {
   "obj": "person.child-scooter",
   "at": [-15, 36]
  },
  {
   "obj": "person.photographer",
   "at": [-26, 52],
   "facing": 0
  },
  {
   "obj": "person.phone-idler",
   "at": [-12.5, 30],
   "facing": 90
  },
  {
   "obj": "street.mcf-litter-bin",
   "at": [-6.6, 11.2],
   "variant": 1
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [-7.4, 13.6],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-6.6, 24]
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-19, 24],
   "variant": 1
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-23, 27],
   "variant": 0
  },
  {
   "obj": "street.mcf-litter-bin",
   "at": [10.8, 30],
   "variant": 0
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [10.6, 52]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.2, 7.8],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-5.9, 9.2],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [6.9, 8.6],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [7.4, 10.2],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.2, 10.2],
   "variant": 4
  },
  {
   "obj": "water.fish-ring",
   "at": [1, 18],
   "attach": "water"
  },
  {
   "obj": "building.gen-direct",
   "at": [-38, 160]
  },
  {
   "obj": "building.gen-direct",
   "at": [35, 163]
  },
  {
   "obj": "building.gen-direct",
   "at": [43, 393]
  },
  {
   "obj": "plant.grass",
   "at": [10.97, 15.84]
  },
  {
   "obj": "plant.grass",
   "at": [10.53, 16.57]
  },
  {
   "obj": "plant.grass",
   "at": [14.19, 18.06]
  },
  {
   "obj": "plant.grass",
   "at": [13.29, 18.78]
  },
  {
   "obj": "plant.grass",
   "at": [14.09, 19.41]
  },
  {
   "obj": "plant.grass",
   "at": [14.78, 19.9]
  },
  {
   "obj": "plant.grass",
   "at": [11.09, 20.99]
  },
  {
   "obj": "plant.grass",
   "at": [10.32, 23.46]
  },
  {
   "obj": "plant.grass",
   "at": [16.56, 23.52]
  },
  {
   "obj": "plant.grass",
   "at": [16.47, 24.01]
  },
  {
   "obj": "plant.grass",
   "at": [18.94, 24.16]
  },
  {
   "obj": "plant.grass",
   "at": [12.8, 24.19]
  },
  {
   "obj": "plant.grass",
   "at": [18.88, 24.27]
  },
  {
   "obj": "plant.grass",
   "at": [13.62, 24.66]
  },
  {
   "obj": "plant.grass",
   "at": [14.46, 25.51]
  },
  {
   "obj": "plant.grass",
   "at": [11.97, 26.3]
  },
  {
   "obj": "plant.grass",
   "at": [15.7, 29.99]
  },
  {
   "obj": "plant.grass",
   "at": [16.3, 30.74]
  },
  {
   "obj": "plant.grass",
   "at": [12.98, 34.06]
  },
  {
   "obj": "plant.grass",
   "at": [17.79, 34.16]
  },
  {
   "obj": "plant.grass",
   "at": [15.7, 34.35]
  },
  {
   "cluster": "plant.grass",
   "on": "bank-r",
   "n": 9,
   "seed": 9476
  },
  {
   "obj": "plant.planter",
   "at": [-12.3, 18.82]
  },
  {
   "obj": "plant.planter",
   "at": [-8.83, 19.1]
  },
  {
   "cluster": "plant.planter",
   "on": "square",
   "n": 8,
   "seed": 7483
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-15.97, 25.1]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-17.34, 26.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-12.82, 27.77]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-19.55, 27.94]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-20.41, 29.53]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "square",
   "n": 7,
   "seed": 7917
  },
  {
   "obj": "plant.grass-long",
   "at": [10.46, 15.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.53, 15.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.79, 15.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.12, 15.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.45, 16.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.8, 17.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.47, 17.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [12.35, 17.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [12.31, 17.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.24, 17.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.64, 18.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [14.07, 18.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.95, 20.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.33, 21.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.17, 21.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [17.77, 22.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [12.41, 22.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.54, 23.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [18.68, 23.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [16.03, 24.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.41, 24.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.27, 25.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.98, 25.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.87, 25.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.52, 26.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.31, 26.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.42, 26.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.2, 26.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.26, 30.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [18.02, 31.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [25.53, 32.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [12.55, 33.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [18.47, 34.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.21, 34.87]
  },
  {
   "cluster": "plant.grass-long",
   "on": "bank-r",
   "n": 14,
   "seed": 1765
  },
  {
   "obj": "ground.leaves",
   "at": [-19.7, 28.66]
  },
  {
   "obj": "ground.leaves",
   "at": [-18.58, 29.53]
  },
  {
   "obj": "ground.leaves",
   "at": [-8.15, 30.27]
  },
  {
   "cluster": "ground.leaves",
   "on": "square",
   "n": 5,
   "seed": 3115
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.14, 17.88]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.03, 19.06]
  },
  {
   "obj": "plant.wildflowers",
   "at": [12.23, 22.69]
  },
  {
   "obj": "plant.wildflowers",
   "at": [19.99, 25.04]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.81, 26.84]
  },
  {
   "obj": "plant.wildflowers",
   "at": [15.06, 26.97]
  },
  {
   "obj": "plant.wildflowers",
   "at": [20.74, 27.91]
  },
  {
   "cluster": "plant.wildflowers",
   "on": "bank-r",
   "n": 4,
   "seed": 3741
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.65, 30.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-18.2, 31.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.27, 32.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-18.96, 45.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-38.12, 55.95]
  },
  {
   "obj": "plant.shrub",
   "at": [-23.61, 31.03]
  },
  {
   "obj": "plant.shrub",
   "at": [-14.75, 31.1]
  },
  {
   "obj": "plant.shrub",
   "at": [-19.76, 32.54]
  },
  {
   "obj": "plant.shrub",
   "at": [-25.41, 34.17]
  },
  {
   "obj": "plant.shrub",
   "at": [-15.57, 44.4]
  },
  {
   "obj": "plant.shrub",
   "at": [-36.67, 50.27]
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [9.71, 51.98]
  },
  {
   "obj": "plant.grass",
   "at": [-14.68, 30.01]
  },
  {
   "obj": "plant.grass",
   "at": [-22.79, 30.19]
  },
  {
   "obj": "plant.grass",
   "at": [-18.26, 31.17]
  },
  {
   "obj": "plant.grass",
   "at": [-18.82, 31.19]
  },
  {
   "obj": "plant.grass",
   "at": [-14.18, 31.31]
  },
  {
   "obj": "plant.grass",
   "at": [-15.55, 31.43]
  },
  {
   "obj": "plant.grass",
   "at": [-15.31, 31.47]
  },
  {
   "obj": "plant.grass",
   "at": [-21.84, 31.83]
  },
  {
   "obj": "plant.grass",
   "at": [-22.8, 31.86]
  },
  {
   "obj": "plant.grass",
   "at": [-24.54, 31.99]
  },
  {
   "obj": "plant.grass",
   "at": [-14.31, 32.12]
  },
  {
   "obj": "plant.grass",
   "at": [-15.03, 32.41]
  },
  {
   "obj": "plant.grass",
   "at": [-21.79, 32.61]
  },
  {
   "obj": "plant.grass",
   "at": [-14.8, 32.95]
  },
  {
   "obj": "plant.grass",
   "at": [-15.47, 33.62]
  },
  {
   "obj": "plant.grass",
   "at": [-20.59, 33.71]
  },
  {
   "obj": "plant.grass",
   "at": [-24.62, 34.68]
  },
  {
   "cluster": "plant.grass",
   "on": "lawn-l",
   "n": 11,
   "seed": 4762
  },
  {
   "obj": "plant.daisies",
   "at": [-23.87, 32.34]
  },
  {
   "obj": "plant.daisies",
   "at": [-19.47, 32.45]
  },
  {
   "obj": "plant.daisies",
   "at": [-25.25, 32.62]
  },
  {
   "obj": "plant.daisies",
   "at": [-27.22, 40.48]
  },
  {
   "obj": "plant.daisies",
   "at": [-20.52, 47.44]
  },
  {
   "obj": "plant.daisies",
   "at": [-29.8, 48.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.68, 13.04]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.76, 14.09]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.58, 31.9]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.32, 34.24]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "tow",
   "n": 4,
   "seed": 4818
  },
  {
   "obj": "ground.leaves",
   "at": [7.15, 10.21]
  },
  {
   "obj": "ground.leaves",
   "at": [6.83, 16.13]
  },
  {
   "obj": "ground.leaves",
   "at": [9.66, 17.61]
  },
  {
   "obj": "ground.leaves",
   "at": [7.8, 28.03]
  },
  {
   "obj": "ground.leaves",
   "at": [8.4, 32.17]
  },
  {
   "obj": "ground.leaves",
   "at": [9.26, 32.48]
  },
  {
   "obj": "ground.leaves",
   "at": [7.16, 32.85]
  },
  {
   "obj": "ground.leaves",
   "at": [6.36, 33.39]
  },
  {
   "obj": "ground.leaves",
   "at": [9.88, 40.75]
  },
  {
   "obj": "street.lamppost",
   "at": [10.06, 18]
  },
  {
   "obj": "street.lamppost",
   "at": [9.95, 39.99]
  },
  {
   "obj": "plant.shrub",
   "at": [13.11, 18.33]
  },
  {
   "obj": "plant.shrub",
   "at": [12.38, 19.35]
  },
  {
   "obj": "plant.shrub",
   "at": [14.03, 25.04]
  },
  {
   "obj": "plant.shrub",
   "at": [15.95, 28.09]
  },
  {
   "obj": "plant.shrub",
   "at": [16.6, 29.49]
  },
  {
   "obj": "plant.shrub",
   "at": [11.71, 30.02]
  },
  {
   "obj": "plant.shrub",
   "at": [15.32, 33.94]
  },
  {
   "obj": "plant.shrub",
   "at": [16.63, 36.99]
  },
  {
   "obj": "plant.shrub",
   "at": [17.38, 37.86]
  },
  {
   "obj": "street.mcf-litter-bin",
   "at": [10.15, 30]
  }],
 "life": [{
   "who": "walkers",
   "on": "tow",
   "rate": "5/min",
   "mix": {
    "stroll": 0.44,
    "dog-walker": 0.22,
    "jogger": 0.11,
    "student": 0.11,
    "commuter": 0.11
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
   "who": "mallard",
   "count": 1,
   "on": "cut"
  },
  {
   "who": "moorhen",
   "count": 1,
   "on": "cut"
  },
  {
   "who": "coot",
   "count": 1,
   "on": "cut"
  }],
 "backdrop": {
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
