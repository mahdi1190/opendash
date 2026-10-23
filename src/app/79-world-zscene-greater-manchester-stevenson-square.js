/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-stevenson-square-w3: converted by `node tools/world.mjs convert uk-north-manchester-quays-nq/greater-manchester-stevenson-square`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (49):
     - place[0]: structure.mqn-kiosk-v3: pixel placement unprojected to [3, 30] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mqn-mural-v3: pixel placement unprojected to [-13, 87.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[73]: street.lamppost: pixel placement unprojected to [-3.1, 5.8] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[1]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[1]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[2]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[2]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[3]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[3]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[4]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[4]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[5]: building.mqn-ancoats-mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[5]: building footprint (mqn-ancoats-mill, 6 storeys) -> one 'building.mqn-ancoats-mill' entity at its centre: the library size replaces the authored footprint
     - buildings[6]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[6]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[7]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[7]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[8]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[8]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[9]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[9]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[10]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[10]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[11]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[11]: building footprint (mqn-nq-warehouse, 5 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[12]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[12]: building footprint (mqn-nq-warehouse, 4 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[13]: building.mqn-nq-warehouse: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[13]: building footprint (mqn-nq-warehouse, 6 storeys) -> one 'building.mqn-nq-warehouse' entity at its centre: the library size replaces the authored footprint
     - buildings[14]: building.mqn-ancoats-mill: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[14]: building footprint (mqn-ancoats-mill, 8 storeys) -> one 'building.mqn-ancoats-mill' entity at its centre: the library size replaces the authored footprint
     - flows[3]: flow on ["pave-l","pave-n","pave-e"]: one population per surface is better; kept on 'pave-l' only
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[15]: repair: removed (overlap) street.bench overlaps structure.mqn-kiosk-v3 (entities[0]) by 0.476 m
     - entities[16]: repair: removed (overlap) street.bench overlaps street.mqn-bike-hoop (entities[11]) by 0.335 m
     - entities[14]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[13]) by 0.65 m
     - entities[73]: repair: removed (overlap) street.lamppost overlaps street.mqn-planter-grass (entities[18]) by 0.21 m
     - entities[29]: repair: removed (overlap) person.cafe-goer overlaps street.mqn-parasol (entities[24]) by 0.45 m
     ... and 9 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-stevenson-square-w3","label":"Stevenson Square, Greater Manchester","site":"The Northern Quarter — Stevenson Square, its painted kiosk, murals, cafes and buses","tags":["uk","north west","manchester","salford","city","city","street art","cafe","square","bus","cycling","world-v3"],"liveSky":{"lat":53.4824,"lon":-2.2346},"mood":"energetic","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 53.4824,
  "lon": -2.2346,
  "region": "greater-manchester",
  "style": "civic-square"
 },
 "camera": {
  "eye": 1.65,
  "fov": 58,
  "horizon": 520,
  "heading": 40
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-200, 0],
    [200, 0],
    [200, 160],
    [-200, 160]]
  },
  {
   "id": "square",
   "kind": "plaza",
   "poly": [[-6.5, 2],
    [36, 2],
    [36, 76.4],
    [-6.5, 76.4]]
  },
  {
   "id": "lever",
   "kind": "road",
   // (it runs to 70 m: the v2 road's leg on to the west lay on Hilton Street's own lanes, and a bus there, or one ending in the
   // junction, was judged to drive on the right of Hilton Street; its last stretch to Hilton Street is paved over, closed to traffic,
   // as the square's north end now is)
   "path": [[-10, 1],
    [-10, 70]],
   "width": 7
  },
  { "id": "lever-n", "kind": "plaza", "poly": [[-13.6, 70], [-6.4, 70], [-6.4, 76.4], [-13.6, 76.4]] },
  {
   "id": "pave-l",
   "kind": "pavement",
   "path": [[-15.1, 1],
    [-15.09, 71.74],
    [-16.53, 74.57],
    [-24.03, 74.9],
    [-160, 74.9]],
   "width": 3.2
  },
  {
   "id": "hilton",
   "kind": "road",
   "path": [[-160, 80],
    [160, 80]],
   "width": 7
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[-160, 84.7],
    [160, 84.7]],
   "width": 2.4
  },
  {
   "id": "pave-e",
   "kind": "pavement",
   "poly": [[36, 2],
    [39, 2],
    [39, 76.4],
    [36, 76.4]]
  },
  // the square's tree pits (soil under a grille: a tree on bare setts is dropped by the world)
  { "id": "pit-1", "kind": "grass", "poly": [[12, 19], [14, 19], [14, 21], [12, 21]] },
  { "id": "pit-2", "kind": "grass", "poly": [[24.8, 30.8], [26.8, 30.8], [26.8, 32.8], [24.8, 32.8]] },
  { "id": "pit-3", "kind": "grass", "poly": [[19, 51], [21, 51], [21, 53], [19, 53]] },
  { "id": "pit-4", "kind": "grass", "poly": [[29, 65], [31, 65], [31, 67], [29, 67]] },
  { "id": "pit-5", "kind": "grass", "poly": [[-3, 59], [-1, 59], [-1, 61], [-3, 61]] }],
 // the painted kiosk's walls for the navigation: its drawing is pinned at its near corner (3, 30) and the world gives it that corner's
 // footprint only, so walkers went through its body; a low wall round the inside of its footprint keeps them out (hidden behind it)
 // (four lines, a hand's breadth apart at the corners: the pieces of one line overlapped where they met)
 "lines": [{ "id": "kiosk-w1", "kind": "wall", "path": [[4.4, 31], [10.5, 31]], "h": 1 }, { "id": "kiosk-w2", "kind": "wall", "path": [[10.7, 31.3], [10.7, 34.5]], "h": 1 },
  { "id": "kiosk-w3", "kind": "wall", "path": [[10.4, 34.7], [3.7, 34.7]], "h": 1 }, { "id": "kiosk-w4", "kind": "wall", "path": [[3.4, 34.4], [3.4, 31.4]], "h": 1 }],
 "buildings": [
  // Lever Street's west side (left): Victorian warehouses, shops and bars in their ground floors (the v2 view's footprints)
  { "id": "lv-1", "foot": [[-32, 2], [-18, 2], [-18, 16], [-32, 16]], "style": "mqn-nq-warehouse", "storeys": 5 },
  { "id": "lv-2", "foot": [[-31, 16], [-18, 16], [-18, 29], [-31, 29]], "style": "mqn-nq-warehouse", "storeys": 4 },
  { "id": "lv-3", "foot": [[-34, 29], [-18, 29], [-18, 45], [-34, 45]], "style": "mqn-nq-warehouse", "storeys": 6 },
  { "id": "lv-4", "foot": [[-32, 45], [-18, 45], [-18, 58], [-32, 58]], "style": "mqn-nq-warehouse", "storeys": 5 },
  { "id": "lv-5", "foot": [[-30, 58], [-18, 58], [-18, 72.6], [-30, 72.6]], "style": "mqn-nq-warehouse", "storeys": 4 },
  // across Hilton Street at the far end: the mill with the painted gable, warehouses either side
  { "id": "hn-mill", "foot": [[-22, 88], [-4, 88], [-4, 104], [-22, 104]], "style": "mqn-ancoats-mill", "storeys": 6 },
  { "id": "hn-1", "foot": [[-3.6, 86.6], [14, 86.6], [14, 102], [-3.6, 102]], "style": "mqn-nq-warehouse", "storeys": 5 },
  { "id": "hn-2", "foot": [[14.4, 86.6], [30, 86.6], [30, 100], [14.4, 100]], "style": "mqn-nq-warehouse", "storeys": 4 },
  { "id": "hn-3", "foot": [[30.4, 86.6], [52, 86.6], [52, 104], [30.4, 104]], "style": "mqn-nq-warehouse", "storeys": 6 },
  { "id": "hn-4", "foot": [[-46, 86.6], [-22.4, 86.6], [-22.4, 102], [-46, 102]], "style": "mqn-nq-warehouse", "storeys": 5 },
  { "id": "hn-5", "foot": [[-70, 86.6], [-46.4, 86.6], [-46.4, 100], [-70, 100]], "style": "mqn-nq-warehouse", "storeys": 4 },
  // the square's east side (right), and a taller mill behind the far end
  { "id": "sq-e1", "foot": [[40.6, 6], [56, 6], [56, 26], [40.6, 26]], "style": "mqn-nq-warehouse", "storeys": 5 },
  { "id": "sq-e2", "foot": [[40.6, 26], [54, 26], [54, 48], [40.6, 48]], "style": "mqn-nq-warehouse", "storeys": 4 },
  { "id": "sq-e3", "foot": [[40.6, 48], [58, 48], [58, 76.4], [40.6, 76.4]], "style": "mqn-nq-warehouse", "storeys": 6 },
  { "id": "far-mill", "foot": [[-20, 130], [20, 130], [20, 150], [-20, 150]], "style": "mqn-ancoats-mill", "storeys": 8 }
 ],
 "entities": [{
   "obj": "structure.mqn-kiosk-v3",
   "at": [3, 29.99],
   "variant": 0
  },
  {
   "obj": "structure.mqn-mural-v3",
   "at": [-13.01, 87.23],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [13, 20],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [25.8, 31.8],
   "variant": 1
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [20, 52],
   "variant": 2
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [30, 66],
   "variant": 0
  },
  {
   "obj": "tree.mqn-street-tree",
   "at": [-2, 60],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 10],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 34],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [-6, 58],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [37.4, 64],
   "variant": 3
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [14, 34],
   "variant": 0
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [15.8, 34],
   "variant": 2
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [24, 50],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [7, 37],
   "facing": 180,
   "id": "bench-k"
  },
  {
   "obj": "street.bench",
   "at": [10, 25],
   "id": "bench-s"
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-4, 6],
   "variant": 0
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [5, 9],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [30, 46],
   "variant": 2
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [-4.5, 44],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-planter-grass",
   "at": [20, 72],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.6, 14],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.4, 19],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.8, 30.4],
   "variant": 3
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.4, 41.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.mqn-parasol",
   "at": [-3.6, 56.4],
   "variant": 0
  },
  {
   "obj": "street.mqn-parasol",
   "at": [16.6, 41],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 8],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 16],
   "variant": 1
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 26],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 40],
   "variant": 3
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 54],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bollard",
   "at": [-6.2, 68],
   "variant": 1
  },
  {
   "obj": "person.photographer",
   "at": [4, 74],
   "facing": 0
  },
  {
   "obj": "street.mqn-bike-hoop",
   "at": [2.6, 6.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.busker",
   "at": [3.8, 11.2],
   "facing": 270
  },
  {
   "obj": "person.couple",
   "at": [1.6, 9.4],
   "facing": 90
  },
  {
   "obj": "person.phone-idler",
   "at": [4.6, 8.2],
   "facing": 270
  },
  {
   "obj": "street.mqn-bin",
   "at": [-5.2, 16],
   "variant": 0
  },
  {
   "obj": "street.mqn-bin",
   "at": [6.6, 14],
   "variant": 1
  },
  {
   "obj": "street.mqn-bin",
   "at": [22, 40],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.6, 8.6],
   "variant": 0
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.8, 24],
   "variant": 1
  },
  {
   "obj": "street.mqn-aboard",
   "at": [-2.6, 36],
   "variant": 0
  },
  {
   "obj": "street.mqn-totem",
   "at": [9, 26],
   "variant": 1
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-4.71, 11.32]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.31, 14.46]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-5.34, 17.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.65, 17.59]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-4.43, 18.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.07, 18.68]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.13, 19.55]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.27, 19.77]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.2, 20.97]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-2.98, 22.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.14, 22.35]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.07, 23.06]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.4, 23.62]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.28, 23.9]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.22, 24.04]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.02, 24.24]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.4, 24.55]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [11.46, 25.67]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [13.77, 26.09]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.24, 26.17]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [15.68, 26.31]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.89, 26.37]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [11.58, 26.74]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.74, 29.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.34, 29.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.97, 31.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.46, 31.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.83, 32.13]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [12.19, 33.46]
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "square",
   "n": 26,
   "seed": 7917
  },
  {
   "obj": "ground.leaves",
   "at": [-0.64, 15.08]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.13, 16.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.51, 17.26]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.39, 18.41]
  },
  {
   "obj": "ground.leaves",
   "at": [11.09, 23.57]
  },
  {
   "obj": "ground.leaves",
   "at": [5.39, 24.15]
  },
  {
   "obj": "ground.leaves",
   "at": [10.31, 24.46]
  },
  {
   "obj": "ground.leaves",
   "at": [11.93, 24.47]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.37, 26.13]
  },
  {
   "obj": "ground.leaves",
   "at": [5.62, 27.86]
  },
  {
   "obj": "ground.leaves",
   "at": [11.46, 32.01]
  },
  {
   "cluster": "ground.leaves",
   "on": "square",
   "n": 4,
   "seed": 3115
  },
  {
   "obj": "building.gen-direct",
   "at": [-24.4, 9]
  },
  {
   "obj": "building.gen-direct",
   "at": [47.6, 16]
  },
  {
   "obj": "building.gen-direct",
   "at": [-23.9, 22.5]
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 12,
   "seed": 9778
  }],
 "life": [
  // buses, black cabs and cars down Lever Street and along Hilton Street
  { "who": "buses", "on": "lever", "every": "5min", "mix": { "vehicle.bus-double-decker": 1 } },
  { "who": "cars", "on": "lever", "rate": "5/min", "mix": { "vehicle.car-city": 4, "vehicle.taxi-black": 2, "vehicle.car": 2 } },
  { "who": "cars", "on": "hilton", "rate": "3/min", "mix": { "vehicle.car-city": 3, "vehicle.taxi-black": 1 } },
  { "who": "walkers", "on": "pave-n", "rate": "5/min", "mix": { "stroll": 0.4, "commuter": 0.3, "student": 0.3 } },
  { "who": "walkers", "on": "pave-e", "rate": "4/min", "mix": { "stroll": 0.5, "commuter": 0.5 } },
  { "who": "visit", "mix": { "student": 0.4, "stroll": 0.3, "takeaway-walker": 0.3 }, "rate": "1/min", "goals": [{ "go": "bench-k" }, { "do": "sit", "for": [25, 80] }, { "leave": "far" }] },
  { "who": "visit", "mix": { "elderly": 0.4, "stroll": 0.6 }, "rate": "1/min", "goals": [{ "go": "bench-s" }, { "do": "sit", "for": [25, 80] }, { "leave": "far" }] },
  // pigeons on the setts by day (they roost after dark; the draft's ten were pinned statics, out at midnight)
  { "who": "pigeons", "count": 8, "on": "square" },
  {
   "who": "cyclists",
   "on": "lever",
   "rate": "1/2min",
   "mix": {
    "cyclist": 1
   }
  },
  {
   "who": "walkers",
   "on": "pave-l",
   "rate": "14/min",
   "mix": {
    "takeaway-walker": 0.13,
    "commuter": 0.13,
    "stroll": 0.27,
    "dog-walker": 0.13,
    "couple": 0.13,
    "student": 0.13,
    "shopper": 0.07
   }
  },
  {
   "who": "walkers",
   "on": "square",
   "rate": "28/min",
   "mix": {
    "takeaway-walker": 0.13,
    "family": 0.07,
    "skateboarder": 0.07,
    "stroll": 0.27,
    "dog-walker": 0.13,
    "couple": 0.13,
    "student": 0.13,
    "shopper": 0.07
   }
  }],
 "backdrop": {
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
