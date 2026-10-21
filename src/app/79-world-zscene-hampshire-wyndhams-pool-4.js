/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-4-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-wyndhams-pool-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (30):
     - place[0]: tree.pool-pine: pixel placement unprojected to [-3.2, 4] m
     - place[1]: ground.swim: pixel placement unprojected to [1.5, 5.1] m
     - place[2]: person.angler: pixel placement unprojected to [1.5, 5.2] m
     - place[3]: tree.wyv-snag: pixel placement unprojected to [1, 7.4] m
     - place[4]: bird.wp-kingfisher-perch: pixel placement unprojected to [1.5, 13.6] m
     - place[4]: bird.wp-kingfisher-perch: a flyer with no perch; dropped (the life sim flies birds)
     - place[5]: bird.dartford-warbler: pixel placement unprojected to [1, 4.3] m
     - place[6]: sky.wp-mist: pixel placement unprojected to [-24, 71.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[7]: sky.wp-mist: pixel placement unprojected to [24.8, 65.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[8]: sky.wp-mist: pixel placement unprojected to [0, 23.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[9]: bird.robin: pixel placement unprojected to [-1.5, 4.4] m
     - place[10]: ground.log: pixel placement unprojected to [-0.4, 3.8] m
     - place[11]: animal.squirrel: pixel placement unprojected to [4.2, 4.8] m
     - actors[12]: actor bird.wp-swallow: no life class; dropped
     - actors[13]: actor animal.wp-bat: no life class; dropped
     - actors[14]: actor animal.wp-bat: no life class; dropped
     - actors[15]: actor animal.wp-bat: no life class; dropped
     - actors[16]: actor sky.wp-mist: no life class; dropped
     - actors[17]: actor vehicle.light-aircraft: no life class; dropped
     - actors: 1 x heron: no water surface; dropped
     - actors: 2 x mute-swan: no water surface; dropped
     - actors: 3 x mallard: no water surface; dropped
     - actors: 2 x coot: no water surface; dropped
     - actors: 1 x moorhen: no water surface; dropped
     - actors: 2 x stroll: no walk surface; dropped
     - actors: 1 x dog-walker: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-4-w3","label":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — Warm evening water beneath the trees","tags":["uk","south east","hampshire","landscape","pond","woodland","reeds","summer","world-v3"],"liveSky":{"lat":51.34,"lon":-0.83},"mood":"dreamy","colour":"green"},
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
  "horizon": 488,
  "heading": 275
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.6, 3.4],
    [3.6, 3.4],
    [3146.6, 3000],
    [-3146.6, 3000]]
  }],
 "entities": [{
   "obj": "tree.pool-pine",
   "at": [-3.2, 4.01],
   "variant": 0
  },
  {
   "obj": "ground.swim",
   "at": [1.51, 5.14],
   "variant": 1
  },
  {
   "obj": "person.angler",
   "at": [1.51, 5.24],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "tree.wyv-snag",
   "at": [1.01, 7.42],
   "variant": 1
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [0.96, 4.32],
   "facing": 270
  },
  {
   "obj": "bird.robin",
   "at": [-1.52, 4.39],
   "variant": 0
  },
  {
   "obj": "ground.log",
   "at": [-0.4, 3.82],
   "variant": 0
  },
  {
   "obj": "animal.squirrel",
   "at": [4.2, 4.77],
   "variant": 0
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
