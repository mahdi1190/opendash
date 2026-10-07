/* ============================================================
   DATA TABLE london-demo (docs/dev/SCENE_ENGINE.md 8.2, section 11): three famous PUBLIC London stations
   for the station archetype demo, and the public colours of the lines they use (colour bars only).
   PURE data. Nothing here relates to any user.
   ============================================================ */
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  sceneLinesDefine({
    bakerloo: { name: 'Bakerloo', col: '#b36305', net: 'tube' },
    circle: { name: 'Circle', col: '#ffd329', net: 'tube' },
    'hammersmith-city': { name: 'Hammersmith and City', col: '#f3a9bb', net: 'tube' },
    jubilee: { name: 'Jubilee', col: '#a0a5a9', net: 'tube' },
    metropolitan: { name: 'Metropolitan', col: '#9b0056', net: 'tube' },
    piccadilly: { name: 'Piccadilly', col: '#003688', net: 'tube' },
  });
  sceneTableDefine('london-demo', {
    cols: ['id', 'name', 'lines', 'lat', 'lon', 'era', 'features'],
    lists: ['lines', 'features'],
    rows: [
      ['baker-street', 'Baker Street', 'bakerloo|circle|hammersmith-city|jubilee|metropolitan', 51.5226, -0.1571, 'victorian', 'terrace|plane-trees|bus'],
      ['arnos-grove', 'Arnos Grove', 'piccadilly', 51.6164, -0.1331, 'holden', 'suburb|trees'],
      ['canary-wharf', 'Canary Wharf', 'jubilee', 51.5035, -0.0187, 'jubilee-modern', 'towers|water|glass-canopy'],
    ],
  });
})();
