/* ============================================================
   COMPOSED SCENES uk / Nottingham (docs/dev/SCENE_ENGINE.md 8.1, 8.2): one data row per scene,
   built by the 'notts-city' archetype (70-scene-lib-area-nottingham.js) and registered by
   72-anim-pack-uk-area-nottingham.js. Each row: the item's place fields and caption, the
   archetype params (where it is, which way it looks, the landmarks, the ground, river and tram)
   and a small patch of its own touches. Four seasons by date and the live sky come from the
   engine (season 'auto', weather 'live').
   Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-nottingham --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-nottingham --contact
   Care: no text (the inn's sign is a blank board), no club colours or marks, people are tiny
   anonymous walkers.
   ============================================================ */
const UK_NOTTINGHAM_SCENES = (function () {
  const P = (id, lat, lon, heading, landmarks, o) => Object.assign({ id, lat, lon, heading, landmarks }, o || {});
  const dusk = { at: 'dusk' };
  const planters = (seed, y0) => ({ scatter: [{ obj: 'plant.planter', layer: 'near', seed, area: { rect: [-120, y0, 1720, y0 + 6] }, n: 8, minGap: 160, s: [0.7, 0.9], flip: 0.5, variant: 'random', anim: false }] });
  const C = 'Nottingham', S = 'Sherwood Forest';
  return [
    // ---- the castle and the rock ----
    { id: 'castle-rock', town: C, label: 'Nottingham Castle', kind: 'signature', colour: 'red', tags: ['castle', 'castle rock', 'sandstone'], ukPlace: 'nottingham-castle', ukView: 'wide', reason: 'The ducal mansion on its sandstone rock',
      params: P('castle-rock', 52.9496, -1.1543, 20, ['landmark.nottingham-castle@800@430'], { ground: 'street', far: 'brick', features: ['buses', 'cyclists'], at: 'afternoon' }) },
    { id: 'castle-rock-2', town: C, label: 'Nottingham Castle', kind: 'landmark', colour: 'red', tags: ['castle', 'castle rock', 'floodlit'], ukPlace: 'nottingham-castle', ukView: 'close-evening', reason: 'The floodlit rock face at dusk',
      params: P('castle-rock-2', 52.9490, -1.1550, 30, ['landmark.nottingham-castle@760@520'], Object.assign({ ground: 'street', far: 'brick', horizon: 430 }, dusk)) },
    { id: 'trip-to-jerusalem', town: C, label: 'Ye Olde Trip to Jerusalem', kind: 'heritage', colour: 'amber', tags: ['inn', 'pub', 'castle rock', 'history'], ukPlace: 'trip-to-jerusalem', ukView: 'wide', reason: 'The old inn cut into the foot of the rock',
      params: P('trip-to-jerusalem', 52.9497, -1.1527, 330, ['landmark.trip-to-jerusalem@800@360', 'landmark.nottingham-castle@1300@300@far@-40'], { ground: 'square', far: 'brick', horizon: 470 }), patch: planters(31, 680) },
    { id: 'trip-to-jerusalem-2', town: C, label: 'Ye Olde Trip to Jerusalem', kind: 'heritage', colour: 'amber', tags: ['inn', 'pub', 'castle rock', 'evening'], ukPlace: 'trip-to-jerusalem', ukView: 'close-evening', reason: 'Warm windows under the rock at dusk',
      params: P('trip-to-jerusalem-2', 52.9497, -1.1527, 335, ['landmark.trip-to-jerusalem@780@470'], Object.assign({ ground: 'square', far: 'brick', horizon: 430 }, dusk)) },
    // ---- the Old Market Square and the trams ----
    { id: 'council-house', town: C, label: 'The Council House', kind: 'signature', colour: 'amber', tags: ['council house', 'old market square', 'dome', 'lions'], ukPlace: 'council-house', ukView: 'wide', reason: 'The dome over the Old Market Square',
      params: P('council-house', 52.9533, -1.1497, 70, ['landmark.nottingham-council-house@800@440', 'landmark.market-square-fountains@1300@60@near@40'], { ground: 'square', far: 'mixed', horizon: 470, tram: 'street' }) },
    { id: 'old-market-square', town: C, label: 'Old Market Square', kind: 'landmark', colour: 'blue', tags: ['old market square', 'fountains', 'evening'], ukPlace: 'old-market-square', ukView: 'close-evening', reason: 'The fountains and the lit dome at dusk',
      params: P('old-market-square', 52.9528, -1.1508, 60, ['landmark.nottingham-council-house@860@380', 'landmark.market-square-fountains@700@90@near@60'], Object.assign({ ground: 'square', far: 'mixed', horizon: 450 }, dusk)) },
    { id: 'tram-station-street', town: C, label: 'Nottingham trams', kind: 'landmark', colour: 'green', tags: ['tram', 'lace market', 'street'], ukPlace: 'nottingham-tram', ukView: 'wide', reason: 'A tram past the brick warehouses',
      params: P('tram-station-street', 52.9480, -1.1450, 90, ['building.lace-market-warehouse@420@300@mid@0@0', 'building.lace-market-warehouse@1180@280@mid@0@1@flip'], { ground: 'street', tram: 'street', far: 'brick', at: 'morning', features: ['cyclists'] }) },
    // ---- the Lace Market and Hockley ----
    { id: 'lace-market', town: C, label: 'The Lace Market', kind: 'heritage', colour: 'red', tags: ['lace market', 'warehouses', 'victorian'], ukPlace: 'lace-market', ukView: 'wide', reason: 'Tall lace warehouses on a quiet street',
      params: P('lace-market', 52.9518, -1.1428, 160, ['building.lace-market-warehouse@500@360@mid@0@0', 'building.lace-market-warehouse@1100@340@mid@0@0@flip', 'building.lace-market-warehouse@800@260@far@-30@1'], { ground: 'street', far: 'brick', features: ['cyclists'], at: 'afternoon' }) },
    { id: 'hockley', town: C, label: 'Hockley', kind: 'heritage', colour: 'red', tags: ['hockley', 'cafes', 'evening', 'brick'], ukPlace: 'hockley', ukView: 'close-evening', reason: 'Lit shopfronts in Hockley at dusk',
      params: P('hockley', 52.9530, -1.1424, 120, ['building.lace-market-warehouse@440@330@mid@0@1', 'building.lace-market-warehouse@1160@320@mid@0@1@flip'], Object.assign({ ground: 'street', far: 'brick', horizon: 470 }, dusk)),
      patch: { scatter: [{ obj: 'building.shopfront', layer: 'mid', seed: 41, area: { rect: [640, 618, 960, 622] }, n: 2, minGap: 150, s: [0.5, 0.6], flip: 0.5, variant: 'random', anim: false }] } },
    // ---- Wollaton Hall and its deer park ----
    { id: 'wollaton-hall', town: C, label: 'Wollaton Hall', kind: 'signature', colour: 'green', tags: ['wollaton', 'hall', 'elizabethan', 'deer park'], ukPlace: 'wollaton-hall', ukView: 'wide', reason: 'The Elizabethan hall above its deer park',
      params: P('wollaton-hall', 52.9480, -1.2090, 0, ['landmark.wollaton-hall@800@360'], { ground: 'park', far: 'trees', features: ['deer'], at: 'afternoon' }) },
    { id: 'wollaton-deer-park', town: C, label: 'Wollaton deer park', kind: 'landmark', colour: 'green', tags: ['wollaton', 'deer', 'park', 'morning'], ukPlace: 'wollaton-park', ukView: 'wide-morning', reason: 'Deer grazing below the hall in the early light',
      params: P('wollaton-deer-park', 52.9445, -1.2080, 350, ['landmark.wollaton-hall@1150@220@far@-20'], { ground: 'park', far: 'trees', features: ['deer'], at: 'morning', horizon: 520 }) },
    // ---- the Trent ----
    { id: 'trent-bridge', town: C, label: 'Trent Bridge', kind: 'landmark', colour: 'blue', tags: ['trent', 'river', 'bridge', 'rowing'], ukPlace: 'trent-bridge', ukView: 'wide', reason: 'Iron arches over the Trent, rowers below',
      params: P('trent-bridge', 52.9385, -1.1365, 100, ['landmark.trent-bridge@800@180@mid@110'], { ground: 'riverside', water: 'river', far: 'mixed', features: ['rowers', 'gulls'], at: 'golden' }) },
    { id: 'victoria-embankment', town: C, label: 'Victoria Embankment', kind: 'landmark', colour: 'blue', tags: ['trent', 'embankment', 'river', 'trees'], ukPlace: 'victoria-embankment', ukView: 'wide-morning', reason: 'The riverside walk along the Trent',
      params: P('victoria-embankment', 52.9360, -1.1420, 60, ['landmark.trent-bridge@1250@110@mid@60'], { ground: 'riverside', water: 'river', far: 'trees', features: ['rowers', 'cyclists'], at: 'morning' }) },
    // ---- Sherwood ----
    { id: 'major-oak', town: S, label: 'The Major Oak', kind: 'signature', colour: 'green', tags: ['sherwood', 'oak', 'forest', 'robin hood'], ukPlace: 'major-oak', ukView: 'wide', reason: 'The great oak of Sherwood on its props',
      params: P('major-oak', 53.2049, -1.0722, 180, ['landmark.major-oak@800@420'], { ground: 'forest', far: 'trees', at: 'afternoon' }) },
    { id: 'sherwood-forest', town: S, label: 'Sherwood Forest', kind: 'landmark', colour: 'green', tags: ['sherwood', 'forest', 'oaks', 'bracken'], ukPlace: 'sherwood-forest', ukView: 'wide-morning', reason: 'Old oaks and bracken on a forest ride',
      params: P('sherwood-forest', 53.2030, -1.0780, 250, ['tree.ancient-oak@420@330', 'tree.ancient-oak@1250@300@mid@0@1@flip'], { ground: 'forest', far: 'trees', at: 'morning', features: ['bracken'] }) },
    // ---- the Goose Fair ----
    { id: 'goose-fair', town: C, label: 'Goose Fair', kind: 'tradition', colour: 'red', tags: ['goose fair', 'fair', 'october', 'rides'], ukPlace: 'goose-fair', ukView: 'close-evening', reason: 'Bulbs, rides and the big wheel at dusk',
      params: P('goose-fair', 52.9720, -1.1670, 300, ['structure.goose-fair-wheel@1240@360', 'landmark.goose-fair-rides@640@290'], Object.assign({ ground: 'fair', far: 'mixed', features: ['crowd'], horizon: 470 }, dusk)) },
    { id: 'goose-fair-2', town: C, label: 'Goose Fair', kind: 'tradition', colour: 'red', tags: ['goose fair', 'fair', 'october', 'rides'], ukPlace: 'goose-fair', ukView: 'wide', reason: 'The fair on the Forest Recreation Ground',
      params: P('goose-fair-2', 52.9720, -1.1670, 290, ['structure.goose-fair-wheel@380@320', 'landmark.goose-fair-rides@1060@260@mid@0@0@flip'], { ground: 'fair', far: 'mixed', features: ['crowd'], at: 'afternoon' }) },
  ];
})();
