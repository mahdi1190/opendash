/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-common-2-spring-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-common-2-spring`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (38):
     - place[0]: prop.yc-field-gate: pixel placement unprojected to [-1.5, 17.1] m
     - place[1]: tree.pool-pine: pixel placement unprojected to [-6.3, 36.3] m
     - place[2]: tree.pond-pine: pixel placement unprojected to [-15.1, 52.4] m
     - place[3]: tree.pool-pine: pixel placement unprojected to [-10.1, 26.9] m
     - place[4]: tree.pine: pixel placement unprojected to [-34.5, 67.3] m
     - place[5]: tree.pool-pine: pixel placement unprojected to [-11.8, 20.1] m
     - place[6]: tree.pool-birch: pixel placement unprojected to [-3.6, 15.7] m
     - place[7]: tree.pool-pine: pixel placement unprojected to [-4.1, 9.4] m
     - place[8]: tree.pool-pine: pixel placement unprojected to [-3.5, 4.9] m
     - place[9]: tree.wp-pine-bough: sky or horizon art with no foot; dropped
     - place[10]: ground.log: pixel placement unprojected to [-2.3, 7] m
     - place[11]: plant.bracken: pixel placement unprojected to [-1.2, 5] m
     - place[12]: plant.gorse: pixel placement unprojected to [4.6, 10.5] m
     - place[13]: plant.gorse: pixel placement unprojected to [5.6, 9.6] m
     - place[14]: plant.gorse: pixel placement unprojected to [8.2, 11.1] m
     - place[15]: plant.gorse: pixel placement unprojected to [1.1, 15.7] m
     - place[16]: plant.gorse: pixel placement unprojected to [3.5, 18.9] m
     - place[17]: plant.gorse: pixel placement unprojected to [7.3, 21.9] m
     - place[18]: tree.birch-heath: pixel placement unprojected to [8.3, 20.9] m
     - place[19]: tree.birch-heath: pixel placement unprojected to [17.4, 26.9] m
     - place[20]: tree.pine-veteran: pixel placement unprojected to [25.6, 47.1] m
     - place[21]: bird.stonechat: pixel placement unprojected to [14.5, 24.8] m
     - place[22]: bird.dartford-warbler: pixel placement unprojected to [9.3, 20.9] m
     - place[23]: animal.cattle: pixel placement unprojected to [2.3, 5.7] m
     - place[24]: animal.cattle: pixel placement unprojected to [4.6, 7] m
     - place[25]: animal.cattle: pixel placement unprojected to [2, 14.5] m
     - place[26]: animal.pony: pixel placement unprojected to [0.4, 20.5] m
     - place[27]: animal.pony: pixel placement unprojected to [4.2, 17.1] m
     - place[28]: plant.yc-gorse-spray: pixel placement unprojected to [3.4, 4.6] m
     - actors[2]: actor vehicle.light-aircraft: no life class; dropped
     - actors[3]: actor animal.bee: no life class; dropped
     - actors[4]: actor animal.bee: no life class; dropped
     - actors[5]: actor animal.butterfly: no life class; dropped
     - actors[6]: actor animal.butterfly: no life class; dropped
     - actors[7]: actor animal.butterfly: no life class; dropped
     - actors: 1 x dog-walker: no walk surface; dropped
     - actors: 1 x stroll: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-common-2-spring-w3","label":"Yateley Common, Hampshire","site":"Yateley Common — Birch catkins above the sandy path","tags":["uk","south east","hampshire","landscape","heathland","heather","birch","spring","world-v3"],"liveSky":{"lat":51.343,"lon":-0.829},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.343,
  "lon": -0.829,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 70,
  "horizon": 520,
  "heading": 70
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.9, 4.5],
    [3.9, 4.5],
    [2625.8, 3000],
    [-2625.8, 3000]]
  }],
 "entities": [{
   "obj": "prop.yc-field-gate",
   "at": [-1.5, 17.14]
  },
  {
   "obj": "tree.pool-pine",
   "at": [-6.35, 36.25],
   "variant": 1
  },
  {
   "obj": "tree.pond-pine",
   "at": [-15.12, 52.37],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.pool-pine",
   "at": [-10.09, 26.93],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pine",
   "at": [-34.53, 67.33],
   "variant": 1
  },
  {
   "obj": "tree.pool-pine",
   "at": [-11.8, 20.05],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [-3.57, 15.71],
   "variant": 1
  },
  {
   "obj": "tree.pool-pine",
   "at": [-4.12, 9.43],
   "variant": 2
  },
  {
   "obj": "tree.pool-pine",
   "at": [-3.51, 4.9],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "ground.log",
   "at": [-2.32, 6.98],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.bracken",
   "at": [-1.22, 4.96],
   "variant": 1
  },
  {
   "obj": "plant.gorse",
   "at": [4.58, 10.47],
   "variant": 0
  },
  {
   "obj": "plant.gorse",
   "at": [5.56, 9.62],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.gorse",
   "at": [8.15, 11.09],
   "variant": 0
  },
  {
   "obj": "plant.gorse",
   "at": [1.1, 15.71],
   "variant": 1
  },
  {
   "obj": "plant.gorse",
   "at": [3.46, 18.85],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.gorse",
   "at": [7.29, 21.92],
   "variant": 2
  },
  {
   "obj": "tree.birch-heath",
   "at": [8.25, 20.95],
   "variant": 1
  },
  {
   "obj": "tree.birch-heath",
   "at": [17.44, 26.93],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pine-veteran",
   "at": [25.58, 47.13],
   "variant": 1
  },
  {
   "obj": "bird.stonechat",
   "at": [14.46, 24.8],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [9.28, 20.95]
  },
  {
   "obj": "animal.cattle",
   "at": [2.34, 5.68],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "animal.cattle",
   "at": [4.64, 6.98],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.cattle",
   "at": [2.03, 14.5],
   "variant": 1
  },
  {
   "obj": "animal.pony",
   "at": [0.36, 20.49],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "animal.pony",
   "at": [4.2, 17.14],
   "variant": 0
  },
  {
   "obj": "plant.yc-gorse-spray",
   "at": [3.38, 4.6],
   "variant": 0,
   "facing": 270
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
