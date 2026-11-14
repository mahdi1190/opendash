/* ============================================================
   WORLD SCENE (format v3) world-test / devon-plymouth-hoe-1-w3: Plymouth Hoe.
   Made by the scene factory: archetype 'waterfront-civic' (tools/lib/world/archetypes.mjs; gold liverpool-pier-head-1-w3), from the brief
     {"place":"Plymouth Hoe","lat":50.364,"lon":-4.142,"county":"devon","town":"Plymouth","heading":280,"bank":"12","back":"80","ground":"grass","water":"sea","houses":"georgian,seafront-regency,edwardian","alt":60,"seed":10885,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote devon-plymouth-hoe-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"devon-plymouth-hoe-1-w3","label":"Plymouth Hoe (world)","site":"Plymouth Hoe","mood":"calm","colour":"green","tags":["uk","devon-plymouth-hoe","waterfront-civic","world-v3"],"liveSky":{"lat":50.364,"lon":-4.142},"ukPlace":"devon-plymouth-hoe","county":"devon","ukTown":"Plymouth","ukView":"waterfront-civic"}, {
    v: 3,
    place: {"lat":50.364,"lon":-4.142,"alt":60,"region":"uk","style":"waterfront-city"},
    camera: {"eye":1.7,"fov":74,"horizon":520,"heading":280,"water":-2.4},
    surfaces: [
      {"id":"water","kind":"water","water":"sea","shallow":2,"poly":[[-1400,-60],[3.8,-60],[-1.6,0.5],[-2.1,6],[-3.4,20],[-7,60],[-14.2,140],[-25,260],[-39.4,420],[-1400,420]]},
      {"id":"prom","kind":"pavement","poly":[[3.8,-60],[-1.6,0.5],[-2.1,6],[-3.4,20],[-7,60],[-14.2,140],[-25,260],[-39.4,420],[-30.4,420],[-16,260],[-5.2,140],[2,60],[5.6,20],[6.9,6],[7.4,0.5],[12.8,-60]]},
      {"id":"land","kind":"grass","poly":[[12.8,-60],[7.4,0.5],[6.9,6],[5.6,20],[2,60],[-5.2,140],[-16,260],[-30.4,420],[32.6,420],[47,260],[57.8,140],[65,60],[68.6,20],[69.9,6],[70.4,0.5],[75.8,-60]]},
      {"id":"road","kind":"road","path":[[79.8,-60],[36.6,420]],"width":8},
      {"id":"pave","kind":"pavement","path":[[86.8,-60],[43.6,420]],"width":4}
    ],
    lines: [
      {"id":"rail","kind":"railing","path":[[-1.1,0.5],[-1.6,6],[-2.9,20],[-6.5,60],[-13.7,140],[-24.5,260],[-38.9,420]]}
    ],
    buildings: [
      {"id":"front-0","along":"pave","side":"right","style":"georgian","storeys":[4,6],"from":70,"to":161,"depth":[14,22],"shops":false},
      {"id":"front-1","along":"pave","side":"right","style":"seafront-regency","storeys":[4,6],"from":167,"to":265,"depth":[14,22],"shops":false},
      {"id":"front-2","along":"pave","side":"right","style":"edwardian","storeys":[4,6],"from":271,"to":331,"depth":[14,22],"shops":false}
    ],
    entities: [
      {"id":"frame-yacht","obj":"boat.yacht","at":[-10.2,15],"facing":90,"attach":"water","framed":true,"model":{"seed":10890}},
      {"id":"wall-lamp","obj":"street.lamppost","at":[-1.8,16]},
      {"id":"frame-tree","obj":"tree.plane-avenue","at":[17.6,13],"framed":true},
      {"id":"bench-1","obj":"street.bench","at":[5,11],"facing":270},
      {"id":"bench-2","obj":"street.bench","at":[3.8,24],"facing":270},
      {"obj":"street.mcr-bin","at":[5.1,15]},
      {"obj":"plant.rph-flower-tub","at":[6,9]},
      {"obj":"plant.rph-flower-tub","at":[4.1,30]},
      {"obj":"boat.yacht","at":[-49.7,90],"facing":-3,"attach":"water","model":{"seed":10885}},
      {"obj":"boat.yacht","at":[-85.1,150],"facing":196.5,"attach":"water","model":{"seed":10894}},
      {"obj":"boat.yacht","at":[-50.5,210],"facing":-18.1,"attach":"water","model":{"seed":10903}},
      {"obj":"boat.trip-boat","at":[-135,260],"facing":194.4,"attach":"water","model":{"seed":10912}}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"prom","rate":"16/min","mix":{"stroll":0.4,"couple":0.2,"family":0.15,"dog-walker":0.1,"jogger":0.15},"edges":["S","N"]},
      {"id":"lookers","who":"visit","on":"prom","rate":"1/min","mix":{"stroll":0.5,"couple":0.5},"edges":["S"],"goals":[{"go":[-1.8,17]},{"do":"look","for":[20,50]},{"leave":"N"}]},
      {"id":"sitter","who":"visit","on":"prom","rate":"1/2min","mix":{"elderly":0.6,"couple":0.4},"edges":["S"],"goals":[{"sit":"bench-2","for":[40,120]},{"leave":"S"}]},
      {"id":"land","who":"walkers","on":"land","rate":"3/min","mix":{"stroll":0.5,"family":0.3,"couple":0.2}},
      {"id":"far","who":"buses","on":"road","rate":"2/min"},
      {"who":"cars","on":"road","rate":"4/min"},
      {"who":"gulls","count":6}
    ],
    backdrop: {"style":"estuary"},
    seed: 10885,
    ground: {"features":[{"id":"bank","kind":"embankment","path":[[122.4,-200],[23.4,900]],"width":192,"h":12}]},
    landmarks: [
      {"id":"landmark","obj":"structure.lighthouse","at":[20.1,80],"facing":270,"src":"Plymouth Hoe: the landmark on the waterfront","model":{"livery":"white-red","size":1,"seed":23}}
    ],
  });
})();
