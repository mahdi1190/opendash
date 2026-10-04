/* ============================================================
   TAGS (owner: Tags). Mockup 06.
   - Tag manager: every tag by use (or A-Z / unused), flags for tags that
     should not be tags (repeats a stream, names a person, is a status,
     used once), merge / rename / delete with a preview and Undo, pin to
     the sidebar, archive, and suggested clean-ups (near-duplicates, stream
     repeats, person tags -> people links, status tags -> fields, one-offs).
     Opens as a modal (openTagManager) or as the #view=tags page.
   - Sidebar: pinned + the top tags by open use, then "All N tags" (opens
     the manager with its search box focused).
   - Pickers: tagPickerOptions(q, exclude) and confirmNewTag(tag) give the
     task detail / quick add the canonical list and a confirm step before a
     brand-new tag is created.
   The edits themselves are the pure tgl* functions in 27-tags-logic.js
   (shared with the actions layer and migration 040).
   ============================================================ */
const TAG_RULE_TEXT = 'Tags say what kind of work a task is (email, meeting, writing…) or which cross-stream project it belongs to. People, streams, dates and urgency have their own fields.';
const SIDEBAR_TOP_TAGS = 5;
const SB_TAG_DEFAULTS = { sort: 'open', show: SIDEBAR_TOP_TAGS };   // as before: the busiest tags, pinned first
let _tmQuery = '';
let _tmSort = 'use';            // use | az | unused
const _tmSel = new Set();
let _tmRepaint = null;          // repaint the open manager (modal or page)

function _tagLog() { return (tid, e) => logActivity(tid, (e && e.type) || 'tags', Object.assign({}, e || {})); }
/** Rows for the manager: [{tag, open, total, done, pinned, archived, flags:[...]}]. */
function tagRows() {
  const usage = tglUsage(state);
  const reg = tglRegistry(state) || [];
  const regMap = new Map(reg.map(e => [e.id, e]));
  const ctx = { usage, streamKeys: tglStreamKeys(state), index: pplIndex(), state };
  const tags = new Set([...[...usage.entries()].filter(([, u]) => u.total).map(([t]) => t), ...regMap.keys()]);
  return [...tags].map(tag => {
    const u = usage.get(tag) || { open: 0, total: 0, done: 0, bin: 0 };
    const e = regMap.get(tag) || {};
    return { tag, open: u.open, total: u.total, done: u.done, pinned: tglIsPinned(state, tag), archived: !!e.archived, note: e.note || '', flags: tglFlags(tag, ctx).filter(f => f.kind !== 'archived' && f.kind !== 'unused') };
  });
}
/** Old name (shell's starter version). */
function tagUsage() { return tagRows().map(r => ({ tag: r.tag, open: r.open, total: r.total })); }

/* ---------- pickers ---------- */
/** Canonical tags for autocomplete: registry + tags in use, minus archived. -> [{tag, count}] */
function tagPickerOptions(q, exclude) {
  const ex = new Set(exclude || []);
  const qq = tglNorm(q || '');
  const usage = tglUsage(state);
  const reg = tglRegistry(state);
  const known = new Set([...(reg || []).map(e => e.id), ...[...usage.keys()].filter(t => usage.get(t).total)]);
  const out = [];
  for (const t of known) {
    if (ex.has(t) || tglIsArchived(state, t)) continue;
    if (qq && !t.includes(qq)) continue;
    const u = usage.get(t) || { open: 0, total: 0 };
    out.push({ tag: t, count: u.open, total: u.total, canonical: !!(reg && reg.some(e => e.id === t)) });
  }
  return out.sort((a, b) => ((b.tag.startsWith(qq)) - (a.tag.startsWith(qq))) || (b.canonical - a.canonical) || b.count - a.count || b.total - a.total || a.tag.localeCompare(b.tag));
}
function tagIsKnown(tag) {
  const t = tglNorm(tag);
  if (!t) return false;
  const reg = tglRegistry(state);
  if (reg && reg.some(e => e.id === t)) return true;
  const u = tglUsage(state).get(t);
  return !!(u && u.total);
}
/**
 * Ask before a brand-new tag is created. Resolves true (and adds it to the
 * canonical list when there is one) or false. Known tags resolve true at once.
 */
