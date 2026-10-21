/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-parks-4-w3: converted by `node tools/world.mjs convert uk-north-sheffield-parks/south-yorkshire-sheffield-parks-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (65):
     - place[1]: structure.shp-moor-wall: pixel placement unprojected to [-2.5, 9] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.shp-moor-wall: pixel placement unprojected to [-2.6, 11.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.shp-moor-wall: pixel placement unprojected to [-2.7, 15.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.shp-moor-wall: pixel placement unprojected to [-2.9, 20.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.shp-moor-wall: pixel placement unprojected to [-3.2, 27.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.shp-moor-wall: pixel placement unprojected to [-3.5, 36.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.shp-moor-wall: pixel placement unprojected to [-4.6, 69.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.shp-moor-wall: pixel placement unprojected to [-5.4, 92.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.shp-moor-wall: pixel placement unprojected to [-6.5, 121.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.shp-moor-wall: pixel placement unprojected to [-7.8, 160.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.shp-moor-wall: pixel placement unprojected to [-8.7, 212] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.shp-moor-wall: pixel placement unprojected to [-12.6, 279.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.shp-moor-wall: pixel placement unprojected to [-22.5, 369.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: structure.shp-moor-wall: pixel placement unprojected to [9.4, 12] m (was pinned perspective art: check it is a real object at this spot)
     - place[15]: structure.shp-moor-wall: pixel placement unprojected to [9.3, 15.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: structure.shp-moor-wall: pixel placement unprojected to [9.1, 20.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[17]: structure.shp-moor-wall: pixel placement unprojected to [7.8, 58] m (was pinned perspective art: check it is a real object at this spot)
     - place[18]: structure.shp-moor-wall: pixel placement unprojected to [7.1, 76.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[19]: structure.shp-moor-wall: pixel placement unprojected to [6.3, 101.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: structure.shp-moor-wall: pixel placement unprojected to [5.1, 133.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[21]: structure.shp-moor-wall: pixel placement unprojected to [4.1, 176.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[22]: structure.shp-moor-wall: pixel placement unprojected to [2.5, 232.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[23]: structure.shp-moor-wall: pixel placement unprojected to [-3, 308.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[24]: structure.shp-field-wall: pixel placement unprojected to [-21.7, 69.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[25]: structure.shp-field-wall: pixel placement unprojected to [-38.8, 68.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[26]: structure.shp-field-wall: pixel placement unprojected to [-55.8, 67.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[27]: structure.shp-field-wall: pixel placement unprojected to [-72.9, 67.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[28]: structure.shp-field-wall: pixel placement unprojected to [-90, 66.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[29]: structure.shp-field-wall: pixel placement unprojected to [-50.1, 148.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[30]: structure.shp-field-wall: pixel placement unprojected to [-92.5, 146.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[31]: structure.shp-field-wall: pixel placement unprojected to [-134.8, 144.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[32]: structure.shp-field-wall: pixel placement unprojected to [-177.8, 143.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[33]: structure.shp-field-wall: pixel placement unprojected to [-220.2, 141.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[34]: structure.shp-field-wall: pixel placement unprojected to [-88.1, 256.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[35]: structure.shp-field-wall: pixel placement unprojected to [-165.7, 254.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[36]: structure.shp-field-wall: pixel placement unprojected to [-242.3, 250.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[37]: structure.shp-field-wall: pixel placement unprojected to [-321, 248.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[38]: structure.shp-field-wall: pixel placement unprojected to [6.4, 95.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[39]: structure.shp-field-wall: pixel placement unprojected to [34.8, 97] m (was pinned perspective art: check it is a real object at this spot)
     - place[40]: structure.shp-field-wall: pixel placement unprojected to [63.2, 98.2] m (was pinned perspective art: check it is a real object at this spot)
     ... and 25 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-parks-4-w3","label":"Ringinglow, Sheffield","site":"Ringinglow — the Round House and the road out over the moor to the edges of the Peak","tags":["uk","yorkshire","south yorkshire","sheffield","landscape","moor","peak","toll house","drystone walls","sheep","cyclists","world-v3"],"liveSky":{"lat":53.3608,"lon":-1.5466},"mood":"calm","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 53.3608,
  "lon": -1.5466,
  "region": "south-yorkshire"
 },
 "camera": {
  "eye": 2.6,
  "fov": 64,
  "horizon": 384,
  "heading": 262
 },
 "surfaces": [{
   "id": "land",
   "kind": "heath",
   "poly": [[-4.5, 5.8],
    [4.5, 5.8],
    [2343.3, 3000],
    [-2343.3, 3000]]
  },
  {
   "id": "inbye-l",
   "kind": "field",
   "poly": [[-400, 4],
    [-2.54, 4],
    [-4.85, 70],
    [-200, 150],
    [-400, 260]]
  },
  {
   "id": "inbye-r",
   "kind": "field",
   "poly": [[6.4, 58],
    [400, 58],
    [400, 220],
    [5.3, 190],
    [7.84, 96]]
  },
  {
   "id": "sheep-l",
   "kind": "field",
   "poly": [[-120, 12],
    [-4.22, 12],
    [-5.97, 62],
    [-120, 62]]
  },
  {
   "id": "sheep-r",
   "kind": "field",
   "poly": [[8.49, 106],
    [110, 106],
    [110, 184],
    [6.41, 184]]
  },
  {
   "id": "yard",
   "kind": "plaza",
   "poly": [[8.4, 35],
    [34, 35],
    [34, 57],
    [8.4, 57]]
  },
  {
   "id": "pub-yard",
   "kind": "plaza",
   "poly": [[-52, 70],
    [-14, 70],
    [-14, 90],
    [-52, 90]]
  },
  {
   "id": "verge-l",
   "kind": "grass",
   "path": [[-0.17, 2],
    [-9.1, 261],
    [-48.9, 520]],
   "width": 4.2
  },
  {
   "id": "verge-r",
   "kind": "grass",
   "path": [[9.03, 2],
    [0.1, 261],
    [-39.7, 520]],
   "width": 1.4
  },
  {
   "id": "road",
   "kind": "road",
   "path": [[5.13, 2],
    [4.85, 10],
    [4.15, 30],
    [3.1, 60],
    [1.7, 100],
    [0.3, 140],
    [-0.93, 200],
    [-5.2, 280],
    [-16.53, 380],
    [-43.6, 520]],
   "width": 5.8
  },
  {
   "id": "side-road",
   "kind": "road",
   "path": [[-160, 66],
    [-40, 65],
    [-2, 64.6]],
   "width": 5.6
  }],
 "entities": [{
   "obj": "structure.shp-moor-wall",
   "at": [-2.52, 9],
   "variant": 0
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-2.92, 20.7],
   "variant": 3
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-3.16, 27.33],
   "variant": 4
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-3.46, 36.06],
   "variant": 5
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-4.64, 69.93],
   "variant": 6
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-5.43, 92.46],
   "variant": 7
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-6.47, 121.93],
   "variant": 8
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-7.79, 160.81],
   "variant": 9
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-8.69, 212.02],
   "variant": 10
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-12.61, 279.72],
   "variant": 11
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-22.5, 369.86],
   "variant": 12
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [9.38, 12],
   "variant": 13
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [9.07, 20.91],
   "variant": 15
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [7.77, 57.99],
   "variant": 16
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [7.12, 76.52],
   "variant": 17
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [6.27, 101.18],
   "variant": 18
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [5.12, 133.15],
   "variant": 19
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [4.11, 176.12],
   "variant": 20
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [2.45, 232.78],
   "variant": 21
  },
  {
   "obj": "structure.shp-moor-wall",
   "at": [-2.99, 308.21],
   "variant": 22
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-21.73, 69.35],
   "variant": 23
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-38.79, 68.63],
   "variant": 24
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-55.85, 67.93],
   "variant": 25
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-72.91, 67.25],
   "variant": 26
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-89.98, 66.57],
   "variant": 27
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-50.06, 148.6],
   "variant": 28
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-92.49, 146.64],
   "variant": 29
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-134.82, 144.73],
   "variant": 30
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-177.83, 143.48],
   "variant": 31
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-220.23, 141.65],
   "variant": 32
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-88.06, 256.05],
   "variant": 33
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-165.75, 254.1],
   "variant": 34
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-242.35, 250.28],
   "variant": 35
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [-320.98, 248.41],
   "variant": 36
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [6.44, 95.93],
   "variant": 37
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [34.79, 97.05],
   "variant": 38
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [63.17, 98.19],
   "variant": 39
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [91.57, 99.36],
   "variant": 40
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [3.91, 190.21],
   "variant": 41
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [55.22, 192.41],
   "variant": 42
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [106.65, 194.66],
   "variant": 43
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [157.28, 195.81],
   "variant": 44
  },
  {
   "obj": "structure.shp-field-wall",
   "at": [208.71, 198.14],
   "variant": 45
  },
  {
   "obj": "tree.canal-oak",
   "at": [40, 72]
  },
  {
   "obj": "tree.wyv-far-sallow",
   "at": [-36, 52]
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-11.91, 33.83],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-11.29, 27.68],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-13.9, 30.45],
   "variant": 1
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-32.62, 66.19],
   "variant": 2
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-36.21, 59.16],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-30.34, 64.97],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-32.68, 60.84],
   "variant": 1
  },
  {
   "obj": "animal.sheep-moor",
   "at": [32.75, 75.82],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [30.16, 69.36],
   "variant": 1
  },
  {
   "obj": "animal.sheep-moor",
   "at": [29.68, 69.28],
   "variant": 2
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-69.56, 121.99],
   "variant": 0
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-73.98, 116.93],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.sheep-moor",
   "at": [-71.27, 119.01],
   "variant": 2
  },
  {
   "obj": "animal.sheep-moor",
   "at": [54.97, 150.37],
   "variant": 0
  },
  {
   "obj": "animal.sheep-moor",
   "at": [63.23, 152.77],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.hiker",
   "at": [-1.45, 30],
   "facing": 0
  },
  {
   "obj": "animal.dog",
   "at": [-0.78, 28]
  },
  {
   "obj": "animal.rabbit",
   "at": [-2.1, 20],
   "facing": 270
  },
  {
   "obj": "animal.rabbit",
   "at": [-2.54, 44],
   "facing": 270
  },
  {
   "obj": "animal.rabbit",
   "at": [-30, 40]
  },
  {
   "obj": "plant.moor-heather",
   "at": [3.01, 5.93]
  },
  {
   "obj": "plant.bilberry",
   "at": [2.03, 5.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.73, 5.83]
  },
  {
   "obj": "plant.moor-heather",
   "at": [-3.26, 5.88],
   "variant": 1
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.46, 5.73],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.46, 5.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.04, 30.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [21.49, 30.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [19.64, 30.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [21.36, 30.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.3, 31.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.39, 31.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.4, 32.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [20.73, 32.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.8, 32.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [18.33, 33.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [14.64, 33.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [16.56, 33.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.35, 34.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [14.46, 34.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [16.62, 34.88]
  },
  {
   "cluster": "plant.grass-long",
   "on": "land",
   "n": 101,
   "seed": 9964
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [19.38, 30.06]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [19.4, 30.59]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [20.16, 31.42]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [21.23, 31.57]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [16.53, 31.96]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [15.91, 32.34]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [15.93, 32.61]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [15.6, 32.86]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [15.73, 33.5]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [19.93, 33.8]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [20.63, 34.23]
  },
  {
   "cluster": "plant.yc-cotton-grass",
   "on": "land",
   "n": 82,
   "seed": 586
  },
  {
   "obj": "plant.moor-heather",
   "at": [19.5, 30.01]
  },
  {
   "obj": "plant.moor-heather",
   "at": [19.91, 30.58]
  },
  {
   "obj": "plant.moor-heather",
   "at": [19.59, 30.7]
  },
  {
   "obj": "plant.moor-heather",
   "at": [20.23, 30.81]
  },
  {
   "obj": "plant.moor-heather",
   "at": [20.22, 30.93]
  },
  {
   "obj": "plant.moor-heather",
   "at": [20.18, 31.27]
  },
  {
   "obj": "plant.moor-heather",
   "at": [13.48, 31.63]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.09, 31.65]
  },
  {
   "obj": "plant.moor-heather",
   "at": [20.61, 31.8]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.12, 31.89]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.91, 32.2]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.18, 32.25]
  },
  {
   "obj": "plant.moor-heather",
   "at": [21.18, 32.28]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.7, 32.29]
  },
  {
   "obj": "plant.moor-heather",
   "at": [15.86, 33.28]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.15, 33.29]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.71, 33.68]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.11, 34.1]
  },
  {
   "obj": "plant.moor-heather",
   "at": [19.43, 34.1]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.5, 34.3]
  },
  {
   "obj": "plant.moor-heather",
   "at": [18.6, 34.44]
  },
  {
   "obj": "plant.moor-heather",
   "at": [24.56, 34.6]
  },
  {
   "obj": "plant.moor-heather",
   "at": [17, 34.75]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.89, 34.77]
  },
  {
   "obj": "plant.moor-heather",
   "at": [16.38, 34.86]
  },
  {
   "cluster": "plant.moor-heather",
   "on": "land",
   "n": 124,
   "seed": 3689
  },
  {
   "obj": "plant.bilberry",
   "at": [2.03, 5.78]
  },
  {
   "obj": "plant.bilberry",
   "at": [19.66, 30.02]
  },
  {
   "obj": "plant.bilberry",
   "at": [19.22, 30.22]
  },
  {
   "obj": "plant.bilberry",
   "at": [19.78, 30.74]
  },
  {
   "obj": "plant.bilberry",
   "at": [22.11, 30.84]
  },
  {
   "obj": "plant.bilberry",
   "at": [20.39, 31.28]
  },
  {
   "obj": "plant.bilberry",
   "at": [22.22, 32.23]
  },
  {
   "obj": "plant.bilberry",
   "at": [15.91, 33.01]
  },
  {
   "obj": "plant.bilberry",
   "at": [13.21, 33.32]
  },
  {
   "obj": "plant.bilberry",
   "at": [16.94, 34.34]
  },
  {
   "obj": "plant.bilberry",
   "at": [15.4, 34.77]
  },
  {
   "cluster": "plant.bilberry",
   "on": "land",
   "n": 50,
   "seed": 5564
  },
  {
   "cluster": "plant.wildflowers",
   "on": "inbye-r",
   "n": 11,
   "seed": 1119
  },
  {
   "cluster": "plant.grass-long",
   "on": "inbye-r",
   "n": 38,
   "seed": 7337
  },
  {
   "cluster": "plant.yc-cotton-grass",
   "on": "inbye-r",
   "n": 7,
   "seed": 3878
  },
  {
   "obj": "building.gen-direct",
   "at": [77, 154]
  },
  {
   "cluster": "plant.grass",
   "on": "inbye-r",
   "n": 20,
   "seed": 4914
  },
  {
   "obj": "plant.bilberry",
   "at": [1.56, 6.48]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.2, 6.86]
  },
  {
   "obj": "plant.bilberry",
   "at": [-2.25, 6.95]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.34, 7.06]
  },
  {
   "obj": "plant.bilberry",
   "at": [0.79, 7.07]
  },
  {
   "obj": "plant.bilberry",
   "at": [-1.54, 7.13]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.49, 7.28]
  },
  {
   "obj": "plant.bilberry",
   "at": [0.28, 8.06]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.74, 8.51]
  },
  {
   "obj": "plant.bilberry",
   "at": [-1.02, 9.32]
  },
  {
   "obj": "plant.bilberry",
   "at": [-0.3, 11.12]
  },
  {
   "obj": "plant.bilberry",
   "at": [-0.31, 12.78]
  },
  {
   "obj": "plant.bilberry",
   "at": [-0.95, 12.96]
  },
  {
   "obj": "plant.bilberry",
   "at": [-0.35, 15.7]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.35, 15.73]
  },
  {
   "obj": "plant.bilberry",
   "at": [-0.57, 18.55]
  },
  {
   "obj": "plant.bilberry",
   "at": [1.44, 21.35]
  },
  {
   "obj": "plant.bilberry",
   "at": [-3.55, 88.12]
  },
  {
   "obj": "building.gen-direct",
   "at": [-34, 82]
  },
  {
   "obj": "building.gen-direct",
   "at": [-69, 96]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 6.4]
  },
  {
   "obj": "plant.grass",
   "at": [-3.57, 6.41]
  },
  {
   "obj": "plant.grass",
   "at": [-3.53, 6.43]
  },
  {
   "obj": "plant.grass",
   "at": [-4.52, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [-4.49, 6.46]
  },
  {
   "obj": "plant.grass",
   "at": [-3.16, 6.47]
  },
  {
   "obj": "plant.grass",
   "at": [-4.61, 6.48]
  },
  {
   "obj": "plant.grass",
   "at": [-3.26, 6.51]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 6.53]
  },
  {
   "obj": "plant.grass",
   "at": [-4.04, 6.54]
  },
  {
   "obj": "plant.grass",
   "at": [-4.46, 6.56]
  },
  {
   "obj": "plant.grass",
   "at": [-4.73, 6.66]
  },
  {
   "obj": "plant.grass",
   "at": [-3.27, 6.67]
  },
  {
   "obj": "plant.grass",
   "at": [-4.24, 6.7]
  },
  {
   "obj": "plant.grass",
   "at": [-4.15, 6.71]
  },
  {
   "obj": "plant.grass",
   "at": [-4.56, 6.71]
  },
  {
   "obj": "plant.grass",
   "at": [-3.98, 6.72]
  },
  {
   "obj": "plant.grass",
   "at": [-3.77, 6.75]
  },
  {
   "obj": "plant.grass",
   "at": [-3.71, 6.75]
  },
  {
   "obj": "plant.grass",
   "at": [-4.49, 6.77]
  },
  {
   "obj": "plant.grass",
   "at": [-3.93, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [-4.14, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [-3.64, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [-4.31, 6.82]
  },
  {
   "obj": "plant.grass",
   "at": [-4.82, 6.86]
  },
  {
   "obj": "plant.grass",
   "at": [-2.92, 6.87]
  },
  {
   "obj": "plant.grass",
   "at": [-2.99, 6.89]
  },
  {
   "obj": "plant.grass",
   "at": [-4.93, 6.9]
  },
  {
   "obj": "plant.grass",
   "at": [-4.84, 6.9]
  },
  {
   "obj": "plant.grass",
   "at": [-4.5, 6.92]
  },
  {
   "obj": "plant.grass",
   "at": [-4.25, 6.92]
  },
  {
   "obj": "plant.grass",
   "at": [-3.87, 6.93]
  },
  {
   "obj": "plant.grass",
   "at": [-4.44, 6.99]
  },
  {
   "obj": "plant.grass",
   "at": [-4.71, 6.99]
  },
  {
   "obj": "plant.grass",
   "at": [-3.19, 7]
  },
  {
   "obj": "plant.grass",
   "at": [-2.74, 7.02]
  },
  {
   "obj": "plant.grass",
   "at": [-2.78, 7.04]
  },
  {
   "obj": "plant.grass",
   "at": [-4.14, 7.06]
  },
  {
   "obj": "plant.grass",
   "at": [-2.74, 7.07]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 7.1]
  },
  {
   "obj": "plant.grass",
   "at": [-5.09, 7.13]
  },
  {
   "obj": "plant.grass",
   "at": [-5.08, 7.14]
  },
  {
   "obj": "plant.grass",
   "at": [-3.28, 7.17]
  },
  {
   "obj": "plant.grass",
   "at": [-3.13, 7.19]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 7.21]
  },
  {
   "obj": "plant.grass",
   "at": [-3.98, 7.23]
  },
  {
   "obj": "plant.grass",
   "at": [-3.33, 7.24]
  },
  {
   "obj": "plant.grass",
   "at": [-3.15, 7.29]
  },
  {
   "obj": "plant.grass",
   "at": [-4.27, 7.31]
  },
  {
   "obj": "plant.grass",
   "at": [-3.14, 7.32]
  },
  {
   "obj": "plant.grass",
   "at": [-4.85, 7.37]
  },
  {
   "obj": "plant.grass",
   "at": [-3.17, 7.38]
  },
  {
   "obj": "plant.grass",
   "at": [-3.95, 7.4]
  },
  {
   "obj": "plant.grass",
   "at": [-2.93, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [-4.58, 7.44]
  },
  {
   "obj": "plant.grass",
   "at": [-3.77, 7.45]
  },
  {
   "obj": "plant.grass",
   "at": [-3.84, 7.46]
  },
  {
   "obj": "plant.grass",
   "at": [-5.49, 7.49]
  },
  {
   "obj": "plant.grass",
   "at": [-2.74, 7.5]
  },
  {
   "obj": "plant.grass",
   "at": [-3.4, 7.51]
  },
  {
   "obj": "plant.grass",
   "at": [-4, 7.52]
  },
  {
   "obj": "plant.grass",
   "at": [-2.72, 7.54]
  },
  {
   "obj": "plant.grass",
   "at": [-4.04, 7.55]
  },
  {
   "obj": "plant.grass",
   "at": [-3.16, 7.57]
  },
  {
   "obj": "plant.grass",
   "at": [-5.54, 7.58]
  },
  {
   "obj": "plant.grass",
   "at": [-2.81, 7.64]
  },
  {
   "obj": "plant.grass",
   "at": [-4.17, 7.66]
  },
  {
   "obj": "plant.grass",
   "at": [-2.92, 7.76]
  },
  {
   "obj": "plant.grass",
   "at": [-2.81, 7.8]
  },
  {
   "obj": "plant.grass",
   "at": [-5.46, 7.83]
  },
  {
   "obj": "plant.grass",
   "at": [-5.2, 7.86]
  },
  {
   "obj": "plant.grass",
   "at": [-5.62, 7.87]
  },
  {
   "obj": "plant.grass",
   "at": [-5.32, 7.87]
  },
  {
   "obj": "plant.grass",
   "at": [-5.3, 7.89]
  },
  {
   "obj": "plant.grass",
   "at": [-4.19, 7.89]
  },
  {
   "obj": "plant.grass",
   "at": [-4.11, 7.91]
  },
  {
   "obj": "plant.grass",
   "at": [-3.76, 7.97]
  },
  {
   "obj": "plant.grass",
   "at": [-5.86, 8.03]
  },
  {
   "obj": "plant.grass",
   "at": [-5.02, 8.04]
  },
  {
   "obj": "plant.grass",
   "at": [-4.99, 8.06]
  },
  {
   "obj": "plant.grass",
   "at": [-2.89, 8.11]
  },
  {
   "obj": "plant.grass",
   "at": [-5.88, 8.12]
  },
  {
   "obj": "plant.grass",
   "at": [-6.04, 8.14]
  },
  {
   "obj": "plant.grass",
   "at": [-4.26, 8.17]
  },
  {
   "obj": "plant.grass",
   "at": [-3.79, 8.23]
  },
  {
   "obj": "plant.grass",
   "at": [-3.56, 8.29]
  },
  {
   "obj": "plant.grass",
   "at": [-2.82, 8.3]
  },
  {
   "obj": "plant.grass",
   "at": [-5.87, 8.45]
  },
  {
   "obj": "plant.grass",
   "at": [-2.72, 8.47]
  },
  {
   "obj": "plant.grass",
   "at": [-6.15, 8.47]
  },
  {
   "obj": "plant.grass",
   "at": [-4.66, 8.54]
  },
  {
   "obj": "plant.grass",
   "at": [-3.94, 8.56]
  },
  {
   "obj": "plant.grass",
   "at": [-2.77, 8.62]
  },
  {
   "obj": "plant.grass",
   "at": [-5.78, 8.65]
  },
  {
   "obj": "plant.grass",
   "at": [-4.98, 8.71]
  },
  {
   "obj": "plant.grass",
   "at": [-6.08, 8.73]
  },
  {
   "obj": "plant.grass",
   "at": [-5.66, 8.78]
  },
  {
   "obj": "plant.grass",
   "at": [-2.78, 8.87]
  },
  {
   "obj": "plant.grass",
   "at": [-5.86, 8.95]
  },
  {
   "obj": "plant.grass",
   "at": [-4.25, 9]
  },
  {
   "obj": "plant.grass",
   "at": [-3.58, 9.06]
  },
  {
   "obj": "plant.grass",
   "at": [-4.58, 9.07]
  },
  {
   "obj": "plant.grass",
   "at": [-3.68, 9.07]
  },
  {
   "obj": "plant.grass",
   "at": [-4.54, 9.23]
  },
  {
   "obj": "plant.grass",
   "at": [-5.24, 9.24]
  },
  {
   "obj": "plant.grass",
   "at": [-4.1, 9.28]
  },
  {
   "obj": "plant.grass",
   "at": [-4.17, 9.33]
  },
  {
   "obj": "plant.grass",
   "at": [-6.37, 9.33]
  },
  {
   "obj": "plant.grass",
   "at": [-5.48, 9.34]
  },
  {
   "obj": "plant.grass",
   "at": [-3.41, 9.35]
  },
  {
   "obj": "plant.grass",
   "at": [-3.33, 9.39]
  },
  {
   "obj": "plant.grass",
   "at": [-4.08, 9.4]
  },
  {
   "obj": "plant.grass",
   "at": [-4.18, 9.45]
  },
  {
   "obj": "plant.grass",
   "at": [-4.47, 9.51]
  },
  {
   "obj": "plant.grass",
   "at": [-5.34, 9.54]
  },
  {
   "obj": "plant.grass",
   "at": [-2.77, 9.58]
  },
  {
   "obj": "plant.grass",
   "at": [-5.43, 9.58]
  },
  {
   "obj": "plant.grass",
   "at": [-5.12, 9.63]
  },
  {
   "obj": "plant.grass",
   "at": [-4.57, 9.68]
  },
  {
   "obj": "plant.grass",
   "at": [-6.84, 9.68]
  },
  {
   "obj": "plant.grass",
   "at": [-6.57, 9.68]
  },
  {
   "obj": "plant.grass",
   "at": [-2.8, 9.81]
  },
  {
   "obj": "plant.grass",
   "at": [-5.96, 9.89]
  },
  {
   "obj": "plant.grass",
   "at": [-6.12, 9.96]
  },
  {
   "obj": "plant.grass",
   "at": [-7.42, 10.02]
  },
  {
   "obj": "plant.grass",
   "at": [-6.95, 10.06]
  },
  {
   "obj": "plant.grass",
   "at": [-3.51, 10.07]
  },
  {
   "obj": "plant.grass",
   "at": [-5.08, 10.1]
  },
  {
   "obj": "plant.grass",
   "at": [-6.03, 10.12]
  },
  {
   "obj": "plant.grass",
   "at": [-4.5, 10.13]
  },
  {
   "obj": "plant.grass",
   "at": [-7.32, 10.14]
  },
  {
   "obj": "plant.grass",
   "at": [-3.46, 10.22]
  },
  {
   "obj": "plant.grass",
   "at": [-4.65, 10.26]
  },
  {
   "obj": "plant.grass",
   "at": [-5.68, 10.27]
  },
  {
   "obj": "plant.grass",
   "at": [-7.57, 10.29]
  },
  {
   "obj": "plant.grass",
   "at": [-5.66, 10.33]
  },
  {
   "obj": "plant.grass",
   "at": [-5.76, 10.39]
  },
  {
   "obj": "plant.grass",
   "at": [-6.28, 10.44]
  },
  {
   "obj": "plant.grass",
   "at": [-4.45, 10.56]
  },
  {
   "obj": "plant.grass",
   "at": [-5.69, 10.58]
  },
  {
   "obj": "plant.grass",
   "at": [-4.44, 10.63]
  },
  {
   "obj": "plant.grass",
   "at": [-4.56, 10.68]
  },
  {
   "obj": "plant.grass",
   "at": [-5.24, 10.69]
  },
  {
   "obj": "plant.grass",
   "at": [-4.79, 10.81]
  },
  {
   "obj": "plant.grass",
   "at": [-5.06, 10.83]
  },
  {
   "obj": "plant.grass",
   "at": [-3.76, 10.85]
  },
  {
   "obj": "plant.grass",
   "at": [-6.84, 10.92]
  },
  {
   "obj": "plant.grass",
   "at": [-5.26, 10.93]
  },
  {
   "obj": "plant.grass",
   "at": [-3.35, 10.93]
  },
  {
   "obj": "plant.grass",
   "at": [-2.79, 11]
  },
  {
   "obj": "plant.grass",
   "at": [-8.1, 11.08]
  },
  {
   "obj": "plant.grass",
   "at": [-7.47, 11.12]
  },
  {
   "obj": "plant.grass",
   "at": [-2.88, 11.17]
  },
  {
   "obj": "plant.grass",
   "at": [-3.61, 11.21]
  },
  {
   "obj": "plant.grass",
   "at": [-6.58, 11.26]
  },
  {
   "obj": "plant.grass",
   "at": [-4.56, 11.44]
  },
  {
   "obj": "plant.grass",
   "at": [-5.57, 11.44]
  },
  {
   "obj": "plant.grass",
   "at": [-7.44, 11.51]
  },
  {
   "obj": "plant.grass",
   "at": [-4.67, 11.55]
  },
  {
   "obj": "plant.grass",
   "at": [-7.04, 11.7]
  },
  {
   "obj": "plant.grass",
   "at": [-5.34, 11.78]
  },
  {
   "obj": "plant.grass",
   "at": [-5.27, 11.82]
  },
  {
   "obj": "plant.grass",
   "at": [-7.95, 11.92]
  },
  {
   "obj": "plant.grass",
   "at": [-3.88, 11.93]
  },
  {
   "obj": "plant.grass",
   "at": [-6.8, 11.95]
  },
  {
   "obj": "plant.grass",
   "at": [-8.65, 11.95]
  },
  {
   "obj": "plant.grass",
   "at": [-3.64, 12.18]
  },
  {
   "obj": "plant.grass",
   "at": [-4.04, 12.29]
  },
  {
   "obj": "plant.grass",
   "at": [-4.17, 12.61]
  },
  {
   "obj": "plant.grass",
   "at": [-2.87, 12.61]
  },
  {
   "obj": "plant.grass",
   "at": [-3.7, 12.93]
  },
  {
   "obj": "plant.grass",
   "at": [-3.61, 12.94]
  },
  {
   "obj": "plant.grass",
   "at": [-3.19, 13.18]
  },
  {
   "obj": "plant.grass",
   "at": [-4.07, 13.49]
  },
  {
   "obj": "plant.grass",
   "at": [-3.8, 13.51]
  },
  {
   "obj": "plant.grass",
   "at": [-3.4, 14.56]
  },
  {
   "obj": "plant.grass",
   "at": [-3.63, 15.15]
  },
  {
   "obj": "plant.grass",
   "at": [-3.98, 15.24]
  },
  {
   "obj": "plant.grass",
   "at": [-3.09, 15.26]
  },
  {
   "obj": "plant.grass",
   "at": [-4.31, 15.83]
  },
  {
   "obj": "plant.grass",
   "at": [-3.53, 15.94]
  },
  {
   "obj": "plant.grass",
   "at": [-4.3, 16.93]
  },
  {
   "obj": "plant.grass",
   "at": [-3.8, 17.45]
  },
  {
   "obj": "plant.grass",
   "at": [-3.43, 17.98]
  },
  {
   "obj": "plant.grass",
   "at": [-4.38, 20.27]
  },
  {
   "obj": "plant.grass",
   "at": [-4.29, 20.73]
  },
  {
   "obj": "plant.grass",
   "at": [-4.37, 20.78]
  },
  {
   "obj": "plant.grass",
   "at": [-4.45, 21.26]
  },
  {
   "obj": "plant.grass",
   "at": [-3.68, 23.29]
  },
  {
   "obj": "plant.grass",
   "at": [-4.49, 23.39]
  },
  {
   "obj": "plant.grass",
   "at": [-3.4, 23.51]
  },
  {
   "obj": "plant.grass",
   "at": [-4.5, 24.32]
  },
  {
   "obj": "plant.grass",
   "at": [-4.6, 24.4]
  },
  {
   "obj": "plant.grass",
   "at": [-3.46, 25.63]
  },
  {
   "obj": "plant.grass",
   "at": [-3.7, 25.88]
  },
  {
   "obj": "plant.grass",
   "at": [-4.34, 28.14]
  },
  {
   "obj": "plant.grass",
   "at": [-4.71, 33.22]
  },
  {
   "cluster": "plant.grass",
   "on": "inbye-l",
   "n": 11,
   "seed": 956
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.85, 6.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.7, 6.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.82, 6.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.52, 6.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.16, 6.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.49, 6.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.72, 6.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.74, 6.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.83, 6.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.3, 6.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.67, 6.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.43, 6.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.19, 6.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.92, 6.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.91, 6.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.04, 6.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.83, 6.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.21, 6.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.76, 6.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.65, 6.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.79, 6.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.71, 6.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.64, 6.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.77, 6.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.91, 6.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.2, 6.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.68, 7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.79, 7.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.98, 7.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.9, 7.05]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.04, 7.05]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.54, 7.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.43, 7.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.71, 7.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.46, 7.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.99, 7.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.45, 7.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.38, 7.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.99, 7.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.1, 7.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.21, 7.33]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.41, 7.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.18, 7.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.11, 7.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.65, 7.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.34, 7.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.46, 7.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.41, 7.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.46, 7.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.81, 7.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.39, 7.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.45, 7.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.14, 7.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.95, 7.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.72, 7.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.96, 7.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.5, 7.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.13, 7.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.71, 7.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.17, 7.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.61, 7.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.88, 7.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.39, 7.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.49, 7.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.52, 7.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.77, 7.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.66, 7.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.66, 7.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.59, 7.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.11, 7.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.93, 7.87]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.88, 7.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.84, 7.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.51, 7.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.68, 7.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.14, 7.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.26, 7.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.9, 8.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.85, 8.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.63, 8.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.79, 8.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.98, 8.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.94, 8.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.18, 8.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.58, 8.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.95, 8.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.1, 8.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.71, 8.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.45, 8.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.51, 8.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.13, 8.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.27, 8.33]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.21, 8.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.09, 8.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.05, 8.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.92, 8.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.32, 8.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.79, 8.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.2, 8.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.02, 8.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.08, 8.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.45, 8.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.09, 8.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.09, 8.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.01, 8.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.44, 8.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.23, 8.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3, 8.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.02, 8.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.15, 8.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.22, 8.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.27, 8.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.8, 8.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.81, 8.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.43, 9.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.27, 9.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.47, 9.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.62, 9.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.74, 9.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.2, 9.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.26, 9.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.47, 9.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.82, 9.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.27, 9.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.21, 9.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.08, 9.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.84, 9.37]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.11, 9.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.31, 9.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.88, 9.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.99, 9.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.4, 9.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.26, 9.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.9, 9.55]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.77, 9.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.32, 9.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.95, 9.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.39, 9.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.14, 9.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.46, 9.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.75, 9.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.15, 9.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.68, 9.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.26, 9.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.9, 9.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.42, 9.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.05, 9.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.34, 9.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.39, 10.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.72, 10.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.22, 10.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.36, 10.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6, 10.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.24, 10.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.47, 10.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.49, 10.37]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.07, 10.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.87, 10.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.23, 10.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.88, 10.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.81, 10.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.19, 10.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.54, 10.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.49, 10.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.76, 10.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.84, 10.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.6, 10.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.97, 10.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.66, 10.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.23, 10.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.1, 10.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.9, 10.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.52, 10.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.87, 10.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.69, 10.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.69, 10.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.42, 10.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.77, 11.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.76, 11.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.12, 11.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.49, 11.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.16, 11.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.8, 11.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.77, 11.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.99, 11.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.93, 11.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.14, 11.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.52, 11.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.2, 11.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.32, 11.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.84, 11.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.89, 11.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.75, 11.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.69, 11.89]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.65, 11.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.44, 11.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.24, 11.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.76, 12.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.21, 12.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.55, 13.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.03, 13.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.89, 13.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.94, 13.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.89, 13.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.52, 13.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.57, 13.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.91, 14.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.4, 14.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.71, 14.33]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.9, 14.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.17, 14.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.49, 14.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.76, 14.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.03, 14.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.14, 14.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.06, 15.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.42, 15.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.01, 15.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.73, 15.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.37, 16.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.12, 18.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.27, 19.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.25, 20.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.18, 20.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.11, 21.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.64, 21.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.33, 23.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.55, 23.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.48, 23.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.61, 24.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.37, 26.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.48, 27.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.58, 31.25]
  },
  {
   "cluster": "plant.grass-long",
   "on": "inbye-l",
   "n": 9,
   "seed": 4767
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.33, 6.59]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.38, 6.68]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-2.71, 6.82]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.79, 6.85]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.84, 6.85]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.16, 7.26]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.67, 7.27]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.23, 7.32]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.05, 7.37]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.19, 7.81]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.23, 7.83]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-2.92, 7.88]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.2, 7.94]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.74, 8.09]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.84, 8.11]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.84, 8.36]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.98, 8.38]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.47, 8.6]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.94, 8.62]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.94, 8.68]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.1, 8.82]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-6.3, 8.82]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.49, 8.84]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.95, 8.85]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.7, 8.99]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.54, 9.07]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.07, 9.14]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.35, 9.26]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.58, 9.48]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.16, 9.48]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.84, 9.6]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-7.43, 10.11]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.37, 10.24]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.17, 10.27]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.18, 10.38]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.3, 10.85]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.92, 10.96]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.49, 10.97]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.38, 11.11]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-2.8, 11.18]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.3, 11.71]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.48, 11.72]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.55, 11.73]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.56, 12.47]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.01, 13.67]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.19, 14.65]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.14, 15.81]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.35, 20.45]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.46, 20.76]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.13, 22.11]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.7, 22.5]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-3.81, 33.66]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-4.45, 51.82]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-18.56, 67.91]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-52.67, 83.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.73, 5.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.42, 6.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.39, 6.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.2, 6.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.02, 6.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.96, 6.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2, 6.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.71, 6.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.38, 6.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.25, 6.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.79, 6.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.67, 6.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.37, 6.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.91, 6.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.24, 6.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [0, 6.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.35, 6.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.5, 6.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.06, 6.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.82, 6.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.84, 7.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.69, 7.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.94, 7.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.56, 7.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.01, 7.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.65, 7.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.34, 7.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.85, 7.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.56, 7.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.41, 7.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.44, 7.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.27, 7.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.25, 7.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.71, 7.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.57, 7.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.73, 7.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.5, 7.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.2, 7.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.86, 8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.66, 8.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.1, 8.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.39, 8.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.54, 8.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.49, 8.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.38, 8.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.04, 8.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.36, 8.54]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.95, 8.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.13, 8.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.33, 8.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.67, 8.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.48, 8.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.42, 8.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.28, 9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.6, 9.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.81, 9.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.45, 9.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2, 9.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.68, 9.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.93, 9.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.01, 9.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.48, 9.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.2, 9.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.23, 9.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.24, 9.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.39, 9.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.99, 9.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.12, 9.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.62, 9.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.19, 10.02]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.98, 10.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.97, 10.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.93, 10.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.81, 10.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.5, 10.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.42, 10.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.78, 10.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.01, 10.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.24, 10.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.86, 10.87]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.46, 11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.97, 11.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.16, 11.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.47, 11.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.86, 11.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.25, 11.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.07, 11.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.52, 11.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.51, 11.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.15, 12]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.96, 12.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.59, 12.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.14, 12.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.69, 13.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.59, 13.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.05, 14.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.32, 14.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.58, 14.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.83, 15.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.02, 15.94]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.3, 16.05]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.71, 16.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.53, 17.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.59, 18.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.08, 18.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.21, 19.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.79, 20.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.69, 21.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.48, 22.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.39, 23.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.34, 24.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.1, 24.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.94, 25.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.92, 25.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.44, 28.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.14, 29.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.17, 31.79]
  },
  {
   "cluster": "plant.grass-long",
   "on": "verge-l",
   "n": 5,
   "seed": 6586
  },
  {
   "obj": "structure.field-gate",
   "at": [8.36, 64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7, 12.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.55, 13.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.27, 13.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.36, 13.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.28, 13.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.77, 16.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.84, 17.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.51, 17.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.12, 18.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.3, 18.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.8, 19.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.73, 19.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.8, 19.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.92, 20.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.26, 21.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.95, 22.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.82, 22.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.12, 22.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.67, 24.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.75, 24.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.61, 24.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.4, 26.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-16.06, 26.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.21, 26.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.43, 27.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.36, 27.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.01, 27.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.52, 28.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [-20.34, 28.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-18.02, 28.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.25, 29.33]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.01, 30.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.12, 30.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.76, 31.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-22.8, 31.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.86, 32.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.53, 32.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.52, 32.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.81, 32.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.76, 32.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.55, 32.8]
  },
  {
   "obj": "plant.grass-long",
   "at": [-20.22, 33.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [-10.71, 34.87]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.19, 34.9]
  },
  {
   "cluster": "plant.grass-long",
   "on": "sheep-l",
   "n": 88,
   "seed": 6159
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-14.7, 23.4]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-13.24, 23.5]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-5.85, 24.15]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-16.3, 25.76]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-13, 25.91]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-14.21, 27.26]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-17.93, 28.05]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-19.6, 30.95]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-23.09, 31.21]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-13.06, 31.78]
  },
  {
   "obj": "plant.yc-cotton-grass",
   "at": [-7.41, 33.02]
  },
  {
   "cluster": "plant.yc-cotton-grass",
   "on": "sheep-l",
   "n": 21,
   "seed": 7554
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.62, 13.65]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.84, 20.66]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.83, 21.06]
  },
  {
   "cluster": "plant.wildflowers",
   "on": "sheep-l",
   "n": 5,
   "seed": 1111
  },
  {
   "obj": "plant.grass",
   "at": [-9.24, 14.05]
  },
  {
   "obj": "plant.grass",
   "at": [-7.65, 14.85]
  },
  {
   "obj": "plant.grass",
   "at": [-11.15, 16.61]
  },
  {
   "obj": "plant.grass",
   "at": [-15.54, 25.11]
  },
  {
   "obj": "plant.grass",
   "at": [-17.43, 25.22]
  },
  {
   "obj": "plant.grass",
   "at": [-18.48, 26.29]
  },
  {
   "obj": "plant.grass",
   "at": [-16.9, 27.43]
  },
  {
   "obj": "plant.grass",
   "at": [-11.04, 32.87]
  },
  {
   "obj": "plant.grass",
   "at": [-8.29, 34.12]
  },
  {
   "obj": "plant.grass",
   "at": [-11.46, 34.94]
  },
  {
   "cluster": "plant.grass",
   "on": "sheep-l",
   "n": 25,
   "seed": 5947
  },
  {
   "obj": "plant.grass",
   "at": [0.28, 6.42]
  },
  {
   "obj": "plant.grass",
   "at": [-1.85, 6.42]
  },
  {
   "obj": "plant.grass",
   "at": [-0.74, 6.44]
  },
  {
   "obj": "plant.grass",
   "at": [-1.63, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [-2.35, 6.51]
  },
  {
   "obj": "plant.grass",
   "at": [0.62, 6.52]
  },
  {
   "obj": "plant.grass",
   "at": [-0.31, 6.56]
  },
  {
   "obj": "plant.grass",
   "at": [1.5, 6.66]
  },
  {
   "obj": "plant.grass",
   "at": [-1.21, 6.69]
  },
  {
   "obj": "plant.grass",
   "at": [-1.58, 6.74]
  },
  {
   "obj": "plant.grass",
   "at": [-1.08, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [1.7, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [-0.18, 6.84]
  },
  {
   "obj": "plant.grass",
   "at": [0.16, 7.03]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 7.13]
  },
  {
   "obj": "plant.grass",
   "at": [1.77, 7.16]
  },
  {
   "obj": "plant.grass",
   "at": [-0.73, 7.16]
  },
  {
   "obj": "plant.grass",
   "at": [0.42, 7.16]
  },
  {
   "obj": "plant.grass",
   "at": [-0.13, 7.2]
  },
  {
   "obj": "plant.grass",
   "at": [-2.25, 7.25]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 7.29]
  },
  {
   "obj": "plant.grass",
   "at": [-0.6, 7.3]
  },
  {
   "obj": "plant.grass",
   "at": [-0.29, 7.31]
  },
  {
   "obj": "plant.grass",
   "at": [0.21, 7.41]
  },
  {
   "obj": "plant.grass",
   "at": [1.18, 7.44]
  },
  {
   "obj": "plant.grass",
   "at": [0.97, 7.55]
  },
  {
   "obj": "plant.grass",
   "at": [-1.99, 7.55]
  },
  {
   "obj": "plant.grass",
   "at": [1.61, 7.82]
  },
  {
   "obj": "plant.grass",
   "at": [0.91, 7.84]
  },
  {
   "obj": "plant.grass",
   "at": [1.22, 7.88]
  },
  {
   "obj": "plant.grass",
   "at": [-0.09, 7.92]
  },
  {
   "obj": "plant.grass",
   "at": [-1.75, 7.95]
  },
  {
   "obj": "plant.grass",
   "at": [0.1, 8.07]
  },
  {
   "obj": "plant.grass",
   "at": [1.07, 8.09]
  },
  {
   "obj": "plant.grass",
   "at": [-0.43, 8.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.21, 8.42]
  },
  {
   "obj": "plant.grass",
   "at": [0.2, 8.48]
  },
  {
   "obj": "plant.grass",
   "at": [0.79, 8.6]
  },
  {
   "obj": "plant.grass",
   "at": [-1.14, 8.75]
  },
  {
   "obj": "plant.grass",
   "at": [1.16, 9.23]
  },
  {
   "obj": "plant.grass",
   "at": [1.49, 9.31]
  },
  {
   "obj": "plant.grass",
   "at": [-0.74, 9.5]
  },
  {
   "obj": "plant.grass",
   "at": [-2.47, 9.58]
  },
  {
   "obj": "plant.grass",
   "at": [-0.24, 9.63]
  },
  {
   "obj": "plant.grass",
   "at": [0.58, 10.09]
  },
  {
   "obj": "plant.grass",
   "at": [-1.25, 10.15]
  },
  {
   "obj": "plant.grass",
   "at": [-0.34, 10.22]
  },
  {
   "obj": "plant.grass",
   "at": [0.24, 10.25]
  },
  {
   "obj": "plant.grass",
   "at": [-0.7, 10.34]
  },
  {
   "obj": "plant.grass",
   "at": [1.3, 10.4]
  },
  {
   "obj": "plant.grass",
   "at": [-1.16, 10.66]
  },
  {
   "obj": "plant.grass",
   "at": [1.56, 10.67]
  },
  {
   "obj": "plant.grass",
   "at": [1.22, 10.98]
  },
  {
   "obj": "plant.grass",
   "at": [-2.03, 11.28]
  },
  {
   "obj": "plant.grass",
   "at": [-0.59, 11.6]
  },
  {
   "obj": "plant.grass",
   "at": [1.61, 11.72]
  },
  {
   "obj": "plant.grass",
   "at": [-1.8, 12.03]
  },
  {
   "obj": "plant.grass",
   "at": [0.22, 12.12]
  },
  {
   "obj": "plant.grass",
   "at": [1.4, 12.13]
  },
  {
   "obj": "plant.grass",
   "at": [-1.38, 12.73]
  },
  {
   "obj": "plant.grass",
   "at": [0.42, 13.09]
  },
  {
   "obj": "plant.grass",
   "at": [1.35, 13.45]
  },
  {
   "obj": "plant.grass",
   "at": [-1.88, 14.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.23, 14.21]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 15.75]
  },
  {
   "obj": "plant.grass",
   "at": [1.22, 17.22]
  },
  {
   "obj": "plant.grass",
   "at": [-0.27, 17.43]
  },
  {
   "obj": "plant.grass",
   "at": [1.1, 19.07]
  },
  {
   "obj": "plant.grass",
   "at": [-1.02, 20.57]
  },
  {
   "obj": "plant.grass",
   "at": [-1.67, 20.6]
  },
  {
   "obj": "plant.grass",
   "at": [0.74, 21.16]
  },
  {
   "obj": "plant.grass",
   "at": [-2.19, 21.31]
  },
  {
   "obj": "plant.grass",
   "at": [0.26, 21.37]
  },
  {
   "obj": "plant.grass",
   "at": [0.61, 24.68]
  },
  {
   "obj": "plant.grass",
   "at": [-2.65, 25.32]
  },
  {
   "obj": "plant.grass",
   "at": [-2.62, 32.1]
  },
  {
   "obj": "plant.grass",
   "at": [-2.07, 33.69]
  },
  {
   "obj": "plant.grass",
   "at": [-1.61, 43.25]
  },
  {
   "obj": "plant.grass",
   "at": [-2.66, 45.11]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.05, 6.48]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.14, 6.58]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.9, 6.71]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.85, 6.71]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.25, 6.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.86, 6.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.17, 6.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.84, 6.87]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.8, 6.99]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.67, 7.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.74, 7.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.22, 7.06]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.01, 7.22]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.82, 7.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.14, 7.36]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.54, 7.48]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.92, 7.53]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.48, 7.63]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.72, 7.76]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.24, 7.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.77, 7.97]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.97, 8.04]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.93, 8.07]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.2, 8.47]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.35, 8.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.44, 8.76]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.05, 8.9]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.85, 8.95]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.24, 9.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.14, 9.15]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.42, 9.16]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.61, 9.17]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.64, 9.25]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.1, 9.31]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.87, 9.58]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.95, 9.87]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.95, 10.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.83, 10.6]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.4, 10.67]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.87, 10.79]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.98, 10.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.61, 10.92]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.03, 10.93]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.64, 10.97]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.47, 11.18]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.91, 11.67]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.83, 11.85]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.88, 12.15]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.13, 12.6]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.51, 13.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.94, 15.26]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.89, 24.57]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-3.98, 34.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.24, 18.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.17, 25.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.86, 33.24]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.57, 6.44]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.8, 6.47]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.31, 6.52]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.13, 6.53]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.95, 6.68]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.64, 6.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [1.45, 6.91]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.44, 7.29]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.63, 7.51]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.08, 7.53]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.44, 7.89]
  },
  {
   "obj": "plant.wildflowers",
   "at": [0.59, 8.01]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.43, 10.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.68, 11.07]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.04, 13.9]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-2.13, 13.95]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-0.87, 14.18]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.44, 22.42]
  }],
 "landmarks": [{
   "obj": "landmark.shp-round-house",
   "at": [17, 46],
   "src": "https://www.sbg.org.uk/"
  }],
 "life": [{
   "who": "cyclists",
   "on": "road",
   "rate": "1/1min",
   "mix": {
    "cyclist": 0.75,
    "cyclist-commuter": 0.25
   }
  },
  {
   "who": "walkers",
   "rate": "1/2min",
   "mix": {
    "hiker": 0.5,
    "dog-walker": 0.33,
    "stroll": 0.17
   }
  }],
 "backdrop": {
  "style": "city-sheffield-hills"
 },
 "seed": 1
});
})();
