/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-castlefield-warehouses-w3: converted by `node tools/world.mjs convert uk-north-manchester-castlefield/greater-manchester-castlefield-warehouses`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (24):
     - place[0]: structure.mcf-railbridge: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[1]: structure.mcf-railbridge-front: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[2]: structure.mcf-railbridge-pier: pixel placement unprojected to [7.4, 197] m (was pinned perspective art: check it is a real object at this spot)
     - place[3]: boat.mcf-narrowboat: pixel placement unprojected to [-7, 31.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[4]: boat.mcf-narrowboat: pixel placement unprojected to [-7.2, 51.8] m (was pinned perspective art: check it is a real object at this spot)
     - place[5]: boat.mcf-narrowboat: pixel placement unprojected to [7, 25] m (was pinned perspective art: check it is a real object at this spot)
     - place[6]: boat.mcf-narrowboat: pixel placement unprojected to [7.2, 44.4] m (was pinned perspective art: check it is a real object at this spot)
     - place[7]: boat.mcf-narrowboat: pixel placement unprojected to [7.3, 90.7] m (was pinned perspective art: check it is a real object at this spot)
     - place[8]: boat.mcf-narrowboat: pixel placement unprojected to [-7.4, 109.2] m (was pinned perspective art: check it is a real object at this spot)
     - place[9]: structure.mcf-shipping-hole: pixel placement unprojected to [-13.5, 25.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[10]: structure.mcf-shipping-hole: pixel placement unprojected to [-8.9, 61.1] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[12]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[13]: structure.mcf-frame: pixel placement unprojected to [-11.5, 18.5] m (was pinned perspective art: check it is a real object at this spot)
     - place[55]: plant.mcf-plane-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings: 8 of the v2 compile's 8 generated building(s) carried as v3 buildings (8 footprint(s), 0 house(s) of 0 street rule(s)): foot, front, storeys, style and seed as v2 drew them
     - place: 3 placement(s) with pit: true keep their pit: a 2 x 2 m soil square under each (tree.plane-avenue)
     - actors[0]: actor vehicle.metrolink-m5000: no life class; dropped
     - actors[1]: actor vehicle.metrolink-m5000: no life class; dropped
     - backdrop: backdrop style 'city-manchester-towers' chosen from the place and the water; check it against the real view
     - entities[12]: repair: removed (overlap) structure.mcf-frame overlaps structure.mcf-frame (entities[11]) by 0.3 m
     - entities[13]: repair: removed (overlap) structure.mcf-frame overlaps structure.mcf-frame (entities[11]) by 0.3 m
     - entities[28]: repair: removed (overlap) street.mqn-parasol overlaps person.cafe-goer (entities[22]) by 0.364 m
     - entities: 3 entries kept where the placement solver settled them (overlap, blocksPath; 0.25-0.75 m, at most 1.2 m; each in the notes): entities[27] street.mqn-parasol 0.75 m, entities[56] plant.grass 0.75 m, entities[57] plant.grass 0.25 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"greater-manchester-castlefield-warehouses-w3","label":"Castlefield warehouses, Manchester","site":"Castlefield, Manchester — From Merchants' Bridge up the reach to the canal warehouses","tags":["uk","north west","greater manchester","manchester","castlefield","city","canal","warehouse","narrowboat","wharf","skyline","world-v3"],"liveSky":{"lat":53.4743,"lon":-2.2564},"mood":"calm","colour":"blue"},
{
 "v": 3,
 "place": {"lat":53.4743,"lon":-2.2564,"region":"greater-manchester"},
 "camera": {"eye":6.2,"fov":64,"horizon":470,"heading":52,"water":-0.5},
 "surfaces": [
  {"id":"land","kind":"plaza","poly":[[-13,16.6],[13,16.6],[2343.3,3000],[-2343.3,3000]]},
  {"id":"quay-l","kind":"plaza","poly":[[-9.5,88],[-9.5,160],[-9,260],[-16,260],[-16,88]]},
  {"id":"wharf-r","kind":"plaza","poly":[[9,4],[9.5,60],[9.5,120],[10,170],[12,210],[26,210],[26,4]]},
  {"id":"lawn-r","kind":"grass","poly":[[16,18],[26,18],[26,36],[16,36]]},
  {"id":"road","kind":"road","path":[[-80,186],[80,186]],"width":7},
  {"id":"reach","kind":"water","water":"canal","poly":[[-9,4],[9,4],[9.5,60],[9.5,120],[10,170],[12,210],[20,260],[12,275],[-9,260],[-9.5,160],[-9.5,80],[-9.6,29.6],[-19.5,29.6],[-19.5,19.5],[-9.2,19.5]],"shallow":0.6},
  {"id":"tree-pit-1","kind":"grass","poly":[[12,91],[14,91],[14,93],[12,93]]},
  {"id":"tree-pit-2","kind":"grass","poly":[[13,157],[15,157],[15,159],[13,159]]},
  {"id":"tree-pit-3","kind":"grass","poly":[[-14,189],[-12,189],[-12,191],[-14,191]]}
 ],
 "buildings": [
  {"id":"gen-b7","foot":[[20,300],[50,300],[50,330],[20,330]],"storeys":10,"style":"modern-glass","seed":58,"front":0,"src":"v2 buildings[7]"},
  {"id":"gen-b6","foot":[[-40,262],[-10,262],[-10,290],[-40,290]],"storeys":6,"style":"mill","seed":28,"front":0,"src":"v2 buildings[6]"},
  {"id":"gen-b2","foot":[[-38,148],[-12,148],[-12,176],[-38,176]],"storeys":7,"style":"modern-glass","seed":53,"front":0,"src":"v2 buildings[2]"},
  {"id":"gen-b4","foot":[[16,120],[32,120],[32,140],[16,140]],"storeys":3,"style":"victorian-terrace","seed":55,"front":0,"src":"v2 buildings[4]"},
  {"id":"gen-b1","foot":[[-40,96],[-12,96],[-12,140],[-40,140]],"storeys":5,"style":"mill","seed":22,"front":0,"src":"v2 buildings[1]"},
  {"id":"gen-b5","foot":[[24,92],[44,92],[44,112],[24,112]],"storeys":5,"style":"mill","seed":25,"front":0,"src":"v2 buildings[5]"},
  {"id":"gen-b3","foot":[[20,40],[40,40],[40,78],[20,78]],"storeys":4,"style":"mill","seed":23,"front":0,"src":"v2 buildings[3]"},
  {"id":"gen-b0","foot":[[-36,28],[-9.6,28],[-9.6,86],[-36,86]],"storeys":6,"style":"mill","seed":20,"front":0,"landmark":true,"src":"v2 buildings[0]"}
 ],
 "entities": [
  {"obj":"structure.mcf-railbridge","at":[7.4,196.96],"variant":16,"attach":"water"},
  {"obj":"structure.mcf-railbridge-front","at":[7.4,196.96],"variant":16,"attach":"water"},
  {"obj":"structure.mcf-railbridge-pier","at":[7.4,196.96],"variant":16,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[-7.03,31.46],"variant":10,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[-7.22,51.81],"variant":11,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[7.03,24.98],"variant":12,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[7.22,44.42],"variant":13,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[7.31,90.72],"variant":14,"attach":"water"},
  {"obj":"boat.mcf-narrowboat","at":[-7.4,109.18],"variant":15,"attach":"water"},
  {"obj":"structure.mcf-shipping-hole","at":[-13.51,25.86],"variant":0,"attach":"water"},
  {"obj":"structure.mcf-shipping-hole","at":[-8.9,61.06],"variant":1,"attach":"water"},
  {"obj":"structure.mcf-frame","at":[-11.53,18.46],"variant":0},
  {"obj":"tree.plane-avenue","at":[13,92],"variant":0},
  {"obj":"tree.plane-avenue","at":[14,158],"variant":0,"facing":270},
  {"obj":"tree.plane-avenue","at":[-13,190],"variant":0},
  {"obj":"person.cafe-goer","at":[12.6,30],"variant":2},
  {"obj":"person.cafe-goer","at":[14,37],"variant":3,"facing":270},
  {"obj":"person.cafe-goer","at":[12.8,46],"variant":0},
  {"obj":"person.cafe-goer","at":[14.6,31.4],"variant":1,"facing":270},
  {"obj":"person.cafe-goer","at":[13.4,44.2],"variant":2,"facing":270},
  {"obj":"person.cafe-goer","at":[15.2,56],"variant":3},
  {"obj":"person.cafe-goer","at":[16.4,57.6],"variant":0,"facing":270},
  {"obj":"street.bench","at":[15.6,33],"facing":270},
  {"obj":"street.bench","at":[15.8,42],"facing":270},
  {"obj":"street.mqn-parasol","at":[13.6,33.6],"variant":1},
  {"obj":"street.mqn-parasol","at":[14.33,45.73],"variant":0},
  {"obj":"street.mcf-litter-bin","at":[10.4,40],"variant":0},
  {"obj":"street.mcf-litter-bin","at":[10.4,88],"variant":1},
  {"obj":"street.mqn-bike-hoop","at":[17.6,66],"variant":2},
  {"obj":"street.mqn-bike-hoop","at":[18,70],"variant":0},
  {"obj":"street.mqn-planter-grass","at":[16.6,22]},
  {"obj":"street.mqn-planter-grass","at":[17.4,78],"facing":270},
  {"obj":"street.mqn-lifebuoy","at":[9.9,34]},
  {"obj":"person.angler","at":[-10.4,104],"facing":90},
  {"obj":"person.picnicker","at":[20,26]},
  {"obj":"street.lamppost","at":[10.8,22],"variant":1},
  {"obj":"street.lamppost","at":[10.8,60],"variant":1},
  {"obj":"street.lamppost","at":[-10.6,100],"variant":1},
  {"obj":"street.lamppost","at":[11,100],"variant":1},
  {"obj":"street.bollard","at":[9.7,26],"variant":2},
  {"obj":"street.bollard","at":[9.8,48],"variant":2},
  {"obj":"street.bollard","at":[9.8,70],"variant":2},
  {"obj":"street.bollard","at":[-9.8,120],"variant":2},
  {"obj":"street.bollard","at":[-9.8,140],"variant":2},
  {"obj":"person.phone-idler","at":[11,72]},
  {"obj":"person.photographer","at":[10.6,84],"facing":270},
  {"obj":"bird.pigeon-feral","at":[16,50],"variant":0},
  {"obj":"bird.pigeon-feral","at":[16.6,51],"variant":2,"facing":270},
  {"obj":"bird.pigeon-feral","at":[15.4,52.2],"variant":4},
  {"obj":"bird.pigeon-feral","at":[17.2,49.4],"variant":1,"facing":270},
  {"obj":"water.fish-ring","at":[-2,36],"attach":"water"},
  {"cluster":"plant.planter","on":"wharf-r","n":13,"seed":8585},
  {"obj":"plant.planter","at":[-10.23,138.61]},
  {"obj":"plant.grass","at":[16.47,23.16]},
  {"obj":"plant.grass","at":[16.37,23.06]},
  {"obj":"plant.grass","at":[16.01,23.44]},
  {"obj":"plant.grass","at":[17.43,23.62]},
  {"obj":"plant.grass","at":[16.68,23.8]},
  {"obj":"plant.grass","at":[16.85,25.16]},
  {"obj":"plant.grass","at":[16.69,25.61]},
  {"obj":"plant.grass","at":[17.65,25.62]},
  {"obj":"plant.grass","at":[17,25.76]},
  {"obj":"plant.grass","at":[18.82,26.02]},
  {"obj":"plant.grass","at":[18.7,26.02]},
  {"obj":"plant.grass","at":[18.46,26.11]},
  {"obj":"plant.grass","at":[16.53,26.13]},
  {"obj":"plant.grass","at":[18.8,26.33]},
  {"obj":"plant.grass","at":[18.78,27.75]},
  {"obj":"plant.grass","at":[17.66,28.3]},
  {"obj":"plant.grass","at":[20.69,28.76]},
  {"obj":"plant.grass","at":[20.96,28.94]},
  {"obj":"plant.grass","at":[20.81,29.1]},
  {"obj":"plant.grass","at":[21.05,29.56]},
  {"obj":"plant.grass","at":[16.15,31.27]},
  {"obj":"plant.grass","at":[20.97,31.58]},
  {"obj":"plant.grass","at":[17.3,31.94]},
  {"obj":"plant.grass","at":[17.61,31.95]},
  {"obj":"plant.grass","at":[18.46,32.29]},
  {"obj":"plant.grass","at":[22.74,34.27]},
  {"obj":"plant.grass","at":[16.63,34.42]},
  {"obj":"plant.grass","at":[20.92,34.75]},
  {"obj":"plant.grass","at":[21.21,34.91]},
  {"cluster":"plant.grass","on":"lawn-r","n":7,"seed":5173},
  {"obj":"plant.grass-long","at":[16.49,23.58]},
  {"obj":"plant.grass-long","at":[16.77,23.73]},
  {"obj":"plant.grass-long","at":[17.58,24.41]},
  {"obj":"plant.grass-long","at":[19.93,33.03]},
  {"obj":"plant.grass-long","at":[23.57,33.58]},
  {"obj":"plant.grass-long","at":[20.77,34.34]},
  {"obj":"plant.grass-long","at":[20.35,34.5]},
  {"obj":"plant.grass-long","at":[21.66,35.88]},
  {"obj":"plant.shrub","at":[17.2,24.63]},
  {"obj":"plant.shrub","at":[16.79,25.31]},
  {"obj":"plant.shrub","at":[17.3,25.55]},
  {"obj":"plant.shrub","at":[17.16,25.83]},
  {"obj":"plant.shrub","at":[20.33,28.44]},
  {"obj":"plant.shrub","at":[17.82,32.6]},
  {"obj":"plant.shrub","at":[21.69,34.43]},
  {"obj":"plant.shrub","at":[16.86,34.56]},
  {"obj":"plant.shrub","at":[22.23,35]},
  {"obj":"plant.shrub","at":[20.95,35.05]},
  {"obj":"plant.daisies","at":[17.11,25.59]},
  {"obj":"plant.daisies","at":[20.52,28.88]},
  {"obj":"plant.daisies","at":[23.14,31.84]},
  {"obj":"plant.daisies","at":[17.14,34.71]}
 ],
 "landmarks": [
  {"obj":"landmark.beetham-tower-blade","at":[205,506],"src":"https://www.castlefield.org.uk"}
 ],
 "life": [
  {"who":"walkers","on":"quay-l","rate":"5/min","mix":{"stroll":0.4,"couple":0.2,"dog-walker":0.1,"student":0.1,"shopper":0.1,"buggy":0.1}},
  {"who":"walkers","on":"wharf-r","rate":"5/min","mix":{"stroll":0.4,"couple":0.2,"dog-walker":0.1,"student":0.1,"shopper":0.1,"buggy":0.1}},
  {"who":"cars","on":"road","rate":"4/min","mix":{"vehicle.car":5,"vehicle.car-city":2,"vehicle.taxi-black":1}},
  {"who":"visit","mix":{"stroll":1},"rate":"1/1min","on":"land"},
  {"who":"visit","mix":{"dog-walker":1},"rate":"1/6min","on":"land"},
  {"who":"mute-swan","count":2,"on":"reach","group":"pair"},
  {"who":"mallard","count":2,"on":"reach"},
  {"who":"coot","count":1,"on":"reach"},
  {"who":"moorhen","count":1,"on":"reach"}
 ],
 "backdrop": {"style":"city-manchester-towers"},
 "seed": 1
});
})();
