/* ============================================================
   SCENE LIBRARY: aircraft (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only; built lazily, once per variant.
   Scaffolded with `node tools/anim-pack.mjs object new vehicle.light-aircraft
   --kits vehicles --role vehicle`, then drawn here.

   vehicle.light-aircraft: a small single-engine high-wing light aircraft in
   side view, FACING RIGHT, as flown from a general-aviation airfield (the
   planes that cross the sky over Yateley Common from Blackbushe). Plain
   colours, no registration letters, no operator marks. Anchor: the middle of
   the fuselage (it flies; give it an actor path across the sky). v0 white
   with a blue cheat line, v1 cream with a red one. At real dusk its
   navigation lights, strobe, beacon, landing light and cabin glow light up
   (glow shapes), so it reads as lights moving over a dark sky.
   Parts: 'body' and 'prop' (the propeller disc flickers).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  sceneObjDefine({
    id: 'vehicle.light-aircraft',
    category: 'vehicle',
    size: [112, 40],
    box: [-62, -30, 60, 16],
    variants: 2,
    seasonal: false,
    flippable: true,
    palette: {
      base: { skin: ['#f2f2ee', '#efe6cc'], shade: ['#c8ccd0', '#cfc4a6'], line: ['#2f5aa0', '#b8382e'], glass: '#3a4a5a', tyre: '#2a2a2e', strut: '#9aa0a6', prop: '#5a5e66', off: '#6a6e76' },
    },
    night: { glow: { lamp: '#fff4d8', window: '#ffd98a' }, on: 1 },
    parts: ['body', 'prop'],
    anim: { flicker: { part: 'prop', op: [0.35, 0.8], period: 0.3 } },
    tags: ['aircraft', 'light-aircraft', 'airfield', 'sky', 'kit:vehicles', 'role:vehicle'],
    credit: 'drawn for the composed Yateley Common views (Blackbushe light aircraft)',
    build(v) {
      const c = v ? 1 : 0;
      const body = [
        // tailplane and fin (behind the fuselage)
        ['@shade.' + c, 'M-50-4l-10-1-2-3h14z'],
        ['@skin.' + c, 'M-44-6l-10-20h7l13 16z'],
        ['@line.' + c, 'M-50-21l4 8h6l-6-8z', 0.9],
        // fuselage: engine cowl right, tapering to the tail
        ['@skin.' + c, 'M-46-4q2-5 14-6h44q10 0 16 3l8 2q4 2 2 5l-6 3H-30q-10-1-16-7z'],
        ['@shade.' + c, 'M-44-3q14 4 74 3l8-1-4 4H-30q-10-1-14-6z', 0.8],
        ['@line.' + c, 'M-44-6q30-1 82 0l1 2q-50 1-83 0z'],
        // cabin windows (lit at dusk) and the windscreen
        { f: '@glass', d: 'M-4-10h10l2-5h-10z', glow: 'window' },
        { f: '@glass', d: 'M9-10h9l-1-5h-6z', glow: 'window' },
        { f: '@glass', d: 'M20-10h6l-4-5h-2z', glow: 'window' },
        // the high wing (seen edge-on) and its strut
        ['@skin.' + c, 'M-16-17h44l2-3h-48z'],
        ['@shade.' + c, 'M-16-17h44v1.6h-44z', 0.7],
        { s: '@strut', w: 1.6, d: 'M6-16L-2-6' },
        // landing gear
        { s: '@strut', w: 1.6, d: 'M2 3l-4 8M30 3l2 7' },
        ['@tyre', sceneD.circ(-3, 11, 3)], ['@tyre', sceneD.circ(32, 10.5, 2.5)],
        // spinner
        ['@off', 'M44 -6q6 0 8 3-2 3-8 3z'],
        // lights: red nav (port wing tip, near side), white tail light, beacon on the fin, strobe, landing light
        { f: '#b03028', d: sceneD.circ(-16, -18.5, 1.6), glow: 'lamp' },
        { f: '#d8dce0', d: sceneD.circ(-60, -6, 1.4), glow: 'lamp' },
        { f: '#b03028', d: sceneD.circ(-48, -26, 1.5), glow: 'lamp' },
        { f: '#e8ecf0', d: sceneD.circ(28, -19, 1.3), glow: 'lamp' },
        { f: '#d8dce0', d: 'M46 0l4 1-4 1z', glow: 'lamp' },
      ];
      const prop = [{ f: '@prop', d: sceneD.ell(53, -3, 1.6, 12), op: 0.7 }];
      return { body, prop };
    },
  });
})();
