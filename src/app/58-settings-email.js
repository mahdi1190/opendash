/* ============================================================
   Settings > Reading your email (2.35): the choices of 55-email-reading.js, on one card.
   ============================================================ */
registerSettingsGroup({
  id: 'email', title: 'Reading your email', icon: 'mail', order: 31,
  description: 'How much Freeflo reads, how often, and what it suggests.',
  render(el) { _emReadSettings(el); },
});
function _emReadSettings(el) {
    const p = emailReadPrefs(), c = _settingsCard('How much it reads', 'Pick a level, or change any choice below. Nothing is added to your calendar without you.');
    el.appendChild(c.card);
    const redo = (patch) => { emailReadSet(patch); el.textContent = ''; _emReadSettings(el); };
    const row = (label, hint, opts, cur, key, conv) => { const s = _settingsSelect(opts, String(cur), (v) => redo({ [key]: conv ? conv(v) : v })); s.setAttribute('aria-label', label); c.body.appendChild(_settingsRow(label, hint, s)); };
    const lv = emailReadLevel(p);
    const lvl = _settingsSelect(EMAIL_READ_LEVEL_NAMES, lv, (v) => { if (EMAIL_READ_LEVELS[v]) redo(EMAIL_READ_LEVELS[v]); });
    lvl.setAttribute('aria-label', 'Level');
    c.body.appendChild(_settingsRow('Level', 'Light uses the least of your Claude allowance. Thorough uses the most.', lvl));
    row('How often it looks', 'While Freeflo is open. Suggest tasks on the Email page always works.', EMAIL_READ_EVERY, p.every, 'every');
    const days = _settingsSelect(EMAIL_READ_DAYS, String(p.days), (v) => { redo({ days: Number(v) }); if (typeof InboxStore !== 'undefined' && InboxStore.update) InboxStore.update({ force: true, quiet: true, body: { days: Number(v) } }); });
    days.setAttribute('aria-label', 'How far back');
    c.body.appendChild(_settingsRow('How far back', 'Your inbox folder, on every account you connected. Outlook and other email stop at a month.', days));
    row('How many at a time', 'More catches more, and uses more of your Claude allowance.', EMAIL_READ_BATCH, p.batch, 'batch', Number);
    row('How sure before suggesting', 'Sets how much it takes for an email to become a suggestion.', EMAIL_READ_PICKY, p.picky, 'picky');
    row('Adding tasks', 'Calendar events always ask first.', EMAIL_READ_AUTO, p.auto, 'auto');
    const tick = (label, hint, key) => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!p[key]; i.setAttribute('aria-label', label); i.onchange = () => redo({ [key]: i.checked }); c.body.appendChild(_settingsRow(label, hint, i)); };
    tick('Suggest calendar events', 'Meetings and appointments with a clear date.', 'calendar');
    tick('Skip automatic email', 'Newsletters, promotions and no-reply senders are left out before Claude reads anything.', 'bulk');
    tick('Only people I know', 'Only read email from people in your People list.', 'known');
    const ta = document.createElement('textarea'); ta.className = 'control'; ta.rows = 3; ta.value = p.ignore; ta.placeholder = 'someone@example.org\nexample.org'; ta.setAttribute('aria-label', 'Never read email from');
    ta.onchange = () => emailReadSet({ ignore: ta.value });
    c.body.appendChild(_settingsRow('Never read email from', 'Addresses or whole domains, one per line. Claude never sees these.', ta));
}
