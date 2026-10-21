/* ============================================================
   WORLD SCENE (format v3) world-test / norfolk-reepham-whitwell-w3: converted by `node tools/world.mjs convert uk-east-reepham/norfolk-reepham-whitwell`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (35):
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
     - entities[22].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[23].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[28].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[30].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[35].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[36].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[77].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[87].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[98].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[145].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[240].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[242].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[245].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[246].at: repair: removed (badAttach) plant.rph-short-grass stands on the rail line
     - entities[349].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[363].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[367].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[377].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[407].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[429].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[441].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[451].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[455].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[461].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[467].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[476].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[507].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[508].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[509].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[510].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[512].at: repair: removed (badAttach) plant.rph-rosette stands on the rail line
     - entities[569].at: repair: removed (badAttach) plant.wildflowers stands on the rail line
     - entities[579].at: repair: removed (badAttach) plant.wildflowers stands on the rail line
     - entities[580].at: repair: removed (badAttach) plant.wildflowers stands on the rail line
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"norfolk-reepham-whitwell-w3","label":"Whitwell & Reepham Railway, Reepham","site":"The heritage yard from the south platform","tags":["uk","norfolk","reepham","heritage","world-v3"],"liveSky":{"lat":52.7515,"lon":1.0978},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 52.7515,
  "lon": 1.0978,
  "region": "norfolk"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 475,
  "heading": 11,
  "x0": 680
 },
 "surfaces": [{
   "id": "grass",
   "kind": "grass",
   "poly": [[-3.5, 4.3],
    [3.5, 4.3],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "track",
   "kind": "rail",
   "path": [[-2, 4],
    [-2, 15],
    [-3, 36],
    [-6, 75],
    [-11, 160]],
   "width": 4
  },
  {
   "id": "siding",
   "kind": "rail",
   "path": [[-6, 15],
    [-6, 30],
    [-12, 65],
    [-14, 100]],
   "width": 3
  },
  {
   "id": "platform",
   "kind": "plaza",
   "poly": [[-0.6, 4],
    [7, 4],
    [17, 75],
    [-2, 110],
    [-4, 100],
    [0, 35]]
  }],
 "entities": [{
   "obj": "rail.rph-whitwell",
   "at": [-6, 23],
   "facing": 0
  },
  {
   "obj": "street.bench",
   "at": [5, 21],
   "facing": 270
  },
  {
   "obj": "street.lamp",
   "at": [7.8, 31],
   "variant": 0
  },
  {
   "obj": "plant.rph-flower-tub",
   "at": [5.8, 8],
   "variant": 2
  },
  {
   "obj": "street.rph-rail-lantern",
   "at": [4.3, 6.8]
  },
  {
   "obj": "street.rph-platform-fence",
   "at": [9, 13]
  },
  {
   "obj": "street.rph-platform-fence",
   "at": [10, 24]
  },
  {
   "obj": "tree.rph-canal-oak",
   "at": [-15, 23],
   "variant": 1
  },
  {
   "obj": "tree.pool-birch",
   "at": [17, 28],
   "variant": 2
  },
  {
   "obj": "tree.rph-bank-oak",
   "at": [26, 70],
   "variant": 0
  },
  {
   "obj": "tree.rph-bank-oak",
   "at": [-29, 87],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [7.4, 38],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [8, 44],
   "variant": 2
  },
  {
   "cluster": "tree.rph-pool-birch",
   "on": "grass",
   "n": 19,
   "seed": 4551
  },
  {
   "cluster": "tree.rph-wyv-far-oak",
   "on": "grass",
   "n": 27,
   "seed": 2208
  },
  {
   "cluster": "tree.rph-wyv-far-sallow",
   "on": "grass",
   "n": 12,
   "seed": 4530
  },
  {
   "obj": "plant.grass-long",
   "at": [8.86, 10.21]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.1, 16.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.4, 24.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [33.27, 44.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [-19.45, 48.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [30.92, 59.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.07, 6.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.05, 6.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.04, 6.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.19, 6.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.14, 6.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.13, 6.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.16, 6.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.26, 6.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.25, 6.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.11, 6.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.09, 6.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.38, 6.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.1, 6.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.5, 6.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.18, 6.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.48, 6.71]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.35, 6.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.3, 6.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.42, 6.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.22, 6.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.33, 6.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.05, 6.84]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.43, 6.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.15, 6.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.12, 6.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.02, 6.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.11, 6.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.69, 7.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.19, 7.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.64, 7.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.28, 7.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.25, 7.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.59, 7.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.13, 7.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.46, 7.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.37, 7.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.01, 7.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.74, 7.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.6, 7.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.7, 7.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.82, 7.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.17, 7.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.77, 7.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.22, 7.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.5, 7.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.1, 7.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.6, 7.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.04, 7.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.69, 7.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.75, 7.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.03, 7.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.21, 7.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.93, 7.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.7, 7.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.35, 7.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.47, 7.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.81, 7.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.16, 7.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.69, 7.51]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.65, 7.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.1, 7.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.03, 7.58]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.38, 7.58]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.07, 7.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.07, 7.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.12, 7.6]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.44, 7.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.03, 7.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.88, 7.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.3, 7.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.11, 7.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.79, 7.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.18, 7.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.38, 7.76]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.63, 7.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.51, 7.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.48, 7.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.62, 7.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.96, 7.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.16, 7.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.93, 7.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.01, 7.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.21, 7.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.5, 7.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.28, 7.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.84, 7.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.93, 8.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.03, 8.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.62, 8.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.15, 8.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.21, 8.1]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.75, 8.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.29, 8.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.83, 8.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.46, 8.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.42, 8.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.32, 8.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.38, 8.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.98, 8.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.1, 8.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.91, 8.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.07, 8.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.75, 8.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.01, 8.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.11, 8.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.56, 8.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.82, 8.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5, 8.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.36, 8.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.69, 8.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.44, 8.38]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.55, 8.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.27, 8.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.51, 8.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.83, 8.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.36, 8.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.13, 8.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.6, 8.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.46, 8.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.95, 8.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.19, 8.46]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.15, 8.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.31, 8.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.69, 8.51]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.11, 8.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.83, 8.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.12, 8.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.97, 8.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.45, 8.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.53, 8.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.35, 8.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.73, 8.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.29, 8.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.26, 8.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.55, 8.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.98, 8.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.45, 8.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.63, 8.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.08, 8.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.95, 8.77]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.85, 8.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.07, 8.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.52, 8.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.77, 8.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.18, 8.84]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.96, 8.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.44, 8.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.11, 8.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.7, 8.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.84, 8.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.88, 8.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.64, 8.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.46, 8.99]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.98, 9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.13, 9.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.06, 9.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.24, 9.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.48, 9.06]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.91, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.17, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.81, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.85, 9.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.1, 9.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.74, 9.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.05, 9.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.98, 9.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.47, 9.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.1, 10.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.32, 10.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.11, 10.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.77, 10.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.52, 10.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.83, 10.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.67, 10.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7, 10.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.46, 10.51]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.34, 10.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.54, 10.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5, 10.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.58, 10.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.87, 11.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.53, 11.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.67, 11.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.49, 11.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.26, 11.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.82, 11.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.52, 11.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.35, 11.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.28, 11.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.59, 11.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.1, 12.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.15, 12.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.69, 12.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.64, 12.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.49, 12.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.91, 12.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.05, 12.63]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.02, 12.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.3, 12.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.24, 13.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.62, 13.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.26, 13.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.94, 13.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.22, 13.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.65, 13.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.34, 13.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.13, 13.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.03, 13.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.05, 13.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.54, 14.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.95, 14.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.42, 14.71]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.87, 14.74]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.53, 14.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.14, 14.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.6, 15.08]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.34, 15.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.65, 15.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.22, 15.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.59, 15.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.01, 15.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.81, 15.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.76, 15.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.06, 15.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.5, 15.76]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.17, 15.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.47, 15.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.16, 16.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.98, 16.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-8.11, 16.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.64, 16.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.52, 16.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.65, 16.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.05, 16.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.1, 17.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.97, 17.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.17, 17.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.52, 17.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.55, 17.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.05, 17.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.92, 17.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.09, 17.84]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-10.75, 17.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.04, 17.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.54, 18.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.29, 18.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.22, 18.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.99, 18.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.95, 18.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [15.2, 18.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.9, 18.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.13, 18.85]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [16.49, 19.14]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.78, 19.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.61, 19.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [16.26, 19.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.11, 19.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-11.53, 20.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.4, 20.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [15.31, 21.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [16.16, 21.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.71, 21.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.51, 21.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.44, 21.73]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.25, 22.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.35, 22.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [19.45, 22.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [18.17, 22.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.98, 23.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [15.45, 23.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.59, 23.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [20.88, 24.4]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [19.4, 24.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [16.92, 24.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [18.88, 25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.61, 25.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.81, 25.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-13.44, 25.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.48, 25.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [20.05, 26.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-17.66, 26.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.26, 26.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.62, 26.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-13.42, 27.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [21.83, 27.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-15.09, 28.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-17.35, 28.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [14.25, 28.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [10.97, 28.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [23.3, 28.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-16.42, 29.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [11.05, 29.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [25.53, 30.23]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.93, 30.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [12.53, 30.62]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [22.41, 31.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.49, 31.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [24.3, 31.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [18.97, 31.57]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [27.66, 31.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-12.13, 32.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.07, 33.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-19.44, 33.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [20.81, 33.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [16.56, 33.51]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [17.99, 33.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [13.23, 33.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [22.58, 34.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [25.71, 34.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-17.05, 34.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-15.65, 34.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-22.79, 34.94]
  },
  {
   "cluster": "plant.rph-short-grass",
   "on": "grass",
   "n": 26,
   "seed": 966
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.1, 6.09]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.04, 6.25]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.12, 6.39]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.08, 6.42]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.02, 6.44]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.35, 6.48]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.27, 6.49]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.24, 6.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.36, 6.53]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.05, 6.56]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.16, 6.56]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.22, 6.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.28, 6.6]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.41, 6.69]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.22, 6.69]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.09, 6.72]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.04, 6.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.28, 6.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.61, 6.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.58, 6.85]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.53, 6.87]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.5, 6.92]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.25, 6.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.44, 6.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.62, 6.96]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.41, 6.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.03, 7.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.48, 7.04]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.36, 7.04]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.18, 7.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.55, 7.18]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.28, 7.18]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.06, 7.18]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.51, 7.26]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.28, 7.27]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.43, 7.33]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.48, 7.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.82, 7.4]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.99, 7.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.39, 7.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.22, 7.48]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.92, 7.49]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.6, 7.51]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.14, 7.55]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.92, 7.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.5, 7.59]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.62, 7.62]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.58, 7.62]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.37, 7.65]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.72, 7.69]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.86, 7.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.82, 7.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.54, 7.71]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.08, 7.74]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.25, 7.77]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.7, 7.78]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.18, 7.79]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5, 7.79]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.76, 7.8]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.85, 7.86]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.11, 7.87]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.1, 7.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.29, 7.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.36, 7.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.03, 7.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.43, 7.92]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.57, 7.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.25, 7.94]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.77, 7.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.08, 7.96]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.72, 7.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.35, 7.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.27, 8]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.27, 8.07]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.48, 8.08]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.19, 8.08]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.13, 8.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.13, 8.13]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.46, 8.14]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.58, 8.14]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.43, 8.18]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.69, 8.23]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.24, 8.25]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.18, 8.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.41, 8.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.59, 8.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.64, 8.36]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.97, 8.36]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.38, 8.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.56, 8.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.37, 8.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.69, 8.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.24, 8.53]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.14, 8.54]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.33, 8.56]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.77, 8.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.1, 8.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.61, 8.62]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.67, 8.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.62, 8.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.34, 8.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.49, 8.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.81, 8.74]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.27, 8.77]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.17, 8.8]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.24, 8.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.67, 8.87]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.96, 8.88]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.16, 8.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.33, 8.91]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.54, 8.96]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.32, 8.97]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.81, 8.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.53, 8.98]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.41, 9.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.1, 9.02]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.3, 9.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.69, 9.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.28, 9.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.33, 9.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.65, 9.07]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.65, 9.07]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.1, 9.09]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.58, 10.05]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.52, 10.06]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.06, 10.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.96, 10.49]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.67, 10.61]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.48, 10.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.16, 10.69]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [8.81, 10.72]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.36, 10.76]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.21, 11.32]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.03, 11.58]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.86, 11.81]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.46, 12.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.09, 12.3]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.09, 12.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.49, 12.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.68, 13.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-6.1, 13.3]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.45, 13.42]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [11.18, 13.59]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.02, 13.67]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.73, 13.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.45, 13.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.51, 14.52]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.29, 14.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.77, 14.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.3, 15.1]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.71, 15.27]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [8.99, 15.27]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.28, 15.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.38, 15.53]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [10.99, 15.56]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [13.84, 16.2]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.13, 16.31]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [11.89, 16.47]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.67, 16.66]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-7.62, 16.86]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [10.28, 16.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.54, 17.04]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-8.96, 17.6]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [10.31, 17.86]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.72, 17.89]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-10.55, 18.22]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [12.55, 18.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.32, 18.64]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-11.78, 18.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-10.56, 19.22]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.43, 19.64]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [11.94, 19.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [9.67, 20.57]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [16.68, 21.16]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [16.95, 21.88]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [18.31, 22.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.15, 22.4]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [18.21, 24.83]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [15.34, 25.06]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-12.49, 25.19]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-14.87, 26.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [21.28, 26.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-16.54, 26.16]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [15.4, 26.34]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [22.46, 27.09]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-12.14, 28.66]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [18.92, 29.14]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [13.27, 29.2]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-9.68, 30.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-10.8, 30.8]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-19.53, 31.16]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [21.59, 31.22]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-18.79, 31.39]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [14.24, 33.03]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [20.98, 33.08]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-11.24, 34.11]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-17.78, 34.37]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-23.11, 34.79]
  },
  {
   "cluster": "plant.rph-rosette",
   "on": "grass",
   "n": 10,
   "seed": 2862
  },
  {
   "obj": "plant.wildflowers",
   "at": [8.29, 10]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.36, 10.2]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-6.07, 10.25]
  },
  {
   "obj": "plant.wildflowers",
   "at": [8.09, 10.31]
  },
  {
   "obj": "plant.wildflowers",
   "at": [9.13, 10.69]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.17, 11.57]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.56, 12.05]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.29, 12.37]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.15, 12.47]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.54, 13.11]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-5.68, 13.17]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-8.01, 13.29]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-7.11, 13.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [9.13, 16.64]
  },
  {
   "obj": "plant.wildflowers",
   "at": [11.27, 16.73]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.26, 16.83]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-10.09, 17.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [15.28, 18.41]
  },
  {
   "obj": "plant.wildflowers",
   "at": [12.55, 19.31]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.24, 21.12]
  },
  {
   "obj": "plant.wildflowers",
   "at": [11.52, 22.04]
  },
  {
   "obj": "plant.wildflowers",
   "at": [16.88, 22.67]
  },
  {
   "obj": "plant.wildflowers",
   "at": [13.76, 23.02]
  },
  {
   "obj": "plant.wildflowers",
   "at": [19.53, 23.39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [17.5, 24.48]
  },
  {
   "obj": "plant.wildflowers",
   "at": [13.61, 25.77]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.54, 25.82]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.88, 28.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [20.52, 29.18]
  },
  {
   "obj": "plant.wildflowers",
   "at": [19.95, 29.41]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.09, 29.9]
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.86, 30.72]
  },
  {
   "obj": "plant.wildflowers",
   "at": [27.66, 33.51]
  },
  {
   "obj": "plant.wildflowers",
   "at": [24.83, 33.66]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-21.98, 34.31]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-21.15, 34.66]
  },
  {
   "obj": "plant.wildflowers",
   "at": [16.44, 35.07]
  }],
 "life": [{
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/2min",
   "on": "platform"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "platform"
  }],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
