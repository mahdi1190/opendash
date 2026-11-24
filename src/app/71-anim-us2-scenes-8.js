/* ============================================================
   US FULL-SCREEN SCENES, batch 8 (Pacific coast): California, Hawaii, Oregon, Washington, Los Angeles,
   San Francisco, San Diego, Portland, Seattle, Anchorage, Honolulu. Same toolkit as the Texas scenes (usSceneKit):
   1600 x 900 units, sliced to fill any screen, layered (sky, light, far / mid / near, ambient life), painted in
   daytime colours; the dark theme or tod-dusk / tod-night lights .us-lit windows, .us-lamps and .us-star.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- California: redwood forest, light shafts and fern ---------- */
  usSceneAdd({ key: 'state:CA', label: 'Redwoods in the morning mist', site: 'Redwood National Park', colour: 'green', mood: 'calm', season: 'any', tags: ['redwood', 'forest', 'mist'],
    svg: () => '' });

  /* ---------- Hawaii: Kilauea lava glowing at night ---------- */
  usSceneAdd({ key: 'state:HI', label: 'Kilauea glowing at night', site: 'Hawaii Volcanoes National Park', colour: 'red', mood: 'energetic', season: 'any', tags: ['volcano', 'lava', 'night'],
    svg: () => '' });

  /* ---------- Oregon: Crater Lake and Wizard Island under the Milky Way ---------- */
  usSceneAdd({ key: 'state:OR', label: 'Crater Lake under the stars', site: 'Crater Lake and Wizard Island', colour: 'indigo', mood: 'dreamy', season: 'any', tags: ['lake', 'crater', 'stars', 'night'],
    svg: () => '' });

  /* ---------- Washington: Mount Rainier at sunrise over a still lake ---------- */
  usSceneAdd({ key: 'state:WA', label: 'Mount Rainier at sunrise', site: 'Mount Rainier', colour: 'blue', mood: 'calm', season: 'any', tags: ['mountain', 'rainier', 'sunrise', 'lake'],
    svg: () => '' });

  /* ---------- Los Angeles: palms, skyline and searchlights at sunset ---------- */
  usSceneAdd({ key: 'place:los-angeles', label: 'Palms, skyline and searchlights', site: 'Downtown Los Angeles at sunset', colour: 'pink', mood: 'proud', season: 'any', tags: ['palm', 'sunset', 'hollywood', 'skyline'],
    svg: () => '' });

  /* ---------- San Francisco: the Golden Gate in fog at sunrise ---------- */
  usSceneAdd({ key: 'place:san-francisco', label: 'Golden Gate Bridge in fog', site: 'The Golden Gate Bridge', colour: 'red', mood: 'dreamy', season: 'any', tags: ['bridge', 'fog', 'golden-gate', 'sunrise'],
    svg: () => '' });

  /* ---------- San Diego: harbor, Coronado Bridge, sailboats and a sea lion ---------- */
  usSceneAdd({ key: 'place:san-diego', label: 'Sailboats and a sea lion', site: 'San Diego Bay', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['sailboat', 'sea-lion', 'harbor', 'bridge'],
    svg: () => '' });

  /* ---------- Portland: the Willamette, a steel bridge, roses in the rain, Mount Hood ---------- */
  usSceneAdd({ key: 'place:portland-or', label: 'Bridges and roses in the rain', site: 'Portland and the Willamette', colour: 'pink', mood: 'cosy', season: 'any', tags: ['bridge', 'rose', 'rain', 'mount-hood'],
    svg: () => '' });

  /* ---------- Seattle: the Space Needle, the skyline, Rainier and a ferry in golden light ---------- */
  usSceneAdd({ key: 'place:seattle', label: 'Space Needle and a ferry', site: 'The Space Needle', colour: 'indigo', mood: 'proud', season: 'any', tags: ['space-needle', 'ferry', 'rainier', 'skyline'],
    svg: () => '' });

  /* ---------- Anchorage: aurora over the Chugach, a moose in the snow ---------- */
  usSceneAdd({ key: 'place:anchorage', label: 'Aurora and a moose', site: 'Anchorage and the northern lights', colour: 'green', mood: 'dreamy', season: 'any', tags: ['aurora', 'moose', 'snow', 'night'],
    svg: () => '' });

  /* ---------- Honolulu: Diamond Head, Waikiki and a surfer ---------- */
  usSceneAdd({ key: 'place:honolulu', label: 'Diamond Head and a surfer', site: 'Diamond Head and Waikiki', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['diamond-head', 'surf', 'beach', 'waikiki'],
    svg: () => '' });
})();
