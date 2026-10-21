/* ============================================================
   WORLD SCENE (format v3) world-test / norfolk-reepham-market-w3: converted by `node tools/world.mjs convert uk-east-reepham/norfolk-reepham-market`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (4):
     - place[0]: landmark landmark.rph-market: src is a placeholder; give the listing or map reference
     - backdrop: backdrop style 'town-low' chosen from the place and the water; check it against the real view
     - entities[14]: repair: removed (overlap) tree.rph-canal-oak overlaps tree.rph-canal-oak (entities[6]) by 0.101 m
     - life[0].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"norfolk-reepham-market-w3","label":"Market Place, Reepham","site":"The stepped-gable shop frontage on the west of Market Place","tags":["uk","norfolk","reepham","landmark","world-v3"],"liveSky":{"lat":52.7632,"lon":1.1122},"mood":"calm","colour":"orange"},
{
 "v": 3,
 "place": {
  "lat": 52.7632,
  "lon": 1.1122,
  "region": "norfolk"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 555,
  "heading": 270,
  "x0": 800
 },
 "surfaces": [{
   "id": "square",
   "kind": "plaza",
   "poly": [[-4.3, 5.3],
    [4.3, 5.3],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "road",
   "kind": "road",
   "path": [[-10, 4],
    [-15, 13],
    [-20, 21],
    [12, 22],
    [50, 24]],
   "width": 4
  },
  {
   "id": "gardens",
   "kind": "grass",
   "poly": [[-200, 55],
    [200, 55],
    [500, 600],
    [-500, 600]]
  },
  {
   "id": "left-frontage",
   "kind": "plaza",
   "poly": [[-28, 12],
    [-17, 12],
    [-17, 34],
    [-28, 34]]
  },
  {
   "id": "right-frontage",
   "kind": "plaza",
   "poly": [[19, 12],
    [28, 12],
    [28, 37],
    [19, 37]]
  },
  {
   "id": "adjoining-left",
   "kind": "plaza",
   "poly": [[-35, 42],
    [-19, 42],
    [-19, 80],
    [-35, 80]]
  },
  {
   "id": "adjoining-right",
   "kind": "plaza",
   "poly": [[19, 41],
    [38, 41],
    [38, 81],
    [19, 81]]
  },
  {
   "id": "border",
   "kind": "grass",
   "poly": [[-10, 4],
    [-5.7, 4],
    [-12, 18],
    [-21, 24],
    [-26, 18]]
  },
  {
   "id": "shops",
   "kind": "plaza",
   "poly": [[-32, 26],
    [30, 26],
    [30, 38],
    [-32, 38]]
  }],
 "entities": [{
   "obj": "building.rph-market-side",
   "at": [-14, 29],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.rph-market-side",
   "at": [17, 29],
   "variant": 1
  },
  {
   "obj": "plant.rph-flower-tub",
   "at": [-4.1, 7.8],
   "variant": 1
  },
  {
   "obj": "plant.rph-flower-tub",
   "at": [8, 16],
   "variant": 2
  },
  {
   "obj": "street.lamp",
   "at": [-10.6, 19],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [8.8, 18],
   "facing": 270
  },
  {
   "obj": "tree.rph-canal-oak",
   "at": [-14, 20],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [44, 96],
   "variant": 2
  },
  {
   "obj": "tree.bank-distant",
   "at": [-41, 170]
  },
  {
   "obj": "tree.bank-distant",
   "at": [44, 130]
  },
  {
   "obj": "bird.pigeon",
   "at": [-3, 15],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [2, 17],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [6, 18],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [-8, 17],
   "variant": 0
  }],
 "landmarks": [{
   "obj": "landmark.rph-market",
   "at": [1.5, 28],
   "src": "converted from uk-east-reepham/norfolk-reepham-market: check the listing"
  }],
 "life": [{
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/1min",
   "on": "square"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "square"
  }],
 "backdrop": {
  "style": "town-low"
 },
 "seed": 1
});
})();
