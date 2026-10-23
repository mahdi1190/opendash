/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-parks-2-w3: converted by `node tools/world.mjs convert uk-north-sheffield-parks/south-yorkshire-sheffield-parks-2`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (55):
     - place[13]: structure.shp-stepping-stone: pixel placement unprojected to [-0.5, 8.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: structure.shp-stepping-stone: pixel placement unprojected to [0.2, 8.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[15]: structure.shp-stepping-stone: pixel placement unprojected to [0.9, 9] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: structure.shp-stepping-stone: pixel placement unprojected to [1.7, 9.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[17]: structure.shp-stepping-stone: pixel placement unprojected to [2.4, 9.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[18]: structure.shp-stepping-stone: pixel placement unprojected to [3.1, 10.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[19]: structure.shp-stepping-stone: pixel placement unprojected to [3.8, 10.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: structure.shp-stepping-stone: pixel placement unprojected to [4.6, 10.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[21]: person.child-jumping: pixel placement unprojected to [2.1, 11.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[22]: person.child-ball: pixel placement unprojected to [6.9, 14.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[24]: animal.dog: pixel placement unprojected to [2.6, 7.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[25]: structure.shp-weir: pixel placement unprojected to [1.1, 34.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[34]: plant.grass-long: pixel placement unprojected to [7.4, 12.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[35]: plant.grass-long: pixel placement unprojected to [8.5, 74.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[36]: plant.grass-long: pixel placement unprojected to [7.3, 53.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[37]: plant.grass-long: pixel placement unprojected to [5.1, 28.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[38]: plant.fern: pixel placement unprojected to [8.1, 68.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[39]: plant.canal-view-meadowsweet: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[40]: plant.fern: pixel placement unprojected to [4.8, 30.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[41]: plant.grass-long: pixel placement unprojected to [8, 82.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[42]: plant.grass-long: pixel placement unprojected to [6.7, 52] m (was pinned perspective art: check it is a real object at this spot)
     - place[43]: plant.grass-long: pixel placement unprojected to [5, 30.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[44]: plant.grass-long: pixel placement unprojected to [8, 81.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[45]: plant.grass-long: pixel placement unprojected to [6.7, 17.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[46]: plant.grass-long: pixel placement unprojected to [8.3, 5] m (was pinned perspective art: check it is a real object at this spot)
     - place[47]: plant.grass-long: pixel placement unprojected to [7.9, 61.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[48]: rock.boulder: pixel placement unprojected to [2.1, 7.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[49]: rock.stones: pixel placement unprojected to [1.2, 12.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[50]: rock.stones: pixel placement unprojected to [2.2, 23] m (was pinned perspective art: check it is a real object at this spot)
     - place[51]: rock.boulder: pixel placement unprojected to [1.3, 22] m (was pinned perspective art: check it is a real object at this spot)
     - place[52]: rock.stones: pixel placement unprojected to [2.9, 8.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[53]: rock.stones: pixel placement unprojected to [0.5, 28.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[54]: rock.boulder: pixel placement unprojected to [5.1, 5.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[55]: rock.stones: pixel placement unprojected to [1, 29.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[56]: rock.stones: pixel placement unprojected to [-0.2, 31] m (was pinned perspective art: check it is a real object at this spot)
     - place[57]: rock.boulder: pixel placement unprojected to [4.9, 5.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[58]: rock.stones: pixel placement unprojected to [2.5, 23.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[59]: rock.stones: pixel placement unprojected to [0.7, 14.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[63]: tree.shp-trunk: pixel placement unprojected to [-2.5, 4.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[64]: plant.shp-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     ... and 15 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-parks-2-w3","label":"Endcliffe Park, Sheffield","site":"Endcliffe Park — the stepping stones over the Porter Brook by the cafe","tags":["uk","yorkshire","south yorkshire","sheffield","landscape","park","brook","stepping stones","cafe","ducks","dogs","world-v3"],"liveSky":{"lat":53.3666,"lon":-1.5001},"mood":"cheerful","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 53.3666,
  "lon": -1.5001,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 64,
  "horizon": 430,
  "heading": 255,
  "water": -0.45
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.2, 4],
    [3.2, 4],
    [2343.3, 3000],
    [-2343.3, 3000]]
  },
  {
   "id": "woods",
   "kind": "grass",
   "poly": [[-300, 120],
    [300, 120],
    [300, 800],
    [-300, 800]]
  },
  {
   "id": "bank-l",
   "kind": "grass",
   "poly": [[0.29, 0.83],
    [-0.06, 2.07],
    [-0.36, 3.91],
    [-0.81, 5.83],
    [-0.97, 7.21],
    [-1.38, 8.66],
    [-1.57, 10.2],
    [-1.8, 11.89],
    [-1.98, 13.34],
    [-2.17, 14.87],
    [-2.39, 16.46],
    [-2.5, 18.15],
    [-2.69, 19.89],
    [-2.81, 21.41],
    [-3.16, 22.98],
    [-3.38, 24.62],
    [-3.63, 26.34],
    [-3.74, 28.11],
    [-3.9, 29.97],
    [-4, 31.58],
    [-3.97, 33.23],
    [-3.91, 34.93],
    [-3.85, 36.66],
    [-3.67, 38.44],
    [-3.46, 40.25],
    [-3.24, 42.12],
    [-2.99, 43.78],
    [-2.65, 45.44],
    [-2.25, 47.15],
    [-1.97, 48.85],
    [-1.52, 50.58],
    [-1.22, 52.37],
    [-0.74, 54.2],
    [-0.51, 56.13],
    [-0.28, 57.73],
    [0, 59.35],
    [0.26, 60.96],
    [0.4, 62.64],
    [0.63, 64.35],
    [0.75, 66.12],
    [0.88, 67.96],
    [1.11, 69.87],
    [1.21, 71.89],
    [1.14, 74.01],
    [1.17, 75.58],
    [1.1, 77.15],
    [1.06, 78.77],
    [1.11, 80.41],
    [1.01, 82.08],
    [0.86, 83.8],
    [0.93, 85.58],
    [0.74, 87.4],
    [0.57, 89.29],
    [0.49, 91.26],
    [0.4, 93.3],
    [0.17, 95.43],
    [0.14, 97.63],
    [-0.1, 99.94],
    [-0.16, 101.53],
    [-0.34, 103.16],
    [-0.45, 104.83],
    [-0.57, 106.54],
    [-0.72, 108.27],
    [-0.73, 110.05],
    [-1.02, 111.87],
    [-1.1, 113.7],
    [-1.3, 115.57],
    [-1.3, 117.47],
    [-1.55, 119.4],
    [-1.71, 121.35],
    [-1.9, 123.34],
    [-2.08, 125.33],
    [-2.13, 127.36],
    [-2.39, 129.4],
    [-2.53, 131.48],
    [-2.75, 133.56],
    [-2.8, 135.66],
    [-2.95, 137.78],
    [-3.24, 139.93],
    [-3.41, 141.7],
    [-3.47, 143.58],
    [-3.58, 145.54],
    [-3.8, 147.56],
    [-3.94, 149.66],
    [-4.23, 151.8],
    [-4.39, 154],
    [-4.55, 156.21],
    [-4.75, 158.45],
    [-4.99, 160.71],
    [-5.21, 162.96],
    [-5.39, 165.2],
    [-5.57, 167.42],
    [-5.75, 169.62],
    [-6.02, 171.78],
    [-6.21, 173.87],
    [-6.31, 175.92],
    [-6.48, 177.88],
    [-6.62, 179.79],
    [-6.84, 181.59],
    [-7.03, 183.29],
    [-7.24, 184.87],
    [-7.26, 186.35],
    [-7.42, 187.69],
    [-7.52, 188.88],
    [-7.63, 189.92],
    [-5.83, 190.08],
    [-5.71, 189.04],
    [-5.69, 187.86],
    [-5.56, 186.51],
    [-5.33, 185.05],
    [-5.26, 183.45],
    [-4.98, 181.75],
    [-4.85, 179.95],
    [-4.78, 178.04],
    [-4.53, 176.09],
    [-4.41, 174.04],
    [-4.19, 171.93],
    [-3.91, 169.79],
    [-3.81, 167.58],
    [-3.59, 165.35],
    [-3.41, 163.11],
    [-3.24, 160.86],
    [-3.02, 158.61],
    [-2.84, 156.36],
    [-2.52, 154.14],
    [-2.44, 151.96],
    [-2.19, 149.81],
    [-1.96, 147.72],
    [-1.88, 145.69],
    [-1.73, 143.73],
    [-1.49, 141.86],
    [-1.4, 140.08],
    [-1.22, 137.93],
    [-1.06, 135.81],
    [-0.94, 133.71],
    [-0.78, 131.62],
    [-0.56, 129.55],
    [-0.43, 127.5],
    [-0.21, 125.49],
    [-0.01, 123.47],
    [0.17, 121.49],
    [0.26, 119.54],
    [0.36, 117.6],
    [0.48, 115.71],
    [0.76, 113.84],
    [0.78, 111.99],
    [0.96, 110.19],
    [1.19, 108.41],
    [1.32, 106.66],
    [1.36, 104.96],
    [1.4, 103.28],
    [1.56, 101.65],
    [1.7, 100.06],
    [1.84, 97.75],
    [1.97, 95.54],
    [2.18, 93.42],
    [2.35, 91.38],
    [2.42, 89.41],
    [2.53, 87.52],
    [2.71, 85.68],
    [2.71, 83.89],
    [2.79, 82.16],
    [2.89, 80.47],
    [2.98, 78.81],
    [3.02, 77.18],
    [2.97, 75.58],
    [3.04, 73.99],
    [3.01, 71.83],
    [2.79, 69.77],
    [2.76, 67.82],
    [2.63, 65.94],
    [2.32, 64.16],
    [2.19, 62.41],
    [1.98, 60.73],
    [1.79, 59.1],
    [1.54, 57.48],
    [1.33, 55.86],
    [0.91, 53.89],
    [0.61, 51.97],
    [0.15, 50.16],
    [-0.16, 48.44],
    [-0.58, 46.74],
    [-0.87, 45.08],
    [-1.33, 43.46],
    [-1.53, 41.87],
    [-1.72, 40.06],
    [-1.83, 38.3],
    [-1.95, 36.55],
    [-2.07, 34.87],
    [-2.11, 33.21],
    [-2.15, 31.6],
    [-2.09, 30.03],
    [-2.06, 28.26],
    [-1.88, 26.56],
    [-1.66, 24.88],
    [-1.43, 23.25],
    [-1.12, 21.65],
    [-0.85, 20.11],
    [-0.68, 18.35],
    [-0.55, 16.66],
    [-0.4, 15.05],
    [-0.2, 13.54],
    [0.05, 12.13],
    [0.19, 10.48],
    [0.55, 8.95],
    [0.68, 7.53],
    [0.9, 6.16],
    [1.33, 4.24],
    [1.8, 2.46],
    [1.93, 1.17]]
  },
  {
   "id": "path",
   "kind": "path",
   "path": [[-3.2, 1.5],
    [-3.6, 10],
    [-5, 22],
    [-6.4, 36],
    [-5.2, 52],
    [-2.6, 70],
    [-1.6, 100]],
   "width": 2.6
  },
  {
   "id": "cafe-yard",
   "kind": "plaza",
   "poly": [[7.4, 22],
    [22, 22],
    [22, 34],
    [9, 34]]
  },
  {
   "id": "path-n",
   "kind": "path",
   "path": [[8, 22.5],
    [10, 18],
    [16, 12],
    [30, 8]],
   "width": 2.2
  },
  {
   "id": "brook",
   "kind": "water",
   "water": "river",
   "poly": [[2.3, 0.43],
    [1.93, 1.75],
    [1.62, 3.6],
    [0.91, 5.46],
    [0.58, 6.88],
    [0.47, 8.37],
    [0.36, 9.87],
    [-0.29, 11.52],
    [-0.22, 13.04],
    [-0.61, 14.54],
    [-0.45, 16.16],
    [-0.55, 17.82],
    [-1.14, 19.48],
    [-1.34, 20.94],
    [-1.46, 22.58],
    [-1.36, 24.19],
    [-2.07, 26.01],
    [-2.09, 27.86],
    [-2.3, 29.81],
    [-2.43, 31.51],
    [-1.95, 33.21],
    [-2.34, 34.95],
    [-2.01, 36.73],
    [-1.77, 38.57],
    [-1.98, 40.43],
    [-1.46, 42.35],
    [-1.21, 44.08],
    [-1.01, 45.83],
    [-0.21, 47.54],
    [-0.09, 49.31],
    [0.32, 50.95],
    [0.63, 52.78],
    [0.92, 54.55],
    [1.18, 56.36],
    [1.6, 57.97],
    [1.7, 59.56],
    [1.95, 61.19],
    [1.95, 62.8],
    [2.67, 64.52],
    [2.75, 66.23],
    [2.86, 68.04],
    [3.03, 69.91],
    [2.71, 71.91],
    [2.98, 73.99],
    [3.08, 75.53],
    [2.74, 77.11],
    [3.11, 78.69],
    [3.06, 80.31],
    [2.62, 81.98],
    [2.59, 83.7],
    [2.8, 85.45],
    [2.73, 87.27],
    [2.3, 89.19],
    [2.34, 91.13],
    [2.17, 93.16],
    [2.1, 95.28],
    [1.72, 97.51],
    [1.5, 99.83],
    [1.53, 101.42],
    [1.34, 103.03],
    [1.44, 104.72],
    [1.23, 106.44],
    [1.33, 108.17],
    [1.08, 109.94],
    [0.91, 111.73],
    [0.79, 113.57],
    [0.53, 115.46],
    [0.2, 117.36],
    [0.14, 119.31],
    [-0.07, 121.25],
    [-0.07, 123.2],
    [-0.22, 125.24],
    [-0.54, 127.25],
    [-0.68, 129.28],
    [-0.76, 131.36],
    [-1, 133.45],
    [-1.13, 135.55],
    [-1.24, 137.68],
    [-1.32, 139.83],
    [-1.52, 141.58],
    [-1.51, 143.48],
    [-2.04, 145.42],
    [-1.93, 147.47],
    [-2.11, 149.54],
    [-2.59, 151.71],
    [-2.65, 153.88],
    [-2.71, 156.1],
    [-2.85, 158.35],
    [-3.09, 160.62],
    [-3.3, 162.84],
    [-3.47, 165.12],
    [-3.97, 167.34],
    [-3.95, 169.53],
    [-4.27, 171.7],
    [-4.45, 173.8],
    [-4.56, 175.84],
    [-4.61, 177.81],
    [-4.97, 179.71],
    [-4.88, 181.5],
    [-5.32, 183.19],
    [-5.5, 184.8],
    [-5.57, 186.25],
    [-5.71, 187.6],
    [-5.68, 188.8],
    [-5.85, 189.82],
    [-2.14, 190.19],
    [-2.03, 189.13],
    [-1.98, 187.94],
    [-1.78, 186.6],
    [-1.72, 185.14],
    [-1.67, 183.53],
    [-1.26, 181.83],
    [-1.34, 180.03],
    [-1.12, 178.13],
    [-0.75, 176.17],
    [-0.6, 174.12],
    [-0.33, 172.01],
    [-0.07, 169.87],
    [-0.11, 167.68],
    [0.3, 165.46],
    [0.33, 163.2],
    [0.68, 160.97],
    [0.81, 158.69],
    [0.89, 156.48],
    [1.14, 154.23],
    [1.58, 152.07],
    [1.82, 149.91],
    [1.74, 147.83],
    [1.88, 145.8],
    [2.14, 143.84],
    [2.43, 141.96],
    [2.69, 140.18],
    [2.9, 138.05],
    [3.07, 135.91],
    [3.22, 133.82],
    [3.58, 131.72],
    [3.71, 129.65],
    [3.83, 127.61],
    [4.12, 125.6],
    [4.06, 123.6],
    [4.18, 121.62],
    [4.58, 119.65],
    [4.88, 117.71],
    [5.04, 115.81],
    [5.08, 113.94],
    [5.26, 112.13],
    [5.24, 110.29],
    [5.69, 108.51],
    [5.51, 106.78],
    [5.97, 105.06],
    [5.9, 103.42],
    [6.03, 101.75],
    [6.38, 100.17],
    [6.31, 97.88],
    [6.52, 95.66],
    [6.86, 93.56],
    [6.84, 91.52],
    [7.21, 89.53],
    [7.25, 87.65],
    [7.42, 85.82],
    [7.52, 83.99],
    [7.82, 82.27],
    [7.93, 80.56],
    [8.23, 78.89],
    [8.31, 77.24],
    [8.04, 75.63],
    [7.96, 74.01],
    [8.3, 71.81],
    [8.03, 69.72],
    [7.93, 67.73],
    [8.22, 65.81],
    [7.95, 63.99],
    [8.02, 62.26],
    [7.33, 60.49],
    [7.23, 58.87],
    [7.53, 57.22],
    [7.12, 55.6],
    [6.89, 53.55],
    [6.61, 51.57],
    [6.17, 49.74],
    [6.03, 47.98],
    [5.51, 46.27],
    [5.33, 44.7],
    [4.86, 43.15],
    [4.72, 41.63],
    [4.73, 39.86],
    [4.54, 38.18],
    [4.49, 36.47],
    [4.04, 34.85],
    [4.25, 33.23],
    [4.32, 31.67],
    [4.18, 30.2],
    [4.87, 28.52],
    [5.05, 26.91],
    [4.96, 25.29],
    [5.46, 23.69],
    [6.05, 22.09],
    [6.02, 20.5],
    [6.58, 18.68],
    [6.37, 17.02],
    [6.74, 15.35],
    [7.05, 13.89],
    [7.29, 12.44],
    [7.05, 10.83],
    [7.53, 9.23],
    [7.66, 7.85],
    [7.8, 6.5],
    [7.95, 4.54],
    [7.91, 2.74],
    [8.59, 1.49]],
   "shallow": 1
  }],
 "entities": [{
   "obj": "building.shp-park-cafe",
   "at": [14.5, 30.5],
   "facing": 270
  },
  {
   "obj": "person.cafe-goer",
   "at": [10.6, 25.6]
  },
  {
   "obj": "person.cafe-goer",
   "at": [18.6, 26.2]
  },
  {
   "obj": "person.bench-sitter",
   "at": [16.7, 23.4]
  },
  {
   "obj": "bird.pigeon",
   "at": [11.77, 25.19],
   "variant": 2
  },
  {
   "obj": "bird.pigeon",
   "at": [13.3, 25.03],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [15.17, 25.12],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "bird.pigeon",
   "at": [16.7, 25.59],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [14.43, 24.75],
   "variant": 1
  },
  {
   "obj": "bird.pigeon-feral",
   "at": [15.22, 23.27],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [-0.47, 8.33],
   "variant": 1
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [0.24, 8.64],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [0.94, 9.04],
   "variant": 3,
   "attach": "water"
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [1.69, 9.35],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [2.4, 9.74],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [3.1, 10.06],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [3.81, 10.45],
   "variant": 3,
   "attach": "water"
  },
  {
   "obj": "structure.shp-stepping-stone",
   "at": [4.56, 10.84],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "person.walker",
   "at": [-2.6, 16.5],
   "facing": 90
  },
  {
   "obj": "structure.shp-weir",
   "at": [1.1, 34.57],
   "attach": "water"
  },
  {
   "obj": "bird.mallard",
   "at": [4.6, 15.6],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "tree.canal-oak",
   "at": [22, 40]
  },
  {
   "obj": "tree.wyv-far-oak",
   "at": [8, 48]
  },
  {
   "obj": "tree.bank-alder",
   "at": [9.5, 42]
  },
  {
   "obj": "tree.canal-willow",
   "at": [-7.5, 34],
   "facing": 270
  },
  {
   "obj": "tree.canal-oak",
   "at": [-18, 46],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [-10, 18]
  },
  {
   "obj": "tree.wyv-far-oak",
   "at": [30, 64],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [7.38, 12.55],
   "variant": 2
  },
  {
   "obj": "plant.grass-long",
   "at": [8.48, 74.64],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [7.27, 53.62],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [5.13, 28.2],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.fern",
   "at": [8.06, 68.36],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.fern",
   "at": [4.83, 30.48],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [8.02, 82.52],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [6.71, 52.03],
   "variant": 0
  },
  {
   "obj": "plant.grass-long",
   "at": [4.99, 30.48],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [7.96, 81.88],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [6.66, 17.8],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [8.29, 4.99],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [7.87, 61.41],
   "variant": 0
  },
  {
   "obj": "rock.boulder",
   "at": [2.1, 7.31],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [1.23, 12.31],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [2.2, 23.04],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "rock.boulder",
   "at": [1.26, 21.98],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [2.91, 8.69],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [0.48, 28.43],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "rock.boulder",
   "at": [5.11, 5.18],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [1.01, 29.46],
   "variant": 2,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [-0.18, 30.97],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [2.45, 23.45],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "rock.stones",
   "at": [0.73, 14.16],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [1.6, 26],
   "attach": "water"
  },
  {
   "obj": "animal.squirrel",
   "at": [-7.4, 14]
  },
  {
   "obj": "bird.robin",
   "at": [-2.2, 5.5]
  },
  {
   "obj": "plant.fern",
   "at": [-2.12, 3.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.49, 4.06]
  },
  {
   "obj": "plant.fern",
   "at": [-0.31, 3.95],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [0.31, 3.99],
   "variant": 2
  },
  {
   "cluster": "tree.canal-oak",
   "on": "woods",
   "n": 7,
   "seed": 7412
  },
  {
   "obj": "tree.bank-alder",
   "at": [99.23, 200.73]
  },
  {
   "obj": "tree.bank-alder",
   "at": [-49.83, 208.28]
  },
  {
   "obj": "tree.bank-alder",
   "at": [-75.72, 215.2]
  },
  {
   "obj": "tree.pool-birch",
   "at": [-41.9, 184.66]
  },
  {
   "obj": "tree.pool-birch",
   "at": [-23.74, 204.24]
  },
  {
   "cluster": "tree.wyv-far-oak",
   "on": "woods",
   "n": 11,
   "seed": 7349
  },
  {
   "obj": "tree.plane",
   "at": [25.59, 162.53]
  },
  {
   "obj": "tree.wyv-far-oak",
   "at": [-22.43, 94.53]
  },
  {
   "obj": "tree.wyv-far-oak",
   "at": [-28.41, 108.74]
  },
  {
   "obj": "tree.bank-alder",
   "at": [-16.26, 82.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.49, 4.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.13, 4.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.93, 4.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.45, 4.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.06, 4.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.41, 4.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.29, 4.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.49, 4.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.69, 5.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.13, 5.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.71, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.78, 5.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.59, 5.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.15, 5.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.14, 6.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.99, 6.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.84, 6.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.48, 6.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.43, 6.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.54, 7.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.01, 7.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.15, 7.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.28, 7.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.53, 7.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.14, 8.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.53, 8.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.8, 8.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.98, 8.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.66, 8.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.65, 8.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.62, 8.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.66, 8.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.93, 9.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.52, 10.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.36, 11.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.12, 11.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.59, 11.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.31, 11.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.54, 12.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.38, 12.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.27, 12.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.92, 12.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.94, 13.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.84, 13.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.01, 13.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.77, 14.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.94, 14.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.75, 14.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.48, 14.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.25, 14.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.46, 15.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.95, 15.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.96, 15.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.9, 15.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-11.19, 15.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.85, 15.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.78, 15.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.42, 16.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.67, 16.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.92, 16.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.79, 17.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.15, 17.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.99, 17.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.66, 17.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.91, 18.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.67, 18.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.95, 19.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.86, 20.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.01, 20.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.33, 21.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.34, 21.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.58, 21.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.02, 22.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.25, 24.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.46, 26.37]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.27, 26.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.54, 27.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.26, 27.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [7, 27.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.13, 28.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.99, 30.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.13, 30.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.33, 31.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.89, 31.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.21, 33.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [-20.62, 33.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [17.11, 34.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-21.02, 34.7]
  },
  {
   "cluster": "plant.grass-long",
   "on": "land",
   "n": 19,
   "seed": 9964
  },
  {
   "obj": "plant.fern",
   "at": [-1.21, 4.57]
  },
  {
   "obj": "plant.fern",
   "at": [-1.81, 4.6]
  },
  {
   "obj": "plant.fern",
   "at": [-1.62, 4.66]
  },
  {
   "obj": "plant.fern",
   "at": [-1.58, 4.68]
  },
  {
   "obj": "plant.fern",
   "at": [-1.28, 4.79]
  },
  {
   "obj": "plant.fern",
   "at": [-1.13, 5.34]
  },
  {
   "obj": "plant.fern",
   "at": [-1.05, 5.91]
  },
  {
   "obj": "plant.fern",
   "at": [-1.03, 6.38]
  },
  {
   "obj": "plant.fern",
   "at": [-1.67, 6.77]
  },
  {
   "obj": "plant.fern",
   "at": [-1.25, 6.95]
  },
  {
   "obj": "plant.fern",
   "at": [-1.74, 7.06]
  },
  {
   "obj": "plant.fern",
   "at": [-1.21, 7.21]
  },
  {
   "obj": "plant.fern",
   "at": [-5.76, 8.05]
  },
  {
   "obj": "plant.fern",
   "at": [-1.46, 8.06]
  },
  {
   "obj": "plant.fern",
   "at": [-5.68, 8.1]
  },
  {
   "obj": "plant.fern",
   "at": [-1.43, 9.04]
  },
  {
   "obj": "plant.fern",
   "at": [-1.94, 9.74]
  },
  {
   "obj": "plant.fern",
   "at": [-7.34, 9.95]
  },
  {
   "obj": "plant.fern",
   "at": [-5.76, 10.6]
  },
  {
   "obj": "plant.fern",
   "at": [-5.74, 10.85]
  },
  {
   "obj": "plant.fern",
   "at": [-6.72, 10.96]
  },
  {
   "obj": "plant.fern",
   "at": [-7.06, 11.09]
  },
  {
   "obj": "plant.fern",
   "at": [-8.32, 11.22]
  },
  {
   "obj": "plant.fern",
   "at": [-1.86, 11.23]
  },
  {
   "obj": "plant.fern",
   "at": [7.82, 11.32]
  },
  {
   "obj": "plant.fern",
   "at": [-2.02, 11.36]
  },
  {
   "obj": "plant.fern",
   "at": [-2.35, 11.65]
  },
  {
   "obj": "plant.fern",
   "at": [-7.02, 11.73]
  },
  {
   "obj": "plant.fern",
   "at": [-5.83, 11.83]
  },
  {
   "obj": "plant.fern",
   "at": [-2.07, 12.01]
  },
  {
   "obj": "plant.fern",
   "at": [7.34, 12.6]
  },
  {
   "obj": "plant.fern",
   "at": [-8.88, 12.74]
  },
  {
   "obj": "plant.fern",
   "at": [7.27, 12.84]
  },
  {
   "obj": "plant.fern",
   "at": [-2.44, 12.9]
  },
  {
   "obj": "plant.fern",
   "at": [-8.28, 13.13]
  },
  {
   "obj": "plant.fern",
   "at": [-2.58, 13.23]
  },
  {
   "obj": "plant.fern",
   "at": [-9.42, 13.8]
  },
  {
   "obj": "plant.fern",
   "at": [-8.03, 14.02]
  },
  {
   "obj": "plant.fern",
   "at": [-9.62, 14.4]
  },
  {
   "obj": "plant.fern",
   "at": [-10.01, 14.8]
  },
  {
   "obj": "plant.fern",
   "at": [-10.76, 15.18]
  },
  {
   "obj": "plant.fern",
   "at": [-6.2, 15.69]
  },
  {
   "obj": "plant.fern",
   "at": [-7.79, 15.7]
  },
  {
   "obj": "plant.fern",
   "at": [-6.73, 16.69]
  },
  {
   "obj": "plant.fern",
   "at": [12.91, 18.81]
  },
  {
   "obj": "plant.fern",
   "at": [6.94, 19.02]
  },
  {
   "obj": "plant.fern",
   "at": [-10.12, 20.07]
  },
  {
   "obj": "plant.fern",
   "at": [-7.21, 23.13]
  },
  {
   "obj": "plant.fern",
   "at": [-12.47, 23.18]
  },
  {
   "obj": "plant.fern",
   "at": [-8.03, 24.58]
  },
  {
   "obj": "plant.fern",
   "at": [-19.75, 28.55]
  },
  {
   "obj": "plant.fern",
   "at": [-13.77, 29.57]
  },
  {
   "obj": "plant.fern",
   "at": [4.83, 30.48]
  },
  {
   "obj": "plant.fern",
   "at": [-9.93, 34.99]
  },
  {
   "cluster": "plant.fern",
   "on": "land",
   "n": 16,
   "seed": 5275
  },
  {
   "obj": "plant.grass",
   "at": [-0.78, 4.56]
  },
  {
   "obj": "plant.grass",
   "at": [-0.74, 4.58]
  },
  {
   "obj": "plant.grass",
   "at": [-1.83, 4.88]
  },
  {
   "obj": "plant.grass",
   "at": [-1.14, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [-1.89, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [-1.13, 5]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 5.11]
  },
  {
   "obj": "plant.grass",
   "at": [-0.8, 5.28]
  },
  {
   "obj": "plant.grass",
   "at": [-1.43, 5.32]
  },
  {
   "obj": "plant.grass",
   "at": [-0.86, 5.58]
  },
  {
   "obj": "plant.grass",
   "at": [-1.83, 5.58]
  },
  {
   "obj": "plant.grass",
   "at": [-1.15, 5.58]
  },
  {
   "obj": "plant.grass",
   "at": [-1.63, 5.72]
  },
  {
   "obj": "plant.grass",
   "at": [-1.15, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [-0.96, 5.97]
  },
  {
   "obj": "plant.grass",
   "at": [-5.19, 7.36]
  },
  {
   "obj": "plant.grass",
   "at": [-4.93, 8.65]
  },
  {
   "obj": "plant.grass",
   "at": [-1.72, 9.12]
  },
  {
   "obj": "plant.grass",
   "at": [-6.13, 9.17]
  },
  {
   "obj": "plant.grass",
   "at": [-7.35, 10.09]
  },
  {
   "obj": "plant.grass",
   "at": [-5.71, 10.38]
  },
  {
   "obj": "plant.grass",
   "at": [7.43, 11]
  },
  {
   "obj": "plant.grass",
   "at": [7.42, 12.06]
  },
  {
   "obj": "plant.grass",
   "at": [-7.37, 12.9]
  },
  {
   "obj": "plant.grass",
   "at": [-5.51, 13.67]
  },
  {
   "obj": "plant.grass",
   "at": [-8.93, 14.24]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 15.36]
  },
  {
   "obj": "plant.grass",
   "at": [-8.6, 15.81]
  },
  {
   "obj": "plant.grass",
   "at": [7.41, 16.04]
  },
  {
   "obj": "plant.grass",
   "at": [-10.07, 16.87]
  },
  {
   "obj": "plant.grass",
   "at": [-10.89, 16.96]
  },
  {
   "obj": "plant.grass",
   "at": [12.55, 16.98]
  },
  {
   "obj": "plant.grass",
   "at": [12.11, 17.27]
  },
  {
   "obj": "plant.grass",
   "at": [-10.43, 17.27]
  },
  {
   "obj": "plant.grass",
   "at": [-12.65, 17.67]
  },
  {
   "obj": "plant.grass",
   "at": [13.2, 21.44]
  },
  {
   "obj": "plant.grass",
   "at": [10.18, 21.55]
  },
  {
   "obj": "plant.grass",
   "at": [-13.49, 23.78]
  },
  {
   "cluster": "plant.grass",
   "on": "land",
   "n": 9,
   "seed": 6781
  },
  {
   "obj": "plant.canal-view-meadowsweet",
   "at": [7.85, 59.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.31, 3.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.79, 4.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.54, 4.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.14, 4.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.17, 4.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.2, 4.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.24, 4.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.14, 4.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.76, 4.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.08, 4.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.11, 4.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.78, 4.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.11, 4.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.38, 4.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.31, 4.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.27, 4.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.11, 4.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.14, 4.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.3, 4.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.5, 4.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.11, 4.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.18, 4.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.34, 4.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.77, 4.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.13, 4.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.04, 4.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.01, 4.89]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.21, 4.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.19, 4.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.12, 4.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.51, 4.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.3, 4.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.16, 4.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.51, 5]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.41, 5.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.91, 5.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.2, 5.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.57, 5.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.48, 5.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.86, 5.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.39, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.09, 5.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.22, 5.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.53, 5.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.75, 5.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.55, 5.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.79, 5.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.68, 5.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.33, 5.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.15, 5.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.31, 5.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.4, 6.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.29, 6.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.43, 6.05]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.66, 6.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.7, 6.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.33, 6.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.14, 6.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.14, 6.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.75, 6.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.52, 6.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.16, 6.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.17, 6.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.36, 6.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.82, 6.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.6, 6.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.28, 6.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.2, 6.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.88, 7.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.58, 7.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.98, 7.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.24, 7.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.5, 7.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.63, 7.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.4, 7.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.27, 8.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.15, 8.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.73, 8.89]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.15, 9.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.07, 9.34]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.21, 9.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.05, 9.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.06, 10.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.4, 10.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.8, 10.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.85, 10.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.43, 12.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.77, 13.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.7, 13.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.94, 14.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.05, 15.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.5, 16.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.17, 17.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.47, 19.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.64, 20.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.25, 25.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.68, 30.56]
  },
  {
   "obj": "plant.bluebells",
   "at": [-1.89, 4.8]
  },
  {
   "obj": "plant.bluebells",
   "at": [-1.42, 6.8]
  },
  {
   "obj": "plant.bluebells",
   "at": [-1.18, 7.64]
  },
  {
   "obj": "plant.bluebells",
   "at": [-5.63, 8.31]
  },
  {
   "obj": "plant.bluebells",
   "at": [-7.31, 10.29]
  },
  {
   "obj": "plant.bluebells",
   "at": [7.84, 10.67]
  },
  {
   "obj": "plant.bluebells",
   "at": [-2.35, 11.28]
  },
  {
   "obj": "plant.bluebells",
   "at": [-6.73, 12.29]
  },
  {
   "obj": "plant.bluebells",
   "at": [-9.1, 12.48]
  },
  {
   "obj": "plant.bluebells",
   "at": [-9.31, 12.61]
  },
  {
   "obj": "plant.bluebells",
   "at": [8.89, 12.87]
  },
  {
   "obj": "plant.bluebells",
   "at": [-9.38, 12.97]
  },
  {
   "obj": "plant.bluebells",
   "at": [-7.78, 14.22]
  },
  {
   "obj": "plant.bluebells",
   "at": [-10.01, 18.36]
  },
  {
   "obj": "plant.bluebells",
   "at": [-12.52, 21.11]
  },
  {
   "obj": "plant.bluebells",
   "at": [12.58, 21.76]
  },
  {
   "obj": "plant.bluebells",
   "at": [6.97, 23.23]
  },
  {
   "obj": "plant.bluebells",
   "at": [-7.64, 27.25]
  },
  {
   "obj": "plant.bluebells",
   "at": [7.24, 27.49]
  },
  {
   "obj": "plant.bluebells",
   "at": [-12.52, 29.39]
  },
  {
   "obj": "plant.bluebells",
   "at": [-18.39, 31.81]
  },
  {
   "obj": "plant.bluebells",
   "at": [10.03, 34.67]
  },
  {
   "obj": "plant.bluebells",
   "at": [-23.82, 39.84]
  },
  {
   "obj": "plant.bluebells",
   "at": [12.21, 47.76]
  },
  {
   "obj": "plant.grass",
   "at": [1.28, 4.46]
  },
  {
   "obj": "plant.grass",
   "at": [0.32, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [-0.21, 4.6]
  },
  {
   "obj": "plant.grass",
   "at": [0.43, 4.63]
  },
  {
   "obj": "plant.grass",
   "at": [0.99, 4.63]
  },
  {
   "obj": "plant.grass",
   "at": [1.08, 4.65]
  },
  {
   "obj": "plant.grass",
   "at": [0.37, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [0.55, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [0.52, 4.82]
  },
  {
   "obj": "plant.grass",
   "at": [0.28, 4.99]
  },
  {
   "obj": "plant.grass",
   "at": [0.2, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [-0.22, 5.11]
  },
  {
   "obj": "plant.grass",
   "at": [0.79, 5.13]
  },
  {
   "obj": "plant.grass",
   "at": [-0.02, 5.27]
  },
  {
   "obj": "plant.grass",
   "at": [0.68, 5.3]
  },
  {
   "obj": "plant.grass",
   "at": [0.65, 5.39]
  },
  {
   "obj": "plant.grass",
   "at": [0.24, 5.42]
  },
  {
   "obj": "plant.grass",
   "at": [0.8, 5.44]
  },
  {
   "obj": "plant.grass",
   "at": [0.72, 5.58]
  },
  {
   "obj": "plant.grass",
   "at": [-0.1, 5.58]
  },
  {
   "obj": "plant.grass",
   "at": [-0.05, 5.67]
  },
  {
   "obj": "plant.grass",
   "at": [-0.19, 5.68]
  },
  {
   "obj": "plant.grass",
   "at": [-0.48, 5.69]
  },
  {
   "obj": "plant.grass",
   "at": [-0.44, 5.72]
  },
  {
   "obj": "plant.grass",
   "at": [0.81, 5.8]
  },
  {
   "obj": "plant.grass",
   "at": [-0.11, 5.81]
  },
  {
   "obj": "plant.grass",
   "at": [-0.61, 5.91]
  },
  {
   "obj": "plant.grass",
   "at": [0.59, 6.28]
  },
  {
   "obj": "plant.grass",
   "at": [0.25, 6.55]
  },
  {
   "obj": "plant.grass",
   "at": [0.13, 6.69]
  },
  {
   "obj": "plant.grass",
   "at": [-0.22, 6.84]
  },
  {
   "obj": "plant.grass",
   "at": [-0.73, 6.99]
  },
  {
   "obj": "plant.grass",
   "at": [-0.22, 7.06]
  },
  {
   "obj": "plant.grass",
   "at": [0.11, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [-0.07, 7.37]
  },
  {
   "obj": "plant.grass",
   "at": [0.3, 7.48]
  },
  {
   "obj": "plant.grass",
   "at": [0.33, 7.61]
  },
  {
   "obj": "plant.grass",
   "at": [-1.09, 7.65]
  },
  {
   "obj": "plant.grass",
   "at": [-0.07, 7.85]
  },
  {
   "obj": "plant.grass",
   "at": [-0.5, 7.89]
  },
  {
   "obj": "plant.grass",
   "at": [-0.47, 8.79]
  },
  {
   "obj": "plant.grass",
   "at": [-0.1, 8.96]
  },
  {
   "obj": "plant.grass",
   "at": [-1, 8.97]
  },
  {
   "obj": "plant.grass",
   "at": [-0.81, 9.41]
  },
  {
   "obj": "plant.grass",
   "at": [-1.25, 10.38]
  },
  {
   "obj": "plant.grass",
   "at": [-0.65, 10.51]
  },
  {
   "obj": "plant.grass",
   "at": [-1.28, 11.19]
  },
  {
   "obj": "plant.grass",
   "at": [-0.41, 11.65]
  },
  {
   "obj": "plant.grass",
   "at": [-1.74, 12.96]
  },
  {
   "obj": "plant.grass",
   "at": [-0.54, 13.72]
  },
  {
   "obj": "plant.grass",
   "at": [-0.98, 17.69]
  },
  {
   "obj": "plant.grass",
   "at": [-2.47, 25.88]
  },
  {
   "obj": "plant.grass",
   "at": [-1.96, 37.77]
  },
  {
   "obj": "tree.canal-willow",
   "at": [-3.9, 33.87]
  },
  {
   "obj": "plant.fern",
   "at": [-0.31, 3.95]
  },
  {
   "obj": "plant.fern",
   "at": [0.62, 4.45]
  },
  {
   "obj": "plant.fern",
   "at": [0.02, 4.48]
  },
  {
   "obj": "plant.fern",
   "at": [0.23, 4.5]
  },
  {
   "obj": "plant.fern",
   "at": [-0.07, 4.53]
  },
  {
   "obj": "plant.fern",
   "at": [1.05, 4.56]
  },
  {
   "obj": "plant.fern",
   "at": [0.89, 4.62]
  },
  {
   "obj": "plant.fern",
   "at": [1.22, 4.64]
  },
  {
   "obj": "plant.fern",
   "at": [-0.28, 4.7]
  },
  {
   "obj": "plant.fern",
   "at": [0.99, 4.72]
  },
  {
   "obj": "plant.fern",
   "at": [0.67, 4.86]
  },
  {
   "obj": "plant.fern",
   "at": [0.05, 4.88]
  },
  {
   "obj": "plant.fern",
   "at": [-0.06, 4.93]
  },
  {
   "obj": "plant.fern",
   "at": [0.81, 5.21]
  },
  {
   "obj": "plant.fern",
   "at": [0.03, 5.21]
  },
  {
   "obj": "plant.fern",
   "at": [0.25, 5.31]
  },
  {
   "obj": "plant.fern",
   "at": [0.83, 5.32]
  },
  {
   "obj": "plant.fern",
   "at": [-0.59, 5.45]
  },
  {
   "obj": "plant.fern",
   "at": [-0.73, 5.78]
  },
  {
   "obj": "plant.fern",
   "at": [-0.07, 5.82]
  },
  {
   "obj": "plant.fern",
   "at": [-0.49, 5.82]
  },
  {
   "obj": "plant.fern",
   "at": [-0.54, 5.84]
  },
  {
   "obj": "plant.fern",
   "at": [-0.28, 5.95]
  },
  {
   "obj": "plant.fern",
   "at": [0.19, 6.09]
  },
  {
   "obj": "plant.fern",
   "at": [-0.06, 6.24]
  },
  {
   "obj": "plant.fern",
   "at": [-0.69, 6.27]
  },
  {
   "obj": "plant.fern",
   "at": [-0.26, 6.43]
  },
  {
   "obj": "plant.fern",
   "at": [-0.39, 6.66]
  },
  {
   "obj": "plant.fern",
   "at": [0.6, 6.76]
  },
  {
   "obj": "plant.fern",
   "at": [-0.3, 7]
  },
  {
   "obj": "plant.fern",
   "at": [0.21, 7.02]
  },
  {
   "obj": "plant.fern",
   "at": [0.49, 7.14]
  },
  {
   "obj": "plant.fern",
   "at": [-0.91, 7.56]
  },
  {
   "obj": "plant.fern",
   "at": [0.34, 8.21]
  },
  {
   "obj": "plant.fern",
   "at": [-0.81, 8.37]
  },
  {
   "obj": "plant.fern",
   "at": [-0.44, 9.7]
  },
  {
   "obj": "plant.fern",
   "at": [-0.61, 9.81]
  },
  {
   "obj": "plant.fern",
   "at": [-0.86, 9.9]
  },
  {
   "obj": "plant.fern",
   "at": [-1.34, 11.27]
  },
  {
   "obj": "plant.fern",
   "at": [-0.95, 14.2]
  },
  {
   "obj": "plant.fern",
   "at": [-2.18, 15.51]
  },
  {
   "obj": "plant.fern",
   "at": [-1.39, 16.05]
  },
  {
   "obj": "person.child-scooter",
   "at": [8.09, 19.39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.59, 5.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.38, 9.46]
  }],
 "life": [{
   "who": "walkers",
   "on": "path",
   "rate": "4/min",
   "mix": {
    "dog-walker": 0.33,
    "buggy": 0.17,
    "stroll": 0.17,
    "jogger": 0.17,
    "family": 0.08,
    "elderly-couple": 0.08
   }
  },
  {
   "who": "walkers",
   "on": "path-n",
   "rate": "2/min",
   "mix": {
    "stroll": 0.4,
    "student": 0.2,
    "dog-walker": 0.4
   }
  },
  {
   "who": "mallard",
   "count": 3,
   "on": "brook"
  },
  {
   "who": "moorhen",
   "count": 1,
   "on": "brook"
  }],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
