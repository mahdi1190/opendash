/* ============================================================
   WORLD SCENE (format v3) world-test / kent-canterbury-mercery-lane-1-w3: Mercery Lane, Canterbury.
   Made by the scene factory: archetype 'medieval-lane' (tools/lib/world/archetypes.mjs; gold norwich-elm-hill-1-w3), from the brief
     {"place":"Mercery Lane, Canterbury","lat":51.2795,"lon":1.0807,"county":"kent","town":"Canterbury","heading":40,"rise":"1.5","kit":"old-town-lane","houses":"timber-framed,tudor-colourwash,timber-framed,cotswold-stone","landmark":{"style":"gothic-minster","crown":"twin-towers","w":36,"d":150},"alt":60,"seed":17100,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote kent-canterbury-mercery-lane-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"kent-canterbury-mercery-lane-1-w3","label":"Mercery Lane, Canterbury (world)","site":"Mercery Lane, Canterbury","mood":"calm","colour":"green","tags":["uk","kent-canterbury-mercery-lane","medieval-lane","world-v3"],"liveSky":{"lat":51.2795,"lon":1.0807},"ukPlace":"kent-canterbury-mercery-lane","county":"kent","ukTown":"Canterbury","ukView":"medieval-lane"}, {
    v: 3,
    place: {"lat":51.2795,"lon":1.0807,"alt":60,"region":"uk","style":"old-town-lane"},
    camera: {"eye":1.7,"fov":60,"horizon":600,"heading":40},
    ground: {"features":[{"id":"hill","kind":"slope","path":[[0,0],[1.8,13.9],[3.9,27.8],[6.5,41.5],[9.7,55.2],[13.2,68.7]],"width":360,"h":1.5,"fade":40}]},
    surfaces: [
      {"id":"lane","kind":"plaza","path":[[-1.5,-7.9],[0,0],[1.8,13.9],[3.9,27.8],[6.5,41.5],[9.7,55.2],[13.2,68.7]],"width":6},
      {"id":"head","kind":"plaza","path":[[6.8,42.9],[13.2,68.7]],"width":14},
      {"id":"cross","kind":"pavement","path":[[-75.1,85.7],[101.6,51.7]],"width":6},
      {"id":"close","kind":"grass","poly":[[-54.8,85.9],[82.7,59.4],[132.1,315.8],[-5.4,342.3]]},
      {"id":"close-walk","kind":"path","path":[[13.8,71.7],[40.7,211.2]],"width":3}
    ],
    buildings: [
      {"id":"landmark","foot":[[29.7,247.7],[62.9,233.7],[121.2,371.9],[88.1,385.9]],"storeys":4,"style":"gothic-minster","crown":"twin-towers","landmark":true,"front":0,"src":"Mercery Lane, Canterbury: the great church at the head of the lane"},
      {"id":"l-0","along":"lane","side":"left","style":"timber-framed","storeys":[2,3],"from":0.5,"to":7.5,"gap":-0.55,"shops":["books","gift","tea","cheese","antiques","bakery","florist","clothes"]},
      {"id":"l-1","along":"lane","side":"left","style":"tudor-colourwash","storeys":[2,3],"from":8.1,"to":29.1,"gap":-0.55,"shops":["books","gift","tea","cheese","antiques","bakery","florist","clothes"]},
      {"id":"l-2","along":"lane","side":"left","style":"timber-framed","storeys":[2,3],"from":29.7,"to":42.4,"gap":-0.55,"shops":false},
      {"id":"l-head","along":"head","side":"left","style":"timber-framed","storeys":[2,2],"from":1,"to":24.6,"gap":-0.55,"shops":false},
      {"id":"r-0","along":"lane","side":"right","style":"tudor-colourwash","storeys":[2,3],"from":0.5,"to":7.5,"gap":-0.55,"shops":["books","gift","tea","cheese","antiques","bakery","florist","clothes"]},
      {"id":"r-1","along":"lane","side":"right","style":"timber-framed","storeys":[2,3],"from":8.1,"to":32.1,"gap":-0.55,"shops":["books","gift","tea","cheese","antiques","bakery","florist","clothes"]},
      {"id":"r-2","along":"lane","side":"right","style":"cotswold-stone","storeys":[2,3],"from":32.7,"to":42.4,"gap":-0.55,"shops":false},
      {"id":"r-head","along":"head","side":"right","style":"timber-framed","storeys":[2,2],"from":1,"to":24.6,"gap":-0.55,"shops":false},
      {"id":"end-a","along":"cross","side":"left","style":"timber-framed","storeys":[2,3],"from":0,"to":78.9,"depth":[8,10]},
      {"id":"end-b","along":"cross","side":"left","style":"cotswold-stone","storeys":[2,3],"from":101.1,"to":180,"depth":[8,10]}
    ],
    entities: [
      {"obj":"tree.green-oak","at":[-8.1,95.3]},
      {"obj":"tree.green-oak","at":[42.5,93.7]},
      {"obj":"tree.green-oak","at":[-16.6,125.4]},
      {"obj":"tree.green-oak","at":[59.2,106.7]}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"lane","rate":"8/min","mix":{"stroll":0.45,"couple":0.25,"family":0.1,"elderly":0.1,"chat":0.1},"edges":["S","N"]},
      {"id":"browser","who":"visit","on":"lane","rate":"1/min","mix":{"stroll":0.5,"couple":0.5},"edges":["S"],"goals":[{"go":[0.7,15.5]},{"do":"look","for":[15,40]},{"leave":"N"}]},
      {"id":"far","who":"walkers","on":"cross","rate":"4/min","mix":{"stroll":0.5,"dog-walker":0.2,"couple":0.3},"edges":["W","E"]},
      {"id":"close","who":"walkers","on":"close-walk","rate":"2/min","mix":{"stroll":0.6,"couple":0.4}}
    ],
    backdrop: {"style":"town-low"},
    seed: 17100,
  });
})();
