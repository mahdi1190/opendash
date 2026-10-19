/* WORLD SCENE (format v3) world-test / seaside-pier-1-w3: A Victorian seaside pier and promenade, England. Scaffolded by `node tools/world.mjs new seaside-pier --setting coast` (layout family 'coast', a promenade along a beach, the sea on the right).
   View: looking east along the promenade, the sea on the right. A FIRST DRAFT: edit the lists below, then render and read docs/dev/NEW_SCENE_GUIDE.md section 5. PURE; hidden dev pack 'world-test'. */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the seawall: the beach lies 2.9 m below the promenade, the drop is a steep batter at x 5 to 7.5 (a cutting 10 m wide has a 2.5 m side); parallel cuttings every 4 m make the flat bed of the beach
  const HUTS = typeof worldBeachHutRow === 'function' ? worldBeachHutRow : () => [];
  const SEAWALL = []; for (let x = 10; x <= 46; x += 4) SEAWALL.push({ kind: 'cutting', path: [[x, 1], [x, 600]], width: 10, h: 2.9 });
  // the pier: a generator makes the model entity, a ramp from the beach and a walkable deck over the water, and what stands on it (kiosks, benches, anglers)
  // (the generators live in 79-world-4model-pier.js and -beachhut.js; a loader that reads the scene file alone gets an empty pier and no huts)
  const PIER = typeof worldPierPlan !== 'function' ? { entity: null, entities: [], surfaces: [], way: [4.4, 24], point: () => [0, 0] } : worldPierPlan({ id: 'pier', root: [9, 28], facing: 30, size: 1, wallX: 4.7, waterY: -2.9, level: 0.1, benches: 6, anglers: 4, seed: 4, model: { opts: { gate: false } },
    kiosks: [{ kind: 'icecream', side: 1, at: 0.22, livery: 'pink-cream' }, { kind: 'tea', side: -1, at: 0.45, livery: 'mint-white' }, { kind: 'tackle', side: 1, at: 0.7, livery: 'navy-cream' }] });
  const NEAR = (() => { // deterministic scatter in the near band, one jittered item per grid cell so nothing overlaps
    let h = 7; const r = () => (h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, out = [];
    const grid = (id, x0, x1, z0, z1, step, pick) => { for (let x = x0; x < x1; x += step) for (let z = z0; z < z1; z += step) if (r() < 0.85) out.push({ id: id + '-' + out.length, obj: pick(), at: [Math.round((x + r() * step * 0.4) * 100) / 100, Math.round((z + r() * step * 0.4) * 100) / 100] }); };
    grid('near-stone', 9.0, 14.2, 11, 24, 1.8, () => 'rock.stones');
    return out;
  })();
  worldAdd('world-test', {"id":"seaside-pier-1-w3","label":"A Victorian seaside pier and promenade, England (world)","site":"A Victorian seaside pier and promenade, England","mood":"calm","colour":"slate","tags":["uk","seaside-pier","coast","world-v3"],"liveSky":{"lat":50.82,"lon":-0.14},"ukPlace":"seaside-pier","county":"sussex","ukTown":"Seaside","ukView":"world-engine","setting":"a promenade along a beach, the sea on the right"}, {
    v: 3, place: {"lat":50.82,"lon":-0.14,"alt":60,"region":"uk","style":"coast"},
    camera: {"eye":3.2,"fov":70,"horizon":470,"heading":90,"water":-2.9},
    ground: {"features":[...SEAWALL,{"kind":"cliff","path":[[70,300],[200,296],[330,306]],"h":36,"rock":"chalk","high":"far","fade":55,"rough":0,"rim":{"w":6,"h":0},"scree":{"w":10,"h":4}}]},
    surfaces: [
      {"id":"prom","kind":"pavement","path":[[0,1],[-1,160],[3,330],[8,560]],"width":8},
      {"id":"sand","kind":"sand","poly":[[5,1],[34,1],[42,600],[14,600]]},
      {"id":"sea","kind":"water","water":"sea","poly":[[24,1],[900,1],[900,300],[34,300]],"shallow":1.5},
      {"id":"headland","kind":"grass","poly":[[40,300],[420,300],[420,700],[30,700]]},
      {"id":"front","kind":"plaza","poly":[[-20,1],[-4,1],[-3,560],[-17,560]]},
      {"id":"town","kind":"road","path":[[-23,1],[-24,160],[-21,330],[-18,560]],"width":5},
      ...PIER.surfaces
    ],
    lines: [
      {"id":"sea-rail","kind":"railing","path":[[4.6,1],[3.6,160],[7.6,330],[12.6,560]],"gaps":[{"at":[PIER.way[0] - 0.3, PIER.way[1]],"w":7}]}
    ],
    buildings: [
      {"id":"hotels-0","along":"town","side":"left","style":"georgian","storeys":[3,4],"from":44,"to":80,"shops":false,"depth":[10,14]},
      {"id":"hotels-a","along":"town","side":"left","style":"seafront-regency","storeys":4,"from":80,"to":150,"shops":false,"depth":[11,14]},
      {"id":"parade","along":"town","side":"left","style":"seafront-parade","storeys":3,"from":150,"to":235,"shops":["tea","gift","deli","bakery","florist","books","antiques"],"depth":[10,13]},
      {"id":"hotels-b","along":"town","side":"left","style":"georgian","storeys":[3,4],"from":235,"to":330,"shops":false,"depth":[10,14]},
      {"id":"hotels-c","along":"town","side":"left","style":"seafront-regency","storeys":4,"from":330,"to":600,"shops":false,"depth":[11,14]}
    ],
    entities: [
      ...HUTS({ id: 'hutsA', from: [11, 52], to: [12, 134], facing: 270, seed: 3, turn: [-36, -26] }),
      ...HUTS({ id: 'hutsB', from: [17.5, 66], to: [18.5, 144], facing: 270, seed: 8, turn: [-32, -24], mix: { stripe: 0.2 }, skip: 0.12 }),
      {"obj":"street.bench","at":[3,38],"facing":90,"id":"bench-1"},
      {"obj":"street.lamppost","at":[4.3,44],"id":"lamp-1"},
      {"obj":"street.lamppost","at":[3.9,100],"id":"lamp-2"},
      ...(PIER.entity ? [PIER.entity] : []), ...PIER.entities,
      // the near ground the lens sees: shingle on the beach edge to the right
      // (a cluster spreads along the whole surface and only its first few metres are in the lower band, so these are placed where the frame is)
      ...NEAR,
      // seafront life: an ice-cream kiosk on the promenade by the sea rail, bunting across it, gulls on the beach and the pier, boats out at sea
      { id: 'kiosk-ice', obj: 'building.kiosk', at: [-6.5, 47], facing: 90, model: { livery: 'cream-red', seed: 3, opts: { kind: 'icecream' } } },
      { id: 'bunting-1', obj: 'street.bunting', at: [0, 96], facing: 90, blocks: true, model: { livery: 'primary', seed: 2, opts: { span: 8.4, height: 3.9, sag: 0.5 } } },
      { id: 'bunting-2', obj: 'street.bunting', at: [0, 168], facing: 90, blocks: true, model: { livery: 'pastel', seed: 5, opts: { span: 8.4, height: 3.9, sag: 0.5 } } },
      { id: 'gull-a', obj: 'bird.herring-gull', at: [22, 66], facing: 70 }, { id: 'gull-b', obj: 'bird.herring-gull', at: [24.5, 70], facing: 120 },
      { id: 'gull-c', obj: 'bird.herring-gull', at: [22.3, 100], facing: 200 }, { id: 'gull-d', obj: 'bird.herring-gull', at: [22.6, 128], facing: 60 },
      { id: 'boat-2', obj: 'boat.fishing-boat', at: [70, 214], facing: 100, attach: 'water', model: { seed: 4, size: 1.25 } },
      {"obj":"structure.lighthouse","at":[185,372],"id":"lighthouse","model":{"livery":"white-red","size":1.35}}
    ],
    life: [
      // visitors walk onto the pier (only when the pier generator is loaded: a loader that reads this file alone has no pier to walk to)
      ...(PIER.entity ? [
        { who: 'visit', on: 'prom', edges: ['S'], mix: { stroll: 0.5, brisk: 0.2, elderly: 0.3 }, rate: '1/30s', goals: [{ go: 'pier' }, { wander: 'deck:pier', for: [40, 100] }, { leave: 'S' }] },
        { who: 'visit', on: 'prom', edges: ['S'], mix: { elderly: 0.5, stroll: 0.5 }, rate: '1/70s', goals: [{ go: 'pier' }, { wander: 'deck:pier', for: [60, 150] }, { leave: 'S' }] },
      ] : []),
      {"who":"walkers","on":"prom","rate":"7/min","mix":{"stroll":0.4,"family":0.25,"dog-walker":0.2,"couple":0.15},"edges":["S","N"]},
      {"who":"gulls","count":8}
    ],
    seed: 85,
  });
})();
