/* ============================================================
   COMPOSED SCENES: the Winchester area (Winchester, Chawton, the Test and the
   Itchen, the Watercress Line, the South Downs). docs/dev/SCENE_ENGINE.md 3 and 8.
   One data row per scene, built by the chalk-country archetype
   (71-scene-uk-winchester-0arch.js). Data only (PURE): the season comes from the
   date ('auto'), the light from the live sky. Registered by
   72-anim-pack-uk-area-winchester.js. The first six rows rebuild the older
   hand-drawn items (same ids and captions); the rest are new views.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneTableDefine !== 'function') return;
  const PACK = 'uk-area-winchester';
  // id (without the county), kind, lat, lon, heading, at, landmark, lx, lh, horizon, features, label, site, ukKind, colour, mood, tags
  const COLS = ['id', 'kind', 'lat', 'lon', 'heading', 'at', 'landmark', 'lx', 'lh', 'horizon', 'features', 'label', 'site', 'ukKind', 'colour', 'mood', 'tags'];
  const ROWS = [
    // ---- rebuilt (the older hand-drawn items: ids and captions kept)
    ['winchester-cathedral', 'green', 51.0606, -1.3131, 135, 'afternoon', 'landmark.winchester-cathedral', 800, 300, 470, 'walkers|lamps', 'Winchester Cathedral', '', 'landmark', 'slate', 'calm', 'winchester|cathedral|norman tower|nave'],
    ['watercress-line', 'rail', 51.0905, -1.0868, 200, 'morning', 'landmark.ropley-station', 1180, 180, 440, 'sheep|gate', 'Steam on the Watercress Line', 'The Watercress Line, Alresford', 'heritage', 'green', 'cheerful', 'watercress line|steam train|alresford|railway'],
    ['chalk-stream-trout', 'river', 51.1155, -1.4905, 200, 'noon', 'landmark.test-fishing-hut', 1260, 190, 470, 'trout|angler|heron|cattle', 'A trout in a chalk stream', 'A chalk stream, the River Test', 'landscape', 'teal', 'calm', 'river test|river itchen|chalk stream|trout'],
    ['south-downs-dawn', 'downs', 50.9770, -0.9800, 200, 'dawn', 'landmark.butser-hill', 760, 200, 430, 'sheep|gate|farm', 'The South Downs at dawn', 'The South Downs at dawn, Butser Hill', 'landscape', 'orange', 'dreamy', 'south downs|dawn|chalk hills|national park'],
    ['chawton', 'green', 51.1330, -0.9880, 225, 'afternoon', 'landmark.jane-austens-house', 760, 210, 480, 'cottages|hedges|wildflowers', 'Jane Austen\'s House, Chawton', 'Jane Austen\'s House, Chawton', 'heritage', 'red', 'cosy', 'chawton|jane austen|writers house|museum'],
    ['watercress-beds', 'cress', 51.0890, -1.1600, 250, 'morning', 'landmark.alresford-fulling-mill', 1300, 190, 470, 'cottages', 'Watercress beds near Alresford', 'Watercress beds, Alresford', 'food', 'green', 'calm', 'watercress|alresford|chalk springs|farming'],
    // ---- new views
    ['winchester-city-mill', 'river', 51.0618, -1.3065, 330, 'golden', 'landmark.winchester-city-mill', 800, 190, 480, 'swans|walkers|cottages', 'Winchester City Mill on the Itchen', 'The City Mill and the Itchen, Winchester', 'heritage', 'amber', 'calm', 'winchester|city mill|river itchen|chalk stream'],
    ['st-catherines-hill', 'river', 51.0500, -1.3150, 150, 'morning', 'landmark.st-catherines-hill', 860, 190, 470, 'cattle|heron|walkers', 'St Catherine\'s Hill above the Itchen', 'St Catherine\'s Hill from the Itchen water meadows', 'landscape', 'green', 'calm', 'winchester|st catherines hill|hillfort|river itchen'],
    ['itchen-water-meadows', 'river', 51.0520, -1.3130, 0, 'golden', 'landmark.winchester-cathedral', 620, 190, 470, 'cattle|walkers|swans', 'The Itchen water meadows', 'The water meadows and the cathedral, Winchester', 'landscape', 'amber', 'dreamy', 'winchester|water meadows|river itchen|cathedral'],
    ['winchester-cathedral-evening', 'green', 51.0602, -1.3125, 160, 'dusk', 'landmark.winchester-cathedral', 720, 270, 480, 'lamps|walkers', 'Winchester Cathedral at dusk', 'Winchester Cathedral from the Close at dusk', 'landmark', 'slate', 'dreamy', 'winchester|cathedral|evening|close'],
    ['itchen-navigation', 'river', 51.0350, -1.3240, 175, 'day', 'landmark.st-catherines-hill', 1180, 180, 470, 'walkers|swans|bridge', 'The Itchen Navigation towpath', 'The Itchen Navigation below St Catherine\'s Hill', 'landscape', 'teal', 'calm', 'winchester|itchen navigation|towpath|river itchen'],
    ['river-test-stockbridge', 'river', 51.1130, -1.4920, 20, 'afternoon', 'landmark.test-fishing-hut', 420, 190, 480, 'swans|trout|cattle', 'The Test at Stockbridge', 'The River Test near Stockbridge', 'landscape', 'teal', 'calm', 'river test|stockbridge|chalk stream|fishing hut'],
    ['river-test-longstock', 'river', 51.1330, -1.4930, 300, 'golden', 'landmark.test-fishing-hut', 1150, 200, 470, 'trout|heron|angler', 'Evening on the Test at Longstock', 'The River Test water meadows near Longstock', 'landscape', 'amber', 'dreamy', 'river test|longstock|chalk stream|trout'],
    ['alresford-fulling-mill', 'river', 51.0880, -1.1580, 80, 'afternoon', 'landmark.alresford-fulling-mill', 760, 200, 480, 'swans|walkers|cottages', 'The fulling mill at Alresford', 'The fulling mill over the Arle, Alresford', 'heritage', 'green', 'cosy', 'alresford|river arle|mill|thatch'],
    ['watercress-beds-evening', 'cress', 51.0895, -1.1640, 100, 'golden', 'landmark.alresford-fulling-mill', 300, 190, 480, 'cottages', 'Evening over the cress beds', 'The cress beds by the Arle, Alresford', 'food', 'amber', 'dreamy', 'watercress|alresford|chalk springs|evening'],
    ['watercress-line-ropley', 'rail', 51.0880, -1.0800, 150, 'golden', 'landmark.ropley-station', 700, 190, 450, 'black|sheep', 'Ropley on the Watercress Line', 'Ropley station on the Watercress Line', 'heritage', 'amber', 'cheerful', 'watercress line|ropley|steam train|topiary'],
    ['butser-hill', 'downs', 50.9780, -0.9750, 230, 'noon', 'landmark.butser-hill', 1000, 210, 430, 'sheep|walkers|wildflowers|farm', 'Butser Hill', 'Butser Hill on the South Downs', 'landscape', 'green', 'cheerful', 'south downs|butser hill|chalk downland|sheep'],
    ['south-downs-way', 'downs', 50.9900, -1.0300, 120, 'afternoon', 'landmark.butser-hill', 560, 190, 440, 'sheep|gate|walkers|poppies', 'Walking the South Downs Way', 'The South Downs Way towards Butser Hill', 'landscape', 'green', 'calm', 'south downs way|chalk track|sheep|national park'],
    ['chawton-evening', 'green', 51.1336, -0.9886, 200, 'golden', 'landmark.jane-austens-house', 900, 220, 480, 'cottages|lamps|wildflowers', 'Chawton on a summer evening', 'The village street and the house at Chawton', 'heritage', 'amber', 'cosy', 'chawton|village|evening|writers house'],
    ['st-catherines-hill-winter', 'downs', 51.0490, -1.3080, 250, 'day', 'landmark.st-catherines-hill', 820, 200, 440, 'walkers|gate|sheep', 'Over St Catherine\'s Hill', 'St Catherine\'s Hill from the Downs above the Itchen', 'landscape', 'blue', 'calm', 'winchester|st catherines hill|downland|hillfort'],
  ];
  sceneTableDefine('uk-winchester', { cols: COLS.slice(0, 11), lists: ['features'], rows: ROWS.map(r => r.slice(0, 11)) });
  const rows = sceneTable('uk-winchester');
  ROWS.forEach((r, i) => {
    const o = Object.fromEntries(COLS.map((c, k) => [c, r[k]]));
    const id = 'hampshire-' + o.id, params = Object.assign({}, rows[i], { id });
    sceneAdd(PACK, { id, label: o.label, site: o.site || o.label, ukKind: o.ukKind, colour: o.colour, mood: o.mood, intensity: 'subtle',
      tags: o.tags.split('|'), lat: o.lat, lon: o.lon }, () => sceneFromArchetype('chalk-country', params, {}));
  });
})();
