/* ============================================================
   COMPOSED SCENES uk / Fleet and Farnborough: one data row per VIEW
   (docs/dev/SCENE_ENGINE.md section 8.2). Each row is built by its
   archetype in 70-scene-lib-area-fleet.js (fleet-water, fleet-green,
   fleet-town) and registered by 72-anim-pack-uk-area-fleet.js.

   Row fields: arch, place, n (the view number in the item id), view (ukView),
   orig (the season whose item id has no suffix; '' = one all-season item),
   the captions (rsp / rsu / rau / rwi per season, or reason for one item),
   then the archetype params (form, heading, horizon, at, landmark + lmx /
   lmy / lms / lmv / lmlayer, features ...).
   PURE: data only, nothing runs at load but the table definition.
   ============================================================ */
const UK_FLEET_ROWS = [
  // ---- Fleet Pond (the boardwalk variants v0..v3 are drawn for these four views) ----
  { arch: 'fleet-water', place: 'fleet-pond', n: 1, view: 'wide', orig: 'summer',
    rsp: 'Grebes courting off the viewing platform', rsu: 'Open water from a viewing platform', rau: 'Golden shore and geese over the open water', rwi: 'Winter wildfowl from the boardwalk platform',
    form: 'lake', lat: 51.2905, lon: -0.8235, heading: 300, horizon: 470, side: 'right', nearbank: 800, gap: [140, 600, 660, 905],
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 0, lmx: 400, lmy: 900, lms: 1, lmlayer: 'fore', walky: 676, walkx0: 300, walkx1: 480, features: 'train|lilies|walkers' },
  { arch: 'fleet-water', place: 'fleet-pond', n: 2, view: 'close', orig: 'summer',
    rsp: 'Yellow flag iris along the reedbed boardwalk', rsu: 'Reedbed and hovering dragonflies', rau: 'Reed plumes and grebes from the boardwalk', rwi: 'Frosted reeds and wildfowl on the pond',
    form: 'lake', lat: 51.2899, lon: -0.8221, heading: 250, horizon: 450, side: 'left', nearbank: 700, gap: [700, 560, 1300, 905],
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 1, lmx: 1000, lmy: 905, lms: 1, lmlayer: 'fore', walky: 720, walkx0: 860, walkx1: 1060, features: 'lilies|walkers|heron|train' },
  { arch: 'fleet-water', place: 'fleet-pond', n: 3, view: 'autumn', orig: 'autumn',
    rsp: 'Grebes courting off the woodland shore', rsu: 'The woodland shore and the reedbed boardwalk', rau: 'The autumn woodland shore', rwi: 'A frosty shore, wildfowl on the broad water',
    form: 'lake', lat: 51.2912, lon: -0.8262, heading: 40, horizon: 480, side: 'left', nearbank: 820,
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 2, lmx: 700, lmy: 700, lms: 0.9, lmlayer: 'near', features: 'pines|heron|train|houses' },
  { arch: 'fleet-water', place: 'fleet-pond', n: 4, view: 'evening', orig: 'summer', at: 'golden',
    rsp: 'Grebes displaying on the spring evening lake', rsu: 'Waterbirds across the evening lake', rau: 'Geese and reed plumes in the autumn dusk', rwi: 'A frosted shore and the winter sunset',
    form: 'lake', lat: 51.2903, lon: -0.8228, heading: 275, horizon: 480, side: 'right', nearbank: 820,
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 3, lmx: 1180, lmy: 760, lms: 0.9, lmlayer: 'near', features: 'train|lilies' },
  { arch: 'fleet-water', place: 'fleet-pond', n: 5, view: 'railway', orig: '',
    reason: 'Trains along the north shore beyond the reeds',
    form: 'lake', lat: 51.2885, lon: -0.8240, heading: 350, horizon: 490, side: 'right', nearbank: 760, trainx: 300,
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 2, lmx: 260, lmy: 790, lms: 0.8, lmlayer: 'fore', features: 'train|heron|pines' },
  { arch: 'fleet-water', place: 'fleet-pond', n: 6, view: 'sandy-bay', orig: '',
    reason: 'Looking out over the pond from the sandy east shore',
    form: 'lake', lat: 51.2893, lon: -0.8178, heading: 270, horizon: 480, side: 'left', nearbank: 780,
    landmark: 'landmark.fleet-pond-boardwalk', lmv: 3, lmx: 1150, lmy: 640, lms: 0.6, lmlayer: 'mid', features: 'lilies|walkers|pines|houses' },

  // ---- the Basingstoke Canal at Fleet ----
  { arch: 'fleet-water', place: 'fleet-canal', n: 1, view: 'wide', orig: 'summer',
    rsp: 'Cow parsley and hawthorn along the towpath', rsu: 'A narrowboat below the tree line', rau: 'Golden leaves on the cut at the bridge', rwi: 'Stove smoke over the winter canal',
    form: 'band', lat: 51.2768, lon: -0.8395, heading: 20, horizon: 480, wy0: 640, wy1: 730,
    landmark: 'landmark.fleet-canal-bridge', lmx: 1130, lms: 0.82, lmy: 712, features: 'moored|bench' },
  { arch: 'fleet-water', place: 'fleet-canal', n: 2, view: 'close', orig: 'summer',
    rsp: 'Hawthorn blossom as a narrowboat chugs past', rsu: 'Close alongside a passing narrowboat', rau: 'Falling leaves and wood smoke on the towpath', rwi: 'A narrowboat chugging past bare winter trees',
    form: 'band', lat: 51.2771, lon: -0.8372, heading: 340, horizon: 450, wy0: 640, wy1: 760, boatx: 1250,
    landmark: 'landmark.fleet-canal-bridge', lmx: 240, lms: 0.8, lmy: 735, features: 'moored|angler' },
  { arch: 'fleet-water', place: 'fleet-canal', n: 3, view: 'autumn', orig: 'autumn',
    rsp: 'Spring on the wooded towpath', rsu: 'A summer afternoon on the towpath', rau: 'Autumn on the wooded towpath', rwi: 'A frosty towpath by the still canal',
    form: 'channel', lat: 51.2760, lon: -0.8310, heading: 80, horizon: 480, side: 'left', vx: 820,
    landmark: 'landmark.fleet-canal-bridge', lmx: 820, lms: 0.9, lmy: 574, lmlayer: 'mid', features: 'moored' },
  { arch: 'fleet-water', place: 'fleet-canal', n: 4, view: 'evening', orig: 'summer', at: 'golden',
    rsp: 'Cygnets and cow parsley on a spring evening towpath', rsu: 'Lit cabin windows at dusk', rau: 'Woodsmoke and falling leaves by Pondtail Bridge', rwi: 'A frosty towpath and a chimney smoking at dusk',
    form: 'channel', lat: 51.2752, lon: -0.8262, heading: 265, horizon: 490, side: 'right', vx: 760,
    landmark: 'landmark.fleet-canal-bridge', lmx: 760, lms: 0.8, lmy: 575, lmlayer: 'mid', features: 'moored' },
  { arch: 'fleet-water', place: 'fleet-canal', n: 5, view: 'moorings', orig: '',
    reason: 'Moored narrowboats and a heron by the road bridge',
    form: 'band', lat: 51.2779, lon: -0.8450, heading: 200, horizon: 470, wy0: 650, wy1: 750, boatx: 420,
    landmark: 'landmark.fleet-canal-bridge', lmx: 1150, lms: 0.85, lmy: 730, features: 'moored|heron|angler' },
  { arch: 'fleet-water', place: 'fleet-canal', n: 6, view: 'morning', orig: '', at: 'morning',
    reason: 'Early light on the cut near Reading Road bridge',
    form: 'channel', lat: 51.2745, lon: -0.8418, heading: 110, horizon: 480, side: 'right', vx: 900,
    landmark: 'landmark.fleet-canal-bridge', lmx: 900, lms: 0.85, lmy: 576, lmlayer: 'mid', features: 'moored|angler' },

  // ---- Southwood Country Park and Southwood Woodland (Farnborough) ----
  { arch: 'fleet-green', place: 'southwood-country-park', n: 1, view: 'wide', orig: '', reason: 'Wildflowers across the open meadow',
    form: 'meadow', lat: 51.2858, lon: -0.7790, heading: 190, horizon: 470, pathx: 560, landmark: 'landmark.southwood-oak', lmx: 1150, lmy: 600, lms: 0.55, features: 'family|aircraft|bench', benchx: 380 },
  { arch: 'fleet-green', place: 'southwood-country-park', n: 2, view: 'close', orig: '', reason: 'Reed margins beside Cove Brook',
    form: 'wetland', lat: 51.2842, lon: -0.7752, heading: 120, horizon: 470, pathx: 300, brooky: 650, bwx: 1000, landmark: 'landmark.southwood-oak', lmx: 1360, lmy: 590, lms: 0.48, features: 'brook|boardwalk|jogger' },
  { arch: 'fleet-green', place: 'southwood-country-park', n: 3, view: 'autumn', orig: '', reason: 'An autumn seat along the meadow trail',
    form: 'meadow', lat: 51.2851, lon: -0.7808, heading: 230, horizon: 480, pathx: 820, landmark: 'landmark.southwood-oak', lmx: 420, lmy: 620, lms: 0.6, features: 'bench|family', benchx: 1100 },
  { arch: 'fleet-green', place: 'southwood-country-park', n: 4, view: 'evening', orig: '', reason: 'Evening light over the wetland', at: 'golden',
    form: 'wetland', lat: 51.2846, lon: -0.7770, heading: 270, horizon: 480, pathx: 1200, brooky: 640, landmark: 'landmark.southwood-oak', lmx: 520, lmy: 600, lms: 0.5, features: 'brook|aircraft' },
  { arch: 'fleet-green', place: 'southwood-woodland', n: 1, view: 'wide', orig: '', reason: 'Bluebells along the birch path',
    form: 'wood', lat: 51.2878, lon: -0.7745, heading: 160, horizon: 470, pathx: 640, landmark: 'landmark.southwood-oak', lmx: 1180, lmy: 620, lms: 0.6, features: 'bluebells|family' },
  { arch: 'fleet-green', place: 'southwood-woodland', n: 2, view: 'close', orig: '', reason: 'A fallen branch beneath a mature oak',
    form: 'wood', lat: 51.2882, lon: -0.7738, heading: 200, horizon: 460, pathx: 1000, landmark: 'landmark.southwood-oak', lmx: 520, lmy: 690, lms: 0.8, lmlayer: 'near', features: 'log|bluebells|aircraft', logx: 760 },
  { arch: 'fleet-green', place: 'southwood-woodland', n: 3, view: 'autumn', orig: '', reason: 'Golden leaves on the woodland floor',
    form: 'wood', lat: 51.2874, lon: -0.7752, heading: 240, horizon: 470, pathx: 900, landmark: 'landmark.southwood-oak', lmx: 400, lmy: 620, lms: 0.62, features: 'deer|log|aircraft', logx: 1250 },
  { arch: 'fleet-green', place: 'southwood-woodland', n: 4, view: 'evening', orig: '', reason: 'A quiet clearing in evening light', at: 'golden',
    form: 'wood', lat: 51.2880, lon: -0.7760, heading: 265, horizon: 480, pathx: 500, landmark: 'landmark.southwood-oak', lmx: 1000, lmy: 610, lms: 0.58, features: 'deer|jogger' },

  // ---- the airship hangar, Farnborough ----
  { arch: 'fleet-green', place: 'farnborough-airship-hangar', n: 1, view: 'wide', orig: '', reason: 'The restored frame across the lawn',
    form: 'lawn', lat: 51.2851, lon: -0.7695, heading: 30, horizon: 470, landmark: 'landmark.farnborough-airship-hangar', lmv: 0, lmx: 800, lmy: 620, lms: 1.9, features: 'family|aircraft|bench', benchx: 1300 },
  { arch: 'fleet-green', place: 'farnborough-airship-hangar', n: 2, view: 'close', orig: '', reason: 'Looking through the open steel portals',
    form: 'lawn', lat: 51.2852, lon: -0.7692, heading: 70, horizon: 450, landmark: 'landmark.farnborough-airship-hangar', lmv: 1, lmx: 820, lmy: 700, lms: 2.8, lmlayer: 'near', features: 'jogger|aircraft' },
  { arch: 'fleet-green', place: 'farnborough-airship-hangar', n: 3, view: 'autumn', orig: '', reason: 'Autumn trees frame the historic structure',
    form: 'lawn', lat: 51.2849, lon: -0.7700, heading: 350, horizon: 480, landmark: 'landmark.farnborough-airship-hangar', lmv: 0, lmx: 760, lmy: 610, lms: 1.5, features: 'family|bench', benchx: 400 },
  { arch: 'fleet-green', place: 'farnborough-airship-hangar', n: 4, view: 'evening', orig: '', reason: 'The braced frame against the evening sky', at: 'dusk',
    form: 'lawn', lat: 51.2853, lon: -0.7690, heading: 280, horizon: 490, landmark: 'landmark.farnborough-airship-hangar', lmv: 1, lmx: 840, lmy: 640, lms: 2.1, features: 'jogger|aircraft' },

  // ---- Fleet town: the station and All Saints' Church ----
  { arch: 'fleet-town', place: 'fleet-station', n: 1, view: 'wide', orig: '', reason: 'The station across the main line',
    form: 'station', lat: 51.2908, lon: -0.8417, heading: 330, horizon: 450, fronty: 600, landmark: 'landmark.fleet-station', lmv: 0, lmx: 820, lms: 1.7 },
  { arch: 'fleet-town', place: 'fleet-station', n: 2, view: 'evening', orig: '', reason: 'A London train calling in the evening', at: 'dusk',
    form: 'station', lat: 51.2906, lon: -0.8425, heading: 300, horizon: 460, fronty: 610, landmark: 'landmark.fleet-station', lmv: 1, lmx: 700, lms: 1.6 },
  { arch: 'fleet-town', place: 'fleet-all-saints', n: 1, view: 'wide', orig: '', reason: "All Saints' Church across its churchyard",
    form: 'church', lat: 51.2797, lon: -0.8355, heading: 20, horizon: 470, fronty: 640, landmark: 'landmark.all-saints-fleet', lmx: 800, lms: 0.9 },
  { arch: 'fleet-town', place: 'fleet-all-saints', n: 2, view: 'evening', orig: '', reason: "The church's lit windows from the road at dusk", at: 'dusk',
    form: 'street', lat: 51.2794, lon: -0.8350, heading: 340, horizon: 470, fronty: 630, landmark: 'landmark.all-saints-fleet', lmx: 700, lms: 0.85 },
];
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  const cols = [...new Set(UK_FLEET_ROWS.flatMap(r => Object.keys(r)))].concat(['id']);
  const rows = UK_FLEET_ROWS.map(r => cols.map(c => c === 'id' ? `${r.place}-${r.n}` : (r[c] === undefined ? null : r[c])));
  sceneTableDefine('uk-fleet', { cols, rows, lists: ['features'] });
})();
