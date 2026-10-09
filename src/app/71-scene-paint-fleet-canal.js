/* ============================================================
   PAINTED SCENE: Basingstoke Canal at Fleet (docs/dev/PAINTED_SCENES.md). The location is one painting (assets/objects/ground/paint-fleet-canal*,
   imported by node tools/anim-pack.mjs scene paint new); the engine adds the live sky through the sky cut, the crossfade to
   the night painting, ripples and glints in the water, weather, and the actors below, drawn BEHIND the foreground occluder.
   Coordinates are the painting's pixels (1600 x 900). Add 3 to 5 standout animations with library actors on the painting's
   own ground: people on its paths, boats on its water, birds in its sky; check them with scene paint lint.
   Standpoint: 51.276120, -0.840400; west (270 degrees), east of Reading Road bridge.
   Location reference: https://commons.wikimedia.org/wiki/File:Reading_Road_Bridge,_Basingstoke_Canal,_Fleet_-_geograph.org.uk_-_1769158.jpg
   The requested brick arch is an illustrative interpretation; the modern Reading Road bridge has a flat deck.
   Imported WebP layers are encoded at quality 0.4 to retain all five paintings within the painted-scene byte limit.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || !sceneObj("ground.paint-fleet-canal")) return;
  const PACK = "paint-fleet-canal";
  const data = () => ({
    v: 1, id: "fleet-canal", view: { lat: 51.27612, lon: -0.8404, heading: 270, fov: 70, horizon: 435, lift: 1 },
    at: 'noon', season: 'auto', setting: 'natural', signage: false,
    layers: [{ id: 'back', depth: 0.2, haze: 0 }, { id: 'mid', depth: 0.45, haze: 0.06 }, { id: 'near', depth: 0.75, haze: 0.02 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 180, clouds: { n: 2, y: [30, 110], speed: 4 }, sunR: 24, moonR: 18 },
    paint: {"back":"ground.paint-fleet-canal","water":"ground.paint-fleet-canal-water","front":"ground.paint-fleet-canal-front"},
    place: [
      { obj: "ground.paint-fleet-canal", x: 0, y: 0, s: 1, layer: 'back', anim: false },
      { obj: "ground.paint-fleet-canal-water", x: 0, y: 0, s: 1, layer: 'back', anim: false },
      { obj: "ground.paint-fleet-canal-front", x: 0, y: 0, s: 1, layer: 'front', anim: false },
    ],
    actors: [
      // The boat moves lengthways towards the bridge, never sideways across the narrow canal.
      // Its library body supplies the wake, bobbing, chimney and evening window light.
      { obj: 'boat.narrowboat-receding', variant: 8, layer: 'mid', path: [[1020,730],[900,610],[825,515],[785,468]], speed: 2.2, loop: 'fade', s: 0.42, sByY: [[468,0.12],[515,0.32],[610,0.7],[730,1]], seed: 91, offset: 0.35 },
      // Both figures follow the gravel centreline; the walker's final leg disappears behind the left ferns.
      { obj: 'person.dog-walker', layer: 'near', path: [[618,481],[540,530],[463,603],[448,690],[422,773],[350,860],[280,930]], speed: 7, loop: 'pingpong', s: 1.25, sByY: [[480,0.18],[600,0.62],[775,1.2],[930,1.65]], seed: 92, offset: 0.45 },
      { obj: 'person.cyclist', layer: 'fore', path: [[660,930],[560,815],[499,700],[491,612],[563,534],[620,488]], speed: 19, loop: 'pingpong', s: 1.05, sByY: [[488,0.2],[612,0.65],[815,1.4],[930,1.65]], seed: 93, offset: 0.31 },
      { obj: 'bird.swan', layer: 'near', path: [[1130,580],[1250,602],[1350,645],[1240,680]], speed: 4, loop: 'pingpong', s: 0.45, sByY: [[580,0.65],[680,1]], seed: 94, offset: 0.6 },
      { obj: 'bird.kingfisher-flight', layer: 'fore', path: [[-100,566],[740,540],[1090,570],[1720,538],[1720,-350],[-1600,-350],[-1600,566],[-100,566]], speed: 185, loop: 'loop', s: 0.6, seed: 95, offset: 0.08 },
    ],
    flocks: [],
    particles: 'season', weather: 'live',
  });
  sceneAdd(PACK, { id: "fleet-canal", label: "Basingstoke Canal at Fleet", site: "Fleet towpath, looking west towards Reading Road bridge", tags: ['painted', 'scene'], mood: 'calm', colour: 'green',
    lat: 51.27612, lon: -0.8404, liveSky: { lat: 51.27612, lon: -0.8404 }, when: () => false }, data);
})();
