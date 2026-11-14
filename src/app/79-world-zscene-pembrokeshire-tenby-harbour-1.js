/* ============================================================
   WORLD SCENE (format v3) world-test / pembrokeshire-tenby-harbour-1-w3: Tenby harbour.
   Made by the scene factory: archetype 'harbour-under-cliff' (tools/lib/world/archetypes.mjs; gold whitby-harbour-1-w3), from the brief
     {"place":"Tenby harbour","lat":51.6727,"lon":-4.6996,"county":"pembrokeshire","town":"Tenby","heading":300,"rock":"limestone","h":"20","houses":"pantile-cottage","top":"seafront-regency","alt":60,"seed":10182,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote pembrokeshire-tenby-harbour-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"pembrokeshire-tenby-harbour-1-w3","label":"Tenby harbour (world)","site":"Tenby harbour","mood":"calm","colour":"green","tags":["uk","pembrokeshire-tenby-harbour","harbour-under-cliff","world-v3"],"liveSky":{"lat":51.6727,"lon":-4.6996},"ukPlace":"pembrokeshire-tenby-harbour","county":"pembrokeshire","ukTown":"Tenby","ukView":"harbour-under-cliff"}, {
    v: 3,
    place: {"lat":51.6727,"lon":-4.6996,"alt":60,"region":"uk","style":"quayside"},
    camera: {"eye":3,"fov":64,"horizon":470,"heading":300,"water":-2.4},
    ground: {"features":[{"id":"cliff","kind":"cliff","path":[[-340,144],[-120,138],[40,141],[200,136],[360,142]],"h":20,"high":"far","rock":"limestone","rough":1.1,"scree":{"w":6,"h":2},"rim":{"w":2,"h":0.8},"fade":30}]},
    surfaces: [
      {"id":"quay","kind":"plaza","poly":[[2.7,0.5],[1.2,8],[-1.2,20],[-4.2,35],[-8.2,55],[-12.2,75],[-18.4,106],[-240,106],[-240,0.5]]},
      {"id":"finger","kind":"plaza","poly":[[6.2,0.5],[60,0.5],[60,6],[11.7,6],[11.7,24],[6.2,24]]},
      {"id":"harbour","kind":"water","water":"harbour","shallow":1.2,"poly":[[1.2,6.4],[6.2,6.4],[6.2,25],[11.7,25],[11.7,6],[400,6],[400,108],[-18.8,108],[-18.2,106],[-12,75],[-8,55],[-4,35],[-1,20]]},
      {"id":"beach","kind":"sand","poly":[[-18.8,108],[400,108],[400,121],[-240,121],[-240,108]]},
      {"id":"quay-back","kind":"pavement","path":[[-11.8,8],[-14.2,20],[-17.2,35],[-21.2,55],[-25.2,75],[-31.4,106]],"width":2},
      {"id":"shore-st","kind":"pavement","path":[[-260,123],[-60,124.5],[80,122],[320,123]],"width":5},
      {"id":"cliff-top","kind":"grass","poly":[[-340,152],[360,152],[360,358],[-340,358]]},
      {"id":"shore-yards","kind":"plaza","poly":[[-260,126],[320,126],[320,139],[-260,139]]},
      {"id":"lane-0","kind":"path","path":[[-300,154],[-100,155.5],[100,153],[300,154]],"width":2.6}
    ],
    buildings: [
      {"id":"quay-row","along":"quay-back","side":"left","style":"pantile-cottage","storeys":[2,3],"from":4,"to":400,"depth":[7,10],"shops":["cafe","gift","fishmonger","ice_cream"]},
      {"id":"shore-row","along":"shore-st","side":"left","style":"pantile-cottage","storeys":[2,3],"from":147.1,"to":372.9,"depth":[7,9],"shops":false},
      {"id":"lane-0-a","from":167.8,"to":313.1,"along":"lane-0","side":"left","style":"seafront-regency","storeys":[3,4],"depth":[9,12],"shops":false},
      {"id":"lane-0-b","from":361.1,"to":432.2,"along":"lane-0","side":"left","style":"seafront-regency","storeys":[3,4],"depth":[9,12],"shops":false}
    ],
    entities: [
      {"id":"frame-lamp","obj":"street.lamppost","at":[7.4,13],"framed":true},
      {"id":"yacht","obj":"boat.yacht","at":[4,14],"facing":0,"attach":"water","model":{"seed":10185}},
      {"id":"moored-0","obj":"boat.fishing-boat","at":[-0.4,32],"facing":348,"attach":"water","model":{"seed":10182}},
      {"id":"moored-1","obj":"boat.fishing-boat","at":[-4,50],"facing":348,"attach":"water","model":{"seed":10193}},
      {"id":"moored-2","obj":"boat.fishing-boat","at":[-8,70],"facing":348,"attach":"water","model":{"seed":10204}},
      {"obj":"boat.dinghy","at":[60.9,40.8],"facing":168.9,"attach":"water","model":{"seed":10222}},
      {"obj":"boat.dinghy","at":[66.1,53.7],"facing":221.2,"attach":"water","model":{"seed":10223}},
      {"obj":"boat.dinghy","at":[43.9,75.1],"facing":30.7,"attach":"water","model":{"seed":10224}},
      {"obj":"boat.dinghy","at":[49,82.8],"facing":86.5,"attach":"water","model":{"seed":10225}},
      {"obj":"boat.dinghy","at":[21.3,44.9],"facing":355.7,"attach":"water","model":{"seed":10226}},
      {"id":"bench-q","obj":"street.bench","at":[-3.9,16],"facing":80},
      {"obj":"street.bollard","at":[-0.4,12]},
      {"obj":"street.bollard","at":[-2,20]},
      {"obj":"street.bollard","at":[-4,30]},
      {"obj":"street.bollard","at":[-5.6,38]},
      {"obj":"street.bollard","at":[7,18]},
      {"obj":"street.bollard","at":[7,9]}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"quay","rate":"12/min","mix":{"stroll":0.4,"family":0.2,"couple":0.2,"dog-walker":0.1,"chat":0.1},"edges":["S","N"]},
      {"id":"sitter","who":"visit","on":"quay","rate":"1/2min","mix":{"elderly":0.6,"couple":0.4},"edges":["S"],"goals":[{"sit":"bench-q","for":[40,120]},{"leave":"S"}]},
      {"id":"far","who":"walkers","on":"beach","rate":"3/min","mix":{"stroll":0.4,"family":0.3,"dog-walker":0.3},"edges":["W","E"]},
      {"id":"shore","who":"walkers","on":"shore-st","rate":"2/min","mix":{"stroll":0.6,"couple":0.4},"edges":["W","E"]},
      {"who":"gulls","count":6}
    ],
    backdrop: {"style":"town-low"},
    seed: 10182,
    landmarks: [
      {"id":"landmark","obj":"structure.parish-church","at":[37.1,178],"facing":90,"src":"Tenby harbour: the church above the harbour","model":{"livery":"grey-limestone","size":1.25,"seed":5,"opts":{"crown":"spire","era":"perpendicular"}}}
    ],
  });
})();
