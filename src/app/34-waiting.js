/* ============================================================
   WAITING ON PEOPLE (owner: Review, v2.16).
   Mark a task "waiting on Clara" (W on a row, the task menu, D in the weekly
   review): it gets waitingOn + waitingSince, links Clara, and leaves your active
   lists (Today, Upcoming, No date: rfLeavesView) for the Waiting list
   (#view=waiting, below). After N days of silence (the list's setting, 5 by
   default) a follow-up nudge appears: on the row, in a strip at the top of Today,
   on Home's Review card and on Clara's card ("They owe you").
   Nudge drafts an email in your mail app (never sends) and resets the clock.
   Keys in the list: J/K or arrows move, N nudge, C it arrived (done),
   R back on my list, Enter open.
   ============================================================ */
let _rfWaitCur = null;           // the row the keys act on in the Waiting list

function rfNudgeText(p, items) {
  const first = p ? (typeof hglFirst === 'function' ? hglFirst(p) : p.name) : '';
  if (items.length === 1) return { subject: `Quick check-in: ${String(effTitle(items[0])).slice(0, 90)}`, body: `Hi ${first},\n\nJust checking in on this: ${effTitle(items[0])}. Is there anything you need from me?\n\nThanks` };
  return { subject: `Checking in on ${items.length} things`, body: `Hi ${first},\n\nJust checking in on a few things:\n\n${items.map(i => '- ' + effTitle(i)).join('\n')}\n\nIs there anything you need from me?\n\nThanks` };
}
/** Draft a follow-up to the person a task waits on, and reset its follow-up clock. */
function rfNudge(id) { return getItem(id) ? rfNudgeMany([id]) : null; }
function rfNudgeMany(ids) {
  const items = ids.map(getItem).filter(Boolean);
  if (!items.length) return null;
  const p = rfWaitPerson(items[0]);
  const t = rfNudgeText(p, items);
  const url = p && typeof hglMailto === 'function' ? hglMailto(p, t.subject, t.body) : null;
  const mark = rfDoMany(items.map(i => ['nudged', i.id]));
  if (url) { hglOpenMail(url); rfToast(`Nudge to ${p.name} drafted in your mail app (nothing is sent)`, mark, 'bell'); return mark; }
  const who = p ? p.name : 'them';
  try { navigator.clipboard.writeText(t.body).then(() => rfToast(`No email address for ${who}: the nudge is copied, paste it in a message`, mark, 'clipboard-list'), () => rfToast(`Marked as followed up (no email address for ${who})`, mark, 'bell')); }
  catch (e) { rfToast(`Marked as followed up (no email address for ${who})`, mark, 'bell'); }
  return mark;
}

/** Waiting rows grouped by person, the people with something to chase first, then the longest wait. */
function rfWaitingGroups() {
  const by = new Map();
  for (const i of rfWaitingTasks()) {
    const p = rfWaitPerson(i);
    const k = p ? p.id : '';
    if (!by.has(k)) by.set(k, { p, items: [] });
    by.get(k).items.push(i);
  }
  const age = (i) => rfDaysSince(rfWaitSince(i)) || 0;
  const groups = [...by.values()];
  for (const g of groups) { g.items.sort((a, b) => age(b) - age(a)); g.due = g.items.filter(rfNudgeDue).length; g.oldest = age(g.items[0]); }
  return groups.sort((a, b) => (b.due > 0) - (a.due > 0) || b.oldest - a.oldest);
}

registerSection('waiting', {
  title: () => 'Waiting',
  group: 'tasks',   // Tasks > Waiting (2.18: it had no group, so the crumb showed a Settings gear)
  mount(main) { rfRenderWaiting(main); },
});
registerPage({ id: 'waiting', view: 'waiting', match: v => v === 'waiting', label: 'Waiting', icon: 'hourglass', area: 'tasks', order: 50, since: '2.16',
  desc: 'Tasks waiting on someone, by person', keywords: 'waiting on people chase follow up delegated owe' });
