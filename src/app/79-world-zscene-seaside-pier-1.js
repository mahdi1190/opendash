/* WORLD SCENE (format v3) world-test / seaside-pier-1-w3: A Victorian seaside pier and promenade, England. Scaffolded by `node tools/world.mjs new seaside-pier --setting coast` (layout family 'coast', a promenade along a beach, the sea on the right).
   View: looking east along the promenade, the sea on the right. A FIRST DRAFT: edit the lists below, then render and read docs/dev/NEW_SCENE_GUIDE.md section 5. PURE; hidden dev pack 'world-test'. */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"seaside-pier-1-w3","label":"A Victorian seaside pier and promenade, England (world)","site":"A Victorian seaside pier and promenade, England","mood":"calm","colour":"slate","tags":["uk","seaside-pier","coast","world-v3"],"liveSky":{"lat":50.82,"lon":-0.14},"ukPlace":"seaside-pier","county":"sussex","ukTown":"Seaside","ukView":"world-engine","setting":"a promenade along a beach, the sea on the right"}, {
    v: 3, place: {"lat":50.82,"lon":-0.14,"alt":60,"region":"uk","style":"coast"},
    camera: {"eye":3.2,"fov":70,"horizon":470,"heading":90},
    ground: {"features":[{"kind":"embankment","path":[[50,560],[260,560]],"width":180,"h":12}]},
    surfaces: [
      {"id":"prom","kind":"pavement","path":[[0,1],[-1,160],[3,330],[8,560]],"width":8},
      {"id":"sand","kind":"sand","poly":[[5,1],[30,1],[38,600],[14,600]]},
      {"id":"sea","kind":"water","water":"sea","poly":[[26,1],[900,1],[900,440],[36,440]],"shallow":1.5},
      {"id":"headland","kind":"grass","poly":[[40,440],[400,440],[400,700],[30,700]]},
      {"id":"front","kind":"plaza","poly":[[-20,1],[-4,1],[-3,560],[-17,560]]},
      {"id":"town","kind":"road","path":[[-23,1],[-24,160],[-21,330],[-18,560]],"width":5}
    ],
    lines: [
      {"id":"sea-rail","kind":"railing","path":[[4.6,1],[3.6,160],[7.6,330],[12.6,560]]}
    ],
    buildings: [
      {"id":"hotels","along":"town","side":"left","style":"georgian","storeys":[3,4],"from":44,"to":600,"shops":false,"depth":[10,14]}
    ],
    entities: [
      {"obj":"street.bench","at":[3,24],"facing":90,"id":"bench-1"},
      {"obj":"street.lamppost","at":[4.3,44],"id":"lamp-1"},
      {"obj":"street.lamppost","at":[3.9,100],"id":"lamp-2"},
      {"obj":"structure.pier","at":[57,119],"facing":40,"attach":"water","id":"pier","model":{"size":0.85}},
      {"obj":"building.beach-huts","at":[11,22],"facing":270,"id":"huts-1"},
      {"obj":"building.beach-huts","at":[11,36],"facing":270,"id":"huts-2"},
      {"obj":"building.beach-huts","at":[11,50],"facing":270,"id":"huts-3"},
      {"obj":"structure.lighthouse","at":[120,520],"id":"lighthouse","model":{"livery":"white-red"}}
    ],
    life: [
      {"who":"walkers","on":"prom","rate":"7/min","mix":{"stroll":0.4,"family":0.25,"dog-walker":0.2,"couple":0.15},"edges":["S","N"]},
      {"who":"gulls","count":8}
    ],
    seed: 85,
  });
})();