async function confirmNewTag(tag) {
  const t = tglNorm(tag);
  if (!t) return false;
  if (tagIsKnown(t)) return true;
  const streamHit = tglStreamKeys(state).has(t);
  const pid = pplTagPerson(t, pplIndex());
  const near = tagPickerOptions('', []).map(o => o.tag).filter(x => x.includes(t.slice(0, 4)) || t.includes(x)).slice(0, 4);
  let text = `#${t} is not one of your tags yet. ${TAG_RULE_TEXT}`;
  if (streamHit) text = `#${t} is the name of a stream. Use the stream instead of a tag.`;
  else if (pid) text = `#${t} names ${getPerson(pid) ? getPerson(pid).name : 'a person'}. Link the person instead of tagging them.`;
  else if (near.length) text += ` Similar tags: ${near.map(x => '#' + x).join(', ')}.`;
  const ok = await confirmDialog({ title: `Create the tag #${t}?`, text, confirmLabel: 'Create tag', cancelLabel: 'Cancel' });
  if (ok) { tglRegister(state, t); }
  return ok;
}

/* ---------- edits (one undo step each, with a toast) ---------- */
function _tagDone(msg) {
  saveData(); render();
  if (_tmRepaint) _tmRepaint();
  toast(msg, { kind: 'ok', icon: 'tags', action: { label: 'Undo', run: () => { undo(); if (_tmRepaint) _tmRepaint(); } } });
}
const _tagTasks = (r) => `${r.tasks} task${r.tasks === 1 ? '' : 's'}` + (r.done ? ` (${r.open} open, ${r.done} done)` : '');
async function tagRename(from) {
  const to = await promptDialog({ title: `Rename #${from}`, label: 'New name (renaming to an existing tag merges them)', value: from, confirmLabel: 'Rename' });
  if (to === null) return;
  const t = tglNorm(to);
  if (!t || t === from) return;
  const u = tglUsage(state).get(from) || { total: 0 };
  const exists = tagIsKnown(t);
  if (exists && !(await confirmDialog({ title: `Merge #${from} into #${t}?`, text: `#${t} already exists. ${u.total} task${u.total === 1 ? '' : 's'} with #${from} will get #${t} instead.`, confirmLabel: 'Merge' }))) return;
  const r = tglRename(state, from, t, _tagLog());
  _tmSel.delete(from);
  _tagDone(`${exists ? 'Merged' : 'Renamed'} #${from} → #${t} on ${_tagTasks(r)}`);
}
async function tagMergeDialog(tags) {
  const list = [...new Set(tags)].filter(Boolean);
  if (list.length < 1) return;
  const usage = tglUsage(state);
  const best = list.slice().sort((a, b) => (usage.get(b) || { total: 0 }).total - (usage.get(a) || { total: 0 }).total)[0];
  let input = null, info = null;
  const affected = () => {
    const into = tglNorm(input ? input.value : best);
    const froms = list.filter(t => t !== into);
    let n = 0; for (const i of getAllItems()) if (effTags(i).some(t => froms.includes(t))) n++;
    return { into, froms, n };
  };
  openDialog({
    title: list.length > 1 ? `Merge ${list.length} tags` : `Merge #${list[0]} into…`, width: 460,
    body: (el) => {
      const p = document.createElement('div'); p.className = 'tm-merge-from';
      p.innerHTML = list.map(t => `<span class="chip">#${esc(t)}</span>`).join('');
      const f = document.createElement('label'); f.className = 'field';
      f.innerHTML = '<span class="field-label">Into</span>';
      input = document.createElement('input'); input.className = 'control'; input.value = list.length > 1 ? best : ''; input.placeholder = 'tag to keep';
      input.setAttribute('autofocus', '');
      const dl = document.createElement('datalist'); dl.id = 'tm-merge-dl';
      for (const o of tagPickerOptions('', [])) { const op = document.createElement('option'); op.value = o.tag; dl.appendChild(op); }
      input.setAttribute('list', dl.id);
      info = document.createElement('span'); info.className = 'field-hint';
      const upd = () => { const a = affected(); info.textContent = a.into ? `${a.n} task${a.n === 1 ? '' : 's'} change. #${a.into} stays; the others go.` : 'Pick the tag to keep.'; };
      input.oninput = upd; upd();
      f.append(input, dl, info);
      el.append(p, f);
    },
    actions: [{ label: 'Cancel' }, { label: 'Merge', primary: true, run: () => {
      const a = affected();
      if (!a.into || !a.froms.length) { input.focus(); return false; }
      const r = tglMerge(state, a.froms, a.into, _tagLog());
      for (const t of a.froms) _tmSel.delete(t);
      _tagDone(`Merged ${a.froms.length} tag${a.froms.length === 1 ? '' : 's'} into #${a.into} on ${_tagTasks(r)}`);
      return true;
    } }],
  });
}
async function tagDelete(tags) {
  const list = [...new Set(tags)].filter(Boolean);
  if (!list.length) return;
  let n = 0, open = 0;
  for (const i of getAllItems()) if (effTags(i).some(t => list.includes(t))) { n++; if (statusOf(i.id) !== 'done') open++; }
  const ok = await confirmDialog({
    title: list.length === 1 ? `Delete #${list[0]}?` : `Delete ${list.length} tags?`,
    text: `${list.length === 1 ? 'It' : 'They'} will be removed from ${n} task${n === 1 ? '' : 's'} (${open} open). The tasks stay. Archive instead if you only want ${list.length === 1 ? 'it' : 'them'} out of the sidebar and the pickers.`,
    confirmLabel: 'Delete', danger: true,
  });
  if (!ok) return;
  let tasks = 0;
  for (const t of list) { tasks += tglDelete(state, t, _tagLog()).tasks; _tmSel.delete(t); }
  _tagDone(`Deleted ${list.length === 1 ? '#' + list[0] : list.length + ' tags'} from ${tasks} task${tasks === 1 ? '' : 's'}`);
}
function tagSetFlags(tags, patch, msg) {
  for (const t of tags) tglSetFlags(state, t, patch);
  _tagDone(msg);
}
/** A person tag -> a link to that person on each task (the tag goes; blocked-x keeps 'waiting'). */
function tagToPerson(tag) {
  const pid = pplTagPerson(tag, pplIndex()); const p = pid && getPerson(pid);
  if (!p) return;
  const waiting = pplTagIsWaiting(tag) && tagIsKnown('waiting');
  const log = _tagLog();
  let n = 0;
  for (const i of state.custom || []) {
    if (!i || !Array.isArray(i.tags) || !i.tags.includes(tag)) continue;
    const before = i.tags.slice();
    i.tags = i.tags.filter(t => t !== tag);
    if (waiting && !i.tags.includes('waiting')) i.tags.push('waiting');
    const excl = Array.isArray(i.peopleExcluded) ? i.peopleExcluded : [];
    if (!excl.includes(pid) && !(i.people || []).includes(pid)) i.people = [...(i.people || []), pid];
    log(i.id, { type: 'tags', from: before, to: i.tags, text: `#${tag} became a link to ${p.name}` });
    n++;
  }
  _tagDone(`#${tag} is now a link to ${p.name} on ${n} task${n === 1 ? '' : 's'}`);
}
/** Preview what one generic clean-up rule would change (on a copy). */
function _tagRulePreview(kind) {
  const copy = JSON.parse(JSON.stringify({ custom: state.custom, statuses: state.statuses, deleted: state.deleted, people: state.people, streams: state.streams, bin: { tasks: [] }, tagRegistry: state.tagRegistry }));
  const before = new Map((copy.custom || []).map(t => [t.id, JSON.stringify(t.tags || [])]));
  const s = tglCleanState(copy, {}, { index: pplIndex(), today: todayStr(), only: [kind] });
  const tags = new Set();
  for (const t of copy.custom || []) {
    const was = JSON.parse(before.get(t.id) || '[]');
    for (const x of was) if (!(t.tags || []).includes(x)) tags.add(x);
  }
  return { tasks: s.tasksChanged, open: s.openTasksChanged, tags: [...tags] };
}
function tagApplyRule(kind, label) {
  const s = tglCleanState(state, {}, { index: pplIndex(), today: todayStr(), only: [kind], log: (tid, e) => logActivity(tid, e.type || 'tags', e) });
  _tagDone(`${label}: ${s.tasksChanged} task${s.tasksChanged === 1 ? '' : 's'} changed`);
}

