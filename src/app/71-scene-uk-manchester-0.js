/* ============================================================
   COMPOSED SCENES uk / Manchester (docs/dev/SCENE_ENGINE.md 8.1, 8.2): one data row per scene,
   built by the 'mcr-city' archetype (70-scene-lib-area-manchester.js) and registered by
   72-anim-pack-uk-area-manchester.js. Each row: the item's place fields and caption, the
   archetype params (where it is, which way it looks, the landmarks, the ground, water and tram)
   and a small patch of its own touches. Four seasons by date and the live sky come from the
   engine (season 'auto', weather 'live').
   The first eight rows rebuild the Manchester items of the uk-north-west pack with their ids,
   place fields and captions unchanged; the rest are new.
   Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-manchester --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-manchester --contact
   Care: no text, no club colours or marks at the stadium, people are tiny anonymous walkers.
   ============================================================ */
const UK_MANCHESTER_SCENES = (function () {
  const P = (id, lat, lon, heading, landmarks, o) => Object.assign({ id, lat, lon, heading, landmarks }, o || {});
  // the evening views: a lower sun, the windows lit at real dusk
  const dusk = { at: 'dusk' };
  // a few hand touches shared by the squares: planters with seasonal bedding round the edge of the square
  const planters = (seed, y0) => ({ scatter: [{ obj: 'plant.planter', layer: 'near', seed, area: { rect: [-120, y0, 1720, y0 + 6] }, n: 8, minGap: 160, s: [0.7, 0.9], flip: 0.5, variant: 'random', anim: false }] });
  return [
    // ---- rebuilt: the uk-north-west Manchester items (ids, place fields and captions kept) ----
    { id: 'whitworth-hall', label: 'Whitworth Hall', kind: 'signature', colour: 'slate', tags: ['university', 'gothic', 'hall'], ukPlace: 'whitworth-hall', ukView: 'wide', reason: 'The Gothic hall across its forecourt',
      params: P('whitworth-hall', 53.4668, -2.2339, 250, ['landmark.whitworth-hall@780@400'], { ground: 'street', far: 'brick', features: ['buses', 'cyclists'], at: 'afternoon' }) },
    { id: 'whitworth-hall-2', label: 'Whitworth Hall', kind: 'landmark', colour: 'slate', tags: ['university', 'gothic', 'hall'], ukPlace: 'whitworth-hall', ukView: 'close-evening', reason: 'The traceried window and entrance at dusk',
      params: P('whitworth-hall-2', 53.4668, -2.2339, 240, ['landmark.whitworth-hall@820@560'], Object.assign({ ground: 'square', far: 'brick', horizon: 470 }, dusk)), patch: planters(31, 700) },
    { id: 'john-rylands', label: 'John Rylands Library', kind: 'landmark', colour: 'slate', tags: ['university', 'library', 'gothic'], ukPlace: 'john-rylands', ukView: 'wide', reason: 'The reading-room gable and Deansgate corner',
      params: P('john-rylands', 53.4806, -2.2486, 75, ['landmark.john-rylands@760@420', 'landmark.beetham-tower@1380@560@far@-110'], { ground: 'street', far: 'mixed', features: ['buses', 'cyclists'] }) },
    { id: 'john-rylands-2', label: 'John Rylands Library', kind: 'landmark', colour: 'slate', tags: ['university', 'library', 'gothic'], ukPlace: 'john-rylands', ukView: 'close-evening', reason: 'The traceried oriel bays at dusk',
      params: P('john-rylands-2', 53.4806, -2.2486, 80, ['landmark.john-rylands@800@560'], Object.assign({ ground: 'street', far: 'brick', horizon: 470, features: ['cyclists'] }, dusk)) },
    { id: 'whitworth-gallery', label: 'The Whitworth', kind: 'heritage', colour: 'slate', tags: ['university', 'gallery', 'park'], ukPlace: 'whitworth-gallery', ukView: 'wide', reason: 'Glass galleries facing the park trees',
      params: P('whitworth-gallery', 53.4602, -2.2295, 20, ['landmark.whitworth-gallery@820@300'], { ground: 'park', far: 'brick', at: 'morning', features: ['gulls'] }),
      patch: { scatter: [{ obj: 'tree.plane', layer: 'near', seed: 33, area: { rect: [-120, 690, 1720, 700] }, n: 5, minGap: 280, s: [0.42, 0.6], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [520, 600, 1120, 720] }] } }] } },
    { id: 'whitworth-gallery-2', label: 'The Whitworth', kind: 'heritage', colour: 'slate', tags: ['university', 'gallery', 'park'], ukPlace: 'whitworth-gallery', ukView: 'close-evening', reason: 'Evening light beneath the park canopy',
      params: P('whitworth-gallery-2', 53.4602, -2.2295, 30, ['landmark.whitworth-gallery@760@380'], Object.assign({ ground: 'park', far: 'brick', horizon: 480 }, dusk)),
      patch: { place: [{ obj: 'tree.plane', x: 1330, y: 760, s: 0.9, layer: 'near', seed: 34, flip: true, variant: 0 }, { obj: 'tree.plane', x: 250, y: 770, s: 0.8, layer: 'near', seed: 35, variant: 1 }] } },
    { id: 'castlefield', label: 'Castlefield Viaduct', kind: 'heritage', colour: 'slate', tags: ['canal', 'ironwork', 'garden'], ukPlace: 'castlefield', ukView: 'wide', reason: 'Iron latticework above the canal',
      params: P('castlefield', 53.4747, -2.2560, 200, ['landmark.castlefield-viaduct@800@300', 'landmark.beetham-tower@1240@520@far@-80'], { ground: 'towpath', water: 'canal', far: 'brick', features: ['brick-viaduct'], horizon: 470 }) },
    { id: 'castlefield-2', label: 'Castlefield Viaduct', kind: 'heritage', colour: 'slate', tags: ['canal', 'ironwork', 'garden'], ukPlace: 'castlefield', ukView: 'close-evening', reason: 'A closer view of the planted viaduct',
      params: P('castlefield-2', 53.4747, -2.2560, 190, ['landmark.castlefield-viaduct@760@430'], Object.assign({ ground: 'towpath', water: 'canal', far: 'brick', tram: 'none', horizon: 430 }, dusk)),
      // the towpath's hedge and reeds stand in for the shrubs here (the tile stays light)
      patch: { drop: { scatter: [10] }, scatter: [{ obj: 'plant.reed', layer: 'near', seed: 38, area: { rect: [-140, 700, 1740, 712] }, n: 18, minGap: 40, s: [0.4, 0.75], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 140, cut: 0.3 } }, anim: false, reflect: true }] } },
    // ---- new ----
    { id: 'town-hall', label: 'Manchester Town Hall', kind: 'landmark', colour: 'amber', tags: ['town hall', 'gothic', 'albert square'], ukPlace: 'town-hall', ukView: 'wide', reason: 'The clock tower over Albert Square',
      params: P('town-hall', 53.4794, -2.2446, 95, ['landmark.manchester-town-hall@800@560'], { ground: 'square', far: 'mixed', horizon: 480 }), patch: planters(36, 712) },
    { id: 'town-hall-2', label: 'Manchester Town Hall', kind: 'landmark', colour: 'amber', tags: ['town hall', 'gothic', 'albert square'], ukPlace: 'town-hall', ukView: 'close-evening', reason: 'The floodlit tower at dusk',
      params: P('town-hall-2', 53.4794, -2.2446, 100, ['landmark.manchester-town-hall@760@680'], Object.assign({ ground: 'square', far: 'mixed', horizon: 420 }, dusk)), patch: planters(37, 652) },
    { id: 'st-peters-square', label: "St Peter's Square", kind: 'landmark', colour: 'amber', tags: ['metrolink', 'tram', 'library'], ukPlace: 'st-peters-square', ukView: 'wide', reason: 'A tram past the library rotunda',
      params: P('st-peters-square', 53.4783, -2.2433, 330, ['landmark.mcr-central-library@640@300', 'landmark.manchester-town-hall@1180@440@far@-60'], { ground: 'square', tram: 'street', far: 'mixed' }) },
    { id: 'beetham-tower', label: 'Beetham Tower', kind: 'landmark', colour: 'blue', tags: ['deansgate', 'skyscraper', 'glass'], ukPlace: 'beetham-tower', ukView: 'wide', reason: 'The glass tower above Deansgate',
      params: P('beetham-tower', 53.4758, -2.2508, 170, ['landmark.beetham-tower@860@660'], { ground: 'street', far: 'glass', horizon: 520, features: ['buses', 'cyclists'], at: 'morning' }),
      patch: { place: [{ obj: 'tree.plane', x: 1180, y: 742, s: 0.5, layer: 'near', seed: 39, variant: 1 }] } },
    { id: 'deansgate-castlefield', label: 'Deansgate-Castlefield', kind: 'landmark', colour: 'blue', tags: ['metrolink', 'tram', 'viaduct'], ukPlace: 'deansgate-castlefield', ukView: 'wide', reason: 'A tram on the viaduct below the tower',
      params: P('deansgate-castlefield', 53.4744, -2.2507, 160, ['landmark.castlefield-viaduct@700@320', 'landmark.beetham-tower@1180@600@far@-70'], { ground: 'street', tram: 'viaduct', far: 'brick', horizon: 470, at: 'golden' }) },
    { id: 'northern-quarter', label: 'Northern Quarter', kind: 'heritage', colour: 'red', tags: ['warehouses', 'brick', 'streets'], ukPlace: 'northern-quarter', ukView: 'wide', reason: 'Brick warehouses and shopfronts',
      params: P('northern-quarter', 53.4838, -2.2353, 140, ['building.mcr-mill@420@330@mid@0@1', 'building.mcr-mill@1180@360@mid@0@1@flip', 'building.mcr-mill@800@260@far@-40@0'], { ground: 'street', far: 'brick', features: ['cyclists'], at: 'afternoon' }) },
    { id: 'ancoats', label: 'Ancoats mills', kind: 'heritage', colour: 'red', tags: ['mills', 'canal', 'industry'], ukPlace: 'ancoats', ukView: 'wide', reason: 'Cotton mills along the Rochdale Canal',
      params: P('ancoats', 53.4836, -2.2268, 60, ['building.mcr-mill@560@380@mid@0@0', 'building.mcr-mill@1120@340@mid@0@0@flip'], { ground: 'towpath', water: 'canal', far: 'brick', horizon: 470, at: 'morning' }) },
    { id: 'mediacity', label: 'MediaCity', kind: 'landmark', colour: 'blue', tags: ['salford', 'quays', 'footbridge'], ukPlace: 'mediacity', ukView: 'wide', reason: 'The white footbridge over the Quays',
      params: P('mediacity', 53.4722, -2.2985, 270, ['structure.mediacity-footbridge@800@230@mid@60'], { ground: 'quay', water: 'quays', far: 'glass', horizon: 470, features: ['gulls'] }) },
    { id: 'salford-quays', label: 'The Lowry, Salford Quays', kind: 'landmark', colour: 'blue', tags: ['salford', 'quays', 'theatre'], ukPlace: 'salford-quays', ukView: 'wide', reason: 'The steel-clad Lowry across the water',
      params: P('salford-quays', 53.4706, -2.2963, 300, ['landmark.salford-lowry@760@330'], { ground: 'quay', water: 'quays', far: 'glass', horizon: 470, features: ['gulls'], at: 'golden' }) },
    { id: 'match-day', label: 'Match day in Manchester', kind: 'tradition', colour: 'red', tags: ['football', 'stadium', 'match day'], ukPlace: 'match-day', ukView: 'wide', reason: 'Fans walking up to the stadium',
      params: P('match-day', 53.4631, -2.2913, 270, ['landmark.mcr-stadium@800@330'], { ground: 'square', far: 'mixed', features: ['fans', 'buses'], at: 'afternoon' }) },
  ];
})();
