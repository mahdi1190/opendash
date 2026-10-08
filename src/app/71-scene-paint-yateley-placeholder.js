/* ============================================================
   PAINTED SCENE: Yateley Green (painted placeholder) (docs/dev/PAINTED_SCENES.md). The location is one painting (assets/objects/ground/paint-yateley-placeholder*,
   imported by node tools/anim-pack.mjs scene paint new); the engine adds the live sky through the sky cut, the crossfade to
   the night painting, ripples and glints in the water, weather, and the actors below, drawn BEHIND the foreground occluder.
   Coordinates are the painting's pixels (1600 x 900). Add 3 to 5 standout animations with library actors on the painting's
   own ground: people on its paths, boats on its water, birds in its sky; check them with scene paint lint.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || !sceneObj("ground.paint-yateley-placeholder")) return;
  const PACK = "paint-yateley-placeholder";
  const data = () => ({
    v: 1, id: "yateley-placeholder", view: { lat: 51.3427, lon: -0.8301, heading: 32, fov: 70, horizon: 163, lift: 1 },
    at: 'noon', season: 'auto', setting: 'natural', signage: false,
    layers: [{ id: 'back', depth: 0.2, haze: 0 }, { id: 'mid', depth: 0.45, haze: 0.06 }, { id: 'near', depth: 0.75, haze: 0.02 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 180, clouds: { n: 4, y: [30, 73], speed: 6 }, sunR: 24, moonR: 18 },
    paint: {"back":"ground.paint-yateley-placeholder","water":"ground.paint-yateley-placeholder-water","front":"ground.paint-yateley-placeholder-front"},
    place: [
      { obj: "ground.paint-yateley-placeholder", x: 0, y: 0, s: 1, layer: 'back', anim: false },
      { obj: "ground.paint-yateley-placeholder-water", x: 0, y: 0, s: 1, layer: 'back', anim: false },
      { obj: "ground.paint-yateley-placeholder-front", x: 0, y: 0, s: 1, layer: 'front', anim: false },
    ],
    actors: [
      // the standout animations: { obj, layer, path: [[x, y], ...], speed, loop: 'loop' | 'pingpong', s, seed, offset }
      // 1. a dog walker coming down the winding path toward the viewer, growing with the perspective, the dog at heel
      { obj: 'person.walker', layer: 'near', path: [[1236, 476], [1212, 520], [1240, 572], [1318, 640], [1410, 730], [1470, 830], [1500, 940]], speed: 14, loop: 'loop', sByY: [[470, 0.7], [900, 2.6]], seed: 61, offset: 0.1 },
      { obj: 'animal.dog', layer: 'near', path: [[1256, 480], [1232, 522], [1262, 572], [1340, 640], [1432, 730], [1492, 830], [1522, 940]], speed: 14, loop: 'loop', sByY: [[470, 0.45], [900, 1.6]], seed: 62, offset: 0.1 },
      // 2. a walker on the far bank passing BEHIND the reeds of the foreground (the occluder)
      { obj: 'person.walker', layer: 'mid', path: [[-40, 500], [480, 494]], speed: 9, loop: 'pingpong', s: 0.62, seed: 63, offset: 0.35 },
      // 3. a pair of swans gliding across the pond
      { obj: 'bird.swan', layer: 'mid', path: [[360, 588], [760, 572]], speed: 3, loop: 'pingpong', s: 0.5, seed: 64, offset: 0.2 },
      { obj: 'bird.swan', layer: 'mid', path: [[390, 596], [790, 580]], speed: 3, loop: 'pingpong', s: 0.48, seed: 65, offset: 0.24 },
    ],
    flocks: [
      // 4. swallows over the water and the green
      { obj: 'bird.small-flight', n: 6, area: [200, 300, 1100, 470], speed: 30, s: 0.4, seed: 71, layer: 'back' },
    ],
    particles: 'season', weather: 'live',
  });
  sceneAdd(PACK, { id: "yateley-placeholder", label: "Yateley Green (painted placeholder)", site: "Yateley Green (painted placeholder)", tags: ['painted', 'scene'], mood: 'calm', colour: 'green',
    lat: 51.3427, lon: -0.8301, liveSky: { lat: 51.3427, lon: -0.8301 }, when: () => false }, data);
})();
