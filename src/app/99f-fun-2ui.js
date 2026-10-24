/* ============================================================
   FUN WITH FRIENDS (2.17), what you see (owner: agent 'fun').
     hangout panels   Your week with friends (Sundays and Mondays), the
                      seasonal event (Trick or treat: the bag of sweets,
                      dressing up, knocks to answer, doors to knock on),
                      Gifts and stickers (gifts to unwrap, quests this week)
     a friend's page  You two: the duo streak, this week's friendship
                      quests, the friendship level rewards, the card theme
                      and your high-five style
     dialogs          Send a gift (with Undo), the unwrap, the sticker book,
                      answer a knock, the weekly recap
     the feed         reactions (allow-listed emoji), Unwrap, Answer
     motion           waves, high-fives (one per unlocked style), emotes,
                      the double high-five; none with reduced motion or
                      the game's Fun level Off
   Every label comes from 99f-fun-0rules.js or is static; friends' names
   are set with textContent. These files load after 99-boot.js (var state).
   ============================================================ */
var _funUI = { fx: 0 };

/* ---------- small pieces ---------- */
function _funFriendLevel(f) { const x = f && f.id ? funFor(f.id) : null; return Math.max(1, Number((x && x.level) || (f && f.friendship && f.friendship.level)) || 1); }
function _funAvatar(f, size) {
  if (typeof friendAvatarEl === 'function') { try { return friendAvatarEl(f, size); } catch (e) { /* initials below */ } }
  const s = _funEl('span', 'fun-av', typeof avatarInitials === 'function' ? avatarInitials(_funName(f)) : '?');
  s.style.setProperty('--size', (size || 28) + 'px');
  return s;
}
function _funBar(n, of) {
  const bar = _funEl('div', 'fun-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(of)); bar.setAttribute('aria-valuenow', String(n));
  const i = _funEl('i'); i.style.setProperty('--pct', Math.max(0, Math.min(100, of ? (n / of) * 100 : 0)).toFixed(1) + '%');
  bar.appendChild(i);
  return bar;
}
function _funDateRange(from, to) {
  const o = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  try { return `${new Date(from + 'T12:00:00Z').toLocaleDateString(undefined, o)} to ${new Date(to + 'T12:00:00Z').toLocaleDateString(undefined, o)}`; } catch (e) { return `${from} to ${to}`; }
}
/**
 * The loading line (with Cancel) or the error line (with Try again) a panel shows before the data is here.
 * Cancel really stops: nothing loads again until Try again.
 */
function _funWaitEl(after) {
  const el = _funEl('div', 'fun-wait');
  const retry = () => { _fun.err = null; _fun.stopped = false; funLoad(true).then(after, after); };
  if (_fun.err || _fun.stopped) {
    if (_fun.err) { el.classList.add('is-err'); el.innerHTML = icon('circle-alert', 'i-sm'); }
    el.appendChild(_funEl('span', _fun.err ? null : 'muted', _fun.err ? `Couldn’t load Fun with friends: ${netErrorReason(_fun.err)}.` : 'Stopped. Nothing is loading.'));
    el.appendChild(_funBtn('Try again', { sm: true, icon: 'refresh-cw', run: (e, b) => { b.disabled = true; retry(); } }));
    return el;
  }
  el.innerHTML = icon('loader-circle', 'i-sm fr-spin');
  el.appendChild(_funEl('span', 'muted', 'Getting the fun ready…'));
  el.appendChild(_funBtn('Cancel', { sm: true, kind: 'btn-ghost', run: () => { _fun.stopped = true; funCancelLoad(); after(); } }));
  if (!_fun.loading) funLoad(true).then(after, after);
  return el;
}
/** A friend the server does not list yet (just approved, or Friends still starting): a calm line, one look again later. */
function _funNotYet(f) {
  _funRefreshSoon(8000);
  return _funEl('p', 'muted', `Fun with ${_funFirst(f)} starts in a moment: their OpenDash and yours are still saying hello.`);
}

/* ---------- the actions popover (the friend card's 👋) ---------- */
function funActionsMenu(anchor, f) {
  const x = funFor(f.id) || {};
  const used = x.used || {};
  const ev = funEventNow();
  const h5 = funItem('high5', (_fun.data && _fun.data.prefs && _fun.data.prefs.high5) || 'classic') || FUN_HIGH5[0];
  openPopover(anchor, (el, close) => {
    el.classList.add('fun-pop');
    el.appendChild(_funEl('div', 'pop-label', `Fun with ${_funFirst(f)}`));
    const row = (e, label, sub, run, disabled) => {
      const b = _funBtn('', { raw: true, cls: 'fun-pop-i', disabled, run: () => { close(); run(); } });
      b.appendChild(_funEl('span', 'fun-e', e));
      const t = _funEl('span', 'fun-pop-t');
      t.appendChild(_funEl('b', null, label));
      if (sub) t.appendChild(_funEl('span', 'muted', sub));
      b.appendChild(t);
      el.appendChild(b);
    };
    row('👋', 'Wave', 'Say hi', () => funWave(f, 'wave', { anchor }));
    row(h5.e, 'High five', h5.id !== 'classic' ? h5.label : 'If they high-five back within ten minutes: a double', () => funWave(f, 'high5', { anchor }));
    row('💭', 'Thinking of you', used.nudge >= 1 ? 'Sent today' : 'Once a day', () => funWave(f, 'nudge', { anchor }), used.nudge >= 1);
    row('🎁', 'Send a gift', 'A sticker, an emote or an avatar item', () => funGiftDialog(f));
    if (ev) {
      const k = (x.knock || []).find(y => y.dir === 'in' && !y.ans);
      if (k) row(ev.def.treat.e, 'Answer their knock', `${_funFirst(f)} knocked: treat or trick?`, () => funAnswerDialog(f));
      row(ev.def.knock.e, ev.def.knock.label, used.knock >= 1 ? 'Knocked today' : `${ev.def.label}: once a day`, () => funKnock(f, 'knock', { anchor }), used.knock >= 1);
    }
  }, { align: 'end' });
}

/* ---------- reactions on the feed ---------- */
function funReactBar(e, f) {
  const bar = _funEl('div', 'fun-react');
  const paint = (rv) => {
    bar.textContent = '';
    const counts = rv && rv.counts ? rv.counts : {};
    for (const re of FUN_REACTIONS) {
      const n = Number(counts[re.id]) || 0;
      if (!n) continue;
      const mine = !!(rv && rv.mine === re.id);
      const who = ((rv.who && rv.who[re.id]) || []).map(k => (k === 'me' ? 'You' : _funFirst(Friends.get(k) || { name: 'A friend' }))).join(', ');
      const chip = _funBtn('', { raw: true, cls: 'fun-react-c' + (mine ? ' is-mine' : ''), tip: `${who}: ${re.label}`, aria: `${re.label}, ${n}${mine ? ', yours: take it back' : ''}`, run: (ev, b) => toggle(re.id, !mine, b) });
      chip.appendChild(_funEl('span', 'fun-e', re.e));
      if (n > 1) chip.appendChild(_funEl('span', 'num', String(n)));
      bar.appendChild(chip);
    }
    const add = _funBtn('', { raw: true, cls: 'fun-react-add', tip: 'React', aria: 'React', run: (ev, b) => openPopover(b, (el, close) => {
      el.classList.add('fun-react-pop');
      for (const re of FUN_REACTIONS) {
        const p = _funBtn('', { raw: true, cls: 'fun-react-pick', tip: re.label, aria: re.label, run: () => { close(); toggle(re.id, true, b); } });
        p.appendChild(_funEl('span', 'fun-e', re.e));
        el.appendChild(p);
      }
    }, { align: 'start' }) });
    add.innerHTML = icon('plus', 'i-xs');
    bar.appendChild(add);
  };
  const toggle = async (id, on, anchor) => {
    bar.classList.add('is-busy');
    const r = await funReact(f, e.id, id, on);
    bar.classList.remove('is-busy');
    paint(r ? r.reacts : ((_fun.data && _fun.data.reacts) || {})[e.id]);
    if (r && on && _funPlayful()) { const it = funItem('reaction', id); if (it) funFxFloat(it.e, { anchor, small: true }); }
  };
  paint(((_fun.data && _fun.data.reacts) || {})[e.id] || null);
  return bar;
}

/* ---------- gifts ---------- */
function _funOwnedCosmetics() {
  const out = {};
  if (typeof profileLockOf !== 'function') return out;
  const ctx = typeof profileUnlockCtx === 'function' ? profileUnlockCtx() : {};
  for (const c of FUN_COSMETICS) { try { if (!profileLockOf(c.k, c.item, ctx)) out[c.id] = true; } catch (e) { /* not this one */ } }
  return out;
}
function _funBox(wrap, size) {
  const b = _funEl('span', 'fun-box fun-wrap-' + (funItem('wrap', wrap) ? wrap : 'red'));
  b.style.setProperty('--s', (size || 64) + 'px');
  b.setAttribute('aria-hidden', 'true');
  b.append(_funEl('i', 'fun-box-lid'), _funEl('i', 'fun-box-body'), _funEl('i', 'fun-box-bow'));
  return b;
}
/** Send a gift: pick a friend, a sticker / emote / avatar item, the paper and a tag. It leaves after 5 s (Undo). */
function funGiftDialog(f, pre) {
  const list = (window.Friends && Friends.list()) || [];
  if (!list.length) { toast('Add a friend first: gifts go to friends.', { icon: 'gift', action: { label: 'Add a friend', run: () => { if (typeof friendsAddDialog === 'function') friendsAddDialog(); } } }); return; }
  const ev = funEventNow();
  const st = { to: f && f.id ? f.id : list[0].id, t: (pre && pre.t) || 'sticker', item: (pre && pre.item) || '', wrap: ev ? ev.def.wrap : 'red', line: ev ? ev.def.line : 'because' };
  const owned = _funOwnedCosmetics();
  openDialog({
    title: 'Send a gift', size: 'md', fixed: true,   // it repaints as you choose: the dialog keeps its size
    
    body(el, close) {
      el.classList.add('fun-giftdlg');
      const paint = () => {
        el.textContent = '';
        const to = Friends.get(st.to) || list[0];
        const ctx = { level: _funFriendLevel(to), event: ev ? ev.def.id : '', book: (_fun.data && _fun.data.book) || {}, owned };
        if (funCanSend('wrap', st.wrap, ctx)) st.wrap = 'red';   // a paper this friendship has not opened yet
        // to
        const tr = _funEl('div', 'fun-g-to');
        tr.appendChild(_funEl('span', 'fun-g-l', 'To'));
        if (list.length > 1) {
          const sel = document.createElement('select');
          sel.className = 'input input-sm';
          for (const x of list) { const o = document.createElement('option'); o.value = x.id; o.textContent = _funName(x); if (x.id === st.to) o.selected = true; sel.appendChild(o); }
          sel.onchange = () => { st.to = sel.value; paint(); };
          tr.append(_funAvatar(to, 28), sel);
        } else tr.append(_funAvatar(to, 28), _funEl('b', null, _funName(to)));
        tr.appendChild(_funEl('span', 'muted fun-small', `Friendship level ${ctx.level}`));
        el.appendChild(tr);
        // tabs
        const tabs = _funEl('div', 'seg fun-g-tabs');
        tabs.setAttribute('role', 'tablist');
        for (const [k, label] of [['sticker', 'Stickers'], ['emote', 'Emotes'], ['cosmetic', 'Avatar items']]) {
          const b = _funBtn(label, { raw: true, cls: k === st.t ? 'on' : '', run: () => { if (st.t !== k) { st.t = k; st.item = ''; paint(); } } });
          b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === st.t ? 'true' : 'false');
          tabs.appendChild(b);
        }
        el.appendChild(tabs);
        // items
        const rows = st.t === 'sticker' ? FUN_STICKERS : st.t === 'emote' ? FUN_EMOTES : FUN_COSMETICS;
        const grid = _funEl('div', 'fun-g-grid');
        grid.setAttribute('role', 'listbox');
        grid.setAttribute('aria-label', 'Pick what to send');
        const shown = rows.filter(r => !r.event || (ev && r.event === ev.def.id) || (st.t === 'sticker' && ctx.book[r.id]));
        if (!st.item || funCanSend(st.t, st.item, ctx)) { const firstOk = shown.find(r => !funCanSend(st.t, r.id, ctx)); st.item = firstOk ? firstOk.id : ''; }
        for (const r of shown) {
          const why = funCanSend(st.t, r.id, ctx);
          const b = _funBtn('', { raw: true, cls: 'fun-g-item' + (r.id === st.item ? ' is-on' : '') + (why ? ' is-locked' : ''), tip: why || r.label, aria: r.label + (why ? `: ${why}` : ''), disabled: !!why, run: () => { st.item = r.id; paint(); } });
          b.setAttribute('role', 'option'); b.setAttribute('aria-selected', r.id === st.item ? 'true' : 'false');
          b.appendChild(_funEl('span', 'fun-e', r.e));
          b.appendChild(_funEl('span', 'fun-g-n', r.label));
          if (why) { const l = _funEl('span', 'fun-g-lock'); l.innerHTML = icon('lock', 'i-xs'); b.appendChild(l); }
          grid.appendChild(b);
        }
        if (!shown.length) grid.appendChild(_funEl('p', 'muted', 'Nothing here yet.'));
        el.appendChild(grid);
        if (st.t === 'cosmetic') el.appendChild(_funEl('p', 'muted fun-small', 'Seasonal avatar items you have collected. Your friend keeps theirs for good, whatever the season.'));
        // paper and tag
        const pr = _funEl('div', 'fun-g-paper');
        pr.appendChild(_funEl('span', 'fun-g-l', 'Paper'));
        for (const w of FUN_WRAPS.filter(w => !w.event || (ev && w.event === ev.def.id))) {
          const why = funCanSend('wrap', w.id, ctx);
          const b = _funBtn('', { raw: true, cls: 'fun-g-wrap' + (w.id === st.wrap ? ' is-on' : ''), tip: why || w.label, aria: w.label, disabled: !!why, run: () => { st.wrap = w.id; paint(); } });
          b.appendChild(_funBox(w.id, 26));
          pr.appendChild(b);
        }
        el.appendChild(pr);
        const lr = _funEl('label', 'fun-g-tag');
        lr.appendChild(_funEl('span', 'fun-g-l', 'Tag'));
        const ls = document.createElement('select');
        ls.className = 'input input-sm';
        for (const l of FUN_LINES.filter(l => !l.event || (ev && l.event === ev.def.id))) { const o = document.createElement('option'); o.value = l.id; o.textContent = l.text; if (l.id === st.line) o.selected = true; ls.appendChild(o); }
        ls.onchange = () => { st.line = ls.value; prev.querySelector('.fun-g-pt').textContent = (funItem('line', st.line) || {}).text || ''; };
        lr.appendChild(ls);
        el.appendChild(lr);
        // preview and send
        const prev = _funEl('div', 'fun-g-prev');
        prev.appendChild(_funBox(st.wrap, 56));
        const pt = _funEl('div', 'fun-g-pv');
        pt.appendChild(_funEl('b', 'fun-g-pt', (funItem('line', st.line) || {}).text || ''));
        const it = st.item ? funItem(st.t, st.item) : null;
        pt.appendChild(_funEl('span', 'muted fun-small', it ? `Inside: ${it.e} ${it.label}. ${_funFirst(to)} unwraps it.` : 'Pick something to send.'));
        prev.appendChild(pt);
        el.appendChild(prev);
        const acts = _funEl('div', 'fun-g-acts');
        acts.appendChild(_funEl('span', 'muted fun-small', `${Math.max(0, FUN_CAPS.send.gift[0] - (((_fun.data && _fun.data.caps && _fun.data.caps.gift) || {}).used || 0))} gifts left today`));
        acts.appendChild(_funEl('span', 'spacer'));
        acts.appendChild(_funBtn('Cancel', { kind: 'btn-ghost', run: () => close() }));
        acts.appendChild(_funBtn('Send the gift', { kind: 'btn-primary', icon: 'send', disabled: !it, run: () => { close(); _funSendGiftLater(to, { t: st.t, item: st.item, wrap: st.wrap, line: st.line }, owned); } }));
        el.appendChild(acts);
      };
      paint();
    },
  });
}
function _funSendGiftLater(f, g, owned) {
  let undone = false;
  const it = funItem(g.t, g.item);
  const timer = setTimeout(async () => {
    if (undone) return;
    try {
      const r = await _funApi('/api/fun/gift', { to: f.id, t: g.t, item: g.item, wrap: g.wrap, line: g.line, owned: g.t === 'cosmetic' ? owned : undefined });
      const away = r.queued && !r.sent;
      _funAward('friend-gift', r.id, 5, 'Gift sent', true);
      toast(away ? `${_funFirst(f)} isn't around right now: your gift arrives when they're back.` : `Gift sent to ${_funFirst(f)} 🎁${r.candy ? ` · +${r.candy} ${_funCurrency(r.candy)}` : ''}`, { icon: away ? 'moon' : 'gift', kind: away ? '' : 'ok' });
      _funRefreshSoon(150);
    } catch (e) { toast(netErrorMessage(e), { kind: 'err', retry: e && (e.code === 'CAP' || e.code === 'LOCKED') ? null : () => _funSendGiftLater(f, g, owned) }); }
  }, 5000);
  toast(`Wrapping ${it ? it.e + ' ' : ''}for ${_funFirst(f)}…`, { icon: 'gift', timeout: 5000, action: { label: 'Undo', run: () => { undone = true; clearTimeout(timer); toast('Gift not sent', { icon: 'undo-2' }); } } });
}
/** Unwrap a gift: the box shakes, the lid flies, the present pops out. */
function funUnwrap(id) {
  const g = ((_fun.data && _fun.data.gifts && _fun.data.gifts.inbox) || []).find(x => x.id === id);
  if (!g) { funLoad(true).then((d) => { if (d && d.gifts && d.gifts.inbox.some(x => x.id === id)) funUnwrap(id); else toast('That gift was already opened (maybe on another of your devices). Look in your sticker book.', { icon: 'gift' }); }).catch((e) => toast(netErrorMessage(e), { kind: 'err', retry: () => funUnwrap(id) })); return; }
  const f = Friends.get(g.f) || { id: g.f, name: 'A friend' };
  const it = funItem(g.t, g.item);
  const line = funItem('line', g.line);
  const scrim = _funEl('div', 'fun-unwrap-scrim');
  const card = _funEl('div', 'fun-unwrap');
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', `A gift from ${_funName(f)}`);
  const stage = _funEl('div', 'fun-unwrap-stage');
  const box = _funBox(g.wrap, 120);
  stage.appendChild(box);
  card.appendChild(stage);
  const t = _funEl('div', 'fun-unwrap-t');
  t.appendChild(_funEl('span', 'overline', `From ${_funName(f)}`));
  t.appendChild(_funEl('b', null, line ? line.text : 'A gift for you'));
  const sub = _funEl('span', 'muted', 'Click the box, or Unwrap.');
  t.appendChild(sub);
  card.appendChild(t);
  const acts = _funEl('div', 'fun-unwrap-a');
  card.appendChild(acts);
  let closed = false;
  const prevFocus = document.activeElement;
  const close = () => { if (closed) return; closed = true; if (ctl && opening) ctl.abort(); document.removeEventListener('keydown', onKey, true); scrim.remove(); card.remove(); if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ } _funRefreshSoon(100); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  scrim.onclick = close;
  let opening = false, ctl = null;
  const open = async () => {
    if (opening) return;
    opening = true;
    acts.textContent = '';
    box.classList.add('is-shake');
    ctl = new AbortController();
    acts.appendChild(_funEl('span', 'muted fun-small', 'Unwrapping…'));
    acts.appendChild(_funBtn('Cancel', { kind: 'btn-ghost', sm: true, run: () => { if (ctl) ctl.abort(); } }));
    try {
      const [r] = await Promise.all([_funApi('/api/fun/gift/open', { id }, { signal: ctl.signal }), new Promise(res => setTimeout(res, _funPlayful() ? 650 : 0))]);
      if (closed) return;
      box.classList.remove('is-shake'); box.classList.add('is-open');
      const pop = _funEl('span', 'fun-unwrap-in', it ? it.e : '🎁');
      stage.appendChild(pop);
      setTimeout(() => _funBurst(pop), 120);
      t.querySelector('b').textContent = it ? `${it.label}${g.t === 'sticker' ? ' sticker' : g.t === 'emote' ? '' : ''}` : 'A gift';
      sub.textContent = g.t === 'sticker' ? (r.first ? 'New in your sticker book.' : 'Another one for your sticker book.') : g.t === 'emote' ? 'An emote: here it goes!' : `An avatar item for you to keep, whatever the season.`;
      if (g.t === 'emote' && it) setTimeout(() => funFxEmote(it.id), 300);
      acts.textContent = '';
      if (g.t === 'cosmetic' && it && typeof profileSet === 'function') {
        acts.appendChild(_funBtn('Wear it now', { kind: 'btn-primary', e: it.e, run: () => {
          const before = profileGet().avatar[it.k];
          profileSet({ avatar: { [it.k]: it.item }, collected: { [it.k + ':' + it.item]: _funToday() } });
          toast(`You're wearing the ${it.label.toLowerCase()} from ${_funFirst(f)}`, { icon: 'shirt', action: { label: 'Undo', run: () => profileSet({ avatar: { [it.k]: before } }) } });
          close();
        } }));
        acts.appendChild(_funBtn('Keep it for later', { run: () => { profileSet({ collected: { [it.k + ':' + it.item]: _funToday() } }, { quiet: true }); toast(`The ${it.label.toLowerCase()} is yours for good: Settings > Profile.`, { icon: 'shirt' }); close(); } }));
      }
      acts.appendChild(_funBtn('Say thanks', { e: '🙏', run: () => { funWave(f, 'thanks'); close(); } }));
      if (g.t === 'sticker') acts.appendChild(_funBtn('Sticker book', { kind: 'btn-ghost', icon: 'book-open', run: () => { close(); funStickerBook(); } }));
      acts.appendChild(_funBtn('Done', { kind: 'btn-ghost', run: close }));
      const firstBtn = acts.querySelector('button'); if (firstBtn) firstBtn.focus();
    } catch (e) {
      if (closed) return;
      box.classList.remove('is-shake');
      opening = false;
      acts.textContent = '';
      acts.appendChild(_funEl('span', e && e.name === 'AbortError' ? 'muted fun-small' : 'fun-err', e && e.name === 'AbortError' ? 'Stopped. It is still wrapped.' : netErrorMessage(e)));
      acts.appendChild(_funBtn('Try again', { kind: 'btn-primary', icon: 'refresh-cw', run: open }));
      acts.appendChild(_funBtn('Later', { kind: 'btn-ghost', run: close }));
    }
  };
  box.style.cursor = 'pointer';
  box.onclick = open;
  acts.appendChild(_funBtn('Unwrap', { kind: 'btn-primary', icon: 'gift', run: open }));
  acts.appendChild(_funBtn('Later', { kind: 'btn-ghost', run: close }));
  document.body.append(scrim, card);
  const ub = acts.querySelector('button'); if (ub) ub.focus();
}
function funStickerBook() {
  const book = (_fun.data && _fun.data.book) || {};
  const got = Object.keys(book).length;
  openDialog({
    title: 'Your sticker book', size: 'md',
    body(el) {
      el.classList.add('fun-book');
      el.appendChild(_funEl('p', 'muted', got ? `${got} of ${FUN_STICKERS.length} collected. Stickers come from friends' gifts; a seasonal one you have can be sent on any time.` : 'No stickers yet. Friends send them as gifts: open one and it lands here. You can send them stickers too.'));
      const groups = [['Everyday', FUN_STICKERS.filter(s => !s.level && !s.event)], ['Friendship levels', FUN_STICKERS.filter(s => s.level)], ['Seasonal', FUN_STICKERS.filter(s => s.event)]];
      for (const [label, rows] of groups) {
        el.appendChild(_funEl('div', 'overline fun-book-h', label));
        const grid = _funEl('div', 'fun-book-g');
        for (const s of rows) {
          const have = book[s.id];
          const c = _funEl('div', 'fun-book-i' + (have ? ' is-got' : ''));
          c.appendChild(_funEl('span', 'fun-e', have ? s.e : '?'));
          c.appendChild(_funEl('span', 'fun-book-n', have ? s.label : (s.event ? `Comes with ${(funItem('event', s.event) || {}).label || 'its season'}` : s.level ? `Friendship level ${s.level}` : 'From a friend')));
          if (have) c.setAttribute('data-tip', `First opened ${_funDateRange(have, have).split(' to ')[0]}`);
          grid.appendChild(c);
        }
        el.appendChild(grid);
      }
      if (got) {
        const a = _funEl('div', 'fun-g-acts');
        a.appendChild(_funEl('span', 'spacer'));
        a.appendChild(_funBtn('Send a sticker', { kind: 'btn-primary', icon: 'gift', run: () => funGiftDialog(null, { t: 'sticker' }) }));
        el.appendChild(a);
      }
    },
  });
}

