/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-castlefield-basin-w3: converted by `node tools/world.mjs convert uk-north-manchester-castlefield/greater-manchester-castlefield-basin`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (54):
     - place[0]: structure.mcf-railbridge: pixel placement unprojected to [43, 52] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mcf-railbridge-front: pixel placement unprojected to [43, 52] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mcf-railbridge-pier: pixel placement unprojected to [43, 52] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: structure.mcf-railbridge: pixel placement unprojected to [16.8, 82.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: structure.mcf-railbridge-front: pixel placement unprojected to [16.8, 82.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: structure.mcf-railbridge-pier: pixel placement unprojected to [16.8, 82.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: structure.mcf-railbridge: pixel placement unprojected to [3.1, 129.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: structure.mcf-railbridge-front: pixel placement unprojected to [3.1, 129.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: structure.mcf-railbridge-pier: pixel placement unprojected to [3.1, 129.3] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mcf-railbridge: pixel placement unprojected to [-10.6, 175.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mcf-railbridge-front: pixel placement unprojected to [-10.6, 175.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mcf-railbridge-pier: pixel placement unprojected to [-10.6, 175.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.mcf-railbridge: pixel placement unprojected to [-34.5, 314.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.mcf-railbridge-front: pixel placement unprojected to [-34.5, 314.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[14]: structure.mcf-railbridge-pier: pixel placement unprojected to [-34.5, 314.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[15]: structure.mcf-railbridge: pixel placement unprojected to [74, 60] m (was pinned perspective art: check it is a real object at this spot)
     - place[16]: structure.mcf-railbridge-front: pixel placement unprojected to [74, 60] m (was pinned perspective art: check it is a real object at this spot)
     - place[17]: structure.mcf-railbridge: pixel placement unprojected to [60.1, 109.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[18]: structure.mcf-railbridge-front: pixel placement unprojected to [60.1, 109.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[19]: structure.mcf-railbridge: pixel placement unprojected to [46.5, 160.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[20]: structure.mcf-railbridge-front: pixel placement unprojected to [46.5, 160.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[21]: structure.mcf-railbridge: pixel placement unprojected to [32.5, 209.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[22]: structure.mcf-railbridge-front: pixel placement unprojected to [32.5, 209.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[23]: boat.mcf-narrowboat: pixel placement unprojected to [-18.1, 25.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[24]: boat.mcf-narrowboat: pixel placement unprojected to [-19.5, 39.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[25]: boat.mcf-narrowboat: pixel placement unprojected to [-20.4, 56.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[26]: boat.mcf-narrowboat: pixel placement unprojected to [11.1, 18.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[27]: boat.mcf-narrowboat: pixel placement unprojected to [13.7, 32.6] m (was pinned perspective art: check it is a real object at this spot)
     - place[28]: boat.mcf-narrowboat: pixel placement unprojected to [15.2, 48.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[29]: boat.mcf-narrowboat: pixel placement unprojected to [4.3, 79.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[30]: structure.mcf-merchants-bridge: pixel placement unprojected to [-2.5, 57.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[31]: ground.mcf-setts: pixel placement unprojected to [0, 8.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[61]: person.photographer: sky or horizon art with no foot; dropped
     - place[62]: person.phone-idler: sky or horizon art with no foot; dropped
     - place[63]: person.phone-idler: sky or horizon art with no foot; dropped
     - place[65]: plant.mcf-plane-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings: 8 of the v2 compile's 8 generated building(s) carried as v3 buildings (8 footprint(s), 0 house(s) of 0 street rule(s)): foot, front, storeys, style and seed as v2 drew them
     - place: 3 placement(s) with pit: true keep their pit: a 2 x 2 m soil square under each (tree.plane-avenue)
     - actors[0]: actor vehicle.metrolink-m5000: no life class; dropped
     - actors[1]: actor vehicle.metrolink-m5000: no life class; dropped
     ... and 14 more (node tools/world.mjs convert --report)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-castlefield-basin-w3","label":"Castlefield Basin, Manchester","site":"Castlefield, Manchester — Across the basin to Merchants' Bridge, a tram crossing the viaduct","tags":["uk","north west","greater manchester","manchester","castlefield","city","canal","basin","viaduct","tram","footbridge","narrowboat","skyline","world-v3"],"liveSky":{"lat":53.4746,"lon":-2.2579},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {"lat":53.4746,"lon":-2.2579,"region":"greater-manchester"},
 "camera": {"eye":1.7,"fov":62,"horizon":520,"heading":96,"water":-0.7},
 "surfaces": [
  {"id":"land","kind":"plaza","poly":[[-4,5.4],[4,5.4],[2253.2,3000],[-2253.2,3000]]},
  {"id":"quay-n","kind":"plaza","poly":[[-15,5],[-25,32],[-29,70],[-30,120],[-27,180],[-20,250],[-34,250],[-40,180],[-38,120],[-36,70],[-32,32],[-20,5]]},
  {"id":"wharf","kind":"plaza","poly":[[-20,5],[20,5],[20,8.8],[-20,8.8]]},
  {"id":"tow-s","kind":"towpath","poly":[[12,8.4],[21,32],[25,70],[24,120],[19,180],[12,250],[15.5,250],[22.5,180],[27.5,120],[28.5,70],[24.6,32],[16,8.4]]},
  {"id":"green-s","kind":"grass","poly":[[16,6],[24.8,32],[28.6,70],[28,112],[70,112],[70,6]]},
  {"id":"basin","kind":"water","water":"canal","poly":[[-15,8.6],[-4,8.2],[12,8.6],[21,32],[25,70],[24,120],[19,180],[12,250],[8,330],[5,420],[-6,420],[-11,330],[-20,250],[-27,180],[-30,120],[-29,70],[-25,32]],"shallow":0.6},
  {"id":"tree-pit-1","kind":"grass","poly":[[-33.5,59],[-31.5,59],[-31.5,61],[-33.5,61]]},
  {"id":"tree-pit-2","kind":"grass","poly":[[-35.4,97],[-33.4,97],[-33.4,99],[-35.4,99]]},
  {"id":"tree-pit-3","kind":"grass","poly":[[-36.4,139],[-34.4,139],[-34.4,141],[-36.4,141]]}
 ],
 "buildings": [
  {"id":"gen-b6","foot":[[-8,772],[16,772],[16,796],[-8,796]],"storeys":34,"style":"modern-glass","seed":32,"front":0,"src":"v2 buildings[6]"},
  {"id":"gen-b7","foot":[[24,752],[48,752],[48,776],[24,776]],"storeys":40,"style":"modern-glass","seed":33,"front":0,"src":"v2 buildings[7]"},
  {"id":"gen-b5","foot":[[-44,740],[-18,740],[-18,766],[-44,766]],"storeys":40,"style":"modern-glass","seed":31,"front":0,"src":"v2 buildings[5]"},
  {"id":"gen-b4","foot":[[62,262],[96,262],[96,300],[62,300]],"storeys":12,"style":"modern-glass","seed":7,"front":0,"src":"v2 buildings[4]"},
  {"id":"gen-b3","foot":[[-64,154],[-39,154],[-39,186],[-64,186]],"storeys":6,"style":"modern-glass","seed":12,"front":0,"src":"v2 buildings[3]"},
  {"id":"gen-b2","foot":[[-62,110],[-37,110],[-37,148],[-62,148]],"storeys":4,"style":"mill","seed":11,"front":0,"src":"v2 buildings[2]"},
  {"id":"gen-b1","foot":[[-62,64],[-36.5,64],[-36.5,104],[-62,104]],"storeys":6,"style":"mill","seed":4,"front":0,"src":"v2 buildings[1]"},
  {"id":"gen-b0","foot":[[-35,22],[-35,58],[-58,58],[-58,22]],"storeys":5,"style":"mill","seed":2,"front":0,"src":"v2 buildings[0]"}
 ],
 "entities": [
  {"obj":"structure.mcf-railbridge","at":[43.03,52.03],"variant":0},
  {"obj":"structure.mcf-railbridge-front","at":[43.03,52.03],"variant":0},
  {"obj":"structure.mcf-railbridge-pier","at":[43.03,52.03],"variant":0},
  {"obj":"structure.mcf-railbridge","at":[16.75,82.91],"variant":1,"attach":"water"},
  {"obj":"structure.mcf-railbridge-front","at":[16.75,82.91],"variant":1,"attach":"water"},
  {"obj":"structure.mcf-railbridge-pier","at":[16.75,82.91],"variant":1,"attach":"water"},
  {"obj":"structure.mcf-railbridge","at":[3.08,129.34],"variant":2,"attach":"water"},
  {"obj":"structure.mcf-railbridge-front","at":[3.08,129.34],"variant":2,"attach":"water"},
  {"obj":"structure.mcf-railbridge-pier","at":[3.08,129.34],"variant":2,"attach":"water"},
  {"obj":"structure.mcf-railbridge","at":[-10.61,175.46],"variant":3,"attach":"water"},
  {"obj":"structure.mcf-railbridge-front","at":[-10.61,175.46],"variant":3,"attach":"water"},
  {"obj":"structure.mcf-railbridge-pier","at":[-10.61,175.46],"variant":3,"attach":"water"},
  {"obj":"structure.mcf-railbridge","at":[-34.47,314.36],"variant":4},
  {"obj":"structure.mcf-railbridge-front","at":[-34.47,314.36],"variant":4},
  {"obj":"structure.mcf-railbridge-pier","at":[-34.47,314.36],"variant":4},
  {"obj":"structure.mcf-railbridge","at":[74.05,60.04],"variant":5},
  {"obj":"structure.mcf-railbridge-front","at":[74.05,60.04],"variant":5},
  {"obj":"structure.mcf-railbridge","at":[60.07,109.87],"variant":6},
  {"obj":"structure.mcf-railbridge-front","at":[60.07,109.87],"variant":6},
  {"obj":"structure.mcf-railbridge","at":[46.49,160.53],"variant":7},
  {"obj":"structure.mcf-railbridge-front","at":[46.49,160.53],"variant":7},
  {"obj":"structure.mcf-railbridge","at":[32.5,209.58],"variant":8},
  {"obj":"structure.mcf-railbridge-front","at":[32.5,209.58],"variant":8},
  {"obj":"boat.mcf-narrowboat","at":[-18.13,25.49],"variant":0,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[11.05,18.42],"variant":3,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[13.73,32.57],"variant":4,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[4.25,79.42],"variant":6,"attach":"water"},
  {"obj":"structure.mcf-merchants-bridge","at":[-2.5,57.45],"variant":0,"attach":"water"},
  {"obj":"ground.mcf-setts","at":[0,8.4],"variant":0,"attach":"water"},
  {"obj":"tree.plane-avenue","at":[-32.5,60],"variant":0},
  {"obj":"tree.plane-avenue","at":[-34.4,98],"variant":0,"facing":270},
  {"obj":"tree.plane-avenue","at":[-35.4,140],"variant":0},
  {"obj":"tree.plane-avenue","at":[27,40],"variant":0,"facing":270},
  {"obj":"tree.bank-alder","at":[31,60],"variant":2},
  {"obj":"street.lamppost","at":[-4.9,7.6],"variant":1},
  {"obj":"street.lamppost","at":[-27.4,44],"variant":1},
  {"obj":"street.lamppost","at":[-30.6,102],"variant":1},
  {"obj":"street.bollard","at":[-24.2,30],"variant":3},
  {"obj":"street.bollard","at":[-26.4,50],"variant":3,"attach":"water"},
  {"obj":"street.bollard","at":[-28.6,72],"variant":3,"attach":"water"},
  {"obj":"street.bench","at":[-34,70],"facing":90},
  {"obj":"person.bench-reader","at":[-33.5,70.05],"facing":90},
  {"obj":"person.cafe-goer","at":[-32.2,41.4],"variant":1,"facing":270},
  {"obj":"person.cafe-goer","at":[-32.76,46.89],"variant":2},
  {"obj":"street.mqn-parasol","at":[-33.2,48.4],"variant":0},
  {"obj":"street.mcf-litter-bin","at":[-26.9,36.5],"variant":0},
  {"obj":"person.phone-idler","at":[23.4,34]},
  {"obj":"person.photographer","at":[-31.4,84],"facing":90},
  {"obj":"street.mqn-lifebuoy","at":[-4.5,8.1]},
  {"obj":"street.mqn-planter-grass","at":[4.4,6.4]},
  {"obj":"bird.pigeon-feral","at":[-0.9,6.5],"variant":0},
  {"obj":"bird.pigeon-feral","at":[0.4,7.4],"variant":1,"facing":270},
  {"obj":"bird.pigeon-feral","at":[-1.6,7.2],"variant":1},
  {"obj":"bird.pigeon-feral","at":[1,6.2],"variant":0,"facing":270},
  {"obj":"water.fish-ring","at":[6,26],"attach":"water"},
  {"cluster":"plant.grass","on":"green-s","n":22,"seed":7244},
  {"cluster":"plant.daisies","on":"green-s","n":4,"seed":9549},
  {"cluster":"plant.grass-long","on":"green-s","n":15,"seed":5932},
  {"cluster":"plant.shrub","on":"green-s","n":5,"seed":6361},
  {"cluster":"ground.leaf-litter","on":"quay-n","n":11,"seed":1403},
  {"cluster":"ground.leaves","on":"quay-n","n":7,"seed":5351},
  {"obj":"person.angler","at":[20.28,29.97]},
  {"cluster":"plant.planter","on":"quay-n","n":6,"seed":5476},
  {"obj":"street.bollard","at":[-27.04,49.69]},
  {"obj":"street.bollard","at":[-29.27,71.81]},
  {"obj":"person.phone-idler","at":[-27.37,53.98]}
 ],
 "landmarks": [
  {"obj":"landmark.beetham-tower-blade","at":[-150,560],"src":"https://www.castlefield.org.uk"}
 ],
 "life": [
  {"who":"walkers","on":"quay-n","rate":"5/min","mix":{"stroll":0.44,"couple":0.22,"dog-walker":0.11,"student":0.11,"shopper":0.11}},
  {"who":"walkers","on":"tow-s","rate":"5/min","mix":{"stroll":0.44,"couple":0.22,"dog-walker":0.11,"student":0.11,"shopper":0.11}},
  {"who":"narrowboat-cruising","on":"basin","every":"6min"},
  {"who":"visit","mix":{"stroll":1},"rate":"1/1min","on":"land"},
  {"who":"visit","mix":{"dog-walker":1},"rate":"1/6min","on":"land"},
  {"who":"mallard","count":2,"on":"basin"},
  {"who":"mute-swan","count":2,"on":"basin","group":"pair"},
  {"who":"coot","count":2,"on":"basin"}
 ],
 "backdrop": {"style":"city-manchester-towers"},
 "seed": 1
});
})();
