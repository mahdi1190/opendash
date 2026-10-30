/* ============================================================
   SETTINGS > MONEY LOOK (owner: Finance symbols): company logos on or off, and a merchant's own pictures.
   The switch is state.homeUI.noLogos, a UI key that follows the person to their other computers.
   Sorted after 57-settings.js and before 67-fin-symbols.js, which reads it at draw time.
   ============================================================ */
function finLogosSet(on) {
  if (!state.homeUI || typeof state.homeUI !== 'object') state.homeUI = {};
  if (on) delete state.homeUI.noLogos; else state.homeUI.noLogos = true;
  if (typeof saveUI === 'function') saveUI();
  if (typeof render === 'function') render();
}
if (typeof registerSettingsGroup === 'function') registerSettingsGroup({
  id: 'money-look', title: 'Money look', icon: 'wallet', order: 46,
  description: 'How your payments look: company logos and your own pictures.',
  render(el) {
    const FS = window.FinSymbols;
    const on = !FS || FS.logosOn();
    const sw = _settingsSwitch(on, 'Show company logos', (v) => finLogosSet(v));
    const row = _settingsRow('Show company logos', 'Off: our own symbols instead, with each company’s colours.', sw);
    el.appendChild(row);
    const note = document.createElement('p'); note.className = 'set-h set-foot';
    note.textContent = 'Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied. They are stored inside Freeflo, so nothing online ever learns where you shop.';
    el.appendChild(note);
    const own = document.createElement('p'); own.className = 'set-h set-foot';
    own.textContent = 'To use your own picture for a shop, open one of its payments in Transactions and choose Use my own picture. Your pictures stay on this computer.';
    el.appendChild(own);
  },
});
/** A task about paying a known vendor gets that vendor's small tile beside its title (a node, or null). */
function finTaskTile(title) {
  const FS = window.FinSymbols;
  if (!FS || typeof FS.vendorInText !== 'function') return null;
  const v = FS.vendorInText(title);
  if (!v) return null;
  const t = document.createElement('template');
  t.innerHTML = FS.merchantSymbol(v.name, null, { size: 'xs', badge: false, live: false, cls: 'fsym-task', label: v.name }).trim();
  return t.content.firstElementChild;
}
