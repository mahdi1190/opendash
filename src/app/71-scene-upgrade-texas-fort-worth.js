/* Fort Worth: the Stockyards cattle drive. The original opening remains as legacySvg.
   The new scene uses the live canvas engine: real sky, season, lamps and walking actors.
   Identity and location selection stay with the existing Texas pack entry. */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  const scene = () => {
    const data = {
      v: 1, id: 'fort-worth-stockyards',
      view: { lat: 32.7888, lon: -97.3483, heading: 90, fov: 78, horizon: 575, lift: 1 },
      at: 'dusk', setting: 'urban', signage: false, season: 'auto', weather: 'live', particles: 'season', particleSeasons: { winter: 'motes' },
      palette: {
        base: { road: ['#be9479', '#826052'], walk: '#c19979', far: ['#8e8b86', '#b6a28d'] },
        spring: { road: ['#c39b7d', '#88634e'], walk: '#c7a17f', far: ['#8a9c7b', '#b0ae8d'] },
        summer: { road: ['#c49670', '#855b44'], walk: '#c6a17a', far: ['#7a8a65', '#a6a17e'] },
        autumn: { road: ['#b77f5c', '#7e503e'], walk: '#bb8c66', far: ['#a28b68', '#b59c7c'] },
        winter: { road: ['#b0a198', '#776b65'], walk: '#b7a796', far: ['#8b9691', '#acb3ab'] },
      },
      sky: { stars: 130, clouds: { n: 4, y: [110, 300], speed: 4 }, sunR: 25, moonR: 27 },
      layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'mid' ? { haze: .04 } : l.id === 'far' ? { haze: .32 } : {})),
      ground: [
        { layer: 'horizon', d: 'M-160 590Q120 548 340 578T820 570T1330 562T1760 580V650H-160Z', fill: '@far.0' },
        { layer: 'far', d: 'M-160 613Q420 595 790 607T1760 602V650H-160Z', fill: '@far.1' },
        { layer: 'mid', d: 'M-160 640H1760V900H-160Z', fill: { lin: [[0, '@road.0'], [1, '@road.1']], x1: 0, y1: 640, x2: 0, y2: 900 } },
        { layer: 'mid', d: 'M-160 642H570L281 900H-160ZM1034 642H1760V900H1370Z', fill: '@walk' },
        { layer: 'mid', d: 'M564 648h10L292 900h-25zM1026 648h10l350 252h-26z', fill: '#72584e' },
        { layer: 'front', d: 'M-30 900V857q35 1 50 18l-4-56 13 43 18-31-6 42 36-20-22 27 62-2-43 22zM1483 900l35-25-18-18 36 10-1-44 14 33 23-21-8 36 43-24-18 30 41-6v29z', fill: '#29332e' },
      ],
      place: [
        { obj: 'landmark.fort-worth-stockyards', x: 800, y: 720, s: 1, layer: 'mid', seed: 1 },
        { obj: 'ground.stockyards-paving', x: 800, y: 900, s: 1, layer: 'near', seed: 2, anim: false },
        { obj: 'plant.grass', x: 35, y: 895, s: .65, layer: 'fore', seed: 4 },
        { obj: 'plant.grass', x: 1580, y: 897, s: .8, layer: 'fore', seed: 5, flip: true },
        { obj: 'plant.shrub', x: -48, y: 850, s: .6, layer: 'fore', seed: 7, variant: 1 },
        { obj: 'plant.shrub', x: 1660, y: 851, s: .66, layer: 'fore', seed: 8, variant: 0, flip: true },
        { obj: 'street.stockyards-rail', x: 105, y: 855, s: 1, layer: 'front', seed: 9 },
        { obj: 'street.stockyards-rail', x: 1495, y: 875, s: 1.04, layer: 'front', seed: 10, flip: true },
      ],
      scatter: [
        { obj: 'tree.distant', layer: 'far', seed: 31, area: { rect: [-120, 619, 1720, 632] }, n: 14, minGap: 92, s: [.11, .18], flip: .5, variant: [0, 2], anim: false, shadow: false, tint: { col: '#ad9391', k: [.2, .3] } },
        { obj: { 'ground.stockyards-wear': 3, 'ground.stockyards-sand': 1 }, layer: 'near', seed: 29, area: { rect: [0, 701, 1600, 899] }, n: 260, minGap: 8, s: [.35, 1.05], sByY: [[701, .6], [900, 1]], flip: .5, variant: [0, 3], anim: false, tint: { col: '#c29a77', k: [0, .15] } },
      ],
      actors: [
        { obj: 'animal.texas-longhorn', layer: 'fore', path: [[-330, 704], [1930, 704]], s: .69, speed: 23, loop: 'loop', offset: .41, variant: 0, seed: 41 },
        { obj: 'animal.texas-longhorn', layer: 'fore', path: [[-330, 757], [1930, 757]], s: 1.02, speed: 21, loop: 'loop', offset: .48, variant: 1, seed: 42 },
        { obj: 'animal.texas-longhorn', layer: 'fore', path: [[-330, 789], [1930, 789]], s: 1.19, speed: 26, loop: 'loop', offset: .64, variant: 2, seed: 43 },
      ],
      flocks: [
        { obj: 'bird.small-flight', layer: 'far', n: 8, area: [80, 185, 1520, 370], s: .4, speed: 19, seed: 51 },
        { obj: 'bird.small-flight', layer: 'mid', n: 4, area: [150, 270, 1450, 420], s: .3, speed: 26, seed: 52 },
      ],
      water: [], signs: [], camera: { pan: 5, period: 100 },
    };
    return data;
  };
  animRegionSceneUpgrade('texas', 'place:fort-worth', { state: 'live', landmarks: ['landmark.fort-worth-stockyards'], scene });
})();
