/* ============================================================
   HOME widget "waiting": Waiting on - open tasks blocked on someone else
   (homeIsWaiting / homeWaitingPerson in 12-home.js: status "waiting",
   waitingOn, or a waiting- / blocked- tag), oldest first. Each row: who,
   when it was asked and how long ago (warning ink from 5 days), the
   follow-up date, and Nudge, which drafts an email (never sends).
   Owner: HB4 (finance, people, waiting). CSS: 13-home-w-glances.css.
   Click a row: the task (the centre card, ctx.openTask); it stays the current
   row while its card is open. Sizes: S (5 rows), M (8 rows, the follow-up
   date in its own column). "+N more" opens the rest in place. Under 250 px:
   a tile (how many, the oldest). No tasks at all: hidden (a new user).
   ============================================================ */
let _hbwAll = false;          // "+N more" opened (until Home is left)

registerHomeWidget({
  id: 'waiting', title: 'Waiting on', icon: 'hourglass', order: 90,    // beside This week (L) on the default board
  description: 'Things other people owe you, oldest first, with a nudge',
  emptyHint: 'Appears when a task waits on someone (#waiting)',
  sizes: ['s', 'm'], defaultSize: 's',
  render(el, ctx) { return _hbwRender(el, ctx || {}); },
});

/** The asked date (local ISO) of a task: when it was created; null when unknown. */
function _hbwAsked(i) {
  const c = i && i.createdAt;
  if (!c) return null;
  const d = typeof c === 'number' ? new Date(c) : new Date(String(c));
  return isNaN(d) ? null : fmtDate(d);
}
/** Rows for the widget: [{i, p, asked, age, due, dueIn}] oldest first (then by follow-up date). */
function homeWaitingRows() {
  const today = todayStr();
  return getAllItems().filter(homeIsWaiting).map(i => {
    const asked = _hbwAsked(i);
    const due = effDate(i);
    return { i, p: homeWaitingPerson(i), asked, age: asked ? Math.max(0, Math.round((new Date(today + 'T12:00:00') - new Date(asked + 'T12:00:00')) / 864e5)) : null, due, dueIn: due ? daysUntil(due) : null };
  }).sort((a, b) => {
    if ((a.asked == null) !== (b.asked == null)) return a.asked == null ? 1 : -1;
    return (a.asked || '').localeCompare(b.asked || '') || (a.due || '9999').localeCompare(b.due || '9999') || effTitle(a.i).localeCompare(effTitle(b.i));
  });
}

function _hbwRender(el, ctx) {
  if (!getAllItems().length) return false;                       // a new user: nothing to chase yet
  const rows = homeWaitingRows();
  const size = ctx.size || 's';
  if (ctx.firstPaint) _hbwAll = false;
  const card = document.createElement('section');
  card.className = `card home-card hbw hbw--${size}`;
  card.appendChild(hglHead({ icon: 'hourglass', title: 'Waiting on', n: rows.length ? String(rows.length) : '' }));
  const body = document.createElement('div'); body.className = 'card-b hbw-b';
  card.appendChild(body);
  el.appendChild(card);
  if (!rows.length) {
    body.appendChild(hglEmpty({ scene: 'email', title: 'Nothing to chase', text: 'Tag a task waiting (or blocked-name) and it waits here, oldest first, until they reply.' }));
    return true;
  }
  const cap = size === 'm' ? 8 : 5;
  const shown = _hbwAll ? rows : rows.slice(0, cap);
  const list = document.createElement('ul'); list.className = 'hbw-list';
  let nudges = 0;
  for (const r of shown) { const li = _hbwRow(r, ctx); if (li.querySelector('.hgl-mini')) nudges++; list.appendChild(li); }
  body.appendChild(list);
  const foot = document.createElement('div'); foot.className = 'hgl-foot hbw-foot';
  foot.innerHTML = `${icon('info')}<span>Oldest first${nudges ? ' · nudges draft an email, never send it' : ''}</span>`;
  if (rows.length > cap) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm hbw-more';
    more.innerHTML = `<span>${_hbwAll ? 'Show less' : `+${rows.length - cap} more`}</span>${icon(_hbwAll ? 'chevron-up' : 'chevron-down')}`;
    more.setAttribute('aria-expanded', _hbwAll ? 'true' : 'false');
    more.onclick = () => { _hbwAll = !_hbwAll; if (ctx.rerender) ctx.rerender(); };
    foot.appendChild(more);
  }
  body.appendChild(foot);
  // The tile (under 250 px): how many, and the oldest.
  const oldest = rows.find(r => r.age != null);
  const tile = document.createElement('div'); tile.className = 'hbw-tile';
  tile.innerHTML = `<div class="hbw-big num">${rows.length}</div><div class="hbw-ts">thing${rows.length === 1 ? '' : 's'} to chase</div>${oldest ? `<div class="hbw-ts${oldest.age >= 5 ? ' warn' : ''}">Oldest: ${esc(hglAge(oldest.age))}</div>` : ''}`;
  body.appendChild(tile);
  if (ctx.enterNew) ctx.enterNew(list.children, (li) => li.dataset.flip);
  return true;
}

