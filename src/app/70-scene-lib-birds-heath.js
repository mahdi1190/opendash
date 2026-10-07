/* ============================================================
   SCENE LIBRARY: heathland birds (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only; built lazily, once per variant.
   Scaffolded with `node tools/anim-pack.mjs object new bird.dartford-warbler
   --kits birds,temperate --role bird`, then drawn here.

   The two birds the Thames Basin Heaths are protected for (with the
   woodlark), after the Yateley Common view art:
   - bird.dartford-warbler: perched on a gorse top, slate-grey above, wine-red
     below, a red eye ring and a long cocked tail (it flicks: the turn hook).
     Anchor: its feet.
   - bird.nightjar: hawking for moths over the heath at dusk, long pointed
     wings with white wing spots (male), long tail (flap). Anchor: the body
     centre (it flies; give it an actor path).
   Both FACE RIGHT, like the rest of the library.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  const circ = (x, y, r) => sceneD.circ(f1(x), f1(y), f1(r));
  sceneObjDefine({
    id: 'bird.dartford-warbler',
    category: 'bird',
    size: [44, 34],
    box: [-26, -30, 22, 8],
    variants: 1,
    seasonal: false,
    flippable: true,
    palette: { base: { slate: ['#55566a', '#6c6e84', '#3e3f4e'], wine: ['#8a3a3a', '#a85448'], ring: '#d8452e', bill: '#2a2a30', twig: '#5a4a3a', gorse: ['#3f6338', '#f3c21c'] } },
    parts: ['perch', 'tail', 'body', 'head'],
    anim: { turn: { part: 'tail', pivot: [-8, -8], deg: 16, period: 1.4, hold: 0.25 } },
    tags: ['uk', 'heath', 'gorse', 'dartford-warbler', 'warbler', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: 'the Yateley Common view art (Dartford warbler), redrawn',
    build() {
      return {
        perch: [{ s: '@twig', w: 2, d: 'M-16 5q10-4 24-2M2 4l6-9' }, ['@gorse.0', 'M6-4q2-5 7-2 0 4-7 2z'], ['@gorse.1', circ(10, -6, 1.8)], ['@gorse.1', circ(-10, 3, 1.6)]],
        tail: [['@slate.2', 'M-8-8l-15-18 4-2 14 15z'], ['@slate.0', 'M-9-9l-11-13 2-1 11 12z', 0.8]],
        body: [{ s: '#2a2420', w: 1.2, d: 'M-2 0v5M3 0v5' }, ['@slate.0', 'M-10-5q-1-12 10-13 10 0 12 8l-4 10H-6z'], ['@slate.1', 'M-6-15q6-4 12-2-4 3-12 2z', 0.8], ['@wine.0', 'M0-8q9-1 9 6-4 4-11 2z'], ['@wine.1', 'M2-6q4 0 5 3z', 0.7]],
        head: [['@slate.0', 'M2-16q2-8 9-6 4 3 1 8z'], ['@ring', circ(8, -14, 1.9)], ['#101414', circ(8, -14, 1.1)], ['@bill', 'M12-13l5 1-5 2z']],
      };
    },
  });
  sceneObjDefine({
    id: 'bird.nightjar',
    category: 'bird',
    size: [64, 26],
    box: [-34, -16, 34, 14],
    variants: 1,
    seasonal: false,
    flippable: true,
    palette: { base: { body: ['#4a3e32', '#6a5a46', '#2a2622'], spot: '#f2efe6' } },
    parts: ['body', 'wings'],
    anim: { flap: { part: 'wings', pivot: [0, -1], sy: [-0.6, 1], period: 0.42 } },
    tags: ['uk', 'heath', 'nightjar', 'dusk', 'flight', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: 'the Yateley Common view art (nightjar), redrawn',
    build() {
      return {
        body: [['@body.0', 'M-6-2q6-5 14-1l-2 4h-10z'], ['@body.1', 'M-2-3q4-2 8 0z', 0.8], ['@body.0', 'M-6 0l-16 4 1 3 16-3z'], ['@body.2', 'M8-2l4 1-4 1z']],
        wings: [['@body.0', 'M-2-2Q-14-12-32-6q14 0 28 5zM6-2Q16-12 34-6q-14 0-26 5z'], ['@body.2', 'M-2-2Q-14-10-30-6q12-1 26 3z', 0.4], ['@spot', circ(-20, -7, 1.6)], ['@spot', circ(22, -7, 1.6)]],
      };
    },
  });
})();
