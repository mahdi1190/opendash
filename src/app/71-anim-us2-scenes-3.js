/* ============================================================
   US FULL-SCREEN SCENES, batch 3 (Southeast): KY LA MS NC SC TN VA WV, Virginia Beach, Charlotte, Atlanta.
   Same toolkit as the Texas scenes (usSceneKit in 71-anim-us.js). Painted in daylight colours; the dark theme /
   tod-dusk / tod-night grade lights windows (.us-lit, .us-lamps) and stars (.us-star). Motion is transform and opacity.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- KENTUCKY: a bluegrass horse farm at sunrise ---------- */
  usSceneAdd({ key: 'state:KY', label: 'Bluegrass horse farm at sunrise', site: 'A Bluegrass horse farm at sunrise', colour: 'green', mood: 'calm', season: ['spring'], tags: ['horses', 'bluegrass', 'farm', 'sunrise'],
    svg: () => '' });

  /* ---------- LOUISIANA: a bayou at dusk ---------- */
  usSceneAdd({ key: 'state:LA', label: 'Cypress bayou at dusk', site: 'The bayou at dusk', colour: 'teal', mood: 'dreamy', tags: ['bayou', 'cypress', 'fireflies', 'spanish moss'],
    svg: () => '' });

  /* ---------- MISSISSIPPI: Delta cotton at sunset ---------- */
  usSceneAdd({ key: 'state:MS', label: 'Cotton rows in the Delta at sunset', site: 'Cotton rows in the Delta', colour: 'amber', mood: 'calm', season: ['autumn'], tags: ['cotton', 'delta', 'sunset', 'harvest'],
    svg: () => '' });

  /* ---------- NORTH CAROLINA: Cape Hatteras Lighthouse ---------- */
  usSceneAdd({ key: 'state:NC', label: 'Cape Hatteras Lighthouse and the dunes', site: 'Cape Hatteras Lighthouse', colour: 'slate', mood: 'proud', tags: ['lighthouse', 'outer banks', 'dunes', 'hatteras'],
    svg: () => '' });

  /* ---------- SOUTH CAROLINA: palmettos, a crescent moon and the Charleston marsh ---------- */
  usSceneAdd({ key: 'state:SC', label: 'Palmettos and a crescent moon over the marsh', site: 'Palmettos and the crescent moon', colour: 'blue', mood: 'calm', tags: ['palmetto', 'moon', 'marsh', 'charleston'],
    svg: () => '' });

  /* ---------- TENNESSEE: fog in the Smokies at dawn ---------- */
  usSceneAdd({ key: 'state:TN', label: 'Mist in the Great Smoky Mountains', site: 'Mist in the Smokies', colour: 'indigo', mood: 'dreamy', tags: ['smoky mountains', 'fog', 'cabin', 'ridges'],
    svg: () => '' });

  /* ---------- VIRGINIA: the Blue Ridge from Skyline Drive in autumn ---------- */
  usSceneAdd({ key: 'state:VA', label: 'Autumn sunset from the Skyline Drive overlook', site: 'The Blue Ridge from Skyline Drive', colour: 'orange', mood: 'proud', season: ['autumn'], tags: ['shenandoah', 'blue ridge', 'autumn', 'overlook'],
    svg: () => '' });

  /* ---------- WEST VIRGINIA: the New River Gorge Bridge in autumn ---------- */
  usSceneAdd({ key: 'state:WV', label: 'The New River Gorge Bridge in autumn', site: 'The New River Gorge Bridge', colour: 'green', mood: 'proud', season: ['autumn'], tags: ['bridge', 'gorge', 'new river', 'rafts', 'autumn'],
    svg: () => '' });

  /* ---------- VIRGINIA BEACH: boardwalk, pier and dolphins ---------- */
  usSceneAdd({ key: 'place:virginia-beach', label: 'The oceanfront pier and dolphins', site: 'The oceanfront and the pier', colour: 'blue', mood: 'cheerful', tags: ['beach', 'pier', 'dolphins', 'boardwalk', 'oceanfront'],
    svg: () => '' });

  /* ---------- CHARLOTTE: the Queen City skyline and its crown ---------- */
  usSceneAdd({ key: 'place:charlotte', label: 'The Queen City skyline and its crown', site: 'The Charlotte skyline', colour: 'blue', mood: 'proud', tags: ['skyline', 'crown', 'light rail', 'uptown'],
    svg: () => '' });

  /* ---------- ATLANTA: the skyline at peach-coloured dusk, jets and the Connector ---------- */
  usSceneAdd({ key: 'place:atlanta', label: 'The skyline at dusk with jets overhead', site: 'The Atlanta skyline at dusk', colour: 'indigo', mood: 'energetic', tags: ['skyline', 'jets', 'airport', 'peach', 'highway'],
    svg: () => '' });
})();
