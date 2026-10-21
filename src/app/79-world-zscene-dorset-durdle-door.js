/* ============================================================
   WORLD SCENE (format v3) world-test / dorset-durdle-door-w3: converted by `node tools/world.mjs convert uk-south-west/dorset-durdle-door`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (1):
     - backdrop: backdrop style 'farmland' chosen from the place and the water; check it against the real view
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"dorset-durdle-door-w3","label":"Durdle Door, Dorset","site":"","tags":["uk","south west","dorset","signature","jurassic coast","arch","world heritage","world-v3"],"liveSky":true,"mood":"dreamy","colour":"teal"},
{
 "v": 3,
 "place": {
  "region": "dorset"
 },
 "camera": {
  "eye": 1.65,
  "fov": 66,
  "horizon": 470,
  "heading": 180
 },
 "surfaces": [{
   "id": "land",
   "kind": "grass",
   "poly": [[-3.5, 4.3],
    [3.5, 4.3],
    [2435.3, 3000],
    [-2435.3, 3000]]
  }],
 "entities": [],
 "life": [],
 "backdrop": {
  "style": "farmland"
 },
 "seed": 1
});
})();
