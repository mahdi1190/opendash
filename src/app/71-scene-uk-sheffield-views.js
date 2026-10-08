/* ============================================================
   COMPOSED SCENES: Sheffield (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Every view is ONE row of the sheffield-view archetype (71-scene-uk-sheffield-0arch.js)
   plus a small patch; the season comes from the date ('auto'), the light from the live sky.
   Registered by 72-anim-pack-uk-area-sheffield.js (pack uk-area-sheffield), which adds the
   UK place fields (county south-yorkshire, ukPlace, ukView ...).
   The first eight rows rebuild the hand-drawn Sheffield studies of the old uk-north-west pack
   with the same ids, places, views and captions; the rest are new.
     https://www.sheffield.ac.uk/  (the Arts Tower, the Diamond)
     https://www.sheffield.gov.uk/parks-sport-recreation/public-spaces/winter-garden
     https://sheffieldmuseums.org.uk/visit-us/kelham-island-museum/
     https://www.sbg.org.uk/  (the Botanical Gardens pavilions)
   Data only (PURE).
   ============================================================ */
const SHEFFIELD_VIEWS = Object.freeze([
  // [id, label, ukPlace, ukView, reason, kind, tags, colour, mood, params, patch]
  ['diamond', 'The Diamond', 'diamond', 'wide', 'The engineering building across its forecourt', 'signature', ['university', 'engineering', 'lattice'], 'slate', 'calm',
    { lat: 53.3818, lon: -1.4816, heading: 20, at: 'afternoon', horizon: 470, ground: 'plaza', landmarks: ['landmark.sheffield-diamond@800@210'], lmy: 610, hills: 0.8, trees: 7, lampx: 1240, features: ['pigeons'] }],
  ['diamond-2', 'The Diamond', 'diamond', 'close-evening', 'A closer study of the diamond lattice', 'landmark', ['university', 'engineering', 'lattice'], 'slate', 'dreamy',
    { lat: 53.3818, lon: -1.4816, heading: 30, at: 'dusk', horizon: 430, ground: 'plaza', landmarks: ['landmark.sheffield-diamond@760@330'], lmy: 640, hills: 0.6, trees: 4, frame: 2, lampx: 1300, walkers: 4 }],
  ['arts-tower', 'Arts Tower', 'arts-tower', 'wide', 'The slender tower and lower library wing', 'landmark', ['university', 'modernism', 'tower'], 'slate', 'calm',
    { lat: 53.3816, lon: -1.4884, heading: 120, at: 'afternoon', horizon: 500, ground: 'lawn', setting: 'mixed', landmarks: ['landmark.sheffield-arts-tower@900@380'], lmy: 620, hills: 1, trees: 8, lampx: 1300, walkers: 5 }],
  ['arts-tower-2', 'Arts Tower', 'arts-tower', 'close-evening', 'Evening light through the curtain wall', 'landmark', ['university', 'modernism', 'tower'], 'slate', 'dreamy',
    { lat: 53.3816, lon: -1.4884, heading: 140, at: 'dusk', horizon: 460, ground: 'street', tram: 'east', landmarks: ['landmark.sheffield-arts-tower@820@520'], lmy: 640, hills: 0.7, trees: 5, frame: 1, lampx: 1240, walkers: 4 }],
  ['winter-garden', 'Sheffield Winter Garden', 'winter-garden', 'wide', 'The timber arches across the city square', 'landmark', ['glasshouse', 'timber', 'plants'], 'slate', 'calm',
    { lat: 53.3802, lon: -1.4668, heading: 60, at: 'afternoon', horizon: 480, ground: 'plaza', water: 'fountain', landmarks: ['landmark.sheffield-winter-garden@800@270'], lmy: 620, hills: 0.7, trees: 6, lampx: 1320, poolx: 800 }],
  ['winter-garden-2', 'Sheffield Winter Garden', 'winter-garden', 'close-evening', 'Closer to the planted glasshouse ribs', 'landmark', ['glasshouse', 'timber', 'plants'], 'slate', 'dreamy',
    { lat: 53.3802, lon: -1.4668, heading: 70, at: 'dusk', horizon: 420, ground: 'plaza', landmarks: ['landmark.sheffield-winter-garden@760@400'], lmy: 650, hills: 0.4, trees: 3, frame: 1, lampx: 1360, walkers: 4 }],
  ['kelham', 'Kelham Island Museum', 'kelham', 'wide', 'The museum and its industrial silhouettes', 'heritage', ['industry', 'steel', 'museum'], 'slate', 'calm',
    { lat: 53.3895, lon: -1.4720, heading: 200, at: 'afternoon', horizon: 480, ground: 'lawn', setting: 'mixed', water: 'river', landmarks: ['landmark.sheffield-kelham@760@300'], lmy: 600, hills: 1, trees: 6, lampx: 1300, features: ['works'], worksx: 1340 }],
  ['kelham-2', 'Kelham Island Museum', 'kelham', 'close-evening', 'The Bessemer converter in the foreground', 'heritage', ['industry', 'steel', 'museum'], 'slate', 'dreamy',
    { lat: 53.3895, lon: -1.4720, heading: 210, at: 'golden', horizon: 440, ground: 'plaza', landmarks: ['landmark.sheffield-kelham@1000@440'], lmy: 650, hills: 0.6, trees: 3, frame: 2, lampx: 300, walkers: 4, features: ['works'], worksx: 180 }],
]);
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneFromArchetype !== 'function') return;
  for (const [id, label, place, view, reason, kind, tags, colour, mood, params, patch] of SHEFFIELD_VIEWS) {
    const row = Object.assign({ id: 'sheffield-' + id }, params);
    sceneAdd('uk-area-sheffield', { id, label, site: label + ' — ' + reason, tags: ['uk', 'sheffield', 'south yorkshire'].concat(tags), mood, colour,
      ukPlace: place, ukView: view, viewReason: reason, ukKind: kind, liveSky: { lat: params.lat, lon: params.lon } },
      () => sceneFromArchetype('sheffield-view', row, patch || {}));
  }
})();
