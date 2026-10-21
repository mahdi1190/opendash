/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-yateley-common-1-winter-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-yateley-common-1-winter`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (75):
     - place[0]: building.yc-terminal: pixel placement unprojected to [14.1, 30.2] m
     - place[1]: building.yc-hangar: pixel placement unprojected to [23, 35.4] m
     - place[2]: building.yc-hangar: pixel placement unprojected to [29.6, 37] m
     - place[3]: building.yc-hangar: pixel placement unprojected to [13.4, 50.9] m
     - place[4]: building.yc-hangar: pixel placement unprojected to [5.3, 52.6] m
     - place[5]: prop.yc-windsock: pixel placement unprojected to [1.7, 27.6] m
     - place[6]: vehicle.light-aircraft: pixel placement unprojected to [8.2, 20.4] m
     - place[6]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[7]: vehicle.light-aircraft: pixel placement unprojected to [9.2, 19.6] m
     - place[7]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[8]: vehicle.light-aircraft: pixel placement unprojected to [10.5, 19.4] m
     - place[8]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[9]: vehicle.light-aircraft: pixel placement unprojected to [12, 19.6] m
     - place[9]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[10]: vehicle.light-aircraft: pixel placement unprojected to [13.4, 19.4] m
     - place[10]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[11]: vehicle.light-aircraft: pixel placement unprojected to [14.5, 24.7] m
     - place[11]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[12]: vehicle.light-aircraft: pixel placement unprojected to [18.8, 25.5] m
     - place[12]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[13]: vehicle.yc-helicopter: pixel placement unprojected to [8.5, 17] m
     - place[13]: vehicle.yc-helicopter: a flyer with no perch; dropped (the life sim flies birds)
     - place[14]: vehicle.light-aircraft: pixel placement unprojected to [9.9, 29.1] m
     - place[14]: vehicle.light-aircraft: a flyer with no perch; dropped (the life sim flies birds)
     - place[15]: tree.pine-veteran: pixel placement unprojected to [3.3, 5.1] m
     - place[16]: plant.wyv-heath-bank: pixel placement unprojected to [0.6, 3.8] m
     - place[17]: plant.wyv-heath-bank: pixel placement unprojected to [1.7, 4.6] m
     - place[18]: plant.wyv-heath-bank: pixel placement unprojected to [4.3, 5.1] m
     - place[19]: plant.gorse: pixel placement unprojected to [2, 4.4] m
     - place[20]: plant.gorse: pixel placement unprojected to [0.1, 3.1] m
     - place[21]: tree.wyv-snag: pixel placement unprojected to [1.1, 4.2] m
     - place[22]: bird.stonechat: pixel placement unprojected to [1.9, 6.9] m
     - place[23]: plant.bracken: pixel placement unprojected to [2.3, 3.1] m
     - place[24]: animal.rabbit: pixel placement unprojected to [-0.5, 3.4] m
     - place[25]: plant.yc-gorse-spray: pixel placement unprojected to [-2.3, 3] m
     - place[26]: bird.dartford-warbler: pixel placement unprojected to [-4.6, 5.6] m
     - place[27]: animal.cattle: pixel placement unprojected to [-3.6, 7.5] m
     - place[28]: animal.cattle: pixel placement unprojected to [-2.9, 7.1] m
     - place[29]: animal.cattle: pixel placement unprojected to [-3.9, 7] m
     - place[30]: animal.pony: pixel placement unprojected to [3.2, 7.3] m
     ... and 35 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-yateley-common-1-winter-w3","label":"Yateley Common, Hampshire","site":"Yateley Common — Frosted heath and a winter robin","tags":["uk","south east","hampshire","landscape","heathland","heather","birch","winter","world-v3"],"liveSky":{"lat":51.334,"lon":-0.836},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 51.334,
  "lon": -0.836,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 78,
  "horizon": 372,
  "heading": 185
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-2.8, 2.8],
    [2.8, 2.8],
    [3036.7, 3000],
    [-3036.7, 3000]]
  }],
 "entities": [{
   "obj": "building.yc-terminal",
   "at": [14.12, 30.19]
  },
  {
   "obj": "tree.pine-veteran",
   "at": [3.27, 5.13],
   "variant": 0
  },
  {
   "obj": "plant.wyv-heath-bank",
   "at": [0.62, 3.85],
   "variant": 1
  },
  {
   "obj": "plant.wyv-heath-bank",
   "at": [1.71, 4.57],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.wyv-heath-bank",
   "at": [4.25, 5.06],
   "variant": 2
  },
  {
   "obj": "plant.gorse",
   "at": [2.04, 4.38],
   "variant": 1
  },
  {
   "obj": "plant.gorse",
   "at": [0.06, 3.09],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.stonechat",
   "at": [1.92, 6.94],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.bracken",
   "at": [2.29, 3.06],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "animal.rabbit",
   "at": [-0.55, 3.4],
   "variant": 0
  },
  {
   "obj": "plant.yc-gorse-spray",
   "at": [-2.27, 2.95],
   "variant": 1
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [-4.6, 5.58],
   "facing": 270
  },
  {
   "obj": "animal.cattle",
   "at": [-3.56, 7.48],
   "variant": 2
  },
  {
   "obj": "animal.cattle",
   "at": [-2.89, 7.15],
   "variant": 2,
   "facing": 270
  },
  {
   "obj": "animal.cattle",
   "at": [-3.88, 6.97],
   "variant": 0
  },
  {
   "obj": "animal.pony",
   "at": [3.24, 7.28],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "animal.pony",
   "at": [3.56, 7.09],
   "variant": 2
  },
  {
   "obj": "tree.birch-heath",
   "at": [-5.78, 8.4],
   "variant": 2
  },
  {
   "obj": "tree.birch-heath",
   "at": [-5.2, 8.15],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.pine-veteran",
   "at": [-2.04, 8.4],
   "variant": 1
  },
  {
   "obj": "tree.birch-heath",
   "at": [5.24, 7.84],
   "variant": 1
  },
  {
   "obj": "plant.gorse",
   "at": [-1.19, 7.34],
   "variant": 2
  },
  {
   "obj": "plant.gorse",
   "at": [2.08, 6.85],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "plant.gorse",
   "at": [1.21, 7.48],
   "variant": 1
  },
  {
   "obj": "plant.gorse",
   "at": [-2.96, 4.88],
   "variant": 0
  },
  {
   "obj": "plant.gorse",
   "at": [-0.14, 4.74],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "plant.gorse",
   "at": [-3.15, 4.2],
   "variant": 1
  },
  {
   "obj": "bird.stonechat",
   "at": [-0.15, 5.36],
   "variant": 1
  },
  {
   "obj": "bird.robin",
   "at": [2.34, 5.13],
   "variant": 0
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
