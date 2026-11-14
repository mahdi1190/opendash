/* ============================================================
   WORLD SCENE (format v3) world-test / cotswold-green-1-w3: A Cotswold village green, Gloucestershire.
   Made by the scene factory: archetype 'village-green' (tools/lib/world/archetypes.mjs; gold cotswold-green-1-w3), from the brief
     {"place":"A Cotswold village green, Gloucestershire","lat":51.76,"lon":-1.835,"county":"gloucestershire","town":"Bibury","houses":"cotswold-stone","heading":20,"seed":10916,"landmark":{"stone":"honey","crown":"parapet"},"alt":60,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote cotswold-green-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"cotswold-green-1-w3","label":"A Cotswold village green, Gloucestershire (world)","site":"A Cotswold village green, Gloucestershire","mood":"calm","colour":"green","tags":["uk","cotswold-green","village-green","world-v3"],"liveSky":{"lat":51.76,"lon":-1.835},"ukPlace":"cotswold-green","county":"gloucestershire","ukTown":"Bibury","ukView":"village-green"}, {
    v: 3,
    place: {"lat":51.76,"lon":-1.835,"alt":60,"region":"uk","style":"village-green"},
    camera: {"eye":1.7,"fov":64,"horizon":470,"heading":20},
    surfaces: [
      {"id":"green","kind":"grass","poly":[[-190,0.5],[190,0.5],[190,122],[-190,122]]},
      {"id":"lane","kind":"road","path":[[-190,83],[-60,84.5],[60,81.5],[190,83.5]],"width":4.6},
      {"id":"walk","kind":"path","path":[[-1,5.1],[2.1,16],[9.4,38],[15.7,76],[16.7,81]],"width":1.8},
      {"id":"lane-walk","kind":"pavement","path":[[-190,79.6],[-60,81.1],[60,78.1],[190,80.1]],"width":1.8},
      {"id":"church-walk","kind":"path","path":[[16.7,82],[16.9,86.2],[19.3,90],[22.9,93.6],[24.9,96.2]],"width":1.8},
      {"id":"pond","kind":"water","water":"pond","shallow":0.45,"poly":[[3.2,24],[1.8,25.8],[-0.6,27.4],[-3.4,29],[-8,28.3],[-11.9,28.3],[-15,27.2],[-19.2,26.1],[-18.5,24],[-19.6,21.8],[-16.5,20.1],[-11.7,19.9],[-8,18.8],[-3.9,19.5],[0.2,20.3],[3.5,21.8]]}
    ],
    lines: [
      {"id":"churchyard-wall","kind":"wall","laid":"coursed","cope":"saddle","stone":"#b99c68","h":1.1,"width":0.5,"path":[[3.1,105.5],[3.5,86.2],[41,86.2],[41.5,105.5]],"gaps":[[30.8,34.3]]}
    ],
    buildings: [
      {"id":"far","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":0,"to":190.5,"shops":false,"depth":[6,9]},
      {"id":"far-2","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":234.5,"to":380,"shops":false,"depth":[6,9]}
    ],
    entities: [
      {"id":"frame-l","obj":"tree.horse-chestnut","at":[-15.9,12],"framed":true},
      {"id":"frame-r","obj":"tree.green-oak","at":[17.1,16],"framed":true},
      {"obj":"tree.green-birch","at":[-12.9,62]},
      {"obj":"tree.green-oak","at":[-110,70]},
      {"obj":"tree.green-chestnut","at":[120,64]},
      {"obj":"tree.green-birch","at":[60,58]},
      {"id":"path-lamp","obj":"street.lamppost","at":[11,38]},
      {"id":"bench-2","obj":"street.bench","at":[10,56.2],"facing":90},
      {"cluster":"plant.grass-long","on":"green","n":30,"seed":10919},
      {"cluster":"plant.daisies","on":"green","n":40,"seed":10920},
      {"cluster":"ground.leaf-litter","on":"green","n":10,"seed":10921},
      {"obj":"structure.lychgate","at":[16.9,86.2],"facing":0,"id":"lychgate","blocks":true,"model":{"livery":"oak","seed":4}},
      {"obj":"tree.churchyard-yew","at":[10.9,92],"id":"yew-1","model":{"size":0.78,"seed":2}},
      {"obj":"tree.churchyard-yew","at":[38.1,91],"id":"yew-2","model":{"size":0.95,"seed":7}},
      {"obj":"tree.churchyard-yew","at":[29,93],"id":"yew-3","model":{"size":0.85,"seed":5}},
      {"obj":"structure.headstone","at":[8.3,88.3],"facing":90,"id":"stone-0","model":{"size":0.99}},
      {"obj":"structure.headstone","at":[14.4,88.5],"facing":215,"id":"stone-1","model":{"size":0.97}},
      {"obj":"structure.headstone","at":[22.4,88.8],"facing":170,"id":"stone-2","model":{"size":1.16}},
      {"obj":"structure.headstone","at":[26.6,88.6],"facing":180,"id":"stone-3","model":{"size":0.99}},
      {"obj":"structure.headstone","at":[29.5,88.8],"facing":210,"id":"stone-4","model":{"size":1.19}},
      {"obj":"structure.headstone","at":[33.6,88.3],"facing":199,"id":"stone-5","model":{"size":1.2}},
      {"obj":"structure.headstone","at":[8.3,90.3],"facing":211,"id":"stone-6","model":{"size":1.16}},
      {"obj":"structure.headstone","at":[14.3,90.8],"facing":167,"id":"stone-7","model":{"size":1.17}},
      {"obj":"structure.headstone","at":[26,90.8],"facing":157,"id":"stone-8","model":{"size":0.96}},
      {"obj":"structure.headstone","at":[30.3,90.2],"facing":211,"id":"stone-9","model":{"size":0.91}},
      {"obj":"structure.headstone","at":[33.7,90.7],"facing":111,"id":"stone-10","model":{"size":0.93}},
      {"obj":"structure.headstone","at":[7.7,92.4],"facing":179,"id":"stone-11","model":{"size":1.13}},
      {"obj":"structure.headstone","at":[16.8,92.6],"facing":208,"id":"stone-12","model":{"size":1.19}},
      {"obj":"structure.headstone","at":[28.2,92.4],"facing":90,"id":"stone-13","model":{"size":1.02}},
      {"obj":"structure.headstone","at":[32,92.1],"facing":145,"id":"stone-14","model":{"size":0.97}},
      {"obj":"structure.headstone","at":[9,94.2],"facing":156,"id":"stone-15","model":{"size":1.18}},
      {"obj":"structure.headstone","at":[18.8,94.3],"facing":146,"id":"stone-16","model":{"size":1.06}},
      {"obj":"structure.headstone","at":[32.5,93.9],"facing":181,"id":"stone-17","model":{"size":1.13}},
      {"obj":"structure.headstone","at":[35.2,94.3],"facing":159,"id":"stone-18","model":{"size":1.1}}
    ],
    landmarks: [
      {"id":"church","obj":"structure.parish-church","at":[22.5,104],"facing":90,"src":"A Cotswold village green, Gloucestershire: the parish church across the green","model":{"livery":"honey","size":1.05,"seed":3,"opts":{"era":"perpendicular","aisle":"south","crown":"parapet","porch":true}}}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"walk","rate":"4/min","mix":{"stroll":0.35,"dog-walker":0.3,"family":0.15,"elderly":0.2},"edges":["S","N"]},
      {"id":"sitter","who":"visit","on":"walk","rate":"1/3min","mix":{"elderly":0.5,"stroll":0.5},"edges":["S"],"goals":[{"sit":"bench-2","for":[40,120]},{"leave":"S"}]},
      {"id":"far","who":"walkers","on":"lane-walk","rate":"6/min","mix":{"stroll":0.4,"dog-walker":0.3,"elderly":0.3},"edges":["W","E"]},
      {"id":"cars","who":"cars","on":"lane","rate":"3/min"},
      {"who":"mallard","count":5,"on":"pond"},
      {"who":"moorhen","count":1,"on":"pond"}
    ],
    backdrop: {"style":"farmland"},
    seed: 10916,
  });
})();
