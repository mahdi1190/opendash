/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-2-w3: converted by `node tools/world.mjs convert uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-2`.
   docs/dev/WORLD_ENGINE.md 6. World metres only. A FIRST DRAFT: enrich it by hand to the rich bar before it ships.
   Review (13):
     - place[0]: structure.klm-p-v2-hill: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[1]: structure.klm-p-v2-wl-0: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[2]: structure.klm-p-v2-wl-1: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[3]: structure.klm-p-v2-wl-2: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[4]: landmark.klm-p-v2-hall: pixel placement unprojected to [9.6, 57.9] m (was pinned perspective art: check it is a real object at this spot)
     - place[11]: structure.klm-p-v2-rail-0: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[12]: structure.klm-p-v2-rail-1: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[13]: structure.klm-p-v2-rail-2: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - place[14]: bird.heron: pixel placement unprojected to [-8.4, 34] m (was pinned perspective art: check it is a real object at this spot)
     - place[23]: plant.klm-sycamore-bough: pinned perspective art (screen-drawn, not a world object); dropped. Place the real library object (a boat, a bridge, a walk) instead
     - buildings: 6 of the v2 compile's 6 generated building(s) carried as v3 buildings (6 footprint(s), 0 house(s) of 0 street rule(s)): foot, front, storeys, style and seed as v2 drew them
     - backdrop: backdrop style 'city-sheffield-hills' chosen from the place and the water; check it against the real view
     - entities: 4 entries kept where the placement solver settled them (overlap, blocksPath; 0.25-0.75 m, at most 1.2 m; each in the notes): entities[5] person.bench-sitter 0.5 m, entities[18] bird.pigeon-feral 0.75 m, entities[20] bird.pigeon-feral 0.75 m, entities[25] street.bollard 0.25 m
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', {"id":"sheffield-kelham-2-w3","label":"The goit at Kelham Island Museum, Sheffield","site":"The goit at Kelham Island Museum — the River Don Engine house, the Bessemer converter in the yard","tags":["uk","yorkshire","south yorkshire","sheffield","kelham island","city","industrial heritage","goit","museum","steel","bessemer converter","engine house","chimney","world-v3"],"liveSky":{"lat":53.3894,"lon":-1.4729},"mood":"calm","colour":"amber"},
{
 "v": 3,
 "place": {"lat":53.3894,"lon":-1.4729,"region":"south-yorkshire"},
 "camera": {"eye":1.65,"fov":66,"horizon":430,"heading":305,"water":-1.6},
 "surfaces": [
  {"id":"land","kind":"plaza","poly":[[-3.2,3.9],[3.2,3.9],[2435.3,3000],[-2435.3,3000]]},
  {"id":"yard","kind":"plaza","poly":[[1.65,1.94],[1.68,5.04],[1.72,9.38],[1.78,14.47],[1.85,19.8],[1.95,24.87],[2.04,28.84],[2.14,32.84],[2.25,36.88],[2.38,41],[2.54,45.26],[2.74,49.71],[2.94,53.61],[40,56],[40,3]]},
  {"id":"green","kind":"grass","poly":[[10,36],[18,36],[18,56],[10,56]]},
  {"id":"lip-l","kind":"grass","poly":[[-7.75,2.03],[-7.72,5.13],[-7.68,9.48],[-7.62,14.59],[-7.55,19.95],[-7.45,25.07],[-7.36,29.07],[-7.26,33.08],[-7.15,37.15],[-7.02,41.34],[-6.85,45.66],[-6.65,50.15],[-6.45,54.11],[-6.22,58.1],[-5.99,62.18],[-5.72,66.39],[-5.43,70.77],[-5.11,75.39],[-4.74,80.25],[-4.42,84.22],[-4.08,88.3],[-3.71,92.51],[-3.32,96.83],[-2.92,101.28],[-2.5,105.85],[-2.08,110.54],[-1.66,115.34],[-1.24,120.27],[-0.88,124.63],[-0.49,129.42],[-0.08,134.53],[0.35,139.81],[0.77,145.13],[1.18,150.35],[1.58,155.34],[1.94,159.96],[2.27,164.08],[2.54,167.56],[2.76,170.26],[1.76,170.35],[1.54,167.64],[1.27,164.15],[0.94,160.03],[0.58,155.42],[0.18,150.43],[-0.23,145.2],[-0.65,139.89],[-1.08,134.61],[-1.49,129.5],[-1.88,124.71],[-2.24,120.36],[-2.65,115.42],[-3.07,110.62],[-3.49,105.94],[-3.91,101.37],[-4.31,96.92],[-4.7,92.6],[-5.07,88.38],[-5.42,84.3],[-5.74,80.33],[-6.11,75.46],[-6.43,70.84],[-6.72,66.46],[-6.99,62.24],[-7.22,58.16],[-7.44,54.17],[-7.65,50.2],[-7.85,45.7],[-8.02,41.37],[-8.15,37.18],[-8.26,33.11],[-8.36,29.09],[-8.45,25.09],[-8.55,19.97],[-8.62,14.6],[-8.68,9.49],[-8.72,5.14],[-8.75,2.04]]},
  {"id":"walk","kind":"path","path":[[0.25,1.95],[0.28,5.06],[0.32,9.4],[0.38,14.49],[0.45,19.82],[0.55,24.9],[0.64,28.88],[0.74,32.88],[0.85,36.92],[0.98,41.05],[1.15,45.32],[1.34,49.77],[1.54,53.69],[1.76,57.65],[1.99,61.69],[2.26,65.87],[2.55,70.23],[2.87,74.8],[3.24,79.63],[3.55,83.56],[3.89,87.61],[4.26,91.8],[4.65,96.11],[5.05,100.56],[5.47,105.13],[5.89,109.83],[6.31,114.65],[6.73,119.6],[7.09,123.97],[7.48,128.78],[7.89,133.89],[8.32,139.17],[8.75,144.5],[9.16,149.71],[9.56,154.71],[9.92,159.33],[10.25,163.45],[10.52,166.92],[10.73,169.61]],"width":2.8},
  {"id":"goit","kind":"water","water":"canal","poly":[[-7.75,2.03],[-7.72,5.13],[-7.68,9.48],[-7.62,14.59],[-7.55,19.95],[-7.45,25.07],[-7.36,29.07],[-7.26,33.08],[-7.15,37.15],[-7.02,41.34],[-6.85,45.66],[-6.65,50.15],[-6.45,54.11],[-6.22,58.1],[-5.99,62.18],[-5.72,66.39],[-5.43,70.77],[-5.11,75.39],[-4.74,80.25],[-4.42,84.22],[-4.08,88.3],[-3.71,92.51],[-3.32,96.83],[-2.92,101.28],[-2.5,105.85],[-2.08,110.54],[-1.66,115.34],[-1.24,120.27],[-0.88,124.63],[-0.49,129.42],[-0.08,134.53],[0.35,139.81],[0.77,145.13],[1.18,150.35],[1.58,155.34],[1.94,159.96],[2.27,164.08],[2.54,167.56],[2.76,170.26],[9.24,169.74],[9.02,167.04],[8.75,163.56],[8.42,159.44],[8.06,154.82],[7.66,149.83],[7.25,144.61],[6.83,139.29],[6.4,134.01],[5.99,128.9],[5.6,124.09],[5.24,119.73],[4.82,114.78],[4.4,109.96],[3.98,105.27],[3.56,100.7],[3.16,96.25],[2.77,91.93],[2.4,87.74],[2.06,83.68],[1.74,79.75],[1.37,74.91],[1.05,70.33],[0.76,65.97],[0.49,61.78],[0.26,57.74],[0.05,53.77],[-0.15,49.85],[-0.35,45.38],[-0.52,41.1],[-0.65,36.97],[-0.76,32.92],[-0.86,28.91],[-0.95,24.93],[-1.05,19.85],[-1.12,14.51],[-1.18,9.42],[-1.22,5.07],[-1.25,1.97]],"shallow":0.6}
 ],
 "buildings": [
  {"id":"gen-b3","foot":[[-30,120],[-8,116],[-6,150],[-28,154]],"storeys":6,"style":"kelham-flats","seed":304,"front":0,"src":"v2 buildings[3]"},
  {"id":"gen-b5","foot":[[20,92],[40,92],[40,118],[20,118]],"storeys":3,"style":"kelham-works","seed":312,"front":0,"src":"v2 buildings[5]"},
  {"id":"gen-b2","foot":[[-17.07,76.4],[-5.11,75.39],[-2.92,101.28],[-14.88,102.29]],"storeys":3,"style":"kelham-works","seed":303,"front":0,"src":"v2 buildings[2]"},
  {"id":"gen-b1","foot":[[-18.63,50.86],[-6.65,50.15],[-5.43,70.77],[-17.41,71.48]],"storeys":4,"style":"kelham-works","seed":302,"front":0,"src":"v2 buildings[1]"},
  {"id":"gen-b0","foot":[[-18.45,25.36],[-7.45,25.07],[-7.02,41.34],[-18.02,41.63]],"storeys":3,"style":"kelham-works","seed":301,"front":0,"src":"v2 buildings[0]"},
  {"id":"gen-b4","foot":[[13,30],[13,4],[27,4],[27,30]],"storeys":3,"style":"mill","seed":311,"front":0,"src":"v2 buildings[4]"}
 ],
 "entities": [
  {"obj":"person.photographer","at":[4.6,21],"facing":90},
  {"obj":"person.elderly-couple","at":[8.8,21.5],"facing":270},
  {"obj":"tree.bank-alder","at":[15,52]},
  {"obj":"tree.bank-birch","at":[14,42]},
  {"obj":"bird.heron","at":[-8.4,33.99]},
  {"obj":"person.bench-sitter","at":[6.15,14.35],"facing":270},
  {"obj":"street.bench","at":[6.5,14],"facing":270},
  {"obj":"street.bench","at":[7.2,34],"facing":270},
  {"obj":"plant.planter","at":[11.5,12]},
  {"obj":"plant.planter","at":[12.2,40]},
  {"obj":"plant.planter","at":[4.6,44]},
  {"obj":"plant.wildflowers","at":[10.52,38.37]},
  {"obj":"plant.wildflowers","at":[13.92,38.93]},
  {"obj":"plant.wildflowers","at":[17.77,55.89]},
  {"cluster":"plant.grass","on":"green","n":11,"seed":3983},
  {"obj":"bird.pigeon-feral","at":[2.41,9.3]},
  {"obj":"bird.pigeon-feral","at":[3.02,11.02]},
  {"obj":"bird.pigeon-feral","at":[8.29,19.68]},
  {"obj":"bird.pigeon-feral","at":[12.89,24.04]},
  {"obj":"bird.pigeon-feral","at":[14.5,24.42]},
  {"obj":"bird.pigeon-feral","at":[21.31,30.04]},
  {"obj":"bird.pigeon-feral","at":[3.33,29.81]},
  {"obj":"street.bollard","at":[4.72,17.09]},
  {"obj":"street.bollard","at":[8.85,17.24]},
  {"obj":"street.bollard","at":[2.5,17.42]},
  {"obj":"street.bollard","at":[5.03,23.14]},
  {"obj":"plant.grass-long","at":[-8.64,11.42]},
  {"obj":"plant.grass-long","at":[-7.8,11.46]},
  {"obj":"plant.grass-long","at":[-8.66,11.64]},
  {"obj":"plant.grass-long","at":[-7.98,11.95]},
  {"obj":"plant.grass-long","at":[-8.64,12.47]},
  {"obj":"plant.grass-long","at":[-8.38,12.98]},
  {"obj":"plant.grass-long","at":[-7.92,15.15]},
  {"obj":"plant.grass-long","at":[-8.28,15.25]},
  {"obj":"plant.grass-long","at":[-7.86,15.29]},
  {"obj":"plant.grass-long","at":[-7.8,15.35]},
  {"obj":"plant.grass-long","at":[-8.28,15.43]},
  {"obj":"plant.grass-long","at":[-7.87,15.61]},
  {"obj":"plant.grass-long","at":[-8.27,15.7]},
  {"obj":"plant.grass-long","at":[-8.07,15.82]},
  {"obj":"plant.grass-long","at":[-8.31,17.31]},
  {"obj":"tree.bank-alder","at":[-8.04,14.72]},
  {"obj":"tree.bank-alder","at":[-8.11,19.99]},
  {"obj":"tree.bank-willow","at":[-8.46,17.09]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.54,11.36]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.45,11.41]},
  {"obj":"plant.canal-view-loosestrife","at":[-7.76,11.6]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.41,12.18]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.6,12.34]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.61,12.51]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.31,14.22]},
  {"obj":"plant.canal-view-loosestrife","at":[-7.99,15.16]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.05,15.18]},
  {"obj":"plant.canal-view-loosestrife","at":[-8.34,15.69]},
  {"obj":"plant.canal-view-loosestrife","at":[-7.91,17.05]},
  {"obj":"ground.leaf-litter","at":[1.92,4.3]},
  {"obj":"ground.leaf-litter","at":[2.65,4.5]},
  {"obj":"ground.leaf-litter","at":[2.01,4.71]},
  {"obj":"ground.leaf-litter","at":[2.69,5.64]},
  {"obj":"ground.leaf-litter","at":[3.69,5.69]},
  {"obj":"ground.leaf-litter","at":[4.42,5.79]},
  {"obj":"ground.leaf-litter","at":[3.46,5.96]},
  {"obj":"ground.leaf-litter","at":[3.18,6.05]},
  {"obj":"ground.leaf-litter","at":[4.83,6.88]},
  {"obj":"ground.leaf-litter","at":[2.98,7.01]},
  {"obj":"ground.leaf-litter","at":[3.58,7.15]},
  {"obj":"ground.leaf-litter","at":[4.59,7.55]},
  {"obj":"ground.leaf-litter","at":[5.54,8.71]},
  {"obj":"ground.leaf-litter","at":[1.91,9.14]},
  {"obj":"ground.leaf-litter","at":[4.42,9.33]},
  {"obj":"ground.leaf-litter","at":[2.85,9.9]},
  {"obj":"ground.leaf-litter","at":[7.31,10.13]},
  {"obj":"ground.leaf-litter","at":[7.03,10.88]},
  {"obj":"ground.leaf-litter","at":[5.91,11.47]},
  {"obj":"ground.leaf-litter","at":[3.76,11.99]},
  {"obj":"ground.leaves","at":[3.54,4.85]},
  {"obj":"ground.leaves","at":[2.77,4.92]},
  {"obj":"ground.leaves","at":[4.38,6.7]},
  {"obj":"ground.leaves","at":[2.51,7.58]},
  {"obj":"ground.leaves","at":[3.5,7.61]},
  {"obj":"ground.leaves","at":[4.32,7.77]},
  {"obj":"ground.leaves","at":[2.2,8.28]},
  {"obj":"ground.leaves","at":[3.22,9.58]},
  {"obj":"ground.leaves","at":[8.47,11.09]},
  {"obj":"ground.leaves","at":[2.47,11.79]},
  {"obj":"ground.leaves","at":[7.14,11.98]},
  {"obj":"ground.leaves","at":[-0.06,4.81]},
  {"obj":"ground.leaves","at":[-1.08,6.02]},
  {"obj":"ground.leaves","at":[-0.63,10.77]},
  {"obj":"ground.leaf-litter","at":[-0.17,4.31]},
  {"obj":"ground.leaf-litter","at":[-0.37,4.31]},
  {"obj":"ground.leaf-litter","at":[-0.69,4.31]},
  {"obj":"ground.leaf-litter","at":[-1.13,4.35]},
  {"obj":"ground.leaf-litter","at":[1.15,4.39]},
  {"obj":"ground.leaf-litter","at":[-0.92,4.53]},
  {"obj":"ground.leaf-litter","at":[-0.35,4.92]},
  {"obj":"ground.leaf-litter","at":[-0.77,5.1]},
  {"obj":"ground.leaf-litter","at":[1.22,5.16]},
  {"obj":"ground.leaf-litter","at":[0.13,5.33]},
  {"obj":"ground.leaf-litter","at":[0.9,6.02]},
  {"obj":"ground.leaf-litter","at":[-0.6,6.61]},
  {"obj":"ground.leaf-litter","at":[1.22,6.85]},
  {"obj":"ground.leaf-litter","at":[-0.4,7.29]},
  {"obj":"ground.leaf-litter","at":[0.38,7.8]},
  {"obj":"ground.leaf-litter","at":[-0.38,8.73]},
  {"obj":"ground.leaf-litter","at":[0.02,9.2]}
 ],
 "landmarks": [
  {"obj":"landmark.klm-p-v2-hall","at":[9.56,57.91],"src":"https://www.simt.co.uk/kelham-island-museum"},
  {"obj":"landmark.klm-chimney","at":[30,128],"variant":0,"src":"https://www.simt.co.uk/kelham-island-museum"},
  {"obj":"structure.klm-bessemer","at":[6.6,25],"facing":270,"src":"https://www.simt.co.uk/kelham-island-museum"},
  {"obj":"street.lamppost","at":[4.2,9.5],"src":"https://www.simt.co.uk/kelham-island-museum"},
  {"obj":"street.lamppost","at":[2.6,30],"src":"https://www.simt.co.uk/kelham-island-museum"}
 ],
 "life": [
  {"who":"walkers","on":"walk","rate":"4/min","mix":{"couple":0.23,"stroll":0.15,"student":0.15,"child-scooter":0.08,"elderly-couple":0.08,"photographer":0.08,"dog-walker":0.15,"family":0.08}},
  {"who":"walkers","on":"yard","rate":"4/min","mix":{"couple":0.23,"stroll":0.15,"student":0.15,"child-scooter":0.08,"elderly-couple":0.08,"photographer":0.08,"dog-walker":0.15,"family":0.08}},
  {"who":"mallard","count":2,"on":"goit"},
  {"who":"moorhen","count":1,"on":"goit"}
 ],
 "backdrop": {"style":"city-sheffield-hills"},
 "seed": 1
});
})();
