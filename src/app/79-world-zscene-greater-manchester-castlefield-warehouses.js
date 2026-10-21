/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-castlefield-warehouses-w3: converted by `node tools/world.mjs convert uk-north-manchester-castlefield/greater-manchester-castlefield-warehouses`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (40):
     - place[0]: structure.mcf-railbridge: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mcf-railbridge-front: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mcf-railbridge-pier: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: boat.mcf-narrowboat: pixel placement unprojected to [-7, 31.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: boat.mcf-narrowboat: pixel placement unprojected to [-7.2, 51.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: boat.mcf-narrowboat: pixel placement unprojected to [7, 25] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: boat.mcf-narrowboat: pixel placement unprojected to [7.2, 44.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: boat.mcf-narrowboat: pixel placement unprojected to [7.3, 90.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: boat.mcf-narrowboat: pixel placement unprojected to [-7.4, 109.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mcf-shipping-hole: pixel placement unprojected to [-13.5, 25.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mcf-shipping-hole: pixel placement unprojected to [-8.9, 61.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[55]: plant.mcf-plane-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings[0]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mill, 6 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mill, 5 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (modern-glass, 7 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mill, 4 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.victorian-terrace: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (victorian-terrace, 3 storeys) -> one 'building.victorian-terrace' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mill, 5 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (mill, 6 storeys) -> one 'building.mill' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (modern-glass, 10 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - flows[0]: flow on ["quay-l","wharf-r"]: one population per surface is better; kept on 'quay-l' only
     - actors[0]: actor vehicle.metrolink-m5000: no life class; dropped
     - actors[1]: actor vehicle.metrolink-m5000: no life class; dropped
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[12]: repair: removed (overlap) structure.mcf-frame overlaps structure.mcf-frame (entities[11]) by 0.3 m
     - entities[13]: repair: removed (overlap) structure.mcf-frame overlaps structure.mcf-frame (entities[11]) by 0.3 m
     - entities[27]: repair: removed (overlap) street.mqn-parasol overlaps person.cafe-goer (entities[19]) by 0.274 m
     - entities[28]: repair: removed (overlap) street.mqn-parasol overlaps person.cafe-goer (entities[22]) by 0.364 m
     - life[1].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-castlefield-warehouses-w3","label":"Castlefield warehouses, Manchester","site":"Castlefield, Manchester — From Merchants' Bridge up the reach to the canal warehouses","tags":["uk","north west","greater manchester","manchester","castlefield","city","canal","warehouse","narrowboat","wharf","skyline","world-v3"],"liveSky":{"lat":53.4743,"lon":-2.2564},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.4743,
  "lon": -2.2564,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 6.2,
  "fov": 64,
  "horizon": 470,
  "heading": 52,
  "water": -0.5
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-13, 16.6],
    [13, 16.6],
    [2343.3, 3000],
    [-2343.3, 3000]]
  },
  {
   "id": "quay-l",
   "kind": "plaza",
   "poly": [[-9.5, 88],
    [-9.5, 160],
    [-9, 260],
    [-16, 260],
    [-16, 88]]
  },
  {
   "id": "wharf-r",
   "kind": "plaza",
   "poly": [[9, 4],
    [9.5, 60],
    [9.5, 120],
    [10, 170],
    [12, 210],
    [26, 210],
    [26, 4]]
  },
  {
   "id": "lawn-r",
   "kind": "grass",
   "poly": [[16, 18],
    [26, 18],
    [26, 36],
    [16, 36]]
  },
  {
   "id": "road",
   "kind": "road",
   "path": [[-80, 186],
    [80, 186]],
   "width": 7
  },
  {
   "id": "reach",
   "kind": "water",
   "water": "canal",
   "poly": [[-9, 4],
    [9, 4],
    [9.5, 60],
    [9.5, 120],
    [10, 170],
    [12, 210],
    [20, 260],
    [12, 275],
    [-9, 260],
    [-9.5, 160],
    [-9.5, 80],
    [-9.6, 29.6],
    [-19.5, 29.6],
    [-19.5, 19.5],
    [-9.2, 19.5]],
   "shallow": 0.6
  }],
 "entities": [{
   "obj": "structure.mcf-railbridge",
   "at": [7.4, 196.96],
   "variant": 16,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-railbridge-front",
   "at": [7.4, 196.96],
   "variant": 16,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-railbridge-pier",
   "at": [7.4, 196.96],
   "variant": 16,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [-7.03, 31.46],
   "variant": 10,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [-7.22, 51.81],
   "variant": 11,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [7.03, 24.98],
   "variant": 12,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [7.22, 44.42],
   "variant": 13,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [7.31, 90.72],
   "variant": 14,
   "attach": "water"
  },
  {
   "obj": "boat.mcf-narrowboat",
   "at": [-7.4, 109.18],
   "variant": 15,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-shipping-hole",
   "at": [-13.51, 25.86],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-shipping-hole",
   "at": [-8.9, 61.06],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "structure.mcf-frame",
   "at": [-11.53, 18.46],
   "variant": 0
  },
  {
   "obj": "tree.plane-avenue",
   "at": [13, 92],
   "variant": 0
  },
  {
   "obj": "tree.plane-avenue",
   "at": [14, 158],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-13, 190],
   "variant": 0
  },
  {
   "obj": "person.cafe-goer",
   "at": [12.6, 30],
   "variant": 2
  },
  {
   "obj": "person.cafe-goer",
   "at": [14, 37],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [12.8, 46],
   "variant": 0
  },
  {
   "obj": "person.cafe-goer",
   "at": [14.6, 31.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [13.4, 44.2],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [15.2, 56],
   "variant": 3
  },
  {
   "obj": "person.cafe-goer",
   "at": [16.4, 57.6],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [15.6, 33],
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [15.8, 42],
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [13.6, 33.6],
   "variant": 1
  },
  {
   "obj": "street.mcf-litter-bin",
   "at": [10.4, 40],
   "variant": 0
  },
  {
   "obj": "street.mcf-litter-bin",
   "at": [10.4, 88],
   "variant": 1
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [17.6, 66],
   "variant": 2
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [18, 70],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [16.6, 22]
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [17.4, 78],
   "facing": 270
  },
  {
   "obj": "street.mqn-lifebuoy",
   "at": [9.9, 34]
  },
  {
   "obj": "person.angler",
   "at": [-10.4, 104],
   "facing": 90
  },
  {
   "obj": "person.picnicker",
   "at": [20, 26]
  },
  {
   "obj": "street.lamppost",
   "at": [10.8, 22],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [10.8, 60],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-10.6, 100],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [11, 100],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [9.7, 26],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [9.8, 48],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [9.8, 70],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [-9.8, 120],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [-9.8, 140],
   "variant": 2
  },
  {
   "obj": "person.phone-idler",
   "at": [11, 72]
  },
  {
   "obj": "person.photographer",
   "at": [10.6, 84],
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [16, 50],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [16.6, 51],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [15.4, 52.2],
   "variant": 4
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [17.2, 49.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "water.fish-ring",
   "at": [-2, 36],
   "attach": "water"
  },
  {
   "cluster": "plant.planter",
   "on": "wharf-r",
   "n": 13,
   "seed": 8585
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 7,
   "seed": 9778
  },
  {
   "obj": "plant.planter",
   "at": [-10.23, 138.61]
  },
  {
   "obj": "building.gen-direct",
   "at": [24, 130]
  },
  {
   "obj": "plant.grass",
   "at": [16.47, 22.41]
  },
  {
   "obj": "plant.grass",
   "at": [16.37, 22.81]
  },
  {
   "obj": "plant.grass",
   "at": [16.01, 23.44]
  },
  {
   "obj": "plant.grass",
   "at": [17.43, 23.62]
  },
  {
   "obj": "plant.grass",
   "at": [16.68, 23.8]
  },
  {
   "obj": "plant.grass",
   "at": [16.85, 25.16]
  },
  {
   "obj": "plant.grass",
   "at": [16.69, 25.61]
  },
  {
   "obj": "plant.grass",
   "at": [17.65, 25.62]
  },
  {
   "obj": "plant.grass",
   "at": [17, 25.76]
  },
  {
   "obj": "plant.grass",
   "at": [18.82, 26.02]
  },
  {
   "obj": "plant.grass",
   "at": [18.7, 26.02]
  },
  {
   "obj": "plant.grass",
   "at": [18.46, 26.11]
  },
  {
   "obj": "plant.grass",
   "at": [16.53, 26.13]
  },
  {
   "obj": "plant.grass",
   "at": [18.8, 26.33]
  },
  {
   "obj": "plant.grass",
   "at": [18.78, 27.75]
  },
  {
   "obj": "plant.grass",
   "at": [17.66, 28.3]
  },
  {
   "obj": "plant.grass",
   "at": [20.69, 28.76]
  },
  {
   "obj": "plant.grass",
   "at": [20.96, 28.94]
  },
  {
   "obj": "plant.grass",
   "at": [20.81, 29.1]
  },
  {
   "obj": "plant.grass",
   "at": [21.05, 29.56]
  },
  {
   "obj": "plant.grass",
   "at": [16.15, 31.27]
  },
  {
   "obj": "plant.grass",
   "at": [20.97, 31.58]
  },
  {
   "obj": "plant.grass",
   "at": [17.3, 31.94]
  },
  {
   "obj": "plant.grass",
   "at": [17.61, 31.95]
  },
  {
   "obj": "plant.grass",
   "at": [18.46, 32.29]
  },
  {
   "obj": "plant.grass",
   "at": [22.74, 34.27]
  },
  {
   "obj": "plant.grass",
   "at": [16.63, 34.42]
  },
  {
   "obj": "plant.grass",
   "at": [20.92, 34.75]
  },
  {
   "obj": "plant.grass",
   "at": [21.21, 34.91]
  },
  {
   "cluster": "plant.grass",
   "on": "lawn-r",
   "n": 7,
   "seed": 5173
  },
  {
   "obj": "plant.grass-long",
   "at": [16.49, 23.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [16.77, 23.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [17.58, 24.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.93, 33.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [23.57, 33.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.77, 34.34]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.35, 34.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [21.66, 35.88]
  },
  {
   "obj": "plant.shrub",
   "at": [17.2, 24.63]
  },
  {
   "obj": "plant.shrub",
   "at": [16.79, 25.31]
  },
  {
   "obj": "plant.shrub",
   "at": [17.3, 25.55]
  },
  {
   "obj": "plant.shrub",
   "at": [17.16, 25.83]
  },
  {
   "obj": "plant.shrub",
   "at": [20.33, 28.44]
  },
  {
   "obj": "plant.shrub",
   "at": [17.82, 32.6]
  },
  {
   "obj": "plant.shrub",
   "at": [21.69, 34.43]
  },
  {
   "obj": "plant.shrub",
   "at": [16.86, 34.56]
  },
  {
   "obj": "plant.shrub",
   "at": [22.23, 35]
  },
  {
   "obj": "plant.shrub",
   "at": [20.95, 35.05]
  },
  {
   "obj": "plant.daisies",
   "at": [17.11, 25.59]
  },
  {
   "obj": "plant.daisies",
   "at": [20.52, 28.88]
  },
  {
   "obj": "plant.daisies",
   "at": [23.14, 31.84]
  },
  {
   "obj": "plant.daisies",
   "at": [17.14, 34.71]
  }],
 "landmarks": [{
   "obj": "landmark.beetham-tower-blade",
   "at": [205, 506],
   "src": "https://www.castlefield.org.uk"
  }],
 "life": [{
   "who": "walkers",
   "on": "quay-l",
   "rate": "5/min",
   "mix": {
    "stroll": 0.4,
    "couple": 0.2,
    "dog-walker": 0.1,
    "student": 0.1,
    "shopper": 0.1,
    "buggy": 0.1
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
   "who": "mute-swan",
   "count": 2,
   "on": "reach",
   "group": "pair"
  },
  {
   "who": "mallard",
   "count": 2,
   "on": "reach"
  },
  {
   "who": "coot",
   "count": 1,
   "on": "reach"
  },
  {
   "who": "moorhen",
   "count": 1,
   "on": "reach"
  }],
 "backdrop": {
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
