/* Low breaking Gulf surf in the two open shore margins, clear of the fishing pier. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, ell, f1: F } = sceneDraw;
  define({
    id: 'water.texas-shore-surf', category: 'water', size: [1920, 78], variants: 1, seasonal: false, flippable: false,
    parts: ['wash', 'foam'], palette: { base: { foam: '#e6ead3', water: '#c5d6ca' } },
    anim: { bob: { part: 'wash', dy: 2.3, period: 5.4 }, flicker: { part: 'foam', op: [.38, .78], period: 6.7 } },
    tags: ['texas', 'gulf', 'surf', 'kit:water', 'role:edge'],
    build(v, r) {
      const wash = [
        ['@water', 'M-960-16Q-826-39-688-22T-350-14L-350-8Q-555-19-688-15T-960-9Z', .4],
        ['@water', 'M365-15Q570-46 745-24T960-26V-18Q852-11 745-17T365-8Z', .36],
      ], foam = [
        ['@foam', 'M-960-11Q-822-32-688-16T-350-7V-4Q-552-8-688-11T-960-7Z', .8],
        ['@foam', 'M365-7Q559-37 743-17T960-20V-17Q839-8 743-13T365-3Z', .8],
        { s: '@foam', w: 1.4, op: .6, d: 'M-940-41q54-8 113-4M-772-36q81-2 137 5M-578-28q57 4 105 2M421-31q79-12 147-13M610-43q75 0 123 8M812-32q60 8 121 3' },
      ];
      let bubbles = '';
      for (let j = 0; j < 74; j++) { const right = j % 2, x = right ? 365 + r() * 595 : -960 + r() * 610, y = -10 + r() * 11 - (right ? Math.sin((x - 365) / 595 * Math.PI) * 13 : Math.sin((x + 960) / 610 * Math.PI) * 6); bubbles += ell(x, y, 1 + r() * 3.5, .6 + r() * 1.5); }
      foam.push({ f: '@foam', d: bubbles, op: .6, detail: true });
      return { wash, foam };
    },
  });
})();
