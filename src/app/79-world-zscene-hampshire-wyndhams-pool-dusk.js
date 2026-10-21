/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-dusk-w3: converted by `node tools/world.mjs convert proof-wyndhams-pool/hampshire-wyndhams-pool-dusk`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (26):
     - place[0]: tree.wp-treeline: sky or horizon art with no foot; dropped
     - place[1]: tree.wp-treeline: sky or horizon art with no foot; dropped
     - place[2]: tree.wp-treeline: sky or horizon art with no foot; dropped
     - place[53]: landmark structure.wp-bivvy: src is a placeholder; give the listing or map reference
     - place[54]: landmark structure.wp-angler-platform: src is a placeholder; give the listing or map reference
     - place[88]: water.fish-ring: variant 2 does not exist; dropped the variant
     - place[91]: water.fish-ring: variant 2 does not exist; dropped the variant
     - place[96]: sky.wp-mist: pixel placement unprojected to [-39.6, 203.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[96]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[97]: sky.wp-mist: pixel placement unprojected to [62.7, 203.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[97]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[98]: sky.wp-mist: pixel placement unprojected to [3.3, 203.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[98]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[99]: tree.wp-pine-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - actors[7]: actor water.wp-dive-ring: no life class; dropped
     - actors[8]: actor bird.wp-swallow: no life class; dropped
     - actors[9]: actor bird.wp-swallow: no life class; dropped
     - actors[10]: actor bird.wp-swallow: no life class; dropped
     - actors[11]: actor animal.wp-bat: no life class; dropped
     - actors[12]: actor animal.wp-bat: no life class; dropped
     - actors[13]: actor animal.wp-bat: no life class; dropped
     - actors[14]: actor animal.wp-bat: no life class; dropped
     - actors[15]: actor animal.wp-bat: no life class; dropped
     - actors[16]: actor sky.wp-mist: no life class; dropped
     - actors[17]: actor sky.wp-mist: no life class; dropped
     - backdrop: backdrop style 'woodland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-dusk-w3","label":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — a wooded heathland pond on Yateley Common, ringed by Scots pine and birch, at dusk","tags":["uk","south east","hampshire","landscape","pond","woodland","reeds","scots pine","heron","kingfisher","dusk","world-v3"],"liveSky":{"lat":51.3316,"lon":-0.8221},"mood":"dreamy","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 51.3316,
  "lon": -0.8221,
  "alt": 76,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 430,
  "heading": 236,
  "water": -0.08
 },
 "surfaces": [{
   "id": "land",
   "kind": "heath",
   "poly": [[-3.2, 3.9],
    [3.2, 3.9],
    [2435.3, 3000],
    [-2435.3, 3000]]
  },
  {
   "id": "far-wood",
   "kind": "grass",
   "poly": [[-420, 118],
    [-60, 112],
    [-30, 124],
    [10, 130],
    [40, 126],
    [58, 108],
    [60, 60],
    [420, 40],
    [420, 700],
    [-420, 700]]
  },
  {
   "id": "headland",
   "kind": "grass",
   "poly": [[-60.27, 21.86],
    [-40.14, 18.88],
    [-23.45, 20.76],
    [-13.46, 23.14],
    [-10.98, 25.42],
    [-13.32, 29.09],
    [-17.17, 32.9],
    [-18.74, 36.73],
    [-20.81, 40.36],
    [-22.3, 43.93],
    [-24.69, 47.5],
    [-25.54, 50.22],
    [-27.24, 53.73],
    [-26.98, 57.53],
    [-26.81, 62.23],
    [-26.63, 66.16],
    [-27.99, 69.75],
    [-31.05, 74.35],
    [-34.56, 77.79],
    [-37.86, 81.21],
    [-43.63, 84.93],
    [-47.7, 88.32],
    [-50.54, 91.57],
    [-53.23, 95.81],
    [-57.92, 98.94],
    [-66.67, 103.01],
    [-77.24, 105.86],
    [-89.69, 103.74],
    [-110.71, 92.88],
    [-132.42, 76.1],
    [-140.26, 60.36],
    [-122.17, 45.2],
    [-89.59, 31.57]]
  },
  {
   "id": "bank-near",
   "kind": "grass",
   "poly": [[-11.02, 4.2],
    [-5.66, 3.41],
    [1.62, 3.5],
    [7.04, 4.2],
    [8.45, 5.83],
    [8.05, 8.09],
    [7.16, 9.57],
    [6.54, 9.75],
    [5.41, 9.17],
    [4.36, 8.57],
    [3.74, 8.29],
    [3.13, 7.87],
    [2.61, 7.56],
    [1.96, 7.34],
    [1.26, 7.08],
    [0.47, 6.96],
    [-0.43, 7.02],
    [-1.49, 7.2],
    [-2.36, 7.43],
    [-3.31, 7.66],
    [-4.23, 8],
    [-5.14, 8.35],
    [-6.05, 8.9],
    [-7.1, 9.52],
    [-8.07, 10.15],
    [-9.07, 11.13],
    [-10.2, 12.13],
    [-11.04, 12.07],
    [-11.8, 9.86],
    [-12.51, 6.61]]
  },
  {
   "id": "path",
   "kind": "path",
   "path": [[0.6, 3.9],
    [0.22, 4.13],
    [-0.33, 4.45],
    [-0.9, 4.8],
    [-1.45, 5.15],
    [-2.02, 5.53],
    [-2.6, 5.9],
    [-3.19, 6.26],
    [-3.78, 6.61],
    [-4.4, 7],
    [-5.04, 7.42],
    [-5.7, 7.88],
    [-6.4, 8.4],
    [-7.16, 8.98],
    [-7.96, 9.63],
    [-8.8, 10.4],
    [-9.78, 11.47],
    [-10.79, 12.66],
    [-11.5, 13.5]],
   "width": 1
  },
  {
   "id": "reeds-right",
   "kind": "grass",
   "poly": [[4.4, 9.4],
    [4.7, 10.15],
    [5.12, 11.23],
    [5.5, 12.4],
    [5.7, 13.62],
    [5.86, 14.93],
    [6.2, 16.2],
    [6.8, 17.39],
    [7.58, 18.54],
    [8.5, 19.6],
    [9.58, 20.5],
    [10.8, 21.3],
    [12.1, 22.2],
    [13.42, 23.12],
    [14.81, 24.13],
    [16.4, 25.6],
    [18.5, 28.1],
    [20.78, 31.07],
    [22.4, 33.2],
    [23.68, 32.22],
    [22.04, 30.11],
    [19.99, 26.9],
    [17.29, 24.77],
    [15.95, 22.76],
    [14.5, 21.61],
    [12.68, 21.36],
    [11.37, 20.46],
    [10.32, 19.5],
    [9.73, 18.34],
    [8.45, 17.87],
    [8.41, 16.44],
    [7.44, 15.73],
    [7.08, 14.69],
    [6.99, 13.44],
    [6.84, 12.07],
    [6.16, 10.86],
    [5.71, 9.75],
    [5.47, 8.97]]
  },
  {
   "id": "bank-open",
   "kind": "grass",
   "poly": [[-1.22, 7.12],
    [-0.3, 7.22],
    [1.05, 7.27],
    [2.22, 7.38],
    [3.04, 7.8],
    [3.79, 8.26],
    [4.17, 8.37],
    [4.23, 7.91],
    [3.86, 7.09],
    [3.4, 6.41],
    [2.75, 5.98],
    [1.99, 5.73],
    [1.17, 5.61],
    [0.44, 5.62],
    [-0.28, 5.78],
    [-0.81, 6.01],
    [-1.17, 6.35],
    [-1.39, 6.76]]
  },
  {
   "id": "reeds-near",
   "kind": "grass",
   "poly": [[-7.3, 10.5],
    [-6.86, 10.18],
    [-6.3, 9.8],
    [-5.74, 9.51],
    [-5.3, 9.3],
    [-5.48, 8.93],
    [-5.99, 9],
    [-6.71, 9.12],
    [-7.08, 9.86],
    [-7.6, 10.09]]
  },
  {
   "id": "reeds-left",
   "kind": "grass",
   "poly": [[-9.6, 15.9],
    [-10.15, 17.55],
    [-10.95, 19.95],
    [-11.9, 22.6],
    [-12.95, 25.37],
    [-14.14, 28.4],
    [-15.5, 31.6],
    [-17.11, 35.01],
    [-18.88, 38.59],
    [-20.6, 42.2],
    [-22.34, 46.19],
    [-24.03, 50.19],
    [-25.2, 53],
    [-25.98, 52.67],
    [-25.18, 49.71],
    [-23.26, 45.8],
    [-22.11, 41.51],
    [-19.76, 38.16],
    [-18.43, 34.37],
    [-16.43, 31.18],
    [-15.6, 27.8],
    [-14.32, 24.84],
    [-13.1, 22.16],
    [-12.2, 19.52],
    [-11.22, 17.19],
    [-10.56, 15.58]]
  },
  {
   "id": "reeds-far-r",
   "kind": "grass",
   "poly": [[52, 109],
    [50.61, 113.03],
    [48.5, 118.68],
    [45.5, 123.5],
    [41.13, 126.76],
    [35.87, 129.2],
    [31, 130.6],
    [26.67, 130.47],
    [22.72, 129.31],
    [20, 128.4],
    [19.46, 130],
    [22.09, 131.34],
    [26.24, 133.23],
    [31.26, 132.48],
    [36.69, 131.36],
    [42.02, 128.26],
    [47.64, 125.45],
    [51.75, 120.27],
    [53.24, 113.98],
    [54.05, 109.71]]
  },
  {
   "id": "reeds-far-l",
   "kind": "grass",
   "poly": [[-12, 127.6],
    [-14.74, 126.01],
    [-18.7, 123.75],
    [-23, 121.6],
    [-27.48, 119.96],
    [-32.3, 118.42],
    [-37, 116.6],
    [-41.89, 113.98],
    [-46.67, 111.07],
    [-50, 109],
    [-51.02, 110.64],
    [-47.8, 112.91],
    [-43.1, 116.1],
    [-38.56, 119.97],
    [-33.42, 121.58],
    [-28.27, 122.27],
    [-24.21, 124.4],
    [-19.78, 125.77],
    [-16.32, 128.77],
    [-13.09, 129.47]]
  },
  {
   "id": "pool",
   "kind": "water",
   "water": "pond",
   "poly": [[-7.5, 10.69],
    [-5.99, 9.58],
    [-4.74, 8.97],
    [-3.39, 8.33],
    [-2.23, 8.18],
    [-0.55, 7.87],
    [0.69, 7.81],
    [1.96, 8.04],
    [3.08, 8.39],
    [3.87, 9.09],
    [4.55, 9.9],
    [4.99, 11.11],
    [5.75, 12.46],
    [5.7, 14.55],
    [6.08, 16.38],
    [7.24, 18.03],
    [8.32, 19.85],
    [9.88, 20.51],
    [10.99, 21.7],
    [12.01, 22.44],
    [13.36, 23.22],
    [14.85, 24.43],
    [16.23, 25.62],
    [18.56, 27.98],
    [20.15, 30.76],
    [22.49, 33.33],
    [24.82, 37.04],
    [27.88, 40.54],
    [30.21, 44.96],
    [32.73, 50.06],
    [35.65, 56.53],
    [37.68, 63.02],
    [40.92, 70.54],
    [43.35, 78.17],
    [46.12, 86.18],
    [48.63, 93.66],
    [51.29, 101.47],
    [51.84, 108.21],
    [50.63, 113.69],
    [48.74, 118.97],
    [44.74, 122.76],
    [40.74, 126.47],
    [36.31, 128.55],
    [31.01, 130.14],
    [25.59, 129.28],
    [19.98, 127.47],
    [15.33, 126.84],
    [10.86, 129.22],
    [6.8, 132.21],
    [3.02, 133.91],
    [-1.29, 132.61],
    [-4.88, 129.91],
    [-8.67, 127.15],
    [-13.76, 124.99],
    [-18.18, 122.66],
    [-22.78, 121.17],
    [-27.61, 119.56],
    [-32.73, 117.99],
    [-37.06, 116.27],
    [-41.67, 113.5],
    [-47.27, 111.19],
    [-50.72, 108.26],
    [-53.22, 104.26],
    [-54.8, 100.56],
    [-54.57, 96.86],
    [-52.14, 93.77],
    [-48.24, 90.33],
    [-44.12, 86.83],
    [-39.98, 83.48],
    [-35.22, 80.62],
    [-31.37, 76.93],
    [-28.25, 73.41],
    [-26.54, 69.1],
    [-24.99, 64.95],
    [-24.85, 60.72],
    [-25.34, 56.78],
    [-25.55, 52.83],
    [-24.02, 49.37],
    [-22.44, 45.39],
    [-20.13, 41.78],
    [-18.67, 38.22],
    [-16.68, 34.8],
    [-15.27, 31.48],
    [-14.25, 28.23],
    [-12.69, 25.18],
    [-12.19, 22.64],
    [-10.85, 20.02],
    [-9.96, 17.69],
    [-9.52, 15.5],
    [-8.51, 13.76],
    [-8.31, 11.91]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "tree.wp-local-pool-pine",
   "at": [36, 140],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [42.5, 151],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [47, 136],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [29, 134],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [55, 162],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-5, 144],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pond-wood",
   "at": [-12, 140],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [3, 139],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-pond-birch",
   "at": [22, 132],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pond-wood",
   "at": [-30, 146],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [17, 146],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-34, 128],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [-26, 125],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [70, 120],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [62, 112],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [24, 215],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pond-wood",
   "at": [-2, 190],
   "variant": 3
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-26, 236],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-pond-wood",
   "at": [-50, 172],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [-40, 140],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-62, 150],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pond-oak",
   "at": [-20, 138],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pond-oak",
   "at": [58, 140],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [12, 137],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-pond-wood",
   "at": [84, 186],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [44, 160],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-37, 55],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-30.5, 63],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-36, 77],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [-52, 92],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [-24.5, 43.5],
   "variant": 0
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [-28, 49],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.wp-local-holly",
   "at": [-28, 58]
  },
  {
   "obj": "plant.wp-local-holly",
   "at": [-33, 70],
   "facing": 270
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [15.8, 23.4],
   "variant": 1
  },
  {
   "obj": "tree.wp-local-pool-birch",
   "at": [12.4, 19.2],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.wp-local-pool-pine",
   "at": [25.5, 31.4],
   "variant": 2
  },
  {
   "obj": "tree.wp-local-birch-heath",
   "at": [32.6, 40.3],
   "variant": 0
  },
  {
   "obj": "plant.wp-local-gorse",
   "at": [9.6, 15.4]
  },
  {
   "obj": "plant.wp-local-gorse",
   "at": [11.2, 17.6],
   "facing": 270
  },
  {
   "obj": "plant.wp-local-gorse",
   "at": [18.5, 23.4]
  },
  {
   "obj": "plant.grass",
   "at": [-1.03, 5.78],
   "variant": 2
  },
  {
   "obj": "plant.wp-local-wildflowers",
   "at": [-1.11, 6.95],
   "variant": 1
  },
  {
   "obj": "plant.wp-local-wildflowers",
   "at": [-2.15, 6.63],
   "variant": 0
  },
  {
   "obj": "plant.wp-local-wildflowers",
   "at": [-2.67, 7.14],
   "variant": 1
  },
  {
   "obj": "ground.log",
   "at": [2.6, 6.4],
   "variant": 1
  },
  {
   "obj": "plant.wp-local-bracken",
   "at": [-2.75, 4.45]
  },
  {
   "obj": "plant.wp-local-bracken",
   "at": [3.1, 5.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.2, 4.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.2, 4.5],
   "facing": 270
  },
  {
   "obj": "water.lily",
   "at": [-5.89, 13.85],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.35, 13.84],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.45, 13.76],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.03, 13.44],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.5, 13.32],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.49, 13.5],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-5.79, 13.72],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-2.51, 17.94],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-2.79, 16.86],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-3.31, 17.07],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-3.61, 16.49],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-2.49, 16.19],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-7.61, 22.42],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-7.54, 23.18],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-6.62, 22.17],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-8.29, 22.04],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-7.47, 20.71],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-8.21, 22.69],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [2.96, 16.58],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [3.92, 15.53],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [3.92, 15.72],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [3.5, 16.4],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [6.67, 58.63],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [8.27, 55.31],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [9.25, 60.17],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [6.47, 57.93],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-15.05, 67.19],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-11.59, 71.22],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-14.62, 72.42],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-15.76, 73.66],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-11.64, 68.28],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [-4.1, 14.8],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [-8.2, 20.3],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [4.6, 18.4],
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [10, 45],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [-12, 57],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [16, 68],
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [-18, 82],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [2, 105],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [-2, 38],
   "attach": "water"
  },
  {
   "obj": "water.fish-ring",
   "at": [14, 72],
   "variant": 1,
   "attach": "water"
  },
  {
   "cluster": "tree.far-birch",
   "on": "far-wood",
   "n": 10,
   "seed": 1097
  },
  {
   "cluster": "tree.wp-local-pond-wood",
   "on": "far-wood",
   "n": 12,
   "seed": 3349
  },
  {
   "cluster": "tree.far-pine",
   "on": "far-wood",
   "n": 12,
   "seed": 3002
  },
  {
   "cluster": "plant.wp-local-heather",
   "on": "far-wood",
   "n": 30,
   "seed": 3045
  },
  {
   "cluster": "plant.wp-local-gorse",
   "on": "far-wood",
   "n": 30,
   "seed": 2184
  },
  {
   "cluster": "plant.reed",
   "on": "reeds-far-r",
   "n": 10,
   "seed": 94,
   "edge": true
  },
  {
   "obj": "plant.bulrush",
   "at": [-47.23, 111.64]
  },
  {
   "obj": "plant.bulrush",
   "at": [-12.95, 128.93]
  },
  {
   "cluster": "plant.reed",
   "on": "reeds-far-l",
   "n": 9,
   "seed": 1842,
   "edge": true
  },
  {
   "obj": "plant.bulrush",
   "at": [47.65, 125.28]
  },
  {
   "cluster": "plant.wp-local-bracken",
   "on": "headland",
   "n": 23,
   "seed": 1433
  },
  {
   "cluster": "plant.wp-local-gorse",
   "on": "headland",
   "n": 8,
   "seed": 325
  },
  {
   "cluster": "plant.fern",
   "on": "headland",
   "n": 9,
   "seed": 8728
  },
  {
   "obj": "plant.reed",
   "at": [-17.76, 34.59]
  },
  {
   "cluster": "plant.reed",
   "on": "reeds-left",
   "n": 7,
   "seed": 6410,
   "edge": true
  },
  {
   "obj": "plant.grass-long",
   "at": [-11.75, 20.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-11.52, 20.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-13.8, 26.95]
  },
  {
   "obj": "plant.grass-long",
   "at": [-20.69, 41.03]
  },
  {
   "obj": "plant.grass",
   "at": [-1.42, 7.38]
  },
  {
   "obj": "plant.grass",
   "at": [-0.22, 7.4]
  },
  {
   "obj": "plant.grass",
   "at": [-0.89, 7.41]
  },
  {
   "obj": "plant.grass",
   "at": [0.87, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [0.98, 7.43]
  },
  {
   "obj": "plant.grass",
   "at": [-0.4, 7.44]
  },
  {
   "obj": "plant.grass",
   "at": [-1.66, 7.46]
  },
  {
   "obj": "plant.grass",
   "at": [1.17, 7.49]
  },
  {
   "obj": "plant.grass",
   "at": [-0.5, 7.77]
  },
  {
   "obj": "plant.grass",
   "at": [-1.47, 7.82]
  },
  {
   "obj": "plant.grass",
   "at": [-3.64, 8.14]
  },
  {
   "obj": "plant.grass",
   "at": [-4.92, 8.68]
  },
  {
   "obj": "plant.grass",
   "at": [8.22, 11.48]
  },
  {
   "obj": "plant.grass",
   "at": [7.79, 11.51]
  },
  {
   "obj": "plant.grass",
   "at": [7.21, 11.51]
  },
  {
   "obj": "plant.grass",
   "at": [7.99, 12.46]
  },
  {
   "obj": "plant.grass",
   "at": [-8.86, 13.15]
  },
  {
   "obj": "plant.grass",
   "at": [-8.47, 13.2]
  },
  {
   "obj": "plant.grass",
   "at": [10.16, 13.24]
  },
  {
   "obj": "plant.grass",
   "at": [9.31, 13.41]
  },
  {
   "obj": "plant.grass",
   "at": [-9.36, 13.52]
  },
  {
   "obj": "plant.grass",
   "at": [8.66, 13.57]
  },
  {
   "obj": "plant.grass",
   "at": [7.47, 13.61]
  },
  {
   "obj": "plant.grass",
   "at": [7.4, 14.17]
  },
  {
   "obj": "plant.grass",
   "at": [-10.04, 14.34]
  },
  {
   "obj": "plant.grass",
   "at": [10.82, 14.49]
  },
  {
   "obj": "plant.grass",
   "at": [-11.33, 15.09]
  },
  {
   "obj": "plant.grass",
   "at": [-10.61, 15.55]
  },
  {
   "obj": "plant.grass",
   "at": [-10.84, 16]
  },
  {
   "obj": "plant.grass",
   "at": [-12.47, 16.29]
  },
  {
   "obj": "plant.grass",
   "at": [-12.79, 20.18]
  },
  {
   "obj": "plant.grass",
   "at": [-13.14, 21.02]
  },
  {
   "obj": "plant.grass",
   "at": [14.64, 21.02]
  },
  {
   "obj": "plant.grass",
   "at": [18.68, 24.76]
  },
  {
   "obj": "plant.grass",
   "at": [20.52, 26.72]
  },
  {
   "obj": "plant.grass",
   "at": [-15.42, 31.6]
  },
  {
   "obj": "plant.grass",
   "at": [30.26, 39.41]
  },
  {
   "obj": "plant.bulrush",
   "at": [-13.27, 23.01]
  },
  {
   "obj": "plant.bulrush",
   "at": [-18.51, 36.96]
  },
  {
   "obj": "plant.bulrush",
   "at": [-19.89, 38.41]
  },
  {
   "obj": "plant.wp-local-gorse",
   "at": [9.6, 15.4]
  },
  {
   "obj": "plant.wp-local-gorse",
   "at": [11.2, 17.6]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.5, 7.33]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.45, 7.37]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.72, 7.39]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.5, 7.48]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.21, 7.49]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.32, 7.65]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.01, 7.76]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.89, 7.8]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.06, 8.18]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.39, 8.47]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.8, 8.73]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.73, 9.2]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [7.44, 9.94]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [7.65, 10.92]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [5.01, 10.96]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-7.73, 11.02]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-8.48, 11.72]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [7.65, 12.04]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-9.34, 12.16]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [8.6, 12.29]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [9.37, 12.42]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [6.94, 12.69]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [8.07, 13.26]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-10.22, 13.56]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [9.93, 13.92]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [8.17, 14.34]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-10.62, 14.63]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [7.11, 14.79]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-9.43, 15.22]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [11.48, 15.25]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [8.02, 15.26]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-11.23, 15.57]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [11.3, 15.82]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [12.52, 16.69]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-11.24, 17.18]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [8.71, 17.41]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-10.36, 18.33]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-10.62, 19.4]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-14.21, 21.01]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [22.87, 33.3]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [25.13, 35.06]
  },
  {
   "obj": "plant.reed",
   "at": [6.41, 13.96]
  },
  {
   "obj": "plant.reed",
   "at": [6.33, 15.55]
  },
  {
   "obj": "plant.reed",
   "at": [9.38, 18.84]
  },
  {
   "obj": "plant.reed",
   "at": [8.95, 19.97]
  },
  {
   "obj": "plant.reed",
   "at": [10.69, 20.36]
  },
  {
   "obj": "plant.reed",
   "at": [11.74, 21.47]
  },
  {
   "obj": "plant.reed",
   "at": [13.52, 22.46]
  },
  {
   "obj": "plant.reed",
   "at": [17.94, 25.84]
  },
  {
   "obj": "plant.reed",
   "at": [20.21, 28.28]
  },
  {
   "obj": "plant.reed",
   "at": [21.71, 31.07]
  },
  {
   "obj": "plant.reed",
   "at": [22.49, 32.35]
  },
  {
   "obj": "plant.bulrush",
   "at": [6.3, 11.88]
  },
  {
   "obj": "plant.bulrush",
   "at": [7.99, 16.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.7, 16.17]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.92, 7.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.8, 7.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.47, 8.1]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.63, 9.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [8.41, 11.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [7.75, 12.87]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.81, 12.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-8.61, 13.88]
  },
  {
   "obj": "plant.wp-local-bracken",
   "at": [6.18, 10.11]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.37, 10]
  },
  {
   "obj": "plant.reed",
   "at": [-6.06, 9.38]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.67, 4.3]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.28, 4.4]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2, 4.43]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.73, 4.43]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.69, 4.45]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.83, 4.46]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.89, 4.48]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-3.26, 4.5]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.41, 4.5]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.51, 4.5]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.79, 4.51]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.97, 4.6]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.06, 4.61]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.9, 4.62]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.5, 4.63]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.72, 4.64]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.91, 4.69]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.31, 4.72]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.92, 4.72]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.08, 4.76]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.09, 4.81]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.16, 4.81]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.38, 4.88]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.71, 4.9]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.7, 4.91]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2, 4.91]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-3.74, 4.93]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.15, 4.95]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.69, 4.97]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.01, 4.99]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.02, 5.06]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.79, 5.07]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.89, 5.09]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.35, 5.1]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.38, 5.11]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.16, 5.17]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.17, 5.17]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.51, 5.17]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.94, 5.2]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.96, 5.23]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.28, 5.23]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.44, 5.3]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.79, 5.32]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.13, 5.33]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.61, 5.35]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.56, 5.36]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-3.1, 5.39]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.7, 5.39]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.9, 5.43]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.54, 5.44]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2, 5.46]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.14, 5.49]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [0.15, 5.5]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.93, 5.54]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.14, 5.54]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.21, 5.61]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [1.87, 5.61]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.42, 5.73]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-0.43, 5.83]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.41, 5.86]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.48, 5.86]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [2.94, 5.88]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.44, 6.12]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.45, 6.12]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.26, 6.16]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.71, 6.17]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.75, 6.18]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.96, 6.21]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.31, 6.26]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.11, 6.34]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.56, 6.36]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.71, 6.38]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.01, 6.44]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.95, 6.47]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.79, 6.47]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.35, 6.58]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.56, 6.63]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.87, 6.63]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [3.84, 6.64]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.45, 6.76]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.26, 6.82]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.26, 6.82]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.77, 6.91]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-2.7, 6.97]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.24, 6.98]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.46, 6.99]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-1.64, 7.13]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.99, 7.4]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [-4.69, 7.95]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [5.58, 8.01]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.44, 8.35]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [6.14, 8.4]
  },
  {
   "obj": "plant.wp-local-heather",
   "at": [4.9, 8.61]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.2, 4.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.4, 4.43]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.07, 4.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.01, 4.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.2, 4.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.6, 4.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.35, 4.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.21, 4.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.39, 4.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.16, 4.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.57, 4.63]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.89, 4.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.94, 4.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.4, 4.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.85, 4.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.23, 4.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.47, 4.74]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.87, 4.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.24, 4.84]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.94, 4.85]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.98, 4.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.61, 4.86]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.18, 4.92]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.16, 4.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.48, 5]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.46, 5.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.57, 5.09]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.91, 5.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.4, 5.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.26, 5.25]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.23, 5.26]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.51, 5.29]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.86, 5.31]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.88, 5.32]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.32, 5.36]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.72, 5.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.45, 5.39]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.18, 5.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.23, 5.47]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.1, 5.48]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.02, 5.51]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.51, 5.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.6, 5.53]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.45, 5.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.21, 5.59]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.22, 5.6]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.53, 5.64]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.69, 5.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [2.47, 5.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [-0.81, 5.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.37, 6.07]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.89, 6.13]
  },
  {
   "obj": "plant.grass-long",
   "at": [-4.4, 6.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.58, 6.23]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.91, 6.44]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.65, 6.56]
  },
  {
   "obj": "plant.grass-long",
   "at": [3.68, 6.58]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.99, 6.67]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.32, 6.71]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.92, 6.73]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.58, 6.78]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.37, 6.87]
  },
  {
   "obj": "plant.grass-long",
   "at": [4, 6.96]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.14, 6.98]
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.6, 7]
  },
  {
   "obj": "plant.grass",
   "at": [3.37, 4.38]
  },
  {
   "obj": "plant.grass",
   "at": [1.9, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [-2.67, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [1.13, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [-3.26, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [-1.5, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [-2.2, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [1.57, 4.41]
  },
  {
   "obj": "plant.grass",
   "at": [2.99, 4.42]
  },
  {
   "obj": "plant.grass",
   "at": [-1.81, 4.42]
  },
  {
   "obj": "plant.grass",
   "at": [2.66, 4.43]
  },
  {
   "obj": "plant.grass",
   "at": [-2.13, 4.43]
  },
  {
   "obj": "plant.grass",
   "at": [1.67, 4.44]
  },
  {
   "obj": "plant.grass",
   "at": [2.91, 4.45]
  },
  {
   "obj": "plant.grass",
   "at": [-2.39, 4.46]
  },
  {
   "obj": "plant.grass",
   "at": [0.93, 4.47]
  },
  {
   "obj": "plant.grass",
   "at": [3.39, 4.47]
  },
  {
   "obj": "plant.grass",
   "at": [1.84, 4.47]
  },
  {
   "obj": "plant.grass",
   "at": [-1.62, 4.49]
  },
  {
   "obj": "plant.grass",
   "at": [0.64, 4.49]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 4.49]
  },
  {
   "obj": "plant.grass",
   "at": [2.53, 4.5]
  },
  {
   "obj": "plant.grass",
   "at": [3.19, 4.51]
  },
  {
   "obj": "plant.grass",
   "at": [3.29, 4.52]
  },
  {
   "obj": "plant.grass",
   "at": [2.19, 4.53]
  },
  {
   "obj": "plant.grass",
   "at": [1.11, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [1.35, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [-3.15, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [2.07, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [-2.82, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [2.28, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [-1.97, 4.55]
  },
  {
   "obj": "plant.grass",
   "at": [-3, 4.56]
  },
  {
   "obj": "plant.grass",
   "at": [-2.57, 4.58]
  },
  {
   "obj": "plant.grass",
   "at": [-2.11, 4.58]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 4.58]
  },
  {
   "obj": "plant.grass",
   "at": [2.72, 4.6]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 4.6]
  },
  {
   "obj": "plant.grass",
   "at": [2.87, 4.61]
  },
  {
   "obj": "plant.grass",
   "at": [-3.54, 4.61]
  },
  {
   "obj": "plant.grass",
   "at": [-2.5, 4.62]
  },
  {
   "obj": "plant.grass",
   "at": [-2.35, 4.62]
  },
  {
   "obj": "plant.grass",
   "at": [-2.79, 4.62]
  },
  {
   "obj": "plant.grass",
   "at": [-3.1, 4.62]
  },
  {
   "obj": "plant.grass",
   "at": [0.44, 4.64]
  },
  {
   "obj": "plant.grass",
   "at": [1.73, 4.64]
  },
  {
   "obj": "plant.grass",
   "at": [-2.07, 4.64]
  },
  {
   "obj": "plant.grass",
   "at": [-2.22, 4.64]
  },
  {
   "obj": "plant.grass",
   "at": [-1.72, 4.65]
  },
  {
   "obj": "plant.grass",
   "at": [-1.66, 4.65]
  },
  {
   "obj": "plant.grass",
   "at": [3.08, 4.65]
  },
  {
   "obj": "plant.grass",
   "at": [0.38, 4.66]
  },
  {
   "obj": "plant.grass",
   "at": [3.25, 4.67]
  },
  {
   "obj": "plant.grass",
   "at": [2.57, 4.68]
  },
  {
   "obj": "plant.grass",
   "at": [-2.72, 4.7]
  },
  {
   "obj": "plant.grass",
   "at": [2.33, 4.71]
  },
  {
   "obj": "plant.grass",
   "at": [-3.56, 4.71]
  },
  {
   "obj": "plant.grass",
   "at": [2.47, 4.71]
  },
  {
   "obj": "plant.grass",
   "at": [3.37, 4.72]
  },
  {
   "obj": "plant.grass",
   "at": [1.42, 4.72]
  },
  {
   "obj": "plant.grass",
   "at": [-3.09, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [0.66, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [0.85, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [1.13, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [-2.36, 4.74]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 4.74]
  },
  {
   "obj": "plant.grass",
   "at": [1.53, 4.75]
  },
  {
   "obj": "plant.grass",
   "at": [-2.18, 4.77]
  },
  {
   "obj": "plant.grass",
   "at": [1.26, 4.77]
  },
  {
   "obj": "plant.grass",
   "at": [1.38, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [1.89, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [-3.24, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [2.02, 4.8]
  },
  {
   "obj": "plant.grass",
   "at": [1.88, 4.8]
  },
  {
   "obj": "plant.grass",
   "at": [2.18, 4.8]
  },
  {
   "obj": "plant.grass",
   "at": [3.04, 4.81]
  },
  {
   "obj": "plant.grass",
   "at": [-2.15, 4.84]
  },
  {
   "obj": "plant.grass",
   "at": [0.03, 4.84]
  },
  {
   "obj": "plant.grass",
   "at": [1.12, 4.86]
  },
  {
   "obj": "plant.grass",
   "at": [-2.75, 4.87]
  },
  {
   "obj": "plant.grass",
   "at": [1.05, 4.87]
  },
  {
   "obj": "plant.grass",
   "at": [2.98, 4.88]
  },
  {
   "obj": "plant.grass",
   "at": [2.32, 4.88]
  },
  {
   "obj": "plant.grass",
   "at": [3.36, 4.89]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 4.91]
  },
  {
   "obj": "plant.grass",
   "at": [1.85, 4.91]
  },
  {
   "obj": "plant.grass",
   "at": [1.22, 4.91]
  },
  {
   "obj": "plant.grass",
   "at": [0.78, 4.92]
  },
  {
   "obj": "plant.grass",
   "at": [3.56, 4.92]
  },
  {
   "obj": "plant.grass",
   "at": [1.07, 4.92]
  },
  {
   "obj": "plant.grass",
   "at": [0.7, 4.92]
  },
  {
   "obj": "plant.grass",
   "at": [-2.9, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [2.53, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [-2.44, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [0.39, 4.94]
  },
  {
   "obj": "plant.grass",
   "at": [-0.08, 4.94]
  },
  {
   "obj": "plant.grass",
   "at": [-2.65, 4.95]
  },
  {
   "obj": "plant.grass",
   "at": [0.88, 4.97]
  },
  {
   "obj": "plant.grass",
   "at": [1.62, 4.97]
  },
  {
   "obj": "plant.grass",
   "at": [0.51, 4.98]
  },
  {
   "obj": "plant.grass",
   "at": [0.08, 5]
  },
  {
   "obj": "plant.grass",
   "at": [2.72, 5.02]
  },
  {
   "obj": "plant.grass",
   "at": [1.55, 5.02]
  },
  {
   "obj": "plant.grass",
   "at": [0.23, 5.03]
  },
  {
   "obj": "plant.grass",
   "at": [0.28, 5.03]
  },
  {
   "obj": "plant.grass",
   "at": [2.65, 5.03]
  },
  {
   "obj": "plant.grass",
   "at": [-2.9, 5.04]
  },
  {
   "obj": "plant.grass",
   "at": [2.37, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [-3.34, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [0.17, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [-0.24, 5.07]
  },
  {
   "obj": "plant.grass",
   "at": [1.11, 5.08]
  },
  {
   "obj": "plant.grass",
   "at": [0.35, 5.08]
  },
  {
   "obj": "plant.grass",
   "at": [3.47, 5.09]
  },
  {
   "obj": "plant.grass",
   "at": [3.29, 5.09]
  },
  {
   "obj": "plant.grass",
   "at": [1.04, 5.09]
  },
  {
   "obj": "plant.grass",
   "at": [-2.42, 5.09]
  },
  {
   "obj": "plant.grass",
   "at": [0.47, 5.1]
  },
  {
   "obj": "plant.grass",
   "at": [3.15, 5.1]
  },
  {
   "obj": "plant.grass",
   "at": [3.83, 5.11]
  },
  {
   "obj": "plant.grass",
   "at": [2.07, 5.12]
  },
  {
   "obj": "plant.grass",
   "at": [-3.85, 5.12]
  },
  {
   "obj": "plant.grass",
   "at": [-3.21, 5.12]
  },
  {
   "obj": "plant.grass",
   "at": [-3.31, 5.13]
  },
  {
   "obj": "plant.grass",
   "at": [-2.84, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [3.71, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [2.92, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [-2.56, 5.17]
  },
  {
   "obj": "plant.grass",
   "at": [-3.11, 5.18]
  },
  {
   "obj": "plant.grass",
   "at": [0.73, 5.19]
  },
  {
   "obj": "plant.grass",
   "at": [0.99, 5.19]
  },
  {
   "obj": "plant.grass",
   "at": [-2.76, 5.2]
  },
  {
   "obj": "plant.grass",
   "at": [3.04, 5.2]
  },
  {
   "obj": "plant.grass",
   "at": [0.05, 5.21]
  },
  {
   "obj": "plant.grass",
   "at": [-3.05, 5.21]
  },
  {
   "obj": "plant.grass",
   "at": [2.11, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [-0.1, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [3.44, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [-0.01, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [2.84, 5.24]
  },
  {
   "obj": "plant.grass",
   "at": [-3.64, 5.25]
  },
  {
   "obj": "plant.grass",
   "at": [2.35, 5.27]
  },
  {
   "obj": "plant.grass",
   "at": [1.51, 5.27]
  },
  {
   "obj": "plant.grass",
   "at": [4, 5.27]
  },
  {
   "obj": "plant.grass",
   "at": [-3.84, 5.28]
  },
  {
   "obj": "plant.grass",
   "at": [-3.59, 5.28]
  },
  {
   "obj": "plant.grass",
   "at": [2.51, 5.3]
  },
  {
   "obj": "plant.grass",
   "at": [-0.24, 5.31]
  },
  {
   "obj": "plant.grass",
   "at": [-3.54, 5.31]
  },
  {
   "obj": "plant.grass",
   "at": [2.79, 5.31]
  },
  {
   "obj": "plant.grass",
   "at": [-2.7, 5.32]
  },
  {
   "obj": "plant.grass",
   "at": [1.16, 5.32]
  },
  {
   "obj": "plant.grass",
   "at": [1.08, 5.32]
  },
  {
   "obj": "plant.grass",
   "at": [3.67, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [1.25, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [1.38, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [3.22, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 5.35]
  },
  {
   "obj": "plant.grass",
   "at": [2.46, 5.35]
  },
  {
   "obj": "plant.grass",
   "at": [2.06, 5.35]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 5.36]
  },
  {
   "obj": "plant.grass",
   "at": [0.24, 5.36]
  },
  {
   "obj": "plant.grass",
   "at": [3.35, 5.36]
  },
  {
   "obj": "plant.grass",
   "at": [3.92, 5.37]
  },
  {
   "obj": "plant.grass",
   "at": [0.59, 5.37]
  },
  {
   "obj": "plant.grass",
   "at": [3.06, 5.38]
  },
  {
   "obj": "plant.grass",
   "at": [0.98, 5.39]
  },
  {
   "obj": "plant.grass",
   "at": [-3.27, 5.41]
  },
  {
   "obj": "plant.grass",
   "at": [-3.84, 5.42]
  },
  {
   "obj": "plant.grass",
   "at": [2.35, 5.43]
  },
  {
   "obj": "plant.grass",
   "at": [-0.84, 5.44]
  },
  {
   "obj": "plant.grass",
   "at": [-0.36, 5.48]
  },
  {
   "obj": "plant.grass",
   "at": [0.02, 5.48]
  },
  {
   "obj": "plant.grass",
   "at": [-0.46, 5.5]
  },
  {
   "obj": "plant.grass",
   "at": [-2.91, 5.5]
  },
  {
   "obj": "plant.grass",
   "at": [3.06, 5.51]
  },
  {
   "obj": "plant.grass",
   "at": [0.42, 5.52]
  },
  {
   "obj": "plant.grass",
   "at": [3.66, 5.52]
  },
  {
   "obj": "plant.grass",
   "at": [-3.73, 5.53]
  },
  {
   "obj": "plant.grass",
   "at": [-0.19, 5.54]
  },
  {
   "obj": "plant.grass",
   "at": [3.34, 5.55]
  },
  {
   "obj": "plant.grass",
   "at": [-0.28, 5.55]
  },
  {
   "obj": "plant.grass",
   "at": [0.79, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [-3.87, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [-3.46, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [1.6, 5.57]
  },
  {
   "obj": "plant.grass",
   "at": [1.29, 5.59]
  },
  {
   "obj": "plant.grass",
   "at": [4.04, 5.6]
  },
  {
   "obj": "plant.grass",
   "at": [-3.18, 5.61]
  },
  {
   "obj": "plant.grass",
   "at": [-4.04, 5.61]
  },
  {
   "obj": "plant.grass",
   "at": [3.82, 5.61]
  },
  {
   "obj": "plant.grass",
   "at": [3.31, 5.62]
  },
  {
   "obj": "plant.grass",
   "at": [2.14, 5.62]
  },
  {
   "obj": "plant.grass",
   "at": [3.62, 5.62]
  },
  {
   "obj": "plant.grass",
   "at": [0.34, 5.63]
  },
  {
   "obj": "plant.grass",
   "at": [2.38, 5.63]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 5.64]
  },
  {
   "obj": "plant.grass",
   "at": [2.56, 5.64]
  },
  {
   "obj": "plant.grass",
   "at": [-0.68, 5.65]
  },
  {
   "obj": "plant.grass",
   "at": [-0.91, 5.68]
  },
  {
   "obj": "plant.grass",
   "at": [-0.99, 5.68]
  },
  {
   "obj": "plant.grass",
   "at": [1.82, 5.7]
  },
  {
   "obj": "plant.grass",
   "at": [4.38, 5.7]
  },
  {
   "obj": "plant.grass",
   "at": [-0.13, 5.72]
  },
  {
   "obj": "plant.grass",
   "at": [-0.05, 5.72]
  },
  {
   "obj": "plant.grass",
   "at": [3.11, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [4.23, 5.73]
  },
  {
   "obj": "plant.grass",
   "at": [3.29, 5.74]
  },
  {
   "obj": "plant.grass",
   "at": [-3.37, 5.75]
  },
  {
   "obj": "plant.grass",
   "at": [3.04, 5.76]
  },
  {
   "obj": "plant.grass",
   "at": [3.65, 5.76]
  },
  {
   "obj": "plant.grass",
   "at": [-1.37, 5.77]
  },
  {
   "obj": "plant.grass",
   "at": [-0.33, 5.78]
  },
  {
   "obj": "plant.grass",
   "at": [-1.03, 5.78]
  },
  {
   "obj": "plant.grass",
   "at": [-3.91, 5.82]
  },
  {
   "obj": "plant.grass",
   "at": [2.99, 5.83]
  },
  {
   "obj": "plant.grass",
   "at": [-0.51, 5.84]
  },
  {
   "obj": "plant.grass",
   "at": [-1.35, 5.86]
  },
  {
   "obj": "plant.grass",
   "at": [-3.71, 5.86]
  },
  {
   "obj": "plant.grass",
   "at": [-3.62, 5.87]
  },
  {
   "obj": "plant.grass",
   "at": [-1.62, 5.88]
  },
  {
   "obj": "plant.grass",
   "at": [3.83, 5.88]
  },
  {
   "obj": "plant.grass",
   "at": [4.08, 5.89]
  },
  {
   "obj": "plant.grass",
   "at": [4.47, 5.89]
  },
  {
   "obj": "plant.grass",
   "at": [2.81, 5.9]
  },
  {
   "obj": "plant.grass",
   "at": [-0.73, 5.92]
  },
  {
   "obj": "plant.grass",
   "at": [3.57, 5.92]
  },
  {
   "obj": "plant.grass",
   "at": [2.71, 5.93]
  },
  {
   "obj": "plant.grass",
   "at": [-0.92, 5.95]
  },
  {
   "obj": "plant.grass",
   "at": [-1.17, 5.95]
  },
  {
   "obj": "plant.grass",
   "at": [-1.77, 5.97]
  },
  {
   "obj": "plant.grass",
   "at": [-1.32, 5.98]
  },
  {
   "obj": "plant.grass",
   "at": [-4.34, 5.98]
  },
  {
   "obj": "plant.grass",
   "at": [-1.5, 5.99]
  },
  {
   "obj": "plant.grass",
   "at": [4.47, 5.99]
  },
  {
   "obj": "plant.grass",
   "at": [4.28, 6.01]
  },
  {
   "obj": "plant.grass",
   "at": [-3.98, 6.06]
  },
  {
   "obj": "plant.grass",
   "at": [-1.61, 6.11]
  },
  {
   "obj": "plant.grass",
   "at": [-4.16, 6.11]
  },
  {
   "obj": "plant.grass",
   "at": [-4.54, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [2.99, 6.13]
  },
  {
   "obj": "plant.grass",
   "at": [4.72, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.12, 6.17]
  },
  {
   "obj": "plant.grass",
   "at": [-1.28, 6.22]
  },
  {
   "obj": "plant.grass",
   "at": [3.16, 6.25]
  },
  {
   "obj": "plant.grass",
   "at": [-2.31, 6.31]
  },
  {
   "obj": "plant.grass",
   "at": [-1.55, 6.35]
  },
  {
   "obj": "plant.grass",
   "at": [4.27, 6.37]
  },
  {
   "obj": "plant.grass",
   "at": [4.67, 6.39]
  },
  {
   "obj": "plant.grass",
   "at": [-4.46, 6.4]
  },
  {
   "obj": "plant.grass",
   "at": [4.63, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [4.88, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [-1.68, 6.45]
  },
  {
   "obj": "plant.grass",
   "at": [-2.24, 6.5]
  },
  {
   "obj": "plant.grass",
   "at": [4.02, 6.5]
  },
  {
   "obj": "plant.grass",
   "at": [-4.92, 6.51]
  },
  {
   "obj": "plant.grass",
   "at": [-4.67, 6.53]
  },
  {
   "obj": "plant.grass",
   "at": [-5.05, 6.56]
  },
  {
   "obj": "plant.grass",
   "at": [-1.39, 6.61]
  },
  {
   "obj": "plant.grass",
   "at": [5.11, 6.62]
  },
  {
   "obj": "plant.grass",
   "at": [3.63, 6.74]
  },
  {
   "obj": "plant.grass",
   "at": [-2.95, 6.77]
  },
  {
   "obj": "plant.grass",
   "at": [-1.95, 6.79]
  },
  {
   "obj": "plant.grass",
   "at": [-1.83, 6.8]
  },
  {
   "obj": "plant.grass",
   "at": [-2.14, 6.8]
  },
  {
   "obj": "plant.grass",
   "at": [-2.86, 6.82]
  },
  {
   "obj": "plant.grass",
   "at": [4.93, 6.87]
  },
  {
   "obj": "plant.grass",
   "at": [-5.24, 6.88]
  },
  {
   "obj": "plant.grass",
   "at": [5.29, 6.93]
  },
  {
   "obj": "plant.grass",
   "at": [-2.53, 6.94]
  },
  {
   "obj": "plant.grass",
   "at": [4.47, 7.02]
  },
  {
   "obj": "plant.grass",
   "at": [-3.46, 7.06]
  },
  {
   "obj": "plant.grass",
   "at": [-2, 7.13]
  },
  {
   "obj": "plant.grass",
   "at": [-3.39, 7.13]
  },
  {
   "obj": "plant.grass",
   "at": [4.89, 7.14]
  },
  {
   "obj": "plant.grass",
   "at": [-3.11, 7.15]
  },
  {
   "obj": "plant.grass",
   "at": [-2.14, 7.2]
  },
  {
   "obj": "plant.grass",
   "at": [-1.97, 7.2]
  },
  {
   "obj": "plant.grass",
   "at": [3.93, 7.21]
  },
  {
   "obj": "plant.grass",
   "at": [-3.65, 7.22]
  },
  {
   "obj": "plant.grass",
   "at": [-2.41, 7.31]
  },
  {
   "obj": "plant.grass",
   "at": [5.41, 7.32]
  },
  {
   "obj": "plant.grass",
   "at": [5.56, 7.34]
  },
  {
   "obj": "plant.grass",
   "at": [4.6, 7.35]
  },
  {
   "obj": "plant.grass",
   "at": [-2.28, 7.36]
  },
  {
   "obj": "plant.grass",
   "at": [4.34, 7.42]
  },
  {
   "obj": "plant.grass",
   "at": [-2.99, 7.42]
  },
  {
   "obj": "plant.grass",
   "at": [-3.15, 7.44]
  },
  {
   "obj": "plant.grass",
   "at": [4.76, 7.45]
  },
  {
   "obj": "plant.grass",
   "at": [5.38, 7.48]
  },
  {
   "obj": "plant.grass",
   "at": [-3.26, 7.56]
  },
  {
   "obj": "plant.grass",
   "at": [-3.82, 7.58]
  },
  {
   "obj": "plant.grass",
   "at": [4.71, 7.75]
  },
  {
   "obj": "plant.grass-long",
   "at": [0.66, 6.5]
  },
  {
   "obj": "plant.grass-long",
   "at": [4.09, 7.79]
  },
  {
   "obj": "plant.wp-local-wildflowers",
   "at": [1.39, 6.38]
  },
  {
   "obj": "plant.wp-local-wildflowers",
   "at": [2.58, 6.83]
  }],
 "landmarks": [{
   "obj": "structure.wp-bivvy",
   "at": [-27.5, 125.5],
   "src": "converted from proof-wyndhams-pool/hampshire-wyndhams-pool-dusk: check the listing"
  },
  {
   "obj": "structure.wp-angler-platform",
   "at": [-9.1, 14],
   "src": "converted from proof-wyndhams-pool/hampshire-wyndhams-pool-dusk: check the listing"
  }],
 "life": [{
   "who": "heron",
   "count": 1,
   "on": "pool",
   "state": "stalk"
  },
  {
   "who": "coot",
   "count": 2,
   "on": "pool"
  },
  {
   "who": "mallard",
   "count": 2,
   "on": "pool"
  },
  {
   "who": "kingfisher",
   "count": 2,
   "on": "pool"
  }],
 "backdrop": {
  "style": "woodland"
 },
 "seed": 1
});
})();
