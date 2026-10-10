/* ============================================================
   ANIMATION PACK "uk-north-manchester-centre": Manchester's civic quarter, hand-composed on the scene engine v2
   (71-scene-uk-north-manchester-centre-1..4.js; the landmarks and ground plans in 70-scene-lib-manchester-centre.js).
   Four views, each a different real viewpoint, all-season with the live sky: Albert Square and the Town Hall, St Peter's
   Square and the Central Library, the Midland Hotel over the tram stop, the John Rylands Library on Deansgate; plus the
   Albert Square Christmas market (mid-November to just before Christmas, in place of view 1). Each scene is a THUNK,
   built only when it is shown or linted. Plays only in Greater Manchester or near Manchester.
   ============================================================ */
function sceneUkMcrCentreItems() {
  if (typeof sceneItem !== 'function') return [];
  const COUNTY = 'greater-manchester', NAME = 'Greater Manchester', NATION = 'GB-ENG';
  const region = typeof ukCounty === 'function' && ukCounty(COUNTY) ? ukCounty(COUNTY).region : 'north-west';
  const near = (ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([{ county: COUNTY, ukTown: 'Manchester' }], ctx).nearby.length > 0));
  // the market runs from mid-November to just before Christmas (day: the date the scene is for)
  const monthDay = (day) => { const s = typeof day === 'string' ? day : day instanceof Date ? day.toISOString().slice(0, 10) : ''; const m = /^\d{4}-(\d\d)-(\d\d)/.exec(s); return m ? [+m[1], +m[2]] : null; };
  const isMarket = (day) => { const md = monthDay(day); return !!md && ((md[0] === 11 && md[1] >= 14) || (md[0] === 12 && md[1] <= 22)); };
  const views = [
    { n: 1, view: 'albert-square', label: 'Albert Square', site: 'Albert Square — the Town Hall clock tower over the square, pigeons round the Albert Memorial', fn: () => sceneUkMcrCentre1(false), ok: typeof sceneUkMcrCentre1 === 'function', lat: 53.47905, lon: -2.2464, tags: ['town hall', 'clock tower', 'albert memorial', 'gothic', 'square'] },
    { n: 2, view: 'st-peters-square', label: 'St Peter\'s Square', site: 'St Peter\'s Square — trams at the stop below the Central Library rotunda, the Cenotaph beside them', fn: () => sceneUkMcrCentre2(), ok: typeof sceneUkMcrCentre2 === 'function', lat: 53.4776, lon: -2.2432, tags: ['central library', 'rotunda', 'cenotaph', 'metrolink', 'tram', 'square'] },
    { n: 3, view: 'midland-hotel', label: 'Peter Street', site: 'Peter Street — trams curve past the Midland Hotel\'s red terracotta', fn: () => sceneUkMcrCentre3(), ok: typeof sceneUkMcrCentre3 === 'function', lat: 53.4781, lon: -2.2445, tags: ['midland hotel', 'metrolink', 'tram', 'terracotta', 'street'] },
    { n: 4, view: 'deansgate', label: 'Deansgate', site: 'Deansgate — buses and bikes pass the John Rylands Library\'s red sandstone Gothic', fn: () => sceneUkMcrCentre4(), ok: typeof sceneUkMcrCentre4 === 'function', lat: 53.4805, lon: -2.2479, tags: ['john rylands library', 'deansgate', 'gothic', 'bus', 'street'] },
  ];
  const meta = (o) => Object.assign({ colour: 'red', intensity: 'subtle', theme: 'any', region: [NATION], county: COUNTY, ukRegion: region, ukKind: 'city',
    ukPart: 'uk-north-manchester-centre', ukPlace: 'manchester-centre', ukLocality: 'Manchester', ukTown: 'Manchester' }, o);
  const items = [];
  for (const w of views) {
    if (!w.ok) continue;
    let data = null;
    items.push(sceneItem(meta({
      id: `${COUNTY}-manchester-centre-${w.n}`, label: w.label + ', Manchester', site: w.site, mood: 'energetic', priority: 1,
      tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'manchester', 'city', 'civic'].concat(w.tags),
      signature: w.n === 1, ukView: w.view, liveSky: { lat: w.lat, lon: w.lon },
      when: (day, ctx) => near(ctx) && !(w.n === 1 && isMarket(day)),
    }), () => data || (data = w.fn())));
  }
  if (typeof sceneUkMcrCentre1 === 'function') {
    let data = null;
    items.push(sceneItem(meta({
      id: `${COUNTY}-manchester-centre-market`, label: 'Albert Square Christmas markets, Manchester', site: 'Albert Square — the Christmas market\'s chalets under the Town Hall tower',
      mood: 'cheerful', priority: 2, tags: ['uk', region.replace(/-/g, ' '), NAME.toLowerCase(), 'manchester', 'city', 'christmas', 'market', 'town hall'],
      signature: false, ukView: 'albert-square-market', liveSky: { lat: 53.47905, lon: -2.2464 },
      when: (day, ctx) => near(ctx) && isMarket(day),
    }), () => data || (data = sceneUkMcrCentre1(true))));
  }
  return items;
}
(function () {
  if (typeof animRegisterPack !== 'function') return;
  const items = sceneUkMcrCentreItems();
  if (!items.length) return;
  animRegisterPack({ id: 'uk-north-manchester-centre', name: 'UK: Manchester civic quarter', version: '1.0.0',
    description: 'Manchester\'s Albert Square, St Peter\'s Square, Peter Street and Deansgate, hand-composed on the scene engine v2: the Town Hall and the Albert Memorial, the Central Library and the Cenotaph, Metrolink trams, the Midland Hotel and the John Rylands Library, the Christmas markets in December, in every season with the live sky. Plays only in Greater Manchester or near Manchester.', items });
})();
