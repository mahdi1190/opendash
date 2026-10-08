/* ============================================================
   UPGRADE (live) of us-northeast/boston-charles (docs/dev/SCENE_ENGINE.md section 16)
   Scaffolded by `node tools/anim-pack.mjs scene upgrade us-northeast/boston-charles --box 680,220,1050,580 --slug hancock-tower`.
   LIVE: the app shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs).
   After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-northeast/boston-charles --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-northeast/boston-charles --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Charles River Basin from the Cambridge shore by the old dam, looking south-west upstream: the Longfellow Bridge
  // across the river with its four granite towers, and beyond it the Back Bay skyline over the trees of the Esplanade:
  // the glass slab of 200 Clarendon (the former Hancock tower) on the left and the Prudential Tower with its mast framed
  // between the bridge's towers. Sailboats from the river's boating club and a tour boat on the water, traffic on the
  // bridge, London planes along the Cambridge walk.
  const params = { id: 'boston', lat: 42.368, lon: -71.0705, heading: 200, at: 'afternoon', climate: 'temperate',
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    landmarks: ['landmark.hancock-tower@540@430', 'landmark.prudential-tower@830@460', 'landmark.longfellow-bridge@820@190@front@110'],
    water: 'river', horizon: 520, palette: { base: { water: ['#9cc0dc', '#4d7ca8', '#1f4468'] } } };
  // a boat on the river at y, scaled by its depth as the archetype scales them (0.38 at the far bank, 1.05 at the walk);
  // boats beyond the bridge go in the far layer, which draws behind it
  const boat = (obj, y, layer, speed, back, seed, offset, v) => ({ obj, layer, path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1,
    sByY: [[546, 0.38], [748, 1.05]], seed, offset, flip: back, variant: v });
  // a sailboat tacking to and fro on its stretch of the basin (so one is always in view)
  const sail = (y, layer, x0, x1, speed, seed, offset, v) => ({ obj: 'boat.dinghy', layer, path: [[x0, y], [x1, y]], speed, loop: 'pingpong', s: 1, sByY: [[546, 0.38], [748, 1.05]], seed, offset, variant: v });
  // traffic on the bridge's roadway, in the near layer so the balustrade never hides it
  const deck = 604, car = (i, back, v) => ({ obj: 'vehicle.car', layer: 'near', path: back ? [[1760, deck - 2], [-160, deck - 2]] : [[-160, deck], [1760, deck]], speed: 30 + i * 4, loop: 'loop', s: 0.3, seed: 60 + i, offset: (0.17 + i * 0.29) % 1, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them
    picks: { lamp: ['street.lamppost'], frame: ['tree.plane'] },
    mix: { tree: { 'tree.plane': 2, 'tree.pond-oak': 1 }, ground: { 'plant.grass': 1, 'plant.wildflowers': 1 }, shrub: { 'plant.shrub': 1 } },
    // the archetype's boats are replaced by lanes either side of the bridge; its far row, quay trees and beds by the scene's
    // own; its second frame tree (x 1690) stands outside the 16:9 view. The two towers are placed again without the
    // archetype's ground shadow, which would fall on the river
    drop: { scatter: [1, 2, 5, 6, 7], place: [4, 'landmark.hancock-tower', 'landmark.prudential-tower'], actors: [0, 1, 2, 3, 4] },
    place: [{ obj: 'landmark.hancock-tower', x: 540, y: 542, s: 1, layer: 'mid', seed: 11, reflect: true, shadow: false },
      { obj: 'landmark.prudential-tower', x: 830, y: 542, s: 0.91, layer: 'mid', seed: 12, reflect: true, shadow: false },
      { obj: 'tree.green-oak', x: 1610, y: 915, s: 1.05, layer: 'front', seed: 22, flip: true, variant: 1 }],
    scatter: [
      // Back Bay behind the Esplanade: lower towers and stone blocks, thinning out up the river to the right
      { obj: { 'building.tower-stone': 2, 'building.tower': 1 }, layer: 'far', seed: 4, area: { rect: [-150, 524, 1350, 529] }, n: 22, minGap: 34, s: [0.3, 0.6], maxH: 260, flip: 0.5, variant: [0, 2],
        tint: { col: '#8a9aac', k: [0.08, 0.08] }, mask: { noise: { scale: 140, cut: 0.3 }, avoid: [{ rect: [450, 300, 630, 560] }, { rect: [770, 300, 900, 560] }] }, shadow: false, anim: false },
      // the Esplanade's trees along the far bank (planes, oaks, willows by its lagoons), in autumn colour from October
      { obj: { 'tree.plane': 2, 'tree.pond-oak': 1, 'tree.pond-willow': 1, 'tree.far-broad': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 540, 1740, 546] }, n: 30, minGap: 40, s: [0.13, 0.24], flip: 0.5, variant: [0, 1],
        tint: { col: '#6a8a9a', k: [0.08, 0.08] }, mask: { avoid: [{ rect: [470, 470, 610, 548] }, { rect: [780, 470, 880, 548] }] }, anim: false, reflect: true },
      // the planting along the Cambridge walk
      { obj: { 'plant.grass': 1, 'plant.wildflowers': 1 }, layer: 'fore', seed: 7, area: { rect: [-150, 796, 1750, 856] }, n: 170, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, 856, 1750, 905] }, n: 125, minGap: 24, s: [0.9, 1.3], flip: 0.5, variant: [1, 1], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' },
      { obj: 'plant.shrub', layer: 'fore', seed: 19, area: { rect: [-150, 800, 1750, 840] }, n: 7, minGap: 120, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 260, cut: 0.35 } }, anim: false },
    ],
    actors: [sail(572, 'far', 160, 1380, 5, 30, 0.3, 1), sail(590, 'far', 520, 1560, 4, 31, 0.75, 0), boat('boat.water-taxi', 680, 'mid', 8, true, 32, 0.55, 1),
      sail(712, 'mid', 120, 1180, 6, 33, 0.1, 2), sail(738, 'mid', 640, 1520, 5, 34, 0.6, 0),
      car(0, false, 0), car(1, true, 1), car(2, false, 3), car(3, true, 2)],
  };
  animRegionSceneUpgrade('us', 'place:boston', {
    state: 'live',
    archetype: 'skyline-water',
    landmarks: ['landmark.hancock-tower', 'landmark.prudential-tower', 'landmark.longfellow-bridge'],
    scene: () => sceneFromArchetype('skyline-water', params, patch),
  });
})();
