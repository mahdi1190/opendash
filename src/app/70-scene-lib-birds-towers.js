/* ============================================================
   SCENE LIBRARY: birds, the TOWERS kit (big-city harbours and rivers; docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only.

   bird.gull   a herring gull in flight: long narrow wings with a bend at the wrist, a pale
               grey back, black wingtips with a white spot, a white body and tail, a yellow
               bill. The wings flap from the shoulder (2 variants: adult grey, first-winter
               mottled brown). Faces RIGHT. Anchor: the body centre.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { ell, define } = sceneDraw;
  define({
    id: 'bird.gull', category: 'bird', size: [64, 30], variants: 2, seasonal: false, flippable: true, parts: ['wingFar', 'body', 'wings'],
    palette: { base: { back: ['#c4ccd4', '#a8907a'], backD: ['#98a2ac', '#86705e'], white: '#fbfcfc', belly: '#e4e8ea', tip: '#1e2226', bill: '#e8c040', eye: '#2a2a2a' } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [-0.6, 1], period: 0.7 } },
    tags: ['gull', 'seabird', 'harbour', 'flight', 'kit:birds', 'kit:towers', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const wingFar = [[`@backD.${v}`, 'M-2-2Q-8-12-18-16Q-26-18-32-14Q-20-12-10-2z'], ['@tip', 'M-24-16Q-30-18-34-14L-28-14z']];
      const body = [['@belly', 'M-16 0Q-6-6 10-5Q20-4 24-1Q18 4 6 4Q-8 4-16 0z'], ['@white', 'M-16 0Q-8-5 8-5Q18-4 22-2Q10 0-16 0z'], ['@white', ell(20, -2.4, 4.4, 3.4)],
        ['@bill', 'M24-2.6L30-1.6L24-0.6z'], ['@eye', ell(21.4, -3.2, 0.7, 0.7)], ['@white', 'M-16 0L-24-2L-22 2z']];
      const wings = [[`@back.${v}`, 'M-4-2Q2-12 12-18Q20-22 30-24Q24-18 16-12Q8-4 6-2z'], [`@backD.${v}`, 'M4-3Q10-10 16-13Q10-6 8-3z'],
        ['@tip', 'M22-21Q28-24 32-24Q26-18 20-16z'], ['@white', ell(27, -22, 1.2, 0.9)], ['@white', 'M-4-2Q4-6 8-3', 0.8]];
      return { wingFar, body, wings };
    },
  });
})();
