/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-green-1-autumn-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-green-1-autumn`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (112):
     - place[0]: landmark.st-peters-yateley: pixel placement unprojected to [14.4, 40.8] m
     - place[1]: building.green-cottage: pixel placement unprojected to [-9.5, 37] m
     - place[2]: building.green-cottage: pixel placement unprojected to [-5.9, 35.4] m
     - place[3]: building.green-cottage: pixel placement unprojected to [-2.9, 37] m
     - place[4]: building.green-cottage: pixel placement unprojected to [-0.1, 35.4] m
     - place[5]: tree.distant-pine: pixel placement unprojected to [12.5, 26.3] m
     - place[6]: tree.green-oak: pixel placement unprojected to [-10.8, 19.9] m
     - place[7]: tree.green-oak: pixel placement unprojected to [-8.3, 17] m
     - place[8]: tree.hawthorn: pixel placement unprojected to [1.3, 20.9] m
     - place[9]: tree.green-birch: pixel placement unprojected to [-7.6, 23.3] m
     - place[10]: tree.green-chestnut: pixel placement unprojected to [10.3, 18.1] m
     - place[11]: tree.green-willow: pixel placement unprojected to [-4.9, 12] m
     - place[12]: plant.shrub: pixel placement unprojected to [-2.1, 13.3] m
     - place[13]: tree.green-alder: pixel placement unprojected to [1.9, 13.1] m
     - place[14]: tree.green-alder: pixel placement unprojected to [5.1, 11.8] m
     - place[15]: tree.green-alder: pixel placement unprojected to [-6.6, 9.6] m
     - place[16]: water.fish-ring: pixel placement unprojected to [1.9, 7.9] m
     - place[17]: water.fish-ring: pixel placement unprojected to [-2, 7] m
     - place[18]: street.bench: pixel placement unprojected to [3.4, 6.7] m
     - place[19]: bird.robin: pixel placement unprojected to [3.6, 7.6] m
     - place[20]: street.lamp: pixel placement unprojected to [3, 6.8] m
     - place[21]: tree.green-oak: pixel placement unprojected to [4.9, 6.7] m
     - place[22]: animal.squirrel: pixel placement unprojected to [4.2, 6.5] m
     - place[23]: tree.green-oak: pixel placement unprojected to [-3.1, 4.4] m
     - place[24]: plant.yg-oak-bough: sky or horizon art with no foot; dropped
     - place[25]: plant.yg-reedbed: pixel placement unprojected to [-1.2, 13.3] m
     - place[26]: plant.yg-reedbed: pixel placement unprojected to [-1.4, 13.1] m
     - place[27]: plant.yg-reedbed: pixel placement unprojected to [3.3, 13] m
     - place[28]: plant.yg-reedbed: pixel placement unprojected to [2.9, 12.9] m
     - place[29]: plant.yg-reedbed: pixel placement unprojected to [3.1, 12.9] m
     - place[30]: plant.yg-reedbed: pixel placement unprojected to [-4.2, 12.8] m
     - place[31]: plant.yg-reedbed: pixel placement unprojected to [-4.2, 12.7] m
     - place[32]: plant.yg-reedbed: pixel placement unprojected to [-3.9, 12.6] m
     - place[33]: plant.yg-reedbed: pixel placement unprojected to [4.9, 12.4] m
     - place[34]: plant.yg-reedbed: pixel placement unprojected to [4.7, 12.3] m
     - place[35]: plant.bulrush: pixel placement unprojected to [4, 8.2] m
     - place[36]: plant.bulrush: pixel placement unprojected to [4.1, 8.2] m
     - place[37]: plant.yg-reedbed: pixel placement unprojected to [-3.2, 7.2] m
     - place[38]: plant.bulrush: pixel placement unprojected to [-3.2, 7.2] m
     - place[39]: plant.bulrush: pixel placement unprojected to [-3.1, 7.1] m
     ... and 72 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-green-1-autumn-w3","label":"Yateley Green, Hampshire","site":"Yateley Green — Golden leaves around the green pond","tags":["uk","south east","hampshire","landscape","village green","pond","wildflowers","autumn","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"calm","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 51.34,
  "lon": -0.83,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 78,
  "horizon": 470,
  "heading": 100
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.4],
    [3.5, 3.4],
    [3036.7, 3000],
    [-3036.7, 3000]]
  }],
 "entities": [{
   "obj": "building.green-cottage",
   "at": [-9.45, 37.05],
   "variant": 1
  },
  {
   "obj": "tree.distant-pine",
   "at": [12.45, 26.29],
   "variant": 1
  },
  {
   "obj": "tree.green-oak",
   "at": [-10.83, 19.88],
   "variant": 2
  },
  {
   "obj": "tree.green-oak",
   "at": [-8.28, 16.98],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.hawthorn",
   "at": [1.27, 20.9],
   "variant": 1
  },
  {
   "obj": "tree.green-birch",
   "at": [-7.64, 23.29],
   "variant": 1
  },
  {
   "obj": "tree.green-chestnut",
   "at": [10.3, 18.11],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.green-willow",
   "at": [-4.95, 11.99],
   "variant": 0
  },
  {
   "obj": "plant.shrub",
   "at": [-2.15, 13.25],
   "variant": 0
  },
  {
   "obj": "tree.green-alder",
   "at": [1.92, 13.15],
   "variant": 0
  },
  {
   "obj": "tree.green-alder",
   "at": [5.09, 11.81],
   "variant": 1
  },
  {
   "obj": "tree.green-alder",
   "at": [-6.6, 9.59],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "water.fish-ring",
   "at": [1.92, 7.91]
  },
  {
   "obj": "water.fish-ring",
   "at": [-1.97, 6.97],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [3.35, 6.68],
   "variant": 0
  },
  {
   "obj": "bird.robin",
   "at": [3.56, 7.62],
   "variant": 1
  },
  {
   "obj": "tree.green-oak",
   "at": [4.94, 6.68],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.squirrel",
   "at": [4.23, 6.47],
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [-3.12, 4.43],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.25, 13.25],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.38, 13.15],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [3.27, 13.04],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.88, 12.94],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [3.06, 12.94],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-4.18, 12.84],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-4.22, 12.73],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-3.94, 12.64],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [4.9, 12.44],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [4.68, 12.35],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [4.03, 8.19],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [4.06, 8.15],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-3.2, 7.21],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [-3.19, 7.21],
   "variant": 2
  },
  {
   "obj": "plant.bulrush",
   "at": [-3.06, 7.09],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.72, 6.97],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.94, 6.91],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [2.96, 6.82],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.12, 6.25],
   "variant": 0
  },
  {
   "obj": "plant.bulrush",
   "at": [-2.14, 6.17],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.36, 6.11],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.59, 14.55],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.41, 14.17],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.8, 13.58],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [8.31, 13.58],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [8.41, 13.47],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [7.66, 13.25],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [8.89, 13.25],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.03, 12.73],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.55, 5.7],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.62, 5.62],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [0.58, 5.49],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [0.45, 5.49],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.23, 5.43],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.51, 5.88],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [3.8, 5.82],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.73, 5.78],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.61, 5.22],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.36, 5.16],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.25, 5.11],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [3.39, 5.11],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.24, 5.03],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [2.9, 4.98],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.12, 4.92],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.61, 4.91],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [-4, 4.88],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.48, 4.87],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.4, 4.81],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.07, 4.71],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.8, 4.66],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.46, 4.48],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [0.65, 4.47],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.05, 4.45],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [0.57, 4.43],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.85, 4.42],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.35, 4.32],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.51, 4.28],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.03, 4.26],
   "variant": 2
  },
  {
   "obj": "plant.grass-long",
   "at": [3.41, 4.22],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.59, 4.21],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.78, 4.13],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.77, 4.09],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.63, 4],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.93, 3.66],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.42, 3.65],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.7, 3.65],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.95, 3.65],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.66, 3.64],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.84, 3.64],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.93, 3.59],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-0.92, 3.56],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.heron",
   "at": [3.83, 8.76],
   "facing": 270
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
