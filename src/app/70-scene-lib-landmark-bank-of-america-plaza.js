/* ============================================================
   SCENE LIBRARY: landmark.bank-of-america-plaza (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The tallest tower of the Dallas skyline (1985, 72 floors, about 281 m), drawn by hand for the
   composed dallas-skyline scene (the hand-drawn art's tall tower was only a reference):
   - the real structure: a plain, slim prism of green-grey reflective glass with a flat top; its
     corners are notched, so the face towards the viewer has a recessed slot either side and the
     side wings stand a little back; floor bands and fine vertical mullions; a low glazed lobby
   - the glass lit from the left (its left wing and face pale, the right in shade), the warm
     sky caught in the upper floors
   - night: the green outline that traces every vertical edge and the roofline (the 'lit' part,
     with a soft green halo), and scattered office windows (glow)
   No text, no logos, no names on it. Anchor: the ground at the middle of the foot (1 unit = 1 m).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, poly, define } = sceneDraw;
  const TOP = -281, BASE = -12;              // the roof; the top of the lobby
  const F = 15, N = 20, W = 27;              // the front face's half-width, the notches' outer edge, the side wings' outer edge
  define({
    id: 'landmark.bank-of-america-plaza', category: 'landmark', size: [64, 282], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#a8bcb6', '#86a09a', '#62807a', '#435c58', '#2e4240'], sky: ['#d6e0e4', '#b4c4ca'], frame: ['#d4dcd8', '#8a9894'],
      lobby: ['#3a4a50', '#5a7078'], argon: '#3cf07c', argonHalo: '#2ad46a',
    } },
    night: { glow: { window: '#fff0c8' }, on: 0.8 },
    shadow: { rx: 36, ry: 4, h: 110 },
    reflect: true,
    tags: ['landmark', 'place:texas/place:dallas', 'texas', 'tower', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn dallas-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const lin = (x0, x1, stops) => ({ lin: stops, x1: x0, y1: 0, x2: x1, y2: 0 });
      // the lobby: a low glazed base under the tower, its canopy and the plaza steps
      body.push(['@frame.1', rect(-34, -2, 68, 2)], { f: lin(-30, 30, [[0, '@lobby.1'], [1, '@lobby.0']]), d: rect(-30, BASE, 60, 10) }, ['@frame.0', rect(-31, BASE - 1.4, 62, 1.4)]);
      let lm = ''; for (let x = -27; x <= 27; x += 4.5) lm += `M${x} ${BASE}V-2`;
      body.push({ s: '@frame.1', w: 0.35, op: 0.8, d: lm, detail: true });
      // the side wings (set back): the left one catching the light, the right one in shade
      body.push({ f: lin(-W, -N, [[0, '@glass.0'], [1, '@glass.1']]), d: rect(-W, TOP + 1.5, W - N, -TOP - 1.5 + BASE) });
      body.push({ f: lin(N, W, [[0, '@glass.3'], [1, '@glass.4']]), d: rect(N, TOP + 1.5, W - N, -TOP - 1.5 + BASE) });
      // the notches either side of the front face (deep slots)
      body.push({ f: '@glass.2', d: rect(-N, TOP + 3, N - F, -TOP - 3 + BASE) }, { f: '@glass.4', d: rect(F, TOP + 3, N - F, -TOP - 3 + BASE) });
      // the front face: green-grey glass, the warm sky reflected high up, a vertical sheen
      body.push({ f: lin(-F, F, [[0, '@glass.1'], [0.45, '@glass.2'], [1, '@glass.3']]), d: rect(-F, TOP, 2 * F, -TOP + BASE) });
      body.push({ f: { lin: [[0, '@sky.0', 0.4], [0.35, '@sky.1', 0.14], [1, '@sky.1', 0]], x1: 0, y1: TOP, x2: 0, y2: -120 }, d: rect(-F, TOP, 2 * F, 161) });
      body.push({ f: { lin: [[0, '@glass.0', 0], [0.5, '@glass.0', 0.32], [1, '@glass.0', 0]], x1: -12, y1: 0, x2: -4, y2: 0 }, d: rect(-12, TOP, 8, -TOP + BASE), detail: true });
      body.push({ f: { lin: [[0, '@sky.0', 0.4], [1, '@sky.1', 0]], x1: 0, y1: TOP, x2: 0, y2: -180 }, d: rect(-W, TOP + 1.5, W - N, 100), detail: true });
      // the curtain wall reflects the sky unevenly: a tone per zone of a dozen floors, on each wing and the face
      const zone = (TOP - BASE) / 6;
      for (let k = 0; k < 6; k++) {
        const y0 = BASE + zone * (k + 1), h = -zone, t = 0.06 + 0.05 * ((k * 7 + 3) % 4);
        body.push({ f: '@glass.0', d: rect(-W, f1(y0), W - N, f1(h)), op: f1(t * 1.4 * 100) / 100, detail: true });
        body.push({ f: '@sky.1', d: rect(-F, f1(y0), 2 * F, f1(h)), op: f1(t * 100) / 100, detail: true });
        body.push({ f: '@glass.4', d: rect(N, f1(y0), W - N, f1(h)), op: f1(t * 1.2 * 100) / 100, detail: true });
      }
      // inside each notch, the inner face square to the viewer and the cheek of the wing beside it
      body.push({ f: '@glass.1', d: rect(-N, TOP + 3, 1.6, -TOP - 3 + BASE), op: 0.8, detail: true }, { f: '@glass.4', d: rect(N - 1.6, TOP + 3, 1.6, -TOP - 3 + BASE), op: 0.9, detail: true });
      // the neighbouring tower caught in the right wing's glass, and the shade under each parapet
      body.push({ f: '@glass.4', d: rect(N + 1, -150, 4, 138), op: 0.35, detail: true });
      body.push({ f: '@glass.4', d: rect(-F, TOP + 0.8, 2 * F, 1.2), op: 0.5, detail: true }, { f: '@glass.3', d: rect(-W, TOP + 2, W - N, 1), op: 0.5, detail: true });
      // floor bands (every third floor) and the fine mullions, per face
      const faces = [[-W, -N, '@glass.3'], [-N, -F, '@glass.4'], [-F, F, '@glass.4'], [F, N, '@glass.4'], [N, W, '@glass.4']];
      faces.forEach(([x0, x1, c], i) => {
        let fb = ''; for (let y = BASE - 11.6; y > TOP + 4; y -= 11.6) fb += `M${x0} ${f1(y)}H${x1}`;
        body.push({ s: c, w: 0.4, op: i === 2 ? 0.45 : 0.35, d: fb, detail: true });
        let mu = ''; for (let x = x0 + 2; x < x1 - 0.5; x += 2.5) mu += `M${f1(x)} ${BASE}V${TOP + 3}`;
        body.push({ s: i < 2 ? '@frame.0' : '@glass.4', w: 0.18, op: 0.4, d: mu, detail: true });
      });
      // the edges: the light on the left arrises, the shade lines in the notches, the roof's parapet and the crown's caps
      body.push({ s: '@frame.0', w: 0.6, op: 0.85, d: `M${-W} ${BASE}V${TOP + 1.5}M${-F} ${BASE}V${TOP}` }, { s: '@glass.4', w: 0.6, op: 0.8, d: `M${-N} ${BASE}V${TOP + 3}M${F} ${BASE}V${TOP + 3}` });
      body.push(['@frame.1', rect(-F, TOP - 0.8, 2 * F, 1.6)], ['@frame.0', rect(-W, TOP + 0.8, W - N, 1.2)], ['@frame.1', rect(N, TOP + 0.8, W - N, 1.2)]);
      body.push(['@glass.4', rect(-N, TOP + 2.2, N - F, 1.2)], ['@glass.4', rect(F, TOP + 2.2, N - F, 1.2)]);
      // the roof plant behind the parapet, the window-cleaning rail, a mast and the aviation lights
      body.push(['@glass.3', rect(-8, TOP - 4, 16, 3.4)], { s: '@frame.1', w: 0.4, op: 0.8, d: `M-12 ${TOP - 1.4}H12`, detail: true }, ['@frame.1', rect(-0.4, TOP - 12, 0.8, 8)]);
      body.push({ f: '#ff4636', d: rect(-0.6, TOP - 12.8, 1.2, 1) }, { f: '#ff4636', d: rect(-W, TOP + 0.4, 1, 0.8), detail: true }, { f: '#ff4636', d: rect(W - 1, TOP + 0.4, 1, 0.8), detail: true });
      // where the tower meets the lobby: the recessed joint and the shade along the foot of the curtain wall
      body.push({ f: '@glass.4', d: rect(-W, BASE - 1, 2 * W, 1), op: 0.8 }, { f: { lin: [[0, '@glass.4', 0], [1, '@glass.4', 0.45]], x1: 0, y1: BASE - 30, x2: 0, y2: BASE - 1 }, d: rect(-W, BASE - 30, 2 * W, 29), detail: true });
      // the lobby's doors and the canopy's columns
      body.push({ f: '@lobby.0', d: rect(-5, -8, 10, 6), detail: true }, { s: '@frame.0', w: 0.6, op: 0.9, d: `M-24 ${BASE - 1.4}V-2M24 ${BASE - 1.4}V-2`, detail: true }, ['@frame.0', rect(-7, -9.4, 14, 1.2)]);
      // the office windows: coarse ribbons every third floor, a random third of them lit at dusk
      for (let y = BASE - 6; y > TOP + 8; y -= 11.6) for (const [x0, x1] of [[-W, -N], [-F, F], [N, W]]) for (let x = x0 + 1; x < x1 - 2; x += 5) if (r() < 0.32) cells.push([f1(x), f1(y), Math.min(4, x1 - 1 - x), 1.6]);
      sceneDraw.winGroups(r, cells, 8).forEach(d => body.push({ f: '@sky.0', d, op: 0.5, glow: 'window', detail: true }));
      // night: the green outline on every vertical edge and the roofline, with a soft halo: the edges nearest the viewer
      // (the front face) brightest, the set-back wings' edges a little dimmer
      const roof = `M${-W} ${TOP + 1.5}H${-N}V${TOP + 3}H${-F}V${TOP}H${F}V${TOP + 3}H${N}V${TOP + 1.5}H${W}`;
      lit.push({ s: '@argonHalo', w: 3.2, op: 0.3, d: roof + `M${-W} ${BASE}V${TOP + 1.5}M${W} ${BASE}V${TOP + 1.5}M${-F} ${BASE}V${TOP}M${F} ${BASE}V${TOP}` });
      lit.push({ s: '@argon', w: 0.9, op: 0.95, d: roof });
      for (const [x, top, op] of [[-W, TOP + 1.5, 0.85], [-N, TOP + 3, 0.7], [-F, TOP, 0.95], [F, TOP, 0.95], [N, TOP + 3, 0.7], [W, TOP + 1.5, 0.85]]) lit.push({ s: '@argon', w: 0.9, op, d: `M${x} ${BASE}V${top}` });
      lit.push({ f: { lin: [[0, '@argonHalo', 0.18], [1, '@argonHalo', 0]], x1: 0, y1: TOP, x2: 0, y2: TOP + 40 }, d: rect(-W - 3, TOP - 6, 2 * W + 6, 46) });
      lit.push({ f: '#ffe6b8', d: rect(-29, BASE + 1, 58, 8), op: 0.55 }, { f: '@argonHalo', d: rect(-31, BASE - 1.4, 62, 1.4), op: 0.4 });
      return { body, lit };
    },
  });
})();
