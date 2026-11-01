/* ============================================================
   OWED TO ME, with friends on Freeflo. Sharing one person's part with them: only on your press, on a screen that shows exactly
   what goes (lib/owed-friends.mjs builds the message; the page never does). They see it, and can tap "I've paid", which comes
   back here as a question for you. Everything from a friend is untrusted text: esc() for all of it.
   ============================================================ */
function owdFriends() { try { return typeof Friends !== 'undefined' ? Friends.list() : []; } catch (e) { return []; } }
/** The friend with this person's name, or the one you shared with before. */
function owdFriendFor(key, name) {
  const list = owdFriends(), n = String(name || '').trim().toLowerCase();
  const had = ((OWD.data && OWD.data.shares) || []).find(x => x.key === key);
  return (had && list.find(f => f.id === had.friend)) || (n ? list.find(f => friendName(f).trim().toLowerCase() === n || String(f.name || '').trim().toLowerCase() === n) : null) || null;
}
function owdShareOf(t, l) { return ((OWD.data && OWD.data.shares) || []).find(x => x.id === t.id && x.key === l.key) || null; }
function owdFriendNameById(id) { const f = owdFriends().find(x => x.id === id); return f ? friendName(f) : 'Your friend'; }
/** What they owe in the money it was paid in, and in yours. */
function owdPartWords(t, l) { const home = l.left > 0 ? l.left : l.owes; return owdBoth(home, t, t.fx && l.fx ? Math.round(l.fx * (home / l.owes) * 100) / 100 : 0); }

/** Says exactly what goes, and sends only when you press the button. */
function owdShareDialog(t, l) {
  const friends = owdFriends();
  if (!friends.length) { toast('Nobody to share with yet. Add a friend in Friends first.', { icon: 'users' }); return; }
  const match = owdFriendFor(l.key, l.name);
  const first = owdFirstName(l.name);
  let target = match ? match.id : (friends.length === 1 ? friends[0].id : '');
  const what = _xInput('text', t.title, 'What to call it', { maxLength: 80 });
  const who = _xe('select', 'xp-in'); who.setAttribute('aria-label', 'Who this is on Freeflo');
  who.innerHTML = `<option value="">Choose…</option>${friends.map(f => `<option value="${escAttr(f.id)}">${esc(friendName(f))}</option>`).join('')}`;
  who.value = target; who.onchange = () => { target = who.value; };
  openDialog({
    title: `Share with ${first} on Freeflo?`, size: 'sm', className: 'owd-dlg',
    body(el) {
      el.className += ' xp-form owd-form';
      el.appendChild(_xe('p', 'xp-fh', `${esc(first)} sees just their part in Freeflo, and can tap “I’ve paid”. You’re asked before anything is marked.`));
      if (!match) el.appendChild(_xField('Who is this on Freeflo?', who));
      const card = _xe('div', 'owd-share-card');
      card.appendChild(_xe('b', 'owd-share-t', `${esc(first)} will see only this`));
      card.appendChild(_xField('What it’s called', what, 'Change it if it says anything they shouldn’t see.'));
      const nums = _xe('div', 'owd-share-n');
      nums.appendChild(_xe('b', 'num', esc(owdPartWords(t, l))));
      nums.appendChild(_xe('span', '', esc(_xpDate(t.date))));
      card.appendChild(nums);
      el.appendChild(card);
      el.appendChild(_xe('p', 'xp-fh', 'They won’t see what anyone else owes, the whole amount, the bank payment or anything else about your money.'));
      el.appendChild(_xe('p', 'xp-fh', 'If their Freeflo is out of date they won’t see it, and nothing breaks. You can still remind them the usual way.'));
    },
    actions: [{ label: 'Cancel' }, { label: `Send to ${first}`, primary: true, icon: 'send', run: async () => {
      if (!target) { who.focus(); toast('Choose who this is on Freeflo.', { kind: 'err' }); return false; }
      const name = what.value.trim();
      if (!name) { what.focus(); toast('Say what to call it.', { kind: 'err' }); return false; }
      const j = await owdDo('/share', { id: t.id, key: l.key, friend: target, what: name }, { quiet: true, what: 'share that' });
      if (!j) return false;
      toast(j.sent ? `Sent to ${first}` : `On its way: ${first} gets it when their Freeflo is next online`, { icon: 'send', timeout: 9000, action: { label: 'Undo', run: () => owdDo('/share/stop', { ref: j.ref }, { done: 'Taken back', icon: 'undo-2', what: 'take that back' }) } });
      return undefined;
    } }],
  });
}
/** What friends have shared with you, on your Owed to me page. */
function _owFromFriends(d) {
  const list = (d.inbox || []).slice(0, 8);
  if (!list.length) return [];
  return list.map(e => {
    const name = owdFriendNameById(e.from), first = owdFirstName(name);
    const c = _xe('div', 'owd-from card' + (e.closed ? ' is-closed' : e.said ? ' is-said' : ''));
    const money = `${owdAmt(e.amount, e.cur)}${e.alt ? ` <small>(${owdAmt(e.alt.amount, e.alt.cur)})</small>` : ''}`;
    const sub = e.closed === 'paid' ? `${esc(first)} has marked this as paid` : e.closed === 'gone' ? `${esc(first)} took this back` : e.said ? `You told ${esc(first)} you’ve paid. They’re checking.` : `${esc(first)} says you owe this, ${esc(_xpDate(e.date))}`;
    c.innerHTML = `${icon('users')}<span class="owd-from-t"><b>${esc(e.what)}</b><small>${sub}</small></span><b class="num owd-from-am">${money}</b>`;
    const a = _xe('div', 'owd-ask-a');
    const key = { from: e.from, ref: e.ref };
    if (e.closed) a.appendChild(uiButton({ label: 'Hide', size: 'sm', kind: 'ghost', run: () => owdDo('/inbox/hide', key, { quiet: true, what: 'hide that' }) }));
    else if (e.said) a.appendChild(uiButton({ label: 'Undo', size: 'sm', kind: 'ghost', tip: `Tell ${first} you haven’t paid after all`, run: () => owdDo('/inbox/paid', { ...key, on: false }, { quiet: true, what: 'change that' }) }));
    else {
      a.appendChild(uiButton({ label: 'I’ve paid', icon: 'circle-check', size: 'sm', kind: 'primary', tip: `This tells ${first}. It doesn’t move any money.`, run: () => owdDo('/inbox/paid', { ...key, on: true }, { done: `${first} has been told`, icon: 'send', what: 'tell them' }) }));
      a.appendChild(uiButton({ label: 'Hide', size: 'sm', kind: 'ghost', run: () => owdDo('/inbox/hide', key, { quiet: true, what: 'hide that' }) }));
    }
    c.appendChild(a);
    return c;
  });
}
function owdInboxOpen() { return ((OWD.data && OWD.data.inbox) || []).filter(e => !e.closed && !e.said).length; }
/** Something arrived from a friend: read it again a moment later (the server keeps it first). */
function _owdFriendsListen() {
  const again = () => setTimeout(() => owdLoad(true), 900);
  try {
    Friends.on('owed:share', (m, f) => { again(); toast(`${f ? friendName(f) : 'A friend'} shared something you owe them`, { icon: 'users', timeout: 9000, action: { label: 'See it', run: owdOpen } }); });
    Friends.on('owed:paid', () => again());
    Friends.on('owed:close', () => again());
  } catch (e) { /* no friends here */ }
}
setTimeout(_owdFriendsListen, 3000);
