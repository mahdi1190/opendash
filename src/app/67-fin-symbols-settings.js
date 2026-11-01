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
  id: 'money-look', title: 'Money', icon: 'wallet', order: 46,
  description: 'What counts, and how your payments look.',
  render(el) {
    // Count pending payments: the server's choice, so every computer and every total follows it (lib/finance/pending.mjs).
    const cp = _settingsRow('Count pending payments', 'Payments your bank has not finished yet count as spending straight away. Off: they still show in Transactions, and count once they settle.', null);
    el.appendChild(cp);
    fetch('/api/finance/count', { headers: { Accept: 'application/json' } }).then(r => r.json()).then((j) => {
      const sw = _settingsSwitch(j.countPending !== false, 'Count pending payments', async (on) => {
        let r = null;
        try { r = await fetch('/api/finance/count', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ countPending: on }) }); } catch (e) { /* below */ }
        if (!r || !r.ok) {
          const b = r ? await r.json().catch(() => null) : null;
          toast(r && r.status === 409 ? 'An update is running. Try again when it finishes.' : (b && b.error) || 'Couldn’t reach Freeflo. Open it from your shortcut, then try again.', { kind: 'err' });
          return;
        }
        sw.setAttribute('aria-checked', on ? 'true' : 'false');
        toast(on ? 'Pending payments count now' : 'Pending payments no longer count until they settle', { icon: 'circle-check' });
        try { if (window.FinanceView && window.FinanceView.refresh) window.FinanceView.refresh(); } catch (e) { /* not loaded */ }
      });
      const slot = cp.querySelector('.set-c') || cp;
      slot.appendChild(sw);
    }).catch(() => {});
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
