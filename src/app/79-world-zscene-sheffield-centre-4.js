/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-centre-4-w3: converted by `node tools/world.mjs convert uk-north-sheffield-centre/south-yorkshire-sheffield-centre-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (12):
     - place[25]: building.shc-hills: horizon art (no foot) -> backdrop.skyline at bearing 262; check the object and the distance
     - place[26]: building.shc-hills: horizon art (no foot) -> backdrop.skyline at bearing 262; check the object and the distance
     - place[27]: building.shc-hills: horizon art (no foot) -> backdrop.skyline at bearing 262; check the object and the distance
     - place[28]: bird.pigeon-feral: pixel placement unprojected to [-44.9, 110.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[29]: bird.pigeon-feral: pixel placement unprojected to [-41.5, 110.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[30]: bird.pigeon-feral: pixel placement unprojected to [18.1, 106] m (was pinned perspective art: check it is a real object at this spot)
     - place[31]: structure.shc-deck: pixel placement unprojected to [0, 76.4] m (was pinned perspective art: check it is a real object at this spot)
     - flows[3]: flow on ["path-a","path-b","plat","square"]: one population per surface is better; kept on 'path-a' only
     - actors[0]: actor vehicle.shc-supertram: no life class; dropped
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[25].y: repair: removed (missingField) air needs y (metres above the ground)
     - life[2].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-centre-4-w3","label":"Park Hill, Sheffield","site":"From a Park Hill deck: the Supertram climbs the hill, the city and its western hills beyond","tags":["uk","yorkshire","south yorkshire","sheffield","city","townscape","tram","skyline","hills","brutalist","world-v3"],"liveSky":{"lat":53.3806,"lon":-1.4599},"mood":"cheerful","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 53.3806,
  "lon": -1.4599,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 34,
  "fov": 66,
  "horizon": 352,
  "heading": 262
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-55.8, 68.8],
    [55.8, 68.8],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "hill",
   "kind": "grass",
   "poly": [[-200, 60],
    [200, 60],
    [200, 250],
    [-200, 250]]
  },
  {
   "id": "path-a",
   "kind": "path",
   "path": [[-80, 70],
    [-30, 110],
    [-90, 150],
    [-20, 200],
    [-60, 240]],
   "width": 2.4
  },
  {
   "id": "path-b",
   "kind": "path",
   "path": [[120, 72],
    [80, 120],
    [130, 170],
    [90, 230]],
   "width": 2.4
  },
  {
   "id": "tramway",
   "kind": "tram",
   "path": [[46, 70],
    [38, 96],
    [24, 126],
    [6, 160],
    [-12, 196],
    [-28, 236],
    [-40, 270]],
   "width": 7.4
  },
  {
   "id": "rail-1",
   "kind": "rail",
   "path": [[-500, 308],
    [500, 228]],
   "width": 12
  },
  {
   "id": "plat",
   "kind": "plaza",
   "path": [[-300, 300.5],
    [300, 252.5]],
   "width": 6
  },
  {
   "id": "rail-2",
   "kind": "rail",
   "path": [[-500, 324],
    [500, 244]],
   "width": 12
  },
  {
   "id": "sheaf",
   "kind": "road",
   "path": [[-600, 318],
    [600, 300]],
   "width": 16
  },
  {
   "id": "square",
   "kind": "plaza",
   "poly": [[-100, 327],
    [80, 324],
    [80, 360],
    [-100, 362]]
  },
  {
   "id": "park-1",
   "kind": "grass",
   "poly": [[-180, 420],
    [-120, 420],
    [-120, 470],
    [-180, 470]]
  },
  {
   "id": "park-2",
   "kind": "grass",
   "poly": [[60, 690],
    [130, 690],
    [130, 740],
    [60, 740]]
  },
  {
   "id": "park-3",
   "kind": "grass",
   "poly": [[150, 520],
    [230, 520],
    [230, 560],
    [150, 560]]
  },
  {
   "id": "park-4",
   "kind": "grass",
   "poly": [[-600, 327],
    [600, 309],
    [600, 316],
    [-600, 334]]
  },
  {
   "id": "park-5",
   "kind": "grass",
   "poly": [[-280, 376],
    [-180, 376],
    [-180, 410],
    [-280, 410]]
  },
  {
   "id": "park-6",
   "kind": "grass",
   "poly": [[180, 372],
    [300, 372],
    [300, 400],
    [180, 400]]
  },
  {
   "id": "park-7",
   "kind": "grass",
   "poly": [[-60, 364],
    [40, 363],
    [40, 372],
    [-60, 373]]
  }],
 "entities": [{
   "obj": "rail.canopy",
   "at": [-190, 291.7],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "rail.canopy",
   "at": [-60, 281.3],
   "variant": 1
  },
  {
   "obj": "rail.canopy",
   "at": [40, 273.3],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "rail.canopy",
   "at": [170, 262.9],
   "variant": 0
  },
  {
   "obj": "building.tower-glass",
   "at": [-816, 1975],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "building.tower-glass",
   "at": [5, 1133],
   "variant": 0
  },
  {
   "obj": "building.tower-glass",
   "at": [168, 1363],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.tower-glass",
   "at": [50, 1275],
   "variant": 0
  },
  {
   "obj": "building.tower-stone",
   "at": [589, 1016],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.terrace-northern",
   "at": [466, 1214],
   "variant": 3
  },
  {
   "obj": "building.tower-glass",
   "at": [-452, 1163],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.tower-stone",
   "at": [-120, 1136],
   "variant": 0
  },
  {
   "obj": "building.tower-stone",
   "at": [696, 1714],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "building.tower-glass",
   "at": [354, 1227],
   "variant": 1
  },
  {
   "obj": "building.tower-stone",
   "at": [-203, 1948],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.tower-stone",
   "at": [-434, 1245],
   "variant": 2
  },
  {
   "obj": "building.tower-stone",
   "at": [793, 1456],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "building.tower-glass",
   "at": [313, 1825],
   "variant": 1
  },
  {
   "obj": "building.tower-glass",
   "at": [-895, 1932],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "building.tower-stone",
   "at": [-156, 1542],
   "variant": 1
  },
  {
   "obj": "building.tower-stone",
   "at": [565, 1096],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.tower-stone",
   "at": [-797, 1912],
   "variant": 3
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-44.85, 110.51],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-41.52, 110.22],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [18.08, 106.04],
   "variant": 1,
   "facing": 270
  },
  {
   "cluster": "tree.distant",
   "on": "park-6",
   "n": 4,
   "seed": 8515
  },
  {
   "cluster": "tree.far-broad",
   "on": "park-6",
   "n": 11,
   "seed": 1667
  },
  {
   "cluster": "tree.distant",
   "on": "park-5",
   "n": 5,
   "seed": 9389
  },
  {
   "cluster": "tree.far-broad",
   "on": "park-5",
   "n": 11,
   "seed": 8607
  },
  {
   "obj": "tree.far-birch",
   "at": [-274.49, 382.13]
  },
  {
   "cluster": "tree.bank-oak",
   "on": "hill",
   "n": 12,
   "seed": 1050
  },
  {
   "cluster": "tree.green-oak",
   "on": "hill",
   "n": 14,
   "seed": 5030
  },
  {
   "cluster": "tree.bank-birch",
   "on": "hill",
   "n": 14,
   "seed": 7366
  },
  {
   "cluster": "tree.pond-birch",
   "on": "hill",
   "n": 5,
   "seed": 5668
  },
  {
   "cluster": "plant.shrub",
   "on": "hill",
   "n": 31,
   "seed": 5065
  },
  {
   "cluster": "plant.grass-long",
   "on": "hill",
   "n": 105,
   "seed": 9658
  },
  {
   "obj": "tree.plane-avenue",
   "at": [148.39, 206.42]
  },
  {
   "cluster": "plant.wildflowers",
   "on": "hill",
   "n": 22,
   "seed": 7039
  },
  {
   "obj": "tree.far-birch",
   "at": [251.67, 394.82]
  },
  {
   "obj": "building.gen-direct",
   "at": [-20, 300]
  },
  {
   "obj": "building.gen-direct",
   "at": [-7, 396]
  },
  {
   "obj": "building.gen-direct",
   "at": [-69, 398.5]
  },
  {
   "obj": "building.gen-direct",
   "at": [189, 386]
  },
  {
   "obj": "tree.distant",
   "at": [36.63, 369.82]
  },
  {
   "obj": "tree.far-broad",
   "at": [16.26, 368.33]
  },
  {
   "obj": "tree.far-birch",
   "at": [-23.6, 366.27]
  },
  {
   "obj": "tree.far-broad",
   "at": [-191.39, 327.17]
  },
  {
   "obj": "tree.distant",
   "at": [3.62, 322.83]
  },
  {
   "obj": "tree.far-birch",
   "at": [-19.85, 322.45]
  },
  {
   "obj": "tree.far-birch",
   "at": [21.44, 322.51]
  },
  {
   "cluster": "plant.grass",
   "on": "hill",
   "n": 42,
   "seed": 2771
  }],
 "landmarks": [{
   "obj": "landmark.shc-st-pauls-tower",
   "at": [-92, 628],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  },
  {
   "obj": "landmark.shc-town-hall",
   "at": [108, 692],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  },
  {
   "obj": "landmark.shc-cathedral",
   "at": [367, 696],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  }],
 "life": [{
   "who": "tram",
   "on": "tramway",
   "every": "4min"
  },
  {
   "who": "train",
   "on": "rail-1",
   "every": "3min"
  },
  {
   "who": "walkers",
   "on": "path-a",
   "rate": "2/min",
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
  "style": "city-sheffield-hills",
  "skyline": [{
    "obj": "building.shc-hills",
    "bearing": 262,
    "dist": 1496,
    "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
   },
   {
    "obj": "building.shc-hills",
    "bearing": 262,
    "dist": 1102,
    "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
   },
   {
    "obj": "building.shc-hills",
    "bearing": 262,
    "dist": 873,
    "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
   }]
 },
 "seed": 1
});
})();