/* ---------- the event: answer a knock ---------- */
function funAnswerDialog(f) {
  const ev = funEventNow();
  if (!ev || !f) return;
  openDialog({
    title: `${ev.def.knock.label}! ${ev.def.knock.e}`, size: 'sm',
    body(el, close) {
      el.classList.add('fun-answer');
      el.appendChild(_funEl('p', null, `${_funName(f)} ${ev.def.knock.did}. How do you answer?`));
      const row = _funEl('div', 'fun-answer-r');
      const pick = (t, e, label, sub) => {
        const b = _funBtn('', { raw: true, cls: 'fun-answer-b', run: () => { close(); funKnock(f, t); } });
        b.appendChild(_funEl('span', 'fun-e', e));
        b.appendChild(_funEl('b', null, label));
        b.appendChild(_funEl('span', 'muted fun-small', sub));
        row.appendChild(b);
      };
      pick('treat', ev.def.treat.e, ev.def.treat.label, `${_funFirst(f)} gets 2 ${ev.def.currency.many}, you get 1`);
      pick('trick', ev.def.trick.e, ev.def.trick.label, `A harmless surprise on their screen. You both still get 1 ${ev.def.currency.one}`);
      el.appendChild(row);
    },
  });
}

/* ---------- the weekly recap ---------- */
var _FUN_COOP_KINDS = ['coop', 'team-quest', 'trophy', 'cheer-boost', 'together-done', 'goal-hit'];
function _funCoopXp(from, to) {
  try {
    const aw = state.game && state.game.awards && typeof state.game.awards === 'object' ? state.game.awards : {};
    return Object.values(aw).filter(a => a && _FUN_COOP_KINDS.includes(a.k) && a.d >= from && a.d <= to).reduce((s, a) => s + (Number(a.xp) || 0), 0);
  } catch (e) { return 0; }
}
function _funRecapCard(r, title) {
  const card = _funEl('div', 'fun-recap');
  const h = _funEl('div', 'fun-recap-h');
  const ht = _funEl('div');
  ht.appendChild(_funEl('span', 'overline', _funDateRange(r.from, r.to)));
  ht.appendChild(_funEl('b', null, title));
  h.appendChild(ht);
  card.appendChild(h);
  if (!r.any) {
    card.appendChild(_funEl('p', 'muted', 'A quiet week between you and your friends. A wave or a cheer is a nice way to start the next one.'));
    return card;
  }
  const coop = _funCoopXp(r.from, r.to);
  const stats = _funEl('div', 'fun-recap-s');
  const stat = (n, label, e) => { const s = _funEl('div', 'fun-recap-stat'); s.appendChild(_funEl('span', 'fun-e', e)); s.appendChild(_funEl('b', 'num', Number(n || 0).toLocaleString())); s.appendChild(_funEl('span', 'muted', label)); stats.appendChild(s); };
  stat(r.cheers.sent + r.cheers.got, `cheers (${r.cheers.sent} sent)`, '📣');
  stat(r.waves.sent + r.waves.got, 'waves and high-fives', '👋');
  if (r.gifts.sent + r.gifts.got) stat(r.gifts.sent + r.gifts.got, 'gifts swapped', '🎁');
  stat(r.wins + r.quests, 'shared wins', '🏆');
  stat(r.friendXp, 'friendship XP', '💞');
  if (coop) stat(coop, 'co-op XP', '🤝');
  card.appendChild(stats);
  if (r.highlight) {
    const f = Friends.get(r.highlight.id);
    if (f) {
      const hl = _funEl('div', 'fun-recap-hl');
      hl.appendChild(_funAvatar(f, 44));
      const t = _funEl('div');
      t.appendChild(_funEl('span', 'overline', 'Friend of the week'));
      t.appendChild(_funEl('b', null, _funName(f)));
      t.appendChild(_funEl('span', 'muted fun-small', `${r.highlight.n} moments together${r.highlight.duo ? ` · a ${r.highlight.duo}-day duo streak` : ''}`));
      hl.appendChild(t);
      hl.appendChild(_funBtn('High five', { sm: true, e: '🙌', run: (e, b) => funWave(f, 'high5', { anchor: b }) }));
      card.appendChild(hl);
    }
  }
  if (r.lines && r.lines.length) {
    const ul = _funEl('ul', 'fun-recap-l');
    for (const l of r.lines) {
      const f = l.f ? Friends.get(l.f) : null;
      const who = f ? _funFirst(f) : 'a friend';
      const b = l.b || {};
      let text = '';
      if (l.k === 'quest') text = `Quest done with ${who}${b.title ? `: “${b.title}”` : ''}`;
      else if (l.k === 'challenge') text = `You won a challenge with ${who}${b.title ? `: “${b.title}”` : ''}`;
      else if (l.k === 'fun:line' && b.t === 'duo') text = `A ${b.n}-day duo streak with ${who}`;
      else if (l.k === 'fun:line' && b.t === 'quest') { const q = funItem('quest', b.q); text = `Friendship quest: ${q ? q.label.replace('{name}', who) : 'done'}`; }
      else if (l.k === 'fun:line' && b.t === 'tier') { const d = funItem('event', b.ev); text = d ? `${d.label}: ${funTierOf(d, Number(b.n) || 0).label}` : 'A seasonal milestone'; }
      if (text) ul.appendChild(_funEl('li', null, text));
    }
    if (ul.childNodes.length) card.appendChild(ul);
  }
  return card;
}
function funRecapOpen(which) {
  const go = (d) => {
    if (!d || !d.recap) { toastError('load the recap', new Error('try again in a moment'), () => funRecapOpen(which)); return; }
    const last = which === 'last' || (which !== 'week' && Clock.parts(Clock.now()).dow === 1);
    const r = last ? d.recap.last : d.recap.week;
    openDialog({ title: last ? 'Last week with friends' : 'Your week with friends', size: 'md', body(el) { el.appendChild(_funRecapCard(r, last ? 'Last week with friends' : 'Your week with friends')); } });
    if (!last && d.prefs && d.prefs.recapSeen !== d.week.from) _funApi('/api/fun/prefs', { recapSeen: d.week.from }).catch(() => {});
    if (r && r.any) _funAward('friend-recap', last ? r.from : d.week.from, 5, 'Weekly recap', true);
  };
  if (_fun.data) go(_fun.data); else funLoad(true).then(go).catch((e) => toast(netErrorMessage(e), { kind: 'err', retry: () => funRecapOpen(which) }));
}

