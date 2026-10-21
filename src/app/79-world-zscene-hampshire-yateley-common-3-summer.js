/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-common-3-summer-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-common-3-summer`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (32):
     - place[0]: tree.wyv-snag: pixel placement unprojected to [3.3, 14.5] m
     - place[1]: tree.pool-birch: pixel placement unprojected to [-19.9, 42.3] m
     - place[2]: tree.pool-birch: pixel placement unprojected to [-15.9, 39.1] m
     - place[3]: tree.pool-pine: pixel placement unprojected to [-10, 44.2] m
     - place[4]: tree.pool-birch: pixel placement unprojected to [-1.3, 40.7] m
     - place[5]: tree.pool-pine: pixel placement unprojected to [17.9, 42.3] m
     - place[6]: tree.pool-birch: pixel placement unprojected to [19.7, 39.1] m
     - place[7]: tree.pine-veteran: pixel placement unprojected to [7.3, 56.5] m
     - place[8]: tree.pool-birch: pixel placement unprojected to [-4, 6.8] m
     - place[9]: tree.wyv-birch-bough: sky or horizon art with no foot; dropped
     - place[10]: ground.log: pixel placement unprojected to [-1.5, 6.8] m
     - place[11]: plant.yc-sundew: pixel placement unprojected to [-2.8, 5.6] m
     - place[12]: plant.yc-sundew: pixel placement unprojected to [-2.3, 5.3] m
     - place[13]: plant.yc-sundew: pixel placement unprojected to [-2.2, 5.7] m
     - place[14]: plant.yc-sundew: pixel placement unprojected to [-1.2, 5.2] m
     - place[15]: plant.yc-sundew: pixel placement unprojected to [-0.9, 5.5] m
     - place[16]: plant.yc-sundew: pixel placement unprojected to [-0.3, 7.8] m
     - place[17]: plant.yc-sundew: pixel placement unprojected to [0.1, 8.4] m
     - place[18]: plant.yc-cotton-grass: pixel placement unprojected to [-3.1, 5] m
     - place[19]: plant.yc-cotton-grass: pixel placement unprojected to [-1.5, 5] m
     - place[20]: plant.yc-cotton-grass: pixel placement unprojected to [2.4, 5] m
     - place[21]: plant.yc-cotton-grass: pixel placement unprojected to [3.2, 5.3] m
     - place[22]: plant.yc-cotton-grass: pixel placement unprojected to [3.5, 5.1] m
     - place[23]: plant.yc-cotton-grass: pixel placement unprojected to [2.3, 6.4] m
     - place[24]: plant.grass-long: pixel placement unprojected to [2.8, 5.2] m
     - actors[0]: actor vehicle.light-aircraft: no life class; dropped
     - actors[1]: actor animal.pond-dragonfly: no life class; dropped
     - actors[2]: actor animal.dragonfly: no life class; dropped
     - actors[3]: actor animal.pond-dragonfly: no life class; dropped
     - actors[4]: actor animal.dragonfly: no life class; dropped
     - actors[5]: actor animal.bee: no life class; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-common-3-summer-w3","label":"Yateley Common, Hampshire","site":"Yateley Common — Summer heather around the fallen branch","tags":["uk","south east","hampshire","landscape","heathland","heather","birch","summer","world-v3"],"liveSky":{"lat":51.337,"lon":-0.825},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.337,
  "lon": -0.825,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 500,
  "heading": 300
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.7, 4.6],
    [3.7, 4.6],
    [2435.3, 3000],
    [-2435.3, 3000]]
  }],
 "entities": [{
   "obj": "tree.wyv-snag",
   "at": [3.3, 14.52],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [-19.94, 42.35],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [-15.87, 39.09],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.pool-pine",
   "at": [-10.04, 44.19],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [-1.32, 40.65],
   "variant": 1
  },
  {
   "obj": "tree.pool-pine",
   "at": [17.88, 42.35],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [19.67, 39.09],
   "variant": 1
  },
  {
   "obj": "tree.pine-veteran",
   "at": [7.33, 56.46],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [-4.01, 6.78],
   "variant": 1
  },
  {
   "obj": "ground.log",
   "at": [-1.54, 6.78],
   "variant": 0
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-2.83, 5.61],
   "variant": 1
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-2.31, 5.29],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-2.15, 5.71],
   "variant": 1
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-1.18, 5.19],
   "variant": 0
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-0.89, 5.49],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yc-sundew",
   "at": [-0.25, 7.82],
   "variant": 0
  },
  {
   "obj": "plant.yc-sundew",
   "at": [0.14, 8.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.1, 5.02],
   "variant": 1
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-1.55, 5.02],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [2.36, 5.02],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [3.17, 5.35],
   "variant": 0
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [3.51, 5.08],
   "variant": 2
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [2.32, 6.35],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [2.79, 5.21],
   "variant": 1
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
