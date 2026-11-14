/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-4-w3: converted by `node tools/world.mjs convert uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-4`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (24):
     - place[0]: landmark.klm-p-v4-gateway-wall: pixel placement unprojected to [-1.9, 33.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.klm-p-v4-paving-fore: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[2]: structure.klm-p-v4-paving-near: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[14]: structure.klm-p-v4-hill: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[23]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[24]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[25]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[26]: bird.pigeon-feral: sky or horizon art with no foot; dropped
     - place[34]: plant.klm-sycamore-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings: 9 of the v2 compile's 9 generated building(s) carried as v3 buildings (9 footprint(s), 0 house(s) of 0 street rule(s)): foot, front, storeys, style and seed as v2 drew them
     - place: 4 placement(s) with pit: true keep their pit: a 2 x 2 m soil square under each (tree.mqn-street-tree, tree.plane-avenue)
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities[78]: repair: removed (overlap) tree.mqn-street-tree overlaps tree.mqn-street-tree (entities[4]) by 0.462 m
     - entities[6]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[5]) by 1.03 m
     - entities[7]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[5]) by 0.26 m
     - entities[8]: repair: removed (overlap) street.mqn-bike-hoop overlaps street.mqn-bike-hoop (entities[6]) by 0.26 m
     - entities[69]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[12]) by 1.016 m
     - entities[70]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[13]) by 1.016 m
     - entities[71]: repair: removed (overlap) tree.plane-avenue overlaps tree.plane-avenue (entities[14]) by 1.016 m
     - entities[76]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[16]) by 0.277 m
     - entities[77]: repair: removed (overlap) street.bollard overlaps street.bollard (entities[17]) by 0.277 m
     - life[2].on: repair: removed (unreachable) cyclists (drive) cannot use cycle (path)
     - entities: 1 entry kept where the placement solver settled it (overlap, blocksPath; 0.25-0.25 m, at most 1.2 m; each in the notes): entities[66] bird.pigeon-feral 0.25 m
     - critic: richness 71.7 is below the source's 74.8 (P7, U4): carry or add the missing dressing before it ships
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-kelham-4-w3","label":"The Green Lane Works gateway, Sheffield","site":"Green Lane, Kelham Island — the Works gateway and its clock turret, cyclists and walkers","tags":["uk","yorkshire","south yorkshire","sheffield","kelham island","city","industrial heritage","street","gateway","clock tower","works","cycle route","people","world-v3"],"liveSky":{"lat":53.3911,"lon":-1.4741},"mood":"proud","colour":"teal"},
{
 "v": 3,
 "place": {"lat":53.3911,"lon":-1.4741,"region":"south-yorkshire"},
 "camera": {"eye":1.65,"fov":58,"horizon":610,"heading":228,"x0":960},
 "surfaces": [
  {"id":"land","kind":"plaza","poly":[[-5.1,7.4],[5.1,7.4],[2078.7,3000],[-2078.7,3000]]},
  {"id":"lane","kind":"road","path":[[27.44,-10.92],[-30.43,58.02],[-133.31,180.58]],"width":6.6},
  {"id":"cycle","kind":"path","path":[[30.58,-8.28],[-27.29,60.66],[-130.17,183.22]],"width":1.6},
  {"id":"pave-far","kind":"pavement","path":[[32.27,-6.87],[-25.6,62.07],[-128.48,184.63]],"width":2.8},
  {"id":"pave-near","kind":"pavement","path":[[20.7,-16.58],[-37.17,52.36],[-140.05,174.92]],"width":11},
  {"id":"tree-pit-1","kind":"grass","poly":[[-11.96,13.3],[-9.96,13.3],[-9.96,15.3],[-11.96,15.3]]},
  {"id":"tree-pit-2","kind":"grass","poly":[[-10.06,25.34],[-8.06,25.34],[-8.06,27.34],[-10.06,27.34]]},
  {"id":"tree-pit-3","kind":"grass","poly":[[-28.06,46.79],[-26.06,46.79],[-26.06,48.79],[-28.06,48.79]]},
  {"id":"tree-pit-4","kind":"grass","poly":[[-47.35,69.77],[-45.35,69.77],[-45.35,71.77],[-47.35,71.77]]}
 ],
 "buildings": [
  {"id":"gen-b8","foot":[[-56.29,41.54],[-44.03,51.82],[-73.61,87.06],[-85.87,76.77]],"storeys":6,"style":"kelham-flats","seed":513,"front":0,"src":"v2 buildings[8]"},
  {"id":"gen-b7","foot":[[-32.65,19.6],[-23.46,27.31],[-42.75,50.29],[-51.94,42.58]],"storeys":3,"style":"kelham-works","seed":512,"front":0,"src":"v2 buildings[7]"},
  {"id":"gen-b5","foot":[[-67.92,114.82],[-57.2,123.82],[-85.49,157.52],[-96.21,148.52]],"storeys":3,"style":"kelham-works","seed":505,"front":0,"src":"v2 buildings[5]"},
  {"id":"gen-b4","foot":[[-47.35,90.31],[-35.09,100.59],[-54.38,123.57],[-66.64,113.29]],"storeys":6,"style":"kelham-flats","seed":504,"front":0,"src":"v2 buildings[4]"},
  {"id":"gen-b3","foot":[[-29.34,68.86],[-18.62,77.86],[-34.05,96.24],[-44.77,87.24]],"storeys":4,"style":"kelham-works","seed":503,"front":0,"src":"v2 buildings[3]"},
  {"id":"gen-b2","foot":[[-6.19,41.28],[3,49],[-18.86,75.04],[-28.06,67.32]],"storeys":2,"style":"kelham-works","seed":502,"front":0,"src":"v2 buildings[2]"},
  {"id":"gen-b1","foot":[[0.24,33.62],[16.7,14.01],[25.89,21.73],[9.43,41.34]],"storeys":2,"style":"kelham-works","seed":506,"front":0,"src":"v2 buildings[1]"},
  {"id":"gen-b0","foot":[[17.98,12.48],[33.41,-5.9],[42.61,1.81],[27.17,20.2]],"storeys":3,"style":"kelham-works","seed":501,"front":0,"src":"v2 buildings[0]"},
  {"id":"gen-b6","foot":[[-14.89,-4.67],[-4.17,4.33],[-22.17,25.78],[-32.89,16.78]],"storeys":5,"style":"kelham-flats","seed":511,"front":0,"src":"v2 buildings[6]"}
 ],
 "entities": [
  {"obj":"street.bench","at":[-9.68,19.3],"facing":90},
  {"obj":"person.bench-reader","at":[-9.68,19.3],"facing":90},
  {"obj":"plant.planter","at":[-8.76,13.54]},
  {"obj":"street.bench","at":[-2.54,8.31],"facing":90},
  {"obj":"tree.mqn-street-tree","at":[-10.96,14.3],"variant":2},
  {"obj":"street.mqn-bike-hoop","at":[-1.36,13.74],"variant":0},
  {"obj":"street.mqn-planter-grass","at":[-17.09,22.21],"variant":2},
  {"obj":"street.lamppost","at":[-26.2,64.18]},
  {"obj":"street.lamppost","at":[-45.49,87.16]},
  {"obj":"tree.plane-avenue","at":[-9.06,26.34]},
  {"obj":"tree.plane-avenue","at":[-27.06,47.79]},
  {"obj":"tree.plane-avenue","at":[-46.35,70.77]},
  {"obj":"street.bollard","at":[5.96,8.91]},
  {"obj":"street.bollard","at":[3.39,11.98]},
  {"obj":"street.bollard","at":[0.81,15.04]},
  {"obj":"person.couple","at":[-12.75,20.63],"facing":270},
  {"obj":"person.phone-idler","at":[-7.12,20.14],"facing":90},
  {"obj":"person.dog-walker","at":[-11.74,24.09],"facing":90},
  {"obj":"person.student","at":[-19.05,25.79],"facing":270},
  {"obj":"person.photographer","at":[-2.74,33.74],"facing":90},
  {"obj":"person.couple","at":[-3.7,37.37],"facing":270},
  {"obj":"person.bench-reader","at":[-8.25,42.17],"facing":270},
  {"obj":"ground.stockyards-paving","at":[-0.42,8.47]},
  {"obj":"ground.stockyards-paving","at":[-6.38,9.09]},
  {"obj":"ground.stockyards-paving","at":[-1.65,9.81]},
  {"obj":"ground.stockyards-paving","at":[-5.24,10.15]},
  {"obj":"ground.stockyards-paving","at":[4.37,10.28]},
  {"obj":"ground.stockyards-paving","at":[-7.21,11.3]},
  {"obj":"ground.stockyards-paving","at":[0.77,12.15]},
  {"obj":"ground.stockyards-paving","at":[-3.42,12.25]},
  {"obj":"ground.stockyards-paving","at":[3.51,12.29]},
  {"obj":"ground.stockyards-paving","at":[-7.69,15.01]},
  {"obj":"ground.stockyards-paving","at":[-7.14,15.91]},
  {"obj":"ground.stockyards-paving","at":[-1.61,15.92]},
  {"obj":"ground.stockyards-paving","at":[-2.69,16]},
  {"obj":"ground.stockyards-paving","at":[-17.79,34.76]},
  {"obj":"ground.stockyards-paving","at":[-21.64,38.21]},
  {"obj":"ground.leaves","at":[-5.79,36.41]},
  {"obj":"ground.stockyards-wear","at":[0.49,8.07]},
  {"obj":"ground.stockyards-wear","at":[-2.04,8.18]},
  {"obj":"ground.stockyards-wear","at":[4.58,8.42]},
  {"obj":"ground.stockyards-wear","at":[-5.56,8.46]},
  {"obj":"ground.stockyards-wear","at":[3.25,8.67]},
  {"obj":"ground.stockyards-wear","at":[5.13,10.05]},
  {"obj":"ground.stockyards-wear","at":[-5.73,10.08]},
  {"obj":"ground.stockyards-wear","at":[-2.32,10.42]},
  {"obj":"ground.stockyards-wear","at":[2.6,11.73]},
  {"obj":"ground.stockyards-wear","at":[2.16,13.52]},
  {"obj":"ground.stockyards-wear","at":[-7.04,22.34]},
  {"obj":"ground.stockyards-wear","at":[-20.56,28.17]},
  {"obj":"ground.stockyards-wear","at":[-20.21,31.29]},
  {"obj":"ground.leaves","at":[-5.01,8.23]},
  {"obj":"ground.leaves","at":[-2.79,9.11]},
  {"obj":"ground.leaves","at":[-4.71,10.03]},
  {"obj":"ground.leaves","at":[1.15,10.32]},
  {"obj":"ground.leaves","at":[-0.07,13.77]},
  {"obj":"ground.leaves","at":[-7.12,17.77]},
  {"obj":"ground.leaves","at":[-12.51,17.92]},
  {"obj":"ground.leaves","at":[-10.33,28]},
  {"obj":"bird.pigeon-feral","at":[5.01,10.26]},
  {"obj":"bird.pigeon-feral","at":[1.13,10.48]},
  {"obj":"bird.pigeon-feral","at":[-1.32,10.62]},
  {"obj":"bird.pigeon-feral","at":[-7.8,10.71]},
  {"obj":"bird.pigeon-feral","at":[-9.39,13.36]},
  {"obj":"bird.pigeon-feral","at":[1.67,13.5]},
  {"obj":"bird.pigeon-feral","at":[-5.46,16.14]},
  {"obj":"ground.stockyards-paving","at":[0.87,30.23]},
  {"obj":"ground.stockyards-wear","at":[9.09,19.2]},
  {"obj":"ground.stockyards-wear","at":[6.12,22.93]},
  {"obj":"street.bollard","at":[5.34,9.27]}
 ],
 "landmarks": [
  {"obj":"landmark.klm-p-v4-gateway-wall","at":[-1.85,33.4],"src":"https://www.simt.co.uk/kelham-island-museum"},
  {"obj":"landmark.klm-chimney","at":[-0.25,96.42],"variant":1,"src":"https://www.simt.co.uk/kelham-island-museum"}
 ],
 "life": [
  {"who":"walkers","on":"pave-far","rate":"6/min","mix":{"stroll":0.17,"student":0.17,"couple":0.11,"dog-walker":0.11,"jogger":0.06,"takeaway-walker":0.11,"shopper":0.06,"commuter":0.11,"buggy":0.06,"elderly-walker":0.06}},
  {"who":"walkers","on":"pave-near","rate":"6/min","mix":{"stroll":0.17,"student":0.17,"couple":0.11,"dog-walker":0.11,"jogger":0.06,"takeaway-walker":0.11,"shopper":0.06,"commuter":0.11,"buggy":0.06,"elderly-walker":0.06}},
  {"who":"cars","on":"lane","rate":"4/min","mix":{"vehicle.car":5,"vehicle.car-city":3,"vehicle.taxi-black":1}}
 ],
 "backdrop": {"style":"city-sheffield-hills"},
 "seed": 1
});
})();
