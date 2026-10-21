/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-1-winter-w3: converted by `node tools/world.mjs convert uk-south-east/hampshire-wyndhams-pool-1-winter`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (31):
     - place[0]: tree.pool-pine: pixel placement unprojected to [-7, 8.5] m
     - place[1]: ground.log: pixel placement unprojected to [4, 4.9] m
     - place[2]: tree.wyv-snag: pixel placement unprojected to [-3.4, 7.8] m
     - place[3]: bird.wp-kingfisher-perch: pixel placement unprojected to [-6.1, 15] m
     - place[3]: bird.wp-kingfisher-perch: a flyer with no perch; dropped (the life sim flies birds)
     - place[4]: animal.squirrel: pixel placement unprojected to [13.7, 15.8] m
     - place[5]: bird.robin: pixel placement unprojected to [4.2, 5.1] m
     - place[6]: ground.swim: pixel placement unprojected to [1.4, 4.5] m
     - place[7]: person.angler: pixel placement unprojected to [1.4, 4.6] m
     - place[8]: bird.dartford-warbler: pixel placement unprojected to [-2.6, 4.5] m
     - place[9]: bird.stonechat: pixel placement unprojected to [3.3, 4.1] m
     - place[10]: tree.wyv-birch-bough: sky or horizon art with no foot; dropped
     - place[11]: sky.wp-mist: pixel placement unprojected to [-13.6, 44.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - place[12]: sky.wp-mist: pixel placement unprojected to [17.4, 42.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: sky.wp-mist: a flyer with no perch; dropped (the life sim flies birds)
     - actors[11]: actor bird.wp-swallow: no life class; dropped
     - actors[12]: actor bird.wp-swallow: no life class; dropped
     - actors[13]: actor animal.wp-bat: no life class; dropped
     - actors[14]: actor animal.wp-bat: no life class; dropped
     - actors[15]: actor vehicle.light-aircraft: no life class; dropped
     - actors: 1 x heron: no water surface; dropped
     - actors: 2 x mute-swan: no water surface; dropped
     - actors: 2 x mallard: no water surface; dropped
     - actors: 1 x coot: no water surface; dropped
     - actors: 1 x moorhen: no water surface; dropped
     - actors: 1 x grebe: no water surface; dropped
     - actors: 1 x stroll: no walk surface; dropped
     - actors: 1 x dog-walker: no walk surface; dropped
     - actors: 1 x jogger: no walk surface; dropped
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-1-winter-w3","label":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — Bare birches above winter water","tags":["uk","south east","hampshire","landscape","pond","woodland","reeds","winter","world-v3"],"liveSky":{"lat":51.332,"lon":-0.822},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {
  "lat": 51.332,
  "lon": -0.822,
  "region": "hampshire"
 },
 "camera": {
  "eye": 1.65,
  "fov": 82,
  "horizon": 470,
  "heading": 222
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 3.2],
    [3.5, 3.2],
    [3259.8, 3000],
    [-3259.8, 3000]]
  }],
 "entities": [{
   "obj": "tree.pool-pine",
   "at": [-6.99, 8.53],
   "variant": 0
  },
  {
   "obj": "ground.log",
   "at": [4, 4.87],
   "variant": 0
  },
  {
   "obj": "tree.wyv-snag",
   "at": [-3.37, 7.83],
   "variant": 0
  },
  {
   "obj": "animal.squirrel",
   "at": [13.75, 15.82],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.robin",
   "at": [4.25, 5.06],
   "variant": 0
  },
  {
   "obj": "ground.swim",
   "at": [1.4, 4.52],
   "variant": 0
  },
  {
   "obj": "person.angler",
   "at": [1.38, 4.63],
   "variant": 0,
   "facing": 270
  },
  {
   "obj": "bird.dartford-warbler",
   "at": [-2.64, 4.52]
  },
  {
   "obj": "bird.stonechat",
   "at": [3.3, 4.13],
   "variant": 1,
   "facing": 270
  }],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
