/* ============================================================
   COMPOSED SCENES: Woking, Surrey (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Every view is ONE row of the woking-view archetype (71-scene-uk-woking-0arch.js);
   the season comes from the date ('auto'), the light from the live sky.
   Registered by 72-anim-pack-uk-area-woking.js (pack uk-area-woking), which adds the
   UK place fields (county surrey, ukTown Woking, ukPlace, ukView ...).
   The town-centre tripod is a generic tribute to H. G. Wells's novel; the mosque is
   drawn as architecture only. Data only (PURE).
   ============================================================ */
const WOKING_VIEWS = Object.freeze([
  // [id, label, ukPlace, ukView, reason, kind, tags, colour, mood, params]
  ['martian', 'The Martian tripod, Woking', 'martian', 'wide', 'The steel tripod in the town centre, honouring H. G. Wells', 'signature', ['sculpture', 'war of the worlds', 'hg wells', 'town centre'], 'slate', 'cheerful',
    { lat: 51.3190, lon: -0.5590, heading: 200, at: 'afternoon', horizon: 470, ground: 'plaza', landmarks: ['landmark.woking-martian@780@300'], skyline: '1260@230', lmy: 640, trees: 5, lampx: 1300, walkers: 6, features: ['sitter'] }],
  ['martian-2', 'The Martian tripod, Woking', 'martian', 'close-evening', 'The tripod under the lamps at dusk', 'landmark', ['sculpture', 'war of the worlds', 'hg wells', 'evening'], 'slate', 'dreamy',
    { lat: 51.3190, lon: -0.5590, heading: 180, at: 'dusk', horizon: 440, ground: 'plaza', landmarks: ['landmark.woking-martian@700@440@680'], skyline: '1300@260', lmy: 650, trees: 3, frame: 2, lampx: 1240, walkers: 4, features: ['roofs'] }],
  ['station', 'Woking station', 'station', 'wide', 'The 1930s station frontage across the forecourt', 'heritage', ['station', 'railway', 'art deco'], 'slate', 'calm',
    { lat: 51.3186, lon: -0.5570, heading: 180, at: 'morning', horizon: 480, ground: 'plaza', landmarks: ['landmark.woking-station@800@170'], skyline: '300@200', lmy: 620, trees: 6, lampx: 1320, walkers: 6, features: ['roofs'] }],
  ['station-2', 'Trains at Woking', 'station', 'platform', 'A main-line train running through past the platforms', 'heritage', ['station', 'railway', 'trains'], 'blue', 'cheerful',
    { lat: 51.3180, lon: -0.5570, heading: 0, at: 'afternoon', horizon: 470, ground: 'lawn', rail: 'east', landmarks: ['landmark.woking-station@820@110'], skyline: '1300@220', lmy: 600, trees: 6, frame: 1, lampx: 1300, walkers: 4 }],
  ['canal-lightbox', 'The Lightbox and the canal', 'lightbox', 'wide', 'The gallery beside the Basingstoke Canal', 'landmark', ['gallery', 'basingstoke canal', 'narrowboat'], 'teal', 'calm',
    { lat: 51.3214, lon: -0.5600, heading: 200, at: 'afternoon', horizon: 470, ground: 'lawn', water: 'canal', landmarks: ['landmark.woking-lightbox@900@170'], skyline: '1380@200', lmy: 600, trees: 6, lampx: 1300, moorx: 160, walkers: 5 }],
  ['canal', 'The Basingstoke Canal, Woking', 'basingstoke-canal', 'towpath', 'Narrowboats on the canal through the town', 'landscape', ['basingstoke canal', 'towpath', 'narrowboat'], 'green', 'calm',
    { lat: 51.3222, lon: -0.5520, heading: 230, at: 'morning', horizon: 480, ground: 'lawn', water: 'canal', boat: 'west', landmarks: [], skyline: '600@210', lmy: 600, trees: 7, frame: 3, lampx: 1340, moorx: 900, walkers: 5 }],
  ['canal-evening', 'Evening on the canal', 'basingstoke-canal', 'close-evening', 'The canal by the Lightbox in the evening', 'landscape', ['basingstoke canal', 'evening', 'gallery'], 'amber', 'dreamy',
    { lat: 51.3212, lon: -0.5612, heading: 120, at: 'golden', horizon: 460, ground: 'lawn', water: 'canal', landmarks: ['landmark.woking-lightbox@520@200'], skyline: '1200@250', lmy: 600, trees: 5, frame: 2, lampx: 1360, moorx: 1000, walkers: 4 }],
  ['mosque', 'The Shah Jahan Mosque, Woking', 'shah-jahan-mosque', 'wide', 'Britain\'s first purpose-built mosque, from its garden', 'heritage', ['mosque', 'heritage', 'mughal', 'garden'], 'green', 'calm',
    { lat: 51.3247, lon: -0.5807, heading: 330, at: 'afternoon', horizon: 470, ground: 'lawn', landmarks: ['landmark.shah-jahan-mosque@800@230'], lmy: 620, trees: 8, lampx: 1320, walkers: 3 }],
  ['mosque-2', 'The Shah Jahan Mosque, Woking', 'shah-jahan-mosque', 'close-evening', 'The dome and the arch in the golden hour', 'heritage', ['mosque', 'heritage', 'mughal', 'evening'], 'amber', 'dreamy',
    { lat: 51.3247, lon: -0.5807, heading: 320, at: 'golden', horizon: 430, ground: 'lawn', landmarks: ['landmark.shah-jahan-mosque@820@330@650'], lmy: 640, trees: 4, frame: 1, lampx: 1360, walkers: 3 }],
  ['park', 'Woking Park', 'woking-park', 'wide', 'The pond and lawns of the park, the towers beyond', 'landscape', ['park', 'pond', 'family'], 'green', 'cheerful',
    { lat: 51.3133, lon: -0.5545, heading: 0, at: 'morning', horizon: 480, ground: 'park', water: 'pond', landmarks: [], skyline: '1100@230', lmy: 610, trees: 10, lampx: 1340, poolx: 760, walkers: 5, features: ['sitter'] }],
  ['victoria-square', 'Victoria Square, Woking', 'victoria-square', 'wide', 'The new towers over the town square', 'landmark', ['towers', 'skyline', 'town centre'], 'slate', 'calm',
    { lat: 51.3192, lon: -0.5600, heading: 200, at: 'golden', horizon: 500, ground: 'plaza', landmarks: ['landmark.woking-towers@820@420@640'], lmy: 640, trees: 4, lampx: 1320, walkers: 6, features: ['roofs'] }],
  ['horsell-sandpits', 'The sandpits, Horsell Common', 'horsell-common', 'wide', 'Bare sand under the pines, where the novel\'s cylinder fell', 'landscape', ['horsell common', 'heath', 'sandpits', 'war of the worlds'], 'orange', 'calm',
    { lat: 51.3330, lon: -0.5650, heading: 0, at: 'afternoon', horizon: 470, ground: 'heath', landmarks: ['landmark.horsell-sandpits@820@200'], lmy: 620, trees: 7, poolx: 700, walkers: 4 }],
  ['horsell-common', 'Horsell Common at dawn', 'horsell-common', 'dawn', 'Heather and pines on the common in the early light', 'landscape', ['horsell common', 'heath', 'heather', 'dawn'], 'orange', 'dreamy',
    { lat: 51.3345, lon: -0.5620, heading: 90, at: 'dawn', horizon: 480, ground: 'heath', landmarks: ['landmark.horsell-sandpits@1120@200'], lmy: 600, trees: 10, frame: 1, poolx: 600, walkers: 3 }],
]);
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneFromArchetype !== 'function') return;
  for (const [id, label, place, view, reason, kind, tags, colour, mood, params] of WOKING_VIEWS) {
    const row = Object.assign({ id: 'woking-' + id }, params);
    sceneAdd('uk-area-woking', { id: 'woking-' + id, label, site: label + ' — ' + reason, tags: ['uk', 'woking', 'surrey'].concat(tags), mood, colour,
      ukPlace: place, ukView: view, viewReason: reason, ukKind: kind, liveSky: { lat: params.lat, lon: params.lon } },
    () => sceneFromArchetype('woking-view', row, {}));
  }
})();
