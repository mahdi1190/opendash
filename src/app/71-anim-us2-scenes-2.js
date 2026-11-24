/* ============================================================
   US FULL-SCREEN SCENES, batch 2 (Northeast cities, Washington DC, Alabama, Arkansas, Florida, Georgia).
   PURE classic script: defines nothing global; it registers entries with usSceneAdd() (71-anim-us.js),
   which usBuilder() uses to upgrade the matching small icons to full-screen openings.
   Each svg() returns the inside of a 1600 x 900 drawing (sliced to fill any screen), layered: a sky and its
   light, far / mid / near layers that drift at different speeds, the landmark, foreground and ambient life.
   Colours are painted for daytime; the dark theme or tod-dusk / tod-night lays the evening grade over them
   (us-tint) and lights the us-lit windows, us-lamps strings and us-star stars. Motion is transform and
   opacity only. Rendered size must stay under 32 KB per scene.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- New York: the bridge and the skyline at golden hour ---------- */
  usSceneAdd({ key: 'place:new-york', label: 'Brooklyn Bridge and the skyline', site: 'Manhattan from the Brooklyn Bridge', colour: 'indigo', mood: 'energetic', season: 'any', tags: ['bridge', 'skyline', 'east river'],
    svg: () => '' });

  /* ---------- Buffalo: City Hall in lake-effect snow ---------- */
  usSceneAdd({ key: 'place:buffalo', label: 'City Hall in the lake-effect snow', site: 'City Hall in the lake-effect snow', colour: 'slate', mood: 'cosy', season: ['winter'], tags: ['snow', 'art deco', 'tower'],
    svg: () => '' });

  /* ---------- Philadelphia: City Hall at the end of the Parkway ---------- */
  usSceneAdd({ key: 'place:philadelphia', label: 'City Hall and the Parkway flags', site: 'City Hall, down the Parkway', colour: 'blue', mood: 'proud', season: 'any', tags: ['city hall', 'parkway', 'flags', 'fountain'],
    svg: () => '' });

  /* ---------- Pittsburgh: the Golden Triangle and the incline at blue hour ---------- */
  usSceneAdd({ key: 'place:pittsburgh', label: 'The yellow bridges and the incline', site: 'The Golden Triangle from Mount Washington', colour: 'amber', mood: 'focused', season: 'any', tags: ['bridges', 'incline', 'rivers', 'skyline'],
    svg: () => '' });

  /* ---------- Boston: Back Bay, the Charles and an autumn regatta ---------- */
  usSceneAdd({ key: 'place:boston', label: 'Back Bay, the Charles and autumn sails', site: 'The Charles River in autumn', colour: 'blue', mood: 'calm', season: ['autumn'], tags: ['skyline', 'sailboat', 'river', 'autumn'],
    svg: () => '' });

  /* ---------- Baltimore: Fort McHenry at dawn's early light ---------- */
  usSceneAdd({ key: 'place:baltimore', label: 'Fort McHenry at dawn\'s early light', site: 'Fort McHenry, dawn\'s early light', colour: 'red', mood: 'proud', season: 'any', tags: ['flag', 'harbour', 'fort', 'ships', 'rockets'],
    svg: () => '' });

  /* ---------- Washington, DC: the Monument and the cherry blossoms ---------- */
  usSceneAdd({ key: 'place:washington', label: 'Washington Monument and cherry blossoms', site: 'The Monument, from the Tidal Basin', colour: 'pink', mood: 'proud', season: ['spring'], tags: ['monument', 'cherry blossom', 'tidal basin', 'memorial'],
    svg: () => '' });

  /* ---------- Alabama: the steel arch bridge at dawn ---------- */
  usSceneAdd({ key: 'state:AL', label: 'The arch bridge at dawn', site: 'The Edmund Pettus Bridge at dawn', colour: 'amber', mood: 'proud', season: 'any', tags: ['bridge', 'river', 'dawn', 'history'],
    svg: () => '' });

  /* ---------- Arkansas: misty Ozark ridges in autumn ---------- */
  usSceneAdd({ key: 'state:AR', label: 'Mist in the Ozarks', site: 'Morning mist in the Ozarks', colour: 'teal', mood: 'calm', season: ['autumn'], tags: ['mountains', 'mist', 'autumn', 'cabin'],
    svg: () => '' });

  /* ---------- Florida: an airboat in the Everglades ---------- */
  usSceneAdd({ key: 'state:FL', label: 'An airboat in the Everglades', site: 'The Everglades, river of grass', colour: 'green', mood: 'energetic', season: 'any', tags: ['everglades', 'airboat', 'sawgrass', 'egret'],
    svg: () => '' });

  /* ---------- Georgia: the granite dome at a peach sunset ---------- */
  usSceneAdd({ key: 'state:GA', label: 'The granite dome at a peach sunset', site: 'Stone Mountain at sunset', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['mountain', 'granite', 'cable car', 'peach', 'lake'],
    svg: () => '' });
})();
