/* ============================================================
   US FULL-SCREEN SCENES, batch 7 (Mountain West, Southwest, Alaska).
   PURE classic script: it only calls usSceneAdd(). Same toolkit and layering as the Texas scenes.
     states   NV Pyramid Lake, NM White Sands, OK storm over wheat, UT Bryce hoodoos, WY Old Faithful, AK Denali
     cities   Denver, Salt Lake City, Las Vegas, Phoenix, Oklahoma City
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  usSceneAdd({ key: 'state:NV', label: 'Pyramid Lake tufa at twilight', site: 'Pyramid Lake', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['lake', 'tufa', 'twilight'],
    svg: () => '' });

  usSceneAdd({ key: 'state:NM', label: 'White Sands dunes at dusk', site: 'White Sands', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['dunes', 'gypsum', 'dusk'],
    svg: () => '' });

  /* ---------- Oklahoma: a storm over the wheat ---------- */
  usSceneAdd({ key: 'state:OK', label: 'Storm over the wheat', site: 'Storm over the wheat', colour: 'slate', mood: 'energetic', season: 'any', tags: ['storm', 'wheat', 'windmill', 'lightning'],
    svg: () => '' });

  usSceneAdd({ key: 'state:UT', label: 'Bryce hoodoos at dawn', site: 'Bryce Canyon', colour: 'orange', mood: 'calm', season: 'any', tags: ['hoodoos', 'sunrise', 'canyon'],
    svg: () => '' });

  /* ---------- Wyoming: Old Faithful erupting ---------- */
  usSceneAdd({ key: 'state:WY', label: 'Old Faithful erupts', site: 'Old Faithful', colour: 'teal', mood: 'proud', season: 'any', tags: ['geyser', 'steam', 'yellowstone', 'bison'],
    svg: () => '' });

  /* ---------- Alaska: midnight sun over Denali ---------- */
  usSceneAdd({ key: 'state:AK', label: 'Midnight sun over Denali', site: 'Denali', colour: 'orange', mood: 'calm', season: 'any', tags: ['denali', 'tundra', 'moose', 'midnight sun'],
    svg: () => '' });

  /* ---------- Denver: the skyline under the Rockies ---------- */
  usSceneAdd({ key: 'place:denver', label: 'The Mile High skyline', site: 'Denver and the Rockies', colour: 'blue', mood: 'proud', season: 'any', tags: ['skyline', 'rockies', 'light rail'],
    svg: () => '' });

  /* ---------- Salt Lake City: the Temple under the Wasatch ---------- */
  usSceneAdd({ key: 'place:salt-lake-city', label: 'Temple and Wasatch at dusk', site: 'Temple Square and the Wasatch', colour: 'violet', mood: 'proud', season: 'any', tags: ['temple', 'wasatch', 'mountains', 'spires'],
    svg: () => '' });

  /* ---------- Las Vegas: the Strip at dusk ---------- */
  usSceneAdd({ key: 'place:las-vegas', label: 'The Strip at dusk', site: 'The Las Vegas Strip', colour: 'pink', mood: 'energetic', season: 'any', tags: ['neon', 'strip', 'casino', 'tower'],
    svg: () => '' });

  /* ---------- Phoenix: sun and saguaros ---------- */
  usSceneAdd({ key: 'place:phoenix', label: 'Sun and saguaros over Camelback', site: 'Camelback and the Valley of the Sun', colour: 'orange', mood: 'cheerful', season: 'any', tags: ['saguaro', 'camelback', 'desert', 'sun'],
    svg: () => '' });

  /* ---------- Oklahoma City: the skyline and the Ferris wheel ---------- */
  usSceneAdd({ key: 'place:oklahoma-city', label: 'Skyline, Skydance bridge and Ferris wheel', site: 'Bricktown and the Devon tower', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['skyline', 'ferris wheel', 'bridge', 'bricktown'],
    svg: () => '' });
})();
