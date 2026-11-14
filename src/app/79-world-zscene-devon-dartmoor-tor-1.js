/* ============================================================
   WORLD SCENE (format v3) world-test / devon-dartmoor-tor-1-w3: Dartmoor, above the Widecombe valley.
   Made by the scene factory: archetype 'edge-over-valley' (tools/lib/world/archetypes.mjs; gold peak-stanage-edge-1-w3), from the brief
     {"place":"Dartmoor, above the Widecombe valley","lat":50.58,"lon":-3.755,"county":"devon","town":"Widecombe","heading":300,"alt":60,"seed":12888,"region":"uk","side":"right"}
   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with
   `node tools/world.mjs accept <draft.json>`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.
   PURE. Registered in 'world-test'; it plays as an opening only once promoted (`node tools/world.mjs promote devon-dartmoor-tor-1-w3`).
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"devon-dartmoor-tor-1-w3","label":"Dartmoor, above the Widecombe valley (world)","site":"Dartmoor, above the Widecombe valley","mood":"calm","colour":"green","tags":["uk","devon-dartmoor-tor","edge-over-valley","world-v3"],"liveSky":{"lat":50.58,"lon":-3.755},"ukPlace":"devon-dartmoor-tor","county":"devon","ukTown":"Widecombe","ukView":"edge-over-valley"}, {
    v: 3,
    place: {"lat":50.58,"lon":-3.755,"alt":60,"region":"uk","style":"moor"},
    camera: {"eye":1.7,"fov":68,"horizon":420,"heading":300},
    valley: {"seed":924,"bearing":22,"drop":190,"fall":900,"floor":520,"shoulder":0,"noise":0.8,"far":{"rise":209,"run":1000},"fields":{"from":160,"to":2600,"u":[-500,3200],"rows":6,"cell":420,"wallsTo":900,"cross":false},"woods":{"n":8,"s":[300,1900],"u":[0,3000],"size":[70,200],"obj":["tree.far-broad","tree.distant","tree.far-birch"],"density":0.0003},"farms":{"n":4,"lamps":2},"lanes":true,"hamlet":{"at":[1180,1500],"houses":9,"spread":60,"style":"stone-cottage","lamps":3}},
    ground: {"features":[{"id":"tor-mound","kind":"bank","path":[[-1.6,58],[26.4,58]],"width":40,"h":4}]},
    surfaces: [
      {"id":"moor","kind":"heath","poly":[[-186.9,-355.9],[1461.3,3723.7],[2611,3259.2],[962.8,-820.4]]},
      {"id":"near-l","kind":"heath","poly":[[-9,0.5],[-1.4,0.5],[-1.4,10],[-9,10]]},
      {"id":"near-r","kind":"heath","poly":[[3,0.5],[13,0.5],[13,11],[3,11]]},
      {"id":"mid","kind":"heath","poly":[[-26,12],[34,12],[40,46],[-30,46]]},
      {"id":"path","kind":"path","path":[[0.6,-4],[0.8,4],[2.6,14],[6.8,30.3],[6.4,41],[0.4,80],[-3.6,165],[-7.6,290],[-11.6,420]],"width":1.6}
    ],
    entities: [
      {"obj":"rock.gritstone-block","at":[12.4,55],"facing":12.4,"model":{"size":4.2,"seed":31,"livery":"weathered","opts":{"form":"stack"}},"id":"tor-top"},
      {"obj":"rock.gritstone-block","at":[0.4,56],"facing":185.6,"model":{"size":3.2,"seed":38,"livery":"buff","opts":{"form":"stack"}}},
      {"obj":"rock.gritstone-block","at":[24.4,56.5],"facing":-0.9,"model":{"size":3,"seed":45,"livery":"weathered","opts":{"form":"block"}}},
      {"obj":"rock.gritstone-block","at":[6.4,66],"facing":169.6,"model":{"size":3.4,"seed":52,"livery":"buff","opts":{"form":"block"}}},
      {"obj":"rock.gritstone-block","at":[18.9,66.5],"facing":9.8,"model":{"size":3.6,"seed":59,"livery":"weathered","opts":{"form":"stack"}}},
      {"obj":"rock.gritstone-block","at":[10.4,37.8],"facing":84.9,"model":{"size":0.5677971552591771,"seed":80,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[-6.2,33.7],"facing":105,"model":{"size":0.5993282384239137,"seed":81,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[-9.4,37.5],"facing":4.5,"model":{"size":0.998768529901281,"seed":82,"livery":"weathered"}},
      {"obj":"rock.gritstone-block","at":[3.1,46.3],"facing":309.3,"model":{"size":0.5536233930382878,"seed":83,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[-8.8,46],"facing":341.3,"model":{"size":0.5222787676844746,"seed":84,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[-10.7,41.9],"facing":230,"model":{"size":0.6349550625775009,"seed":85,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[6,34.2],"facing":40.9,"model":{"size":1.0844355603214353,"seed":86,"livery":"weathered"}},
      {"obj":"rock.gritstone-block","at":[26.8,41.7],"facing":331.6,"model":{"size":0.856339318677783,"seed":87,"livery":"buff"}},
      {"obj":"rock.gritstone-block","at":[14.8,37.7],"facing":151.9,"model":{"size":0.607915242575109,"seed":88,"livery":"weathered"}},
      {"obj":"rock.gritstone-block","at":[-2.8,39.9],"facing":53.8,"model":{"size":1.0760928871110083,"seed":89,"livery":"weathered"}},
      {"obj":"rock.gritstone-block","at":[4.7,7],"facing":210.6,"model":{"size":2.6,"seed":5,"livery":"weathered","opts":{"form":"stack"}},"id":"frame-r","framed":true},
      {"id":"frame-l","obj":"tree.hawthorn","at":[-7.9,9],"framed":true},
      {"cluster":"plant.ling-heather","on":"near-l","n":46,"seed":12939,"gap":0.22},
      {"cluster":"plant.bilberry","on":"near-l","n":14,"seed":12941,"gap":0.4},
      {"cluster":"plant.grass-long","on":"near-l","n":10,"seed":12943,"gap":0.6},
      {"cluster":"plant.rph-short-grass","on":"near-l","n":70,"seed":12945,"gap":0.1},
      {"cluster":"plant.ling-heather","on":"near-r","n":46,"seed":12940,"gap":0.22},
      {"cluster":"plant.bilberry","on":"near-r","n":14,"seed":12942,"gap":0.4},
      {"cluster":"plant.grass-long","on":"near-r","n":10,"seed":12944,"gap":0.6},
      {"cluster":"plant.rph-short-grass","on":"near-r","n":70,"seed":12946,"gap":0.1},
      {"cluster":"plant.ling-heather","on":"mid","n":90,"seed":12949,"gap":1.1},
      {"cluster":"plant.bracken","on":"mid","n":34,"seed":12950,"gap":1.8},
      {"cluster":"plant.grass-long","on":"mid","n":30,"seed":12951,"gap":1.4},
      {"cluster":"plant.bracken","on":"moor","n":30,"seed":12946,"gap":5},
      {"cluster":"plant.ling-heather","on":"moor","n":40,"seed":12947,"gap":4}
    ],
    life: [
      {"id":"walkers","who":"walkers","on":"path","rate":"2/min","mix":{"stroll":0.3,"brisk":0.3,"couple":0.2,"dog-walker":0.2},"edges":["near","far"]},
      {"id":"visit","who":"visit","on":"path","rate":"1/2min","mix":{"stroll":0.5,"couple":0.5},"edges":["near"],"goals":[{"go":[5.4,41]},{"do":"look","for":[20,50]},{"leave":"near"}]},
      {"id":"far","who":"walkers","on":"path","rate":"2/min","mix":{"brisk":0.5,"couple":0.3,"dog-walker":0.2},"edges":["far","near"]},
      {"id":"grazers","who":"ponies","count":5,"on":"mid"},
      {"who":"bird.buzzard-flight","count":1},
      {"who":"bird.small-flight","count":2}
    ],
    backdrop: {"style":"upland"},
    fill: false,
    seed: 12888,
    landmarks: [
      {"id":"church","obj":"structure.parish-church","at":[-509.7,1888.4],"facing":90,"src":"Dartmoor, above the Widecombe valley: the church tower in the valley below","model":{"livery":"grey-limestone","size":1.3,"opts":{"crown":"parapet","era":"perpendicular"}}}
    ],
  });
})();