/* ---------- themes: a friend's card, a shared space ---------- */
function _funThemeSwatch(id) { const s = _funEl('span', 'fun-sw fun-th fun-th-' + id); s.setAttribute('aria-hidden', 'true'); return s; }
function funSpaceThemeMenu(anchor, sp) {
  const ids = typeof tgMembers === 'function' ? tgMembers(sp.value) : [];
  const level = Math.max(1, ...ids.map(id => { const x = funFor(id); return x ? x.level : 1; }));
  const cur = (_fun.data && _fun.data.prefs && _fun.data.prefs.spaceThemes && _fun.data.prefs.spaceThemes[sp.id]) || 'plain';
  openMenu(anchor, [{ heading: 'Space theme (only on your screen)' }].concat(FUN_THEMES.map(t => ({
    label: t.label, icon: 'palette', checked: t.id === cur, disabled: t.level > level,
    hint: t.level > level ? `Friendship level ${t.level} with someone here` : '',
    run: () => _funApi('/api/fun/prefs', { spaceTheme: { space: sp.id, id: t.id } }).then(() => funLoad(true)).catch((e) => toast(netErrorMessage(e), { kind: 'err' })),
  }))), { align: 'end', width: 280 });
}

/* ---------- panels ---------- */
function _funYouTwo(el, f) {
  const x = funFor(f.id);
  if (!x) { el.appendChild(_fun.data && !_fun.err && !_fun.stopped ? _funNotYet(f) : _funWaitEl(() => { if (typeof friendsPageRefresh === 'function') friendsPageRefresh(); })); return; }
  _funFreshen();
  const name = _funFirst(f);
  // the duo streak
  const duo = x.duo || {};
  const dw = _funEl('div', 'fun-duo-b' + (duo.today ? ' is-lit' : ''));
  const fl = _funEl('span', 'fun-duo-flame');
  fl.innerHTML = icon('flame', 'i-lg');
  fl.appendChild(_funEl('b', 'num', String(duo.cur || 0)));
  dw.appendChild(fl);
  const dt = _funEl('div', 'fun-duo-t');
  dt.appendChild(_funEl('b', null, duo.cur ? `${duo.cur}-day duo streak` : 'Duo streak'));
  dt.appendChild(_funEl('span', 'muted fun-small', `On days you both finish at least one task, the flame grows.${duo.best > duo.cur ? ` Best: ${duo.best}.` : ''}`));
  const today = _funEl('div', 'fun-duo-today');
  const tick = (who, done) => { const s = _funEl('span', 'fun-tick' + (done ? ' is-done' : '')); s.innerHTML = icon(done ? 'circle-check' : 'circle-dashed', 'i-xs'); s.appendChild(_funEl('span', null, who)); today.appendChild(s); };
  tick('You', duo.me); tick(name, duo.them);
  dt.appendChild(today);
  dw.appendChild(dt);
  el.appendChild(dw);
  // quests
  const qs = _funEl('div', 'fun-quests');
  qs.appendChild(_funEl('div', 'overline', 'Friendship quests this week'));
  for (const q of x.quests || []) {
    const def = funItem('quest', q.id); if (!def) continue;
    const r = _funEl('div', 'fun-q' + (q.done ? ' is-done' : ''));
    const ic = _funEl('span', 'fun-q-i'); ic.innerHTML = icon(q.done ? 'circle-check' : def.icon, 'i-sm');
    r.appendChild(ic);
    const t = _funEl('div', 'fun-q-t');
    t.appendChild(_funEl('span', null, def.label.replace('{name}', name)));
    t.appendChild(_funBar(q.n, q.of));
    r.appendChild(t);
    r.appendChild(_funEl('span', 'num muted fun-small', q.done ? '+10 XP' : `${q.n}/${q.of}`));
    qs.appendChild(r);
  }
  el.appendChild(qs);
  // rewards
  const lv = x.level || 1;
  const rw = _funEl('div', 'fun-rewards');
  rw.appendChild(_funEl('div', 'overline', `Friendship level ${lv} rewards`));
  const track = _funEl('div', 'fun-track');
  for (const step of funRewardsTrack()) {
    const s = _funEl('div', 'fun-step' + (step.level <= lv ? ' is-got' : step.level === lv + 1 ? ' is-next' : ''));
    s.appendChild(_funEl('span', 'fun-step-l num', String(step.level)));
    const items = _funEl('div', 'fun-step-i');
    for (const it of step.items) {
      const c = _funEl('span', 'fun-chip');
      if (it.t === 'theme') c.appendChild(_funThemeSwatch(it.id)); else if (it.e) c.appendChild(_funEl('span', 'fun-e', it.e));
      c.appendChild(_funEl('span', null, it.t === 'theme' ? `${it.label} theme` : it.t === 'wrap' ? `${it.label} paper` : it.label));
      items.appendChild(c);
    }
    s.appendChild(items);
    track.appendChild(s);
  }
  rw.appendChild(track);
  el.appendChild(rw);
  // choices: card theme and your high-five
  const ch = _funEl('div', 'fun-choose');
  const themes = _funEl('div', 'fun-choose-r');
  themes.appendChild(_funEl('span', 'fun-g-l', 'Card theme'));
  for (const t of FUN_THEMES) {
    const locked = t.level > lv;
    const b = _funBtn('', { raw: true, cls: 'fun-th-pick' + ((x.theme || 'plain') === t.id ? ' is-on' : ''), tip: locked ? `Friendship level ${t.level}` : t.label, aria: t.label + (locked ? `: friendship level ${t.level}` : ''), disabled: locked, run: (e, bb) => { bb.disabled = true; _funApi('/api/fun/prefs', { theme: { friend: f.id, id: t.id } }).then(() => funLoad(true)).catch((er) => { bb.disabled = false; toast(netErrorMessage(er), { kind: 'err' }); }); } });
    b.appendChild(_funThemeSwatch(t.id));
    themes.appendChild(b);
  }
  ch.appendChild(themes);
  const h5 = _funEl('div', 'fun-choose-r');
  h5.appendChild(_funEl('span', 'fun-g-l', 'Your high five'));
  const mine = (_fun.data.prefs && _fun.data.prefs.high5) || 'classic';
  for (const h of FUN_HIGH5) {
    const locked = h.level > lv;
    const b = _funBtn('', { raw: true, cls: 'fun-h5-pick' + (mine === h.id ? ' is-on' : ''), tip: locked ? `${h.label}: friendship level ${h.level} with ${name}` : `${h.label} (try it)`, aria: h.label, disabled: locked, run: (e, bb) => { funFxHigh5(h.id, { anchor: bb }); _funApi('/api/fun/prefs', { high5: h.id }).then(() => funLoad(true)).catch((er) => toast(netErrorMessage(er), { kind: 'err' })); } });
    b.appendChild(_funEl('span', 'fun-e', h.e));
    h5.appendChild(b);
  }
  ch.appendChild(h5);
  ch.appendChild(_funEl('p', 'muted fun-small', `Styles you have unlocked with ${name} play when you high-five them; with someone you know less well, the classic plays.`));
  el.appendChild(ch);
}
function _funEventPanel(el) {
  const d = _fun.data;
  const ev = funEventNow();
  if (!ev) return false;
  if (!d) { el.appendChild(_funWaitEl(() => { if (typeof friendsPageRefresh === 'function') friendsPageRefresh(); })); return; }
  _funFreshen();
  const e = d.event || { candy: 0, today: 0, dayCap: ev.def.dayCap, tier: funTierOf(ev.def, 0), knocks: [] };
  el.classList.add('fun-ev', 'fun-ev-' + ev.def.id);
  const top = _funEl('div', 'fun-ev-top');
  const bag = _funEl('div', 'fun-ev-bag');
  bag.appendChild(_funEl('span', 'fun-e fun-ev-big', ev.def.currency.e));
  bag.appendChild(_funEl('b', 'num', String(e.candy)));
  bag.appendChild(_funEl('span', 'muted fun-small', ev.def.currency.many));
  top.appendChild(bag);
  const t = _funEl('div', 'fun-ev-t');
  t.appendChild(_funEl('span', 'overline', ev.daysLeft > 0 ? `${ev.daysLeft} day${ev.daysLeft === 1 ? '' : 's'} left` : 'Last day'));
  t.appendChild(_funEl('p', null, ev.def.blurb));
  const tier = e.tier || funTierOf(ev.def, e.candy);
  if (tier.next) { t.appendChild(_funBar(e.candy, tier.next)); t.appendChild(_funEl('span', 'muted fun-small', `${tier.next - e.candy} more for “${tier.nextLabel}”${tier.label ? ` · now: ${tier.label}` : ''} · today ${e.today} of ${e.dayCap}`)); }
  else t.appendChild(_funEl('span', 'fun-small', `${tier.label}: every tier collected!`));
  top.appendChild(t);
  el.appendChild(top);
  // the costume
  const cos = _funEl('div', 'fun-ev-cos');
  if (funInCostume()) { cos.appendChild(_funEl('span', 'fun-e', '🧙')); cos.appendChild(_funEl('span', null, `You're dressed up: +${ev.def.costumeBonus} on every drop.`)); }
  else {
    cos.appendChild(_funEl('span', 'muted', `Dress up in ${ev.def.costumeLabel} for +${ev.def.costumeBonus} on every drop. Friends see your costume.`));
    cos.appendChild(_funBtn('Dress up', { sm: true, icon: 'wand-sparkles', run: () => funDressUp() }));
  }
  el.appendChild(cos);
  // knocks to answer
  const waiting = (e.knocks || []).filter(k => k.dir === 'in' && !k.ans);
  if (waiting.length) {
    const w = _funEl('div', 'fun-ev-knocks');
    for (const k of waiting.slice(0, 6)) {
      const f = Friends.get(k.f); if (!f) continue;
      const r = _funEl('div', 'fun-row');
      r.appendChild(_funAvatar(f, 30));
      r.appendChild(_funEl('span', 'fun-row-t', `${_funFirst(f)} ${ev.def.knock.did} ${ev.def.knock.e}`));
      r.appendChild(_funBtn(ev.def.treat.label, { sm: true, kind: 'btn-primary', e: ev.def.treat.e, run: (x, b) => { b.disabled = true; funKnock(f, 'treat'); } }));
      r.appendChild(_funBtn('', { sm: true, e: ev.def.trick.e, tip: ev.def.trick.label, aria: ev.def.trick.label, run: (x, b) => { b.disabled = true; funKnock(f, 'trick'); } }));
      w.appendChild(r);
    }
    el.appendChild(w);
  }
  // doors to knock on
  const list = Friends.list();
  if (!list.length) { el.appendChild(_funEl('p', 'muted', `Add a friend to knock on their door. Until then, cheers you get still drop ${ev.def.currency.many}.`)); return; }
  const doors = _funEl('div', 'fun-ev-doors');
  for (const f of list.slice(0, 12)) {
    const x = funFor(f.id) || {};
    const knocked = (x.used && x.used.knock >= 1);
    const door = _funBtn('', { raw: true, cls: 'fun-door' + (knocked ? ' is-done' : ''), disabled: knocked, tip: knocked ? `You knocked on ${_funFirst(f)}'s door today` : `${ev.def.knock.label} at ${_funFirst(f)}'s door`, aria: `${ev.def.knock.label}: ${_funName(f)}`, run: (z, b) => funKnock(f, 'knock', { anchor: b }) });
    door.appendChild(_funAvatar(f, 40));
    if (funFriendInCostume(f)) door.appendChild(_funEl('span', 'fun-door-cos', '🧙'));
    door.appendChild(_funEl('span', 'fun-door-n', _funFirst(f)));
    door.appendChild(_funEl('span', 'fun-door-k', knocked ? '✓' : ev.def.knock.e));
    doors.appendChild(door);
  }
  el.appendChild(doors);
  const st = _funEl('div', 'fun-ev-st');
  st.appendChild(_funEl('span', 'muted fun-small', 'Seasonal stickers:'));
  for (const id of ev.def.stickers) { const s = funItem('sticker', id); if (s) st.appendChild(_funEl('span', 'fun-e', s.e)); }
  st.appendChild(_funBtn('Send one', { sm: true, kind: 'btn-ghost', icon: 'gift', run: () => funGiftDialog(null, { t: 'sticker', item: ev.def.stickers[0] }) }));
  el.appendChild(st);
}
function _funPlayPanel(el) {
  const list = Friends.list();
  if (!list.length) return false;
  const d = _fun.data;
  if (!d) { el.appendChild(_funWaitEl(() => { if (typeof friendsPageRefresh === 'function') friendsPageRefresh(); })); return; }
  _funFreshen();
  const inbox = (d.gifts && d.gifts.inbox) || [];
  const row = _funEl('div', 'fun-gifts');
  if (inbox.length) {
    for (const g of inbox.slice(0, 8)) {
      const f = Friends.get(g.f);
      const b = _funBtn('', { raw: true, cls: 'fun-gift', tip: `From ${f ? _funName(f) : 'a friend'}: click to unwrap`, aria: `Unwrap the gift from ${f ? _funName(f) : 'a friend'}`, run: () => funUnwrap(g.id) });
      b.appendChild(_funBox(g.wrap, 52));
      b.appendChild(_funEl('span', 'fun-gift-n', f ? _funFirst(f) : 'A friend'));
      row.appendChild(b);
    }
    if (inbox.length > 8) row.appendChild(_funEl('span', 'muted', `+${inbox.length - 8}`));
  } else row.appendChild(_funEl('span', 'muted', 'No gifts waiting. Send one: friends unwrap it with a little show.'));
  el.appendChild(row);
  const acts = _funEl('div', 'fun-acts');
  acts.appendChild(_funBtn('Send a gift', { sm: true, kind: 'btn-primary', icon: 'gift', run: () => funGiftDialog(null) }));
  acts.appendChild(_funBtn(`Sticker book · ${Object.keys(d.book || {}).length}/${FUN_STICKERS.length}`, { sm: true, icon: 'book-open', run: () => funStickerBook() }));
  acts.appendChild(_funBtn('This week', { sm: true, kind: 'btn-ghost', icon: 'calendar-heart', run: () => funRecapOpen('week') }));
  el.appendChild(acts);
  // quests across friends
  let done = 0, all = 0;
  const next = [];
  for (const f of list) {
    const x = funFor(f.id); if (!x) continue;
    for (const q of x.quests || []) { all++; if (q.done) done++; else next.push({ f, q }); }
  }
  if (all) {
    const qs = _funEl('div', 'fun-quests is-compact');
    const h = _funEl('div', 'fun-quests-h');
    h.appendChild(_funEl('span', 'overline', 'Friendship quests this week'));
    h.appendChild(_funEl('span', 'num muted fun-small', `${done} of ${all} done`));
    qs.appendChild(h);
    qs.appendChild(_funBar(done, all));
    next.sort((a, b) => (b.q.n / b.q.of) - (a.q.n / a.q.of));
    for (const { f, q } of next.slice(0, 3)) {
      const def = funItem('quest', q.id); if (!def) continue;
      const r = _funBtn('', { raw: true, cls: 'fun-q is-link', run: () => setView('friends:' + f.id) });
      const ic = _funEl('span', 'fun-q-i'); ic.innerHTML = icon(def.icon, 'i-sm');
      r.appendChild(ic);
      r.appendChild(_funEl('span', 'fun-q-t', def.label.replace('{name}', _funFirst(f))));
      r.appendChild(_funEl('span', 'num muted fun-small', `${q.n}/${q.of}`));
      qs.appendChild(r);
    }
    el.appendChild(qs);
  }
}
function _funRecapPanel(el) {
  const d = _fun.data;
  if (!d || !d.recap) return false;
  const dow = Clock.parts(Clock.now()).dow;
  if (dow !== 0 && dow !== 1) return false;
  const last = dow === 1;
  const r = last ? d.recap.last : d.recap.week;
  if (!r || !r.any) return false;
  el.appendChild(_funRecapCard(r, last ? 'Last week with friends' : 'Your week so far'));
  if (!last) {
    if (d.prefs && d.prefs.recapSeen !== d.week.from) _funApi('/api/fun/prefs', { recapSeen: d.week.from }).then(() => { if (_fun.data && _fun.data.prefs) _fun.data.prefs.recapSeen = d.week.from; }).catch(() => {});
    _funAward('friend-recap', d.week.from, 5, 'Weekly recap', true);
  }
}
function funRegisterPanels() {
  Friends.registerPanel({ id: 'fun-recap', order: 6, where: 'hangout', title: 'Your week with friends', icon: 'calendar-heart', render: (el) => _funRecapPanel(el) });
  const ev = funEventNow();
  Friends.registerPanel({ id: 'fun-event', order: 8, where: 'hangout', title: ev ? ev.def.label : 'Friend event', icon: ev ? ev.def.icon : 'sparkles', render: (el) => _funEventPanel(el) });
  Friends.registerPanel({ id: 'fun-play', order: 12, where: 'hangout', title: 'Gifts and quests', icon: 'gift', render: (el) => _funPlayPanel(el) });
  Friends.registerPanel({ id: 'fun-you-two', order: 5, where: 'friend', zone: 'fold', title: 'You two', icon: 'flame', render: (el, f) => { if (!f || f.status !== 'friend') return false; _funYouTwo(el, f); } });
}