function rfRenderWaiting(main) {
  const groups = rfWaitingGroups();
  const total = groups.reduce((t, g) => t + g.items.length, 0);
  const dueN = groups.reduce((t, g) => t + g.due, 0);
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = total ? `${total} waiting${dueN ? ` · ${dueN} to follow up` : ''}` : '';
  const page = document.createElement('div'); page.className = 'rf-wait';
  const bar = document.createElement('div'); bar.className = 'rf-wait-bar';
  const nd = rfNudgeDays();
  bar.innerHTML = `${icon('bell', 'i-sm')}<label for="rf-nudge-days">Follow up after</label>`;
  const sel = document.createElement('select'); sel.id = 'rf-nudge-days'; sel.className = 'control control-sm';
  for (const n of [2, 3, 5, 7, 10, 14, 21]) { const o = document.createElement('option'); o.value = n; o.textContent = `${n} days`; if (n === nd) o.selected = true; sel.appendChild(o); }
  if (![2, 3, 5, 7, 10, 14, 21].includes(nd)) { const o = document.createElement('option'); o.value = nd; o.textContent = `${nd} days`; o.selected = true; sel.appendChild(o); }
  sel.onchange = () => { setTaskViewPref('waiting', { nudgeDays: Number(sel.value) }); render(); };
  bar.appendChild(sel);
  bar.insertAdjacentHTML('beforeend', `<span class="spacer"></span><span class="rf-keys muted"><kbd class="kbd">N</kbd> nudge <kbd class="kbd">C</kbd> arrived <kbd class="kbd">R</kbd> back on my list</span>`);
  page.appendChild(bar);
  if (!total) {
    const box = document.createElement('div'); page.appendChild(box);
    mountEmptyState(box, { icon: 'hourglass', title: 'Nobody to wait on', text: `Press W on a task (or D in the weekly review) when it waits on someone. It leaves your lists and waits here, and a nudge appears after ${nd} days.`, actions: [{ label: 'Back to Today', icon: 'sun', run: () => setView('today') }] });
    main.appendChild(page);
    return;
  }
  const ids = [];
  for (const g of groups) {
    const sec = document.createElement('section'); sec.className = 'card rf-wait-g' + (g.due ? ' has-due' : '');
    const p = g.p;
    const head = document.createElement('div'); head.className = 'rf-wait-gh';
    head.innerHTML = `${p ? homeAvatar(p, 30) : `<span class="rf-wait-anon">${icon('users')}</span>`}<div class="rf-wait-who"><b>${esc(p ? p.name : 'Someone')}</b><span class="muted">${g.items.length} thing${g.items.length === 1 ? '' : 's'} they owe you · longest ${esc(typeof hglAge === 'function' ? hglAge(g.oldest) : g.oldest + ' d')}</span></div><span class="spacer"></span>`;
    if (p) {
      const open = document.createElement('button'); open.type = 'button'; open.className = 'btn btn-ghost btn-sm'; open.innerHTML = icon('circle-user', 'i-sm') + '<span>Card</span>';
      open.onclick = () => { if (typeof openPerson === 'function') openPerson(p.id); };
      head.appendChild(open);
      if (g.items.length > 1) {
        const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-secondary btn-sm'; all.innerHTML = icon('bell', 'i-sm') + `<span>Nudge about all ${g.items.length}</span>`;
        all.onclick = () => rfNudgeMany(g.items.map(i => i.id));
        head.appendChild(all);
      }
    }
    sec.appendChild(head);
    const ul = document.createElement('ul'); ul.className = 'rf-wait-list';
    for (const i of g.items) { ids.push(i.id); ul.appendChild(_rfWaitRow(i)); }
    sec.appendChild(ul);
    page.appendChild(sec);
  }
  if (!_rfWaitCur || !ids.includes(_rfWaitCur)) _rfWaitCur = ids[0];
  page.querySelectorAll(`[data-wait="${CSS.escape(_rfWaitCur)}"]`).forEach(n => n.classList.add('kb-cursor'));
  main.appendChild(page);
}
function _rfWaitRow(i) {
  const li = document.createElement('li'); li.className = 'rf-wait-row anim-hover-host'; li.dataset.wait = i.id; li.dataset.id = i.id;
  const n = rfDaysSince(rfWaitSince(i));
  const due = rfNudgeDue(i);
  const d = effDate(i);
  const since = rfWaitSince(i);
  const art = typeof animSceneHtml === 'function' && typeof animForTask === 'function' ? animSceneHtml(animForTask(i).type, { size: 'xs', hover: true }) : '';
  li.innerHTML = `${art}<button type="button" class="rf-wait-main"><span class="rf-wait-t">${esc(effTitle(i))}</span><span class="rf-wait-s">${since ? `since ${esc(_rfShort(since))} · ` : ''}<b class="${due ? 'due' : ''}">${n ? esc(n + ' day' + (n === 1 ? '' : 's')) : 'today'}</b>${i.waitingNudgedAt ? ` · nudged ${esc(_rfShort(i.waitingNudgedAt))}` : ''}${d ? ` · follow-up ${esc(dueLabel(d))}` : ''}</span></button>`;
  const acts = document.createElement('span'); acts.className = 'rf-wait-acts';
  const btn = (label, ic, run, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm' + (cls ? ' ' + cls : ''); b.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`; b.onclick = (e) => { e.stopPropagation(); run(); }; return b; };
  acts.append(
    btn('Nudge', 'bell', () => rfNudge(i.id), due ? 'is-due' : ''),
    btn('Arrived', 'circle-check', () => { const m = rfDo('done', i.id); rfToast('Done: it arrived', m, 'circle-check'); }),
    btn('Back on my list', 'rotate-ccw', () => rfStopWaiting(i.id)),
  );
  li.appendChild(acts);
  li.querySelector('.rf-wait-main').onclick = () => { _rfWaitCur = i.id; if (typeof openTask === 'function') openTask(i.id, { from: li }); };
  return li;
}
function _rfShort(iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short' }); } catch (e) { return iso; } }

document.addEventListener('keydown', (e) => {
  if (typeof state === 'undefined' || state.view !== 'waiting' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || rfKeysBusy(e)) return;
  const ids = [...document.querySelectorAll('#main-body [data-wait]')].map(n => n.dataset.wait);
  if (!ids.length) return;
  const k = e.key.toLowerCase();
  let at = Math.max(0, ids.indexOf(_rfWaitCur));
  const move = (d) => { at = Math.max(0, Math.min(ids.length - 1, at + d)); _rfWaitCur = ids[at]; document.querySelectorAll('#main-body .rf-wait-row.kb-cursor').forEach(n => n.classList.remove('kb-cursor')); const el = document.querySelector(`#main-body [data-wait="${CSS.escape(_rfWaitCur)}"]`); if (el) { el.classList.add('kb-cursor'); el.scrollIntoView({ block: 'nearest' }); } };
  const id = ids[at];
  if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (k === 'n') { e.preventDefault(); rfNudge(id); }
  else if (k === 'c') { e.preventDefault(); _rfWaitCur = ids[at + 1] || ids[at - 1] || null; const m = rfDo('done', id); rfToast('Done: it arrived', m, 'circle-check'); }
  else if (k === 'r') { e.preventDefault(); _rfWaitCur = ids[at + 1] || ids[at - 1] || null; rfStopWaiting(id); }
  else if (e.key === 'Enter') { e.preventDefault(); if (typeof openTask === 'function') openTask(id); }
});

/** The strip at the top of Today when it is time to follow up (31-task-views.js). Hidden for the day with its x. */
function rfTodayFollowUps() {
  const today = todayStr();
  if (taskViewPrefs('waiting').stripHiddenOn === today) return null;
  const due = rfWaitingTasks().filter(rfNudgeDue);
  if (!due.length) return null;
  const el = document.createElement('div'); el.className = 'rf-strip rf-strip-wait';
  const people = [];
  for (const i of due) { const p = rfWaitPerson(i); if (p && !people.some(x => x.id === p.id)) people.push(p); }
  el.innerHTML = `${icon('bell', 'i-sm')}<span class="rf-strip-t"><b>Time to follow up</b> · ${esc(due.length)} thing${due.length === 1 ? '' : 's'} waiting${people.length ? ' on ' + esc(people.slice(0, 3).map(p => typeof hglFirst === 'function' ? hglFirst(p) : p.name).join(', ')) + (people.length > 3 ? ` +${people.length - 3}` : '') : ''}</span>`;
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-secondary btn-sm'; go.innerHTML = '<span>Open Waiting</span>' + icon('arrow-right', 'i-sm');
  go.onclick = () => setView('waiting');
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.setAttribute('aria-label', 'Hide until tomorrow'); x.title = 'Hide until tomorrow'; x.innerHTML = icon('x', 'i-sm');
  x.onclick = () => { setTaskViewPref('waiting', { stripHiddenOn: today }); el.remove(); };
  el.append(go, x);
  return el;
}

/** A person's card (54-people-card.js): what you owe them, and what they owe you (waiting on them). */
function rfPersonOwe(personId, open) {
  const owe = [], theyOwe = [];
  for (const i of open) {
    const explicit = rfIsWaiting(i);
    const waits = explicit || (typeof pplIsWaiting === 'function' && pplIsWaiting(i));
    if (!waits) { owe.push(i); continue; }
    const p = rfWaitPerson(i);
    if (!p || p.id === personId || !i.waitingOn) theyOwe.push(i);   // waiting on someone else: on their card instead
  }
  return { owe, theyOwe };
}
/** The "They owe you" header button on a person's card: a nudge about everything they owe. */
function rfPersonNudgeButton(personId, items) {
  const due = items.filter(i => rfIsWaiting(i));
  if (!due.length) return null;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm rf-pc-nudge';
  const late = due.filter(rfNudgeDue).length;
  b.innerHTML = icon('bell', 'i-sm') + `<span>${late ? `Nudge (${late} due)` : 'Nudge'}</span>`;
  b.title = 'Draft one email about everything they owe you (nothing is sent)';
  b.onclick = (e) => { e.stopPropagation(); rfNudgeMany(due.map(i => i.id)); };
  return b;
}
