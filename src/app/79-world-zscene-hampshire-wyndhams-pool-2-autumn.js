/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-2-autumn-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-wyndhams-pool-2-autumn`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (25):
     - place[0]: tree.pool-pine: pixel placement unprojected to [6.4, 7.3] m
     - place[1]: ground.swim: pixel placement unprojected to [2.2, 5.6] m
     - place[2]: person.angler: pixel placement unprojected to [2.3, 5.7] m
     - place[3]: tree.wyv-snag: pixel placement unprojected to [0.2, 7.8] m
     - place[4]: bird.wp-kingfisher-perch: pixel placement unprojected to [-0.1, 15] m
     - place[4]: bird.wp-kingfisher-perch: a flyer with no perch; dropped (the life sim flies birds)
     - place[5]: bird.dartford-warbler: pixel placement unprojected to [7.7, 11.7] m
     - place[6]: bird.stonechat: pixel placement unprojected to [5.1, 6.3] m
     - place[7]: tree.wp-pine-bough: sky or horizon art with no foot; dropped
     - place[8]: sky.wp-mist: sky or horizon art with no foot; dropped
     - place[9]: sky.wp-mist: sky or horizon art with no foot; dropped
     - place[10]: ground.log: pixel placement unprojected to [4.6, 5] m
     - actors[12]: actor bird.wp-swallow: no life class; dropped
     - actors[13]: actor bird.wp-swallow: no life class; dropped
     - actors[14]: actor animal.wp-bat: no life class; dropped
     - actors[15]: actor vehicle.light-aircraft: no life class; dropped
     - actors: 1 x heron: no water surface; dropped
     - actors: 1 x mute-swan: no water surface; dropped
     - actors: 2 x mallard: no water surface; dropped
     - actors: 2 x coot: no water surface; dropped
     - actors: 1 x moorhen: no water surface; dropped
     - actors: 1 x grebe: no water surface; dropped
     - actors: 3 x stroll: no walk surface; dropped
     - actors: 1 x dog-walker: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-2-autumn-w3","label":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — Falling leaves beside the near reeds","tags":["uk","south east","hampshire","landscape","pond","woodland","reeds","autumn","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"calm","colour":"amber"},
{
 "v": 3,
 "place": {
  "lat": 51.34,
  "lon": -0.83,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 76,
  "horizon": 472,
  "heading": 228
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.6],
    [3.5, 3.6],
    [2929.8, 3000],
    [-2929.8, 3000]]
  }],
 "entities": [{
   "obj": "tree.pool-pine",
   "at": [6.4, 7.28],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "ground.swim",
   "at": [2.25, 5.56],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "person.angler",
   "at": [2.28, 5.75],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "tree.wyv-snag",
   "at": [0.15, 7.75],
   "variant": 1,
   "facing": 270
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [7.75, 11.73],
   "facing": 270
  },
  {
   "obj": "bird.stonechat",
   "at": [5.13, 6.26],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "ground.log",
   "at": [4.56, 4.97],
   "variant": 1
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
