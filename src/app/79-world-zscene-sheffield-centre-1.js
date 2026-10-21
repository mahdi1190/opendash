/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-centre-1-w3: converted by `node tools/world.mjs convert uk-north-sheffield-centre/south-yorkshire-sheffield-centre-1`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (9):
     - surfaces[6]: surface kind 'edge' has no v3 kind: dropped
     - surfaces[7]: surface kind 'edge' has no v3 kind: dropped
     - place[74]: tree.shc-plane-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - flows[0]: flow on ["walk-s","ring","walk-n","front"]: one population per surface is better; kept on 'walk-s' only
     - flows[1]: flow on ["pave-w","pave-e","east"]: one population per surface is better; kept on 'pave-w' only
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[162].y: repair: removed (missingField) air needs y (metres above the ground)
     - entities[51].at: repair: removed (badAttach) bird.pigeon stands on the ground but (6.4, 55.97) is water
     - entities[54].at: repair: removed (badAttach) bird.pigeon-feral stands on the ground but (6.79, 55.24) is water
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-centre-1-w3","label":"Peace Gardens, Sheffield","site":"The Peace Gardens: the cascades lead to the Goodwin Fountain and the Town Hall","tags":["uk","yorkshire","south yorkshire","sheffield","city","townscape","fountain","gardens","town hall","square","world-v3"],"liveSky":{"lat":53.3796,"lon":-1.4703},"mood":"cheerful","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 53.3796,
  "lon": -1.4703,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.7,
  "fov": 60,
  "horizon": 468,
  "heading": 352
 },
 "surfaces": [{
   "id": "land",
   "kind": "plaza",
   "poly": [[-3.5, 4.9],
    [3.5, 4.9],
    [2165.1, 3000],
    [-2165.1, 3000]]
  },
  {
   "id": "lawn-l",
   "kind": "grass",
   "poly": [[-36, 4],
    [-2.2, 4],
    [-2.2, 55],
    [-12, 58],
    [-14, 80],
    [-2.2, 82],
    [-2.2, 150],
    [-36, 150]]
  },
  {
   "id": "lawn-r",
   "kind": "grass",
   "poly": [[2.2, 4],
    [36, 4],
    [36, 150],
    [2.2, 150],
    [2.2, 82],
    [14, 80],
    [12, 58],
    [2.2, 55]]
  },
  {
   "id": "ring",
   "kind": "plaza",
   "poly": [[17, 67],
    [16.42, 70.24],
    [14.72, 73.25],
    [12.02, 75.84],
    [8.5, 77.83],
    [4.4, 79.07],
    [0, 79.5],
    [-4.4, 79.07],
    [-8.5, 77.83],
    [-12.02, 75.84],
    [-14.72, 73.25],
    [-16.42, 70.24],
    [-17, 67],
    [-16.42, 63.76],
    [-14.72, 60.75],
    [-12.02, 58.16],
    [-8.5, 56.17],
    [-4.4, 54.93],
    [0, 54.5],
    [4.4, 54.93],
    [8.5, 56.17],
    [12.02, 58.16],
    [14.72, 60.75],
    [16.42, 63.76]]
  },
  {
   "id": "walk-s",
   "kind": "plaza",
   "poly": [[-2.2, 4],
    [2.2, 4],
    [2.2, 57],
    [-2.2, 57]]
  },
  {
   "id": "walk-n",
   "kind": "plaza",
   "poly": [[-2.2, 78],
    [2.2, 78],
    [2.2, 151],
    [-2.2, 151]]
  },
  {
   "id": "pinstone",
   "kind": "road",
   "path": [[-44, 3],
    [-45.5, 120],
    [-48, 300]],
   "width": 8.4
  },
  {
   "id": "pave-w",
   "kind": "pavement",
   "path": [[-50, 2.92],
    [-51.5, 119.92],
    [-54, 299.92]],
   "width": 3.6
  },
  {
   "id": "pave-e",
   "kind": "pavement",
   "path": [[-37.6, 3.08],
    [-39.1, 120.09],
    [-41.6, 300.09]],
   "width": 4.4
  },
  {
   "id": "front",
   "kind": "plaza",
   "poly": [[-36, 150],
    [44, 150],
    [44, 158],
    [-36, 158]]
  },
  {
   "id": "east",
   "kind": "pavement",
   "poly": [[36, 4],
    [44, 4],
    [44, 150],
    [36, 150]]
  },
  {
   "id": "plot-e",
   "kind": "plaza",
   "poly": [[44, 4],
    [120, 4],
    [120, 160],
    [44, 160]]
  },
  {
   "id": "cascade-l",
   "kind": "water",
   "water": "canal",
   "poly": [[-5.1, 5],
    [-5.2, 6.3],
    [-5.2, 8.2],
    [-5.2, 10.3],
    [-5.3, 12.7],
    [-5.3, 15.2],
    [-5.4, 17.7],
    [-5.4, 20],
    [-5.5, 22.2],
    [-5.5, 24.5],
    [-5.6, 26.9],
    [-5.7, 29.2],
    [-5.7, 31.5],
    [-5.8, 33.8],
    [-5.8, 36],
    [-5.9, 38.5],
    [-6, 41],
    [-6.1, 43.5],
    [-6.1, 45.9],
    [-6.2, 48],
    [-6.3, 50],
    [-6.6, 52.4],
    [-6.9, 54.5],
    [-7.2, 56.2],
    [-7.3, 57.4],
    [-6.3, 57.6],
    [-6.1, 56.4],
    [-5.8, 54.7],
    [-5.5, 52.6],
    [-5.3, 50],
    [-5.1, 48.1],
    [-5, 45.9],
    [-5, 43.5],
    [-4.9, 41.1],
    [-4.8, 38.5],
    [-4.8, 36],
    [-4.7, 33.8],
    [-4.6, 31.6],
    [-4.6, 29.2],
    [-4.5, 26.9],
    [-4.5, 24.6],
    [-4.4, 22.3],
    [-4.4, 20],
    [-4.3, 17.7],
    [-4.3, 15.2],
    [-4.2, 12.7],
    [-4.2, 10.3],
    [-4.1, 8.2],
    [-4.1, 6.4],
    [-4.1, 5]],
   "shallow": 0.6
  },
  {
   "id": "cascade-r",
   "kind": "water",
   "water": "canal",
   "poly": [[4.1, 5],
    [4.1, 6.4],
    [4.1, 8.2],
    [4.2, 10.3],
    [4.2, 12.7],
    [4.3, 15.2],
    [4.3, 17.7],
    [4.4, 20],
    [4.4, 22.3],
    [4.5, 24.6],
    [4.5, 26.9],
    [4.6, 29.2],
    [4.6, 31.6],
    [4.7, 33.8],
    [4.8, 36],
    [4.8, 38.5],
    [4.9, 41.1],
    [5, 43.5],
    [5, 45.9],
    [5.1, 48.1],
    [5.3, 50],
    [5.5, 52.6],
    [5.8, 54.7],
    [6.1, 56.4],
    [6.3, 57.6],
    [7.3, 57.4],
    [7.2, 56.2],
    [6.9, 54.5],
    [6.6, 52.4],
    [6.3, 50],
    [6.2, 48],
    [6.1, 45.9],
    [6.1, 43.5],
    [6, 41],
    [5.9, 38.5],
    [5.8, 36],
    [5.8, 33.8],
    [5.7, 31.5],
    [5.7, 29.2],
    [5.6, 26.9],
    [5.5, 24.5],
    [5.5, 22.2],
    [5.4, 20],
    [5.4, 17.7],
    [5.3, 15.2],
    [5.3, 12.7],
    [5.2, 10.3],
    [5.2, 8.2],
    [5.2, 6.3],
    [5.1, 5]],
   "shallow": 0.6
  },
  {
   "id": "fountain",
   "kind": "water",
   "water": "pond",
   "poly": [[11, 68],
    [10.63, 69.86],
    [9.53, 71.6],
    [7.78, 73.09],
    [5.5, 74.24],
    [2.85, 74.95],
    [0, 75.2],
    [-2.85, 74.95],
    [-5.5, 74.24],
    [-7.78, 73.09],
    [-9.53, 71.6],
    [-10.63, 69.86],
    [-11, 68],
    [-10.63, 66.14],
    [-9.53, 64.4],
    [-7.78, 62.91],
    [-5.5, 61.76],
    [-2.85, 61.05],
    [0, 60.8],
    [2.85, 61.05],
    [5.5, 61.76],
    [7.78, 62.91],
    [9.53, 64.4],
    [10.63, 66.14]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "water.shc-jet",
   "at": [-9.23, 69.01],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-8.86, 69.81],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-8.27, 70.57],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-7.49, 71.26],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-6.53, 71.88],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-5.42, 72.41],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-4.18, 72.84],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-2.84, 73.15],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [-1.44, 73.34],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [0, 73.4],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [1.44, 73.34],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [2.84, 73.15],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [4.18, 72.84],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [5.42, 72.41],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [6.53, 71.88],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [7.49, 71.26],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [8.27, 70.57],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [8.86, 69.81],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.shc-jet",
   "at": [9.23, 69.01],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [-5.95, 66.53],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [-4.57, 65.2],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [-2.48, 64.31],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [0, 64],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [2.48, 64.31],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [4.57, 65.2],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.shc-bubbler",
   "at": [5.95, 66.53],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "tree.pool-birch",
   "at": [-17, 24],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-28, 66],
   "variant": 0
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-34, 95],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.plane-avenue",
   "at": [-31, 128],
   "variant": 0
  },
  {
   "obj": "tree.plane-avenue",
   "at": [30, 46],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [27, 58],
   "variant": 0
  },
  {
   "obj": "tree.plane-avenue",
   "at": [32, 90],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pool-birch",
   "at": [18, 104],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [13.5, 64],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [-10, 76],
   "variant": 1
  },
  {
   "obj": "street.bench",
   "at": [11, 77],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [4.6, 36],
   "variant": 0
  },
  {
   "obj": "street.lamppost",
   "at": [-3.2, 14],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [3.3, 27],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-15, 70],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [15.5, 59],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-3.2, 112],
   "variant": 3
  },
  {
   "obj": "street.lamppost",
   "at": [3.4, 131],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.child-jumping",
   "at": [-2.6, 60],
   "variant": 0
  },
  {
   "obj": "person.child-ball",
   "at": [6, 58.6]
  },
  {
   "obj": "person.bench-sitter",
   "at": [-13, 62.2]
  },
  {
   "obj": "person.photographer",
   "at": [3, 44],
   "facing": 270
  },
  {
   "obj": "person.phone-idler",
   "at": [-8.6, 38]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [9.11, 55.77],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [8.21, 55.47],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [7.94, 56.43],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [5.7, 54.69],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [8.21, 54.81],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon",
   "at": [-12, 82.8],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-12.67, 81.49],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.36, 82.88],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-10.96, 81.17],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-11.26, 82.38],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [2.51, 15.25],
   "variant": 2,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.37, 14.01],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [1.99, 14.81],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.27, 13.85],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-2.66, 27.46],
   "variant": 1,
   "facing": 90
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.97, 25.32],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.1, 25.26],
   "variant": 0,
   "facing": 90
  },
  {
   "obj": "person.bench-sitter",
   "at": [-3.1, 21],
   "variant": 0
  },
  {
   "obj": "person.bench-reader",
   "at": [3.2, 39],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.bench-sitter",
   "at": [-3.2, 46],
   "variant": 3
  },
  {
   "obj": "street.bollard",
   "at": [-2.8, 30],
   "variant": 2
  },
  {
   "obj": "street.bollard",
   "at": [2.9, 52],
   "variant": 2
  },
  {
   "obj": "person.bench-reader",
   "at": [3.3, 15.2],
   "variant": 1,
   "facing": 270
  },
  {
   "cluster": "building.gen-direct",
   "on": "land",
   "n": 19,
   "seed": 9778
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.36, 6.11]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.73, 6.14]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.51, 7.2]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.01, 16.21]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.94, 20.09]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.86, 23.23]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-17.35, 29.6]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.48, 33.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-22.04, 116.15]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.96, 6.33]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.75, 8.68]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.41, 8.96]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.03, 12.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.65, 12.41]
  },
  {
   "obj": "plant.wildflowers",
   "at": [9.48, 14.5]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.96, 15.22]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.13, 15.44]
  },
  {
   "obj": "plant.wildflowers",
   "at": [10.49, 16.49]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.82, 16.61]
  },
  {
   "obj": "plant.wildflowers",
   "at": [11.75, 17.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [11.79, 22.97]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.97, 26.97]
  },
  {
   "obj": "plant.wildflowers",
   "at": [11.97, 27.31]
  },
  {
   "cluster": "plant.wildflowers",
   "on": "lawn-r",
   "n": 4,
   "seed": 2937
  },
  {
   "obj": "plant.daisies",
   "at": [-2.82, 5.4]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.63, 6.3]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.3, 6.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.28, 7.11]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.14, 9.31]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.92, 9.74]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.43, 10.22]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.39, 13.92]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.67, 13.98]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.85, 14.31]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.02, 14.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.77, 15.14]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.23, 17.45]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.58, 20.59]
  },
  {
   "obj": "plant.daisies",
   "at": [-12.64, 23.42]
  },
  {
   "obj": "plant.daisies",
   "at": [-18.22, 28.98]
  },
  {
   "obj": "plant.daisies",
   "at": [-29.83, 69.51]
  },
  {
   "obj": "plant.daisies",
   "at": [-31.98, 82.13]
  },
  {
   "obj": "plant.daisies",
   "at": [-29.9, 85.06]
  },
  {
   "obj": "plant.daisies",
   "at": [2.21, 5.44]
  },
  {
   "obj": "plant.daisies",
   "at": [3.35, 7.91]
  },
  {
   "obj": "plant.daisies",
   "at": [3.37, 8.51]
  },
  {
   "obj": "plant.daisies",
   "at": [7.84, 16.25]
  },
  {
   "obj": "plant.daisies",
   "at": [8.84, 16.34]
  },
  {
   "obj": "plant.daisies",
   "at": [9.41, 19.24]
  },
  {
   "obj": "plant.daisies",
   "at": [9.29, 20]
  },
  {
   "obj": "plant.daisies",
   "at": [2.21, 23.9]
  },
  {
   "obj": "plant.daisies",
   "at": [16.37, 25.35]
  },
  {
   "obj": "plant.daisies",
   "at": [19.49, 72.32]
  },
  {
   "obj": "plant.daisies",
   "at": [16.89, 72.37]
  },
  {
   "cluster": "ground.leaves",
   "on": "ring",
   "n": 18,
   "seed": 3081
  },
  {
   "cluster": "ground.leaf-litter",
   "on": "ring",
   "n": 12,
   "seed": 8009
  },
  {
   "obj": "bird.pigeon",
   "at": [7.94, 56.43]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [2.37, 14.01]
  },
  {
   "obj": "building.gen-direct",
   "at": [57, 93]
  },
  {
   "obj": "building.gen-direct",
   "at": [56, 137]
  },
  {
   "obj": "plant.shrub",
   "at": [6.58, 17.5]
  },
  {
   "obj": "plant.shrub",
   "at": [15, 40.73]
  },
  {
   "obj": "plant.shrub",
   "at": [-3.48, 23.72]
  },
  {
   "obj": "plant.shrub",
   "at": [-11.73, 32.73]
  },
  {
   "obj": "plant.grass",
   "at": [-2.95, 6.34]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 6.72]
  },
  {
   "obj": "plant.grass",
   "at": [-3.31, 7.07]
  },
  {
   "obj": "plant.grass",
   "at": [-2.37, 8.72]
  },
  {
   "obj": "plant.grass",
   "at": [-2.94, 8.99]
  },
  {
   "obj": "plant.grass",
   "at": [-2.77, 9.63]
  },
  {
   "obj": "plant.grass",
   "at": [-6.87, 10.03]
  },
  {
   "obj": "plant.grass",
   "at": [-7.03, 11.94]
  },
  {
   "obj": "plant.grass",
   "at": [-3.64, 12.28]
  },
  {
   "obj": "plant.grass",
   "at": [-7.4, 14.29]
  },
  {
   "obj": "plant.grass",
   "at": [-2.43, 15.13]
  },
  {
   "obj": "plant.grass",
   "at": [-2.86, 15.6]
  },
  {
   "obj": "plant.grass",
   "at": [-11.3, 17.95]
  },
  {
   "obj": "plant.grass",
   "at": [3.22, 6.67]
  },
  {
   "obj": "plant.grass",
   "at": [3.15, 8.96]
  },
  {
   "obj": "plant.grass",
   "at": [2.63, 10.01]
  },
  {
   "obj": "plant.grass",
   "at": [6.16, 10.18]
  },
  {
   "obj": "plant.grass",
   "at": [2.66, 11.36]
  },
  {
   "obj": "plant.grass",
   "at": [5.91, 11.43]
  },
  {
   "obj": "plant.grass",
   "at": [2.92, 11.53]
  },
  {
   "obj": "plant.grass",
   "at": [8.23, 12.11]
  },
  {
   "obj": "plant.grass",
   "at": [5.93, 13.9]
  },
  {
   "obj": "plant.grass",
   "at": [7.65, 15.66]
  }],
 "landmarks": [{
   "obj": "landmark.shc-town-hall",
   "at": [7, 176],
   "src": "https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens"
  }],
 "life": [{
   "who": "walkers",
   "on": "walk-s",
   "rate": "5/min",
   "mix": {
    "stroll": 0.77,
    "dog-walker": 0.08,
    "jogger": 0.08,
    "family": 0.08
   }
  },
  {
   "who": "walkers",
   "on": "pave-w",
   "rate": "4/min",
   "mix": {
    "stroll": 0.77,
    "dog-walker": 0.08,
    "jogger": 0.08,
    "family": 0.08
   }
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/1min",
   "on": "land"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "land"
  },
  {
   "who": "visit",
   "mix": {
    "jogger": 1
   },
   "rate": "1/6min",
   "on": "land"
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
