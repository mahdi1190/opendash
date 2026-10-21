/* ============================================================
   WORLD SCENE (format v3) world-test / norfolk-reepham-churchyard-w3: converted by `node tools/world.mjs convert uk-east-reepham/norfolk-reepham-churchyard`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (9):
     - place[0]: landmark landmark.rph-churches: src is a placeholder; give the listing or map reference
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
     - entities[25]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[2]) by 1.2 m
     - entities[26]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[3]) by 1.2 m
     - entities[27]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[4]) by 1.2 m
     - entities[28]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[5]) by 1.2 m
     - entities[30]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[6]) by 1.2 m
     - entities[29]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[7]) by 1.2 m
     - landmarks[0]: repair: removed (blocksPath) landmark.rph-churches covers the whole width of walk
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"norfolk-reepham-churchyard-w3","label":"St Mary and St Michael, Reepham","site":"The two flint churches from the shared churchyard","tags":["uk","norfolk","reepham","heritage","world-v3"],"liveSky":{"lat":52.7621,"lon":1.1134},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 52.7621,
  "lon": 1.1134,
  "region": "norfolk"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 490,
  "heading": 337,
  "x0": 970
 },
 "surfaces": [{
   "id": "yard",
   "kind": "grass",
   "poly": [[-3.6, 4.5],
    [3.6, 4.5],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "walk",
   "kind": "path",
   "path": [[-4, 4],
    [-3, 8],
    [-1, 14],
    [2, 24],
    [6, 38],
    [4, 55],
    [-2, 72],
    [-7, 80]],
   "width": 2.2
  },
  {
   "id": "crosswalk",
   "kind": "path",
   "path": [[-60, 30],
    [-15, 29],
    [3, 30],
    [18, 33],
    [50, 40]],
   "width": 2
  },
  {
   "id": "churches",
   "kind": "plaza",
   "poly": [[-22, 58],
    [20, 58],
    [20, 80],
    [-22, 80]]
  }],
 "entities": [{
   "obj": "structure.rph-brick-wall",
   "at": [-6.5, 8.5],
   "variant": 0
  },
  {
   "obj": "structure.rph-brick-wall",
   "at": [5.8, 9.5],
   "variant": 0
  },
  {
   "obj": "plant.hedge",
   "at": [-11, 12],
   "variant": 1
  },
  {
   "obj": "plant.hedge",
   "at": [12, 18],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.hedge",
   "at": [-31, 83],
   "variant": 1
  },
  {
   "obj": "plant.hedge",
   "at": [29, 95],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.hedge",
   "at": [-29, 125],
   "variant": 2
  },
  {
   "obj": "plant.hedge",
   "at": [36, 114],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.rph-canal-oak",
   "at": [-17, 27],
   "variant": 2
  },
  {
   "obj": "tree.pool-birch",
   "at": [18, 36],
   "variant": 1
  },
  {
   "obj": "plant.rph-church-shrub",
   "at": [-14, 52],
   "variant": 0
  },
  {
   "obj": "plant.rph-church-shrub",
   "at": [14, 50],
   "variant": 1
  },
  {
   "obj": "plant.rph-church-shrub",
   "at": [-5, 54],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [8.5, 42],
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [-13, 45]
  },
  {
   "obj": "plant.fern",
   "at": [-5.2, 8],
   "variant": 1
  },
  {
   "obj": "street.rph-headstone",
   "at": [-6, 26],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.rph-headstone",
   "at": [9, 28],
   "variant": 1
  },
  {
   "obj": "street.rph-headstone",
   "at": [-11, 41],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "street.rph-headstone",
   "at": [14, 47],
   "variant": 0
  },
  {
   "obj": "street.rph-headstone",
   "at": [-15, 54],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.rph-headstone",
   "at": [17, 49],
   "variant": 2
  },
  {
   "obj": "street.rph-headstone",
   "at": [-15, 50],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [7, 52],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [-8, 48],
   "variant": 2
  },
  {
   "cluster": "tree.rph-pool-birch",
   "on": "yard",
   "n": 8,
   "seed": 2165
  },
  {
   "cluster": "tree.rph-wyv-far-oak",
   "on": "yard",
   "n": 13,
   "seed": 9436
  },
  {
   "cluster": "tree.rph-wyv-far-sallow",
   "on": "yard",
   "n": 9,
   "seed": 6368
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.54, 11.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.35, 13.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.04, 17.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.65, 19.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [12.73, 20.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.39, 22.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-20.44, 23.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-11.82, 25.28]
  },
  {
   "cluster": "plant.grass-long",
   "on": "yard",
   "n": 8,
   "seed": 2058
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.96, 10.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.28, 10.06]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.97, 10.14]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.28, 10.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.54, 10.2]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.7, 10.38]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.58, 10.39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.33, 10.83]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.25, 10.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.53, 10.92]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.17, 10.93]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.53, 11.06]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.26, 11.36]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.32, 11.38]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.43, 11.39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.39, 11.52]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.98, 11.58]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.25, 11.72]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.52, 11.76]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.75, 12.06]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.51, 13.01]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.27, 13.6]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.06, 13.6]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-10.59, 13.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.23, 14.01]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.89, 14.04]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.31, 14.49]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.88, 14.64]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.21, 14.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.66, 14.96]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.42, 15.01]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.7, 15.47]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.5, 15.65]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.29, 15.78]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.41, 16.08]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.17, 16.59]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.61, 17.33]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.93, 17.55]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.25, 17.74]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.22, 17.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [8.31, 17.87]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.5, 18.36]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.52, 18.71]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.92, 18.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.13, 19.23]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.76, 19.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-12.72, 20.35]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.98, 20.72]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.37, 21.09]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-18.45, 23.36]
  },
  {
   "obj": "plant.wildflowers",
   "at": [13.78, 23.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.45, 24.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.76, 25.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-19.6, 26.03]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.09, 26.63]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-12.41, 27.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.4, 29.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-24.51, 31.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-23.08, 32.28]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.01, 32.47]
  },
  {
   "cluster": "plant.wildflowers",
   "on": "yard",
   "n": 7,
   "seed": 7489
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.18, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.43, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.08, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.42, 4.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.81, 4.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.29, 4.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.42, 4.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.19, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.66, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.83, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.94, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.79, 4.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.01, 4.99]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.3, 5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.51, 5.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.98, 5.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.13, 5.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.45, 5.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.04, 5.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.89, 5.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.71, 5.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.54, 5.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.4, 5.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.59, 5.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.81, 5.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.98, 5.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.31, 5.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.4, 5.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.41, 5.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.94, 5.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.58, 5.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.31, 5.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.19, 5.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.47, 5.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.48, 5.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.07, 5.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.82, 5.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.57, 5.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.64, 5.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.33, 5.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.18, 5.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.76, 5.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.4, 5.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.91, 5.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.45, 5.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.6, 5.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.62, 5.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.13, 5.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.52, 5.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.98, 5.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.23, 5.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.07, 5.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.47, 5.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.39, 5.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.82, 5.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.22, 5.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.21, 5.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.72, 5.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.94, 5.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.33, 5.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.41, 5.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.29, 5.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.09, 5.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.83, 5.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.09, 5.51]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.13, 5.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.45, 5.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.19, 5.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.84, 5.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.41, 5.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.74, 5.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.99, 5.58]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.83, 5.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.9, 5.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.23, 5.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.41, 5.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.49, 5.63]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.13, 5.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.52, 5.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.48, 5.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.18, 5.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.07, 5.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.5, 5.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.94, 5.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.18, 5.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.38, 5.71]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.85, 5.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.21, 5.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.3, 5.74]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.67, 5.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.17, 5.76]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.86, 5.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.62, 5.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.08, 5.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.18, 5.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.4, 5.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.9, 5.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.01, 5.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.66, 5.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.38, 5.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.14, 5.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.19, 5.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.85, 5.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.68, 5.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.51, 6]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.29, 6.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.34, 6.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.18, 6.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.63, 6.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.13, 6.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.6, 6.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.31, 6.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.2, 6.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.96, 6.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.8, 6.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.32, 6.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.42, 6.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.14, 6.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.78, 6.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.53, 6.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.34, 6.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.63, 6.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.86, 6.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.77, 6.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.44, 6.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.25, 6.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.32, 6.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.64, 6.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.64, 6.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.74, 6.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.43, 6.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.2, 6.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.93, 6.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.17, 6.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.25, 6.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.07, 6.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.2, 6.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.04, 6.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.55, 6.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.28, 6.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.19, 6.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.06, 6.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.93, 6.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.79, 6.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.38, 6.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.11, 6.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.6, 6.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.52, 6.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.12, 6.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.83, 6.71]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.1, 6.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.41, 6.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.25, 6.79]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.06, 6.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.33, 6.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.93, 6.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.74, 6.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.11, 6.84]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0, 6.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.27, 6.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.66, 6.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.84, 6.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.27, 6.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.1, 6.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.11, 6.99]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.45, 7.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.85, 7.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.02, 7.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.72, 7.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.71, 7.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.98, 7.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.43, 7.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.24, 7.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.54, 7.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.24, 7.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.44, 7.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.1, 7.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.12, 7.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.83, 7.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.96, 7.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.68, 7.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.41, 7.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.14, 7.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.39, 7.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.52, 7.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.69, 7.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.35, 7.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.19, 7.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.64, 7.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.9, 7.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.78, 7.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.65, 7.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.02, 7.79]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.6, 7.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.52, 7.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.11, 7.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.99, 7.85]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.1, 7.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.89, 7.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.26, 7.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.85, 7.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.75, 7.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.32, 7.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.24, 7.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.99, 7.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.54, 8.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.88, 8.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.45, 8.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.99, 8.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.59, 8.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.22, 8.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.24, 8.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.44, 8.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.71, 8.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.75, 8.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.49, 8.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.06, 8.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.13, 8.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.33, 8.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.22, 8.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.37, 8.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.52, 8.79]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.53, 8.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.02, 8.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.89, 8.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.23, 8.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.74, 8.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.69, 8.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.42, 9.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.23, 9.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.57, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.47, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.76, 10.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.18, 10.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.04, 10.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.89, 10.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.92, 10.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.55, 10.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.56, 10.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.45, 10.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.7, 10.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.41, 10.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.58, 10.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.14, 10.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.88, 10.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.2, 11.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.97, 11.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.58, 11.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.59, 11.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.15, 11.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.72, 11.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.03, 11.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.03, 11.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.87, 11.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.98, 11.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.28, 11.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.39, 12.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.6, 12.21]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.02, 12.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.2, 12.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.13, 12.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.34, 12.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.9, 12.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.6, 12.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.51, 12.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.99, 12.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.24, 12.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.95, 12.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.07, 12.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.01, 12.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.51, 12.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.15, 13.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.62, 13.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.61, 13.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.32, 13.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.4, 13.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.02, 13.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.41, 13.7]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.67, 13.76]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.66, 13.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.38, 13.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.41, 13.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.23, 14.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.82, 14.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.55, 14.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.4, 14.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.84, 14.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.07, 14.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.76, 14.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.01, 14.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.31, 14.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.47, 14.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.13, 14.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.87, 14.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.82, 14.84]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.69, 14.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.57, 15.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.82, 15.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.17, 15.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.9, 15.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.02, 15.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.78, 15.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.41, 15.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.85, 15.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.81, 15.71]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.24, 15.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.05, 15.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.7, 15.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.27, 16.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.11, 16.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.77, 16.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.49, 16.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.37, 16.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.14, 16.63]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.09, 16.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-13.27, 17.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.42, 17.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.33, 17.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.39, 17.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.87, 17.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.72, 17.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.71, 17.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.82, 17.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.15, 17.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.15, 17.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-13.24, 18.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.31, 18.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.75, 18.29]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.63, 18.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.96, 18.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.34, 18.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.21, 18.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.34, 18.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.86, 18.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-15.04, 18.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.68, 18.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.16, 19.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.47, 19.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.04, 19.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.62, 19.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.68, 20.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.03, 20.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.81, 21.29]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.44, 21.38]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.38, 21.6]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.2, 21.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-16.52, 22.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.58, 22.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-14.97, 22.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.42, 22.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-17.78, 23.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.72, 23.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.56, 24.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-20.01, 24.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.35, 24.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.88, 24.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.27, 24.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [15.88, 25.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.45, 25.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.97, 25.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.34, 25.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.23, 25.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.82, 26.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.58, 26.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.78, 26.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-14.79, 26.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.36, 26.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-23.87, 27.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.87, 27.29]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.99, 28.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.53, 29.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-26.48, 30.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [18.29, 31.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.74, 32.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-13.69, 33.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.87, 34.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.92, 34.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [21, 34.97]
  },
  {
   "cluster": "plant.rph-short-grass",
   "on": "yard",
   "n": 10,
   "seed": 4865
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.05, 4.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.57, 4.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.72, 4.91]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.28, 4.92]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.55, 4.92]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.03, 4.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.13, 4.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.23, 4.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.66, 4.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.47, 4.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.6, 4.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.16, 5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.1, 5.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.79, 5.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.22, 5.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.71, 5.07]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.22, 5.08]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.37, 5.09]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.12, 5.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.9, 5.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.67, 5.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.76, 5.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.06, 5.14]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.32, 5.18]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.83, 5.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.25, 5.25]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.16, 5.31]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.99, 5.32]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.39, 5.33]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.97, 5.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.74, 5.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.14, 5.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.23, 5.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.29, 5.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.33, 5.52]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.78, 5.52]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.71, 5.53]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.89, 5.54]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.92, 5.55]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.04, 5.59]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.71, 5.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.62, 5.67]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.22, 5.69]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.42, 5.71]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.37, 5.73]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.54, 5.73]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.97, 5.74]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.72, 5.74]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.16, 5.74]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.04, 5.78]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.43, 5.85]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.08, 5.87]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.96, 5.88]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.43, 5.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.87, 5.94]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.95, 5.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.52, 5.97]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.85, 5.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.77, 5.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.32, 5.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.18, 6.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.91, 6.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.28, 6.04]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.43, 6.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.02, 6.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.28, 6.06]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.75, 6.1]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.73, 6.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.03, 6.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.02, 6.14]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.77, 6.27]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.91, 6.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.02, 6.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.6, 6.32]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.88, 6.33]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.57, 6.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.19, 6.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.53, 6.46]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [4.04, 6.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.76, 6.49]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.33, 6.51]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.8, 6.54]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.47, 6.54]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.02, 6.56]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.78, 6.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.63, 6.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.3, 6.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.41, 6.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.77, 6.66]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.53, 6.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.52, 6.73]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.72, 6.76]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.26, 6.82]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.61, 6.83]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3, 6.85]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.96, 6.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.5, 6.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [4.22, 6.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.83, 6.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.14, 7.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.4, 7.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.72, 7.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.93, 7.19]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.89, 7.22]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.46, 7.26]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.19, 7.32]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.3, 7.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.56, 7.49]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.33, 7.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.51, 7.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.67, 7.64]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.08, 7.78]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.14, 7.83]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.5, 7.96]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.68, 8.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.47, 8.08]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.77, 8.15]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.59, 8.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.68, 8.26]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.4, 8.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.02, 8.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.18, 8.46]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.31, 8.48]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.98, 8.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.99, 8.86]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.77, 8.92]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.63, 8.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.13, 9.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.32, 10.21]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.34, 10.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.78, 10.32]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.98, 10.38]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.4, 10.6]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.51, 10.72]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9, 10.77]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.97, 11.19]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.86, 11.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.58, 11.6]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.19, 11.67]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [6.58, 11.73]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.32, 11.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.27, 11.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.69, 12.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.14, 12.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [1.5, 12.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.06, 12.61]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.58, 12.64]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.77, 12.78]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.13, 12.81]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.5, 12.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.05, 13.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [5.82, 13.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.83, 13.79]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.36, 13.86]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.35, 13.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.67, 14.17]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.87, 14.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-11.94, 14.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.32, 14.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [5.75, 15.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.25, 15.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [8.61, 15.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.08, 15.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.66, 15.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-14.11, 16.48]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-10.68, 17.44]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [10.92, 17.6]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.59, 18.21]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [5.88, 18.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [6.93, 18.97]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.02, 19.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.69, 19.68]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-17.34, 20.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-15.19, 20.1]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.61, 20.37]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.79, 20.46]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-10.59, 20.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1, 21.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-19.32, 21.3]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [10.85, 22.31]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.32, 22.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.2, 22.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.19, 23.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-20.79, 23.33]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [8.2, 23.37]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.87, 23.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [5.51, 23.82]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [13.54, 24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [13.23, 24.22]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-12.44, 25.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.55, 25.3]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [13.74, 25.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.78, 26.17]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [7.8, 26.31]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.22, 26.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-11.52, 27.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-25.32, 28.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [6.07, 28.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.06, 30.33]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [17.47, 31.62]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-16.62, 31.73]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [19.97, 32.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.13, 32.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-19.27, 32.54]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-21.58, 32.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-20.5, 33.23]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-24.62, 33.42]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-22.1, 34.28]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [15.3, 34.3]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.39, 34.8]
  },
  {
   "cluster": "plant.rph-rosette",
   "on": "yard",
   "n": 15,
   "seed": 6097
  }],
 "life": [{
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/1min",
   "on": "walk"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "walk"
  }],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
