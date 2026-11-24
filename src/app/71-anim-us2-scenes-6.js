/* ============================================================
   US FULL-SCREEN SCENES, batch 6 (Midwest cities and Mountain states). Drawn with usSceneKit() (71-anim-us.js),
   the same toolkit and layering as the Texas scenes: 1600 x 900 user units, sliced to fill any screen; sky and its light,
   far / mid / near layers that drift, the landmark, a foreground and ambient life. Colours are painted for daytime;
   finish() lays the evening grade and .us-lit / .us-lamps / .us-star light up at dusk. Motion is transform and opacity only.
     place:cincinnati place:detroit place:milwaukee place:minneapolis place:st-louis place:kansas-city place:omaha
     state:AZ state:CO state:ID state:MT
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- Cincinnati: the Roebling bridge at sunset, a flying pig, a steamboat ---------- */
  usSceneAdd({ key: 'place:cincinnati', label: 'Roebling bridge at sunset', site: 'The Roebling Suspension Bridge', colour: 'pink', mood: 'cheerful', season: 'any', tags: ['bridge', 'river', 'flying pig', 'sunset'],
    svg: () => '' });

  /* ---------- Detroit: the Renaissance Center across the river, a freighter passing, dawn ---------- */
  usSceneAdd({ key: 'place:detroit', label: 'Riverfront towers at dawn', site: 'The Renaissance Center', colour: 'slate', mood: 'proud', season: 'any', tags: ['skyline', 'river', 'freighter', 'dawn'],
    svg: () => '' });

  /* ---------- Milwaukee: the Art Museum's wings above Lake Michigan ---------- */
  usSceneAdd({ key: 'place:milwaukee', label: 'The Art Museum wings on the lake', site: 'The Milwaukee Art Museum', colour: 'teal', mood: 'proud', season: ['summer'], tags: ['museum', 'lake', 'sailboats', 'architecture'],
    svg: () => '' });

  /* ---------- Minneapolis: the Spoonbridge and Cherry in the sculpture garden, skyline behind ---------- */
  usSceneAdd({ key: 'place:minneapolis', label: 'Spoonbridge and Cherry', site: 'The Spoonbridge and Cherry', colour: 'red', mood: 'cheerful', season: ['summer'], tags: ['sculpture', 'garden', 'skyline', 'cherry'],
    svg: () => '' });

  /* ---------- St. Louis: the Gateway Arch framing the afternoon sun over the Mississippi ---------- */
  usSceneAdd({ key: 'place:st-louis', label: 'The Gateway Arch', site: 'The Gateway Arch', colour: 'slate', mood: 'proud', season: 'any', tags: ['arch', 'landmark', 'river', 'riverboat'],
    svg: () => '' });

  /* ---------- Kansas City: the Liberty Memorial tower against breaking storm light, fountains playing ---------- */
  usSceneAdd({ key: 'place:kansas-city', label: 'City of Fountains and the Liberty Memorial', site: 'The Liberty Memorial and the fountains', colour: 'teal', mood: 'proud', season: 'any', tags: ['fountain', 'memorial', 'skyline', 'storm light'],
    svg: () => '' });

  /* ---------- Omaha: the Desert Dome and giraffes on a bright morning ---------- */
  usSceneAdd({ key: 'place:omaha', label: 'The Desert Dome and giraffes', site: 'The Desert Dome at the zoo', colour: 'green', mood: 'cheerful', season: 'any', tags: ['zoo', 'dome', 'giraffe', 'skyline'],
    svg: () => '' });

  /* ---------- Arizona: the Grand Canyon from the South Rim at sunset, a saguaro on the edge ---------- */
  usSceneAdd({ key: 'state:AZ', label: 'Grand Canyon sunset from the rim', site: 'The Grand Canyon', colour: 'orange', mood: 'proud', season: 'any', tags: ['canyon', 'sunset', 'saguaro', 'river'],
    svg: () => '' });

  /* ---------- Colorado: the Maroon Bells and their lake at first light, aspens turning gold ---------- */
  usSceneAdd({ key: 'state:CO', label: 'Maroon Bells at first light', site: 'The Maroon Bells', colour: 'indigo', mood: 'calm', season: ['autumn'], tags: ['peaks', 'lake', 'aspens', 'alpenglow'],
    svg: () => '' });

  /* ---------- Idaho: the Sawtooth peaks over Redfish Lake at moonrise, a campfire on the shore ---------- */
  usSceneAdd({ key: 'state:ID', label: 'Sawtooth moonlit lake', site: 'The Sawtooth Mountains', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['peaks', 'lake', 'moon', 'campfire'],
    svg: () => '' });

  /* ---------- Montana: big sky over the prairie, the Rocky Mountain Front, a storm cell and a red barn ---------- */
  usSceneAdd({ key: 'state:MT', label: 'Big sky over the prairie', site: 'Big Sky Country', colour: 'blue', mood: 'calm', season: ['summer'], tags: ['sky', 'prairie', 'mountains', 'barn', 'storm'],
    svg: () => '' });
})();
