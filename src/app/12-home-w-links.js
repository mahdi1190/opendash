/* ============================================================
   HOME widget "links": Suggested links. The card itself belongs to
   Auto-linking (autolinkHomeCard in 66-autolink.js, styles in
   66-autolink.css); Home only gives it a place. Nothing to show = hidden.
   Hidden by default (housekeeping, not "today"): it waits in Add widget.
   Owner: HB4 (wrapper only).
   ============================================================ */
registerHomeWidget({
  id: 'links', title: 'Suggested links', icon: 'wand-sparkles', order: 40, defaultHidden: true,
  description: 'Folders, meetings and people found for your tasks, to accept or reject',
  emptyHint: 'Appears when there are links to review',
  sizes: ['s', 'm', 'l'], defaultSize: 'm',
  available: () => typeof autolinkHomeCard === 'function',
  render(el) {
    autolinkHomeCard(el);
    return !!el.firstElementChild;
  },
});
