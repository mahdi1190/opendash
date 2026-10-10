/* ============================================================
   COMPOSED SCENE (v2, by hand) proof / Fleet Pond: across the open water from the boardwalk in the south-west
   reedbed, to the north reeds and the South Western main line on its embankment.
   The ground plan (camera, boardwalk, shores, railway) is SCENE_PROOF_FLEET_POND (70-scene-lib-proof-fleet-pond.js);
   the life that the library hooks cannot do (the heron's hunt, the kingfisher's dive, the grebes, swallows, bats,
   dawn mist) is the 'proof-fleet-pond' render pass in the same file. Registered by 72-anim-pack-proof-fleet-pond.js.
   PURE: one function, nothing runs at load.
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve
   ============================================================ */
function sceneProofFleetPondData() {
  sceneProofFleetLocalObjects();
  const P = SCENE_PROOF_FLEET_POND, railD = P.railD;
  const rev = (a) => a.slice().reverse();
  // the north reedbed: from the far shore back to just short of the embankment
  const northReeds = P.farShore.concat([[160, 110], [160, railD(160) - 12.5], [0, railD(0) - 12.5], [-160, railD(-160) - 12.5], [-320, railD(-320) - 12.5], [-320, 50]]);
  const reedsW = P.reedEdge.concat([[-160, 60], [-320, 50], [-320, 2.4]]);
  const carrE = P.carr.concat([[160, railD(160) - 12.5], [160, 30]]);
  // the woods behind the line: from the far toe of the embankment back (the trees stand behind the trains, never on the line)
  const lineside = [[-320, railD(-320) + 10], [320, railD(320) + 10], [320, railD(320) + 60], [-320, railD(-320) + 60]];
  const reedsE = [[2.95, 2.4], [2.75, 4.2], [3.05, 5.6], [3.9, 6.8], [5.4, 7.7], [7.6, 8.15], [10.5, 8.2], [14, 8.4], [14, 2.4]];
  const cut = P.cut;
  // a reed fringe along the carr's water edge (2.5 m wide)
  const reedsC = P.carr.slice(0, 9).concat(P.carr.slice(0, 9).reverse().map(([x, d]) => [x + 2.6, d + 1.4]));
  const water = [P.reedEdge[0]].concat(reedsE.slice(0, 8), [[20, 14], [28, 24]], P.carr, rev(P.farShore).slice(1), rev(P.reedEdge).slice(1));
  // the embankment: a relief ridge under the railway, the cross-section of P.embH (3 m formation, the bank faces 1 in 1.6), on a
  // grid fine enough (20 m across, 3 % in depth: 3 m at the line) that the ridge stays where the line is (bilinear in x and log
  // d); flat ground outside the grid's 50 to 250 m (its edge rows are 0)
  const nx = 31, nd = 56, d0 = 50, d1 = 250, h = [];
  for (let j = 0; j < nd; j++) {
    const d = d0 * Math.pow(d1 / d0, j / (nd - 1));
    for (let i = 0; i < nx; i++) h.push(Math.round(P.embH(-300 + 600 * i / (nx - 1), d) * 100) / 100);
  }
  // the embankment drawn in this camera's perspective (pixel placements, pinned, one piece per 88 m: the reeds sort in front)
  const M = SCENE_PROOF_FLEET_EMB, bank = [];
  for (let v = 0; v < M.n; v++) { const o = M.anchor(v); bank.push({ obj: 'structure.proof-fleet-embankment', variant: v, x: o[0], y: o[1], s: 1, pin: true, layer: 'mid', shadow: false, anim: false }); }
  // the boardwalk pieces and the platform, drawn in this camera's perspective (pixel placements, pinned)
  const W = SCENE_PROOF_FLEET_WALK, walk = W.pieces.map((pc, i) => {
    const q = W.at(pc[0]), a = W.proj(q[0], q[1], 0);
    return { obj: 'structure.proof-fleet-boardwalk', variant: i, x: Math.round(a[0] * 10) / 10, y: Math.round(a[1] * 10) / 10, s: 14 / q[1], pin: true, layer: q[1] < 15 ? 'fore' : 'near', shadow: false, anim: false };
  });
  // reed islands out in the water: small stands of reed and reedmace growing from the shallows, which break the far shore's
  // line and put layers into the open water (pixel placements at the water level, pinned: reeds may not stand on water)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const reedDef = typeof sceneObj === 'function' ? sceneObj('plant.proof-fleet-reed') : null, rushDef = typeof sceneObj === 'function' ? sceneObj('plant.proof-fleet-rush') : null;
  const islands = [];
  for (const [cx, cd, rx, rd, n] of [[6.5, 33, 3.4, 1.6, 22], [-3.5, 52, 2.0, 1.0, 9], [15.5, 37, 1.4, 0.8, 7]]) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), x = cx + Math.cos(a) * rx * r, d = cd + Math.sin(a) * rd * r, rush = rnd() < 0.22, def = rush ? rushDef : reedDef;
      if (!def) continue;
      const p = W.proj(x, d, P.camera.water), k = (0.7 + 0.45 * rnd()) * (1 - 0.35 * r);
      islands.push({ obj: rush ? 'plant.proof-fleet-rush' : 'plant.proof-fleet-reed', x: Math.round(p[0] * 10) / 10, y: Math.round(p[1] * 10) / 10, s: Math.round(1000 * k * W.f / d * (rush ? 1.6 : 1.8) / def.size[1]) / 1000,
        pin: true, variant: Math.floor(rnd() * 3), flip: rnd() < 0.5, reflect: true, shadow: false, anim: false, tint: ['#8a7a40', Math.round(rnd() * 2) * .03] });
    }
  }
  for(let i=islands.length-1;i>=0;i--)if(islands.slice(0,i).some(q=>Math.hypot(q.x-islands[i].x,q.y-islands[i].y)<10))islands.splice(i,1);
  const pq = P.platform[3], pa = W.proj(pq[0], pq[1], 0);
  walk.push({ obj: 'structure.proof-fleet-boardwalk', variant: W.pieces.length, x: Math.round(pa[0] * 10) / 10, y: Math.round(pa[1] * 10) / 10, s: 14 / pq[1], pin: true, layer: 'near', shadow: false, anim: false });
  const data = {
    v: 2, id: 'proof-fleet-pond',
    view: { lat: P.camera.lat, lon: P.camera.lon },
    camera: Object.assign({}, P.camera),
    ground: { relief: { x: [-300, 300], d: [d0, d1], nx, nd, h } },
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season',
    kits: ['temperate', 'water', 'birds', 'people'],
    surfaces: [
      { id: 'land', kind: 'wood', rest: true },
      { id: 'lineside', kind: 'wood', poly: lineside },
      { id: 'emb', kind: 'verge', path: P.rail, width: 21 },
      { id: 'railway', kind: 'rail', path: P.rail, width: 9, tracks: 2 },
      { id: 'reeds-n', kind: 'bank', poly: northReeds },
      { id: 'carr-e', kind: 'wood', poly: carrE },
      { id: 'reeds-c', kind: 'bank', poly: reedsC },
      { id: 'reeds-w', kind: 'bank', poly: reedsW },
      { id: 'reeds-e', kind: 'bank', poly: reedsE },
      { id: 'cut', kind: 'bank', poly: cut },
      { id: 'deck', kind: 'bridge', path: P.deck, width: P.deckW, over: 'water' },
      { id: 'platform', kind: 'bridge', poly: P.platform, over: 'water' },
    ],
    water: [{ id: 'pond', kind: 'lake', poly: water, edge: 'natural', ripple: 0.25, rings: false }],
    place: walk.concat(bank, islands, [
      { obj: 'bird.coot', at: [-13, 44] },
      { obj: 'bird.moorhen', at: [-3.4, 26] },
      { obj: 'bird.mallard', at: [9, 24] },
      { obj: 'bird.mallard', at: [9.8, 24.6], variant: 1 },
      { obj: 'person.birdwatcher', on: 'platform', d: 26, u: 0.6 },
      { obj: 'plant.proof-fleet-bough', x: -20, y: -12, s: 1.15, pin: true, layer: 'front', shadow: false, anim: false },
    ]),
    scatter: [
      // the reedbeds: tall Phragmites in big irregular stands, reedmace (bulrush) in clumps at the water's edge, sedge and
      // grass on the cut strip by the walk; the near-left stand stands as tall as the eye, a frame
      { obj: { 'plant.proof-fleet-reed': 8, 'plant.proof-fleet-rush': 1 }, on: ['reeds-w'], avoid: ['deck', 'platform', 'cut'], d: [5.5, 64], n: 150, dist: 'screen', cluster: { centres: 22, spread: 11 }, seed: 11, anim: false, k: [0.7, 1.2], tint: { col: '#8a7a40', k: [0, 0.06] } },
      { obj: { 'plant.proof-fleet-reed': 5, 'plant.proof-fleet-rush': 2 }, on: ['reeds-w'], avoid: ['deck', 'platform', 'cut'], d: [2.6, 5.5], n: 40, dist: 'screen', cluster: { centres: 3, spread: 30 }, seed: 21, anim: false, k: [0.85, 1.15] },
      { obj: { 'plant.proof-fleet-reed': 4, 'plant.proof-fleet-rush': 2, 'plant.grass-long': 1 }, on: ['reeds-e'], d: [2.6, 9], n: 100, dist: 'screen', cluster: { centres: 4, spread: 18 }, seed: 22, anim: false, k: [0.75, 1.15] },
      { obj: { 'plant.grass-long': 3, 'plant.grass': 2 }, on: ['cut'], d: [2.6, 15], n: 140, dist: 'screen', cluster: { centres: 6, spread: 14 }, seed: 23, anim: false, k: [0.6, 1.0] },
      { obj: { 'plant.proof-fleet-reed': 6, 'plant.proof-fleet-rush': 1 }, on: ['reeds-n'], d: [55, 112], n: 110, dist: 'screen', seed: 12, anim: 'strip', k: [0.8, 1.25], tint: { col: '#9a8a50', k: [0, 0.06] } },
      { obj: { 'plant.proof-fleet-rush': 2, 'plant.proof-fleet-reed': 3 }, on: ['reeds-c'], d: [30, 95], n: 70, dist: 'screen', seed: 24, anim: 'strip', k: [0.8, 1.1] },
      // trees: lineside groups and singles just behind the line (never on the embankment: the trains pass in front of them), the
      // woods of Fleet behind, a long blue treeline beyond
      { obj: { 'tree.pfp-bank-alder': 2, 'tree.pfp-bank-birch': 3, 'tree.pfp-bank-oak': 1, 'tree.pfp-bank-willow': 1 }, on: ['lineside'], d: [80, 150], n: 34, dist: 'ground', cluster: { centres: 7, spread: 8 }, gap: 'foot', seed: 13, anim: false, k: [0.65, 1.25] },
      { obj: { 'tree.pfp-bank-oak': 3, 'tree.pfp-bank-birch': 2, 'tree.pond-pine': 1, 'tree.pfp-bank-alder': 1, 'tree.pfp-pond-oak': 2 }, on: ['land'], d: [110, 330], n: 60, dist: 'ground', cluster: { centres: 11, spread: 20 }, gap: 'foot', seed: 17, anim: false, k: [0.75, 1.35] },
      { obj: { 'tree.far-pine': 2, 'tree.far-birch': 3, 'tree.pfp-distant-pine': 2 }, on: ['land'], d: [300, 900], n: 40, dist: 'ground', cluster: { centres: 12, spread: 80 }, seed: 14, anim: false },
      // the carr stands wholly in front of the line: its trees draw in the near layer, over a train passing behind them
      { obj: { 'tree.pfp-pond-alder': 3, 'tree.pfp-bank-willow': 1, 'tree.pfp-bank-birch': 1, 'tree.pfp-pond-oak': 1 }, on: ['carr-e'], d: [36, 96], n: 35, dist: 'ground', cluster: { centres: 5, spread: 9 }, seed: 15, anim: false, k: [0.7, 1.05], layer: 'near' },
      { obj: { 'water.lily': 3, 'water.fish-ring': 1 }, on: ['pond'], d: [8, 40], n: 30, dist: 'screen', cluster: { centres: 4, spread: 5 }, seed: 16, anim: false, species: 1 },
    ],
    actors: [
      // The commuter trains follow the two real tracks. Their lit windows travel with them after dusk.
      { obj:'rail.pfp-train', ground:[[-320,railD(-320)-2.25],[320,railD(320)-2.25]],speedM:12,loop:'loop',k:1,seed:35,offset:.17,layer:'mid' },
      { obj:'rail.pfp-train', ground:[[320,railD(320)+2.25],[-320,railD(-320)+2.25]],speedM:11,loop:'loop',k:1,seed:36,offset:.68,variant:1,layer:'mid' },
      { obj: 'bird.swan', ground: [[-18, 46], [-4, 43], [14, 47]], speedM: 0.3, loop: 'pingpong', k: 1 },
      { obj: 'bird.swan', ground: [[-15, 48], [-1, 45.5], [16, 49]], speedM: 0.3, loop: 'pingpong', k: 0.95, offset: 0.08 },
    ],
    flocks:[{obj:'bird.gull',n:4,area:[80,210,1450,370],speed:32,s:.42,seed:77,layer:'far'},{obj:'bird.small-flight',n:5,area:[80,430,1460,500],speed:68,s:.45,seed:78,layer:'mid'}],
    flows: [],
  };
  data.scatter.push({obj:{'plant.grass':3,'plant.grass-long':1},on:['reeds-w','reeds-e','cut'],avoid:['deck','platform'],d:[4.6,7.5],n:230,dist:'screen',k:[.25,.6],gap:0,variant:'random',flip:.5,anim:false,species:1,seed:91});
  for(const rule of data.scatter){rule.tint={col:'#8b8058',k:[0,.06]}; if(rule.gap==null)rule.gap=rule.d[0]>=300?30:rule.d[0]>=30?3.5:rule.d[0]>=5?.5:.18;}
  return data;
}
