/* ============================================================
   COMPOSED SCENES uk / Farnborough: one data row per VIEW
   (docs/dev/SCENE_ENGINE.md section 8.2). Each row is built by its
   archetype in 70-scene-lib-area-farnborough.js (farnborough-airfield,
   farnborough-place) and registered by 72-anim-pack-uk-area-farnborough.js.

   Row fields: arch, place, n (the view number in the item id), view (ukView),
   orig (the season whose item id has no suffix; '' = one all-season item),
   the captions (rsp / rsu / rau / rwi per season, or reason for one item),
   then the archetype params (form, heading, horizon, at, landmark + lmx /
   lmy / lms / lmv / lmlayer, features ...). Features for the sky: display
   (a smoke-trailing display pair), flypast (an airliner), bizjet.
   PURE: data only, nothing runs at load but the table definition.
   ============================================================ */
const UK_FARNBOROUGH_ROWS = [
  // ---- the Farnborough International Airshow ----
  { arch: 'farnborough-airfield', place: 'farnborough-airshow', n: 1, view: 'wide', orig: '', reason: 'A display pair trailing smoke over the crowd line',
    form: 'showline', lat: 51.2790, lon: -0.7640, heading: 220, horizon: 470, landmark: 'landmark.farnborough-airport', lmx: 1150, lms: 0.7, features: 'display|flypast' },
  { arch: 'farnborough-airfield', place: 'farnborough-airshow', n: 2, view: 'evening', orig: '', reason: 'The last display of the day over the chalets', at: 'golden',
    form: 'showline', lat: 51.2786, lon: -0.7600, heading: 250, horizon: 480, chx: 160, landmark: 'landmark.farnborough-airport', lmx: 360, lms: 0.55, features: 'display' },
  { arch: 'farnborough-airfield', place: 'farnborough-airshow', n: 3, view: 'static', orig: '', reason: 'Visitors among the aircraft of the static park',
    form: 'static', lat: 51.2772, lon: -0.7700, heading: 190, horizon: 460, landmark: 'landmark.farnborough-airport', lmx: 300, lms: 0.6, features: 'flypast|bizjet' },
  { arch: 'farnborough-airfield', place: 'farnborough-airshow', n: 4, view: 'close', orig: '', reason: 'An airliner sweeping past the showground',
    form: 'showline', lat: 51.2795, lon: -0.7660, heading: 200, horizon: 500, chx: -220, landmark: 'landmark.farnborough-airport', lmx: 820, lms: 0.5, features: 'flypast|display' },

  // ---- the business park and the airport ----
  { arch: 'farnborough-airfield', place: 'farnborough-business-park', n: 1, view: 'wide', orig: '', reason: 'Offices round the lake, a jet climbing out beyond',
    form: 'business', lat: 51.2800, lon: -0.7730, heading: 160, horizon: 460, landmark: 'landmark.farnborough-airport', lmx: 900, lms: 0.6, features: 'bizjet' },
  { arch: 'farnborough-airfield', place: 'farnborough-business-park', n: 2, view: 'evening', orig: '', reason: 'Lit offices and the control tower at dusk', at: 'dusk',
    form: 'business', lat: 51.2806, lon: -0.7745, heading: 140, horizon: 470, landmark: 'landmark.farnborough-airport', lmx: 400, lms: 0.7, features: 'bizjet|flypast' },

  // ---- Queensmead ----
  { arch: 'farnborough-airfield', place: 'farnborough-queensmead', n: 1, view: 'wide', orig: '', reason: 'Shoppers along the pedestrian street',
    form: 'precinct', lat: 51.2925, lon: -0.7555, heading: 20, horizon: 450, features: 'bizjet' },
  { arch: 'farnborough-airfield', place: 'farnborough-queensmead', n: 2, view: 'evening', orig: '', reason: 'Lit shopfronts as the evening comes on', at: 'dusk',
    form: 'precinct', lat: 51.2921, lon: -0.7552, heading: 200, horizon: 470, features: 'bizjet' },

  // ---- St Michael's Abbey ----
  { arch: 'farnborough-place', place: 'st-michaels-abbey', n: 1, view: 'wide', orig: '', reason: 'The abbey church on its wooded hill',
    form: 'church', lat: 51.2960, lon: -0.7512, heading: 80, horizon: 470, fronty: 640, landmark: 'landmark.st-michaels-abbey', lmx: 820, lms: 0.8, features: 'bizjet' },
  { arch: 'farnborough-place', place: 'st-michaels-abbey', n: 2, view: 'close', orig: '', reason: 'The domed east end above the lawn',
    form: 'lawn', lat: 51.2964, lon: -0.7500, heading: 300, horizon: 460, landmark: 'landmark.st-michaels-abbey', lmx: 760, lmy: 640, lms: 1.15, features: 'bench|family', benchx: 1300 },
  { arch: 'farnborough-place', place: 'st-michaels-abbey', n: 3, view: 'evening', orig: '', reason: 'Lit windows of the abbey church at dusk', at: 'dusk',
    form: 'lawn', lat: 51.2958, lon: -0.7518, heading: 60, horizon: 480, landmark: 'landmark.st-michaels-abbey', lmx: 900, lmy: 620, lms: 0.95, features: 'jogger' },

  // ---- the FAST museum ----
  { arch: 'farnborough-place', place: 'farnborough-fast-museum', n: 1, view: 'wide', orig: '', reason: 'The museum and the jet on its lawn',
    form: 'lawn', lat: 51.2830, lon: -0.7668, heading: 250, horizon: 460, landmark: 'landmark.fast-museum', lmx: 820, lmy: 650, lms: 1.4, features: 'family|bizjet|bench', benchx: 260 },
  { arch: 'farnborough-place', place: 'farnborough-fast-museum', n: 2, view: 'evening', orig: '', reason: 'The museum front from the road in the evening', at: 'golden',
    form: 'street', lat: 51.2826, lon: -0.7660, heading: 280, horizon: 470, fronty: 630, landmark: 'landmark.fast-museum', lmx: 760, lms: 1.0, features: 'display' },

  // ---- the stations ----
  { arch: 'farnborough-place', place: 'farnborough-main-station', n: 1, view: 'wide', orig: '', reason: 'The station house across the main line',
    form: 'station', lat: 51.2966, lon: -0.7559, heading: 300, horizon: 450, fronty: 600, landmark: 'landmark.farnborough-main-station', lmx: 760, lms: 1.5, features: 'bizjet' },
  { arch: 'farnborough-place', place: 'farnborough-main-station', n: 2, view: 'evening', orig: '', reason: 'A London train calling under the canopy', at: 'dusk',
    form: 'station', lat: 51.2962, lon: -0.7562, heading: 120, horizon: 460, fronty: 610, landmark: 'landmark.farnborough-main-station', lmx: 900, lms: 1.4 },
  { arch: 'farnborough-place', place: 'farnborough-north-station', n: 1, view: 'wide', orig: '', reason: 'The little station and its level crossing',
    form: 'station', lat: 51.3020, lon: -0.7430, heading: 20, horizon: 450, fronty: 600, landmark: 'landmark.farnborough-north-station', lmx: 820, lms: 1.5, features: 'bizjet' },

  // ---- the Basingstoke Canal along the airfield ----
  { arch: 'farnborough-place', place: 'farnborough-canal', n: 1, view: 'wide', orig: 'summer',
    rsp: 'Cow parsley on the towpath below the airfield', rsu: 'A narrowboat on the cut as a jet climbs out', rau: 'Golden leaves on the cut by the airfield', rwi: 'Stove smoke on the winter canal',
    form: 'band', lat: 51.2690, lon: -0.7790, heading: 30, horizon: 480, wy0: 640, wy1: 730,
    landmark: 'landmark.fleet-canal-bridge', lmx: 1150, lms: 0.8, lmy: 712, features: 'moored|bench|bizjet' },
  { arch: 'farnborough-place', place: 'farnborough-canal', n: 2, view: 'evening', orig: '', reason: 'A quiet towpath and a jet overhead at dusk', at: 'golden',
    form: 'channel', lat: 51.2700, lon: -0.7760, heading: 260, horizon: 490, side: 'right', vx: 760,
    landmark: 'landmark.fleet-canal-bridge', lmx: 760, lms: 0.8, lmy: 575, lmlayer: 'mid', features: 'moored|bizjet' },
];
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  const cols = [...new Set(UK_FARNBOROUGH_ROWS.flatMap(r => Object.keys(r)))].concat(['id']);
  const rows = UK_FARNBOROUGH_ROWS.map(r => cols.map(c => c === 'id' ? `${r.place}-${r.n}` : (r[c] === undefined ? null : r[c])));
  sceneTableDefine('uk-farnborough', { cols, rows, lists: ['features'] });
})();
