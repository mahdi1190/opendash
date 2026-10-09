/* Scene credits (docs/dev/SCENE_ENGINE_V2.md 17.6 and 18.4; builder E). PURE: no DOM, no I/O; runs in Node and the browser.
   A scene recipe that holds geometry imported from OpenStreetMap, or ridges sampled from open elevation data, says so in
   scene.source; sceneCredits turns that into the credit lines the gallery shows under the scene (H) and the tools print.

     SCENE_CREDIT_TABLE            the credit lines by source (the terrain wording follows the datasets' own attribution text,
                                   copied verbatim into THIRD_PARTY_NOTICES.md)
     sceneCredits(x)               -> ['© OpenStreetMap contributors', ...]: x is a registry item, scene data, a recipe or a compiled scene
     sceneCreditSources(x)         -> the source record { osm, terrain } of x (or null)
     sceneCreditAboutHtml()        -> the Settings > About row (57-settings.js): <dt>Maps</dt><dd>...</dd>, a link, never a fetch
*/
const SCENE_CREDIT_TABLE = Object.freeze({
  osm: '© OpenStreetMap contributors',
  // the Terrain Tiles dataset (Mapzen / Tilezen joerd, on AWS Open Data); lines by the area of the view (THIRD_PARTY_NOTICES.md)
  terrarium: Object.freeze({
    lead: 'Terrain: Terrain Tiles (AWS Open Data)',
    gb: Object.freeze(['United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved',
      'Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers',
      'United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.']),
    eu: Object.freeze(['Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers',
      'United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.']),
    world: Object.freeze(['United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.']),
  }),
  os50: 'Contains OS data © Crown copyright and database right',
});

/** The source record of an item, data, a recipe or a compiled scene. */
function sceneCreditSources(x) {
  if (!x || typeof x !== 'object') return null;
  if (x.source && typeof x.source === 'object') return x.source;                       // scene data or a compiled scene
  if (x.scene && typeof x.scene === 'object' && !Array.isArray(x.scene) && x.scene.source) return x.scene.source;   // a recipe { v, pack, meta, scene }
  if (x.scene != null || x.composed) {                                                 // a registry item: its data (a thunk is evaluated once, cached)
    let d = null;
    try { d = typeof sceneData === 'function' ? sceneData(x) : (typeof x.scene === 'function' ? x.scene() : x.scene); } catch (e) { d = null; }
    return d && d.source && typeof d.source === 'object' ? d.source : null;
  }
  return null;
}

/** The credit lines for a scene (17.6, 18.4): [] when it uses no imported data. */
function sceneCredits(x) {
  const s = sceneCreditSources(x), out = [];
  if (!s) return out;
  if (s.osm) out.push(SCENE_CREDIT_TABLE.osm);
  const t = s.terrain;
  if (t && t.src === 'os50') out.push(SCENE_CREDIT_TABLE.os50);
  else if (t && (t.src === 'terrarium' || t.src)) {
    const T = SCENE_CREDIT_TABLE.terrarium, area = t.area === 'gb' || t.area === 'eu' ? t.area : t.area === 'world' ? 'world' : 'gb';
    out.push(T.lead + ': ' + T[area].join('; '));
  }
  return out;
}

/** The Settings > About row (57-settings.js); the link opens the licence page, nothing is fetched. */
function sceneCreditAboutHtml() {
  return '<dt>Maps</dt><dd>Scene layouts from OpenStreetMap, © OpenStreetMap contributors (ODbL 1.0, '
    + '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">openstreetmap.org/copyright</a>); '
    + 'terrain from the sources in THIRD_PARTY_NOTICES.md</dd>';
}
