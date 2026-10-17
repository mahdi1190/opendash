/* WORLD SCENE (format v3) world-test / cotswold-green-1-w3: A Cotswold village green, Gloucestershire. Scaffolded by `node tools/world.mjs new cotswold-green --setting village-green` (layout family 'green', a green with a lane round it and houses on three sides).
   View: looking north across the green to the parish church (a west tower, a south aisle and porch) behind its churchyard wall and lychgate; the pub to the left, the pond in front of it.
   The churchyard (17 Oct): the church is the reusable model structure.parish-church, the wall is `laid: 'coursed'` with a saddle coping, the lychgate, the headstones, the yews and the
   noticeboard are models too (docs/dev/WORLD_MODELS.md); the green has a bench pair on the path, people sitting, walking dogs, pushing a pram. PURE; hidden dev pack 'world-test'. */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the far side of the green (the lane, the pub, the churchyard) is 14.4 m nearer than the scaffold's draft: a church at 100 m was a strip of 8 px for its whole yard
  const DZ = -14.4;
  const z = (v) => Math.round((v + DZ) * 100) / 100;
  // the churchyard's headstones: rows south of the church (seeded, leaning, mostly facing the lane, some turned), clear of the path, the porch and the yews; from 5 m behind the wall, or the wall hides them from an eye 8 m up
  function churchyardStones() {
    let a = 91; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = [];
    for (const [zr, n, x0, x1] of [[86.6, 9, 5.2, 37.2], [88.1, 10, 5.4, 37.2], [89.6, 10, 5.6, 37], [91, 8, 5.6, 37]]) {
      for (let i = 0; i < n; i++) {
        const x = x0 + (x1 - x0) * (i + 0.2 + 0.6 * rnd()) / n, zz = zr + (rnd() - 0.5) * 0.7;
        if (Math.abs(x - (15.2 + Math.max(0, zz - 83) * 1.0)) < 2.4 + Math.max(0, zz - 84) * 0.15 || (x > 20.2 && x < 26.6 && zz > 89.2) || (Math.abs(x - 9.4) < 1.5 && zz > 86.6) || (Math.abs(x - 36.6) < 1.6 && zz > 85.8) || (Math.abs(x - 27.5) < 1.6 && zz > 86.8 && zz < 91)) continue;
        const r = rnd(), facing = r < 0.58 ? 180 + (rnd() - 0.5) * 70 : r < 0.8 ? 180 + (rnd() - 0.5) * 140 : (rnd() < 0.5 ? 90 : 270);
        out.push({ obj: 'structure.headstone', at: [Math.round(x * 100) / 100, z(zz)], facing: Math.round(facing), id: 'stone-' + out.length, model: { size: 0.9 + 0.3 * rnd() } });
      }
    }
    return out;
  }
  worldAdd('world-test', {"id":"cotswold-green-1-w3","label":"A Cotswold village green, Gloucestershire (world)","site":"A Cotswold village green, Gloucestershire","mood":"calm","colour":"slate","tags":["uk","cotswold-green","village-green","world-v3"],"liveSky":{"lat":51.76,"lon":-1.835},"ukPlace":"cotswold-green","county":"gloucestershire","ukTown":"Cotswolds","ukView":"world-engine","setting":"a green with a lane round it and houses on three sides"}, {
    v: 3, place: {"lat":51.76,"lon":-1.835,"alt":60,"region":"uk","style":"village-green"},
    camera: {"eye":8,"fov":64,"horizon":500,"heading":0},
    surfaces: [
      {"id":"green","kind":"grass","poly":[[-190,1],[190,1],[190,118],[-190,118]]},
      {"id":"lane","kind":"road","path":[[-190,z(78)],[-60,z(80)],[60,z(77)],[190,z(79)]],"width":4.2},
      {"id":"lane-l","kind":"road","path":[[-96,1],[-98,40],[-96,z(78)]],"width":4},
      {"id":"lane-r","kind":"road","path":[[96,1],[98,40],[96,z(78)]],"width":4},
      {"id":"walk","kind":"path","path":[[8,1],[12,28],[14,48],[15,z(78)],[15.2,z(82.2)],[17.8,z(86)],[21.4,z(89.6)],[23.1,z(91.4)]],"width":1.8},
      {"id":"pub-front","kind":"pavement","path":[[-52,z(73)],[-22,z(73)]],"width":3.2},
      {"id":"pond","kind":"water","water":"pond","poly":[[-8.8,40],[-8.2,43.8],[-14.2,46.7],[-22.1,47.7],[-30.9,49.7],[-38.2,46.9],[-44.1,43.9],[-45.8,40],[-43.9,36.1],[-37.7,33.4],[-30.1,31.9],[-21.3,30.7],[-14.8,33.7],[-8.6,36.2]],"shallow":0.45}
    ],
    lines: [
      {"id":"churchyard-wall","kind":"wall","laid":"coursed","cope":"saddle","stone":"#b99c68","h":0.95,"width":0.5,"path":[[3.3,z(104)],[3.4,z(82.2)],[39.2,z(82.2)],[39.6,z(104)]],"gaps":[[31.85,35.35]]}
    ],
    buildings: [
      {"id":"far","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":0,"to":138,"shops":false,"depth":[6,8]},
      {"id":"far-2","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":166,"to":192,"shops":false,"depth":[6,8]},
      {"id":"far-3","along":"lane","side":"left","style":"cotswold-stone","storeys":[1,2],"from":230,"to":380,"shops":false,"depth":[6,8]},
      {"id":"west","along":"lane-l","side":"left","style":"cotswold-stone","storeys":[1,2],"from":0,"to":82,"shops":false,"depth":[6,8]},
      {"id":"east","along":"lane-r","side":"right","style":"cotswold-stone","storeys":[1,2],"from":0,"to":82,"shops":false,"depth":[6,8]},
      {"id":"pub","foot":[[-48,z(84)],[-28,z(84)],[-28,z(94)],[-48,z(94)]],"storeys":2,"landmark":true,"style":"cotswold-stone","src":"the village pub: a bigger house facing the green"}
    ],
    entities: [
      {"obj":"street.bench","at":[14.2,32],"facing":270,"id":"bench-1"},
      {"obj":"structure.lychgate","at":[15.2,z(82.2)],"facing":0,"id":"lychgate","blocks":true,"model":{"livery":"oak","seed":4}},
      {"obj":"tree.churchyard-yew","at":[9.4,z(88)],"id":"yew-1","model":{"size":0.78,"seed":2}},
      {"obj":"tree.churchyard-yew","at":[36.6,z(87)],"id":"yew-2","model":{"size":0.95,"seed":7}},
      {"obj":"tree.churchyard-yew","at":[27.5,z(89)],"id":"yew-3","model":{"size":0.85,"seed":5}},
      {"obj":"street.noticeboard","at":[8.6,z(72)],"facing":180,"id":"noticeboard","model":{"livery":"green","seed":3}},
      {"obj":"street.bench","at":[12,52],"facing":90,"id":"bench-2"},
      {"obj":"street.bench","at":[16.6,52],"facing":270,"id":"bench-3"},
      {"obj":"street.pub-sign","at":[-30,z(73)],"facing":0,"id":"pub-sign"}
    ].concat(churchyardStones()),
    life: [
      {"who":"walkers","on":"walk","rate":"3/min","mix":{"stroll":0.4,"dog-walker":0.3,"family":0.15,"elderly":0.15},"edges":["S","N"]},
      {"who":"walkers","on":"walk","rate":"1/2min","mix":{"buggy":1},"edges":["S","N"]},
      {"who":"dog-walkers","on":"walk","rate":"1/min","edges":["S","N"]},
      {"who":"walkers","on":"walk","rate":"1/2min","mix":{"jogger":1},"edges":["S","N"]},
      {"who":"walkers","on":"walk","rate":"1/2min","mix":{"friends":1},"edges":["S","N"]},
      {"who":"visit","mix":{"elderly":1},"rate":"1/2min","edges":["S"],"goals":[{"sit":"bench-2","for":[40,140]},{"leave":"near"}]},
      {"who":"visit","mix":{"stroll":1},"rate":"1/3min","edges":["S"],"goals":[{"sit":"bench-3","for":[30,100]},{"leave":"near"}]},
      {"who":"mallard","count":6,"on":"pond"},
      {"who":"moorhen","count":1,"on":"pond"}
    ],
    landmarks: [
      {"obj":"structure.parish-church","at":[21,z(103)],"facing":90,"id":"church","src":"a generic English parish church of the Cotswold wool-church type: a west tower with a crenellated parapet, a south aisle with a clerestory, a south porch, a chancel","model":{"livery":"honey","size":1,"seed":3,"opts":{"era":"perpendicular","aisle":"south","crown":"parapet","porch":true}}}
    ],
    seed: 63,
  });
})();
