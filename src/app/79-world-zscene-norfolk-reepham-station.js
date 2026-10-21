/* ============================================================
   WORLD SCENE (format v3) world-test / norfolk-reepham-station-w3: converted by `node tools/world.mjs convert uk-east-reepham/norfolk-reepham-station`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (6):
     - place[0]: landmark landmark.rph-station-perspective: src is a placeholder; give the listing or map reference
     - place[22]: tree.rph-wyv-far-sallow: variant 2 does not exist; dropped the variant
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
     - entities[17].y: repair: removed (missingField) air needs y (metres above the ground)
     - landmarks[0]: repair: removed (blocksPath) landmark.rph-station-perspective covers the whole width of trail
     - life[0]: repair: removed (unreachable) cyclists lives on the drive layer and the scene has no surface for it
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"norfolk-reepham-station-w3","label":"Former Reepham station, Reepham","site":"Marriott's Way past the former station and platform","tags":["uk","norfolk","reepham","heritage","world-v3"],"liveSky":{"lat":52.7681,"lon":1.1151},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 52.7681,
  "lon": 1.1151,
  "region": "norfolk"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 490,
  "heading": 270,
  "x0": 800
 },
 "surfaces": [{
   "id": "verge",
   "kind": "grass",
   "poly": [[-3.6, 4.5],
    [3.6, 4.5],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "trail",
   "kind": "path",
   "path": [[0.6, 4.7],
    [1.2, 10],
    [1.1, 18],
    [0.3, 32],
    [-0.8, 60],
    [-2, 115],
    [-3.5, 210]],
   "width": 1.65
  },
  {
   "id": "platform",
   "kind": "plaza",
   "poly": [[-6.77, 9],
    [-2.87, 9],
    [-4.57, 77],
    [-11.87, 77]]
  },
  {
   "id": "wood-left",
   "kind": "grass",
   "poly": [[-36, 36],
    [-13, 36],
    [-5.5, 80],
    [-6, 220],
    [-72, 220]]
  },
  {
   "id": "wood-right",
   "kind": "grass",
   "poly": [[6, 24],
    [34, 24],
    [74, 220],
    [5, 220]]
  },
  {
   "id": "station",
   "kind": "plaza",
   "poly": [[-12.3, 27.5],
    [-4.6, 27.5],
    [-4.6, 62.5],
    [-12.3, 62.5]]
  },
  {
   "id": "hedgerow-1",
   "kind": "hedge",
   "path": [[20.06, 33.03],
    [20.63, 37.49]],
   "width": 1.2,
   "obj": "plant.towpath-hedge"
  },
  {
   "id": "hedgerow-2",
   "kind": "hedge",
   "path": [[16.36, 58.84],
    [16.62, 65]],
   "width": 1.2,
   "obj": "plant.towpath-hedge"
  },
  {
   "id": "hedgerow-3",
   "kind": "hedge",
   "path": [[23.91, 69.28],
    [26.33, 75.58]],
   "width": 1.2,
   "obj": "plant.towpath-hedge"
  }],
 "entities": [{
   "obj": "structure.rph-platform-perspective-0",
   "at": [-2.87, 9]
  },
  {
   "obj": "structure.rph-platform-perspective-1",
   "at": [-2.97, 13]
  },
  {
   "obj": "structure.rph-platform-perspective-2",
   "at": [-3.07, 17]
  },
  {
   "obj": "structure.rph-platform-perspective-3",
   "at": [-3.17, 21]
  },
  {
   "obj": "structure.rph-platform-perspective-4",
   "at": [-3.27, 25]
  },
  {
   "obj": "structure.rph-platform-perspective-5",
   "at": [-3.37, 29]
  },
  {
   "obj": "structure.rph-platform-perspective-6",
   "at": [-3.47, 33]
  },
  {
   "obj": "structure.rph-platform-perspective-7",
   "at": [-3.57, 37]
  },
  {
   "obj": "structure.rph-platform-perspective-8",
   "at": [-3.67, 41]
  },
  {
   "obj": "structure.rph-platform-perspective-9",
   "at": [-3.77, 45]
  },
  {
   "obj": "structure.rph-platform-perspective-10",
   "at": [-3.87, 49]
  },
  {
   "obj": "structure.rph-platform-perspective-11",
   "at": [-3.97, 53]
  },
  {
   "obj": "structure.rph-platform-perspective-12",
   "at": [-4.07, 57]
  },
  {
   "obj": "structure.rph-platform-perspective-13",
   "at": [-4.17, 61]
  },
  {
   "obj": "structure.rph-platform-perspective-14",
   "at": [-4.28, 65]
  },
  {
   "obj": "structure.rph-platform-perspective-15",
   "at": [-4.37, 69]
  },
  {
   "obj": "structure.rph-platform-perspective-16",
   "at": [-4.47, 73]
  },
  {
   "obj": "tree.rph-canal-oak",
   "at": [12, 18],
   "variant": 2
  },
  {
   "obj": "tree.rph-pool-birch",
   "at": [-16, 37],
   "variant": 2
  },
  {
   "obj": "tree.rph-canal-oak",
   "at": [10, 35],
   "variant": 1
  },
  {
   "obj": "tree.rph-wyv-far-sallow",
   "at": [-11, 74]
  },
  {
   "obj": "tree.rph-wyv-far-oak",
   "at": [9, 70],
   "variant": 1
  },
  {
   "obj": "tree.rph-pool-birch",
   "at": [-9, 102],
   "variant": 1
  },
  {
   "obj": "plant.fern",
   "at": [-2, 5.9],
   "variant": 1
  },
  {
   "obj": "plant.bracken",
   "at": [3, 5.8],
   "variant": 2
  },
  {
   "obj": "plant.fern",
   "at": [4.2, 7.2],
   "variant": 0
  },
  {
   "obj": "bird.pigeon",
   "at": [2.7, 28],
   "variant": 1
  },
  {
   "obj": "bird.pigeon",
   "at": [2.5, 39],
   "variant": 2
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [6.06, 42.1]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [-34.65, 51.91]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [-16.17, 62.53]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [-32.37, 69.05]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [-41.77, 81.2]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [35.09, 90.81]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [42.72, 92.58]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [40.56, 99.62]
  },
  {
   "obj": "plant.towpath-hedge",
   "at": [48.79, 102.95]
  },
  {
   "obj": "plant.hedge",
   "at": [-39.65, 62.19]
  },
  {
   "cluster": "tree.rph-wyv-far-oak",
   "on": "wood-left",
   "n": 9,
   "seed": 5246
  },
  {
   "cluster": "tree.rph-pool-birch",
   "on": "wood-left",
   "n": 4,
   "seed": 5709
  },
  {
   "obj": "tree.rph-wyv-far-sallow",
   "at": [-27.31, 105.28]
  },
  {
   "obj": "tree.rph-wyv-far-sallow",
   "at": [-52.56, 153.84]
  },
  {
   "cluster": "tree.rph-wyv-far-oak",
   "on": "wood-right",
   "n": 10,
   "seed": 2343
  },
  {
   "obj": "tree.rph-wyv-far-sallow",
   "at": [41.57, 145.13]
  },
  {
   "cluster": "tree.rph-pool-birch",
   "on": "wood-right",
   "n": 4,
   "seed": 257
  },
  {
   "obj": "structure.rph-platform-perspective-16",
   "at": [-4.47, 73]
  },
  {
   "obj": "plant.bracken",
   "at": [-23.86, 45.02]
  },
  {
   "obj": "plant.bracken",
   "at": [-31.04, 47.72]
  },
  {
   "obj": "plant.bracken",
   "at": [-28.62, 69.91]
  },
  {
   "obj": "plant.fern",
   "at": [-19.59, 54.9]
  },
  {
   "obj": "plant.fern",
   "at": [-22.18, 59.28]
  },
  {
   "obj": "plant.fern",
   "at": [-31.64, 65.7]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.23, 36.67]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-20.32, 56.75]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-14.05, 59.86]
  },
  {
   "cluster": "plant.grass-long",
   "on": "wood-left",
   "n": 8,
   "seed": 2705
  },
  {
   "obj": "plant.wildflowers",
   "at": [14.38, 58.32]
  },
  {
   "obj": "plant.wildflowers",
   "at": [12.86, 58.69]
  },
  {
   "obj": "plant.wildflowers",
   "at": [22.55, 59.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.04, 28.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.27, 29.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [18.59, 30.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.18, 30.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [24.26, 31.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [13.2, 34.1]
  },
  {
   "cluster": "plant.grass-long",
   "on": "wood-right",
   "n": 13,
   "seed": 1435
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.61, 4.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.75, 4.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.07, 4.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.58, 4.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.5, 4.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.13, 4.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.34, 4.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.86, 4.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.09, 4.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.46, 5.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.99, 5.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.89, 5.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.72, 5.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.29, 5.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.52, 5.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.5, 5.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.76, 5.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.69, 5.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.12, 5.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.05, 5.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.35, 5.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.07, 5.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.67, 5.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.76, 5.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.58, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.76, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.28, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.97, 5.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.01, 5.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.91, 5.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.74, 5.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.42, 5.37]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.74, 5.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.62, 5.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.19, 5.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.76, 5.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.02, 5.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.31, 5.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.08, 5.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.39, 5.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.64, 5.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.48, 5.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.57, 5.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.85, 5.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.88, 5.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.61, 5.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.02, 5.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.03, 5.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.29, 5.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.08, 5.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.42, 5.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.85, 5.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.33, 5.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.19, 5.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.69, 5.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.01, 5.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.88, 5.91]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.21, 5.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.39, 5.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.67, 5.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.83, 5.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.55, 5.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.7, 6.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.86, 6.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2, 6.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.18, 6.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.56, 6.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.4, 6.24]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.37, 6.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.01, 6.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.2, 6.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.75, 6.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.41, 6.33]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.4, 6.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.77, 6.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.3, 6.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.77, 6.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.63, 6.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.22, 6.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.47, 6.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.95, 6.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.73, 6.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5, 6.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.42, 6.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.78, 6.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.32, 6.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.15, 6.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.17, 6.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.97, 6.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.16, 7.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.65, 7.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.8, 7.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.15, 7.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.89, 7.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.18, 7.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.43, 7.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.11, 7.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.64, 7.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.75, 7.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.69, 7.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.07, 7.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.31, 7.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.38, 7.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.38, 7.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.39, 7.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.68, 7.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.31, 7.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.21, 7.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.86, 7.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.26, 7.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.96, 7.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.63, 7.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.4, 7.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.77, 7.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.02, 7.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.1, 8.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.49, 8.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.11, 8.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.7, 8.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.65, 8.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.64, 8.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.02, 8.06]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.89, 8.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.14, 8.27]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.46, 8.38]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.83, 8.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.01, 8.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.03, 8.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.93, 8.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.18, 8.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.58, 8.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.72, 8.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.06, 8.83]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.19, 8.89]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.92, 8.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.84, 9.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.34, 9.16]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.66, 9.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [-6.91, 9.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.9, 10.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.11, 10.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.02, 10.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.23, 11.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.19, 11.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.79, 11.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.43, 11.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.24, 11.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.12, 11.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.86, 12.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.71, 12.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.98, 12.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.64, 12.3]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.05, 12.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.04, 12.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.58, 12.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.3, 12.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.32, 12.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.24, 12.97]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.23, 13.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.73, 14.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [10.35, 14.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.9, 14.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.03, 21.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.51, 37.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.17, 57.55]
  },
  {
   "obj": "structure.rph-platform-perspective-9",
   "at": [-3.77, 45]
  },
  {
   "obj": "plant.fern",
   "at": [6.33, 30.7]
  },
  {
   "obj": "plant.fern",
   "at": [17.64, 30.74]
  },
  {
   "obj": "plant.fern",
   "at": [23.92, 37.79]
  },
  {
   "obj": "plant.fern",
   "at": [18.12, 38.07]
  },
  {
   "obj": "plant.fern",
   "at": [32.13, 41.94]
  },
  {
   "obj": "plant.fern",
   "at": [2.61, 5.11]
  },
  {
   "obj": "plant.fern",
   "at": [2.26, 5.58]
  },
  {
   "obj": "plant.fern",
   "at": [3.41, 5.6]
  },
  {
   "obj": "plant.fern",
   "at": [4.04, 5.7]
  },
  {
   "obj": "plant.fern",
   "at": [-2.22, 5.75]
  },
  {
   "obj": "plant.fern",
   "at": [-3.57, 5.86]
  },
  {
   "obj": "plant.fern",
   "at": [-2, 5.9]
  },
  {
   "obj": "plant.fern",
   "at": [-1.8, 5.91]
  },
  {
   "obj": "plant.fern",
   "at": [4.84, 6.43]
  },
  {
   "obj": "plant.fern",
   "at": [-2.84, 6.63]
  },
  {
   "obj": "plant.fern",
   "at": [-5.23, 6.81]
  },
  {
   "obj": "plant.fern",
   "at": [-4.15, 6.97]
  },
  {
   "obj": "plant.fern",
   "at": [4.2, 7.2]
  },
  {
   "obj": "plant.fern",
   "at": [-5.33, 7.34]
  },
  {
   "obj": "plant.fern",
   "at": [5.42, 7.61]
  },
  {
   "obj": "plant.fern",
   "at": [-4.88, 8.18]
  },
  {
   "obj": "plant.fern",
   "at": [-6.1, 8.5]
  },
  {
   "obj": "plant.fern",
   "at": [-2.72, 10]
  },
  {
   "obj": "plant.fern",
   "at": [-7.26, 10.5]
  },
  {
   "obj": "plant.fern",
   "at": [4.27, 15.3]
  },
  {
   "obj": "plant.fern",
   "at": [5.56, 15.31]
  },
  {
   "obj": "plant.fern",
   "at": [9.87, 15.35]
  },
  {
   "obj": "plant.fern",
   "at": [5.15, 15.98]
  },
  {
   "obj": "plant.fern",
   "at": [2.82, 16.01]
  },
  {
   "obj": "plant.fern",
   "at": [6.29, 16.55]
  },
  {
   "obj": "plant.fern",
   "at": [7.47, 17.05]
  },
  {
   "obj": "plant.fern",
   "at": [5.81, 17.56]
  },
  {
   "obj": "plant.fern",
   "at": [-8.91, 17.98]
  },
  {
   "obj": "plant.fern",
   "at": [2.49, 18.42]
  },
  {
   "obj": "plant.fern",
   "at": [2.81, 18.93]
  },
  {
   "obj": "plant.fern",
   "at": [3.33, 19.06]
  },
  {
   "obj": "plant.fern",
   "at": [-10.07, 21.51]
  },
  {
   "obj": "plant.fern",
   "at": [-11.14, 21.79]
  },
  {
   "obj": "plant.fern",
   "at": [2.93, 22.09]
  },
  {
   "obj": "plant.fern",
   "at": [-12.7, 23.82]
  },
  {
   "obj": "plant.fern",
   "at": [16.66, 24]
  },
  {
   "obj": "plant.fern",
   "at": [3.09, 25.69]
  },
  {
   "obj": "plant.fern",
   "at": [-13.15, 25.7]
  },
  {
   "obj": "plant.fern",
   "at": [-14.61, 26.66]
  },
  {
   "obj": "plant.fern",
   "at": [-14.33, 29.88]
  },
  {
   "obj": "plant.fern",
   "at": [-19.03, 31.23]
  },
  {
   "obj": "plant.fern",
   "at": [-18.46, 33.43]
  },
  {
   "obj": "structure.rph-platform-perspective-7",
   "at": [-3.57, 37]
  },
  {
   "obj": "plant.wildflowers",
   "at": [10.91, 16.14]
  },
  {
   "obj": "plant.wildflowers",
   "at": [2.3, 19.45]
  },
  {
   "obj": "plant.wildflowers",
   "at": [13.64, 20.88]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-11.08, 22.38]
  },
  {
   "obj": "plant.wildflowers",
   "at": [15.59, 23.8]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.74, 30.62]
  },
  {
   "obj": "plant.bracken",
   "at": [-1.2, 4.91]
  },
  {
   "obj": "plant.bracken",
   "at": [2.96, 5.12]
  },
  {
   "obj": "plant.bracken",
   "at": [-3.88, 5.14]
  },
  {
   "obj": "plant.bracken",
   "at": [3.1, 5.15]
  },
  {
   "obj": "plant.bracken",
   "at": [-1.32, 5.23]
  },
  {
   "obj": "plant.bracken",
   "at": [3.22, 5.39]
  },
  {
   "obj": "plant.bracken",
   "at": [3, 5.8]
  },
  {
   "obj": "plant.bracken",
   "at": [-3.08, 5.86]
  },
  {
   "obj": "plant.bracken",
   "at": [-3.97, 5.94]
  },
  {
   "obj": "plant.bracken",
   "at": [3.37, 6.09]
  },
  {
   "obj": "plant.bracken",
   "at": [3.99, 6.63]
  },
  {
   "obj": "plant.bracken",
   "at": [2.88, 6.63]
  },
  {
   "obj": "plant.bracken",
   "at": [-4.6, 7.25]
  },
  {
   "obj": "plant.bracken",
   "at": [-1.03, 7.29]
  },
  {
   "obj": "plant.bracken",
   "at": [4.75, 7.72]
  },
  {
   "obj": "plant.bracken",
   "at": [6.41, 8.73]
  },
  {
   "obj": "plant.bracken",
   "at": [6.77, 8.99]
  },
  {
   "obj": "plant.bracken",
   "at": [-6.66, 8.99]
  },
  {
   "obj": "plant.bracken",
   "at": [-2.43, 9.22]
  },
  {
   "obj": "plant.bracken",
   "at": [-2.06, 10.4]
  },
  {
   "obj": "plant.bracken",
   "at": [8.42, 11.5]
  },
  {
   "obj": "plant.bracken",
   "at": [-10.26, 14.29]
  },
  {
   "obj": "plant.bracken",
   "at": [3.33, 17.91]
  },
  {
   "obj": "plant.bracken",
   "at": [7.32, 18.59]
  },
  {
   "obj": "plant.bracken",
   "at": [15.16, 20.79]
  },
  {
   "obj": "plant.bracken",
   "at": [13, 21.18]
  },
  {
   "obj": "plant.bracken",
   "at": [-14.03, 27.95]
  },
  {
   "obj": "plant.bracken",
   "at": [8.54, 24.31]
  },
  {
   "obj": "plant.bracken",
   "at": [11.77, 28.11]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.03, 5.26]
  },
  {
   "obj": "ground.leaves",
   "at": [2.9, 5.3]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.53, 5.52]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.38, 5.52]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.98, 5.57]
  },
  {
   "obj": "ground.leaves",
   "at": [-4.39, 6.04]
  },
  {
   "obj": "ground.leaves",
   "at": [-4, 6.51]
  },
  {
   "obj": "ground.leaves",
   "at": [-2.3, 7.07]
  },
  {
   "obj": "ground.leaves",
   "at": [5.93, 8.32]
  },
  {
   "obj": "ground.leaves",
   "at": [6.37, 8.46]
  },
  {
   "obj": "ground.leaves",
   "at": [-1.91, 9.21]
  },
  {
   "obj": "ground.leaves",
   "at": [7.9, 11.39]
  },
  {
   "obj": "ground.leaves",
   "at": [-0.21, 12.1]
  },
  {
   "obj": "ground.leaves",
   "at": [-9.13, 14.02]
  },
  {
   "obj": "ground.leaves",
   "at": [-11.2, 21.59]
  },
  {
   "obj": "ground.leaves",
   "at": [-12.17, 25.73]
  },
  {
   "obj": "structure.rph-platform-perspective-4",
   "at": [-3.27, 25]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.26, 5.28]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.5, 5.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.23, 5.64]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.56, 5.75]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-1.38, 5.95]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-3.59, 6.07]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-4.19, 6.4]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-5.93, 8.09]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [5.88, 8.55]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [3.71, 8.85]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [6.12, 9.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [7.11, 9.66]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.8, 10.28]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.35, 10.78]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.82, 11.84]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.73, 12.11]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [2.18, 12.17]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [8.78, 12.29]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [9.58, 12.47]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.09, 12.67]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-0.03, 14.7]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-9.12, 20.66]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [-11.2, 20.7]
  },
  {
   "obj": "structure.rph-platform-perspective-2",
   "at": [-3.07, 17]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [0.81, 9.59]
  },
  {
   "obj": "ground.leaf-litter",
   "at": [1.1, 13.65]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.02, 4.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.45, 4.95]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.14, 5.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.1, 5.43]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.38, 5.65]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.72, 5.78]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.11, 5.99]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.02, 6.29]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [4.44, 6.35]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-0.4, 6.41]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.96, 6.59]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.68, 6.77]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.86, 6.8]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-3.35, 7.09]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.51, 7.2]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.94, 7.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.03, 7.27]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.5, 7.45]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.8, 7.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.88, 8.01]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-4.44, 8.12]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.33, 8.36]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0, 8.42]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.8, 8.53]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.31, 8.63]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-5.47, 8.7]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.96, 8.75]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2, 8.9]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.75, 8.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.22, 8.93]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.81, 9.24]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.97, 9.25]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [3.35, 9.5]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [2.61, 9.84]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [0.36, 10.52]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-2.84, 11.25]
  },
  {
   "obj": "plant.rph-rosette",
   "at": [-1.34, 11.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.25, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.87, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.59, 4.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.53, 4.92]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.69, 4.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.4, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.63, 4.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.24, 4.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.59, 4.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.69, 4.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.89, 4.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.09, 4.99]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.33, 4.99]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.82, 5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.56, 5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.82, 5.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.69, 5.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.56, 5.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.9, 5.18]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.5, 5.21]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.53, 5.21]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.14, 5.22]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.93, 5.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.42, 5.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.57, 5.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.19, 5.28]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.26, 5.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.1, 5.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.25, 5.35]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.42, 5.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.99, 5.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.62, 5.42]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.87, 5.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.77, 5.49]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.6, 5.53]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.72, 5.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.88, 5.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.35, 5.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.89, 5.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.27, 5.58]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.21, 5.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.76, 5.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.98, 5.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.16, 5.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.59, 5.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.59, 5.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.88, 5.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.58, 5.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.11, 5.88]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.45, 5.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.52, 5.93]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.89, 5.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.52, 6.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.99, 6.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.27, 6.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.89, 6.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.07, 6.09]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.34, 6.11]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.6, 6.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.44, 6.17]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.94, 6.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.97, 6.21]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.02, 6.21]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.23, 6.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.32, 6.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.18, 6.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.96, 6.27]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.47, 6.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.92, 6.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.63, 6.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.57, 6.38]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.95, 6.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.6, 6.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.46, 6.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.54, 6.48]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.26, 6.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.45, 6.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [1.85, 6.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.19, 6.55]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.17, 6.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.03, 6.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.09, 6.6]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.87, 6.65]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.85, 6.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.08, 6.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.56, 6.72]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.27, 6.83]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.87, 6.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.31, 6.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.37, 6.94]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.21, 6.97]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.56, 7.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.17, 7.04]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.05, 7.15]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.15, 7.16]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.77, 7.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.57, 7.26]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.83, 7.32]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.26, 7.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.21, 7.34]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.93, 7.36]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.23, 7.39]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.26, 7.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.31, 7.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.46, 7.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0.14, 7.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.09, 7.63]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.56, 7.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.69, 7.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.74, 7.69]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.69, 7.75]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.12, 7.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.98, 7.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.82, 7.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.85, 7.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.9, 7.91]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.9, 7.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.61, 7.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.29, 8.02]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.59, 8.03]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.46, 8.13]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.28, 8.19]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.08, 8.41]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.1, 8.43]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.57, 8.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.2, 8.45]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.51, 8.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.76, 8.5]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.32, 8.54]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.96, 8.58]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.5, 8.6]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-3.3, 8.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-5.67, 8.61]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.14, 8.64]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.28, 8.68]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-4.54, 8.79]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.12, 8.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-6.81, 8.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.94, 9.07]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.19, 9.2]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.12, 9.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.38, 9.56]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.18, 9.66]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.33, 9.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.97, 9.79]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.74, 9.8]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.64, 9.81]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.85, 9.86]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.16, 9.98]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.66, 10.05]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.4, 10.12]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.11, 10.24]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.08, 10.25]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-2.24, 10.31]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.65, 10.33]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [0, 10.37]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.89, 10.59]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [4.01, 10.67]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.36, 10.82]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [6.24, 10.9]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.59, 10.96]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-7.45, 11.01]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.41, 11.3]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [7.07, 11.44]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-1.98, 11.47]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.79, 11.52]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [5.35, 11.78]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-9.05, 11.85]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [8.8, 11.87]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [-0.17, 11.89]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [9.17, 11.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [2.29, 11.95]
  },
  {
   "obj": "plant.rph-short-grass",
   "at": [3.46, 11.98]
  },
  {
   "obj": "ground.leaves",
   "at": [0.61, 5.35]
  }],
 "life": [{
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/3min",
   "on": "trail"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/6min",
   "on": "trail"
  }],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
