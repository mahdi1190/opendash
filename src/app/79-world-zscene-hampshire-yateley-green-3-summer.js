/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-green-3-summer-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-green-3-summer`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (118):
     - place[0]: landmark.st-peters-yateley: pixel placement unprojected to [13, 41.4] m
     - place[1]: building.green-cottage: pixel placement unprojected to [-6.9, 41.4] m
     - place[2]: building.green-cottage: pixel placement unprojected to [-1.2, 39.3] m
     - place[3]: building.green-cottage: pixel placement unprojected to [19.5, 41.4] m
     - place[4]: building.green-cottage: pixel placement unprojected to [24.3, 39.3] m
     - place[5]: tree.green-oak: pixel placement unprojected to [-9.2, 17.5] m
     - place[6]: tree.green-oak: pixel placement unprojected to [13.4, 18.3] m
     - place[7]: tree.green-oak: pixel placement unprojected to [1.7, 20.2] m
     - place[8]: street.bench: pixel placement unprojected to [-4.1, 16.4] m
     - place[9]: street.bench: pixel placement unprojected to [7, 17.5] m
     - place[10]: bird.robin: pixel placement unprojected to [6.9, 18.3] m
     - place[11]: animal.rabbit: pixel placement unprojected to [3.8, 16.4] m
     - place[12]: water.fish-ring: pixel placement unprojected to [0.3, 5.4] m
     - place[13]: water.fish-ring: pixel placement unprojected to [-3.6, 6.8] m
     - place[14]: water.fish-ring: pixel placement unprojected to [2.5, 6.3] m
     - place[15]: tree.green-oak: pixel placement unprojected to [-2.9, 3.6] m
     - place[16]: tree.green-chestnut: pixel placement unprojected to [3, 3.7] m
     - place[17]: animal.squirrel: pixel placement unprojected to [2.5, 3.8] m
     - place[18]: bird.robin: pixel placement unprojected to [-2.3, 3.9] m
     - place[19]: bird.robin: pixel placement unprojected to [1.6, 4] m
     - place[20]: ground.log: pixel placement unprojected to [2.2, 4.1] m
     - place[21]: plant.yg-reedbed: pixel placement unprojected to [6, 11.5] m
     - place[22]: plant.yg-reedbed: pixel placement unprojected to [-2.9, 11.2] m
     - place[23]: plant.yg-reedbed: pixel placement unprojected to [6.2, 11.2] m
     - place[24]: plant.yg-reedbed: pixel placement unprojected to [8.8, 11.2] m
     - place[25]: plant.yg-reedbed: pixel placement unprojected to [4.7, 11.2] m
     - place[26]: plant.yg-reedbed: pixel placement unprojected to [8.6, 11.2] m
     - place[27]: plant.yg-reedbed: pixel placement unprojected to [-3.3, 11.1] m
     - place[28]: plant.bulrush: pixel placement unprojected to [9, 11.1] m
     - place[29]: plant.yg-reedbed: pixel placement unprojected to [8.9, 10.8] m
     - place[30]: plant.yg-reedbed: pixel placement unprojected to [-6.7, 10.6] m
     - place[31]: plant.yg-reedbed: pixel placement unprojected to [-6.6, 10.6] m
     - place[32]: plant.yg-reedbed: pixel placement unprojected to [-6.3, 10.5] m
     - place[33]: plant.yg-reedbed: pixel placement unprojected to [-8.6, 9.5] m
     - place[34]: plant.yg-reedbed: pixel placement unprojected to [-8.4, 9.5] m
     - place[35]: plant.bulrush: pixel placement unprojected to [-9.3, 9.5] m
     - place[36]: plant.yg-reedbed: pixel placement unprojected to [-8.7, 9.4] m
     - place[37]: plant.yg-meadow: pixel placement unprojected to [2.6, 19.9] m
     - place[38]: plant.yg-meadow: pixel placement unprojected to [1.5, 19.4] m
     - place[39]: plant.grass-long: pixel placement unprojected to [13.7, 17.9] m
     ... and 78 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-green-3-summer-w3","label":"Yateley Green, Hampshire","site":"Yateley Green — Leafy shade beside the open green","tags":["uk","south east","hampshire","landscape","village green","pond","wildflowers","summer","world-v3"],"liveSky":{"lat":51.343,"lon":-0.835},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.343,
  "lon": -0.835,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 80,
  "horizon": 470,
  "heading": 228
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.3],
    [3.5, 3.3],
    [3146.6, 3000],
    [-3146.6, 3000]]
  }],
 "entities": [{
   "obj": "building.green-cottage",
   "at": [-6.95, 41.4],
   "variant": 1
  },
  {
   "obj": "building.green-cottage",
   "at": [19.54, 41.4],
   "variant": 0
  },
  {
   "obj": "tree.green-oak",
   "at": [-9.17, 17.48],
   "variant": 2
  },
  {
   "obj": "tree.green-oak",
   "at": [13.43, 18.29],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.green-oak",
   "at": [1.69, 20.17],
   "variant": 2
  },
  {
   "obj": "street.bench",
   "at": [-4.12, 16.39],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [6.97, 17.48],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.robin",
   "at": [6.91, 18.29],
   "variant": 1
  },
  {
   "obj": "animal.rabbit",
   "at": [3.78, 16.39],
   "variant": 0
  },
  {
   "obj": "water.fish-ring",
   "at": [0.34, 5.42]
  },
  {
   "obj": "water.fish-ring",
   "at": [-3.59, 6.84],
   "variant": 1
  },
  {
   "obj": "water.fish-ring",
   "at": [2.51, 6.29]
  },
  {
   "obj": "tree.green-oak",
   "at": [-2.92, 3.62],
   "variant": 0
  },
  {
   "obj": "tree.green-chestnut",
   "at": [3.05, 3.73],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.squirrel",
   "at": [2.5, 3.84],
   "facing": 270
  },
  {
   "obj": "bird.robin",
   "at": [-2.26, 3.91],
   "variant": 1
  },
  {
   "obj": "bird.robin",
   "at": [1.58, 3.97],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [5.99, 11.48],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-2.92, 11.24],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [6.23, 11.24],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [8.79, 11.24],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [4.68, 11.16],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [8.59, 11.16],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-3.31, 11.08],
   "variant": 2
  },
  {
   "obj": "plant.bulrush",
   "at": [8.98, 11.08],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [8.86, 10.85],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-6.67, 10.63],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-6.61, 10.56],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-6.27, 10.49],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-8.62, 9.53],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-8.39, 9.48],
   "variant": 1
  },
  {
   "obj": "plant.bulrush",
   "at": [-9.29, 9.48],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-8.68, 9.42],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.59, 19.91],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.55, 19.42],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [13.65, 17.88],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [12.85, 17.48],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [13, 17.29],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.54, 17.1],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.11, 16.74],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.11, 16.74],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.83, 13.22],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [2.56, 13.11],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.14, 13.11],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [0.31, 12.89],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.79, 12.79],
   "variant": 2
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.35, 12.19],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-9.25, 12.1],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [7.22, 29.68],
   "variant": 2
  },
  {
   "obj": "plant.daisies",
   "at": [7.66, 29.68],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [5.52, 28.6],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [-6.31, 28.09],
   "variant": 0
  },
  {
   "obj": "plant.daisies",
   "at": [6.01, 28.09],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-5.73, 27.6],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-5.23, 27.12],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-5.06, 27.12],
   "variant": 2
  },
  {
   "obj": "plant.grass",
   "at": [5.86, 27.12],
   "variant": 1
  },
  {
   "obj": "plant.grass",
   "at": [-4.76, 26.22],
   "variant": 2
  },
  {
   "obj": "plant.grass",
   "at": [-5.73, 25.79],
   "variant": 2
  },
  {
   "obj": "plant.grass",
   "at": [13.8, 23.84],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [13.52, 23.84],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [-18.27, 23.48],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [12.46, 22.8],
   "variant": 1
  },
  {
   "obj": "plant.daisies",
   "at": [-15.64, 22.8],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [13.51, 22.47],
   "variant": 0
  },
  {
   "obj": "plant.grass",
   "at": [11.95, 22.16],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-15.8, 22.16],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.daisies",
   "at": [11.62, 21.85],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-14.11, 21.26],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass",
   "at": [-15.99, 20.97],
   "variant": 2
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.41, 5.01],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.57, 4.96],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [2.17, 4.84],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.6, 4.68],
   "variant": 1
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.45, 4.67],
   "variant": 2
  },
  {
   "obj": "plant.bulrush",
   "at": [-1.61, 4.63],
   "variant": 0
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-1.5, 4.61],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-0.41, 4.25],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-0.56, 4.11],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-reedbed",
   "at": [-0.38, 4.02],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.76, 5.41],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.24, 5.37],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.02, 5.31],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.77, 5.17],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [3.44, 5.17],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [4.14, 5.03],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.84, 4.93],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.66, 4.87],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.09, 4.8],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-4.04, 4.75],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.6, 3.98],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.45, 3.91],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.67, 3.9],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-1.63, 3.87],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.84, 3.84],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.66, 3.55],
   "variant": 0
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.33, 3.49],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [1.94, 3.49],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.52, 3.48],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.39, 3.47],
   "variant": 2
  },
  {
   "obj": "plant.yg-meadow",
   "at": [2.79, 3.47],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-3.41, 3.46],
   "variant": 1
  },
  {
   "obj": "plant.yg-meadow",
   "at": [-2.59, 3.44],
   "variant": 1,
   "facing": 270
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
