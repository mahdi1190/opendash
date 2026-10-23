/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-parks-3-w3: converted by `node tools/world.mjs convert uk-north-sheffield-parks/south-yorkshire-sheffield-parks-3`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (16):
     - place[7]: plant.shp-border: pixel placement unprojected to [-2.6, 3.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: plant.shp-border: pixel placement unprojected to [-1.7, 3.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[47]: tree.shp-trunk: pixel placement unprojected to [2.9, 3.5] m (was pinned perspective art: check it is a real object at this spot)
     - buildings[0]: building.edwardian: no world descriptor (unknownSize); not placed. Add a descriptor to A's table or swap for a library object
     - buildings[0]: building footprint (edwardian, 3 storeys) -> one 'building.edwardian' entity at its centre: the library size replaces the authored footprint
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[41].y: repair: removed (missingField) air needs y (metres above the ground)
     - entities[42]: repair: removed (overlap) plant.hedge overlaps tree.bank-birch (entities[0]) by 0.685 m
     - landmarks[2]: repair: removed (overlap) landmark.shp-weston-museum overlaps tree.bank-birch (entities[0]) by 0.693 m
     - entities[44]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[39]) by 0.277 m
     - entities[43]: repair: removed (overlap) street.lamppost overlaps street.lamppost (entities[40]) by 0.277 m
     - landmarks[4]: repair: removed (blocksPath) structure.shp-gate-piers covers the whole width of pave-n
     - landmarks[5]: repair: removed (blocksPath) structure.shp-gate-piers covers the whole width of pave-n
     - entities[876]: repair: removed (blocksPath) building.gen-direct covers the whole width of pave-s
     - landmarks[0]: repair: removed (blocksPath) landmark.shp-firth-court covers the whole width of pave-s
     - life[0].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-parks-3-w3","label":"Weston Park, Sheffield","site":"Weston Park — the bandstand, the museum and Firth Court across Western Bank","tags":["uk","yorkshire","south yorkshire","sheffield","city","park","museum","university","bandstand","buses","students","world-v3"],"liveSky":{"lat":53.3833,"lon":-1.4905},"mood":"energetic","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 53.3833,
  "lon": -1.4905,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 2,
  "fov": 80,
  "horizon": 400,
  "heading": 160
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.6, 3.4],
    [3.6, 3.4],
    [3146.6, 3000],
    [-3146.6, 3000]]
  },
  {
   "id": "campus",
   "kind": "plaza",
   "poly": [[-260, 122],
    [200, -16],
    [200, 600],
    [-260, 600]]
  },
  {
   "id": "western-bank",
   "kind": "road",
   "path": [[-260, 116],
    [-120, 74],
    [-40, 50],
    [0, 38],
    [40, 26],
    [120, 2],
    [200, -22]],
   "width": 9
  },
  {
   "id": "pave-n",
   "kind": "pavement",
   "path": [[-261.75, 110.16],
    [-121.75, 68.16],
    [-41.75, 44.16],
    [-1.75, 32.16],
    [38.25, 20.16],
    [118.25, -3.84],
    [198.25, -27.84]],
   "width": 3.2
  },
  {
   "id": "pave-s",
   "kind": "pavement",
   "path": [[-258.22, 121.94],
    [-118.22, 79.94],
    [-38.22, 55.94],
    [1.78, 43.94],
    [41.78, 31.94],
    [121.78, 7.94],
    [201.78, -16.06]],
   "width": 3.4
  },
  {
   "id": "walk",
   "kind": "path",
   "path": [[0.4, 1.5],
    [1.6, 8],
    [1, 14],
    [0.2, 19],
    [0, 22.6]],
   "width": 3.6
  },
  {
   "id": "walk-b",
   "kind": "path",
   "path": [[-30, 8.4],
    [-18, 8.6],
    [-6, 9.6],
    [1.4, 10.4]],
   "width": 2.4
  },
  {
   "id": "bed-l",
   "kind": "grass",
   "poly": [[-7.5, 18],
    [-2.4, 18],
    [-2.2, 21.6],
    [-9, 21.8]]
  },
  {
   "id": "bed-r",
   "kind": "grass",
   "poly": [[2.4, 18],
    [7.5, 18],
    [8, 20.6],
    [2.2, 21]]
  },
  {
   "id": "bed-near",
   "kind": "grass",
   "poly": [[-8.5, 4.2],
    [-8.08, 3.95],
    [-7.54, 3.75],
    [-6.9, 3.59],
    [-6.21, 3.49],
    [-5.5, 3.42],
    [-4.81, 3.41],
    [-4.17, 3.43],
    [-3.62, 3.5],
    [-3.2, 3.6],
    [-2.67, 3.94],
    [-2.33, 4.46],
    [-2.15, 5.09],
    [-2.11, 5.76],
    [-2.2, 6.4],
    [-2.34, 6.87],
    [-2.57, 7.41],
    [-2.86, 7.96],
    [-3.23, 8.5],
    [-3.64, 8.98],
    [-4.1, 9.36],
    [-4.6, 9.6],
    [-5.06, 9.69],
    [-5.61, 9.73],
    [-6.23, 9.7],
    [-6.88, 9.63],
    [-7.53, 9.51],
    [-8.13, 9.34],
    [-8.67, 9.13],
    [-9.1, 8.88],
    [-9.4, 8.6],
    [-9.59, 8.19],
    [-9.68, 7.65],
    [-9.67, 7.03],
    [-9.58, 6.37],
    [-9.41, 5.72],
    [-9.17, 5.11],
    [-8.86, 4.59]]
  },
  {
   "id": "hedgerow-1",
   "kind": "hedge",
   "path": [[-0.14, 23.82],
    [6.7, 23.55],
    [10.47, 19.99],
    [14.47, 21.27],
    [16.73, 22.46]],
   "width": 1.2,
   "obj": "plant.hedge"
  }],
 "entities": [{
   "obj": "tree.bank-birch",
   "at": [-22, 24]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.59, 3.63],
   "variant": 1
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.72, 3.5],
   "variant": 3,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-7, 13]
  },
  {
   "obj": "person.picnicker",
   "at": [-8.6, 13.6],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.student",
   "at": [6.4, 13.5]
  },
  {
   "obj": "person.child-ball",
   "at": [9.6, 15]
  },
  {
   "obj": "animal.dog",
   "at": [8.4, 13.4]
  },
  {
   "obj": "street.bench",
   "at": [-3.6, 17]
  },
  {
   "obj": "person.bench-reader",
   "at": [-3.8, 16.9]
  },
  {
   "obj": "street.bench",
   "at": [4.6, 17.4],
   "facing": 270
  },
  {
   "obj": "person.bench-sitter",
   "at": [4.4, 17.2],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-8.26, 13.17],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-9.12, 12.69],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.96, 13.08],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-6.91, 13.89],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-8.53, 13.89],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-8.47, 13.48],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-7.3, 12.33],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [3.07, 10.52],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.81, 11.14],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [1.9, 11.71],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [1.22, 11.83],
   "variant": 0
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.29, 33.2],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.08, 32.68],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [0.24, 32.65],
   "variant": 2
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.79, 33.18],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.46, 33.3],
   "variant": 0
  },
  {
   "obj": "bird.robin",
   "at": [-2.4, 9]
  },
  {
   "obj": "animal.squirrel",
   "at": [14, 15]
  },
  {
   "obj": "animal.squirrel",
   "at": [-2, 7],
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [4.2, 15],
   "variant": 1
  },
  {
   "obj": "person.picnicker",
   "at": [6, 9.5],
   "variant": 1
  },
  {
   "obj": "person.picnicker",
   "at": [7.2, 9.8],
   "variant": 2
  },
  {
   "obj": "person.picnicker",
   "at": [9, 15],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [10.2, 15.3],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-5, 12.5],
   "variant": 2
  },
  {
   "obj": "person.picnicker",
   "at": [-3.8, 12.8],
   "variant": 0
  },
  {
   "obj": "person.picnicker",
   "at": [11, 21],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "street.lamppost",
   "at": [-9, 33.6],
   "variant": 1
  },
  {
   "obj": "street.lamppost",
   "at": [12, 27.3],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [0.08, 32.68]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.79, 33.18]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-1.29, 33.2]
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [-0.46, 33.3]
  },
  {
   "obj": "bird.pigeon",
   "at": [0.24, 32.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.99, 4.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.65, 7.05]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.59, 8.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.72, 8.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.81, 14.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.59, 16.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.98, 16.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.7, 20.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.17, 20.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.39, 20.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.02, 21.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [22.56, 22.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.77, 22.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.98, 24.99]
  },
  {
   "obj": "plant.shrub",
   "at": [-8.07, 18.3]
  },
  {
   "obj": "plant.shrub",
   "at": [16.24, 18.66]
  },
  {
   "obj": "plant.shrub",
   "at": [-17.55, 19]
  },
  {
   "obj": "plant.shrub",
   "at": [-19.42, 21.02]
  },
  {
   "obj": "plant.shrub",
   "at": [7.87, 21.8]
  },
  {
   "obj": "plant.shrub",
   "at": [12.62, 22.28]
  },
  {
   "obj": "plant.shrub",
   "at": [5.5, 22.56]
  },
  {
   "obj": "plant.shrub",
   "at": [6.64, 22.59]
  },
  {
   "obj": "plant.shrub",
   "at": [-19.35, 22.83]
  },
  {
   "obj": "plant.shrub",
   "at": [-22.62, 22.95]
  },
  {
   "obj": "plant.shrub",
   "at": [12.83, 23.43]
  },
  {
   "obj": "plant.shrub",
   "at": [-3.24, 23.77]
  },
  {
   "obj": "plant.grass",
   "at": [2.89, 3.79]
  },
  {
   "obj": "plant.grass",
   "at": [-1.87, 3.79]
  },
  {
   "obj": "plant.grass",
   "at": [-2.24, 3.8]
  },
  {
   "obj": "plant.grass",
   "at": [3.34, 3.81]
  },
  {
   "obj": "plant.grass",
   "at": [-2.18, 3.82]
  },
  {
   "obj": "plant.grass",
   "at": [2.78, 3.82]
  },
  {
   "obj": "plant.grass",
   "at": [3.48, 3.83]
  },
  {
   "obj": "plant.grass",
   "at": [-1.36, 3.83]
  },
  {
   "obj": "plant.grass",
   "at": [-1.09, 3.84]
  },
  {
   "obj": "plant.grass",
   "at": [-2.76, 3.86]
  },
  {
   "obj": "plant.grass",
   "at": [-1.28, 3.87]
  },
  {
   "obj": "plant.grass",
   "at": [-1.16, 3.88]
  },
  {
   "obj": "plant.grass",
   "at": [-2.05, 3.89]
  },
  {
   "obj": "plant.grass",
   "at": [3.55, 3.91]
  },
  {
   "obj": "plant.grass",
   "at": [3.52, 3.91]
  },
  {
   "obj": "plant.grass",
   "at": [3.49, 3.95]
  },
  {
   "obj": "plant.grass",
   "at": [2.88, 3.95]
  },
  {
   "obj": "plant.grass",
   "at": [-2.03, 3.98]
  },
  {
   "obj": "plant.grass",
   "at": [-2.45, 3.99]
  },
  {
   "obj": "plant.grass",
   "at": [-1.82, 4]
  },
  {
   "obj": "plant.grass",
   "at": [-1.39, 4.01]
  },
  {
   "obj": "plant.grass",
   "at": [-1.33, 4.01]
  },
  {
   "obj": "plant.grass",
   "at": [-1.57, 4.01]
  },
  {
   "obj": "plant.grass",
   "at": [-1.89, 4.01]
  },
  {
   "obj": "plant.grass",
   "at": [-2.05, 4.03]
  },
  {
   "obj": "plant.grass",
   "at": [3.92, 4.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.68, 4.05]
  },
  {
   "obj": "plant.grass",
   "at": [3.78, 4.06]
  },
  {
   "obj": "plant.grass",
   "at": [3.05, 4.06]
  },
  {
   "obj": "plant.grass",
   "at": [-2.37, 4.06]
  },
  {
   "obj": "plant.grass",
   "at": [-1.12, 4.09]
  },
  {
   "obj": "plant.grass",
   "at": [3.23, 4.1]
  },
  {
   "obj": "plant.grass",
   "at": [3.97, 4.1]
  },
  {
   "obj": "plant.grass",
   "at": [2.92, 4.14]
  },
  {
   "obj": "plant.grass",
   "at": [3.91, 4.15]
  },
  {
   "obj": "plant.grass",
   "at": [-1.32, 4.18]
  },
  {
   "obj": "plant.grass",
   "at": [3.36, 4.21]
  },
  {
   "obj": "plant.grass",
   "at": [-1.87, 4.23]
  },
  {
   "obj": "plant.grass",
   "at": [-2.42, 4.25]
  },
  {
   "obj": "plant.grass",
   "at": [-1.45, 4.25]
  },
  {
   "obj": "plant.grass",
   "at": [2.9, 4.27]
  },
  {
   "obj": "plant.grass",
   "at": [-2.07, 4.27]
  },
  {
   "obj": "plant.grass",
   "at": [-0.89, 4.28]
  },
  {
   "obj": "plant.grass",
   "at": [3.79, 4.3]
  },
  {
   "obj": "plant.grass",
   "at": [-1.85, 4.31]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 4.36]
  },
  {
   "obj": "plant.grass",
   "at": [-2.35, 4.37]
  },
  {
   "obj": "plant.grass",
   "at": [4.2, 4.37]
  },
  {
   "obj": "plant.grass",
   "at": [-2.21, 4.37]
  },
  {
   "obj": "plant.grass",
   "at": [3.3, 4.38]
  },
  {
   "obj": "plant.grass",
   "at": [-2.11, 4.4]
  },
  {
   "obj": "plant.grass",
   "at": [-1.97, 4.45]
  },
  {
   "obj": "plant.grass",
   "at": [-2.28, 4.48]
  },
  {
   "obj": "plant.grass",
   "at": [3.98, 4.51]
  },
  {
   "obj": "plant.grass",
   "at": [3.69, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [4.49, 4.56]
  },
  {
   "obj": "plant.grass",
   "at": [-2.22, 4.56]
  },
  {
   "obj": "plant.grass",
   "at": [4.14, 4.58]
  },
  {
   "obj": "plant.grass",
   "at": [3.76, 4.61]
  },
  {
   "obj": "plant.grass",
   "at": [3.98, 4.63]
  },
  {
   "obj": "plant.grass",
   "at": [3.39, 4.67]
  },
  {
   "obj": "plant.grass",
   "at": [-1.97, 4.7]
  },
  {
   "obj": "plant.grass",
   "at": [4.07, 4.7]
  },
  {
   "obj": "plant.grass",
   "at": [3.99, 4.76]
  },
  {
   "obj": "plant.grass",
   "at": [-0.99, 4.77]
  },
  {
   "obj": "plant.grass",
   "at": [3.36, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [-1.85, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [3.85, 4.8]
  },
  {
   "obj": "plant.grass",
   "at": [-1.57, 4.81]
  },
  {
   "obj": "plant.grass",
   "at": [-1.75, 4.82]
  },
  {
   "obj": "plant.grass",
   "at": [-0.97, 4.85]
  },
  {
   "obj": "plant.grass",
   "at": [-1.08, 4.89]
  },
  {
   "obj": "plant.grass",
   "at": [4.24, 4.91]
  },
  {
   "obj": "plant.grass",
   "at": [-1, 4.94]
  },
  {
   "obj": "plant.grass",
   "at": [3.37, 4.96]
  },
  {
   "obj": "plant.grass",
   "at": [-0.75, 4.96]
  },
  {
   "obj": "plant.grass",
   "at": [3.33, 4.97]
  },
  {
   "obj": "plant.grass",
   "at": [3.72, 5]
  },
  {
   "obj": "plant.grass",
   "at": [-1.89, 5.01]
  },
  {
   "obj": "plant.grass",
   "at": [-2.07, 5.05]
  },
  {
   "obj": "plant.grass",
   "at": [3.42, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [-1.89, 5.08]
  },
  {
   "obj": "plant.grass",
   "at": [4.71, 5.09]
  },
  {
   "obj": "plant.grass",
   "at": [5.05, 5.14]
  },
  {
   "obj": "plant.grass",
   "at": [-1.83, 5.14]
  },
  {
   "obj": "plant.grass",
   "at": [-0.75, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [-1.19, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [5.34, 5.37]
  },
  {
   "obj": "plant.grass",
   "at": [4.85, 5.38]
  },
  {
   "obj": "plant.grass",
   "at": [3.79, 5.41]
  },
  {
   "obj": "plant.grass",
   "at": [4.13, 5.44]
  },
  {
   "obj": "plant.grass",
   "at": [-0.82, 5.44]
  },
  {
   "obj": "plant.grass",
   "at": [-1.55, 5.45]
  },
  {
   "obj": "plant.grass",
   "at": [3.76, 5.45]
  },
  {
   "obj": "plant.grass",
   "at": [4.79, 5.46]
  },
  {
   "obj": "plant.grass",
   "at": [-1.7, 5.52]
  },
  {
   "obj": "plant.grass",
   "at": [-1.59, 5.52]
  },
  {
   "obj": "plant.grass",
   "at": [5.53, 5.55]
  },
  {
   "obj": "plant.grass",
   "at": [3.58, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [3.78, 5.62]
  },
  {
   "obj": "plant.grass",
   "at": [5.49, 5.63]
  },
  {
   "obj": "plant.grass",
   "at": [4.05, 5.67]
  },
  {
   "obj": "plant.grass",
   "at": [5.52, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [5.5, 5.76]
  },
  {
   "obj": "plant.grass",
   "at": [-0.91, 5.79]
  },
  {
   "obj": "plant.grass",
   "at": [-1.99, 5.8]
  },
  {
   "obj": "plant.grass",
   "at": [4.12, 5.85]
  },
  {
   "obj": "plant.grass",
   "at": [-1.67, 5.86]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 5.88]
  },
  {
   "obj": "plant.grass",
   "at": [-1.56, 5.9]
  },
  {
   "obj": "plant.grass",
   "at": [-1.41, 5.91]
  },
  {
   "obj": "plant.grass",
   "at": [3.52, 5.94]
  },
  {
   "obj": "plant.grass",
   "at": [-0.59, 5.97]
  },
  {
   "obj": "plant.grass",
   "at": [-0.81, 6.04]
  },
  {
   "obj": "plant.grass",
   "at": [4.37, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [4.45, 6.16]
  },
  {
   "obj": "plant.grass",
   "at": [5.34, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.32, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [4.98, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-0.67, 6.18]
  },
  {
   "obj": "plant.grass",
   "at": [5.1, 6.18]
  },
  {
   "obj": "plant.grass",
   "at": [5.69, 6.23]
  },
  {
   "obj": "plant.grass",
   "at": [5.65, 6.23]
  },
  {
   "obj": "plant.grass",
   "at": [4.29, 6.23]
  },
  {
   "obj": "plant.grass",
   "at": [3.76, 6.32]
  },
  {
   "obj": "plant.grass",
   "at": [5.03, 6.34]
  },
  {
   "obj": "plant.grass",
   "at": [5.38, 6.36]
  },
  {
   "obj": "plant.grass",
   "at": [4.62, 6.38]
  },
  {
   "obj": "plant.grass",
   "at": [4.51, 6.42]
  },
  {
   "obj": "plant.grass",
   "at": [6.01, 6.47]
  },
  {
   "obj": "plant.grass",
   "at": [4.14, 6.55]
  },
  {
   "obj": "plant.grass",
   "at": [-0.54, 6.57]
  },
  {
   "obj": "plant.grass",
   "at": [-2, 6.58]
  },
  {
   "obj": "plant.grass",
   "at": [-1.89, 6.59]
  },
  {
   "obj": "plant.grass",
   "at": [5.16, 6.65]
  },
  {
   "obj": "plant.grass",
   "at": [-1.18, 6.66]
  },
  {
   "obj": "plant.grass",
   "at": [5.64, 6.7]
  },
  {
   "obj": "plant.grass",
   "at": [5.83, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [5.43, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [-1.58, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [-1.32, 6.82]
  },
  {
   "obj": "plant.grass",
   "at": [-0.82, 6.85]
  },
  {
   "obj": "plant.grass",
   "at": [6.6, 6.86]
  },
  {
   "obj": "plant.grass",
   "at": [4.41, 6.88]
  },
  {
   "obj": "plant.grass",
   "at": [-1.71, 6.95]
  },
  {
   "obj": "plant.grass",
   "at": [6.59, 6.99]
  },
  {
   "obj": "plant.grass",
   "at": [5.53, 7.01]
  },
  {
   "obj": "plant.grass",
   "at": [6.03, 7.09]
  },
  {
   "obj": "plant.grass",
   "at": [7.04, 7.14]
  },
  {
   "obj": "plant.grass",
   "at": [4.29, 7.15]
  },
  {
   "obj": "plant.grass",
   "at": [4.22, 7.26]
  },
  {
   "obj": "plant.grass",
   "at": [6.25, 7.33]
  },
  {
   "obj": "plant.grass",
   "at": [6.11, 7.33]
  },
  {
   "obj": "plant.grass",
   "at": [4.72, 7.34]
  },
  {
   "obj": "plant.grass",
   "at": [3.99, 7.35]
  },
  {
   "obj": "plant.grass",
   "at": [5.85, 7.36]
  },
  {
   "obj": "plant.grass",
   "at": [3.49, 7.36]
  },
  {
   "obj": "plant.grass",
   "at": [5.55, 7.38]
  },
  {
   "obj": "plant.grass",
   "at": [6.59, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [3.52, 7.5]
  },
  {
   "obj": "plant.grass",
   "at": [-0.55, 7.53]
  },
  {
   "obj": "plant.grass",
   "at": [5.61, 7.55]
  },
  {
   "obj": "plant.grass",
   "at": [-1.38, 7.57]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 7.58]
  },
  {
   "obj": "plant.grass",
   "at": [-0.39, 7.63]
  },
  {
   "obj": "plant.grass",
   "at": [-1.01, 7.66]
  },
  {
   "obj": "plant.grass",
   "at": [-1.6, 7.68]
  },
  {
   "obj": "plant.grass",
   "at": [-0.72, 7.75]
  },
  {
   "obj": "plant.grass",
   "at": [5.32, 7.76]
  },
  {
   "obj": "plant.grass",
   "at": [6.48, 7.79]
  },
  {
   "obj": "plant.grass",
   "at": [5.58, 7.82]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 7.84]
  },
  {
   "obj": "plant.grass",
   "at": [7.44, 7.86]
  },
  {
   "obj": "plant.grass",
   "at": [3.76, 7.87]
  },
  {
   "obj": "plant.grass",
   "at": [4.83, 7.88]
  },
  {
   "obj": "plant.grass",
   "at": [5.23, 7.9]
  },
  {
   "obj": "plant.grass",
   "at": [7.29, 7.93]
  },
  {
   "obj": "plant.grass",
   "at": [7.25, 8.08]
  },
  {
   "obj": "plant.grass",
   "at": [-0.56, 8.12]
  },
  {
   "obj": "plant.grass",
   "at": [6.83, 8.17]
  },
  {
   "obj": "plant.grass",
   "at": [-2.77, 8.21]
  },
  {
   "obj": "plant.grass",
   "at": [8.01, 8.25]
  },
  {
   "obj": "plant.grass",
   "at": [-1.42, 8.26]
  },
  {
   "obj": "plant.grass",
   "at": [-2.05, 8.35]
  },
  {
   "obj": "plant.grass",
   "at": [-2.44, 8.35]
  },
  {
   "obj": "plant.grass",
   "at": [4.4, 8.39]
  },
  {
   "obj": "plant.grass",
   "at": [-1.76, 8.39]
  },
  {
   "obj": "plant.grass",
   "at": [7.55, 8.4]
  },
  {
   "obj": "plant.grass",
   "at": [7.27, 8.51]
  },
  {
   "obj": "plant.grass",
   "at": [-0.55, 8.55]
  },
  {
   "obj": "plant.grass",
   "at": [6.21, 8.67]
  },
  {
   "obj": "plant.grass",
   "at": [-1.21, 8.76]
  },
  {
   "obj": "plant.grass",
   "at": [6.9, 8.8]
  },
  {
   "obj": "plant.grass",
   "at": [8.61, 8.84]
  },
  {
   "obj": "plant.grass",
   "at": [5.06, 8.93]
  },
  {
   "obj": "plant.grass",
   "at": [5.45, 9.21]
  },
  {
   "obj": "plant.grass",
   "at": [3.91, 9.53]
  },
  {
   "obj": "plant.grass",
   "at": [4.66, 9.65]
  },
  {
   "obj": "plant.grass",
   "at": [8.81, 9.72]
  },
  {
   "obj": "plant.grass",
   "at": [5.84, 9.74]
  },
  {
   "obj": "plant.grass",
   "at": [8.36, 9.77]
  },
  {
   "obj": "plant.grass",
   "at": [6.99, 9.78]
  },
  {
   "obj": "plant.grass",
   "at": [7.5, 10.07]
  },
  {
   "obj": "plant.grass",
   "at": [8.64, 10.27]
  },
  {
   "obj": "plant.grass",
   "at": [6.48, 10.29]
  },
  {
   "obj": "plant.grass",
   "at": [6.1, 10.35]
  },
  {
   "obj": "plant.grass",
   "at": [-9.93, 10.57]
  },
  {
   "obj": "plant.grass",
   "at": [9.87, 10.71]
  },
  {
   "obj": "plant.grass",
   "at": [-10.59, 10.73]
  },
  {
   "obj": "plant.grass",
   "at": [9.15, 10.77]
  },
  {
   "obj": "plant.grass",
   "at": [4.61, 10.81]
  },
  {
   "obj": "plant.grass",
   "at": [8.02, 10.93]
  },
  {
   "obj": "plant.grass",
   "at": [-8.6, 10.93]
  },
  {
   "obj": "plant.grass",
   "at": [-10.49, 11.08]
  },
  {
   "obj": "plant.grass",
   "at": [-2.74, 11.14]
  },
  {
   "obj": "plant.grass",
   "at": [6.73, 11.15]
  },
  {
   "obj": "plant.grass",
   "at": [-6.76, 11.16]
  },
  {
   "obj": "plant.grass",
   "at": [-10.71, 11.23]
  },
  {
   "obj": "plant.grass",
   "at": [10.16, 11.25]
  },
  {
   "obj": "plant.grass",
   "at": [10.56, 11.56]
  },
  {
   "obj": "plant.grass",
   "at": [-4.47, 11.58]
  },
  {
   "obj": "plant.grass",
   "at": [10.75, 11.66]
  },
  {
   "obj": "plant.grass",
   "at": [-4.62, 11.7]
  },
  {
   "obj": "plant.grass",
   "at": [-2.46, 11.7]
  },
  {
   "obj": "plant.grass",
   "at": [10.15, 11.74]
  },
  {
   "obj": "plant.grass",
   "at": [-11.53, 11.79]
  },
  {
   "obj": "plant.grass",
   "at": [-6.97, 11.83]
  },
  {
   "obj": "plant.grass",
   "at": [-5.2, 11.92]
  },
  {
   "obj": "plant.grass",
   "at": [-10.13, 11.96]
  },
  {
   "obj": "plant.grass",
   "at": [10.48, 11.98]
  },
  {
   "obj": "plant.grass",
   "at": [-7.55, 12.01]
  },
  {
   "obj": "plant.grass",
   "at": [4.72, 12.06]
  },
  {
   "obj": "plant.grass",
   "at": [10.11, 12.06]
  },
  {
   "obj": "plant.grass",
   "at": [8.78, 12.08]
  },
  {
   "obj": "plant.grass",
   "at": [6.61, 12.09]
  },
  {
   "obj": "plant.grass",
   "at": [-1.56, 12.19]
  },
  {
   "obj": "plant.grass",
   "at": [-4.47, 12.26]
  },
  {
   "obj": "plant.grass",
   "at": [4.33, 12.34]
  },
  {
   "obj": "plant.grass",
   "at": [-3.32, 12.44]
  },
  {
   "obj": "plant.grass",
   "at": [-4.15, 12.45]
  },
  {
   "obj": "plant.grass",
   "at": [7.55, 12.5]
  },
  {
   "obj": "plant.grass",
   "at": [-6.19, 12.55]
  },
  {
   "obj": "plant.grass",
   "at": [8.95, 12.7]
  },
  {
   "obj": "plant.grass",
   "at": [-4.87, 12.7]
  },
  {
   "obj": "plant.grass",
   "at": [-9.75, 12.74]
  },
  {
   "obj": "plant.grass",
   "at": [5.71, 12.75]
  },
  {
   "obj": "plant.grass",
   "at": [9.94, 12.75]
  },
  {
   "obj": "plant.grass",
   "at": [-4.84, 12.88]
  },
  {
   "obj": "plant.grass",
   "at": [-11.19, 12.9]
  },
  {
   "obj": "plant.grass",
   "at": [6.93, 12.91]
  },
  {
   "obj": "plant.grass",
   "at": [-9.45, 12.97]
  },
  {
   "obj": "plant.grass",
   "at": [7.09, 13.02]
  },
  {
   "obj": "plant.grass",
   "at": [-12.25, 13.07]
  },
  {
   "obj": "plant.grass",
   "at": [-3.46, 13.13]
  },
  {
   "obj": "plant.grass",
   "at": [-5.86, 13.25]
  },
  {
   "obj": "plant.grass",
   "at": [3.6, 13.25]
  },
  {
   "obj": "plant.grass",
   "at": [13.07, 13.28]
  },
  {
   "obj": "plant.grass",
   "at": [3.48, 13.33]
  },
  {
   "obj": "plant.grass",
   "at": [-6.16, 13.36]
  },
  {
   "obj": "plant.grass",
   "at": [-4.84, 13.38]
  },
  {
   "obj": "plant.grass",
   "at": [11.94, 13.4]
  },
  {
   "obj": "plant.grass",
   "at": [5.01, 13.5]
  },
  {
   "obj": "plant.grass",
   "at": [-1.05, 13.52]
  },
  {
   "obj": "plant.grass",
   "at": [-9.08, 13.61]
  },
  {
   "obj": "plant.grass",
   "at": [8.74, 13.86]
  },
  {
   "obj": "plant.grass",
   "at": [-9.74, 13.9]
  },
  {
   "obj": "plant.grass",
   "at": [-5.37, 14.09]
  },
  {
   "obj": "plant.grass",
   "at": [9.54, 14.13]
  },
  {
   "obj": "plant.grass",
   "at": [-4.72, 14.16]
  },
  {
   "obj": "plant.grass",
   "at": [-6.89, 14.17]
  },
  {
   "obj": "plant.grass",
   "at": [5.83, 14.21]
  },
  {
   "obj": "plant.grass",
   "at": [13.96, 14.36]
  },
  {
   "obj": "plant.grass",
   "at": [-7.8, 14.37]
  },
  {
   "obj": "plant.grass",
   "at": [-8.53, 14.4]
  },
  {
   "obj": "plant.grass",
   "at": [-12.29, 14.56]
  },
  {
   "obj": "plant.grass",
   "at": [12.55, 14.63]
  },
  {
   "obj": "plant.grass",
   "at": [-5.76, 14.64]
  },
  {
   "obj": "plant.grass",
   "at": [2.89, 14.65]
  },
  {
   "obj": "plant.grass",
   "at": [-5.33, 14.86]
  },
  {
   "obj": "plant.grass",
   "at": [-6.41, 14.92]
  },
  {
   "obj": "plant.grass",
   "at": [11.91, 14.93]
  },
  {
   "obj": "plant.grass",
   "at": [7.92, 14.98]
  },
  {
   "obj": "plant.grass",
   "at": [-13.9, 14.99]
  },
  {
   "obj": "plant.grass",
   "at": [-7.11, 15.03]
  },
  {
   "obj": "plant.grass",
   "at": [11.39, 15.07]
  },
  {
   "obj": "plant.grass",
   "at": [-10.45, 15.17]
  },
  {
   "obj": "plant.grass",
   "at": [-4.81, 15.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.51, 15.44]
  },
  {
   "obj": "plant.grass",
   "at": [7, 15.58]
  },
  {
   "obj": "plant.grass",
   "at": [6.47, 15.85]
  },
  {
   "obj": "plant.grass",
   "at": [-5.72, 15.99]
  },
  {
   "obj": "plant.grass",
   "at": [-5.62, 16.02]
  },
  {
   "obj": "plant.grass",
   "at": [-9.08, 16.08]
  },
  {
   "obj": "plant.grass",
   "at": [11.54, 16.11]
  },
  {
   "obj": "plant.grass",
   "at": [-9.36, 16.17]
  },
  {
   "obj": "plant.grass",
   "at": [2.8, 16.22]
  },
  {
   "obj": "plant.grass",
   "at": [13.52, 16.55]
  },
  {
   "obj": "plant.grass",
   "at": [14.66, 16.57]
  },
  {
   "obj": "plant.grass",
   "at": [7.39, 16.62]
  },
  {
   "obj": "plant.grass",
   "at": [-6.36, 16.74]
  },
  {
   "obj": "plant.grass",
   "at": [7.07, 16.8]
  },
  {
   "obj": "plant.grass",
   "at": [-7.96, 16.99]
  },
  {
   "obj": "plant.grass",
   "at": [-5.4, 17.03]
  },
  {
   "obj": "plant.grass",
   "at": [2.7, 17.07]
  },
  {
   "obj": "plant.grass",
   "at": [-4.42, 17.13]
  },
  {
   "obj": "plant.grass",
   "at": [3.68, 17.2]
  },
  {
   "obj": "plant.grass",
   "at": [6.91, 17.31]
  },
  {
   "obj": "plant.grass",
   "at": [-13.9, 17.44]
  },
  {
   "obj": "plant.grass",
   "at": [-6.52, 17.45]
  },
  {
   "obj": "plant.grass",
   "at": [17.3, 17.52]
  },
  {
   "obj": "plant.grass",
   "at": [-13.5, 17.56]
  },
  {
   "obj": "plant.grass",
   "at": [6.99, 17.92]
  },
  {
   "obj": "plant.grass",
   "at": [-14.13, 17.96]
  },
  {
   "obj": "plant.grass",
   "at": [-13.61, 18.31]
  },
  {
   "obj": "plant.grass",
   "at": [15.99, 18.38]
  },
  {
   "obj": "plant.grass",
   "at": [9.17, 18.49]
  },
  {
   "obj": "plant.grass",
   "at": [15.59, 18.73]
  },
  {
   "obj": "plant.grass",
   "at": [-16.39, 18.74]
  },
  {
   "obj": "plant.grass",
   "at": [-9.74, 19.07]
  },
  {
   "obj": "plant.grass",
   "at": [-15.86, 19.12]
  },
  {
   "obj": "plant.grass",
   "at": [-11.54, 19.15]
  },
  {
   "obj": "plant.grass",
   "at": [-14.06, 19.77]
  },
  {
   "obj": "plant.grass",
   "at": [17.53, 19.92]
  },
  {
   "obj": "plant.grass",
   "at": [17.82, 20.09]
  },
  {
   "obj": "plant.grass",
   "at": [-18.37, 20.28]
  },
  {
   "obj": "plant.grass",
   "at": [12.28, 20.5]
  },
  {
   "obj": "plant.grass",
   "at": [5.62, 20.79]
  },
  {
   "obj": "plant.grass",
   "at": [15.79, 20.87]
  },
  {
   "obj": "plant.grass",
   "at": [-17.14, 21.34]
  },
  {
   "obj": "plant.grass",
   "at": [2.51, 21.39]
  },
  {
   "obj": "plant.grass",
   "at": [14.01, 21.46]
  },
  {
   "obj": "plant.grass",
   "at": [2.21, 21.51]
  },
  {
   "obj": "plant.grass",
   "at": [-12.6, 21.69]
  },
  {
   "obj": "plant.grass",
   "at": [-20.93, 21.79]
  },
  {
   "obj": "plant.grass",
   "at": [4.34, 22.1]
  },
  {
   "obj": "plant.grass",
   "at": [-14.69, 22.11]
  },
  {
   "obj": "plant.grass",
   "at": [-3.13, 22.15]
  },
  {
   "obj": "plant.grass",
   "at": [7.47, 22.36]
  },
  {
   "obj": "plant.grass",
   "at": [-2.19, 22.46]
  },
  {
   "obj": "plant.grass",
   "at": [14.87, 22.46]
  },
  {
   "obj": "plant.grass",
   "at": [8.78, 23.2]
  },
  {
   "obj": "plant.grass",
   "at": [-23.04, 23.31]
  },
  {
   "obj": "plant.grass",
   "at": [-18.07, 23.47]
  },
  {
   "obj": "plant.grass",
   "at": [3.89, 23.56]
  },
  {
   "obj": "plant.grass",
   "at": [-5.94, 23.71]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.36, 3.79]
  },
  {
   "obj": "plant.daisies",
   "at": [3.66, 3.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.95, 3.83]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.72, 3.84]
  },
  {
   "obj": "plant.daisies",
   "at": [3.74, 3.86]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.2, 3.86]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.43, 3.9]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.33, 3.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-2, 3.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.47, 3.97]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.41, 4.07]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.15, 4.07]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.31, 4.08]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.22, 4.16]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.92, 4.16]
  },
  {
   "obj": "plant.daisies",
   "at": [3.98, 4.18]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.98, 4.19]
  },
  {
   "obj": "plant.daisies",
   "at": [3.54, 4.22]
  },
  {
   "obj": "plant.daisies",
   "at": [3.21, 4.28]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.06, 4.3]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.27, 4.4]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.21, 4.42]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.15, 4.44]
  },
  {
   "obj": "plant.daisies",
   "at": [4.37, 4.49]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.42, 4.52]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.38, 4.52]
  },
  {
   "obj": "plant.daisies",
   "at": [3.95, 4.54]
  },
  {
   "obj": "plant.daisies",
   "at": [3.47, 4.7]
  },
  {
   "obj": "plant.daisies",
   "at": [4.44, 4.74]
  },
  {
   "obj": "plant.daisies",
   "at": [4.45, 4.8]
  },
  {
   "obj": "plant.daisies",
   "at": [3.74, 4.81]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.1, 4.82]
  },
  {
   "obj": "plant.daisies",
   "at": [3.07, 4.95]
  },
  {
   "obj": "plant.daisies",
   "at": [4.74, 5.08]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.57, 5.1]
  },
  {
   "obj": "plant.daisies",
   "at": [3.78, 5.1]
  },
  {
   "obj": "plant.daisies",
   "at": [3.67, 5.19]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.9, 5.22]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.38, 5.28]
  },
  {
   "obj": "plant.daisies",
   "at": [3.94, 5.35]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.27, 5.36]
  },
  {
   "obj": "plant.daisies",
   "at": [3.61, 5.38]
  },
  {
   "obj": "plant.daisies",
   "at": [3.14, 5.4]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.24, 5.49]
  },
  {
   "obj": "plant.daisies",
   "at": [3.4, 5.53]
  },
  {
   "obj": "plant.daisies",
   "at": [3.51, 5.53]
  },
  {
   "obj": "plant.daisies",
   "at": [4.49, 5.56]
  },
  {
   "obj": "plant.daisies",
   "at": [3.36, 5.57]
  },
  {
   "obj": "plant.daisies",
   "at": [4.07, 5.58]
  },
  {
   "obj": "plant.daisies",
   "at": [4.87, 5.64]
  },
  {
   "obj": "plant.daisies",
   "at": [4.13, 5.75]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.83, 5.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.89, 5.92]
  },
  {
   "obj": "plant.daisies",
   "at": [4.11, 6.02]
  },
  {
   "obj": "plant.daisies",
   "at": [5.81, 6.05]
  },
  {
   "obj": "plant.daisies",
   "at": [3.37, 6.05]
  },
  {
   "obj": "plant.daisies",
   "at": [3.64, 6.06]
  },
  {
   "obj": "plant.daisies",
   "at": [3.23, 6.09]
  },
  {
   "obj": "plant.daisies",
   "at": [5.51, 6.16]
  },
  {
   "obj": "plant.daisies",
   "at": [4.12, 6.19]
  },
  {
   "obj": "plant.daisies",
   "at": [3.47, 6.37]
  },
  {
   "obj": "plant.daisies",
   "at": [6.14, 6.43]
  },
  {
   "obj": "plant.daisies",
   "at": [4.33, 6.49]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.06, 6.55]
  },
  {
   "obj": "plant.daisies",
   "at": [5.06, 6.59]
  },
  {
   "obj": "plant.daisies",
   "at": [4.7, 6.74]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.96, 6.81]
  },
  {
   "obj": "plant.daisies",
   "at": [6.63, 6.84]
  },
  {
   "obj": "plant.daisies",
   "at": [5.86, 6.96]
  },
  {
   "obj": "plant.daisies",
   "at": [3.32, 7]
  },
  {
   "obj": "plant.daisies",
   "at": [6.73, 7.02]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.87, 7.21]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.37, 7.31]
  },
  {
   "obj": "plant.daisies",
   "at": [6.52, 7.41]
  },
  {
   "obj": "plant.daisies",
   "at": [7.27, 7.44]
  },
  {
   "obj": "plant.daisies",
   "at": [5.37, 7.47]
  },
  {
   "obj": "plant.daisies",
   "at": [5.6, 7.61]
  },
  {
   "obj": "plant.daisies",
   "at": [6.56, 7.8]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.52, 7.87]
  },
  {
   "obj": "plant.daisies",
   "at": [5.96, 8.04]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.48, 8.07]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.73, 8.1]
  },
  {
   "obj": "plant.daisies",
   "at": [5.7, 8.18]
  },
  {
   "obj": "plant.daisies",
   "at": [4.43, 8.28]
  },
  {
   "obj": "plant.daisies",
   "at": [6.85, 8.45]
  },
  {
   "obj": "plant.daisies",
   "at": [4.07, 8.56]
  },
  {
   "obj": "plant.daisies",
   "at": [6.23, 8.88]
  },
  {
   "obj": "plant.daisies",
   "at": [5.8, 8.92]
  },
  {
   "obj": "plant.daisies",
   "at": [6.57, 9.3]
  },
  {
   "obj": "plant.daisies",
   "at": [5.39, 9.38]
  },
  {
   "obj": "plant.daisies",
   "at": [4.74, 9.45]
  },
  {
   "obj": "plant.daisies",
   "at": [5.26, 9.5]
  },
  {
   "obj": "plant.daisies",
   "at": [5.63, 9.52]
  },
  {
   "obj": "plant.daisies",
   "at": [5.15, 9.81]
  },
  {
   "obj": "plant.daisies",
   "at": [8.73, 9.9]
  },
  {
   "obj": "plant.daisies",
   "at": [4.74, 10.01]
  },
  {
   "obj": "plant.daisies",
   "at": [9.21, 10.5]
  },
  {
   "obj": "plant.daisies",
   "at": [7.38, 11.14]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.32, 11.21]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.26, 11.24]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.77, 11.32]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.53, 11.46]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.24, 11.51]
  },
  {
   "obj": "plant.daisies",
   "at": [-11.23, 11.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.76, 11.6]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.94, 11.63]
  },
  {
   "obj": "plant.daisies",
   "at": [9.57, 11.7]
  },
  {
   "obj": "plant.daisies",
   "at": [6.02, 11.71]
  },
  {
   "obj": "plant.daisies",
   "at": [8.83, 11.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.61, 11.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.6, 11.84]
  },
  {
   "obj": "plant.daisies",
   "at": [4.7, 11.85]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.62, 11.97]
  },
  {
   "obj": "plant.daisies",
   "at": [11.5, 11.98]
  },
  {
   "obj": "plant.daisies",
   "at": [11.9, 12.05]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.4, 12.16]
  },
  {
   "obj": "plant.daisies",
   "at": [8.18, 12.34]
  },
  {
   "obj": "plant.daisies",
   "at": [-11.44, 12.59]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.64, 12.65]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.34, 12.71]
  },
  {
   "obj": "plant.daisies",
   "at": [4.74, 12.72]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.16, 13.11]
  },
  {
   "obj": "plant.daisies",
   "at": [-13.23, 13.78]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.62, 13.87]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.3, 13.97]
  },
  {
   "obj": "plant.daisies",
   "at": [3.47, 14.05]
  },
  {
   "obj": "plant.daisies",
   "at": [7.36, 14.3]
  },
  {
   "obj": "plant.daisies",
   "at": [11.17, 14.46]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.98, 14.55]
  },
  {
   "obj": "plant.daisies",
   "at": [12.46, 14.81]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.37, 14.84]
  },
  {
   "obj": "plant.daisies",
   "at": [9.89, 14.93]
  },
  {
   "obj": "plant.daisies",
   "at": [6.55, 14.96]
  },
  {
   "obj": "plant.daisies",
   "at": [10.1, 15.46]
  },
  {
   "obj": "plant.daisies",
   "at": [12.53, 15.61]
  },
  {
   "obj": "plant.daisies",
   "at": [14.54, 16.06]
  },
  {
   "obj": "plant.daisies",
   "at": [15.12, 16.18]
  },
  {
   "obj": "plant.daisies",
   "at": [4.38, 16.61]
  },
  {
   "obj": "plant.daisies",
   "at": [8.39, 16.71]
  },
  {
   "obj": "plant.daisies",
   "at": [10.33, 16.72]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.15, 16.75]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.78, 16.85]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.65, 17.07]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.4, 17.17]
  },
  {
   "obj": "plant.daisies",
   "at": [12.63, 17.58]
  },
  {
   "obj": "plant.daisies",
   "at": [9.81, 18.34]
  },
  {
   "obj": "plant.daisies",
   "at": [-18.32, 18.6]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.7, 18.64]
  },
  {
   "obj": "plant.daisies",
   "at": [9.52, 18.91]
  },
  {
   "obj": "plant.daisies",
   "at": [13.32, 19.08]
  },
  {
   "obj": "plant.daisies",
   "at": [-13.45, 19.24]
  },
  {
   "obj": "plant.daisies",
   "at": [11, 19.46]
  },
  {
   "obj": "plant.daisies",
   "at": [19.26, 19.68]
  },
  {
   "obj": "plant.daisies",
   "at": [18.06, 20.67]
  },
  {
   "obj": "plant.daisies",
   "at": [6.05, 21.57]
  },
  {
   "obj": "plant.daisies",
   "at": [3.12, 21.61]
  },
  {
   "obj": "plant.daisies",
   "at": [12.17, 22.23]
  },
  {
   "obj": "plant.daisies",
   "at": [3.51, 22.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-18.48, 22.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-11.88, 23.36]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.82, 23.43]
  },
  {
   "obj": "plant.daisies",
   "at": [-22.91, 23.63]
  },
  {
   "obj": "plant.holly",
   "at": [-10.96, 19.3]
  },
  {
   "obj": "plant.holly",
   "at": [-14.12, 21.61]
  },
  {
   "obj": "plant.holly",
   "at": [10.45, 23.57]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.55, 4.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.03, 4.13]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.08, 4.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.79, 4.21]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.02, 4.33]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.48, 4.49]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.03, 4.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.1, 4.87]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.02, 5]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.15, 5.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.38, 5.28]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.71, 5.51]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.14, 5.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.42, 5.71]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4, 5.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.75, 5.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.66, 5.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.02, 6.1]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.18, 6.13]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.55, 6.29]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.63, 6.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [6.33, 6.37]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.04, 6.43]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.99, 6.46]
  },
  {
   "obj": "plant.wildflowers",
   "at": [6.38, 6.81]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.26, 7.25]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.84, 7.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.18, 7.95]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.98, 8.23]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.38, 8.67]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.32, 9.61]
  },
  {
   "obj": "plant.wildflowers",
   "at": [6.65, 10.18]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.84, 10.58]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.4, 11.11]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.78, 11.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.87, 11.3]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.85, 11.41]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.06, 11.54]
  },
  {
   "obj": "plant.wildflowers",
   "at": [9.1, 12.03]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-10.27, 12.43]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.15, 12.57]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-10.9, 13.29]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-13.08, 13.5]
  },
  {
   "obj": "plant.wildflowers",
   "at": [12.58, 13.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.48, 13.96]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.18, 14.34]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-12.5, 14.4]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.26, 15.56]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.82, 15.77]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.88, 16.83]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.09, 17.64]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-22.28, 23.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-13.04, 23.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.48, 18.03]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.71, 18.04]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.31, 18.22]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.57, 18.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.18, 18.45]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.82, 18.46]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3, 18.54]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.08, 18.58]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.14, 18.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.75, 18.68]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.47, 18.69]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.5, 18.71]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.78, 18.88]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.78, 18.88]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.45, 18.9]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.96, 18.91]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.55, 18.92]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.09, 18.94]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.66, 18.95]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.77, 19.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.38, 19.13]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.01, 19.3]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.98, 19.58]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.47, 19.67]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.74, 19.69]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.56, 19.77]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.46, 20.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.91, 20.11]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.6, 20.12]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.66, 20.25]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.99, 20.31]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.47, 20.36]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.16, 20.38]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.8, 20.41]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.06, 20.47]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.59, 20.5]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.37, 20.51]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.32, 20.59]
  },
  {
   "obj": "plant.shp-border",
   "at": [-8.22, 20.69]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.47, 20.73]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.61, 20.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.98, 20.79]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.27, 20.84]
  },
  {
   "obj": "plant.shp-border",
   "at": [-8.61, 20.84]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.65, 20.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.83, 21.12]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.89, 21.17]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.32, 21.19]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.96, 21.22]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.99, 21.31]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.45, 21.42]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.66, 21.56]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.32, 21.62]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.63, 21.69]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.67, 18.22]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.18, 18.48]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.3, 18.61]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.12, 18.77]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.38, 18.8]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.68, 19.05]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.78, 19.4]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.65, 19.63]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.31, 20.06]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.57, 20.37]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.4, 20.65]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.45, 21.62]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.22, 3.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.14, 3.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.35, 3.83]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.48, 3.84]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.68, 3.87]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.87, 3.94]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.06, 3.97]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.64, 3.99]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.37, 4.02]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.29, 4.05]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.76, 4.23]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.81, 4.25]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.19, 4.29]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.61, 4.33]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.93, 4.33]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.79, 4.41]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.12, 4.42]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.47, 4.46]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.49, 4.56]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.87, 4.59]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.01, 4.63]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.2, 4.74]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.3, 4.8]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.62, 4.86]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.47, 4.97]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.05, 5.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.3, 5.19]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.29, 5.28]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.5, 5.33]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.51, 5.38]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.11, 5.51]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.98, 5.58]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.17, 5.63]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.74, 5.68]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.41, 5.92]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.55, 5.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.01, 5.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.15, 6.5]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.88, 6.56]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.36, 6.58]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.69, 6.76]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.62, 6.91]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.37, 7.22]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.82, 7.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.04, 7.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.11, 8.14]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.17, 8.29]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.53, 8.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.32, 8.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.56, 8.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.85, 8.96]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.08, 9.32]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.96, 11.35]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.24, 12.2]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.64, 21.22]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.84, 21.23]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.05, 18.12]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.25, 18.17]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.4, 18.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.57, 18.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.56, 18.24]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.68, 18.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.4, 18.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.21, 18.43]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.08, 18.44]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.95, 18.46]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.49, 18.5]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.97, 18.55]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.52, 18.61]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.39, 18.63]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.15, 18.7]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.66, 18.73]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.05, 18.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.98, 18.94]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.35, 19.19]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.33, 19.24]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.23, 19.35]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.86, 19.41]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.58, 19.84]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.13, 19.9]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.17, 19.91]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.71, 19.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.98, 20.02]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.02, 20.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.55, 20.09]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.78, 20.14]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.96, 20.14]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.45, 20.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.79, 20.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.76, 20.35]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.7, 20.4]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.9, 20.45]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.02, 20.48]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.73, 20.48]
  },
  {
   "obj": "plant.shp-border",
   "at": [3, 20.53]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.43, 20.56]
  },
  {
   "obj": "plant.shp-border",
   "at": [7, 20.67]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.66, 20.69]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.51, 20.85]
  },
  {
   "obj": "plant.daisies",
   "at": [4.94, 18.02]
  },
  {
   "obj": "plant.daisies",
   "at": [2.75, 18.27]
  },
  {
   "obj": "plant.daisies",
   "at": [6.89, 18.48]
  },
  {
   "obj": "plant.daisies",
   "at": [3.77, 18.68]
  },
  {
   "obj": "plant.daisies",
   "at": [5.36, 18.84]
  },
  {
   "obj": "plant.daisies",
   "at": [2.35, 19.06]
  },
  {
   "obj": "plant.daisies",
   "at": [6.48, 19.35]
  },
  {
   "obj": "plant.daisies",
   "at": [7.31, 19.69]
  },
  {
   "obj": "plant.daisies",
   "at": [2.62, 20.35]
  },
  {
   "obj": "plant.daisies",
   "at": [7.46, 20.47]
  },
  {
   "obj": "plant.daisies",
   "at": [6.61, 20.64]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.83, 3.79]
  },
  {
   "obj": "ground.leaves",
   "at": [0.74, 3.8]
  },
  {
   "obj": "ground.leaves",
   "at": [2.22, 3.8]
  },
  {
   "obj": "ground.leaves",
   "at": [0.16, 3.84]
  },
  {
   "obj": "ground.leaves",
   "at": [0.99, 3.84]
  },
  {
   "obj": "ground.leaves",
   "at": [0.51, 3.87]
  },
  {
   "obj": "ground.leaves",
   "at": [0.32, 3.87]
  },
  {
   "obj": "ground.leaves",
   "at": [1.53, 4.07]
  },
  {
   "obj": "ground.leaves",
   "at": [0.41, 4.15]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.01, 4.21]
  },
  {
   "obj": "ground.leaves",
   "at": [2.83, 4.27]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.81, 4.32]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.52, 4.36]
  },
  {
   "obj": "ground.leaves",
   "at": [1.71, 4.38]
  },
  {
   "obj": "ground.leaves",
   "at": [2.64, 4.4]
  },
  {
   "obj": "ground.leaves",
   "at": [1.39, 4.43]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.08, 4.48]
  },
  {
   "obj": "ground.leaves",
   "at": [1.57, 4.67]
  },
  {
   "obj": "ground.leaves",
   "at": [1.03, 4.68]
  },
  {
   "obj": "ground.leaves",
   "at": [2.91, 4.74]
  },
  {
   "obj": "ground.leaves",
   "at": [2.76, 4.76]
  },
  {
   "obj": "ground.leaves",
   "at": [0.77, 4.78]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.39, 4.85]
  },
  {
   "obj": "ground.leaves",
   "at": [0.98, 4.97]
  },
  {
   "obj": "ground.leaves",
   "at": [1.49, 5]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.68, 5]
  },
  {
   "obj": "ground.leaves",
   "at": [2.71, 5]
  },
  {
   "obj": "ground.leaves",
   "at": [2.59, 5.19]
  },
  {
   "obj": "ground.leaves",
   "at": [3, 5.2]
  },
  {
   "obj": "ground.leaves",
   "at": [0.83, 5.21]
  },
  {
   "obj": "ground.leaves",
   "at": [1.99, 5.29]
  },
  {
   "obj": "ground.leaves",
   "at": [1.13, 5.42]
  },
  {
   "obj": "ground.leaves",
   "at": [2.1, 5.78]
  },
  {
   "obj": "ground.leaves",
   "at": [1.5, 5.8]
  },
  {
   "obj": "ground.leaves",
   "at": [1.87, 5.82]
  },
  {
   "obj": "ground.leaves",
   "at": [1.33, 5.91]
  },
  {
   "obj": "ground.leaves",
   "at": [2.78, 5.92]
  },
  {
   "obj": "ground.leaves",
   "at": [1.04, 5.96]
  },
  {
   "obj": "ground.leaves",
   "at": [2.07, 6.44]
  },
  {
   "obj": "ground.leaves",
   "at": [2.94, 6.49]
  },
  {
   "obj": "ground.leaves",
   "at": [0.83, 6.5]
  },
  {
   "obj": "ground.leaves",
   "at": [3.2, 6.52]
  },
  {
   "obj": "ground.leaves",
   "at": [2.37, 6.69]
  },
  {
   "obj": "ground.leaves",
   "at": [2.92, 6.93]
  },
  {
   "obj": "ground.leaves",
   "at": [1.24, 7.19]
  },
  {
   "obj": "ground.leaves",
   "at": [3.31, 7.81]
  },
  {
   "obj": "ground.leaves",
   "at": [1.04, 7.84]
  },
  {
   "obj": "ground.leaves",
   "at": [2.51, 8.09]
  },
  {
   "obj": "ground.leaves",
   "at": [1.74, 8.12]
  },
  {
   "obj": "ground.leaves",
   "at": [2.97, 8.31]
  },
  {
   "obj": "ground.leaves",
   "at": [2.19, 8.59]
  },
  {
   "obj": "ground.leaves",
   "at": [1.82, 9.58]
  },
  {
   "obj": "ground.leaves",
   "at": [2.38, 9.99]
  },
  {
   "obj": "ground.leaves",
   "at": [2.51, 11.57]
  },
  {
   "obj": "ground.leaves",
   "at": [1.6, 11.7]
  },
  {
   "obj": "ground.leaves",
   "at": [0.63, 13.84]
  },
  {
   "obj": "ground.leaves",
   "at": [0.18, 14.13]
  },
  {
   "obj": "ground.leaves",
   "at": [1.38, 14.73]
  },
  {
   "obj": "ground.leaves",
   "at": [2.34, 15.56]
  },
  {
   "obj": "ground.leaves",
   "at": [0.15, 19.14]
  },
  {
   "obj": "ground.leaves",
   "at": [0.8, 19.64]
  },
  {
   "obj": "ground.leaves",
   "at": [-3.29, 8.92]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.34, 9.08]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.55, 9.25]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.09, 9.26]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.04, 9.4]
  },
  {
   "obj": "ground.leaves",
   "at": [0.69, 9.85]
  },
  {
   "obj": "ground.leaves",
   "at": [-5.98, 9.9]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.05, 9.98]
  },
  {
   "obj": "ground.leaves",
   "at": [-5.71, 10.22]
  },
  {
   "obj": "ground.leaves",
   "at": [-3.28, 10.26]
  },
  {
   "obj": "ground.leaves",
   "at": [-4.69, 10.36]
  },
  {
   "obj": "ground.leaves",
   "at": [-5.33, 10.45]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.53, 10.47]
  },
  {
   "obj": "ground.leaves",
   "at": [1.05, 10.48]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.82, 10.54]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.52, 10.58]
  },
  {
   "obj": "ground.leaves",
   "at": [-4.14, 10.99]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.01, 11.13]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.71, 9.02]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.47, 9.77]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-6.97, 10.51]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.43, 10.56]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.17, 11.09]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.76, 5.51]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.28, 5.68]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.99, 5.68]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.48, 5.72]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.2, 5.76]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.28, 5.77]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.79, 5.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.19, 5.85]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.96, 5.85]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.19, 5.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.52, 5.91]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.17, 5.92]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.41, 5.92]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.92, 5.99]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.35, 6.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.24, 6.22]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.61, 6.28]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.55, 6.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.54, 6.36]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.96, 6.38]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.38, 6.45]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.33, 6.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.19, 6.61]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.32, 6.65]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.33, 6.66]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.32, 6.69]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.74, 6.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.65, 6.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.84, 6.87]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.16, 6.88]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.71, 7.01]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.92, 7.03]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.63, 7.23]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.64, 7.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.05, 7.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.28, 7.38]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.03, 7.44]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.41, 7.47]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.81, 7.5]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.92, 7.57]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.18, 7.72]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.83, 7.99]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.29, 8.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.05, 8.09]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.98, 8.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.91, 8.3]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.8, 8.75]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.54, 8.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.71, 8.79]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.24, 8.8]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.43, 8.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.54, 9.04]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.79, 9.45]
  },
  {
   "obj": "bird.robin",
   "at": [-2.4, 9]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.42, 5.61]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.78, 6.06]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.9, 6.75]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.96, 6.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.8, 7.25]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.52, 7.88]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.48, 8.84]
  }],
 "landmarks": [{
   "obj": "structure.shp-bandstand",
   "at": [-14, 16.5],
   "src": "https://www.sbg.org.uk/"
  },
  {
   "obj": "structure.shp-gate-piers",
   "at": [0, 29.7],
   "variant": 0,
   "src": "https://www.sbg.org.uk/"
  }],
 "life": [{
   "who": "walkers",
   "on": "pave-s",
   "rate": "5/min",
   "mix": {
    "student": 0.43,
    "stroll": 0.21,
    "commuter": 0.14,
    "couple": 0.07,
    "takeaway-walker": 0.07,
    "elderly-walker": 0.07
   }
  },
  {
   "who": "cyclists",
   "on": "western-bank",
   "rate": "1/4min",
   "mix": {
    "cyclist": 0.67,
    "cyclist-commuter": 0.33
   }
  },
  {
   "who": "walkers",
   "on": "walk-b",
   "rate": "4/min",
   "mix": {
    "student": 0.36,
    "dog-walker": 0.14,
    "buggy": 0.07,
    "stroll": 0.14,
    "family": 0.07,
    "couple": 0.14,
    "takeaway-walker": 0.07
   }
  },
  {
   "who": "visit",
   "mix": {
    "jogger": 1
   },
   "rate": "1/6min",
   "on": "campus"
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/2min",
   "on": "campus"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "campus"
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
