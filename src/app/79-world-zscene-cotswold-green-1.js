/* WORLD SCENE (format v3) world-test / cotswold-green-1-w3: A Cotswold village green, Gloucestershire. Scaffolded by `node tools/world.mjs new cotswold-green --setting village-green` (layout family 'green', a green with a lane round it and houses on three sides).
   View: looking north across the green to the church tower. A FIRST DRAFT: edit the lists below, then render and read docs/dev/NEW_SCENE_GUIDE.md section 5. PURE; hidden dev pack 'world-test'. */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"cotswold-green-1-w3","label":"A Cotswold village green, Gloucestershire (world)","site":"A Cotswold village green, Gloucestershire","mood":"calm","colour":"slate","tags":["uk","cotswold-green","village-green","world-v3"],"liveSky":{"lat":51.76,"lon":-1.835},"ukPlace":"cotswold-green","county":"gloucestershire","ukTown":"Cotswolds","ukView":"world-engine","setting":"a green with a lane round it and houses on three sides"}, {
    v: 3, place: {"lat":51.76,"lon":-1.835,"alt":60,"region":"uk","style":"village-green"},
    camera: {"eye":8,"fov":64,"horizon":500,"heading":0},
    surfaces: [
      {"id":"green","kind":"grass","poly":[[-190,1],[190,1],[190,118],[-190,118]]},
      {"id":"lane","kind":"road","path":[[-190,78],[-60,80],[60,77],[190,79]],"width":4.2},
      {"id":"lane-l","kind":"road","path":[[-96,1],[-98,40],[-96,78]],"width":4},
      {"id":"lane-r","kind":"road","path":[[96,1],[98,40],[96,78]],"width":4},
      {"id":"walk","kind":"path","path":[[8,1],[12,28],[14,54],[16,78]],"width":1.8},
      {"id":"pub-front","kind":"pavement","path":[[-52,73],[-22,73]],"width":3.2},
      {"id":"pond","kind":"water","water":"pond","poly":[[-8.8,40],[-8.2,43.8],[-14.2,46.7],[-22.1,47.7],[-30.9,49.7],[-38.2,46.9],[-44.1,43.9],[-45.8,40],[-43.9,36.1],[-37.7,33.4],[-30.1,31.9],[-21.3,30.7],[-14.8,33.7],[-8.6,36.2]],"shallow":0.45}
    ],
    lines: [
      {"id":"churchyard-wall","kind":"wall","stone":"#b99c68","path":[[1,80],[41,80]],"gaps":[{"at":[17,80],"w":2.4}]}
    ],
    buildings: [
      {"id":"far","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":0,"to":138,"shops":false,"depth":[6,8]},
      {"id":"far-2","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":166,"to":192,"shops":false,"depth":[6,8]},
      {"id":"far-3","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":230,"to":380,"shops":false,"depth":[6,8]},
      {"id":"west","along":"lane-l","side":"left","style":"cotswold-stone","storeys":[1,2],"from":0,"to":82,"shops":false,"depth":[6,8]},
      {"id":"east","along":"lane-r","side":"right","style":"cotswold-stone","storeys":[1,2],"from":0,"to":82,"shops":false,"depth":[6,8]},
      {"id":"church","foot":[[6,85],[36,85],[36,96],[6,96]],"storeys":1,"h":16,"landmark":true,"style":"cotswold-church","crown":"squat-tower","src":"the parish church: a long low nave and a square tower"},
      {"id":"pub","foot":[[-48,84],[-28,84],[-28,94],[-48,94]],"storeys":2,"landmark":true,"style":"cotswold-stone","src":"the village pub: a bigger house facing the green"}
    ],
    entities: [
      {"obj":"street.bench","at":[14.2,32],"facing":270,"id":"bench-1"},
      {"obj":"plant.rph-church-shrub","at":[37,82],"id":"yard-shrub-1"},
      {"obj":"street.rph-headstone","at":[22,82.6],"id":"stones-1"},
      {"obj":"street.rph-headstone","at":[11,83.4],"id":"stones-2"},
      {"obj":"street.pub-sign","at":[-37,73],"facing":0,"id":"pub-sign"}
    ],
    life: [
      {"who":"walkers","on":"walk","rate":"3/min","mix":{"stroll":0.4,"dog-walker":0.3,"family":0.15,"elderly":0.15},"edges":["S","N"]},
      {"who":"mallard","count":6,"on":"pond"},
      {"who":"moorhen","count":1,"on":"pond"}
    ],
    seed: 63,
  });
})();
