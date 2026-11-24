/* ============================================================
   US FULL-SCREEN SCENES, batch 5 (Midwest): Michigan, Minnesota, Missouri, Nebraska, North Dakota, Ohio,
   South Dakota, Wisconsin, Chicago, Indianapolis, Cleveland. PURE classic script: it only calls
   usSceneAdd() (71-anim-us.js) with entries whose svg() draws the inside of a 1600 x 900 scene with the
   shared toolkit (usSceneKit). Layered like the Texas scenes: sky and its light, far / mid / near
   layers drifting at different speeds, the landmark, foreground, ambient life. Colours are painted for
   day; finish() lays the evening grade and the us-lit / us-lamps / us-star classes light up at dusk.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- Michigan: the Mackinac Bridge at sunrise over the Straits ---------- */
  usSceneAdd({ key: 'state:MI', label: 'The Mackinac Bridge at sunrise', site: 'The Mackinac Bridge', colour: 'blue', mood: 'proud', season: 'any', tags: ['bridge', 'straits', 'sunrise'],
    svg: () => '' });

  /* ---------- Minnesota: a loon on a misty northern lake at dawn ---------- */
  usSceneAdd({ key: 'state:MN', label: 'A loon on a misty northern lake', site: 'A loon on a north-woods lake', colour: 'teal', mood: 'calm', season: 'any', tags: ['loon', 'lake', 'pines', 'mist'],
    svg: () => '' });

  /* ---------- Missouri: the Gateway Arch and a Mississippi sternwheeler ---------- */
  usSceneAdd({ key: 'state:MO', label: 'The Gateway Arch and a riverboat', site: 'The Gateway Arch', colour: 'orange', mood: 'proud', season: 'any', tags: ['arch', 'riverboat', 'mississippi', 'st louis'],
    svg: () => '' });

  /* ---------- Nebraska: Chimney Rock and a wagon on the Oregon Trail ---------- */
  usSceneAdd({ key: 'state:NE', label: 'Chimney Rock and a wagon train', site: 'Chimney Rock on the Oregon Trail', colour: 'amber', mood: 'calm', season: 'any', tags: ['rock', 'prairie', 'trail', 'wagon'],
    svg: () => '' });

  /* ---------- North Dakota: pumpjacks on the prairie at sunset ---------- */
  usSceneAdd({ key: 'state:ND', label: 'Pumpjacks on the prairie at sunset', site: 'The Bakken at sunset', colour: 'orange', mood: 'focused', season: 'any', tags: ['oil', 'prairie', 'sunset', 'pumpjack'],
    svg: () => '' });

  /* ---------- Ohio: the Wright Flyer over the farm fields ---------- */
  usSceneAdd({ key: 'state:OH', label: 'The Wright Flyer over the fields', site: 'The Wright Flyer', colour: 'blue', mood: 'proud', season: 'any', tags: ['aviation', 'airplane', 'farm', 'fields'],
    svg: () => '' });

  /* ---------- South Dakota: Mount Rushmore in the morning light ---------- */
  usSceneAdd({ key: 'state:SD', label: 'Mount Rushmore in the morning light', site: 'Mount Rushmore', colour: 'slate', mood: 'proud', season: 'any', tags: ['mountain', 'monument', 'black hills', 'eagle'],
    svg: () => '' });

  /* ---------- Wisconsin: a Door County lighthouse at dusk ---------- */
  usSceneAdd({ key: 'state:WI', label: 'A Door County lighthouse at dusk', site: 'A Door County lighthouse', colour: 'red', mood: 'calm', season: ['autumn'], tags: ['lighthouse', 'lake', 'autumn', 'door county'],
    svg: () => '' });

  /* ---------- Chicago: the skyline over the river and the L ---------- */
  usSceneAdd({ key: 'place:chicago', label: 'The skyline and the L', site: 'The Chicago skyline and the L', colour: 'blue', mood: 'energetic', season: 'any', tags: ['skyline', 'train', 'river', 'skyscraper'],
    svg: () => '' });

  /* ---------- Indianapolis: Monument Circle at dusk ---------- */
  usSceneAdd({ key: 'place:indianapolis', label: 'Monument Circle at dusk', site: 'Monument Circle', colour: 'indigo', mood: 'cosy', season: ['autumn'], tags: ['monument', 'fountain', 'circle', 'dusk'],
    svg: () => '' });

  /* ---------- Cleveland: the glass pyramid on Lake Erie at dusk ---------- */
  usSceneAdd({ key: 'place:cleveland', label: 'The glass pyramid on Lake Erie', site: 'The Rock Hall on Lake Erie', colour: 'pink', mood: 'energetic', season: 'any', tags: ['music', 'lake', 'museum', 'pyramid', 'skyline'],
    svg: () => '' });
})();
