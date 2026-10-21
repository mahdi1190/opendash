/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-3-w3: converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-3`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (29):
     - place[0]: landmark.mcr-midland-hotel: pixel placement unprojected to [72, 68] m (was pinned perspective art: check it is a real object at this spot)
     - place[0]: landmark landmark.mcr-midland-hotel: src is a placeholder; give the listing or map reference
     - place[1]: building.mcr-glass-tower: pixel placement unprojected to [-62, 30] m (was pinned perspective art: check it is a real object at this spot)
     - place[35]: structure.mcr-portico-column: pixel placement unprojected to [6.4, 9.1] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (modern-glass, 9 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.modern-glass: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (modern-glass, 12 storeys) -> one 'building.modern-glass' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (mcr-palazzo, 4 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (mcr-palazzo, 6 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - buildings[8]: building.mcr-palazzo: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[8]: building footprint (mcr-palazzo, 5 storeys) -> one 'building.mcr-palazzo' entity at its centre: the library size replaces the authored footprint
     - flows[4]: flow on ["plat-l","plat-r"]: one population per surface is better; kept on 'plat-l' only
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[21].at: repair: removed (badAttach) bird.pigeon stands on the tram line
     - entities[23].at: repair: removed (badAttach) bird.pigeon-feral stands on the tram line
     - entities[37].at: repair: removed (badAttach) building.gen-direct stands on the tram line
     - landmarks[0]: repair: removed (blocksPath) landmark.mcr-midland-hotel covers the whole width of pave-n
     - life[1].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-manchester-centre-3-w3","label":"Peter Street, Manchester","site":"Peter Street — trams curve past the Midland Hotel's red terracotta","tags":["uk","north west","greater manchester","manchester","city","civic","midland hotel","metrolink","tram","terracotta","street","world-v3"],"liveSky":{"lat":53.4779,"lon":-2.2442},"mood":"energetic","colour":"red"},
{
 "v": 3,
 "place": {
  "lat": 53.4779,
  "lon": -2.2442,
  "region": "greater-manchester"
 },
 "camera": {
  "eye": 2.6,
  "fov": 72,
  "horizon": 585,
  "heading": 214
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-7.4, 8.2],
    [7.4, 8.2],
    [2724.5, 3000],
    [-2724.5, 3000]]
  },
  {
   "id": "peter",
   "kind": "road",
   "path": [[-160, 72],
    [0, 64],
    [160, 56]],
   "width": 10
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[-160.35, 65.01],
    [-0.35, 57.01],
    [159.65, 49.01]],
   "width": 4
  },
  {
   "id": "pave-s",
   "kind": "pavement",
   "path": [[-159.64, 79.24],
    [0.36, 71.24],
    [160.36, 63.24]],
   "width": 4.5
  },
  {
   "id": "tram",
   "kind": "tram",
   "path": [[3, 4],
    [1, 30],
    [-5, 60],
    [-15, 100],
    [-30, 160],
    [-50, 240]],
   "width": 7
  },
  {
   "id": "plat-l",
   "kind": "plaza",
   "path": [[-4.4, 8],
    [-5.6, 30],
    [-8.6, 52]],
   "width": 3.6
  },
  {
   "id": "plat-r",
   "kind": "plaza",
   "path": [[10, 8],
    [8.6, 30],
    [5, 52]],
   "width": 3.6
  },
  {
   "id": "sq-l",
   "kind": "plaza",
   "poly": [[-44, 6],
    [-7, 6],
    [-8.4, 30],
    [-11.6, 52],
    [-44, 54]]
  },
  {
   "id": "sq-r",
   "kind": "plaza",
   "poly": [[12.4, 6],
    [44, 6],
    [44, 50],
    [7.8, 50],
    [11, 30]]
  }],
 "entities": [{
   "obj": "building.mcr-glass-tower",
   "at": [-62.02, 30.01],
   "variant": 0
  },
  {
   "obj": "street.mcr-tram-shelter",
   "at": [-5.48, 27.88],
   "variant": 0,
   "facing": 357
  },
  {
   "obj": "street.mcr-tram-shelter",
   "at": [7.86, 34.5],
   "variant": 1,
   "facing": 351
  },
  {
   "obj": "person.phone-idler",
   "at": [-5.48, 21.23],
   "facing": 357
  },
  {
   "obj": "person.elderly-walker",
   "at": [9.01, 23.49],
   "variant": 2,
   "facing": 356
  },
  {
   "obj": "person.student",
   "at": [6.08, 43.19],
   "facing": 351
  },
  {
   "obj": "street.lamppost",
   "at": [-17.5, 24.5]
  },
  {
   "obj": "street.lamppost",
   "at": [17, 31]
  },
  {
   "obj": "street.lamppost",
   "at": [-20, 50]
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [-19, 33],
   "variant": 2
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [22, 44],
   "variant": 1
  },
  {
   "obj": "structure.mcr-planter",
   "at": [-11, 13],
   "variant": 1
  },
  {
   "obj": "person.bench-sitter",
   "at": [-10, 12.8],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-3.28, 8.5],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-4.01, 9.3],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.7, 8.9],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-4.6, 9.38],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [-4.7, 11.74],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [-6.94, 12.1],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.16, 11.68],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.31, 11.22],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [6.83, 8.85],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.45, 19.99],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.48, 19.23],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [-7.31, 19.82],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-4.68, 20.64],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.mcr-street-tree",
   "at": [17.5, 15],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.mcr-bin",
   "at": [-8.4, 12.4],
   "variant": 1
  },
  {
   "obj": "street.mcr-bin",
   "at": [14.6, 21.5]
  },
  {
   "obj": "street.mcr-cycle-stand",
   "at": [-14, 22.5],
   "variant": 1
  },
  {
   "obj": "street.mcr-totem",
   "at": [12.9, 21],
   "variant": 0
  },
  {
   "obj": "person.bench-reader",
   "at": [21, 30],
   "variant": 1
  },
  {
   "obj": "structure.mcr-portico-column",
   "at": [6.44, 9.09]
  },
  {
   "obj": "building.gen-direct",
   "at": [161.2, 34.9]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 7,
   "seed": 9778
  },
  {
   "obj": "ground.leaves",
   "at": [24.78, 39.75]
  },
  {
   "obj": "ground.leaves",
   "at": [-9.35, 17.74]
  },
  {
   "obj": "ground.leaves",
   "at": [-13.23, 18.67]
  },
  {
   "obj": "ground.leaves",
   "at": [-13.05, 24.83]
  },
  {
   "obj": "ground.leaves",
   "at": [-12.43, 32.08]
  },
  {
   "cluster": "ground.leaves",
   "on": "sq-l",
   "n": 5,
   "seed": 8071
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.22, 12.57]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.35, 13.93]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.76, 18.7]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-8.38, 19.03]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-9.09, 21.06]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-11.82, 23.1]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-10.35, 24.53]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-9.06, 24.79]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-23.75, 29.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-24.89, 31.49]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-12.91, 34.36]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [16.49, 33.01]
  },
  {
   "obj": "bird.pigeon",
   "at": [7.21, 8.38]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [7.21, 8.38]
  }],
 "life": [{
   "who": "tram",
   "on": "tram",
   "every": "2min"
  },
  {
   "who": "walkers",
   "rate": "5/min"
  },
  {
   "who": "walkers",
   "on": "sq-r",
   "rate": "17/min",
   "mix": {
    "commuter": 0.27,
    "stroll": 0.27,
    "student": 0.13,
    "shopper": 0.13,
    "couple": 0.07,
    "takeaway-walker": 0.07,
    "buggy": 0.07
   }
  },
  {
   "who": "walkers",
   "on": "plat-l",
   "rate": "8/min",
   "mix": {
    "stroll": 0.6,
    "student": 0.2,
    "shopper": 0.2
   }
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/3min",
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
