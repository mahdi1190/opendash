/* ============================================================
   SUGGESTION MS: last month as a money story (owner: MS, the money story)
   ------------------------------------------------------------
   User request, 3 Oct: a finance summary story "similar to how Monzo does
   it". On the 1st to the 3rd of a month, Home (and the morning story) offer
   the month just gone as the money story (src/finance/28-money-story.js):
   full screen, read aloud, nothing changes.
     primary    "Play September": the story itself
     secondary  "Open Finances"
   No quick "✓": there is nothing to apply. Dismissible like every card; the
   key carries the month, so "Not for this one" lasts for that month only.
   Reads only ctx.money ({ok, known, offer: {due, ref, month, days, key}}),
   which the page's snapshot fills from window.MoneyStory.status().
   PURE: lib/suggest-logic.mjs loads this file for the tests.
   ============================================================ */
/** The card for ctx, or null (no money data, or not the first days of a month). */
function sgMoneyStoryCard(ctx) {
  const m = ctx && ctx.money;
  if (!m || !m.ok || !m.offer || !m.offer.due || !/^\d{4}-\d{2}-\d{2}$/.test(String(m.offer.ref || ''))) return null;
  const o = m.offer;
  const month = sgClip(String(o.month || 'Last month'), 20);
  return {
    key: 'money-story:' + o.ref.slice(0, 7),
    title: `${month} in money`,
    text: `Play last month as a short story: what went out, where it went and what you kept.`,
    why: [`${month} is done: all ${Number(o.days) || 30} days to look back on`, 'Read aloud, about a minute'],
    preview: 'Opens the money story full screen and reads it out. Nothing changes.',
    primary: { label: `Play ${month}`, icon: 'sparkles', action: { type: 'nav', args: { to: 'story', kind: 'money', period: 'month', ref: o.ref } } },
    secondary: [{ label: 'Open Finances', action: { type: 'nav', args: { to: 'view', view: 'finance' } } }],
    icon: 'wallet', scene: 'finance', urgency: 0.9,
    claims: ['story:money:' + o.ref.slice(0, 7)],
  };
}
sgRegisterRule({
  id: 'money-story',
  area: 'money',
  title: 'Last month as a money story',
  description: 'On the first three days of a month, offers the month just gone as a short story: what went out, where it went and what you kept.',
  value: 3,
  defaultOn: true,
  needs: ['server'],
  hours: 'any',
  surfaces: ['home', 'story-morning'],
  cooldown: { notFor: 25 },
  run(ctx) { const c = sgMoneyStoryCard(ctx); return c ? [c] : []; },
});
