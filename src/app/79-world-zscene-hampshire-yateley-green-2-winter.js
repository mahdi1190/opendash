/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-green-2-winter-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-green-2-winter`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (130):
     - place[0]: building.green-cottage: pixel placement unprojected to [-18.4, 47.9] m
     - place[1]: building.green-cottage: pixel placement unprojected to [-13, 46.6] m
     - place[2]: building.green-cottage: pixel placement unprojected to [-7.8, 47.9] m
     - place[3]: landmark.st-peters-yateley: pixel placement unprojected to [18.8, 45.3] m
     - place[4]: tree.green-oak: pixel placement unprojected to [1.3, 21.4] m
     - place[5]: tree.green-oak: pixel placement unprojected to [12.5, 19] m
     - place[6]: tree.green-oak: pixel placement unprojected to [-8.5, 14.3] m
     - place[7]: tree.green-birch: pixel placement unprojected to [4.9, 23.3] m
     - place[8]: street.bench: pixel placement unprojected to [5.6, 21.4] m
     - place[9]: bird.robin: pixel placement unprojected to [5.3, 22.6] m
     - place[10]: animal.squirrel: pixel placement unprojected to [12.3, 17.3] m
     - place[11]: animal.rabbit: pixel placement unprojected to [16.1, 19] m
     - place[12]: bird.heron: pixel placement unprojected to [5.2, 9.7] m
     - place[13]: water.fish-ring: pixel placement unprojected to [-1.2, 7.4] m
     - place[14]: water.fish-ring: pixel placement unprojected to [2.2, 5.8] m
     - place[15]: water.fish-ring: pixel placement unprojected to [-2, 4.8] m
     - place[16]: tree.green-oak: pixel placement unprojected to [3.4, 3.9] m
     - place[17]: tree.green-alder: pixel placement unprojected to [-4, 5.3] m
     - place[18]: bird.robin: pixel placement unprojected to [-2.8, 5.1] m
     - place[19]: ground.log: pixel placement unprojected to [-2.3, 4.5] m
     - place[20]: plant.yg-oak-bough: sky or horizon art with no foot; dropped
     - place[21]: plant.yg-reedbed: pixel placement unprojected to [9.9, 11.2] m
     - place[22]: plant.yg-reedbed: pixel placement unprojected to [9.5, 11.2] m
     - place[23]: plant.yg-reedbed: pixel placement unprojected to [-9.9, 11.1] m
     - place[24]: plant.yg-reedbed: pixel placement unprojected to [-9.8, 11.1] m
     - place[25]: plant.yg-reedbed: pixel placement unprojected to [-2.7, 11.1] m
     - place[26]: plant.yg-reedbed: pixel placement unprojected to [-2.6, 11.1] m
     - place[27]: plant.yg-reedbed: pixel placement unprojected to [-9.9, 11] m
     - place[28]: plant.yg-reedbed: pixel placement unprojected to [1.6, 11] m
     - place[29]: plant.yg-reedbed: pixel placement unprojected to [7.3, 11] m
     - place[30]: plant.yg-reedbed: pixel placement unprojected to [-5.7, 10.9] m
     - place[31]: plant.yg-reedbed: pixel placement unprojected to [-6.4, 10.9] m
     - place[32]: plant.yg-reedbed: pixel placement unprojected to [1.3, 10.9] m
     - place[33]: plant.yg-reedbed: pixel placement unprojected to [1.3, 10.9] m
     - place[34]: plant.yg-reedbed: pixel placement unprojected to [6.5, 10.9] m
     - place[35]: plant.yg-reedbed: pixel placement unprojected to [7.1, 10.9] m
     - place[36]: plant.yg-reedbed: pixel placement unprojected to [-10.4, 10.8] m
     - place[37]: plant.yg-reedbed: pixel placement unprojected to [6.9, 10.7] m
     - place[38]: plant.bulrush: pixel placement unprojected to [-5.9, 10.6] m
     - place[39]: plant.yg-meadow: pixel placement unprojected to [10.7, 14.1] m
     ... and 90 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-green-2-winter-w3","label":"Yateley Green, Hampshire","site":"Yateley Green — Frosted reeds and winter waterbirds","tags":["uk","south east","hampshire","landscape","village green","pond","wildflowers","winter","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"calm","colour":"blue"},
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
  "horizon": 480,
  "heading": 220
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.5],
    [3.5, 3.5],
    [3036.7, 3000],
    [-3036.7, 3000]]
  }],
 "entities": [{
   "obj": "building.green-cottage",
   "at": [-18.44, 47.94],
   "variant": 0
  },
  {
   "obj": "tree.green-oak",
   "at": [1.3, 21.45],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [12.47, 18.95],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [-8.54, 14.3],
   "variant": 2
  },
  {
   "obj": "tree.green-birch",
   "at": [4.95, 23.29],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [5.64, 21.45],
   "variant": 1
  },
  {
   "obj": "bird.robin",
   "at": [5.27, 22.64],
   "variant": 0
  },
  {
   "obj": "animal.squirrel",
   "at": [12.29, 17.34]
  },
  {
   "obj": "animal.rabbit",
   "at": [16.12, 18.95],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.heron",
   "at": [5.21, 9.7],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "water.fish-ring",
   "at": [-1.2, 7.41]
  },
  {
   "obj": "water.fish-ring",
   "at": [2.24, 5.82],
   "variant": 1
  },
  {
   "obj": "water.fish-ring",
   "at": [-2.04, 4.79]
  },
  {
   "obj": "tree.green-oak",
   "at": [3.38, 3.88],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.green-alder",
   "at": [-4.05, 5.26],
   "variant": 1
  },
  {
   "obj": "bird.robin",
   "at": [-2.84, 5.09],
   "variant": 1
  },
  {
   "obj": "ground.log",
   "at": [-2.25, 4.45],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [9.87, 11.24],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [9.49, 11.16],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-9.89, 11.09],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-9.8, 11.09],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.68, 11.09],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.62, 11.09],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-9.86, 11.01],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [1.57, 11.01],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [7.29, 11.01],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-5.69, 10.94],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-6.4, 10.94],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [1.33, 10.87],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [1.31, 10.87],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [6.48, 10.87],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [7.12, 10.87],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-10.36, 10.8],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [6.86, 10.72],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.bulrush",
   "at": [-5.9, 10.58],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [10.67, 14.05],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [10.86, 13.81],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [5.62, 13.58],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.8, 13.47],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.42, 13.47],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.14, 12.94],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.36, 12.84],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.28, 12.73],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.23, 12.54],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.2, 12.44],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [5.11, 22.96],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.38, 22.03],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.46, 21.17],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [12.02, 18.74],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [12.15, 18.52],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [11.57, 18.52],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.53, 14.82],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.41, 14.43],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-8.14, 14.17],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-4.24, 28.1],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-5.54, 27.63],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-5.03, 27.63],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [-4.44, 26.72],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [12.77, 26.72],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-3.93, 25.87],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [10.1, 25.08],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [11.23, 24.7],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [11.55, 24.7],
   "variant": 2
  },
  {
   "obj": "plant.daisies",
   "at": [11.23, 23.97],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [10.35, 23.62],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [17.88, 22.03],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [16.94, 21.73],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [-8.25, 21.45],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [-8.46, 21.17],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [17.51, 21.17],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [16.86, 21.17],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [16.89, 21.17],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-15.62, 21.17],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [-9.18, 20.9],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [-8.5, 20.9],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [-16.14, 20.9],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-8.69, 20.63],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-15.29, 20.63],
   "variant": 2
  },
  {
   "obj": "plant.daisies",
   "at": [-15.84, 20.38],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [-7.56, 20.12],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [-8.67, 19.88],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-12.58, 19.64],
   "variant": 1
  },
  {
   "obj": "plant.bulrush",
   "at": [3.38, 5.95],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [3.06, 5.6],
   "variant": 0
  },
  {
   "obj": "plant.bulrush",
   "at": [2.31, 5.47],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [3.47, 5.36],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.87, 5.31],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.97, 5.28],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.48, 5.26],
   "variant": 0
  },
  {
   "obj": "plant.bulrush",
   "at": [-2.77, 4.98],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.27, 4.32],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.72, 4.28],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.23, 4.28],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.94, 4.2],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.68, 6.04],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.73, 5.97],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.96, 5.88],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.68, 5.7],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.71, 5.68],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.19, 5.38],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.45, 5.36],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.75, 5.36],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.83, 5.33],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.91, 5.28],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.17, 4.43],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.53, 4.39],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.7, 4.3],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.59, 4.29],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.01, 4.27],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.92, 4.23],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.9, 3.71],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.07, 3.71],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.05, 3.7],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.2, 3.68],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.88, 3.68],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.89, 3.67],
   "variant": 1,
   "facing": 270
  }],
 "landmarks": [{
   "obj": "landmark.st-peters-yateley",
   "at": [18.79, 45.28],
   "variant": 0,
   "src": "https://yateley-tc.gov.uk/our-services/open-spaces/"
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
