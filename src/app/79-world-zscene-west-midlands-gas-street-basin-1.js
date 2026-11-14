/* ============================================================
   WORLD SCENE (format v3) world-test / west-midlands-gas-street-basin-1-w3: Gas Street Basin, Birmingham.
   Made by the scene factory: archetype 'canal-basin' (tools/lib/world/archetypes.mjs; gold greater-manchester-castlefield-basin-w3), from the brief
     {"place":"Gas Street Basin, Birmingham","lat":52.477,"lon":-1.907,"county":"west-midlands","town":"Birmingham","heading":20,"side":"left","houses":"canal-warehouse","alt":60,"seed":12847,"region":"uk"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote west-midlands-gas-street-basin-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"west-midlands-gas-street-basin-1-w3","label":"Gas Street Basin, Birmingham (world)","site":"Gas Street Basin, Birmingham","mood":"calm","colour":"green","tags":["uk","west-midlands-gas-street-basin","canal-basin","world-v3"],"liveSky":{"lat":52.477,"lon":-1.907},"ukPlace":"west-midlands-gas-street-basin","county":"west-midlands","ukTown":"Birmingham","ukView":"canal-basin"}, {
    v: 3,
    place: {"lat":52.477,"lon":-1.907,"alt":60,"region":"uk","style":"river-city"},
    camera: {"eye":1.7,"fov":62,"horizon":520,"heading":20,"water":-0.7},
    surfaces: [
      {"id":"wharf","kind":"plaza","poly":[[-22,0.5],[22,0.5],[22,8.8],[-22,8.8]]},
      {"id":"quay","kind":"plaza","poly":[[-13.4,8.6],[-11.5,20],[-9.9,32],[-7.8,50],[-6,70],[-4.3,95],[-3.3,120],[-2.7,150],[-2.8,180],[-3.6,220],[-5.1,260],[-7.6,320],[-10,420],[-19,420],[-16.6,320],[-14.1,260],[-12.6,220],[-11.8,180],[-11.7,150],[-12.3,120],[-13.3,95],[-15,70],[-16.8,50],[-18.9,32],[-20.5,20],[-22.4,8.6]]},
      {"id":"tow","kind":"towpath","poly":[[14.2,8.6],[13.3,20],[12.7,32],[12,50],[11.6,70],[11.3,95],[11.1,120],[10.7,150],[10,180],[8.8,220],[7.1,260],[4.4,320],[2,420],[6,420],[8.4,320],[11.1,260],[12.8,220],[14,180],[14.7,150],[15.1,120],[15.3,95],[15.6,70],[16,50],[16.7,32],[17.3,20],[18.2,8.6]]},
      {"id":"green","kind":"grass","poly":[[18.2,8.6],[17.3,20],[16.7,32],[16,50],[15.6,70],[15.3,95],[15.1,120],[14.7,150],[14,180],[12.8,220],[11.1,260],[8.4,320],[6,420],[90,420],[90,6]]},
      {"id":"basin","kind":"water","water":"canal","shallow":0.6,"poly":[[-13.4,8.6],[-11.5,20],[-9.9,32],[-7.8,50],[-6,70],[-4.3,95],[-3.3,120],[-2.7,150],[-2.8,180],[-3.6,220],[-5.1,260],[-7.6,320],[-10,420],[2,420],[4.4,320],[7.1,260],[8.8,220],[10,180],[10.7,150],[11.1,120],[11.3,95],[11.6,70],[12,50],[12.7,32],[13.3,20],[14.2,8.6]]},
      {"id":"bridge","kind":"bridge-deck","path":[[-10,58],[14.8,58]],"width":2.6,"over":"water","y":2.4},
      {"id":"quay-back","kind":"pavement","path":[[-22.9,8.6],[-21,20],[-19.4,32],[-17.3,50],[-15.5,70],[-13.8,95],[-12.8,120],[-12.2,150],[-12.3,180],[-13.1,220],[-14.6,260],[-17.1,320],[-19.5,420]],"width":1.6}
    ],
    buildings: [
      {"id":"warehouses","along":"quay-back","side":"left","style":"canal-warehouse","storeys":[4,6],"from":8,"to":300,"depth":[14,22],"shops":false}
    ],
    entities: [
      {"id":"moored-1","obj":"boat.narrowboat","at":[-8.5,31],"attach":"water","facing":0,"model":{"seed":12847}},
      {"id":"moored-2","obj":"boat.narrowboat","at":[10.6,36],"attach":"water","facing":0,"model":{"seed":12854}},
      {"id":"moored-3","obj":"boat.narrowboat","at":[-2.9,82],"attach":"water","facing":0,"model":{"seed":12861}},
      {"id":"moored-4","obj":"boat.narrowboat","at":[9.9,92],"attach":"water","facing":0,"model":{"seed":12868}},
      {"id":"viaduct","obj":"structure.viaduct","at":[3.8,170],"facing":90,"attach":"water","model":{"livery":"soot-grey","seed":12847,"size":2.4,"opts":{"kind":"arcade"}}},
      {"id":"frame-tree","obj":"tree.plane-avenue","at":[20.6,16],"framed":true},
      {"id":"frame-lamp","obj":"street.lamppost","at":[-3.8,7],"framed":true},
      {"obj":"tree.plane-avenue","at":[18.7,30]},
      {"obj":"tree.plane-avenue","at":[17.6,60]},
      {"obj":"tree.plane-avenue","at":[17.3,90]},
      {"obj":"street.bollard","at":[-13.7,12]},
      {"obj":"street.bollard","at":[-12.9,19]},
      {"obj":"street.bollard","at":[-11.5,26]},
      {"obj":"street.bollard","at":[-10.7,33]},
      {"obj":"street.bollard","at":[-11.9,7.6]},
      {"obj":"street.bollard","at":[-5.5,7.6]},
      {"obj":"street.bollard","at":[5.9,7.6]},
      {"obj":"street.bollard","at":[12.3,7.6]},
      {"obj":"structure.mcr-planter","at":[-14,5],"variant":0},
      {"obj":"street.bench","at":[-9,6.2],"facing":0},
      {"obj":"street.bench","at":[8,4],"facing":0},
      {"cluster":"plant.grass-long","on":"green","n":30,"seed":12856},
      {"cluster":"ground.leaf-litter","on":"tow","n":10,"seed":12857}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"tow","rate":"6/min","mix":{"stroll":0.4,"dog-walker":0.2,"jogger":0.15,"couple":0.25},"edges":["S","N"]},
      {"id":"quayside","who":"walkers","on":"quay","rate":"4/min","mix":{"stroll":0.5,"commuter":0.3,"couple":0.2},"edges":["S","N"]},
      {"id":"far","who":"walkers","on":"bridge","rate":"5/min","mix":{"stroll":0.6,"commuter":0.4}},
      {"who":"mallard","count":4,"on":"basin"},
      {"who":"mute-swan","count":2,"on":"basin","group":"pair"},
      {"who":"gulls","count":3}
    ],
    backdrop: {"style":"city-victorian"},
    seed: 12847,
    landmarks: [
      {"id":"bridge-arch","obj":"structure.bridge-brick","at":[2.4,58],"facing":90,"attach":"water","src":"Gas Street Basin, Birmingham: the bridge across the basin"}
    ],
  });
})();
