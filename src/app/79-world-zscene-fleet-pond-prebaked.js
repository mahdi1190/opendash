/* ============================================================
   WORLD SCENE (format v3) world-test / fleet-pond-prebaked-w3: converted by `node tools/world.mjs convert proof-fleet-pond/hampshire-fleet-pond-prebaked`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (82):
     - place[0]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-0.1, 4.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-0.3, 6.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-0.7, 8.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-1.2, 10.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-1.7, 12.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-2.3, 14.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-3, 16.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-3.7, 18.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-4.4, 20.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-5.1, 21.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-5.8, 23.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.proof-fleet-boardwalk: pixel placement unprojected to [-7.1, 28.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.proof-fleet-embankment: pixel placement unprojected to [-46.3, 81.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.proof-fleet-embankment: pixel placement unprojected to [41.4, 92.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: plant.proof-fleet-reed: pixel placement unprojected to [7.8, 26.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[15]: plant.proof-fleet-reed: pixel placement unprojected to [5.2, 25.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: plant.proof-fleet-reed: pixel placement unprojected to [3.6, 27.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[17]: plant.proof-fleet-reed: pixel placement unprojected to [7.4, 25.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[17]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[18]: plant.proof-fleet-reed: pixel placement unprojected to [4.7, 27.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[19]: plant.proof-fleet-reed: pixel placement unprojected to [6.5, 26.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: plant.proof-fleet-reed: pixel placement unprojected to [6.7, 26.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[21]: plant.proof-fleet-reed: pixel placement unprojected to [4, 26.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[22]: plant.proof-fleet-reed: pixel placement unprojected to [5.5, 27.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[23]: plant.proof-fleet-reed: pixel placement unprojected to [2.9, 26.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[23]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[24]: plant.proof-fleet-reed: pixel placement unprojected to [4.3, 27] m (was pinned perspective art: check it is a real object at this spot)
     - place[24]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[25]: plant.proof-fleet-reed: pixel placement unprojected to [6.3, 27.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[25]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     - place[26]: plant.proof-fleet-reed: pixel placement unprojected to [7.1, 25.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[27]: plant.proof-fleet-reed: pixel placement unprojected to [3.1, 26] m (was pinned perspective art: check it is a real object at this spot)
     - place[28]: plant.proof-fleet-reed: pixel placement unprojected to [-2.7, 42.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[29]: plant.proof-fleet-reed: pixel placement unprojected to [-3.5, 42.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[30]: plant.proof-fleet-reed: pixel placement unprojected to [-3.8, 41] m (was pinned perspective art: check it is a real object at this spot)
     - place[31]: plant.proof-fleet-reed: pixel placement unprojected to [-1.9, 41.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[31]: plant.proof-fleet-reed: variant 2 does not exist; dropped the variant
     ... and 42 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"fleet-pond-prebaked-w3","label":"Fleet Pond (prebaked), Hampshire","site":"Fleet Pond — a heron hunts the reed edge as a train crosses the embankment","tags":["uk","south east","hampshire","landscape","lake","reedbed","boardwalk","heron","railway","nature reserve","world-v3"],"liveSky":{"lat":51.2889,"lon":-0.8262},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.2889,
  "lon": -0.8262,
  "region": "hampshire"
 },
 "camera": {
  "eye": 2,
  "fov": 62,
  "horizon": 440,
  "heading": 340,
  "water": -0.5
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.9, 5.2],
    [3.9, 5.2],
    [2253.2, 3000],
    [-2253.2, 3000]]
  },
  {
   "id": "lineside",
   "kind": "grass",
   "poly": [[-320, 69.6],
    [320, 146.4],
    [320, 196.4],
    [-320, 119.6]]
  },
  {
   "id": "emb",
   "kind": "grass",
   "path": [[-320, 59.6],
    [-160, 78.8],
    [0, 98],
    [160, 117.2],
    [320, 136.4]],
   "width": 21
  },
  {
   "id": "railway",
   "kind": "rail",
   "path": [[-320, 59.6],
    [-160, 78.8],
    [0, 98],
    [160, 117.2],
    [320, 136.4]],
   "width": 9
  },
  {
   "id": "reeds-n",
   "kind": "grass",
   "poly": [[-110, 62],
    [-96, 67],
    [-84, 63.5],
    [-70, 66],
    [-61, 72],
    [-52, 69],
    [-44, 67.5],
    [-36, 72],
    [-27, 76],
    [-21, 73],
    [-14, 72.5],
    [-8, 77],
    [-1, 80],
    [5, 76.5],
    [11, 75.5],
    [17, 80],
    [23, 85],
    [30, 83],
    [37, 81.5],
    [44, 86],
    [52, 90],
    [60, 87],
    [68, 89],
    [78, 90],
    [160, 110],
    [160, 104.7],
    [0, 85.5],
    [-160, 66.3],
    [-320, 47.1],
    [-320, 50]]
  },
  {
   "id": "carr-e",
   "kind": "grass",
   "poly": [[36, 34],
    [27, 38],
    [21, 42],
    [19.5, 46],
    [23, 49.5],
    [29, 55],
    [34, 62],
    [42, 70],
    [52, 78],
    [66, 86],
    [78, 90],
    [160, 104.7],
    [160, 30]]
  },
  {
   "id": "reeds-c",
   "kind": "grass",
   "poly": [[36, 34],
    [27, 38],
    [21, 42],
    [19.5, 46],
    [23, 49.5],
    [29, 55],
    [34, 62],
    [42, 70],
    [52, 78],
    [54.6, 79.4],
    [44.6, 71.4],
    [36.6, 63.4],
    [31.6, 56.4],
    [25.6, 50.9],
    [22.1, 47.4],
    [23.6, 43.4],
    [29.6, 39.4],
    [38.6, 35.4]]
  },
  {
   "id": "reeds-w",
   "kind": "grass",
   "poly": [[1, 2.4],
    [0.78, 5],
    [0.34, 8],
    [-0.4, 11],
    [-1.45, 14.5],
    [-2.7, 18],
    [-4, 21],
    [-5.4, 23],
    [-8.4, 28.6],
    [-10.4, 30.6],
    [-11.6, 34.5],
    [-15, 40.5],
    [-20.5, 45.5],
    [-26.5, 49.5],
    [-33, 53.5],
    [-42, 56.5],
    [-52, 59],
    [-66, 60.5],
    [-82, 62.5],
    [-110, 62],
    [-160, 60],
    [-320, 50],
    [-320, 2.4]]
  },
  {
   "id": "reeds-e",
   "kind": "grass",
   "poly": [[2.95, 2.4],
    [2.75, 4.2],
    [3.05, 5.6],
    [3.9, 6.8],
    [5.4, 7.7],
    [7.6, 8.15],
    [10.5, 8.2],
    [14, 8.4],
    [14, 2.4]]
  },
  {
   "id": "cut",
   "kind": "grass",
   "poly": [[-0.6, 2.4],
    [-0.85, 5],
    [-1.3, 8],
    [-2.05, 11],
    [-3.1, 14.5],
    [-4.35, 18],
    [-5.65, 21.5],
    [-7.4, 24],
    [-8.9, 24],
    [-7.3, 21.5],
    [-5.9, 18],
    [-4.6, 14.5],
    [-3.5, 11],
    [-2.75, 8],
    [-2.25, 5],
    [-2.05, 2.4]]
  },
  {
   "id": "deck",
   "kind": "bridge-deck",
   "over": "water",
   "path": [[0.15, 2.6],
    [-0.1, 5],
    [-0.55, 8],
    [-1.3, 11],
    [-2.35, 14.5],
    [-3.6, 18],
    [-4.9, 21.5],
    [-6.1, 24.6]],
   "width": 1.5
  },
  {
   "id": "platform",
   "kind": "bridge-deck",
   "over": "water",
   "poly": [[-8.7, 24],
    [-5.1, 22.7],
    [-3.5, 26.9],
    [-7.1, 28.5]]
  },
  {
   "id": "pond",
   "kind": "water",
   "water": "lake",
   "poly": [[1, 2.4],
    [2.95, 2.4],
    [2.75, 4.2],
    [3.05, 5.6],
    [3.9, 6.8],
    [5.4, 7.7],
    [7.6, 8.15],
    [10.5, 8.2],
    [14, 8.4],
    [20, 14],
    [28, 24],
    [36, 34],
    [27, 38],
    [21, 42],
    [19.5, 46],
    [23, 49.5],
    [29, 55],
    [34, 62],
    [42, 70],
    [52, 78],
    [66, 86],
    [78, 90],
    [68, 89],
    [60, 87],
    [52, 90],
    [44, 86],
    [37, 81.5],
    [30, 83],
    [23, 85],
    [17, 80],
    [11, 75.5],
    [5, 76.5],
    [-1, 80],
    [-8, 77],
    [-14, 72.5],
    [-21, 73],
    [-27, 76],
    [-36, 72],
    [-44, 67.5],
    [-52, 69],
    [-61, 72],
    [-70, 66],
    [-84, 63.5],
    [-96, 67],
    [-110, 62],
    [-82, 62.5],
    [-66, 60.5],
    [-52, 59],
    [-42, 56.5],
    [-33, 53.5],
    [-26.5, 49.5],
    [-20.5, 45.5],
    [-15, 40.5],
    [-11.6, 34.5],
    [-10.4, 30.6],
    [-8.4, 28.6],
    [-5.4, 23],
    [-4, 21],
    [-2.7, 18],
    [-1.45, 14.5],
    [-0.4, 11],
    [0.34, 8],
    [0.78, 5],
    [1, 2.4]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-0.06, 4.69],
   "variant": 0
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-0.32, 6.67],
   "variant": 1
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-0.69, 8.64],
   "variant": 2
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-1.18, 10.58],
   "variant": 3
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-1.73, 12.5],
   "variant": 4
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-2.32, 14.41],
   "variant": 5
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-2.98, 16.3],
   "variant": 6
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-3.66, 18.18],
   "variant": 7
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-4.36, 20.05],
   "variant": 8
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-5.06, 21.92],
   "variant": 9
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-5.79, 23.8],
   "variant": 10,
   "attach": "water"
  },
  {
   "obj": "structure.proof-fleet-boardwalk",
   "at": [-7.1, 28.51],
   "variant": 11,
   "attach": "water"
  },
  {
   "obj": "structure.proof-fleet-embankment",
   "at": [-46.25, 81.4],
   "variant": 0
  },
  {
   "obj": "structure.proof-fleet-embankment",
   "at": [41.4, 92.74],
   "variant": 1
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [7.81, 26.39],
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [5.23, 25.29],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.59, 27.17],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [7.4, 25.75],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4.67, 27.2],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [6.52, 26.63],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [6.75, 26.66],
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4, 26.79],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [5.48, 27.62],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [2.94, 26.36],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4.28, 27.01],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [6.34, 27.09],
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [7.15, 25.6],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.14, 25.98],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.71, 42.13],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.5, 42.2],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.81, 41.03],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-1.94, 41.67],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [12.87, 29.52],
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [13.13, 29.59],
   "variant": 1,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [12.52, 30.16],
   "attach": "water"
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [11.3, 29.69],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "bird.coot",
   "at": [-13, 44],
   "attach": "water"
  },
  {
   "obj": "bird.moorhen",
   "at": [-3.4, 26],
   "attach": "water"
  },
  {
   "obj": "bird.mallard",
   "at": [9, 24],
   "attach": "water"
  },
  {
   "obj": "bird.mallard",
   "at": [9.8, 24.6],
   "variant": 1,
   "attach": "water"
  },
  {
   "cluster": "tree.pfp-bank-birch",
   "on": "land",
   "n": 11,
   "seed": 2572
  },
  {
   "cluster": "tree.pfp-bank-alder",
   "on": "land",
   "n": 8,
   "seed": 7305
  },
  {
   "cluster": "tree.pfp-pond-oak",
   "on": "land",
   "n": 14,
   "seed": 4617
  },
  {
   "cluster": "tree.pfp-bank-oak",
   "on": "land",
   "n": 21,
   "seed": 6656
  },
  {
   "cluster": "tree.pond-pine",
   "on": "land",
   "n": 6,
   "seed": 3384
  },
  {
   "cluster": "tree.pfp-bank-birch",
   "on": "lineside",
   "n": 15,
   "seed": 8597
  },
  {
   "cluster": "tree.pfp-bank-alder",
   "on": "lineside",
   "n": 9,
   "seed": 9889
  },
  {
   "cluster": "tree.pfp-bank-oak",
   "on": "lineside",
   "n": 5,
   "seed": 3793
  },
  {
   "cluster": "tree.pfp-bank-willow",
   "on": "lineside",
   "n": 5,
   "seed": 899
  },
  {
   "cluster": "plant.proof-fleet-reed",
   "on": "reeds-n",
   "n": 39,
   "seed": 9904,
   "edge": true
  },
  {
   "cluster": "plant.proof-fleet-rush",
   "on": "reeds-n",
   "n": 4,
   "seed": 129,
   "edge": true
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.11, 5.81]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.01, 5.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.96, 5.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.13, 5.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.82, 6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.68, 6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.66, 6.04]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.76, 6.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.62, 6.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4, 6.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.78, 6.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.59, 6.42]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.08, 6.46]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.84, 6.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.96, 6.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.23, 6.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.45, 6.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.62, 6.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.74, 6.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.37, 6.68]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.72, 6.7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.68, 6.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.13, 6.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.65, 6.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.54, 6.9]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.27, 6.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.91, 7]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.59, 7.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.42, 7.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.67, 7.35]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.27, 7.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.43, 7.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.02, 7.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.67, 7.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.74, 7.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.74, 7.93]
  },
  {
   "obj": "plant.grass-long",
   "at": [-5.56, 9.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.98, 10.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.04, 21.2]
  },
  {
   "obj": "plant.grass-long",
   "at": [-15.23, 24.49]
  },
  {
   "obj": "plant.grass-long",
   "at": [-14.49, 26.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-21.14, 29.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-18.24, 29.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-17.83, 30.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-12.58, 32.88]
  },
  {
   "obj": "plant.grass-long",
   "at": [-22.34, 32.94]
  },
  {
   "cluster": "plant.grass-long",
   "on": "reeds-w",
   "n": 9,
   "seed": 4987
  },
  {
   "cluster": "tree.pfp-bank-willow",
   "on": "carr-e",
   "n": 4,
   "seed": 4838
  },
  {
   "cluster": "tree.pfp-pond-oak",
   "on": "carr-e",
   "n": 4,
   "seed": 4600
  },
  {
   "obj": "tree.pfp-bank-birch",
   "at": [32.82, 52.62]
  },
  {
   "obj": "tree.pfp-bank-birch",
   "at": [43.49, 69.43]
  },
  {
   "cluster": "tree.pfp-pond-alder",
   "on": "carr-e",
   "n": 5,
   "seed": 4471
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.74, 5.77]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.92, 5.79]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.6, 6.31]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.93, 6.57]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.73, 6.92]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.4, 7.1]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-4.44, 7.3]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.84, 7.43]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.12, 7.56]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-4.43, 8.25]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-2.83, 8.29]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-6.01, 8.73]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-4.81, 8.86]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-4.08, 9.03]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.82, 9.66]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.26, 9.69]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.27, 9.8]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-4.21, 10]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-3.49, 10.45]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.84, 10.98]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-6.47, 11.22]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.21, 11.81]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.34, 12.34]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.59, 13.06]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.67, 13.29]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.18, 13.39]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-6.65, 13.56]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.67, 13.59]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.23, 14]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-5.04, 14.28]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.62, 14.53]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-6.55, 14.8]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.05, 15.11]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.58, 15.24]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.53, 15.62]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.79, 16.15]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-6.34, 16.73]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.39, 17.12]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.29, 17.26]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.04, 17.45]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.71, 18]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.9, 18.67]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.13, 19.41]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.58, 19.52]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.73, 20.08]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.16, 20.34]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.89, 20.76]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.98, 20.78]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-12.52, 20.93]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-8.76, 21.21]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.4, 21.53]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-15.36, 21.73]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-12.65, 22.06]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.03, 22.12]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-13.26, 22.5]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-9.96, 22.66]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.56, 22.67]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-12.76, 22.72]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.22, 22.88]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-13.86, 23.97]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.19, 24.01]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-17.36, 24.66]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-16.49, 24.89]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-13.99, 28.2]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-17.81, 28.95]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-10.51, 30.17]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-16.82, 31.97]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.81, 32.09]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-13.86, 32.7]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-11.73, 33.86]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-13.4, 33.93]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-14.14, 34.14]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-12.4, 34.64]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-18.92, 34.67]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [-17.59, 34.8]
  },
  {
   "cluster": "plant.proof-fleet-reed",
   "on": "reeds-w",
   "n": 18,
   "seed": 7282,
   "edge": true
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-3.36, 6.38]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-6.28, 10.31]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-5.72, 12.76]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-10.49, 16.59]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-13.22, 21.87]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-9.41, 22.51]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-19.06, 29.02]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-15.41, 36.27]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-19.55, 39.33]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [-16.5, 39.99]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-9.95, 18.57]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-15.07, 25.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.95, 5.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.28, 5.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.46, 5.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.18, 5.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.17, 5.89]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.3, 6.03]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.81, 6.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.99, 6.14]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.29, 6.28]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.98, 6.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.76, 6.45]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.69, 6.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.38, 6.65]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.85, 6.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.39, 6.76]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.71, 6.79]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.56, 6.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.44, 7.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.09, 7.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.66, 7.82]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.83, 8.69]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.82, 8.72]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.69, 9.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.07, 9.38]
  },
  {
   "obj": "plant.grass",
   "at": [-1.17, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [-1.28, 5.8]
  },
  {
   "obj": "plant.grass",
   "at": [-1.71, 5.81]
  },
  {
   "obj": "plant.grass",
   "at": [-1.83, 5.82]
  },
  {
   "obj": "plant.grass",
   "at": [-0.99, 5.82]
  },
  {
   "obj": "plant.grass",
   "at": [-1.4, 5.84]
  },
  {
   "obj": "plant.grass",
   "at": [-1.9, 5.85]
  },
  {
   "obj": "plant.grass",
   "at": [-1.6, 5.87]
  },
  {
   "obj": "plant.grass",
   "at": [-1.8, 5.93]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 5.97]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 5.98]
  },
  {
   "obj": "plant.grass",
   "at": [-1.58, 5.99]
  },
  {
   "obj": "plant.grass",
   "at": [-1.49, 6]
  },
  {
   "obj": "plant.grass",
   "at": [-2.16, 6.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.72, 6.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.88, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [-1.03, 6.15]
  },
  {
   "obj": "plant.grass",
   "at": [-1.22, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.65, 6.21]
  },
  {
   "obj": "plant.grass",
   "at": [-1.36, 6.26]
  },
  {
   "obj": "plant.grass",
   "at": [-2.11, 6.29]
  },
  {
   "obj": "plant.grass",
   "at": [-2.43, 6.31]
  },
  {
   "obj": "plant.grass",
   "at": [-2.22, 6.31]
  },
  {
   "obj": "plant.grass",
   "at": [-1.33, 6.41]
  },
  {
   "obj": "plant.grass",
   "at": [-1.94, 6.43]
  },
  {
   "obj": "plant.grass",
   "at": [-1.51, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [-1.87, 6.46]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 6.48]
  },
  {
   "obj": "plant.grass",
   "at": [-2.15, 6.5]
  },
  {
   "obj": "plant.grass",
   "at": [-1.44, 6.5]
  },
  {
   "obj": "plant.grass",
   "at": [-2.49, 6.53]
  },
  {
   "obj": "plant.grass",
   "at": [-2.42, 6.56]
  },
  {
   "obj": "plant.grass",
   "at": [-1.12, 6.64]
  },
  {
   "obj": "plant.grass",
   "at": [-1.2, 6.65]
  },
  {
   "obj": "plant.grass",
   "at": [-1.6, 6.69]
  },
  {
   "obj": "plant.grass",
   "at": [-2.27, 6.74]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [-2.33, 6.85]
  },
  {
   "obj": "plant.grass",
   "at": [-1.39, 6.89]
  },
  {
   "obj": "plant.grass",
   "at": [-2.11, 6.9]
  },
  {
   "obj": "plant.grass",
   "at": [-2.26, 6.94]
  },
  {
   "obj": "plant.grass",
   "at": [-1.91, 7]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 7.03]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 7.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.18, 7.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.82, 7.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.38, 7.19]
  },
  {
   "obj": "plant.grass",
   "at": [-2.34, 7.22]
  },
  {
   "obj": "plant.grass",
   "at": [-1.66, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [-1.77, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [-2.22, 7.39]
  },
  {
   "obj": "plant.grass",
   "at": [-1.55, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [-1.32, 7.45]
  },
  {
   "obj": "plant.grass",
   "at": [-1.47, 7.48]
  },
  {
   "obj": "plant.grass",
   "at": [-2.46, 7.71]
  },
  {
   "obj": "plant.grass",
   "at": [-2.86, 8.95]
  },
  {
   "obj": "plant.grass",
   "at": [-2.69, 8.98]
  },
  {
   "obj": "plant.grass",
   "at": [-2.97, 9.13]
  },
  {
   "obj": "plant.grass",
   "at": [-2.72, 9.38]
  },
  {
   "obj": "plant.grass",
   "at": [-3.97, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [-3.37, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [-4.07, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [-3.23, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [-3.16, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [-3.7, 5.79]
  },
  {
   "obj": "plant.grass",
   "at": [-2.43, 5.82]
  },
  {
   "obj": "plant.grass",
   "at": [-2.8, 5.83]
  },
  {
   "obj": "plant.grass",
   "at": [-2.61, 5.84]
  },
  {
   "obj": "plant.grass",
   "at": [-2.55, 5.85]
  },
  {
   "obj": "plant.grass",
   "at": [0.63, 5.85]
  },
  {
   "obj": "plant.grass",
   "at": [-2.71, 5.91]
  },
  {
   "obj": "plant.grass",
   "at": [-3.51, 5.91]
  },
  {
   "obj": "plant.grass",
   "at": [-3.23, 5.93]
  },
  {
   "obj": "plant.grass",
   "at": [-2.9, 5.93]
  },
  {
   "obj": "plant.grass",
   "at": [-4.23, 5.94]
  },
  {
   "obj": "plant.grass",
   "at": [-2.43, 5.96]
  },
  {
   "obj": "plant.grass",
   "at": [-3.9, 6.01]
  },
  {
   "obj": "plant.grass",
   "at": [-4.1, 6.07]
  },
  {
   "obj": "plant.grass",
   "at": [-4.04, 6.09]
  },
  {
   "obj": "plant.grass",
   "at": [-3.12, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [-3.01, 6.14]
  },
  {
   "obj": "plant.grass",
   "at": [0.51, 6.15]
  },
  {
   "obj": "plant.grass",
   "at": [-3.82, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-3.25, 6.18]
  },
  {
   "obj": "plant.grass",
   "at": [-2.48, 6.18]
  },
  {
   "obj": "plant.grass",
   "at": [-2.61, 6.18]
  },
  {
   "obj": "plant.grass",
   "at": [-4.36, 6.19]
  },
  {
   "obj": "plant.grass",
   "at": [-3.44, 6.19]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 6.22]
  },
  {
   "obj": "plant.grass",
   "at": [-3.56, 6.22]
  },
  {
   "obj": "plant.grass",
   "at": [-4.06, 6.22]
  },
  {
   "obj": "plant.grass",
   "at": [-4.29, 6.23]
  },
  {
   "obj": "plant.grass",
   "at": [-2.99, 6.29]
  },
  {
   "obj": "plant.grass",
   "at": [-3.16, 6.35]
  },
  {
   "obj": "plant.grass",
   "at": [-4.24, 6.35]
  },
  {
   "obj": "plant.grass",
   "at": [-3.11, 6.41]
  },
  {
   "obj": "plant.grass",
   "at": [-4.56, 6.42]
  },
  {
   "obj": "plant.grass",
   "at": [-3.34, 6.44]
  },
  {
   "obj": "plant.grass",
   "at": [-3.94, 6.44]
  },
  {
   "obj": "plant.grass",
   "at": [-2.69, 6.47]
  },
  {
   "obj": "plant.grass",
   "at": [-4.52, 6.47]
  },
  {
   "obj": "plant.grass",
   "at": [-3.06, 6.5]
  },
  {
   "obj": "plant.grass",
   "at": [-2.8, 6.58]
  },
  {
   "obj": "plant.grass",
   "at": [-4.38, 6.59]
  },
  {
   "obj": "plant.grass",
   "at": [0.54, 6.62]
  },
  {
   "obj": "plant.grass",
   "at": [-4.25, 6.65]
  },
  {
   "obj": "plant.grass",
   "at": [-2.78, 6.72]
  },
  {
   "obj": "plant.grass",
   "at": [-4.17, 6.72]
  },
  {
   "obj": "plant.grass",
   "at": [-2.6, 6.76]
  },
  {
   "obj": "plant.grass",
   "at": [-3.07, 6.78]
  },
  {
   "obj": "plant.grass",
   "at": [-4.57, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [-3.67, 6.82]
  },
  {
   "obj": "plant.grass",
   "at": [-4.1, 6.84]
  },
  {
   "obj": "plant.grass",
   "at": [-4.47, 6.85]
  },
  {
   "obj": "plant.grass",
   "at": [-3.99, 6.89]
  },
  {
   "obj": "plant.grass",
   "at": [-2.93, 6.92]
  },
  {
   "obj": "plant.grass",
   "at": [-3.66, 6.94]
  },
  {
   "obj": "plant.grass",
   "at": [-3.83, 7.01]
  },
  {
   "obj": "plant.grass",
   "at": [-5, 7.01]
  },
  {
   "obj": "plant.grass",
   "at": [-2.68, 7.04]
  },
  {
   "obj": "plant.grass",
   "at": [-3.49, 7.04]
  },
  {
   "obj": "plant.grass",
   "at": [-4.28, 7.04]
  },
  {
   "obj": "plant.grass",
   "at": [-3.24, 7.05]
  },
  {
   "obj": "plant.grass",
   "at": [-2.94, 7.12]
  },
  {
   "obj": "plant.grass",
   "at": [-3.69, 7.18]
  },
  {
   "obj": "plant.grass",
   "at": [-4.9, 7.18]
  },
  {
   "obj": "plant.grass",
   "at": [-3.82, 7.22]
  },
  {
   "obj": "plant.grass",
   "at": [-4.83, 7.26]
  },
  {
   "obj": "plant.grass",
   "at": [-4.25, 7.27]
  },
  {
   "obj": "plant.grass",
   "at": [-3.94, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [-4.34, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [0.44, 7.3]
  },
  {
   "obj": "plant.grass",
   "at": [-3.65, 7.31]
  },
  {
   "obj": "plant.grass",
   "at": [-5.14, 7.35]
  },
  {
   "obj": "plant.grass",
   "at": [0.37, 7.4]
  },
  {
   "obj": "plant.grass",
   "at": [-2.79, 7.42]
  },
  {
   "obj": "plant.grass",
   "at": [-3.6, 7.44]
  },
  {
   "obj": "plant.grass",
   "at": [-4.15, 7.47]
  },
  {
   "obj": "plant.grass",
   "at": [-2.94, 7.48]
  },
  {
   "obj": "plant.grass",
   "at": [-4.26, 7.49]
  },
  {
   "obj": "plant.grass",
   "at": [-3.86, 7.5]
  },
  {
   "obj": "plant.grass",
   "at": [-3.25, 7.5]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.96, 7.48]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.82, 5.76]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.58, 5.8]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.85, 5.97]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4.22, 6.2]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.95, 6.22]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4.4, 6.35]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [4.14, 6.42]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [3.87, 6.47]
  },
  {
   "obj": "plant.proof-fleet-reed",
   "at": [5.05, 7.46]
  },
  {
   "obj": "plant.grass",
   "at": [3.72, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [3.26, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [3.56, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [3.18, 5.76]
  },
  {
   "obj": "plant.grass",
   "at": [4.01, 5.78]
  },
  {
   "obj": "plant.grass",
   "at": [3.39, 5.81]
  },
  {
   "obj": "plant.grass",
   "at": [3.72, 5.83]
  },
  {
   "obj": "plant.grass",
   "at": [4.04, 5.98]
  },
  {
   "obj": "plant.grass",
   "at": [3.55, 5.98]
  },
  {
   "obj": "plant.grass",
   "at": [4.17, 6.05]
  },
  {
   "obj": "plant.grass",
   "at": [3.49, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [3.79, 6.21]
  },
  {
   "obj": "plant.grass",
   "at": [4.02, 6.27]
  },
  {
   "obj": "plant.grass",
   "at": [3.81, 6.34]
  },
  {
   "obj": "plant.grass",
   "at": [4.28, 6.34]
  },
  {
   "obj": "plant.grass",
   "at": [3.73, 6.43]
  },
  {
   "obj": "plant.grass",
   "at": [3.97, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [4.15, 6.49]
  },
  {
   "obj": "plant.grass",
   "at": [3.91, 6.63]
  },
  {
   "obj": "plant.grass",
   "at": [4, 6.65]
  },
  {
   "obj": "plant.grass",
   "at": [4.35, 6.68]
  },
  {
   "obj": "plant.grass",
   "at": [4.17, 6.71]
  },
  {
   "obj": "plant.grass",
   "at": [4.85, 6.81]
  },
  {
   "obj": "plant.grass",
   "at": [4.11, 6.9]
  },
  {
   "obj": "plant.grass",
   "at": [4.28, 6.99]
  },
  {
   "obj": "plant.grass",
   "at": [4.74, 7.03]
  },
  {
   "obj": "plant.grass",
   "at": [4.66, 7.05]
  },
  {
   "obj": "plant.grass",
   "at": [4.5, 7.12]
  },
  {
   "obj": "plant.grass",
   "at": [5.16, 7.31]
  },
  {
   "obj": "plant.grass",
   "at": [4.8, 7.33]
  },
  {
   "obj": "plant.grass",
   "at": [4.89, 7.34]
  },
  {
   "obj": "plant.wildflowers",
   "at": [4.82, 7.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.42, 5.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.86, 5.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.86, 5.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.56, 5.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.63, 5.99]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.85, 6.08]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.65, 6.19]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.45, 6.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.66, 6.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.17, 6.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.59, 6.34]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.06, 6.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.49, 6.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.5, 6.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.78, 6.95]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [3.75, 6.18]
  },
  {
   "obj": "plant.proof-fleet-rush",
   "at": [4.59, 6.55]
  }],
 "life": [{
   "who": "mute-swan",
   "count": 2,
   "on": "pond",
   "group": "pair"
  }],
 "backdrop": {
  "style": "woodland"
 },
 "seed": 1
});
})();
