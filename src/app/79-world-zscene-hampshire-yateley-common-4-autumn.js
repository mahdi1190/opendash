/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-common-4-autumn-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-common-4-autumn`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (27):
     - place[0]: tree.pine-veteran: pixel placement unprojected to [5.8, 30.3] m
     - place[1]: tree.wyv-snag: pixel placement unprojected to [9.3, 28.4] m
     - place[2]: tree.pine-veteran: pixel placement unprojected to [-11.4, 69.9] m
     - place[3]: plant.gorse: pixel placement unprojected to [-1.1, 30.3] m
     - place[4]: plant.gorse: pixel placement unprojected to [12.5, 36.3] m
     - place[5]: animal.cattle: pixel placement unprojected to [-7.9, 36.3] m
     - place[6]: animal.cattle: pixel placement unprojected to [-4.7, 32.4] m
     - place[7]: tree.pool-birch: pixel placement unprojected to [-11.5, 30.3] m
     - place[8]: tree.pool-pine: pixel placement unprojected to [-22.7, 45.4] m
     - place[9]: tree.pool-birch: pixel placement unprojected to [-4.6, 18.2] m
     - place[10]: tree.pool-pine: pixel placement unprojected to [17.9, 39.5] m
     - place[11]: tree.pool-birch: pixel placement unprojected to [5.9, 16.5] m
     - place[12]: tree.birch: pixel placement unprojected to [12.8, 22.7] m
     - place[13]: tree.pool-birch: pixel placement unprojected to [-6.6, 11.4] m
     - place[14]: tree.pool-pine: pixel placement unprojected to [4.2, 8.3] m
     - place[15]: tree.pool-birch: pixel placement unprojected to [-2.9, 4.3] m
     - place[16]: tree.pool-birch: pixel placement unprojected to [-2.1, 4.7] m
     - place[17]: tree.pool-pine: pixel placement unprojected to [3, 4.3] m
     - place[18]: tree.yc-birch-bough: sky or horizon art with no foot; dropped
     - place[19]: ground.log: pixel placement unprojected to [1.1, 7] m
     - place[20]: plant.bracken: pixel placement unprojected to [1.7, 5] m
     - place[21]: plant.bracken: pixel placement unprojected to [-1.6, 4.8] m
     - actors[1]: actor vehicle.light-aircraft: no life class; dropped
     - actors[2]: actor animal.wp-bat: no life class; dropped
     - actors[3]: actor animal.wp-bat: no life class; dropped
     - actors: 1 x stroll: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-common-4-autumn-w3","label":"Yateley Common, Hampshire","site":"Yateley Common — Amber dusk over the open heath","tags":["uk","south east","hampshire","landscape","heathland","heather","birch","autumn","world-v3"],"liveSky":{"lat":51.339,"lon":-0.833},"mood":"dreamy","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 51.339,
  "lon": -0.833,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 72,
  "horizon": 540,
  "heading": 268
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-4.1, 4.5],
    [4.1, 4.5],
    [2724.5, 3000],
    [-2724.5, 3000]]
  }],
 "entities": [{
   "obj": "tree.pine-veteran",
   "at": [5.77, 30.28],
   "variant": 0
  },
  {
   "obj": "tree.wyv-snag",
   "at": [9.28, 28.39],
   "variant": 1
  },
  {
   "obj": "tree.pine-veteran",
   "at": [-11.42, 69.88],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.gorse",
   "at": [-1.1, 30.28],
   "variant": 0
  },
  {
   "obj": "plant.gorse",
   "at": [12.54, 36.34],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "animal.cattle",
   "at": [-7.92, 36.34],
   "variant": 2
  },
  {
   "obj": "animal.cattle",
   "at": [-4.71, 32.44],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [-11.55, 30.28],
   "variant": 2
  },
  {
   "obj": "tree.pool-pine",
   "at": [-22.69, 45.42],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [-4.62, 18.17],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-pine",
   "at": [17.93, 39.5],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [5.85, 16.52],
   "variant": 1
  },
  {
   "obj": "tree.birch",
   "at": [12.79, 22.71],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [-6.6, 11.36],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.pool-pine",
   "at": [4.2, 8.26],
   "variant": 2
  },
  {
   "obj": "tree.pool-birch",
   "at": [-2.91, 4.33],
   "variant": 0
  },
  {
   "obj": "tree.pool-birch",
   "at": [-2.12, 4.66],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.pool-pine",
   "at": [2.99, 4.33],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "ground.log",
   "at": [1.14, 6.99],
   "variant": 1
  },
  {
   "obj": "plant.bracken",
   "at": [1.72, 4.98],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.bracken",
   "at": [-1.56, 4.78],
   "variant": 0
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
