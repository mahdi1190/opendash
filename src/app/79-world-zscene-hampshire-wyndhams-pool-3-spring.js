/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-3-spring-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-wyndhams-pool-3-spring`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (31):
     - place[0]: tree.pool-pine: pixel placement unprojected to [6.2, 7] m
     - place[1]: ground.swim: pixel placement unprojected to [0.4, 4.1] m
     - place[2]: person.angler: pixel placement unprojected to [0.4, 4.2] m
     - place[3]: ground.log: pixel placement unprojected to [-3.5, 14] m
     - place[4]: ground.log: pixel placement unprojected to [2.6, 4] m
     - place[5]: bird.robin: pixel placement unprojected to [2.4, 4.3] m
     - place[6]: tree.wyv-snag: pixel placement unprojected to [2.1, 6.4] m
     - place[7]: bird.wp-kingfisher-perch: pixel placement unprojected to [3.7, 10.6] m
     - place[7]: bird.wp-kingfisher-perch: a flyer with no perch; dropped (the life sim flies birds)
     - place[8]: bird.dartford-warbler: pixel placement unprojected to [6.7, 7.2] m
     - place[9]: bird.stonechat: pixel placement unprojected to [-0.9, 4.2] m
     - place[10]: tree.wyv-birch-bough: sky or horizon art with no foot; dropped
     - place[11]: sky.wp-mist: pixel placement unprojected to [-16.5, 52.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[12]: sky.wp-mist: pixel placement unprojected to [18, 49.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[13]: animal.squirrel: pixel placement unprojected to [15.6, 17.5] m
     - actors[12]: actor bird.wp-swallow: no life class; dropped
     - actors[13]: actor bird.wp-swallow: no life class; dropped
     - actors[14]: actor animal.wp-bat: no life class; dropped
     - actors[15]: actor vehicle.light-aircraft: no life class; dropped
     - actors: 1 x heron: no water surface; dropped
     - actors: 1 x mute-swan: no water surface; dropped
     - actors: 2 x mallard: no water surface; dropped
     - actors: 2 x coot: no water surface; dropped
     - actors: 2 x moorhen: no water surface; dropped
     - actors: 1 x grebe: no water surface; dropped
     - actors: 2 x stroll: no walk surface; dropped
     - actors: 1 x dog-walker: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
     - entities[6]: repair: removed (overlap) tree.wyv-snag overlaps ground.log (entities[4]) by 0.36 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-3-spring-w3","label":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — Catkins over the woodland margin","tags":["uk","south east","hampshire","landscape","pond","woodland","reeds","spring","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"calm","colour":"green"},
{
 "v": 3,
 "place": {
  "lat": 51.34,
  "lon": -0.83,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 80,
  "horizon": 470,
  "heading": 245
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.3],
    [3.5, 3.3],
    [3146.6, 3000],
    [-3146.6, 3000]]
  }],
 "entities": [{
   "obj": "tree.pool-pine",
   "at": [6.19, 7.02],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "ground.swim",
   "at": [0.45, 4.08],
   "variant": 0
  },
  {
   "obj": "person.angler",
   "at": [0.44, 4.16],
   "variant": 2
  },
  {
   "obj": "ground.log",
   "at": [-3.54, 14.05],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "ground.log",
   "at": [2.57, 3.95],
   "variant": 1
  },
  {
   "obj": "bird.robin",
   "at": [2.43, 4.3],
   "variant": 1
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [6.68, 7.15],
   "facing": 270
  },
  {
   "obj": "bird.stonechat",
   "at": [-0.88, 4.18],
   "variant": 1
  },
  {
   "obj": "animal.squirrel",
   "at": [15.62, 17.48],
   "variant": 0
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
