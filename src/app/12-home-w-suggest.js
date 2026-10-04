/* ============================================================
   HOME widget "suggest": Suggestions (SUGGESTIONS_CATALOGUE.md 3.10).
   OWNER: Suggestions engine. The engine and the card live in
   68-suggest-*.js (rules, snapshot, actions, the shared card); this file only
   registers the widget (12-home-w-* files load before 12-home.js, so they
   may only declare things). Each card's button opens the normal editor
   prefilled (the user adjusts, then Saves); its small ✓ does it at once,
   with Undo. At most "How many on Home" (Settings > Suggestions) at a time;
   a card shown in the Today hero or in place by another widget (Today's
   schedule shows S1 on its gaps) is not repeated here.
   S = one-line rows; M = cards in a column; L / Full = 2-3 cards a row.
   ============================================================ */
registerHomeWidget({
  id: 'suggest', title: 'Suggestions', icon: 'lightbulb', order: 35, group: 'tasks',
  description: 'Ideas that do the thing: block a free stretch, plan, follow up. One click opens it ready to adjust; ✓ does it now',
  emptyHint: 'Appears when there is something worth doing',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 'full', fresh: true,
  aliases: ['suggestions', 'ideas', 'recommendations', 'what should i do', 'next steps', 'nudges'],
  render(el, ctx) { return typeof sgHomeWidgetRender === 'function' ? sgHomeWidgetRender(el, ctx) : false; },
});
