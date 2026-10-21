/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-proof-yateley-green-w3: converted by `node tools/world.mjs convert proof-yateley-green/hampshire-proof-yateley-green`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (13):
     - place[0]: landmark landmark.st-peters-yateley: src is a placeholder; give the listing or map reference
     - actors[5]: actor water.proof-splash: no life class; dropped
     - actors[13]: actor prop.proof-ball: no life class; dropped
     - actors[14]: actor prop.proof-ball: no life class; dropped
     - backdrop: backdrop style 'woodland' chosen from the place and the water; check it against the real view
     - entities[58].at: repair: removed (badAttach) plant.proof-yg-rushes attaches to water but stands on grass
     - entities[87]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[23]) by 1.2 m
     - entities[88]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[24]) by 1.2 m
     - entities[89]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[25]) by 1.2 m
     - entities[90]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[26]) by 1.2 m
     - entities[91]: repair: removed (overlap) plant.hedge overlaps plant.hedge (entities[27]) by 1.2 m
     - landmarks[0]: repair: removed (blocksPath) landmark.st-peters-yateley covers the whole width of path
     - life[1].who: repair: removed (unknownWho) unknown population traffic
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-proof-yateley-green-w3","label":"Yateley Green, Hampshire","site":"Yateley Green — the pond, the oaks and St Peter's","tags":["uk","south east","hampshire","landscape","village green","pond","church","heron","ducklings","dog","world-v3"],"liveSky":{"lat":51.3427,"lon":-0.8301},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.3427,
  "lon": -0.8301,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.7,
  "fov": 64,
  "horizon": 440,
  "heading": 32
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.3, 4.3],
    [3.3, 4.3],
    [2343.3, 3000],
    [-2343.3, 3000]]
  },
  {
   "id": "fields",
   "kind": "field",
   "poly": [[-117.2, 150],
    [117.2, 150],
    [1562.2, 2000],
    [-1562.2, 2000]]
  },
  {
   "id": "gardens",
   "kind": "grass",
   "poly": [[-260, 92],
    [-40, 101],
    [10, 104.5],
    [60, 109.5],
    [130, 116.5],
    [260, 128.5],
    [260, 152],
    [130, 150],
    [60, 152],
    [0, 150],
    [-120, 150],
    [-260, 145]]
  },
  {
   "id": "churchyard",
   "kind": "grass",
   "poly": [[-25.6, 107],
    [-3.6, 108.5],
    [18.4, 111],
    [26.4, 130],
    [20.4, 152],
    [-13.6, 154],
    [-29.6, 140],
    [-31.6, 118]]
  },
  {
   "id": "lane",
   "kind": "road",
   "path": [[-260, 88],
    [-120, 93],
    [-40, 97.5],
    [10, 101],
    [60, 106],
    [130, 113],
    [260, 125]],
   "width": 5.2
  },
  {
   "id": "meadow-far",
   "kind": "field",
   "poly": [[-39.88, 29.07],
    [-31.13, 29.02],
    [-19.85, 30.59],
    [-13.69, 29.55],
    [-8.87, 28.58],
    [-5.34, 28.84],
    [-1.87, 29.28],
    [1.71, 27.61],
    [5.01, 26.5],
    [7.37, 28.12],
    [8.43, 30.96],
    [7.02, 34.27],
    [3.89, 37.43],
    [-0.4, 39.83],
    [-6.06, 40.97],
    [-11.59, 40.33],
    [-18.09, 39.45],
    [-26.31, 41.51],
    [-33.96, 42.02],
    [-39.29, 35.54]]
  },
  {
   "id": "meadow-near",
   "kind": "field",
   "poly": [[-20.05, 5.97],
    [-14.87, 5.89],
    [-9.43, 6.44],
    [-6.98, 6.9],
    [-5.56, 7.56],
    [-4.18, 8.51],
    [-3.58, 9.41],
    [-3.79, 10.18],
    [-5.22, 10.59],
    [-8.1, 10.49],
    [-12.02, 10.19],
    [-17.52, 10.23],
    [-21.95, 9.83],
    [-22.28, 7.85]]
  },
  {
   "id": "meadow-right",
   "kind": "field",
   "poly": [[8.77, 4.98],
    [10.19, 5.15],
    [11.99, 6.2],
    [13.53, 7.62],
    [14.99, 9.5],
    [16.35, 11.85],
    [16.94, 13.96],
    [15.79, 15.19],
    [14.04, 15.52],
    [12.14, 14.31],
    [10.56, 12.54],
    [9.35, 10.61],
    [8.55, 8.57],
    [8.36, 6.47]]
  },
  {
   "id": "uncut-b",
   "kind": "field",
   "poly": [[6.21, 6.61],
    [6.77, 6.2],
    [7.54, 6.17],
    [8.57, 6.61],
    [9.38, 7.39],
    [9.42, 8.54],
    [9.03, 9.62],
    [8.22, 10.13],
    [7.37, 10.18],
    [6.86, 9.59],
    [6.37, 8.58],
    [6.14, 7.52]]
  },
  {
   "id": "bank",
   "kind": "grass",
   "poly": [[-7.85, 9.09],
    [-7.53, 9.13],
    [-6.91, 9.31],
    [-5.82, 9.51],
    [-4.53, 9.82],
    [-3.52, 10.2],
    [-2.65, 10.66],
    [-2.02, 11.16],
    [-1.55, 11.53],
    [-0.83, 11.84],
    [-0.02, 12.24],
    [0.69, 12.81],
    [1.26, 13.49],
    [1.84, 14.42],
    [2.08, 15.5],
    [1.92, 16.52],
    [1.73, 17.27],
    [1.9, 17.98],
    [2.29, 18.8],
    [2.86, 19.66],
    [3.53, 20.82],
    [3.76, 22.28],
    [3.61, 23.79],
    [2.92, 25.11],
    [2.02, 25.97],
    [1.12, 26.76],
    [-0.11, 27.65],
    [-1.66, 28.12],
    [-3.02, 28.51],
    [-4.61, 29],
    [-6.19, 29.36],
    [-7.51, 29.18],
    [-8.82, 28.63],
    [-9.76, 27.96],
    [-10.15, 27.74],
    [-10.53, 28.12],
    [-11.35, 29.11],
    [-12.71, 30.34],
    [-14.42, 31.21],
    [-16.05, 30.95],
    [-17.2, 30.04],
    [-17.8, 28.84],
    [-18.07, 27.26],
    [-17.61, 25.6],
    [-16.95, 23.96],
    [-16.32, 22.4],
    [-15.86, 20.67],
    [-15.29, 18.8],
    [-14.69, 16.97],
    [-14.02, 15.39],
    [-13.47, 14.16],
    [-13.39, 12.87],
    [-13.27, 11.47],
    [-12.57, 10.42],
    [-11.66, 9.79],
    [-10.6, 9.49],
    [-9.52, 9.41],
    [-8.69, 9.52]]
  },
  {
   "id": "path",
   "kind": "path",
   "path": [[2.5, 4.2],
    [4.3, 7.4],
    [4.9, 10.4],
    [5.1, 13.4],
    [6.3, 17.4],
    [8.8, 22.8],
    [8.4, 29.5],
    [7.4, 37.5],
    [6, 49.5],
    [5, 63.5],
    [4.8, 80],
    [4.5, 96],
    [4, 108]],
   "width": 1.7
  },
  {
   "id": "pond",
   "kind": "water",
   "water": "pond",
   "poly": [[-8.36, 10.64],
    [-7.78, 10.75],
    [-7, 10.85],
    [-5.86, 10.86],
    [-4.64, 10.92],
    [-3.73, 11.07],
    [-2.96, 11.32],
    [-2.41, 11.69],
    [-1.93, 12.08],
    [-1.23, 12.49],
    [-0.56, 12.92],
    [-0.03, 13.44],
    [0.45, 14.07],
    [0.97, 14.84],
    [1.19, 15.59],
    [1.14, 16.46],
    [1.05, 17.33],
    [1.29, 18.19],
    [1.66, 19.08],
    [2.1, 19.99],
    [2.51, 21.01],
    [2.49, 22.12],
    [2.23, 23.22],
    [1.69, 24.06],
    [0.89, 24.79],
    [0.03, 25.65],
    [-0.87, 26.52],
    [-2.14, 27.11],
    [-3.39, 27.71],
    [-4.85, 28.35],
    [-6.25, 28.77],
    [-7.33, 28.62],
    [-8.45, 28.07],
    [-9.3, 27.32],
    [-10.17, 26.82],
    [-11.16, 27.36],
    [-12.08, 28.41],
    [-13.3, 29.58],
    [-14.64, 30.38],
    [-15.76, 30.24],
    [-16.64, 29.58],
    [-17.07, 28.65],
    [-17.22, 27.39],
    [-16.67, 26.05],
    [-15.85, 24.57],
    [-14.99, 22.99],
    [-14.34, 21.18],
    [-13.73, 19.27],
    [-13.2, 17.4],
    [-12.7, 15.74],
    [-12.35, 14.23],
    [-12.52, 12.78],
    [-12.62, 11.59],
    [-12.16, 10.78],
    [-11.46, 10.27],
    [-10.55, 10.09],
    [-9.64, 10.13],
    [-9.02, 10.34]],
   "shallow": 1.5
  }],
 "entities": [{
   "obj": "tree.proof-yew",
   "at": [-20.1, 117],
   "variant": 0
  },
  {
   "obj": "tree.proof-yew",
   "at": [16.4, 128],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "building.proof-yg-thatched-cottage",
   "at": [-38, 109],
   "variant": 0
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [-35.18, 106.17],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-38, 106.6],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-green-cottage",
   "at": [35, 114],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [35.26, 111.16],
   "variant": 1
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [35, 111.6],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-thatched-cottage",
   "at": [58, 121.5],
   "variant": 1
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [56.07, 118.41],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [58, 119.1],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-green-cottage",
   "at": [-56, 124],
   "variant": 2
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [-51.52, 120.59],
   "variant": 3
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-56, 121.6],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-green-cottage",
   "at": [77, 129],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [73.65, 125.41],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [77, 126.6],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-thatched-cottage",
   "at": [-84, 138],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [-84.81, 134.48],
   "variant": 1
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-84, 135.6],
   "variant": 3
  },
  {
   "obj": "building.proof-yg-green-cottage",
   "at": [98, 134],
   "variant": 0
  },
  {
   "obj": "plant.proof-yg-shrubs",
   "at": [99.29, 130.76],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [98, 131.6],
   "variant": 3
  },
  {
   "obj": "plant.hedge",
   "at": [-69.49, 90.91],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.hedge",
   "at": [-32.22, 93.18],
   "variant": 1
  },
  {
   "obj": "plant.hedge",
   "at": [0.23, 95.57],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.hedge",
   "at": [11.89, 96.78],
   "variant": 2
  },
  {
   "obj": "plant.hedge",
   "at": [28.72, 98.34],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "street.lamp",
   "at": [-27, 95.21],
   "variant": 0
  },
  {
   "obj": "street.lamp",
   "at": [36, 100.4],
   "variant": 0
  },
  {
   "obj": "street.lamp",
   "at": [2.3, 27.6],
   "variant": 0
  },
  {
   "obj": "street.bench",
   "at": [3.5, 25.2],
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-30, 52],
   "variant": 2
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-21.5, 66],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-chestnut",
   "at": [-44, 83],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-9.5, 155],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-birch",
   "at": [-11.2, 41],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-willow",
   "at": [-14.8, 32.4],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-hawthorn",
   "at": [-19, 36.5],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [37.5, 59],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [54, 93],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-chestnut",
   "at": [66, 118],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-hawthorn",
   "at": [9.5, 62],
   "variant": 2
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-70, 150],
   "variant": 2
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-26, 158],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-chestnut",
   "at": [4, 163],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [30, 168],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [86, 160],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-birch",
   "at": [72, 150],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-120, 175],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [-6.97, 10.3],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.9, 9.15],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [1.46, 14.6],
   "variant": 0
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [2.5, 14.1],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [2.6, 19.77],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [3.66, 19.3],
   "variant": 1
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [-4.66, 28.87],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.26, 29.94],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-9.39, 29.49],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [-17.6, 28.79],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-18.71, 29.09],
   "variant": 1
  },
  {
   "obj": "water.lily",
   "at": [-8.14, 21.67],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-8.24, 20.87],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-8.65, 22.13],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-6.57, 21.56],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-7.25, 21.91],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-8.32, 21.1],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-2.4, 25.37],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-3.33, 24.84],
   "variant": 1,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-1.32, 25.17],
   "variant": 0,
   "attach": "water"
  },
  {
   "obj": "water.lily",
   "at": [-2.53, 24.61],
   "variant": 2,
   "attach": "water"
  },
  {
   "obj": "bird.moorhen",
   "at": [-10.5, 26.4],
   "attach": "water"
  },
  {
   "obj": "bird.mallard",
   "at": [-12.6, 23],
   "variant": 0,
   "facing": 270,
   "attach": "water"
  },
  {
   "obj": "bird.coot",
   "at": [-16, 27.5],
   "attach": "water"
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-0.8, 7.2],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [1.6, 11.6],
   "variant": 0
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-2.2, 9.4],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [11.5, 21],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [14.5, 30],
   "variant": 1
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [7.5, 40],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-22, 45],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [16, 46],
   "variant": 2
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3, 33],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [21, 42],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [-3.6, 5.3],
   "variant": 0
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-15.6, 18.6],
   "variant": 1
  },
  {
   "cluster": "tree.proof-yg-edge",
   "on": "fields",
   "n": 4,
   "seed": 9388
  },
  {
   "cluster": "tree.proof-yg-distant",
   "on": "fields",
   "n": 4,
   "seed": 3680
  },
  {
   "cluster": "tree.far-broad",
   "on": "fields",
   "n": 5,
   "seed": 5043
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [98, 131.6]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-84, 135.6]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-30.65, 149.52]
  },
  {
   "cluster": "plant.grass",
   "on": "gardens",
   "n": 5,
   "seed": 7579
  },
  {
   "cluster": "plant.proof-yg-tuft",
   "on": "gardens",
   "n": 19,
   "seed": 9473
  },
  {
   "cluster": "plant.proof-yg-tuft",
   "on": "churchyard",
   "n": 7,
   "seed": 6357
  },
  {
   "cluster": "plant.proof-yg-herbs",
   "on": "churchyard",
   "n": 7,
   "seed": 2439
  },
  {
   "obj": "plant.grass",
   "at": [19.82, 119.85]
  },
  {
   "obj": "plant.grass",
   "at": [-18.23, 121.98]
  },
  {
   "obj": "plant.grass",
   "at": [5.25, 122.15]
  },
  {
   "obj": "plant.grass",
   "at": [1.64, 4.68]
  },
  {
   "obj": "plant.grass",
   "at": [1.47, 4.71]
  },
  {
   "obj": "plant.grass",
   "at": [-0.52, 4.72]
  },
  {
   "obj": "plant.grass",
   "at": [0.76, 4.73]
  },
  {
   "obj": "plant.grass",
   "at": [-2.52, 4.75]
  },
  {
   "obj": "plant.grass",
   "at": [0.9, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [-2.87, 4.79]
  },
  {
   "obj": "plant.grass",
   "at": [-0.59, 4.8]
  },
  {
   "obj": "plant.grass",
   "at": [-1.47, 4.9]
  },
  {
   "obj": "plant.grass",
   "at": [0.2, 4.91]
  },
  {
   "obj": "plant.grass",
   "at": [0.57, 4.93]
  },
  {
   "obj": "plant.grass",
   "at": [-0.12, 4.95]
  },
  {
   "obj": "plant.grass",
   "at": [-1.19, 4.96]
  },
  {
   "obj": "plant.grass",
   "at": [-2.84, 4.99]
  },
  {
   "obj": "plant.grass",
   "at": [1.27, 5.03]
  },
  {
   "obj": "plant.grass",
   "at": [1.78, 5.04]
  },
  {
   "obj": "plant.grass",
   "at": [-2.52, 5.05]
  },
  {
   "obj": "plant.grass",
   "at": [-0.7, 5.05]
  },
  {
   "obj": "plant.grass",
   "at": [-1.87, 5.08]
  },
  {
   "obj": "plant.grass",
   "at": [-3.76, 5.08]
  },
  {
   "obj": "plant.grass",
   "at": [-2.12, 5.11]
  },
  {
   "obj": "plant.grass",
   "at": [1.74, 5.13]
  },
  {
   "obj": "plant.grass",
   "at": [-2.82, 5.14]
  },
  {
   "obj": "plant.grass",
   "at": [-2.41, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [-3.61, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [-0.24, 5.15]
  },
  {
   "obj": "plant.grass",
   "at": [-3.34, 5.18]
  },
  {
   "obj": "plant.grass",
   "at": [-3.25, 5.19]
  },
  {
   "obj": "plant.grass",
   "at": [-2.55, 5.22]
  },
  {
   "obj": "plant.grass",
   "at": [0.23, 5.25]
  },
  {
   "obj": "plant.grass",
   "at": [2.15, 5.29]
  },
  {
   "obj": "plant.grass",
   "at": [0.72, 5.3]
  },
  {
   "obj": "plant.grass",
   "at": [-2.25, 5.33]
  },
  {
   "obj": "plant.grass",
   "at": [-0.84, 5.34]
  },
  {
   "obj": "plant.grass",
   "at": [-2.56, 5.37]
  },
  {
   "obj": "plant.grass",
   "at": [-0.96, 5.38]
  },
  {
   "obj": "plant.grass",
   "at": [-3.38, 5.44]
  },
  {
   "obj": "plant.grass",
   "at": [-3.73, 5.46]
  },
  {
   "obj": "plant.grass",
   "at": [-2.72, 5.49]
  },
  {
   "obj": "plant.grass",
   "at": [0.64, 5.51]
  },
  {
   "obj": "plant.grass",
   "at": [-2.01, 5.56]
  },
  {
   "obj": "plant.grass",
   "at": [2.08, 5.59]
  },
  {
   "obj": "plant.grass",
   "at": [-0.03, 5.6]
  },
  {
   "obj": "plant.grass",
   "at": [1.3, 5.64]
  },
  {
   "obj": "plant.grass",
   "at": [0.3, 5.64]
  },
  {
   "obj": "plant.grass",
   "at": [0.52, 5.65]
  },
  {
   "obj": "plant.grass",
   "at": [-2.23, 5.65]
  },
  {
   "obj": "plant.grass",
   "at": [2.2, 5.67]
  },
  {
   "obj": "plant.grass",
   "at": [-3.19, 5.72]
  },
  {
   "obj": "plant.grass",
   "at": [-1.37, 5.83]
  },
  {
   "obj": "plant.grass",
   "at": [-1.26, 5.83]
  },
  {
   "obj": "plant.grass",
   "at": [2.08, 5.85]
  },
  {
   "obj": "plant.grass",
   "at": [-2.51, 5.89]
  },
  {
   "obj": "plant.grass",
   "at": [-0.33, 5.89]
  },
  {
   "obj": "plant.grass",
   "at": [-0.92, 5.89]
  },
  {
   "obj": "plant.grass",
   "at": [-1.09, 5.93]
  },
  {
   "obj": "plant.grass",
   "at": [1.73, 5.94]
  },
  {
   "obj": "plant.grass",
   "at": [0.41, 5.99]
  },
  {
   "obj": "plant.grass",
   "at": [0.79, 6.01]
  },
  {
   "obj": "plant.grass",
   "at": [-3.53, 6.02]
  },
  {
   "obj": "plant.grass",
   "at": [-0.42, 6.03]
  },
  {
   "obj": "plant.grass",
   "at": [1.04, 6.04]
  },
  {
   "obj": "plant.grass",
   "at": [2.22, 6.05]
  },
  {
   "obj": "plant.grass",
   "at": [-4.34, 6.05]
  },
  {
   "obj": "plant.grass",
   "at": [-2.73, 6.06]
  },
  {
   "obj": "plant.grass",
   "at": [-0.93, 6.19]
  },
  {
   "obj": "plant.grass",
   "at": [-1.74, 6.19]
  },
  {
   "obj": "plant.grass",
   "at": [-3.31, 6.31]
  },
  {
   "obj": "plant.grass",
   "at": [1.83, 6.31]
  },
  {
   "obj": "plant.grass",
   "at": [-2.16, 6.32]
  },
  {
   "obj": "plant.grass",
   "at": [0.33, 6.33]
  },
  {
   "obj": "plant.grass",
   "at": [-0.35, 6.35]
  },
  {
   "obj": "plant.grass",
   "at": [1.06, 6.46]
  },
  {
   "obj": "plant.grass",
   "at": [-3.73, 6.49]
  },
  {
   "obj": "plant.grass",
   "at": [1.72, 6.51]
  },
  {
   "obj": "plant.grass",
   "at": [2.53, 6.52]
  },
  {
   "obj": "plant.grass",
   "at": [-3.17, 6.57]
  },
  {
   "obj": "plant.grass",
   "at": [2.86, 6.58]
  },
  {
   "obj": "plant.grass",
   "at": [-4.38, 6.6]
  },
  {
   "obj": "plant.grass",
   "at": [2.39, 6.68]
  },
  {
   "obj": "plant.grass",
   "at": [1.56, 6.7]
  },
  {
   "obj": "plant.grass",
   "at": [1.7, 6.77]
  },
  {
   "obj": "plant.grass",
   "at": [2.75, 6.78]
  },
  {
   "obj": "plant.grass",
   "at": [-0.95, 6.79]
  },
  {
   "obj": "plant.grass",
   "at": [2.29, 6.86]
  },
  {
   "obj": "plant.grass",
   "at": [-2.03, 6.89]
  },
  {
   "obj": "plant.grass",
   "at": [-2.57, 6.89]
  },
  {
   "obj": "plant.grass",
   "at": [-3.95, 6.91]
  },
  {
   "obj": "plant.grass",
   "at": [0.51, 6.91]
  },
  {
   "obj": "plant.grass",
   "at": [2.65, 6.94]
  },
  {
   "obj": "plant.grass",
   "at": [-3.49, 6.96]
  },
  {
   "obj": "plant.grass",
   "at": [-2.39, 7.09]
  },
  {
   "obj": "plant.grass",
   "at": [-0.32, 7.16]
  },
  {
   "obj": "plant.grass",
   "at": [1.45, 7.18]
  },
  {
   "obj": "plant.grass",
   "at": [0.94, 7.21]
  },
  {
   "obj": "plant.grass",
   "at": [0.69, 7.24]
  },
  {
   "obj": "plant.grass",
   "at": [-4.05, 7.27]
  },
  {
   "obj": "plant.grass",
   "at": [-1.03, 7.28]
  },
  {
   "obj": "plant.grass",
   "at": [3.05, 7.3]
  },
  {
   "obj": "plant.grass",
   "at": [-5.18, 7.33]
  },
  {
   "obj": "plant.grass",
   "at": [-3.42, 7.39]
  },
  {
   "obj": "plant.grass",
   "at": [1.16, 7.4]
  },
  {
   "obj": "plant.grass",
   "at": [5.31, 7.46]
  },
  {
   "obj": "plant.grass",
   "at": [0.89, 7.55]
  },
  {
   "obj": "plant.grass",
   "at": [5.52, 7.59]
  },
  {
   "obj": "plant.grass",
   "at": [2.83, 7.61]
  },
  {
   "obj": "plant.grass",
   "at": [-1.91, 7.66]
  },
  {
   "obj": "plant.grass",
   "at": [-2.36, 7.68]
  },
  {
   "obj": "plant.grass",
   "at": [-5.32, 7.69]
  },
  {
   "obj": "plant.grass",
   "at": [-0.09, 7.69]
  },
  {
   "obj": "plant.grass",
   "at": [-4.15, 7.69]
  },
  {
   "obj": "plant.grass",
   "at": [1.11, 7.7]
  },
  {
   "obj": "plant.grass",
   "at": [0.71, 7.77]
  },
  {
   "obj": "plant.grass",
   "at": [-0.85, 7.89]
  },
  {
   "obj": "plant.grass",
   "at": [1.65, 7.89]
  },
  {
   "obj": "plant.grass",
   "at": [3.06, 7.91]
  },
  {
   "obj": "plant.grass",
   "at": [-3.91, 7.92]
  },
  {
   "obj": "plant.grass",
   "at": [-4.73, 7.97]
  },
  {
   "obj": "plant.grass",
   "at": [-1.29, 8.03]
  },
  {
   "obj": "plant.grass",
   "at": [-2.35, 8.09]
  },
  {
   "obj": "plant.grass",
   "at": [0.53, 8.12]
  },
  {
   "obj": "plant.grass",
   "at": [-0.3, 8.17]
  },
  {
   "obj": "plant.grass",
   "at": [2.32, 8.25]
  },
  {
   "obj": "plant.grass",
   "at": [-4.19, 8.26]
  },
  {
   "obj": "plant.grass",
   "at": [1.24, 8.32]
  },
  {
   "obj": "plant.grass",
   "at": [-4.13, 8.47]
  },
  {
   "obj": "plant.grass",
   "at": [6.19, 8.59]
  },
  {
   "obj": "plant.grass",
   "at": [0.29, 8.65]
  },
  {
   "obj": "plant.grass",
   "at": [3.5, 8.69]
  },
  {
   "obj": "plant.grass",
   "at": [0.56, 8.78]
  },
  {
   "obj": "plant.grass",
   "at": [3.18, 8.79]
  },
  {
   "obj": "plant.grass",
   "at": [-1.41, 8.89]
  },
  {
   "obj": "plant.grass",
   "at": [5.83, 9]
  },
  {
   "obj": "plant.grass",
   "at": [-2.98, 9.03]
  },
  {
   "obj": "plant.grass",
   "at": [1.31, 9.34]
  },
  {
   "obj": "plant.grass",
   "at": [2.73, 9.34]
  },
  {
   "obj": "plant.grass",
   "at": [2.34, 9.34]
  },
  {
   "obj": "plant.grass",
   "at": [0.26, 9.47]
  },
  {
   "obj": "plant.grass",
   "at": [-0.78, 9.64]
  },
  {
   "obj": "plant.grass",
   "at": [1.81, 9.75]
  },
  {
   "obj": "plant.grass",
   "at": [6.36, 9.87]
  },
  {
   "obj": "plant.grass",
   "at": [2.38, 10.24]
  },
  {
   "obj": "plant.grass",
   "at": [2.94, 10.37]
  },
  {
   "obj": "plant.grass",
   "at": [-2, 10.5]
  },
  {
   "obj": "plant.grass",
   "at": [3.18, 10.55]
  },
  {
   "obj": "plant.grass",
   "at": [-1.49, 10.74]
  },
  {
   "obj": "plant.grass",
   "at": [1.52, 10.91]
  },
  {
   "obj": "plant.grass",
   "at": [2.9, 11.07]
  },
  {
   "obj": "plant.grass",
   "at": [7.62, 11.16]
  },
  {
   "obj": "plant.grass",
   "at": [2.73, 11.22]
  },
  {
   "obj": "plant.grass",
   "at": [6.44, 11.87]
  },
  {
   "obj": "plant.grass",
   "at": [2.31, 12.16]
  },
  {
   "obj": "plant.grass",
   "at": [3.34, 12.18]
  },
  {
   "obj": "plant.grass",
   "at": [6.41, 12.39]
  },
  {
   "obj": "plant.grass",
   "at": [1.47, 12.42]
  },
  {
   "obj": "plant.grass",
   "at": [8.81, 13.32]
  },
  {
   "obj": "plant.grass",
   "at": [3.79, 14.08]
  },
  {
   "obj": "plant.grass",
   "at": [2.3, 14.09]
  },
  {
   "obj": "plant.grass",
   "at": [3.21, 14.32]
  },
  {
   "obj": "plant.grass",
   "at": [8.96, 15.6]
  },
  {
   "obj": "plant.grass",
   "at": [3.93, 15.76]
  },
  {
   "obj": "plant.grass",
   "at": [9.34, 15.78]
  },
  {
   "obj": "plant.grass",
   "at": [3.9, 16.83]
  },
  {
   "obj": "plant.grass",
   "at": [3.24, 17.3]
  },
  {
   "obj": "plant.grass",
   "at": [3.64, 17.34]
  },
  {
   "obj": "plant.grass",
   "at": [3.02, 17.5]
  },
  {
   "obj": "plant.grass",
   "at": [7.78, 18.05]
  },
  {
   "obj": "plant.grass",
   "at": [10.47, 18.23]
  },
  {
   "obj": "plant.grass",
   "at": [5.02, 18.28]
  },
  {
   "obj": "plant.grass",
   "at": [4.46, 18.28]
  },
  {
   "obj": "plant.grass",
   "at": [12.45, 19.53]
  },
  {
   "obj": "plant.grass",
   "at": [14.3, 20.04]
  },
  {
   "obj": "plant.grass",
   "at": [4.45, 21.23]
  },
  {
   "obj": "plant.grass",
   "at": [10.5, 22.58]
  },
  {
   "obj": "plant.grass",
   "at": [4.14, 22.73]
  },
  {
   "obj": "plant.grass",
   "at": [3.87, 23.1]
  },
  {
   "obj": "plant.grass",
   "at": [14.26, 26.77]
  },
  {
   "obj": "plant.grass",
   "at": [14.59, 28.21]
  },
  {
   "obj": "plant.grass",
   "at": [13.44, 28.36]
  },
  {
   "obj": "plant.grass",
   "at": [13.83, 32.04]
  },
  {
   "cluster": "plant.grass",
   "on": "land",
   "n": 17,
   "seed": 6781
  },
  {
   "obj": "street.lamp",
   "at": [2.12, 27.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.46, 4.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.24, 4.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.25, 4.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.16, 4.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.27, 4.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.02, 4.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.05, 4.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.1, 4.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.57, 4.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.35, 4.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.68, 4.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.42, 4.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.86, 4.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.23, 4.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.98, 4.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.46, 4.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.11, 4.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.1, 4.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.73, 4.78]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.97, 4.79]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.25, 4.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.03, 4.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.85, 4.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.42, 4.81]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.2, 4.81]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.48, 4.81]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.13, 4.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.41, 4.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.01, 4.84]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.3, 4.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.53, 4.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.64, 4.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.18, 4.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.08, 4.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.25, 4.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.36, 4.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.77, 4.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.34, 4.9]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.89, 4.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.55, 4.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.2, 4.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.48, 4.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.34, 4.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.56, 4.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.14, 4.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.66, 4.97]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.67, 4.97]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.15, 4.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.48, 4.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.04, 4.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.98, 4.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.27, 4.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.45, 5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.95, 5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2, 5.01]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.11, 5.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.35, 5.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.77, 5.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.01, 5.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.4, 5.05]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.73, 5.06]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.55, 5.06]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.07, 5.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.68, 5.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.48, 5.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.16, 5.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.64, 5.1]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.64, 5.1]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.95, 5.13]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.64, 5.14]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.33, 5.15]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.25, 5.17]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.68, 5.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.57, 5.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.56, 5.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.74, 5.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.33, 5.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0, 5.21]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.98, 5.22]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.02, 5.23]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.07, 5.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.5, 5.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.35, 5.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.44, 5.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.15, 5.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.3, 5.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.96, 5.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.51, 5.26]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.34, 5.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.77, 5.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.42, 5.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.63, 5.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.86, 5.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.45, 5.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.98, 5.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.1, 5.35]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.93, 5.37]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.17, 5.37]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.34, 5.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.95, 5.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.3, 5.39]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.07, 5.4]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.43, 5.4]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.21, 5.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.05, 5.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.21, 5.44]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.45, 5.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.12, 5.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.19, 5.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.55, 5.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.34, 5.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.39, 5.51]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.54, 5.51]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.8, 5.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.09, 5.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.58, 5.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.43, 5.54]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.61, 5.55]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.91, 5.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.75, 5.58]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.95, 5.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.17, 5.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.87, 5.6]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.34, 5.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.84, 5.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.47, 5.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.35, 5.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.43, 5.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.06, 5.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.55, 5.64]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.2, 5.64]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.11, 5.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.04, 5.67]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.12, 5.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.23, 5.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.97, 5.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.85, 5.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.78, 5.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.62, 5.77]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.1, 5.78]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.6, 5.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.21, 5.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.96, 5.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.17, 5.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.57, 5.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.56, 5.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.05, 5.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.14, 5.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.21, 5.9]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.97, 5.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.13, 5.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.84, 5.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.61, 5.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.38, 5.97]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.97, 5.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.91, 5.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.76, 6]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.97, 6.01]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.16, 6.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.39, 6.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.11, 6.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.07, 6.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.7, 6.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.16, 6.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.28, 6.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.54, 6.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.66, 6.13]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.09, 6.14]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.42, 6.17]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.15, 6.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.48, 6.21]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.95, 6.26]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.22, 6.27]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.82, 6.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.58, 6.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.62, 6.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.25, 6.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.75, 6.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.07, 6.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.88, 6.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.91, 6.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.31, 6.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.46, 6.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.38, 6.35]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.56, 6.36]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.09, 6.36]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.14, 6.36]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.29, 6.39]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.17, 6.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.77, 6.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.48, 6.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.46, 6.43]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.41, 6.44]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.65, 6.45]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.29, 6.45]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.47, 6.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.62, 6.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.25, 6.51]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.72, 6.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.11, 6.55]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.57, 6.55]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.83, 6.56]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.18, 6.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.85, 6.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.09, 6.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.06, 6.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.76, 6.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.08, 6.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.57, 6.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.38, 6.64]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.61, 6.64]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.86, 6.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.04, 6.66]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [4.91, 6.66]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.81, 6.67]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.01, 6.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.01, 6.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.35, 6.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.85, 6.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.7, 6.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.17, 6.78]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3, 6.79]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.52, 6.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.38, 6.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.02, 6.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.44, 6.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.06, 6.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.34, 6.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.17, 6.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.07, 6.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.75, 6.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.21, 6.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.5, 6.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.24, 6.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.91, 6.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.22, 6.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.36, 6.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.22, 6.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.64, 6.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.01, 6.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.52, 7.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.73, 7.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.73, 7.05]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.83, 7.06]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.18, 7.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.61, 7.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.2, 7.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.63, 7.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.71, 7.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.83, 7.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.85, 7.19]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.24, 7.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.29, 7.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.04, 7.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.72, 7.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.15, 7.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.39, 7.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.11, 7.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.59, 7.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.5, 7.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.63, 7.36]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.41, 7.37]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.99, 7.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.27, 7.39]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.96, 7.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.33, 7.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.14, 7.45]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.89, 7.48]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.6, 7.48]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.31, 7.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.83, 7.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.45, 7.55]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.24, 7.56]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.94, 7.58]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.91, 7.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.06, 7.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.66, 7.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.09, 7.64]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.79, 7.67]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.47, 7.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.16, 7.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.37, 7.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.14, 7.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.21, 7.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.02, 7.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.59, 7.77]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.06, 7.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.34, 7.81]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.38, 7.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.61, 7.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.69, 7.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.94, 7.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.71, 7.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.42, 7.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.72, 8.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.66, 8.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.37, 8.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.56, 8.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.6, 8.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.89, 8.11]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.92, 8.11]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.85, 8.13]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.77, 8.16]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.11, 8.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.16, 8.23]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.05, 8.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.52, 8.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.56, 8.31]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.53, 8.31]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.15, 8.31]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.3, 8.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.66, 8.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.51, 8.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.89, 8.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.89, 8.45]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.85, 8.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.99, 8.51]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.95, 8.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.2, 8.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.82, 8.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.53, 8.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.8, 8.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.23, 8.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0, 8.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.96, 8.66]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.13, 8.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.35, 8.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.69, 8.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.11, 8.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.83, 8.77]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.85, 8.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6, 8.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.39, 8.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.13, 8.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.03, 8.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.42, 8.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.89, 9.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.05, 9.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.08, 9.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.12, 9.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.11, 9.1]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.84, 9.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.87, 9.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.35, 9.26]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.69, 9.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.45, 9.32]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.91, 9.35]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.83, 9.46]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.31, 9.48]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.29, 9.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.1, 9.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.11, 9.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.03, 9.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.03, 9.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.64, 9.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.17, 9.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.1, 9.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.97, 9.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.56, 9.77]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.71, 9.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.68, 9.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.74, 9.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.56, 9.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.9, 9.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.93, 9.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.12, 9.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.67, 9.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.54, 9.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.96, 10]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.5, 10.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.95, 10.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.28, 10.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.59, 10.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.09, 10.11]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.75, 10.17]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.88, 10.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.21, 10.21]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.41, 10.23]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.71, 10.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.6, 10.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.54, 10.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.69, 10.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.25, 10.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.05, 10.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.22, 10.44]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.77, 10.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.51, 10.63]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.45, 10.66]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.79, 10.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.97, 10.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.18, 10.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.79, 10.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.24, 10.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [4.03, 10.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.55, 10.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.79, 10.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.19, 10.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.46, 10.94]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.76, 10.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.71, 11.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.17, 11.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.72, 11.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.9, 11.13]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.86, 11.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.86, 11.23]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.39, 11.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.92, 11.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.23, 11.54]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.23, 11.6]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.83, 11.66]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.72, 11.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.86, 11.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.83, 11.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.53, 11.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.06, 11.77]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.64, 11.85]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.91, 11.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.54, 11.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.92, 12.21]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.38, 12.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.8, 12.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.46, 12.48]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [0.91, 12.48]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.18, 12.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.63, 12.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.91, 12.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.28, 12.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.14, 12.88]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.7, 12.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.88, 12.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.14, 13.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.3, 13.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.28, 13.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.63, 13.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.1, 13.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.13, 13.5]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.74, 13.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.39, 13.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.6, 13.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [9.49, 14.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [9.42, 14.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.29, 14.82]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3, 14.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [9.27, 14.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.58, 15.02]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.66, 15.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.29, 15.53]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.32, 15.67]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.67, 15.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [9.75, 16.03]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [4.31, 16.25]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [4.99, 16.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.7, 16.41]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.9, 16.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.77, 17.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.54, 17.61]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [9.73, 17.62]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [8.66, 17.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.48, 18.46]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.81, 19.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.58, 19.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.73, 19.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.89, 19.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.25, 20.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [13.03, 21.28]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.78, 21.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [12.34, 21.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.41, 22]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.41, 22.07]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.16, 22.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.2, 22.34]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [13.06, 22.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.03, 22.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.72, 22.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.04, 23.44]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.09, 23.57]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.12, 23.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-17.25, 23.78]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.69, 24.01]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-18.03, 24.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.38, 24.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [12.55, 25.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [16.55, 25.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.44, 25.26]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [18.63, 25.26]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.54, 26.15]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.58, 26.33]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [17.93, 26.71]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-18.98, 26.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.52, 26.84]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [16.84, 26.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [19.38, 27.36]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [16.71, 27.4]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [16.21, 27.95]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.66, 27.97]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [16.34, 29.01]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-18.75, 29.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [11.87, 29.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.93, 30.08]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.44, 30.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.21, 31.17]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [10.09, 31.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [22.09, 31.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [17.37, 31.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [24.59, 33.73]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [15.61, 33.98]
  },
  {
   "cluster": "plant.proof-yg-tuft",
   "on": "land",
   "n": 71,
   "seed": 1698
  },
  {
   "obj": "plant.grass-long",
   "at": [-1.77, 5.57]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.39, 6.22]
  },
  {
   "obj": "plant.grass-long",
   "at": [-3.54, 7.52]
  },
  {
   "obj": "plant.grass-long",
   "at": [5.72, 8.34]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.65, 9.4]
  },
  {
   "obj": "plant.grass-long",
   "at": [9.79, 15.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [11.59, 18.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.31, 22.62]
  },
  {
   "obj": "plant.grass-long",
   "at": [15.61, 24.01]
  },
  {
   "obj": "plant.grass-long",
   "at": [17.4, 24.06]
  },
  {
   "cluster": "plant.grass-long",
   "on": "land",
   "n": 6,
   "seed": 9964
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-0.8, 7.2]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [7.2, 28.8]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.2, 29.43]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.62, 29.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.16, 30.45]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.14, 30.79]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.31, 30.81]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [6.84, 31.89]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-7.55, 32.72]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.34, 32.74]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-10.65, 32.92]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-16.12, 33.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [5.97, 33.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.68, 33.24]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-14.31, 33.27]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-9.93, 33.37]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-12.84, 33.79]
  },
  {
   "cluster": "plant.proof-yg-tuft",
   "on": "meadow-far",
   "n": 11,
   "seed": 8124
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [2.12, 27.67]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-0.81, 29]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-11.16, 29.27]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.49, 29.32]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-9.39, 29.49]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [6.96, 29.55]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.26, 29.94]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3, 29.97]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-16.27, 31.13]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-22.63, 31.53]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-13.15, 31.88]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-2.41, 32.21]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-23.85, 32.49]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-18.07, 32.73]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [3.26, 32.86]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [5.04, 32.9]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-16.27, 32.93]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3, 33]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [1.38, 33.3]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-11.32, 34.14]
  },
  {
   "cluster": "plant.proof-yg-herbs",
   "on": "meadow-far",
   "n": 6,
   "seed": 4445
  },
  {
   "obj": "plant.grass-long",
   "at": [5.1, 26.66]
  },
  {
   "obj": "plant.grass-long",
   "at": [1.34, 29.12]
  },
  {
   "obj": "plant.grass-long",
   "at": [6.06, 29.18]
  },
  {
   "obj": "plant.grass-long",
   "at": [-7.37, 30.41]
  },
  {
   "obj": "plant.grass-long",
   "at": [-9.5, 30.77]
  },
  {
   "obj": "plant.grass-long",
   "at": [-11.43, 34.07]
  },
  {
   "cluster": "plant.grass-long",
   "on": "meadow-far",
   "n": 5,
   "seed": 3543
  },
  {
   "obj": "plant.grass",
   "at": [5.49, 27.97]
  },
  {
   "obj": "plant.grass",
   "at": [-7.44, 29.93]
  },
  {
   "obj": "plant.grass",
   "at": [-16.6, 31.88]
  },
  {
   "obj": "plant.grass",
   "at": [-7.09, 33.26]
  },
  {
   "obj": "plant.grass",
   "at": [2.52, 33.26]
  },
  {
   "obj": "plant.grass",
   "at": [-20.82, 33.27]
  },
  {
   "obj": "plant.grass",
   "at": [-20.46, 33.8]
  },
  {
   "obj": "plant.grass",
   "at": [5.47, 33.81]
  },
  {
   "obj": "plant.grass",
   "at": [4.15, 36.07]
  },
  {
   "obj": "plant.grass",
   "at": [-20.73, 39]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-21.78, 31.99]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-4.44, 32.1]
  },
  {
   "obj": "plant.wildflowers",
   "at": [3.18, 33.54]
  },
  {
   "obj": "plant.wildflowers",
   "at": [-1.5, 34.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.82, 9.47]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.96, 9.86]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.29, 9.91]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.95, 10]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-7.42, 10.05]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.73, 10.05]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.2, 10.11]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.79, 10.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.57, 10.19]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.35, 10.43]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.57, 10.46]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.08, 10.49]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.39, 10.67]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.05, 10.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.52, 10.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.28, 10.84]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.39, 11.16]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.42, 11.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.07, 11.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.69, 12.09]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.4, 12.87]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-0.13, 13.1]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.16, 13.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.38, 15.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.15, 15.19]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.16, 17.12]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.62, 18.96]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-13.97, 19.13]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.72, 20.18]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [3.16, 20.65]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.53, 22.47]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-15.9, 23.52]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-15.78, 24.21]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [2.09, 24.76]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [1.28, 25.7]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-2.34, 27.3]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.12, 27.68]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-1.93, 27.75]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-11.88, 28.38]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-11.39, 28.6]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-7.58, 28.69]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-13.86, 30.11]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-16.45, 30.46]
  },
  {
   "obj": "plant.proof-yg-rushes",
   "at": [-6.97, 10.3]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.83, 9.41]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.37, 9.83]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.25, 9.93]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.06, 10.12]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-7.44, 10.4]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.66, 10.53]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.8, 10.55]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.33, 10.67]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-7.89, 10.7]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.07, 10.72]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.57, 10.76]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-7.41, 10.79]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3.72, 10.85]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.57, 10.87]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.26, 10.88]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3.01, 11.27]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [0.97, 13.21]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [0.79, 14.45]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [1.25, 18.02]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [2.64, 20.24]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-15.95, 22.94]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [1.23, 24.63]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [0.69, 25.76]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-1.55, 27.08]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.21, 28.52]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-17.68, 28.78]
  },
  {
   "obj": "plant.grass",
   "at": [-5.58, 9.81]
  },
  {
   "obj": "plant.grass",
   "at": [-7.16, 10.39]
  },
  {
   "obj": "plant.grass",
   "at": [-7.47, 10.41]
  },
  {
   "obj": "plant.grass",
   "at": [-4.66, 10.41]
  },
  {
   "obj": "plant.grass",
   "at": [-5.11, 10.49]
  },
  {
   "obj": "plant.grass",
   "at": [1.49, 13.91]
  },
  {
   "obj": "plant.grass",
   "at": [1.78, 16.64]
  },
  {
   "obj": "plant.grass",
   "at": [1.65, 25.47]
  },
  {
   "obj": "plant.grass",
   "at": [-9.36, 27.52]
  },
  {
   "obj": "tree.proof-yg-oak",
   "at": [-14.9, 19.15]
  },
  {
   "obj": "plant.grass-long",
   "at": [-2.53, 11.42]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.8, 7.93]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.2, 7.98]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.35, 8.04]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.89, 8.05]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.69, 8.23]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.71, 8.59]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.32, 8.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.48, 8.84]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.09, 8.84]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-6.32, 8.9]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-5.85, 8.99]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.35, 9.35]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.56, 9.37]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-4.14, 9.83]
  },
  {
   "obj": "plant.proof-yg-tuft",
   "at": [-3.75, 10.01]
  },
  {
   "obj": "plant.grass",
   "at": [-5.55, 8.15]
  },
  {
   "obj": "plant.grass",
   "at": [-6, 8.63]
  },
  {
   "obj": "plant.grass",
   "at": [-4.74, 9.14]
  },
  {
   "obj": "plant.grass",
   "at": [-5.69, 9.24]
  },
  {
   "obj": "plant.grass",
   "at": [-5.06, 9.28]
  },
  {
   "obj": "plant.grass",
   "at": [-6.44, 9.39]
  },
  {
   "obj": "plant.grass",
   "at": [-4.85, 9.64]
  },
  {
   "obj": "plant.grass",
   "at": [-3.92, 9.9]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [6.79, 9.23]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [6.86, 9.56]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.19, 8.05]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.81, 8.08]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.98, 8.13]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.8, 8.18]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.21, 8.26]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.15, 8.29]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.56, 8.48]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.94, 8.54]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.73, 8.54]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.33, 8.77]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.35, 8.82]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.65, 8.92]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-3.97, 9.04]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.45, 9.08]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.76, 9.12]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.9, 9.15]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-6.33, 9.19]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.7, 9.21]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-4.31, 9.36]
  },
  {
   "obj": "plant.proof-yg-herbs",
   "at": [-5.05, 9.37]
  }],
 "life": [{
   "who": "walkers",
   "on": "path",
   "rate": "2/min",
   "mix": {
    "dog-walker": 0.43,
    "stroll": 0.29,
    "elderly-couple": 0.14,
    "buggy": 0.14
   }
  },
  {
   "who": "heron",
   "count": 5,
   "on": "pond",
   "state": "stalk"
  },
  {
   "who": "mallard",
   "count": 6,
   "on": "pond"
  },
  {
   "who": "visit",
   "mix": {
    "stroll": 1
   },
   "rate": "1/6min",
   "on": "path"
  },
  {
   "who": "visit",
   "mix": {
    "dog-walker": 1
   },
   "rate": "1/1min",
   "on": "path"
  },
  {
   "who": "kingfisher",
   "count": 1,
   "on": "pond"
  }],
 "backdrop": {
  "style": "woodland"
 },
 "seed": 1
});
})();
