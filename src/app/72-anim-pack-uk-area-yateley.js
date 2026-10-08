/* ============================================================
   ANIMATION PACK "uk-area-yateley": the Yateley area, composed on the
   scene engine (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Yateley Common, Wyndham's Pool, Yateley Green and the village at
   Church End: one row per VIEW in the tables of
   71-scene-uk-yateley-common.js, -wyndhams-pool.js and -green.js, each
   built by its archetype (70-scene-lib-area-yateley.js) and made into
   FOUR seasonal items (spring, summer, autumn, winter) with the same item
   fields as the earlier Yateley items: id (county-prefixed, the view's
   original season without a suffix), label, site, ukPlace, ukView,
   ukSeason, season, the live sky. Each item draws its own season in a
   still and the date's season with a live clock; the rotation plays the
   item of the date's season, only in its county or near Yateley.
   The scene is a THUNK: a row is built only when it is shown or linted.
   ukAreaYateleyItems() returns the items, so they can also be merged into
   another UK pack.
   ============================================================ */
function ukAreaYateleyItems() {
  if (typeof sceneItem !== 'function' || typeof sceneArchetype !== 'function' || typeof sceneTable !== 'function' || typeof sceneFromArchetype !== 'function') return [];
  const COUNTY = 'hampshire', NAME = 'Hampshire', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'south-east';
  const PLACES = {
    'yateley-common': { arch: 'yateley-heath', label: 'Yateley Common', tags: ['heathland', 'heather', 'birch'], lat: 51.336, lon: -0.833 },
    'wyndhams-pool': { arch: 'yateley-pool', label: "Wyndham's Pool", tags: ['pond', 'woodland', 'reeds'], lat: 51.332, lon: -0.822 },
    'yateley-green': { arch: 'yateley-green', label: 'Yateley Green', tags: ['village green', 'pond', 'wildflowers'], lat: 51.343, lon: -0.829 },
    'yateley-village': { arch: 'yateley-green', label: 'Yateley village', tags: ['village', 'church', 'cottages'], lat: 51.344, lon: -0.827 },
  };
  const TABLES = ['uk-yateley-common', 'uk-yateley-wyndhams-pool', 'uk-yateley-green'];
  const REASON = { spring: 'rsp', summer: 'rsu', autumn: 'rau', winter: 'rwi' };
  const out = [];
  for (const t of TABLES) for (const row of sceneTable(t) || []) {
    const P = PLACES[row.place];
    if (!P) continue;
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const reason = row[REASON[season]], label = row.label || P.label;
      const keys = Object.keys((sceneArchetype(P.arch) || {}).params || {}), params = { season }, patch = {};
      for (const k of keys) if (k !== 'season' && row[k] != null && row[k] !== '') params[k] = row[k];
      const id = `${COUNTY}-${row.place}-${row.n}${season !== row.orig ? '-' + season : ''}`;
      const meta = {
        id, label: label + ', ' + NAME, site: `${label} — ${reason}`,
        colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : row.place === 'wyndhams-pool' && season === 'summer' ? 'green' : 'green',
        mood: 'calm', intensity: 'subtle', priority: 1, theme: 'any', region: [NATION],
        tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'landscape'].concat(P.tags, season),
        county: COUNTY, ukRegion: region, ukKind: 'landscape', signature: false, ukPart: 'area-yateley',
        ukPlace: row.place, ukLocality: 'Yateley', ukTown: 'Yateley', ukView: row.view, viewReason: reason, ukSeason: season,
        liveSky: { lat: P.lat, lon: P.lon }, sceneSeason: season,
        when: (day, ctx) => !!ctx && !!ctx.county && season === animSeasonOf(day) && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: 'Yateley' }], ctx).nearby.length > 0)),
      };
      const it = sceneItem(meta, () => sceneFromArchetype(P.arch, params, patch));
      it.season = [season];
      out.push(it);
    }
  }
  return out;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = ukAreaYateleyItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-area-yateley', name: 'UK: Yateley', version: '1.0.0',
    description: 'Yateley Common, Wyndham\'s Pool, Yateley Green and the village, composed on the scene engine: every view in four seasons with the live sky. Plays only in its county or near Yateley.', items });
})();
