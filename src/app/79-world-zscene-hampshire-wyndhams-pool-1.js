/* ============================================================
   WORLD SCENE (format v3) world-test / hampshire-wyndhams-pool-1-w3: Wyndham's Pool — a walk through the reeds to the anglers' platform, Scots pines round the water.
   Made by the scene factory: archetype 'boardwalk-wetland' (tools/lib/world/archetypes.mjs; gold fleet-pond-2-w3), from the brief
     {"place":"Wyndham's Pool, Hampshire","site":"Wyndham's Pool — a walk through the reeds to the anglers' platform, Scots pines round the water","lat":51.3316,"lon":-0.8221,"county":"hampshire","town":"Yateley","heading":300,"trees":"heath","far":"path","side":"left","deck":"17","farZ":"150","stream":"false","alt":60,"seed":55,"region":"uk"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote hampshire-wyndhams-pool-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"hampshire-wyndhams-pool-1-w3","label":"Wyndham's Pool, Hampshire (world)","site":"Wyndham's Pool — a walk through the reeds to the anglers' platform, Scots pines round the water","mood":"calm","colour":"green","tags":["uk","hampshire-wyndhams-pool","boardwalk-wetland","world-v3"],"liveSky":{"lat":51.3316,"lon":-0.8221},"ukPlace":"hampshire-wyndhams-pool","county":"hampshire","ukTown":"Yateley","ukView":"boardwalk-wetland"}, {
    v: 3,
    place: {"lat":51.3316,"lon":-0.8221,"alt":60,"region":"uk"},
    camera: {"eye":2.4,"fov":66,"horizon":400,"heading":300,"water":-0.1},
    surfaces: [
      {"id":"carr-l","kind":"grass","poly":[[-120,0.5],[0,0.5],[0,12],[-6,14],[-8,21.6],[-120,21.6]]},
      {"id":"carr-r","kind":"grass","poly":[[0,0.5],[120,0.5],[120,26.9],[0,26.9]]},
      {"id":"pond","kind":"water","water":"pond","shallow":1,"poly":[[0.4,10.5],[0.6,12.2],[0.2,14.3],[-0.6,16.5],[-1.8,18.4],[-2.6,20.6],[-3.1,22.8],[-3.4,24.8],[-5.6,27.7],[-8,32.3],[-14,36.6],[-30,40.8],[-60,45.9],[-120,54.4],[-300,76.5],[-300,136.3],[300,132.7],[300,76.5],[150,56.1],[80,49.3],[40,44.2],[20,39.1],[11,34],[8.4,27.2],[8.4,22.1],[7.6,19.5],[7.2,17],[6.6,14.8],[5.8,12.6],[3.2,11.9],[2.2,10.5]]},
      {"id":"reeds-l","kind":"reeds","poly":[[80,19.7],[12,18.7],[8.6,21.4],[9.4,26],[9.8,29.9],[12.6,34.5],[21,40],[40,45.2],[80,50.7],[150,57.8],[150,21.4]]},
      {"id":"reeds-r","kind":"reeds","poly":[[-3.6,23],[-9,21.9],[-30,22.4],[-70,26.9],[-150,35.7],[-150,56.1],[-120,55.9],[-60,47.1],[-30,41.7],[-14,37.2],[-8.2,32.8],[-5.8,28.1],[-3.6,25.5]]},
      {"id":"reeds-n","kind":"reeds","poly":[[-300,126.19999999999999],[300,129.8],[300,145.8],[-300,142.2]]},
      {"id":"far-shore","kind":"grass","poly":[[-300,142.2],[300,145.8],[300,211.8],[-300,208.2]]},
      {"id":"shore-path","kind":"path","path":[[-320,150.1],[-60,150.6],[60,152.9],[320,152.9]],"width":2.2}
    ],
    marsh: [
      {"id":"fen","walk":[[0.2,1],[0.2,5],[-0.4,7.4],[-0.6,10],[-0.9,12.4],[-1.6,13.1],[-2.1,15.3],[-2.6,17]],"width":2.4,"seed":59,"from":9.4,"reach":9.5,"open":0.5,"density":1,"platform":{"size":[3.6,4.4],"bench":true}}
    ],
    entities: [
      {"id":"frame-l","obj":"tree.pool-pine","at":[6.9,5],"framed":true},
      {"id":"frame-r","obj":"tree.pool-pine","at":[-7.6,6],"framed":true},
      {"id":"frame-l2","obj":"tree.pool-birch","at":[8.5,12],"framed":true},
      {"id":"frame-r2","obj":"tree.pond-oak","at":[-13.5,14],"framed":true},
      {"obj":"tree.pond-oak","at":[12.6,17.2]},
      {"obj":"tree.pool-pine","at":[20.7,19.4]},
      {"obj":"tree.pool-birch","at":[30.5,17.6]},
      {"obj":"tree.pond-oak","at":[43.9,19.5]},
      {"obj":"tree.pool-pine","at":[-23.1,18.6]},
      {"obj":"tree.pool-birch","at":[-32.8,17.3]},
      {"obj":"tree.pond-oak","at":[-51.4,16.2]},
      {"obj":"tree.pond-pine","at":[-71.1,15.6]},
      {"obj":"tree.pine-veteran","at":[69.2,21.8]},
      {"obj":"tree.far-pine","at":[-240,160.6]},
      {"obj":"tree.far-birch","at":[-201,164.7]},
      {"obj":"tree.far-pine","at":[-180,168.9]},
      {"obj":"tree.far-pine","at":[-141,161.1]},
      {"obj":"tree.far-birch","at":[-120,165.3]},
      {"obj":"tree.far-pine","at":[-81,169.5]},
      {"obj":"tree.far-pine","at":[-60,161.6]},
      {"obj":"tree.far-birch","at":[-21,165.8]},
      {"obj":"tree.far-pine","at":[0,170]},
      {"obj":"tree.far-pine","at":[39,162.2]},
      {"obj":"tree.far-birch","at":[60,166.4]},
      {"obj":"tree.far-pine","at":[99,170.5]},
      {"obj":"tree.far-pine","at":[120,162.7]},
      {"obj":"tree.far-birch","at":[159,166.9]},
      {"obj":"tree.far-pine","at":[180,171.1]},
      {"obj":"tree.far-pine","at":[219,163.3]},
      {"obj":"tree.far-birch","at":[240,167.4]},
      {"cluster":"plant.reed","on":"reeds-l","n":90,"seed":76},
      {"cluster":"plant.reed","on":"reeds-r","n":80,"seed":77},
      {"cluster":"plant.reed","on":"reeds-n","n":90,"seed":78},
      {"cluster":"plant.bracken","on":"carr-l","n":26,"seed":80},
      {"cluster":"plant.bracken","on":"carr-r","n":22,"seed":81},
      {"cluster":"plant.grass-long","on":"carr-l","n":40,"seed":82},
      {"cluster":"plant.grass-long","on":"carr-r","n":30,"seed":92},
      {"cluster":"plant.ling-heather","on":"carr-l","n":12,"seed":83},
      {"cluster":"water.lily","on":"pond","n":14,"seed":85},
      {"cluster":"ground.leaf-litter","on":"carr-l","n":18,"seed":86}
    ],
    ground: {"features":[]},
    life: [
      {"id":"walkers","who":"walkers","on":"fen-walk","rate":"3/min","mix":{"stroll":0.6,"birdwatcher":0.2,"dog-walker":0.2},"edges":["S"]},
      {"id":"watcher","who":"visit","on":"fen-walk","mix":{"birdwatcher":1},"rate":"1/4min","edges":["S"],"goals":[{"go":"fen-deck"},{"do":"look","for":[30,90]},{"leave":"S"}]},
      {"id":"far","who":"walkers","on":"shore-path","rate":"6/min","mix":{"stroll":0.4,"dog-walker":0.35,"jogger":0.25},"edges":["W","E"]},
      {"who":"heron","count":1,"on":"pond","state":"wade"},
      {"who":"kingfisher","count":1,"goals":[{"do":"perch","for":[20,60]},{"do":"dive","for":[1,2]},{"do":"perch","for":[20,60]}]},
      {"who":"coot","count":3,"on":"pond"},
      {"who":"mallard","count":6,"on":"pond"},
      {"who":"mute-swan","count":2,"on":"pond","group":"pair"},
      {"who":"grebe","count":2,"on":"pond"}
    ],
    backdrop: {"style":"heath"},
    seed: 55,
  });
})();
