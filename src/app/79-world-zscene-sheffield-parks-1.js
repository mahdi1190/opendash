/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-parks-1-w3: converted by `node tools/world.mjs convert uk-north-sheffield-parks/south-yorkshire-sheffield-parks-1`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (8):
     - place[60]: tree.shp-trunk: pixel placement unprojected to [-2.6, 4.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[61]: plant.shp-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[62]: plant.shp-border: pixel placement unprojected to [2.3, 4.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[63]: plant.shp-border: pixel placement unprojected to [-2, 4.1] m (was pinned perspective art: check it is a real object at this spot)
     - flows[0]: flow on ["walk","walk-x"]: one population per surface is better; kept on 'walk' only
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
     - entities[59].y: repair: removed (missingField) air needs y (metres above the ground)
     - landmarks[0]: repair: removed (overlap) landmark.shp-pavilions overlaps street.lamp (entities[6]) by 0.277 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-parks-1-w3","label":"Botanical Gardens, Sheffield","site":"The Botanical Gardens — up the lawn to the glass pavilions, picnics on the grass","tags":["uk","yorkshire","south yorkshire","sheffield","landscape","botanical gardens","glasshouse","lawn","flowers","park","world-v3"],"liveSky":{"lat":53.3717,"lon":-1.4994},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 53.3717,
  "lon": -1.4994,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.6,
  "fov": 62,
  "horizon": 452,
  "heading": 352
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.2, 4.3],
    [3.2, 4.3],
    [2253.2, 3000],
    [-2253.2, 3000]]
  },
  {
   "id": "woods",
   "kind": "grass",
   "poly": [[-400, 104],
    [400, 104],
    [400, 900],
    [-400, 900]]
  },
  {
   "id": "lawn",
   "kind": "grass",
   "poly": [[-34, 15],
    [30, 12],
    [34, 90],
    [-38, 90]]
  },
  {
   "id": "border-l",
   "kind": "grass",
   "poly": [[-40, 15],
    [-33, 15],
    [-38, 88],
    [-46, 88]]
  },
  {
   "id": "border-r",
   "kind": "grass",
   "poly": [[31, 12],
    [37, 12],
    [42, 88],
    [35, 88]]
  },
  {
   "id": "bed-l",
   "kind": "grass",
   "poly": [[-16, 2],
    [-1.5, 2],
    [-1.6, 8],
    [-2.6, 13.5],
    [-6, 15],
    [-16, 15]]
  },
  {
   "id": "bed-r",
   "kind": "grass",
   "poly": [[1.6, 2],
    [16, 2],
    [16, 11.5],
    [4.6, 11.5],
    [2.6, 9],
    [1.9, 6]]
  },
  {
   "id": "island-1",
   "kind": "grass",
   "poly": [[-17, 36],
    [-16.8, 35.54],
    [-16.26, 35.02],
    [-15.5, 34.5],
    [-14.63, 34.04],
    [-13.76, 33.72],
    [-13, 33.6],
    [-12.24, 33.72],
    [-11.37, 34.04],
    [-10.5, 34.5],
    [-9.74, 35.02],
    [-9.2, 35.54],
    [-9, 36],
    [-9.2, 36.46],
    [-9.74, 36.98],
    [-10.5, 37.5],
    [-11.37, 37.96],
    [-12.24, 38.28],
    [-13, 38.4],
    [-13.76, 38.28],
    [-14.63, 37.96],
    [-15.5, 37.5],
    [-16.26, 36.98],
    [-16.8, 36.46]]
  },
  {
   "id": "island-2",
   "kind": "grass",
   "poly": [[11, 44],
    [11.2, 43.58],
    [11.74, 43.1],
    [12.5, 42.62],
    [13.37, 42.21],
    [14.24, 41.91],
    [15, 41.8],
    [15.76, 41.91],
    [16.63, 42.21],
    [17.5, 42.63],
    [18.26, 43.1],
    [18.8, 43.58],
    [19, 44],
    [18.8, 44.42],
    [18.26, 44.9],
    [17.5, 45.38],
    [16.63, 45.79],
    [15.76, 46.09],
    [15, 46.2],
    [14.24, 46.09],
    [13.37, 45.79],
    [12.5, 45.38],
    [11.74, 44.9],
    [11.2, 44.42]]
  },
  {
   "id": "terrace-walk",
   "kind": "path",
   "poly": [[-70, 90.5],
    [70, 90.5],
    [70, 97],
    [-70, 97]]
  },
  {
   "id": "walk",
   "kind": "path",
   "path": [[0, 1.5],
    [0.2, 9],
    [1.4, 20],
    [2.4, 34],
    [2, 52],
    [0.9, 72],
    [0, 91]],
   "width": 2.6
  },
  {
   "id": "walk-x",
   "kind": "path",
   "path": [[-31, 34],
    [-20, 44],
    [-8, 52],
    [2.6, 55]],
   "width": 2.2
  }],
 "entities": [{
   "obj": "tree.cedar",
   "at": [-64, 112]
  },
  {
   "obj": "tree.plane",
   "at": [66, 108],
   "variant": 1
  },
  {
   "obj": "tree.canal-oak",
   "at": [-46, 58]
  },
  {
   "obj": "tree.wyv-far-oak",
   "at": [52, 70]
  },
  {
   "obj": "tree.bank-birch",
   "at": [22, 30]
  },
  {
   "obj": "tree.canal-oak",
   "at": [-58, 92],
   "variant": 1
  },
  {
   "obj": "street.lamp",
   "at": [-6, 56]
  },
  {
   "obj": "street.lamp",
   "at": [6.5, 76]
  },
  {
   "obj": "street.bench",
   "at": [5, 24],
   "facing": 270
  },
  {
   "obj": "street.bench",
   "at": [-36, 93.5]
  },
  {
   "obj": "street.bench",
   "at": [30, 93.6]
  },
  {
   "obj": "street.bench",
   "at": [-24, 47]
  },
  {
   "obj": "person.bench-reader",
   "at": [-36, 93.4]
  },
  {
   "obj": "person.bench-sitter",
   "at": [-24.4, 46.9],
   "variant": 1
  },
  {
   "obj": "person.picnicker",
   "at": [-9, 24]
  },
  {
   "obj": "person.picnicker",
   "at": [-11.4, 25.5],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.child-ball",
   "at": [6, 30]
  },
  {
   "obj": "person.photographer",
   "at": [-4, 64],
   "facing": 0
  },
  {
   "obj": "animal.dog",
   "at": [1.2, 26]
  },
  {
   "obj": "animal.squirrel",
   "at": [-6, 18]
  },
  {
   "obj": "animal.squirrel",
   "at": [-42, 56],
   "facing": 270
  },
  {
   "obj": "animal.squirrel",
   "at": [9, 16]
  },
  {
   "obj": "bird.pigeon",
   "at": [5.65, 19.82],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [5.09, 18.43],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [6.11, 19.21],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [6.32, 19.65],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [3.99, 17.83],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.84, 40.6],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.82, 40.07],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-5.23, 40.28],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [-6.72, 39.07],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [18.67, 60.62],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [20.92, 59.29],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [21.04, 59.27],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.robin",
   "at": [-2.2, 6]
  },
  {
   "obj": "person.picnicker",
   "at": [-20, 30],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-18.7, 30.4],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-26, 52],
   "variant": 0
  },
  {
   "obj": "person.picnicker",
   "at": [-24.7, 52.4],
   "variant": 1
  },
  {
   "obj": "person.picnicker",
   "at": [14, 26],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [15.3, 26.4],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [22, 38],
   "variant": 0
  },
  {
   "obj": "person.picnicker",
   "at": [23.3, 38.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-14, 64],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-12.7, 64.4],
   "variant": 0
  },
  {
   "obj": "person.picnicker",
   "at": [12, 60],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [13.3, 60.4],
   "variant": 2
  },
  {
   "obj": "person.picnicker",
   "at": [26, 74],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [27.3, 74.4],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-30, 78],
   "variant": 1
  },
  {
   "obj": "person.picnicker",
   "at": [-28.7, 78.4],
   "variant": 2
  },
  {
   "obj": "person.picnicker",
   "at": [-6, 20],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-4.7, 20.4],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [8, 22],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [-4, 44],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.picnicker",
   "at": [16, 50],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "person.child-ball",
   "at": [18, 32]
  },
  {
   "obj": "person.child-jumping",
   "at": [8.6, 40]
  },
  {
   "obj": "person.photographer",
   "at": [10, 50],
   "facing": 0
  },
  {
   "obj": "plant.shp-border",
   "at": [2.27, 4.19]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.98, 4.13],
   "variant": 2,
   "facing": 270
  },
  {
   "cluster": "tree.plane",
   "on": "woods",
   "n": 4,
   "seed": 8778
  },
  {
   "obj": "tree.pond-pine",
   "at": [122.46, 257.01]
  },
  {
   "obj": "tree.canal-oak",
   "at": [-57.31, 131.86]
  },
  {
   "obj": "tree.canal-oak",
   "at": [-121.82, 220.06]
  },
  {
   "obj": "tree.canal-oak",
   "at": [173.04, 256.17]
  },
  {
   "cluster": "tree.wyv-far-oak",
   "on": "woods",
   "n": 9,
   "seed": 7349
  },
  {
   "cluster": "tree.pool-birch",
   "on": "woods",
   "n": 5,
   "seed": 5730
  },
  {
   "obj": "tree.canal-oak",
   "at": [-58.64, 90.46]
  },
  {
   "obj": "plant.daisies",
   "at": [7.86, 13.05]
  },
  {
   "obj": "plant.daisies",
   "at": [7.01, 13.08]
  },
  {
   "obj": "plant.daisies",
   "at": [6.69, 13.15]
  },
  {
   "obj": "plant.daisies",
   "at": [5.73, 13.18]
  },
  {
   "obj": "plant.daisies",
   "at": [7.38, 13.39]
  },
  {
   "obj": "plant.daisies",
   "at": [5.83, 13.49]
  },
  {
   "obj": "plant.daisies",
   "at": [8.03, 13.55]
  },
  {
   "obj": "plant.daisies",
   "at": [4.9, 13.63]
  },
  {
   "obj": "plant.daisies",
   "at": [4.02, 13.65]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.28, 13.67]
  },
  {
   "obj": "plant.daisies",
   "at": [7.49, 13.91]
  },
  {
   "obj": "plant.daisies",
   "at": [4.56, 13.96]
  },
  {
   "obj": "plant.daisies",
   "at": [9.12, 14.2]
  },
  {
   "obj": "plant.daisies",
   "at": [8.22, 14.24]
  },
  {
   "obj": "plant.daisies",
   "at": [7.72, 14.42]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.04, 14.51]
  },
  {
   "obj": "plant.daisies",
   "at": [8.79, 14.72]
  },
  {
   "obj": "plant.daisies",
   "at": [8.99, 14.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.11, 14.8]
  },
  {
   "obj": "plant.daisies",
   "at": [4.32, 14.94]
  },
  {
   "obj": "plant.daisies",
   "at": [3.88, 15.27]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.28, 15.4]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.19, 15.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.75, 15.56]
  },
  {
   "obj": "plant.daisies",
   "at": [10.26, 15.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.96, 15.57]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.73, 15.61]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.93, 15.62]
  },
  {
   "obj": "plant.daisies",
   "at": [5.13, 15.8]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.06, 15.83]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.54, 16.17]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.77, 16.31]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.45, 16.38]
  },
  {
   "obj": "plant.daisies",
   "at": [7.61, 16.39]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.84, 16.45]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.78, 16.45]
  },
  {
   "obj": "plant.daisies",
   "at": [9.63, 16.5]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.33, 16.52]
  },
  {
   "obj": "plant.daisies",
   "at": [9.53, 16.53]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.07, 16.62]
  },
  {
   "obj": "plant.daisies",
   "at": [7.84, 16.8]
  },
  {
   "obj": "plant.daisies",
   "at": [8.98, 16.85]
  },
  {
   "obj": "plant.daisies",
   "at": [11.92, 17]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.49, 17.01]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.62, 17.06]
  },
  {
   "obj": "plant.daisies",
   "at": [6.35, 17.43]
  },
  {
   "obj": "plant.daisies",
   "at": [-11.53, 17.5]
  },
  {
   "obj": "plant.daisies",
   "at": [11.08, 17.56]
  },
  {
   "obj": "plant.daisies",
   "at": [8.34, 17.65]
  },
  {
   "obj": "plant.daisies",
   "at": [6.04, 17.69]
  },
  {
   "obj": "plant.daisies",
   "at": [-12.53, 17.74]
  },
  {
   "obj": "plant.daisies",
   "at": [3.51, 17.74]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.83, 17.82]
  },
  {
   "obj": "plant.daisies",
   "at": [10.93, 17.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.62, 18.35]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.99, 18.43]
  },
  {
   "obj": "plant.daisies",
   "at": [9.09, 18.58]
  },
  {
   "obj": "plant.daisies",
   "at": [10.96, 18.68]
  },
  {
   "obj": "plant.daisies",
   "at": [-14.03, 19.69]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.49, 19.77]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.01, 19.83]
  },
  {
   "obj": "plant.daisies",
   "at": [8.4, 19.87]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.52, 20.08]
  },
  {
   "obj": "plant.daisies",
   "at": [4.17, 20.21]
  },
  {
   "obj": "plant.daisies",
   "at": [3.64, 20.22]
  },
  {
   "obj": "plant.daisies",
   "at": [12.38, 20.44]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.68, 20.57]
  },
  {
   "obj": "plant.daisies",
   "at": [6.68, 20.69]
  },
  {
   "obj": "plant.daisies",
   "at": [14.09, 20.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-13.66, 20.85]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.82, 21.31]
  },
  {
   "obj": "plant.daisies",
   "at": [-11.09, 21.39]
  },
  {
   "obj": "plant.daisies",
   "at": [12.7, 21.98]
  },
  {
   "obj": "plant.daisies",
   "at": [-14.32, 22.09]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.04, 22.2]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.61, 22.47]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.79, 22.59]
  },
  {
   "obj": "plant.daisies",
   "at": [9.52, 22.82]
  },
  {
   "obj": "plant.daisies",
   "at": [4.82, 22.88]
  },
  {
   "obj": "plant.daisies",
   "at": [13.04, 22.95]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.49, 23.04]
  },
  {
   "obj": "plant.daisies",
   "at": [4.29, 23.25]
  },
  {
   "obj": "plant.daisies",
   "at": [13.44, 23.46]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.5, 24.06]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.97, 24.12]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.88, 24.39]
  },
  {
   "obj": "plant.daisies",
   "at": [4.5, 24.51]
  },
  {
   "obj": "plant.daisies",
   "at": [11.04, 24.55]
  },
  {
   "obj": "plant.daisies",
   "at": [9.75, 24.67]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.82, 24.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-16.01, 25.35]
  },
  {
   "obj": "plant.daisies",
   "at": [15.35, 25.89]
  },
  {
   "obj": "plant.daisies",
   "at": [6.09, 26.17]
  },
  {
   "obj": "plant.daisies",
   "at": [-18.09, 26.45]
  },
  {
   "obj": "plant.daisies",
   "at": [15.13, 26.64]
  },
  {
   "obj": "plant.daisies",
   "at": [9.86, 26.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-17.26, 26.77]
  },
  {
   "obj": "plant.daisies",
   "at": [0.52, 26.81]
  },
  {
   "obj": "plant.daisies",
   "at": [-16.88, 26.83]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.67, 26.9]
  },
  {
   "obj": "plant.daisies",
   "at": [6.63, 27]
  },
  {
   "obj": "plant.daisies",
   "at": [5.7, 27.04]
  },
  {
   "obj": "plant.daisies",
   "at": [-10.42, 27.06]
  },
  {
   "obj": "plant.daisies",
   "at": [16.08, 28.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.54, 28.99]
  },
  {
   "obj": "plant.daisies",
   "at": [9.28, 29.13]
  },
  {
   "obj": "plant.daisies",
   "at": [-8.07, 29.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.39, 29.6]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.93, 29.64]
  },
  {
   "obj": "plant.daisies",
   "at": [18.39, 29.91]
  },
  {
   "obj": "plant.grass",
   "at": [6.78, 13.2]
  },
  {
   "obj": "plant.grass",
   "at": [5.17, 13.26]
  },
  {
   "obj": "plant.grass",
   "at": [2.71, 13.38]
  },
  {
   "obj": "plant.grass",
   "at": [-1.58, 13.73]
  },
  {
   "obj": "plant.grass",
   "at": [3.46, 13.77]
  },
  {
   "obj": "plant.grass",
   "at": [9.03, 13.87]
  },
  {
   "obj": "plant.grass",
   "at": [7.38, 13.94]
  },
  {
   "obj": "plant.grass",
   "at": [9.42, 14]
  },
  {
   "obj": "plant.grass",
   "at": [-1.7, 14.08]
  },
  {
   "obj": "plant.grass",
   "at": [3.83, 14.11]
  },
  {
   "obj": "plant.grass",
   "at": [-3, 14.11]
  },
  {
   "obj": "plant.grass",
   "at": [7.21, 14.23]
  },
  {
   "obj": "plant.grass",
   "at": [2.87, 14.26]
  },
  {
   "obj": "plant.grass",
   "at": [4.46, 14.35]
  },
  {
   "obj": "plant.grass",
   "at": [10.28, 14.43]
  },
  {
   "obj": "plant.grass",
   "at": [7.66, 14.46]
  },
  {
   "obj": "plant.grass",
   "at": [-1.69, 14.5]
  },
  {
   "obj": "plant.grass",
   "at": [2.87, 14.5]
  },
  {
   "obj": "plant.grass",
   "at": [5, 14.52]
  },
  {
   "obj": "plant.grass",
   "at": [-4.54, 14.59]
  },
  {
   "obj": "plant.grass",
   "at": [8.87, 14.73]
  },
  {
   "obj": "plant.grass",
   "at": [4.56, 14.82]
  },
  {
   "obj": "plant.grass",
   "at": [7.91, 14.86]
  },
  {
   "obj": "plant.grass",
   "at": [-2.43, 14.96]
  },
  {
   "obj": "plant.grass",
   "at": [-8.52, 15.01]
  },
  {
   "obj": "plant.grass",
   "at": [-3.61, 15.04]
  },
  {
   "obj": "plant.grass",
   "at": [5.8, 15.08]
  },
  {
   "obj": "plant.grass",
   "at": [-10.31, 15.13]
  },
  {
   "obj": "plant.grass",
   "at": [9.39, 15.2]
  },
  {
   "obj": "plant.grass",
   "at": [2.36, 15.24]
  },
  {
   "obj": "plant.grass",
   "at": [-3.74, 15.29]
  },
  {
   "obj": "plant.grass",
   "at": [-5.37, 15.35]
  },
  {
   "obj": "plant.grass",
   "at": [7.21, 15.69]
  },
  {
   "obj": "plant.grass",
   "at": [3.99, 15.8]
  },
  {
   "obj": "plant.grass",
   "at": [10.54, 15.91]
  },
  {
   "obj": "plant.grass",
   "at": [9.79, 15.91]
  },
  {
   "obj": "plant.grass",
   "at": [-2.99, 16.06]
  },
  {
   "obj": "plant.grass",
   "at": [2.43, 16.08]
  },
  {
   "obj": "plant.grass",
   "at": [-0.92, 16.13]
  },
  {
   "obj": "plant.grass",
   "at": [5.58, 16.2]
  },
  {
   "obj": "plant.grass",
   "at": [10.54, 16.21]
  },
  {
   "obj": "plant.grass",
   "at": [5.53, 16.33]
  },
  {
   "obj": "plant.grass",
   "at": [-6.83, 16.34]
  },
  {
   "obj": "plant.grass",
   "at": [8.48, 16.35]
  },
  {
   "obj": "plant.grass",
   "at": [-10.24, 16.38]
  },
  {
   "obj": "plant.grass",
   "at": [11.06, 16.39]
  },
  {
   "obj": "plant.grass",
   "at": [-3.51, 16.4]
  },
  {
   "obj": "plant.grass",
   "at": [-6.01, 16.42]
  },
  {
   "obj": "plant.grass",
   "at": [-4.33, 16.44]
  },
  {
   "obj": "plant.grass",
   "at": [3.08, 16.71]
  },
  {
   "obj": "plant.grass",
   "at": [-2.6, 16.78]
  },
  {
   "obj": "plant.grass",
   "at": [7.19, 16.83]
  },
  {
   "obj": "plant.grass",
   "at": [-4.77, 16.86]
  },
  {
   "obj": "plant.grass",
   "at": [-7.34, 16.89]
  },
  {
   "obj": "plant.grass",
   "at": [-5.69, 16.93]
  },
  {
   "obj": "plant.grass",
   "at": [-10.81, 16.98]
  },
  {
   "obj": "plant.grass",
   "at": [-2.18, 17.11]
  },
  {
   "obj": "plant.grass",
   "at": [5.89, 17.14]
  },
  {
   "obj": "plant.grass",
   "at": [4.91, 17.15]
  },
  {
   "obj": "plant.grass",
   "at": [3.45, 17.17]
  },
  {
   "obj": "plant.grass",
   "at": [-9.31, 17.2]
  },
  {
   "obj": "plant.grass",
   "at": [7.42, 17.22]
  },
  {
   "obj": "plant.grass",
   "at": [-8.66, 17.5]
  },
  {
   "obj": "plant.grass",
   "at": [-5.16, 17.6]
  },
  {
   "obj": "plant.grass",
   "at": [10.67, 17.75]
  },
  {
   "obj": "plant.grass",
   "at": [12.22, 17.76]
  },
  {
   "obj": "plant.grass",
   "at": [3.96, 17.78]
  },
  {
   "obj": "plant.grass",
   "at": [4.04, 17.82]
  },
  {
   "obj": "plant.grass",
   "at": [12.2, 17.9]
  },
  {
   "obj": "plant.grass",
   "at": [10.85, 17.92]
  },
  {
   "obj": "plant.grass",
   "at": [9.78, 17.93]
  },
  {
   "obj": "plant.grass",
   "at": [-10.15, 17.94]
  },
  {
   "obj": "plant.grass",
   "at": [-6.54, 18.01]
  },
  {
   "obj": "plant.grass",
   "at": [-5.38, 18.12]
  },
  {
   "obj": "plant.grass",
   "at": [-8.32, 18.2]
  },
  {
   "obj": "plant.grass",
   "at": [-7.63, 18.2]
  },
  {
   "obj": "plant.grass",
   "at": [-7.15, 18.23]
  },
  {
   "obj": "plant.grass",
   "at": [-10.84, 18.38]
  },
  {
   "obj": "plant.grass",
   "at": [9.37, 18.4]
  },
  {
   "obj": "plant.grass",
   "at": [9.12, 18.4]
  },
  {
   "obj": "plant.grass",
   "at": [-7.8, 18.41]
  },
  {
   "obj": "plant.grass",
   "at": [-11.87, 18.42]
  },
  {
   "obj": "plant.grass",
   "at": [7.18, 18.46]
  },
  {
   "obj": "plant.grass",
   "at": [3.82, 18.48]
  },
  {
   "obj": "plant.grass",
   "at": [11.16, 18.61]
  },
  {
   "obj": "plant.grass",
   "at": [-9.43, 18.68]
  },
  {
   "obj": "plant.grass",
   "at": [11.38, 18.69]
  },
  {
   "obj": "plant.grass",
   "at": [2.91, 18.81]
  },
  {
   "obj": "plant.grass",
   "at": [-7.52, 19.04]
  },
  {
   "obj": "plant.grass",
   "at": [10.2, 19.14]
  },
  {
   "obj": "plant.grass",
   "at": [-0.18, 19.21]
  },
  {
   "obj": "plant.grass",
   "at": [6.02, 19.27]
  },
  {
   "obj": "plant.grass",
   "at": [-12.86, 19.32]
  },
  {
   "obj": "plant.grass",
   "at": [-5.21, 19.32]
  },
  {
   "obj": "plant.grass",
   "at": [12.91, 19.33]
  },
  {
   "obj": "plant.grass",
   "at": [-9.55, 19.45]
  },
  {
   "obj": "plant.grass",
   "at": [4.29, 19.5]
  },
  {
   "obj": "plant.grass",
   "at": [5.14, 19.58]
  },
  {
   "obj": "plant.grass",
   "at": [-12.98, 19.64]
  },
  {
   "obj": "plant.grass",
   "at": [-12.07, 19.72]
  },
  {
   "obj": "plant.grass",
   "at": [3.1, 19.74]
  },
  {
   "obj": "plant.grass",
   "at": [6.83, 19.76]
  },
  {
   "obj": "plant.grass",
   "at": [13.75, 19.94]
  },
  {
   "obj": "plant.grass",
   "at": [-4.21, 20.04]
  },
  {
   "obj": "plant.grass",
   "at": [5.82, 20.09]
  },
  {
   "obj": "plant.grass",
   "at": [-9.14, 20.27]
  },
  {
   "obj": "plant.grass",
   "at": [4.76, 20.47]
  },
  {
   "obj": "plant.grass",
   "at": [-12.06, 20.53]
  },
  {
   "obj": "plant.grass",
   "at": [11.04, 20.64]
  },
  {
   "obj": "plant.grass",
   "at": [-8.01, 20.77]
  },
  {
   "obj": "plant.grass",
   "at": [-9.7, 21.03]
  },
  {
   "obj": "plant.grass",
   "at": [-7.15, 21.12]
  },
  {
   "obj": "plant.grass",
   "at": [9.87, 21.14]
  },
  {
   "obj": "plant.grass",
   "at": [-15.15, 21.31]
  },
  {
   "obj": "plant.grass",
   "at": [-15.09, 21.34]
  },
  {
   "obj": "plant.grass",
   "at": [4, 21.5]
  },
  {
   "obj": "plant.grass",
   "at": [-3.45, 21.52]
  },
  {
   "obj": "plant.grass",
   "at": [-3.73, 21.58]
  },
  {
   "obj": "plant.grass",
   "at": [12.73, 21.68]
  },
  {
   "obj": "plant.grass",
   "at": [-6.74, 21.7]
  },
  {
   "obj": "plant.grass",
   "at": [13.88, 22.1]
  },
  {
   "obj": "plant.grass",
   "at": [8.67, 22.15]
  },
  {
   "obj": "plant.grass",
   "at": [-1.18, 22.19]
  },
  {
   "obj": "plant.grass",
   "at": [14.38, 22.27]
  },
  {
   "obj": "plant.grass",
   "at": [-9.67, 22.3]
  },
  {
   "obj": "plant.grass",
   "at": [6.93, 22.59]
  },
  {
   "obj": "plant.grass",
   "at": [-8.35, 22.6]
  },
  {
   "obj": "plant.grass",
   "at": [-6.09, 22.81]
  },
  {
   "obj": "plant.grass",
   "at": [-6.24, 22.82]
  },
  {
   "obj": "plant.grass",
   "at": [13.4, 23.13]
  },
  {
   "obj": "plant.grass",
   "at": [-6.73, 23.18]
  },
  {
   "obj": "plant.grass",
   "at": [9.92, 23.2]
  },
  {
   "obj": "plant.grass",
   "at": [10.61, 23.41]
  },
  {
   "obj": "plant.grass",
   "at": [-5.14, 23.7]
  },
  {
   "obj": "plant.grass",
   "at": [7.64, 23.72]
  },
  {
   "obj": "plant.grass",
   "at": [-1.85, 23.78]
  },
  {
   "obj": "plant.grass",
   "at": [-12.14, 23.8]
  },
  {
   "obj": "plant.grass",
   "at": [-9.46, 24.22]
  },
  {
   "obj": "plant.grass",
   "at": [-2.66, 24.29]
  },
  {
   "obj": "plant.grass",
   "at": [14.21, 24.38]
  },
  {
   "obj": "plant.grass",
   "at": [-0.33, 24.47]
  },
  {
   "obj": "plant.grass",
   "at": [7.55, 24.57]
  },
  {
   "obj": "plant.grass",
   "at": [-14.84, 24.66]
  },
  {
   "obj": "plant.grass",
   "at": [-9.38, 24.67]
  },
  {
   "obj": "plant.grass",
   "at": [3.85, 24.77]
  },
  {
   "obj": "plant.grass",
   "at": [-13.81, 24.89]
  },
  {
   "obj": "plant.grass",
   "at": [-15.85, 24.91]
  },
  {
   "obj": "plant.grass",
   "at": [-6.83, 25.2]
  },
  {
   "obj": "plant.grass",
   "at": [5.21, 25.24]
  },
  {
   "obj": "plant.grass",
   "at": [15.57, 25.28]
  },
  {
   "obj": "plant.grass",
   "at": [-15.64, 25.35]
  },
  {
   "obj": "plant.grass",
   "at": [10.35, 25.36]
  },
  {
   "obj": "plant.grass",
   "at": [9.09, 25.37]
  },
  {
   "obj": "plant.grass",
   "at": [7.72, 25.42]
  },
  {
   "obj": "plant.grass",
   "at": [-4.52, 25.45]
  },
  {
   "obj": "plant.grass",
   "at": [-16.5, 25.46]
  },
  {
   "obj": "plant.grass",
   "at": [-15.95, 25.46]
  },
  {
   "obj": "plant.grass",
   "at": [13.66, 25.51]
  },
  {
   "obj": "plant.grass",
   "at": [-6.55, 25.59]
  },
  {
   "obj": "plant.grass",
   "at": [8.21, 25.76]
  },
  {
   "obj": "plant.grass",
   "at": [11.71, 25.8]
  },
  {
   "obj": "plant.grass",
   "at": [3.4, 25.87]
  },
  {
   "obj": "plant.grass",
   "at": [17.71, 25.94]
  },
  {
   "obj": "plant.grass",
   "at": [-5.78, 26.19]
  },
  {
   "obj": "plant.grass",
   "at": [5.12, 26.21]
  },
  {
   "obj": "plant.grass",
   "at": [17.79, 26.24]
  },
  {
   "obj": "plant.grass",
   "at": [4.85, 26.25]
  },
  {
   "obj": "plant.grass",
   "at": [16.79, 26.37]
  },
  {
   "obj": "plant.grass",
   "at": [13.12, 26.4]
  },
  {
   "obj": "plant.grass",
   "at": [12.56, 26.43]
  },
  {
   "obj": "plant.grass",
   "at": [-16.84, 26.57]
  },
  {
   "obj": "plant.grass",
   "at": [14.49, 26.91]
  },
  {
   "obj": "plant.grass",
   "at": [-9.56, 26.98]
  },
  {
   "obj": "plant.grass",
   "at": [3.44, 27.19]
  },
  {
   "obj": "plant.grass",
   "at": [-4.39, 27.32]
  },
  {
   "obj": "plant.grass",
   "at": [-12.03, 27.38]
  },
  {
   "obj": "plant.grass",
   "at": [-5.49, 27.47]
  },
  {
   "obj": "plant.grass",
   "at": [14.51, 27.52]
  },
  {
   "obj": "plant.grass",
   "at": [-16.33, 27.55]
  },
  {
   "obj": "plant.grass",
   "at": [-8.09, 27.76]
  },
  {
   "obj": "plant.grass",
   "at": [-6.03, 27.86]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 28.03]
  },
  {
   "obj": "plant.grass",
   "at": [-18.57, 28.1]
  },
  {
   "obj": "plant.grass",
   "at": [10.74, 28.28]
  },
  {
   "obj": "plant.grass",
   "at": [-1.79, 28.41]
  },
  {
   "obj": "plant.grass",
   "at": [-0.04, 28.51]
  },
  {
   "obj": "plant.grass",
   "at": [4.15, 29.02]
  },
  {
   "obj": "plant.grass",
   "at": [8.35, 29.17]
  },
  {
   "obj": "plant.grass",
   "at": [-5.2, 29.27]
  },
  {
   "obj": "plant.grass",
   "at": [-13.96, 29.35]
  },
  {
   "obj": "plant.grass",
   "at": [18.26, 29.48]
  },
  {
   "obj": "plant.grass",
   "at": [19.26, 29.57]
  },
  {
   "obj": "plant.grass",
   "at": [10.11, 29.63]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.82, 13.17]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.69, 14.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [6.81, 15.23]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.23, 15.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.53, 15.52]
  },
  {
   "obj": "plant.wildflowers",
   "at": [7.34, 15.56]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.42, 15.9]
  },
  {
   "obj": "plant.wildflowers",
   "at": [8.66, 16.38]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.68, 17.38]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.5, 17.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.12, 17.77]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-12.14, 18.14]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.15, 18.27]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-11.59, 18.34]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.88, 18.44]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.17, 21.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.31, 22.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.49, 22.41]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.5, 22.94]
  },
  {
   "obj": "plant.wildflowers",
   "at": [15.95, 24.4]
  },
  {
   "obj": "plant.wildflowers",
   "at": [6.55, 25.07]
  },
  {
   "obj": "plant.wildflowers",
   "at": [16.92, 27.04]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-17.7, 28.66]
  },
  {
   "obj": "ground.petals",
   "at": [-0.28, 4.74]
  },
  {
   "obj": "ground.petals",
   "at": [0.77, 4.77]
  },
  {
   "obj": "ground.petals",
   "at": [0.16, 4.78]
  },
  {
   "obj": "ground.petals",
   "at": [-0.65, 4.85]
  },
  {
   "obj": "ground.petals",
   "at": [-0.59, 5.16]
  },
  {
   "obj": "ground.petals",
   "at": [-1.09, 5.16]
  },
  {
   "obj": "ground.petals",
   "at": [-0.33, 5.2]
  },
  {
   "obj": "ground.petals",
   "at": [1.24, 5.22]
  },
  {
   "obj": "ground.petals",
   "at": [-0.8, 5.53]
  },
  {
   "obj": "ground.petals",
   "at": [-0.49, 5.65]
  },
  {
   "obj": "ground.petals",
   "at": [-0.28, 5.66]
  },
  {
   "obj": "ground.petals",
   "at": [0.04, 5.79]
  },
  {
   "obj": "ground.petals",
   "at": [0.19, 5.86]
  },
  {
   "obj": "ground.petals",
   "at": [-0.76, 5.99]
  },
  {
   "obj": "ground.petals",
   "at": [1.33, 6.03]
  },
  {
   "obj": "ground.petals",
   "at": [-0.2, 6.45]
  },
  {
   "obj": "ground.petals",
   "at": [0.71, 6.76]
  },
  {
   "obj": "ground.petals",
   "at": [0.05, 6.76]
  },
  {
   "obj": "ground.petals",
   "at": [1.18, 6.95]
  },
  {
   "obj": "ground.petals",
   "at": [1.43, 7.64]
  },
  {
   "obj": "ground.petals",
   "at": [0.28, 7.71]
  },
  {
   "obj": "ground.petals",
   "at": [1.24, 7.78]
  },
  {
   "obj": "ground.petals",
   "at": [0.85, 7.88]
  },
  {
   "obj": "ground.petals",
   "at": [1.14, 8.31]
  },
  {
   "obj": "ground.petals",
   "at": [0.17, 8.6]
  },
  {
   "obj": "ground.petals",
   "at": [-0.52, 9.55]
  },
  {
   "obj": "ground.petals",
   "at": [-0.84, 9.7]
  },
  {
   "obj": "ground.petals",
   "at": [0.62, 9.82]
  },
  {
   "obj": "ground.petals",
   "at": [-0.48, 11.22]
  },
  {
   "obj": "ground.petals",
   "at": [-0.81, 11.43]
  },
  {
   "obj": "ground.petals",
   "at": [0.13, 16.82]
  },
  {
   "obj": "ground.petals",
   "at": [2.25, 17.35]
  },
  {
   "obj": "ground.petals",
   "at": [0.55, 21.64]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.14, 4.72]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.27, 4.74]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.13, 4.77]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.13, 4.79]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.79, 4.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.42, 4.82]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0, 4.83]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.56, 4.91]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.18, 5.15]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.12, 5.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.8, 5.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.31, 5.45]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.04, 5.46]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.1, 5.57]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.23, 5.67]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.97, 5.86]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.15, 5.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.59, 6.02]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.92, 6.06]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.62, 6.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.43, 6.16]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.95, 6.34]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.16, 6.67]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.34, 6.68]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.97, 6.85]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.78, 6.86]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.24, 7.2]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.04, 7.84]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.72, 8.02]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.03, 8.23]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.45, 9.53]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.21, 9.58]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.01, 10.01]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.09, 10.81]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.44, 12.31]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.45, 15.12]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.33, 16.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.98, 4.13]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.76, 4.71]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.23, 4.81]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.8, 4.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.53, 5.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.15, 5.18]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.35, 5.43]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.8, 5.44]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.71, 5.47]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.37, 5.62]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.99, 5.64]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.19, 5.71]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.05, 5.72]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.41, 5.73]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.13, 5.83]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2, 5.91]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.1, 5.92]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.18, 6.06]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.69, 6.11]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.43, 6.11]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.58, 6.18]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.6, 6.23]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.32, 6.53]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.99, 6.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.4, 6.64]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.43, 6.66]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.86, 6.71]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.09, 6.74]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.32, 6.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.67, 6.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.83, 6.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.89, 6.99]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.85, 7.1]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.05, 7.22]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.53, 7.43]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.88, 7.46]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.66, 7.64]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.4, 7.79]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.16, 7.79]
  },
  {
   "obj": "plant.shp-border",
   "at": [-1.67, 7.94]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.02, 7.99]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.97, 8.04]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.55, 8.17]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.57, 8.31]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.86, 8.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.54, 8.57]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.22, 8.59]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.37, 8.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.15, 8.67]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.93, 8.88]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.47, 8.9]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.22, 8.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.72, 8.96]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.95, 9.13]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.39, 9.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.78, 9.47]
  },
  {
   "obj": "plant.shp-border",
   "at": [-2.77, 9.56]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.11, 9.59]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.54, 9.7]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.24, 9.74]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.85, 9.99]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.16, 10.06]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.54, 10.49]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.74, 10.5]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.26, 10.55]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.78, 10.81]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.17, 10.9]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.07, 10.96]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.69, 11.13]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.9, 11.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.06, 11.25]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.66, 11.27]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.13, 11.29]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.51, 11.33]
  },
  {
   "obj": "plant.shp-border",
   "at": [-4.57, 11.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [-3.19, 11.9]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.91, 11.98]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.59, 12.21]
  },
  {
   "obj": "plant.shp-border",
   "at": [-6.48, 13.04]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.19, 13.1]
  },
  {
   "obj": "plant.shp-border",
   "at": [-5.71, 13.52]
  },
  {
   "obj": "plant.shp-border",
   "at": [-7.19, 13.85]
  },
  {
   "obj": "plant.daisies",
   "at": [-3, 4.84]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.78, 4.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.38, 4.96]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.57, 5.29]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.92, 5.31]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.57, 5.9]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.12, 6.21]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.99, 6.43]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.97, 6.8]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.26, 6.92]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.97, 7.01]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.13, 7.03]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.45, 7.58]
  },
  {
   "obj": "plant.daisies",
   "at": [-5.46, 7.74]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.24, 8.15]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.57, 8.22]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.53, 8.45]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.98, 8.61]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.84, 10.45]
  },
  {
   "obj": "plant.daisies",
   "at": [-3.79, 10.71]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.27, 12.09]
  },
  {
   "obj": "plant.daisies",
   "at": [-6.34, 12.11]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.4, 12.92]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.35, 13.73]
  },
  {
   "obj": "plant.daisies",
   "at": [-4.95, 13.89]
  },
  {
   "obj": "plant.daisies",
   "at": [-9.7, 14.04]
  },
  {
   "obj": "plant.daisies",
   "at": [-7.36, 14.47]
  },
  {
   "obj": "plant.grass",
   "at": [1.8, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [1.56, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [-1.45, 4.77]
  },
  {
   "obj": "plant.grass",
   "at": [-1.28, 4.77]
  },
  {
   "obj": "plant.grass",
   "at": [1.48, 4.83]
  },
  {
   "obj": "plant.grass",
   "at": [1.39, 4.85]
  },
  {
   "obj": "plant.grass",
   "at": [1.79, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [1.34, 4.97]
  },
  {
   "obj": "plant.grass",
   "at": [-1.31, 5.17]
  },
  {
   "obj": "plant.grass",
   "at": [1.35, 5.41]
  },
  {
   "obj": "plant.grass",
   "at": [1.7, 5.41]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 5.43]
  },
  {
   "obj": "plant.grass",
   "at": [1.42, 5.43]
  },
  {
   "obj": "plant.grass",
   "at": [-1.48, 5.48]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 5.51]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 5.56]
  },
  {
   "obj": "plant.grass",
   "at": [1.46, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [1.5, 5.61]
  },
  {
   "obj": "plant.grass",
   "at": [1.49, 5.77]
  },
  {
   "obj": "plant.grass",
   "at": [1.55, 5.88]
  },
  {
   "obj": "plant.grass",
   "at": [1.67, 6.03]
  },
  {
   "obj": "plant.grass",
   "at": [1.79, 6.21]
  },
  {
   "obj": "plant.grass",
   "at": [1.49, 6.22]
  },
  {
   "obj": "plant.grass",
   "at": [1.96, 6.32]
  },
  {
   "obj": "plant.grass",
   "at": [1.57, 6.33]
  },
  {
   "obj": "plant.grass",
   "at": [-1.3, 6.33]
  },
  {
   "obj": "plant.grass",
   "at": [1.86, 6.68]
  },
  {
   "obj": "plant.grass",
   "at": [1.83, 6.68]
  },
  {
   "obj": "plant.grass",
   "at": [-1.48, 6.7]
  },
  {
   "obj": "plant.grass",
   "at": [1.94, 6.72]
  },
  {
   "obj": "plant.grass",
   "at": [1.59, 6.88]
  },
  {
   "obj": "plant.grass",
   "at": [1.68, 7.06]
  },
  {
   "obj": "plant.grass",
   "at": [1.94, 7.13]
  },
  {
   "obj": "plant.grass",
   "at": [1.59, 7.2]
  },
  {
   "obj": "plant.grass",
   "at": [-1.47, 7.39]
  },
  {
   "obj": "plant.grass",
   "at": [2.06, 7.39]
  },
  {
   "obj": "plant.grass",
   "at": [1.55, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [2.16, 7.56]
  },
  {
   "obj": "plant.grass",
   "at": [2.02, 7.59]
  },
  {
   "obj": "plant.grass",
   "at": [2.22, 7.65]
  },
  {
   "obj": "plant.grass",
   "at": [2.11, 8.11]
  },
  {
   "obj": "plant.grass",
   "at": [-1.6, 8.3]
  },
  {
   "obj": "plant.grass",
   "at": [1.9, 8.36]
  },
  {
   "obj": "plant.grass",
   "at": [-1.42, 8.54]
  },
  {
   "obj": "plant.grass",
   "at": [-1.55, 8.55]
  },
  {
   "obj": "plant.grass",
   "at": [2.23, 8.55]
  },
  {
   "obj": "plant.grass",
   "at": [-1.24, 8.65]
  },
  {
   "obj": "plant.grass",
   "at": [2.56, 8.88]
  },
  {
   "obj": "plant.grass",
   "at": [2.39, 8.92]
  },
  {
   "obj": "plant.grass",
   "at": [2.31, 9]
  },
  {
   "obj": "plant.grass",
   "at": [-1.78, 9.16]
  },
  {
   "obj": "plant.grass",
   "at": [-1.17, 9.31]
  },
  {
   "obj": "plant.grass",
   "at": [2.98, 9.56]
  },
  {
   "obj": "plant.grass",
   "at": [2.18, 9.99]
  },
  {
   "obj": "plant.grass",
   "at": [-1.71, 10.03]
  },
  {
   "obj": "plant.grass",
   "at": [2.09, 10.18]
  },
  {
   "obj": "plant.grass",
   "at": [-1.91, 10.19]
  },
  {
   "obj": "plant.grass",
   "at": [3.09, 10.21]
  },
  {
   "obj": "plant.grass",
   "at": [2.89, 10.25]
  },
  {
   "obj": "plant.grass",
   "at": [1.77, 10.32]
  },
  {
   "obj": "plant.grass",
   "at": [2.59, 10.35]
  },
  {
   "obj": "plant.grass",
   "at": [3.08, 10.45]
  },
  {
   "obj": "plant.grass",
   "at": [-1.04, 10.47]
  },
  {
   "obj": "plant.grass",
   "at": [-1.57, 10.56]
  },
  {
   "obj": "plant.grass",
   "at": [3.76, 10.57]
  },
  {
   "obj": "plant.grass",
   "at": [2.55, 11.44]
  },
  {
   "obj": "plant.grass",
   "at": [2.51, 11.51]
  },
  {
   "obj": "plant.grass",
   "at": [5.5, 11.55]
  },
  {
   "obj": "plant.grass",
   "at": [8.08, 11.62]
  },
  {
   "obj": "plant.grass",
   "at": [5.37, 11.78]
  },
  {
   "obj": "plant.grass",
   "at": [5.98, 11.86]
  },
  {
   "obj": "plant.grass",
   "at": [3.9, 11.88]
  },
  {
   "obj": "plant.grass",
   "at": [2.18, 12.06]
  },
  {
   "obj": "plant.grass",
   "at": [5.78, 12.15]
  },
  {
   "obj": "plant.grass",
   "at": [7.71, 12.25]
  },
  {
   "obj": "plant.grass",
   "at": [4.26, 12.39]
  },
  {
   "obj": "plant.grass",
   "at": [-0.84, 12.71]
  },
  {
   "obj": "plant.grass",
   "at": [3.93, 12.73]
  },
  {
   "obj": "plant.grass",
   "at": [7, 12.91]
  },
  {
   "obj": "plant.grass",
   "at": [-0.76, 12.95]
  },
  {
   "obj": "plant.grass",
   "at": [6.12, 12.99]
  },
  {
   "obj": "plant.grass",
   "at": [4.35, 12.99]
  },
  {
   "obj": "plant.grass",
   "at": [6.22, 13.11]
  },
  {
   "obj": "plant.grass",
   "at": [2.79, 13.14]
  },
  {
   "obj": "plant.grass",
   "at": [-2.02, 13.21]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.37, 4.86]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.51, 5.28]
  },
  {
   "obj": "plant.daisies",
   "at": [1.45, 5.44]
  },
  {
   "obj": "plant.daisies",
   "at": [1.64, 5.45]
  },
  {
   "obj": "plant.daisies",
   "at": [1.53, 5.63]
  },
  {
   "obj": "plant.daisies",
   "at": [1.76, 5.64]
  },
  {
   "obj": "plant.daisies",
   "at": [1.46, 5.78]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.49, 5.9]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.57, 6.24]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.37, 6.35]
  },
  {
   "obj": "plant.daisies",
   "at": [1.93, 6.78]
  },
  {
   "obj": "plant.daisies",
   "at": [1.91, 6.86]
  },
  {
   "obj": "plant.daisies",
   "at": [1.99, 6.93]
  },
  {
   "obj": "plant.daisies",
   "at": [1.96, 6.96]
  },
  {
   "obj": "plant.daisies",
   "at": [2.01, 7.06]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.49, 7.13]
  },
  {
   "obj": "plant.daisies",
   "at": [1.88, 7.15]
  },
  {
   "obj": "plant.daisies",
   "at": [1.64, 7.21]
  },
  {
   "obj": "plant.daisies",
   "at": [1.54, 7.26]
  },
  {
   "obj": "plant.daisies",
   "at": [2.1, 7.75]
  },
  {
   "obj": "plant.daisies",
   "at": [1.91, 7.89]
  },
  {
   "obj": "plant.daisies",
   "at": [1.77, 7.9]
  },
  {
   "obj": "plant.daisies",
   "at": [2.22, 8.08]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.3, 8.59]
  },
  {
   "obj": "plant.daisies",
   "at": [1.85, 8.82]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.17, 9.09]
  },
  {
   "obj": "plant.daisies",
   "at": [1.58, 9.16]
  },
  {
   "obj": "plant.daisies",
   "at": [2.29, 9.53]
  },
  {
   "obj": "plant.daisies",
   "at": [2.73, 10.29]
  },
  {
   "obj": "plant.daisies",
   "at": [1.99, 10.53]
  },
  {
   "obj": "plant.daisies",
   "at": [3.33, 10.56]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.65, 10.72]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.62, 11.23]
  },
  {
   "obj": "plant.daisies",
   "at": [3.95, 11.48]
  },
  {
   "obj": "plant.daisies",
   "at": [7.58, 11.61]
  },
  {
   "obj": "plant.daisies",
   "at": [-0.88, 11.64]
  },
  {
   "obj": "plant.daisies",
   "at": [3.04, 11.69]
  },
  {
   "obj": "plant.daisies",
   "at": [4.71, 11.76]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.08, 11.76]
  },
  {
   "obj": "plant.daisies",
   "at": [5.6, 12]
  },
  {
   "obj": "plant.daisies",
   "at": [5.88, 12.19]
  },
  {
   "obj": "plant.daisies",
   "at": [6.92, 12.21]
  },
  {
   "obj": "plant.daisies",
   "at": [3.21, 12.26]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.47, 12.3]
  },
  {
   "obj": "plant.daisies",
   "at": [3.59, 12.47]
  },
  {
   "obj": "plant.daisies",
   "at": [5.25, 12.53]
  },
  {
   "obj": "plant.daisies",
   "at": [8.79, 12.6]
  },
  {
   "obj": "plant.daisies",
   "at": [3.28, 12.65]
  },
  {
   "obj": "plant.daisies",
   "at": [-2.08, 12.66]
  },
  {
   "obj": "plant.daisies",
   "at": [-1.46, 12.86]
  },
  {
   "obj": "plant.daisies",
   "at": [6.27, 12.94]
  },
  {
   "obj": "plant.daisies",
   "at": [6.23, 13.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.69, 4.72]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.36, 5.39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.29, 5.77]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.8, 5.79]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.26, 6.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.57, 7.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.72, 7.33]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.46, 7.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.51, 8.28]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.65, 8.54]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.21, 8.88]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.16, 9.52]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.27, 10.09]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.78, 10.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.92, 11.96]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.46, 12.83]
  },
  {
   "obj": "plant.wildflowers",
   "at": [5.23, 12.98]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.27, 4.19]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.53, 4.79]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.69, 4.8]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.83, 4.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.96, 4.95]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.56, 5.27]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.98, 5.29]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.06, 5.3]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.85, 5.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.52, 5.41]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.85, 5.53]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.68, 5.58]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.17, 5.64]
  },
  {
   "obj": "plant.shp-border",
   "at": [4, 5.77]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.15, 5.84]
  },
  {
   "obj": "plant.shp-border",
   "at": [2, 5.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.82, 5.95]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.37, 5.98]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.94, 6.01]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.73, 6.08]
  },
  {
   "obj": "plant.shp-border",
   "at": [1.96, 6.1]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.2, 6.12]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.45, 6.3]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.05, 6.46]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.86, 6.47]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.68, 6.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.36, 6.62]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.44, 6.63]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.55, 6.72]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.75, 7.22]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.66, 7.23]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.33, 7.34]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.14, 7.53]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.92, 7.55]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.82, 7.57]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.34, 7.59]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.58, 7.6]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.78, 7.61]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.52, 7.71]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.42, 7.78]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.42, 7.97]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.8, 8.1]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.25, 8.41]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.89, 8.41]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.57, 8.48]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.08, 8.77]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.82, 8.86]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.79, 8.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [2.98, 8.91]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.47, 8.93]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.42, 9.11]
  },
  {
   "obj": "plant.shp-border",
   "at": [3.35, 9.16]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.99, 9.43]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.66, 9.53]
  },
  {
   "obj": "plant.shp-border",
   "at": [5.01, 9.59]
  },
  {
   "obj": "plant.shp-border",
   "at": [4.66, 9.76]
  },
  {
   "obj": "plant.shp-border",
   "at": [7.01, 9.89]
  },
  {
   "obj": "plant.shp-border",
   "at": [6.47, 10.31]
  },
  {
   "obj": "plant.daisies",
   "at": [3.52, 5.16]
  },
  {
   "obj": "plant.daisies",
   "at": [2.74, 5.35]
  },
  {
   "obj": "plant.daisies",
   "at": [3.79, 5.4]
  },
  {
   "obj": "plant.daisies",
   "at": [2.77, 5.45]
  },
  {
   "obj": "plant.daisies",
   "at": [1.95, 5.68]
  },
  {
   "obj": "plant.daisies",
   "at": [2.66, 5.98]
  },
  {
   "obj": "plant.daisies",
   "at": [3.69, 6.38]
  },
  {
   "obj": "plant.daisies",
   "at": [4.69, 7.41]
  },
  {
   "obj": "plant.daisies",
   "at": [4.38, 8.39]
  },
  {
   "obj": "plant.daisies",
   "at": [2.91, 8.54]
  },
  {
   "obj": "plant.daisies",
   "at": [4.68, 8.97]
  },
  {
   "obj": "plant.daisies",
   "at": [5.76, 9.27]
  },
  {
   "obj": "plant.daisies",
   "at": [6.49, 9.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.36, 5.16]
  }],
 "life": [{
   "who": "walkers",
   "on": "walk",
   "rate": "3/min",
   "mix": {
    "stroll": 0.23,
    "couple": 0.15,
    "elderly-couple": 0.08,
    "buggy": 0.08,
    "dog-walker": 0.15,
    "family": 0.15,
    "student": 0.08,
    "wheelchair-user": 0.08
   }
  },
  {
   "who": "walkers",
   "on": "walk-x",
   "rate": "2/min",
   "mix": {
    "stroll": 0.33,
    "couple": 0.33,
    "family": 0.17,
    "elderly-walker": 0.17
   }
  },
  {
   "who": "walkers",
   "on": "lawn",
   "rate": "2/min",
   "mix": {
    "dog-walker": 0.38,
    "jogger": 0.25,
    "couple": 0.25,
    "child-scooter": 0.13
   }
  }],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
