/* ============================================================
   ACHIEVEMENTS, B5 the Play shelf, scenes and meta: the facts (docs/dev/ACHIEVEMENTS_500.md 1.7, 3.26 to 3.30). PURE.
   The garden, the pet and the places log are read on the page (92-game-6ach.js); the data here is the profile,
   the seen flags and the marks the scene watcher writes.
   ============================================================ */
registerAchFactSource('b5-play', (c, o) => {
  const data = c.data, g = c.g;
  // ---- scenes: a playing scene on screen for 20 seconds, once per scene ----
  const scenes = Object.keys(g.marks.scene && typeof g.marks.scene === 'object' ? g.marks.scene : {});
  o.set('scenes.seen', scenes.length);
  o.set('scenes.packs', new Set(scenes.map(r => r.split('/')[0])).size);
  o.set('scenes.firstSnow', Object.keys(c.seen.firstSnow && typeof c.seen.firstSnow === 'object' ? c.seen.firstSnow : {}).length);
  const kinds = new Set();
  for (const k of ['morning', 'evening', 'week', 'money']) {
    if (Object.keys(c.g.ticks['story-' + k] || {}).length || Object.keys(c.seen['storyPlayed:' + k] || {}).length) kinds.add(k);
  }
  o.set('stories.kinds', kinds.size);
  o.set('pages.visitedAll', Object.keys(g.marks['all-pages'] || {}).length ? 1 : 0);
  // ---- profile ----
  const pr = data.profile && typeof data.profile === 'object' ? data.profile : {};
  o.set('profile.collected', Object.keys(pr.collected && typeof pr.collected === 'object' ? pr.collected : {}).length);
  const seasonsByYear = {};
  for (const k of Object.keys(g.marks['look-season'] || {})) { const m = /^(\d{4})-(spring|summer|autumn|winter)$/.exec(k); if (m) (seasonsByYear[m[1]] = seasonsByYear[m[1]] || new Set()).add(m[2]); }
  o.set('profile.lookSeasons', Math.max(0, ...Object.values(seasonsByYear).map(s => s.size)));
}, { order: 24 });
