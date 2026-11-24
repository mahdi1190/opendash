/* ============================================================
   US FULL-SCREEN SCENES, batch 1 (Northeast): CT DE ME MD MA NH NJ NY PA RI VT.
   Pure classic script: registers entries through usSceneAdd(); usBuilder() (71-anim-us.js)
   upgrades the matching small icon to a full-screen opening. 1600 x 900 user units, sliced to fill any
   screen; the subject sits in the middle 1200 x 800, layers run to x -160 .. 1760 so they can drift.
   Colours are painted for daytime; finish() lays the evening grade and lights .us-lit / .us-lamps / .us-star.
   ============================================================ */
// The hand-drawn art of these scenes is gone: each one has a live composed upgrade (71-scene-upgrade-*.js), which is
// what the app draws. The entries stay so every item keeps its id, label, site, tags and season.
(function () {
  /* ---------- Maine: the lighthouse in sea fog at dawn ---------- */
  usSceneAdd({ key: 'state:ME', label: 'Lighthouse in the sea fog', site: 'A Maine lighthouse at dawn', colour: 'slate', mood: 'calm', season: 'any', tags: ['lighthouse', 'fog', 'coast'],
    svg: () => '' });

  /* ---------- Vermont: a covered bridge among the autumn maples ---------- */
  usSceneAdd({ key: 'state:VT', label: 'Covered bridge among the maples', site: 'A covered bridge in Vermont foliage', colour: 'red', mood: 'cosy', season: ['autumn'], tags: ['bridge', 'foliage', 'maple'],
    svg: () => '' });

  /* ---------- New York: the Statue of Liberty at dawn, the skyline behind ---------- */
  usSceneAdd({ key: 'state:NY', label: 'Statue of Liberty at dawn', site: 'The Statue of Liberty and the harbour', colour: 'teal', mood: 'proud', season: 'any', tags: ['landmark', 'harbour', 'skyline'],
    svg: () => '' });

  /* ---------- Pennsylvania: Independence Hall and the Liberty Bell at golden hour ---------- */
  usSceneAdd({ key: 'state:PA', label: 'Independence Hall and the Liberty Bell', site: 'Independence Hall, Philadelphia', colour: 'amber', mood: 'proud', season: 'any', tags: ['bell', 'history', 'landmark'],
    svg: () => '' });

  /* ---------- Massachusetts: Old North Church, one if by land, two if by sea ---------- */
  usSceneAdd({ key: 'state:MA', label: 'Old North Church lanterns', site: 'The lanterns of Old North Church, Boston', colour: 'indigo', mood: 'proud', season: 'any', tags: ['church', 'history', 'lanterns', 'night'],
    svg: () => '' });

  /* ---------- Connecticut: the Charter Oak in autumn ---------- */
  usSceneAdd({ key: 'state:CT', label: 'The Charter Oak in autumn', site: 'The Charter Oak, Connecticut', colour: 'orange', mood: 'proud', season: ['autumn'], tags: ['tree', 'autumn', 'oak'],
    svg: () => '' });

  /* ---------- Rhode Island: Newport sailboats under the mansion ---------- */
  usSceneAdd({ key: 'state:RI', label: 'Newport sailboats and the mansion', site: 'Newport, Narragansett Bay', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['sailboat', 'mansion', 'bay'],
    svg: () => '' });

  /* ---------- New Hampshire: the Old Man of the Mountain at sunrise ---------- */
  usSceneAdd({ key: 'state:NH', label: 'The Old Man of the Mountain', site: 'The Old Man of the Mountain, Franconia Notch', colour: 'slate', mood: 'proud', season: 'any', tags: ['mountain', 'profile', 'granite', 'sunrise'],
    svg: () => '' });

  /* ---------- New Jersey: the Jersey Shore boardwalk at sunset ---------- */
  usSceneAdd({ key: 'state:NJ', label: 'Boardwalk Ferris wheel at sunset', site: 'The Jersey Shore boardwalk', colour: 'pink', mood: 'cheerful', season: ['summer'], tags: ['boardwalk', 'shore', 'ferris wheel', 'pier'],
    svg: () => '' });

  /* ---------- Delaware: the twin Memorial Bridges over the river ---------- */
  usSceneAdd({ key: 'state:DE', label: 'Delaware Memorial Bridge', site: 'The Delaware Memorial Bridge', colour: 'blue', mood: 'proud', season: 'any', tags: ['bridge', 'river', 'ship'],
    svg: () => '' });

  /* ---------- Maryland: a skipjack under sail on the Chesapeake ---------- */
  usSceneAdd({ key: 'state:MD', label: 'Chesapeake skipjack under sail', site: 'A skipjack on the Chesapeake Bay', colour: 'orange', mood: 'calm', season: 'any', tags: ['sailboat', 'bay', 'skipjack'],
    svg: () => '' });
})();
