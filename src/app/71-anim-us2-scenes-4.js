/* ============================================================
   US FULL-SCREEN SCENES, batch 4: Miami, Orlando, Tampa, Nashville, Memphis, Louisville, New Orleans,
   Illinois, Indiana, Iowa, Kansas. Pure classic script: it only calls usSceneAdd(entry) (71-anim-us.js);
   the pack builder upgrades the matching items to full-screen openings. Same toolkit and layering as the
   Texas scenes (docs/dev/ANIMATION_PACKS.md, UK_PACK.md "Full-viewport scenes"): 1600 x 900 units, sliced
   to fill any screen, far / mid / near layers, ambient life, daytime colours (the dark theme or a dusk
   class lights .us-lit windows and .us-lamps strings and shows .us-star). Motion is transform and
   opacity only.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- MIAMI: Ocean Drive deco at sunrise ---------- */
  usSceneAdd({ key: 'place:miami', label: 'Art deco neon by the sea', site: 'Ocean Drive, South Beach', colour: 'pink', mood: 'energetic', season: 'any', tags: ['deco', 'neon', 'palm', 'sunrise'],
    svg: () => '' });

  /* ---------- ORLANDO: Lake Eola fountain and fireworks ---------- */
  usSceneAdd({ key: 'place:orlando', label: 'Fountain and skyline at dusk', site: 'Lake Eola Park', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['fountain', 'skyline', 'fireworks', 'dusk'],
    svg: () => '' });

  /* ---------- TAMPA: Sunshine Skyway ---------- */
  usSceneAdd({ key: 'place:tampa', label: 'The Skyway bridge', site: 'Sunshine Skyway Bridge', colour: 'teal', mood: 'proud', season: 'any', tags: ['bridge', 'bay', 'pelican'],
    svg: () => '' });

  /* ---------- NASHVILLE: skyline at sunset with the pedestrian bridge ---------- */
  usSceneAdd({ key: 'place:nashville', label: 'Skyline and a guitar sound', site: 'Music City at sunset', colour: 'orange', mood: 'energetic', season: 'any', tags: ['skyline', 'music', 'guitar', 'bridge', 'sunset'],
    svg: () => '' });

  /* ---------- MEMPHIS: the M bridge, the pyramid and the river by night ---------- */
  usSceneAdd({ key: 'place:memphis', label: 'The bridge and the pyramid by night', site: 'The Mississippi at Memphis', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['bridge', 'pyramid', 'river', 'night', 'steamboat'],
    svg: () => '' });

  usSceneAdd({ key: 'place:louisville', label: 'Twin spires at post time', site: 'Churchill Downs', colour: 'red', mood: 'energetic', season: ['spring'], tags: ['derby', 'horse', 'spires', 'racing', 'roses'],
    svg: () => '' });

  usSceneAdd({ key: 'place:new-orleans', label: 'Gas lamps and the cathedral', site: 'The French Quarter at dusk', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['french quarter', 'lamp', 'jazz', 'cathedral', 'balcony'],
    svg: () => '' });

  /* ---------- ILLINOIS: Chicago skyline, the lake and the L ---------- */
  usSceneAdd({ key: 'state:IL', label: 'Chicago skyline over the lake', site: 'The Chicago skyline from the lake', colour: 'indigo', mood: 'proud', season: 'any', tags: ['chicago', 'skyline', 'lake', 'train', 'sunrise'],
    svg: () => '' });

  /* ---------- INDIANA: dunes on Lake Michigan at sunrise ---------- */
  usSceneAdd({ key: 'state:IN', label: 'Dunes on Lake Michigan', site: 'The Indiana Dunes at sunrise', colour: 'amber', mood: 'calm', season: 'any', tags: ['dunes', 'lake', 'sand', 'sunrise', 'beach grass'],
    svg: () => '' });

  /* ---------- IOWA: barn, silo and wind over the fields ---------- */
  usSceneAdd({ key: 'state:IA', label: 'Barns and wind over the fields', site: 'An Iowa farm in the morning wind', colour: 'green', mood: 'calm', season: ['summer'], tags: ['farm', 'barn', 'wind', 'corn', 'silo'],
    svg: () => '' });

  /* ---------- KANSAS: wheat, a grain elevator and a storm on the horizon ---------- */
  usSceneAdd({ key: 'state:KS', label: 'Wheat and big sky', site: 'Wheat under a Kansas sky', colour: 'amber', mood: 'calm', season: ['summer'], tags: ['wheat', 'prairie', 'storm', 'grain elevator', 'big sky'],
    svg: () => '' });
})();
