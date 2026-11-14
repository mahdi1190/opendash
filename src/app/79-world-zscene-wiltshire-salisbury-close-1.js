/* ============================================================
   WORLD SCENE (format v3) world-test / wiltshire-salisbury-close-1-w3: Salisbury Cathedral from the Close.
   Made by the scene factory: archetype 'civic-square-facade' (tools/lib/world/archetypes.mjs; gold greater-manchester-manchester-centre-1-w3), from the brief
     {"place":"Salisbury Cathedral from the Close","lat":51.065,"lon":-1.798,"county":"wiltshire","town":"Salisbury","heading":120,"ground":"grass","far":"cars","frame":"tree","rows":"2-3","houses":"georgian","landmark":{"style":"gothic-minster","crown":"central-spire","w":38,"d":130,"storeys":3},"backdrop":"town-low","alt":60,"seed":17350,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote wiltshire-salisbury-close-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"wiltshire-salisbury-close-1-w3","label":"Salisbury Cathedral from the Close (world)","site":"Salisbury Cathedral from the Close","mood":"calm","colour":"green","tags":["uk","wiltshire-salisbury-close","civic-square-facade","world-v3"],"liveSky":{"lat":51.065,"lon":-1.798},"ukPlace":"wiltshire-salisbury-close","county":"wiltshire","ukTown":"Salisbury","ukView":"civic-square-facade"}, {
    v: 3,
    place: {"lat":51.065,"lon":-1.798,"alt":60,"region":"uk","style":"civic-square"},
    camera: {"eye":1.65,"fov":76,"horizon":660,"heading":120},
    surfaces: [
      {"id":"square","kind":"grass","poly":[[-11.1,0.5],[60,0.5],[66,108],[-31.2,108]]},
      {"id":"pave","kind":"pavement","path":[[-14.7,4],[-24.8,60],[-39.2,140],[-57.2,240]],"width":4},
      {"id":"front","kind":"pavement","poly":[[35.3,206.5],[66.5,184.7],[63.1,179.8],[31.9,201.6]]},
      {"id":"line","kind":"road","path":[[-260,120],[260,104]],"width":9},
      {"id":"pave-far","kind":"pavement","path":[[-260,114],[260,98]],"width":3.4},
      {"id":"walk","kind":"path","path":[[-2,-2],[-1,8],[19.4,70.8],[38.8,141.5],[55.5,202.2]],"width":2.4}
    ],
    buildings: [
      {"id":"landmark","foot":[[35.3,206.5],[66.5,184.7],[141,291.2],[109.9,313]],"storeys":3,"style":"gothic-minster","crown":"central-spire","landmark":true,"front":0,"src":"Salisbury Cathedral from the Close: the civic landmark"},
      {"id":"street","along":"pave","side":"left","style":"georgian","storeys":[2,3],"from":6,"to":140,"depth":[14,20],"shops":false}
    ],
    entities: [
      {"id":"frame-statue","obj":"tree.green-oak","at":[-16.8,12],"framed":true},
      {"id":"frame-lamp","obj":"street.lamppost","at":[4.3,6.5],"framed":true},
      {"obj":"tree.green-oak","at":[52,88]},
      {"obj":"street.lamppost","at":[19.1,30]},
      {"obj":"street.lamppost","at":[22.7,70]},
      {"obj":"street.lamppost","at":[18.5,110]},
      {"obj":"street.bollard","at":[-3,40]},
      {"obj":"street.bollard","at":[-1.5,40.6]},
      {"obj":"street.bollard","at":[0,41.2]},
      {"cluster":"ground.leaves","on":"square","n":14,"seed":17352}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"walk","rate":"8/min","mix":{"stroll":0.4,"couple":0.2,"family":0.15,"elderly":0.15,"dog-walker":0.1},"edges":["S"]},
      {"id":"lookers","who":"visit","on":"walk","rate":"1/min","mix":{"stroll":0.5,"couple":0.5},"edges":["S"],"goals":[{"go":[6,26]},{"do":"look","for":[20,60]},{"leave":"S"}]},
      {"id":"street","who":"walkers","on":"pave","rate":"5/min"},
      {"id":"far","who":"cars","on":"line","rate":"3/min"},
      {"id":"farwalk","who":"walkers","on":"pave-far","rate":"4/min"}
    ],
    backdrop: {"style":"town-low"},
    seed: 17350,
  });
})();