/* ---------- motion (nothing with reduced motion or the Fun level Off) ---------- */
function _funFxHost() {
  let h = document.getElementById('fun-fx');
  if (!h) { h = _funEl('div', 'fun-fx'); h.id = 'fun-fx'; h.setAttribute('aria-hidden', 'true'); document.body.appendChild(h); }
  return h;
}
function _funFxAt(o) {
  const a = o && o.anchor && o.anchor.getBoundingClientRect ? o.anchor.getBoundingClientRect() : null;
  return a && a.width ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : { x: window.innerWidth - 120, y: window.innerHeight - 90 };
}
/** A little burst of colour around an element. */
var _FUN_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c', '#5f3dc4'];
function _funBurst(anchor) {
  if (!_funPlayful() || !anchor || !anchor.getBoundingClientRect) return;
  const r = anchor.getBoundingClientRect();
  const host = _funEl('div', 'fun-burst');
  host.style.left = (r.left + r.width / 2) + 'px';
  host.style.top = (r.top + r.height / 2) + 'px';
  for (let i = 0; i < 16; i++) {
    const s = _funEl('i');
    const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.4, dist = 40 + Math.random() * 36;
    s.style.setProperty('--x', Math.cos(a) * dist + 'px');
    s.style.setProperty('--y', Math.sin(a) * dist + 'px');
    s.style.setProperty('--c', _FUN_COLORS[i % _FUN_COLORS.length]);
    host.appendChild(s);
  }
  _funFxAdd(host, 1100);
}
function _funFxAdd(el, ms) { if (_funUI.fx > 6) return; _funUI.fx++; _funFxHost().appendChild(el); setTimeout(() => { el.remove(); _funUI.fx--; }, ms); }
function funFxFloat(e, o) {
  if (!_funPlayful()) return;
  const p = _funFxAt(o);
  const el = _funEl('span', 'fun-fx-float' + (o && o.small ? ' is-small' : ''), e);
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  _funFxAdd(el, 1500);
}
function funFxHigh5(anim, o) {
  if (!_funPlayful()) return;
  const h = funItem('high5', anim) || FUN_HIGH5[0];
  const el = _funEl('div', 'fun-fx-h5 is-' + h.id);
  const l = _funEl('span', 'fun-fx-hand is-l', h.id === 'fist' ? '🤜' : '✋');
  const r = _funEl('span', 'fun-fx-hand is-r', h.id === 'fist' ? '🤛' : '✋');
  el.append(l, r, _funEl('span', 'fun-fx-clap', h.id === 'fireworks' ? '🎆' : h.id === 'rainbow' ? '🌈' : h.id === 'spin' ? '🌀' : '💥'));
  _funFxAdd(el, 1600);
  if (h.id === 'fireworks' || h.id === 'rainbow' || h.id === 'spin') setTimeout(() => { const c = el.querySelector('.fun-fx-clap'); if (c) _funBurst(c); }, 520);
}
function funFxEmote(id) {
  if (!_funPlayful()) return;
  const em = funItem('emote', id);
  if (!em) return;
  const el = _funEl('div', 'fun-fx-emote is-' + em.id);
  const rain = { confetti: ['🎊', '🎉', '✨'], hearts: ['💕', '💖', '💗'], snow: ['❄️', '❅', '❆'], petals: ['🌸', '🌼', '🌷'], fireworks: ['🎆', '🎇', '✨'] }[em.id];
  if (rain) {
    for (let i = 0; i < 18; i++) {
      const s = _funEl('span', 'fun-fx-p', rain[i % rain.length]);
      s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + 'vw');
      s.style.setProperty('--d', (Math.random() * 0.9).toFixed(2) + 's');
      s.style.setProperty('--r', (Math.random() * 360 - 180).toFixed(0) + 'deg');
      el.appendChild(s);
    }
  } else el.appendChild(_funEl('span', 'fun-fx-big', em.e));
  _funFxAdd(el, 2600);
}
function funFxCombo() {
  if (!_funPlayful()) return;
  const el = _funEl('div', 'fun-fx-combo');
  el.append(_funEl('span', 'fun-fx-hands', '🙌🙌'), _funEl('b', null, 'Double high-five!'));
  _funFxAdd(el, 2200);
  setTimeout(() => _funBurst(el.querySelector('b')), 250);
}

/* ---------- commands ---------- */
registerCommand({ id: 'fun-gift', label: 'Send a friend a gift', icon: 'gift', keywords: 'friends gift sticker emote present wrap unwrap', run: () => funGiftDialog(null) });
registerCommand({ id: 'fun-stickers', label: 'Sticker book', icon: 'book-open', keywords: 'friends stickers collection book gifts', run: () => { const go = () => funStickerBook(); if (_fun.data) go(); else funLoad(true).then(go).catch((e) => toast(netErrorMessage(e), { kind: 'err', retry: go })); } });
registerCommand({ id: 'fun-recap', label: 'Your week with friends', icon: 'calendar-heart', keywords: 'friends recap week summary cheers waves gifts wins', run: () => funRecapOpen() });

/* ---------- start: the feed lines' words and the panels, now (the Friends tab may already be open) ---------- */
if (typeof window !== 'undefined' && window.Friends && typeof window.Friends.registerPanel === 'function') {
  try { _funDescribe(); funRegisterPanels(); } catch (e) { console.error('[fun] start', e); }
}