/* ---------- the manager ---------- */
function openTagManager(o) {
  o = o || {};
  if (o.query !== undefined) _tmQuery = o.query;
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const dlg = document.createElement('div'); dlg.className = 'modal tm'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Tags');
  const prevFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove(); dlg.remove();
    _tmRepaint = null;
    if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    // A confirm/prompt opened on top handles its own Escape.
    const mods = [...document.querySelectorAll('.modal')];
    if (mods[mods.length - 1] !== dlg || document.querySelector('.pop:not([hidden])')) return;
    e.stopPropagation(); e.preventDefault(); close();
  };
  scrim.onclick = close;
  document.body.append(scrim, dlg);
  if (typeof makeResizable === 'function') makeResizable(dlg, { key: 'dialog:tags', center: 'x', min: { w: 560, h: 360 }, max: () => ({ h: window.innerHeight - 72 }) });   // 13-splitter.js
  document.addEventListener('keydown', onKey, true);
  _buildTagManager(dlg, { close });
  setTimeout(() => { const i = dlg.querySelector('.tm-filter input'); if (i) i.focus({ preventScroll: true }); }, 0);
  return close;
}

function _buildTagManager(root, o) {
  o = o || {};
  const paint = () => {
    const keepFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest('.tm-filter') ? document.activeElement : null;
    const caret = keepFocus ? keepFocus.selectionStart : null;
    const listScroll = root.querySelector('.tm-list') ? root.querySelector('.tm-list').scrollTop : 0;
    root.innerHTML = '';
    const rows = tagRows();
    const max = Math.max(1, ...rows.map(r => r.open));
    // Header
    const h = document.createElement('div'); h.className = 'modal-h tm-h';
    h.innerHTML = icon('tags') + `<h2>Tags</h2><span class="badge badge-soft">${rows.length}</span>`;
    const fl = document.createElement('label'); fl.className = 'input input-sm tm-filter'; fl.innerHTML = icon('search');
    const fin = document.createElement('input'); fin.type = 'search'; fin.placeholder = 'Filter tags'; fin.value = _tmQuery; fin.setAttribute('aria-label', 'Filter tags');
    fin.oninput = () => { _tmQuery = fin.value; paint(); };
    fl.appendChild(fin);
    const seg = document.createElement('div'); seg.className = 'seg';
    for (const [k, l] of [['use', 'By use'], ['az', 'A–Z'], ['unused', 'Unused']]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l;
      b.setAttribute('aria-pressed', _tmSort === k ? 'true' : 'false');
      b.onclick = () => { _tmSort = k; paint(); };
      seg.appendChild(b);
    }
    h.append(fl, seg);
    if (o.close) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon tm-x'; x.innerHTML = icon('x'); x.setAttribute('aria-label', 'Close');
      x.onclick = o.close; h.appendChild(x);
    }
    root.appendChild(h);

    // Body: list + suggestions
    const body = document.createElement('div'); body.className = 'tm-body';
    const list = document.createElement('div'); list.className = 'tm-list'; list.setAttribute('role', 'list');
    const q = tglNorm(_tmQuery);
    let shown = rows.filter(r => !q || r.tag.includes(q));
    if (_tmSort === 'unused') shown = shown.filter(r => !r.open);
    shown.sort(_tmSort === 'az' ? (a, b) => a.tag.localeCompare(b.tag)
      : (a, b) => (a.archived - b.archived) || b.open - a.open || b.total - a.total || a.tag.localeCompare(b.tag));
    for (const t of [..._tmSel]) if (!rows.some(r => r.tag === t)) _tmSel.delete(t);
    if (!shown.length) {
      const e = document.createElement('div'); e.className = 'tm-empty subtle';
      e.textContent = rows.length ? (q ? 'No tag matches.' : 'Every tag is in use on an open task.') : 'No tags yet. Add #tags to tasks and they show up here.';
      list.appendChild(e);
    }
    for (const r of shown) {
      const row = document.createElement('div'); row.className = 'tm-row' + (r.archived ? ' archived' : '') + (_tmSel.has(r.tag) ? ' sel' : ''); row.setAttribute('role', 'listitem');
      czMark(row, 'tag', r.tag);   // right-click: the same menu as the sidebar (28-customise.js)
      const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'cbx' + (_tmSel.has(r.tag) ? ' on' : '');
      cb.setAttribute('role', 'checkbox'); cb.setAttribute('aria-checked', _tmSel.has(r.tag) ? 'true' : 'false'); cb.setAttribute('aria-label', 'Select #' + r.tag);
      cb.innerHTML = icon('check');
      cb.onclick = () => { if (_tmSel.has(r.tag)) _tmSel.delete(r.tag); else _tmSel.add(r.tag); paint(); };
      const name = document.createElement('button'); name.type = 'button'; name.className = 'tm-name';
      const flagChips = r.flags.map(f => `<span class="chip chip-solid tm-flag tm-flag-${escAttr(f.kind)}" title="${escAttr(f.label)}">${esc(f.kind === 'stream' ? 'same as stream' : f.kind === 'person' ? 'a person' : f.kind === 'status' ? f.label : 'used once')}</span>`).join('');
      name.innerHTML = `${tagMarkHtml(r.tag) || '<span class="subtle">#</span>'}<span class="truncate" data-cz-label>${esc(r.tag)}</span>${r.pinned ? icon('pin', 'i-xs tm-pin') : ''}${r.archived ? '<span class="chip chip-solid tm-flag">archived</span>' : ''}${flagChips}`;
      name.title = `Show tasks with #${r.tag}`;
      name.onclick = () => { if (o.close) o.close(); setView('tag:' + r.tag); };
      const bar = document.createElement('span'); bar.className = 'bar'; bar.innerHTML = `<i style="--w:${Math.round(100 * r.open / max)}%"></i>`;
      const cnt = document.createElement('span'); cnt.className = 'num subtle tm-count';
      cnt.textContent = `${r.open} task${r.open === 1 ? '' : 's'}`;
      cnt.title = `${r.open} open · ${r.total} in all`;
      const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'btn-icon btn-sm'; mb.innerHTML = icon('ellipsis'); mb.setAttribute('aria-label', 'Actions for #' + r.tag);
      mb.onclick = () => openMenu(mb, [
        { label: 'Show tasks', icon: 'list', run: () => { if (o.close) o.close(); setView('tag:' + r.tag); } },
        { label: 'Rename…', icon: 'pencil', run: () => tagRename(r.tag) },
        { label: 'Merge into…', icon: 'git-merge', run: () => tagMergeDialog([r.tag]) },
        r.flags.some(f => f.kind === 'person') ? { label: 'Link the person instead', icon: 'user-round-check', run: () => tagToPerson(r.tag) } : null,
        'sep',
        { label: r.pinned ? 'Unpin from sidebar' : 'Pin to sidebar', icon: r.pinned ? 'pin-off' : 'pin', run: () => tagSetFlags([r.tag], { pinned: !r.pinned }, r.pinned ? `Unpinned #${r.tag}` : `Pinned #${r.tag} to the sidebar`) },
        { label: r.archived ? 'Unarchive' : 'Archive', icon: r.archived ? 'archive-restore' : 'archive', run: () => tagSetFlags([r.tag], { archived: !r.archived }, r.archived ? `#${r.tag} is back in the pickers` : `Archived #${r.tag}: it stays on its tasks`) },
        { label: 'Delete…', icon: 'trash-2', danger: true, run: () => tagDelete([r.tag]) },
      ], { align: 'end', width: 220 });
      row.append(cb, name, bar, cnt, mb);
      list.appendChild(row);
    }
    body.appendChild(list);
    const side = document.createElement('div'); side.className = 'tm-side';
    _tmSuggestions(side, rows, o);
    body.appendChild(side);
    root.appendChild(body);

    // Footer
    const f = document.createElement('div'); f.className = 'modal-f tm-f';
    const sel = [..._tmSel];
    const n = document.createElement('span'); n.className = 'subtle tm-seln';
    n.textContent = sel.length ? `${sel.length} selected` : 'Select tags to merge, pin, archive or delete them together.';
    f.appendChild(n);
    if (sel.length) {
      const mk = (ic, label, cls, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`; b.onclick = run; return b; };
      const allPinned = sel.every(t => tglIsPinned(state, t));
      f.append(
        mk('git-merge', 'Merge…', 'btn-secondary', () => tagMergeDialog(sel)),
        mk(allPinned ? 'pin-off' : 'pin', allPinned ? 'Unpin' : 'Pin to sidebar', 'btn-secondary', () => tagSetFlags(sel, { pinned: !allPinned }, allPinned ? `Unpinned ${sel.length}` : `Pinned ${sel.length} to the sidebar`)),
        mk('archive', 'Archive', 'btn-secondary', () => tagSetFlags(sel, { archived: true }, `Archived ${sel.length} tag${sel.length === 1 ? '' : 's'}`)),
        mk('trash-2', 'Delete', 'btn-ghost tm-del', () => tagDelete(sel)),
      );
    }
    const sp = document.createElement('span'); sp.className = 'grow'; f.appendChild(sp);
    if (o.close) { const d = document.createElement('button'); d.type = 'button'; d.className = 'btn btn-primary'; d.textContent = 'Done'; d.onclick = o.close; f.appendChild(d); }
    root.appendChild(f);
    const nl = root.querySelector('.tm-list'); if (nl) nl.scrollTop = listScroll;
    if (keepFocus) { const i = root.querySelector('.tm-filter input'); if (i) { i.focus({ preventScroll: true }); try { i.setSelectionRange(caret, caret); } catch (e) {} } }
  };
  _tmRepaint = () => { if (root.isConnected) paint(); };
  paint();
}

function _tmSuggestions(side, rows, o) {
  side.innerHTML = '<div class="overline tm-side-h">Suggested clean-up</div>';
  let any = false;
  // Each card: its own button applies it; with two or more, tick them and apply
  // the ticked ones together (the shared select list): ONE undo step.
  const box = document.createElement('div'); box.className = 'tm-cleanups';
  side.appendChild(box);
  const runs = new Map();   // card id -> change the state, return the toast text (no save)
  const card = (id, iconName, titleHtml, bodyHtml, btnLabel, mutate) => {
    any = true;
    runs.set(id, mutate);
    const c = document.createElement('div'); c.className = 'merge'; c.dataset.selId = id;
    c.innerHTML = `<div class="merge-t">${icon(iconName)}<span>${titleHtml}</span></div>` + (bodyHtml || '');
    c.setAttribute('aria-label', c.querySelector('.merge-t').textContent.trim());
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = btnLabel; b.onclick = () => _tagDone(mutate());
    c.appendChild(b);
    box.appendChild(c);
  };
  const ruleRun = (kind, label) => () => {
    const s = tglCleanState(state, {}, { index: pplIndex(), today: todayStr(), only: [kind], log: (tid, e) => logActivity(tid, e.type || 'tags', e) });
    return `${label}: ${s.tasksChanged} task${s.tasksChanged === 1 ? '' : 's'} changed`;
  };
  const usage = tglUsage(state);
  for (const g of tglSimilar(state, usage).slice(0, 3)) {
    const n = (() => { let k = 0; for (const i of getAllItems()) if (effTags(i).some(t => g.from.includes(t))) k++; return k; })();
    card('merge:' + g.into, 'git-merge', `Merge into <span class="chip chip-accent">${esc(g.into)}</span>`, `<div class="from">${g.from.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>`,
      `Merge · ${n} task${n === 1 ? '' : 's'}`, () => { const r = tglMerge(state, g.from, g.into, _tagLog()); return `Merged into #${g.into} on ${_tagTasks(r)}`; });
  }
  // Most used first; "a, b, c, d… The stream" (no full stop after the ellipsis).
  const show = (list) => {
    const l = list.slice().sort((a, b) => ((usage.get(b) || { total: 0 }).total - (usage.get(a) || { total: 0 }).total) || a.localeCompare(b));
    return l.slice(0, 4).join(', ') + (l.length > 4 ? '…' : '.');
  };
  const st = _tagRulePreview('stream');
  if (st.tasks) card('stream', 'layers', `${st.tags.length} tag${st.tags.length === 1 ? ' repeats' : 's repeat'} a stream`, `<div class="subtle tm-side-p">${esc(show(st.tags))} The stream already says this.</div>`,
    `Remove from ${st.tasks} task${st.tasks === 1 ? '' : 's'}`, ruleRun('stream', 'Stream tags removed'));
  // Same order as mockup 06: merges, stream repeats, one-offs, then people and status tags.
  const once = rows.filter(r => r.total === 1 && !r.archived && !r.pinned).map(r => r.tag);
  if (once.length >= 3) card('once', 'archive', `${once.length} tags used once`, '<div class="subtle tm-side-p">Archive them. They stay on their tasks but leave the sidebar and the pickers.</div>',
    `Archive ${once.length}`, () => {
      // Counted again now: a merge applied in the same go may have changed them.
      const now = tagRows().filter(r => r.total === 1 && !r.archived && !r.pinned).map(r => r.tag);
      for (const t of now) tglSetFlags(state, t, { archived: true });
      return `Archived ${now.length} one-off tags`;
    });
  const pe = _tagRulePreview('person');
  if (pe.tasks) card('person', 'user-round-check', `${pe.tags.length} tag${pe.tags.length === 1 ? ' names' : 's name'} a person`, `<div class="subtle tm-side-p">${esc(show(pe.tags))} Link the person instead, so their page lists the task.</div>`,
    `Link people on ${pe.tasks} task${pe.tasks === 1 ? '' : 's'}`, ruleRun('person', 'Person tags became links'));
  const sx = _tagRulePreview('status');
  if (sx.tasks) card('status', 'flag', `${sx.tags.length} tag${sx.tags.length === 1 ? ' is' : 's are'} a status`, `<div class="subtle tm-side-p">${esc(show(sx.tags))} Priority, the due date, repeat and status have their own fields.</div>`,
    `Move into fields · ${sx.tasks} task${sx.tasks === 1 ? '' : 's'}`, ruleRun('status', 'Status tags moved into fields'));
  if (runs.size > 1) {
    const applyThese = (ids) => {
      const msgs = ids.map(id => runs.get(id)).filter(Boolean).map(f => f());
      _tagDone(msgs.length === 1 ? msgs[0] : `${msgs.length} clean-ups applied`);
    };
    selectList(box, { key: 'tm-cleanup', compact: true, label: 'Suggested clean-up', rows: '.merge', apply: { label: 'Apply selected', run: applyThese }, applyAll: { label: 'Apply all', run: applyThese } });
  }
  if (!any) {
    const e = document.createElement('div'); e.className = 'tm-clean';
    e.innerHTML = icon('sparkles') + '<div><b>Nothing to clean up</b><div class="subtle">No duplicates, and no tags that repeat a stream, a person or a status.</div></div>';
    side.appendChild(e);
  }
  const rule = document.createElement('div'); rule.className = 'subtle tm-rule'; rule.textContent = TAG_RULE_TEXT;
  side.appendChild(rule);
}

/* ---------- #view=tags (the same manager as a page) ---------- */
registerSection('tags', {
  group: 'tasks',
  title: () => 'Tags',
  layout: 'wide',
  mount(container) {
    const sub = document.getElementById('view-subtitle');
    const n = tagRows().length;
    if (sub) sub.textContent = n ? `${n} tags` : '';
    const box = document.createElement('div'); box.className = 'tm tm-page card';
    container.appendChild(box);
    _buildTagManager(box, {});
  },
  unmount() { _tmRepaint = null; },
});

/* ---------- sidebar: pinned + top tags, then "All N tags" ---------- */
registerSidebarBlock('tasks', {
  id: 'tags', order: 30,
  render(el, ctx) {
    const rows = tagRows().filter(r => !r.archived);
    const all = rows.filter(r => r.total);
    if (!all.length && !rows.some(r => r.pinned)) return false;
    el.appendChild(sbSection({ title: 'Tags', collapsible: 'tags', actions: [sbListMenuAction('tags', SB_TAG_DEFAULTS, 'tags'), { icon: 'sliders-horizontal', label: 'Manage tags', run: () => openTagManager() }] }));
    czSectionHint(el, 'tags');
    if (sbIsCollapsed('tags')) return;
    // Sorted by open tasks (the default) the list is the tags in use now; any other sort lists every used tag.
    const pref = sbListPrefsFor('tags', SB_TAG_DEFAULTS);
    const cur = state.view.startsWith('tag:') ? state.view.slice(4) : null;
    const st = sbStats().tags;
    const pick = rows.filter(r => r.pinned || r.tag === cur || (pref.sort === 'open' ? r.open : r.total));
    // Each tag shows its symbol / colour (else #) and has the right-click menu (28-customise.js).
    sbOrderedList(el, {
      key: 'tags', noun: 'Tags', defaults: SB_TAG_DEFAULTS,
      items: pick.map(r => ({ id: r.tag, label: r.tag, open: r.open, total: r.total, recent: (st.get(r.tag) || {}).recent || 0, pinned: r.pinned })),
      custom: sbSavedOrder('tags'), saveCustom: (ids) => sbSaveOrder('tags', ids), keepId: cur,
      row: (it) => czMark(sbNavItem({ label: it.id, avatarHtml: `<span class="ic">${tagMarkHtml(it.id) || icon('hash')}</span>`, view: 'tag:' + it.id, count: (ctx.counts.tags && ctx.counts.tags[it.id]) || '' }), 'tag', it.id),
    });
    const flagged = all.some(r => r.flags.some(f => f.kind !== 'single')) || tglSimilar(state).length > 0;
    const more = sbNavItem({ label: `All ${all.length} tags`, icon: 'tags', className: 'nav-more', active: state.view === 'tags', onClick: () => openTagManager({ query: '' }), title: 'Search, merge and clean up tags' });
    if (flagged) { const link = document.createElement('span'); link.className = 'link'; link.textContent = 'Clean up'; more.appendChild(link); }
    el.appendChild(more);
  },
});
