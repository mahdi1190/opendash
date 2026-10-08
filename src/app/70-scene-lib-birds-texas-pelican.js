/* Brown pelican in slow flight, the Gulf fishing coast's distinctive low flyer. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, ell } = sceneDraw;
  define({
    id: 'bird.texas-brown-pelican', category: 'bird', size: [165, 69], variants: 3, seasonal: false, flippable: true,
    parts: ['wingFar', 'body', 'wings'], palette: { base: { back: ['#655d51', '#817969', '#bbb7a3'], neck: '#e0d6b2', bill: ['#c7ad7e', '#9f8766'], dark: '#3b4545' } },
    anim: { flap: { part: 'wings', pivot: [0, -4], sy: [.28, 1], period: 1.6 } }, reflect: true,
    tags: ['texas', 'gulf', 'pelican', 'kit:birds', 'kit:water', 'role:bird'],
    build(v) {
      return {
        wingFar: [['@back.1', 'M-5-6Q-20-48-72-42L-55-32-64-31-42-21-52-22-25-9Z']],
        body: [['@back.0', 'M-29 1Q-23-12 2-12L17-6Q29-8 31-17L35-19Q40-3 27 4L7 9-18 7Z'], ['@back.2', 'M-24-4Q-10-12 7-8L15-3Q-8-4-24-4Z', .68], ['@dark', 'M-26 1L-43 8-40 12-18 7Z'], ['@neck', 'M18-5Q29-5 30-21Q32-30 40-27L45-22 39-18 34-15Q34 0 25 5Z'], ['@bill.0', 'M43-24L81-13 42-16Z'], ['@bill.1', 'M43-16L77-13Q58-2 43-16Z'], ['@dark', ell(39, -23, 1.4, 1.4)]],
        wings: [['@back.0', v === 1 ? 'M-8-6Q-25-24-80-19L-70-13-80-10-67-8-74-4-58-4-64 0-42-2-49 2-26 0Z' : v === 2 ? 'M-8-6Q-17-53-58-66L-57-52-68-59-60-44-68-47-58-32-66-35-48-21-56-23-32-10Z' : 'M-8-6Q-22-43-73-60L-68-48-78-51-69-38-77-42-65-29-73-32-56-20-63-24-40-12-48-16-24-5Z'], ['@back.1', v === 1 ? 'M-8-8Q-29-19-65-17Q-36-9-24-5Z' : 'M-8-8Q-25-35-65-50Q-36-32-24-8Z'], { s: '@back.2', w: 1.3, d: 'M-22-15L-42-30M-29-14L-51-30M-38-15L-59-31', detail: true }],
      };
    },
  });
})();
