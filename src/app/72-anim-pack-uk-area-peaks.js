/* ============================================================
   ANIMATION PACK "uk-area-peaks": the Peak District area scenes, composed on the
   scene engine (docs/dev/SCENE_ENGINE.md section 3). The rows are in
   71-scene-uk-peaks-1.js, the archetype in 71-scene-uk-peaks-0.js, the area's
   objects in 70-scene-lib-area-peaks.js. Opt-in like every UK pack: the items play
   only in Derbyshire (or near one of their towns). Each item keeps the id, place,
   view, season and caption fields of the hand-drawn view it replaces; a scene is
   built lazily, once, when it is first shown or linted.
   ============================================================ */
(function () {
  if (typeof sceneItem !== 'function' || typeof _scPeaks !== 'object' || typeof ukCounty !== 'function') return;
  const items = [];
  for (const { meta: m, params } of _scPeaks.rows()) {
    const county = m.county || 'derbyshire', area = ukCounty(county), kind = m.kind || 'landscape';
    let cached = null;
    const scene = () => cached || (cached = _scPeaks.vista(params));
    const item = sceneItem({
      id: county + '-' + m.id, label: m.label, site: m.label + ' — ' + m.reason, colour: m.colour || 'green', mood: 'calm', intensity: 'subtle',
      slot: 'opening', theme: 'any', region: [area.nation], priority: 1,
      county, ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'peaks',
      ukPlace: m.place, ukTown: m.town, ukLocality: m.locality || 'Peak District', ukView: m.view, viewReason: m.reason,
      ukLat: params.lat, ukLon: params.lon, liveSky: { lat: params.lat, lon: params.lon },
      tags: ['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind, 'peak district'].concat(m.tags || []),
    }, scene);
    item.when = (day, ctx) => !!ctx && !!ctx.county && (ctx.county === county || (typeof animUkScenePools === 'function' && animUkScenePools([{ county, ukTown: m.town }], ctx).nearby.length > 0));
    items.push(item);
  }
  if (items.length) animRegisterPack({ id: 'uk-area-peaks', name: 'UK: the Peak District', version: '1.0.0', description: 'Stanage Edge, Mam Tor and the Great Ridge, Ladybower, Castleton, Bakewell, Dovedale and Hathersage: composed scenes with the four seasons and the live sky.', items });
})();