/* A row is a list item holding two buttons side by side (no button inside a button):
   the row itself (opens the task) and Nudge. */
function _hbwRow(r, ctx) {
  const i = r.i, p = r.p;
  const li = document.createElement('li');
  li.className = 'hbw-row hgl-row';
  li.dataset.flip = 'wt:' + i.id; li.dataset.id = i.id;
  const main = document.createElement('button'); main.type = 'button'; main.className = 'hbw-main';
  const org = p && (p.kind === 'org' || p.kind === 'mailbox');
  const av = p && !org ? homeAvatar(p, 28) : `<span class="hbw-org">${icon(org ? 'building-2' : 'hourglass')}</span>`;
  const who = p ? (org ? (p.name || p.id) : hglFirst(p)) : 'Someone';
  // "Clara · asked 28 Sep · 9 days"; a narrow card drops the date (it is in the tooltip).
  let meta = esc(who);
  if (r.asked) meta += `<span class="hbw-asked"> · asked ${esc(_hbwShort(r.asked))}</span>`;
  if (r.age != null && r.age >= 1) meta += ' · ' + (r.age >= 5 ? `<b class="old">${esc(hglAge(r.age))}</b>` : esc(hglAge(r.age)));
  if (r.asked) main.title = `Asked ${_hbwShort(r.asked)}${r.age ? ` (${hglAge(r.age)} ago)` : ''} · open the task`;
  let follow = '';
  if (r.due) {
    const n = r.dueIn;
    const txt = n < 0 ? `follow-up ${-n} d late` : n === 0 ? 'follow up today' : `follow up ${dueLabel(r.due)}`;
    follow = `<span class="hbw-fu${n < 0 ? ' late' : n === 0 ? ' today' : ''}">${esc(txt)}</span>`;
  }
  const nudgeDue = (r.age != null && r.age >= 5) || (r.dueIn != null && r.dueIn <= 0);
  const url = nudgeDue && p && !org ? hglMailto(p, effTitle(i), `Hi ${hglFirst(p)},\n\nJust checking in on this: ${effTitle(i)}. Is there anything you need from me?\n\nThanks`) : null;
  main.innerHTML = `${av}<span class="hbw-body"><span class="hbw-t">${esc(effTitle(i))}</span><span class="hbw-s">${meta}${follow ? `<span class="hbw-fu-s"> · ${follow}</span>` : ''}</span></span>`
    + `<span class="hbw-fu-col">${follow}</span>`;
  li.appendChild(main);
  if (url) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hgl-mini';
    b.innerHTML = icon('bell') + '<span>Nudge</span>';
    b.title = `Draft a nudge to ${who} in your mail app (nothing is sent)`;
    b.setAttribute('aria-label', `Nudge ${who} about ${effTitle(i)} (drafts an email)`);
    b.onclick = () => hglOpenMail(url);
    li.appendChild(b);
  }
  hglTrackCurrent(li, i.id, main);
  main.onclick = () => hglOpenTask(ctx, i.id, li, main);
  return li;
}
function _hbwShort(iso) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short' }); } catch (e) { return iso; }
}
