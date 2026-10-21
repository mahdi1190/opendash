/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-green-4-autumn-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-green-4-autumn`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (96):
     - place[0]: landmark.st-peters-yateley: pixel placement unprojected to [19, 60.5] m
     - place[1]: building.green-cottage: pixel placement unprojected to [-32.4, 56.2] m
     - place[2]: building.green-cottage: pixel placement unprojected to [-20.9, 60.5] m
     - place[3]: building.green-cottage: pixel placement unprojected to [2.4, 56.2] m
     - place[4]: building.green-cottage: pixel placement unprojected to [36.5, 56.2] m
     - place[5]: tree.green-oak: pixel placement unprojected to [-8.8, 17.9] m
     - place[6]: tree.green-oak: pixel placement unprojected to [-11.4, 30.3] m
     - place[7]: tree.green-oak: pixel placement unprojected to [-3.1, 27.1] m
     - place[8]: tree.green-oak: pixel placement unprojected to [11.7, 17.1] m
     - place[9]: tree.green-birch: pixel placement unprojected to [4.5, 25.4] m
     - place[10]: tree.hawthorn: pixel placement unprojected to [-0.3, 24.6] m
     - place[11]: street.lamp: pixel placement unprojected to [1.3, 20.2] m
     - place[12]: street.lamp: pixel placement unprojected to [15.7, 19.7] m
     - place[13]: bird.heron: pixel placement unprojected to [4.9, 7] m
     - place[14]: water.fish-ring: pixel placement unprojected to [-0.9, 10.2] m
     - place[15]: water.fish-ring: pixel placement unprojected to [2, 7.4] m
     - place[16]: water.fish-ring: pixel placement unprojected to [-2.7, 6.2] m
     - place[17]: street.bench: pixel placement unprojected to [1.7, 4.3] m
     - place[18]: bird.robin: pixel placement unprojected to [1.7, 4.7] m
     - place[19]: animal.squirrel: pixel placement unprojected to [-3, 4.3] m
     - place[20]: tree.green-oak: pixel placement unprojected to [-3.3, 3.5] m
     - place[21]: tree.green-chestnut: pixel placement unprojected to [3.5, 3.6] m
     - place[22]: plant.yg-reedbed: pixel placement unprojected to [14.5, 14.7] m
     - place[23]: plant.yg-reedbed: pixel placement unprojected to [11.5, 12.8] m
     - place[24]: plant.yg-reedbed: pixel placement unprojected to [-10.3, 12.5] m
     - place[25]: plant.yg-reedbed: pixel placement unprojected to [-10.5, 12.4] m
     - place[26]: plant.bulrush: pixel placement unprojected to [-11, 12.3] m
     - place[27]: plant.yg-reedbed: pixel placement unprojected to [10.1, 12.2] m
     - place[28]: plant.yg-reedbed: pixel placement unprojected to [10.1, 11.7] m
     - place[29]: plant.yg-reedbed: pixel placement unprojected to [9, 11.6] m
     - place[30]: plant.yg-reedbed: pixel placement unprojected to [-10.8, 11.5] m
     - place[31]: plant.yg-reedbed: pixel placement unprojected to [8.8, 11.5] m
     - place[32]: plant.bulrush: pixel placement unprojected to [3.3, 5.2] m
     - place[33]: plant.bulrush: pixel placement unprojected to [3.1, 5.1] m
     - place[34]: plant.yg-reedbed: pixel placement unprojected to [-1.9, 5] m
     - place[35]: plant.yg-reedbed: pixel placement unprojected to [0.4, 5] m
     - place[36]: plant.yg-reedbed: pixel placement unprojected to [-1.9, 5] m
     - place[37]: plant.yg-reedbed: pixel placement unprojected to [-2.1, 5] m
     - place[38]: plant.bulrush: pixel placement unprojected to [0.7, 4.9] m
     - place[39]: plant.yg-reedbed: pixel placement unprojected to [0.6, 4.9] m
     ... and 56 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-green-4-autumn-w3","label":"Yateley Green, Hampshire","site":"Yateley Green — Autumn dusk beneath the birches","tags":["uk","south east","hampshire","landscape","village green","pond","wildflowers","autumn","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"dreamy","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 51.34,
  "lon": -0.83,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 80,
  "horizon": 486,
  "heading": 270
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.6, 3.4],
    [3.6, 3.4],
    [3146.6, 3000],
    [-3146.6, 3000]]
  }],
 "entities": [{
   "obj": "building.green-cottage",
   "at": [-32.41, 56.18],
   "variant": 0
  },
  {
   "obj": "building.green-cottage",
   "at": [-20.94, 60.5],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "building.green-cottage",
   "at": [2.36, 56.18],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "building.green-cottage",
   "at": [36.54, 56.18],
   "variant": 2
  },
  {
   "obj": "tree.green-oak",
   "at": [-8.81, 17.88],
   "variant": 2
  },
  {
   "obj": "tree.green-oak",
   "at": [-11.42, 30.25],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [-3.13, 27.12],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [11.69, 17.1],
   "variant": 2
  },
  {
   "obj": "tree.green-birch",
   "at": [4.47, 25.37],
   "variant": 0
  },
  {
   "obj": "tree.hawthorn",
   "at": [-0.26, 24.58],
   "variant": 1
  },
  {
   "obj": "street.lamp",
   "at": [1.27, 20.17],
   "variant": 0
  },
  {
   "obj": "street.lamp",
   "at": [15.68, 19.66],
   "variant": 0
  },
  {
   "obj": "bird.heron",
   "at": [4.89, 6.96],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "water.fish-ring",
   "at": [-0.86, 10.22]
  },
  {
   "obj": "water.fish-ring",
   "at": [2, 7.35],
   "variant": 1
  },
  {
   "obj": "water.fish-ring",
   "at": [-2.73, 6.19]
  },
  {
   "obj": "street.bench",
   "at": [1.72, 4.32],
   "variant": 0
  },
  {
   "obj": "bird.robin",
   "at": [1.74, 4.74],
   "variant": 1
  },
  {
   "obj": "animal.squirrel",
   "at": [-2.99, 4.32]
  },
  {
   "obj": "tree.green-oak",
   "at": [-3.31, 3.54],
   "variant": 0
  },
  {
   "obj": "tree.green-chestnut",
   "at": [3.5, 3.62],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [14.5, 14.7],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [11.48, 12.79],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-10.33, 12.49],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-10.54, 12.39],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [-11.01, 12.29],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [10.09, 12.19],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [10.11, 11.74],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [9.01, 11.57],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-10.78, 11.48],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [8.8, 11.48],
   "variant": 1
  },
  {
   "obj": "plant.bulrush",
   "at": [3.31, 5.16],
   "variant": 2
  },
  {
   "obj": "plant.bulrush",
   "at": [3.13, 5.11],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.86, 5.03],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [0.42, 4.99],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.86, 4.98],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.13, 4.96],
   "variant": 0
  },
  {
   "obj": "plant.bulrush",
   "at": [0.65, 4.93],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [0.6, 4.9],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.65, 17.48],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.95, 17.48],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.62, 17.48],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-5.68, 17.48],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.1, 17.29],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [15.14, 17.1],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [11.32, 16.92],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [11.43, 16.74],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [11.74, 16.74],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [14.68, 16.56],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-22.66, 34.96],
   "variant": 2
  },
  {
   "obj": "plant.grass",
   "at": [0.65, 34.2],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [14.31, 34.2],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-20.01, 33.47],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [1.51, 33.47],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [13.45, 33.47],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-21, 32.77],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-19.04, 32.77],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [1.75, 32.77],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [13.23, 32.77],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [14.75, 32.77],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [11.65, 32.77],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [2.86, 32.1],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [0.19, 30.85],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [1.3, 30.25],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [-20.3, 29.68],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.64, 4.78],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.96, 4.77],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.75, 4.75],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.85, 4.75],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.38, 4.74],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4, 4.71],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.14, 4.7],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.43, 4.67],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.94, 4.57],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.55, 4.56],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.91, 4.55],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.33, 4.53],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.56, 4.49],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.35, 3.57],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.7, 3.56],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.52, 3.55],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.52, 3.54],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.05, 3.54],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.66, 3.54],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.74, 3.54],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.43, 3.52],
   "variant": 2,
   "facing": 270
  }],
 "landmarks": [{
   "obj": "landmark.st-peters-yateley",
   "at": [19.04, 60.5],
   "variant": 1,
   "src": "https://yateley-tc.gov.uk/our-services/open-spaces/"
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
