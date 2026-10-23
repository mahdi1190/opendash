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
  "region": "greater-manchester",
  "style": "civic-square"
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
   "poly": [[-400, 0],
    [400, 0],
    [400, 130],
    [-400, 130]]
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
   // (the v2 line ran from under the lens: a tram runs its whole track and is ONE rigid 40 m body, so every tram's tail came under a
   // camera 6 m up, cut by the frame's bottom (edgeCut, nearBand), and on a bend in the near band its body swung over the kit's framing
   // planter. It now swings in from the left behind the near band, in a long curve entering the frame at about 40 m, and runs on along
   // the piazza and away west as before, no part of it nearer than 40 m)
   "path": [[-130, 40],
    [-80, 40],
    [-45, 41],
    [-30, 42.4],
    [-20, 44.5],
    [-13, 47.2],
    [-8, 50.6],
    [-5.6, 54.5],
    [-6, 59],
    [-9, 64.5],
    [-12, 70],
    [-30, 86],
    [-70, 96],
    [-160, 104],
    [-300, 110]],
   "width": 7.2
  },
  // the stop's platform on the line's outer side
  { "id": "platform", "kind": "platform", "poly": [[0.2, 52], [3.6, 52], [2.4, 64], [-1.2, 64]] },
  // the concourse in front of it (where the v2 line ran), crossed by its own walkers
  { "id": "concourse", "kind": "plaza", "poly": [[-14, 3], [4, 3], [4, 52], [-1.8, 52], [-6, 46], [-14, 42]] },
  // grassed track verges on the outside of the line's bends: on a bend the tram's rigid body swings out over the ground beside the
  // rails, and the fill's lamps and benches stood there (overlap)
  { "id": "verge-1", "kind": "grass", "poly": [[-18, 41.2], [-11, 43.6], [-5.2, 47.2], [-2.6, 51.4], [-1.8, 52], [4, 52], [4, 44], [-8, 38], [-18, 37.6]] },
  { "id": "verge-2", "kind": "grass", "poly": [[-1.6, 64.5], [2, 64.5], [0, 72], [-4, 84], [-14, 94], [-26, 93], [-24, 89], [-14, 79.5], [-9, 74], [-4.8, 66]] },
  // and on the inside of the first bend, where the body's middle swings in
  { "id": "verge-3", "kind": "grass", "poly": [[-45, 43.6], [-30, 45], [-20, 47.6], [-13.4, 50.6], [-9.8, 54], [-9.6, 58], [-13, 58], [-17, 53], [-25, 50], [-45, 48]] },
  // the piazza's young trees in their pits (a tree on bare paving is dropped by the world)
  { "id": "pit-1", "kind": "grass", "poly": [[10, 23], [12, 23], [12, 25], [10, 25]] },
  { "id": "pit-2", "kind": "grass", "poly": [[14, 39], [16, 39], [16, 41], [14, 41]] },
  { "id": "pit-3", "kind": "grass", "poly": [[9, 57], [11, 57], [11, 59], [9, 59]] },
  { "id": "pit-4", "kind": "grass", "poly": [[18, 69], [20, 69], [20, 71], [18, 71]] },
  { "id": "pit-5", "kind": "grass", "poly": [[19, 29], [21, 29], [21, 31], [19, 31]] },
  { "id": "pit-6", "kind": "grass", "poly": [[5, 65], [7, 65], [7, 67], [5, 67]] },
  { "id": "pit-7", "kind": "grass", "poly": [[13, 83], [15, 83], [15, 85], [13, 85]] },
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
 // the quay's railing along the water's edge (the v2 view's pinned rail ran across three quarters of the frame: the world drops it)
 "lines": [{ "id": "quay-rail", "kind": "railing", "path": [[-160, 129.4], [160, 129.4]] }],
 "buildings": [
  // MediaCity's glass blocks either side of the piazza (the v2 view's footprints; the near left one set back behind the tram's curve)
  { "id": "studios-l", "foot": [[-52, 59], [-21, 59], [-22, 72], [-52, 72]], "storeys": 8, "style": "mqn-media" },
  { "id": "quay-l", "foot": [[-70, 108], [-30, 108], [-30, 126], [-70, 126]], "storeys": 6, "style": "mqn-media" },
  { "id": "studios-r1", "foot": [[28.5, 18], [62, 18], [62, 48], [28.5, 48]], "storeys": 8, "style": "mqn-media" },
  { "id": "studios-r2", "foot": [[28.5, 50], [60, 50], [60, 98], [28.5, 98]], "storeys": 5, "style": "mqn-media" },
  { "id": "studios-r3", "foot": [[30, 102], [64, 102], [64, 126], [30, 126]], "storeys": 11, "style": "mqn-media" },
  // Trafford Wharf's offices across the water, beside IWM North
  { "id": "trafford-1", "foot": [[-200, 380], [-130, 380], [-130, 420], [-200, 420]], "storeys": 5, "style": "brutalist" }
 ],
 // (no tram stop canopies: the v2 ones were pinned drawings for this camera, and with a stop the trams' alighting riders were put on
 // one spot, 0 m apart, an engine fault of the tram stop; the trams pass along the piazza)
 "entities": [{
   "obj": "structure.mqn-screen-v2",
   "at": [26.9, 47.99],
   "variant": 0
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
   "obj": "person.photographer",
   "at": [2, 128],
   "facing": 0
  },
  {
   "obj": "person.couple",
   "at": [12, 127.5]
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
   "every": "4min",
   "mix": { "vehicle.metrolink-m5000": 1 }
  },
  { "who": "walkers", "on": "platform", "rate": "3/min", "mix": { "commuter": 0.6, "student": 0.4 } },
  { "who": "walkers", "on": "piazza-w", "rate": "6/min", "mix": { "commuter": 0.4, "stroll": 0.3, "takeaway-walker": 0.3 } },
  { "who": "walkers", "on": "concourse", "rate": "8/min", "mix": { "commuter": 0.5, "student": 0.2, "takeaway-walker": 0.3 } },
  { "who": "gulls", "count": 5 },
  // pigeons on the piazza by day (they roost at night; the draft's were pinned statics, out at midnight)
  { "who": "pigeons", "count": 6, "on": "piazza" },
  { "who": "mallard", "count": 4, "on": "canal" },
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
  "style": "city-manchester-towers"
 },
 "seed": 1
});
})();
