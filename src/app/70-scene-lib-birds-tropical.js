/* ============================================================
   SCENE LIBRARY: birds, the TROPICAL kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only.

   bird.egret-flight   a little egret in flight: all white, a neck folded back into an S, long
                       black legs trailing, broad rounded wings that flap slowly (1 variant)
   bird.kite-brahminy  the Brahminy kite of Southeast Asian harbours, soaring: chestnut wings
                       and tail with dark tips, a white head and breast; a slow, shallow
                       flap between glides (2 variants: adult, juvenile brown)
   Face RIGHT. Anchor: the body centre.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { ell, define } = sceneDraw;
  define({
    id: 'bird.egret-flight', category: 'bird', size: [70, 34], variants: 1, seasonal: false, flippable: true, parts: ['wingFar', 'body', 'wings'],
    palette: { base: { white: '#fbfbf8', shade: '#dfe2e2', leg: '#1e2224', bill: '#2a2a28', foot: '#d8c040' } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [-0.5, 1], period: 1.1 } },
    tags: ['egret', 'heron', 'waterbird', 'flight', 'kit:birds', 'kit:tropical', 'kit:water', 'role:bird'],
    credit: 'native (scene engine pilot)',
    build() {
      return {
        wingFar: [['@shade', 'M-6-2Q-10-14-20-18Q-14-8-10 0z']],
        body: [{ s: '@leg', w: 1.2, d: 'M-14 1L-34 3M-14 2L-34 5' }, ['@foot', ell(-34, 4, 1.4, 1.1)],
          ['@white', 'M-16 2Q-4-4 10-3Q16-2 16 1Q6 5-16 2z'], ['@white', 'M12-2Q20-2 20-6Q20-10 24-10Q28-10 28-8Q24-8 22-6Q22 0 12 0z'],
          ['@bill', 'M27-9.6L36-8.6L27-7.6z'], ['@shade', 'M-14 2Q0 4 14 0Q4 3-14 2z']],
        wings: [['@white', 'M-6-2Q-2-16 8-22Q16-26 24-26Q18-18 14-10Q8-2 6-1z'], ['@shade', 'M2-6Q8-14 14-18Q10-10 8-4z', 0.8]],
      };
    },
  });
  define({
    id: 'bird.kite-brahminy', category: 'bird', size: [84, 30], variants: 2, seasonal: false, flippable: true, parts: ['wingFar', 'body', 'wings'],
    palette: { base: { wing: ['#a8502a', '#7a5a3a'], wingD: ['#7a3618', '#5a4028'], tip: '#2a1e18', head: ['#f6f2ea', '#c8b08a'], bill: '#e0c040' } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [0.2, 1], period: 2.2 } },
    tags: ['kite', 'raptor', 'harbour', 'flight', 'kit:birds', 'kit:tropical', 'kit:water', 'role:bird'],
    credit: 'native (scene engine pilot)',
    build(v) {
      return {
        wingFar: [[`@wingD.${v}`, 'M-4-2Q-10-10-24-14Q-34-16-40-14Q-26-8-14 0z'], ['@tip', 'M-34-15L-42-14L-36-11z']],
        body: [[`@wing.${v}`, 'M-18 0L-30-3L-30 3L-18 3z'], [`@wing.${v}`, 'M-18 0Q-6-5 10-4Q16-3 18 0Q8 4-18 3z'], [`@head.${v}`, 'M4-3Q12-6 18-3Q20 0 14 2Q8 3 4 1z'], ['@bill', 'M18-2.6L22-1L18 0z']],
        wings: [[`@wing.${v}`, 'M-6-2Q0-12 12-18Q24-24 38-26Q30-18 22-12Q12-4 6-1z'], [`@wingD.${v}`, 'M8-6Q16-14 26-19Q20-10 14-5z', 0.8], ['@tip', 'M32-24L40-26L34-20z']],
      };
    },
  });
})();
